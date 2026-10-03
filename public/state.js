// Mô hình dữ liệu + luật chơi. Thuần JS, không DOM (localStorage có bọc try/catch).
import {
  DAY_MS, NIGHT_FROM, MAX_CATCHUP_MS, GRID, START_PLOTS, CROPS, CROP_STAGES, OVERRIPE, RIPE_FLOOR, WILT_WARN, FARMING,
  ANIMALS, PEN_TABLE, PEN_LEVELS, HUSBANDRY, DIRT, MANURE, DOG, GUARD, WALK_SPEED, THREATS, RAID, ITEMS, PRODUCTS, LOOK, HATS, ACCS, DEFAULT_LOOK, START, MARKET, STAMINA, TOOLS, TOOL_MAX, TOOL_LEVEL, GROUP_COST,
  expandCost, expandLevel, FIELD_LIMITS, FIELD_PRICES, PEN_PRICES, levelInfo, ORDERS, NOTIFY_CATS, ACHIEVEMENTS, itemName, sellPrice, shipValue,
  LAND_STRIP, LAND_STRIPS, DIR_NAME, CLUTTER, CLUTTER_RATE, SPEEDS, GUEST, HELP_JOBS, GIFT,
  LIFE, STAGES, STAGE_NAME, STAGE_CAN, AGING, WEIGHT, stageStart, stageAt, lifeEnd, weightAt, BOND, TRADE, pigKgPrice, BREED, animalPrice, FREE, SICK, VET_ITEMS, PREDATOR,
  TRICKS, TRICK_BASE, TRAIN, CAT, BUILD_PRICES, CO_UT_QUEST, COATS, COAT, DELIVERY,
} from './data.js';
import { TS, GROUND, PEN_DEFS, BUILDING_DEFS, FIELD_SIZE, tileHash } from './layout.js';
import { mapOf, reachable, bumpLayout, footprint, buildMap, sceneMap, hasScene, troughOf } from './farm.js';
import { migrate, newFarm, fillAnimal } from './migrate.js';
import { now, villageCal, serverDay } from './clock.js';

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
let catchUp = false;     // đang chạy bù offline: không sinh quạ, trộm NPC chỉ lấy trứng hay rau (ADR 0004)
let catchBase = null;    // lúc loadGame chạy bù: giờ ngoài đời ứng với simMs = 0, để giờ làng của vườn online trôi theo bước mô phỏng
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
// Nhà mèo không phải chuồng có rào: đếm theo s.cats (issue 44)
export function penCount(s, type) {
  if (type === 'cathouse') return cats(s).length;
  settlePens(s); const ids = penEnts(s, type).map(e => e.id); return s.animals.filter(a => ids.includes(a.pen)).length;
}
export const penCap = (s, type) => (type === 'cathouse' ? catCap(s) : penEnts(s, type).reduce((n, e) => n + penCapOf(e), 0));
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
// Lý do con heo/bò/cừu này chưa sinh sản được (chữ cho người chơi), null = không có gì cản hay đang mang thai
export function breedNote(s, a) {
  if (!['heo', 'bo', 'cuu'].includes(a.type) || a.pregnant) return null;
  const def = ANIMALS[a.type], nm = def.name.toLowerCase();
  if (penTypeOf(s, a) === 'quarantine') return 'Chuồng cách ly không sinh sản được';
  if (!animalCan(a, 'product')) return a.retired ? 'Đã nghỉ hưu' : `Còn nhỏ, chờ lớn thành ${nm} trưởng thành`;
  if (a.sick) return 'Đang bệnh, chữa khỏi mới sinh sản được';
  if (a.hunger <= HUSBANDRY.growNeedsHunger) return 'Còn đói, cho ăn no mới sinh sản được';
  if (a.happy <= 40) return 'Chưa vui, vuốt ve hoặc cho ăn để vui lên';
  const mates = s.animals.filter(m => m.type === a.type && m.sex !== a.sex && m.pen === a.pen && animalCan(m, 'product'));
  if (!mates.length) return `Cần 1 ${nm} ${a.sex === 'm' ? 'cái' : 'đực'} trưởng thành ở cùng chuồng`;
  if (!mates.some(fitToBreed)) return `${nm[0].toUpperCase() + nm.slice(1)} ${a.sex === 'm' ? 'cái' : 'đực'} cùng chuồng còn đói, chưa vui hoặc đang bệnh`;
  return typeFree(s, def.pen) <= 0 ? `Chuồng đầy, nâng cấp chuồng để có chỗ cho ${def.baby.toLowerCase()}` : null;
}
// Nhắc mua cho đủ đực và cái: heo, bò, cừu cần cả hai giới mới sinh sản. null = đủ cặp (hay loài này không cần cặp)
export function breedAdvice(s, type) {
  if (!['heo', 'bo', 'cuu'].includes(type)) return null;
  const nm = ANIMALS[type].name.toLowerCase();
  const m = s.animals.some(a => a.type === type && a.sex === 'm'), f = s.animals.some(a => a.type === type && a.sex === 'f');
  if (m && f) return null;
  if (!m && !f) return `Nhớ mua cả ${nm} đực và cái thì ${nm} mới sinh sản`;
  return `Mới chỉ có ${nm} ${m ? 'đực' : 'cái'}, mua thêm 1 ${nm} ${m ? 'cái' : 'đực'} để ${nm} sinh sản`;
}
// Con vật hay thú cưng theo id: mèo nằm ở s.cats chứ không ở s.animals (issue 44)
const beast = (s, id) => s.animals.find(x => x.id === id) ?? (s.cats ?? []).find(x => x.id === id) ?? null;
// Đổi tên: bỏ khoảng trắng thừa; từ chối tên rỗng hoặc dài hơn BREED.nameMax
export function renameAnimal(s, id, name) {
  const a = beast(s, id);
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
export function createGame({ name = 'Nông dân', look = {}, dogCoat } = {}) {
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
    animals: [], troughs: {}, manure: { chicken: 0, pig: 0, pasture: 0 }, eggs: [], clutch: [], nest: { egg: false, hatchAt: 0, sp: null, mom: null, dad: null },
    // chained: xích chó · nap/napCheck: giấc ngủ gật ban đêm (giờ vườn) · quiet: đang mải ăn xúc xích (giờ ngoài đời)
    // · barkAt/barkX/barkY: lần sủa gần nhất và chỗ thấy khách lạ (issue 31)
    dog: {
      stage: START.dogStage, age: stageStart('cho', START.dogStage), hunger: 100, happy: 60, x: 0, y: 0, nextPoop: 0, name: DOG.name,
      tricks: {}, trainDay: 0, session: null, cmd: null, herdDay: 0, scene: 'farm',   // dạy lệnh và lệnh đang thi hành (issue 45)
      chained: false, nap: 0, napCheck: 0, quiet: 0, barkAt: 0, barkX: 0, barkY: 0,
      coat: coatOr('cho', dogCoat),   // màu lông (COATS.cho), chọn lúc nhận nuôi ở màn tạo nhân vật
      bowl: 0, eatAt: 0,   // bát ăn cạnh chuồng: số phần xương trong bát · lúc chó đi tới bát xong và ăn (giờ vườn, 0 = không đi)
    },
    cats: [],   // mèo (issue 44): thú cưng thứ hai, ở nhà mèo chứ không ở chuồng, tối ngủ trong bản đồ nhà
    poops: [], threats: [], preds: [], orders: [], nextOrderAt: 0,
    // Trộm NPC (issue 46): kế hoạch trộm đêm nay · trộm vừa bắt được, đang chờ chọn phạt · buổi làm thợ không công
    raid: null, caught: null, chore: null, teoCaught: 0, choreWeek: -1,
    // chased/barks: chó đã đớp và đã sủa bao nhiêu lần · robStreak: chuỗi trộm chưa bị đớp (issue 31, 32)
    // · helps: số việc mình đã giúp vườn bạn (issue 32)
    stats: { harvests: 0, bugs: 0, eggs: 0, poops: 0, slips: 0, piglets: 0, hatches: 0, orders: 0, thieves: 0, crows: 0, rats: 0, preds: 0, earned: 0, planted: 0, shipped: 0, bought: 0, slept: 0, chased: 0, barks: 0, robStreak: 0, helps: 0 },
    achievements: {}, log: [], tutorial: 0, nextId: nf.nextId,
    notify: {},   // loại thông báo 🟡 đã tắt: { ripe: false }; thiếu = bật. Mức 🔴 không tắt được
    // Trường cho online (issue 22, không đổi phiên bản v2): chơi đơn hay vườn trên làng, tên tài khoản,
    // thống kê hôm nay theo ngày ngoài đời (giúp/trộm, issue 28/30), nhật ký khách ghé vườn (mới nhất ở đầu)
    mode: 'offline', account: null,
    today: { day: '', helps: 0, steals: 0, stolen: 0, robs: 0 },
    guests: [],
    nestHint: false,   // đã nhắc cách dùng ổ ấp lần đầu có trứng có phôi
    coUtQuest: null,   // nhiệm vụ làm quen của Cô Út (issue 48): { step } sau khi mua con heo đầu tiên
    deliveries: [], courier: null,   // mua online: đơn chờ giao, người giao hàng đang đi (stepDeliveries)
  };
  const m = mapOf(s);
  Object.assign(s.player, m.spawn);
  Object.assign(s.dog, m.dogHome);
  s.dog.nextPoop = nextPoopAt(s);
  for (const a of START.animals) { const p = penPoint(s, ANIMALS[a.type].pen); mkAnimal(s, a.type, a.stage, p.x, p.y, { sex: a.sex }); }
  settlePens(s);
  ensureTroughs(s);
  evq = [];
  return s;
}

// Máng ăn theo từng chuồng: s.troughs[id chuồng]. Bản lưu cũ giữ máng theo loại (chicken/pig/pasture):
// chép giá trị đó cho từng chuồng cùng loại rồi bỏ khóa loại. Chuồng nào chưa có máng thì khởi tạo 0.
function ensureTroughs(s) {
  const t = s.troughs ??= {};
  for (const e of s.farm.ents) if (e.kind === 'pen') t[e.id] = t[e.pen] ?? t[e.id] ?? 0;   // khóa loại (nếu còn) thắng
  for (const k of ['chicken', 'pig', 'pasture']) delete t[k];
}
// Khóa máng con vật ăn: chuồng nó ở; chuồng không máng (cách ly) thì ăn máng chuồng đầu cùng loại.
function troughKey(s, a) {
  const m = mapOf(s), p = m.penById[a.pen];
  return p?.trough ? p.id : m.pens[ANIMALS[a.type].pen]?.id;
}

// Lưu vườn chơi đơn vào localStorage. Vườn online (mode 'online') chỉ cập nhật savedAt, không bao giờ ghi đè
// bản chơi đơn: phần gửi lên server và bản nháp trên máy do sync.js lo.
export function saveGame(s) {
  s.savedAt = now();
  if (s.mode === 'online') return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* không có localStorage */ }
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
function readRaw(raw) {
  problem = null;
  try { return migrate(raw); } catch (e) { problem = `Không đọc được bản lưu (${e.message}).`; return null; }
}

// Không truyền gì: đọc vườn chơi đơn trong localStorage. Truyền `raw` (bản lưu đã parse, vd vườn online từ server)
// thì đọc bản đó, không đụng localStorage. Cả hai đều bù trường thiếu và chạy bù như nhau.
export function loadGame(raw) {
  const s = raw === undefined ? readSave() : readRaw(raw);
  if (!s) return null;
  // Bổ sung trường thiếu
  const base = createGame({ name: s.name });
  s.stats = { ...base.stats, ...s.stats };
  s.troughs = { ...s.troughs };
  s.manure = { ...base.manure, ...s.manure };
  for (const k of ['owned', 'achievements', 'inv', 'basket', 'nest', 'dog', 'player']) s[k] = { ...base[k], ...s[k] };
  for (const k of ['animals', 'eggs', 'clutch', 'poops', 'threats', 'preds', 'cats', 'orders', 'log']) s[k] ||= [];
  s.shipbin = { items: Object.fromEntries(Object.entries(s.shipbin?.items ?? {}).filter(([k, n]) => (CROPS[k] || PRODUCTS[k]) && n > 0)) };
  ensureShipbin(s);   // vườn cũ chưa có thùng: thêm một thùng cạnh nhà kho
  ensureGateBoxes(s); // vườn cũ chưa có hộp quà, sổ lưu bút: thêm cạnh cổng
  ensureTroughs(s);   // máng theo loại (bản cũ) thành máng theo chuồng
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
  // trường online (bản lưu Phase 0 chưa có)
  s.mode = s.mode === 'online' ? 'online' : 'offline';
  s.account = s.mode === 'online' && typeof s.account === 'string' ? s.account : null;
  if (s.mode === 'online') s.speed = 1;
  s.today = { ...base.today, ...s.today };
  s.guests = Array.isArray(s.guests) ? s.guests : [];
  s.dog.chained = !!s.dog.chained;
  // màu lông (góp ý người chơi): bản lưu cũ hay màu hỏng thì về màu của bộ art gốc
  s.dog.coat = coatOr('cho', s.dog.coat);
  for (const c of s.cats) c.coat = coatOr('meo', c.coat);
  s.dog.bowl = clamp(Math.floor(s.dog.bowl) || 0, 0, DOG.bowlMax);   // bát ăn (bản lưu cũ chưa có: trống)
  s.dog.eatAt = Number.isFinite(s.dog.eatAt) ? s.dog.eatAt : 0;
  s.coUtQuest ??= null;   // bản lưu cũ chưa có nhiệm vụ làm quen của Cô Út (issue 48)
  // mua online (hotfix): bản lưu cũ chưa có đơn chờ giao, chưa có người giao hàng
  s.deliveries = Array.isArray(s.deliveries) ? s.deliveries.filter(o => o && o.items && Number.isFinite(o.due)) : [];
  if (!s.courier || !Array.isArray(s.courier.ids) || !s.courier.at) s.courier = null;
  // trộm NPC (issue 46): bản lưu cũ chưa có thì bắt đầu từ con số không
  s.teoCaught = Math.max(0, Math.floor(s.teoCaught) || 0);
  s.choreWeek = Number.isFinite(s.choreWeek) ? s.choreWeek : -1;
  s.raid ??= null; s.caught ??= null; s.chore ??= null;
  // thoát game lúc hộp thoại phạt còn mở: coi như đã chọn bắt đền, khỏi treo lơ lửng
  if (s.caught) { const c = s.caught; s.caught = null; addCoins(s, c.coins); log(s, `${c.name} xin lỗi và đền ${c.coins} xu`); }
  s.frozenMs = 0; delete s.away;
  delete s.gate;   // số quà, lời nhắn ở cổng là tin từ server, không nằm trong bản lưu
  const pend = s.awayPending; delete s.awayPending;   // server đã chạy bù lúc chủ vắng: tóm tắt chờ chủ về
  evq = [];
  const t = now(), gone = Math.max(0, t - (s.savedAt || t)), elapsed = Math.min(gone, MAX_CATCHUP_MS);
  let events = [];
  if (elapsed > 3000) {
    s.threats = [];
    catchUp = true; catchBase = t - elapsed - (s.simMs || 0);
    try { events = tick(s, elapsed); } finally { catchUp = false; catchBase = null; }
    s.threats = [];
    evq = [];
    log(s, `Chào mừng trở lại! Nông trại đã chạy thêm ${Math.round(elapsed / MIN)} phút.`);
    evq = [];
  }
  s.frozenMs = gone - elapsed;   // phần vắng vượt 8 giờ: không chạy, chỉ ghi lại
  s.frozenTotal += s.frozenMs;
  const lines = awaySummary(events, s.frozenMs);
  s.away = lines.length || gone >= AWAY_SHOW_MS ? { lines, frozenMs: s.frozenMs, ms: gone } : null;
  if (pend) s.away = s.away ? { lines: [...pend.lines, ...s.away.lines], frozenMs: pend.frozenMs + s.away.frozenMs, ms: pend.ms + s.away.ms } : pend;
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
  const stolenEggs = events.reduce((a, e) => a + (e.type === 'tisun' ? e.n : 0), 0);
  if (stolenEggs) out.push(`Tí Sún đã lấy trộm ${stolenEggs} quả trứng`);
  const guard = n('guard');
  if (guard) out.push(`Chó đã đuổi quạ và trộm ${guard} lần`);
  if (n('dogBowl')) out.push(`Chó đã tự ra bát ăn ${n('dogBowl')} bữa`);
  const coins = events.reduce((a, e) => a + (e.type === 'shipped' ? e.coins : 0), 0);
  if (coins) out.push(`Lái buôn trả ${coins} xu`);
  const parcels = events.reduce((a, e) => a + (e.type === 'delivered' ? e.orders : 0), 0);
  if (parcels) out.push(`Người giao hàng đã giao ${parcels} đơn hàng online tới kho 📦`);
  // thành tựu mở trong lúc chạy bù (vd chó đuổi đủ 20 kẻ trộm lúc chủ vắng, issue 32): không có huy hiệu nên ghi vào đây
  for (const e of events) if (e.type === 'achievement') out.push(`Thành tựu mới "${e.name}", thưởng ${e.coins} xu`);
  if (frozenMs >= MIN) out.push(`Vườn đã đóng băng ${spanText(frozenMs)}`);
  return out;
}

// ---------- Chống gian lận nhẹ (ADR 0002): server dùng để từ chối bản lưu online vô lý ----------
// Của cải = xu + đồ (nông sản, sản phẩm theo giá bán; đồ khác theo giá mua; tính cả hàng mua online đang chờ giao). Mua bán gần như không làm tăng của cải,
// chỉ thu hoạch, đơn hàng, thưởng mới tăng: nên bán cả kho một lúc vẫn hợp lý, còn sửa xu/đồ thì không.
export const SAVE_JUMP = {
  simSlack: DAY_MS / 2 + MIN,   // ngủ một đêm chạy thẳng tới sáng (tối đa nửa ngày game) + sai số
  wealth: 3000, wealthPerPlotMin: 150,   // mức cho sẵn (lên cấp, thành tựu, đơn hàng) + mỗi ô ruộng mỗi phút vườn chạy
  exp: 1000, expPerPlotMin: 30,
  plotsExtra: 10,               // phần con vật, trứng, đơn hàng tính như thêm từng này ô
};
export function wealthOf(s) {
  let w = s.coins || 0;
  for (const o of [s.inv, s.basket, s.shipbin?.items, ...(s.deliveries ?? []).map(d => d.items)]) for (const [k, n] of Object.entries(o ?? {})) w += (Number(n) || 0) * (sellPrice(k) || ITEMS[k]?.price || 0);
  return w;
}
// Con vật có ở bản trước mà không còn ở bản sau (bán cho Chú Ba, issue 40) đã thành xu: cho tăng thêm chừng giá trần của
// chúng (giá bán × độ thân cao nhất; heo theo số ký × giá ký cao nhất trong tuần). Bản trước có thể còn là v2 (chưa có cân nặng).
function goneAnimalsValue(prev, next) {
  const left = new Set((next.animals ?? []).map(a => a.id)), bond = Math.max(...TRADE.bondMul);
  let v = 0;
  for (const a of prev.animals ?? []) {
    if (left.has(a.id) || !ANIMALS[a.type]) continue;
    v += (a.type === 'heo' && a.weight > 0 ? a.weight * Math.max(...TRADE.pigKg) : ANIMALS[a.type].sell) * bond;
  }
  return v;
}
// prev, next: hai bản lưu liên tiếp của cùng vườn; dtMs: thời gian ngoài đời giữa hai bản (server tính, có chặn trên).
// Hàm thuần → { ok: true } hoặc { ok: false, reason: 'time'|'coins'|'exp', msg }
export function checkSaveJump(prev, next, dtMs) {
  const J = SAVE_JUMP, sim = Math.max(0, (next.simMs || 0) - (prev.simMs || 0));
  const speed = next.mode === 'online' ? 1 : Math.max(...SPEEDS);   // online khóa x1 (issue 23)
  if (sim > Math.max(0, dtMs) * speed + J.simSlack) return { ok: false, reason: 'time', msg: 'Vườn chạy nhanh hơn thời gian thật' };
  const k = ((prev.plots ?? []).filter(p => p.unlocked && !p.removed).length + J.plotsExtra) * sim / MIN;
  if (wealthOf(next) - wealthOf(prev) > J.wealth + J.wealthPerPlotMin * k + goneAnimalsValue(prev, next)) return { ok: false, reason: 'coins', msg: 'Xu và đồ tăng nhanh vô lý' };
  if ((next.exp || 0) - (prev.exp || 0) > J.exp + J.expPerPlotMin * k) return { ok: false, reason: 'exp', msg: 'Kinh nghiệm tăng nhanh vô lý' };
  return { ok: true };
}

// Mùa chỉ để hiển thị: mỗi mùa 7 ngày game. dayIn = ngày thứ mấy trong mùa (1..7).
const SEASONS = [['xuan', 'Xuân'], ['ha', 'Hạ'], ['thu', 'Thu'], ['dong', 'Đông']];
export function seasonOf(s) {
  const d = Math.max(0, dayOf(s) - 1), [key, name] = SEASONS[Math.floor(d / 7) % 4];
  return { key, name, dayIn: d % 7 + 1 };
}
export const farmHours = s => (s.simMs || 0) / 3600_000;

// ---------- Thời gian ----------
// Online: ngày đêm, ngày, mùa theo lịch làng (giờ server); chơi đơn theo state.time. Đóng băng không làm lịch làng dừng.
const online = s => s.mode === 'online';
// Giờ làng của vườn online: giờ server, riêng lúc loadGame chạy bù thì là giờ ngoài đời của bước đang mô phỏng
// (8 giờ vắng = 24 ngày làng có ngày có đêm, không phải cả 8 giờ đứng ở giờ lúc mở lại)
const villageNow = s => (catchBase != null ? catchBase + (s.simMs || 0) : now());
export const dayOf = s => online(s) ? villageCal(villageNow(s)).day : s.day;
export const dayFraction = s => online(s) ? villageCal(villageNow(s)).frac : (s.time % DAY_MS) / DAY_MS;
const dayFrac = dayFraction;
// Tốc độ chạy thật: online luôn x1
export const speedOf = s => online(s) ? 1 : s.speed || 1;
export const isNight = s => dayFrac(s) >= NIGHT_FROM;
// Đã qua chạng vạng (18h) chưa: mốc gà vịt thôi thả rông mà về chuồng, cũng là lúc cửa chuồng có biển "đã về" và rải thóc được (issue 42)
export const isDusk = s => dayFrac(s) >= FREE.duskAt;
export function clockText(s) {
  const t = (6 + dayFrac(s) * 24) % 24;
  const h = Math.floor(t), m = Math.floor((t - h) * 60);
  const part = h < 12 ? 'sáng' : h < 18 ? 'chiều' : h < 22 ? 'tối' : 'đêm';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${part}`;
}
export const dayText = s => `Ngày ${dayOf(s)}`;

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
  const left = online(s) ? DAY_MS - villageCal(now()).tod : (Math.floor(s.time / DAY_MS) + 1) * DAY_MS - s.time, was = catchUp;
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
  for (const t of s.threats ?? []) {
    if (t.state !== 'eating' || (t.plot >= 0 && !s.plots[t.plot])) continue;
    const c = raidAt(s, t);
    const text = { crow: 'Quạ đang ăn cây!', thief: 'Có trộm đang hái cây!', tisun: 'Tí Sún đang lấy trứng!', civet: 'Chồn hương đang rình gà!' }[t.kind];
    out.push({ key: 'threat:' + t.id, kind: t.kind, x: c.x, y: c.y, text });
  }
  for (const a of s.animals ?? []) if (a.sick >= 2) out.push({ key: 'sick:' + a.id, kind: 'sick', x: a.x, y: a.y, text: `${ANIMALS[a.type].name} ${a.sick >= 3 ? 'nguy kịch' : 'bệnh nặng'}!` });
  // chó vừa sủa báo có khách lạ (issue 31): mũi tên chỉ về chỗ nó thấy, tắt sau GUARD.barkShowMs
  const g = s.dog;
  if (g?.barkAt && now() - g.barkAt < GUARD.barkShowMs) out.push({ key: 'bark', kind: 'bark', x: g.barkX, y: g.barkY, text: `${g.name} đang sủa ở ${barkWhere(s, g.barkX, g.barkY)}!` });
  // bạn vừa sang trộm (issue 32): mũi tên chỉ về chỗ bị trộm, tắt sau GUEST.robShowMs
  const r = s.robAt;
  if (r?.at && now() - r.at < GUEST.robShowMs) out.push({ key: 'rob', kind: 'rob', x: r.x, y: r.y, text: `${r.by} đang trộm ${itemName(r.item).toLowerCase()} trong vườn!` });
  // kẻ săn mồi sắp ra tay: luật báo trước PREDATOR.warnMs (10 giây), đuổi kịp thì không ai bị hại
  for (const p of predWarning(s)) out.push({ key: 'pred:' + p.id, kind: p.kind, x: p.x, y: p.y, text: `${PRED_NAME[p.kind]} đang rình, đuổi ngay!` });
  for (const a of hurtAnimals(s)) out.push({ key: 'hurt:' + a.id, kind: 'hurt', x: a.x, y: a.y, text: `${ANIMALS[a.type].name} bị chuột cắn, cần băng bó!` });
  return out;
}
// Hướng của chỗ chó sủa so với giữa vườn, để ghép câu "Mực đang sủa ở phía Đông vườn!"
function barkWhere(s, x, y) {
  const v = mapOf(s).view, dx = x - (v.x0 + v.x1) / 2, dy = y - (v.y0 + v.y1) / 2;
  return `phía ${DIR_NAME[Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'W' : 'E') : (dy < 0 ? 'N' : 'S')]} vườn`;
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
    if (!catchUp) s.stamina = Math.min(STAMINA.max, s.stamina + STAMINA.morningRegen);   // mỗi sáng 6h tự hồi một ít; chạy bù lúc vắng nhà (nhiều ngày game) thì không, khỏi vào lại là đầy
    settleShip(s);
    if (s.chore?.day === s.day) doChore(s);   // trộm bị phạt sang làm thợ không công (issue 46)
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
  stepCats(s, d);
  if (catchUp) stepRaidAway(s); else stepThreats(s, d);
  stepOrders(s);
  stepDeliveries(s);
  checkAch(s);
}

// 6h sáng: gà trống trưởng thành gáy (chữ bay, tiếng, event cho bong bóng); chạy bù không gáy
function cockCrow(s) {
  const list = roosters(s).filter(r => !r.sick);
  list.forEach((r, i) => { fxEv(r.x, r.y - 10, 'Ò ó o o! 🐓', COL.coin); emit({ type: 'cockcrow', id: r.id }); if (!i) snd('cockcrow'); });
}

// Cửa sổ từ chín tới héo (ms): nửa thời gian lớn, tối thiểu RIPE_FLOOR
export const ripeWindow = id => Math.max((OVERRIPE - 1) * CROPS[id].grow, RIPE_FLOOR);
// Còn bao nhiêu phần cửa sổ trước khi héo (1 → 0); null nếu chưa chín hay đã héo/chết
export function ripeLeft(c) {
  if (!c || c.dead || c.rotten || c.progress < 1) return null;
  return Math.max(0, 1 - (c.progress - 1) * CROPS[c.id].grow / ripeWindow(c.id));
}
export const wilting = c => { const l = ripeLeft(c); return l != null && l <= 1 - WILT_WARN; };

function stepPlot(s, p, d) {
  if (s.weather === 'rain') p.water = 100;
  else if (p.water > 0) p.water = Math.max(0, p.water - FARMING.waterDrainPerMin * (d / MIN) * (s.weather === 'sun' ? 1.5 : 1));
  if (!p.weeds && chance(FARMING.weedChancePerMin, d)) p.weeds = true;
  const c = p.crop;
  if (!c || c.dead || c.rotten) return;
  const def = CROPS[c.id], at = plotCenter(s, p.idx);
  if (c.progress >= 1) { // chín: tiếp tục già đi tới hết cửa sổ thì héo; chạy bù offline thì đứng yên (ADR 0004)
    if (catchUp) return;
    c.progress += d / def.grow;
    if (c.progress >= 1 + ripeWindow(c.id) / def.grow) { c.rotten = true; emit({ type: 'rotten', crop: c.id }); fxEv(at.x, at.y, 'Héo mất rồi 🥀', COL.bad); log(s, `${def.name} chín quá nên héo mất`); }
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
    const tk = troughKey(s, a);
    if (a.hunger < HUSBANDRY.autoEatBelow && s.troughs[tk] > 0) { s.troughs[tk]--; a.hunger = 100; }
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
      || (neglected(s, a, def) && chance(HUSBANDRY.sickChancePerMin * sickFactor(a) * (isDirty(a) ? DIRT.sickMul : 1) * (penDirty(s, def.pen) ? SICK.dirtyPenMul : 1) * (a.stage === 'gia' ? SICK.oldChanceMul : 1), d)))) fall(s, a, def);
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
        if (fert && !s.nestHint && !catchUp) {   // lần đầu có trứng có phôi: chỉ cách dùng ổ ấp (một lần, chỉ khi đang chơi)
          s.nestHint = true;
          toast('Có trứng có phôi rồi! Nhặt trứng, mang tới Ổ ấp trứng cạnh máng gà để nở ra gà con 🐣');
          log(s, 'Trứng có phôi (nhờ có gà trống) ấp được: nhặt rồi đặt vào Ổ ấp trứng trong chuồng gà');
        }
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
// Bị bỏ bê: đói, dơ, chuồng bẩn hoặc già. Chỉ lúc đó mới có nguy cơ tự bệnh (ngoài đói lả lâu, luôn bệnh)
const neglected = (s, a, def) => a.hunger < HUSBANDRY.hungryBelow || isDirty(a) || penDirty(s, def.pen) || a.stage === 'gia';
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
  if (a.pet) p = Math.min(p, SICK.toCritical - 1);   // thú cưng (chó, mèo): nặng lắm là Bệnh nặng, không bao giờ nguy kịch
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
  const a = beast(s, id);
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
  const a = beast(s, id);
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
  const a = beast(s, id);
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
  stepBowl(s);
  stepHerd(s);
  autoHerd(s);
  if (s.time >= g.nextPoop) {
    g.nextPoop = nextPoopAt(s);
    if (s.poops.length < DOG.maxPoops) {
      const p = { id: s.nextId++, x: g.x, y: g.y, at: s.time };
      s.poops.push(p); spawnEv('poop', p.x, p.y);
    }
  }
  // ngủ gật (issue 31): ban đêm cứ GUARD.napEvery lại quay một lần, trúng thì ngủ GUARD.napMs
  // → chừng GUARD.napRate thời gian ban đêm. Ban ngày khỏi quay: dogAsleep đã xét ban đêm rồi.
  if (isNight(s) && s.time >= (g.napCheck || 0)) {
    g.napCheck = s.time + GUARD.napEvery;
    if (Math.random() < GUARD.napRate) g.nap = s.time + GUARD.napMs;
  }
}

// Bát ăn cạnh chuồng: chó ở vườn mà đói thì đi tới bát (DOG.bowlWalkMs), tới nơi ăn 1 phần cho no.
// Chỉ theo giờ vườn nên chạy bù ra cùng kết quả; world.js chỉ diễn cảnh chó đi tới bát lúc eatAt đang chờ.
function stepBowl(s) {
  const g = s.dog;
  if ((g.scene ?? 'farm') !== 'farm' || !(g.bowl > 0)) { g.eatAt = 0; return; }
  if (!g.eatAt) { if (g.hunger < DOG.bowlHungry) g.eatAt = s.time + DOG.bowlWalkMs; return; }
  if (s.time < g.eatAt) return;
  g.eatAt = 0; g.bowl--; g.hunger = 100;
  emit({ type: 'dogBowl' });
  const b = mapOf(s).dogBowl;
  if (b) fxEv(b.x, b.y - 8, 'Măm măm 🦴', COL.good);
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
// Bán kính phát hiện và dogSees: một bộ luật chung cho trộm NPC lẫn khách online, xem "Chó canh" bên dưới.

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
  if (g.chained && LEASH_CMDS.includes(id)) return R(false, `${g.name} đang bị xích, thả ra đã rồi mới ra lệnh này`, { reason: 'chained' });
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

// ---------- Trộm NPC: thằng Tèo, Tí Sún, chồn hương (issue 46) ----------
// Luật thuần ở mức ô (ADR 0013): mỗi đêm chốt đúng một vụ, world.js chỉ diễn hoạt kẻ trộm đi tới chỗ đã chọn.
const THIEF_NAME = { crow: 'Quạ', thief: 'Thằng Tèo', tisun: 'Tí Sún', civet: 'Chồn hương' };
// tên dùng giữa câu ("đuổi thằng Tèo đi rồi")
const THIEF_LC = { crow: 'quạ', thief: 'thằng Tèo', tisun: 'Tí Sún', civet: 'chồn hương' };
// Chỗ kẻ trộm nhắm tới
const raidAt = (s, t) => t.at ?? plotCenter(s, t.plot);
// Tuần làng: 7 ngày game một tuần, như mùa
export const villageWeek = s => Math.floor(Math.max(0, (s.day || 1) - 1) / 7);
// Số vụ bạn bè online sang trộm vườn này hôm nay (issue 30 ghi vào s.today.steals, theo ngày ngoài đời):
// đã có khách trộm thì trộm NPC nhường, không tới nữa.
export const guestRaids = s => stealsToday(s);

// Đêm nay trộm nào có đồ đáng trộm để tới? ['thief' | 'tisun' | 'civet']
export function raidPool(s) {
  if (guestRaids(s) > 0) return [];
  const out = [];
  if (s.plots.filter(p => p.unlocked && isRipe(p)).length >= RAID.ripeNeed) out.push('thief');
  if (level(s) >= RAID.minLevel) {   // bảo hộ người mới: cấp thấp chưa gặp hai trộm mới
    if ((s.eggs?.length ?? 0) >= RAID.eggNeed) out.push('tisun');
    if (strays(s).length) out.push('civet');
  }
  return out;
}
// Số món đáng trộm trong vườn: ô chín + trứng dưới đất + con ngủ ngoài
const raidLoot = s => s.plots.filter(p => p.unlocked && isRipe(p)).length + (s.eggs?.length ?? 0) + strays(s).length;
// Xác suất đêm nay có một vụ trộm NPC: vườn thường 1 vụ mỗi 2 đêm, vườn giàu thường hơn (chặn trên 1 vụ mỗi đêm);
// đèn lồng, hàng rào thấp và chó canh nhà đều làm trộm ngại.
export function raidChance(s) {
  if (!raidPool(s).length) return 0;
  const m = mapOf(s);
  const lamps = Math.min(RAID.lampMax, m.decos.filter(o => o.kind === 'deco_lamp').length);
  const fence = m.decos.some(o => o.kind === 'deco_lowfence');
  const rich = 1 + (RAID.richMul - 1) * Math.min(1, Math.max(0, raidLoot(s) - RAID.lootBase) / RAID.lootRich);
  return clamp(RAID.nightly * rich * Math.pow(RAID.lampMul, lamps) * (fence ? RAID.fenceMul : 1) * (guardOn(s) ? RAID.dogMul : 1), 0, RAID.max);
}
// Vụ trộm NPC đã chốt cho đêm nay: { kind, at, done } hay null
export const raidTonight = s => (s.raid?.day === s.day && s.raid.kind ? { kind: s.raid.kind, at: s.raid.at, done: !!s.raid.done } : null);

// Khoảng ban đêm của ngày đang chạy (nửa đêm → 6h sáng)
function nightSpan(s) {
  const d0 = Math.floor(s.time / DAY_MS) * DAY_MS;
  return { from: d0 + DAY_MS * NIGHT_FROM, to: d0 + DAY_MS };
}
// Chốt kế hoạch trộm của đêm nay (chỉ một lần mỗi đêm nên không bao giờ quá 1 vụ mỗi đêm)
function planRaid(s) {
  if (s.raid?.day === s.day) return;
  const pool = raidPool(s).filter(k => !(catchUp && k === 'civet'));   // chạy bù: chồn hương không tới (ADR 0004)
  const kind = pool.length && Math.random() < raidChance(s) ? pick(pool) : null;
  const w = nightSpan(s);
  s.raid = { day: s.day, kind, at: kind ? Math.max(s.time, w.from + Math.random() * RAID.arriveSpan * (w.to - w.from)) : 0, done: !kind };
}
// Tới giờ thì kẻ trộm lẻn vào từ cổng
function spawnRaid(s) {
  const r = s.raid;
  if (!r?.kind || r.done || s.time < r.at) return;
  r.done = true;
  const t = makeRaider(s, r.kind);
  if (!t) return;   // đồ đáng trộm vừa biến mất
  s.threats.push(t);
  spawnEv(r.kind, t.x, t.y);
}
function makeRaider(s, kind) {
  const m = mapOf(s), gateIn = m.gateIn ?? m.spawn;
  let at = null, target = null, plot = -1;
  if (kind === 'thief') {
    const p = pick(s.plots.filter(x => x.unlocked && isRipe(x)));
    if (!p) return null;
    plot = p.idx; at = plotCenter(s, p.idx);
  } else if (kind === 'tisun') {
    const e = pick(s.eggs);
    if (!e) return null;
    at = { x: e.x, y: e.y };
  } else {
    const a = pick(strays(s));
    if (!a) return null;
    target = a.id; at = { x: a.tile.c * TS + 8, y: a.tile.r * TS + 8 };
  }
  const ms = Math.hypot(at.x - gateIn.x, at.y - gateIn.y) / 40 * (kind === 'civet' ? 900 : 1400);
  return { id: s.nextId++, kind, plot, target, at, x: gateIn.x, y: gateIn.y, arriveAt: s.time + ms, state: 'coming', since: s.time, loot: false };
}

// Thằng Tèo bị bắt càng nhiều càng sắm đồ (đèn pin, giày êm) và đi lặng lẽ hơn: chó phát hiện ở bán kính nhỏ hơn
export const thiefStealth = s => Math.max(RAID.stealthMin, Math.pow(RAID.stealthPerCatch, s.teoCaught || 0));
export const thiefGear = s => ({ torch: (s.teoCaught || 0) >= RAID.torchAt, shoes: (s.teoCaught || 0) >= RAID.shoesAt });

// Bắt được trộm rồi: hai kiểu phạt. [] nếu chưa bắt được ai.
export function punishOptions(s) {
  const c = s.caught;
  if (!c) return [];
  const used = s.choreWeek === villageWeek(s);
  return [
    { id: 'pay', icon: '🪙', label: `Bắt đền ${c.coins} xu`, disabled: null },
    { id: 'chore', icon: '🛠️', label: 'Phạt làm thợ không công ngày mai', disabled: used ? 'Tuần này làng phạt một lần rồi' : null },
  ];
}
export const punishInfo = s => (s.caught ? { kind: s.caught.kind, name: s.caught.name, coins: s.caught.coins, options: punishOptions(s) } : null);
// Chọn kiểu phạt cho kẻ vừa bắt được
export function punishThief(s, choice = 'pay') {
  const c = s.caught;
  if (!c) return R(false, 'Chưa bắt được ai cả', { reason: 'none' });
  const opt = punishOptions(s).find(o => o.id === choice);
  if (!opt) return R(false, 'Không có kiểu phạt này', { reason: 'unknown' });
  if (opt.disabled) return R(false, opt.disabled, { reason: 'weekly' });
  s.caught = null;
  if (choice === 'chore') {
    s.choreWeek = villageWeek(s);
    s.chore = { day: s.day + 1, name: c.name };
    log(s, `${c.name} phải làm thợ không công cho vườn ngày mai`);
    return R(true, `${c.name} cúi gằm mặt, mai sang làm thợ không công 🛠️`, { chore: s.chore.day });
  }
  addCoins(s, c.coins);
  log(s, `${c.name} xin lỗi và đền ${c.coins} xu`);
  return R(true, `${c.name} xin lỗi và đền ${c.coins} xu`, { coins: c.coins });
}
// Sáng hôm sau: kẻ bị phạt sang tưới cây, nhổ cỏ và dọn phân không công
function doChore(s) {
  const who = s.chore?.name ?? 'Thằng Tèo';
  s.chore = null;
  let n = 0;
  for (const p of s.plots) {
    if (!p.unlocked) continue;
    if (p.crop && p.water < 100) { p.water = 100; n++; }
    if (p.weeds) { p.weeds = false; n++; }
  }
  n += s.poops.length; s.poops = [];
  log(s, `${who} làm thợ không công: tưới cây, nhổ cỏ và dọn phân giúp ${n} chỗ`);
  toast(`${who} sang làm thợ không công, vườn sạch tinh tươm 🛠️`);
}

// Chạy bù offline (ADR 0004): vẫn có trộm NPC, nhưng chỉ mất trứng hay rau — không con nào bị bắt đi.
function stepRaidAway(s) {
  if (!isNight(s)) return;
  planRaid(s);
  const r = s.raid;
  if (!r.kind || r.done || s.time < r.at) return;
  r.done = true;
  if (guardOn(s) && Math.random() < DOG.guardChance) {
    s.stats.thieves++; emit({ type: 'guard', who: r.kind });
    log(s, `${s.dog.name} sủa vang, đuổi ${THIEF_LC[r.kind]} đi rồi`);
    return;
  }
  if (r.kind === 'thief') {
    const p = pick(s.plots.filter(x => x.unlocked && isRipe(x)));
    if (!p) return;
    const nm = CROPS[p.crop.id].name;
    p.crop = null;
    emit({ type: 'thief', name: nm });
    log(s, `Thằng Tèo hái trộm mất ${nm}`);
  } else if (r.kind === 'tisun') {
    const n = Math.min(s.eggs.length, rint(...RAID.eggTake));
    if (!n) return;
    for (let i = 0; i < n; i++) s.eggs.splice(rint(0, s.eggs.length - 1), 1);
    emit({ type: 'tisun', n });
    log(s, `Tí Sún lấy trộm mất ${n} quả trứng`);
  }
}

// ---------- Chó canh: trộm NPC (issue 45, 46) và khách online (issue 31) — một con chó, một bộ luật ----------
// Luật thuần ở mức ô (DESIGN §6.1, ADR 0013): chó thấy kẻ lạ đứng chỗ nào. `world.js` chỉ diễn hoạt phần chạy đuổi cho đẹp.
export const dogAsleep = s => !!s?.dog && isNight(s) && (s.time || 0) < (s.dog.nap || 0);
export const dogQuiet = (s, t = now()) => t < (s?.dog?.quiet || 0);   // đang mải ăn xúc xích thì quên sủa
// Bán kính canh (số ô; 0 = không canh) theo giai đoạn DOG.guardRadius: chó con 0, nhỡ 4, trưởng thành 6, già 4;
// vui < 50 còn một nửa; đói < 30 thì nằm bẹp; đang gác một chỗ (lệnh Canh khu) ×2 tại chỗ gác;
// ngủ gật chỉ thấy kẻ lạ sát bên 1 ô; bị xích thì chỉ với tới GUARD.chainRadius ô quanh chuồng.
export function guardRadius(s, t = now()) {
  const g = s?.dog;
  const base = DOG.guardRadius[g?.stage] ?? 0;
  if (!base || g.hunger < GUARD.hungryStop || dogQuiet(s, t)) return 0;
  const chain = g.chained ? GUARD.chainRadius : Infinity;
  if (dogAsleep(s)) return Math.min(GUARD.napRadius, chain);
  const r = (g.happy < GUARD.sadHappy ? base / 2 : base) * (dogPost(s) ? DOG.guardPostMul : 1);
  return Math.min(r, chain);
}
// Vùng chó chạy được khi bị xích: { x, y, r } theo điểm ảnh bản đồ. null = thả rông, chạy khắp vườn.
export function guardArea(s) {
  if (!s?.dog?.chained) return null;
  const h = mapOf(s).dogHome;
  return { x: h.x, y: h.y, r: GUARD.chainRadius * TS };
}
// Tâm vùng canh: đang gác thì từ chỗ gác, bị xích thì từ chuồng chó, thả rông thì từ chính con chó
function guardCenter(s) {
  const post = dogPost(s);
  if (post) return { x: post.c * TS + 8, y: post.r * TS + 8 };
  return s.dog.chained ? mapOf(s).dogHome : s.dog;
}
// Chó có phát hiện kẻ lạ đang đứng ở `pos` (điểm ảnh bản đồ) không.
// mul < 1: kẻ lạ đi lặng lẽ (thằng Tèo có giày êm, issue 46) nên bán kính thu lại. t = giờ ngoài đời (xúc xích).
export function dogSees(s, pos, { mul = 1, t = now() } = {}) {
  const r = guardRadius(s, t) * mul;
  if (!r || !pos || pos.x == null) return false;
  const c = guardCenter(s);
  return c?.x != null && Math.hypot(pos.x - c.x, pos.y - c.y) <= r * TS;
}
export const walkSpeed = () => WALK_SPEED;                    // px/s của người đi bộ
export const chaseSpeed = () => WALK_SPEED * GUARD.chaseMul;  // chó đuổi nhanh gấp 1.3 lần
// Lệnh bắt chó đi lại (issue 45) thì không làm được khi đang bị xích
const LEASH_CMDS = ['guard', 'herd', 'follow'];
// Chủ vườn chọn xích chó hay thả rông (nút trên chuồng chó / trên chó). Xích thì thôi lệnh gác, lùa, đi theo.
export function setChained(s, on) {
  const g = s.dog;
  g.chained = !!on;
  if (on && LEASH_CMDS.includes(g.cmd?.id)) { g.cmd = null; g.scene = 'farm'; }
  return R(true, on ? `Đã xích ${g.name} vào chuồng` : `Đã thả ${g.name} chạy rông`);
}

function stepThreats(s, d) {
  const busy = new Set(s.threats.map(t => t.plot));
  const ripe = s.plots.filter(p => p.unlocked && isRipe(p) && !busy.has(p.idx));
  const m = mapOf(s), v = m.view;
  const scare = m.decos.filter(o => o.kind === 'deco_scarecrow');
  // quạ
  const open = ripe.filter(p => { const c = plotCenter(s, p.idx); return !scare.some(o => Math.hypot(o.x - c.x, o.y - c.y) <= 5 * TS); });
  if (open.length && s.threats.filter(t => t.kind === 'crow').length < 2 && chance(THREATS.crowChancePerMin, d)) {
    const p = pick(open), c = plotCenter(s, p.idx), side = rint(0, 2);
    const x = side === 0 ? v.x0 + 2 : side === 1 ? v.x1 - 2 : rnd(v.x0 + 20, v.x1 - 20), y = side === 2 ? v.y0 + 2 : rnd(v.y0 + 20, (v.y0 + v.y1) / 2);
    s.threats.push({ id: s.nextId++, kind: 'crow', plot: p.idx, x, y, arriveAt: s.time + Math.hypot(c.x - x, c.y - y) / 60 * 1000, state: 'coming', since: s.time });
    spawnEv('crow', x, y); snd('crow');
  }
  // trộm NPC: mỗi đêm luật chốt đúng một vụ (issue 46)
  if (isNight(s)) { planRaid(s); spawnRaid(s); }
  for (const t of s.threats) {
    if (t.kind === 'tisun') stepEggThief(s, t);
    else if (t.kind === 'civet') stepCivet(s, t);
    else stepCropThreat(s, t);
  }
  s.threats = s.threats.filter(t => t.state !== 'leaving' || s.time - t.since < (t.kind === 'crow' ? 4000 : 20000));
}

// ---------- Kẻ săn mồi: chuột, diều hâu, chồn (issue 43, ADR 0004 + 0013) ----------
// Luật quyết định theo ô và xác suất, world.js chỉ diễn hoạt. Mỗi con trong s.preds:
// { id, kind: 'rat'|'hawk'|'weasel', state: 'hunt'|'leaving', since, x, y, tile?, tileAt?, target?, strikeAt, warned }
// strikeAt = lúc ra tay; luật báo 🔴 trước đúng PREDATOR.warnMs (10 giây), đuổi kịp trong khoảng đó thì không ai bị hại.
export const PRED_NAME = { rat: 'Chuột', hawk: 'Diều hâu', weasel: 'Chồn' };
const PRED_LC = { rat: 'chuột', hawk: 'diều hâu', weasel: 'chồn' };
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
    if (s.preds.filter(p => p.kind === 'rat').length < PREDATOR.rat.max && chance(PREDATOR.rat.spawnPerMin * (catGuards(s) ? CAT.ratSpawnMul : 1), d)) spawnRat(s);
    // Diều hâu, chồn chỉ tới khi chủ đang chơi: chạy bù offline không bao giờ làm con vật chết (ADR 0004)
    if (!catchUp) {
      // Có chó canh: kẻ săn mồi vẫn "định" tới (cùng xác suất) nhưng bị chó đuổi đi, người chơi thấy chữ bay và nhật ký
      const guard = guardOn(s), scare = kind => { fxEv(s.dog.x, s.dog.y - 10, `${s.dog.name} đuổi ${PRED_LC[kind]} đi rồi 🐕`, COL.good); log(s, `${s.dog.name} đuổi ${PRED_LC[kind]} đi rồi 🐕`); };
      if (!isNight(s) && !s.preds.some(p => p.kind === 'hawk') && chance(PREDATOR.hawk.chancePerMin, d)) {
        const prey = hawkPrey(s);
        if (prey.length) { if (guard) scare('hawk'); else spawnPounce(s, 'hawk', pick(prey)); }
      }
      const lamps = Math.min(3, mapOf(s).decos.filter(o => o.kind === 'deco_lamp').length);
      if (weaselHour(s) && !s.preds.some(p => p.kind === 'weasel') && chance(PREDATOR.weasel.chancePerMin * Math.pow(PREDATOR.weasel.lampMul, lamps), d)) {
        const prey = strays(s);
        if (prey.length) { if (guard) scare('weasel'); else spawnPounce(s, 'weasel', pick(prey)); }
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


// ---------- Mèo (issue 44) ----------
// Mèo nằm ở s.cats chứ không ở s.animals: nó là thú cưng (như chó Mực), không ở chuồng có rào, không dơ,
// không cho sản phẩm, không bán được. Săn chuột là luật trừu tượng theo ô và xác suất (ADR 0013):
// mỗi CAT.huntEvery một lượt rình, nhắm con chuột gần nhất theo ô, trúng theo xác suất. world.js chỉ diễn hoạt.
const MEO = 'meo';   // khóa loài mèo trong ANIMALS/LIFE (để riêng cho khỏi lẫn với tên loại event)
export const cats = s => s.cats ?? [];
export const catOf = (s, id) => cats(s).find(c => c.id === id) ?? null;
// Mèo đang ở bản đồ nào (vườn ban ngày, trong nhà ban đêm)
export const catsIn = (s, scene) => cats(s).filter(c => (c.scene ?? 'farm') === scene);
// Mèo đang ngậm chiến lợi phẩm tới khoe người chơi
export const catTrophies = s => cats(s).filter(c => c.trophy);
export const catHouses = s => s.farm.ents.filter(e => e.kind === 'cathouse');
export const catCap = s => catHouses(s).reduce((n, e) => n + PEN_TABLE.cathouse.cap[penLv(e) - 1], 0);

function mkCat(s, stage = 'non', extra = {}) {
  const m = mapOf(s), h = m.catHome ?? m.spawn;
  const c = {
    id: s.nextId++, type: MEO, name: ANIMALS.meo.name, sex: 'f', pet: true,
    stage, age: stageStart('meo', stage), hunger: 100, happy: 60,
    sick: 0, sickSince: 0, sickMs: 0, dose: 0, vaccUntil: 0,
    bond: 2, bondXp: 0,
    scene: 'farm', sleep: false, sun: false, x: h.x, y: h.y, tx: h.x, ty: h.y, tile: null, tileAt: 0, inAt: 0,
    huntAt: s.time + CAT.huntEvery, trophy: null, spatUntil: 0, coat: COAT.def.meo,
    ...extra,
  };
  (s.cats ??= []).push(c);
  return c;
}
// Mua mèo ở chợ Bà Tư: phải có nhà mèo trước, và nhà mèo còn chỗ. coat = màu lông (COATS.meo)
export function buyCat(s, sex = 'm', coat = COAT.def.meo) {
  if (!marketOpen(s)) return closed();
  const def = ANIMALS.meo;
  if (level(s) < def.lv) return R(false, `Cần cấp ${def.lv} mới mua được`, { reason: 'level' });
  if (!catHouses(s).length) return R(false, 'Bạn chưa có nhà mèo, xây một cái trước nhé', { reason: 'no_pen' });
  if (cats(s).length >= catCap(s)) return R(false, 'Nhà mèo chật rồi, nâng cấp hoặc xây thêm nhé', { reason: 'full' });
  if (sex !== 'm' && sex !== 'f') return R(false, 'Chọn đực hay cái nhé', { reason: 'sex' });
  if (!COATS.meo[coat]) return R(false, 'Chọn màu lông cho mèo nhé', { reason: 'coat' });
  const price = animalPrice('meo', sex);
  if (s.coins < price) return R(false, 'Chưa đủ xu, cố lên nhé', { reason: 'coins' });
  s.coins -= price;
  mkCat(s, 'non', { sex, coat });
  log(s, `Mang một ${def.baby.toLowerCase()} ở chợ Bà Tư về nuôi`);
  return R(true, `Đã mua ${def.baby.toLowerCase()} ${sex === 'm' ? 'đực' : 'cái'}`, { price });
}
// Có mèo trưởng thành khỏe mạnh (không bệnh, không đói lả) ở trong trại thì chuột sinh ra thưa đi (CAT.ratSpawnMul), dù mèo đang ngủ hay no
const catGuards = s => cats(s).some(c => !c.sick && (c.stage === 'truong' || c.stage === 'gia') && c.hunger >= CAT.guardMinHunger);
// Số chuột con mèo này đã bắt từ trước tới giờ
export const catCatches = c => c?.caught ?? 0;
// ---------- Màu lông chó, mèo (góp ý người chơi) ----------
// Màu hợp lệ của loài sp ('cho' | 'meo'), không thì màu mặc định (màu của bộ art gốc)
const coatOr = (sp, coat) => (Object.hasOwn(COATS[sp], coat ?? '') ? coat : COAT.def[sp]);
// Đổi màu lông ở trạm thú y Cô Út (mở cùng giờ chợ): who = 'dog' hoặc id con mèo. Tốn COAT.price xu.
export function setCoat(s, who, coat) {
  const a = who === 'dog' ? s.dog : catOf(s, who), sp = who === 'dog' ? 'cho' : 'meo';
  if (!a) return R(false, 'Không thấy con vật này', { reason: 'missing' });
  if (!marketOpen(s)) return R(false, 'Cô Út nghỉ rồi, sáng mai quay lại nhé', { reason: 'closed' });
  if (!Object.hasOwn(COATS[sp], coat ?? '')) return R(false, 'Không có màu lông này', { reason: 'coat' });
  if (coatOr(sp, a.coat) === coat) return R(false, `${a.name} đang lông ${COATS[sp][coat].toLowerCase()} rồi`, { reason: 'same' });
  if (s.coins < COAT.price) return R(false, 'Chưa đủ xu, cố lên nhé', { reason: 'coins' });
  s.coins -= COAT.price;
  a.coat = coat;
  log(s, `Cô Út tỉa lông, nhuộm cho ${a.name} thành màu ${COATS[sp][coat].toLowerCase()}`);
  return R(true, `${a.name} giờ lông ${COATS[sp][coat].toLowerCase()} rồi (-${COAT.price} xu)`, { price: COAT.price });
}
// Hệ số săn của con mèo này lúc này: 0 = không săn (mèo con, đang bệnh, no quá nên lười, mèo già chưa đói)
function catHuntMul(c) {
  if (c.sick || c.stage === 'non') return 0;
  if (c.hunger >= CAT.lazyFull) return 0;                          // cho ăn no quá: nằm phơi nắng
  if (c.stage === 'gia' && c.hunger >= CAT.oldHungry) return 0;    // mèo già lười, chỉ bắt khi đói
  const [lo, hi] = CAT.bestHunger;
  return c.hunger >= lo && c.hunger <= hi ? 1 : CAT.offBand;       // đói vừa phải thì săn tốt nhất
}
export const catHunting = (s, c) => (c.scene ?? 'farm') === 'farm' && !c.sleep && catHuntMul(c) > 0;
// Một lượt rình: chọn con chuột gần nhất theo ô, mèo đi tuần tới đúng ô đó rồi vồ
function catStrike(s, c) {
  const mul = catHuntMul(c);
  const rats = preds(s).filter(p => p.kind === 'rat' && p.state === 'hunt' && p.tile);
  if (!mul || !rats.length) return;
  const at = c.tile ?? { c: Math.floor(c.x / TS), r: Math.floor(c.y / TS) };
  const p = rats.reduce((best, r) => (far(r.tile, at) < far(best.tile, at) ? r : best));
  c.tile = { ...p.tile };
  goTile(c, c.tile);
  c.tileAt = s.time + rnd(...CAT.moveMs);
  if (Math.random() >= CAT.catchChance[c.stage] * mul) return;
  s.preds.splice(s.preds.indexOf(p), 1);
  s.stats.rats = (s.stats.rats || 0) + 1;
  c.caught = (c.caught ?? 0) + 1;
  addExp(s, CAT.catchExp);
  emit({ type: 'catRat', id: c.id, cat: c.name });
  if (catchUp) return;   // chạy bù: vẫn bớt chuột, nhưng không có màn khoe
  c.trophy = { until: s.time + CAT.trophyMs };
  emit({ type: 'catTrophy', id: c.id });
  fxEv(c.x, c.y, 'Bắt được chuột! 🐀', COL.good);
  log(s, `${c.name} bắt được một con chuột, đang mang tới khoe bạn đấy 🐈`);
}
// Mèo đi tuần: đổi ô sau CAT.moveMs, ô kế tiếp cách ô hiện tại tối đa CAT.roamRadius
function catWalk(s, c) {
  const roam = roamOf(s);
  if (!roam.tiles.length) return;
  if (c.tile && roam.has(c.tile.c, c.tile.r) && s.time < (c.tileAt || 0)) return;
  const home = mapOf(s).catHome;
  const from = c.tile ?? (home ? { c: Math.floor(home.x / TS), r: Math.floor(home.y / TS) } : roam.tiles[0]);
  const near = roam.tiles.filter(t => far(t, from) <= CAT.roamRadius);
  c.tile = { ...pick(near.length ? near : roam.tiles) };
  c.tileAt = s.time + rnd(...CAT.moveMs);
  goTile(c, c.tile);
}
// Luật chỉ chọn ô; world.js cho mèo đi tới (tx, ty) cho đẹp, như chuột (ADR 0013)
const goTile = (c, t) => { const m = tileMid(t); c.tx = m.x; c.ty = m.y; };
function stepCats(s, d) {
  s.cats ??= [];
  const night = isNight(s), m = mapOf(s);
  for (const c of s.cats) {
    const def = ANIMALS.meo;
    c.age = (c.age || 0) + d;
    const st = stageAt('meo', c.age);
    if (st !== c.stage) {
      c.stage = st;
      if (st === 'nho') log(s, `${c.name} đã thành mèo nhỡ, bắt đầu tập vồ chuột`);
      if (st === 'truong') { toast(`${c.name} đã lớn thành thợ săn chuột 🐈`); log(s, `${c.name} đã trưởng thành, săn chuột giỏi lắm`); }
      if (st === 'gia') { toast(`${c.name} già rồi, lười hơn, chỉ bắt chuột khi đói 👵`); log(s, `${c.name} đã già, chỉ bắt chuột khi đói`); }
    }
    c.hunger = Math.max(0, c.hunger - 100 * d / CAT.hungerMs);
    if (c.happy > 50) c.happy = Math.max(50, c.happy - CAT.happyDecayPerMin * d / MIN);
    if (c.hunger <= BOND.hungerBelow) bondShift(c, -BOND.lossPerMin * d / MIN);
    // bệnh: mèo cũng mắc bệnh như vật nuôi, nhưng là thú cưng nên không bao giờ nguy kịch, không chết (stepSick)
    if (!c.sick && !vaccinated(s, c) && (c.hunger < HUSBANDRY.hungryBelow || c.stage === 'gia') && chance(HUSBANDRY.sickChancePerMin * CAT.sickMul * sickFactor(c) * (c.stage === 'gia' ? SICK.oldChanceMul : 1), d)) fall(s, c, def);
    if (c.sick) stepSick(s, c, d, def);
    if (c.trophy && s.time >= c.trophy.until) c.trophy = null;
    // tối đi về cửa mèo trên nhà, chui qua (sau CAT.doorMs) rồi ngủ trong nhà; sáng chui ra lại vườn
    const want = night ? 'house' : 'farm', out = m.catDoor ?? m.catHome ?? m.spawn;
    if (want === 'house' && (c.scene ?? 'farm') === 'farm') {
      if (!c.inAt) { c.inAt = s.time + CAT.doorMs; c.tx = out.x; c.ty = out.y; c.tile = null; c.trophy = null; c.sun = false; }
      if (s.time < c.inAt) continue;   // đang đi về cửa mèo: không săn, không cãi nhau
    }
    c.inAt = 0;
    if ((c.scene ?? 'farm') !== want) {
      c.scene = want; c.tile = null;
      const at = want === 'house' ? CAT.houseSpot : { x: out.x, y: out.y + 8 };
      Object.assign(c, at, { tx: at.x, ty: at.y });
    }
    c.sleep = want === 'house';
    c.sun = !c.sleep && c.stage !== 'non' && !c.sick && catHuntMul(c) === 0;   // lười thì nằm phơi nắng
    if (c.sleep) continue;
    catWalk(s, c);
    c.huntAt ??= s.time + CAT.huntEvery;
    if (s.time >= c.huntAt) { c.huntAt = s.time + CAT.huntEvery; catStrike(s, c); }
    // mèo với chó cãi nhau: sự kiện vui, không gây hại, không đổi chỉ số nào
    const g = s.dog;
    if (!catchUp && g.x != null && (g.scene ?? 'farm') === 'farm' && s.time >= (c.spatUntil || 0)
      && Math.max(Math.abs(g.x - c.x), Math.abs(g.y - c.y)) <= CAT.spatRadius * TS && chance(CAT.spatPerMin, d)) {
      c.spatUntil = s.time + CAT.spatMs;
      emit({ type: 'catSpat', id: c.id });
      log(s, `${c.name} và ${g.name} lại cãi nhau một trận, chẳng ai thua ai 😼`);
    }
  }
}
// Nhờ mèo lùa: chỉ 1 con gần nhất và chỉ khi mèo đang vui (mỏng hơn chó ở lát 45)
export function catHerd(s, id) {
  const c = catOf(s, id);
  if (!c) return R(false, 'Không thấy con mèo này', { reason: 'missing' });
  if (!CAT.herdStages.includes(c.stage)) return R(false, `${c.name} còn bé quá, chưa lùa được con nào`, { reason: 'stage' });
  if (c.happy < CAT.herdHappy) return R(false, `${c.name} đang không vui, vuốt ve nó đã`, { reason: 'mood' });
  const list = outOfPen(s).filter(a => a.x != null);
  if (!list.length) return R(false, 'Cả đàn đang trong chuồng cả rồi', { reason: 'none' });
  const a = list.reduce((best, x) => (Math.hypot(x.x - c.x, x.y - c.y) < Math.hypot(best.x - c.x, best.y - c.y) ? x : best));
  bringHome(s, a);
  emit({ type: 'catHerd', id: c.id, animal: a.id });
  log(s, `${c.name} lùa một con ${ANIMALS[a.type].name.toLowerCase()} về chuồng`);
  return R(true, `${c.name} lùa 1 con về chuồng 🐈`, { n: 1, animal: a.id });
}
// Khen mèo vừa mang chuột tới khoe: nó vui và thân hơn
export function praiseCat(s, id) {
  const c = catOf(s, id);
  if (!c) return R(false, 'Không thấy con mèo này', { reason: 'missing' });
  if (!c.trophy) return R(false, `${c.name} chưa có gì để khoe`, { reason: 'none' });
  c.trophy = null;
  c.happy = Math.min(100, c.happy + CAT.praiseHappy);
  addBond(s, c, 'pet');
  addExp(s, CAT.praiseExp);
  return R(true, `${c.name} được khen, kiêu hãnh lắm 🐈`, { bond: c.bond });
}

// Quạ và thằng Tèo: nhắm một ô ruộng chín
function stepCropThreat(s, t) {
  const p = s.plots[t.plot], crow = t.kind === 'crow', who = THIEF_NAME[t.kind];
  if (t.state === 'coming') {
    if (!p.crop) { t.state = 'leaving'; t.since = s.time; } // cây đã biến mất
    else if (s.time >= t.arriveAt) {
      arrive(s, t);
    }
  } else if (t.state === 'eating') {
    if (!p.crop) { t.state = 'leaving'; t.since = s.time; }
    else if (s.time - t.since >= (crow ? THREATS.crowEatMs : THREATS.thiefStealMs)) {
      const nm = CROPS[p.crop.id].name;
      p.crop = null; t.state = 'leaving'; t.since = s.time; t.loot = !crow;
      emit({ type: crow ? 'crow' : 'thief', name: nm });
      const c = plotCenter(s, p.idx);
      fxEv(c.x, c.y, crow ? 'Quạ ăn mất cây! 😢' : 'Bị hái trộm! 😢', COL.bad);
      log(s, crow ? `Quạ đã ăn mất ${nm}` : `${who} hái trộm mất ${nm}`);
    }
  }
}

// Tí Sún: lục chỗ trứng dưới đất rồi ôm vài quả chạy
function stepEggThief(s, t) {
  if (!s.eggs.length) { leave(s, t); return; }
  if (t.state === 'coming') {
    if (s.time < t.arriveAt) return;
    arrive(s, t);
  } else if (t.state === 'eating' && s.time - t.since >= RAID.eggStealMs) {
    const n = Math.min(s.eggs.length, rint(...RAID.eggTake));
    for (let i = 0; i < n; i++) s.eggs.splice(rint(0, s.eggs.length - 1), 1);
    t.state = 'leaving'; t.since = s.time; t.loot = true;
    emit({ type: 'tisun', n });
    fxEv(t.at.x, t.at.y, `Mất ${n} quả trứng! 😢`, COL.bad);
    log(s, `Tí Sún lấy trộm mất ${n} quả trứng`);
  }
}

// Chồn hương: rình con ngủ ngoài chuồng rồi tha đi (chỉ khi chủ vườn đang chơi, ADR 0004)
function stepCivet(s, t) {
  const a = s.animals.find(x => x.id === t.target);
  if (!a || !a.stray) { leave(s, t); return; }
  if (t.state === 'coming') {
    if (s.time < t.arriveAt) return;
    arrive(s, t);
  } else if (t.state === 'eating' && s.time - t.since >= RAID.civetCatchMs) {
    const nm = ANIMALS[a.type].name;
    s.animals.splice(s.animals.indexOf(a), 1);
    t.state = 'leaving'; t.since = s.time; t.loot = true;
    emit({ type: 'civet', animal: nm });
    fxEv(t.at.x, t.at.y, `Chồn hương tha mất ${nm.toLowerCase()}! 😿`, COL.bad);
    log(s, `Chồn hương tha mất một con ${nm.toLowerCase()} ngủ ngoài chuồng`);
  }
}
const leave = (s, t) => { if (t.state !== 'leaving') { t.state = 'leaving'; t.since = s.time; } };
// Tới nơi và bắt đầu ra tay. Kẻ trộm đứng đúng chỗ nó nhắm: world.js thường đã đưa tới nơi rồi,
// nhưng khi vườn chạy nhanh (tua giờ) thì luật chốt lại cho khớp (ADR 0013).
function arrive(s, t) {
  t.state = 'eating'; t.since = s.time;
  if (t.kind !== 'crow') { const a = raidAt(s, t); t.x = a.x; t.y = a.y; }
  emit({ type: 'eating', kind: t.kind });
  caughtByDog(s, t);
}

// Chó phát hiện kẻ vừa tới nơi và đuổi đi? (bán kính theo giai đoạn, ×2 tại chỗ gác;
// học Đuổi chim thì tự tìm quạ ở bất cứ đâu; thằng Tèo có giày êm thì bán kính thu lại)
function caughtByDog(s, t) {
  const crow = t.kind === 'crow', at = raidAt(s, t);
  if (!guardOn(s)) return false;
  const seen = dogSees(s, at, { mul: t.kind === 'thief' ? thiefStealth(s) : 1 }) || (crow && knowsTrick(s, 'bird'));
  if (!seen || Math.random() >= DOG.guardChance) return false;
  leave(s, t);
  s.stats[crow ? 'crows' : 'thieves']++;
  emit({ type: 'guard', who: t.kind });
  log(s, `${s.dog.name} sủa vang, đuổi ${THIEF_LC[t.kind]} đi rồi`); snd('bark');
  return true;

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
  // sản phẩm các loài còn lại (sữa bò, lông cừu...): chỉ xin khi nhà đang nuôi loài đó và đã đủ cấp
  const prods = Object.entries(ANIMALS).filter(([k, a]) => a.product && !items[a.product] && a.lv <= lv && !['ga', 'vit'].includes(k) && s.animals.some(x => x.type === k)).map(([, a]) => a.product);
  if (prods.length && Math.random() < 0.3) items[pick(prods)] = rint(2, 4);
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
  if (s.scene === 'visit') return guestActs(s, t);
  const f = { plot: (s, t) => withTools(s, t, plotActs(s, t)),lockedPlot: lockedActs, animal: animalActs, egg: eggActs,
    poop: () => [mk('scoop', '💩', 'Xúc phân')], trough: troughActs, gate: gateActs, scale: () => [mk('weigh', '⚖️', 'Cân heo xem số ký')], nest: nestActs, dog: dogActs, bowl: bowlActs, cat: catActs, threat: threatActs, pred: predActs, building: buildingActs, door: doorActs, deco: decoActs, clutter: clutterActs, strip: stripActs }[t.kind];
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
  if (c.progress >= 1) return [mk('harvest', '🧺', `Thu hoạch ${CROPS[c.id].name} (${harvestQty(c)})${wilting(c) ? ' – sắp héo!' : ''}`, room(s) < harvestQty(c) ? FULL : null)];
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
  const nx = nextLockedPlot(s);
  if (t.idx !== nx) return s.plots[t.idx] && !s.plots[t.idx].unlocked && nx >= 0 ? [mk('expand', '🔓', 'Mở rộng đất', `Mở ô ${nx + 1} trước (mở đất theo thứ tự)`)] : [];
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
  const tid = t.id ?? mapOf(s).pens[t.pen]?.id, lvl = s.troughs[tid] ?? 0;
  const acts = [mk('fill', '🌾', `Đổ cám vào máng (${lvl}/${HUSBANDRY.troughMax})`,
    n <= 0 ? noItem(item) : lvl >= HUSBANDRY.troughMax ? 'Máng đầy ắp rồi' : null)];
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
  // xích hay thả rông (issue 31): xích thì chỉ canh 3 ô quanh chuồng, thả thì đuổi khắp vườn
  out.push(mk('chain', '⛓️', g.chained ? `Thả ${g.name} chạy rông` : `Xích ${g.name} vào chuồng`));
  // dạy lệnh và ra lệnh (issue 45)
  const list = trickList(s), left = list.filter(t => !t.done);
  if (left.length) out.push(mk('train', '🎓', `Dạy lệnh cho ${g.name} (còn ${have(s, TRAIN.treat)} bánh thưởng)`, left.some(t => t.can.ok) ? null : left[0].can.msg));
  if (g.cmd) out.push(mk('cmd_stop', '✋', `Cho ${g.name} nghỉ`));
  for (const t of list) if (t.done && !t.auto) out.push(mk('cmd_' + t.id, t.icon, `Lệnh: ${t.name}`));
  return out;
}

// Bát ăn cạnh chuồng chó: đổ 1 xương = 1 phần; nhãn nút cho biết bát còn bao nhiêu
const bowlText = g => (g.bowl > 0 ? `bát còn ${g.bowl}/${DOG.bowlMax} phần` : 'bát đang trống');
function bowlActs(s) {
  const g = s.dog, n = have(s, 'dogfood');
  return [mk('fill', '🦴', `Đổ xương vào bát (${bowlText(g)}, còn ${n} xương)`, g.bowl >= DOG.bowlMax ? 'Bát đầy rồi' : n <= 0 ? noItem('dogfood') : null)];
}

// Mèo (issue 44): không dạy được lệnh nên không có nút dạy/ra lệnh, không dơ nên không có nút tắm.
function catActs(s, t) {
  const c = catOf(s, t.id);
  if (!c) return [];
  const n = have(s, 'catfood'), A = {};
  if (c.trophy) A.praise = mk('praise', '👏', `Khen ${c.name} (vừa bắt được chuột 🐀)`);
  A.feed = mk('feed', '🐟', `Cho ${c.name} ăn (còn ${n})`,
    n <= 0 ? noItem('catfood') : c.hunger >= 95 ? `${c.name} no căng rồi, no quá là nó lười không săn đâu` : null);
  A.pet = mk('pet', '🤗', `Vuốt ve ${c.name}`);
  if (c.sick) A.medicine = mk('medicine', 'medicine', `Cho ${c.name} uống thuốc thú y (còn ${have(s, 'medicine')}${c.sick === 2 ? `, uống ${c.dose || 0}/${SICK.doses[2]} liều` : ''})`,
    have(s, 'medicine') <= 0 ? noItem('medicine') : null);
  else if (have(s, 'vaccine') > 0 && !vaccinated(s, c)) A.vaccinate = mk('vaccinate', 'vaccine', `Tiêm vắc-xin (còn ${have(s, 'vaccine')})`);
  const first = c.trophy ? 'praise' : c.sick ? 'medicine' : c.hunger < 40 ? 'feed' : 'pet';
  const list = [A[first], ...Object.entries(A).filter(([k]) => k !== first).map(([, v]) => v)];
  const why = !CAT.herdStages.includes(c.stage) ? `${c.name} còn bé quá`
    : c.happy < CAT.herdHappy ? `${c.name} đang không vui, vuốt ve nó đã`
      : !outOfPen(s).length ? 'Cả đàn đang trong chuồng rồi' : null;
  list.push(mk('herd', '🐑', `Nhờ ${c.name} lùa 1 con gần nhất về chuồng`, why));
  list.push(mk('rename', '✏️', 'Đổi tên'));
  return list;
}

function threatActs(s, t) {
  const th = s.threats.find(x => x.id === t.id);
  if (!th) return [];
  const gone = th.state === 'leaving' && !th.loot ? 'Nó chuồn mất rồi' : null;
  if (th.kind === 'crow') return [mk('shoo', '🪶', 'Đuổi quạ', th.state === 'leaving' ? 'Nó bay mất rồi' : null)];
  if (th.kind === 'civet') return [mk('shoo', '🦝', 'Đuổi chồn hương', gone)];
  return [mk('catch', '🧢', `Bắt ${THIEF_LC[th.kind]}`, gone)];
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
  friendGate: { icon: '🚪', label: 'Xem cổng bạn bè', msg: 'Đăng nhập để thăm bạn bè' },
};
function buildingActs(s, t) {
  const b = sceneMap(s).building(t.id);
  if (!b) return [];
  const open = { shed: ['📦', 'Vào nhà kho'], shipbin: ['📮', 'Mở thùng giao hàng'], board: ['📋', 'Xem đơn hàng'], wardrobe: ['👕', 'Mở tủ đồ'], smithy: ['🔨', 'Vào tiệm rèn'], vet: ['💊', 'Vào trạm thú y Cô Út'], phone: ['📞', 'Gọi bác sĩ thú y'] }[b.id];
  if (open) return [mk('open', open[0], open[1])];
  if (b.id === 'market') return [mk('open', '🛒', 'Mua bán ở chợ', marketOpen(s) ? null : CLOSED)];
  if (TALK[b.id]) return [mk('talk', TALK[b.id].icon, TALK[b.id].label)];
  if (b.id === 'doghouse') return dogActs(s).filter(a => ['chain', 'feed', 'pet'].includes(a.id)).sort((x, y) => (x.id === 'chain' ? 0 : 1) - (y.id === 'chain' ? 0 : 1));   // chuồng chó: xích/thả trước, rồi cho ăn, vuốt ve
  if (b.id === 'house') return [mk('enter', '🏠', 'Vào nhà')];
  if (b.id === 'gate') return [mk('enter', '🚪', 'Ra làng')];
  if (b.id === 'giftbox') return [mk('open', '🎁', s.visit ? 'Tặng quà cho chủ vườn' : 'Mở hộp quà')];
  if (b.id === 'guestbook') return [mk('open', '📖', s.visit ? 'Ký sổ lưu bút' : 'Đọc sổ lưu bút')];
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
  return [mk('buy', '🗺️', `Mua đất phía ${DIR_NAME[t.dir]}: dải ${d.w}×${d.h} ô, ${d.price} xu, cấp ${d.level}`, level(s) < d.level ? `Mua đất ở mép vườn từ cấp ${d.level}` : s.coins < d.price ? 'Chưa đủ xu' : null)];
}

// Cửa sang bản đồ khác: { kind: 'door', to }
const doorOf = (s, to) => sceneMap(s).doors.find(d => d.to === to) ?? null;
function doorActs(s, t) {
  const d = doorOf(s, t.to);
  return d ? [mk('go', '🚪', d.to === 'farm' ? (s.scene === 'village' ? 'Về vườn nhà' : 'Ra vườn') : `Vào ${d.name.toLowerCase()}`)] : [];
}

// ---------- perform ----------
// Sản lượng một ô: trừ phần khách đã trộm mất (issue 30, `crop.stolen`)
const cropYield = c => Math.round(CROPS[c.id].yield * (c.fert ? 1 + FARMING.fertYield : 1));
const harvestQty = c => Math.max(0, cropYield(c) - (c.stolen || 0));
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
  if (t.kind === 'bowl') return m.dogBowl ?? s.player;
  const list = { animal: s.animals, egg: s.eggs, poop: s.poops, threat: s.threats, pred: s.preds, cat: s.cats }[t.kind];
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
  if (s.scene === 'visit') return guestDo(s, t, id, at);
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
    const tid = t.id ?? mapOf(s).pens[t.pen]?.id;
    s.troughs[tid] = Math.min(HUSBANDRY.troughMax, (s.troughs[tid] ?? 0) + HUSBANDRY.unitsPerBag);
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

  bowl(s, t, id, at) {
    const g = s.dog;
    take(s, 'dogfood'); g.bowl = Math.min(DOG.bowlMax, (g.bowl || 0) + 1);
    return res(true, `Đã đổ xương vào bát (${g.bowl}/${DOG.bowlMax}), ${g.name} đói sẽ tự ra ăn`, [say(at, '🦴')], 'pop');
  },
  dog(s, t, id, at) {
    const g = s.dog;
    if (id === 'feed') { take(s, 'dogfood'); g.hunger = 100; return res(true, `${g.name} ăn ngon lành`, [say(at, 'Gâu gâu! 🦴')], 'bark'); }
    if (id === 'chain') { const r = setChained(s, !g.chained); return res(true, r.msg, [say(at, g.chained ? '⛓️' : '🏃')], 'click'); }
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

  cat(s, t, id, at) {
    const c = catOf(s, t.id);
    switch (id) {
      case 'praise': { const r = praiseCat(s, c.id); return r.ok ? res(true, r.msg, [say(at, 'Giỏi quá! 👏'), ...heartFx(s, c, at, 'pet')], 'pop') : bad(r.msg, at); }
      case 'feed': take(s, 'catfood'); c.hunger = 100; return res(true, `${c.name} ăn ngon lành`, [say(at, 'Meo meo! 🐟'), ...heartFx(s, c, at, 'feed')], 'eat', { bond: c.bond });
      case 'pet': c.happy = Math.min(100, c.happy + CAT.petHappy); return res(true, `${c.name} gừ gừ dụi vào chân bạn`, [say(at, '❤️'), ...heartFx(s, c, at, 'pet')], 'pop', { bond: c.bond });
      case 'medicine': { const r = giveMedicine(s, c.id); return r.ok ? res(true, r.msg, r.cured ? [say(at, 'Khỏe rồi! 💪'), ...heartFx(s, c, at, 'cure')] : [say(at, `Thuốc ${r.dose}/${SICK.doses[2]} 💊`)], 'spray') : bad(r.msg, at); }
      case 'vaccinate': { const r = vaccinate(s, c.id); return r.ok ? res(true, r.msg, [say(at, 'Tiêm xong! 💉')], 'spray') : bad(r.msg, at); }
      case 'herd': { const r = catHerd(s, c.id); return r.ok ? res(true, r.msg, [say(at, 'Lùa về! 🐑')], 'pop', { n: r.n }) : bad(r.msg, at); }
      case 'rename': return res(true, '', [], 'click', { rename: c.id });
    }
  },

  threat(s, t, id, at) {
    const th = s.threats.find(x => x.id === t.id);
    s.threats.splice(s.threats.indexOf(th), 1);
    if (th.kind === 'crow') {
      s.stats.crows++; addExp(s, 1);
      return res(true, 'Quạ hoảng hốt bay đi', [say(at, 'Xù xù! 🪶')], 'crow');
    }
    if (th.kind === 'civet') {   // chồn hương là con thú: đuổi đi là xong, không phạt vạ gì
      s.stats.thieves++; addExp(s, 2);
      log(s, 'Đuổi được con chồn hương ra khỏi vườn');
      return res(true, 'Chồn hương cụp đuôi chạy mất', [say(at, 'Xùy! 🦝')], 'bark');
    }
    // trộm người: hiện hộp thoại cho chọn kiểu phạt (issue 46)
    if (th.kind === 'thief') s.teoCaught = (s.teoCaught || 0) + 1;
    s.stats.thieves++;
    s.caught = { kind: th.kind, name: THIEF_NAME[th.kind], coins: rint(...THREATS.thiefCaughtCoins) };
    log(s, `Bắt được ${THIEF_LC[th.kind]} trong vườn`);
    return res(true, `Bắt được ${THIEF_LC[th.kind]}! Phạt thế nào đây?`, [say(at, 'Bắt được! 🧢')], 'pop', { punish: punishInfo(s) });
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
    if (t.id === 'doghouse') return DO.dog(s, t, id, at);   // chuồng chó: cùng việc với chạm vào chó
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

// ---------- Quà và sổ lưu bút ở cổng (issue 29, ADR 0012) ----------
// Hộp quà là hàng đợi nằm trên server (chủ offline vẫn nhận): box là mảng quà đang chờ { id?, op, item, qty, from? }.
// Khách tặng được hạt giống (trong kho) hoặc nông sản / sản phẩm (trong giỏ hoặc kho); chủ nhận nông sản vào giỏ (tới khi đầy),
// hạt giống vào kho. Mỗi quà có mã thao tác op duy nhất: áp dụng lại cùng mã thì không làm gì.
export const GATE_BOXES = ['giftbox', 'guestbook'];
export const giftable = k => ITEMS[k]?.kind === 'seed' || !!CROPS[k] || !!PRODUCTS[k];
// Hộp đã chứa thêm được một quà qty món item chưa (server gọi đúng hàm này; không biết giỏ khách nên chỉ kiểm hộp)
export function giftBoxCheck(box, item, qty) {
  if (!giftable(item)) return no('bad_item', 'Món này không tặng được');
  if (!Number.isInteger(qty) || qty < 1) return no('bad_qty', 'Số lượng không hợp lệ');
  if (qty > GIFT.perGift) return no('too_many', `Mỗi lần tặng tối đa ${GIFT.perGift} món`);
  if ((box?.length ?? 0) >= GIFT.boxMax) return no('box_full', 'Hộp quà ở cổng đã đầy, đợi chủ vườn nhận bớt nhé');
  return { ok: true };
}
// Khách s tặng được không: món phải có trong giỏ / kho, đủ số lượng, hộp (box; null = chưa biết) còn chỗ
export function giftCheck(s, box, item, qty) {
  if (!giftable(item)) return no('bad_item', 'Món này không tặng được');
  if (!Number.isInteger(qty) || qty < 1) return no('bad_qty', 'Số lượng không hợp lệ');
  if (!have(s, item)) return no('no_item', `Bạn không có ${itemName(item).toLowerCase()}`);
  if (qty > have(s, item)) return no('not_enough', `Bạn chỉ có ${have(s, item)} ${itemName(item).toLowerCase()}`);
  return box ? giftBoxCheck(box, item, qty) : qty > GIFT.perGift ? giftBoxCheck([], item, qty) : { ok: true };
}
// Khách tặng quà: trừ khỏi giỏ / kho của khách, xếp thêm vào hộp ox. Cùng op đã có trong hộp thì không làm gì (dup).
export function giftTo(s, box, item, qty, op) {
  if (op != null && box.some(g => g.op === op)) return R(true, '', { dup: true });
  const c = giftCheck(s, box, item, qty);
  if (!c.ok) return c;
  take(s, item, qty);
  const entry = { op, item, qty };
  box.push(entry);
  return R(true, `Đã bỏ ${qty} ${itemName(item).toLowerCase()} vào hộp quà`, { entry });
}
// Chia hộp: lấy từng quà theo thứ tự, nông sản / sản phẩm chỉ lấy tới khi hết chỗ trong giỏ (phần dư ở lại hộp),
// hạt giống thì lấy hết. Trả { taken, rest }: các phần đã lấy và hộp còn lại (thuần, không sửa box).
export function splitGifts(box, room) {
  const taken = [], rest = [];
  for (const g of box) {
    const n = inBasket(g.item) ? Math.min(g.qty, Math.max(0, room)) : g.qty;
    if (inBasket(g.item)) room -= n;
    if (n > 0) taken.push({ ...g, qty: n });
    if (n < g.qty) rest.push({ ...g, qty: g.qty - n });
  }
  return { taken, rest };
}
// Cho các phần quà đã lấy vào giỏ / kho (không kiểm sức chứa: splitGifts đã lo)
export function addGifts(s, taken) {
  for (const g of taken) give(s, g.item, g.qty);
  return taken.reduce((a, g) => a + g.qty, 0);
}
// Chủ mở hộp: nhận hết phần vừa giỏ, phần dư để lại. Sửa s và box; trả { taken, moved }
export function takeGifts(s, box) {
  const { taken, rest } = splitGifts(box, room(s));
  box.splice(0, box.length, ...rest);
  const moved = addGifts(s, taken);
  return R(true, moved ? `Đã nhận ${moved} món` + (rest.length ? ', giỏ đầy nên còn quà nằm lại trong hộp' : '') : rest.length ? FULL : 'Hộp quà đang trống', { taken, moved });
}

// ---------- Thăm vườn người khác (issue 27, ADR 0012) ----------
// Khách `me` bước vào vườn `owner`: dựng bản đi dạo từ bản lưu chủ `raw` (server đã chạy bù). Đất, cây, con vật, chó...
// là bản sao của chủ, không bao giờ lưu lại hay gửi đi. Phần của khách (tên, ngoại hình, giỏ, kho, đơn hàng...) dùng chung
// đối tượng với `me`; xu, kinh nghiệm, thể lực, bình nước đọc ghi thẳng vào `me`. Trả null nếu không đọc được bản lưu chủ.
const VISIT_WORLD = ['farm', 'plots', 'animals', 'troughs', 'manure', 'eggs', 'clutch', 'nest', 'dog', 'cats', 'poops', 'shipbin', 'time', 'day', 'weather', 'simMs', 'nextId', 'today', 'guests'];
const VISIT_LIVE = ['coins', 'exp', 'stamina', 'can', 'selectedSeed'];
export function startVisit(me, raw, owner) {
  const h = raw && loadGame(structuredClone(raw));
  if (!h) return null;
  // quạ của chủ đi theo (khách đuổi giúp được); thằng Tèo thì không, bắt trộm là việc của chủ
  // visit.level = cấp của chủ vườn: trong bản đi dạo `exp` là của khách, nên luật trộm phải đọc cấp chủ ở đây
  const v = { ...me, threats: (h.threats ?? []).filter(t => t.kind === 'crow'), sit: false, scene: 'visit', visit: { owner, fed: false, level: levelInfo(h.exp || 0).level } };
  for (const k of VISIT_LIVE) Object.defineProperty(v, k, { get: () => me[k], set: x => { me[k] = x; }, enumerable: true });
  for (const k of VISIT_WORLD) v[k] = h[k];
  // kẻ săn mồi và trộm NPC là chuyện của chủ vườn
  v.preds = []; v.raid = null; v.caught = null; v.chore = null; v.courier = null;
  v.dog = guestDog(h.dog);
  const a = sceneMap(v).exit;
  v.player = { x: a.x, y: a.y, dir: a.dir ?? 0 };
  return v;
}
// chó của chủ ở lại vườn, thôi lệnh đi theo / lùa (issue 45)
const guestDog = d => ({ ...d, scene: 'farm', cmd: ['follow', 'herd'].includes(d?.cmd?.id) ? null : d?.cmd ?? null });

// ---------- Khách thấy chủ làm gì ngay (sửa lỗi online: chủ thu hoạch mà cây vẫn nằm trên máy khách) ----------
// Trình duyệt chủ gửi `visitWorld(chủ)` cho khách đang đứng trong vườn (qua server, tin `world`) mỗi khi vườn đổi;
// trình duyệt khách áp lên bản đi dạo bằng `visitSync`. Bản đi dạo không tự chạy mô phỏng, chỉ đổi theo tin này.
const crowsOf = h => (h.threats ?? []).filter(t => t.kind === 'crow');
export function visitWorld(h) {
  const w = {};
  for (const k of VISIT_WORLD) w[k] = h[k];
  return Object.assign(w, { threats: crowsOf(h), level: levelInfo(h.exp || 0).level });
}
// Tên các trường của tin `world` (server chỉ chuyển tiếp đúng các trường này)
export const VISIT_KEYS = [...VISIT_WORLD, 'threats', 'level'];
const PENDING_MS = 15_000;   // việc khách vừa làm: giữ trên máy khách chừng này chờ tin chủ có nó
const near = (a, b) => b && Number.isFinite(b.x) && Number.isFinite(b.y) && Math.hypot((a.x ?? 1e9) - b.x, (a.y ?? 1e9) - b.y) < 64;
// Con nào còn (cùng id) và chưa bị chủ dời đi xa thì giữ chỗ đứng trên máy khách: world.js đang cho nó đi lại
function keepPlaces(list, old) {
  const by = new Map((old ?? []).map(o => [o.id, o]));
  for (const o of list) { const p = by.get(o.id); if (p && near(o, p)) { o.x = p.x; o.y = p.y; } }
  return list;
}
// Áp phần vườn chủ `w` (tin `world`) lên bản đi dạo `v`. Trả false nếu tin hỏng hoặc `v` không phải bản đi dạo.
// Giữ của khách: chỗ đứng, phần của khách, chỗ con vật đang đi; lần sủa / nghỉ của chó (mới hơn thì giữ);
// việc khách vừa làm (giúp, trộm) mà tin chủ chưa có thì áp lại, tin chủ có rồi hay quá PENDING_MS thì thôi.
const LISTS = ['plots', 'animals', 'eggs', 'cats', 'poops', 'threats', 'guests'];
export function visitSync(v, w) {
  if (!v?.visit || !w || typeof w !== 'object' || Array.isArray(w)) return false;
  if (!Array.isArray(w.plots) || LISTS.some(k => w[k] != null && !Array.isArray(w[k])) || !w.dog || typeof w.dog !== 'object' || !w.farm || typeof w.farm !== 'object') return false;
  const old = { animals: v.animals, cats: v.cats, threats: v.threats, dog: v.dog };
  for (const k of VISIT_WORLD) {
    if (k === 'farm' && JSON.stringify(w.farm) === JSON.stringify(v.farm)) continue;   // bố cục y nguyên: khỏi dựng lại bản đồ
    if (k in w) v[k] = w[k];
  }
  v.threats = crowsOf(w);
  if (Number.isInteger(w.level)) v.visit.level = w.level;
  keepPlaces(v.animals ?? [], old.animals);
  keepPlaces(v.cats ?? [], old.cats);
  keepPlaces(v.threats, old.threats);
  const d = v.dog = guestDog(w.dog), od = old.dog;
  if (od) {
    if (near(d, od)) { d.x = od.x; d.y = od.y; }
    if ((od.barkAt || 0) > (d.barkAt || 0)) { d.barkAt = od.barkAt; d.barkX = od.barkX; d.barkY = od.barkY; }
    d.quiet = Math.max(d.quiet || 0, od.quiet || 0);
  }
  // việc khách vừa làm: tin chủ có rồi (nhật ký khách có mã đó) hay quá lâu thì thôi, còn lại áp lại
  const seen = new Set((v.guests ?? []).map(g => g.id)), t = now();
  v.visit.mine = (v.visit.mine ?? []).filter(op => !seen.has(op.id) && t - op.at < PENDING_MS && guestOpApply(v, meAsGuest(v), op).ok);
  return true;
}

// Khách được làm `id` với target `t` không (t.kind 'build' = chế độ xây dựng): { ok: true } hoặc { ok: false, reason, msg }.
// Ra cổng, giúp vườn (id 'help_*', issue 28), trộm (id 'steal', issue 30) và làm quen với chó: chó lạ phải được
// cho ăn (đồ trong giỏ của khách) rồi mới chịu cho vuốt ve.
export function guestCheck(s, t, id) {
  if (t?.kind === 'build') return no('build', 'Chỉ chủ vườn mới sửa được vườn này');
  if (id?.startsWith('help_')) {
    const blocked = helpBlock(s, s.name);
    if (blocked) return blocked;
    return guestOps(s, t).some(o => o.act === id.slice(5)) ? { ok: true } : no('nothing', NOTHING);
  }
  if (id === 'steal') {
    const o = guestOps(s, t).find(x => x.kind === 'steal');
    return o ? guestOpCheck(s, meAsGuest(s), { ...o, id: 'xem-thu' }) : no('nothing', NOTHING_STEAL);
  }
  if (t?.kind === 'building') {
    const b = sceneMap(s).building(t.id);
    if (b?.guest) return no('private', b.guest);
    if (b?.id === 'gate' || GATE_BOXES.includes(b?.id)) return { ok: true };
  }
  if (t?.kind === 'dog' && id === 'feed') return (s.basket.dogfood || 0) > 0 ? { ok: true } : no('no_food', `Trong giỏ không có ${itemName('dogfood').toLowerCase()}`);
  if (t?.kind === 'dog' && id === 'sausage') return guestOpCheck(s, meAsGuest(s), { id: 'xem-thu', kind: 'sausage', act: 'sausage' });
  if (t?.kind === 'dog' && id === 'pet') return s.visit?.fed ? { ok: true } : no('stranger', `${s.dog.name} chưa quen bạn, cho ăn trước đã 🦴`);
  return no('guest', 'Khách chỉ đi dạo, chưa làm được việc này');
}
function guestActs(s, t) {
  const why = id => guestCheck(s, t, id).msg ?? null;
  const ops = guestOps(s, t);
  if (ops.length) {   // ô ruộng, trứng, con vật, con quạ: việc giúp và việc trộm làm được ở đây (bị chặn thì mờ kèm lý do)
    const full = helpBlock(s, s.name)?.msg ?? null;
    return ops.map(o => (o.kind === 'steal'
      ? mk('steal', '😈', stealLabel(s, o), why('steal'))
      : mk('help_' + o.act, HELP_JOBS[o.act].icon, HELP_JOBS[o.act].label, full)));
  }
  if (t.kind === 'building') {
    const b = sceneMap(s).building(t.id);
    if (b?.id === 'gate' || GATE_BOXES.includes(b?.id)) return buildingActs(s, t);
    return b?.guest ? buildingActs(s, t).map(a => ({ ...a, disabled: b.guest })) : [];
  }
  if (t.kind === 'bowl') return [mk('fill', '🦴', `Bát ăn của ${s.dog.name}: ${bowlText(s.dog)}`, 'Bát của chủ vườn, khách cho chó ăn tận miệng nhé')];
  if (t.kind === 'dog') return [mk('pet', '🤗', `Vuốt ve ${s.dog.name}`, why('pet')), mk('feed', '🦴', `Cho ${s.dog.name} ăn (giỏ còn ${s.basket.dogfood || 0})`, why('feed')),
    mk('sausage', 'sausage', `Ném xúc xích cho ${s.dog.name} (còn ${haveItem(s, 'sausage')})`, why('sausage'))];
  return [];
}
function guestDo(s, t, id, at) {
  if (id.startsWith('help_')) return helpDo(s, t, id.slice(5), at);
  if (id === 'steal') return stealDo(s, t, at);
  if (id === 'sausage') return sausageDo(s, at);
  if (t.kind === 'building') return DO.building(s, t, id, at);   // cổng: ra làng
  const g = s.dog;
  if (id === 'feed') {
    drop(s.basket, 'dogfood', 1);
    s.visit.fed = true;
    return res(true, `${g.name} ăn ngon lành, giờ đã quen bạn rồi`, [say(at, 'Gâu gâu! 🦴')], 'bark');
  }
  return res(true, `${g.name} vẫy đuôi rối rít`, [say(at, '❤️')], 'bark');
}

// ---------- Thao tác của khách trong vườn chủ (issue 28, ADR 0012) ----------
// Luật khách là hàm thuần: nhận bản lưu chủ `host`, thông tin khách `who` ({ name, level }) và thao tác `op`,
// trả kết quả hoặc lý do từ chối. Server kiểm tra bằng chính hàm này rồi xếp hàng; trình duyệt chủ áp dụng cũng
// bằng hàm này. Không có gì ngẫu nhiên nên hai nơi luôn ra cùng kết quả. Mã thao tác `op.id` nhớ trong `host.guests`
// nên áp dụng hai lần cùng mã thì lần sau không làm gì.
// Thao tác: { id, kind, act, idx (ô ruộng) | crow (id con quạ) | egg (id quả trứng) | animal (id con vật),
// at (giờ ngoài đời) }. `who` của việc trộm cần thêm `room` = chỗ trống trong giỏ khách.
// Đã có kind 'help' (issue 28) và 'steal' (issue 30); các issue sau thêm 'pet', 'sausage' vào KINDS.
export const HELP_FULL = `Bạn đã giúp vườn này đủ ${GUEST.helpMax} việc hôm nay, mai (sau 0h giờ Việt Nam) giúp tiếp nhé`;
export const HELP_HOST_FULL = `Vườn này hôm nay đã nhận đủ ${GUEST.helpHostMax} việc giúp từ mọi khách, mai (sau 0h giờ Việt Nam) quay lại nhé`;
const NOTHING = 'Ở đây không còn gì để làm';
const NOTHING_STEAL = 'Ở đây không có gì để trộm';
const SOUND_OF = { water: 'water', weed: 'pop', catch: 'pop', shoo: 'crow' };

// Mỗi việc giúp: tìm chỗ đang cần giúp trong bản lưu chủ (null = không còn gì để làm) rồi làm
const plotFit = (s, idx, id) => { const p = s.plots?.[idx]; return p?.unlocked && FIT[id](p) ? p : null; };
const HELP = {
  water: { find: (s, o) => plotFit(s, o.idx, 'water'), do: (s, p) => { p.water = 100; } },
  weed: { find: (s, o) => plotFit(s, o.idx, 'weed'), do: (s, p) => { p.weeds = false; } },
  // bắt sâu giúp thì chắc tay, không hên xui như chủ tự bắt (server và trình duyệt phải ra cùng kết quả)
  catch: { find: (s, o) => { const c = s.plots?.[o.idx]?.unlocked && s.plots[o.idx].crop; return c && c.bugs && !c.dead && !c.rotten ? s.plots[o.idx] : null; }, do: (s, p) => { p.crop.bugs = false; } },
  shoo: { find: (s, o) => (s.threats ?? []).find(t => t.id === o.crow && t.kind === 'crow' && t.state !== 'leaving') ?? null, do: (s, t) => { s.threats.splice(s.threats.indexOf(t), 1); } },
};

// ---------- Trộm (issue 30, DESIGN §7.1) ----------
// Trộm được: cây đã chín (act 'crop'), trứng dưới đất ('egg'), sữa và lông đang chờ lấy ('product').
// Không trộm được: con vật, trái khổng lồ, đồ trong kho và trong nhà, cá — mỗi thứ một lý do rõ ràng.
const NO_STEAL = {
  animal: 'Con vật thì không trộm được đâu',
  giant: 'Trái khổng lồ nặng quá, vác không nổi',
  store: 'Đồ trong kho và trong nhà khóa kỹ rồi',
  fish: 'Cá dưới ao thì không trộm được',
};
export const STEAL_SMALL = 'Vườn này còn quá nhỏ để trộm';
const STEAL_YOUNG = `Phải tới cấp ${GUEST.stealLv} mới đi trộm được`;
// Mỗi vụ lấy tối đa GUEST.stealPct phần còn lại của ô hay con đó, ít nhất 1 món (trứng, sữa, lông chỉ có 1)
const stealQty = left => Math.max(1, Math.floor(left * GUEST.stealPct));
// Trong bản đi dạo (startVisit) `exp` là của khách, nên cấp chủ vườn đọc ở visit.level
const hostLevel = h => (h?.visit ? h.visit.level || 1 : level(h));
const STEAL = {
  crop: {
    find: (s, o) => { const p = s.plots?.[o.idx]; return p?.unlocked && ripeCrop(p) ? p : null; },
    item: p => p.crop.id,
    left: p => harvestQty(p.crop),
    thieves: p => p.crop.robbed ?? [],
    do: (s, p, by, n) => { p.crop.stolen = (p.crop.stolen || 0) + n; p.crop.robbed = [...(p.crop.robbed ?? []), by]; },
  },
  egg: {
    find: (s, o) => (s.eggs ?? []).find(e => e.id === o.egg) ?? null,
    item: () => 'trung',
    left: () => 1,
    thieves: () => [],
    do: (s, e) => { s.eggs.splice(s.eggs.indexOf(e), 1); },
  },
  product: {
    find: (s, o) => (s.animals ?? []).find(a => a.id === o.animal && a.ready && ANIMALS[a.type]?.product) ?? null,
    item: a => ANIMALS[a.type].product,
    left: () => 1,
    thieves: () => [],
    do: (s, a) => { a.ready = false; a.nextProduct = s.time + ANIMALS[a.type].every; },
  },
};
// ---------- Chó canh khách: sủa, đớp, xúc xích (issue 31) ----------
// Ba thao tác này không có mục tiêu trong vườn (mục tiêu là chính con chó), nên `find` chỉ kiểm chó có canh được không.
// `sausage` có phần hên xui 30%: quay bằng hạt giống cố định = mã thao tác, nên server và trình duyệt chủ ra cùng kết quả.
const seedOf = id => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const guardDog = (s, t) => (s?.dog && guardRadius(s, t) > 0 ? s.dog : null);
const GUARD_OPS = {
  bark: {
    find: (s, o) => guardDog(s, o.at),
    do: (s, g, by, qty, o) => { g.barkAt = o.at ?? now(); g.barkX = o.x ?? s.dog.x; g.barkY = o.y ?? s.dog.y; s.stats.barks = (s.stats.barks || 0) + 1; },
  },
  bite: {
    find: (s, o) => guardDog(s, o.at),
    do: (s, g, by) => { s.stats.chased = (s.stats.chased || 0) + 1; addCoins(s, GUARD.fine); log(s, `${by} bị ${g.name} đớp, nộp phạt ${GUARD.fine} xu`); },
  },
  sausage: {
    // chó no dưới GUARD.sausageHunger thì chắc chắn ăn; chó đang no vẫn GUARD.sausageGreed tham ăn
    find: s => s?.dog ?? null,
    do: (s, g, by, qty, o) => { if (ateSausage(s, o)) g.quiet = (o.at ?? now()) + GUARD.quietMs; },
  },
};
// chó đã thuộc đủ 6 lệnh (issue 45) thì không bao giờ ăn đồ người lạ
const ateSausage = (s, o) => !trickProof(s) && (s.dog.hunger < GUARD.sausageHunger || seedOf(String(o.id)) < GUARD.sausageGreed);
const GUARD_MSG = {
  bark: dog => `${dog} sủa vang`,
  bite: dog => `${dog} đớp trúng! Rơi hết đồ và mất ${GUARD.fine} xu 😖`,
  sausage: (dog, ate) => (ate ? `${dog} vồ lấy xúc xích, mải ăn quên sủa 🌭` : `${dog} ngửi ngửi rồi lờ đi 🌭`),
};
const KINDS = { help: HELP, steal: STEAL, bark: GUARD_OPS, bite: GUARD_OPS, sausage: GUARD_OPS };

// Số việc giúp vườn này đã nhận hôm nay (ngày ngoài đời) và số lượt còn lại
// Giới hạn công bằng: mỗi KHÁCH được giúp một vườn tối đa GUEST.helpMax việc/ngày (today.helpBy[tên]), và cả vườn
// nhận tối đa GUEST.helpHostMax việc/ngày từ mọi khách (today.helps) để không bị lạm dụng.
export const helpsToday = (s, t = now()) => (s?.today?.day === serverDay(t) ? s.today.helps || 0 : 0);
export const helpsBy = (s, name, t = now()) => (s?.today?.day === serverDay(t) ? s.today.helpBy?.[name] || 0 : 0);
export const helpHostLeft = (s, t = now()) => Math.max(0, GUEST.helpHostMax - helpsToday(s, t));
export const helpLeftFor = (s, name, t = now()) => Math.min(Math.max(0, GUEST.helpMax - helpsBy(s, name, t)), helpHostLeft(s, t));
// Trong bản đi dạo: số lượt khách (chính mình) còn giúp được vườn này; ngoài đó: số lượt vườn còn nhận
export const helpLeft = (s, t = now()) => (s?.visit ? helpLeftFor(s, s.name, t) : helpHostLeft(s, t));
// Lý do từ chối giúp (null = còn lượt): hết phần của khách này, hay cả vườn đã đủ
export const helpBlock = (s, name, t = now()) => (helpsBy(s, name, t) >= GUEST.helpMax ? no('help_full', HELP_FULL)
  : helpHostLeft(s, t) <= 0 ? no('help_host_full', HELP_HOST_FULL) : null);
// Thống kê trộm hôm nay (ngày ngoài đời): của vườn = số vụ bị trộm (`steals`) và tổng giá trị đã mất (`stolen`);
// của người chơi = số vụ chính mình đi trộm (`robs`, server dùng để chặn bản lưu khai khống)
export const stealsToday = (s, t = now()) => (s?.today?.day === serverDay(t) ? s.today.steals || 0 : 0);
export const stolenToday = (s, t = now()) => (s?.today?.day === serverDay(t) ? s.today.stolen || 0 : 0);
export const robsToday = (s, t = now()) => (s?.today?.day === serverDay(t) ? s.today.robs || 0 : 0);
// Tổng giá trị đồ đang chín chờ lấy trong vườn (cây chín, trứng dưới đất, sữa và lông đang chờ)
export function ripeValue(s) {
  let v = 0;
  for (const p of s?.plots ?? []) if (p.unlocked && ripeCrop(p)) v += sellPrice(p.crop.id) * harvestQty(p.crop);
  v += (s?.eggs?.length ?? 0) * sellPrice('trung');
  for (const a of s?.animals ?? []) if (a.ready && ANIMALS[a.type]?.product) v += sellPrice(ANIMALS[a.type].product);
  return v;
}
// Giá trị vườn này còn chịu mất hôm nay: tối đa GUEST.dayPct tổng giá trị đồ chín (tính cả phần đã bị trộm)
export const stealLeft = (s, t = now()) => Math.max(0, Math.floor((ripeValue(s) + stolenToday(s, t)) * GUEST.dayPct) - stolenToday(s, t));

// Các thao tác khách làm được lên target `t` ngay lúc này (chưa có mã; không xét giới hạn mỗi ngày)
const stealOp = (s, t) => {
  const o = t?.kind === 'plot' ? { kind: 'steal', act: 'crop', idx: t.idx }
    : t?.kind === 'egg' ? { kind: 'steal', act: 'egg', egg: t.id }
    : t?.kind === 'animal' ? { kind: 'steal', act: 'product', animal: t.id } : null;
  return o && STEAL[o.act].find(s, o) ? o : null;
};
export function guestOps(s, t) {
  const steal = stealOp(s, t);
  if (t?.kind === 'plot') return [...['water', 'weed', 'catch'].filter(act => HELP[act].find(s, { idx: t.idx })).map(act => ({ kind: 'help', act, idx: t.idx })), ...(steal ? [steal] : [])];
  if (t?.kind === 'threat') return HELP.shoo.find(s, { crow: t.id }) ? [{ kind: 'help', act: 'shoo', crow: t.id }] : [];
  return steal ? [steal] : [];
}

// Kiểm tra thao tác, không đổi gì: { ok: true, target } (trộm thì thêm { item, qty }) hoặc { ok: false, reason, msg }.
// reason: 'op_invalid' (thao tác lạ) · 'done' (mã này đã áp dụng rồi) · 'help_full' (vườn đã nhận đủ 10 việc hôm nay)
// · 'nothing' (chỗ đó không còn gì để làm, vd chủ vừa tưới xong hay vừa hái xong)
// Riêng trộm: 'cant_steal' (thứ không trộm được) · 'host_new' / 'guest_new' (chưa tới cấp 5) · 'robbed' (người này
// trộm ở đây rồi) · 'full' (giỏ khách đầy) · 'day_full' (vườn đã mất 30% giá trị đồ chín hôm nay)
export function guestOpCheck(host, who, op) {
  if (!host || !op?.id) return no('op_invalid', 'Thao tác này chưa làm được');
  if ((host.guests ?? []).some(g => g.id === op.id)) return no('done', 'Việc này làm rồi');
  if (op.kind === 'steal' && NO_STEAL[op.act]) return no('cant_steal', NO_STEAL[op.act]);
  const job = KINDS[op.kind]?.[op.act];
  if (!job || (KINDS[op.kind] === GUARD_OPS && op.kind !== op.act)) return no('op_invalid', 'Thao tác này chưa làm được');
  const t = op.at ?? now();
  if (op.kind === 'steal') return stealCheck(host, who, op, job, t);
  if (KINDS[op.kind] === GUARD_OPS) return guardOpCheck(host, who, op, job, t);
  const blocked = helpBlock(host, String(who?.name ?? 'Người lạ'), t);
  if (blocked) return blocked;
  const target = job.find(host, op);
  return target ? { ok: true, target } : no('nothing', NOTHING);
}
// Sủa, đớp, ném xúc xích: chỉ cần vườn có chó đang canh (riêng xúc xích thì chó đói mấy cũng ăn được)
function guardOpCheck(host, who, op, job, t) {
  const target = job.find(host, op);
  if (!target) return no('no_guard', 'Vườn này không có chó canh');
  if (op.kind === 'sausage' && (who?.sausage ?? 0) < 1) return no('no_item', `Trong giỏ không có ${itemName('sausage').toLowerCase()}`);
  if (op.kind === 'bark' && t - (host.dog.barkAt || -Infinity) < GUARD.barkEvery) return no('barking', `${host.dog.name} đang sủa rồi`);
  return { ok: true, target };
}
function stealCheck(host, who, op, job, t) {
  if (hostLevel(host) < GUEST.stealLv) return no('host_new', STEAL_SMALL);
  if ((who?.level ?? 1) < GUEST.stealLv) return no('guest_new', STEAL_YOUNG);
  const target = job.find(host, op);
  if (!target) return no('nothing', NOTHING_STEAL);
  const by = String(who?.name ?? 'Người lạ');
  if (job.thieves(target).includes(by)) return no('robbed', 'Bạn trộm ở đây một lần rồi, để phần người khác');
  const item = job.item(target), qty = stealQty(job.left(target));
  if ((who?.room ?? 0) < qty) return no('full', FULL);
  if (sellPrice(item) * qty > stealLeft(host, t)) return no('day_full', 'Vườn này hôm nay bị trộm nhiều rồi, mai quay lại nhé');
  return { ok: true, target, item, qty };
}

// Áp dụng thao tác lên bản lưu chủ: { ok: true, msg, reward, event } hoặc lý do từ chối.
// `event` là tin cho chủ vườn (giúp: lời cảm ơn 🟡 gộp theo người và việc; trộm: báo gấp 🔴);
// `reward` là phần của khách (guestReward): { coins, exp } khi giúp, { items, steal } khi trộm.
export function guestOpApply(host, who, op) {
  const c = guestOpCheck(host, who, op);
  if (!c.ok) return c;
  const t = op.at ?? now(), day = serverDay(t), by = String(who?.name ?? 'Người lạ');
  KINDS[op.kind][op.act].do(host, c.target, by, c.qty, op);
  if (host.today?.day !== day) host.today = { day, helps: 0, helpBy: {}, steals: 0, stolen: 0, robs: 0 };
  const entry = { id: op.id, kind: op.kind, act: op.act, by, lv: who?.level ?? 1, at: t, seen: false };
  if (op.kind === 'steal') Object.assign(entry, { item: c.item, qty: c.qty });
  host.guests = [entry, ...(host.guests ?? [])].slice(0, GUEST.logMax);
  const dog = host.dog.name;
  if (op.kind === 'steal') {
    host.today.steals++;
    host.today.stolen += sellPrice(c.item) * c.qty;
    // chỗ vừa bị trộm: chỗ gấp 🔴 cho mũi tên chỉ hướng (urgentSpots, issue 32)
    const at = op.act === 'crop' ? plotCenter(host, op.idx) : { x: c.target.x ?? 0, y: c.target.y ?? 0 };
    host.robAt = { at: t, x: at.x, y: at.y, by, item: c.item, target: op.act === 'crop' ? { kind: 'plot', idx: op.idx } : op.act === 'product' ? { kind: 'animal', id: op.animal } : { kind: 'dog' } };
    return { ok: true, msg: `Trộm được ${c.qty} ${itemName(c.item).toLowerCase()} 😈`, reward: { items: { [c.item]: c.qty }, steal: 1 }, event: { type: 'stolen', by, item: c.item, qty: c.qty, at: t } };
  }
  // chó canh khách (issue 31): sủa báo động, đớp được khách (khách rơi đồ + nộp phạt), khách ném xúc xích
  if (op.kind === 'bark') return { ok: true, msg: GUARD_MSG.bark(dog), event: { type: 'barked', by, dog, where: barkWhere(host, c.target.barkX, c.target.barkY), x: c.target.barkX, y: c.target.barkY, at: t } };
  if (op.kind === 'bite') {
    entry.fine = GUARD.fine;
    return { ok: true, msg: GUARD_MSG.bite(dog), reward: { lose: { ...(op.loot ?? {}) }, fine: GUARD.fine, bite: 1 }, event: { type: 'bitten', by, dog, fine: GUARD.fine, at: t } };
  }
  if (op.kind === 'sausage') {
    const ate = ateSausage(host, op);
    entry.ate = ate;
    return { ok: true, ate, msg: GUARD_MSG.sausage(dog, ate), reward: { lose: { sausage: 1 } }, event: { type: 'sausaged', by, dog, ate, at: t } };
  }
  host.today.helps++;
  (host.today.helpBy ??= {})[by] = (host.today.helpBy[by] || 0) + 1;
  return { ok: true, msg: `Đã ${HELP_JOBS[op.act].verb} giúp`, reward: { coins: GUEST.helpCoins, exp: GUEST.helpExp, help: 1 }, event: { type: 'helped', by, act: op.act, at: t } };
}

// Thưởng của khách (server xác nhận thao tác xong mới cộng) vào bản lưu khách
export function guestReward(me, reward) {
  if (!me || !reward) return;
  addCoins(me, reward.coins || 0);
  addExp(me, reward.exp || 0);
  for (const [k, n] of Object.entries(reward.items ?? {})) give(me, k, n);
  // bị chó đớp (issue 31): rơi hết đồ vừa trộm, nộp phạt (không âm xu) và chuỗi "trộm không bị đớp" về 0
  for (const [k, n] of Object.entries(reward.lose ?? {})) takeItem(me, k, Math.min(n, haveItem(me, k)));
  if (reward.fine) me.coins = Math.max(0, me.coins - reward.fine);
  if (reward.bite) me.stats.robStreak = 0;
  if (reward.steal) {   // số vụ chính mình đi trộm hôm nay (server dùng để chặn bản lưu khai khống)
    const day = serverDay(now());
    if (me.today?.day !== day) me.today = { day, helps: 0, steals: 0, stolen: 0, robs: 0 };
    me.today.robs = (me.today.robs || 0) + reward.steal;
    me.stats.robStreak = (me.stats.robStreak || 0) + reward.steal;   // chuỗi cho thành tựu "Siêu trộm" (issue 32)
  }
  if (reward.help) me.stats.helps = (me.stats.helps || 0) + reward.help;   // thành tựu "Hàng xóm tốt bụng" (issue 32)
  checkAch(me);
}

// Việc khách làm mà chủ chưa biết (server áp dụng lúc chủ offline, hoặc vừa nhận qua WebSocket):
// trả các event theo thứ tự cũ → mới rồi đánh dấu đã xem, nên chỉ báo một lần.
export function takeGuestLog(s) {
  const fresh = (s?.guests ?? []).filter(g => !g.seen);
  for (const g of fresh) g.seen = true;
  const dog = s?.dog?.name ?? DOG.name;
  return fresh.reverse().map(g => (g.kind === 'steal' ? { type: 'stolen', by: g.by, item: g.item, qty: g.qty, at: g.at }
    : g.kind === 'bite' ? { type: 'bitten', by: g.by, dog, fine: g.fine ?? GUARD.fine, at: g.at }
    : g.kind === 'sausage' ? { type: 'sausaged', by: g.by, dog, ate: !!g.ate, at: g.at }
    : g.kind === 'bark' ? { type: 'barked', by: g.by, dog, where: barkWhere(s, s.dog.barkX, s.dog.barkY), x: s.dog.barkX, y: s.dog.barkY, at: g.at }
    : { type: 'helped', by: g.by, act: g.act, at: g.at }));
}

// Màn "Trong lúc bạn vắng nhà…" phần khách (issue 32): gom việc khách làm mà chủ chưa biết (nhật ký khách chưa xem,
// gọi trước takeGuestLog) và tin ở cổng `gate` ({ gifts: số quà đang chờ, notes: số lời nhắn chưa đọc }, từ server)
// thành các mục [{ kind: 'help'|'steal'|'gift'|'note'|'chase', icon, text }]. Không có gì thì không có mục đó.
export function awayGuests(s, gate = {}) {
  const fresh = [...(s?.guests ?? [])].filter(g => !g.seen).reverse();   // cũ → mới
  const out = [], per = kind => {
    const m = new Map();
    for (const g of fresh) if (g.kind === kind) m.set(g.by, [...(m.get(g.by) ?? []), g]);
    return [...m];
  };
  const tally = (list, key, val = () => 1) => {
    const m = new Map();
    for (const g of list) m.set(key(g), (m.get(key(g)) || 0) + val(g));
    return [...m];
  };
  for (const [by, list] of per('help')) {
    const jobs = tally(list, g => g.act).map(([act, n]) => `${HELP_JOBS[act]?.verb ?? 'làm'} ${n} ${HELP_JOBS[act]?.unit ?? 'việc'}`);
    out.push({ kind: 'help', icon: '🤝', text: `${by} đã giúp ${list.length} việc (${jobs.join(', ')})` });
  }
  for (const [by, list] of per('steal')) {
    const items = tally(list, g => g.item, g => g.qty || 0).map(([k, n]) => `${n} ${itemName(k).toLowerCase()}`).join(', ');
    out.push({ kind: 'steal', icon: '😈', text: `${by} đã trộm ${items}` + (list.length > 1 ? ` (${list.length} lần)` : '') });
  }
  if (gate.gifts > 0) out.push({ kind: 'gift', icon: '🎁', text: `${gate.gifts} phần quà mới trong hộp quà ở cổng` });
  if (gate.notes > 0) out.push({ kind: 'note', icon: '📖', text: `${gate.notes} lời nhắn mới trong sổ lưu bút` });
  const bit = fresh.filter(g => g.kind === 'bite').length;
  if (bit) out.push({ kind: 'chase', icon: '🐕', text: `${s.dog?.name ?? DOG.name} đã đuổi được ${bit} người` });
  return out;
}

// Khách làm một việc giúp hay một vụ trộm: áp dụng ngay trên bản đi dạo (chỉ để thấy liền) và trả kèm `guestOp`
// để main.js gửi lên server. Thưởng và đồ trộm được chỉ cộng khi server xác nhận (main.js gọi guestReward).
const opId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
const meAsGuest = s => ({ name: s.name, level: level(s), room: room(s), sausage: haveItem(s, 'sausage') });
// nhớ việc vừa làm trên bản đi dạo cho tới khi tin của chủ có nó (visitSync)
const mine = (s, op) => { if (s.visit) (s.visit.mine ??= []).push(op); };
function helpDo(s, t, act, at) {
  const op = { id: opId(), kind: 'help', act, ...(t.kind === 'threat' ? { crow: t.id } : { idx: t.idx }), at: now() };
  const r = guestOpApply(s, meAsGuest(s), op);
  if (!r.ok) return bad(r.msg, at);
  mine(s, op);
  return res(true, r.msg, [say(at, HELP_JOBS[act].icon)], SOUND_OF[act], { guestOp: op });
}
// Nhãn nút Trộm: lấy được mấy món và ô (hay con) còn lại bao nhiêu
function stealLabel(s, o) {
  const job = STEAL[o.act], target = job.find(s, o), left = job.left(target), qty = stealQty(left);
  return `Trộm ${qty} ${itemName(job.item(target)).toLowerCase()} (còn ${left - qty})`;
}
function stealDo(s, t, at) {
  const o = stealOp(s, t);
  if (!o) return bad(NOTHING_STEAL, at);
  const op = { ...o, id: opId(), at: now() };
  const r = guestOpApply(s, meAsGuest(s), op);
  if (!r.ok) return bad(r.msg, at);
  mine(s, op);
  spend(s, STAMINA.cost.steal);
  return res(true, r.msg, [say(at, '😈')], 'pop', { guestOp: op });
}

// ---------- Khách đối phó với chó canh (issue 31) ----------
// Ba thao tác chạy trên trình duyệt của khách: ném xúc xích (khách bấm), chó sủa và chó đớp (world.js phát hiện).
// Cả ba áp dụng ngay trên bản đi dạo để khách thấy liền rồi trả `guestOp` cho main.js gửi lên server.
// Đồ khách đã trộm được trong lượt thăm này (chỉ ghi khi server đã xác nhận, nên không bao giờ rơi đồ chưa có).
// Bị chó đớp là rơi hết chỗ này.
export function keepLoot(v, items) {
  if (!v?.visit || !items) return;
  const loot = (v.visit.loot ??= {});
  for (const [k, n] of Object.entries(items)) loot[k] = (loot[k] || 0) + n;
}
// Chỉ KIỂM bằng luật rồi xem trước ngay trên con chó của bản đi dạo. Không áp dụng cả thao tác ở đây: trong bản
// đi dạo thì `coins`, `stats`, `log` là của khách chứ không phải của chủ, nên phần ghi sổ của chủ (xu phạt,
// số người đã đuổi, dòng nhật ký) để server và trình duyệt chủ làm bằng guestOpApply.
function guestGuardOp(s, kind, extra) {
  const op = { id: opId(), kind, act: kind, at: now(), ...extra };
  if (!guestOpCheck(s, meAsGuest(s), op).ok) return null;
  const g = s.dog, dog = g.name;
  if (kind === 'bark') { g.barkAt = op.at; g.barkX = op.x; g.barkY = op.y; }
  const ate = kind === 'sausage' && ateSausage(s, op);
  if (ate) g.quiet = op.at + GUARD.quietMs;
  return { ok: true, ate, msg: GUARD_MSG[kind](dog, ate), guestOp: op };
}
function sausageDo(s, at) {
  const r = guestGuardOp(s, 'sausage');
  if (!r) return bad(`Không ném được xúc xích cho ${s.dog.name}`, at);
  // khúc xúc xích chỉ mất khi server xác nhận (guestReward), như mọi thao tác khách khác
  return res(true, r.msg, [say(at, '🌭')], 'pop', { guestOp: r.guestOp, ate: r.ate });
}
// Chó vừa phát hiện khách: báo cho chủ kèm chỗ thấy. Đang trong thời gian nghỉ giữa hai lần sủa thì trả null.
export function barkOp(s) {
  if (s?.scene !== 'visit') return null;
  return guestGuardOp(s, 'bark', { x: Math.round(s.player.x), y: Math.round(s.player.y) });
}
// Chó đuổi kịp và đớp được khách: rơi hết đồ vừa trộm, nộp phạt, đứng hình GUARD.biteStunMs
export function biteOp(s) {
  if (s?.scene !== 'visit' || s.visit.bitten) return null;
  const r = guestGuardOp(s, 'bite', { loot: { ...(s.visit.loot ?? {}) } });
  if (!r) return null;
  s.visit.bitten = true; s.visit.loot = {};
  return { ...r, stunMs: GUARD.biteStunMs };
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
export function buyAnimal(s, type, sex = 'm', coat) {
  if (type === 'meo') return buyCat(s, sex, coat);   // mèo không ở chuồng có rào: luật riêng ở buyCat
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
  const tip = breedAdvice(s, type);
  return R(true, `Đã mua ${def.baby.toLowerCase()} ${sex === 'm' ? 'đực' : 'cái'}${tip ? `. ${tip}` : ''}`, { price });
}

// ---------- Mua online: đặt hàng chợ Bà Tư và trạm thú y Cô Út, người giao hàng mang tới kho ----------
// s.deliveries = [{ id, items: { món: số }, cost, fee, at, due }] (giờ vườn s.time). Trả tiền lúc đặt; tới due mà chợ đang mở
// thì người giao hàng (s.courier) đi từ cổng tới nhà kho, tới nơi thì hàng vào kho (s.inv). Luật chạy trong step nên trình duyệt
// và server chạy bù cho cùng kết quả. Vật nuôi, quần áo vẫn phải ra làng mua.
export const canOrder = id => { const it = ITEMS[id]; return !!it && it.price > 0 && ['seed', 'supply', 'feed', 'deco'].includes(it.kind); };
// Kiểu giao: thiếu hoặc lạ (client cũ) thì như 'm2' (2 phút, rẻ nhất)
export const deliveryMode = id => DELIVERY.modes.find(m => m.id === id) ?? DELIVERY.modes.find(m => m.id === 'm2');
export const deliveryFee = (cost, mode) => (cost > 0 ? Math.max(DELIVERY.feeMin, Math.ceil(cost * deliveryMode(mode).fee)) : 0);
// Tính tiền giỏ hàng: { ok, msg?, items, cost, fee, total }. Hàm thuần, bảng đặt hàng dùng để hiện tổng.
export function orderQuote(s, cart, mode) {
  const items = {};
  for (const [id, q] of Object.entries(cart ?? {})) {
    const n = Math.floor(q);
    if (!(n > 0)) continue;
    if (!canOrder(id)) return R(false, 'Món này không đặt online được', { items: {}, cost: 0, fee: 0, total: 0 });
    if (level(s) < ITEMS[id].lv) return R(false, `Cần cấp ${ITEMS[id].lv} mới mua được ${ITEMS[id].name.toLowerCase()}`, { items: {}, cost: 0, fee: 0, total: 0 });
    items[id] = Math.min(DELIVERY.maxQty, n);
  }
  const cost = Object.entries(items).reduce((a, [id, n]) => a + ITEMS[id].price * n, 0), fee = deliveryFee(cost, mode);
  if (!cost) return R(false, 'Giỏ hàng đang trống', { items, cost, fee, total: 0 });
  return R(true, undefined, { items, cost, fee, total: cost + fee });
}
export function orderOnline(s, cart, mode) {
  if (s.visit) return R(false, 'Về vườn nhà rồi hẵng đặt hàng nhé', { reason: 'visit' });
  const dm = deliveryMode(mode), q = orderQuote(s, cart, dm.id);
  if (!q.ok) return q;
  const now = dm.ms <= 0;
  if (!now && (s.deliveries ??= []).length >= DELIVERY.maxPending) return R(false, `Đang chờ giao ${DELIVERY.maxPending} đơn rồi, đợi hàng tới đã nhé`, { reason: 'pending' });
  if (s.coins < q.total) return R(false, 'Chưa đủ xu, cố lên nhé', { reason: 'coins' });
  s.coins -= q.total;
  if (Object.keys(q.items).some(id => ITEMS[id].kind === 'seed')) { s.stats.bought++; advanceTutorial(s); }
  if (now) {   // giao ngay: hàng vào kho tức thì, không có đơn chờ
    for (const [id, n] of Object.entries(q.items)) s.inv[id] = (s.inv[id] || 0) + n;
    emit({ type: 'delivered', orders: 1, items: q.items });
    log(s, `Giao ngay tới kho: ${Object.entries(q.items).map(([id, n]) => `${n} ${itemName(id).toLowerCase()}`).join(', ')}`);
    snd('pop');
    return R(true, `Hàng đã giao tới kho (${q.total} xu)`, { order: null });
  }
  // by = hạn hàng phải vào kho (tổng thời gian đã chọn, gồm đi bộ); due = lúc người giao hàng phải lên đường để kịp
  const o = { id: s.nextId++, items: q.items, cost: q.cost, fee: q.fee, at: s.time, due: s.time + Math.max(0, dm.ms - courierPath(s).ms), by: s.time + dm.ms };
  s.deliveries.push(o);
  return R(true, `Đã đặt hàng (${q.total} xu), hàng sẽ tới kho sau ${Math.round(dm.ms / 60000)} phút`, { order: o });
}
// Thời gian đi từ cổng tới nhà kho (giờ vườn): quãng thẳng / tốc độ đi × hệ số đường vòng
function courierPath(s) {
  const m = mapOf(s), from = m.gateIn ?? m.spawn, shed = m.buildings.find(b => b.kind === 'shed'), to = shed?.at ?? m.spawn;
  return { from, to, ms: Math.round(Math.max(DELIVERY.walkMin, Math.hypot(to.x - from.x, to.y - from.y) / DELIVERY.speed * 1000 * DELIVERY.walkMul)) };
}
// Còn bao lâu (giờ vườn) đơn o tới kho: đang trên đường thì theo người giao hàng; chưa đi thì đợi đủ waitMs, rơi vào lúc chợ
// đóng thì đợi tới 6h sáng (đầu ngày), cộng thêm quãng đi bộ
export function deliveryEta(s, o) {
  const c = s.courier;
  if (c?.state === 'coming' && c.ids.includes(o.id)) return Math.max(0, c.arriveAt - s.time);
  let w = Math.max(0, o.due - s.time);
  const f = (dayFrac(s) + w / DAY_MS) % 1, closeAt = (MARKET.close - MARKET.open) / 24;
  if (f >= closeAt) w += Math.round((1 - f) * DAY_MS);
  const e = w + courierPath(s).ms;
  return o.by != null && marketOpen(s) ? Math.min(e, Math.max(0, o.by - s.time)) : e;   // quá hạn by thì hàng vào kho dù người giao còn đi
}
// Đơn đang chờ giao, kèm thời gian dự kiến và cờ đang trên đường
export const pendingDeliveries = s => (s.deliveries ?? []).map(o => ({
  ...o, total: o.cost + o.fee, eta: deliveryEta(s, o), onWay: s.courier?.state === 'coming' && s.courier.ids.includes(o.id),
}));
// Mỗi bước: người giao hàng tới nơi thì giao, đi ra hết thì biến mất; rảnh mà có đơn tới hạn lúc chợ mở thì lên đường
function stepDeliveries(s) {
  if (s.visit) return;   // đang ở vườn bạn: đơn của mình chờ về nhà
  // đơn tới hạn by (lúc chợ mở) thì hàng vào kho đúng hạn, dù người giao hàng còn đang đi
  if (marketOpen(s) && (s.deliveries ?? []).some(o => o.by != null && s.time >= o.by)) {
    const late = s.deliveries.filter(o => o.by != null && s.time >= o.by);
    s.deliveries = s.deliveries.filter(o => !late.includes(o));
    creditParcel(s, late);
    const k = s.courier;
    if (k?.state === 'coming') { k.ids = k.ids.filter(id => !late.some(o => o.id === id)); if (!k.ids.length) { k.state = 'leaving'; k.since = s.time; } }
  }
  const c = s.courier;
  if (c) {
    if (c.state === 'coming' && s.time >= c.arriveAt) dropParcel(s, c);
    else if (c.state === 'leaving' && s.time - c.since >= DELIVERY.leaveMs) s.courier = null;
    return;
  }
  const due = (s.deliveries ?? []).filter(o => s.time >= o.due);
  if (!due.length || !marketOpen(s)) return;
  const p = courierPath(s);
  s.courier = { id: s.nextId++, ids: due.map(o => o.id), state: 'coming', from: p.from, at: p.to, since: s.time, arriveAt: s.time + p.ms };
}
function dropParcel(s, c) {
  const mine = s.deliveries.filter(o => c.ids.includes(o.id));
  s.deliveries = s.deliveries.filter(o => !c.ids.includes(o.id));
  if (mine.length) { creditParcel(s, mine); fxEv(c.at.x, c.at.y - 20, 'Hàng tới rồi 📦', COL.good); }
  c.state = 'leaving'; c.since = s.time;
}
// Hàng của các đơn vào kho + event/nhật ký
function creditParcel(s, orders) {
  const got = {};
  for (const o of orders) for (const [id, n] of Object.entries(o.items)) got[id] = (got[id] || 0) + n;
  for (const [id, n] of Object.entries(got)) s.inv[id] = (s.inv[id] || 0) + n;
  const what = Object.entries(got).map(([id, n]) => `${n} ${itemName(id).toLowerCase()}`).join(', ');
  emit({ type: 'delivered', orders: orders.length, items: got });
  log(s, `Người giao hàng đã giao tới kho: ${what}`);
  snd('pop');
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

// Vườn chưa có hộp quà / sổ lưu bút (issue 29): đặt ở ô hợp lệ gần cổng nhất (qua canPlace nên không chặn đường)
function ensureGateBoxes(s) {
  const f = s.farm, g = f.ents.find(e => e.kind === 'gate');
  if (!g) return;
  for (const [i, kind] of GATE_BOXES.entries()) {
    if (f.ents.some(e => e.kind === kind)) continue;
    const cand = [];
    for (let r = f.owned.r; r < f.owned.r + f.owned.h; r++) for (let c = f.owned.c; c < f.owned.c + f.owned.w; c++) cand.push({ c, r, d: Math.hypot(c - g.c - 3 - i, r - g.r) });
    for (const p of cand.sort((a, b) => a.d - b.d || a.r - b.r || a.c - b.c)) {
      if (!canPlace(s, { kind }, p.c, p.r).ok) continue;
      f.ents.push({ id: s.nextId++, kind, c: p.c, r: p.r });
      bumpLayout(s);
      break;
    }
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
  for (const b of m.buildings) if (b.at && b.id !== 'gate' && b.id !== 'doghouse') add(b.id === 'house' ? 'house' : `b${b.ent.id}${b.id}`, b.name, b.at);
  for (const p of m.penList) add(`p${p.ent.id}`, p.name, mid(...p.gates[0]));
  for (const e of m.fields) add(`f${e.id}`, 'Khối ruộng', mid(e.c + 1, e.r + 1));
  return out;
}

export function canPlace(s, what, c, r) {
  const f = s.farm, old = what.id != null ? f.ents.find(e => e.id === what.id) : null;
  if (what.id != null && !old) return no('missing', 'Không thấy công trình này');
  if (old && !canMove(old)) return no('fixed', `${entName(old)} không dời được`);
  // nhà mèo (và công trình đặt được khác ngoài chuồng có rào): cấp tối thiểu rồi số cái tối đa, cùng bảng PEN_TABLE
  if (!old && BUILD_PRICES[what.kind]) {
    const t = PEN_TABLE[what.kind], nm = BUILDING_DEFS[what.kind].name.toLowerCase();
    if (level(s) < t.lv) return no('level', `Cần cấp ${t.lv} mới xây ${nm} được`);
    if (f.ents.filter(e => e.kind === what.kind).length >= penLimit(s, what.kind)) {
      const nx = penNextLevel(s, what.kind);
      return no('max_pens', nx ? `Đã đủ ${penLimit(s, what.kind)} ${nm}, lên cấp ${nx} để xây thêm` : `Đã đủ số ${nm} tối đa`);
    }
  }
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
  for (const e of f.ents) if (GATE_BOXES.includes(e.kind) && e.r === g.r) e.r += dy;   // hộp quà, sổ lưu bút đi theo cổng
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
  // chừa luôn chỗ đứng trước công trình (hộp quà, sổ lưu bút ở cổng nằm ngay trên dải mới): bụi đá không được chắn lối vào
  for (const e of f.ents) { const a = BUILDING_DEFS[e.kind]?.at; if (a) taken.add((e.c + Math.floor(a.x / TS)) + ',' + (e.r + Math.floor(a.y / TS))); }
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
  return BUILD_PRICES[what.kind] ?? 0;
}
export function canAfford(s, what) {
  if (what.kind === 'deco') return have(s, what.item) > 0 ? { ok: true } : no('no_item', 'Bạn chưa có món này');
  if (what.kind === 'pen') {
    if (!PEN_DEFS[what.pen]) return no('missing', 'Không có loại chuồng này');
    if (level(s) < penLevel(what.pen)) return no('level', `Cần cấp ${penLevel(what.pen)} mới xây ${PEN_DEFS[what.pen].name.toLowerCase()} được`);
  } else if (BUILD_PRICES[what.kind]) {
    const t = PEN_TABLE[what.kind];
    if (level(s) < t.lv) return no('level', `Cần cấp ${t.lv} mới xây ${BUILDING_DEFS[what.kind].name.toLowerCase()} được`);
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
  if (what.kind === 'pen') { e.pen = what.pen; (s.troughs ??= {})[e.id] = 0; }
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
