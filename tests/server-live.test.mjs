// Seam 3: làng real-time (issue 25). Hiện diện theo bản đồ, vị trí tối đa 6 lần/giây, chat nhanh và biểu cảm, kết nối lại.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame } from '../public/state.js';
import { LIVE, QUICK_CHAT, EMOTES } from '../public/data.js';

async function setup(t) {
  const srv = await bootServer();
  t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const post = (path, body, cookie) => srv.json(path, body, { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie && { cookie: `nt_session=${cookie}` }) } });
  // người chơi mới: đăng ký, có vườn trên server (ngoại hình, cấp lấy từ đây), mở WebSocket
  const player = async (name, mutate) => {
    const invite = (await srv.admin('invite')).out;
    const cookie = cookieOf(await post('/api/register', { name, pin: '123456', invite }));
    const { play } = (await post('/api/play', {}, cookie)).body;
    const s = createGame({ name, look: { shirt: 3, hat: 0 } }); s.tutorial = 99; mutate?.(s);
    await post('/api/farm', { play, save: s }, cookie);
    return { name, cookie, ws: () => srv.ws('/ws', { cookie }) };
  };
  return { srv, player };
}
// chờ tin nhắn loại `t` (bỏ qua tin khác)
async function until(ws, t, ms = 2000) {
  for (;;) { const m = await ws.next(ms); if (m.t === t) return m; }
}
// trong `ms` không có tin nào loại `t`
async function none(ws, t, ms = 400) {
  const end = Date.now() + ms;
  for (;;) {
    const left = end - Date.now();
    if (left <= 0) return;
    let m;
    try { m = await ws.next(left); } catch { return; }
    assert.notEqual(m.t, t, `không được nhận ${t}: ${JSON.stringify(m)}`);
  }
}
const join = async (ws, map, pos = { x: 100, y: 180, dir: 0 }) => { ws.send({ t: 'join', map, ...pos }); return until(ws, 'joined'); };

test('làng: hai người cùng làng thấy nhau (tên, ngoại hình, cấp) và nhận vị trí của nhau; bản đồ khác không nhận gì', async t => {
  const { player } = await setup(t);
  const lan = await player('Lan', s => { s.exp = 500; }), minh = await player('Minh'), tu = await player('Tư');
  const a = await lan.ws(), b = await minh.ws(), c = await tu.ws();

  let r = await join(a, 'village');
  assert.deepEqual(r.people, []);
  await join(c, 'house');   // Tư ở trong nhà mình
  r = await join(b, 'village', { x: 120, y: 190, dir: 2 });
  assert.equal(r.people.length, 1);
  assert.equal(r.people[0].name, 'Lan');
  assert.ok(r.people[0].level > 1);
  assert.equal(r.people[0].look.shirt, 3);
  assert.equal(r.people[0].look.hat, 0);
  assert.deepEqual([r.people[0].x, r.people[0].y], [100, 180]);
  const e = await until(a, 'enter');
  assert.equal(e.p.name, 'Minh');
  assert.deepEqual([e.p.x, e.p.y, e.p.dir], [120, 190, 2]);

  a.send({ t: 'pos', x: 140, y: 182, dir: 2 });
  const p = await until(b, 'pos');
  assert.deepEqual([p.id, p.x, p.y, p.dir], [r.people[0].id, 140, 182, 2]);
  b.send({ t: 'pos', x: 150, y: 200, dir: 1 });
  assert.equal((await until(a, 'pos')).x, 150);
  await none(c, 'pos');
  await none(c, 'enter', 50);

  // Minh vào nhà: Lan thấy Minh rời làng, vị trí trong nhà không tới làng
  b.send({ t: 'join', map: 'house', x: 96, y: 126, dir: 3 });
  assert.equal((await until(a, 'leave')).id, e.p.id);
  b.send({ t: 'pos', x: 90, y: 120, dir: 3 });
  await none(a, 'pos');
  // hai người cùng "ở trong nhà" nhưng là nhà riêng của mỗi người: không thấy nhau
  await none(c, 'pos', 50);
  await none(c, 'enter', 50);
});

test('làng: vị trí phát không quá 6 lần mỗi giây cho mỗi người gửi, dù gửi dồn dập; vị trí cuối vẫn tới', async t => {
  const { player } = await setup(t);
  const a = await (await player('Lan')).ws(), b = await (await player('Minh')).ws();
  await join(a, 'village'); await join(b, 'village'); await until(a, 'enter');
  const got = [];
  b.raw.on('message', d => { const m = JSON.parse(d); if (m.t === 'pos') got.push({ at: Date.now(), x: m.x }); });
  for (let i = 1; i <= 100; i++) { a.send({ t: 'pos', x: 100 + i, y: 180, dir: 2 }); await new Promise(ok => setTimeout(ok, 10)); }
  await new Promise(ok => setTimeout(ok, 1000 / LIVE.hz + 150));
  const span = got.at(-1).at - got[0].at;
  assert.ok(got.length >= 4, `nhận quá ít: ${got.length}`);
  assert.ok(got.length <= Math.floor(span / (1000 / LIVE.hz)) + 2, `${got.length} tin trong ${span}ms`);
  for (let i = 1; i < got.length; i++) assert.ok(got[i].at - got[i - 1].at >= 1000 / LIVE.hz - 10, `hai tin cách nhau ${got[i].at - got[i - 1].at}ms`);
  assert.equal(got.at(-1).x, 200);   // tin dồn cuối cùng không bị nuốt
});

test('làng: chat nhanh và biểu cảm chỉ tới người cùng bản đồ; câu lạ bị từ chối', async t => {
  const { player } = await setup(t);
  const a = await (await player('Lan')).ws(), b = await (await player('Minh')).ws(), c = await (await player('Tư')).ws();
  await join(a, 'village'); await join(c, 'farm');
  const me = (await join(b, 'village')).me;
  await until(a, 'enter');

  b.send({ t: 'chat', text: QUICK_CHAT[0] });
  let m = await until(a, 'chat');
  assert.deepEqual([m.id, m.text], [me, QUICK_CHAT[0]]);
  b.send({ t: 'emote', e: EMOTES[2] });
  m = await until(a, 'emote');
  assert.deepEqual([m.id, m.e], [me, '😂']);
  await none(c, 'chat', 150);
  await none(c, 'emote', 50);

  // câu tự gõ / biểu cảm lạ: báo lỗi cho người gửi, không ai nhận
  b.send({ t: 'chat', text: 'mua acc giá rẻ' });
  assert.equal((await until(b, 'error')).code, 'chat_invalid');
  b.send({ t: 'emote', e: '💩' });
  assert.equal((await until(b, 'error')).code, 'chat_invalid');
  await none(a, 'chat', 150);
  await none(a, 'emote', 50);
  // bản đồ lạ cũng bị từ chối
  c.send({ t: 'join', map: 'vuon-cua-ai' });
  assert.equal((await until(c, 'error')).code, 'map_invalid');
});

test('làng: cần đăng nhập mới vào được bản đồ', async t => {
  const { srv } = await setup(t);
  const x = await srv.ws();
  x.send({ t: 'join', map: 'village' });
  assert.equal((await until(x, 'error')).code, 'no_session');
});

test('làng: rớt WebSocket rồi kết nối lại → vào lại làng, nhận lại vị trí của người khác', async t => {
  const { player } = await setup(t);
  const lan = await player('Lan'), minh = await player('Minh');
  let a = await lan.ws();
  const b = await minh.ws();
  await join(a, 'village'); await join(b, 'village'); await until(a, 'enter');
  b.send({ t: 'pos', x: 222, y: 190, dir: 2 });
  await until(a, 'pos');

  a.raw.terminate();   // rớt mạng
  const gone = await until(b, 'leave');
  assert.ok(gone.id);
  a = await lan.ws();
  const r = await join(a, 'village');
  assert.equal(r.people.length, 1);
  assert.deepEqual([r.people[0].name, r.people[0].x, r.people[0].y], ['Minh', 222, 190]);
  assert.equal((await until(b, 'enter')).p.name, 'Lan');
  b.send({ t: 'pos', x: 230, y: 190, dir: 2 });
  assert.equal((await until(a, 'pos')).x, 230);
});
