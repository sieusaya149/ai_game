// Seam 1: bồn chứa và mạng nước (issue 57, ADR 0015): bồn là ngân sách nước theo giờ vườn chạy, vùng phủ 8 ô quanh bồn
// và trạm bơm phụ, canPlace có lý do "ngoài tầm nước", thứ tự trừ nước cố định.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { TANK, WATER_BUILD, MAX_CATCHUP_MS } from '../public/data.js';
import { setClock } from '../public/clock.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const MIN = 60_000, H = 60 * MIN, UNIT = H / TANK.perHour;   // một lần nước bơm mất bấy nhiêu ms
const newGame = () => {
  const s = G.createGame({ name: 'Hùng', look: {} });
  s.orders = []; s.nextOrderAt = 1e12; s.coins = 1e6; s.tutorial = 99;
  s.weather = 'cloud';
  return s;
};
const wellEnt = s => s.farm.ents.find(e => e.kind === 'well');
const ent = (s, kind) => s.farm.ents.find(e => e.kind === kind);
// Khoảng cách theo ô giữa hai vùng (0 = chạm nhau / chồng nhau), như luật tầm nước
const gap = (a, b) => Math.max(0, a.c - (b.c + b.w - 1), b.c - (a.c + a.w - 1), a.r - (b.r + b.h - 1), b.r - (a.r + a.h - 1));
// Tìm ô đặt được (canPlace ok) cho món what, cách vùng `from` đúng d ô (nếu có)
function spot(s, what, test) {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) {
    if (test && !test(c, r)) continue;
    if (G.canPlace(s, what, c, r).ok) return { c, r };
  }
  return null;
}
// Vườn có máy bơm (giếng cấp 4) và bồn chứa đặt sát giếng
function withTank(level = 0) {
  const s = newGame();
  wellEnt(s).lv = 4;
  const w = G.footprint(wellEnt(s)), p = spot(s, { kind: 'tank' }, (c, r) => gap({ c, r, w: 2, h: 2 }, w) <= 2);
  const r = G.placeEntity(s, { kind: 'tank' }, p.c, p.r);
  assert.ok(r.ok, r.msg);
  s.water.level = level;
  return s;
}
// Chạy vườn ms giờ vườn (trong cùng một ngày game: thời tiết không đổi giữa chừng)
const run = (s, ms) => G.tick(s, ms);

test('bồn chứa 200 lần nước, mỗi bồn phụ +150', () => {
  const s = withTank();
  assert.equal(G.tankInfo(s).cap, 200);
  const t = G.footprint(ent(s, 'tank'));
  for (let i = 1; i <= 2; i++) {
    const p = spot(s, { kind: 'tank2' }, (c, r) => gap({ c, r, w: 1, h: 1 }, t) <= TANK.range);
    const r = G.placeEntity(s, { kind: 'tank2' }, p.c, p.r);
    assert.ok(r.ok, r.msg);
    assert.equal(G.tankInfo(s).cap, 200 + 150 * i);
  }
  assert.deepEqual([TANK.cap, TANK.extra], [200, 150]);
});

test('chưa có giếng máy bơm thì chưa xây được bồn; bồn phụ, trạm bơm cần có bồn trước', () => {
  const s = newGame();
  wellEnt(s).lv = 3;
  const w = G.footprint(wellEnt(s)), p = { c: w.c - 3, r: w.r + 2 };
  assert.equal(G.canPlace(s, { kind: 'tank' }, p.c, p.r).reason, 'well');
  assert.equal(G.placeEntity(s, { kind: 'tank' }, p.c, p.r).ok, false);
  for (const kind of ['tank2', 'booster']) assert.equal(G.canPlace(s, { kind }, p.c, p.r).reason, 'no_tank');
  assert.equal(G.tankInfo(s).cap, 0);
  // chỉ một bồn chứa chính
  const t = withTank();
  assert.equal(spot(t, { kind: 'tank' }), null);
  assert.equal(G.canPlace(t, { kind: 'tank' }, p.c, p.r).reason, 'max');
});

test('đặt bồn trừ đúng giá; thiếu xu thì từ chối', () => {
  const s = newGame();
  wellEnt(s).lv = 4;
  const w = G.footprint(wellEnt(s)), p = spot(s, { kind: 'tank' }, (c, r) => gap({ c, r, w: 2, h: 2 }, w) <= 2);
  s.coins = WATER_BUILD.tank.price - 1;
  assert.equal(G.placeEntity(s, { kind: 'tank' }, p.c, p.r).reason, 'coins');
  s.coins = WATER_BUILD.tank.price;
  assert.ok(G.placeEntity(s, { kind: 'tank' }, p.c, p.r).ok);
  assert.equal(s.coins, 0);
  assert.equal(G.placeCost(s, { kind: 'booster' }), WATER_BUILD.booster.price);
});

test('giếng bơm 20 lần mỗi giờ vườn chạy, hạn hán còn một nửa', () => {
  const s = withTank(0);
  run(s, 15 * MIN);   // 1/4 giờ: 5 lần
  assert.equal(G.tankInfo(s).level, 5);
  assert.equal(TANK.perHour, 20);
  const d = withTank(0);
  d.weather = 'drought';
  run(d, 15 * MIN);
  assert.equal(G.tankInfo(d).level, 2);   // 2,5 lần: lần thứ ba chưa đầy
  run(d, 3 * MIN);
  assert.equal(G.tankInfo(d).level, 3);
});

test('bơm cả giờ dài (qua nhiều ngày game) đúng 20 lần một giờ; bồn không vượt sức chứa', () => {
  const s = withTank(0);
  s.weather = 'sun';
  const rnd = Math.random; Math.random = () => 0.1;   // ngày mới vẫn nắng
  try {
    run(s, H);
    assert.equal(G.tankInfo(s).level, 20);
    run(s, 20 * H);
    assert.equal(G.tankInfo(s).level, 200);
  } finally { Math.random = rnd; }
  assert.equal(G.tankInfo(s).full, true);
});

test('giếng chưa phải máy bơm, giếng dời ra xa bồn, hay mất điện vì bão thì không bơm', () => {
  const lo = withTank(0);
  wellEnt(lo).lv = 3;
  run(lo, 15 * MIN);
  assert.equal(G.tankInfo(lo).level, 0);
  assert.equal(G.tankInfo(lo).pumping, false);

  const st = withTank(0);
  st.weather = 'storm';
  assert.equal(G.powerOut(st), true);
  run(st, 15 * MIN);
  assert.equal(G.tankInfo(st).level, 0);
  assert.match(G.tankInfo(st).why, /mất điện/i);

  // dời giếng ra ngoài tầm: bồn vẫn còn, không bị xóa, chỉ ngừng bơm
  const far = withTank(0), t = G.footprint(ent(far, 'tank'));
  const p = spot(far, { id: wellEnt(far).id }, (c, r) => gap({ c, r, w: 1, h: 1 }, t) > TANK.range);
  assert.ok(G.moveEntity(far, wellEnt(far).id, p.c, p.r).ok);
  run(far, 15 * MIN);
  assert.equal(G.tankInfo(far).level, 0);
  assert.ok(ent(far, 'tank'));
  assert.match(G.tankInfo(far).why, /giếng/);
});

test('vùng phủ 8 ô quanh bồn; trạm bơm phụ thêm 8 ô', () => {
  const s = withTank(0), t = G.footprint(ent(s, 'tank'));
  // tầm nước: ô cách bồn 8 ô có nước, 9 ô thì không
  const R = TANK.range;
  assert.equal(R, 8);
  assert.equal(G.waterAt(s, t.c + t.w - 1 + R, t.r), true);
  assert.equal(G.waterAt(s, t.c + t.w - 1 + R + 1, t.r), false);
  assert.equal(G.waterAt(s, t.c, t.r - R), true);
  assert.equal(G.waterAt(s, t.c, t.r - R - 1), false);
  // trạm bơm phụ đặt trong tầm, sát mép vùng phủ: vùng phủ nới thêm 8 ô quanh trạm
  const p = spot(s, { kind: 'booster' }, (c, r) => gap({ c, r, w: 1, h: 1 }, t) === R);
  assert.ok(p, 'có chỗ cho trạm bơm sát mép tầm nước');
  const r = G.placeEntity(s, { kind: 'booster' }, p.c, p.r);
  assert.ok(r.ok, r.msg);
  const dc = Math.sign(p.c - t.c) || 0, dr = Math.sign(p.r - t.r) || 0;
  const far = { c: p.c + dc * R, r: p.r + dr * R };
  assert.equal(gap({ ...far, w: 1, h: 1 }, t) > R, true);
  assert.equal(G.waterAt(s, far.c, far.r), true, 'trạm bơm phụ phủ thêm 8 ô');
  assert.equal(G.waterAt(s, far.c + dc, far.r + dr), false);
});

test('canPlace: công trình cần nước trong tầm thì được, ngoài tầm thì từ chối "ngoài tầm nước"', () => {
  const s = withTank(0), t = G.footprint(ent(s, 'tank'));
  const inR = spot(s, { kind: 'booster' }, (c, r) => gap({ c, r, w: 1, h: 1 }, t) <= TANK.range);
  assert.ok(G.canPlace(s, { kind: 'booster' }, inR.c, inR.r).ok);
  const o = s.farm.owned;
  let out = null;
  for (let r = o.r; r < o.r + o.h && !out; r++) for (let c = o.c; c < o.c + o.w && !out; c++) {
    if (gap({ c, r, w: 1, h: 1 }, t) > TANK.range && G.canPlace(s, { kind: 'tank2' }, c, r).reason === 'no_water') out = { c, r };
  }
  assert.ok(out, 'có ô ngoài tầm nước');
  for (const kind of ['tank2', 'booster']) {
    const k = G.canPlace(s, { kind }, out.c, out.r);
    assert.equal(k.ok, false);
    assert.equal(k.reason, 'no_water');
    assert.match(k.msg, /^Ngoài tầm nước/);
  }
  // bồn chứa phải ở trong tầm của giếng
  const w = G.footprint(wellEnt(s)), b = newGame();
  wellEnt(b).lv = 4;
  let far = null;
  for (let r = o.r; r < o.r + o.h && !far; r++) for (let c = o.c; c < o.c + o.w && !far; c++) {
    if (gap({ c, r, w: 2, h: 2 }, w) > TANK.range && G.canPlace(b, { kind: 'tank' }, c, r).reason === 'no_water') far = { c, r };
  }
  assert.ok(far, 'bồn đặt xa giếng bị từ chối');
  // khối ruộng có tưới nhỏ giọt cũng cần nước; khối thường thì không
  const f = s.farm.ents.find(e => e.kind === 'field');
  const fp = spot(s, { id: f.id }, (c, r) => gap({ c, r, w: 3, h: 3 }, t) > TANK.range + 1);
  assert.ok(fp);
  f.up.drip = true;
  assert.equal(G.canPlace(s, { id: f.id }, fp.c, fp.r).reason, 'no_water');
  f.up.drip = false;
  assert.ok(G.canPlace(s, { id: f.id }, fp.c, fp.r).ok);
});

test('dời bồn ra xa: trạm bơm phụ đã có tạm ngừng chứ không bị xóa', () => {
  const s = withTank(0), t = G.footprint(ent(s, 'tank'));
  const p = spot(s, { kind: 'booster' }, (c, r) => gap({ c, r, w: 1, h: 1 }, t) === TANK.range);
  assert.ok(G.placeEntity(s, { kind: 'booster' }, p.c, p.r).ok);
  const b = ent(s, 'booster');
  assert.equal(G.waterOn(s, b), true);
  // dời bồn sang phía bên kia giếng (vẫn trong tầm giếng) cho xa trạm
  const w = G.footprint(wellEnt(s));
  const q = spot(s, { id: ent(s, 'tank').id }, (c, r) => gap({ c, r, w: 2, h: 2 }, w) <= TANK.range && gap({ c, r, w: 2, h: 2 }, { ...b, w: 1, h: 1 }) > TANK.range);
  assert.ok(q, 'có chỗ dời bồn ra xa trạm');
  assert.ok(G.moveEntity(s, ent(s, 'tank').id, q.c, q.r).ok);
  assert.ok(ent(s, 'booster'), 'trạm vẫn còn');
  assert.equal(G.waterOn(s, b), false);
});

// Khối ruộng có tưới nhỏ giọt (issue 58 lo phần mua): đặt sẵn trong bản lưu để thử cơ chế trừ nước
function dripField(s) {
  const f = s.farm.ents.find(e => e.kind === 'field'), t = G.footprint(ent(s, 'tank'));
  if (gap(G.footprint(f), t) > TANK.range) {
    const p = spot(s, { id: f.id }, (c, r) => gap({ c, r, w: 3, h: 3 }, t) <= TANK.range);
    assert.ok(G.moveEntity(s, f.id, p.c, p.r).ok);
  }
  f.up.drip = true;
  for (const i of f.plots) {
    const p = s.plots[i];
    Object.assign(p, { unlocked: true, soil: 'tilled', water: 0, weeds: false });
    p.crop = { id: 'cai', progress: 0.1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } };
  }
  return f;
}

test('bồn cạn thì máy ngừng: không trừ âm, không phạt gì', () => {
  const s = withTank(4), f = dripField(s);
  run(s, 1000);
  assert.equal(G.tankInfo(s).level, 0, 'tưới được 4 ô thì hết nước');
  const wet = f.plots.filter(i => s.plots[i].water > 0).length;
  assert.equal(wet, 4);
  const coins = s.coins;
  run(s, 2000);
  assert.equal(G.tankInfo(s).level, 0);
  assert.ok(G.tankInfo(s).level >= 0);
  assert.equal(s.coins, coins);
  assert.ok(f.plots.every(i => !s.plots[i].crop.dead), 'không cây nào chết');
});

test('mất điện vì bão: bơm ngừng nhưng nước còn trong bồn vẫn dùng được', () => {
  const s = withTank(20), f = dripField(s);
  s.weather = 'storm';
  run(s, 1000);
  assert.equal(G.tankInfo(s).level, 20 - 9);
  assert.ok(f.plots.every(i => s.plots[i].water > 0));
});

test('trạm bơm phụ: tốn điện khi chạy, mất điện thì ngừng và vùng phủ của trạm tạm mất', () => {
  const s = withTank(0), t = G.footprint(ent(s, 'tank'));
  const p = spot(s, { kind: 'booster' }, (c, r) => gap({ c, r, w: 1, h: 1 }, t) === TANK.range);
  assert.ok(G.placeEntity(s, { kind: 'booster' }, p.c, p.r).ok);
  const b = ent(s, 'booster');
  const p0 = s.water.power;
  run(s, 6 * MIN);
  assert.ok(s.water.power > p0, 'máy bơm, trạm bơm ghi điện tiêu thụ');
  const used = s.water.power - p0;
  assert.ok(Math.abs(used - (TANK.power.pump + TANK.power.booster) * 0.1) < 1e-6, `6 phút: ${used}`);
  s.weather = 'storm';
  const p1 = s.water.power;
  run(s, 6 * MIN);
  assert.equal(s.water.power, p1, 'mất điện thì không tốn điện');
  assert.equal(G.waterOn(s, b), false);
  // ô chỉ trạm phủ: lúc mất điện thì không có nước để máy chạy, nhưng vẫn đặt được công trình (vùng phủ lúc đặt không theo điện)
  const dc = Math.sign(p.c - t.c), dr = Math.sign(p.r - t.r);
  const far = { c: p.c + dc * 4, r: p.r + dr * 4 };
  assert.equal(G.waterAt(s, far.c, far.r), true);
  assert.equal(G.waterAt(s, far.c, far.r, true), false);
});

test('đóng băng sau 8 giờ: bồn không đầy thêm', () => {
  const T = Date.now();
  setClock(() => T);
  try {
    for (const k of Object.keys(store)) delete store[k];
    const s = withTank(0);
    s.weather = 'sun';
    s.savedAt = T - 20 * H;
    store[G.SAVE_KEY] = JSON.stringify(s);
    const rnd = Math.random; Math.random = () => 0.1;
    let t;
    try { t = G.loadGame(); } finally { Math.random = rnd; }
    assert.equal(MAX_CATCHUP_MS, 8 * H);
    assert.equal(G.tankInfo(t).level, 8 * TANK.perHour, 'chỉ bơm 8 giờ, 12 giờ đóng băng không tính');
    assert.equal(t.frozenMs, 12 * H);
  } finally { setClock(); }
});

test('thứ tự trừ nước cố định: chạy lại cùng bản lưu ra cùng kết quả', () => {
  const s = withTank(6);
  const f1 = dripField(s);
  // khối thứ hai cũng tưới nhỏ giọt: bồn chỉ đủ cho khối đặt trước (thứ tự trong vườn), khối sau chờ
  const t = G.footprint(ent(s, 'tank'));
  s.exp = 1e6;
  const p = spot(s, { kind: 'field' }, (c, r) => gap({ c, r, w: 3, h: 3 }, t) <= TANK.range);
  assert.ok(G.placeEntity(s, { kind: 'field' }, p.c, p.r).ok);
  const f2 = s.farm.ents.filter(e => e.kind === 'field').at(-1);
  f2.up.drip = true;
  for (const i of f2.plots) Object.assign(s.plots[i], { soil: 'tilled', water: 0, crop: structuredClone(s.plots[f1.plots[0]].crop) });
  for (const i of f1.plots) s.plots[i].water = 0;
  const a = structuredClone(s), b = structuredClone(s);
  run(a, 1000); run(b, 1000);
  assert.deepEqual(a.plots.map(p => p.water), b.plots.map(p => p.water));
  assert.equal(a.water.level, b.water.level);
  assert.equal(a.water.level, 0);
  assert.equal(f1.plots.filter(i => a.plots[i].water > 0).length, 6, 'khối đặt trước được tưới trước');
  assert.equal(f2.plots.filter(i => a.plots[i].water > 0).length, 0);
  assert.deepEqual(G.WATER_ORDER, ['drip']);
});

test('bản lưu cũ chưa có bồn: nạp vẫn chạy, mực nước 0, điện 0', () => {
  for (const k of Object.keys(store)) delete store[k];
  const s = newGame();
  delete s.water;
  G.saveGame(s);
  const raw = JSON.parse(store[G.SAVE_KEY]);
  delete raw.water;
  store[G.SAVE_KEY] = JSON.stringify(raw);
  const t = G.loadGame();
  assert.deepEqual({ level: t.water.level, power: t.water.power }, { level: 0, power: 0 });
  assert.equal(G.tankInfo(t).cap, 0);
  run(t, 10 * MIN);
  assert.equal(t.water.level, 0);
});
