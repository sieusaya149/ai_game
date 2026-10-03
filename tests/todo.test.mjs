// Việc cần làm: hàm thuần todoList(s) liệt kê việc trong vườn theo loại, mức, số lượng và chỗ gần người chơi nhất.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { penIdOf } from './helpers/troughs.mjs';
import { todoList } from '../public/todo.js';
import { arrowTargets } from '../public/notify.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e12; s.animals = []; return s; };
const crop = (s, i, o = {}) => { Object.assign(s.plots[i], { soil: 'tilled', water: 100, crop: { id: 'cai', progress: 0.3, bugs: false, sick: false, dead: false, rotten: false, ...o } }); };
const kinds = s => todoList(s).map(i => i.kind);
const get = (s, kind) => todoList(s).find(i => i.kind === kind);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('vườn mới không có việc gì', () => {
  assert.deepEqual(todoList(newGame()), []);
});

test('ô khô, sâu, cỏ, chín: đúng số lượng, mức thường, nhãn tiếng Việt', () => {
  const s = newGame();
  for (const i of [0, 1, 2]) crop(s, i, {}), s.plots[i].water = 5;
  crop(s, 3, { bugs: true });
  crop(s, 4); s.plots[4].weeds = true;
  s.plots[5].weeds = true;                       // ô trống mọc cỏ cũng tính
  crop(s, 6, { progress: 1 }); crop(s, 7, { progress: 1 });
  crop(s, 8, { progress: 1, rotten: true });     // héo: không phải "chín"
  const dry = get(s, 'dry'), bugs = get(s, 'bugs'), weeds = get(s, 'weeds'), ripe = get(s, 'ripe');
  assert.deepEqual([dry.count, bugs.count, weeds.count, ripe.count], [3, 1, 2, 2]);
  assert.equal(dry.label, '💧 3 ô khô');
  assert.equal(ripe.label, '🌾 2 ô chín');
  for (const i of [dry, bugs, weeds, ripe]) { assert.equal(i.level, 'normal'); assert.equal(i.scene, 'farm'); }
  assert.equal(todoList(s).length, 4);
});

test('ô đã chín không tính là khô; ô chưa trồng gì không tính là khô', () => {
  const s = newGame();
  crop(s, 0, { progress: 1 }); s.plots[0].water = 0;
  s.plots[1].water = 0;
  assert.deepEqual(kinds(s), ['ripe']);
});

test('con vật bệnh là gấp, con vật đói là thường; mỗi loại ghi số lượng', () => {
  const s = newGame();
  const mk = (o) => ({ id: s.nextId++, type: 'ga', stage: 'truong', hunger: 100, happy: 60, sick: false, x: 100, y: 100, ...o });
  s.animals.push(mk({ sick: 2 }), mk({ sick: 2, hunger: 0 }), mk({ hunger: 10 }), mk({ hunger: 80 }));
  const sick = get(s, 'sick'), hungry = get(s, 'hungry');
  assert.equal(sick.level, 'urgent'); assert.equal(sick.count, 2);
  assert.equal(hungry.level, 'normal'); assert.equal(hungry.count, 1, 'con bệnh đã tính ở dòng bệnh');
});

test('con dơ, con lạc, chuồng bẩn: đúng số lượng, nhãn tiếng Việt có số', () => {
  const s = newGame();
  s.animals.push(
    { id: s.nextId++, type: 'ga', stage: 'truong', hunger: 100, happy: 60, sick: false, dirty: 90, x: 1, y: 1, pen: 'p1' },
    { id: s.nextId++, type: 'ga', stage: 'non', hunger: 100, happy: 60, sick: false, dirty: 0, stray: true, tile: { c: 3, r: 3 }, x: 50, y: 50, pen: 'p1' },
    { id: s.nextId++, type: 'ga', stage: 'non', hunger: 100, happy: 60, sick: false, dirty: 0, stray: true, tile: { c: 5, r: 5 }, x: 90, y: 90, pen: 'p1' },
  );
  s.manure.chicken = 100;
  const dirty = get(s, 'dirty'), stray = get(s, 'stray'), muck = get(s, 'muck');
  assert.equal(dirty.count, 1); assert.equal(dirty.label, '🧼 1 con vật dơ'); assert.equal(dirty.level, 'normal');
  assert.equal(stray.count, 2); assert.equal(stray.label, '💤 2 con lạc ngủ ngoài'); assert.equal(stray.level, 'normal');
  assert.equal(muck.count, 1); assert.equal(muck.label, '💩 1 chuồng bẩn'); assert.equal(muck.level, 'normal');
});

test('trứng dưới đất, phân chó, máng hết cám', () => {
  const s = newGame();
  s.eggs.push({ id: 90, x: 10, y: 10, laidAt: 0 }, { id: 91, x: 20, y: 10, laidAt: 0 });
  s.poops.push({ id: 92, x: 30, y: 30, at: 0 });
  assert.equal(get(s, 'egg').count, 2);
  assert.equal(get(s, 'poop').count, 1);
  assert.equal(get(s, 'trough'), undefined, 'chuồng chưa có con nào thì máng trống không tính');
  s.animals.push({ id: s.nextId++, type: 'ga', stage: 'truong', hunger: 100, happy: 60, sick: false, x: 1, y: 1 });
  const tr = get(s, 'trough');
  assert.equal(tr.count, 1); assert.equal(tr.level, 'normal');
  s.troughs[penIdOf(G, s, 'chicken')] = 5;
  assert.equal(get(s, 'trough'), undefined);
});

test('quạ và trộm đang ăn cây là gấp; mới bay tới thì chưa tính', () => {
  const s = newGame();
  crop(s, 0, { progress: 1 }); crop(s, 1, { progress: 1 });
  s.threats = [{ id: 7, kind: 'crow', plot: 0, x: 0, y: 0, state: 'coming' }, { id: 8, kind: 'thief', plot: 1, x: 0, y: 0, state: 'eating' }];
  assert.equal(get(s, 'crow'), undefined);
  assert.equal(get(s, 'thief').level, 'urgent');
  s.threats[0].state = 'eating';
  assert.equal(get(s, 'crow').count, 1);
});

test('xếp theo mức gấp rồi số lượng', () => {
  const s = newGame();
  for (const i of [0, 1, 2, 3]) crop(s, i, { progress: 1 });                    // 4 ô chín
  crop(s, 4); s.plots[4].water = 0;                                              // 1 ô khô
  s.animals.push({ id: s.nextId++, type: 'ga', stage: 'truong', hunger: 100, happy: 60, sick: 2, x: 1, y: 1 });
  assert.deepEqual(kinds(s), ['sick', 'ripe', 'dry', 'trough']);   // máng gà trống cũng là 1 việc thường
});

test('vị trí là chỗ gần người chơi nhất; spots xếp từ gần tới xa', () => {
  const s = newGame(), m = G.mapOf(s);
  for (const i of [0, 1, 2]) { crop(s, i); s.plots[i].water = 0; }
  const far = [0, 1, 2].map(i => m.plotCenter(i));
  Object.assign(s.player, { x: far[2].x, y: far[2].y });
  let d = get(s, 'dry');
  assert.deepEqual([d.x, d.y], [far[2].x, far[2].y]);
  assert.deepEqual(d.target, { kind: 'plot', idx: 2 });
  Object.assign(s.player, { x: far[0].x, y: far[0].y });
  d = get(s, 'dry');
  assert.deepEqual(d.target, { kind: 'plot', idx: 0 });
  const ds = d.spots.map(p => dist(p, s.player));
  assert.deepEqual(ds, [...ds].sort((a, b) => a - b));
  assert.equal(d.spots.length, 3);
});

test('đứng ở bản đồ khác: vị trí tính từ chỗ đứng khi về vườn', () => {
  const s = newGame(), m = G.mapOf(s);
  for (const i of [0, 1, 2]) { crop(s, i); s.plots[i].water = 0; }
  G.enterScene(s, 'village');
  const home = m.arrive.village ?? m.spawn, d = get(s, 'dry');
  assert.equal(d.scene, 'farm');
  const best = [0, 1, 2].map(i => m.plotCenter(i)).sort((a, b) => dist(a, home) - dist(b, home))[0];
  assert.deepEqual([d.x, d.y], [best.x, best.y]);
});

test('mũi tên chỉ hướng lấy chỗ từ danh sách việc gấp', () => {
  const s = newGame();
  crop(s, 0, { progress: 1 });
  s.threats = [{ id: 7, kind: 'crow', plot: 0, x: 0, y: 0, state: 'eating' }];
  s.animals.push({ id: 5, type: 'ga', stage: 'truong', hunger: 100, happy: 60, sick: 2, x: 40, y: 50 });
  const urgent = todoList(s).filter(i => i.level === 'urgent');
  const t = arrowTargets(s, urgent), c = G.mapOf(s).plotCenter(0);
  assert.equal(t.length, 2);
  assert.ok(t.some(p => p.x === 40 && p.y === 50));
  assert.ok(t.some(p => p.x === c.x && p.y === c.y));
});

test('trứng trong bụi tách khỏi trứng dưới đất, mỗi loại một dòng có số', () => {
  const s = newGame();
  s.eggs.push({ id: s.nextId++, sp: 'ga', x: 40, y: 40, laidAt: 0 }, { id: s.nextId++, sp: 'ga', x: 60, y: 60, laidAt: 0, tile: { c: 3, r: 3 } }, { id: s.nextId++, sp: 'ga', x: 80, y: 80, laidAt: 0, tile: { c: 5, r: 5 } });
  const egg = get(s, 'egg'), bush = get(s, 'bushEgg');
  assert.equal(egg.count, 1); assert.equal(egg.label, '🥚 1 trứng dưới đất');
  assert.equal(bush.count, 2); assert.equal(bush.label, '🌿 2 trứng trong bụi'); assert.equal(bush.level, 'normal');
});
