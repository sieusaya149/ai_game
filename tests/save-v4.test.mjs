// Seam 1: bản lưu v4 (issue 50, Phase 3): chuyển v3→v4 và chỗ để sẵn cho thành thạo, sao, giếng, bồn, khối ruộng, nhà kính, hố ủ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../public/state.js';
import { migrate, SAVE_VERSION } from '../public/migrate.js';
import { CROPS, PRODUCTS, STARS, starKey, starOf, baseOf, sellPrice, itemName, shipValue } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const clear = () => { for (const k of Object.keys(store)) delete store[k]; };
const V3 = 'nongtrai-save-v3';
const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
// Ghi bản v3 mẫu như thể người chơi vừa thoát game (không chạy bù)
const seedV3 = (name, mut) => { clear(); const s = fixture(name); s.savedAt = Date.now(); mut?.(s); store[V3] = JSON.stringify(s); return s; };
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };
const QUALITY = { dry: false, bugMax: 0, hand: false };
const UPGRADES = { drip: false, spray: false, rich: false, glass: false };

test('mở bản v3 đang chơi dở: thành v4, cây giữ nguyên tiến độ, đồ cũ thành ★1, giếng cấp 1, thành thạo cấp 1', () => {
  const old = seedV3('v3-farm');
  const s = quiet(() => G.loadGame());
  assert.equal(SAVE_VERSION, 4);
  assert.equal(s.v, 4);
  // cây đang trồng dở: đúng loại, đúng tiến độ, bón phân còn đó; có chỗ theo dõi chất lượng vụ
  const growing = old.plots.filter(p => p.crop);
  assert.ok(growing.length >= 5 && growing.some(p => p.crop.progress < 1) && growing.some(p => p.crop.fert));
  for (const o of growing) {
    const c = s.plots[o.idx].crop;
    assert.equal(c.id, o.crop.id, `ô ${o.idx}`);
    assert.equal(c.progress, o.crop.progress, `ô ${o.idx}`);
    assert.equal(c.fert, o.crop.fert);
    assert.deepEqual(c.q, QUALITY);
  }
  assert.ok(s.plots.every(p => p.mulch === false), 'chưa ô nào phủ rơm');
  // nông sản trong giỏ, kho, thùng giao hàng, đơn hàng: giữ nguyên số lượng, là ★1
  for (const k of ['basket', 'inv']) for (const [item, n] of Object.entries(old[k])) assert.equal(s[k][item], n, `${k}.${item}`);
  assert.deepEqual(s.shipbin.items, old.shipbin.items);
  assert.deepEqual(s.orders, old.orders);
  const produce = [...Object.keys(old.basket), ...Object.keys(old.shipbin.items), ...Object.keys(old.orders[0].items), 'lua'].filter(k => CROPS[k]);
  assert.ok(produce.length >= 5);
  for (const k of produce) assert.equal(starOf(k), 1, k);
  assert.equal(G.haveItem(s, starKey('cai', 1)), old.basket.cai);
  assert.equal(G.haveItem(s, starKey('cai', 2)), 0);
  // giếng cấp 1, chưa có bồn nước, khối ruộng chưa có nâng cấp
  const wells = s.farm.ents.filter(e => e.kind === 'well');
  assert.equal(wells.length, 1);
  assert.equal(wells[0].lv, 1);
  assert.equal(G.wellLv(s), 1);
  assert.deepEqual(s.water, { level: 0, pump: 0, power: 0, bill: 0 });
  const fields = s.farm.ents.filter(e => e.kind === 'field');
  assert.ok(fields.length >= 1);
  for (const f of fields) assert.deepEqual(f.up, UPGRADES);
  // thành thạo: đủ 16 loại cây, cấp 1; v3 chỉ đếm tổng số lần thu hoạch nên chưa chia được theo cây
  assert.ok(old.stats.harvests > 0);
  assert.deepEqual(Object.keys(s.mastery).sort(), Object.keys(CROPS).sort());
  for (const id of Object.keys(CROPS)) assert.deepEqual(s.mastery[id], { lv: 1, n: 0 }, id);
  assert.equal(s.stats.harvests, old.stats.harvests, 'thống kê cũ còn nguyên');
  // phần còn lại không đổi
  assert.equal(s.coins, old.coins); assert.equal(s.exp, old.exp);
  assert.deepEqual(s.animals.map(a => [a.id, a.type, a.stage]), old.animals.map(a => [a.id, a.type, a.stage]));
});

test('sau khi chuyển: cây chín thu hoạch được, cây đang lớn tiếp tục lớn', () => {
  const old = seedV3('v3-farm');
  const s = quiet(() => G.loadGame());
  const ripe = old.plots.find(p => p.crop?.progress >= 1);
  const before = G.haveItem(s, ripe.crop.id);
  const r = quiet(() => G.perform(s, { kind: 'plot', idx: ripe.idx }, 'harvest'));
  assert.equal(r.ok, true, r.msg);
  assert.equal(G.haveItem(s, ripe.crop.id), before + CROPS[ripe.crop.id].yield);
  assert.equal(s.plots[ripe.idx].crop, null);
  const grow = old.plots.find(p => p.crop && p.crop.progress < 1 && !p.crop.fert);
  s.plots[grow.idx].water = 100;
  quiet(() => G.tick(s, 5000));
  assert.ok(s.plots[grow.idx].crop.progress > grow.crop.progress);
});

test('chuyển v3→v4 là hàm thuần: chạy hai lần cho cùng kết quả, không ngẫu nhiên, không đụng bản gốc', () => {
  for (const name of ['v3-farm', 'v3-fresh']) {
    const raw = fixture(name), copy = structuredClone(raw);
    const r = Math.random; Math.random = () => { throw new Error('không được ngẫu nhiên'); };
    try { assert.deepEqual(migrate(raw), migrate(raw)); } finally { Math.random = r; }
    assert.deepEqual(raw, copy);
  }
  // qua loadGame cũng thế (như mở trên hai máy)
  seedV3('v3-farm');
  const a = quiet(() => G.loadGame());
  delete store[G.SAVE_KEY]; delete store['nongtrai-migrated-v4'];
  const b = quiet(() => G.loadGame());
  for (const s of [a, b]) { delete s.savedAt; s.log = []; }
  assert.deepEqual(a, b);
});

test('key v3 còn nguyên sau khi chuyển; bản v4 ghi ở key mới; đã có v4 thì không đọc lại v3', () => {
  seedV3('v3-farm');
  const before = store[V3];
  quiet(() => G.loadGame());
  assert.equal(store[V3], before);
  assert.equal(G.SAVE_KEY, 'nongtrai-save-v4');
  assert.equal(JSON.parse(store[G.SAVE_KEY]).v, 4);
  const s = G.loadGame(); s.coins = 777; G.saveGame(s);
  assert.equal(G.loadGame().coins, 777);
  assert.equal(store[V3], before);
  // chơi lại từ đầu thì không lôi bản v3 cũ lên nữa
  G.resetGame();
  assert.equal(G.loadGame(), null);
  assert.equal(store[V3], before);
});

test('bản v3 hỏng: báo lỗi, không ghi gì, bản v3 giữ nguyên', () => {
  const fx = fixture('v3-farm');
  const bad = [
    '{"v":3,"farm":',
    JSON.stringify({ ...fx, plots: 'hỏng' }),
    JSON.stringify({ ...fx, plots: fx.plots.map((p, i) => (i ? p : { ...p, crop: { ...p.crop, id: 'rong' } })) }),
    JSON.stringify({ ...fx, basket: ['cai'] }),
  ];
  for (const raw of bad) {
    clear();
    store[V3] = raw;
    assert.equal(G.loadGame(), null);
    assert.match(G.loadProblem(), /Không đọc được/);
    assert.equal(store[V3], raw);
    assert.equal(store[G.SAVE_KEY], undefined);
    assert.equal(store['nongtrai-migrated-v4'], undefined);
  }
});

test('bản v1, v2 vẫn đi thẳng lên v4', () => {
  for (const [name, key] of [['v1-mid', 'nongtrai-save-v1'], ['v2-farm', 'nongtrai-save-v2']]) {
    clear();
    const old = fixture(name); old.savedAt = Date.now();
    store[key] = JSON.stringify(old);
    const s = quiet(() => G.loadGame());
    assert.equal(s.v, 4, name);
    assert.equal(G.wellLv(s), 1);
    assert.deepEqual(s.mastery.cai, { lv: 1, n: 0 });
    assert.equal(store[key], JSON.stringify(old));
  }
});

test('vườn mới tạo ở v4 có đủ chỗ cho Phase 3', () => {
  clear();
  const s = G.createGame({ name: 'Mới' });
  assert.equal(s.v, 4);
  assert.deepEqual(Object.keys(s.mastery).sort(), Object.keys(CROPS).sort());
  assert.ok(Object.values(s.mastery).every(m => m.lv === 1 && m.n === 0));
  assert.equal(G.wellLv(s), 1);
  assert.deepEqual(s.water, { level: 0, pump: 0, power: 0, bill: 0 });
  for (const f of s.farm.ents.filter(e => e.kind === 'field')) assert.deepEqual(f.up, UPGRADES);
  assert.ok(s.plots.every(p => p.mulch === false));
  // gieo hạt: vụ mới có chỗ theo dõi chất lượng
  quiet(() => { G.perform(s, { kind: 'plot', idx: 0 }, 'till'); G.perform(s, { kind: 'plot', idx: 0 }, 'plant'); });
  assert.deepEqual(s.plots[0].crop.q, QUALITY);
  // khối ruộng xây thêm cũng có chỗ nâng cấp; nạp lại bản thiếu trường v4 thì được bù mặc định
  const raw = structuredClone(s);
  delete raw.mastery.cai; delete raw.water; delete raw.plots[0].crop.q; delete raw.plots[1].mulch;
  delete raw.farm.ents.find(e => e.kind === 'well').lv;
  const m = migrate(raw);
  assert.deepEqual(m.mastery.cai, { lv: 1, n: 0 });
  assert.deepEqual(m.water, { level: 0, pump: 0, power: 0, bill: 0 });
  assert.deepEqual(m.plots[0].crop.q, QUALITY);
  assert.equal(m.plots[1].mulch, false);
  assert.equal(G.wellLv(m), 1);
});

test('nông sản tách theo sao: khóa ★1 là id cây, ★2/★3 là khóa riêng; giá ×1.5 và ×2', () => {
  assert.deepEqual(STARS.mul, [1, 1.5, 2]);
  assert.equal(starKey('cai', 1), 'cai');
  assert.notEqual(starKey('cai', 2), 'cai');
  assert.notEqual(starKey('cai', 2), starKey('cai', 3));
  for (const n of [1, 2, 3]) { assert.equal(starOf(starKey('dau', n)), n); assert.equal(baseOf(starKey('dau', n)), 'dau'); }
  assert.equal(sellPrice(starKey('dau', 2)), Math.round(CROPS.dau.price * 1.5));
  assert.equal(sellPrice(starKey('dau', 3)), CROPS.dau.price * 2);
  assert.match(itemName(starKey('dau', 3)), /Dâu tây.*★3/);
  assert.equal(starOf('trung'), 1); assert.equal(sellPrice('trung'), PRODUCTS.trung.price);
  // giỏ, kho, thùng giao hàng giữ riêng từng mức sao
  const s = G.createGame({ name: 'Sao' });
  s.basket = { dau: 2, [starKey('dau', 3)]: 1 };
  assert.equal(G.haveItem(s, 'dau'), 2);
  assert.equal(G.haveItem(s, starKey('dau', 3)), 1);
  assert.equal(G.shipAdd(s, starKey('dau', 3), 1).ok, true);
  assert.deepEqual(s.shipbin.items, { [starKey('dau', 3)]: 1 });
  assert.equal(shipValue(s.shipbin.items), Math.floor(CROPS.dau.price * 2 * 0.8));
  assert.equal(G.haveItem(s, 'dau'), 2, '★1 không bị lấy nhầm');
  s.inv[starKey('dau', 2)] = 4;
  assert.equal(G.stashAll(s).ok, true);
  assert.equal(s.inv.dau, 2);
  assert.equal(G.withdraw(s, starKey('dau', 2), 3).ok, true);
  assert.deepEqual(s.basket, { [starKey('dau', 2)]: 3 });
  assert.equal(G.basketCount(s), 3);
  // nạp lại thì đồ có sao còn nguyên, không bị lọc mất
  const back = G.loadGame(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.shipbin.items, { [starKey('dau', 3)]: 1 });
  // chưa có sao cho sản phẩm vật nuôi (sữa ngon, lông xoăn là món riêng)
  assert.equal(G.shipAdd(s, 'trung@2', 1).ok, false);
});

test('checkSaveJump: bản v3 cũ trên server và bản v4 mới của cùng vườn là hợp lý; đổi nhãn sao cho đồ cũ thì bị chặn', () => {
  const prev = fixture('v3-farm');
  Object.assign(prev, { mode: 'online', account: 'Lan' });
  const next = migrate(prev);
  next.simMs += 10_000; next.savedAt = prev.savedAt + 10_000;
  assert.equal(G.wealthOf(next), G.wealthOf(prev), 'đồ cũ thành ★1: của cải không đổi');
  assert.equal(G.checkSaveJump(prev, next, 10_000).ok, true);
  // bán hàng ★3 một lúc: của cải không đổi, hợp lý
  const rich = structuredClone(next); rich.basket = { [starKey('duahau', 3)]: 200 };
  const sold = structuredClone(rich); sold.basket = {}; sold.coins += 200 * sellPrice(starKey('duahau', 3)); sold.simMs += 1000;
  assert.equal(G.checkSaveJump(rich, sold, 1000).ok, true);
  // sửa bản lưu: đổi 200 dưa hấu ★1 thành ★3 trong chốc lát
  const plain = structuredClone(next); plain.basket = { duahau: 200 };
  const fake = structuredClone(plain); fake.basket = { [starKey('duahau', 3)]: 200 }; fake.simMs += 1000;
  assert.equal(G.checkSaveJump(plain, fake, 1000).reason, 'coins');
});
