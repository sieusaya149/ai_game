// Thể lực: chi phí hành động, hết sức thì chậm ×2, ngủ ở giường (từ 18h, chạy thật tới 6h), ghế đá, hồi buổi sáng, bản lưu cũ.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { DAY_MS, STAMINA } from '../public/data.js';
import { migrate } from '../public/migrate.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e12; return s; };
const atHour = (s, h) => { s.time = ((h - 6 + 24) % 24) / 24 * DAY_MS; return s; };
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };
const plot = (s, i = 0) => ({ kind: 'plot', idx: i });
const ripe = (s, i) => {
  const p = s.plots[i]; p.soil = 'tilled'; p.water = 100;
  p.crop = { id: 'cai', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
};

test('bắt đầu đầy thể lực, hệ số chậm là 1', () => {
  const s = newGame();
  assert.equal(s.stamina, STAMINA.max);
  assert.equal(G.slowFactor(s), 1);
});

test('mỗi hành động tốn sức trừ đúng chi phí trong bảng', () => {
  const s = newGame();
  const steps = [['till', 'till'], ['plant', 'plant'], ['water', 'water']];
  for (const [id, cost] of steps) {
    const before = s.stamina;
    assert.ok(G.perform(s, plot(s), id).ok, id);
    assert.equal(before - s.stamina, STAMINA.cost[cost], id);
  }
  ripe(s, 1);
  const before = s.stamina;
  assert.ok(G.perform(s, plot(s, 1), 'harvest').ok);
  assert.equal(before - s.stamina, STAMINA.cost.harvest);
});

test('hành động không tốn sức: vuốt ve, cho ăn tận tay, nhặt trứng, mua bán', () => {
  const s = atHour(newGame(), 9);
  const a = s.animals[0];
  s.eggs.push({ id: 900, x: 10, y: 10, laidAt: 0 });
  G.perform(s, { kind: 'animal', id: a.id }, 'pet');
  a.hunger = 10; G.perform(s, { kind: 'animal', id: a.id }, 'feed');
  G.perform(s, { kind: 'egg', id: 900 }, 'collect');
  G.perform(s, { kind: 'dog' }, 'pet');
  s.coins = 100; G.buy(s, 'seed_cai', 1); s.inv.cai = 2; G.sell(s, 'cai', 'all');
  assert.equal(s.stamina, STAMINA.max);
});

test('hết thể lực: mọi việc tốn sức bị từ chối, nút báo lý do, hệ số chậm là 2, thể lực không âm', () => {
  const s = newGame();
  s.stamina = 1;
  const r = G.perform(s, plot(s), 'till');
  assert.ok(r.ok);
  assert.equal(s.stamina, 0);
  assert.equal(G.slowFactor(s), 2);
  assert.ok(G.actionsFor(s, plot(s))[0].disabled, 'nút gieo bị khóa');
  const r2 = G.perform(s, plot(s), 'plant');
  assert.equal(r2.ok, false);
  assert.match(r2.msg, /thuốc bổ/);
  assert.equal(s.plots[0].crop, null, 'không gieo được');
  assert.equal(s.stamina, 0);
});

test('hết thể lực: không dọn bụi, đập đá, chặt cây; đủ thể lực thì được', () => {
  const s = newGame();
  s.farm.ents.push({ id: 901, kind: 'bush', c: 40, r: 40 }, { id: 902, kind: 'rock', c: 42, r: 40 }, { id: 903, kind: 'tree', c: 44, r: 40 });
  s.stamina = 0;
  for (const id of [901, 902, 903]) {
    const t = { kind: 'clutter', id };
    assert.ok(G.actionsFor(s, t)[0].disabled, 'nút khóa ' + id);
    assert.equal(G.perform(s, t, 'clear').ok, false);
    assert.ok(s.farm.ents.some(e => e.id === id), 'vẫn còn ' + id);
  }
  s.stamina = 20;
  for (const id of [901, 902, 903]) assert.ok(G.perform(s, { kind: 'clutter', id }, 'clear').ok);
  assert.equal(s.stamina, 20 - STAMINA.cost.clearBush - STAMINA.cost.breakRock - STAMINA.cost.chopTree);
});

test('thuốc bổ: mua ở chợ, uống hồi 40 không vượt tối đa, trừ 1 món', () => {
  const s = atHour(newGame(), 9);
  s.coins = 500;
  assert.ok(G.canOrder('tonic'));
  assert.ok(G.buy(s, 'tonic', 1).ok);
  assert.equal(s.coins, 420);
  s.stamina = 10;
  assert.ok(G.drinkTonic(s).ok);
  assert.equal(s.stamina, 10 + STAMINA.tonicHeal);
  assert.equal(s.inv.tonic ?? 0, 0);
  assert.equal(G.drinkTonic(s).ok, false, 'hết thuốc');
  s.inv.tonic = 1; s.stamina = 90;
  assert.ok(G.drinkTonic(s).ok);
  assert.equal(s.stamina, STAMINA.max);
});

test('thuốc bổ: tối đa 5 lần mỗi ngày game, sang ngày mới uống tiếp', () => {
  const s = atHour(newGame(), 9);
  s.inv.tonic = 10; s.stamina = 0;
  for (let i = 0; i < STAMINA.tonicDay; i++) { s.stamina = 0; assert.ok(G.drinkTonic(s).ok, 'lần ' + i); }
  s.stamina = 0;
  const r = G.drinkTonic(s);
  assert.equal(r.ok, false);
  assert.match(r.msg, /Uống nhiều quá/);
  assert.equal(s.inv.tonic, 10 - STAMINA.tonicDay);
  s.day += 1;
  assert.ok(G.drinkTonic(s).ok);
});

test('ngồi ghế đá: nhân vật được đặt đúng mặt ghế, đứng dậy thì về chỗ cũ', () => {
  const s = atHour(newGame(), 9);
  s.inv.deco_bench = 1;
  assert.ok(G.placeDeco(s, 'deco_bench').ok);
  const e = s.farm.ents.find(x => x.item === 'deco_bench');
  const t = { kind: 'deco', id: e.id };
  s.stamina = 40;
  const from = { x: s.player.x, y: s.player.y };
  assert.ok(G.perform(s, t, 'sit').ok);
  const seat = G.seatOf(s, t);
  assert.ok(seat);
  assert.deepEqual({ x: s.player.x, y: s.player.y }, { x: seat.x, y: seat.y });
  assert.equal(s.player.dir, 0);
  G.standUp(s);
  assert.deepEqual({ x: s.player.x, y: s.player.y }, from);
  assert.equal(s.sit, false);
});

test('ngồi ghế đá trong làng: đặt giữa ghế, đứng dậy về chỗ cạnh ghế', () => {
  const s = atHour(newGame(), 9);
  G.enterScene(s, 'village');
  s.stamina = 40;
  const t = { kind: 'building', id: 'bench0' };
  const from = { x: s.player.x, y: s.player.y };
  assert.ok(G.perform(s, t, 'sit').ok);
  const seat = G.seatOf(s, t);
  assert.deepEqual({ x: s.player.x, y: s.player.y }, { x: seat.x, y: seat.y });
  G.standUp(s);
  assert.deepEqual({ x: s.player.x, y: s.player.y }, from);
});

test('ngủ trước 18h bị từ chối, bảng hành động của giường báo lý do', () => {
  const s = atHour(newGame(), 15);
  s.stamina = 20;
  const r = G.sleep(s);
  assert.equal(r.ok, false);
  assert.equal(s.stamina, 20);
  assert.ok(G.actionsFor(s, { kind: 'building', id: 'bed' }).length === 0, 'ngoài vườn không có giường');
  G.enterScene(s, 'house');
  const act = G.actionsFor(s, { kind: 'building', id: 'bed' })[0];
  assert.ok(act.disabled);
  assert.equal(G.perform(s, { kind: 'building', id: 'bed' }, 'sleep').ok, false);
});

test('ngủ sau 18h: hồi đầy thể lực, tua tới 6h sáng hôm sau, cây vẫn lớn', () => {
  const s = atHour(newGame(), 19);
  s.stamina = 0;
  const day = s.day;
  s.plots[0].soil = 'tilled'; s.plots[0].water = 100;
  s.plots[0].crop = { id: 'lua', progress: 0, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
  s.weather = 'rain';
  G.enterScene(s, 'house');
  const act = G.actionsFor(s, { kind: 'building', id: 'bed' })[0];
  assert.equal(act.disabled, undefined);
  assert.equal(G.perform(s, { kind: 'building', id: 'bed' }, 'sleep').sleep, true, 'perform chỉ báo ý định ngủ');
  const r = quiet(() => G.sleep(s));
  assert.ok(r.ok);
  assert.equal(s.stamina, STAMINA.max);
  assert.equal(s.day, day + 1);
  assert.ok(Math.abs(s.time % DAY_MS) < 1000, 'tới 6h sáng');
  assert.ok(s.plots[0].crop.progress > 0.1 || s.plots[0].crop.rotten === false, 'cây có lớn');
  assert.deepEqual(s.threats, []);
  assert.equal(G.slowFactor(s), 1);
});

test('ngủ sau nửa đêm (0h–6h) cũng được, và thức dậy lúc 6h', () => {
  const s = atHour(newGame(), 2);
  s.stamina = 5;
  assert.ok(quiet(() => G.sleep(s)).ok);
  assert.ok(Math.abs(s.time % DAY_MS) < 1000);
  assert.equal(s.stamina, STAMINA.max);
});

test('mỗi sáng 6h tự hồi một ít', () => {
  const s = newGame();
  s.stamina = 10;
  quiet(() => G.tick(s, DAY_MS + 1000));
  assert.equal(s.stamina, 10 + STAMINA.morningRegen);
  s.stamina = STAMINA.max - 5;
  quiet(() => G.tick(s, DAY_MS));
  assert.equal(s.stamina, STAMINA.max, 'không vượt quá tối đa');
});

test('vắng nhà nhiều giờ rồi vào lại: thể lực không tự đầy (chạy bù không hồi sáng)', () => {
  const s = newGame(); s.stamina = 0; s.savedAt = Date.now() - 6 * 3600_000;   // 6 giờ thật = 18 ngày game
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = quiet(() => G.loadGame());
  assert.ok(l.day > s.day + 1, 'đã chạy bù qua nhiều ngày game');
  assert.equal(l.stamina, 0);
});

test('ghế đá: ngồi thì hồi chậm theo thời gian, đứng dậy thì ngừng', () => {
  const s = atHour(newGame(), 9);
  s.inv.deco_bench = 1;
  const c = s.player;
  assert.ok(G.placeDeco(s, 'deco_bench').ok);
  const e = s.farm.ents.find(x => x.item === 'deco_bench');
  const t = { kind: 'deco', id: e.id };
  s.stamina = 40;
  const act = G.actionsFor(s, t)[0];
  assert.equal(act.id, 'sit');
  assert.equal(act.disabled, undefined);
  assert.ok(G.perform(s, t, 'sit').ok);
  quiet(() => G.tick(s, 60_000));
  assert.ok(Math.abs(s.stamina - (40 + STAMINA.benchPerMin)) < 0.01);
  assert.ok(s.stamina < STAMINA.max, 'hồi chậm');
  G.standUp(s);
  const was = s.stamina;
  quiet(() => G.tick(s, 60_000));
  assert.equal(s.stamina, was, 'đứng dậy thì ngừng hồi');
  s.stamina = STAMINA.max;
  assert.ok(G.actionsFor(s, t)[0].disabled, 'đầy rồi thì chưa cần ngồi');
  assert.ok(c);
});

test('ngồi ghế đá hồi đầy thì tự đứng dậy', () => {
  const s = atHour(newGame(), 9);
  s.stamina = STAMINA.max - 1; s.sit = true;
  quiet(() => G.tick(s, 60_000));
  assert.equal(s.stamina, STAMINA.max);
  assert.equal(s.sit, false);
});

test('làm việc khác hay sang bản đồ khác thì đứng dậy khỏi ghế', () => {
  const s = atHour(newGame(), 9);
  s.sit = true;
  G.perform(s, plot(s), 'till');
  assert.equal(s.sit, false);
  s.sit = true;
  G.enterScene(s, 'village');
  assert.equal(s.sit, false);
});

test('bản lưu cũ chưa có thể lực thì thể lực đầy; bản có thì giữ nguyên', () => {
  const old = newGame();
  delete old.stamina;
  store[G.SAVE_KEY] = JSON.stringify(migrate(old));
  assert.equal(G.loadGame().stamina, STAMINA.max);
  const tired = newGame(); tired.stamina = 0; tired.savedAt = Date.now();
  store[G.SAVE_KEY] = JSON.stringify(tired);
  const l = G.loadGame();
  assert.equal(l.stamina, 0);
  assert.equal(l.sit, false);
});
