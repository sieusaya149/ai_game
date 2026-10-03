// Art chất lượng nông sản ★ (issue 52): dấu sao trên icon nông sản ★2 / ★3, viền màu theo sao, lấp lánh cho ★3,
// và hàng ba sao nhỏ trên ô ruộng đang lớn (vụ này đang giữ mấy sao). Hình mới nên có cả hai bản:
//   SPR52_OLD = bản thường (cỡ như bộ cũ), SPR52 = bản 2x cùng khóa, mỗi ảnh đúng gấp đôi; hd.js nối hai bản.
//   starBadge[2|3] 7x7 (2x: 14x14) · starSpark 3x3 (2x: 6x6) · plotStars[0..2] 13x5 (2x: 26x10), chỉ số = số sao - 1
// starIcon(ảnh nông sản, sao, k) dựng icon có sao (k = 1 bản thường, 2 bản 2x) cho bảng giỏ, kho, chợ, thùng, đơn hàng.
// Phong cách theo art5: viền tối 1px (mép hứng sáng nhạt hơn), mỗi mảng 4 sắc độ, sáng từ trên-trái, điểm sáng.
import { canvas, sprite } from './art.js';

// [viền, tối, gốc, sáng, điểm sáng]
const GOLD = ['#6b4a0a', '#c08a16', '#f2c63a', '#ffe680', '#fffbe0'];
const SILVER = ['#3e4a5c', '#8794a6', '#c3ccd8', '#e9eef4', '#ffffff'];
const EMPTY = ['#3b2412', '#4e3a2a', '#6b5442', '#7f6852', '#8d7660'];   // sao chưa giữ được (trên ô ruộng)
const RAMP = { 2: SILVER, 3: GOLD };
const RIM = { 2: [70, 96, 128], 3: [176, 120, 12] };   // viền icon: ★2 xanh thép, ★3 vàng đậm
const pal = r => ({ o: r[0], d: r[1], b: r[2], l: r[3], w: r[4] });

// ---------- bản thường (vẽ tay) ----------
const BADGE1 = [
  '...o...',
  '..olo..',
  'ollwbdo',
  '.olbbo.',
  '.obbdo.',
  'obo.odo',
  'oo...oo',
];
const SPARK1 = ['.l.', 'lwl', '.l.'];
// Hàng sao trên ô ruộng: nền thẻ tối bo góc cho nổi trên đất và lá; ở cỡ thường mỗi sao là dấu cộng 3x3
const PILL = ['#2b1a0c', '#4a2f17'];   // nền, mép trên hứng sáng
function pill(x, w, h, k) {
  x.fillStyle = PILL[0]; x.fillRect(k, 0, w - 2 * k, h); x.fillRect(0, k, w, h - 2 * k);
  x.fillStyle = PILL[1]; x.fillRect(k, 0, w - 2 * k, k);
}
const PIP1 = ['.l.', 'lwb', '.d.'];
function pips1(n) {
  const c = canvas(13, 5), x = c.getContext('2d');
  pill(x, 13, 5, 1);
  for (let i = 0; i < 3; i++) x.drawImage(sprite(PIP1, pal(i < n ? GOLD : EMPTY)), 1 + i * 4, 1);
  return c;
}

// ---------- bản 2x (dựng bằng hình học, viền và đổ bóng theo mặt cánh) ----------
const TAU = Math.PI * 2;
function starPts(cx, cy, ro, ri) {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return p;
}
function inside(p, x, y) {
  let ok = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
}
// Ngôi sao năm cánh vẽ vào ctx tại (ox, oy) trong khung w×h: mặt cánh hứng sáng trên-trái sáng, mặt kia tối,
// viền 1px bên trong bóng, điểm sáng gần tâm
function star2(x, ox, oy, w, h, cx, cy, ro, ri, r) {
  const pts = starPts(cx, cy, ro, ri), m = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let n = 0;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) if (inside(pts, i + (sx + 0.5) / 4, j + (sy + 0.5) / 4)) n++;
    m[j * w + i] = n >= 7;
  }
  const at = (i, j) => i >= 0 && j >= 0 && i < w && j < h && m[j * w + i];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!at(i, j)) continue;
    let col;
    if (!at(i - 1, j) || !at(i + 1, j) || !at(i, j - 1) || !at(i, j + 1)) {
      col = !at(i, j - 1) && !at(i - 1, j) && i + j < cx + cy ? r[1] : r[0];   // mép trên-trái hứng sáng: viền nhạt hơn
    } else {
      const dx = i + 0.5 - cx, dy = j + 0.5 - cy, th = Math.atan2(dy, dx);
      const k = Math.round((th + Math.PI / 2) / (TAU / 5)), axis = -Math.PI / 2 + k * TAU / 5;
      const side = Math.sin(th - axis) >= 0 ? 1 : -1;                 // nửa cánh bên nào của trục cánh
      const nx = Math.cos(axis + side * 1.1), ny = Math.sin(axis + side * 1.1);
      const lit = -(nx + ny) / Math.SQRT2;                            // ánh sáng từ trên-trái
      const near = Math.hypot(dx, dy) < ri * 0.9;
      col = near && dx < 0.6 && dy < 0.6 ? r[4] : lit > 0.45 ? r[3] : lit > -0.35 ? r[2] : r[1];
    }
    x.fillStyle = col; x.fillRect(ox + i, oy + j, 1, 1);
  }
}
function badge2(r) {
  const c = canvas(14, 14);
  star2(c.getContext('2d'), 0, 0, 14, 14, 7, 7.6, 7, 2.95, r);
  return c;
}
const SPARK2 = ['..b...', '..l...', 'blwlb.', '..l...', '..b...', '......'];   // tâm (2, 2): bản thường tâm (1, 1)
function pips2(n) {
  const c = canvas(26, 10), x = c.getContext('2d');
  pill(x, 26, 10, 2);
  // trên nền tối thì viền sao dùng sắc tối của chính nó (không dùng màu viền gần đen)
  for (let i = 0; i < 3; i++) { const r = i < n ? GOLD : EMPTY; star2(x, 1 + i * 8, 1, 8, 8, 4, 4.3, 4.3, 1.85, [r[1], r[1], r[2], r[3], r[4]]); }
  return c;
}

const web = typeof document !== 'undefined';
export const SPR52_OLD = web ? {
  starBadge: { 2: sprite(BADGE1, pal(SILVER)), 3: sprite(BADGE1, pal(GOLD)) },
  starSpark: sprite(SPARK1, pal(GOLD)),
  plotStars: [1, 2, 3].map(pips1),
} : {};
export const SPR52 = web ? {
  starBadge: { 2: badge2(SILVER), 3: badge2(GOLD) },
  starSpark: sprite(SPARK2, pal(GOLD)),
  plotStars: [1, 2, 3].map(pips2),
} : {};

// Icon nông sản có sao: viền icon đổi màu theo sao, dấu sao ở góc dưới-phải, ★3 thêm lấp lánh góc trên-trái.
// img: ảnh nông sản (bản thường khi k = 1, bản 2x khi k = 2); trả canvas cùng cỡ.
export function starIcon(img, star, k = 1) {
  const S = k === 2 ? SPR52 : SPR52_OLD, w = img.width, h = img.height;
  const c = canvas(w, h), x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, w, h), px = d.data, rim = RIM[star];
  const a = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : px[(j * w + i) * 4 + 3]);
  const edge = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (a(i, j) && (!a(i - 1, j) || !a(i + 1, j) || !a(i, j - 1) || !a(i, j + 1))) edge.push((j * w + i) * 4);
  // chỉ đổi màu điểm viền tối (viền 1px của icon); điểm mép sáng giữ nguyên để hình mảnh (lúa, hành) không bạc màu
  const dark = o => 0.3 * px[o] + 0.59 * px[o + 1] + 0.11 * px[o + 2] < 100;
  if (rim) for (const o of edge) if (dark(o)) for (let q = 0; q < 3; q++) px[o + q] = Math.round(px[o + q] * 0.25 + rim[q] * 0.75);
  x.putImageData(d, 0, 0);
  const b = S.starBadge?.[star];
  if (b) x.drawImage(b, w - b.width, h - b.height);
  if (star >= 3 && S.starSpark) x.drawImage(S.starSpark, 0, 0);
  return c;
}
