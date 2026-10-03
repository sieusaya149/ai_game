// Art thời tiết (issue 55): icon HUD từng loại trời, radio trong nhà, bảng tin làng, tờ báo thời tiết, bù nhìn bị bão quật đổ,
// rơm phủ ô ruộng, dấu hại vẽ chồng lên cây (sương muối bám cây hạt / mầm, đất nứt nẻ lúc hạn hán), cầu vồng, tia sét, hơi nóng.
// Mỗi hình vẽ hai bản bằng cùng một hàm: k = 1 (bộ thường) và k = 2 (bản 2x kiểu A, gấp đôi chính xác, thêm chi tiết),
// rồi nối cặp qua hd.js linkPair nên chỗ vẽ (render put, ui hd) tự chọn bản 2x. Phong cách như art13: viền tối 1px
// (mép hứng sáng trên-trái nhạt hơn), mỗi mảng 4 sắc độ, sáng từ trên-trái, lưới điểm đều, không chuyển màu mịn.
import { canvas, hash } from './art.js';
import { linkPair } from './hd.js';

const OUT = '#3b2412';

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

// ---------- lớp điểm ảnh có hệ số k ----------
// Toạ độ "thô" (x, y theo bộ thường) nhân k khi vẽ; hàm có chữ F nhận toạ độ điểm ảnh thật (chi tiết riêng của bản 2x).
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
  rF(c, X, Y, w = 1, h = 1) { for (let y = Y; y < Y + h; y++) for (let x = X; x < X + w; x++) this.set(x, y, c); return this; }
  r(c, x, y, w = 1, h = 1) { const k = this.k; return this.rF(c, Math.round(x * k), Math.round(y * k), Math.round(w * k), Math.round(h * k)); }
  // ô điểm ảnh 1 điểm ở bộ thường = 1 điểm thật ở mọi k (đường mảnh, hạt rơm)
  dot(c, x, y) { return this.rF(c, Math.round(x * this.k), Math.round(y * this.k)); }
  // elip (toạ độ thô), fn(dx, dy) chọn màu theo vị trí chuẩn hoá -1..1 trong elip
  e(cx, cy, rx, ry, fn) {
    const k = this.k, CX = cx * k, CY = cy * k, RX = rx * k, RY = ry * k;
    for (let y = Math.floor(CY - RY - 1); y <= Math.ceil(CY + RY + 1); y++) for (let x = Math.floor(CX - RX - 1); x <= Math.ceil(CX + RX + 1); x++) {
      const dx = (x + 0.5 - CX) / RX, dy = (y + 0.5 - CY) / RY;
      if (dx * dx + dy * dy <= 1) this.set(x, y, typeof fn === 'string' ? fn : fn(dx, dy, x, y));
    }
    return this;
  }
  // đường thẳng (toạ độ thô), nét dày `t` điểm thật
  line(c, x0, y0, x1, y1, t = 1) {
    const k = this.k, n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * k * 2) + 1;
    for (let i = 0; i <= n; i++) {
      const X = Math.round((x0 + (x1 - x0) * i / n) * k), Y = Math.round((y0 + (y1 - y0) * i / n) * k);
      this.rF(c, X - Math.floor((t - 1) / 2), Y - Math.floor((t - 1) / 2), t, t);
    }
    return this;
  }
  clearF(X, Y) { if (this.ok(X, Y)) this.d.fill(0, (Y * this.w + X) * 4, (Y * this.w + X) * 4 + 4); }
  // viền 1px quanh phần đặc: mép dưới / phải (khuất sáng) đậm, mép trên / trái (hứng sáng) nhạt hơn
  outline(dark = OUT, light = dark) {
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
// khối cầu có sáng trên-trái: ramp = [tối nhất, tối, gốc, sáng]
const ball = ramp => (dx, dy) => { const l = -(dx * 0.62 + dy * 0.78), r = Math.hypot(dx, dy); return l > 0.55 && r < 0.75 ? ramp[3] : l > -0.05 ? ramp[2] : l > -0.6 ? ramp[1] : ramp[0]; };

// ---------- icon HUD 12x12 ----------
const SUN = ['#c97a10', '#f2b632', '#ffd84a', '#fff3a0'];
const CLOUD = ['#8794ad', '#c3cbdc', '#e9eef6', '#ffffff'];
const RAINC = ['#5d6883', '#8792aa', '#b3bdd0', '#dfe5ef'];
const STORMC = ['#2c3044', '#454b63', '#636a87', '#8d94ae'];
const ICE = ['#2f6aa8', '#6fb0ee', '#bfe3ff', '#ffffff'];
const RAINBOW = ['#e5452f', '#f59a23', '#f7d547', '#5cc34a', '#3f8ce0', '#8e4fc0'];

function sunIcon(k, ramp = SUN, cx = 6, cy = 6, r = 3.1, rays = 8, rl = 1.6) {
  const l = L(12, 12, k);
  for (let i = 0; i < rays; i++) {
    const a = i / rays * Math.PI * 2 - Math.PI / 2, x0 = cx + Math.cos(a) * (r + 1.1), y0 = cy + Math.sin(a) * (r + 1.1);
    l.line(i % 2 ? ramp[2] : ramp[1], x0, y0, x0 + Math.cos(a) * rl * (i % 2 ? 0.7 : 1), y0 + Math.sin(a) * rl * (i % 2 ? 0.7 : 1), k);
  }
  l.e(cx, cy, r, r, ball(ramp));
  l.outline('#8a4a10', '#b8701c');
  if (k === 2) l.rF(ramp[3], Math.round((cx - 1.4) * k), Math.round((cy - 1.6) * k), 2, 1).rF('#ffffff', Math.round((cx - 1.4) * k), Math.round((cy - 1.6) * k));
  return l;
}
// mây nhiều cụm; oy dời lên xuống, ramp màu mây
function cloudLayer(k, ramp = CLOUD, oy = 0, ox = 0, dark = '#4a5470') {
  const l = L(12, 12, k);
  const puffs = [[3.8 + ox, 7.6 + oy, 2.8, 2.4], [6.6 + ox, 6.2 + oy, 3.2, 3.0], [9.2 + ox, 7.8 + oy, 2.4, 2.1]];
  for (const [x, y, rx, ry] of puffs) l.e(x, y, rx, ry, (dx, dy) => (dy < -0.35 && dx < 0.3 ? ramp[3] : dy > 0.45 ? ramp[1] : ramp[2]));
  l.r(ramp[1], 1.4 + ox, 9 + oy, 9.8, 0.9);
  l.outline(dark, ramp[0]);
  return l;
}
const icons = {
  sun: k => sunIcon(k),
  cloud: k => {
    const l = L(12, 12, k), s = sunIcon(k, SUN, 8.2, 4, 2.3, 6, 1.1), c = cloudLayer(k, CLOUD, 1, -0.8);
    return l.put(s).put(c);
  },
  rain: k => {
    const l = L(12, 12, k), c = cloudLayer(k, RAINC, -2.2, 0, '#2f3850');
    l.put(c);
    for (const [x, y] of [[3.4, 9.2], [6.4, 10], [9.2, 9.2]]) { l.line('#2f78d8', x, y, x - 0.7, y + 1.8, k); if (k === 2) l.rF('#bfe3ff', Math.round(x * k), Math.round(y * k)); }
    return l;
  },
  storm: k => {
    const l = L(12, 12, k), c = cloudLayer(k, STORMC, -2.4, 0, '#15182a');
    l.put(c);
    for (const [x, y] of [[2.6, 9.4], [9.8, 9.4]]) l.line('#5aa6ff', x, y, x - 0.6, y + 1.6, k);
    // tia sét vàng
    const b = L(12, 12, k);
    const pts = [[7.2, 5.2], [5.2, 8.2], [6.8, 8.2], [5.4, 11.4]];
    for (let i = 0; i < pts.length - 1; i++) b.line(i === 1 ? '#fff8c0' : '#ffe14a', ...pts[i], ...pts[i + 1], k === 2 ? 3 : 1);
    b.outline('#8a5a10');
    return l.put(b);
  },
  drought: k => {
    const l = L(12, 12, k);
    l.put(sunIcon(k, ['#a8320f', '#e5602a', '#ff9a3c', '#ffd27a'], 6.6, 4.8, 2.9, 8, 1.4));
    // đất nứt nẻ dưới chân
    const g = L(12, 12, k);
    g.r('#a8703e', 0.5, 9.4, 11, 2.2).r('#d39a5a', 0.5, 9.4, 11, 0.6);
    g.outline(OUT, '#6b4020');
    for (const [x0, y0, x1, y1] of [[2.4, 9.6, 3.4, 11.4], [3.4, 11.4, 4.6, 11.1], [7, 9.6, 6.2, 11.4], [9.4, 9.8, 10.2, 11.2]]) g.line('#5c3a1a', x0, y0, x1, y1, 1);
    l.put(g);
    // hơi nóng bốc lên
    for (const x of [1.6, 10.6]) for (let i = 0; i < 3; i++) l.dot(i % 2 ? '#ffb070' : '#ff8040', x + (i % 2 ? 0.6 : 0), 4.8 + i * 1.3);
    return l;
  },
  frost: k => {
    const l = L(12, 12, k), cx = 6, cy = 6;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 - Math.PI / 2, ex = cx + Math.cos(a) * 4.8, ey = cy + Math.sin(a) * 4.8;
      l.line(ICE[2], cx, cy, ex, ey, k);
      // nhánh nhỏ
      const bx = cx + Math.cos(a) * 3, by = cy + Math.sin(a) * 3;
      for (const s of [-1, 1]) l.line(ICE[2], bx, by, bx + Math.cos(a + s * 0.9) * 1.4, by + Math.sin(a + s * 0.9) * 1.4, 1);
    }
    l.e(cx, cy, 1.3, 1.3, ICE[3]);
    l.outline(ICE[0], ICE[1]);
    if (k === 2) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 - Math.PI / 2; l.rF(ICE[3], Math.round((cx + Math.cos(a) * 4.6) * k), Math.round((cy + Math.sin(a) * 4.6) * k)); }
    return l;
  },
  rainbow: k => {
    const l = L(12, 12, k), cx = 6, cy = 10.2, n = RAINBOW.length;
    for (let i = 0; i < n; i++) {
      const R0 = 5.6 - i * 0.62, R1 = R0 - 0.62;
      l.e(cx, cy, R0, R0, (dx, dy, X, Y) => {
        const r = Math.hypot(X + 0.5 - cx * k, Y + 0.5 - cy * k) / k;
        return dy <= 0 && r > R1 ? RAINBOW[i] : null;
      });
    }
    l.outline('#5a4a6a', '#8a7a9a');
    const c = L(12, 12, k);
    for (const x of [1.8, 10.2]) c.e(x, 10.2, 1.7, 1.2, (dx, dy) => (dy < -0.2 ? CLOUD[3] : CLOUD[2]));
    c.outline('#4a5470', CLOUD[0]);
    return l.put(c);
  },
  moon: k => {
    const l = L(12, 12, k);
    l.e(6, 6, 4.4, 4.4, ball(['#c9a13a', '#e8c34a', '#f7e08a', '#fff8d0']));
    const K = l.k;
    for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) { const dx = (x + 0.5) / K - 8.2, dy = (y + 0.5) / K - 4.6; if (dx * dx + dy * dy < 3.6 * 3.6) l.clearF(x, y); }
    l.outline('#6a5a1a', '#a08a3a');
    return l;
  },
};

// ---------- radio trong nhà (16x24, đặt trên bàn con) ----------
function radio(k) {
  const l = L(16, 24, k), W = ['#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868'];
  // bàn con
  l.r(W[2], 1, 14, 14, 2).r(W[3], 1, 14, 14, 0.5).r(W[1], 1, 15.5, 14, 0.5);
  l.r(W[1], 2, 16, 1.5, 8).r(W[1], 12.5, 16, 1.5, 8).r(W[0], 3, 16, 0.5, 8).r(W[0], 13.5, 16, 0.5, 8);
  l.r(W[0], 3.5, 19, 9, 1);
  // thân radio gỗ, đỉnh bo tròn
  l.e(8, 7.5, 6, 3, (dx, dy) => (dy > 0 ? null : dx < -0.3 && dy < -0.3 ? W[3] : W[2]));
  l.r(W[2], 2, 7.5, 12, 6.5).r(W[3], 2, 7.5, 0.5, 6).r(W[1], 13.5, 7.5, 0.5, 6.5).r(W[1], 2, 13.5, 12, 0.5);
  l.outline(OUT, '#6b4020');
  // loa (lưới vải)
  l.r('#3a2a1a', 3, 8, 5, 4.6);
  for (let y = 0; y < 4.6 * k; y++) for (let x = 0; x < 5 * k; x++) if ((x + y) % 2 === 0) l.rF('#c8a070', Math.round(3 * k) + x, Math.round(8 * k) + y);
  // ô số sáng vàng, kim đỏ
  l.r(OUT, 8.8, 8, 4.4, 2.6).r('#f7d547', 9.2, 8.4, 3.6, 1.8).r('#fff3a0', 9.2, 8.4, 3.6, 0.5);
  for (let i = 0; i < 4; i++) l.dot('#b8701c', 9.5 + i * 0.9, 9.8);
  l.line('#e5452f', 11, 8.4, 11, 10.1, 1);
  // hai núm vặn
  for (const x of [9.8, 12.2]) { l.e(x, 12, 0.95, 0.95, (dx, dy) => (dx + dy < -0.4 ? '#f2f2f2' : dx + dy > 0.6 ? '#7a7a86' : '#c4c4d0')); }
  // ăng-ten
  l.line('#9a9aa8', 12.5, 5.4, 15, 0.6, 1);
  l.e(15, 0.8, 0.6, 0.6, '#e5452f');
  if (k === 2) { l.rF('#ffffff', 19, 5); l.rF('#fff8e0', 6, 11, 4, 1); }
  return l;
}

// ---------- bảng tin làng (32x32) ----------
function newsBoard(k) {
  const l = L(32, 32, k), W = ['#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868'];
  // hai cột
  for (const x of [3, 26]) l.r(W[1], x, 8, 3, 24).r(W[3], x, 8, 0.8, 24).r(W[0], x + 2.2, 8, 0.8, 24);
  // mái ngói nhỏ
  l.r('#b8402e', 0, 4, 32, 4).r('#e5654a', 0, 4, 32, 1).r('#8a2a1c', 0, 7, 32, 1);
  for (let x = 2; x < 32; x += 4) l.r('#8a2a1c', x, 5, 0.6, 2);
  l.r(W[1], 1, 2.6, 30, 1.6).r(W[3], 1, 2.6, 30, 0.6);
  // tấm bảng gỗ
  l.r(W[2], 2, 8, 28, 16).r(W[3], 2, 8, 28, 0.6).r(W[1], 2, 23.4, 28, 0.6);
  for (let y = 11; y < 23; y += 4) l.r(W[1], 2.5, y, 27, 0.4);
  // chân cỏ
  l.r('#2f6b1f', 1, 30.6, 30, 1.4);
  l.outline(OUT, '#6b4020');
  // tờ báo thời tiết (giữa): ô hình nắng mưa + dòng chữ
  l.r('#f6efd8', 5, 9.6, 13, 12.4).r('#ffffff', 5, 9.6, 13, 0.6).r('#d8ccaa', 17.4, 10, 0.6, 12);
  l.r('#3b2412', 6, 10.6, 11, 1.4);                         // tít báo
  l.r('#bfe3ff', 6, 12.8, 5.4, 4.6).r('#7ab8f4', 6, 16.6, 5.4, 0.8);
  l.e(8, 14.4, 1.4, 1.4, '#ffd84a');
  l.e(10, 15.4, 1.6, 1, '#ffffff');
  for (let i = 0; i < 4; i++) l.r('#8a7a5a', 12, 13 + i * 1.3, 4.6 - (i % 2), 0.5);
  for (let i = 0; i < 3; i++) l.r('#8a7a5a', 6, 18.4 + i * 1.2, 10.6 - (i === 2 ? 4 : 0), 0.5);
  // giấy nhắn nhỏ màu
  l.r('#ffe08a', 20, 10.4, 7, 6).r('#fff3c0', 20, 10.4, 7, 0.5);
  for (let i = 0; i < 3; i++) l.r('#b8901c', 21, 12 + i * 1.3, 5 - (i % 2) * 1.5, 0.4);
  l.r('#bfe8b0', 20.6, 17.4, 6.4, 4.6);
  for (let i = 0; i < 2; i++) l.r('#4f8a3a', 21.4, 18.8 + i * 1.4, 4.4, 0.4);
  // đinh ghim
  for (const [x, y, c] of [[11, 9.4, '#e5452f'], [23, 10, '#3f8ce0'], [23.6, 17, '#e5452f']]) { l.e(x, y, 0.7, 0.7, c); if (k === 2) l.rF('#ffffff', Math.round((x - 0.3) * k), Math.round((y - 0.3) * k)); }
  return l;
}

// ---------- tờ báo thời tiết (40x30) cho bảng tin; ô hình ở (3,7) cỡ 14x14 để vẽ icon trời lên ----------
export const PAPER_BOX = { x: 3, y: 7, w: 14, h: 14 };
function paper(k) {
  const l = L(40, 30, k);
  l.r('#f6efd8', 0.5, 0.5, 39, 29).r('#ffffff', 0.5, 0.5, 39, 0.6).r('#ffffff', 0.5, 0.5, 0.6, 29).r('#d8ccaa', 38.9, 1, 0.6, 29).r('#d8ccaa', 1, 28.9, 38.5, 0.6);
  // góc giấy quăn
  l.r('#e6dbbd', 35.5, 25.5, 4, 4);
  l.outline('#6b5a3a', '#9a8a6a');
  // tít báo "BẢN TIN THỜI TIẾT" vẽ bằng khối chữ đậm
  l.r('#3b2412', 3, 2.4, 34, 2.6).r('#e5452f', 3, 5.4, 34, 0.6);
  for (let x = 4; x < 36; x += 3) l.r('#f6efd8', x + 2, 2.6, 0.6, 2.2);
  // khung ô hình
  l.r('#7ab8f4', PAPER_BOX.x - 0.5, PAPER_BOX.y - 0.5, PAPER_BOX.w + 1, PAPER_BOX.h + 1).r('#dff1ff', PAPER_BOX.x, PAPER_BOX.y, PAPER_BOX.w, PAPER_BOX.h);
  // cột chữ
  for (let i = 0; i < 8; i++) l.r(i % 4 === 0 ? '#5c4a2a' : '#9a8a6a', 19.5, 7.4 + i * 2.6, i % 4 === 3 ? 10 : 16, 0.8);
  for (let i = 0; i < 2; i++) l.r('#9a8a6a', 3, 23.2 + i * 2.4, 14, 0.8);
  return l;
}

// ---------- bù nhìn bị bão quật đổ (16x26, cùng cỡ, cùng điểm chân với bù nhìn đứng) ----------
function scarecrowDown(k) {
  const l = L(16, 26, k);
  // cọc gãy nằm ngang + gốc cọc còn cắm
  l.r('#8a5a2b', 7, 21, 2, 5).r('#b07a45', 7, 21, 0.6, 5);
  l.r('#f0cf5a', 6.6, 20.4, 1, 0.8).r('#c9a13a', 8.4, 20.2, 0.8, 1);
  l.line('#8a5a2b', 1, 23.6, 14.6, 22.2, k === 2 ? 3 : 2);
  // áo xanh nằm sấp
  l.r('#3f8ce0', 4.4, 19.4, 7.6, 4.2).r('#7ab8f4', 4.4, 19.4, 7.6, 0.6).r('#2a64b0', 4.4, 23, 7.6, 0.6);
  l.r('#e5452f', 5.4, 20.4, 2.4, 2).r('#f7d547', 9, 20.8, 2, 1.8);
  // đầu bao bố
  l.e(2.6, 21.2, 2.4, 2.2, (dx, dy) => (dx + dy < -0.5 ? '#f6dca8' : dx + dy > 0.6 ? '#c8a464' : '#e8c98a'));
  // rơm vương vãi
  for (const [x, y] of [[12.4, 19.4], [13.2, 20.2], [12.8, 23.6], [0.6, 24.2], [3.4, 24.4], [10.8, 24.2]]) l.r(y > 22 ? '#c9a13a' : '#f0cf5a', x, y, 1.2, 0.6);
  // mũ rơm rơi bên cạnh
  l.e(13.4, 24.4, 2.4, 1.1, (dx, dy) => (dy < 0 ? '#f0cf5a' : '#c9a13a'));
  l.r('#e5452f', 12.2, 23.6, 2.4, 0.5);
  l.outline(OUT, '#6b4020');
  // mặt khâu chỉ
  l.dot('#2a2a2a', 1.6, 20.6); l.dot('#2a2a2a', 3.2, 20.2);
  if (k === 2) { l.rF('#ffffff', 3, 41); l.rF('#fff0a0', 26, 47, 3, 1); }
  return l;
}

// ---------- rơm phủ trên ô ruộng (16x16, vẽ sau đất, trước cây) ----------
function mulch(k) {
  const l = L(16, 16, k), C = ['#9a7420', '#c9a13a', '#e8c34a', '#fff0a0'];
  for (let i = 0; i < (k === 1 ? 30 : 46); i++) {   // bộ thường thưa hơn cho khỏi bết
    const x = 1.2 + hash(i, 3) * 12.6, y = 2 + hash(i, 7) * 11.6, a = (hash(i, 11) - 0.5) * 1.4, len = 1.6 + hash(i, 13) * 1.8;
    const c = C[1 + Math.floor(hash(i, 17) * 3)];
    l.line(c, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.6, 1);
    if (k === 2 && hash(i, 19) < 0.35) l.rF(C[0], Math.round(x * k), Math.round(y * k) + 1);
  }
  return l;
}

// ---------- dấu hại: sương muối bám cây hạt / mầm (16x16 vẽ chồng lên hình riêng của cây) ----------
function frostBite(k) {
  const l = L(16, 16, k);
  // lớp sương trắng phủ quanh gốc (bán trong suốt, cây vẫn nhìn ra)
  l.e(8, 13, 6.2, 2.4, (dx, dy, X, Y) => (hash(X, Y) < 0.55 ? 'rgba(232,246,255,0.75)' : hash(X + 7, Y) < 0.3 ? 'rgba(255,255,255,0.9)' : null));
  // tinh thể băng lấp lánh
  for (const [x, y] of [[4, 9], [11.5, 8], [8, 11.5]]) {
    l.dot('#ffffff', x, y);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) l.dot('#bfe3ff', x + dx / k, y + dy / k);
    if (k === 2) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) l.rF('rgba(191,227,255,0.7)', Math.round(x * k) + dx, Math.round(y * k) + dy);
  }
  return l;
}

// ---------- dấu hại: đất nứt nẻ lúc hạn hán (16x16 vẽ trên đất khô) ----------
function crack(k) {
  const l = L(16, 16, k);
  const lines = [[3, 3, 6, 6], [6, 6, 5, 9], [6, 6, 9, 7], [9, 7, 12, 5], [9, 7, 10, 11], [10, 11, 13, 13], [5, 9, 3, 12], [10, 11, 7, 13]];
  for (const [x0, y0, x1, y1] of lines) { l.line('#5c3a1a', x0, y0, x1, y1, 1); if (k === 2) l.line('rgba(255,220,170,0.45)', x0 + 0.5, y0 + 0.5, x1 + 0.5, y1 + 0.5, 1); }
  return l;
}

// ---------- hiệu ứng toàn màn: cầu vồng (96x28), tia sét (10x36), sóng hơi nóng (8x5) ----------
function rainbowArc(k) {
  const l = L(96, 28, k), cx = 48, cy = 50, n = RAINBOW.length, K = k;
  for (let Y = 0; Y < l.h; Y++) for (let X = 0; X < l.w; X++) {
    const r = Math.hypot((X + 0.5) / K - cx, (Y + 0.5) / K - cy), i = Math.floor((47 - r) / 1.1);
    if (i >= 0 && i < n) l.set(X, Y, RAINBOW[i]);
  }
  return l;
}
function bolt(k) {
  const l = L(10, 36, k), pts = [[6, 0], [3, 10], [6, 12], [2, 22], [5, 23], [1, 35]];
  for (let i = 0; i < pts.length - 1; i++) l.line('#fff8c0', ...pts[i], ...pts[i + 1], k === 2 ? 3 : 2);
  for (let i = 0; i < pts.length - 1; i++) l.line('#ffffff', ...pts[i], ...pts[i + 1], 1);
  return l;
}
function heat(k) {
  const l = L(8, 5, k);
  for (let x = 0; x < 8; x += 1 / k) l.dot('rgba(255,170,90,0.75)', x, 2.5 + Math.sin(x * 1.3) * 1.6);
  return l;
}

// ---------- xuất ----------
const PAIRS = [];
function both(fn, ...args) {
  const a = fn(1, ...args).cv(), b = fn(2, ...args).cv();
  PAIRS.push([a, b]);
  return a;
}
const icon = Object.fromEntries(Object.entries(icons).map(([n, f]) => [n, both(f)]));
export const WX = {
  icon,
  radio: both(radio),
  newsBoard: both(newsBoard),
  paper: both(paper),
  scarecrowDown: both(scarecrowDown),
  mulch: both(mulch),
  frostBite: both(frostBite),
  crack: both(crack),
  rainbow: both(rainbowArc),
  bolt: both(bolt),
  heat: both(heat),
};
for (const [a, b] of PAIRS) linkPair(a, b);
// Kiểm cỡ cho trang xem sprite: mọi cặp có đúng 2w×2h không
export const wxPairs = () => PAIRS.map(([a, b]) => ({ w: a.width, h: a.height, w2: b.width, h2: b.height }));
