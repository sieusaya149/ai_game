// Art nhà kính (issue 60): nhà kính phủ một khối ruộng 3×3 (48×48 điểm ảnh), có mái kính và cửa.
//   house / houseBroken 48×64: mái kính + vách trước có cửa (vẽ ở góc khối, lùi lên 16: chân vách trùng mép dưới khối).
//     Đứng ngoài thì phủ kín; bước vào thì render làm mờ dần rồi ẩn. houseBroken: bão làm vỡ vài tấm kính.
//   base / baseBroken 48×48: khung chân nhà kính nằm trên đất (vẫn thấy khi mái ẩn), bản vỡ có mảnh kính rơi.
//   board 46×10: bảng gỗ trạng thái ở cửa, bốn ô biểu tượng 💧 khô · 🐛 sâu · ✨ chín · 🥀 héo; số vẽ bằng digits[0..9] 3×5.
//   icon.{dry, bug, ripe, rotten} 6×6 · alert[0..1] 11×13: bong bóng "!" nhấp nháy trên mái khi có việc gấp · card 16×16 cho khay xây.
// Mỗi hình vẽ hai bản bằng cùng một hàm: k = 1 (bộ thường) và k = 2 (bản 2x kiểu A, gấp đôi chính xác, thêm chi tiết),
// rồi nối cặp qua hd.js linkPair nên chỗ vẽ (render put) tự chọn bản 2x. Phong cách như art13 / artw: viền tối 1px
// (mép hứng sáng trên-trái nhạt hơn), mỗi mảng 4 sắc độ, sáng từ trên-trái, lưới điểm đều, không chuyển màu mịn.
import { canvas } from './art.js';
import { linkPair } from './hd.js';

// ---------- màu ----------
const PC = new Map();
function col(c) {
  let v = PC.get(c);
  if (v) return v;
  if (c[0] === '#') { const n = parseInt(c.slice(1), 16); v = [n >> 16, (n >> 8) & 255, n & 255, 255]; }
  else { const m = c.match(/[\d.]+/g).map(Number); v = [m[0], m[1], m[2], Math.round((m[3] ?? 1) * 255)]; }
  PC.set(c, v);
  return v;
}
// [viền, tối, gốc, sáng, điểm sáng]
const FRAME = ['#2c3842', '#7d8d9a', '#bccad5', '#e6eef4', '#ffffff'];   // khung nhôm sơn trắng
const ROOF = ['#2f5a66', '#4f8c9b', '#7fbccb', '#b5e2ea', '#e8fbfd'];    // kính mái: phản trời
const WALL = ['#24484c', '#3c6d70', '#5c9690', '#8cc2b8', '#d2efe8'];    // kính vách trước: thấy lờ mờ bên trong
const LEAF = ['#1f4a1c', '#2f6b28', '#4b9a3a', '#7cc45a'];
const WOOD = ['#3b2412', '#6b4020', '#9a6634', '#c48a4a', '#e6b06e'];
const STONE = ['#3e3a36', '#6e665e', '#9a9086', '#c4bab0'];
const HOLE = ['#141d16', '#1f2b22', '#2c3d2e'];   // lỗ kính vỡ: tối, thấy lá bên trong
const CRACK = '#f4ffff';

// ---------- lớp điểm ảnh có hệ số k ----------
// Toạ độ "thô" (theo bộ thường) nhân k khi vẽ; hàm có chữ F nhận toạ độ điểm ảnh thật (chi tiết riêng của bản 2x).
class Layer {
  constructor(w, h, k) { this.k = k; this.w = w * k; this.h = h * k; this.d = new Uint8ClampedArray(this.w * this.h * 4); }
  ok(X, Y) { return X >= 0 && Y >= 0 && X < this.w && Y < this.h; }
  a(X, Y) { return this.ok(X, Y) ? this.d[(Y * this.w + X) * 4 + 3] : 0; }
  set(X, Y, c) {
    if (c == null || !this.ok(X, Y)) return;
    const v = col(c), i = (Y * this.w + X) * 4, d = this.d;
    if (v[3] >= 255 || d[i + 3] === 0) { d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = v[3]; return; }
    const sa = v[3] / 255, da = d[i + 3] / 255, oa = sa + da * (1 - sa);
    for (let n = 0; n < 3; n++) d[i + n] = (v[n] * sa + d[i + n] * da * (1 - sa)) / oa;
    d[i + 3] = oa * 255;
  }
  clr(X, Y) { if (this.ok(X, Y)) this.d.fill(0, (Y * this.w + X) * 4, (Y * this.w + X) * 4 + 4); }
  rF(c, X, Y, w = 1, h = 1) { for (let y = Y; y < Y + h; y++) for (let x = X; x < X + w; x++) this.set(x, y, c); return this; }
  r(c, x, y, w = 1, h = 1) { const k = this.k; return this.rF(c, Math.round(x * k), Math.round(y * k), Math.round(w * k), Math.round(h * k)); }
  // một điểm ảnh thật ở toạ độ thô (đường mảnh không dày lên ở bản 2x)
  dot(c, x, y) { return this.rF(c, Math.round(x * this.k), Math.round(y * this.k)); }
  // elip (toạ độ thô), fn(dx, dy) chọn màu theo vị trí chuẩn hoá -1..1
  e(cx, cy, rx, ry, fn) {
    const k = this.k, CX = cx * k, CY = cy * k, RX = rx * k, RY = ry * k;
    for (let y = Math.floor(CY - RY - 1); y <= Math.ceil(CY + RY + 1); y++) for (let x = Math.floor(CX - RX - 1); x <= Math.ceil(CX + RX + 1); x++) {
      const dx = (x + 0.5 - CX) / RX, dy = (y + 0.5 - CY) / RY;
      if (dx * dx + dy * dy <= 1) this.set(x, y, typeof fn === 'string' ? fn : fn(dx, dy, x, y));
    }
    return this;
  }
  // đường thẳng (toạ độ thô), nét dày t điểm thật
  line(c, x0, y0, x1, y1, t = 1) {
    const k = this.k, n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * k * 2) + 1;
    for (let i = 0; i <= n; i++) {
      const X = Math.round((x0 + (x1 - x0) * i / n) * k), Y = Math.round((y0 + (y1 - y0) * i / n) * k);
      this.rF(c, X - Math.floor((t - 1) / 2), Y - Math.floor((t - 1) / 2), t, t);
    }
    return this;
  }
  // viền 1px quanh phần đặc: mép dưới / phải (khuất sáng) đậm, mép trên / trái (hứng sáng) nhạt hơn
  outline(dark, light = dark) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.a(x, y) > 127) continue;
      const up = this.a(x, y - 1) > 127, dn = this.a(x, y + 1) > 127, lf = this.a(x - 1, y) > 127, rt = this.a(x + 1, y) > 127;
      if (!(up || dn || lf || rt)) continue;
      add.push([x, y, (dn || rt) && !up && !lf ? light : dark]);
    }
    for (const [x, y, c] of add) this.set(x, y, c);
    return this;
  }
  put(o, ox = 0, oy = 0) {   // ox, oy: điểm thật
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
      const i = (y * o.w + x) * 4;
      if (!o.d[i + 3]) continue;
      this.set(x + ox, y + oy, `rgba(${o.d[i]},${o.d[i + 1]},${o.d[i + 2]},${o.d[i + 3] / 255})`);
    }
    return this;
  }
  cv() {
    const c = canvas(this.w, this.h), x = c.getContext('2d'), im = x.createImageData(this.w, this.h);
    im.data.set(this.d); x.putImageData(im, 0, 0);
    return c;
  }
}
const L = (w, h, k) => new Layer(w, h, k);
// số giả ngẫu nhiên cố định theo toạ độ (vân, mảnh kính)
const rnd = (a, b) => { let h = Math.imul(a + 17, 374761393) + Math.imul(b + 31, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------- tấm kính ----------
// Tấm kính (toạ độ thô x, y, w, h) màu ramp: sáng dần lên mép trên-trái, mép dưới-phải tối, vệt phản chiếu chéo.
// shine: vị trí vệt sáng (0..1 theo chiều ngang) hoặc null; inside: vẽ lờ mờ lá cây bên trong (vách trước).
function pane(l, x, y, w, h, ramp, { shine = null, inside = false, seed = 0, tone = 0, crops = false } = {}) {
  const k = l.k, X = Math.round(x * k), Y = Math.round(y * k), W = Math.round(w * k), H = Math.round(h * k);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const t = (j / H) * 0.75 + (i / W) * 0.25 + tone;   // trên-trái sáng, dưới-phải tối; tone > 0: cả tấm tối hơn (xa nóc)
    l.set(X + i, Y + j, t < 0.22 ? ramp[3] : t < 0.62 ? ramp[2] : ramp[1]);
  }
  if (inside) {   // lá cây sau lớp kính: vài chùm lá ở nửa dưới tấm
    for (let n = 0; n < 3; n++) {
      const cx = x + w * (0.2 + 0.3 * n + rnd(seed, n) * 0.1), cy = y + h - 1.6 - rnd(n, seed) * 1.2, r = 1.4 + rnd(seed + n, 3) * 0.8;
      l.e(cx, cy, r, r * 0.9, (dx, dy) => (dy < -0.3 && dx < 0.2 ? 'rgba(124,196,90,0.55)' : 'rgba(47,107,40,0.6)'));
    }
  }
  if (crops) {   // nhìn qua mái: ngọn cây bên trong lờ mờ (tròn, nhìn từ trên xuống)
    for (let n = 0; n < 2; n++) {
      const cx = x + w * (0.3 + 0.4 * n) + (rnd(seed, n) - 0.5), cy = y + h * (0.4 + rnd(n, seed) * 0.3), r = 1.3 + rnd(seed + n, 7) * 0.7;
      l.e(cx, cy, r, r * 0.85, (dx, dy) => (dy < -0.25 && dx < 0.25 ? 'rgba(124,196,90,0.32)' : 'rgba(47,107,40,0.34)'));
    }
  }
  // mép trong của khung: viền sáng trên-trái, tối dưới-phải (bản 2x thêm một điểm mép gốc cho dày dặn)
  l.rF(ramp[4], X, Y, W, 1).rF(ramp[3], X, Y + 1, 1, H - 1);
  l.rF(ramp[0], X, Y + H - 1, W, 1).rF(ramp[1], X + W - 1, Y + 1, 1, H - 2);
  if (k === 2) l.rF(ramp[3], X + 1, Y + 1, W - 2, 1);
  if (shine != null) {   // vệt phản chiếu chéo từ dưới-trái lên trên-phải
    const sx = X + Math.round(W * shine);
    for (let j = 1; j < H - 1; j++) {
      const px = sx + Math.round((H - j) * 0.55) - Math.round(H * 0.3);
      if (px > X && px < X + W - 1) l.set(px, Y + j, 'rgba(255,255,255,0.7)');
      if (k === 2 && px + 1 > X && px + 1 < X + W - 1) l.set(px + 1, Y + j, 'rgba(255,255,255,0.35)');
      if (k === 2 && px + 3 > X && px + 3 < X + W - 1 && j % 2) l.set(px + 3, Y + j, 'rgba(255,255,255,0.3)');
    }
  }
}
// Thanh khung nhôm (toạ độ thô), ngang hay dọc: mặt trên / trái sáng, dưới / phải tối
function bar(l, x, y, w, h) {
  const k = l.k, X = Math.round(x * k), Y = Math.round(y * k), W = Math.round(w * k), H = Math.round(h * k);
  l.rF(FRAME[2], X, Y, W, H);
  if (W >= H) { l.rF(FRAME[3], X, Y, W, 1); if (H > 1) l.rF(FRAME[1], X, Y + H - 1, W, 1); }
  else { l.rF(FRAME[3], X, Y, 1, H); if (W > 1) l.rF(FRAME[1], X + W - 1, Y, 1, H); }
}
// Lỗ kính vỡ trong tấm (toạ độ thô): mảng tối răng cưa, mép kính gãy sáng, vết nứt tỏa ra
function smash(l, x, y, w, h, seed) {
  const k = l.k, cx = x + w * (0.35 + rnd(seed, 1) * 0.3), cy = y + h * (0.35 + rnd(seed, 2) * 0.3);
  const rx = w * 0.42, ry = h * 0.4;
  l.e(cx, cy, rx, ry, (dx, dy, X, Y) => {
    const a = Math.atan2(dy, dx), r = Math.hypot(dx, dy), jag = 0.72 + 0.28 * Math.abs(Math.sin(a * 5 + seed));
    if (r > jag) return null;
    return dy < -0.2 ? HOLE[0] : (X + Y) % 5 === 0 ? HOLE[2] : HOLE[1];
  });
  l.e(cx + rx * 0.2, cy + ry * 0.45, rx * 0.45, ry * 0.3, (dx, dy) => (dy < 0 ? 'rgba(75,154,58,0.8)' : 'rgba(47,107,40,0.8)'));   // lá bên trong lấp ló
  // mép gãy: điểm sáng quanh lỗ
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2 + seed, rr = 0.72 + 0.28 * Math.abs(Math.sin(a * 5 + seed));
    l.dot(CRACK, cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr);
  }
  // vết nứt tỏa ra tới mép tấm
  for (let i = 0; i < 4; i++) {
    const a = rnd(seed, i + 5) * Math.PI * 2, x1 = Math.max(x + 0.5, Math.min(x + w - 0.5, cx + Math.cos(a) * w)), y1 = Math.max(y + 0.5, Math.min(y + h - 0.5, cy + Math.sin(a) * h));
    l.line(k === 2 ? 'rgba(244,255,255,0.9)' : CRACK, cx + Math.cos(a) * rx * 0.8, cy + Math.sin(a) * ry * 0.8, x1, y1, 1);
  }
}

// ---------- nhà kính 48×64 (mái + vách trước) ----------
const COLS = [1, 10, 19, 28, 37, 46];        // các thanh dọc của mái (x thô)
const ROWS = [4, 14, 24, 34];               // các thanh ngang của mái (y thô)
const WCOLS = [1, 9, 16, 31, 38, 46];       // thanh dọc của vách trước; cửa giữa 16..31
const BROKEN_ROOF = [[1, 0], [3, 1], [0, 2]];   // [cột, hàng] tấm mái bị vỡ
const BROKEN_WALL = [4];                        // tấm vách trước bị vỡ (chỉ số tấm từ trái)
function house(k, broken = false) {
  const l = L(48, 64, k);
  // --- mái ---
  // nóc: thanh nóc nằm ngang, hai đầu hồi tam giác nhỏ
  for (let r = 0; r < ROWS.length - 1; r++) for (let c = 0; c < COLS.length - 1; c++) {
    const x = COLS[c] + 1, y = ROWS[r] + 1, w = COLS[c + 1] - COLS[c] - 1, h = ROWS[r + 1] - ROWS[r] - 1;
    pane(l, x, y, w, h, ROOF, { shine: (c + r) % 2 === 0 ? 0.45 + 0.2 * rnd(c, r) : null, tone: r * 0.12 - 0.08, crops: true, seed: c * 5 + r });
    if (broken && BROKEN_ROOF.some(([bc, br]) => bc === c && br === r)) smash(l, x, y, w, h, c * 7 + r * 3 + 1);
  }
  for (const x of COLS) bar(l, x - (x === 46 ? 0 : 0.5), ROWS[0], 1, ROWS[ROWS.length - 1] - ROWS[0]);   // xà dọc mảnh
  for (const y of ROWS.slice(1, -1)) bar(l, COLS[0], y, COLS[COLS.length - 1] - COLS[0] + 1, 1);
  bar(l, 0.5, 1, 47, 3);                     // thanh nóc
  l.r(FRAME[4], 2, 1, 44, 0.5);              // sáng trên nóc
  if (k === 2) for (let x = 3; x < 46; x += 4) l.dot(FRAME[1], x, 2.5);   // đinh tán trên thanh nóc
  for (const vx of [7, 31]) {                // hai cửa thông gió trên nóc, chống hé: khe tối bên dưới
    l.r('rgba(20,40,40,0.55)', vx, 5, 10, 1.5);
    pane(l, vx, 3.5, 10, 2.5, ROOF, { tone: -0.2 });
    bar(l, vx - 0.5, 3, 11, 0.5); l.r(FRAME[1], vx + 1, 6, 0.5, 0.5).r(FRAME[1], vx + 8.5, 6, 0.5, 0.5);
  }
  bar(l, 0, 34, 48, 2);                      // máng xối ở mép mái
  l.r(FRAME[1], 0, 35.5, 48, 0.5);
  // --- vách trước ---
  const wy = 36, wh = 25;                    // vách từ y 36 tới 61, chân đá 61..64
  for (let i = 0; i < WCOLS.length - 1; i++) {
    if (WCOLS[i] === 16) continue;           // chỗ cửa
    const x = WCOLS[i] + 1, w = WCOLS[i + 1] - WCOLS[i] - 1;
    pane(l, x, wy + 1, w, 12, WALL, { shine: i % 2 ? 0.5 : null, seed: i });
    pane(l, x, wy + 14, w, wh - 14, WALL, { inside: true, seed: i + 9 });
    if (broken && BROKEN_WALL.includes(i)) smash(l, x, wy + 1, w, 12, 40 + i);
  }
  for (const x of WCOLS) bar(l, x - 0.5, wy, 1.5, wh);
  bar(l, 1, wy + 13, 15, 1); bar(l, 31, wy + 13, 15, 1);
  // cửa đôi: khung, hai cánh kính, tay nắm vàng, bậc cửa
  bar(l, 16, wy + 5, 16, 2);                 // đố trên cửa
  for (const [x, s] of [[17, 0], [24, 1]]) {
    pane(l, x, wy + 7, 7, wh - 7, WALL, { shine: s ? null : 0.5, inside: true, seed: 20 + s });
    bar(l, x - 0.5, wy + 7, 1, wh - 7);
  }
  bar(l, 30.5, wy + 7, 1, wh - 7);
  bar(l, 23.5, wy + 7, 1, wh - 7);
  l.r('#f2c63a', 22, wy + 15, 1, 2).r('#f2c63a', 25.5, wy + 15, 1, 2);   // tay nắm
  if (k === 2) l.dot('#fff3a0', 22, wy + 15).dot('#fff3a0', 25.5, wy + 15).dot('#a8761a', 22.5, wy + 16.5).dot('#a8761a', 26, wy + 16.5);
  // chân đá
  for (let x = 0; x < 48; x += 4) {
    if (x >= 16 && x < 32) continue;
    l.r(STONE[2], x, 61, 4, 3).r(STONE[3], x, 61, 4, 0.5).r(STONE[1], x + 3.5, 61, 0.5, 3);
  }
  l.r(STONE[1], 16, 62.5, 16, 1.5).r(STONE[3], 16, 62.5, 16, 0.5);   // bậc cửa
  l.outline(FRAME[0], FRAME[1]);
  return l;
}

// ---------- khung chân trên đất 48×48 (thấy khi mái ẩn) ----------
function base(k, broken = false) {
  const l = L(48, 48, k);
  // bóng đổ mờ phía trong mép
  l.r('rgba(20,40,10,0.18)', 1.5, 1.5, 45, 1).r('rgba(20,40,10,0.18)', 1.5, 2.5, 1, 43);
  // ray nhôm bốn cạnh (chừa cửa giữa mép dưới)
  bar(l, 0, 0, 48, 1.5); bar(l, 0, 0, 1.5, 48); bar(l, 46.5, 0, 1.5, 48);
  bar(l, 0, 46.5, 16, 1.5); bar(l, 32, 46.5, 16, 1.5);
  // chân cột: góc, giữa các cạnh, hai bên cửa
  for (const [x, y] of [[0, 0], [45, 0], [0, 45], [45, 45], [22.5, 0], [0, 22.5], [45, 22.5], [14, 45], [31, 45]]) {
    l.r(FRAME[1], x, y, 3, 3).r(FRAME[3], x, y, 3, 1).r(FRAME[2], x + 0.5, y + 1, 2, 1.5);
    if (k === 2) l.dot(FRAME[4], x + 0.5, y + 0.5);
  }
  // bậc cửa bằng đá
  l.r(STONE[2], 17, 46, 14, 2).r(STONE[3], 17, 46, 14, 0.5).r(STONE[1], 17, 47.5, 14, 0.5);
  if (broken) {   // mảnh kính rơi trên đất
    for (let i = 0; i < 14; i++) {
      const x = 3 + rnd(i, 11) * 42, y = 3 + rnd(13, i) * 42, s = 0.8 + rnd(i, 17) * 1.2;
      l.line(ROOF[3], x, y, x + s, y - s * 0.6, k === 2 ? 2 : 1);
      l.dot(ROOF[4], x + s * 0.5, y - s * 0.3);
    }
  }
  return l;
}

// ---------- bảng trạng thái 46×10 và biểu tượng 6×6 ----------
const DROP = ['#173f6e', '#2f74c4', '#5fa8ec', '#a8d8ff', '#ecf8ff'];
const BUGC = ['#24461a', '#4a8a2a', '#7cc04a', '#b6e07a'];
const GOLD = ['#7a4a0a', '#c08a16', '#f2c63a', '#ffe680', '#fffbe0'];
const WILT = ['#4a1a2a', '#8a3a52', '#b8607a', '#e09aae'];   // cánh hoa hồng úa
const STEM = ['#3a3a12', '#7a7a2a', '#a8a046'];   // cuống, lá khô vàng úa
const icons = {
  dry(k) {   // giọt nước
    const l = L(6, 6, k);
    l.e(3, 3.9, 2.1, 2.0, (dx, dy) => (dx < -0.2 && dy < -0.1 ? DROP[3] : dy > 0.45 || dx > 0.55 ? DROP[1] : DROP[2]));
    l.line(DROP[2], 3, 0.6, 1.4, 3.1, k).line(DROP[2], 3, 0.6, 4.6, 3.1, k).r(DROP[2], 2.5, 1.2, 1, 2);
    l.dot(DROP[4], 2, 3.2);
    if (k === 2) l.dot(DROP[3], 2.5, 2.4).dot(DROP[4], 2, 3.7);
    l.outline(DROP[0]);
    return l;
  },
  bug(k) {   // sâu xanh ba đốt, đầu đỏ nâu
    const l = L(6, 6, k);
    for (const [x, y] of [[1.4, 4], [2.9, 3.6], [4.3, 3.1]]) l.e(x, y, 1.1, 1.0, (dx, dy) => (dy < -0.35 ? BUGC[3] : dy > 0.4 ? BUGC[1] : BUGC[2]));
    l.e(4.8, 2.1, 0.9, 0.9, (dx, dy) => (dy < -0.2 ? '#c96a3a' : '#9a3a1e'));
    l.dot('#1a1a1a', 5, 2);
    if (k === 2) l.dot('#ffffff', 4.6, 1.7).dot(BUGC[1], 1.4, 4.6).dot(BUGC[1], 2.9, 4.2);
    l.outline(BUGC[0], '#3a5a22');
    return l;
  },
  ripe(k) {   // lấp lánh bốn cánh
    const l = L(6, 6, k);
    l.line(GOLD[2], 3, 0.2, 3, 5.8, k).line(GOLD[2], 0.2, 3, 5.8, 3, k);
    l.r(GOLD[3], 2, 2, 2, 2).dot(GOLD[4], 2.5, 2.5);
    if (k === 2) l.line(GOLD[3], 3, 0.6, 3, 2, 1).line(GOLD[3], 0.6, 3, 2, 3, 1).dot(GOLD[4], 5, 1).dot(GOLD[3], 1, 5);
    l.outline(GOLD[0], GOLD[1]);
    return l;
  },
  rotten(k) {   // hoa héo rũ: cuống mọc lên rồi gập sang phải, bông hoa chúc đầu xuống, lá khô rũ, một cánh rơi dưới đất
    const l = L(6, 6, k);
    l.line(STEM[1], 1.5, 5.8, 1.5, 1.8, k).line(STEM[1], 1.5, 1.8, 3.2, 0.8, k).line(STEM[1], 3.2, 0.8, 3.9, 1.6, k);
    l.line(STEM[2], 1.5, 3.6, 0.4, 4.6, k);   // lá rũ
    // bông chúc xuống: ba cánh rủ quanh nhụy vàng úa
    l.e(4.1, 2.9, 1.1, 0.9, (dx, dy) => (dy < -0.3 && dx < 0.2 ? WILT[3] : dy > 0.3 ? WILT[1] : WILT[2]));
    l.r(WILT[2], 3.1, 3.4, 0.7, 1.3).r(WILT[1], 4.0, 3.6, 0.7, 1.4).r(WILT[2], 4.9, 3.3, 0.7, 1.1);
    l.dot('#c9a23a', 4.1, 2.4);
    l.r(WILT[1], 4.6, 5.3, 1, 0.7);   // cánh rơi
    if (k === 2) l.dot(WILT[3], 3.4, 3.6).dot(WILT[3], 5.2, 3.5).dot(STEM[2], 1.2, 2.4).dot(STEM[0], 1.8, 5.4).dot('#e8c45a', 3.8, 2.4);
    l.outline(WILT[0], STEM[0]);
    return l;
  },
};
const ICON_ORDER = ['dry', 'bug', 'ripe', 'rotten'];
// tấm ván: viền tối, mặt ván 4 sắc độ, vân gỗ ngang; mỗi ô (11 thô) một biểu tượng ở x = 2 + 11i, y = 2; số ở x = 9 + 11i, y = 2.5
function board(k) {
  const l = L(46, 10, k);
  l.r(WOOD[2], 0, 0, 46, 10);
  l.r(WOOD[3], 0, 0, 46, 1).r(WOOD[3], 0, 0, 1, 10).r(WOOD[1], 0, 9, 46, 1).r(WOOD[1], 45, 0, 1, 10);
  for (let y = 2; y < 9; y += 3) for (let x = 1; x < 45; x++) if (rnd(x, y) < 0.35) l.dot(WOOD[1], x, y + (k === 2 && rnd(y, x) < 0.5 ? 0.5 : 0));
  if (k === 2) for (let x = 1; x < 45; x += 2) if (rnd(x, 3) < 0.4) l.dot(WOOD[4], x, 0.5);
  for (let i = 1; i < 4; i++) l.r(WOOD[1], i * 11 + 1, 1.5, 0.5, 7);   // vạch chia ô
  ICON_ORDER.forEach((n, i) => l.put(icons[n](k), Math.round((2 + i * 11) * k), Math.round(2 * k)));
  l.outline(WOOD[0], WOOD[1]);
  return l;
}
// chữ số 3×5 kem trên ván (bản 2x: nét đôi, mép dưới-phải tối hơn)
const DIGITS = ['####.##.##.####', '.#.##..#..#.###', '###..#####..###', '###..####..####', '#.##.####..#..#', '####..###..####', '####..####.####', '###..#..#.#..#.', '####.#####.####', '####.####..####'];
function digit(k, n) {
  const l = L(3, 5, k), p = DIGITS[n];
  for (let i = 0; i < 15; i++) if (p[i] === '#') {
    const x = i % 3, y = Math.floor(i / 3);
    l.r('#fff6dc', x, y, 1, 1);
    if (k === 2) l.rF('#e3cfa0', x * 2 + 1, y * 2 + 1);
  }
  return l;
}
// bong bóng "!" 11×13: khung trắng bo góc, đuôi nhọn ở dưới; khung 1 sáng vàng (nhấp nháy)
function alert(k, hot) {
  const l = L(11, 13, k), bg = hot ? ['#ffe680', '#fff3c0'] : ['#fff6dc', '#ffffff'];
  l.r(bg[0], 1, 0, 9, 10).r(bg[0], 0, 1, 11, 8);
  l.r(bg[1], 1, 1, 8, 1).r(bg[1], 1, 1, 1, 7);
  l.r(bg[0], 4, 10, 3, 1).r(bg[0], 5, 11, 1, 1);   // đuôi
  l.r('#e5452f', 4.5, 2, 2, 5).r('#e5452f', 4.5, 8, 2, 1.5);
  if (k === 2) l.rF('#ff8a72', 9, 4, 1, 8).rF('#9e2416', 12, 4, 1, 9).rF('#9e2416', 10, 13, 3, 1).rF('#ff8a72', 9, 16, 1, 1);
  l.outline('#3b2412', '#5c3a1a');
  return l;
}
// icon khay xây dựng 16×16: nhà kính thu nhỏ
function card(k) {
  const l = L(16, 16, k);
  pane(l, 1.5, 3, 6, 5, ROOF, { shine: 0.5 }); pane(l, 8.5, 3, 6, 5, ROOF);
  bar(l, 1, 2, 14, 1); bar(l, 7.5, 2, 1, 6); bar(l, 1, 8, 14, 1);
  pane(l, 1.5, 9, 4, 5, WALL, { inside: true }); pane(l, 10.5, 9, 4, 5, WALL, { inside: true });
  pane(l, 6, 10, 4, 4, WALL);
  bar(l, 5.5, 9, 0.5, 5); bar(l, 10, 9, 0.5, 5);
  l.r(STONE[2], 1, 14, 14, 1.5);
  l.outline(FRAME[0], FRAME[1]);
  return l;
}

// ---------- xuất ----------
const PAIRS = [];
function both(fn, ...args) {
  const a = fn(1, ...args).cv(), b = fn(2, ...args).cv();
  PAIRS.push([a, b]);
  return a;
}
export const GH = {
  house: both(house, false),
  houseBroken: both(house, true),
  base: both(base, false),
  baseBroken: both(base, true),
  board: both(board),
  icon: Object.fromEntries(ICON_ORDER.map(n => [n, both(icons[n])])),
  digits: Array.from({ length: 10 }, (_, n) => both(digit, n)),
  alert: [both(alert, false), both(alert, true)],
  card: both(card),
};
for (const [a, b] of PAIRS) linkPair(a, b);
// Bố cục cho chỗ vẽ: góc vẽ nhà so với góc khối, chỗ ván trạng thái, ô số thứ i trên ván
export const GH_AT = { house: { x: 0, y: -16 }, board: { x: 1, y: 15 }, digit: i => ({ x: 9 + i * 11, y: 3 }), alert: { x: 18, y: -30 } };
// Kiểm cỡ cho trang xem sprite: mọi cặp có đúng 2w×2h không
export const ghPairs = () => PAIRS.map(([a, b]) => ({ w: a.width, h: a.height, w2: b.width, h2: b.height }));
