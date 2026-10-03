// Seam 3: tự động hóa theo khối ruộng (issue 58) qua server. Server chạy bù vườn có tưới nhỏ giọt, máy phun trong đợt hạn hán
// ra đúng kết quả như trình duyệt chạy bù cùng bản lưu (thứ tự trừ nước cố định, ADR 0015), kể cả tiền điện lúc 6h sáng.
// Hái một lúc cả ba khối đất màu mỡ ★3 (thêm sản lượng) vẫn được server nhận là chơi bình thường.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import * as G from '../public/state.js';
import { setClock, VILLAGE_EPOCH, VILLAGE_SEED } from '../public/clock.js';
import { DAY_MS, starKey } from '../public/data.js';

const MIN = 60_000, rnd = Math.random;
const gap = (a, b) => Math.max(0, a.c - (b.c + b.w - 1), b.c - (a.c + a.w - 1), a.r - (b.r + b.h - 1), b.r - (a.r + a.h - 1));
const newCrop = (id, progress, more) => ({ id, progress, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false }, ...more });
function spot(s, what, ok) {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if ((!ok || ok(c, r)) && G.canPlace(s, what, c, r).ok) return { c, r };
  return null;
}
async function setup(t, T) {
  setClock(() => T);
  Math.random = () => 0.99;   // ngẫu nhiên cố định để so được hai lần chạy
  t.after(() => { setClock(); Math.random = rnd; });
  const srv = await bootServer();
  t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const reg = async name => { const invite = (await srv.admin('invite')).out; return cookieOf(await srv.json('/api/register', { name, pin: '123456', invite })); };
  const post = (path, body, c) => srv.json(path, body, { method: 'POST', headers: { 'content-type': 'application/json', cookie: `nt_session=${c}` } });
  return { srv, reg, post };
}
// Vườn online (trời theo lịch làng), cấp cao, có máy bơm, bồn chứa cạnh giếng, khối ruộng trong tầm nước
function onlineFarm(name, T) {
  const s = G.createGame({ name });
  Object.assign(s, { mode: 'online', account: name, tutorial: 99, exp: 1e5, coins: 5e4, orders: [], nextOrderAt: 1e12, savedAt: T });
  const well = s.farm.ents.find(e => e.kind === 'well');
  well.lv = 4;
  const w = G.footprint(well), p = spot(s, { kind: 'tank' }, (c, r) => gap({ c, r, w: 2, h: 2 }, w) <= 2);
  assert.ok(G.placeEntity(s, { kind: 'tank' }, p.c, p.r).ok);
  const f = s.farm.ents.find(e => e.kind === 'field'), t = G.footprint(s.farm.ents.find(e => e.kind === 'tank'));
  if (gap(G.footprint(f), t) > 8) { const q = spot(s, { id: f.id }, (c, r) => gap({ c, r, w: 3, h: 3 }, t) <= 8); assert.ok(G.moveEntity(s, f.id, q.c, q.r).ok); }
  return s;
}

test('server chạy bù vườn tưới nhỏ giọt, máy phun trong hạn hán: giống hệt trình duyệt chạy bù cùng bản lưu, cả tiền điện', async t => {
  const dr = G.droughtOf(VILLAGE_SEED, 3);
  const T = VILLAGE_EPOCH + (dr.to - 1) * DAY_MS + 10 * MIN;   // giữa ngày hạn cuối; vắng từ trước đợt hạn
  const { srv, reg, post } = await setup(t, T);
  const owner = await reg('Giọt'), s = onlineFarm('Giọt', T);
  const f = s.farm.ents.find(e => e.kind === 'field');
  for (const k of ['drip', 'spray', 'rich']) assert.ok(G.buyFieldUp(s, f.id, k).ok);
  s.water.level = 200;
  s.inv.pesticide = 2;
  for (const i of f.plots) Object.assign(s.plots[i], { unlocked: true, soil: 'tilled', water: 100, weeds: false, crop: newCrop('bapcai', 0.02) });
  Object.assign(s.plots[f.plots[0]].crop, { bugs: true, bugSince: 0 });
  s.savedAt = T - ((dr.to - dr.from + 1) * DAY_MS + 5 * MIN);
  const coins0 = s.coins;
  const browser = G.loadGame(structuredClone(s));
  const { play } = (await post('/api/play', {}, owner)).body;
  assert.equal((await post('/api/farm', { play, save: s }, owner)).status, 200);
  const v = await srv.json('/api/visit?name=' + encodeURIComponent('Giọt'), undefined, { headers: { cookie: `nt_session=${await reg('Khách')}` } });
  assert.equal(v.status, 200);
  const sf = v.body.farm;
  assert.equal(browser.weather, 'drought');
  assert.equal(sf.weather, browser.weather);
  assert.deepEqual(sf.water, browser.water);
  assert.deepEqual(f.plots.map(i => sf.plots[i].water), f.plots.map(i => browser.plots[i].water));
  assert.deepEqual(f.plots.map(i => sf.plots[i].crop), f.plots.map(i => browser.plots[i].crop));
  assert.equal(sf.coins, browser.coins);
  assert.equal(sf.inv.pesticide, browser.inv.pesticide);
  // máy đã chạy thật: phun hết sâu (trừ thuốc), ruộng không lần nào khô, bồn có dùng nước, tiền điện trừ lúc 6h
  assert.equal(browser.inv.pesticide, 1);
  assert.ok(f.plots.every(i => !browser.plots[i].crop.q.dry && !browser.plots[i].crop.bugs));
  assert.ok(browser.coins < coins0, 'đã trả tiền điện');
  assert.ok(browser.log.some(e => /tiền điện/i.test(e.text)));
});

test('hái một lúc cả ba khối đất màu mỡ ★3 (thêm sản lượng): server nhận như chơi bình thường', async t => {
  const T = Date.now();
  const { reg, post } = await setup(t, T);
  const owner = await reg('Mỡ'), prev = onlineFarm('Mỡ', T);
  for (let k = 0; k < 2; k++) { const p = spot(prev, { kind: 'field' }); assert.ok(G.placeEntity(prev, { kind: 'field' }, p.c, p.r).ok); for (const i of prev.farm.ents.at(-1).plots) prev.plots[i].unlocked = true; }
  const fields = prev.farm.ents.filter(e => e.kind === 'field');
  assert.equal(fields.length, 3);
  for (const f of fields) {
    assert.ok(G.buyFieldUp(prev, f.id, 'rich').ok);
    for (const i of f.plots) Object.assign(prev.plots[i], { unlocked: true, soil: 'tilled', water: 100, crop: newCrop('duahau', 1, { fert: true, rich: true, q: { dry: false, bugMax: 0, hand: true } }) });
  }
  const { play } = (await post('/api/play', {}, owner)).body;
  assert.equal((await post('/api/farm', { play, save: prev }, owner)).status, 200);
  const next = structuredClone(prev);
  for (const f of fields) for (const i of f.plots) {
    next.mastery.duahau = { lv: 1, n: 0 };   // giữ thành thạo cấp 1 cho dễ đếm
    assert.equal(G.perform(next, { kind: 'plot', idx: i }, 'harvest').ok, true);
    G.stashAll(next);
  }
  assert.equal(next.inv[starKey('duahau', 3)], 27 * 11, 'dưa hấu 6 × (1 + 50% phân + 25% màu mỡ) = 11 mỗi ô');
  next.simMs += 10_000; next.savedAt = T + 10_000;
  const r = await post('/api/farm', { play, save: next }, owner);
  assert.equal(r.status, 200, r.body?.error);
});
