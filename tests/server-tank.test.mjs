// Seam 3: server chạy bù vườn có máy bơm và bồn chứa (issue 57, ADR 0015) ra cùng mực nước như trình duyệt chạy bù cùng bản lưu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame, loadGame, canPlace, placeEntity, footprint, tankInfo } from '../public/state.js';
import { setClock } from '../public/clock.js';
import { TANK } from '../public/data.js';

const H = 3600_000, T = Date.now();
const rnd = Math.random;
async function setup(t) {
  setClock(() => T);
  t.after(() => setClock());
  Math.random = () => 0.99; t.after(() => { Math.random = rnd; });   // ngẫu nhiên cố định để so được hai lần chạy
  const srv = await bootServer();
  t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const post = (path, body, c) => srv.json(path, body, { method: 'POST', headers: { 'content-type': 'application/json', cookie: `nt_session=${c}` } });
  const user = async name => {
    const invite = (await srv.admin('invite')).out;
    const cookie = cookieOf(await srv.json('/api/register', { name, pin: '123456', invite }));
    return { play: () => post('/api/play', {}, cookie), save: (play, save) => post('/api/farm', { play, save }, cookie),
      visit: n => srv.json('/api/visit?name=' + n, undefined, { headers: { cookie: `nt_session=${cookie}` } }) };
  };
  return { user };
}
const gap = (a, b) => Math.max(0, a.c - (b.c + b.w - 1), b.c - (a.c + a.w - 1), a.r - (b.r + b.h - 1), b.r - (a.r + a.h - 1));
// Vườn có máy bơm, bồn chứa cạnh giếng còn 10 lần nước, khối ruộng có tưới nhỏ giọt và cây đang lớn
function pumpFarm(name) {
  const s = createGame({ name });
  s.tutorial = 99; s.coins = 1e5; s.mode = 'online'; s.account = name;   // online: trời theo hạt giống và lịch làng, server và trình duyệt chạy bù cùng một trời
  const well = s.farm.ents.find(e => e.kind === 'well');
  well.lv = 4;
  const w = footprint(well), o = s.farm.owned;
  let ok = null;
  for (let r = o.r; r < o.r + o.h && !ok; r++) for (let c = o.c; c < o.c + o.w && !ok; c++) if (gap({ c, r, w: 2, h: 2 }, w) <= 2 && canPlace(s, { kind: 'tank' }, c, r).ok) ok = { c, r };
  assert.ok(placeEntity(s, { kind: 'tank' }, ok.c, ok.r).ok);
  s.water.level = 10;
  const f = s.farm.ents.find(e => e.kind === 'field');
  f.up.drip = true;
  for (const i of f.plots) {
    Object.assign(s.plots[i], { unlocked: true, soil: 'tilled', water: 0 });
    s.plots[i].crop = { id: 'cai', progress: 0, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } };
  }
  return s;
}

test('chạy bù trên server: bồn bơm đúng như trình duyệt chạy bù cùng bản lưu, đóng băng sau 8 giờ không bơm', async t => {
  const { user } = await setup(t);
  const u = await user('Lan'), s = pumpFarm('Lan');
  s.savedAt = T - 20 * H;
  const { play } = (await u.play()).body;
  assert.equal((await u.save(play, s)).status, 200);
  const r = await (await user('Bình')).visit('Lan');
  assert.equal(r.status, 200);
  const srvWater = r.body.farm.water;
  // trình duyệt nạp đúng bản lưu đó, cũng vắng 20 giờ
  const c = structuredClone(s); c.savedAt = T - 20 * H;
  const local = loadGame(c);
  assert.deepEqual(srvWater, local.water);
  assert.ok(tankInfo(local).has);
  // 10 lần ban đầu + bơm 8 giờ, trừ nước tưới nhỏ giọt: ít nhất có bơm, không vượt sức chứa
  assert.ok(srvWater.level > 10 - 9 && srvWater.level <= TANK.cap);
  assert.ok(srvWater.power > 0, 'máy bơm có ghi điện');
  assert.deepEqual(r.body.farm.plots.map(p => p.water), local.plots.map(p => p.water));
});
