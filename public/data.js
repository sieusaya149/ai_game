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
export const SPEEDS =[1, 5, 20];        // nút tốc độ để review nhanh
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
  canMax: 10,             // bình tưới chứa 10 lần tưới, ra giếng múc lại
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
// price: giá mua con non · grow: thời gian lớn (chỉ lớn khi no) · every: chu kỳ ra sản phẩm khi trưởng thành · sell: giá bán con trưởng thành
export const ANIMALS = {
  ga:  { name: 'Gà',  baby: 'Gà con',  lv: 1, price: 40,  grow: 4 * MIN,  feed: 'feed_ga',  pen: 'chicken', product: 'trung', every: 2.5 * MIN, sell: 90,  exp: 3 },
  heo: { name: 'Heo', baby: 'Heo con', lv: 3, price: 120, grow: 8 * MIN,  feed: 'feed_heo', pen: 'pig',     product: null,    every: 0,         sell: 380, exp: 12 },
  bo:  { name: 'Bò',  baby: 'Bê con',  lv: 5, price: 300, grow: 10 * MIN, feed: 'hay',      pen: 'pasture', product: 'sua',   every: 4 * MIN,   sell: 700, exp: 8 },
  cuu: { name: 'Cừu', baby: 'Cừu con', lv: 7, price: 400, grow: 10 * MIN, feed: 'hay',      pen: 'pasture', product: 'len',   every: 6 * MIN,   sell: 800, exp: 10 },
};
export const PEN_CAP = { chicken: 10, pig: 6, pasture: 5 };
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
  vitaminBoost: 0.5,          // vitamin: cộng ngay 50% thời gian lớn cho con non
};

// ---------- Chó ----------
export const DOG = {
  name: 'Mực',
  growMs: 8 * MIN,            // chó con lớn thành chó trưởng thành (khi no)
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
  vitamin:    { name: 'Vitamin thú nuôi',  kind: 'supply', price: 35, lv: 4, desc: 'Con non lớn vọt thêm 50% thời gian.' },
  feed_ga:    { name: 'Cám gà',            kind: 'feed',   price: 6,  lv: 1, desc: 'Đổ vào máng chuồng gà (5 phần ăn) hoặc cho ăn tận tay.' },
  feed_heo:   { name: 'Cám heo',           kind: 'feed',   price: 10, lv: 3, desc: 'Thức ăn cho heo.' },
  hay:        { name: 'Cỏ khô',            kind: 'feed',   price: 8,  lv: 5, desc: 'Thức ăn cho bò và cừu.' },
  dogfood:    { name: 'Xương cho chó',     kind: 'feed',   price: 8,  lv: 1, desc: 'Cho chó Mực ăn để nó lớn và chịu giữ nhà.' },
  deco_scarecrow: { name: 'Bù nhìn',       kind: 'deco',   price: 150, lv: 2, desc: 'Cắm gần ruộng, quạ không dám tới.' },
  deco_flower:    { name: 'Chậu hoa',      kind: 'deco',   price: 30,  lv: 1, desc: 'Cho nông trại thêm xinh.' },
  deco_lamp:      { name: 'Đèn lồng',      kind: 'deco',   price: 90,  lv: 3, desc: 'Sáng lung linh ban đêm, trộm ngại vào hơn.' },
  deco_bench:     { name: 'Ghế đá',        kind: 'deco',   price: 70,  lv: 2, desc: 'Ngồi nghỉ chân.' },
};

// Nông sản & sản phẩm bán ở kho.
export const PRODUCTS = {
  trung: { name: 'Trứng gà', price: 14 },
  sua:   { name: 'Sữa bò',   price: 40 },
  len:   { name: 'Lông cừu', price: 60 },
};
export const sellPrice = k => CROPS[k]?.price ?? PRODUCTS[k]?.price ?? 0;
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
  animals: [{ type: 'ga', adult: true }, { type: 'ga', adult: false }],
  dogAdult: false,
};
export const expandCost = n => Math.round(60 * 1.2 ** (n - START_PLOTS) / 10) * 10;
export const expandLevel = n => 1 + Math.floor((n - START_PLOTS) / 3);
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
