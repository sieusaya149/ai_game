// Seam 3: màu lông chó/mèo và bát ăn của chó qua server thật (góp ý người chơi). Server chạy cùng tiến trình test
// nên setClock đặt giờ cho cả hai. Màu lông đi theo bản lưu nên khách thăm vườn thấy đúng màu chủ đã chọn;
// bát ăn chạy bù ở server ra cùng kết quả với chạy bù ở trình duyệt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame, loadGame, startVisit, canPlace, placeEntity, buyCat, perform, stageStart } from '../public/state.js';
import { setClock } from '../public/clock.js';
import { DOG, DAY_MS } from '../public/data.js';

const MIN = 60_000, T = Date.now();
const rnd = Math.random;
async function setup(t) {
  setClock(() => T);
  t.after(() => setClock());
  Math.random = () => 0.99; t.after(() => { Math.random = rnd; });
  const srv = await bootServer();
  t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const hdr = c => ({ headers: { cookie: `nt_session=${c}` } });
  const post = (path, body, c) => srv.json(path, body, { method: 'POST', headers: { 'content-type': 'application/json', cookie: `nt_session=${c}` } });
  const user = async name => {
    const invite = (await srv.admin('invite')).out;
    const cookie = cookieOf(await srv.json('/api/register', { name, pin: '123456', invite }));
    return { cookie, name, play: () => post('/api/play', {}, cookie), save: (play, save) => post('/api/farm', { play, save }, cookie), visit: n => srv.json('/api/visit?name=' + n, undefined, hdr(cookie)) };
  };
  // chủ vườn đẩy bản lưu có savedAt lùi `ago` rồi "tắt máy"
  const owner = async (name, ago, mutate) => {
    const u = await user(name), s = createGame({ name, dogCoat: 'dom' }); s.tutorial = 99; mutate?.(s); s.savedAt = T - ago;
    const { play } = (await u.play()).body;
    assert.equal((await u.save(play, s)).status, 200);
    return { u, s };
  };
  return { user, owner };
}
// Chủ có chó trưởng thành, ban ngày, một con mèo tam thể, bát đầy
function petFarm(s) {
  s.exp = 5000; s.coins = 5000; s.time = DAY_MS * 0.3; s.orders = []; s.nextOrderAt = 1e15;
  Object.assign(s.dog, { stage: 'truong', age: stageStart('cho', 'truong'), hunger: 100, nextPoop: 1e15 });
  const o = s.farm.owned;
  out: for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (canPlace(s, { kind: 'cathouse' }, c, r).ok) { placeEntity(s, { kind: 'cathouse' }, c, r); break out; }
  assert.equal(buyCat(s, 'f', 'tamthe').ok, true);
  s.inv.dogfood = 10;
  for (let i = 0; i < DOG.bowlMax; i++) assert.equal(perform(s, { kind: 'bowl' }, 'fill').ok, true);
}

test('khách thăm vườn thấy chó và mèo đúng màu lông chủ đã chọn', async t => {
  const { user, owner } = await setup(t);
  await owner('Lan', 1000, petFarm);
  const me = createGame({ name: 'Bình' });
  const r = await (await user('Bình')).visit('Lan');
  assert.equal(r.status, 200);
  assert.equal(r.body.farm.dog.coat, 'dom');
  assert.equal(r.body.farm.cats[0].coat, 'tamthe');
  const v = startVisit(me, r.body.farm, 'Lan');
  assert.equal(v.dog.coat, 'dom');
  assert.equal(v.cats[0].coat, 'tamthe');
});

test('chủ vắng: server chạy bù, chó tự ra bát ăn đúng như chạy bù ở trình duyệt', async t => {
  const { user, owner } = await setup(t);
  const { s } = await owner('Lan', 200 * MIN, petFarm);
  const f = (await (await user('Bình')).visit('Lan')).body.farm;
  assert.equal(f.dog.bowl, 0, 'chó đã ăn hết bát');
  const here = structuredClone(s); here.savedAt = T - 200 * MIN;
  const l = loadGame(here);
  assert.equal(f.dog.bowl, l.dog.bowl);
  assert.equal(f.dog.hunger, l.dog.hunger);
  assert.ok(f.awayPending.lines.some(x => x.includes(`${DOG.bowlMax} bữa`)), f.awayPending.lines.join(' | '));
});
