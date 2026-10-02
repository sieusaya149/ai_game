// Mô hình dữ liệu + luật chơi. Thuần JS, không DOM (localStorage có bọc try/catch).
import {
  DAY_MS, NIGHT_FROM, MAX_CATCHUP_MS, GRID, START_PLOTS, CROPS, CROP_STAGES, OVERRIPE, FARMING,
  ANIMALS, PEN_TABLE, PEN_LEVELS, HUSBANDRY, DIRT, MANURE, DOG, THREATS, ITEMS, PRODUCTS, LOOK, HATS, ACCS, DEFAULT_LOOK, START, MARKET, STAMINA, TOOLS, TOOL_MAX, TOOL_LEVEL, GROUP_COST,
  expandCost, expandLevel, FIELD_LIMITS, FIELD_PRICES, PEN_PRICES, levelInfo, ORDERS, NOTIFY_CATS, ACHIEVEMENTS, itemName, sellPrice, shipValue,
  LAND_STRIP, LAND_STRIPS, DIR_NAME, CLUTTER, CLUTTER_RATE,
  LIFE, STAGES, STAGE_NAME, STAGE_CAN, AGING, WEIGHT, stageStart, stageAt, lifeEnd, weightAt, BOND, TRADE, pigKgPrice, BREED, animalPrice, FREE, SICK, VET_ITEMS, PREDATOR,
  TRICKS, TRICK_BASE, TRAIN, CO_UT_QUEST,
} from './data.js';
import { TS, GROUND, PEN_DEFS, BUILDING_DEFS, FIELD_SIZE, tileHash } from './layout.js';
import { mapOf, reachable, bumpLayout, footprint, buildMap, sceneMap, hasScene, troughOf } from './farm.js';
import { migrate, newFarm, fillAnimal } from './migrate.js';
import { now } from './clock.js';

export { animalPrice, levelInfo, mapOf, reachable, footprint, sceneMap, stageStart, stageAt, lifeEnd };
export const SAVE_KEY = 'nongtrai-save-v3';
// Bản cũ: đọc được để chuyển, không bao giờ ghi đè hay xóa. Mỗi bản có cờ riêng "đã chuyển (hoặc đã chơi lại từ đầu)"
// để không đọc lại nữa; đọc lần lượt v3 → v2 → v1.
const OLD_KEYS = [['nongtrai-save-v2', 'nongtrai-migrated-v3'], ['nongtrai-save-v1', 'nongtrai-migrated']];
const MARKS = OLD_KEYS.map(([, m]) => m);
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
const SOUND = { ga: 'cluck', vit: 'quack', heo: 'oink', bo: 'moo', cuu: 'baa' };
const ICON = { ga: '🐔', vit: '🦆', heo: '🐷', bo: '🐮', cuu: '🐑' };

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

// Điểm ngẫu nhiên trong chuồng: đúng chuồng id nếu có, không thì chuồng đầu tiên của loại
const penPoint = (s, type, id) => { const m = mapOf(s), a = (m.penById[id] ?? m.pens[type]).area; return { x: a.x + rnd(0, a.w), y: a.y + rnd(0, a.h) }; };

// ---------- Chuồng nhiều cái, 3 cấp (PEN_TABLE) ----------
// Mỗi con vật ở một chuồng (a.pen = id thực thể chuồng): chuồng đúng loài của nó, hoặc chuồng cách ly (nhận mọi loài).
// Bản lưu cũ / con mới sinh chưa có a.pen thì settlePens xếp vào chuồng cùng loại còn chỗ (hết chỗ thì chuồng đầu, không đuổi con nào ra).
const penEnts = (s, type) => s.farm.ents.filter(e => e.kind === 'pen' && e.pen === type);
export const penLv = e => e.lv ?? 1;
export const penCapOf = e => PEN_TABLE[e.pen].cap[penLv(e) - 1];
export const penUse = (s, id) => s.animals.filter(a => a.pen === id).length;
function settlePens(s) {
  const pens = s.farm.ents.filter(e => e.kind === 'pen');
  const home = a => { const e = pens.find(x => x.id === a.pen); return !!e && (e.pen === 'quarantine' || e.pen === ANIMALS[a.type].pen); };
  for (const a of s.animals) if (!home(a)) {
    const list = pens.filter(e => e.pen === ANIMALS[a.type].pen);
    a.pen = (list.find(e => penUse(s, e.id) < penCapOf(e)) ?? list[0])?.id ?? null;
  }
}
const roomyPen = (s, type) => { settlePens(s); return penEnts(s, type).find(e => penUse(s, e.id) < penCapOf(e)) ?? null; };
// Số con đang nuôi / sức chứa gộp của mọi chuồng loại type (chuồng cách ly là loại riêng)
export function penCount(s, type) { settlePens(s); const ids = penEnts(s, type).map(e => e.id); return s.animals.filter(a => ids.includes(a.pen)).length; }
export const penCap = (s, type) => penEnts(s, type).reduce((n, e) => n + penCapOf(e), 0);
const typeFree = (s, type) => Math.max(0, penCap(s, type) - penCount(s, type));
// Chuồng của con vật trên bản đồ vườn (cho WORLD đi lại)
export function animalPen(s, a) {
  const m = mapOf(s);
  if (!m.penById[a.pen]) settlePens(s);
  return m.penById[a.pen] ?? m.pens[ANIMALS[a.type].pen] ?? null;
}
const isRipe = p => p.crop && !p.crop.dead && !p.crop.rotten && p.crop.progress >= 1;
const nextPoopAt = s => s.time + rnd(...DOG.poopEvery) * (s.dog?.stage === 'non' ? DOG.poopPupMul : 1);   // chó con ỉa nhiều hơn

// Con vật mới ở đầu giai đoạn `stage`. Các trường còn lại lấy mặc định của bản lưu v3 (migrate.js animalDefaults).
function mkAnimal(s, type, stage, x, y, extra) {
  const an = fillAnimal({ id: s.nextId++, type, stage, age: stageStart(type, stage), nextProduct: s.time + ANIMALS[type].every, x, y, ...extra });
  s.animals.push(an);
  return an;
}

// ---------- Đực/cái, sinh sản, tên, phả hệ (issue 36) ----------
const isAdult = a => a.stage === 'truong' || a.stage === 'gia';
const roosters = (s, sp = 'ga') => s.animals.filter(a => a.type === sp && a.sex === 'm' && isAdult(a));
// Gia cầm đẻ trứng chung chuồng gà: loài nào đẻ ra trứng loài đó (trứng cũ không ghi `sp` là trứng gà)
const POULTRY = ['ga', 'vit'], EGG_OF = { ga: ['trung', 'trung_phoi'], vit: ['trung_vit', 'trung_vit_phoi'] };
const eggSp = e => e?.sp ?? 'ga';
const ref = a => (a ? { id: a.id, name: a.name } : null);
const babyName = (type, mom) => (mom?.name ? `${mom.name.replace(/ con$/, '')} con`.slice(0, BREED.nameMax) : ANIMALS[type].baby);
// Con mới sinh/nở: giới tính 50/50, tên theo mẹ, nhớ cha mẹ (mom/dad = { id, name } hoặc null)
function newborn(s, type, mom, dad, x, y, pen) {
  return mkAnimal(s, type, 'non', x, y, { pen, sex: Math.random() < 0.5 ? 'm' : 'f', name: babyName(type, mom), mom: mom ?? null, dad: dad ?? null });
}
// Chuồng cho con mới: chuồng của mẹ nếu còn chỗ, không thì chuồng còn chỗ khác
function bornPen(s, mom, type) {
  const e = s.farm.ents.find(x => x.id === mom?.pen);
  return e && penUse(s, e.id) < penCapOf(e) ? e.id : roomyPen(s, ANIMALS[type].pen)?.id;
}
const penTypeOf = (s, a) => s.farm.ents.find(e => e.id === a.pen)?.pen;
const fitToBreed = a => animalCan(a, 'product') && !a.sick && a.hunger > HUSBANDRY.growNeedsHunger && a.happy > 40;
// Lý do con vật chưa sinh sản được dù đủ cặp: 'Chuồng đầy' | null
export function breedNote(s, a) {
  if (!['heo', 'bo', 'cuu'].includes(a.type) || a.sex !== 'f' || penTypeOf(s, a) === 'quarantine' || !fitToBreed(a)) return null;
  const mate = s.animals.some(m => m.type === a.type && m.sex === 'm' && m.pen === a.pen && fitToBreed(m));
  return mate && typeFree(s, ANIMALS[a.type].pen) <= 0 ? 'Chuồng đầy' : null;
}
// Đổi tên: bỏ khoảng trắng thừa; từ chối tên rỗng hoặc dài hơn BREED.nameMax
export function renameAnimal(s, id, name) {
  const a = s.animals.find(x => x.id === id);
  if (!a) return R(false, 'Không thấy con vật này', { reason: 'missing' });
  const n = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (!n) return R(false, 'Tên không được để trống', { reason: 'empty' });
  if (n.length > BREED.nameMax) return R(false, `Tên dài quá, tối đa ${BREED.nameMax} chữ`, { reason: 'long' });
  a.name = n;
  for (const o of s.animals) for (const k of ['mom', 'dad']) if (o[k]?.id === id) o[k].name = n;   // phả hệ theo tên mới
  return R(true, `Đã đặt tên ${n}`, { id });
}
// Phả hệ của con vật: cha, mẹ (còn sống hay không đều có tên), các con còn trong trại
export function pedigree(s, id) {
  const a = s.animals.find(x => x.id === id);
  if (!a) return null;
  return { id, name: a.name, sex: a.sex, mom: a.mom, dad: a.dad, kids: s.animals.filter(o => o.mom?.id === id || o.dad?.id === id).map(o => ({ id: o.id, name: o.name, sex: o.sex })) };
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
    v: 3, name, look: lk, owned, coins: START.coins, exp: 0,
    time: 0, speed: 1, day: 1, weather: 'sun', savedAt: now(),
    simMs: 0, frozenMs: 0, frozenTotal: 0,   // giờ vườn đã chạy · khoảng đóng băng lần mở gần nhất · tổng đóng băng
    farm: nf.farm, scene: 'farm',     // scene: bản đồ đang đứng; player.x/y tính theo bản đồ đó
    player: { x: 0, y: 0, dir: 0 }, stamina: STAMINA.max, sit: false, can: FARMING.canMax, selectedSeed: 'cai',
    tools: Object.fromEntries(Object.keys(TOOLS).map(k => [k, { lv: 1 }])), smith: null,   // smith: { tool, doneAt } công cụ đang nằm lò rèn
    inv: { ...START.items }, basket: {},   // inv = kho, basket = giỏ
    shipbin: { items: {} },   // thùng giao hàng: lái buôn lấy hết lúc 6h sáng
    plots: Array.from({ length: nf.plotCount }, (_, i) => newPlot(i, true)),
    animals: [], troughs: { chicken: 0, pig: 0, pasture: 0 }, manure: { chicken: 0, pig: 0, pasture: 0 }, eggs: [], clutch: [], nest: { egg: false, hatchAt: 0, sp: null, mom: null, dad: null },
    dog: {
      stage: START.dogStage, age: stageStart('cho', START.dogStage), hunger: 100, happy: 60, x: 0, y: 0, nextPoop: 0, name: DOG.name,
      tricks: {}, trainDay: 0, session: null, cmd: null, herdDay: 0, scene: 'farm',   // dạy lệnh và lệnh đang thi hành (issue 45)
    },
    poops: [], threats: [], preds: [], orders: [], nextOrderAt: 0,
    stats: { harvests: 0, bugs: 0, eggs: 0, poops: 0, slips: 0, piglets: 0, hatches: 0, orders: 0, thieves: 0, crows: 0, rats: 0, preds: 0, earned: 0, planted: 0, shipped: 0, bought: 0, slept: 0 },
    achievements: {}, log: [], tutorial: 0, nextId: nf.nextId,
    notify: {},   // loại thông báo 🟡 đã tắt: { ripe: false }; thiếu = bật. Mức 🔴 không tắt được
    coUtQuest: null,   // nhiệm vụ làm quen của Cô Út (issue 48): { step } sau khi mua con heo đầu tiên
  };
  const m = mapOf(s);
  Object.assign(s.player, m.spawn);
  Object.assign(s.dog, m.dogHome);
  s.dog.nextPoop = nextPoopAt(s);
  for (const a of START.animals) { const p = penPoint(s, ANIMALS[a.type].pen); mkAnimal(s, a.type, a.stage, p.x, p.y, { sex: a.sex }); }
  settlePens(s);
  evq = [];
  return s;
}

export function saveGame(s) {
  try { s.savedAt = now(); localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* không có localStorage */ }
}
export function resetGame() {
  try { localStorage.removeItem(SAVE_KEY); for (const m of MARKS) localStorage.setItem(m, '1'); } catch { /* bỏ qua */ }
}

// Lý do lần loadGame gần nhất không đọc được bản lưu (null = không có bản lưu nào, không phải lỗi).
let problem = null;
export const loadProblem = () => problem;

function readSave() {
  problem = null;
  const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
  // Đã chuyển bản cũ một lần (hoặc đã chơi lại từ đầu) thì không đọc bản cũ nữa.
  const keys = [SAVE_KEY, ...OLD_KEYS.filter(([, m]) => !read(m)).map(([k]) => k)];
  for (const key of keys) {
    const raw = read(key);
    if (raw == null) continue;
    try {
      const s = migrate(JSON.parse(raw));
      if (key !== SAVE_KEY) {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); for (const m of MARKS) localStorage.setItem(m, '1'); } catch { /* bỏ qua */ }
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
  s.manure = { ...base.manure, ...s.manure };
  for (const k of ['owned', 'achievements', 'inv', 'basket', 'nest', 'dog', 'player']) s[k] = { ...base[k], ...s[k] };
  for (const k of ['animals', 'eggs', 'clutch', 'poops', 'threats', 'preds', 'orders', 'log']) s[k] ||= [];
  s.shipbin = { items: Object.fromEntries(Object.entries(s.shipbin?.items ?? {}).filter(([k, n]) => (CROPS[k] || PRODUCTS[k]) && n > 0)) };
  ensureShipbin(s);   // vườn cũ chưa có thùng: thêm một thùng cạnh nhà kho
  settlePens(s);      // con vật chưa có chuồng (bản cũ): xếp vào chuồng cùng loại
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
  s.coUtQuest ??= null;   // bản lưu cũ chưa có nhiệm vụ làm quen của Cô Út (issue 48)
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
  for (const [name, n] of count(events, 'oldSoon')) out.push(`${n} con ${lc(name)} sắp già 👵`);
  for (const [name, n] of count(events, 'passed')) out.push(`${n} con ${lc(name)} đã già và ra đi thanh thản 😇`);
  const n = type => events.filter(e => e.type === type).length;
  if (n('crow')) out.push(`Quạ đã ăn mất ${n('crow')} cây`);
  if (n('thief')) out.push(`Thằng Tèo đã hái trộm ${n('thief')} cây`);
  if (n('ratFeed')) out.push(`Chuột đã ăn mất ${n('ratFeed')} phần cám`);
  if (n('ratEgg')) out.push(`Chuột đã trộm mất ${n('ratEgg')} quả trứng`);
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
// Đã qua chạng vạng (18h) chưa: mốc gà vịt thôi thả rông mà về chuồng, cũng là lúc cửa chuồng có biển "đã về" và rải thóc được (issue 42)
export const isDusk = s => dayFrac(s) >= FREE.duskAt;
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
  s.stats.slept++;
  evq.push(...ev);
  advanceTutorial(s);
  return R(true, 'Chào buổi sáng! Thể lực đã đầy ☀️', { slept: true });
}

// ---------- Hướng dẫn người mới ----------
// Mỗi bước xong khi việc tương ứng đã làm (tính theo số đếm tích lũy nên làm trước thứ tự vẫn được tính). s.tutorial = số bước đã qua; >= TUTORIAL.length là xong.
export const TUTORIAL = [
  { id: 'till', done: s => s.plots.some(p => p.soil === 'tilled' || p.crop) || s.stats.planted >= 1 },
  { id: 'plant', done: s => s.stats.planted >= 1 || s.plots.some(p => p.crop) },
  { id: 'water', done: s => s.plots.some(p => p.crop && p.water > 0) || s.stats.harvests >= 1 },
  { id: 'harvest', done: s => s.stats.harvests >= 1 },
  { id: 'ship', done: s => s.stats.shipped >= 1 },
  { id: 'buy', done: s => s.stats.bought >= 1 || s.stats.slept >= 1 },
  { id: 'sleep', done: s => s.stats.slept >= 1 },
];
// Đẩy bước lên theo việc đã làm; true nếu có đổi. Gọi sau mỗi hành động liên quan (perform, shipAdd, buy, sleep) và mỗi lần vẽ HUD.
export function advanceTutorial(s) {
  const was = Number.isFinite(s.tutorial) ? s.tutorial : 0;
  let step = was;
  while (step < TUTORIAL.length && TUTORIAL[step].done(s)) step++;
  s.tutorial = step;
  return step !== was;
}

// "Bản mới có gì đổi": chỉ cho save chuyển từ v1, xem một lần (đánh dấu trong save)
export const WHATS_NEW_VERSION = 2;
export const whatsNewDue = s => s.migratedFrom === 1 && (s.seenWhatsNew || 0) < WHATS_NEW_VERSION;
export const markWhatsNew = s => { s.seenWhatsNew = WHATS_NEW_VERSION; };

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
  for (const a of s.animals ?? []) if (a.sick >= 2) out.push({ key: 'sick:' + a.id, kind: 'sick', x: a.x, y: a.y, text: `${ANIMALS[a.type].name} ${a.sick >= 3 ? 'nguy kịch' : 'bệnh nặng'}!` });
  // kẻ săn mồi sắp ra tay: luật báo trước PREDATOR.warnMs (10 giây), đuổi kịp thì không ai bị hại
  for (const p of predWarning(s)) out.push({ key: 'pred:' + p.id, kind: p.kind, x: p.x, y: p.y, text: `${PRED_NAME[p.kind]} đang rình, đuổi ngay!` });
  for (const a of hurtAnimals(s)) out.push({ key: 'hurt:' + a.id, kind: 'hurt', x: a.x, y: a.y, text: `${ANIMALS[a.type].name} bị chuột cắn, cần băng bó!` });
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
    if (!catchUp) cockCrow(s);
    toast({ sun: 'Trời nắng đẹp ☀️', cloud: 'Trời nhiều mây ⛅', rain: 'Trời mưa rồi, ruộng tự có nước 🌧️' }[s.weather]);
  }
  if (s.sit) {   // ngồi ghế đá: hồi chậm, đầy thì tự đứng dậy
    s.stamina = Math.min(STAMINA.max, s.stamina + STAMINA.benchPerMin * d / MIN);
    if (s.stamina >= STAMINA.max) { s.sit = false; toast('Khỏe re rồi, làm tiếp thôi 💪'); }
  }
  if (s.smith && s.time >= s.smith.doneAt) finishUpgrade(s);
  for (const p of s.plots) if (p.unlocked) stepPlot(s, p, d);
  stepFree(s, d);
  stepAnimals(s, d);
  stepManure(s, d);
  stepEggs(s);
  stepDog(s, d);
  stepPreds(s, d);
  if (!catchUp) stepThreats(s, d);
  stepOrders(s);
  checkAch(s);
}

// 6h sáng: gà trống trưởng thành gáy (chữ bay, tiếng, event cho bong bóng); chạy bù không gáy
function cockCrow(s) {
  const list = roosters(s).filter(r => !r.sick);
  list.forEach((r, i) => { fxEv(r.x, r.y - 10, 'Ò ó o o! 🐓', COL.coin); emit({ type: 'cockcrow', id: r.id }); if (!i) snd('cockcrow'); });
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

// ---------- Vòng đời ----------
// Việc con vật làm được ở giai đoạn hiện tại: 'product' | 'plow' | 'sell' | 'vitamin' (bảng STAGE_CAN)
export function animalCan(a, what) {
  if (what === 'product' && a.retired) return false;   // nghỉ hưu: không cho sản phẩm
  const t = STAGE_CAN[what];
  return !!t && (t[a.type] ?? t.all ?? []).includes(a.stage);
}
// Tên giai đoạn cho người chơi: 'Non', 'Nhỡ', 'Trưởng thành', 'Già'
export const stageName = a => STAGE_NAME[a?.stage] ?? '';
// Chữ hiện khi chạm vào con vật: "Gà ♀ · Nhỡ"
export const animalLabel = a => `${a.name || ANIMALS[a.type]?.name || 'Vật nuôi'} ${a.sex === 'm' ? '♂' : '♀'} · ${stageName(a)}`;
// Chu kỳ ra sản phẩm theo giai đoạn: con già đẻ thưa, ít sữa, lông mỏng
const productEvery = a => ANIMALS[a.type].every * (a.stage === 'gia' ? AGING.oldEvery : 1);

// ---------- Độ thân ❤️ ----------
// a.bond = số tim 1..5 (nguồn sự thật), a.bondXp = điểm ẩn trong tim hiện tại (0..perHeart).
function bondShift(a, pts) {
  a.bondXp = (a.bondXp || 0) + pts;
  while (a.bondXp >= BOND.perHeart && a.bond < 5) { a.bond++; a.bondXp -= BOND.perHeart; }
  while (a.bondXp < 0 && a.bond > 1) { a.bond--; a.bondXp += BOND.perHeart; }
  a.bondXp = clamp(a.bondXp, 0, BOND.perHeart);
}
// Cộng độ thân vì `reason` ('feed' | 'pet' | 'bath' | 'cure'). Mỗi cách chỉ tính tối đa BOND.perDay lần mỗi ngày game.
// Trả về số điểm được cộng (0 nếu hết lượt hôm nay). Lát tắm (37) và chữa bệnh (38) gọi hàm này.
export function addBond(s, a, reason) {
  const pts = BOND.gain[reason];
  if (!pts) return 0;
  if (a.bondDay?.day !== s.day) a.bondDay = { day: s.day };
  if (reason === 'pet' && a.petLast !== s.day) { a.petStreak = a.petLast === s.day - 1 ? (a.petStreak || 0) + 1 : 1; a.petLast = s.day; }
  const n = a.bondDay[reason] || 0;
  if (n >= BOND.perDay[reason]) return 0;
  a.bondDay[reason] = n + 1;
  bondShift(a, pts);
  return pts;
}
// Luật theo mức tim (world.js dùng để diễn hoạt): chạy lại khi người chơi tới gần ❤️4+, đi theo người chơi ❤️5
export const bondPerk = a => ({ runTo: a.bond >= 4, follow: a.bond >= 5 });
// Hệ số nguy cơ bệnh theo độ thân (lát 38 nhân vào xác suất bệnh)
export const sickFactor = a => (a.bond >= 4 ? BOND.sickMul : 1);
// Mốc già và mốc ra đi của con này (❤️5 sống lâu hơn 10%)
export function lifeMarks(a) {
  const k = a.bond >= 5 ? BOND.lifeMul : 1;
  return { gia: stageStart(a.type, 'gia') * k, end: lifeEnd(a.type) * k };
}
// Xác suất sản phẩm được sao (sữa ngon, lông xoăn): ❤️3+ tốt hơn; bò được vuốt ve nhiều ngày liền, cừu đang vui thì thêm
export function starChance(s, a) {
  const B = BOND.star;
  let p = B.base + (a.bond >= 3 ? B.heart3 : 0);
  if (a.type === 'bo' && a.petLast >= s.day - 1) p += B.petStreak * Math.min(a.petStreak || 0, B.petStreakMax);
  if (a.type === 'cuu' && a.happy >= B.sheepHappy) p += B.sheepBonus;
  return Math.min(1, p);
}

// Bước sang giai đoạn mới (theo tuổi). Trả về false nếu con vật đã ra đi vì già.
function ageUp(s, a, kind, def) {
  const m = lifeMarks(a);
  let st = stageAt(kind, a.age);
  if (st === 'gia' && a.stage !== 'gia' && a.age < m.gia) st = 'truong';   // ❤️5: già đến muộn hơn
  if (st !== a.stage) {
    a.stage = st;
    const nm = def.name.toLowerCase();
    if (st === 'nho') { log(s, `${def.baby} đã lớn thành ${nm} nhỡ`); fxEv(a.x, a.y, 'Lớn rồi! ✨', COL.good); }
    if (st === 'truong') { log(s, `${def.name} đã trưởng thành`); fxEv(a.x, a.y, 'Trưởng thành! ✨', COL.good); if (def.every) a.nextProduct = s.time + productEvery(a); }
    if (st === 'gia') { log(s, `${def.name} đã già, đẻ thưa và hay ngủ hơn`); fxEv(a.x, a.y, 'Già rồi 👵', COL.info); }
  }
  return a.age < m.end;
}
// Hết giai đoạn già: ra đi thanh thản, hóa thiên thần bay lên (mộ ở lát sau). Được phép cả lúc chạy bù (ADR 0004).
function passAway(s, a, def) {
  s.animals.splice(s.animals.indexOf(a), 1);
  emit({ type: 'passed', animal: def.name, id: a.id, kind: a.type, sex: a.sex, x: a.x, y: a.y });
  spawnEv('angel', a.x, a.y);
  fxEv(a.x, a.y, 'Lên trời rồi 😇', COL.info);
  log(s, `${def.name} đã già và ra đi thanh thản, hóa thiên thần bay lên trời 😇`);
  leaveGrave(s, a);
}

// ---------- Ngôi mộ (issue 38) ----------
// Thực thể { kind: 'grave', c, r, animal: loài, name?: tên (chỉ con ❤️4+), flower: đã đặt hoa } ở ô trống gần góc Tây-Nam của đất.
// Qua canPlace nên cùng luật đặt/dời như mọi công trình (không chặn đường, không chồng đồ).
function graveSpot(s) {
  const o = s.farm.owned, hx = o.c, hy = o.r + o.h - 1, cand = [];
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) cand.push({ c, r, d: Math.hypot(c - hx, r - hy) });
  cand.sort((a, b) => a.d - b.d);
  for (const t of cand) if (canPlace(s, { kind: 'grave' }, t.c, t.r).ok) return t;
  return null;
}
function leaveGrave(s, a) {
  grieve(s);
  const t = graveSpot(s);
  if (!t) return null;
  const e = { id: s.nextId++, kind: 'grave', c: t.c, r: t.r, animal: a.type, flower: false };
  if (a.bond >= 4 && a.name) e.name = a.name;
  s.farm.ents.push(e);
  bumpLayout(s);
  emit({ type: 'grave', id: e.id });
  return e;
}
// Có con mất: cả trại buồn một lúc (vui tụt, không lên quá griefCap tới khi hết buồn)
function grieve(s) {
  for (const x of s.animals) x.happy = Math.max(0, x.happy - SICK.griefHappy);
  s.grief = { until: s.time + SICK.griefMs };
}
export const grieving = s => !!s.grief && s.time < s.grief.until;
export const graves = s => s.farm.ents.filter(e => e.kind === 'grave');
// Đặt hoa (Chậu hoa trong kho) lên mộ: cả trại hết buồn nhanh hơn (phần buồn còn lại co lại)
export function placeFlower(s, graveId) {
  const g = s.farm.ents.find(e => e.id === graveId && e.kind === 'grave');
  if (!g) return R(false, 'Không thấy ngôi mộ', { reason: 'missing' });
  if (g.flower) return R(false, 'Mộ đã có hoa rồi', { reason: 'done' });
  if (!take(s, 'deco_flower')) return R(false, 'Cần một chậu hoa (mua ở chợ)', { reason: 'no_item' });
  g.flower = true;
  if (grieving(s)) s.grief.until = s.time + (s.grief.until - s.time) * SICK.flowerGriefMul;
  bumpLayout(s);
  return R(true, 'Đã đặt hoa lên mộ, cả trại đỡ buồn hơn 🌸');
}

// ---------- Thả rông ban ngày (ADR 0013) ----------
// Luật quyết định theo ô: a.tile = { c, r } ô con vật đang đứng (null = trong chuồng). world.js chỉ diễn hoạt tới ô đó.
// Vùng đi lại = ô trong đất, tới được từ nhà, không phải chuồng và không bị hàng rào thấp chắn (ngoài cổng, trong nhà không tính).
const roamCache = new WeakMap();
export function roamOf(s) {
  const f = s.farm, hit = roamCache.get(f);
  if (hit && hit.rev === f.rev) return hit;
  const m = mapOf(s), fence = new Set(m.decos.filter(d => d.kind === 'deco_lowfence').map(d => d.ent.c + ',' + d.ent.r));
  const pen = (c, r) => m.penList.some(p => c >= p.rect.c && r >= p.rect.r && c < p.rect.c + p.rect.w && r < p.rect.r + p.rect.h);
  const ok = (c, r) => m.isOwned(c, r) && !m.isSolid(c, r) && !pen(c, r) && !fence.has(c + ',' + r);
  const seen = new Set(), tiles = [], q = [[Math.floor(m.spawn.x / TS), Math.floor(m.spawn.y / TS)]];
  if (ok(...q[0])) seen.add(q[0].join(','));
  for (let h = 0; h < q.length; h++) {
    const [c, r] = q[h]; tiles.push({ c, r });
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = (c + dc) + ',' + (r + dr);
      if (!seen.has(k) && ok(c + dc, r + dr)) { seen.add(k); q.push([c + dc, r + dr]); }
    }
  }
  tiles.sort((a, b) => a.r - b.r || a.c - b.c);
  const out = { rev: f.rev, tiles, has: (c, r) => seen.has(c + ',' + r) };
  roamCache.set(f, out);
  return out;
}
const canRoam = (s, a) => FREE.types.includes(a.type) && !a.sick && s.farm.ents.find(e => e.id === a.pen)?.pen !== 'quarantine';
// Vịt mẹ của một vịt con: vịt mái trưởng thành gần nhất đang ở ngoài vườn (vịt con bám ô của mẹ, đi thành hàng)
const duckMom = (s, a) => (a.type === 'vit' && a.stage === 'non'
  ? s.animals.filter(m => m.type === 'vit' && m.sex === 'f' && (m.stage === 'truong' || m.stage === 'gia') && m.tile)
    .sort((u, v) => Math.hypot(u.x - a.x, u.y - a.y) - Math.hypot(v.x - a.x, v.y - a.y))[0] : null);
const tileMid = t => ({ x: t.c * TS + 8, y: t.r * TS + 8 });
// Về chuồng: bỏ ô, đứng lại trong chuồng
function goHome(s, a) {
  a.tile = null;
  const pen = animalPen(s, a);
  if (pen) { const p = penPoint(s, ANIMALS[a.type].pen, pen.id); a.x = p.x; a.y = p.y; }
}
// Mổ ruộng ở ô (c, r): con nhỡ trở lên ăn sâu (có lợi); 5% lần mổ mất hạt vừa gieo
function peck(s, a, c, r) {
  const i = mapOf(s).plotAt(c, r), p = i >= 0 ? s.plots[i] : null, k = p?.crop;
  if (!k || k.dead || k.rotten || a.stage === 'non') return;
  const at = plotCenter(s, i);
  if (k.bugs) { k.bugs = false; s.stats.pecks = (s.stats.pecks || 0) + 1; fxEv(at.x, at.y, 'Gà mổ sâu 🐛', COL.good); }
  if (stageOf(k) === 0 && Math.random() < FREE.seedLoss) { p.crop = null; fxEv(at.x, at.y, 'Gà ăn mất hạt 🌱', COL.bad); log(s, 'Gà mổ mất hạt vừa gieo'); }
}
// Chạng vạng (một lần mỗi đêm): phần lớn con thả rông tự về chuồng, vài con lạc ngủ ngoài (a.stray). Không ai chết vì ngủ ngoài (ADR 0004).
// Dễ lạc: ❤️ thấp, con non, con ở xa cửa chuồng. Đêm mưa bão cả đàn tán loạn, lạc nhiều hơn hẳn.
function dusk(s) {
  s.duskDay = s.day;
  const cand = s.animals.filter(a => a.tile && canRoam(s, a));
  if (!cand.length) return;
  const n = cand.length, [lo, hi] = FREE.strayPerDusk;
  let k = s.weather === 'rain' ? Math.max(FREE.stormMin, Math.round(n * FREE.stormShare)) : Math.min(rint(lo, hi), Math.max(1, Math.ceil(n / 2)));
  k = Math.min(k, n);
  const weight = a => {
    const g = animalPen(s, a)?.gates[0], far = g ? Math.max(Math.abs(a.tile.c - g[0]), Math.abs(a.tile.r - g[1])) : 0;
    return (1 + (5 - (a.bond || 1)) * 0.5) * (a.stage === 'non' ? 2 : a.stage === 'nho' ? 1.5 : 1) * (1 + far / 8);
  };
  for (; k > 0; k--) {
    const w = cand.map(weight);
    let r = Math.random() * w.reduce((x, y) => x + y, 0), i = 0;
    while (i < cand.length - 1 && (r -= w[i]) > 0) i++;
    const a = cand.splice(i, 1)[0];
    a.stray = true;
    emit({ type: 'stray', animal: ANIMALS[a.type].name, id: a.id });
  }
}
// Con đang ngủ ngoài (lạc) tới sáng
export const strays = s => s.animals.filter(a => a.stray && a.tile);
// world.js báo: con id vừa đi qua cửa chuồng (bị lùa tay, chó lùa, hay chạy theo thóc rải).
// Luật ghi con đó là đã về chuồng, hết lạc. false nếu nó đang ở trong chuồng rồi.
export function passGate(s, id) {
  const a = s.animals.find(x => x.id === id);
  if (!a?.tile) return false;
  a.stray = false; goHome(s, a);
  return true;
}
// Điểm cửa chuồng (giữa các ô cửa) theo id chuồng; null nếu không có
export function gateOf(s, id) {
  const p = mapOf(s).penById[id];
  if (!p?.gates.length) return null;
  return { x: p.gates.reduce((n, g) => n + g[0], 0) / p.gates.length * TS + 8, y: p.gates[0][1] * TS + 8 };
}
// Số con thả rông của chuồng đã về: { type, home, total } (total = 0: chuồng không có loài thả rông)
export function penHome(s, id) {
  const list = s.animals.filter(a => a.pen === id && FREE.types.includes(a.type));
  return { type: list[0]?.type ?? null, home: list.filter(a => !a.tile).length, total: list.length };
}
function gateActs(s, t) {
  const h = penHome(s, t.id);
  if (!h.total) return [];
  const def = ANIMALS[h.type], n = have(s, def.feed), out = s.animals.some(a => a.pen === t.id && a.stray && a.tile);
  return [mk('scatter', '🌾', `Rải thóc gọi về (còn ${n} ${itemName(def.feed).toLowerCase()})`,
    n <= 0 ? noItem(def.feed) : !out ? 'Không có con nào lạc ngoài kia' : null)];
}
function scatter(s, t, at) {
  const p = mapOf(s).penById[t.id], def = ANIMALS[penHome(s, t.id).type];
  take(s, def.feed);
  const near = s.animals.filter(a => a.pen === t.id && a.stray && a.tile && p.gates.some(([c, r]) => Math.max(Math.abs(a.tile.c - c), Math.abs(a.tile.r - r)) <= FREE.lureRadius));
  for (const a of near) passGate(s, a.id);
  const h = penHome(s, t.id), msg = near.length ? `${near.length} con chạy về chuồng` : 'Chưa con nào nghe thấy, đi gần hơn nhé';
  const g = gateOf(s, t.id) ?? at;
  return res(true, msg, [say(at, near.length ? `Rải thóc 🌾 ${h.home}/${h.total} đã về` : 'Rải thóc 🌾')], 'eat', { grain: { x: g.x, y: g.y } });
}
function stepFree(s, d) {
  const roam = roamOf(s), day = !isDusk(s);
  if (!day && (s.duskDay || 0) !== s.day) dusk(s);
  let n = 0;
  for (const a of s.animals) {
    if (a.stray && a.tile && !day && canRoam(s, a)) { n++; continue; }   // ngủ ngoài tới sáng
    if (a.stray) a.stray = false;
    if (s.time < (a.homeUntil || 0)) { if (a.tile) goHome(s, a); continue; }   // chó vừa lùa về: ở yên trong chuồng một lúc
    if (!day || !roam.tiles.length || !canRoam(s, a) || n >= FREE.max) { if (a.tile) goHome(s, a); continue; }
    n++;
    const mom = duckMom(s, a);
    if (mom) { if (!a.tile) Object.assign(a, tileMid(mom.tile)); a.tile = { ...mom.tile }; a.tileAt = mom.tileAt; continue; }
    if (a.tile && roam.has(a.tile.c, a.tile.r) && s.time < (a.tileAt || 0)) continue;
    const from = a.tile ?? (() => { const g = animalPen(s, a)?.gates[0]; return g ? { c: g[0], r: g[1] } : roam.tiles[0]; })();
    if (!a.tile) Object.assign(a, tileMid(from));   // sáng ra: bước ra từ cửa chuồng
    const near = roam.tiles.filter(t => Math.max(Math.abs(t.c - from.c), Math.abs(t.r - from.r)) <= FREE.radius);
    a.tile = { ...pick(near.length ? near : roam.tiles) };
    a.tileAt = s.time + rnd(...FREE.moveMs);
    peck(s, a, a.tile.c, a.tile.r);
  }
}
// Ô cỏ để gà thả rông đẻ trứng: gần con mái, thích chỗ sát bụi, đá, gốc cây; mỗi ô một ổ
function bushSpot(s, a) {
  const m = mapOf(s), roam = roamOf(s), R = FREE.layRadius, hasEgg = new Set(s.eggs.filter(e => e.tile).map(e => e.tile.c + ',' + e.tile.r));
  const cover = new Set([...m.trees, ...m.clutter].map(o => o.ent.c + ',' + o.ent.r));
  const grass = roam.tiles.filter(t => Math.max(Math.abs(t.c - a.tile.c), Math.abs(t.r - a.tile.r)) <= R && m.ground[t.r * m.mw + t.c] === GROUND.GRASS && !hasEgg.has(t.c + ',' + t.r));
  const nearCover = t => { for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (cover.has((t.c + x) + ',' + (t.r + y))) return true; return false; };
  const cand = grass.filter(nearCover), t = pick(cand.length ? cand : grass);
  return t ? { x: t.c * TS + 8, y: t.r * TS + 14, tile: { c: t.c, r: t.r } } : null;
}
// Trứng đang nằm trong bụi (đã đẻ ở ô thả rông, chưa ai nhặt)
export const hiddenEggs = s => s.eggs.filter(e => e.tile);

function stepAnimals(s, d) {
  const stink = s.poops.length * DOG.stinkUnhappyPerPoop * (d / MIN);
  const penKey = a => a.pen ?? ANIMALS[a.type].pen;   // id chuồng của con vật (chưa xếp chuồng thì theo loại chuồng)
  const joy = new Set(s.animals.filter(a => a.retired).map(penKey));   // những chuồng có con nghỉ hưu
  for (const a of [...s.animals]) {
    const def = ANIMALS[a.type];
    // tuổi theo giờ vườn: step chỉ chạy khi vườn chạy nên đóng băng thì không già
    const was = a.age || 0, warnAt = lifeMarks(a).gia - AGING.warnMs;
    a.age = was + d;
    if (was < warnAt && a.age >= warnAt) emit({ type: 'oldSoon', animal: def.name, id: a.id });
    if (!ageUp(s, a, a.type, def)) { passAway(s, a, def); continue; }
    const pigNho = a.type === 'heo' && a.stage === 'nho';   // heo nhỡ ăn khỏe, tăng cân nhanh
    a.hunger = Math.max(0, a.hunger - 100 * d / HUSBANDRY.hungerMs * (pigNho ? AGING.pigHungry : 1));
    // tự ra máng ăn
    if (a.hunger < HUSBANDRY.autoEatBelow && s.troughs[def.pen] > 0) { s.troughs[def.pen]--; a.hunger = 100; }
    stepDirt(s, a, d);
    // vui: trôi dần về 50, mùi hôi kéo xuống
    if (a.happy > 50) a.happy = Math.max(50, a.happy - HUSBANDRY.happyDecayPerMin * d / MIN);
    a.happy = Math.max(0, a.happy - stink);
    if (joy.has(penKey(a))) a.happy = Math.max(a.happy, TRADE.retireHappy);
    // để đói hay dơ lâu thì bớt thân (heo, bò đầm bùn là tính tự nhiên: dơ bùn chỉ tăng nguy cơ bệnh, không bớt thân)
    if (a.hunger <= BOND.hungerBelow || (a.dirty || 0) >= BOND.dirtyAbove && !DIRT.mud.includes(a.type)) bondShift(a, -BOND.lossPerMin * d / MIN);
    // đói lả -> bệnh
    if (a.hunger <= 0) { if (!a.starvingSince) { a.starvingSince = s.time; emit({ type: 'hungry', animal: def.name }); } } else a.starvingSince = 0;
    // nguyên nhân tự mắc: đói lả lâu, dơ, chuồng bẩn, tuổi già (con ❤️4+ ít bệnh hơn); vắc-xin chặn hết
    if (!a.sick && !vaccinated(s, a) && ((a.starvingSince && s.time - a.starvingSince >= HUSBANDRY.sickAfterStarving)
      || chance(HUSBANDRY.sickChancePerMin * sickFactor(a) * (isDirty(a) ? DIRT.sickMul : 1) * (penDirty(s, def.pen) ? SICK.dirtyPenMul : 1) * (a.stage === 'gia' ? SICK.oldChanceMul : 1), d))) fall(s, a, def);
    if (a.hurt && !stepHurt(s, a, d, def)) continue;   // mất vì vết chuột cắn
    if (a.sick && !stepSick(s, a, d, def)) continue;   // mất vì bệnh
    if (grieving(s)) a.happy = Math.min(a.happy, SICK.griefCap);
    if (a.sick || a.hunger <= HUSBANDRY.growNeedsHunger) continue;
    // con non, nhỡ ăn no thì lên cân dần tới cân lớn hẳn
    const [w0, w1] = WEIGHT[a.type] ?? [1, 1];
    // heo lên cân cả khi lớn: ăn no và nằm ườn thì mau béo, hay đi lại thì chậm (a.walk = px đã đi, do world cộng)
    if (a.type === 'heo' || a.stage === 'non' || a.stage === 'nho') {
      const moved = Math.min(1, (a.walk || 0) / (TRADE.walkPx * d / 1000)), k = a.type === 'heo' ? (TRADE.gainActive + (TRADE.gainLazy - TRADE.gainActive) * (1 - moved)) * (a.hunger >= TRADE.fullAt ? TRADE.gainFull : 1) : 1;
      a.weight = Math.min(w1, (a.weight || w0) + (w1 - w0) * d / stageStart(a.type, 'truong') * (pigNho ? AGING.pigGain : 1) * k);
    }
    a.walk = 0;
    if (!animalCan(a, 'product') || a.type === 'heo' || s.time < a.nextProduct) continue;
    if (a.sex === 'm' && a.type !== 'cuu') continue;   // gà trống, vịt cồ không đẻ, bò đực không có sữa
    if (POULTRY.includes(a.type)) {
      if (s.eggs.length < 30) {   // chỉ mái mới đẻ (trống đã bỏ qua ở trên); đang thả rông thì đẻ trong bụi do luật chọn
        const roos = roosters(s, a.type), fert = roos.length > 0 && Math.random() < BREED.fertile;   // có trống: 40% trứng có phôi
        const e = { id: s.nextId++, sp: a.type, x: a.x, y: a.y, laidAt: s.time, fertile: fert, mom: ref(a), dad: fert ? ref(pick(roos)) : null, ...(a.tile ? bushSpot(s, a) : null) };
        s.eggs.push(e); emit({ type: 'egg' }); spawnEv('egg', e.x, e.y);
      }
      a.nextProduct = s.time + productEvery(a);
    } else if (!a.ready) { a.ready = true; fxEv(a.x, a.y, a.type === 'bo' ? 'Có sữa! 🥛' : 'Có lông! ✂️'); }
  }
  stepSpread(s, d);
  stepBreeding(s, d);
}

// ---------- Bệnh 4 giai đoạn, lây, thuốc, vắc-xin (issue 38) ----------
export const vaccinated = (s, a) => (a.vaccUntil || 0) > (s.simMs || 0);
const SICK_FLOOR = [0, 0, SICK.toSevere, SICK.toCritical];   // tiến triển tối thiểu của từng giai đoạn bệnh
export const SICK_NAME = ['Khỏe', 'Mệt', 'Bệnh nặng', 'Nguy kịch'];
// Thời gian (giờ vườn, đã tính hệ số) còn lại tới khi mất; chỉ có nghĩa ở Nguy kịch (đồng hồ đếm ngược trên đầu)
export const sickLeft = a => (a.sick >= 3 ? Math.max(0, SICK.deadAt - a.sickMs) : null);
// Bắt đầu bệnh (Mệt)
function fall(s, a, def) {
  a.sick = 1; a.sickSince = s.time; a.sickMs = 0; a.dose = 0; a.spreadAcc = 0;
  emit({ type: 'sick', animal: def.name, id: a.id }); fxEv(a.x, a.y, `${def.name} bị mệt 🤒`, COL.bad); log(s, `${def.name} bị mệt, cho uống thuốc thú y nhé`);
}
function cureAnimal(s, a) {
  a.sick = 0; a.sickMs = 0; a.dose = 0; a.sickSince = 0; a.starvingSince = 0; a.hunger = Math.max(a.hunger, 30);
  a.hurt = false; a.hurtMs = 0;   // khỏi bệnh thì vết chuột cắn cũng được băng bó luôn
  emit({ type: 'cured', animal: ANIMALS[a.type].name, id: a.id });
  advanceCoUtQuest(s, 'cure');
}
// Tiến triển bệnh một bước. Trả về false nếu con vật đã mất.
// ADR 0004: đồng hồ gây chết chỉ chạy khi chủ đang chơi (catchUp = false). Chạy bù: dừng ở Bệnh nặng, Nguy kịch hạ về Bệnh nặng, không chết.
function stepSick(s, a, d, def) {
  if (a.sick === true) a.sick = 1;
  a.sickMs = Math.max(a.sickMs || 0, SICK_FLOOR[a.sick] ?? 0);
  const quar = penTypeOf(s, a) === 'quarantine';
  let p = a.sickMs + d * (a.stage === 'gia' ? SICK.oldMul : 1) / (quar ? SICK.quarantineMul : 1);
  if (level(s) < SICK.minLevel) p = Math.min(p, SICK.toSevere - 1);   // người mới: không quá Mệt
  if (catchUp) p = Math.min(p, SICK.catchUpCap);
  a.sickMs = p;
  const to = p >= SICK.toCritical ? 3 : p >= SICK.toSevere ? 2 : 1;
  if (to !== a.sick) {
    const up = to > a.sick;
    a.sick = to; a.dose = 0;
    if (up && to === 2) { emit({ type: 'sickSevere', animal: def.name, id: a.id }); fxEv(a.x, a.y, `${def.name} bệnh nặng 🔴`, COL.bad); log(s, `${def.name} bệnh nặng rồi, cần 2 liều thuốc hoặc bác sĩ thú y!`); }
    if (up && to === 3) { emit({ type: 'sickCritical', animal: def.name, id: a.id }); fxEv(a.x, a.y, `${def.name} nguy kịch 🔴`, COL.bad); log(s, `${def.name} nguy kịch! Chỉ bác sĩ thú y cứu được, gọi ngay ở điện thoại trong nhà!`); }
  }
  if (!catchUp && p >= SICK.deadAt) { dieOfSick(s, a, def); return false; }
  return true;
}
function dieOfSick(s, a, def) {
  s.animals.splice(s.animals.indexOf(a), 1);
  emit({ type: 'died', animal: def.name, id: a.id, kind: a.type, sex: a.sex, x: a.x, y: a.y });
  spawnEv('angel', a.x, a.y);
  fxEv(a.x, a.y, 'Lên trời rồi 😇', COL.info);
  log(s, `${a.name || def.name} đã mất vì bệnh, hóa thiên thần bay lên trời 😇`);
  leaveGrave(s, a);
}
// Con Bệnh nặng ở chuồng thường: mỗi everyMs có p% lây cho một con cùng chuồng (chuồng cách ly không lây)
function stepSpread(s, d) {
  for (const a of s.animals) {
    if (a.sick < 2 || penTypeOf(s, a) === 'quarantine') continue;
    a.spreadAcc = (a.spreadAcc || 0) + d;
    while (a.spreadAcc >= SICK.spread.everyMs) {
      a.spreadAcc -= SICK.spread.everyMs;
      if (Math.random() >= SICK.spread.p) continue;
      const mates = s.animals.filter(b => b !== a && b.pen === a.pen && !b.sick && !vaccinated(s, b));
      if (mates.length) { const b = pick(mates); fall(s, b, ANIMALS[b.type]); }
    }
  }
}
// Cho uống 1 liều thuốc thú y. Mệt: 1 liều là khỏi · Bệnh nặng: 2 liều · Nguy kịch: chỉ bác sĩ.
export function giveMedicine(s, id) {
  const a = s.animals.find(x => x.id === id);
  if (!a) return R(false, 'Không thấy con vật', { reason: 'missing' });
  if (!a.sick && !a.hurt) return R(false, 'Con này khỏe, không cần thuốc', { reason: 'healthy' });
  if (a.sick >= 3) return R(false, 'Nguy kịch rồi, thuốc không đủ, phải gọi bác sĩ thú y', { reason: 'critical' });
  if (!take(s, 'medicine')) return R(false, noItem('medicine'), { reason: 'no_item' });
  if (!a.sick) {   // chỉ bị chuột cắn: một liều là băng bó xong
    a.hurt = false; a.hurtMs = 0;
    emit({ type: 'cured', animal: ANIMALS[a.type].name, id: a.id });
    return R(true, 'Đã băng bó vết chuột cắn', { cured: true });
  }
  const need = SICK.doses[a.sick];
  a.dose = (a.dose || 0) + 1;
  if (a.dose >= need) { cureAnimal(s, a); return R(true, 'Đã khỏi bệnh', { cured: true }); }
  return R(true, `Đã cho uống ${a.dose}/${need} liều, cần thêm ${need - a.dose} liều nữa`, { cured: false, dose: a.dose });
}
// Gọi bác sĩ thú y qua điện thoại ở nhà (đắt): cứu con Bệnh nặng hay Nguy kịch
export function callVet(s, id) {
  const a = s.animals.find(x => x.id === id);
  if (s.scene !== 'house') return R(false, 'Vào nhà dùng điện thoại để gọi bác sĩ nhé', { reason: 'scene' });
  if (!a) return R(false, 'Không thấy con vật', { reason: 'missing' });
  if (!a.sick) return R(false, 'Con này khỏe, không cần bác sĩ', { reason: 'healthy' });
  if (s.coins < SICK.vetPrice) return R(false, 'Chưa đủ xu để mời bác sĩ', { reason: 'coins' });
  s.coins -= SICK.vetPrice;
  cureAnimal(s, a); addBond(s, a, 'cure');
  return R(true, `Bác sĩ thú y đã tới, ${ANIMALS[a.type].name.toLowerCase()} khỏi bệnh (-${SICK.vetPrice} xu)`, { price: SICK.vetPrice });
}
// Tiêm vắc-xin cho một con (1 mũi), chống bệnh SICK.vaccineMs giờ vườn
export function vaccinate(s, id) {
  const a = s.animals.find(x => x.id === id);
  if (!a) return R(false, 'Không thấy con vật', { reason: 'missing' });
  if (a.sick) return R(false, 'Con đang bệnh, tiêm không kịp, cho uống thuốc nhé', { reason: 'sick' });
  if (!take(s, 'vaccine')) return R(false, noItem('vaccine'), { reason: 'no_item' });
  a.vaccUntil = (s.simMs || 0) + SICK.vaccineMs;
  emit({ type: 'vaccinated', animal: ANIMALS[a.type].name, id: a.id });
  advanceCoUtQuest(s, 'vaccinate');
  return R(true, `Đã tiêm vắc-xin cho ${ANIMALS[a.type].name.toLowerCase()}`);
}
// Tiêm cả chuồng: mỗi con khỏe một mũi; thiếu vắc-xin thì tiêm được tới đâu hay tới đó
export function vaccinatePen(s, penId) {
  settlePens(s);
  let n = 0;
  for (const a of s.animals.filter(x => x.pen === penId && !x.sick)) { if (!vaccinate(s, a.id).ok) break; n++; }
  return n ? R(true, `Đã tiêm vắc-xin cho ${n} con`, { n }) : R(false, noItem('vaccine'), { reason: 'no_item' });
}
// Chuyển vào / ra chuồng cách ly bằng một hành động (chuồng cách ly còn chỗ / chuồng đúng loài còn chỗ)
export function isolate(s, id) {
  settlePens(s);
  const q = penEnts(s, 'quarantine').find(e => penUse(s, e.id) < penCapOf(e));
  if (!q) return R(false, penEnts(s, 'quarantine').length ? 'Chuồng cách ly chật rồi' : 'Bạn chưa có chuồng cách ly, xây một cái nhé', { reason: 'no_quarantine' });
  return moveAnimal(s, id, q.id);
}
export function unisolate(s, id) {
  const a = s.animals.find(x => x.id === id);
  const e = a && roomyPen(s, ANIMALS[a.type].pen);
  return e ? moveAnimal(s, id, e.id) : R(false, 'Chuồng thường đã chật rồi', { reason: 'full' });
}

// ---------- Dơ, tắm, dọn chuồng ----------
export const isDirty = a => a.dirty >= DIRT.high;
// Chuồng bẩn khi phân đầy
export const penDirty = (s, pen) => (s.manure?.[pen] ?? 0) >= MANURE.dirtyAt;
// Cờ ổ cát của chuồng (lát 35 đặt `sand: true` lên thực thể chuồng cấp 3)
const penSand = (s, pen) => !!mapOf(s).pens[pen]?.ent?.sand;

function stepDirt(s, a, d) {
  const pen = ANIMALS[a.type].pen;
  if (DIRT.mud.includes(a.type)) {   // đầm bùn: dơ ngay (tắm xong một lúc mới lăn lại), không mất vui
    if (a.dirty < 100 && s.time >= (a.wallowAt || 0)) { a.dirty = 100; emit({ type: 'wallow', id: a.id }); }
    return;
  }
  const rain = s.weather === 'rain';
  a.dirty = Math.min(100, a.dirty + 100 * d / DIRT.fullMs * (rain || penDirty(s, pen) ? DIRT.fastMul : 1));
  if (POULTRY.includes(a.type) && !rain && penSand(s, pen)) a.dirty = Math.min(a.dirty, DIRT.sandCap);   // tự tắm cát
  if (isDirty(a)) a.happy = Math.max(0, a.happy - DIRT.unhappyPerMin * d / MIN);
}

function stepManure(s, d) {
  for (const pen of Object.keys(s.manure)) {
    if (s.animals.some(a => ANIMALS[a.type].pen === pen)) s.manure[pen] = Math.min(100, s.manure[pen] + 100 * d / MANURE.fullMs);
  }
}

// Việc cần làm (lát 48 hoàn thiện): con đang dơ (không kể heo, bò đầm bùn) và chuồng đang bẩn
export const dirtyAnimals = s => s.animals.filter(a => isDirty(a) && !DIRT.mud.includes(a.type));
export const dirtyPens = s => Object.keys(s.manure).filter(pen => penDirty(s, pen) && s.animals.some(a => ANIMALS[a.type].pen === pen));

// Sinh sản heo, bò, cừu: cần con đực và con cái trưởng thành, no và vui, chung một chuồng (chuồng cách ly thì không).
// Heo: có cặp thì mỗi phút 25% một nái mang bầu, đẻ 1–3 con (nái già 1–2). Bò, cừu: có cặp là mang thai ngay, đẻ 1 con sau BREED.gestation.
// Chuồng đầy (sức chứa cả loại chuồng) thì không thụ thai, không đẻ: con vật hiện lý do "Chuồng đầy".
function stepBreeding(s, d) {
  settlePens(s);
  const full = (a, def) => {
    if (!a.fullAt || s.time - a.fullAt > 5 * MIN) { a.fullAt = s.time; fxEv(a.x, a.y - 8, 'Chuồng đầy 🚫', COL.bad); }
    return typeFree(s, def.pen) <= 0;
  };
  for (const type of ['heo', 'bo', 'cuu']) {
    const def = ANIMALS[type], herd = s.animals.filter(a => a.type === type && penTypeOf(s, a) !== 'quarantine');
    const mateOf = f => herd.find(m => m.sex === 'm' && m.pen === f.pen && fitToBreed(m));
    // đẻ
    for (const a of herd) {
      if (!a.pregnant || a.sick || s.time < a.dueAt) continue;
      const free = typeFree(s, def.pen);
      if (free <= 0) { full(a, def); continue; }   // chuồng chật thì chờ
      const n = Math.min(type === 'heo' ? rint(...(a.stage === 'gia' ? BREED.litterOld : HUSBANDRY.pigLitter)) : 1, free);
      a.pregnant = false; a.fullAt = 0;
      const mom = ref(a), dad = a.mate; a.mate = null;
      if (type === 'heo') a.nextProduct = s.time + HUSBANDRY.pigGestation;   // nghỉ trước lứa sau
      for (let i = 0; i < n; i++) {
        const b = newborn(s, type, mom, dad, a.x + rnd(-6, 6), a.y + rnd(-6, 6), bornPen(s, a, type));
        spawnEv(type === 'heo' ? 'piglet' : type === 'bo' ? 'calf' : 'lamb', b.x, b.y);
        emit({ type: 'born', kind: type, animal: def.name, id: b.id, x: b.x, y: b.y });
      }
      if (type === 'heo') { s.stats.piglets += n; snd('oink'); }
      addExp(s, def.exp);
      fxEv(a.x, a.y, `${def.name} đẻ ${n} ${def.baby.toLowerCase()}! ${ICON[type]}`, COL.good);
      log(s, type === 'heo' ? `Heo nái đẻ ${n} heo con` : `${def.name} cái ${a.name} sinh ${def.baby.toLowerCase()}`);
    }
    // thụ thai
    const sows = herd.filter(a => a.sex === 'f' && !a.pregnant && s.time >= (type === 'heo' ? a.nextProduct : 0) && fitToBreed(a) && mateOf(a));
    if (!sows.length) continue;
    if (type === 'heo') {
      if (!chance(HUSBANDRY.pigBreedChancePerMin, d)) continue;
      const sow = pick(sows);
      if (full(sow, def)) continue;
      sow.pregnant = true; sow.dueAt = s.time + HUSBANDRY.pigGestation; sow.mate = ref(mateOf(sow));
      fxEv(sow.x, sow.y, 'Heo mang bầu 💕', COL.good); log(s, 'Một chú heo đang mang bầu');
    } else for (const f of sows) {
      if (full(f, def)) continue;
      f.pregnant = true; f.dueAt = s.time + BREED.gestation[type]; f.mate = ref(mateOf(f));
      fxEv(f.x, f.y, `${def.name} mang thai 💕`, COL.good);
    }
  }
}

const inPen = (e, o) => { const ft = footprint(e); return o.x != null && o.x >= ft.c * TS && o.x < (ft.c + ft.w) * TS && o.y >= ft.r * TS && o.y < (ft.r + ft.h) * TS; };
// Gà/vịt con nở ra (sp = loài quả trứng): ở ổ ấp / chuồng ấp tự động thì ra chỗ ổ; trứng bỏ quên thì ra chỗ quả trứng
function hatch(s, sp, mom, dad, x, y, pen, ev) {
  const b = newborn(s, sp, mom, dad, x, y, pen); s.stats.hatches++;
  spawnEv('chick', ev.x, ev.y); snd(SOUND[sp] ?? 'cluck'); fxEv(ev.x, ev.y, 'Trứng nở! 🐣', COL.good);
  emit({ type: 'born', kind: sp, animal: ANIMALS[sp].name, id: b.id, x: b.x, y: b.y });
  return b;
}
function stepEggs(s) {
  const chickPen = () => typeFree(s, 'chicken') > 0;
  // trứng bỏ quên: mỗi eggForgetMs thử một lần; chỉ trứng có phôi mới nở được
  for (const e of [...s.eggs]) {
    e.check ??= e.laidAt + HUSBANDRY.eggForgetMs;
    if (s.time < e.check) continue;
    if (e.fertile && chickPen() && Math.random() < HUSBANDRY.eggHatchChance) {
      s.eggs.splice(s.eggs.indexOf(e), 1);
      hatch(s, eggSp(e), e.mom, e.dad, e.x, e.y, roomyPen(s, 'chicken')?.id, e);
      log(s, `Một quả trứng bỏ quên đã nở thành ${ANIMALS[eggSp(e)].baby.toLowerCase()}`);
    } else e.check += HUSBANDRY.eggForgetMs;
  }
  if (s.nest.egg && s.time >= s.nest.hatchAt && chickPen()) {
    const rp = roomyPen(s, 'chicken'), at = mapOf(s).building('coop').at, p = penPoint(s, 'chicken', rp?.id);
    s.nest.egg = false;
    const sp = s.nest.sp ?? 'ga', baby = ANIMALS[sp].baby.toLowerCase();
    hatch(s, sp, s.nest.mom, s.nest.dad, p.x, p.y, rp?.id, at); s.nest.mom = s.nest.dad = s.nest.sp = null;
    toast(`Trứng ở ổ ấp đã nở ${baby} 🐣`); log(s, `Ổ ấp nở ra một ${baby}`);
  }
  // ổ ấp tự động ở chuồng gà cấp 3: tự nhận trứng có phôi nằm trong chuồng (không cần soi), nở như ổ ấp thường
  for (const pen of penEnts(s, 'chicken')) {
    if (penLv(pen) < 3) continue;
    if (pen.incub && s.time >= pen.incub.at && chickPen()) {
      const rp = roomyPen(s, 'chicken'), p = penPoint(s, 'chicken', rp?.id);
      const sp = pen.incub.sp ?? 'ga';
      hatch(s, sp, pen.incub.mom, pen.incub.dad, p.x, p.y, rp?.id, p); pen.incub = null;
      log(s, `Ổ ấp tự động nở ra một ${ANIMALS[sp].baby.toLowerCase()}`);
    }
    if (!pen.incub) {
      const e = s.eggs.find(o => o.fertile && inPen(pen, o));
      if (e) { s.eggs.splice(s.eggs.indexOf(e), 1); pen.incub = { at: s.time + HUSBANDRY.nestHatchMs, sp: eggSp(e), mom: e.mom, dad: e.dad }; }
    }
  }
}
function stepDog(s, d) {
  const g = s.dog;
  g.hunger = Math.max(0, g.hunger - 100 * d / DOG.hungerMs);
  g.happy = Math.max(0, g.happy - d / MIN);
  // chó lớn theo giờ vườn như vật nuôi, nhưng ở mãi tuổi trưởng thành: không già, không chết vì già (LIFE.cho)
  g.age = (g.age || 0) + d;
  const st = stageAt('cho', g.age);
  if (st !== g.stage) {
    g.stage = st;
    if (st === 'nho') log(s, `${g.name} đã thành chó nhỡ, sủa lung tung cả ngày và học được lệnh rồi đó`);
    if (st === 'truong') { toast(`${g.name} đã lớn thành chó canh nhà 🐕`); log(s, `${g.name} đã trưởng thành`); }
    if (st === 'gia') { toast(`${g.name} già rồi, ngủ nhiều và nhìn xa kém hơn 👴`); log(s, `${g.name} đã già, canh trộm không còn thính như xưa`); }
  }
  stepHerd(s);
  autoHerd(s);
  if (s.time >= g.nextPoop) {
    g.nextPoop = nextPoopAt(s);
    if (s.poops.length < DOG.maxPoops) {
      const p = { id: s.nextId++, x: g.x, y: g.y, at: s.time };
      s.poops.push(p); spawnEv('poop', p.x, p.y);
    }
  }
}

const guardOn = s => (s.dog.stage === 'truong' || s.dog.stage === 'gia') && s.dog.hunger > 40 && s.dog.happy > 50;

// ---------- Vòng đời chó và dạy lệnh bằng minigame (issue 45) ----------
// Minigame chỉ gửi vào luật một kết quả "đạt / không đạt"; luật quyết định tiến độ (ADR 0013).
export const trickProgress = (s, id) => s.dog.tricks?.[id] ?? 0;
export const knowsTrick = (s, id) => !!TRICKS[id] && trickProgress(s, id) >= TRICKS[id].sessions;
export const knownTricks = s => Object.keys(TRICKS).filter(id => knowsTrick(s, id));
// Thuộc đủ 6 lệnh thì chó không ăn xúc xích của người lạ nữa (lát 46 dùng luật này)
export const trickProof = s => knownTricks(s).length >= Object.keys(TRICKS).length;
// Danh sách lệnh cho bảng dạy chó
export const trickList = s => Object.entries(TRICKS).map(([id, t]) => ({ id, ...t, step: trickProgress(s, id), done: knowsTrick(s, id), can: canTrain(s, id) }));

export function canTrain(s, id) {
  const t = TRICKS[id], g = s.dog;
  if (!t) return R(false, 'Không có lệnh này', { reason: 'unknown' });
  if (!TRAIN.stages.includes(g.stage)) {
    return R(false, g.stage === 'non' ? `${g.name} còn bé quá, đợi nó lớn thêm chút nhé` : `${g.name} già rồi, chỉ thích nằm ngủ thôi`, { reason: 'stage' });
  }
  if (knowsTrick(s, id)) return R(false, `${g.name} thuộc lệnh ${t.name} rồi`, { reason: 'learned' });
  if (id !== TRICK_BASE && !knowsTrick(s, TRICK_BASE)) return R(false, `Dạy lệnh ${TRICKS[TRICK_BASE].name} trước đã, rồi mới tới lệnh khác`, { reason: 'base' });
  if (g.trainDay === s.day) return R(false, `Hôm nay dạy một buổi rồi, mai học tiếp nhé`, { reason: 'daily' });
  if (!have(s, TRAIN.treat)) return R(false, noItem(TRAIN.treat), { reason: 'no_item' });
  return R(true, `Dạy ${g.name} lệnh ${t.name}`);
}
// Mở một buổi dạy: trừ 1 bánh thưởng, ghi sổ "đã dạy hôm nay".
// quit = chó đói hay buồn nên bỏ giữa chừng: buổi đó không tính, bánh thưởng vẫn mất.
export function trainStart(s, id) {
  const c = canTrain(s, id);
  if (!c.ok) return c;
  const g = s.dog;
  take(s, TRAIN.treat);
  g.trainDay = s.day;
  const moody = g.hunger < TRAIN.quitHunger || g.happy < TRAIN.quitHappy;
  if (moody && Math.random() < TRAIN.quitChance) {
    g.session = null;
    log(s, `${g.name} đang đói và buồn, học nửa buổi rồi bỏ chạy`);
    return R(true, `${g.name} bỏ buổi học giữa chừng, cho nó ăn và vuốt ve rồi mai dạy lại nhé`, { trick: id, quit: true });
  }
  g.session = { trick: id };
  return R(true, `${g.name} hào hứng chờ học lệnh ${TRICKS[id].name}`, { trick: id, quit: false });
}
// Chốt kết quả một buổi: pass = đạt. Chó vui thì học nhanh (một buổi đạt ăn hai buổi).
export function trainResult(s, id, pass) {
  const g = s.dog, t = TRICKS[id];
  if (!t || g.session?.trick !== id) return R(false, 'Chưa mở buổi dạy nào', { reason: 'no_session' });
  g.session = null;
  if (!pass) {
    log(s, `${g.name} chưa hiểu lệnh ${t.name}, buổi này chưa tính`);
    return R(true, `${g.name} chưa hiểu, mai thử lại nhé`, { trick: id, step: 0, progress: trickProgress(s, id), need: t.sessions, learned: false });
  }
  const step = g.happy >= TRAIN.fastHappy ? 2 : 1;
  g.tricks = { ...g.tricks, [id]: Math.min(t.sessions, trickProgress(s, id) + step) };
  g.happy = Math.min(100, g.happy + TRAIN.happyGain);
  const learned = knowsTrick(s, id);
  if (learned) {
    emit({ type: 'trick', trick: id, name: t.name });
    log(s, `${g.name} học xong lệnh ${t.name} ${t.icon}`);
  }
  return R(true, learned ? `${g.name} đã thuộc lệnh ${t.name}!` : `Giỏi lắm! ${t.name} ${trickProgress(s, id)}/${t.sessions} buổi`,
    { trick: id, step, progress: trickProgress(s, id), need: t.sessions, learned });
}

// Chỗ chó đang gác (lệnh Canh khu), hay null
export const dogPost = s => (s.dog.cmd?.id === 'guard' && s.dog.cmd.spot ? s.dog.cmd.spot : null);
// Bán kính phát hiện trộm (ô): nhỡ 4, trưởng thành 6, già 4; ×2 tại chỗ đang gác
export const guardRadius = (s, dog = s.dog) => (DOG.guardRadius[dog.stage] ?? 0) * (dogPost(s) ? DOG.guardPostMul : 1);
// Chó có phát hiện kẻ lạ ở điểm (x, y) không? Đang gác thì tính từ chỗ gác.
export function dogSees(s, x, y) {
  const r = guardRadius(s);
  if (!r) return false;
  const post = dogPost(s), at = post ? { x: post.c * TS + 8, y: post.r * TS + 8 } : s.dog;
  if (at.x == null) return false;
  return Math.hypot(at.x - x, at.y - y) <= r * TS;
}

// Các con đang ở ngoài chuồng: thả rông, con lạc, và bò/cừu đi lạc khỏi chuồng
export function outOfPen(s) {
  const m = mapOf(s);
  return s.animals.filter(a => {
    if (a.tile) return true;
    const r = (m.penById[a.pen] ?? animalPen(s, a))?.area;
    return !!r && a.x != null && (a.x < r.x || a.y < r.y || a.x > r.x + r.w || a.y > r.y + r.h);
  });
}
// Một con được chó lùa về tới chuồng
function bringHome(s, a) {
  if (a.tile) passGate(s, a.id);
  else { a.stray = false; goHome(s, a); }
  a.homeUntil = s.time + TRAIN.stayMs;
}
// Lệnh Lùa: luật chốt ngay danh sách phải về, rồi đưa về dần trong TRAIN.herdMs. world.js chỉ diễn hoạt chó chạy vòng.
function herdStart(s, auto = false) {
  const g = s.dog, list = outOfPen(s);
  if (!list.length) return R(false, 'Cả đàn đang trong chuồng cả rồi', { reason: 'none' });
  g.cmd = { id: 'herd', until: s.time + TRAIN.herdMs, list: list.map(a => a.id) };
  if (auto) emit({ type: 'dogHerd', n: list.length });
  log(s, `${g.name} chạy vòng lùa ${list.length} con về chuồng`);
  snd('bark');
  return R(true, `${g.name} lùa ${list.length} con về chuồng 🐑`, { n: list.length });
}
function stepHerd(s) {
  const g = s.dog, c = g.cmd;
  if (c?.id !== 'herd') return;
  const n = c.list.length, left = Math.max(0, c.until - s.time);
  const back = s.time >= c.until ? n : n - Math.ceil(left / TRAIN.herdMs * n);
  for (let i = 0; i < back && i < n; i++) {
    const a = s.animals.find(x => x.id === c.list[i]);
    if (a) bringHome(s, a);
  }
  if (s.time >= c.until) g.cmd = null;
}
// Tối nào chó no và vui cũng tự lùa đàn về (mỗi ngày game một lần)
function autoHerd(s) {
  const g = s.dog;
  if (!knowsTrick(s, 'herd') || !isDusk(s) || g.herdDay === s.day) return;
  if (g.hunger < TRAIN.autoHunger || g.happy < TRAIN.autoHappy) return;
  g.herdDay = s.day;
  herdStart(s, true);
}
// Lệnh Tìm trứng: đánh hơi mọi quả trứng còn giấu trong bụi, đánh dấu để dễ tìm
function sniffEggs(s) {
  const g = s.dog, list = hiddenEggs(s).filter(e => !e.found);
  if (!list.length) return R(false, `${g.name} hít hít một hồi, không còn quả trứng nào trong bụi`, { reason: 'none', n: 0 });
  for (const e of list) e.found = true;
  log(s, `${g.name} đánh hơi thấy ${list.length} quả trứng giấu trong bụi`);
  snd('bark');
  return R(true, `${g.name} tìm thấy ${list.length} quả trứng trong bụi 👃`, { n: list.length });
}
// Ra lệnh cho chó. 'stop' = cho nghỉ. Canh khu nhận ô gác (thiếu thì lấy ô người chơi đang đứng).
export function commandDog(s, id, spot) {
  const g = s.dog;
  if (id === 'stop') { g.cmd = null; g.scene = 'farm'; return R(true, `${g.name} được nghỉ, chạy chơi tiếp`); }
  const t = TRICKS[id];
  if (!t || !knowsTrick(s, id)) return R(false, `${g.name} chưa học lệnh này`, { reason: 'unknown' });
  if (t.auto) return R(false, `${g.name} tự làm việc này rồi, không cần ra lệnh`, { reason: 'auto' });
  if (id === 'egg') return sniffEggs(s);
  if (id === 'herd') return herdStart(s);
  if (id === 'guard') {
    const p = spot ?? { c: Math.floor(s.player.x / TS), r: Math.floor(s.player.y / TS) };
    g.cmd = { id: 'guard', spot: { c: p.c, r: p.r } };
    snd('bark');
    return R(true, `${g.name} ra gác chỗ đó, canh trộm xa gấp đôi 🛡️`, { spot: g.cmd.spot });
  }
  g.cmd = { id };
  if (id === 'follow') g.scene = s.scene;
  snd('bark');
  return R(true, id === 'sit' ? `${g.name} ngồi im thin thít 🪑` : `${g.name} lon ton đi theo bạn 🚶`);
}

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
        // chó phải nhìn thấy mới đuổi được (bán kính theo giai đoạn, ×2 tại chỗ gác); học Đuổi chim thì tự tìm quạ ở bất cứ đâu
        const at = plotCenter(s, t.plot);
        if (guardOn(s) && (dogSees(s, at.x, at.y) || (crow && knowsTrick(s, 'bird'))) && Math.random() < DOG.guardChance) {
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

// ---------- Kẻ săn mồi: chuột, diều hâu, chồn (issue 43, ADR 0004 + 0013) ----------
// Luật quyết định theo ô và xác suất, world.js chỉ diễn hoạt. Mỗi con trong s.preds:
// { id, kind: 'rat'|'hawk'|'weasel', state: 'hunt'|'leaving', since, x, y, tile?, tileAt?, target?, strikeAt, warned }
// strikeAt = lúc ra tay; luật báo 🔴 trước đúng PREDATOR.warnMs (10 giây), đuổi kịp trong khoảng đó thì không ai bị hại.
export const PRED_NAME = { rat: 'Chuột', hawk: 'Diều hâu', weasel: 'Chồn' };
export const preds = s => s.preds ?? [];
// Những con đang trong khoảng cảnh báo (sắp ra tay): dùng cho báo 🔴 và mũi tên chỉ hướng
export const predWarning = s => preds(s).filter(p => p.state === 'hunt' && p.strikeAt - s.time <= PREDATOR.warnMs);
// Con non đang mang vết chuột cắn, chưa chữa
export const hurtAnimals = s => (s.animals ?? []).filter(a => a.hurt);
// Bẫy chuột đã đặt trong vườn (chưa sập mới bắt được)
export const ratTraps = s => s.farm.ents.filter(e => e.kind === 'deco' && e.item === 'deco_rattrap');
const armedTraps = s => ratTraps(s).filter(e => !e.shut);
const ratOk = (m, c, r) => m.isOwned(c, r) && !m.isSolid(c, r);
const far = (a, b) => Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r));

// Ổ chuột: ô cạnh nhà kho, cạnh đống rơm (nhà chuồng đồng cỏ) và cạnh máng ăn
function nestTiles(s) {
  const m = mapOf(s), out = [];
  const add = (c, r) => {
    for (const [dc, dr] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) if (ratOk(m, c + dc, r + dr)) { out.push({ c: c + dc, r: r + dr }); return; }
  };
  const shed = m.building('shed');
  if (shed) add(shed.foot.c + 1, shed.foot.r + shed.foot.h - 1);
  for (const p of m.penList) if (p.type === 'pasture') add(Math.floor(p.house.x / TS), Math.floor(p.house.y / TS));
  for (const t of m.troughs) add(t.c, t.r);
  return out;
}
// Con non thả rông mà diều hâu nhắm được: không đứng gần mái che nào
function hawkPrey(s) {
  const cover = mapOf(s).decos.filter(d => d.kind === 'deco_canopy');
  return s.animals.filter(a => a.stage === 'non' && a.tile && FREE.types.includes(a.type)
    && !cover.some(o => far({ c: o.ent.c, r: o.ent.r }, a.tile) <= PREDATOR.hawk.coverRadius));
}
// Khung giờ nửa đêm chồn mò tới (vắt qua nửa đêm nên so sánh vòng)
function weaselHour(s) {
  const h = hourOf(s), { from, to } = PREDATOR.weasel;
  return from <= to ? h >= from && h < to : h >= from || h < to;
}
function addPred(s, kind, extra) {
  const p = { id: s.nextId++, kind, state: 'hunt', since: s.time, warned: false, strikeAt: s.time + PREDATOR.warnMs, x: 0, y: 0, tile: null, target: null, ...extra };
  s.preds.push(p);
  spawnEv(kind, p.x, p.y);
  return p;
}
const leavePred = (s, p) => { p.state = 'leaving'; p.since = s.time; };
function spawnRat(s) {
  const spots = nestTiles(s);
  if (!spots.length) return;
  const t = pick(spots);
  const mid = tileMid(t);
  addPred(s, 'rat', { tile: { ...t }, ...mid, tx: mid.x, ty: mid.y, tileAt: s.time + PREDATOR.rat.moveMs, strikeAt: s.time + PREDATOR.rat.actMs });
  log(s, 'Có con chuột mò vào trại rồi, đuổi nó hoặc đặt bẫy chuột nhé 🐀');
}
function spawnPounce(s, kind, a) {
  addPred(s, kind, { target: a.id, x: a.x, y: a.y, tx: a.x, ty: a.y });
  log(s, kind === 'hawk' ? 'Một con diều hâu lượn trên sân, nó nhắm con non đang thả rông!' : 'Một con chồn mò vào trại lúc nửa đêm, nó nhắm con đang ngủ ngoài chuồng!');
}
function stepPreds(s, d) {
  s.preds ??= [];
  // Bảo hộ người mới: dưới cấp PREDATOR.minLevel chưa có kẻ săn mồi nào
  if (level(s) >= PREDATOR.minLevel) {
    if (s.preds.filter(p => p.kind === 'rat').length < PREDATOR.rat.max && chance(PREDATOR.rat.spawnPerMin, d)) spawnRat(s);
    // Diều hâu, chồn chỉ tới khi chủ đang chơi: chạy bù offline không bao giờ làm con vật chết (ADR 0004)
    if (!catchUp && !guardOn(s)) {
      if (!isNight(s) && !s.preds.some(p => p.kind === 'hawk') && chance(PREDATOR.hawk.chancePerMin, d)) {
        const prey = hawkPrey(s);
        if (prey.length) spawnPounce(s, 'hawk', pick(prey));
      }
      const lamps = Math.min(3, mapOf(s).decos.filter(o => o.kind === 'deco_lamp').length);
      if (weaselHour(s) && !s.preds.some(p => p.kind === 'weasel') && chance(PREDATOR.weasel.chancePerMin * Math.pow(PREDATOR.weasel.lampMul, lamps), d)) {
        const prey = strays(s);
        if (prey.length) spawnPounce(s, 'weasel', pick(prey));
      }
    }
  }
  for (const p of [...s.preds]) stepPred(s, p);
  s.preds = s.preds.filter(p => p.state !== 'leaving' || s.time - p.since < PREDATOR.leaveMs);
}
function stepPred(s, p) {
  if (p.state === 'leaving') return;
  const tgt = p.target != null ? s.animals.find(a => a.id === p.target) : null;
  if (p.kind === 'rat') { if (!p.tile) { leavePred(s, p); return; } ratWalk(s, p); }
  else {
    // con mồi đã vào chuồng (hay đã biến mất) thì thôi; chạy bù thì bỏ đi tay không (ADR 0004)
    if (!tgt || (p.kind === 'hawk' ? !tgt.tile : !tgt.stray) || catchUp) { leavePred(s, p); return; }
    p.tx = tgt.x; p.ty = tgt.y;   // điểm luật chọn; world.js đưa p.x/p.y tới đó cho đẹp
    if (p.x == null) { p.x = tgt.x; p.y = tgt.y; }
  }
  if (!s.preds.includes(p)) return;   // vừa dính bẫy
  if (!p.warned && p.strikeAt - s.time <= PREDATOR.warnMs) {
    p.warned = true;
    if (!catchUp) emit({ type: 'predator', kind: p.kind, id: p.id, animal: tgt ? ANIMALS[tgt.type].name : null });
  }
  if (s.time < p.strikeAt) return;
  if (p.kind === 'rat') { ratAct(s, p); p.strikeAt = s.time + PREDATOR.rat.actMs; p.warned = false; return; }
  takeAway(s, tgt, p);
  leavePred(s, p);
}
// Chuột đi lang thang theo ô; ngửi thấy mồi trong bẫy gần đó thì mò tới, bước vào ô có bẫy là dính
function ratWalk(s, p) {
  if (s.time < (p.tileAt || 0)) return;
  p.tileAt = s.time + PREDATOR.rat.moveMs;
  const m = mapOf(s);
  const bait = armedTraps(s).filter(e => far(e, p.tile) <= PREDATOR.trap.lure).sort((a, b) => far(a, p.tile) - far(b, p.tile))[0];
  if (bait) {
    const t = { c: p.tile.c + Math.sign(bait.c - p.tile.c), r: p.tile.r + Math.sign(bait.r - p.tile.r) };
    if (ratOk(m, t.c, t.r)) p.tile = t;
  } else {
    const near = [], R = PREDATOR.rat.radius;
    for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) if (ratOk(m, p.tile.c + dc, p.tile.r + dr)) near.push({ c: p.tile.c + dc, r: p.tile.r + dr });
    if (near.length) p.tile = pick(near);
  }
  const mid = tileMid(p.tile);
  p.tx = mid.x; p.ty = mid.y;                        // world.js cho chuột lon ton tới ô này
  if (p.x == null || Math.hypot(p.x - mid.x, p.y - mid.y) > 6 * TS) Object.assign(p, mid);   // ở xa quá (không có world) thì nhảy tới luôn
  const trap = armedTraps(s).find(e => e.c === p.tile.c && e.r === p.tile.r);
  if (trap) snapTrap(s, trap, p);
}
function snapTrap(s, e, p) {
  e.shut = true;
  s.preds.splice(s.preds.indexOf(p), 1);
  s.stats.rats = (s.stats.rats || 0) + 1;
  addExp(s, PREDATOR.trap.exp);
  emit({ type: 'trapped', id: e.id });
  fxEv(p.x, p.y, 'Bẫy sập! 🪤', COL.good); snd('pop');
  log(s, 'Bẫy chuột sập, bắt được một con chuột. Nhớ gài lại bẫy nhé 🪤');
}
// Chuột ra tay: ăn cám trong máng, trộm trứng, cắn con non. Chạy bù offline chỉ ăn cám và trộm trứng (ADR 0004).
function ratAct(s, p) {
  const pens = Object.keys(s.troughs).filter(k => (s.troughs[k] || 0) > 0);
  const eggs = s.eggs ?? [];
  const babies = catchUp ? [] : s.animals.filter(a => a.stage === 'non' && !a.hurt);
  if (babies.length && ((!pens.length && !eggs.length) || Math.random() < PREDATOR.rat.biteChance)) {
    const a = pick(babies), def = ANIMALS[a.type];
    a.hurt = true; a.hurtMs = 0;
    bondShift(a, -1);
    emit({ type: 'hurt', animal: def.name, id: a.id });
    fxEv(a.x, a.y, 'Bị chuột cắn! 🩹', COL.bad);
    log(s, `${a.name || def.name} bị chuột cắn, cho uống thuốc thú y băng bó ngay nhé`);
    return;
  }
  if (pens.length) {
    const k = pick(pens);
    s.troughs[k] = Math.max(0, s.troughs[k] - 1);
    emit({ type: 'ratFeed', pen: k });
    fxEv(p.x, p.y, 'Chuột ăn cám 🐀', COL.bad);
    return;
  }
  if (eggs.length) {
    const e = pick(eggs);
    s.eggs.splice(s.eggs.indexOf(e), 1);
    emit({ type: 'ratEgg' });
    fxEv(p.x, p.y, 'Chuột trộm trứng 🐀', COL.bad);
  }
}
// Diều hâu cắp đi, chồn tha đi: chỉ xảy ra khi chủ đang chơi (ADR 0004)
function takeAway(s, a, p) {
  const def = ANIMALS[a.type];
  p.carry = a.type;   // render: diều hâu cắp con mồi bay đi
  s.animals.splice(s.animals.indexOf(a), 1);
  emit({ type: 'taken', animal: def.name, id: a.id, pred: p.kind, kind: a.type, sex: a.sex, x: a.x, y: a.y });
  fxEv(a.x, a.y, p.kind === 'hawk' ? 'Diều hâu cắp mất! 😢' : 'Chồn bắt mất! 😢', COL.bad);
  log(s, `${PRED_NAME[p.kind]} đã bắt mất ${(a.name || def.name).toLowerCase()} 😢`);
  grieve(s);
}
// Vết chuột cắn nặng dần theo giờ vườn; không chữa thì con non không qua khỏi.
// ADR 0004: chạy bù offline thì vết thương dừng lại (kẹp ở hurtCapMs), không bao giờ gây chết.
function stepHurt(s, a, d, def) {
  a.hurtMs = (a.hurtMs || 0) + d;
  a.happy = Math.max(0, a.happy - PREDATOR.rat.hurtUnhappyPerMin * d / MIN);
  if (catchUp) { a.hurtMs = Math.min(a.hurtMs, PREDATOR.rat.hurtCapMs); return true; }
  if (a.hurtMs < PREDATOR.rat.hurtDeadMs) return true;
  s.animals.splice(s.animals.indexOf(a), 1);
  emit({ type: 'died', animal: def.name, id: a.id, kind: a.type, sex: a.sex, x: a.x, y: a.y });
  spawnEv('angel', a.x, a.y);
  fxEv(a.x, a.y, 'Lên trời rồi 😇', COL.info);
  log(s, `${a.name || def.name} không qua khỏi vết chuột cắn 😇`);
  leaveGrave(s, a);
  return false;
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
  // trứng: gà, hoặc trứng vịt khi làng đã biết nhà mình nuôi được vịt
  if (Math.random() < 0.3) items[lv >= ANIMALS.vit.lv && Math.random() < 0.4 ? 'trung_vit' : 'trung'] = rint(2, 4);
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
const noItem = k => `Hết ${itemName(k).toLowerCase()}, mua ở ${VET_ITEMS.includes(k) ? 'trạm thú y Cô Út' : 'chợ'} nhé`;

export function actionsFor(s, t) {
  if (!t) return [];
  const f = { plot: (s, t) => withTools(s, t, plotActs(s, t)),lockedPlot: lockedActs, animal: animalActs, egg: eggActs,
    poop: () => [mk('scoop', '💩', 'Xúc phân')], trough: troughActs, gate: gateActs, scale: () => [mk('weigh', '⚖️', 'Cân heo xem số ký')], nest: nestActs, dog: dogActs, threat: threatActs, pred: predActs, building: buildingActs, door: doorActs, deco: decoActs, clutter: clutterActs, strip: stripActs }[t.kind];
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
  A.bath = mk('bath', '🧼', `Tắm (xà phòng còn ${have(s, 'soap')}, bình ${s.can}/${canMax(s)})`, have(s, 'soap') <= 0 ? noItem('soap') : s.can <= 0 ? 'Bình hết nước, ra giếng múc nhé' : null);
  if (a.sick || a.hurt) A.medicine = mk('medicine', 'medicine', `${a.sick ? 'Cho uống thuốc thú y' : 'Băng bó vết chuột cắn'} (còn ${have(s, 'medicine')}${a.sick === 2 ? `, uống ${a.dose || 0}/${SICK.doses[2]} liều` : ''})`, a.sick >= 3 ? 'Nguy kịch, phải gọi bác sĩ thú y ở điện thoại trong nhà' : have(s, 'medicine') <= 0 ? noItem('medicine') : null);
  // vắc-xin: chỉ mời khi trong túi có sẵn và con chưa được bảo vệ (tiêm cả chuồng thì ở máng)
  else if (have(s, 'vaccine') > 0 && !vaccinated(s, a)) A.vaccinate = mk('vaccinate', 'vaccine', `Tiêm vắc-xin (còn ${have(s, 'vaccine')})`);
  // cách ly: chỉ hiện khi con đang bệnh, hoặc đang nằm chuồng cách ly (để đưa về)
  const quar = penTypeOf(s, a) === 'quarantine';
  if (a.sick || quar) A.isolate = quar ? mk('unisolate', '🏠', 'Đưa về chuồng thường') : mk('isolate', '🏥', 'Chuyển vào chuồng cách ly');
  if (animalCan(a, 'vitamin') && !a.sick) A.vitamin = mk('vitamin', '💉', `Cho uống vitamin (còn ${have(s, 'vitamin')})`, have(s, 'vitamin') <= 0 ? noItem('vitamin') : null);
  const first = (a.sick || a.hurt) ? 'medicine' : a.ready ? 'collect' : a.hunger < 40 ? 'feed' : isDirty(a) ? 'bath' : 'pet';
  const list = [A[first], ...Object.entries(A).filter(([k]) => k !== first).map(([, v]) => v)];
  list.push(mk('rename', '✏️', 'Đổi tên'));
  const q = sellQuote(s, a);
  if (animalCan(a, 'sell')) list.push(mk('sell', ICON[a.type], `Bán ${def.name.toLowerCase()} cho Chú Ba (${q.kg != null ? q.kg + ' kg · ' : ''}${q.price} xu)`));
  if (a.stage === 'gia' && !a.retired) list.push(mk('retire', '🪑', 'Cho nghỉ hưu (ở lại trại, không cho sản phẩm, cả chuồng vui hơn)'));
  if (a.retired && TRADE.retireUndo) list.push(mk('unretire', '🪑', 'Cho đi làm lại'));
  return list;
}

function troughActs(s, t) {
  const item = FEED_OF_PEN[t.pen], n = have(s, item);
  if (!item) return [];
  const acts = [mk('fill', '🌾', `Đổ cám vào máng (${s.troughs[t.pen]}/${HUSBANDRY.troughMax})`,
    n <= 0 ? noItem(item) : s.troughs[t.pen] >= HUSBANDRY.troughMax ? 'Máng đầy ắp rồi' : null)];
  const muck = mk('muck', '💩', `Xúc phân chuồng (${Math.floor(s.manure[t.pen] ?? 0)}%)`, (s.manure[t.pen] ?? 0) < MANURE.perScoop ? 'Chuồng còn sạch, chưa cần xúc' : null);
  if (penDirty(s, t.pen)) acts.unshift(muck); else acts.push(muck);
  const penId = t.id ?? mapOf(s).pens[t.pen]?.id;
  const well = s.animals.filter(a => a.pen === penId && !a.sick && !vaccinated(s, a)).length;   // số con tiêm được
  acts.push(mk('vaccinatePen', 'vaccine', `Tiêm vắc-xin cả chuồng (${well} con, còn ${have(s, 'vaccine')})`,
    have(s, 'vaccine') <= 0 ? noItem('vaccine') : !well ? 'Cả chuồng đã tiêm hoặc đang bệnh' : null));
  const up = upgradeInfo(s, penId);   // chạm vào chuồng (qua máng) cũng nâng cấp được
  if (up) acts.push(mk('upgrade', '⬆️', `Nâng chuồng lên cấp ${up.lv} (${fmtXu(up.price)} xu)`, up.error));
  return acts;
}
const fmtXu = n => n.toLocaleString('vi-VN');

function eggActs(s, t) {
  const e = s.eggs.find(x => x.id === t.id);
  if (!e) return [];
  const collect = mk('collect', '🥚', e.candled && e.fertile ? 'Nhặt trứng có phôi' : 'Nhặt trứng', room(s) < 1 ? FULL : null);
  return e.candled ? [collect] : [mk('candle', '🔦', 'Soi trứng'), collect];
}

function nestActs(s) {
  if (s.nest.egg) return [mk('wait', '🪺', `Đang ấp trứng (còn ${mmss(s.nest.hatchAt - s.time)})`, 'Chờ trứng nở nhé')];
  return [mk('incubate', '🥚', `Đặt trứng có phôi vào ổ ấp (còn ${have(s, 'trung_phoi') + have(s, 'trung_vit_phoi')})`, have(s, 'trung_phoi') + have(s, 'trung_vit_phoi') <= 0 ? (have(s, 'trung') + have(s, 'trung_vit') > 0 ? 'Ổ ấp chỉ nhận trứng có phôi, soi trứng ở chuồng nhé' : 'Chưa có trứng có phôi, soi trứng ở chuồng gà nhé') : null)];
}

function dogActs(s) {
  const n = have(s, 'dogfood'), g = s.dog;
  const feed = mk('feed', '🦴', `Cho ${g.name} ăn (còn ${n})`, n <= 0 ? noItem('dogfood') : g.hunger >= 95 ? `${g.name} no rồi` : null);
  const pet = mk('pet', '🤗', `Vuốt ve ${g.name}`);
  const out = g.hunger < 50 ? [feed, pet] : [pet, feed];
  // dạy lệnh và ra lệnh (issue 45)
  const list = trickList(s), left = list.filter(t => !t.done);
  if (left.length) out.push(mk('train', '🎓', `Dạy lệnh cho ${g.name} (còn ${have(s, TRAIN.treat)} bánh thưởng)`, left.some(t => t.can.ok) ? null : left[0].can.msg));
  if (g.cmd) out.push(mk('cmd_stop', '✋', `Cho ${g.name} nghỉ`));
  for (const t of list) if (t.done && !t.auto) out.push(mk('cmd_' + t.id, t.icon, `Lệnh: ${t.name}`));
  return out;
}

function threatActs(s, t) {
  const th = s.threats.find(x => x.id === t.id);
  if (!th) return [];
  if (th.kind === 'crow') return [mk('shoo', '🪶', 'Đuổi quạ', th.state === 'leaving' ? 'Nó bay mất rồi' : null)];
  return [mk('catch', '🧢', 'Bắt thằng Tèo', th.state === 'leaving' && !th.loot ? 'Nó chuồn mất rồi' : null)];
}

// Chạm vào chuột, diều hâu, chồn để đuổi: kịp trong 10 giây cảnh báo thì con vật không bị hại
function predActs(s, t) {
  const p = preds(s).find(x => x.id === t.id);
  if (!p) return [];
  const icon = { rat: '🐀', hawk: '🦅', weasel: '🦊' }[p.kind];
  return [mk('shoo', icon, `Đuổi ${PRED_NAME[p.kind].toLowerCase()}`, p.state === 'leaving' ? 'Nó chạy mất rồi' : null)];
}

// ---------- Bán cho Chú Ba, nghỉ hưu (issue 40) ----------
// Báo giá: { price, kg (heo, null với loài khác), unit (xu/kg hôm nay), need (số lần phải xác nhận) }
export function sellQuote(s, a) {
  const pig = a.type === 'heo', kg = pig ? Math.round((a.weight || WEIGHT.heo[0]) * 10) / 10 : null;
  const mul = TRADE.bondMul[(a.bond || 2) - 1] * (a.sick ? TRADE.sickMul : 1) * ((a.dirty || 0) >= BOND.dirtyAbove ? TRADE.dirtyMul : 1);
  const base = pig ? kg * pigKgPrice(s.day) : ANIMALS[a.type].sell * TRADE.stageMul[a.stage];
  return { price: Math.floor(base * mul), kg, unit: pig ? pigKgPrice(s.day) : null, need: a.bond >= TRADE.confirmBond ? TRADE.confirms : 0 };
}
// Bán con `id`: `confirms` = số lần người chơi đã xác nhận (con ❤️4+ cần 2). → R { coins, kg, sold } (sold: để vẽ cảnh Chú Ba dắt đi)
export function sellAnimal(s, id, confirms = 0) {
  const a = s.animals.find(x => x.id === id);
  if (!a) return bad('Không thấy con vật này');
  const at = { x: a.x ?? 0, y: a.y ?? 0 }, nm = ANIMALS[a.type].name.toLowerCase();
  if (!animalCan(a, 'sell')) return bad('Còn bé quá, Chú Ba chưa mua đâu', at);
  const q = sellQuote(s, a);
  if (confirms < q.need) return bad(`Con ${nm} này thân lắm ${'❤️'.repeat(a.bond)}, phải xác nhận ${q.need} lần mới bán`, at);
  s.animals.splice(s.animals.indexOf(a), 1); addCoins(s, q.price);
  log(s, `Bán ${nm}${q.kg != null ? ` ${q.kg} kg` : ''} cho Chú Ba được ${q.price} xu`);
  return res(true, `Chú Ba trả ${q.price} xu`, [say(at, `+${q.price} xu`, COL.coin)], 'coin',
    { coins: q.price, kg: q.kg, sold: { type: a.type, stage: a.stage, sex: a.sex, x: a.x, y: a.y, price: q.price, kg: q.kg, unit: q.unit } });
}
// Cho con già nghỉ hưu: ở lại trại, chiếm một chỗ, không cho sản phẩm, cả chuồng vui hơn
export function retireAnimal(s, id) {
  const a = s.animals.find(x => x.id === id);
  if (!a) return bad('Không thấy con vật này');
  if (a.stage !== 'gia') return bad('Chỉ con già mới nghỉ hưu được');
  if (a.retired) return bad('Nó nghỉ hưu rồi');
  a.retired = true; a.ready = false;
  log(s, `${ANIMALS[a.type].name} đã nghỉ hưu, ở lại trại hưởng phúc`);
  return res(true, 'Nghỉ hưu rồi 🪑', [say({ x: a.x ?? 0, y: a.y ?? 0 }, 'Nghỉ hưu 🪑', COL.info)], 'pop');
}
// Cân heo ở chuồng heo `penId` (bỏ trống: mọi con heo): [{ id, name, kg }] của từng con
export function weighPigs(s, penId) {
  if (penId != null) settlePens(s);
  return s.animals.filter(a => a.type === 'heo' && (penId == null || a.pen === penId))
    .map(a => ({ id: a.id, name: a.name, kg: Math.round((a.weight || WEIGHT.heo[0]) * 10) / 10 }));
}

// Chỗ trong làng chưa mở: chạm vào chỉ có lời nhắn
const TALK = {
  houseC: { icon: '🤝', label: 'Chào Chú Ba', msg: 'Chú Ba: muốn bán con vật thì chọn Bán, tôi sẽ tới cổng trại dắt đi. Heo thì tính theo ký nhé!' },
  friendGate: { icon: '🚪', label: 'Xem cổng bạn bè', msg: 'Sắp ra mắt: thăm bạn bè' },
};
function buildingActs(s, t) {
  const b = sceneMap(s).building(t.id);
  if (!b) return [];
  const open = { shed: ['📦', 'Vào nhà kho'], shipbin: ['📮', 'Mở thùng giao hàng'], board: ['📋', 'Xem đơn hàng'], wardrobe: ['👕', 'Mở tủ đồ'], smithy: ['🔨', 'Vào tiệm rèn'], vet: ['💊', 'Vào trạm thú y Cô Út'], phone: ['📞', 'Gọi bác sĩ thú y'] }[b.id];
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
  if (e?.kind === 'grave') return [mk('flower', '🌸', e.flower ? 'Mộ đã có hoa' : `Đặt hoa lên mộ (chậu hoa còn ${have(s, 'deco_flower')})`, e.flower ? 'Mộ đã có hoa rồi' : have(s, 'deco_flower') <= 0 ? 'Cần một chậu hoa, mua ở chợ nhé' : null)];
  if (e?.item === 'deco_rattrap') return [mk('arm', '🪤', e.shut ? 'Gài lại bẫy chuột' : 'Bẫy chuột đã gài', e.shut ? null : 'Bẫy đang gài sẵn, chờ chuột thôi')];
  return e?.item === 'deco_bench' ? benchActs(s) : [];
}

// Bụi, đá trên đất mới: { kind: 'clutter', id }. Dọn bằng tay, tốn thể lực, được gỗ / đá vào kho.
function clutterActs(s, t) {
  const e = s.farm.ents.find(x => x.id === t.id), d = e && CLUTTER[e.kind];
  return d ? [mk('clear', d.icon, `${d.act} (+${d.qty} ${itemName(d.item).toLowerCase()})`)] : [];
}
// Mua dải đất ở mép vườn: { kind: 'strip', dir }
function stripActs(s, t) {
  const d = nextStrip(s, t.dir);
  if (!d) return [];
  return [mk('buy', '🗺️', `Mua đất phía ${DIR_NAME[t.dir]} — ${d.price} xu, cấp ${d.level}`, level(s) < d.level ? `Cần cấp ${d.level} mới mua được` : s.coins < d.price ? 'Chưa đủ xu' : null)];
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
  if (t.kind === 'trough') return troughOf(m, t) ?? s.player;
  if (t.kind === 'gate') return gateOf(s, t.id) ?? s.player;
  if (t.kind === 'scale') return (m.penById[t.id] ?? m.pens[t.pen])?.scale ?? s.player;
  if (t.kind === 'nest') return m.building('coop')?.at ?? s.player;
  if (t.kind === 'building') return sceneMap(s).building(t.id)?.at ?? s.player;
  if (t.kind === 'door') return doorOf(s, t.to)?.at ?? s.player;
  if (t.kind === 'deco') return m.decos.find(d => d.id === t.id) ?? s.player;
  if (t.kind === 'clutter') { const e = s.farm.ents.find(x => x.id === t.id); return e ? { x: e.c * TS + 8, y: e.r * TS + 8 } : s.player; }
  if (t.kind === 'dog') return s.dog;
  const list = { animal: s.animals, egg: s.eggs, poop: s.poops, threat: s.threats, pred: s.preds }[t.kind];
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
  advanceTutorial(s);
  return r;
}

// Trừ thể lực; vừa hết thì báo một lần
function spend(s, n) {
  const was = s.stamina;
  s.stamina = Math.max(0, s.stamina - n);
  if (was > 0 && s.stamina <= 0) toast('Hết sức rồi, đi và làm sẽ chậm hơn. Ngủ hay ngồi ghế đá cho khỏe lại nhé 😮‍💨');
}

const say = (at, text, color = COL.good) => ({ text, color, x: at.x, y: at.y });
// Cộng độ thân và trả chữ bay "+❤️" (hoặc "❤️N!" khi lên tim); hết lượt trong ngày thì không bay thêm
function heartFx(s, a, at, reason) {
  const was = a.bond;
  if (!addBond(s, a, reason)) return [];
  return [say(at, a.bond > was ? `Thân hơn rồi ${'❤️'.repeat(a.bond)}` : '+❤️', '#ff7a9c')];
}

function doArea(s, tiles, id) {
  const rs = tiles.map(idx => { const c = plotCenter(s, idx); return DO.plot(s, { kind: 'plot', idx }, id, { x: c.x, y: c.y }); });
  return res(true, `Xong ${tiles.length} ô`, rs.flatMap(r => r.fx), rs[0].sound);
}

const DO = {
  gate(s, t, id, at) { return scatter(s, t, at); },
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
      case 'feed': take(s, def.feed); a.hunger = 100; return res(true, 'Ăn no nê', [say(at, 'Ngon quá! 😋'), ...heartFx(s, a, at, 'feed')], 'eat', { bond: a.bond });
      case 'pet': a.happy = Math.min(100, a.happy + HUSBANDRY.petHappy); return res(true, 'Vui quá', [say(at, '❤️'), ...heartFx(s, a, at, 'pet')], sound, { bond: a.bond });
      case 'bath':
        take(s, 'soap'); s.can--;
        a.dirty = 0; a.wallowAt = s.time + DIRT.wallowAfterMs;
        a.happy = Math.min(100, a.happy + DIRT.bathHappy);
        emit({ type: 'bathed', animal: def.name, id: a.id });
        advanceCoUtQuest(s, 'bathe');
        return res(true, `${def.name} sạch bong, vui hẳn lên`, [say(at, 'Sạch bong! ✨'), ...heartFx(s, a, at, 'bath')], 'water', { bath: a.id });
      case 'medicine': {
        const r = giveMedicine(s, a.id);
        if (!r.ok) return bad(r.msg, at);
        return res(true, r.msg, r.cured ? [say(at, 'Khỏe rồi! 💪'), ...heartFx(s, a, at, 'cure')] : [say(at, `Thuốc ${r.dose}/${SICK.doses[2]} 💊`)], 'spray');
      }
      case 'vaccinate': { const r = vaccinate(s, a.id); return r.ok ? res(true, r.msg, [say(at, 'Tiêm xong! 💉')], 'spray') : bad(r.msg, at); }
      case 'isolate': case 'unisolate': { const r = id === 'isolate' ? isolate(s, a.id) : unisolate(s, a.id); return r.ok ? res(true, r.msg, [say(at, id === 'isolate' ? 'Cách ly 🏥' : 'Về chuồng 🏠')], 'pop') : bad(r.msg, at); }
      case 'vitamin':
        // lớn vọt thêm một nửa giai đoạn đang ở (không vượt quá đầu giai đoạn trưởng thành)
        take(s, 'vitamin'); a.age = Math.min(stageStart(a.type, 'truong'), a.age + LIFE[a.type][a.stage] * HUSBANDRY.vitaminBoost);
        ageUp(s, a, a.type, def);
        return res(true, 'Lớn vọt lên', [say(at, 'Lớn vọt! ⚡')], 'spray');
      case 'milk': case 'shear': {
        const star = Math.random() < starChance(s, a), prod = star ? BOND.starOf[def.product] : def.product;
        a.ready = false; a.nextProduct = s.time + productEvery(a); give(s, prod); addExp(s, def.exp);
        return res(true, `Được 1 ${PRODUCTS[prod].name}`, [say(at, `+1 ${PRODUCTS[prod].name}${star ? ' ⭐' : ''}`)], sound);
      }
      case 'rename': return res(true, '', [], 'click', { rename: a.id });   // UI mở hộp nhập tên rồi gọi renameAnimal
      case 'sell': return sellAnimal(s, a.id, t.confirms ?? 0);
      case 'retire': return retireAnimal(s, a.id);
      case 'unretire': a.retired = false; return res(true, 'Đi làm lại thôi', [say(at, 'Làm lại! 💪')], 'pop');
    }
  },

  egg(s, t, id, at) {
    const e = s.eggs.find(x => x.id === t.id);
    if (id === 'candle') {   // soi: biết có phôi hay không (trứng trống nhặt về vẫn bán được)
      e.candled = true;
      return res(true, e.fertile ? 'Trứng có phôi, ấp được đấy' : 'Trứng trống, không có phôi', [say(at, e.fertile ? 'Có phôi! ✨' : 'Trứng trống', e.fertile ? COL.good : COL.info)], 'pop', { fertile: !!e.fertile });
    }
    s.eggs.splice(s.eggs.indexOf(e), 1);
    const fert = !!(e.candled && e.fertile);   // chưa soi thì không biết có phôi: nhặt như trứng thường
    const sp = eggSp(e), item = EGG_OF[sp][fert ? 1 : 0], nm = PRODUCTS[item].name;
    give(s, item); s.stats.eggs++; addExp(s, ANIMALS[sp].exp);
    if (fert) { s.clutch.push({ sp, mom: e.mom, dad: e.dad }); if (s.clutch.length > 60) s.clutch.shift(); }
    return res(true, fert ? `Nhặt được 1 ${nm.toLowerCase()}` : 'Nhặt được 1 quả trứng', [say(at, `+1 ${nm}`)], 'pop');
  },

  poop(s, t, id, at) {
    s.poops.splice(s.poops.findIndex(p => p.id === t.id), 1);
    s.stats.poops++; addExp(s, 2);
    const fert = Math.random() < DOG.poopFertChance;
    if (fert) give(s, 'fertilizer');
    return res(true, fert ? 'Xúc được 1 phân bón' : 'Đã dọn sạch bãi phân', [say(at, fert ? '+1 Phân bón' : '✨ Sạch rồi')], 'dig');
  },

  scale(s, t, id, at) {   // cân heo: báo số ký từng con trong chuồng có cân này (t.id = id chuồng)
    const w = weighPigs(s, t.id);
    return res(true, w.length ? 'Cân heo: ' + w.map(p => `${p.name || 'Heo'} ${p.kg} kg`).join(' · ') : 'Chưa có con heo nào để cân', [], 'click');
  },

  trough(s, t, id, at) {
    if (id === 'upgrade') {
      const r = upgradePen(s, t.id ?? mapOf(s).pens[t.pen]?.id);
      return res(r.ok, r.msg, r.ok ? [say(at, `Cấp ${r.lv}! ⬆️`)] : [], r.ok ? 'coin' : 'error');
    }
    if (id === 'vaccinatePen') {
      const r = vaccinatePen(s, t.id ?? mapOf(s).pens[t.pen]?.id);
      return r.ok ? res(true, r.msg, [say(at, `${r.n} mũi 💉`)], 'spray') : bad(r.msg, at);
    }
    if (id === 'muck') {
      const n = Math.max(1, Math.floor(s.manure[t.pen] / MANURE.perScoop));
      s.manure[t.pen] = 0; give(s, 'manure', n); addExp(s, 2);
      emit({ type: 'mucked', pen: t.pen, qty: n });
      return res(true, `Chuồng sạch bong, được ${n} phân chuồng`, [say(at, `+${n} Phân chuồng`), say({ x: at.x, y: at.y - 10 }, '✨ Sạch rồi')], 'dig');
    }
    take(s, FEED_OF_PEN[t.pen]);
    s.troughs[t.pen] = Math.min(HUSBANDRY.troughMax, s.troughs[t.pen] + HUSBANDRY.unitsPerBag);
    return res(true, 'Đã đổ cám vào máng', [say(at, `+${HUSBANDRY.unitsPerBag} phần ăn`)], 'eat');
  },

  nest(s, t, id, at) {
    const sp = have(s, 'trung_phoi') > 0 ? 'ga' : 'vit', item = EGG_OF[sp][1];
    const mine = s.clutch.filter(c => eggSp(c) === sp);   // trứng có phôi đã bán bớt: bỏ gốc gác cũ nhất của loài này
    for (const c of mine.slice(0, Math.max(0, mine.length - have(s, item)))) s.clutch.splice(s.clutch.indexOf(c), 1);
    take(s, item);
    const i = s.clutch.findIndex(c => eggSp(c) === sp), p = i >= 0 ? s.clutch.splice(i, 1)[0] : null;
    s.nest.sp = sp; s.nest.egg = true; s.nest.hatchAt = s.time + HUSBANDRY.nestHatchMs; s.nest.mom = p?.mom ?? null; s.nest.dad = p?.dad ?? null;
    return res(true, 'Đã đặt trứng vào ổ ấp', [say(at, 'Ấp nào! 🥚')], 'pop');
  },

  dog(s, t, id, at) {
    const g = s.dog;
    if (id === 'feed') { take(s, 'dogfood'); g.hunger = 100; return res(true, `${g.name} ăn ngon lành`, [say(at, 'Gâu gâu! 🦴')], 'bark'); }
    if (id === 'train') return res(true, `Chọn lệnh muốn dạy ${g.name}`, [], 'pop', { open: 'dog' });
    if (id === 'cmd_guard') return res(true, `Chạm vào chỗ muốn ${g.name} gác`, [say(at, '🛡️ Chọn chỗ gác')], 'pop', { pickSpot: 'guard' });
    if (id === 'cmd_stop' || id.startsWith('cmd_')) {
      const tid = id === 'cmd_stop' ? 'stop' : id.slice(4);
      const r = commandDog(s, tid);
      return res(r.ok, r.msg, r.ok ? [say(at, tid === 'stop' ? '✋' : `${TRICKS[tid].icon} ${TRICKS[tid].name}!`)] : []);
    }
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

  pred(s, t, id, at) {
    const p = s.preds.find(x => x.id === t.id);
    s.preds.splice(s.preds.indexOf(p), 1);
    s.stats.preds = (s.stats.preds || 0) + 1;
    addExp(s, PREDATOR.shooExp);
    emit({ type: 'shooed', pred: p.kind, id: p.id });
    return res(true, `${PRED_NAME[p.kind]} chạy mất dép`, [say(at, 'Xùy! 💨')], p.kind === 'hawk' ? 'crow' : 'pop');
  },

  building(s, t, id, at) {
    if (id === 'refill') { s.can = canMax(s); return res(true, 'Đã múc đầy bình', [say(at, 'Đầy bình! 💧', '#7ad7ff')], 'water'); }
    if (id === 'enter') return res(true, '', [], 'click', { go: BUILDING_DEFS[t.id].door.to });
    if (id === 'talk') return res(true, TALK[t.id].msg, [], 'click');
    if (id === 'sit') return sitDown(s, at);
    if (id === 'sleep') return res(true, '', [], 'click', { sleep: true });   // main mờ màn hình rồi gọi sleep(s)
    return res(true, '', [], 'click', { open: t.id === 'wardrobe' ? 'house' : t.id });
  },

  deco(s, t, id, at) {
    if (id === 'flower') { const r = placeFlower(s, t.id); return r.ok ? res(true, r.msg, [say(at, '🌸')], 'pop') : bad(r.msg, at); }
    if (id === 'arm') {
      const e = s.farm.ents.find(x => x.id === t.id);
      e.shut = false;
      return res(true, 'Đã gài lại bẫy chuột', [say(at, 'Gài bẫy 🪤')], 'click');
    }
    return sitDown(s, at);
  },

  clutter(s, t, id, at) {
    const i = s.farm.ents.findIndex(x => x.id === t.id), d = CLUTTER[s.farm.ents[i]?.kind];
    if (!d) return bad('Không thấy đâu cả', at);
    s.farm.ents.splice(i, 1);
    bumpLayout(s);
    give(s, d.item, d.qty);
    spend(s, STAMINA.cost[d.cost]);
    return res(true, `Được ${d.qty} ${itemName(d.item).toLowerCase()}`, [say(at, `+${d.qty} ${itemName(d.item)}`, COL.good)], 'pop');
  },

  // Mua đất phải xác nhận: main.js hỏi rồi mới gọi buyStrip
  strip(s, t) { return res(true, '', [], 'click', { buyStrip: t.dir }); },

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
  // lệnh Đi theo: chó lẽo đẽo sang bản đồ mới luôn; không thì nó ở lại vườn
  const g = s.dog;
  if (g.cmd?.id === 'follow' && knowsTrick(s, 'follow')) { g.scene = to; Object.assign(g, { x: a.x, y: a.y + 6 }); }
  else if (g.scene && g.scene !== 'farm') g.scene = 'farm';
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
  if (it.kind === 'seed') { s.stats.bought++; advanceTutorial(s); }
  return R(true, `Đã mua ${qty} ${it.name.toLowerCase()}`);
}

// sex: 'm' đực (giá gốc) | 'f' cái (đắt hơn BREED.femaleMul). Không nói thì mua con đực.
export function buyAnimal(s, type, sex = 'm') {
  if (!marketOpen(s)) return closed();
  const def = ANIMALS[type];
  if (!def) return R(false, 'Không có con này');
  if (level(s) < def.lv) return R(false, `Cần cấp ${def.lv} mới mua được`);
  if (!penEnts(s, def.pen).length) return R(false, `Bạn chưa có ${PEN_DEFS[def.pen].name.toLowerCase()}, xây chuồng trước nhé`, { reason: 'no_pen' });
  const pen = roomyPen(s, def.pen);
  if (!pen) return R(false, `${PEN_DEFS[def.pen].name} đã chật rồi, nâng cấp hoặc xây thêm chuồng nhé`, { reason: 'full' });
  if (sex !== 'm' && sex !== 'f') return R(false, 'Chọn đực hay cái nhé', { reason: 'sex' });
  const price = animalPrice(type, sex);
  if (s.coins < price) return R(false, 'Chưa đủ xu, cố lên nhé');
  const firstPig = type === 'heo' && !s.coUtQuest && !s.animals.some(a => a.type === 'heo');
  s.coins -= price;
  const p = penPoint(s, def.pen, pen.id);
  mkAnimal(s, type, 'non', p.x, p.y, { pen: pen.id, sex });
  if (firstPig) { s.coUtQuest = { step: 0 }; log(s, 'Cô Út: Heo đầu tiên à? Để tôi chỉ bạn tắm, chữa bệnh và tiêm vắc-xin cho heo nhé!'); }
  return R(true, `Đã mua ${def.baby.toLowerCase()} ${sex === 'm' ? 'đực' : 'cái'}`, { price });
}

// ---------- Nhiệm vụ làm quen của Cô Út: tắm → chữa bệnh → vắc-xin (issue 48) ----------
// Mở khi mua con heo đầu tiên (buyAnimal ở trên). Tiến độ lưu ở s.coUtQuest = { step }, không chạy lại.
export function coUtQuestInfo(s) {
  const q = s.coUtQuest;
  if (!q) return null;
  const step = Math.min(q.step, CO_UT_QUEST.length);
  return { step, total: CO_UT_QUEST.length, id: CO_UT_QUEST[step] ?? null, done: step >= CO_UT_QUEST.length };
}
// Gọi khi người chơi vừa làm xong một việc chăm sóc (kind: 'bathe'|'cure'|'vaccinate'); chỉ tính nếu đúng bước đang mở.
function advanceCoUtQuest(s, kind) {
  const q = s.coUtQuest;
  if (!q || q.step >= CO_UT_QUEST.length || CO_UT_QUEST[q.step] !== kind) return;
  q.step++;
  if (q.step >= CO_UT_QUEST.length) log(s, 'Cô Út: Giỏi lắm, bạn đã biết chăm heo rồi đó!');
}
// Bỏ qua bước đang mở (người chơi đã biết rồi, khỏi phải làm lại)
export function skipCoUtQuest(s) {
  const q = s.coUtQuest;
  if (!q || q.step >= CO_UT_QUEST.length) return R(false, 'Không có nhiệm vụ nào đang mở');
  q.step++;
  return R(true, 'Đã bỏ qua bước này');
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
  s.stats.shipped++; advanceTutorial(s);
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
export const canMove = e => !!e && e.kind !== 'tree' && !CLUTTER[e.kind] && !BUILDING_DEFS[e.kind]?.fixed;
export function entName(e) {
  if (e.kind === 'field') return 'Khối ruộng';
  if (e.kind === 'pen') return PEN_DEFS[e.pen].name;
  if (e.kind === 'deco') return ITEMS[e.item]?.name ?? 'Đồ trang trí';
  if (e.kind === 'tree') return 'Cây';
  if (e.kind === 'grave') return e.name ? `Mộ của ${e.name}` : 'Ngôi mộ';
  if (CLUTTER[e.kind]) return CLUTTER[e.kind].name;
  return BUILDING_DEFS[e.kind]?.name ?? 'Công trình';
}

// Những chỗ phải đi tới được từ cổng: cửa nhà, chỗ đứng của công trình, cửa chuồng, khối ruộng.
function access(m) {
  const from = m.gateIn ?? m.spawn, out = [];
  const add = (key, name, p) => out.push({ key, name, ok: reachable(m, from, p) });
  const mid = (c, r) => ({ x: c * TS + 8, y: r * TS + 8 });
  for (const b of m.buildings) if (b.at && b.id !== 'gate') add(b.id === 'house' ? 'house' : `b${b.ent.id}${b.id}`, b.name, b.at);
  for (const p of m.penList) add(`p${p.ent.id}`, p.name, mid(...p.gates[0]));
  for (const e of m.fields) add(`f${e.id}`, 'Khối ruộng', mid(e.c + 1, e.r + 1));
  return out;
}

export function canPlace(s, what, c, r) {
  const f = s.farm, old = what.id != null ? f.ents.find(e => e.id === what.id) : null;
  if (what.id != null && !old) return no('missing', 'Không thấy công trình này');
  if (old && !canMove(old)) return no('fixed', `${entName(old)} không dời được`);
  if (!old && what.kind === 'pen') {   // chuồng mới: cấp tối thiểu rồi tới số chuồng tối đa mỗi loại theo cấp
    if (!PEN_TABLE[what.pen]) return no('missing', 'Không có loại chuồng này');
    if (level(s) < penLevel(what.pen)) return no('level', `Cần cấp ${penLevel(what.pen)} mới xây ${PEN_DEFS[what.pen].name.toLowerCase()} được`);
    if (penEnts(s, what.pen).length >= penLimit(s, what.pen)) {
      const nx = penNextLevel(s, what.pen);
      return no('max_pens', nx ? `Đã đủ ${penLimit(s, what.pen)} ${PEN_DEFS[what.pen].name.toLowerCase()}, lên cấp ${nx} để xây thêm` : `Đã đủ số ${PEN_DEFS[what.pen].name.toLowerCase()} tối đa`);
    }
  }
  const e = { ...(old ?? what), c, r }, ft = footprint(e), o = f.owned;
  if (ft.c < o.c || ft.r < o.r || ft.c + ft.w > o.c + o.w || ft.r + ft.h > o.r + o.h) return no('outside', 'Chỗ này ngoài đất của bạn');
  if (f.ents.some(x => CLUTTER[x.kind] && overlaps(ft, footprint(x)))) return no('uncleared', 'Còn bụi cây, đá chưa dọn');
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

// ---------- Mua đất theo dải ----------
// owned luôn là một hình chữ nhật: mỗi lần mua thêm một dải dày LAND_STRIP.depth ô sát một cạnh, dài bằng cạnh đó, không vượt bản đồ.
// Giá & cấp theo số dải đã mua (s.farm.strips, mọi hướng cộng chung).
export function nextStrip(s, dir) {
  const f = s.farm, o = f.owned, tier = LAND_STRIPS[f.strips ?? 0], d = LAND_STRIP.depth;
  if (!tier || !DIR_NAME[dir]) return null;
  const h = dir === 'N' ? Math.min(d, o.r) : dir === 'S' ? Math.min(d, f.mh - o.r - o.h) : o.h;
  const w = dir === 'W' ? Math.min(d, o.c) : dir === 'E' ? Math.min(d, f.mw - o.c - o.w) : o.w;
  if (w <= 0 || h <= 0) return null;
  const c = dir === 'E' ? o.c + o.w : dir === 'W' ? o.c - w : o.c, r = dir === 'S' ? o.r + o.h : dir === 'N' ? o.r - h : o.r;
  return { c, r, w, h, dir, price: tier.price, level: tier.lv };
}

// Cổng nằm sát mép Nam thì dời xuống mép mới (kéo dài đường đất ra cổng), để lối ra làng vẫn ở rìa vườn.
function moveGate(f, dy) {
  const g = f.ents.find(e => e.kind === 'gate'), o = f.owned;
  if (!g || g.r + 2 < o.r + o.h) return;
  const cols = [g.c - 2, g.c - 1], from = g.r + 1;
  g.r += dy;
  for (let r = from; r <= g.r + 1; r++) for (const c of cols) f.paths.push([c, r]);
}

export function buyStrip(s, dir) {
  if (s.scene && s.scene !== 'farm') return R(false, 'Ra vườn rồi hãy mua đất nhé', { reason: 'scene' });
  const d = nextStrip(s, dir);
  if (!d) return R(false, DIR_NAME[dir] ? `Hết đất để mua phía ${DIR_NAME[dir]}` : 'Không có hướng này', { reason: 'max' });
  if (level(s) < d.level) return R(false, `Cần cấp ${d.level} mới mua được đất phía ${DIR_NAME[dir]}`, { reason: 'level' });
  if (s.coins < d.price) return R(false, 'Chưa đủ xu', { reason: 'coins' });
  const f = s.farm;
  s.coins -= d.price;
  if (dir === 'S') moveGate(f, d.h);
  f.owned = { c: Math.min(f.owned.c, d.c), r: Math.min(f.owned.r, d.r), w: f.owned.w + (d.dir === 'E' || d.dir === 'W' ? d.w : 0), h: f.owned.h + (d.dir === 'N' || d.dir === 'S' ? d.h : 0) };
  f.strips = (f.strips ?? 0) + 1;
  // rải bụi, đá lên ô trống của dải (theo băm toạ độ); chừa đường đất, chỗ cổng và lối ra
  const taken = new Set(f.paths.map(([c, r]) => c + ',' + r));
  const g = f.ents.find(e => e.kind === 'gate');
  if (g) for (const [dc, dr] of [[0, 0], [1, 0], [2, 0], [-2, 1], [-1, 1]]) taken.add((g.c + dc) + ',' + (g.r + dr));
  for (const e of f.ents) { const ft = footprint(e); for (let y = ft.r; y < ft.r + ft.h; y++) for (let x = ft.c; x < ft.c + ft.w; x++) taken.add(x + ',' + y); }
  for (let r = d.r; r < d.r + d.h; r++) for (let c = d.c; c < d.c + d.w; c++) {
    if (taken.has(c + ',' + r)) continue;
    const h = (tileHash(c, r) % 1000) / 1000;
    const kind = h < CLUTTER_RATE.bush ? 'bush' : h < CLUTTER_RATE.bush + CLUTTER_RATE.rock ? 'rock' : null;
    if (kind) f.ents.push({ id: s.nextId++, kind, c, r });
  }
  bumpLayout(s);
  unstick(s);
  return R(true, `Đã mua đất phía ${DIR_NAME[dir]}`, { dir, sound: 'coin' });
}

// ---------- Đặt đồ mới & cất đồ (chế độ xây dựng) ----------
export const fieldCount = s => s.farm.ents.filter(e => e.kind === 'field').length;
export const fieldLimit = s => FIELD_LIMITS.reduce((n, [lv, k]) => (level(s) >= lv ? k : n), 0);
export const fieldNextLevel = s => FIELD_LIMITS.find(([, k]) => k > fieldLimit(s))?.[0] ?? null;   // cấp để có thêm khối; null = đã tối đa
export const fieldCost = s => (fieldCount(s) < 1 ? 0 : FIELD_PRICES[Math.min(fieldCount(s), FIELD_PRICES.length) - 1]);   // giá khối kế tiếp
export const penLevel = pen => PEN_TABLE[pen]?.lv;   // cấp người chơi để xây chuồng loại đó
export const penLimit = (s, pen) => PEN_TABLE[pen].limit.reduce((n, [lv, k]) => (level(s) >= lv ? k : n), 0);   // số chuồng loại đó tối đa ở cấp hiện tại
export const penNextLevel = (s, pen) => PEN_TABLE[pen].limit.find(([, k]) => k > penLimit(s, pen))?.[0] ?? null;

// Chuyển con vật sang chuồng khác (vd. vào chuồng cách ly): chuồng đúng loài hoặc chuồng cách ly, còn chỗ.
export function moveAnimal(s, animalId, penId) {
  const a = s.animals.find(x => x.id === animalId), e = s.farm.ents.find(x => x.id === penId && x.kind === 'pen');
  if (!a || !e) return R(false, 'Không thấy con vật hoặc chuồng', { reason: 'missing' });
  if (e.pen !== 'quarantine' && e.pen !== ANIMALS[a.type].pen) return R(false, `${PEN_DEFS[e.pen].name} không nhận ${ANIMALS[a.type].name.toLowerCase()}`, { reason: 'species' });
  settlePens(s);
  if (a.pen === e.id) return R(true, '');
  if (penUse(s, e.id) >= penCapOf(e)) return R(false, `${PEN_DEFS[e.pen].name} đã chật rồi`, { reason: 'full' });
  a.pen = e.id;
  const p = penPoint(s, e.pen, e.id);
  Object.assign(a, { x: p.x, y: p.y, tile: null });
  return R(true, `Đã chuyển ${ANIMALS[a.type].name.toLowerCase()} sang ${PEN_DEFS[e.pen].name.toLowerCase()}`, { id: a.id });
}

// Nâng cấp chuồng (hoặc chuồng chó) id lên cấp kế: trừ xu, sức chứa tăng ngay, con vật giữ nguyên.
const upKey = e => (e?.kind === 'pen' ? e.pen : e?.kind);
export function upgradeInfo(s, id) {   // → { lv: cấp sau khi nâng, price, need: cấp người chơi cần, error?: lý do chưa nâng được } | null (đã tối đa / không nâng được)
  const e = s.farm.ents.find(x => x.id === id), t = PEN_TABLE[upKey(e)];
  if (!t || penLv(e) >= PEN_LEVELS) return null;
  const i = penLv(e) - 1, price = t.up[i], need = t.upLv[i];
  const error = level(s) < need ? `Cần cấp ${need} mới nâng cấp được` : s.coins < price ? 'Chưa đủ xu, cố lên nhé' : null;
  return { lv: penLv(e) + 1, price, need, ...(error ? { error } : {}) };
}
export function upgradePen(s, id) {
  if (s.scene && s.scene !== 'farm') return R(false, 'Ra vườn rồi hãy nâng cấp nhé', { reason: 'scene' });
  const e = s.farm.ents.find(x => x.id === id);
  if (!PEN_TABLE[upKey(e)]) return R(false, 'Không nâng cấp được món này', { reason: 'missing' });
  const up = upgradeInfo(s, id);
  if (!up) return R(false, `${entName(e)} đã cấp tối đa rồi`, { reason: 'max' });
  if (level(s) < up.need) return R(false, up.error, { reason: 'level' });
  if (s.coins < up.price) return R(false, up.error, { reason: 'coins' });
  s.coins -= up.price; e.lv = up.lv;
  bumpLayout(s);
  return R(true, `Đã nâng ${entName(e).toLowerCase()} lên cấp ${up.lv}`, { id, lv: up.lv, sound: 'coin' });
}
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
    settlePens(s);
    for (const a of s.animals) if (a.pen === e.id && a.x != null) { a.x += dx; a.y += dy; a.scaredUntil = s.time + SCARED_MS; }
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
