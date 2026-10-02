import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { LIFE, STAGES, AGING, ANIMALS, MAX_CATCHUP_MS, EVENT_LEVEL } from '../public/data.js';
import { eventMeta } from '../public/notify.js';

const MIN = 60_000, HOUR = 60 * MIN;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const clear = () => { for (const k of Object.keys(store)) delete store[k]; };
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };
const quiet = fn => withRandom(0.99, fn);   // không bệnh, không sâu, không quạ
const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e15; s.animals = []; return s; };
// Thêm một con vật theo đúng hình dạng v3 (lấy từ con gà mẫu của createGame), đặt ở tuổi `age`
const put = (s, type, stage, age = G.stageStart(type, stage), extra) => {
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type, name: ANIMALS[type].name, stage, age, nextProduct: 0, ready: false, ...extra };
  s.animals.push(a);
  return a;
};
const feed = s => { for (const k of Object.keys(s.troughs)) s.troughs[k] = 20; for (const a of s.animals) a.hunger = 100; };
const run = (s, ms) => { const ev = []; for (let t = 0; t < ms; t += MIN) { feed(s); ev.push(...quiet(() => G.tick(s, Math.min(MIN, ms - t)))); } return ev; };

test('tuổi tăng đúng bằng giờ vườn chạy; vườn đóng băng thì không già', () => {
  clear();
  const s = newGame();
  const a = put(s, 'ga', 'non');
  quiet(() => G.tick(s, 3 * MIN));
  assert.equal(a.age, 3 * MIN);
  // vắng 20 giờ: chỉ chạy bù 8 giờ, 12 giờ còn lại đóng băng nên con gà chỉ già thêm 8 giờ
  const hen = put(s, 'ga', 'truong');
  const age0 = hen.age, sim0 = s.simMs;
  s.savedAt = Date.now() - 20 * HOUR;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = quiet(() => G.loadGame()), h = l.animals.find(x => x.id === hen.id);
  assert.equal(h.age - age0, MAX_CATCHUP_MS);
  assert.equal(l.simMs - sim0, MAX_CATCHUP_MS);
  assert.ok(l.frozenMs >= 12 * HOUR - 5000);
  assert.equal(G.farmHours(l), l.simMs / HOUR);
});

test('mỗi loài qua đúng từng mốc của bảng tuổi thọ', () => {
  for (const type of ['ga', 'heo', 'bo', 'cuu']) {
    for (const [i, st] of STAGES.entries()) {
      if (i === 0) continue;
      const s = newGame(), at = G.stageStart(type, st), a = put(s, type, STAGES[i - 1], at - 1500);
      quiet(() => G.tick(s, 1000));
      assert.equal(a.stage, STAGES[i - 1], `${type} chưa tới mốc ${st}`);
      quiet(() => G.tick(s, 1000));
      assert.equal(a.stage, st, `${type} qua mốc ${st}`);
    }
    // tổng thời lượng đúng bảng
    const L = LIFE[type];
    assert.equal(G.lifeEnd(type), L.non + L.nho + L.truong + L.gia);
  }
  assert.deepEqual([G.stageStart('ga', 'nho'), G.stageStart('ga', 'truong')], [5 * MIN, 15 * MIN]);
  assert.deepEqual([G.stageStart('heo', 'nho'), G.stageStart('heo', 'truong')], [10 * MIN, 30 * MIN]);
  assert.deepEqual([G.stageStart('bo', 'nho'), G.stageStart('cuu', 'truong')], [15 * MIN, 45 * MIN]);
  assert.equal(LIFE.ga.truong, 20 * HOUR); assert.equal(LIFE.heo.gia, 6 * HOUR); assert.equal(LIFE.bo.truong, 45 * HOUR);
});

test('chó lớn theo giờ vườn nhưng không bao giờ già hay chết vì già', () => {
  const s = newGame();
  assert.equal(s.dog.stage, 'non');
  s.dog.age = 30 * MIN - 500;
  quiet(() => G.tick(s, 1000));
  assert.equal(s.dog.stage, 'nho');
  s.dog.age = 90 * MIN - 500;
  quiet(() => G.tick(s, 1000));
  assert.equal(s.dog.stage, 'truong');
  s.dog.age = 1e13;   // vài trăm năm giờ vườn
  const ev = quiet(() => G.tick(s, 5000));
  assert.equal(s.dog.stage, 'truong');
  assert.equal(G.lifeEnd('cho'), Infinity);
  assert.ok(!ev.some(e => e.type === 'passed' || e.type === 'oldSoon'));
});

test('con non không đẻ, không cho sữa, không cho lông; trưởng thành thì có', () => {
  const s = newGame();
  const chick = put(s, 'ga', 'non'), calf = put(s, 'bo', 'non'), lamb = put(s, 'cuu', 'non');
  run(s, 4 * MIN);
  assert.equal(s.eggs.length, 0);
  assert.equal(calf.ready, false); assert.equal(lamb.ready, false);
  for (const a of [chick, calf, lamb]) assert.equal(G.animalCan(a, 'product'), false);
  assert.ok(!G.actionsFor(s, { kind: 'animal', id: calf.id }).some(x => x.id === 'milk'));
  assert.ok(!G.actionsFor(s, { kind: 'animal', id: chick.id }).some(x => x.id === 'sell'), 'con non chưa bán được');
  const cow = put(s, 'bo', 'truong');
  run(s, ANIMALS.bo.every + MIN);
  assert.equal(cow.ready, true);
  assert.equal(G.actionsFor(s, { kind: 'animal', id: cow.id })[0].id, 'milk');
});

test('cừu nhỡ lông ngắn chưa xén được; bò tơ kéo cày được, bê con và bò già thì không', () => {
  const s = newGame();
  const sheep = put(s, 'cuu', 'nho');
  run(s, ANIMALS.cuu.every + MIN);
  assert.equal(sheep.stage, 'nho');
  assert.equal(sheep.ready, false);
  assert.ok(!G.actionsFor(s, { kind: 'animal', id: sheep.id }).some(x => x.id === 'shear'));
  const st = id => put(s, 'bo', id);
  assert.equal(G.animalCan(st('nho'), 'plow'), true);
  assert.equal(G.animalCan(st('truong'), 'plow'), true);
  assert.equal(G.animalCan(st('non'), 'plow'), false);
  assert.equal(G.animalCan(st('gia'), 'plow'), false);
  assert.equal(G.animalCan(put(s, 'heo', 'nho'), 'plow'), false);
});

test('con già cho sản phẩm thưa hơn con trưởng thành', () => {
  const s = newGame();
  const young = put(s, 'ga', 'truong'), old = put(s, 'ga', 'gia');
  young.x = 10; old.x = 20;
  run(s, 20 * MIN);
  const by = x => s.eggs.filter(e => e.x === x).length;
  assert.ok(by(10) >= 7, `gà trưởng thành đẻ ${by(10)}`);
  assert.ok(by(20) <= Math.ceil(by(10) / AGING.oldEvery), `gà già đẻ ${by(20)}`);
  // bò già cho ít sữa hơn: vắt xong phải chờ lâu gấp đôi
  const cow = put(s, 'bo', 'gia');
  run(s, ANIMALS.bo.every + MIN);
  assert.equal(cow.ready, true);
  s.basket = {};
  G.perform(s, { kind: 'animal', id: cow.id }, 'milk');
  run(s, ANIMALS.bo.every + MIN);
  assert.equal(cow.ready, false);
  run(s, ANIMALS.bo.every);
  assert.equal(cow.ready, true);
});

test('heo nhỡ ăn khỏe và lên cân nhanh hơn heo con', () => {
  const s = newGame();
  const piglet = put(s, 'heo', 'non', 0, { weight: 3 }), teen = put(s, 'heo', 'nho', G.stageStart('heo', 'nho'), { weight: 3 });
  for (const a of s.animals) a.hunger = 100;
  quiet(() => G.tick(s, MIN));
  assert.ok(teen.hunger < piglet.hunger, 'heo nhỡ đói nhanh hơn');
  assert.ok(teen.weight - 3 > (piglet.weight - 3) * 1.5, 'heo nhỡ tăng cân nhanh hơn');
});

test('báo trước 🟡 khi con vật sắp vào giai đoạn già, gộp theo loài', () => {
  const s = newGame();
  const warnAt = G.stageStart('ga', 'gia') - AGING.warnMs;
  const a = put(s, 'ga', 'truong', warnAt - 500), b = put(s, 'ga', 'truong', warnAt - 800);
  const ev = quiet(() => G.tick(s, 1000)).filter(e => e.type === 'oldSoon');
  assert.equal(ev.length, 2);
  assert.deepEqual(ev.map(e => e.id).sort(), [a.id, b.id].sort());
  const meta = eventMeta(ev[0]);
  assert.equal(meta.level, 'important');
  assert.equal(meta.group, eventMeta(ev[1]).group);
  assert.match(EVENT_LEVEL.oldSoon.text(2, ev[0]), /2 con gà sắp già/);
  // chỉ báo một lần
  assert.ok(!quiet(() => G.tick(s, 5 * MIN)).some(e => e.type === 'oldSoon'));
  assert.equal(a.stage, 'truong');
  // lúc vắng nhà thì có trong màn tóm tắt
  assert.ok(G.awaySummary(ev).some(l => /2 con gà sắp già/.test(l)));
});

test('hết giai đoạn già thì con vật ra đi, hóa thiên thần (cả lúc chạy bù); chó thì không', () => {
  clear();
  const s = newGame();
  const old = put(s, 'heo', 'gia', G.lifeEnd('heo') - 1500), keep = put(s, 'heo', 'gia');
  let ev = quiet(() => G.tick(s, 1000));
  assert.ok(s.animals.includes(old));
  ev = quiet(() => G.tick(s, 1000));
  assert.ok(!s.animals.includes(old));
  assert.ok(s.animals.includes(keep));
  const p = ev.find(e => e.type === 'passed');
  assert.equal(p.id, old.id); assert.equal(p.animal, 'Heo');
  assert.ok(ev.some(e => e.type === 'spawn' && e.what === 'angel'));
  assert.equal(eventMeta(p).level, 'important');
  // chạy bù offline: chết vì già vẫn xảy ra (ADR 0004) và có trong màn "Trong lúc bạn vắng nhà"
  const s2 = newGame();
  put(s2, 'bo', 'gia', G.lifeEnd('bo') - 10 * MIN);
  s2.dog.age = 1e13;
  s2.savedAt = Date.now() - HOUR;
  store[G.SAVE_KEY] = JSON.stringify(s2);
  const l = quiet(() => G.loadGame());
  assert.equal(l.animals.length, 0);
  assert.ok(l.away.lines.some(x => /1 con bò đã già và ra đi/.test(x)));
  assert.equal(l.dog.stage, 'truong');
});

test('chạm vào con vật thấy giai đoạn; mua con vật thì là con non', () => {
  const s = newGame();
  const a = put(s, 'ga', 'nho', undefined, { sex: 'f' });
  assert.equal(G.stageName(a), 'Nhỡ');
  assert.equal(G.animalLabel(a), 'Gà ♀ · Nhỡ');
  s.exp = 1e6; s.coins = 1e6;
  assert.ok(G.buyAnimal(s, 'ga').ok);
  const bought = s.animals.at(-1);
  assert.equal(bought.stage, 'non'); assert.equal(bought.age, 0);
  // vitamin: con non lớn vọt nửa giai đoạn
  s.inv.vitamin = 1;
  G.perform(s, { kind: 'animal', id: bought.id }, 'vitamin');
  assert.equal(bought.age, LIFE.ga.non / 2);
});
