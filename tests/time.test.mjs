// Thời gian: chạy bù tối đa 8 giờ rồi đóng băng, giờ vườn, mùa, tóm tắt "Trong lúc bạn vắng nhà", đồng hồ trừu tượng.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { setClock, realDay } from '../public/clock.js';
import { DAY_MS, MAX_CATCHUP_MS } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HOUR = 3600_000;

const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e12; return s; };
// Lưu rồi lùi savedAt `ms`, tải lại như mở game sau `ms` vắng mặt.
function reopen(s, ms) {
  s.savedAt = Date.now() - ms;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const r = Math.random; Math.random = () => 0.99;
  try { return G.loadGame(); } finally { Math.random = r; }
}

test('vắng 3 tiếng thì chạy đủ 3 tiếng, không đóng băng; giờ vườn tăng đúng', () => {
  const s = newGame(), t0 = s.time, f0 = s.simMs ?? 0;
  const l = reopen(s, 3 * HOUR);
  assert.ok(Math.abs((l.time - t0) - 3 * HOUR) < 2000);
  assert.ok(Math.abs((l.simMs - f0) - 3 * HOUR) < 2000);
  assert.equal(l.frozenMs, 0);
  assert.equal(l.away.frozenMs, 0);
});

test('vắng 12 tiếng thì chỉ chạy 8 tiếng và ghi đóng băng 4 tiếng', () => {
  const s = newGame(), t0 = s.time;
  const l = reopen(s, 12 * HOUR);
  assert.ok(Math.abs((l.time - t0) - MAX_CATCHUP_MS) < 2000);
  assert.ok(Math.abs(l.frozenMs - 4 * HOUR) < 2000);
  assert.ok(Math.abs(l.frozenTotal - 4 * HOUR) < 2000);
  assert.ok(l.away.lines.some(x => x === 'Vườn đã đóng băng 4 giờ'), l.away.lines.join('|'));
  // lần mở sau không đóng băng nữa, tổng thì giữ
  const l2 = reopen(l, 1 * HOUR);
  assert.equal(l2.frozenMs, 0);
  assert.ok(l2.frozenTotal > 3.9 * HOUR);
});

test('giờ vườn chỉ tăng khi mô phỏng chạy: tick thường, ngủ; không tăng khi đóng băng', () => {
  const s = newGame();
  G.tick(s, 5000);
  assert.equal(s.simMs, 5000);
  s.time = 0.9 * DAY_MS; s.simMs = 0;
  assert.ok(G.sleep(s).ok);
  assert.ok(Math.abs(s.simMs - 0.1 * DAY_MS) < 1500);
  const l = reopen(newGame(), 20 * HOUR);
  assert.ok(Math.abs(l.simMs - MAX_CATCHUP_MS) < 2000);
});

test('bản lưu cũ chưa có giờ vườn: lấy theo thời gian đã chạy', () => {
  const s = newGame(); s.time = 12345; delete s.simMs;
  const l = reopen(s, 0);
  assert.equal(l.simMs, 12345);
  assert.equal(l.frozenTotal, 0);
});

test('mùa đổi sau mỗi 7 ngày game: Xuân, Hạ, Thu, Đông rồi quay lại', () => {
  const at = day => G.seasonOf({ day });
  assert.deepEqual([1, 7, 8, 14, 15, 21, 22, 28, 29].map(d => at(d).key), ['xuan', 'xuan', 'ha', 'ha', 'thu', 'thu', 'dong', 'dong', 'xuan']);
  assert.equal(at(1).name, 'Xuân');
  assert.equal(at(8).name, 'Hạ');
  assert.equal(at(3).dayIn, 3);
  assert.equal(at(8).dayIn, 1);
});

test('awaySummary gộp: "5 ô cà chua đã chín", lái buôn, trứng, bệnh, quạ, đóng băng', () => {
  const ev = [
    ...Array(5).fill({ type: 'ripe', crop: 'cachua' }),
    { type: 'ripe', crop: 'cai' },
    { type: 'rotten', crop: 'cai' }, { type: 'rotten', crop: 'cai' },
    { type: 'egg' }, { type: 'egg' }, { type: 'egg' },
    { type: 'sick', animal: 'Gà' }, { type: 'sick', animal: 'Gà' }, { type: 'hungry', animal: 'Heo' },
    { type: 'crow', crop: 'cai' }, { type: 'guard', who: 'thief' },
    { type: 'shipped', coins: 70, items: {}, t: 0 }, { type: 'shipped', coins: 50, items: {}, t: 1 },
    { type: 'toast', text: 'bỏ qua' },
  ];
  const lines = G.awaySummary(ev, 4 * HOUR);
  for (const want of ['5 ô cà chua đã chín', '1 ô cải xanh đã chín', '2 ô cải xanh đã héo', '3 quả trứng mới', '2 con gà bị bệnh', '1 con heo đang đói', 'Lái buôn trả 120 xu', 'Vườn đã đóng băng 4 giờ']) {
    assert.ok(lines.includes(want), `thiếu "${want}" trong ${JSON.stringify(lines)}`);
  }
  assert.ok(lines.some(x => /quạ/i.test(x)) && lines.some(x => /đuổi/.test(x)));
  assert.deepEqual(G.awaySummary([], 0), []);
  assert.deepEqual(G.awaySummary([], 90 * 60_000), ['Vườn đã đóng băng 1 giờ 30 phút']);
});

test('chạy bù thật: cây chín lúc vắng được ghi vào s.away; vắng quá ngắn thì không có màn tóm tắt', () => {
  const s = newGame();
  for (const i of [0, 1, 2]) { const p = s.plots[i]; p.soil = 'tilled'; p.water = 100; p.crop = { id: 'cai', progress: 0.5, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 }; }
  const l = reopen(s, 10 * 60_000);
  assert.ok(l.away.lines.includes('3 ô cải xanh đã chín'), l.away.lines.join('|'));
  assert.ok(l.away.ms >= 10 * 60_000 - 100);
  const q = reopen(newGame(), 2000);
  assert.equal(q.away, null);
});

test('đồng hồ trừu tượng: setClock đổi nguồn giờ cho loadGame/saveGame; realDay theo giờ địa phương', () => {
  let t = new Date(2026, 9, 2, 23, 30).getTime();   // 2/10/2026 23:30 giờ địa phương
  setClock(() => t);
  try {
    const s = newGame();
    G.saveGame(s);
    assert.equal(s.savedAt, t);
    t += 2 * HOUR;
    const l = G.loadGame();
    assert.ok(Math.abs(l.simMs - s.simMs - 2 * HOUR) < 2000);
    assert.equal(l.savedAt, t);
    assert.equal(realDay(), '2026-10-03');
  } finally { setClock(null); }
  assert.equal(realDay(new Date(2026, 0, 5, 0, 5).getTime()), '2026-01-05');
});
