// Seam 1: thông báo, Việc cần làm cho cây và nước (issue 62): sự kiện 🟡 mới có mức + khóa gộp + loại tắt được,
// việc "bồn cạn" và "hố ủ xong" kèm vị trí, báo bồn sắp cạn và hết xu trả điện đúng một lần.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { EVENT_LEVEL, NOTIFY_CATS, TANK, COMPOST, DAY_MS } from '../public/data.js';
import { todoList } from '../public/todo.js';
import { eventMeta, createNotifier, arrowTargets } from '../public/notify.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const SEC = 1000;
const rnd = Math.random;
const quiet = fn => { Math.random = () => 0.99; try { return fn(); } finally { Math.random = rnd; } };
const run = (s, ms) => { const out = []; for (let t = 0; t < ms; t += 5 * SEC) out.push(...quiet(() => G.tick(s, Math.min(5 * SEC, ms - t)))); return out; };

const ent = (s, kind) => s.farm.ents.find(e => e.kind === kind);
const gap = (a, b) => Math.max(0, a.c - (b.c + b.w - 1), b.c - (a.c + a.w - 1), a.r - (b.r + b.h - 1), b.r - (a.r + a.h - 1));
function spot(s, what, ok) {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if ((!ok || ok(c, r)) && G.canPlace(s, what, c, r).ok) return { c, r };
  throw new Error('không còn chỗ trống');
}
// Vườn có giếng cấp 4, bồn chứa sát giếng với `level` lần nước; không đơn hàng, trời nhiều mây
function withTank(level = 0) {
  const s = G.createGame({ name: 'Hùng', look: {} });
  Object.assign(s, { orders: [], nextOrderAt: 1e12, coins: 1e6, tutorial: 99, weather: 'cloud', exp: 2000 });
  const well = ent(s, 'well');
  well.lv = 4;
  const w = G.footprint(well), p = spot(s, { kind: 'tank' }, (c, r) => gap({ c, r, w: 2, h: 2 }, w) <= 2);
  assert.ok(G.placeEntity(s, { kind: 'tank' }, p.c, p.r).ok);
  s.water.level = level;
  return s;
}

const NEW = ['tankLow', 'billCut', 'mastery', 'giant', 'compost'];

test('sự kiện 🟡 mới đều có mức quan trọng, khóa gộp và một loại riêng tắt được trong cài đặt; 🔴 không có loại để tắt', () => {
  const cats = new Set();
  for (const t of NEW) {
    const m = eventMeta({ type: t, crop: 'cai', lv: 2, level: 5, bill: 30, qty: 3 });
    assert.equal(m.level, 'important', t);
    assert.ok(m.group, t);
    assert.ok(m.cat in NOTIFY_CATS, `${t}: loại tắt được`);
    cats.add(m.cat);
  }
  assert.equal(cats.size, 4, 'thành thạo, khổng lồ, nước, hố ủ mỗi thứ một công tắc');
  for (const [t, e] of Object.entries(EVENT_LEVEL)) if (e.level === 'urgent') assert.ok(!e.cat, `${t}: báo gấp không tắt được`);
  // tắt loại nào thì toast loại đó biến mất, loại khác vẫn hiện
  const s = withTank(0), shown = [];
  const push = createNotifier({ show: (id, text) => shown.push(text), on: c => G.notifyOn(s, c) });
  G.setNotify(s, 'mastery', false);
  assert.equal(push({ type: 'mastery', crop: 'cai', lv: 2 }, 0), false);
  assert.equal(push({ type: 'giant', crop: 'cai' }, 0), true);
  assert.equal(push({ type: 'tankLow', level: 3 }, 0), true);
  assert.deepEqual(shown.length, 2);
});

test('todoList: bồn dưới ngưỡng thì có việc "bồn cạn" kèm chỗ tới (building tank); đủ nước thì không', () => {
  const s = withTank(TANK.low - 1);
  const it = todoList(s).find(i => i.kind === 'tank');
  assert.ok(it, 'có việc bồn cạn');
  assert.equal(it.level, 'normal');
  assert.deepEqual(it.target, { kind: 'building', id: 'tank' });
  const at = G.mapOf(s).building('tank').at;
  assert.deepEqual([it.x, it.y], [at.x, at.y]);
  assert.deepEqual(it.spots.map(p => [p.x, p.y]), [[at.x, at.y]]);
  assert.deepEqual(arrowTargets(s, [it]).map(p => [p.x, p.y]), [[at.x, at.y]], 'mũi tên đọc cùng chỗ');
  s.water.level = TANK.low;
  assert.equal(todoList(s).some(i => i.kind === 'tank'), false);
  const bare = G.createGame({ name: 'x' });
  assert.equal(todoList(bare).some(i => i.kind === 'tank'), false, 'chưa có bồn thì không có việc');
});

test('todoList: hố ủ có phân lấy được thì có việc "hố ủ xong" kèm chỗ tới; đang đầy hay đang ủ thì chưa', () => {
  const s = withTank(100);
  const t = spot(s, { kind: 'compost' });
  assert.ok(G.placeEntity(s, { kind: 'compost' }, t.c, t.r).ok);
  const has = () => todoList(s).find(i => i.kind === 'compost');
  assert.equal(has(), undefined);
  s.inv.manure = 6;
  assert.ok(G.compostAdd(s, 'manure', 6).ok);
  assert.equal(has(), undefined, 'đang bỏ đồ');
  assert.ok(G.compostStart(s).ok);
  assert.equal(has(), undefined, 'đang ủ');
  run(s, COMPOST.ms);
  const it = has();
  assert.ok(it, 'xong rồi');
  assert.deepEqual(it.target, { kind: 'building', id: 'compost' });
  const at = G.mapOf(s).building('compost').at;
  assert.deepEqual([it.x, it.y], [at.x, at.y]);
  assert.ok(G.compostTake(s).ok);
  assert.equal(has(), undefined, 'lấy rồi thì hết việc');
});

test('bồn tụt dưới ngưỡng: báo "sắp cạn" đúng một lần (không lặp mỗi tick, bồn mới xây còn trống không báo)', () => {
  const s = withTank(0);
  assert.equal(run(s, 30 * SEC).filter(e => e.type === 'tankLow').length, 0, 'bồn trống từ đầu');
  // một khối ruộng có tưới nhỏ giọt rút bồn từ trên ngưỡng xuống dưới
  const f = ent(s, 'field');
  f.up.drip = true;
  for (const i of f.plots) Object.assign(s.plots[i], { unlocked: true, soil: 'tilled', water: 0, weeds: false, crop: { id: 'cai', progress: 0.1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } } });
  assert.ok(G.waterOn(s, f), 'khối ruộng trong tầm nước');
  s.water.level = TANK.low + 4;
  const evs = run(s, 20 * SEC).filter(e => e.type === 'tankLow');
  assert.equal(evs.length, 1);
  assert.ok(evs[0].level < TANK.low);
  assert.match(EVENT_LEVEL.tankLow.text(1, evs[0]), /sắp cạn/);
});

test('hết xu trả tiền điện làm máy ngừng: đúng một thông báo gộp, không lặp mỗi tick', () => {
  const s = withTank(50);
  s.water.power = 500;   // điện đã dùng chưa tính tiền
  s.coins = 1;
  s.time = DAY_MS - 5 * SEC;   // sắp 6h sáng
  const evs = run(s, 2 * 60 * SEC).filter(e => e.type === 'billCut');
  assert.equal(evs.length, 1);
  assert.ok(G.powerInfo(s).bill > 1, 'có hóa đơn treo');
  assert.equal(EVENT_LEVEL.billCut.group(evs[0]), EVENT_LEVEL.billCut.group({ type: 'billCut', bill: '9' }));
  assert.match(EVENT_LEVEL.billCut.text(1, evs[0]), /tiền điện/);
  assert.equal(run(s, 5 * 60 * SEC).filter(e => e.type === 'billCut').length, 0, 'ngừng rồi thì không báo lại');
});
