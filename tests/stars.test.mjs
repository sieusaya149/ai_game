// Seam 1: chất lượng nông sản ★1–3 (issue 52). Luật "chăm kỹ" theo dõi từng ô trong vụ: không lúc nào khô hẳn,
// không để sâu quá 30 giây, có bón phân → ★2; thêm một lần chăm tay → ★3; lỡ một điều → ★1 (mặc định).
// Máy móc (không chăm tay lần nào) chỉ tới ★2. Nông sản tách theo sao ở mọi nơi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../public/state.js';
import { migrate } from '../public/migrate.js';
import { CROPS, STARS, DAY_MS, starKey, sellPrice, shipValue } from '../public/data.js';
import { setClock } from '../public/clock.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const SEC = 1000, MIN = 60_000;
const rnd = Math.random;
// không sâu, không cỏ (trừ khi test tự đặt)
const quiet = fn => { Math.random = () => 0.99; try { return fn(); } finally { Math.random = rnd; } };
const lucky = fn => { Math.random = () => 0.1; try { return fn(); } finally { Math.random = rnd; } };   // bắt sâu bằng tay trúng
const P = idx => ({ kind: 'plot', idx });

// Vườn mới, trời nhiều mây (không mưa tự tưới), đủ hạt, phân, thuốc; chợ đang mở (6h sáng ngày 1)
function farm() {
  const s = G.createGame({ name: 'Sao' });
  Object.assign(s, { tutorial: 99, weather: 'cloud', coins: 1e4 });
  Object.assign(s.inv, { seed_cai: 20, seed_lua: 5, fertilizer: 10, pesticide: 10 });
  return s;
}
const plots = s => s.plots.filter(p => p.unlocked).map(p => p.idx);
// cuốc, gieo `id` ở ô idx (chưa tưới)
function sow(s, idx, id = 'cai') {
  s.selectedSeed = id;
  assert.equal(G.perform(s, P(idx), 'till').ok, true);
  assert.equal(G.perform(s, P(idx), 'plant').ok, true);
  return s.plots[idx].crop;
}
const act = (s, idx, id) => { const r = G.perform(s, P(idx), id); assert.equal(r.ok, true, `${id}: ${r.msg}`); return r; };
// chạy tới khi ô chín (tối đa `max`)
function ripen(s, idx, max = 10 * MIN) {
  for (let t = 0; t < max && s.plots[idx].crop.progress < 1; t += 5 * SEC) quiet(() => G.tick(s, 5 * SEC));
  assert.ok(s.plots[idx].crop.progress >= 1, 'cây đã chín');
}
const harvest = (s, idx) => act(s, idx, 'harvest');

test('chăm đủ (tưới tay, bón phân, không khô, không sâu) thì ra ★3; ô hiện ★3 suốt vụ', () => {
  const s = farm(), [i] = plots(s);
  const c = sow(s, i);
  act(s, i, 'water'); act(s, i, 'fertilize');
  assert.equal(G.cropStar(c), 3);
  ripen(s, i);
  assert.equal(G.cropStar(s.plots[i].crop), 3);
  const r = harvest(s, i);
  assert.deepEqual(s.basket, { [starKey('cai', 3)]: 6 });   // bón phân +50%: 4 → 6
  assert.match(r.msg, /Cải xanh ★3/);
});

test('ô khô hẳn một lần thì không ra sao cao, tưới lại cũng không lấy lại được', () => {
  const s = farm(), [i] = plots(s);
  s.exp = 200;        // đủ cấp gieo lúa
  sow(s, i, 'lua');   // lúa lớn 5 phút (bón phân ~4,2 phút), một lần tưới chỉ giữ ẩm 4 phút
  act(s, i, 'water'); act(s, i, 'fertilize');
  for (let t = 0; t < 5 * MIN && s.plots[i].water > 0; t += 5 * SEC) quiet(() => G.tick(s, 5 * SEC));
  assert.equal(s.plots[i].water, 0, 'đất khô hẳn');
  assert.ok(s.plots[i].crop.progress < 1, 'khô lúc cây còn đang lớn');
  assert.equal(G.cropStar(s.plots[i].crop), 1);
  act(s, i, 'water');
  ripen(s, i);
  assert.equal(G.cropStar(s.plots[i].crop), 1);
  harvest(s, i);
  assert.deepEqual(s.basket, { lua: 8 });
});

test('gieo xuống đất khô rồi mới tưới không tính là khô hẳn (cây chưa lớn chút nào)', () => {
  const s = farm(), [i] = plots(s);
  sow(s, i);
  quiet(() => G.tick(s, 20 * SEC));
  act(s, i, 'water'); act(s, i, 'fertilize');
  ripen(s, i);
  assert.equal(G.cropStar(s.plots[i].crop), 3);
});

test('sâu quá 30 giây thì mất sao; bắt kịp trong 30 giây thì vẫn giữ ★3', () => {
  const s = farm(), [a, b] = plots(s);
  for (const i of [a, b]) { sow(s, i); act(s, i, 'water'); act(s, i, 'fertilize'); }
  quiet(() => G.tick(s, 10 * SEC));
  // cả hai ô có sâu cùng lúc (bản lưu ghi sẵn: sâu vừa bò lên)
  for (const i of [a, b]) Object.assign(s.plots[i].crop, { bugs: true, bugSince: s.time });
  quiet(() => G.tick(s, 20 * SEC));
  lucky(() => act(s, a, 'catch'));
  assert.equal(s.plots[a].crop.bugs, false);
  assert.equal(G.cropStar(s.plots[a].crop), 3, 'bắt sâu sau 20 giây: còn ★3');
  assert.equal(G.cropStar(s.plots[b].crop), 3, 'sâu mới 20 giây: chưa mất sao');
  quiet(() => G.tick(s, 12 * SEC));
  assert.equal(G.cropStar(s.plots[b].crop), 1, 'sâu 32 giây: mất sao ngay cả khi chưa bắt');
  act(s, b, 'spray');
  for (const i of [a, b]) ripen(s, i);
  assert.equal(G.cropStar(s.plots[b].crop), 1, 'phun thuốc xong cũng không lấy lại sao');
  harvest(s, a); harvest(s, b);
  assert.deepEqual(s.basket, { [starKey('cai', 3)]: 6, cai: 6 });
});

test('không bón phân thì không ra ★3 (không có sao cao nào: ★1); bón phân giữa vụ thì lên lại', () => {
  const s = farm(), [i, j] = plots(s);
  for (const k of [i, j]) { sow(s, k); act(s, k, 'water'); }
  assert.equal(G.cropStar(s.plots[i].crop), 1, 'mới gieo, chưa bón phân: ★1');
  quiet(() => G.tick(s, 30 * SEC));
  act(s, j, 'fertilize');
  assert.equal(G.cropStar(s.plots[j].crop), 3, 'bón phân lúc cây đang lớn vẫn kịp');
  for (const k of [i, j]) { ripen(s, k); harvest(s, k); }
  assert.deepEqual(s.basket, { cai: 4, [starKey('cai', 3)]: 6 });
});

test('máy tưới và phun tự động cả vụ, không chăm tay lần nào: tối đa ★2; thêm một lần chăm tay thì ra ★3', () => {
  // Máy (issue 58) chỉ đổi đất và sâu, không phải tay người chơi. Bón phân sẵn từ trước (bản lưu cũ chuyển lên v4).
  const machine = p => { p.water = 100; if (p.crop?.bugs) p.crop.bugs = false; };
  const run = (s, i) => { for (let t = 0; t < 5 * MIN && s.plots[i].crop.progress < 1; t += 5 * SEC) { machine(s.plots[i]); quiet(() => G.tick(s, 5 * SEC)); } };
  const s = farm(), [a, b] = plots(s);
  for (const i of [a, b]) { sow(s, i); s.plots[i].crop.fert = true; }
  s.plots[b].water = 50;
  act(s, b, 'water');   // ô b: một lần tưới tay
  run(s, a); run(s, b);
  assert.equal(G.cropStar(s.plots[a].crop), 2, 'chỉ có máy: ★2');
  assert.equal(G.cropStar(s.plots[b].crop), 3, 'có một lần tưới tay: ★3');
  // khách giúp tưới không phải tay của chính mình
  const g = farm(), [k] = plots(g);
  sow(g, k); g.plots[k].crop.fert = true;
  const r = G.guestOpApply(g, { name: 'Bình', level: 9 }, { id: 'op1', kind: 'help', act: 'water', idx: k });
  assert.equal(r.ok, true, r.msg);
  ripen(g, k);
  assert.equal(G.cropStar(g.plots[k].crop), 2, 'chỉ khách tưới giúp: ★2');
  // mỗi kiểu chăm tay đều tính: tưới, bắt sâu, phun thuốc, bón phân
  for (const id of ['water', 'catch', 'spray', 'fertilize']) {
    const h = farm(), [j] = plots(h);
    const c = sow(h, j);
    c.fert = id !== 'fertilize';
    if (id === 'catch' || id === 'spray') Object.assign(c, { bugs: true, bugSince: h.time });
    else h.plots[j].water = 50;
    lucky(() => act(h, j, id));
    machine(h.plots[j]);
    assert.equal(G.cropStar(c), 3, id);
  }
});

test('cây trái mùa (crop.offSeason, issue 54) chăm kỹ cả bằng tay cũng chỉ tới ★2', () => {
  const s = farm(), [i] = plots(s);
  sow(s, i); act(s, i, 'water'); act(s, i, 'fertilize');
  s.plots[i].crop.offSeason = true;   // bản lưu ghi sẵn: cây gieo trái mùa
  ripen(s, i);
  assert.equal(G.cropStar(s.plots[i].crop), 2);
  harvest(s, i);
  assert.deepEqual(s.basket, { [starKey('cai', 2)]: 6 });
});

test('giá bán ★2 = ×1.5, ★3 = ×2 cho mọi cây; chợ trả đúng giá theo sao', () => {
  assert.deepEqual(STARS.mul, [1, 1.5, 2]);
  for (const [id, d] of Object.entries(CROPS)) {
    assert.equal(sellPrice(starKey(id, 2)), Math.round(d.price * 1.5), id);
    assert.equal(sellPrice(starKey(id, 3)), d.price * 2, id);
  }
  const s = farm();
  s.basket = { duahau: 2, [starKey('duahau', 2)]: 2, [starKey('duahau', 3)]: 2 };
  const coins = s.coins;
  assert.equal(G.sell(s, starKey('duahau', 3), 2).coins, 320);
  assert.equal(G.sell(s, starKey('duahau', 2), 2).coins, 240);
  assert.equal(G.sell(s, 'duahau', 2).coins, 160);
  assert.equal(s.coins, coins + 720);
});

test('thu hoạch ba mức sao: giỏ, kho, thùng giao hàng tách ba dòng, không gộp', () => {
  const s = farm(), [a, b, c] = plots(s);
  for (const i of [a, b, c]) sow(s, i);
  act(s, a, 'water');                                    // ★1: không bón phân
  s.plots[b].water = 100; s.plots[b].crop.fert = true;   // ★2: bón phân sẵn, nước trời, không chăm tay (bản lưu ghi sẵn)
  act(s, c, 'water'); act(s, c, 'fertilize');            // ★3
  for (const i of [a, b, c]) { ripen(s, i); harvest(s, i); }
  assert.deepEqual(s.basket, { cai: 4, [starKey('cai', 2)]: 6, [starKey('cai', 3)]: 6 });
  assert.equal(G.stashAll(s).ok, true);
  assert.deepEqual(s.inv.cai, 4);
  assert.deepEqual([s.inv[starKey('cai', 2)], s.inv[starKey('cai', 3)]], [6, 6]);
  for (const k of ['cai', starKey('cai', 2), starKey('cai', 3)]) assert.equal(G.shipAdd(s, k, 'all').ok, true);
  assert.deepEqual(s.shipbin.items, { cai: 4, [starKey('cai', 2)]: 6, [starKey('cai', 3)]: 6 });
  assert.equal(G.shipPreview(s), Math.floor((4 * 5 + 6 * 8 + 6 * 10) * 0.8));
  // lấy lại đúng mức sao
  assert.equal(G.shipTake(s, starKey('cai', 2), 1).ok, true);
  assert.deepEqual(s.basket, { [starKey('cai', 2)]: 1 });
  const coins = s.coins;
  quiet(() => G.tick(s, DAY_MS));   // qua 6h sáng: lái buôn trả đúng theo sao
  assert.equal(s.coins, coins + shipValue({ cai: 4, [starKey('cai', 2)]: 5, [starKey('cai', 3)]: 6 }));
});

test('đơn hàng đọc sao: món ★2 không nhận hàng ★1; đơn nhận hàng từ sao đó trở lên, lấy sao thấp trước', () => {
  const s = farm();
  s.orders = [{ id: 1, who: 'Bà Tư', items: { [starKey('cai', 2)]: 3 }, coins: 50, exp: 5 }, { id: 2, who: 'Chú Ba', items: { cai: 3 }, coins: 30, exp: 3 }];
  s.basket = { cai: 9 };
  assert.equal(G.orderHave(s, starKey('cai', 2)), 0);
  const r = G.fulfillOrder(s, 1);
  assert.equal(r.ok, false);
  assert.match(r.msg, /cải xanh ★2/i);
  s.basket = { cai: 1, [starKey('cai', 2)]: 1, [starKey('cai', 3)]: 5 };
  assert.equal(G.orderHave(s, 'cai'), 7);
  assert.equal(G.orderHave(s, starKey('cai', 2)), 6);
  assert.equal(G.fulfillOrder(s, 2).ok, true);
  assert.deepEqual(s.basket, { [starKey('cai', 3)]: 4 }, '★1 rồi ★2 trước, thiếu mới lấy ★3');
  assert.equal(G.fulfillOrder(s, 1).ok, true);
  assert.deepEqual(s.basket, { [starKey('cai', 3)]: 1 });
});

test('đơn hàng mới từ cấp 5 có lúc đòi hàng ★2/★3, thưởng theo giá có sao', () => {
  const s = farm();
  s.exp = 1e6;
  const asked = new Set();
  for (let i = 0; i < 300; i++) { s.orders = []; s.nextOrderAt = 0; G.tick(s, 1000); for (const k of Object.keys(s.orders[0]?.items ?? {})) asked.add(k.split('@')[1] ?? '1'); }
  assert.ok(asked.has('1') && asked.has('2') && asked.has('3'), [...asked].join());
  const low = farm();
  for (let i = 0; i < 200; i++) { low.orders = []; low.nextOrderAt = 0; G.tick(low, 1000); assert.ok(Object.keys(low.orders[0].items).every(k => !k.includes('@')), 'dưới cấp 5 đơn chưa đòi sao'); }
});

test('nông sản cũ từ bản v3 là ★1 và bán đúng giá ★1 ở chợ, thùng giao hàng và đơn hàng', () => {
  const old = JSON.parse(readFileSync(new URL('./fixtures/v3-farm.json', import.meta.url), 'utf8'));
  const s = migrate(old);
  s.time = Math.floor(s.time / DAY_MS) * DAY_MS + DAY_MS * 0.1;   // giữa buổi sáng: chợ mở
  const crops = Object.entries({ ...s.basket }).filter(([k]) => CROPS[k]);
  assert.ok(crops.length > 0, 'fixture có nông sản trong giỏ');
  for (const [k, n] of crops) {
    const coins = s.coins;
    assert.equal(G.sell(s, k, n).coins, CROPS[k].price * n, k);
    assert.equal(s.coins, coins + CROPS[k].price * n);
  }
  const kept = Object.entries(s.inv).filter(([k]) => CROPS[k]), bin = { ...s.shipbin.items };
  for (const [k, n] of kept) { assert.equal(G.shipAdd(s, k, n).ok, true); bin[k] = (bin[k] || 0) + n; }
  assert.deepEqual(s.shipbin.items, bin);
  assert.equal(G.shipPreview(s), Math.floor(Object.entries(bin).reduce((a, [k, n]) => a + n * (CROPS[k]?.price ?? sellPrice(k)), 0) * 0.8));
  // đơn hàng cũ (khóa không sao) nhận nông sản cũ ★1
  const o = s.orders.find(x => Object.keys(x.items).some(k => CROPS[k]));
  assert.ok(o, 'fixture có đơn hàng nông sản');
  s.basket = Object.fromEntries(Object.entries(o.items));
  assert.equal(G.fulfillOrder(s, o.id).ok, true);
});

test('trộm cây chín có sao: khách được đúng món có sao, giá trị đồ chín tính theo sao', () => {
  setClock(() => Date.UTC(2026, 0, 5, 3));
  try {
    const s = farm(), [i] = plots(s);
    s.exp = 1e6;
    sow(s, i); act(s, i, 'water'); act(s, i, 'fertilize'); ripen(s, i);
    assert.equal(G.ripeValue(s), 6 * sellPrice(starKey('cai', 3)) + (s.eggs?.length ?? 0) * sellPrice('trung'));
    const r = G.guestOpApply(s, { name: 'Tèo', level: 9, room: 99 }, { id: 'st1', kind: 'steal', act: 'crop', idx: i });
    assert.equal(r.ok, true, r.msg);
    assert.deepEqual(Object.keys(r.reward.items), [starKey('cai', 3)]);
  } finally { setClock(); }
});

test('checkSaveJump: thu hoạch cả ruộng ★3 một lúc là hợp lý; đồ ★3 tự dưng xuất hiện thì vẫn chặn', () => {
  const prev = farm();
  prev.mode = 'online';
  prev.basket = {};
  for (const i of plots(prev)) Object.assign(prev.plots[i], { soil: 'tilled', water: 100 });
  for (const i of plots(prev)) prev.plots[i].crop = { id: 'duahau', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: true, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: true } };
  const next = structuredClone(prev);
  next.simMs += 10 * SEC;
  for (const i of plots(next)) { harvest(next, i); G.stashAll(next); }   // giỏ đầy thì cất kho rồi hái tiếp
  assert.equal(next.inv[starKey('duahau', 3)], 9 * plots(prev).length);
  assert.ok(G.wealthOf(next) - G.wealthOf(prev) > G.SAVE_JUMP.wealth * 2, 'thu hoạch được nhiều hơn mức cho sẵn');
  assert.equal(G.checkSaveJump(prev, next, 10 * SEC).ok, true);
  // ruộng không có gì chín mà giỏ tự dưng đầy dưa hấu ★3
  const bare = structuredClone(prev);
  for (const i of plots(bare)) bare.plots[i].crop = null;
  const cheat = structuredClone(bare);
  cheat.simMs += 10 * SEC; cheat.inv = { ...next.inv };
  assert.equal(G.checkSaveJump(bare, cheat, 10 * SEC).reason, 'coins');
  // đổi sao cây đang mọc thành ★3 rồi thu hoạch: cây đã khô hẳn chỉ được tính giá ★1
  const dry = structuredClone(prev);
  for (const i of plots(dry)) dry.plots[i].crop.q.dry = true;
  const fake = structuredClone(next);
  assert.equal(G.checkSaveJump(dry, fake, 10 * SEC).reason, 'coins');
});
