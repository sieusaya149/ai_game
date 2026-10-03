// Xe rùa (tài sản mua một lần): bế con vật lên xe, đẩy tới chuồng cùng loài rồi thả, qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { levelInfo, ITEMS } from '../public/data.js';

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
const dropAct = (s, pen) => G.actionsFor(s, { kind: 'trough', pen: pen.pen, id: pen.id }).find(x => x.id === 'drop');

test('xe rùa là tài sản dùng mãi giá 2500 xu: mua một lần, mua lần hai bị từ chối', () => {
  const s = game();
  assert.equal(ITEMS.barrow.price, 2500);
  const before = s.coins;
  assert.equal(G.buy(s, 'barrow').ok, true);
  assert.equal(s.coins, before - 2500);
  assert.equal(G.buy(s, 'barrow').ok, false);
  assert.equal(G.haveItem(s, 'barrow'), 1);
});

test('chở rồi thả xong xe rùa vẫn còn, dùng lại được', () => {
  const { s, b, hen } = setup();
  G.buy(s, 'barrow');
  assert.equal(G.startCarry(s, hen.id).ok, true);
  assert.equal(G.dropCarry(s, b.id).ok, true);
  assert.equal(G.haveItem(s, 'barrow'), 1);
  assert.equal(G.startCarry(s, hen.id).ok, true);
});

test('bế con vật lên xe: s.carry có con đó, nó vẫn thuộc chuồng cũ và không chạm được trên đất', () => {
  const { s, a, hen } = setup();
  G.buy(s, 'barrow');
  const act = G.actionsFor(s, { kind: 'animal', id: hen.id }).find(x => x.id === 'barrow');
  assert.ok(act && /Chở bằng xe rùa/.test(act.label));
  const r = G.perform(s, { kind: 'animal', id: hen.id }, 'barrow');
  assert.equal(r.ok, true, r.msg);
  assert.equal(s.carry.animalId, hen.id);
  assert.equal(G.carriedAnimal(s), hen);
  assert.equal(hen.pen, a.id, 'giữ chuồng cũ tới khi thả');
  assert.deepEqual(G.actionsFor(s, { kind: 'animal', id: hen.id }), []);
});

test('chưa có xe rùa thì không bế được và không có hành động', () => {
  const { s, hen } = setup();
  assert.equal(G.startCarry(s, hen.id).reason, 'no_barrow');
  assert.equal(G.actionsFor(s, { kind: 'animal', id: hen.id }).some(a => a.id === 'barrow'), false);
});

test('mỗi lúc chở một con: đang chở thì con khác bị khóa', () => {
  const { s, hen } = setup();
  G.buy(s, 'barrow');
  const other = s.animals.find(x => x.id !== hen.id && x.type === 'ga') ?? (s.animals.push({ ...hen, id: s.nextId++ }), s.animals.at(-1));
  assert.equal(G.startCarry(s, hen.id).ok, true);
  assert.equal(G.startCarry(s, other.id).reason, 'busy');
  assert.ok(G.actionsFor(s, { kind: 'animal', id: other.id }).find(a => a.id === 'barrow').disabled);
});

test('chạm máng chuồng cùng loài còn chỗ: có nút thả, con vào chuồng mới giữ chỉ số', () => {
  const { s, b, hen } = setup();
  G.buy(s, 'barrow');
  hen.bond = 3; hen.hunger = 42;
  assert.equal(dropAct(s, b), undefined, 'không chở thì không có nút thả');
  G.startCarry(s, hen.id);
  const act = dropAct(s, b);
  assert.ok(act && !act.disabled && /Thả .* vào chuồng này/.test(act.label), act?.label);
  const r = G.perform(s, { kind: 'trough', pen: b.pen, id: b.id }, 'drop');
  assert.equal(r.ok, true, r.msg);
  assert.equal(s.carry, null);
  assert.equal(hen.pen, b.id);
  assert.equal(hen.bond, 3); assert.equal(hen.hunger, 42);
  const area = G.mapOf(s).penById[b.id].area;
  assert.ok(hen.x >= area.x && hen.x <= area.x + area.w && hen.y >= area.y && hen.y <= area.y + area.h);
});

test('chuồng chật hoặc khác loài thì nút thả bị khóa kèm lý do, con vẫn trên xe', () => {
  const { s, a, b, hen } = setup();
  G.buy(s, 'barrow');
  const pig = addPen(s, 'pig', 46, 10);
  G.startCarry(s, hen.id);
  while (G.penUse(s, b.id) < G.penCapOf(b)) s.animals.push({ ...hen, id: s.nextId++, pen: b.id });
  assert.ok(dropAct(s, b).disabled, 'chật');
  assert.equal(G.dropCarry(s, b.id).reason, 'full');
  assert.ok(pig.pen === 'pig' && (!G.actionsFor(s, { kind: 'trough', pen: 'pig', id: pig.id }).some(x => x.id === 'drop') || dropAct(s, pig).disabled));
  assert.equal(G.dropCarry(s, pig.id).reason, 'species');
  assert.equal(G.carriedAnimal(s), hen);
  assert.equal(hen.pen, a.id);
});

test('thả lại chuồng cũ: hủy chở, con về chuồng cũ', () => {
  const { s, a, hen } = setup();
  G.buy(s, 'barrow');
  G.startCarry(s, hen.id);
  assert.match(dropAct(s, a).label, /về chuồng cũ/);
  assert.equal(G.dropCarry(s, a.id).ok, true);
  assert.equal(s.carry, null);
  assert.equal(hen.pen, a.id);
});

test('không bế con đang nằm chuồng cách ly', () => {
  const { s, hen } = setup();
  G.buy(s, 'barrow');
  const q = addPen(s, 'quarantine', 46, 30);
  G.moveAnimal(s, hen.id, q.id);
  assert.equal(G.startCarry(s, hen.id).reason, 'quarantine');
});

test('đang thăm vườn người khác thì không bế được', () => {
  const { s, hen } = setup();
  G.buy(s, 'barrow');
  s.scene = 'visit'; s.visit = { name: 'Lan' };
  assert.equal(G.startCarry(s, hen.id).reason, 'visit');
});

test('lưu giữa chừng: tải lại vẫn còn con trên xe; bản lưu cũ không có trường carry thì mặc định không chở', () => {
  const { s, hen } = setup();
  G.buy(s, 'barrow');
  G.startCarry(s, hen.id);
  const l = G.loadGame(JSON.parse(JSON.stringify(s)));
  assert.equal(l.carry.animalId, hen.id);
  assert.equal(G.carriedAnimal(l)?.id, hen.id);
  const old = JSON.parse(JSON.stringify(s)); delete old.carry;
  assert.equal(G.loadGame(old).carry, null);
  const gone = JSON.parse(JSON.stringify(s)); gone.animals = gone.animals.filter(x => x.id !== hen.id);
  assert.equal(G.loadGame(gone).carry, null, 'con không còn thì bỏ trạng thái chở');
});
