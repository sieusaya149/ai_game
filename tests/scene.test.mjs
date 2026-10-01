import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { TS } from '../public/layout.js';

// localStorage giả cho Node
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e12; return s; };
const HOUSE = { kind: 'building', id: 'house' };
const tileOf = p => [Math.floor(p.x / TS), Math.floor(p.y / TS)];
const ids = list => list.map(a => a.id);

test('game mới ở vườn; bản đồ vườn chính là mapOf', () => {
  const s = newGame();
  assert.equal(s.scene, 'farm');
  assert.equal(G.sceneMap(s), G.mapOf(s));
});

test('nhà ngoài vườn: hành động chính là Vào nhà, không còn mở tủ đồ từ ngoài', () => {
  const s = newGame();
  const acts = G.actionsFor(s, HOUSE);
  assert.equal(acts[0].id, 'enter');
  assert.match(acts[0].label, /Vào nhà/);
  assert.ok(!ids(acts).includes('open'));
  assert.equal(G.perform(s, HOUSE, 'open').ok, false);
  const r = G.perform(s, HOUSE, 'enter');
  assert.ok(r.ok);
  assert.equal(r.go, 'house');
  assert.equal(s.scene, 'farm');    // perform chỉ báo ý định, main.js mờ màn hình rồi mới chuyển
});

test('vườn → nhà → vườn: đúng bản đồ, đúng vị trí', () => {
  const s = newGame();
  const r = G.enterScene(s, 'house');
  assert.ok(r.ok);
  assert.equal(s.scene, 'house');
  const m = G.sceneMap(s);
  assert.notEqual(m, G.mapOf(s));
  assert.ok(m.W > 0 && m.H > 0 && m.view);
  assert.deepEqual({ x: s.player.x, y: s.player.y }, { x: m.arrive.farm.x, y: m.arrive.farm.y });
  assert.ok(!m.isSolidPx(s.player.x, s.player.y));
  assert.ok(m.building('wardrobe') && m.building('bed'));
  assert.ok(G.reachable(m, s.player, m.building('wardrobe').at));
  assert.ok(G.reachable(m, s.player, m.building('bed').at));

  const out = G.enterScene(s, 'farm');
  assert.ok(out.ok);
  assert.equal(s.scene, 'farm');
  assert.deepEqual(tileOf(s.player), tileOf(G.mapOf(s).building('house').at));   // đứng trước nhà
  assert.equal(s.player.dir, 0);
});

test('không có cửa thì không sang được; tên bản đồ lạ cũng không', () => {
  const s = newGame();
  assert.equal(G.enterScene(s, 'farm').reason, 'no_door');   // đang ở vườn rồi
  assert.equal(G.enterScene(s, 'moon').ok, false);
  G.enterScene(s, 'house');
  const before = { ...s.player };
  const r = G.enterScene(s, 'village');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'no_door');
  assert.equal(s.scene, 'house');
  assert.deepEqual(s.player, before);
});

test('trong nhà: tủ đồ mở bảng đổi ngoại hình, giường chưa dùng được, cửa dẫn ra vườn', () => {
  const s = newGame();
  G.enterScene(s, 'house');
  const ward = { kind: 'building', id: 'wardrobe' };
  assert.equal(G.actionsFor(s, ward)[0].id, 'open');
  assert.equal(G.perform(s, ward, 'open').open, 'house');
  const bed = G.actionsFor(s, { kind: 'building', id: 'bed' });
  assert.equal(bed.length, 1);
  assert.equal(bed[0].disabled, 'Để dành cho tối nay');
  const door = { kind: 'door', to: 'farm' };
  assert.equal(G.actionsFor(s, door)[0].id, 'go');
  assert.equal(G.perform(s, door, 'go').go, 'farm');
  // ngoài vườn không có tủ đồ, trong nhà không có cửa sang làng
  assert.deepEqual(G.actionsFor(s, { kind: 'door', to: 'village' }), []);
  G.enterScene(s, 'farm');
  assert.deepEqual(G.actionsFor(s, ward), []);
});

test('cửa là ô bước vào được: cửa nhà ngoài vườn và cửa ra trong nhà', () => {
  const s = newGame();
  for (const scene of ['farm', 'house']) {
    if (scene === 'house') G.enterScene(s, 'house');
    const m = G.sceneMap(s), d = m.doors.find(x => x.to === (scene === 'farm' ? 'house' : 'farm'));
    assert.ok(d, scene);
    const mid = { x: d.x + d.w / 2, y: d.y + d.h / 2 };
    assert.ok(!m.isSolidPx(mid.x, mid.y), scene);
    assert.ok(G.reachable(m, s.player, mid), scene);
    // chỗ đứng khi tới nơi không nằm trong ô cửa (khỏi bị đẩy qua lại)
    const inDoor = p => p.x >= d.x && p.x < d.x + d.w && p.y >= d.y && p.y < d.y + d.h;
    assert.ok(!inDoor(s.player), scene);
  }
});

test('ở trong nhà thì thời gian vườn vẫn chạy: cây vẫn lớn', () => {
  const s = newGame();
  const p = s.plots[0];
  p.soil = 'tilled'; p.water = 100; p.weeds = false;
  p.crop = { id: 'cai', progress: 0, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
  G.enterScene(s, 'house');
  const r = Math.random; Math.random = () => 0.99;
  try { G.tick(s, 30_000); } finally { Math.random = r; }
  assert.ok(p.crop.progress > 0);
  assert.equal(s.scene, 'house');
});

test('lưu và tải lại: đúng bản đồ, đúng vị trí; bản lưu cũ chưa có scene thì ở vườn', () => {
  const s = newGame();
  G.enterScene(s, 'house');
  s.player.x += 5;
  G.saveGame(s);
  const t = G.loadGame();
  assert.equal(t.scene, 'house');
  assert.deepEqual([t.player.x, t.player.y], [s.player.x, s.player.y]);

  const old = JSON.parse(store[G.SAVE_KEY]);
  delete old.scene;
  old.player = { ...G.createGame().player };
  store[G.SAVE_KEY] = JSON.stringify(old);
  assert.equal(G.loadGame().scene, 'farm');
  old.scene = 'nowhere';
  store[G.SAVE_KEY] = JSON.stringify(old);
  assert.equal(G.loadGame().scene, 'farm');
});

test('trong nhà không đặt đồ trang trí ra vườn được', () => {
  const s = newGame();
  s.inv.deco_flower = 1;
  G.enterScene(s, 'house');
  const n = s.farm.ents.length;
  assert.equal(G.placeDeco(s, 'deco_flower').ok, false);
  assert.equal(s.farm.ents.length, n);
  assert.equal(s.inv.deco_flower, 1);
});
