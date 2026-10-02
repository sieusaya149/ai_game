// Chuyển bản lưu cũ lên phiên bản mới. Mỗi hàm chuyển đúng một bậc (v1→v2, sau này v2→v3...).
// Thuần JS, không ngẫu nhiên, không đọc đồng hồ: cùng bản cũ luôn ra cùng bản mới.
import { TS, MAP, V1, START_FARM, FIELD_SIZE } from './layout.js';
import { ANIMALS, CROPS, stageStart, weightAt } from './data.js';

export const SAVE_VERSION = 4;

// Hình dạng một con vật từ v3 (SPEC.md "Con vật"). Lát sau cần trường mới thì thêm giá trị mặc định ở đây,
// không cần tăng phiên bản: fillAnimal chạy cho mọi con vật mỗi lần nạp bản lưu và khi sinh con mới.
export const animalDefaults = a => ({
  name: ANIMALS[a.type]?.name ?? '',
  sex: a.id % 2 ? 'm' : 'f',            // 'f' cái · 'm' đực
  stage: 'non', age: 0,                 // giai đoạn · tuổi = giờ vườn đã sống (ms)
  hunger: 100, happy: 60,
  sick: 0, sickSince: 0, starvingSince: 0,   // sick: 0 khỏe · 1 mệt · 2 bệnh nặng · 3 nguy kịch
  sickMs: 0, dose: 0, vaccUntil: 0,     // tiến triển bệnh (giờ vườn) · liều thuốc đã uống ở giai đoạn Bệnh nặng · vắc-xin hết hạn lúc simMs này
  dirty: 0,                             // độ dơ 0..100
  hurt: false, hurtMs: 0,               // con non bị chuột cắn (issue 43): vết thương theo giờ vườn, chữa bằng thuốc thú y
  bond: 2, bondXp: 0,                   // độ thân ❤️1..5 · điểm ẩn trong tim hiện tại (BOND.perHeart)
  weight: weightAt(a.type, a.stage ?? 'non'),   // kg
  mom: null, dad: null,                 // { id, name } của cha mẹ nếu đẻ trong trại
  pen: null,                            // id thực thể chuồng đang ở (xếp tự động khi null, xem settlePens ở state.js)
  stray: false,                         // chạng vạng chưa về chuồng, ngủ ngoài tới sáng (issue 42)
  tile: null,                          // { c, r } ô đang đứng khi thả rông (ADR 0013); null = trong chuồng
  nextProduct: 0, ready: false, pregnant: false, dueAt: 0,
  mate: null,                           // { id, name } con đực đã làm cha lứa đang mang (nái/bò/cừu cái)
});
export function fillAnimal(a) {
  for (const [k, v] of Object.entries(animalDefaults(a))) if (a[k] === undefined) a[k] = v;
  return a;
}

const rectTiles = rects => rects.flatMap(([c, r, w, h]) => {
  const out = [];
  for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) out.push([x, y]);
  return out;
});

// Bố cục vườn mới (dùng chung cho createGame). Trả về { farm, plotCount, nextId }.
export function newFarm(nextId) {
  const ents = START_FARM.ents.map(e => ({ id: nextId++, ...e }));
  let plots = 0;
  for (const e of ents) if (e.kind === 'field') e.plots = Array.from({ length: FIELD_SIZE * FIELD_SIZE }, () => plots++);
  return {
    farm: { rev: 1, mw: MAP.mw, mh: MAP.mh, owned: { ...START_FARM.owned }, paths: rectTiles(START_FARM.paths), ents },
    plotCount: plots, nextId,
  };
}

function v1to2(s) {
  const ox = V1.OX, oy = V1.OY, dx = ox * TS, dy = oy * TS;
  const shift = o => { if (o && o.x != null) { o.x += dx; o.y += dy; } };
  let id = s.nextId ?? 1;
  const ents = V1.ents.map(e => ({ id: id++, ...e, c: e.c + ox, r: e.r + oy }));
  // ruộng 6x6 cũ thành 4 khối 3x3 ở đúng chỗ, giữ nguyên số thứ tự ô
  for (let by = 0; by < 2; by++) for (let bx = 0; bx < 2; bx++) {
    const plots = [];
    for (let r = 0; r < FIELD_SIZE; r++) for (let c = 0; c < FIELD_SIZE; c++) plots.push((by * 3 + r) * V1.GRID + bx * 3 + c);
    ents.push({ id: id++, kind: 'field', c: V1.field.c + bx * 3 + ox, r: V1.field.r + by * 3 + oy, plots });
  }
  // đồ trang trí: đặt vào ô dưới chân chỗ cũ
  for (const d of s.decos ?? []) ents.push({ id: id++, kind: 'deco', item: d.kind, c: Math.floor(d.x / TS) + ox, r: Math.floor(d.y / TS) + oy });
  const o = V1.owned;
  const farm = {
    rev: 1, mw: MAP.mw, mh: MAP.mh, owned: { c: o.c + ox, r: o.r + oy, w: o.w, h: o.h },
    paths: rectTiles(V1.paths).map(([c, r]) => [c + ox, r + oy]), ents,
  };
  shift(s.player);
  for (const a of s.animals ?? []) shift(a);
  shift(s.dog);
  for (const e of s.eggs ?? []) shift(e);
  for (const p of s.poops ?? []) shift(p);
  const out = { ...s, v: 2, farm, nextId: id, threats: [] };
  delete out.decos;
  out.migratedFrom = 1;
  return out;
}

// Con vật đổi hình dạng: 2 giai đoạn (adult) thành 4 giai đoạn theo giờ vườn, thêm giới tính, độ thân, độ dơ, bệnh theo mức...
// Con trưởng thành cũ thành "Trưởng thành" ở đầu giai đoạn, con non thành "Non". Giới tính theo id (chẵn cái, lẻ đực).
function v2to3(s) {
  if (s.animals != null && !Array.isArray(s.animals)) throw new Error('Bản lưu v2 hỏng danh sách con vật');
  const animals = (s.animals ?? []).map(({ adult, ...a }) => {
    if (!ANIMALS[a.type] || !Number.isFinite(a.id)) throw new Error('Bản lưu v2 có con vật lạ');
    const stage = adult ? 'truong' : 'non';
    return fillAnimal({ ...a, stage, age: stageStart(a.type, stage), sex: a.id % 2 ? 'm' : 'f', sick: a.sick ? 1 : 0, bond: 2, dirty: 0 });
  });
  const out = { ...s, v: 3, animals };
  if (s.dog) {
    const { adult, ...dog } = s.dog, stage = adult ? 'truong' : 'non';
    out.dog = { ...dog, stage, age: stageStart('cho', stage) };
  }
  return out;
}

// ---------- Hình dạng v4 (Phase 3, SPEC.md "Bản lưu v4") ----------
// Chỗ để sẵn cho cả Phase 3. Như animalDefaults: lát sau cần trường mới thì thêm mặc định ở đây, không cần tăng phiên bản.
export const cropQuality = () => ({ dry: false, bugMax: 0, hand: false });   // theo dõi chất lượng vụ (★, issue 52); bón phân = crop.fert có sẵn
export const fieldUpgrades = () => ({ drip: false, spray: false, rich: false, glass: false });   // nâng cấp theo khối ruộng (issue 58, 60)
const isObj = o => o != null && typeof o === 'object' && !Array.isArray(o);
// Bù mặc định v4 cho bản lưu (mọi lần nạp) và vườn mới (createGame). Không ghi đè giá trị đã có.
export function fillSave(s) {
  s.mastery = isObj(s.mastery) ? s.mastery : {};
  for (const id of Object.keys(CROPS)) s.mastery[id] ??= { lv: 1, n: 0 };   // cây thêm sau cũng có chỗ
  s.water = isObj(s.water) ? s.water : {};
  s.water.level ??= 0;
  for (const e of s.farm?.ents ?? []) {
    if (e.kind === 'well') e.lv ??= 1;
    if (e.kind === 'field') e.up = { ...fieldUpgrades(), ...e.up };
  }
  for (const p of s.plots ?? []) {
    p.mulch ??= false;
    if (p.crop) p.crop.q = { ...cropQuality(), ...p.crop.q };
  }
  return s;
}

// Phase 3: thêm chỗ cho thành thạo, chất lượng ★, giếng có cấp, bồn nước, nâng cấp khối ruộng, rơm phủ.
// Nông sản cũ giữ nguyên khóa = ★1 (data.js starKey). Thành thạo bắt đầu cấp 1: thống kê v3 chỉ có tổng số lần thu hoạch
// (stats.harvests, giữ nguyên), không chia được theo loại cây, nên số lần của từng cây bắt đầu từ 0.
function v3to4(s) {
  if (!Array.isArray(s.plots)) throw new Error('Bản lưu v3 hỏng ruộng');
  for (const k of ['inv', 'basket']) if (s[k] != null && !isObj(s[k])) throw new Error('Bản lưu v3 hỏng kho');
  for (const p of s.plots) if (p?.crop && !CROPS[p.crop.id]) throw new Error('Bản lưu v3 có cây lạ');
  return fillSave({ ...s, v: 4 });
}

const STEPS = { 1: v1to2, 2: v2to3, 3: v3to4 };
const RETIRED = ['shop'];

// Đưa một bản lưu bất kỳ (đã parse) lên SAVE_VERSION. Bản không hợp lệ thì ném lỗi.
export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.v)) throw new Error('Bản lưu không đúng định dạng');
  if (raw.v === 1 && !Array.isArray(raw.plots)) throw new Error('Bản lưu v1 thiếu ruộng');
  let s = structuredClone(raw);
  while (s.v < SAVE_VERSION) {
    const step = STEPS[s.v];
    if (!step) throw new Error(`Không chuyển được bản lưu phiên bản ${s.v}`);
    s = step(s);
  }
  if (s.v !== SAVE_VERSION || !s.farm) throw new Error('Bản lưu không đúng định dạng');
  s.basket ??= {};   // bản lưu chưa có giỏ: đồ cũ nằm ở kho (inv), giỏ trống
  for (const a of s.animals ?? []) fillAnimal(a);   // trường con vật thêm sau v3
  fillSave(s);                                      // trường Phase 3 thêm sau v4
  // Công trình đã bỏ khỏi game (sạp hàng giờ nằm ở chợ trong làng), cả ở vườn v2 đã lưu từ trước
  if (s.farm.ents.some(e => RETIRED.includes(e.kind))) {
    s.farm.ents = s.farm.ents.filter(e => !RETIRED.includes(e.kind));
    s.farm.rev = (s.farm.rev || 0) + 1;
  }
  return s;
}
