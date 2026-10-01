// Đặt khối ruộng, chuồng, đồ trang trí mới và cất đồ (chế độ xây dựng), qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';

const game = (lv = 1, coins = 0) => {
  const s = G.createGame({ name: 'Thợ xây' });
  s.exp = Array.from({ length: lv - 1 }, (_, i) => Math.floor(25 * (i + 1) ** 1.5)).reduce((a, b) => a + b, 0);
  s.coins = coins;
  return s;
};
const fields = s => s.farm.ents.filter(e => e.kind === 'field');
const crop = { id: 'cai', progress: 0.4, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };

test('giới hạn khối ruộng theo cấp', () => {
  for (const [lv, n] of [[1, 1], [3, 1], [4, 2], [8, 3], [12, 4], [16, 5], [20, 6], [25, 7], [30, 8], [40, 8]]) {
    assert.equal(G.fieldLimit(game(lv)), n, `cấp ${lv}`);
    assert.equal(G.levelInfo(game(lv).exp).level, lv);
  }
  assert.equal(G.fieldNextLevel(game(1)), 4);
  assert.equal(G.fieldNextLevel(game(30)), null);
});

test('giá khối tăng dần, khối đầu miễn phí', () => {
  const s = game(30, 1e6), costs = [];
  for (let n = 1; n < 8; n++) {
    assert.equal(G.fieldCount(s), n);
    costs.push(G.fieldCost(s));
    s.farm.ents.push({ id: 5000 + n, kind: 'field', c: 0, r: 0, plots: [] });   // giả lập đã có thêm một khối
  }
  assert.ok(costs[0] > 0);
  for (let i = 1; i < costs.length; i++) assert.ok(costs[i] > costs[i - 1], 'giá tăng dần');
  const f = game(); f.farm.ents = f.farm.ents.filter(e => e.kind !== 'field');
  assert.equal(G.fieldCost(f), 0, 'khối đầu tiên miễn phí');
});
test('đặt khối ruộng mới: trừ xu, có 9 ô mới cuốc được', () => {
  const s = game(4, 1000);
  const cost = G.fieldCost(s);
  const r = G.placeEntity(s, { kind: 'field' }, 36, 23);
  assert.equal(r.ok, true, r.msg);
  assert.equal(s.coins, 1000 - cost);
  assert.equal(fields(s).length, 2);
  assert.equal(s.plots.length, 18);
  const m = G.mapOf(s), idx = m.plotAt(37, 24);
  assert.ok(idx >= 9 && s.plots[idx].unlocked);
  s.player.x = 37 * 16 + 8; s.player.y = 22 * 16 + 8;
  const till = G.perform(s, { kind: 'plot', idx }, 'till');
  assert.equal(s.plots[idx].soil, 'tilled', till.msg);
});

test('vượt số khối tối đa bị từ chối kèm lý do max_fields, không mất xu', () => {
  const s = game(1, 5000);
  const chk = G.canPlace(s, { kind: 'field' }, 36, 23);
  assert.equal(chk.ok, false); assert.equal(chk.reason, 'max_fields'); assert.match(chk.msg, /cấp 4/);
  const r = G.placeEntity(s, { kind: 'field' }, 36, 23);
  assert.equal(r.ok, false); assert.equal(r.reason, 'max_fields');
  assert.equal(s.coins, 5000); assert.equal(fields(s).length, 1);
});

test('đặt khối ruộng cũng theo luật chung: chồng lên, thiếu xu', () => {
  const s = game(4, 1000);
  assert.equal(G.placeEntity(s, { kind: 'field' }, 26, 15).reason, 'overlap');
  const p = game(4, 10);
  const r = G.placeEntity(p, { kind: 'field' }, 36, 23);
  assert.equal(r.ok, false); assert.equal(r.reason, 'coins'); assert.equal(fields(p).length, 1);
});

test('đặt chuồng heo: cần cấp, tốn xu, chỉ một chuồng mỗi loại', () => {
  const lo = game(1, 5000);
  assert.equal(G.placeEntity(lo, { kind: 'pen', pen: 'pig' }, 34, 18).reason, 'level');
  const s = game(3, 5000);
  assert.equal(G.buyAnimal(s, 'heo').ok, false);
  const r = G.placeEntity(s, { kind: 'pen', pen: 'pig' }, 34, 18);
  assert.equal(r.ok, true, r.msg);
  assert.ok(s.coins < 5000);
  assert.equal(G.placeEntity(s, { kind: 'pen', pen: 'pig' }, 33, 24).reason, 'exists');
  assert.equal(G.canPlace(s, { kind: 'pen', pen: 'chicken' }, 33, 24).reason, 'exists');
});

test('đặt đồ trang trí từ túi: trừ túi, hết thì từ chối', () => {
  const s = game(1);
  s.inv.deco_flower = 1;
  const r = G.placeEntity(s, { kind: 'deco', item: 'deco_flower' }, 30, 21);
  assert.equal(r.ok, true, r.msg);
  assert.equal(s.inv.deco_flower, undefined);
  assert.ok(s.farm.ents.some(e => e.kind === 'deco' && e.c === 30 && e.r === 21));
  const again = G.placeEntity(s, { kind: 'deco', item: 'deco_flower' }, 31, 21);
  assert.equal(again.ok, false); assert.equal(again.reason, 'no_item');
});

test('cất đồ trang trí: quay về túi', () => {
  const s = game(1);
  s.inv.deco_flower = 1;
  const id = G.placeEntity(s, { kind: 'deco', item: 'deco_flower' }, 30, 21).id;
  const r = G.storeEntity(s, id);
  assert.equal(r.ok, true);
  assert.equal(s.inv.deco_flower, 1);
  assert.ok(!s.farm.ents.some(e => e.id === id));
});

test('cất khối ruộng đang có cây bị từ chối; trống thì cất được, ô các khối khác giữ nguyên', () => {
  const s = game(8, 5000);
  G.placeEntity(s, { kind: 'field' }, 36, 23);
  G.placeEntity(s, { kind: 'field' }, 39, 23);
  const [a, b, c] = fields(s);
  Object.assign(s.plots[b.plots[4]], { soil: 'tilled', crop: structuredClone(crop) });
  const r = G.storeEntity(s, b.id);
  assert.equal(r.ok, false); assert.equal(r.reason, 'has_crop');
  assert.equal(fields(s).length, 3);
  s.plots[b.plots[4]].crop = null;
  assert.equal(G.storeEntity(s, b.id).ok, true);
  assert.equal(fields(s).length, 2);
  const m = G.mapOf(s);
  assert.equal(m.plotAt(37, 24), -1, 'chỗ cũ không còn ô');
  for (const i of c.plots) assert.equal(m.plotTile(i).c >= 39, true);
  Object.assign(s.plots[c.plots[0]], { soil: 'tilled', crop: structuredClone(crop) });
  assert.equal(s.plots[m.plotAt(c.c, c.r)].crop.id, 'cai', 'idx khối còn lại vẫn đúng');
  assert.equal(G.nextLockedPlot(s), -1);
});

test('không cất khối ruộng cuối cùng; công trình cố định không cất được', () => {
  const s = game(1);
  assert.equal(G.storeEntity(s, fields(s)[0].id).reason, 'last_field');
  assert.equal(G.storeEntity(s, s.farm.ents.find(e => e.kind === 'house').id).ok, false);
  assert.equal(G.storeEntity(s, 99999).reason, 'missing');
});

test('khối ruộng mới và ô đã gỡ lưu/tải lại vẫn đúng', () => {
  const s = game(8, 5000);
  G.placeEntity(s, { kind: 'field' }, 36, 23);
  G.placeEntity(s, { kind: 'field' }, 39, 23);
  G.storeEntity(s, fields(s)[1].id);
  const back = JSON.parse(JSON.stringify(s));
  assert.equal(G.mapOf(back).plotAt(40, 24), G.mapOf(s).plotAt(40, 24));
  assert.equal(G.mapOf(back).plotAt(40, 24) >= 0, true);
  assert.equal(G.mapOf(back).plotAt(37, 24), -1);
});

test('Hủy sau khi đặt/cất: xu, túi, ô ruộng về như lúc vào chế độ xây dựng', () => {
  const s = game(8, 5000);
  s.inv.deco_flower = 2;
  const snap = G.snapLayout(s);
  G.placeEntity(s, { kind: 'field' }, 36, 23);
  G.placeEntity(s, { kind: 'deco', item: 'deco_flower' }, 30, 21);
  G.storeEntity(s, fields(s)[1].id);
  s.plots[0].water = 77;   // thời gian vẫn chạy trong lúc xây: không bị quay ngược
  G.restoreLayout(s, snap);
  assert.equal(s.coins, 5000); assert.equal(s.inv.deco_flower, 2);
  assert.equal(fields(s).length, 1); assert.equal(s.plots.length, 9);
  assert.equal(s.plots[0].water, 77);
  assert.ok(!s.farm.ents.some(e => e.kind === 'deco'));
  // cất khối rồi hủy: ô được trả lại
  G.placeEntity(s, { kind: 'field' }, 36, 23);
  const snap2 = G.snapLayout(s), b = fields(s)[1];
  G.storeEntity(s, b.id);
  G.restoreLayout(s, snap2);
  assert.equal(fields(s).length, 2);
  assert.ok(b.plots.every(i => s.plots[i].unlocked && !s.plots[i].removed));
});
