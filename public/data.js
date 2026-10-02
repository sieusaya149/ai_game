// Nội dung game: mọi con số cân bằng nằm ở đây. Thời gian tính bằng mili-giây THỜI GIAN GAME (tốc độ x1 = thời gian thật).
const MIN = 60_000;

export const DAY_MS = 20 * MIN;           // 1 ngày trong game = 20 phút ở tốc độ x1
export const NIGHT_FROM = 0.75;           // từ 3/4 ngày trở đi là ban đêm (tới hết ngày)
export const MARKET = { open: 6, close: 18 }; // chợ Bà Tư mở từ 6h tới 18h (giờ trong game; ngày bắt đầu lúc 6h)
// Thể lực: cost = điểm trừ mỗi lần làm (dọn bụi, đập đá chưa có hành động, để sẵn); hết thể lực thì đi và làm chậm ×slow.
// morningRegen: tự hồi mỗi sáng 6h · benchPerMin: ngồi ghế đá hồi mỗi phút · sleepHour: từ giờ này mới ngủ được
export const STAMINA = {
  max: 100, slow: 2, morningRegen: 30, benchPerMin: 15, sleepHour: 18,
  cost: { till: 1, water: 1, plant: 1, harvest: 1, clearBush: 2, breakRock: 3 },
};
// Công cụ 3 cấp (sắt/đồng/vàng). area: vùng tác động theo cấp (one = 1 ô · row = hàng 3 ô theo hướng nhìn · block = 3×3 tâm ô mục tiêu)
// price: xu nâng lên cấp 2, cấp 3 (mất DAY_MS ở tiệm rèn) · act: hành động ruộng dùng công cụ này · canMax: sức chứa bình tưới theo cấp
export const TOOLS = {
  hoe:    { name: 'Cuốc',      icon: '⛏️', area: ['one', 'row', 'block'], price: [200, 800], act: ['till'] },
  can:    { name: 'Bình tưới', icon: '💧', area: ['one', 'row', 'block'], price: [200, 800], act: ['water'], canMax: [10, 20, 40] },
  sickle: { name: 'Liềm',      icon: '🌾', area: ['one', 'row', 'block'], price: [250, 900], act: ['harvest', 'weed'] },
  basket: { name: 'Giỏ',       icon: '🧺', area: [],                      price: [150, 600], act: [], cap: [30, 60, 120] },   // cap: sức chứa giỏ (số món nông sản & sản phẩm) theo cấp
};
export const TOOL_MAX = 3;
export const TOOL_LEVEL = ['sắt', 'đồng', 'vàng'];
// Làm n ô một lần tốn thể lực = cost × GROUP_COST[n] (làm nhiều ô một lần nhẹ hơn làm từng ô: 3×3 tốn 5 thay vì 9)
export const GROUP_COST = [0, 1, 2, 2, 3, 3, 4, 4, 5, 5];
export const SPEEDS =[1, 5, 20];       // nút tốc độ để review nhanh
export const MAX_CATCHUP_MS = 8 * 60 * MIN; // tối đa 8 giờ chạy bù khi mở lại game

export const GRID = 6;                    // ruộng tối đa 6x6 ô
export const START_PLOTS = 9;

// ---------- Cây trồng ----------
// seed: giá hạt · grow: thời gian lớn tới lúc chín · yield: số nông sản · price: giá bán mỗi cái
export const CROPS = {
  cai:    { name: 'Cải xanh', lv: 1,  seed: 8,   grow: 1.5 * MIN, yield: 4, price: 5,  exp: 2 },
  carot:  { name: 'Cà rốt',   lv: 1,  seed: 15,  grow: 3 * MIN,   yield: 4, price: 9,  exp: 4 },
  lua:    { name: 'Lúa',      lv: 2,  seed: 20,  grow: 5 * MIN,   yield: 5, price: 10, exp: 6 },
  cachua: { name: 'Cà chua',  lv: 3,  seed: 35,  grow: 8 * MIN,   yield: 5, price: 18, exp: 10 },
  bap:    { name: 'Bắp',      lv: 4,  seed: 50,  grow: 10 * MIN,  yield: 6, price: 22, exp: 14 },
  dau:    { name: 'Dâu tây',  lv: 6,  seed: 80,  grow: 12 * MIN,  yield: 6, price: 35, exp: 20 },
  bingo:  { name: 'Bí ngô',   lv: 8,  seed: 120, grow: 15 * MIN,  yield: 5, price: 60, exp: 28 },
  duahau: { name: 'Dưa hấu',  lv: 10, seed: 180, grow: 20 * MIN,  yield: 6, price: 80, exp: 40 },
};
// Các giai đoạn theo % thời gian lớn: 0 hạt · 1 mầm · 2 cây non · 3 ra hoa/trái non · 4 chín.
export const CROP_STAGES = [0, 0.1, 0.35, 0.7, 1];
export const OVERRIPE = 1.5;              // chín quá (grow × 1.5) mà chưa hái thì héo, mất trắng

export const FARMING = {
  waterDrainPerMin: 25,   // đất mất bao nhiêu % nước mỗi phút (trời nắng ×1.5, trời mưa luôn đầy)
  canMax: 10,             // bình tưới cấp 1 chứa 10 lần tưới, ra giếng múc lại (cấp cao hơn: TOOLS.can.canMax)
  weedChancePerMin: 0.06, // xác suất mọc cỏ mỗi phút trên ô đã cuốc
  weedSlow: 0.5,          // có cỏ thì cây lớn chậm một nửa
  bugChancePerMin: 0.07,  // xác suất có sâu mỗi phút khi cây đang lớn
  bugToSick: 2 * MIN,     // sâu không diệt sau 2 phút thì cây bệnh
  sickToDead: 4 * MIN,    // bệnh không chữa sau 4 phút thì cây chết
  handCatchChance: 0.5,   // bắt sâu bằng tay: 50% thành công, không tốn gì
  fertYield: 0.5,         // bón phân: +50% sản lượng
  fertSpeed: 1.2,         // bón phân: lớn nhanh ×1.2
  growthBoost: 0.5,       // thuốc tăng trưởng: cộng ngay 50% tổng thời gian lớn (tối đa 2 lần mỗi cây)
  growthMax: 2,
};

// ---------- Vật nuôi ----------
// price: giá mua con non · every: chu kỳ ra sản phẩm khi trưởng thành (thời gian lớn: bảng LIFE) · sell: giá bán con trưởng thành
export const ANIMALS = {
  ga:  { name: 'Gà',  baby: 'Gà con',  lv: 1, price: 40,  feed: 'feed_ga',  pen: 'chicken', product: 'trung', every: 2.5 * MIN, sell: 90,  exp: 3 },
  heo: { name: 'Heo', baby: 'Heo con', lv: 3, price: 120, feed: 'feed_heo', pen: 'pig',     product: null,    every: 0,         sell: 380, exp: 12 },
  bo:  { name: 'Bò',  baby: 'Bê con',  lv: 5, price: 300, feed: 'hay',      pen: 'pasture', product: 'sua',   every: 4 * MIN,   sell: 700, exp: 8 },
  cuu: { name: 'Cừu', baby: 'Cừu con', lv: 7, price: 400, feed: 'hay',      pen: 'pasture', product: 'len',   every: 6 * MIN,   sell: 800, exp: 10 },
};
export const HUSBANDRY = {
  hungerMs: 5 * MIN,          // từ no (100) xuống đói hẳn (0)
  autoEatBelow: 60,           // đói hơn mức này thì tự ra máng ăn nếu máng còn cám
  troughMax: 20,              // máng chứa tối đa 20 phần ăn; 1 bao thức ăn = 5 phần
  unitsPerBag: 5,
  growNeedsHunger: 30,        // phải no trên 30 mới lớn và mới đẻ
  happyDecayPerMin: 4,
  petHappy: 25,
  sickAfterStarving: 3 * MIN, // đói lả (0) quá 3 phút thì bệnh
  sickChancePerMin: 0.004,
  eggHatchChance: 0.2,        // trứng bỏ quên quá 10 phút có 20% tự nở thành gà con
  eggForgetMs: 10 * MIN,
  nestHatchMs: 3 * MIN,       // đặt trứng vào ổ ấp: 3 phút nở gà con
  pigBreedChancePerMin: 0.25, // có ≥2 heo trưởng thành no & vui: mỗi phút 25% có heo nái mang bầu
  pigGestation: 6 * MIN,
  pigLitter: [1, 3],          // đẻ 1–3 heo con
  vitaminBoost: 0.5,          // vitamin: cộng ngay nửa giai đoạn đang ở cho con non, con nhỡ
};

// ---------- Vòng đời 4 giai đoạn (Phase 2) ----------
// Tuổi tính bằng GIỜ VƯỜN đã chạy (simMs, ADR 0003): vườn đóng băng thì con vật không già đi.
// LIFE[loài][giai đoạn] = thời lượng giai đoạn đó. Infinity = ở mãi giai đoạn đó (chó, mèo không già, không chết vì già).
// Hết giai đoạn già thì con vật ra đi (hóa thiên thần); chết vì già được phép cả lúc chạy bù (ADR 0004).
const HOUR = 60 * MIN;
export const STAGES = ['non', 'nho', 'truong', 'gia'];
export const STAGE_NAME = { non: 'Non', nho: 'Nhỡ', truong: 'Trưởng thành', gia: 'Già' };
export const LIFE = {
  ga:  { non: 5 * MIN,  nho: 10 * MIN, truong: 20 * HOUR, gia: 4 * HOUR },
  heo: { non: 10 * MIN, nho: 20 * MIN, truong: 30 * HOUR, gia: 6 * HOUR },
  bo:  { non: 15 * MIN, nho: 30 * MIN, truong: 45 * HOUR, gia: 8 * HOUR },
  cuu: { non: 15 * MIN, nho: 30 * MIN, truong: 45 * HOUR, gia: 8 * HOUR },
  cho: { non: 30 * MIN, nho: HOUR,     truong: Infinity,  gia: Infinity },
};
// Tuổi lúc bắt đầu một giai đoạn · giai đoạn ở tuổi `age` · tuổi ra đi (Infinity = không bao giờ)
export const stageStart = (kind, stage) => STAGES.slice(0, STAGES.indexOf(stage)).reduce((t, k) => t + LIFE[kind][k], 0);
export const stageAt = (kind, age) => STAGES.findLast(k => age >= stageStart(kind, k)) ?? 'non';
export const lifeEnd = kind => stageStart(kind, 'gia') + LIFE[kind].gia;
export const AGING = {
  warnMs: HOUR,       // báo trước 🟡 khi còn chừng này giờ vườn nữa là vào giai đoạn già
  oldEvery: 2,        // con già: chu kỳ ra sản phẩm dài gấp đôi (đẻ thưa, ít sữa, lông mỏng)
  pigHungry: 1.5,     // heo nhỡ ăn khỏe: đói nhanh ×1.5 ...
  pigGain: 2,         // ... và tăng cân nhanh ×2
};
// ---------- Đực/cái và sinh sản (Phase 2, issue 36) ----------
export const BREED = {
  femaleMul: 1.3,          // con cái đắt hơn con đực chừng 30%
  fertile: 0.4,            // có ≥1 gà trống trưởng thành: 40% trứng có phôi
  gestation: { bo: 10 * HOUR, cuu: 8 * HOUR },   // bò đực + cái chung chuồng: mỗi 10 giờ vườn một bê; cừu 8 giờ
  litterOld: [1, 2],       // heo nái già đẻ ít con hơn (heo thường: HUSBANDRY.pigLitter)
  nameMax: 16,             // tên con vật tối đa chừng này ký tự
  cockHour: 6,             // gà trống gáy lúc 6h sáng
};
export const animalPrice = (type, sex) => Math.round(ANIMALS[type].price * (sex === 'f' ? BREED.femaleMul : 1));
// Việc từng giai đoạn làm được: theo loài, thiếu loài thì lấy `all`.
// product: đẻ trứng / cho sữa / cho lông · plow: kéo cày (bò tơ kéo được cả hàng ruộng) · sell: bán được · vitamin: còn lớn được
export const STAGE_CAN = {
  product: { all: ['truong', 'gia'] },
  plow:    { bo: ['nho', 'truong'] },
  sell:    { all: ['nho', 'truong', 'gia'] },
  vitamin: { all: ['non', 'nho'] },
};
// Cân nặng (kg): lúc mới sinh, lúc lớn hẳn. Con non, nhỡ ăn no thì lên cân dần trong hai giai đoạn đầu.
export const WEIGHT = { ga: [0.2, 2.5], heo: [3, 100], bo: [30, 450], cuu: [4, 60] };
export const weightAt = (type, stage) => {
  const [w0, w1] = WEIGHT[type] ?? [1, 1];
  return stage === 'non' ? w0 : stage === 'nho' ? (w0 + w1) / 2 : w1;
};

// ---------- Chó ----------
export const DOG = {
  name: 'Mực',
  hungerMs: 8 * MIN,
  poopEvery: [2 * MIN, 4 * MIN], // chó ỉa bậy ngẫu nhiên trong khoảng này
  maxPoops: 8,
  poopFertChance: 0.5,        // xúc phân chó: 50% được 1 bao phân bón
  stinkUnhappyPerPoop: 2,     // mỗi bãi phân làm vật nuôi giảm vui mỗi phút
  slipStunMs: 900,            // giẫm phải phân: trượt, đứng hình 0.9 giây
  guardChance: 0.7,           // chó no & vui đuổi được trộm/quạ
};

// ---------- Kẻ phá hoại ----------
export const THREATS = {
  crowChancePerMin: 0.3,      // có cây chín mà không có bù nhìn: mỗi phút 30% có quạ bay tới
  crowEatMs: 25_000,          // quạ đậu 25 giây không bị đuổi thì ăn mất ô đó
  thiefChancePerNightMin: 0.15, // ban đêm có ≥2 ô chín: thằng Tèo lẻn vào hái trộm
  thiefStealMs: 15_000,
  thiefCaughtCoins: [20, 60], // bắt được thằng Tèo: nó xin lỗi, đền xu
};

// ---------- Vật phẩm ----------
// kind: seed | supply | feed | deco. Hạt giống sinh tự động từ CROPS.
export const ITEMS = {
  ...Object.fromEntries(Object.entries(CROPS).map(([id, c]) => [
    `seed_${id}`, { name: `Hạt ${c.name.toLowerCase()}`, kind: 'seed', crop: id, price: c.seed, lv: c.lv },
  ])),
  pesticide:  { name: 'Thuốc trừ sâu',     kind: 'supply', price: 15, lv: 1, desc: 'Diệt sâu và chữa cây bệnh ngay lập tức.' },
  growth:     { name: 'Thuốc tăng trưởng', kind: 'supply', price: 30, lv: 2, desc: 'Cây lớn vọt thêm 50% thời gian. Tối đa 2 lần mỗi cây.' },
  fertilizer: { name: 'Phân bón',          kind: 'supply', price: 12, lv: 1, desc: 'Bón trước khi chín: +50% sản lượng, lớn nhanh hơn.' },
  medicine:   { name: 'Thuốc thú y',       kind: 'supply', price: 40, lv: 3, desc: 'Chữa khỏi vật nuôi bị bệnh.' },
  vitamin:    { name: 'Vitamin thú nuôi',  kind: 'supply', price: 35, lv: 4, desc: 'Con non, con nhỡ lớn vọt thêm nửa giai đoạn.' },
  feed_ga:    { name: 'Cám gà',            kind: 'feed',   price: 6,  lv: 1, desc: 'Đổ vào máng chuồng gà (5 phần ăn) hoặc cho ăn tận tay.' },
  feed_heo:   { name: 'Cám heo',           kind: 'feed',   price: 10, lv: 3, desc: 'Thức ăn cho heo.' },
  hay:        { name: 'Cỏ khô',            kind: 'feed',   price: 8,  lv: 5, desc: 'Thức ăn cho bò và cừu.' },
  wood:       { name: 'Gỗ',               kind: 'material', price: 0, lv: 0, desc: 'Nhặt được khi dọn bụi cây trên đất mới.' },
  stone:      { name: 'Đá',               kind: 'material', price: 0, lv: 0, desc: 'Nhặt được khi đập đá trên đất mới.' },
  dogfood:    { name: 'Xương cho chó',     kind: 'feed',   price: 8,  lv: 1, desc: 'Cho chó Mực ăn để nó lớn và chịu giữ nhà.' },
  deco_scarecrow: { name: 'Bù nhìn',       kind: 'deco',   price: 150, lv: 2, desc: 'Cắm gần ruộng, quạ không dám tới.' },
  deco_flower:    { name: 'Chậu hoa',      kind: 'deco',   price: 30,  lv: 1, desc: 'Cho nông trại thêm xinh.' },
  deco_lamp:      { name: 'Đèn lồng',      kind: 'deco',   price: 90,  lv: 3, desc: 'Sáng lung linh ban đêm, trộm ngại vào hơn.' },
  deco_bench:     { name: 'Ghế đá',        kind: 'deco',   price: 70,  lv: 2, desc: 'Ngồi nghỉ chân.' },
};

// ---------- Mua đất ----------
// Dải đất dày depth ô, dài bằng cạnh hiện tại của vườn. LAND_STRIPS[n] = giá & cấp của dải thứ n+1 đã mua (tăng dần).
export const LAND_STRIP = { depth: 4 };
export const LAND_STRIPS = [500, 800, 1200, 1700, 2400, 3300, 4500, 6000, 8000, 10500, 14000, 18000, 23000, 29000, 36000, 44000, 53000, 63000, 75000, 90000]
  .map((price, i) => ({ price, lv: Math.min(40, 5 + 2 * i) }));
export const DIR_NAME = { N: 'Bắc', S: 'Nam', E: 'Đông', W: 'Tây' };
// Bụi, đá rải trên dải mới: xác suất mỗi ô (theo băm toạ độ, không ngẫu nhiên). Dọn tay: tốn thể lực STAMINA.cost[cost], được qty món item.
export const CLUTTER_RATE = { bush: 0.16, rock: 0.09 };
export const CLUTTER = {
  bush: { name: 'Bụi cây', act: 'Dọn bụi', icon: '🌿', item: 'wood',  qty: 2, cost: 'clearBush' },
  rock: { name: 'Tảng đá', act: 'Đập đá', icon: '⛏️', item: 'stone', qty: 2, cost: 'breakRock' },
};

// Nông sản & sản phẩm bán ở kho.
export const PRODUCTS = {
  trung: { name: 'Trứng gà', price: 14 },
  trung_phoi: { name: 'Trứng có phôi', price: 14 },   // đã soi: nở được trong ổ ấp
  sua:   { name: 'Sữa bò',   price: 40 },
  len:   { name: 'Lông cừu', price: 60 },
  sua_ngon: { name: 'Sữa ngon',    price: 60 },   // sao: bò được vuốt ve đều
  len_xoan: { name: 'Lông xoăn',   price: 90 },   // sao: cừu vui vẻ
};
// ---------- Độ thân ❤️1–5 (Phase 2) ----------
// Mỗi tim = perHeart điểm ẩn (a.bondXp). gain: điểm mỗi lần · perDay: số lần được tính mỗi ngày game cho mỗi cách (chống cày)
export const BOND = {
  perHeart: 20,
  gain: { feed: 5, pet: 5, bath: 8, cure: 10 },
  perDay: { feed: 2, pet: 3, bath: 1, cure: 1 },
  hungerBelow: 10, dirtyAbove: 70, lossPerMin: 1,   // đói / dơ lâu thì tụt điểm
  star: { base: 0.1, heart3: 0.25, petStreak: 0.05, petStreakMax: 5, sheepHappy: 80, sheepBonus: 0.25 },   // tỉ lệ sản phẩm sao
  starOf: { sua: 'sua_ngon', len: 'len_xoan' },
  sickMul: 0.5,      // ❤️4+: nguy cơ bệnh nhân hệ số này
  lifeMul: 1.1,      // ❤️5: tuổi thọ (mốc già, mốc ra đi) +10%
  runRange: 80,      // ❤️4+: chạy lại khi người chơi trong tầm này
};
export const sellPrice = k => CROPS[k]?.price ?? PRODUCTS[k]?.price ?? 0;
// Thùng giao hàng: lái buôn trả 80% giá chợ cho đồ trong thùng, chốt lúc 6h sáng (làm tròn xuống)
export const SHIP_RATE = 0.8;
export const shipValue = items => Math.floor(Object.entries(items).reduce((a, [k, n]) => a + sellPrice(k) * n, 0) * SHIP_RATE);
export const itemName = k => ITEMS[k]?.name ?? CROPS[k]?.name ?? PRODUCTS[k]?.name ?? k;

// ---------- Ngoại hình (skinset) ----------
// Các phần cơ bản miễn phí; mũ và phụ kiện mua ở sạp (price 0 = có sẵn).
export const LOOK = { skin: 3, hair: 3, hairColor: 5, shirt: 6, pants: 4 };
export const LOOK_NAMES = { skin: 'Màu da', hair: 'Kiểu tóc', hairColor: 'Màu tóc', shirt: 'Màu áo', pants: 'Màu quần', hat: 'Mũ', acc: 'Phụ kiện' };
export const HATS = [
  { name: 'Không đội', price: 0 },
  { name: 'Nón lá', price: 0 },
  { name: 'Mũ lưỡi trai', price: 60 },
  { name: 'Nơ hồng', price: 60 },
  { name: 'Vòng hoa', price: 120 },
  { name: 'Vương miện', price: 800 },
];
export const ACCS = [
  { name: 'Không có', price: 0 },
  { name: 'Kính mát', price: 80 },
  { name: 'Khăn quàng', price: 80 },
];
export const DEFAULT_LOOK = { skin: 0, hair: 0, hairColor: 0, shirt: 0, pants: 0, hat: 1, acc: 0 };

// ---------- Tiến trình ----------
export const START = {
  coins: 250,
  items: { seed_cai: 6, seed_carot: 3, feed_ga: 3, dogfood: 3, pesticide: 1, fertilizer: 1 },
  animals: [{ type: 'ga', stage: 'truong', sex: 'f' }, { type: 'ga', stage: 'non', sex: 'm' }],
  dogStage: 'non',
};
export const expandCost = n => Math.round(60 * 1.2 ** (n - START_PLOTS) / 10) * 10;
export const expandLevel = n => 1 + Math.floor((n - START_PLOTS) / 3);
// Khối ruộng 3x3 (chế độ xây dựng): [cấp, số khối tối đa]; giá khối thứ (n+1) khi đã có n khối (khối đầu có sẵn, miễn phí)
export const FIELD_LIMITS = [[1, 1], [4, 2], [8, 3], [12, 4], [16, 5], [20, 6], [25, 7], [30, 8]];
export const FIELD_PRICES = [300, 600, 1000, 1500, 2200, 3000, 4000];
// Giá xây chuồng (mở theo cấp mua được con vật tương ứng trong ANIMALS)
export const PEN_PRICES = { chicken: 200, pig: 600, pasture: 1500, quarantine: 400 };
// Bảng chuồng theo (loại, cấp). cap: sức chứa 3 cấp; lv: cấp người chơi để xây; limit: [cấp, số chuồng tối đa] (như FIELD_LIMITS);
// up: giá nâng lên cấp 2, 3; upLv: cấp người chơi để nâng; extra3: đồ có thêm ở cấp 3 (shower để dành Phase 3, cách ly nhận mọi loài).
export const PEN_TABLE = {
  chicken:    { cap: [6, 12, 18], lv: 1, limit: [[1, 1], [4, 2], [8, 3]],  up: [300, 800],   upLv: [2, 4], extra3: ['autoNest', 'sandbox'] },
  pig:        { cap: [3, 5, 8],   lv: 3, limit: [[3, 1], [6, 2], [10, 3]], up: [800, 2000],  upLv: [4, 6], extra3: ['mudPit', 'shower'] },
  pasture:    { cap: [3, 6, 9],   lv: 5, limit: [[5, 1], [8, 2], [12, 3]], up: [2000, 4500], upLv: [6, 8], extra3: ['autoGrass'] },
  quarantine: { cap: [1, 2, 3],   lv: 3, limit: [[3, 1], [7, 2]],         up: [500, 1200],  upLv: [5, 7], extra3: [] },
  doghouse:   { cap: [1, 1, 1],   lv: 1, limit: [[1, 1]],                 up: [150, 400],   upLv: [2, 4], extra3: ['bed', 'toy'] },
};
export const PEN_LEVELS = 3;
export const expNeed = level => Math.floor(25 * level ** 1.5);
export function levelInfo(exp) {
  let level = 1;
  while (exp >= expNeed(level)) exp -= expNeed(level++);
  return { level, cur: exp, need: expNeed(level) };
}

// ---------- Đơn hàng của hàng xóm (NPC) ----------
export const ORDERS = {
  max: 3,
  newEvery: 3 * MIN,
  rewardMul: 1.6,             // thưởng = tổng giá bán × 1.6
  people: ['Bà Tư', 'Chú Ba', 'Cô Út', 'Bé Bi', 'Ông Sáu', 'Chị Hai', 'Anh Tám', 'Dì Năm'],
};

// ---------- Thành tựu ----------
// stat: tên chỉ số trong state.stats · goal: mốc cần đạt · coins: thưởng
export const ACHIEVEMENTS = [
  { id: 'harvest10',  name: 'Nông dân tập sự', desc: 'Thu hoạch 10 lần',        stat: 'harvests', goal: 10,  coins: 50 },
  { id: 'harvest100', name: 'Lão nông tri điền', desc: 'Thu hoạch 100 lần',     stat: 'harvests', goal: 100, coins: 500 },
  { id: 'bugs20',     name: 'Sát thủ sâu bọ',   desc: 'Diệt 20 con sâu',        stat: 'bugs',     goal: 20,  coins: 80 },
  { id: 'eggs30',     name: 'Vua trứng gà',     desc: 'Nhặt 30 quả trứng',      stat: 'eggs',     goal: 30,  coins: 120 },
  { id: 'poop20',     name: 'Người hùng xúc phân', desc: 'Dọn 20 bãi phân chó', stat: 'poops',    goal: 20,  coins: 100 },
  { id: 'slip5',      name: 'Chân ướt chân ráo', desc: 'Giẫm phải phân chó 5 lần', stat: 'slips', goal: 5,   coins: 30 },
  { id: 'piglets10',  name: 'Heo nái anh hùng', desc: 'Có 10 heo con chào đời',  stat: 'piglets',  goal: 10,  coins: 300 },
  { id: 'hatch5',     name: 'Mẹ gà khéo ấp',    desc: 'Ấp nở 5 gà con',         stat: 'hatches',  goal: 5,   coins: 100 },
  { id: 'orders10',   name: 'Hàng xóm tốt bụng', desc: 'Giao 10 đơn hàng',      stat: 'orders',   goal: 10,  coins: 200 },
  { id: 'thief3',     name: 'Bắt trộm giỏi',    desc: 'Bắt thằng Tèo 3 lần',    stat: 'thieves',  goal: 3,   coins: 150 },
  { id: 'crow10',     name: 'Khắc tinh của quạ', desc: 'Đuổi 10 con quạ',       stat: 'crows',    goal: 10,  coins: 80 },
  { id: 'rich5000',   name: 'Đại gia làng',     desc: 'Kiếm tổng cộng 5.000 xu', stat: 'earned',  goal: 5000, coins: 500 },
];

// ---------- Thông báo 3 mức (DESIGN §8c) ----------
// Mọi loại event luật chơi phát ra đều có ở đây. level:
//   urgent    gấp: băng rôn đỏ + tiếng + rung + mũi tên (hiện từ state qua urgentSpots, không tắt được)
//   important quan trọng: toast nhỏ, tự gộp cùng group trong NOTIFY_WINDOW; tắt được theo cat
//   info      thông tin: chỉ ghi nhật ký, không hiện gì
//   direct    thông báo thẳng của luật (toast, thành tựu có huy hiệu riêng): hiện nguyên văn, không gộp
//   none      không phải thông báo (hiệu ứng, âm thanh, sinh vật)
// group(e): khóa gộp · text(n, e): chữ khi đã gộp n sự kiện · cat: khóa bật/tắt trong cài đặt
export const NOTIFY_WINDOW = 3000;
export const NOTIFY_CATS = {
  ripe: 'Cây chín', spoil: 'Cây héo, cây chết', hungry: 'Con vật đói', loss: 'Quạ, trộm lấy mất cây',
  levelup: 'Lên cấp', order: 'Đơn hàng mới', old: 'Con vật sắp già, ra đi',
};
const cropN = id => (CROPS[id]?.name ?? id).toLowerCase();
const animalN = a => String(a).toLowerCase();
export const EVENT_LEVEL = {
  sick:      { level: 'urgent', group: e => 'sick:' + e.animal, label: 'Con vật bị bệnh' },
  eating:    { level: 'urgent', group: e => 'eating:' + e.kind, label: 'Quạ, trộm đang ăn cây' },
  ripe:      { level: 'important', cat: 'ripe', group: e => 'ripe:' + e.crop, label: 'Cây chín', text: (n, e) => `${n} ô ${cropN(e.crop)} đã chín 🌾` },
  rotten:    { level: 'important', cat: 'spoil', group: e => 'rotten:' + e.crop, label: 'Cây héo', text: (n, e) => `${n} ô ${cropN(e.crop)} đã héo 🥀` },
  dead:      { level: 'important', cat: 'spoil', group: e => 'dead:' + e.crop, label: 'Cây chết', text: (n, e) => `${n} ô ${cropN(e.crop)} đã chết 💀` },
  hungry:    { level: 'important', cat: 'hungry', group: e => 'hungry:' + e.animal, label: 'Con vật đói', text: (n, e) => `${n} con ${animalN(e.animal)} đói lả` },
  crow:      { level: 'important', cat: 'loss', group: () => 'loss:crow', label: 'Quạ ăn mất cây', text: (n, e) => n > 1 ? `Quạ đã ăn mất ${n} cây 😢` : `Quạ đã ăn mất ${(e.name ?? 'cây').toLowerCase()} 😢` },
  thief:     { level: 'important', cat: 'loss', group: () => 'loss:thief', label: 'Trộm hái mất cây', text: (n, e) => n > 1 ? `Thằng Tèo đã hái trộm ${n} cây 😢` : `Thằng Tèo đã hái trộm ${(e.name ?? 'cây').toLowerCase()} 😢` },
  levelup:   { level: 'important', cat: 'levelup', group: () => 'levelup', label: 'Lên cấp', text: (n, e) => `Lên cấp ${e.level}! Thưởng ${e.level * 20} xu 🎉` },
  order:     { level: 'important', cat: 'order', group: () => 'order', label: 'Đơn hàng mới', text: n => n > 1 ? `${n} đơn hàng mới 📋` : 'Hàng xóm có đơn hàng mới 📋' },
  oldSoon:   { level: 'important', cat: 'old', group: e => 'oldSoon:' + e.animal, label: 'Con vật sắp già', text: (n, e) => `${n} con ${animalN(e.animal)} sắp già, chuẩn bị hoặc bán đi nhé 👵` },
  passed:    { level: 'important', cat: 'old', group: e => 'passed:' + e.animal, label: 'Con vật già ra đi', text: (n, e) => `${n} con ${animalN(e.animal)} đã già và ra đi thanh thản 😇` },
  egg:       { level: 'info', group: () => 'egg', label: 'Gà đẻ trứng' },
  born:      { level: 'info', group: e => 'born:' + e.kind, label: 'Con vật chào đời' },
  cockcrow:  { level: 'none', group: () => 'cockcrow', label: 'Gà trống gáy' },
  guard:     { level: 'info', group: e => 'guard:' + e.who, label: 'Chó đuổi quạ, trộm' },
  shipped:   { level: 'info', group: () => 'shipped', label: 'Lái buôn lấy hàng' },
  log:       { level: 'info', group: () => 'log', label: 'Nhật ký' },
  toast:     { level: 'direct', group: e => 'toast:' + e.text, label: 'Thông báo của luật chơi' },
  achievement: { level: 'direct', group: e => 'achievement:' + e.id, label: 'Thành tựu' },
  fx:        { level: 'none', group: () => 'fx', label: 'Hiệu ứng chữ bay' },
  sound:     { level: 'none', group: () => 'sound', label: 'Âm thanh' },
  spawn:     { level: 'none', group: () => 'spawn', label: 'Sinh vật xuất hiện' },
};
