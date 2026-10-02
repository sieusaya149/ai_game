// Bệnh 4 giai đoạn, lây, thuốc/vắc-xin/bác sĩ, ngôi mộ (issue 38) — qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { ANIMALS, SICK, EVENT_LEVEL, levelInfo, stageStart } from '../public/data.js';

const MIN = 60_000, HOUR = 60 * MIN;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const withRandom = (v, fn) => { const r = Math.random; Math.random = typeof v === 'function' ? v : () => v; try { return fn(); } finally { Math.random = r; } };
const quiet = fn => withRandom(0.99, fn);   // không bệnh ngẫu nhiên, không lây

// Vườn sạch, chủ cấp lv, không đơn hàng, không con vật sẵn
const game = (lv = 8, coins = 100000) => {
  const s = G.createGame({ name: 'Chủ trại' });
  s.coins = coins; s.exp = 0; s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.eggs = []; s.clutch = [];
  s.time = 12 * HOUR; s.day = 1;
  s.farm.owned = { c: 10, r: 8, w: 50, h: 38 }; s.farm.rev++;
  while (levelInfo(s.exp).level < lv) s.exp += 50;
  return s;
};
const put = (s, type, extra) => {
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type, name: ANIMALS[type].name, stage: 'truong',
    nextProduct: 1e15, ready: false, hunger: 100, happy: 60, dirty: 0, sick: 0, sickMs: 0, dose: 0, vaccUntil: 0, pen: null, tile: null, ...extra };
  s.animals.push(a);
  return a;
};
// Chạy ms giờ vườn từng phút, máng đầy và bụng no (chỉ còn bệnh là nguyên nhân thay đổi)
const run = (s, ms, rnd = 0.99) => {
  for (let t = 0; t < ms; t += MIN) {
    for (const k of Object.keys(s.troughs)) s.troughs[k] = 20;
    for (const a of s.animals) if (!a.sick) a.hunger = 100;
    withRandom(rnd, () => G.tick(s, Math.min(MIN, ms - t)));
  }
};
const quarantinePen = (s, c = 50, r = 10) => { const x = G.placeEntity(s, { kind: 'pen', pen: 'quarantine' }, c, r); assert.equal(x.ok, true, x.msg); return x.id; };
const give = (s, k, n) => { s.inv[k] = (s.inv[k] || 0) + n; };

// ---------- 4 giai đoạn ----------

test('bệnh đi Mệt → Bệnh nặng → Nguy kịch → Mất đúng mốc giờ vườn', () => {
  const s = game();
  const a = put(s, 'ga', { sick: 1 });
  run(s, 55 * MIN);
  assert.equal(a.sick, 1, 'chưa tới 1 giờ thì vẫn chỉ mệt');
  run(s, 10 * MIN);
  assert.equal(a.sick, 2, 'qua 1 giờ: bệnh nặng');
  run(s, 20 * MIN);
  assert.equal(a.sick, 2, 'chưa tới 1 giờ 30 thì vẫn bệnh nặng');
  run(s, 10 * MIN);
  assert.equal(a.sick, 3, 'qua 1 giờ 30: nguy kịch');
  assert.ok(G.sickLeft(a) > 0 && G.sickLeft(a) <= 15 * MIN, `đếm ngược ${G.sickLeft(a)}`);
  run(s, 11 * MIN);
  assert.equal(s.animals.length, 0, 'hết đếm ngược thì mất');
  assert.equal(G.graves(s).length, 1, 'để lại ngôi mộ');
});

test('đói lả lâu thì mắc bệnh; chuồng bẩn và tuổi già dễ bệnh hơn', () => {
  const s = game();
  const a = put(s, 'ga', { hunger: 0, starvingSince: 0 });
  for (let t = 0; t < 5 * MIN; t += MIN) { a.hunger = 0; withRandom(0.99, () => G.tick(s, MIN)); }
  assert.equal(a.sick, 1, 'đói lả quá 3 phút là bệnh');
  assert.ok(SICK.dirtyPenMul > 1 && SICK.oldChanceMul > 1);
});

// ---------- Chữa đúng cách ----------

test('Mệt: 1 liều thuốc là khỏi; Bệnh nặng: phải 2 liều; Nguy kịch: thuốc bị từ chối', () => {
  const s = game();
  give(s, 'medicine', 10);
  const a = put(s, 'ga', { sick: 1 });
  const r1 = G.giveMedicine(s, a.id);
  assert.equal(r1.ok, true); assert.equal(r1.cured, true);
  assert.equal(a.sick, 0);

  const b = put(s, 'heo', { sick: 2, sickMs: SICK.toSevere });
  const r2 = G.giveMedicine(s, b.id);
  assert.equal(r2.ok, true); assert.equal(r2.cured, false, 'một liều chưa đủ');
  assert.equal(b.sick, 2);
  const r3 = G.giveMedicine(s, b.id);
  assert.equal(r3.cured, true); assert.equal(b.sick, 0);

  const c = put(s, 'bo', { sick: 3, sickMs: SICK.toCritical });
  const r4 = G.giveMedicine(s, c.id);
  assert.equal(r4.ok, false); assert.equal(r4.reason, 'critical');
  assert.equal(c.sick, 3, 'bị từ chối thì không mất thuốc, không đổi gì');
  assert.equal(G.giveMedicine(s, put(s, 'cuu').id).reason, 'healthy', 'con khỏe thì từ chối');
});

test('bác sĩ thú y gọi từ điện thoại trong nhà: cứu được Bệnh nặng và Nguy kịch, trừ xu', () => {
  const s = game(8, SICK.vetPrice * 3);
  const a = put(s, 'ga', { sick: 3, sickMs: SICK.toCritical });
  assert.equal(G.callVet(s, a.id).reason, 'scene', 'ở ngoài vườn thì chưa gọi được');
  s.scene = 'house';
  const r = G.callVet(s, a.id);
  assert.equal(r.ok, true);
  assert.equal(a.sick, 0);
  assert.equal(s.coins, SICK.vetPrice * 2);

  const b = put(s, 'heo', { sick: 2, sickMs: SICK.toSevere });
  assert.equal(G.callVet(s, b.id).ok, true);
  assert.equal(b.sick, 0);
  s.coins = 0;
  const c = put(s, 'bo', { sick: 3, sickMs: SICK.toCritical });
  assert.equal(G.callVet(s, c.id).reason, 'coins');
  assert.equal(c.sick, 3);
});

// ---------- Lây bệnh ----------

// mulberry32: cùng hạt giống thì cùng dãy số, chạy ở máy nào cũng ra một kết quả
const seeded = seed => {
  let x = seed >>> 0;
  return () => {
    x = (x + 0x6D2B79F5) >>> 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const TRIALS = 400;

test('chuồng thường: con Bệnh nặng lây 10% mỗi 10 phút; chuồng cách ly thì không lây', () => {
  // Mỗi lần thử quay một số từ hạt giống cố định: dưới 10% thì cả lần tick đó Math.random trả 0.06
  // (dưới ngưỡng lây, vẫn trên ngưỡng tự mắc bệnh), còn lại trả 0.5 (trượt mọi xác suất).
  const trials = (pen) => {
    const s = game();
    const q = pen === 'quarantine' ? quarantinePen(s) : null;
    const a = put(s, 'ga', { sick: 2, sickMs: SICK.toSevere });
    const b = put(s, 'ga');
    G.tick(s, 1);                       // xếp chuồng
    if (q) assert.equal(G.moveAnimal(s, a.id, q).ok, true);
    const rnd = seeded(2038);
    let n = 0, low = 0;
    for (let i = 0; i < TRIALS; i++) {
      // chuồng sạch, máng đầy, bụng no, chưa già: chỉ còn lây là nguyên nhân khiến con kia bệnh
      const fresh = { age: stageStart('ga', 'truong'), stage: 'truong', hunger: 100, dirty: 0, starvingSince: 0, nextProduct: 1e15 };
      Object.assign(a, fresh, { sick: 2, sickMs: SICK.toSevere, spreadAcc: 0 });
      Object.assign(b, fresh, { sick: 0, sickMs: 0, dose: 0, tile: null });
      for (const k of Object.keys(s.manure)) s.manure[k] = 0;
      for (const k of Object.keys(s.troughs)) s.troughs[k] = 20;
      s.poops = []; s.eggs = []; s.clutch = []; s.animals = [a, b];   // chỉ hai con: con lây và con cùng chuồng
      const hit = rnd() < SICK.spread.p;
      if (hit) low++;
      withRandom(hit ? 0.06 : 0.5, () => G.tick(s, SICK.spread.everyMs));
      if (b.sick) n++;
    }
    return { n, low };
  };
  const normal = trials('chicken');
  assert.ok(normal.low > 25 && normal.low < 60, `hạt giống cố định cho ~10% của ${TRIALS}, thật ra ${normal.low}`);
  assert.equal(normal.n, normal.low, 'cứ cú quay dưới 10% là lây đúng một con cùng chuồng, không hơn không kém');
  assert.equal(trials('quarantine').n, 0, 'chuồng cách ly không lây');
});

test('chuồng cách ly: bệnh tiến triển chậm lại (hồi ×1.5); chuyển vào và ra bằng một hành động', () => {
  const s = game();
  const q = quarantinePen(s);
  const a = put(s, 'ga', { sick: 1 });
  const b = put(s, 'ga', { sick: 1 });
  run(s, 1);
  assert.equal(G.isolate(s, a.id).ok, true);
  assert.equal(s.farm.ents.find(e => e.id === a.pen).pen, 'quarantine');
  run(s, 30 * MIN);
  assert.ok(Math.abs(a.sickMs * SICK.quarantineMul - b.sickMs) < MIN, `cách ly ${a.sickMs} vs thường ${b.sickMs}`);
  assert.equal(G.isolate(s, b.id).reason, 'no_quarantine', 'chuồng cách ly cấp 1 chỉ một chỗ');
  assert.equal(G.unisolate(s, a.id).ok, true);
  assert.equal(s.farm.ents.find(e => e.id === a.pen).pen, 'chicken');
});

// ---------- Vắc-xin ----------

test('vắc-xin: tiêm một lần chống bệnh ~10 giờ vườn, tiêm được cả chuồng', () => {
  const s = game();
  give(s, 'vaccine', 5);
  const a = put(s, 'ga');
  assert.equal(G.vaccinate(s, a.id).ok, true);
  assert.equal(G.vaccinated(s, a), true);
  const before = s.simMs;
  run(s, 9 * HOUR);
  assert.equal(G.vaccinated(s, a), true, 'trong 10 giờ vẫn còn tác dụng');
  assert.equal(a.sick, 0, 'được vắc-xin che thì không mắc bệnh');
  assert.ok(a.vaccUntil - before === SICK.vaccineMs);
  run(s, 90 * MIN);
  assert.equal(G.vaccinated(s, a), false, 'quá 10 giờ thì hết');

  const t = game();
  give(t, 'vaccine', 3);
  put(t, 'ga'); put(t, 'ga'); put(t, 'ga');
  run(t, 1);
  const pen = t.animals[0].pen;
  const r = G.vaccinatePen(t, pen);
  assert.equal(r.ok, true); assert.equal(r.n, 3);
  assert.equal(t.animals.every(x => G.vaccinated(t, x)), true);
  assert.equal(G.vaccinate(t, t.animals[0].id).reason, 'no_item', 'hết vắc-xin thì báo thiếu');
});

// ---------- Con già, người mới ----------

test('con già: bệnh tiến triển nhanh gấp đôi', () => {
  const s = game();
  const old = put(s, 'ga', { sick: 1, stage: 'gia', age: stageStart('ga', 'gia') + MIN });
  const young = put(s, 'ga', { sick: 1 });
  run(s, 30 * MIN);
  assert.ok(Math.abs(old.sickMs - young.sickMs * SICK.oldMul) < MIN, `già ${old.sickMs} vs trẻ ${young.sickMs}`);
});

test('dưới cấp người chơi 5: bệnh không vượt quá Mệt', () => {
  const s = game(1);
  const a = put(s, 'ga', { sick: 1 });
  run(s, 4 * HOUR);
  assert.equal(a.sick, 1);
  assert.equal(s.animals.length, 1, 'không con nào mất vì bệnh');
});

// ---------- ADR 0004: chạy bù không giết con nào ----------

test('ADR 0004: chạy bù nhiều giờ thì bệnh dừng ở Bệnh nặng, không ai chết; chơi trực tiếp thì chuyển tiếp bình thường', () => {
  const s = game();
  const a = put(s, 'ga', { sick: 2, sickMs: SICK.toSevere });     // đang bệnh nặng
  const b = put(s, 'heo', { sick: 3, sickMs: SICK.toCritical });  // đang nguy kịch
  const c = put(s, 'bo', { hunger: 0, starvingSince: 1 });        // đói lả lâu
  const d = put(s, 'cuu', { dirty: 100 });                        // dơ lâu
  run(s, 1);
  s.savedAt = Date.now() - 8 * HOUR;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = quiet(() => G.loadGame());
  assert.equal(l.animals.length, 4, 'chạy bù 8 giờ: không con nào chết');
  for (const x of l.animals) assert.ok(x.sick <= 2, `${x.type} ở mức ${x.sick}`);
  assert.equal(l.animals.find(x => x.id === b.id).sick, 2, 'nguy kịch hạ về bệnh nặng');
  assert.equal(G.graves(l).length, 0, 'không có ngôi mộ nào');

  // cùng cảnh đó nhưng chơi trực tiếp: con nguy kịch đi tiếp rồi mất
  const t = game();
  const e = put(t, 'heo', { sick: 3, sickMs: SICK.toCritical });
  run(t, 20 * MIN);
  assert.equal(t.animals.length, 0, 'chơi trực tiếp thì đồng hồ chạy');
  assert.equal(G.graves(t).length, 1);
  assert.ok(e);
});

// ---------- Ngôi mộ và nỗi buồn ----------

test('con mất để lại ngôi mộ ở chỗ hợp lệ; đặt hoa làm cả trại hết buồn nhanh hơn', () => {
  const s = game();
  put(s, 'ga', { sick: 3, sickMs: SICK.deadAt - MIN, bond: 5, name: 'Mơ' });
  const other = put(s, 'ga');
  run(s, 2 * MIN);
  const g = G.graves(s)[0];
  assert.ok(g, 'có ngôi mộ');
  assert.equal(G.canPlace(s, { id: g.id }, g.c, g.r).ok, true, 'mộ nằm ở ô hợp lệ');
  assert.equal(G.canMove(g), true, 'mộ dời được');
  assert.equal(g.name, 'Mơ', 'con ❤️ cao thì mộ có tên');
  assert.match(G.entName(g), /Mơ/);
  assert.equal(G.grieving(s), true, 'cả trại buồn');
  assert.ok(other.happy <= SICK.griefCap);

  assert.equal(G.placeFlower(s, g.id).reason, 'no_item', 'chưa có chậu hoa thì chưa đặt được');
  give(s, 'deco_flower', 1);
  const left = s.grief.until - s.time;
  assert.equal(G.placeFlower(s, g.id).ok, true);
  assert.equal(g.flower, true);
  assert.ok(s.grief.until - s.time < left, 'hết buồn nhanh hơn');
  assert.equal(G.placeFlower(s, g.id).reason, 'done');
});

test('mọi sự kiện bệnh có mức và khóa gộp riêng theo con', () => {
  for (const t of ['sick', 'sickSevere', 'sickCritical', 'died', 'cured', 'grave']) {
    const m = EVENT_LEVEL[t];
    assert.ok(m, `thiếu ${t}`);
    assert.ok(['urgent', 'important', 'info', 'none'].includes(m.level), `${t} mức lạ: ${m.level}`);
    assert.equal(typeof m.group, 'function', `${t} thiếu khóa gộp`);
  }
  assert.equal(EVENT_LEVEL.sickSevere.level, 'urgent');
  assert.equal(EVENT_LEVEL.sickCritical.level, 'urgent');
  assert.notEqual(EVENT_LEVEL.sickSevere.group({ animal: 'Gà' }), EVENT_LEVEL.sickSevere.group({ animal: 'Heo' }));
});

test('con bệnh nặng là việc gấp, có mũi tên chỉ hướng; con mệt thì không gấp', () => {
  const s = game();
  const a = put(s, 'ga', { sick: 1, x: 100, y: 100 });
  assert.deepEqual(G.urgentSpots(s), []);
  a.sick = 2;
  const spots = G.urgentSpots(s);
  assert.equal(spots.length, 1);
  assert.match(spots[0].text, /bệnh nặng/);
  a.sick = 3;
  assert.match(G.urgentSpots(s)[0].text, /nguy kịch/);
});
