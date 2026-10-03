// Hotfix: chưa cho ăn kịp không phải là bệnh. Chỉ bỏ đói LÂU (đói lả kéo dài) mới có nguy cơ — qua API công khai.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { ANIMALS, HUSBANDRY } from '../public/data.js';
import { todoList } from '../public/todo.js';

const MIN = 60_000, HOUR = 60 * MIN;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const withRandom = (v, fn) => { const r = Math.random; Math.random = typeof v === 'function' ? v : () => v; try { return fn(); } finally { Math.random = r; } };

const game = () => {
  const s = G.createGame({ name: 'Chủ trại' });
  s.exp = 0; s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.eggs = []; s.clutch = []; s.time = 12 * HOUR; s.day = 1;
  return s;
};
const put = (s, type, extra) => {
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type, name: ANIMALS[type].name, stage: 'truong',
    nextProduct: 1e15, ready: false, hunger: 100, happy: 60, dirty: 0, sick: 0, sickMs: 0, dose: 0, vaccUntil: 0, pen: null, tile: null, ...extra };
  s.animals.push(a);
  return a;
};
const emptyTroughs = s => { for (const k of Object.keys(s.troughs)) s.troughs[k] = 0; };
// Chạy từng phút không cho ăn, máng rỗng; `rnd` là Math.random (0 = xúi quẩy nhất: mọi lần quay xác suất đều trúng)
const starve = (s, ms, rnd = 0) => { for (let t = 0; t < ms; t += MIN) { emptyTroughs(s); withRandom(rnd, () => G.tick(s, MIN)); } };

const RISK = HUSBANDRY.sickRiskAfterStarving, RAMP = HUSBANDRY.sickStarveRampMs, FEED = HUSBANDRY.hungerMs;   // từ no tới đói lả = FEED

test('quên cho ăn một lượt (no -> đói lả rồi 5 phút nữa) không bao giờ bệnh, dù xúi quẩy nhất', () => {
  const s = game();
  const pets = [put(s, 'ga'), put(s, 'ga'), put(s, 'heo'), put(s, 'bo'), put(s, 'cuu')];
  starve(s, FEED + 5 * MIN);
  for (const a of pets) assert.equal(a.sick, 0, `${a.type} không được bệnh sau 10 phút chưa ăn`);
});

test('đói lả suốt cả chục chu kỳ ăn mà chưa tới mốc nguy cơ: không con nào bệnh (nhiều hạt giống)', () => {
  let sick = 0, n = 0;
  for (let seed = 1; seed <= 100; seed++) {
    let x = seed; const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647;
    const s = game(); const a = put(s, 'ga'); n++;
    starve(s, FEED + RISK - MIN, rnd);
    if (a.sick) sick++;
  }
  assert.equal(sick, 0, `${sick}/${n} con bệnh trước mốc nguy cơ`);
});

test('qua mốc nguy cơ xác suất tăng dần: sớm thì thấp, lâu thì gần như chắc bệnh (nhiều hạt giống)', () => {
  const sickAt = ms => {
    let sick = 0;
    for (let seed = 1; seed <= 100; seed++) {
      let x = seed * 7919; const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647;
      const s = game(); const a = put(s, 'ga');
      starve(s, ms, rnd);
      if (a.sick) sick++;
    }
    return sick;
  };
  const early = sickAt(FEED + RISK + 5 * MIN), late = sickAt(FEED + RISK + RAMP + 40 * MIN);
  assert.ok(early < 40, `5 phút sau mốc nguy cơ: ${early}/100`);
  assert.ok(late > 90, `rất lâu sau mốc: ${late}/100`);
});

test('đúng mốc nguy cơ: trước đó xúi quẩy cũng không bệnh, sau đó xúi quẩy là bệnh', () => {
  const s = game(); const a = put(s, 'ga');
  starve(s, FEED + RISK - MIN, 0);
  assert.equal(a.sick, 0, 'chưa tới mốc nguy cơ');
  starve(s, 3 * MIN, 0);
  assert.ok(a.sick > 0, 'qua mốc nguy cơ, xúi quẩy thì bệnh');
});

test('vắc-xin vẫn chặn bệnh do đói lả rất lâu', () => {
  const s = game(); const a = put(s, 'ga', { vaccUntil: 1e12 });
  starve(s, FEED + RISK + RAMP, 0);
  assert.equal(a.sick, 0);
});

test('chạy bù offline ngắn (vắng 12 phút, máng rỗng) không làm con vật bệnh', () => {
  const s = game(); const a = put(s, 'ga'); emptyTroughs(s);
  s.savedAt = Date.now() - 12 * MIN;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = withRandom(0, () => G.loadGame());
  assert.equal(l.animals.find(x => x.id === a.id).sick, 0);
});

test('cảnh báo trước nguy cơ: báo "đói" và vào danh sách việc cần làm khi dưới mốc đói, cách rất xa lúc có nguy cơ bệnh', () => {
  const s = game(); put(s, 'ga'); emptyTroughs(s);
  let warnedAt = null, riskAt = FEED + RISK;
  for (let t = MIN; t <= 6 * MIN && warnedAt === null; t += MIN) {
    const ev = withRandom(0.99, () => G.tick(s, MIN));
    if (ev.some(e => e.type === 'hungry') && todoList(s).some(i => i.kind === 'hungry')) warnedAt = t;
  }
  assert.ok(warnedAt !== null, 'phải có thông báo đói và việc cần làm');
  assert.ok(warnedAt < HUSBANDRY.hungerMs, `báo lúc ${warnedAt / MIN} phút, trước khi đói lả`);
  assert.ok(riskAt - warnedAt >= 25 * MIN, 'còn dư thời gian cho người chơi cho ăn trước khi có nguy cơ');
});

test('việc cần làm liệt kê con vật đói ngay khi dưới mốc hungryBelow', () => {
  const s = game(); put(s, 'ga', { hunger: HUSBANDRY.hungryBelow - 1 }); put(s, 'ga', { hunger: HUSBANDRY.hungryBelow + 5 });
  assert.equal(todoList(s).find(i => i.kind === 'hungry').count, 1);
});
