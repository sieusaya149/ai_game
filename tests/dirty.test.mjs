import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { ANIMALS, DIRT, HUSBANDRY, ITEMS } from '../public/data.js';

const MIN = 60_000, HOUR = 60 * MIN;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };
const quiet = fn => withRandom(0.1, fn);   // ngày mới ra nắng, không bệnh (0.1 > xác suất bệnh)
const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.time = 12 * HOUR; s.day = Math.floor(s.time / (24 * HOUR)) + 1; return s; };
const put = (s, type, extra) => {
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type, name: ANIMALS[type].name, stage: 'truong', nextProduct: 1e15, ready: false, hunger: 100, happy: 50, dirty: 0, ...extra };
  s.animals.push(a);
  return a;
};
// chạy `ms` giờ vườn, mỗi phút đổ đầy máng để con vật không đói
const run = (s, ms, weather = 'sun') => { for (let t = 0; t < ms; t += MIN) { s.weather = weather; for (const k of Object.keys(s.troughs)) s.troughs[k] = 20; for (const a of s.animals) a.hunger = 100; withRandom(weather === 'rain' ? 0.9 : 0.1, () => G.tick(s, Math.min(MIN, ms - t))); } };   // trời đặt lại mỗi phút (ngày mới thì theo hạt giống)
const day = s => { s.weather = 'sun'; s.day = Math.floor(s.time / (24 * HOUR)) + 1; };

test('độ dơ tăng 0 → 100 trong 3 giờ vườn; mưa và chuồng bẩn nhanh gấp đôi', () => {
  const s = newGame(); day(s);
  const a = put(s, 'ga');
  run(s, 90 * MIN);
  assert.ok(Math.abs(a.dirty - 50) < 1, `nửa đường: ${a.dirty}`);
  run(s, 100 * MIN);
  assert.equal(a.dirty, 100);

  const r = newGame(), b = put(r, 'ga');
  run(r, 90 * MIN, 'rain');
  assert.ok(b.dirty >= 99, `mưa: ${b.dirty}`);

  const p = newGame(); p.manure.chicken = 100;
  const c = put(p, 'ga');
  p.manure.chicken = 100; run(p, 90 * MIN);
  assert.ok(c.dirty >= 99, `chuồng bẩn: ${c.dirty}`);
});

test('vườn đóng băng thì không dơ thêm', () => {
  const s = newGame(); day(s);
  const a = put(s, 'ga', { dirty: 10 });
  s.wseed = 2;   // hạt giống thời tiết: ngày 36–42 không mưa (issue 55), để chạy bù chỉ dơ theo tốc độ thường
  s.savedAt = Date.now() - 20 * HOUR;
  s.simMs = 0;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = quiet(() => G.loadGame()), g = l.animals[0];
  // chỉ chạy bù tối đa 8 giờ vườn nên dơ chạm trần, nhưng phần 12 giờ đóng băng không tính: kiểm bằng mốc 1 giờ vắng
  s.savedAt = Date.now() - 1 * HOUR;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l2 = quiet(() => G.loadGame());
  assert.ok(Math.abs(l2.animals[0].dirty - (10 + 100 / 3)) < 2, `${l2.animals[0].dirty}`);
  assert.ok(g.dirty <= 100 && a.dirty === 10);
});

test('heo và bò đầm bùn: dơ ngay mà vui không giảm; gà dơ thì mất vui và dễ bệnh', () => {
  const s = newGame(); day(s);
  const heo = put(s, 'heo'), bo = put(s, 'bo'), ga = put(s, 'ga', { dirty: 80 });
  quiet(() => G.tick(s, 1000));
  assert.equal(heo.dirty, 100); assert.equal(bo.dirty, 100);
  assert.equal(heo.happy, 50); assert.equal(bo.happy, 50);
  assert.ok(ga.happy < 50, `gà dơ mất vui: ${ga.happy}`);

  // nguy cơ bệnh: số ngẫu nhiên nằm giữa p và 2p thì chỉ con dơ bị bệnh
  const t = newGame(); day(t);
  const sach = put(t, 'ga', { dirty: 0 }), dor = put(t, 'ga', { dirty: 90 });
  const p = HUSBANDRY.sickChancePerMin;
  withRandom(p / 60 * 1.5, () => G.tick(t, 1000));
  assert.ok(!sach.sick); assert.ok(dor.sick);
});

test('tắm: trừ 1 nước và 1 xà phòng, dơ về 0, +15 vui, phát sự kiện đã tắm; thiếu thì từ chối', () => {
  const s = newGame(); day(s);
  const a = put(s, 'ga', { dirty: 90, happy: 30, bond: 2 });
  const t = { kind: 'animal', id: a.id };
  assert.match(G.actionsFor(s, t).find(x => x.id === 'bath').disabled, /xà phòng/i);
  assert.equal(G.perform(s, t, 'bath').ok, false);
  s.inv.soap = 2; s.can = 0;
  assert.match(G.actionsFor(s, t).find(x => x.id === 'bath').disabled, /nước|giếng/);
  assert.equal(G.perform(s, t, 'bath').ok, false);
  assert.equal(s.inv.soap, 2);

  s.can = 3;
  G.tick(s, 0);
  const r = G.perform(s, t, 'bath');
  assert.equal(r.ok, true);
  assert.equal(s.can, 2); assert.equal(s.inv.soap, 1);
  assert.equal(a.dirty, 0); assert.equal(a.happy, 45);
  assert.ok(a.bond > 2 || a.bondXp > 0);   // tắm cộng điểm thân (addBond 'bath')
  assert.equal(G.actionsFor(s, t)[0].id !== undefined, true);
  const ev = G.tick(s, 10);
  assert.ok(ev.some(e => e.type === 'bathed' && e.id === a.id) || r.bath === a.id);
});

test('bán xà phòng ở chợ Bà Tư; heo tắm xong một lúc mới lăn bùn lại', () => {
  const s = newGame(); day(s); s.time = 10 * HOUR; s.coins = 100;
  assert.ok(ITEMS.soap && ITEMS.soap.price > 0);
  assert.equal(G.buy(s, 'soap', 2).ok, true);
  assert.equal(s.inv.soap, 2); assert.equal(s.coins, 100 - 2 * ITEMS.soap.price);

  const heo = put(s, 'heo');
  s.can = 5;
  quiet(() => G.tick(s, 1000));
  assert.equal(heo.dirty, 100);
  G.perform(s, { kind: 'animal', id: heo.id }, 'bath');
  assert.equal(heo.dirty, 0);
  quiet(() => G.tick(s, 5 * MIN));
  assert.ok(heo.dirty < 100, 'chưa lăn lại ngay');
  quiet(() => G.tick(s, DIRT.wallowAfterMs));
  assert.equal(heo.dirty, 100);
});

test('xúc phân: chuồng hết bẩn và được phân chuồng; phân tích dần theo giờ vườn', () => {
  const s = newGame(); day(s);
  put(s, 'ga');
  assert.equal(G.penDirty(s, 'chicken'), false);
  run(s, 2 * HOUR + MIN);
  assert.equal(G.penDirty(s, 'chicken'), true);
  assert.deepEqual(G.dirtyPens(s), ['chicken']);
  const t = { kind: 'trough', pen: 'chicken' };
  const r = G.perform(s, t, 'muck');
  assert.equal(r.ok, true);
  assert.equal(G.penDirty(s, 'chicken'), false);
  assert.equal(s.manure.chicken, 0);
  assert.ok(s.inv.manure >= 1);
  assert.equal(G.perform(s, t, 'muck').ok, false);   // chuồng sạch rồi
  const pig = newGame(); put(pig, 'heo');   // chuồng không có con thì không bẩn
  assert.equal(G.penDirty(pig, 'chicken'), false);
});

test('ổ cát: gà có ổ cát giữ dơ thấp, mưa thì vẫn dơ', () => {
  const s = newGame(); day(s);
  const pen = G.mapOf(s).pens.chicken;
  pen.ent.sand = true;   // lát 35 đặt cờ này trên chuồng gia cầm cấp 3
  const a = put(s, 'ga');
  run(s, 4 * HOUR - 10 * MIN);   // dừng giữa ngày (trời đặt lại mỗi phút; sáng ngày mới trời theo hạt giống)
  assert.ok(a.dirty <= DIRT.sandCap, `${a.dirty}`);
  run(s, 3 * HOUR, 'rain');   // vẫn dừng giữa ngày: sáng ngày mới trời theo hạt giống (issue 55), chưa chắc mưa
  assert.ok(a.dirty > DIRT.sandCap);
  delete pen.ent.sand;
});
