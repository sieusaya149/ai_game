// Seam 1: cân bằng thời gian thật và chống lạm phát xu (docs/proposals/balance-time-economy.md, "Đã chốt 03/10").
// Kiểm hành vi qua API công khai: cây ba nhịp chơi, lãi mỗi giờ mỗi ô xêm xêm nhau, đói làm ngừng đẻ nhưng không bệnh ngay,
// mùa chốt lúc gieo, chạy bù không làm chết cây, mua con vật không bao giờ lời hơn bán, đơn hàng 15 phút, giới hạn chống gian lận.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { penIdOf } from './helpers/troughs.mjs';
import {
  CROPS, ANIMALS, HUSBANDRY, FARMING, ORDERS, TOOLS, WELL, FIELD_PRICES, PEN_PRICES, PEN_TABLE, GLASS, AUTO, WATER_BUILD,
  PRODUCTS, ITEMS, WEIGHT, SEASON, expNeed, animalPrice, weightAt, stageStart, sellPrice,
} from '../public/data.js';

const MIN = 60_000, HOUR = 60 * MIN;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const withRandom = (v, fn) => { const r = Math.random; Math.random = typeof v === 'function' ? v : () => v; try { return fn(); } finally { Math.random = r; } };
const quiet = fn => withRandom(0.99, fn);
const unlucky = fn => withRandom(1e-9, fn);   // mọi lần quay xác suất đều trúng

// ---------- cây trồng ----------
const profit = c => c.yield * c.price - c.seed;
const perHour = c => profit(c) / (c.grow / HOUR);
const rate = lv => 36 + 2 * (lv - 1);   // lãi mục tiêu mỗi giờ mỗi ô theo cấp: phẳng, nhích dần theo cấp

test('lãi mỗi giờ mỗi ô của mọi cây nằm trong một dải quanh mức mục tiêu theo cấp, nhích dần theo cấp; không cây nào áp đảo', () => {
  const rates = Object.entries(CROPS).map(([id, c]) => ({ id, lv: c.lv, r: perHour(c) }));
  for (const { id, lv, r } of rates) assert.ok(r >= rate(lv) * 0.75 && r <= rate(lv) * 1.6, `${id} (cấp ${lv}): ${r.toFixed(1)} xu/giờ, mục tiêu ${rate(lv)}`);
  const max = Math.max(...rates.map(x => x.r)), min = Math.min(...rates.map(x => x.r));
  assert.ok(max / min < 1.8, `chênh lệch lớn nhất ${(max / min).toFixed(2)} lần`);
  // trung bình theo cấp (cấp 1–4, 5–8, 9–12) không tụt
  const avg = (a, b) => { const r = rates.filter(x => x.lv >= a && x.lv <= b).map(x => x.r); return r.reduce((p, q) => p + q, 0) / r.length; };
  assert.ok(avg(1, 4) <= avg(5, 8) && avg(5, 8) <= avg(9, 12), 'cấp cao hơn thì trả nhỉnh hơn');
});

test('lãi mỗi vụ tăng theo thời gian lớn (cây dài trả nhiều mỗi vụ vì gieo một lần rồi đi); hạt là khoản chi thật nhưng không áp đảo', () => {
  const byTime = Object.values(CROPS).sort((a, b) => a.grow - b.grow || a.lv - b.lv);
  for (let i = 1; i < byTime.length; i++) assert.ok(profit(byTime[i]) >= profit(byTime[i - 1]), `${byTime[i].name} lãi ít hơn cây ngắn hơn nó`);
  assert.ok(profit(CROPS.lua) >= 300 && profit(CROPS.dau) >= 250, 'cây gieo rồi đi trả vài trăm xu mỗi vụ');
  for (const [id, c] of Object.entries(CROPS)) {
    const share = c.seed / (c.yield * c.price);
    assert.ok(share >= 0.1 && share <= 0.5, `${id}: hạt ${Math.round(share * 100)}% doanh thu`);
  }
});

test('EXP mỗi vụ ≈ 15% lãi ròng, có sàn để các cấp đầu không chậm', () => {
  for (const [id, c] of Object.entries(CROPS)) {
    const floor = c.lv <= 2 ? 2 : c.lv <= 5 ? 3 : 4;
    assert.ok(c.exp >= floor, `${id}: EXP ${c.exp} dưới sàn ${floor}`);
    if (c.exp > floor) assert.ok(Math.abs(c.exp - 0.15 * profit(c)) <= 1, `${id}: EXP ${c.exp} so với 15% lãi ${(0.15 * profit(c)).toFixed(1)}`);
    else assert.ok(0.15 * profit(c) <= floor + 1, `${id}: EXP đang nằm ở sàn nhưng 15% lãi là ${(0.15 * profit(c)).toFixed(1)}`);
  }
  // cấp đầu: vài vụ trên cả khối 3×3 là lên cấp 2 (cấp 1 → 2 cần expNeed(1) EXP)
  assert.ok(Math.ceil(expNeed(1) / CROPS.cai.exp) <= 2 * 9, 'lên cấp 2 không quá hai lượt cả khối cải');
});

test('đất tụt 1% nước mỗi phút: tưới một lần cho cây 2 phút khỏi tưới lại, chín rồi thu hoạch như thường', () => {
  const s = G.createGame({ name: 'Nước' }); s.tutorial = 99; s.orders = []; s.nextOrderAt = 1e12; s.weather = 'cloud'; s.exp = 1e5;
  const at = { kind: 'plot', idx: 0 };
  s.inv.seed_raumuong = 1; s.selectedSeed = 'raumuong';
  quiet(() => { G.perform(s, at, 'till'); G.perform(s, at, 'plant'); assert.equal(G.perform(s, at, 'water').ok, true); });
  quiet(() => G.tick(s, 10 * MIN));
  const w = s.plots[0].water;
  assert.ok(w > 85 && w < 95, `sau 10 phút đất còn ${w}% nước`);
  assert.ok(s.plots[0].crop.progress >= 1, 'rau muống 2 phút chín chỉ với một lần tưới');
  assert.equal(quiet(() => G.perform(s, at, 'harvest')).ok, true);
  assert.equal(G.haveItem(s, 'raumuong'), CROPS.raumuong.yield);
});

test('thuốc tăng trưởng: mỗi lần cộng tối đa 90 phút (cây ngắn vẫn +50%), không rút ngắn cả vụ dài ngày chỉ bằng một lọ', () => {
  const grow = id => {
    const s = G.createGame({ name: 'Thuốc' }); s.tutorial = 99; s.orders = []; s.nextOrderAt = 1e12; s.exp = 1e5;
    s.inv[`seed_${id}`] = 1; s.inv.growth = 2; s.selectedSeed = id;
    const at = { kind: 'plot', idx: 0 };
    quiet(() => { G.perform(s, at, 'till'); G.perform(s, at, 'plant'); });
    const before = s.plots[0].crop.progress;
    assert.equal(G.perform(s, at, 'growth').ok, true);
    return (s.plots[0].crop.progress - before) * CROPS[id].grow;
  };
  assert.equal(grow('duahau'), CROPS.duahau.grow * FARMING.growthBoost);   // 60 phút: +30 phút
  assert.equal(grow('lua'), FARMING.growthBoostMaxMs);                      // 8 giờ: chỉ +90 phút
  assert.ok(ITEMS.growth.price >= 100, 'thuốc đắt tương xứng với thời gian nó tiết kiệm');
});

test('mùa chốt lúc gieo: gieo đúng mùa thì cả vụ đúng mùa, hạn dài qua mấy mùa cũng không đổi', () => {
  const s = G.createGame({ name: 'Mùa' }); s.tutorial = 99; s.orders = []; s.nextOrderAt = 1e12; s.exp = 1e5; s.coins = 1e6;
  s.day = 1; s.time = 0;   // đầu Xuân: cải hợp mùa, lúa trái mùa
  s.inv.seed_cai = 1; s.inv.seed_lua = 1;
  const cai = { kind: 'plot', idx: 0 }, lua = { kind: 'plot', idx: 1 };
  quiet(() => { for (const [t, id] of [[cai, 'cai'], [lua, 'lua']]) { s.selectedSeed = id; G.perform(s, t, 'till'); G.perform(s, t, 'plant'); } });
  assert.equal(s.plots[0].crop.season, 'in');
  assert.equal(s.plots[1].crop.season, 'off');
  // lúa 8 giờ qua cả 24 mùa game: tốc độ vẫn theo mùa lúc gieo (trái mùa ×SEASON.slow), không đổi tới ngay cả khi sang Thu
  quiet(() => { for (let t = 0; t < 2 * HOUR; t += MIN) { s.weather = 'rain'; G.tick(s, MIN); } });
  assert.ok(Math.abs(s.plots[1].crop.progress - 2 * HOUR * SEASON.slow / CROPS.lua.grow) < 0.01, `tiến độ lúa ${s.plots[1].crop.progress}`);
  assert.equal(G.plotSeasonMul(s, s.plots[1]), SEASON.slow);
  assert.equal(G.cropOffSeason(s.plots[1].crop), true);
});

test('chạy bù offline không bao giờ làm cây chết: sâu, bệnh dừng ở nửa chặng, về tới nơi còn nửa thời gian để cứu', () => {
  const s = G.createGame({ name: 'Bù' }); s.tutorial = 99; s.orders = []; s.nextOrderAt = 1e12;
  const c = { id: 'lua', progress: 0.3, planted: 0, bugs: false, bugSince: 0, sick: true, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } };
  Object.assign(s.plots[0], { soil: 'tilled', water: 100, crop: c });
  s.savedAt = Date.now() - 8 * HOUR;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = quiet(() => G.loadGame());
  const lc = l.plots[0].crop;
  assert.equal(lc.dead, false, 'cây bệnh không chết lúc chủ vắng');
  assert.equal(lc.sick, true);
  // về tới nơi: còn khoảng sickToDead / 2 để chữa; đang chơi thì quá thời gian đó mới chết
  quiet(() => G.tick(l, FARMING.sickToDead / 2 - 5 * MIN));
  assert.equal(l.plots[0].crop.dead, false);
  quiet(() => G.tick(l, 10 * MIN));
  assert.equal(l.plots[0].crop.dead, true, 'đang chơi mà bỏ mặc thì cây vẫn chết');
});

test('cây chín lâu không héo lúc offline; đang chơi thì héo sau cửa sổ max(thời gian lớn, 10 phút)', () => {
  const play = id => {
    const s = G.createGame({ name: 'Héo' }); s.tutorial = 99; s.orders = []; s.nextOrderAt = 1e12; s.weather = 'cloud';
    const c = { id, progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } };
    Object.assign(s.plots[0], { soil: 'tilled', water: 100, crop: c });
    return s;
  };
  const s = play('lua');
  s.savedAt = Date.now() - 8 * HOUR; store[G.SAVE_KEY] = JSON.stringify(s);
  assert.equal(quiet(() => G.loadGame()).plots[0].crop.rotten, false, 'offline 8 giờ: cây chín đứng yên');
  const a = play('cai'), b = play('lua');
  quiet(() => { G.tick(a, 9 * MIN); G.tick(b, 9 * MIN); });
  assert.equal(a.plots[0].crop.rotten, false);
  quiet(() => { G.tick(a, 2 * MIN); G.tick(b, 2 * MIN); });
  assert.equal(a.plots[0].crop.rotten, true, 'cải héo sau 10 phút');
  assert.equal(b.plots[0].crop.rotten, false, 'lúa còn cả 8 giờ để quay lại hái');
});

// ---------- vật nuôi ----------
test('nhịp sản phẩm: gà 10 phút, vịt 15 phút, bò 1 giờ, cừu 3 giờ; lớn tới trưởng thành sau 1 giờ (gà), 4 giờ (heo), 5 giờ (bò, cừu)', () => {
  assert.deepEqual([ANIMALS.ga.every, ANIMALS.vit.every, ANIMALS.bo.every, ANIMALS.cuu.every], [10 * MIN, 15 * MIN, HOUR, 3 * HOUR]);
  assert.equal(HUSBANDRY.nestHatchMs, 30 * MIN, 'trứng nở 30 phút');
  assert.equal(HUSBANDRY.pigGestation, 2 * HOUR, 'heo mang thai 2 giờ');
  assert.equal(stageStart('ga', 'truong'), HOUR);
  assert.ok(stageStart('vit', 'truong') > stageStart('ga', 'truong') && stageStart('vit', 'truong') <= 1.5 * HOUR, 'vịt lớn lâu hơn gà chút');
  assert.equal(stageStart('heo', 'truong'), 4 * HOUR);
  for (const t of ['bo', 'cuu']) assert.ok(stageStart(t, 'truong') >= 4 * HOUR && stageStart(t, 'truong') <= 6 * HOUR, `${t} lớn trong 4–6 giờ`);
  for (const t of ['ga', 'vit', 'heo', 'bo', 'cuu']) assert.ok(G.lifeEnd(t) >= 4 * 24 * HOUR, `${t} sống nhiều ngày thật`);
  assert.ok(HUSBANDRY.hungerMs >= 2 * HOUR && HUSBANDRY.hungerMs <= 3 * HOUR, 'một lần no kéo dài 2–3 giờ');
});

// Vườn sạch, một chuồng, chủ cấp cao; con vật ở trạng thái do test đặt
const game = () => {
  const s = G.createGame({ name: 'Chủ trại' });
  s.coins = 1e6; s.exp = 1e5; s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.eggs = []; s.clutch = [];
  s.time = 12 * HOUR; s.day = 1; s.weather = 'cloud';
  s.farm.owned = { c: 10, r: 8, w: 50, h: 38 }; s.farm.rev++;
  return s;
};
const put = (s, type, extra) => {
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type, name: ANIMALS[type].name, stage: 'truong', age: stageStart(type, 'truong'),
    nextProduct: s.time, ready: false, hunger: 100, happy: 80, dirty: 0, sick: 0, sickMs: 0, dose: 0, vaccUntil: 0, pen: null, tile: null, sex: 'f', ...extra };
  s.animals.push(a);
  return a;
};
const fill = (s, n) => { for (const k of Object.keys(s.troughs)) s.troughs[k] = n; };
// Chạy từng phút, giữ con vật sạch (chuồng không bẩn) để chỉ còn đói là nguyên nhân
const run = (s, ms, each, rnd = 0.99) => {
  for (let t = 0; t < ms; t += MIN) {
    for (const k of Object.keys(s.manure)) s.manure[k] = 0;
    for (const a of s.animals) { a.dirty = 0; a.tile = null; a.stray = false; }   // ở yên trong chuồng: không lạc, không bị chồn bắt
    s.preds = []; s.threats = [];
    each?.(s);
    withRandom(rnd, () => G.tick(s, Math.min(MIN, ms - t)));
  }
};

test('con vật no đẻ đều mỗi chu kỳ; đói (không có thức ăn trong máng) thì ngừng đẻ, có ăn lại thì đẻ tiếp', () => {
  const eggs = (s, ms) => { s.eggs = []; run(s, ms); return s.eggs.length; };
  const s = game(); const hen = put(s, 'ga', {});
  fill(s, 40);
  assert.ok(eggs(s, 40 * MIN) >= 3, 'gà no đẻ');
  // đói hẳn, máng trống: không có quả nào dù đã qua nhiều chu kỳ
  hen.hunger = 0; fill(s, 0);
  assert.equal(eggs(s, 40 * MIN), 0, 'gà đói không đẻ');
  assert.ok(hen.sick === 0, 'đói mới 40 phút chưa bệnh');
  fill(s, 40);
  assert.ok(eggs(s, 40 * MIN) >= 1, 'có cám trở lại thì đẻ tiếp');
});

test('đói không làm bệnh ngay: đói dưới 90 phút tuyệt đối không bệnh dù xúi quẩy; bỏ một bữa cũng không sao', () => {
  assert.ok(HUSBANDRY.hungrySafeMs >= HOUR && HUSBANDRY.hungrySafeMs <= 2 * HOUR, 'không nguy cơ trong 1–2 giờ đói đầu');
  const s = game(); const hen = put(s, 'ga', { hunger: 0, nextProduct: 1e15 });
  fill(s, 0);
  run(s, HUSBANDRY.hungrySafeMs - 5 * MIN, undefined, 1e-9);
  assert.equal(hen.sick, 0, 'chưa tới hungrySafeMs');
  assert.equal(G.starveRisk(s, hen), 0);
  // một bữa lỡ: máng chỉ có 1 phần, con gà ăn xong thì hết, đói lại từ từ: 2 giờ sau vẫn khỏe
  const t = game(); const hen2 = put(t, 'ga', { nextProduct: 1e15 });
  fill(t, 0); t.troughs[penIdOf(G, t, 'chicken')] = 1;
  run(t, 3 * HOUR, undefined, 1e-9);
  assert.equal(hen2.sick, 0, 'một bữa lỡ không bao giờ gây bệnh');
});

test('đói kéo dài: nguy cơ bệnh bằng 0 trong hungrySafeMs rồi tăng dần tới mức tối đa; đói quá lâu thì bệnh', () => {
  const s = game(); const hen = put(s, 'ga', { hunger: 10, nextProduct: 1e15 });
  const at = ms => { hen.hungrySince = s.time - ms; return G.starveRisk(s, hen); };
  assert.equal(at(0), 0);
  assert.equal(at(HUSBANDRY.hungrySafeMs), 0);
  const mid = at(HUSBANDRY.hungrySafeMs + HUSBANDRY.hungryRampMs / 2), full = at(HUSBANDRY.hungrySafeMs + HUSBANDRY.hungryRampMs);
  assert.ok(mid > 0 && mid < full, 'tăng dần');
  assert.equal(full, HUSBANDRY.hungrySickMax);
  assert.equal(at(HUSBANDRY.hungrySafeMs + 10 * HOUR), HUSBANDRY.hungrySickMax, 'không vượt mức tối đa');
  // thật sự bệnh (xúi quẩy) khi đã đói đủ lâu; còn chưa đủ lâu thì không
  const sick = ms => { const g = game(); const a = put(g, 'ga', { hunger: 10, nextProduct: 1e15, hungrySince: g.time - ms }); fill(g, 0); run(g, 3 * MIN, undefined, 1e-9); return !!a.sick; };
  assert.equal(sick(HUSBANDRY.hungrySafeMs - 10 * MIN), false);
  assert.equal(sick(HUSBANDRY.hungrySafeMs + HUSBANDRY.hungryRampMs), true);
});

test('chuồng bẩn, con dơ lâu vẫn là nguy cơ bệnh riêng (không thuộc về đói)', () => {
  const s = game(); const hen = put(s, 'ga', { nextProduct: 1e15 });
  fill(s, 40); s.manure.chicken = 1e6;
  unlucky(() => { for (let i = 0; i < 5; i++) { hen.dirty = 0; G.tick(s, MIN); } });
  assert.ok(hen.sick > 0, 'chuồng bẩn lâu thì dễ bệnh');
});

test('giá mua luôn cao hơn giá bán lại: mua con non nuôi lớn rồi bán không bao giờ có lời, ở mọi giai đoạn, kể cả độ thân ❤️5', () => {
  const s = G.createGame({ name: 'Chú Ba' });
  for (const type of ['ga', 'vit', 'heo', 'bo', 'cuu']) {
    for (const sex of ['m', 'f']) {
      const price = animalPrice(type, sex);
      for (const stage of ['non', 'nho', 'truong', 'gia']) for (const day of [1, 2, 3, 4, 5, 6, 7]) {
        s.day = day;
        const a = { type, stage, sex, bond: 5, sick: 0, dirty: 0, weight: type === 'heo' ? weightAt('heo', stage) : undefined };
        const sold = G.sellQuote(s, a).price;
        assert.ok(sold < price, `${type} ${sex} ${stage} ngày ${day}: bán ${sold} ≥ mua ${price}`);
      }
    }
  }
  // heo to hơn mức trưởng thành (nái ăn khỏe) vẫn rẻ hơn giá mua
  s.day = 5; assert.ok(G.sellQuote(s, { type: 'heo', stage: 'truong', bond: 5, weight: WEIGHT.heo[1], sick: 0, dirty: 0 }).price < animalPrice('heo', 'm'));
});

test('thức ăn đáng tiền nhưng không miễn phí: chi phí mỗi giờ khoảng 5–20% giá trị sản phẩm mỗi giờ', () => {
  const portionH = HUSBANDRY.hungerMs * (100 - HUSBANDRY.autoEatBelow) / 100 / HOUR;   // một phần ăn đủ cho chừng này giờ (ăn tự động khi đói dưới autoEatBelow)
  for (const [type, a] of Object.entries(ANIMALS)) {
    if (!a.product) continue;
    const cost = ITEMS[a.feed].price / HUSBANDRY.unitsPerBag / portionH;            // xu mỗi giờ
    const value = PRODUCTS[a.product].price * HOUR / a.every;                       // xu mỗi giờ
    assert.ok(cost / value >= 0.05 && cost / value <= 0.2, `${type}: thức ăn ${cost.toFixed(1)} / sản phẩm ${value.toFixed(1)} xu mỗi giờ`);
  }
});

// ---------- sink và đơn hàng ----------
test('giá nâng cấp, xây dựng đã tăng 2–9 lần (chuồng gà đầu tiên nhẹ nhất, khối ruộng và giếng cấp cao nặng nhất) so với trước cân bằng thời gian thật', () => {
  const before = [
    [TOOLS.hoe.price, [200, 800]], [TOOLS.can.price, [200, 800]], [TOOLS.sickle.price, [250, 900]], [TOOLS.basket.price, [150, 600]],
    [WELL.slice(1).map(w => w.price), [600, 2000, 5000]], [FIELD_PRICES, [300, 600, 1000, 1500, 2200, 3000, 4000]],
    [[PEN_PRICES.chicken, PEN_PRICES.pig, PEN_PRICES.pasture, PEN_PRICES.quarantine], [200, 600, 1500, 400]],
    [PEN_TABLE.chicken.up, [300, 800]], [PEN_TABLE.pig.up, [800, 2000]], [PEN_TABLE.pasture.up, [2000, 4500]], [PEN_TABLE.quarantine.up, [500, 1200]],
    [[WATER_BUILD.tank.price, WATER_BUILD.tank2.price, WATER_BUILD.booster.price], [1500, 800, 1200]],
    [Object.values(AUTO.ups).map(u => u.price), [800, 1200, 1500]], [[GLASS.price], [12000]],
  ];
  for (const [now, old] of before) now.forEach((p, i) => assert.ok(p / old[i] >= 2 && p / old[i] <= 9.5, `${p} so với ${old[i]}: ×${(p / old[i]).toFixed(2)}`));
});

test('đơn hàng: thưởng ×1.25 giá bán, một đơn mới mỗi 15 phút', () => {
  assert.equal(ORDERS.rewardMul, 1.25);
  assert.equal(ORDERS.newEvery, 15 * MIN);
  const s = G.createGame({ name: 'Đơn' }); s.tutorial = 99; s.orders = []; s.nextOrderAt = 0; s.exp = 1e5;
  quiet(() => G.tick(s, 1000));
  assert.equal(s.orders.length, 1, 'có đơn đầu');
  const o = s.orders[0];
  const price = Object.entries(o.items).reduce((a, [k, n]) => a + sellPrice(k) * n, 0);
  if (!o.giant) assert.equal(o.coins, Math.round(price * ORDERS.rewardMul));
  quiet(() => G.tick(s, 14 * MIN));
  assert.equal(s.orders.length, 1, 'chưa tới 15 phút');
  quiet(() => G.tick(s, 90_000));
  assert.equal(s.orders.length, 2, 'qua 15 phút có đơn thứ hai');
});

// ---------- giới hạn chống gian lận (server) ----------
test('checkSaveJump: hái cả ruộng lúa 8 giờ ★3 một nhịp là hợp lý; xu tăng vọt không có cây nào, hay gấp 50 lần thu nhập thật thì vẫn chặn', () => {
  const prev = G.createGame({ name: 'Lan' }); prev.mode = 'online'; prev.exp = 0;
  for (const p of prev.plots.filter(p => p.unlocked)) {
    Object.assign(p, { soil: 'tilled', water: 100 });
    p.crop = { id: 'lua', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: true, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: true } };
  }
  const next = structuredClone(prev); next.simMs += 10_000;
  for (const p of next.plots.filter(p => p.unlocked)) { next.mastery.lua = { lv: 1, n: 0 }; assert.equal(G.perform(next, { kind: 'plot', idx: p.idx }, 'harvest').ok, true); G.stashAll(next); }
  assert.ok(G.wealthOf(next) - G.wealthOf(prev) > 10_000, `hái cả ruộng được ${G.wealthOf(next) - G.wealthOf(prev)} xu giá trị`);
  assert.equal(G.checkSaveJump(prev, next, 10_000).ok, true, 'thu hoạch thật thì qua');
  const bare = structuredClone(prev); for (const p of bare.plots) p.crop = null;
  const cheat = structuredClone(bare); cheat.simMs += 10_000; cheat.coins += 50_000;
  assert.equal(G.checkSaveJump(bare, cheat, 10_000).reason, 'coins', 'không có cây nào mà xu tăng vọt thì chặn');
  // chơi đều đặn nửa ngày: 9 ô ≈ 1,2 xu/phút/ô là thật; gấp 50 lần thì chặn
  const day = structuredClone(bare); day.simMs += 12 * HOUR; day.coins += 9 * 12 * 60 * 1.2;
  assert.equal(G.checkSaveJump(bare, day, 12 * HOUR).ok, true);
  const rich = structuredClone(bare); rich.simMs += 12 * HOUR; rich.coins += 9 * 12 * 60 * 60;
  assert.equal(G.checkSaveJump(bare, rich, 12 * HOUR).reason, 'coins');
});
