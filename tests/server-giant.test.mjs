// Seam 3: trái khổng lồ (issue 53) qua server. Hái cả ruộng có trái khổng lồ trong một nhịp lưu không bị coi là gian lận
// (cả xu/đồ lẫn EXP); kho tự dưng có thêm trái khổng lồ mà ruộng không còn gì thì vẫn bị từ chối.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame, perform, stashAll } from '../public/state.js';
import { setClock } from '../public/clock.js';
import { giantKey } from '../public/data.js';

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
  return { save: s => post('/api/farm', { play, save: s }) };
}
// Vườn online cả ruộng bắp cải chín, chăm kỹ cả vụ, thành thạo cấp 3, ô nào cũng có trái khổng lồ
function giantFarm() {
  const s = createGame({ name: 'Lan' });
  Object.assign(s, { mode: 'online', account: 'Lan', tutorial: 99, savedAt: T, exp: 1e6, basket: {}, inv: {} });
  s.mastery.bapcai = { lv: 3, n: 999 };
  for (const p of s.plots.filter(p => p.unlocked)) {
    Object.assign(p, { soil: 'tilled', water: 100 });
    p.crop = { id: 'bapcai', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: true, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: true }, giant: true };
  }
  return s;
}

test('hái cả ruộng có trái khổng lồ trong một nhịp lưu: server nhận; kho tự dưng có thêm trái khổng lồ thì từ chối', async t => {
  const { save } = await setup(t);
  const prev = giantFarm();
  assert.equal((await save(prev)).status, 200);
  const next = structuredClone(prev);
  for (const p of next.plots.filter(p => p.unlocked)) {
    assert.equal(perform(next, { kind: 'plot', idx: p.idx }, 'harvest').ok, true); stashAll(next);
  }
  assert.equal(next.inv[giantKey('bapcai', 3)], 9);
  next.simMs += 2000; next.savedAt = T + 2000;
  const r = await save(next);
  assert.equal(r.status, 200, r.body?.error);
  // bản kế tiếp: ruộng đã trống mà kho lại có thêm 9 bắp cải khổng lồ ★3
  const cheat = structuredClone(next);
  cheat.inv[giantKey('bapcai', 3)] += 9; cheat.simMs += 2000; cheat.savedAt = T + 4000;
  const bad = await save(cheat);
  assert.equal(bad.status, 422);
  assert.equal(bad.body.reason, 'coins');
});
