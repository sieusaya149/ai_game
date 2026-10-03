// Seam 3: mua online (hotfix) trên server thật. Bản lưu có đơn chờ giao qua được kiểm tra chống gian lận,
// và lúc chủ vắng server chạy bù giao hàng tới kho như trình duyệt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import * as G from '../public/state.js';

async function setup(t) {
  const srv = await bootServer();
  t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const post = (path, body, cookie) => srv.json(path, body, { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie && { cookie: `nt_session=${cookie}` }) } });
  const register = async name => {
    const invite = (await srv.admin('invite')).out, cookie = cookieOf(await post('/api/register', { name, pin: '123456', invite }));
    return {
      play: async () => (await post('/api/play', {}, cookie)).body.play,
      save: (play, save) => post('/api/farm', { play, save }, cookie),
      visit: n => srv.json('/api/visit?name=' + encodeURIComponent(n), undefined, { headers: { cookie: `nt_session=${cookie}` } }),
    };
  };
  return { register };
}
const garden = () => { const s = G.createGame({ name: 'Lan' }); s.tutorial = 99; s.orders = []; s.nextOrderAt = 1e12; s.exp = 5000; s.coins = 9000; return s; };
// chạy vườn theo giờ vườn (tốc độ x1 nên savedAt đi cùng), tới khi done() hoặc hết ms
const run = (s, ms, done = () => false) => { for (let t = 0; t < ms && !done(); t += 1000) { G.tick(s, 1000); s.savedAt += 1000; } };

test('đặt một đơn lớn rồi nhận hàng: server nhận cả bản vừa đặt lẫn bản vừa giao (không coi là xu, đồ tăng vọt)', async t => {
  const { register } = await setup(t);
  const a = await register('Lan'), play = await a.play();
  const s = garden();
  s.mode = 'offline';   // giờ chợ theo giờ vườn để thử chắc chắn ban ngày; server vẫn đóng dấu online khi nhận
  assert.equal((await a.save(play, s)).status, 200);

  assert.ok(G.orderOnline(s, { deco_canopy: 40 }).ok);   // 7200 xu hàng + phí
  s.savedAt += 1000;
  let r = await a.save(play, s);
  assert.equal(r.status, 200, JSON.stringify(r.body));

  run(s, 5 * 60_000, () => s.courier && s.courier.arriveAt - s.time <= 3000);   // người giao hàng sắp tới kho
  assert.equal((await a.save(play, s)).status, 200);
  run(s, 10_000, () => !s.deliveries.length);
  assert.equal(s.inv.deco_canopy, 40);
  r = await a.save(play, s);   // mấy giây sau đã có 7200 xu đồ trong kho
  assert.equal(r.status, 200, JSON.stringify(r.body));
});

test('chủ vắng nhà: server chạy bù giao hàng tới kho, đơn chờ hết, tóm tắt lúc vắng có dòng giao hàng', async t => {
  const { register } = await setup(t);
  const a = await register('Lan'), b = await register('Bình');
  const play = await a.play();
  const s = garden();
  assert.ok(G.orderOnline(s, { seed_cai: 4, vaccine: 2 }).ok);
  const seeds = s.inv.seed_cai;
  s.savedAt = Date.now() - 60 * 60_000;   // lưu lần cuối 1 giờ trước (3 ngày làng: chắc chắn qua giờ chợ mở)
  assert.equal((await a.save(play, s)).status, 200);

  const r = await b.visit('Lan');   // có người ghé: server chạy bù vườn của chủ đang vắng
  assert.equal(r.status, 200);
  const f = r.body.farm;
  assert.deepEqual([f.inv.seed_cai, f.inv.vaccine], [seeds + 4, 2]);
  assert.deepEqual(f.deliveries, []);
  assert.ok(f.awayPending.lines.some(l => /giao .*tới kho/.test(l)), f.awayPending.lines.join(' | '));
});
