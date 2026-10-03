// Seam 1: trái khổng lồ (issue 53, Phase 3). Tung một lần lúc cây vừa chín theo cấp thành thạo (issue 51) và sao (issue 52):
// cấp 1 không ra, cấp 2 10%, cấp 3 20%, cấp 3 + ★3 cao nhất. Trái khổng lồ là món riêng theo loại cây, bán ×3 (nhân sao),
// chiếm 5 chỗ giỏ, không trộm được, dùng cho đơn hàng đặc biệt.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { CROPS, GIANT, STARS, MASTERY, EVENT_LEVEL, giantKey, giantOf, starKey, sellPrice, itemName, isProduce } from '../public/data.js';
import { setClock } from '../public/clock.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const rnd = Math.random;
const withRand = (f, fn) => { Math.random = f; try { return fn(); } finally { Math.random = rnd; } };
const quiet = fn => withRand(() => 0.99, fn);
// hạt giống ngẫu nhiên cố định (mulberry32): cùng hạt giống thì cùng chuỗi số
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const P = idx => ({ kind: 'plot', idx });

// Vườn mới, trời nhiều mây, không đơn hàng; dư EXP để gieo mọi cây
function farm() {
  const s = G.createGame({ name: 'Khổng Lồ' });
  Object.assign(s, { tutorial: 99, weather: 'cloud', coins: 1e4, exp: 1e6, orders: [], nextOrderAt: 1e15, basket: {} });
  return s;
}
const plots = s => s.plots.filter(p => p.unlocked).map(p => p.idx);
// Dâu tây hợp mùa xuân (ngày 1): vụ chăm kỹ ra được ★3 (cây trái mùa chỉ tới ★2)
// Bản lưu ghi sẵn: ô đã cuốc, đủ nước, cây `id` sắp chín. star: 1 (không bón phân), 2 (bón phân, chưa chăm tay), 3 (chăm tay)
function nearRipe(s, idx, id = 'dau', star = 3, progress = 0.99999) {
  Object.assign(s.plots[idx], { soil: 'tilled', water: 100, weeds: false });
  s.plots[idx].crop = { id, progress, planted: s.time, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: star >= 2, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: star >= 3 } };
  return s.plots[idx].crop;
}
// Ô đã chín sẵn (bản lưu ghi sẵn), giant = có trái khổng lồ
function ripe(s, idx, id = 'dau', star = 3, giant = true) {
  const c = nearRipe(s, idx, id, star, 1);
  c.ripeAt = s.time;
  if (giant) c.giant = true;
  return c;
}
const harvest = (s, idx) => { const r = G.perform(s, P(idx), 'harvest'); assert.equal(r.ok, true, r.msg); return r; };

test('tỉ lệ ra trái khổng lồ (thống kê, hạt giống cố định): cấp 1 không bao giờ, cấp 2 ≈ 10%, cấp 3 ≈ 20%, cấp 3 + ★3 cao hơn', () => {
  const rate = (lv, star, n = 2000) => withRand(seeded(53), () => {
    const s = farm(), [i] = plots(s);
    let k = 0;
    for (let t = 0; t < n; t++) {
      s.mastery.dau = { lv, n: 0 }; s.threats = [];   // quạ vụ trước không ăn mất vụ này
      nearRipe(s, i, 'dau', star);
      G.tick(s, 1000);
      assert.ok(s.plots[i].crop.progress >= 1, 'cây đã chín');
      if (s.plots[i].crop.giant) k++;
    }
    return k / n;
  });
  assert.equal(rate(1, 3), 0);
  const r2 = rate(2, 2), r3 = rate(3, 2), r33 = rate(3, 3);
  assert.ok(r2 > 0.07 && r2 < 0.13, `cấp 2: ${r2}`);
  assert.ok(r3 > 0.16 && r3 < 0.24, `cấp 3: ${r3}`);
  assert.ok(r33 > r3 + 0.04, `cấp 3 ★3: ${r33} > cấp 3 thường ${r3}`);
  assert.equal(MASTERY.giant[2] * GIANT.star3Mul, Math.max(...[1, 2, 3].flatMap(lv => [MASTERY.giant[lv - 1], MASTERY.giant[lv - 1] * GIANT.star3Mul])), 'cao nhất khi cấp 3 + ★3');
});

test('thu hoạch ô có trái khổng lồ: được sản lượng thường + 1 trái khổng lồ cùng sao (món riêng của cây đó), giỏ tính 5 chỗ', () => {
  const s = farm(), [i, j] = plots(s);
  s.mastery.dau = { lv: 1, n: 0 };
  ripe(s, i, 'dau', 3);
  const r = quiet(() => harvest(s, i));
  const g = giantKey('dau', 3);
  assert.equal(g, 'giant_dau@3');
  assert.equal(giantOf(g), 'dau');
  assert.notEqual(g, starKey('dau', 3), 'không phải dâu thường nhân lên');
  assert.deepEqual(s.basket, { [starKey('dau', 3)]: 9, [g]: 1 });   // 6 × 1,5 (bón phân) = 9
  assert.equal(G.basketCount(s), 9 + GIANT.slots);
  assert.equal(GIANT.slots, 5);
  assert.match(r.msg, /Dâu tây khổng lồ ★3/);
  assert.equal(s.plots[i].crop, null);
  // cây khác có món khổng lồ riêng
  ripe(s, j, 'cai', 1);
  quiet(() => harvest(s, j));
  assert.equal(s.basket[giantKey('cai')], 1);
  assert.equal(itemName(giantKey('cai')), 'Cải xanh khổng lồ');
  assert.ok(isProduce(giantKey('cai')));
});

test('trái khổng lồ bán ×3 giá một trái thường, nhân thêm hệ số sao; chợ và thùng giao hàng trả đúng giá', () => {
  assert.equal(GIANT.priceMul, 3);
  for (const [id, d] of Object.entries(CROPS)) {
    assert.equal(sellPrice(giantKey(id)), d.price * 3, id);
    assert.equal(sellPrice(giantKey(id, 2)), Math.round(d.price * 3 * 1.5), id);
    assert.equal(sellPrice(giantKey(id, 3)), d.price * 3 * STARS.mul[2], id);
  }
  const s = farm();
  s.time = Math.floor(s.time / 86_400_000) * 86_400_000;
  s.basket = { [giantKey('bingo', 3)]: 1, [giantKey('bingo')]: 1 };
  const coins = s.coins;
  assert.equal(G.sell(s, giantKey('bingo', 3), 1).coins, 360);
  assert.equal(G.sell(s, giantKey('bingo'), 1).coins, 180);
  assert.equal(s.coins, coins + 540);
});

test('giỏ không đủ chỗ cho cả sản lượng lẫn 5 chỗ trái khổng lồ thì không hái được (như món thường: "Giỏ đầy")', () => {
  const s = farm(), [i] = plots(s), cap = G.basketCap(s);
  s.mastery.dau = { lv: 1, n: 0 };
  ripe(s, i, 'dau', 3);
  s.basket = { trung: cap - 9 - GIANT.slots + 1 };   // thiếu đúng 1 chỗ
  const a = G.actionsFor(s, P(i)).find(x => x.id === 'harvest');
  assert.match(a.disabled ?? '', /Giỏ đầy/);
  assert.equal(G.perform(s, P(i), 'harvest').ok, false);
  assert.ok(s.plots[i].crop.giant, 'trái khổng lồ vẫn còn trên ô');
  s.basket = { trung: cap - 9 - GIANT.slots };      // vừa đủ
  quiet(() => harvest(s, i));
  assert.equal(G.basketCount(s), cap);
  // kho → giỏ, thùng → giỏ cũng tính 5 chỗ
  G.stashAll(s);
  s.basket = { trung: cap - 7 };
  assert.equal(G.withdraw(s, giantKey('dau', 3), 'all').ok, true);
  assert.equal(G.basketCount(s), cap - 2);
  assert.equal(G.withdraw(s, giantKey('dau', 3), 1).ok, false, 'chỉ còn 2 chỗ');
});

test('thu được trái khổng lồ: thông báo 🟡, nhiều EXP, ghi nhật ký', () => {
  const s = farm(), [i] = plots(s);
  s.mastery.dau = { lv: 3, n: 999 };
  ripe(s, i, 'dau', 3);
  G.tick(s, 0);
  const exp = s.exp;
  quiet(() => harvest(s, i));
  const ev = G.tick(s, 0).filter(e => e.type === 'giant');
  assert.equal(ev.length, 1);
  assert.equal(ev[0].crop, 'dau');
  assert.equal(EVENT_LEVEL.giant.level, 'important');
  assert.match(EVENT_LEVEL.giant.text(1, ev[0]), /dâu tây khổng lồ/i);
  assert.equal(s.exp - exp, CROPS.dau.exp * (1 + GIANT.expMul));
  assert.ok(s.log.some(l => /khổng lồ/.test(l.text)), 'có dòng nhật ký');
});

test('cây không có trái khổng lồ thì thu hoạch như cũ', () => {
  const s = farm(), [i] = plots(s);
  s.mastery.dau = { lv: 1, n: 0 };
  ripe(s, i, 'dau', 3, false);
  quiet(() => harvest(s, i));
  assert.deepEqual(s.basket, { [starKey('dau', 3)]: 9 });
});

// ---------- Trộm ----------
const T0 = Date.UTC(2026, 9, 2, 3, 0);   // 10h sáng giờ Việt Nam
// Vườn chủ cấp cao: ô a dâu ★3 có trái khổng lồ, ô b dâu ★3 thường
function robbed() {
  const s = farm(), [a, b] = plots(s);
  s.mastery.dau = { lv: 1, n: 0 };
  ripe(s, a, 'dau', 3); ripe(s, b, 'dau', 3, false);
  return { s, a, b };
}
let seq = 0;
const op = (act, extra) => ({ id: `g-${++seq}`, kind: 'steal', act, ...extra });

test('khách trộm: ô có trái khổng lồ vẫn trộm được phần cây chín thường có sao, còn trái khổng lồ thì không lấy được', () => {
  setClock(() => T0);
  try {
    const { s, a } = robbed();
    const r = G.guestOpApply(s, { name: 'Bình', level: 9, room: 99 }, op('crop', { idx: a }));
    assert.equal(r.ok, true, r.msg);
    assert.deepEqual(r.reward.items, { [starKey('dau', 3)]: 2 }, '25% của 9 dâu ★3, không có trái khổng lồ');
    assert.equal(s.plots[a].crop.giant, true, 'trái khổng lồ vẫn còn trên ô');
    // trộm thẳng trái khổng lồ: luôn bị từ chối
    const g = G.guestOpApply(s, { name: 'Chị Tư', level: 9, room: 99 }, op('giant', { idx: a }));
    assert.equal(g.ok, false);
    assert.equal(g.reason, 'cant_steal');
    assert.match(g.msg, /khổng lồ/);
    // chủ hái phần còn lại vẫn được trái khổng lồ
    quiet(() => harvest(s, a));
    assert.deepEqual(s.basket, { [starKey('dau', 3)]: 7, [giantKey('dau', 3)]: 1 });
    // giá trị đồ chín để tính trần trộm mỗi ngày không gồm trái khổng lồ (không trộm được)
    const { s: h, b } = robbed();
    assert.equal(G.ripeValue(h), 2 * 9 * sellPrice(starKey('dau', 3)) + (h.eggs?.length ?? 0) * sellPrice('trung'));
    void b;
  } finally { setClock(); }
});

test('trong vườn khách: ô có trái khổng lồ hiện nút Trộm cho phần thường và nút trộm trái khổng lồ mờ kèm lý do', () => {
  setClock(() => T0);
  try {
    const { s, a } = robbed();
    const me = G.createGame({ name: 'Bình' }); me.tutorial = 99; me.exp = 1e6;
    const v = G.startVisit(me, JSON.parse(JSON.stringify(s)), 'Lan');
    const acts = G.actionsFor(v, P(a));
    assert.deepEqual(acts.map(x => x.id), ['steal', 'steal_giant']);
    assert.equal(acts[0].disabled ?? null, null);
    assert.match(acts[1].label, /Trộm dâu tây khổng lồ/);
    assert.match(acts[1].disabled, /khổng lồ/);
    const r = G.perform(v, P(a), 'steal_giant');
    assert.equal(r.ok, false);
    assert.equal(v.plots[a].crop.giant, true);
  } finally { setClock(); }
});

test('trộm NPC (thằng Tèo) và quạ bỏ qua ô còn trái khổng lồ chưa thu', () => {
  const night = s => { s.time = Math.floor(s.time / 86_400_000) * 86_400_000 + 86_400_000 * 0.05; };
  for (let seed = 1; seed <= 25; seed++) withRand(seeded(seed), () => {
    const s = farm(), ids = plots(s);
    s.mastery.cai = { lv: 1, n: 0 };
    ids.slice(0, 3).forEach(i => ripe(s, i, 'cai', 1, true));
    ids.slice(3, 6).forEach(i => ripe(s, i, 'cai', 1, false));
    night(s);
    s.raid = { day: s.day, kind: 'thief', at: s.time, done: false };
    G.tick(s, 1000);
    const t = s.threats.find(x => x.kind === 'thief');
    if (t) assert.ok(!ids.slice(0, 3).includes(t.plot), `seed ${seed}: Tèo nhắm ô ${t.plot} có trái khổng lồ`);
    // để mọi kẻ tới ăn xong
    for (let k = 0; k < 120; k++) G.tick(s, 1000);
    for (const i of ids.slice(0, 3)) assert.equal(s.plots[i].crop?.giant, true, `seed ${seed}: ô ${i} mất trái khổng lồ`);
  });
  // chỉ còn ô có trái khổng lồ: không đủ ô chín cho thằng Tèo
  const s = farm(), ids = plots(s);
  ids.slice(0, 4).forEach(i => ripe(s, i, 'cai', 1, true));
  assert.equal(G.raidPool(s).includes('thief'), false);
});

// ---------- Đơn hàng đặc biệt ----------
test('đơn hàng đặc biệt nhận trái khổng lồ: nông sản thường không thay được, sao thấp không thay được sao cao', () => {
  const s = farm();
  s.orders = [{ id: 1, who: 'Bà Tư', items: { [giantKey('dau', 3)]: 1 }, coins: 300, exp: 50, giant: true }, { id: 2, who: 'Chú Ba', items: { [giantKey('cai')]: 1 }, coins: 40, exp: 10, giant: true }];
  s.basket = { [starKey('dau', 3)]: 20, [giantKey('dau')]: 1 };
  assert.equal(G.orderHave(s, giantKey('dau', 3)), 0);
  const no = G.fulfillOrder(s, 1);
  assert.equal(no.ok, false);
  assert.match(no.msg, /dâu tây khổng lồ ★3/i);
  s.basket[giantKey('dau', 3)] = 1;
  const coins = s.coins;
  assert.equal(G.fulfillOrder(s, 1).ok, true);
  assert.equal(s.coins, coins + 300);
  assert.deepEqual(s.basket, { [starKey('dau', 3)]: 20, [giantKey('dau')]: 1 });
  // món ★1 nhận trái khổng lồ sao cao hơn
  s.basket = { [giantKey('cai', 2)]: 1 };
  assert.equal(G.fulfillOrder(s, 2).ok, true);
  assert.deepEqual(s.basket, {});
});

test('đơn hàng mới: khi đã có cây thành thạo cấp 2 thì có lúc là đơn đặc biệt đòi 1 trái khổng lồ của cây đó; chưa có thì không bao giờ', () => {
  const orders = s => { const out = []; for (let i = 0; i < 400; i++) { s.orders = []; s.nextOrderAt = 0; G.tick(s, 1000); out.push(s.orders[0]); } return out.filter(Boolean); };
  const s = farm();
  for (const id of Object.keys(CROPS)) s.mastery[id] = { lv: 1, n: 0 };
  assert.equal(orders(s).filter(o => Object.keys(o.items).some(giantOf)).length, 0);
  s.mastery.bingo = { lv: 2, n: 8 };
  const sp = orders(s).filter(o => o.giant);
  assert.ok(sp.length > 400 * GIANT.orderP * 0.5 && sp.length < 400 * GIANT.orderP * 1.6, `${sp.length} đơn đặc biệt`);
  for (const o of sp) {
    assert.deepEqual(Object.keys(o.items).map(giantOf), ['bingo']);
    assert.deepEqual(Object.values(o.items), [1]);
    assert.ok(o.coins >= sellPrice(Object.keys(o.items)[0]), 'thưởng không thấp hơn giá bán');
  }
});

test('trái khổng lồ không bỏ hộp quà tặng được (hộp quà chia theo số món, không theo chỗ giỏ)', () => {
  const s = farm();
  s.basket = { [giantKey('dau')]: 1 };
  assert.equal(G.giftable(giantKey('dau')), false);
  assert.equal(G.giftCheck(s, [], giantKey('dau'), 1).reason, 'bad_item');
});

// ---------- Chống gian lận (server) ----------
// Vườn online cả ruộng bắp cải chăm kỹ, thành thạo cấp 3; progress: 1 = đã chín (giant theo cờ), < 1 = sắp chín
function field(progress, giant) {
  const s = farm();
  s.mode = 'online'; s.basket = {}; s.inv = {}; s.mastery.bapcai = { lv: 3, n: 999 };
  for (const i of plots(s)) { const c = nearRipe(s, i, 'bapcai', 3, progress); if (giant) c.giant = true; }
  return s;
}
// Hái cả ruộng trong 2 giây vườn (cây sắp chín thì cho chín và ra trái khổng lồ như vừa tung trúng)
function harvestAll(prev) {
  const next = structuredClone(prev);
  next.simMs += 2000;
  for (const i of plots(next)) {
    const c = next.plots[i].crop;
    if (c.progress < 1) Object.assign(c, { progress: 1, ripeAt: next.time, giant: true });
    quiet(() => harvest(next, i)); G.stashAll(next);
  }
  return next;
}
test('checkSaveJump: hái cả ruộng có trái khổng lồ (cả cây vừa chín ra trái khổng lồ giữa hai lần lưu) là hợp lý; trái khổng lồ tự dưng xuất hiện thì chặn', () => {
  for (const prev of [field(1, true), field(0.999, false)]) {
    const next = harvestAll(prev);
    assert.equal(next.inv[giantKey('bapcai', 3)], 9);
    assert.ok(G.wealthOf(next) - G.wealthOf(prev) > G.SAVE_JUMP.wealth + 9 * 570 * 0.3, 'giá trị trái khổng lồ vượt mức cho sẵn');
    assert.ok(next.exp - prev.exp > G.SAVE_JUMP.exp, 'EXP trái khổng lồ vượt mức cho sẵn');
    assert.deepEqual(G.checkSaveJump(prev, next, 2000), { ok: true });
  }
  // cây đã chín sẵn mà không có trái khổng lồ thì không thể ra trái khổng lồ nữa
  const prev = field(1, false), next = harvestAll(prev);
  next.inv[giantKey('bapcai', 3)] = 20;
  assert.equal(G.checkSaveJump(prev, next, 2000).ok, false);
  // thành thạo cấp 1 thì cây sắp chín cũng không ra trái khổng lồ
  const low = field(0.999, false);
  low.mastery.bapcai = { lv: 1, n: 0 };
  const cheat = harvestAll(low);
  cheat.mastery.bapcai = { lv: 1, n: 0 };
  assert.equal(G.checkSaveJump(low, cheat, 2000).ok, false);
});

test('bản lưu v4 cũ (chưa biết tới trái khổng lồ) vẫn nạp được: vụ đang trồng không có trái khổng lồ, thống kê có chỗ đếm', async () => {
  const { migrate } = await import('../public/migrate.js');
  const s = farm(), [i] = plots(s);
  const c = ripe(s, i, 'dau', 3, false);
  delete c.giant; delete s.stats.giants;
  const l = migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(l.v, 4);
  assert.equal(l.plots[i].crop.giant, false);
  assert.equal(l.stats.giants, 0);
  // vụ mới gieo cũng có cờ, mặc định không
  const n = farm(), [j] = plots(n);
  n.inv.seed_cai = 1; n.selectedSeed = 'cai';
  quiet(() => { G.perform(n, P(j), 'till'); G.perform(n, P(j), 'plant'); });
  assert.equal(n.plots[j].crop.giant, false);
});
