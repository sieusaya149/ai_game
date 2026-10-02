// Seam 3 (issue 32, ADR 0011, 0012): việc khách làm tới chủ vườn qua kênh riêng theo người chứ không theo bản đồ.
// Chủ đang ở làng (bản đồ khác vườn mình) vẫn nhận ngay vụ trộm và tiếng chó sủa 🔴; chủ offline thì lúc vào làng
// nhận lại vườn kèm nhật ký khách chưa xem và tin ở cổng cho màn "Trong lúc bạn vắng nhà…".
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame, stageStart } from '../public/state.js';

const LV5 = 500;
const crop = (id, progress) => ({ id, progress, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 });
// vườn chủ: ô 0..2 bắp chín, ô 3 cà rốt khô; chó trưởng thành no và vui nên canh được khách
const garden = s => {
  for (let i = 0; i < 3; i++) Object.assign(s.plots[i], { soil: 'tilled', water: 100, crop: crop('bap', 1) });
  Object.assign(s.plots[3], { soil: 'tilled', water: 0, crop: crop('carot', 0.4) });
  Object.assign(s.dog, { stage: 'truong', age: stageStart('cho', 'truong'), hunger: 100, happy: 100, chained: false });
};

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
    return { name, cookie, play, ws: () => srv.ws('/ws', { cookie }), post: (p, b) => post(p, b, cookie) };
  };
  return { player };
}
async function until(ws, t, ms = 2000) {
  for (;;) { const m = await ws.next(ms); if (m.t === t) return m; }
}
// Gom mọi tin tới trong `ms` (không chờ một loại cụ thể)
async function drain(ws, ms = 300) {
  const out = [];
  for (;;) { try { out.push(await ws.next(ms)); } catch { return out; } }
}
const join = async (ws, msg) => { ws.send({ t: 'join', x: 300, y: 300, dir: 0, ...msg }); return until(ws, 'joined'); };
const op = (id, kind, act, extra) => ({ id, kind, act, ...extra });

test('🔴 trộm và chó sủa tới ngay chủ đang ở làng: kênh theo người, không theo bản đồ', async t => {
  const { player } = await setup(t);
  const A = await player('Lan', garden), B = await player('Bình');
  const a = await A.ws(), b = await B.ws();
  a.send({ t: 'hello', play: A.play });
  await until(a, 'hello');
  await join(a, { map: 'village' });   // chủ đang dạo làng, không đứng trong vườn mình
  await join(b, { map: 'farm', owner: 'Lan' });

  b.send({ t: 'guest', op: op('rob-0001-aaaa', 'steal', 'crop', { idx: 0 }) });
  assert.equal((await until(b, 'guest')).ok, true);
  const stolen = await until(a, 'guestop');
  assert.equal(stolen.op.kind, 'steal');
  assert.equal(stolen.op.by, 'Bình');

  b.send({ t: 'guest', op: op('bark-0001-aaaa', 'bark', 'bark', { x: 640, y: 420 }) });
  assert.equal((await until(b, 'guest')).ok, true);
  const bark = await until(a, 'guestop');
  assert.equal(bark.op.kind, 'bark');
  assert.deepEqual([bark.op.x, bark.op.y], [640, 420]);

  // còn tin theo bản đồ (khách đi lại trong vườn) thì chủ ở làng không nhận
  b.send({ t: 'pos', x: 320, y: 330, dir: 1 });
  const rest = await drain(a);
  assert.ok(!rest.some(m => m.t === 'pos' || m.t === 'enter'), JSON.stringify(rest));
});

test('chủ offline: vào làng nhận vườn có nhật ký khách chưa xem và tin ở cổng cho màn vắng nhà', async t => {
  const { player } = await setup(t);
  const A = await player('Lan', garden), B = await player('Bình');
  const b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });
  for (const o of [op('help-0001-aaaa', 'help', 'water', { idx: 3 }), op('rob-0002-aaaa', 'steal', 'crop', { idx: 1 }), op('bite-0001-aaaa', 'bite', 'bite', { loot: {} })]) {
    b.send({ t: 'guest', op: o });
    const ack = await until(b, 'guest');
    assert.equal(ack.ok, true, `${o.kind}: ${ack.msg}`);
  }
  assert.equal((await B.post('/api/gifts', { to: 'Lan', item: 'cai', qty: 2, op: 'gift-0001-aaaa' })).status, 200);

  const back = (await A.post('/api/play', {})).body;
  assert.deepEqual(back.gate, { gifts: 1, notes: 0 });
  const fresh = back.farm.guests.filter(g => !g.seen).map(g => g.kind).sort();
  assert.deepEqual(fresh, ['bite', 'help', 'steal']);
  assert.equal(back.farm.stats.chased, 1);
});
