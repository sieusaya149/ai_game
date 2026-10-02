// Seam 3: vườn online (issue 22). Kho vườn, phiên chơi một thiết bị, chống gian lận nhẹ, WebSocket kết nối lại.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame } from '../public/state.js';

async function setup(t) {
  const srv = await bootServer();
  t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const post = (path, body, cookie) => srv.json(path, body, { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie && { cookie: `nt_session=${cookie}` }) } });
  // một "thiết bị" đăng nhập: cookie riêng, xin phiên chơi, gửi/đọc vườn
  const device = cookie => ({
    cookie,
    play: () => post('/api/play', {}, cookie),
    save: (play, save) => post('/api/farm', { play, save }, cookie),
    farm: () => srv.json('/api/farm', undefined, { headers: { cookie: `nt_session=${cookie}` } }),
    ws: () => srv.ws('/ws', { cookie }),
  });
  const register = async (name = 'Lan') => {
    const invite = (await srv.admin('invite')).out;
    return device(cookieOf(await post('/api/register', { name, pin: '123456', invite })));
  };
  const login = async (name = 'Lan') => device(cookieOf(await post('/api/login', { name, pin: '123456' })));
  return { srv, post, register, login };
}
const garden = mutate => { const s = createGame({ name: 'Lan' }); s.tutorial = 99; mutate?.(s); return s; };
const hello = async (ws, play) => { ws.send({ t: 'hello', play }); return ws.next(); };

test('vườn online: tài khoản mới chưa có vườn; đẩy bản lưu rồi lấy lại đúng nội dung', async t => {
  const { register } = await setup(t);
  const a = await register();
  let r = await a.farm();
  assert.deepEqual([r.status, r.body.code], [404, 'no_farm']);
  r = await a.play();
  assert.equal(r.status, 200);
  assert.equal(r.body.farm, null);
  const play = r.body.play;
  assert.ok(play);

  const s = garden(s => { s.coins = 1234; s.plots[0].soil = 'tilled'; s.plots[0].crop = { id: 'cai', progress: 0.5, q: { dry: false, bugMax: 0, hand: false } }; });
  r = await a.save(play, s);
  assert.equal(r.status, 200);
  assert.equal(r.body.rev, 1);
  r = await a.farm();
  assert.equal(r.status, 200);
  const f = r.body.farm;
  assert.equal(f.coins, 1234);
  assert.deepEqual(f.plots[0].crop, s.plots[0].crop);
  assert.deepEqual(f.farm, s.farm);
  assert.deepEqual([f.mode, f.account], ['online', 'Lan']);   // server đóng dấu vườn online của ai
  // xin phiên mới (vd tải lại trang) thì được trao lại đúng vườn
  r = await a.play();
  assert.equal(r.body.farm.coins, 1234);
  assert.notEqual(r.body.play, play);
});

test('vườn online: cần đăng nhập; bản lưu hỏng hoặc thiếu phiên chơi bị từ chối', async t => {
  const { register, post } = await setup(t);
  assert.equal((await post('/api/play', {})).status, 401);
  assert.equal((await post('/api/farm', { play: 'x', save: garden() })).status, 401);
  const a = await register();
  const { play } = (await a.play()).body;
  assert.equal((await a.save(undefined, garden())).body.code, 'play_replaced');
  for (const bad of [null, 'abc', { v: 2 }, { ...garden(), coins: 'nhiều' }, { ...garden(), v: 99 }]) {
    const r = await a.save(play, bad);
    assert.deepEqual([r.status, r.body.code], [400, 'save_invalid']);
  }
  assert.equal((await a.farm()).status, 404);
});

test('một thiết bị: đăng nhập máy B thì máy A nhận lệnh thoát, bản cuối của A tới trước khi B nhận vườn, sau đó phiên cũ bị từ chối', async t => {
  const { register, login } = await setup(t);
  const a = await register();
  const pa = (await a.play()).body.play;
  assert.equal((await a.save(pa, garden(s => { s.coins = 300; }))).status, 200);
  const wa = await a.ws();
  assert.equal((await hello(wa, pa)).ok, true);

  // máy B đăng nhập cùng tài khoản, xin phiên chơi: chưa trả lời ngay mà chờ bản cuối của A
  const b = await login();
  const claim = b.play();
  assert.deepEqual(await wa.next(), { t: 'kicked' });
  const fin = await a.save(pa, garden(s => { s.coins = 345; }));   // A lưu lần cuối bằng phiên cũ: vẫn được nhận
  assert.equal(fin.status, 200);
  const rb = await claim;
  assert.equal(rb.status, 200);
  assert.equal(rb.body.farm.coins, 345);   // vườn A đã chơi không mất

  // từ giờ phiên cũ bị từ chối với lý do rõ, phiên mới được nhận
  let r = await a.save(pa, garden(s => { s.coins = 999; }));
  assert.deepEqual([r.status, r.body.code], [409, 'play_replaced']);
  assert.match(r.body.error, /thiết bị khác/);
  r = await b.save(rb.body.play, garden(s => { s.coins = 350; }));
  assert.equal(r.status, 200);
  assert.equal((await a.farm()).body.farm.coins, 350);
  // A kết nối lại với phiên cũ: bị báo thoát ngay
  const wa2 = await a.ws();
  assert.deepEqual(await hello(wa2, pa), { t: 'kicked' });
});

test('một thiết bị: máy cũ không trả lời thì máy mới chỉ chờ một lúc rồi vẫn vào được', async t => {
  const { register, login } = await setup(t);
  const a = await register();
  const pa = (await a.play()).body.play;
  const wa = await a.ws();
  await hello(wa, pa);
  const b = await login();
  const t0 = Date.now();
  const rb = await b.play();
  assert.equal(rb.status, 200);
  assert.ok(Date.now() - t0 < 5000);
  assert.deepEqual(await wa.next(), { t: 'kicked' });
  assert.equal((await a.save(pa, garden())).body.code, 'play_replaced');
});

test('một thiết bị: máy cũ đóng kết nối (vd tải lại trang) thì máy mới khỏi chờ', async t => {
  const { register } = await setup(t);
  const a = await register();
  const pa = (await a.play()).body.play;
  const wa = await a.ws();
  await hello(wa, pa);
  const t0 = Date.now(), claim = a.play();
  assert.deepEqual(await wa.next(), { t: 'kicked' });
  wa.close();
  assert.equal((await claim).status, 200);
  assert.ok(Date.now() - t0 < 2000);
});

test('chống gian lận: xu tăng vọt sát bản trước bị từ chối, bản cũ giữ nguyên; tăng hợp lý thì nhận', async t => {
  const { register } = await setup(t);
  const a = await register();
  const { play } = (await a.play()).body;
  const s = garden(s => { s.coins = 500; });
  assert.equal((await a.save(play, s)).status, 200);

  const cheat = structuredClone(s);
  cheat.coins = 1_000_000; cheat.savedAt = s.savedAt + 1000; cheat.simMs = s.simMs + 1000;
  let r = await a.save(play, cheat);
  assert.deepEqual([r.status, r.body.code, r.body.reason], [422, 'implausible', 'coins']);
  assert.equal((await a.farm()).body.farm.coins, 500);

  const items = structuredClone(s);   // đồ tăng vọt cũng vậy
  items.basket.dau = 5000; items.savedAt = s.savedAt + 1000;
  assert.equal((await a.save(play, items)).body.reason, 'coins');
  const exp = structuredClone(s);
  exp.exp = 1e6; exp.savedAt = s.savedAt + 1000;
  assert.equal((await a.save(play, exp)).body.reason, 'exp');

  const ok = structuredClone(s);
  ok.coins = 560; ok.exp = 20; ok.savedAt = s.savedAt + 10_000; ok.simMs = s.simMs + 10_000;
  r = await a.save(play, ok);
  assert.equal(r.status, 200);
  assert.equal((await a.farm()).body.farm.coins, 560);
});

test('WebSocket rớt rồi mở lại với cùng phiên thì tiếp tục nhận sự kiện bình thường', async t => {
  const { register, login } = await setup(t);
  const a = await register();
  const pa = (await a.play()).body.play;
  const w1 = await a.ws();
  assert.equal((await hello(w1, pa)).ok, true);
  w1.raw.terminate();
  await w1.closed;

  const w2 = await a.ws();
  assert.equal((await hello(w2, pa)).ok, true);
  w2.send({ t: 'ping', id: 7 });
  assert.equal((await w2.next()).id, 7);
  const b = await login();
  const claim = b.play();
  assert.deepEqual(await w2.next(), { t: 'kicked' });   // sự kiện vẫn tới kết nối mới
  await a.save(pa, garden());
  assert.equal((await claim).status, 200);
});

test('WebSocket chưa đăng nhập thì hello bị từ chối, ping vẫn chạy', async t => {
  const { srv } = await setup(t);
  const w = await srv.ws();
  w.send({ t: 'hello', play: 'abc' });
  assert.deepEqual(await w.next(), { t: 'hello', ok: false, code: 'no_session' });
  w.send({ t: 'ping' });
  assert.equal((await w.next()).t, 'pong');
});
