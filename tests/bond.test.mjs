import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { ANIMALS, BOND, itemName, sellPrice } from '../public/data.js';

const MIN = 60_000;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };
const quiet = fn => withRandom(0.99, fn);
const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e15; s.animals = []; return s; };
const put = (s, type, stage, extra) => {
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type, name: ANIMALS[type].name, stage, age: G.stageStart(type, stage), nextProduct: 0, ready: false, ...extra };
  s.animals.push(a);
  return a;
};
const act = (s, a, id) => { s.inv.feed_ga = s.inv.hay = s.inv.medicine = 9; return G.perform(s, { kind: 'animal', id: a.id }, id); };

test('con vật mới có ❤️2; cho ăn tận tay và vuốt ve làm tăng, kẹp trong 1–5', () => {
  const s = newGame(), a = put(s, 'bo', 'truong');
  assert.equal(a.bond, 2);
  for (let i = 0; i < 40; i++) { s.day++; act(s, a, 'pet'); act(s, a, 'feed'); a.hunger = 50; }
  assert.equal(a.bond, 5);
  assert.ok(a.bondXp <= BOND.perHeart);
  const r = act(s, put(s, 'ga', 'truong', { bond: 1 }), 'pet');
  assert.equal(r.bond, 1 + (BOND.gain.pet >= BOND.perHeart ? 1 : 0));
});

test('mỗi cách chỉ tăng tối đa perDay lần mỗi ngày; qua ngày được tăng lại', () => {
  const s = newGame(), a = put(s, 'ga', 'truong', { bond: 1, bondXp: 0 });
  const total = () => (a.bond - 1) * BOND.perHeart + a.bondXp;
  for (let i = 0; i < 10; i++) G.addBond(s, a, 'pet');
  assert.equal(total(), BOND.gain.pet * BOND.perDay.pet);
  for (let i = 0; i < 10; i++) { act(s, a, 'feed'); a.hunger = 50; }
  assert.equal(total(), BOND.gain.pet * BOND.perDay.pet + BOND.gain.feed * BOND.perDay.feed);
  const t = total(); s.day++;
  G.addBond(s, a, 'pet');
  assert.equal(total(), t + BOND.gain.pet);
  assert.equal(G.addBond(s, a, 'lạ'), 0);
});

test('tắm và chữa bệnh cộng độ thân qua addBond; thuốc thú y cũng tính', () => {
  const s = newGame(), a = put(s, 'heo', 'truong', { bond: 1, bondXp: 0 });
  assert.equal(G.addBond(s, a, 'bath'), BOND.gain.bath);
  assert.equal(G.addBond(s, a, 'cure'), BOND.gain.cure);
  const b = put(s, 'heo', 'truong', { bond: 1, bondXp: 0, sick: 1 });
  act(s, b, 'medicine');
  assert.equal(b.bondXp, BOND.gain.cure);
});

test('đói hay dơ lâu thì giảm độ thân, không dưới ❤️1', () => {
  const s = newGame(), a = put(s, 'ga', 'truong', { bond: 2, bondXp: 0, hunger: 0 });
  quiet(() => G.tick(s, 5 * MIN));
  assert.equal(a.bond, 1);
  assert.ok(a.bondXp > 0 && a.bondXp < BOND.perHeart);
  quiet(() => G.tick(s, 60 * MIN));
  assert.equal(a.bond, 1); assert.equal(a.bondXp, 0);
  const d = put(s, 'ga', 'truong', { bond: 3, bondXp: 0, hunger: 100, dirty: 90 });
  d.hunger = 100; quiet(() => G.tick(s, 2 * MIN));
  assert.ok(d.bond < 3 || d.bondXp < 0.01 + 0);
  const c = put(s, 'ga', 'truong', { bond: 3, bondXp: 10, hunger: 100, dirty: 10 });
  quiet(() => G.tick(s, MIN));
  assert.equal(c.bond, 3); assert.equal(c.bondXp, 10);
});

test('❤️3 tăng tỉ lệ sản phẩm sao (thống kê, hạt giống cố định)', () => {
  const rate = bond => {
    const s = newGame(), a = put(s, 'cuu', 'truong', { bond, happy: 50 });
    let seed = 7, star = 0;
    const r = Math.random; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    try {
      for (let i = 0; i < 2000; i++) { s.basket = {}; a.ready = true; G.perform(s, { kind: 'animal', id: a.id }, 'shear'); if (s.basket.len_xoan) star++; }
    } finally { Math.random = r; }
    return star / 2000;
  };
  const lo = rate(2), hi = rate(3);
  assert.ok(Math.abs(lo - BOND.star.base) < 0.03, `lo=${lo}`);
  assert.ok(Math.abs(hi - (BOND.star.base + BOND.star.heart3)) < 0.03, `hi=${hi}`);
});

test('sữa bò ngon hơn khi vuốt ve nhiều ngày liền; lông xoăn cừu khi cừu vui', () => {
  const s = newGame(), bo = put(s, 'bo', 'truong', { bond: 2 }), cuu = put(s, 'cuu', 'truong', { bond: 2, happy: 50 });
  const p0 = G.starChance(s, bo);
  for (let i = 0; i < 3; i++) { s.day++; act(s, bo, 'pet'); }
  assert.ok(Math.abs(G.starChance(s, bo) - (p0 + 3 * BOND.star.petStreak)) < 1e-9);
  s.day += 3;   // bỏ bê vài ngày thì mất chuỗi
  assert.equal(G.starChance(s, bo), p0);
  const c0 = G.starChance(s, cuu); cuu.happy = 90;
  assert.ok(G.starChance(s, cuu) > c0);
  // chắc chắn ra sao thì được sản phẩm sao, giá cao hơn
  withRandom(0, () => { bo.ready = true; act(s, bo, 'milk'); });
  assert.equal(s.basket.sua_ngon, 1);
  assert.ok(itemName('sua_ngon') && sellPrice('sua_ngon') > sellPrice('sua'));
  withRandom(0.99, () => { bo.ready = true; act(s, bo, 'milk'); });
  assert.equal(s.basket.sua, 1);
});

test('❤️4 giảm nguy cơ bệnh; ❤️3 chưa giảm', () => {
  assert.equal(G.sickFactor({ bond: 3 }), 1);
  assert.equal(G.sickFactor({ bond: 4 }), BOND.sickMul);
  assert.equal(G.sickFactor({ bond: 5 }), BOND.sickMul);
  // (con dơ, tức bị bỏ bê) xác suất bệnh thật sự thấp hơn: random 1e-4 (tick chia bước 1 giây) làm con ❤️1 bệnh nhưng con ❤️4 thì không
  const sick = bond => { const s = newGame(), a = put(s, 'ga', 'truong', { bond, dirty: 65 }); withRandom(1e-4, () => G.tick(s, MIN)); return !!a.sick; };
  assert.equal(sick(1), true); assert.equal(sick(4), false);
});

test('❤️5 sống lâu hơn 10%: mốc già và mốc ra đi đến muộn hơn 10%', () => {
  const gia = G.stageStart('ga', 'gia'), end = G.lifeEnd('ga');
  assert.equal(G.lifeMarks({ type: 'ga', bond: 4 }).gia, gia);
  assert.ok(Math.abs(G.lifeMarks({ type: 'ga', bond: 5 }).gia - gia * 1.1) < 1e-6);
  assert.ok(Math.abs(G.lifeMarks({ type: 'ga', bond: 5 }).end - end * 1.1) < 1e-6);
  const s = newGame();
  const a = put(s, 'ga', 'truong', { bond: 5, age: gia + 1000 }), b = put(s, 'ga', 'truong', { bond: 4, age: gia + 1000 });
  quiet(() => G.tick(s, MIN));
  assert.equal(a.stage, 'truong'); assert.equal(b.stage, 'gia');
  const c = put(s, 'ga', 'gia', { bond: 5, age: end + 1000 }), d = put(s, 'ga', 'gia', { bond: 5, age: end * 1.1 + 1000 });
  quiet(() => G.tick(s, MIN));
  assert.ok(s.animals.includes(c)); assert.ok(!s.animals.includes(d));
});

test('bondPerk: ❤️4 chạy lại, ❤️5 đi theo', () => {
  assert.deepEqual(G.bondPerk({ bond: 3 }), { runTo: false, follow: false });
  assert.deepEqual(G.bondPerk({ bond: 4 }), { runTo: true, follow: false });
  assert.deepEqual(G.bondPerk({ bond: 5 }), { runTo: true, follow: true });
});
