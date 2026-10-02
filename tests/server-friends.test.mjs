// Seam 3: bạn bè và cổng vườn (issue 26). Thêm/xóa bạn, cờ tóm tắt, online, danh sách cổng, không lộ bản lưu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame } from '../public/state.js';

async function setup(t) {
  const srv = await bootServer();
  t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const post = (path, body, cookie) => srv.json(path, body, { method: 'POST', headers: { 'content-type': 'application/json', cookie: `nt_session=${cookie}` } });
  const get = (path, cookie) => srv.json(path, undefined, { headers: { cookie: `nt_session=${cookie}` } });
  // một người chơi: đăng ký, (tuỳ chọn) đẩy vườn
  const player = async (name, mutate) => {
    const invite = (await srv.admin('invite')).out;
    const cookie = cookieOf(await srv.json('/api/register', { name, pin: '123456', invite }));
    const p = {
      name, cookie,
      play: async () => (await post('/api/play', {}, cookie)).body.play,
      friends: async () => (await get('/api/friends', cookie)).body,
      gates: async () => (await get('/api/gates', cookie)).body.gates,
      add: who => post('/api/friends', who, cookie),
      remove: n => post('/api/friends/remove', { name: n }, cookie),
      code: async () => (await p.friends()).code,
      farm: () => get('/api/farm', cookie),
    };
    if (mutate) {
      const s = createGame({ name }); s.tutorial = 99; mutate(s);
      p.playId = await p.play();
      assert.equal((await post('/api/farm', { play: p.playId, save: s }, cookie)).status, 200);
    }
    return p;
  };
  return { srv, player };
}
const ripe = s => { Object.assign(s.plots[0], { soil: 'tilled', water: 100 }); s.plots[0].crop = { id: 'cai', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 }; };
const buggy = s => { ripe(s); s.plots[0].crop.progress = 0.3; s.plots[0].crop.bugs = true; };

test('kết bạn: bằng tên và bằng mã đều được; tên lạ, mã sai, đã là bạn, tự thêm mình bị từ chối đúng lý do', async t => {
  const { player } = await setup(t);
  const a = await player('Lan'), b = await player('Minh Tâm'), c = await player('Cúc');
  let r = await a.add({ name: '  minh   TÂM ' });
  assert.deepEqual([r.status, r.body.name], [200, 'Minh Tâm']);
  const code = await c.code();
  assert.match(code, /^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
  assert.equal(await c.code(), code, 'mã không đổi giữa các lần xem');
  r = await a.add({ code: code.toLowerCase().replace('-', ' ') });
  assert.deepEqual([r.status, r.body.name], [200, 'Cúc']);
  assert.deepEqual((await a.friends()).friends.map(f => f.name), ['Cúc', 'Minh Tâm']);

  const no = async (who, status, why) => { const r = await a.add(who); assert.deepEqual([r.status, r.body.code], [status, why]); };
  await no({ name: 'Không Có' }, 404, 'no_such_name');
  await no({ code: 'ZZZ-ZZZ' }, 404, 'bad_code');
  await no({ name: 'Minh Tâm' }, 409, 'already_friend');
  await no({ code: code }, 409, 'already_friend');
  await no({ name: 'lan' }, 400, 'self');
  await no({ code: await a.code() }, 400, 'self');
  assert.equal((await b.friends()).friends.length, 0, 'quan hệ một chiều: B chưa ghim ai');
});

test('danh sách bạn: cấp, online theo WebSocket, cờ 🍅 / 🐛 từ bản lưu, không lộ số liệu riêng', async t => {
  const { srv, player } = await setup(t);
  const a = await player('Lan');
  const b = await player('Bình', s => { s.exp = 1000; ripe(s); });
  const c = await player('Cúc', buggy);
  const d = await player('Dũng', s => { s.plots[1].weeds = true; });
  const e = await player('Én');   // chưa có vườn
  for (const p of [b, c, d, e]) await a.add({ name: p.name });
  const find = async n => (await a.friends()).friends.find(f => f.name === n);

  const fb = await find('Bình');
  assert.ok(fb.level > 1);
  assert.deepEqual([fb.ripe, fb.help, fb.online], [true, false, false]);
  assert.deepEqual([(await find('Cúc')).ripe, (await find('Cúc')).help], [false, true]);
  assert.deepEqual([(await find('Dũng')).ripe, (await find('Dũng')).help], [false, true], 'cỏ cũng là cần giúp');
  assert.deepEqual(await find('Én'), { name: 'Én', level: 1, online: false, ripe: false, help: false });

  // online = có kết nối WebSocket đã gắn phiên chơi
  const ws = await srv.ws('/ws', { cookie: b.cookie });
  ws.send({ t: 'hello', play: b.playId });
  assert.equal((await ws.next()).ok, true);
  assert.equal((await find('Bình')).online, true);
  ws.close(); await ws.closed;
  await new Promise(ok => setTimeout(ok, 100));
  assert.equal((await find('Bình')).online, false);

  // chỉ có tên, cấp, online và hai cờ; không có xu, bản lưu...
  const all = await a.friends();
  assert.deepEqual(Object.keys(all).sort(), ['code', 'friends', 'ok']);
  for (const f of all.friends) assert.deepEqual(Object.keys(f).sort(), ['help', 'level', 'name', 'online', 'ripe']);
});

test('xóa bạn chỉ bỏ quan hệ: vườn, tài khoản còn nguyên; người kia hết được ghim', async t => {
  const { player } = await setup(t);
  const a = await player('Lan'), b = await player('Bình', s => { s.coins = 777; });
  await a.add({ name: 'Bình' });
  assert.equal((await a.gates())[0].friend, true);
  let r = await a.remove('Bình');
  assert.equal(r.status, 200);
  assert.equal((await a.friends()).friends.length, 0);
  assert.deepEqual((await a.gates()).map(g => [g.name, g.friend]), [['Bình', false]], 'vẫn có cổng nhưng không còn ghim');
  assert.equal((await b.friends()).friends.length, 0);
  assert.equal((await a.remove('Bình')).body.code, 'not_friend');
  // vườn của B còn nguyên, B vẫn đăng nhập được
  assert.equal((await b.farm()).body.farm.coins, 777);
  assert.equal((await b.friends()).ok, true);
});

test('cổng vườn: bạn bè ghim lên đầu rồi tới người khác, không có chính mình, cần đăng nhập', async t => {
  const { srv, player } = await setup(t);
  const a = await player('Lan', () => {});
  const x = await player('An', () => {}), y = await player('Bình', s => { s.exp = 1000; }), z = await player('Cúc', () => {});
  await player('Chưa Vườn');   // không có vườn thì không có cổng
  assert.deepEqual((await a.gates()).map(g => g.name), ['An', 'Bình', 'Cúc']);
  await a.add({ name: 'Cúc' }); await a.add({ name: 'Bình' });
  const gates = await a.gates();
  assert.deepEqual(gates.map(g => [g.name, g.friend]), [['Bình', true], ['Cúc', true], ['An', false]]);
  assert.ok(gates[0].level > gates[2].level);
  assert.ok(!gates.some(g => g.name === 'Lan'));
  assert.deepEqual(Object.keys(gates[0]).sort(), ['friend', 'level', 'name']);
  void x; void y; void z;
  assert.equal((await srv.json('/api/gates')).status, 401);
  assert.equal((await srv.json('/api/friends')).status, 401);
});
