// Cây trồng art 2x (kiểu A): vẽ lại toàn bộ SPR4 (art4.js) ở độ phân giải gấp đôi, cỡ trên màn hình giữ nguyên.
//   SPR10.crop[id] = { stages: [s0..s4], sick, rotten, dead }  thay SPR4.crop[id] (art4.js), 16 loại cây.
//     Canvas rộng 32 (bộ cũ 16), cao gấp đôi bộ cũ, gốc chạm đáy như cũ; vẽ vào ô 16 px thì thu nhỏ một nửa.
//   SPR10.produce[id]: biểu tượng nông sản 24x24  thay SPR4.produce[id] (art4.js, 12x12) cho 8 cây mới.
//   SEEDPIC10[id]: hình 22x18 in trên túi hạt giống 2x (art12.js seedBag), đủ 16 cây; không phải sprite thay thế nên ngoài SPR10.
// Mỗi loại cây, mỗi giai đoạn một hình riêng; bệnh / héo / chết biến đổi từ chính dáng cây đó (như bộ cũ).
// Phong cách theo art5.js: viền tối 1px (mép hứng sáng viền nhạt hơn), mỗi mảng 4 sắc độ, sáng từ trên trái,
// điểm sáng trên trái chín và lá bóng, gân lá, đường tối ngăn lá chồng lên nhau.
import { canvas, hash } from './art.js';

const PI = Math.PI, UP = -PI / 2, DOWN = PI / 2;

// Dải màu 6 bậc: [rất tối (viền), tối, hơi tối, gốc, sáng, điểm sáng] (giữ bảng màu bộ cũ)
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
  pink:  ['#5e1830', '#9a3456', '#c85a7c', '#e886a2', '#f8b4c8', '#ffe0ea'],
  bamboo:['#4a3a14', '#7a6428', '#a68c42', '#c8ac5c', '#e2cc84', '#f4e6b4'],
};
const L = R.leaf;
const LEAFY = new Map();
for (const k of ['leaf', 'dleaf', 'blue', 'scal', 'grey', 'purp', 'cream', 'cab', 'kpale', 'pleaf']) R[k].forEach((c, i) => LEAFY.set(c, i));
const SICK = ['#5a4a10', '#7a6a18', '#a8962a', '#c9b93a', '#e0d478', '#f0e8a8'];
const OLIVE = ['#2a2c16', '#3e4524', '#56602f', '#707c40', '#8c9a5a', '#aab87c'];
const DRY = ['#3e2810', '#5c3e1c', '#7c5a30', '#a08050', '#c4a070', '#dcc498'];
// màu → [dải, bậc] để tìm sắc tối hơn / viền đúng tông
const RAMPOF = new Map();
for (const r of [...Object.values(R), SICK, OLIVE, DRY]) r.forEach((c, i) => { if (!RAMPOF.has(c)) RAMPOF.set(c, [r, i]); });

// ---------- màu ----------
const rgb = c => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lum = c => { const [r, g, b] = rgb(c); return 0.3 * r + 0.59 * g + 0.11 * b; };
const shade = (c, f) => hex(rgb(c).map(v => v * f));
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const darker = (c, k = 1) => { const r = RAMPOF.get(c); return r ? r[0][Math.max(0, r[1] - k)] : shade(c, 0.78); };
const clampI = (i, n) => Math.max(0, Math.min(n - 1, i));
const GROW = 0.8;

// ---------- lưới điểm ảnh 2x ----------
// Lưới cỡ đúng canvas; hàng/cột ngoài cùng để dành cho viền (set() bỏ qua).
// Mỗi lần vẽ là một lớp (layer): khối vẽ sau đè khối trước thì mép dưới/phải của nó thành đường tối ngăn cách.
class G {
  constructor(h, w = 32) { this.w = w; this.h = h; this.a = new Array(w * h).fill(null); this.z = new Int32Array(w * h).fill(-1); this.layer = 0; }
  get b() { return this.h - 1; }   // mép đáy (toạ độ liên tục) của hàng nội dung cuối
  ok(x, y) { return x >= 1 && y >= 1 && x < this.w - 1 && y < this.h - 1; }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.a[y * this.w + x] : null; }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (c && this.ok(x, y)) { const i = y * this.w + x; this.a[i] = c; this.z[i] = this.layer; }
    return this;
  }
  del(x, y) { x = Math.floor(x); y = Math.floor(y); if (this.ok(x, y)) this.a[y * this.w + x] = null; return this; }
  dots(pts, c) { this.layer++; for (const [x, y, col] of pts) this.set(x, y, col ?? c); return this; }
  line(x0, y0, x1, y1, c) {
    this.layer++;
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.set(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), typeof c === 'function' ? c(t) : c);
    }
    return this;
  }
  // Nét cong bậc hai dày w0 → w1; col(t, k, w): k = 0 là mép hứng sáng (trái / trên).
  stroke(x0, y0, cx, cy, x1, y1, col, w0 = 2, w1 = w0) {
    this.layer++;
    const n = Math.ceil(Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy)) * 3 + 2;
    const f = Array.isArray(col) ? stemCol(col) : col;
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), d = t * t;
      const x = a * x0 + b * cx + d * x1, y = a * y0 + b * cy + d * y1;
      const tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
      const w = Math.max(1, Math.round(w0 + (w1 - w0) * t)), vert = Math.abs(ty) >= Math.abs(tx);
      for (let k = 0; k < w; k++) {
        const px = vert ? Math.round(x - w / 2) + k : Math.floor(x), py = vert ? Math.floor(y) : Math.round(y - w / 2) + k;
        this.set(px, py, f(t, k, w));
      }
    }
    return this;
  }
  // Khối lá / trái: trục dài theo góc ang, nửa dài len, nửa rộng wid.
  // Lá: đầu nhọn, đổ bóng theo mặt cong ngang lá; round: khối cầu. Mép dưới/phải đè lên khối cũ thành đường tối.
  shape(cx, cy, len, wid, ang, ramp, o = {}) {
    this.layer++;
    // Viền 1px của nét 2x mỏng hơn viền bộ cũ (= 2px): nới khối thêm chừng ấy để giữ nguyên dáng to nhỏ.
    if (!o.exact) { len += GROW; wid += GROW; }
    const Lr = this.layer, ca = Math.cos(ang), sa = Math.sin(ang), n = ramp.length;
    const lo = o.lo ?? 1, hi = o.hi ?? 4, ext = Math.ceil(Math.max(len, wid)) + 2;
    const M = new Map();
    for (let y = Math.floor(cy - ext); y <= cy + ext; y++) for (let x = Math.floor(cx - ext); x <= cx + ext; x++) {
      if (!this.ok(x, y)) continue;
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = (dx * ca + dy * sa) / len, v = (-dx * sa + dy * ca) / wid;
      if (Math.abs(u) > 1) continue;
      const f = o.prof ? o.prof(u) : o.round ? Math.sqrt(1 - u * u) : (u > 0 ? 1 - u * u : Math.sqrt(1 - u * u));
      if (Math.abs(v) > f) continue;
      if (o.cut && o.cut(u, v, f, dx, dy)) continue;
      M.set(y * this.w + x, [x, y, u, v, f, dx, dy]);
    }
    const LX = -0.5, LY = -0.62, LZ = 0.6, out = [];
    for (const [k, [x, y, u, v, f, dx, dy]] of M) {
      const nu = o.round ? u : u * 0.3, nv = o.round ? v : (f > 0 ? v / f : 0) * 0.75;
      const nz = Math.sqrt(Math.max(0, 1 - nu * nu - nv * nv));
      const nx = nu * ca - nv * sa, ny = nu * sa + nv * ca;
      const I = nx * LX + ny * LY + nz * LZ + (o.bias ?? 0);
      let i = clampI(lo + Math.floor((I + 0.35) / 1.25 * (hi - lo + 1)), hi + 1);
      if (i < lo) i = lo;
      let c = ramp[Math.min(i, hi)];
      if (o.spec && I > (o.specAt ?? 0.9)) c = ramp[n - 1];
      const a = u * len, bb = Math.abs(v * wid);
      if (o.rib && bb < (o.ribW ?? 0.5) && u > (o.ribFrom ?? -0.95) && u < (o.ribTo ?? 0.7)) c = o.rib;
      else if (o.veins && bb > 1 && bb < f * wid - 0.8 && u > -0.8 && u < 0.75 && Math.abs((((a - bb * 0.9) % o.veins) + o.veins) % o.veins) < 0.55) c = ramp[Math.max(lo, Math.min(i, hi) - 1)];
      if (o.fill) c = o.fill(dx, dy, Math.min(i, hi), u, v, x, y) ?? c;
      if (o.rim !== false) for (const [ex, ey] of [[1, 0], [0, 1]]) {
        const nk = (y + ey) * this.w + x + ex;
        if (!M.has(nk) && this.get(x + ex, y + ey) && this.z[nk] < Lr) { c = o.edge ?? ramp[Math.max(0, lo - 1)]; break; }
      }
      out.push([x, y, c]);
    }
    for (const [x, y, c] of out) this.set(x, y, c);
    return this;
  }
  ball(cx, cy, rx, ry, ramp, o = {}) { return this.shape(cx, cy, rx, ry, 0, ramp, { round: true, ...o }); }
  map(fn) {
    const g = new G(this.h, this.w); g.layer = this.layer;
    this.a.forEach((c, i) => { g.a[i] = c && fn(c, i % this.w, Math.floor(i / this.w)); g.z[i] = this.z[i]; });
    return g;
  }
}
const stemCol = r => (t, k, w) => (w === 1 ? r[3] : k === 0 ? r[3] : r[2]);

// Viền 1px: mép trên/trái (hứng sáng) nhạt hơn mép dưới/phải.
function finish(g) {
  const c = canvas(g.w, g.h), x = c.getContext('2d'), a = g.a.slice();
  for (let y = 0; y < g.h; y++) for (let i = 0; i < g.w; i++) {
    if (g.get(i, y)) continue;
    const r = g.get(i + 1, y), d = g.get(i, y + 1), l = g.get(i - 1, y), u = g.get(i, y - 1);
    const ns = [r, d, l, u].filter(Boolean);
    if (!ns.length) continue;
    const best = ns.reduce((p, q) => (lum(q) < lum(p) ? q : p));
    const lit = !l && !u, rr = RAMPOF.get(best);
    let col;
    if (rr && rr[1] > 0) col = lit ? mix(rr[0][0], rr[0][1], 0.5) : rr[0][0];
    else col = shade(best, lit ? 0.62 : 0.45);
    a[y * g.w + i] = col;
  }
  for (let y = 0; y < g.h; y++) for (let i = 0; i < g.w; i++) {
    const col = a[y * g.w + i];
    if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); }
  }
  return c;
}

// ---------- héo, bệnh, chết: biến đổi trên chính dáng cây (như bộ cũ, nét 2x) ----------
// Ép cây xuống còn cao H (gồm hàng viền), mép ngoài sụp thêm sag điểm ảnh; gốc giữ ở đáy.
function wiltTo(g, H, sag) {
  const o = new G(H, g.w), B0 = g.h - 2, B1 = H - 2, sq = B1 / B0, cx = 15;
  for (let y = 1; y <= B1; y++) for (let x = 1; x < g.w - 1; x++) {
    const s = Math.round(sag * ((x - cx) / cx) ** 2), d = B1 - y - s;
    if (d < 0) continue;
    const sy = B0 - Math.round(d / sq);
    if (sy < 1) continue;
    const c = g.get(x, sy);
    if (c) { o.a[y * o.w + x] = c; o.z[y * o.w + x] = g.z[sy * g.w + x]; }
  }
  return o;
}
const blk = (x, y, s, k) => hash(Math.floor(x / s) * 7 + k, Math.floor(y / s) * 13 + k * 3);
function sickOf(g, H) {
  return wiltTo(g, H, 2).map((c, x, y) => {
    if (!LEAFY.has(c)) return c;
    const i = LEAFY.get(c);
    if (blk(x, y, 3, 1) < 0.16) {   // đốm bệnh: tâm nâu sẫm, quầng nâu nhạt
      const cx = x % 3 === 1, cy = y % 3 === 1;
      if (cx && cy) return '#4e2c12';
      if (cx || cy) return '#8a5a26';
    }
    if (i >= 4 && hash(x * 5 + 3, y * 3 + 7) < 0.12) return '#b89a3a';
    return SICK[i];
  });
}
function rottenOf(g, H) {
  return wiltTo(g, H, 4).map((c, x, y) => {
    if (LEAFY.has(c)) {
      const i = LEAFY.get(c);
      if (blk(x, y, 3, 2) < 0.14 && (x % 3 === 1 || y % 3 === 1)) return '#3a2a14';
      return OLIVE[i];
    }
    if (blk(x, y, 2, 5) < 0.2) return x % 2 === y % 2 ? '#2a1e12' : '#4a3420';   // vết thối
    if (hash(x * 11 + 1, y * 7 + 5) < 0.05) return '#c8c6a8';                      // mốc trắng
    return mix(c, '#3a2614', 0.5);
  });
}
function deadOf(g, H) {
  return wiltTo(g, H, 5).map((c, x, y) => {
    const l = lum(c);
    let i = l < 50 ? 0 : l < 85 ? 1 : l < 120 ? 2 : l < 160 ? 3 : l < 200 ? 4 : 5;
    if (i > 1 && hash(x * 3 + 9, y * 11 + 2) < 0.1) i--;   // vết khô loang
    return DRY[i];
  });
}

// ---------- chi tiết dùng chung ----------
const CX = 15;
// Ụ đất vun: vòm đất sáng, vân hạt đất lấm tấm, sỏi nhỏ.
function mound(g, seeds) {
  g.shape(CX, g.b + 1.5, 11.6, 6.4, 0, R.soil, { round: true, lo: 2, hi: 5, rim: false, exact: true });
  for (let y = 1; y < g.h - 1; y++) for (let x = 1; x < g.w - 1; x++) {
    const c = g.get(x, y);
    if (!c) continue;
    const h = hash(x * 17 + 5, y * 31 + 7);
    if (h < 0.1) g.a[y * g.w + x] = darker(c);
    else if (h > 0.96) g.a[y * g.w + x] = R.tan[4];
  }
  g.layer++;
  seeds(g);
  return g;
}
// Hạt tròn 2x2 (sáng trên trái)
function seed2(g, x, y, r) { g.dots([[x, y, r[2]], [x + 1, y, r[1]], [x, y + 1, r[1]], [x + 1, y + 1, r[0]]]); }
// Hoa 4 cánh tròn quanh nhuỵ; s nhỏ thì hoa chữ thập 5 điểm
function flower(g, x, y, ramp, mid, big = true) {
  if (big) {
    for (const [dx, dy] of [[0, -1.6], [-1.6, 0], [1.6, 0], [0, 1.6]]) g.ball(x + dx, y + dy, 1.35, 1.35, ramp, { lo: 2, hi: 4, rim: false });
    g.dots([[x - 1, y - 1, mid[2]], [x, y - 1, mid[1]], [x - 1, y, mid[1]], [x, y, mid[0]]]);
  } else {
    g.dots([[x - 1, y, ramp[4]], [x + 1, y, ramp[3]], [x, y - 1, ramp[4]], [x, y + 1, ramp[2]], [x, y, mid]]);
  }
}
function tendril(g, x, y, dir, c = L[3]) {
  g.dots([[x, y], [x + dir, y - 1], [x + 2 * dir, y - 2], [x + 3 * dir, y - 2], [x + 4 * dir, y - 1], [x + 4 * dir, y], [x + 3 * dir, y + 1], [x + 2 * dir, y]], c);
}
const greenBlade = (t, k) => (t < 0.2 ? L[1] : t < 0.7 ? (k ? L[2] : L[3]) : (k ? L[3] : L[4]));

// ================= 16 loại cây =================
// T[id]: chiều cao lưới bộ cũ từng giai đoạn (trước viền). THIN: cây bộ cũ không viền ở s1..s4.
const T = {
  cai: [5, 6, 9, 13, 15], carot: [5, 6, 9, 12, 15], lua: [5, 6, 11, 14, 15], cachua: [5, 6, 11, 15, 16],
  bap: [5, 7, 12, 18, 20], dau: [5, 5, 8, 9, 10], bingo: [5, 6, 8, 10, 12], duahau: [5, 6, 8, 10, 12],
  hanhla: [5, 6, 10, 13, 15], dauphong: [5, 5, 8, 9, 11], raumuong: [5, 6, 10, 13, 15], dualeo: [5, 9, 13, 16, 17],
  khoailang: [5, 6, 8, 9, 10], ot: [5, 6, 10, 12, 13], suhao: [5, 5, 9, 11, 13], bapcai: [5, 5, 8, 10, 11],
};
const THIN = new Set(['carot', 'lua', 'hanhla']);
const DEF = {};

// ---- Cải xanh: 2 lá mầm tròn → bụi lá xòe cuống trắng → ngồng hoa vàng ----
function bokchoy(g, sx, sy) {
  const b = g.b;
  for (const [x, y, l, w, a] of [
    [CX - 6.3 * sx, b - 9.0 * sy, 5.0 * sy, 3.6 * sx, -2.3],
    [CX + 6.3 * sx, b - 9.0 * sy, 5.0 * sy, 3.6 * sx, -0.84],
    [CX - 2.8 * sx, b - 11.6 * sy, 5.4 * sy, 3.8 * sx, -1.9],
    [CX + 2.8 * sx, b - 11.6 * sy, 5.4 * sy, 3.8 * sx, -1.24],
  ]) g.shape(x, y, l, w, a, L, { round: true, rib: R.cream[3], ribW: 0.9, ribTo: -0.05, veins: 3, bias: -0.05 });
  g.shape(CX, b - 3.6 * sy, 4.0 * sy, 3.6 * sx, UP, R.cream, { round: true, lo: 1, hi: 4 });
  g.line(CX - 1, b - 1, CX - 1, b - 5 * sy, R.cream[1]); g.line(CX + 1, b - 1, CX + 1, b - 5 * sy, R.cream[2]);
}
DEF.cai = {
  s0: g => mound(g, () => { for (const [x, y] of [[8, 8], [14, 7], [20, 8], [11, 10], [18, 10], [24, 10]]) seed2(g, x, y, ['#140c06', '#2a1c10', '#5a4030']); }),
  s1: g => { const b = g.b;
    g.stroke(CX, b, CX, b - 3, CX, b - 7, L, 2);
    g.stroke(CX - 1, b - 6, CX - 3, b - 8, CX - 5, b - 8, L, 1); g.stroke(CX, b - 6, CX + 3, b - 8, CX + 5, b - 8, L, 1);
    g.shape(8.6, b - 9.6, 4.4, 3.4, PI + 0.3, L, { round: true, rib: L[2], ribTo: 0.4 });
    g.shape(21.4, b - 9.6, 4.4, 3.4, -0.3, L, { round: true, rib: L[2], ribTo: 0.4 });
    g.shape(CX, b - 9.6, 2.2, 1.4, UP, L, { lo: 2 }); return g; },
  s2: g => { bokchoy(g, 0.95, 1.0); return g; },
  s3: g => { const b = g.b;
    g.stroke(CX, b - 10, CX, b - 16, CX, 4, L, 2);
    bokchoy(g, 1.05, 1.3);
    for (const [x, y, r] of [[14, 3, R.yellow], [17, 4, L], [13, 6, L], [17, 7, R.yellow], [15, 5, R.yellow]]) g.ball(x, y, 1.2, 1.2, r, { lo: 2, hi: 4 });
    return g; },
  s4: g => { const b = g.b;
    g.stroke(CX, b - 12, CX - 3, b - 20, 8, 6, L, 2, 1); g.stroke(CX, b - 12, CX, b - 22, CX, 4, L, 2, 1); g.stroke(CX, b - 12, CX + 4, b - 20, 22, 6, L, 2, 1);
    bokchoy(g, 1.1, 1.38);
    for (const [x, y] of [[8, 5], [15, 3], [22, 5]]) flower(g, x, y, R.yellow, R.orange);
    flower(g, 11, 10, R.yellow, R.orange[2], false); flower(g, 20, 11, R.yellow, R.orange[2], false);
    return g; },
};

// ---- Cà rốt: lá lông chim mảnh, ngọn củ cam ló khỏi đất ----
// Lá kép: cuống mảnh, lá chét chẻ nhỏ hai bên, ngọn sáng.
function frond(g, x0, y0, x1, y1, ramp = L) {
  g.layer++;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1, len = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / len, uy = (y1 - y0) / len, px = -uy, py = ux;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    g.set(x, y, t > 0.85 ? ramp[4] : t < 0.3 ? ramp[2] : ramp[3]);
    if (i > 2 && i % 3 === 0 && i < n) {
      const s = t < 0.7 ? 2 : 1;
      for (const side of [1, -1]) for (let k = 1; k <= s; k++) {
        const lx = x + side * px * k + ux * k * 0.7, ly = y + side * py * k + uy * k * 0.7;
        g.set(lx, ly, side > 0 ? ramp[k === s ? 4 : 3] : ramp[k === s ? 3 : 2]);
      }
    }
  }
  g.set(x1, y1, ramp[5]);
}
// Đầu củ cà rốt ló khỏi đất: vai tròn rồi thon dần xuống, vân ngang, cuống lá xanh trên đỉnh.
function carrotTop(g, rx, h) {
  g.layer++;
  const b = g.h - 2, top = b - h + 1;
  for (let y = top; y <= b; y++) {
    const t = (y - top) / Math.max(1, h - 1);
    const hw = t < 0.3 ? rx * Math.sqrt(1 - ((0.3 - t) / 0.3) ** 2 * 0.7) : rx * (1 - (t - 0.3) * 0.8);
    for (let x = Math.floor(CX - hw + 0.3); x < Math.ceil(CX + hw - 0.3); x++) {
      const dx = (x + 0.5 - CX) / hw;
      let i = dx < -0.5 ? 4 : dx < 0.15 ? 3 : dx < 0.65 ? 2 : 1;
      if (y === top && i >= 2) i = 4;
      if ((y - top) % 3 === 2 && dx > -0.6 && dx < 0.75 && hash(x * 7, y * 3) < 0.7) i = Math.max(1, i - 1);
      g.set(x, y, R.orange[i]);
    }
  }
  g.dots([[CX - Math.round(rx * 0.5), top + 1, R.orange[5]], [CX - Math.round(rx * 0.5) + 1, top + 1, R.orange[4]]]);
  g.dots([[CX - 2, top, L[2]], [CX - 1, top, L[3]], [CX, top, L[2]], [CX + 1, top, L[1]], [CX - 1, top - 1, L[3]], [CX, top - 1, L[2]]]);
}
DEF.carot = {
  s0: g => mound(g, () => { g.line(5, 10, 25, 10, R.soil[1]); g.line(6, 11, 24, 11, R.soil[2]); for (const x of [7, 12, 17, 22]) g.dots([[x, 10, R.tan[4]], [x + 1, 10, R.tan[3]]]); }),
  s1: g => { const b = g.b;
    g.stroke(CX, b, 12, b - 5, 8, 2, L, 1); g.stroke(CX, b, 18, b - 5, 22, 2, L, 1);
    g.set(8, 2, L[4]); g.set(22, 2, L[4]);
    frond(g, CX, b, CX, 3); return g; },
  s2: g => { const b = g.b;
    for (const [x, y] of [[4, 5], [10, 1], [19, 1], [26, 5], [CX, 2]]) frond(g, CX, b, x, y);
    return g; },
  s3: g => { const b = g.b;
    for (const [x, y] of [[2, 9], [5, 3], [11, 1], [19, 1], [25, 3], [28, 9], [CX, 3]]) frond(g, CX, b - 3, x, y);
    carrotTop(g, 4.6, 5); return g; },
  s4: g => { const b = g.b;
    for (const [x, y] of [[1, 12], [2, 5], [8, 1], [CX, 1], [22, 1], [27, 5], [28, 12], [10, 6], [20, 6]]) frond(g, CX, b - 7, x, y);
    carrotTop(g, 7, 10); return g; },
};

// ---- Lúa: mạ xanh mảnh → bụi lúa → bông lúa trĩu vàng ----
function blades(g, list, col, w0 = 2) { const b = g.b - 1; for (const [bx, cx, cy, tx, ty] of list) g.stroke(bx, b, cx, cy, tx, ty, col, w0, 1); }
// Bông lúa: chuỗi hạt thóc thuôn rủ ra ngoài, hạt phụ phía trong.
// Bông vươn ra ngoài rồi rủ dần xuống (cung), mỗi hạt 2x2 sáng trên trái, hạt phụ so le phía trong.
function panicle(g, x, y, dir, n, ramp) {
  g.layer++;
  let px = x, py = y;
  for (let k = 0; k < n; k++) {
    const a = -0.35 + (k / Math.max(1, n - 1)) * 1.75;
    const gx = Math.round(px), gy = Math.round(py);
    g.set(gx, gy, ramp[4]); g.set(gx + dir, gy, ramp[3]); g.set(gx, gy + 1, ramp[3]); g.set(gx + dir, gy + 1, ramp[1]);
    if (k % 2 === 1 && k < n - 1) { g.set(gx - dir, gy + 2, ramp[3]); g.set(gx - dir, gy + 3, ramp[2]); }
    px += dir * Math.cos(a) * 1.5; py += Math.sin(a) * 1.5 + 0.9;
  }
  g.set(x, y, ramp[5]);
}
const RICE_GREEN = ['#2f4a12', '#4e6e1a', '#6e902a', '#94b440', '#bcd866', '#e4f2a0'];
DEF.lua = {
  s0: g => mound(g, () => { for (const [x, y] of [[7, 8], [12, 10], [17, 8], [21, 10], [10, 7]]) g.dots([[x, y, R.gold[4]], [x + 1, y, R.gold[3]], [x + 2, y, R.gold[2]], [x + 1, y + 1, R.gold[1]], [x, y + 1, R.gold[2]]]); }),
  s1: g => { blades(g, [[15, 13, 6, 9, 1], [15, 15, 4, 17, 1], [16, 19, 6, 23, 3], [14, 11, 8, 6, 5]], greenBlade); return g; },
  s2: g => { blades(g, [[14, 6, 10, 1, 6], [14, 10, 6, 7, 1], [15, 13, 4, 13, 1], [15, 17, 2, 17, 1], [16, 19, 4, 23, 1], [16, 22, 8, 28, 5], [15, 21, 12, 27, 13], [14, 8, 12, 3, 15]], greenBlade); return g; },
  s3: g => { blades(g, [[14, 4, 14, 1, 17], [14, 8, 8, 3, 9], [16, 25, 10, 28, 19], [15, 7, 18, 1, 23]], greenBlade);
    for (const [cx, cy, tx, ty, d] of [[12, 8, 9, 3, -1], [15, 6, 15, 1, 1], [18, 8, 21, 3, 1]]) {
      g.stroke(15, g.b - 1, cx, cy, tx, ty, L, 1); panicle(g, tx, ty, d, 6, RICE_GREEN);
    }
    blades(g, [[14, 10, 12, 5, 19], [16, 19, 14, 25, 19], [15, 9, 18, 3, 23], [16, 21, 18, 27, 21]], greenBlade);
    return g; },
  s4: g => { const gb = (t, k) => (t < 0.25 ? '#5e7020' : t < 0.65 ? (k ? '#7a8a2a' : '#8a9a30') : (k ? R.gold[2] : R.gold[3]));
    blades(g, [[14, 6, 18, 1, 25], [16, 25, 18, 30, 25], [14, 10, 12, 5, 17], [16, 21, 12, 27, 17]], gb);
    for (const [cx, cy, tx, ty, d, n] of [[11, 6, 9, 3, -1, 9], [14, 3, 14, 1, -1, 7], [18, 3, 18, 2, 1, 7], [21, 6, 23, 3, 1, 9]]) {
      g.stroke(16, g.b - 1, cx, cy, tx, ty, (t, k) => (t < 0.5 ? '#6e7a24' : R.gold[2]), 1); panicle(g, tx, ty, d, n, R.gold);
    }
    blades(g, [[14, 16, 8, 9, 21], [16, 19, 14, 25, 21]], gb);
    return g; },
};

// ---- Cà chua: lá xẻ răng cưa, cọc gỗ, hoa vàng, trái non xanh → đỏ ----
function stake(g, x, top) {
  g.layer++;
  for (let y = top; y < g.h - 1; y++) { g.set(x, y, R.wood[4]); g.set(x + 1, y, (y - top) % 7 === 3 ? R.wood[1] : R.wood[2]); }
  g.set(x, top, R.wood[5]); g.set(x + 1, top, R.wood[4]);
}
const serr = (u, v, f) => Math.abs(v) > f - 0.35 && Math.floor((u + 1) * 3.2) % 2 === 0;
function tomLeaf(g, x, y, a, s = 1) {
  g.shape(x + Math.cos(a + 1.3) * 3 * s, y + Math.sin(a + 1.3) * 3 * s, 2.4 * s, 1.6 * s, a + 0.9, L, { cut: serr });
  g.shape(x + Math.cos(a - 1.3) * 3 * s, y + Math.sin(a - 1.3) * 3 * s, 2.4 * s, 1.6 * s, a - 0.9, L, { cut: serr });
  g.shape(x, y, 3.6 * s, 2.0 * s, a, L, { rib: L[2], ribTo: 0.5, cut: serr });
}
// Thân chính hơi lượn, 6 cành lá kép so le, ngọn non trên đỉnh
function tomPlant(g, top) {
  const b = g.b - 1;
  g.stroke(CX - 1, b, CX - 2, (b + top) / 2, CX - 1, top, L, 2);
  const span = b - top;
  for (let i = 0; i < 6; i++) {
    const y = Math.round(b - span * (0.18 + i * 0.145)), dir = i % 2 ? 1 : -1;
    g.stroke(CX - 1, y, CX - 1 + dir * 3, y - 2, CX - 1 + dir * 6, y - 4, L, 1);
    tomLeaf(g, CX + dir * 6.6, y - 4, dir > 0 ? -0.5 : PI + 0.5, 1.15);
  }
  tomLeaf(g, CX - 0.5, top + 1, UP, 1.0);
}
const calyx = (g, x, y) => g.dots([[x - 1, y, L[3]], [x, y - 1, L[4]], [x + 1, y, L[2]], [x, y, L[2]]]);
DEF.cachua = {
  s0: g => mound(g, () => { for (const [x, y] of [[8, 8], [13, 7], [19, 8], [11, 10], [17, 10], [22, 10]]) g.dots([[x, y, R.yellow[4]], [x + 1, y, R.yellow[3]], [x, y + 1, R.yellow[2]], [x + 1, y + 1, R.yellow[1]]]); }),
  s1: g => { const b = g.b;
    g.stroke(CX, b, CX - 1, b - 3, CX, b - 7, L, 2);
    g.shape(8.4, b - 9.2, 4.6, 1.7, PI + 0.45, L, { rib: L[2] }); g.shape(21.6, b - 9.2, 4.6, 1.7, -0.45, L, { rib: L[2] });
    g.shape(CX, b - 10.5, 2.4, 1.6, UP, L, { lo: 2, cut: serr }); return g; },
  s2: g => { stake(g, 23, 1); tomPlant(g, 5); g.dots([[22, 10, R.tan[4]], [21, 10, R.tan[3]], [22, 11, R.tan[2]]]); return g; },
  s3: g => { stake(g, 23, 1); tomPlant(g, 5);
    g.dots([[22, 10, R.tan[4]], [21, 10, R.tan[3]], [22, 20, R.tan[4]], [21, 20, R.tan[3]]]);
    for (const [x, y] of [[6, 9], [20, 15], [10, 19]]) flower(g, x, y, R.yellow, R.orange[2], false);
    for (const [x, y] of [[8, 26], [20, 25], [17, 28.5]]) { g.ball(x, y, 2.4, 2.4, L, { spec: true, specAt: 0.8 }); calyx(g, Math.floor(x), Math.floor(y - 2)); }
    return g; },
  s4: g => { stake(g, 23, 1); tomPlant(g, 5);
    g.dots([[22, 10, R.tan[4]], [21, 10, R.tan[3]], [22, 20, R.tan[4]], [21, 20, R.tan[3]]]);
    for (const [x, y, r] of [[7, 18, 3.1], [10.4, 23, 3.1], [6, 28, 3], [19.6, 21.5, 3.3], [18, 28.5, 3.1], [CX, 11, 2.6]]) {
      g.ball(x, y, r, r * 0.95, R.red, { spec: true, specAt: 0.82 }); calyx(g, Math.floor(x), Math.floor(y - r + 1));
    }
    return g; },
};

// ---- Bắp: thân cao dần, lá dài cong, ra cờ, trái có râu ----
function cornLeaf(g, y, dir, len, tipCol = L[4]) {
  const x0 = dir < 0 ? CX - 1 : CX + 1, x1 = x0 + dir * len;
  g.stroke(x0, y, x0 + dir * len * 0.5, y - len * 0.75, x1, y + 2, (t, k) => (t > 0.85 ? tipCol : t < 0.3 ? (k ? L[1] : L[2]) : (k ? L[2] : L[3])), 3, 1);
}
function cornStalk(g, top) {
  g.layer++;
  for (let y = g.h - 2; y >= top; y--) { g.set(CX - 1, y, L[3]); g.set(CX, y, L[2]); g.set(CX + 1, y, (y % 8) < 1 ? L[0] : L[1]); }
  for (let y = g.h - 2 - 6; y > top; y -= 8) g.dots([[CX - 1, y, L[4]], [CX, y, L[3]]]);
}
function tassel(g, col, dark) {
  g.layer++;
  for (let y = 1; y <= 8; y++) { g.set(CX - 1, y, col); g.set(CX, y, dark); }
  for (const d of [-1, 1]) for (let k = 1; k <= 6; k++) { g.set(CX - 1 + d * k, 2 + k, k % 2 ? col : dark); g.set(CX - 1 + d * k, 3 + k, dark); }
  for (let k = 1; k <= 3; k++) { g.set(CX - 3, 4 + k * 2, col); g.set(CX + 2, 4 + k * 2, col); }
}
DEF.bap = {
  s0: g => mound(g, () => { for (const [x, y] of [[8, 8], [18, 9]]) g.dots([[x, y, R.yellow[4]], [x + 1, y, R.yellow[4]], [x + 2, y, R.yellow[3]], [x, y + 1, R.yellow[3]], [x + 1, y + 1, R.yellow[2]], [x + 2, y + 1, R.yellow[1]], [x + 1, y + 2, R.yellow[1]], [x + 1, y, R.yellow[5]]]); }),
  s1: g => { const b = g.b;
    g.stroke(CX, b, CX, b - 6, CX, 3, L, 2, 1); g.set(CX, 2, L[4]);
    g.stroke(CX, b - 5, 19, 3, 23, 5, (t, k) => (t > 0.8 ? L[4] : L[3]), 2, 1); g.stroke(CX - 1, b - 3, 10, 7, 7, 9, (t, k) => (t > 0.8 ? L[4] : L[3]), 2, 1); return g; },
  s2: g => { cornStalk(g, 7);
    cornLeaf(g, 20, -1, 12); cornLeaf(g, 14, 1, 12); cornLeaf(g, 10, -1, 9);
    g.stroke(CX, 8, CX - 2, 3, CX, 1, L, 2, 1); g.stroke(CX + 1, 8, 18, 3, 20, 3, L, 2, 1); return g; },
  s3: g => { cornStalk(g, 7); tassel(g, R.gold[4], R.gold[2]);
    cornLeaf(g, 34, -1, 12); cornLeaf(g, 28, 1, 12); cornLeaf(g, 21, -1, 12); cornLeaf(g, 15, 1, 10);
    g.shape(20, 26, 4.8, 2.2, UP + 0.4, L, { round: true, bias: 0.15, veins: 2 });
    g.dots([[22, 19, R.pink[4]], [23, 19, R.pink[3]], [22, 18, R.pink[5]], [23, 18, R.pink[4]], [24, 17, R.pink[3]], [21, 18, R.pink[3]], [24, 18, R.pink[2]]]);
    return g; },
  s4: g => { cornStalk(g, 7); tassel(g, R.tan[4], R.tan[2]);
    cornLeaf(g, 38, -1, 12, R.gold[3]); cornLeaf(g, 30, 1, 12, R.gold[3]); cornLeaf(g, 23, -1, 12, R.gold[3]); cornLeaf(g, 15, 1, 10, R.gold[3]);
    const kern = (dx, dy, i, u, v, x, y) => { const cell = (x + Math.floor(y / 2)) % 2, row = y % 2; return R.yellow[Math.min(5, Math.max(1, i + (row ? -1 : 0) + (cell ? 0 : 1) - 1))]; };
    g.shape(21.2, 27, 6.4, 3.2, UP + 0.35, R.yellow, { round: true, fill: kern, lo: 2, hi: 4 });
    g.shape(18.8, 31.4, 4.8, 1.6, UP + 0.7, L, { veins: 2 }); g.shape(23.8, 31, 4.4, 1.4, UP + 0.05, L);
    g.dots([[23, 18, R.wood[2]], [24, 17, R.wood[3]], [25, 16, R.wood[3]], [23, 17, R.wood[3]], [24, 16, R.wood[4]], [22, 18, R.wood[3]], [25, 17, R.wood[1]], [26, 16, R.wood[2]]]);
    return g; },
};

// ---- Dâu tây: bụi thấp lá ba chét răng cưa, hoa trắng, trái đỏ lấm tấm hạt ----
const serr2 = (u, v, f) => Math.abs(v) > f - 0.3 && u > -0.4 && Math.floor((u + 1) * 4) % 2 === 0;
// Răng cưa nhỏ chỉ ở mép ngoài lá chét dâu (lá tròn đầy, không tua tủa)
const serrS = (u, v, f, dx, dy) => u > 0.35 && Math.abs(v) > f - 0.18 && Math.floor((u + 1) * 5) % 2 === 0;
function trifol(g, x, y, s = 1) {
  const o = { round: true, cut: serrS, veins: 2, rib: L[2], ribTo: 0.6 };
  g.shape(x - 2.7 * s, y + 0.6, 2.8 * s, 2.3 * s, PI + 0.4, L, o);
  g.shape(x + 2.7 * s, y + 0.6, 2.8 * s, 2.3 * s, -0.4, L, o);
  g.shape(x, y - 2.0 * s, 2.9 * s, 2.5 * s, UP, L, o);
}
function berry(g, x, y) {
  g.shape(x, y, 4.2, 3.3, DOWN, R.red, { prof: u => (u < 0 ? Math.sqrt(1 - u * u * 0.8) : 1 - u * u * 0.85), spec: true, specAt: 0.8,
    fill: (dx, dy, i, u, v, px, py) => ((px * 3 + py * 2) % 5 === 0 && Math.abs(v) < 0.8 && u > -0.7 ? (i >= 3 ? R.yellow[3] : R.yellow[1]) : null) });
  g.dots([[x - 2, y - 3, L[3]], [x - 1, y - 3, L[2]], [x, y - 4, L[4]], [x, y - 3, L[2]], [x + 1, y - 3, L[3]], [x + 2, y - 3, L[2]]].map(([a, b, c]) => [Math.floor(a), Math.floor(b), c]));
}
function strawBush(g) {
  const b = g.b - 1;
  g.stroke(CX, b, 10, b - 5, 7, b - 9, L, 1); g.stroke(CX, b, 20, b - 5, 21, b - 9, L, 1); g.stroke(CX, b, CX, b - 6, CX, b - 11, L, 1);
  trifol(g, 7.6, b - 8.5, 1.05); trifol(g, 22.4, b - 8.5, 1.05); trifol(g, CX, b - 11.2, 1.15);
}
DEF.dau = {
  s0: g => mound(g, () => { g.dots([[14, 6, R.wood[2]], [15, 6, R.wood[1]], [13, 7, R.wood[3]], [14, 7, R.wood[2]], [15, 7, R.wood[1]], [16, 7, R.wood[1]], [14, 8, R.wood[1]]]);
    g.dots([[14, 4, L[4]], [13, 5, L[3]], [16, 4, L[3]], [17, 5, L[2]], [15, 5, L[3]], [12, 4, L[4]]]); }),
  s1: g => { const b = g.b; g.stroke(CX, b, CX, b - 3, CX, b - 6, L, 1); trifol(g, CX, b - 6.5, 0.8); return g; },
  s2: g => { strawBush(g); return g; },
  s3: g => { strawBush(g);
    for (const [x, y] of [[4, 14], [22, 4], [16, 16]]) flower(g, x, y, R.white, R.yellow);
    g.ball(23, 16, 2.2, 2.2, R.cream, { spec: true }); g.dots([[22, 13, L[3]], [23, 13, L[2]], [24, 13, L[3]]]); return g; },
  s4: g => { strawBush(g);
    berry(g, 6.4, 17.5); berry(g, 23.6, 17.5); berry(g, CX, 18.6);
    flower(g, 24, 4, R.white, R.yellow); return g; },
};

// ---- Bí ngô: dây bò, lá to tròn xẻ thuỳ, hoa vàng to, trái xanh → cam có múi ----
function pumLeaf(g, x, y, s = 1, ramp = L) {
  g.shape(x, y, 5.0 * s, 4.4 * s, UP, ramp, { round: true, veins: 2.5, rib: ramp[2], ribTo: 0.7,
    cut: (u, v, f) => { const ang = Math.atan2(v, u); return Math.hypot(u, v) > 0.8 && [0.9, -0.9, 2.3, -2.3].some(k => Math.abs(ang - k) < 0.18); } });
  g.stroke(Math.floor(x), Math.floor(y + 1), x - 1, y - 2, x - 2, y - 3.5 * s, () => ramp[4], 1);
}
DEF.bingo = {
  s0: g => mound(g, () => { for (const x of [8, 18]) g.dots([[x, 8, R.white[4]], [x + 1, 8, R.white[4]], [x + 2, 8, R.white[3]], [x, 9, R.white[3]], [x + 1, 9, R.white[3]], [x + 2, 9, R.white[2]], [x + 1, 10, R.white[1]]]); }),
  s1: g => { const b = g.b; g.stroke(CX, b, CX, b - 3, CX, b - 6, L, 2);
    g.shape(8.6, b - 8.6, 5.0, 2.8, PI + 0.25, L, { round: true, rib: L[2], ribTo: 0.5 }); g.shape(21.4, b - 8.6, 5.0, 2.8, -0.25, L, { round: true, rib: L[2], ribTo: 0.5 });
    g.shape(4.2, b - 10.2, 1.8, 1.6, PI + 0.25, R.white, { round: true, lo: 1, hi: 4 }); return g; },
  s2: g => { const b = g.b; g.stroke(CX, b - 1, 8, b - 3, 2, b - 1, L, 2, 1); g.stroke(CX, b - 1, 20, b - 1, 27, b - 3, L, 2, 1);
    pumLeaf(g, 8.6, 9, 1); pumLeaf(g, 21.6, 8.2, 1.05); pumLeaf(g, CX + 0.5, 13, 0.8); tendril(g, 22, 15, 1); return g; },
  s3: g => { const b = g.b; g.stroke(CX, b - 1, 8, b - 3, 2, b - 1, L, 2, 1); g.stroke(CX, b - 1, 20, b - 1, 27, b - 3, L, 2, 1);
    pumLeaf(g, 8.2, 8.4, 1.1); pumLeaf(g, 22, 8, 1.1);
    g.shape(8, 15.6, 4.4, 3.4, UP - 0.4, R.yellow, { round: true, lo: 1, hi: 4, cut: (u, v) => u < -0.85 && Math.abs(v) < 0.4 });
    g.dots([[7, 15, R.orange[2]], [8, 15, R.orange[3]], [7, 16, R.orange[1]], [4, 12, R.yellow[4]], [10, 12, R.yellow[3]], [5, 19, R.yellow[2]]]);
    g.ball(20.4, 18.4, 4.6, 3.4, R.cab, { lo: 1, hi: 4, spec: true, fill: (dx, dy, i) => (Math.abs(dx) < 0.6 || Math.abs(Math.abs(dx) - 3) < 0.5 ? R.cab[Math.max(1, i - 1)] : null) });
    g.dots([[20, 14, R.wood[2]], [20, 13, R.wood[3]], [21, 13, L[2]]]);
    return g; },
  s4: g => { const b = g.b; g.stroke(CX, b - 1, 6, b - 5, 2, b - 3, L, 2, 1);
    pumLeaf(g, 7, 8, 1.0); pumLeaf(g, 23.4, 7.4, 1.0);
    g.ball(CX, 18.4, 11.4, 7.8, R.orange, { spec: true, specAt: 0.85, fill: (dx, dy, i) => ([-6.5, -2, 2.5, 7].some(k => Math.abs(dx - k * (1 - (dy / 9) ** 2 * 0.3)) < 0.6) ? R.orange[Math.max(1, i - 1)] : null) });
    g.stroke(CX, 12, CX, 9, CX + 2, 7, R.wood, 2); g.set(CX + 2, 7, R.wood[4]); tendril(g, 18, 8, 1);
    return g; },
};

// ---- Dưa hấu: dây bò lá xẻ thùy xám xanh, trái sọc ----
// Lá dưa hấu xẻ 5 thuỳ sâu, mép lượn
function melLeaf(g, x, y, s = 1) {
  const r = R.grey, o = { rib: r[4], ribTo: 0.6, cut: serrS };
  g.shape(x - 2.8 * s, y + 1.2 * s, 2.4 * s, 1.5 * s, PI + 0.15, r, o);
  g.shape(x + 2.8 * s, y + 1.2 * s, 2.4 * s, 1.5 * s, -0.15, r, o);
  g.shape(x - 2.2 * s, y - 0.6 * s, 3.0 * s, 1.9 * s, PI + 0.75, r, o);
  g.shape(x + 2.2 * s, y - 0.6 * s, 3.0 * s, 1.9 * s, -0.75, r, o);
  g.shape(x, y - 2.4 * s, 3.4 * s, 2.0 * s, UP, r, o);
  g.dots([[x, y, r[2]], [x - 1, y, r[2]]].map(([a, b, c]) => [Math.floor(a), Math.floor(b), c]));
}
const stripe = (dx, dy, i) => {
  const p = ((dx + 60 + 1.4 * Math.sin(dy * 0.65)) % 6 + 6) % 6;
  return p < 2.2 ? R.wmel[Math.min(5, i > 3 ? 4 : 3)] : R.wmel[i > 3 ? 2 : 1];
};
DEF.duahau = {
  s0: g => mound(g, () => { for (const x of [7, 14, 20]) g.dots([[x, 9, R.black[1]], [x + 1, 9, R.black[3]], [x + 2, 9, R.black[2]], [x + 1, 10, R.black[0]]]); g.dots([[11, 7, R.black[2]], [11, 8, R.black[0]], [12, 7, R.black[4]]]); }),
  s1: g => { const b = g.b; g.stroke(CX, b, CX, b - 3, CX, b - 6, L, 2);
    g.shape(9.6, b - 8.6, 4.2, 2.4, PI + 0.3, R.grey, { round: true, rib: R.grey[2], ribTo: 0.5 }); g.shape(20.4, b - 8.6, 4.2, 2.4, -0.3, R.grey, { round: true, rib: R.grey[2], ribTo: 0.5 });
    g.shape(24.6, b - 10.2, 1.8, 1.6, -0.3, R.black, { round: true, lo: 1, hi: 4 }); return g; },
  s2: g => { const b = g.b; g.stroke(CX, b - 1, 8, b - 3, 2, b - 1, R.grey, 2, 1); g.stroke(CX, b - 1, 20, b - 1, 27, b - 3, R.grey, 2, 1);
    melLeaf(g, 7.6, 10, 1.15); melLeaf(g, 22.4, 9.2, 1.15); melLeaf(g, CX, 12.4, 0.9); tendril(g, 22, 15, 1, R.grey[3]); return g; },
  s3: g => { const b = g.b; g.stroke(CX, b - 1, 8, b - 3, 2, b - 1, R.grey, 2, 1); g.stroke(CX, b - 1, 20, b - 1, 27, b - 3, R.grey, 2, 1);
    melLeaf(g, 7.2, 9.2, 1.2); melLeaf(g, 22.4, 8.4, 1.2);
    flower(g, 16, 5, R.yellow, R.orange[2], false); flower(g, 4, 16, R.yellow, R.orange[2], false);
    g.ball(19.2, 17.6, 4.6, 3.4, R.wmel, { fill: stripe, spec: true }); return g; },
  s4: g => { const b = g.b; g.stroke(CX, b - 1, 6, b - 5, 2, b - 3, R.grey, 2, 1);
    melLeaf(g, 6.4, 7.6, 1.15); melLeaf(g, 23.6, 7.2, 1.15);
    g.ball(CX, 18.2, 11.8, 7.6, R.wmel, { fill: stripe, spec: true, specAt: 0.84 });
    g.stroke(CX, 11, CX + 1, 9, CX + 2, 8, R.grey, 1); tendril(g, 18, 8, 1, R.grey[3]);
    return g; },
};

// ---- Hành lá: lá ống thẳng xanh, gốc trắng, ngồng hoa tròn trắng ----
function tube(g, bx, tx, ty, bend = 0) {
  g.layer++;
  const b = g.h - 2, n = b - ty;
  for (let i = 0; i <= n; i++) {
    const t = i / n, y = b - i, x = Math.round(bx + (tx - bx) * t + bend * t * t * 4);
    const base = i < 4, w = t < 0.75 ? 2 : 1;
    g.set(x, y, base ? (i < 2 ? R.white[2] : R.white[4]) : i < 6 ? R.scal[5] : t > 0.85 ? R.scal[4] : R.scal[3]);
    if (w === 2) g.set(x + 1, y, base ? R.white[2] : i < 6 ? R.scal[3] : R.scal[2]);
  }
  if (bend) g.set(Math.round(tx + bend * 4 + Math.sign(bend)), ty + 1, R.scal[4]);
}
DEF.hanhla = {
  s0: g => mound(g, () => { g.ball(CX, 8, 3.2, 2.8, R.white, { lo: 1, hi: 4, spec: true }); g.dots([[14, 3, R.scal[4]], [14, 4, R.scal[3]], [15, 4, R.scal[2]], [14, 5, R.scal[3]], [15, 5, R.scal[2]], [12, 11, R.white[1]], [17, 11, R.white[1]], [13, 11, R.white[0]], [16, 11, R.white[0]]]); }),
  s1: g => { tube(g, 13, 11, 1); tube(g, 16, 19, 3); return g; },
  s2: g => { tube(g, 11, 7, 3); tube(g, 14, 15, 1); tube(g, 16, 21, 3); tube(g, 13, 11, 7); return g; },
  s3: g => { g.line(19, 24, 23, 7, R.scal[3]); g.line(20, 24, 24, 8, R.scal[2]);
    g.ball(23.6, 4.6, 3.6, 3.4, R.white, { lo: 1, hi: 4, fill: (dx, dy, i, u, v, x, y) => ((x + y) % 2 === 0 && i < 4 ? R.white[Math.max(1, i - 1)] : null) });
    g.dots([[22, 3, R.white[5]], [24, 6, R.scal[4]]]);
    tube(g, 9, 5, 5, -0.5); tube(g, 12, 11, 1); tube(g, 14, 17, 3); tube(g, 11, 9, 9); return g; },
  s4: g => { tube(g, 7, 3, 7, -1); tube(g, 10, 7, 1); tube(g, 12, 12, 3); tube(g, 14, 16, 1); tube(g, 16, 23, 3, 1); tube(g, 18, 27, 9, 0.5); tube(g, 11, 9, 11); tube(g, 15, 19, 11);
    return g; },
};

// ---- Đậu phộng: lá kép 4 lá chét tròn nhỏ, hoa vàng cam, củ lạc dưới gốc ----
function pinnate(g, x, y, s = 1, ramp = L) {
  g.stroke(CX, g.b - 1, (CX + x) / 2, (g.b + y) / 2, x, y, () => ramp[2], 1);
  for (const [dx, dy, a] of [[-2.4, -2.4, UP - 0.6], [2.4, -2.4, UP + 0.6], [-2.8, 1.4, PI + 0.3], [2.8, 1.4, -0.3]])
    g.shape(x + dx * s, y + dy * s, 2.5 * s, 1.7 * s, a, ramp, { round: true, rib: ramp[2], ribTo: 0.5 });
}
function pod(g, x, y) {
  g.ball(x, y, 2.4, 1.8, R.tan, { lo: 1, hi: 4 }); g.ball(x + 3.6, y - 0.8, 2.4, 1.8, R.tan, { lo: 1, hi: 4 });
  g.dots([[x + 1, y, R.tan[1]], [x + 2, y - 1, R.tan[1]], [x - 1, y - 1, R.tan[5]], [x + 3, y - 2, R.tan[5]], [x, y + 1, R.tan[2]], [x + 4, y, R.tan[2]]].map(([a, b, c]) => [Math.floor(a), Math.floor(b), c]));
}
const peaBush = (g, ramp = L) => { for (const [x, y, s] of [[7.6, g.b - 7.2, 0.95], [22.4, g.b - 7.2, 0.95], [CX, g.b - 12, 1.05]]) pinnate(g, x, y, s, ramp); };
const PCOT = ['#4a3a10', '#7a6a28', '#a89a48', '#c8b860', '#e0d488', '#f4ecb8'];
DEF.dauphong = {
  s0: g => mound(g, () => { pod(g, 8, 8.5); pod(g, 17, 9.2); }),
  s1: g => { const b = g.b; g.stroke(CX, b, CX, b - 3, CX, b - 8, L, 2);
    g.ball(10.8, b - 4.2, 3.0, 2.0, PCOT, { lo: 1, hi: 4 }); g.ball(19.2, b - 4.2, 3.0, 2.0, PCOT, { lo: 1, hi: 4 });
    g.shape(12.6, b - 9.6, 2.0, 1.4, PI + 0.9, L, { round: true }); g.shape(17.4, b - 9.6, 2.0, 1.4, -0.9, L, { round: true }); return g; },
  s2: g => { peaBush(g); return g; },
  s3: g => { peaBush(g);
    for (const [x, y] of [[11, 14], [18, 12], [3, 9], [24, 7]]) g.dots([[x, y, R.yellow[4]], [x + 1, y, R.yellow[3]], [x, y + 1, R.yellow[3]], [x + 1, y + 1, R.orange[3]], [x + 2, y + 1, R.orange[2]], [x, y - 1, R.yellow[5]], [x + 1, y + 2, R.orange[1]]]);
    return g; },
  s4: g => { peaBush(g, R.pleaf);
    pod(g, 3.6, 21); pod(g, 20.4, 21); return g; },
};

// ---- Rau muống: thân ống mọc thẳng, lá hình mũi tên, hoa loa kèn trắng tím ----
function arrow(g, x, y, a, s = 1) {
  g.shape(x, y, 3.8 * s, 1.5 * s, a, L, { lo: 1, rib: L[2], ribTo: 0.6 });
  const bx = x - Math.cos(a) * 3 * s, by = y - Math.sin(a) * 3 * s;
  for (const [d, c] of [[2.4, L[3]], [-2.4, L[2]]]) {
    g.dots([[bx + Math.cos(a + d) * 1.6, by + Math.sin(a + d) * 1.6, c], [bx + Math.cos(a + d * 0.95) * 2.6, by + Math.sin(a + d * 0.95) * 2.6, c]]);
  }
}
function morning(g, x, y) {
  g.ball(x, y, 2.8, 2.4, R.white, { lo: 1, hi: 4, spec: false });
  g.dots([[x, y, R.pink[2]], [x - 1, y, R.pink[3]], [x, y - 1, R.pink[3]], [x - 1, y - 1, R.pink[4]], [x, y + 2.4, R.white[1]], [x - 1, y + 2.4, R.white[2]], [x, y + 3.2, L[2]]].map(([a, b, c]) => [Math.floor(a), Math.floor(b), c]));
}
DEF.raumuong = {
  s0: g => mound(g, () => { for (const x of [9, 19]) { g.layer++; for (let y = 3; y <= 10; y++) { g.set(x, y, L[3]); g.set(x + 1, y, L[2]); } g.dots([[x, 3, R.scal[5]], [x + 1, 3, R.scal[4]], [x, 6, L[1]], [x + 1, 6, L[1]]]); } }),
  s1: g => { const b = g.b; g.stroke(CX, b, CX, b - 3, CX, b - 7, L, 2);
    g.shape(9.4, b - 9.2, 4.0, 1.7, PI + 0.55, L, { rib: L[2] }); g.shape(20.6, b - 9.2, 4.0, 1.7, -0.55, L, { rib: L[2] }); return g; },
  s2: g => { const b = g.b - 1;
    for (const [x, y] of [[8, 10], [CX, 8], [22, 10]]) g.stroke(CX, b, (CX + x) / 2, (b + y) / 2 + 1, x, y, L, 2, 1);
    arrow(g, 6.8, 6.8, UP - 0.5); arrow(g, CX, 5.2, UP); arrow(g, 23.2, 6.8, UP + 0.5); arrow(g, 21.4, 15.2, -0.5, 0.75); return g; },
  s3: g => { const b = g.b - 1;
    for (const [x, y] of [[6, 12], [12, 8], [18, 8], [24, 12]]) g.stroke(CX, b, (CX + x) / 2, (b + y) / 2 + 1, x, y, L, 2, 1);
    arrow(g, 5.2, 8.8, UP - 0.5); arrow(g, 11.2, 5.6, UP - 0.15); arrow(g, 18.8, 5.6, UP + 0.15); arrow(g, 24.8, 8.8, UP + 0.5);
    arrow(g, 21.6, 18.8, -0.4, 0.75);
    morning(g, 6.8, 19.2); morning(g, CX, 14.8); return g; },
  s4: g => { const b = g.b - 1;
    const tips = [[4, 14, UP - 0.8], [9, 7.2, UP - 0.4], [CX, 5.2, UP], [21, 7.2, UP + 0.4], [26, 14, UP + 0.8]];
    for (const [x, y] of tips) g.stroke(CX, b, (CX + x) / 2, (b + y) / 2 + 2, Math.round(x), Math.round(y + 4), L, 2, 1);
    for (const [x, y, a] of tips) arrow(g, x, y, a, 0.95);
    arrow(g, 6.8, 22, PI + 0.4, 0.75); arrow(g, 23.2, 21.2, -0.4, 0.75);
    return g; },
};

// ---- Dưa leo: giàn tre chữ A, lá to, hoa vàng, trái dài xanh sẫm có gai ----
function aframe(g, top = 1) {
  const b = g.h - 2;
  g.line(3, b, 15, top, t => R.bamboo[(Math.round(t * 24) % 6) ? 3 : 1]); g.line(4, b, 16, top, t => R.bamboo[(Math.round(t * 24) % 6) ? 2 : 1]);
  g.line(25, b, 13, top, t => R.bamboo[(Math.round(t * 24) % 6) ? 3 : 1]); g.line(26, b, 14, top, t => R.bamboo[(Math.round(t * 24) % 6) ? 2 : 1]);
  g.dots([[14, top + 1, R.tan[1]], [15, top + 1, R.tan[2]], [14, top + 2, R.tan[2]]]);
}
function cukeLeaf(g, x, y, s = 1) { g.shape(x, y, 4.4 * s, 4.0 * s, UP, L, { lo: 1, veins: 2.5, rib: L[2], ribTo: 0.6, cut: serr2 }); }
function cuke(g, x, y, len, flowerTip) {
  g.shape(x, y, len + 0.9, 2.3, DOWN, R.wmel, { round: true, lo: 1, hi: 3, spec: true, specAt: 0.72,
    fill: (dx, dy, i, u, v, px, py) => (Math.abs(dx + 0.8) < 0.5 && py % 3 === 0 ? R.wmel[4] : Math.abs(dx - 1) < 0.5 && py % 3 === 1 ? R.wmel[0] : null) });
  g.dots([[x, y - len - 1.6, L[2]], [x - 1, y - len - 1.6, L[3]]].map(([a, b, c]) => [Math.floor(a), Math.floor(b), c]));
  if (flowerTip) g.dots([[x, y + len + 1.4, R.yellow[3]], [x - 1, y + len + 1.4, R.yellow[4]], [x + 1, y + len + 1.4, R.yellow[2]], [x, y + len + 2.4, R.yellow[2]]].map(([a, b, c]) => [Math.floor(a), Math.floor(b), c]));
}
DEF.dualeo = {
  s0: g => mound(g, () => { for (const [x, y] of [[7, 9], [12, 8], [17, 9]]) g.dots([[x, y, R.white[4]], [x + 1, y, R.white[3]], [x + 2, y, R.white[2]]]); g.layer++; for (let y = 1; y <= 10; y++) { g.set(23, y, R.bamboo[3]); g.set(24, y, y % 4 ? R.bamboo[2] : R.bamboo[1]); } }),
  s1: g => { const b = g.b; g.layer++; for (let y = 1; y < g.h - 1; y++) { g.set(21, y, (y % 6) ? R.bamboo[3] : R.bamboo[1]); g.set(22, y, (y % 6) ? R.bamboo[2] : R.bamboo[1]); }
    g.stroke(11, b, 11, b - 3, 11, b - 7, L, 2); g.shape(7, b - 8.6, 4.0, 2.4, PI + 0.3, L, { round: true, rib: L[2] }); g.shape(15, b - 8.6, 4.0, 2.4, -0.3, L, { round: true, rib: L[2] });
    g.shape(11, b - 10, 1.8, 1.4, UP, L, { lo: 2, cut: serr2 }); return g; },
  s2: g => { aframe(g);
    g.stroke(CX, g.b - 1, 4, 18, 11, 7, L, 2, 1); g.stroke(CX, g.b - 1, 22, 20, 18, 11, L, 2, 1);
    cukeLeaf(g, 7.6, 18.8); cukeLeaf(g, 21.2, 19.2, 0.9); cukeLeaf(g, 11.2, 8.8, 0.9); cukeLeaf(g, 18.8, 12, 0.8);
    tendril(g, 14, 4, 1); return g; },
  s3: g => { aframe(g);
    g.stroke(CX, g.b - 1, 2, 22, 11, 5, L, 2, 1); g.stroke(CX, g.b - 1, 24, 22, 18, 7, L, 2, 1);
    cukeLeaf(g, 6.4, 24.8); cukeLeaf(g, 23.2, 25.2); cukeLeaf(g, 9.2, 12, 0.95); cukeLeaf(g, 20.8, 13.2, 0.95);
    flower(g, 15, 3, R.yellow, R.orange[2], false); flower(g, 3, 17, R.yellow, R.orange[2], false); flower(g, 24, 5, R.yellow, R.orange[2], false);
    cuke(g, CX, 19.6, 2.6, true); cuke(g, 19, 27, 2.2, true); return g; },
  s4: g => { aframe(g);
    g.stroke(CX, g.b - 1, 2, 22, 11, 5, L, 2, 1); g.stroke(CX, g.b - 1, 24, 22, 18, 7, L, 2, 1);
    cukeLeaf(g, CX, 27.2, 0.95); cukeLeaf(g, 8.4, 10.8, 0.95); cukeLeaf(g, 21.6, 11.6, 0.95); cukeLeaf(g, 5.2, 28, 0.8); cukeLeaf(g, 24.8, 28.4, 0.8);
    cuke(g, 8.8, 21, 5.6); cuke(g, 21.2, 22, 5.6); flower(g, 15, 3, R.yellow, R.orange[2], false); return g; },
};

// ---- Khoai lang: dây bò lá tim tím, hoa loa kèn tím nhạt, củ đỏ tím dưới gốc ----
function heart(g, x, y, a, s = 1) {
  g.shape(x, y, 3.9 * s, 3.2 * s, a, R.purp, { lo: 1, bias: 0.1, rib: R.purp[2], ribTo: 0.6, veins: 2.5,
    cut: (u, v) => u < -0.72 && Math.abs(v) < 0.28 });
}
function tuber(g, x, y, a, len = 4.0) {
  g.shape(x, y, len, 2.3, a, R.mag, { round: true, spec: true, specAt: 0.8, fill: (dx, dy, i, u, v, px, py) => (hash(px * 3, py * 5) < 0.08 ? R.mag[Math.max(1, i - 1)] : null) });
}
DEF.khoailang = {
  s0: g => mound(g, () => { tuber(g, 13.4, 9, -0.2, 5); g.dots([[16, 4, R.purp[4]], [16, 5, R.purp[3]], [17, 5, R.purp[2]], [16, 6, R.purp[3]], [17, 6, R.purp[2]], [17, 3, L[4]], [18, 3, R.purp[3]]]); }),
  s1: g => { const b = g.b; g.stroke(CX, b, CX, b - 3, CX, b - 7, R.purp, 2); heart(g, 9.4, b - 9.4, PI + 0.4, 0.95); heart(g, 20.4, b - 11, -0.4, 0.95); return g; },
  s2: g => { const b = g.b; g.stroke(CX, b - 1, 8, b - 6, 2, b - 1, R.purp, 2, 1); g.stroke(CX, b - 1, 20, b - 6, 27, b - 3, R.purp, 2, 1);
    heart(g, 5.6, 10.8, UP - 0.6, 0.9); heart(g, 12.4, 6, UP - 0.2, 0.9); heart(g, 20, 7.2, UP + 0.3, 0.9); heart(g, 25.2, 12.8, UP + 0.8, 0.8); heart(g, 15.6, 13.2, UP + 0.1, 0.7); return g; },
  s3: g => { const b = g.b; g.stroke(CX, b - 1, 8, b - 6, 2, b - 1, R.purp, 2, 1); g.stroke(CX, b - 1, 20, b - 6, 27, b - 3, R.purp, 2, 1);
    heart(g, 5.2, 12.4, UP - 0.6, 0.9); heart(g, 11.2, 7.2, UP - 0.2, 0.9); heart(g, 25.2, 12.8, UP + 0.8, 0.85); heart(g, 16, 14.4, UP + 0.2, 0.75);
    g.ball(20, 6.8, 3.4, 3.0, R.lav, { lo: 1, hi: 4 }); g.dots([[20, 6, R.purp[1]], [19, 6, R.purp[2]], [20, 7, R.purp[2]], [18, 5, R.lav[1]], [21, 9, R.lav[1]], [20, 10, R.lav[1]], [20, 11, R.purp[2]]]); return g; },
  s4: g => { const b = g.b; g.stroke(CX, b - 1, 8, b - 6, 2, b - 1, R.purp, 2, 1); g.stroke(CX, b - 1, 20, b - 6, 27, b - 1, R.purp, 2, 1);
    heart(g, 5.2, 10.8, UP - 0.6, 0.9); heart(g, 12, 6, UP - 0.2, 0.95); heart(g, 20, 6.4, UP + 0.3, 0.95); heart(g, 25.6, 11.6, UP + 0.8, 0.85); heart(g, CX + 1, 13.2, UP, 0.7);
    tuber(g, 8, 18.8, 0.35); tuber(g, 22, 19.2, -0.3, 4.4); return g; },
};

// ---- Ớt: bụi lá bóng nhọn, hoa trắng nhỏ, trái chỉ thiên xanh → đỏ ----
function chili(g, x, y, ramp) {
  g.shape(x, y, 3.8, 1.4, UP, ramp, { lo: 1, hi: 4, spec: true, specAt: 0.55 });
  g.dots([[x, y + 3.6, L[2]], [x - 1, y + 3.6, L[3]], [x, y + 4.4, L[1]]].map(([a, b, c]) => [Math.floor(a), Math.floor(b), c]));
}
function chiliBush(g) {
  const b = g.b - 1, D = R.dleaf;
  g.stroke(CX, b, CX, b - 5, CX, b - 10, D, 2); g.stroke(CX, b - 6, 11, b - 9, 8, b - 12, D, 1); g.stroke(CX, b - 8, 19, b - 11, 22, b - 14, D, 1);
  for (const [x, y, a, s] of [[5.8, b - 14.8, UP - 0.6, 1], [21.8, b - 16.4, UP + 0.6, 1], [CX, b - 16.8, UP, 1.05],
    [4.6, b - 7.2, PI + 0.35, 0.9], [25.4, b - 8.4, -0.35, 0.9], [9.8, b - 11.2, UP - 0.3, 0.9], [20.2, b - 10.8, UP + 0.4, 0.9]])
    g.shape(x, y, 4.0 * s, 1.8 * s, a, D, { lo: 1, rib: D[2], ribTo: 0.6, spec: true, specAt: 0.62 });
}
DEF.ot = {
  s0: g => mound(g, () => { g.dots([[7, 9], [11, 10], [17, 9], [21, 10], [8, 9], [18, 9]].map(([x, y]) => [x, y, R.yellow[5]])); g.dots([[13, 7, R.red[3]], [14, 7, R.red[2]], [13, 8, R.red[2]], [14, 8, R.red[1]], [12, 7, R.red[4]]]); }),
  s1: g => { const b = g.b; g.stroke(CX, b, CX, b - 3, CX, b - 7, R.dleaf, 2);
    g.shape(9.4, b - 9.2, 4.0, 1.6, PI + 0.5, R.dleaf, { lo: 1, rib: R.dleaf[2] }); g.shape(20.6, b - 9.2, 4.0, 1.6, -0.5, R.dleaf, { lo: 1, rib: R.dleaf[2] }); g.dots([[CX - 1, b - 9, R.dleaf[4]], [CX, b - 9, R.dleaf[3]]]); return g; },
  s2: g => { chiliBush(g); return g; },
  s3: g => { chiliBush(g);
    for (const [x, y] of [[7, 5], [21, 3], [CX, 11]]) flower(g, x, y, R.white, R.yellow[3], false);
    chili(g, 11.2, 16.8, R.dleaf.map((c, i) => (i < 2 ? c : R.leaf[i]))); chili(g, 19.6, 15.6, R.leaf); return g; },
  s4: g => { chiliBush(g);
    chili(g, 8.8, 8.4, R.red); chili(g, CX, 6, R.red); chili(g, 21.6, 7.2, R.red); chili(g, 11.6, 17.6, R.orange); chili(g, 19.2, 16.4, R.red); chili(g, 24.8, 15.6, R.red);
    return g; },
};

// ---- Su hào: lá xanh lơ cuống dài, củ tròn mọc trên đất (xanh nhạt → tím) ----
function kohlLeaves(g, pts, from) {
  for (const [x, y, a, s] of pts) {
    g.stroke(from[0], from[1], (from[0] + x) / 2, (from[1] + y) / 2 + 1, x, y, () => R.kohl[3], 1);
    g.shape(x, y, 4.0 * s, 2.6 * s, a, R.blue, { round: true, rib: R.blue[5], ribTo: 0.6, veins: 2.5, cut: serr2 });
  }
}
DEF.suhao = {
  s0: g => mound(g, () => { for (const [x, y] of [[8, 8], [14, 7], [20, 8], [11, 10], [18, 10]]) seed2(g, x, y, [R.kohl[0], R.kohl[1], R.kohl[3]]); }),
  s1: g => { const b = g.b; g.stroke(CX, b, CX, b - 3, CX, b - 6, R.kohl, 2); g.line(10, b - 6, 20, b - 6, R.kohl[3]);
    g.shape(8.2, b - 7.4, 3.6, 2.6, PI + 0.3, R.blue, { round: true, rib: R.blue[4], ribTo: 0.4 }); g.shape(21.8, b - 7.4, 3.6, 2.6, -0.3, R.blue, { round: true, rib: R.blue[4], ribTo: 0.4 }); return g; },
  s2: g => { kohlLeaves(g, [[6.6, 8.8, UP - 0.7, 0.95], [23.4, 8.8, UP + 0.7, 0.95], [CX, 5.6, UP, 1]], [CX, 14]);
    g.ball(CX, g.b - 3.4, 3.6, 3.0, R.kpale, { spec: true }); return g; },
  s3: g => { kohlLeaves(g, [[5.8, 8, UP - 0.7, 1], [24.2, 8, UP + 0.7, 1], [CX, 5.2, UP, 1.05]], [CX, 16]);
    g.ball(CX, g.b - 4.8, 5.6, 4.6, R.kpale, { spec: true, specAt: 0.85 });
    g.dots([[12, 18, R.kohl[3]], [12, 19, R.kohl[2]], [18, 20, R.kohl[3]], [18, 21, R.kohl[2]]]); return g; },
  s4: g => { kohlLeaves(g, [[5.8, 7.6, UP - 0.7, 1], [24.2, 7.6, UP + 0.7, 1], [CX, 5.2, UP, 1.05], [3.4, 14.4, PI + 0.4, 0.75], [26.6, 14.4, -0.4, 0.75]], [CX, 18]);
    g.ball(CX, g.b - 7, 8.0, 6.6, R.kohl, { spec: true, specAt: 0.85 });
    for (const [x, y] of [[10, 18], [19, 18], [14, 24], [21, 23]]) g.dots([[x, y, R.kohl[1]], [x + 1, y, R.kohl[2]], [x, y + 1, R.kohl[2]]]);
    return g; },
};

// ---- Bắp cải: lá to tròn xanh lơ có gân, cuộn thành bắp tròn ----
function cabLeaf(g, x, y, a, s = 1) { g.shape(x, y, 5.0 * s, 4.6 * s, a, R.blue, { round: true, rib: R.blue[4], ribW: 0.8, ribTo: 0.4, veins: 2.5, cut: (u, v, f) => Math.abs(v) > f - 0.12 && Math.floor((u + 1) * 5) % 3 === 0 }); }
function cabHead(g, x, y, rx, ry) {
  g.ball(x, y, rx, ry, R.cab, { lo: 1, hi: 4, spec: true, specAt: 0.9 });
  g.stroke(x - rx + 1, y + 1, x - rx * 0.4, y - ry * 0.9, x + 1, y - ry + 1, () => R.cab[1], 1);
  g.stroke(x + rx - 1, y + 1, x + rx * 0.3, y + ry * 0.7, x - 1, y + ry - 1, () => R.cab[2], 1);
  g.stroke(x - rx * 0.6, y + ry * 0.5, x - rx * 0.1, y + ry * 0.1, x + rx * 0.3, y - ry * 0.3, () => R.cab[3], 1);
}
DEF.bapcai = {
  s0: g => mound(g, () => { for (const [x, y] of [[8, 8], [14, 7], [20, 8], [11, 10], [18, 10]]) seed2(g, x, y, ['#2a2a32', '#4a4a56', '#7a7a88']); }),
  s1: g => { const b = g.b; g.stroke(CX, b, CX, b - 3, CX, b - 6, R.blue, 2);
    g.shape(8.6, b - 7.2, 4.4, 2.8, PI + 0.15, R.blue, { round: true, rib: R.blue[4], ribTo: 0.4 }); g.shape(21.4, b - 7.2, 4.4, 2.8, -0.15, R.blue, { round: true, rib: R.blue[4], ribTo: 0.4 }); return g; },
  s2: g => { cabLeaf(g, 5.2, 13.2, PI + 0.2, 0.75); cabLeaf(g, 24.8, 13.2, -0.2, 0.75);
    cabLeaf(g, 8.8, 8.8, UP - 0.7, 0.9); cabLeaf(g, 21.2, 8.8, UP + 0.7, 0.9); cabLeaf(g, CX, 7.2, UP, 0.85); return g; },
  s3: g => { cabLeaf(g, 4.4, 16.4, PI + 0.2, 0.8); cabLeaf(g, 25.6, 16.4, -0.2, 0.8); cabLeaf(g, 7.6, 10, UP - 0.8, 0.95); cabLeaf(g, 22.4, 10, UP + 0.8, 0.95);
    cabHead(g, CX, 12.8, 5.6, 5.0); return g; },
  s4: g => { cabLeaf(g, 6, 12, UP - 0.9, 0.95); cabLeaf(g, 24, 12, UP + 0.9, 0.95);
    cabHead(g, CX, 12, 9.2, 8.0);
    g.shape(8.8, 19.6, 6.0, 3.2, PI - 0.25, R.blue, { round: true, rib: R.blue[4], ribTo: 0.5, veins: 2.5 }); g.shape(21.2, 19.6, 6.0, 3.2, 0.25, R.blue, { round: true, rib: R.blue[4], ribTo: 0.5, veins: 2.5 });
    return g; },
};

// ---------- nông sản 24x24 cho 8 cây mới ----------
const PRODUCE = {
  hanhla: g => { for (const [x0, x1] of [[6, 13], [8, 17], [10, 20]]) g.stroke(x0, 21, (x0 + x1) / 2, 11, x1, 2, (t, k) => (t < 0.3 ? (k ? R.white[2] : R.white[4]) : t > 0.8 ? R.scal[4] : (k ? R.scal[2] : R.scal[3])), 2, 1);
    g.stroke(7, 21, 11, 12, 15, 3, (t, k) => (t < 0.3 ? R.white[3] : k ? R.scal[2] : R.scal[4]), 2, 1);
    g.dots([[4, 21, R.white[2]], [5, 21, R.white[1]], [6, 22, R.white[1]]]);
    g.dots([[5, 16, R.red[3]], [6, 16, R.red[2]], [7, 16, R.red[3]], [8, 15, R.red[2]], [9, 15, R.red[1]], [6, 15, R.red[4]], [7, 15, R.red[4]], [10, 15, R.red[3]], [5, 17, R.red[1]], [8, 16, R.red[1]], [9, 14, R.red[3]], [10, 14, R.red[2]]]); return g; },
  dauphong: g => { g.ball(8, 14.6, 5.2, 4.6, R.tan, { lo: 1, hi: 4, spec: true, specAt: 0.85, fill: (dx, dy, i, u, v, x, y) => ((x + y * 2) % 4 === 0 && i < 4 ? R.tan[Math.max(1, i - 1)] : null) });
    g.ball(15.6, 7.8, 5.0, 4.4, R.tan, { lo: 1, hi: 4, spec: true, specAt: 0.85, fill: (dx, dy, i, u, v, x, y) => ((x + y * 2) % 4 === 0 && i < 4 ? R.tan[Math.max(1, i - 1)] : null) });
    g.dots([[11, 11, R.tan[1]], [12, 11, R.tan[2]], [12, 10, R.tan[1]], [11, 12, R.tan[2]], [19, 3, R.tan[1]], [20, 3, R.tan[0]]]); return g; },
  raumuong: g => { for (const x of [5, 9, 13]) g.stroke(x, 21, x + 2, 14, x + 4, 7, R.scal, 2, 1);
    arrow(g, 7.6, 5.2, UP - 0.3, 0.9); arrow(g, 13.6, 4.4, UP + 0.1, 0.9); arrow(g, 18.4, 8.4, UP + 0.6, 0.85);
    g.line(4, 16, 13, 15, R.red[3]); g.line(4, 17, 13, 16, R.red[1]); return g; },
  dualeo: g => { g.shape(12, 12, 10.2, 4.0, -0.75, R.dleaf, { round: true, lo: 1, hi: 4, spec: true, specAt: 0.7,
      fill: (dx, dy, i, u, v, x, y) => ((x * 2 + y) % 5 === 0 && Math.abs(v) < 0.7 ? R.dleaf[Math.min(5, i + 2)] : null) });
    g.dots([[3, 20, R.yellow[3]], [4, 20, R.yellow[4]], [3, 21, R.yellow[2]], [20, 3, L[2]], [21, 3, L[3]], [21, 2, L[2]]]); return g; },
  khoailang: g => { g.shape(12, 12.6, 9.6, 5.0, -0.4, R.mag, { round: true, spec: true, specAt: 0.82, fill: (dx, dy, i, u, v, x, y) => (hash(x * 3 + 1, y * 5) < 0.07 ? R.mag[Math.max(1, i - 1)] : null) });
    g.dots([[21, 6, R.mag[1]], [22, 5, R.mag[0]], [2, 16, R.mag[1]], [1, 17, R.mag[0]], [8, 14, R.mag[2]], [13, 12, R.mag[2]], [16, 10, R.mag[2]]]); return g; },
  ot: g => { g.shape(10.6, 13.4, 8.6, 2.8, 1.0, R.red, { spec: true, specAt: 0.6, prof: u => (u < 0 ? Math.sqrt(1 - u * u) : 1 - u * u) });
    g.stroke(6, 6, 5, 4, 3, 2, L, 2, 1); g.dots([[6, 5, L[3]], [7, 6, L[2]], [5, 7, L[2]], [7, 5, L[4]]]); return g; },
  suhao: g => { g.ball(12, 14, 8.6, 7.2, R.kohl, { spec: true, specAt: 0.85 });
    for (const [x, y] of [[11, 3], [19, 4], [3, 6]]) g.stroke(12, 8, (12 + x) / 2, (8 + y) / 2, x, y, () => R.kohl[3], 1);
    g.dots([[19, 3, R.blue[4]], [20, 3, R.blue[3]], [11, 2, R.blue[4]], [10, 2, R.blue[3]], [3, 5, R.blue[4]], [8, 14, R.kohl[2]], [9, 14, R.kohl[1]], [16, 17, R.kohl[2]], [17, 17, R.kohl[1]]]); return g; },
  bapcai: g => { cabHead(g, 12, 11.4, 9.0, 8.2);
    g.shape(4.6, 17, 4.4, 2.6, PI - 0.6, R.blue, { round: true, rib: R.blue[4], ribTo: 0.5 }); g.shape(19.4, 17, 4.4, 2.6, 0.6, R.blue, { round: true, rib: R.blue[4], ribTo: 0.5 }); return g; },
};

// ---------- dựng ----------
const oldCanvasH = (id, s) => (s === 0 || !THIN.has(id) ? T[id][s] + 2 : T[id][s]);
const wiltH = (id, s, sq) => Math.max(3, Math.round(T[id][s] * sq)) + (s === 0 || !THIN.has(id) ? 2 : 0);
function build(id) {
  const def = DEF[id], raw = [0, 1, 2, 3, 4].map(s => def['s' + s](new G(2 * oldCanvasH(id, s))));
  return {
    stages: raw.map(finish),
    sick: finish(sickOf(raw[2], 2 * wiltH(id, 2, 0.95))),
    rotten: finish(rottenOf(raw[4], 2 * wiltH(id, 4, 0.9))),
    dead: finish(deadOf(raw[3], 2 * wiltH(id, 3, 0.82))),
  };
}
export const CROP10_IDS = Object.keys(T);
export const SPR10 = {
  crop: Object.fromEntries(CROP10_IDS.map(id => [id, build(id)])),
  produce: Object.fromEntries(Object.entries(PRODUCE).map(([id, f]) => [id, finish(f(new G(24, 24)))])),
};

// ---------- hình in trên túi hạt giống: 22x18, art12.js seedBag (túi 28x28) dùng, đủ 16 loại cây ----------
// 8 cây mới: vẽ lại đúng nét nông sản 24x24 ở trên trên lưới nhỏ hơn (toạ độ và cỡ khối nhân k rồi tô lại từng điểm ảnh,
// không co ảnh nên nét vẫn sắc). 8 cây cũ: vẽ thẳng ở lưới 22x18 bằng cùng bộ khối, dải màu với cây trên ruộng.
const PIC_W = 22, PIC_H = 18, PIC_K = 0.72;
class Small extends G {
  constructor(k) { super(PIC_H, PIC_W); this.k = k; this.ox = (PIC_W - 24 * k) / 2; this.oy = (PIC_H - 24 * k) / 2; }
  X(v) { return v * this.k + this.ox; }
  Y(v) { return v * this.k + this.oy; }
  pX(v) { return Math.round((v + 0.5) * this.k + this.ox - 0.5); }   // toạ độ ô điểm ảnh: lấy tâm ô
  pY(v) { return Math.round((v + 0.5) * this.k + this.oy - 0.5); }
  shape(cx, cy, len, wid, ang, ramp, o) { return super.shape(this.X(cx), this.Y(cy), len * this.k, wid * this.k, ang, ramp, o); }
  stroke(x0, y0, cx, cy, x1, y1, col, w0, w1) { return super.stroke(this.X(x0), this.Y(y0), this.X(cx), this.Y(cy), this.X(x1), this.Y(y1), col, w0, w1); }
  line(x0, y0, x1, y1, c) { return super.line(this.pX(x0), this.pY(y0), this.pX(x1), this.pY(y1), c); }
  dots(pts, c) { return super.dots(pts.map(([x, y, col]) => [this.pX(x), this.pY(y), col]), c); }
}
const kernel = (dx, dy, i, u, v, x, y) => { const cell = (x + Math.floor(y / 2)) % 2, row = y % 2; return R.yellow[Math.min(5, Math.max(1, i + (row ? -1 : 0) + (cell ? 0 : 1) - 1))]; };
const PIC_OLD = {
  // cây cải bẹ: bẹ trắng mập xòe từ gốc, phiến lá xanh tròn có gân ở ngọn
  cai: g => { const bx = 11, by = 16;
    for (const a of [UP - 0.62, UP + 0.62, UP - 0.2, UP + 0.2]) {
      g.shape(bx + Math.cos(a) * 3.2, by + Math.sin(a) * 3.2, 3.4, 1.5, a, R.cream, { round: true, lo: 1, hi: 4 });
      g.shape(bx + Math.cos(a) * 8, by + Math.sin(a) * 8, 4.4, 3.1, a, L, { round: true, rib: R.cream[3], ribW: 0.7, ribTo: 0.3, veins: 2.5 });
    }
    return g; },
  // củ cà rốt nằm chéo, vai to, vân ngang, chùm lá lông chim
  carot: g => {
    for (const [x, y] of [[11, 1.5], [16, 1], [20, 4.5]]) g.stroke(14.6, 6.8, (14.6 + x) / 2 + 0.5, (6.8 + y) / 2 + 0.3, x, y, L, 1);
    g.dots([[10, 2, L[4]], [12, 3, L[2]], [11, 4, L[3]], [14, 2, L[4]], [17, 2, L[2]], [15, 3, L[3]], [18, 4, L[4]], [20, 6, L[2]], [19, 6, L[3]], [11, 1, L[5]], [16, 1, L[5]], [20, 4, L[5]]]);
    const prof = u => (u < -0.55 ? Math.sqrt(Math.max(0, 1 - ((u + 0.55) / 0.45) ** 2)) : 1 - ((u + 0.55) / 1.55) ** 1.3 * 0.85);
    g.shape(9.8, 11, 7.4, 3.0, PI * 0.75, R.orange, { prof, spec: true, specAt: 0.7,
      fill: (dx, dy, i, u, v, x, y) => (u > -0.6 && u < 0.75 && Math.abs(v) < 0.75 && Math.floor((u + 1) * 7) % 3 === 0 && (x + y) % 3 ? R.orange[Math.max(1, i - 1)] : null) });
    return g; },
  // bó lúa: cọng vàng buộc lạt, ba bông trĩu hạt rủ ra hai bên
  lua: g => {
    g.layer++;
    for (let x = 8; x <= 14; x++) for (let y = 7; y <= 16; y++) g.set(x + (y < 11 ? Math.round((x - 11) * (11 - y) * 0.12) : 0), y, (x + (y >> 1)) % 3 === 0 ? R.gold[1] : x < 11 ? R.gold[3] : R.gold[2]);
    g.dots([[8, 11, R.wood[3]], [9, 11, R.wood[4]], [10, 11, R.wood[4]], [11, 11, R.wood[3]], [12, 11, R.wood[3]], [13, 11, R.wood[2]], [14, 11, R.wood[2]],
      [8, 12, R.wood[1]], [9, 12, R.wood[2]], [10, 12, R.wood[2]], [11, 12, R.wood[2]], [12, 12, R.wood[1]], [13, 12, R.wood[1]], [14, 12, R.wood[1]]]);
    panicle(g, 7, 3, -1, 6, R.gold); panicle(g, 14, 3, 1, 6, R.gold); panicle(g, 11, 1, 1, 4, R.gold);
    return g; },
  // quả cà chua chín đỏ bóng, tai lá xanh, một quả nhỏ phía sau
  cachua: g => {
    g.ball(16.4, 11.8, 3.6, 3.4, R.red, { spec: true, specAt: 0.82 });
    g.dots([[15, 8, L[3]], [16, 8, L[2]], [17, 8, L[3]], [16, 7, L[4]]]);
    g.ball(9.6, 10.6, 6.6, 5.6, R.red, { spec: true, specAt: 0.82 });
    for (const [x, y, a] of [[7.0, 5.2, PI + 0.3], [12.2, 5.2, -0.3], [8.6, 4.2, UP - 0.8], [10.6, 4.2, UP + 0.8]]) g.shape(x, y, 2.0, 0.9, a, L);
    g.dots([[9, 2, L[4]], [10, 2, L[3]], [9, 3, L[2]], [10, 3, L[1]]]); return g; },
  // trái bắp nằm chéo, hạt vàng xếp hàng, lá bẹ ôm gốc, râu nâu ở ngọn
  bap: g => {
    g.shape(12.2, 8.0, 7.0, 3.3, -0.8, R.yellow, { round: true, fill: kernel, lo: 2, hi: 4 });
    g.dots([[18, 2, R.wood[3]], [19, 1, R.wood[4]], [19, 2, R.wood[2]], [20, 2, R.wood[3]], [18, 1, R.wood[4]], [20, 1, R.wood[2]]]);
    g.shape(8.2, 12.4, 6.6, 2.0, -0.5, L, { veins: 2 }); g.shape(11.0, 12.8, 5.6, 1.7, -1.15, L, { veins: 2 });
    g.stroke(3, 16, 4, 15, 5, 14.4, L, 2); return g; },
  // quả dâu tây đỏ lấm tấm hạt vàng, đài lá xanh
  dau: g => {
    g.shape(11, 10.8, 5.4, 5.4, DOWN, R.red, { prof: u => (u < 0 ? Math.sqrt(1 - u * u * 0.8) : 1 - u * u * 0.85), spec: true, specAt: 0.8,
      fill: (dx, dy, i, u, v, px, py) => (py % 3 === 1 && (px + ((py / 3) | 0) * 2) % 3 === 0 && Math.abs(v) < 0.8 && u > -0.6 ? (i >= 3 ? R.yellow[3] : R.yellow[1]) : null) });
    for (const [x, y, a] of [[7.4, 5.6, PI + 0.25], [14.6, 5.6, -0.25], [9.2, 4.4, UP - 0.75], [12.8, 4.4, UP + 0.75]]) g.shape(x, y, 2.6, 1.1, a, L, { rib: L[2], ribTo: 0.4 });
    g.dots([[11, 2, L[4]], [11, 3, L[2]], [12, 1, L[3]]]); return g; },
  // quả bí ngô cam có múi, cuống gỗ, một lá nhỏ
  bingo: g => {
    pumLeaf(g, 16.8, 4.8, 0.55);
    g.ball(11, 10.6, 8.6, 5.2, R.orange, { spec: true, specAt: 0.85, fill: (dx, dy, i) => ([-5.4, -1.8, 1.8, 5.4].some(k => Math.abs(dx - k * (1 - (dy / 7) ** 2 * 0.3)) < 0.6) ? R.orange[Math.max(1, i - 1)] : null) });
    g.stroke(11, 6.4, 11, 4.2, 12.6, 2.6, R.wood, 2); return g; },
  // quả dưa hấu sọc, cuống và tua cuốn
  duahau: g => {
    g.ball(11, 10.6, 8.8, 5.4, R.wmel, { fill: stripe, spec: true, specAt: 0.84 });
    g.stroke(11, 5.6, 11.4, 3.8, 13, 3, R.grey, 1); tendril(g, 14, 3, 1, R.grey[3]); return g; },
};
export const SEEDPIC10 = Object.fromEntries(CROP10_IDS.map(id => [id, finish(PIC_OLD[id] ? PIC_OLD[id](new G(PIC_H, PIC_W)) : PRODUCE[id](new Small(PIC_K)))]));
