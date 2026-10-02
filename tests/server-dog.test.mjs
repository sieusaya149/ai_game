// Seam 3: chó canh khách trong hàng đợi thao tác (issue 31, ADR 0011, 0012). Chó sủa, chó đớp và xúc xích
// đi cùng đường với việc giúp và việc trộm: server kiểm tra bằng chính luật trong state.js rồi xếp hàng.
// Chủ đang online thì server đẩy thẳng sang trình duyệt chủ (kèm hướng chó sủa); chủ vắng thì ghi vào bản lưu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame } from '../public/state.js';
import { GUARD } from '../public/data.js';

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
const guarded = s => { Object.assign(s.dog, { adult: true, hunger: 100, happy: 100 }); };

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
