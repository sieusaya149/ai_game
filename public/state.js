// Mô hình dữ liệu + luật chơi. Thuần JS, không DOM (localStorage có bọc try/catch).
import {
  DAY_MS, NIGHT_FROM, MAX_CATCHUP_MS, GRID, START_PLOTS, CROPS, CROP_STAGES, OVERRIPE, FARMING,
  ANIMALS, PEN_CAP, HUSBANDRY, DOG, THREATS, ITEMS, PRODUCTS, LOOK, HATS, ACCS, DEFAULT_LOOK, START,
  expandCost, expandLevel, levelInfo, ORDERS, ACHIEVEMENTS, itemName, sellPrice,
} from './data.js';
import { TS, PEN_DEFS } from './layout.js';
import { mapOf, reachable, bumpLayout } from './farm.js';
import { migrate, newFarm } from './migrate.js';

export { levelInfo, mapOf, reachable };
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
const have = (s, k) => s.inv[k] || 0;
const give = (s, k, n = 1) => { s.inv[k] = have(s, k) + n; };
const take = (s, k, n = 1) => { s.inv[k] = have(s, k) - n; if (s.inv[k] <= 0) delete s.inv[k]; };
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
    toast(`Lên cấp ${l}! Thưởng ${l * 20} xu 🎉`);
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
    time: 0, speed: 1, day: 1, weather: 'sun', savedAt: Date.now(),
    farm: nf.farm,
    player: { x: 0, y: 0, dir: 0 }, can: FARMING.canMax, selectedSeed: 'cai',
    inv: { ...START.items },
    plots: Array.from({ length: nf.plotCount }, (_, i) => newPlot(i, true)),
    animals: [], troughs: { chicken: 0, pig: 0, pasture: 0 }, eggs: [], nest: { egg: false, hatchAt: 0 },
    dog: { adult: START.dogAdult, age: START.dogAdult ? DOG.growMs : 0, hunger: 100, happy: 60, x: 0, y: 0, nextPoop: 0, name: DOG.name },
    poops: [], threats: [], orders: [], nextOrderAt: 0,
    stats: { harvests: 0, bugs: 0, eggs: 0, poops: 0, slips: 0, piglets: 0, hatches: 0, orders: 0, thieves: 0, crows: 0, earned: 0, planted: 0 },
    achievements: {}, log: [], tutorial: 0, nextId: nf.nextId,
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
  try { s.savedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* không có localStorage */ }
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
  for (const k of ['owned', 'achievements', 'inv', 'nest', 'dog', 'player']) s[k] = { ...base[k], ...s[k] };
  for (const k of ['animals', 'eggs', 'poops', 'threats', 'orders', 'log']) s[k] ||= [];
  evq = [];
  const elapsed = clamp(Date.now() - (s.savedAt || Date.now()), 0, MAX_CATCHUP_MS);
  if (elapsed > 3000) {
    s.threats = [];
    catchUp = true;
    try { tick(s, elapsed); } finally { catchUp = false; }
    s.threats = [];
    evq = [];
    log(s, `Chào mừng trở lại! Nông trại đã chạy thêm ${Math.round(elapsed / MIN)} phút.`);
    evq = [];
  }
  s.savedAt = Date.now();
  return s;
}

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

// ---------- Tick ----------
export function tick(s, dtGame) {
  let left = Math.max(0, dtGame);
  while (left > 0) { const d = Math.min(1000, left); left -= d; step(s, d); }
  const out = evq; evq = [];
  return out;
}

function step(s, d) {
  s.time += d;
  const day = Math.floor(s.time / DAY_MS) + 1;
  if (day !== s.day) {
    s.day = day;
    const r = Math.random();
    s.weather = r < 0.45 ? 'sun' : r < 0.75 ? 'cloud' : 'rain';
    toast({ sun: 'Trời nắng đẹp ☀️', cloud: 'Trời nhiều mây ⛅', rain: 'Trời mưa rồi, ruộng tự có nước 🌧️' }[s.weather]);
  }
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
    if (c.progress >= OVERRIPE) { c.rotten = true; fxEv(at.x, at.y, 'Héo mất rồi 🥀', COL.bad); log(s, `${def.name} chín quá nên héo mất`); }
    return;
  }
  if (c.sick) {
    if (s.time - c.sickSince >= FARMING.sickToDead) { c.dead = true; fxEv(at.x, at.y, 'Cây chết rồi 💀', COL.bad); log(s, `${def.name} bị bệnh nặng và chết mất`); }
    return;
  }
  if (c.bugs) {
    if (s.time - c.bugSince >= FARMING.bugToSick) { c.bugs = false; c.sick = true; c.sickSince = s.time; fxEv(at.x, at.y, 'Cây bệnh rồi 🤒', COL.bad); log(s, `${def.name} bị bệnh vì sâu`); }
    return;
  }
  if (p.water > 0) c.progress += (d / def.grow) * (p.weeds ? FARMING.weedSlow : 1) * (c.fert ? FARMING.fertSpeed : 1);
  if (c.progress >= 1) { c.ripeAt = s.time; fxEv(at.x, at.y, 'Chín rồi! 🌾', COL.good); snd('pop'); }
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
    if (a.hunger <= 0) { if (!a.starvingSince) a.starvingSince = s.time; } else a.starvingSince = 0;
    if (!a.sick && ((a.starvingSince && s.time - a.starvingSince >= HUSBANDRY.sickAfterStarving) || chance(HUSBANDRY.sickChancePerMin, d))) {
      a.sick = true; fxEv(a.x, a.y, `${def.name} bị bệnh 🤒`, COL.bad); log(s, `${def.name} bị bệnh, cho uống thuốc thú y nhé`);
    }
    if (a.sick) continue;
    if (!a.adult) {
      if (a.hunger > HUSBANDRY.growNeedsHunger) a.age += d;
      if (a.age >= def.grow) { a.adult = true; a.age = def.grow; a.nextProduct = s.time + def.every; log(s, `${def.baby} đã lớn thành ${def.name.toLowerCase()}`); fxEv(a.x, a.y, 'Lớn rồi! ✨', COL.good); }
      continue;
    }
    if (a.hunger <= HUSBANDRY.growNeedsHunger || a.type === 'heo' || s.time < a.nextProduct) continue;
    if (a.type === 'ga') {
      if (s.eggs.length < 30) { const e = { id: s.nextId++, x: a.x, y: a.y, laidAt: s.time }; s.eggs.push(e); spawnEv('egg', e.x, e.y); }
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
    spawnEv('thief', gateIn.x, gateIn.y); toast('Có tiếng động ngoài ruộng... 👀');
  }
  for (const t of s.threats) {
    const p = s.plots[t.plot], crow = t.kind === 'crow', who = crow ? 'Quạ' : 'Thằng Tèo';
    if (t.state === 'coming') {
      if (!p.crop) { t.state = 'leaving'; t.since = s.time; } // cây đã biến mất
      else if (s.time >= t.arriveAt) {
        t.state = 'eating'; t.since = s.time;
        if (guardOn(s) && Math.random() < DOG.guardChance) {
          t.state = 'leaving'; t.since = s.time; s.stats[crow ? 'crows' : 'thieves']++;
          toast(`${s.dog.name} sủa vang, đuổi ${who.toLowerCase()} đi rồi! 🐕`); snd('bark');
        }
      }
    } else if (t.state === 'eating') {
      if (!p.crop) { t.state = 'leaving'; t.since = s.time; }
      else if (s.time - t.since >= (crow ? THREATS.crowEatMs : THREATS.thiefStealMs)) {
        const nm = CROPS[p.crop.id].name;
        p.crop = null; t.state = 'leaving'; t.since = s.time; t.loot = !crow;
        const c = plotCenter(s, p.idx);
        fxEv(c.x, c.y, crow ? 'Quạ ăn mất cây! 😢' : 'Bị hái trộm! 😢', COL.bad);
        log(s, crow ? `Quạ đã ăn mất ${nm}` : `Thằng Tèo hái trộm mất ${nm}`);
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
  toast('Hàng xóm có đơn hàng mới 📋');
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
export const nextLockedPlot = s => UNLOCK_ORDER.find(i => s.plots[i] && !s.plots[i].unlocked) ?? -1;
const unlockedCount = s => s.plots.filter(p => p.unlocked).length;
export const stageOf = c => CROP_STAGES.reduce((st, th, i) => (c.progress >= th ? i : st), 0);

// ---------- actionsFor ----------
const mk = (id, icon, text, disabled) => ({ id, icon, label: `${icon} ${text}`, ...(disabled ? { disabled } : {}) });
const mmss = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const FEED_OF_PEN = { chicken: 'feed_ga', pig: 'feed_heo', pasture: 'hay' };
const noItem = k => `Hết ${itemName(k).toLowerCase()}, mua ở sạp nhé`;

export function actionsFor(s, t) {
  if (!t) return [];
  const f = { plot: plotActs, lockedPlot: lockedActs, animal: animalActs, egg: () => [mk('collect', '🥚', 'Nhặt trứng')],
    poop: () => [mk('scoop', '💩', 'Xúc phân')], trough: troughActs, nest: nestActs, dog: dogActs, threat: threatActs, building: buildingActs }[t.kind];
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
      A.push(mk('plant', '🌱', `Gieo ${def.name} (còn ${n})`, level(s) < def.lv ? `Cần cấp ${def.lv}` : n <= 0 ? 'Hết hạt, mua ở sạp nhé' : null));
    }
    if (p.weeds) A.push(mk('weed', '🌿', 'Nhổ cỏ'));
    return A;
  }
  if (c.dead || c.rotten) return [mk('clear', '🧹', c.dead ? 'Dọn cây chết' : 'Dọn cây héo')];
  if (c.progress >= 1) return [mk('harvest', '🧺', `Thu hoạch ${CROPS[c.id].name} (${harvestQty(c)})`)];
  const noPest = have(s, 'pesticide') <= 0 ? noItem('pesticide') : null;
  if (c.sick) A.push(mk('spray', '🧴', 'Phun thuốc chữa bệnh', noPest));
  if (c.bugs) A.push(mk('spray', '🧴', 'Phun thuốc trừ sâu', noPest), mk('catch', '🤏', 'Bắt sâu bằng tay'));
  const water = mk('water', '💧', `Tưới nước (bình ${s.can}/${FARMING.canMax})`, s.can <= 0 ? 'Bình hết nước, ra giếng múc nhé' : p.water >= 95 ? 'Đất đang đủ nước rồi' : null);
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
  if (a.ready) A.collect = a.type === 'bo' ? mk('milk', '🥛', 'Vắt sữa') : mk('shear', '✂️', 'Xén lông');
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

function buildingActs(s, t) {
  const b = mapOf(s).building(t.id);
  if (!b) return [];
  const open = { shop: ['🛒', 'Vào sạp hàng'], shed: ['📦', 'Vào nhà kho'], house: ['🏠', 'Vào nhà'], board: ['📋', 'Xem đơn hàng'], gate: ['🚪', 'Ra cổng'] }[b.id];
  if (open) return [mk('open', open[0], open[1])];
  if (b.id === 'well') return [mk('refill', '🪣', `Múc nước (bình ${s.can}/${FARMING.canMax})`, s.can >= FARMING.canMax ? 'Bình đầy rồi' : null)];
  return [];
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
  if (t.kind === 'building') return m.building(t.id)?.at ?? s.player;
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
  const r = DO[t.kind](s, t, id, at);
  checkAch(s);
  return r;
}

const say = (at, text, color = COL.good) => ({ text, color, x: at.x, y: at.y });

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
    if (id === 'refill') { s.can = FARMING.canMax; return res(true, 'Đã múc đầy bình', [say(at, 'Đầy bình! 💧', '#7ad7ff')], 'water'); }
    return res(true, '', [], 'click', { open: t.id });
  },
};

// ---------- Cửa hàng & kinh tế ----------
const R = (ok, msg, extra) => ({ ok, msg, ...extra });

export function buy(s, itemId, qty = 1) {
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
  if (!CROPS[itemId] && !PRODUCTS[itemId]) return R(false, 'Món này không bán được', { coins: 0 });
  const n = qty === 'all' ? have(s, itemId) : Math.floor(qty);
  if (!(n > 0) || n > have(s, itemId)) return R(false, 'Không đủ hàng để bán', { coins: 0 });
  const coins = n * sellPrice(itemId);
  take(s, itemId, n); addCoins(s, coins);
  return R(true, `Bán ${n} ${itemName(itemId).toLowerCase()} được ${coins} xu`, { coins });
}

export function sellAll(s) {
  let coins = 0;
  for (const k of Object.keys(s.inv)) if (CROPS[k] || PRODUCTS[k]) coins += sell(s, k, 'all').coins;
  return coins ? R(true, `Bán hết được ${coins} xu`, { coins }) : R(false, 'Kho chưa có gì để bán', { coins: 0 });
}

export function buyOutfit(s, slot, index) {
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
  const m = mapOf(s), c = Math.floor(s.player.x / TS), r = Math.floor(s.player.y / TS);
  if (m.isSolid(c, r) || m.plotAt(c, r) >= 0) return R(false, 'Chỗ này không đặt được, thử chỗ khác nhé');
  if (m.decos.some(o => o.ent.c === c && o.ent.r === r)) return R(false, 'Chỗ này có đồ rồi');
  take(s, itemId);
  s.farm.ents.push({ id: s.nextId++, kind: 'deco', item: itemId, c, r });
  bumpLayout(s);
  return R(true, `Đã đặt ${ITEMS[itemId].name.toLowerCase()}`);
}

export function selectSeed(s, cropId) {
  if (!CROPS[cropId]) return false;
  s.selectedSeed = cropId;
  return true;
}
