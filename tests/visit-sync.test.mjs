// Seam 1: khách đang đứng trong vườn thấy chủ làm gì ngay (sửa lỗi online: thu hoạch xong cây vẫn nằm đó trên máy khách).
// Trình duyệt chủ gửi phần vườn khách thấy được (visitWorld) mỗi khi vườn đổi; trình duyệt khách áp lên bản đi dạo
// (visitSync) mà không làm nhân vật, con vật nhảy chỗ và không làm mất việc khách vừa làm mà chủ chưa kịp nhận.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startVisit, visitWorld, visitSync, perform, guestOpApply, helpLeft, sceneMap, moveEntity, barkOp, stageStart } from '../public/state.js';
import { setClock } from '../public/clock.js';
import { GUEST } from '../public/data.js';

const T0 = Date.UTC(2026, 9, 2, 3, 0);   // 10h sáng giờ Việt Nam
let clock = T0;
test.beforeEach(() => { clock = T0; setClock(() => clock); });
test.after(() => setClock(null));

const crop = (p, extra = {}) => { p.soil = 'tilled'; p.crop = { id: 'cai', progress: 0.5, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, ...extra }; };
// vườn chủ Lan (đang online): ô 0 cải đã chín, ô 1 cải đang lớn và khô nước; khách Bình đang đứng trong vườn
function setup() {
  const host = createGame({ name: 'Lan' }); host.tutorial = 99; host.mode = 'online';
  crop(host.plots[0], { progress: 1 }); host.plots[0].water = 100;
  crop(host.plots[1]); host.plots[1].water = 0;
  const me = createGame({ name: 'Bình' }); me.tutorial = 99; me.mode = 'online';
  me.scene = 'village';
  const v = startVisit(me, JSON.parse(JSON.stringify(host)), 'Lan');
  return { host, me, v };
}
// tin chủ gửi đi qua WebSocket (JSON thật, không chung đối tượng với vườn chủ)
const wire = h => JSON.parse(JSON.stringify(visitWorld(h)));

test('chủ thu hoạch: khách áp phần vườn chủ gửi thì ô đó trống ngay; phần của khách (xu, giỏ, chỗ đứng) không đổi', () => {
  const { host, me, v } = setup();
  assert.equal(v.plots[0].crop.id, 'cai');
  assert.equal(perform(host, { kind: 'plot', idx: 0 }, 'harvest').ok, true);
  assert.equal(host.plots[0].crop, null);
  v.player.x += 40;
  const coins = me.coins, basket = JSON.stringify(me.basket), pos = { ...v.player };
  assert.equal(visitSync(v, wire(host)), true);
  assert.equal(v.plots[0].crop, null, 'cây chủ vừa thu hoạch không còn trên máy khách');
  assert.equal(v.plots[1].crop.id, 'cai');
  assert.equal(v.coins, coins);
  assert.equal(JSON.stringify(v.basket), basket);
  assert.deepEqual(v.player, pos);
  assert.equal(v.name, 'Bình');
  assert.equal(v.scene, 'visit');
  assert.equal(v.visit.owner, 'Lan');
});

test('phần gửi đi chỉ có phần vườn khách thấy được, không có xu, kho, giỏ của chủ; quạ thì có, thằng Tèo thì không', () => {
  const { host } = setup();
  host.threats = [{ id: 901, kind: 'crow', plot: 1, x: 10, y: 10, arriveAt: 0, state: 'eating', since: 0 }, { id: 902, kind: 'teo', plot: 0, state: 'coming' }];
  const w = wire(host);
  for (const k of ['coins', 'exp', 'inv', 'basket', 'name', 'look', 'player', 'stats', 'log']) assert.equal(w[k], undefined, k);
  assert.deepEqual(w.threats.map(t => t.id), [901]);
  assert.ok(Array.isArray(w.plots) && Array.isArray(w.animals));
  const { v } = setup();
  visitSync(v, w);
  assert.deepEqual(v.threats.map(t => t.id), [901]);
});

test('con vật, mèo, chó, quạ giữ chỗ đứng trên máy khách (khỏi nhảy chỗ); con mới xuất hiện, con đã bán thì biến mất; chó vẫn ở lại vườn', () => {
  const { host, v } = setup();
  const [a0, a1] = v.animals;
  a0.x += 5; a0.y += 3;
  const local = { x: a0.x, y: a0.y };
  v.dog.x += 7; const dogAt = { x: v.dog.x, y: v.dog.y };
  host.animals = host.animals.filter(a => a.id !== a1.id);   // chủ bán một con
  host.animals.push({ ...structuredClone(host.animals[0]), id: 777, name: 'Gà mới', x: 400, y: 400 });
  host.dog.cmd = { id: 'follow' };
  host.dog.scene = 'house';
  visitSync(v, wire(host));
  const b0 = v.animals.find(a => a.id === a0.id);
  assert.deepEqual({ x: b0.x, y: b0.y }, local);
  assert.equal(v.animals.some(a => a.id === a1.id), false);
  assert.deepEqual(v.animals.find(a => a.id === 777) && { x: 400, y: 400 }, { x: 400, y: 400 });
  assert.deepEqual({ x: v.dog.x, y: v.dog.y }, dogAt);
  assert.equal(v.dog.scene, 'farm');
  assert.equal(v.dog.cmd, null);
});

test('bố cục vườn không đổi thì giữ nguyên bản đồ (khỏi dựng lại); chủ dời công trình thì khách thấy bố cục mới', () => {
  const { host, v } = setup();
  const m = sceneMap(v);
  visitSync(v, wire(host));
  assert.equal(sceneMap(v), m);
  const bin = host.farm.ents.find(e => e.kind === 'shipbin');
  const r = [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 3]].map(([dc, dr]) => moveEntity(host, bin.id, bin.c + dc, bin.r + dr)).find(x => x.ok);
  assert.ok(r, 'dời được thùng giao hàng');
  visitSync(v, wire(host));
  assert.notEqual(sceneMap(v), m);
  const moved = host.farm.ents.find(e => e.kind === 'shipbin');
  assert.deepEqual(v.farm.ents.find(e => e.kind === 'shipbin'), moved);
});

test('việc khách vừa làm mà chủ chưa nhận vẫn hiện trên máy khách; chủ nhận rồi thì không tính hai lần', () => {
  const { host, v } = setup();
  const r = perform(v, { kind: 'plot', idx: 1 }, 'help_water');
  assert.equal(r.ok, true);
  assert.equal(v.plots[1].water, 100);
  // tin của chủ gửi trước khi thao tác tới chủ: ô vẫn được tưới, lượt giúp vẫn trừ
  visitSync(v, wire(host));
  assert.equal(v.plots[1].water, 100);
  assert.equal(helpLeft(v), GUEST.helpMax - 1);
  // chủ đã áp dụng thao tác: vẫn tưới, chỉ trừ một lượt
  assert.equal(guestOpApply(host, { name: 'Bình', level: 1 }, r.guestOp).ok, true);
  visitSync(v, wire(host));
  assert.equal(v.plots[1].water, 100);
  assert.equal(helpLeft(v), GUEST.helpMax - 1);
  // chủ nhận rồi thì thôi giữ: chủ tưới cạn lại (vd ô đã thu hoạch, trồng lại) thì khách thấy đúng như chủ
  host.plots[1].water = 0;
  visitSync(v, wire(host));
  assert.equal(v.plots[1].water, 0);
});

test('việc khách làm mà lâu quá chủ vẫn không có (server từ chối, tin lạc) thì thôi giữ', () => {
  const { host, v } = setup();
  perform(v, { kind: 'plot', idx: 1 }, 'help_water');
  clock += 60_000;
  visitSync(v, wire(host));
  assert.equal(v.plots[1].water, 0);
  assert.equal(helpLeft(v), GUEST.helpMax);
});

test('chó vừa sủa khách: tin của chủ chưa có lần sủa đó thì chó vẫn đang nghỉ, không sủa lại ngay', () => {
  const { host } = setup();
  Object.assign(host.dog, { stage: 'truong', age: stageStart('cho', 'truong'), hunger: 100, happy: 100, chained: false });
  const v = startVisit(createGame({ name: 'Bình' }), JSON.parse(JSON.stringify(host)), 'Lan');
  assert.ok(barkOp(v), 'chó sủa lần đầu');
  visitSync(v, wire(host));
  assert.equal(barkOp(v).guestOp ?? null, null, 'không báo chủ lại ngay (chó vẫn sủa cho khách nghe)');
});

test('tin hỏng (không phải vườn) thì bỏ qua, bản đi dạo vẫn nguyên', () => {
  const { v } = setup();
  const before = JSON.stringify(v.plots);
  for (const bad of [null, 1, 'x', [], { plots: 5 }, { plots: [], animals: 'x' }]) assert.equal(visitSync(v, bad), false);
  assert.equal(visitSync(createGame({ name: 'X' }), {}), false, 'không phải bản đi dạo');
  assert.equal(JSON.stringify(v.plots), before);
});
