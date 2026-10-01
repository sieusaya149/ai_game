// Công cụ 3 cấp: vùng tác động theo hướng nhìn, bỏ qua ô không hợp lệ, thể lực giảm giá, sức chứa bình tưới, tiệm rèn Ông Sáu (1 ngày, 1 công cụ), bản lưu cũ.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { DAY_MS, TOOLS, STAMINA, FARMING } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e12; return s; };
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };
const lv = (s, tool, n) => { s.tools[tool].lv = n; };
const grow = (s, i, progress) => {
  const p = s.plots[i]; p.soil = 'tilled'; p.water = 0;
  p.crop = { id: 'cai', progress, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
};
// Ô ruộng mà cả 8 ô xung quanh cũng là ruộng
function center(s) {
  const m = G.mapOf(s);
  for (let i = 0; i < s.plots.length; i++) {
    const t = m.plotTile(i);
    if (t && [-1, 0, 1].every(j => [-1, 0, 1].every(k => m.plotAt(t.c + k, t.r + j) >= 0))) return i;
  }
  throw new Error('không có ô giữa');
}
const at = (s, c, r) => G.mapOf(s).plotAt(c, r);

test('mọi công cụ bắt đầu ở cấp 1, bình tưới chứa 10', () => {
  const s = newGame();
  for (const k of Object.keys(TOOLS)) assert.equal(G.toolLv(s, k), 1);
  assert.equal(G.canMax(s), 10);
  assert.equal(s.smith, null);
});

test('vùng tác động: cấp 1 một ô, cấp 2 hàng 3 ô theo hướng nhìn, cấp 3 là 3×3 tâm ô mục tiêu', () => {
  const s = newGame(), c = center(s), t = G.mapOf(s).plotTile(c);
  assert.deepEqual(G.toolArea(s, 'hoe', c), [c]);
  lv(s, 'hoe', 2);
  const dirs = [[0, 0, 1], [1, -1, 0], [2, 1, 0], [3, 0, -1]];   // dir → bước (c, r)
  for (const [dir, dc, dr] of dirs) {
    s.player.dir = dir;
    const row = G.toolArea(s, 'hoe', c).sort((a, b) => a - b);
    const want = [0, 1, 2].map(i => at(s, t.c + dc * i, t.r + dr * i)).filter(i => i >= 0).sort((a, b) => a - b);
    assert.deepEqual(row, want, `hướng ${dir}`);
    assert.equal(G.toolArea(s, 'hoe', c)[0], c, 'mục tiêu đứng đầu');
  }
  lv(s, 'hoe', 3);
  assert.equal(G.toolArea(s, 'hoe', c).length, 9);
  assert.equal(new Set(G.toolArea(s, 'hoe', c)).size, 9);
});

test('ô không hợp lệ hoặc ô ngoài ruộng thì bỏ qua, không lỗi', () => {
  const s = newGame(), c = center(s), t = G.mapOf(s).plotTile(c);
  lv(s, 'hoe', 3);
  grow(s, at(s, t.c + 1, t.r), 0.2);   // đã gieo: không cuốc nữa
  s.plots[at(s, t.c, t.r + 1)].soil = 'tilled';   // đã cuốc
  assert.equal(G.toolArea(s, 'hoe', c).length, 7);
  s.plots[at(s, t.c - 1, t.r)].unlocked = false;   // ô chưa mở
  assert.equal(G.toolArea(s, 'hoe', c).length, 6);
  assert.deepEqual(G.toolArea(s, 'hoe', 9999), []);   // không phải ruộng
  assert.deepEqual(G.toolArea(s, 'hoe', c, 'nope'), []);
});

test('cấp 2 ở rìa ruộng: hàng ra ngoài ruộng chỉ lấy phần có đất', () => {
  const s = newGame(); lv(s, 'hoe', 2);
  const m = G.mapOf(s);
  s.player.dir = 2;
  for (let i = 0; i < s.plots.length; i++) {
    const t = m.plotTile(i);
    if (t && m.plotAt(t.c + 1, t.r) < 0) { assert.deepEqual(G.toolArea(s, 'hoe', i), [i]); return; }
  }
  assert.fail('không thấy ô ở rìa');
});

test('actionsFor trả danh sách ô; cuốc 3×3 làm cả chín ô một lần', () => {
  const s = newGame(), c = center(s); lv(s, 'hoe', 3);
  const a = G.actionsFor(s, { kind: 'plot', idx: c })[0];
  assert.equal(a.id, 'till');
  assert.equal(a.tiles.length, 9);
  assert.match(a.label, /9 ô/);
  const r = G.perform(s, { kind: 'plot', idx: c }, 'till');
  assert.ok(r.ok);
  for (const i of a.tiles) assert.equal(s.plots[i].soil, 'tilled');
});

test('làm nhiều ô tốn thể lực ít hơn từng ô: cuốc 3×3 tốn 5 thay vì 9', () => {
  const s = newGame(), c = center(s);
  lv(s, 'hoe', 3);
  const before = s.stamina;
  G.perform(s, { kind: 'plot', idx: c }, 'till');
  assert.equal(before - s.stamina, 5);
  const s2 = newGame(); lv(s2, 'hoe', 2); s2.player.dir = 2;
  const c2 = center(s2), b2 = s2.stamina;
  G.perform(s2, { kind: 'plot', idx: c2 }, 'till');
  assert.equal(b2 - s2.stamina, 2);   // hàng 3 ô tốn 2
  const s3 = newGame(), b3 = s3.stamina;
  G.perform(s3, { kind: 'plot', idx: 0 }, 'till');
  assert.equal(b3 - s3.stamina, STAMINA.cost.till);
});

test('liềm thu hoạch nhiều ô chín, bỏ qua ô chưa chín; cả hàng chỉ trừ 1 lần thể lực giảm giá', () => {
  const s = newGame(), c = center(s), t = G.mapOf(s).plotTile(c); lv(s, 'sickle', 3);
  const near = [[0, 0], [1, 0], [0, 1]].map(([dc, dr]) => at(s, t.c + dc, t.r + dr));
  grow(s, near[0], 1); grow(s, near[1], 1); grow(s, near[2], 0.3);
  const a = G.actionsFor(s, { kind: 'plot', idx: c })[0];
  assert.equal(a.id, 'harvest');
  assert.deepEqual([...a.tiles].sort((x, y) => x - y), [near[0], near[1]].sort((x, y) => x - y));
  const before = s.stamina, r = quiet(() => G.perform(s, { kind: 'plot', idx: c }, 'harvest'));
  assert.ok(r.ok);
  assert.equal(before - s.stamina, 2);
  assert.equal(s.plots[near[0]].crop, null);
  assert.equal(s.plots[near[1]].crop, null);
  assert.ok(s.plots[near[2]].crop);
});

test('bình tưới: sức chứa 10 / 20 / 40 và vùng tưới theo cấp, mỗi ô tưới tốn 1 nước', () => {
  const s = newGame();
  assert.deepEqual([1, 2, 3].map(n => { lv(s, 'can', n); return G.canMax(s); }), [10, 20, 40]);
  const c = center(s), m = G.mapOf(s), t = m.plotTile(c);
  for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) grow(s, at(s, t.c + k, t.r + j), 0.2);
  lv(s, 'can', 3); s.can = 40;
  const a = G.actionsFor(s, { kind: 'plot', idx: c })[0];
  assert.equal(a.id, 'water');
  assert.equal(a.tiles.length, 9);
  quiet(() => G.perform(s, { kind: 'plot', idx: c }, 'water'));
  assert.equal(s.can, 31);
  assert.ok(a.tiles.every(i => s.plots[i].water === 100));
  // nước ít hơn số ô: chỉ tưới được bấy nhiêu ô
  for (const i of a.tiles) s.plots[i].water = 0;
  s.can = 4;
  assert.equal(G.actionsFor(s, { kind: 'plot', idx: c })[0].tiles.length, 4);
  // giếng múc đầy theo sức chứa của cấp
  const well = G.actionsFor(s, { kind: 'building', id: 'well' })[0];
  assert.equal(well.id, 'refill');
  G.perform(s, { kind: 'building', id: 'well' }, 'refill');
  assert.equal(s.can, 40);
});

test('nâng cấp mất xu và 1 ngày game; trong lúc đó công cụ không dùng được, xong thì có thông báo', () => {
  const s = newGame(); s.coins = 1000;
  const cost = G.upgradeCost(s, 'hoe');
  const r = G.startUpgrade(s, 'hoe');
  assert.ok(r.ok);
  assert.equal(s.coins, 1000 - cost);
  assert.equal(s.smith.tool, 'hoe');
  assert.equal(s.smith.doneAt, s.time + DAY_MS);
  assert.ok(G.toolAway(s, 'hoe'));
  const till = G.actionsFor(s, { kind: 'plot', idx: 0 })[0];
  assert.equal(till.id, 'till');
  assert.match(till.disabled, /lò rèn/);
  assert.equal(G.perform(s, { kind: 'plot', idx: 0 }, 'till').ok, false);
  assert.equal(s.plots[0].soil, 'untilled');
  // công cụ khác vẫn dùng bình thường
  assert.equal(G.actionsFor(s, { kind: 'building', id: 'well' })[0].disabled, 'Bình đầy rồi');
  const ev1 = G.tick(s, DAY_MS - 1000);
  assert.equal(G.toolLv(s, 'hoe'), 1);
  assert.ok(!ev1.some(e => /rèn xong/.test(e.text ?? '')));
  const ev2 = quiet(() => G.tick(s, 2000));
  assert.equal(G.toolLv(s, 'hoe'), 2);
  assert.equal(s.smith, null);
  assert.ok(ev2.some(e => e.type === 'toast' && /rèn xong cuốc đồng/.test(e.text)));
  assert.equal(G.perform(s, { kind: 'plot', idx: 0 }, 'till').ok, true);
});

test('bình tưới đang nâng cấp thì không tưới và không múc nước được', () => {
  const s = newGame(); s.coins = 1000;
  grow(s, 0, 0.2);
  G.startUpgrade(s, 'can');
  const w = G.actionsFor(s, { kind: 'plot', idx: 0 }).find(a => a.id === 'water');
  assert.match(w.disabled, /lò rèn/);
  s.can = 3;
  assert.match(G.actionsFor(s, { kind: 'building', id: 'well' })[0].disabled, /lò rèn/);
  assert.equal(s.can, 3, 'số nước giữ nguyên');
});

test('mỗi lúc chỉ nâng được 1 công cụ; đủ xu, cấp tối đa', () => {
  const s = newGame(); s.coins = 100000;
  assert.ok(G.startUpgrade(s, 'hoe').ok);
  const coins = s.coins, r = G.startUpgrade(s, 'can');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'busy');
  assert.equal(s.coins, coins);
  G.tick(s, DAY_MS + 1000);
  assert.ok(G.startUpgrade(s, 'hoe').ok);   // lên cấp 3
  G.tick(s, DAY_MS + 1000);
  assert.equal(G.toolLv(s, 'hoe'), 3);
  assert.equal(G.startUpgrade(s, 'hoe').reason, 'max');
  s.coins = 0;
  assert.equal(G.startUpgrade(s, 'sickle').reason, 'coins');
});

test('bản lưu cũ không có công cụ: mọi công cụ cấp 1, bình tưới giữ số nước', () => {
  const s = newGame();
  s.can = 7;
  delete s.tools; delete s.smith;
  G.saveGame(s);
  const l = G.loadGame();
  for (const k of Object.keys(TOOLS)) assert.equal(G.toolLv(l, k), 1);
  assert.equal(l.can, 7);
  assert.equal(l.smith, null);
  assert.equal(FARMING.canMax, 10);
});

test('đang rèn mà đóng game, mở lại sau hơn 1 ngày thì chạy bù xong', () => {
  const s = newGame(); s.coins = 1000;
  G.startUpgrade(s, 'hoe');
  G.saveGame(s);
  const saved = JSON.parse(store['nongtrai-save-v2']);
  saved.savedAt = Date.now() - 8 * 60 * 60 * 1000;
  saved.smith.doneAt = saved.time + 60_000;   // gần xong lúc đóng game
  store['nongtrai-save-v2'] = JSON.stringify(saved);
  const l = G.loadGame();
  assert.equal(G.toolLv(l, 'hoe'), 2);
  assert.equal(l.smith, null);
});

test('chạm tiệm rèn trong làng mở bảng tiệm rèn', () => {
  const s = newGame(); G.enterScene(s, 'village');
  const a = G.actionsFor(s, { kind: 'building', id: 'smithy' })[0];
  assert.equal(a.id, 'open');
  assert.equal(G.perform(s, { kind: 'building', id: 'smithy' }, 'open').open, 'smithy');
});
