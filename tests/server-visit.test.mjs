// Seam 3: thăm vườn người khác (issue 27). Vườn là bản đồ real-time riêng của chủ: chủ và khách cùng vào thì thấy nhau,
// chủ nhận "khách ghé" khi khách là bạn mình (issue 26); đọc vườn người khác chỉ đọc, không ghi được gì vào vườn chủ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame } from '../public/state.js';

async function setup(t) {
  const srv = await bootServer();
  t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const hdr = cookie => ({ headers: { 'content-type': 'application/json', cookie: `nt_session=${cookie}` } });
  const post = (path, body, cookie) => srv.json(path, body, { method: 'POST', ...hdr(cookie) });
  // người chơi mới: đăng ký, có vườn trên server, mở được WebSocket
  const player = async (name, mutate) => {
    const invite = (await srv.admin('invite')).out;
    const cookie = cookieOf(await post('/api/register', { name, pin: '123456', invite }));
    const { play } = (await post('/api/play', {}, cookie)).body;
    const s = createGame({ name }); s.tutorial = 99; mutate?.(s);
    assert.equal((await post('/api/farm', { play, save: s }, cookie)).status, 200);
    return {
      name, cookie, play,
      ws: () => srv.ws('/ws', { cookie }),
      farm: async () => (await srv.json('/api/farm', undefined, hdr(cookie))).body,
      visit: async n => srv.json('/api/visit?name=' + encodeURIComponent(n), undefined, hdr(cookie)),
      befriend: async n => assert.equal((await post('/api/friends', { name: n }, cookie)).status, 200),
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

test('vườn real-time: chủ và khách trong vườn A thấy vị trí của nhau, người ở làng thì không; chủ nhận "khách ghé" khi bạn mình vào', async t => {
  const { player } = await setup(t);
  const A = await player('Lan'), B = await player('Bình'), C = await player('Chị Tư'), D = await player('Đào');
  await A.befriend('Bình');   // B là bạn của A; D thì không
  const a = await A.ws(), b = await B.ws(), c = await C.ws(), d = await D.ws();
  await join(a, { map: 'farm' });                 // A đang ở vườn mình
  await join(c, { map: 'village' });              // C ở làng
  let r = await join(b, { map: 'farm', owner: 'lan' });   // B vào vườn A (tên không phân biệt hoa thường)
  assert.deepEqual(r.people.map(p => p.name), ['Lan']);
  assert.equal((await until(a, 'enter')).p.name, 'Bình');
  assert.deepEqual(await until(a, 'visit'), { t: 'visit', name: 'Bình' });

  b.send({ t: 'pos', x: 320, y: 340, dir: 2 });
  const pa = await until(a, 'pos');
  assert.deepEqual([pa.x, pa.y, pa.dir], [320, 340, 2]);
  a.send({ t: 'pos', x: 280, y: 290, dir: 1 });
  const pb = await until(b, 'pos');
  assert.deepEqual([pb.x, pb.y], [280, 290]);
  await none(c, ['enter', 'pos']);                // làng không thấy ai trong vườn

  // khách thứ hai (không phải bạn của A): thấy cả chủ lẫn khách trước; A thấy D vào nhưng không nhận "khách ghé"
  r = await join(d, { map: 'farm', owner: 'Lan' });
  assert.deepEqual(r.people.map(p => p.name).sort(), ['Bình', 'Lan']);
  assert.equal((await until(b, 'enter')).p.name, 'Đào');
  assert.equal((await until(a, 'enter')).p.name, 'Đào');
  await none(a, ['visit']);

  // B ra cổng về làng: A, D thấy B rời; C ở làng thấy B tới; A không nhận thêm "khách ghé"
  await join(b, { map: 'village' });
  assert.equal((await until(a, 'leave')).id, r.people.find(p => p.name === 'Bình').id);
  assert.equal((await until(c, 'enter')).p.name, 'Bình');
  await none(a, ['visit']);
});

test('vườn real-time: chủ vào vườn mình không tự báo "khách ghé"; vào vườn của tên không có thì báo lỗi', async t => {
  const { player } = await setup(t);
  const A = await player('Lan');
  const a = await A.ws(), a2 = await A.ws();
  await join(a, { map: 'farm', owner: 'Lan' });
  await none(a, ['visit']);
  a2.send({ t: 'join', map: 'farm', owner: 'Không Ai' });
  assert.deepEqual(await until(a2, 'error'), { t: 'error', code: 'no_farm' });
});

test('đọc vườn người khác: không đổi dữ liệu của chủ, không ghi được gì vào vườn chủ', async t => {
  const { srv, player, post, hdr } = await setup(t);
  const A = await player('Lan', s => { s.coins = 777; }), B = await player('Bình');
  const before = await A.farm();
  for (let i = 0; i < 2; i++) {
    const r = await B.visit('Lan');
    assert.equal(r.status, 200);
    assert.equal(r.body.name, 'Lan');
    assert.equal(r.body.farm.coins, 777);
  }
  // chủ online (đang giữ phiên chơi): đọc cũng không đổi gì
  const a = await A.ws();
  a.send({ t: 'hello', play: A.play });
  await until(a, 'hello');
  await B.visit('Lan');
  assert.deepEqual(await A.farm(), before);

  // lối đọc không nhận ghi: mọi phương thức khác bị từ chối
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const r = await srv.json('/api/visit?name=Lan', { save: { coins: 1 } }, { method, ...hdr(B.cookie) });
    assert.equal(r.status, 405, method);
  }
  // khách ghi bằng phiên chơi của mình thì chỉ vào vườn mình; phiên của chủ thì khách không có
  const s = createGame({ name: 'Bình' }); s.coins = 5;
  assert.equal((await post('/api/farm', { play: B.play, save: s }, B.cookie)).status, 200);
  assert.equal((await post('/api/farm', { play: 'đoán-bừa', save: s }, B.cookie)).status, 409);
  assert.deepEqual(await A.farm(), before);
  // chưa đăng nhập thì không đọc được
  assert.equal((await srv.json('/api/visit?name=Lan')).status, 401);
});
