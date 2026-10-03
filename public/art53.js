// Art trái khổng lồ (issue 53): mỗi loại cây một trái khổng lồ riêng (không tô lại chung một hình), to hơn ô ruộng.
// Hình mới nên có cả hai bản: SPR53_OLD = bản thường, SPR53 = bản 2x cùng khóa, mỗi ảnh đúng gấp đôi; hd.js nối hai bản.
//   giant[id]      24x24 (2x: 48x48): trái khổng lồ trên ô ruộng, hàng đáy chạm đất, căn giữa ngang.
//                  Vẽ ở (ôX + (16 - 24) / 2, ôY + 16 - 24): tràn 4 px mỗi bên và 8 px phía trên ô.
//   giantIcon[id]  16x16 (2x: 32x32): biểu tượng trong giỏ / kho, trái đầy khung, lấp lánh vàng góc trên-phải.
//   giantSpark[0..2] 5x5 (2x: 10x10): ba khung lấp lánh (nhỏ → to → nhỏ) vẽ động trên trái khổng lồ.
// Hai bản dựng cùng một hình học (toạ độ theo điểm ảnh bản thường, nhân tỉ lệ) nhưng tô lại từng điểm ảnh ở mỗi cỡ,
// bản 2x thêm gân lá, vân, hạt, đốm gai, chấm sáng; không phóng to ảnh.
// Phong cách theo art5 / art10: viền tối 1px (mép hứng sáng nhạt hơn), mỗi mảng 4 sắc độ, sáng từ trên-trái, điểm sáng.
import { canvas, hash } from './art.js';

const PI = Math.PI, UP = -PI / 2, DOWN = PI / 2;

// Dải màu 6 bậc: [rất tối (viền), tối, hơi tối, gốc, sáng, điểm sáng] (giữ bảng màu art4 / art10)
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
  wmel:  ['#0f3a14', '#1f5a24', '#2f7a30', '#5cb85c', '#8cd47a', '#c8f0b0'],
  cuke:  ['#0e2e12', '#1a4a1e', '#24622a', '#2f7a30', '#4e9a48', '#9ed08a'],
  cab:   ['#3e6a44', '#5a8c5a', '#7aae72', '#a2cc8c', '#c8e6ac', '#ecf8d8'],
  pleaf: ['#2f4a12', '#4a6a1c', '#6a8c2c', '#8aa83e', '#b4c862', '#dce49a'],
  lav:   ['#5a3a78', '#8a62a8', '#b494cc', '#d8c4e8', '#f2eaf8', '#ffffff'],
};
const L = R.leaf;
const RAMPOF = new Map();
for (const r of Object.values(R)) r.forEach((c, i) => { if (!RAMPOF.has(c)) RAMPOF.set(c, [r, i]); });

// ---------- màu ----------
const rgb = c => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lum = c => { const [r, g, b] = rgb(c); return 0.3 * r + 0.59 * g + 0.11 * b; };
const shade = (c, f) => hex(rgb(c).map(v => v * f));
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const dk = (r, i, n = 1) => r[Math.max(1, i - n)];
// Viền 1px của bản 2x mỏng bằng nửa viền bản thường: nới khối thêm chừng ấy để hai bản cùng dáng to nhỏ.
const GROW = 0.7;
const LX = -0.5, LY = -0.62, LZ = 0.6;
const qi = (I, lo, hi) => Math.max(lo, Math.min(hi, lo + Math.floor((I + 0.35) / 1.25 * (hi - lo + 1))));

// ---------- lưới điểm ảnh ----------
// Toạ độ vẽ tính theo điểm ảnh bản thường (khung 24); S = số điểm ảnh thật trên một đơn vị (1 bản thường, 2 bản 2x,
// nhỏ hơn khi dựng biểu tượng). Hàng / cột ngoài cùng để dành cho viền. Mỗi lần vẽ là một lớp: khối vẽ sau đè khối
// trước thì mép dưới / phải của nó thành đường tối ngăn cách.
class G {
  constructor(w, h, k, S = k, ox = 0, oy = 0) {
    Object.assign(this, { w, h, k, S, ox, oy, icon: false, layer: 0 });
    this.a = new Array(w * h).fill(null); this.z = new Int32Array(w * h).fill(-1); this.sh = new Uint8Array(w * h);
  }
  get hd() { return this.k === 2; }
  X(v) { return this.ox + v * this.S; }
  Y(v) { return this.oy + v * this.S; }
  ok(x, y) { return x >= 1 && y >= 1 && x < this.w - 1 && y < this.h - 1; }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.a[y * this.w + x] : null; }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (c && this.ok(x, y)) { const i = y * this.w + x; this.a[i] = c; this.z[i] = this.layer; }
    return this;
  }
  // điểm ảnh lẻ theo toạ độ đơn vị
  px(x, y, c) { return this.set(this.X(x), this.Y(y), c); }
  dots(pts, c) { this.layer++; for (const [x, y, col] of pts) this.px(x, y, col ?? c); return this; }
  // Nét cong bậc hai dày w0 → w1 (đơn vị); col(t, k, w): k = 0 là mép hứng sáng.
  stroke(x0, y0, cx, cy, x1, y1, col, w0 = 1, w1 = w0) {
    this.layer++;
    [x0, cx, x1] = [x0, cx, x1].map(v => this.X(v)); [y0, cy, y1] = [y0, cy, y1].map(v => this.Y(v));
    const n = Math.ceil(Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy)) * 3 + 2;
    const f = Array.isArray(col) ? (t, k, w) => (w === 1 || k === 0 ? col[3] : col[2]) : col;
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), d = t * t;
      const x = a * x0 + b * cx + d * x1, y = a * y0 + b * cy + d * y1;
      const tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
      const w = Math.max(1, Math.round((w0 + (w1 - w0) * t) * this.S)), vert = Math.abs(ty) >= Math.abs(tx);
      for (let k = 0; k < w; k++) {
        const px = vert ? Math.round(x - w / 2) + k : Math.floor(x), py = vert ? Math.floor(y) : Math.round(y - w / 2) + k;
        this.set(px, py, f(t, k, w));
      }
    }
    return this;
  }
  // Tô một khối đã biết các điểm: M = Map(chỉ số → [x, y, nx, ny, nz, ...thêm]); đổ bóng theo pháp tuyến, viền ngăn cách.
  mass(M, ramp, o, extra) {
    const Lr = this.layer, n = ramp.length, lo = o.lo ?? 1, hi = o.hi ?? 4, out = [];
    for (const [k, p] of M) {
      const [x, y, nx, ny, nz] = p;
      const I = nx * LX + ny * LY + nz * LZ + (o.bias ?? 0);
      const i = qi(I, lo, hi);
      let c = ramp[i];
      if (o.spec && I > (o.specAt ?? 0.9)) c = ramp[n - 1];
      const e = extra(p, i, c);
      if (e) c = e;
      if (o.rim !== false) for (const [ex, ey] of [[1, 0], [0, 1]]) {
        const nk = (y + ey) * this.w + x + ex;
        if (!M.has(nk) && this.get(x + ex, y + ey) && this.z[nk] < Lr) { c = o.edge ?? ramp[Math.max(0, lo - 1)]; break; }
      }
      out.push([x, y, c]);
    }
    for (const [x, y, c] of out) this.set(x, y, c);
    return this;
  }
  // Khối lá / trái: trục dài theo góc ang, nửa dài len, nửa rộng wid (đơn vị). Mặc định đầu nhọn (lá), round = khối cầu,
  // prof(u) = bề rộng theo trục. fill(dx, dy, i, u, v, x, y) đổi màu từng điểm (dx, dy theo đơn vị).
  shape(cx, cy, len, wid, ang, ramp, o = {}) {
    this.layer++;
    const S = this.S, gr = this.hd && !o.exact ? GROW : 0, pcx = this.X(cx), pcy = this.Y(cy);
    len = len * S + gr; wid = wid * S + gr;
    const ca = Math.cos(ang), sa = Math.sin(ang), ext = Math.ceil(Math.max(len, wid)) + 2, M = new Map();
    for (let y = Math.floor(pcy - ext); y <= pcy + ext; y++) for (let x = Math.floor(pcx - ext); x <= pcx + ext; x++) {
      if (!this.ok(x, y)) continue;
      const dx = x + 0.5 - pcx, dy = y + 0.5 - pcy, u = (dx * ca + dy * sa) / len, v = (-dx * sa + dy * ca) / wid;
      if (Math.abs(u) > 1) continue;
      const f = o.prof ? o.prof(u) : o.round ? Math.sqrt(1 - u * u) : (u > 0 ? 1 - u * u : Math.sqrt(1 - u * u));
      if (Math.abs(v) > f) continue;
      if (o.cut && o.cut(u, v, f, dx / S, dy / S)) continue;
      const nu = o.round ? u : u * 0.3, nv = o.round ? v : (f > 0 ? v / f : 0) * 0.75;
      const nz = Math.sqrt(Math.max(0, 1 - nu * nu - nv * nv));
      M.set(y * this.w + x, [x, y, nu * ca - nv * sa, nu * sa + nv * ca, nz, u, v, f, dx, dy]);
    }
    return this.mass(M, ramp, o, ([x, y, , , , u, v, f, dx, dy], i, c) => {
      let r = null;
      const a = u * len, bb = Math.abs(v * wid);
      if (o.rib && bb < (o.ribW ?? 0.5) && u > (o.ribFrom ?? -0.95) && u < (o.ribTo ?? 0.7)) r = o.rib;
      else if (o.veins && bb > 1 && bb < f * wid - 0.8 && u > -0.8 && u < 0.75 && Math.abs((((a - bb * 0.9) % o.veins) + o.veins) % o.veins) < 0.55) r = ramp[Math.max(o.lo ?? 1, i - 1)];
      if (o.fill) r = o.fill(dx / S, dy / S, i, u, v, x, y) ?? r;
      return r;
    });
  }
  ball(cx, cy, rx, ry, ramp, o = {}) { return this.shape(cx, cy, rx, ry, 0, ramp, { round: true, ...o }); }
  // Khối ống cong (cà rốt, dưa leo, ớt, khoai, hành): trục bậc hai, nửa bề rộng wf(t); đầu ống tròn.
  // fill(t, s, i, x, y): t dọc trục (0 → 1), s ngang ống (-1 trái → 1 phải theo chiều đi).
  tube(x0, y0, cx, cy, x1, y1, wf, ramp, o = {}) {
    this.layer++;
    const S = this.S, gr = this.hd && !o.exact ? GROW : 0, P = [];
    const len = (Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy)) * S, N = Math.ceil(len * 1.5) + 4;
    let mw = 0;
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), d = t * t;
      const tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy), tl = Math.hypot(tx, ty) || 1;
      const w = Math.max(0.5, wf(t) * S + gr);
      P.push([this.X(a * x0 + b * cx + d * x1), this.Y(a * y0 + b * cy + d * y1), w, tx / tl, ty / tl, t]); mw = Math.max(mw, w);
    }
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]), M = new Map(), fl = o.flat ?? 1;
    for (let y = Math.floor(Math.min(...ys) - mw - 1); y <= Math.max(...ys) + mw + 1; y++)
      for (let x = Math.floor(Math.min(...xs) - mw - 1); x <= Math.max(...xs) + mw + 1; x++) {
        if (!this.ok(x, y)) continue;
        const qx = x + 0.5, qy = y + 0.5;
        let best = null, bv = 9;
        for (const p of P) { const v = Math.hypot(qx - p[0], qy - p[1]) / p[2]; if (v < bv) { bv = v; best = p; } }
        if (bv > 1) continue;
        const [bx, by, w, tx, ty, t] = best, nx = (qx - bx) / w * fl, ny = (qy - by) / w * fl;
        const s = (tx * (qy - by) - ty * (qx - bx)) / w;
        M.set(y * this.w + x, [x, y, nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), t, s]);
      }
    return this.mass(M, ramp, o, ([x, y, , , , t, s], i) => (o.fill ? o.fill(t, s, i, x, y) : null));
  }
  // bóng đổ mềm dưới trái (không có trong biểu tượng)
  shadow(cx, cy, rx, ry) {
    if (this.icon) return;
    const S = this.S, pcx = this.X(cx), pcy = this.Y(cy);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const e = ((x + 0.5 - pcx) / (rx * S)) ** 2 + ((y + 0.5 - pcy) / (ry * S)) ** 2;
      if (e <= 1) this.sh[y * this.w + x] = e < 0.45 ? 2 : 1;
    }
  }
}

// Viền 1px: mép trên / trái (hứng sáng) nhạt hơn mép dưới / phải; bóng đổ nằm dưới cùng.
function finish(g) {
  const c = canvas(g.w, g.h), x = c.getContext('2d'), a = g.a.slice();
  for (let y = 0; y < g.h; y++) for (let i = 0; i < g.w; i++) {
    if (g.get(i, y)) continue;
    const r = g.get(i + 1, y), d = g.get(i, y + 1), l = g.get(i - 1, y), u = g.get(i, y - 1);
    const ns = [r, d, l, u].filter(Boolean);
    if (!ns.length) continue;
    const best = ns.reduce((p, q) => (lum(q) < lum(p) ? q : p));
    const lit = !l && !u, rr = RAMPOF.get(best);
    a[y * g.w + i] = rr && rr[1] > 0 ? (lit ? mix(rr[0][0], rr[0][1], 0.5) : rr[0][0]) : shade(best, lit ? 0.62 : 0.45);
  }
  for (let y = 0; y < g.h; y++) for (let i = 0; i < g.w; i++) {
    const k = y * g.w + i, col = a[k];
    if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); }
    else if (g.sh[k]) { x.fillStyle = g.sh[k] === 2 ? 'rgba(30,18,6,0.42)' : 'rgba(30,18,6,0.24)'; x.fillRect(i, y, 1, 1); }
  }
  return c;
}

// ---------- chi tiết dùng chung ----------
const ground = (g, cx, rx) => g.shadow(cx, 22.4, rx, 1.7);
// chấm sáng lấp lánh cố định trên mặt bóng của trái (lấp lánh động vẽ riêng)
function glint(g, x, y) {
  g.layer++;
  const X = Math.floor(g.X(x)), Y = Math.floor(g.Y(y));
  if (g.hd) {
    g.set(X, Y, '#ffffff'); g.set(X + 1, Y, '#ffffff'); g.set(X, Y + 1, '#ffffff'); g.set(X + 1, Y + 1, '#fffbe0');
    g.set(X, Y - 1, '#fffbe0'); g.set(X - 1, Y, '#fffbe0'); g.set(X + 2, Y + 1, '#fffbe0'); g.set(X + 1, Y + 2, '#fffbe0');
  } else g.set(X, Y, '#ffffff');
}
function leaf(g, x, y, len, wid, a, ramp = L, o = {}) {
  return g.shape(x, y, len, wid, a, ramp, { rib: ramp[2], ribTo: 0.6, veins: g.hd ? 2.5 : 0, ...o });
}
// tua cuốn xoắn
function tendril(g, x, y, dir, c = L[3]) {
  if (g.hd) g.dots([[x, y], [x + dir * 0.5, y - 0.5], [x + dir, y - 1], [x + dir * 1.5, y - 1], [x + dir * 2, y - 0.5], [x + dir * 2, y], [x + dir * 1.5, y + 0.5], [x + dir, y]], c);
  else g.dots([[x, y], [x + dir, y - 1], [x + 2 * dir, y - 1], [x + 2 * dir, y]], c);
}
// mặt cầu có múi dọc (bí ngô) / sọc dọc (dưa hấu): kinh tuyến chạy từ cuống xuống đáy
const merid = (u, v) => Math.asin(Math.max(-1, Math.min(1, u / Math.sqrt(Math.max(1e-6, 1 - v * v)))));
// ụ đất vun trước gốc (cà rốt, khoai lang), lấm tấm hạt đất
function soil(g, cx, cy, rx, ry) {
  g.shape(cx, cy, rx, ry, 0, R.soil, { round: true, lo: 2, hi: 5, fill: (dx, dy, i, u, v, x, y) => {
    const h = hash(x * 17 + 5, y * 31 + 7);
    return h < 0.12 ? R.soil[Math.max(1, i - 1)] : h > 0.95 ? R.tan[4] : null;
  } });
}

// ================= 16 trái khổng lồ =================
const DEF = {};

// ---- Cải xanh: bụi cải bẹ khổng lồ, bẹ trắng mập xòe, phiến lá xanh bóng gân trắng, vài nụ hoa vàng ----
DEF.cai = g => {
  ground(g, 12, 10.5);
  const bx = 12, by = 20.5;
  for (const [a, s] of [[UP - 1.05, 0.82], [UP + 1.05, 0.82], [UP - 0.6, 0.95], [UP + 0.6, 0.95], [UP - 0.2, 1.05], [UP + 0.22, 1.0]]) {
    const ca = Math.cos(a), sa = Math.sin(a);
    g.shape(bx + ca * 6.6 * s, by + sa * 6.6 * s, 5.4 * s, 1.9, a, R.cream, { round: true, lo: 1, hi: 4, rib: g.hd ? R.cream[4] : null, ribTo: 0.8 });
    leaf(g, bx + ca * 13.2 * s, by + sa * 13.2 * s, 5.6 * s, 4.0 * s, a, L, { round: true, rib: R.cream[3], ribW: g.hd ? 0.8 : 0.5, ribFrom: -1, ribTo: 0.55, spec: true, specAt: 1.0 });
  }
  g.ball(bx, by - 0.4, 5.4, 2.6, R.cream, { lo: 1, hi: 4, spec: true, specAt: 0.95 });
  if (g.hd) g.dots([[9, 20.5, R.cream[2]], [11.5, 20.8, R.cream[2]], [14.5, 20.5, R.cream[2]]]);
  for (const [x, y] of [[12.5, 1.6], [5.5, 4.4]]) g.dots([[x - 1, y, R.yellow[3]], [x + 1, y, R.yellow[2]], [x, y - 1, R.yellow[4]], [x, y + 1, R.yellow[2]], [x, y, R.yellow[1]]]);
  glint(g, 8.2, 8.6);
};

// ---- Cà rốt: củ cam khổng lồ trồi nửa khỏi đất, vai to có khoanh, chùm lá lông chim ----
function frond(g, x0, y0, x1, y1) {
  g.stroke(x0, y0, (x0 + x1) / 2 + (x1 - x0) * 0.08, (y0 + y1) / 2 - 1, x1, y1, t => (t > 0.85 ? L[4] : L[2]), g.hd ? 0.5 : 1);
  const X0 = g.X(x0), Y0 = g.Y(y0), X1 = g.X(x1), Y1 = g.Y(y1), n = Math.hypot(X1 - X0, Y1 - Y0);
  const ux = (X1 - X0) / n, uy = (Y1 - Y0) / n, st = g.hd ? 3 : 2;
  g.layer++;
  for (let d = st * 1.5; d < n - 0.5; d += st) {
    const t = d / n, x = X0 + (X1 - X0) * t, y = Y0 + (Y1 - Y0) * t - Math.sin(t * PI) * g.S;
    for (const sd of [1, -1]) {
      const c = sd > 0 ? L[3] : L[4];
      g.set(x - uy * sd + ux * 0.3, y + ux * sd + uy * 0.3, c);
      if (g.hd) { g.set(x - uy * sd * 2 + ux, y + ux * sd * 2 + uy, sd > 0 ? L[2] : L[3]); }
    }
  }
}
DEF.carot = g => {
  ground(g, 12, 10.5);
  for (const [x, y] of [[1.5, 6.5], [2.8, 2.2], [6.5, 0.6], [11, 0.4], [15.5, 0.6], [19.5, 2], [21.8, 5.5], [8.5, 2.4], [14.5, 2.6]]) frond(g, 12, 7.4, x, y);
  g.dots([[11.5, 7.5, L[1]], [12.5, 7.5, L[2]], [12, 7, L[2]]]);
  // củ: vai bằng tròn, thon dần xuống mũi (bản trên ruộng mũi củ vùi trong đất)
  const top = 8.2, tip = g.icon ? 22.6 : 26, len = (tip - top) / 2, k0 = g.icon ? 0.97 : 0.8;
  g.shape(12, top + len, len, 5.8, DOWN - 0.05, R.orange, { spec: true, specAt: 0.78,
    prof: u => (u < -0.72 ? Math.sqrt(Math.max(0, 1 - ((u + 0.72) / 0.28) ** 2)) : 1 - ((u + 0.72) / 1.72) ** 1.25 * k0),
    fill: (dx, dy, i, u, v, x, y) => {
      if (u < -0.86 && Math.abs(v) < 0.75) return i >= 3 ? R.pleaf[3] : R.pleaf[2];
      if (u < -0.7) return null;
      const row = g.hd ? y % 5 === 0 : y % 3 === 0;
      if (row && Math.abs(v) < 0.7 && hash(x * 3 + 1, y) < (g.hd ? 0.75 : 0.5)) return dk(R.orange, i);
      if (g.hd && y % 5 === 1 && Math.abs(v) < 0.6 && hash(x * 3 + 1, y - 1) < 0.5 && i < 4) return R.orange[i + 1];
      return null;
    } });
  if (!g.icon) {
    soil(g, 12, 22.6, 10, 3.2);
    g.dots([[5, 20.4, R.soil[4]], [18.6, 20.8, R.soil[4]], [3, 22, R.soil[2]]]);
  }
  glint(g, 9.2, 13.2);
};

// ---- Lúa: bó lúa khổng lồ cột lạt, bông lúa vàng trĩu hạt to rủ hai bên ----
function panicle(g, x0, y0, cx, cy, x1, y1, from = 0.3) {
  g.stroke(x0, y0, cx, cy, x1, y1, t => (t < from ? R.gold[3] : R.gold[2]), g.hd ? 0.5 : 1);
  g.layer++;
  const step = g.hd ? 0.9 : 1.1;
  const len = Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy);
  let k = 0;
  for (let d = len * from; d <= len; d += step, k++) {
    const t = d / len, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), e = t * t;
    const x = a * x0 + b * cx + e * x1, y = a * y0 + b * cy + e * y1;
    const tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy), tl = Math.hypot(tx, ty);
    const nx = -ty / tl, ny = tx / tl, sd = k % 2 ? 1 : -1;
    const gx = x + nx * sd * 0.9, gy = y + ny * sd * 0.9;
    if (g.hd) {   // hạt lúa 3 điểm: sáng, gốc, tối
      g.px(gx, gy, R.gold[4]); g.px(gx + 0.5, gy, R.gold[3]); g.px(gx, gy + 0.5, R.gold[3]); g.px(gx + 0.5, gy + 0.5, R.gold[2]);
      if (k % 3 === 0) g.px(gx, gy, R.gold[5]);
    } else {
      g.px(gx, gy, k % 2 ? R.gold[3] : R.gold[4]);
      g.px(x, y, R.gold[2]);
    }
  }
  if (g.hd) g.px(x1, y1, R.gold[5]); else g.px(x1, y1, R.gold[4]);
}
DEF.lua = g => {
  ground(g, 12, 8);
  // bông phía sau
  panicle(g, 11, 11, 7.5, 1, 2.5, 9.5);
  panicle(g, 13, 11, 16.5, 1, 21.5, 9.5);
  // thân bó: cọng lúa túm ở chỗ cột lạt, xòe ở gốc và ngọn
  g.layer++;
  const n = g.hd ? 9 : 5;
  for (let j = -n; j <= n; j++) {
    const f = j / n, col = (t, k) => (t < 0.08 ? R.gold[1] : j % 2 ? (k ? R.gold[2] : R.gold[3]) : (k ? R.gold[3] : R.gold[4]));
    g.stroke(12 + f * 4.8, 22.2, 12 + f * 2.1, 16.4, 12 + f * 3.6, 11.2, f < -0.2 ? col : (t, k) => (t < 0.08 ? R.gold[1] : j % 2 ? R.gold[2] : R.gold[3]), g.hd ? 0.5 : 1);
  }
  // mặt cắt gốc rạ
  g.layer++;
  for (let x = 7.4; x <= 16.6; x += g.hd ? 0.5 : 1) g.px(x, 22.2, (Math.floor(x * g.S) % 2) ? R.gold[1] : R.tan[2]);
  // lạt buộc
  g.tube(9.2, 16.2, 12, 16.2, 14.8, 16.2, () => 0.85, R.wood, { flat: 0.8 });
  g.dots([[13.2, 17.4, R.wood[3]], [13.6, 18.4, R.wood[2]], [12.6, 18.2, R.wood[2]]]);
  // bông phía trước, trĩu ra ngoài
  panicle(g, 10, 11.4, 4.5, 3.5, 1.4, 13.5);
  panicle(g, 14, 11.4, 19.5, 3.5, 22.6, 13.5);
  panicle(g, 12, 11.2, 11.2, 0.5, 7.6, 6.5, 0.35);
  panicle(g, 12, 11.2, 13.4, 0.8, 16.8, 6.8, 0.35);
};

// ---- Cà chua: trái đỏ khổng lồ bóng, múi nhẹ, đài lá xanh hình sao, cuống ----
DEF.cachua = g => {
  ground(g, 12, 10.6);
  leaf(g, 5.0, 4.4, 4.0, 1.8, PI + 0.55, L, { cut: (u, v, f) => Math.abs(v) > f - 0.3 && Math.floor((u + 1) * 3.2) % 2 === 0 });
  leaf(g, 19.2, 3.8, 3.6, 1.6, -0.5, L, { cut: (u, v, f) => Math.abs(v) > f - 0.3 && Math.floor((u + 1) * 3.2) % 2 === 0 });
  g.ball(12, 14.6, 10.6, 8.2, R.red, { spec: true, specAt: 0.8,
    cut: (u, v, f) => v < -f + 0.07 && Math.abs(u) < 0.12,
    fill: (dx, dy, i, u, v, x, y) => {
      // rãnh múi mờ chụm về cuống
      const ph = merid(u, v), w = 10.6 * g.S * Math.sqrt(Math.max(0, 1 - v * v)) * Math.cos(ph);
      if (v < 0.35 && [-0.75, 0.75].some(k => Math.abs(ph - k * (0.6 + 0.4 * (v + 1) / 1.35)) * w < (g.hd ? 0.55 : 0.45))) return dk(R.red, i);
      return null;
    } });
  for (const [a, l, s] of [[PI + 0.55, 2.4, 0.9], [-0.55, 2.4, 0.9], [PI - 0.3, 3.2, 1], [0.3, 3.2, 1], [DOWN, 2.4, 0.9]]) {
    g.shape(12 + Math.cos(a) * l, 6.8 + Math.sin(a) * l * 0.75, 2.9 * s, 1.0 * s, a, L, { lo: 1, hi: 4 });
  }
  g.ball(12, 6.6, 1.4, 1.0, L, { lo: 2, hi: 4 });
  g.stroke(12, 6.4, 12, 4, 13.6, 2.6, L, 1.5, 1);
  glint(g, 6.4, 10.4);
};

// ---- Bắp: trái bắp khổng lồ đứng, hạt vàng xếp hàng, bẹ xanh bóc dở xòe hai bên, râu nâu ----
DEF.bap = g => {
  ground(g, 12, 8.5);
  // râu bắp
  for (const [x, y, c] of [[17.8, 1.0, R.wood[3]], [20.2, 2.6, R.wood[2]], [16, 0.6, R.wood[4]], [19.6, 0.8, R.tan[3]]])
    g.stroke(15.2, 3.8, (15.2 + x) / 2 + 0.6, (3.8 + y) / 2 - 0.8, x, y, () => c, g.hd ? 0.5 : 1);
  g.tube(10.4, 20.4, 11.6, 11.5, 15.0, 3.4, t => 4.7 * (t < 0.75 ? 1 - t * 0.12 : 0.91 * Math.sqrt(Math.max(0, (1 - t) / 0.25))) + 0.1, R.yellow, { lo: 1, hi: 4, spec: true, specAt: 0.82,
    fill: (t, s, i, x, y) => {
      if (g.hd) { // hạt 2x2 xếp so le, khe tối giữa các hạt
        const row = y % 3 === 2, col = (x + (Math.floor(y / 3) % 2) * 1) % 3 === 2;
        if (row || col) return R.yellow[Math.max(1, i - 1)];
        return (x + Math.floor(y / 3)) % 3 === 0 && (y % 3) === 0 && i >= 3 ? R.yellow[5] : null;
      }
      return (x + y) % 2 ? R.yellow[Math.max(1, i - 1)] : null;
    } });
  // bẹ bóc dở
  const husk = { lo: 1, hi: 4, rib: R.pleaf[2], ribTo: 0.8, veins: g.hd ? 2 : 0 };
  g.tube(10.6, 21.8, 6.0, 18.8, 4.2, 10.4, t => 3.0 * (1 - t) + 0.25, R.pleaf, { ...husk, flat: 0.7 });
  g.tube(11.4, 21.8, 16.8, 19.6, 19.6, 12.2, t => 3.0 * (1 - t) + 0.25, R.pleaf, { ...husk, flat: 0.7 });
  g.tube(10.8, 22.2, 9.4, 17.0, 8.6, 13.4, t => 2.4 * (1 - t) + 0.25, L, { lo: 1, hi: 4, flat: 0.7 });
  g.stroke(11, 22.4, 11, 22.6, 11, 22.6, R.pleaf, 2.4);
  glint(g, 8.8, 12.0);
};

// ---- Dâu tây: trái đỏ khổng lồ hình tim, hạt vàng lấm tấm, đài lá xanh xòe, cuống ----
DEF.dau = g => {
  ground(g, 12, 8);
  g.shape(12, 13.4, 9.4, 9.6, DOWN + 0.12, R.red, { spec: true, specAt: 0.78,
    prof: u => (u < -0.15 ? Math.sqrt(Math.max(0, 1 - ((u + 0.15) / 0.85) ** 2)) : 1 - ((u + 0.15) / 1.15) ** 2 * 0.88),
    fill: (dx, dy, i, u, v, x, y) => {
      if (u < -0.62) return null;
      if (g.hd) {
        const r = y % 4, c = (x + Math.floor(y / 4) * 2) % 4;
        if (r === 1 && c === 0) return i >= 3 ? R.yellow[4] : R.yellow[2];
        if (r === 2 && c === 0) return R.red[Math.max(1, i - 2)];
        return null;
      }
      return y % 3 === 1 && (x + Math.floor(y / 3) * 2) % 3 === 0 && Math.abs(v) < 0.85 ? (i >= 3 ? R.yellow[4] : R.yellow[1]) : null;
    } });
  for (const [a, l, s] of [[PI + 0.2, 3.4, 1.05], [-0.2, 3.4, 1.05], [PI - 0.45, 3.0, 0.95], [0.45, 3.0, 0.95], [DOWN + 0.35, 2.4, 0.85], [DOWN - 0.5, 2.4, 0.85]]) {
    leaf(g, 12 + Math.cos(a) * l, 5.6 + Math.sin(a) * l * 0.7, 3.0 * s, 1.15 * s, a, L, { veins: 0, ribTo: 0.5 });
  }
  g.ball(12, 5.2, 1.6, 1.0, L, { lo: 2, hi: 4 });
  g.stroke(12, 5, 11.6, 2.6, 13.4, 1.0, L, 1.2, 1);
  glint(g, 7.4, 9.0);
};

// ---- Bí ngô: trái cam khổng lồ có múi rõ, cuống gỗ to, lá tròn xẻ thuỳ, tua cuốn ----
function pumLeaf(g, x, y, s = 1) {
  g.shape(x, y, 2.9 * s, 2.6 * s, UP, L, { round: true, veins: g.hd ? 2.5 : 0, rib: L[2], ribTo: 0.7,
    cut: (u, v) => { const ang = Math.atan2(v, u); return Math.hypot(u, v) > 0.78 && [0.9, -0.9, 2.3, -2.3].some(k => Math.abs(ang - k) < 0.2); } });
}
DEF.bingo = g => {
  ground(g, 12, 11.5);
  g.stroke(12, 9, 6, 5.5, 1.6, 7.6, L, 1, 0.6);
  pumLeaf(g, 4.2, 5.0, 1.15);
  g.ball(12, 15, 11.2, 7.6, R.orange, { spec: true, specAt: 0.85,
    cut: (u, v, f) => v < -f + 0.1 && Math.abs(u) < 0.14,
    fill: (dx, dy, i, u, v) => {
      const ph = merid(u, v), w = 11.2 * g.S * Math.sqrt(Math.max(0, 1 - v * v)) * Math.cos(ph), st = PI / 5;
      const m = ((ph % st) + st) % st, dd = Math.min(m, st - m) * w;
      if (dd < (g.hd ? 0.6 : 0.5)) return R.orange[Math.max(1, i - 1)];
      if (g.hd && dd < 1.6 && i < 4 && ((ph % st) + st) % st < st / 2) return R.orange[i + 1 > 4 ? 4 : i];
      return null;
    } });
  g.stroke(12, 8.6, 11.6, 6, 13.6, 4.2, R.wood, 2.4, 1.8);
  g.dots([[13.6, 4.2, R.wood[4]], [12.2, 8, R.wood[1]], [12.8, 8.2, R.wood[2]]]);
  tendril(g, 15, 4.6, 1);
  glint(g, 6.2, 11.4);
};

// ---- Dưa hấu: trái sọc khổng lồ nằm, sọc xanh sẫm uốn lượn, cuống, lá xẻ thuỳ, tua ----
function melLeaf(g, x, y, s = 1) {
  const r = R.grey, o = { rib: r[4], ribTo: 0.6 };
  g.shape(x - 1.5 * s, y + 0.5 * s, 1.6 * s, 0.9 * s, PI + 0.3, r, o);
  g.shape(x + 1.5 * s, y + 0.5 * s, 1.6 * s, 0.9 * s, -0.3, r, o);
  g.shape(x, y - 1.2 * s, 1.9 * s, 1.0 * s, UP, r, o);
}
DEF.duahau = g => {
  ground(g, 12, 11.8);
  g.stroke(12, 8.6, 15, 4.5, 21.8, 6.6, R.grey, 1, 0.6);
  melLeaf(g, 18.6, 5.0, 1.5);
  g.ball(12, 15.2, 11.4, 7.3, R.wmel, { spec: true, specAt: 0.86,
    fill: (dx, dy, i, u, v) => {
      const ph = merid(u, v) + 0.13 * Math.sin(v * 9), st = PI / (g.hd ? 7 : 5.5);
      const m = ((ph % st) + st) % st / st;
      return m < 0.45 ? R.wmel[i > 3 ? 2 : 1] : R.wmel[i > 3 ? 4 : 3];
    } });
  g.stroke(12, 8.2, 12, 6.6, 13.2, 5.6, R.grey, 1.2, 1);
  tendril(g, 13.6, 5.6, 1, R.grey[3]);
  glint(g, 6.2, 11.4);
};

// ---- Hành lá: bó hành khổng lồ, lá ống xanh mập, củ trắng, rễ tơ, dây thun đỏ ----
DEF.hanhla = g => {
  ground(g, 12, 8);
  const tubes = [[8.6, 3.0, 4.0, -1.0], [15.4, 21.0, 4.5, 1.2], [9.8, 6.0, 0.8, -0.4], [14.2, 17.4, 1.0, 0.6], [11.0, 9.6, 0.2, -0.2], [13.0, 14.0, 0.4, 0.3], [12.0, 12.2, 1.6, 0]];
  for (const [bx, tx, ty, bend] of tubes) {
    g.tube(bx, 16.5, (bx + tx) / 2 + bend, (16.5 + ty) / 2, tx, ty, t => 1.45 * (1 - t * 0.35), R.scal, { lo: 1, hi: 4, spec: true, specAt: 0.95,
      fill: (t, s, i) => (t > 0.93 ? R.scal[Math.min(5, i + 1)] : g.hd && Math.abs(s - 0.1) < 0.18 && t > 0.15 && t < 0.85 && i < 4 ? R.scal[i + 1] : null) });
  }
  // gập ngọn một lá
  g.tube(3.0, 4.0, 2.0, 2.4, 1.4, 5.4, () => 1.0, R.scal, { lo: 2, hi: 4 });
  // củ trắng
  // củ trắng: phình ở dưới, thắt lại ở đế rễ
  for (const [x0, x1] of [[8.8, 9.6], [15.2, 14.4], [10.4, 10.8], [13.6, 13.2], [12, 12]]) {
    g.tube(x0, 15.6, (x0 + x1) / 2, 18.5, x1, 21.2, t => 1.25 + 0.75 * Math.sin(PI * Math.min(1, t * 1.25)) - (t > 0.85 ? (t - 0.85) * 4 : 0), R.white, { lo: 2, hi: 4, spec: true, specAt: 0.92 });
  }
  g.tube(7.8, 16.6, 12, 16.6, 16.2, 16.6, () => 0.75, R.red, { flat: 0.8 });
  // rễ tơ
  g.layer++;
  for (const [x0, x1] of [[9, 7.5], [10.6, 10], [12, 12.2], [13.4, 14], [15, 16.4], [11.4, 9], [12.8, 15]]) {
    g.stroke(x0, 21.6, (x0 + x1) / 2, 22.4, x1, 22.8, () => (g.hd ? R.tan[4] : R.white[1]), g.hd ? 0.5 : 1);
  }
};

// ---- Đậu phộng: củ lạc khổng lồ hai hạt eo giữa, vỏ gân mạng lưới, cuống và nhánh lá kép ----
DEF.dauphong = g => {
  ground(g, 11.5, 11);
  g.stroke(19.4, 8.2, 20.4, 5.2, 19.6, 2.4, R.pleaf, 0.8, 0.6);
  for (const [dx, dy, a] of [[-1.5, -1.0, UP - 0.7], [1.5, -1.0, UP + 0.7], [-1.6, 1.0, PI + 0.3], [1.6, 1.0, -0.3]])
    g.shape(19.8 + dx, 3.0 + dy, 1.5, 1.0, a, R.pleaf, { round: true, lo: 1, hi: 4, rib: g.hd ? R.pleaf[2] : null });
  const net = (dx, dy, i, u, v, x, y) => {
    if (g.hd) return ((x + 2 * y) % 5 === 0 || (2 * x - y + 99) % 6 === 0) && i < 4 && hash(x, y) < 0.8 ? R.tan[Math.max(1, i - 1)] : null;
    return (x + 2 * y) % 4 === 0 && (x + y) % 3 && i < 4 ? R.tan[Math.max(1, i - 1)] : null;
  };
  g.shape(15.6, 10.6, 6.0, 5.0, -0.55, R.tan, { round: true, lo: 1, hi: 4, spec: true, specAt: 0.88, fill: net });
  g.shape(7.6, 16.0, 6.4, 5.3, -0.45, R.tan, { round: true, lo: 1, hi: 4, spec: true, specAt: 0.88, fill: net });
  g.stroke(20.0, 7.8, 20.4, 7.2, 20.6, 6.4, R.wood, 1.2, 0.8);
  g.dots([[2.0, 19.8, R.tan[1]], [1.6, 20.4, R.tan[0]]]);
  glint(g, 4.6, 13.2);
};

// ---- Rau muống: bó rau khổng lồ, cọng ống xanh nhạt, lá mũi tên xòe, hoa loa kèn trắng tím, lạt đỏ ----
function arrowLeaf(g, x, y, a, s = 1) {
  g.shape(x, y, 3.8 * s, 1.5 * s, a, L, { lo: 1, hi: 4, rib: L[2], ribTo: 0.5 });
  const bx = x - Math.cos(a) * 3.0 * s, by = y - Math.sin(a) * 3.0 * s;
  for (const d of [2.4, -2.4]) g.shape(bx + Math.cos(a + d) * 1.1 * s, by + Math.sin(a + d) * 1.1 * s, 1.4 * s, 0.6 * s, a + d, L, { lo: 1, hi: 4 });
}
DEF.raumuong = g => {
  ground(g, 12, 8.5);
  const tips = [[3.6, 8.6, UP - 1.0], [6.0, 4.4, UP - 0.6], [9.6, 2.6, UP - 0.25], [14.4, 2.6, UP + 0.25], [18.0, 4.4, UP + 0.6], [20.4, 8.6, UP + 1.0], [12, 5.0, UP]];
  // cọng ống: chụm ở lạt, xoè ra tới từng lá
  for (const [x, y, a] of tips) {
    const ex = x - Math.cos(a) * 3.2, ey = y - Math.sin(a) * 3.2;
    g.stroke(12 + (x - 12) * 0.1, 21.6, 12 + (x - 12) * 0.08, 15.5, ex, ey, (t, k) => (k ? R.pleaf[2] : R.pleaf[4]), g.hd ? 1 : 1, g.hd ? 0.5 : 1);
  }
  arrowLeaf(g, 5.4, 14.0, PI + 0.6, 0.75);
  arrowLeaf(g, 18.6, 13.6, -0.6, 0.75);
  for (const [x, y, a] of tips) arrowLeaf(g, x, y, a, 1.0);
  // lớp lá giữa che kín thân bó tới lạt
  for (const [x, y, a, s] of [[8.4, 10.6, UP - 0.75, 0.9], [15.6, 10.6, UP + 0.75, 0.9], [12, 9.6, UP + 0.08, 0.9], [9.2, 14.0, PI + 0.95, 0.8], [14.8, 14.0, -0.95, 0.8], [12, 13.0, UP - 0.1, 0.75]])
    arrowLeaf(g, x, y, a, s);
  // hoa loa kèn
  g.ball(17.8, 9.6, 2.2, 1.9, R.lav, { lo: 2, hi: 4 });
  g.dots([[17.8, 9.6, R.purp[2]], [17.3, 9.6, R.purp[3]], [17.8, 11.1, R.lav[1]]]);
  g.tube(9.8, 17.4, 12, 17.4, 14.2, 17.4, () => 0.8, R.red, { flat: 0.8 });
  // mặt cắt cọng rau
  g.layer++;
  for (let x = 10; x <= 14; x += g.hd ? 1 : 2) { g.px(x, 21.8, R.pleaf[4]); if (g.hd) g.px(x + 0.5, 21.8, R.pleaf[2]); }
};

// ---- Dưa leo: trái dài khổng lồ cong nhẹ, xanh sẫm có sọc nhạt và gai, hoa vàng ở đuôi, lá + tua ở cuống ----
DEF.dualeo = g => {
  ground(g, 11.5, 11);
  g.stroke(20.2, 7.6, 21.6, 4.0, 18.6, 2.0, L, 0.8, 0.6);
  g.shape(16.0, 3.6, 3.0, 2.7, UP, L, { lo: 1, hi: 4, veins: g.hd ? 2.5 : 0, rib: L[2], ribTo: 0.6, cut: (u, v, f) => Math.abs(v) > f - 0.3 && u > -0.4 && Math.floor((u + 1) * 4) % 2 === 0 });
  tendril(g, 21.6, 3.0, 1);
  g.tube(3.4, 18.6, 10.0, 20.2, 19.6, 8.6, t => 3.6 * (0.86 + 0.14 * Math.sin(PI * t)), R.cuke, { lo: 1, hi: 4, spec: true, specAt: 0.82,
    fill: (t, s, i, x, y) => {
      if (Math.abs(s + 0.25) < (g.hd ? 0.1 : 0.14) && t < 0.55 && i >= 2) return R.cuke[Math.min(5, i + 1)];
      if (Math.abs(s - 0.45) < 0.1 && t < 0.35 && g.hd) return R.cuke[Math.min(5, i + 1)];
      const h = hash(x * 13 + 7, y * 7 + 3);
      if (g.hd ? h < 0.07 : h < 0.06) return i >= 3 ? R.cuke[5] : R.cuke[4];
      return null;
    } });
  g.stroke(19.4, 8.8, 20, 8, 20.4, 7.4, R.pleaf, 1.2, 1);
  // hoa héo ở đuôi
  g.dots([[1.8, 19.6, R.yellow[3]], [1.4, 18.6, R.yellow[4]], [2.2, 20.6, R.yellow[2]], [1.0, 20.0, R.yellow[2]]]);
  glint(g, 8.0, 15.6);
};

// ---- Khoai lang: củ đỏ tím khổng lồ lồi lõm nằm trên đất, mắt củ, rễ đuôi, dây lá tim tím ----
function heart(g, x, y, a, s = 1) {
  g.shape(x, y, 2.0 * s, 1.7 * s, a, R.purp, { lo: 1, hi: 4, bias: 0.15, rib: g.hd ? R.purp[2] : null, ribTo: 0.5, cut: (u, v) => u < -0.72 && Math.abs(v) < 0.3 });
}
DEF.khoailang = g => {
  ground(g, 12, 11.5);
  g.stroke(19.6, 12, 22.4, 7.6, 18.6, 4.4, R.purp, 0.8, 0.6);
  g.stroke(20.4, 7.8, 16, 7.2, 12.4, 6.4, R.purp, 0.7, 0.5);
  heart(g, 12.0, 5.4, UP - 0.5, 1.0); heart(g, 18.0, 3.6, UP + 0.1, 1.15); heart(g, 21.4, 8.2, UP + 0.9, 0.9);
  g.stroke(3.0, 17.4, 1.6, 18.4, 0.8, 20.4, R.mag, 0.7, 0.5);
  g.tube(2.8, 17.0, 11.2, 11.8, 21.0, 14.8, t => 0.9 + 4.5 * Math.pow(Math.sin(PI * t), 0.85) * (1 + 0.07 * Math.sin(t * 15)), R.mag, { spec: true, specAt: 0.8,
    fill: (t, s, i, x, y) => {
      const h = hash(x * 5 + 11, y * 9 + 2);
      if (g.hd ? h < 0.045 : h < 0.04) return R.mag[Math.max(1, i - 2)];
      if (g.hd && h > 0.96 && i < 4) return R.mag[i + 1];
      return null;
    } });
  if (!g.icon) {
    soil(g, 13, 23.0, 9.6, 2.0);
    g.dots([[6, 21.6, R.soil[4]], [19.4, 21.8, R.soil[4]]]);
  }
  glint(g, 7.8, 12.2);
};

// ---- Ớt: trái ớt đỏ khổng lồ chỉ thiên, cong như ngọn lửa, bóng loáng, đài và cuống xanh, lá ----
DEF.ot = g => {
  ground(g, 12, 8);
  leaf(g, 6.0, 19.0, 3.8, 1.5, PI + 0.35, R.dleaf, { veins: 0 });
  leaf(g, 18.0, 19.0, 3.8, 1.5, -0.35, R.dleaf, { veins: 0 });
  g.tube(12.4, 17.6, 6.6, 9.0, 15.0, 1.2, t => 4.6 * (1 - Math.pow(t, 1.7)) + 0.35, R.red, { spec: true, specAt: 0.72,
    fill: (t, s, i) => (g.hd && Math.abs(s + 0.35) < 0.09 && t > 0.08 && t < 0.7 && i >= 3 ? R.red[5] : null) });
  g.ball(12.4, 18.4, 4.4, 1.9, R.dleaf, { lo: 1, hi: 4 });
  g.shape(9.0, 17.4, 1.6, 0.8, PI - 0.6, R.dleaf, { lo: 1, hi: 4 }); g.shape(15.8, 17.4, 1.6, 0.8, -0.6 + PI * 0 + 0.0, R.dleaf, { lo: 1, hi: 4 });
  g.stroke(12.4, 19.8, 12.2, 21.2, 12.8, 22.4, R.dleaf, 1.6, 1.4);
  glint(g, 7.8, 9.6);
};

// ---- Su hào: củ tím tròn khổng lồ, cuống lá mọc từ thân củ, lá xanh lơ có gân, sẹo lá ----
DEF.suhao = g => {
  ground(g, 12, 10);
  for (const [x, y, a, s, fx, fy] of [[3.4, 4.6, UP - 0.8, 1, 8, 11], [20.6, 4.6, UP + 0.8, 1, 16, 11], [12, 2.4, UP, 1.05, 12, 9.4], [2.2, 10.6, PI + 0.35, 0.8, 6, 13], [21.8, 10.6, -0.35, 0.8, 18, 13]]) {
    g.stroke(fx, fy, (fx + x) / 2, (fy + y) / 2 + 0.6, x + Math.cos(a) * -1.6 * s, y + Math.sin(a) * -1.6 * s, R.kohl, 0.8, 0.6);
    leaf(g, x, y, 2.8 * s, 2.0 * s, a, R.blue, { round: true, rib: R.blue[5], ribFrom: -1 });
  }
  g.ball(12, 15.4, 9.0, 7.2, R.kohl, { spec: true, specAt: 0.84,
    fill: (dx, dy, i, u, v, x, y) => (g.hd && v > 0.55 && Math.abs(u) < 0.35 && i < 3 ? R.kohl[2] : null) });
  for (const [x, y, dx] of [[7.2, 12.2, -1], [16.6, 11.6, 1], [9.2, 17.6, -1], [15.4, 18.4, 1]]) {
    g.stroke(x, y, x + dx * 0.5, y - 1.2, x + dx * 1.2, y - 2.2, R.kohl, 0.7, 0.5);
    g.dots([[x, y + 0.6, R.kohl[1]]]);
  }
  g.stroke(12, 22.2, 12, 22.6, 12, 22.8, () => R.kohl[2], 1);
  glint(g, 7.0, 11.6);
};

// ---- Bắp cải: bắp cuộn tròn khổng lồ xanh nhạt, gân lá, lá bao xanh lơ ôm quanh ----
function cabLeaf(g, x, y, len, wid, a) {
  g.shape(x, y, len, wid, a, R.blue, { round: true, rib: R.blue[4], ribW: g.hd ? 0.8 : 0.5, ribTo: 0.4, veins: g.hd ? 2.5 : 0,
    cut: (u, v, f) => Math.abs(v) > f - 0.12 && Math.floor((u + 1) * 5) % 3 === 0 });
}
DEF.bapcai = g => {
  ground(g, 12, 11.4);
  cabLeaf(g, 3.6, 9.0, 4.2, 3.4, UP - 0.95);
  cabLeaf(g, 20.4, 9.0, 4.2, 3.4, UP + 0.95);
  g.ball(12, 12.0, 8.8, 8.2, R.cab, { lo: 1, hi: 4, spec: true, specAt: 0.9 });
  g.stroke(3.8, 13, 6.4, 4.6, 12.6, 3.8, () => R.cab[1], g.hd ? 0.5 : 1);
  g.stroke(20.2, 12.6, 18.6, 18.6, 12, 20.2, () => R.cab[2], g.hd ? 0.5 : 1);
  g.stroke(6.0, 16.6, 9.0, 12.0, 15.6, 7.4, () => R.cab[3], g.hd ? 0.5 : 1);
  if (g.hd) {
    g.stroke(12.6, 3.8, 16, 4.2, 18.6, 7, () => R.cab[2], 0.5);
    for (const [x0, y0, x1, y1] of [[8, 9, 6.4, 6.4], [11, 10, 10.6, 6.2], [13.4, 12, 16.6, 10.6], [10.4, 14.6, 8.4, 16.6]]) g.stroke(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2, x1, y1, () => R.cab[2], 0.5);
  }
  for (const [x, a] of [[5.6, PI - 0.28], [18.4, 0.28]])
    g.shape(x, 19.2, 5.8, 2.7, a, R.blue, { round: true, rib: R.blue[4], ribW: g.hd ? 0.8 : 0.5, ribTo: 0.5, veins: g.hd ? 3 : 0 });
  glint(g, 8.0, 7.8);
};

// ---------- biểu tượng: trái khổng lồ đầy khung 16 (2x: 32), lấp lánh vàng góc trên-phải ----------
function measure(draw) {
  const g = new G(24, 24, 1); g.icon = true; draw(g);
  let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if (g.get(x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}
const SPK = { w: '#ffffff', l: '#fff09a', d: '#f2c63a', o: '#c08a16' };
function put(c, rows, ox, oy) {
  const x = c.getContext('2d');
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (SPK[ch]) { x.fillStyle = SPK[ch]; x.fillRect(ox + i, oy + j, 1, 1); } }));
}
const ICON_SPARK1 = ['.l.', 'lwd', '.d.'];
const ICON_SPARK2 = ['..l..', '..l..', 'llwdd', '..d..', '..o..'];
function icon(draw, k) {
  const [bx, by, bw, bh] = measure(draw), S = k * 14 / Math.max(bw, bh), W = 16 * k;
  const g = new G(W, W, k, S, (W - bw * S) / 2 - bx * S, (W - bh * S) / 2 - by * S);
  g.icon = true; draw(g);
  const c = finish(g);
  if (k === 2) put(c, ICON_SPARK2, W - 6, 0); else put(c, ICON_SPARK1, W - 3, 0);
  return c;
}

// ---------- lấp lánh động trên trái: nhỏ → to → nhỏ ----------
const SPARK1 = [
  ['.....', '..l..', '.lwl.', '..l..', '.....'],
  ['..d..', '..l..', 'dlwld', '..l..', '..d..'],
  ['.....', '.d.d.', '..w..', '.d.d.', '.....'],
];
const SPARK2 = [
  ['..........', '..........', '....d.....', '....l.....', '..dlwld...', '....l.....', '....d.....', '..........', '..........', '..........'],
  ['....o.....', '....d.....', '....l.....', '...lwl....', 'odlwwwldo.', '...lwl....', '....l.....', '....d.....', '....o.....', '..........'],
  ['..........', '..........', '..d...d...', '...l.l....', '....w.....', '...l.l....', '..d...d...', '..........', '..........', '..........'],
];
const spark = rows => { const c = canvas(rows[0].length, rows.length); put(c, rows, 0, 0); return c; };

// ---------- dựng ----------
export const GIANT_IDS = ['cai', 'carot', 'lua', 'cachua', 'bap', 'dau', 'bingo', 'duahau', 'hanhla', 'dauphong', 'raumuong', 'dualeo', 'khoailang', 'ot', 'suhao', 'bapcai'];
function giant(draw, k) { const g = new G(24 * k, 24 * k, k); draw(g); return finish(g); }
const build = k => ({
  giant: Object.fromEntries(GIANT_IDS.map(id => [id, giant(DEF[id], k)])),
  giantIcon: Object.fromEntries(GIANT_IDS.map(id => [id, icon(DEF[id], k)])),
  giantSpark: (k === 2 ? SPARK2 : SPARK1).map(spark),
});
const web = typeof document !== 'undefined';
export const SPR53_OLD = web ? build(1) : {};
export const SPR53 = web ? build(2) : {};
