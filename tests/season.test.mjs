// Seam 1 (+ chạy bù online, + seam 3 ở cuối): mùa có tác dụng lên cây (issue 54). Trái mùa lớn ×0.6, không ★3; đúng mùa 10% thêm sản lượng;
// đổi mùa giữa vụ không chết; dưới cấp 5 chưa ảnh hưởng; mùa đọc từ lịch game (làng khi online, kể cả chạy bù).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { setClock, VILLAGE_EPOCH } from '../public/clock.js';
import { CROPS, DAY_MS, SEASON, levelInfo } from '../public/data.js';
import { bootServer } from './helpers/server.mjs';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const SEC = 1000, MIN = 60_000;
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };   // không sâu, không cỏ
const expFor = lv => { let e = 0; while (levelInfo(e).level < lv) e += levelInfo(e).need - levelInfo(e).cur; return e; };
const plot = i => ({ kind: 'plot', idx: i });
// vườn chơi đơn đứng ở đầu ngày thứ `day` (mùa theo lịch s.day), cấp `lv`, ô 0 đã cuốc có `crop`
function farm(day, lv, crop = 'cai') {
  const s = G.createGame({ name: 'Mùa' }); s.tutorial = 99; s.orders = []; s.nextOrderAt = 1e12;
  s.exp = expFor(lv); s.time = (day - 1) * DAY_MS; s.day = day;
  const p = s.plots[0]; p.soil = 'tilled'; p.water = 100;
  p.crop = { id: crop, progress: 0, planted: s.time, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
  return s;
}
// chạy `ms` mà ô 0 luôn đủ nước (tách để nước không ảnh hưởng tốc độ)
const grow = (s, ms) => quiet(() => { for (let t = 0; t < ms; t += 5 * SEC) { s.plots[0].water = 100; G.tick(s, Math.min(5 * SEC, ms - t)); } });
const XUAN = 1, HA = 8, THU = 15, DONG = 22;
// mỗi bước mô phỏng 1 giây tính theo mùa của lúc kết thúc bước: lệch tối đa một bước ở ranh giới
const near = (a, b, grow) => Math.abs(a - b) <= SEC * (1 - SEASON.slow) / grow + 1e-9;

test('seasonFit: cây hợp mùa theo bảng, đổi theo mùa của lịch game', () => {
  assert.equal(G.seasonFit(farm(XUAN, 5), 'cai'), 'in');
  assert.equal(G.seasonFit(farm(HA, 5), 'cai'), 'off');
  assert.equal(G.seasonFit(farm(HA, 5), 'duahau'), 'in');
  assert.equal(G.seasonFit(farm(THU, 5), 'lua'), 'in');
  assert.equal(G.seasonFit(farm(DONG, 5), 'carot'), 'in');
  assert.equal(G.seasonFit(farm(DONG + 7, 5), 'cai'), 'in');   // sang năm mới lại Xuân
});

test('trái mùa chín chậm đúng 1/0.6; đúng mùa không chậm', () => {
  const grow1 = (day, ms) => { const s = farm(day, 5); grow(s, ms); return s.plots[0].crop.progress; };
  const want = 30 * SEC / CROPS.cai.grow;
  assert.ok(Math.abs(grow1(XUAN, 30 * SEC) - want) < 1e-9);
  assert.ok(Math.abs(grow1(HA, 30 * SEC) - want * SEASON.slow) < 1e-9);
  // đủ thời gian: trái mùa chín sau grow / 0.6, chưa chín trước đó
  const s = farm(HA, 5), t = CROPS.cai.grow / SEASON.slow;
  grow(s, t - 5 * SEC); assert.ok(s.plots[0].crop.progress < 1);
  grow(s, 6 * SEC); assert.ok(s.plots[0].crop.progress >= 1);
});

test('dưới cấp 5 mùa chưa ảnh hưởng; từ cấp 5 thì có', () => {
  const at = lv => { const s = farm(HA, lv); grow(s, 30 * SEC); return s.plots[0].crop; };
  const want = 30 * SEC / CROPS.cai.grow;
  assert.ok(Math.abs(at(4).progress - want) < 1e-9);
  assert.equal(at(4).offSeason, undefined);
  assert.ok(Math.abs(at(5).progress - want * SEASON.slow) < 1e-9);
  assert.equal(G.cropOffSeason(at(5)), true);
});

test('cây trái mùa không bao giờ ra ★3: cờ offSeason bật khi lớn trái mùa, cây đúng mùa không có', () => {
  const s = farm(HA, 5); grow(s, 2 * MIN);
  assert.equal(G.cropOffSeason(s.plots[0].crop), true);
  const t = farm(XUAN, 5); grow(t, 60 * SEC);
  assert.equal(G.cropOffSeason(t.plots[0].crop), false);
});

test('qua ranh giới mùa giữa vụ: cây sống, tiến độ không lùi, tốc độ đổi đúng từ ranh giới, kể cả một lượt chạy dài', () => {
  // Xuân → Hạ: cải đang đúng mùa, qua ngày 8 thì chậm lại
  const s = farm(7, 5); s.time = 7 * DAY_MS - 30 * SEC;   // còn 30 giây tới hết Xuân
  let last = 0;
  quiet(() => { for (let i = 0; i < 12; i++) { s.plots[0].water = 100; G.tick(s, 5 * SEC); const c = s.plots[0].crop; assert.ok(c.progress >= last); assert.equal(c.dead, false); last = c.progress; } });
  assert.ok(near(s.plots[0].crop.progress, (30 + 30 * SEASON.slow) * SEC / CROPS.cai.grow, CROPS.cai.grow));
  // một lượt chạy bù 60 giây qua ranh giới cho đúng kết quả như từng nhịp nhỏ
  const b = farm(7, 5); b.time = 7 * DAY_MS - 30 * SEC;
  quiet(() => { b.plots[0].water = 100; G.tick(b, 60 * SEC); });
  assert.ok(Math.abs(b.plots[0].crop.progress - s.plots[0].crop.progress) < 1e-9);
  // trái mùa → đúng mùa: Hạ → Thu, cải (Xuân) vẫn chậm; lúa (Thu) nhanh lại từ ranh giới
  const l = farm(14, 5, 'lua'); l.time = 14 * DAY_MS - 30 * SEC;
  grow(l, 60 * SEC);
  assert.ok(near(l.plots[0].crop.progress, (30 * SEASON.slow + 30) * SEC / CROPS.lua.grow, CROPS.lua.grow));
  assert.equal(l.plots[0].crop.dead, false);
});

// Gieo bằng hành động thật (cây có c.season chốt lúc gieo); `before` = còn bao lâu tới hết mùa
const sow = (day, before, id = 'cai', lv = 5) => {
  const s = farm(day, lv, id); s.plots[0].crop = null; s.time = day * DAY_MS - before;
  s.inv[`seed_${id}`] = 1; s.selectedSeed = id;
  assert.equal(quiet(() => G.perform(s, plot(0), 'plant')).ok, true);
  return s;
};
test('mùa chốt lúc gieo: cây gieo đúng mùa không chậm đi khi qua ranh giới mùa; gieo trái mùa thì chậm cả vụ dù sang mùa hợp', () => {
  // cải (Xuân) gieo 30 giây trước hết Xuân, chạy 60 giây qua sang Hạ: vẫn tốc độ đầy đủ
  const a = sow(7, 30 * SEC);
  assert.equal(a.plots[0].crop.season, 'in');
  grow(a, 60 * SEC);
  assert.ok(Math.abs(a.plots[0].crop.progress - 60 * SEC / CROPS.cai.grow) < 1e-9);
  assert.equal(G.cropOffSeason(a.plots[0].crop), false);
  assert.equal(G.plotSeasonMul(a, a.plots[0]), 1);
  // lúa (Thu) gieo 30 giây trước hết Hạ (trái mùa), sang Thu (đúng mùa của lúa): vẫn chậm cả vụ
  const l = sow(14, 30 * SEC, 'lua', 8);
  assert.equal(l.plots[0].crop.season, 'off');
  grow(l, 60 * SEC);
  assert.ok(Math.abs(l.plots[0].crop.progress - 60 * SEC * SEASON.slow / CROPS.lua.grow) < 1e-9);
  assert.equal(G.cropOffSeason(l.plots[0].crop), true);
  assert.equal(G.plotSeasonMul(l, l.plots[0]), SEASON.slow);
  // người mới (dưới cấp 5): không chốt mùa nào
  assert.equal(sow(7, 30 * SEC, 'cai', 4).plots[0].crop.season, '');
});

test('chín quá thì vẫn héo như cũ, mùa không thêm cái chết nào', () => {
  const s = farm(HA, 5); grow(s, 10 * MIN);   // trái mùa, bỏ đó lâu
  const c = s.plots[0].crop;
  assert.equal(c.dead, false);
});

test('đúng mùa: khoảng 10% lần thu có thêm sản lượng; trái mùa và dưới cấp 5 thì không', () => {
  const harvests = (day, lv, n) => {
    const s = farm(day, lv); let extra = 0;
    for (let i = 0; i < n; i++) {
      s.basket = {}; s.stamina = 100; s.exp = expFor(lv);   // EXP thu hoạch không làm lên cấp giữa chừng
      s.mastery.cai = { lv: 1, n: 0 };     // giữ thành thạo cấp 1: thưởng sản lượng của issue 51 không lẫn vào phần đếm
      Object.assign(s.plots[0], { soil: 'tilled', water: 100, crop: { ...farm(day, lv).plots[0].crop, progress: 1 } });
      const r = G.perform(s, plot(0), 'harvest');
      assert.ok(r.ok);
      extra += s.basket.cai - CROPS.cai.yield;
    }
    return extra;
  };
  const on = harvests(XUAN, 5, 2000);
  assert.ok(on > 120 && on < 280, `đúng mùa thêm ${on}/2000`);   // kỳ vọng 200
  assert.equal(harvests(HA, 5, 300), 0);
  assert.equal(harvests(XUAN, 4, 300), 0);
});

test('giỏ đầy thì không thêm sản lượng quá sức chứa', () => {
  const s = farm(XUAN, 5), r = Math.random; Math.random = () => 0;   // luôn trúng thưởng
  try {
    const cap = G.basketCap(s);
    s.basket = { carot: cap - CROPS.cai.yield };   // vừa đủ chỗ cho sản lượng thường
    s.plots[0].crop.progress = 1;
    assert.ok(G.perform(s, plot(0), 'harvest').ok);
    assert.ok(Object.values(s.basket).reduce((a, n) => a + n, 0) <= cap);
  } finally { Math.random = r; }
});

test('chạy bù online: qua ranh giới mùa làng tính đúng từng đoạn, cây không chết', t => {
  t.after(() => setClock());
  const T = VILLAGE_EPOCH + 7 * DAY_MS + 30 * SEC;   // vừa qua 30 giây khỏi hết Xuân (lịch làng)
  setClock(() => T);
  const s = G.createGame({ name: 'Làng' }); s.mode = 'online'; s.account = 'Làng'; s.tutorial = 99; s.orders = []; s.nextOrderAt = 1e12;
  s.exp = expFor(5);
  Object.assign(s.plots[0], { soil: 'tilled', water: 100, crop: { id: 'cai', progress: 0, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 } });
  s.savedAt = T - 60 * SEC;
  const out = quiet(() => G.loadGame(s));
  const c = out.plots[0].crop;
  assert.equal(c.dead, false);
  assert.ok(near(c.progress, (30 + 30 * SEASON.slow) * SEC / CROPS.cai.grow, CROPS.cai.grow), `progress ${c.progress}`);
});

test('đóng băng không đổi tốc độ: vắng quá 8 giờ thì phần dư không chạy, mùa chỉ tính trong phần chạy bù', t => {
  t.after(() => setClock());
  const T = VILLAGE_EPOCH + 3 * DAY_MS;   // giữa Xuân
  setClock(() => T);
  const s = G.createGame({ name: 'Làng' }); s.mode = 'online'; s.account = 'Làng'; s.tutorial = 99; s.orders = []; s.nextOrderAt = 1e12;
  s.exp = expFor(5);
  Object.assign(s.plots[0], { soil: 'tilled', water: 100, crop: { id: 'dau', progress: 0, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 } });
  s.savedAt = T - 20 * 3600_000;
  const out = quiet(() => G.loadGame(s));
  assert.equal(out.simMs, 8 * 3600_000);
  assert.equal(out.plots[0].crop.dead, false);
});

test('Bà Tư giải thích mùa từ đầu mùa thứ 2: có thưởng một lần, bỏ qua được, chưa đủ cấp 5 thì chưa mở', () => {
  const s = farm(XUAN, 5);
  assert.equal(G.seasonQuestInfo(s), null);   // còn mùa đầu
  const h = farm(HA, 5);
  assert.deepEqual(G.seasonQuestInfo(h), { coins: SEASON.questCoins, exp: SEASON.questExp });
  assert.equal(G.seasonQuestInfo(farm(HA, 4)), null);
  const coins = h.coins, r = G.claimSeasonQuest(h);
  assert.ok(r.ok);
  assert.equal(h.coins, coins + SEASON.questCoins);
  assert.equal(G.seasonQuestInfo(h), null);
  assert.equal(G.claimSeasonQuest(h).ok, false);   // không nhận hai lần
  const k = farm(THU, 5);
  assert.ok(G.skipSeasonQuest(k).ok);
  assert.equal(G.seasonQuestInfo(k), null);
  assert.equal(k.coins, farm(THU, 5).coins);       // bỏ qua thì không thưởng
});

test('bản lưu qua lưu/nạp giữ trạng thái nhiệm vụ mùa', () => {
  const s = farm(HA, 5); G.skipSeasonQuest(s);
  const back = G.loadGame(structuredClone(s));
  assert.equal(back.seasonQuest, 'skipped');
  assert.equal(G.seasonQuestInfo(back), null);
});

// ---- Seam 3: server chạy bù vườn chủ offline qua ranh giới mùa của lịch làng ----
test('server chạy bù: qua ranh giới mùa làng tính tốc độ từng đoạn, cây không chết', async t => {
  const T = VILLAGE_EPOCH + 14 * DAY_MS + 30 * SEC;   // vừa qua 30 giây khỏi hết Hạ
  setClock(() => T);
  t.after(() => setClock());
  const rnd = Math.random; Math.random = () => 0.99; t.after(() => { Math.random = rnd; });
  const srv = await bootServer(); t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const reg = async name => { const invite = (await srv.admin('invite')).out; return cookieOf(await srv.json('/api/register', { name, pin: '123456', invite })); };
  const post = (path, body, c) => srv.json(path, body, { method: 'POST', headers: { 'content-type': 'application/json', cookie: `nt_session=${c}` } });
  const owner = await reg('Lan'), s = G.createGame({ name: 'Lan' });
  s.mode = 'online'; s.account = 'Lan'; s.tutorial = 99; s.exp = expFor(5); s.savedAt = T - 60 * SEC;
  Object.assign(s.plots[0], { soil: 'tilled', water: 100, crop: { id: 'lua', progress: 0, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 } });
  const { play } = (await post('/api/play', {}, owner)).body;
  assert.equal((await post('/api/farm', { play, save: s }, owner)).status, 200);
  const f = (await srv.json('/api/visit?name=Lan', undefined, { headers: { cookie: `nt_session=${await reg('Bình')}` } })).body.farm;
  const c = f.plots[0].crop;
  assert.equal(c.dead, false);
  assert.ok(near(c.progress, (30 * SEASON.slow + 30) * SEC / CROPS.lua.grow, CROPS.lua.grow), `progress ${c.progress}`);
});