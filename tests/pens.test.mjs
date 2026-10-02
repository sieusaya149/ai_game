// Chuồng 3 cấp, nhiều chuồng cùng loại, chuồng cách ly, chuồng chó (issue 35), qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../public/state.js';
import { levelInfo } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

// Người chơi cấp lv (đủ exp), có coins xu
const game = (lv = 1, coins = 100000) => {
  const s = G.createGame({ name: 'Chủ trại' });
  s.coins = coins; s.exp = 0;
  s.farm.owned = { c: 10, r: 8, w: 50, h: 38 }; G.bumpLayout?.(s); s.farm.rev++;   // đất rộng cho thoải mái đặt chuồng
  while (levelInfo(s.exp).level < lv) s.exp += 50;
  return s;
};
const pensOf = (s, type) => s.farm.ents.filter(e => e.kind === 'pen' && e.pen === type);
const addPen = (s, pen, c, r) => { const x = G.placeEntity(s, { kind: 'pen', pen }, c, r); assert.equal(x.ok, true, x.msg); return s.farm.ents.find(e => e.id === x.id); };
const caps = (s, e) => { const out = [G.penCapOf(e)]; for (let i = 0; i < 2; i++) { assert.equal(G.upgradePen(s, e.id).ok, true); out.push(G.penCapOf(e)); } return out; };

test('chuồng gà có sẵn là cấp 1, chứa 6 / 12 / 18 qua ba cấp', () => {
  const s = game(10);
  const e = pensOf(s, 'chicken')[0];
  assert.equal(G.penLv(e), 1);
  assert.deepEqual(caps(s, e), [6, 12, 18]);
});

test('sức chứa heo 3/5/8, đồng cỏ 3/6/9, cách ly 1/2/3', () => {
  const s = game(10);
  assert.deepEqual(caps(s, addPen(s, 'pig', 46, 10)), [3, 5, 8]);
  assert.deepEqual(caps(s, addPen(s, 'pasture', 46, 20)), [3, 6, 9]);
  assert.deepEqual(caps(s, addPen(s, 'quarantine', 46, 30)), [1, 2, 3]);
});

test('nâng cấp: trừ đúng xu, con vật giữ nguyên', () => {
  const s = game(10, 1000);
  const e = pensOf(s, 'chicken')[0], before = s.animals.map(a => ({ id: a.id, x: a.x, y: a.y, pen: a.pen }));
  assert.equal(G.upgradeInfo(s, e.id).price, 300);
  const r = G.upgradePen(s, e.id);
  assert.equal(r.ok, true); assert.equal(r.lv, 2);
  assert.equal(s.coins, 700); assert.equal(e.lv, 2);
  assert.deepEqual(s.animals.map(a => ({ id: a.id, x: a.x, y: a.y, pen: a.pen })), before);
  assert.equal(G.mapOf(s).pens.chicken.lv, 2, 'bản đồ dựng lại theo cấp mới');
});

test('nâng cấp bị từ chối: thiếu xu, thiếu cấp người chơi, đã tối đa', () => {
  const poor = game(10, 100), e = pensOf(poor, 'chicken')[0];
  const r = G.upgradePen(poor, e.id);
  assert.equal(r.ok, false); assert.equal(r.reason, 'coins'); assert.equal(poor.coins, 100); assert.equal(e.lv, undefined);
  const low = game(1, 5000), e1 = pensOf(low, 'chicken')[0];
  const r2 = G.upgradePen(low, e1.id);
  assert.equal(r2.ok, false); assert.equal(r2.reason, 'level'); assert.match(r2.msg, /cấp 2/); assert.equal(low.coins, 5000);
  const top = game(10, 1e6), e3 = pensOf(top, 'chicken')[0];
  caps(top, e3);
  assert.equal(G.upgradePen(top, e3.id).reason, 'max');
  assert.equal(G.upgradeInfo(top, e3.id), null);
});

test('chuồng chó nâng được 3 cấp', () => {
  const s = game(10, 1e5), d = s.farm.ents.find(e => e.kind === 'doghouse');
  assert.equal(G.upgradePen(s, d.id).ok, true); assert.equal(G.upgradePen(s, d.id).ok, true);
  assert.equal(d.lv, 3); assert.equal(G.upgradePen(s, d.id).reason, 'max');
  assert.equal(G.mapOf(s).building('doghouse').ent.lv, 3);
});

test('số chuồng mỗi loại giới hạn theo cấp người chơi', () => {
  const s = game(1), id = pensOf(s, 'chicken')[0].id;
  const r = G.canPlace(s, { kind: 'pen', pen: 'chicken' }, 46, 20);
  assert.equal(r.ok, false); assert.equal(r.reason, 'max_pens'); assert.match(r.msg, /cấp 4/);
  assert.equal(G.placeEntity(s, { kind: 'pen', pen: 'chicken' }, 46, 20).reason, 'max_pens');
  const hi = game(G.penNextLevel(s, 'chicken'));
  assert.equal(G.penLimit(hi, 'chicken'), 2);
  const second = addPen(hi, 'chicken', 44, 20);
  assert.notEqual(second.id, id);
  assert.equal(pensOf(hi, 'chicken').length, 2);
  assert.equal(G.canPlace(hi, { kind: 'pen', pen: 'chicken' }, 44, 32).reason, 'max_pens', 'cấp 4 chỉ được 2 chuồng gà');
});

test('chuồng cách ly chỉ xây được từ cấp 3 của người chơi', () => {
  const lo = game(2);
  const r = G.placeEntity(lo, { kind: 'pen', pen: 'quarantine' }, 46, 30);
  assert.equal(r.ok, false); assert.equal(r.reason, 'level'); assert.match(r.msg, /cấp 3/);
  assert.equal(G.penLevel('quarantine'), 3);
  const ok = game(3);
  assert.equal(addPen(ok, 'quarantine', 46, 30).pen, 'quarantine');
});

test('chuồng mới đi qua hàm kiểm tra vị trí: chồng lấn, ngoài đất, chặn đường tới cửa chuồng', () => {
  const s = game(10);
  assert.equal(G.canPlace(s, { kind: 'pen', pen: 'quarantine' }, 22, 16).reason, 'overlap');
  assert.equal(G.canPlace(s, { kind: 'pen', pen: 'quarantine' }, 8, 24).reason, 'outside');
  // sát mép trên của đất: cửa chuồng quay vào rừng, không ai tới được
  const top = G.canPlace(s, { kind: 'pen', pen: 'pig' }, 46, 8);
  assert.equal(top.ok, false); assert.equal(top.reason, 'blocks_path'); assert.match(top.msg, /chặn mất đường/i);
  assert.equal(G.placeEntity(s, { kind: 'pen', pen: 'pig' }, 46, 8).reason, 'blocks_path');
  assert.equal(G.canPlace(s, { kind: 'pen', pen: 'pig' }, 46, 10).ok, true);
});

test('mua con vật khi chuồng đầy bị từ chối, nâng cấp xong mua tiếp được', () => {
  const s = game(10);
  while (G.penCount(s, 'chicken') < 6) assert.equal(G.buyAnimal(s, 'ga').ok, true);
  const coins = s.coins, n = s.animals.length;
  const r = G.buyAnimal(s, 'ga');
  assert.equal(r.ok, false); assert.equal(r.reason, 'full'); assert.match(r.msg, /chật/);
  assert.equal(s.coins, coins); assert.equal(s.animals.length, n);
  assert.equal(G.upgradePen(s, pensOf(s, 'chicken')[0].id).ok, true);
  assert.equal(G.buyAnimal(s, 'ga').ok, true);
  assert.equal(G.penCount(s, 'chicken'), 7);
});

test('sức chứa tính cả con thả rông (có ô đang đứng)', () => {
  const s = game(10);
  while (G.penCount(s, 'chicken') < 6) G.buyAnimal(s, 'ga');
  for (const a of s.animals) a.tile = { c: 30, r: 28 };   // thả hết ra ngoài ban ngày
  assert.equal(G.buyAnimal(s, 'ga').reason, 'full');
});

test('con mua thêm được xếp vào chuồng còn chỗ', () => {
  const s = game(4);
  const a = pensOf(s, 'chicken')[0], b = addPen(s, 'chicken', 44, 20);
  while (G.penUse(s, a.id) < 6) assert.equal(G.buyAnimal(s, 'ga').ok, true);
  const before = s.animals.length;
  assert.equal(G.buyAnimal(s, 'ga').ok, true);
  assert.equal(s.animals.length, before + 1);
  assert.equal(G.penUse(s, a.id), 6);
  assert.equal(G.penUse(s, b.id), 1);
  const p = s.animals.at(-1), area = G.mapOf(s).penById[b.id].area;
  assert.ok(p.x >= area.x && p.x <= area.x + area.w && p.y >= area.y && p.y <= area.y + area.h, 'đứng trong chuồng mới');
});

test('chuồng cách ly nhận mọi loài, mỗi chỗ một con', () => {
  const s = game(10);
  const q = addPen(s, 'quarantine', 46, 30), chicken = s.animals.find(a => a.type === 'ga');
  const pig = addPen(s, 'pig', 46, 10);
  G.buyAnimal(s, 'heo');
  const heo = s.animals.find(a => a.type === 'heo');
  assert.equal(G.moveAnimal(s, chicken.id, q.id).ok, true);
  assert.equal(chicken.pen, q.id);
  const full = G.moveAnimal(s, heo.id, q.id);
  assert.equal(full.ok, false); assert.equal(full.reason, 'full');
  assert.equal(G.moveAnimal(s, chicken.id, pig.id).reason, 'species');
  assert.equal(G.penCount(s, 'chicken'), s.animals.filter(a => a.type === 'ga').length - 1, 'con trong cách ly không chiếm chỗ chuồng gà');
  assert.equal(G.moveAnimal(s, chicken.id, pensOf(s, 'chicken')[0].id).ok, true);
});

test('dời chuồng: chỉ con trong chuồng đó đi theo', () => {
  const s = game(4);
  const a = pensOf(s, 'chicken')[0], b = addPen(s, 'chicken', 44, 20);
  while (G.penUse(s, a.id) < 6) G.buyAnimal(s, 'ga');
  G.buyAnimal(s, 'ga');
  const inB = s.animals.find(x => x.pen === b.id), xs = s.animals.filter(x => x.pen === a.id).map(x => x.x), bx = inB.x;
  assert.equal(G.moveEntity(s, b.id, 44, 21).ok, true);
  assert.equal(inB.x, bx); assert.equal(s.animals.find(x => x.pen === b.id).y > 0, true);
  assert.deepEqual(s.animals.filter(x => x.pen === a.id).map(x => x.x), xs);
});

test('bản lưu v2 lên v3: chuồng thành cấp 1, không con nào ra khỏi chuồng (kể cả quá sức chứa cũ)', () => {
  const fx = JSON.parse(readFileSync(new URL('./fixtures/v2-farm.json', import.meta.url), 'utf8'));
  fx.savedAt = Date.now();
  store['nongtrai-save-v2'] = JSON.stringify(fx);
  const s = G.loadGame();
  const pens = s.farm.ents.filter(e => e.kind === 'pen');
  assert.ok(pens.length >= 1);
  assert.ok(pens.every(e => G.penLv(e) === 1));
  const before = fx.animals.length;
  assert.equal(s.animals.length, before, 'không mất con nào');
  for (const a of s.animals) {
    const p = G.animalPen(s, a);
    assert.ok(p, `con ${a.id} có chuồng`);
    assert.equal(p.ent.id, a.pen);
  }
});
