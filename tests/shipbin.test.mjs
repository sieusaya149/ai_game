// Thùng giao hàng: bỏ đồ vào/lấy lại, số xu dự kiến = 80% giá chợ, chốt lúc 6h sáng (cả khi chạy bù offline), vườn cũ tự có thùng.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { DAY_MS, CROPS, PRODUCTS, SHIP_RATE } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e12; return s; };
const act = (s, t, id) => G.actionsFor(s, t).find(a => a.id === id);

test('vườn mới có sẵn một thùng cạnh nhà kho, thùng rỗng', () => {
  const s = newGame(), m = G.mapOf(s);
  assert.equal(s.farm.ents.filter(e => e.kind === 'shipbin').length, 1);
  assert.deepEqual(s.shipbin, { items: {} });
  const b = m.building('shipbin'), shed = m.building('shed');
  assert.ok(Math.abs(b.foot.c - shed.foot.c) <= 3 && Math.abs(b.foot.r - shed.foot.r) <= 4);
  assert.deepEqual(G.actionsFor(s, { kind: 'building', id: 'shipbin' }).map(a => a.id), ['open']);
});

test('bỏ đồ vào thùng lấy từ giỏ trước rồi tới kho; số xu dự kiến = 80% giá chợ làm tròn xuống', () => {
  const s = newGame(); s.basket = { cai: 3 }; s.inv.cai = 4; s.inv.trung = 5;
  assert.ok(G.shipAdd(s, 'cai', 5).ok);
  assert.deepEqual([s.basket.cai, s.inv.cai], [undefined, 2]);
  assert.equal(s.shipbin.items.cai, 5);
  assert.equal(G.shipPreview(s), Math.floor(5 * CROPS.cai.price * SHIP_RATE));
  G.shipAdd(s, 'trung', 'all');
  assert.equal(s.inv.trung, undefined);
  assert.equal(G.shipPreview(s), Math.floor((5 * CROPS.cai.price + 5 * PRODUCTS.trung.price) * 0.8));
});

test('không bỏ được thứ không có, không đủ, hay không phải nông sản', () => {
  const s = newGame(); s.inv.cai = 2;
  assert.equal(G.shipAdd(s, 'cai', 3).ok, false);
  assert.equal(G.shipAdd(s, 'seed_cai', 1).ok, false);
  assert.equal(G.shipAdd(s, 'carot', 1).ok, false);
  assert.deepEqual(s.shipbin.items, {});
  assert.equal(s.inv.cai, 2);
});

test('lấy lại về giỏ nếu còn chỗ, hết chỗ thì về kho; lấy lại trước 6h được', () => {
  const s = newGame(); s.inv.cai = 10; G.shipAdd(s, 'cai', 10);
  s.basket = { trung: G.basketCap(s) - 4 };   // giỏ còn chỗ 4
  assert.ok(G.shipTake(s, 'cai', 'all').ok);
  assert.equal(s.basket.cai, 4);
  assert.equal(s.inv.cai, 6);
  assert.deepEqual(s.shipbin.items, {});
  assert.equal(G.shipPreview(s), 0);
  assert.equal(G.shipTake(s, 'cai', 1).ok, false);
});

test('6h sáng lái buôn lấy hết, trả xu, báo và ghi nhật ký; ngày không đổi thì chưa chốt', () => {
  const s = newGame(); s.time = DAY_MS - 5000; s.day = 1; s.inv.cai = 5; G.shipAdd(s, 'cai', 5);
  const coins = s.coins, want = G.shipPreview(s);
  assert.deepEqual(G.tick(s, 3000).filter(e => e.type === 'shipped'), []);
  assert.equal(s.coins, coins);
  const ev = G.tick(s, 3000);
  const sh = ev.find(e => e.type === 'shipped');
  assert.equal(sh.coins, want);
  assert.deepEqual(sh.items, { cai: 5 });
  assert.equal(s.coins, coins + want);
  assert.deepEqual(s.shipbin.items, {});
  assert.ok(s.log[0].text.includes(String(want)));
});

test('thùng rỗng thì 6h sáng không báo gì', () => {
  const s = newGame(); s.time = DAY_MS - 500; s.day = 1;
  const ev = G.tick(s, 1000);
  assert.equal(ev.some(e => e.type === 'shipped'), false);
});

test('ngủ qua đêm cũng chốt thùng', () => {
  const s = newGame(); s.time = 0.9 * DAY_MS; s.day = 1; s.inv.trung = 4; G.shipAdd(s, 'trung', 4);
  const want = G.shipPreview(s), coins = s.coins;
  assert.ok(G.sleep(s).ok);
  assert.equal(s.coins, coins + want);
  assert.deepEqual(s.shipbin.items, {});
});

test('chạy bù offline qua 6h cũng chốt đúng, đồ không bị trừ hai lần', () => {
  const s = newGame(); s.time = 0.8 * DAY_MS; s.day = 1; s.inv.cai = 6; G.shipAdd(s, 'cai', 6);
  const want = G.shipPreview(s), coins = s.coins;
  s.savedAt = Date.now() - 0.3 * DAY_MS;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const r = Math.random; Math.random = () => 0.99;
  let l; try { l = G.loadGame(); } finally { Math.random = r; }
  assert.ok(l.time > DAY_MS);
  assert.equal(l.coins, coins + want);
  assert.deepEqual(l.shipbin.items, {});
});

test('bản lưu v2 chưa có thùng: tự thêm một thùng ở chỗ trống hợp lệ, vẫn tới được mọi nơi', () => {
  const s = newGame();
  s.farm.ents = s.farm.ents.filter(e => e.kind !== 'shipbin'); s.farm.rev++; delete s.shipbin;
  s.savedAt = Date.now();
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = G.loadGame();
  assert.equal(l.farm.ents.filter(e => e.kind === 'shipbin').length, 1);
  assert.deepEqual(l.shipbin, { items: {} });
  const b = G.mapOf(l).building('shipbin');
  assert.ok(G.reachable(G.mapOf(l), G.mapOf(l).gateIn ?? G.mapOf(l).spawn, b.at));
  assert.equal(G.canPlace(l, { id: l.farm.ents.find(e => e.kind === 'shipbin').id }, b.foot.c, b.foot.r).ok, true);
});

test('thùng là thực thể dời được bằng chế độ xây dựng', () => {
  const s = newGame(), e = s.farm.ents.find(x => x.kind === 'shipbin');
  assert.ok(G.canMove(e));
});

test('vườn chuyển từ v1 có thùng, không chặn đường vào nhà kho, nhà, ruộng, chuồng', async () => {
  const { readFileSync } = await import('node:fs');
  const v1 = JSON.parse(readFileSync(new URL('./fixtures/v1-full.json', import.meta.url), 'utf8')); v1.savedAt = Date.now();
  for (const k of Object.keys(store)) delete store[k];
  store['nongtrai-save-v1'] = JSON.stringify(v1);
  const r = Math.random; Math.random = () => 0.99;
  let l; try { l = G.loadGame(); } finally { Math.random = r; }
  assert.equal(l.farm.ents.filter(e => e.kind === 'shipbin').length, 1);
  const m = G.mapOf(l), from = m.gateIn ?? m.spawn;
  for (const id of ['shipbin', 'shed', 'house', 'well']) assert.ok(G.reachable(m, from, m.building(id).at), id);
});
