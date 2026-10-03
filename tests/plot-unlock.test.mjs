// Mở ruộng từng ô: đặt khối mới miễn phí với 9 ô khóa, ô kế tiếp có cờ, mở trả xu theo thứ tự (qua API công khai của state.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { FIELD_PRICES } from '../public/data.js';

const game = (lv = 8, coins = 0) => {
  const s = G.createGame({ name: 'Thợ xây' });
  s.exp = Array.from({ length: lv - 1 }, (_, i) => Math.floor(25 * (i + 1) ** 1.5)).reduce((a, b) => a + b, 0);
  s.coins = coins;
  return s;
};
const fields = s => s.farm.ents.filter(e => e.kind === 'field');
const open = (s, i) => G.perform(s, { kind: 'lockedPlot', idx: i }, 'expand');
const placed = (s, c = 36, r = 23) => { const r0 = G.placeEntity(s, { kind: 'field' }, c, r); assert.equal(r0.ok, true, r0.msg); return fields(s).at(-1); };

test('đặt khối mới: không trừ xu, 9 ô còn khóa, cờ ở ô đầu', () => {
  const s = game(8, 1000), f = placed(s);
  assert.equal(s.coins, 1000);
  assert.equal(f.plots.length, 9);
  assert.ok(f.plots.every(i => !s.plots[i].unlocked && !s.plots[i].removed));
  assert.equal(G.nextLockedPlot(s), f.plots[0]);
});

test('mở ô theo thứ tự trái sang phải, trên xuống dưới, trả đúng giá', () => {
  const s = game(8, 100000), f = placed(s), P = FIELD_PRICES[0];
  let paid = 0, last = 0;
  for (const [k, i] of f.plots.entries()) {
    assert.equal(G.nextLockedPlot(s), i);
    const a = G.actionsFor(s, { kind: 'lockedPlot', idx: i })[0], before = s.coins;
    assert.equal(a.id, 'expand'); assert.ok(!a.disabled);
    assert.equal(open(s, i).ok, true);
    const cost = before - s.coins;
    assert.equal(cost % 10, 0);
    assert.ok(cost >= last, 'ô sau không rẻ hơn ô trước');
    assert.match(a.label, new RegExp(`${cost} xu`));
    last = cost; paid += cost;
    assert.equal(s.plots[i].unlocked, true, `ô ${k}`);
  }
  assert.ok(Math.abs(paid - P) <= 50, `tổng ${paid} ≈ giá khối ${P}`);
  assert.equal(G.nextLockedPlot(s), -1);
});

test('mở sai thứ tự bị từ chối kèm "Mở ô có cờ trước"; thiếu xu bị từ chối', () => {
  const s = game(8, 100000), f = placed(s);
  const a = G.actionsFor(s, { kind: 'lockedPlot', idx: f.plots[3] })[0];
  assert.match(a.disabled, /Mở ô có cờ trước/);
  const before = s.coins;
  assert.equal(open(s, f.plots[3]).ok, false);
  assert.equal(s.plots[f.plots[3]].unlocked, false); assert.equal(s.coins, before);
  s.coins = 5;
  assert.equal(G.actionsFor(s, { kind: 'lockedPlot', idx: f.plots[0] })[0].disabled, 'Chưa đủ xu');
  assert.equal(open(s, f.plots[0]).ok, false);
  assert.equal(s.coins, 5); assert.equal(s.plots[f.plots[0]].unlocked, false);
});

test('chưa mở hết khối đang dở thì không đặt được khối mới', () => {
  const s = game(12, 100000), f = placed(s);
  const chk = G.canAfford(s, { kind: 'field' });
  assert.equal(chk.ok, false); assert.equal(chk.reason, 'unfinished');
  const r = G.placeEntity(s, { kind: 'field' }, 39, 23);
  assert.equal(r.ok, false); assert.equal(fields(s).length, 2);
  for (const i of f.plots) assert.equal(open(s, i).ok, true);
  assert.equal(G.placeEntity(s, { kind: 'field' }, 39, 23).ok, true);
});

test('dời khối giữ ô khóa và cờ; lưu rồi tải lại vẫn đúng', () => {
  const s = game(8, 100000), f = placed(s);
  for (const i of f.plots.slice(0, 4)) open(s, i);
  const mv = G.moveEntity(s, f.id, 36, 26);
  assert.equal(mv.ok, true, mv.msg);
  assert.deepEqual(f.plots.map(i => s.plots[i].unlocked), [1, 1, 1, 1, 0, 0, 0, 0, 0].map(Boolean));
  assert.equal(G.nextLockedPlot(s), f.plots[4]);
  const back = JSON.parse(JSON.stringify(s));
  assert.equal(G.nextLockedPlot(back), f.plots[4]);
  assert.equal(G.mapOf(back).plotTile(f.plots[4]).r, 27);
});

test('bản lưu cũ: khối đã có đã mở hết, không có cờ', () => {
  const s = game(8, 0);
  assert.ok(fields(s)[0].plots.every(i => s.plots[i].unlocked));
  assert.equal(G.nextLockedPlot(s), -1);
});

test('giá ô khối sau cao hơn khối trước (theo giá khối)', () => {
  const s = game(30, 1e7);
  const first = [];
  for (const [c, r] of [[36, 23], [36, 26]]) {
    const f = placed(s, c, r), before = s.coins;
    open(s, f.plots[0]); first.push(before - s.coins);
    for (const i of f.plots.slice(1)) open(s, i);
  }
  assert.ok(first[1] > first[0], first.join(' < '));
});

test('ô đã mở dùng được: cuốc đất', () => {
  const s = game(8, 100000), f = placed(s);
  open(s, f.plots[0]);
  const t = G.mapOf(s).plotCenter(f.plots[0]);
  s.player.x = t.x; s.player.y = t.y - 16;
  assert.equal(G.perform(s, { kind: 'plot', idx: f.plots[0] }, 'till').ok, true);
  assert.equal(G.actionsFor(s, { kind: 'plot', idx: f.plots[1] }).length, 0, 'ô khóa không cuốc được');
});

test('chống gian lận: đặt khung rồi mở ô trả xu vẫn qua checkSaveJump', () => {
  const prev = game(8, 5000);
  const next = structuredClone(prev), f = placed(next);
  next.simMs += 60_000;
  open(next, f.plots[0]); open(next, f.plots[1]);
  assert.ok(next.coins < prev.coins);
  assert.equal(G.checkSaveJump(prev, next, 60_000).ok, true);
});
