// Chế độ xây dựng: luật đặt/dời công trình (ADR 0005), qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';

const TS = 16;
const game = () => G.createGame({ name: 'Thợ xây' });
const ent = (s, kind) => s.farm.ents.find(e => e.kind === kind);
const solidUnder = (m, o) => [[-5, -3], [5, -3], [-5, 3], [5, 3]].some(([dx, dy]) => m.isSolidPx(o.x + dx, o.y + dy));

test('dời giếng tới chỗ trống: được, bản đồ đổi theo', () => {
  const s = game(), w = ent(s, 'well');
  assert.deepEqual(G.canPlace(s, { id: w.id }, 31, 22), { ok: true });
  const r = G.moveEntity(s, w.id, 31, 22);
  assert.equal(r.ok, true);
  const b = G.mapOf(s).building('well');
  assert.deepEqual([b.foot.c, b.foot.r], [31, 22]);
  assert.ok(G.mapOf(s).isSolid(31, 22));
  assert.ok(!G.mapOf(s).isSolid(33, 17), 'chỗ cũ trống ra');
});

test('lý do: chồng lên công trình khác', () => {
  const s = game(), w = ent(s, 'well');
  const r = G.canPlace(s, { id: w.id }, 22, 16);   // giữa nhà
  assert.equal(r.ok, false); assert.equal(r.reason, 'overlap'); assert.match(r.msg, /chồng/i);
  assert.equal(G.canPlace(s, { id: ent(s, 'field').id }, 26, 15).reason, 'overlap');   // khối ruộng đè lên nhà kho
});

test('lý do: ngoài đất đã mua (kể cả lấn một phần)', () => {
  const s = game();
  const r = G.canPlace(s, { id: ent(s, 'well').id }, 19, 20);
  assert.equal(r.ok, false); assert.equal(r.reason, 'outside'); assert.match(r.msg, /ngoài đất/i);
  assert.equal(G.canPlace(s, { id: ent(s, 'field').id }, 42, 25).reason, 'outside');
});

test('lý do: chặn đường từ cổng vào cửa nhà (tìm đường như thể đã đặt)', () => {
  const s = game(), shed = ent(s, 'shed');
  // nhà kho 4x3 đặt ngay trên lối ra cổng: bịt kín cổng
  const r = G.canPlace(s, { id: shed.id }, 34, 31);
  assert.equal(r.ok, false); assert.equal(r.reason, 'blocks_path'); assert.match(r.msg, /cổng vào nhà/);
  const res = G.moveEntity(s, shed.id, 34, 31);
  assert.equal(res.ok, false); assert.equal(res.reason, 'blocks_path');
  assert.deepEqual([shed.c, shed.r], [26, 15], 'không dời khi không hợp lệ');
});

test('lý do: chặn đường tới công trình khác', () => {
  const s = game(), w = ent(s, 'well');
  // bảng đơn hàng ở (31,16), chỗ đứng (31,17); hai cây hai bên, giếng bịt nốt phía dưới
  s.farm.ents.push({ id: 900, kind: 'tree', c: 30, r: 17 }, { id: 901, kind: 'tree', c: 32, r: 17 });
  s.farm.rev++;
  const r = G.canPlace(s, { id: w.id }, 31, 18);
  assert.equal(r.ok, false); assert.equal(r.reason, 'blocks_path'); assert.match(r.msg, /bảng đơn hàng/i);
  assert.equal(G.canPlace(s, { id: w.id }, 31, 22).ok, true, 'chỗ khác vẫn được');
});

test('nhà và cổng không dời được', () => {
  const s = game();
  for (const k of ['house', 'gate']) {
    const r = G.moveEntity(s, ent(s, k).id, 30, 22);
    assert.equal(r.ok, false); assert.equal(r.reason, 'fixed');
  }
});

test('dời khối ruộng đang có cây: ô giữ nguyên, cây vẫn lớn tiếp ở chỗ mới', () => {
  const s = game(), f = ent(s, 'field');
  Object.assign(s.plots[0], { soil: 'tilled', water: 100, crop: { id: 'cai', progress: 0.4, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 } });
  const before = structuredClone(s.plots);
  assert.equal(G.moveEntity(s, f.id, 40, 25).ok, true);
  assert.deepEqual(s.plots, before);
  const m = G.mapOf(s);
  assert.deepEqual(m.plotTile(0), { c: 40, r: 25 });
  assert.deepEqual(m.plotTile(8), { c: 42, r: 27 });
  assert.equal(m.plotAt(40, 25), 0);
  assert.equal(m.plotAt(37, 15), -1, 'chỗ cũ hết ruộng');
});

test('dời chuồng: con vật và trứng đi theo, con vật hoảng một lúc', () => {
  const s = game(), pen = ent(s, 'pen');
  s.eggs.push({ id: 500, x: s.animals[0].x, y: s.animals[0].y, laidAt: 0 });
  const xs = s.animals.map(a => [a.x, a.y]), egg = { ...s.eggs[0] };
  const coop0 = G.mapOf(s).building('coop').foot.c;
  assert.equal(G.moveEntity(s, pen.id, 22, 24).ok, true);
  s.animals.forEach((a, i) => { assert.equal(a.x, xs[i][0] + TS); assert.equal(a.y, xs[i][1]); assert.ok(a.scaredUntil > s.time); });
  assert.equal(s.eggs[0].x, egg.x + TS);
  const m = G.mapOf(s), area = m.pens.chicken.area;
  for (const a of s.animals) assert.ok(a.x >= area.x && a.x <= area.x + area.w && a.y >= area.y && a.y <= area.y + area.h);
  assert.equal(m.building('coop').foot.c, coop0 + 1);
});

test('dời đồ trang trí được', () => {
  const s = game();
  s.farm.ents.push({ id: 700, kind: 'deco', item: 'deco_flower', c: 30, r: 22 });
  s.farm.rev++;
  assert.equal(G.moveEntity(s, 700, 25, 22).ok, true);
  assert.deepEqual(G.mapOf(s).decos.map(d => [d.ent.c, d.ent.r]), [[25, 22]]);
});

test('sau khi đổi bố cục, nhân vật và chó không bị kẹt trong ô chắn', () => {
  const s = game(), w = ent(s, 'well');
  s.player.x = 31 * TS + 8; s.player.y = 22 * TS + 8;
  s.dog.x = 31 * TS + 4; s.dog.y = 22 * TS + 10;
  assert.equal(G.moveEntity(s, w.id, 31, 22).ok, true);
  const m = G.mapOf(s);
  assert.ok(!solidUnder(m, s.player), 'nhân vật ra ô trống');
  assert.ok(!solidUnder(m, s.dog), 'chó ra ô trống');
  assert.ok(Math.hypot(s.player.x - (31 * TS + 8), s.player.y - (22 * TS + 8)) <= 2 * TS, 'chỉ dời ra ô gần nhất');
});

test('hủy: trả bố cục, con vật, nhân vật về đúng như lúc vào chế độ xây dựng', () => {
  const s = game();
  const keep = structuredClone({ farm: s.farm, animals: s.animals, player: s.player, dog: s.dog });
  const snap = G.snapLayout(s);
  G.moveEntity(s, ent(s, 'pen').id, 22, 24);
  G.moveEntity(s, ent(s, 'field').id, 40, 25);
  G.moveEntity(s, ent(s, 'well').id, 31, 22);
  G.restoreLayout(s, snap);
  assert.deepEqual({ farm: s.farm, animals: s.animals, player: s.player, dog: s.dog }, keep);
  assert.deepEqual([G.mapOf(s).building('well').foot.c, G.mapOf(s).building('well').foot.r], [33, 17]);
});

test('đặt công trình mới dùng cùng hàm kiểm tra', () => {
  const s = game();
  assert.deepEqual(G.canPlace(s, { kind: 'well' }, 31, 22), { ok: true });
  assert.equal(G.canPlace(s, { kind: 'field' }, 37, 15).reason, 'overlap');
  assert.equal(G.canPlace(s, { kind: 'shed' }, 34, 31).reason, 'blocks_path');
});

test('bố cục sau khi dời vẫn lưu và tải lại được', () => {
  const store = {};
  globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const s = game();
  G.moveEntity(s, ent(s, 'well').id, 31, 22);
  G.saveGame(s);
  const t = G.loadGame();
  assert.deepEqual([G.mapOf(t).building('well').foot.c, G.mapOf(t).building('well').foot.r], [31, 22]);
  delete globalThis.localStorage;
});
