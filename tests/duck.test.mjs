// Vịt (issue 47): loài mới ở chuồng gia cầm chung với gà, qua API công khai của state.js.
import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { ANIMALS, LIFE, HUSBANDRY, DAY_MS, MAX_CATCHUP_MS, PRODUCTS, FREE, DIRT } from '../public/data.js';
import { mapOf } from '../public/farm.js';

const MIN = 60_000, HOUR = 60 * MIN;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
// Math.random có hạt giống cố định (mulberry32), đặt lại đầu mỗi test: kẻ săn mồi, bệnh, con lạc ra cùng kết quả mỗi lần chạy
const rnd0 = Math.random;
beforeEach(() => { let a = 47; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
after(() => { Math.random = rnd0; });
const NOON = DAY_MS * 0.3;
const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.time = NOON; s.coins = 1e6; s.exp = 1e6; return s; };
const bird = (s, type, stage, sex, extra) => {
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type, name: ANIMALS[type].name, stage, age: G.stageStart(type, stage), nextProduct: s.time, ready: false, sex, hunger: 100, happy: 80, ...extra };
  s.animals.push(a);
  return a;
};
const feed = s => { s.weather = 'sun'; for (const k of Object.keys(s.troughs)) s.troughs[k] = 20; for (const a of s.animals) { a.hunger = 100; a.happy = Math.max(a.happy, 80); } };
const run = (s, ms, each) => { const ev = []; for (let t = 0; t < ms; t += 5000) { feed(s); each?.(s); ev.push(...G.tick(s, Math.min(5000, ms - t))); } return ev; };
const healthy = s => { for (const a of s.animals) { a.sick = 0; a.dirty = 0; } };   // nuôi khéo: không bệnh, không dơ
// không kẻ săn mồi, không trộm: diều hâu, chuột ngẫu nhiên (lát 43) làm vịt con hoảng chạy khỏi ô của mẹ
const calm = s => { healthy(s); s.preds = []; s.threats = []; };
const penned = s => { for (const a of s.animals) { a.tile = null; a.stray = false; } };   // lùa về chuồng: để ngủ ngoài thì chồn hương bắt mất (lát 46)

test('vịt có bảng loài riêng, cùng thang tuổi với gà, nuôi chung chuồng gia cầm', () => {
  assert.equal(ANIMALS.vit.pen, ANIMALS.ga.pen);
  // cùng thang tuổi với gà (trưởng thành, già như nhau), chỉ non và nhỡ lâu hơn chút
  assert.ok(LIFE.vit.non >= LIFE.ga.non && LIFE.vit.nho >= LIFE.ga.nho && LIFE.vit.non + LIFE.vit.nho <= 2 * (LIFE.ga.non + LIFE.ga.nho));
  assert.deepEqual([LIFE.vit.truong, LIFE.vit.gia], [LIFE.ga.truong, LIFE.ga.gia]);
  assert.ok(FREE.types.includes('vit'));
  assert.equal(ANIMALS.vit.product, 'trung_vit');
  assert.ok(PRODUCTS.trung_vit.price > 0);
});

test('vịt đi đủ 4 giai đoạn đúng mốc giờ', () => {
  const s = newGame(), d = bird(s, 'vit', 'non', 'f', { age: 0, nextProduct: 1e15 });
  assert.equal(d.stage, 'non');
  const seen = [];
  const grown = LIFE.vit.non + LIFE.vit.nho;
  for (let t = 0; t < grown + HOUR; t += MIN) { feed(s); penned(s); G.tick(s, MIN); if (!seen.includes(d.stage)) seen.push(d.stage); if (d.stage === 'truong') break; }
  assert.deepEqual(seen, ['non', 'nho', 'truong']);
  assert.ok(d.age >= grown && d.age < grown + MIN + 1, 'lên trưởng thành sau non + nhỡ');
  d.age = G.stageStart('vit', 'gia'); feed(s); G.tick(s, 1000);
  assert.equal(d.stage, 'gia');
});

test('vịt mái trưởng thành đẻ trứng vịt, nhặt vào kho và bán được', () => {
  const s = newGame(); bird(s, 'vit', 'truong', 'f');
  s.eggs = [];
  run(s, ANIMALS.vit.every + MIN);
  assert.ok(s.eggs.length >= 1, 'có trứng');
  assert.equal(s.eggs[0].sp, 'vit');
  const e = s.eggs[0];
  const r = G.perform(s, { kind: 'egg', id: e.id }, 'collect');
  assert.ok(r.ok);
  assert.equal(G.haveItem(s, 'trung_vit'), 1);
  assert.equal(G.haveItem(s, 'trung'), 0, 'không lẫn trứng gà');
  s.time = NOON;   // chợ mở 6h–18h
  const coins = s.coins, sold = G.sell(s, 'trung_vit', 1);
  assert.ok(sold.ok, sold.msg);
  assert.equal(s.coins - coins, PRODUCTS.trung_vit.price);
});

test('vịt non, vịt trống không đẻ; vịt già đẻ thưa hơn vịt trưởng thành', () => {
  const s = newGame(); bird(s, 'vit', 'non', 'f', { nextProduct: 0 }); bird(s, 'vit', 'nho', 'f', { nextProduct: 0 }); bird(s, 'vit', 'truong', 'm', { nextProduct: 0 });
  run(s, 10 * MIN, penned);   // vịt con 5+10 phút mới lớn
  assert.equal(s.eggs.length, 0);
  const a = newGame(), b = newGame(); bird(a, 'vit', 'truong', 'f'); bird(b, 'vit', 'gia', 'f');
  const laid = ev => ev.filter(e => e.type === 'egg').length;   // đếm lúc đẻ: khỏi phụ thuộc trứng còn nằm đó hay không
  const keep = s => { healthy(s); penned(s); };
  const nA = laid(run(a, 60 * MIN, keep)), nB = laid(run(b, 60 * MIN, keep));
  assert.ok(nB < nA, `già ${nB} < trưởng thành ${nA}`);
});

test('vịt tính chung sức chứa chuồng gia cầm với gà', () => {
  const s = newGame();
  s.animals = [];
  const cap = G.penCap(s, 'chicken');
  for (let i = 0; i < cap - 1; i++) bird(s, 'ga', 'truong', 'f', { pen: s.farm.ents.find(e => e.pen === 'chicken')?.id });
  assert.ok(G.buyAnimal(s, 'vit', 'f').ok, 'còn 1 chỗ cho vịt');
  const r = G.buyAnimal(s, 'ga', 'f');
  assert.equal(r.ok, false, 'chuồng đầy');
});

test('trứng vịt có phôi: soi, nhặt, ấp nở ra vịt con', () => {
  const s = newGame(); bird(s, 'vit', 'truong', 'f'); bird(s, 'vit', 'truong', 'm');
  s.eggs = [{ id: s.nextId++, sp: 'vit', x: 10, y: 10, laidAt: s.time, fertile: true, mom: { id: 1, name: 'Mẹ' }, dad: { id: 2, name: 'Bố' } }];
  const id = s.eggs[0].id;
  assert.ok(G.perform(s, { kind: 'egg', id }, 'candle').ok);
  assert.ok(G.perform(s, { kind: 'egg', id }, 'collect').ok);
  assert.equal(G.haveItem(s, 'trung_vit_phoi'), 1);
  const ducks = s.animals.length;
  assert.ok(G.perform(s, { kind: 'nest' }, 'incubate').ok);
  run(s, HUSBANDRY.nestHatchMs + MIN, s => { calm(s); penned(s); });   // qua cả đêm: ở yên trong chuồng cho chồn hương khỏi bắt
  assert.equal(s.animals.length, ducks + 1);
  const b = s.animals.at(-1);
  assert.equal(b.type, 'vit'); assert.equal(b.stage, 'non'); assert.equal(b.mom.name, 'Mẹ');
});

test('vịt dùng luật chung: thả rông ban ngày, chạng vạng về chuồng; chạy bù offline không con nào chết', () => {
  const s = newGame(); const ds = [bird(s, 'vit', 'truong', 'f'), bird(s, 'vit', 'nho', 'm')];
  run(s, 3 * MIN, calm);   // diều hâu, chuột làm vịt hoảng chạy về chuồng: để test khác lo
  assert.ok(ds.every(d => d.tile), 'ban ngày thả rông');
  s.time = DAY_MS * 0.78; run(s, 2 * MIN, calm);   // sau 18h
  assert.ok(ds.every(d => !d.tile || d.stray), 'tối về chuồng, trừ con lạc (issue 42)');
  // chạy bù offline (ADR 0004): dù đói lả và bệnh, không con vịt nào chết
  const o = newGame(); const od = [bird(o, 'vit', 'truong', 'f'), bird(o, 'vit', 'non', 'm'), bird(o, 'vit', 'truong', 'm', { sick: 2, sickMs: 1 })];
  o.troughs[G.mapOf(o).pens.chicken.id] = 100; G.tick(o, 1);
  o.savedAt = Date.now() - Math.min(MAX_CATCHUP_MS, 3 * HOUR);
  store[G.SAVE_KEY] = JSON.stringify(o);
  const l = G.loadGame();
  assert.ok(od.every(d => l.animals.some(x => x.id === d.id)), 'không con nào chết');
  assert.ok(l.animals.every(x => (x.sick ?? 0) <= 2), 'chạy bù không ai tới nguy kịch');
});

test('vịt cũng lạc ban đêm và lùa về chuồng được như gà (issue 42)', () => {
  const s = newGame();
  const ds = Array.from({ length: 8 }, () => bird(s, 'vit', 'truong', 'f', { nextProduct: 1e15 }));
  run(s, 2 * MIN);
  s.time = DAY_MS * FREE.duskAt + 1000; run(s, MIN);
  const out = G.strays(s);
  assert.ok(out.length >= 1 && out.length <= 3, `lạc ${out.length} con`);
  assert.ok(out.every(a => a.type === 'vit'));
  const pen = G.penHome(s, mapOf(s).penList.find(p => p.type === 'chicken').id);
  assert.equal(pen.total, ds.length);
  const a = out[0];
  assert.equal(G.passGate(s, a.id), true);
  assert.equal(a.tile, null); assert.equal(a.stray, false);
});

test('đơn hàng của làng có lúc xin trứng vịt khi đã mở khoá vịt', () => {
  const s = newGame(); s.exp = 1e6;
  const asked = new Set();
  for (let i = 0; i < 300; i++) { s.orders = []; s.nextOrderAt = s.time; G.tick(s, 1000); for (const k of Object.keys(s.orders[0]?.items ?? {})) asked.add(k); }
  assert.ok(asked.has('trung_vit'), 'có đơn xin trứng vịt');
  assert.ok(asked.has('trung'), 'vẫn có đơn xin trứng gà');
  const low = newGame(); low.exp = 0;   // cấp 1: chưa nuôi được vịt
  const lowAsked = new Set();
  for (let i = 0; i < 200; i++) { low.orders = []; low.nextOrderAt = low.time; G.tick(low, 1000); for (const k of Object.keys(low.orders[0]?.items ?? {})) lowAsked.add(k); }
  assert.ok(!lowAsked.has('trung_vit'), 'cấp thấp chưa xin trứng vịt');
});

test('vịt dơ dần, tắm sạch được; có ổ cát ở chuồng cấp 3 thì tự tắm cát như gà', () => {
  const s = newGame(); const d = bird(s, 'vit', 'truong', 'f', { dirty: 90, happy: 30, nextProduct: 1e15 });
  const t = { kind: 'animal', id: d.id };
  assert.ok(G.isDirty(d));
  s.inv.soap = 1; s.can = 3; G.tick(s, 0);
  assert.equal(G.perform(s, t, 'bath').ok, true);
  assert.equal(d.dirty, 0);
  const u = newGame(); G.mapOf(u).pens.chicken.ent.sand = true;
  const e = bird(u, 'vit', 'truong', 'f', { dirty: 0, nextProduct: 1e15 });
  run(u, 4 * 60 * MIN);
  assert.ok(e.dirty <= DIRT.sandCap, `tắm cát: ${e.dirty}`);
});

test('vịt bệnh thì chậm lại và chữa bằng thuốc, tiêm vắc-xin được như gà (issue 38)', () => {
  const s = newGame(); const d = bird(s, 'vit', 'truong', 'f', { nextProduct: 1e15, sick: 1, sickMs: 0, sickSince: s.time });
  s.inv.medicine = 1;
  const r = G.perform(s, { kind: 'animal', id: d.id }, 'medicine');
  assert.ok(r.ok, r.msg);
  assert.equal(d.sick, 0);
  s.inv.vaccine = 1;
  assert.ok(G.perform(s, { kind: 'animal', id: d.id }, 'vaccinate').ok);
  assert.ok(G.vaccinated(s, d), 'vịt đã tiêm thì miễn bệnh');
});

test('bán vịt trưởng thành cho Chú Ba theo giá loài; vịt có độ thân như gà', () => {
  const s = newGame(); const d = bird(s, 'vit', 'truong', 'f', { nextProduct: 1e15, bond: 0, bondXp: 0 });
  const coins = s.coins;
  const r = G.sellAnimal(s, d.id);
  assert.ok(r.ok, r.msg);
  assert.ok(s.coins > coins);
  assert.ok(!s.animals.includes(d));
  const t = newGame(); const e = bird(t, 'vit', 'truong', 'f', { nextProduct: 1e15, bond: 0, bondXp: 0 });
  assert.ok(G.perform(t, { kind: 'animal', id: e.id }, 'pet').ok);
  assert.ok(e.bondXp > 0 || e.bond > 0, 'vuốt ve cộng điểm thân');
});

test('thả rông: vịt con bám ô của vịt mẹ, không đi lung tung một mình', () => {
  const s = newGame();
  const mom = bird(s, 'vit', 'truong', 'f', { nextProduct: 1e15 });
  const kids = [bird(s, 'vit', 'non', 'm', { age: 0 }), bird(s, 'vit', 'non', 'f', { age: 0 })];
  run(s, 3 * MIN, calm);   // dưới 5 phút: vịt con chưa lên nhỡ
  assert.ok(mom.tile, 'mẹ ra vườn');
  for (const k of kids) assert.deepEqual({ c: k.tile?.c, r: k.tile?.r }, { c: mom.tile.c, r: mom.tile.r }, 'con bám ô của mẹ');
  const lone = newGame(); const alone = bird(lone, 'vit', 'non', 'm', { age: 0 });
  run(lone, 3 * MIN, calm);
  assert.ok(alone.tile, 'không có mẹ thì vẫn tự đi');
});
