// Màu lông chó và mèo (góp ý người chơi): chọn lúc nhận nuôi / mua, đổi lại ở trạm thú y Cô Út. Qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { COATS, COAT, DAY_MS } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const NOON = DAY_MS * 0.3, NIGHT = DAY_MS * 0.8;

// Ô trống trong đất để đặt công trình
const freeTile = (s, what) => {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (G.canPlace(s, what, c, r).ok) return { c, r };
  throw new Error('không còn chỗ trống');
};
// Vườn giàu, ban ngày, đã có nhà mèo
function newGame(opts) {
  const s = G.createGame({ name: 'Hùng', ...opts });
  s.orders = []; s.nextOrderAt = 1e15; s.time = NOON; s.coins = 1e6; s.exp = 5000;
  const t = freeTile(s, { kind: 'cathouse' });
  assert.equal(G.placeEntity(s, { kind: 'cathouse' }, t.c, t.r).ok, true);
  const id = G.catHouses(s)[0].id;
  assert.equal(G.upgradePen(s, id).ok, true); assert.equal(G.upgradePen(s, id).ok, true);   // nhà mèo cấp 3: 3 chỗ
  return s;
}

test('chó mới có màu lông mặc định là đen (Mực), chọn được màu khác lúc nhận nuôi', () => {
  assert.equal(G.createGame({ name: 'A' }).dog.coat, COAT.def.cho);
  assert.equal(COAT.def.cho, 'den');
  assert.equal(G.createGame({ name: 'A', dogCoat: 'vang' }).dog.coat, 'vang');
  assert.equal(G.createGame({ name: 'A', dogCoat: 'tim' }).dog.coat, 'den');   // màu lạ: về mặc định
  assert.deepEqual(Object.keys(COATS.cho), ['vang', 'den', 'trang', 'dom']);
  assert.deepEqual(Object.keys(COATS.meo), ['muop', 'vang', 'den', 'tamthe']);
});

test('mua mèo chọn được màu lông; không chọn thì mướp vàng như trước; màu lạ bị từ chối', () => {
  const s = newGame();
  assert.equal(G.buyCat(s, 'f', 'tamthe').ok, true);
  assert.equal(G.cats(s).at(-1).coat, 'tamthe');
  assert.equal(G.buyAnimal(s, 'meo', 'm', 'den').ok, true);
  assert.equal(G.cats(s).at(-1).coat, 'den');
  const coins = s.coins, n = G.cats(s).length;
  const r = G.buyCat(s, 'm', 'trang');   // mèo không có màu trắng
  assert.equal(r.ok, false); assert.equal(r.reason, 'coat');
  assert.equal(s.coins, coins); assert.equal(G.cats(s).length, n);
  assert.equal(G.buyCat(s, 'm').ok, true);
  assert.equal(G.cats(s).at(-1).coat, 'vang');
});

test('bản lưu cũ chưa có màu lông: chó đen, mèo mướp vàng; màu hỏng cũng về mặc định', () => {
  const s = newGame();
  G.buyCat(s, 'f'); G.buyCat(s, 'm');
  delete s.dog.coat; delete s.cats[0].coat; s.cats[1].coat = 'xanh';
  s.savedAt = Date.now();
  const l = G.loadGame(structuredClone(s));
  assert.equal(l.dog.coat, 'den');
  assert.deepEqual(l.cats.map(c => c.coat), ['vang', 'vang']);
  s.dog.coat = 'dom'; s.cats[0].coat = 'tamthe';
  const k = G.loadGame(structuredClone(s));
  assert.equal(k.dog.coat, 'dom'); assert.equal(k.cats[0].coat, 'tamthe');
});

test('đổi màu lông ở trạm thú y Cô Út: tốn COAT.price xu, cho chó và từng con mèo', () => {
  const s = newGame();
  G.buyCat(s, 'f');
  const c = G.cats(s)[0], coins = s.coins;
  const r = G.setCoat(s, 'dog', 'trang');
  assert.equal(r.ok, true, r.msg); assert.equal(r.price, COAT.price);
  assert.equal(s.dog.coat, 'trang'); assert.equal(s.coins, coins - COAT.price);
  assert.equal(G.setCoat(s, c.id, 'muop').ok, true);
  assert.equal(c.coat, 'muop'); assert.equal(s.coins, coins - 2 * COAT.price);
});

test('đổi màu lông bị từ chối: trạm đóng cửa, màu đang có, màu lạ, thiếu xu, không có con này', () => {
  const s = newGame();
  G.buyCat(s, 'f');
  const c = G.cats(s)[0];
  const why = (who, coat) => { const before = JSON.stringify([s.coins, s.dog.coat, c.coat]); const r = G.setCoat(s, who, coat); assert.equal(r.ok, false); assert.equal(JSON.stringify([s.coins, s.dog.coat, c.coat]), before); return r.reason; };
  assert.equal(why('dog', 'den'), 'same');
  assert.equal(why('dog', 'tamthe'), 'coat');   // chó không có màu tam thể
  assert.equal(why(c.id, 'dom'), 'coat');
  assert.equal(why(99999, 'den'), 'missing');
  s.time = NIGHT;
  assert.equal(why('dog', 'vang'), 'closed');
  s.time = NOON; s.coins = COAT.price - 1;
  assert.equal(why('dog', 'vang'), 'coins');
});
