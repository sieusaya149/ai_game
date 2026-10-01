// Bố cục: danh mục công trình, bố cục vườn mới, bố cục của bản v1 (để chuyển bản lưu cũ). Thuần dữ liệu.
// Bản đồ thật của từng vườn nằm trong state.farm và được dựng bởi farm.js.

export const TS = 16;                       // 1 ô = 16x16 điểm ảnh
export const MAP = { mw: 64, mh: 48 };      // vườn tối đa 64x48 ô
export const GROUND = { GRASS: 0, ROAD: 1, FIELD: 2, PEN: 3, MUD: 4, FOREST: 5, FLOOR: 6, WALL: 7 };
export const FIELD_SIZE = 3;                // ruộng là các khối 3x3

// Công trình: foot là các ô chắn đường (w, h), spr là góc vẽ sprite so với góc trên-trái của foot (điểm ảnh),
// at là điểm đứng để tương tác (null = không tương tác). fixed: không dời được.
// door: các ô (so với góc foot) bỏ chắn để bước vào là sang bản đồ to.
export const BUILDING_DEFS = {
  house:    { name: 'Nhà',           sprite: 'house',     foot: { w: 4, h: 4 }, spr: { x: -8, y: -22 }, at: { x: 32, y: 74 }, fixed: true,
    door: { c: 1, r: 3, w: 2, h: 1, to: 'house' } },
  board:    { name: 'Bảng đơn hàng', sprite: 'board',     foot: { w: 1, h: 1 }, spr: { x: -4, y: -8 },  at: { x: 8, y: 24 } },
  shed:     { name: 'Nhà kho',       sprite: 'shed',      foot: { w: 4, h: 3 }, spr: { x: 0, y: -10 },  at: { x: 32, y: 58 } },
  well:     { name: 'Giếng nước',    sprite: 'well',      foot: { w: 1, h: 1 }, spr: { x: 0, y: -8 },   at: { x: 8, y: 24 } },
  doghouse: { name: 'Chuồng chó',    sprite: 'doghouse',  foot: { w: 1, h: 1 }, spr: { x: -6, y: -8 },  at: null, home: { x: 8, y: 26 } },
  shop:     { name: 'Sạp hàng',      sprite: 'shop',      foot: { w: 3, h: 3 }, spr: { x: 0, y: -2 },   at: { x: 24, y: 56 } },
  // Cổng nằm ở hàng cuối của đất; exit là các ô ngay ngoài cổng vẫn đi được (lối ra làng), in là chỗ NPC đi vào.
  gate:     { name: 'Cổng',          sprite: 'signboard', foot: { w: 3, h: 1 }, spr: { x: 2, y: -6 },   at: { x: -16, y: 10 }, in: { x: -16, y: 24 }, exit: [[-2, 1], [-1, 1]], fixed: true },
};

// Chuồng: kích thước khung rào (ô); các vị trí bên trong tính so với góc trên-trái khung.
// trough: ô máng (c, r) + điểm vẽ (x, y); area: vùng con vật đi lang thang (điểm ảnh).
export const PEN_DEFS = {
  chicken: {
    name: 'Chuồng gà', w: 13, h: 9, gates: [[6, 0], [7, 0]],
    trough: { c: 1, r: 1, x: 32, y: 30 }, area: { x: 22, y: 42, w: 164, h: 84 },
    ground: { kind: 'PEN', c: 1, r: 1, w: 11, h: 7 },
    nest: { foot: { c: 9, r: 1, w: 2, h: 1 }, spr: { x: 145, y: 4 }, at: { x: 160, y: 42 } },
  },
  pig: {
    name: 'Chuồng heo', w: 6, h: 9, gates: [[2, 0]],
    trough: { c: 3, r: 1, x: 64, y: 30 }, area: { x: 22, y: 42, w: 52, h: 84 },
    ground: { kind: 'MUD', c: 1, r: 1, w: 4, h: 7 },
    mud: { x: 24, y: 84, w: 40, h: 22 }, mudSpot: { x: 44, y: 95, rx: 22, ry: 14, x0: 28, x1: 60, y0: 88, y1: 102 },
  },
  pasture: {
    name: 'Đồng cỏ bò cừu', w: 8, h: 9, gates: [[3, 0]],
    trough: { c: 5, r: 1, x: 96, y: 30 }, area: { x: 22, y: 42, w: 84, h: 84 },
  },
};

// ---------- Vườn mới ----------
// Đất ban đầu 24x20 ở giữa bản đồ. Toạ độ tính theo ô của bản đồ 64x48.
export const START_FARM = {
  owned: { c: 20, r: 14, w: 24, h: 20 },
  ents: [
    { kind: 'house', c: 21, r: 15 },
    { kind: 'shed', c: 26, r: 15 },
    { kind: 'board', c: 31, r: 16 },
    { kind: 'well', c: 33, r: 17 },
    { kind: 'field', c: 37, r: 15 },
    { kind: 'shop', c: 40, r: 21 },
    { kind: 'doghouse', c: 21, r: 21 },
    { kind: 'pen', pen: 'chicken', c: 21, r: 24 },
    { kind: 'gate', c: 38, r: 33 },
    { kind: 'tree', c: 42, r: 28 },
    { kind: 'tree', c: 35, r: 30 },
  ],
  // đường đất: các hình chữ nhật (c, r, w, h)
  paths: [[22, 19, 16, 2], [27, 21, 2, 3], [36, 21, 2, 13]],
  spawn: { x: 368, y: 318 },
};

// ---------- Bản đồ cố định (trong nhà; sau này thêm làng) ----------
// Toạ độ theo ô của chính bản đồ đó. walls: hình chữ nhật chắn đường (c, r, w, h).
// furniture: đồ đặc chắn đường; foot (ô), spr = góc vẽ sprite so với góc foot, at = chỗ đứng để dùng (null = chỉ để ngắm).
// props: hình vẽ nằm dưới chân, không chắn (thảm, cửa sổ trên vách). doors: ô cửa, bước vào là sang bản đồ to.
// arrive[from]: chỗ đứng (điểm ảnh) + hướng nhìn khi từ bản đồ from đi tới.
export const SCENES = {
  house: {
    name: 'Trong nhà', mw: 12, mh: 10,
    walls: [[0, 0, 12, 2], [0, 2, 1, 8], [11, 2, 1, 8], [1, 9, 4, 1], [7, 9, 4, 1]],
    furniture: [
      { kind: 'bed', name: 'Giường', sprite: 'bed', foot: { c: 1, r: 2, w: 2, h: 2 }, spr: { x: 0, y: 4 }, at: { x: 40, y: 20 } },
      { kind: 'wardrobe', name: 'Tủ đồ', sprite: 'wardrobe', foot: { c: 9, r: 2, w: 2, h: 1 }, spr: { x: 4, y: -16 }, at: { x: 16, y: 26 } },
      { kind: 'stove', name: 'Bếp', sprite: 'stove', foot: { c: 6, r: 2, w: 2, h: 1 }, spr: { x: 4, y: -8 }, at: null },
      { kind: 'table', name: 'Bàn', sprite: 'table', foot: { c: 4, r: 5, w: 2, h: 1 }, spr: { x: 0, y: -4 }, at: null },
      { kind: 'plant', name: 'Chậu cây', sprite: 'pottedPlant', foot: { c: 10, r: 8, w: 1, h: 1 }, spr: { x: 0, y: -8 }, at: null },
    ],
    props: [
      { sprite: 'window', x: 64, y: 6 }, { sprite: 'window', x: 128, y: 6 },
      { sprite: 'rug', x: 56, y: 70 },
      { sprite: 'doorMat', x: 80, y: 128 }, { sprite: 'doorMat', x: 96, y: 128 },
    ],
    doors: [{ c: 5, r: 9, w: 2, h: 1, to: 'farm', name: 'Cửa ra vườn', at: { x: 96, y: 138 } }],
    arrive: { farm: { x: 96, y: 126, dir: 3 } },
  },
};

// ---------- Bản v1 (bản đồ cố định 34x27) ----------
// Khi chuyển bản lưu, cả bản đồ cũ được đặt vào giữa bản đồ mới, lệch (OX, OY) ô.
export const V1 = {
  OX: 15, OY: 10, GRID: 6,
  owned: { c: 1, r: 2, w: 32, h: 24 },      // phần trong viền cây của bản cũ
  field: { c: 21, r: 4 },                   // ô ruộng idx ở (c + idx % 6, r + idx / 6)
  ents: [
    { kind: 'house', c: 3, r: 3 },
    { kind: 'board', c: 8, r: 7 },
    { kind: 'shed', c: 10, r: 4 },
    { kind: 'well', c: 9, r: 10 },
    { kind: 'doghouse', c: 2, r: 10 },
    { kind: 'shop', c: 29, r: 5 },
    { kind: 'gate', c: 18, r: 25 },
    { kind: 'pen', pen: 'chicken', c: 2, r: 16 },
    { kind: 'pen', pen: 'pig', c: 18, r: 16 },
    { kind: 'pen', pen: 'pasture', c: 25, r: 16 },
    { kind: 'tree', c: 14, r: 11 },
    { kind: 'tree', c: 15, r: 3 },
    { kind: 'tree', c: 27, r: 12 },
  ],
  paths: [[16, 2, 2, 24], [1, 13, 32, 2], [4, 7, 2, 6], [23, 11, 2, 2], [30, 8, 1, 5], [8, 15, 2, 1], [20, 15, 1, 1], [28, 15, 1, 1], [8, 7, 2, 1], [9, 11, 1, 1]],
};
