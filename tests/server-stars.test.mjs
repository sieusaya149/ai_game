// Seam 3: nông sản có sao (issue 52) qua server. Hái cả ruộng ★3 trong một nhịp lưu (10 giây) không bị coi là gian lận;
// giỏ tự dưng đầy hàng ★3 mà ruộng không có gì chín thì vẫn bị từ chối.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame, perform, stashAll } from '../public/state.js';
import { setClock } from '../public/clock.js';
import { starKey } from '../public/data.js';

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
// Vườn online có cả ruộng dưa hấu chín, chăm kỹ cả vụ (bón phân, có chăm tay, không khô, không sâu)
function ripeFarm() {
  const s = createGame({ name: 'Lan' });
  Object.assign(s, { mode: 'online', account: 'Lan', tutorial: 99, savedAt: T });
  for (const p of s.plots.filter(p => p.unlocked)) {
    Object.assign(p, { soil: 'tilled', water: 100 });
    p.crop = { id: 'duahau', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: true, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: true } };
  }
  return s;
}

test('hái cả ruộng ★3 trong một nhịp lưu: server nhận; giỏ tự dưng đầy hàng ★3 thì từ chối', async t => {
  const { save } = await setup(t);
  const prev = ripeFarm();
  assert.equal((await save(prev)).status, 200);
  const next = structuredClone(prev);
  for (const p of next.plots.filter(p => p.unlocked)) {
    next.mastery.duahau = { lv: 1, n: 0 };   // giữ thành thạo cấp 1: thưởng sản lượng của issue 51 không lẫn vào phần đếm
    assert.equal(perform(next, { kind: 'plot', idx: p.idx }, 'harvest').ok, true); stashAll(next);
  }
  assert.equal(next.inv[starKey('duahau', 3)], 81);
  next.simMs += 10_000; next.savedAt = T + 10_000;
  const r = await save(next);
  assert.equal(r.status, 200, r.body?.error);
  // bản kế tiếp: ruộng đã trống mà kho lại có thêm 81 dưa hấu ★3
  const cheat = structuredClone(next);
  cheat.inv[starKey('duahau', 3)] += 81; cheat.simMs += 10_000; cheat.savedAt = T + 20_000;
  const bad = await save(cheat);
  assert.equal(bad.status, 422);
  assert.equal(bad.body.reason, 'coins');
});
