// Mô hình dữ liệu + luật chơi. Thuần JS, không DOM (localStorage có bọc try/catch).
import {
  DAY_MS, NIGHT_FROM, MAX_CATCHUP_MS, GRID, START_PLOTS, CROPS, CROP_STAGES, OVERRIPE, FARMING,
  ANIMALS, PEN_CAP, HUSBANDRY, DOG, THREATS, ITEMS, PRODUCTS, LOOK, HATS, ACCS, DEFAULT_LOOK, START, MARKET, STAMINA, TOOLS, TOOL_MAX, TOOL_LEVEL, GROUP_COST,
  expandCost, expandLevel, FIELD_LIMITS, FIELD_PRICES, PEN_PRICES, levelInfo, ORDERS, NOTIFY_CATS, ACHIEVEMENTS, itemName, sellPrice, shipValue,
} from './data.js';
import { TS, PEN_DEFS, BUILDING_DEFS, FIELD_SIZE } from './layout.js';
import { mapOf, reachable, bumpLayout, footprint, buildMap, sceneMap, hasScene } from './farm.js';
import { migrate, newFarm } from './migrate.js';
import { now } from './clock.js';

export { levelInfo, mapOf, reachable, footprint, sceneMap };
export const SAVE_KEY = 'nongtrai-save-v2';
const OLD_KEYS = ['nongtrai-save-v1'];   // đọc được để chuyển, không bao giờ ghi đè hay xóa
const MIGRATED_KEY = 'nongtrai-migrated';
const MIN = 60_000;
const plotCenter = (s, i) => mapOf(s).plotCenter(i);

// Thứ tự mở ruộng: lan dần từ góc (max(r,c), min(r,c), r).
export const UNLOCK_ORDER = Array.from({ length: GRID * GRID }, (_, i) => i).sort((a, b) => {
  const [ra, ca, rb, cb] = [Math.floor(a / GRID), a % GRID, Math.floor(b / GRID), b % GRID];
  return Math.max(ra, ca) - Math.max(rb, cb) || Math.min(ra, ca) - Math.min(rb, cb) || ra - rb;
});

// ---------- Tiện ích ----------
let evq = [];            // hàng đợi event; tick() trả ra và xóa
let catchUp = false;     // đang chạy bù offline: không sinh quạ/trộm
const emit = e => evq.push(e);
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const chance = (pMin, dt) => Math.random() < 1 - Math.pow(1 - pMin, dt / MIN); // xác suất "mỗi phút" đổi theo dt
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Hai chỗ chứa: giỏ (s.basket, chỉ nông sản & sản phẩm, có sức chứa) và kho (s.inv, mọi thứ, chưa giới hạn).
// Hạt giống, vật tư, thức ăn, đồ trang trí luôn nằm ở kho, không tính vào giỏ.
const inBasket = k => !!(CROPS[k] || PRODUCTS[k]);
const drop = (o, k, n) => { o[k] = (o[k] || 0) - n; if (o[k] <= 0) delete o[k]; };
export const haveItem = (s, k) => (s.basket?.[k] || 0) + (s.inv[k] || 0);
// Lấy n món: giỏ trước, thiếu thì lấy tiếp từ kho. Không đủ thì không lấy gì và trả false.
export function takeItem(s, k, n = 1) {
  if (haveItem(s, k) < n) return false;
  const fromBasket = Math.min(n, s.basket?.[k] || 0);
  if (fromBasket) drop(s.basket, k, fromBasket);
  if (n > fromBasket) drop(s.inv, k, n - fromBasket);
  return true;
}
export const basketCount = s => Object.values(s.basket || {}).reduce((a, n) => a + n, 0);
export const basketCap = s => TOOLS.basket.cap[toolLv(s, 'basket') - 1];
const room = s => basketCap(s) - basketCount(s);
const FULL = 'Giỏ đầy, về kho cất đồ';
const have = haveItem;
const give = (s, k, n = 1) => {
  const o = inBasket(k) ? (s.basket ||= {}) : s.inv;
  o[k] = (o[k] || 0) + n;
};
const take = takeItem;
const level = s => levelInfo(s.exp).level;
const COL = { good: '#5cd65c', bad: '#ff6b6b', coin: '#ffd23f', info: '#ffffff', exp: '#7ad7ff' };
const SOUND = { ga: 'cluck', heo: 'oink', bo: 'moo', cuu: 'baa' };
const ICON = { ga: '🐔', heo: '🐷', bo: '🐮', cuu: '🐑' };

function log(s, text) {
  s.log.unshift({ t: s.time, text });
  if (s.log.length > 50) s.log.length = 50;
  emit({ type: 'log', text });
}
const toast = text => emit({ type: 'toast', text });
const fxEv = (x, y, text, color = COL.info) => emit({ type: 'fx', text, color, x, y });
const snd = name => emit({ type: 'sound', name });
const spawnEv = (what, x, y) => emit({ type: 'spawn', what, x, y });

function addCoins(s, n) { s.coins += n; if (n > 0) s.stats.earned += n; }
function addExp(s, n) {
  const before = level(s);
  s.exp += n;
  for (let l = before + 1; l <= level(s); l++) {
    s.coins += l * 20;
    emit({ type: 'levelup', level: l });
    log(s, `Lên cấp ${l}, thưởng ${l * 20} xu`);
    snd('levelup');
  }
}

function checkAch(s) {
  for (const a of ACHIEVEMENTS) {
    if (s.achievements[a.id] || (s.stats[a.stat] || 0) < a.goal) continue;
    s.achievements[a.id] = true;
    addCoins(s, a.coins);
    emit({ type: 'achievement', id: a.id, name: a.name, coins: a.coins });
    log(s, `Thành tựu "${a.name}", thưởng ${a.coins} xu`);
    snd('levelup');
  }
}

const penPoint = (s, pen) => { const a = mapOf(s).pens[pen].area; return { x: a.x + rnd(0, a.w), y: a.y + rnd(0, a.h) }; };
const penCount = (s, pen) => s.animals.filter(a => ANIMALS[a.type].pen === pen).length;
const isRipe = p => p.crop && !p.crop.dead && !p.crop.rotten && p.crop.progress >= 1;
const nextPoopAt = s => s.time + rnd(...DOG.poopEvery);

function mkAnimal(s, type, adult, x, y) {
  const a = ANIMALS[type];
  const an = {
    id: s.nextId++, type, adult, age: adult ? a.grow : 0, hunger: 100, happy: 60, sick: false, starvingSince: 0,
    nextProduct: s.time + a.every, ready: false, pregnant: false, dueAt: 0, x, y, name: a.name,
  };
  s.animals.push(an);
  return an;
}
const newPlot = (idx, unlocked) => ({ idx, unlocked, soil: 'untilled', water: 0, weeds: false, crop: null });

// ---------- Tạo / lưu / tải ----------
export function createGame({ name = 'Nông dân', look = {} } = {}) {
  const lk = { ...DEFAULT_LOOK, ...look };
  const owned = { hat: HATS.map((h, i) => i).filter(i => HATS[i].price === 0), acc: ACCS.map((h, i) => i).filter(i => ACCS[i].price === 0) };
  if (!owned.hat.includes(lk.hat)) lk.hat = 0;
  if (!owned.acc.includes(lk.acc)) lk.acc = 0;
  const nf = newFarm(1);
  const s = {
    v: 2, name, look: lk, owned, coins: START.coins, exp: 0,
    time: 0, speed: 1, day: 1, weather: 'sun', savedAt: now(),
    simMs: 0, frozenMs: 0, frozenTotal: 0,   // giờ vườn đã chạy · khoảng đóng băng lần mở gần nhất · tổng đóng băng
    farm: nf.farm, scene: 'farm',     // scene: bản đồ đang đứng; player.x/y tính theo bản đồ đó
    player: { x: 0, y: 0, dir: 0 }, stamina: STAMINA.max, sit: false, can: FARMING.canMax, selectedSeed: 'cai',
    tools: Object.fromEntries(Object.keys(TOOLS).map(k => [k, { lv: 1 }])), smith: null,   // smith: { tool, doneAt } công cụ đang nằm lò rèn
    inv: { ...START.items }, basket: {},   // inv = kho, basket = giỏ
    shipbin: { items: {} },   // thùng giao hàng: lái buôn lấy hết lúc 6h sáng
    plots: Array.from({ length: nf.plotCount }, (_, i) => newPlot(i, true)),
    animals: [], troughs: { chicken: 0, pig: 0, pasture: 0 }, eggs: [], nest: { egg: false, hatchAt: 0 },
    dog: { adult: START.dogAdult, age: START.dogAdult ? DOG.growMs : 0, hunger: 100, happy: 60, x: 0, y: 0, nextPoop: 0, name: DOG.name },
    poops: [], threats: [], orders: [], nextOrderAt: 0,
    stats: { harvests: 0, bugs: 0, eggs: 0, poops: 0, slips: 0, piglets: 0, hatches: 0, orders: 0, thieves: 0, crows: 0, earned: 0, planted: 0 },
    achievements: {}, log: [], tutorial: 0, nextId: nf.nextId,
    notify: {},   // loại thông báo 🟡 đã tắt: { ripe: false }; thiếu = bật. Mức 🔴 không tắt được
  };
  const m = mapOf(s);
  Object.assign(s.player, m.spawn);
  Object.assign(s.dog, m.dogHome);
  s.dog.nextPoop = nextPoopAt(s);
  for (const a of START.animals) { const p = penPoint(s, ANIMALS[a.type].pen); mkAnimal(s, a.type, a.adult, p.x, p.y); }
  evq = [];
  return s;
}

export function saveGame(s) {
  try { s.savedAt = now(); localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* không có localStorage */ }
}
export function resetGame() {
  try { localStorage.removeItem(SAVE_KEY); localStorage.setItem(MIGRATED_KEY, '1'); } catch { /* bỏ qua */ }
}

// Lý do lần loadGame gần nhất không đọc được bản lưu (null = không có bản lưu nào, không phải lỗi).
let problem = null;
export const loadProblem = () => problem;

function readSave() {
  problem = null;
  const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
  // Đã chuyển bản cũ một lần (hoặc đã chơi lại từ đầu) thì không đọc bản cũ nữa.
  const keys = read(MIGRATED_KEY) ? [SAVE_KEY] : [SAVE_KEY, ...OLD_KEYS];
  for (const key of keys) {
    const raw = read(key);
    if (raw == null) continue;
    try {
      const s = migrate(JSON.parse(raw));
      if (key !== SAVE_KEY) {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); localStorage.setItem(MIGRATED_KEY, '1'); } catch { /* bỏ qua */ }
      }
      return s;
    } catch (e) {
      problem = `Không đọc được bản lưu cũ (${e.message}). Bản lưu vẫn được giữ nguyên.`;
      return null;
    }
  }
  return null;
}

export function loadGame() {
  const s = readSave();
  if (!s) return null;
  // Bổ sung trường thiếu
  const base = createGame({ name: s.name });
  s.stats = { ...base.stats, ...s.stats };
  s.troughs = { ...base.troughs, ...s.troughs };
  for (const k of ['owned', 'achievements', 'inv', 'basket', 'nest', 'dog', 'player']) s[k] = { ...base[k], ...s[k] };
  for (const k of ['animals', 'eggs', 'poops', 'threats', 'orders', 'log']) s[k] ||= [];
  s.shipbin = { items: Object.fromEntries(Object.entries(s.shipbin?.items ?? {}).filter(([k, n]) => (CROPS[k] || PRODUCTS[k]) && n > 0)) };
  ensureShipbin(s);   // vườn cũ chưa có thùng: thêm một thùng cạnh nhà kho
  if (!hasScene(s.scene)) s.scene = 'farm';   // bản lưu cũ chưa có scene
  if (!Number.isFinite(s.stamina)) s.stamina = STAMINA.max;   // bản lưu cũ chưa có thể lực: đầy
  s.stamina = clamp(s.stamina, 0, STAMINA.max); s.sit = false;
  // bản lưu cũ: mọi công cụ cấp 1, bình tưới giữ số nước đang có (tối đa sức chứa)
  s.tools = Object.fromEntries(Object.keys(TOOLS).map(k => [k, { lv: clamp(Math.floor(s.tools?.[k]?.lv) || 1, 1, TOOL_MAX) }]));
  if (!(s.smith?.tool in TOOLS) || !Number.isFinite(s.smith.doneAt)) s.smith = null;
  s.can = clamp(Number.isFinite(s.can) ? s.can : FARMING.canMax, 0, canMax(s));
  // giờ vườn: bản lưu cũ chưa có thì lấy theo thời gian đã chạy
  s.simMs = Number.isFinite(s.simMs) ? s.simMs : s.time || 0;
  s.frozenTotal = Number.isFinite(s.frozenTotal) ? s.frozenTotal : 0;
  s.notify = Object.fromEntries(Object.entries(s.notify ?? {}).filter(([k, v]) => k in NOTIFY_CATS && v === false));
  s.frozenMs = 0; delete s.away;
  evq = [];
  const t = now(), gone = Math.max(0, t - (s.savedAt || t)), elapsed = Math.min(gone, MAX_CATCHUP_MS);
  let events = [];
  if (elapsed > 3000) {
    s.threats = [];
    catchUp = true;
    try { events = tick(s, elapsed); } finally { catchUp = false; }
    s.threats = [];
    evq = [];
    log(s, `Chào mừng trở lại! Nông trại đã chạy thêm ${Math.round(elapsed / MIN)} phút.`);
    evq = [];
  }
  s.frozenMs = gone - elapsed;   // phần vắng vượt 8 giờ: không chạy, chỉ ghi lại
  s.frozenTotal += s.frozenMs;
  const lines = awaySummary(events, s.frozenMs);
  s.away = lines.length || gone >= AWAY_SHOW_MS ? { lines, frozenMs: s.frozenMs, ms: gone } : null;
  s.savedAt = t;
  return s;
}

// ---------- Trong lúc bạn vắng nhà ----------
const AWAY_SHOW_MS = 5 * MIN;   // vắng ít hơn mức này mà chẳng có gì xảy ra thì không hiện màn tóm tắt
const lc = x => String(x ?? '').toLowerCase();
const count = (evs, type) => {
  const m = new Map();
  for (const e of evs) if (e.type === type) { const k = e.crop ?? e.animal ?? e.who ?? ''; m.set(k, (m.get(k) || 0) + 1); }
  return [...m];
};
const spanText = ms => {
  const tot = Math.round(ms / MIN), h = Math.floor(tot / 60), m = tot % 60;
  return [h && `${h} giờ`, m && `${m} phút`].filter(Boolean).join(' ') || '0 phút';
};
// Gộp event lúc chạy bù thành các dòng tiếng Việt. Hàm thuần: events đến từ tick().
export function awaySummary(events, frozenMs = 0) {
  const out = [], cropName = id => lc(CROPS[id]?.name ?? id);
  for (const [type, verb] of [['ripe', 'đã chín'], ['rotten', 'đã héo'], ['dead', 'đã chết']]) {
    for (const [id, n] of count(events, type)) out.push(`${n} ô ${cropName(id)} ${verb}`);
  }
  const eggs = events.filter(e => e.type === 'egg').length;
  if (eggs) out.push(`${eggs} quả trứng mới`);
  for (const [name, n] of count(events, 'hungry')) out.push(`${n} con ${lc(name)} đói lả`);
  for (const [name, n] of count(events, 'sick')) out.push(`${n} con ${lc(name)} bị bệnh`);
  const n = type => events.filter(e => e.type === type).length;
  if (n('crow')) out.push(`Quạ đã ăn mất ${n('crow')} cây`);
  if (n('thief')) out.push(`Thằng Tèo đã hái trộm ${n('thief')} cây`);
  const guard = n('guard');
  if (guard) out.push(`Chó đã đuổi quạ và trộm ${guard} lần`);
  const coins = events.reduce((a, e) => a + (e.type === 'shipped' ? e.coins : 0), 0);
  if (coins) out.push(`Lái buôn trả ${coins} xu`);
  if (frozenMs >= MIN) out.push(`Vườn đã đóng băng ${spanText(frozenMs)}`);
  return out;
}

// Mùa chỉ để hiển thị: mỗi mùa 7 ngày game. dayIn = ngày thứ mấy trong mùa (1..7).
const SEASONS = [['xuan', 'Xuân'], ['ha', 'Hạ'], ['thu', 'Thu'], ['dong', 'Đông']];
export function seasonOf(s) {
  const d = Math.max(0, (s.day || 1) - 1), [key, name] = SEASONS[Math.floor(d / 7) % 4];
  return { key, name, dayIn: d % 7 + 1 };
}
export const farmHours = s => (s.simMs || 0) / 3600_000;

// ---------- Thời gian ----------
const dayFrac = s => (s.time % DAY_MS) / DAY_MS;
export const isNight = s => dayFrac(s) >= NIGHT_FROM;
export function clockText(s) {
  const t = (6 + dayFrac(s) * 24) % 24;
  const h = Math.floor(t), m = Math.floor((t - h) * 60);
  const part = h < 12 ? 'sáng' : h < 18 ? 'chiều' : h < 22 ? 'tối' : 'đêm';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${part}`;
}
export const dayText = s => `Ngày ${s.day}`;

// Chợ Bà Tư mở từ MARKET.open tới MARKET.close (giờ trong game). Mua bán đều qua cổng kiểm tra này.
const hourOf = s => (6 + dayFrac(s) * 24) % 24;
export const marketOpen = s => { const h = hourOf(s); return h >= MARKET.open && h < MARKET.close; };
const CLOSED = `Chợ Bà Tư đóng cửa rồi, ${MARKET.open} giờ sáng mở lại nhé`;
const closed = extra => ({ ok: false, msg: CLOSED, reason: 'closed', ...extra });

// ---------- Thể lực & ngủ ----------
// Hết thể lực thì đi và làm chậm: world chia tốc độ đi, main nhân thời gian hành động với hệ số này.
export const slowFactor = s => (s.stamina <= 0 ? STAMINA.slow : 1);
export const standUp = s => { s.sit = false; };
export const canSleep = s => dayFrac(s) >= (STAMINA.sleepHour - 6) / 24;
const SLEEP_EARLY = `Để dành cho tối nay, ${STAMINA.sleepHour} giờ chiều mới ngủ được`;

// Ngủ: chạy mô phỏng thật tới 6h sáng hôm sau (cây vẫn lớn; như chạy bù offline thì không có quạ/trộm), hồi đầy thể lực.
export function sleep(s) {
  if (!canSleep(s)) return R(false, SLEEP_EARLY, { reason: 'early' });
  const left = (Math.floor(s.time / DAY_MS) + 1) * DAY_MS - s.time, was = catchUp;
  s.sit = false; s.threats = [];
  catchUp = true;
  let ev;
  try { ev = tick(s, left); } finally { catchUp = was; }
  s.threats = [];
  s.stamina = STAMINA.max;
  evq.push(...ev);
  return R(true, 'Chào buổi sáng! Thể lực đã đầy ☀️', { slept: true });
}

// ---------- Thông báo ----------
export const notifyOn = (s, cat) => s.notify?.[cat] !== false;
export function setNotify(s, cat, on) {
  if (!(cat in NOTIFY_CATS)) return false;
  s.notify = { ...s.notify };
  if (on) delete s.notify[cat]; else s.notify[cat] = false;
  return true;
}
// Chỗ đang có chuyện gấp 🔴, tính từ trạng thái (không phụ thuộc event nên bản lưu đang có sự cố cũng báo).
// { key, kind, x, y, text }: x, y theo bản đồ vườn.
export function urgentSpots(s) {
  const out = [];
  for (const t of s.threats ?? []) if (t.state === 'eating' && s.plots[t.plot]) {
    const c = plotCenter(s, t.plot), crow = t.kind === 'crow';
    out.push({ key: 'threat:' + t.id, kind: t.kind, x: c.x, y: c.y, text: crow ? 'Quạ đang ăn cây!' : 'Có trộm đang hái cây!' });
  }
  for (const a of s.animals ?? []) if (a.sick) out.push({ key: 'sick:' + a.id, kind: 'sick', x: a.x, y: a.y, text: `${ANIMALS[a.type].name} bị bệnh!` });
  return out;
}

// ---------- Tick ----------
export function tick(s, dtGame) {
  let left = Math.max(0, dtGame);
  while (left > 0) { const d = Math.min(1000, left); left -= d; step(s, d); }
  const out = evq; evq = [];
  return out;
}

function step(s, d) {
  s.time += d;
  s.simMs = (s.simMs || 0) + d;
  const day = Math.floor(s.time / DAY_MS) + 1;
  if (day !== s.day) {
    s.day = day;
    const r = Math.random();
    s.weather = r < 0.45 ? 'sun' : r < 0.75 ? 'cloud' : 'rain';
    s.stamina = Math.min(STAMINA.max, s.stamina + STAMINA.morningRegen);   // mỗi sáng 6h tự hồi một ít
    settleShip(s);
    toast({ sun: 'Trời nắng đẹp ☀️', cloud: 'Trời nhiều mây ⛅', rain: 'Trời mưa rồi, ruộng tự có nước 🌧️' }[s.weather]);
  }
  if (s.sit) {   // ngồi ghế đá: hồi chậm, đầy thì tự đứng dậy
    s.stamina = Math.min(STAMINA.max, s.stamina + STAMINA.benchPerMin * d / MIN);
    if (s.stamina >= STAMINA.max) { s.sit = false; toast('Khỏe re rồi, làm tiếp thôi 💪'); }
  }
  if (s.smith && s.time >= s.smith.doneAt) finishUpgrade(s);
  for (const p of s.plots) if (p.unlocked) stepPlot(s, p, d);
  stepAnimals(s, d);
  stepEggs(s);
  stepDog(s, d);
  if (!catchUp) stepThreats(s, d);
  stepOrders(s);
  checkAch(s);
}

function stepPlot(s, p, d) {
  if (s.weather === 'rain') p.water = 100;
  else if (p.water > 0) p.water = Math.max(0, p.water - FARMING.waterDrainPerMin * (d / MIN) * (s.weather === 'sun' ? 1.5 : 1));
  if (!p.weeds && chance(FARMING.weedChancePerMin, d)) p.weeds = true;
  const c = p.crop;
  if (!c || c.dead || c.rotten) return;
  const def = CROPS[c.id], at = plotCenter(s, p.idx);
  if (c.progress >= 1) { // chín: tiếp tục già đi, quá OVERRIPE thì héo
    c.progress += d / def.grow;
    if (c.progress >= OVERRIPE) { c.rotten = true; emit({ type: 'rotten', crop: c.id }); fxEv(at.x, at.y, 'Héo mất rồi 🥀', COL.bad); log(s, `${def.name} chín quá nên héo mất`); }
    return;
  }
  if (c.sick) {
    if (s.time - c.sickSince >= FARMING.sickToDead) { c.dead = true; emit({ type: 'dead', crop: c.id }); fxEv(at.x, at.y, 'Cây chết rồi 💀', COL.bad); log(s, `${def.name} bị bệnh nặng và chết mất`); }
    return;
  }
  if (c.bugs) {
    if (s.time - c.bugSince >= FARMING.bugToSick) { c.bugs = false; c.sick = true; c.sickSince = s.time; fxEv(at.x, at.y, 'Cây bệnh rồi 🤒', COL.bad); log(s, `${def.name} bị bệnh vì sâu`); }
    return;
  }
  if (p.water > 0) c.progress += (d / def.grow) * (p.weeds ? FARMING.weedSlow : 1) * (c.fert ? FARMING.fertSpeed : 1);
  if (c.progress >= 1) { c.ripeAt = s.time; emit({ type: 'ripe', crop: c.id }); fxEv(at.x, at.y, 'Chín rồi! 🌾', COL.good); snd('pop'); }
  else if (chance(FARMING.bugChancePerMin, d)) { c.bugs = true; c.bugSince = s.time; fxEv(at.x, at.y, 'Có sâu! 🐛', COL.bad); }
}

function stepAnimals(s, d) {
  const stink = s.poops.length * DOG.stinkUnhappyPerPoop * (d / MIN);
  for (const a of s.animals) {
    const def = ANIMALS[a.type];
    a.hunger = Math.max(0, a.hunger - 100 * d / HUSBANDRY.hungerMs);
    // tự ra máng ăn
    if (a.hunger < HUSBANDRY.autoEatBelow && s.troughs[def.pen] > 0) { s.troughs[def.pen]--; a.hunger = 100; }
    // vui: trôi dần về 50, mùi hôi kéo xuống
    if (a.happy > 50) a.happy = Math.max(50, a.happy - HUSBANDRY.happyDecayPerMin * d / MIN);
    a.happy = Math.max(0, a.happy - stink);
    // đói lả -> bệnh
    if (a.hunger <= 0) { if (!a.starvingSince) { a.starvingSince = s.time; emit({ type: 'hungry', animal: def.name }); } } else a.starvingSince = 0;
    if (!a.sick && ((a.starvingSince && s.time - a.starvingSince >= HUSBANDRY.sickAfterStarving) || chance(HUSBANDRY.sickChancePerMin, d))) {
      a.sick = true; emit({ type: 'sick', animal: def.name }); fxEv(a.x, a.y, `${def.name} bị bệnh 🤒`, COL.bad); log(s, `${def.name} bị bệnh, cho uống thuốc thú y nhé`);
    }
    if (a.sick) continue;
    if (!a.adult) {
      if (a.hunger > HUSBANDRY.growNeedsHunger) a.age += d;
      if (a.age >= def.grow) { a.adult = true; a.age = def.grow; a.nextProduct = s.time + def.every; log(s, `${def.baby} đã lớn thành ${def.name.toLowerCase()}`); fxEv(a.x, a.y, 'Lớn rồi! ✨', COL.good); }
      continue;
    }
    if (a.hunger <= HUSBANDRY.growNeedsHunger || a.type === 'heo' || s.time < a.nextProduct) continue;
    if (a.type === 'ga') {
      if (s.eggs.length < 30) { const e = { id: s.nextId++, x: a.x, y: a.y, laidAt: s.time }; s.eggs.push(e); emit({ type: 'egg' }); spawnEv('egg', e.x, e.y); }
      a.nextProduct = s.time + def.every;
    } else if (!a.ready) { a.ready = true; fxEv(a.x, a.y, a.type === 'bo' ? 'Có sữa! 🥛' : 'Có lông! ✂️'); }
  }
  stepPigs(s, d);
}

function stepPigs(s, d) {
  const pigs = s.animals.filter(a => a.type === 'heo');
  let total = pigs.length;
  for (const a of [...pigs]) {
    if (!a.pregnant || a.sick || s.time < a.dueAt) continue;
    const room = PEN_CAP.pig - total, n = Math.min(rint(...HUSBANDRY.pigLitter), Math.max(0, room));
    if (n <= 0) continue; // chuồng chật thì chờ
    a.pregnant = false; a.nextProduct = s.time + HUSBANDRY.pigGestation; // nghỉ trước lứa sau
    for (let i = 0; i < n; i++) { const b = mkAnimal(s, 'heo', false, a.x + rnd(-6, 6), a.y + rnd(-6, 6)); spawnEv('piglet', b.x, b.y); }
    s.stats.piglets += n; addExp(s, ANIMALS.heo.exp);
    fxEv(a.x, a.y, `Heo đẻ ${n} heo con! 🐷`, COL.good); snd('oink');
    log(s, `Heo nái đẻ ${n} heo con`);
    total += n;
  }
  const fit = pigs.filter(a => a.adult && !a.sick && a.hunger > HUSBANDRY.growNeedsHunger && a.happy > 40);
  if (fit.length < 2 || total >= PEN_CAP.pig || !chance(HUSBANDRY.pigBreedChancePerMin, d)) return;
  const cand = fit.filter(a => !a.pregnant && s.time >= a.nextProduct);
  if (!cand.length) return;
  const sow = pick(cand);
  sow.pregnant = true; sow.dueAt = s.time + HUSBANDRY.pigGestation;
  fxEv(sow.x, sow.y, 'Heo mang bầu 💕', COL.good); log(s, 'Một chú heo đang mang bầu');
}

function stepEggs(s) {
  const chickPen = () => penCount(s, 'chicken') < PEN_CAP.chicken;
  // trứng bỏ quên: mỗi eggForgetMs thử một lần
  for (const e of [...s.eggs]) {
    e.check ??= e.laidAt + HUSBANDRY.eggForgetMs;
    if (s.time < e.check) continue;
    if (chickPen() && Math.random() < HUSBANDRY.eggHatchChance) {
      s.eggs.splice(s.eggs.indexOf(e), 1);
      mkAnimal(s, 'ga', false, e.x, e.y); s.stats.hatches++;
      spawnEv('chick', e.x, e.y); snd('cluck'); fxEv(e.x, e.y, 'Trứng nở! 🐣', COL.good); log(s, 'Một quả trứng bỏ quên đã nở thành gà con');
    } else e.check += HUSBANDRY.eggForgetMs;
  }
  if (s.nest.egg && s.time >= s.nest.hatchAt && chickPen()) {
    const at = mapOf(s).building('coop').at, p = penPoint(s, 'chicken');
    s.nest.egg = false; mkAnimal(s, 'ga', false, p.x, p.y); s.stats.hatches++;
    spawnEv('chick', at.x, at.y); snd('cluck'); fxEv(at.x, at.y, 'Trứng nở! 🐣', COL.good); toast('Trứng ở ổ ấp đã nở gà con 🐣'); log(s, 'Ổ ấp nở ra một gà con');
  }
}

function stepDog(s, d) {
  const g = s.dog;
  g.hunger = Math.max(0, g.hunger - 100 * d / DOG.hungerMs);
  g.happy = Math.max(0, g.happy - d / MIN);
  if (!g.adult && g.hunger > HUSBANDRY.growNeedsHunger) {
    g.age += d;
    if (g.age >= DOG.growMs) { g.adult = true; toast(`${g.name} đã lớn thành chó canh nhà 🐕`); log(s, `${g.name} đã trưởng thành`); }
  }
  if (s.time >= g.nextPoop) {
    g.nextPoop = nextPoopAt(s);
    if (s.poops.length < DOG.maxPoops) {
      const p = { id: s.nextId++, x: g.x, y: g.y, at: s.time };
      s.poops.push(p); spawnEv('poop', p.x, p.y);
    }
  }
}

const guardOn = s => s.dog.adult && s.dog.hunger > 40 && s.dog.happy > 50;

function stepThreats(s, d) {
  const busy = new Set(s.threats.map(t => t.plot));
  const ripe = s.plots.filter(p => p.unlocked && isRipe(p) && !busy.has(p.idx));
  const m = mapOf(s), v = m.view, gateIn = m.gateIn ?? m.spawn;
  const scare = m.decos.filter(o => o.kind === 'deco_scarecrow');
  const lamps = Math.min(3, m.decos.filter(o => o.kind === 'deco_lamp').length);
  // quạ
  const open = ripe.filter(p => { const c = plotCenter(s, p.idx); return !scare.some(o => Math.hypot(o.x - c.x, o.y - c.y) <= 5 * TS); });
  if (open.length && s.threats.filter(t => t.kind === 'crow').length < 2 && chance(THREATS.crowChancePerMin, d)) {
    const p = pick(open), c = plotCenter(s, p.idx), side = rint(0, 2);
    const x = side === 0 ? v.x0 + 2 : side === 1 ? v.x1 - 2 : rnd(v.x0 + 20, v.x1 - 20), y = side === 2 ? v.y0 + 2 : rnd(v.y0 + 20, (v.y0 + v.y1) / 2);
    s.threats.push({ id: s.nextId++, kind: 'crow', plot: p.idx, x, y, arriveAt: s.time + Math.hypot(c.x - x, c.y - y) / 60 * 1000, state: 'coming', since: s.time });
    spawnEv('crow', x, y); snd('crow');
  }
  // thằng Tèo
  if (isNight(s) && ripe.length >= 2 && !s.threats.some(t => t.kind === 'thief') && chance(THREATS.thiefChancePerNightMin * Math.pow(0.6, lamps), d)) {
    const p = pick(ripe), c = plotCenter(s, p.idx);
    s.threats.push({ id: s.nextId++, kind: 'thief', plot: p.idx, x: gateIn.x, y: gateIn.y, arriveAt: s.time + Math.hypot(c.x - gateIn.x, c.y - gateIn.y) / 40 * 1400, state: 'coming', since: s.time, loot: false });
    spawnEv('thief', gateIn.x, gateIn.y);
  }
  for (const t of s.threats) {
    const p = s.plots[t.plot], crow = t.kind === 'crow', who = crow ? 'Quạ' : 'Thằng Tèo';
    if (t.state === 'coming') {
      if (!p.crop) { t.state = 'leaving'; t.since = s.time; } // cây đã biến mất
      else if (s.time >= t.arriveAt) {
        t.state = 'eating'; t.since = s.time; emit({ type: 'eating', kind: t.kind });
        if (guardOn(s) && Math.random() < DOG.guardChance) {
          t.state = 'leaving'; t.since = s.time; s.stats[crow ? 'crows' : 'thieves']++; emit({ type: 'guard', who: crow ? 'crow' : 'thief' });
          log(s, `${s.dog.name} sủa vang, đuổi ${who.toLowerCase()} đi rồi`); snd('bark');
        }
      }
    } else if (t.state === 'eating') {
      if (!p.crop) { t.state = 'leaving'; t.since = s.time; }
      else if (s.time - t.since >= (crow ? THREATS.crowEatMs : THREATS.thiefStealMs)) {
        const nm = CROPS[p.crop.id].name;
        p.crop = null; t.state = 'leaving'; t.since = s.time; t.loot = !crow;
        emit({ type: crow ? 'crow' : 'thief', name: nm });
        const c = plotCenter(s, p.idx);
        fxEv(c.x, c.y, crow ? 'Quạ ăn mất cây! 😢' : 'Bị hái trộm! 😢', COL.bad);
        const lost = crow ? `Quạ đã ăn mất ${nm}` : `Thằng Tèo hái trộm mất ${nm}`;
        log(s, lost);
      }
    }
  }
  s.threats = s.threats.filter(t => t.state !== 'leaving' || s.time - t.since < (t.kind === 'crow' ? 4000 : 20000));
}

function stepOrders(s) {
  if (s.orders.length >= ORDERS.max) { s.nextOrderAt = Math.max(s.nextOrderAt, s.time + ORDERS.newEvery); return; }
  if (s.time < s.nextOrderAt) return;
  s.orders.push(makeOrder(s));
  s.nextOrderAt = s.time + ORDERS.newEvery;
  emit({ type: 'order' });
}

function makeOrder(s) {
  const lv = level(s), pool = Object.keys(CROPS).filter(k => CROPS[k].lv <= lv), items = {};
  for (let i = rint(1, 2); i > 0 && pool.length; i--) items[pool.splice(rint(0, pool.length - 1), 1)[0]] = rint(2, 5);
  if (Math.random() < 0.3) items.trung = rint(2, 4);
  let price = 0, exp = 0;
  for (const [k, n] of Object.entries(items)) { price += sellPrice(k) * n; exp += (CROPS[k]?.exp ?? 2) * n; }
  return { id: s.nextId++, who: pick(ORDERS.people), items, coins: Math.round(price * ORDERS.rewardMul), exp: Math.round(exp * ORDERS.rewardMul / 2) };
}

// ---------- Ruộng: tiện ích ----------
export const nextLockedPlot = s => UNLOCK_ORDER.find(i => s.plots[i] && !s.plots[i].unlocked && !s.plots[i].removed) ?? -1;
const unlockedCount = s => s.plots.filter(p => p.unlocked).length;
export const stageOf = c => CROP_STAGES.reduce((st, th, i) => (c.progress >= th ? i : st), 0);

// ---------- Công cụ & tiệm rèn Ông Sáu ----------
export const toolLv = (s, k) => s.tools?.[k]?.lv ?? 1;
export const canMax = s => TOOLS.can.canMax[toolLv(s, 'can') - 1];
export const toolName = (s, k) => `${TOOLS[k].name} ${TOOL_LEVEL[toolLv(s, k) - 1]}`;
export const toolAway = (s, k) => s.smith?.tool === k;   // đang nằm lò rèn: chưa dùng được
const awayMsg = k => `${TOOLS[k].name} đang nằm lò rèn của Ông Sáu, chờ rèn xong nhé`;
const TOOL_OF = Object.fromEntries(Object.entries(TOOLS).flatMap(([k, d]) => d.act.map(a => [a, k])));
const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];   // hướng nhìn: xuống, trái, phải, lên

// Ô nào làm được hành động nào (ô khác trong vùng mà không hợp lệ thì bỏ qua)
const ripeCrop = p => p.crop && !p.crop.dead && !p.crop.rotten && p.crop.progress >= 1;
const FIT = {
  till: p => !p.crop && p.soil === 'untilled',
  water: p => p.crop && !p.crop.dead && !p.crop.rotten && p.crop.progress < 1 && p.water < 95,
  harvest: ripeCrop,
  weed: p => p.weeds && !(p.crop && (p.crop.dead || p.crop.rotten || p.crop.progress >= 1)),
};

// Các ô bị tác động khi dùng công cụ `tool` lên ô ruộng `idx` (mục tiêu đứng đầu). Chỉ lấy ô mở, hợp lệ cho hành động `id`.
// Bình tưới còn bao nhiêu nước thì tưới được bấy nhiêu ô.
export function toolArea(s, tool, idx, id = TOOLS[tool]?.act[0]) {
  const m = mapOf(s), t = m.plotTile(idx), fit = FIT[id];
  if (!t || !fit) return [];
  const kind = TOOLS[tool].area[toolLv(s, tool) - 1], [dx, dy] = DIRV[s.player.dir ?? 0];
  const cells = kind === 'row' ? [0, 1, 2].map(i => [t.c + dx * i, t.r + dy * i])
    : kind === 'block' ? [-1, 0, 1].flatMap(j => [-1, 0, 1].map(i => [t.c + i, t.r + j])) : [[t.c, t.r]];
  const out = [];
  for (const [c, r] of cells) {
    const i = m.plotAt(c, r), p = s.plots[i];
    if (p?.unlocked && fit(p) && !out.includes(i)) out.push(i);
  }
  out.sort((a, b) => (b === idx) - (a === idx));
  return id === 'water' ? out.slice(0, s.can) : out;
}

// Thu hoạch nhiều ô: lấy theo thứ tự tới khi giỏ không chứa thêm được nữa
function fitBasket(s, tiles) {
  let left = room(s);
  return tiles.filter(i => { const q = harvestQty(s.plots[i].crop); if (q > left) { left = 0; return false; } left -= q; return true; });
}

// Gắn danh sách ô (tiles) và khóa theo công cụ vào các hành động trên ô ruộng
function withTools(s, t, A) {
  for (const a of A) {
    const k = TOOL_OF[a.id];
    if (!k) continue;
    if (toolAway(s, k)) { a.disabled = awayMsg(k); continue; }
    a.tiles = toolArea(s, k, t.idx, a.id);
    if (a.id === 'harvest') a.tiles = fitBasket(s, a.tiles);
    if (a.tiles.length > 1) a.label += ` (${a.tiles.length} ô)`;
  }
  const j = A.findIndex(a => !a.disabled);
  if (j > 0 && A[0].disabled) A.unshift(...A.splice(j, 1));
  return A;
}

export const upgradeCost = (s, k) => TOOLS[k].price[toolLv(s, k) - 1] ?? null;   // null = đã cấp cao nhất
export function startUpgrade(s, k) {
  const d = TOOLS[k], lv = toolLv(s, k);
  if (!d) return R(false, 'Không có công cụ này', { reason: 'unknown' });
  if (s.smith) return R(false, `Ông Sáu đang rèn ${TOOLS[s.smith.tool].name.toLowerCase()} rồi, chờ xong đã nhé`, { reason: 'busy' });
  if (lv >= TOOL_MAX) return R(false, `${d.name} đã là cấp cao nhất rồi`, { reason: 'max' });
  const cost = upgradeCost(s, k);
  if (s.coins < cost) return R(false, 'Chưa đủ xu', { reason: 'coins' });
  s.coins -= cost;
  s.smith = { tool: k, doneAt: s.time + DAY_MS };
  log(s, `Gửi ${d.name.toLowerCase()} cho Ông Sáu rèn lên cấp ${lv + 1} (${cost} xu)`);
  return R(true, `Ông Sáu nhận rèn ${d.name.toLowerCase()} lên cấp ${lv + 1}, một ngày nữa xong nhé`);
}
function finishUpgrade(s) {
  const k = s.smith.tool;
  s.smith = null;
  s.tools[k].lv = Math.min(TOOL_MAX, toolLv(s, k) + 1);
  log(s, `Ông Sáu rèn xong ${toolName(s, k).toLowerCase()}`);
  toast(`Ông Sáu rèn xong ${toolName(s, k).toLowerCase()} rồi, dùng thôi! 🔨`);
}

// ---------- actionsFor ----------
const mk = (id, icon, text, disabled) => ({ id, icon, label: `${icon} ${text}`, ...(disabled ? { disabled } : {}) });
export const mmss = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const FEED_OF_PEN = { chicken: 'feed_ga', pig: 'feed_heo', pasture: 'hay' };
const noItem = k => `Hết ${itemName(k).toLowerCase()}, mua ở chợ nhé`;

export function actionsFor(s, t) {
  if (!t) return [];
  const f = { plot: (s, t) => withTools(s, t, plotActs(s, t)),lockedPlot: lockedActs, animal: animalActs, egg: s => [mk('collect', '🥚', 'Nhặt trứng', room(s) < 1 ? FULL : null)],
    poop: () => [mk('scoop', '💩', 'Xúc phân')], trough: troughActs, nest: nestActs, dog: dogActs, threat: threatActs, building: buildingActs, door: doorActs, deco: decoActs }[t.kind];
  return f ? f(s, t) : [];
}

function plotActs(s, t) {
  const p = s.plots[t.idx];
  if (!p?.unlocked) return [];
  const c = p.crop, A = [];
  if (!c) {
    if (p.soil === 'untilled') A.push(mk('till', '⛏️', 'Cuốc đất'));
    else {
      const def = CROPS[s.selectedSeed], n = have(s, `seed_${s.selectedSeed}`);
      A.push(mk('plant', '🌱', `Gieo ${def.name} (còn ${n})`, level(s) < def.lv ? `Cần cấp ${def.lv}` : n <= 0 ? 'Hết hạt, mua ở chợ nhé' : null));
    }
    if (p.weeds) A.push(mk('weed', '🌿', 'Nhổ cỏ'));
    return A;
  }
  if (c.dead || c.rotten) return [mk('clear', '🧹', c.dead ? 'Dọn cây chết' : 'Dọn cây héo')];
  if (c.progress >= 1) return [mk('harvest', '🧺', `Thu hoạch ${CROPS[c.id].name} (${harvestQty(c)})`, room(s) < harvestQty(c) ? FULL : null)];
  const noPest = have(s, 'pesticide') <= 0 ? noItem('pesticide') : null;
  if (c.sick) A.push(mk('spray', '🧴', 'Phun thuốc chữa bệnh', noPest));
  if (c.bugs) A.push(mk('spray', '🧴', 'Phun thuốc trừ sâu', noPest), mk('catch', '🤏', 'Bắt sâu bằng tay'));
  const water = mk('water', '💧', `Tưới nước (bình ${s.can}/${canMax(s)})`, s.can <= 0 ? 'Bình hết nước, ra giếng múc nhé' : p.water >= 95 ? 'Đất đang đủ nước rồi' : null);
  if (p.water < 30) A.push(water);
  if (p.weeds) A.push(mk('weed', '🌿', 'Nhổ cỏ'));
  if (!A.includes(water)) A.push(water);
  if (!c.fert) A.push(mk('fertilize', '💩', `Bón phân (còn ${have(s, 'fertilizer')})`, have(s, 'fertilizer') <= 0 ? noItem('fertilizer') : null));
  A.push(mk('growth', '⚡', `Thuốc tăng trưởng (còn ${have(s, 'growth')})`, c.boosts >= FARMING.growthMax ? 'Cây đã dùng tối đa rồi' : have(s, 'growth') <= 0 ? noItem('growth') : null));
  const j = A.findIndex(a => !a.disabled);
  if (j > 0 && A[0].disabled) A.unshift(...A.splice(j, 1)); // hành động chính phải làm được nếu có thể
  return A;
}

function lockedActs(s, t) {
  if (t.idx !== nextLockedPlot(s)) return [];
  const n = unlockedCount(s), cost = expandCost(n), lv = expandLevel(n);
  return [mk('expand', '🔓', `Mở rộng đất (${cost} xu)`, level(s) < lv ? `Cần cấp ${lv} mới mở rộng được` : s.coins < cost ? 'Chưa đủ xu' : null)];
}

function animalActs(s, t) {
  const a = s.animals.find(x => x.id === t.id);
  if (!a) return [];
  const def = ANIMALS[a.type], A = {}, n = have(s, def.feed);
  if (a.ready) A.collect = a.type === 'bo' ? mk('milk', '🥛', 'Vắt sữa', room(s) < 1 ? FULL : null) : mk('shear', '✂️', 'Xén lông', room(s) < 1 ? FULL : null);
  A.feed = mk('feed', '🌾', `Cho ăn tận tay (còn ${n})`, n <= 0 ? noItem(def.feed) : a.hunger >= 95 ? 'Bụng no căng rồi' : null);
  A.pet = mk('pet', '🤗', 'Vuốt ve');
  if (a.sick) A.medicine = mk('medicine', '💊', `Cho uống thuốc thú y (còn ${have(s, 'medicine')})`, have(s, 'medicine') <= 0 ? noItem('medicine') : null);
  if (!a.adult && !a.sick) A.vitamin = mk('vitamin', '💉', `Cho uống vitamin (còn ${have(s, 'vitamin')})`, have(s, 'vitamin') <= 0 ? noItem('vitamin') : null);
  const first = a.sick ? 'medicine' : a.ready ? 'collect' : a.hunger < 40 ? 'feed' : 'pet';
  const list = [A[first], ...Object.entries(A).filter(([k]) => k !== first).map(([, v]) => v)];
  if (a.adult) list.push(mk('sell', ICON[a.type], `Bán ${def.name.toLowerCase()} (${def.sell} xu)`));
  return list;
}

function troughActs(s, t) {
  const item = FEED_OF_PEN[t.pen], n = have(s, item);
  if (!item) return [];
  return [mk('fill', '🌾', `Đổ cám vào máng (${s.troughs[t.pen]}/${HUSBANDRY.troughMax})`,
    n <= 0 ? noItem(item) : s.troughs[t.pen] >= HUSBANDRY.troughMax ? 'Máng đầy ắp rồi' : null)];
}

function nestActs(s) {
  if (s.nest.egg) return [mk('wait', '🪺', `Đang ấp trứng (còn ${mmss(s.nest.hatchAt - s.time)})`, 'Chờ trứng nở nhé')];
  return [mk('incubate', '🥚', `Đặt trứng vào ổ ấp (còn ${have(s, 'trung')})`, have(s, 'trung') <= 0 ? 'Chưa có trứng, ra chuồng gà nhặt nhé' : null)];
}

function dogActs(s) {
  const n = have(s, 'dogfood'), g = s.dog;
  const feed = mk('feed', '🦴', `Cho ${g.name} ăn (còn ${n})`, n <= 0 ? noItem('dogfood') : g.hunger >= 95 ? `${g.name} no rồi` : null);
  const pet = mk('pet', '🤗', `Vuốt ve ${g.name}`);
  return g.hunger < 50 ? [feed, pet] : [pet, feed];
}

function threatActs(s, t) {
  const th = s.threats.find(x => x.id === t.id);
  if (!th) return [];
  if (th.kind === 'crow') return [mk('shoo', '🪶', 'Đuổi quạ', th.state === 'leaving' ? 'Nó bay mất rồi' : null)];
  return [mk('catch', '🧢', 'Bắt thằng Tèo', th.state === 'leaving' && !th.loot ? 'Nó chuồn mất rồi' : null)];
}

// Chỗ trong làng chưa mở: chạm vào chỉ có lời nhắn
const TALK = {
  friendGate: { icon: '🚪', label: 'Xem cổng bạn bè', msg: 'Sắp ra mắt: thăm bạn bè' },
};
function buildingActs(s, t) {
  const b = sceneMap(s).building(t.id);
  if (!b) return [];
  const open = { shed: ['📦', 'Vào nhà kho'], shipbin: ['📮', 'Mở thùng giao hàng'], board: ['📋', 'Xem đơn hàng'], wardrobe: ['👕', 'Mở tủ đồ'], smithy: ['🔨', 'Vào tiệm rèn'] }[b.id];
  if (open) return [mk('open', open[0], open[1])];
  if (b.id === 'market') return [mk('open', '🛒', 'Mua bán ở chợ', marketOpen(s) ? null : CLOSED)];
  if (TALK[b.id]) return [mk('talk', TALK[b.id].icon, TALK[b.id].label)];
  if (b.id === 'house') return [mk('enter', '🏠', 'Vào nhà')];
  if (b.id === 'gate') return [mk('enter', '🚪', 'Ra làng')];
  if (b.id === 'bed') return [mk('sleep', '🛏️', 'Ngủ', canSleep(s) ? null : SLEEP_EARLY)];
  if (b.id.startsWith('bench')) return benchActs(s);
  if (b.id === 'well') return [mk('refill', '🪣', `Múc nước (bình ${s.can}/${canMax(s)})`, toolAway(s, 'can') ? awayMsg('can') : s.can >= canMax(s) ? 'Bình đầy rồi' : null)];
  return [];
}

// Ghế đá (đồ trang trí ngoài vườn, ghế ngoài làng): ngồi thì hồi chậm tới khi đứng dậy (đi đâu đó) hoặc đầy
const benchActs = s => [mk('sit', '🪑', 'Ngồi nghỉ', s.stamina >= STAMINA.max ? 'Bạn còn khỏe lắm, chưa cần nghỉ' : s.sit ? 'Đang ngồi nghỉ rồi' : null)];
function decoActs(s, t) {
  const e = s.farm.ents.find(x => x.id === t.id);
  return e?.item === 'deco_bench' ? benchActs(s) : [];
}

// Cửa sang bản đồ khác: { kind: 'door', to }
const doorOf = (s, to) => sceneMap(s).doors.find(d => d.to === to) ?? null;
function doorActs(s, t) {
  const d = doorOf(s, t.to);
  return d ? [mk('go', '🚪', d.to === 'farm' ? (s.scene === 'village' ? 'Về vườn nhà' : 'Ra vườn') : `Vào ${d.name.toLowerCase()}`)] : [];
}

// ---------- perform ----------
const harvestQty = c => Math.round(CROPS[c.id].yield * (c.fert ? 1 + FARMING.fertYield : 1));
const res = (ok, msg, fx = [], sound, extra) => ({ ok, msg, fx, ...(sound ? { sound } : {}), ...extra });
const bad = (msg, at) => res(false, msg, at ? [{ text: msg, color: COL.bad, x: at.x, y: at.y }] : [], 'error');

function posOf(s, t) {
  const m = mapOf(s);
  if (t.kind === 'plot' || t.kind === 'lockedPlot') return m.plotCenter(t.idx) ?? s.player;
  if (t.kind === 'trough') return m.pens[t.pen]?.trough ?? s.player;
  if (t.kind === 'nest') return m.building('coop')?.at ?? s.player;
  if (t.kind === 'building') return sceneMap(s).building(t.id)?.at ?? s.player;
  if (t.kind === 'door') return doorOf(s, t.to)?.at ?? s.player;
  if (t.kind === 'deco') return m.decos.find(d => d.id === t.id) ?? s.player;
  if (t.kind === 'dog') return s.dog;
  const list = { animal: s.animals, egg: s.eggs, poop: s.poops, threat: s.threats }[t.kind];
  return list?.find(x => x.id === t.id) ?? s.player;
}

export function perform(s, t, id) {
  const at = { x: posOf(s, t).x, y: posOf(s, t).y };
  if (t.kind === 'poop' && id === 'slip') { // WORLD gọi khi người chơi giẫm phải
    const i = s.poops.findIndex(p => p.id === t.id);
    if (i < 0) return bad('Không thấy bãi phân đâu cả');
    s.poops.splice(i, 1); s.stats.slips++;
    return res(true, 'Eo ôi! 💩', [{ text: 'Eo ôi! 💩', color: COL.bad, x: at.x, y: at.y }], 'slip', { stunMs: DOG.slipStunMs });
  }
  const act = actionsFor(s, t).find(a => a.id === id);
  if (!act) return bad('Chưa làm được việc này', at);
  if (act.disabled) return bad(act.disabled, at);
  if (id !== 'sit') s.sit = false;
  const n = t.kind === 'plot' && act.tiles?.length > 1 ? act.tiles.length : 1;   // dùng công cụ cấp cao: làm nhiều ô một lần
  const r = n > 1 ? doArea(s, act.tiles, id) : DO[t.kind](s, t, id, at);
  if (t.kind === 'plot' && STAMINA.cost[id]) spend(s, Math.round(STAMINA.cost[id] * GROUP_COST[n]));
  checkAch(s);
  return r;
}

// Trừ thể lực; vừa hết thì báo một lần
function spend(s, n) {
  const was = s.stamina;
  s.stamina = Math.max(0, s.stamina - n);
  if (was > 0 && s.stamina <= 0) toast('Hết sức rồi, đi và làm sẽ chậm hơn. Ngủ hay ngồi ghế đá cho khỏe lại nhé 😮‍💨');
}

const say = (at, text, color = COL.good) => ({ text, color, x: at.x, y: at.y });

function doArea(s, tiles, id) {
  const rs = tiles.map(idx => { const c = plotCenter(s, idx); return DO.plot(s, { kind: 'plot', idx }, id, { x: c.x, y: c.y }); });
  return res(true, `Xong ${tiles.length} ô`, rs.flatMap(r => r.fx), rs[0].sound);
}

const DO = {
  plot(s, t, id, at) {
    const p = s.plots[t.idx], c = p.crop;
    switch (id) {
      case 'till': p.soil = 'tilled'; p.weeds = false; return res(true, 'Đã cuốc đất', [say(at, '⛏️')], 'dig');
      case 'plant': {
        const def = CROPS[s.selectedSeed];
        take(s, `seed_${s.selectedSeed}`); s.stats.planted++;
        p.crop = { id: s.selectedSeed, progress: 0, planted: s.time, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
        return res(true, `Đã gieo ${def.name}`, [say(at, '🌱')], 'plant');
      }
      case 'water': s.can--; p.water = 100; return res(true, 'Đã tưới nước', [say(at, '💧', '#7ad7ff')], 'water');
      case 'weed': p.weeds = false; return res(true, 'Đã nhổ cỏ', [say(at, '🌿')], 'pop');
      case 'spray': {
        take(s, 'pesticide');
        if (c.bugs) s.stats.bugs++;
        c.bugs = false; c.sick = false;
        return res(true, 'Cây khỏe lại rồi', [say(at, 'Hết sâu! ✨')], 'spray');
      }
      case 'catch':
        if (Math.random() < FARMING.handCatchChance) { c.bugs = false; s.stats.bugs++; return res(true, 'Bắt được sâu rồi!', [say(at, 'Bắt được! 🐛')], 'pop'); }
        return res(true, 'Con sâu chạy mất, thử lại nhé', [say(at, 'Trượt rồi!', COL.bad)], 'pop');
      case 'fertilize': take(s, 'fertilizer'); c.fert = true; return res(true, 'Đã bón phân', [say(at, '+50% thu hoạch')], 'plant');
      case 'growth':
        take(s, 'growth'); c.boosts++; c.progress += FARMING.growthBoost;
        if (c.progress >= 1 && !c.ripeAt) c.ripeAt = s.time;
        return res(true, 'Cây lớn vọt lên', [say(at, 'Lớn vọt! ⚡')], 'spray');
      case 'harvest': {
        const qty = harvestQty(c), def = CROPS[c.id];
        give(s, c.id, qty); s.stats.harvests++; addExp(s, def.exp);
        p.crop = null; p.soil = 'untilled';
        return res(true, `Thu hoạch ${qty} ${def.name}`, [say(at, `+${qty} ${def.name}`), say({ x: at.x, y: at.y - 10 }, `+${def.exp} EXP`, COL.exp)], 'harvest');
      }
      case 'clear': p.crop = null; p.soil = 'untilled'; return res(true, 'Đã dọn sạch ô đất', [say(at, '🧹')], 'dig');
    }
  },

  lockedPlot(s, t, id, at) {
    const cost = expandCost(unlockedCount(s));
    s.coins -= cost;
    Object.assign(s.plots[t.idx], newPlot(t.idx, true));
    log(s, `Mở rộng thêm một ô đất (${cost} xu)`);
    return res(true, 'Đã mở rộng đất!', [say(at, 'Mở đất mới! 🎉'), say({ x: at.x, y: at.y - 10 }, `-${cost} xu`, COL.coin)], 'coin');
  },

  animal(s, t, id, at) {
    const a = s.animals.find(x => x.id === t.id), def = ANIMALS[a.type], sound = SOUND[a.type];
    switch (id) {
      case 'feed': take(s, def.feed); a.hunger = 100; return res(true, 'Ăn no nê', [say(at, 'Ngon quá! 😋')], 'eat');
      case 'pet': a.happy = Math.min(100, a.happy + HUSBANDRY.petHappy); return res(true, 'Vui quá', [say(at, '❤️')], sound);
      case 'medicine': take(s, 'medicine'); a.sick = false; a.starvingSince = 0; a.hunger = Math.max(a.hunger, 30); return res(true, 'Đã khỏi bệnh', [say(at, 'Khỏe rồi! 💪')], 'spray');
      case 'vitamin':
        take(s, 'vitamin'); a.age += def.grow * HUSBANDRY.vitaminBoost;
        if (a.age >= def.grow) { a.adult = true; a.age = def.grow; a.nextProduct = s.time + def.every; }
        return res(true, 'Lớn vọt lên', [say(at, 'Lớn vọt! ⚡')], 'spray');
      case 'milk': case 'shear': {
        const prod = def.product;
        a.ready = false; a.nextProduct = s.time + def.every; give(s, prod); addExp(s, def.exp);
        return res(true, `Được 1 ${PRODUCTS[prod].name}`, [say(at, `+1 ${PRODUCTS[prod].name}`)], sound);
      }
      case 'sell':
        s.animals.splice(s.animals.indexOf(a), 1); addCoins(s, def.sell);
        return res(true, `Đã bán ${def.name.toLowerCase()} được ${def.sell} xu`, [say(at, `+${def.sell} xu`, COL.coin)], 'coin');
    }
  },

  egg(s, t, id, at) {
    s.eggs.splice(s.eggs.findIndex(e => e.id === t.id), 1);
    give(s, 'trung'); s.stats.eggs++; addExp(s, ANIMALS.ga.exp);
    return res(true, 'Nhặt được 1 quả trứng', [say(at, '+1 Trứng gà')], 'pop');
  },

  poop(s, t, id, at) {
    s.poops.splice(s.poops.findIndex(p => p.id === t.id), 1);
    s.stats.poops++; addExp(s, 2);
    const fert = Math.random() < DOG.poopFertChance;
    if (fert) give(s, 'fertilizer');
    return res(true, fert ? 'Xúc được 1 phân bón' : 'Đã dọn sạch bãi phân', [say(at, fert ? '+1 Phân bón' : '✨ Sạch rồi')], 'dig');
  },

  trough(s, t, id, at) {
    take(s, FEED_OF_PEN[t.pen]);
    s.troughs[t.pen] = Math.min(HUSBANDRY.troughMax, s.troughs[t.pen] + HUSBANDRY.unitsPerBag);
    return res(true, 'Đã đổ cám vào máng', [say(at, `+${HUSBANDRY.unitsPerBag} phần ăn`)], 'eat');
  },

  nest(s, t, id, at) {
    take(s, 'trung'); s.nest.egg = true; s.nest.hatchAt = s.time + HUSBANDRY.nestHatchMs;
    return res(true, 'Đã đặt trứng vào ổ ấp', [say(at, 'Ấp nào! 🥚')], 'pop');
  },

  dog(s, t, id, at) {
    const g = s.dog;
    if (id === 'feed') { take(s, 'dogfood'); g.hunger = 100; return res(true, `${g.name} ăn ngon lành`, [say(at, 'Gâu gâu! 🦴')], 'bark'); }
    g.happy = Math.min(100, g.happy + HUSBANDRY.petHappy);
    return res(true, `${g.name} vẫy đuôi rối rít`, [say(at, '❤️')], 'bark');
  },

  threat(s, t, id, at) {
    const th = s.threats.find(x => x.id === t.id);
    s.threats.splice(s.threats.indexOf(th), 1);
    if (th.kind === 'crow') {
      s.stats.crows++; addExp(s, 1);
      return res(true, 'Quạ hoảng hốt bay đi', [say(at, 'Xù xù! 🪶')], 'crow');
    }
    const coins = rint(...THREATS.thiefCaughtCoins);
    s.stats.thieves++; addCoins(s, coins);
    return res(true, `Bắt được thằng Tèo! Nó xin lỗi và đền ${coins} xu`, [say(at, 'Bắt được! 🧢'), say({ x: at.x, y: at.y - 10 }, `+${coins} xu`, COL.coin)], 'coin');
  },

  building(s, t, id, at) {
    if (id === 'refill') { s.can = canMax(s); return res(true, 'Đã múc đầy bình', [say(at, 'Đầy bình! 💧', '#7ad7ff')], 'water'); }
    if (id === 'enter') return res(true, '', [], 'click', { go: BUILDING_DEFS[t.id].door.to });
    if (id === 'talk') return res(true, TALK[t.id].msg, [], 'click');
    if (id === 'sit') return sitDown(s, at);
    if (id === 'sleep') return res(true, '', [], 'click', { sleep: true });   // main mờ màn hình rồi gọi sleep(s)
    return res(true, '', [], 'click', { open: t.id === 'wardrobe' ? 'house' : t.id });
  },

  deco(s, t, id, at) { return sitDown(s, at); },

  // Chỉ báo ý định sang bản đồ khác (go); main.js mờ màn hình rồi mới gọi enterScene.
  door(s, t) { return res(true, '', [], 'click', { go: t.to }); },
};

function sitDown(s, at) {
  s.sit = true;
  return res(true, 'Ngồi nghỉ một chút', [say(at, 'Hù... 😌')], 'click');
}

// ---------- Chuyển bản đồ ----------
// Đi qua cửa từ bản đồ đang đứng sang bản đồ to: phải có cửa dẫn tới to. Tới nơi thì đứng ở arrive[nơi vừa đi].
export function enterScene(s, to) {
  if (!doorOf(s, to)) return R(false, 'Không có lối sang đó', { reason: 'no_door' });
  if (!hasScene(to)) return R(false, 'Chỗ này chưa mở', { reason: 'unknown' });
  const from = s.scene || 'farm';
  s.scene = to; s.sit = false;
  const m = sceneMap(s), a = m.arrive[from] ?? m.spawn;
  Object.assign(s.player, { x: a.x, y: a.y, dir: a.dir ?? 0 });
  return R(true, '', { scene: to });
}

// ---------- Cửa hàng & kinh tế ----------
const R = (ok, msg, extra) => ({ ok, msg, ...extra });

export function buy(s, itemId, qty = 1) {
  if (!marketOpen(s)) return closed();
  const it = ITEMS[itemId];
  qty = Math.floor(qty);
  if (!it || !(qty > 0)) return R(false, 'Món này không có bán');
  if (level(s) < it.lv) return R(false, `Cần cấp ${it.lv} mới mua được`);
  const cost = it.price * qty;
  if (s.coins < cost) return R(false, 'Chưa đủ xu, cố lên nhé');
  s.coins -= cost; give(s, itemId, qty);
  return R(true, `Đã mua ${qty} ${it.name.toLowerCase()}`);
}

export function buyAnimal(s, type) {
  if (!marketOpen(s)) return closed();
  const def = ANIMALS[type];
  if (!def) return R(false, 'Không có con này');
  if (level(s) < def.lv) return R(false, `Cần cấp ${def.lv} mới mua được`);
  const pen = mapOf(s).pens[def.pen];
  if (!pen) return R(false, `Bạn chưa có ${PEN_DEFS[def.pen].name.toLowerCase()}, xây chuồng trước nhé`);
  if (penCount(s, def.pen) >= PEN_CAP[def.pen]) return R(false, `${pen.name} đã chật rồi`);
  if (s.coins < def.price) return R(false, 'Chưa đủ xu, cố lên nhé');
  s.coins -= def.price;
  const p = penPoint(s, def.pen);
  mkAnimal(s, type, false, p.x, p.y);
  return R(true, `Đã mua ${def.baby.toLowerCase()}`);
}

export function sell(s, itemId, qty = 1) {
  if (!marketOpen(s)) return closed({ coins: 0 });
  if (!CROPS[itemId] && !PRODUCTS[itemId]) return R(false, 'Món này không bán được', { coins: 0 });
  const n = qty === 'all' ? have(s, itemId) : Math.floor(qty);
  if (!(n > 0) || n > have(s, itemId)) return R(false, 'Không đủ hàng để bán', { coins: 0 });
  const coins = n * sellPrice(itemId);
  take(s, itemId, n); addCoins(s, coins);
  return R(true, `Bán ${n} ${itemName(itemId).toLowerCase()} được ${coins} xu`, { coins });
}

export function sellAll(s) {
  if (!marketOpen(s)) return closed({ coins: 0 });
  let coins = 0;
  for (const k of new Set([...Object.keys(s.basket), ...Object.keys(s.inv)])) if (inBasket(k)) coins += sell(s, k, 'all').coins;
  return coins ? R(true, `Bán hết được ${coins} xu`, { coins }) : R(false, 'Giỏ và kho chưa có gì để bán', { coins: 0 });
}

// ---------- Thùng giao hàng ----------
// Bỏ nông sản/sản phẩm vào (lấy giỏ trước, thiếu thì kho); lái buôn chốt lúc 6h sáng, trả SHIP_RATE giá chợ. Lấy lại được tới lúc đó.
export const shipPreview = s => shipValue(s.shipbin.items);
export function shipAdd(s, itemId, qty = 1) {
  if (!inBasket(itemId)) return R(false, 'Món này không bỏ vào thùng được', { moved: 0 });
  const n = qty === 'all' ? have(s, itemId) : Math.floor(qty);
  if (!(n > 0) || n > have(s, itemId)) return R(false, 'Không đủ hàng để bỏ vào thùng', { moved: 0 });
  take(s, itemId, n);
  const it = s.shipbin.items;
  it[itemId] = (it[itemId] || 0) + n;
  return R(true, `Bỏ ${n} ${itemName(itemId).toLowerCase()} vào thùng`, { moved: n });
}
// Lấy lại: về giỏ nếu còn chỗ, phần dư về kho
export function shipTake(s, itemId, qty = 1) {
  const inBin = s.shipbin.items[itemId] || 0;
  const n = Math.min(qty === 'all' ? inBin : Math.floor(qty), inBin);
  if (!(n > 0)) return R(false, 'Thùng không có món này', { moved: 0 });
  drop(s.shipbin.items, itemId, n);
  const toBasket = Math.min(n, Math.max(0, room(s)));
  if (toBasket) give(s, itemId, toBasket);
  if (n > toBasket) s.inv[itemId] = (s.inv[itemId] || 0) + n - toBasket;
  return R(true, `Lấy lại ${n} ${itemName(itemId).toLowerCase()}`, { moved: n });
}
// 6h sáng: lái buôn lấy hết, trả xu. Event 'shipped' để màn "Trong lúc bạn vắng nhà" dùng.
function settleShip(s) {
  const items = s.shipbin?.items;
  if (!items || !Object.keys(items).length) return;
  const coins = shipValue(items);
  s.shipbin.items = {};
  addCoins(s, coins);
  emit({ type: 'shipped', coins, items, t: s.time });
  log(s, `Lái buôn lấy hàng ở thùng giao hàng, trả ${coins} xu`);
  snd('coin');
}
// Vườn chưa có thùng: đặt một thùng ở ô hợp lệ gần nhà kho nhất (qua canPlace nên không chặn đường)
function ensureShipbin(s) {
  const f = s.farm;
  if (f.ents.some(e => e.kind === 'shipbin')) return;
  const ref = f.ents.find(e => e.kind === 'shed') ?? f.ents.find(e => e.kind === 'house');
  const c0 = ref?.c ?? f.owned.c, r0 = ref?.r ?? f.owned.r, cand = [];
  for (let r = f.owned.r; r < f.owned.r + f.owned.h; r++) for (let c = f.owned.c; c < f.owned.c + f.owned.w; c++) cand.push({ c, r, d: Math.hypot(c - c0 - 1, r - r0 - 1) });
  for (const p of cand.sort((a, b) => a.d - b.d || a.r - b.r || a.c - b.c)) {
    if (!canPlace(s, { kind: 'shipbin' }, p.c, p.r).ok) continue;
    f.ents.push({ id: s.nextId++, kind: 'shipbin', c: p.c, r: p.r });
    bumpLayout(s);
    return;
  }
}

// Nhà kho: cất hết nông sản & sản phẩm từ giỏ vào kho
export function stashAll(s) {
  const n = basketCount(s);
  if (!n) return R(false, 'Giỏ đang trống rồi');
  for (const [k, q] of Object.entries(s.basket)) s.inv[k] = (s.inv[k] || 0) + q;
  s.basket = {};
  return R(true, `Đã cất ${n} món vào kho`, { moved: n });
}
// Lấy từ kho ra giỏ (qty 'all' = lấy được bao nhiêu thì lấy, tới khi giỏ đầy)
export function withdraw(s, itemId, qty = 1) {
  if (!inBasket(itemId)) return R(false, 'Món này không bỏ vào giỏ', { moved: 0 });
  const inKho = s.inv[itemId] || 0, n = Math.min(qty === 'all' ? inKho : Math.floor(qty), inKho, Math.max(0, room(s)));
  if (!(n > 0)) return R(false, inKho > 0 ? 'Giỏ đầy rồi' : 'Kho không có món này', { moved: 0 });
  drop(s.inv, itemId, n); give(s, itemId, n);
  return R(true, `Lấy ${n} ${itemName(itemId).toLowerCase()} ra giỏ`, { moved: n });
}

export function buyOutfit(s, slot, index) {
  if (!marketOpen(s)) return closed();
  const list = slot === 'hat' ? HATS : slot === 'acc' ? ACCS : null, it = list?.[index];
  if (!it) return R(false, 'Không có món này');
  if (s.owned[slot].includes(index)) return R(false, 'Bạn đã có món này rồi');
  if (s.coins < it.price) return R(false, 'Chưa đủ xu, cố lên nhé');
  s.coins -= it.price; s.owned[slot].push(index);
  return R(true, `Đã mua ${it.name.toLowerCase()}`);
}

export function setLook(s, look) {
  for (const k of Object.keys(LOOK)) if (Number.isInteger(look[k])) s.look[k] = clamp(look[k], 0, LOOK[k] - 1);
  for (const k of ['hat', 'acc']) if (look[k] !== undefined && s.owned[k].includes(look[k])) s.look[k] = look[k];
  return R(true, 'Đã đổi diện mạo');
}

export function fulfillOrder(s, orderId) {
  const o = s.orders.find(x => x.id === orderId);
  if (!o) return R(false, 'Không thấy đơn hàng này');
  for (const [k, n] of Object.entries(o.items)) if (have(s, k) < n) return R(false, `Chưa đủ ${itemName(k).toLowerCase()} (cần ${n})`);
  for (const [k, n] of Object.entries(o.items)) take(s, k, n);
  addCoins(s, o.coins); addExp(s, o.exp); s.stats.orders++;
  s.orders.splice(s.orders.indexOf(o), 1);
  log(s, `Giao đơn cho ${o.who}, nhận ${o.coins} xu`);
  return R(true, `${o.who} cảm ơn nhé! +${o.coins} xu, +${o.exp} EXP`);
}

export function placeDeco(s, itemId) {
  if (ITEMS[itemId]?.kind !== 'deco' || have(s, itemId) <= 0) return R(false, 'Bạn chưa có món này');
  if (s.scene && s.scene !== 'farm') return R(false, 'Ra vườn rồi hãy đặt nhé');
  const m = mapOf(s), c = Math.floor(s.player.x / TS), r = Math.floor(s.player.y / TS);
  if (m.isSolid(c, r) || m.plotAt(c, r) >= 0) return R(false, 'Chỗ này không đặt được, thử chỗ khác nhé');
  if (m.decos.some(o => o.ent.c === c && o.ent.r === r)) return R(false, 'Chỗ này có đồ rồi');
  take(s, itemId);
  s.farm.ents.push({ id: s.nextId++, kind: 'deco', item: itemId, c, r });
  bumpLayout(s);
  return R(true, `Đã đặt ${ITEMS[itemId].name.toLowerCase()}`);
}

// ---------- Chế độ xây dựng: luật đặt công trình (ADR 0005) ----------
// Mọi lần đặt/dời đều qua canPlace. what: { id } = thực thể đang có (dời), hoặc { kind, pen?, item? } = thực thể mới.
// Kết quả { ok: true } hoặc { ok: false, reason, msg }. Thêm luật mới (vd. số khối ruộng tối đa, ô chưa dọn)
// thì thêm một bước kiểm tra trước bước tìm đường, kèm reason mới.
const SCARED_MS = 6000;
const no = (reason, msg) => ({ ok: false, reason, msg });
const overlaps = (a, b) => a.c < b.c + b.w && b.c < a.c + a.w && a.r < b.r + b.h && b.r < a.r + a.h;
export const canMove = e => !!e && e.kind !== 'tree' && !BUILDING_DEFS[e.kind]?.fixed;
export function entName(e) {
  if (e.kind === 'field') return 'Khối ruộng';
  if (e.kind === 'pen') return PEN_DEFS[e.pen].name;
  if (e.kind === 'deco') return ITEMS[e.item]?.name ?? 'Đồ trang trí';
  if (e.kind === 'tree') return 'Cây';
  return BUILDING_DEFS[e.kind]?.name ?? 'Công trình';
}

// Những chỗ phải đi tới được từ cổng: cửa nhà, chỗ đứng của công trình, cửa chuồng, khối ruộng.
function access(m) {
  const from = m.gateIn ?? m.spawn, out = [];
  const add = (key, name, p) => out.push({ key, name, ok: reachable(m, from, p) });
  const mid = (c, r) => ({ x: c * TS + 8, y: r * TS + 8 });
  for (const b of m.buildings) if (b.at && b.id !== 'gate') add(b.id === 'house' ? 'house' : `b${b.ent.id}${b.id}`, b.name, b.at);
  for (const p of Object.values(m.pens)) add(`p${p.ent.id}`, p.name, mid(...p.gates[0]));
  for (const e of m.fields) add(`f${e.id}`, 'Khối ruộng', mid(e.c + 1, e.r + 1));
  return out;
}

export function canPlace(s, what, c, r) {
  const f = s.farm, old = what.id != null ? f.ents.find(e => e.id === what.id) : null;
  if (what.id != null && !old) return no('missing', 'Không thấy công trình này');
  if (old && !canMove(old)) return no('fixed', `${entName(old)} không dời được`);
  if (!old && what.kind === 'pen' && f.ents.some(x => x.kind === 'pen' && x.pen === what.pen)) return no('exists', `Bạn đã có ${PEN_DEFS[what.pen].name.toLowerCase()} rồi`);
  const e = { ...(old ?? what), c, r }, ft = footprint(e), o = f.owned;
  if (ft.c < o.c || ft.r < o.r || ft.c + ft.w > o.c + o.w || ft.r + ft.h > o.r + o.h) return no('outside', 'Chỗ này ngoài đất của bạn');
  if (f.ents.some(x => x !== old && overlaps(ft, footprint(x)))) return no('overlap', 'Chồng lên công trình khác');
  if (!old && what.kind === 'field' && fieldCount(s) >= fieldLimit(s)) {
    const nx = fieldNextLevel(s);
    return no('max_fields', nx ? `Đã đủ ${fieldLimit(s)} khối ruộng, lên cấp ${nx} để có thêm` : 'Đã đủ số khối ruộng tối đa');
  }
  // Thử bố cục mới: chỗ nào trước đi tới được từ cổng thì sau vẫn phải tới được (cái mới đặt thì phải tới được).
  const before = new Map(access(mapOf(s)).map(t => [t.key, t.ok]));
  const after = access(buildMap({ ...f, ents: old ? f.ents.map(x => (x === old ? e : x)) : [...f.ents, e] }));
  const lost = after.find(t => !t.ok && (before.get(t.key) ?? true));
  if (lost) return no('blocks_path', lost.key === 'house' ? 'Chặn mất đường từ cổng vào nhà' : `Chặn mất đường tới ${lost.name.toLowerCase()}`);
  return { ok: true };
}

// ---------- Đặt đồ mới & cất đồ (chế độ xây dựng) ----------
export const fieldCount = s => s.farm.ents.filter(e => e.kind === 'field').length;
export const fieldLimit = s => FIELD_LIMITS.reduce((n, [lv, k]) => (level(s) >= lv ? k : n), 0);
export const fieldNextLevel = s => FIELD_LIMITS.find(([, k]) => k > fieldLimit(s))?.[0] ?? null;   // cấp để có thêm khối; null = đã tối đa
export const fieldCost = s => (fieldCount(s) < 1 ? 0 : FIELD_PRICES[Math.min(fieldCount(s), FIELD_PRICES.length) - 1]);   // giá khối kế tiếp
export const penLevel = pen => Math.min(...Object.values(ANIMALS).filter(a => a.pen === pen).map(a => a.lv));
// Giá và điều kiện (ngoài chỗ đặt) của món định đặt: xu, cấp, đồ trong túi
export function placeCost(s, what) {
  if (what.kind === 'field') return fieldCost(s);
  if (what.kind === 'pen') return PEN_PRICES[what.pen] ?? 0;
  return 0;
}
export function canAfford(s, what) {
  if (what.kind === 'deco') return have(s, what.item) > 0 ? { ok: true } : no('no_item', 'Bạn chưa có món này');
  if (what.kind === 'pen') {
    if (!PEN_DEFS[what.pen]) return no('missing', 'Không có loại chuồng này');
    if (level(s) < penLevel(what.pen)) return no('level', `Cần cấp ${penLevel(what.pen)} mới xây ${PEN_DEFS[what.pen].name.toLowerCase()} được`);
  } else if (what.kind !== 'field') return no('missing', 'Không đặt được món này');
  return s.coins >= placeCost(s, what) ? { ok: true } : no('coins', 'Chưa đủ xu, cố lên nhé');
}

// Đặt đồ mới ở ô (c, r): khối ruộng/chuồng tốn xu, đồ trang trí lấy từ túi. Qua canPlace nên cùng luật với dời.
export function placeEntity(s, what, c, r) {
  if (s.scene && s.scene !== 'farm') return R(false, 'Ra vườn rồi hãy đặt nhé', { reason: 'scene' });
  if (what.kind === 'deco' && ITEMS[what.item]?.kind !== 'deco') return R(false, 'Món này không đặt được', { reason: 'missing' });
  const chk = canPlace(s, what, c, r);
  if (!chk.ok) return R(false, chk.msg, { reason: chk.reason });
  const aff = canAfford(s, what);
  if (!aff.ok) return R(false, aff.msg, { reason: aff.reason });
  const e = { id: s.nextId++, kind: what.kind, c, r };
  if (what.kind === 'deco') { take(s, what.item); e.item = what.item; }
  else s.coins -= placeCost(s, what);
  if (what.kind === 'pen') e.pen = what.pen;
  if (what.kind === 'field') {
    e.plots = [];
    for (let i = 0; i < FIELD_SIZE * FIELD_SIZE; i++) { e.plots.push(s.plots.length); s.plots.push(newPlot(s.plots.length, true)); }
  }
  s.farm.ents.push(e);
  bumpLayout(s);
  unstick(s);
  return R(true, `Đã đặt ${entName(e).toLowerCase()}`, { id: e.id });
}

// Cất đồ đã đặt: đồ trang trí về túi; khối ruộng chỉ khi chưa có cây (đất đã cuốc thì mất), không cất khối cuối.
// Ô của khối bị gỡ chỉ đánh dấu removed (không xóa khỏi s.plots) để chỉ số ô của các khối còn lại vẫn đúng.
export function storeEntity(s, id) {
  const e = s.farm.ents.find(x => x.id === id);
  if (!e) return R(false, 'Không thấy món này', { reason: 'missing' });
  if (e.kind === 'deco') {
    s.inv[e.item] = (s.inv[e.item] || 0) + 1;
  } else if (e.kind === 'field') {
    if (e.plots.some(i => s.plots[i]?.crop)) return R(false, 'Ruộng còn cây, thu hoạch xong mới cất được', { reason: 'has_crop' });
    if (fieldCount(s) <= 1) return R(false, 'Phải giữ lại ít nhất một khối ruộng', { reason: 'last_field' });
    for (const i of e.plots) s.plots[i] = { idx: i, unlocked: false, removed: true, soil: 'untilled', water: 0, weeds: false, crop: null };
    s.threats = (s.threats ?? []).filter(t => !e.plots.includes(t.plot));
  } else return R(false, `${entName(e)} không cất được`, { reason: 'fixed' });
  s.farm.ents.splice(s.farm.ents.indexOf(e), 1);
  bumpLayout(s);
  return R(true, `Đã cất ${entName(e).toLowerCase()}`);
}

// Ô trống (đi được, trong đất nhà) gần điểm o nhất
function nearestFree(m, o) {
  const c0 = Math.floor(o.x / TS), r0 = Math.floor(o.y / TS);
  for (let d = 1; d < Math.max(m.mw, m.mh); d++) {
    let best = null;
    for (let r = r0 - d; r <= r0 + d; r++) for (let c = c0 - d; c <= c0 + d; c++) {
      if (Math.max(Math.abs(c - c0), Math.abs(r - r0)) !== d || m.isSolid(c, r) || !m.isOwned(c, r)) continue;
      const x = c * TS + 8, y = r * TS + 8, k = Math.hypot(x - o.x, y - o.y);
      if (!best || k < best.k) best = { x, y, k };
    }
    if (best) return { x: best.x, y: best.y };
  }
  return { x: o.x, y: o.y };
}
// Nhân vật, chó đứng trên ô vừa thành ô chắn thì dời ra ô trống gần nhất (hộp chân 10x6)
function unstick(s) {
  const m = mapOf(s);
  const free = o => [[-5, -3], [5, -3], [-5, 3], [5, 3]].every(([dx, dy]) => !m.isSolidPx(o.x + dx, o.y + dy));
  for (const o of [s.player, s.dog]) if (o.x != null && !free(o)) Object.assign(o, nearestFree(m, o));
}

// Dời thực thể id tới ô (c, r). Miễn phí, không giới hạn số lần.
export function moveEntity(s, id, c, r) {
  const chk = canPlace(s, { id }, c, r);
  if (!chk.ok) return R(false, chk.msg, { reason: chk.reason });
  const e = s.farm.ents.find(x => x.id === id), dx = (c - e.c) * TS, dy = (r - e.r) * TS;
  if (!dx && !dy) return R(true, '');
  if (e.kind === 'pen') {   // con vật, trứng trong chuồng đi theo; con vật hoảng một lúc
    const ft = footprint(e), inPen = o => o.x >= ft.c * TS && o.x < (ft.c + ft.w) * TS && o.y >= ft.r * TS && o.y < (ft.r + ft.h) * TS;
    for (const a of s.animals) if (ANIMALS[a.type].pen === e.pen && a.x != null) { a.x += dx; a.y += dy; a.scaredUntil = s.time + SCARED_MS; }
    for (const o of s.eggs) if (o.x != null && inPen(o)) { o.x += dx; o.y += dy; }
  }
  e.c = c; e.r = r;
  bumpLayout(s);
  unstick(s);
  return R(true, `Đã dời ${entName(e).toLowerCase()}`);
}

// Chụp lại bố cục + vị trí lúc vào chế độ xây dựng; restoreLayout trả về đúng như cũ (nút Hủy).
const posMap = list => Object.fromEntries((list ?? []).map(o => [o.id, o.scaredUntil != null ? { x: o.x, y: o.y, scaredUntil: o.scaredUntil } : { x: o.x, y: o.y }]));
export function snapLayout(s) {
  return structuredClone({ farm: s.farm, player: { x: s.player.x, y: s.player.y }, dog: { x: s.dog.x, y: s.dog.y }, animals: posMap(s.animals), eggs: posMap(s.eggs),
    // xu, đồ trong túi, ô ruộng: đặt/cất đồ mới đổi cả những thứ này
    coins: s.coins, deco: Object.fromEntries(Object.entries(s.inv).filter(([k]) => ITEMS[k]?.kind === 'deco')), plots: s.plots });
}
export function restoreLayout(s, snap) {
  s.farm = structuredClone(snap.farm);
  s.coins = snap.coins;
  for (const k of Object.keys(s.inv)) if (ITEMS[k]?.kind === 'deco') delete s.inv[k];
  Object.assign(s.inv, snap.deco);
  s.plots.length = Math.min(s.plots.length, snap.plots.length);   // bỏ ô của khối mới đặt; ô của khối đã cất thì trả lại
  snap.plots.forEach((p, i) => { if (s.plots[i]?.removed && !p.removed) s.plots[i] = structuredClone(p); });
  Object.assign(s.player, snap.player); Object.assign(s.dog, snap.dog);
  for (const k of ['animals', 'eggs']) for (const o of s[k] ?? []) {
    const p = snap[k][o.id];
    if (p) { delete o.scaredUntil; Object.assign(o, p); }
  }
}

export function selectSeed(s, cropId) {
  if (!CROPS[cropId]) return false;
  s.selectedSeed = cropId;
  return true;
}
