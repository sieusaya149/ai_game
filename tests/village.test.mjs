// Làng và chợ Bà Tư: đi lại giữa vườn và làng, giờ mở cửa chợ, sạp hàng đã bỏ khỏi vườn, thông báo gấp khi đang ở làng.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../public/state.js';
import { DAY_MS } from '../public/data.js';
import { TS } from '../public/layout.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e12; return s; };
// Giờ trong game: ngày bắt đầu lúc 6h, một ngày dài DAY_MS
const atHour = (s, h) => { s.time = ((h - 6 + 24) % 24) / 24 * DAY_MS; return s; };
const MARKET = { kind: 'building', id: 'market' };
const tileOf = p => [Math.floor(p.x / TS), Math.floor(p.y / TS)];
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };

test('ra cổng vườn tới làng, vào cổng nhà mình thì về vườn đứng ở cổng', () => {
  const s = newGame();
  const gate = G.mapOf(s).building('gate');
  assert.ok(G.mapOf(s).doors.some(d => d.to === 'village'), 'cổng vườn là cửa sang làng');
  const r = G.enterScene(s, 'village');
  assert.ok(r.ok);
  assert.equal(s.scene, 'village');
  const v = G.sceneMap(s);
  assert.ok(v.W > 0 && v.view);
  assert.ok(!v.isSolidPx(s.player.x, s.player.y), 'chỗ đứng khi tới làng không bị chắn');
  const door = v.doors.find(d => d.to === 'farm');
  assert.ok(door, 'làng có cổng về vườn nhà');
  for (const id of ['market', 'smithy', 'friendGate']) assert.ok(G.reachable(v, s.player, v.building(id).at), `tới được ${id}`);
  assert.ok(G.reachable(v, s.player, { x: door.x + door.w / 2, y: door.y + door.h / 2 }));
  assert.equal(G.actionsFor(s, { kind: 'door', to: 'farm' })[0].id, 'go');
  assert.equal(G.perform(s, { kind: 'door', to: 'farm' }, 'go').go, 'farm');
  assert.ok(G.enterScene(s, 'farm').ok);
  assert.equal(s.scene, 'farm');
  assert.deepEqual(tileOf(s.player), tileOf(gate.at), 'về vườn đứng ở cổng');
  assert.ok(!G.mapOf(s).isSolidPx(s.player.x, s.player.y));
  // chạm vào cổng vườn: hành động chính là Ra làng
  const act = G.actionsFor(s, { kind: 'building', id: 'gate' })[0];
  assert.match(act.label, /Ra làng/);
  assert.equal(G.perform(s, { kind: 'building', id: 'gate' }, act.id).go, 'village');
});

test('giờ mở cửa chợ 6h–18h', () => {
  const s = newGame();
  for (const [h, open] of [[6, true], [12, true], [17.9, true], [18, false], [20, false], [23.5, false], [3, false], [5.9, false]]) {
    assert.equal(G.marketOpen(atHour(s, h)), open, `${h}h`);
  }
  assert.equal(G.marketOpen({ ...s, time: s.time + DAY_MS }), G.marketOpen(s), 'ngày sau lặp lại');
});

test('chợ trong giờ: mua và bán được', () => {
  const s = atHour(newGame(), 9);
  s.coins = 500;
  const r = G.buy(s, 'seed_cai', 2);
  assert.ok(r.ok);
  assert.equal(s.inv.seed_cai, 8);
  s.inv.cai = 3;
  const c = s.coins, sold = G.sell(s, 'cai', 'all');
  assert.ok(sold.ok);
  assert.equal(s.coins, c + sold.coins);
  assert.ok(G.buyAnimal(s, 'ga').ok);
  assert.ok(G.buyOutfit(s, 'hat', 2).ok);
  s.inv.trung = 2;
  assert.ok(G.sellAll(s).ok);
});

test('chợ ngoài giờ: mua bán đều bị từ chối kèm lý do, không mất gì', () => {
  const s = atHour(newGame(), 20);
  s.coins = 1000; s.inv.cai = 5;
  const before = structuredClone({ coins: s.coins, inv: s.inv, animals: s.animals.length, owned: s.owned });
  const refused = [G.buy(s, 'seed_cai', 1), G.sell(s, 'cai', 1), G.sell(s, 'cai', 'all'), G.sellAll(s), G.buyAnimal(s, 'ga'), G.buyOutfit(s, 'hat', 2)];
  for (const r of refused) {
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'closed');
    assert.match(r.msg, /đóng cửa/i);
    assert.match(r.msg, /6 giờ/);
  }
  assert.deepEqual({ coins: s.coins, inv: s.inv, animals: s.animals.length, owned: s.owned }, before);
  // sáng hôm sau chợ mở lại
  atHour(s, 6);
  assert.ok(G.buy(s, 'seed_cai', 1).ok);
});

test('quầy chợ: hành động chính bị khóa có lý do khi đóng cửa', () => {
  const s = newGame();
  G.enterScene(s, 'village');
  atHour(s, 10);
  const open = G.actionsFor(s, MARKET)[0];
  assert.equal(open.id, 'open');
  assert.ok(!open.disabled);
  assert.equal(G.perform(s, MARKET, 'open').open, 'market');
  atHour(s, 19);
  const shut = G.actionsFor(s, MARKET)[0];
  assert.equal(shut.id, 'open');
  assert.match(shut.disabled, /đóng cửa/i);
  const r = G.perform(s, MARKET, 'open');
  assert.equal(r.ok, false);
  assert.equal(r.open, undefined);
});

test('tiệm rèn mở bảng nâng cấp; cổng bạn bè chưa mở: chạm thì có lời nhắn', () => {
  const s = newGame();
  G.enterScene(s, 'village');
  const smithy = G.perform(s, { kind: 'building', id: 'smithy' }, G.actionsFor(s, { kind: 'building', id: 'smithy' })[0].id);
  assert.ok(smithy.ok);
  assert.equal(smithy.open, 'smithy');
  const gate = G.perform(s, { kind: 'building', id: 'friendGate' }, G.actionsFor(s, { kind: 'building', id: 'friendGate' })[0].id);
  assert.match(gate.msg, /Sắp ra mắt: thăm bạn bè/);
});

test('sạp hàng không còn trong vườn mới, nhà kho chỉ còn là chỗ cất đồ', () => {
  const s = newGame();
  const m = G.mapOf(s);
  assert.equal(m.building('shop'), null);
  assert.ok(!s.farm.ents.some(e => e.kind === 'shop'));
  const shed = G.actionsFor(s, { kind: 'building', id: 'shed' });
  assert.equal(shed.length, 1);
  assert.equal(G.perform(s, { kind: 'building', id: 'shed' }, 'open').open, 'shed');
  assert.deepEqual(G.actionsFor(s, { kind: 'building', id: 'shop' }), []);
});

test('vườn chuyển từ v1 không còn sạp hàng', () => {
  for (const k of Object.keys(store)) delete store[k];
  const v1 = JSON.parse(readFileSync(new URL('./fixtures/v1-mid.json', import.meta.url), 'utf8'));
  v1.savedAt = Date.now();
  store['nongtrai-save-v1'] = JSON.stringify(v1);
  const s = G.loadGame();
  assert.ok(!s.farm.ents.some(e => e.kind === 'shop'));
  assert.equal(G.mapOf(s).building('shop'), null);
  for (const b of G.mapOf(s).buildings) if (b.at) assert.ok(G.reachable(G.mapOf(s), G.mapOf(s).building('gate').at, b.at), `tới được ${b.id}`);
});

test('vườn v2 đã lỡ có sạp hàng: dọn đi khi tải', () => {
  for (const k of Object.keys(store)) delete store[k];
  const s = newGame();
  s.farm.ents.push({ id: s.nextId++, kind: 'shop', c: 40, r: 21 });
  s.farm.rev++;
  assert.equal(G.mapOf(s).building('shop'), null, 'bản đồ cũng không dựng sạp');
  G.saveGame(s);
  const back = G.loadGame();
  assert.ok(!back.farm.ents.some(e => e.kind === 'shop'));
  assert.equal(back.coins, s.coins);
  assert.equal(back.farm.ents.length, s.farm.ents.length - 1);
});

test('đang ở làng: quạ ăn cây trong vườn vẫn có thông báo', () => {
  const s = newGame(); s.animals = [];
  G.perform(s, { kind: 'plot', idx: 0 }, 'till'); G.perform(s, { kind: 'plot', idx: 0 }, 'plant');
  s.plots[0].crop.progress = 1; s.weather = 'rain';
  s.dog.adult = false;
  G.enterScene(s, 'village');
  const events = [];
  const r = Math.random; Math.random = () => 0.0001;
  try { events.push(...G.tick(s, 1000)); } finally { Math.random = r; }
  assert.equal(s.threats.length, 1, 'quạ đã tới');
  s.dog.hunger = 100;
  const mid = quiet(() => G.tick(s, 20_000));
  assert.ok(mid.some(e => e.type === 'eating'), 'quạ bắt đầu ăn');
  const spot = G.urgentSpots(s).find(p => p.kind === 'crow');
  assert.ok(spot, 'ở làng vẫn có điểm gấp để báo');
  assert.equal(s.scene, 'village');
  const later = quiet(() => G.tick(s, 120_000));
  assert.equal(s.plots[0].crop, null);
  assert.ok(later.some(e => e.type === 'crow'), 'báo quạ ăn mất cây');
  assert.deepEqual(G.urgentSpots(s), []);
});
