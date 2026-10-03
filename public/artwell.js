// Giếng 4 cấp (Phase 3, issue 56): Giếng đất (gàu dây), Giếng xây (có mái), Bơm tay, Máy bơm.
// Mỗi cấp một hình 16x24 (bộ thường, như SPR.well cũ) và một hình 32x48 (bộ 2x, kiểu A), cùng điểm neo: đáy chạm đất ở hàng cuối.
// Cả hai bộ vẽ từ cùng một hàm, toạ độ bộ thường (1 đơn vị = 2 điểm 2x). Nét nhỏ hơn 1 đơn vị (số lẻ .5) chỉ hiện ở bộ 2x,
// nét T (đường mảnh) ở bộ thường thành 1 điểm, ở bộ 2x đúng 1 điểm 2x. Viền tối 1 điểm tự bao quanh hình; bộ 2x viền chọn lọc
// (mép hứng sáng trên, trái nhạt hơn). Sáng từ trên trái, mỗi mảng 4 sắc độ (tối → sáng).
// hd.js nối WELLS[i] → WELLS_HD[i]; render.js chọn WELLS[cấp - 1].
import { canvas, hash } from './art.js';

const OUT = '#3b2412';
const EARTH = ['#4a2c14', '#6b4020', '#8a5a2b', '#b07a45'];
const WOOD = ['#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868'];
const ROPE = ['#8a7048', '#b8a070', '#e0c79a'];
const THATCH = ['#5a3e12', '#8a6420', '#b88c3a', '#dcb860'];   // gàu tre đan
const BRICK = ['#5e2616', '#8e4028', '#b4583a', '#d0805a'];
const STONE = ['#6e6a74', '#918c94', '#b4b0b2', '#dcd8d0'];
const CONC = ['#6a6a64', '#8c8c84', '#adada4', '#d2d2c8'];
const TILE = ['#8e2a20', '#b8352b', '#d9483b', '#ef7a6a'];
const PUMP = ['#173c30', '#25604c', '#3a8a6c', '#7cc8a4'];     // gang sơn xanh
const IRON = ['#2e2e36', '#4c4c58', '#767686', '#aeaebe', '#e2e2ea'];
const MOTOR = ['#1c3870', '#2c58a8', '#4a86dc', '#94c0ff'];
const WATER = ['#123e7a', '#1f6fd1', '#5fb8ff', '#cfeaff'];
const GRASS = ['#2f6b1f', '#4fa83a', '#8fd65a'];

// ---------- màu ----------
const PARSE = new Map();
function rgba(c) {
  let v = PARSE.get(c);
  if (v) return v;
  const n = parseInt(c.slice(1, 7), 16);
  v = [n >> 16, (n >> 8) & 255, n & 255, c.length > 7 ? parseInt(c.slice(7, 9), 16) : 255];
  PARSE.set(c, v);
  return v;
}
const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = rgba(a), B = rgba(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };

// ---------- lưới điểm ảnh ----------
class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  in(X, Y) { return X >= 0 && Y >= 0 && X < this.w && Y < this.h; }
  a(X, Y) { return this.in(X, Y) ? this.d[(Y * this.w + X) * 4 + 3] : 0; }
  get(X, Y) { const i = (Y * this.w + X) * 4, d = this.d; return hex(d[i], d[i + 1], d[i + 2]); }
  put(X, Y, c) {
    if (!c || !this.in(X, Y)) return;
    const [r, g, b, a] = rgba(c), d = this.d, i = (Y * this.w + X) * 4;
    if (a >= 255 || d[i + 3] === 0) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a; return; }
    const sa = a / 255;
    for (let k = 0; k < 3; k++) d[i + k] = [r, g, b][k] * sa + d[i + k] * (1 - sa);
  }
  toCanvas() {
    const c = canvas(this.w, this.h), x = c.getContext('2d'), img = x.createImageData(this.w, this.h);
    img.data.set(this.d);
    x.putImageData(img, 0, 0);
    return c;
  }
}

// ---------- bút vẽ (toạ độ bộ thường, k = 1 hoặc 2) ----------
function pen(P, k) {
  const fill = (col, X0, Y0, X1, Y1) => {
    for (let Y = Y0; Y < Y1; Y++) for (let X = X0; X < X1; X++) P.put(X, Y, typeof col === 'function' ? col(X / k, Y / k, X, Y) : col);
  };
  return {
    k,
    // mảng: cạnh nhỏ hơn 1 đơn vị thì chỉ vẽ ở bộ 2x
    R(col, x, y, w = 1, h = 1) {
      if (k === 1 && (w < 1 || h < 1)) return;
      fill(col, Math.floor(x * k), Math.floor(y * k), Math.floor((x + w) * k), Math.floor((y + h) * k));
    },
    // đường mảnh: bộ thường 1 điểm, bộ 2x đúng nửa đơn vị
    T(col, x, y, w, h) {
      if (k === 1) fill(col, Math.floor(x), Math.floor(y), Math.floor(x) + Math.max(1, Math.round(w)), Math.floor(y) + Math.max(1, Math.round(h)));
      else fill(col, Math.floor(x * 2), Math.floor(y * 2), Math.floor(x * 2) + Math.max(1, Math.round(w * 2)), Math.floor(y * 2) + Math.max(1, Math.round(h * 2)));
    },
    // elip: điểm có tâm nằm trong (cx, cy, rx, ry)
    E(col, cx, cy, rx, ry) {
      for (let Y = Math.floor((cy - ry) * k); Y < Math.ceil((cy + ry) * k); Y++) for (let X = Math.floor((cx - rx) * k); X < Math.ceil((cx + rx) * k); X++) {
        const dx = ((X + 0.5) / k - cx) / rx, dy = ((Y + 0.5) / k - cy) / ry;
        if (dx * dx + dy * dy <= 1) P.put(X, Y, typeof col === 'function' ? col((X + 0.5) / k, (Y + 0.5) / k, X, Y) : col);
      }
    },
    // điểm ảnh của bộ 2x (toạ độ 2x); bộ thường bỏ qua
    hd(fn) { if (k === 2) fn((col, X, Y, w = 1, h = 1) => fill(col, X, Y, X + w, Y + h)); },
  };
}

// Viền tối 1 điểm quanh hình (ô trống kề 4 phía với ô có màu). Bộ 2x: mép trên / trái nhạt theo màu bên trong.
function outline(P, sel) {
  const { w, h } = P, solid = (X, Y) => P.a(X, Y) >= 160;
  const marks = [];
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    if (solid(X, Y)) continue;
    if (!(solid(X + 1, Y) || solid(X - 1, Y) || solid(X, Y + 1) || solid(X, Y - 1))) continue;
    let c = OUT;
    if (sel && solid(X, Y + 1) && !solid(X, Y - 1)) c = mix(P.get(X, Y + 1), OUT, 0.68);
    else if (sel && solid(X + 1, Y) && !solid(X - 1, Y)) c = mix(P.get(X + 1, Y), OUT, 0.78);
    marks.push([X, Y, c]);
  }
  for (const [X, Y, c] of marks) { P.d.fill(0, (Y * w + X) * 4, (Y * w + X) * 4 + 4); P.put(X, Y, c); }
}

function make(k, draw) {
  const P = new Pix(16 * k, 24 * k);
  draw(pen(P, k));
  outline(P, k === 2);
  return P.toCanvas();
}

// ---------- chi tiết dùng chung ----------
const H = (x, y) => hash(Math.floor(x * 7), Math.floor(y * 13));
// cột gỗ đứng: sáng bên trái, tối bên phải, vân dọc ở bộ 2x
function post(g, x, y, w, h, W = WOOD) {
  g.R(W[1], x, y, w, h);
  g.R(W[2], x, y, Math.max(0.5, w / 2), h);
  g.R(W[3], x, y, 0.5, h);
  g.R(W[0], x + w - 0.5, y, 0.5, h);
  g.hd(N => { for (let Y = y * 2 + 2; Y < (y + h) * 2 - 1; Y += 5) N(W[0], Math.floor((x + w / 2) * 2), Y, 1, 2); });
}
// khúc gỗ nằm ngang: đầu khúc có vòng tuổi
function log(g, x, y, w, h, W = WOOD) {
  g.R(W[1], x, y, w, h);
  g.R(W[2], x, y, w, Math.max(0.5, h / 2));
  g.R(W[3], x + 0.5, y, w - 1, 0.5);
  g.R(W[0], x, y + h - 0.5, w, 0.5);
  g.hd(N => { for (let X = x * 2 + 3; X < (x + w) * 2 - 2; X += 6) N(W[0], X, Math.floor((y + h / 2) * 2), 2, 1); });
}
// mặt nước trong miệng giếng
function water(g, cx, cy, rx, ry) {
  g.E('#1a1008', cx, cy, rx, ry);
  g.E(WATER[1], cx, cy + 0.25, rx - 0.75, ry - 0.5);
  g.R(WATER[0], cx - rx + 1, cy - ry + 0.5, rx * 2 - 2, 0.5);
  g.R(WATER[2], cx - rx + 1.5, cy, 2, 0.5);
  g.R(WATER[3], cx - rx + 2, cy, 1, 0.5);
  g.R(WATER[2], cx + 1, cy + 0.5, 1.5, 0.5);
}
function tuft(g, x, y) {   // cỏ dưới chân
  g.R(GRASS[0], x, y, 1.5, 1);
  g.R(GRASS[1], x, y - 0.5, 0.5, 1); g.R(GRASS[1], x + 1, y - 1, 0.5, 1.5);
  g.R(GRASS[2], x + 0.5, y - 0.5, 0.5, 0.5);
}

// ---------- Cấp 1: Giếng đất — gò đất nện, vành khúc gỗ, giá chữ A buộc dây, gàu tre đan ----------
function well1(g) {
  // giá gỗ: hai chạc chống, đòn ngang
  post(g, 2, 4, 1.5, 12);
  post(g, 12.5, 4, 1.5, 12);
  g.R(WOOD[0], 1.5, 3.5, 1, 1); g.R(WOOD[0], 3, 3.5, 1, 1);         // chạc
  g.R(WOOD[0], 12, 3.5, 1, 1); g.R(WOOD[0], 13.5, 3.5, 1, 1);
  log(g, 1, 4, 14, 1.5);
  g.T(ROPE[0], 2.5, 4, 0.5, 1.5); g.T(ROPE[0], 13, 4, 0.5, 1.5);    // dây buộc đòn
  // dây gàu
  g.T(ROPE[1], 8, 5.5, 0.5, 4.5); g.R(ROPE[2], 8.5, 5.5, 0.5, 4.5);
  // gò đất
  g.E((x, y) => (y > 20.5 ? EARTH[0] : y > 18.5 ? EARTH[1] : EARTH[2]), 8, 18.5, 7, 4.5);
  g.E((x, y, X, Y) => (H(x, y) < 0.12 ? EARTH[1] : H(x * 3, y) > 0.92 ? EARTH[3] : null), 8, 19, 6.5, 3.5);   // sỏi lổn nhổn
  g.R(EARTH[3], 2.5, 16, 3, 0.5); g.R(EARTH[3], 2, 16.5, 1, 1);
  // vành khúc gỗ quanh miệng
  g.E(WOOD[1], 8, 16.25, 6, 2.25);
  g.E(WOOD[2], 8, 16, 5.75, 1.75);
  g.hd(N => { for (const X of [5, 10, 16, 21, 26]) N(WOOD[0], X, 30, 1, 3); });
  g.R(WOOD[3], 4, 14.5, 3, 0.5); g.R(WOOD[3], 9, 14, 3, 0.5);
  water(g, 8, 16.25, 4.25, 1.5);
  // gàu tre đan treo trên miệng giếng
  g.R(THATCH[1], 6, 10, 5, 2);
  g.R(THATCH[1], 6.5, 12, 4, 1);
  g.R((x, y, X, Y) => ((X + Y) % 2 ? THATCH[2] : THATCH[1]), 6, 10, 5, 2);
  g.R((x, y, X, Y) => ((X + Y) % 2 ? THATCH[1] : THATCH[0]), 6.5, 12, 4, 1);
  g.R(THATCH[3], 6, 10, 5, 0.5); g.R(THATCH[0], 6, 9.5, 5, 0.5);
  g.T(ROPE[0], 6, 9, 0.5, 1); g.T(ROPE[0], 10.5, 9, 0.5, 1); g.R(ROPE[1], 6.5, 9, 4, 0.5);   // quai
  tuft(g, 1, 21.5); tuft(g, 13, 22);
}

// ---------- Cấp 2: Giếng xây — thành gạch tròn, nắp đá, mái ngói, tời quay, xô gỗ ----------
function well2(g) {
  post(g, 1.5, 4, 1.5, 9);
  post(g, 13, 4, 1.5, 9);
  // mái ngói
  const rows = [[4, 0.5, 8], [3, 1.5, 10], [2, 2.5, 12], [1, 3.5, 14]];
  for (const [x, y, w] of rows) {
    g.R(TILE[1], x, y, w, 1);
    g.R(TILE[2], x, y, w, 0.5);
    g.hd(N => { for (let X = x * 2 + 1; X < (x + w) * 2; X += 3) N(TILE[0], X, y * 2, 1, 2); });
  }
  g.R(TILE[3], 4.5, 0.5, 4, 0.5);
  g.R(TILE[0], 0.5, 4.5, 15, 0.5); g.R(TILE[0], 1, 4.5, 14, 1);
  // tời quay: trục gỗ, tay quay sắt bên phải
  log(g, 3, 6, 10, 1.5);
  g.R(ROPE[1], 6, 6, 3, 1.5); g.hd(N => { for (let X = 12; X < 18; X += 2) N(ROPE[0], X, 12, 1, 3); });
  g.R(IRON[2], 14.5, 6.5, 1, 0.5); g.R(IRON[1], 15, 6.5, 0.5, 2.5); g.R(IRON[3], 15, 8.5, 0.5, 0.5);
  // dây + xô gỗ đai sắt
  g.T(ROPE[1], 7.5, 7.5, 0.5, 2); g.R(ROPE[2], 8, 7.5, 0.5, 2);
  g.R(WOOD[1], 6, 9.5, 4, 2.5); g.R(WOOD[2], 6, 9.5, 2, 2.5); g.R(WOOD[3], 6, 9.5, 0.5, 2.5);
  g.R(IRON[2], 6, 10, 4, 0.5); g.R(IRON[2], 6, 11, 4, 0.5); g.R(WATER[2], 6.5, 9.5, 3, 0.5);
  // thành gạch: hàng gạch so le, bên phải tối dần như mặt tròn
  g.R((x, y, X, Y) => {
    const row = Math.floor((y - 14) / 1.5), off = row % 2 ? 1.5 : 0;
    const morter = (Y % 3 === 2 && g.k === 2) || ((Math.floor(x + off) % 3 === 0) && Math.floor(x * g.k) % g.k === 0);
    const base = x < 4 ? BRICK[3] : x > 12 ? BRICK[1] : BRICK[2];
    return morter ? mix(STONE[2], OUT, x > 12 ? 0.3 : 0.1) : H(x, y) < 0.15 ? mix(base, BRICK[0], 0.3) : base;
  }, 1, 14.5, 14, 8.5);
  if (g.k === 1) for (const y of [16, 18, 20]) g.R(mix(STONE[2], OUT, 0.15), 1, y, 14, 1);
  // nắp đá quanh miệng
  g.R(STONE[2], 0.5, 12.5, 15, 2); g.R(STONE[3], 0.5, 12.5, 15, 0.5); g.R(STONE[1], 0.5, 14, 15, 0.5);
  g.R(STONE[3], 1, 12.5, 4, 0.5);
  water(g, 8, 13.5, 5.5, 1.1);
  g.R(STONE[0], 13, 14.5, 2, 8);   // bóng phía phải
  g.R(BRICK[0], 13.5, 15, 1.5, 7.5);
  tuft(g, 0.5, 22.5);
}

// ---------- Cấp 3: Bơm tay — bệ xi măng, thân bơm gang sơn xanh, cần bơm dài, vòi, xô tôn hứng nước ----------
function well3(g) {
  // bệ xi măng
  g.R(CONC[2], 1, 18, 14, 2.5);
  g.R(CONC[3], 1, 18, 14, 0.5); g.R(CONC[3], 1, 18, 0.5, 2.5);
  g.R(CONC[1], 1, 20.5, 14, 2); g.R(CONC[0], 1, 22, 14, 0.5);
  g.hd(N => { for (const [X, Y] of [[6, 37], [20, 38], [26, 42], [9, 42]]) N(CONC[1], X, Y, 2, 1); });
  g.E('#4f8ac8', 12, 19.5, 2.25, 0.75); g.R(WATER[2], 11, 19.25, 1.5, 0.5);   // vũng nước dưới vòi
  // thân bơm
  g.R(PUMP[1], 5, 17, 5, 1.5); g.R(PUMP[2], 5, 17, 5, 0.5);                  // đế
  g.R(PUMP[1], 6, 7, 3, 10.5);
  g.R(PUMP[2], 6, 7, 1.5, 10.5); g.R(PUMP[3], 6, 7, 0.5, 10.5); g.R(PUMP[0], 8.5, 7, 0.5, 10.5);
  g.R(PUMP[0], 6, 12.5, 3, 0.5); g.R(PUMP[3], 6, 13, 3, 0.5);                // gờ giữa thân
  g.R(PUMP[1], 5.5, 5.5, 4, 1.5); g.R(PUMP[2], 5.5, 5.5, 4, 0.5); g.R(PUMP[3], 6, 5.5, 1.5, 0.5);   // nắp
  // vòi
  g.R(PUMP[1], 9, 9, 3.5, 1.5); g.R(PUMP[2], 9, 9, 3.5, 0.5);
  g.R(PUMP[1], 11.5, 10.5, 1.5, 1.5); g.R(PUMP[0], 12.5, 10.5, 0.5, 1.5);
  g.R(WATER[2], 12, 12, 0.5, 4); g.R(WATER[3], 12, 13, 0.5, 1);                // dòng nước nhỏ (2x)
  // cần bơm: chốt ở nắp, chĩa lên trái
  g.R(IRON[1], 6.5, 4.5, 1.5, 1);
  for (let i = 0; i < 5; i++) g.R(IRON[2], 5.5 - i, 4 - i * 0.75, 1.5, 1);
  g.R(IRON[3], 1, 0.5, 1.5, 1); g.R(IRON[4], 1, 0.5, 0.5, 0.5);
  g.hd(N => { for (let i = 0; i < 5; i++) N(IRON[3], 11 - i * 2, 8 - Math.round(i * 1.5), 2, 1); });
  // xô tôn dưới vòi
  g.R(IRON[2], 10.5, 15, 4, 3.5); g.R(IRON[3], 10.5, 15, 1.5, 3.5); g.R(IRON[4], 10.5, 15, 0.5, 3.5);
  g.R(IRON[1], 13.5, 15, 1, 3.5); g.R(IRON[1], 10.5, 16.5, 4, 0.5);
  g.R(WATER[1], 11, 14.5, 3, 0.5); g.R(IRON[3], 10.5, 14.5, 0.5, 0.5);
  tuft(g, 0.5, 22.5); tuft(g, 14, 22.5);
}

// ---------- Cấp 4: Máy bơm — bệ xi măng, đầu bơm gang xám, mô tơ điện xanh có cánh tản nhiệt, ống ra có van đỏ, cột điện kéo dây ----------
function well4(g) {
  // bệ
  g.R(CONC[2], 1, 18.5, 14, 2); g.R(CONC[3], 1, 18.5, 14, 0.5); g.R(CONC[3], 1, 18.5, 0.5, 2);
  g.R(CONC[1], 1, 20.5, 14, 2); g.R(CONC[0], 1, 22, 14, 0.5);
  g.hd(N => { for (const [X, Y] of [[5, 41], [22, 42], [15, 38]]) N(CONC[1], X, Y, 2, 1); });
  // cột điện gỗ, xà ngang, sứ cách điện
  post(g, 13, 1.5, 1.5, 17.5);
  log(g, 11, 1.5, 4, 1);
  g.R('#f4f0e4', 11, 0.5, 1, 1); g.R('#b8b4a8', 11.5, 1, 0.5, 0.5);
  // dây điện võng xuống hộp đấu dây trên mô tơ
  for (let t = 0; t <= 1.001; t += g.k === 2 ? 0.07 : 0.15) g.T('#26262c', 11.25 - 2.5 * t, 1.5 + 8 * t - Math.sin(t * Math.PI) * 0.8, 0.5, 0.5);
  // ống ra: lên rồi rẽ phải, mặt bích chờ nối bồn
  g.R(IRON[2], 2.5, 5, 1.5, 7); g.R(IRON[3], 2.5, 5, 0.5, 7); g.R(IRON[1], 3.5, 5, 0.5, 7);
  g.R(IRON[2], 2.5, 5, 7, 1.5); g.R(IRON[3], 2.5, 5, 7, 0.5); g.R(IRON[1], 2.5, 6, 7, 0.5);
  g.R(IRON[1], 9, 4.5, 1, 2.5); g.R(IRON[3], 9, 4.5, 0.5, 2.5);
  // van tay đỏ
  g.E('#9e2416', 3.25, 8.5, 2, 0.9); g.R('#e5452f', 1.75, 8, 3, 0.5); g.R('#ff8a6a', 2, 8, 1, 0.5);
  // mô tơ: thân trụ nằm ngang
  g.R(MOTOR[1], 5.5, 11, 7, 6);
  g.R(MOTOR[2], 5.5, 11, 7, 1.5); g.R(MOTOR[3], 5.5, 11, 7, 0.5); g.R(MOTOR[0], 5.5, 16, 7, 1);
  g.hd(N => { for (let X = 13; X < 23; X += 2) N(MOTOR[0], X, 25, 1, 6); });
  if (g.k === 1) for (const x of [7, 9]) g.R(MOTOR[0], x, 13, 1, 2);
  g.R(MOTOR[0], 11.5, 11, 1, 6); g.hd(N => { for (let Y = 23; Y < 33; Y += 2) N(MOTOR[1], 23, Y, 1, 1); });   // nắp quạt có lưới
  g.R('#f7d547', 9.5, 13.5, 1.5, 1.5); g.R('#d19a1c', 10.5, 14, 0.5, 1);     // tem điện vàng
  g.hd(N => { N(OUT, 20, 28, 1, 1); N(OUT, 19, 29, 2, 1); N(OUT, 20, 30, 1, 1); });   // tia sét nhỏ
  g.R(IRON[2], 7.5, 9.5, 2.5, 1.5); g.R(IRON[3], 7.5, 9.5, 2.5, 0.5);        // hộp đấu dây
  g.R(IRON[1], 6, 17, 1.5, 1.5); g.R(IRON[1], 10.5, 17, 1.5, 1.5);            // chân đế
  // đầu bơm gang xám (bên trái) + ống hút cắm xuống bệ
  g.R(IRON[1], 2.5, 17, 2, 2); g.R(IRON[2], 2, 18, 3, 1);
  g.E(IRON[2], 3.5, 14.25, 2.5, 3);
  g.E(IRON[3], 3, 13.5, 1.5, 1.75); g.R(IRON[4], 2, 12.5, 1, 0.5);
  g.R(IRON[1], 5.5, 12.5, 0.5, 3.5);
  tuft(g, 0.5, 22.5);
}

const DRAW = [well1, well2, well3, well4];
const build = k => DRAW.map(d => make(k, d));
const NODOC = typeof document === 'undefined';
export const WELLS = NODOC ? [] : build(1);      // 16x24, theo cấp 1..4
export const WELLS_HD = NODOC ? [] : build(2);   // 32x48
// Dùng lại cho bồn chứa, trạm bơm, ống nước (arttank.js, issue 57)
export { Pix, pen, outline, mix, OUT, IRON, CONC, WATER, GRASS, WOOD, tuft };
