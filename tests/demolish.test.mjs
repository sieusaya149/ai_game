// Phá bỏ chuồng trống (chế độ xây dựng), qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { PEN_PRICES, PEN_TABLE, PEN_REFUND } from '../public/data.js';

const game = () => {
  const s = G.createGame({ name: 'Thợ phá' });
  s.exp = 1e6; s.coins = 100000; s.animals = []; s.farm.owned = { c: 10, r: 5, w: 50, h: 40 }; s.farm.rev++;   // bỏ 2 con gà khởi đầu
  return s;
};
const pens = (s, t) => s.farm.ents.filter(e => e.kind === 'pen' && e.pen === t);

test('chuồng còn vật nuôi thì không phá được, nói rõ lý do', () => {
  const s = game();
  G.buyAnimal(s, 'ga');
  const coop = pens(s, 'chicken')[0], coins = s.coins;
  const r = G.demolishPen(s, coop.id);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'has_animals');
  assert.match(r.msg, /vật nuôi/);
  assert.equal(s.coins, coins);
  assert.ok(pens(s, 'chicken').length === 1);
});

test('con vật đang đi lang thang ngoài chuồng, hay nằm chuồng cách ly, vẫn tính là của chuồng', () => {
  const s = game();
  G.buyAnimal(s, 'ga');
  const a = s.animals[0], coop = pens(s, 'chicken')[0];
  a.stray = true; a.tile = { c: 5, r: 5 };
  assert.equal(G.demolishPen(s, coop.id).reason, 'has_animals');
  // cách ly
  const s2 = game();
  assert.ok(G.placeEntity(s2, { kind: 'pen', pen: 'quarantine' }, 47, 22).ok);
  const q = pens(s2, 'quarantine')[0];
  G.buyAnimal(s2, 'ga'); s2.animals[0].sick = true;
  assert.ok(G.moveAnimal(s2, s2.animals[0].id, q.id).ok);
  assert.equal(G.demolishPen(s2, q.id).reason, 'has_animals');
});

test('trứng trong chuồng hoặc ổ ấp đang ấp thì không phá được', () => {
  const s = game();
  const coop = pens(s, 'chicken')[0], ft = G.footprint(coop);
  s.eggs.push({ id: 9001, x: ft.c * 16 + 40, y: ft.r * 16 + 50 });
  assert.equal(G.demolishPen(s, coop.id).reason, 'has_eggs');
  s.eggs.length = 0;
  s.nest.egg = true;
  assert.equal(G.demolishPen(s, coop.id).reason, 'has_eggs');
  s.nest.egg = false;
  assert.equal(G.demolishPen(s, coop.id).ok, true);
});

test('chuồng trống phá được, hoàn một phần tiền xây và nâng cấp, dọn máng, phân', () => {
  const s = game();
  const coop = pens(s, 'chicken')[0];
  coop.lv = 3;
  s.troughs[coop.id] = 4; s.manure.chicken = 50;
  const coins = s.coins;
  const r = G.demolishPen(s, coop.id);
  assert.equal(r.ok, true, r.msg);
  const want = Math.floor((PEN_PRICES.chicken + PEN_TABLE.chicken.up[0] + PEN_TABLE.chicken.up[1]) * PEN_REFUND);
  assert.equal(r.refund, want);
  assert.equal(s.coins, coins + want);
  assert.equal(pens(s, 'chicken').length, 0, 'chuồng cuối của loài cũng phá được');
  assert.equal(coop.id in s.troughs, false);
  assert.equal(s.manure.chicken, 0);
  assert.ok(G.mapOf(s).penList.every(p => p.id !== coop.id), 'bản đồ dựng lại');
});

test('còn chuồng cùng loại thì phân của loại đó giữ nguyên; xây lại được', () => {
  const s = game();
  assert.ok(G.placeEntity(s, { kind: 'pen', pen: 'chicken' }, 45, 8).ok);
  const [a, b] = pens(s, 'chicken');
  s.manure.chicken = 40; s.troughs[b.id] = 3;
  assert.ok(G.demolishPen(s, a.id).ok);
  assert.equal(s.manure.chicken, 40);
  assert.equal(s.troughs[b.id], 3);
  assert.ok(G.demolishPen(s, b.id).ok);
  assert.ok(G.placeEntity(s, { kind: 'pen', pen: 'chicken' }, 21, 24).ok);
});

test('không phá được thứ không phải chuồng; Hủy trả lại chuồng, máng, phân, xu', () => {
  const s = game();
  assert.equal(G.demolishPen(s, s.farm.ents.find(e => e.kind === 'house').id).ok, false);
  const coop = pens(s, 'chicken')[0];
  s.troughs[coop.id] = 5; s.manure.chicken = 30;
  const snap = G.snapLayout(s), coins = s.coins;
  assert.ok(G.demolishPen(s, coop.id).ok);
  G.restoreLayout(s, snap);
  assert.equal(pens(s, 'chicken').length, 1);
  assert.equal(s.troughs[coop.id], 5);
  assert.equal(s.manure.chicken, 30);
  assert.equal(s.coins, coins);
});
