import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { penIdOf } from './helpers/troughs.mjs';
import { ANIMALS, TRADE, WEIGHT, pigKgPrice } from '../public/data.js';

const MIN = 60_000;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };
const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e15; s.animals = []; return s; };
const put = (s, type, stage, extra) => {
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type, name: ANIMALS[type].name, stage, age: G.stageStart(type, stage), nextProduct: 0, ready: false, ...extra };
  s.animals.push(a);
  return a;
};

test('giá bán theo loài, giai đoạn và độ thân; bệnh hoặc dơ thì rẻ hơn', () => {
  const s = newGame(), q = a => G.sellQuote(s, a).price;
  const bo = put(s, 'bo', 'truong', { bond: 2 });
  assert.equal(q(bo), ANIMALS.bo.sell);
  assert.equal(q(put(s, 'bo', 'nho', { bond: 2 })), Math.floor(ANIMALS.bo.sell * TRADE.stageMul.nho));
  assert.ok(q(put(s, 'bo', 'truong', { bond: 5 })) > q(bo));
  assert.ok(q(put(s, 'bo', 'truong', { bond: 1 })) < q(bo));
  assert.ok(q(put(s, 'bo', 'truong', { sick: 1 })) < q(bo));
  assert.ok(q(put(s, 'bo', 'truong', { dirty: 100 })) < q(bo));
  const r = G.perform(s, { kind: 'animal', id: bo.id }, 'sell');
  assert.equal(r.ok, true);
  assert.ok(r.sold && r.sold.price === ANIMALS.bo.sell);
});

test('heo bán theo số ký × giá chợ hôm đó', () => {
  const s = newGame(), pig = put(s, 'heo', 'truong', { bond: 2, weight: 80 });
  s.day = 3; const p3 = pigKgPrice(3); s.day = 5;
  assert.notEqual(pigKgPrice(3), pigKgPrice(4));   // giá heo hơi đổi theo ngày
  s.day = 3;
  const q = G.sellQuote(s, pig);
  assert.equal(q.kg, 80); assert.equal(q.unit, p3); assert.equal(q.price, 80 * p3);
  const coins = s.coins, r = G.sellAnimal(s, pig.id);
  assert.equal(r.ok, true); assert.equal(s.coins, coins + 80 * p3);
});

test('heo ăn no, ít vận động tăng cân nhanh hơn heo hay vận động', () => {
  const s = newGame(), lazy = put(s, 'heo', 'nho', { weight: 20, hunger: 100 }), busy = put(s, 'heo', 'nho', { weight: 20, hunger: 100 });
  s.troughs[penIdOf(G, s, 'pig')] = 20;
  for (let i = 0; i < 20; i++) {
    busy.walk = TRADE.walkPx * 1; lazy.walk = 0;   // 1 giây một bước, đi liên tục vs đứng yên
    lazy.hunger = busy.hunger = 100;
    quiet(() => G.tick(s, 1000));
  }
  assert.ok(lazy.weight > busy.weight, `${lazy.weight} > ${busy.weight}`);
  assert.ok(busy.weight > 20);
  assert.ok(lazy.weight <= WEIGHT.heo[1]);
});

test('bán con ❤️4+ cần hai lần xác nhận, thiếu thì từ chối', () => {
  const s = newGame(), a = put(s, 'bo', 'truong', { bond: 4 });
  for (const n of [0, 1]) { const r = G.sellAnimal(s, a.id, n); assert.equal(r.ok, false); }
  assert.equal(s.animals.length, 1);
  assert.equal(G.perform(s, { kind: 'animal', id: a.id }, 'sell').ok, false);
  const coins = s.coins, r = G.sellAnimal(s, a.id, 2);
  assert.equal(r.ok, true);
  assert.equal(s.animals.length, 0);
  assert.equal(s.coins, coins + r.coins);
  const low = put(s, 'bo', 'truong', { bond: 3 });
  assert.equal(G.sellAnimal(s, low.id, 0).ok, true);
});

test('con non chưa bán được; sau khi bán chuồng trống thêm chỗ', () => {
  const s = newGame(), baby = put(s, 'ga', 'non');
  assert.equal(G.sellAnimal(s, baby.id, 5).ok, false);
  assert.equal(s.animals.length, 1);
  const hen = put(s, 'ga', 'truong'), n = s.animals.length;
  G.sellAnimal(s, hen.id);
  assert.equal(s.animals.length, n - 1);
});

test('chỉ con già nghỉ hưu được; nghỉ hưu thì không cho sản phẩm, cả chuồng vui hơn, vẫn chiếm chỗ', () => {
  const s = newGame(), young = put(s, 'bo', 'truong'), old = put(s, 'bo', 'gia', { bond: 2 });
  assert.equal(G.retireAnimal(s, young.id).ok, false);
  assert.equal(G.perform(s, { kind: 'animal', id: old.id }, 'retire').ok, true);
  assert.equal(old.retired, true);
  assert.equal(G.animalCan(old, 'product'), false);
  assert.equal(s.animals.length, 2);
  young.happy = 50; young.hunger = 100; old.hunger = 100;
  quiet(() => G.tick(s, 5 * MIN));
  assert.ok(young.happy >= TRADE.retireHappy - 1, `${young.happy}`);
  assert.equal(old.ready, false);
  const other = newGame(), calm = put(other, 'bo', 'truong', { happy: 50, hunger: 100 });
  quiet(() => G.tick(other, 5 * MIN));
  assert.ok(calm.happy < TRADE.retireHappy);
});
