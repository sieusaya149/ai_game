// Seam 1: 16 loại cây trong bảng số liệu và hạt cây mới mở theo cấp người chơi (issue 50).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { CROPS, CROP_GROUPS, ITEMS, levelInfo } from '../public/data.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const MIN = 60_000;
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };
const NEW = ['hanhla', 'dauphong', 'raumuong', 'dualeo', 'khoailang', 'ot', 'suhao', 'bapcai'];
// số liệu 8 cây cũ trước Phase 3: không được đổi
const OLD = {
  cai:    { name: 'Cải xanh', lv: 1,  seed: 8,   grow: 1.5 * MIN, yield: 4, price: 5,  exp: 2 },
  carot:  { name: 'Cà rốt',   lv: 1,  seed: 15,  grow: 3 * MIN,   yield: 4, price: 9,  exp: 4 },
  lua:    { name: 'Lúa',      lv: 2,  seed: 20,  grow: 5 * MIN,   yield: 5, price: 10, exp: 6 },
  cachua: { name: 'Cà chua',  lv: 3,  seed: 35,  grow: 8 * MIN,   yield: 5, price: 18, exp: 10 },
  bap:    { name: 'Bắp',      lv: 4,  seed: 50,  grow: 10 * MIN,  yield: 6, price: 22, exp: 14 },
  dau:    { name: 'Dâu tây',  lv: 6,  seed: 80,  grow: 12 * MIN,  yield: 6, price: 35, exp: 20 },
  bingo:  { name: 'Bí ngô',   lv: 8,  seed: 120, grow: 15 * MIN,  yield: 5, price: 60, exp: 28 },
  duahau: { name: 'Dưa hấu',  lv: 10, seed: 180, grow: 20 * MIN,  yield: 6, price: 80, exp: 40 },
};
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

test('bảng cây: đúng 16 cây, 8 cây cũ giữ id và số liệu, 8 cây mới đủ tên', () => {
  assert.deepEqual(Object.keys(CROPS).sort(), [...Object.keys(OLD), ...NEW].sort());
  for (const [id, o] of Object.entries(OLD)) for (const [k, v] of Object.entries(o)) assert.equal(CROPS[id][k], v, `${id}.${k}`);
  const names = { hanhla: 'Hành lá', dauphong: 'Đậu phộng', raumuong: 'Rau muống', dualeo: 'Dưa leo', khoailang: 'Khoai lang', ot: 'Ớt', suhao: 'Su hào', bapcai: 'Bắp cải' };
  for (const id of NEW) assert.equal(CROPS[id].name, names[id]);
});

test('mỗi mùa đúng 4 cây hợp mùa', () => {
  for (const [season, ids] of Object.entries(SEASON)) {
    assert.deepEqual(Object.keys(CROPS).filter(id => CROPS[id].season === season).sort(), [...ids].sort(), season);
  }
});

test('mọi cây có nhóm thời gian khớp thời gian lớn, cấp mở khóa, giá hạt, giá bán', () => {
  const fits = { short: g => g <= 3 * MIN, mid: g => g >= 5 * MIN && g <= 10 * MIN, long: g => g >= 12 * MIN };
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
    quiet(() => { G.perform(s, at, 'till'); G.perform(s, at, 'plant'); });
    assert.equal(s.plots[0].crop.id, id);
    s.weather = 'rain';
    quiet(() => G.tick(s, CROPS[id].grow + 2000));
    assert.ok(s.plots[0].crop.progress >= 1, `${id} chín`);
    const r = quiet(() => G.perform(s, at, 'harvest'));
    assert.equal(r.ok, true, r.msg);
    assert.equal(G.haveItem(s, id), CROPS[id].yield);
    s.time = 0;   // sáng: chợ mở
    assert.equal(G.sell(s, id, 'all').coins, CROPS[id].yield * CROPS[id].price);
  }
});
