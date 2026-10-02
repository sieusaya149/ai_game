// Seam 1: trường online trong bản lưu v2 (issue 22) và hàm chống gian lận nhẹ checkSaveJump.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const clear = () => { for (const k of Object.keys(store)) delete store[k]; };
const MIN = 60_000;

test('bản lưu có trường online vẫn đọc được như vườn thường, giữ nguyên các trường đó', () => {
  clear();
  const s = G.createGame({ name: 'Lan' });
  Object.assign(s, { mode: 'online', account: 'Lan', today: { day: '2026-10-02', helps: 3, steals: 1, stolen: 2 }, guests: [{ who: 'Cúc', what: 'help', at: 1 }] });
  s.dog.chained = true;
  const back = G.loadGame(JSON.parse(JSON.stringify(s)));
  assert.equal(back.coins, s.coins);
  assert.deepEqual([back.mode, back.account], ['online', 'Lan']);
  assert.deepEqual(back.today, s.today);
  assert.deepEqual(back.guests, s.guests);
  assert.equal(back.dog.chained, true);
  assert.equal(store[G.SAVE_KEY], undefined);   // đọc bản truyền vào thì không đụng localStorage
});

test('bản lưu Phase 0 thiếu trường online: bù mặc định, là vườn chơi đơn', () => {
  clear();
  const s = G.createGame({ name: 'Cũ' });
  for (const k of ['mode', 'account', 'today', 'guests']) delete s[k];
  delete s.dog.chained;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const back = G.loadGame();
  assert.deepEqual([back.mode, back.account], ['offline', null]);
  assert.deepEqual(back.today, { day: '', helps: 0, steals: 0, stolen: 0 });
  assert.deepEqual(back.guests, []);
  assert.equal(back.dog.chained, false);
});

test('vườn online không bao giờ ghi đè bản chơi đơn trong localStorage', () => {
  clear();
  const solo = G.createGame({ name: 'Solo' });
  G.saveGame(solo);
  const before = store[G.SAVE_KEY];
  const on = G.createGame({ name: 'Lan' });
  on.mode = 'online'; on.coins = 9999; on.savedAt = 0;
  G.saveGame(on);
  assert.equal(store[G.SAVE_KEY], before);
  assert.ok(on.savedAt > 0);   // vẫn đóng dấu giờ lưu để gửi lên server
});

test('checkSaveJump: tăng hợp lý theo thời gian thì nhận; xu, đồ, EXP tăng vọt thì từ chối đúng lý do', () => {
  const a = G.createGame({ name: 'Lan' });
  const next = mut => { const b = structuredClone(a); b.simMs = a.simMs + 10_000; mut(b); return b; };
  assert.equal(G.checkSaveJump(a, next(b => { b.coins += 80; b.exp += 30; }), 10_000).ok, true);
  assert.equal(G.checkSaveJump(a, next(b => { b.coins += 1e6; }), 10_000).reason, 'coins');
  assert.equal(G.checkSaveJump(a, next(b => { b.inv.seed_dau = 9999; }), 10_000).reason, 'coins');
  assert.equal(G.checkSaveJump(a, next(b => { b.exp += 1e5; }), 10_000).reason, 'exp');
  // một tiếng trôi qua thì cho phép nhiều hơn hẳn
  const later = structuredClone(a); later.simMs += 60 * MIN; later.coins += 50_000;
  assert.equal(G.checkSaveJump(a, later, 60 * MIN).ok, true);
});

test('checkSaveJump: bán cả kho một lúc là hợp lý (của cải không đổi), mua đồ cũng vậy', () => {
  const a = G.createGame({ name: 'Lan' });
  a.basket.dau = 400; a.inv.len = 100;
  const sold = structuredClone(a);
  sold.coins += 400 * 35 + 100 * 60; delete sold.basket.dau; delete sold.inv.len; sold.simMs += 1000;
  assert.equal(G.checkSaveJump(a, sold, 1000).ok, true);
  const bought = structuredClone(sold);
  bought.coins -= 50 * 80; bought.inv.seed_dau = 50;
  assert.equal(G.checkSaveJump(sold, bought, 1000).ok, true);
});

test('checkSaveJump: giờ vườn chạy nhanh hơn thời gian thật cho phép (kể cả x20 và một đêm ngủ) thì từ chối', () => {
  const a = G.createGame({ name: 'Lan' });
  const b = structuredClone(a);
  b.simMs += 10_000 * 20 + 10 * MIN;   // 10 giây ở x20 + ngủ một đêm: được
  assert.equal(G.checkSaveJump(a, b, 10_000).ok, true);
  b.simMs += 60 * MIN;
  assert.equal(G.checkSaveJump(a, b, 10_000).reason, 'time');
});
