// Gà thả rông ban ngày, hàng rào thấp, trứng trong bụi (issue 41, ADR 0013), qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { FREE, ANIMALS, DAY_MS, MAX_CATCHUP_MS, ITEMS } from '../public/data.js';
import { GROUND } from '../public/layout.js';
import { mapOf } from '../public/farm.js';

const MIN = 60_000, HOUR = 60 * MIN;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
// Math.random có hạt giống cố định (mulberry32) để thống kê lặp lại được
const seeded = (seed, fn) => {
  const r = Math.random; let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = r; }
};
const NOON = DAY_MS * 0.3;   // 13h12: ban ngày
const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.time = NOON; s.coins = 1e6; return s; };
const hen = (s, stage = 'truong', extra) => {
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type: 'ga', name: 'Gà', stage, age: G.stageStart('ga', stage), nextProduct: 1e15, ready: false, sex: 'f', ...extra };
  s.animals.push(a);
  return a;
};
const feed = s => { for (const k of Object.keys(s.troughs)) s.troughs[k] = 20; for (const a of s.animals) a.hunger = 100; };
const run = (s, ms) => { const ev = []; for (let t = 0; t < ms; t += 5000) { feed(s); ev.push(...G.tick(s, Math.min(5000, ms - t))); } return ev; };
const fieldTiles = s => s.farm.ents.filter(e => e.kind === 'field').flatMap(e => [0, 1, 2].flatMap(dr => [0, 1, 2].map(dc => ({ c: e.c + dc, r: e.r + dr }))));
const plant = (s, over) => { for (const p of s.plots) p.crop = { id: 'cai', progress: 0.5, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, ...over }; };

test('ban ngày gà thả rông có ô hợp lệ: không trong nhà, chuồng, ngoài đất; ban đêm về chuồng', () => {
  const s = newGame(), hens = Array.from({ length: 6 }, () => hen(s));
  seeded(1, () => run(s, 3 * MIN));
  const M = mapOf(s);
  for (const a of hens) {
    assert.ok(a.tile, 'có ô');
    const { c, r } = a.tile;
    assert.ok(G.roamOf(s).has(c, r), 'ô trong vùng đi lại');
    assert.equal(M.isSolid(c, r), false, 'không đứng trong công trình');
    assert.ok(M.isOwned(c, r), 'không ngoài cổng');
    assert.ok(!M.penList.some(p => c >= p.rect.c && r >= p.rect.r && c < p.rect.c + p.rect.w && r < p.rect.r + p.rect.h), 'không trong chuồng');
  }
  // chạng vạng: về chuồng
  s.time = DAY_MS * 0.8;
  seeded(2, () => run(s, 5000));
  for (const a of hens) assert.equal(a.tile, null);
});

test('tối đa 30 con thả rông; con thừa ở trong chuồng; gà bệnh và gà ở chuồng cách ly không thả rông', () => {
  const s = newGame();
  for (let i = 0; i < 40; i++) hen(s);
  const sick = hen(s, 'truong', { sick: 1 });
  seeded(3, () => run(s, 2 * MIN));
  assert.equal(s.animals.filter(a => a.tile).length, FREE.max);
  assert.equal(sick.tile, null);
  // chuồng cách ly: đặt một chuồng, chuyển một con tới đó
  s.farm.owned = { c: 10, r: 8, w: 50, h: 38 }; s.farm.rev++;
  s.exp = 1e5;
  const q = G.placeEntity(s, { kind: 'pen', pen: 'quarantine' }, 46, 30);
  assert.equal(q.ok, true, q.msg);
  const out = s.animals.find(a => a.tile);
  assert.equal(G.moveAnimal(s, out.id, q.id).ok, true);
  seeded(4, () => run(s, 2 * MIN));
  assert.equal(out.tile, null);
  assert.ok(s.animals.filter(a => a.tile).length <= FREE.max);
});

test('gà vào ruộng mổ sâu; gà con chưa ăn sâu', () => {
  const s = newGame(); plant(s, { bugs: true, bugSince: 1e12, progress: 0.5 });
  for (let i = 0; i < 30; i++) hen(s, 'nho');
  const total = s.plots.length;
  seeded(5, () => run(s, 4 * MIN));
  const left = s.plots.filter(p => p.crop?.bugs).length;
  assert.ok((s.stats.pecks || 0) > 0 && left < total, `đã mổ sâu: ${s.stats.pecks}, còn ${left}/${total}`);
  const c = newGame(); plant(c, { bugs: true, bugSince: 1e12, progress: 0.5 });
  for (let i = 0; i < 30; i++) hen(c, 'non');
  seeded(5, () => run(c, 4 * MIN));
  assert.equal(c.stats.pecks || 0, 0);
});

test('mổ ruộng mất khoảng 5% hạt vừa gieo (hạt giống cố định)', () => {
  const s = newGame();
  for (let i = 0; i < 30; i++) hen(s, 'truong');
  const field = new Set(fieldTiles(s).map(t => t.c + ',' + t.r));
  let visits = 0, lost = 0;
  seeded(11, () => {
    for (let i = 0; i < 400; i++) {
      plant(s, { progress: 0 });
      const before = new Map(s.animals.map(a => [a.id, a.tileAt]));
      run(s, 15_000);
      for (const a of s.animals) if (a.tileAt !== before.get(a.id) && a.tile && field.has(a.tile.c + ',' + a.tile.r)) visits++;
      lost += s.plots.filter(p => !p.crop).length;
    }
  });
  assert.ok(visits >= 60, `đủ lượt mổ: ${visits}`);
  const rate = lost / visits;
  assert.ok(rate > 0.01 && rate < 0.11, `tỉ lệ mất hạt ${rate.toFixed(3)} (${lost}/${visits})`);
});

test('hàng rào thấp: đặt quanh ruộng qua canPlace, gà không vào ruộng nữa, người vẫn bước qua', () => {
  const s = newGame(), f = s.farm.ents.find(e => e.kind === 'field');
  assert.equal(ITEMS.deco_lowfence.kind, 'deco');
  const ring = [];
  for (let c = f.c - 1; c <= f.c + 3; c++) for (let r = f.r - 1; r <= f.r + 3; r++) if ((c < f.c || c > f.c + 2 || r < f.r || r > f.r + 2) && !((c === f.c - 1 || c === f.c + 3) && (r === f.r - 1 || r === f.r + 3))) ring.push([c, r]);
  const tiles = fieldTiles(s);
  assert.ok(tiles.every(t => G.roamOf(s).has(t.c, t.r)), 'chưa rào thì gà vào được');
  assert.equal(G.placeEntity(s, { kind: 'deco', item: 'deco_lowfence' }, ring[0][0], ring[0][1]).ok, false, 'chưa có hàng rào trong túi');
  s.inv.deco_lowfence = ring.length;
  for (const [c, r] of ring) { const x = G.placeEntity(s, { kind: 'deco', item: 'deco_lowfence' }, c, r); assert.equal(x.ok, true, x.msg); }
  assert.ok(tiles.every(t => !G.roamOf(s).has(t.c, t.r)), 'rào kín thì gà không vào');
  plant(s, { bugs: true, bugSince: 1e12 });
  for (let i = 0; i < 30; i++) hen(s);
  seeded(6, () => run(s, 10 * MIN));
  assert.equal(s.stats.pecks || 0, 0);
  for (const a of s.animals) assert.ok(!tiles.some(t => a.tile && t.c === a.tile.c && t.r === a.tile.r));
  assert.ok(s.plots.some(p => p.crop.bugs), 'sâu còn nguyên, không ai mổ giúp');
  // không chặn đường người chơi
  const M = mapOf(s);
  assert.equal(M.isSolid(ring[0][0], ring[0][1]), false);
  // đặt chồng lên ruộng thì không được (cùng luật vị trí)
  s.inv.deco_lowfence = 1;
  assert.equal(G.placeEntity(s, { kind: 'deco', item: 'deco_lowfence' }, f.c, f.r).ok, false);
});

test('chợ bán hàng rào thấp', () => {
  const s = newGame(); s.exp = 1e4; s.time = DAY_MS * 0.2;
  const r = G.buy(s, 'deco_lowfence', 3);
  assert.equal(r.ok, true, r.msg);
  assert.equal(s.inv.deco_lowfence, 3);
});

test('gà mái thả rông đẻ trứng ở ô cỏ trong vùng đi lại, nhặt được vào kho', () => {
  const s = newGame(), h = hen(s, 'truong', { nextProduct: 0 });
  seeded(7, () => run(s, 2 * MIN));
  const eggs = G.hiddenEggs(s);
  assert.ok(eggs.length >= 1, 'có trứng trong bụi');
  const M = mapOf(s);
  for (const e of eggs) {
    assert.ok(G.roamOf(s).has(e.tile.c, e.tile.r));
    assert.equal(M.ground[e.tile.r * M.mw + e.tile.c], GROUND.GRASS);
    assert.deepEqual([Math.floor(e.x / 16), Math.floor(e.y / 16)], [e.tile.c, e.tile.r]);
  }
  assert.equal(new Set(eggs.map(e => e.tile.c + ',' + e.tile.r)).size, eggs.length, 'mỗi ô một ổ');
  const e = eggs[0], before = s.inv.trung || 0;
  const r = G.perform(s, { kind: 'egg', id: e.id }, 'collect');
  assert.equal(r.ok, true);
  assert.equal(G.hiddenEggs(s).some(x => x.id === e.id), false);
  assert.equal((s.basket.trung || 0) + (s.inv.trung || 0) - before, 1);
  assert.ok(h);
});

test('thả rông vẫn theo luật đực/cái (lát 36): gà trống không đẻ; trứng trong bụi của gà mái có trống thì có thể có phôi, ghi mẹ/cha', () => {
  const s = newGame(), roo = hen(s, 'truong', { sex: 'm', name: 'Trống', nextProduct: 0 }), h = hen(s, 'truong', { name: 'Mái', nextProduct: 0 });
  seeded(11, () => run(s, 40 * MIN));
  const eggs = G.hiddenEggs(s);
  assert.ok(eggs.length >= 2, 'có trứng trong bụi');
  assert.ok(eggs.some(e => e.mom?.id === h.id), 'gà mái đẻ trong bụi');
  assert.ok(eggs.every(e => e.mom && e.mom.id !== roo.id && s.animals.find(a => a.id === e.mom.id)?.sex !== 'm'), 'không trứng nào của gà trống (gà con nở ra lớn lên cũng chỉ mái mới đẻ)');
  const male = id => id === roo.id || s.animals.find(a => a.id === id)?.sex === 'm';
  assert.ok(eggs.every(e => !e.fertile || male(e.dad?.id)), 'trứng có phôi thì cha là gà trống');
  assert.ok(s.animals.some(a => a.mom?.id === h.id && a.dad?.id === roo.id), 'trứng có phôi trong bụi bỏ quên nở ra gà con có đủ mẹ, cha');
});

test('gà ở chuồng (đêm) vẫn đẻ trứng trong chuồng như cũ', () => {
  const s = newGame(); s.time = DAY_MS * 0.85;
  hen(s, 'truong', { nextProduct: 0 });
  seeded(8, () => run(s, 30_000));
  assert.ok(s.eggs.length >= 1);
  assert.equal(G.hiddenEggs(s).length, 0);
});

test('chạy bù nhiều giờ: có trứng trong bụi, không con nào chết', () => {
  const s = newGame(); s.time = DAY_MS * 0.05;
  for (let i = 0; i < 8; i++) hen(s, 'truong', { nextProduct: 0 });
  const ids = s.animals.map(a => a.id);
  s.savedAt = Date.now() - 6 * HOUR;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = seeded(9, () => G.loadGame());
  for (const id of ids) assert.ok(l.animals.some(a => a.id === id), 'không con nào chết');
  assert.ok(G.hiddenEggs(l).length >= 1, 'có trứng trong bụi');
  assert.ok(l.eggs.length <= 30);
  assert.ok(MAX_CATCHUP_MS >= 6 * HOUR);
});

test('bản lưu cũ: gà đang trong chuồng (tile null) chỉ ra ngoài khi sang ban ngày', () => {
  const s = newGame(); s.time = DAY_MS * 0.8;
  const a = hen(s);
  assert.equal(a.tile, null);
  seeded(10, () => run(s, 10_000));
  assert.equal(a.tile, null);
  s.time = DAY_MS - 1000;   // sang ngày mới (6h sáng)
  seeded(10, () => run(s, 10_000));
  assert.ok(a.tile, 'sáng ra thả rông');
});
