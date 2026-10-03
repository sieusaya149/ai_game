// Seam 1: 16 loại cây trong bảng số liệu và hạt cây mới mở theo cấp người chơi (issue 50).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { CROPS, CROP_GROUPS, ITEMS, levelInfo, DAY_MS } from '../public/data.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const MIN = 60_000;
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };
const NEW = ['hanhla', 'dauphong', 'raumuong', 'dualeo', 'khoailang', 'ot', 'suhao', 'bapcai'];
// Bảng chốt cân bằng thời gian thật (03/10): id → [cấp mở khóa, phút lớn], theo ba nhịp chơi
const PLAN = {
  raumuong: [3, 2], cai: [1, 3], hanhla: [2, 5], dualeo: [5, 10],                  // đang chơi (≤ 10 phút)
  suhao: [4, 15], carot: [1, 20], bap: [4, 30], cachua: [3, 45], duahau: [10, 60],  // quay lại (15–60 phút)
  ot: [7, 90], dauphong: [9, 120], khoailang: [6, 180], bapcai: [12, 240], bingo: [8, 300], dau: [6, 360], lua: [8, 480],   // gieo rồi đi (1,5–8 giờ)
};
// cho cây lớn tới lúc chín (trời mưa luôn giữ đất ẩm: cây dài ngày lớn qua nhiều ngày game, trời đổi mỗi 20 phút)
const growUp = (s, id) => quiet(() => { for (let t = 0; t < 3 * CROPS[id].grow && s.plots[0].crop.progress < 1; t += MIN) { s.weather = 'rain'; G.tick(s, MIN); } });
const SEASON = {
  xuan: ['cai', 'hanhla', 'dau', 'dauphong'],
  ha: ['raumuong', 'dualeo', 'bap', 'duahau'],
  thu: ['lua', 'khoailang', 'bingo', 'ot'],
  dong: ['carot', 'cachua', 'suhao', 'bapcai'],
};
// exp tối thiểu để ở đúng cấp lv
const expFor = lv => { let e = 0; while (levelInfo(e).level < lv) e += levelInfo(e).need - levelInfo(e).cur; return e; };
// vườn đang giữa buổi sáng (chợ mở), đủ xu
const shopper = lv => { const s = G.createGame({ name: 'Mua' }); s.tutorial = 99; s.coins = 1e5; s.exp = expFor(lv); return s; };

test('bảng cây: đúng 16 cây, thời gian lớn theo ba nhịp chơi đã chốt, cấp mở khóa giữ nguyên (trừ lúa), 8 cây mới đủ tên', () => {
  assert.deepEqual(Object.keys(CROPS).sort(), Object.keys(PLAN).sort());
  for (const [id, [lv, min]] of Object.entries(PLAN)) assert.deepEqual([CROPS[id].lv, CROPS[id].grow], [lv, min * MIN], id);
  const names = { hanhla: 'Hành lá', dauphong: 'Đậu phộng', raumuong: 'Rau muống', dualeo: 'Dưa leo', khoailang: 'Khoai lang', ot: 'Ớt', suhao: 'Su hào', bapcai: 'Bắp cải' };
  for (const id of NEW) assert.equal(CROPS[id].name, names[id]);
});

test('mỗi mùa đúng 4 cây hợp mùa', () => {
  for (const [season, ids] of Object.entries(SEASON)) {
    assert.deepEqual(Object.keys(CROPS).filter(id => CROPS[id].season === season).sort(), [...ids].sort(), season);
  }
});

test('mọi cây có nhóm thời gian khớp thời gian lớn, cấp mở khóa, giá hạt, giá bán', () => {
  const fits = { short: g => g <= 10 * MIN, mid: g => g >= 15 * MIN && g <= 60 * MIN, long: g => g >= 90 * MIN };
  assert.deepEqual(Object.keys(CROP_GROUPS).sort(), Object.keys(fits).sort());
  for (const [id, c] of Object.entries(CROPS)) {
    assert.ok(c.group in CROP_GROUPS, `${id} có nhóm`);
    assert.ok(fits[c.group](c.grow), `${id}: ${c.grow / MIN} phút thuộc nhóm ${c.group}`);
    assert.ok(Number.isInteger(c.lv) && c.lv >= 1, `${id} có cấp mở khóa`);
    for (const k of ['seed', 'price', 'yield', 'exp']) assert.ok(c[k] > 0, `${id}.${k}`);
    assert.ok(c.yield * c.price > c.seed, `${id}: trồng có lời`);
    // hạt giống bán ở chợ theo đúng cấp và giá
    assert.deepEqual([ITEMS[`seed_${id}`].price, ITEMS[`seed_${id}`].lv, ITEMS[`seed_${id}`].crop], [c.seed, c.lv, id]);
  }
  // cây mới mở dần: không cây mới nào có ngay từ đầu
  for (const id of NEW) assert.ok(CROPS[id].lv >= 2, id);
});

test('hạt cây mới chỉ mua được khi đủ cấp người chơi; chưa đủ cấp thì bị từ chối', () => {
  for (const id of NEW) {
    const lv = CROPS[id].lv, low = shopper(lv - 1), ok = shopper(lv);
    const r = G.buy(low, `seed_${id}`, 1);
    assert.equal(r.ok, false, id);
    assert.match(r.msg, new RegExp(`Cần cấp ${lv}`));
    assert.equal(low.inv[`seed_${id}`], undefined);
    const coins = ok.coins;
    assert.equal(G.buy(ok, `seed_${id}`, 2).ok, true, id);
    assert.equal(ok.inv[`seed_${id}`], 2);
    assert.equal(ok.coins, coins - 2 * CROPS[id].seed);
  }
});

test('cây mới trồng, lớn, thu hoạch và bán như cây cũ', () => {
  for (const id of NEW) {
    const s = shopper(CROPS[id].lv), at = { kind: 'plot', idx: 0 };
    G.buy(s, `seed_${id}`, 1);
    assert.equal(G.selectSeed(s, id), true);
    s.day = 1 + 7 * ['xuan', 'ha', 'thu', 'dong'].indexOf(CROPS[id].season); s.time = (s.day - 1) * DAY_MS;   // đúng mùa của cây (trái mùa thì lớn chậm, issue 54)
    quiet(() => { G.perform(s, at, 'till'); G.perform(s, at, 'plant'); });
    assert.equal(s.plots[0].crop.id, id);
    growUp(s, id);
    assert.ok(s.plots[0].crop.progress >= 1, `${id} chín`);
    assert.equal(s.plots[0].crop.rotten, false, `${id} chưa héo`);
    const r = quiet(() => G.perform(s, at, 'harvest'));
    assert.equal(r.ok, true, r.msg);
    assert.equal(G.haveItem(s, id), CROPS[id].yield);
    s.time = 0;   // sáng: chợ mở
    assert.equal(G.sell(s, id, 'all').coins, CROPS[id].yield * CROPS[id].price);
  }
});
