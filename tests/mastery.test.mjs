// Seam 1: cấp thành thạo 3 cấp mỗi loại cây (issue 51, Phase 3).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { CROPS, MASTERY, EVENT_LEVEL } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const MIN = 60_000, at = { kind: 'plot', idx: 0 };
const withRand = (v, fn) => { const r = Math.random; Math.random = typeof v === 'function' ? v : () => v; try { return fn(); } finally { Math.random = r; } };
const quiet = fn => withRand(0.99, fn);
const farm = () => { const s = G.createGame({ name: 'Hùng' }); s.tutorial = 99; s.orders = []; s.nextOrderAt = 1e12; s.basket = {}; s.inv = {}; s.exp = 20000; return s; };
// trồng rồi thu hoạch một vụ (cây chín ngay), trả kết quả thu hoạch
function harvest(s, id, rand = 0.99) {
  s.basket = {}; s.inv[`seed_${id}`] = 1; s.stamina = 100;
  G.selectSeed(s, id);
  return withRand(rand, () => {
    G.perform(s, at, 'till'); G.perform(s, at, 'plant');
    s.plots[0].crop.progress = 1; s.plots[0].crop.ripeAt = s.time;
    const r = G.perform(s, at, 'harvest');
    assert.equal(r.ok, true, r.msg);
    return r;
  });
}
const got = (s, id) => (s.basket[id] || 0) + (s.inv[id] || 0);

test('mới chơi: mọi cây ở cấp 1, 0 lần', () => {
  const s = farm();
  for (const id of Object.keys(CROPS)) assert.deepEqual(G.masteryOf(s, id), { lv: 1, n: 0, next: MASTERY.thresholds[CROPS[id].group][0] });
});

for (const [group, id] of [['short', 'cai'], ['mid', 'cachua'], ['long', 'dau']]) {
  test(`nhóm ${group} (${id}): lên cấp 2 và 3 đúng ngưỡng, không sớm hơn một lần; thưởng sản lượng +1, +2`, () => {
    const [t2, t3] = MASTERY.thresholds[group], base = CROPS[id].yield;
    assert.deepEqual([t2, t3], { short: [20, 60], mid: [12, 35], long: [8, 25] }[group]);
    const s = farm();
    for (let i = 1; i < t2; i++) harvest(s, id);
    assert.equal(G.masteryOf(s, id).lv, 1, 'chưa đủ ngưỡng 2');
    assert.equal(G.masteryOf(s, id).n, t2 - 1);
    harvest(s, id);   // lần thứ t2: thưởng vẫn theo cấp 1, xong mới lên cấp 2
    assert.equal(got(s, id), base);
    assert.equal(G.masteryOf(s, id).lv, 2);
    harvest(s, id);
    assert.equal(got(s, id), base + 1, 'cấp 2: +1');
    for (let i = t2 + 2; i < t3; i++) harvest(s, id);
    assert.equal(G.masteryOf(s, id).lv, 2, 'chưa đủ ngưỡng 3');
    harvest(s, id);
    assert.equal(G.masteryOf(s, id).lv, 3);
    assert.equal(G.masteryOf(s, id).next, null);
    harvest(s, id);
    assert.equal(got(s, id), base + 2, 'cấp 3: +2');
    assert.equal(G.masteryOf(s, id).n, t3 + 1);
  });
}

test('thành thạo là riêng từng loại cây và giữ qua lưu rồi nạp', () => {
  const s = farm();
  for (let i = 0; i < 20; i++) harvest(s, 'cai');
  harvest(s, 'carot');
  assert.equal(G.masteryOf(s, 'cai').lv, 2);
  assert.deepEqual([G.masteryOf(s, 'carot').lv, G.masteryOf(s, 'carot').n], [1, 1]);
  G.saveGame(s);
  const back = quiet(() => G.loadGame());
  assert.deepEqual([G.masteryOf(back, 'cai').lv, G.masteryOf(back, 'cai').n], [2, 20]);
  assert.deepEqual([G.masteryOf(back, 'carot').lv, G.masteryOf(back, 'carot').n], [1, 1]);
  assert.equal(G.masteryOf(back, 'lua').lv, 1);
});

test('cấp 3 kháng sâu: cùng số ngẫu nhiên cố định, cấp 1 dính sâu còn cấp 3 thì không', () => {
  const bugsAfter = lv => {
    const s = farm(); s.mastery.lua.lv = lv;
    s.inv.seed_lua = 1; G.selectSeed(s, 'lua');
    quiet(() => { G.perform(s, at, 'till'); G.perform(s, at, 'plant'); });
    s.plots[0].water = 100; s.weather = 'rain';
    // pMin = 0.005 → xác suất mỗi giây ≈ 8,3e-5; số ngẫu nhiên 6e-5 nằm giữa mức đầy đủ và mức giảm một nửa (4,2e-5)
    withRand(6e-5, () => G.tick(s, 1000));
    return !!s.plots[0].crop.bugs;
  };
  assert.equal(bugsAfter(1), true);
  assert.equal(bugsAfter(2), true);
  assert.equal(bugsAfter(3), false);
});

test('cấp 3: khoảng 30% lần thu hoạch được lại 1 hạt; cấp 1, 2 thì không', () => {
  const runs = (lv, n) => {
    const s = farm(); s.mastery.cai.lv = lv; let seeds = 0;
    for (let i = 0; i < n; i++) { s.inv.seed_cai = 0; harvest(s, 'cai', Math.random()); seeds += s.inv.seed_cai || 0; s.mastery.cai.lv = lv; }
    return seeds;
  };
  assert.equal(runs(1, 100), 0);
  assert.equal(runs(2, 100), 0);
  const k = runs(3, 600);   // cây cái đã cao, mỗi vụ 0..1 hạt
  assert.ok(k > 600 * 0.2 && k < 600 * 0.4, `được lại ${k}/600 hạt`);
});

test('lên cấp thành thạo: phát sự kiện 🟡 có khóa gộp, cộng EXP, nhật ký', () => {
  const s = farm();
  for (let i = 0; i < 19; i++) harvest(s, 'cai');
  G.tick(s, 0);
  const exp = s.exp;
  harvest(s, 'cai');
  const ev = G.tick(s, 0).filter(e => e.type === 'mastery');
  assert.equal(ev.length, 1);
  assert.deepEqual([ev[0].crop, ev[0].lv], ['cai', 2]);
  assert.equal(EVENT_LEVEL.mastery.level, 'important');
  assert.notEqual(EVENT_LEVEL.mastery.group(ev[0]), EVENT_LEVEL.mastery.group({ type: 'mastery', crop: 'lua', lv: 2 }));
  assert.ok(s.exp - exp >= CROPS.cai.exp + MASTERY.exp[1], 'EXP gồm thưởng lên cấp');
  assert.ok(s.log.some(l => /thành thạo/i.test(l.text ?? l)), 'có dòng nhật ký');
});
