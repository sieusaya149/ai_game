// Máng ăn theo từng chuồng: đổ cám một chuồng không làm đầy máng chuồng khác (hotfix người chơi báo).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const game = () => {
  const s = G.createGame({ name: 'Chủ trại' });
  s.coins = 100000; s.exp = 5000; s.farm.owned = { c: 10, r: 8, w: 50, h: 38 }; s.farm.rev++; G.bumpLayout?.(s);
  s.inv.feed_ga = 20; s.inv.feed_heo = 20;
  return s;
};
const addPen = (s, pen, c, r) => { const x = G.placeEntity(s, { kind: 'pen', pen }, c, r); assert.equal(x.ok, true, x.msg); return x.id; };
const pens = (s, type) => s.farm.ents.filter(e => e.kind === 'pen' && e.pen === type).map(e => e.id);

test('hai chuồng gà: đổ cám chuồng này, máng chuồng kia vẫn trống', () => {
  const s = game();
  const b = addPen(s, 'chicken', 46, 10), [a] = pens(s, 'chicken');
  assert.equal(G.perform(s, { kind: 'trough', pen: 'chicken', id: b }, 'fill').ok, true);
  assert.equal(s.troughs[b], 5);
  assert.equal(s.troughs[a], 0);
  assert.match(G.actionsFor(s, { kind: 'trough', pen: 'chicken', id: a }).find(x => x.id === 'fill').label, /\(0\//);
});

test('gà ở chuồng có máng trống không ăn ké máng chuồng khác', () => {
  const s = game();
  const b = addPen(s, 'chicken', 46, 10), [a] = pens(s, 'chicken');
  G.perform(s, { kind: 'trough', pen: 'chicken', id: b }, 'fill');
  const hen = s.animals.find(x => x.type === 'ga' && x.pen === a);
  hen.hunger = 10;
  G.tick(s, 1000);
  assert.ok(hen.hunger < 30, 'máng chuồng gà này trống nên không ăn được');
  assert.equal(s.troughs[b], 5);
});

test('bản lưu cũ (máng theo loại) chép giá trị cũ cho từng chuồng cùng loại', () => {
  const s = game();
  const b = addPen(s, 'chicken', 46, 10), [a] = pens(s, 'chicken');
  const raw = JSON.parse(JSON.stringify(s));
  raw.troughs = { chicken: 7, pig: 3, pasture: 0 };
  const l = G.loadGame(raw);
  assert.equal(l.troughs[a], 7);
  assert.equal(l.troughs[b], 7);
  assert.equal(l.troughs.chicken, undefined);
});
