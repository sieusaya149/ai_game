import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../public/state.js';
import { CROPS, FARMING, HUSBANDRY, DOG, THREATS, DAY_MS } from '../public/data.js';

const MIN = 60_000;
// localStorage giả cho Node
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const newGame = () => { const s = G.createGame({ name: 'Hùng', look: {} }); s.orders = []; s.nextOrderAt = 1e12; return s; };
const T = idx => ({ kind: 'plot', idx });
const run = (s, ms) => G.tick(s, ms);
const withRandom = (v, fn) => { const r = Math.random; Math.random = typeof v === 'function' ? v : () => v; try { return fn(); } finally { Math.random = r; } };
const LUCKY = 0.0001; // luôn trúng mọi xác suất nhỏ
const noBugs = fn => withRandom(0.99, fn); // không xảy ra sự kiện ngẫu nhiên

test('createGame: đúng dữ liệu khởi đầu', () => {
  const s = newGame();
  assert.equal(s.plots.length, 9);   // vườn mới: 1 khối ruộng 3x3
  assert.equal(s.plots.filter(p => p.unlocked).length, 9);
  assert.deepEqual(G.UNLOCK_ORDER.slice(0, 9).sort((a, b) => a - b), [0, 1, 2, 6, 7, 8, 12, 13, 14]);
  assert.equal(s.coins, 250);
  assert.equal(s.animals.length, 2);
  assert.equal(s.inv.seed_cai, 6);
  assert.equal(G.clockText(s), '6:00 sáng');
  assert.equal(G.isNight(s), false);
});

test('cuốc -> gieo -> tưới -> chín -> thu hoạch -> bán', () => {
  const s = newGame();
  let a = G.actionsFor(s, T(0));
  assert.equal(a[0].id, 'till');
  assert.match(a[0].label, /Cuốc đất/);
  assert.equal(G.perform(s, T(0), 'till').ok, true);
  a = G.actionsFor(s, T(0));
  assert.equal(a[0].id, 'plant');
  assert.match(a[0].label, /Gieo Cải xanh \(còn 6\)/);
  const r = G.perform(s, T(0), 'plant');
  assert.ok(r.ok && r.fx.length && r.sound === 'plant');
  assert.equal(s.inv.seed_cai, 5);
  assert.equal(G.perform(s, T(0), 'water').ok, true);
  assert.equal(s.can, 9);
  noBugs(() => { s.weather = 'rain'; run(s, CROPS.cai.grow + 1000); });
  assert.ok(s.plots[0].crop.progress >= 1);
  a = G.actionsFor(s, T(0));
  assert.equal(a[0].id, 'harvest');
  const h = G.perform(s, T(0), 'harvest');
  assert.ok(h.ok);
  assert.equal(s.basket.cai, 4);   // thu hoạch vào giỏ
  assert.equal(s.plots[0].soil, 'untilled');
  assert.equal(s.plots[0].crop, null);
  const before = s.coins, n = G.haveItem(s, 'cai');
  const sold = G.sell(s, 'cai', 'all');
  assert.equal(sold.coins, n * CROPS.cai.price);
  assert.equal(s.coins, before + sold.coins);
  assert.equal(s.stats.harvests, 1);
});

test('hết hạt -> disabled, không cuốc nhầm; hết nước bình -> disabled', () => {
  const s = newGame();
  G.perform(s, T(0), 'till');
  delete s.inv.seed_cai;
  const a = G.actionsFor(s, T(0))[0];
  assert.equal(a.disabled, 'Hết hạt, mua ở chợ nhé');
  const r = G.perform(s, T(0), 'plant');
  assert.equal(r.ok, false);
  assert.equal(s.plots[0].crop, null);
});

test('sâu -> bệnh -> chết; phun thuốc chữa', () => {
  const s = newGame();
  G.perform(s, T(0), 'till'); G.perform(s, T(0), 'plant');
  s.weather = 'rain';
  const p = s.plots[0];
  p.crop.bugs = true; p.crop.bugSince = s.time;
  // bắt tay thất bại/thành công
  withRandom(0.9, () => { const r = G.perform(s, T(0), 'catch'); assert.ok(r.ok); assert.equal(p.crop.bugs, true); });
  noBugs(() => run(s, FARMING.bugToSick + 2000));
  assert.equal(p.crop.sick, true);
  const spray = G.actionsFor(s, T(0))[0];
  assert.equal(spray.id, 'spray');
  const r = G.perform(s, T(0), 'spray');
  assert.ok(r.ok); assert.equal(p.crop.sick, false); assert.equal(s.inv.pesticide ?? 0, 0);
  // lần 2: để chết
  p.crop.bugs = true; p.crop.bugSince = s.time;
  noBugs(() => run(s, FARMING.bugToSick + FARMING.sickToDead + 3000));
  assert.equal(p.crop.dead, true);
  assert.equal(G.actionsFor(s, T(0))[0].id, 'clear');
  G.perform(s, T(0), 'clear');
  assert.equal(p.crop, null);
});

test('bắt sâu bằng tay thành công khi may mắn', () => {
  const s = newGame();
  G.perform(s, T(0), 'till'); G.perform(s, T(0), 'plant');
  s.plots[0].crop.bugs = true;
  withRandom(0.1, () => G.perform(s, T(0), 'catch'));
  assert.equal(s.plots[0].crop.bugs, false);
  assert.equal(s.stats.bugs, 1);
});

test('chín quá thì héo', () => {
  const s = newGame();
  G.perform(s, T(0), 'till'); G.perform(s, T(0), 'plant');
  s.weather = 'rain';
  noBugs(() => run(s, CROPS.cai.grow * 1.6));
  assert.equal(s.plots[0].crop.rotten, true);
});

test('bình tưới và giếng', () => {
  const s = newGame();
  s.can = 0;
  G.perform(s, T(0), 'till'); G.perform(s, T(0), 'plant');
  const w = G.actionsFor(s, T(0)).find(x => x.id === 'water');
  assert.ok(w.disabled);
  const well = { kind: 'building', id: 'well' };
  const r = G.perform(s, well, 'refill');
  assert.ok(r.ok); assert.equal(r.sound, 'water');
  assert.equal(s.can, FARMING.canMax);
  for (const id of ['shed', 'board']) assert.equal(G.perform(s, { kind: 'building', id }, 'open').open, id);
});

test('bón phân tăng sản lượng, thuốc tăng trưởng đẩy nhanh', () => {
  const s = newGame();
  s.inv.growth = 2;
  G.perform(s, T(0), 'till'); G.perform(s, T(0), 'plant'); G.perform(s, T(0), 'water');
  assert.ok(G.perform(s, T(0), 'fertilize').ok);
  G.perform(s, T(0), 'growth'); G.perform(s, T(0), 'growth');
  assert.ok(s.plots[0].crop.progress >= 1);
  assert.equal(G.perform(s, T(0), 'growth').ok, false);
  G.perform(s, T(0), 'harvest');
  assert.equal(s.basket.cai, Math.round(CROPS.cai.yield * 1.5));
});

test('mở rộng đất theo thứ tự (vườn chuyển từ v1 còn ô khóa)', () => {
  const v1 = JSON.parse(readFileSync(new URL('./fixtures/v1-fresh.json', import.meta.url), 'utf8'));
  v1.savedAt = Date.now();
  for (const k of Object.keys(store)) delete store[k];
  store['nongtrai-save-v1'] = JSON.stringify(v1);
  const s = G.loadGame();
  const next = G.nextLockedPlot(s);
  assert.equal(next, G.UNLOCK_ORDER[9]);
  assert.deepEqual(G.actionsFor(s, { kind: 'lockedPlot', idx: 35 }), []);
  const a = G.actionsFor(s, { kind: 'lockedPlot', idx: next })[0];
  assert.equal(a.id, 'expand');
  s.coins = 500;
  assert.ok(G.perform(s, { kind: 'lockedPlot', idx: next }, 'expand').ok);
  assert.equal(s.plots[next].unlocked, true);
  assert.ok(s.coins < 500);
});

test('heo trưởng thành sinh sản: mang bầu rồi đẻ 1-3 heo con', () => {
  const s = newGame();
  s.animals = [];
  s.exp = 1e4; s.coins = 5000;
  assert.ok(G.placeEntity(s, { kind: 'pen', pen: 'pig' }, 34, 18).ok);   // chuồng heo (sức chứa cấp 1: 3 con)
  const troughOk = () => { s.troughs.pig = 20; };
  for (let i = 0; i < 2; i++) {
    const a = { id: s.nextId++, type: 'heo', stage: 'truong', age: G.stageStart('heo', 'truong'), hunger: 100, happy: 100, sick: 0, starvingSince: 0, nextProduct: 0, ready: false, pregnant: false, dueAt: 0, x: 330, y: 320, name: 'Heo' };
    s.animals.push(a);
  }
  let events = [];
  for (let i = 0; i < 60 && !s.animals.some(a => a.pregnant); i++) { troughOk(); withRandom(LUCKY, () => events.push(...run(s, 1000))); s.animals.forEach(a => { a.hunger = 100; a.happy = 100; }); }
  assert.ok(s.animals.some(a => a.pregnant), 'có heo mang bầu');
  const sow = s.animals.find(a => a.pregnant);
  sow.dueAt = s.time + 1000;
  withRandom(0.5, () => { for (let i = 0; i < 3; i++) { troughOk(); s.animals.forEach(a => { a.hunger = 100; a.happy = 100; }); events.push(...run(s, 1000)); } });
  const piglets = s.animals.filter(a => a.stage === 'non');
  assert.ok(piglets.length >= 1 && piglets.length <= 3);
  assert.equal(s.stats.piglets, piglets.length);
  assert.ok(events.some(e => e.type === 'spawn' && e.what === 'piglet'));
  assert.equal(sow.pregnant, false);
});

test('gà mái đẻ trứng xuống đất, nhặt trứng, ổ ấp nở', () => {
  const s = newGame();
  const hen = s.animals.find(a => a.type === 'ga' && a.stage === 'truong');
  hen.x = 100; hen.y = 320; s.troughs.chicken = 20;
  const ev = noBugs(() => run(s, 3 * MIN));
  assert.ok(s.eggs.length >= 1);
  assert.ok(ev.some(e => e.type === 'spawn' && e.what === 'egg'));
  assert.equal(s.eggs[0].x, 100);
  const egg = s.eggs[0];
  assert.match(G.actionsFor(s, { kind: 'egg', id: egg.id })[0].label, /Nhặt trứng/);
  const r = G.perform(s, { kind: 'egg', id: egg.id }, 'collect');
  assert.ok(r.ok);
  assert.equal(s.basket.trung, 1);
  assert.equal(s.stats.eggs, 1);
  // ổ ấp
  const nest = { kind: 'nest' };
  assert.ok(G.perform(s, nest, 'incubate').ok);
  assert.equal(s.nest.egg, true);
  const n0 = s.animals.length;
  s.troughs.chicken = 20;
  noBugs(() => run(s, HUSBANDRY.nestHatchMs + 1000));
  assert.equal(s.nest.egg, false);
  assert.equal(s.animals.length, n0 + 1);
  assert.equal(s.stats.hatches, 1);
});

test('trứng bỏ quên tự nở', () => {
  const s = newGame();
  s.animals = [];
  s.eggs.push({ id: 99, x: 60, y: 300, laidAt: 0 });
  withRandom(LUCKY, () => run(s, HUSBANDRY.eggForgetMs + 2000));
  assert.equal(s.eggs.length, 0);
  assert.equal(s.animals.length, 1);
  assert.equal(s.animals[0].stage, 'non');
});

test('bò có sữa, vắt sữa; bán con trưởng thành', () => {
  const s = newGame();
  s.level = 1;
  s.exp = 1e6;
  s.animals = [];
  s.animals.push({ id: 50, type: 'bo', stage: 'truong', age: G.stageStart('bo', 'truong'), hunger: 100, happy: 60, sick: 0, starvingSince: 0, nextProduct: 0, ready: false, pregnant: false, dueAt: 0, x: 440, y: 320, name: 'Bò' });
  s.troughs.pasture = 20;
  noBugs(() => run(s, 1000));
  assert.equal(s.animals[0].ready, true);
  assert.equal(G.actionsFor(s, { kind: 'animal', id: 50 })[0].id, 'milk');
  G.perform(s, { kind: 'animal', id: 50 }, 'milk');
  assert.equal(s.basket.sua, 1);
  const sellAct = G.actionsFor(s, { kind: 'animal', id: 50 }).find(a => a.id === 'sell');
  assert.match(sellAct.label, /Bán bò cho Chú Ba \(700 xu\)/);
  const c = s.coins;
  G.perform(s, { kind: 'animal', id: 50 }, 'sell');
  assert.equal(s.coins, c + 700);
  assert.equal(s.animals.length, 0);
});

test('vật nuôi: tự ăn ở máng, đói -> bệnh -> thuốc thú y', () => {
  const s = newGame();
  const hen = s.animals[0];
  s.troughs.chicken = 1;
  noBugs(() => run(s, 4 * MIN));
  assert.equal(s.troughs.chicken, 0);
  // đói lả
  noBugs(() => run(s, 10 * MIN));
  assert.equal(hen.sick, 1);   // mức Mệt
  s.inv.medicine = 1;
  assert.equal(G.actionsFor(s, { kind: 'animal', id: hen.id })[0].id, 'medicine');
  G.perform(s, { kind: 'animal', id: hen.id }, 'medicine');
  assert.equal(hen.sick, 0);
});

test('chó ỉa bậy -> xúc phân -> phân bón; giẫm phân trượt chân', () => {
  const s = newGame();
  s.dog.x = 77; s.dog.y = 88;
  const ev = noBugs(() => run(s, DOG.poopEvery[1] + 2000));
  assert.ok(s.poops.length >= 1);
  assert.deepEqual([s.poops[0].x, s.poops[0].y], [77, 88]);
  assert.ok(ev.some(e => e.type === 'spawn' && e.what === 'poop'));
  const id = s.poops[0].id, fert = s.inv.fertilizer;
  const r = withRandom(0.1, () => G.perform(s, { kind: 'poop', id }, 'scoop'));
  assert.ok(r.ok);
  assert.equal(s.inv.fertilizer, fert + 1);
  assert.equal(s.stats.poops, 1);
  s.poops.push({ id: 777, x: 5, y: 5, at: 0 });
  const id2 = 777;
  const sl = G.perform(s, { kind: 'poop', id: id2 }, 'slip');
  assert.ok(sl.ok); assert.equal(sl.sound, 'slip');
  assert.equal(s.stats.slips, 1);
});

test('chó con lớn thành chó trưởng thành theo giờ vườn', () => {
  const s = newGame();
  s.dog.hunger = 100;
  for (let i = 0; i < 91; i++) { s.dog.hunger = 100; noBugs(() => run(s, MIN)); }
  assert.equal(s.dog.stage, 'truong');
});

test('quạ đậu ô chín rồi ăn cây; bù nhìn chặn; đuổi quạ', () => {
  const s = newGame();
  s.animals = [];
  const mkRipe = idx => { G.perform(s, T(idx), 'till'); G.perform(s, T(idx), 'plant'); s.plots[idx].crop.progress = 1; };
  mkRipe(0);
  s.weather = 'rain';
  const ev = withRandom(LUCKY, () => run(s, 1000));
  assert.equal(s.threats.length, 1);
  assert.equal(s.threats[0].kind, 'crow');
  assert.ok(ev.some(e => e.type === 'spawn' && e.what === 'crow'));
  // đuổi được
  const th = s.threats[0];
  assert.equal(G.actionsFor(s, { kind: 'threat', id: th.id })[0].id, 'shoo');
  assert.ok(G.perform(s, { kind: 'threat', id: th.id }, 'shoo').ok);
  assert.equal(s.threats.length, 0);
  assert.equal(s.stats.crows, 1);
  // để nó ăn
  withRandom(LUCKY, () => run(s, 1000));
  assert.equal(s.threats.length, 1);
  s.dog.stage = 'non';
  s.dog.hunger = 100;
  noBugs(() => run(s, THREATS.crowEatMs + 90_000));
  assert.equal(s.plots[0].crop, null);
  // bù nhìn chặn
  const s2 = newGame(); s2.animals = [];
  G.perform(s2, T(0), 'till'); G.perform(s2, T(0), 'plant'); s2.plots[0].crop.progress = 1; s2.weather = 'rain';
  const pc = G.mapOf(s2).plotCenter(0);
  s2.inv.deco_scarecrow = 1; s2.player.x = pc.x - 16; s2.player.y = pc.y;   // cắm bù nhìn sát ruộng
  assert.ok(G.placeDeco(s2, 'deco_scarecrow').ok);
  withRandom(LUCKY, () => run(s2, 2000));
  assert.equal(s2.threats.length, 0);
});

test('thằng Tèo ban đêm, bắt được thì đền xu', () => {
  const s = newGame(); s.animals = [];
  for (const i of [0, 1]) { G.perform(s, T(i), 'till'); G.perform(s, T(i), 'plant'); s.plots[i].crop.progress = 1; }
  s.weather = 'rain';
  s.time = DAY_MS * 0.8; s.day = 1;
  assert.equal(G.isNight(s), true);
  withRandom(LUCKY, () => run(s, 1000));
  const th = s.threats.find(t => t.kind === 'thief');
  assert.ok(th);
  assert.equal(th.x, G.mapOf(s).gateIn.x);   // đi vào từ cổng
  const c = s.coins;
  const r = withRandom(0.5, () => G.perform(s, { kind: 'threat', id: th.id }, 'catch'));
  assert.ok(r.ok);
  assert.ok(s.coins >= c + 20 && s.coins <= c + 60);
  assert.equal(s.stats.thieves, 1);
});

test('đơn hàng: sinh ra và giao', () => {
  const s = G.createGame({ name: 'A', look: {} });
  noBugs(() => run(s, 1000));
  assert.equal(s.orders.length, 1);
  const o = s.orders[0];
  const items = Object.entries(o.items);
  assert.equal(G.fulfillOrder(s, o.id).ok, false);
  for (const [k, n] of items) s.inv[k] = n;
  const c = s.coins;
  const r = G.fulfillOrder(s, o.id);
  assert.ok(r.ok);
  assert.equal(s.coins, c + o.coins);
  assert.equal(s.orders.length, 0);
  assert.equal(s.stats.orders, 1);
});

test('mua bán: kiểm tra cấp, xu, chuồng', () => {
  const s = newGame();
  assert.equal(G.buy(s, 'seed_duahau', 1).ok, false);
  assert.ok(G.buy(s, 'seed_cai', 2).ok);
  assert.equal(s.inv.seed_cai, 8);
  s.coins = 1;
  assert.equal(G.buy(s, 'pesticide', 1).ok, false);
  s.coins = 1000;
  assert.equal(G.buyAnimal(s, 'bo').ok, false); // chưa đủ cấp
  assert.ok(G.buyAnimal(s, 'ga').ok);
  s.coins = 1e6;
  while (G.buyAnimal(s, 'ga').ok);
  assert.equal(s.animals.filter(a => a.type === 'ga').length, 6);   // chuồng gà cấp 1 chứa 6
  assert.ok(G.buyOutfit(s, 'hat', 2).ok);
  assert.equal(G.buyOutfit(s, 'hat', 2).ok, false);
  G.setLook(s, { hat: 2, acc: 2 });
  assert.equal(s.look.hat, 2); assert.equal(s.look.acc, 0);
});

test('lên cấp có thưởng; thành tựu', () => {
  const s = newGame();
  s.stats.harvests = 10;
  s.inv.cai = 1; s.inv.trung = 1;
  const ev = [];
  G.perform(s, { kind: 'poop', id: 1 }, 'slip'); // không sao
  s.plots[0].soil = 'tilled'; s.plots[0].crop = { id: 'duahau', progress: 1.2, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
  const c = s.coins;
  G.perform(s, T(0), 'harvest');
  ev.push(...run(s, 10));
  assert.ok(ev.some(e => e.type === 'levelup'));
  assert.ok(ev.some(e => e.type === 'achievement' && e.id === 'harvest10'));
  assert.ok(s.coins > c);
});

test('đặt đồ trang trí', () => {
  const s = newGame();
  s.inv.deco_flower = 1;
  Object.assign(s.player, G.mapOf(s).spawn);
  assert.ok(G.placeDeco(s, 'deco_flower').ok);
  assert.equal(G.mapOf(s).decos.length, 1);
  assert.equal(G.placeDeco(s, 'deco_flower').ok, false);
  s.inv.deco_flower = 1;
  Object.assign(s.player, G.mapOf(s).plotCenter(0)); // trên ruộng
  assert.equal(G.placeDeco(s, 'deco_flower').ok, false);
});

test('máng ăn và cho chó ăn', () => {
  const s = newGame();
  const tr = { kind: 'trough', pen: 'chicken' };
  assert.ok(G.perform(s, tr, 'fill').ok);
  assert.equal(s.troughs.chicken, 5);
  s.dog.hunger = 10;
  assert.equal(G.actionsFor(s, { kind: 'dog' })[0].id, 'feed');
  assert.ok(G.perform(s, { kind: 'dog' }, 'feed').ok);
  assert.equal(s.dog.hunger, 100);
});

test('thời tiết: mưa thì đủ nước, ngày mới đổi ngày', () => {
  const s = newGame();
  s.weather = 'rain';
  G.perform(s, T(0), 'till');
  noBugs(() => run(s, 5000));
  assert.equal(s.plots[0].water, 100);
  noBugs(() => run(s, DAY_MS));
  assert.equal(s.day, 2);
});

test('lưu và tải lại (có chạy bù offline)', () => {
  const s = newGame();
  G.perform(s, T(0), 'till'); G.perform(s, T(0), 'plant'); G.perform(s, T(0), 'water');
  G.saveGame(s);
  const back = G.loadGame();
  assert.equal(back.plots[0].crop.id, 'cai');
  assert.equal(back.name, 'Hùng');
  assert.equal(back.time, s.time);
  // giả lập nghỉ 30 phút
  const raw = JSON.parse(store[G.SAVE_KEY]);
  raw.savedAt = Date.now() - 30 * MIN;
  store[G.SAVE_KEY] = JSON.stringify(raw);
  const later = G.loadGame();
  assert.ok(later.time >= 29 * MIN);
  assert.equal(later.threats.length, 0);
  G.resetGame();
  assert.equal(G.loadGame(), null);
});
