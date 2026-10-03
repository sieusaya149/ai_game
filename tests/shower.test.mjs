// Seam 1: vòi sen chuồng cấp 3 (issue 59, ADR 0015): mỗi sáng tắm cả chuồng bằng nước bồn, mỗi con 1 lần nước, +5 vui, hết dơ.
// Bồn cạn thì con chưa tắm chờ tới khi có nước, không phạt. Chuồng cấp 1, 2 và chuồng ngoài tầm nước không có vòi sen.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { TANK, DAY_MS, ANIMALS, SHOWER, levelInfo } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const rnd = Math.random;
const fixed = fn => { Math.random = () => 0.99; try { return fn(); } finally { Math.random = rnd; } };   // không bệnh, không sự cố ngẫu nhiên
const run = (s, ms) => fixed(() => G.tick(s, ms));
const gap = (a, b) => Math.max(0, a.c - (b.c + b.w - 1), b.c - (a.c + a.w - 1), a.r - (b.r + b.h - 1), b.r - (a.r + a.h - 1));
const ent = (s, kind) => s.farm.ents.find(e => e.kind === kind);
function spot(s, what, ok) {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if ((!ok || ok(c, r)) && G.canPlace(s, what, c, r).ok) return { c, r };
  return null;
}
// Ngày d, còn 2 giây nữa là 6h sáng ngày d + 1 (trời mây, chơi đơn)
function nightBefore(s, d = 3) {
  s.day = d; s.wday = d; s.time = d * DAY_MS - 2000; s.weather = 'cloud';
}
// Vườn cấp 10, đất rộng, bồn chứa cạnh giếng có `level` lần nước; giếng hạ về cấp 3 sau khi xây bồn để máy bơm không bơm thêm
function farm(level) {
  const s = G.createGame({ name: 'Hùng' });
  s.orders = []; s.nextOrderAt = 1e15; s.coins = 1e7; s.tutorial = 99; s.animals = [];
  while (levelInfo(s.exp).level < 10) s.exp += 50;
  s.farm.owned = { c: 10, r: 8, w: 50, h: 38 }; s.farm.rev++;
  const well = ent(s, 'well');
  well.lv = 4;
  const w = G.footprint(well), p = spot(s, { kind: 'tank' }, (c, r) => gap({ c, r, w: 2, h: 2 }, w) <= 2);
  assert.ok(G.placeEntity(s, { kind: 'tank' }, p.c, p.r).ok);
  well.lv = 3;
  s.water.level = level;
  nightBefore(s);
  return s;
}
// Chuồng `pen` cấp lv, trong tầm nước (near) hay ngoài tầm
function addPen(s, pen, lv, near = true) {
  const t = G.footprint(ent(s, 'tank')), { w, h } = { pig: { w: 6, h: 9 }, pasture: { w: 8, h: 9 } }[pen];
  const p = spot(s, { kind: 'pen', pen }, (c, r) => (gap({ c, r, w, h }, t) <= TANK.range) === near);
  assert.ok(p, `có chỗ đặt ${pen} ${near ? 'trong' : 'ngoài'} tầm nước`);
  const r = G.placeEntity(s, { kind: 'pen', pen }, p.c, p.r);
  assert.ok(r.ok, r.msg);
  const e = s.farm.ents.find(x => x.id === r.id);
  for (let i = 1; i < lv; i++) assert.ok(G.upgradePen(s, e.id).ok);
  return e;
}
// Con vật trưởng thành trong chuồng e: dơ, vui 50
function put(s, type, e, extra) {
  const pen = G.mapOf(s).penById[e.id].area;
  const a = { id: s.nextId++, type, name: ANIMALS[type].name, sex: 'f', stage: 'truong', born: s.time - 1e9, nextProduct: 1e15, ready: false,
    hunger: 100, happy: 50, dirty: 100, sick: 0, bond: 0, pen: e.id, x: pen.x + pen.w / 2, y: pen.y + pen.h / 2, ...extra };
  s.animals.push(a);
  return a;
}
const happy = s => s.animals.map(a => a.happy);

test('chuồng heo cấp 3 trong tầm nước, bồn đủ: 6h sáng cả chuồng được tắm, bồn giảm đúng số con, mỗi con +5 vui và hết dơ', () => {
  const s = farm(10), e = addPen(s, 'pig', 3);
  for (let i = 0; i < 3; i++) put(s, 'heo', e);
  run(s, 1000);
  assert.equal(s.water.level, 10, 'chưa tới sáng thì vòi sen chưa chạy');
  // vườn đối chứng không có nước: chênh lệch vui chỉ do vòi sen
  const dry = structuredClone(s); dry.water.level = 0;
  run(s, 2000); run(dry, 2000);
  assert.equal(G.tankInfo(s).level, 7, '3 con, mỗi con 1 lần nước');
  const dh = happy(s).map((v, i) => v - happy(dry)[i]);
  assert.ok(dh.every(v => Math.abs(v - SHOWER.happy) < 0.5), `vui hơn đối chứng: ${dh}`);
  assert.equal(SHOWER.happy, 5);
  assert.ok(s.animals.every(a => a.dirty === 0), 'cả chuồng sạch');
  assert.ok(dry.animals.every(a => a.dirty === 100));
  // trong buổi sáng đó không tắm lại
  run(s, 60_000);
  assert.equal(G.tankInfo(s).level, 7);
  // sáng hôm sau tắm tiếp
  run(s, DAY_MS);
  assert.equal(G.tankInfo(s).level, 4);
});

test('bồn cạn giữa chừng: chỉ tắm được số con đủ nước, con còn lại để nguyên không phạt, có nước lại thì tắm tiếp', () => {
  const s = farm(2), e = addPen(s, 'pig', 3);
  for (let i = 0; i < 3; i++) put(s, 'heo', e);
  const dry = structuredClone(s); dry.water.level = 0;
  run(s, 3000); run(dry, 3000);
  assert.equal(G.tankInfo(s).level, 0, 'không trừ âm');
  assert.equal(s.animals.filter(a => a.dirty === 0).length, 2, '2 lần nước tắm được 2 con');
  const left = s.animals.find(a => a.dirty === 100), ctl = dry.animals.find(a => a.id === left.id);
  assert.ok(Math.abs(left.happy - ctl.happy) < 1e-9, 'con chưa tắm không bị trừ vui');
  assert.equal(s.coins, dry.coins, 'không mất xu');
  assert.equal(G.showerInfo(s, e).why, 'Bồn cạn, vòi sen chờ có nước');
  assert.deepEqual([G.showerInfo(s, e).done, G.showerInfo(s, e).total], [2, 3]);
  // có nước lại trong buổi sáng: con chưa tắm được tắm, con đã tắm không tắm lại
  s.water.level = 5;
  run(s, 1000);
  assert.equal(G.tankInfo(s).level, 4);
  assert.equal(left.dirty, 0);
  assert.deepEqual([G.showerInfo(s, e).on, G.showerInfo(s, e).done], [true, 3]);
});

test('chỉ buổi sáng: qua 12h trưa mới có nước thì chờ sáng hôm sau', () => {
  const s = farm(0), e = addPen(s, 'pig', 3), a = put(s, 'heo', e);
  run(s, 3000);
  run(s, DAY_MS * SHOWER.until);   // 12h trưa
  s.water.level = 5;
  run(s, 60_000);
  assert.equal(G.tankInfo(s).level, 5, 'buổi chiều vòi sen không chạy');
  assert.equal(a.dirty, 100);
  run(s, DAY_MS);
  assert.equal(G.tankInfo(s).level, 4, 'sáng hôm sau tắm');
});

test('chuồng cấp 1, 2, chuồng ngoài tầm nước, chuồng gà cấp 3 không có vòi sen; đồng cỏ cấp 3 có', () => {
  const s = farm(50);
  const p1 = addPen(s, 'pig', 1), p2 = addPen(s, 'pig', 2), far = addPen(s, 'pig', 3, false), cow = addPen(s, 'pasture', 3);
  const hen = s.farm.ents.find(e => e.kind === 'pen' && e.pen === 'chicken');
  for (let i = 0; i < 2; i++) assert.ok(G.upgradePen(s, hen.id).ok);
  for (const e of [p1, p2, far]) put(s, 'heo', e);
  const bo = put(s, 'bo', cow), ga = put(s, 'ga', hen, { dirty: 90 });
  assert.equal(G.showerInfo(s, p1), null);
  assert.equal(G.showerInfo(s, p2), null);
  assert.equal(G.showerInfo(s, hen), null);
  assert.match(G.showerInfo(s, far).why, /^Ngoài tầm nước/);
  run(s, 3000);
  assert.equal(G.tankInfo(s).level, 49, 'chỉ con bò ở đồng cỏ cấp 3 trong tầm được tắm');
  assert.equal(bo.dirty, 0);
  assert.ok(s.animals.filter(a => a.type === 'heo').every(a => a.dirty === 100));
  assert.ok(ga.dirty >= 90);
});

test('mất điện vì bão: máy bơm ngừng nhưng nước còn trong bồn vẫn dùng cho vòi sen', () => {
  const s = farm(10), e = addPen(s, 'pig', 3), a = put(s, 'heo', e);
  const seed = G.weatherSeed(s);
  let d = 2; while (!G.outageOn(seed, d)) d++;
  s.day = d; s.wday = d; s.time = (d - 1) * DAY_MS + 1000; s.weather = 'storm';
  assert.equal(G.powerOut(s), true);
  run(s, 1000);
  assert.equal(a.dirty, 0);
  assert.equal(G.tankInfo(s).level, 9);
});

test('thứ tự trừ nước cố định: tưới nhỏ giọt trước, vòi sen sau', () => {
  const s = farm(3), e = addPen(s, 'pig', 3);
  for (let i = 0; i < 2; i++) put(s, 'heo', e);
  const f = s.farm.ents.find(x => x.kind === 'field'), t = G.footprint(ent(s, 'tank'));
  if (gap(G.footprint(f), t) > TANK.range) {
    const p = spot(s, { id: f.id }, (c, r) => gap({ c, r, w: 3, h: 3 }, t) <= TANK.range);
    assert.ok(G.moveEntity(s, f.id, p.c, p.r).ok);
  }
  f.up.drip = true;
  for (const i of f.plots.slice(0, 2)) {
    Object.assign(s.plots[i], { unlocked: true, soil: 'tilled', water: 0, weeds: false });
    s.plots[i].crop = { id: 'cai', progress: 0.1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } };
  }
  assert.deepEqual(G.WATER_ORDER, ['drip', 'shower']);
  const a = structuredClone(s), b = structuredClone(s);
  run(a, 3000); run(b, 3000);
  assert.deepEqual(a.animals.map(x => x.dirty), b.animals.map(x => x.dirty));
  assert.equal(a.water.level, 0);
  assert.equal(a.animals.filter(x => x.dirty === 0).length, 1, '2 ô tưới trước, còn 1 lần nước cho 1 con');
});

test('dời chuồng: chuồng có vòi sen đang có nước không dời ra ngoài tầm; chuồng chưa có vòi sen dời tự do', () => {
  const s = farm(10), e = addPen(s, 'pig', 3), t = G.footprint(ent(s, 'tank'));
  const o = s.farm.owned;
  let k = null;
  for (let r = o.r; r < o.r + o.h && !k; r++) for (let c = o.c; c < o.c + o.w && !k; c++) {
    if (gap({ c, r, w: 6, h: 9 }, t) > TANK.range && G.canPlace(s, { id: e.id }, c, r).reason === 'no_water') k = G.canPlace(s, { id: e.id }, c, r);
  }
  assert.ok(k, 'dời ra ngoài tầm bị từ chối "ngoài tầm nước"');
  assert.match(k.msg, /^Ngoài tầm nước/);
  // chuồng cấp 2 (chưa có vòi sen) thì dời ra ngoài tầm được
  const p2 = addPen(s, 'pig', 2), o2 = spot(s, { id: p2.id }, (c, r) => gap({ c, r, w: 6, h: 9 }, t) > TANK.range);
  assert.ok(G.moveEntity(s, p2.id, o2.c, o2.r).ok);
  // nâng lên cấp 3 khi đang ở ngoài tầm: vòi sen tắt, dời sang chỗ ngoài tầm khác vẫn được
  assert.ok(G.upgradePen(s, p2.id).ok);
  assert.equal(G.showerInfo(s, p2).on, false);
  const o3 = spot(s, { id: p2.id }, (c, r) => gap({ c, r, w: 6, h: 9 }, t) > TANK.range && (c !== p2.c || r !== p2.r));
  assert.ok(o3 && G.canPlace(s, { id: p2.id }, o3.c, o3.r).ok);
});

test('bản lưu cũ có chuồng heo cấp 3 (chưa có vòi sen chạy): nạp vẫn chạy, sáng ra vòi sen tắm', () => {
  for (const k of Object.keys(store)) delete store[k];
  const s = farm(10), e = addPen(s, 'pig', 3), a = put(s, 'heo', e);
  delete a.shower;
  s.savedAt = Date.now();
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = fixed(() => G.loadGame());
  run(l, 3000);
  assert.equal(l.animals[0].dirty, 0);
  assert.equal(G.tankInfo(l).level, 9);
});

test('chạm chuồng cấp 3 (qua máng) thấy vòi sen đang bật hay tắt; chuồng cấp 2 không có dòng vòi sen', () => {
  const s = farm(10), e = addPen(s, 'pig', 3), p2 = addPen(s, 'pig', 2);
  put(s, 'heo', e);
  const row = id => G.actionsFor(s, { kind: 'trough', pen: 'pig', id }).find(a => a.id === 'shower');
  assert.match(row(e.id).label, /Vòi sen đang bật \(sáng nay tắm 0\/1 con\)/);
  assert.equal(row(p2.id), undefined);
  s.water.level = 0;
  assert.match(row(e.id).label, /Vòi sen đang tắt/);
  assert.equal(row(e.id).disabled, 'Bồn cạn, vòi sen chờ có nước');
});
