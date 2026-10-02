// Sprite cây trồng Phase 3: mỗi loại cây một bộ hình riêng cho 5 giai đoạn (hạt, mầm, cây non,
// ra hoa/trái non, chín) cộng bệnh, héo, chết theo đúng dáng cây đó. Vẽ bằng code như art.js:
// khối lá/trái tô sáng từ trên-trái, viền 1px sẫm theo màu điểm bên cạnh.
// SPR4.crop[id] = { stages: [s0..s4], sick, rotten, dead }: canvas rộng 16, gốc chạm đáy.
// SPR4.produce[id]: biểu tượng nông sản 12x12 cho 8 cây mới.
import { canvas, hash } from './art.js';

const PI = Math.PI, UP = -PI / 2, DOWN = PI / 2;

const R = {
  leaf:  ['#1a4212', '#2f6b1f', '#3d8c2a', '#56a83a', '#8fd65a', '#c8f08a'],
  dleaf: ['#163a14', '#24561c', '#2f7028', '#3f8a34', '#5ea84a', '#8fcc6a'],
  blue:  ['#1c4038', '#2a5e4c', '#3f7e62', '#5e9e7a', '#8cc49c', '#c4e6c8'],
  scal:  ['#1f4a2a', '#2e6e3a', '#47924c', '#6cb466', '#a0d890', '#d8f4c8'],
  grey:  ['#1e3e22', '#2e5a32', '#46784a', '#64965e', '#8cb87e', '#b8d8a8'],
  purp:  ['#2a1636', '#46264f', '#62386c', '#82508a', '#a874ac', '#d0a8d0'],
  red:   ['#4e1006', '#8a1e12', '#c0301f', '#e5452f', '#ff7a5a', '#ffd2c4'],
  orange:['#5e2c06', '#a4520c', '#d8761a', '#f59a23', '#ffbe5a', '#ffe0a8'],
  yellow:['#7a5a0c', '#c08a16', '#e8b82a', '#f7d547', '#fff09a', '#fffbe0'],
  gold:  ['#6e4e10', '#a07a1c', '#c89c2c', '#e2bc44', '#f4d870', '#fff0b0'],
  white: ['#8a8478', '#c4bcae', '#e6ded0', '#f6f0e4', '#ffffff', '#ffffff'],
  cream: ['#7c8a5c', '#a8b884', '#ccdaa8', '#e4eecc', '#f6faea', '#ffffff'],
  soil:  ['#3b2412', '#5c3a1a', '#7a4e26', '#946236', '#b07c4c', '#c8986a'],
  tan:   ['#5a3e1c', '#8a6232', '#b48a52', '#d2ac74', '#e8cc9c', '#f6e6c6'],
  wood:  ['#3e2610', '#5c3a1a', '#8a5a2b', '#b07a45', '#d0a068', '#e8c494'],
  mag:   ['#3e0c22', '#6e1c3e', '#9c2e58', '#c04a78', '#e07aa0', '#f8b8d0'],
  kohl:  ['#24103a', '#3e1c5e', '#5c2e84', '#7a46a8', '#a070c8', '#d0b0e8'],
  kpale: ['#2e4a3e', '#4a6e58', '#6e9478', '#94b898', '#bcd8b4', '#e2f0d8'],
  wmel:  ['#0f3a14', '#1f5a24', '#2f7a30', '#5cb85c', '#8cd47a', '#c8f0b0'],
  cab:   ['#3e6a44', '#5a8c5a', '#7aae72', '#a2cc8c', '#c8e6ac', '#ecf8d8'],
  pleaf: ['#2f4a12', '#4a6a1c', '#6a8c2c', '#8aa83e', '#b4c862', '#dce49a'],
  lav:   ['#5a3a78', '#8a62a8', '#b494cc', '#d8c4e8', '#f2eaf8', '#ffffff'],
  black: ['#141414', '#222222', '#333333', '#444444', '#666666', '#888888'],
};
const L = R.leaf;
// Màu lá: bệnh thì vàng, hỏng thì ô-liu; tra theo vị trí trong dải.
const LEAFY = new Map();
for (const k of ['leaf', 'dleaf', 'blue', 'scal', 'grey', 'purp', 'cream', 'cab', 'kpale', 'pleaf']) R[k].forEach((c, i) => LEAFY.set(c, i));
const SICK = ['#5a4a10', '#7a6a18', '#a8962a', '#c9b93a', '#e0d478', '#f0e8a8'];
const OLIVE = ['#2a2c16', '#3e4524', '#56602f', '#707c40', '#8c9a5a', '#aab87c'];
const DRY = ['#3e2810', '#5c3e1c', '#7c5a30', '#a08050', '#c4a070', '#dcc498'];

// ---------- màu ----------
const rgb = c => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lum = c => { const [r, g, b] = rgb(c); return 0.3 * r + 0.59 * g + 0.11 * b; };
const shade = (c, f) => hex(rgb(c).map(v => v * f));
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };

// ---------- lưới điểm ảnh ----------
class G {
  constructor(w, h, ol = true) { this.w = w; this.h = h; this.ol = ol; this.a = new Array(w * h).fill(null); }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.a[y * this.w + x] : null; }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.a[y * this.w + x] = c;
    return this;
  }
  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.set(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), typeof c === 'function' ? c(t) : c);
    }
    return this;
  }
  // Đường cong bậc hai qua điểm điều khiển; c có thể là hàm theo t (0 gốc → 1 ngọn).
  curve(x0, y0, cx, cy, x1, y1, c) {
    const n = Math.ceil(Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy)) * 2 + 2;
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), d = t * t;
      this.set(Math.round(a * x0 + b * cx + d * x1), Math.round(a * y0 + b * cy + d * y1), typeof c === 'function' ? c(t) : c);
    }
    return this;
  }
  // Khối lá/trái: trục dài theo góc ang, nửa dài len, nửa rộng wid. Mặc định đầu nhọn (lá), round = bầu.
  shape(cx, cy, len, wid, ang, ramp, o = {}) {
    const ca = Math.cos(ang), sa = Math.sin(ang), r = Math.max(len, wid), n = ramp.length;
    const lo = o.lo ?? 1, hi = o.hi ?? n - 2, ext = Math.ceil(r) + 1;
    for (let y = Math.floor(cy - ext); y <= cy + ext; y++) for (let x = Math.floor(cx - ext); x <= cx + ext; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const u = (dx * ca + dy * sa) / len, v = (-dx * sa + dy * ca) / wid;
      if (Math.abs(u) > 1) continue;
      const f = o.round ? Math.sqrt(1 - u * u) : (u > 0 ? 1 - u * u : Math.sqrt(1 - u * u));
      if (Math.abs(v) > f) continue;
      if (o.rib && Math.abs(v * wid) < 0.5 && u > -0.9 && u < (o.ribTo ?? 0.6)) { this.set(x, y, o.rib); continue; }
      const t = (1 - (dx * 0.6 + dy * 0.8) / r) / 2;
      const i = lo + Math.round(t * (hi - lo) + (o.bias ?? 0));
      this.set(x, y, typeof o.fill === 'function' ? o.fill(dx, dy, i) : ramp[Math.max(0, Math.min(n - 1, i))]);
    }
    if (o.spec) this.set(cx - len * 0.45, cy - wid * 0.55, ramp[n - 1]);
    return this;
  }
  ball(cx, cy, rx, ry, ramp, o = {}) { return this.shape(cx, cy, rx, ry, 0, ramp, { round: true, ...o }); }
  map(fn) { const g = new G(this.w, this.h, this.ol); this.a.forEach((c, i) => { g.a[i] = c && fn(c, i % this.w, Math.floor(i / this.w)); }); return g; }
}

function outline(g) {
  const o = new G(g.w + 2, g.h + 2, false);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) o.set(x + 1, y + 1, g.get(x, y));
  const base = o.a.slice(), at = (x, y) => (x >= 0 && y >= 0 && x < o.w && y < o.h ? base[y * o.w + x] : null);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    if (at(x, y)) continue;
    let best = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = at(x + dx, y + dy);
      if (c && (!best || lum(c) < lum(best))) best = c;
    }
    if (best) o.set(x, y, shade(best, 0.5));
  }
  return o;
}
function toCanvas(g0) {
  const g = g0.ol ? outline(g0) : g0;
  const c = canvas(16, g.h), x = c.getContext('2d'), ox = Math.floor((16 - g.w) / 2);
  for (let y = 0; y < g.h; y++) for (let i = 0; i < g.w; i++) {
    const col = g.get(i, y);
    if (col) { x.fillStyle = col; x.fillRect(ox + i, y, 1, 1); }
  }
  return c;
}

// ---------- héo, bệnh, chết: biến đổi trên chính dáng cây ----------
// Rũ xuống: thấp lại theo squash, mép ngoài sụp thêm sag điểm ảnh.
function wilt(g, squash, sag) {
  const H = Math.max(3, Math.round(g.h * squash)), o = new G(g.w, H, g.ol), cx = (g.w - 1) / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < g.w; x++) {
    const s = Math.round(sag * ((x - cx) / cx) ** 2), syb = Math.round((H - 1 - y - s) / squash);
    if (H - 1 - y - s < 0) continue;
    o.set(x, y, g.get(x, g.h - 1 - syb));
  }
  return o;
}
function sickOf(g) {
  return wilt(g, 0.95, 1).map((c, x, y) => {
    if (!LEAFY.has(c)) return c;
    if (hash(x * 3 + 1, y * 5 + 2) < 0.14) return '#7a4a22';
    return SICK[LEAFY.get(c)];
  });
}
function rottenOf(g) {
  return wilt(g, 0.9, 2).map((c, x, y) => {
    if (LEAFY.has(c)) return OLIVE[LEAFY.get(c)];
    if (hash(x * 7 + 3, y * 3 + 1) < 0.2) return '#2a1e12';
    return mix(c, '#3a2614', 0.5);
  });
}
function deadOf(g) {
  return wilt(g, 0.82, 2.5).map(c => {
    const l = lum(c);
    return DRY[l < 50 ? 0 : l < 85 ? 1 : l < 120 ? 2 : l < 160 ? 3 : l < 200 ? 4 : 5];
  });
}

// ---------- chi tiết dùng chung ----------
const W = 13;            // lưới có viền: 13 → 15 sau viền
const WN = 15;           // lưới không viền (cây lá mảnh)
function mound(seeds) {
  const g = new G(W, 5);
  g.shape(6.5, 4.5, 5.4, 2.3, 0, R.soil, { round: true, lo: 3, hi: 5 });
  seeds(g);
  return g;
}
const dots = (g, pts, c) => pts.forEach(([x, y, col]) => g.set(x, y, col ?? c));
function star(g, x, y, petal, mid) { dots(g, [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], petal); g.set(x, y, mid); }
// Lá kép lông chim (cà rốt): cuống mảnh, lá chét hai bên.
function frond(g, x0, y0, x1, y1, ramp = L) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  const px = -(y1 - y0) / n, py = (x1 - x0) / n;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
    g.set(x, y, t > 0.8 ? ramp[4] : ramp[2]);
    if (i > 1 && i % 2 === 0 && i < n) {
      g.set(x + Math.round(px), y + Math.round(py), ramp[3]);
      g.set(x - Math.round(px), y - Math.round(py), ramp[4]);
    }
  }
}

// ================= 16 loại cây =================
const DEF = {};

// ---- Cải xanh: 2 lá mầm tròn → bụi lá xòe cuống trắng → ngồng hoa vàng ----
function bokchoy(g, sx, sy) {
  const b = g.h, cx = 6.5;
  for (const [x, y, l, w, a] of [
    [cx - 3.1 * sx, b - 4.6 * sy, 2.4 * sy, 1.7 * sx, -2.3],
    [cx + 3.1 * sx, b - 4.6 * sy, 2.4 * sy, 1.7 * sx, -0.84],
    [cx - 1.4 * sx, b - 6.0 * sy, 2.6 * sy, 1.8 * sx, -1.9],
    [cx + 1.4 * sx, b - 6.0 * sy, 2.6 * sy, 1.8 * sx, -1.24],
  ]) g.shape(x, y, l, w, a, L, { round: true, rib: R.cream[3], ribTo: -0.15, bias: -0.3 });
  g.shape(cx, b - 1.9 * sy, 2.0 * sy, 1.6 * sx, UP, R.cream, { round: true });
}
DEF.cai = {
  s0: () => mound(g => dots(g, [[3, 2], [6, 1], [9, 2], [5, 3], [8, 3]], '#1e140c')),
  s1: () => { const g = new G(W, 6); g.line(6, 5, 6, 3, L[2]); g.line(4, 3, 8, 3, L[2]);
    g.shape(3.4, 2.4, 2.1, 1.7, PI + 0.3, L, { round: true }); g.shape(9.6, 2.4, 2.1, 1.7, -0.3, L, { round: true }); return g; },
  s2: () => { const g = new G(W, 9); bokchoy(g, 0.95, 1.0); return g; },
  s3: () => { const g = new G(W, 13); g.line(6, 7, 6, 1, L[2]);
    bokchoy(g, 1.05, 1.3);
    dots(g, [[6, 0, L[4]], [5, 1, R.yellow[2]], [7, 1, L[4]], [6, 1, L[3]], [5, 2, L[4]], [7, 2, R.yellow[2]]]); return g; },
  s4: () => { const g = new G(W, 15);
    g.line(6, 8, 3, 2, L[2]); g.line(6, 8, 6, 1, L[2]); g.line(6, 8, 10, 2, L[2]);
    bokchoy(g, 1.1, 1.38);
    for (const [x, y] of [[3, 2], [6, 1], [10, 2]]) {
      star(g, x, y, R.yellow[3], R.yellow[1]); g.set(x - 1, y - 1, R.yellow[4]); g.set(x + 1, y + 1, R.yellow[2]);
    }
    return g; },
};

// ---- Cà rốt: lá lông chim mảnh, ngọn củ cam ló khỏi đất ----
function shoulder(g, rows) {
  const pal = { o: '#6e3208', Q: '#b8600f', O: '#f59a23', P: '#ffbe5a', y: '#ffe0a8', d: L[1], g: L[2] };
  const oy = g.h - rows.length, ox = Math.floor((g.w - rows[0].length) / 2);
  rows.forEach((r, j) => [...r].forEach((ch, i) => pal[ch] && g.set(ox + i, oy + j, pal[ch])));
}
DEF.carot = {
  s0: () => mound(g => { g.line(2, 3, 10, 3, R.soil[1]); dots(g, [[3, 3], [6, 3], [9, 3]], R.tan[4]); }),
  s1: () => { const g = new G(WN, 6, false);
    g.line(7, 5, 4, 1, L[3]); g.set(4, 0, L[4]); g.line(7, 5, 10, 1, L[3]); g.set(10, 0, L[4]);
    frond(g, 7, 5, 7, 1); g.set(7, 5, L[1]); return g; },
  s2: () => { const g = new G(WN, 9, false);
    for (const [x, y] of [[2, 2], [5, 0], [9, 0], [12, 2], [7, 1]]) frond(g, 7, 8, x, y);
    g.set(7, 8, L[1]); g.set(6, 8, L[1]); return g; },
  s3: () => { const g = new G(WN, 12, false);
    for (const [x, y] of [[1, 4], [3, 1], [6, 0], [9, 0], [12, 1], [14, 4], [7, 2]]) frond(g, 7, 9, x, y);
    shoulder(g, ['..ddgd..', '.oPPOOo.', '..oOOo..']); return g; },
  s4: () => { const g = new G(WN, 15, false);
    for (const [x, y] of [[0, 6], [1, 2], [4, 0], [7, 0], [10, 0], [13, 2], [14, 6], [5, 3], [9, 3]]) frond(g, 7, 10, x, y);
    shoulder(g, ['..ddggd..', '.oPPyOOo.', 'oPPOOOOQo', '.oOOOOQo.', '..oOOQo..']); return g; },
};

// ---- Lúa: mạ xanh mảnh → bụi lúa → bông lúa trĩu vàng ----
function blades(g, list, colAt) {
  const b = g.h - 1;
  for (const [bx, cx, cy, tx, ty] of list) g.curve(bx, b, cx, cy, tx, ty, colAt);
}
// Bông lúa rủ từ ngọn ra ngoài: chuỗi hạt chính, hạt phụ phía trong mỗi hai hàng.
function panicle(g, x, y, dir, n, ramp) {
  for (let k = 0; k < n; k++) {
    const gx = x + dir * Math.round(k * 0.5), gy = y + k;
    g.set(gx, gy, ramp[k % 2 ? 3 : 4]);
    if (k % 2 === 1 && k < n - 1) g.set(gx - dir, gy, ramp[2]);
  }
  g.set(x, y, ramp[5]);
}
const greenBlade = t => (t < 0.25 ? L[1] : t < 0.75 ? L[2] : L[3]);
DEF.lua = {
  s0: () => mound(g => dots(g, [[3, 1, R.gold[3]], [4, 1, R.gold[4]], [7, 2, R.gold[3]], [8, 2, R.gold[4]], [5, 3, R.gold[2]], [6, 3, R.gold[4]], [9, 1, R.gold[2]], [10, 1, R.gold[4]]])),
  s1: () => { const g = new G(WN, 6, false);
    blades(g, [[7, 6, 3, 4, 0], [7, 7, 2, 8, 0], [8, 9, 3, 11, 1], [7, 5, 4, 3, 2]], greenBlade); return g; },
  s2: () => { const g = new G(WN, 11, false);
    blades(g, [[7, 3, 5, 0, 3], [7, 5, 3, 3, 0], [7, 6, 2, 6, 0], [7, 8, 1, 8, 0], [8, 9, 2, 11, 0], [8, 11, 4, 14, 2], [7, 10, 6, 13, 6], [7, 4, 6, 1, 7]], greenBlade);
    g.set(7, 10, L[1]); g.set(8, 10, L[1]); return g; },
  s3: () => { const g = new G(WN, 14, false);
    blades(g, [[7, 2, 7, 0, 8], [7, 4, 4, 1, 4], [8, 12, 5, 14, 9], [7, 3, 9, 0, 11]], greenBlade);
    for (const [cx, cy, tx, ty, d] of [[6, 4, 4, 1, -1], [7, 3, 7, 0, 1], [9, 4, 10, 1, 1]]) {
      g.curve(7, 13, cx, cy, tx, ty, L[2]); panicle(g, tx, ty, d, 5, L);
    }
    blades(g, [[7, 5, 6, 2, 9], [8, 9, 7, 12, 9], [7, 4, 9, 1, 11], [8, 10, 9, 13, 10]], greenBlade);
    g.set(7, 13, L[1]); g.set(8, 13, L[1]); return g; },
  s4: () => { const g = new G(16, 15, false);
    const gb = t => (t < 0.25 ? '#5e7020' : t < 0.65 ? '#8a9a30' : R.gold[3]);
    blades(g, [[7, 3, 9, 0, 12], [8, 12, 9, 15, 12], [7, 5, 6, 2, 8], [8, 10, 6, 13, 8]], gb);
    for (const [cx, cy, tx, ty, d, n] of [[5, 3, 4, 1, -1, 8], [7, 1, 7, 0, -1, 6], [9, 1, 9, 1, 1, 6], [11, 3, 12, 1, 1, 8]]) {
      g.curve(8, 14, cx, cy, tx, ty, t => (t < 0.5 ? '#6e7a24' : R.gold[2])); panicle(g, tx, ty, d, n, R.gold);
    }
    blades(g, [[7, 8, 4, 5, 11], [8, 9, 7, 12, 11]], gb);
    g.set(7, 14, '#4e5e1a'); g.set(8, 14, '#4e5e1a'); return g; },
};

// ---- Cà chua: lá xẻ răng cưa, cọc gỗ, hoa vàng, trái non xanh → đỏ ----
function stake(g, x, top) { g.line(x, top, x, g.h - 1, R.wood[3]); g.set(x, top, R.wood[5]); }
function tomLeaf(g, x, y, a, s = 1) {
  g.shape(x, y, 1.6 * s, 0.9 * s, a, L);
  g.shape(x + Math.cos(a + 1.3) * 1.4 * s, y + Math.sin(a + 1.3) * 1.4 * s, 1.1 * s, 0.7 * s, a + 0.9, L);
  g.shape(x + Math.cos(a - 1.3) * 1.4 * s, y + Math.sin(a - 1.3) * 1.4 * s, 1.1 * s, 0.7 * s, a - 0.9, L);
}
function tomPlant(g, top) {
  const b = g.h - 1;
  for (let y = b; y >= top; y--) g.set(6 + ((y >> 2) % 2 ? 0 : 0), y, L[1]);
  const span = b - top;
  for (let i = 0; i < 5; i++) {
    const y = Math.round(b - span * (0.25 + i * 0.17)), dir = i % 2 ? 1 : -1;
    g.line(6, y, 6 + dir * 3, y - 2, L[2]);
    tomLeaf(g, 6.5 + dir * 3.4, y - 2, dir > 0 ? -0.5 : PI + 0.5, 1);
  }
  tomLeaf(g, 6.5, top, UP, 0.9);
}
DEF.cachua = {
  s0: () => mound(g => dots(g, [[3, 2], [6, 2], [9, 2], [5, 3], [8, 3]], R.yellow[4])),
  s1: () => { const g = new G(W, 6); g.line(6, 5, 6, 2, L[2]);
    g.shape(3.8, 1.8, 2.3, 0.8, PI + 0.45, L); g.shape(9.2, 1.8, 2.3, 0.8, -0.45, L);
    g.set(6, 1, L[3]); g.set(6, 0, L[4]); return g; },
  s2: () => { const g = new G(W, 11); stake(g, 11, 0); tomPlant(g, 2); g.set(10, 5, R.tan[4]); return g; },
  s3: () => { const g = new G(W, 15); stake(g, 11, 0); tomPlant(g, 2);
    g.set(10, 5, R.tan[4]); g.set(10, 10, R.tan[4]);
    for (const [x, y] of [[2, 4], [9, 7], [4, 9]]) star(g, x, y, R.yellow[3], R.yellow[1]);
    for (const [x, y] of [[3.5, 12], [9.5, 11.5], [8, 13]]) g.ball(x, y, 1.3, 1.3, L, { spec: true });
    return g; },
  s4: () => { const g = new G(W, 16); stake(g, 11, 0); tomPlant(g, 2);
    g.set(10, 5, R.tan[4]); g.set(10, 10, R.tan[4]);
    for (const [x, y, r] of [[3, 8, 1.6], [4.6, 10.4, 1.6], [2.5, 12.6, 1.5], [9.2, 9.6, 1.7], [8.4, 12.8, 1.6], [6, 4.5, 1.3]])
      g.ball(x, y, r, r, R.red, { spec: true });
    dots(g, [[3, 6], [9, 7], [8, 11], [5, 9]], L[3]);
    return g; },
};

// ---- Bắp: thân cao dần, lá dài cong, ra cờ, trái có râu ----
// Lá bắp: dải dài vươn lên rồi cong rủ xuống ở ngọn.
function cornLeaf(g, y, dir, len, tipCol = L[4]) {
  const x0 = dir < 0 ? 6 : 7, x1 = x0 + dir * len;
  g.curve(x0, y, x0 + dir * len * 0.5, y - len * 0.7, x1, y + 1, t => (t > 0.85 ? tipCol : t < 0.35 ? L[2] : L[3]));
}
function cornStalk(g, top) { for (let y = g.h - 1; y >= top; y--) { g.set(6, y, L[3]); g.set(7, y, y % 4 ? L[1] : L[2]); } }
function tassel(g, col, dark) {
  g.line(6, 0, 6, 3, col);
  dots(g, [[5, 1], [4, 2], [3, 3], [7, 1], [8, 2], [9, 3]], col);
  dots(g, [[5, 2], [7, 2], [4, 3], [8, 3]], dark);
}
DEF.bap = {
  s0: () => mound(g => { for (const [x, y] of [[3, 1], [8, 2]]) { g.set(x, y, R.yellow[4]); g.set(x + 1, y, R.yellow[3]); g.set(x, y + 1, R.yellow[2]); g.set(x + 1, y + 1, R.yellow[1]); } }),
  s1: () => { const g = new G(W, 7); g.line(6, 6, 6, 1, L[2]); g.set(6, 0, L[4]);
    g.curve(6, 4, 8, 1, 10, 2, L[3]); g.curve(6, 5, 4, 3, 3, 4, L[3]); return g; },
  s2: () => { const g = new G(W, 12); cornStalk(g, 3);
    cornLeaf(g, 9, -1, 6); cornLeaf(g, 6, 1, 6); cornLeaf(g, 4, -1, 4);
    g.curve(6, 3, 5, 1, 6, 0, L[4]); g.curve(7, 3, 8, 1, 9, 1, L[3]); return g; },
  s3: () => { const g = new G(W, 18); cornStalk(g, 3); tassel(g, R.gold[4], R.gold[2]);
    cornLeaf(g, 15, -1, 6); cornLeaf(g, 12, 1, 6); cornLeaf(g, 9, -1, 6); cornLeaf(g, 6, 1, 5);
    g.shape(9.0, 11.6, 2.4, 1.1, UP + 0.4, L, { round: true, bias: 0.5 });
    dots(g, [[10, 8, '#f4a0a8'], [11, 8, '#e88a90'], [10, 7, '#f8c8c8'], [11, 7, '#f4a0a8']]);
    return g; },
  s4: () => { const g = new G(W, 20); cornStalk(g, 3); tassel(g, R.tan[4], R.tan[2]);
    cornLeaf(g, 17, -1, 6, R.gold[3]); cornLeaf(g, 13, 1, 6, R.gold[3]); cornLeaf(g, 10, -1, 6, R.gold[3]); cornLeaf(g, 6, 1, 5, R.gold[3]);
    const kern = (dx, dy, i) => R.yellow[Math.min(5, ((Math.floor(dx + 9) + Math.floor(dy + 9)) & 1 ? 2 : 3) + (i > 3 ? 1 : 0))];
    g.shape(9.6, 12.4, 3.2, 1.6, UP + 0.35, R.yellow, { round: true, fill: kern });
    g.shape(8.4, 14.2, 2.4, 0.8, UP + 0.7, L); g.shape(10.9, 14.0, 2.2, 0.7, UP + 0.05, L);
    dots(g, [[11, 8, R.wood[2]], [12, 7, R.wood[3]], [11, 7, R.wood[3]], [12, 8, R.wood[1]], [10, 8, R.wood[3]]]);
    return g; },
};

// ---- Dâu tây: bụi thấp lá ba chét, hoa trắng, trái đỏ ----
function trifol(g, x, y, s = 1) {
  g.shape(x - 1.3 * s, y + 0.3, 1.3 * s, 1.0 * s, PI + 0.4, L, { round: true });
  g.shape(x + 1.3 * s, y + 0.3, 1.3 * s, 1.0 * s, -0.4, L, { round: true });
  g.shape(x, y - 1.0 * s, 1.3 * s, 1.1 * s, UP, L, { round: true });
}
function berry(g, x, y) {
  g.shape(x, y, 1.9, 1.5, DOWN, R.red);
  g.set(x - 0.5, y - 0.2, R.yellow[4]); g.set(x + 0.6, y + 0.8, R.yellow[4]);
  dots(g, [[x - 1, y - 2], [x, y - 2], [x + 1, y - 2]].map(([a, b]) => [Math.floor(a), Math.floor(b)]), L[3]);
}
function strawBush(g) {
  const b = g.h;
  g.line(6, b - 1, 3, b - 5, L[1]); g.line(6, b - 1, 10, b - 5, L[1]); g.line(6, b - 1, 6, b - 6, L[1]);
  trifol(g, 3.3, b - 4.5, 1.05); trifol(g, 9.7, b - 4.5, 1.05); trifol(g, 6.5, b - 5.8, 1.15);
}
DEF.dau = {
  s0: () => mound(g => { g.set(6, 1, R.wood[2]); g.set(6, 2, R.wood[1]); g.set(5, 2, R.wood[2]); g.set(7, 2, R.wood[2]); dots(g, [[6, 0], [5, 1], [7, 1]], L[3]); }),
  s1: () => { const g = new G(W, 5); g.line(6, 4, 6, 2, L[1]); trifol(g, 6.5, 2.4, 0.85); return g; },
  s2: () => { const g = new G(W, 8); strawBush(g); return g; },
  s3: () => { const g = new G(W, 9); strawBush(g);
    for (const [x, y] of [[2, 6], [10, 2], [7, 7]]) { star(g, x, y, R.white[4], R.yellow[2]); g.set(x + 1, y + 1, R.white[3]); }
    g.ball(10.5, 7, 1.1, 1.1, R.cream); return g; },
  s4: () => { const g = new G(W, 10); strawBush(g);
    berry(g, 2.6, 8); berry(g, 10.3, 8); berry(g, 6.5, 8.6);
    star(g, 11, 2, R.white[4], R.yellow[2]); return g; },
};

// ---- Bí ngô: dây bò, lá to tròn, hoa vàng to, trái xanh → cam ----
function pumLeaf(g, x, y, s = 1, ramp = L) {
  g.shape(x, y, 2.5 * s, 2.2 * s, UP, ramp, { round: true });
  g.set(x - 0.2, y - 2.2 * s, null); g.set(x - 2.4 * s, y - 0.2, null); g.set(x + 2.2 * s, y - 0.2, null);
  g.line(Math.floor(x), Math.floor(y), Math.floor(x - 1), Math.floor(y - 1.5 * s), ramp[4]);
}
function tendril(g, x, y, dir) { dots(g, [[x, y], [x + dir, y - 1], [x + 2 * dir, y - 1], [x + 2 * dir, y], [x + dir, y]], L[3]); }
DEF.bingo = {
  s0: () => mound(g => { for (const x of [3, 8]) { g.set(x, 1, R.white[4]); g.set(x + 1, 1, R.white[3]); g.set(x, 2, R.white[3]); g.set(x + 1, 2, R.white[2]); } }),
  s1: () => { const g = new G(W, 6); g.line(6, 5, 6, 3, L[2]);
    g.shape(3.5, 2.6, 2.6, 1.5, PI + 0.25, L, { round: true }); g.shape(9.5, 2.6, 2.6, 1.5, -0.25, L, { round: true });
    g.shape(1.3, 1.9, 1.0, 0.9, PI + 0.25, R.white, { round: true }); return g; },
  s2: () => { const g = new G(W, 8); g.curve(6, 7, 3, 6, 0, 7, L[2]); g.curve(6, 7, 9, 7, 12, 6, L[2]);
    pumLeaf(g, 3.6, 3.8, 1); pumLeaf(g, 9.8, 3.4, 1.05); pumLeaf(g, 6.6, 5.6, 0.8); tendril(g, 10, 6, 1); return g; },
  s3: () => { const g = new G(W, 10); g.curve(6, 9, 3, 8, 0, 9, L[2]); g.curve(6, 9, 9, 9, 12, 8, L[2]);
    pumLeaf(g, 3.4, 3.5, 1.1); pumLeaf(g, 9.8, 3.2, 1.1);
    g.shape(3.0, 7.0, 2.2, 1.7, UP - 0.4, R.yellow, { round: true, lo: 2 }); dots(g, [[1, 5], [4, 5], [2, 9]], R.yellow[3]); g.set(3, 7, R.orange[2]);
    g.ball(9.4, 7.8, 2.4, 1.8, R.cab, { lo: 2, fill: (dx, dy, i) => (Math.abs(dx) < 0.6 || Math.abs(Math.abs(dx) - 1.6) < 0.4 ? R.cab[2] : R.cab[Math.min(5, i + 1)]) });
    g.set(9, 5, R.wood[2]); g.set(9, 6, R.leaf[1]);
    return g; },
  s4: () => { const g = new G(W, 12); g.curve(6, 11, 2, 9, 0, 10, L[2]);
    pumLeaf(g, 2.8, 3.2, 1.0); pumLeaf(g, 10.4, 2.8, 1.0);
    g.ball(6.5, 7.8, 5.6, 3.9, R.orange, { fill: (dx, dy, i) => R.orange[Math.max(1, Math.min(5, i - ([-3, 0, 3].some(k => Math.abs(dx - k) < 0.6) ? 1 : 0)))] });
    g.set(3, 6, R.orange[5]); g.set(4, 5, R.orange[5]);
    g.line(6, 4, 7, 2, R.wood[2]); g.set(7, 2, R.wood[3]); tendril(g, 8, 2, 1);
    return g; },
};

// ---- Dưa hấu: dây bò lá xẻ thùy xám xanh, trái sọc ----
function melLeaf(g, x, y, s = 1) {
  const r = R.grey;
  g.shape(x, y - 1.1 * s, 1.6 * s, 0.75 * s, UP, r);
  g.shape(x - 1.2 * s, y, 1.4 * s, 0.7 * s, PI + 0.5, r);
  g.shape(x + 1.2 * s, y, 1.4 * s, 0.7 * s, -0.5, r);
  g.set(x, y, r[2]);
}
// Sọc dưa: dải sẫm ngoằn ngoèo chạy dọc trên nền xanh nhạt.
const stripe = (dx, dy, i) => {
  const p = ((dx + 30 + 0.7 * Math.sin(dy * 1.3)) % 3 + 3) % 3;
  return p < 1.1 ? R.wmel[Math.min(5, i > 3 ? 4 : 3)] : R.wmel[i > 3 ? 2 : 1];
};
DEF.duahau = {
  s0: () => mound(g => { for (const x of [3, 7, 10]) { g.set(x, 2, R.black[1]); g.set(x + 1, 2, R.black[3]); } g.set(5, 1, R.black[1]); g.set(5, 2, R.black[2]); }),
  s1: () => { const g = new G(W, 6); g.line(6, 5, 6, 3, L[2]);
    g.shape(4.0, 2.7, 2.1, 1.2, PI + 0.3, R.grey, { round: true }); g.shape(9.0, 2.7, 2.1, 1.2, -0.3, R.grey, { round: true });
    g.shape(10.8, 2.0, 0.9, 0.8, -0.3, R.black, { round: true }); return g; },
  s2: () => { const g = new G(W, 8); g.curve(6, 7, 3, 6, 0, 7, R.grey[2]); g.curve(6, 7, 9, 7, 12, 6, R.grey[2]);
    melLeaf(g, 3.2, 4, 1.15); melLeaf(g, 9.8, 3.6, 1.15); melLeaf(g, 6.5, 5.2, 0.9); tendril(g, 10, 6, 1); return g; },
  s3: () => { const g = new G(W, 10); g.curve(6, 9, 3, 8, 0, 9, R.grey[2]); g.curve(6, 9, 9, 9, 12, 8, R.grey[2]);
    melLeaf(g, 3, 3.6, 1.2); melLeaf(g, 9.8, 3.2, 1.2);
    star(g, 7, 2, R.yellow[3], R.yellow[1]); star(g, 1, 7, R.yellow[3], R.yellow[1]);
    g.ball(8.6, 7.6, 2.2, 1.6, R.wmel, { fill: stripe }); return g; },
  s4: () => { const g = new G(W, 12); g.curve(6, 11, 2, 9, 0, 10, R.grey[2]);
    melLeaf(g, 2.6, 3.0, 1.15); melLeaf(g, 10.4, 2.8, 1.15);
    g.ball(6.5, 7.8, 5.8, 3.7, R.wmel, { fill: stripe });
    g.set(3, 5, R.wmel[5]); g.set(4, 5, R.wmel[5]); g.set(2, 6, R.wmel[5]);
    g.line(6, 4, 7, 3, R.grey[2]); tendril(g, 8, 3, 1);
    return g; },
};

// ---- Hành lá: lá ống thẳng xanh, gốc trắng, ngồng hoa tròn trắng ----
function tube(g, bx, tx, ty, bend = 0) {
  const b = g.h - 1, n = b - ty;
  for (let i = 0; i <= n; i++) {
    const t = i / n, y = b - i, x = Math.round(bx + (tx - bx) * t + bend * t * t * 2);
    const base = i < 2;
    g.set(x, y, base ? (i === 0 ? R.white[2] : R.white[4]) : i === 2 ? R.scal[5] : t > 0.85 ? R.scal[4] : R.scal[3]);
    if (t < 0.6) g.set(x + 1, y, base ? R.white[2] : R.scal[2]);
  }
  if (bend) g.set(Math.round(tx + bend * 2 + Math.sign(bend)), ty + 1, R.scal[4]);
}
DEF.hanhla = {
  s0: () => mound(g => { g.ball(6.5, 2.4, 1.6, 1.4, R.white); g.set(6, 0, R.scal[3]); g.set(6, 1, R.scal[2]); g.set(5, 4, R.white[1]); g.set(8, 4, R.white[1]); }),
  s1: () => { const g = new G(WN, 6, false); tube(g, 6, 5, 0); tube(g, 8, 9, 1); return g; },
  s2: () => { const g = new G(WN, 10, false); tube(g, 5, 3, 1); tube(g, 7, 7, 0); tube(g, 8, 10, 1); tube(g, 6, 5, 3); return g; },
  s3: () => { const g = new G(WN, 13, false);
    g.line(9, 12, 11, 3, R.scal[3]); g.ball(11.5, 2, 1.8, 1.7, R.white); g.set(12, 2, R.scal[5]); g.set(11, 3, R.white[2]);
    tube(g, 4, 2, 2, -0.5); tube(g, 6, 5, 0); tube(g, 7, 8, 1); tube(g, 5, 4, 4); return g; },
  s4: () => { const g = new G(WN, 15, false);
    tube(g, 3, 1, 3, -1); tube(g, 5, 3, 0); tube(g, 6, 6, 1); tube(g, 7, 8, 0); tube(g, 8, 11, 1, 1); tube(g, 9, 13, 4, 0.5); tube(g, 5, 4, 5); tube(g, 7, 9, 5);
    return g; },
};

// ---- Đậu phộng: lá kép 4 lá chét tròn nhỏ, hoa vàng cam, củ lạc dưới gốc ----
// Lá kép đậu phộng: 4 lá chét bầu dục xếp hai cặp ở đầu cuống.
function pinnate(g, x, y, s = 1, ramp = L) {
  g.line(6, g.h - 1, Math.round(x), Math.round(y), ramp[1]);
  for (const [dx, dy, a] of [[-1.2, -1.2, UP - 0.6], [1.2, -1.2, UP + 0.6], [-1.4, 0.7, PI + 0.3], [1.4, 0.7, -0.3]])
    g.shape(x + dx * s, y + dy * s, 1.25 * s, 0.85 * s, a, ramp, { round: true });
}
function pod(g, x, y) {
  g.ball(x, y, 1.2, 0.9, R.tan, { lo: 2 }); g.ball(x + 1.9, y - 0.4, 1.2, 0.9, R.tan, { lo: 2 });
  g.set(x + 0.9, y - 0.2, R.tan[1]); g.set(x - 0.4, y - 0.4, R.tan[5]); g.set(x + 1.5, y - 0.8, R.tan[5]);
}
const peaBush = (g, ramp = L) => { for (const [x, y, s] of [[2.8, g.h - 3.6, 0.95], [10.2, g.h - 3.6, 0.95], [6.5, g.h - 6.0, 1.05]]) pinnate(g, x, y, s, ramp); };
DEF.dauphong = {
  s0: () => mound(g => { pod(g, 3, 2); pod(g, 8, 2.4); }),
  s1: () => { const g = new G(W, 5); g.line(6, 4, 6, 1, L[2]);
    g.ball(4.4, 3.2, 1.5, 1.0, ['#4a3a10', '#7a6a28', '#a89a48', '#c8b860', '#e0d488', '#f4ecb8']); g.ball(8.6, 3.2, 1.5, 1.0, ['#4a3a10', '#7a6a28', '#a89a48', '#c8b860', '#e0d488', '#f4ecb8']);
    g.ball(5.6, 0.9, 0.9, 0.7, L); g.ball(7.4, 0.9, 0.9, 0.7, L); return g; },
  s2: () => { const g = new G(W, 8); peaBush(g); return g; },
  s3: () => { const g = new G(W, 9); peaBush(g);
    for (const [x, y] of [[5, 6], [8, 5], [1, 4], [11, 3]]) { g.set(x, y, R.yellow[3]); g.set(x + 1, y, R.orange[3]); g.set(x, y - 1, R.yellow[4]); }
    return g; },
  s4: () => { const g = new G(W, 11); peaBush(g, R.pleaf);
    pod(g, 0.9, 9.6); pod(g, 9.4, 9.6); return g; },
};

// ---- Rau muống: thân ống mọc thẳng, lá hình mũi tên, hoa loa kèn trắng tím ----
// Lá mũi tên: thân nhọn, hai tai nhọn ở gốc chĩa ngược ra sau.
function arrow(g, x, y, a, s = 1) {
  g.shape(x, y, 1.9 * s, 0.7 * s, a, L, { lo: 2 });
  const bx = x - Math.cos(a) * 1.5 * s, by = y - Math.sin(a) * 1.5 * s;
  g.set(bx + Math.cos(a + 2.4) * 1.1, by + Math.sin(a + 2.4) * 1.1, L[3]);
  g.set(bx + Math.cos(a - 2.4) * 1.1, by + Math.sin(a - 2.4) * 1.1, L[2]);
}
function morning(g, x, y) { g.ball(x, y, 1.4, 1.2, R.white, { lo: 2 }); g.set(x, y, '#c070a0'); g.set(x, y + 1.3, R.white[1]); }
DEF.raumuong = {
  s0: () => mound(g => { for (const x of [4, 8]) { g.line(x, 3, x, 0, L[3]); g.set(x, 0, R.scal[5]); g.set(x, 2, L[1]); } }),
  s1: () => { const g = new G(W, 6); g.line(6, 5, 6, 2, L[2]);
    g.shape(4.2, 2.0, 2.0, 0.85, PI + 0.55, L); g.shape(8.8, 2.0, 2.0, 0.85, -0.55, L); return g; },
  s2: () => { const g = new G(W, 10);
    for (const [x, y] of [[3, 4], [6, 3], [10, 4]]) g.line(6, 9, x, y, L[2]);
    arrow(g, 2.4, 2.4, UP - 0.5); arrow(g, 6.5, 1.6, UP); arrow(g, 10.6, 2.4, UP + 0.5); arrow(g, 9.6, 6.6, -0.5, 0.75); return g; },
  s3: () => { const g = new G(W, 13);
    for (const [x, y] of [[2, 5], [5, 3], [8, 3], [11, 5]]) g.line(6, 12, x, y, L[2]);
    arrow(g, 1.6, 3.4, UP - 0.5); arrow(g, 4.6, 1.8, UP - 0.15); arrow(g, 8.4, 1.8, UP + 0.15); arrow(g, 11.4, 3.4, UP + 0.5);
    arrow(g, 9.8, 8.4, -0.4, 0.75);
    morning(g, 2.4, 8.6); morning(g, 6.5, 6.4); return g; },
  s4: () => { const g = new G(W, 15);
    const tips = [[1, 6, UP - 0.8], [3.5, 2.6, UP - 0.4], [6.5, 1.6, UP], [9.5, 2.6, UP + 0.4], [12, 6, UP + 0.8]];
    for (const [x, y] of tips) g.line(6, 14, Math.round(x), Math.round(y + 2), L[2]);
    for (const [x, y, a] of tips) arrow(g, x, y, a, 0.95);
    arrow(g, 2.4, 10.0, PI + 0.4, 0.75); arrow(g, 10.6, 9.6, -0.4, 0.75);
    return g; },
};

// ---- Dưa leo: giàn tre chữ A, lá to, hoa vàng, trái dài xanh sẫm có gai ----
function aframe(g, top = 0) {
  const b = g.h - 1;
  g.line(1, b, 7, top, t => R.tan[(Math.round(t * 12) % 4) ? 3 : 1]);
  g.line(11, b, 5, top, t => R.tan[(Math.round(t * 12) % 4) ? 2 : 1]);
}
function cukeLeaf(g, x, y, s = 1) { g.shape(x, y, 1.9 * s, 1.7 * s, UP, L, { lo: 2 }); g.set(x - 0.5, y - 0.5, L[5]); }
// Trái dưa leo dài, xanh sẫm, chấm gai sáng; trái non còn hoa vàng ở đuôi.
function cuke(g, x, y, len, flower) {
  g.shape(x, y, len + 0.9, 2.0, DOWN, ['#123a18'], { round: true, lo: 0, hi: 0 });
  g.shape(x, y, len, 1.2, DOWN, R.wmel, { round: true, lo: 2, hi: 3 });
  for (let k = Math.ceil(-len + 1); k < len; k += 2) g.set(x - 0.7, y + k, R.wmel[4]);
  g.set(x, y - len - 0.6, R.leaf[2]);
  if (flower) { g.set(x, y + len + 0.4, R.yellow[3]); g.set(x - 1, y + len + 0.4, R.yellow[4]); g.set(x + 1, y + len + 0.4, R.yellow[2]); }
}
DEF.dualeo = {
  s0: () => mound(g => { for (const [x, y] of [[3, 2], [6, 1], [9, 2]]) { g.set(x, y, R.white[4]); g.set(x + 1, y, R.white[2]); } g.line(11, 4, 11, 0, R.tan[3]); }),
  s1: () => { const g = new G(W, 9); g.line(10, 8, 10, 0, t => R.tan[(Math.round(t * 8) % 4) ? 3 : 1]);
    g.line(5, 8, 5, 5, L[2]); g.shape(3.2, 4.6, 2.0, 1.2, PI + 0.3, L, { round: true }); g.shape(7.0, 4.6, 2.0, 1.2, -0.3, L, { round: true }); g.set(5, 4, L[4]); return g; },
  s2: () => { const g = new G(W, 13); aframe(g);
    g.curve(6, 12, 2, 8, 5, 3, L[2]); g.curve(6, 12, 10, 9, 8, 5, L[2]);
    cukeLeaf(g, 2.8, 8.4); cukeLeaf(g, 9.6, 8.6, 0.9); cukeLeaf(g, 4.6, 3.4, 0.9); cukeLeaf(g, 8.4, 5.0, 0.8);
    tendril(g, 6, 1, 1); return g; },
  s3: () => { const g = new G(W, 16); aframe(g);
    g.curve(6, 15, 1, 10, 5, 2, L[2]); g.curve(6, 15, 11, 10, 8, 3, L[2]);
    cukeLeaf(g, 2.2, 11.4); cukeLeaf(g, 10.6, 11.6); cukeLeaf(g, 3.6, 5.0, 0.95); cukeLeaf(g, 9.4, 5.6, 0.95);
    star(g, 6, 1, R.yellow[3], R.yellow[1]); star(g, 1, 8, R.yellow[3], R.yellow[1]); star(g, 11, 2, R.yellow[3], R.yellow[1]);
    cuke(g, 6.5, 9.0, 1.5, true); cuke(g, 8.5, 12.6, 1.3, true); return g; },
  s4: () => { const g = new G(W, 17); aframe(g);
    g.curve(6, 16, 1, 10, 5, 2, L[2]); g.curve(6, 16, 11, 10, 8, 3, L[2]);
    cukeLeaf(g, 6.5, 12.6, 0.95); cukeLeaf(g, 3.2, 4.4, 0.95); cukeLeaf(g, 9.8, 4.8, 0.95); cukeLeaf(g, 1.6, 12.8, 0.8); cukeLeaf(g, 11.4, 13.0, 0.8);
    cuke(g, 3.4, 9.4, 2.7); cuke(g, 9.6, 10.0, 2.7); star(g, 6, 1, R.yellow[3], R.yellow[1]); return g; },
};

// ---- Khoai lang: dây bò lá tim tím, hoa loa kèn tím nhạt, củ đỏ tím dưới gốc ----
function heart(g, x, y, a, s = 1) {
  g.shape(x, y, 1.7 * s, 1.4 * s, a, R.purp, { lo: 2, bias: 0.4 });
  g.set(x - Math.cos(a) * 1.7 * s, y - Math.sin(a) * 1.7 * s, null);
  g.set(x - Math.cos(a) * 0.4, y - Math.sin(a) * 0.4, R.purp[4]);
}
function tuber(g, x, y, a, len = 2.0) { g.shape(x, y, len, 1.1, a, R.mag, { round: true, spec: true }); }
DEF.khoailang = {
  s0: () => mound(g => { tuber(g, 5.5, 2.4, -0.2, 2.6); g.set(7, 0, R.purp[3]); g.set(7, 1, R.purp[2]); }),
  s1: () => { const g = new G(W, 6); g.line(6, 5, 6, 2, R.purp[2]); heart(g, 3.8, 2.6, PI + 0.4, 0.95); heart(g, 9.0, 1.8, -0.4, 0.95); return g; },
  s2: () => { const g = new G(W, 8); g.curve(6, 7, 3, 5, 0, 7, R.purp[2]); g.curve(6, 7, 9, 5, 12, 6, R.purp[2]);
    heart(g, 1.8, 4.4, UP - 0.6, 0.9); heart(g, 5.2, 2.0, UP - 0.2, 0.9); heart(g, 9.0, 2.6, UP + 0.3, 0.9); heart(g, 11.6, 5.4, UP + 0.8, 0.8); return g; },
  s3: () => { const g = new G(W, 9); g.curve(6, 8, 3, 6, 0, 8, R.purp[2]); g.curve(6, 8, 9, 6, 12, 7, R.purp[2]);
    heart(g, 1.6, 5.2, UP - 0.6, 0.9); heart(g, 4.6, 2.6, UP - 0.2, 0.9); heart(g, 11.6, 5.4, UP + 0.8, 0.85); heart(g, 7.0, 6.2, UP + 0.2, 0.75);
    g.ball(9.0, 2.4, 1.7, 1.5, R.lav, { lo: 2 }); g.set(9, 2, R.purp[1]); g.set(8, 2, R.lav[1]); g.set(9, 4, R.lav[1]); return g; },
  s4: () => { const g = new G(W, 10); g.curve(6, 9, 3, 6, 0, 8, R.purp[2]); g.curve(6, 9, 9, 6, 12, 8, R.purp[2]);
    heart(g, 1.6, 4.4, UP - 0.6, 0.9); heart(g, 5.0, 2.0, UP - 0.2, 0.95); heart(g, 9.0, 2.2, UP + 0.3, 0.95); heart(g, 11.8, 4.8, UP + 0.8, 0.85); heart(g, 7.0, 5.6, UP, 0.7);
    tuber(g, 3.0, 8.4, 0.35); tuber(g, 10.0, 8.6, -0.3, 2.2); return g; },
};

// ---- Ớt: bụi lá bóng nhọn, hoa trắng nhỏ, trái chỉ thiên xanh → đỏ ----
function chili(g, x, y, ramp) { g.shape(x, y, 1.9, 0.7, UP, ramp, { round: false, lo: 2 }); g.set(x, y + 1.7, L[1]); g.set(x, y - 1, ramp[5]); }
function chiliBush(g) {
  const b = g.h - 1, D = R.dleaf;
  g.line(6, b, 6, b - 5, D[1]); g.line(6, b - 3, 3, b - 6, D[1]); g.line(6, b - 4, 10, b - 7, D[1]);
  for (const [x, y, a, s] of [[2.4, b - 7.4, UP - 0.6, 1], [10.4, b - 8.2, UP + 0.6, 1], [6.5, b - 8.4, UP, 1.05],
    [1.8, b - 3.6, PI + 0.35, 0.9], [11.2, b - 4.2, -0.35, 0.9], [4.4, b - 5.6, UP - 0.3, 0.9], [8.6, b - 5.4, UP + 0.4, 0.9]])
    g.shape(x, y, 2.0 * s, 0.9 * s, a, D, { lo: 2 });
}
DEF.ot = {
  s0: () => mound(g => { dots(g, [[3, 2], [5, 3], [8, 2], [10, 3]], R.yellow[5]); g.set(6, 1, R.red[3]); g.set(7, 1, R.red[2]); }),
  s1: () => { const g = new G(W, 6); g.line(6, 5, 6, 2, R.dleaf[2]);
    g.shape(4.2, 2.0, 2.0, 0.8, PI + 0.5, R.dleaf, { lo: 2 }); g.shape(8.8, 2.0, 2.0, 0.8, -0.5, R.dleaf, { lo: 2 }); g.set(6, 1, R.dleaf[4]); return g; },
  s2: () => { const g = new G(W, 10); chiliBush(g); return g; },
  s3: () => { const g = new G(W, 12); chiliBush(g);
    for (const [x, y] of [[3, 2], [10, 1], [6, 5]]) star(g, x, y, R.white[4], R.yellow[3]);
    chili(g, 4.6, 7.4, R.dleaf.map((c, i) => (i < 2 ? c : R.leaf[i]))); chili(g, 8.8, 6.8, R.leaf); return g; },
  s4: () => { const g = new G(W, 13); chiliBush(g);
    chili(g, 3.4, 3.2, R.red); chili(g, 6.5, 2.0, R.red); chili(g, 9.8, 2.6, R.red); chili(g, 4.8, 7.8, R.orange); chili(g, 8.6, 7.2, R.red); chili(g, 11.4, 6.8, R.red);
    return g; },
};

// ---- Su hào: lá xanh lơ cuống dài, củ tròn mọc trên đất (xanh nhạt → tím) ----
function kohlLeaves(g, pts, from) {
  for (const [x, y, a, s] of pts) { g.line(from[0], from[1], Math.round(x), Math.round(y), R.kohl[3]); g.shape(x, y, 2.0 * s, 1.3 * s, a, R.blue, { round: true, rib: R.blue[5] }); }
}
DEF.suhao = {
  s0: () => mound(g => dots(g, [[3, 2], [6, 1], [9, 2], [5, 3], [8, 3]], R.kohl[1])),
  s1: () => { const g = new G(W, 5); g.line(6, 4, 6, 2, R.kohl[3]); g.line(4, 2, 8, 2, R.kohl[3]);
    g.shape(3.6, 1.8, 1.8, 1.3, PI + 0.3, R.blue, { round: true }); g.shape(9.4, 1.8, 1.8, 1.3, -0.3, R.blue, { round: true }); return g; },
  s2: () => { const g = new G(W, 9);
    kohlLeaves(g, [[2.8, 3.4, UP - 0.7, 0.95], [10.2, 3.4, UP + 0.7, 0.95], [6.5, 1.8, UP, 1]], [6, 6]);
    g.ball(6.5, 7.3, 1.8, 1.5, R.kpale); return g; },
  s3: () => { const g = new G(W, 11);
    kohlLeaves(g, [[2.4, 3.0, UP - 0.7, 1], [10.6, 3.0, UP + 0.7, 1], [6.5, 1.6, UP, 1.05]], [6, 7]);
    g.ball(6.5, 8.3, 2.8, 2.3, R.kpale, { spec: true });
    dots(g, [[5, 7, R.kohl[3]], [8, 8, R.kohl[3]]]); return g; },
  s4: () => { const g = new G(W, 13);
    kohlLeaves(g, [[2.4, 2.8, UP - 0.7, 1], [10.6, 2.8, UP + 0.7, 1], [6.5, 1.6, UP, 1.05], [1.2, 6.2, PI + 0.4, 0.75], [11.8, 6.2, -0.4, 0.75]], [6, 8]);
    g.ball(6.5, 9.4, 4.0, 3.3, R.kohl, { spec: true });
    dots(g, [[4, 8, R.kohl[2]], [9, 8, R.kohl[2]], [6, 11, R.kohl[2]]]); g.set(4, 7, R.kohl[5]); return g; },
};

// ---- Bắp cải: lá to tròn xanh lơ có gân, cuộn thành bắp tròn ----
function cabLeaf(g, x, y, a, s = 1) { g.shape(x, y, 2.5 * s, 2.3 * s, a, R.blue, { round: true, rib: R.blue[4], ribTo: 0.2 }); }
function cabHead(g, x, y, rx, ry) {
  g.ball(x, y, rx, ry, R.cab, { lo: 2 });
  g.curve(x - rx + 0.5, y, x - rx * 0.4, y - ry * 0.9, x + 0.5, y - ry + 0.5, R.cab[1]);
  g.curve(x + rx - 0.5, y + 0.5, x + rx * 0.3, y + ry * 0.7, x - 0.5, y + ry - 0.5, R.cab[2]);
  g.set(x - rx * 0.4, y - ry * 0.4, R.cab[5]);
}
DEF.bapcai = {
  s0: () => mound(g => dots(g, [[3, 2], [6, 1], [9, 2], [5, 3], [8, 3]], '#5a5a66')),
  s1: () => { const g = new G(W, 5); g.line(6, 4, 6, 2, R.blue[3]);
    g.shape(3.4, 2.0, 2.2, 1.4, PI + 0.15, R.blue, { round: true }); g.shape(9.6, 2.0, 2.2, 1.4, -0.15, R.blue, { round: true });
    g.set(3, 1, R.blue[5]); g.set(9, 1, R.blue[5]); return g; },
  s2: () => { const g = new G(W, 8);
    cabLeaf(g, 3.4, 3.4, UP - 0.7, 0.9); cabLeaf(g, 9.6, 3.4, UP + 0.7, 0.9); cabLeaf(g, 6.5, 2.6, UP, 0.85);
    cabLeaf(g, 2.6, 5.6, PI + 0.2, 0.75); cabLeaf(g, 10.4, 5.6, -0.2, 0.75); return g; },
  s3: () => { const g = new G(W, 10);
    cabLeaf(g, 2.8, 4.0, UP - 0.8, 0.95); cabLeaf(g, 10.2, 4.0, UP + 0.8, 0.95); cabLeaf(g, 2.2, 7.2, PI + 0.2, 0.8); cabLeaf(g, 10.8, 7.2, -0.2, 0.8);
    cabHead(g, 6.5, 5.4, 2.8, 2.5); return g; },
  s4: () => { const g = new G(W, 11);
    cabLeaf(g, 2.0, 5.0, UP - 0.9, 0.95); cabLeaf(g, 11.0, 5.0, UP + 0.9, 0.95);
    cabHead(g, 6.5, 5.0, 4.6, 4.0);
    g.shape(3.4, 8.8, 3.0, 1.6, PI - 0.25, R.blue, { round: true }); g.shape(9.6, 8.8, 3.0, 1.6, 0.25, R.blue, { round: true });
    g.line(2, 9, 5, 8, R.blue[4]); g.line(8, 8, 11, 9, R.blue[4]);
    return g; },
};

// ---------- nông sản 12x12 cho 8 cây mới ----------
const PRODUCE = {
  hanhla: () => { const g = new G(10, 10);
    for (const [x0, x1] of [[2, 6], [3, 8], [4, 9]]) g.line(x0, 9, x1, 0, t => (t < 0.3 ? R.white[4] : t > 0.8 ? R.scal[4] : R.scal[3]));
    g.line(3, 9, 7, 1, R.scal[2]); dots(g, [[1, 9], [2, 9]], R.white[2]); g.set(2, 7, '#c05a5a'); g.set(3, 7, '#c05a5a'); g.set(4, 6, '#c05a5a'); return g; },
  dauphong: () => { const g = new G(10, 10);
    g.ball(3.2, 6.6, 2.4, 2.2, R.tan, { lo: 2 }); g.ball(6.8, 3.4, 2.4, 2.2, R.tan, { lo: 2 });
    dots(g, [[4, 5], [5, 5], [5, 4]], R.tan[2]); dots(g, [[2, 7], [3, 5], [6, 2], [7, 4], [2, 6]], R.tan[5]); g.set(8, 1, R.tan[1]); return g; },
  raumuong: () => { const g = new G(10, 10);
    for (const x of [2, 4, 6]) g.line(x, 9, x + 2, 3, R.scal[4]);
    arrow(g, 3.4, 2.0, UP - 0.3, 0.9); arrow(g, 6.6, 1.8, UP + 0.1, 0.9); arrow(g, 8.4, 3.6, UP + 0.6, 0.85);
    g.line(2, 7, 6, 7, '#c05a5a'); return g; },
  dualeo: () => { const g = new G(10, 10);
    g.shape(5, 5, 4.6, 1.8, -0.75, R.dleaf, { round: true, lo: 1, hi: 4 });
    dots(g, [[3, 6], [5, 4], [7, 3], [4, 5]], R.dleaf[5]); g.set(1, 9, R.yellow[3]); g.set(9, 1, L[2]); return g; },
  khoailang: () => { const g = new G(10, 10); g.shape(5, 5.4, 4.4, 2.5, -0.4, R.mag, { round: true, spec: true });
    g.set(9, 3, R.mag[1]); g.set(0, 7, R.mag[1]); dots(g, [[3, 6], [6, 5]], R.mag[2]); return g; },
  ot: () => { const g = new G(10, 10); g.curve(2, 2, 3, 7, 8, 9, R.red[3]);
    g.shape(4.4, 5.4, 3.8, 1.3, 1.0, R.red, { spec: true }); g.line(1, 1, 2, 2, L[2]); g.set(3, 2, L[3]); g.set(2, 3, L[2]); return g; },
  suhao: () => { const g = new G(10, 10); g.ball(5, 6, 4.2, 3.6, R.kohl, { spec: true });
    g.line(5, 3, 4, 0, R.kohl[3]); g.line(5, 3, 8, 1, R.kohl[3]); g.line(5, 3, 1, 2, R.kohl[3]); g.set(8, 0, R.blue[4]); g.set(4, 0, R.blue[4]);
    dots(g, [[3, 6], [7, 7]], R.kohl[2]); return g; },
  bapcai: () => { const g = new G(10, 10); cabHead(g, 5, 5.2, 4.4, 4.0);
    g.shape(1.6, 7.4, 2.0, 1.2, PI - 0.6, R.blue, { round: true }); g.shape(8.4, 7.4, 2.0, 1.2, 0.6, R.blue, { round: true }); return g; },
};

// ---------- dựng ----------
function build(def) {
  const g = [def.s0(), def.s1(), def.s2(), def.s3(), def.s4()];
  return { stages: g.map(toCanvas), sick: toCanvas(sickOf(g[2])), rotten: toCanvas(rottenOf(g[4])), dead: toCanvas(deadOf(g[3])) };
}
export const CROP4_IDS = ['cai', 'carot', 'lua', 'cachua', 'bap', 'dau', 'bingo', 'duahau', 'hanhla', 'dauphong', 'raumuong', 'dualeo', 'khoailang', 'ot', 'suhao', 'bapcai'];
export const SPR4 = {
  crop: Object.fromEntries(CROP4_IDS.map(id => [id, build(DEF[id])])),
  produce: Object.fromEntries(Object.entries(PRODUCE).map(([id, f]) => [id, toCanvas12(f())])),
};
function toCanvas12(g) {
  const o = outline(g), c = canvas(12, 12), x = c.getContext('2d');
  for (let y = 0; y < 12; y++) for (let i = 0; i < 12; i++) { const col = o.get(i, y); if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } }
  return c;
}
