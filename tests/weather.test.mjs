// Seam 1 (+ seam 3 ở cuối): thời tiết là hàm thuần của ngày game và hạt giống (issue 55, ADR 0014).
// Tần suất theo mùa, báo trước ngày mai, hạn hán / rơm, sương muối, bão, cầu vồng, bảo hộ người mới, không thời tiết nào gây chết.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { setClock, VILLAGE_EPOCH, VILLAGE_SEED } from '../public/clock.js';
import { DAY_MS, WEATHER, CROP_STAGES, levelInfo } from '../public/data.js';
import { bootServer } from './helpers/server.mjs';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const SEC = 1000, MIN = 60_000;
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };   // không sâu, không cỏ, không bệnh
const expFor = lv => { let e = 0; while (levelInfo(e).level < lv) e += levelInfo(e).need - levelInfo(e).cur; return e; };
const SEED = 7;   // hạt giống thử: đủ cả 7 loại trời trong 25 ngày đầu
const KINDS = ['sun', 'cloud', 'rain', 'storm', 'drought', 'frost', 'rainbow'];
const seasonOfDay = d => ['xuan', 'ha', 'thu', 'dong'][Math.floor((d - 1) / 7) % 4];
// ngày đầu tiên (từ `from`) có thời tiết `kind` theo hạt giống
const dayWith = (kind, seed = SEED, from = 2) => { for (let d = from; d < from + 5000; d++) if (G.weatherOn(seed, d) === kind) return d; throw new Error('không thấy ' + kind); };
const newCrop = (id, progress) => ({ id, progress, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } });
// vườn chơi đơn cấp `lv`, hạt giống SEED, đứng 1 giây trước 6h sáng ngày `day` (bước tick đầu tiên sang ngày mới)
function farm(day, lv = 5) {
  const s = G.createGame({ name: 'Trời' }); s.tutorial = 99; s.orders = []; s.nextOrderAt = 1e12;
  s.exp = expFor(lv); s.wseed = SEED;
  s.time = (day - 1) * DAY_MS - SEC; s.day = day - 1; s.wday = day - 1; s.weather = 'cloud';
  return s;
}
const dawn = s => quiet(() => G.tick(s, 2 * SEC));

test('cùng số ngày và hạt giống thì cùng thời tiết; hạt giống khác cho chuỗi khác', () => {
  const run = seed => Array.from({ length: 200 }, (_, i) => G.weatherOn(seed, i + 1));
  assert.deepEqual(run(SEED), run(SEED));
  assert.notDeepEqual(run(SEED), run(SEED + 1));
  for (const k of run(SEED)) assert.ok(KINDS.includes(k), k);
});

test('quét nhiều năm game: tần suất bão, sương muối khớp bảng; hạn hán đúng 1 đợt 2–3 ngày mỗi Hạ; Xuân, Đông không có bão', () => {
  const years = 3000, n = { storm: 0, stormDays: 0, frost: 0, dong: 0 };
  for (let y = 0; y < years; y++) {
    const runs = [];
    for (let d = y * 28 + 1; d <= y * 28 + 28; d++) {
      const k = G.weatherOn(SEED, d), se = seasonOfDay(d);
      if (k === 'storm') assert.ok(se === 'ha' || se === 'thu', `bão mùa ${se}`);
      if (k === 'frost') assert.equal(se, 'dong');
      if (k === 'drought') { assert.equal(se, 'ha'); const r = runs.at(-1); if (r && r.to === d - 1) r.to = d; else runs.push({ from: d, to: d }); }
      if ((se === 'ha' || se === 'thu') && k !== 'drought') { n.stormDays++; if (k === 'storm') n.storm++; }
      if (se === 'dong') { n.dong++; if (k === 'frost') n.frost++; }
      if (k === 'rainbow') assert.ok(['rain', 'storm'].includes(G.weatherOn(SEED, d - 1)), 'cầu vồng chỉ sau mưa');
    }
    assert.equal(runs.length, 1, `năm ${y}: ${runs.length} đợt hạn`);
    const len = runs[0].to - runs[0].from + 1;
    assert.ok(len >= WEATHER.drought[0] && len <= WEATHER.drought[1], `đợt hạn dài ${len}`);
  }
  const storm = n.storm / n.stormDays, frost = n.frost / n.dong;
  assert.ok(Math.abs(storm - WEATHER.table.ha.storm) < 0.01, `bão ${storm}`);
  assert.ok(Math.abs(frost - WEATHER.table.dong.frost) < 0.015, `sương muối ${frost}`);
});

test('báo trước: forecast hôm nay đúng bằng thời tiết thật của ngày mai, qua nhiều ngày', () => {
  const s = farm(2);
  dawn(s);
  for (let i = 0; i < 60; i++) {
    const f = G.forecast(s);
    quiet(() => G.tick(s, DAY_MS));
    assert.equal(s.weather, f, `ngày ${G.dayOf(s)}`);
    assert.equal(s.weather, G.weatherOf(s));
  }
});

test('sáng ra mà ngày mai có thời tiết xấu thì có thông báo 🟡 báo trước', () => {
  const d = dayWith('storm') - 1, s = farm(d);
  const ev = dawn(s);
  assert.ok(ev.some(e => e.type === 'forecast' && e.kind === 'storm'));
});

test('hạn hán: đất khô nhanh gấp 2 ngày nắng; ô phủ rơm khô chậm lại', () => {
  const dry = (kind, mulch) => {
    const s = farm(dayWith(kind)); dawn(s);
    assert.equal(s.weather, kind);
    const p = s.plots[0]; p.soil = 'tilled'; p.water = 100; p.mulch = mulch;
    quiet(() => G.tick(s, MIN));
    return 100 - p.water;
  };
  const sun = dry('sun', false), drought = dry('drought', false), mulched = dry('drought', true);
  assert.ok(sun > 0);
  assert.ok(Math.abs(drought - sun * WEATHER.droughtDry) < 1e-6, `${drought} vs ${sun}`);
  assert.ok(Math.abs(mulched - drought * WEATHER.mulchDry) < 1e-6);
});

test('phủ rơm là đồ tiêu hao: tốn 1 rơm, thu hoạch xong thì rơm mất', () => {
  const s = farm(5); dawn(s);
  const p = s.plots[0]; p.soil = 'tilled'; p.crop = newCrop('cai', 0.2); p.water = 100;
  assert.equal(G.actionsFor(s, { kind: 'plot', idx: 0 }).find(a => a.id === 'mulch')?.disabled, 'Hết rơm phủ luống, mua ở chợ nhé');
  s.inv.straw = 2;
  assert.ok(G.perform(s, { kind: 'plot', idx: 0 }, 'mulch').ok);
  assert.equal(p.mulch, true);
  assert.equal(s.inv.straw, 1);
  assert.equal(G.actionsFor(s, { kind: 'plot', idx: 0 }).some(a => a.id === 'mulch'), false);   // phủ rồi
  p.crop.progress = 1;
  assert.ok(G.perform(s, { kind: 'plot', idx: 0 }, 'harvest').ok);
  assert.equal(p.mulch, false);
});

test('sương muối: cây hạt và mầm ngừng lớn đúng 1 ngày; cây lớn hơn vẫn lớn; ô phủ rơm không bị', () => {
  const d = dayWith('frost'), s = farm(d);
  const set = (i, prog, mulch = false) => Object.assign(s.plots[i], { soil: 'tilled', water: 100, mulch, crop: newCrop('carot', prog) });
  set(0, 0); set(1, CROP_STAGES[1] + 0.01); set(2, CROP_STAGES[2] + 0.01); set(3, 0, true);
  dawn(s);
  assert.equal(s.weather, 'frost');
  assert.equal(G.frostHold(s, s.plots[0]), true);
  assert.equal(G.frostHold(s, s.plots[2]), false);
  const before = s.plots.slice(0, 4).map(p => p.crop.progress);
  // cả ngày sương muối (tưới đủ để nước không ảnh hưởng)
  quiet(() => { while (s.time + 30 * SEC < d * DAY_MS) { for (const p of s.plots) p.water = 100; G.tick(s, 30 * SEC); } });
  assert.equal(G.dayOf(s), d);
  assert.equal(s.plots[0].crop.progress, before[0]);
  assert.equal(s.plots[1].crop.progress, before[1]);
  assert.ok(s.plots[2].crop.progress > before[2]);
  assert.ok(s.plots[3].crop.progress > before[3]);
  // hôm sau (không phải sương muối nữa) thì lớn lại
  if (G.weatherOn(SEED, d + 1) !== 'frost') {
    quiet(() => { for (let t = 0; t < 2 * MIN; t += 30 * SEC) { for (const p of s.plots) p.water = 100; G.tick(s, 30 * SEC); } });
    assert.ok(s.plots[0].crop.progress > before[0]);
  }
});

test('bão: quật đổ bù nhìn (dựng lại bằng xu), con vật ngoài trời mất vui, con trong chuồng thì không', () => {
  const d = dayWith('storm'), s = farm(d);
  s.coins = 1000; s.inv.deco_scarecrow = 1;
  const o = s.farm.owned;
  let placed = false;
  for (let r = o.r; r < o.r + o.h && !placed; r++) for (let c = o.c; c < o.c + o.w && !placed; c++) if (G.canPlace(s, { kind: 'deco', item: 'deco_scarecrow' }, c, r).ok) placed = G.placeEntity(s, { kind: 'deco', item: 'deco_scarecrow' }, c, r).ok;
  assert.ok(placed);
  const sc = s.farm.ents.find(e => e.item === 'deco_scarecrow');
  // hai con gà của vườn mới: một con lạc ngủ ngoài từ đêm qua, một con đã về chuồng
  const [out, home] = s.animals.filter(a => a.type === 'ga');
  for (const a of [out, home]) { a.happy = 90; a.hunger = 100; }
  out.tile = { c: Math.floor(G.mapOf(s).spawn.x / 16), r: Math.floor(G.mapOf(s).spawn.y / 16) }; out.stray = true; out.tileAt = 1e15;
  home.tile = null;
  dawn(s);
  assert.equal(s.weather, 'storm');
  assert.equal(sc.down, true);
  quiet(() => { for (let i = 0; i < 5; i++) { for (const a of s.animals) a.hunger = 100; G.tick(s, MIN); } });
  assert.ok(out.tile, 'con ngoài trời vẫn ở ngoài');
  assert.equal(home.tile, null, 'trời bão: con trong chuồng không ra');
  assert.ok(out.happy < home.happy - 10, `${out.happy} vs ${home.happy}`);
  // dựng lại bù nhìn
  const act = G.actionsFor(s, { kind: 'deco', id: sc.id }).find(a => a.id === 'raise');
  assert.ok(act && !act.disabled);
  const coins = s.coins;
  assert.ok(G.perform(s, { kind: 'deco', id: sc.id }, 'raise').ok);
  assert.equal(sc.down, false);
  assert.equal(s.coins, coins - WEATHER.scarecrowFix);
});

test('cầu vồng: sáng ra con vật vui hơn', () => {
  const s = farm(dayWith('rainbow'));
  for (const a of s.animals) a.happy = 50;
  dawn(s);
  assert.equal(s.weather, 'rainbow');
  for (const a of s.animals) assert.ok(a.happy >= 50 + WEATHER.rainbowHappy - 1, `${a.type} ${a.happy}`);
});

test('duyệt qua mọi loại thời tiết nhiều ngày: không cây, không con vật nào chết vì thời tiết', () => {
  const s = farm(2);
  const seen = new Set(), n0 = s.animals.length;
  for (const p of s.plots.slice(0, 6)) Object.assign(p, { soil: 'tilled', water: 0, crop: newCrop('cai', 0.05) });
  quiet(() => {
    for (let day = 0; day < 30; day++) {
      for (let t = 0; t < DAY_MS; t += 30 * SEC) {
        for (const a of s.animals) { a.hunger = 100; a.age = 0; a.dirty = 0; }
        for (const p of s.plots.slice(0, 6)) if (p.crop && p.crop.progress >= 0.5) p.crop.progress = 0.05;   // không để chín quá mà héo
        G.tick(s, 30 * SEC);
        seen.add(s.weather);
      }
    }
  });
  for (const k of KINDS) assert.ok(seen.has(k), `chưa gặp ${k}`);
  assert.equal(s.animals.length, n0);
  for (const p of s.plots.slice(0, 6)) { assert.ok(p.crop); assert.equal(p.crop.dead, false); assert.equal(p.crop.rotten, false); }
});

test('dưới cấp 5 chưa có thời tiết xấu (cả báo trước); từ cấp 5 thì có', () => {
  const s = farm(2, 4), t = farm(2, 5);
  const seen4 = new Set(), seen5 = new Set();
  quiet(() => { for (let i = 0; i < 40; i++) { G.tick(s, DAY_MS); G.tick(t, DAY_MS); seen4.add(s.weather).add(G.forecast(s)); seen5.add(t.weather); s.exp = expFor(4); t.exp = expFor(5); } });
  for (const k of WEATHER.bad) { assert.equal(seen4.has(k), false, k); assert.ok(seen5.has(k), k); }
});

test('online: thời tiết theo lịch làng và hạt giống làng; hai vườn khác nhau cùng giờ làng thấy cùng một trời', t => {
  t.after(() => setClock());
  const d = dayWith('storm', VILLAGE_SEED, 30), T = VILLAGE_EPOCH + (d - 1) * DAY_MS + 5 * MIN;
  setClock(() => T);
  const mk = name => { const s = G.createGame({ name }); s.mode = 'online'; s.account = name; s.exp = expFor(6); s.wseed = name.length * 977; return s; };
  const a = mk('Lan'), b = mk('Bình Minh');
  quiet(() => { G.tick(a, SEC); G.tick(b, SEC); });
  assert.equal(a.weather, 'storm');
  assert.equal(b.weather, 'storm');
  assert.equal(G.forecast(a), G.weatherOn(VILLAGE_SEED, d + 1));
});

test('mất điện: chỉ ngày bão có cờ mất điện, và chỉ nửa ngày đầu', () => {
  let d = 2; while (!(G.weatherOn(SEED, d) === 'storm' && G.outageOn(SEED, d))) d++;
  const s = farm(d); dawn(s);
  assert.equal(G.powerOut(s), true);
  quiet(() => G.tick(s, DAY_MS * 0.6));
  assert.equal(G.powerOut(s), false);
  const sunny = farm(dayWith('sun')); dawn(sunny);
  assert.equal(G.powerOut(sunny), false);
});

// ---- Seam 3: server chạy bù và trình duyệt chạy bù cùng bản lưu qua một đợt hạn hán ra cùng kết quả ----
test('server chạy bù qua đợt hạn hán: cùng thời tiết, cùng kết quả vườn như trình duyệt chạy bù', async t => {
  const y = 3, dr = G.droughtOf(VILLAGE_SEED, y);
  const T = VILLAGE_EPOCH + (dr.to - 1) * DAY_MS + 10 * MIN;   // giữa ngày hạn cuối; vắng từ trước đợt hạn
  setClock(() => T);
  t.after(() => setClock());
  const rnd = Math.random; Math.random = () => 0.99; t.after(() => { Math.random = rnd; });
  const srv = await bootServer(); t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const reg = async name => { const invite = (await srv.admin('invite')).out; return cookieOf(await srv.json('/api/register', { name, pin: '123456', invite })); };
  const post = (path, body, c) => srv.json(path, body, { method: 'POST', headers: { 'content-type': 'application/json', cookie: `nt_session=${c}` } });
  const owner = await reg('Hạn'), s = G.createGame({ name: 'Hạn' });
  s.mode = 'online'; s.account = 'Hạn'; s.tutorial = 99; s.exp = expFor(6); s.orders = []; s.nextOrderAt = 1e12;
  s.savedAt = T - ((dr.to - dr.from + 1) * DAY_MS + 5 * MIN);
  for (const [i, mulch] of [[0, false], [1, true], [2, false]]) Object.assign(s.plots[i], { soil: 'tilled', water: 100, mulch, crop: newCrop('bap', 0.05) });
  const browser = G.loadGame(structuredClone(s));
  const { play } = (await post('/api/play', {}, owner)).body;
  assert.equal((await post('/api/farm', { play, save: s }, owner)).status, 200);
  const f = (await srv.json('/api/visit?name=' + encodeURIComponent('Hạn'), undefined, { headers: { cookie: `nt_session=${await reg('Khách')}` } })).body.farm;
  assert.equal(browser.weather, 'drought');
  assert.equal(f.weather, browser.weather);
  assert.equal(f.wday, browser.wday);
  for (let i = 0; i < 3; i++) {
    assert.equal(f.plots[i].water, browser.plots[i].water, `nước ô ${i}`);
    assert.equal(f.plots[i].crop.progress, browser.plots[i].crop.progress, `tiến độ ô ${i}`);
  }
});
