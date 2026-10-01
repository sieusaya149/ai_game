// Bản đồ nông trại (nhìn từ trên xuống). Thuần dữ liệu, không đụng DOM: dùng được cả trong Node để test.
import { GRID } from './data.js';

export const TS = 16;            // 1 ô = 16x16 điểm ảnh
export const MW = 34, MH = 27;   // kích thước bản đồ theo ô
export const W = MW * TS, H = MH * TS;

export const GROUND = { GRASS: 0, ROAD: 1, FIELD: 2, PEN: 3, MUD: 4 };

// Ruộng 6x6: ô số idx nằm ở cột FIELD.c + idx % 6, hàng FIELD.r + idx / 6.
export const FIELD = { c: 21, r: 4 };
export const plotTile = idx => ({ c: FIELD.c + idx % GRID, r: FIELD.r + Math.floor(idx / GRID) });
export const plotCenter = idx => { const { c, r } = plotTile(idx); return { x: c * TS + 8, y: r * TS + 8 }; };
export const plotAt = (c, r) => {
  const dc = c - FIELD.c, dr = r - FIELD.r;
  return dc >= 0 && dr >= 0 && dc < GRID && dr < GRID ? dr * GRID + dc : -1;
};

// Chuồng: rect là khung hàng rào (tính theo ô), area là vùng con vật đi lang thang (điểm ảnh).
export const PENS = {
  chicken: {
    name: 'Chuồng gà', rect: { c: 2, r: 16, w: 13, h: 9 }, gates: [[8, 16], [9, 16]],
    trough: { c: 3, r: 17, x: 64, y: 286 }, area: { x: 54, y: 298, w: 164, h: 84 },
  },
  pig: {
    name: 'Chuồng heo', rect: { c: 18, r: 16, w: 6, h: 9 }, gates: [[20, 16]],
    trough: { c: 21, r: 17, x: 352, y: 286 }, area: { x: 310, y: 298, w: 52, h: 84 },
  },
  pasture: {
    name: 'Đồng cỏ bò cừu', rect: { c: 25, r: 16, w: 8, h: 9 }, gates: [[28, 16]],
    trough: { c: 30, r: 17, x: 496, y: 286 }, area: { x: 422, y: 298, w: 84, h: 84 },
  },
};

// Công trình: sprite vẽ ở (x, y) góc trên-trái, foot là các ô chắn đường, at là điểm đứng gần để tương tác.
export const BUILDINGS = [
  { id: 'house',   name: 'Nhà',          sprite: 'house',     x: 40,  y: 26,  foot: { c: 3,  r: 3,  w: 4, h: 4 }, at: { x: 80,  y: 122 } },
  { id: 'board',   name: 'Bảng đơn hàng', sprite: 'board',    x: 124, y: 104, foot: { c: 8,  r: 7,  w: 1, h: 1 }, at: { x: 136, y: 136 } },
  { id: 'shed',    name: 'Nhà kho',      sprite: 'shed',      x: 160, y: 54,  foot: { c: 10, r: 4,  w: 4, h: 3 }, at: { x: 192, y: 122 } },
  { id: 'well',    name: 'Giếng nước',   sprite: 'well',      x: 144, y: 152, foot: { c: 9,  r: 10, w: 1, h: 1 }, at: { x: 152, y: 184 } },
  { id: 'doghouse', name: 'Chuồng chó',  sprite: 'doghouse',  x: 26,  y: 152, foot: { c: 2,  r: 10, w: 1, h: 1 }, at: null },
  { id: 'shop',    name: 'Sạp hàng',     sprite: 'shop',      x: 464, y: 78,  foot: { c: 29, r: 5,  w: 3, h: 3 }, at: { x: 488, y: 136 } },
  { id: 'coop',    name: 'Ổ ấp trứng',   sprite: 'coop',      x: 177, y: 260, foot: { c: 11, r: 17, w: 2, h: 1 }, at: { x: 192, y: 298 } },
  { id: 'gate',    name: 'Cổng',         sprite: 'signboard', x: 290, y: 394, foot: { c: 18, r: 25, w: 3, h: 1 }, at: { x: 272, y: 410 } },
];
// Máng ăn cũng là vật chắn (2 ô).
export const TROUGHS = Object.entries(PENS).map(([pen, p]) => ({ pen, c: p.trough.c, r: p.trough.r, w: 2 }));

export const SPAWN = { x: 80, y: 130 };
export const DOG_HOME = { x: 40, y: 186 };
export const GATE_IN = { x: 272, y: 424 };   // chỗ NPC (trộm) đi vào
export const MUD = { x: 312, y: 340, w: 40, h: 22 }; // vũng bùn trong chuồng heo (trang trí)

// Cây to viền bản đồ: gốc cây (điểm chạm đất) theo điểm ảnh.
export const TREES = [
  ...Array.from({ length: 18 }, (_, i) => ({ x: i * 32 + 4, y: 30 })),
  ...Array.from({ length: 12 }, (_, i) => ({ x: 6, y: 62 + i * 30 })),
  ...Array.from({ length: 12 }, (_, i) => ({ x: W - 6, y: 62 + i * 30 })),
  { x: 232, y: 190 }, { x: 250, y: 60 }, { x: 434, y: 196 },
];
export const BUSHES = Array.from({ length: MW }, (_, i) => i).filter(i => i !== 16 && i !== 17).map(i => ({ x: i * TS + 8, y: H - 1 }));

const idx = (c, r) => r * MW + c;

// Dựng lưới: loại nền từng ô, ô nào chắn đường, và danh sách hàng rào để vẽ.
export function buildGrid() {
  const ground = new Uint8Array(MW * MH), solid = new Uint8Array(MW * MH), fences = [];
  const fill = (c, r, w, h, t) => { for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) ground[idx(x, y)] = t; };
  const block = (c, r, w = 1, h = 1) => { for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) solid[idx(x, y)] = 1; };

  // Đường đất
  fill(16, 2, 2, MH - 2, GROUND.ROAD);  // trục dọc ra cổng
  fill(1, 13, MW - 2, 2, GROUND.ROAD);  // trục ngang
  fill(4, 7, 2, 6, GROUND.ROAD);        // từ cửa nhà
  fill(23, 11, 2, 2, GROUND.ROAD);      // vào ruộng
  fill(30, 8, 1, 5, GROUND.ROAD);       // tới sạp hàng
  fill(8, 15, 2, 1, GROUND.ROAD);       // cổng chuồng gà
  fill(20, 15, 1, 1, GROUND.ROAD);      // cổng chuồng heo
  fill(28, 15, 1, 1, GROUND.ROAD);      // cổng đồng cỏ
  fill(8, 7, 2, 1, GROUND.ROAD);        // trước bảng đơn hàng
  fill(9, 11, 1, 1, GROUND.ROAD);       // trước giếng

  // Nền ruộng & chuồng
  fill(FIELD.c, FIELD.r, GRID, GRID, GROUND.FIELD);
  fill(3, 17, 11, 7, GROUND.PEN);
  fill(19, 17, 4, 7, GROUND.MUD);

  const fenceRect = ({ c, r, w, h }, gates = []) => {
    const isGate = (x, y) => gates.some(([gx, gy]) => gx === x && gy === y);
    for (let x = c; x < c + w; x++) for (const y of [r, r + h - 1]) if (!isGate(x, y)) fences.push({ c: x, r: y, kind: 'h' });
    for (let y = r + 1; y < r + h - 1; y++) for (const x of [c, c + w - 1]) if (!isGate(x, y)) fences.push({ c: x, r: y, kind: 'v' });
  };
  fenceRect({ c: 20, r: 3, w: 8, h: 8 }, [[23, 10], [24, 10]]); // rào ruộng
  for (const p of Object.values(PENS)) fenceRect(p.rect, p.gates);
  for (const f of fences) block(f.c, f.r);

  // Viền cây & bụi rậm; cổng ra ở giữa cạnh dưới
  block(0, 0, MW, 2);
  block(0, 0, 1, MH);
  block(MW - 1, 0, 1, MH);
  for (let x = 0; x < MW; x++) if (x !== 16 && x !== 17) block(x, MH - 1);

  for (const b of BUILDINGS) block(b.foot.c, b.foot.r, b.foot.w, b.foot.h);
  for (const t of TROUGHS) block(t.c, t.r, t.w, 1);
  for (const t of TREES) block(Math.floor(t.x / TS), Math.floor((t.y - 1) / TS));

  return { ground, solid, fences };
}

export const GRID_DATA = buildGrid();
export const isSolid = (c, r) => c < 0 || r < 0 || c >= MW || r >= MH || GRID_DATA.solid[idx(c, r)] === 1;
export const isSolidPx = (x, y) => isSolid(Math.floor(x / TS), Math.floor(y / TS));

