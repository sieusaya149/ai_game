// Seam 3: hàng đợi thao tác của khách (issue 28, ADR 0011, 0012). Server chỉ kiểm tra bằng luật trong state.js,
// ghi vào hàng đợi rồi đẩy sang trình duyệt chủ nếu chủ online; chủ offline thì chạy bù (issue 24) rồi áp dụng ngay.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame } from '../public/state.js';
import { GUEST } from '../public/data.js';

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
    const s = createGame({ name }); s.tutorial = 99; mutate?.(s);
    assert.equal((await post('/api/farm', { play, save: s }, cookie)).status, 200);
    return {
      name, cookie, play,
      ws: () => srv.ws('/ws', { cookie }),
      push: save => post('/api/farm', { play, save }, cookie),
      claim: () => post('/api/play', {}, cookie),
      farm: async () => (await srv.json('/api/farm', undefined, hdr(cookie))).body,
      visit: async n => (await srv.json('/api/visit?name=' + encodeURIComponent(n), undefined, hdr(cookie))).body,
    };
  };
  return { srv, player, post, hdr };
}
async function until(ws, t, ms = 2000) {
  for (;;) { const m = await ws.next(ms); if (m.t === t) return m; }
}
async function none(ws, types, ms = 400) {
  const end = Date.now() + ms;
  for (;;) {
    const left = end - Date.now();
    if (left <= 0) return;
    let m;
    try { m = await ws.next(left); } catch { return; }
    assert.ok(!types.includes(m.t), `không được nhận ${m.t}: ${JSON.stringify(m)}`);
  }
}
const join = async (ws, msg) => { ws.send({ t: 'join', x: 300, y: 300, dir: 0, ...msg }); return until(ws, 'joined'); };
// chờ tới khi `pred(giá trị)` đúng (vd server nhận ra chủ vườn đã rớt kết nối)
async function poll(get, pred, ms = 3000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await get();
    if (pred(v)) return v;
    if (Date.now() > end) assert.fail(`chờ quá lâu, giá trị cuối: ${JSON.stringify(v)}`);
    await new Promise(ok => setTimeout(ok, 50));
  }
}

const crop = (p, extra = {}) => { p.soil = 'tilled'; p.crop = { id: 'cai', progress: 0.3, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, ...extra }; };
// vườn chủ: ô 0 cây khô cần tưới, ô 2 cây đủ nước không có cỏ
const garden = s => { crop(s.plots[0]); s.plots[0].water = 0; crop(s.plots[2]); s.plots[2].water = 100; };
const op = (id, act, extra) => ({ id, kind: 'help', act, ...extra });

test('thao tác hợp lệ được nhận, vào hàng đợi và đẩy tới chủ đang online; thao tác bị luật từ chối thì trả lý do và không vào hàng đợi', async t => {
  const { player } = await setup(t);
  const A = await player('Lan', garden), B = await player('Bình');
  const a = await A.ws(), b = await B.ws();
  a.send({ t: 'hello', play: A.play });
  await until(a, 'hello');
  await join(a, { map: 'farm' });                     // chủ đang ở vườn mình, đang online
  // chưa vào vườn ai thì chưa gửi thao tác được
  b.send({ t: 'guest', op: op('help-0000-zzzz', 'water', { idx: 0 }) });
  assert.equal((await until(b, 'guest')).reason, 'not_joined');

  await join(b, { map: 'farm', owner: 'Lan' });
  await until(a, 'enter');
  b.send({ t: 'guest', op: op('help-0001-aaaa', 'water', { idx: 0 }) });
  const ack = await until(b, 'guest');
  assert.equal(ack.ok, true);
  assert.equal(ack.id, 'help-0001-aaaa');
  assert.deepEqual(ack.reward, { coins: GUEST.helpCoins, exp: GUEST.helpExp });
  // chủ đang online: server đẩy thao tác sang trình duyệt chủ (trình duyệt chủ áp dụng rồi gửi bản lưu lên)
  const push = await until(a, 'guestop');
  assert.equal(push.op.id, 'help-0001-aaaa');
  assert.equal(push.op.act, 'water');
  assert.equal(push.op.idx, 0);
  assert.equal(push.op.by, 'Bình');
  assert.ok(Number.isFinite(push.op.at));
  assert.equal((await A.farm()).farm.plots[0].water, 0);   // server không tự ghi đè bản lưu của chủ đang online

  // ô 2 không có cỏ: luật từ chối, không vào hàng đợi, chủ không nhận gì
  b.send({ t: 'guest', op: op('help-0002-bbbb', 'weed', { idx: 2 }) });
  const no = await until(b, 'guest');
  assert.equal(no.ok, false);
  assert.equal(no.reason, 'nothing');
  assert.match(no.msg, /không còn gì để làm/i);
  assert.equal(no.reward, undefined);
  await none(a, ['guestop']);

  // chủ gửi bản lưu mới (chưa áp dụng thao tác nào) rồi rớt mạng: lần đọc vườn sau server áp dụng hàng đợi
  const mine = (await A.farm()).farm;
  mine.plots[2].weeds = true;
  mine.savedAt = Date.now();
  assert.equal((await A.push(mine)).status, 200);
  a.close(); await a.closed;
  const seen = await poll(() => B.visit('Lan'), r => r.farm.plots[0].water === 100);
  assert.equal(seen.farm.plots[2].weeds, true, 'thao tác bị từ chối không vào hàng đợi');
  assert.equal(seen.farm.today.helps, 1);
  assert.equal(seen.farm.guests.length, 1);
  assert.equal(seen.farm.guests[0].by, 'Bình');
  assert.equal((await B.visit('Lan')).farm.today.helps, 1, 'đọc lại không áp dụng thêm lần nữa');
});

test('chủ offline: khách giúp thì server chạy bù rồi áp dụng ngay; chạy bù một lần, chủ đăng nhập vào không áp dụng lại', async t => {
  const { player } = await setup(t);
  // chủ vắng 3 tiếng; ô 1 là đất trống đầy cỏ (cỏ không tự mất lúc chạy bù, khác cây có thể chín hay chết)
  const A = await player('Lan', s => { garden(s); s.plots[1].soil = 'tilled'; s.plots[1].weeds = true; s.savedAt = Date.now() - 3 * 3600_000; });
  const B = await player('Bình');
  const b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });
  b.send({ t: 'guest', op: op('help-0101-cccc', 'weed', { idx: 1 }) });
  assert.equal((await until(b, 'guest')).ok, true);

  const r1 = await B.visit('Lan');
  assert.equal(r1.farm.plots[1].weeds, false, 'khách giúp xong đọc lại thấy ô đã được nhổ cỏ');
  assert.ok(r1.farm.simMs > 2 * 3600_000, 'đã chạy bù 3 tiếng vắng nhà');
  const r2 = await B.visit('Lan');
  assert.equal(r2.farm.simMs, r1.farm.simMs, 'chạy bù chỉ chạy một lần');
  assert.equal(r2.farm.today.helps, 1);

  // chủ đăng nhập vào: nhận đúng vườn đã được giúp, thao tác không áp dụng lặp lại
  const got = (await A.claim()).body;
  assert.equal(got.farm.plots[1].weeds, false);
  assert.equal(got.farm.today.helps, 1);
  assert.deepEqual(got.farm.guests.map(g => [g.id, g.by, g.act, g.seen]), [['help-0101-cccc', 'Bình', 'weed', false]]);
  assert.equal((await A.farm()).farm.today.helps, 1);
});

test('chủ online vừa tự tưới ô rồi khách tưới cùng ô: "không còn gì để làm", không lỗi, khách không nhận thưởng', async t => {
  const { player } = await setup(t);
  const A = await player('Lan', garden), B = await player('Bình');
  const a = await A.ws(), b = await B.ws();
  a.send({ t: 'hello', play: A.play });
  await until(a, 'hello');
  await join(a, { map: 'farm' });
  await join(b, { map: 'farm', owner: 'Lan' });
  await until(a, 'enter');
  // chủ tự tưới ô 0 rồi gửi bản lưu lên
  const mine = (await A.farm()).farm;
  mine.plots[0].water = 100;
  mine.savedAt = Date.now();
  assert.equal((await A.push(mine)).status, 200);

  b.send({ t: 'guest', op: op('help-0201-dddd', 'water', { idx: 0 }) });
  const r = await until(b, 'guest');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'nothing');
  assert.equal(r.reward, undefined);
  await none(a, ['guestop', 'error']);
  await none(b, ['error']);
  assert.equal((await A.farm()).farm.today.helps, 0);
});

test('hết 10 lượt giúp trong ngày thì từ chối kèm lý do; thao tác hỏng hoặc vườn của chính mình cũng bị từ chối', async t => {
  const { player } = await setup(t);
  const day = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const A = await player('Lan', s => { garden(s); s.today = { day, helps: GUEST.helpMax, steals: 0, stolen: 0 }; });
  const B = await player('Bình');
  const b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });
  b.send({ t: 'guest', op: op('help-0301-eeee', 'water', { idx: 0 }) });
  const r = await until(b, 'guest');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'help_full');
  assert.equal(r.msg, 'Vườn này hôm nay đã được giúp đủ');

  for (const bad of [{ id: 'x', kind: 'help', act: 'water', idx: 0 }, op('help-0302-ffff', 'dance', { idx: 0 }), op('help-0303-gggg', 'water', { idx: -1 }), { id: 'help-0304-hhhh', kind: 'steal', act: 'water', idx: 0 }]) {
    b.send({ t: 'guest', op: bad });
    assert.equal((await until(b, 'guest')).reason, 'op_invalid', JSON.stringify(bad));
  }
  // vườn của chính mình thì không có chuyện giúp
  const a = await B.ws();
  await join(a, { map: 'farm', owner: 'Bình' });
  a.send({ t: 'guest', op: op('help-0305-iiii', 'water', { idx: 0 }) });
  assert.equal((await until(a, 'guest')).reason, 'self');
});
