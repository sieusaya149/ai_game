import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../public/state.js';
import { SAVE_VERSION } from '../public/migrate.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const clear = () => { for (const k of Object.keys(store)) delete store[k]; };
const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
// Ghi bản v1 mẫu như thể người chơi vừa thoát game (không chạy bù)
const seedV1 = name => { clear(); const s = fixture(name); s.savedAt = Date.now(); store['nongtrai-save-v1'] = JSON.stringify(s); return s; };
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };

test('mở bản v1 đang chơi dở: chuyển lên bản mới nhất, không mất xu, đồ, cấp, cây, con vật', () => {
  const old = seedV1('v1-mid');
  const s = G.loadGame();
  assert.equal(s.v, SAVE_VERSION);
  assert.equal(s.coins, old.coins);
  assert.equal(s.exp, old.exp);
  assert.deepEqual(s.inv, old.inv);
  assert.equal(s.animals.length, old.animals.length);
  assert.equal(s.eggs.length, old.eggs.length);
  assert.equal(s.poops.length, old.poops.length);
  for (const i of [0, 1, 2]) assert.equal(s.plots[i].crop.progress, old.plots[i].crop.progress);
  assert.equal(s.plots.filter(p => p.unlocked).length, old.plots.filter(p => p.unlocked).length);
});

test('ruộng cũ thành 4 khối 3x3 đúng chỗ; công trình và đồ trang trí giữ vị trí tương đối', () => {
  const old = seedV1('v1-mid');
  const s = G.loadGame(), m = G.mapOf(s);
  assert.equal(m.fields.length, 4);
  // ô 0 ở góc trên-trái ruộng cũ (21,4), ô 35 ở góc dưới-phải (26,9), lệch cùng một khoảng
  const t0 = m.plotTile(0), t35 = m.plotTile(35);
  assert.equal(t35.c - t0.c, 5); assert.equal(t35.r - t0.r, 5);
  const off = { c: t0.c - 21, r: t0.r - 4 };
  const house = m.building('house'), well = m.building('well');
  assert.deepEqual([house.foot.c - off.c, house.foot.r - off.r], [3, 3]);
  assert.deepEqual([well.foot.c - off.c, well.foot.r - off.r], [9, 10]);
  assert.equal(m.decos.length, old.decos.length);
  assert.equal(m.decos[0].kind, 'deco_scarecrow');
  // người chơi và con vật dời theo cùng khoảng lệch
  assert.equal(s.player.x - old.player.x, off.c * 16);
  assert.equal(s.animals[0].y - old.animals[0].y, off.r * 16);
  // vẫn có đủ 3 chuồng cũ
  assert.deepEqual(Object.keys(m.pens).sort(), ['chicken', 'pasture', 'pig']);
});

test('bản v1 vẫn còn nguyên sau khi chuyển; chuyển hai lần cho cùng kết quả', () => {
  seedV1('v1-full');
  const v1Before = store['nongtrai-save-v1'];
  const a = quiet(() => G.loadGame());
  assert.equal(store['nongtrai-save-v1'], v1Before);
  assert.ok(store[G.SAVE_KEY], 'đã ghi bản mới');
  delete store[G.SAVE_KEY]; delete store['nongtrai-migrated']; delete store['nongtrai-migrated-v3'];   // như mở trên máy khác
  const b = quiet(() => G.loadGame());
  for (const s of [a, b]) { delete s.savedAt; s.log = []; }
  assert.deepEqual(a, b);
  assert.equal(a.plots.filter(p => p.unlocked).length, 36);
});

test('chơi lại từ đầu thì không lôi bản v1 cũ lên nữa', () => {
  seedV1('v1-mid');
  assert.ok(G.loadGame());
  G.resetGame();
  assert.equal(G.loadGame(), null);
  assert.ok(store['nongtrai-save-v1'], 'bản v1 vẫn còn');
});

test('đã có bản mới thì đọc bản mới, không chuyển lại từ v1', () => {
  seedV1('v1-fresh');
  const s = G.loadGame();
  s.coins = 777; G.saveGame(s);
  const again = G.loadGame();
  assert.equal(again.coins, 777);
});

test('bản v1 hỏng: không ghi đè, báo lỗi, không treo', () => {
  clear();
  store['nongtrai-save-v1'] = '{"v":1,"plots":"hỏng"';
  assert.equal(G.loadGame(), null);
  assert.match(G.loadProblem(), /.+/);
  assert.equal(store['nongtrai-save-v1'], '{"v":1,"plots":"hỏng"');
  assert.equal(store[G.SAVE_KEY], undefined);
  clear();
  assert.equal(G.loadGame(), null);
  assert.equal(G.loadProblem(), null);   // không có bản lưu thì không phải lỗi
});

test('vườn mới: 1 khối ruộng, đủ công trình, 2 con gà trong chuồng gà, đi được từ cổng vào nhà', () => {
  clear();
  const s = G.createGame({ name: 'Mới' }), m = G.mapOf(s);
  assert.equal(s.v, SAVE_VERSION);
  assert.equal(s.plots.length, 9);
  assert.ok(s.plots.every(p => p.unlocked));
  for (const id of ['house', 'gate', 'well', 'shed', 'board', 'doghouse', 'coop']) assert.ok(m.building(id), id);
  assert.deepEqual(Object.keys(m.pens), ['chicken']);
  const a = m.pens.chicken.area;
  for (const an of s.animals) assert.ok(an.type === 'ga' && an.x >= a.x && an.x <= a.x + a.w && an.y >= a.y && an.y <= a.y + a.h);
  assert.equal(m.owned.w, 24); assert.equal(m.owned.h, 20);
  assert.ok(G.reachable(m, m.building('gate').at, m.building('house').at));
  for (const b of m.buildings) if (b.at) assert.ok(G.reachable(m, m.building('gate').at, b.at), `tới được ${b.id}`);
  assert.equal(G.nextLockedPlot(s), -1);
});

test('vườn chuyển từ v1: đi được từ cổng tới mọi công trình', () => {
  seedV1('v1-mid');
  const s = G.loadGame(), m = G.mapOf(s);
  for (const b of m.buildings) if (b.at) assert.ok(G.reachable(m, m.building('gate').at, b.at), `tới được ${b.id}`);
});
