// Xe rùa chở con vật sang chuồng khác cùng loại, qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { levelInfo } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const game = (lv = 5) => {
  const s = G.createGame({ name: 'Chủ trại' });
  s.coins = 100000; s.exp = 0;
  s.farm.owned = { c: 10, r: 8, w: 50, h: 38 }; G.bumpLayout?.(s); s.farm.rev++;
  while (levelInfo(s.exp).level < lv) s.exp += 50;
  return s;
};
const pensOf = (s, type) => s.farm.ents.filter(e => e.kind === 'pen' && e.pen === type);
const addPen = (s, pen, c, r) => { const x = G.placeEntity(s, { kind: 'pen', pen }, c, r); assert.equal(x.ok, true, x.msg); return s.farm.ents.find(e => e.id === x.id); };
const setup = () => {
  const s = game(), a = pensOf(s, 'chicken')[0], b = addPen(s, 'chicken', 44, 20);
  return { s, a, b, hen: s.animals.find(x => x.type === 'ga' && x.pen === a.id) };
};

test('mua xe rùa một lần ở chợ, mua lần hai bị từ chối', () => {
  const s = game();
  assert.equal(G.buy(s, 'barrow').ok, true);
  assert.equal(G.haveItem(s, 'barrow'), 1);
  assert.equal(G.buy(s, 'barrow').ok, false);
  assert.equal(G.haveItem(s, 'barrow'), 1);
});

test('có xe rùa: chở con vật sang chuồng khác, giữ nguyên chỉ số, đứng trong chuồng mới', () => {
  const { s, b, hen } = setup();
  G.buy(s, 'barrow');
  hen.bond = 3; hen.hunger = 42;
  const r = G.carryAnimal(s, hen.id, b.id);
  assert.equal(r.ok, true, r.msg);
  assert.equal(hen.pen, b.id);
  assert.equal(hen.bond, 3); assert.equal(hen.hunger, 42);
  const area = G.mapOf(s).penById[b.id].area;
  assert.ok(hen.x >= area.x && hen.x <= area.x + area.w && hen.y >= area.y && hen.y <= area.y + area.h);
});

test('không có xe rùa thì không chở được và không có hành động', () => {
  const { s, b, hen } = setup();
  assert.equal(G.carryAnimal(s, hen.id, b.id).reason, 'no_barrow');
  assert.equal(G.actionsFor(s, { kind: 'animal', id: hen.id }).some(a => a.id === 'barrow'), false);
});

test('danh sách chuồng đích: n/cap, chuồng đầy bị khóa kèm lý do, không có chuồng khác loài', () => {
  const { s, a, b, hen } = setup();
  G.buy(s, 'barrow');
  addPen(s, 'pig', 46, 10);
  let t = G.barrowTargets(s, hen.id);
  assert.deepEqual(t.map(x => x.id), [b.id], 'chỉ chuồng gà khác, không có chuồng heo hay chuồng hiện tại');
  assert.equal(t[0].use, 0); assert.equal(t[0].cap, G.penCapOf(b));
  while (G.penUse(s, b.id) < G.penCapOf(b)) s.animals.push({ ...hen, id: s.nextId++, pen: b.id });
  t = G.barrowTargets(s, hen.id);
  assert.ok(t[0].disabled, 'chuồng đầy có lý do');
  const r = G.carryAnimal(s, hen.id, b.id);
  assert.equal(r.ok, false); assert.equal(r.reason, 'full');
  assert.equal(hen.pen, a.id);
});

test('từ chối chuồng sai loài và chuồng cách ly (cách ly đi đường riêng)', () => {
  const { s, hen } = setup();
  G.buy(s, 'barrow');
  const pig = addPen(s, 'pig', 46, 10), q = addPen(s, 'quarantine', 46, 30);
  assert.equal(G.carryAnimal(s, hen.id, pig.id).reason, 'species');
  assert.equal(G.carryAnimal(s, hen.id, q.id).reason, 'species');
});

test('con bệnh trong cách ly: chở được về chuồng thường qua xe rùa', () => {
  const { s, hen } = setup();
  G.buy(s, 'barrow');
  const q = addPen(s, 'quarantine', 46, 30), home = pensOf(s, 'chicken')[0];
  assert.equal(G.moveAnimal(s, hen.id, q.id).ok, true);
  assert.deepEqual(G.barrowTargets(s, hen.id).map(x => x.id), pensOf(s, 'chicken').map(e => e.id));
  assert.equal(G.carryAnimal(s, hen.id, home.id).ok, true);
  assert.equal(hen.pen, home.id);
});

test('đang thăm vườn người khác thì không chở được', () => {
  const { s, b, hen } = setup();
  G.buy(s, 'barrow');
  s.scene = 'visit'; s.visit = { name: 'Lan' };
  const r = G.carryAnimal(s, hen.id, b.id);
  assert.equal(r.ok, false); assert.equal(r.reason, 'visit');
});

test('chạm con vật có xe rùa: hiện "Chở sang chuồng khác", làm qua perform với penId', () => {
  const { s, b, hen } = setup();
  G.buy(s, 'barrow');
  const act = G.actionsFor(s, { kind: 'animal', id: hen.id }).find(a => a.id === 'barrow');
  assert.ok(act && /Chở sang chuồng khác/.test(act.label));
  const r = G.perform(s, { kind: 'animal', id: hen.id, penId: b.id }, 'barrow');
  assert.equal(r.ok, true, r.msg);
  assert.equal(hen.pen, b.id);
});
