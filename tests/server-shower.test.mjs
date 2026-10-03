// Seam 3: server chạy bù vườn online có chuồng heo cấp 3 và bồn chứa (issue 59) qua nhiều buổi sáng: cùng số con đã tắm,
// cùng mực nước như trình duyệt chạy bù cùng bản lưu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame, loadGame, canPlace, placeEntity, upgradePen, footprint, mapOf, tankInfo } from '../public/state.js';
import { setClock } from '../public/clock.js';
import { TANK, ANIMALS, levelInfo } from '../public/data.js';

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
function spot(s, what, ok) {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (ok(c, r) && canPlace(s, what, c, r).ok) return { c, r };
  return null;
}
// Vườn online cấp 10: bồn cạnh giếng còn 7 lần nước (giếng cấp 3 nên không bơm thêm), chuồng heo cấp 3 trong tầm nước có 3 con heo
function showerFarm(name) {
  const s = createGame({ name });
  s.tutorial = 99; s.coins = 1e7; s.mode = 'online'; s.account = name; s.orders = []; s.nextOrderAt = 1e15;
  while (levelInfo(s.exp).level < 10) s.exp += 50;
  s.farm.owned = { c: 10, r: 8, w: 50, h: 38 }; s.farm.rev++;
  const well = s.farm.ents.find(e => e.kind === 'well');
  well.lv = 4;
  const w = footprint(well), p = spot(s, { kind: 'tank' }, (c, r) => gap({ c, r, w: 2, h: 2 }, w) <= 2);
  assert.ok(placeEntity(s, { kind: 'tank' }, p.c, p.r).ok);
  well.lv = 3;
  s.water.level = 7;
  const t = footprint(s.farm.ents.find(e => e.kind === 'tank')), q = spot(s, { kind: 'pen', pen: 'pig' }, (c, r) => gap({ c, r, w: 6, h: 9 }, t) <= TANK.range);
  const r = placeEntity(s, { kind: 'pen', pen: 'pig' }, q.c, q.r);
  assert.ok(r.ok, r.msg);
  assert.ok(upgradePen(s, r.id).ok); assert.ok(upgradePen(s, r.id).ok);
  const area = mapOf(s).penById[r.id].area;
  for (let i = 0; i < 3; i++) s.animals.push({ id: s.nextId++, type: 'heo', name: ANIMALS.heo.name, sex: 'f', stage: 'truong', born: s.time - 1e9, nextProduct: 1e15, ready: false,
    hunger: 100, happy: 50, dirty: 100, sick: 0, bond: 0, pen: r.id, x: area.x + 10 + i * 10, y: area.y + 20 });
  return s;
}

test('chạy bù trên server qua nhiều buổi sáng: vòi sen tắm cùng số con, bồn còn cùng mực nước như trình duyệt', async t => {
  const { user } = await setup(t);
  const u = await user('Lan'), s = showerFarm('Lan');
  s.savedAt = T - 20 * H;
  const { play } = (await u.play()).body;
  assert.equal((await u.save(play, s)).status, 200);
  const r = await (await user('Bình')).visit('Lan');
  assert.equal(r.status, 200);
  const farm = r.body.farm;
  // trình duyệt nạp đúng bản lưu đó, cũng vắng 20 giờ (chạy bù 8 giờ = nhiều ngày làng)
  const c = structuredClone(s); c.savedAt = T - 20 * H;
  const local = loadGame(c);
  assert.equal(farm.water.level, local.water.level);
  assert.equal(tankInfo(local).level, 0, '7 lần nước dùng hết qua mấy buổi sáng (3 con mỗi sáng)');
  const days = l => l.animals.filter(a => a.type === 'heo').map(a => a.shower ?? null);
  assert.deepEqual(days(farm), days(local));
  assert.ok(new Set(days(local)).size >= 2, `tắm ở ít nhất hai buổi sáng khác nhau: ${days(local)}`);
  assert.deepEqual(farm.animals.map(a => Math.round(a.happy * 1000)), local.animals.map(a => Math.round(a.happy * 1000)));
});
