// Chuyển bản lưu cũ lên phiên bản mới. Mỗi hàm chuyển đúng một bậc (v1→v2, sau này v2→v3...).
// Thuần JS, không ngẫu nhiên, không đọc đồng hồ: cùng bản cũ luôn ra cùng bản mới.
import { TS, MAP, V1, START_FARM, FIELD_SIZE } from './layout.js';

export const SAVE_VERSION = 2;

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

const STEPS = { 1: v1to2 };
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
  // Công trình đã bỏ khỏi game (sạp hàng giờ nằm ở chợ trong làng), cả ở vườn v2 đã lưu từ trước
  if (s.farm.ents.some(e => RETIRED.includes(e.kind))) {
    s.farm.ents = s.farm.ents.filter(e => !RETIRED.includes(e.kind));
    s.farm.rev = (s.farm.rev || 0) + 1;
  }
  return s;
}
