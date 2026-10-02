// Pixel art vẽ bằng code. Trong các sprite dạng chữ, mỗi ký tự là một điểm ảnh, '.' là trong suốt.

const PAL = {
  o: '#3b2412', d: '#2f6b1f', g: '#4fa83a', l: '#8fd65a', h: '#c8f08a',
  y: '#f7d547', Y: '#d19a1c', r: '#e5452f', R: '#9e2416', O: '#f59a23', Q: '#b8600f',
  w: '#ffffff', W: '#f3ead2', b: '#8a5a2b', B: '#5c3a1a', m: '#1f6b2a', M: '#5cb85c',
  k: '#2a2a2a', u: '#5fb8ff', U: '#1f6fd1', v: '#8e4fc0', V: '#4a1f66', n: '#f4a0a8', s: '#b8b8b8', q: '#ff8fb1', z: '#c2306f', K: '#5a5a72',
};
const DOG_PAL = { ...PAL, Q: '#d98a3a', W: '#fbe7c6' };

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function sprite(rows, pal = PAL) {
  const c = canvas(Math.max(...rows.map(r => r.length)), rows.length);
  const x = c.getContext('2d');
  rows.forEach((row, py) => [...row].forEach((ch, px) => {
    if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(px, py, 1, 1); }
  }));
  return c;
}

export function flip(src) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.scale(-1, 1);
  x.drawImage(src, -src.width, 0);
  return c;
}

// Vẽ từng điểm ảnh bằng hàm màu: fn(px, py) trả về mã màu hoặc null.
export function paint(w, h, fn) {
  const c = canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h);
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const col = fn(px, py);
    if (!col) continue;
    const n = parseInt(col.slice(1), 16);
    img.data.set([n >> 16, (n >> 8) & 255, n & 255, 255], (py * w + px) * 4);
  }
  x.putImageData(img, 0, 0);
  return c;
}

export function hash(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function rect(x, color, px, py, w, h) { x.fillStyle = color; x.fillRect(px, py, w, h); }

export function disc(x, color, cx, cy, r) {
  x.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r + r * 0.8 - dy * dy));
    x.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

function draw(w, h, fn) {
  const c = canvas(w, h);
  fn(c.getContext('2d'));
  return c;
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}

// ---------- Cây trồng ----------

const SPROUT = [
  '..l....l..',
  '.lgl..lgl.',
  '.dgl..lgd.',
  '..dgllgd..',
  '...dggd...',
  '....dd....',
];

const GROW = [
  '.....l..l.....',
  '....lgl.lgl...',
  '..l.dglllgd.l.',
  '.lgl.dgggd.lgl',
  '.dggl.dgd.lggd',
  '..dggllgllggd.',
  '...dgglgglgd..',
  '....ddgggdd...',
  '.....dgggd....',
  '......ddd.....',
];

const RIPE = {
  cai: [
    '....d.dd.d....',
    '...dld.dlld...',
    '..dlgldlgggd..',
    '..dggldlglgd..',
    '.dglggdggllgd.',
    '.dggllgglgggd.',
    '..dgglwwlggd..',
    '..ddgwwwwgdd..',
    '...dwwWwwwd...',
    '....dwwWwd....',
    '.....dddd.....',
  ],
  carot: [
    '....l...l.....',
    '...lgl.lgl.l..',
    '..l.dgllgd.gl.',
    '.lgl.dggd.lgd.',
    '.dggl.dgd.gd..',
    '..ddggldgggd..',
    '....ddgggdd...',
    '....oQOOOQo...',
    '....oOOyOOo...',
    '.....oOOOo....',
    '.....oQOQo....',
    '......ooo.....',
  ],
  lua: [
    '..Y......Y....Y.',
    '.Yy.....Yy...Yy.',
    '.yY..Y..yY..Yy..',
    '..Yy.Yy..Yy.yY..',
    '..dY.yY..dY.Y...',
    '...d..Yy..d.d...',
    '...dd.dY.dd.d...',
    '....d..d.d.dd...',
    '....dd.ddd.d....',
    '.....dddgdd.....',
    '......dggd......',
    '.......dd.......',
  ],
  cachua: [
    '.....l...l.....',
    '....lgl.lgl....',
    '...dgglggggd...',
    '..dgRRdgdgggd..',
    '..dRrwRgdRRgd..',
    '..dRrrRgRrwRd..',
    '..dgRRggRrrRd..',
    '..dgglgdRRRgd..',
    '...dRRdggRRd...',
    '...RrwRgRrwR...',
    '...RrrRdRrrR...',
    '....RRddgRR....',
    '......dgd......',
    '.......d.......',
  ],
  bap: [
    '......l.......',
    '.....lgl......',
    '..l..dgd..l...',
    '.lgl.dgd.lgl..',
    '..dgldgdlgd...',
    '...dggyYgd....',
    '....dyyyd.....',
    '...ldyYyYdl...',
    '..lgdyyyydgl..',
    '.lgd.dyYyd.dgl',
    '.dd..dyyyd..dd',
    '.....dgyYd....',
    '......dgd.....',
    '......dgd.....',
    '.....ddgdd....',
  ],
  dau: [
    '....l..l..l....',
    '...lgllgllgl...',
    '..dgggdgdgggd..',
    '.dgRRgggggRRgd.',
    '.dRryRgdgRryRd.',
    '.dRrrRgggRrrRd.',
    '..dRRdglgdRRd..',
    '..dgggRRRgggd..',
    '...dgRryRRgd...',
    '....dRrrRdd....',
    '.....dRRd......',
  ],
  bingo: [
    '.......db......',
    '......dbd.l....',
    '...l..bgllgl...',
    '..lgl.QOOQ.d...',
    '...oQOOQOOQOo..',
    '..oQOyOQOOOQQo.',
    '..oOyOOQOOOOQo.',
    '.oQOOOQOOOOOQQo',
    '.oQOOOQOOOOOQQo',
    '.oQQOOQOOOOQQQo',
    '..oQQOQQOOQQQo.',
    '...ooQQQQQQoo..',
    '.....ooooooo...',
  ],
  duahau: [
    '...l.....l.....',
    '..lgl...lgl....',
    '...dgl.lgd.....',
    '....ooooooo....',
    '..oommMmmMmoo..',
    '.omMmmMmmMmmMo.',
    '.oMmmhMmmMmmMo.',
    'omMmhMmmMmmMmmo',
    'omMmMmmMmmMmmMo',
    'omMmMmmMmmMmMmo',
    '.omMmMmmMmMmmo.',
    '..oomMmmMmmoo..',
    '....ooooooo....',
  ],
};

// ---------- Sự cố & biểu tượng ----------

const WEED = [
  '.d...d..d.',
  '.dd.dd.dd.',
  '..dddgddd.',
  'd.dgdgdgd.',
  'dddgggggdd',
  '.ddgdgdgd.',
  '..dddddd..',
];

const BUG = [
  '.k....k.',
  '..k..k..',
  '..VVVV..',
  '.VvvvvV.',
  'kVvwvvVk',
  '.VvvvvV.',
  'k.VVVV.k',
  '..V..V..',
];

const DROP = [
  '...U...',
  '..UuU..',
  '..UuU..',
  '.UuwuU.',
  '.UwuuU.',
  'UuwuuuU',
  'UuuuuuU',
  '.UuuuU.',
  '..UUU..',
];

const BUBBLE = [
  '..ooooooooo..',
  '.oWWWWWWWWWo.',
  'oWWWWWWWWWWWo',
  'oWWWWWWWWWWWo',
  'oWWWWWWWWWWWo',
  'oWWWWWWWWWWWo',
  'oWWWWWWWWWWWo',
  'oWWWWWWWWWWWo',
  'oWWWWWWWWWWWo',
  'oWWWWWWWWWWWo',
  '.oWWWWWWWWWo.',
  '..oooWWWooo..',
  '....oWWo.....',
  '....oWo......',
  '....oo.......',
];

const EGG = ['..ooo..', '.oWWWo.', 'oWwWWWo', 'oWwWWWo', 'oWWWWWo', 'oWWWWWo', '.oWWWo.', '..ooo..'];
const MILK = ['..ooo..', '..oUo..', '.ooooo.', '.owwwo.', 'owwwwwo', 'owwUwwo', 'owUUUwo', 'owwUwwo', 'owwwwwo', '.ooooo.'];
const WOOL = ['..oo.oo..', '.owwowwo.', 'owwwwwwwo', 'owWwwwWwo', 'owwwwwwwo', '.owwWwwo.', '..ooooo..'];
const GRAIN = ['..y.y.y..', '.yyYyYyy.', 'ooooooooo', 'obbbbbbbo', '.obbbbbo.', '..ooooo..'];
const SPARKLE = ['..y..', '..w..', 'ywwwy', '..w..', '..y..'];
const ARROW = ['..ooooo..', '..oyyyo..', 'oooyyyooo', 'oyyyyyyyo', '.oyyyyyo.', '..oyyyo..', '...oyo...', '....o....'];
const SIGN = [
  'oooooooooooo',
  'obbbbbbbbbbo',
  'obbbbwwbbbbo',
  'obbbbwwbbbbo',
  'obwwwwwwwwbo',
  'obwwwwwwwwbo',
  'obbbbwwbbbbo',
  'obbbbwwbbbbo',
  'obbbbbbbbbbo',
  'oooooBBooooo',
  '.....oBo....',
  '.....oBo....',
];
const TUFT = ['d...d', '.d.d.', 'dgdgd'];

// ---------- Động vật (quay sang trái, 2 khung hình bước chân) ----------

const CHICKEN_TOP = [
  '...rr.......',
  '..rwwo......',
  '.owkwwo.....',
  'Oowwwwo..oo.',
  '.owwwwwooWwo',
  '..owwwwwwwWo',
  '..oWwwwwwwWo',
  '...oWWwwWWo.',
  '....oooooo..',
];
const CHICKEN = [
  [...CHICKEN_TOP, '.....O..O...', '....OO.OO...'],
  [...CHICKEN_TOP, '....O....O..', '...OO...OO..'],
];

const COW_TOP = [
  '..w..w..................',
  '.owwwwo.................',
  'owwwwwwo................',
  'owkwwkwoooooooooooooooo.',
  'owwwwwwwwwwkkkwwwwwwwwwo',
  '.onnnnowwwwkkkkwwwwwkkwo',
  'onnknnowwwwwkkwwwwkkkkwo',
  '.onnnnowwwwwwwwwwwwkkwwo',
  '..oooowwkkwwwwwwwwwwwwwo',
  '.....owkkkkwwwwwwwwwwwo.',
  '.....owwkkwwwwwwwwwwwwok',
  '......oooooooooooooooo.k',
];
const COW = [
  [...COW_TOP, '......owo.owo...owo.owo.', '......owo.owo...owo.owo.', '......oko.oko...oko.oko.'],
  [...COW_TOP, '.......owo.owo.owo.owo..', '.......owo.owo.owo.owo..', '.......oko.oko.oko.oko..'],
];

const SHEEP_TOP = [
  '......oooo.oooo.....',
  '.....owwwwowwwwo....',
  '..ooowwwwwwwwwwwoo..',
  '.okkkowwwwwwwwwwwwo.',
  'okkkkkowwwwwwwwwwwwo',
  'okwkkkowwwwwwwwwwwwo',
  'okkkkkowwwwwwwwwwwwo',
  '.okkkowwwwwwwwwwwwo.',
  '..ooowWwwwwwwwwwwWo.',
  '....oWWwwwwwwwwWWo..',
  '.....oooooooooooo...',
];
const SHEEP = [
  [...SHEEP_TOP, '......ok.ok..ok.ok..', '......ok.ok..ok.ok..', '......oo.oo..oo.oo..'],
  [...SHEEP_TOP, '.......ok.ok.ok.ok..', '.......ok.ok.ok.ok..', '.......oo.oo.oo.oo..'],
];

const DOG_TOP = [
  '.o...o..........',
  'oQo.oQo.........',
  'oQQoQQo.........',
  'oQQQQQQo........',
  'oQkQQkQo....oo..',
  'oQQWWQQo...oQo..',
  'kWWWWQQo..oQo...',
  '.oWWQQQoooooo...',
  '..oQQQQQQQQQQo..',
  '..oQWWQQQQQQQo..',
  '..oQWWQQQQQQo...',
];
const DOG = [
  [...DOG_TOP, '..oQo.oQoo.oQo..', '..oQo.oQo..oQo..', '..oo..oo...oo...'],
  [...DOG_TOP, '...oQooQo.oQo...', '...oQooQo..oQo..', '...oo.oo...oo...'],
];

const animalFrames = (frames, pal) => {
  const left = frames.map(f => sprite(f, pal));
  return { left, right: left.map(flip) };
};

// ---------- Nhân vật ----------
// Khung 16x24, gốc ở chân. Hướng: 0 xuống, 1 trái, 2 phải, 3 lên. Mỗi hướng 3 khung: đứng, bước trái, bước phải.

const HEAD_DOWN = [
  '......oooo......',
  '....oohhhhoo....',
  '...ohhhhhhhho...',
  '..ohhhhhhhhhho..',
  '..ohhhhhhhhhho..',
  '..ohhhhhhhhhho..',
  '..ohhsssssshho..',
  '..osssssssssso..',
  '..ossessssesso..',
  '..ossessssesso..',
  '..ocsssssssco...',
  '...osssmmssso...',
  '....oossssoo....',
];
const HEAD_UP = [
  ...HEAD_DOWN.slice(0, 6),
  '..ohhhhhhhhhho..',
  '..ohhhhhhhhhho..',
  '..ohhhhhhhhhho..',
  '..oHhhhhhhhhHo..',
  '..oHHhhhhhhHHo..',
  '...oHHHHHHHHo...',
  '....oossssoo....',
];
const BODY_FRONT = [
  '...otttttttto...',
  '..oTttttttttTo..',
  '..oTttttttttTo..',
  '..oTttttttttTo..',
  '..ossttttttsso..',
  '...oppppppppo...',
];
const LEGS_FRONT = [
  ['...opppoopppo...', '...opppoopppo...', '...offfoofffo...', '....ooo..ooo....'],
  ['...opppoopppo...', '...opppoofffo...', '...offfo.ooo....', '....ooo.........'],
  ['...opppoopppo...', '...offfoopppo...', '....ooo.offfo...', '.........ooo....'],
];
const SIDE = [
  '......oooo......',
  '....oohhhhoo....',
  '...ohhhhhhhho...',
  '..ohhhhhhhhhho..',
  '..ohhhhhhhhhho..',
  '..ohsshhhhhhho..',
  '..ossssshhhhho..',
  '..osessshhhhho..',
  '..osessshhhhho..',
  '..ocsssshhhhho..',
  '...osssssHhho...',
  '....ossssso.....',
  '.....ossso......',
  '....otttttto....',
  '....otttTtto....',
  '....otttTtto....',
  '....otttstto....',
  '....otttttto....',
  '....oppppppo....',
];
const LEGS_SIDE = [
  ['....oppppppo....', '....oppppppo....', '...offfffffo....', '...oooooooo.....'],
  ['....opppoppo....', '...oppo.oppo....', '..offo..offo....', '..ooo...ooo.....'],
];

// Tóc dài: phủ thêm hai bên má và sau lưng.
function longHair(rows, dir) {
  const g = rows.map(r => [...r]);
  const set = (x, y, ch) => { if (g[y]) g[y][x] = ch; };
  if (dir === 0) for (let y = 6; y <= 15; y++) { set(2, y, 'o'); set(13, y, 'o'); set(3, y, 'h'); set(12, y, 'h'); }
  if (dir === 3) for (let y = 11; y <= 16; y++) { set(2, y, 'o'); set(13, y, 'o'); for (let x = 3; x <= 12; x++) set(x, y, y === 16 ? 'o' : 'h'); }
  if (dir === 1) for (let y = 9; y <= 15; y++) { set(12, y, 'o'); for (let x = 8; x <= 11; x++) set(x, y, 'h'); }
  return g.map(r => r.join(''));
}

// Lớp phủ (toạ độ theo khung 16x24; đầu bắt đầu ở hàng 1). Vẽ cho hướng nhìn xuống/lên (dir 0/3) và nhìn trái (dir 1).
const BUN = [[0, 0, ['......oooo......', '.....ohhhho.....']]];
const PT_UP = [[6, 10, ['ohho', 'ohho', 'ohho', 'ohho', 'oHHo', '.oo.']]];
const PT_SIDE = [[12, 5, ['.ooo', 'ohho', 'ohho', 'ohho', 'oHHo', '.oo.']]];

const NON = ['.......oo.......', '......oyyo......', '.....oyyyyo.....', '....oyyYyyyo....', '...oyyyyYyyyo...',
  '.ooyyYyyyyYyyoo.', 'oyyYyyyyyyyyYyyo', '.oooooooooooooo.'];
const CAP_DOME = ['......oooo......', '....oorrrroo....', '...orrrrrrrro...', '..orrrrrrrrrro..', '..orrrrrrrrrro..'];
const CAP_F = [...CAP_DOME, '..oRRRRRRRRRRo..', '.oooooooooooooo.'];
const CAP_B = [...CAP_DOME, '..oRRRRRRRRRRo..'];
const CAP_S = [...CAP_DOME, 'ooRRRRRRRRRRRo..'];
const BOW = ['.zz.zz.', 'zqqzqqz', '.zqqqz.', '.zz.zz.'];
const CROWN = ['y...yy...y', 'yy.yyyy.yy', 'yyyyyyyyyy', 'YYrYYYYrYY'];

function wreath(dir) {
  const [x0, x1] = dir === 1 ? [3, 13] : [3, 12];
  const flo = ['q', 'g', 'y', 'g', 'w', 'g'];
  return [[x0, 4, [...Array(x1 - x0 + 1)].map((_, i) => flo[i % 6]).join('')],
    [x0, 5, [...Array(x1 - x0 + 1)].map((_, i) => (i % 2 ? 'd' : 'g')).join('')]].map(([x, y, s]) => [x, y, [s]]);
}

function hatOverlay(hat, dir) {
  if (hat === 1) return [[0, 0, NON]];
  if (hat === 2) return [[0, 1, dir === 0 ? CAP_F : dir === 3 ? CAP_B : CAP_S]];
  if (hat === 3) return [[dir === 1 ? 8 : 9, 1, BOW]];
  if (hat === 4) return wreath(dir);
  if (hat === 5) return [[dir === 1 ? 4 : 3, 0, CROWN]];
  return [];
}

function accOverlay(acc, dir) {
  if (acc === 1) {
    if (dir === 0) return [[3, 9, ['kkkkkkkkkk']], [3, 10, ['kKKk..kKKk']]];
    if (dir === 1) return [[3, 8, ['kKKkkkk']], [3, 9, ['kkkk']]];
  }
  if (acc === 2) {
    if (dir === 0) return [[3, 14, ['orrrrrrrro']], [9, 15, ['orro', 'orRo', '.oo.']]];
    if (dir === 3) return [[3, 14, ['orrrrrrrro']]];
    if (dir === 1) return [[4, 13, ['orrrro']], [4, 14, ['orrrrrro']], [10, 15, ['orro', 'orRo', '.oo.']]];
  }
  return [];
}

const SKINS = ['#ffd7b0', '#f1b98c', '#c98b5f'];
const HAIR_COLORS = ['#3b2412', '#7a4a22', '#d9a441', '#b8402e', '#2b2b3a'];
const SHIRTS = ['#e5452f', '#3f8ce0', '#4caf50', '#f7c843', '#b36ad6', '#ff8fb1'];
const PANTS = ['#3a4a8a', '#5c3a1a', '#2a2a2a', '#4f7a3a'];

const lookCache = new Map();
// Trả về frames[hướng][khung] cho một bộ ngoại hình. Khung 16x24, chân chạm hàng dưới cùng.
export function character(look) {
  const key = JSON.stringify(look);
  if (lookCache.has(key)) return lookCache.get(key);
  const skin = SKINS[look.skin] || SKINS[0], hair = HAIR_COLORS[look.hairColor] || HAIR_COLORS[0];
  const shirt = SHIRTS[look.shirt] || SHIRTS[0], pants = PANTS[look.pants] || PANTS[0];
  const style = look.hair | 0, hat = look.hat | 0, acc = look.acc | 0;
  const pal = {
    ...PAL, s: skin, c: '#f2a0a0', e: '#2a1a10', m: '#c0504a',
    h: hair, H: shade(hair, 0.75), t: shirt, T: shade(shirt, 0.8), p: pants, P: shade(pants, 0.8), f: '#3b2412',
  };
  const build = (rows, dir) => {
    const out = canvas(16, 24), x = out.getContext('2d');
    x.drawImage(sprite(style === 1 ? longHair(rows, dir) : rows, pal), 0, 1);
    const layers = [];
    if (style === 2) layers.push(...BUN, ...(dir === 3 ? PT_UP : dir === 1 ? PT_SIDE : []));
    layers.push(...hatOverlay(hat, dir), ...accOverlay(acc, dir));
    for (const [lx, ly, rows2] of layers) x.drawImage(sprite(rows2, pal), lx, ly);
    return out;
  };
  const down = LEGS_FRONT.map(l => build([...HEAD_DOWN, ...BODY_FRONT, ...l], 0));
  const up = LEGS_FRONT.map(l => build([...HEAD_UP, ...BODY_FRONT, ...l], 3));
  const leftStand = build([...SIDE, ...LEGS_SIDE[0]], 1), leftWalk = build([...SIDE, ...LEGS_SIDE[1]], 1);
  const left = [leftStand, leftWalk, leftStand];
  const frames = [down, left, left.map(flip), up];
  lookCache.set(key, frames);
  return frames;
}

// ---------- Mặt đất & ruộng ----------

function plotTile(dry) {
  return paint(16, 16, (px, py) => {
    const edge = px === 0 || py === 0 || px === 15 || py === 15;
    if (edge) return py === 0 || px === 0 ? (dry ? '#b08556' : '#6b4222') : (dry ? '#9c7648' : '#553217');
    if (py % 4 === 2) return dry ? '#b8905e' : '#6f4424';
    if (dry && hash(px + 50, py) < 0.08) return '#9c7648';
    if (!dry && hash(px, py) < 0.06) return '#a36a38';
    return dry ? '#cfa56d' : '#8e5a30';
  });
}

// Ô đất chưa mở: cỏ dại um tùm.
const wildTile = () => paint(16, 16, (px, py) => {
  const n = hash(px + 7, py + 3);
  if ((px + py * 3) % 5 === 0 && py % 3 !== 0) return '#3f8f2c';
  return n < 0.15 ? '#5a9e3a' : '#6cb846';
});

const selectTile = () => paint(16, 16, (px, py) =>
  (px < 2 || py < 2 || px > 13 || py > 13) && !((px > 3 && px < 12) || (py > 3 && py < 12)) ? '#fff27a' : null);

// ---------- Cảnh vật ----------

function tree() {
  return draw(32, 44, x => {
    for (let i = 0; i < 4; i++) rect(x, '#4f8f32', 8 + i, 40 + i, 16 - i * 2, 1);
    rect(x, '#3b2412', 12, 28, 8, 13);
    rect(x, '#8a5a2b', 13, 28, 6, 13);
    rect(x, '#6b4020', 17, 28, 2, 13);
    const blobs = [[16, 18, 13], [8, 22, 7], [24, 22, 7], [16, 9, 9], [9, 12, 6], [23, 12, 6]];
    for (const [cx, cy, r] of blobs) disc(x, '#1e4d14', cx, cy, r + 1);
    for (const [cx, cy, r] of blobs) disc(x, '#3d8c2a', cx, cy, r);
    for (const [cx, cy, r] of blobs) disc(x, '#5fb33e', cx - 2, cy - 2, Math.max(2, r - 4));
    for (const [cx, cy] of [[12, 6], [7, 11], [20, 7], [13, 16], [22, 19]]) disc(x, '#8fd65a', cx, cy, 1);
  });
}

function bush() {
  return draw(16, 15, x => {
    for (const [cx, cy, r] of [[5, 8, 5], [11, 8, 5], [8, 5, 5]]) disc(x, '#1e4d14', cx, cy, r + 1);
    for (const [cx, cy, r] of [[5, 8, 5], [11, 8, 5], [8, 5, 5]]) disc(x, '#3d8c2a', cx, cy, r);
    disc(x, '#5fb33e', 6, 4, 2);
    disc(x, '#5fb33e', 11, 6, 2);
    rect(x, '#e5452f', 4, 9, 1, 1);
    rect(x, '#ff8fb1', 11, 10, 1, 1);
  });
}

function house() {
  return draw(80, 86, x => {
    // ống khói
    rect(x, '#3b2412', 56, 0, 10, 16);
    rect(x, '#9a8a80', 57, 1, 8, 15);
    rect(x, '#7a6a60', 57, 5, 8, 1);
    rect(x, '#7a6a60', 57, 10, 8, 1);
    // mái
    rect(x, '#3b2412', 1, 8, 78, 42);
    rect(x, '#d9483b', 2, 9, 76, 40);
    for (let yy = 13, row = 0; yy < 49; yy += 5, row++) {
      rect(x, '#b8352b', 2, yy, 76, 1);
      for (let xx = 2 + (row % 2) * 5; xx < 78; xx += 10) rect(x, '#b8352b', xx, yy - 4, 1, 4);
    }
    rect(x, '#ef7a6a', 2, 9, 76, 2);
    rect(x, '#8e2a20', 2, 47, 76, 2);
    // tường
    rect(x, '#3b2412', 6, 49, 68, 35);
    rect(x, '#f4e2bd', 7, 50, 66, 33);
    rect(x, '#c9b48a', 7, 50, 66, 3);
    for (let yy = 57; yy < 83; yy += 5) rect(x, '#e0c79a', 7, yy, 66, 1);
    // cửa
    rect(x, '#3b2412', 31, 60, 18, 24);
    rect(x, '#8a5a2b', 32, 61, 16, 23);
    rect(x, '#6b4020', 39, 61, 2, 23);
    rect(x, '#f7d547', 36, 72, 2, 2);
    rect(x, '#f7d547', 42, 72, 2, 2);
    // cửa sổ + chậu hoa
    for (const wx of [12, 55]) {
      rect(x, '#3b2412', wx, 56, 14, 12);
      rect(x, '#8fd3ff', wx + 1, 57, 12, 10);
      rect(x, '#ffffff', wx + 2, 58, 3, 2);
      rect(x, '#3b2412', wx + 6, 57, 2, 10);
      rect(x, '#3b2412', wx + 1, 61, 12, 1);
      rect(x, '#8a5a2b', wx - 1, 68, 16, 3);
      for (const [fx, col] of [[1, '#e5452f'], [5, '#ff8fb1'], [9, '#f7d547'], [12, '#e5452f']]) rect(x, col, wx + fx, 66, 2, 2);
    }
    // bậc thềm
    rect(x, '#3b2412', 4, 83, 72, 3);
    rect(x, '#a8a8a0', 5, 83, 70, 2);
  });
}

function shed() {
  return draw(64, 58, x => {
    // mái tôn
    rect(x, '#3b2412', 0, 0, 64, 20);
    for (let xx = 1; xx < 63; xx++) rect(x, xx % 4 < 2 ? '#c3cfdc' : '#94a5b8', xx, 1, 1, 18);
    rect(x, '#6f8095', 1, 17, 62, 2);
    // khung + bên trong tối
    rect(x, '#3b2412', 2, 20, 60, 36);
    rect(x, '#6b4020', 3, 20, 58, 35);
    rect(x, '#4a2c14', 3, 20, 58, 6);
    // rơm
    const bale = (bx, by) => {
      rect(x, '#3b2412', bx, by, 18, 12);
      rect(x, '#f0cf5a', bx + 1, by + 1, 16, 10);
      rect(x, '#c9a13a', bx + 1, by + 4, 16, 1);
      rect(x, '#c9a13a', bx + 1, by + 8, 16, 1);
      rect(x, '#fff0a0', bx + 2, by + 1, 5, 1);
    };
    bale(8, 30); bale(26, 30); bale(17, 20); bale(40, 42); bale(8, 42);
    // cột
    for (const px of [2, 58]) { rect(x, '#3b2412', px, 18, 5, 40); rect(x, '#b07a45', px + 1, 18, 3, 39); }
    rect(x, '#3b2412', 2, 55, 60, 3);
    rect(x, '#8a5a2b', 3, 55, 58, 2);
  });
}

function shop() {
  return draw(48, 50, x => {
    // bảng hiệu
    rect(x, '#3b2412', 10, 0, 28, 11);
    rect(x, '#f7d547', 11, 1, 26, 9);
    rect(x, '#d19a1c', 11, 8, 26, 2);
    disc(x, '#d19a1c', 24, 5, 3);
    rect(x, '#fff0a0', 23, 4, 2, 2);
    // cột
    for (const px of [3, 42]) { rect(x, '#3b2412', px, 10, 4, 38); rect(x, '#b07a45', px + 1, 10, 2, 37); }
    // mái bạt sọc
    rect(x, '#3b2412', 0, 11, 48, 14);
    for (let xx = 1; xx < 47; xx++) rect(x, Math.floor((xx - 1) / 6) % 2 ? '#ffffff' : '#e5452f', xx, 12, 1, 11);
    for (let xx = 1; xx < 47; xx += 6) disc(x, Math.floor((xx - 1) / 6) % 2 ? '#ffffff' : '#e5452f', xx + 2, 23, 2);
    // quầy hàng
    rect(x, '#3b2412', 2, 32, 44, 16);
    rect(x, '#b07a45', 3, 33, 42, 14);
    rect(x, '#8a5a2b', 3, 40, 42, 1);
    for (const [cx, col] of [[8, '#e5452f'], [18, '#f59a23'], [28, '#4fa83a'], [38, '#f7d547']]) {
      rect(x, '#3b2412', cx - 4, 27, 9, 7);
      rect(x, '#8a5a2b', cx - 3, 28, 7, 5);
      for (let i = 0; i < 3; i++) disc(x, col, cx - 2 + i * 2, 28, 1);
    }
    rect(x, '#3b2412', 2, 47, 44, 2);
  });
}

function mailbox() {
  return draw(12, 20, x => {
    rect(x, '#3b2412', 4, 8, 4, 12);
    rect(x, '#8a5a2b', 5, 8, 2, 12);
    rect(x, '#3b2412', 0, 0, 12, 10);
    rect(x, '#e5452f', 1, 1, 10, 8);
    rect(x, '#9e2416', 1, 7, 10, 2);
    rect(x, '#3b2412', 2, 3, 8, 1);
    rect(x, '#f7d547', 10, 0, 2, 5);
  });
}

function doghouse() {
  return draw(26, 24, x => {
    for (let i = 0; i < 9; i++) rect(x, i === 0 ? '#3b2412' : '#d9483b', 13 - i - 3, i, (i + 3) * 2, 1);
    rect(x, '#3b2412', 0, 9, 26, 2);
    rect(x, '#3b2412', 2, 10, 22, 14);
    rect(x, '#c98c4a', 3, 11, 20, 12);
    for (let yy = 14; yy < 23; yy += 3) rect(x, '#a8703e', 3, yy, 20, 1);
    disc(x, '#3b2412', 13, 18, 5);
    rect(x, '#3b2412', 8, 18, 11, 6);
    rect(x, '#1e140a', 9, 18, 9, 6);
  });
}

function coop() {
  return draw(30, 28, x => {
    for (let i = 0; i < 10; i++) rect(x, i === 0 ? '#3b2412' : '#d9483b', 15 - i - 4, i, (i + 4) * 2, 1);
    rect(x, '#3b2412', 0, 10, 30, 2);
    rect(x, '#3b2412', 2, 11, 26, 17);
    rect(x, '#f4e2bd', 3, 12, 24, 15);
    rect(x, '#3b2412', 10, 16, 10, 11);
    rect(x, '#5c3a1a', 11, 17, 8, 10);
    for (let i = 0; i < 4; i++) rect(x, '#b07a45', 11, 18 + i * 2, 8, 1);
  });
}

function trough() {
  return draw(26, 12, x => {
    rect(x, '#3b2412', 0, 2, 26, 10);
    rect(x, '#8a5a2b', 1, 3, 24, 8);
    rect(x, '#f0cf5a', 2, 3, 22, 3);
    for (let i = 3; i < 24; i += 3) rect(x, '#c9a13a', i, 4, 1, 1);
    rect(x, '#6b4020', 1, 8, 24, 1);
  });
}

function hay() {
  return draw(24, 16, x => {
    disc(x, '#3b2412', 12, 10, 9);
    disc(x, '#e8c34a', 12, 10, 8);
    rect(x, '#3b2412', 2, 14, 20, 2);
    for (const [hx, hy] of [[7, 6], [12, 4], [16, 8], [9, 11], [15, 12]]) rect(x, '#c9a13a', hx, hy, 3, 1);
    rect(x, '#fff0a0', 9, 4, 4, 1);
  });
}

function signboard() {
  return draw(40, 22, x => {
    for (const px of [5, 32]) { rect(x, '#3b2412', px, 10, 4, 12); rect(x, '#8a5a2b', px + 1, 10, 2, 12); }
    rect(x, '#3b2412', 0, 0, 40, 14);
    rect(x, '#c98c4a', 1, 1, 38, 12);
    rect(x, '#e0a868', 1, 1, 38, 2);
    rect(x, '#8a5a2b', 1, 11, 38, 2);
  });
}

// Hàng rào: nằm ngang (h) hoặc dọc (v), vẽ vào một ô 16x16.
// Màu hàng rào theo cấp chuồng: 1 gỗ mộc, 2 sơn kem, 3 sơn xanh (viền, thanh ngang, cột, điểm sáng)
const FENCE = [['#3b2412', '#c98c4a', '#b07a45', '#e0a868'], ['#3b2412', '#fff0d0', '#e0c898', '#ffffff'], ['#1c2a44', '#9fc0e8', '#5f88c0', '#d8ecff']];
export function fenceTile(x, kind, px, py, lv = 1) {
  const [ol, rail, post, hi] = FENCE[Math.min(3, Math.max(1, lv)) - 1];
  if (kind === 'h') {
    rect(x, ol, px, py + 5, 16, 3); rect(x, rail, px, py + 6, 16, 1);
    rect(x, ol, px, py + 10, 16, 3); rect(x, rail, px, py + 11, 16, 1);
    for (const ox of [2, 10]) {
      rect(x, ol, px + ox, py + 1, 4, 15);
      rect(x, post, px + ox + 1, py + 2, 2, 13);
      rect(x, hi, px + ox + 1, py + 2, 2, 1);
    }
  } else {
    rect(x, ol, px + 5, py, 2, 16); rect(x, ol, px + 9, py, 2, 16);
    rect(x, rail, px + 6, py, 1, 16); rect(x, rail, px + 10, py, 1, 16);
    for (const oy of [0, 8]) {
      rect(x, ol, px + 5, py + oy, 6, 7);
      rect(x, post, px + 6, py + oy + 1, 4, 5);
      rect(x, hi, px + 6, py + oy + 1, 4, 1);
    }
  }
}
// ---------- Công cụ vẽ thêm ----------

const OUT = '#3b2412';

function ell(x, col, cx, cy, rx, ry) {
  x.fillStyle = col;
  for (let dy = -ry; dy <= ry; dy++) {
    const t = 1 - (dy * dy) / ((ry + 0.5) ** 2);
    const hw = Math.round(rx * Math.sqrt(Math.max(0, t)) + 0.25);
    x.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
  }
}
function blob(x, fill, cx, cy, rx, ry, out = OUT) { ell(x, out, cx, cy, rx + 1, ry + 1); ell(x, fill, cx, cy, rx, ry); }
const dot = (x, col, px, py) => { x.fillStyle = col; x.fillRect(px, py, 1, 1); };
function line(x, col, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) dot(x, col, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n));
}
// Chân thú 2 điểm ảnh rộng, có móng.
function leg(x, px, py, h, fill, hoof = OUT) { rect(x, fill, px, py, 2, h); rect(x, hoof, px, py + h - 1, 2, 1); }
// Thu nhỏ gần nhất (lấy trung bình các điểm ảnh đục trong khối) để làm biểu tượng.
function fit(src, w, h) {
  const sx = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
  return paint(w, h, (i, j) => {
    const x0 = Math.floor(i * src.width / w), x1 = Math.max(x0 + 1, Math.floor((i + 1) * src.width / w));
    const y0 = Math.floor(j * src.height / h), y1 = Math.max(y0 + 1, Math.floor((j + 1) * src.height / h));
    let r = 0, g = 0, b = 0, n = 0, all = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      all++;
      const o = (yy * src.width + xx) * 4;
      if (sx[o + 3] > 128) { r += sx[o]; g += sx[o + 1]; b += sx[o + 2]; n++; }
    }
    if (n * 2 < all) return null;
    return '#' + [r, g, b].map(v => Math.round(v / n).toString(16).padStart(2, '0')).join('');
  });
}

// ---------- Đất ----------

function soilTile(kind) {
  return paint(16, 16, (px, py) => {
    const n = hash(px + 11, py + 5);
    if (kind === 'untilled') {
      const clod = hash(px >> 1, py >> 1) < 0.28;
      if (clod) return (px + py) % 2 ? '#7a4f2a' : '#a4703f';
      if ((px === 0 || py === 0)) return '#8a5a30';
      if (px === 15 || py === 15) return '#6b4222';
      if (n < 0.06) return '#c8a070';
      return n < 0.4 ? '#946334' : '#8a5a2e';
    }
    const wet = kind === 'tilledWet';
    const edge = px === 0 || py === 0 || px === 15 || py === 15;
    if (edge) return py === 0 || px === 0 ? (wet ? '#6b4222' : '#b08556') : (wet ? '#553217' : '#9c7648');
    const row = py % 4;
    if (row === 0) return wet ? '#a06a38' : '#e4c08c';
    if (row === 1) return wet ? '#7f5230' : '#d3aa72';
    if (row === 2) return wet ? '#573520' : '#b08556';
    if (!wet) {
      // vết nứt khô
      if ((px * 7 + py * 3) % 11 === 0 && hash(px, py) < 0.7) return '#8a6a40';
      if (hash(px + 3, py + 9) < 0.05) return '#8a6a40';
    } else if (hash(px, py + 4) < 0.1) return '#6b4426';
    return wet ? '#63402a' : '#c29b64';
  });
}

// ---------- Cây trồng: thêm giai đoạn ----------

const SEEDLING = [
  '...oo....oo...',
  '..obbo..obbo..',
  '.obBBbo.oBBbo.',
  'oobbbboooobbo.',
  '.obbbbbbbbbo..',
  '..oooooooooo..',
];
function seedling() {
  return draw(14, 6, x => {
    x.drawImage(sprite(SEEDLING), 0, 0);
    dot(x, '#c8a070', 3, 2); dot(x, '#c8a070', 10, 2);
    dot(x, '#8fd65a', 7, 0); dot(x, '#4fa83a', 7, 1);
  });
}

function flowering() {
  return draw(14, 10, x => {
    x.drawImage(SPR_grow(), 0, 0);
    const flo = (cx, cy, col) => {
      dot(x, '#ffffff', cx, cy - 1); dot(x, '#ffffff', cx - 1, cy); dot(x, '#ffffff', cx + 1, cy); dot(x, '#ffffff', cx, cy + 1);
      dot(x, col, cx, cy);
    };
    flo(2, 2, '#f7d547'); flo(11, 1, '#ff8fb1'); flo(6, 3, '#f7d547'); flo(12, 5, '#ff8fb1'); flo(1, 5, '#ff8fb1');
  });
}
const SPR_grow = () => sprite(GROW);

function sick() {
  const pal = { ...PAL, g: '#c9b93a', l: '#e8de78', d: '#8a7418' };
  return draw(14, 10, x => {
    x.drawImage(sprite(GROW, pal), 0, 0);
    for (const [px, py] of [[3, 3], [10, 4], [6, 6], [8, 2], [4, 7], [11, 7], [7, 8]]) { dot(x, '#7a4a22', px, py); dot(x, '#7a4a22', px + 1, py); }
    // lá rũ xuống
    dot(x, '#c9b93a', 0, 4); dot(x, '#8a7418', 0, 5); dot(x, '#c9b93a', 13, 4); dot(x, '#8a7418', 13, 5);
  });
}

const DEAD = [
  '.b......b.....',
  '.bb....bb..b..',
  '..b.b..b..bb..',
  '...bbb.bb.b...',
  '.b..bbbbbb....',
  '..bb.bBBb..b..',
  '...bbbBBbbb...',
  '....bBBBB.....',
  '..ooooooooo...',
];
function dead() {
  return draw(14, 9, x => {
    x.drawImage(sprite(DEAD, { ...PAL, b: '#a08050', B: '#6b4c26' }), 0, 0);
    dot(x, '#d9c090', 1, 0); dot(x, '#d9c090', 8, 1); dot(x, '#d9c090', 5, 3);
  });
}

const ROTTEN = [
  '......dd......',
  '....ddggdd....',
  '..ddggllggdd..',
  '.dgglggggkggd.',
  '.dggggkgggggd.',
  'dggd.dgd.dggd.',
  'dgd..dgd..dgd.',
  'dd...dgd...dd.',
  '.....dgd......',
  '....ddgdd.....',
];
function rotten() {
  const pal = { ...PAL, g: '#7a8a4a', l: '#98a86a', d: '#4a5528', k: '#2a2a1a' };
  return draw(14, 10, x => {
    x.drawImage(sprite(ROTTEN, pal), 0, 0);
    dot(x, '#2a2a1a', 9, 5); dot(x, '#2a2a1a', 3, 2);
  });
}

// ---------- Vật nuôi mới ----------

function pigFrame(step) {
  return draw(20, 14, x => {
    const P = '#f7a8bc', PD = '#e07890', PL = '#ffd0dc';
    const hs = step ? [3, 4, 4, 3] : [4, 3, 3, 4];
    [5, 8, 13, 16].forEach((lx, i) => leg(x, lx, 14 - hs[i], hs[i], PD));
    blob(x, P, 11, 6, 6, 4);
    rect(x, PD, 6, 10, 11, 1);
    rect(x, PL, 8, 3, 5, 1);
    // đuôi xoắn
    dot(x, PD, 19, 4); dot(x, PD, 19, 5); dot(x, PD, 18, 3); dot(x, OUT, 19, 3);
    // tai
    blob(x, PD, 7, 2, 1, 1);
    blob(x, P, 6, 7, 3, 3);
    blob(x, '#f08fa4', 2, 8, 1, 1);
    dot(x, OUT, 1, 8); dot(x, OUT, 2, 9);
    dot(x, '#2a2a2a', 5, 6); dot(x, '#ffffff', 5, 5 + 0);
    dot(x, '#2a2a2a', 5, 6);
    dot(x, '#f4a0a8', 6, 8); dot(x, '#f4a0a8', 7, 8);
  });
}

// đơn giản hoá: vẽ lại gà con bằng khối
function chickBlob(step) {
  return draw(8, 8, x => {
    const Y = '#ffe25a', YD = '#d9a520';
    // chân
    rect(x, '#f59a23', 3, step ? 7 : 6, 1, step ? 1 : 2);
    rect(x, '#f59a23', 5, step ? 6 : 7, 1, step ? 2 : 1);
    blob(x, Y, 4, 4, 2, 2);
    dot(x, YD, 5, 5); dot(x, YD, 6, 4);
    dot(x, '#2a2a2a', 3, 3);
    dot(x, '#f59a23', 0, 3); dot(x, '#f59a23', 1, 3);
    dot(x, Y, 6, 2);
  });
}

function pigletFrame(step) {
  return draw(12, 9, x => {
    const P = '#f7a8bc', PD = '#e07890';
    const hs = step ? [2, 1, 1, 2] : [1, 2, 2, 1];
    [4, 6, 8, 10].forEach((lx, i) => leg(x, lx, 9 - hs[i] - 1, hs[i] + 1, PD));
    blob(x, P, 7, 4, 3, 2);
    dot(x, PD, 11, 2); dot(x, PD, 11, 3);
    blob(x, PD, 4, 1, 0, 0);
    blob(x, P, 3, 5, 2, 2);
    blob(x, '#f08fa4', 1, 5, 0, 1);
    dot(x, '#2a2a2a', 3, 4);
    dot(x, OUT, 0, 5); dot(x, OUT, 1, 5);
  });
}

function calfFrame(step) {
  return draw(16, 13, x => {
    const hs = step ? [4, 3, 3, 4] : [3, 4, 4, 3];
    [5, 8, 11, 13].forEach((lx, i) => leg(x, lx, 13 - hs[i], hs[i], '#f3ead2'));
    blob(x, '#fff8ea', 10, 5, 4, 3);
    rect(x, '#a4703f', 9, 3, 3, 2); rect(x, '#a4703f', 12, 5, 2, 2);
    dot(x, '#fff8ea', 15, 4); rect(x, '#5c3a1a', 15, 4, 1, 3);
    blob(x, '#fff8ea', 4, 5, 3, 3);
    rect(x, '#a4703f', 5, 3, 2, 2);
    rect(x, '#f4a0a8', 1, 6, 3, 2); dot(x, OUT, 2, 7);
    dot(x, '#2a2a2a', 4, 4);
    dot(x, '#a4703f', 7, 2); dot(x, '#a4703f', 7, 3);
  });
}

function lambFrame(step) {
  return draw(13, 10, x => {
    const hs = step ? [2, 1, 1, 2] : [1, 2, 2, 1];
    [4, 6, 8, 10].forEach((lx, i) => leg(x, lx, 10 - hs[i] - 1, hs[i] + 1, '#3d3030'));
    blob(x, '#ffffff', 8, 4, 4, 3);
    for (const [cx, cy] of [[5, 2], [8, 1], [11, 2], [12, 4]]) blob(x, '#ffffff', cx, cy, 1, 1);
    ell(x, '#ffffff', 8, 4, 4, 3);
    dot(x, '#e8e0cc', 10, 6); dot(x, '#e8e0cc', 7, 6);
    blob(x, '#4a3838', 3, 5, 2, 2);
    dot(x, '#ffffff', 2, 4 + 0);
    dot(x, '#ffffff', 3, 4);
    dot(x, '#ffffff', 1, 4);
    dot(x, '#2a2a2a', 2, 5); dot(x, '#f4a0a8', 5, 6);
  });
}

function puppyFrame(step) {
  return draw(11, 10, x => {
    const Qc = '#d98a3a', W = '#fbe7c6';
    const hs = step ? [2, 1, 1, 2] : [1, 2, 2, 1];
    [4, 5, 8, 9].forEach((lx, i) => leg(x, lx, 10 - hs[i] - 1, hs[i] + 1, i % 2 ? W : Qc));
    // đuôi cong lên
    rect(x, Qc, 10, 2, 1, 3); dot(x, OUT, 10, 1); dot(x, OUT, 9, 2); dot(x, OUT, 10, 5);
    blob(x, Qc, 6, 5, 3, 2);
    rect(x, W, 4, 6, 3, 1);
    blob(x, Qc, 3, 4, 2, 2);
    // tai cụp
    rect(x, '#8a4a18', 5, 2, 2, 3); dot(x, OUT, 5, 1); dot(x, OUT, 6, 1);
    rect(x, W, 1, 5, 2, 2);
    dot(x, '#2a2a2a', 0, 5); dot(x, '#2a2a2a', 3, 3);
  });
}

const crowFrame = up => draw(12, 9, x => {
  const B = '#2e2e42', BL = '#4a4a62';
  rect(x, B, 10, up ? 6 : 5, 2, 2);
  const wy = up ? 0 : 0;
  blob(x, B, 6, up ? 6 : 4, 3, 2);
  if (up) {
    for (const [wx, w, y] of [[8, 2, 0], [7, 4, 1], [6, 5, 2], [5, 5, 3]]) { rect(x, '#15151f', wx - 1, y, w + 2, 1); rect(x, BL, wx, y, w, 1); }
    rect(x, '#15151f', 5, 4, 5, 1);
  } else {
    for (const [wx, w, y] of [[4, 6, 6], [4, 6, 7], [5, 5, 8]]) { rect(x, '#15151f', wx - 1, y, w + 2, 1); rect(x, BL, wx, y, w, 1); }
  }
  const hy = up ? 5 : 3;
  blob(x, B, 3, hy, 1, 1);
  dot(x, '#f59a23', 0, hy); dot(x, '#f59a23', 1, hy); dot(x, '#f7d547', 0, hy + 1 - 1);
  dot(x, '#ffffff', 3, hy - 1);
  void wy;
});

// ---------- Vật dưới đất ----------

function stinkFrame(phase) {
  return paint(7, 9, (px, py) => {
    const c = 3 + Math.round(2 * Math.sin((py + phase * 3) * 0.9));
    if (px === c || px === c + 1) return py < 3 ? '#b8e07a' : '#7fc14a';
    if (px === c - 1 && py % 3 === 1) return '#4fa83a';
    return null;
  });
}

function mud() {
  return paint(40, 22, (px, py) => {
    const dx = (px - 19.5) / 20, dy = (py - 10.5) / 11;
    const ang = Math.atan2(dy, dx);
    const rr = Math.hypot(dx, dy) * (1 + 0.07 * Math.sin(ang * 3 + 1) + 0.05 * Math.sin(ang * 5));
    if (rr > 1) return null;
    if (rr > 0.9) return hash(px, py) < 0.6 ? '#6b4a2a' : null;
    if (rr > 0.78) return '#7a5834';
    const n = hash(px, py);
    if (n < 0.03) return '#a8845a';
    if ((px + py * 2) % 9 === 0 && n < 0.5) return '#5c3f22';
    return n < 0.4 ? '#6b4a2a' : '#5e4024';
  });
}

function nest(withEgg) {
  return draw(16, 10, x => {
    blob(x, '#d9b13a', 8, 6, 7, 3, '#5c3a1a');
    ell(x, '#8a6a20', 8, 5, 5, 2);
    if (withEgg) blob(x, '#fff8ea', 8, 4, 2, 2, '#6b4a2a');
    if (withEgg) dot(x, '#ffffff', 7, 3);
    // rơm phía trước
    rect(x, '#d9b13a', 2, 7, 12, 2);
    rect(x, '#f0d060', 3, 7, 10, 1);
    for (const [sx, sy] of [[1, 5], [14, 5], [0, 7], [15, 7], [3, 2], [12, 2]]) dot(x, '#f0d060', sx, sy);
    line(x, '#5c3a1a', 3, 9, 12, 9);
    for (const sx of [4, 7, 10]) dot(x, '#a8841c', sx, 8);
  });
}

// ---------- Công trình còn thiếu ----------

function well() {
  return draw(16, 24, x => {
    // chân giếng đá
    rect(x, OUT, 0, 13, 16, 11);
    rect(x, '#b8b8b0', 1, 14, 14, 9);
    for (let yy = 16; yy < 23; yy += 3) {
      rect(x, '#8a8a84', 1, yy, 14, 1);
      for (let xx = 1 + ((yy / 3) % 2) * 3; xx < 15; xx += 6) rect(x, '#8a8a84', xx, yy - 2, 1, 2);
    }
    rect(x, '#d8d8d0', 1, 14, 14, 1);
    // miệng giếng có nước
    rect(x, OUT, 2, 11, 12, 4);
    rect(x, '#1f6fd1', 3, 12, 10, 2);
    rect(x, '#5fb8ff', 5, 12, 3, 1);
    // cột + mái
    for (const px of [1, 13]) { rect(x, OUT, px, 3, 3, 10); rect(x, '#b07a45', px + 1, 3, 1, 10); }
    rect(x, OUT, 0, 4, 16, 1);
    for (let i = 1; i < 4; i++) rect(x, '#b8352b', 1 + i, i, 14 - 2 * i, 1);
    rect(x, '#ef7a6a', 3, 1, 10, 1);
    // dây + xô
    rect(x, '#e0c79a', 8, 5, 1, 4);
    rect(x, OUT, 6, 8, 5, 5);
    rect(x, '#c98c4a', 7, 9, 3, 3);
    rect(x, '#8a5a2b', 7, 11, 3, 1);
    rect(x, '#ffffff', 7, 9, 3, 1);
  });
}

function board() {
  return draw(24, 24, x => {
    for (const px of [4, 18]) { rect(x, OUT, px, 15, 3, 9); rect(x, '#b07a45', px + 1, 15, 1, 9); }
    rect(x, OUT, 0, 0, 24, 18);
    rect(x, '#c98c4a', 1, 1, 22, 16);
    rect(x, '#e0a868', 1, 1, 22, 2);
    rect(x, '#8a5a2b', 1, 15, 22, 2);
    // giấy ghim
    const paper = (px, py, w, h, tilt, col = '#ffffff') => {
      rect(x, OUT, px, py, w, h);
      rect(x, col, px + 1, py + 1, w - 2, h - 2);
      for (let yy = py + 2; yy < py + h - 2; yy += 2) rect(x, '#8a8a8a', px + 2, yy, w - 4 - (tilt ? 1 : 0), 1);
      dot(x, '#e5452f', px + (w >> 1), py + 1);
    };
    paper(3, 3, 7, 9, 0);
    paper(12, 4, 8, 8, 1, '#fff4c0');
    paper(9, 8, 5, 6, 0, '#cfeaff');
  });
}

// ---------- Đồ trang trí ----------

function scarecrow() {
  return draw(16, 26, x => {
    rect(x, OUT, 7, 10, 2, 16); rect(x, '#8a5a2b', 7, 10, 1, 16);
    rect(x, OUT, 0, 12, 16, 3); rect(x, '#b07a45', 1, 13, 14, 1);
    for (const [sx, sy] of [[0, 10], [1, 11], [0, 14], [14, 10], [15, 11], [15, 14], [1, 15], [14, 15]]) dot(x, '#f0cf5a', sx, sy);
    rect(x, OUT, 3, 13, 10, 9); rect(x, '#3f8ce0', 4, 14, 8, 7);
    rect(x, '#e5452f', 5, 15, 3, 3); rect(x, '#f7d547', 9, 17, 2, 3);
    dot(x, '#ffffff', 6, 16); dot(x, '#ffffff', 10, 18);
    for (const sx of [4, 6, 9, 11]) dot(x, '#f0cf5a', sx, 22);
    for (const sx of [5, 8, 10]) dot(x, '#c9a13a', sx, 23);
    blob(x, '#e8c98a', 8, 7, 3, 3);
    // mũ rơm
    rect(x, OUT, 2, 4, 12, 3); rect(x, '#e8c34a', 3, 5, 10, 1);
    rect(x, OUT, 4, 0, 8, 5); rect(x, '#f0cf5a', 5, 1, 6, 3);
    rect(x, '#e5452f', 5, 3, 6, 1);
    // mặt
    dot(x, '#2a2a2a', 6, 7); dot(x, '#2a2a2a', 10, 7); dot(x, '#f59a23', 8, 8);
    for (const sx of [6, 8, 10]) dot(x, '#5c3a1a', sx, 10);
  });
}

function flowerPot() {
  return draw(10, 10, x => {
    line(x, '#2f6b1f', 3, 5, 3, 7); line(x, '#2f6b1f', 5, 3, 5, 7); line(x, '#2f6b1f', 7, 4, 7, 7);
    dot(x, '#4fa83a', 2, 6); dot(x, '#4fa83a', 8, 6);
    const fl = (cx, cy, col) => { for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) dot(x, col, cx + dx, cy + dy); dot(x, '#f7d547', cx, cy); };
    fl(3, 3, '#ff8fb1'); fl(5, 1, '#e5452f'); fl(7, 3, '#ffffff');
    rect(x, OUT, 1, 7, 8, 3); rect(x, '#d9704a', 2, 7, 6, 2);
    rect(x, '#f08a62', 2, 7, 6, 1); rect(x, OUT, 2, 9, 6, 1);
  });
}

function lamp() {
  return draw(8, 22, x => {
    rect(x, OUT, 3, 9, 2, 13); rect(x, '#8a5a2b', 3, 9, 1, 13);
    rect(x, OUT, 1, 20, 6, 2);
    // đèn lồng đỏ
    rect(x, OUT, 2, 0, 4, 2); rect(x, '#f7d547', 3, 0, 2, 1);
    blob(x, '#e5452f', 4, 5, 2, 2);
    rect(x, '#ff7a5a', 3, 3, 1, 4);
    rect(x, '#f7d547', 4, 3, 1, 4);
    rect(x, OUT, 2, 8, 4, 1); dot(x, '#f7d547', 3, 9); dot(x, '#f7d547', 5, 9);
    dot(x, '#f7d547', 4, 9);
  });
}

function bench() {
  return draw(20, 12, x => {
    for (const px of [1, 15]) { rect(x, OUT, px, 6, 4, 6); rect(x, '#a8a8a0', px + 1, 7, 2, 4); }
    rect(x, OUT, 0, 2, 20, 6);
    rect(x, '#d0d0c8', 1, 3, 18, 3);
    rect(x, '#ededE6', 1, 3, 18, 1);
    rect(x, '#a8a8a0', 1, 6, 18, 1);
    rect(x, '#9a9a92', 4, 4, 1, 2); rect(x, '#9a9a92', 13, 3, 1, 2);
  });
}

// ---------- Biểu tượng trạng thái ----------

const HEART = ['.ooo.ooo.', 'orrrorrro', 'orwrrrrro', 'orrrrrrro', '.orrrrro.', '..orrro..', '...oro...', '....o....'];
const HUNGRY = ['....oooo.', '...orrrRo', '..orwrrRo', '..orrrRo.', '.oWorRo..', 'oWWoooo..', 'oWo......', '.o.......'];
const SICKF = ['..ooooo..', '.oMMMMMo.', 'oMMMMMMMo', 'oMkMMMkMo', 'oMMMMMMMo', 'oMMkkkMMo', 'oMkMMMkMo', '.oMMMMMo.', '..ooooo..'];
const ZZZ = ['UUUUU....', '..UU.....', '.UU...UUU', 'UUUUU..U.', '.....UU..', '.....UUUU'];
const MILKB = ['..oo..', '.oWWo.', '.oUUo.', 'oWWWWo', 'owUUwo', 'owwwwo', 'owwwwo', 'owwwwo', '.oooo.'];
const PREG = ['..ooooo..', '.onnnnno.', 'onwnnnnno'.slice(0, 9), 'onrrnrrno', 'onrrrrrno', 'onnrrrnno', '.onnrnno.', '..ooooo..'];

// ---------- Vật phẩm (icon 14x14) ----------

const CROP_TINT = { cai: '#4fa83a', carot: '#f59a23', lua: '#d19a1c', cachua: '#e5452f', bap: '#f7d547', dau: '#d8388a', bingo: '#e07a10', duahau: '#3d8c2a' };

function seedBag(id, ripe) {
  return draw(14, 14, x => {
    const tint = CROP_TINT[id] || '#4fa83a';
    rect(x, OUT, 1, 2, 12, 12);
    rect(x, '#f3ead2', 2, 3, 10, 10);
    rect(x, '#d9c9a0', 11, 3, 1, 10);
    // miệng túi gấp
    rect(x, OUT, 1, 0, 12, 4);
    rect(x, tint, 2, 1, 10, 2);
    for (let px = 2; px < 12; px += 2) dot(x, '#ffffff', px, 1);
    // hình cây in trên túi
    if (ripe) x.drawImage(fit(ripe, 8, 8), 3, 5);
  });
}

function bottle(liquid, cap, mark, rays) {
  return draw(14, 14, x => {
    if (rays) for (const [a, b, c, d] of [[1, 2, 3, 4], [12, 2, 10, 4], [0, 8, 2, 8], [13, 8, 11, 8], [6, 0, 6, 1]]) line(x, '#f7d547', a, b, c, d);
    rect(x, OUT, 4, 0, 6, 3); rect(x, cap, 5, 1, 4, 1);
    rect(x, OUT, 5, 3, 4, 2); rect(x, '#dff3ff', 6, 3, 2, 2);
    rect(x, OUT, 2, 5, 10, 9);
    rect(x, liquid, 3, 6, 8, 7);
    rect(x, '#ffffff', 4, 6, 1, 3);
    rect(x, '#ffffff', 4, 9, 6, 3);
    mark(x);
  });
}
const sack = (body, band, mark) => draw(14, 14, x => {
  rect(x, OUT, 2, 3, 10, 11); rect(x, body, 3, 4, 8, 9);
  rect(x, OUT, 3, 0, 8, 4); rect(x, body, 4, 1, 6, 2);
  rect(x, band, 3, 3, 8, 1);
  rect(x, '#ffffff', 4, 6, 6, 5);
  mark(x);
});

function boneIcon() {
  return draw(14, 14, x => {
    line(x, OUT, 3, 10, 10, 3); line(x, OUT, 4, 11, 11, 4); line(x, OUT, 2, 9, 9, 2);
    line(x, '#fff8ea', 3, 10, 10, 3); line(x, '#e8dcc0', 4, 10, 11, 3);
    for (const [cx, cy] of [[2, 12], [3, 11], [1, 11], [2, 10], [11, 1], [12, 2], [10, 2], [11, 3]]) blob(x, '#fff8ea', cx, cy, 0, 0);
    blob(x, '#fff8ea', 2, 11, 1, 1); blob(x, '#fff8ea', 11, 2, 1, 1);
    line(x, '#fff8ea', 3, 10, 10, 3);
  });
}

function hayIcon() {
  return draw(14, 14, x => {
    rect(x, OUT, 1, 3, 12, 10);
    rect(x, '#f0cf5a', 2, 4, 10, 8);
    for (const [a, b] of [[3, 5], [6, 4], [9, 6], [4, 8], [8, 9], [3, 11]]) rect(x, '#c9a13a', a, b, 3, 1);
    rect(x, '#e5452f', 6, 3, 2, 10);
    rect(x, '#fff0a0', 3, 4, 3, 1);
    for (const px of [2, 5, 9, 11]) { dot(x, '#f0cf5a', px, 2); dot(x, '#f0cf5a', px + 1, 1); }
  });
}

function toolHand() {
  return draw(14, 14, x => {
    const S = '#ffd7b0', SD = '#e0a878';
    rect(x, OUT, 3, 5, 9, 9); rect(x, S, 4, 6, 7, 7);
    for (const [fx, fh] of [[3, 4], [5, 5], [7, 5], [9, 4]]) { rect(x, OUT, fx, 1 + (5 - fh), 2, fh); rect(x, S, fx, 2 + (5 - fh), 1, fh - 1); rect(x, SD, fx + 1, 2 + (5 - fh), 1, fh - 1); }
    rect(x, OUT, 0, 6, 4, 3); rect(x, S, 1, 7, 3, 1);
    rect(x, SD, 5, 12, 6, 1);
    rect(x, OUT, 4, 13, 7, 1);
  });
}
function toolHoe() {
  return draw(14, 14, x => {
    line(x, OUT, 13, 0, 4, 9); line(x, OUT, 12, 0, 3, 9);
    line(x, '#b07a45', 12, 1, 4, 9);
    rect(x, OUT, 0, 9, 8, 5); rect(x, '#b8b8b8', 1, 10, 6, 3); rect(x, '#e8e8e8', 1, 10, 6, 1);
    rect(x, OUT, 1, 13, 5, 1);
  });
}
function toolCan() {
  return draw(14, 14, x => {
    rect(x, OUT, 10, 3, 3, 2); line(x, OUT, 8, 8, 12, 3); line(x, OUT, 8, 9, 12, 4);
    line(x, '#5fb8ff', 8, 8, 12, 4);
    rect(x, OUT, 12, 1, 2, 4); rect(x, '#8ccfff', 12, 2, 1, 2);
    rect(x, OUT, 1, 5, 9, 9); rect(x, '#3f8ce0', 2, 6, 7, 7); rect(x, '#8ccfff', 2, 6, 1, 6); rect(x, '#1f6fd1', 2, 11, 7, 2);
    rect(x, OUT, 0, 3, 3, 8); rect(x, '#3b2412', 0, 4, 2, 6); rect(x, '#3f8ce0', 1, 5, 1, 4);
    rect(x, OUT, 3, 4, 6, 1);
  });
}
function toolShovel() {
  return draw(14, 14, x => {
    line(x, OUT, 12, 0, 8, 6); line(x, OUT, 11, 0, 7, 6);
    line(x, '#b07a45', 11, 0, 8, 5);
    rect(x, OUT, 10, 0, 4, 2);
    blob(x, '#c8c8c8', 6, 9, 2, 2);
    rect(x, '#c8c8c8', 5, 6, 3, 2);
    rect(x, '#ffffff', 5, 8, 1, 3); rect(x, OUT, 4, 13, 5, 1);
  });
}
function toolBasket() {
  return draw(14, 14, x => {
    line(x, OUT, 3, 5, 5, 1); line(x, OUT, 5, 1, 9, 1); line(x, OUT, 9, 1, 11, 5);
    line(x, '#c98c4a', 4, 5, 5, 2); line(x, '#c98c4a', 5, 2, 9, 2); line(x, '#c98c4a', 9, 2, 10, 5);
    // rau củ
    blob(x, '#e5452f', 4, 5, 1, 1); blob(x, '#4fa83a', 7, 4, 1, 1); blob(x, '#f59a23', 10, 5, 1, 1);
    rect(x, OUT, 0, 6, 14, 8); rect(x, '#c98c4a', 1, 7, 12, 6);
    for (let yy = 8; yy < 13; yy += 2) rect(x, '#8a5a2b', 1, yy, 12, 1);
    for (let xx = 2; xx < 13; xx += 3) rect(x, '#e0a868', xx, 7, 1, 6);
  });
}

function fromDeco(src, sx, sy, w, h, dx = 0, dy = 0) {
  return draw(14, 14, x => x.drawImage(src, sx, sy, w, h, dx, dy, w, h));
}

function makeItems(ripe, deco) {
  const items = {};
  for (const id of Object.keys(CROP_TINT)) items[`seed_${id}`] = seedBag(id, ripe[id]);
  const cross = x => { rect(x, '#e5452f', 6, 8, 2, 4); rect(x, '#e5452f', 5, 9, 4, 2); };
  const skull = x => { rect(x, OUT, 5, 8, 4, 3); dot(x, '#ffffff', 5, 9); dot(x, '#ffffff', 8, 9); rect(x, OUT, 6, 11, 2, 1); };
  const pills = x => { rect(x, '#f59a23', 5, 9, 2, 2); rect(x, '#e5452f', 8, 10, 2, 2); };
  const spark = x => { dot(x, '#f7d547', 6, 9); dot(x, '#f7d547', 5, 10); dot(x, '#f7d547', 7, 10); dot(x, '#f7d547', 6, 11); dot(x, '#b36ad6', 6, 10); };
  items.pesticide = bottle('#5cb85c', '#e5452f', skull);
  items.growth = bottle('#b36ad6', '#f7d547', spark, true);
  items.medicine = bottle('#ff8fb1', '#ffffff', cross);
  items.vitamin = bottle('#f59a23', '#4fa83a', pills);
  items.fertilizer = sack('#8a5a2b', '#5c3a1a', x => { rect(x, '#4fa83a', 6, 7, 2, 3); dot(x, '#8fd65a', 5, 7); dot(x, '#8fd65a', 8, 6); rect(x, '#3d8c2a', 7, 10, 1, 1); });
  items.feed_ga = sack('#f7d547', '#d19a1c', x => { rect(x, '#d19a1c', 5, 8, 4, 2); dot(x, '#e5452f', 5, 7); dot(x, '#e5452f', 6, 7); dot(x, '#f59a23', 4, 8); });
  items.feed_heo = sack('#ff9db4', '#d8687f', x => { blob(x, '#f08fa4', 7, 8, 1, 1); dot(x, OUT, 6, 8); dot(x, OUT, 8, 8); });
  items.hay = hayIcon();
  items.dogfood = boneIcon();
  items.deco_scarecrow = fromDeco(deco.deco_scarecrow, 1, 0, 14, 14);
  items.deco_flower = fromDeco(deco.deco_flower, 0, 0, 10, 10, 2, 3);
  items.deco_lamp = fromDeco(deco.deco_lamp, 0, 0, 8, 14, 3, 0);
  items.deco_bench = fit(deco.deco_bench, 14, 9);
  const b = draw(14, 14, x => x.drawImage(items.deco_bench, 0, 3));
  items.deco_bench = b;
  items.hand = toolHand(); items.hoe = toolHoe(); items.can = toolCan(); items.shovel = toolShovel(); items.basket = toolBasket();
  return items;
}

const DECO = { deco_scarecrow: scarecrow(), deco_flower: flowerPot(), deco_lamp: lamp(), deco_bench: bench() };
const RIPE_SPR = Object.fromEntries(Object.entries(RIPE).map(([k, rows]) => [k, sprite(rows)]));

const pair = (fn, pal) => { const left = [fn(0), fn(1)]; return { left, right: left.map(flip) }; };

export const SPR = {
  soil: { untilled: soilTile('untilled'), tilledWet: soilTile('tilledWet'), tilledDry: soilTile('tilledDry') },
  seedling: seedling(),
  sprout: sprite(SPROUT),
  grow: sprite(GROW),
  flowering: flowering(),
  sick: sick(),
  dead: dead(),
  rotten: rotten(),
  ripe: RIPE_SPR,
  problem: { weed: sprite(WEED), bug: sprite(BUG), dry: sprite(DROP) },
  product: { trung: sprite(EGG), sua: sprite(MILK), len: sprite(WOOL) },
  grain: sprite(GRAIN),
  bubble: sprite(BUBBLE),
  sparkle: sprite(SPARKLE),
  arrow: sprite(ARROW),
  sign: sprite(SIGN),
  tuft: sprite(TUFT),
  flowers: [sprite(['.p.', 'pyp', '.p.'], { ...PAL, p: '#ff8fb1' }), sprite(['.w.', 'wyw', '.w.']), sprite(['.u.', 'uwu', '.u.'])],
  plot: plotTile(false),
  plotDry: plotTile(true),
  wild: wildTile(),
  select: selectTile(),
  tree: tree(),
  bush: bush(),
  house: house(),
  shed: shed(),
  shop: shop(),
  mailbox: mailbox(),
  doghouse: doghouse(),
  coop: coop(),
  trough: trough(),
  hay: hay(),
  signboard: signboard(),
  well: well(),
  board: board(),
  deco: DECO,
  animal: {
    ga: animalFrames(CHICKEN),
    heo: pair(pigFrame),
    bo: animalFrames(COW),
    cuu: animalFrames(SHEEP),
    dog: animalFrames(DOG, DOG_PAL),
  },
  baby: { ga: pair(chickBlob), heo: pair(pigletFrame), bo: pair(calfFrame), cuu: pair(lambFrame), dog: pair(puppyFrame) },
  crow: pair(i => crowFrame(!!i)),
  eggGround: sprite(['..oo..', '.oWWo.', 'oWwWWo', 'oWWWWo', 'oWWWWo', '.oWWo.', '..oo..']),
  poop: sprite(['....oo...', '...obbo..', '..obbbbo.', '...oBBo..', '.oobbbbbo', 'obbwbbbBo', 'oBbbbbBBo', '.oooooooo'].map(r => r.slice(0, 9))),
  stink: [stinkFrame(0), stinkFrame(1)],
  mud: mud(),
  nestEmpty: nest(false),
  nestEgg: nest(true),
  status: {
    hungry: sprite(HUNGRY), sick: sprite(SICKF), heart: sprite(HEART), zzz: sprite(ZZZ),
    milk: sprite(MILKB), wool: sprite(WOOL), pregnant: sprite(PREG),
  },
};
SPR.items = makeItems(RIPE_SPR, DECO);

const icons = {};
export function icon(key) {
  return icons[key] ??= (SPR.items[key] || SPR.ripe[key] || SPR.product[key] || SPR.baby[key]?.left[0] || SPR.animal[key]?.left[0] || SPR[key]).toDataURL();
}
