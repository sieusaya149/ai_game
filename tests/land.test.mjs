// Bản đồ lớn & mua đất theo dải, dọn bụi/đá (issue 05), qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { LAND_STRIPS, STAMINA } from '../public/data.js';
import { migrate } from '../public/migrate.js';

const game = (lv = 1, coins = 0) => {
  const s = G.createGame({ name: 'Chủ đất' });
  s.exp = Array.from({ length: lv - 1 }, (_, i) => Math.floor(25 * (i + 1) ** 1.5)).reduce((a, b) => a + b, 0);
  s.coins = coins;
  return s;
};
const clutter = s => s.farm.ents.filter(e => e.kind === 'bush' || e.kind === 'rock');
const inRect = (o, r) => o.c >= r.c && o.r >= r.r && o.c < r.c + r.w && o.r < r.r + r.h;

test('vườn mới: 24x20 giữa bản đồ 64x48, ngoài đó là rừng chắn', () => {
  const s = game(), m = G.mapOf(s);
  assert.deepEqual([s.farm.mw, s.farm.mh], [64, 48]);
  assert.deepEqual([s.farm.owned.w, s.farm.owned.h], [24, 20]);
  assert.equal(m.isSolid(s.farm.owned.c - 1, s.farm.owned.r + 3), true);
});

test('dải đất kế tiếp theo từng hướng: nằm sát đất nhà, giá & cấp theo bảng', () => {
  const s = game(), o = s.farm.owned, d = G.nextStrip(s, 'E');
  assert.deepEqual({ c: d.c, r: d.r, w: d.w, h: d.h }, { c: o.c + o.w, r: o.r, w: 4, h: o.h });
  assert.equal(d.price, LAND_STRIPS[0].price);
  assert.equal(d.level, LAND_STRIPS[0].lv);
  assert.deepEqual(G.nextStrip(s, 'W'), { ...G.nextStrip(s, 'W'), c: o.c - 4, r: o.r, w: 4, h: o.h });
  const n = G.nextStrip(s, 'N'), so = G.nextStrip(s, 'S');
  assert.deepEqual([n.c, n.r, n.w, n.h], [o.c, o.r - 4, o.w, 4]);
  assert.deepEqual([so.c, so.r, so.w, so.h], [o.c, o.r + o.h, o.w, 4]);
});

test('mua dải: cần đủ cấp và đủ xu; giá dải sau cao hơn, cấp cao hơn', () => {
  const lo = game(1, 99999);
  let r = G.buyStrip(lo, 'E');
  assert.equal(r.ok, false); assert.equal(r.reason, 'level');
  const poor = game(LAND_STRIPS[0].lv, LAND_STRIPS[0].price - 1);
  r = G.buyStrip(poor, 'E');
  assert.equal(r.ok, false); assert.equal(r.reason, 'coins'); assert.equal(poor.coins, LAND_STRIPS[0].price - 1);

  const s = game(40, 1e7), o0 = { ...s.farm.owned }, c0 = s.coins;
  r = G.buyStrip(s, 'E');
  assert.equal(r.ok, true, r.msg);
  assert.equal(s.coins, c0 - LAND_STRIPS[0].price);
  assert.deepEqual(s.farm.owned, { ...o0, w: o0.w + 4 });
  assert.equal(G.nextStrip(s, 'E').price, LAND_STRIPS[1].price);
  assert.ok(LAND_STRIPS[1].price > LAND_STRIPS[0].price && LAND_STRIPS[1].lv > LAND_STRIPS[0].lv);
  assert.equal(G.mapOf(s).isOwned(o0.c + o0.w + 1, o0.r + 1), true);
});

test('không mua vượt quá bản đồ 64x48', () => {
  const s = game(40, 1e9);
  for (const dir of ['E', 'W', 'N', 'S']) {
    let guard = 0;
    while (G.nextStrip(s, dir) && guard++ < 30) assert.equal(G.buyStrip(s, dir).ok, true);
  }
  const o = s.farm.owned;
  assert.deepEqual([o.c, o.r, o.w, o.h], [0, 0, 64, 48]);
  for (const dir of ['E', 'W', 'N', 'S']) {
    assert.equal(G.nextStrip(s, dir), null);
    const r = G.buyStrip(s, dir);
    assert.equal(r.ok, false); assert.equal(r.reason, 'max');
  }
});

test('dải mới có bụi và đá, cố định theo toạ độ, chỉ nằm trong dải', () => {
  const a = game(40, 1e7), b = game(40, 1e7);
  const strip = G.nextStrip(a, 'E');
  G.buyStrip(a, 'E'); G.buyStrip(b, 'E');
  const ca = clutter(a);
  assert.ok(ca.some(e => e.kind === 'bush') && ca.some(e => e.kind === 'rock'));
  assert.ok(ca.every(e => inRect(e, strip)));
  assert.deepEqual(ca.map(e => [e.kind, e.c, e.r]), clutter(b).map(e => [e.kind, e.c, e.r]));
  const m = G.mapOf(a);
  assert.ok(ca.every(e => m.isSolid(e.c, e.r)), 'bụi, đá chắn đường');
});

test('dọn bụi được gỗ, đập đá được đá, tốn thể lực', () => {
  const s = game(40, 1e7); G.buyStrip(s, 'E');
  const bush = clutter(s).find(e => e.kind === 'bush'), rock = clutter(s).find(e => e.kind === 'rock');
  let acts = G.actionsFor(s, { kind: 'clutter', id: bush.id });
  assert.equal(acts.length, 1);
  const st = s.stamina, w0 = G.haveItem(s, 'wood');
  const r = G.perform(s, { kind: 'clutter', id: bush.id }, acts[0].id);
  assert.equal(r.ok, true);
  assert.ok(G.haveItem(s, 'wood') > w0);
  assert.equal(st - s.stamina, STAMINA.cost.clearBush);
  assert.equal(s.farm.ents.some(e => e.id === bush.id), false);
  assert.equal(G.mapOf(s).isSolid(bush.c, bush.r), false);

  acts = G.actionsFor(s, { kind: 'clutter', id: rock.id });
  const st2 = s.stamina;
  assert.equal(G.perform(s, { kind: 'clutter', id: rock.id }, acts[0].id).ok, true);
  assert.ok(G.haveItem(s, 'stone') > 0);
  assert.equal(st2 - s.stamina, STAMINA.cost.breakRock);
});

test('đặt công trình lên ô chưa dọn bị từ chối (uncleared), dọn xong thì đặt được', () => {
  const s = game(40, 1e7); G.buyStrip(s, 'E');
  s.inv.deco_flower = 1;
  const bush = clutter(s).find(e => e.kind === 'bush');
  const chk = G.canPlace(s, { kind: 'deco', item: 'deco_flower' }, bush.c, bush.r);
  assert.equal(chk.ok, false); assert.equal(chk.reason, 'uncleared');
  assert.equal(G.placeEntity(s, { kind: 'deco', item: 'deco_flower' }, bush.c, bush.r).reason, 'uncleared');
  G.perform(s, { kind: 'clutter', id: bush.id }, 'clear');
  const r = G.placeEntity(s, { kind: 'deco', item: 'deco_flower' }, bush.c, bush.r);
  assert.equal(r.ok, true, r.msg);
});

test('bụi, đá không dời, không cất được', () => {
  const s = game(40, 1e7); G.buyStrip(s, 'E');
  const bush = clutter(s)[0];
  assert.equal(G.canMove(bush), false);
  assert.equal(G.storeEntity(s, bush.id).ok, false);
});

test('mua dải phía Nam: cổng dời theo, vẫn có đường từ nhà ra cổng', () => {
  const s = game(40, 1e7);
  assert.equal(G.buyStrip(s, 'S').ok, true);
  const gate = s.farm.ents.find(e => e.kind === 'gate'), o = s.farm.owned;
  assert.ok(gate.r + 2 >= o.r + o.h, 'cổng nằm ở mép dưới');
  const m = G.mapOf(s), door = m.doors.find(d => d.to === 'village');
  assert.equal(G.reachable(m, m.spawn, { x: door.x + 8, y: door.y + 8 }), true);
  assert.equal(m.isSolid(Math.floor(door.x / 16), Math.floor(door.y / 16)), false);
  // mua tiếp Nam lần nữa: vẫn ra được
  assert.equal(G.buyStrip(s, 'S').ok, true);
  const m2 = G.mapOf(s), d2 = m2.doors.find(d => d.to === 'village');
  assert.equal(G.reachable(m2, m2.spawn, { x: d2.x + 8, y: d2.y + 8 }), true);
});

test('mua cả bốn hướng: nhà ra cổng và mọi chỗ cần đi vẫn tới được', () => {
  const s = game(40, 1e8);
  for (const dir of ['N', 'W', 'E', 'S']) assert.equal(G.buyStrip(s, dir).ok, true);
  const m = G.mapOf(s), door = m.doors.find(d => d.to === 'village');
  assert.equal(G.reachable(m, m.spawn, { x: door.x + 8, y: door.y + 8 }), true);
  for (const b of m.buildings) if (b.at && b.id !== 'gate') assert.equal(G.reachable(m, m.spawn, b.at), true, b.id);
});

test('vườn lưu cũ chưa có số dải vẫn chơi được', () => {
  const s = game(40, 1e7);
  delete s.farm.strips;
  assert.equal(G.nextStrip(s, 'E').price, LAND_STRIPS[0].price);
});

test('chuyển từ v1: cả vùng 34x27 cũ là đất đã mua, nằm giữa bản đồ lớn', () => {
  const old = JSON.parse(JSON.stringify(G.createGame({ name: 'Cũ' })));
  // dựng bản v1 tối thiểu
  const v1 = { v: 1, name: 'Cũ', plots: Array.from({ length: 36 }, (_, i) => ({ idx: i, unlocked: i < 9, soil: 'untilled', water: 0, weeds: false, crop: null })),
    coins: 10, exp: 0, inv: {}, animals: [], eggs: [], poops: [], decos: [], player: { x: 100, y: 100, dir: 0 }, dog: { x: 50, y: 50 }, nextId: 1 };
  assert.ok(old);
  const s = migrate(v1), o = s.farm.owned;
  assert.deepEqual([o.w, o.h], [34, 27]);
  assert.ok(o.c > 0 && o.r > 0 && o.c + o.w < 64 && o.r + o.h < 48);
  const m = G.mapOf(s);
  assert.equal(m.isOwned(o.c, o.r), true);
  assert.equal(m.isOwned(o.c + 33, o.r + 26), true);
  assert.equal(m.isOwned(o.c - 1, o.r), false);
});
