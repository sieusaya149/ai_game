// Mèo bắt chuột (issue 44, ADR 0004 + 0013), qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { CAT, PREDATOR as P, DAY_MS, ANIMALS, LIFE, MAX_CATCHUP_MS, BUILD_PRICES } from '../public/data.js';
import { mapOf } from '../public/farm.js';

const MIN = 60_000, HOUR = 60 * MIN, TS = 16;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
// Math.random có hạt giống cố định (mulberry32) để chạy lại ra cùng kết quả
const seeded = (seed, fn) => {
  const r = Math.random; let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = r; }
};
const NOON = DAY_MS * 0.3;   // 13h12: ban ngày, mèo ở ngoài vườn

// Ô trống trong đất để đặt công trình
const freeTile = (s, what) => {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (G.canPlace(s, what, c, r).ok) return { c, r };
  throw new Error('không còn chỗ trống');
};
// Vườn đã qua bảo hộ người mới, không con vật, không đơn hàng, đã có nhà mèo
const newGame = (withHouse = true) => {
  const s = G.createGame({ name: 'Hùng' });
  s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.time = NOON; s.coins = 1e6; s.exp = 5000;
  s.duskDay = s.day;
  if (withHouse) {
    const t = freeTile(s, { kind: 'cathouse' });
    const r = G.placeEntity(s, { kind: 'cathouse' }, t.c, t.r);
    assert.equal(r.ok, true, r.msg);
  }
  return s;
};
const addCat = (s, stage = 'truong', extra) => {
  const r = G.buyCat(s, 'f');
  assert.equal(r.ok, true, r.msg);
  const c = G.cats(s).at(-1);
  Object.assign(c, { stage, age: G.stageStart('meo', stage), ...extra });
  return c;
};
// Ô trống gần nhà để thả chuột vào (chuột đứng yên vì tileAt rất xa)
function tileNear(s) {
  const m = mapOf(s), o = s.farm.owned;
  for (let r = o.r + 1; r < o.r + o.h; r++) for (let c = o.c + 1; c < o.c + o.w; c++) if (m.isOwned(c, r) && !m.isSolid(c, r)) return [c, r];
  throw new Error('không có ô trống');
}
const putRat = (s, c, r) => {
  const p = { id: s.nextId++, kind: 'rat', state: 'hunt', since: s.time, warned: false, strikeAt: s.time + 1e9,
    tile: { c, r }, x: c * TS + 8, y: r * TS + 8, tx: c * TS + 8, ty: r * TS + 8, tileAt: s.time + 1e9, target: null };
  s.preds.push(p);
  return p;
};
// Chạy `ms`, giữ mèo đúng giai đoạn, khỏe, ở mức đói `hunger` và luôn đủ `rats` con chuột trong trại.
// Trả về số lần bắt được, để đo nhịp săn mà không bị tuổi tác hay bệnh làm nhiễu.
function hunt(s, cat, ms, hunger, rats = 4, step = 10_000) {
  let got = 0;
  const [c0, r0] = tileNear(s), stage = cat.stage;
  for (let t = 0; t < ms; t += step) {
    if (hunger != null) cat.hunger = hunger;
    cat.sick = 0; cat.stage = stage; cat.age = G.stageStart('meo', stage);
    while (s.preds.filter(p => p.kind === 'rat').length < rats) putRat(s, c0 + (s.preds.length % 3), r0);
    got += G.tick(s, Math.min(step, ms - t)).filter(e => e.type === 'catRat').length;
  }
  return got;
}

test('nhà mèo: mua mèo bị từ chối khi chưa có nhà mèo, có rồi thì mua được và hết chỗ thì thôi', () => {
  const s = newGame(false);
  assert.equal(G.catHouses(s).length, 0);
  const no = G.buyCat(s);
  assert.equal(no.ok, false);
  assert.equal(no.reason, 'no_pen');
  assert.match(no.msg, /nhà mèo/i);
  assert.equal(G.buyAnimal(s, 'meo', 'f').ok, false, 'mua qua bảng loài cũng bị từ chối');
  // xây nhà mèo rồi mới mua được
  const t = freeTile(s, { kind: 'cathouse' });
  const coins = s.coins;
  assert.equal(G.placeEntity(s, { kind: 'cathouse' }, t.c, t.r).ok, true);
  assert.equal(coins - s.coins, BUILD_PRICES.cathouse);
  assert.equal(G.catHouses(s).length, 1);
  assert.equal(G.catCap(s), 1, 'nhà mèo cấp 1 chứa 1 con');
  const ok = G.buyAnimal(s, 'meo', 'f');
  assert.equal(ok.ok, true, ok.msg);
  assert.equal(G.cats(s).length, 1);
  assert.equal(G.cats(s)[0].stage, 'non', 'mua về là mèo con');
  const full = G.buyCat(s);
  assert.equal(full.ok, false);
  assert.equal(full.reason, 'full');
  // nâng nhà mèo lên cấp 2 thì thêm được một con
  const up = G.upgradePen(s, G.catHouses(s)[0].id);
  assert.equal(up.ok, true, up.msg);
  assert.equal(G.catCap(s), 2);
  assert.equal(G.buyCat(s).ok, true);
});

test('mèo đói vừa phải bắt chuột khoảng mỗi 10 phút; no quá thì nằm phơi nắng không săn', () => {
  const s = newGame();
  const cat = addCat(s, 'truong');
  const got = seeded(101, () => hunt(s, cat, 200 * MIN, 45));
  // ~1 con mỗi 10 phút ban ngày (ban đêm mèo vào nhà ngủ): 200 phút ≈ 15 con
  assert.ok(got >= 8 && got <= 28, `bắt được ${got} con trong 200 phút`);
  assert.equal(s.stats.rats, got, 'mỗi con bắt được đều vào thống kê');

  const s2 = newGame();
  const fat = addCat(s2, 'truong');
  const none = seeded(102, () => hunt(s2, fat, 200 * MIN, 100));
  assert.equal(none, 0, 'cho ăn no quá thì mèo lười, không săn');
  assert.equal(fat.sun, true, 'mèo no nằm phơi nắng');
});

test('mèo con chưa biết săn, mèo nhỡ bắt ít hơn, mèo già chỉ bắt khi đói', () => {
  const kitten = (() => { const s = newGame(); const c = addCat(s, 'non'); return seeded(103, () => hunt(s, c, 150 * MIN, 45)); })();
  assert.equal(kitten, 0, 'mèo con chỉ vờn đuôi, chưa bắt được chuột');

  const teen = (() => { const s = newGame(); const c = addCat(s, 'nho'); return seeded(104, () => hunt(s, c, 300 * MIN, 45)); })();
  const adult = (() => { const s = newGame(); const c = addCat(s, 'truong'); return seeded(104, () => hunt(s, c, 300 * MIN, 45)); })();
  assert.ok(teen > 0, 'mèo nhỡ tập vồ, cũng bắt được chuột nhỏ');
  assert.ok(teen < adult, `mèo nhỡ (${teen}) bắt ít hơn mèo trưởng thành (${adult})`);

  const lazyOld = (() => { const s = newGame(); const c = addCat(s, 'gia'); return seeded(105, () => hunt(s, c, 200 * MIN, 70)); })();
  const hungryOld = (() => { const s = newGame(); const c = addCat(s, 'gia'); return seeded(105, () => hunt(s, c, 200 * MIN, 20)); })();
  assert.equal(lazyOld, 0, 'mèo già no bụng thì nằm ì');
  assert.ok(hungryOld > 0, 'mèo già đói thì vẫn đi bắt chuột');
});

test('mèo lớn qua 4 giai đoạn và không bao giờ chết vì già', () => {
  assert.equal(LIFE.meo.gia, Infinity);
  const s = newGame();
  const cat = addCat(s, 'non');
  const seen = new Set([cat.stage]);
  seeded(106, () => {
    for (let t = 0; t < 100 * HOUR; t += 5 * MIN) { cat.hunger = 80; cat.sick = 0; G.tick(s, 5 * MIN); seen.add(cat.stage); }
  });
  assert.deepEqual([...seen], ['non', 'nho', 'truong', 'gia']);
  assert.equal(G.cats(s).length, 1, 'mèo không chết vì già');
});

test('có mèo thì chuột ít hẳn đi, và không bao giờ quá 8 con', () => {
  const run = withCat => {
    const s = newGame();
    if (withCat) { const c = addCat(s, 'truong'); c.hunger = 50; }
    let peak = 0;
    seeded(107, () => {
      for (let t = 0; t < 40 * HOUR; t += MIN) {
        for (const c of G.cats(s)) { c.hunger = 50; c.sick = 0; }
        G.tick(s, MIN);
        peak = Math.max(peak, s.preds.filter(p => p.kind === 'rat').length);
      }
    });
    return { end: s.preds.filter(p => p.kind === 'rat').length, peak };
  };
  const without = run(false), withCat = run(true);
  assert.ok(without.peak <= P.rat.max && withCat.peak <= P.rat.max, `không quá ${P.rat.max} con chuột`);
  assert.equal(without.end, P.rat.max, 'không có mèo thì chuột đầy trại');
  assert.ok(withCat.end < without.end, `có mèo thì chuột ít hơn hẳn: ${withCat.end} < ${without.end}`);
});

test('mèo bắt được chuột thì mang tới khoe, chạm để khen thì vui và thân hơn', () => {
  const s = newGame();
  const cat = addCat(s, 'truong');
  seeded(108, () => { for (let i = 0; i < 400 && !cat.trophy; i++) hunt(s, cat, 10_000, 45); });
  assert.ok(cat.trophy, 'mèo đang ngậm chiến lợi phẩm tới khoe');
  assert.deepEqual(G.catTrophies(s).map(c => c.id), [cat.id]);
  cat.happy = 40;
  const t = { kind: 'cat', id: cat.id };
  const acts = G.actionsFor(s, t);
  assert.equal(acts[0].id, 'praise', 'khoe chuột thì khen là hành động chính');
  const was = cat.bondXp + (cat.bond - 1) * 20;
  const r = G.perform(s, t, 'praise');
  assert.equal(r.ok, true, r.msg);
  assert.ok(cat.happy > 40, 'được khen thì vui hơn');
  assert.ok(cat.bondXp + (cat.bond - 1) * 20 > was, 'được khen thì thân hơn');
  assert.equal(cat.trophy, null, 'khoe xong thì thôi');
});

test('mèo chỉ lùa 1 con gần nhất về chuồng, và chỉ khi đang vui', () => {
  const s = newGame();
  const cat = addCat(s, 'truong');
  const roam = G.roamOf(s).tiles;
  const far = [roam[0], roam[Math.floor(roam.length / 2)], roam[roam.length - 1]];
  const birds = far.map((t, i) => {
    const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type: 'ga', name: 'Gà ' + i, stage: 'truong',
      age: G.stageStart('ga', 'truong'), sex: 'f', nextProduct: 1e15, ready: false, stray: true, tile: { ...t }, tileAt: s.time + 1e9, x: t.c * TS + 8, y: t.r * TS + 8 };
    s.animals.push(a);
    return a;
  });
  assert.equal(G.outOfPen(s).length, 3);
  // đang buồn thì mèo kệ
  cat.happy = 10;
  const sad = G.catHerd(s, cat.id);
  assert.equal(sad.ok, false);
  assert.equal(sad.reason, 'mood');
  assert.equal(G.outOfPen(s).length, 3, 'không con nào bị lùa');
  // đang vui: đúng một con, là con gần mèo nhất
  cat.happy = 100;
  Object.assign(cat, { x: birds[1].x, y: birds[1].y, tile: { ...birds[1].tile } });
  const r = G.catHerd(s, cat.id);
  assert.equal(r.ok, true, r.msg);
  assert.equal(r.n, 1, 'mèo chỉ lùa 1 con');
  assert.equal(birds[1].tile, null, 'con gần mèo nhất đã về chuồng');
  assert.equal(G.outOfPen(s).length, 2);
});

test('mèo không học được lệnh nào', () => {
  const s = newGame();
  const cat = addCat(s, 'truong');
  const ids = G.actionsFor(s, { kind: 'cat', id: cat.id }).map(a => a.id);
  assert.equal(ids.some(i => i === 'train' || i.startsWith('cmd_')), false, `mèo không có hành động dạy lệnh: ${ids}`);
  assert.equal(G.perform(s, { kind: 'cat', id: cat.id }, 'train').ok, false);
  assert.equal(G.trickList(s).length > 0, true, 'bảng lệnh vẫn là của chó');
});

test('tối mèo vào nhà ngủ qua cửa mèo, sáng ra lại ra vườn', () => {
  const s = newGame();
  const cat = addCat(s, 'truong');
  assert.ok(mapOf(s).catDoor, 'nhà có cửa mèo');
  seeded(109, () => G.tick(s, MIN));
  assert.equal(cat.scene, 'farm');
  assert.equal(cat.sleep, false);
  // tua tới ban đêm: mèo đi tới cửa mèo trên nhà trước, chui qua rồi mới vào bản đồ nhà
  seeded(110, () => { while (!G.isNight(s)) G.tick(s, 1000); });
  const door = mapOf(s).catDoor;
  assert.equal(cat.scene, 'farm', 'vừa tối thì mèo còn đang đi về');
  assert.deepEqual({ x: cat.tx, y: cat.ty }, { x: door.x, y: door.y }, 'mèo đi về phía cửa mèo');
  seeded(110, () => G.tick(s, CAT.doorMs + 1000));
  assert.equal(cat.scene, 'house', 'tối mèo ngủ trong bản đồ nhà');
  assert.equal(cat.sleep, true);
  assert.deepEqual(G.catsIn(s, 'house').map(c => c.id), [cat.id]);
  assert.deepEqual(G.catsIn(s, 'farm'), []);
  // sang ngày mới thì ra vườn lại
  seeded(111, () => { while (G.isNight(s)) G.tick(s, MIN); G.tick(s, MIN); });
  assert.equal(cat.scene, 'farm');
  assert.deepEqual(G.catsIn(s, 'farm').map(c => c.id), [cat.id]);
});

test('luật chỉ chọn ô cho mèo đi tuần và vồ chuột, bước đi là việc của world.js (không nhảy cóc)', () => {
  const s = newGame();
  const cat = addCat(s, 'truong', { hunger: 100 });
  const x0 = cat.x, y0 = cat.y;
  seeded(120, () => G.tick(s, 1000));
  assert.ok(cat.tile, 'luật đã chọn ô đi tuần');
  assert.deepEqual({ x: cat.tx, y: cat.ty }, { x: cat.tile.c * TS + 8, y: cat.tile.r * TS + 8 });
  assert.deepEqual({ x: cat.x, y: cat.y }, { x: x0, y: y0 }, 'luật không dời mèo tới đó ngay');
  // tới lượt rình: nhắm đúng ô con chuột
  const [c0, r0] = tileNear(s), rat = putRat(s, c0, r0);
  Object.assign(cat, { hunger: 45, huntAt: s.time });
  seeded(121, () => G.tick(s, 1000));
  assert.deepEqual({ x: cat.tx, y: cat.ty }, { x: rat.x, y: rat.y }, 'mèo lao tới ô con chuột');
});

test('mèo với chó thỉnh thoảng cãi nhau: vui thôi, không đổi chỉ số nào', () => {
  const s = newGame();
  const cat = addCat(s, 'truong');
  s.dog.stage = 'truong';
  Object.assign(s.dog, { x: cat.x, y: cat.y });
  const snap = () => ({ happy: Math.round(cat.happy), bond: cat.bond, dogHappy: Math.round(s.dog.happy), animals: s.animals.length });
  cat.happy = 80; s.dog.happy = 80;
  let spats = 0;
  const before = snap();
  seeded(112, () => {
    for (let t = 0; t < 60 * MIN; t += 10_000) {
      cat.hunger = 50; cat.happy = 80; s.dog.happy = 80; s.dog.hunger = 80;
      Object.assign(s.dog, { x: cat.x, y: cat.y });
      spats += G.tick(s, 10_000).filter(e => e.type === 'catSpat').length;
    }
  });
  assert.ok(spats > 0, 'có cãi nhau vài lần');
  assert.deepEqual(snap(), before, 'cãi nhau không đổi chỉ số quan trọng nào');
});

test('cho mèo ăn và vuốt ve: no, vui và thân hơn; mèo không có hành động tắm', () => {
  const s = newGame();
  const cat = addCat(s, 'truong', { hunger: 20, happy: 30 });
  s.inv.catfood = 2;
  const t = { kind: 'cat', id: cat.id };
  const ids = G.actionsFor(s, t).map(a => a.id);
  assert.equal(ids[0], 'feed', 'mèo đói thì cho ăn là hành động chính');
  assert.equal(ids.includes('bath'), false, 'mèo không bị dơ nên không có nút tắm');
  assert.equal(G.perform(s, t, 'feed').ok, true);
  assert.equal(cat.hunger, 100);
  assert.equal(s.inv.catfood, 1);
  assert.equal(G.perform(s, t, 'pet').ok, true);
  assert.ok(cat.happy > 30);
  assert.equal(cat.dirty, undefined, 'mèo không có độ dơ');
  // đổi tên dùng chung hàm với vật nuôi
  assert.equal(G.renameAnimal(s, cat.id, 'Mun').ok, true);
  assert.equal(cat.name, 'Mun');
  assert.match(G.animalLabel(cat), /^Mun ♀ · Trưởng thành$/);
});

test('ADR 0004: chạy bù offline có mèo và chuột thì chuột ít đi, không con nào chết', () => {
  const s = newGame();
  s.time = DAY_MS * 0.05;
  s.troughs.chicken = 20;
  const cat = addCat(s, 'truong', { hunger: 50 });
  s.inv.vaccine = 1;
  assert.equal(G.vaccinate(s, cat.id).ok, true, 'tiêm vắc-xin cho mèo được, nó khỏe suốt lúc mình vắng');
  const tpl = G.createGame().animals[0];
  for (let i = 0; i < 5; i++) s.animals.push({ ...structuredClone(tpl), id: s.nextId++, type: 'ga', name: 'Gà', stage: 'non', age: 0, sex: 'f', nextProduct: 1e15, ready: false });
  const [c0, r0] = tileNear(s);
  for (let i = 0; i < P.rat.max; i++) putRat(s, c0 + (i % 3), r0);
  const ids = s.animals.map(a => a.id), rats0 = s.preds.length;
  s.savedAt = Date.now() - 8 * HOUR;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = seeded(113, () => G.loadGame());
  assert.equal(G.cats(l).length, 1, 'mèo vẫn còn');
  for (const id of ids) assert.ok(l.animals.some(a => a.id === id), `con ${id} vẫn sống sau khi chạy bù`);
  assert.equal(l.animals.filter(a => a.hurt).length, 0, 'chạy bù không có con nào bị cắn');
  assert.ok(l.stats.rats > 0, 'mèo có bắt chuột lúc chạy bù');
  assert.ok(l.preds.filter(p => p.kind === 'rat').length < rats0, `chuột ít đi: ${l.preds.length} < ${rats0}`);
  assert.ok(MAX_CATCHUP_MS >= 8 * HOUR);
});

test('mèo có trong bảng loài, mua ở chợ Bà Tư, không bán được và không cho sản phẩm', () => {
  assert.ok(ANIMALS.meo && ANIMALS.meo.pet);
  assert.equal(ANIMALS.meo.product, null);
  assert.equal(CAT.catchChance.truong > CAT.catchChance.nho, true);
  const s = newGame();
  s.time = DAY_MS * 0.9;   // chợ đã đóng cửa
  const shut = G.buyCat(s);
  assert.equal(shut.ok, false, 'chợ đóng thì không mua được mèo');
  s.time = NOON;
  s.exp = 0;   // chưa đủ cấp
  const low = G.buyCat(s);
  assert.equal(low.ok, false);
  assert.match(low.msg, new RegExp(`cấp ${ANIMALS.meo.lv}`));
});
