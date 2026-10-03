// Đơn hàng xin sản phẩm của mọi loài vật nuôi (hotfix): sữa bò, lông cừu... chỉ xin khi nhà có loài đó, qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { ANIMALS, ORDERS, sellPrice } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.exp = 1e6; return s; };
const own = (s, type) => s.animals.push({ ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type, name: ANIMALS[type].name });
const asked = (s, n = 400) => {
  const set = new Set(), all = [];
  for (let i = 0; i < n; i++) { s.orders = []; s.nextOrderAt = s.time; G.tick(s, 1000); for (const o of s.orders) { all.push(o); for (const k of Object.keys(o.items)) set.add(k); } }
  return { set, all };
};

test('nhà có bò thì có đơn xin sữa bò, có cừu thì có đơn xin lông cừu', () => {
  const s = newGame(); own(s, 'bo'); own(s, 'cuu');
  const { set } = asked(s);
  assert.ok(set.has('sua'), 'có đơn xin sữa');
  assert.ok(set.has('len'), 'có đơn xin lông cừu');
});

test('không nuôi loài nào thì không có đơn xin sữa hay lông', () => {
  const s = newGame();
  const { set } = asked(s);
  assert.ok(!set.has('sua') && !set.has('len'));
  const t = newGame(); own(t, 'bo');
  const b = asked(t).set;
  assert.ok(b.has('sua') && !b.has('len'), 'chỉ xin sữa khi chỉ có bò');
});

test('cấp thấp chưa mở khoá loài đó thì không xin, dù bản lưu có con vật', () => {
  const s = newGame(); own(s, 'bo'); s.exp = 0;
  assert.ok(!asked(s, 200).set.has('sua'));
});

test('thưởng đơn sữa/lông cân bằng như đơn khác: tổng giá bán × hệ số thưởng', () => {
  const s = newGame(); own(s, 'bo'); own(s, 'cuu');
  const { all } = asked(s);
  const o = all.find(x => x.items.sua || x.items.len);
  assert.ok(o);
  const price = Object.entries(o.items).reduce((t, [k, n]) => t + sellPrice(k) * n, 0);
  assert.equal(o.coins, Math.round(price * ORDERS.rewardMul));
  assert.ok(o.exp > 0);
});

test('giao đơn sữa trừ sữa trong kho và trả thưởng', () => {
  const s = newGame();
  s.orders = [{ id: 901, who: 'Bà Tư', items: { sua: 3 }, coins: 192, exp: 4 }];
  s.inv.sua = 3; const c = s.coins;
  assert.equal(G.fulfillOrder(s, 901).ok, true);
  assert.equal(s.coins, c + 192);
  assert.equal(s.inv.sua ?? 0, 0);
});
