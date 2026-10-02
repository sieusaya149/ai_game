// Công trình art gấp đôi (kiểu A): mỗi sprite w×h của bộ cũ vẽ lại thành 2w×2h, cùng khóa, cùng điểm neo.
// Toạ độ trong các hàm vẽ là toạ độ bộ cũ (1 đơn vị = 2 điểm ảnh mới); số lẻ .5 là đúng một điểm ảnh mới.
// Vật liệu (vân gỗ, ngói, rạ, gạch, đá, tôn) vẽ thẳng ở độ phân giải mới. Viền 2 điểm do ghép kiểu cũ được
// thu về 1 điểm ở bước cuối (thin), cạnh hứng sáng trên-trái viền nhạt hơn (selOut).
//
// Khóa thay thế: xem bảng ở cuối file (SPR11), mỗi khóa ghi thay cho SPR / SPR2 / SPR3.
import { canvas, hash } from './art.js';

const OUT = '#3b2412';
const WOOD = ['#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868'];
const DARK = ['#2e1a0c', '#4a2c14', '#6b4020', '#8e5a30'];
const THATCH = ['#6e4e18', '#9a7428', '#c39a42', '#ddbb62', '#f0d890'];
const TILE = ['#6e2016', '#9e3024', '#c44434', '#e06a52'];
const BRICK = ['#5e2616', '#8e4028', '#b4583a', '#d0805a'];
const BAMBOO = ['#56601a', '#86922e', '#b4bc54', '#dcdf8e'];
const STONE = ['#4a4650', '#6e6a74', '#918c94', '#b4b0b2', '#dcd8d0'];
const IRON = ['#2e2e36', '#4c4c58', '#767686', '#aeaebe', '#e2e2ea'];
const LEAF = ['#1e4d14', '#2f6b1f', '#3d8c2a', '#5fb33e', '#8fd65a'];
const HAY = ['#8a6a20', '#c9a13a', '#e8c34a', '#f0cf5a', '#fff0a0'];
const GLASS = ['#5aa8d8', '#8fd3ff', '#bfe8ff', '#ffffff'];

// ---------- màu ----------
const PARSE = new Map();
function rgba(c) {
  let v = PARSE.get(c);
  if (v) return v;
  if (c[0] === '#') { const n = parseInt(c.slice(1, 7), 16); v = [n >> 16, (n >> 8) & 255, n & 255, c.length > 7 ? parseInt(c.slice(7, 9), 16) : 255]; }
  else { const m = c.match(/[\d.]+/g).map(Number); v = [m[0], m[1], m[2], Math.round((m[3] ?? 1) * 255)]; }
  PARSE.set(c, v);
  return v;
}
const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = rgba(a), B = rgba(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
const shade = (c, f) => { const A = rgba(c); return hex(A[0] * f, A[1] * f, A[2] * f); };
const clampI = (k, n) => Math.max(0, Math.min(n - 1, k));

// ---------- lưới điểm ảnh ----------
class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  in(X, Y) { return X >= 0 && Y >= 0 && X < this.w && Y < this.h; }
  alpha(X, Y) { return this.in(X, Y) ? this.d[(Y * this.w + X) * 4 + 3] : 0; }
  hex(X, Y) { const i = (Y * this.w + X) * 4, d = this.d; return hex(d[i], d[i + 1], d[i + 2]); }
  put(X, Y, c) {
    if (!c || !this.in(X, Y)) return;
    const [r, g, b, a] = typeof c === 'string' ? rgba(c) : c, d = this.d, i = (Y * this.w + X) * 4;
    if (a >= 255) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; return; }
    if (a <= 0) return;
    const sa = a / 255, da = d[i + 3] / 255, oa = sa + da * (1 - sa);
    d[i] = (r * sa + d[i] * da * (1 - sa)) / oa;
    d[i + 1] = (g * sa + d[i + 1] * da * (1 - sa)) / oa;
    d[i + 2] = (b * sa + d[i + 2] * da * (1 - sa)) / oa;
    d[i + 3] = oa * 255;
  }
  erase(X, Y) { if (this.in(X, Y)) this.d.fill(0, (Y * this.w + X) * 4, (Y * this.w + X) * 4 + 4); }
  toCanvas() {
    const c = canvas(this.w, this.h), x = c.getContext('2d'), img = x.createImageData(this.w, this.h);
    img.data.set(this.d);
    x.putImageData(img, 0, 0);
    return c;
  }
}
const pixOf = src => {
  if (src instanceof Pix) return src;
  const P = new Pix(src.width, src.height);
  P.d.set(src.getContext('2d').getImageData(0, 0, src.width, src.height).data);
  return P;
};
const OUTC = rgba(OUT);
const isOutAt = (d, i) => d[i + 3] === 255 && d[i] === OUTC[0] && d[i + 1] === OUTC[1] && d[i + 2] === OUTC[2];

// Viền 2 điểm (ghép viền cũ phóng đôi) → 1 điểm: điểm viền phía trong lấy màu mảng bên cạnh.
// Đường viền ngăn hai mảng: giữ điểm trên/trái, điểm dưới/phải lấy màu mảng dưới/phải.
function thin(P) {
  const { w, h } = P, src = new Uint8ClampedArray(P.d);
  const idx = (X, Y) => (Y * w + X) * 4;
  const inb = (X, Y) => X >= 0 && Y >= 0 && X < w && Y < h;
  const O = (X, Y) => inb(X, Y) && isOutAt(src, idx(X, Y));
  const T = (X, Y) => !inb(X, Y) || src[idx(X, Y) + 3] < 160;
  const F = (X, Y) => inb(X, Y) && src[idx(X, Y) + 3] >= 160 && !isOutAt(src, idx(X, Y));
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    if (!O(X, Y)) continue;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      if (!F(X + dx, Y + dy) || !O(X - dx, Y - dy)) continue;
      const far = T(X - 2 * dx, Y - 2 * dy), sep = (dx > 0 || dy > 0) && F(X - 2 * dx, Y - 2 * dy);
      if (!far && !sep) continue;
      const i = idx(X + dx, Y + dy);
      let c = hex(src[i], src[i + 1], src[i + 2]);
      if (far && (dx < 0 || dy < 0)) c = mix(c, OUT, 0.22);   // mép phải / dưới: tối hơn một chút
      P.put(X, Y, c);
      break;
    }
  }
}
// Viền chọn lọc: viền hứng sáng (trên, trái) nhạt theo màu mảng bên trong
function selOut(P) {
  const { w, h } = P, src = new Uint8ClampedArray(P.d);
  const idx = (X, Y) => (Y * w + X) * 4;
  const inb = (X, Y) => X >= 0 && Y >= 0 && X < w && Y < h;
  const T = (X, Y) => !inb(X, Y) || src[idx(X, Y) + 3] < 160;
  const F = (X, Y) => inb(X, Y) && src[idx(X, Y) + 3] >= 160 && !isOutAt(src, idx(X, Y));
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    if (!isOutAt(src, idx(X, Y))) continue;
    let n = null, t = 0.7;
    if (T(X, Y - 1) && F(X, Y + 1)) n = [X, Y + 1];
    else if (T(X - 1, Y) && F(X + 1, Y)) { n = [X + 1, Y]; t = 0.8; }
    if (!n) continue;
    const i = idx(n[0], n[1]);
    P.put(X, Y, mix(hex(src[i], src[i + 1], src[i + 2]), OUT, t));
  }
}

// ---------- bút vẽ (toạ độ bộ cũ, nhân đôi) ----------
function api(P) {
  const S = v => Math.round(v * 2);
  const fill = (col, X0, Y0, X1, Y1) => {
    for (let Y = Y0; Y < Y1; Y++) for (let X = X0; X < X1; X++) P.put(X, Y, typeof col === 'function' ? col(X, Y) : col);
  };
  const g = {
    P,
    R(col, px, py, w = 1, h = 1) { fill(col, S(px), S(py), S(px + w), S(py + h)); },
    N(col, X, Y, w = 1, h = 1) { fill(col, X, Y, X + w, Y + h); },
    clear(px, py, w = 1, h = 1) { for (let Y = S(py); Y < S(py + h); Y++) for (let X = S(px); X < S(px + w); X++) P.erase(X, Y); },
    nclear(X, Y) { P.erase(X, Y); },
    // elip toạ độ mới (tâm, bán kính tính bằng điểm ảnh mới)
    nell(col, cx, cy, rx, ry) {
      for (let Y = Math.floor(cy - ry); Y <= Math.ceil(cy + ry); Y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) {
        const dx = (X + 0.5 - cx) / rx, dy = (Y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) P.put(X, Y, typeof col === 'function' ? col(X, Y, dx, dy) : col);
      }
    },
    // elip như bộ cũ: tâm ở giữa điểm (cx, cy), bán kính rx, ry điểm cũ
    ell(col, cx, cy, rx, ry) { g.nell(col, 2 * cx + 1, 2 * cy + 1, 2 * rx + 1.1, 2 * ry + 1.1); },
    nline(col, X0, Y0, X1, Y1, wd = 1) {
      const n = Math.max(Math.abs(X1 - X0), Math.abs(Y1 - Y0)) || 1;
      for (let i = 0; i <= n; i++) fill(col, Math.round(X0 + (X1 - X0) * i / n), Math.round(Y0 + (Y1 - Y0) * i / n),
        Math.round(X0 + (X1 - X0) * i / n) + wd, Math.round(Y0 + (Y1 - Y0) * i / n) + wd);
    },
    line(col, x0, y0, x1, y1, wd = 2) { g.nline(col, S(x0), S(y0), S(x1), S(y1), wd); },
    shadow(cx, cy, rx, ry, a = 0.28) { g.ell(`rgba(34,22,10,${a})`, cx, cy, rx, ry); },
    // ghép ảnh (canvas hoặc Pix, toạ độ mới) vào vị trí cũ (px, py)
    img(src, px, py) { g.nimg(src, S(px), S(py)); },
    nimg(src, X0, Y0) {
      const Q = pixOf(src);
      for (let Y = 0; Y < Q.h; Y++) for (let X = 0; X < Q.w; X++) {
        const i = (Y * Q.w + X) * 4;
        if (Q.d[i + 3]) P.put(X0 + X, Y0 + Y, [Q.d[i], Q.d[i + 1], Q.d[i + 2], Q.d[i + 3]]);
      }
    },
    // sprite chữ ở toạ độ mới
    sp(rows, pal, X0, Y0) {
      rows.forEach((r, Y) => [...r].forEach((ch, X) => { const c = pal[ch]; if (c) P.put(X0 + X, Y0 + Y, typeof c === 'function' ? c(X0 + X, Y0 + Y) : c); }));
    },
    // vẽ vào lớp riêng rồi viền ngoài (rings điểm, mặc định 1) và ghép
    layer(fn, out = OUT, rings = 1) {
      const L = new Pix(P.w, P.h);
      fn(api(L));
      for (let k = 0; k < rings; k++) ring(L, out);
      g.nimg(L, 0, 0);
      return L;
    },
  };
  return g;
}
// viền ngoài 1 điểm quanh mọi điểm đục
function ring(L, col) {
  const { w, h } = L, a = (X, Y) => (X >= 0 && Y >= 0 && X < w && Y < h ? L.d[(Y * w + X) * 4 + 3] : 0);
  const add = [];
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++)
    if (a(X, Y) < 200 && (a(X - 1, Y) > 200 || a(X + 1, Y) > 200 || a(X, Y - 1) > 200 || a(X, Y + 1) > 200)) add.push(X, Y);
  for (let i = 0; i < add.length; i += 2) { L.erase(add[i], add[i + 1]); L.put(add[i], add[i + 1], col); }
}
function draw2(w, h, fn, { post = true } = {}) {
  const P = new Pix(w * 2, h * 2);
  fn(api(P), P);
  if (post) { thin(P); thin(P); selOut(P); }
  return P.toCanvas();
}

// ---------- vật liệu (hàm màu theo toạ độ mới) ----------
// Ván ngang: mỗi tấm bh điểm, đầu ván so le, vân gỗ chạy dọc tấm, mắt gỗ, đinh ở mối nối
function woodH(rp, { bh = 6, len = 30, seed = 0, oy = 0, nails = true, seam = rp[0] } = {}) {
  return (X, Y) => {
    const yy = Y - oy, row = Math.floor(yy / bh), v = ((yy % bh) + bh) % bh;
    const off = Math.floor(hash(row * 3 + seed, 41) * len), xo = X + off, u = ((xo % len) + len) % len, id = Math.floor(xo / len);
    if (v === bh - 1) return seam;
    if (u === 0) return rp[1];
    if (u === 1 && v === 0) return rp[3];
    if (v === 0) return rp[3];
    if (nails && (u === 3 || u === len - 3) && v === (bh >> 1)) return rp[0];
    const n = hash(Math.floor(xo / 4) + id * 17 + seed, row * 7 + v);
    const knot = hash(id + seed * 5, row + 99);
    if (knot < 0.3 && bh > 4) { const kx = 6 + Math.floor(knot * 50) % (len - 12); if (u >= kx && u <= kx + 2 && v === (bh >> 1)) return rp[0]; if (u >= kx - 1 && u <= kx + 3 && Math.abs(v - (bh >> 1)) === 1) return rp[1]; }
    if (v === bh - 2) return n < 0.55 ? rp[1] : rp[2];
    if (n < 0.16) return rp[1];
    if (n > 0.93) return rp[3];
    return rp[2];
  };
}
// Ván dọc
function woodV(rp, { bw = 6, len = 40, seed = 0, ox = 0, nails = false, seam = rp[0] } = {}) {
  const f = woodH(rp, { bh: bw, len, seed, oy: ox, nails, seam });
  return (X, Y) => f(Y, X);
}
// Gạch: mạch vữa, mỗi viên một sắc, cạnh trên sáng, cạnh dưới-phải tối, lốm đốm
function bricks(rp, mortar, { bw = 12, bh = 6, seed = 0, ox = 0, oy = 0 } = {}) {
  return (X, Y) => {
    const yy = Y - oy, row = Math.floor(yy / bh), v = ((yy % bh) + bh) % bh;
    const xo = X - ox + (row & 1) * (bw >> 1), u = ((xo % bw) + bw) % bw, id = Math.floor(xo / bw);
    if (v === bh - 1 || u === bw - 1) return mortar;
    const n = hash(id * 7 + seed, row * 13 + seed);
    let k = n < 0.22 ? 1 : n > 0.84 ? 3 : 2;
    if (v === 0) k = Math.min(rp.length - 1, k + 1);
    else if (v === bh - 2 || u === bw - 2) k = Math.max(0, k - 1);
    if (hash(X * 3 + seed, Y * 5) < 0.05) k = Math.max(0, k - 1);
    return rp[k];
  };
}
// Đá xếp: hàng cao bh, viên dài ngắn khác nhau, sáng trên-trái, tối dưới-phải
function stones(rp, mortar, { bh = 6, seed = 0, ox = 0, oy = 0, minW = 7, maxW = 14 } = {}) {
  return (X, Y) => {
    const yy = Y - oy, row = Math.floor(yy / bh), v = ((yy % bh) + bh) % bh;
    if (v === bh - 1) return mortar;
    // ranh giới viên trong hàng: cộng dồn độ dài ngẫu nhiên
    let x = -Math.floor(hash(row, seed + 3) * maxW) + ox, id = 0, u = 0, wdt = 0;
    const xx = X;
    while (true) { wdt = minW + Math.floor(hash(row * 31 + id, seed) * (maxW - minW)); if (xx < x + wdt) { u = xx - x; break; } x += wdt; id++; }
    if (u === wdt - 1) return mortar;
    const n = hash(id * 11 + row, seed + 7);
    let k = n < 0.25 ? 1 : n > 0.8 ? 3 : 2;
    if (v === 0 || u === 0) k = Math.min(rp.length - 1, k + 1);
    else if (v === bh - 2 || u === wdt - 2) k = Math.max(0, k - 1);
    if (hash(X * 7 + seed, Y * 3 + 1) < 0.07) k = Math.max(0, k - 1);
    return rp[k];
  };
}
// Ngói: hàng cao B, viên rộng Tw, so le nửa viên; bóng hàng trên đổ xuống, gờ dưới cong sáng, ánh men
function tileTex(rp, { oy = 0, B = 6, Tw = 8, seed = 0, span = null }) {
  const hi = mix(rp[3], '#ffffff', 0.45);
  return (X, Y) => {
    const rr = Y - oy, row = Math.floor(rr / B), v = ((rr % B) + B) % B;
    const xo = X + (row & 1) * (Tw >> 1) + seed * 3, u = ((xo % Tw) + Tw) % Tw, id = Math.floor(xo / Tw);
    const n = hash(id * 5 + seed, row * 11 + 3);
    let k;
    if (v === 0) k = 0;                                           // bóng hàng ngói trên đổ xuống
    else if (v === B - 1) k = u === 0 ? 1 : 2;                    // mép dưới viên
    else if (v === B - 2) k = u === 0 ? 2 : 3;                    // gờ sáng
    else k = u === 0 ? 1 : (u === 1 && v <= 2) ? 3 : 2;           // thân: khe mờ, sáng mép trái
    if (span) { const s = span(Y); if (s) { if (X <= s[0] + 2) k = Math.min(3, k + 1); else if (X >= s[1] - 5) k = Math.max(0, k - 1); } }
    if (k === 2 && n < 0.16 && v > 0 && v < B - 2) return mix(rp[2], rp[1], 0.45);   // viên ngói cũ sẫm hơn
    if (k === 3 && v === B - 2 && u === 2 && n > 0.7) return hi;  // ánh men
    return rp[k];
  };
}
// Tôn múi: sóng dọc chu kỳ 8, mối chồng ngang, đinh tán
function tinTex({ oy = 0, sheet = 20 } = {}) {
  const C = ['#5f7088', '#7a8ca2', '#94a5b8', '#c3cfdc', '#e4ecf4'];
  return (X, Y) => {
    const u = X % 8, v = (Y - oy) % sheet;
    let k = u === 0 ? 4 : u <= 2 ? 3 : u === 3 ? 2 : u <= 5 ? 1 : u === 6 ? 1 : 2;
    if (v === 0) k = Math.max(0, k - 2);
    if (v === 1 && u === 4) return '#4c5a6e';
    return C[k];
  };
}
// Rơm (bó rơm, đống rơm): sợi ngắn nằm ngang
function strawTex(rp, { seed = 0, dir = 'h' } = {}) {
  return (X, Y) => {
    const a = dir === 'h' ? X : Y, b = dir === 'h' ? Y : X;
    const n = hash(Math.floor((a + hash(b, seed) * 9) / 5) + seed, b);
    return rp[n < 0.14 ? 1 : n > 0.9 ? 4 : n > 0.7 ? 3 : 2];
  };
}
// Vữa trát / tường đất: lốm đốm, vết nứt nhỏ
function plaster(rp, { seed = 0 } = {}) {
  return (X, Y) => {
    const n = hash(X + seed * 13, Y * 3 + seed);
    if (n < 0.05) return rp[0];
    if (n > 0.96) return rp[3];
    if (hash((X >> 2) + seed, (Y >> 1) * 5) < 0.04) return rp[0];
    return rp[n < 0.3 ? 1 : 2];
  };
}
// Kính: phản chiếu xiên, trên sáng dưới đậm
function glass(X0, Y0, w, h) {
  return (X, Y) => {
    const u = X - X0, v = Y - Y0, d = (u + v) % 11;
    if (d === 3 || d === 4 && u < w / 2 || (u + v) % 17 === 9) return GLASS[3];
    return v < h * 0.3 ? GLASS[2] : v > h * 0.75 ? GLASS[0] : GLASS[1];
  };
}

// Vùng hình thang toạ độ cũ (hàng y0..y1, cột round(l)..round(r)) đổi sang khoảng điểm mới của từng hàng
function trapSpan(y0, y1, l0, r0, l1, r1) {
  return Y => {
    if (Y < 2 * y0 || Y > 2 * y1 + 1) return null;
    const t = Math.max(0, Math.min(1, (Y / 2 - 0.25 - y0) / Math.max(1, y1 - y0)));
    return [Math.round(2 * (l0 + (l1 - l0) * t)), Math.round(2 * (r0 + (r1 - r0) * t)) + 1];
  };
}
// Mái ngói hình thang (như tiles() bộ cũ): bờ nóc, các hàng ngói, diềm; nở thêm 1 điểm + viền 1 điểm = viền cũ
function roofTiles(g, y0, y1, l0, r0, l1, r1, rp, { band = 3, ridge = 1, eave = 1, seed = 0, Tw = 8 } = {}) {
  const span = trapSpan(y0, y1, l0, r0, l1, r1), Ytop = 2 * y0, Ybot = 2 * y1 + 1;
  const tex = tileTex(rp, { oy: Ytop + 2 * ridge, B: band * 2, Tw, seed, span });
  g.layer(L => {
    for (let Y = Ytop - 1; Y <= Ybot + 1; Y++) {
      const s = span(Math.max(Ytop, Math.min(Ybot, Y)));
      if (!s) continue;
      for (let X = s[0] - 1; X <= s[1] + 1; X++) {
        const ry = Y - Ytop;
        let c;
        if (ry < 2 * ridge) c = ry <= 0 ? rp[1] : ry === 1 ? rp[3] : ry === 2 * ridge - 1 ? rp[0] : ((X >> 2) % 3 === 0 ? rp[1] : rp[2]);
        else if (Y > Ybot - 2 * eave) c = Y >= Ybot ? rp[0] : (eave > 1 && Y === Ybot - 2 * eave + 1) ? rp[3] : rp[1];
        else c = tex(X, Y);
        if (X < s[0] || X > s[1]) c = X < s[0] ? rp[Math.min(3, rgbaIdx(rp, c) + 1)] : rp[Math.max(0, rgbaIdx(rp, c) - 1)];
        L.N(c, X, Y);
      }
    }
  });
}
const rgbaIdx = (rp, c) => Math.max(0, rp.indexOf(c));
// Mái rạ hình thang: lớp rạ chồng (cao band điểm cũ), sợi rạ dọc, mép lớp lởm chởm; fringe = tua rạ dưới diềm
function roofThatch(g, y0, y1, l0, r0, l1, r1, { band = 3, seed = 0, ridge = 0, fringe = 0, ties = 0, rp = THATCH } = {}) {
  const span = trapSpan(y0, y1, l0, r0, l1, r1), Ytop = 2 * y0, Ybot = 2 * y1 + 1, Ln = band * 2;
  g.layer(L => {
    for (let Y = Ytop - 1; Y <= Ybot + 2 * fringe + 1; Y++) {
      const s = span(Math.max(Ytop, Math.min(Ybot, Y)));
      if (!s) continue;
      for (let X = s[0] - 1; X <= s[1] + 1; X++) {
        const fr = Ybot + 1 + Math.floor(hash(X + seed, 3) * (2 * fringe + 1));
        if (Y > Ybot && (Y > fr || !fringe)) continue;
        const ry = Y - Ytop, u = (X - s[0]) / Math.max(1, s[1] - s[0]);
        let v;
        if (ridge && ry < ridge * 2) {
          v = ry === 0 ? 1 : ry === ridge * 2 - 1 ? 0.4 : 2.6 - u;
          if (ties && ry > 0 && ry < ridge * 2 - 1 && ((X - s[0]) % (ties * 2)) < 2 && X > s[0] + 4 && X < s[1] - 4) v = -1;
        } else {
          const rr = ry - ridge * 2, jag = Math.floor(hash(X + seed * 7, Math.floor(rr / Ln) + 5) * 2.2);
          const li = Math.floor((rr + jag) / Ln), k = (rr + jag) % Ln;
          const st = hash(X + seed + li * 13, li + 9);
          v = 2.7 - u * 1.3 + (k < Ln * 0.34 ? 0.8 : 0) - (k === Ln - 1 ? 1.9 : k === Ln - 2 ? 0.8 : 0);
          if (st < 0.22) v -= 0.8; else if (st > 0.86) v += 0.9;
          if (X <= s[0] + 2) v += 0.7;
          if (Y > Ybot - 1) v = Y >= fr ? 0 : 1;
        }
        if (X < s[0]) v += 0.6; if (X > s[1]) v -= 0.6;
        L.N(v < 0 ? '#4a3010' : rp[clampI(Math.round(v), rp.length)], X, Y);
      }
    }
  });
}

// ---------- chi tiết dựng sẵn ----------
// Cột gỗ / tre (như post() cũ: viền trái phải và đáy, đỉnh hở); nodes = đốt tre mỗi nodes điểm cũ
function post(g, px, py, w, h, rp, nodes = 0) {
  const X0 = px * 2, Y0 = py * 2, W = w * 2, H = h * 2, n = W - 2;
  for (let Y = Y0; Y < Y0 + H; Y++) for (let X = X0; X < X0 + W; X++) {
    const c = X - X0 - 1;
    if (c < 0 || c >= n || Y === Y0 + H - 1) { g.N(OUT, X, Y); continue; }
    let k = c === 0 ? 3 : c === n - 1 ? 1 : (n >= 6 && c === 1) ? 3 : (n >= 6 && c === n - 2) ? 1 : 2;
    if (k === 2 && hash(X * 5, Math.floor((Y - Y0) / 5)) < (nodes ? 0.08 : 0.2)) k = 1;
    if (nodes) {
      const t = (Y - Y0 - 6) % (nodes * 2);
      if (Y - Y0 >= 6 && t === 0) k = 0;
      else if (Y - Y0 >= 6 && t === 1) k = 3;
    }
    g.N(rp[k], X, Y);
  }
}
// Hoa nhỏ 3x3 điểm mới: cánh màu, nhụy vàng (toạ độ mới)
function flower(g, X, Y, col, core = '#f7d547') {
  g.N(col, X, Y - 1); g.N(col, X - 1, Y); g.N(col, X + 1, Y); g.N(col, X, Y + 1); g.N(core, X, Y);
  g.N(mix(col, '#ffffff', 0.5), X - 1, Y - 1 >= 0 ? Y : Y);
}
// Đinh / tán: một điểm tối có điểm sáng
const rivet = (g, X, Y, c = IRON[1], hi = IRON[4]) => { g.N(c, X, Y); g.N(hi, X - 1, Y - 1); };

// ======================================================================
// Vườn nhà
// ======================================================================

// Nhà chính 80x86 (SPR.house): ống khói gạch, mái ngói đỏ, vách ván sơn kem, cửa đôi, hai cửa sổ có bồn hoa, bậc đá
function house() {
  return draw2(80, 86, g => {
    // ống khói
    const CH = ['#5a4e48', '#7a6a60', '#9a8a80', '#bcaea4'];
    g.R(OUT, 56, 0, 10, 16);
    g.R(bricks(CH, '#5e524a', { bw: 8, bh: 5, ox: 1, oy: 2 }), 57, 1, 8, 15);
    g.R(CH[3], 57, 1, 8, 0.5); g.R(CH[0], 64.5, 1, 0.5, 15);
    g.R(OUT, 55.5, 0, 11, 2); g.R(CH[3], 56, 0.5, 10, 0.5); g.R(CH[2], 56, 1, 10, 0.5); g.R('#2a201c', 57.5, 0, 7, 0.5);
    g.R('rgba(40,20,10,0.35)', 57, 13, 8, 3);
    // mái ngói chữ nhật
    const RF = ['#8e2a20', '#b8352b', '#d9483b', '#ef7a6a'];
    g.R(OUT, 1, 8, 78, 42);
    g.R(tileTex(RF, { oy: 22, B: 10, Tw: 10, seed: 1, span: () => [4, 155] }), 2, 9, 76, 40);
    // bờ nóc + diềm
    g.R(RF[3], 2, 9, 76, 1); g.R(RF[2], 2, 10, 76, 0.5); g.R(RF[0], 2, 10.5, 76, 0.5);
    for (let i = 0; i < 38; i++) g.N(i % 2 ? RF[1] : RF[3], 4 + i * 4, 19);
    g.R(RF[1], 2, 47, 76, 1); g.R(RF[0], 2, 48, 76, 1);
    for (let i = 0; i < 19; i++) g.N(RF[2], 6 + i * 8, 94, 4, 1);
    g.R('rgba(40,10,5,0.18)', 72, 11, 6, 36);
    // tường ván sơn kem
    const CR = ['#c9b48a', '#e0c79a', '#f4e2bd', '#fff4dc'];
    g.R(OUT, 6, 49, 68, 35);
    g.R(woodH(CR, { bh: 10, len: 400, oy: 106, seed: 2, nails: false, seam: '#cdb68a' }), 7, 50, 66, 33);
    g.R('rgba(90,55,25,0.42)', 7, 50, 66, 1); g.R('rgba(90,55,25,0.26)', 7, 51, 66, 1); g.R('rgba(90,55,25,0.12)', 7, 52, 66, 1);
    for (const tx of [7, 72]) { g.R(CR[3], tx, 50, 0.5, 33); g.R(CR[1], tx + 0.5, 50, 0.5, 33); }   // nẹp góc
    g.R('rgba(60,30,10,0.12)', 67, 53, 5, 30);
    // cửa đôi
    g.R(OUT, 31, 60, 18, 24);
    g.R(WOOD[2], 31.5, 60.5, 17, 0.5); g.R(WOOD[0], 48, 60.5, 0.5, 23.5);
    for (const [dx, sd] of [[32, 3], [41, 9]]) {
      g.R(woodV(WOOD, { bw: 4, len: 60, seed: sd, ox: dx * 2 + 1 }), dx, 61, 7, 23);
      g.R(WOOD[3], dx, 61, 0.5, 23); g.R(WOOD[0], dx + 6.5, 61, 0.5, 23);
      for (const [py, ph] of [[63, 7], [73, 9]]) {   // ô pa-nô
        g.R(WOOD[0], dx + 1, py, 5, 0.5); g.R(WOOD[0], dx + 1, py, 0.5, ph);
        g.R(WOOD[3], dx + 1.5, py + ph - 0.5, 4.5, 0.5); g.R(WOOD[3], dx + 5.5, py + 0.5, 0.5, ph - 0.5);
        g.R(WOOD[1], dx + 1.5, py + 0.5, 4, ph - 1);
        g.R(WOOD[2], dx + 1.5, py + 0.5, 4, 0.5);
      }
    }
    g.R(DARK[2], 39, 61, 2, 23); g.R(DARK[1], 39.5, 61, 1, 23);
    for (const kx of [36, 42]) { g.R(OUT, kx - 0.5, 71.5, 3, 3); g.R('#d19a1c', kx, 72, 2, 2); g.R('#f7d547', kx, 72, 1.5, 1.5); g.R('#fff6b0', kx, 72, 0.5, 0.5); }
    // cửa sổ + bồn hoa
    for (const wx of [12, 55]) {
      g.R(OUT, wx, 56, 14, 12);
      g.R(WOOD[3], wx + 0.5, 56.5, 13, 0.5); g.R(WOOD[3], wx + 0.5, 56.5, 0.5, 11); g.R(WOOD[1], wx + 13, 56.5, 0.5, 11); g.R(WOOD[1], wx + 0.5, 67, 13, 0.5);
      g.R(glass(wx * 2 + 2, 114, 24, 20), wx + 1, 57, 12, 10);
      g.R('rgba(20,50,90,0.25)', wx + 1, 57, 12, 1);
      g.R(OUT, wx + 6, 57, 2, 10); g.R(WOOD[2], wx + 6.5, 57, 1, 10); g.R(WOOD[3], wx + 6.5, 57, 0.5, 10);
      g.R(OUT, wx + 1, 61, 12, 1); g.R(WOOD[2], wx + 1, 61, 12, 0.5);
      // rèm đỏ buộc hai bên
      for (const [cx, d] of [[wx + 1, 1], [wx + 12.5, -1]]) { g.R('#e5452f', cx, 57, 0.5, 4); g.R(d > 0 ? '#ff8a6a' : '#9e2416', cx + d * 0.5, 57, 0.5, 2.5); g.R('#e5452f', cx + d * 0.5, 59.5, 0.5, 1); }
      // bồn hoa gỗ
      g.R(OUT, wx - 1, 67.5, 16, 3.5);
      g.R(woodH(WOOD, { bh: 3, len: 14, seed: wx }), wx - 0.5, 68, 15, 2.5);
      g.R(WOOD[3], wx - 0.5, 68, 15, 0.5);
      g.R(LEAF[2], wx, 66.5, 14, 1); g.R(LEAF[1], wx, 67, 14, 0.5);
      for (const [fx, col] of [[1, '#e5452f'], [4, '#ff8fb1'], [7, '#f7d547'], [10, '#ff8fb1'], [12.5, '#e5452f']]) {
        g.R(LEAF[3], wx + fx - 0.5, 66, 0.5, 0.5); g.R(LEAF[3], wx + fx + 1, 66.5, 0.5, 0.5);
        flower(g, (wx + fx) * 2 + 1, 131, col);
      }
    }
    // bậc thềm đá
    g.R(OUT, 4, 83, 72, 3);
    g.R(stones(['#86867e', '#a8a8a0', '#bebeb6', '#d8d8d0'], '#77776f', { bh: 6, seed: 4, oy: 166, minW: 14, maxW: 26 }), 5, 83, 70, 2.5);
    g.R('#d8d8d0', 5, 83, 70, 0.5);
    g.R('rgba(40,20,10,0.25)', 31, 83, 18, 0.5);
  });
}

// Nhà kho 64x58 (SPR.shed): mái tôn múi, lòng kho ván tối, rơm xếp, hai cột gỗ, xà chân
function shed() {
  return draw2(64, 58, g => {
    g.R(OUT, 0, 0, 64, 20);
    g.R(tinTex({ oy: 2, sheet: 18 }), 1, 1, 62, 16);
    g.R('#e4ecf4', 1, 1, 62, 0.5);
    for (let X = 6; X < 124; X += 16) { g.N(IRON[1], X, 6); g.N(IRON[1], X, 24); }
    g.R('#6f8095', 1, 17, 62, 2); g.R('#94a5b8', 1, 17, 62, 0.5); g.R('#4f5e72', 1, 18.5, 62, 0.5);
    for (let X = 4; X < 124; X += 8) g.N('#4f5e72', X, 35, 2, 1);
    // lòng kho
    g.R(OUT, 2, 20, 60, 36);
    g.R(woodV(DARK, { bw: 8, len: 70, seed: 3 }), 3, 20, 58, 35);
    g.R('rgba(20,10,4,0.55)', 3, 20, 58, 2); g.R('rgba(20,10,4,0.35)', 3, 22, 58, 2); g.R('rgba(20,10,4,0.18)', 3, 24, 58, 2);
    // bó rơm
    const bale = (bx, by) => {
      g.R(OUT, bx, by, 18, 12);
      g.R(strawTex(HAY, { seed: bx + by }), bx + 1, by + 1, 16, 10);
      g.R(HAY[4], bx + 1, by + 1, 16, 0.5); g.R(HAY[3], bx + 1, by + 1.5, 16, 0.5);
      g.R(HAY[1], bx + 1, by + 10.5, 16, 0.5); g.R(HAY[1], bx + 16.5, by + 1, 0.5, 10);
      for (const ty of [4, 8]) { g.R('#8a6a20', bx + 1, by + ty, 16, 0.5); g.R('#c9a13a', bx + 1, by + ty + 0.5, 16, 0.5); }
      for (const sx of [0.5, 17]) for (let i = 0; i < 4; i++) g.N(HAY[3], (bx + sx) * 2 + (sx < 1 ? -1 : 1) * (i % 2), (by + 2 + i * 2.5) * 2 | 0);
    };
    bale(8, 30); bale(26, 30); bale(17, 20); bale(40, 42); bale(8, 42);
    // cột
    for (const px of [2, 58]) post(g, px, 18, 5, 40, WOOD);
    for (const px of [2, 58]) { rivet(g, px * 2 + 5, 40); rivet(g, px * 2 + 5, 104); }
    g.R(OUT, 2, 55, 60, 3);
    g.R(woodH(WOOD, { bh: 4, len: 36, seed: 8 }), 3, 55, 58, 2);
  });
}

// Thùng giao hàng 24x20 (SPR2.shippingBin): thùng ván, nẹp sắt, nhãn mũi tên xanh, nắp có tay cầm
function shippingBin() {
  const W = WOOD;
  return draw2(24, 20, g => {
    g.shadow(12, 18, 11, 2);
    g.R(OUT, 1, 6, 22, 13);
    g.R(woodH(W, { bh: 8, len: 22, seed: 5, oy: 16 }), 2, 7, 20, 11);
    g.R(W[1], 2, 17, 20, 1);
    g.R('rgba(60,30,10,0.22)', 17, 8, 4, 10);
    // nẹp sắt góc
    for (const px of [2, 19]) {
      g.R(IRON[1], px, 7, 3, 11); g.R('#8a8a98', px, 7, 1, 11); g.R('#5e5e6a', px + 2, 7, 1, 11); g.R(IRON[0], px + 2.5, 7, 0.5, 11);
      for (const y of [9, 13, 16]) rivet(g, px * 2 + 3, y * 2 + 1, '#3a3a44', '#e2e2ea');
    }
    // nhãn giấy
    g.R(OUT, 8, 10, 8, 7);
    g.R('#f6efd8', 9, 11, 6, 5); g.R('#fffbee', 9, 11, 6, 0.5); g.R('#d9c9a0', 9, 15.5, 6, 0.5); g.R('#d9c9a0', 14.5, 11, 0.5, 5);
    g.R('#ece2c4', 9.5, 14.5, 4, 0.5);
    // mũi tên xuống
    g.R('#2f7a22', 11, 11.5, 2, 1.5); g.R('#3f8f2c', 11.5, 11.5, 1, 1.5);
    g.R('#2f7a22', 10, 13, 4, 0.5); g.R('#3f8f2c', 10.5, 13, 3, 0.5); g.R('#3f8f2c', 11, 13.5, 2, 0.5); g.R('#2f7a22', 11.5, 14, 1, 0.5);
    g.R('#7fc858', 11.5, 11.5, 0.5, 1);
    g.R('#1e1008', 2, 7, 20, 1); g.R('#3a2010', 2, 7.5, 20, 0.5);
    // nắp
    g.R(OUT, 0, 1, 24, 7);
    g.R(woodH(W, { bh: 6, len: 24, seed: 9, oy: 4 }), 1, 2, 22, 3);
    g.R(W[3], 1, 2, 22, 0.5);
    for (const px of [7, 16]) { g.R(W[0], px, 2, 0.5, 3); g.R(W[3], px + 0.5, 2, 0.5, 3); }
    g.R(W[1], 1, 5, 22, 1); g.R(W[0], 1, 6, 22, 1); g.R(W[2], 1, 5, 22, 0.5);
    for (const px of [1, 20]) { g.R('#5e5e6a', px, 2, 3, 5); g.R(IRON[3], px, 2, 3, 0.5); g.R(IRON[1], px + 2.5, 2, 0.5, 5); rivet(g, px * 2 + 3, 9, '#3a3a44', '#d4d4de'); }
    // tay cầm
    g.R(OUT, 9, 0, 6, 2); g.R(IRON[3], 10, 0.5, 4, 1); g.R(IRON[4], 10, 0.5, 1.5, 0.5); g.R(IRON[2], 10, 1, 4, 0.5);
  });
}

// Giếng 16x24 (SPR.well): thành đá xếp, miệng nước, hai cột gỗ, mái ngói nhỏ, dây và xô
function well() {
  return draw2(16, 24, g => {
    g.R(OUT, 0, 13, 16, 11);
    g.R(stones(['#7a7a74', '#9a9a94', '#b8b8b0', '#d8d8d0'], '#6a6a64', { bh: 6, seed: 2, oy: 28, minW: 6, maxW: 11 }), 1, 14, 14, 9);
    g.R('#d8d8d0', 1, 14, 14, 0.5); g.R('#e8e8e0', 1.5, 14, 4, 0.5);
    g.R('rgba(40,30,20,0.2)', 12, 15, 3, 8);
    for (const [mx, my] of [[3, 21], [10, 18]]) { g.R('#5fa83a', mx, my, 1, 0.5); g.R('#8fd65a', mx, my - 0.5, 0.5, 0.5); }   // rêu
    // miệng giếng
    g.R(OUT, 2, 11, 12, 4);
    g.R('#1f6fd1', 3, 12, 10, 2); g.R('#164f9a', 3, 12, 10, 0.5);
    g.R('#5fb8ff', 5, 12.5, 3, 0.5); g.R('#9fd8ff', 9, 13, 2, 0.5); g.R('#3f8ce0', 3, 13.5, 10, 0.5);
    g.R('#a8a8a0', 2.5, 11, 11, 0.5);
    // cột + mái
    for (const px of [1, 13]) post(g, px, 3, 3, 10, WOOD);
    g.R(OUT, 0, 4, 16, 1);
    const RF = ['#8e2a20', '#b8352b', '#d9483b', '#ef7a6a'];
    g.layer(L => {
      for (let i = 1; i < 4; i++) L.R(i === 1 ? RF[3] : i === 2 ? RF[2] : RF[1], 1 + i, i, 14 - 2 * i, 1);
      for (let X = 4; X < 28; X += 4) L.N(RF[0], X, 5, 1, 2);
      L.R(RF[3], 3, 1, 10, 0.5);
    });
    g.R(RF[0], 1, 4, 14, 0.5);
    // trục quay + dây + xô
    g.R(OUT, 3, 5.5, 10, 1); g.R(WOOD[2], 3, 5.5, 10, 0.5);
    g.R('#e0c79a', 8, 6, 0.5, 3); g.R('#b8a070', 8.5, 6, 0.5, 3);
    g.R(OUT, 6, 8, 5, 5);
    g.R(woodV(WOOD, { bw: 2, len: 30, seed: 1 }), 7, 9, 3, 3);
    g.R(IRON[2], 6.5, 9.5, 4, 0.5); g.R(IRON[2], 6.5, 11, 4, 0.5);
    g.R('#ffffff', 7, 9, 3, 0.5); g.R('#cfeaff', 7.5, 9, 1, 0.5);
  });
}

// Bảng đơn hàng 24x24 (SPR.board): khung gỗ, mặt bần, giấy ghim
function board() {
  return draw2(24, 24, g => {
    for (const px of [4, 18]) post(g, px, 15, 3, 9, WOOD);
    g.R(OUT, 0, 0, 24, 18);
    g.R(woodH(WOOD, { bh: 4, len: 48, seed: 3 }), 1, 1, 22, 16);
    g.R(WOOD[3], 1, 1, 22, 1); g.R(WOOD[1], 1, 15, 22, 2); g.R(WOOD[0], 1, 16.5, 22, 0.5);
    g.R('#c08850', 1.5, 2.5, 21, 12.5);   // mặt bần
    g.R((X, Y) => (hash(X, Y) < 0.18 ? '#a87038' : hash(X * 3, Y) > 0.9 ? '#d8a068' : '#c08850'), 2, 2.5, 20, 12.5);
    g.R(WOOD[1], 1.5, 2.5, 21, 0.5); g.R(WOOD[1], 1.5, 2.5, 0.5, 12.5);
    const paper = (px, py, w, h, tilt, col = '#ffffff') => {
      g.R('rgba(40,20,8,0.3)', px + 0.5, py + 0.5, w, h);
      g.R(OUT, px, py, w, h);
      g.R(col, px + 0.5, py + 0.5, w - 1, h - 1);
      g.R(mix(col, '#c8b890', 0.35), px + w - 1, py + 0.5, 0.5, h - 1); g.R(mix(col, '#c8b890', 0.35), px + 0.5, py + h - 1, w - 1, 0.5);
      for (let yy = py + 2; yy < py + h - 1.5; yy += 1.5) g.R('#8a8a8a', px + 1.5, yy, w - 3 - (tilt ? 1 : 0) - (hash(yy * 2, px) < 0.5 ? 1 : 0), 0.5);
      g.R('#9e2416', px + (w >> 1), py + 0.5, 1, 1); g.R('#e5452f', px + (w >> 1), py + 0.5, 0.5, 0.5);
    };
    paper(3, 3, 7, 9, 0);
    paper(12, 4, 8, 8, 1, '#fff4c0');
    paper(9, 8, 5, 6, 0, '#cfeaff');
  });
}

// Biển tên vườn ở cổng 40x22 (SPR.signboard): hai chân gỗ, tấm ván ngang có vân, nẹp sáng
function signboard() {
  return draw2(40, 22, g => {
    for (const px of [5, 32]) post(g, px, 10, 4, 12, WOOD);
    g.R(OUT, 0, 0, 40, 14);
    g.R(woodH(['#8a5a2b', '#a8703e', '#c98c4a', '#e0a868'], { bh: 6, len: 52, seed: 11, oy: 6, nails: false }), 1, 1, 38, 12);
    g.R('#e0a868', 1, 1, 38, 1); g.R('#f0c088', 1, 1, 38, 0.5);
    g.R('#8a5a2b', 1, 11, 38, 2); g.R(WOOD[0], 1, 12.5, 38, 0.5);
    for (const [nx, ny] of [[2, 3], [37, 3], [2, 9.5], [37, 9.5]]) rivet(g, nx * 2 + 1, ny * 2, '#4a3020', '#e0c090');
    g.R('rgba(60,30,10,0.18)', 34, 1.5, 5, 9.5);
  });
}

// Ổ ấp trứng nhỏ cạnh chuồng gà 30x28 (SPR.coop): mái ngói đầu hồi, vách trát kem, cửa có thanh gỗ
function coop() {
  return draw2(30, 28, g => {
    const RF = ['#8e2a20', '#b8352b', '#d9483b', '#ef7a6a'];
    g.R(OUT, 2, 11, 26, 17);
    g.R(plaster(['#d8c49a', '#ecd8b0', '#f4e2bd', '#fff4dc'], { seed: 3 }), 3, 12, 24, 15);
    g.R('rgba(90,55,25,0.35)', 3, 12, 24, 1); g.R('rgba(90,55,25,0.18)', 3, 13, 24, 1);
    g.R('rgba(60,30,10,0.14)', 23, 14, 4, 13);
    g.R(OUT, 10, 16, 10, 11);
    g.R(DARK[0], 11, 17, 8, 10);
    for (let i = 0; i < 4; i++) { g.R(WOOD[2], 11, 18 + i * 2, 8, 1); g.R(WOOD[3], 11, 18 + i * 2, 8, 0.5); g.R(WOOD[0], 18.5, 18 + i * 2, 0.5, 1); }
    g.R(WOOD[2], 9.5, 15.5, 11, 0.5);
    // mái đầu hồi
    g.layer(L => {
      for (let i = 1; i < 10; i++) L.R(tileTex(RF, { oy: 2, B: 4, Tw: 6, seed: 2, span: Y => [30 - Y * 2 - 6, 30 + Y * 2 + 6] }), 15 - i - 4, i, (i + 4) * 2, 1);
      L.R(RF[3], 11, 1, 8, 0.5);
    });
    g.R(OUT, 0, 10, 30, 2); g.R(RF[0], 0.5, 10, 29, 0.5);
  });
}

// Ổ rơm 16x10 (SPR.nestEmpty / nestEgg): rơm sợi đan, lòng ổ tối, trứng có ánh
function nest(withEgg) {
  return draw2(16, 10, g => {
    g.ell('#5c3a1a', 8, 6, 8, 4);
    g.ell(strawTex(['#8a6a20', '#a8841c', '#d9b13a', '#f0d060', '#fff0a0'], { seed: 4 }), 8, 6, 7, 3);
    g.ell('#6a4e18', 8, 5, 5, 2); g.ell('#8a6a20', 8, 5.5, 4.5, 1.5);
    if (withEgg) {
      g.ell('#6b4a2a', 8, 4, 3, 3); g.ell('#fff8ea', 8, 4, 2, 2);
      g.nell('#ece0c8', 17.5, 10.5, 2.5, 2); g.N('#ffffff', 14, 6, 2, 1); g.N('#ffffff', 14, 7);
    }
    // vành rơm trước
    g.R('#d9b13a', 2, 7, 12, 2);
    g.R((X, Y) => (hash(X, Y) < 0.3 ? '#fff0a0' : '#f0d060'), 3, 7, 10, 1);
    for (let i = 0; i < 12; i++) g.N(i % 3 ? '#a8841c' : '#8a6a20', 6 + i * 2 + (i & 1), 16 + (i % 2));
    for (const [sx, sy] of [[1, 5], [14, 5], [0, 7], [15, 7], [3, 2], [12, 2]]) { g.R('#f0d060', sx, sy, 1, 0.5); g.R('#d9b13a', sx + 0.5, sy + 0.5, 0.5, 0.5); }
    g.line('#5c3a1a', 3, 9, 12, 9);
    g.R('#3b2412', 3, 9.5, 10, 0.5);
  });
}

// Máng ăn 26x12 (SPR.trough): máng ván, thức ăn hạt vàng
function trough() {
  return draw2(26, 12, g => {
    g.R(OUT, 0, 2, 26, 10);
    g.R(woodH(WOOD, { bh: 5, len: 26, seed: 3, oy: 6 }), 1, 3, 24, 8);
    g.R(WOOD[3], 1, 6, 24, 0.5);
    g.R(WOOD[0], 1, 8, 24, 1); g.R(WOOD[1], 1, 8.5, 24, 0.5);
    g.R('rgba(40,20,8,0.22)', 21, 6, 4, 5);
    for (const px of [1, 24]) { g.R(WOOD[1], px, 3, 1, 8); g.R(WOOD[3], px, 3, 0.5, 8); rivet(g, px * 2 + 1, 18, IRON[1], IRON[3]); }
    g.R((X, Y) => { const n = hash(X * 3, Y * 7); return n < 0.15 ? '#c9a13a' : n < 0.3 ? '#a87a20' : n > 0.85 ? '#fff0a0' : '#f0cf5a'; }, 2, 3, 22, 3);
    g.R('#fff0a0', 2, 3, 22, 0.5); g.R('#a87a20', 2, 5.5, 22, 0.5);
  });
}

// Đống rơm 24x16 (SPR.hay): ụ rơm tròn, sợi rơm cong theo khối, bóng phải, chân viền
function hay() {
  return draw2(24, 16, g => {
    g.ell(OUT, 12, 10, 9, 9);
    g.ell((X, Y, dx, dy) => {
      const lv = -dx * 0.55 - dy * 0.75 + 0.15, n = hash(Math.floor((X + Y * 0.6) / 3), Y) - 0.5;
      const v = lv + n * 0.6;
      return HAY[v > 0.55 ? 4 : v > 0.15 ? 3 : v > -0.3 ? 2 : v > -0.7 ? 1 : 0];
    }, 12, 10, 8, 8);
    for (const [hx, hy] of [[7, 6], [12, 4], [16, 8], [9, 11], [15, 12], [5, 9], [18, 11]]) { g.R('#a8801e', hx, hy, 2.5, 0.5); g.R('#fff0a0', hx + 0.5, hy - 0.5, 1.5, 0.5); }
    g.R('#fff8c8', 9, 4, 3, 0.5);
    g.R(OUT, 2, 14, 20, 2);
    g.R('#8a6a20', 2.5, 14, 19, 0.5);
    for (let i = 0; i < 10; i++) g.N('#c9a13a', 6 + i * 4, 27, 1, 1);
  });
}

// ======================================================================
// Chuồng 3 cấp (SPR3.pen), cách ly, chuồng chó, nhà mèo
// ======================================================================

// Hình thang tô theo hàm màu, nở 1 điểm + viền 1 điểm (bằng viền cũ 1 điểm cũ)
function trapFill(g, y0, y1, l0, r0, l1, r1, col, out = OUT) {
  const span = trapSpan(y0, y1, l0, r0, l1, r1), Ytop = 2 * y0, Ybot = 2 * y1 + 1;
  g.layer(L => {
    for (let Y = Ytop - 1; Y <= Ybot + 1; Y++) {
      const s = span(Math.max(Ytop, Math.min(Ybot, Y)));
      if (s) for (let X = s[0] - 1; X <= s[1] + 1; X++) L.N(typeof col === 'function' ? col(X, Y, s) : col, X, Y);
    }
  }, out);
}
// vách ván ngang như planks() cũ (đỉnh hở, viền trái phải đáy, bóng phải)
function planks(g, px, py, w, h, rp, step = 3, seed = 0) {
  g.R(OUT, px, py, w, h);
  g.R(woodH(rp, { bh: step * 2, len: Math.max(14, w * 2 - 6), seed: seed + px * 3 + py, oy: py * 2 }), px + 1, py, w - 2, h - 1);
  g.R(rp[3], px + 1, py, w - 2, 0.5);
  g.R('rgba(40,20,8,0.22)', px + w - 4, py, 3, h - 1);
}
// lỗ cửa tối, bo hai góc trên
function doorHole(g, px, py, w, h, arch = true) {
  g.R(OUT, px, py, w, h);
  g.R('#1e1008', px + 1, py + 1, w - 2, h - 1);
  g.R('#120804', px + 1, py + 1, w - 2, 1);
  g.R('#3a2414', px + 1, py + h - 2, w - 2, 1); g.R('#4e3420', px + 1.5, py + h - 2, w - 3, 0.5);
  if (arch) {
    g.clear(px, py, 1, 1); g.clear(px + w - 1, py, 1, 1);
    g.R(OUT, px + 0.5, py + 0.5, 0.5, 0.5); g.R(OUT, px + w - 1, py + 0.5, 0.5, 0.5);
    g.R(OUT, px + 1, py, w - 2, 1);
    g.R('#1e1008', px + 1, py + 1, 0.5, 0.5); g.R('#1e1008', px + w - 1.5, py + 1, 0.5, 0.5);
  }
}
// cầu thang gà: tấm ván xiên có nẹp ngang
function henRamp(g, px, py, w, h) {
  for (let i = 0; i < h; i++) { g.R(OUT, px + i, py + i, w, 2); g.R(WOOD[2], px + i + 1, py + i, w - 2, 1); g.R(WOOD[3], px + i + 1, py + i, w - 2, 0.5); }
  for (let i = 1; i < h; i += 2) { g.R(WOOD[0], px + i + 1, py + i, w - 2, 0.5); g.R(WOOD[1], px + i + 1, py + i + 0.5, w - 2, 0.5); }
}
// đống rơm nhỏ
function strawPile(g, cx, cy, rx, ry) {
  g.ell(OUT, cx, cy, rx + 1, ry + 1);
  g.ell(strawTex(THATCH, { seed: cx * 3 + cy }), cx, cy, rx, ry);
  g.ell((X, Y) => (hash(X, Y * 3) < 0.25 ? THATCH[4] : THATCH[3]), cx - 1, cy - 1, rx - 1.5, ry - 1);
  for (let i = 0; i < rx * 4; i++) {
    const X = Math.round(2 * (cx - rx) + hash(i, cy) * rx * 4), Y = Math.round(2 * (cy - ry) + hash(cx, i) * ry * 4);
    g.N(hash(i, 3) < 0.5 ? THATCH[4] : THATCH[1], X, Y, 2 + (i % 2), 1);
  }
  for (const s of [-1, 1]) g.N(THATCH[3], 2 * cx + 1 + s * (2 * rx + 2), 2 * cy - 1, 1, 1);   // cọng rơm lòi ra
}
// vách tre: thanh tre dọc rộng 2 điểm cũ, có đốt
function bambooWall(g, px, py, w, h, seed = 0) {
  g.R((X, Y) => {
    const u = (X - px * 2) % 4, pole = Math.floor((X - px * 2) / 4);
    const nodeY = 2 * py + 3 + Math.floor(hash(pole, seed) * 6);
    if (Y === nodeY) return BAMBOO[0];
    if (Y === nodeY + 1) return BAMBOO[3];
    return BAMBOO[u === 0 ? 3 : u === 1 ? 2 : u === 2 ? 2 : 1];
  }, px, py, w, h);
}
const BARN_RED = ['#7e2418', '#9e3024', '#c44434', '#e06a52'];
const BARN_ROOF = ['#3a2a22', '#5a463c', '#7a645a', '#a08a7c'];
const CREAM = ['#d8ccb4', '#e8dcc4', '#f2e8d4', '#fffaf0'];
// cửa lớn chuồng bò: khung kem, chéo chữ X
function barnDoor(g, px, py, w, h) {
  g.R(OUT, px, py, w, h);
  g.R(woodV(['#6e2016', '#7e2418', '#8e3024', '#a83c2c'], { bw: 4, len: 80, seed: 7 }), px + 1, py + 1, w - 2, h - 1);
  const X0 = 2 * px + 2, Y0 = 2 * py + 2, X1 = 2 * (px + w) - 3, Y1 = 2 * (py + h) - 1;
  for (const [a, b] of [[[X0, Y0], [X1, Y1]], [[X1, Y0], [X0, Y1]]]) { g.nline('#c8bc9e', a[0], a[1] + 1, b[0], b[1] + 1, 2); g.nline('#f3ead2', a[0], a[1], b[0], b[1], 2); }
  g.R('#f3ead2', px + 1, py + 1, w - 2, 1); g.R('#fffaf0', px + 1, py + 1, w - 2, 0.5);
  g.R('#f3ead2', px + 1, py + 1, 1, h - 1); g.R('#fffaf0', px + 1, py + 1, 0.5, h - 1);
  g.R('#f3ead2', px + w - 2, py + 1, 1, h - 1); g.R('#c8bc9e', px + w - 1.5, py + 1, 0.5, h - 1);
  const mid = px + Math.floor(w / 2) - (w % 2 ? 0 : 1);
  g.R(OUT, mid, py + 1, w % 2 ? 1 : 2, h - 1);
  for (const hx of [mid - 1.5, mid + (w % 2 ? 1 : 2) + 0.5]) { g.R(IRON[1], hx, py + h * 0.45, 1, 1); g.R(IRON[3], hx, py + h * 0.45, 0.5, 0.5); }
}
// ô cỏ khô trên gác
function loftHay(g, px, py, w, h) {
  g.R(OUT, px, py, w, h); g.R('#2a1608', px + 1, py + 1, w - 2, h - 2);
  g.R(strawTex(THATCH, { seed: px }), px + 1, py + h - 3, w - 2, 2);
  g.R(THATCH[4], px + 2, py + h - 3, 2, 0.5);
  for (let i = 0; i < w - 2; i++) g.N(THATCH[3], 2 * (px + 1 + i) + (i % 2), 2 * (py + h - 3) - 1);
}
function coopHouse(t) {
  if (t === 0) return draw2(34, 32, g => {
    g.shadow(17, 30, 15, 2);
    for (const px of [5, 26]) post(g, px, 18, 3, 13, BAMBOO, 3);
    g.R(OUT, 3, 12, 28, 9);
    bambooWall(g, 4, 13, 26, 7, 1);
    g.R(BAMBOO[0], 4, 19, 26, 1); g.R(BAMBOO[1], 4, 19, 26, 0.5);
    g.R('#8a5a2b', 4, 15.5, 26, 0.5);   // dây buộc ngang
    doorHole(g, 14, 14, 6, 7);
    henRamp(g, 18, 21, 4, 7);
    roofThatch(g, 2, 13, 13, 20, 0, 33, { band: 3, seed: 3 });
    strawPile(g, 8, 27, 3, 1.5);
  });
  if (t === 1) return draw2(38, 36, g => {
    g.shadow(19, 34, 17, 2);
    for (const px of [4, 31]) post(g, px, 24, 3, 11, WOOD);
    planks(g, 3, 14, 32, 12, WOOD, 3, 1);
    doorHole(g, 15, 17, 7, 9);
    // ổ đẻ có rơm thò ra
    g.R(OUT, 25, 17, 8, 6); g.R('#2a1608', 26, 18, 6, 4); g.R('#1a0c04', 26, 18, 6, 1);
    g.R(strawTex(THATCH, { seed: 5 }), 26, 20, 6, 2); g.R(THATCH[4], 27, 20, 2, 0.5);
    g.R('#fff4e0', 29, 19, 2, 1); g.R('#ffffff', 29, 19, 0.5, 0.5); g.R('#e8d8b8', 29, 20, 2, 0.5);
    henRamp(g, 20, 26, 4, 8);
    roofTiles(g, 3, 15, 15, 22, 0, 37, TILE, { band: 3 });
    g.R(OUT, 17, 1, 4, 3); g.R(WOOD[3], 18, 2, 2, 1); g.R('#fff0c8', 18, 2, 1, 0.5);
    strawPile(g, 7, 32, 3, 1.5);
  });
  return draw2(46, 40, g => {
    g.shadow(21, 38, 20, 2);
    // ổ cát tắm
    g.R(OUT, 30, 29, 15, 9); g.R(WOOD[2], 31, 30, 13, 7); g.R(WOOD[3], 31, 30, 13, 0.5); g.R(WOOD[1], 43.5, 30, 0.5, 7);
    g.R((X, Y) => { const n = hash(X * 3, Y * 5); return n < 0.2 ? '#c8a860' : n > 0.86 ? '#fff0c0' : '#ecd394'; }, 32, 31, 11, 5);
    g.R('#b89850', 32, 31, 11, 0.5);
    for (const [sx, sy, sw] of [[34, 33, 3], [39, 34, 2], [36, 35, 1.5]]) { g.R('#b89850', sx, sy + 0.5, sw, 0.5); g.R('#fff0c0', sx, sy, sw, 0.5); }
    for (const px of [4, 26]) post(g, px, 26, 3, 11, WOOD);
    // vách sơn kem
    g.R(OUT, 3, 15, 27, 13);
    g.R(woodH(CREAM, { bh: 6, len: 400, seed: 3, oy: 32, nails: false, seam: '#c8bca0' }), 4, 16, 25, 12);
    g.R('rgba(60,40,20,0.18)', 25, 16, 4, 12);
    post(g, 3, 15, 3, 13, WOOD); post(g, 27, 15, 3, 13, WOOD);
    doorHole(g, 13, 18, 7, 10);
    g.R('#e5452f', 13, 17, 7, 1); g.R('#ff7a5a', 13, 17, 7, 0.5); g.R('#9e2416', 13, 17.5, 0.5, 0.5); g.R('#9e2416', 19.5, 17.5, 0.5, 0.5);
    // cửa sổ tròn
    g.ell(OUT, 23, 21, 2.4, 2.4); g.ell(glass(42, 38, 9, 9), 23, 21, 1.6, 1.6);
    g.R(OUT, 23, 19, 1, 5); g.R(OUT, 21, 21, 5, 1); g.R(WOOD[2], 23.5, 19.5, 0.5, 4); g.R(WOOD[2], 21.5, 21.5, 4, 0.5);
    // chậu hoa
    g.R(LEAF[2], 7, 24, 4, 2); g.R(LEAF[4], 7, 24, 2, 0.5); g.R(LEAF[3], 7.5, 24.5, 2.5, 0.5);
    flower(g, 17, 47, '#e5452f'); flower(g, 21, 47, '#f7d547', '#ffffff');
    g.R(OUT, 6, 26, 6, 1); g.R('#c0603e', 6.5, 26, 5, 0.5);
    henRamp(g, 18, 28, 4, 8);
    roofTiles(g, 3, 17, 15, 18, -1, 34, ['#1e4a6e', '#2e6a9e', '#4a8ac4', '#7ab4e6'], { band: 3, seed: 1 });
    // chong chóng gà trên nóc
    g.R(OUT, 16, 0, 1, 4); g.R(IRON[2], 16.5, 0.5, 0.5, 3.5);
    g.R(OUT, 13.5, 0.5, 5, 1.5); g.R('#f7d547', 14, 1, 4, 0.5); g.R('#d19a1c', 14, 1.5, 4, 0.5); g.R('#fff6b0', 14, 1, 1, 0.5);
    g.R('#e5452f', 14, 0, 1, 1); g.R('#ff7a5a', 14, 0, 0.5, 0.5);
  });
}
function pigHouse(t) {
  if (t === 0) return draw2(32, 26, g => {
    g.shadow(16, 24, 15, 2);
    for (const px of [2, 27]) post(g, px, 9, 3, 16, WOOD);
    g.R(OUT, 4, 16, 24, 9); g.R('#2a1a10', 5, 17, 22, 7); g.R('#1a0e06', 5, 17, 22, 2);
    strawPile(g, 16, 22, 7, 1.6);
    roofThatch(g, 2, 11, 6, 25, 0, 31, { band: 3, seed: 7 });
  });
  if (t === 1) return draw2(36, 30, g => {
    g.shadow(18, 28, 17, 2);
    g.R(OUT, 2, 13, 32, 15);
    g.R(bricks(['#8e4028', '#a24a2e', '#b4583a', '#d0805a'], '#7a3420', { bw: 8, bh: 4, ox: 6, oy: 28, seed: 2 }), 3, 14, 30, 14);
    g.R('#d0805a', 3, 14, 30, 0.5);
    g.R(OUT, 10, 17, 16, 11); g.R('#24140c', 11, 18, 14, 10); g.R('#140a04', 11, 18, 14, 1.5);
    strawPile(g, 18, 26, 6, 1.4);
    roofTiles(g, 2, 15, 6, 29, 0, 35, TILE, { band: 3, seed: 2 });
  });
  const MUD = ['#3e2a14', '#5a3e1e', '#7a5a2e', '#9a7a48'];
  return draw2(44, 36, g => {
    // vũng bùn
    g.ell(OUT, 33, 30, 10, 4.4); g.ell(MUD[1], 33, 30, 9.4, 3.8);
    g.ell((X, Y) => (hash(X, Y) < 0.2 ? MUD[1] : MUD[2]), 31, 29, 6, 1.6);
    g.R(MUD[3], 28, 28, 3, 0.5); g.R(MUD[0], 36, 32, 4, 0.5);
    g.R('#9ad0f0', 36, 31, 2, 0.5); g.R('#cfeaff', 36.5, 31, 1, 0.5); g.R('#9ad0f0', 30, 31.5, 1, 0.5);
    g.shadow(16, 33, 15, 2);
    g.R(OUT, 2, 15, 28, 17);
    g.R(bricks(['#c8b8a0', '#d8c8b0', '#f4ead8', '#fffaf0'], '#d0c0a8', { bw: 8, bh: 4, oy: 32, seed: 5 }), 3, 16, 26, 11);
    g.R(stones(['#5e5a62', '#76727a', '#8a868e', '#a8a4ac'], '#4e4a52', { bh: 5, oy: 54, seed: 3, minW: 6, maxW: 11 }), 3, 27, 26, 5);
    g.R('#a8a4ac', 3, 27, 26, 0.5);
    g.R(OUT, 9, 20, 14, 12); g.R('#24140c', 10, 21, 12, 11); g.R('#140a04', 10, 21, 12, 1.5);
    strawPile(g, 16, 30, 5, 1.4);
    // biển tên hình heo
    g.R(OUT, 12, 17, 8, 3); g.R('#f6efd8', 13, 18, 6, 1);
    g.R('#f4a4b8', 14, 18, 2.5, 1); g.R('#d8728c', 16.5, 18, 1, 1); g.R('#d8728c', 14, 18.5, 0.5, 0.5); g.R(OUT, 15, 18, 0.5, 0.5);
    // máng đá
    g.R(OUT, 24, 28, 9, 4); g.R(STONE[3], 25, 28, 7, 1); g.R(STONE[4], 25, 28, 7, 0.5); g.R(STONE[1], 25, 29, 7, 2); g.R(STONE[0], 25, 30.5, 7, 0.5);
    g.R('#d9b13a', 26, 29, 5, 1); g.R('#f0d060', 26, 29, 3, 0.5);
    roofTiles(g, 3, 17, 5, 26, -1, 32, ['#2e5a1e', '#3e7a2a', '#5aa03c', '#8ccc5a'], { band: 3, seed: 3 });
  });
}
function barnHouse(t) {
  if (t === 0) return draw2(40, 30, g => {
    g.shadow(20, 28, 19, 2);
    for (const px of [2, 18, 35]) post(g, px, 11, 3, 18, BAMBOO, 4);
    g.R(OUT, 4, 20, 31, 2); g.R(BAMBOO[2], 4, 20, 31, 1); g.R(BAMBOO[3], 4, 20, 31, 0.5);
    for (const px of [6, 16, 24, 32]) { g.R('#8a5a2b', px, 20, 1, 1); g.R('#b07a45', px, 20, 0.5, 0.5); }
    strawPile(g, 12, 26, 5, 1.6); strawPile(g, 27, 26, 4, 1.4);
    roofThatch(g, 2, 13, 8, 31, 0, 39, { band: 3, seed: 11 });
  });
  if (t === 1) return draw2(46, 38, g => {
    g.shadow(23, 36, 22, 2);
    g.R(OUT, 3, 15, 40, 21);
    g.R(woodV(BARN_RED, { bw: 6, len: 60, seed: 4, ox: 8 }), 4, 16, 38, 19);
    g.R('rgba(40,10,6,0.25)', 37, 16, 5, 19);
    barnDoor(g, 15, 20, 16, 16);
    loftHay(g, 19, 11, 8, 7);
    roofTiles(g, 2, 16, 14, 31, 0, 45, BARN_ROOF, { band: 3, seed: 4 });
    g.R(OUT, 19, 11, 8, 1);
  });
  return draw2(56, 44, g => {
    g.shadow(24, 42, 23, 2);
    g.R(OUT, 3, 18, 42, 24);
    g.R(woodV(BARN_RED, { bw: 6, len: 60, seed: 6, ox: 8 }), 4, 19, 40, 22);
    g.R('rgba(40,10,6,0.25)', 39, 19, 5, 22);
    g.R('#f3ead2', 4, 19, 40, 1); g.R('#fffaf0', 4, 19, 40, 0.5); g.R('#f3ead2', 4, 40, 40, 1); g.R('#c8bc9e', 4, 40.5, 40, 0.5);
    barnDoor(g, 15, 24, 18, 18);
    for (const wx of [6, 36]) {
      g.R(OUT, wx, 24, 7, 6); g.R(glass(wx * 2 + 2, 50, 10, 8), wx + 1, 25, 5, 4);
      g.R(OUT, wx + 3, 25, 1, 4); g.R('#f3ead2', wx + 3.5, 25, 0.5, 4);
      g.R('#f3ead2', wx, 30, 7, 1); g.R('#c8bc9e', wx, 30.5, 7, 0.5);
    }
    loftHay(g, 20, 12, 8, 8);
    roofTiles(g, 2, 19, 16, 32, 0, 47, BARN_ROOF, { band: 3, seed: 6 });
    g.R(OUT, 20, 12, 8, 1);
    // chong chóng
    g.R(OUT, 24, 0, 1, 7); g.R(IRON[2], 24.5, 0.5, 0.5, 6);
    g.R(OUT, 20.5, 1.5, 8, 1.5); g.R('#d19a1c', 21, 2, 7, 0.5); g.R('#f7d547', 21, 2, 3, 0.5); g.R('#9a6a10', 21, 2.5, 7, 0.5);
    // máng cỏ bên hông
    g.R(OUT, 44, 30, 11, 12);
    for (let i = 0; i < 5; i++) { g.R(WOOD[2], 45 + i * 2, 31, 1, 7); g.R(WOOD[3], 45 + i * 2, 31, 0.5, 7); }
    strawPile(g, 49, 30, 4, 2);
    g.R(OUT, 44, 37, 11, 5); g.R(woodH(WOOD, { bh: 4, len: 22, seed: 3 }), 45, 38, 9, 3); g.R(WOOD[3], 45, 38, 9, 0.5); g.R(WOOD[0], 45, 40.5, 9, 0.5);
    g.R(LEAF[3], 46, 36, 2, 1); g.R(LEAF[4], 46, 36, 1, 0.5); g.R(LEAF[4], 51, 36, 1, 1); g.R(LEAF[2], 52, 36.5, 1, 0.5);
  });
}
function quarantine() {
  return draw2(32, 28, g => {
    g.shadow(16, 26, 15, 2);
    g.R(OUT, 3, 11, 26, 15);
    g.R(woodH(['#b8c4be', '#d4dcd8', '#eef4f0', '#ffffff'], { bh: 6, len: 400, seed: 1, oy: 24, nails: false, seam: '#c4ccc8' }), 4, 12, 24, 14);
    g.R('rgba(40,60,50,0.15)', 24, 12, 4, 14);
    g.R('rgba(30,50,40,0.25)', 4, 12, 24, 1);
    // cửa xanh xám
    g.R(OUT, 6, 16, 8, 10);
    g.R(woodV(['#3e5a4c', '#4a6a5a', '#5a7a6a', '#7a9a8a'], { bw: 4, len: 40, seed: 2 }), 7, 17, 6, 9);
    g.R('#7a9a8a', 7, 17, 0.5, 9); g.R('#3e5a4c', 12.5, 17, 0.5, 9);
    g.R(OUT, 8, 18, 4, 2.5); g.R(glass(17, 37, 7, 4), 8.5, 18.5, 3, 1.5);
    g.R('#d19a1c', 11, 21, 1, 1); g.R('#f7d547', 11, 21, 0.5, 0.5);
    // bảng chữ thập xanh
    g.R(OUT, 17, 14, 9, 9); g.R('#ffffff', 18, 15, 7, 7); g.R('#dfe8e4', 24.5, 15, 0.5, 7); g.R('#dfe8e4', 18, 21.5, 7, 0.5);
    g.R('#2f9a4a', 20, 16, 3, 5); g.R('#2f9a4a', 19, 17, 5, 3);
    g.R('#5fd07a', 20, 16, 1, 0.5); g.R('#5fd07a', 19, 17, 1, 0.5); g.R('#1e7a3a', 22.5, 17, 0.5, 4); g.R('#1e7a3a', 20, 20.5, 2.5, 0.5); g.R('#1e7a3a', 23, 19.5, 1, 0.5);
    roofTiles(g, 2, 12, 12, 19, 0, 31, ['#1e5a34', '#2f7a4a', '#4aa060', '#7ad08a'], { band: 3, seed: 5 });
    g.R('#e8f8ec', 13, 6, 6, 1); g.R('#2f9a4a', 15.5, 6, 1, 1);
  });
}
// Chuồng chó 3 cấp (SPR3.doghouse)
function doghouseT(t) {
  if (t === 0) return draw2(22, 20, g => {
    g.shadow(11, 18, 10, 2);
    planks(g, 2, 8, 18, 11, WOOD, 3, 2);
    doorHole(g, 7, 11, 8, 8);
    g.R('#3a2414', 8, 17, 6, 1); g.R(THATCH[2], 8.5, 17, 3, 0.5);   // ít rơm lót
    trapFill(g, 1, 8, 11, 11, 4, 18, woodH(WOOD, { bh: 4, len: 18, seed: 4, oy: 2 }));
    g.R(OUT, 0, 9, 22, 1); g.R(WOOD[0], 1, 9, 20, 0.5);
    g.R(WOOD[3], 10.5, 1, 1, 0.5);
  });
  if (t === 1) return draw2(24, 22, g => {
    g.shadow(12, 20, 11, 2);
    planks(g, 2, 9, 20, 12, ['#8a6a3a', '#b08a52', '#d0aa6a', '#f0d090'], 3, 3);
    doorHole(g, 8, 12, 8, 9);
    g.R('#3a2414', 9, 19, 6, 1); g.R(THATCH[2], 9.5, 19, 3, 0.5);
    roofTiles(g, 1, 8, 11, 12, 4, 19, TILE, { band: 2, seed: 2, Tw: 6 });
    g.R(OUT, 0, 10, 24, 1); g.R(TILE[0], 1, 9, 22, 1); g.R(TILE[1], 1, 9, 22, 0.5);
    // bảng tên hình xương
    g.R(OUT, 9, 10, 6, 3); g.R('#fff8ea', 10, 11, 4, 1); g.R('#fff8ea', 9, 11, 1, 1); g.R('#fff8ea', 14, 11, 1, 1);
    g.R('#ffffff', 10, 11, 2, 0.5); g.R('#d8ccb0', 10, 11.5, 4, 0.5);
  });
  return draw2(30, 26, g => {
    g.shadow(14, 24, 13, 2);
    planks(g, 3, 11, 22, 13, ['#2e4a6e', '#3e6a9a', '#5a8ac4', '#8ab4e6'], 3, 4);
    doorHole(g, 9, 14, 10, 10);
    g.ell('#c0302a', 14, 22, 3.6, 1); g.ell('#e85a5a', 13, 22, 2.4, 0.6); g.R('#ff9a8a', 11.5, 21.5, 2, 0.5);   // nệm đỏ
    roofTiles(g, 1, 12, 13, 15, -1, 28, ['#6e2016', '#9e3024', '#c44434', '#e06a52'], { band: 3, seed: 3 });
    // bát ăn + xương đồ chơi
    g.R(OUT, 23, 21, 6, 3); g.R(IRON[3], 24, 21, 4, 1); g.R('#d19a1c', 24, 21, 4, 1); g.R('#f2c040', 24, 21, 2, 0.5); g.R(IRON[2], 24, 22, 4, 1); g.R(IRON[4], 24, 22, 1, 0.5);
    g.R(OUT, 1, 22, 5, 2); g.R('#fff8ea', 2, 22, 3, 1); g.R('#fff8ea', 1, 22, 1, 1); g.R('#fff8ea', 5, 23, 1, 0.5); g.R('#d8ccb0', 2, 22.5, 3, 0.5);
    g.R(OUT, 12, 9, 4, 3); g.R('#f7d547', 13, 10, 2, 1); g.R('#fff6b0', 13, 10, 1, 0.5);
  });
}
// Nhà mèo 3 cấp (SPR3.cathouse)
function cathouseT(t) {
  if (t === 0) return draw2(18, 16, g => {
    g.shadow(9, 14, 8, 2);
    planks(g, 2, 6, 14, 9, WOOD, 3, 5);
    g.ell(OUT, 9, 12, 3.2, 3.2); g.ell('#2a1a0e', 9, 12, 2.4, 2.4); g.ell('#1a0e06', 9, 11.5, 2, 1.6);
    trapFill(g, 1, 5, 9, 9, 5, 13, woodH(WOOD, { bh: 4, len: 14, seed: 6, oy: 2 }));
    g.R(OUT, 0, 6, 18, 1); g.R(WOOD[3], 8.5, 1, 1, 0.5);
    g.R(OUT, 7, 0, 1, 1.5); g.R(OUT, 10, 0, 1, 1.5); g.R(WOOD[2], 7, 0.5, 0.5, 0.5); g.R(WOOD[2], 10, 0.5, 0.5, 0.5);   // tai mèo gỗ
  });
  if (t === 1) return draw2(20, 18, g => {
    g.shadow(10, 16, 9, 2);
    planks(g, 2, 7, 16, 10, ['#8a6a3a', '#b08a52', '#d0aa6a', '#f0d090'], 3, 6);
    g.ell(OUT, 10, 13, 3.4, 3.4); g.ell('#2a1a0e', 10, 13, 2.6, 2.6); g.ell('#1a0e06', 10, 12.5, 2.2, 1.8);
    g.ell('#c44434', 10, 16, 3.4, 0.9); g.ell('#e06a52', 9, 16, 2.2, 0.5); g.R('#ff9a8a', 8, 15.5, 1.5, 0.5);
    roofTiles(g, 1, 6, 10, 10, 5, 15, TILE, { band: 2, seed: 4, Tw: 6 });
    g.R(OUT, 0, 7, 20, 1); g.R(TILE[0], 1, 6, 18, 1); g.R(TILE[1], 1, 6, 18, 0.5);
    // bảng tên hình cá
    g.R(OUT, 6, 8, 4, 3); g.R('#fff8ea', 7, 9, 2, 1); g.R('#7ab4e6', 7, 9, 1.5, 0.5); g.R(OUT, 7.5, 9, 0.5, 0.5);
  });
  return draw2(24, 20, g => {
    g.shadow(12, 18, 11, 2);
    planks(g, 3, 8, 18, 11, ['#2e5a4a', '#3e8a6a', '#5ab48e', '#8ae0b8'], 3, 7);
    g.ell(OUT, 10, 14, 3.6, 3.6); g.ell('#20140a', 10, 14, 2.8, 2.8); g.ell('#120a04', 10, 13.5, 2.4, 2);
    g.ell('#c44434', 10, 17, 3.6, 1); g.ell('#e06a52', 9, 17, 2.4, 0.6); g.R('#ff9a8a', 7.5, 16.5, 2, 0.5);
    roofTiles(g, 1, 9, 10, 12, -1, 22, ['#6e2016', '#9e3024', '#c44434', '#e06a52'], { band: 3, seed: 5 });
    g.R(OUT, 0, 8, 24, 1);
    // bát sứ + cuộn len
    g.R(OUT, 18, 15, 5, 3); g.R(IRON[3], 19, 15, 3, 1); g.R('#e8e8f0', 19, 16, 3, 1); g.R('#7ab4e6', 19.5, 16.5, 2, 0.5); g.R(IRON[2], 19, 17, 3, 0.5);
    g.ell(OUT, 3, 17, 2.2, 2.2); g.ell('#e85a8a', 3, 17, 1.5, 1.5);
    g.nline('#a83a62', 4, 34, 9, 32); g.nline('#a83a62', 4, 36, 9, 35); g.R('#ffb0c8', 2, 16, 1, 0.5); g.R('#a83a62', 2, 18.5, 3, 0.5);
    g.R(OUT, 9, 6, 4, 3); g.R('#f7d547', 10, 7, 2, 1); g.R('#fff6b0', 10, 7, 1, 0.5);
  });
}
// Cửa mèo trên vách nhà 8x8 (SPR3.catDoor): khung gỗ, nắp lật đỏ, tai mèo
function catDoor() {
  return draw2(8, 8, g => {
    g.R(OUT, 0, 1, 8, 7); g.R(woodH(WOOD, { bh: 4, len: 14, seed: 2 }), 1, 2, 6, 5);
    g.R(WOOD[3], 1, 2, 6, 0.5);
    g.ell(OUT, 4, 4, 2.3, 2.3); g.R('#3a2414', 3, 3, 3, 3); g.R('#8a5a2b', 3, 6, 3, 1);
    g.R('#c44434', 2, 3, 4, 3); g.R('#e06a52', 2, 3, 4, 1); g.R('#ff8a6a', 2.5, 3, 1.5, 0.5); g.R('#9e3024', 2, 5.5, 4, 0.5);
    g.R('#e06a52', 3.5, 4.5, 1, 0.5);
    g.R(OUT, 2, 6, 4, 1);
    g.R(OUT, 3, 1, 1, 1); g.R(OUT, 5, 1, 1, 1);
    g.R(OUT, 1, 0, 1, 1); g.R(OUT, 6, 0, 1, 1); g.R(WOOD[2], 1.5, 0.5, 0.5, 0.5); g.R(WOOD[2], 6, 0.5, 0.5, 0.5);
  });
}

// ======================================================================
// Làng
// ======================================================================

// mái ngói kiểu art2.tileRoof (bờ nóc 2 hàng, diềm 2 hàng, hàng ngói cao 4)
const tileRoof2 = (g, y0, y1, top, bot, rp, seed = 0) => roofTiles(g, y0, y1, top[0], top[1], bot[0], bot[1], rp, { band: 4, ridge: 2, eave: 2, seed, Tw: 8 });
// mái rạ kiểu art2.thatchRoof (bờ nóc buộc lạt, lớp rạ cao 6, tua rạ dưới diềm)
const thatchRoof2 = (g, y0, y1, top, bot, seed = 0) => roofThatch(g, y0, y1, top[0], top[1], bot[0], bot[1], { band: 6, seed, ridge: 3, fringe: 2, ties: 7 });
// tán lá tròn (ánh sáng trên-trái), blobs = [cx, cy, r] toạ độ cũ
function leafBlobs(g, blobs, rp, seed = 0, out = '#163a0e') {
  g.layer(L => {
    const list = [...blobs].sort((a, b) => a[1] - b[1]);
    L.N((X, Y) => {
      let best = -1;
      for (let i = 0; i < list.length; i++) { const [cx, cy, r] = list[i], dx = X / 2 + 0.25 - cx, dy = Y / 2 + 0.25 - cy; if (dx * dx + dy * dy <= r * r) best = i; }
      if (best < 0) return null;
      const [cx, cy, r, own] = list[best], R0 = own || rp, dx = (X / 2 + 0.25 - cx) / r, dy = (Y / 2 + 0.25 - cy) / r;
      const v = -dx * 0.55 - dy * 0.8 - (dx * dx + dy * dy) * 0.3 + (hash(X * 3 + seed, Y * 7 + seed) - 0.5) * 0.55 + 0.3;
      return R0[v > 0.8 ? 4 : v > 0.42 ? 3 : v > -0.05 ? 2 : v > -0.5 ? 1 : 0];
    }, 0, 0, L.P.w, L.P.h);
  }, out);
}
function marketStall() {
  const W = WOOD;
  return draw2(48, 40, g => {
    g.shadow(24, 38, 23, 2);
    // vách sau trong bóng mái
    g.R(woodV(['#2a180e', '#3a2418', '#4a3020', '#5a3c28'], { bw: 12, len: 60, seed: 2, ox: 4 }), 5, 12, 38, 14);
    g.R('rgba(10,5,2,0.4)', 5, 12, 38, 2);
    // dây treo hàng: chuối, ớt, tỏi
    g.line('#c9b88a', 6, 13, 42, 13, 1); g.line('#8a7a56', 6, 13.5, 42, 13.5, 1);
    for (const [bx, by] of [[9, 14], [11, 14], [10, 16], [12, 15]]) {
      g.R(OUT, bx - 0.5, by - 0.5, 2, 3.5); g.R('#f7d547', bx, by, 1, 3); g.R('#fff3a0', bx, by, 0.5, 2); g.R('#c8a020', bx + 0.5, by + 2, 0.5, 1); g.R('#5c8a2a', bx, by + 3, 1, 0.5);
    }
    g.R('#5c8a2a', 10, 13, 2, 1); g.R('#7cae3a', 10, 13, 1, 0.5);
    for (let i = 0; i < 4; i++) { const cx = 36 + i * 1.5, cy = 14 + (i % 2); g.R(OUT, cx - 0.5, cy, 1.5, 4.5); g.R('#9e2416', cx, cy, 1, 4); g.R('#e5452f', cx, cy, 0.5, 3); g.R('#ff8a6a', cx, cy + 0.5, 0.5, 1); g.R('#3d8c2a', cx, cy - 0.5, 1, 0.5); }
    for (const tx of [22, 26]) { g.ell(OUT, tx, 16, 2, 2); g.ell('#f3ead2', tx, 16, 1, 1); g.R('#ffffff', tx - 0.5, 15.5, 0.5, 1); g.R('#d9c9a0', tx + 1, 17, 0.5, 0.5); g.R('#b8a880', tx, 17.5, 1, 0.5); g.R('#c9b88a', tx + 0.5, 13.5, 0.5, 1); }
    // cột tre
    for (const px of [2, 42]) post(g, px, 6, 4, 33, BAMBOO, 7);
    // quầy gỗ
    g.R(OUT, 3, 24, 42, 15);
    g.R(W[3], 4, 25, 40, 2); g.R('#f0c088', 4, 25, 40, 0.5); g.R(W[2], 4, 26.5, 40, 0.5);
    g.R(woodV(W, { bw: 14, len: 80, seed: 3, ox: 8 }), 4, 27, 40, 11);
    g.R(W[1], 4, 31, 40, 1); g.R(W[3], 4, 32, 40, 0.5); g.R(W[2], 4, 32.5, 40, 0.5);
    g.R(W[0], 4, 37, 40, 1);
    g.R('rgba(40,20,8,0.25)', 38, 27, 6, 11);
    // bảng giá phấn
    g.R(OUT, 17, 29, 14, 7); g.R('#2e3a2e', 18, 30, 12, 5); g.R('#3e4a3e', 18, 30, 12, 0.5); g.R(W[2], 17.5, 29.5, 13, 0.5);
    g.R('#e8e8e0', 19, 31, 4, 0.5); g.R('#e8e8e0', 24, 31, 5, 0.5); g.R('#e8e8e0', 19, 33, 3, 0.5); g.R('#f7d547', 25, 33, 3, 0.5);
    g.R('#c8c8c0', 19.5, 31.5, 2, 0.5); g.R('#c8c8c0', 25, 33.5, 2.5, 0.5); g.R('#e8e8e0', 23, 34, 1, 0.5);
    // mẹt rau củ
    const tray = (cx, fill) => {
      g.ell(OUT, cx, 24, 5, 2); g.ell((X, Y) => (((X + Y) % 3) ? '#c9a24a' : '#b08a38'), cx, 24, 4, 1); g.R('#e2c26a', cx - 3, 23, 4, 0.5);
      fill(cx);
    };
    tray(9, cx => { for (const [dx, dy] of [[-2, 21], [1, 21], [-1, 19]]) { g.ell(LEAF[0], cx + dx, dy, 2, 2); g.ell(LEAF[3], cx + dx, dy, 1.2, 1.2); g.R('#a8e070', cx + dx - 1, dy - 1, 1, 0.5); g.R('#e8f8c0', cx + dx, dy, 0.5, 0.5); g.R(LEAF[1], cx + dx + 0.5, dy + 1, 1, 0.5); } });
    tray(19, cx => { for (const [dx, dy] of [[-3, 21], [-1, 22], [1, 21], [3, 22], [0, 20]]) { g.R(OUT, cx + dx - 1, dy - 1, 2, 3); g.R('#f59a23', cx + dx - 0.5, dy - 0.5, 1, 2.5); g.R('#ffbe5a', cx + dx - 0.5, dy - 0.5, 0.5, 1.5); g.R(LEAF[2], cx + dx - 1, dy - 2, 1, 1); g.R(LEAF[4], cx + dx - 1, dy - 2, 0.5, 0.5); } });
    tray(29, cx => { for (const [dx, dy] of [[-2, 22], [1, 22], [3, 21], [-1, 20], [2, 20]]) { g.ell('#7a1a10', cx + dx, dy, 1, 1); g.ell('#e5452f', cx + dx, dy, 0.6, 0.6); g.R('#ffb0a0', cx + dx - 0.5, dy - 0.5, 0.5, 0.5); g.R(LEAF[3], cx + dx, dy - 1, 0.5, 0.5); } });
    tray(39, cx => { g.ell(OUT, cx, 21, 3, 2); g.ell('#e07a10', cx, 21, 2, 1); g.R('#f5b048', cx - 2, 20, 2, 0.5); g.R('#ffd890', cx - 1.5, 20, 1, 0.5); g.R('#b8600f', cx + 1, 21, 1, 1.5); g.R(LEAF[2], cx, 18, 1, 2); g.R(LEAF[4], cx, 18, 0.5, 1); });
    // mái vải sọc đỏ trắng
    g.layer(L => L.N((X, Y) => {
      const px = (X + 0.5) / 2, py = (Y + 0.5) / 2;
      if (py < 1) return null;
      if (py <= 10) {
        const t = (py - 1) / 9, l = 4 - 4 * t, r = 44 + 4 * t;
        if (px < l || px > r) return null;
        const sw = (r - l) / 8, s = Math.floor((px - l) / sw), red = s % 2 === 0, u = (px - l) / sw - s;
        if (py > 9.5) return red ? '#9e3024' : '#c9bc98';
        if (py <= 1.5) return red ? '#ff8a72' : '#ffffff';
        if (u < 0.12) return red ? '#ff7a62' : '#ffffff';
        if (u > 0.88) return red ? '#b8352b' : '#e4d8b8';
        return red ? (py <= 4 ? '#ef6a54' : '#d9483b') : (py <= 4 ? '#ffffff' : '#f3ead2');
      }
      const s = Math.floor(px / 6), k = px - s * 6, red = s % 2 === 0;
      if (py >= 13) {
        const dep = 13 + 2 * Math.sin(Math.PI * Math.min(1, Math.max(0, (k - 0.5) / 5)));
        if (py > dep) return null;
        return py > dep - 0.6 ? (red ? '#9e3024' : '#c9bc98') : red ? '#b8352b' : '#ddd2b4';
      }
      return red ? (py < 10.6 ? '#cc4434' : '#b8352b') : (py < 10.6 ? '#eee4c8' : '#ddd2b4');
    }, 0, 0, L.P.w, L.P.h), OUT, 2);
  });
}
function marketClosed() {
  const W = WOOD;
  return draw2(24, 14, g => {
    g.line('#6b4020', 4, 4, 11, 0); g.line('#8a5a2b', 4, 3.5, 11, -0.5, 1);
    g.line('#6b4020', 19, 4, 12, 0); g.line('#8a5a2b', 19, 3.5, 12, -0.5, 1);
    g.R(OUT, 11, 0, 2, 1); g.R(IRON[3], 11, 0, 1, 1); g.R(IRON[4], 11, 0, 0.5, 0.5);
    g.R(OUT, 0, 4, 24, 10);
    g.R(woodH(W, { bh: 6, len: 30, seed: 4, oy: 10 }), 1, 5, 22, 8);
    g.R(W[3], 1, 5, 22, 0.5);
    for (const [nx, ny] of [[2, 6], [21, 6], [2, 11], [21, 11]]) rivet(g, nx * 2 + 1, ny * 2 + 1, '#3a3a44', '#aeaebe');
    for (const px of [4, 19]) { g.R(IRON[3], px, 4, 1, 1); g.R(IRON[4], px, 4, 0.5, 0.5); }
    // chữ "ĐÓNG" nét phấn trắng mờ
    g.R('#f3ead2', 8, 8, 8, 0.5); g.R('#d8ccb0', 8, 8.5, 8, 0.5);
  });
}
function smithy() {
  const W = WOOD, I = IRON;
  return draw2(56, 48, g => {
    g.shadow(28, 46, 27, 2);
    // nền đá
    g.R(OUT, 1, 42, 54, 5);
    g.R(stones(['#7a7670', '#9a9690', '#b0aca4', '#c2beb6'], '#6a6660', { bh: 6, oy: 86, seed: 6, minW: 10, maxW: 18 }), 2, 43, 52, 3);
    g.R('#c2beb6', 2, 43, 52, 0.5);
    // vách sau tối
    g.R(OUT, 3, 16, 50, 27);
    g.R(woodV(['#2a180e', '#3a2418', '#4a3020', '#5a3c28'], { bw: 12, len: 80, seed: 4, ox: 6 }), 4, 17, 48, 26);
    g.ell('rgba(255,140,40,0.16)', 15, 32, 14, 10);
    g.ell('rgba(255,170,60,0.14)', 15, 33, 9, 7);
    // dụng cụ treo
    g.R('#3a2418', 26, 21, 22, 1); g.R('#5a3c28', 26, 21, 22, 0.5);
    g.R(OUT, 28, 21, 2, 9); g.R(W[2], 28.5, 22, 1, 7.5); g.R(W[3], 28.5, 22, 0.5, 7.5);   // búa
    g.R(OUT, 26, 22, 6, 4); g.R(I[3], 26.5, 22.5, 5, 3); g.R(I[4], 26.5, 22.5, 5, 0.5); g.R(I[2], 26.5, 24.5, 5, 1); g.R(I[1], 31, 22.5, 0.5, 3);
    g.line(OUT, 35, 22, 33, 30); g.line(OUT, 36, 22, 38, 30); g.line(I[2], 35, 23, 33.5, 29, 1); g.line(I[2], 36.5, 23, 38, 29, 1);   // kìm
    g.R(I[3], 35, 22, 2, 2); g.R(I[4], 35, 22, 1, 0.5);
    g.R(OUT, 42, 23, 5, 5); g.R(I[2], 42.5, 23.5, 4, 4); g.R(I[3], 42.5, 23.5, 4, 0.5); g.R('#3a2418', 43.5, 24.5, 2, 3.5);   // móng ngựa
    g.line(I[3], 47, 22, 49, 24, 1); g.line(I[3], 49, 24, 48, 27, 1); g.line(I[4], 47.5, 22, 49, 23.5, 1); g.R(W[2], 47, 27, 1, 2); g.R(W[3], 47, 27, 0.5, 2);   // liềm
    // lò rèn gạch
    g.R(OUT, 5, 24, 20, 19);
    g.R(bricks(BRICK, '#8a7060', { bw: 12, bh: 6, ox: 2, oy: 50, seed: 3 }), 6, 25, 18, 17);
    g.R(BRICK[3], 6, 25, 18, 0.5);
    g.R(OUT, 8, 29, 14, 9);
    g.R((X, Y) => {
      const lx = X - 18, ly = Y - 60, hgt = 6 + Math.round(hash(lx >> 1, 7) * 6);
      if (ly >= 14 - hgt) { const t = (ly - (14 - hgt)) / hgt; return t < 0.25 ? '#e5452f' : t < 0.55 ? '#f59a23' : t < 0.85 ? '#f7d547' : '#fff3c0'; }
      return ly < 3 ? '#120a06' : '#1a0e08';
    }, 9, 30, 12, 7);
    g.R('#2a1a10', 9, 36, 12, 1);
    for (const cx of [10, 13, 16, 19]) { g.R('#e5452f', cx, 36, 1, 1); g.R('#ffbe5a', cx, 36, 0.5, 0.5); }
    // chụp hút khói
    g.R(OUT, 7, 18, 16, 7); g.R('#6a6a76', 8, 19, 14, 5); g.R('#8a8a98', 8, 19, 14, 1); g.R('#a8a8b6', 8, 19, 14, 0.5); g.R(I[1], 8, 23, 14, 1);
    for (let X = 18; X < 44; X += 6) { g.N(I[1], X, 40, 1, 6); g.N('#8a8a98', X + 1, 40, 1, 6); }
    // ống bễ
    g.R(OUT, 24, 33, 5, 6); g.R('#8a5a2b', 25, 34, 3, 4); g.R('#a8703e', 25, 34, 3, 0.5); g.R('#5c3a1a', 25, 36, 3, 1); g.R('#5c3a1a', 25, 35, 3, 0.5);
    // đe trên gốc gỗ
    g.R(OUT, 32, 37, 11, 8); g.R(woodV(W, { bw: 4, len: 30, seed: 2 }), 33, 38, 9, 6); g.R(W[3], 33, 38, 9, 0.5); g.R(W[1], 40, 38, 2, 6);
    g.ell('#c88e52', 37.5, 38.2, 3.5, 0.4);
    g.layer(L => {
      L.R(I[4], 29, 30, 13, 1); L.R(I[3], 27, 31, 15, 1); L.R(I[3], 28, 31, 13, 0.5);
      L.R(I[2], 31, 32, 10, 1); L.R(I[2], 34, 33, 4, 2); L.R(I[1], 37, 33, 1, 2);
      L.R(I[3], 33, 35, 6, 1); L.R(I[2], 32, 36, 8, 1); L.R(I[1], 38, 35, 1, 2); L.R(I[1], 41, 30, 0.5, 2);
    });
    g.R('#ffffff', 33, 30, 1, 0.5); g.R('#f59a23', 40, 30, 2, 0.5); g.R('#ffbe5a', 40, 29.5, 1.5, 0.5);
    // thùng nước tôi thép
    g.R(OUT, 45, 34, 9, 11); g.R(woodV(W, { bw: 4, len: 40, seed: 5 }), 46, 35, 7, 9); g.R(W[3], 46, 35, 0.5, 9); g.R(W[1], 51, 35, 2, 9);
    for (const by of [37, 42]) { g.R(I[1], 46, by, 7, 1); g.R(I[3], 46, by, 7, 0.5); }
    g.R('#1f6fd1', 46, 35, 7, 1); g.R('#8fd3ff', 47, 35, 2, 0.5); g.R('#5fb8ff', 49.5, 35.5, 2, 0.5);
    // cột
    for (const px of [2, 50]) post(g, px, 14, 4, 30, W);
    // mái ngói nâu + ống khói gạch
    tileRoof2(g, 5, 18, [6, 49], [0, 55], ['#5e2a1a', '#86402a', '#a85a3c', '#c87a5a'], 1);
    g.R(OUT, 10, 2, 7, 10);
    g.R(bricks(BRICK, '#8a7060', { bw: 6, bh: 5, oy: 4, seed: 9 }), 11, 2, 5, 9);
    g.R(BRICK[3], 11, 2, 0.5, 9); g.R(BRICK[0], 15.5, 2, 0.5, 9);
    g.R(OUT, 9, 1, 9, 3); g.R('#8a7060', 10, 2, 7, 1); g.R('#a89080', 10, 2, 7, 0.5); g.R('#24140a', 11, 1, 5, 1);
    g.R(OUT, 10, 11, 7, 1);
    for (const [sx, sy, a] of [[18, 0, 0.6], [20, 1, 0.5], [19, 2, 0.4], [22, 0, 0.35], [21, 0.5, 0.3]]) g.R(`rgba(230,230,230,${a})`, sx, sy, 1.5, 1);
    // biển hiệu hình đe
    g.R('#3a2418', 26, 18, 1, 2); g.R('#3a2418', 31, 18, 1, 2);
    g.R(OUT, 24, 19, 10, 6); g.R(woodH(['#b07a45', '#c98c4a', '#e0a868', '#f0c088'], { bh: 4, len: 30, seed: 6, nails: false }), 25, 20, 8, 4); g.R(W[2], 25, 23, 8, 1);
    g.R('#3a3a44', 26, 21, 6, 1); g.R('#5a5a66', 26, 21, 6, 0.5); g.R('#3a3a44', 28, 22, 2, 1); g.R('#3a3a44', 27, 23, 4, 0.5);
  });
}
function villageHouseA() {
  return draw2(48, 48, g => {
    g.shadow(24, 46, 23, 2);
    g.R(OUT, 4, 20, 40, 26);
    g.R(plaster(['#c09a6a', '#d0ae80', '#d8b98a', '#ecd6ae'], { seed: 5 }), 5, 21, 38, 21);
    g.R((X, Y) => (hash(X, Y) < 0.3 ? '#9a7a52' : '#a8885e'), 5, 42, 38, 3);
    g.R('#8a6a42', 5, 42, 38, 0.5);
    for (const px of [5, 41]) post(g, px - 0.5, 21, 2.5, 24.5, WOOD);
    g.R('rgba(60,30,10,0.35)', 5, 21, 38, 2); g.R('rgba(60,30,10,0.2)', 5, 23, 38, 2);
    // cửa ván
    g.R(OUT, 19, 27, 11, 18);
    g.R(woodV(['#4a2c14', '#5c3a1a', '#8a5a30', '#a06a3a'], { bw: 6, len: 60, seed: 3, ox: 40 }), 20, 28, 9, 17);
    g.R('#5c3a1a', 20, 32, 9, 1); g.R('#a06a3a', 20, 32, 9, 0.5); g.R('#5c3a1a', 20, 40, 9, 1); g.R('#a06a3a', 20, 40, 9, 0.5);
    g.R(WOOD[2], 18, 26, 13, 2); g.R(WOOD[3], 18, 26, 13, 0.5); g.R(WOOD[1], 18, 27.5, 13, 0.5);
    g.R('#d19a1c', 27, 36, 1, 1); g.R('#f7d547', 27, 36, 0.5, 0.5);
    // cửa sổ song gỗ
    g.R(OUT, 8, 28, 9, 8); g.R('#24160c', 9, 29, 7, 6); g.R('#3a2414', 9, 33, 7, 2);
    for (const px of [10, 12, 14]) { g.R(WOOD[2], px, 29, 1, 6); g.R(WOOD[3], px, 29, 0.5, 6); }
    g.R(WOOD[3], 7, 35, 11, 1); g.R('#f0c088', 7, 35, 11, 0.5); g.R(WOOD[1], 7, 36, 11, 1);
    // lu nước + gáo dừa
    g.ell(OUT, 37, 40, 5, 5);
    g.ell((X, Y, dx, dy) => { const v = -dx * 0.6 - dy * 0.5; return v > 0.55 ? '#d08a5a' : v > 0.15 ? '#b06a40' : v > -0.35 ? '#8a4a2a' : '#6a3418'; }, 37, 40, 4, 4);
    g.R('#e8b080', 34, 38, 0.5, 2); g.R('#6a3418', 34, 42.5, 6, 0.5);
    g.R(OUT, 34, 34, 7, 2); g.R('#24160c', 35, 35, 5, 1); g.R('#a8603a', 35, 34, 5, 1); g.R('#c88050', 35, 34, 5, 0.5);
    g.R('#1f4f8a', 35.5, 35, 4, 0.5);
    g.R(OUT, 40, 32.5, 1.5, 3.5); g.R('#c9a24a', 40, 33, 1, 3); g.R('#e2c26a', 40, 33, 0.5, 2);
    thatchRoof2(g, 2, 23, [10, 37], [0, 47], 3);
    // bậc thềm
    g.R(OUT, 3, 44, 42, 3);
    g.R(stones(['#86827a', '#a8a49c', '#bab6ae', '#cac6be'], '#7a766e', { bh: 6, oy: 88, seed: 2, minW: 12, maxW: 22 }), 4, 44, 40, 2);
    g.R('#cac6be', 4, 44, 40, 0.5);
  });
}
function villageHouseB() {
  return draw2(48, 48, g => {
    g.shadow(24, 46, 23, 2);
    g.R(OUT, 3, 19, 42, 27);
    g.R(plaster(['#e2c370', '#ecd07c', '#f2d98a', '#fff0b8'], { seed: 8 }), 4, 20, 40, 22);
    g.R((X, Y) => (Y === 84 ? '#8a8478' : hash(X, Y) < 0.2 ? '#98928a' : '#a8a296'), 4, 42, 40, 3);
    g.R('rgba(90,50,10,0.3)', 4, 20, 40, 2); g.R('rgba(90,50,10,0.16)', 4, 22, 40, 1);
    g.R('#fbe6a0', 4, 23, 0.5, 19);
    // cửa đôi xanh
    g.R(OUT, 18, 26, 13, 19);
    for (const dx of [19, 25]) {
      g.R(woodV(['#2e5e78', '#3a7090', '#3f7fa0', '#5aa0c0'], { bw: 5, len: 60, seed: dx }), dx, 27, 5, 18);
      g.R('#5aa0c0', dx, 27, 0.5, 18); g.R('#2e5e78', dx + 4.5, 27, 0.5, 18);
      for (const py of [29, 37]) { g.R('#2e5e78', dx + 1, py, 3, 5); g.R('#4a90b0', dx + 1.5, py + 0.5, 2.5, 4.5); g.R('#6ab0d0', dx + 1.5, py + 0.5, 2.5, 0.5); g.R('#3a7090', dx + 3.5, py + 1, 0.5, 4); }
    }
    g.R(OUT, 24, 27, 1, 18);
    for (const kx of [23, 26]) { g.R('#d19a1c', kx, 35, 1, 1); g.R('#f7d547', kx, 35, 0.5, 0.5); }
    // cửa sổ có chớp + bồn hoa
    for (const wx of [7, 34]) {
      g.R(OUT, wx, 27, 8, 8);
      g.R(glass(wx * 2 + 2, 56, 12, 12), wx + 1, 28, 6, 6);
      g.R(OUT, wx + 3.5, 28, 1, 6); g.R(OUT, wx + 1, 30.5, 6, 0.5); g.R(WOOD[3], wx + 1, 28, 6, 0.5);
      for (const sx of [wx - 3, wx + 8]) {
        g.R(OUT, sx, 27, 3, 8); g.R('#4f8f6a', sx + 0.5, 27.5, 2, 7); g.R('#6fb08a', sx + 0.5, 27.5, 2, 0.5);
        for (let i = 0; i < 6; i++) g.R('#3a7050', sx + 0.5, 28.5 + i, 2, 0.5);
      }
      g.R(OUT, wx - 1, 35, 10, 3); g.R('#c0603e', wx - 0.5, 35.5, 9, 2); g.R('#e08a62', wx - 0.5, 35.5, 9, 0.5); g.R('#8e4028', wx - 0.5, 37, 9, 0.5);
      g.R(LEAF[2], wx, 34, 8, 1); g.R(LEAF[3], wx, 34, 8, 0.5);
      for (const [fx, col] of [[0, '#e5452f'], [2, '#ff8fb1'], [4, '#f7d547'], [6, '#ffffff']]) flower(g, (wx + fx) * 2 + 2 + (fx % 4 ? 1 : 0), 66, col, col === '#f7d547' ? '#e5452f' : '#f7d547');
    }
    tileRoof2(g, 1, 21, [8, 39], [0, 47], TILE, 0);
    for (const [ex, d] of [[7, -1], [40, 1]]) { g.R(OUT, ex, 0, 2, 2); g.R('#c44434', ex + (d < 0 ? 1 : 0), 0, 1, 1); g.R('#e06a52', ex + (d < 0 ? 1 : 0), 0, 0.5, 0.5); }
    g.R(OUT, 2, 44, 44, 3);
    g.R(stones(['#86827a', '#a8a49c', '#bab6ae', '#cac6be'], '#7a766e', { bh: 6, oy: 88, seed: 5, minW: 12, maxW: 22 }), 3, 44, 42, 2);
    g.R('#cac6be', 3, 44, 42, 0.5);
    g.R(OUT, 16, 43, 17, 1); g.R('#cac6be', 17, 43.5, 15, 0.5);
  });
}
function friendGate() {
  const W = WOOD;
  return draw2(40, 36, g => {
    for (const cx of [6, 33]) g.shadow(cx, 34, 5, 1.4);
    for (const px of [3, 31]) {
      post(g, px, 8, 6, 26, W);
      g.R(OUT, px - 1, 30, 8, 6);
      g.R(stones(['#86827a', '#a8a49c', '#bab6ae', '#cac6be'], '#7a766e', { bh: 4, oy: 62, seed: px, minW: 5, maxW: 9 }), px, 31, 6, 4);
      g.R('#cac6be', px, 31, 6, 0.5); g.R('#86827a', px + 5, 31, 1, 4);
    }
    g.R(OUT, 0, 7, 40, 5);
    g.R(woodH(W, { bh: 6, len: 40, seed: 3, oy: 16 }), 1, 8, 38, 3);
    g.R(W[3], 1, 8, 38, 0.5); g.R(W[1], 1, 10, 38, 1); g.R(W[0], 1, 10.5, 38, 0.5);
    g.R(W[0], 1, 8, 1, 3); g.R(W[0], 38, 8, 1, 3);
    tileRoof2(g, 1, 7, [5, 34], [0, 39], TILE, 2);
    for (const [ex, d] of [[0, 1], [39, -1]]) { g.R(OUT, ex, 3, 1, 4); g.R(OUT, ex + d, 2, 1, 1); g.R('#e06a52', ex, 4, 1, 2); g.R('#ff9a7a', ex + (d > 0 ? 0 : 0.5), 4, 0.5, 1); }
    // dây treo + biển
    g.R('#3a2418', 14, 12, 1, 2); g.R('#3a2418', 25, 12, 1, 2); g.R('#5a3c28', 14, 12, 0.5, 2); g.R('#5a3c28', 25, 12, 0.5, 2);
    g.R(OUT, 11, 13, 18, 10);
    g.R(woodH([W[2], '#c98c4a', W[3], '#f0c088'], { bh: 5, len: 60, seed: 9, oy: 28, nails: false }), 12, 14, 16, 8);
    g.R('#f0c088', 12, 14, 16, 0.5); g.R(W[2], 12, 21, 16, 1); g.R(W[2], 27, 14, 1, 8);
    g.R('#c89058', 14, 16, 4, 0.5); g.R('#c89058', 21, 19, 5, 0.5);
    for (const [nx, ny] of [[12.5, 14.5], [26.5, 14.5]]) rivet(g, nx * 2 + 1, ny * 2 + 1, '#5c3a1a', '#f0c088');
  });
}
function homeGate() {
  return draw2(40, 36, g => {
    for (const cx of [6, 33]) g.shadow(cx, 34, 5, 1.4);
    for (const px of [4, 31]) post(g, px, 6, 5, 29, BAMBOO, 6);
    g.R(OUT, 2, 8, 36, 4); g.R(BAMBOO[2], 3, 9, 34, 2); g.R(BAMBOO[3], 3, 9, 34, 0.5); g.R(BAMBOO[1], 3, 10.5, 34, 0.5);
    for (const px of [12, 20, 28]) { g.R(BAMBOO[0], px, 9, 0.5, 2); g.R(BAMBOO[3], px + 0.5, 9, 0.5, 2); }
    for (const px of [5, 32]) { g.R('#8a5a2b', px, 8.5, 3, 0.5); g.R('#8a5a2b', px, 11, 3, 0.5); }   // dây buộc
    // giàn hoa giấy
    const PINK = ['#7a1648', '#b82a6e', '#e04a90', '#f47ab4', '#ffc0dc'];
    g.layer(L => {
      leafBlobs(L, [[4, 7, 4.5], [10, 4.5, 5], [17, 3.5, 4.6], [24, 3.5, 4.6], [31, 4.5, 5], [36, 7, 4.5], [5, 13, 3.4], [35, 14, 3.6], [6, 18, 2.4], [34, 19, 2.6]], LEAF, 9, '#00000000');
      const fl = [[3, 5, 2.4], [9, 3, 2.6], [14, 5.5, 2.2], [20, 2.5, 2.6], [26, 4.5, 2.4], [32, 2.5, 2.4], [37, 6, 2.4], [6, 11, 2], [34, 12, 2.2], [4, 16, 1.7], [36, 17, 1.6], [12, 8, 1.5], [29, 8, 1.6]];
      leafBlobs(L, fl, PINK, 4, '#00000000');
      // cánh hoa nhỏ rời
      for (let i = 0; i < 40; i++) { const X = Math.floor(hash(i, 5) * 80), Y = Math.floor(hash(i, 9) * 40); if (L.P.alpha(X, Y) > 200) L.N(hash(i, 2) < 0.5 ? PINK[4] : PINK[3], X, Y); }
    }, '#2a1420');
    // biển mầm cây
    g.R('#5c3a1a', 16, 12, 1, 2); g.R('#5c3a1a', 23, 12, 1, 2);
    g.R(OUT, 14, 13, 12, 8);
    g.R(woodH([WOOD[2], '#c98c4a', WOOD[3], '#f0c088'], { bh: 5, len: 40, seed: 3, oy: 28, nails: false }), 15, 14, 10, 6); g.R(WOOD[2], 15, 19, 10, 1); g.R('#f0c088', 15, 14, 10, 0.5);
    g.R(LEAF[2], 19.5, 16, 1, 3); g.R(LEAF[3], 17, 15, 2, 1.5); g.R(LEAF[3], 21, 15, 2, 1); g.R(LEAF[4], 17, 15, 1, 0.5); g.R(LEAF[1], 18, 16, 1, 0.5); g.R(LEAF[1], 22, 15.5, 1, 0.5);
    g.R('#8a5a2b', 18.5, 18.5, 3, 0.5);
    for (const px of [3, 9, 30, 36]) { g.R(LEAF[2], px, 33, 0.5, 2); g.R(LEAF[3], px + 0.5, 32, 0.5, 3); g.R(LEAF[4], px + 1, 32.5, 0.5, 2); g.R(LEAF[2], px + 1.5, 33.5, 0.5, 1.5); }
  });
}
function vetClinic() {
  return draw2(48, 40, g => {
    g.shadow(24, 38, 23, 2);
    g.R(OUT, 3, 17, 42, 21);
    g.R(woodH(['#c8d4d0', '#dfe8e4', '#eef4f2', '#ffffff'], { bh: 6, len: 400, seed: 2, oy: 36, nails: false, seam: '#d4dcd8' }), 4, 18, 40, 13);
    g.R(stones(['#94a09c', '#a8b4b0', '#b8c4c0', '#c4d0cc'], '#8a9692', { bh: 4, oy: 62, seed: 4, minW: 8, maxW: 14 }), 4, 31, 40, 7);
    g.R('#c4d0cc', 4, 31, 40, 0.5);
    g.R('rgba(30,50,40,0.15)', 38, 18, 6, 20);
    // cửa kính
    g.R(OUT, 19, 24, 11, 14);
    g.R(glass(40, 50, 18, 24), 20, 25, 9, 12);
    g.R(OUT, 24, 25, 1, 12); g.R(IRON[3], 24.5, 25, 0.5, 12);
    g.R('#f7d547', 23, 31, 1, 1); g.R('#f7d547', 25, 31, 1, 1); g.R('#fff6b0', 23, 31, 0.5, 0.5);
    g.R('#e8f0f0', 20, 33, 9, 0.5);   // vạch dán kính
    // cửa sổ có rèm
    for (const wx of [6, 34]) {
      g.R(OUT, wx, 22, 9, 8);
      g.R(glass(wx * 2 + 2, 46, 14, 12), wx + 1, 23, 7, 6);
      for (const [cx, cw] of [[wx + 1, 2], [wx + 6, 1]]) { g.R('#ffffff', cx, 23, cw, 6); g.R('#dfe8ec', cx + cw - 0.5, 23, 0.5, 6); for (let i = 0; i < 3; i++) g.R('#e8eef2', cx + 0.5, 24 + i * 2, 0.5, 1); }
      g.R('#5fd07a', wx, 30, 9, 1); g.R('#8ae0a0', wx, 30, 9, 0.5); g.R(OUT, wx, 31, 9, 0.5);
    }
    // mái hiên sọc xanh trắng
    for (let i = 0; i < 44; i++) { g.R(OUT, 2 + i, 15, 1, 5); }
    g.R((X, Y) => { const s = ((X - 4) >> 3) % 2, top = Y < 34; return s ? (top ? '#ffffff' : '#e8eee8') : (top ? '#3fae5a' : '#2f9a4a'); }, 2, 16, 44, 3);
    g.R('rgba(0,0,0,0.12)', 2, 18.5, 44, 0.5);
    for (let i = 0; i < 44; i += 4) { g.R(OUT, 2 + i, 19, 4, 1); g.clear(3 + i, 20, 2, 1); g.R((i >> 2) % 2 ? '#e8eee8' : '#1e7a3a', 3 + i, 19, 2, 1); g.R(OUT, 3 + i, 20, 2, 0.5); }
    roofTiles(g, 2, 15, 8, 39, 0, 47, ['#1e5a34', '#2f7a4a', '#4aa060', '#7ad08a'], { band: 3, seed: 7 });
    // bảng chữ thập lớn
    g.R(OUT, 18, 3, 12, 12); g.R('#ffffff', 19, 4, 10, 10); g.R('#dfe8e4', 28.5, 4, 0.5, 10); g.R('#dfe8e4', 19, 13.5, 10, 0.5);
    g.R('#2f9a4a', 22, 5, 4, 8); g.R('#2f9a4a', 20, 7, 8, 4);
    g.R('#5fd07a', 22, 5, 1, 2); g.R('#5fd07a', 20, 7, 2, 1); g.R('#8ae0a0', 22, 5, 0.5, 1.5);
    g.R('#1e7a3a', 25, 10, 1, 3); g.R('#1e7a3a', 27.5, 7, 0.5, 4); g.R('#1e7a3a', 26, 10.5, 2, 0.5);
    // chậu cây hai bên cửa
    for (const px of [15, 31]) {
      g.R(OUT, px, 33, 4, 5); g.R('#b4583a', px + 0.5, 34, 3, 3.5); g.R('#d0805a', px + 0.5, 34, 1, 3.5); g.R('#8e4028', px + 3, 34, 0.5, 3.5);
      g.R(OUT, px - 0.5, 33, 5, 1); g.R('#c0603e', px, 33, 4, 0.5);
      g.ell(LEAF[2], px + 2, 31.5, 2, 1.6); g.ell(LEAF[3], px + 1.5, 31, 1.2, 1); g.R(LEAF[4], px + 1, 30.5, 1, 0.5);
      flower(g, px * 2 + 6, 62, '#ff8fb1');
    }
  });
}
function lampPost() {
  const I = IRON;
  return draw2(12, 30, g => {
    g.shadow(6, 29, 4, 1);
    post(g, 4, 9, 4, 19, ['#2e2e36', '#3a3a44', '#5a5a66', '#8a8a98']);
    g.R('#2e2e36', 4.5, 14, 3, 0.5); g.R('#8a8a98', 4.5, 14.5, 3, 0.5);
    g.R(OUT, 2, 26, 8, 4);
    g.R(stones(['#7a766e', '#8a8478', '#9a948a', '#aaa498'], '#6a665e', { bh: 4, oy: 54, seed: 1, minW: 5, maxW: 8 }), 3, 27, 6, 2);
    g.R('#aaa498', 3, 27, 6, 0.5);
    // đèn lồng kính
    g.R(OUT, 1, 2, 10, 8);
    g.R('#ffe9a0', 2, 3, 8, 6); g.R('#fff8d8', 3, 3, 2, 3); g.R('#ffffff', 3, 3, 1, 1.5); g.R('#f7c843', 7, 4, 2, 5); g.R('#e8a830', 8.5, 4, 0.5, 5);
    g.R(OUT, 5, 2, 2, 8); g.R(I[2], 5.5, 2, 1, 8);
    g.R('#f59a23', 5, 6, 2, 2); g.R('#fff3a0', 5.5, 6, 1, 1);
    // nắp
    g.R(OUT, 0, 0, 12, 3); g.R(I[2], 1, 1, 10, 1); g.R(I[3], 1, 1, 4, 0.5); g.R(I[1], 1, 2, 10, 0.5);
    g.R(OUT, 5, 0, 2, 1); g.R(I[3], 5.5, 0, 1, 0.5);
    g.R(OUT, 2, 9, 8, 2); g.R(I[2], 3, 9, 6, 1); g.R(I[3], 3, 9, 6, 0.5);
    g.R('rgba(255,230,140,0.25)', 0, 3, 1, 6); g.R('rgba(255,230,140,0.25)', 11, 3, 1, 6);
  });
}
function benchStone() {
  return draw2(24, 14, g => {
    g.shadow(12, 12, 11, 1.6);
    for (const px of [2, 17]) { g.R(OUT, px, 6, 5, 7); g.R(stones(['#86827a', '#a8a49c', '#bab6ae', '#cac6be'], '#7a766e', { bh: 5, oy: 14, seed: px, minW: 4, maxW: 7 }), px + 1, 7, 3, 5); g.R('#cac6be', px + 1, 7, 1, 5); g.R('#86827a', px + 3, 7, 1, 5); }
    g.R(OUT, 0, 1, 24, 8);
    g.R((X, Y) => {
      const v = Y - 4, n = hash(X + 2, Y + 7);
      if (v >= 8) return v >= 10 ? '#9a968e' : '#b4b0a8';
      if (v === 0) return '#f8f6f0';
      if (n < 0.1) return '#b4b0a8'; if (n < 0.2) return '#cac6be';
      if (n > 0.93) return '#ffffff';
      return v < 3 ? '#f2efe8' : '#e2ded6';
    }, 1, 2, 22, 6);
    for (const [cx, cy] of [[6, 4], [15, 3], [19, 5]]) { g.R('#b4b0a8', cx, cy, 1.5, 0.5); g.R('#cac6be', cx + 1.5, cy + 0.5, 0.5, 0.5); }   // vân đá
  });
}
// Hộp quà (SPR2.giftBox / giftBoxFull / giftBoxOpen) và sổ lưu bút (SPR2.guestBook / guestBookOpen)
const RIB = ['#9e2416', '#e5452f', '#ff9a7a'];
function giftBody(g) {
  const W = WOOD;
  g.shadow(8, 18, 7, 2);
  g.R(OUT, 2, 8, 12, 10);
  g.R(woodV(W, { bw: 5, len: 30, seed: 3, ox: 6 }), 3, 9, 10, 8);
  g.R(W[2], 3, 9, 0.5, 8); g.R(W[3], 3, 9, 10, 0.5); g.R(W[0], 12.5, 9, 0.5, 8); g.R(W[0], 3, 16.5, 10, 0.5);
  g.R(RIB[0], 7, 9, 3, 8); g.R(RIB[1], 7, 9, 2, 8); g.R(RIB[2], 7, 9, 0.5, 8); g.R(RIB[0], 9.5, 9, 0.5, 8);
}
function giftLid(g, y) {
  const W = WOOD;
  g.R(OUT, 1, y, 14, 4);
  g.R(W[2], 2, y + 1, 12, 2); g.R(W[3], 2, y + 1, 12, 0.5); g.R(W[1], 2, y + 2, 12, 0.5); g.R(W[0], 2, y + 2.5, 12, 0.5);
  g.R(RIB[0], 7, y + 1, 3, 2); g.R(RIB[1], 7, y + 1, 2, 2); g.R(RIB[2], 7, y + 1, 1, 0.5);
}
function giftBow(g) {
  g.layer(L => {
    L.ell(RIB[1], 4.5, 2, 2.2, 1.6); L.ell(RIB[1], 10.5, 2, 2.2, 1.6);
    L.ell(RIB[2], 4, 1.5, 1, 0.6); L.ell(RIB[2], 10, 1.5, 1, 0.6);
    L.R(RIB[0], 3.5, 3, 2, 0.5); L.R(RIB[0], 10, 3, 2, 0.5);
    L.ell('#7a1a10', 5.5, 2, 0.6, 0.6); L.ell('#7a1a10', 9.5, 2, 0.6, 0.6);
    L.R(RIB[0], 6.5, 3, 3, 1.5); L.R(RIB[1], 7, 3, 2, 1);
    L.R(RIB[0], 6.5, 4.5, 0.5, 1); L.R(RIB[0], 9, 4.5, 0.5, 1);
  });
}
const giftBoxClosed = () => draw2(16, 20, g => { giftBody(g); giftLid(g, 4); giftBow(g); });
const giftBoxFull = () => draw2(16, 20, g => {
  giftBody(g); giftLid(g, 4); giftBow(g);
  g.R(OUT, 0, 12, 6, 6); g.R(RIB[1], 1, 13, 4, 4); g.R(RIB[2], 1, 13, 4, 0.5); g.R(RIB[0], 1, 16.5, 4, 0.5); g.R(RIB[0], 4.5, 13, 0.5, 4);
  g.R('#f2c838', 2, 13, 2, 4); g.R('#fff6a0', 2, 13, 0.5, 4); g.R('#f2c838', 1, 14, 4, 1); g.R('#c89a20', 1, 14.5, 4, 0.5);
  g.R(OUT, 10, 13, 6, 5); g.R(LEAF[2], 11, 14, 4, 3); g.R(LEAF[4], 11, 14, 3, 0.5); g.R(LEAF[1], 11, 16, 4, 1);
  g.R('#f3ead2', 12, 15, 2, 1); g.R('#d8ccb0', 12, 15.5, 2, 0.5);
  for (const [sx, sy] of [[13, 2], [12, 1], [14, 1], [12, 3], [14, 3]]) g.R(sx === 13 ? '#fff6a0' : '#f2c838', sx + 0.25, sy + 0.25, 0.5, 0.5);
  g.R('#ffffff', 13, 2, 0.5, 0.5);
});
const giftBoxOpen = () => draw2(16, 20, g => {
  const W = WOOD;
  giftBody(g);
  g.R(OUT, 1, 1, 14, 5);
  g.R(W[3], 2, 2, 12, 3); g.R('#f0cf9a', 2, 2, 12, 1); g.R('#fff0c8', 2, 2, 12, 0.5); g.R(W[1], 2, 4, 12, 1);
  g.R(RIB[1], 7, 2, 2, 3); g.R(RIB[0], 7, 4, 2, 1); g.R(RIB[2], 7, 2, 0.5, 2);
  g.R(OUT, 2, 6, 12, 6);
  g.R('#2e1a0c', 3, 7, 10, 4); g.R('#1e1008', 3, 7, 10, 1); g.R('#4a2c14', 3, 10, 10, 1);
  g.R(OUT, 3, 5, 5, 5); g.R(RIB[1], 4, 6, 3, 3); g.R(RIB[2], 4, 6, 3, 0.5); g.R('#f2c838', 5, 6, 1, 3); g.R('#fff6a0', 5, 6, 0.5, 1.5);
  g.R(OUT, 8, 6, 5, 5); g.R(LEAF[2], 9, 7, 3, 3); g.R(LEAF[4], 9, 7, 2, 0.5); g.R(LEAF[1], 9, 9.5, 3, 0.5); g.R('#f3ead2', 10, 8, 2, 1);
});
function bookStand(g) {
  const W = WOOD;
  g.shadow(8, 20, 6, 1.8);
  g.R(OUT, 6, 13, 4, 7); g.R(W[1], 7, 14, 2, 5); g.R(W[2], 7, 14, 1, 5); g.R(W[3], 7, 14, 0.5, 5);
  g.R(OUT, 3, 18, 10, 4); g.R(W[1], 4, 19, 8, 2); g.R(W[2], 4, 19, 8, 1); g.R(W[3], 4, 19, 8, 0.5); g.R(W[0], 4, 20.5, 8, 0.5);
  g.R(OUT, 1, 11, 14, 4); g.R(woodH(W, { bh: 4, len: 30, seed: 2, oy: 24, nails: false }), 2, 12, 12, 2); g.R(W[3], 2, 12, 12, 0.5); g.R(W[0], 2, 14, 12, 1);
}
const guestBookClosed = () => draw2(16, 22, g => {
  bookStand(g);
  g.R(OUT, 3, 5, 10, 7);
  g.R((X, Y) => (hash(X, Y) < 0.15 ? '#7a2018' : '#8e2a20'), 4, 6, 8, 5); g.R('#b4463a', 4, 6, 8, 0.5); g.R('#6e1c14', 4, 10, 8, 1);
  g.R('#f3ead2', 11, 6, 1, 5); g.R('#ddd2b0', 11.5, 6, 0.5, 5); g.R('#ddd2b0', 11, 10, 1, 1);
  g.R('#8a6a28', 5, 7, 5, 3); g.R('#c9a24a', 5, 7, 5, 2); g.R('#f2c838', 5, 7, 5, 0.5);
  g.R('#8a6a28', 6, 8, 3, 0.5);   // chữ khắc trên nhãn
  g.R(RIB[0], 9, 11, 1, 3); g.R(RIB[1], 9, 11, 0.5, 2.5); g.R(RIB[0], 9, 13.5, 0.5, 0.5);
});
const guestBookOpen = () => draw2(16, 22, g => {
  bookStand(g);
  g.R(OUT, 0, 4, 16, 9);
  g.R('#f6efd8', 1, 5, 14, 7); g.R('#fffbee', 1, 5, 14, 1); g.R('#ddd2b0', 1, 11, 14, 1);
  g.R('#e8dcbc', 6, 5, 1, 7); g.R('#e8dcbc', 9, 5, 1, 7);
  g.R('#c9b88a', 7, 5, 2, 7); g.R('#8a7a56', 8, 5, 0.5, 7);
  for (const py of [7, 9]) { g.R('#6b5a3a', 2, py, 4, 0.5); g.R('#6b5a3a', 10, py, 4, 0.5); g.R('#9a8a66', 2.5, py + 1, 3, 0.5); g.R('#9a8a66', 10, py + 1, 2.5, 0.5); }
  g.R('#6b5a3a', 2, 11, 3, 0.5);
  g.line(OUT, 11, 8, 14, 2);
  g.line('#f3ead2', 12, 7, 14, 1); g.R('#d8cbaa', 13, 3, 0.5, 0.5); g.R('#d8cbaa', 12, 5, 0.5, 0.5); g.R('#ffffff', 13.5, 1.5, 0.5, 1);
  g.R('#2e1a0c', 11, 8, 1, 1);
});

// ======================================================================
// Hàng rào (fenceTileHD) — vẽ thay fenceTile của art.js ở lưới 2x
// ======================================================================
const FENCE_HD = [
  { ol: OUT, rp: ['#8a5a2b', '#a8703e', '#c98c4a', '#e0a868'], post: ['#6b4020', '#8a5a2b', '#b07a45', '#e0a868'] },
  { ol: OUT, rp: ['#bca888', '#e0c898', '#fff0d0', '#ffffff'], post: ['#a8916a', '#d0b888', '#e0c898', '#ffffff'] },
  { ol: '#1c2a44', rp: ['#3f6898', '#5f88c0', '#9fc0e8', '#d8ecff'], post: ['#2e4e7a', '#4a72a8', '#5f88c0', '#d8ecff'] },
];
const fenceCache = new Map();
function fenceImg(kind, lv, v) {
  const key = kind + lv + v;
  if (fenceCache.has(key)) return fenceCache.get(key);
  const { ol, rp, post: pp } = FENCE_HD[Math.min(3, Math.max(1, lv)) - 1];
  const P = new Pix(32, 32), g = api(P);
  // vân gỗ mảnh chạy theo chiều dài thanh (along = trục dọc thớ)
  const grain = (R4, seed, vertical) => (X, Y) => {
    const a = vertical ? Y : X, b = vertical ? X : Y, n = hash(Math.floor((a + hash(b, seed) * 13) / 6) + seed, b * 3);
    return n < 0.14 ? R4[1] : n > 0.94 ? R4[3] : R4[2];
  };
  const rail = (Y0, H) => {   // thanh ngang: sáng trên, tối dưới, vân dọc thớ
    g.N(ol, 0, Y0, 32, 1); g.N(ol, 0, Y0 + H - 1, 32, 1);
    g.N(grain(rp, v * 7 + Y0, false), 0, Y0 + 1, 32, H - 2);
    g.N(rp[3], 0, Y0 + 1, 32, 1); g.N(rp[1], 0, Y0 + H - 2, 32, 1);
  };
  const vrail = X0 => { g.N(ol, X0, 0, 1, 32); g.N(ol, X0 + 3, 0, 1, 32); g.N(rp[3], X0 + 1, 0, 1, 32); g.N(grain(rp, v * 5 + X0, true), X0 + 2, 0, 1, 32); };
  const postN = (X0, Y0, W, H, top) => {
    g.N(ol, X0, Y0, W, H);
    g.N(grain(pp, v + X0 * 3, !top), X0 + 1, Y0 + 1, W - 2, H - 2);
    g.N(pp[3], X0 + 1, Y0 + 1, 1, H - 2); g.N(pp[1], X0 + W - 2, Y0 + 1, 1, H - 2);
    g.N(pp[3], X0 + 1, Y0 + 1, W - 2, 1);
    if (top) { g.N(pp[1], X0 + 1, Y0 + H - 2, W - 2, 1); return; }
    g.N(pp[2], X0 + 2, Y0 + 2, W - 4, 1); g.nclear(X0, Y0); g.nclear(X0 + W - 1, Y0); g.N(ol, X0 + 1, Y0, W - 2, 1);
  };
  if (kind === 'h') {
    rail(10, 6); rail(20, 6);
    for (const ox of [4, 20]) {
      postN(ox, 2, 8, 30, false);
      for (const ry of [12, 22]) g.N(pp[0], ox + 4, ry + 1);
    }
  } else {
    vrail(10); vrail(18);
    for (const oy of [0, 16]) { postN(10, oy, 12, 14, true); g.N(pp[0], 13, oy + 7); g.N(pp[0], 19, oy + 7); }
  }
  const c = P.toCanvas();
  fenceCache.set(key, c);
  return c;
}
// Cùng chữ ký fenceTile(x, kind, px, py, lv): vẽ một ô hàng rào 16x16 đơn vị thế giới từ ảnh 32x32.
// Dùng trên lớp nền dựng ở R = 2 (ctx đã scale 2) thì mỗi điểm art 2x trùng một điểm canvas.
export function fenceTileHD(x, kind, px, py, lv = 1) {
  const v = Math.floor(hash(Math.floor(px / 16), Math.floor(py / 16) + 7) * 3);
  const prev = x.imageSmoothingEnabled;
  x.imageSmoothingEnabled = false;
  x.drawImage(fenceImg(kind, lv, v), px, py, 16, 16);
  x.imageSmoothingEnabled = prev;
}
export const fenceHDImg = fenceImg;

const VILLAGE = [villageHouseA(), villageHouseB()];

// ======================================================================
// Trong nhà (SPR2): sàn, vách, giường, tủ, bàn, bếp, thảm, cửa sổ, chậu cây, điện thoại, thảm chùi chân
// ======================================================================
// Sàn ván 16x16 lát liền: hàng ván cao 4 điểm cũ, mối nối so le, vân gỗ, mắt gỗ (biến thể 1)
function floorV(v) {
  const tones = ['#a06a3a', '#a8723f', '#94603a', '#9c683a'];
  return draw2(16, 16, g => g.N((X, Y) => {
    const row = Y >> 3, k = Y & 7;
    if (k === 7) return '#4a2c14';
    if (k === 6 && (X & 1)) return '#5c3a1a';
    const off = [6, 22, 14, 28][(row + v * 2) % 4];
    if (X === off) return '#4a2c14';
    const plank = row * 2 + (X > off ? 1 : 0);
    let c = tones[(plank + v * 3) % 4];
    if (X === off + 1) return shade(c, 1.12);
    if (X === off - 1) return shade(c, 0.86);
    if (k === 0) return shade(c, 1.14);
    if (k === 1 && hash(X, row + v * 9) < 0.35) return shade(c, 1.07);
    if (k === 5) c = shade(c, 0.93);
    const n = hash(Math.floor((X + hash(Y, plank + v) * 9) / 5) + plank * 7, Y + v * 5);
    if (n < 0.13) return shade(c, 0.84);
    if (n > 0.93) return shade(c, 1.1);
    if (v === 1 && row === 1) { const d = Math.hypot(X - 11, Y - 11.5); if (d < 1.8) return '#5c3a1a'; if (d < 2.8) return '#7a4a26'; }
    return c;
  }, 0, 0, 32, 32), { post: false });
}
// Vách trong 16x32 lát ngang: vách đất trát vôi vàng, nẹp gỗ, chân tường ván dọc
function wallInner() {
  return draw2(16, 32, g => g.N((X, Y) => {
    const py = Y / 2;
    if (Y <= 1) return Y === 0 ? '#2e1a0c' : '#3b2412';
    if (py < 3) return Y === 2 ? '#8e5a30' : Y === 3 ? '#7a4a22' : '#5c3a1a';
    if (py < 22) {
      if (Y <= 7) return Y === 6 ? '#bfa173' : '#c9ac7e';
      if (Y <= 9) return '#d6bb8c';
      const n = hash(X + 3, Y * 3);
      if (n < 0.05) return '#cdb07e';
      if (n > 0.96) return '#f6e6c4';
      if (hash((X >> 1) + 7, (Y >> 1) * 5) < 0.05) return '#d8bf92';
      if ((X * 7 + Y * 3) % 31 === 0) return '#dcc496';
      return py > 18 ? (hash(X, Y) < 0.3 ? '#dcc396' : '#e2c99c') : '#ead4a8';
    }
    if (Y === 44) return '#f0c088';
    if (Y === 45) return '#e0a868';
    if (Y === 46) return '#8a5a2b';
    if (Y === 47) return '#6b4020';
    if (Y === 48 || Y === 49) return Y === 48 ? '#5c3a1a' : '#4a2c14';
    if (py < 30) {
      const k = X % 8;
      if (k === 0) return '#4a2c14';
      if (k === 1) return Y === 50 ? '#d89a5a' : '#c88e52';
      if (k === 7) return '#7a4a22';
      if (Y === 59) return '#7a4a22';
      const n = hash(X * 3, (Y >> 2) + X);
      return n < 0.15 ? '#8a5a2b' : n > 0.9 ? '#b07a45' : '#9a6436';
    }
    return py < 31 ? (Y === 60 ? '#5c3a1a' : '#4a2c14') : '#2e1a0c';
  }, 0, 0, 32, 64), { post: false });
}
function doorMat() {
  return draw2(16, 16, g => {
    g.R(OUT, 1, 3, 14, 10);
    g.N((X, Y) => {
      const px = X - 4, py = Y - 8;
      if (px <= 1 || py <= 1 || px >= 22 || py >= 14) return (px + py) % 3 ? '#b8402e' : '#9e3024';
      if (py <= 3 || py >= 12) return px % 4 < 2 ? '#e8c870' : '#d9b860';
      const ck = ((px >> 2) + (py >> 2)) % 2, w = (px + py) % 2;
      const base = ck ? (py < 8 ? '#d9b860' : '#c9a24a') : (py < 8 ? '#c9a24a' : '#a8822e');
      return w ? base : shade(base, 0.93);
    }, 4, 8, 24, 16);
    for (const fy of [4, 6, 8, 10]) { g.R('#e8c870', 0, fy, 1, 1); g.R('#e8c870', 15, fy, 1, 1); g.R('#a8822e', 0, fy + 1, 1, 0.5); g.R('#a8822e', 15, fy + 1, 1, 0.5); g.R('#fff0b0', 0, fy, 0.5, 0.5); }
    g.R('#f7d547', 6, 7, 4, 2); g.R('#b8402e', 7, 7, 2, 2); g.R('#e5452f', 7, 7, 1, 1); g.R('#fff0b0', 6, 7, 1, 0.5);
  });
}
function bed(sleep) {
  const W = WOOD;
  return draw2(32, 24, g => {
    // đầu giường
    g.R(OUT, 0, 0, 32, 8);
    g.R(W[1], 1, 1, 30, 6);
    g.R(woodH(W, { bh: 6, len: 48, seed: 3, oy: 4, nails: false }), 4, 2, 24, 3); g.R(W[3], 4, 2, 24, 0.5); g.R(W[1], 4, 4, 24, 1);
    for (const px of [1, 28]) { g.R(W[2], px, 1, 3, 6); g.R(W[3], px, 1, 3, 1); g.R('#f0c088', px, 1, 1.5, 0.5); g.R(W[0], px + 2, 2, 1, 5); g.R(W[3], px, 2, 0.5, 5); }
    for (let px = 8; px < 26; px += 6) { g.R(W[0], px, 2, 0.5, 3); g.R(W[3], px + 0.5, 2, 0.5, 3); }
    // thành giường
    g.R(OUT, 0, 7, 32, 15);
    g.R(W[1], 1, 7, 30, 14);
    // nệm + ga
    g.R('#f3ead2', 2, 7, 28, 13); g.R('#d6c8a2', 2, 7, 28, 1); g.R('#e4d8b8', 28, 8, 2, 12); g.R('#d6c8a2', 29.5, 8, 0.5, 12);
    // gối
    g.R(OUT, 8, 8, 16, 6);
    g.R('#ffffff', 9, 9, 14, 4); g.R('#dfe4ee', 9, 12, 14, 1); g.R('#dfe4ee', 21, 9, 2, 3); g.R('#eef0f6', 9, 11.5, 14, 0.5);
    for (const [cx, cy] of [[8, 8], [23, 8], [8, 13], [23, 13]]) g.R('#f3ead2', cx, cy, 1, 1);
    g.R('#c8d0de', 15, 10, 2, 1); g.R('#c8d0de', 12, 9.5, 1, 0.5); g.R('#c8d0de', 19, 11, 1.5, 0.5);
    if (sleep) {
      // đầu người ngủ: tóc nâu, mắt nhắm, má hồng
      g.layer(L => {
        L.R('#7a4a22', 12.5, 8.5, 7, 3); L.R('#5c3a1a', 12.5, 10, 1, 2); L.R('#5c3a1a', 18.5, 10, 1, 2);
        L.R('#a06a3a', 13, 8.5, 3, 0.5); L.R('#a06a3a', 13.5, 9, 1, 0.5);
        L.R('#ffd7b0', 13.5, 10.5, 5, 3.5); L.R('#ffe8d0', 13.5, 10.5, 2, 0.5); L.R('#f0b088', 18, 11, 0.5, 3);
        L.R('#7a4a22', 14, 10, 1.5, 1); L.R('#7a4a22', 16.5, 10, 1.5, 0.5);
      });
      g.R(OUT, 14, 12, 1, 0.5); g.R(OUT, 17, 12, 1, 0.5);
      g.R('#f4a0a8', 13.5, 13, 1, 0.5); g.R('#f4a0a8', 17.5, 13, 1, 0.5);
    }
    // chăn hoa
    g.R(OUT, 1, 14, 30, 8);
    g.N((X, Y) => {
      const px = X - 4, py = Y - 30;
      if (py <= 1) return '#ffffff';
      if (py <= 3) return py === 2 ? '#f0e8d8' : '#e4d8b8';
      const fx = px % 12, fy = py;
      const fl = (fx === 4 && fy === 6) || (fx === 10 && fy === 10) || (fx === 5 && fy === 6) || (fx === 4 && fy === 7) || (fx === 5 && fy === 7);
      if (fl) return '#f7d547';
      const pet = (Math.abs(fx - 4.5) <= 1.5 && Math.abs(fy - 6.5) <= 1.5) || (Math.abs(fx - 10) <= 1 && Math.abs(fy - 10) <= 1 && fx !== 10);
      if (pet) return '#ffb0a0';
      const lit = px < 6 || py === 4;
      return lit ? '#e8604a' : px > 50 ? '#a83224' : (py % 4 === 3 && (px % 6 === 0) ? '#b83a2c' : '#cc4434');
    }, 4, 30, 56, 12);
    if (sleep) {
      g.ell('rgba(255,190,170,0.35)', 15, 17, 7, 1.6);
      g.R('#a83224', 8, 20, 16, 1); g.R('#ffffff', 10, 15, 10, 1); g.R('#e4d8b8', 10, 15.5, 10, 0.5);
      g.line('#a83224', 8, 18, 12, 17, 1); g.line('#a83224', 23, 18, 19, 17, 1);
    }
    // chân giường
    g.R(OUT, 0, 21, 32, 3);
    g.R(W[2], 1, 21, 30, 1); g.R(W[3], 1, 21, 30, 0.5); g.R(W[0], 1, 22, 30, 1);
    for (const px of [1, 28]) { g.R(W[2], px, 21, 3, 2); g.R(W[3], px, 21, 1, 2); }
  });
}
function wardrobe() {
  const W = WOOD;
  return draw2(24, 32, g => {
    g.shadow(12, 31, 11, 1.2, 0.3);
    g.R(OUT, 0, 0, 24, 5);
    g.R(W[2], 1, 1, 22, 3); g.R(W[3], 1, 1, 22, 1); g.R('#f0c088', 1, 1, 22, 0.5); g.R(W[0], 1, 3, 22, 1); g.R(W[1], 1, 3.5, 22, 0.5);
    g.R(OUT, 1, 4, 22, 25);
    g.R(W[1], 2, 5, 20, 23);
    for (const dx of [2, 12]) {
      g.R(woodV(W, { bw: 5, len: 50, seed: dx, ox: dx * 2 }), dx, 5, 10, 23);
      g.R(W[3], dx, 5, 0.5, 23); g.R(W[3], dx, 5, 10, 0.5); g.R(W[0], dx + 9.5, 5, 0.5, 23);
      for (const [py, ph] of [[7, 9], [18, 8]]) {
        g.R(W[0], dx + 2, py, 6, ph); g.R(W[1], dx + 2.5, py + 0.5, 5.5, ph - 0.5);
        g.R(W[3], dx + 2.5, py + ph - 0.5, 5.5, 0.5); g.R(W[3], dx + 7.5, py + 0.5, 0.5, ph - 0.5);
        g.R(woodV(['#7a4a26', '#8a5a30', '#9a6436', '#a87040'], { bw: 6, len: 40, seed: py + dx }), dx + 3, py + 1, 4, ph - 2);
        g.R('#b07a45', dx + 3, py + 1, 4, 0.5);
      }
    }
    g.R(OUT, 11, 5, 2, 23); g.R(W[0], 11.5, 5, 1, 23);
    for (const kx of [9, 13]) { g.R(OUT, kx, 15, 2, 3); g.R('#d19a1c', kx + 0.5, 15.5, 1, 2); g.R('#f2c838', kx + 0.5, 15.5, 1, 1); g.R('#fff4b0', kx + 0.5, 15.5, 0.5, 0.5); }
    g.R(W[0], 2, 27, 20, 1);
    for (const lx of [2, 19]) { g.R(OUT, lx, 28, 3, 4); g.R(W[1], lx + 1, 28, 1, 3); g.R(W[2], lx + 1, 28, 0.5, 3); }
  });
}
function table() {
  const W = WOOD;
  return draw2(32, 20, g => {
    g.shadow(16, 19, 15, 1.2, 0.25);
    for (const lx of [2, 27]) { g.R(OUT, lx, 12, 3, 8); g.R(W[1], lx + 1, 12, 1, 7); g.R(W[2], lx + 1, 12, 0.5, 7); }
    g.R(OUT, 0, 0, 32, 15);
    g.N((X, Y) => {
      const px = X - 2, py = Y - 2, row = Math.floor(py / 10), k = py % 10;
      if (k === 9) return W[1];
      if (k === 8) return '#a06a38';
      if (k === 0) return '#d09a5a';
      const n = hash(Math.floor((px + hash(py, row) * 11) / 6) + row * 5, py);
      if (n < 0.14) return '#a06a38';
      if (n > 0.94) return '#d09a5a';
      return px < 5 ? '#c08a52' : '#b07a45';
    }, 2, 2, 60, 20);
    g.R(W[1], 1, 11, 30, 2); g.R(W[2], 1, 11, 30, 1); g.R(W[3], 1, 11, 30, 0.5); g.R(W[0], 1, 13, 30, 1);
    // khay tre tròn
    g.ell(OUT, 15, 7, 8, 2.5); g.ell((X, Y) => ((X + (Y >> 1)) % 3 ? '#c9a24a' : '#b08a38'), 15, 7, 7, 1.5); g.R('#e2c26a', 10, 6, 7, 0.5); g.R('#a8822e', 11, 8, 10, 0.5);
    // ấm sứ men lam
    g.layer(L => {
      L.ell('#e6ecf4', 12, 5.5, 3.6, 2.6);
      L.R('#e6ecf4', 9, 2.5, 6, 1); L.R('#ffffff', 10, 1, 3, 1.5);
      L.R('#ffffff', 9.5, 4, 2, 2); L.R('#3f6ab8', 9, 5.5, 6.5, 1); L.R('#5a86d0', 9.5, 5.5, 2, 0.5);
      L.R('#c8d2e2', 14, 4, 1.5, 3.5); L.R('#c8d2e2', 10, 7.5, 4, 0.5);
      L.R('#e6ecf4', 15.5, 4, 2, 1); L.R('#e6ecf4', 17, 3, 1, 1);   // vòi
      L.R(OUT, 11, 0.5, 1, 0.5);
    });
    g.R(OUT, 9, 3.5, 6, 0.5);
    // chén trà
    for (const [cx, cy] of [[18, 5], [21, 7]]) {
      g.R(OUT, cx, cy, 4, 4); g.R('#8a4a1a', cx + 1, cy + 1, 2, 1); g.R('#b06a30', cx + 1, cy + 1, 1, 0.5); g.R('#ffffff', cx + 1, cy + 2, 2, 1); g.R('#3f6ab8', cx + 2, cy + 2, 1, 1); g.R('#dfe4ee', cx + 2.5, cy + 2, 0.5, 1);
      g.R('#c9a24a', cx, cy + 3, 1, 1); g.R('#c9a24a', cx + 3, cy + 3, 1, 1);
    }
    // dĩa trái cây
    g.ell(OUT, 4, 9, 2, 1); g.ell('#e8e8f0', 4, 9.3, 1.4, 0.4);
    g.ell('#e5452f', 3.6, 8.2, 1, 0.8); g.R('#ff9a7a', 3, 7.5, 0.5, 0.5); g.R('#f59a23', 5, 8, 1, 1); g.R('#ffbe5a', 5, 8, 0.5, 0.5); g.R(LEAF[3], 3.5, 7, 0.5, 0.5);
  });
}
function stove() {
  return draw2(24, 24, g => {
    g.shadow(12, 23, 11, 1.2, 0.3);
    g.R(OUT, 1, 9, 22, 15);
    g.R(bricks(BRICK, '#c8b49a', { bw: 12, bh: 6, ox: 4, oy: 22, seed: 4 }), 2, 10, 20, 13);
    g.R(BRICK[3], 2, 10, 20, 0.5); g.R(BRICK[2], 2, 10.5, 20, 0.5);
    g.R('rgba(40,20,8,0.22)', 18, 11, 4, 12);
    // miệng lò có lửa
    g.R(OUT, 6, 14, 12, 10);
    g.N((X, Y) => {
      const px = X - 14, py = Y - 30, hgt = 8 + Math.round(hash(px >> 1, 2) * 6) + (px > 4 && px < 14 ? 2 : 0) + (hash(px, 9) < 0.3 ? 1 : 0);
      if (py >= 18 - hgt) { const t = (py - (18 - hgt)) / hgt; return t < 0.22 ? '#e5452f' : t < 0.52 ? '#f59a23' : t < 0.82 ? '#f7d547' : '#fff3c0'; }
      return py < 4 ? '#120a06' : '#24140a';
    }, 14, 30, 20, 18);
    g.R(OUT, 6, 13, 12, 1);
    // củi
    for (const [lx, ly] of [[4, 21], [16, 20]]) { g.R(OUT, lx, ly, 5, 3); g.R('#8a5a2b', lx + 1, ly + 1, 3, 1); g.R('#b07a45', lx + 1, ly + 1, 3, 0.5); g.R('#e0a868', lx, ly + 1, 1, 1); g.R('#c08850', lx + 0.5, ly + 1.5, 0.5, 0.5); }
    // nồi gang
    g.ell(OUT, 12, 6, 8, 5);
    g.ell((X, Y, dx, dy) => { const v = -dx * 0.6 - dy * 0.4; return v > 0.55 ? '#5a5a66' : v > 0 ? '#44444e' : '#3a3a44'; }, 12, 6, 7, 4);
    g.R('#767686', 6, 4, 4, 0.5); g.R('#8a8a98', 7, 3.5, 2, 0.5);
    g.ell(OUT, 12, 3, 6, 2); g.ell('#5a5a66', 12, 3, 5, 1); g.R('#8a8a98', 8, 2, 4, 0.5); g.R('#aeaebe', 8.5, 2, 1.5, 0.5); g.R('#3a3a44', 9, 3.5, 7, 0.5);
    g.R(OUT, 11, 0, 3, 2); g.R('#b07a45', 12, 0, 1, 1); g.R('#e0a868', 12, 0, 0.5, 0.5);
    for (const hx of [3, 20]) { g.R(OUT, hx, 5, 2, 2); g.R('#5a5a66', hx + 0.5, 5.5, 1, 0.5); }
    g.R('rgba(255,255,255,0.55)', 16, 0, 1, 1); g.R('rgba(255,255,255,0.45)', 17, 1, 1, 1); g.R('rgba(255,255,255,0.3)', 17.5, -0.5, 1, 1);
  });
}
function rug() {
  return draw2(48, 32, g => g.N((X, Y) => {
    const px = X / 2, py = Y / 2, ix = Math.floor(px), iy = Math.floor(py);
    if (ix <= 1 || ix >= 46) {   // tua rua
      if (py < 2 || py >= 30) return null;
      if ((Y % 4) === 3) return null;
      return (ix === 0 || ix === 47) ? ((Y % 4) === 0 ? '#e8d4a0' : '#d9c08a') : '#f0dcae';
    }
    if (iy === 0 || iy === 31) return null;
    if (iy === 1 || iy === 30 || ix === 2 || ix === 45) return OUT;
    const jx = px - 3, jy = py - 2;
    const e = Math.min(jx, jy, 42 - jx, 28 - jy);
    if (e < 1) return e < 0.5 ? '#f0c060' : '#e0b050';
    if (e < 2) return '#3a4a7a';
    if (e < 3) return ((Math.floor(jx * 2) + Math.floor(jy * 2)) % 4 < 2) ? '#e0b050' : '#3a4a7a';
    if (e < 4) return '#3a4a7a';
    if (e < 5) return '#e0b050';
    const cx = Math.abs(jx - 21), cy = Math.abs(jy - 14);
    const dmd = cx / 1.5 + cy;
    if (dmd < 1.5) return '#e5452f';
    if (dmd < 3) return '#f3ead2';
    if (dmd < 4) return '#e0b050';
    if (dmd < 6.5) return ((Math.floor(dmd * 2)) % 2) ? '#3a4a7a' : '#4a5a8a';
    if (dmd < 7.5) return '#e0b050';
    for (const [qx, qy] of [[7.5, 7.5], [34.5, 7.5], [7.5, 20.5], [34.5, 20.5]]) {
      const d = Math.abs(jx - qx) + Math.abs(jy - qy);
      if (d < 2.5) return d < 1 ? '#e0b050' : (Math.floor(d * 2) % 2 ? '#f3ead2' : '#e0b050');
    }
    const n = hash(X, Y);
    if (n < 0.05) return '#8e2a20';
    if ((X + Y) % 6 === 0 && n < 0.4) return '#b03630';
    return (jy < 6 || jx < 7) ? '#b83a2c' : '#a8342a';
  }, 0, 0, 96, 64), { post: false });
}
function windowW() {
  return draw2(16, 16, g => {
    g.R(OUT, 1, 0, 14, 14);
    g.R(WOOD[1], 2, 1, 12, 12); g.R(WOOD[2], 2, 1, 12, 1); g.R(WOOD[2], 2, 1, 1, 12); g.R(WOOD[3], 2, 1, 12, 0.5); g.R(WOOD[0], 13.5, 1.5, 0.5, 11.5);
    g.R(OUT, 3, 2, 10, 10);
    g.R(glass(6, 4, 20, 20), 3, 2, 10, 10);
    g.R('#d8f0ff', 3, 2, 10, 0.5);
    g.R(WOOD[2], 7, 2, 2, 10); g.R(WOOD[3], 7, 2, 0.5, 10); g.R(WOOD[1], 8.5, 2, 0.5, 10);
    g.R(WOOD[2], 3, 6, 10, 2); g.R(WOOD[3], 3, 6, 10, 0.5); g.R(WOOD[1], 3, 7.5, 10, 0.5);
    g.R(WOOD[3], 7, 6, 1, 1);
    // bậu cửa
    g.R(OUT, 0, 12, 16, 4);
    g.R(WOOD[3], 1, 13, 14, 1); g.R('#f0c088', 1, 13, 14, 0.5); g.R(WOOD[1], 1, 14, 14, 1); g.R(WOOD[0], 1, 14.5, 14, 0.5);
    // rèm hai bên
    for (const [cx, d] of [[3, 1], [12, -1]]) {
      g.R('#e5452f', cx, 2, 1, 6); g.R('#ff8a6a', cx + (d < 0 ? 0.5 : 0), 2, 0.5, 5); g.R('#b8352b', cx + (d < 0 ? 0 : 0.5), 4, 0.5, 4);
      g.R('#9e2416', cx + d, 7, 1, 2); g.R('#e5452f', cx + d * 0.5, 7, 0.5, 1); g.R('#f7d547', cx, 6.5, 1, 0.5);
    }
  });
}
function pottedPlant() {
  return draw2(16, 24, g => {
    g.shadow(8, 23, 6, 1.2, 0.3);
    const G = LEAF;
    g.layer(L => {
      for (const [pts, col] of [
        [[[2, 7], [3, 8], [3, 9], [4, 10], [4, 11]], G[3]],
        [[[13, 6], [12, 7], [12, 8], [11, 9], [11, 10]], G[2]],
        [[[7, 0], [7, 1], [8, 2], [8, 3]], G[3]],
        [[[1, 12], [2, 12], [3, 13]], G[2]],
        [[[14, 11], [13, 12], [12, 13]], G[1]],
      ]) for (const [px, py] of pts) { L.R(col, px, py, 1.5, 1); L.R(shade(col, 1.2), px, py, 0.5, 0.5); }
      leafBlobs(L, [[8, 6.5, 3.6], [5, 9.5, 3.2], [11, 9.5, 3.2], [8, 11.5, 3.6]], G, 21, '#00000000');
      // gân lá
      for (const [a, b, c2, d] of [[8, 4, 8, 9], [5, 8, 6, 11], [11, 8, 10, 11]]) L.line(G[1], a, b, c2, d, 1);
    }, '#163a0e');
    for (const [hx, hy] of [[2, 7], [7, 0], [13, 6]]) g.R('#a8e070', hx, hy, 0.5, 0.5);
    for (const [fx, fy] of [[6, 5], [10, 8], [7, 10]]) { g.R('#ffffff', fx, fy, 1, 1); g.R('#e0e8f0', fx + 0.5, fy + 0.5, 0.5, 0.5); g.R('#f7d547', fx + 1, fy, 0.5, 0.5); }
    // chậu đất nung
    g.R(OUT, 3, 15, 10, 9);
    g.R('#c0603e', 4, 16, 8, 2); g.R('#e08a62', 4, 16, 8, 0.5); g.R('#a04a2e', 4, 17.5, 8, 0.5);
    g.R(OUT, 3, 18, 10, 1);
    g.R('#b4583a', 5, 19, 6, 4); g.R('#d0805a', 5, 19, 1, 4); g.R('#e09a72', 5, 19, 0.5, 3); g.R('#8e4028', 10, 19, 1, 4); g.R('#a24a30', 9.5, 19, 0.5, 4);
    g.R('#c86a46', 6, 20.5, 3, 0.5);
    g.R(OUT, 4, 19, 1, 4); g.R(OUT, 11, 19, 1, 4); g.R(OUT, 4, 23, 8, 1);
    g.R('#4a2c14', 5, 15, 6, 1); g.R('#5c3a1a', 5.5, 15, 2, 0.5);
  });
}
function phone() {
  const W = WOOD;
  return draw2(16, 30, g => {
    g.R(OUT, 2, 2, 12, 18);
    g.R(woodV(W, { bw: 6, len: 60, seed: 4, ox: 6 }), 3, 3, 10, 16);
    g.R(W[3], 3, 3, 10, 1); g.R('#f0c088', 3, 3, 10, 0.5); g.R(W[1], 3, 17, 10, 2); g.R(W[0], 12, 3, 1, 16); g.R(W[3], 3, 3, 0.5, 16);
    // mặt số
    g.R(OUT, 4, 12, 8, 6); g.R('#1e3a2e', 5, 13, 6, 4); g.R('#2e4a3e', 5, 13, 6, 0.5);
    for (const [dx, dy] of [[6, 14], [8, 14], [10, 14], [6, 16], [8, 16], [10, 16]]) { g.R('#cfeaff', dx - 0.25, dy - 0.25, 1, 1); g.R('#ffffff', dx - 0.25, dy - 0.25, 0.5, 0.5); }
    // chuông đồng
    g.R(OUT, 6, 5, 4, 4); g.ell('#d19a1c', 7.5, 6.5, 1.2, 1.2); g.R('#f2c838', 7, 6, 1.5, 1); g.R('#fff4b0', 7, 6, 0.5, 0.5);
    // ống nghe gác ngang
    g.R(OUT, 1, 9, 14, 3); g.R('#2e2e36', 2, 10, 12, 1); g.R('#4c4c58', 2, 10, 12, 0.5);
    g.R('#4c4c58', 2, 9, 3, 1); g.R('#4c4c58', 11, 9, 3, 1); g.R('#767686', 2, 9, 3, 0.5); g.R('#767686', 11, 9, 3, 0.5);
    g.R('#8a8a98', 2, 10, 0.5, 0.5); g.R('#8a8a98', 13, 10, 0.5, 0.5);
    // dây xoắn
    for (let i = 0; i < 16; i++) g.N(i % 2 ? '#2e2e36' : '#5a5a66', 16 + ((i >> 1) % 2) * 2, 40 + i, 2, 1);
    g.R(OUT, 7, 28, 3, 2); g.R(W[1], 8, 28, 1, 1); g.R(W[2], 8, 28, 0.5, 0.5);
  });
}

const FLOORS = [0, 1].map(floorV);

// ======================================================================
// Đồ dựng nhỏ quanh vườn (SPR3, SPR2, SPR.deco)
// ======================================================================
// Biển "đã về" trên cửa chuồng 26x11 (SPR3.homeBoard): mặt sáng để chữ số nổi, dây treo
function homeBoard() {
  return draw2(26, 11, g => {
    for (const ox of [6, 19]) { g.R('#8a5a2b', ox, 0, 1, 2); g.R('#b07a45', ox, 0, 0.5, 2); g.R(OUT, ox - 1, 0, 1, 2); }
    g.R(OUT, 0, 2, 26, 9);
    g.R(WOOD[1], 1, 3, 24, 7); g.R(WOOD[2], 1, 3, 24, 1); g.R(WOOD[3], 1, 3, 24, 0.5); g.R(WOOD[0], 1, 9, 24, 1);
    g.R((X, Y) => (hash(X, Y) < 0.06 ? '#f0e4c4' : '#fff6dc'), 2, 3, 22, 7);
    g.R('#ffffff', 2, 3, 22, 0.5); g.R('#e8d8b0', 2, 9, 22, 1); g.R('#f2e6c8', 2, 8.5, 22, 0.5);
    for (const ox of [1, 24]) { g.R(WOOD[0], ox, 3, 1, 7); g.R(WOOD[1], ox + 0.5, 3, 0.5, 7); g.R(IRON[3], ox + 0.25, 4, 0.5, 0.5); g.R(IRON[3], ox + 0.25, 8, 0.5, 0.5); }
  });
}
// Cân heo 16x16 (SPR3.scale): bàn cân sắt, trụ, mặt đồng hồ kim đỏ
function scale() {
  return draw2(16, 16, g => {
    g.shadow(8, 14, 7, 1.6);
    g.R(OUT, 1, 10, 14, 5);
    g.R(IRON[2], 2, 11, 12, 3); g.R(IRON[3], 2, 11, 12, 1); g.R(IRON[4], 2, 11, 12, 0.5); g.R(IRON[1], 2, 13, 12, 1);
    for (let X = 6; X < 28; X += 3) g.N(IRON[1], X, 24, 1, 2);   // gân chống trượt
    g.R(IRON[4], 3, 11, 3, 0.5);
    g.R(OUT, 11, 4, 3, 7); g.R(IRON[3], 12, 5, 1, 6); g.R(IRON[4], 12, 5, 0.5, 6);
    g.ell(OUT, 12, 3, 3, 3); g.ell('#fffaf0', 12, 3, 2, 2);
    for (const [tx, ty] of [[10, 3], [14, 3], [12, 1.5], [12, 5]]) g.R('#4c4c58', tx + 0.25, ty + 0.25, 0.5, 0.5);
    g.nline('#e5452f', 25, 7, 27, 4); g.R(OUT, 12, 3, 1, 1); g.R('#ffffff', 11, 2, 0.5, 0.5);
  });
}
// Trạm gác của chó 12x16 (SPR3.guardPost): cọc gỗ, biển tam giác xanh có chữ thập vàng, ụ đất
function guardPost() {
  return draw2(12, 16, g => {
    g.shadow(6, 15, 4.6, 1.2);
    g.R(OUT, 4, 5, 4, 11); g.R(woodV(WOOD, { bw: 4, len: 30, seed: 2, ox: 10 }), 5, 6, 2, 9); g.R(WOOD[3], 5, 6, 0.5, 9); g.R(WOOD[0], 6.5, 6, 0.5, 9);
    g.ell(OUT, 6, 15, 4.2, 1.2); g.ell('#6b4a22', 6, 15, 3.4, 0.8); g.R('#8a6a38', 3, 14, 3, 0.5); g.R('#4a3014', 7, 15.5, 2, 0.5);
    const HW = [5, 5, 5, 4, 4, 3, 2, 1];
    g.layer(L => HW.forEach((hw, j) => { if (j > 0 && hw > 1) L.N((X, Y) => (Y < 6 ? '#8ab4e6' : Y < 10 ? '#6a9ad4' : '#5a8ac4'), 2 * (7 - hw), 2 * j, 4 * hw - 4, 2); else if (j > 0) L.N('#5a8ac4', 12, 2 * j, 0, 0); }), OUT, 1);
    g.R('#c8dcf4', 2.5, 1, 7, 0.5);
    g.R('#2e4a6e', 7, 1, 2, 5); g.R('#3e5a80', 7, 1, 0.5, 5);
    g.R('#f7d547', 5, 2, 1, 3); g.R('#f7d547', 4, 3, 3, 1); g.R('#fff6b0', 5, 2, 0.5, 1);
  });
}
// Hàng rào tre thấp 16x16 (SPR3.lowFence.h / .v)
function lowFence(kind) {
  return draw2(16, 16, g => {
    if (kind === 'h') {
      g.R(OUT, 0, 9, 16, 3); g.R(BAMBOO[2], 0, 10, 16, 1); g.R(BAMBOO[3], 0, 10, 16, 0.5); g.R(BAMBOO[1], 0, 10.5, 16, 0.5);
      for (const nx of [7, 15]) { g.R(BAMBOO[0], nx, 10, 0.5, 1); g.R(BAMBOO[3], nx + 0.5, 10, 0.5, 1); }
      for (const ox of [3, 11]) {
        g.R(OUT, ox, 6, 3, 9); g.R(BAMBOO[2], ox + 1, 7, 1, 7); g.R(BAMBOO[3], ox + 1, 7, 0.5, 7); g.R(BAMBOO[1], ox + 1.5, 7, 0.5, 7);
        g.R(BAMBOO[3], ox + 1, 7, 1, 0.5); g.R(BAMBOO[0], ox + 1, 12, 1, 0.5);
        g.R('#8a5a2b', ox + 1, 10, 1, 1); g.R('#b07a45', ox + 1, 10, 0.5, 0.5); g.R('#5c3a1a', ox + 1.5, 10.5, 0.5, 0.5);
      }
    } else {
      g.R(OUT, 7, 0, 3, 16); g.R(BAMBOO[2], 8, 0, 1, 16); g.R(BAMBOO[3], 8, 0, 0.5, 16); g.R(BAMBOO[1], 8.5, 0, 0.5, 16);
      for (const ny of [7, 15]) { g.R(BAMBOO[0], 8, ny, 1, 0.5); g.R(BAMBOO[3], 8, ny + 0.5, 1, 0.5); }
      for (const oy of [2, 10]) {
        g.R(OUT, 6, oy, 5, 4); g.R(BAMBOO[2], 7, oy + 1, 3, 2); g.R(BAMBOO[3], 7, oy + 1, 3, 0.5); g.R(BAMBOO[1], 7, oy + 2.5, 3, 0.5);
        g.R('#8a5a2b', 8, oy + 2, 1, 1); g.R('#b07a45', 8, oy + 2, 0.5, 0.5);
      }
    }
  });
}
// Mái che sân 22x26 (SPR3.canopy): bốn cọc tre, mái bạt sọc xanh–kem, diềm răng cưa
function canopy() {
  return draw2(22, 26, g => {
    g.shadow(11, 24, 9.4, 2.2);
    const post2 = (px, y0, y1) => {
      g.R(OUT, px, y0, 3, y1 - y0);
      g.R(BAMBOO[2], px + 1, y0 + 1, 1, y1 - y0 - 2); g.R(BAMBOO[3], px + 1, y0 + 1, 0.5, y1 - y0 - 2); g.R(BAMBOO[1], px + 1.5, y0 + 1, 0.5, y1 - y0 - 2);
      g.R(BAMBOO[3], px + 1, y0 + 1, 1, 2);
      for (let k = y0 + 4; k < y1 - 1; k += 5) { g.R(BAMBOO[0], px + 1, k, 1, 0.5); g.R(BAMBOO[3], px + 1, k + 0.5, 1, 0.5); }
    };
    post2(4, 6, 21); post2(15, 6, 21);
    post2(0, 8, 26); post2(19, 8, 26);
    g.R(OUT, 1, 13, 20, 2); g.R(BAMBOO[2], 1, 13, 20, 1); g.R(BAMBOO[3], 1, 13, 20, 0.5); g.R(BAMBOO[1], 1, 14, 20, 1);
    for (const px of [2, 19]) { g.R('#8a5a2b', px, 13, 1, 2); g.R('#b07a45', px, 13, 0.5, 2); }
    // mái bạt sọc căng trên khung
    g.layer(L => {
      for (let Y = 4; Y < 20; Y++) {
        const j = (Y - 4) / 2, hw = 5.4 + j * 0.8, x0 = 2 * (11 - hw), x1 = 2 * (11 + hw) + 1;
        for (let X = Math.round(x0); X <= Math.round(x1); X++) {
          const px = X / 2, green = Math.floor((px + 1) / 3) % 2 === 0, u = ((px + 1) / 3) % 1;
          const t = j < 2 ? 0 : j > 5.5 ? 2 : 1;
          let c = green ? ['#4aa060', '#2f9a4a', '#1e7a3a'][t] : ['#fffaec', '#f2eccc', '#ddd4b4'][t];
          if (u < 0.17 && t < 2) c = green ? '#5fd07a' : '#ffffff';
          if (X === Math.round(x1) || X === Math.round(x1) - 1) c = green ? '#1e7a3a' : '#ddd4b4';
          L.N(c, X, Y);
        }
      }
      L.R('#2f9a4a', 8, 1.5, 6, 0.5);
    }, OUT, 1);
    for (let i = 0; i < 22; i += 4) {
      g.R(OUT, i, 10, 4, 1);
      g.R(Math.floor((i + 1) / 3) % 2 === 0 ? '#1e7a3a' : '#e0d8b4', i + 1, 10, 2, 1);
      g.R(Math.floor((i + 1) / 3) % 2 === 0 ? '#2f9a4a' : '#f2eccc', i + 1, 10, 2, 0.5);
      g.R(OUT, i + 1, 11, 2, 1); g.clear(i + 1, 11.5, 0.5, 0.5); g.clear(i + 2.5, 11.5, 0.5, 0.5);
    }
  });
}
// Xích chó 18x10 (SPR2.dogChain): cọc sắt, sáu mắt xích võng
function dogChain() {
  const I = IRON;
  const P = new Pix(36, 20), g = api(P);
  g.layer(L => {
    L.R(I[2], 1, 1, 3, 7); L.R(I[4], 1, 1, 1, 3); L.R(I[3], 1, 4, 1, 4); L.R(I[1], 3, 2, 1, 6); L.R(I[4], 1, 1, 3, 0.5); L.R(I[0], 1, 7.5, 3, 0.5);
    L.R(I[3], 2, 1.5, 1, 1);
    const pos = [[5, 2], [7, 3], [9, 4], [11, 5], [13, 5], [15, 4]];
    pos.forEach(([px, py], i) => {
      if (i % 2 === 0) { L.ell(I[3], px + 0.5, py, 0.8, 1.4); L.R(I[4], px, py - 1, 0.5, 1); L.R(I[1], px + 1, py + 0.5, 0.5, 1); }
      else { L.ell(I[3], px, py + 0.5, 1.4, 0.8); L.R(I[4], px - 1, py, 1, 0.5); L.R(I[1], px + 0.5, py + 1, 1, 0.5); }
      L.R(I[0], px + 0.25, py + 0.25, 0.5, 0.5);
    });
  }, OUT, 1);
  return P.toCanvas();
}
// Đồ trang trí mua được (SPR.deco): bù nhìn, chậu hoa, đèn lồng, ghế gỗ
function scarecrow() {
  return draw2(16, 26, g => {
    post(g, 7, 10, 2, 16, WOOD);
    g.R(OUT, 0, 12, 16, 3); g.R(woodH(WOOD, { bh: 2, len: 40, seed: 2, nails: false }), 1, 13, 14, 1); g.R(WOOD[3], 1, 13, 14, 0.5);
    for (const [sx, sy] of [[0, 10], [1, 11], [0, 14], [14, 10], [15, 11], [15, 14], [1, 15], [14, 15]]) { g.R('#f0cf5a', sx, sy, 1, 0.5); g.R('#c9a13a', sx + 0.5, sy + 0.5, 0.5, 0.5); }
    // áo
    g.R(OUT, 3, 13, 10, 9);
    g.R((X, Y) => (((X + Y) % 4) === 0 ? '#3478c8' : '#3f8ce0'), 4, 14, 8, 7); g.R('#6aaaf0', 4, 14, 8, 0.5); g.R('#2a64a8', 11.5, 14, 0.5, 7);
    g.R('#e5452f', 5, 15, 3, 3); g.R('#ff7a5a', 5, 15, 3, 0.5); g.R('#9e2416', 7.5, 15, 0.5, 3); g.R('#f7d547', 9, 17, 2, 3); g.R('#fff3a0', 9, 17, 0.5, 3);
    for (const [cx, cy] of [[6, 16], [10, 18]]) { g.R('#ffffff', cx, cy, 0.5, 1); g.R('#ffffff', cx - 0.25, cy + 0.25, 1, 0.5); }   // đường chỉ vá
    for (const sx of [4, 6, 9, 11]) { g.R('#f0cf5a', sx, 22, 1, 1); g.R('#fff0a0', sx, 22, 0.5, 0.5); }
    for (const sx of [5, 8, 10]) g.R('#c9a13a', sx, 23, 1, 1);
    // đầu bao bố
    g.ell(OUT, 8, 7, 4, 4); g.ell((X, Y) => (hash(X, Y) < 0.2 ? '#d8b878' : (X + Y) % 3 ? '#e8c98a' : '#dcbc80'), 8, 7, 3, 3);
    g.R('#f4dcaa', 6, 5, 2, 0.5);
    // mũ rơm
    g.R(OUT, 2, 4, 12, 3); g.R(strawTex(HAY, { seed: 3 }), 3, 5, 10, 1); g.R('#fff0a0', 3, 5, 4, 0.5);
    g.R(OUT, 4, 0, 8, 5); g.R(strawTex(HAY, { seed: 5 }), 5, 1, 6, 3); g.R('#fff0a0', 5, 1, 3, 0.5);
    g.R('#e5452f', 5, 3, 6, 1); g.R('#ff7a5a', 5, 3, 6, 0.5);
    // mặt
    g.R('#2a2a2a', 6, 7, 1, 1); g.R('#2a2a2a', 10, 7, 1, 1); g.R('#ffffff', 6, 7, 0.5, 0.5); g.R('#ffffff', 10, 7, 0.5, 0.5);
    g.R('#f59a23', 8, 8, 1, 1); g.R('#ffbe5a', 8, 8, 0.5, 0.5);
    for (const sx of [6, 8, 10]) { g.R('#5c3a1a', sx, 10, 1, 0.5); g.R('#5c3a1a', sx + 0.25, 9.5, 0.5, 1); }
  });
}
function flowerPot() {
  return draw2(10, 10, g => {
    g.line(LEAF[1], 3, 5, 3, 7); g.line(LEAF[1], 5, 3, 5, 7); g.line(LEAF[1], 7, 4, 7, 7);
    g.R(LEAF[3], 3, 5, 0.5, 2); g.R(LEAF[3], 5, 3, 0.5, 3);
    g.R(LEAF[2], 2, 6, 1, 1); g.R(LEAF[2], 8, 6, 1, 1); g.R(LEAF[4], 2, 6, 0.5, 0.5); g.R(LEAF[4], 8, 6, 0.5, 0.5);
    const fl = (cx, cy, col) => {
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) g.R(col, cx + dx, cy + dy, 1, 1);
      g.R(mix(col, '#ffffff', 0.5), cx - 1, cy, 0.5, 0.5); g.R(mix(col, '#ffffff', 0.5), cx, cy - 1, 0.5, 0.5);
      g.R(mix(col, OUT, 0.25), cx + 1.5, cy, 0.5, 1); g.R(mix(col, OUT, 0.25), cx, cy + 1.5, 1, 0.5);
      g.R('#f7d547', cx, cy, 1, 1); g.R('#d19a1c', cx + 0.5, cy + 0.5, 0.5, 0.5);
    };
    fl(3, 3, '#ff8fb1'); fl(5, 1, '#e5452f'); fl(7, 3, '#ffffff');
    g.R(OUT, 1, 7, 8, 3); g.R('#d9704a', 2, 7, 6, 2); g.R('#f08a62', 2, 7, 6, 0.5); g.R('#b85a38', 2, 8.5, 6, 0.5); g.R('#f8a882', 2.5, 7, 1.5, 0.5);
    g.R(OUT, 2, 9, 6, 1);
  });
}
function lamp() {
  return draw2(8, 22, g => {
    g.R(OUT, 3, 9, 2, 13); g.R(WOOD[1], 3, 9, 1, 13); g.R(WOOD[2], 3, 9, 0.5, 13); g.R(WOOD[0], 4, 9, 0.5, 13);
    g.R(OUT, 1, 20, 6, 2); g.R(WOOD[1], 1.5, 20.5, 5, 0.5);
    g.R(OUT, 2, 0, 4, 2); g.R('#f7d547', 3, 0, 2, 1); g.R('#fff3a0', 3, 0, 1, 0.5);
    g.ell(OUT, 4, 5, 3, 3);
    g.ell((X, Y, dx) => (dx < -0.35 ? '#ff7a5a' : dx < 0.2 ? '#e5452f' : '#b8352b'), 4, 5, 2, 2);
    g.R('#f7d547', 4, 3, 0.5, 4.5); g.R('#9e2416', 2.5, 4, 0.5, 2.5); g.R('#9e2416', 5.5, 4, 0.5, 2.5);   // nan lồng
    g.R('#ffe9a0', 3.5, 4, 1, 2); g.R('#ffffff', 3, 3.5, 0.5, 1);
    g.R(OUT, 2, 8, 4, 1);
    for (const tx of [3, 4, 5]) { g.R('#f7d547', tx, 9, 0.5, 1); g.R('#d19a1c', tx + 0.5, 9, 0.5, 1); }
  });
}
function bench() {
  return draw2(20, 12, g => {
    for (const px of [1, 15]) { g.R(OUT, px, 6, 4, 6); g.R('#a8a8a0', px + 1, 7, 2, 4); g.R('#c8c8c0', px + 1, 7, 0.5, 4); g.R('#8a8a84', px + 2.5, 7, 0.5, 4); }
    g.R(OUT, 0, 2, 20, 6);
    g.R((X, Y) => (hash(X, Y) < 0.12 ? '#c0c0b8' : hash(X * 7, Y) > 0.93 ? '#f8f8f2' : '#d0d0c8'), 1, 3, 18, 3);
    g.R('#ededE6', 1, 3, 18, 1); g.R('#ffffff', 1, 3, 6, 0.5); g.R('#a8a8a0', 1, 6, 18, 1); g.R('#8a8a84', 1, 6.5, 18, 0.5);
    g.R('#9a9a92', 4, 4, 1, 2); g.R('#9a9a92', 13, 3, 1, 2); g.R('#b8b8b0', 4.5, 4, 0.5, 2);
  });
}
// Quầy chợ kiểu cũ 48x50 (SPR.shop, render hiện không dùng) và hộp thư 12x20 (SPR.mailbox, render không dùng)
function shop() {
  return draw2(48, 50, g => {
    g.R(OUT, 10, 0, 28, 11);
    g.R(woodH(['#b8800f', '#d19a1c', '#f7d547', '#fff0a0'], { bh: 6, len: 60, seed: 2, nails: false }), 11, 1, 26, 9);
    g.R('#d19a1c', 11, 8, 26, 2); g.R('#fff0a0', 11, 1, 26, 0.5);
    g.ell('#d19a1c', 24, 5, 3, 3); g.ell('#f2c040', 24, 5, 2, 2); g.R('#fff0a0', 23, 4, 2, 1); g.R('#b8800f', 25, 6, 1, 1);
    for (const px of [3, 42]) post(g, px, 10, 4, 38, WOOD);
    g.R(OUT, 0, 11, 48, 14);
    g.R((X, Y) => { const s = Math.floor((X / 2 - 1) / 6) % 2, u = ((X / 2 - 1) / 6) % 1; const red = !s; if (u < 0.1) return red ? '#ff7a62' : '#ffffff'; if (u > 0.9) return red ? '#b8352b' : '#e4d8b8'; return red ? (Y < 30 ? '#ef6a54' : '#e5452f') : (Y < 30 ? '#ffffff' : '#f3ead2'); }, 1, 12, 46, 11);
    for (let xx = 1; xx < 47; xx += 6) { const red = Math.floor((xx - 1) / 6) % 2 === 0; g.ell(OUT, xx + 2, 23, 3, 2.2); g.ell(red ? '#e5452f' : '#ffffff', xx + 2, 23, 2, 1.4); g.R(red ? '#b8352b' : '#e4d8b8', xx + 1, 24, 3, 0.5); }
    g.R(OUT, 2, 32, 44, 16);
    g.R(woodV(WOOD, { bw: 10, len: 60, seed: 3 }), 3, 33, 42, 14); g.R(WOOD[1], 3, 40, 42, 1); g.R(WOOD[3], 3, 33, 42, 0.5);
    for (const [cx, col] of [[8, '#e5452f'], [18, '#f59a23'], [28, '#4fa83a'], [38, '#f7d547']]) {
      g.R(OUT, cx - 4, 27, 9, 7); g.R(woodH(WOOD, { bh: 4, len: 20, seed: cx }), cx - 3, 28, 7, 5);
      for (let i = 0; i < 3; i++) { g.ell(col, cx - 2 + i * 2, 28, 1, 1); g.R(mix(col, '#ffffff', 0.5), cx - 2.5 + i * 2, 27.5, 0.5, 0.5); }
    }
    g.R(OUT, 2, 47, 44, 2);
  });
}
function mailbox() {
  return draw2(12, 20, g => {
    g.R(OUT, 4, 8, 4, 12); g.R(WOOD[1], 5, 8, 2, 12); g.R(WOOD[2], 5, 8, 0.5, 12); g.R(WOOD[0], 6.5, 8, 0.5, 12);
    g.R(OUT, 0, 0, 12, 10);
    g.R('#e5452f', 1, 1, 10, 8); g.R('#ff7a5a', 1, 1, 10, 0.5); g.R('#ff7a5a', 1, 1, 0.5, 6); g.R('#9e2416', 1, 7, 10, 2); g.R('#c0301f', 1, 6.5, 10, 0.5);
    g.R(OUT, 2, 3, 8, 1); g.R('#7a1a10', 2, 3.5, 8, 0.5);
    g.R(OUT, 9.5, 0, 2.5, 5.5); g.R('#f7d547', 10, 0, 2, 5); g.R('#fff3a0', 10, 0, 0.5, 5); g.R('#d19a1c', 11.5, 0, 0.5, 5);
  });
}

// ======================================================================
// Bảng khóa
// ======================================================================
export const SPR11 = {
  // thay SPR (art.js)
  house: house(),
  shed: shed(),
  well: well(),
  board: board(),
  signboard: signboard(),
  coop: coop(),
  nestEmpty: nest(false),
  nestEgg: nest(true),
  trough: trough(),
  hay: hay(),
  deco: { deco_scarecrow: scarecrow(), deco_flower: flowerPot(), deco_lamp: lamp(), deco_bench: bench() },
  shop: shop(),
  mailbox: mailbox(),
  // thay SPR2 (art2.js)
  dogChain: dogChain(),
  shippingBin: shippingBin(),
  marketStall: marketStall(),
  marketClosed: marketClosed(),
  smithy: smithy(),
  villageHouses: VILLAGE,
  villageHouse: VILLAGE[0],
  friendGate: friendGate(),
  homeGate: homeGate(),
  giftBox: giftBoxClosed(),
  giftBoxFull: giftBoxFull(),
  giftBoxOpen: giftBoxOpen(),
  guestBook: guestBookClosed(),
  guestBookOpen: guestBookOpen(),
  lampPost: lampPost(),
  bench: benchStone(),
  floors: FLOORS,
  floorWood: FLOORS[0],
  wallInner: wallInner(),
  doorMat: doorMat(),
  bed: bed(false),
  bedSleep: bed(true),
  wardrobe: wardrobe(),
  table: table(),
  stove: stove(),
  rug: rug(),
  window: windowW(),
  pottedPlant: pottedPlant(),
  phone: phone(),
  // thay SPR3 (art3.js)
  pen: {
    coop: [0, 1, 2].map(coopHouse),
    pig: [0, 1, 2].map(pigHouse),
    barn: [0, 1, 2].map(barnHouse),
  },
  quarantine: quarantine(),
  // SPR3.doghouse là mảng 3 cấp (SPR.doghouse cũ là một ảnh, render không dùng): hd.js sẽ ghi một dòng "không phải ảnh" cho SPR.doghouse, vô hại
  doghouse: [0, 1, 2].map(doghouseT),
  cathouse: [0, 1, 2].map(cathouseT),
  catDoor: catDoor(),
  vetClinic: vetClinic(),
  homeBoard: homeBoard(),
  scale: scale(),
  guardPost: guardPost(),
  lowFence: { h: lowFence('h'), v: lowFence('v') },
  canopy: canopy(),
};
// Khóa trùng tên ở nhiều bộ cũ: chỉ thay cho bộ ghi ở đây (hd.js đọc SPR11_FROM)
export const SPR11_FROM = { doghouse: 'SPR3' };
