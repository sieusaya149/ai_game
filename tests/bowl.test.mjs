// Bát ăn của chó cạnh chuồng chó (góp ý người chơi): đổ xương vào bát, chó đói thì tự đi tới bát ăn.
// Cùng một luật chạy ở trình duyệt, lúc chạy bù khi mở lại game và lúc server chạy bù. Qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { DOG, DAY_MS } from '../public/data.js';
import { mapOf } from '../public/farm.js';

const MIN = 60_000;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };
const quiet = fn => withRandom(0.99, fn);
const NOON = DAY_MS * 0.3;
const BOWL = { kind: 'bowl' };

// Vườn có chó trưởng thành, không con vật, không đơn hàng, chó không ỉa bậy
function newGame() {
  const s = G.createGame({ name: 'Hùng' });
  s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.coins = 1e6; s.exp = 1e6; s.time = NOON;
  Object.assign(s.dog, { stage: 'truong', age: G.stageStart('cho', 'truong'), hunger: 100, happy: 60, nextPoop: 1e15 });
  s.inv.dogfood = 10; s.basket = {};
  return s;
}
const fill = s => G.perform(s, BOWL, 'fill');

test('bát ăn nằm cạnh chuồng chó; bát mới trống', () => {
  const s = newGame(), m = mapOf(s);
  assert.ok(m.dogBowl, 'bản đồ vườn có chỗ đặt bát');
  assert.ok(Math.hypot(m.dogBowl.x - m.dogHome.x, m.dogBowl.y - m.dogHome.y) <= 24, 'bát sát chỗ chó nằm');
  assert.equal(s.dog.bowl, 0);
  const acts = G.actionsFor(s, BOWL);
  assert.equal(acts[0].id, 'fill');
  assert.match(acts[0].label, /trống/);
});

test('đổ xương vào bát: lấy 1 xương cho chó, bát chứa tối đa DOG.bowlMax phần', () => {
  const s = newGame();
  const r = fill(s);
  assert.equal(r.ok, true, r.msg);
  assert.equal(s.dog.bowl, 1); assert.equal(s.inv.dogfood, 9);
  assert.match(G.actionsFor(s, BOWL)[0].label, new RegExp(`1/${DOG.bowlMax}`));
  while (s.dog.bowl < DOG.bowlMax) assert.equal(fill(s).ok, true);
  const full = fill(s);
  assert.equal(full.ok, false); assert.equal(s.dog.bowl, DOG.bowlMax);
  assert.equal(s.inv.dogfood, 10 - DOG.bowlMax);
});

test('hết xương thì không đổ được, có lý do', () => {
  const s = newGame();
  s.inv.dogfood = 0;
  const a = G.actionsFor(s, BOWL)[0];
  assert.ok(a.disabled);
  assert.equal(fill(s).ok, false); assert.equal(s.dog.bowl, 0);
});

test('chó còn no thì để dành bát; đói thì đi tới bát, đi mất DOG.bowlWalkMs rồi mới ăn', () => {
  const s = newGame();
  fill(s); fill(s);
  quiet(() => G.tick(s, 5000));
  assert.equal(s.dog.bowl, 2, 'chó no chưa ăn');
  s.dog.hunger = DOG.bowlHungry - 1;
  quiet(() => G.tick(s, 1000));
  assert.ok(s.dog.eatAt > s.time, 'chó đang đi tới bát');
  assert.equal(s.dog.bowl, 2);
  quiet(() => G.tick(s, DOG.bowlWalkMs));
  assert.equal(s.dog.bowl, 1);
  assert.ok(s.dog.hunger >= 99);
  assert.equal(s.dog.eatAt, 0);
});

test('bát trống thì chó đói vẫn đói; cho ăn trực tiếp vẫn được như cũ', () => {
  const s = newGame();
  s.dog.hunger = 10;
  quiet(() => G.tick(s, DOG.bowlWalkMs + 2000));
  assert.ok(s.dog.hunger < 11);
  assert.equal(G.perform(s, { kind: 'dog' }, 'feed').ok, true);
  assert.equal(s.dog.hunger, 100);
});

test('chó đang đi theo chủ ra làng thì chưa ăn, về vườn mới ăn', () => {
  const s = newGame();
  fill(s);
  s.dog.hunger = 10; s.dog.scene = 'village';
  quiet(() => G.tick(s, DOG.bowlWalkMs + 2000));
  assert.equal(s.dog.bowl, 1);
  s.dog.scene = 'farm';
  quiet(() => G.tick(s, DOG.bowlWalkMs + 2000));
  assert.equal(s.dog.bowl, 0);
});

test('chạy bù lúc vắng nhà: chó tự ăn từng phần trong bát khi đói, tóm tắt có ghi lại', () => {
  const s = newGame();
  while (s.dog.bowl < DOG.bowlMax) fill(s);
  s.savedAt = Date.now() - 200 * MIN;
  const empty = structuredClone(s); empty.dog.bowl = 0;
  const l = quiet(() => G.loadGame(structuredClone(s)));
  const e = quiet(() => G.loadGame(empty));
  assert.equal(l.dog.bowl, 0, 'ăn hết bát trong 200 phút (mỗi bữa no được ~1 giờ)');
  assert.ok(l.dog.hunger > e.dog.hunger, 'có bát thì đỡ đói hơn');
  assert.ok(l.away.lines.some(x => x.includes(`${DOG.bowlMax} bữa`)), l.away.lines.join(' | '));
});

test('bản lưu cũ chưa có bát: bát trống; số phần hỏng thì kẹp lại', () => {
  const s = newGame();
  delete s.dog.bowl; delete s.dog.eatAt; s.savedAt = Date.now();
  const l = G.loadGame(structuredClone(s));
  assert.equal(l.dog.bowl, 0); assert.equal(l.dog.eatAt, 0);
  s.dog.bowl = 99;
  assert.equal(G.loadGame(structuredClone(s)).dog.bowl, DOG.bowlMax);
});

test('khách thăm vườn chạm vào bát chỉ xem được bát còn bao nhiêu, không đổ được', () => {
  const host = newGame();
  fill(host);
  host.savedAt = Date.now();
  const me = newGame();
  const v = G.startVisit(me, structuredClone(host), 'Hùng');
  const acts = G.actionsFor(v, BOWL);
  assert.equal(acts.length, 1);
  assert.ok(acts[0].disabled);
  assert.match(acts[0].label, new RegExp(`1/${DOG.bowlMax}`));
  assert.equal(G.perform(v, BOWL, 'fill').ok, false);
});
