// Ngủ online (hotfix): không tua thời gian, nằm giường tới 6h sáng làng, thể lực hồi dần; chơi đơn vẫn tua.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { setClock, VILLAGE_EPOCH } from '../public/clock.js';
import { DAY_MS, STAMINA } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const HOUR = DAY_MS / 24;   // 1 giờ làng (ms ngoài đời)
let T;                       // giờ server giả
const at = h => { T = VILLAGE_EPOCH + 5 * DAY_MS + ((h - 6 + 24) % 24) * HOUR; setClock(() => T); };
const online = () => { const s = G.createGame({ name: 'Hùng' }); s.mode = 'online'; s.orders = []; s.nextOrderAt = 1e12; s.scene = 'house'; return s; };
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };
// chạy `ms` thời gian thật: giờ server và vườn cùng nhích
const run = (s, ms) => quiet(() => { for (let t = 0; t < ms; t += 1000) { T += 1000; G.tick(s, 1000); } });
test.afterEach(() => setClock(null));

test('online: ngủ không tua giờ vườn hay cây, đêm vẫn là đêm', () => {
  at(1);
  const s = online(); s.stamina = 0;
  s.plots[0].soil = 'tilled'; s.plots[0].water = 100;
  s.plots[0].crop = { id: 'lua', progress: 0, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
  const time = s.time, prog = s.plots[0].crop.progress;
  const r = quiet(() => G.sleep(s));
  assert.ok(r.ok);
  assert.equal(s.time, time);
  assert.equal(s.plots[0].crop.progress, prog);
  assert.equal(G.isAsleep(s), true);
  assert.equal(G.isNight(s), true);
  assert.equal(s.stamina, 0, 'chưa ngủ xong thì chưa đầy');
});

test('online: ngủ rồi cây và vật nuôi vẫn chạy theo giờ thật', () => {
  at(19);
  const s = online(); s.weather = 'rain';
  s.plots[0].soil = 'tilled'; s.plots[0].water = 100;
  s.plots[0].crop = { id: 'lua', progress: 0, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
  quiet(() => G.sleep(s));
  const time = s.time;
  run(s, 60_000);
  assert.ok(Math.abs(s.time - time - 60_000) < 1500);
  assert.ok(s.plots[0].crop.progress > 0);
});

test('online: thể lực hồi dần khi ngủ, đầy lúc 6h sáng', () => {
  at(18);
  const s = online(); s.stamina = 0;
  quiet(() => G.sleep(s));
  run(s, 6 * HOUR);   // 18h → 24h
  assert.ok(Math.abs(s.stamina - STAMINA.max / 2) < 2, `giữa đêm: ${s.stamina}`);
  assert.equal(G.isAsleep(s), true);
  run(s, 6 * HOUR - 2000);   // sát 6h
  assert.ok(s.stamina > STAMINA.max - 2 && G.isAsleep(s));
  run(s, 3000);
  assert.equal(s.stamina, STAMINA.max);
});

test('online: tới 6h làng tự dậy, báo chào buổi sáng, tính một lần ngủ', () => {
  at(23);
  const s = online(); s.stamina = 10;
  const slept = s.stats.slept;
  quiet(() => G.sleep(s));
  assert.equal(s.stats.slept, slept, 'chưa dậy chưa tính');
  run(s, 7 * HOUR + 2000);
  assert.equal(G.isAsleep(s), false);
  assert.equal(s.stats.slept, slept + 1);
  assert.equal(G.isNight(s), false);
  assert.ok(s.stamina <= STAMINA.max);
});

test('online: nút Dậy thức sớm, giữ thể lực đã hồi, rồi làm việc được', () => {
  at(20);
  const s = online(); s.stamina = 0; s.tutorial = 0;
  quiet(() => G.sleep(s));
  run(s, 2 * HOUR);
  const got = s.stamina;
  assert.ok(got > 10 && got < STAMINA.max);
  const r = G.wake(s);
  assert.ok(r.ok);
  assert.equal(G.isAsleep(s), false);
  assert.equal(s.stamina, got);
  assert.equal(s.stats.slept, 1);
  run(s, 60_000);
  assert.equal(s.stamina, got, 'dậy rồi thì thôi hồi');
  assert.equal(G.wake(s).ok, false, 'không ngủ mà bấm Dậy');
});

test('online: đang ngủ không làm được gì, không ngủ chồng, không rời nhà', () => {
  at(19);
  const s = online();
  quiet(() => G.sleep(s));
  const until = s.sleepUntil;
  assert.equal(G.sleep(s).ok, false, 'ngủ lần hai');
  assert.equal(s.sleepUntil, until);
  s.scene = 'farm';
  assert.equal(G.perform(s, { kind: 'plot', idx: 0 }, 'till').ok, false);
  s.scene = 'house';
  assert.equal(G.enterScene(s, 'farm').ok, false);
});

test('online: ngủ hai lần trong một đêm không tua được thêm giờ vườn', () => {
  at(19);
  const s = online();
  const t0 = s.time;
  quiet(() => G.sleep(s)); G.wake(s);
  quiet(() => G.sleep(s)); G.wake(s);
  quiet(() => G.sleep(s)); G.wake(s);
  assert.equal(s.time, t0);
  assert.equal(s.simMs, 0);
});

test('online: tải lại giữa đêm vẫn đang ngủ; về sau 6h thì dậy với thể lực đã hồi', () => {
  at(19);
  const s = online(); s.stamina = 0;
  quiet(() => G.sleep(s));
  s.savedAt = T; store[G.SAVE_KEY] = JSON.stringify(s);
  T += 3 * HOUR;
  const l = quiet(() => G.loadGame(JSON.parse(store[G.SAVE_KEY])));
  assert.equal(G.isAsleep(l), true, 'giữa đêm còn ngủ');
  assert.ok(l.stamina > 20 && l.stamina < STAMINA.max, `hồi lúc vắng: ${l.stamina}`);
  const s2 = online(); s2.stamina = 0;
  at(18); quiet(() => G.sleep(s2));
  s2.savedAt = T;
  T += 13 * HOUR;   // 18h + 13h = 7h sáng hôm sau
  const l2 = quiet(() => G.loadGame(JSON.parse(JSON.stringify(s2))));
  assert.equal(G.isAsleep(l2), false);
  assert.equal(l2.stats.slept, 1);
  assert.equal(l2.stamina, STAMINA.max);
});

test('chơi đơn: ngủ vẫn tua tới 6h sáng và hồi đầy ngay', () => {
  const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e12;
  s.time = 13 / 24 * DAY_MS; s.stamina = 0;
  const r = quiet(() => G.sleep(s));
  assert.ok(r.ok);
  assert.equal(G.isAsleep(s), false);
  assert.equal(s.stamina, STAMINA.max);
  assert.equal(s.stats.slept, 1);
  assert.ok(Math.abs(s.time % DAY_MS) < 1000);
});
