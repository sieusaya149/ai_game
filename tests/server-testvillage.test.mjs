// Seam 3: tài khoản smoke (tên bắt đầu `zzsmoke`) chơi ở làng thử riêng, người thật không thấy và ngược lại.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';

const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
async function until(ws, t, ms = 2000) { for (;;) { const m = await ws.next(ms); if (m.t === t) return m; } }
async function none(ws, ms = 400) {
  const end = Date.now() + ms;
  for (;;) {
    const left = end - Date.now();
    if (left <= 0) return;
    let m;
    try { m = await ws.next(left); } catch { return; }
    assert.fail(`không được nhận tin: ${JSON.stringify(m)}`);
  }
}

test('làng thử: tài khoản zzsmoke và người thật không thấy nhau (người, vị trí, chat, biểu cảm); hai zzsmoke thấy nhau', async t => {
  const srv = await bootServer();
  t.after(srv.close);
  const mk = async name => {
    const invite = (await srv.admin('invite')).out;
    const r = await srv.json('/api/register', { name, pin: '123456', invite });
    return srv.ws('/ws', { cookie: cookieOf(r) });
  };
  const join = async ws => { ws.send({ t: 'join', map: 'village', x: 100, y: 180, dir: 0 }); return until(ws, 'joined'); };
  const real = await mk('Lan'), s1 = await mk('ZZSmokeAbc'), s2 = await mk('zzsmokeXyz');

  assert.deepEqual((await join(real)).people, []);
  assert.deepEqual((await join(s1)).people, []);   // không thấy Lan
  await none(real);                                  // Lan không nhận enter của smoke
  const r2 = await join(s2);
  assert.deepEqual(r2.people.map(p => p.name), ['ZZSmokeAbc']);
  assert.equal((await until(s1, 'enter')).p.name, 'zzsmokeXyz');

  s1.send({ t: 'pos', x: 150, y: 180, dir: 1 });
  s1.send({ t: 'chat', text: 'Chào cả làng!' });
  s1.send({ t: 'emote', e: '😂' });
  const got = [(await until(s2, 'pos')).x, (await until(s2, 'chat')).text, (await until(s2, 'emote')).e];
  assert.deepEqual(got, [150, 'Chào cả làng!', '😂']);
  await none(real);   // người thật không nhận pos/chat/emote của smoke
  real.send({ t: 'pos', x: 120, y: 180, dir: 0 });
  real.send({ t: 'chat', text: 'Tạm biệt!' });
  await none(s1); await none(s2);   // smoke không nhận gì của người thật
});
