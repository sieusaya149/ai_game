// Đực/cái, sinh sản, trứng có phôi, tên và phả hệ (issue 36), qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { ANIMALS, BREED, HUSBANDRY, DAY_MS, levelInfo, animalPrice } from '../public/data.js';

const MIN = 60_000, HOUR = 60 * MIN;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

// Ngẫu nhiên có hạt giống (mulberry32): thống kê lặp lại được
const seeded = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const withRandom = (v, fn) => { const r = Math.random; Math.random = typeof v === 'function' ? v : () => v; try { return fn(); } finally { Math.random = r; } };
const quiet = fn => withRandom(0.99, fn);   // không bệnh, không sâu, không quạ, không phôi

const game = () => {
  const s = G.createGame({ name: 'Chủ trại' });
  s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.coins = 100000; s.exp = 0;
  s.farm.owned = { c: 10, r: 8, w: 50, h: 38 }; G.bumpLayout?.(s); s.farm.rev++;
  while (levelInfo(s.exp).level < 10) s.exp += 50;
  return s;
};
const addPen = (s, pen, c, r) => { const x = G.placeEntity(s, { kind: 'pen', pen }, c, r); assert.equal(x.ok, true, x.msg); return s.farm.ents.find(e => e.id === x.id); };
const coop = s => s.farm.ents.find(e => e.kind === 'pen' && e.pen === 'chicken');
// Con vật theo đúng hình dạng v3, ở chuồng loại của nó
const put = (s, type, sex, stage = 'truong', extra) => {
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type, name: ANIMALS[type].name, sex, stage, age: G.stageStart(type, stage), nextProduct: 0, ready: false, x: 100, y: 100, ...extra };
  s.animals.push(a);
  return a;
};
// no, vui, khỏe và sạch (lát 37: heo, bò lăn bùn thì dơ, dơ thì dễ bệnh gấp đôi; ở đây giữ chưa lăn bùn lại),
// và luôn ở trong chuồng (lát 46: con ngủ ngoài chuồng thì chồn hương bắt mất)
const feed = s => { for (const k of Object.keys(s.troughs)) s.troughs[k] = 20; for (const a of s.animals) { a.hunger = 100; a.happy = 100; a.sick = 0; a.dirty = 0; a.wallowAt = 1e15; a.tile = null; a.stray = false; } };
const run = (s, ms, rand = 0.99) => {
  const ev = [];
  for (let t = 0; t < ms; t += MIN) { feed(s); ev.push(...withRandom(rand, () => G.tick(s, Math.min(MIN, ms - t)))); }
  return ev;
};

test('con cái đắt hơn con đực khoảng 30%; mua đúng giới tính và trừ đúng xu', () => {
  for (const type of Object.keys(ANIMALS)) {
    const r = animalPrice(type, 'f') / animalPrice(type, 'm');
    assert.ok(r > 1.27 && r < 1.33, `${type} ×${r}`);
  }
  const s = game(); s.time = 0.1 * DAY_MS;
  const c0 = s.coins;
  const m = G.buyAnimal(s, 'ga', 'm'), f = G.buyAnimal(s, 'ga', 'f');
  assert.ok(m.ok && f.ok);
  assert.equal(c0 - s.coins, animalPrice('ga', 'm') + animalPrice('ga', 'f'));
  assert.deepEqual(s.animals.map(a => a.sex), ['m', 'f']);
  assert.equal(G.buyAnimal(s, 'ga', 'x').ok, false);
  s.coins = animalPrice('ga', 'f') - 1;
  assert.equal(G.buyAnimal(s, 'ga', 'f').ok, false, 'không đủ xu cho con cái');
  assert.equal(G.buyAnimal(s, 'ga', 'm').ok, true, 'vẫn đủ xu cho con đực');
});

test('gà trống: có trống trưởng thành thì ~40% trứng có phôi, không trống thì 0%', () => {
  const count = withRooster => {
    const s = game(), hens = [put(s, 'ga', 'f'), put(s, 'ga', 'f'), put(s, 'ga', 'f')];
    if (withRooster) put(s, 'ga', 'm');
    let eggs = 0, fertile = 0;
    withRandom(seeded(7), () => {
      for (let i = 0; i < 700; i++) {
        feed(s); for (const a of s.animals) a.age = G.stageStart('ga', 'truong');   // giữ ở tuổi trưởng thành
        G.tick(s, MIN);
        for (const e of s.eggs) { eggs++; if (e.fertile) fertile++; }
        s.eggs.length = 0;
      }
    });
    return { eggs, rate: fertile / eggs, hens };
  };
  const a = count(true), b = count(false);
  assert.ok(a.eggs > 500, `đủ mẫu: ${a.eggs}`);
  assert.ok(a.rate > 0.34 && a.rate < 0.46, `tỉ lệ có phôi ${a.rate}`);
  assert.equal(b.rate, 0);
});

test('gà trống con chưa tính; trống không đẻ trứng; trứng ghi mẹ và cha', () => {
  const s = game();
  const hen = put(s, 'ga', 'f'), baby = put(s, 'ga', 'm', 'non'), roo = put(s, 'ga', 'm');
  run(s, 3 * MIN, 0.99);
  assert.ok(s.eggs.length >= 1 && s.eggs.every(e => e.mom.id === hen.id), 'chỉ gà mái đẻ');
  s.eggs.length = 0;
  baby.age = G.stageStart('ga', 'non');
  withRandom(0.0001, () => { feed(s); G.tick(s, 3 * MIN); });
  assert.ok(s.eggs.length >= 1 && s.eggs.every(e => e.fertile && e.dad.id === roo.id && e.mom.id === hen.id));
  s.animals.splice(s.animals.indexOf(roo), 1);
  s.eggs.length = 0; hen.nextProduct = 0;
  withRandom(0.0001, () => { feed(s); G.tick(s, 3 * MIN); });
  assert.ok(s.eggs.length >= 1 && s.eggs.every(e => !e.fertile), 'còn mỗi gà trống con: không có phôi');
});

test('soi trứng: biết có phôi hay không; nhặt trứng có phôi ra món riêng', () => {
  const s = game();
  s.eggs.push({ id: 900, x: 10, y: 10, laidAt: 0, fertile: true, mom: { id: 5, name: 'Bông' }, dad: { id: 6, name: 'Cu' } }, { id: 901, x: 20, y: 10, laidAt: 0, fertile: false });
  const acts = id => G.actionsFor(s, { kind: 'egg', id }).map(a => a.id);
  assert.deepEqual(acts(900), ['candle', 'collect']);
  const r = G.perform(s, { kind: 'egg', id: 900 }, 'candle');
  assert.ok(r.ok && r.fertile === true);
  assert.deepEqual(acts(900), ['collect']);
  assert.equal(G.perform(s, { kind: 'egg', id: 901 }, 'candle').fertile, false);
  G.perform(s, { kind: 'egg', id: 900 }, 'collect'); G.perform(s, { kind: 'egg', id: 901 }, 'collect');
  assert.equal(s.basket.trung_phoi, 1);
  assert.equal(s.basket.trung, 1);
  // chưa soi mà nhặt: không biết có phôi, thành trứng thường
  s.eggs.push({ id: 902, x: 10, y: 10, laidAt: 0, fertile: true });
  G.perform(s, { kind: 'egg', id: 902 }, 'collect');
  assert.equal(s.basket.trung, 2);
});

test('ổ ấp chỉ nhận trứng có phôi, nở thành gà con có tên và cha mẹ', () => {
  const s = game();
  const nest = { kind: 'nest' };
  s.inv.trung = 3;
  assert.ok(G.actionsFor(s, nest)[0].disabled, 'trứng thường bị từ chối');
  assert.equal(G.perform(s, nest, 'incubate').ok, false);
  assert.equal(s.nest.egg, false); assert.equal(s.inv.trung, 3);
  s.eggs.push({ id: 900, x: 10, y: 10, laidAt: 0, fertile: true, mom: { id: 5, name: 'Bông' }, dad: { id: 6, name: 'Cu' } });
  G.perform(s, { kind: 'egg', id: 900 }, 'candle'); G.perform(s, { kind: 'egg', id: 900 }, 'collect');
  assert.equal(G.perform(s, nest, 'incubate').ok, true);
  assert.equal(s.inv.trung_phoi ?? s.basket.trung_phoi ?? 0, 0);
  run(s, HUSBANDRY.nestHatchMs + 1000);
  assert.equal(s.nest.egg, false);
  assert.equal(s.animals.length, 1);
  const c = s.animals[0];
  assert.equal(c.stage, 'non'); assert.equal(c.name, 'Bông con');
  assert.deepEqual([c.mom, c.dad], [{ id: 5, name: 'Bông' }, { id: 6, name: 'Cu' }]);
  assert.ok(c.sex === 'm' || c.sex === 'f');
});

test('con đẻ trong trại: giới tính xấp xỉ 50/50', () => {
  const s = game();
  const n = { m: 0, f: 0 }, rand = seeded(11);
  withRandom(rand, () => {
    for (let i = 0; i < 400; i++) {
      s.eggs.length = 0; s.nest.egg = false;
      s.basket.trung_phoi = 1; s.clutch.length = 0;
      G.perform(s, { kind: 'nest' }, 'incubate');
      G.tick(s, HUSBANDRY.nestHatchMs + 1000);
      for (const a of s.animals.splice(0)) n[a.sex]++;
    }
  });
  assert.equal(n.m + n.f, 400);
  assert.ok(n.m > 160 && n.m < 240, `đực ${n.m}`);
});

test('trứng bỏ quên chỉ nở khi có phôi', () => {
  const s = game();
  s.eggs.push({ id: 900, x: 60, y: 300, laidAt: 0, fertile: false }, { id: 901, x: 70, y: 300, laidAt: 0, fertile: true });
  withRandom(0.0001, () => G.tick(s, HUSBANDRY.eggForgetMs + 2000));
  assert.deepEqual(s.eggs.map(e => e.id), [900]);
  assert.equal(s.animals.length, 1);
});

test('chuồng gà cấp 3: ổ ấp tự động nhận trứng có phôi, bỏ qua trứng trống', () => {
  const s = game(), pen = coop(s);
  pen.lv = 3; G.bumpLayout?.(s); s.farm.rev++;
  const ft = G.footprint(pen), x = ft.c * 16 + 8, y = ft.r * 16 + 8;
  s.eggs.push({ id: 900, x, y, laidAt: 0, fertile: false }, { id: 901, x: x + 2, y, laidAt: 0, fertile: true, mom: { id: 5, name: 'Mơ' }, dad: null });
  quiet(() => G.tick(s, 1000));
  assert.deepEqual(s.eggs.map(e => e.id), [900]);
  quiet(() => G.tick(s, HUSBANDRY.nestHatchMs + 1000));
  assert.equal(s.animals.length, 1);
  assert.equal(s.animals[0].name, 'Mơ con');
});

const pigGame = (lv = 1) => { const s = game(); const e = addPen(s, 'pig', 46, 10); e.lv = lv; G.bumpLayout?.(s); s.farm.rev++; return s; };
const pigs = s => s.animals.filter(a => a.type === 'heo');

test('heo: chỉ có nái hoặc chỉ có đực thì không mang bầu; đủ cặp no vui thì mang bầu rồi đẻ 1-3 con', () => {
  for (const sexes of [['f', 'f'], ['m', 'm']]) {
    const s = pigGame(); for (const x of sexes) put(s, 'heo', x);
    run(s, 40 * MIN, 0.0001);
    assert.equal(pigs(s).filter(a => a.pregnant).length, 0, sexes.join());
  }
  const s = pigGame(), sow = put(s, 'heo', 'f', 'truong', { name: 'Bông' }), boar = put(s, 'heo', 'm', 'truong', { name: 'Ủn' });
  boar.hunger = 100;
  sow.hunger = 20;   // đói thì không
  withRandom(0.0001, () => G.tick(s, MIN));
  assert.equal(sow.pregnant, false);
  const ev = run(s, 5 * MIN, 0.0001);
  assert.equal(sow.pregnant, true);
  assert.equal(sow.mate.id, boar.id);
  sow.dueAt = s.time + 1000;
  run(s, 2 * MIN, 0.5);
  const kids = pigs(s).filter(a => a.stage === 'non');
  assert.ok(kids.length >= 1 && kids.length <= 3);
  assert.equal(sow.pregnant, false);
  for (const k of kids) { assert.equal(k.name, 'Bông con'); assert.deepEqual(k.mom, { id: sow.id, name: 'Bông' }); assert.deepEqual(k.dad, { id: boar.id, name: 'Ủn' }); }
});

test('nái già đẻ ít con hơn nái trưởng thành', () => {
  const avg = stage => {
    let total = 0, n = 0;
    withRandom(seeded(3), () => {
      for (let i = 0; i < 150; i++) {
        const s = pigGame(3), sow = put(s, 'heo', 'f', stage), boar = put(s, 'heo', 'm');
        sow.pregnant = true; sow.dueAt = 0; sow.mate = { id: boar.id, name: boar.name };
        feed(s); G.tick(s, 1000);
        total += pigs(s).filter(a => a.stage === 'non').length; n++;
      }
    });
    return total / n;
  };
  const a = avg('truong'), b = avg('gia');
  assert.ok(a > 1.7 && a < 2.3, `trưởng thành ${a}`);
  assert.ok(b > 1.3 && b < 1.7, `già ${b}`);
});

const pastureGame = () => { const s = game(); const e = addPen(s, 'pasture', 46, 20); e.lv = 3; G.bumpLayout?.(s); s.farm.rev++; return s; };

test('bò đực + bò cái chung chuồng: khoảng mỗi 10 giờ vườn một bê con; cừu 8 giờ', () => {
  for (const [type, every] of [['bo', 10], ['cuu', 8]]) {
    const s = pastureGame(), cow = put(s, type, 'f', 'truong', { name: 'Mướp' }), bull = put(s, type, 'm');
    const kids = () => s.animals.filter(a => a.mom?.id === cow.id).length;   // con của cô bò này (con gái lớn nhanh cũng sẽ đẻ)
    run(s, (every - 1) * HOUR);
    assert.equal(kids(), 0, `${type} chưa tới ${every} giờ`);
    run(s, 2 * HOUR);
    assert.equal(kids(), 1, `${type} đẻ sau ${every} giờ`);
    const k = s.animals.find(a => a.mom);
    assert.deepEqual([k.name, k.mom.id, k.dad.id], ['Mướp con', cow.id, bull.id]);
    run(s, every * HOUR);
    assert.equal(s.animals.filter(a => a.mom?.id === cow.id).length, 2, `${type} đẻ lứa kế`);
    assert.ok(G.animalLabel(k).includes(k.sex === 'm' ? '♂' : '♀'));
  }
  const s = pastureGame(); put(s, 'bo', 'f'); put(s, 'bo', 'f');
  run(s, 12 * HOUR);
  assert.equal(s.animals.filter(a => a.mom).length, 0, 'không có đực thì không đẻ');
});

test('chuồng đầy thì không sinh sản và hiện lý do "Chuồng đầy"', () => {
  const s = game(), e = addPen(s, 'pasture', 46, 20);   // cấp 1: chứa 3
  const cow = put(s, 'bo', 'f'), bull = put(s, 'bo', 'm'); put(s, 'cuu', 'm');
  assert.equal(G.penCap(s, 'pasture'), 3);
  const ev = run(s, 12 * HOUR);
  assert.equal(s.animals.length, 3);
  assert.equal(cow.pregnant, false);
  assert.ok(ev.some(x => x.type === 'fx' && /Chuồng đầy/.test(x.text)));
  assert.equal(G.breedNote(s, cow), 'Chuồng đầy');
  assert.equal(G.breedNote(s, bull), null);
  G.upgradePen(s, e.id);   // nâng chuồng: hết đầy, đẻ được
  run(s, 12 * HOUR);
  assert.ok(s.animals.length > 3);
  // nái đang chờ đẻ mà chuồng đầy thì đứng đợi, không mất
  const p = pigGame(), sow = put(p, 'heo', 'f'); put(p, 'heo', 'm'); put(p, 'heo', 'm');
  sow.pregnant = true; sow.dueAt = 0;
  run(p, 2 * MIN);
  assert.equal(pigs(p).length, 3); assert.equal(sow.pregnant, true);
});

test('chuồng cách ly không sinh sản; khác chuồng không thành đôi', () => {
  const s = pigGame(), q = addPen(s, 'quarantine', 46, 30);
  const sow = put(s, 'heo', 'f'), boar = put(s, 'heo', 'm');
  G.moveAnimal(s, sow.id, q.id);
  run(s, 30 * MIN, 0.0001);
  assert.equal(sow.pregnant, false);
});

test('vườn đóng băng thì không sinh sản (chỉ giờ vườn đã chạy mới tính)', () => {
  const s = pastureGame(), cow = put(s, 'bo', 'f'), bull = put(s, 'bo', 'm');
  run(s, MIN);
  assert.equal(cow.pregnant, true);
  cow.dueAt = s.time + 10 * HOUR;
  s.savedAt = Date.now() - 20 * HOUR;   // vắng 20 giờ: chỉ 8 giờ chạy bù, 12 giờ đóng băng
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = quiet(() => G.loadGame());
  assert.equal(l.animals.filter(a => a.mom).length, 0, 'chưa tới 10 giờ vườn');
  assert.ok(l.frozenMs > 11 * HOUR);
});

test('đổi tên: bỏ khoảng trắng thừa, từ chối tên rỗng hoặc quá dài, phả hệ theo tên mới', () => {
  const s = game(), mom = put(s, 'ga', 'f', 'truong', { name: 'Mơ' }), kid = put(s, 'ga', 'f', 'non', { mom: { id: 0, name: 'x' } });
  kid.mom = { id: mom.id, name: mom.name };
  assert.equal(G.renameAnimal(s, mom.id, '   ').ok, false);
  assert.equal(G.renameAnimal(s, mom.id, '').reason, 'empty');
  assert.equal(G.renameAnimal(s, mom.id, 'x'.repeat(BREED.nameMax + 1)).reason, 'long');
  assert.equal(mom.name, 'Mơ');
  const r = G.renameAnimal(s, mom.id, '  Bà   Mơ ');
  assert.equal(r.ok, true); assert.equal(mom.name, 'Bà Mơ');
  assert.equal(kid.mom.name, 'Bà Mơ');
  assert.equal(G.renameAnimal(s, mom.id, 'x'.repeat(BREED.nameMax)).ok, true);
  assert.equal(G.renameAnimal(s, 99999, 'A').ok, false);
  assert.ok(G.actionsFor(s, { kind: 'animal', id: mom.id }).some(a => a.id === 'rename'));
  const p = G.perform(s, { kind: 'animal', id: mom.id }, 'rename');
  assert.equal(p.rename, mom.id);
});

test('phả hệ: cha, mẹ, con; lưu trong bản lưu và nạp lại còn nguyên', () => {
  const s = pigGame(), sow = put(s, 'heo', 'f', 'truong', { name: 'Bông' }), boar = put(s, 'heo', 'm', 'truong', { name: 'Ủn' });
  sow.pregnant = true; sow.dueAt = 0; sow.mate = { id: boar.id, name: boar.name };
  run(s, MIN, 0.5);
  const kids = pigs(s).filter(a => a.mom);
  assert.ok(kids.length >= 1);
  const k = kids[0];
  assert.deepEqual(G.pedigree(s, k.id).mom, { id: sow.id, name: 'Bông' });
  assert.deepEqual(G.pedigree(s, k.id).dad, { id: boar.id, name: 'Ủn' });
  assert.equal(G.pedigree(s, sow.id).kids.length, kids.length);
  assert.equal(G.pedigree(s, boar.id).kids.length, kids.length);
  assert.equal(G.pedigree(s, 99999), null);
  G.saveGame(s);
  const l = quiet(() => G.loadGame());
  const k2 = l.animals.find(a => a.id === k.id);
  assert.deepEqual([k2.name, k2.mom, k2.dad, k2.sex], [k.name, k.mom, k.dad, k.sex]);
});

test('gà trống gáy đúng 6h sáng, không gáy trước đó; chỉ trống trưởng thành, không gáy khi chạy bù', () => {
  const s = game(); put(s, 'ga', 'f'); put(s, 'ga', 'm', 'non');
  const roo = put(s, 'ga', 'm');
  s.time = DAY_MS - 2 * MIN; s.day = 1;   // 5h58 sáng
  const crow = ev => ev.filter(e => e.type === 'cockcrow');
  const e1 = quiet(() => G.tick(s, MIN));   // 5h59
  assert.equal(crow(e1).length, 0);
  const e2 = quiet(() => G.tick(s, MIN + 1000));   // qua 6h
  assert.deepEqual(crow(e2).map(e => e.id), [roo.id]);
  assert.ok(e2.some(e => e.type === 'sound' && e.name === 'cockcrow'));
  assert.ok(e2.some(e => e.type === 'fx' && /Ò ó o/.test(e.text)));
  assert.equal(crow(quiet(() => G.tick(s, 5 * MIN))).length, 0, 'chỉ gáy một lần mỗi sáng');
  // không có trống trưởng thành thì im
  const t = game(); put(t, 'ga', 'f'); t.time = DAY_MS - MIN; t.day = 1;
  assert.equal(crow(quiet(() => G.tick(t, 2 * MIN))).length, 0);
});

test('bản lưu v3 cũ chưa có trường mới: nạp được, trứng thường vẫn nhặt được', () => {
  const s = game();
  delete s.clutch;
  s.eggs.push({ id: 900, x: 10, y: 10, laidAt: 0 });
  G.saveGame(s);
  const l = quiet(() => G.loadGame());
  assert.deepEqual(l.clutch, []);
  assert.equal(l.nest.mom, null);
  assert.equal(G.perform(l, { kind: 'egg', id: 900 }, 'collect').ok, true);
  assert.equal(l.basket.trung, 1);
});
