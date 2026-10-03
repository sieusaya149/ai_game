// Seam 1: tự động hóa theo khối ruộng 3×3 (issue 58): tưới nhỏ giọt, phun thuốc tự động, đất màu mỡ, tiền điện lúc 6h sáng.
// Nâng cấp là thuộc tính của khối ruộng (f.up), dời khối thì đi theo. Máy chỉ giữ tối đa ★2 (luật issue 52).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { TANK, AUTO, FARMING, DAY_MS, MAX_CATCHUP_MS, CROPS, starKey } from '../public/data.js';
import { setClock } from '../public/clock.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const SEC = 1000, MIN = 60_000, H = 60 * MIN;
const rnd = Math.random;
const quiet = fn => { Math.random = () => 0.99; try { return fn(); } finally { Math.random = rnd; } };   // không sâu, không cỏ
const run = (s, ms) => quiet(() => G.tick(s, ms));
const P = idx => ({ kind: 'plot', idx });
const newGame = () => {
  const s = G.createGame({ name: 'Hùng', look: {} });
  s.orders = []; s.nextOrderAt = 1e12; s.coins = 1e6; s.tutorial = 99;
  s.weather = 'cloud';
  Object.assign(s.inv, { seed_cai: 30, pesticide: 5, fertilizer: 10 });
  return s;
};
const ent = (s, kind) => s.farm.ents.find(e => e.kind === kind);
const fieldOf = s => ent(s, 'field');
const gap = (a, b) => Math.max(0, a.c - (b.c + b.w - 1), b.c - (a.c + a.w - 1), a.r - (b.r + b.h - 1), b.r - (a.r + a.h - 1));
function spot(s, what, ok) {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if ((!ok || ok(c, r)) && G.canPlace(s, what, c, r).ok) return { c, r };
  return null;
}
// Vườn có máy bơm (giếng cấp 4), bồn chứa sát giếng, khối ruộng đầu nằm trong tầm nước
function withTank(level = 0) {
  const s = newGame(), well = ent(s, 'well');
  well.lv = 4;
  const w = G.footprint(well), p = spot(s, { kind: 'tank' }, (c, r) => gap({ c, r, w: 2, h: 2 }, w) <= 2);
  assert.ok(G.placeEntity(s, { kind: 'tank' }, p.c, p.r).ok);
  s.water.level = level;
  const f = fieldOf(s), t = G.footprint(ent(s, 'tank'));
  if (gap(G.footprint(f), t) > TANK.range) {
    const q = spot(s, { id: f.id }, (c, r) => gap({ c, r, w: 3, h: 3 }, t) <= TANK.range);
    assert.ok(G.moveEntity(s, f.id, q.c, q.r).ok);
  }
  return s;
}
const newCrop = (id = 'cai', progress = 0.1) => ({ id, progress, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } });
// gieo sẵn cả khối (đất đã cuốc, khô)
function sowField(s, f, id = 'cai', progress = 0.1) {
  for (const i of f.plots) Object.assign(s.plots[i], { unlocked: true, soil: 'tilled', water: 0, weeds: false, crop: newCrop(id, progress) });
}
const buy = (s, f, kind) => { const r = G.buyFieldUp(s, f.id, kind); assert.equal(r.ok, true, r.msg); return r; };

// ---------- mua nâng cấp ----------
test('mua nâng cấp cho cả khối: trừ đúng giá, khối ghi lại, mua lại thì từ chối; thiếu xu thì không mua được', () => {
  const s = withTank(0), f = fieldOf(s);
  for (const k of ['drip', 'spray', 'rich']) {
    const c0 = s.coins;
    buy(s, f, k);
    assert.equal(f.up[k], true);
    assert.equal(s.coins, c0 - AUTO.ups[k].price);
    assert.equal(G.buyFieldUp(s, f.id, k).reason, 'has');
  }
  const info = G.fieldUpInfo(s, f.id);
  assert.deepEqual(info.map(u => [u.kind, u.has]), [['drip', true], ['spray', true], ['rich', true]]);
  const b = withTank(0);
  b.coins = AUTO.ups.rich.price - 1;
  assert.equal(G.buyFieldUp(b, fieldOf(b).id, 'rich').reason, 'coins');
  assert.equal(fieldOf(b).up.rich, false);
  assert.equal(G.buyFieldUp(b, 999, 'rich').reason, 'missing');
  assert.equal(G.buyFieldUp(b, fieldOf(b).id, 'glass').reason, 'missing');
});

test('tưới nhỏ giọt cần bồn chứa và khối phải trong tầm nước; đất màu mỡ, phun thuốc thì không cần nước', () => {
  const s = newGame(), f = fieldOf(s);
  assert.equal(G.buyFieldUp(s, f.id, 'drip').reason, 'no_tank');
  assert.ok(G.fieldUpInfo(s, f.id).find(u => u.kind === 'drip').error);
  buy(s, f, 'rich'); buy(s, f, 'spray');
  // có bồn, khối ở ngoài tầm nước
  const t = withTank(0), g = fieldOf(t), tf = G.footprint(ent(t, 'tank'));
  const far = spot(t, { id: g.id }, (c, r) => gap({ c, r, w: 3, h: 3 }, tf) > TANK.range);
  assert.ok(far, 'có chỗ ngoài tầm nước');
  assert.ok(G.moveEntity(t, g.id, far.c, far.r).ok);
  const r = G.buyFieldUp(t, g.id, 'drip');
  assert.equal(r.reason, 'no_water');
  assert.match(r.msg, /^Ngoài tầm nước/);
});

// ---------- tưới nhỏ giọt ----------
test('tưới nhỏ giọt: ô khô tự được tưới, bồn giảm đúng 1 lần mỗi ô; bồn cạn thì không tưới, không trừ âm', () => {
  const s = withTank(20), f = fieldOf(s);
  buy(s, f, 'drip');
  sowField(s, f);
  run(s, SEC);
  assert.ok(f.plots.every(i => s.plots[i].water > 0), 'cả khối được tưới');
  assert.equal(G.tankInfo(s).level, 20 - 9);
  // bồn chỉ còn 4 lần: tưới được 4 ô rồi ngừng, mực nước không âm
  const e = withTank(4), g = fieldOf(e);
  buy(e, g, 'drip');
  sowField(e, g);
  run(e, SEC);
  assert.equal(g.plots.filter(i => e.plots[i].water > 0).length, 4);
  assert.equal(e.water.level, 0);
  run(e, 5 * SEC);
  assert.equal(e.water.level, 0);
  assert.equal(G.autoInfo(e, g).drip, 'off');
  assert.match(G.autoInfo(e, g).why.drip, /cạn/);
});

test('tưới nhỏ giọt tưới trước khi đất khô hẳn: cả vụ không lần nào khô, hạn hán tưới sớm hơn', () => {
  // bắp cải lớn 4 giờ; giếng hạ về cấp 3 sau khi xây bồn để máy bơm không bơm thêm (đếm nước dùng cho gọn).
  // Đất bắt đầu ở 20%, mỗi phút tụt 1% (hạn hán 3%): đo phút đầu tiên máy tưới, trong vòng một ngày game (20 phút) để trời không đổi
  const first = weather => {
    const s = withTank(200), f = fieldOf(s);
    buy(s, f, 'drip');
    ent(s, 'well').lv = 3;
    sowField(s, f, 'bapcai', 0);
    for (const i of f.plots) s.plots[i].water = 20;
    for (let t = 1; t < 19; t++) {
      s.weather = weather; run(s, MIN);
      assert.ok(f.plots.every(i => !s.plots[i].crop.q.dry), 'máy giữ ẩm, không lỡ chăm kỹ');
      if (f.plots.every(i => s.plots[i].water > 90)) { assert.equal(200 - s.water.level, 9, 'mỗi ô một lần nước'); return t; }
    }
    return Infinity;
  };
  const cloud = first('cloud'), dry = first('drought');
  assert.ok(cloud < Infinity, 'trời mây cũng có tưới');
  assert.ok(dry < cloud, `hạn hán tưới sớm hơn: phút ${dry} so với ${cloud}`);
});

// ---------- phun thuốc tự động ----------
test('phun thuốc tự động: có sâu 20 giây thì phun, kho trừ đúng 1 thuốc; hết thuốc thì không phun', () => {
  const s = newGame(), f = fieldOf(s);
  buy(s, f, 'spray');
  sowField(s, f);
  for (const i of f.plots) s.plots[i].water = 100;
  const i0 = f.plots[0], c = s.plots[i0].crop;
  Object.assign(c, { bugs: true, bugSince: s.time });
  const n0 = s.inv.pesticide;
  run(s, 19 * SEC);
  assert.equal(c.bugs, true, 'chưa đủ 20 giây');
  assert.equal(G.autoInfo(s, f).spray, 'on');
  run(s, SEC);
  assert.equal(c.bugs, false, 'máy đã phun');
  assert.equal(s.inv.pesticide, n0 - 1);
  assert.equal(c.q.hand, false, 'máy phun không tính là chăm tay');
  assert.equal(G.autoInfo(s, f).spray, 'idle');
  // hết thuốc
  s.inv.pesticide = 0;
  Object.assign(c, { bugs: true, bugSince: s.time });
  run(s, 30 * SEC);
  assert.equal(c.bugs, true);
  assert.equal(G.autoInfo(s, f).spray, 'off');
  assert.match(G.autoInfo(s, f).why.spray, /thuốc/);
});

test('phun thuốc: khối không có máy phun thì sâu vẫn còn; mất điện vì bão thì máy phun ngừng', () => {
  const s = newGame(), f = fieldOf(s);
  sowField(s, f);
  const c = s.plots[f.plots[0]].crop;
  Object.assign(c, { bugs: true, bugSince: s.time });
  run(s, 25 * SEC);
  assert.equal(c.bugs, true);
  const o = newGame(), g = fieldOf(o);
  buy(o, g, 'spray');
  sowField(o, g);
  let d = 2; while (!G.outageOn(G.weatherSeed(o), d)) d++;
  o.day = d; o.wday = d; o.time = (d - 1) * DAY_MS + MIN; o.weather = 'storm';
  assert.equal(G.powerOut(o), true);
  const k = o.plots[g.plots[0]].crop;
  Object.assign(k, { bugs: true, bugSince: o.time });
  run(o, 25 * SEC);
  assert.equal(k.bugs, true, 'mất điện: máy phun không chạy');
  assert.match(G.autoInfo(o, g).why.spray, /mất điện/i);
});

// ---------- đất màu mỡ ----------
test('đất màu mỡ: cỏ mọc chậm hơn khối thường', () => {
  const s = newGame(), f = fieldOf(s);
  buy(s, f, 'rich');
  s.exp = 1e6;
  const p = spot(s, { kind: 'field' });
  assert.ok(G.placeEntity(s, { kind: 'field' }, p.c, p.r).ok);
  const g = s.farm.ents.filter(e => e.kind === 'field').at(-1);
  for (const x of [f, g]) for (const i of x.plots) Object.assign(s.plots[i], { unlocked: true, soil: 'tilled', weeds: false, crop: null });
  // xác suất mỗi giây của khối thường lớn hơn số ngẫu nhiên, của khối màu mỡ thì nhỏ hơn
  const perSec = 1 - Math.pow(1 - FARMING.weedChancePerMin, 1 / 60);
  Math.random = () => perSec * (1 + AUTO.richWeed) / 2;
  try { G.tick(s, SEC); } finally { Math.random = rnd; }
  assert.ok(g.plots.every(i => s.plots[i].weeds), 'khối thường mọc cỏ');
  assert.ok(f.plots.every(i => !s.plots[i].weeds), 'khối màu mỡ chưa mọc');
});

test('đất màu mỡ: thêm sản lượng so với khối không nâng, tính như đã bón khi xét sao', () => {
  const s = newGame(), f = fieldOf(s);
  s.exp = 1e6;
  const p = spot(s, { kind: 'field' });
  assert.ok(G.placeEntity(s, { kind: 'field' }, p.c, p.r).ok);
  const g = s.farm.ents.filter(e => e.kind === 'field').at(-1);
  buy(s, f, 'rich');
  const a = f.plots[0], b = g.plots[0];
  for (const i of [a, b]) {
    s.selectedSeed = 'cai';
    Object.assign(s.plots[i], { unlocked: true, soil: 'tilled', water: 100, weeds: false, crop: null });
    assert.ok(G.perform(s, P(i), 'plant').ok);
  }
  for (let t = 0; t < CROPS.cai.grow + MIN && !(s.plots[a].crop.progress >= 1 && s.plots[b].crop.progress >= 1); t += 5 * SEC) {
    for (const i of [a, b]) s.plots[i].water = 100;
    run(s, 5 * SEC);
  }
  assert.equal(G.cropStar(s.plots[a].crop), 2, 'màu mỡ, chăm kỹ, không chăm tay: ★2');
  assert.equal(G.cropStar(s.plots[b].crop), 1, 'khối thường không bón: ★1');
  quiet(() => { assert.ok(G.perform(s, P(a), 'harvest').ok); assert.ok(G.perform(s, P(b), 'harvest').ok); });
  const rich = s.basket[starKey('cai', 2)], plain = s.basket.cai;
  assert.equal(plain, CROPS.cai.yield);
  assert.equal(rich, Math.round(CROPS.cai.yield * (1 + AUTO.richYield)), `màu mỡ ${rich} > thường ${plain}`);
});

// ---------- sao ----------
test('tưới và phun tự động cả vụ, không chăm tay: tối đa ★2; thêm một lần tưới tay thì ★3', () => {
  for (const hand of [false, true]) {
    const s = withTank(200), f = fieldOf(s);
    for (const k of ['drip', 'spray', 'rich']) buy(s, f, k);
    const i = f.plots[0];
    Object.assign(s.plots[i], { unlocked: true, soil: 'tilled', water: 0, weeds: false, crop: null });
    s.selectedSeed = 'cai';
    assert.ok(G.perform(s, P(i), 'plant').ok);
    if (hand) assert.ok(G.perform(s, P(i), 'water').ok);
    const c = s.plots[i].crop;
    run(s, 30 * SEC);
    Object.assign(c, { bugs: true, bugSince: s.time });   // sâu giữa vụ: máy phun trong 20 giây
    for (let t = 0; t < 5 * MIN && c.progress < 1; t += 5 * SEC) run(s, 5 * SEC);
    assert.ok(c.progress >= 1, 'chín');
    assert.equal(c.q.dry, false);
    assert.ok(c.q.bugMax <= AUTO.sprayMs);
    assert.equal(G.cropStar(c), hand ? 3 : 2);
  }
});

// ---------- dời khối ----------
test('dời khối ruộng thì nâng cấp đi theo; dời khối có tưới nhỏ giọt ra ngoài tầm nước thì canPlace từ chối', () => {
  const s = withTank(0), f = fieldOf(s), t = G.footprint(ent(s, 'tank'));
  buy(s, f, 'drip'); buy(s, f, 'rich');
  const near = spot(s, { id: f.id }, (c, r) => gap({ c, r, w: 3, h: 3 }, t) <= TANK.range && (c !== f.c || r !== f.r));
  assert.ok(G.moveEntity(s, f.id, near.c, near.r).ok);
  assert.deepEqual([fieldOf(s).up.drip, fieldOf(s).up.rich, fieldOf(s).up.spray], [true, true, false]);
  const o = s.farm.owned;
  let far = null;
  for (let r = o.r; r < o.r + o.h && !far; r++) for (let c = o.c; c < o.c + o.w && !far; c++) if (G.canPlace(s, { id: f.id }, c, r).reason === 'no_water') far = { c, r };
  assert.ok(far, 'có chỗ ngoài tầm nước');
  assert.equal(G.moveEntity(s, f.id, far.c, far.r).ok, false);
  assert.equal(G.footprint(fieldOf(s)).c, near.c);
});

// ---------- tiền điện ----------
// Chạy tới đúng trước 6h sáng ngày kế rồi qua 6h
const toDawn = (s, before = SEC) => run(s, DAY_MS - (s.time % DAY_MS) - before);
test('tiền điện: trừ lúc 6h sáng, ghi nhật ký; tính theo máy bơm và máy phun đang có', () => {
  const s = withTank(0), f = fieldOf(s);
  buy(s, f, 'spray');
  const c0 = s.coins;
  toDawn(s);
  assert.equal(s.coins, c0, 'chưa tới 6h thì chưa trừ');
  const owe = G.powerInfo(s).owe;
  const units = (TANK.power.pump + AUTO.power.spray) * (DAY_MS - SEC) / H;
  assert.equal(owe, Math.floor(units * AUTO.price));
  run(s, 2 * SEC);
  const paid = c0 - s.coins;
  assert.ok(paid > 0 && Math.abs(paid - units * AUTO.price) <= 1, `đã trả ${paid}`);
  const bill = s.log.find(e => /tiền điện/i.test(e.text));
  assert.ok(bill, 'có dòng nhật ký tiền điện');
  assert.match(bill.text, new RegExp(String(paid)));
  // không có máy thì không tính
  const n = newGame(), n0 = n.coins;
  toDawn(n, 0); run(n, SEC);
  assert.equal(n.coins, n0);
  assert.ok(!n.log.some(e => /tiền điện/i.test(e.text)));
  assert.equal(G.powerInfo(n).owe, 0);
});

test('tiền điện: không đủ xu thì máy ngừng (không nợ âm), đủ xu lại chạy', () => {
  const s = withTank(0), f = fieldOf(s);
  buy(s, f, 'spray');
  toDawn(s);
  sowField(s, f, 'bapcai');
  for (const i of f.plots) s.plots[i].water = 100;
  s.coins = 3;
  run(s, 2 * SEC);
  assert.equal(s.coins, 3, 'không trừ thành âm');
  assert.ok(G.powerInfo(s).bill > 3);
  assert.ok(s.log.some(e => /tiền điện/i.test(e.text)));
  // máy bơm ngừng, máy phun ngừng, không tốn thêm điện
  const lv = s.water.level, pw = s.water.power;
  const c = s.plots[f.plots[0]].crop;
  Object.assign(c, { bugs: true, bugSince: s.time });
  run(s, 30 * SEC);
  assert.equal(s.water.level, lv, 'máy bơm ngừng');
  assert.equal(c.bugs, true, 'máy phun ngừng');
  assert.equal(G.tankInfo(s).pumping, false);
  assert.match(G.tankInfo(s).why, /tiền điện/i);
  assert.match(G.autoInfo(s, f).why.spray, /tiền điện/i);
  assert.equal(s.water.power, pw);
  // đủ xu: tự trả, máy chạy lại
  const bill = G.powerInfo(s).bill;
  s.coins = bill + 100;
  run(s, SEC);
  assert.equal(s.coins, 100);
  assert.equal(G.powerInfo(s).bill, 0);
  assert.equal(G.tankInfo(s).pumping, true);
  run(s, 5 * SEC);
  assert.equal(c.bugs, false, 'máy phun chạy lại');
});

test('tiền điện chỉ tính giờ vườn thật sự chạy: phần đóng băng (vắng quá 8 giờ) không bị tính', () => {
  const T = Date.now();
  setClock(() => T);
  try {
    for (const k of Object.keys(store)) delete store[k];
    const s = withTank(0);
    s.coins = 1e5;
    s.savedAt = T - 20 * H;
    store[G.SAVE_KEY] = JSON.stringify(s);
    const t = quiet(() => G.loadGame());
    assert.equal(t.frozenMs, 12 * H);
    const paid = 1e5 - t.coins, left = t.water.power * AUTO.price;
    assert.ok(Math.abs(paid + left - 8 * TANK.power.pump * AUTO.price) < 1, `trả ${paid} + còn ${left} = 8 giờ máy bơm`);
    assert.equal(MAX_CATCHUP_MS, 8 * H);
  } finally { setClock(); }
});

test('bản lưu cũ chưa có nâng cấp khối, chưa có hóa đơn điện: nạp vẫn chạy', () => {
  for (const k of Object.keys(store)) delete store[k];
  const s = newGame();
  G.saveGame(s);
  const raw = JSON.parse(store[G.SAVE_KEY]);
  for (const e of raw.farm.ents) delete e.up;
  delete raw.water.bill;
  store[G.SAVE_KEY] = JSON.stringify(raw);
  const t = G.loadGame();
  assert.deepEqual(fieldOf(t).up, { drip: false, spray: false, rich: false, glass: false });
  assert.equal(G.powerInfo(t).bill, 0);
  run(t, MIN);
});
