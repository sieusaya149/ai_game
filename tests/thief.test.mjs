// Trộm NPC: thằng Tèo, Tí Sún trộm trứng, chồn hương bắt con ngủ ngoài, phạt trộm (issue 46).
// Test qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { RAID, THREATS, DOG, DAY_MS, NIGHT_FROM, FREE, ANIMALS } from '../public/data.js';
import { TS } from '../public/layout.js';
import { now, serverDay } from '../public/clock.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const withRandom = (v, fn) => { const r = Math.random; Math.random = typeof v === 'function' ? v : () => v; try { return fn(); } finally { Math.random = r; } };
const LUCKY = 0.0001;              // trúng mọi xác suất nhỏ
const quiet = fn => withRandom(0.99, fn);
// Hạt giống cố định: cùng seed cho cùng dãy số ngẫu nhiên
const seeded = (seed, fn) => withRandom((() => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })(), fn);

const NIGHT0 = DAY_MS * NIGHT_FROM;
// Vườn trống, người chơi đã cấp cao, chó còn là chó con (chưa canh nhà)
function newGame({ lv = 20 } = {}) {
  const s = G.createGame({ name: 'Hùng' });
  s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.eggs = []; s.coins = 500;
  s.exp = lv > 1 ? 1e6 : 0;
  s.dog.nextPoop = 1e15;
  return s;
}
// Đưa vườn tới đúng trước nửa đêm của ngày `day`
const beforeNight = (s, day) => { s.day = day; s.time = (day - 1) * DAY_MS + NIGHT0 - 500; };
// Bước qua nửa đêm để luật chốt kế hoạch trộm của đêm đó
const crossMidnight = (s, day) => { beforeNight(s, day); G.tick(s, 1000); };

// Thả `n` quả trứng xuống đất (ô cỏ trong vườn)
function dropEggs(s, n) {
  const m = G.mapOf(s);
  for (let i = 0; i < n; i++) s.eggs.push({ id: s.nextId++, sp: 'ga', x: m.spawn.x + i * 16, y: m.spawn.y + 16, laidAt: 0, fertile: false, mom: null, dad: null });
}
// Một con gà đang ngủ ngoài chuồng (con lạc của lát 42)
function addStray(s) {
  const m = G.mapOf(s), t = G.roamOf(s).tiles[10];
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type: 'ga', stage: 'truong', age: G.stageStart('ga', 'truong'), sex: 'f', nextProduct: 1e15, stray: true, tile: { c: t.c, r: t.r }, x: t.c * TS + 8, y: t.r * TS + 8 };
  a.pen = s.farm.ents.find(e => e.kind === 'pen' && e.pen === 'chicken')?.id ?? a.pen;
  s.animals.push(a);
  void m;
  return a;
}
// `n` ô ruộng có cây chín
function ripen(s, n) {
  for (let i = 0; i < n; i++) {
    const p = s.plots[i];
    p.soil = 'tilled'; p.water = 100;
    p.crop = { id: 'cai', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
  }
}
// Chó trưởng thành, no và vui: đang canh nhà
const guardDog = s => Object.assign(s.dog, { stage: 'truong', age: G.stageStart('cho', 'truong'), hunger: 100, happy: 100 });
// Đặt một món trang trí ở ô trống đầu tiên tìm được
function putDeco(s, item) {
  s.inv[item] = (s.inv[item] ?? 0) + 1;
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (G.placeEntity(s, { kind: 'deco', item }, c, r).ok) return true;
  throw new Error('không đặt được ' + item);
}

test('Tí Sún chỉ tới khi có từ 3 trứng dưới đất', () => {
  const s = newGame();
  dropEggs(s, 2);
  assert.equal(G.raidPool(s).includes('tisun'), false, '2 quả thì chưa bõ công');
  dropEggs(s, 1);
  assert.deepEqual(G.raidPool(s), ['tisun'], '3 quả là Tí Sún tới');
});

test('chồn hương chỉ tới khi có con ngủ ngoài chuồng', () => {
  const s = newGame();
  assert.equal(G.raidPool(s).includes('civet'), false);
  addStray(s);
  assert.equal(G.raidPool(s).includes('civet'), true);
  s.animals[0].stray = false;
  assert.equal(G.raidPool(s).includes('civet'), false, 'đã về chuồng thì chồn hương không tới');
});

test('thằng Tèo cần từ 3 ô chín', () => {
  const s = newGame();
  ripen(s, 2);
  assert.equal(G.raidPool(s).includes('thief'), false);
  ripen(s, 3);
  assert.equal(G.raidPool(s).includes('thief'), true);
});

test('bảo hộ người mới: dưới cấp 5 không có Tí Sún và chồn hương, vẫn có thằng Tèo', () => {
  const s = newGame({ lv: 1 });
  dropEggs(s, 5); addStray(s); ripen(s, 4);
  assert.ok(G.levelInfo(s.exp).level < RAID.minLevel);
  assert.deepEqual(G.raidPool(s), ['thief']);
  s.exp = 1e6;
  assert.deepEqual(G.raidPool(s).sort(), ['civet', 'thief', 'tisun']);
});

test('trung bình 1 vụ mỗi 2 đêm, không bao giờ quá 1 vụ mỗi đêm', () => {
  const s = newGame();
  dropEggs(s, RAID.eggNeed);   // vườn vừa đủ đồ đáng trộm
  assert.equal(G.raidChance(s), RAID.nightly);
  const N = 400;
  let raids = 0;
  seeded(20_460_046, () => {
    for (let d = 1; d <= N; d++) {
      s.threats = []; s.eggs = []; dropEggs(s, RAID.eggNeed);   // đêm nào vườn cũng y hệt
      crossMidnight(s, d);
      const r = G.raidTonight(s);
      if (r) { raids++; assert.ok(['thief', 'tisun', 'civet'].includes(r.kind)); }
    }
  });
  assert.ok(Math.abs(raids / N - 0.5) < 0.06, `trung bình 1 vụ mỗi 2 đêm, đo được ${raids}/${N}`);
});

test('mỗi đêm nhiều lắm một vụ trộm NPC, dù vườn giàu tới đâu', () => {
  const s = newGame();
  dropEggs(s, 12); ripen(s, 6);
  assert.equal(G.raidChance(s), RAID.max, 'vườn giàu: gần như đêm nào cũng có trộm');
  for (let d = 1; d <= 4; d++) {
    const ids = new Set();
    beforeNight(s, d);
    withRandom(LUCKY, () => {
      for (let i = 0; i < 40; i++) {
        G.tick(s, 5000);
        for (const t of s.threats) if (t.kind !== 'crow') ids.add(t.id);
        assert.ok(s.threats.filter(t => t.kind !== 'crow').length <= 1, 'không bao giờ hai trộm NPC cùng lúc');
      }
    });
    assert.equal(ids.size, 1, `đêm ${d}: đúng một vụ`);
    s.threats = [];
    dropEggs(s, 12); ripen(s, 6);   // dọn lại vườn giàu cho đêm sau
  }
});

test('đêm đã có bạn bè online sang trộm thì trộm NPC không tới', () => {
  const s = newGame();
  dropEggs(s, 8); ripen(s, 5);
  assert.ok(G.raidChance(s) > 0);
  // vụ trộm của khách online ghi vào thống kê hôm nay của vườn (issue 30, ngày ngoài đời)
  s.today = { day: serverDay(now()), helps: 0, steals: 1, stolen: 20, robs: 0 };
  assert.equal(G.guestRaids(s), 1);
  assert.deepEqual(G.raidPool(s), []);
  assert.equal(G.raidChance(s), 0);
  s.today.day = '2000-01-01';   // hôm khác không có khách thì trộm NPC lại tới
  assert.ok(G.raidChance(s) > 0);
});

test('khách online trộm thật (guestOpApply) thì đêm đó trộm NPC nhường, không chốt vụ nào', () => {
  const s = newGame();
  dropEggs(s, 8); ripen(s, 5);
  const idx = s.plots.find(p => p.unlocked && p.crop).idx;
  const r = G.guestOpApply(s, { name: 'Bình', level: 5, room: 30, sausage: 0 }, { id: 'op-raid-0001', kind: 'steal', act: 'crop', idx, at: now() });
  assert.equal(r.ok, true, r.msg);
  assert.equal(G.guestRaids(s), 1);
  withRandom(LUCKY, () => crossMidnight(s, 3));   // xác suất nào cũng trúng mà vẫn không có trộm NPC
  assert.equal(G.raidTonight(s), null, 'đêm nay không có trộm NPC');
});

test('đèn lồng, hàng rào và chó canh nhà đều làm trộm thưa đi', () => {
  const s = newGame();
  dropEggs(s, 6);
  const base = G.raidChance(s);
  assert.ok(base > 0);
  putDeco(s, 'deco_lamp');
  const lamp = G.raidChance(s);
  assert.ok(lamp < base, 'có đèn thì thưa hơn');
  putDeco(s, 'deco_lowfence');
  const fence = G.raidChance(s);
  assert.ok(fence < lamp, 'thêm hàng rào thì thưa nữa');
  guardDog(s);
  assert.ok(G.raidChance(s) < fence, 'chó canh nhà thì thưa nhất');
});

test('Tí Sún tới lấy trứng; đuổi kịp thì chọn kiểu phạt', () => {
  const s = newGame();
  dropEggs(s, 5);
  beforeNight(s, 1);
  withRandom(LUCKY, () => G.tick(s, 2000));
  const th = s.threats.find(t => t.kind === 'tisun');
  assert.ok(th, 'Tí Sún đã vào vườn');
  assert.deepEqual([th.x, th.y], [G.mapOf(s).gateIn.x, G.mapOf(s).gateIn.y], 'đi vào từ cổng');
  const coins = s.coins;
  const r = withRandom(0.5, () => G.perform(s, { kind: 'threat', id: th.id }, 'catch'));
  assert.equal(r.ok, true, r.msg);
  assert.equal(s.coins, coins, 'chưa chọn phạt thì chưa có xu');
  assert.ok(r.punish, 'hiện hộp thoại chọn phạt');
  assert.deepEqual(r.punish.options.map(o => o.id), ['pay', 'chore']);
  const pay = withRandom(0.5, () => G.punishThief(s, 'pay'));
  assert.equal(pay.ok, true, pay.msg);
  assert.ok(s.coins - coins >= THREATS.thiefCaughtCoins[0] && s.coins - coins <= THREATS.thiefCaughtCoins[1], `đền ${s.coins - coins} xu`);
  assert.equal(s.eggs.length, 5, 'bắt kịp thì không mất quả nào');
});

test('không đuổi kịp thì Tí Sún ôm trứng đi mất', () => {
  const s = newGame();
  dropEggs(s, 5);
  beforeNight(s, 1);
  withRandom(LUCKY, () => G.tick(s, 2000));
  assert.ok(s.threats.some(t => t.kind === 'tisun'));
  const evs = quiet(() => G.tick(s, RAID.eggStealMs + 90_000));
  assert.ok(s.eggs.length < 5, 'mất trứng');
  assert.ok(s.eggs.length >= 5 - RAID.eggTake[1], 'chỉ lấy vài quả');
  assert.ok(evs.some(e => e.type === 'tisun'), 'có event báo mất trứng');
});

test('chồn hương bắt con ngủ ngoài chuồng; đuổi kịp thì con vật còn nguyên', () => {
  const s = newGame();
  const a = addStray(s);
  beforeNight(s, 1);
  withRandom(LUCKY, () => G.tick(s, 2000));
  const th = s.threats.find(t => t.kind === 'civet');
  assert.ok(th, 'chồn hương đã vào vườn');
  const acts = G.actionsFor(s, { kind: 'threat', id: th.id }).map(x => x.id);
  assert.deepEqual(acts, ['shoo']);
  const r = quiet(() => G.perform(s, { kind: 'threat', id: th.id }, 'shoo'));
  assert.equal(r.ok, true, r.msg);
  assert.equal(s.animals.includes(a), true, 'đuổi kịp thì con gà còn');
  assert.equal(s.caught, null, 'chồn hương là con thú, không có hộp thoại phạt');
});

test('không đuổi thì chồn hương tha con vật đi', () => {
  const s = newGame();
  addStray(s);
  beforeNight(s, 1);
  withRandom(LUCKY, () => G.tick(s, 2000));
  assert.ok(s.threats.some(t => t.kind === 'civet'));
  const evs = quiet(() => G.tick(s, RAID.civetCatchMs + 60_000));
  assert.equal(s.animals.length, 0, 'con gà bị tha đi');
  assert.ok(evs.some(e => e.type === 'civet'));
});

test('chó canh nhà phát hiện và đuổi được trộm NPC mới', () => {
  const s = newGame();
  dropEggs(s, 4);
  guardDog(s);
  beforeNight(s, 1);
  const m = G.mapOf(s);
  Object.assign(s.dog, { x: s.eggs[0].x, y: s.eggs[0].y });   // chó nằm ngay cạnh ổ trứng
  void m;
  const evs = withRandom(LUCKY, () => G.tick(s, 60_000));
  assert.ok(evs.some(e => e.type === 'guard'), 'chó sủa đuổi');
  assert.equal(s.eggs.length, 4, 'không mất quả trứng nào');
});

test('phạt làm thợ không công: mỗi tuần làng một lần, hôm sau trộm sang làm giúp', () => {
  const s = newGame();
  dropEggs(s, 5);
  s.plots[0].soil = 'tilled'; s.plots[0].water = 0; s.plots[0].weeds = true;
  s.plots[0].crop = { id: 'cai', progress: 0.5, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
  beforeNight(s, 1);
  withRandom(LUCKY, () => G.tick(s, 2000));
  const th = s.threats.find(t => t.kind === 'tisun');
  const coins = s.coins;
  withRandom(0.5, () => G.perform(s, { kind: 'threat', id: th.id }, 'catch'));
  const r = G.punishThief(s, 'chore');
  assert.equal(r.ok, true, r.msg);
  assert.equal(s.coins, coins, 'phạt thợ thì không lấy xu');
  assert.equal(G.villageWeek(s), 0);
  // sang ngày hôm sau: trộm sang tưới cây và nhổ cỏ không công
  quiet(() => G.tick(s, DAY_MS * 0.3));
  assert.equal(s.day, 2);
  assert.equal(s.plots[0].weeds, false, 'đã nhổ cỏ giúp');
  assert.ok(s.plots[0].water > 0, 'đã tưới giúp');
  // bắt tiếp trong cùng tuần làng: chỉ còn lựa chọn bắt đền
  dropEggs(s, 5);
  beforeNight(s, 2);
  withRandom(LUCKY, () => G.tick(s, 2000));
  const th2 = s.threats.find(t => t.kind === 'tisun');
  withRandom(0.5, () => G.perform(s, { kind: 'threat', id: th2.id }, 'catch'));
  const opts = G.punishOptions(s);
  assert.ok(opts.find(o => o.id === 'chore').disabled, 'tuần này làng phạt một lần rồi');
  assert.equal(G.punishThief(s, 'chore').ok, false);
  // sang tuần làng sau thì phạt thợ lại được
  s.day = 8;
  assert.equal(G.villageWeek(s), 1);
  assert.equal(G.punishOptions(s).find(o => o.id === 'chore').disabled, null);
});

test('thằng Tèo bị bắt nhiều lần thì đi lặng lẽ hơn, chó khó phát hiện hơn', () => {
  const s = newGame();
  guardDog(s);
  const r0 = G.guardRadius(s);
  assert.equal(G.thiefStealth(s), 1);
  assert.deepEqual(G.thiefGear(s), { torch: false, shoes: false });
  // chó đứng xa, đúng ở rìa bán kính phát hiện
  const far = r0 * TS - 2;
  Object.assign(s.dog, { x: 200, y: 200 });
  assert.equal(G.dogSees(s, { x: 200 + far, y: 200 }), true);
  s.teoCaught = 1;
  assert.ok(G.thiefStealth(s) < 1);
  assert.equal(G.thiefGear(s).torch, true, 'bị bắt một lần: mua đèn pin');
  assert.equal(G.dogSees(s, { x: 200 + far, y: 200 }, { mul: G.thiefStealth(s) }), false, 'đi êm hơn thì chó không thấy nữa');
  s.teoCaught = RAID.shoesAt;
  assert.equal(G.thiefGear(s).shoes, true, 'bị bắt nhiều lần: mua giày êm');
  assert.ok(G.thiefStealth(s) >= RAID.stealthMin, 'lặng lẽ nhất cũng có giới hạn');
  s.teoCaught = 100;
  assert.equal(G.thiefStealth(s), RAID.stealthMin);
});

test('bắt được thằng Tèo thì số lần bị bắt tăng lên và lưu trong bản lưu', () => {
  const s = newGame();
  ripen(s, 4);
  beforeNight(s, 1);
  withRandom(LUCKY, () => G.tick(s, 2000));
  const th = s.threats.find(t => t.kind === 'thief');
  assert.ok(th);
  withRandom(0.5, () => G.perform(s, { kind: 'threat', id: th.id }, 'catch'));
  G.punishThief(s, 'pay');
  assert.equal(s.teoCaught, 1);
  G.saveGame(s);
  const back = G.loadGame();
  assert.equal(back.teoCaught, 1);
});

// ---------- ADR 0004: chạy bù offline không bao giờ mất con vật ----------
// Lưu rồi lùi savedAt `ms`, tải lại như mở game sau `ms` vắng mặt.
function reopen(s, ms, seed = 7) {
  s.savedAt = Date.now() - ms;
  store[G.SAVE_KEY] = JSON.stringify(s);
  return seeded(seed, () => G.loadGame());
}

test('ADR 0004: chạy bù offline có trộm NPC nhưng không con nào chết hay bị bắt đi', () => {
  const s = newGame();
  dropEggs(s, 12);
  ripen(s, 6);
  for (let i = 0; i < 4; i++) addStray(s);
  const ids = s.animals.map(a => a.id);
  s.day = 1; s.time = NIGHT0 - 1000;
  const l = reopen(s, 3 * 3600_000);
  assert.deepEqual(l.animals.map(a => a.id), ids, 'không con nào bị bắt đi hay chết');
  assert.ok(l.eggs.length < 12 || l.plots.filter(p => p.crop).length < 6, 'vẫn mất trứng hoặc rau');
  assert.equal(l.away.lines.some(t => /[Cc]hồn hương/.test(t)), false, 'chạy bù thì chồn hương không tới');
  assert.equal(l.threats.length, 0, 'chạy bù không để lại trộm đứng trong vườn');
});

test('ADR 0004: ngủ qua đêm cũng chỉ mất trứng hay rau, không mất con vật', () => {
  const s = newGame();
  dropEggs(s, 10);
  for (let i = 0; i < 3; i++) addStray(s);
  const n = s.animals.length;
  s.day = 1; s.time = DAY_MS * 0.8;
  withRandom(LUCKY, () => G.sleep(s));
  assert.equal(s.animals.length, n, 'sáng ra vẫn đủ con');
});

test('bản lưu cũ chưa biết tới trộm NPC vẫn tải được', () => {
  const s = newGame();
  delete s.teoCaught; delete s.raid; delete s.caught; delete s.chore;
  G.saveGame(s);
  const back = G.loadGame();
  assert.ok(back);
  assert.equal(back.teoCaught, 0);
  assert.deepEqual(G.punishOptions(back), []);
  void ANIMALS; void DOG; void FREE;
});

test('thoát game lúc hộp thoại phạt còn mở: mở lại thì coi như đã bắt đền xu', () => {
  const s = newGame();
  s.caught = { kind: 'tisun', name: 'Tí Sún', coins: 40 };
  const c = s.coins;
  s.savedAt = Date.now();
  G.saveGame(s);
  const back = G.loadGame();
  assert.equal(back.caught, null, 'không treo lơ lửng qua lần mở sau');
  assert.equal(back.coins, c + 40, 'xu bắt đền vẫn vào túi');
  assert.ok(back.log.some(l => /Tí Sún/.test(l.text)), 'có ghi nhật ký');
});
