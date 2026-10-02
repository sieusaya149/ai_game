// Chạng vạng về chuồng, con lạc, rải thóc, đếm con đã về (issue 42, ADR 0013), qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { FREE, DAY_MS } from '../public/data.js';
import { mapOf } from '../public/farm.js';

const MIN = 60_000;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const seeded = (seed, fn) => {
  const r = Math.random; let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = r; }
};
const NOON = DAY_MS * 0.3, DUSK = DAY_MS * FREE.duskAt;   // 13h12 và 18h
const newGame = (weather = 'sun') => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.time = NOON; s.weather = weather; s.coins = 1e6; return s; };
const hen = (s, extra) => {
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type: 'ga', name: 'Gà', stage: 'truong', age: G.stageStart('ga', 'truong'), nextProduct: 1e15, ready: false, sex: 'f', ...extra };
  s.animals.push(a);
  return a;
};
const feed = s => { for (const k of Object.keys(s.troughs)) s.troughs[k] = 20; for (const a of s.animals) { a.hunger = 100; a.sick = 0; } };
const run = (s, ms) => { for (let t = 0; t < ms; t += 5000) { feed(s); G.tick(s, Math.min(5000, ms - t)); } };
// Dựng đàn n con đang thả rông lúc 17h59, rồi chạy qua 18h một chút. Mỗi con có tuỳ chỉnh extra(i).
function evening(seed, n, { weather = 'sun', extra = () => ({}) } = {}) {
  const s = newGame(weather);
  const hens = Array.from({ length: n }, (_, i) => hen(s, extra(i)));
  seeded(seed, () => { run(s, 2 * MIN); s.time = DUSK - MIN; run(s, 30_000); });
  for (const a of hens.filter(a => !a.tile)) { hens.splice(hens.indexOf(a), 1); s.animals.splice(s.animals.indexOf(a), 1); }   // bỏ con ốm đúng lúc
  seeded(seed + 1000, () => run(s, 2 * MIN + 30_000));
  return { s, hens };
}

test('mốc về chuồng đúng 18h: 17h59 cả đàn còn ngoài vườn, qua 18h thì chỉ còn con lạc', () => {
  const s = newGame();
  const hens = Array.from({ length: 10 }, () => hen(s));
  seeded(4, () => { run(s, 2 * MIN); s.time = DUSK - 10_000; run(s, 5000); });
  assert.equal(G.isDusk(s), false, '17h59 chưa tới giờ về chuồng');
  assert.ok(hens.filter(a => a.tile).length >= 8, 'còn đang thả rông');
  s.time = DUSK + 1000;
  seeded(5, () => run(s, 5000));
  assert.equal(G.isDusk(s), true);
  assert.ok(hens.filter(a => a.tile).length <= 3);
});

test('qua 18h phần lớn gà về chuồng, mỗi tối lạc 1-3 con, con lạc ngủ ngoài', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { s, hens } = evening(seed, 10);
    const out = hens.filter(a => a.tile);
    assert.ok(out.length >= 1 && out.length <= 3, `seed ${seed}: lạc ${out.length}`);
    assert.ok(out.every(a => a.stray), 'con lạc đánh dấu ngủ ngoài');
    assert.equal(G.strays(s).length, out.length);
    assert.ok(hens.length - out.length >= 7, 'phần lớn đã về');
    assert.ok(hens.filter(a => !a.tile).every(a => !a.stray));
    assert.ok(s.animals.filter(a => a.tile).length <= FREE.max);
  }
});

test('con ❤️ thấp, con non, con xa chuồng dễ lạc hơn', () => {
  const stat = (extra, pick) => { let n = 0, m = 0; for (let seed = 1; seed <= 60; seed++) { const { hens } = evening(seed, 10, { extra }); for (const a of hens) if (pick(a)) { m++; if (a.tile) n++; } } return n / m; };
  const low = stat(i => ({ bond: i < 5 ? 1 : 5 }), a => a.bond === 1), high = stat(i => ({ bond: i < 5 ? 1 : 5 }), a => a.bond === 5);
  assert.ok(low > high * 1.5, `❤️ thấp ${low} vs cao ${high}`);
  const young = i => (i < 5 ? { stage: 'nho', age: G.stageStart('ga', 'nho') } : {}), baby = stat(young, a => a.stage === 'nho'), adult = stat(young, a => a.stage === 'truong');
  assert.ok(baby > adult * 1.15, `nhỡ ${baby} vs lớn ${adult}`);
});

test('con ở xa cửa chuồng dễ lạc hơn con ở gần', () => {
  const s0 = newGame(), g = mapOf(s0).penList[0].gates[0];
  let near = 0, far = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const s = newGame(), a = hen(s), b = hen(s);
    for (let i = 0; i < 4; i++) hen(s);
    seeded(seed, () => run(s, MIN));
    a.tile = { c: g[0], r: g[1] - 1 }; b.tile = { c: g[0] + 12, r: g[1] + 12 };
    s.time = DUSK; seeded(seed, () => run(s, 3000));
    if (a.tile) near++; if (b.tile) far++;
  }
  assert.ok(far > near * 1.5, `xa ${far} vs gần ${near}`);
});

test('đêm mưa bão lạc nhiều hơn rõ rệt, vẫn không quá 30 con thả rông', () => {
  let sun = 0, storm = 0;
  for (let seed = 1; seed <= 10; seed++) {
    sun += evening(seed, 20).hens.filter(a => a.tile).length;
    storm += evening(seed, 20, { weather: 'rain' }).hens.filter(a => a.tile).length;
  }
  assert.ok(storm >= sun * 2, `bão ${storm} vs thường ${sun}`);
  assert.ok(storm / 10 <= FREE.max);
});

test('chạy bù một đêm không con nào chết, con lạc được đánh dấu ngủ ngoài', () => {
  const s = newGame();
  for (let i = 0; i < 8; i++) hen(s);
  seeded(7, () => { run(s, 2 * MIN); s.time = DUSK - MIN; run(s, 30_000); });
  const before = s.animals.length;
  seeded(8, () => { for (let t = 0; t < 4 * MIN; t += 1000) { feed(s); G.tick(s, 1000); } });   // chạy liền 4 phút giữa đêm
  assert.equal(s.animals.length, before);
  assert.ok(G.strays(s).length >= 1 && G.strays(s).every(a => a.stray));
});

test('sáng ra con lạc đi kiếm ăn lại bình thường', () => {
  const { s } = evening(3, 10);
  assert.ok(G.strays(s).length >= 1);
  s.time = DAY_MS * 2 + MIN; seeded(9, () => run(s, 30_000));
  assert.equal(G.strays(s).length, 0);
  assert.ok(s.animals.every(a => !a.stray));
});

test('rải thóc: trừ 1 bao cám, con trong 5 ô vào chuồng, con ngoài 5 ô không vào, báo số đã về', () => {
  const { s, hens } = evening(5, 10, { weather: 'rain' });
  const pen = mapOf(s).penList[0], g = pen.gates[0], gate = { kind: 'gate', id: pen.id };
  const out = hens.filter(a => a.tile);
  assert.ok(out.length >= 4);
  out[0].tile = { c: g[0], r: g[1] - 3 };
  out[1].tile = { c: g[0] + 4, r: g[1] - 2 };
  out[2].tile = { c: g[0] + 15, r: g[1] + 14 };   // xa hơn 5 ô
  s.inv.feed_ga = 3;
  const was = G.penHome(s, pen.id);
  const r = G.perform(s, gate, 'scatter');
  assert.equal(r.ok, true, r.msg);
  assert.equal(s.inv.feed_ga, 2);
  assert.equal(out[0].tile, null); assert.equal(out[1].tile, null); assert.ok(out[2].tile);
  assert.equal(out[0].stray, false);
  assert.ok(G.penHome(s, pen.id).home > was.home);
  assert.equal(G.penHome(s, pen.id).total, 10);
});

test('rải thóc bị từ chối khi hết cám', () => {
  const { s } = evening(5, 10);
  const pen = mapOf(s).penList[0];
  s.inv.feed_ga = 0; s.basket = {};
  const act = G.actionsFor(s, { kind: 'gate', id: pen.id }).find(a => a.id === 'scatter');
  assert.ok(act.disabled);
  const r = G.perform(s, { kind: 'gate', id: pen.id }, 'scatter');
  assert.equal(r.ok, false);
  assert.ok(G.strays(s).length >= 1);
});

test('world báo con đã qua cửa chuồng: con lạc được ghi là đã về, số "đã về" tăng', () => {
  const { s, hens } = evening(6, 10);
  const pen = mapOf(s).penList[0], a = hens.find(h => h.tile), before = G.penHome(s, pen.id).home;
  assert.equal(G.passGate(s, a.id), true);
  assert.equal(a.tile, null); assert.equal(a.stray, false);
  assert.equal(G.penHome(s, pen.id).home, before + 1);
  assert.equal(G.passGate(s, a.id), false, 'đã về rồi thì không tính lại');
});
