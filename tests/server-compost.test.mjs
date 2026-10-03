// Seam 3: hố ủ phân (issue 61) qua server. Lấy cả lô phân bón ra trong một nhịp lưu là chơi bình thường, server nhận
// (chống gian lận checkSaveJump tính phân bón theo giá mua); hố ủ lưu lên server và đọc về còn nguyên đồ đang ủ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame, placeEntity, canPlace, compostAdd, compostStart, compostTake, compostInfo, loadGame } from '../public/state.js';
import { setClock } from '../public/clock.js';
import { COMPOST } from '../public/data.js';

const T = Date.now(), rnd = Math.random;
async function setup(t) {
  setClock(() => T);
  Math.random = () => 0.99;
  t.after(() => { setClock(); Math.random = rnd; });
  const srv = await bootServer();
  t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const invite = (await srv.admin('invite')).out;
  const cookie = cookieOf(await srv.json('/api/register', { name: 'Lan', pin: '123456', invite }));
  const post = (path, body) => srv.json(path, body, { method: 'POST', headers: { 'content-type': 'application/json', cookie: `nt_session=${cookie}` } });
  const play = (await post('/api/play', {})).body.play;
  return { save: s => post('/api/farm', { play, save: s }), load: () => post('/api/play', {}) };
}
// Vườn online có hố ủ đầy phân chuồng đã ủ xong
function readyFarm() {
  const s = createGame({ name: 'Lan' });
  Object.assign(s, { mode: 'online', account: 'Lan', tutorial: 99, savedAt: T, coins: 1e4, exp: 2000 });
  const o = s.farm.owned;
  let at = null;
  for (let r = o.r; r < o.r + o.h && !at; r++) for (let c = o.c; c < o.c + o.w && !at; c++) if (canPlace(s, { kind: 'compost' }, c, r).ok) at = { c, r };
  assert.equal(placeEntity(s, { kind: 'compost' }, at.c, at.r).ok, true);
  s.inv.manure = COMPOST.cap;
  assert.equal(compostAdd(s).ok, true);
  assert.equal(compostStart(s).ok, true);
  s.simMs += COMPOST.ms;
  return s;
}

test('lấy cả lô phân bón từ hố ủ trong một nhịp lưu: server nhận', async t => {
  const { save } = await setup(t);
  const prev = readyFarm();
  assert.equal((await save(prev)).status, 200);
  const next = structuredClone(prev);
  const r = compostTake(next);
  assert.equal(r.qty, COMPOST.cap / COMPOST.per);
  next.simMs += 10_000; next.savedAt = T + 10_000;
  const res = await save(next);
  assert.equal(res.status, 200, res.body?.error);
});

test('hố đang ủ lưu lên server, đọc về còn nguyên đồ và thời gian còn lại', async t => {
  const { save, load } = await setup(t);
  const s = readyFarm();
  s.simMs -= 5 * 60_000;   // còn 5 phút giờ vườn
  assert.equal((await save(s)).status, 200);
  const back = loadGame((await load()).body.farm);
  assert.deepEqual(compostInfo(back), compostInfo(s));
  assert.equal(compostInfo(back).left, 5 * 60_000);
});
