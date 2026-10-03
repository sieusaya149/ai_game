// Mua online (hotfix): đặt hàng chợ Bà Tư và trạm thú y Cô Út từ bất cứ đâu, người giao hàng mang tới kho.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { DAY_MS, ITEMS, DELIVERY } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

// vườn mới, đủ cấp mua thuốc thú y, không có đơn hàng bảng tin chen vào
const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e12; s.exp = 5000; s.coins = 1000; return s; };
const M = id => DELIVERY.modes.find(m => m.id === id);
const fee = (cost, mode = 'm2') => Math.max(DELIVERY.feeMin, Math.ceil(cost * M(mode).fee));
const WAIT = M('m2').ms;
// chạy tới khi hàng vào kho (tối đa ms), trả mọi event
const runUntil = (s, ms, done) => { const ev = []; for (let t = 0; t < ms && !done(); t += 1000) ev.push(...G.tick(s, 1000)); return ev; };

test('đặt hàng: trừ xu ngay (tiền hàng + phí giao), hàng chưa vào kho mà nằm trong đơn chờ giao', () => {
  const s = newGame(), seeds = s.inv.seed_cai;
  const cost = ITEMS.seed_cai.price * 5 + ITEMS.medicine.price * 2;
  const r = G.orderOnline(s, { seed_cai: 5, medicine: 2 });
  assert.equal(r.ok, true, r.msg);
  assert.equal(s.coins, 1000 - cost - fee(cost));
  assert.equal(s.inv.seed_cai, seeds);
  assert.equal(s.inv.medicine, undefined);
  const list = G.pendingDeliveries(s);
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].items, { seed_cai: 5, medicine: 2 });
  assert.equal(list[0].total, cost + fee(cost));
});

test('người giao hàng lên đường sau thời gian chờ, tới nhà kho thì hàng vào kho (không vào giỏ), báo "Hàng đã giao tới kho"', () => {
  const s = newGame();
  G.orderOnline(s, { feed_ga: 10 });
  const before = s.inv.feed_ga || 0;
  G.tick(s, 1000);
  assert.equal(s.courier ?? null, null);   // chưa tới giờ đi
  runUntil(s, WAIT, () => s.courier);   // lên đường sớm hơn hạn đúng quãng đi bộ
  assert.equal(s.courier.state, 'coming');
  assert.equal(G.pendingDeliveries(s)[0].onWay, true);
  const ev = runUntil(s, 120_000, () => !s.deliveries.length);
  assert.equal(s.inv.feed_ga, before + 10);
  assert.equal(s.basket.feed_ga, undefined);
  assert.deepEqual(G.pendingDeliveries(s), []);
  const d = ev.find(e => e.type === 'delivered');
  assert.deepEqual(d.items, { feed_ga: 10 });
  assert.ok(s.log.some(l => l.text.includes('giao tới kho')));
  assert.equal(s.courier.state, 'leaving');   // giao xong thì đi ra cổng rồi biến mất
  G.tick(s, DELIVERY.leaveMs + 1000);
  assert.equal(s.courier, null);
});

test('đặt lúc chợ đóng (sau 18h) thì sáng hôm sau 6h mới giao; giờ dự kiến tính tới lúc chợ mở', () => {
  const s = newGame(); s.time = DAY_MS * 0.6;   // 20h
  assert.equal(G.marketOpen(s), false);
  assert.ok(G.orderOnline(s, { seed_cai: 1 }).ok);   // đặt online lúc nào cũng được
  const eta = G.pendingDeliveries(s)[0].eta;
  assert.ok(eta >= DAY_MS * 0.4 && eta < DAY_MS * 0.4 + 60_000, `eta ${eta}`);
  G.tick(s, DAY_MS * 0.4 - 2000);
  assert.equal(s.courier ?? null, null);
  assert.equal(s.deliveries.length, 1);
  runUntil(s, 120_000, () => !s.deliveries.length);
  assert.equal(s.deliveries.length, 0);
  assert.ok(s.time < DAY_MS * 1.1, 'giao ngay đầu buổi sáng');
});

test('giờ dự kiến lúc chợ mở: đợi đủ thời gian chờ cộng quãng đi bộ, giảm dần theo thời gian', () => {
  const s = newGame();
  G.orderOnline(s, { seed_cai: 1 });
  const e0 = G.pendingDeliveries(s)[0].eta;
  assert.ok(e0 <= WAIT && e0 > WAIT - 60_000, `eta ${e0}`);
  G.tick(s, 30_000);
  assert.equal(G.pendingDeliveries(s)[0].eta, e0 - 30_000);
});

test('không đặt được: giỏ trống, món không bán online (vật nuôi, nông sản, đồ nhặt), chưa đủ cấp, thiếu xu, quá nhiều đơn chờ', () => {
  const s = newGame();
  for (const cart of [{}, { seed_cai: 0 }, { ga: 1 }, { cai: 2 }, { wood: 1 }, { manure: 1 }]) {
    const r = G.orderOnline(s, cart);
    assert.equal(r.ok, false, JSON.stringify(cart));
  }
  const low = G.createGame({ name: 'Mới' }); low.coins = 1000;
  assert.match(G.orderOnline(low, { vitamin: 1 }).msg, /Cần cấp/);
  const poor = newGame(); poor.coins = 10;
  assert.match(G.orderOnline(poor, { deco_lamp: 1 }).msg, /Chưa đủ xu/);
  assert.equal(poor.coins, 10);
  for (let i = 0; i < DELIVERY.maxPending; i++) assert.ok(G.orderOnline(s, { seed_cai: 1 }).ok);
  const r = G.orderOnline(s, { seed_cai: 1 });
  assert.equal(r.ok, false);
  assert.match(r.msg, /đợi hàng tới/);
  assert.equal(s.deliveries.length, DELIVERY.maxPending);
});

test('phí giao: 10% tiền hàng làm tròn lên, ít nhất vài xu; báo giá trước khi đặt', () => {
  const s = newGame();
  const q = G.orderQuote(s, { seed_cai: 1 });
  assert.equal(q.fee, DELIVERY.feeMin);
  const big = G.orderQuote(s, { deco_scarecrow: 2 });
  assert.equal(big.fee, Math.ceil(300 * M('m2').fee));
  assert.equal(big.total, 300 + big.fee);
  assert.equal(s.coins, 1000);   // báo giá không trừ xu
});

test('nhiều đơn tới hạn cùng lúc thì một chuyến giao hết; đơn đặt sau đi chuyến sau', () => {
  const s = newGame();
  G.orderOnline(s, { seed_cai: 2 });
  G.orderOnline(s, { soap: 3 });
  const soap = s.inv.soap || 0, cai = s.inv.seed_cai;
  runUntil(s, WAIT, () => s.courier);
  assert.equal(s.courier.ids.length, 2);
  G.orderOnline(s, { treat: 1 });
  runUntil(s, 120_000, () => s.deliveries.length === 1);
  assert.deepEqual([s.inv.seed_cai, s.inv.soap], [cai + 2, soap + 3]);
  assert.equal(s.inv.treat || 0, 0);
  runUntil(s, 300_000, () => !s.deliveries.length);
  assert.equal(s.inv.treat, 1);
});

test('vắng nhà (chạy bù lúc mở lại) vẫn giao hàng như lúc chơi, có dòng trong màn "Trong lúc bạn vắng nhà"', () => {
  const s = newGame();
  G.orderOnline(s, { seed_cai: 4, vaccine: 1 });
  const cai = s.inv.seed_cai;
  // bản chơi liên tục
  const live = structuredClone(s);
  runUntil(live, 10 * 60_000, () => false);
  // bản lưu rồi mở lại sau 10 phút (chạy bù)
  store[G.SAVE_KEY] = JSON.stringify({ ...s, savedAt: Date.now() - 10 * 60_000 });
  const back = G.loadGame();
  for (const g of [live, back]) {
    assert.deepEqual([g.inv.seed_cai, g.inv.vaccine], [cai + 4, 1]);
    assert.deepEqual(g.deliveries, []);
    assert.equal(g.courier, null);
  }
  assert.ok(back.away.lines.some(l => /giao/.test(l)), back.away.lines.join(' | '));
});

test('bản lưu cũ chưa có đơn online vẫn đọc được: không có đơn chờ, không có người giao hàng', () => {
  const s = newGame();
  delete s.deliveries; delete s.courier;
  s.savedAt = Date.now();
  G.saveGame(s);
  const back = G.loadGame();
  assert.deepEqual(back.deliveries, []);
  assert.equal(back.courier, null);
  assert.deepEqual(G.pendingDeliveries(back), []);
});

test('chống gian lận: hàng đang chờ giao vẫn tính vào của cải, nên đặt rồi nhận một đơn lớn không bị coi là tăng vọt', () => {
  const s = newGame(); s.coins = 9000;
  const t0 = structuredClone(s);
  G.orderOnline(s, { deco_canopy: 40 });   // 7200 xu hàng
  assert.ok(G.checkSaveJump(t0, s, 1000).ok);
  runUntil(s, 5 * 60_000, () => s.courier && s.courier.arriveAt - s.time <= 3000);   // sắp tới kho
  const t1 = structuredClone(s);
  runUntil(s, 10_000, () => !s.deliveries.length);
  assert.equal(s.inv.deco_canopy, 40);
  assert.ok(G.checkSaveJump(t1, s, 10_000).ok, 'nhận hàng không làm của cải tăng vọt');
  assert.ok(G.wealthOf(s) <= G.wealthOf(t0));   // trả phí giao nên của cải giảm chút ít
});

test('hàng tới kho là thông báo 🟡 "Hàng đã giao tới kho", tắt được trong cài đặt', async () => {
  const { eventMeta } = await import('../public/notify.js');
  const { EVENT_LEVEL, NOTIFY_CATS } = await import('../public/data.js');
  const e = { type: 'delivered', orders: 1, items: { seed_cai: 2 } };
  const m = eventMeta(e);
  assert.equal(m.level, 'important');
  assert.ok(m.cat in NOTIFY_CATS);
  assert.match(EVENT_LEVEL.delivered.text(1, e), /Hàng đã giao tới kho/);
});

test('đang đi chơi vườn bạn thì không đặt hàng, không giao hàng ở vườn bạn; về nhà mới giao', () => {
  const me = newGame();
  G.orderOnline(me, { seed_cai: 3 });
  const cai = me.inv.seed_cai, host = newGame();
  const v = G.startVisit(me, structuredClone(host), 'Bình');
  assert.equal(v.courier ?? null, null);
  const r = G.orderOnline(v, { seed_cai: 1 });
  assert.equal(r.ok, false);
  assert.equal(me.deliveries.length, 1);
  G.tick(v, WAIT + 60_000);
  assert.equal(me.inv.seed_cai, cai);
  assert.equal(me.deliveries.length, 1);
});

// ---------- Ba kiểu giao: ngay 20% · 1 phút 15% · 2 phút 10% ----------
test('phí theo kiểu giao: ngay 30%, 1 phút 20%, 2 phút 10% (làm tròn lên, ít nhất feeMin); thiếu hoặc lạ thì như 2 phút', () => {
  const s = newGame();
  const cart = { deco_scarecrow: 2 }, cost = ITEMS.deco_scarecrow.price * 2;   // 300 xu
  for (const [mode, pct] of [['now', 0.3], ['m1', 0.2], ['m2', 0.1]]) {
    const q = G.orderQuote(s, cart, mode);
    assert.equal(q.fee, Math.ceil(cost * pct), mode);
    assert.equal(q.total, cost + q.fee);
  }
  assert.equal(G.orderQuote(s, cart).fee, Math.ceil(cost * 0.1));
  assert.equal(G.orderQuote(s, cart, 'xyz').fee, Math.ceil(cost * 0.1));
  assert.equal(G.orderQuote(s, { seed_cai: 1 }, 'now').fee, DELIVERY.feeMin);
});

test('giao ngay: trừ tiền hàng + phí 30%, hàng vào kho tức thì, không có đơn chờ, không cần người giao hàng; có event + nhật ký', () => {
  const s = newGame(), before = s.inv.feed_ga || 0;
  const cost = ITEMS.feed_ga.price * 10;
  const r = G.orderOnline(s, { feed_ga: 10 }, 'now');
  assert.equal(r.ok, true, r.msg);
  assert.equal(s.coins, 1000 - cost - fee(cost, 'now'));
  assert.equal(s.inv.feed_ga, before + 10);
  assert.deepEqual(G.pendingDeliveries(s), []);
  assert.equal(s.courier ?? null, null);
  assert.ok(s.log.some(l => l.text.includes('tới kho')));
  // hạt giống mua kiểu này vẫn tính vào "đã mua" của hướng dẫn
  const t = newGame(); G.orderOnline(t, { seed_cai: 1 }, 'now');
  assert.equal(t.stats.bought, 1);
});

test('giao ngay không bị chặn bởi đơn chờ đầy, nhưng vẫn cần đủ xu và đủ cấp', () => {
  const s = newGame();
  for (let i = 0; i < DELIVERY.maxPending; i++) assert.ok(G.orderOnline(s, { seed_cai: 1 }).ok);
  assert.equal(G.orderOnline(s, { seed_cai: 1 }).ok, false);
  assert.equal(G.orderOnline(s, { seed_cai: 1 }, 'now').ok, true);
  const poor = newGame(); poor.coins = 10;
  assert.equal(G.orderOnline(poor, { deco_lamp: 1 }, 'now').ok, false);
});

test('giao sau 1 phút: tổng thời gian tới kho (gồm đi bộ) không quá 1 phút; hàng đã vào kho đúng hạn dù người giao còn đi', () => {
  const s = newGame(), before = s.inv.feed_ga || 0;
  const cost = ITEMS.feed_ga.price * 4;
  assert.ok(G.orderOnline(s, { feed_ga: 4 }, 'm1').ok);
  assert.equal(s.coins, 1000 - cost - fee(cost, 'm1'));
  assert.ok(G.pendingDeliveries(s)[0].eta <= 60_000, 'eta ' + G.pendingDeliveries(s)[0].eta);
  runUntil(s, 59_000, () => false);
  assert.equal(s.inv.feed_ga || 0, before, 'chưa tới hạn');
  runUntil(s, 3000, () => false);
  assert.equal(s.inv.feed_ga, before + 4);
  assert.deepEqual(G.pendingDeliveries(s), []);
});

test('giao sau 2 phút: tổng thời gian tới kho không quá 2 phút', () => {
  const s = newGame(), before = s.inv.feed_ga || 0;
  assert.ok(G.orderOnline(s, { feed_ga: 4 }, 'm2').ok);
  assert.ok(G.pendingDeliveries(s)[0].eta <= 120_000);
  runUntil(s, 119_000, () => false);
  assert.equal(s.inv.feed_ga || 0, before);
  runUntil(s, 3000, () => false);
  assert.equal(s.inv.feed_ga, before + 4);
});

test('đơn cũ trong bản lưu (chỉ có due, không có kiểu giao) vẫn được giao như trước', () => {
  const s = newGame(), before = s.inv.feed_ga || 0;
  s.deliveries = [{ id: s.nextId++, items: { feed_ga: 3 }, cost: 30, fee: 5, at: s.time, due: s.time + 5000 }];
  runUntil(s, 120_000, () => !s.deliveries.length);
  assert.equal(s.inv.feed_ga, before + 3);
});
