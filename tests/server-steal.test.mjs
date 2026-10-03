// Seam 3: hàng đợi thao tác trộm (issue 30, ADR 0011, 0012). Luật nằm trong state.js, server chỉ kiểm tra,
// xếp hàng rồi đẩy sang trình duyệt chủ nếu chủ online. Bản lưu khách khai nhiều vụ trộm hơn số server đã
// nhận thì bị từ chối (chống gian lận nhẹ).
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame } from '../public/state.js';
import { serverDay } from '../public/clock.js';
import { CROPS, GUEST, starKey, sellPrice } from '../public/data.js';

const LV5 = 500;   // đủ kinh nghiệm để lên cấp 5
const BAP2 = starKey('bap', 2);   // ô 0 bón phân, không khô, không sâu: bắp ★2 (issue 52)

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
      push: save => post('/api/farm', { play, save }, cookie),
      farm: async () => (await srv.json('/api/farm', undefined, hdr(cookie))).body,
      visit: async n => (await srv.json('/api/visit?name=' + encodeURIComponent(n), undefined, hdr(cookie))).body,
    };
  };
  return { srv, player, post, hdr };
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

const ripe = (p, id = 'bap', fert = false) => {
  p.soil = 'tilled'; p.water = 100;
  p.crop = { id, progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
};
// vườn chủ: ô 0 bắp bón phân (9 bắp), ô 1..5 bắp thường — đủ giá trị để không chạm trần 30% ngay vụ đầu
const garden = s => { ripe(s.plots[0], 'bap', true); for (let i = 1; i <= 5; i++) ripe(s.plots[i], 'bap'); };
const op = (id, act, extra) => ({ id, kind: 'steal', act, ...extra });

test('vụ trộm hợp lệ được nhận, vào hàng đợi, đẩy tới chủ online và ghi nhật ký; cùng mã gửi lại chỉ tính một lần', async t => {
  const { player } = await setup(t);
  const A = await player('Lan', garden), B = await player('Bình');
  const a = await A.ws(), b = await B.ws();
  a.send({ t: 'hello', play: A.play });
  await until(a, 'hello');
  await join(a, { map: 'farm' });
  await join(b, { map: 'farm', owner: 'Lan' });
  await until(a, 'enter');

  b.send({ t: 'guest', op: op('steal-0001-aaaa', 'crop', { idx: 0 }) });
  const ack = await until(b, 'guest');
  assert.equal(ack.ok, true);
  assert.equal(ack.id, 'steal-0001-aaaa');
  assert.deepEqual(ack.reward.items, { [BAP2]: 2 });   // 25% của 9 bắp
  assert.equal(ack.reward.steal, 1);
  // chủ đang online: server đẩy thao tác sang trình duyệt chủ
  const push = await until(a, 'guestop');
  assert.equal(push.op.kind, 'steal');
  assert.equal(push.op.act, 'crop');
  assert.equal(push.op.by, 'Bình');
  assert.ok(Number.isInteger(push.op.room), 'server điền chỗ trống trong giỏ khách để hai nơi ra cùng kết quả');

  // cùng mã gửi lại: không trộm thêm lần nữa
  b.send({ t: 'guest', op: op('steal-0001-aaaa', 'crop', { idx: 0 }) });
  const dup = await until(b, 'guest');
  assert.equal(dup.ok, false);
  assert.equal(dup.reason, 'done');

  // chủ rớt mạng: lần đọc vườn sau server áp dụng hàng đợi đúng một lần
  a.close(); await a.closed;
  const seen = await poll(() => B.visit('Lan'), r => r.farm.plots[0].crop.stolen === 2);
  assert.deepEqual(seen.farm.plots[0].crop.robbed, ['Bình']);
  assert.equal(seen.farm.today.steals, 1);
  assert.equal(seen.farm.today.stolen, 2 * sellPrice(BAP2));
  assert.deepEqual(seen.farm.guests.map(g => [g.kind, g.by, g.item, g.qty, g.seen]), [['steal', 'Bình', BAP2, 2, false]]);
  assert.equal((await B.visit('Lan')).farm.today.steals, 1, 'đọc lại không áp dụng thêm lần nữa');
});

test('vụ trộm vượt giới hạn bị từ chối đúng lý do và không vào hàng đợi', async t => {
  const { player } = await setup(t);
  // vườn chỉ có một ô cà chua: trần 30% mỗi ngày chỉ chịu được một vụ
  const A = await player('Lan', s => { ripe(s.plots[0], 'cachua'); });
  const New = await player('Tí', s => { s.exp = 0; ripe(s.plots[0], 'cachua'); });
  const B = await player('Bình');
  const Kid = await player('Bé', s => { s.exp = 0; });
  const b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });

  b.send({ t: 'guest', op: op('steal-0101-aaaa', 'crop', { idx: 0 }) });
  assert.equal((await until(b, 'guest')).ok, true);
  b.send({ t: 'guest', op: op('steal-0102-bbbb', 'crop', { idx: 0 }) });
  const over = await until(b, 'guest');
  assert.equal(over.ok, false);
  assert.equal(over.reason, 'robbed', 'cùng một người không trộm lại ô đó');

  // ô trống: không có gì để trộm
  b.send({ t: 'guest', op: op('steal-0103-cccc', 'crop', { idx: 9 }) });
  assert.equal((await until(b, 'guest')).reason, 'nothing');
  // thao tác hỏng
  for (const bad of [op('x', 'crop', { idx: 0 }), op('steal-0104-dddd', 'dance', { idx: 0 }), op('steal-0105-eeee', 'crop', { idx: -1 })]) {
    b.send({ t: 'guest', op: bad });
    assert.equal((await until(b, 'guest')).reason, 'op_invalid', JSON.stringify(bad));
  }

  // vườn chủ dưới cấp 5: không bị trộm
  const b2 = await B.ws();
  await join(b2, { map: 'farm', owner: 'Tí' });
  b2.send({ t: 'guest', op: op('steal-0106-ffff', 'crop', { idx: 0 }) });
  const small = await until(b2, 'guest');
  assert.equal(small.reason, 'host_new');
  assert.equal(small.msg, 'Vườn này còn quá nhỏ để trộm');
  // khách dưới cấp 5: không đi trộm được
  const k = await Kid.ws();
  await join(k, { map: 'farm', owner: 'Lan' });
  k.send({ t: 'guest', op: op('steal-0107-gggg', 'crop', { idx: 0 }) });
  const kid = await until(k, 'guest');
  assert.equal(kid.reason, 'guest_new');
  assert.match(kid.msg, new RegExp(`cấp ${GUEST.stealLv}`));

  // chỉ vụ đầu vào hàng đợi
  const seen = await poll(() => Kid.visit('Lan'), r => r.farm.today.steals === 1);
  assert.equal(seen.farm.guests.length, 1);
  assert.equal((await Kid.visit('Tí')).farm.plots[0].crop.stolen, undefined);
});

test('bản lưu của khách khai nhiều vụ trộm hơn số server đã nhận thì bị từ chối', async t => {
  const { player } = await setup(t);
  const A = await player('Lan', garden), B = await player('Bình');
  const day = serverDay(Date.now());

  // chưa trộm vụ nào mà bản lưu khai 5 vụ (và ôm theo một giỏ bắp): từ chối
  const fake = (await B.farm()).farm;
  fake.today = { day, helps: 0, steals: 0, stolen: 0, robs: 5 };
  fake.basket = { bap: 40 };
  fake.savedAt = Date.now();
  const bad = await B.push(fake);
  assert.equal(bad.status, 422);
  assert.equal(bad.body.code, 'implausible');
  assert.equal(bad.body.reason, 'steals');

  // trộm thật một vụ rồi khai một vụ: nhận
  const b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });
  b.send({ t: 'guest', op: op('steal-0201-aaaa', 'crop', { idx: 0 }) });
  const ack = await until(b, 'guest');
  assert.equal(ack.ok, true);
  const real = (await B.farm()).farm;
  real.today = { day, helps: 0, steals: 0, stolen: 0, robs: 1 };
  real.basket = { bap: 2 };
  real.savedAt = Date.now();
  assert.equal((await B.push(real)).status, 200);
  assert.equal((await B.farm()).farm.today.robs, 1);

  // vườn của chính B bị trộm (today.steals) không phải là vụ B đi trộm: không bị chặn nhầm
  const robbed = (await B.farm()).farm;
  robbed.today = { day, helps: 0, steals: 4, stolen: 99, robs: 1 };
  robbed.savedAt = Date.now();
  assert.equal((await B.push(robbed)).status, 200);
});
