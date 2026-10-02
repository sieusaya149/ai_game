// Đồng hồ làng (issue 23): lịch làng theo giờ server, đóng băng chỉ áp cho vườn, ngày ngoài đời, đo lệch giờ, online khóa x1.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { setClock, villageCal, serverDay, measureOffset, useServerTime, VILLAGE_EPOCH } from '../public/clock.js';
import { DAY_MS, MAX_CATCHUP_MS, SPEEDS } from '../public/data.js';
import { bootServer } from './helpers/server.mjs';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HOUR = 3600_000;
const online = () => { const s = G.createGame({ name: 'Làng' }); s.mode = 'online'; s.account = 'Làng'; s.orders = []; s.nextOrderAt = 1e12; return s; };

test('lịch làng là hàm của giờ server: cùng giờ → cùng ngày, mùa, giờ trong ngày; qua ranh giới mùa thì đổi mùa', t => {
  t.after(() => setClock(null));
  const at = ms => { setClock(() => VILLAGE_EPOCH + ms); const s = online(); return { day: G.dayOf(s), season: G.seasonOf(s), clock: G.clockText(s), night: G.isNight(s) }; };
  const a = at(0);
  assert.equal(a.day, 1); assert.equal(a.season.key, 'xuan'); assert.equal(a.clock, '6:00 sáng'); assert.equal(a.night, false);
  assert.deepEqual(at(0), a);
  assert.equal(at(DAY_MS - 1).day, 1);
  assert.equal(at(DAY_MS).day, 2);
  assert.equal(at(7 * DAY_MS - 1).season.key, 'xuan');
  const ha = at(7 * DAY_MS); assert.equal(ha.season.key, 'ha'); assert.equal(ha.season.dayIn, 1);
  assert.equal(at(28 * DAY_MS).season.key, 'xuan');
  assert.equal(at(0.8 * DAY_MS).night, true);
  assert.deepEqual(villageCal(VILLAGE_EPOCH + 3 * DAY_MS + DAY_MS / 4), { day: 4, tod: DAY_MS / 4, frac: 0.25 });
});

test('hai máy lệch giờ khác nhau, áp độ lệch đo được thì ra cùng ngày, mùa, ban ngày/đêm', async t => {
  t.after(() => setClock(null));
  const server = VILLAGE_EPOCH + 9 * DAY_MS + 0.8 * DAY_MS;   // ngày 10, ban đêm
  const view = async skew => {
    const local = () => server + skew;   // giờ máy = giờ server + skew
    const off = await measureOffset(async () => server, 3, local);
    assert.equal(off, -skew || 0);
    setClock(() => local() + off);
    const s = online();
    return [G.dayOf(s), G.seasonOf(s).key, G.isNight(s), G.clockText(s)];
  };
  const a = await view(0), b = await view(-5 * HOUR), c = await view(+30 * HOUR);
  assert.deepEqual(b, a); assert.deepEqual(c, a);
  assert.equal(a[0], 10); assert.equal(a[2], true);
});

test('đo lệch: chọn lần khứ hồi ngắn nhất; không lần nào được thì null; useServerTime(null) về giờ máy', async t => {
  t.after(() => setClock(null));
  let n = 0, clk = 1000;
  // lần 1 mất 100ms, lần 2 mất 10ms, lần 3 mất 50ms; server luôn hơn máy 500ms tại điểm giữa
  const dur = [100, 10, 50];
  const local = () => clk;
  const ask = async () => { const d = dur[n++]; clk += d / 2; const srv = clk + 500; clk += d / 2; return srv; };
  assert.equal(await measureOffset(ask, 3, local), 500);
  assert.equal(await measureOffset(async () => { throw new Error('mất mạng'); }, 2, local), null);
  useServerTime(60_000);
  assert.ok(Math.abs(G.createGame({ name: 'x' }).savedAt - (Date.now() + 60_000)) < 1000);
  useServerTime(null);
  assert.ok(Math.abs(G.createGame({ name: 'x' }).savedAt - Date.now()) < 1000);
});

test('vườn đóng băng sau 8 tiếng nhưng lịch làng vẫn tiến đủ; tuổi con vật theo giờ vườn thật sự chạy', t => {
  t.after(() => setClock(null));
  let T = VILLAGE_EPOCH + 100 * DAY_MS;
  setClock(() => T);
  const s = online(); s.savedAt = T;
  const day0 = G.dayOf(s), sim0 = s.simMs;
  T += 20 * HOUR;   // vắng 20 tiếng: chạy bù 8 tiếng, đóng băng 12 tiếng
  const l = G.loadGame(JSON.parse(JSON.stringify(s)));
  assert.ok(Math.abs((l.simMs - sim0) - MAX_CATCHUP_MS) < 2000);
  assert.equal(l.frozenMs, 20 * HOUR - MAX_CATCHUP_MS);
  assert.equal(G.dayOf(l) - day0, Math.floor(20 * HOUR / DAY_MS) + (villageCal(T).tod < villageCal(T - 20 * HOUR).tod ? 1 : 0));
  assert.ok(Math.abs(G.farmHours(l) - 8) < 0.01);
});

test('ngày ngoài đời đổi đúng lúc nửa đêm giờ Việt Nam (UTC+7)', () => {
  const vn = (h, m, s = 0) => Date.UTC(2026, 9, 2, h, m, s) - 7 * HOUR;   // 02/10/2026 h:m:s giờ VN
  assert.equal(serverDay(vn(23, 59, 59)), '2026-10-02');
  assert.equal(serverDay(vn(24, 0, 0)), '2026-10-03');
  assert.equal(serverDay(vn(0, 0, 0)), '2026-10-02');
  assert.equal(serverDay(Date.UTC(2026, 11, 31, 17, 0)), '2027-01-01');
});

test('online luôn x1: tốc độ thật và kiểm tra bản lưu', () => {
  const s = online(); s.speed = 20;
  assert.equal(G.speedOf(s), 1);
  assert.equal(G.speedOf({ ...s, mode: 'offline' }), 20);
  assert.equal(G.loadGame(JSON.parse(JSON.stringify(s))).speed, 1);
  // vườn online chạy nhanh hơn thời gian thật (x5) bị từ chối, chơi đơn x5 thì còn được
  const prev = online(), next = { ...prev, simMs: prev.simMs + 5 * HOUR };
  assert.equal(G.checkSaveJump(prev, next, HOUR).ok, false);
  assert.equal(G.checkSaveJump(prev, { ...next, mode: 'offline' }, HOUR).ok, Math.max(...SPEEDS) >= 5);
  assert.equal(G.checkSaveJump(prev, { ...prev, simMs: prev.simMs + HOUR }, HOUR).ok, true);
});

test('server: trả giờ hiện tại để trình duyệt đồng bộ giờ, sai số đo lệch trong ngưỡng', async t => {
  const srv = await bootServer();
  t.after(srv.close);
  const off = await measureOffset(async () => (await srv.json('/api/health')).body.now);
  assert.ok(Math.abs(off) < 500, `lệch ${off}ms`);
});
