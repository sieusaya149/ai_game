// Seam 3 (+ seam 1): server chạy bù vườn chủ offline (issue 24). Server chạy cùng tiến trình test nên setClock đặt giờ cho cả hai.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame, loadGame, tick } from '../public/state.js';
import { setClock } from '../public/clock.js';
import { MAX_CATCHUP_MS, SICK, PREDATOR } from '../public/data.js';
import { TS } from '../public/layout.js';
import { serverDay } from '../public/clock.js';
import { readFileSync } from 'node:fs';

const H = 3600_000, T = Date.now();
// ngẫu nhiên (sâu, bệnh) cố định để so được kết quả hai lần chạy
const rnd = Math.random;
const fixRandom = t => { Math.random = () => 0.99; t.after(() => { Math.random = rnd; }); };
async function setup(t) {
  setClock(() => T);
  t.after(() => setClock());
  fixRandom(t);
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
  // chủ vườn đẩy bản lưu có savedAt lùi `ago` rồi "tắt máy" (không giữ kết nối)
  const owner = async (name, ago, mutate) => {
    const u = await user(name), s = createGame({ name }); s.tutorial = 99; mutate?.(s); s.savedAt = T - ago;
    const { play } = (await u.play()).body;
    assert.equal((await u.save(play, s)).status, 200);
    return { u, s };
  };
  return { srv, user, owner };
}
const plant = s => { s.plots[0].soil = 'tilled'; s.plots[0].water = 100; s.plots[0].crop = { id: 'cai', progress: 0, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 }; };
const local = (s, ago) => { const c = structuredClone(s); c.savedAt = T - ago; return loadGame(c); };

test('chạy bù: khách đọc vườn chủ offline thấy cây đã lớn đúng 3 giờ, server lưu lại', async t => {
  const { user, owner } = await setup(t);
  const { s } = await owner('Lan', 3 * H, plant);
  const b = await user('Bình');
  const r = await b.visit('Lan');
  assert.equal(r.status, 200);
  assert.equal(r.body.farm.simMs - s.simMs, 3 * H);
  assert.ok(r.body.farm.plots[0].crop.progress > 0);
  assert.equal(r.body.farm.plots[0].crop.progress, local(s, 3 * H).plots[0].crop.progress);
  const again = await (await user('Chị Hai')).visit('Lan');   // đã lưu trên server: đọc lại không đổi
  assert.equal(again.body.farm.savedAt, T);
  assert.deepEqual(again.body.farm, r.body.farm);
});

test('chạy bù: vắng 20 giờ chỉ tiến 8 giờ mô phỏng, phần dư đóng băng ghi lại', async t => {
  const { user, owner } = await setup(t);
  const { s } = await owner('Lan', 20 * H, plant);
  const f = (await (await user('Bình')).visit('Lan')).body.farm;
  assert.equal(f.simMs - s.simMs, MAX_CATCHUP_MS);
  assert.equal(f.time - s.time, MAX_CATCHUP_MS);
  assert.equal(f.frozenTotal, 12 * H);
  assert.equal(f.savedAt, T);
});

test('chạy bù: vật nuôi đói và bệnh vắng 20 giờ vẫn sống, không có sự kiện chết', async t => {
  const { user, owner } = await setup(t);
  const { s } = await owner('Lan', 20 * H, s => { for (const a of s.animals) { a.hunger = 0; a.sick = true; a.starvingSince = 1; } });
  assert.ok(s.animals.length > 0);
  const f = (await (await user('Bình')).visit('Lan')).body.farm;
  assert.equal(f.animals.length, s.animals.length);
  assert.ok(f.animals.every(a => a.hunger === 0 && a.sick));   // vẫn đói, vẫn bệnh, nhưng sống
  assert.ok(!(f.awayPending?.lines ?? []).some(l => l.includes('chết')), 'không báo chết');
});

test('chạy bù: nhiều người đọc cùng lúc chỉ chạy một lần', async t => {
  const { user, owner } = await setup(t);
  const { s } = await owner('Lan', 3 * H, plant);
  const [b, c] = [await user('Bình'), await user('Cúc')];
  const [x, y] = await Promise.all([b.visit('Lan'), c.visit('Lan')]);
  assert.equal(x.body.farm.simMs - s.simMs, 3 * H);
  assert.deepEqual(y.body.farm, x.body.farm);
  assert.deepEqual((await b.visit('Lan')).body.farm, x.body.farm);
});

test('chạy bù: chủ quay lại nhận vườn đã chạy bù cùng màn "Trong lúc bạn vắng nhà"', async t => {
  const { user, owner } = await setup(t);
  const { u } = await owner('Lan', 2 * H, s => { plant(s); s.plots[0].crop.progress = 0.99; });
  await (await user('Bình')).visit('Lan');   // khách đọc trước, chạy bù xong rồi
  const g = loadGame((await u.play()).body.farm);
  assert.ok(g.away.lines.some(l => l.includes('đã chín')), JSON.stringify(g.away));
  assert.ok(g.plots[0].crop.progress >= 1);
});

test('chạy bù (seam 1): một lần dài giống chạy chơi đơn cùng khoảng đó', t => {
  fixRandom(t);
  setClock(() => T);
  try {
    const s = createGame({ name: 'Lan' }); plant(s);
    const a = local(s, 5 * H);
    const b = structuredClone(s); b.threats = [];
    tick(b, 5 * H);
    assert.equal(a.plots[0].crop.progress, b.plots[0].crop.progress);
    assert.equal(a.simMs, b.simMs);
  } finally { setClock(); }
});

test('visit: cần đăng nhập, vườn không có thì 404', async t => {
  const { srv, user } = await setup(t);
  assert.equal((await srv.json('/api/visit?name=Lan', undefined, {})).status, 401);
  assert.equal((await (await user('Bình')).visit('Ai đó')).body.code, 'no_farm');
});

// Gộp Phase 1 + Phase 2: vườn online lưu từ trước bằng bản v2 (có trường online) vẫn chạy bù và lên v3 không mất gì
test('chạy bù vườn lưu bằng bản v2 có trường online: thành v3, giữ nhật ký khách, thống kê hôm nay, xích chó', async t => {
  const { user } = await setup(t);
  const v2 = JSON.parse(readFileSync(new URL('./fixtures/v2-farm.json', import.meta.url), 'utf8'));
  const guest = { id: 'op-v2-0001', kind: 'help', act: 'water', by: 'Bình', lv: 5, at: T - 4 * H, seen: false };
  Object.assign(v2, { tutorial: 99, mode: 'online', account: 'Lan', guests: [guest], savedAt: T - 3 * H,
    today: { day: serverDay(T), helps: 2, steals: 1, stolen: 30, robs: 0 } });
  Object.assign(v2.dog, { chained: true, nap: 0, napCheck: 0, quiet: 0, barkAt: 0, barkX: 0, barkY: 0 });
  Object.assign(v2.stats, { chased: 3, barks: 7, robStreak: 4, helps: 5 });
  assert.equal(v2.v, 2);
  const u = await user('Lan');
  const { play } = (await u.play()).body;
  assert.equal((await u.save(play, v2)).status, 200);

  const f = (await (await user('Bình')).visit('Lan')).body.farm;
  assert.equal(f.v, 3);
  assert.equal(f.simMs - v2.simMs, 3 * H, 'chạy bù đủ 3 giờ');
  assert.equal(f.dog.stage, 'truong'); assert.equal(f.dog.adult, undefined);
  assert.equal(f.dog.chained, true);
  assert.equal(f.animals.length, v2.animals.length);
  assert.ok(f.animals.every(a => a.stage && a.sex && a.adult === undefined));
  assert.deepEqual(f.guests, [guest]);
  assert.deepEqual(f.today, v2.today);
  for (const k of ['chased', 'barks', 'robStreak', 'helps']) assert.equal(f.stats[k], v2.stats[k], k);
  assert.equal(f.mode, 'online'); assert.equal(f.account, 'Lan');
});
// Tiêu chí seam 3 đã hoãn của issue 38 và 43 (lúc đó nhánh phase2 chưa có server): server chạy bù 8 giờ theo ADR 0004
const more = (s, extra) => { const a = { ...structuredClone(s.animals[0]), id: s.nextId++, ...extra }; s.animals.push(a); return a; };
test('server chạy bù 8 giờ (issue 38): con Bệnh nặng và Nguy kịch vẫn sống, Nguy kịch hạ về Bệnh nặng', async t => {
  const { user, owner } = await setup(t);
  let ids, crit;
  await owner('Lan', 8 * H, s => {
    more(s, { sick: 2, sickMs: SICK.toSevere });
    crit = more(s, { sick: 3, sickMs: SICK.toCritical }).id;
    ids = s.animals.map(a => a.id);
  });
  const f = (await (await user('Bình')).visit('Lan')).body.farm;
  assert.deepEqual(f.animals.map(a => a.id).sort(), [...ids].sort(), 'không con nào chết');
  assert.ok(f.animals.every(a => a.sick <= 2), 'chạy bù không để con nào ở mức Nguy kịch');
  assert.ok(f.animals.find(a => a.id === crit).sick <= 2, 'con nguy kịch hạ xuống (Bệnh nặng hay nhẹ hơn), không chết');
});

test('server chạy bù 8 giờ (issue 43): có chuột, diều hâu, chồn thì không con nào chết hay bị cắn', async t => {
  const { user, owner } = await setup(t);
  let ids;
  await owner('Lan', 8 * H, s => {
    s.exp = 5000; s.troughs.chicken = 20;
    const a = s.animals[0], b = more(s, {}), c = Math.floor(a.x / TS), r = Math.floor(a.y / TS);
    const pred = (kind, extra) => s.preds.push({ id: s.nextId++, kind, state: 'hunt', since: s.time, warned: false, strikeAt: s.time + PREDATOR.warnMs, tile: null, target: null, ...extra });
    for (let i = 0; i < 3; i++) pred('rat', { tile: { c, r }, x: c * TS + 8, y: r * TS + 8, tileAt: s.time + 1e9 });
    pred('hawk', { x: a.x, y: a.y, target: a.id });
    pred('weasel', { x: b.x, y: b.y, target: b.id });
    ids = s.animals.map(x => x.id);
  });
  const f = (await (await user('Bình')).visit('Lan')).body.farm;
  assert.deepEqual(f.animals.map(a => a.id).sort(), [...ids].sort(), 'không con nào chết hay bị bắt đi');
  assert.equal(f.animals.filter(a => a.hurt).length, 0, 'không con nào bị cắn');
  assert.equal(f.preds.some(p => p.kind !== 'rat'), false, 'diều hâu, chồn bỏ đi tay không');
  assert.ok(f.troughs.chicken < 20, 'cám trong máng có hao');
  assert.ok(f.preds.filter(p => p.kind === 'rat').length <= PREDATOR.rat.max, 'chuột không sinh quá trần');
});