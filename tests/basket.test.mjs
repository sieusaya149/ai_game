// Giỏ có sức chứa: nông sản & sản phẩm vào giỏ, đầy giỏ thì khóa thu hoạch, cất vào kho, bán/giao lấy từ cả giỏ lẫn kho, bản lưu cũ.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { migrate } from '../public/migrate.js';
import { DAY_MS, CROPS } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e12; return s; };
const noon = s => { s.time = 6 / 24 * DAY_MS; return s; };   // 12h: chợ mở
const ripe = (s, i) => {
  const p = s.plots[i]; p.soil = 'tilled';
  p.crop = { id: 'cai', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
};
const act = (s, t, id) => G.actionsFor(s, t).find(a => a.id === id);
const FULL = 'Giỏ đầy, về kho cất đồ';

test('sức chứa giỏ theo cấp: 30 / 60 / 120', () => {
  const s = newGame();
  assert.deepEqual([1, 2, 3].map(l => { s.tools.basket.lv = l; return G.basketCap(s); }), [30, 60, 120]);
});

test('thu hoạch bỏ nông sản vào giỏ, không vào kho', () => {
  const s = newGame(); ripe(s, 0);
  assert.ok(G.perform(s, { kind: 'plot', idx: 0 }, 'harvest').ok);
  assert.equal(s.basket.cai, CROPS.cai.yield);
  assert.equal(s.inv.cai, undefined);
  assert.equal(G.basketCount(s), CROPS.cai.yield);
});

test('hạt giống, vật tư, thức ăn không tính vào sức chứa', () => {
  const s = newGame();
  s.inv.seed_cai = 500; s.inv.fertilizer = 50; s.inv.feed_ga = 50;
  assert.equal(G.basketCount(s), 0);
  ripe(s, 0);
  assert.equal(act(s, { kind: 'plot', idx: 0 }, 'harvest').disabled, undefined);
});

test('giỏ đầy thì khóa thu hoạch, nhặt trứng, vắt sữa kèm lý do', () => {
  const s = newGame(); ripe(s, 0);
  s.basket = { trung: 30 };
  assert.equal(act(s, { kind: 'plot', idx: 0 }, 'harvest').disabled, FULL);
  const r = G.perform(s, { kind: 'plot', idx: 0 }, 'harvest');
  assert.ok(!r.ok); assert.equal(r.msg, FULL);
  assert.ok(s.plots[0].crop, 'cây vẫn còn');
  s.eggs.push({ id: 900, x: 10, y: 10 });
  assert.equal(act(s, { kind: 'egg', id: 900 }, 'collect').disabled, FULL);
  s.animals.push({ id: 901, type: 'bo', stage: 'truong', ready: true, hunger: 100, happy: 60, sick: false, x: 0, y: 0 });
  assert.equal(act(s, { kind: 'animal', id: 901 }, 'milk').disabled, FULL);
  assert.equal(act(s, { kind: 'animal', id: 901 }, 'collect'), undefined);
});

test('thu hoạch lố sức chứa thì khóa, vừa đủ thì cho', () => {
  const s = newGame(); ripe(s, 0);
  s.basket = { trung: 30 - CROPS.cai.yield + 1 };
  assert.equal(act(s, { kind: 'plot', idx: 0 }, 'harvest').disabled, FULL);
  s.basket = { trung: 30 - CROPS.cai.yield };
  assert.equal(act(s, { kind: 'plot', idx: 0 }, 'harvest').disabled, undefined);
  assert.ok(G.perform(s, { kind: 'plot', idx: 0 }, 'harvest').ok);
  assert.equal(G.basketCount(s), 30);
});

test('liềm cấp cao thu nhiều ô một lần: thu tới khi giỏ đầy rồi dừng', () => {
  const s = newGame();
  s.tools.sickle.lv = 3;
  const m = G.mapOf(s);
  const idx = s.plots.findIndex((_, i) => { const t = m.plotTile(i); return t && [-1, 0, 1].every(j => [-1, 0, 1].every(k => m.plotAt(t.c + k, t.r + j) >= 0)); });
  const t = m.plotTile(idx);
  for (const j of [-1, 0, 1]) for (const k of [-1, 0, 1]) ripe(s, m.plotAt(t.c + k, t.r + j));
  s.basket = { trung: 30 - 3 * CROPS.cai.yield };   // còn chỗ cho đúng 3 ô
  const a = act(s, { kind: 'plot', idx }, 'harvest');
  assert.equal(a.tiles.length, 3);
  const r = G.perform(s, { kind: 'plot', idx }, 'harvest');
  assert.ok(r.ok);
  assert.equal(G.basketCount(s), 30);
  assert.equal(s.plots.filter(p => p.crop).length, 6, 'còn 6 ô chưa thu');
  assert.equal(act(s, { kind: 'plot', idx: s.plots.findIndex(p => p.crop) }, 'harvest').disabled, FULL);
});

test('cất hết vào kho làm giỏ trống, lấy ra lại tới khi giỏ đầy', () => {
  const s = newGame();
  s.basket = { cai: 10, trung: 5 }; s.inv.cai = 2;
  const r = G.stashAll(s);
  assert.ok(r.ok);
  assert.equal(G.basketCount(s), 0);
  assert.deepEqual([s.inv.cai, s.inv.trung], [12, 5]);
  assert.ok(G.withdraw(s, 'cai', 4).ok);
  assert.deepEqual([s.basket.cai, s.inv.cai], [4, 8]);
  s.inv.cai = 100;
  G.withdraw(s, 'cai', 'all');
  assert.equal(G.basketCount(s), 30, 'chỉ lấy được tới khi đầy');
  assert.ok(!G.withdraw(s, 'cai', 1).ok);
  assert.ok(!G.withdraw(s, 'seed_cai', 1).ok, 'hạt giống không bỏ vào giỏ');
  assert.ok(!G.stashAll(newGame()).ok, 'giỏ trống thì không có gì để cất');
});

test('bán lấy từ cả giỏ lẫn kho', () => {
  const s = noon(newGame());
  s.basket = { cai: 3 }; s.inv.cai = 4;
  assert.equal(G.haveItem(s, 'cai'), 7);
  const r = G.sell(s, 'cai', 'all');
  assert.ok(r.ok); assert.equal(r.coins, 7 * CROPS.cai.price);
  assert.equal(G.haveItem(s, 'cai'), 0);
  s.basket = { cai: 3 }; s.inv.cai = 4;
  assert.ok(G.sell(s, 'cai', 5).ok);
  assert.deepEqual([s.basket.cai, s.inv.cai], [undefined, 2], 'lấy giỏ trước rồi tới kho');
  s.basket = { carot: 1 }; s.inv = { trung: 2 };
  const all = G.sellAll(s);
  assert.ok(all.ok); assert.deepEqual([s.basket, s.inv], [{}, {}]);
});

test('takeItem: không đủ thì không lấy gì', () => {
  const s = newGame();
  s.basket = { cai: 2 }; s.inv = { cai: 1 };
  assert.equal(G.takeItem(s, 'cai', 4), false);
  assert.equal(G.haveItem(s, 'cai'), 3);
  assert.equal(G.takeItem(s, 'cai', 3), true);
});

test('đơn hàng giao đồ lấy từ cả giỏ lẫn kho', () => {
  const s = newGame();
  s.orders = [{ id: 77, who: 'Bà Hai', items: { cai: 5, trung: 2 }, coins: 50, exp: 3 }];
  s.basket = { cai: 2 }; s.inv.cai = 3; s.inv.trung = 2;
  const r = G.fulfillOrder(s, 77);
  assert.ok(r.ok, r.msg);
  assert.equal(G.haveItem(s, 'cai'), 0);
});

test('bản lưu cũ chưa có giỏ: đồ cũ vào kho, giỏ trống', () => {
  const s = newGame();
  const old = JSON.parse(JSON.stringify(s));
  delete old.basket; old.inv.cai = 9; old.inv.trung = 3;
  store[G.SAVE_KEY] = JSON.stringify(old);
  const l = G.loadGame();
  assert.deepEqual(l.basket, {});
  assert.equal(l.inv.cai, 9);
  assert.equal(G.basketCap(l), 30);
  assert.deepEqual(migrate(old).basket, {});
  assert.deepEqual(migrate({ ...old, basket: { cai: 1 } }).basket, { cai: 1 });
});
