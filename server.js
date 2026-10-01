import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CROPS, ANIMALS, PENS, DOG, LOOK, GRID, START_PLOTS, START_COINS, HELP_COINS, UNLOCK_ORDER,
  itemInfo, expandCost, expandLevel, fertCost, stealCap, animalStealCap, levelInfo, visibleProblems, harvestYield,
} from './public/data.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;
const INVITE = process.env.INVITE_CODE || '';

const db = new DatabaseSync(process.env.DB_FILE || path.join(ROOT, 'farm.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, pin TEXT NOT NULL,
    coins INTEGER NOT NULL, exp INTEGER NOT NULL DEFAULT 0, farm TEXT NOT NULL,
    seen INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS logs_user ON logs (user_id, id);
`);
if (!db.prepare('PRAGMA table_info(users)').all().some(c => c.name === 'look')) {
  db.exec(`ALTER TABLE users ADD COLUMN look TEXT NOT NULL DEFAULT '{}'`);
}

const q = {
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  userByName: db.prepare('SELECT * FROM users WHERE name = ?'),
  insertUser: db.prepare('INSERT INTO users (name, pin, coins, farm, look, seen, created) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  saveUser: db.prepare('UPDATE users SET coins = ?, exp = ?, farm = ? WHERE id = ?'),
  saveLook: db.prepare('UPDATE users SET look = ? WHERE id = ?'),
  touch: db.prepare('UPDATE users SET seen = ? WHERE id = ?'),
  allUsers: db.prepare('SELECT id, name, exp, farm, seen FROM users'),
  session: db.prepare('SELECT user_id FROM sessions WHERE token = ?'),
  newSession: db.prepare('INSERT INTO sessions (token, user_id, created) VALUES (?, ?, ?)'),
  addLog: db.prepare('INSERT INTO logs (user_id, text, at) VALUES (?, ?, ?)'),
  logs: db.prepare('SELECT id, text, at FROM logs WHERE user_id = ? ORDER BY id DESC LIMIT 40'),
  unread: db.prepare('SELECT COUNT(*) AS n FROM logs WHERE user_id = ? AND id > ?'),
};

class GameError extends Error {}
const fail = msg => { throw new GameError(msg); };
const log = (userId, text) => q.addLog.run(userId, text, Date.now());

function parseFarm(json) {
  const f = JSON.parse(json);
  f.animals ??= [];
  f.nextId ??= 0;
  return f;
}
function loadUser(id) {
  const row = q.userById.get(id) || fail('Không tìm thấy người chơi');
  return { ...row, farm: parseFarm(row.farm), look: cleanLook(JSON.parse(row.look)) };
}
const saveUser = u => q.saveUser.run(u.coins, u.exp, JSON.stringify(u.farm), u.id);

// ---------- Tài khoản ----------

const hashPin = (pin, salt = randomBytes(16).toString('hex')) => `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`;
function pinMatches(pin, stored) {
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(pin, salt, 32));
}

function cleanName(name) {
  name = String(name ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 20) fail('Tên phải từ 2 đến 20 ký tự');
  if (/\p{C}/u.test(name)) fail('Tên có ký tự không hợp lệ');
  return name;
}

// Giá trị lạ hoặc thiếu thì lấy 0, để dữ liệu cũ vẫn dùng được.
function cleanLook(look) {
  const out = {};
  for (const [k, n] of Object.entries(LOOK)) {
    const v = Number(look?.[k]);
    out[k] = Number.isInteger(v) && v >= 0 && v < n ? v : 0;
  }
  return out;
}

function newSession(userId, t) {
  const token = randomBytes(24).toString('hex');
  q.newSession.run(token, userId, t);
  return { token };
}

function register({ name, pin, invite, look }, t) {
  if (INVITE && invite !== INVITE) fail('Mã mời không đúng');
  name = cleanName(name);
  if (!/^\d{4,6}$/.test(String(pin ?? ''))) fail('Mã PIN phải gồm 4 đến 6 chữ số');
  if (q.userByName.get(name)) fail('Tên này đã có người dùng rồi');
  const farm = { plots: START_PLOTS, cells: {}, inv: {}, animals: [], nextId: 0, dog: false, readLog: 0 };
  const id = Number(q.insertUser.run(
    name, hashPin(String(pin)), START_COINS, JSON.stringify(farm), JSON.stringify(cleanLook(look)), t, t,
  ).lastInsertRowid);
  log(id, `🌱 Chào mừng ${name} đến với nông trại! Đi tới ruộng (góc trên bên phải) để gieo hạt nhé.`);
  return newSession(id, t);
}

const failedLogins = new Map(); // tên -> { n, until }
function login({ name, pin }, t) {
  name = cleanName(name);
  const key = name.toLowerCase();
  const f = failedLogins.get(key);
  if (f?.until > t) fail(`Sai nhiều lần quá, thử lại sau ${Math.ceil((f.until - t) / 60000)} phút nhé`);
  const u = q.userByName.get(name);
  if (!u || !pinMatches(String(pin ?? ''), u.pin)) {
    const n = (f?.n || 0) + 1;
    failedLogins.set(key, n >= 5 ? { n: 0, until: t + 15 * 60000 } : { n, until: 0 });
    fail('Sai tên hoặc mã PIN');
  }
  failedLogins.delete(key);
  return newSession(u.id, t);
}

// ---------- Luật chơi ----------

const FIX_TEXT = { weed: 'nhổ cỏ', bug: 'bắt sâu', dry: 'tưới nước' };
const GOLD = '#ffd54a', WHITE = '#ffffff', BLUE = '#8fe3ff';

function makeProblems(crop, planted, ready) {
  const max = crop.time >= 3600 ? 4 : crop.time >= 900 ? 3 : 2;
  const types = Object.keys(FIX_TEXT);
  return Array.from({ length: Math.floor(Math.random() * max) }, () => ({
    t: types[Math.floor(Math.random() * types.length)],
    at: planted + Math.round((ready - planted) * (0.15 + Math.random() * 0.7)),
    fixed: false,
  }));
}

function plotIndex(u, plot) {
  const i = Number(plot);
  if (!UNLOCK_ORDER.slice(0, u.farm.plots).includes(i)) fail('Ô đất này chưa được mở');
  return i;
}

const findAnimal = (u, id) => u.farm.animals.find(a => a.id === Number(id)) || fail('Không thấy con vật này');

function addExp(u, n, out) {
  const before = levelInfo(u.exp).level;
  u.exp += n;
  const after = levelInfo(u.exp).level;
  if (after > before) {
    const bonus = after * 20;
    u.coins += bonus;
    log(u.id, `🎉 Chúc mừng! Bạn đã lên cấp ${after} và được thưởng ${bonus} xu.`);
    out.levelUp = after;
  }
}

const addItem = (u, k, n) => { u.farm.inv[k] = (u.farm.inv[k] || 0) + n; };
const ownOnly = (me, target) => { if (target !== me) fail('Chỉ làm được ở nông trại của mình'); };
const pay = (me, cost, msg) => { if (me.coins < cost) fail(msg); me.coins -= cost; };

// Nhà có chó thì kẻ trộm có thể bị đuổi. Vẫn tính là đã thử, để không thử lại liên tục được.
function chasedByDog(me, target, out) {
  if (!target.farm.dog || Math.random() >= DOG.chase) return false;
  out.fx.push({ text: 'Gâu gâu! 🐕', color: '#ff9a7a' });
  out.msg = 'Bị chó đuổi chạy mất dép rồi! 🐕';
  log(target.id, `🐕 Chó nhà bạn đã đuổi ${me.name} chạy mất dép khi định hái trộm!`);
  return true;
}

const ACTIONS = {
  plant(me, target, { plot, crop }, t, out) {
    ownOnly(me, target);
    const cr = (Object.hasOwn(CROPS, crop) && CROPS[crop]) || fail('Không có loại hạt này');
    const i = plotIndex(me, plot);
    if (me.farm.cells[i]) fail('Ô đất này đã có cây');
    if (levelInfo(me.exp).level < cr.lv) fail(`Cần cấp ${cr.lv} để trồng ${cr.name}`);
    pay(me, cr.seed, 'Không đủ xu mua hạt giống');
    const ready = t + cr.time * 1000;
    me.farm.cells[i] = { crop, planted: t, ready, fert: false, problems: makeProblems(cr, t, ready), stolen: 0, thieves: [] };
    out.fx.push({ plot: i, text: `-${cr.seed} xu`, color: GOLD });
  },

  harvest(me, target, { plot }, t, out) {
    ownOnly(me, target);
    const i = plotIndex(me, plot);
    const c = me.farm.cells[i] || fail('Ô đất đang trống');
    if (c.ready > t) fail('Cây chưa chín');
    const cr = CROPS[c.crop];
    const n = harvestYield(cr, c);
    addItem(me, c.crop, n);
    delete me.farm.cells[i];
    addExp(me, cr.exp, out);
    out.fx.push({ plot: i, text: `+${n} ${cr.name}`, color: WHITE }, { plot: i, text: `+${cr.exp} EXP`, color: BLUE });
  },

  fertilize(me, target, { plot }, t, out) {
    ownOnly(me, target);
    const i = plotIndex(me, plot);
    const c = me.farm.cells[i] || fail('Ô đất đang trống');
    if (c.ready <= t) fail('Cây chín rồi, thu hoạch thôi!');
    if (c.fert) fail('Cây này đã được bón phân rồi');
    const cr = CROPS[c.crop];
    const cost = fertCost(cr);
    pay(me, cost, 'Không đủ xu mua phân bón');
    c.fert = true;
    c.ready = Math.max(t, c.ready - cr.time * 300); // rút ngắn 30% thời gian
    out.fx.push({ plot: i, text: `-${cost} xu`, color: GOLD });
  },

  fix(me, target, { plot }, t, out) {
    const i = plotIndex(target, plot);
    const c = target.farm.cells[i];
    const p = (c && visibleProblems(c, t)[0]) || fail('Ô đất này không cần chăm sóc');
    p.fixed = true;
    addExp(me, 1, out);
    out.fx.push({ plot: i, text: '+1 EXP', color: BLUE });
    if (target !== me) {
      me.coins += HELP_COINS;
      out.fx.push({ plot: i, text: `+${HELP_COINS} xu`, color: GOLD });
      log(target.id, `💚 ${me.name} đã ${FIX_TEXT[p.t]} giúp bạn.`);
    }
  },

  steal(me, target, { plot, animal }, t, out) {
    if (target === me) fail('Đây là nông trại của bạn mà 😄');
    if (animal != null) {
      const x = findAnimal(target, animal), a = ANIMALS[x.type];
      if (!x.ready || x.ready > t) fail(`${a.name} chưa có gì để lấy`);
      if (x.thieves.includes(me.id)) fail('Bạn lấy rồi, chừa cho chủ nhà chút chứ!');
      if (x.stolen >= animalStealCap(a)) fail('Bị lấy nhiều quá rồi 😅');
      x.thieves.push(me.id);
      if (chasedByDog(me, target, out)) return;
      x.stolen++;
      addItem(me, a.product, 1);
      addExp(me, 1, out);
      out.fx.push({ animal: x.id, text: `+1 ${itemInfo(a.product).name}`, color: WHITE });
      log(target.id, `🙈 ${me.name} đã lấy trộm 1 ${itemInfo(a.product).name} của bạn.`);
      return;
    }
    const i = plotIndex(target, plot);
    const c = target.farm.cells[i];
    if (!c || c.ready > t) fail('Cây chưa chín, chưa hái được');
    const cr = CROPS[c.crop];
    const cap = stealCap(cr);
    if (c.thieves.includes(me.id)) fail('Bạn hái ô này rồi, chừa cho chủ nhà chút chứ!');
    if (c.stolen >= cap) fail('Ô này bị hái trộm nhiều quá rồi 😅');
    c.thieves.push(me.id);
    if (chasedByDog(me, target, out)) return;
    const n = Math.min(cap - c.stolen, Math.random() < 0.4 ? 2 : 1);
    c.stolen += n;
    addItem(me, c.crop, n);
    addExp(me, 1, out);
    out.fx.push({ plot: i, text: `+${n} ${cr.name}`, color: WHITE });
    log(target.id, `🙈 ${me.name} đã hái trộm ${n} ${cr.name} của bạn.`);
  },

  buyAnimal(me, target, { kind }, t, out) {
    ownOnly(me, target);
    const a = (Object.hasOwn(ANIMALS, kind) && ANIMALS[kind]) || fail('Không có con vật này');
    if (levelInfo(me.exp).level < a.lv) fail(`Cần cấp ${a.lv} để nuôi ${a.name}`);
    const inPen = me.farm.animals.filter(x => ANIMALS[x.type].pen === a.pen).length;
    if (inPen >= PENS[a.pen].max) fail(`${PENS[a.pen].name} đã đầy rồi`);
    pay(me, a.cost, 'Không đủ xu');
    me.farm.animals.push({ id: ++me.farm.nextId, type: kind, ready: null, stolen: 0, thieves: [] });
    out.fx.push({ text: `-${a.cost} xu`, color: GOLD });
    out.msg = `Đã mua 1 ${a.name}! Ra ${PENS[a.pen].name} cho nó ăn nhé`;
  },

  feed(me, target, { animal }, t, out) {
    ownOnly(me, target);
    const x = findAnimal(me, animal), a = ANIMALS[x.type];
    if (x.ready) fail(x.ready > t ? `${a.name} đang no rồi` : 'Nhặt sản phẩm trước đã');
    pay(me, a.feed, 'Không đủ xu mua thức ăn');
    Object.assign(x, { ready: t + a.time * 1000, stolen: 0, thieves: [] });
    out.fx.push({ animal: x.id, text: `-${a.feed} xu`, color: GOLD });
  },

  collect(me, target, { animal }, t, out) {
    ownOnly(me, target);
    const x = findAnimal(me, animal), a = ANIMALS[x.type];
    if (!x.ready || x.ready > t) fail('Chưa có gì để nhặt');
    const n = Math.max(1, a.yield - x.stolen);
    addItem(me, a.product, n);
    x.ready = null;
    addExp(me, a.exp, out);
    out.fx.push({ animal: x.id, text: `+${n} ${itemInfo(a.product).name}`, color: WHITE }, { animal: x.id, text: `+${a.exp} EXP`, color: BLUE });
  },

  buyDog(me, target, body, t, out) {
    ownOnly(me, target);
    if (me.farm.dog) fail('Nhà bạn đã có chó rồi');
    if (levelInfo(me.exp).level < DOG.lv) fail(`Cần cấp ${DOG.lv} để nuôi chó`);
    pay(me, DOG.cost, 'Không đủ xu');
    me.farm.dog = true;
    out.msg = 'Đã có chó giữ nhà! Kẻ trộm coi chừng 🐕';
  },

  sell(me, target, { item, qty }, t, out) {
    const inv = me.farm.inv;
    const items = item === 'all' ? Object.keys(inv) : [item];
    let total = 0;
    for (const k of items) {
      const info = itemInfo(k);
      if (!info || !inv[k]) fail('Không có món này trong kho');
      const n = item === 'all' || qty === 'all' ? inv[k] : Math.floor(Number(qty));
      if (!(n >= 1 && n <= inv[k])) fail('Số lượng không hợp lệ');
      inv[k] -= n;
      if (!inv[k]) delete inv[k];
      total += n * info.price;
    }
    if (!total) fail('Kho đang trống');
    me.coins += total;
    out.sold = total;
  },

  expand(me, target, body, t, out) {
    ownOnly(me, target);
    const n = me.farm.plots;
    if (n >= GRID * GRID) fail('Đã mở hết đất rồi');
    const cost = expandCost(n), lv = expandLevel(n);
    if (levelInfo(me.exp).level < lv) fail(`Cần cấp ${lv} để mở rộng đất`);
    pay(me, cost, 'Không đủ xu để mở rộng');
    me.farm.plots++;
    out.fx.push({ plot: UNLOCK_ORDER[n], text: 'Đất mới!', color: '#b6ff7a' });
  },
};

// ---------- Dữ liệu gửi cho trình duyệt ----------

function mePayload(u) {
  return {
    id: u.id, name: u.name, look: u.look, coins: u.coins, exp: u.exp, ...levelInfo(u.exp),
    inv: u.farm.inv, unread: q.unread.get(u.id, u.farm.readLog || 0).n,
  };
}

function farmView(u, viewer, t) {
  const f = u.farm;
  const cells = UNLOCK_ORDER.slice(0, f.plots).map(idx => {
    const c = f.cells[idx];
    if (!c) return { idx };
    return {
      idx, crop: c.crop, planted: c.planted, ready: c.ready, fert: c.fert,
      problems: visibleProblems(c, t).map(p => p.t),
      stealable: c.ready <= t && !c.thieves.includes(viewer.id) && c.stolen < stealCap(CROPS[c.crop]),
    };
  });
  const animals = f.animals.map(x => ({
    id: x.id, type: x.type, ready: x.ready,
    stealable: !!x.ready && x.ready <= t && !x.thieves.includes(viewer.id) && x.stolen < animalStealCap(ANIMALS[x.type]),
  }));
  const n = f.plots;
  return {
    id: u.id, name: u.name, level: levelInfo(u.exp).level, cells, animals, dog: !!f.dog,
    next: n < GRID * GRID ? { idx: UNLOCK_ORDER[n], cost: expandCost(n), level: expandLevel(n) } : null,
  };
}

function players(meId, t) {
  return q.allUsers.all().filter(r => r.id !== meId).map(r => {
    const f = parseFarm(r.farm);
    let ripe = 0, help = 0;
    for (const c of Object.values(f.cells)) {
      if (c.ready <= t && !c.thieves.includes(meId) && c.stolen < stealCap(CROPS[c.crop])) ripe++;
      if (visibleProblems(c, t).length) help++;
    }
    for (const x of f.animals) {
      if (x.ready && x.ready <= t && !x.thieves.includes(meId) && x.stolen < animalStealCap(ANIMALS[x.type])) ripe++;
    }
    return { id: r.id, name: r.name, level: levelInfo(r.exp).level, ripe, help, seen: r.seen, here: rooms.get(r.id)?.players.size || 0 };
  });
}

// ---------- Thời gian thực: ai đang ở nông trại nào, đi đâu, nói gì ----------

const rooms = new Map(); // id chủ nông trại -> { clients: Set<{res, userId}>, players: Map<userId, người chơi> }
const room = id => rooms.get(id) ?? rooms.set(id, { clients: new Set(), players: new Map() }).get(id);
const pub = p => ({ id: p.id, name: p.name, look: p.look, x: p.x, y: p.y, dir: p.dir });

function broadcast(farmId, msg, exceptUserId) {
  const r = rooms.get(farmId);
  if (!r) return;
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  for (const c of r.clients) if (c.userId !== exceptUserId) c.res.write(data);
}

// Giữ kết nối qua proxy.
setInterval(() => { for (const r of rooms.values()) for (const c of r.clients) c.res.write(': ping\n\n'); }, 20000);

function openStream(req, res, me, url) {
  const farmId = Number(url.searchParams.get('farm'));
  if (!q.userById.get(farmId)) fail('Không tìm thấy nông trại');
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store',
    connection: 'keep-alive', 'x-accel-buffering': 'no',
  });
  const r = room(farmId);
  const num = k => Math.max(0, Math.min(2000, Number(url.searchParams.get(k)) || 0));
  let p = r.players.get(me.id);
  if (!p) r.players.set(me.id, p = { id: me.id, name: me.name, look: me.look, x: num('x'), y: num('y'), dir: 0, conns: 0 });
  p.conns++;
  const client = { res, userId: me.id };
  r.clients.add(client);
  res.write(`data: ${JSON.stringify({ type: 'hello', players: [...r.players.values()].filter(o => o.id !== me.id).map(pub) })}\n\n`);
  if (p.conns === 1) broadcast(farmId, { type: 'join', player: pub(p) }, me.id);
  req.on('close', () => {
    r.clients.delete(client);
    if (--p.conns === 0) {
      r.players.delete(me.id);
      broadcast(farmId, { type: 'leave', id: me.id });
    }
    if (!r.clients.size) rooms.delete(farmId);
  });
}

const lastSeenWrite = new Map();
function touch(userId, t) {
  if (t - (lastSeenWrite.get(userId) || 0) < 30000) return;
  lastSeenWrite.set(userId, t);
  q.touch.run(t, userId);
}

const lastChat = new Map();
function chat(userId, { farm, text }, t) {
  const p = rooms.get(Number(farm))?.players.get(userId) || fail('Bạn chưa vào nông trại này');
  text = String(text ?? '').normalize('NFC').replace(/\p{C}/gu, '').trim().slice(0, 80);
  if (!text) fail('Chưa nhập gì cả');
  if (t - (lastChat.get(userId) || 0) < 800) fail('Nói chậm thôi 😄');
  lastChat.set(userId, t);
  broadcast(Number(farm), { type: 'chat', id: userId, name: p.name, text }, userId);
  return { text };
}

function move(userId, { farm, x, y, dir }) {
  const p = rooms.get(Number(farm))?.players.get(userId);
  if (!p) return;
  p.x = Math.max(0, Math.min(2000, Number(x) || 0));
  p.y = Math.max(0, Math.min(2000, Number(y) || 0));
  p.dir = [0, 1, 2, 3].includes(dir) ? dir : 0;
  broadcast(Number(farm), { type: 'move', id: userId, x: p.x, y: p.y, dir: p.dir }, userId);
}

function setLook(u, look) {
  u.look = cleanLook(look);
  q.saveLook.run(JSON.stringify(u.look), u.id);
  for (const [farmId, r] of rooms) {
    const p = r.players.get(u.id);
    if (p) { p.look = u.look; broadcast(farmId, { type: 'look', id: u.id, look: u.look }, u.id); }
  }
}

// ---------- HTTP ----------

function send(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.setEncoding('utf8');
    req.on('data', d => {
      s += d;
      if (s.length > 10_000) { reject(new GameError('Dữ liệu quá lớn')); req.destroy(); }
    });
    req.on('end', () => {
      try { const v = s ? JSON.parse(s) : {}; resolve(v && typeof v === 'object' ? v : {}); }
      catch { reject(new GameError('Dữ liệu không hợp lệ')); }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  const route = url.pathname.slice(5);
  const t = Date.now();
  const body = req.method === 'POST' ? await readJson(req) : {};

  if (route === 'config') return send(res, 200, { invite: !!INVITE });
  if (route === 'register') return send(res, 200, register(body, t));
  if (route === 'login') return send(res, 200, login(body, t));

  const token = (req.headers.authorization || '').replace(/^Bearer /, '') || url.searchParams.get('token');
  const session = token && q.session.get(token);
  if (!session) return send(res, 401, { error: 'Vui lòng đăng nhập lại' });
  const uid = session.user_id;
  touch(uid, t);

  // Các yêu cầu gửi liên tục, không cần đọc cả nông trại.
  if (route === 'move') { move(uid, body); return send(res, 200, {}); }
  if (route === 'chat') return send(res, 200, chat(uid, body, t));

  const me = loadUser(uid);
  if (route === 'stream') return openStream(req, res, me, url);
  if (route === 'me') return send(res, 200, { now: t, me: mePayload(me), view: farmView(me, me, t) });
  if (route.startsWith('farm/')) {
    const other = loadUser(Number(route.slice(5)));
    return send(res, 200, { now: t, me: mePayload(me), view: farmView(other, me, t) });
  }
  if (route === 'players') return send(res, 200, { now: t, players: players(me.id, t) });
  if (route === 'logs') {
    const logs = q.logs.all(me.id);
    if (logs[0]) { me.farm.readLog = logs[0].id; saveUser(me); }
    return send(res, 200, { now: t, logs });
  }
  if (route === 'look' && req.method === 'POST') {
    setLook(me, body.look);
    return send(res, 200, { now: t, me: mePayload(me) });
  }
  if (route === 'action' && req.method === 'POST') {
    const action = (Object.hasOwn(ACTIONS, body.type) && ACTIONS[body.type]) || fail('Hành động không hợp lệ');
    const target = body.owner && Number(body.owner) !== me.id ? loadUser(Number(body.owner)) : me;
    const out = { fx: [] };
    db.exec('BEGIN');
    try {
      action(me, target, body, t, out);
      saveUser(me);
      if (target !== me) saveUser(target);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    broadcast(target.id, { type: 'farm' }, me.id);
    return send(res, 200, { now: t, ...out, me: mePayload(me), view: farmView(target, me, t) });
  }
  send(res, 404, { error: 'Không tìm thấy' });
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    const file = path.join(PUBLIC, path.normalize(decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)));
    if (!file.startsWith(PUBLIC + path.sep)) return send(res, 404, { error: 'Không tìm thấy' });
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  } catch (e) {
    if (res.headersSent) return res.end();
    if (e instanceof GameError) return send(res, 400, { error: e.message });
    if (e.code === 'ENOENT' || e.code === 'EISDIR' || e instanceof URIError) return send(res, 404, { error: 'Không tìm thấy' });
    console.error(e);
    send(res, 500, { error: 'Máy chủ gặp lỗi, thử lại sau nhé' });
  }
}).listen(PORT, () => console.log(`🌾 Nông trại đang chạy tại http://localhost:${PORT}`));
