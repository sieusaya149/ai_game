// Nội dung game: mọi con số cân bằng nằm ở đây. Thời gian tính bằng mili-giây THỜI GIAN GAME (tốc độ x1 = thời gian thật).
const MIN = 60_000;

export const DAY_MS = 20 * MIN;           // 1 ngày trong game = 20 phút ở tốc độ x1
export const NIGHT_FROM = 0.75;           // từ 3/4 ngày trở đi là ban đêm (tới hết ngày)
export const MARKET = { open: 6, close: 18 }; // chợ Bà Tư mở từ 6h tới 18h (giờ trong game; ngày bắt đầu lúc 6h)
// Mua online: đặt lúc nào cũng được, hàng tới kho theo kiểu giao đã chọn (chợ đóng thì sáng hôm sau 6h), người giao hàng
// đi bộ từ cổng tới nhà kho. Phí giao theo kiểu giao (ít nhất feeMin xu) · tối đa maxPending đơn chờ · maxQty mỗi món một đơn
// · leaveMs: giao xong còn đi ra cổng chừng này lâu · speed: px/s lúc đi (world.js) · walkMul: thời gian đi = quãng thẳng / tốc độ đi × hệ số (đường vòng)
// Ba kiểu giao (modes): ms = tổng thời gian tới khi hàng vào kho (đã gồm quãng người giao hàng đi bộ), fee = phí theo tiền hàng; ms 0 = vào kho ngay
export const DELIVERY = { modes: [{ id: 'now', ms: 0, fee: 0.3 }, { id: 'm1', ms: MIN, fee: 0.2 }, { id: 'm2', ms: 2 * MIN, fee: 0.1 }], feeMin: 5, maxPending: 5, maxQty: 99, leaveMs: 15_000, speed: 44, walkMul: 1.8, walkMin: 6000 };
// Thể lực: cost = điểm trừ mỗi lần làm (dọn bụi, đập đá chưa có hành động, để sẵn); hết thể lực thì đi và làm chậm ×slow.
// morningRegen: tự hồi mỗi sáng 6h · benchPerMin: ngồi ghế đá hồi mỗi phút · sleepHour: từ giờ này mới ngủ được
export const STAMINA = {
  max: 100, slow: 2, morningRegen: 30, benchPerMin: 15, sleepHour: 18,
  cost: { till: 1, water: 1, plant: 1, harvest: 1, clearBush: 2, breakRock: 3, chopTree: 4, steal: 2 },
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
export const OVERRIPE = 1.5;              // chín quá (grow × 1.5) mà chưa hái thì héo, mất trắng (cây ngắn ngày: xem RIPE_FLOOR)
export const RIPE_FLOOR = 10 * MIN;       // cửa sổ chín→héo ít nhất 10 phút game, kể cả cây lớn nhanh
export const WILT_WARN = 0.8;             // đã qua 80% cửa sổ thì báo "sắp héo"

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
  vit: { name: 'Vịt', baby: 'Vịt con', lv: 2, price: 55,  feed: 'feed_ga',  pen: 'chicken', product: 'trung_vit', every: 3 * MIN, sell: 120, exp: 4 },
  heo: { name: 'Heo', baby: 'Heo con', lv: 3, price: 120, feed: 'feed_heo', pen: 'pig',     product: null,    every: 0,         sell: 380, exp: 12 },
  bo:  { name: 'Bò',  baby: 'Bê con',  lv: 5, price: 300, feed: 'hay',      pen: 'pasture', product: 'sua',   every: 4 * MIN,   sell: 700, exp: 8 },
  cuu: { name: 'Cừu', baby: 'Cừu con', lv: 7, price: 400, feed: 'hay',      pen: 'pasture', product: 'len',   every: 6 * MIN,   sell: 800, exp: 10 },
  // Mèo là thú cưng (issue 44): ở nhà mèo chứ không ở chuồng có rào, không cho sản phẩm, không bán được, không dơ
  meo: { name: 'Mèo', baby: 'Mèo con', lv: 5, price: 180, feed: 'catfood', pen: 'cathouse', product: null,    every: 0,         sell: 0,   exp: 6, pet: true },
};
// Dơ và tắm (lát 37). Độ dơ 0..100 theo giờ vườn; từ sạch tới dơ hẳn mất fullMs, mưa hoặc chuồng bẩn thì nhanh gấp đôi.
export const DIRT = {
  fullMs: 3 * 60 * MIN,
  fastMul: 2,                 // mưa hoặc chuồng bẩn
  high: 60,                   // từ mức này là "dơ": mất vui, dễ bệnh hơn
  unhappyPerMin: 1.5,         // con dơ (trừ heo, bò) mất vui mỗi phút
  sickMul: 2,                 // con dơ dễ bệnh gấp đôi
  mud: ['heo', 'bo'],         // đầm bùn: dơ ngay, không mất vui
  wallowAfterMs: 20 * MIN,    // tắm xong chừng này lâu mới lăn bùn lại
  sandCap: 30,                // gà có ổ cát tự tắm cát: dơ không vượt mức này (trừ khi trời mưa)
  bathHappy: 15, bathBond: 0.2,
};
// Phân chuồng tích dần theo giờ vườn (0..100); đầy thì chuồng bẩn
export const MANURE = { fullMs: 2 * 60 * MIN, dirtyAt: 100, perScoop: 25 };   // xúc: nhận 1 phân chuồng mỗi perScoop độ đầy (tối thiểu 1)
export const HUSBANDRY = {
  hungerMs: 5 * MIN,          // từ no (100) xuống đói hẳn (0)
  autoEatBelow: 60,           // đói hơn mức này thì tự ra máng ăn nếu máng còn cám
  troughMax: 20,              // máng chứa tối đa 20 phần ăn; 1 bao thức ăn = 5 phần
  unitsPerBag: 5,
  growNeedsHunger: 30,        // phải no trên 30 mới lớn và mới đẻ
  happyDecayPerMin: 4,
  petHappy: 25,
  // Quên cho ăn một lượt KHÔNG gây bệnh. Từ no: 3 phút tới "đang đói" (<40, báo + việc cần làm), 5 phút tới đói lả (0);
  // con đói thì ngừng sinh sản/lớn (growNeedsHunger) nhưng chưa bệnh. Chỉ bỏ đói lả RẤT LÂU mới có nguy cơ bệnh:
  // từ lúc hunger = 0 phải qua sickRiskAfterStarving (30 phút, ~6 chu kỳ ăn) mới bắt đầu có xác suất, rồi xác suất
  // tăng dần tuyến tính từ 0 tới sickStarveMaxPerMin sau sickStarveRampMs. Không có mốc "chắc chắn bệnh". Chỉnh lại cân bằng thì sửa 3 số này.
  sickRiskAfterStarving: 30 * MIN,
  sickStarveRampMs: 60 * MIN,
  sickStarveMaxPerMin: 0.08,  // xác suất/phút khi đã đói lả hết thời gian tăng dần
  sickChancePerMin: 0.004,    // xác suất/phút: áp dụng khi bị bỏ bê (đói lả lâu, dơ, chuồng bẩn hoặc già). No, sạch thì không tự bệnh
  hungryBelow: 40,            // đói hơn mức này là "đang đói": báo đói, vào việc cần làm, hiện nút Cho ăn (CHƯA có nguy cơ bệnh)
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
  vit: { non: 5 * MIN,  nho: 10 * MIN, truong: 20 * HOUR, gia: 4 * HOUR },
  heo: { non: 10 * MIN, nho: 20 * MIN, truong: 30 * HOUR, gia: 6 * HOUR },
  bo:  { non: 15 * MIN, nho: 30 * MIN, truong: 45 * HOUR, gia: 8 * HOUR },
  cuu: { non: 15 * MIN, nho: 30 * MIN, truong: 45 * HOUR, gia: 8 * HOUR },
  cho: { non: 30 * MIN, nho: HOUR,     truong: 40 * HOUR, gia: Infinity },   // chó có tuổi già nhưng không bao giờ ra đi
  meo: { non: 20 * MIN, nho: 40 * MIN, truong: 40 * HOUR, gia: Infinity },   // mèo cũng vậy: già thì lười chứ không chết vì già
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
// ---------- Bệnh 4 giai đoạn (Phase 2, issue 38) ----------
// a.sick: 0 khỏe · 1 mệt · 2 bệnh nặng · 3 nguy kịch; a.sickMs = tiến triển bệnh (giờ vườn, con già nhân đôi tốc độ).
// Mất khi sickMs >= deadAt. Chạy bù offline: bệnh dừng ở Bệnh nặng, không chuyển Nguy kịch, không chết (ADR 0004).
export const SICK = {
  toSevere: HOUR, toCritical: HOUR + 30 * MIN, deadAt: HOUR + 45 * MIN,
  oldMul: 2,                          // con già: bệnh tiến triển nhanh gấp đôi
  quarantineMul: 1.5,                 // chuồng cách ly: hồi bệnh nhanh ×1.5 (bệnh tiến triển chậm lại chừng đó)
  catchUpCap: HOUR + 10 * MIN,        // chạy bù: tiến triển không vượt mức này (còn trong Bệnh nặng); Nguy kịch hạ về mức này
  spread: { everyMs: 10 * MIN, p: 0.1 },   // con Bệnh nặng: mỗi 10 phút 10% lây một con cùng chuồng
  doses: [0, 1, 2],                   // số liều thuốc để chữa: Mệt 1, Bệnh nặng 2, Nguy kịch chỉ bác sĩ
  vaccineMs: 10 * HOUR,               // vắc-xin chống bệnh chừng này giờ vườn
  minLevel: 5,                        // dưới cấp này bệnh không vượt quá Mệt
  vetPrice: 300,                      // gọi bác sĩ thú y qua điện thoại ở nhà
  oldChanceMul: 2,                    // con già dễ mắc bệnh gấp đôi
  dirtyPenMul: 2,                     // chuồng bẩn dễ bệnh gấp đôi
  griefMs: 30 * MIN, griefHappy: 15, griefCap: 40,   // có con mất: cả trại buồn (vui không quá griefCap) chừng này lâu
  flowerGriefMul: 1 / 3,              // đặt hoa lên mộ: phần buồn còn lại co còn chừng này
};
// Chỉ bán ở trạm thú y Cô Út trong làng (không có ở quầy vật tư chợ Bà Tư)
export const VET_ITEMS = ['medicine', 'vaccine'];
// ---------- Nhiệm vụ làm quen của Cô Út (issue 48) ----------
// Mở khi mua con heo đầu tiên lúc đã đủ cấp nuôi heo (ANIMALS.heo.lv). Mỗi bước mở khi bước trước xong, bỏ qua được.
export const CO_UT_QUEST = ['bathe', 'cure', 'vaccinate'];
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
export const WEIGHT = { ga: [0.2, 2.5], vit: [0.2, 3], heo: [3, 100], bo: [30, 450], cuu: [4, 60], meo: [0.3, 4] };
export const weightAt = (type, stage) => {
  const [w0, w1] = WEIGHT[type] ?? [1, 1];
  return stage === 'non' ? w0 : stage === 'nho' ? (w0 + w1) / 2 : w1;
};

// ---------- Bán cho Chú Ba, heo theo cân, nghỉ hưu (issue 40) ----------
// Con thường: giá bán ANIMALS[].sell × stageMul × bondMul (heo: số ký × giá chợ hôm đó × bondMul, không nhân stageMul vì cân đã nói lên giai đoạn)
// Con bệnh / dơ thì nhân thêm sickMul / dirtyMul. Bán con ❤️confirmBond+ phải xác nhận `confirms` lần.
export const TRADE = {
  stageMul: { non: 0, nho: 0.6, truong: 1, gia: 0.6 },
  bondMul: [0.85, 1, 1.15, 1.3, 1.5],   // ❤️1..5
  sickMul: 0.6, dirtyMul: 0.8,
  confirmBond: 4, confirms: 2,
  pigKg: [4, 5, 5, 6, 7, 6, 4],         // lịch giá heo hơi (xu/kg) theo ngày game, lặp mỗi 7 ngày
  walkPx: 16,                           // px/giây heo đi hết ga; ít đi hơn thì coi là ít vận động
  gainActive: 0.6, gainLazy: 1.5,       // hệ số tăng cân khi hay vận động / nằm ườn
  gainFull: 1.25, fullAt: 90,           // ăn no (đói ≥ fullAt) tăng thêm
  retireHappy: 75,                      // có con nghỉ hưu: cả chuồng vui tối thiểu mức này
  retireUndo: false,                    // nghỉ hưu có đảo ngược được không
  visitMs: 6200,                        // Chú Ba dắt con vật đi: cảnh dài chừng này (chỉ hiển thị)
};
export const pigKgPrice = day => TRADE.pigKg[((day | 0) % 7 + 7) % 7];
// ---------- Chó ----------
export const DOG = {
  name: 'Mực',
  hungerMs: 8 * MIN,
  poopEvery: [2 * MIN, 4 * MIN], // chó ỉa bậy ngẫu nhiên trong khoảng này
  maxPoops: 8,
  poopPupMul: 0.55,           // chó con nghịch và ỉa nhiều hơn hẳn
  poopFertChance: 0.5,        // xúc phân chó: 50% được 1 bao phân bón
  stinkUnhappyPerPoop: 2,     // mỗi bãi phân làm vật nuôi giảm vui mỗi phút
  slipStunMs: 900,            // giẫm phải phân: trượt, đứng hình 0.9 giây
  guardChance: 0.7,           // chó no & vui đuổi được trộm/quạ
  guardRadius: { non: 0, nho: 4, truong: 6, gia: 4 },   // bán kính phát hiện trộm (ô): chó con chưa canh, chó già mắt kém lại
  guardPostMul: 2,            // đang gác một chỗ (lệnh Canh khu): bán kính ×2 tại chỗ gác
  // bát ăn cạnh chuồng chó (góp ý người chơi): mỗi lần đổ 1 xương = 1 phần, chó đói dưới bowlHungry thì tự đi tới bát
  // (mất bowlWalkMs giờ vườn) rồi ăn 1 phần cho no. Chạy bù offline cũng ăn đúng như vậy.
  bowlMax: 3,
  bowlHungry: 50,
  bowlWalkMs: 6000,
};

// ---------- Màu lông chó, mèo (góp ý người chơi) ----------
// Chọn lúc nhận nuôi chó (màn tạo nhân vật) / mua mèo, đổi lại ở trạm thú y Cô Út. Thứ tự = thứ tự trên nút chọn.
// Bảng màu vẽ nằm ở coat.js; mặc định là màu của bộ art gốc (chó Mực đen, mèo mướp vàng).
export const COATS = {
  cho: { vang: 'Vàng', den: 'Đen', trang: 'Trắng', dom: 'Đốm' },
  meo: { muop: 'Mướp', vang: 'Vàng', den: 'Đen', tamthe: 'Tam thể' },
};
export const COAT = { price: 20, def: { cho: 'den', meo: 'vang' } };

// ---------- Mèo (issue 44) ----------
// Mèo sống ở nhà mèo, ra vào tự do qua cửa mèo, tối ngủ trong bản đồ nhà. Không dạy được lệnh, không dơ, không bán.
// Săn chuột là luật trừu tượng theo ô và xác suất (ADR 0013): mỗi huntEvery một lượt rình, nhắm con chuột gần nhất
// theo ô, trúng với xác suất catchChance[giai đoạn] × hệ số theo mức đói. Chạy bù offline ra đúng kết quả đó.
export const CAT = {
  hungerMs: 12 * MIN,         // từ no (100) xuống đói hẳn (0)
  happyDecayPerMin: 3,
  sickMul: 0.25,              // thú cưng khỏe hơn vật nuôi: nguy cơ mắc bệnh chỉ bằng chừng này
  petHappy: 25,
  lazyFull: 85,               // no hơn mức này: mèo lười, nằm phơi nắng, không săn
  bestHunger: [15, 75],       // "đói vừa phải": săn tốt nhất trong khoảng này
  offBand: 0.5,               // ngoài khoảng đó (mà chưa no quá) thì chỉ còn chừng này
  oldHungry: 40,              // mèo già lười, chỉ chịu săn khi đói dưới mức này
  huntEvery: 2 * MIN,         // mỗi lượt rình cách nhau chừng này giờ vườn
  catchChance: { non: 0, nho: 0.1, truong: 0.2, gia: 0.2 },   // trưởng thành: 0.2 mỗi 2 phút ≈ 1 con chuột mỗi 10 phút
  catchExp: 3,
  ratSpawnMul: 0.5,           // có mèo trưởng thành khỏe (không bệnh, còn no) thì chuột sinh ra thưa đi chừng này
  guardMinHunger: 20,         // đói dưới mức này mèo không còn "canh" chuột nữa
  trophyMs: 60_000,           // mang chuột tới khoe người chơi trong chừng này
  praiseHappy: 15, praiseExp: 2,
  herdHappy: 60,              // vui từ mức này mèo mới chịu lùa (mỏng hơn chó: chỉ 1 con gần nhất)
  herdStages: ['nho', 'truong', 'gia'],
  spatPerMin: 0.05,           // thỉnh thoảng cãi nhau với chó: vui thôi, không hại gì, không đổi chỉ số
  spatMs: 5000,
  spatRadius: 4,              // ô: phải đứng gần chó mới cãi nhau được
  moveMs: [5000, 12000],      // đổi ô sau khoảng này
  roamRadius: 6,              // ô kế tiếp cách ô hiện tại tối đa chừng này
  houseSpot: { x: 34, y: 78 },   // chỗ mèo nằm ngủ trong bản đồ nhà (dưới chân giường)
  doorMs: 20_000,             // tối: mèo đi về cửa mèo trên nhà trong chừng này rồi mới chui vào nhà
};

// ---------- Dạy lệnh cho chó (issue 45) ----------
// sessions = số buổi phải đạt. Ngồi là lệnh nền, phải học trước mọi lệnh khác.
export const TRICKS = {
  sit:    { name: 'Ngồi',      icon: '🪑', sessions: 2, desc: 'Mực ngồi yên một chỗ, không chạy lung tung.' },
  follow: { name: 'Đi theo',   icon: '🚶', sessions: 3, desc: 'Mực đi sát bên bạn, kể cả khi sang làng.' },
  guard:  { name: 'Canh khu',  icon: '🛡️', sessions: 4, desc: 'Mực gác một chỗ bạn chọn, phát hiện trộm xa gấp đôi ở đó.' },
  herd:   { name: 'Lùa',       icon: '🐑', sessions: 5, desc: 'Mực lùa cả đàn về chuồng trong khoảng 20 giây, tối nào cũng tự lùa nếu no và vui.' },
  egg:    { name: 'Tìm trứng', icon: '👃', sessions: 4, desc: 'Mực đánh hơi tìm trứng giấu trong bụi.' },
  bird:   { name: 'Đuổi chim', icon: '🐦', sessions: 3, auto: true, desc: 'Mực tự đuổi quạ, không cần bạn chạy ra.' },
};
export const TRICK_BASE = 'sit';          // lệnh nền, khóa các lệnh khác tới khi học xong
export const TRAIN = {
  stages: ['nho', 'truong'],   // chó con chưa học được, chó già không học thêm nữa
  treat: 'treat',              // mỗi buổi tốn 1 bánh thưởng (mất cả khi chó bỏ giữa chừng)
  fastHappy: 70,               // chó vui từ mức này thì học nhanh: một buổi đạt ăn 2 buổi
  quitHunger: 40,              // đói dưới mức này ...
  quitHappy: 35,               // ... hay buồn dưới mức này thì có thể bỏ buổi giữa chừng
  quitChance: 0.5,
  happyGain: 10,               // học xong một buổi chó vui thêm
  rounds: 3, need: 2,          // minigame: 3 lượt bấm, trúng từ 2 lượt là đạt
  zone: 0.26, sweepMs: 1500,   // bề rộng vạch khen (phần của thanh) và thời gian con trỏ chạy hết một lượt
  herdMs: 20_000,              // lệnh Lùa: cả đàn về chuồng trong khoảng này
  stayMs: 2 * MIN,             // bị lùa về rồi thì ở yên trong chuồng chừng này mới ra lại
  autoHunger: 50, autoHappy: 60,   // tối nào chó no & vui tới mức này thì tự lùa đàn
};

// ---------- Chó canh khách lạ (issue 31, DESIGN §6.1) ----------
// Luật bán kính và ngủ gật nằm trong state.js; world.js chỉ diễn hoạt (ADR 0013).
export const GUARD = {
  // bán kính phát hiện theo giai đoạn: DOG.guardRadius (chung cho trộm NPC và khách online)
  sadHappy: 50,               // vui dưới mức này: bán kính còn một nửa
  hungryStop: 30,             // đói dưới mức này: nằm bẹp, không canh nữa
  napRadius: 1,               // đang ngủ gật: chỉ thấy khách đứng sát bên
  chainRadius: 3,             // bị xích: chỉ chạy và canh trong 3 ô quanh chuồng chó
  napEvery: 60_000,           // ban đêm cứ chừng này (giờ vườn) lại quay xem có ngủ gật không
  napRate: 0.3,               // ~30% thời gian ban đêm chó ngủ gật
  napMs: 60_000,              // trúng thì ngủ gật suốt khe đó (napMs = napEvery nên đúng napRate thời gian ban đêm)
  chaseMul: 1.3,              // chó đuổi nhanh gấp 1.3 lần người đi bộ
  biteRange: 11,              // đớp được khi cách khách chừng này điểm ảnh
  loseMs: 2000,               // mất dấu khách chừng này thì chó thôi đuổi, quay về chơi
  biteStunMs: 3000,           // bị đớp: khách đứng hình 3 giây
  fine: 30,                   // bị đớp: khách nộp phạt chừng này xu cho chủ vườn
  barkEvery: 20_000,          // một vườn chỉ ghi một dòng "chó sủa" trong chừng này (khỏi spam nhật ký)
  barkShowMs: 15_000,         // chủ thấy báo gấp 🔴 + mũi tên chó sủa trong chừng này
  sausageHunger: 50,          // chó no dưới mức này thì chắc chắn ăn xúc xích
  sausageGreed: 0.3,          // chó đang no vẫn 30% tham ăn
  quietMs: 60_000,            // ăn xúc xích xong chó im lặng chừng này (giờ ngoài đời)
};
export const WALK_SPEED = 70;  // px/s của người đi bộ (world.js dùng; tốc độ chó đuổi tính theo đây)

// ---------- Kẻ phá hoại ----------
export const THREATS = {
  crowChancePerMin: 0.3,      // có cây chín mà không có bù nhìn: mỗi phút 30% có quạ bay tới
  crowEatMs: 25_000,          // quạ đậu 25 giây không bị đuổi thì ăn mất ô đó
  thiefStealMs: 15_000,
  thiefCaughtCoins: [20, 60], // bắt được trộm người: nó xin lỗi, đền xu
};

// ---------- Trộm NPC: thằng Tèo, Tí Sún, chồn hương (issue 46) ----------
// Mỗi đêm luật chốt đúng một vụ (hoặc không vụ nào) nên không bao giờ quá 1 vụ mỗi đêm.
export const RAID = {
  minLevel: 5,            // bảo hộ người mới: dưới cấp này chưa có Tí Sún và chồn hương
  nightly: 0.5,           // vườn vừa đủ đồ đáng trộm: trung bình 1 vụ mỗi 2 đêm
  lootBase: 3,            // số món đáng trộm của một vườn "thường"
  lootRich: 9,            // nhiều hơn lootBase chừng này món nữa là vườn giàu nhất
  richMul: 2,             // vườn giàu nhất: tần suất gấp đôi (vẫn chỉ 1 vụ mỗi đêm)
  max: 0.9,               // giàu tới mấy thì thỉnh thoảng vẫn có một đêm yên
  lampMul: 0.8, lampMax: 3,  // mỗi đèn lồng (tính tối đa 3 cái) làm trộm ngại hơn
  fenceMul: 0.85,         // vườn có hàng rào thấp
  dogMul: 0.6,            // chó đang canh nhà (trưởng thành, no và vui)
  ripeNeed: 3,            // thằng Tèo chỉ tới khi có ≥ 3 ô chín
  eggNeed: 3,             // Tí Sún chỉ tới khi có ≥ 3 trứng dưới đất (trứng trong bụi cũng tính)
  eggTake: [2, 3],        // mỗi vụ Tí Sún ôm đi mấy quả
  eggStealMs: 12_000,     // Tí Sún lục chừng này rồi mới ôm trứng chạy
  civetCatchMs: 18_000,   // chồn hương rình chừng này rồi mới tha con vật đi
  arriveSpan: 0.6,        // vụ trộm rơi vào khoảng đầu đêm (phần của đêm)
  stealthPerCatch: 0.85,  // thằng Tèo bị bắt mỗi lần lại sắm thêm đồ: bán kính chó phát hiện ×0.85
  stealthMin: 0.5,        // lặng lẽ nhất cũng chỉ tới mức này
  torchAt: 1, shoesAt: 3, // bị bắt 1 lần mua đèn pin, 3 lần mua giày êm
};

// ---------- Thả rông ban ngày (ADR 0013) ----------
export const FREE = {
  types: ['ga', 'vit'],       // loài được thả rông
  max: 30,                    // tối đa 30 con thả rông; con vượt giới hạn ở trong chuồng
  moveMs: [8000, 20000],      // mỗi lần đổi ô sau khoảng này
  radius: 5,                  // ô kế tiếp cách ô hiện tại tối đa 5 ô
  seedLoss: 0.05,             // 5% lần mổ ruộng mất hạt vừa gieo
  layRadius: 4,               // trứng đẻ cách con mái tối đa 4 ô
  duskAt: 0.5,                // 18h (ngày trong game bắt đầu 6h sáng): chạng vạng, gà vịt về chuồng
  strayPerDusk: [1, 3],       // chạng vạng: 1-3 con lạc ngủ ngoài (đàn nhỏ thì tối đa nửa đàn)
  stormMin: 4, stormShare: 0.4, // đêm mưa bão: ít nhất 4 con, hoặc 40% đàn
  lureRadius: 5,              // rải thóc ở cửa chuồng: con trong 5 ô chạy về
  shyRadius: 32,              // px: con lạc chạy tránh người trong khoảng 2 ô
};

// ---------- Kẻ săn mồi: chuột, diều hâu, chồn (issue 43, ADR 0004 + 0013) ----------
// Luật ở state.js quyết định theo ô và xác suất; world.js chỉ diễn hoạt. Chạy bù offline: chỉ chuột, và chuột chỉ ăn cám, trộm trứng.
export const PREDATOR = {
  minLevel: 5,                // bảo hộ người mới: dưới cấp này chưa có chuột, diều hâu, chồn
  warnMs: 10_000,             // khi online: báo 🔴 trước chừng này rồi kẻ săn mồi mới ra tay (đuổi kịp thì không ai bị hại)
  leaveMs: 6000,              // ra tay xong (hay bị đuổi) thì còn nán lại chừng này rồi biến mất
  rat: {
    max: 8,                   // tối đa 8 con chuột trong trại
    spawnPerMin: 0.02,        // ~1 con mỗi giờ nếu không ai bắt (sinh ở kho, đống rơm, máng)
    actMs: 5 * MIN,           // mỗi con chuột ra tay một lần sau chừng này
    moveMs: 6000,             // đổi ô sau chừng này
    radius: 3,                // ô kế tiếp cách ô hiện tại tối đa 3 ô
    biteChance: 0.004,        // còn cám hay trứng thì thỉnh thoảng vẫn cắn con non; hết sạch thì cắn chắc
    hurtDeadMs: 2 * HOUR,     // con non bị thương không chữa trong chừng này giờ vườn thì mất (chỉ khi đang chơi, ADR 0004)
    hurtCapMs: 1.5 * HOUR,    // chạy bù offline: vết thương nặng nhất tới mức này rồi dừng, không bao giờ gây chết
    hurtUnhappyPerMin: 2,     // con bị thương mất vui mỗi phút
  },                          // ổ chuột (state.js nestTiles): ô cạnh nhà kho, đống rơm (nhà chuồng đồng cỏ) và máng ăn
  hawk: {
    chancePerMin: 0.001,      // hiếm; chỉ ban ngày, chỉ khi có con non đang thả rông
    coverRadius: 4,           // con non trong chừng này ô quanh mái che thì diều hâu không nhắm
  },
  weasel: {
    chancePerMin: 0.004,      // chỉ trong khung giờ nửa đêm, chỉ khi có con ngủ ngoài chuồng
    from: 23, to: 2,          // khung giờ (giờ trong game) chồn mò tới
    lampMul: 0.6,             // mỗi đèn lồng trong vườn nhân xác suất chừng này (tối đa 3 cái, như thằng Tèo)
  },
  trap: {
    lure: 6,                  // chuột trong chừng này ô ngửi thấy mồi, mò tới bẫy
    exp: 3,                   // bắt được một con chuột: cộng chừng này EXP
  },
  shooExp: 2,                 // đuổi được một kẻ săn mồi
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
  medicine:   { name: 'Thuốc thú y',       kind: 'supply', price: 40, lv: 1, desc: 'Mệt: 1 liều là khỏi. Bệnh nặng: 2 liều. Nguy kịch: phải gọi bác sĩ thú y.' },
  vaccine:    { name: 'Vắc-xin thú y',     kind: 'supply', price: 60, lv: 1, desc: 'Tiêm một lần, chống bệnh khoảng 10 giờ vườn. Tiêm theo con hoặc cả chuồng.' },
  vitamin:    { name: 'Vitamin thú nuôi',  kind: 'supply', price: 35, lv: 4, desc: 'Con non, con nhỡ lớn vọt thêm nửa giai đoạn.' },
  barrow:     { name: 'Xe rùa',           kind: 'supply', price: 250, lv: 3, once: true, desc: 'Mua một lần. Chạm con vật chọn "Chở sang chuồng khác" để đưa nó sang chuồng cùng loại còn chỗ.' },
  soap:       { name: 'Xà phòng',         kind: 'supply', price: 10, lv: 1, desc: 'Tắm cho vật nuôi: sạch bong, vui hơn, ít bệnh. Mỗi lần tắm tốn 1 xà phòng và 1 nước trong bình.' },
  manure:     { name: 'Phân chuồng',       kind: 'material', price: 0, lv: 0, desc: 'Xúc ở chuồng bẩn. Hố ủ phân sẽ dùng sau.' },
  feed_ga:    { name: 'Cám gà',           kind: 'feed',   price: 6,  lv: 1, desc: 'Đổ vào máng chuồng gà (5 phần ăn) hoặc cho ăn tận tay.' },
  feed_heo:   { name: 'Cám heo',           kind: 'feed',   price: 10, lv: 3, desc: 'Thức ăn cho heo.' },
  hay:        { name: 'Cỏ khô',            kind: 'feed',   price: 8,  lv: 5, desc: 'Thức ăn cho bò và cừu.' },
  wood:       { name: 'Gỗ',               kind: 'material', price: 0, lv: 0, desc: 'Nhặt được khi dọn bụi cây trên đất mới.' },
  stone:      { name: 'Đá',               kind: 'material', price: 0, lv: 0, desc: 'Nhặt được khi đập đá trên đất mới.' },
  dogfood:    { name: 'Xương cho chó',     kind: 'feed',   price: 8,  lv: 1, desc: 'Cho chó Mực ăn để nó lớn và chịu giữ nhà.' },
  sausage:    { name: 'Xúc xích',          kind: 'feed',   price: 30, lv: 5, desc: 'Ném cho chó nhà người ta: nó mải ăn thì quên sủa 60 giây.' },
  treat:      { name: 'Bánh thưởng',       kind: 'feed',   price: 15, lv: 1, desc: 'Bánh quy hình xương để dạy lệnh cho chó. Mỗi buổi dạy tốn 1 cái.' },
  catfood:    { name: 'Cá khô cho mèo',    kind: 'feed',   price: 9,  lv: 5, desc: 'Cho mèo ăn. Đừng cho no quá: mèo no là nằm phơi nắng, không thèm săn chuột đâu.' },
  deco_scarecrow: { name: 'Bù nhìn',       kind: 'deco',   price: 150, lv: 2, desc: 'Cắm gần ruộng, quạ không dám tới.' },
  deco_flower:    { name: 'Chậu hoa',      kind: 'deco',   price: 30,  lv: 1, desc: 'Cho nông trại thêm xinh.' },
  deco_lamp:      { name: 'Đèn lồng',      kind: 'deco',   price: 90,  lv: 3, desc: 'Sáng lung linh ban đêm, trộm ngại vào hơn.' },
  deco_bench:     { name: 'Ghế đá',        kind: 'deco',   price: 70,  lv: 2, desc: 'Ngồi nghỉ chân.' },
  deco_lowfence:  { name: 'Hàng rào thấp', kind: 'deco',   price: 8,   lv: 2, desc: 'Đặt quanh khối ruộng: gà không vào được, nhưng cũng hết gà mổ sâu giúp. Bạn bước qua được.' },
  deco_rattrap:   { name: 'Bẫy chuột',     kind: 'deco',   price: 60,  lv: 5, desc: 'Đặt trong trại, bắt con chuột đi qua. Sập rồi thì phải gài lại.' },
  deco_canopy:    { name: 'Mái che sân',   kind: 'deco',   price: 180, lv: 5, desc: 'Gà con, vịt con chơi gần mái che thì diều hâu không cắp được.' },
};

// ---------- Mua đất ----------
// Dải đất dày depth ô, dài bằng cạnh hiện tại của vườn. LAND_STRIPS[n] = giá & cấp của dải thứ n+1 đã mua (tăng dần).
export const LAND_STRIP = { depth: 4 };
export const LAND_STRIPS = [500, 800, 1200, 1700, 2400, 3300, 4500, 6000, 8000, 10500, 14000, 18000, 23000, 29000, 36000, 44000, 53000, 63000, 75000, 90000]
  .map((price, i) => ({ price, lv: Math.min(40, 5 + 2 * i) }));
export const DIR_NAME = { N: 'Bắc', S: 'Nam', E: 'Đông', W: 'Tây' };
// Bụi, đá rải trên dải mới: xác suất mỗi ô (theo băm toạ độ, không ngẫu nhiên). Dọn tay: tốn thể lực STAMINA.cost[cost], được qty món item.
export const CLUTTER_RATE = { bush: 0.16, rock: 0.09 };
// Cây trong vườn (cây nền hoặc cây chắn đường): chặt tay, tốn thể lực, cây biến mất ngay (không để gốc)
export const CHOP = { name: 'Cây', act: 'Chặt cây', icon: '🪓', item: 'wood', qty: 3, cost: 'chopTree' };
export const CLUTTER = {
  bush: { name: 'Bụi cây', act: 'Dọn bụi', icon: '🌿', item: 'wood',  qty: 2, cost: 'clearBush' },
  rock: { name: 'Tảng đá', act: 'Đập đá', icon: '⛏️', item: 'stone', qty: 2, cost: 'breakRock' },
};

// Nông sản & sản phẩm bán ở kho.
export const PRODUCTS = {
  trung: { name: 'Trứng gà', price: 14 },
  trung_phoi: { name: 'Trứng có phôi', price: 14 },   // đã soi: nở được trong ổ ấp
  trung_vit: { name: 'Trứng vịt', price: 18 },
  trung_vit_phoi: { name: 'Trứng vịt có phôi', price: 18 },   // đã soi: nở thành vịt con trong ổ ấp
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
  cathouse:   { cap: [1, 2, 3],   lv: 5, limit: [[5, 1], [9, 2]],         up: [250, 600],   upLv: [5, 7], extra3: ['bed', 'toy'] },
};
// Công trình đặt được ở chế độ xây dựng mà không phải chuồng có rào (nhà mèo): giá xây
export const BUILD_PRICES = { cathouse: 350 };
export const PEN_REFUND = 0.5;   // phá bỏ chuồng trống: hoàn tỉ lệ này của giá xây + giá các lần nâng cấp
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
  { id: 'orders10',   name: 'Giao hàng tận tâm', desc: 'Giao 10 đơn hàng',      stat: 'orders',   goal: 10,  coins: 200 },
  { id: 'thief3',     name: 'Bắt trộm giỏi',    desc: 'Bắt thằng Tèo 3 lần',    stat: 'thieves',  goal: 3,   coins: 150 },
  { id: 'crow10',     name: 'Khắc tinh của quạ', desc: 'Đuổi 10 con quạ',       stat: 'crows',    goal: 10,  coins: 80 },
  { id: 'rich5000',   name: 'Đại gia làng',     desc: 'Kiếm tổng cộng 5.000 xu', stat: 'earned',  goal: 5000, coins: 500 },
  // Thành tựu xã hội (issue 32): badge = huy hiệu pixel art riêng (SPR2.badges[badge].on / .off)
  // helps: số việc mình giúp vườn bạn · robStreak: chuỗi trộm chưa bị chó đớp (bị đớp về 0) · chased: chó nhà mình đớp được bao nhiêu kẻ trộm
  { id: 'helper50',   name: 'Hàng xóm tốt bụng', desc: 'Giúp vườn bạn 50 lần',  stat: 'helps',    goal: 50,  coins: 300, badge: 'helper' },
  { id: 'robber30',   name: 'Siêu trộm',        desc: 'Trộm 30 lần liền không bị chó đớp', stat: 'robStreak', goal: 30, coins: 300, badge: 'robber' },
  { id: 'guard20',    name: 'Vườn bất khả xâm phạm', desc: 'Chó đuổi được 20 kẻ trộm', stat: 'chased', goal: 20, coins: 300, badge: 'guard' },
];

// ---------- Khách giúp vườn và trộm vườn (issue 28, 30, ADR 0012) ----------
// helpMax: mỗi KHÁCH giúp một vườn tối đa bấy nhiêu việc mỗi ngày ngoài đời · helpHostMax: cả vườn nhận tối đa bấy nhiêu việc giúp từ mọi khách · helpCoins/helpExp: thưởng cho khách mỗi việc
// logMax: nhật ký khách trong bản lưu chủ giữ bấy nhiêu việc gần nhất (cũng là nơi nhớ mã thao tác đã áp dụng)
// stealLv: cấp tối thiểu để đi trộm, cũng là cấp tối thiểu để vườn bị trộm (bảo vệ người mới)
// stealPct: mỗi vụ trộm lấy tối đa bấy nhiêu sản lượng còn lại của ô hay con đó (mỗi người một lần mỗi ô hay mỗi con)
// dayPct: mỗi vườn mỗi ngày ngoài đời mất tối đa bấy nhiêu tổng giá trị đồ chín · thể lực mỗi vụ: STAMINA.cost.steal
// robShowMs: chỗ vừa bị trộm là chỗ gấp 🔴 (mũi tên chỉ hướng) trong chừng này, giờ ngoài đời (issue 32)
export const GUEST = { helpMax: 10, helpHostMax: 30, helpCoins: 3, helpExp: 2, logMax: 60, stealLv: 5, stealPct: 0.25, dayPct: 0.3, robShowMs: 15_000 };
// Bốn việc giúp: động từ và đơn vị để ghép câu cảm ơn ("Lan đã tưới 3 ô giúp bạn")
export const HELP_JOBS = {
  water: { verb: 'tưới', unit: 'ô', icon: '💧', label: 'Tưới giúp' },
  weed: { verb: 'nhổ cỏ', unit: 'ô', icon: '🌿', label: 'Nhổ cỏ giúp' },
  catch: { verb: 'bắt sâu', unit: 'ô', icon: '🤏', label: 'Bắt sâu giúp' },
  shoo: { verb: 'đuổi', unit: 'con quạ', icon: '🪶', label: 'Đuổi quạ giúp' },
};

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
  levelup: 'Lên cấp', order: 'Đơn hàng mới', help: 'Khách giúp vườn', gate: 'Quà và lời nhắn ở cổng',
  guard: 'Chó canh khách lạ', visit: 'Bạn bè ghé',
  old: 'Con vật sắp già, ra đi', stray: 'Con lạc ngủ ngoài', ill: 'Con vật mệt',
  pest: 'Chuột ăn cám, trộm trứng', birth: 'Vật nuôi sinh con',
  parcel: 'Hàng đặt online đã tới',
};
const cropN = id => (CROPS[id]?.name ?? id).toLowerCase();
const animalN = a => String(a).toLowerCase();
const helpN = act => HELP_JOBS[act]?.verb ?? 'làm';
// Giờ ngoài đời (giờ Việt Nam) của một vụ trộm, kiểu "2h sáng" — dùng trong nhật ký vườn (issue 30)
export function hourText(t) {
  const h = new Date((Number(t) || 0) + 7 * 3600_000).getUTCHours();   // giờ Việt Nam (clock.js REAL_TZ_MS)
  return `${h % 12 || 12}h ${h < 4 ? 'đêm' : h < 11 ? 'sáng' : h < 13 ? 'trưa' : h < 18 ? 'chiều' : h < 22 ? 'tối' : 'đêm'}`;
}
export const EVENT_LEVEL = {
  sick:      { level: 'important', cat: 'ill', group: e => 'sick:' + e.animal, label: 'Con vật mệt', text: (n, e) => `${n} con ${animalN(e.animal)} bị mệt 🤒` },
  eating:    { level: 'urgent', group: e => 'eating:' + e.kind, label: 'Quạ, trộm đang ăn cây' },
  ripe:      { level: 'important', cat: 'ripe', group: e => 'ripe:' + e.crop, label: 'Cây chín', text: (n, e) => `${n} ô ${cropN(e.crop)} đã chín 🌾` },
  rotten:    { level: 'important', cat: 'spoil', group: e => 'rotten:' + e.crop, label: 'Cây héo', text: (n, e) => `${n} ô ${cropN(e.crop)} đã héo 🥀` },
  dead:      { level: 'important', cat: 'spoil', group: e => 'dead:' + e.crop, label: 'Cây chết', text: (n, e) => `${n} ô ${cropN(e.crop)} đã chết 💀` },
  hungry:    { level: 'important', cat: 'hungry', group: e => 'hungry:' + e.animal, label: 'Con vật đói', text: (n, e) => `${n} con ${animalN(e.animal)} đang đói` },
  crow:      { level: 'important', cat: 'loss', group: () => 'loss:crow', label: 'Quạ ăn mất cây', text: (n, e) => n > 1 ? `Quạ đã ăn mất ${n} cây 😢` : `Quạ đã ăn mất ${(e.name ?? 'cây').toLowerCase()} 😢` },
  thief:     { level: 'important', cat: 'loss', group: () => 'loss:thief', label: 'Trộm hái mất cây', text: (n, e) => n > 1 ? `Thằng Tèo đã hái trộm ${n} cây 😢` : `Thằng Tèo đã hái trộm ${(e.name ?? 'cây').toLowerCase()} 😢` },
  tisun:     { level: 'important', cat: 'loss', group: () => 'loss:tisun', label: 'Tí Sún trộm trứng', text: (n, e) => `Tí Sún lấy trộm mất ${e.n ?? n} quả trứng 😢` },
  civet:     { level: 'important', cat: 'loss', group: () => 'loss:civet', label: 'Chồn hương bắt con vật', text: (n, e) => `Chồn hương tha mất ${n} con ${animalN(e.animal)} 😿` },
  levelup:   { level: 'important', cat: 'levelup', group: () => 'levelup', label: 'Lên cấp', text: (n, e) => `Lên cấp ${e.level}! Thưởng ${e.level * 20} xu 🎉` },
  order:     { level: 'important', cat: 'order', group: () => 'order', label: 'Đơn hàng mới', text: n => n > 1 ? `${n} đơn hàng mới 📋` : 'Hàng xóm có đơn hàng mới 📋' },
  helped:    { level: 'important', cat: 'help', group: e => `helped:${e.by}:${e.act}`, label: 'Khách giúp vườn', text: (n, e) => `${e.by} đã ${helpN(e.act)} ${n} ${HELP_JOBS[e.act]?.unit ?? 'việc'} giúp bạn 🙏` },
  stolen:    { level: 'urgent', group: e => `stolen:${e.by}:${e.item}`, label: 'Có người sang trộm', text: (n, e) => `${e.by} đã trộm ${e.qty * n} ${itemName(e.item).toLowerCase()} lúc ${hourText(e.at)} 😤` },
  gift:      { level: 'important', cat: 'gate', group: () => 'gate:gift', label: 'Có quà ở cổng', text: (n, e) => n > 1 ? `${n} món quà mới trong hộp quà ở cổng 🎁` : `${e.name} tặng bạn ${e.qty} ${itemName(e.item).toLowerCase()} 🎁` },
  note:      { level: 'important', cat: 'gate', group: () => 'gate:note', label: 'Lời nhắn mới ở sổ lưu bút', text: (n, e) => n > 1 ? `${n} lời nhắn mới trong sổ lưu bút 📖` : `${e.name} vừa ký sổ lưu bút của bạn 📖` },
  // bạn bè ghé vườn mình (issue 26, 32): tin từ server, gộp theo người
  visited:   { level: 'important', cat: 'visit', group: e => 'visit:' + e.by, label: 'Bạn bè ghé', text: (n, e) => `${e.by} vừa ghé thăm vườn của bạn 👋` },
  // chó canh khách lạ (issue 31): sủa là báo gấp 🔴 kèm mũi tên; đớp được và bị ném xúc xích thì toast 🟡
  barked:    { level: 'urgent', group: () => 'barked', label: 'Chó sủa báo có người lạ', text: (n, e) => `${e.dog} đang sủa ở ${e.where}! 🐕` },
  bitten:    { level: 'important', cat: 'guard', group: e => 'bitten:' + e.by, label: 'Chó đớp được khách lạ', text: (n, e) => `${e.dog} đã đớp được ${e.by}, phạt ${e.fine} xu 🐕` },
  sausaged:  { level: 'important', cat: 'guard', group: e => 'sausaged:' + e.by, label: 'Khách ném xúc xích cho chó', text: (n, e) => (e.ate ? `${e.by} ném xúc xích, ${e.dog} mải ăn quên sủa 🌭` : `${e.by} ném xúc xích nhưng ${e.dog} không thèm 🌭`) },
  oldSoon:   { level: 'important', cat: 'old', group: e => 'oldSoon:' + e.animal, label: 'Con vật sắp già', text: (n, e) => `${n} con ${animalN(e.animal)} sắp già, chuẩn bị hoặc bán đi nhé 👵` },
  passed:    { level: 'important', cat: 'old', group: e => 'passed:' + e.animal, label: 'Con vật già ra đi', text: (n, e) => `${n} con ${animalN(e.animal)} đã già và ra đi thanh thản 😇` },
  stray:     { level: 'important', cat: 'stray', group: e => 'stray:' + e.animal, label: 'Con lạc chưa về chuồng', text: (n, e) => `${n} con ${animalN(e.animal)} lạc, chưa về chuồng 💤` },
  predator:  { level: 'urgent', group: e => 'pred:' + e.id, label: 'Kẻ săn mồi mò vào trại' },
  hurt:      { level: 'urgent', group: e => 'hurt:' + e.id, label: 'Con non bị chuột cắn' },
  taken:     { level: 'important', cat: 'loss', group: e => 'taken:' + e.pred, label: 'Kẻ săn mồi bắt mất con vật', text: (n, e) => `${e.pred === 'hawk' ? 'Diều hâu' : 'Chồn'} đã bắt mất ${n} con ${animalN(e.animal)} 😢` },
  ratFeed:   { level: 'important', cat: 'pest', group: () => 'ratFeed', label: 'Chuột ăn cám', text: n => `Chuột đã ăn mất ${n} phần cám 🐀` },
  ratEgg:    { level: 'important', cat: 'pest', group: () => 'ratEgg', label: 'Chuột trộm trứng', text: n => `Chuột đã trộm mất ${n} quả trứng 🐀` },
  trapped:   { level: 'info', group: () => 'trapped', label: 'Bẫy chuột sập' },
  catRat:    { level: 'info', group: () => 'catRat', label: 'Mèo bắt được chuột' },
  catTrophy: { level: 'info', group: e => 'catTrophy:' + e.id, label: 'Mèo mang chuột tới khoe' },
  catSpat:   { level: 'info', group: () => 'catSpat', label: 'Mèo với chó cãi nhau' },
  catHerd:   { level: 'info', group: () => 'catHerd', label: 'Mèo lùa một con về chuồng' },
  dogBowl:   { level: 'info', group: () => 'dogBowl', label: 'Chó tự ra bát ăn' },
  shooed:    { level: 'info', group: e => 'shooed:' + e.pred, label: 'Đã đuổi kẻ săn mồi' },
  sickSevere:   { level: 'urgent', group: e => 'sick2:' + e.animal, label: 'Con vật bệnh nặng' },
  sickCritical: { level: 'urgent', group: e => 'sick3:' + e.animal, label: 'Con vật nguy kịch' },
  died:      { level: 'important', cat: 'old', group: e => 'died:' + e.animal, label: 'Con vật mất vì bệnh', text: (n, e) => `${n} con ${animalN(e.animal)} đã mất vì bệnh 😇` },
  cured:     { level: 'info', group: e => 'cured:' + e.animal, label: 'Con vật khỏi bệnh' },
  grave:     { level: 'none', group: e => 'grave:' + e.id, label: 'Ngôi mộ mới' },
  egg:       { level: 'info', group: () => 'egg', label: 'Gà đẻ trứng' },
  born:      { level: 'important', cat: 'birth', group: e => 'born:' + e.kind, label: 'Con vật chào đời', text: (n, e) => `${n} ${animalN(e.animal)} con mới chào đời 🐣` },
  cockcrow:  { level: 'none', group: () => 'cockcrow', label: 'Gà trống gáy' },
  guard:     { level: 'info', group: e => 'guard:' + e.who, label: 'Chó đuổi quạ, trộm' },
  trick:     { level: 'info', group: e => 'trick:' + e.trick, label: 'Chó học xong một lệnh' },
  dogHerd:   { level: 'info', group: () => 'dogHerd', label: 'Chó lùa đàn về chuồng' },
  wallow:    { level: 'none', group: e => 'wallow:' + e.id, label: 'Heo, bò lăn bùn' },
  bathed:    { level: 'info', group: e => 'bathed:' + e.id, label: 'Đã tắm cho vật nuôi' },
  vaccinated: { level: 'info', group: e => 'vaccinated:' + e.id, label: 'Đã tiêm vắc-xin' },
  mucked:    { level: 'info', group: e => 'mucked:' + e.pen, label: 'Đã xúc phân chuồng' },
  shipped:   { level: 'info', group: () => 'shipped', label: 'Lái buôn lấy hàng' },
  delivered: { level: 'important', cat: 'parcel', group: () => 'delivered', label: 'Hàng đặt online tới kho', text: n => (n > 1 ? `Hàng đã giao tới kho (${n} chuyến) 📦` : 'Hàng đã giao tới kho 📦') },
  log:       { level: 'info', group: () => 'log', label: 'Nhật ký' },
  toast:     { level: 'direct', group: e => 'toast:' + e.text, label: 'Thông báo của luật chơi' },
  achievement: { level: 'direct', group: e => 'achievement:' + e.id, label: 'Thành tựu' },
  fx:        { level: 'none', group: () => 'fx', label: 'Hiệu ứng chữ bay' },
  sound:     { level: 'none', group: () => 'sound', label: 'Âm thanh' },
  spawn:     { level: 'none', group: () => 'spawn', label: 'Sinh vật xuất hiện' },
};

// ---------- Làng real-time (issue 25) ----------
// hz: vị trí gửi/phát tối đa mấy lần mỗi giây · crowd: quá chừng này người (tính cả mình) thì người ở xa chỉ hiện tên mờ
// delayMs: vẽ người khác trễ chừng này để nội suy mượt · chatMs/emoteMs: bong bóng chat, biểu cảm hiện bao lâu
export const LIVE = { hz: 6, crowd: 12, delayMs: 300, chatMs: 4000, emoteMs: 2500 };
// Câu chat nhanh có sẵn: server chỉ nhận đúng các câu này
export const QUICK_CHAT = ['Chào cả làng!', 'Cảm ơn nhé!', 'Hẹn gặp lại!', 'Ghé vườn mình chơi nha!', 'Đi chợ không?', 'Tạm biệt!'];
export const EMOTES = ['👋', '❤️', '😂', '😡'];
// Quà và sổ lưu bút ở cổng (issue 29): perGift = số món tối đa mỗi lần tặng · boxMax = số quà đang chờ tối đa ở một cổng
// (mỗi lần tặng là một quà) · noteMax = số ký tự tối đa một dòng lưu bút
export const GIFT = { perGift: 10, boxMax: 12, noteMax: 80 };
