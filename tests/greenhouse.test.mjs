// Seam 1 (+ seam 3 ở cuối): nhà kính phủ một khối ruộng 3×3 (issue 60). Đặt qua canPlace / placeEntity (cấp 14, tối đa 2,
// phải trùng khối ruộng); ô bên trong bỏ qua mùa (★3 giữa Đông), không bị sương muối, bão hay quạ; trộm vẫn vào được;
// sưởi mùa Đông tốn tiền điện lúc 6h; bão có lúc làm vỡ kính, sửa bằng xu; bảng trạng thái đếm ô khô, sâu, chín, héo.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { setClock, VILLAGE_EPOCH, VILLAGE_SEED } from '../public/clock.js';
import { DAY_MS, GLASS, SEASON, NIGHT_FROM, levelInfo } from '../public/data.js';
import { bootServer } from './helpers/server.mjs';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const SEC = 1000, MIN = 60_000;
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };
const quiet = fn => withRandom(0.99, fn);   // không sâu, không cỏ, không quạ
const LUCKY = 0.0001;                        // trúng mọi xác suất nhỏ
const expFor = lv => { let e = 0; while (levelInfo(e).level < lv) e += levelInfo(e).need - levelInfo(e).cur; return e; };
const SEED = 7;
const XUAN = 1, DONG = 22;
const dayWith = (kind, from = 2, ok = () => true) => { for (let d = from; d < from + 20000; d++) if (G.weatherOn(SEED, d) === kind && ok(d)) return d; throw new Error('không thấy ' + kind); };
const newCrop = (id, progress) => ({ id, progress, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } });

// Vườn chơi đơn cấp `lv`, nhiều xu, đứng đầu ngày `day` (trời của ngày đó đã chốt)
function farm({ lv = 14, day = XUAN } = {}) {
  const s = G.createGame({ name: 'Kính' }); s.tutorial = 99; s.orders = []; s.nextOrderAt = 1e12;
  s.exp = expFor(lv); s.wseed = SEED; s.coins = 100_000;
  s.time = (day - 1) * DAY_MS; s.day = day; s.wday = day; s.weather = 'cloud';
  return s;
}
const fields = s => s.farm.ents.filter(e => e.kind === 'field');
// Thêm một khối ruộng ở chỗ trống đầu tiên đặt được
function addField(s) {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (G.canPlace(s, { kind: 'field' }, c, r).ok) { assert.ok(G.placeEntity(s, { kind: 'field' }, c, r).ok); for (const i of fields(s).at(-1).plots) s.plots[i].unlocked = true; return fields(s).at(-1); }
  throw new Error('hết chỗ đặt khối ruộng');
}
const GH = { kind: 'greenhouse' };
const build = (s, f = fields(s)[0]) => G.placeEntity(s, GH, f.c, f.r);
// Ô ruộng thứ k của khối f, đã cuốc, đủ nước, có cây `id` ở tiến độ `prog`
function sow(s, f, k, id, prog = 0) {
  const p = s.plots[f.plots[k]];
  Object.assign(p, { unlocked: true, soil: 'tilled', water: 100, weeds: false, mulch: false, crop: newCrop(id, prog) });
  return p;
}
// Chạy `ms` mà mọi ô luôn đủ nước
// Chạy trúng mọi xác suất nhỏ trong n bước 5 giây, ghi lại các ô quạ nhắm tới
const crowRun = (s, n, each = () => {}) => withRandom(LUCKY, () => { const seen = new Set(); for (let i = 0; i < n; i++) { each(); G.tick(s, 5 * SEC); for (const t of s.threats) if (t.kind === 'crow') seen.add(t.plot); } return seen; });
const grow = (s, ms, step = 5 * SEC) => quiet(() => { for (let t = 0; t < ms; t += step) { for (const p of s.plots) if (p.crop) p.water = 100; G.tick(s, Math.min(step, ms - t)); } });
// Bước qua 6h sáng ngày `day` (trời và tiền điện ngày đó chốt ở bước này)
function dawn(s, day) {
  s.time = (day - 1) * DAY_MS - SEC; s.day = day - 1; s.wday = day - 1; s.weather = 'cloud';
  return quiet(() => G.tick(s, 2 * SEC));
}

test('đặt nhà kính: dưới cấp 14 bị từ chối, không trùng khối ruộng bị từ chối, trùng đúng khối thì đặt được', () => {
  const low = farm({ lv: 13 }), f = fields(low)[0];
  assert.equal(G.canPlace(low, GH, f.c, f.r).reason, 'level');
  assert.equal(build(low).ok, false);
  const s = farm(), g = fields(s)[0];
  for (const [dc, dr] of [[1, 0], [0, 1], [-1, -1], [3, 0]]) assert.equal(G.canPlace(s, GH, g.c + dc, g.r + dr).reason, 'no_field', `${dc},${dr}`);
  assert.equal(G.canPlace(s, GH, s.farm.owned.c, s.farm.owned.r).reason, 'no_field');
  assert.deepEqual(G.canPlace(s, GH, g.c, g.r), { ok: true });
  const coins = s.coins;
  assert.equal(G.placeCost(s, GH), GLASS.price);
  const r = build(s);
  assert.ok(r.ok, r.msg);
  assert.equal(s.coins, coins - GLASS.price);
  assert.equal(G.greenhouses(s).length, 1);
  assert.equal(G.greenhouses(s)[0], g);
  assert.ok(g.up.glass && !g.up.glass.broken);
  assert.equal(G.canPlace(s, GH, g.c, g.r).reason, 'has_glass');   // khối này có nhà kính rồi
  const poor = farm(); poor.coins = GLASS.price - 1;
  assert.equal(G.canAfford(poor, GH).reason, 'coins');
  assert.equal(build(poor).ok, false);
  assert.equal(poor.coins, GLASS.price - 1);
});

test('mỗi vườn tối đa 2 nhà kính', () => {
  const s = farm({ lv: 20 });
  const [a, b, c] = [fields(s)[0], addField(s), addField(s)];
  assert.ok(build(s, a).ok);
  assert.ok(build(s, b).ok);
  const chk = G.canPlace(s, GH, c.c, c.r);
  assert.equal(chk.reason, 'max_glass');
  assert.match(chk.msg, /2/);
  assert.equal(build(s, c).ok, false);
  assert.equal(G.greenhouses(s).length, GLASS.max);
});

test('nhà kính là thuộc tính của khối ruộng: dời khối thì đi theo, khối có nhà kính không cất được, lưu và nạp lại vẫn còn', () => {
  const s = farm({ lv: 20 }), f = addField(s);
  assert.ok(build(s, f).ok);
  const o = s.farm.owned;
  let moved = false;
  for (let r = o.r; r < o.r + o.h && !moved; r++) for (let c = o.c; c < o.c + o.w && !moved; c++) if ((c !== f.c || r !== f.r) && G.canPlace(s, { id: f.id }, c, r).ok) moved = G.moveEntity(s, f.id, c, r).ok;
  assert.ok(moved);
  assert.ok(f.up.glass);
  assert.equal(G.greenhouses(s)[0], f);
  const st = G.storeEntity(s, f.id);
  assert.equal(st.ok, false);
  assert.equal(st.reason, 'has_glass');
  const back = G.loadGame(JSON.parse(JSON.stringify({ ...s, savedAt: Date.now() })));
  assert.deepEqual(back.farm.ents.find(e => e.id === f.id).up.glass, f.up.glass);
});

test('ô trong nhà kính bỏ qua trái mùa: giữa Đông cây mùa Xuân lớn đủ tốc độ và ra ★3; ngoài nhà kính thì chậm, chỉ ★2', () => {
  const s = farm({ day: DONG }), out = fields(s)[0], gh = addField(s);
  assert.ok(build(s, gh).ok);
  const a = sow(s, gh, 0, 'cai'), b = sow(s, out, 0, 'cai');
  for (const p of [a, b]) { p.crop.fert = true; p.crop.q.hand = true; }
  assert.equal(G.seasonOf(s).key, 'dong');
  grow(s, 30 * SEC);
  assert.ok(Math.abs(b.crop.progress / a.crop.progress - SEASON.slow) < 0.01, `${a.crop.progress} vs ${b.crop.progress}`);
  assert.equal(a.crop.offSeason, undefined);
  assert.equal(b.crop.offSeason, true);
  assert.equal(G.glassOn(s, a), true);
  assert.equal(G.glassOn(s, b), false);
  grow(s, 2 * MIN);
  assert.ok(a.crop.progress >= 1);
  assert.equal(G.cropStar(a.crop), 3);
  assert.equal(G.cropStar(b.crop), 2);
});

test('sương muối không dừng cây hạt, mầm trong nhà kính; ngoài nhà kính thì có', () => {
  const d = dayWith('frost'), s = farm({ day: d - 1 }), out = fields(s)[0], gh = addField(s);
  assert.ok(build(s, gh).ok);
  const a = sow(s, gh, 0, 'carot'), b = sow(s, out, 0, 'carot');
  dawn(s, d);
  assert.equal(s.weather, 'frost');
  assert.equal(G.frostHold(s, a), false);
  assert.equal(G.frostHold(s, b), true);
  grow(s, 30 * SEC);
  assert.ok(a.crop.progress > 0);
  assert.equal(b.crop.progress, 0);
});

test('bão: không đổ gì trong nhà kính; quạ không vào ô trong nhà kính, ô ngoài thì có', () => {
  const s = farm(), out = fields(s)[0], gh = addField(s);
  assert.ok(build(s, gh).ok);
  const d = dayWith('storm', 2, x => !G.glassBreakOn(SEED, x, gh.id));   // ngày bão không vỡ kính khối này
  for (let k = 0; k < 9; k++) sow(s, gh, k, 'cai', 1);   // cả 9 ô trong nhà kính chín
  dawn(s, d);
  assert.equal(s.weather, 'storm');
  assert.equal(gh.up.glass.broken, false);
  for (const i of gh.plots) assert.ok(s.plots[i].crop && !s.plots[i].crop.dead, `ô ${i}`);
  // không có ô chín nào ngoài nhà kính: quạ không tới dù trúng mọi xác suất
  assert.equal(crowRun(s, 30, () => { for (const p of s.plots) if (p.crop) p.crop.progress = 1; }).size, 0);
  for (const i of gh.plots) assert.ok(s.plots[i].crop, `quạ ăn mất ô ${i}`);
  // có một ô chín ngoài nhà kính: quạ tới đúng ô đó
  sow(s, out, 0, 'cai', 1);
  assert.deepEqual([...crowRun(s, 10)], [out.plots[0]]);
});

test('bão có tỉ lệ thấp làm vỡ kính: vỡ thì mất tác dụng tới khi sửa, sửa tốn xu', () => {
  const s0 = farm({ lv: 20 }), gh = addField(s0);
  // tỉ lệ vỡ mỗi ngày bão xấp xỉ GLASS.breakChance (hàm thuần theo hạt giống, ngày, khối)
  let storms = 0, broke = 0;
  for (let d = 2; d < 40000; d++) if (G.weatherOn(SEED, d) === 'storm') { storms++; if (G.glassBreakOn(SEED, d, gh.id)) broke++; }
  assert.ok(Math.abs(broke / storms - GLASS.breakChance) < 0.03, `${broke}/${storms}`);
  for (let d = 2; d < 400; d++) if (G.weatherOn(SEED, d) !== 'storm') assert.equal(G.glassBreakOn(SEED, d, gh.id), false);
  const d = dayWith('storm', 2, x => G.glassBreakOn(SEED, x, gh.id));
  const s = s0, out = fields(s)[0], g = gh;
  assert.ok(build(s, g).ok);
  const a = sow(s, g, 0, 'cai', 1), b = sow(s, out, 0, 'cai', 0.2);
  void b;
  const ev = dawn(s, d);
  assert.equal(s.weather, 'storm');
  assert.equal(g.up.glass.broken, true);
  assert.ok(ev.some(e => e.type === 'glassBroken'));
  assert.ok(s.log.some(l => /vỡ kính/.test(l.text)));
  assert.equal(G.glassOn(s, a), false);
  // kính vỡ: quạ vào được
  assert.ok(crowRun(s, 10).has(g.plots[0]));
  // sửa kính bằng xu
  const t = { kind: 'glass', id: g.id };
  const act = G.actionsFor(s, t).find(x => x.id === 'fixglass');
  assert.ok(act && !act.disabled);
  s.coins = GLASS.fix - 1;
  assert.ok(G.actionsFor(s, t).find(x => x.id === 'fixglass').disabled);
  assert.equal(G.perform(s, t, 'fixglass').ok, false);
  assert.equal(g.up.glass.broken, true);
  s.coins = GLASS.fix + 5;
  assert.ok(G.perform(s, t, 'fixglass').ok);
  assert.equal(g.up.glass.broken, false);
  assert.equal(s.coins, 5);
  assert.equal(G.glassOn(s, a), true);
  assert.deepEqual(G.actionsFor(s, t), []);   // kính lành: không có việc gì ở đây
});

test('sưởi mùa Đông: mỗi sáng 6h trừ tiền điện cho mỗi nhà kính và ghi nhật ký; mùa khác không tốn', () => {
  const s = farm({ lv: 20, day: DONG - 2 }), a = fields(s)[0], b = addField(s);
  assert.ok(build(s, a).ok); assert.ok(build(s, b).ok);
  const c0 = s.coins;
  dawn(s, DONG - 1);   // Thu: không sưởi
  assert.equal(s.coins, c0);
  dawn(s, DONG);
  assert.equal(G.seasonOf(s).key, 'dong');
  assert.equal(s.coins, c0 - 2 * GLASS.heat);
  assert.ok(s.log.some(l => /sưởi nhà kính/.test(l.text) && l.text.includes(String(2 * GLASS.heat))));
  dawn(s, DONG + 1);
  assert.equal(s.coins, c0 - 4 * GLASS.heat);
});

test('không đủ xu trả tiền sưởi thì nhà kính ngừng sưởi (không nợ), mất tác dụng tới khi đủ xu', () => {
  const s = farm({ day: DONG - 1 }), g = fields(s)[0];
  assert.ok(build(s, g).ok);
  const a = sow(s, g, 0, 'cai');
  s.coins = GLASS.heat - 1;
  dawn(s, DONG);
  assert.equal(s.coins, GLASS.heat - 1, 'không trừ âm, không nợ');
  assert.equal(g.up.glass.unpaid, true);
  assert.equal(G.glassOn(s, a), false);
  grow(s, 10 * SEC);
  assert.equal(a.crop.offSeason, true, 'ngừng sưởi: cây lớn chậm như trái mùa');
  s.coins = GLASS.heat + 10;
  grow(s, 2 * SEC);
  assert.equal(s.coins, 10);
  assert.equal(g.up.glass.unpaid, false);
  assert.equal(G.glassOn(s, a), true);
});

test('trộm vẫn vào được nhà kính qua cửa', () => {
  const s = farm({ lv: 20 }), g = fields(s)[0];
  assert.ok(build(s, g).ok);
  s.animals = []; s.eggs = []; s.dog.nextPoop = 1e15;
  for (let k = 0; k < 4; k++) sow(s, g, k, 'cai', 1);   // chỉ có ô chín trong nhà kính
  assert.ok(G.raidPool(s).includes('thief'));
  s.time = (s.day - 1) * DAY_MS + DAY_MS * NIGHT_FROM - 500;
  const before = g.plots.filter(i => s.plots[i].crop).length;
  withRandom(LUCKY, () => { for (let i = 0; i < 200 && !s.threats.some(t => t.kind === 'thief' && t.loot); i++) { for (const i of g.plots) if (s.plots[i].crop) s.plots[i].crop.progress = 1; G.tick(s, 5 * SEC); } });
  const th = s.threats.find(t => t.kind === 'thief');
  assert.ok(th, 'thằng Tèo tới');
  assert.ok(g.plots.includes(th.plot));
  assert.ok(th.loot, 'hái được');
  assert.equal(g.plots.filter(i => s.plots[i].crop).length, before - 1);
});

test('bảng trạng thái: đếm đúng số ô khô, sâu, chín, héo bên trong; có sâu là việc gấp', () => {
  const s = farm(), g = fields(s)[0];
  assert.ok(build(s, g).ok);
  assert.deepEqual(G.glassStatus(s, g.id), { dry: 0, bugs: 0, ripe: 0, rotten: 0, urgent: false });
  sow(s, g, 0, 'cai', 0.3).water = 0;                              // khô
  sow(s, g, 1, 'cai', 0.4).water = 0;                              // khô
  Object.assign(sow(s, g, 2, 'cai', 0.5).crop, { bugs: true });    // sâu
  Object.assign(sow(s, g, 3, 'cai', 0.5).crop, { sick: true });    // bệnh vì sâu: vẫn tính 🐛
  sow(s, g, 4, 'cai', 1);                                          // chín
  sow(s, g, 5, 'cai', 1.2);                                        // chín
  sow(s, g, 6, 'cai', 1).water = 0;                                // chín (đất khô không tính khô)
  Object.assign(sow(s, g, 7, 'cai', 1.5).crop, { rotten: true });  // héo
  Object.assign(sow(s, g, 8, 'cai', 0.2).crop, { dead: true });    // chết: tính héo
  assert.deepEqual(G.glassStatus(s, g.id), { dry: 2, bugs: 2, ripe: 3, rotten: 2, urgent: true });
  for (const i of g.plots) { const c = s.plots[i].crop; c.bugs = false; c.sick = false; }
  assert.equal(G.glassStatus(s, g.id).urgent, false);
  assert.equal(G.glassStatus(s, fields(s)[0].id + 999), null);
});

// ---- Seam 3: server chạy bù vườn có nhà kính qua ngày bão vỡ kính và mấy ngày Đông: cùng kết quả như trình duyệt ----
test('server chạy bù vườn có nhà kính: kính vỡ, tiền sưởi, cây bên trong giống hệt trình duyệt chạy bù', async t => {
  const id = 1e6;
  let d = 30; while (!(G.weatherOn(VILLAGE_SEED, d) === 'storm' && G.glassBreakOn(VILLAGE_SEED, d, id))) d++;
  let w = Math.ceil(d / 28) * 28 - 6; while (w < d) w += 28;   // ngày Đông đầu tiên sau ngày bão
  const T = VILLAGE_EPOCH + (w - 1) * DAY_MS + 30 * SEC;
  setClock(() => T);
  t.after(() => setClock());
  const rnd = Math.random; Math.random = () => 0.99; t.after(() => { Math.random = rnd; });
  const srv = await bootServer(); t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const reg = async name => { const invite = (await srv.admin('invite')).out; return cookieOf(await srv.json('/api/register', { name, pin: '123456', invite })); };
  const post = (path, body, c) => srv.json(path, body, { method: 'POST', headers: { 'content-type': 'application/json', cookie: `nt_session=${c}` } });
  const owner = await reg('Kính'), s = G.createGame({ name: 'Kính' });
  s.mode = 'online'; s.account = 'Kính'; s.tutorial = 99; s.exp = expFor(20); s.orders = []; s.nextOrderAt = 1e12; s.coins = 50_000;
  const g = fields(s)[0];
  g.id = id;
  g.up.glass = { broken: false, unpaid: false };
  s.savedAt = T - ((w - d + 1) * DAY_MS + 5 * MIN);
  s.wday = d - 1; s.weather = 'cloud';
  sow(s, g, 0, 'cai', 0.05);
  const browser = G.loadGame(structuredClone(s));
  const { play } = (await post('/api/play', {}, owner)).body;
  assert.equal((await post('/api/farm', { play, save: s }, owner)).status, 200);
  const f = (await srv.json('/api/visit?name=' + encodeURIComponent('Kính'), undefined, { headers: { cookie: `nt_session=${await reg('Khách')}` } })).body.farm;
  const bg = browser.farm.ents.find(e => e.id === id), fg = f.farm.ents.find(e => e.id === id);
  assert.equal(bg.up.glass.broken, true, 'bão vỡ kính trong lúc vắng');
  assert.deepEqual(fg.up.glass, bg.up.glass);
  assert.equal(f.coins, browser.coins);
  assert.equal(f.plots[g.plots[0]].crop.progress, browser.plots[g.plots[0]].crop.progress);
});
