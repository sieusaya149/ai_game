// Seam 1: thăm vườn người khác (issue 27). Bản đồ khách dựng từ bản lưu chủ, chỉ đọc; luật khách nằm trong state.js (ADR 0012).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startVisit, guestCheck, actionsFor, perform, sceneMap, mapOf, placeDeco } from '../public/state.js';
import { TS } from '../public/layout.js';

// vườn chủ: có thêm đồ trang trí, cây đang lớn, một con gà; khách là người chơi khác
function setup() {
  const host = createGame({ name: 'Lan' }); host.tutorial = 99;
  host.inv.deco_flower = 1;
  placeDeco(host, 'deco_flower');
  host.plots[0].soil = 'tilled';
  host.plots[0].crop = { id: 'cai', progress: 0.5, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
  const raw = JSON.parse(JSON.stringify(host));
  const me = createGame({ name: 'Bình', look: { shirt: 3 } }); me.tutorial = 99;
  me.scene = 'village'; Object.assign(me.player, { x: 480, y: 360 });
  return { host, raw, me, v: startVisit(me, raw, 'Lan') };
}
const house = { kind: 'building', id: 'house' };

test('bản đồ khách: đúng các thực thể của vườn chủ, đứng ở cổng ra, lưới va chạm như vườn chủ trừ cửa nhà bị chắn', () => {
  const { host, raw, v } = setup();
  const m = sceneMap(v), own = mapOf(host);
  assert.equal(m.scene, 'visit');
  assert.equal(v.visit.owner, 'Lan');
  // thực thể: công trình, khối ruộng, đồ trang trí, chuồng, cây, con vật, chó đều của chủ
  assert.deepEqual(m.buildings.map(b => [b.id, b.foot]), own.buildings.map(b => [b.id, b.foot]));
  assert.deepEqual(m.fields.map(f => [f.c, f.r]), own.fields.map(f => [f.c, f.r]));
  assert.deepEqual(m.decos.map(d => [d.kind, d.x, d.y]), own.decos.map(d => [d.kind, d.x, d.y]));
  assert.ok(m.decos.some(d => d.kind === 'deco_flower'));
  assert.deepEqual(Object.keys(m.pens), Object.keys(own.pens));
  assert.equal(m.trees.length, own.trees.length);
  assert.deepEqual(v.animals.map(a => a.type), raw.animals.map(a => a.type));
  assert.equal(v.plots[0].crop.progress, 0.5);
  assert.equal(v.dog.name, raw.dog.name);
  // cổng ra: khách tới đứng ngay trong cổng, chỉ còn một lối là cổng ra làng
  assert.deepEqual(m.exit, own.arrive.village);
  assert.deepEqual({ x: v.player.x, y: v.player.y }, { x: m.exit.x, y: m.exit.y });
  assert.deepEqual(m.doors.map(d => d.to), ['village']);
  assert.ok(own.doors.some(d => d.to === 'house'));
  // va chạm: giống hệt vườn chủ, trừ các ô cửa nhà (khách không bước vào nhà được)
  const door = own.doors.find(d => d.to === 'house'), dc = door.x / TS, dr = door.y / TS;
  const diff = [];
  for (let r = 0; r < own.mh; r++) for (let c = 0; c < own.mw; c++) if (m.isSolid(c, r) !== own.isSolid(c, r)) diff.push([c, r]);
  assert.deepEqual(diff, [[dc, dr], [dc + 1, dr]]);
  assert.equal(m.isSolid(dc, dr), true);
  const gate = own.doors.find(d => d.to === 'village');
  assert.equal(m.isSolid(gate.x / TS, gate.y / TS), false);
  // vật chặn: nhà, kho, thùng giao hàng (và bảng đơn) mang lý do cho khách; cổng, giếng thì không
  for (const id of ['house', 'shed', 'shipbin', 'board']) assert.ok(m.building(id).guest, id);
  for (const id of ['gate', 'well']) assert.equal(m.building(id).guest, undefined, id);
  // vườn chủ vẫn nguyên: không đánh dấu gì, cửa nhà vẫn mở
  assert.equal(own.building('house').guest, undefined);
  assert.equal(sceneMap(host).scene, 'farm');
});

test('luật khách: mở nhà, kho, thùng giao hàng, chế độ xây dựng đều bị từ chối kèm lý do; ra cổng thì về làng', () => {
  const { v } = setup();
  const want = { house: 'Đây là nhà riêng của chủ vườn', shed: 'Kho riêng của chủ vườn, khách không mở được', shipbin: 'Thùng giao hàng của chủ vườn, khách không mở được' };
  for (const [id, msg] of Object.entries(want)) {
    const t = { kind: 'building', id };
    assert.deepEqual(guestCheck(v, t), { ok: false, reason: 'private', msg }, id);
    const acts = actionsFor(v, t);
    assert.ok(acts.length && acts.every(a => a.disabled === msg), id);
    const r = perform(v, t, acts[0].id);
    assert.equal(r.ok, false); assert.equal(r.msg, msg);
    assert.equal(r.open, undefined); assert.equal(r.go, undefined);
  }
  assert.equal(guestCheck(v, { kind: 'build' }).reason, 'build');
  assert.match(guestCheck(v, { kind: 'build' }).msg, /chủ vườn/);
  // ruộng: chỉ có việc giúp (issue 28, xem tests/help.test.mjs); con vật, máng, giếng: khách chưa làm được gì
  assert.deepEqual(actionsFor(v, { kind: 'plot', idx: 0 }).map(a => a.id), ['help_water']);
  assert.deepEqual(actionsFor(v, { kind: 'animal', id: v.animals[0].id }), []);
  assert.deepEqual(actionsFor(v, { kind: 'building', id: 'well' }), []);
  assert.equal(guestCheck(v, { kind: 'plot', idx: 0 }).reason, 'guest');
  assert.equal(perform(v, { kind: 'plot', idx: 0 }, 'water').ok, false);
  // cổng: ra làng
  assert.ok(guestCheck(v, { kind: 'building', id: 'gate' }).ok);
  const r = perform(v, { kind: 'building', id: 'gate' }, actionsFor(v, { kind: 'building', id: 'gate' })[0].id);
  assert.equal(r.go, 'village');
});

test('chó lạ: chưa cho ăn thì không cho vuốt ve; khách cho ăn bằng đồ trong giỏ của mình rồi thì vuốt được', () => {
  const { v, me, raw } = setup();
  const dog = { kind: 'dog' };
  assert.deepEqual(guestCheck(v, dog, 'pet'), { ok: false, reason: 'stranger', msg: `${raw.dog.name} chưa quen bạn, cho ăn trước đã 🦴` });
  assert.equal(perform(v, dog, 'pet').ok, false);
  // xương trong kho không tính: phải có trong giỏ
  me.inv.dogfood = 5;
  assert.deepEqual(me.basket, {});
  assert.equal(guestCheck(v, dog, 'feed').reason, 'no_food');
  assert.equal(actionsFor(v, dog).find(a => a.id === 'feed').disabled, guestCheck(v, dog, 'feed').msg);
  me.basket.dogfood = 2;
  assert.ok(guestCheck(v, dog, 'feed').ok);
  assert.equal(perform(v, dog, 'feed').ok, true);
  assert.equal(me.basket.dogfood, 1);   // trừ trong giỏ của khách
  assert.equal(me.inv.dogfood, 5);
  assert.ok(guestCheck(v, dog, 'pet').ok);
  const r = perform(v, dog, 'pet');
  assert.equal(r.ok, true);
  assert.equal(actionsFor(v, dog)[0].id, 'pet');
  assert.equal(actionsFor(v, dog)[0].disabled, undefined);
});

test('thăm vườn không đụng tới bản lưu chủ; phần của khách (xu, giỏ) vẫn là của khách', () => {
  const { v, me, raw } = setup();
  const copy = structuredClone(raw);
  me.basket.dogfood = 1;
  perform(v, { kind: 'dog' }, 'feed'); perform(v, { kind: 'dog' }, 'pet');
  perform(v, house, 'enter');
  v.player.x += 40;
  assert.deepEqual(raw, copy);
  // HUD đọc của khách: tên, ngoại hình, xu; xu đổi ở bản thăm là đổi của khách
  assert.equal(v.name, 'Bình'); assert.equal(v.look.shirt, 3);
  v.coins += 7;
  assert.equal(me.coins, v.coins);
  // khách vẫn đứng ở làng trong bản lưu của mình
  assert.equal(me.scene, 'village');
  assert.deepEqual({ x: me.player.x, y: me.player.y }, { x: 480, y: 360 });
  assert.equal(startVisit(me, { bogus: true }, 'X'), null);
});
