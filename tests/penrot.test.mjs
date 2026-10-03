// Xoay chuồng trong chế độ xây dựng: rot 0 cửa trên, 1 cửa trái, 2 cửa phải; qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';

const TS = 16;
// vườn mới, dọn bớt đồ để chuồng gà (13x9) có chỗ xoay thành 9x13
function game() {
  const s = G.createGame({ name: 'Thợ xoay' });
  s.farm.ents = s.farm.ents.filter(e => ['house', 'gate', 'giftbox', 'guestbook', 'pen'].includes(e.kind));
  const pen = s.farm.ents.find(e => e.kind === 'pen');
  assert.equal(G.moveEntity(s, pen.id, 28, 17).ok, true);
  return { s, pen };
}
const inside = (o, rect) => o.x >= rect.c * TS && o.x < (rect.c + rect.w) * TS && o.y >= rect.r * TS && o.y < (rect.r + rect.h) * TS;

test('xoay: khung đổi chiều, cửa bên trái (rot 1) rồi bên phải (rot 2), rồi về lại', () => {
  const { s, pen } = game();
  assert.deepEqual([G.footprint(pen).w, G.footprint(pen).h], [13, 9]);
  assert.equal(G.mapOf(s).penById[pen.id].gates[0][1], pen.r, 'mặc định cửa ở hàng trên');
  assert.equal(G.rotateEntity(s, pen.id).ok, true);
  let p = G.mapOf(s).penById[pen.id];
  assert.deepEqual([p.rect.w, p.rect.h], [9, 13]);
  assert.ok(p.gates.length === 2 && p.gates.every(([c]) => c === p.rect.c), 'cửa nằm ở cột trái');
  assert.deepEqual(G.gateOf(s, pen.id), { x: p.rect.c * TS + 8, y: (pen.r + 5.5) * TS + 8 });
  assert.equal(G.rotateEntity(s, pen.id).ok, true);
  p = G.mapOf(s).penById[pen.id];
  assert.ok(p.gates.every(([c]) => c === p.rect.c + p.rect.w - 1), 'rot 2: cửa ở cột phải');
  assert.equal(G.rotateEntity(s, pen.id).ok, true);
  assert.equal(pen.rot ?? 0, 0);
  assert.deepEqual([G.footprint(pen).w, G.footprint(pen).h], [13, 9]);
});

test('xoay: máng và ổ ấp nằm trong khung rào, máng dọc 1x2', () => {
  const { s, pen } = game();
  for (let k = 1; k <= 2; k++) {
    G.rotateEntity(s, pen.id);
    const m = G.mapOf(s), p = m.penById[pen.id], r = p.rect, t = m.troughs[0], nest = m.building('coop').foot;
    assert.deepEqual([t.w, t.h], [1, 2]);
    for (const o of [t, nest]) assert.ok(o.c > r.c && o.r > r.r && o.c + (o.w) <= r.c + r.w - 1 && o.r + o.h <= r.r + r.h - 1, `rot ${k}: trong rào`);
    assert.ok(m.isSolid(t.c, t.r) && m.isSolid(t.c, t.r + 1), 'máng chắn đường');
    assert.ok(inside(p.trough, { c: r.c, r: r.r, w: r.w, h: r.h }));
    assert.ok(!m.isSolid(...p.gates[0]), 'ô cửa đi được');
  }
});

test('xoay: con vật và trứng trong chuồng vẫn nằm trong vùng đi lại mới', () => {
  const { s, pen } = game();
  const hen = s.animals[0], c0 = G.mapOf(s).penById[pen.id].area;
  s.eggs.push({ id: 900, x: hen.x, y: hen.y, laidAt: 0 });
  for (let k = 0; k < 3; k++) {
    assert.equal(G.rotateEntity(s, pen.id).ok, true);
    const area = G.mapOf(s).penById[pen.id].area;
    for (const a of s.animals) {
      assert.ok(a.x >= area.x && a.x <= area.x + area.w && a.y >= area.y && a.y <= area.y + area.h, `rot ${k + 1}: con vật trong vùng`);
      assert.ok(a.scaredUntil > s.time);
    }
    assert.ok(inside(s.eggs[0], G.footprint(pen)));
  }
  assert.ok(Math.abs(hen.x - s.eggs[0].x) < 1e-6 && c0, 'xoay đủ vòng thì về đúng chỗ cũ');
});

test('xoay: từ chối kèm lý do khi không vừa chỗ, không đổi gì', () => {
  const { s, pen } = game();
  G.moveEntity(s, pen.id, 21, 24);   // chuồng sát đáy đất: xoay thành 9x13 thì tràn
  const before = JSON.stringify(s.farm.ents), xs = s.animals.map(a => a.x);
  const r = G.rotateEntity(s, pen.id);
  assert.equal(r.ok, false); assert.equal(r.reason, 'outside'); assert.ok(r.msg);
  assert.equal(JSON.stringify(s.farm.ents), before);
  assert.deepEqual(s.animals.map(a => a.x), xs);
  assert.equal(G.canPlace(s, { id: pen.id, rot: 1 }, pen.c, pen.r).ok, false);
});

test('xoay: không xoay được thứ không phải chuồng; chặn cổng thì bị từ chối', () => {
  const { s } = game();
  assert.equal(G.rotateEntity(s, s.farm.ents.find(e => e.kind === 'house').id).ok, false);
  // đặt hộp chặn: xoay làm cổng chuồng quay ra sát đất khác -> vẫn phải còn đường
  const pen = s.farm.ents.find(e => e.kind === 'pen');
  assert.equal(G.moveEntity(s, pen.id, 20, 21).ok, true);   // sát mép trái đất
  const r = G.rotateEntity(s, pen.id);   // cửa trái nằm sát rìa đất (ngoài là rừng): không có đường tới cửa
  assert.equal(r.ok, false); assert.equal(r.reason, 'blocks_path');
});

test('xoay: lưu và nạp giữ rot, bản lưu cũ (không rot) vẫn là 0', () => {
  const { s, pen } = game();
  G.rotateEntity(s, pen.id); G.rotateEntity(s, pen.id);
  const l = G.loadGame(JSON.parse(JSON.stringify(s)));
  const e = l.farm.ents.find(x => x.id === pen.id);
  assert.equal(e.rot, 2);
  assert.ok(G.mapOf(l).penById[pen.id].gates.every(([c]) => c === e.c + 8));
  delete e.rot; l.farm.rev++;
  assert.equal(G.footprint(e).w, 13);
});

test('xoay: chuồng heo có cân, bùn trong khung', () => {
  const s = G.createGame({ name: 'Heo' });
  s.farm.ents = s.farm.ents.filter(e => ['house', 'gate', 'giftbox', 'guestbook'].includes(e.kind));
  s.farm.ents.push({ id: 900, kind: 'pen', pen: 'pig', c: 30, r: 16, lv: 3 }); s.troughs[900] = 0;
  s.farm.rev++;
  for (let k = 1; k <= 2; k++) {
    assert.equal(G.rotateEntity(s, 900).ok, true);
    const p = G.mapOf(s).penById[900], r = p.rect, m = G.mapOf(s);
    assert.ok(inside({ x: p.scale.x, y: p.scale.y - 1 }, r) && inside(p.shower, { c: r.c, r: r.r, w: r.w, h: r.h }));
    assert.ok(inside({ x: m.mudSpot.x, y: m.mudSpot.y }, r) && inside({ x: m.mud.x + 1, y: m.mud.y + 1 }, r));
    assert.ok(m.mud.w < m.mud.h, 'bùn quay dọc');
  }
});
