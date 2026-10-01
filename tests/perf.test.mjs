import * as G from '../public/state.js';
import { TS } from '../public/layout.js';
import { CHUNK, chunkGrid, chunksIn, dirtyChunks, aiStep, createFps, particleBudget, shouldSuggestBattery, loadPrefs, savePrefs } from '../public/perf.js';
import assert from 'node:assert/strict';
import test from 'node:test';

const rich = () => { const s = G.createGame({ name: 'T' }); s.coins = 1e9; s.exp = 1e9; return s; };
const chunkOf = (c, r) => Math.floor(r / CHUNK) * chunkGrid(64, 48).cw + Math.floor(c / CHUNK);

test('bản đồ không đổi thì không mảng nào bẩn; chưa có bản trước thì bẩn hết', () => {
  const s = rich(), m = G.mapOf(s);
  assert.equal(dirtyChunks(m, m).size, 0);
  assert.equal(dirtyChunks(null, m).size, 4 * 3);   // 64x48 ô = 4x3 mảng
});

test('dời một công trình chỉ làm bẩn mảng chứa chỗ cũ và chỗ mới', () => {
  const s = rich(), before = G.mapOf(s);
  const shed = s.farm.ents.find(e => e.kind === 'shed');   // 4x3 ô, nằm gọn trong mảng (16..31, 0..15)... xem chỗ cũ
  const from = { c: shed.c, r: shed.r };
  const to = { c: 36, r: 24 };
  const r = G.moveEntity(s, shed.id, to.c, to.r);
  assert.equal(r.ok, true, r.msg);
  const dirty = dirtyChunks(before, G.mapOf(s));
  assert.ok(dirty.has(chunkOf(from.c, from.r)), 'mảng chỗ cũ');
  assert.ok(dirty.has(chunkOf(to.c, to.r)), 'mảng chỗ mới');
  assert.ok(dirty.size <= 4, `chỉ vài mảng bẩn, thực tế ${dirty.size}`);
  assert.ok(dirty.size < 12);
});

test('đặt đồ trang trí và cất nó chỉ bẩn mảng liên quan', () => {
  const s = rich(), m0 = G.mapOf(s);
  s.inv.deco_flower = 1;
  assert.equal(G.placeEntity(s, { kind: 'deco', item: 'deco_flower' }, 30, 22).ok, true);
  const m1 = G.mapOf(s), d = dirtyChunks(m0, m1);
  assert.ok(d.size <= 1, `đồ 1 ô: tối đa 1 mảng, thực tế ${d.size}`);
});

test('mua đất bẩn đúng mảng của dải mới (không bẩn hết)', () => {
  const s = rich(), before = G.mapOf(s);
  assert.equal(G.buyStrip(s, 'E').ok, true);
  const d = dirtyChunks(before, G.mapOf(s));
  assert.ok(d.size > 0 && d.size < 12, `thực tế ${d.size}`);
  const o = s.farm.owned;   // dải mới nằm ở cột o.c+o.w-4 .. o.c+o.w-1
  assert.ok(d.has(chunkOf(o.c + o.w - 1, o.r + 2)));
  assert.ok(!d.has(chunkOf(0, 0)), 'góc xa không bẩn');
});

test('ô sát ranh mảng làm bẩn cả mảng kế bên (nền phụ thuộc ô kế)', () => {
  const s = rich(), m0 = G.mapOf(s);
  s.inv.deco_flower = 1;
  assert.equal(G.placeEntity(s, { kind: 'deco', item: 'deco_flower' }, 31, 22).ok, true);   // cột 31 = cột cuối mảng 1
  // đồ trang trí không đổi nền; chỉ ô chắn thì có, nên không bắt buộc bẩn. Thử dời cây ở sát ranh.
  const tree = s.farm.ents.find(e => e.kind === 'tree');
  const m1 = G.mapOf(s);
  const t = { ...m1, solid: Uint8Array.from(m1.solid) };
  t.solid[22 * 64 + 31] ^= 1;
  const d = dirtyChunks(m1, t);
  assert.ok(d.has(chunkOf(31, 22)) && d.has(chunkOf(32, 22)), 'bẩn cả hai bên ranh');
  void m0; void tree;
});

test('chunksIn: chỉ các mảng trong khung nhìn', () => {
  assert.deepEqual(chunksIn(64, 48, 0, 0, 100, 100), [0]);
  assert.deepEqual(chunksIn(64, 48, 200, 0, 300, 100), [0, 1]);
  assert.equal(chunksIn(64, 48, -500, -500, 9999, 9999).length, 12);
  assert.equal(chunksIn(64, 48, 0, 0, 0 + TS, 0 + TS).length, 1);
});

test('AI ngoài màn hình: 2 lần/giây, tổng thời gian không mất', () => {
  const rt = {}, calls = [];
  for (let i = 0; i < 60; i++) { const d = aiStep(rt, 1 / 60, false); if (d) calls.push(d); }
  assert.ok(calls.length >= 1 && calls.length <= 3, `thực tế ${calls.length}`);
  assert.ok(Math.abs(calls.reduce((a, b) => a + b, 0) + rt.acc - 1) < 1e-9);
  const on = {};
  let n = 0;
  for (let i = 0; i < 60; i++) if (aiStep(on, 1 / 60, true)) n++;
  assert.equal(n, 60, 'trong màn hình chạy mỗi khung');
});

test('AI: vừa vào màn hình thì dồn phần thời gian đã gom', () => {
  const rt = {};
  aiStep(rt, 0.2, false);
  assert.ok(Math.abs(aiStep(rt, 0.016, true) - 0.216) < 1e-9);
});

test('đo FPS bỏ qua khung treo; gợi ý tiết kiệm pin sau 10 giây dưới 40 fps, chỉ một lần', () => {
  const slow = createFps(), prefs = { battery: false, hinted: false };
  for (let i = 0; i < 200; i++) slow.push(50);   // 20 fps, 10 giây
  assert.ok(slow.avg < 21);
  assert.equal(shouldSuggestBattery(slow, prefs), true);
  assert.equal(shouldSuggestBattery(slow, { ...prefs, hinted: true }), false);
  assert.equal(shouldSuggestBattery(slow, { ...prefs, battery: true }), false);
  const early = createFps();
  for (let i = 0; i < 100; i++) early.push(50);   // mới 5 giây
  assert.equal(shouldSuggestBattery(early, prefs), false);
  const fast = createFps();
  for (let i = 0; i < 700; i++) fast.push(16.7);
  fast.push(3000);   // tab ẩn lâu: bỏ qua
  assert.equal(shouldSuggestBattery(fast, prefs), false);
  assert.ok(Math.abs(fast.avg - 60) < 1);
});

test('lượng hạt giảm dần khi FPS tụt', () => {
  assert.equal(particleBudget(60), 1);
  assert.equal(particleBudget(50), 1);
  assert.ok(particleBudget(40) < 1 && particleBudget(40) > particleBudget(30));
  assert.equal(particleBudget(10), 0.25);
});

test('cài đặt máy lưu và đọc lại; hỏng thì về mặc định', () => {
  const mem = {};
  const st = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  assert.deepEqual(loadPrefs(st), { battery: false, hinted: false });
  savePrefs({ battery: true, hinted: true }, st);
  assert.deepEqual(loadPrefs(st), { battery: true, hinted: true });
  for (const k of Object.keys(mem)) mem[k] = '{hỏng';
  assert.deepEqual(loadPrefs(st), { battery: false, hinted: false });
});
