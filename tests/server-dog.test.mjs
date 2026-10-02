// Seam 3: chó canh khách trong hàng đợi thao tác (issue 31, ADR 0011, 0012). Chó sủa, chó đớp và xúc xích
// đi cùng đường với việc giúp và việc trộm: server kiểm tra bằng chính luật trong state.js rồi xếp hàng.
// Chủ đang online thì server đẩy thẳng sang trình duyệt chủ (kèm hướng chó sủa); chủ vắng thì ghi vào bản lưu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame, stageStart, commandDog, startVisit, dogPost, dogSees, guardRadius, barkOp } from '../public/state.js';
import { GUARD, DOG, TRICKS } from '../public/data.js';
import { TS } from '../public/layout.js';

const LV5 = 500;

async function setup(t) {
  const srv = await bootServer();
  t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const hdr = cookie => ({ headers: { 'content-type': 'application/json', cookie: `nt_session=${cookie}` } });
  const post = (path, body, cookie) => srv.json(path, body, { method: 'POST', ...hdr(cookie) });
  const player = async (name, mutate) => {
    const invite = (await srv.admin('invite')).out;
    const cookie = cookieOf(await post('/api/register', { name, pin: '123456', invite }));
    const { play } = (await post('/api/play', {}, cookie)).body;
    const s = createGame({ name }); s.tutorial = 99; s.exp = LV5; mutate?.(s);
    assert.equal((await post('/api/farm', { play, save: s }, cookie)).status, 200);
    return {
      name, cookie, play,
      ws: () => srv.ws('/ws', { cookie }),
      visit: async n => (await srv.json('/api/visit?name=' + encodeURIComponent(n), undefined, hdr(cookie))).body,
    };
  };
  return { srv, player };
}
async function until(ws, t, ms = 2000) {
  for (;;) { const m = await ws.next(ms); if (m.t === t) return m; }
}
const join = async (ws, msg) => { ws.send({ t: 'join', x: 300, y: 300, dir: 0, ...msg }); return until(ws, 'joined'); };
async function poll(get, pred, ms = 3000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await get();
    if (pred(v)) return v;
    if (Date.now() > end) assert.fail(`chờ quá lâu, giá trị cuối: ${JSON.stringify(v)}`);
    await new Promise(ok => setTimeout(ok, 50));
  }
}
// Vườn chủ có chó Mực trưởng thành, no và vui
const guarded = s => { Object.assign(s.dog, { stage: 'truong', age: stageStart('cho', 'truong'), hunger: 100, happy: 100 }); };

test('chủ đang online: chó sủa được đẩy thẳng sang trình duyệt chủ kèm chỗ thấy khách', async t => {
  const { player } = await setup(t);
  const A = await player('Lan', guarded), B = await player('Bình');
  const a = await A.ws(), b = await B.ws();
  a.send({ t: 'hello', play: A.play });
  await until(a, 'hello');
  await join(a, { map: 'farm' });
  await join(b, { map: 'farm', owner: 'Lan' });
  await until(a, 'enter');

  b.send({ t: 'guest', op: { id: 'bark-0001-aaaa', kind: 'bark', act: 'bark', x: 620, y: 480 } });
  const ack = await until(b, 'guest');
  assert.equal(ack.ok, true);
  const push = await until(a, 'guestop');
  assert.equal(push.op.kind, 'bark');
  assert.equal(push.op.by, 'Bình');
  assert.deepEqual([push.op.x, push.op.y], [620, 480], 'chỗ thấy khách đi kèm để chủ có mũi tên chỉ hướng');
});

test('chủ vắng nhà: chó sủa và chó đớp chỉ ghi vào bản lưu chủ, khách nộp phạt cho chủ', async t => {
  const { player } = await setup(t);
  const A = await player('Lan', guarded), B = await player('Bình');
  const coins0 = (await B.visit('Lan')).farm.coins;
  const b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });

  b.send({ t: 'guest', op: { id: 'bark-0101-aaaa', kind: 'bark', act: 'bark', x: 400, y: 300 } });
  assert.equal((await until(b, 'guest')).ok, true);
  b.send({ t: 'guest', op: { id: 'bite-0102-bbbb', kind: 'bite', act: 'bite', loot: { bap: 2 } } });
  const bite = await until(b, 'guest');
  assert.equal(bite.ok, true);
  assert.equal(bite.reward.fine, GUARD.fine);
  assert.deepEqual(bite.reward.lose, { bap: 2 });

  const seen = await poll(() => B.visit('Lan'), r => r.farm.guests.length >= 2);
  assert.deepEqual(seen.farm.guests.map(g => g.kind), ['bite', 'bark']);
  assert.equal(seen.farm.coins, coins0 + GUARD.fine, 'chủ vườn nhận tiền phạt');
  assert.equal(seen.farm.stats.chased, 1, 'nhật ký chó: đã đuổi được 1 người');
  assert.equal(seen.farm.dog.barkX, 400);
  assert.ok(seen.farm.log.some(l => /Bình bị Mực đớp/.test(l.text)));
  assert.equal((await B.visit('Lan')).farm.stats.chased, 1, 'đọc lại không áp dụng thêm lần nữa');
});

test('xúc xích: server đọc giỏ của khách, không có xúc xích thì từ chối; có thì chó im lặng', async t => {
  const { player } = await setup(t);
  await player('Lan', guarded);
  const B = await player('Bình');
  const C = await player('Chí', s => { s.inv.sausage = 2; });
  const b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });
  b.send({ t: 'guest', op: { id: 'saus-0201-aaaa', kind: 'sausage', act: 'sausage' } });
  const none = await until(b, 'guest');
  assert.equal(none.ok, false);
  assert.equal(none.reason, 'no_item');

  const c = await C.ws();
  await join(c, { map: 'farm', owner: 'Lan' });
  c.send({ t: 'guest', op: { id: 'saus-0202-bbbb', kind: 'sausage', act: 'sausage' } });
  const ok = await until(c, 'guest');
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.reward.lose, { sausage: 1 });
  const seen = await poll(() => C.visit('Lan'), r => r.farm.guests.length >= 1);
  assert.equal(seen.farm.guests[0].kind, 'sausage');

  // thao tác hỏng: mã sai, loại sai, loot không phải vật phẩm
  for (const bad of [
    { id: 'x', kind: 'bark', act: 'bark', x: 1, y: 1 },
    { id: 'saus-0203-cccc', kind: 'bark', act: 'bite' },
    { id: 'saus-0204-dddd', kind: 'bite', act: 'bite', loot: { khongcomon: 3 } },
  ]) {
    c.send({ t: 'guest', op: bad });
    assert.equal((await until(c, 'guest')).reason, 'op_invalid', JSON.stringify(bad));
  }
});

// Issue 45 (tiêu chí seam 3 hoãn tới lúc gộp): chó canh vườn online dùng vòng đời và lệnh Canh khu của chủ.
// Đường thật: chủ ra lệnh gác rồi lưu lên server → khách đọc vườn (GET /api/visit) và dựng bản đi dạo bằng startVisit
// → trình duyệt khách hỏi dogSees (world.js) xem chó có thấy mình không → thấy thì gửi thao tác sủa (barkOp) qua WebSocket
// → server kiểm lại bằng guestOpApply (chó con không canh: từ chối) rồi ghi vào bản lưu chủ.
const guardAt = (s, dc) => {
  guarded(s);
  s.dog.tricks = { sit: TRICKS.sit.sessions, guard: TRICKS.guard.sessions };
  const spot = { c: Math.floor(s.dog.x / TS) + dc, r: Math.floor(s.dog.y / TS) };
  assert.equal(commandDog(s, 'guard', spot).ok, true);
  return spot;
};
const mid = (spot, dc) => ({ x: (spot.c + dc) * TS + 8, y: spot.r * TS + 8 });
const guestOf = name => { const me = createGame({ name }); me.tutorial = 99; me.exp = LV5; return me; };

test('Canh khu online: khách đọc vườn thấy chỗ gác của chủ, chó thấy xa gấp đôi quanh chỗ gác, sủa thì ghi vào vườn chủ', async t => {
  const { player } = await setup(t);
  let spot;
  await player('Lan', s => { spot = guardAt(s, 12); });
  const B = await player('Bình');
  const v = startVisit(guestOf('Bình'), (await B.visit('Lan')).farm, 'Lan');
  assert.deepEqual(dogPost(v), spot, 'bản đi dạo giữ đúng chỗ gác của chủ');
  assert.equal(guardRadius(v), DOG.guardRadius.truong * DOG.guardPostMul);
  const near = mid(spot, DOG.guardRadius.truong + 4), far = mid(spot, DOG.guardRadius.truong * DOG.guardPostMul + 2);
  assert.equal(dogSees(v, near), true, 'cách chỗ gác 10 ô vẫn bị thấy (bán kính 6 ô ×2)');
  assert.equal(dogSees(v, far), false, 'cách 14 ô thì không');

  // khách đứng ở chỗ bị thấy: trình duyệt khách gửi thao tác sủa, server nhận và ghi chỗ thấy vào vườn chủ
  Object.assign(v.player, near);
  const op = barkOp(v).guestOp;
  const b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });
  b.send({ t: 'guest', op });
  assert.equal((await until(b, 'guest')).ok, true);
  const seen = await poll(() => B.visit('Lan'), r => r.farm.guests.length >= 1);
  assert.deepEqual([seen.farm.dog.barkX, seen.farm.dog.barkY], [near.x, near.y]);
  assert.equal(seen.farm.stats.barks, 1);
  assert.deepEqual(dogPost(seen.farm), spot, 'chó vẫn gác chỗ cũ');
});

test('vòng đời chó với khách online: chó con chưa canh (server từ chối sủa), chó già thấy gần hơn chó trưởng thành', async t => {
  const { player } = await setup(t);
  await player('Lan', s => { Object.assign(s.dog, { stage: 'non', age: 0, hunger: 100, happy: 100 }); });
  await player('Chi', s => { Object.assign(s.dog, { stage: 'gia', age: stageStart('cho', 'gia'), hunger: 100, happy: 100 }); });
  const B = await player('Bình');
  const pup = startVisit(guestOf('Bình'), (await B.visit('Lan')).farm, 'Lan');
  assert.equal(guardRadius(pup), 0);
  assert.equal(dogSees(pup, pup.dog), false, 'chó con không thấy cả khách đứng sát bên');
  const b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });
  b.send({ t: 'guest', op: { id: 'bark-0301-aaaa', kind: 'bark', act: 'bark', x: pup.dog.x, y: pup.dog.y } });
  const no = await until(b, 'guest');
  assert.equal(no.ok, false);
  assert.equal(no.reason, 'no_guard', 'server kiểm bằng cùng luật: chó con không canh vườn');

  const old = startVisit(guestOf('Bình'), (await B.visit('Chi')).farm, 'Chi');
  assert.equal(guardRadius(old), DOG.guardRadius.gia);
  const at = d => ({ x: old.dog.x + d * TS, y: old.dog.y });
  assert.equal(dogSees(old, at(DOG.guardRadius.gia - 1)), true);
  assert.equal(dogSees(old, at(DOG.guardRadius.gia + 1)), false, 'chó già mắt kém: 5 ô là không thấy (trưởng thành thấy 6 ô)');
});
