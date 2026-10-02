// Vòng đời chó và dạy lệnh bằng minigame (issue 45), qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { TRICKS, TRAIN, DOG, LIFE, FREE, DAY_MS, ANIMALS } from '../public/data.js';
import { TS } from '../public/layout.js';

const MIN = 60_000, HOUR = 60 * MIN;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };
const quiet = fn => withRandom(0.99, fn);
// Hạt giống cố định: cùng seed cho cùng dãy số ngẫu nhiên
const seeded = (seed, fn) => {
  const r = Math.random; let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = r; }
};
const NOON = DAY_MS * 0.3, DUSK = DAY_MS * FREE.duskAt;

// Vườn có chó nhỡ, no và vui vừa phải, đầy bánh thưởng
function newGame(stage = 'nho') {
  const s = G.createGame({ name: 'Hùng' });
  s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.coins = 1e6; s.exp = 1e6; s.time = NOON;
  s.inv.treat = 50;
  Object.assign(s.dog, { stage, age: G.stageStart('cho', stage), hunger: 100, happy: 60, nextPoop: 1e15 });
  return s;
}
const put = (s, type, stage, extra) => {
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type, name: ANIMALS[type].name, stage, age: G.stageStart(type, stage), nextProduct: 1e15, ready: false, ...extra };
  s.animals.push(a);
  return a;
};
// Một buổi dạy đạt (hay không đạt), rồi sang ngày game mới cho buổi sau
function session(s, trick, pass = true) {
  const st = quiet(() => G.trainStart(s, trick));
  if (!st.ok || st.quit) return st;
  return quiet(() => G.trainResult(s, trick, pass));
}
const nextDay = s => { s.time += DAY_MS; s.day = Math.floor(s.time / DAY_MS) + 1; };
// Xây thêm một chuồng, thử lần lượt các ô trống trong vườn
function addPen(s, pen) {
  for (let r = 20; r < 32; r++) for (let c = 20; c < 44; c++) if (G.placeEntity(s, { kind: 'pen', pen }, c, r).ok) return;
  throw new Error('không đặt được chuồng ' + pen);
}
// Dạy xong hẳn một lệnh
function learn(s, trick) {
  for (let i = 0; i < TRICKS[trick].sessions + 2 && !G.knowsTrick(s, trick); i++) { session(s, trick); nextDay(s); }
  assert.ok(G.knowsTrick(s, trick), 'đã học xong ' + trick);
}

test('mỗi lệnh cần đúng số buổi; buổi không đạt thì không tăng tiến độ', () => {
  for (const [id, t] of Object.entries(TRICKS)) {
    const s = newGame();
    if (id !== 'sit') learn(s, 'sit');
    for (let i = 0; i < t.sessions; i++) {
      s.dog.happy = 60;   // vui vừa phải: mỗi buổi đạt tính đúng một buổi
      assert.equal(G.knowsTrick(s, id), false, `${id}: chưa đủ ${i}/${t.sessions} buổi`);
      const r = session(s, id);
      assert.equal(r.ok, true, r.msg);
      nextDay(s);
    }
    assert.equal(G.knowsTrick(s, id), true, `${id}: đủ ${t.sessions} buổi là xong`);
  }
  assert.deepEqual(Object.values(TRICKS).map(t => t.sessions), [2, 3, 4, 5, 4, 3]);
});

test('buổi không đạt vẫn mất bánh thưởng nhưng không tăng tiến độ', () => {
  const s = newGame();
  const n0 = G.haveItem(s, 'treat');
  const r = session(s, 'sit', false);
  assert.equal(r.ok, true);
  assert.equal(r.step, 0);
  assert.equal(G.haveItem(s, 'treat'), n0 - 1, 'vẫn tốn 1 bánh thưởng');
  assert.equal(G.trickProgress(s, 'sit'), 0);
});

test('phải học Ngồi trước khi học lệnh khác', () => {
  const s = newGame();
  for (const id of Object.keys(TRICKS)) {
    if (id === 'sit') continue;
    const c = G.canTrain(s, id);
    assert.equal(c.ok, false, id + ' bị khóa');
    assert.equal(c.reason, 'base');
  }
  assert.equal(G.canTrain(s, 'sit').ok, true);
  learn(s, 'sit');
  assert.equal(G.canTrain(s, 'follow').ok, true, 'học Ngồi rồi thì mở khóa');
});

test('mỗi ngày game chỉ dạy một buổi, mỗi buổi trừ một bánh thưởng', () => {
  const s = newGame();
  const n0 = G.haveItem(s, 'treat');
  assert.equal(quiet(() => G.trainStart(s, 'sit')).ok, true);
  quiet(() => G.trainResult(s, 'sit', true));
  assert.equal(G.haveItem(s, 'treat'), n0 - 1);
  const again = G.canTrain(s, 'sit');
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'daily');
  assert.equal(quiet(() => G.trainStart(s, 'sit')).ok, false, 'không dạy buổi thứ hai trong ngày');
  assert.equal(G.haveItem(s, 'treat'), n0 - 1, 'không trừ thêm bánh');
  nextDay(s);
  assert.equal(G.canTrain(s, 'sit').ok, true, 'hôm sau dạy tiếp được');
});

test('hết bánh thưởng thì không dạy được', () => {
  const s = newGame();
  s.inv.treat = 0;
  const c = G.canTrain(s, 'sit');
  assert.equal(c.ok, false); assert.equal(c.reason, 'no_item');
});

test('chó con không dạy được, chó già cũng thôi học', () => {
  const pup = newGame('non');
  const c = G.canTrain(pup, 'sit');
  assert.equal(c.ok, false); assert.equal(c.reason, 'stage');
  const old = newGame('gia');
  assert.equal(G.canTrain(old, 'sit').reason, 'stage');
  const grown = newGame('truong');
  assert.equal(G.canTrain(grown, 'sit').ok, true);
});

test('chó đói hay buồn có thể bỏ buổi giữa chừng (hạt giống cố định), vẫn mất bánh thưởng', () => {
  let quit = 0, kept = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const s = newGame();
    s.dog.hunger = 10; s.dog.happy = 10;
    const n0 = G.haveItem(s, 'treat');
    const r = seeded(seed, () => G.trainStart(s, 'sit'));
    assert.equal(r.ok, true);
    assert.equal(G.haveItem(s, 'treat'), n0 - 1, 'bỏ buổi vẫn mất bánh');
    if (r.quit) {
      quit++;
      assert.equal(seeded(seed, () => G.trainResult(s, 'sit', true)).ok, false, 'bỏ buổi thì không chốt kết quả');
      assert.equal(G.trickProgress(s, 'sit'), 0);
    } else kept++;
  }
  assert.ok(quit > 0 && kept > 0, `có buổi bỏ dở và buổi học trọn: ${quit}/${quit + kept}`);
  // chó no và vui thì không bao giờ bỏ
  for (let seed = 1; seed <= 20; seed++) {
    const s = newGame();
    assert.equal(seeded(seed, () => G.trainStart(s, 'sit')).quit, false);
  }
});

test('chó vui thì học nhanh: một buổi đạt ăn hai buổi', () => {
  const s = newGame();
  s.dog.happy = 100;
  const r = session(s, 'herd');   // chưa học Ngồi nên bị khóa
  assert.equal(r.ok, false);
  learn(s, 'sit');
  s.dog.happy = 100;
  session(s, 'herd'); nextDay(s);
  assert.equal(G.trickProgress(s, 'herd'), 2, 'chó vui: +2 buổi');
  s.dog.happy = 50;
  session(s, 'herd');
  assert.equal(G.trickProgress(s, 'herd'), 3, 'chó thường: +1 buổi');
});

test('bán kính phát hiện trộm theo giai đoạn, Canh khu nhân đôi tại chỗ gác', () => {
  assert.equal(G.guardRadius(newGame('non')), 0);
  assert.equal(G.guardRadius(newGame('nho')), 4);
  assert.equal(G.guardRadius(newGame('truong')), 6);
  assert.equal(G.guardRadius(newGame('gia')), 4, 'chó già phát hiện trộm chậm hơn');
  const s = newGame('truong');
  learn(s, 'sit'); learn(s, 'guard');
  const spot = { c: 20, r: 20 };
  assert.equal(G.commandDog(s, 'guard', spot).ok, true);
  assert.deepEqual(G.dogPost(s), spot);
  assert.equal(G.guardRadius(s), 12, 'gác một chỗ thì xa gấp đôi');
  // trộm trong bán kính gác thì chó thấy, ngoài thì không
  assert.equal(G.dogSees(s, (spot.c + 10) * TS, spot.r * TS), true);
  assert.equal(G.dogSees(s, (spot.c + 20) * TS, spot.r * TS), false);
  assert.equal(G.commandDog(s, 'stop').ok, true);
  assert.equal(G.dogPost(s), null);
  assert.equal(G.guardRadius(s), 6);
});

test('chó học đủ 6 lệnh thì không ăn xúc xích người lạ', () => {
  const s = newGame('truong');
  assert.equal(G.trickProof(s), false);
  for (const id of ['sit', ...Object.keys(TRICKS).filter(k => k !== 'sit')]) learn(s, id);
  assert.equal(G.knownTricks(s).length, 6);
  assert.equal(G.trickProof(s), true);
});

test('lệnh Lùa đưa cả đàn về chuồng, kể cả bò và cừu đi lạc', () => {
  const s = newGame('truong');
  learn(s, 'sit'); learn(s, 'herd');
  // gà thả rông + một con lạc
  const hens = [0, 1, 2].map(() => put(s, 'ga', 'truong', { sex: 'f' }));
  seeded(7, () => { for (let i = 0; i < 20; i++) G.tick(s, 5000); });
  assert.ok(hens.some(a => a.tile), 'gà đang thả rông ngoài vườn');
  hens[0].stray = true;
  // bò và cừu lạc ra ngoài chuồng
  addPen(s, 'pasture');
  const cow = put(s, 'bo', 'truong'), sheep = put(s, 'cuu', 'truong');
  for (const a of [cow, sheep]) { a.x = 4 * TS; a.y = 4 * TS; }
  const r = G.commandDog(s, 'herd');
  assert.equal(r.ok, true, r.msg);
  assert.ok(r.n >= 5, 'lùa cả đàn: ' + r.n);
  seeded(7, () => { for (let i = 0; i < 25; i++) G.tick(s, 1000); });
  assert.equal(G.strays(s).length, 0, 'không còn con lạc');
  for (const a of [...hens, cow, sheep]) assert.equal(a.tile, null, a.type + ' đã về chuồng');
  const pen = G.mapOf(s).penById[cow.pen];
  assert.ok(cow.x >= pen.area.x && cow.x <= pen.area.x + pen.area.w, 'bò đứng trong chuồng');
});

test('chó đã học Lùa thì tối nào cũng tự lùa đàn khi no và vui', () => {
  const build = (hunger, happy) => {
    const s = newGame('truong');
    learn(s, 'sit'); learn(s, 'herd');
    s.time = NOON; s.day = 1;
    [0, 1, 2, 3].map(() => put(s, 'ga', 'truong', { sex: 'f' }));
    seeded(11, () => { for (let i = 0; i < 20; i++) { for (const a of s.animals) a.hunger = 100; G.tick(s, 5000); } });
    s.time = DUSK - 5000;
    Object.assign(s.dog, { hunger, happy });
    const ev = [];
    seeded(11, () => { for (let i = 0; i < 40; i++) { for (const a of s.animals) a.hunger = 100; Object.assign(s.dog, { hunger, happy }); ev.push(...G.tick(s, 1000)); } });
    return { s, ev };
  };
  const good = build(100, 100);
  assert.ok(good.ev.some(e => e.type === 'dogHerd'), 'chó no vui thì tự lùa');
  assert.equal(G.strays(good.s).length, 0, 'không còn con nào ngủ ngoài');
  const bad = build(5, 5);
  assert.ok(!bad.ev.some(e => e.type === 'dogHerd'), 'chó đói buồn thì nằm nhà');
  assert.ok(G.strays(bad.s).length > 0, 'vẫn có con lạc');
});

test('chó không chết vì già nhưng có tuổi già', () => {
  const s = newGame('truong');
  s.dog.age = 1e13;
  quiet(() => G.tick(s, 1000));
  assert.equal(s.dog.stage, 'gia');
  assert.equal(G.lifeEnd('cho'), Infinity);
  quiet(() => G.tick(s, 10 * MIN));
  assert.equal(s.dog.stage, 'gia', 'chó già ở lại mãi');
  assert.equal(LIFE.cho.gia, Infinity);
});

test('ra lệnh: chỉ ra được lệnh đã học, hành động trên chó hiện các lệnh đó', () => {
  const s = newGame('truong');
  const r0 = G.commandDog(s, 'sit');
  assert.equal(r0.ok, false); assert.equal(r0.reason, 'unknown');
  learn(s, 'sit');
  const ids = G.actionsFor(s, { kind: 'dog' }).map(a => a.id);
  assert.ok(ids.includes('train'), 'có nút Dạy lệnh');
  assert.ok(ids.includes('cmd_sit'), 'có lệnh Ngồi đã học');
  assert.ok(!ids.includes('cmd_herd'), 'chưa học Lùa thì chưa có');
  assert.equal(G.perform(s, { kind: 'dog' }, 'cmd_sit').ok, true);
  assert.equal(s.dog.cmd.id, 'sit');
  assert.ok(G.actionsFor(s, { kind: 'dog' }).some(a => a.id === 'cmd_stop'));
});

test('lệnh Tìm trứng đánh dấu trứng giấu trong bụi', () => {
  const s = newGame('truong');
  learn(s, 'sit'); learn(s, 'egg');
  const hens = [0, 1, 2].map(() => put(s, 'ga', 'truong', { sex: 'f', nextProduct: 0 }));
  seeded(3, () => { for (let i = 0; i < 60; i++) { for (const a of s.animals) { a.hunger = 100; a.happy = 100; } G.tick(s, 5000); } });
  const hid = G.hiddenEggs(s);
  assert.ok(hid.length > 0, 'có trứng trong bụi');
  assert.ok(hid.every(e => !e.found));
  const r = G.commandDog(s, 'egg');
  assert.equal(r.ok, true, r.msg);
  assert.equal(r.n, hid.length);
  assert.ok(G.hiddenEggs(s).every(e => e.found), 'trứng đã được đánh dấu');
});

test('chó học Đuổi chim thì tự đuổi quạ dù đứng xa', () => {
  const mk = (bird) => {
    const s = newGame('truong');
    s.animals = [];
    learn(s, 'sit');
    if (bird) learn(s, 'bird');
    Object.assign(s.dog, { hunger: 100, happy: 100 });
    G.perform(s, { kind: 'plot', idx: 0 }, 'till'); G.perform(s, { kind: 'plot', idx: 0 }, 'plant');
    s.plots[0].crop.progress = 1;
    // chó đứng xa tít góc vườn
    const m = G.mapOf(s), c = m.plotCenter(0);
    s.dog.x = c.x + 40 * TS; s.dog.y = c.y;
    return withRandom(0.0001, () => { const ev = []; for (let i = 0; i < 60; i++) ev.push(...G.tick(s, 1000)); return { s, ev }; });
  };
  assert.ok(mk(true).ev.some(e => e.type === 'guard'), 'học Đuổi chim thì đuổi được từ xa');
  assert.ok(!mk(false).ev.some(e => e.type === 'guard'), 'chưa học thì quạ ngoài tầm mắt');
});
