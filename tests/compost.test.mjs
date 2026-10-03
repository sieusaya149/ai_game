// Seam 1: hố ủ phân (issue 61), qua API công khai của state.js. Cây héo, cây chết (dọn ô thì được), phân chuồng, phân chó
// bỏ vào hố; đậy hố thì ủ theo lô, sau COMPOST.ms giờ vườn lấy ra phân bón; hố chạy theo giờ vườn (simMs) nên đóng băng thì đứng yên.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { COMPOST, BUILD_PRICES, DAY_MS, MAX_CATCHUP_MS, starKey } from '../public/data.js';
import { setClock } from '../public/clock.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const SEC = 1000, MIN = 60_000;
const rnd = Math.random;
const quiet = fn => { Math.random = () => 0.99; try { return fn(); } finally { Math.random = rnd; } };   // không sâu, không cỏ, không mưa
const P = idx => ({ kind: 'plot', idx });
const PIT = { kind: 'building', id: 'compost' };

const freeTile = (s, what) => {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (G.canPlace(s, what, c, r).ok) return { c, r };
  throw new Error('không còn chỗ trống');
};
// Vườn đủ cấp, nhiều xu, không đơn hàng, đã xây hố ủ phân; trời nhiều mây
function farm() {
  const s = G.createGame({ name: 'Ủ' });
  Object.assign(s, { tutorial: 99, weather: 'cloud', coins: 1e4, exp: 2000, orders: [], nextOrderAt: 1e15 });
  s.inv.fertilizer = 0;
  const t = freeTile(s, { kind: 'compost' });
  const r = G.placeEntity(s, { kind: 'compost' }, t.c, t.r);
  assert.equal(r.ok, true, r.msg);
  return s;
}
const pit = s => s.farm.ents.find(e => e.kind === 'compost');
const plots = s => s.plots.filter(p => p.unlocked).map(p => p.idx);
const crop = (id, extra) => ({ id, progress: 0.5, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false }, ...extra });
// chạy tick nhiều bước (giờ vườn)
const run = (s, ms) => { for (let t = 0; t < ms; t += 5 * SEC) quiet(() => G.tick(s, Math.min(5 * SEC, ms - t))); };

test('xây hố ủ trong chế độ xây dựng: trừ đúng giá, hố mới rỗng', () => {
  const s = G.createGame({ name: 'Ủ' });
  Object.assign(s, { coins: 1e4, exp: 2000 });
  const t = freeTile(s, { kind: 'compost' });
  assert.equal(G.placeEntity(s, { kind: 'compost' }, t.c, t.r).ok, true);
  assert.equal(1e4 - s.coins, BUILD_PRICES.compost);
  assert.deepEqual(G.compostInfo(s), { state: 'empty', n: 0, cap: COMPOST.cap, out: 0, left: 0, pile: {} });
});

test('dọn ô cây chết, cây héo thì được món tương ứng; cùng phân chuồng, phân chó bỏ được vào hố', () => {
  const s = farm(), [a, b] = plots(s);
  Object.assign(s.plots[a], { soil: 'tilled', crop: crop('cai', { dead: true }) });
  Object.assign(s.plots[b], { soil: 'tilled', crop: crop('cai', { progress: 2, rotten: true }) });
  assert.equal(G.perform(s, P(a), 'clear').ok, true);
  assert.equal(G.perform(s, P(b), 'clear').ok, true);
  assert.equal(G.haveItem(s, 'cay_chet'), 1);
  assert.equal(G.haveItem(s, 'cay_heo'), 1);
  s.inv.manure = 2; s.inv.phan_cho = 1;
  for (const k of ['cay_chet', 'cay_heo', 'manure', 'phan_cho']) {
    const r = G.compostAdd(s, k, 1);
    assert.equal(r.ok, true, `${k}: ${r.msg}`);
  }
  assert.deepEqual(G.compostInfo(s).pile, { cay_chet: 1, cay_heo: 1, manure: 1, phan_cho: 1 });
  assert.equal(G.compostInfo(s).state, 'filling');
  assert.equal(G.haveItem(s, 'cay_chet') + G.haveItem(s, 'cay_heo') + G.haveItem(s, 'phan_cho'), 0);
  assert.equal(G.haveItem(s, 'manure'), 1);
});

test('xúc phân chó: không được phân bón thì được 1 phân chó', () => {
  const s = farm();
  s.poops = [{ id: 900, x: 400, y: 300, at: 0 }];
  quiet(() => G.perform(s, { kind: 'poop', id: 900 }, 'scoop'));
  assert.equal(G.haveItem(s, 'phan_cho'), 1);
});

test('bỏ đồ không hợp lệ (nông sản chín, phân bón) bị từ chối; quá sức chứa bị từ chối, không mất gì', () => {
  const s = farm();
  s.inv.cai = 3; s.inv.fertilizer = 2; s.inv.manure = COMPOST.cap + 1;
  for (const k of ['cai', starKey('cai', 3), 'fertilizer']) {
    s.inv[k] ??= 1;
    const r = G.compostAdd(s, k, 1);
    assert.equal(r.ok, false); assert.equal(r.reason, 'invalid');
  }
  assert.equal(G.compostAdd(s, 'manure', COMPOST.cap + 1).reason, 'full');
  assert.equal(G.haveItem(s, 'manure'), COMPOST.cap + 1);
  assert.equal(G.compostAdd(s, 'manure', COMPOST.cap - 1).ok, true);
  assert.equal(G.compostAdd(s, 'manure', 2).reason, 'full');
  assert.equal(G.compostAdd(s, 'manure', 1).ok, true);
  assert.equal(G.compostAdd(s, 'manure', 1).reason, 'full');
  assert.equal(G.compostInfo(s).n, COMPOST.cap);
  assert.equal(G.haveItem(s, 'manure'), 1);
  // không có đồ thì cũng không bỏ được
  assert.equal(G.compostAdd(farm(), 'manure', 1).reason, 'no_item');
});

test('bỏ hết: mọi đầu vào hợp lệ trong túi tới khi đầy hố, đồ khác giữ nguyên', () => {
  const s = farm();
  Object.assign(s.inv, { manure: 8, phan_cho: 3, cay_chet: 4, cai: 5 });
  const r = G.compostAdd(s);
  assert.equal(r.ok, true); assert.equal(r.moved, COMPOST.cap);
  assert.equal(G.compostInfo(s).n, COMPOST.cap);
  assert.equal(G.haveItem(s, 'cai'), 5);
  assert.equal(G.haveItem(s, 'manure') + G.haveItem(s, 'phan_cho') + G.haveItem(s, 'cay_chet'), 15 - COMPOST.cap);
});

test('ủ đúng COMPOST.ms giờ vườn thì lấy ra đúng lượng phân bón; chưa đủ thì chưa lấy được; đang ủ không bỏ thêm được', () => {
  const s = farm();
  s.inv.manure = 7;
  assert.equal(G.compostAdd(s, 'manure', 7).ok, true);
  const r = G.compostStart(s);
  assert.equal(r.ok, true, r.msg);
  // 7 món, mỗi COMPOST.per món ra 1 phân bón: món lẻ trả lại túi
  const out = Math.floor(7 / COMPOST.per);
  assert.equal(G.haveItem(s, 'manure'), 7 - out * COMPOST.per);
  assert.deepEqual({ state: G.compostInfo(s).state, n: G.compostInfo(s).n, out: G.compostInfo(s).out, left: G.compostInfo(s).left },
    { state: 'composting', n: out * COMPOST.per, out, left: COMPOST.ms });
  s.inv.manure = 1;
  assert.equal(G.compostAdd(s, 'manure', 1).reason, 'busy');
  assert.equal(G.compostTake(s).reason, 'not_ready');
  run(s, COMPOST.ms - MIN);
  assert.equal(G.compostInfo(s).left, MIN);
  assert.equal(G.compostTake(s).reason, 'not_ready');
  run(s, MIN);
  assert.equal(G.compostInfo(s).state, 'ready');
  const t = G.compostTake(s);
  assert.equal(t.ok, true); assert.equal(t.qty, out);
  assert.equal(G.haveItem(s, 'fertilizer'), out);
  assert.deepEqual(G.compostInfo(s), { state: 'empty', n: 0, cap: COMPOST.cap, out: 0, left: 0, pile: {} });
});

test('chưa đủ món cho một bao phân bón thì chưa đậy hố được', () => {
  const s = farm();
  s.inv.manure = COMPOST.cap;
  assert.equal(G.compostStart(s).reason, 'empty');
  G.compostAdd(s, 'manure', COMPOST.per - 1);
  assert.equal(G.compostStart(s).reason, 'too_few');
  assert.equal(G.compostInfo(s).state, 'filling');
});

test('hố xong lúc vườn chạy thì có event compost (gộp theo hố)', () => {
  const s = farm();
  s.inv.manure = 4; G.compostAdd(s); G.compostStart(s);
  const evs = [];
  for (let t = 0; t < COMPOST.ms + 10 * SEC; t += 5 * SEC) evs.push(...quiet(() => G.tick(s, 5 * SEC)));
  assert.deepEqual(evs.filter(e => e.type === 'compost'), [{ type: 'compost', qty: 2 }]);
});

test('hố xong lúc vắng nhà (chạy bù) thì màn "Trong lúc bạn vắng nhà" có dòng hố ủ', () => {
  const T = Date.parse('2026-10-03T08:00:00Z');
  setClock(() => T);
  try {
    const s = farm();
    s.inv.manure = 4; G.compostAdd(s); G.compostStart(s);
    s.savedAt = T - COMPOST.ms - 5 * MIN;
    const back = quiet(() => G.loadGame(JSON.parse(JSON.stringify(s))));
    assert.equal(G.compostInfo(back).state, 'ready');
    assert.ok(back.away.lines.some(l => /Hố ủ phân đã xong/.test(l)), back.away.lines.join(' | '));
  } finally { setClock(); }
});

test('hành động ở hố ủ: bỏ đồ, đậy hố, chờ, lấy phân bón', () => {
  const s = farm();
  assert.equal(G.actionsFor(s, PIT)[0].id, 'compostAdd');
  assert.ok(G.actionsFor(s, PIT)[0].disabled, 'chưa có gì để bỏ');
  s.inv.manure = 3;
  assert.equal(G.perform(s, PIT, 'compostAdd').ok, true);
  assert.equal(G.actionsFor(s, PIT)[0].id, 'compostStart');
  assert.equal(G.perform(s, PIT, 'compostStart').ok, true);
  assert.match(G.actionsFor(s, PIT)[0].label, /Đang ủ/);
  run(s, COMPOST.ms);
  assert.equal(G.actionsFor(s, PIT)[0].id, 'compostTake');
  const r = G.perform(s, PIT, 'compostTake');
  assert.equal(r.ok, true); assert.equal(G.haveItem(s, 'fertilizer'), 1);
});

test('đóng băng không làm hố chạy: chỉ phần chạy bù (tối đa 8 giờ) được tính', () => {
  const T = Date.parse('2026-10-03T08:00:00Z'), ms = COMPOST.ms;
  setClock(() => T);
  try {
    COMPOST.ms = MAX_CATCHUP_MS + 2 * DAY_MS;   // lô ủ dài hơn mức chạy bù để thấy phần đóng băng
    const s = farm();
    s.inv.manure = 4; G.compostAdd(s); G.compostStart(s);
    s.savedAt = T - MAX_CATCHUP_MS - 30 * 24 * 60 * MIN;   // vắng 8 giờ + 30 ngày ngoài đời
    const back = quiet(() => G.loadGame(JSON.parse(JSON.stringify(s))));
    assert.ok(back.frozenMs > 0);
    assert.equal(G.compostInfo(back).state, 'composting');
    assert.equal(G.compostInfo(back).left, 2 * DAY_MS);
  } finally { COMPOST.ms = ms; setClock(); }
});

test('lưu và nạp giữ nguyên đồ đang ủ và thời gian còn lại', () => {
  const T = Date.parse('2026-10-03T08:00:00Z');
  setClock(() => T);
  try {
    const s = farm();
    s.inv.manure = 6; s.inv.cay_chet = 2;
    G.compostAdd(s); G.compostStart(s);
    run(s, 7 * MIN);
    const before = G.compostInfo(s);
    s.savedAt = T;
    const back = G.loadGame(JSON.parse(JSON.stringify(s)));
    assert.deepEqual(G.compostInfo(back), before);
    assert.equal(before.left, COMPOST.ms - 7 * MIN);
    // hố đang đầy dở (chưa đậy) cũng giữ nguyên
    const f = farm(); f.inv.phan_cho = 3; G.compostAdd(f); f.savedAt = T;
    assert.deepEqual(G.compostInfo(G.loadGame(JSON.parse(JSON.stringify(f)))).pile, { phan_cho: 3 });
  } finally { setClock(); }
});

test('bản lưu có hố ủ thiếu trường thì nạp được (mặc định hố rỗng)', () => {
  const T = Date.parse('2026-10-03T08:00:00Z');
  setClock(() => T);
  try {
    const s = farm();
    const e = pit(s); delete e.pile; delete e.readyAt;
    s.savedAt = T;
    assert.deepEqual(G.compostInfo(G.loadGame(JSON.parse(JSON.stringify(s)))), { state: 'empty', n: 0, cap: COMPOST.cap, out: 0, left: 0, pile: {} });
  } finally { setClock(); }
});

test('ô bón bằng phân từ hố ủ tính là "có bón phân": chăm kỹ thì ra ★3', () => {
  const s = farm(), [i] = plots(s);
  Object.assign(s.inv, { manure: 2, seed_cai: 1 });
  G.compostAdd(s); G.compostStart(s); run(s, COMPOST.ms);
  assert.equal(G.compostTake(s).qty, 1);
  assert.equal(G.haveItem(s, 'fertilizer'), 1);
  s.selectedSeed = 'cai';
  for (const id of ['till', 'plant', 'fertilize']) assert.equal(G.perform(s, P(i), id).ok, true, id);
  assert.equal(s.plots[i].crop.fert, true);
  // trời cố định (issue 55: sương muối làm cây mầm đứng yên, hạn hán làm đất khô hẳn) để kết quả không phụ thuộc lịch thời tiết
  const calm = () => { s.weather = 'cloud'; s.wday = G.dayOf(s); s.plots[i].water = 100; };   // trước issue 55 mưa ngẫu nhiên tưới hộ; giờ giữ đất ẩm như có mưa
  const rnd = Math.random; Math.random = () => 0.99;   // không có sâu, quạ, cỏ ngẫu nhiên chen vào
  try { for (let t = 0; t < 10 * MIN && s.plots[i].crop.progress < 1; t += 5 * SEC) { calm(); quiet(() => G.tick(s, 5 * SEC)); } }
  finally { Math.random = rnd; }
  assert.equal(G.cropStar(s.plots[i].crop), 3);
  const h = quiet(() => G.perform(s, P(i), 'harvest'));   // không trúng thưởng đúng mùa ngẫu nhiên (issue 54)
  assert.equal(h.ok, true, h.msg);
  assert.equal(G.haveItem(s, starKey('cai', 3)), 6);
});

test('khách thăm vườn không làm gì được ở hố ủ', () => {
  const s = farm();
  s.inv.manure = 2; G.compostAdd(s);
  const acts = G.actionsFor({ ...s, scene: 'visit', visit: { owner: 'A' } }, PIT);
  assert.ok(acts.every(a => a.disabled));
});
