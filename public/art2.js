// Bộ sprite thứ hai: vườn (dọn đất), nội thất nhà tranh, làng, NPC, công cụ & HUD.
// Cùng phong cách với art.js: viền nâu sẫm, ánh sáng từ trên-trái, 3-5 sắc độ mỗi màu, không gradient mượt.

import { canvas as rawCanvas, flip, hash } from './art.js';

// Canvas đọc lại nhiều lần (viền, rêu) nên bật willReadFrequently ngay từ đầu.
const canvas = (w, h) => { const c = rawCanvas(w, h); c.getContext('2d', { willReadFrequently: true }); return c; };

const OUT = '#3b2412';
const RAMP = {
  wood: ['#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868'],
  dark: ['#2e1a0c', '#4a2c14', '#6b4020', '#8e5a30'],
  stone: ['#4a4650', '#6e6a74', '#918c94', '#b4b0b2', '#dcd8d0'],
  leaf: ['#1e4d14', '#2f6b1f', '#3d8c2a', '#5fb33e', '#8fd65a'],
  forest: ['#123210', '#1d4e18', '#2a6c22', '#3f8c32', '#68b04a'],
  thatch: ['#6e4e18', '#9a7428', '#c39a42', '#ddbb62', '#f0d890'],
  tile: ['#6e2016', '#9e3024', '#c44434', '#e06a52'],
  brick: ['#5e2616', '#8e4028', '#b4583a', '#d0805a'],
  bamboo: ['#56601a', '#86922e', '#b4bc54', '#dcdf8e'],
  iron: ['#2e2e36', '#4c4c58', '#767686', '#aeaebe', '#e2e2ea'],
};

// ---------- tiện ích vẽ ----------

function draw(w, h, fn) { const c = canvas(w, h); fn(c.getContext('2d'), c); return c; }
function R(x, col, px, py, w = 1, h = 1) { x.fillStyle = col; x.fillRect(px, py, w, h); }
function line(x, col, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) R(x, col, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n));
}
function ell(x, col, cx, cy, rx, ry) {
  x.fillStyle = col;
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    const t = 1 - (dy * dy) / ((ry + 0.5) ** 2);
    if (t <= 0) continue;
    const hw = Math.round(rx * Math.sqrt(t) + 0.25);
    x.fillRect(Math.round(cx - hw), Math.round(cy + dy), hw * 2 + 1, 1);
  }
}
function shadow(x, cx, cy, rx, ry, a = 0.28) { ell(x, `rgba(34,22,10,${a})`, cx, cy, rx, ry); }
function shade(hex, f) {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}
const rgba = col => {
  const n = parseInt(col.slice(1, 7), 16);
  return [n >> 16, (n >> 8) & 255, n & 255, col.length > 7 ? parseInt(col.slice(7, 9), 16) : 255];
};
// Tô từng điểm ảnh; màu dạng '#rrggbb' hoặc '#rrggbbaa'.
function pix(w, h, fn) {
  const c = canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h);
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const col = fn(px, py);
    if (col) img.data.set(rgba(col), (py * w + px) * 4);
  }
  x.putImageData(img, 0, 0);
  return c;
}
// Thêm viền 1 điểm ảnh bao quanh mọi điểm đục.
function outline(c, col = OUT) {
  const w = c.width, h = c.height, x = c.getContext('2d'), d = x.getImageData(0, 0, w, h).data;
  const solid = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 200;
  x.fillStyle = col;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
    if (!solid(i, j) && (solid(i - 1, j) || solid(i + 1, j) || solid(i, j - 1) || solid(i, j + 1))) x.fillRect(i, j, 1, 1);
  return c;
}
// Sprite dạng chữ; giá trị bảng màu có thể là hàm (px, py) => màu.
function spr(rows, pal) {
  const W = rows[0].length;
  rows.forEach((r, i) => { if (r.length !== W) throw new Error(`art2: hàng ${i} dài ${r.length} ≠ ${W}: "${r}"`); });
  return pix(W, rows.length, (px, py) => {
    const v = pal[rows[py][px]];
    return typeof v === 'function' ? v(px, py) : v || null;
  });
}
const lvl = (ramp, v) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)))];

// Tán lá: hợp các khối tròn; khối thấp hơn nằm trước. Có khe tối giữa các chùm, sáng từ trên-trái.
function foliage(w, h, blobs, ramp, { edge = null, bg = null, wrap = false, seed = 0 } = {}) {
  const list = [];
  for (const b of blobs) {
    if (wrap) { for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) list.push([b[0] + ox, b[1] + oy, b[2], b[3]]); } else list.push(b);
  }
  list.sort((a, b) => a[1] - b[1]);
  const own = (px, py) => {
    if (wrap) { px = (px + w) % w; py = (py + h) % h; } else if (px < 0 || py < 0 || px >= w || py >= h) return -1;
    let best = -1;
    for (let i = 0; i < list.length; i++) {
      const [cx, cy, r] = list[i], dx = px + 0.5 - cx, dy = py + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) best = i;
    }
    return best;
  };
  return pix(w, h, (px, py) => {
    const i = own(px, py);
    if (i < 0) {
      if (edge && (own(px - 1, py) >= 0 || own(px + 1, py) >= 0 || own(px, py - 1) >= 0 || own(px, py + 1) >= 0)) return edge;
      return bg;
    }
    const [cx, cy, r, own_ramp] = list[i];
    const rp = own_ramp || ramp;
    const below = own(px, py + 1), right = own(px + 1, py);
    if ((below >= 0 && below !== i && list[below][1] > cy) || (right >= 0 && right !== i && list[right][1] > cy && hash(px + seed, py) < 0.5)) return rp[0];
    const dx = (px + 0.5 - cx) / r, dy = (py + 0.5 - cy) / r;
    const n = hash(px * 3 + seed, py * 7 + seed * 3) - 0.5;
    const v = -dx * 0.55 - dy * 0.8 - (dx * dx + dy * dy) * 0.3 + n * 0.5 + 0.3;
    return v > 0.78 ? rp[4] : v > 0.4 ? rp[3] : v > -0.05 ? rp[2] : v > -0.5 ? rp[1] : rp[0];
  });
}

// Đá: trường độ cao từ các elip (méo nhẹ), chiếu sáng theo pháp tuyến rồi lượng tử hoá.
function rockField(w, h, shapes, ramp, seed = 0) {
  const H = (X, Y) => {
    let best = 0;
    for (const [cx, cy, rx, ry] of shapes) {
      const dx = (X - cx) / rx, dy = (Y - cy) / ry, a = Math.atan2(dy, dx);
      const wob = 1 + Math.sin(a * 3 + seed) * 0.07 + Math.sin(a * 5 + seed * 2.3) * 0.05;
      const d = (dx * dx + dy * dy) / (wob * wob);
      if (d < 1) best = Math.max(best, Math.sqrt(1 - d) * (0.8 + 0.2 * ry / rx));
    }
    return best;
  };
  return pix(w, h, (px, py) => {
    const X = px + 0.5, Y = py + 0.5, h0 = H(X, Y);
    if (h0 <= 0) return null;
    const fx = (H(X + 1, Y) - H(X - 1, Y)) / 2, fy = (H(X, Y + 1) - H(X, Y - 1)) / 2;
    let b = 0.5 + (fx * 0.55 + fy * 0.85) * -1.6;
    if (h0 > 0.82) b = Math.max(b, 0.7);
    b += (hash(px + seed * 13, py) - 0.5) * 0.16;
    if (H(X, Y + 1.2) <= 0) b -= 0.25;
    return b > 0.86 ? ramp[4] : b > 0.64 ? ramp[3] : b > 0.42 ? ramp[2] : b > 0.22 ? ramp[1] : ramp[0];
  });
}

// Cột gỗ/tre đứng: rộng w (gồm viền).
function post(x, px, py, w, h, ramp, nodes = 0) {
  R(x, OUT, px, py, w, h);
  for (let i = 1; i < w - 1; i++) R(x, i === 1 ? ramp[3] : i === w - 2 ? ramp[1] : ramp[2], px + i, py, 1, h - 1);
  if (nodes) for (let yy = py + 3; yy < py + h - 2; yy += nodes) { R(x, ramp[0], px + 1, yy, w - 2, 1); R(x, ramp[3], px + 1, yy + 1, w - 2, 1); }
}

// Mái ngói mũi hài trong khung hình thang: hàng đỉnh y0 (x0..x1), mở rộng dần xuống y1 (xb0..xb1).
function tileRoof(x, y0, y1, top, bot, ramp, seed = 0) {
  const c = pix(x.canvas.width, x.canvas.height, (px, py) => {
    if (py < y0 || py > y1) return null;
    const t = (py - y0) / Math.max(1, y1 - y0);
    const l = top[0] + (bot[0] - top[0]) * t, r = top[1] + (bot[1] - top[1]) * t;
    if (px < Math.round(l) || px > Math.round(r)) return null;
    const ry = py - y0;
    if (ry <= 1) return ry === 0 ? ramp[1] : ramp[0];             // bờ nóc
    if (py >= y1 - 1) return py === y1 ? ramp[0] : ramp[1];        // diềm mái
    const band = Math.floor((ry - 2) / 4), k = (ry - 2) % 4;
    const ox = (px + (band % 2) * 2 + seed) % 4;
    let col = k === 0 ? ramp[3] : k === 3 ? (ox === 0 || ox === 3 ? ramp[0] : ramp[1]) : ramp[2];
    if (ox === 0 && k < 3) col = ramp[1];
    if (px < l + 2 && k < 3) col = shade(col, 1.08);
    if (px > r - 4 && k > 0) col = shade(col, 0.86);
    return col;
  });
  outline(c);
  x.drawImage(c, 0, 0);
}

// ---------- Vườn ----------

function shippingBin() {
  const W = RAMP.wood;
  return draw(24, 20, x => {
    shadow(x, 12, 18, 11, 2);
    R(x, OUT, 1, 6, 22, 13);
    R(x, W[2], 2, 7, 20, 11);
    for (const y of [8, 12, 16]) R(x, W[3], 2, y, 20, 1);
    for (const y of [11, 15]) R(x, W[0], 2, y, 20, 1);
    R(x, W[1], 2, 17, 20, 1);
    for (let i = 0; i < 9; i++) R(x, W[1], 4 + ((i * 7) % 15), 9 + (i % 2) * 4, 2, 1);
    R(x, 'rgba(60,30,10,0.22)', 17, 8, 4, 10);
    // nẹp sắt góc
    for (const px of [2, 19]) {
      R(x, '#4c4c58', px, 7, 3, 11); R(x, '#8a8a98', px, 7, 1, 11); R(x, '#5e5e6a', px + 2, 7, 1, 11);
      for (const y of [9, 13, 16]) R(x, '#d4d4de', px + 1, y);
    }
    // nhãn giấy có mũi tên
    R(x, OUT, 8, 10, 8, 7); R(x, '#f6efd8', 9, 11, 6, 5); R(x, '#d9c9a0', 9, 15, 6, 1); R(x, '#d9c9a0', 14, 11, 1, 5);
    R(x, '#3f8f2c', 11, 11, 2, 2); R(x, '#3f8f2c', 10, 13, 4, 1); R(x, '#3f8f2c', 11, 14, 2, 1);
    R(x, '#7fc858', 11, 11, 1, 1);
    // khe bóng dưới nắp
    R(x, '#1e1008', 2, 7, 20, 1);
    // nắp
    R(x, OUT, 0, 1, 24, 7);
    R(x, W[2], 1, 2, 22, 3); R(x, W[3], 1, 2, 22, 1);
    for (const px of [7, 16]) R(x, W[1], px, 2, 1, 3);
    R(x, W[1], 1, 5, 22, 1); R(x, W[0], 1, 6, 22, 1);
    for (const px of [1, 20]) { R(x, '#5e5e6a', px, 2, 3, 5); R(x, '#aeaebe', px, 2, 3, 1); R(x, '#d4d4de', px + 1, 4); }
    // tay cầm
    R(x, OUT, 9, 0, 6, 2); R(x, '#aeaebe', 10, 1, 4, 1); R(x, '#e2e2ea', 10, 1, 1, 1);
  });
}

const BUSH_DEF = [
  { blobs: [[5, 9.5, 4.2], [11, 9.5, 4.2], [8, 6, 4.6], [8, 11, 4]], berries: '#e5452f' },
  { blobs: [[4, 10, 3.6], [8, 7.5, 4.6], [12, 10, 3.6], [8, 11.5, 3.6]], flowers: '#ff8fb1' },
  { blobs: [[5, 8.5, 4], [10.5, 7, 4.4], [8, 11, 4], [12.5, 11, 2.8], [3.5, 11.5, 2.6]], twigs: true },
];
function bushV(i) {
  const def = BUSH_DEF[i];
  const ramp = i === 2 ? ['#1c3c12', '#2a5a1c', '#3a7426', '#5a9634', '#86b850'] : RAMP.leaf;
  const leaves = outline(foliage(16, 16, def.blobs, ramp, { seed: i * 17 + 3 }), '#163a0e');
  return draw(16, 16, x => {
    shadow(x, 8, 14, 7, 1.6);
    x.drawImage(leaves, 0, 0);
    if (def.berries) for (const [bx, by] of [[4, 9], [9, 7], [11, 11], [6, 12], [12, 8]]) {
      R(x, '#7a1a10', bx, by + 1, 2, 1); R(x, def.berries, bx, by, 2, 1); R(x, '#ffb0a0', bx, by);
    }
    if (def.flowers) for (const [fx, fy] of [[5, 8], [10, 6], [12, 10], [7, 11], [3, 11]]) {
      R(x, def.flowers, fx - 1, fy); R(x, def.flowers, fx + 1, fy); R(x, def.flowers, fx, fy - 1); R(x, '#c2306f', fx, fy + 1); R(x, '#fff3a0', fx, fy);
    }
    if (def.twigs) {
      for (const [a, b, c, d] of [[2, 6, 4, 8], [13, 4, 11, 6], [7, 2, 8, 4], [14, 9, 13, 10]]) line(x, '#5c3a1a', a, b, c, d);
      for (const [tx, ty] of [[2, 6], [13, 4], [7, 2], [14, 9]]) R(x, '#8a6a3a', tx, ty);
    }
  });
}

const STONE_SHAPES = [
  [[8, 9.5, 6.3, 5]],
  [[8, 10.5, 6.6, 4.1]],
  [[5.5, 10.6, 4.3, 3.6], [11, 9, 4, 3.8]],
];
function rockV(i) {
  const body = outline(rockField(16, 16, STONE_SHAPES[i], RAMP.stone, i * 2 + 1));
  return draw(16, 16, x => {
    shadow(x, 8, 14, 7, 1.8);
    x.drawImage(body, 0, 0);
    if (i === 0) { // vết nứt
      for (const [px, py] of [[9, 5], [9, 6], [8, 7], [8, 8], [7, 9]]) R(x, '#3e3a44', px, py);
      for (const [px, py] of [[10, 6], [9, 7], [9, 8]]) R(x, '#dcd8d0', px, py);
      R(x, '#3e3a44', 12, 10); R(x, '#3e3a44', 12, 11); R(x, '#3e3a44', 11, 12);
    }
    if (i === 1) { // rêu trên đỉnh
      const d = body.getContext('2d').getImageData(0, 0, 16, 16).data;
      for (let px = 3; px < 13; px++) for (let py = 6; py < 10; py++) {
        const o = (py * 16 + px) * 4;
        if (d[o + 3] > 200 && d[o] > 120 && hash(px, py + 5) < 0.55 - (py - 6) * 0.12) R(x, hash(px + 1, py) < 0.5 ? '#5f9a32' : '#86b850', px, py);
      }
      R(x, '#3d7420', 4, 9); R(x, '#3d7420', 11, 8);
    }
    if (i === 2) { R(x, '#3e3a44', 8, 11); R(x, '#3e3a44', 9, 12); R(x, OUT, 2, 14); R(x, '#918c94', 2, 13); }
  });
}

function stump() {
  const body = pix(16, 16, (px, py) => {
    const X = px + 0.5, Y = py + 0.5;
    const tx = (X - 8) / 5.5, ty = (Y - 6) / 3;
    const top = tx * tx + ty * ty;
    const roots = [[2.6, 12.4, 2.2, 1.3], [13.4, 12, 2, 1.3], [9.5, 13.6, 1.8, 1]];
    const inRoot = roots.some(([cx, cy, rx, ry]) => ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1);
    const inBody = Math.abs(X - 8) <= 5.5 && Y >= 6 && (Y <= 11 || ((X - 8) / 5.5) ** 2 + ((Y - 11) / 2.4) ** 2 <= 1);
    if (top <= 1) {
      const r = Math.sqrt(top);
      if (r > 0.82) return (tx + ty < -0.3) ? '#c98c4a' : '#8a5a2b';
      if (r < 0.16) return '#9a6436';
      // vết nứt
      if (Math.abs(X - 8 - (Y - 6) * -0.9) < 0.6 && X > 8.4 && r < 0.8) return '#8a5a2b';
      const ring = Math.floor(r * 4.2) % 2;
      const lit = tx + ty < 0;
      return ring ? (lit ? '#e8b878' : '#d49a5a') : (lit ? '#f2cc90' : '#e0a868');
    }
    if (inBody || inRoot) {
      const dx = (X - 8) / 6;
      const groove = hash(px, py >> 2) < 0.28 || px % 3 === 0 && hash(px, 9) < 0.6;
      let col = dx < -0.55 ? '#a06a38' : dx < 0.1 ? '#7a4a22' : dx < 0.6 ? '#68401e' : '#523218';
      if (groove) col = shade(col, 0.75);
      if (inRoot && !inBody) col = Y < 12.5 ? '#8a5a2b' : '#5c3a1a';
      if (Y > 11.5 && hash(px + 3, py) < 0.35) col = '#4f8a2e';
      return col;
    }
    return null;
  });
  outline(body);
  return draw(16, 16, x => { shadow(x, 8, 14, 7.5, 1.6); x.drawImage(body, 0, 0); });
}

// Ô rừng rậm nhìn từ trên. Các khối ở góc/mép giống nhau ở mọi biến thể nên ghép liền mạch.
const FOREST_BASE = [[0, 0, 5.2], [8, 0, 3.2], [0, 8, 3.2]];
const FL = ['#163e10', '#24601a', '#3a8228', '#5aa83c', '#8ccc5a'];
const FB = ['#0f2c10', '#18441a', '#225c26', '#347838', '#5a9850'];
const FOREST_VAR = [
  [[7.5, 7.5, 6.4]],
  [[9, 9, 6], [4, 11.5, 3, FB]],
  [[6.5, 9, 6, FL], [12, 4.5, 3.4]],
  [[9, 7, 6.2, FB], [5, 12, 2.8]],
  [[8, 8.5, 5.4], [12, 12, 2.6, FL], [4, 4.5, 2.6]],
  [[8, 7.5, 6.6, FL]],
];
function forestV(i) {
  const c = foliage(16, 16, [...FOREST_BASE, ...FOREST_VAR[i]], RAMP.forest, { wrap: true, bg: '#0a2008', seed: 5 + i });
  if (i === 4) { const x = c.getContext('2d'); for (const [fx, fy] of [[7, 6], [10, 9]]) { R(x, '#b83a2c', fx, fy); R(x, '#ff8a6a', fx, fy - 1); } }
  return c;
}

// ---------- Trong nhà ----------

function floorV(v) {
  const tones = ['#a06a3a', '#a8723f', '#94603a', '#9c683a'];
  return pix(16, 16, (px, py) => {
    const row = py >> 2, k = py & 3;
    if (k === 3) return '#4a2c14';
    const off = [3, 11, 7, 14][(row + v * 2) % 4];
    if (px === off) return '#4a2c14';
    const plank = row * 2 + (px > off ? 1 : 0);
    let c = tones[(plank + v * 3) % 4];
    if (k === 0) c = shade(c, 1.14);
    if (k === 2) c = shade(c, 0.92);
    if (k === 1 && ((px * 5 + row * 3 + v * 2) % 9 === 0)) c = shade(c, 0.84);
    if (k === 2 && ((px * 3 + row * 7 + v) % 11 === 0)) c = shade(c, 0.84);
    if (px === off + 1 || (off === 15 && px === 0)) c = shade(c, 1.08);
    if (v === 1 && row === 1 && Math.hypot(px - 5.5, py - 5.5) < 1.3) return py < 5 ? '#6b4020' : '#5c3a1a';
    if (px === off - 1 && k === 1) return '#c08a52';
    return c;
  });
}

function wallInner() {
  return pix(16, 32, (px, py) => {
    if (py === 0) return '#3b2412';
    if (py <= 2) return py === 1 ? '#7a4a22' : '#5c3a1a';
    if (py <= 21) { // vách đất trát vôi vàng
      if (py === 3) return '#bfa173';
      if (py === 4) return '#d6bb8c';
      const n = hash(px + 3, py * 3);
      if (n < 0.06) return '#cdb07e';
      if (n > 0.95) return '#f6e6c4';
      if ((px * 7 + py * 3) % 23 === 0) return '#d8bf92';
      return py > 18 ? '#e2c99c' : '#ead4a8';
    }
    if (py === 22) return '#e0a868';
    if (py === 23) return '#8a5a2b';
    if (py === 24) return '#5c3a1a';
    if (py <= 29) { // chân tường ván dọc
      const k = px % 4;
      if (k === 0) return '#5c3a1a';
      if (k === 1) return py === 25 ? '#c88e52' : '#b07a45';
      return py === 29 ? '#7a4a22' : (hash(px, py) < 0.15 ? '#8a5a2b' : '#9a6436');
    }
    return py === 30 ? '#4a2c14' : '#2e1a0c';
  });
}

function doorMat() {
  return draw(16, 16, x => {
    R(x, OUT, 1, 3, 14, 10);
    const c = pix(12, 8, (px, py) => {
      if (py === 0 || py === 7 || px === 0 || px === 11) return '#b8402e';
      if (py === 1 || py === 6) return '#e8c870';
      const ck = ((px >> 1) + (py >> 1)) % 2;
      return ck ? (py < 4 ? '#d9b860' : '#c9a24a') : (py < 4 ? '#c9a24a' : '#a8822e');
    });
    x.drawImage(c, 2, 4);
    for (const fy of [4, 6, 8, 10]) { R(x, '#e8c870', 0, fy); R(x, '#e8c870', 15, fy); R(x, '#a8822e', 0, fy + 1); R(x, '#a8822e', 15, fy + 1); }
    R(x, '#f7d547', 6, 7, 4, 2); R(x, '#b8402e', 7, 7, 2, 2);
  });
}

function bed(sleep) {
  const W = RAMP.wood;
  return draw(32, 24, x => {
    // đầu giường
    R(x, OUT, 0, 0, 32, 8);
    R(x, W[1], 1, 1, 30, 6);
    R(x, W[2], 4, 2, 24, 3); R(x, W[3], 4, 2, 24, 1); R(x, W[1], 4, 4, 24, 1);
    for (const px of [1, 28]) { R(x, W[2], px, 1, 3, 6); R(x, W[3], px, 1, 3, 1); R(x, W[0], px + 2, 2, 1, 5); }
    for (let px = 8; px < 26; px += 6) R(x, W[0], px, 2, 1, 3);
    // thành giường
    R(x, OUT, 0, 7, 32, 15);
    R(x, W[1], 1, 7, 30, 14);
    // nệm + ga
    R(x, '#f3ead2', 2, 7, 28, 13);
    R(x, '#d6c8a2', 2, 7, 28, 1);
    R(x, '#e4d8b8', 28, 8, 2, 12);
    // gối
    R(x, OUT, 8, 8, 16, 6);
    R(x, '#ffffff', 9, 9, 14, 4);
    R(x, '#dfe4ee', 9, 12, 14, 1); R(x, '#dfe4ee', 21, 9, 2, 3);
    R(x, '#f3ead2', 8, 8); R(x, '#f3ead2', 23, 8); R(x, '#f3ead2', 8, 13); R(x, '#f3ead2', 23, 13);
    R(x, '#c8d0de', 15, 10, 2, 1);
    if (sleep) {
      // đầu người ngủ trên gối
      x.drawImage(spr([
        '.oooooo.',
        'ohhHhhho',
        'ohhhhhHo',
        'oHssssHo',
        'osesseso',
        'oscsscso',
      ], { o: OUT, h: '#7a4a22', H: '#5c3a1a', s: '#ffd7b0', e: '#3b2412', c: '#f4a0a8' }), 12, 8);
      R(x, '#a06a3a', 13, 9);
    }
    // chăn hoa
    R(x, OUT, 1, 14, 30, 8);
    const quilt = pix(28, 6, (px, py) => {
      if (py === 0) return '#ffffff';
      if (py === 1) return '#e4d8b8';
      const fl = (px % 6 === 2 && py === 3) || (px % 6 === 5 && py === 5);
      const lit = px < 4 || py === 2;
      if (fl) return '#f7d547';
      if ((px % 6 === 1 || px % 6 === 3) && py === 3 || (px % 6 === 2 && (py === 2 || py === 4))) return '#ffb0a0';
      return lit ? '#e8604a' : px > 24 ? '#a83224' : '#cc4434';
    });
    x.drawImage(quilt, 2, 15);
    if (sleep) {
      ell(x, 'rgba(255,190,170,0.35)', 15, 17, 7, 1.6);
      R(x, '#a83224', 8, 20, 16, 1); R(x, '#ffffff', 10, 15, 10, 1);
    }
    // chân giường
    R(x, OUT, 0, 21, 32, 3);
    R(x, W[2], 1, 21, 30, 1); R(x, W[0], 1, 22, 30, 1);
    for (const px of [1, 28]) { R(x, W[2], px, 21, 3, 2); R(x, W[3], px, 21, 1, 2); }
  });
}

function wardrobe() {
  const W = RAMP.wood;
  return draw(24, 32, x => {
    shadow(x, 12, 31, 11, 1.2, 0.3);
    R(x, OUT, 0, 0, 24, 5);
    R(x, W[2], 1, 1, 22, 3); R(x, W[3], 1, 1, 22, 1); R(x, W[0], 1, 3, 22, 1);
    R(x, OUT, 1, 4, 22, 25);
    R(x, W[1], 2, 5, 20, 23);
    for (const dx of [2, 12]) {
      R(x, W[2], dx, 5, 10, 23);
      R(x, W[3], dx, 5, 1, 23); R(x, W[3], dx, 5, 10, 1);
      R(x, W[0], dx + 9, 5, 1, 23);
      // ô pa-nô
      for (const [py, ph] of [[7, 9], [18, 8]]) {
        R(x, W[0], dx + 2, py, 6, ph); R(x, W[1], dx + 3, py + 1, 5, ph - 1); R(x, W[2], dx + 3, py + 1, 4, 1);
        R(x, '#9a6436', dx + 3, py + 2, 4, ph - 3);
      }
    }
    R(x, OUT, 11, 5, 2, 23);
    // tay nắm đồng
    for (const kx of [9, 13]) { R(x, OUT, kx, 15, 2, 3); R(x, '#f2c838', kx, 15, 2, 2); R(x, '#fff4b0', kx, 15); }
    R(x, W[0], 2, 27, 20, 1);
    // chân
    for (const lx of [2, 19]) { R(x, OUT, lx, 28, 3, 4); R(x, W[1], lx + 1, 28, 1, 3); }
  });
}

function table() {
  const W = RAMP.wood;
  return draw(32, 20, x => {
    shadow(x, 16, 19, 15, 1.2, 0.25);
    // chân
    for (const lx of [2, 27]) { R(x, OUT, lx, 12, 3, 8); R(x, W[1], lx + 1, 12, 1, 7); }
    // mặt bàn
    R(x, OUT, 0, 0, 32, 15);
    const top = pix(30, 10, (px, py) => {
      if (py === 4 || py === 9) return W[1];
      const lit = py === 0 || py === 5;
      if ((px * 3 + py * 11) % 13 === 0) return '#a06a38';
      return lit ? '#d09a5a' : px < 3 ? '#c08a52' : '#b07a45';
    });
    x.drawImage(top, 1, 1);
    R(x, W[1], 1, 11, 30, 2); R(x, W[2], 1, 11, 30, 1); R(x, W[0], 1, 13, 30, 1);
    // bộ ấm chén
    // khay tre tròn
    ell(x, OUT, 15, 7, 8, 2.5); ell(x, '#c9a24a', 15, 7, 7, 1.5); R(x, '#e2c26a', 10, 6, 7, 1); R(x, '#a8822e', 11, 8, 10, 1);
    // ấm sứ men lam
    const pot = spr([
      '...oo....',
      '..oWWo...',
      '.oooooo..',
      'ooWwwwwoo',
      'oWwwwwbo.o',
    ].map(r => r.padEnd(10, '.')).concat([
      'oWbbbbbooo',
      'oWwwwwbo..',
      '.oWwwbo...',
      '..oooo....',
    ]), { o: OUT, W: '#ffffff', w: '#e6ecf4', b: '#3f6ab8' });
    x.drawImage(pot, 8, 0);
    // chén trà
    for (const [cx, cy] of [[18, 5], [21, 7]]) {
      R(x, OUT, cx, cy, 4, 4); R(x, '#8a4a1a', cx + 1, cy + 1, 2, 1); R(x, '#ffffff', cx + 1, cy + 2, 2, 1); R(x, '#3f6ab8', cx + 2, cy + 2);
      R(x, '#c9a24a', cx, cy + 3); R(x, '#c9a24a', cx + 3, cy + 3);
    }
    // dĩa trái cây
    ell(x, OUT, 4, 9, 2, 1); R(x, '#e5452f', 3, 8, 2, 1); R(x, '#f59a23', 5, 8, 1, 1);
  });
}

function stove() {
  return draw(24, 24, x => {
    shadow(x, 12, 23, 11, 1.2, 0.3);
    // khối bếp gạch
    R(x, OUT, 1, 9, 22, 15);
    const B = RAMP.brick;
    const bricks = pix(20, 13, (px, py) => {
      if (py <= 1) return py === 0 ? B[3] : B[2];
      const row = Math.floor((py - 2) / 3), k = (py - 2) % 3;
      if (k === 2) return '#c8b49a';
      if (((px + (row % 2) * 3) % 6) === 0) return '#c8b49a';
      return k === 0 ? B[2] : (px > 16 ? B[0] : B[1]);
    });
    x.drawImage(bricks, 2, 10);
    // miệng lò có lửa
    R(x, OUT, 6, 14, 12, 10);
    const fire = pix(10, 9, (px, py) => {
      const hgt = 4 + Math.round(hash(px, 2) * 3) + (px > 2 && px < 7 ? 1 : 0);
      if (py >= 9 - hgt) {
        const t = (py - (9 - hgt)) / hgt;
        return t < 0.25 ? '#e5452f' : t < 0.55 ? '#f59a23' : t < 0.85 ? '#f7d547' : '#fff3c0';
      }
      return py < 2 ? '#120a06' : '#24140a';
    });
    x.drawImage(fire, 7, 15);
    R(x, OUT, 6, 13, 12, 1);
    // củi thò ra
    for (const [lx, ly] of [[4, 21], [16, 20]]) { R(x, OUT, lx, ly, 5, 3); R(x, '#8a5a2b', lx + 1, ly + 1, 3, 1); R(x, '#e0a868', lx, ly + 1); }
    // nồi gang trên bếp
    ell(x, OUT, 12, 6, 8, 5);
    ell(x, '#3a3a44', 12, 6, 7, 4);
    R(x, '#5a5a66', 6, 4, 4, 1); R(x, '#767686', 7, 3, 3, 1);
    ell(x, OUT, 12, 3, 6, 2); ell(x, '#5a5a66', 12, 3, 5, 1); R(x, '#8a8a98', 8, 2, 4, 1);
    R(x, OUT, 11, 0, 3, 2); R(x, '#b07a45', 12, 0, 1, 1);
    for (const hx of [3, 20]) { R(x, OUT, hx, 5, 2, 2); }
    // khói
    R(x, 'rgba(255,255,255,0.55)', 16, 0, 1, 1); R(x, 'rgba(255,255,255,0.45)', 17, 1, 1, 1);
  });
}

function rug() {
  return pix(48, 32, (px, py) => {
    // tua rua hai đầu
    if (px <= 1 || px >= 46) return (py >= 2 && py <= 29 && py % 2 === 0) ? (px === 0 || px === 47 ? '#d9c08a' : '#f0dcae') : null;
    if (py === 1 || py === 30 || px === 2 || px === 45) return py === 0 || py === 31 ? null : OUT;
    if (py === 0 || py === 31) return null;
    const ix = px - 3, iy = py - 2; // 0..41, 0..27
    const e = Math.min(ix, iy, 41 - ix, 27 - iy);
    if (e === 0) return '#e0b050';
    if (e === 1) return '#3a4a7a';
    if (e === 2) return ((ix + iy) % 4 < 2) ? '#e0b050' : '#3a4a7a';
    if (e === 3) return '#3a4a7a';
    if (e === 4) return '#e0b050';
    // nền đỏ + hoạ tiết trám ở giữa
    const cx = Math.abs(ix - 20.5), cy = Math.abs(iy - 13.5);
    const dmd = cx / 1.5 + cy;
    if (dmd < 3) return '#f3ead2';
    if (dmd < 4) return '#e0b050';
    if (dmd < 6.5) return '#3a4a7a';
    if (dmd < 7.5) return '#e0b050';
    const corner = Math.min(e, 99) < 9 && ((Math.abs(ix - 7) < 2 && Math.abs(iy - 7) < 2) || (Math.abs(ix - 34) < 2 && Math.abs(iy - 7) < 2) || (Math.abs(ix - 7) < 2 && Math.abs(iy - 20) < 2) || (Math.abs(ix - 34) < 2 && Math.abs(iy - 20) < 2));
    if (corner) return (Math.abs(ix - 7) + Math.abs(iy - 7)) % 2 ? '#e0b050' : '#f3ead2';
    const n = hash(px, py);
    if (n < 0.06) return '#8e2a20';
    return (iy < 6 || ix < 7) ? '#b83a2c' : '#a8342a';
  });
}

function windowW() {
  return draw(16, 16, x => {
    R(x, OUT, 1, 0, 14, 14);
    R(x, RAMP.wood[1], 2, 1, 12, 12); R(x, RAMP.wood[2], 2, 1, 12, 1); R(x, RAMP.wood[2], 2, 1, 1, 12);
    const glass = pix(10, 10, (px, py) => {
      if (px === 4 || px === 5 || py === 4 || py === 5) return null;
      if ((px + py === 2) || (px + py === 3 && px < 3) || (px + py === 8 && px > 5 && py < 4)) return '#ffffff';
      return py < 2 ? '#c8ecfa' : py > 7 ? '#7cc0e4' : '#9ed8f0';
    });
    R(x, OUT, 3, 2, 10, 10);
    x.drawImage(glass, 3, 2);
    R(x, RAMP.wood[2], 7, 2, 2, 10); R(x, RAMP.wood[2], 3, 6, 10, 2);
    R(x, RAMP.wood[3], 7, 6, 1, 1);
    // bậu cửa
    R(x, OUT, 0, 12, 16, 4);
    R(x, RAMP.wood[3], 1, 13, 14, 1); R(x, RAMP.wood[1], 1, 14, 14, 1);
    // rèm hai bên
    for (const [cx, d] of [[3, 1], [12, -1]]) { R(x, '#e5452f', cx, 2, 1, 6); R(x, '#ff8a6a', cx, 2, 1, 2); R(x, '#9e2416', cx + d, 7, 1, 2); }
  });
}

function pottedPlant() {
  return draw(16, 24, x => {
    shadow(x, 8, 23, 6, 1.2, 0.3);
    // lá: bụi tròn + vài lá nhọn vươn ra
    const leaves = draw(16, 18, y => {
      const G = RAMP.leaf;
      for (const [pts, col] of [
        [[[2, 7], [3, 8], [3, 9], [4, 10], [4, 11]], G[3]],
        [[[13, 6], [12, 7], [12, 8], [11, 9], [11, 10]], G[2]],
        [[[7, 0], [7, 1], [8, 2], [8, 3]], G[3]],
        [[[1, 12], [2, 12], [3, 13]], G[2]],
        [[[14, 11], [13, 12], [12, 13]], G[1]],
      ]) for (const [px, py] of pts) { R(y, col, px, py); R(y, col, px + 1, py); }
      y.drawImage(foliage(16, 18, [[8, 6.5, 3.6], [5, 9.5, 3.2], [11, 9.5, 3.2], [8, 11.5, 3.6]], G, { seed: 21 }), 0, 0);
    });
    outline(leaves, '#163a0e');
    const lc = leaves.getContext('2d');
    for (const [hx, hy] of [[2, 7], [7, 0], [13, 6]]) R(lc, '#a8e070', hx, hy);
    // hoa trắng nhỏ
    for (const [fx, fy] of [[6, 5], [10, 8], [7, 10]]) { R(lc, '#ffffff', fx, fy); R(lc, '#f7d547', fx + 1, fy); }
    x.drawImage(leaves, 0, 0);
    // chậu đất nung
    R(x, OUT, 3, 15, 10, 9);
    R(x, '#c0603e', 4, 16, 8, 2); R(x, '#e08a62', 4, 16, 8, 1);
    R(x, OUT, 3, 18, 10, 1);
    R(x, '#b4583a', 5, 19, 6, 4); R(x, '#d0805a', 5, 19, 1, 4); R(x, '#8e4028', 10, 19, 1, 4);
    R(x, OUT, 4, 19, 1, 4); R(x, OUT, 11, 19, 1, 4); R(x, OUT, 4, 23, 8, 1);
    R(x, '#4a2c14', 5, 15, 6, 1);
  });
}

// ---------- Làng ----------

function marketStall() {
  const W = RAMP.wood;
  return draw(48, 40, x => {
    shadow(x, 24, 38, 23, 2);
    // vách sau trong bóng mái
    R(x, '#4a3020', 5, 12, 38, 14);
    for (let px = 8; px < 42; px += 6) R(x, '#3a2418', px, 12, 1, 14);
    // hàng treo: chuối, ớt, tỏi
    line(x, '#c9b88a', 6, 13, 42, 13);
    for (const [bx, by] of [[9, 14], [11, 14], [10, 16], [12, 15]]) { R(x, OUT, bx - 1, by - 1, 3, 4); R(x, '#f7d547', bx, by, 1, 3); R(x, '#fff3a0', bx, by); }
    R(x, '#5c8a2a', 10, 13, 2, 1);
    for (let i = 0; i < 4; i++) { R(x, '#9e2416', 36 + i * 1.5 | 0, 14 + (i % 2), 1, 4); R(x, '#e5452f', 36 + i * 1.5 | 0, 14 + (i % 2), 1, 3); }
    for (const tx of [22, 26]) { ell(x, OUT, tx, 16, 2, 2); ell(x, '#f3ead2', tx, 16, 1, 1); R(x, '#d9c9a0', tx + 1, 17); }
    // cột tre
    for (const px of [2, 42]) post(x, px, 6, 4, 33, RAMP.bamboo, 7);
    // quầy gỗ
    R(x, OUT, 3, 24, 42, 15);
    R(x, W[3], 4, 25, 40, 2); R(x, '#f0c088', 4, 25, 40, 1);
    R(x, W[2], 4, 27, 40, 11);
    for (let px = 10; px < 44; px += 7) R(x, W[1], px, 27, 1, 11);
    R(x, W[1], 4, 31, 40, 1); R(x, W[3], 4, 32, 40, 1);
    R(x, W[0], 4, 37, 40, 1);
    R(x, 'rgba(40,20,8,0.25)', 38, 27, 6, 11);
    // bảng giá phấn
    R(x, OUT, 17, 29, 14, 7); R(x, '#2e3a2e', 18, 30, 12, 5);
    R(x, '#e8e8e0', 19, 31, 4, 1); R(x, '#e8e8e0', 24, 31, 5, 1); R(x, '#e8e8e0', 19, 33, 3, 1); R(x, '#f7d547', 25, 33, 3, 1);
    // mẹt rau củ
    const tray = (cx, fill) => {
      ell(x, OUT, cx, 24, 5, 2); ell(x, '#c9a24a', cx, 24, 4, 1); R(x, '#e2c26a', cx - 3, 23, 4, 1);
      fill(cx);
    };
    tray(9, cx => { for (const [dx, dy] of [[-2, 21], [1, 21], [-1, 19]]) { ell(x, '#1e4d14', cx + dx, dy, 2, 2); ell(x, '#5fb33e', cx + dx, dy, 1, 1); R(x, '#a8e070', cx + dx - 1, dy - 1); R(x, '#e8f8c0', cx + dx, dy); } });
    tray(19, cx => { for (const [dx, dy] of [[-3, 21], [-1, 22], [1, 21], [3, 22], [0, 20]]) { R(x, OUT, cx + dx - 1, dy - 1, 2, 3); R(x, '#f59a23', cx + dx - 1, dy, 1, 2); R(x, '#4fa83a', cx + dx - 1, dy - 2); } });
    tray(29, cx => { for (const [dx, dy] of [[-2, 22], [1, 22], [3, 21], [-1, 20], [2, 20]]) { ell(x, '#7a1a10', cx + dx, dy, 1, 1); R(x, '#e5452f', cx + dx, dy); R(x, '#ffb0a0', cx + dx - 1, dy - 1); } });
    tray(39, cx => { ell(x, OUT, cx, 21, 3, 2); ell(x, '#e07a10', cx, 21, 2, 1); R(x, '#f5b048', cx - 2, 20, 2, 1); R(x, '#b8600f', cx + 1, 21, 1, 2); R(x, '#4fa83a', cx, 18, 1, 2); });
    // mái vải sọc
    const aw = pix(48, 16, (px, py) => {
      if (py < 1) return null;
      if (py <= 9) {
        const t = (py - 1) / 8, l = 4 - 4 * t, r = 43 + 4 * t;
        if (px < Math.round(l) || px > Math.round(r)) return null;
        const s = Math.floor((px - l) / ((r - l) / 8));
        const red = s % 2 === 0;
        const lit = py <= 3;
        if (py === 9) return red ? '#9e3024' : '#c9bc98';
        return red ? (lit ? '#ef6a54' : '#d9483b') : (lit ? '#ffffff' : '#f3ead2');
      }
      const s = Math.floor(px / 6), k = px % 6, red = s % 2 === 0;
      if (py >= 13) { if (py === 13 && k >= 1 && k <= 4) return red ? '#b8352b' : '#ddd2b4'; if (py === 14 && k >= 2 && k <= 3) return red ? '#9e3024' : '#c9bc98'; return null; }
      return red ? (py === 10 ? '#cc4434' : '#b8352b') : (py === 10 ? '#eee4c8' : '#ddd2b4');
    });
    outline(aw);
    x.drawImage(aw, 0, 0);
  });
}

function marketClosed() {
  const W = RAMP.wood;
  return draw(24, 14, x => {
    line(x, '#6b4020', 4, 4, 11, 0); line(x, '#6b4020', 19, 4, 12, 0);
    R(x, OUT, 11, 0, 2, 1); R(x, '#aeaebe', 11, 0);
    R(x, OUT, 0, 4, 24, 10);
    R(x, W[2], 1, 5, 22, 8);
    R(x, W[3], 1, 5, 22, 1); R(x, W[1], 1, 8, 22, 1); R(x, W[3], 1, 9, 22, 1); R(x, W[1], 1, 12, 22, 1);
    for (const [gx, gy] of [[5, 6], [14, 7], [9, 10], [18, 11]]) R(x, '#9a6436', gx, gy, 3, 1);
    for (const [nx, ny] of [[2, 6], [21, 6], [2, 11], [21, 11]]) { R(x, '#5e5e6a', nx, ny); }
    R(x, '#aeaebe', 4, 4); R(x, '#aeaebe', 19, 4);
  });
}

function smithy() {
  const W = RAMP.wood, I = RAMP.iron;
  return draw(56, 48, x => {
    shadow(x, 28, 46, 27, 2);
    // nền đá
    R(x, OUT, 1, 42, 54, 5);
    R(x, '#9a9690', 2, 43, 52, 3); R(x, '#c2beb6', 2, 43, 52, 1);
    for (let px = 6; px < 54; px += 8) R(x, '#7a7670', px, 44, 1, 2);
    // vách sau tối
    R(x, OUT, 3, 16, 50, 27);
    R(x, '#4a3020', 4, 17, 48, 26);
    for (let px = 9; px < 52; px += 6) R(x, '#3a2418', px, 17, 1, 26);
    ell(x, 'rgba(255,140,40,0.16)', 15, 32, 14, 10);
    ell(x, 'rgba(255,170,60,0.14)', 15, 33, 9, 7);
    // dụng cụ treo trên vách
    R(x, '#3a2418', 26, 21, 22, 1);
    // búa
    R(x, OUT, 28, 21, 2, 9); R(x, W[2], 28, 22, 1, 7); R(x, OUT, 26, 22, 6, 4); R(x, I[3], 27, 23, 4, 2); R(x, I[4], 27, 23);
    // kìm
    line(x, OUT, 35, 22, 33, 30); line(x, OUT, 36, 22, 38, 30); R(x, I[3], 35, 22, 2, 2);
    // móng ngựa, liềm
    for (const [hx, hy] of [[42, 23]]) { R(x, OUT, hx, hy, 5, 5); R(x, I[2], hx + 1, hy + 1, 3, 3); R(x, '#4a3020', hx + 2, hy + 2, 1, 3); }
    line(x, I[3], 47, 22, 49, 24); line(x, I[3], 49, 24, 48, 27); R(x, W[2], 47, 27, 1, 2);
    // lò rèn bằng gạch
    const B = RAMP.brick;
    R(x, OUT, 5, 24, 20, 19);
    const brick = pix(18, 17, (px, py) => {
      if (py === 0) return B[3];
      const row = Math.floor((py - 1) / 3), k = (py - 1) % 3;
      if (k === 2 || ((px + (row % 2) * 3) % 6) === 0) return '#8a7060';
      return k === 0 ? B[2] : px > 14 ? B[0] : B[1];
    });
    x.drawImage(brick, 6, 25);
    R(x, OUT, 8, 29, 14, 9);
    const fire = pix(12, 7, (px, py) => {
      const hgt = 3 + Math.round(hash(px + 4, 7) * 3);
      if (py >= 7 - hgt) { const t = (py - (7 - hgt)) / hgt; return t < 0.3 ? '#e5452f' : t < 0.6 ? '#f59a23' : t < 0.9 ? '#f7d547' : '#fff3c0'; }
      return '#1a0e08';
    });
    x.drawImage(fire, 9, 30);
    R(x, '#2a1a10', 9, 36, 12, 1);
    for (const cx of [10, 13, 16, 19]) R(x, '#e5452f', cx, 36);
    // chụp hút khói
    R(x, OUT, 7, 18, 16, 7); R(x, '#6a6a76', 8, 19, 14, 5); R(x, '#8a8a98', 8, 19, 14, 1); R(x, '#4c4c58', 8, 23, 14, 1);
    // ống bễ
    R(x, OUT, 24, 33, 5, 6); R(x, '#8a5a2b', 25, 34, 3, 4); R(x, '#5c3a1a', 25, 36, 3, 1);
    // đe trên gốc gỗ
    R(x, OUT, 32, 37, 11, 8); R(x, W[2], 33, 38, 9, 6); R(x, W[3], 33, 38, 9, 1); R(x, W[1], 40, 38, 2, 6);
    x.drawImage(spr([
      '....oooooooooooooo',
      '.oooDDDDDDDDDDDDDo',
      'oCCCCCCCCCCCCCCCBo',
      '.ooBBBBBBBBBBBBBAo',
      '......oCBBBAo.....',
      '......oCBBBAo.....',
      '.....oCCBBBBAo....',
      '....oCCCBBBBBAo...',
      '....oooooooooooo..',
    ], { o: OUT, D: I[4], C: I[3], B: I[2], A: I[1] }), 28, 29);
    R(x, '#ffffff', 33, 30); R(x, '#f59a23', 40, 30, 2, 1); // thanh sắt nung đỏ trên đe
    // thùng nước tôi thép
    R(x, OUT, 45, 34, 9, 11); R(x, W[2], 46, 35, 7, 9); R(x, W[3], 46, 35, 1, 9); R(x, W[1], 51, 35, 2, 9);
    for (const by of [37, 42]) R(x, I[1], 46, by, 7, 1);
    R(x, '#1f6fd1', 46, 35, 7, 1); R(x, '#8fd3ff', 47, 35, 2, 1);
    // cột
    for (const px of [2, 50]) post(x, px, 14, 4, 30, W);
    // mái ngói + ống khói
    tileRoof(x, 5, 18, [6, 49], [0, 55], ['#5e2a1a', '#86402a', '#a85a3c', '#c87a5a'], 1);
    post(x, 10, 2, 7, 10, RAMP.brick);
    R(x, OUT, 9, 1, 9, 3); R(x, '#8a7060', 10, 2, 7, 1); R(x, '#24140a', 11, 1, 5, 1);
    for (const yy of [6, 9]) R(x, '#8a7060', 11, yy, 5, 1);
    R(x, OUT, 10, 11, 7, 1);
    for (const [sx, sy, a] of [[18, 0, 0.6], [20, 1, 0.5], [19, 2, 0.4], [22, 0, 0.35]]) R(x, `rgba(230,230,230,${a})`, sx, sy, 2, 1);
    // biển hiệu hình đe
    R(x, '#3a2418', 26, 18, 1, 2); R(x, '#3a2418', 31, 18, 1, 2);
    R(x, OUT, 24, 19, 10, 6); R(x, W[3], 25, 20, 8, 4); R(x, W[2], 25, 23, 8, 1);
    R(x, '#3a3a44', 26, 21, 6, 1); R(x, '#3a3a44', 28, 22, 2, 1); R(x, '#3a3a44', 27, 23, 4, 1);
  });
}

function thatchRoof(x, y0, y1, top, bot, seed = 0) {
  const T = RAMP.thatch;
  const c = pix(x.canvas.width, x.canvas.height, (px, py) => {
    if (py < y0 || py > y1 + 2) return null;
    const t = Math.min(1, (py - y0) / (y1 - y0));
    const l = top[0] + (bot[0] - top[0]) * t, r = top[1] + (bot[1] - top[1]) * t;
    if (px < Math.round(l) || px > Math.round(r)) return null;
    const fringe = y1 + Math.floor(hash(px + seed, 3) * 3);
    if (py > fringe) return null;
    if (py - y0 <= 2) return py - y0 === 1 ? T[1] : T[0]; // bờ nóc buộc lạt
    if (py >= fringe - 1) return py === fringe ? T[0] : T[1];
    const li = Math.floor((py - y0 - 3) / 6), layer = (py - y0 - 3) % 6;
    const strand = hash(px + seed + li * 3, li + 9);
    let v = 0.58 - (px - l) / (r - l) * 0.22 + (layer < 2 ? 0.14 : 0) - (layer === 5 ? 0.3 : 0);
    if (strand < 0.22) v -= 0.18; else if (strand > 0.85) v += 0.12;
    if (layer === 4 && hash(px, li) < 0.5) v -= 0.15;
    if (px < l + 2) v += 0.12;
    return lvl(T, v);
  });
  outline(c);
  x.drawImage(c, 0, 0);
  for (let px = top[0] + 3; px < top[1] - 2; px += 7) { R(x, '#4a3010', px, y0 + 1, 1, 2); }
}

function villageHouseA() {
  return draw(48, 48, x => {
    shadow(x, 24, 46, 23, 2);
    // tường đất
    R(x, OUT, 4, 20, 40, 26);
    const wall = pix(38, 24, (px, py) => {
      const n = hash(px + 5, py * 2 + 1);
      if (py > 20) return n < 0.3 ? '#9a7a52' : '#a8885e';
      if (n < 0.07) return '#c09a6a';
      if (n > 0.95) return '#ecd6ae';
      return px < 2 ? '#e2c69a' : '#d8b98a';
    });
    x.drawImage(wall, 5, 21);
    for (const px of [5, 41]) { R(x, RAMP.wood[1], px, 21, 2, 24); R(x, RAMP.wood[2], px, 21, 1, 24); }
    R(x, 'rgba(60,30,10,0.35)', 5, 21, 38, 4);
    // cửa
    R(x, OUT, 19, 27, 11, 18); R(x, '#5c3a1a', 20, 28, 9, 17);
    for (const px of [20, 23, 26]) { R(x, '#8a5a30', px, 28, 2, 17); R(x, '#a06a3a', px, 28, 1, 17); }
    R(x, RAMP.wood[2], 18, 26, 13, 2); R(x, RAMP.wood[3], 18, 26, 13, 1);
    R(x, '#f7d547', 27, 36);
    // cửa sổ song gỗ
    R(x, OUT, 8, 28, 9, 8); R(x, '#24160c', 9, 29, 7, 6);
    for (const px of [10, 12, 14]) { R(x, RAMP.wood[2], px, 29, 1, 6); }
    R(x, RAMP.wood[3], 7, 35, 11, 2); R(x, RAMP.wood[1], 7, 36, 11, 1);
    // lu nước
    ell(x, OUT, 37, 40, 5, 5); ell(x, '#8a4a2a', 37, 40, 4, 4);
    R(x, '#b06a40', 34, 38, 2, 4); R(x, '#d08a5a', 34, 38, 1, 2); R(x, '#6a3418', 39, 39, 2, 5);
    R(x, OUT, 34, 34, 7, 2); R(x, '#24160c', 35, 35, 5, 1); R(x, '#a8603a', 35, 34, 5, 1);
    R(x, '#c9a24a', 40, 33, 1, 3); // gáo dừa
    // mái rạ
    thatchRoof(x, 2, 23, [10, 37], [0, 47], 3);
    // bậc thềm
    R(x, OUT, 3, 44, 42, 3); R(x, '#a8a49c', 4, 44, 40, 2); R(x, '#cac6be', 4, 44, 40, 1);
  });
}

function villageHouseB() {
  return draw(48, 48, x => {
    shadow(x, 24, 46, 23, 2);
    // tường vàng
    R(x, OUT, 3, 19, 42, 27);
    const wall = pix(40, 25, (px, py) => {
      if (py > 21) return py === 22 ? '#8a8478' : '#a8a296';
      const n = hash(px + 1, py + 40);
      if (n < 0.05) return '#e2c370';
      if (n > 0.96) return '#fff0b8';
      return px < 2 ? '#fbe6a0' : '#f2d98a';
    });
    x.drawImage(wall, 4, 20);
    R(x, 'rgba(90,50,10,0.3)', 4, 20, 40, 3);
    // cửa đôi xanh
    R(x, OUT, 18, 26, 13, 19);
    for (const dx of [19, 25]) {
      R(x, '#3f7fa0', dx, 27, 5, 18); R(x, '#5aa0c0', dx, 27, 1, 18); R(x, '#2e5e78', dx + 4, 27, 1, 18);
      R(x, '#2e5e78', dx + 1, 29, 3, 5); R(x, '#2e5e78', dx + 1, 37, 3, 5);
      R(x, '#4a90b0', dx + 1, 30, 3, 3); R(x, '#4a90b0', dx + 1, 38, 3, 3);
    }
    R(x, OUT, 24, 27, 1, 18);
    R(x, '#f7d547', 23, 35); R(x, '#f7d547', 26, 35);
    // cửa sổ có chớp
    for (const wx of [7, 34]) {
      R(x, OUT, wx, 27, 8, 8); R(x, '#24160c', wx + 1, 28, 6, 6);
      R(x, '#9ed8f0', wx + 1, 28, 6, 6); R(x, '#c8ecfa', wx + 1, 28, 2, 2); R(x, OUT, wx + 3, 28, 2, 6); R(x, OUT, wx + 1, 30, 6, 1);
      for (const sx of [wx - 3, wx + 8]) { R(x, OUT, sx, 27, 3, 8); R(x, '#4f8f6a', sx + 1, 28, 1, 6); R(x, '#6fb08a', sx + 1, 28, 1, 1); }
      // bồn hoa
      R(x, OUT, wx - 1, 35, 10, 3); R(x, '#c0603e', wx, 36, 8, 1);
      for (const [fx, col] of [[0, '#e5452f'], [2, '#ff8fb1'], [4, '#f7d547'], [6, '#ffffff']]) { R(x, '#3d8c2a', wx + fx, 34, 2, 1); R(x, col, wx + fx + (fx % 4 ? 1 : 0), 33); }
    }
    // mái ngói đỏ
    tileRoof(x, 1, 21, [8, 39], [0, 47], RAMP.tile, 0);
    // đầu hồi trang trí
    for (const [ex, d] of [[7, -1], [40, 1]]) { R(x, OUT, ex, 0, 2, 2); R(x, '#c44434', ex + (d < 0 ? 1 : 0), 0); }
    // bậc thềm
    R(x, OUT, 2, 44, 44, 3); R(x, '#a8a49c', 3, 44, 42, 2); R(x, '#cac6be', 3, 44, 42, 1);
    R(x, OUT, 16, 43, 17, 1); R(x, '#cac6be', 17, 43, 15, 0);
  });
}

function friendGate() {
  const W = RAMP.wood;
  return draw(40, 36, x => {
    for (const cx of [6, 33]) shadow(x, cx, 34, 5, 1.4);
    for (const px of [3, 31]) {
      post(x, px, 8, 6, 26, W);
      R(x, OUT, px - 1, 30, 8, 6); R(x, '#a8a49c', px, 31, 6, 4); R(x, '#cac6be', px, 31, 6, 1); R(x, '#86827a', px + 5, 31, 1, 4);
    }
    // xà ngang
    R(x, OUT, 0, 7, 40, 5); R(x, W[2], 1, 8, 38, 3); R(x, W[3], 1, 8, 38, 1); R(x, W[1], 1, 10, 38, 1);
    R(x, W[0], 1, 8, 1, 3); R(x, W[0], 38, 8, 1, 3);
    // mái ngói nhỏ có đầu đao
    tileRoof(x, 1, 7, [5, 34], [0, 39], RAMP.tile, 2);
    for (const [ex, d] of [[0, 1], [39, -1]]) { R(x, OUT, ex, 3, 1, 4); R(x, OUT, ex + d, 2, 1, 1); R(x, '#e06a52', ex, 4, 1, 2); }
    // dây treo + biển trống
    R(x, '#3a2418', 14, 12, 1, 2); R(x, '#3a2418', 25, 12, 1, 2);
    R(x, OUT, 11, 13, 18, 10);
    R(x, W[3], 12, 14, 16, 8); R(x, '#f0c088', 12, 14, 16, 1); R(x, W[2], 12, 21, 16, 1); R(x, W[2], 27, 14, 1, 8);
    R(x, '#c89058', 14, 16, 4, 1); R(x, '#c89058', 21, 19, 5, 1);
  });
}

function homeGate() {
  return draw(40, 36, x => {
    for (const cx of [6, 33]) shadow(x, cx, 34, 5, 1.4);
    for (const px of [4, 31]) post(x, px, 6, 5, 29, RAMP.bamboo, 6);
    // thanh ngang tre
    R(x, OUT, 2, 8, 36, 4); R(x, RAMP.bamboo[2], 3, 9, 34, 2); R(x, RAMP.bamboo[3], 3, 9, 34, 1);
    for (const px of [12, 20, 28]) R(x, RAMP.bamboo[0], px, 9, 1, 2);
    // giàn hoa giấy
    const leaves = foliage(40, 22, [[4, 7, 4.5], [10, 4.5, 5], [17, 3.5, 4.6], [24, 3.5, 4.6], [31, 4.5, 5], [36, 7, 4.5], [5, 13, 3.4], [35, 14, 3.6], [6, 18, 2.4], [34, 19, 2.6]], RAMP.leaf, { seed: 9 });
    const flowers = foliage(40, 22, [[3, 5, 2.4], [9, 3, 2.6], [14, 5.5, 2.2], [20, 2.5, 2.6], [26, 4.5, 2.4], [32, 2.5, 2.4], [37, 6, 2.4], [6, 11, 2], [34, 12, 2.2], [4, 16, 1.7], [36, 17, 1.6], [12, 8, 1.5], [29, 8, 1.6]], ['#7a1648', '#b82a6e', '#e04a90', '#f47ab4', '#ffc0dc'], { seed: 4 });
    const arch = draw(40, 22, y => { y.drawImage(leaves, 0, 0); y.drawImage(flowers, 0, 0); });
    outline(arch, '#2a1420');
    x.drawImage(arch, 0, 0);
    // biển nhỏ hình mầm cây
    R(x, '#5c3a1a', 16, 12, 1, 2); R(x, '#5c3a1a', 23, 12, 1, 2);
    R(x, OUT, 14, 13, 12, 8); R(x, RAMP.wood[3], 15, 14, 10, 6); R(x, RAMP.wood[2], 15, 19, 10, 1);
    R(x, '#3d8c2a', 19, 16, 2, 3); R(x, '#5fb33e', 17, 15, 2, 2); R(x, '#5fb33e', 21, 15, 2, 1); R(x, '#8fd65a', 17, 15);
    // cỏ dưới chân cột
    for (const px of [3, 9, 30, 36]) { R(x, '#3d8c2a', px, 33, 1, 2); R(x, '#5fb33e', px + 1, 32, 1, 3); }
  });
}

function lampPost() {
  const I = RAMP.iron;
  return draw(12, 30, x => {
    shadow(x, 6, 29, 4, 1);
    post(x, 4, 9, 4, 19, ['#2e2e36', '#3a3a44', '#5a5a66', '#8a8a98']);
    R(x, OUT, 2, 26, 8, 4); R(x, '#8a8478', 3, 27, 6, 2); R(x, '#aaa498', 3, 27, 6, 1);
    // đèn lồng kính
    R(x, OUT, 1, 2, 10, 8);
    R(x, '#ffe9a0', 2, 3, 8, 6); R(x, '#fff8d8', 3, 3, 2, 3); R(x, '#f7c843', 7, 4, 2, 5);
    R(x, OUT, 5, 2, 2, 8);
    R(x, '#f59a23', 5, 6, 2, 2);
    // nắp
    R(x, OUT, 0, 0, 12, 3); R(x, I[2], 1, 1, 10, 1); R(x, I[3], 1, 1, 4, 1);
    R(x, OUT, 5, -1 + 1, 2, 1);
    R(x, OUT, 2, 9, 8, 2); R(x, I[2], 3, 9, 6, 1);
    // quầng sáng
    R(x, 'rgba(255,230,140,0.25)', 0, 3, 1, 6); R(x, 'rgba(255,230,140,0.25)', 11, 3, 1, 6);
  });
}

function benchStone() {
  return draw(24, 14, x => {
    shadow(x, 12, 12, 11, 1.6);
    for (const px of [2, 17]) { R(x, OUT, px, 6, 5, 7); R(x, '#a8a49c', px + 1, 7, 3, 5); R(x, '#cac6be', px + 1, 7, 1, 5); R(x, '#86827a', px + 3, 7, 1, 5); }
    R(x, OUT, 0, 1, 24, 8);
    const top = pix(22, 6, (px, py) => {
      const n = hash(px + 2, py + 7);
      if (py >= 4) return py === 4 ? '#b4b0a8' : '#9a968e';
      if (n < 0.12) return '#b4b0a8';
      if (n > 0.92) return '#ffffff';
      return py === 0 ? '#f2efe8' : '#e2ded6';
    });
    x.drawImage(top, 1, 2);
  });
}

// ---------- NPC (16x24, frames[hướng][khung] như character()) ----------

const LEGS_F = [
  ['....oppPPppo....', '....oppooppo....', '...offfoofffo...', '....ooo..ooo....'],
  ['....oppPPppo....', '....oppoofffo...', '...offfo.ooo....', '....ooo.........'],
  ['....oppPPppo....', '...offfooppo....', '....ooo.offfo...', '.........ooo....'],
];
const LEGS_S = [
  ['.....oppPPo.....', '.....oppPPo.....', '....offfffo.....', '....ooooooo.....'],
  ['.....oppPPo.....', '....oppooPPo....', '...offo..offo...', '...ooo...ooo....'],
];

const HAT_NON = [
  '......oooo......',
  '.....onnnNo.....',
  '....onnnnNNo....',
  '...onnnnnNNNo...',
  '..onnnnnnNNNNo..',
  '.onnnnnnnnNNNNo.',
  'oyyyyyyyyyyyyyyo',
];
const BATU = {
  down: [...HAT_NON,
    '..ohSSSSSSSSho..',
    '..ohsessssesho..',
    '..oscsssssscso..',
    '...osssmmssso...',
    '....oSssssSo....',
    '..oatttsstttTo..',
    '..oatttbttttTo..',
    '.oaTtttbttttTTo.',
    '.oaTttttttttTTo.',
    '.oaTtTTtbTTtTTo.',
    '.osTttttttttTso.',
    '..oTTttttttTTo..',
    '...oTTTTTTTTo...'],
  up: [...HAT_NON,
    '..ohhhhhhhhhho..',
    '..ohhhhhhhhhho..',
    '..oHhhhoohhhHo..',
    '...oHHohhoHHo...',
    '....oSSooSSo....',
    '..oattttttttTo..',
    '..oattttttttTo..',
    '.oaTttttttttTTo.',
    '.oaTttttttttTTo.',
    '.oaTttttttttTTo.',
    '.osTttttttttTso.',
    '..oTTttttttTTo..',
    '...oTTTTTTTTo...'],
  left: [...HAT_NON,
    '..oSSSSSShhho...',
    '..osesssshhHo...',
    '.ossssc shhHo...'.replace(' ', 's'),
    '..osmsssshHHHo..',
    '...oSssssoHo....',
    '....oatttTo.....',
    '...oatttttTo....',
    '...oattTtttTo...',
    '...oattTtttTo...',
    '...oattTtttTo...',
    '...oattstttTo...',
    '...oTTttttTTo...',
    '....oTTTTTTo....'],
};
const ONGSAU = {
  down: [
    '................',
    '.....oooooo.....',
    '....ohhhhhho....',
    '...ohhhhhhhho...',
    '..okkkkkkkkkko..',
    '..oKssssssssKo..',
    '..osGGssssGGso..',
    '..ossessssesso..',
    '..oSsssSSsssSo..',
    '..oggGggggGggo..',
    '..oggggmmggggo..',
    '...oggggggggo...',
    '.otTToGggGoTTto.',
    '.otToLaaaaAoTto.',
    '.otToLaaaaAoTto.',
    '.osSoLaaaaAoSso.',
    '.osSoLaAAaAoSso.',
    '.oSsoLaaaaAosSo.',
    '..ooLaaaaaaAoo..',
    '...oAAAAAAAAo...'],
  up: [
    '................',
    '.....oooooo.....',
    '....ohhhhhho....',
    '...ohhhhhhhho...',
    '..okkkkKKkkkko..',
    '..ohhhhkKhhhho..',
    '..ohhhhKkhhhho..',
    '..oHhhhhhhhhHo..',
    '..oHHhhhhhhHHo..',
    '...oHHHHHHHHo...',
    '....oSssssSo....',
    '...oSSssssSSo...',
    '.otttAttttAttto.',
    '.otttAttttAttto.',
    '.otTtAttttAtTto.',
    '.osStAAAAAAtSso.',
    '.osSttttttttSso.',
    '.oSsottttttosSo.',
    '..oottttttttoo..',
    '...oPPPPPPPPo...'],
  left: [
    '................',
    '.....oooooo.....',
    '....ohhhhhho....',
    '...ohhhhhhhho...',
    '..okkkkkkkkkoK..',
    '..osssshhhhhoKk.',
    '..oGGsshhhhho...',
    '..osesshhhhHo...',
    '.ossssShhhhHo...',
    '.oggGgshhhHo....',
    '..oggggsSSHo....',
    '..oggggSSSo.....',
    '...oGggotttTo...',
    '...oLaattttTo...',
    '...oLaaTtttTo...',
    '...oLaasSttTo...',
    '...oLaasSttTo...',
    '...oLaossoAAo...',
    '...oLaaaaaAAo...',
    '....oAAAAAAo....'],
};

const BATU_PAL = {
  o: OUT, n: '#f6e2a0', N: '#d8bc70', y: '#9a7a32',
  h: '#cfcac4', H: '#8e8a88', s: '#ebb994', S: '#c88e66', e: '#2a1a10', c: '#e8968a', m: '#a0504a',
  t: '#8a5a8a', T: '#62406a', a: '#a87aa8', b: '#f3ead2',
  p: '#2f2a36', P: '#1e1a24', f: '#7a4a22',
};
const ONGSAU_PAL = {
  o: OUT, k: '#c0402e', K: '#8a2a1e', h: '#4a4448', H: '#2e2a2e', g: '#e2ded6', G: '#a8a49c',
  s: '#d89a68', S: '#b0744a', e: '#2a1a10', m: '#8a4a3a',
  t: '#4a6a8a', T: '#344c66', a: '#8a5a2b', A: '#6b4020', L: '#b07a45',
  p: '#3a3430', P: '#262220', f: '#2a1a10',
};

function npc(def, pal) {
  const mk = rows => spr(rows, pal);
  const down = LEGS_F.map(l => mk([...def.down, ...l]));
  const up = LEGS_F.map(l => mk([...def.up, ...l]));
  const ls = mk([...def.left, ...LEGS_S[0]]), lw = mk([...def.left, ...LEGS_S[1]]);
  const left = [ls, lw, ls];
  const frames = [down, left, left.map(flip), up];
  // Hai khung đứng yên (nhìn xuống): thở — thân trên hạ 1 điểm ảnh, mắt chớp.
  const blinkRows = def.down.map(r => r.replace(/e/g, 'S'));
  const breathe = draw(16, 24, x => {
    x.drawImage(mk([...def.down, ...LEGS_F[0]]), 0, 0, 16, 20, 0, 1, 16, 20);
    x.drawImage(mk([...blinkRows, ...LEGS_F[0]]), 0, 20, 16, 4, 0, 20, 16, 4);
  });
  const blink = draw(16, 24, x => { x.drawImage(mk([...blinkRows, ...LEGS_F[0]]), 0, 0); });
  void blink;
  return { frames, idle: [down[0], breathe] };
}

// ---------- Công cụ (16x16, 3 cấp: sắt, đồng, vàng) ----------

const METAL = [
  ['#4e5058', '#7a7e88', '#aeb2ba', '#e4e6ea'],
  ['#6e2c16', '#a8502a', '#d9844e', '#f8c09a'],
  ['#8a5410', '#c98e1c', '#f2c838', '#fff4b0'],
];
const HANDLE = [RAMP.wood, ['#2e1a0c', '#5a3818', '#7e5428', '#a87a44'], ['#3a1408', '#6a2416', '#94382a', '#c25a44']];

function sparkle(x, px, py) {
  R(x, '#ffffff', px, py); R(x, '#fff4b0', px - 1, py); R(x, '#fff4b0', px + 1, py); R(x, '#fff4b0', px, py - 1); R(x, '#fff4b0', px, py + 1);
}
function finishTier(c, t, spots) {
  outline(c);
  const x = c.getContext('2d');
  if (t === 1) R(x, '#ffffff', spots[0][0], spots[0][1]);
  if (t === 2) for (const [sx, sy] of spots) sparkle(x, sx, sy);
  return c;
}

function hoe(t) {
  const M = METAL[t], Hd = HANDLE[t];
  const c = draw(16, 16, x => {
    for (let i = 0; i <= 8; i++) { R(x, Hd[3], 1 + i, 14 - i); R(x, Hd[1], 2 + i, 14 - i); }
    R(x, Hd[2], 2, 14); R(x, Hd[2], 3, 13); R(x, Hd[2], 6, 9);
    if (t > 0) { R(x, M[2], 3, 12); R(x, M[1], 4, 12); R(x, M[2], 4, 11); R(x, M[1], 5, 11); }
    // khâu lưỡi ôm đầu cán + lưỡi cuốc chúc xuống
    const head = spr([
      '.ABA..',
      'ABCBA.',
      'ABCBA.',
      '.ABDA.',
      '..BDA.',
      '..BDA.',
      '..BDA.',
      '.BCDA.',
      'BCCDAA',
      'EEEEEE',
    ], { A: M[0], B: M[1], C: M[2], D: M[3], E: M[3] });
    R(x, Hd[3], 10, 5); R(x, Hd[1], 11, 5);
    x.drawImage(head, 9, 1);
  });
  return finishTier(c, t, [[12, 6], [14, 9]]);
}

function can(t) {
  const M = METAL[t];
  const c = draw(16, 16, x => {
    // quai
    for (const [px, py] of [[3, 6], [3, 5], [4, 4], [5, 3], [6, 3], [7, 3], [8, 4], [9, 5]]) R(x, M[1], px, py);
    // thân
    const body = pix(16, 16, (px, py) => {
      if (px < 2 || px > 10 || py < 6 || py > 13) return null;
      if ((px === 2 || px === 10) && (py === 6 || py === 13)) return null;
      if (py === 7 && t > 0) return M[3];
      if (py === 6) return M[2];
      if (px === 3) return M[3];
      if (px >= 9 || py === 13) return M[0];
      if (px === 8 || py === 12) return M[1];
      return M[2];
    });
    x.drawImage(body, 0, 0);
    // vòi
    for (let i = 0; i < 4; i++) { R(x, M[2], 10 + i, 10 - i); R(x, M[1], 11 + i, 10 - i); }
    R(x, M[1], 11, 11);
    // hoa sen
    R(x, M[2], 13, 4, 2, 3); R(x, M[3], 13, 4); R(x, M[0], 14, 6);
    if (t === 0) { R(x, '#5fb8ff', 4, 9, 4, 1); }
  });
  return finishTier(c, t, [[4, 8], [13, 2]]);
}

function sickle(t) {
  const M = METAL[t], Hd = HANDLE[t];
  const c = draw(16, 16, x => {
    const blade = pix(16, 16, (px, py) => {
      const X = px + 0.5, Y = py + 0.5;
      const d1 = Math.hypot(X - 9.6, Y - 7.2), d2 = Math.hypot(X - 10.6, Y - 8.4);
      if (d1 > 5.8 || d2 < 4.9 || Y > 9.2 || X < 5) return null;
      if (d2 < 5.7) return M[3];
      if (d1 > 5.0) return M[0];
      return (X + Y < 12) ? M[2] : M[1];
    });
    x.drawImage(blade, 0, 0);
    // cán gỗ có quấn dây
    for (let i = 0; i < 5; i++) { R(x, Hd[2], 5 - i, 9 + i); R(x, Hd[1], 6 - i, 9 + i); }
    R(x, Hd[3], 4, 10); R(x, Hd[3], 3, 11);
    R(x, '#2e1a0c', 3, 12); R(x, '#2e1a0c', 2, 13);
    R(x, M[1], 6, 8); R(x, M[2], 5, 8); R(x, M[0], 7, 9);
  });
  return finishTier(c, t, [[7, 3], [14, 6]]);
}

function basket(t) {
  const B = ['#7a5a22', '#a8823a', '#cfa85a', '#ecd28e'];
  const rim = t === 0 ? RAMP.wood : METAL[t];
  const c = draw(16, 16, x => {
    // quai
    for (const [px, py] of [[3, 7], [3, 6], [4, 5], [4, 4], [5, 3], [6, 2], [7, 2], [8, 2], [9, 2], [10, 3], [11, 4], [11, 5], [12, 6], [12, 7]]) R(x, rim[1], px, py);
    for (const [px, py] of [[5, 2], [6, 1], [7, 1], [8, 1]]) if (t > 0) R(x, rim[2], px, py + 1);
    // rau trong giỏ (nhiều hơn khi cấp cao)
    const veg = [[6, 7, '#4fa83a', '#8fd65a'], [9, 7, '#e5452f', '#ffb0a0'], [7, 6, '#f59a23', '#ffd08a'], [10, 6, '#4fa83a', '#8fd65a'], [5, 6, '#e5452f', '#ffb0a0']];
    for (const [vx, vy, col, hi] of veg.slice(0, 2 + t * 1 + (t === 2 ? 1 : 0))) { ell(x, col, vx, vy, 1, 1); R(x, hi, vx - 1, vy - 1); }
    // thân giỏ đan
    const body = pix(16, 16, (px, py) => {
      if (py < 8 || py > 14) return null;
      const l = 2 + Math.floor((py - 8) / 3), r = 13 - Math.floor((py - 8) / 3);
      if (px < l || px > r) return null;
      if (py === 8) return px < 5 ? rim[3] : rim[2];
      if (py === 9) return rim[1];
      const ck = ((px >> 1) + (py >> 1)) % 2;
      let v = ck ? 2 : 1;
      if (px <= l + 1) v++;
      if (px >= r - 1 || py === 14) v--;
      return B[Math.max(0, Math.min(3, v))];
    });
    x.drawImage(body, 0, 0);
  });
  return finishTier(c, t, [[11, 9], [4, 2]]);
}

// ---------- HUD & vật phẩm (12x12) ----------

const BOLT = [
  '.....ooooo..',
  '....owyyyo..',
  '....owyYo...',
  '...owyYo....',
  '..owyyyYoooo',
  '.owyyyyyyyyo',
  '.ooooyyyyYo.',
  '....oyyYo...',
  '...oyyYo....',
  '...oyYo.....',
  '..oyYo......',
  '..ooo.......',
];
function boltIcon(tired) {
  const pal = tired ? { o: '#3a3a44', w: '#c8c8d0', y: '#9a9aa6', Y: '#6a6a76' } : { o: OUT, w: '#fffbd8', y: '#ffd83a', Y: '#f08a1a' };
  const c = spr(BOLT, pal);
  if (tired) { const x = c.getContext('2d'); for (const [px, py] of [[6, 4], [5, 5], [6, 6], [5, 7]]) R(x, '#3a3a44', px, py); }
  return c;
}

const DROP_BIG = ['..o..', '.oho.', 'ohhuo', 'ouuuo', 'ouuUo', '.ooo.'];
const DROP_SMALL = ['.o.', 'oho', 'ouo', '.o.'];
function sweatFrame(f) {
  const pal = { o: '#1f4f9a', h: '#ffffff', u: '#8fd3ff', U: '#3f8ce0' };
  const big = spr(DROP_BIG, pal), small = spr(DROP_SMALL, pal);
  return draw(8, 8, x => {
    if (f === 0) { x.drawImage(big, 0, 1); x.drawImage(small, 5, 0); }
    else { x.drawImage(big, 0, 2); x.drawImage(small, 5, 3); R(x, 'rgba(255,255,255,0.8)', 6, 0); R(x, 'rgba(255,255,255,0.8)', 7, 1); }
  });
}

function hoaMai() {
  const c = pix(12, 12, (px, py) => {
    const X = px + 0.5, Y = py + 0.5;
    if (Math.hypot(X - 6, Y - 6) < 1.5) return (X + Y < 12) ? '#f59a23' : '#d0700f';
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + k * Math.PI * 2 / 5, cx = 6 + Math.cos(a) * 2.9, cy = 6 + Math.sin(a) * 2.9;
      const dx = X - cx, dy = Y - cy;
      if (dx * dx + dy * dy < 4.4) return dx + dy < -1.2 ? '#fff6a0' : dx + dy > 1.3 ? '#e0a818' : '#ffd83a';
    }
    return null;
  });
  outline(c);
  const x = c.getContext('2d');
  R(x, '#fff6a0', 6, 6); R(x, '#9e2416', 5, 5);
  return c;
}
function sunIcon() {
  const c = pix(12, 12, (px, py) => {
    const X = px + 0.5 - 6, Y = py + 0.5 - 6, d = Math.hypot(X, Y);
    if (d < 3.3) return X + Y < -2 ? '#fff6b0' : X + Y > 2 ? '#f5a623' : '#ffd83a';
    const a = (Math.atan2(Y, X) / (Math.PI / 4) + 8) % 1;
    if (d > 4.1 && d < 5.6 && (a < 0.2 || a > 0.8)) return '#f59a23';
    return null;
  });
  return outline(c);
}
const MAPLE = [
  '......o.....',
  '.....oOo....',
  '.o..oOOOo..o',
  '.oOooOOOooOo',
  '.oOOOOOOOOOo',
  '.oOOOOyOOOOo',
  '..oOOOyOOOo.',
  '.oOOOOyOOOOo',
  '..ooOOyOOoo.',
  '....ooyoo...',
  '......b.....',
  '.....b......',
];
function mapleIcon() {
  return spr(MAPLE, {
    o: OUT, b: '#6b4020', y: '#f7d547',
    O: (px, py) => px + py < 8 ? '#ffa040' : px + py > 13 ? '#c43a1a' : '#e8601a',
  });
}
function snowIcon() {
  const c = draw(12, 12, x => {
    const C = '#e8f6ff', L = '#9ad0f0';
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) for (let i = -4; i <= 4; i++) R(x, Math.abs(i) > 2 ? L : C, 5 + dx * i, 5 + dy * i);
    for (const [px, py] of [[4, 1], [6, 1], [4, 9], [6, 9], [1, 4], [1, 6], [9, 4], [9, 6]]) R(x, L, px, py);
    R(x, '#ffffff', 5, 5);
  });
  return outline(c, '#24508a');
}

function woodIcon() {
  const c = draw(12, 12, x => {
    const log = (lx, ly) => {
      for (const [dy, col] of [[0, '#b07a45'], [1, '#8a5a2b'], [2, '#8a5a2b'], [3, '#6b4020'], [4, '#5c3a1a']]) R(x, col, lx, ly + dy, 7, 1);
      for (const [gx, gy] of [[1, 1], [4, 2], [2, 3], [5, 1]]) R(x, '#5c3a1a', lx + gx, ly + gy, 1 + (gx % 2), 1);
      R(x, '#d09a5a', lx + 1, ly, 3, 1);
      // mặt cắt tròn có vân
      R(x, '#e8b878', lx + 7, ly, 1, 5); R(x, '#e8b878', lx + 6, ly + 1, 3, 3);
      R(x, '#f6d6a0', lx + 6, ly + 1, 1, 2); R(x, '#f6d6a0', lx + 7, ly);
      R(x, '#b07a45', lx + 7, ly + 2); R(x, '#c98c4a', lx + 8, ly + 3);
    };
    log(2, 1); log(0, 6);
  });
  return outline(c);
}
function stoneIcon() {
  const c = rockField(12, 12, [[5, 7.2, 3.8, 3.2], [8.2, 5.4, 2.8, 2.5]], RAMP.stone, 3);
  outline(c);
  R(c.getContext('2d'), '#4a4650', 5, 7);
  return c;
}
function guidebookIcon() {
  return draw(12, 12, x => {
    R(x, OUT, 1, 0, 10, 12);
    R(x, '#3d8c2a', 2, 1, 8, 8); R(x, '#5fb33e', 3, 1, 7, 1); R(x, '#2a6a1e', 2, 1, 1, 8); R(x, '#2f7424', 9, 2, 1, 7);
    R(x, '#f7d547', 5, 3, 2, 1); R(x, '#f7d547', 4, 4, 4, 2); R(x, '#d19a1c', 5, 6, 2, 1); R(x, '#fff6a0', 4, 4);
    R(x, OUT, 2, 9, 8, 1);
    R(x, '#f3ead2', 2, 10, 8, 1); R(x, '#c9b88a', 9, 10, 1, 1);
    R(x, '#e5452f', 7, 9, 1, 3); R(x, '#9e2416', 7, 11);
  });
}
function todoIcon() {
  return draw(12, 12, x => {
    R(x, OUT, 1, 1, 10, 11); R(x, RAMP.wood[2], 2, 2, 8, 9); R(x, RAMP.wood[1], 9, 2, 1, 9);
    R(x, OUT, 3, 3, 6, 8); R(x, '#fbf6e6', 3, 3, 6, 7);
    R(x, OUT, 4, 0, 4, 3); R(x, '#aeb2ba', 5, 1, 2, 1); R(x, '#e4e6ea', 5, 1);
    for (let i = 0; i < 3; i++) {
      const y = 4 + i * 2;
      R(x, i < 2 ? '#3f8f2c' : '#9a9a9a', 3, y); R(x, '#a8a8a8', 5, y, 3, 1);
    }
    R(x, '#3f8f2c', 4, 5); R(x, '#3f8f2c', 4, 7);
  });
}
const ARROW = [
  '......o.....',
  '......oo....',
  '......owo...',
  'ooooooowro..',
  'owwwwwwrrro.',
  'owrrrrrrrrro',
  'orrrrrrrrrRo',
  'oRRRRRRrrRo.',
  'ooooooorRo..',
  '......oRo...',
  '......oo....',
  '......o.....',
];
const alertArrow = () => spr(ARROW, { o: '#3b1208', w: '#ff9a7a', r: '#e5452f', R: '#9e2416' });

// ---------- Hộp quà & sổ lưu bút ở cổng (issue 29) ----------
// Mỗi trạng thái một sprite riêng: hộp quà đóng / có quà đang chờ / mở nắp (16x20) và sổ lưu bút đóng / mở (16x22).
// Cùng kích thước trong mỗi bộ để vùng chạm không nhảy khi đổi trạng thái.
const RIB = ['#9e2416', '#e5452f', '#ff9a7a'];   // nơ đỏ: tối, vừa, sáng
const BOW = [
  '..ooo....ooo..',
  '.oprro..orrpo.',
  '.orrrroorrrro.',
  '..orrroorrro..',
  '...ooRRRRoo...',
  '.....oRRo.....',
];
const bowImg = () => spr(BOW, { o: OUT, r: RIB[1], p: RIB[2], R: RIB[0] });

// Thân thùng gỗ: ván dọc, nẹp sáng bên trái, dải nơ đỏ chạy giữa
function giftBody(x) {
  const W = RAMP.wood;
  shadow(x, 8, 18, 7, 2);
  R(x, OUT, 2, 8, 12, 10);
  R(x, W[1], 3, 9, 10, 8);
  R(x, W[2], 3, 9, 1, 8); R(x, W[2], 3, 9, 10, 1);
  R(x, W[0], 12, 9, 1, 8); R(x, W[0], 3, 16, 10, 1);
  for (const px of [5, 10]) R(x, W[0], px, 10, 1, 6);
  R(x, RIB[0], 7, 9, 3, 8); R(x, RIB[1], 7, 9, 2, 8); R(x, RIB[2], 7, 9, 1, 8);
}
// Nắp đậy (4 điểm ảnh) ở độ cao y, rộng hơn thân một chút
function giftLid(x, y) {
  const W = RAMP.wood;
  R(x, OUT, 1, y, 14, 4);
  R(x, W[2], 2, y + 1, 12, 2); R(x, W[3], 2, y + 1, 12, 1); R(x, W[0], 2, y + 2, 12, 1);
  R(x, RIB[0], 7, y + 1, 3, 2); R(x, RIB[1], 7, y + 1, 2, 2); R(x, RIB[2], 7, y + 1, 1, 1);
}
const giftBoxClosed = () => draw(16, 20, x => { giftBody(x); giftLid(x, 4); x.drawImage(bowImg(), 1, 0); });
// Có quà đang chờ: quà nhiều tới mức tràn ra, hai gói nằm trước hộp, trên nóc lấp lánh
const giftBoxFull = () => draw(16, 20, x => {
  giftBody(x); giftLid(x, 4); x.drawImage(bowImg(), 1, 0);
  // gói đỏ bên trái
  R(x, OUT, 0, 12, 6, 6); R(x, RIB[1], 1, 13, 4, 4); R(x, RIB[2], 1, 13, 4, 1);
  R(x, '#f2c838', 2, 13, 2, 4); R(x, '#fff6a0', 2, 13, 1, 4); R(x, '#f2c838', 1, 14, 4, 1);
  // bọc lá bên phải
  R(x, OUT, 10, 13, 6, 5); R(x, '#3d8c2a', 11, 14, 4, 3); R(x, '#8fd65a', 11, 14, 3, 1); R(x, '#2f6b1f', 11, 16, 4, 1);
  R(x, '#f3ead2', 12, 15, 2, 1);
  // lấp lánh trên nóc
  for (const [sx, sy] of [[13, 2], [12, 1], [14, 1], [12, 3], [14, 3]]) R(x, sx === 13 ? '#fff6a0' : '#f2c838', sx, sy);
});
// Mở nắp: nắp ngửa ra sau (thấy mặt trong nhạt), lòng hộp tối, quà nằm bên trong
const giftBoxOpen = () => draw(16, 20, x => {
  const W = RAMP.wood;
  giftBody(x);
  R(x, OUT, 1, 1, 14, 5);
  R(x, W[3], 2, 2, 12, 3); R(x, '#f0cf9a', 2, 2, 12, 1); R(x, W[1], 2, 4, 12, 1);
  R(x, RIB[1], 7, 2, 2, 3); R(x, RIB[0], 7, 4, 2, 1);
  R(x, OUT, 2, 6, 12, 6);
  R(x, '#2e1a0c', 3, 7, 10, 4); R(x, '#4a2c14', 3, 10, 10, 1);
  R(x, OUT, 3, 5, 5, 5); R(x, RIB[1], 4, 6, 3, 3); R(x, RIB[2], 4, 6, 3, 1); R(x, '#f2c838', 5, 6, 1, 3); R(x, '#fff6a0', 5, 6, 1, 1);
  R(x, OUT, 8, 6, 5, 5); R(x, '#3d8c2a', 9, 7, 3, 3); R(x, '#8fd65a', 9, 7, 2, 1); R(x, '#f3ead2', 10, 8, 2, 1);
});

// Giá gỗ đỡ sổ lưu bút: cột, đế và mặt giá nghiêng
function bookStand(x) {
  const W = RAMP.wood;
  shadow(x, 8, 20, 6, 1.8);
  R(x, OUT, 6, 13, 4, 7);
  R(x, W[1], 7, 14, 2, 5); R(x, W[2], 7, 14, 1, 5);
  R(x, OUT, 3, 18, 10, 4);
  R(x, W[1], 4, 19, 8, 2); R(x, W[2], 4, 19, 8, 1); R(x, W[0], 4, 20, 8, 1);
  R(x, OUT, 1, 11, 14, 4);
  R(x, W[2], 2, 12, 12, 2); R(x, W[3], 2, 12, 12, 1); R(x, W[0], 2, 14, 12, 1);
}
// Sổ đóng: bìa da đỏ nâu, nhãn vàng, dây đánh dấu thò xuống
const guestBookClosed = () => draw(16, 22, x => {
  bookStand(x);
  R(x, OUT, 3, 5, 10, 7);
  R(x, '#8e2a20', 4, 6, 8, 5); R(x, '#b4463a', 4, 6, 8, 1); R(x, '#6e1c14', 4, 10, 8, 1);
  R(x, '#f3ead2', 11, 6, 1, 5); R(x, '#ddd2b0', 11, 10, 1, 1);
  R(x, '#8a6a28', 5, 7, 5, 3); R(x, '#c9a24a', 5, 7, 5, 2); R(x, '#f2c838', 5, 7, 5, 1);
  R(x, RIB[0], 9, 11, 1, 3); R(x, RIB[1], 9, 11, 1, 2);
});
// Sổ mở: hai trang giấy có dòng chữ nguệch ngoạc, cây bút lông dựng bên phải
const guestBookOpen = () => draw(16, 22, x => {
  bookStand(x);
  R(x, OUT, 0, 4, 16, 9);
  R(x, '#f6efd8', 1, 5, 14, 7); R(x, '#fffbee', 1, 5, 14, 1); R(x, '#ddd2b0', 1, 11, 14, 1);
  R(x, '#c9b88a', 7, 5, 2, 7); R(x, '#8a7a56', 8, 5, 1, 7);
  for (const py of [7, 9]) { R(x, '#6b5a3a', 2, py, 4, 1); R(x, '#6b5a3a', 10, py, 4, 1); }
  R(x, '#6b5a3a', 2, 11, 3, 1);
  line(x, OUT, 11, 8, 14, 2);
  line(x, '#f3ead2', 12, 7, 14, 1); R(x, '#d8cbaa', 13, 3); R(x, '#d8cbaa', 12, 5);
  R(x, '#2e1a0c', 11, 8);
});
// Biểu tượng quà cho toast 🟡 (12x12)
const giftIcon = () => draw(12, 12, x => {
  R(x, OUT, 1, 4, 10, 8);
  R(x, RAMP.wood[2], 2, 5, 8, 6); R(x, RAMP.wood[3], 2, 5, 8, 1); R(x, RAMP.wood[1], 2, 10, 8, 1);
  R(x, RIB[1], 5, 5, 2, 6); R(x, RIB[2], 5, 5, 1, 6); R(x, RIB[0], 2, 7, 8, 1); R(x, RIB[1], 2, 7, 3, 1);
  R(x, OUT, 2, 0, 8, 5);
  for (const px of [3, 7]) { R(x, RIB[1], px, 1, 2, 3); R(x, RIB[2], px, 1, 2, 1); }
  R(x, RIB[0], 5, 1, 2, 4); R(x, RIB[1], 5, 1, 2, 1);
});

// Điện thoại quay số treo tường (gọi bác sĩ thú y) — 16x30: hộp gỗ, ống nghe gác ngang, dây xoắn thả xuống.
function phone() {
  const W = RAMP.wood;
  return draw(16, 30, x => {
    R(x, OUT, 2, 2, 12, 18);                       // thùng máy
    R(x, W[2], 3, 3, 10, 16); R(x, W[3], 3, 3, 10, 1); R(x, W[1], 3, 17, 10, 2); R(x, W[0], 12, 3, 1, 16);
    R(x, OUT, 4, 12, 8, 6); R(x, '#1e3a2e', 5, 13, 6, 4);   // mặt số
    for (const [dx, dy] of [[6, 14], [8, 14], [10, 14], [6, 16], [8, 16], [10, 16]]) R(x, '#cfeaff', dx, dy);
    R(x, OUT, 6, 5, 4, 4); R(x, '#f2c838', 7, 6, 2, 2); R(x, '#fff4b0', 7, 6);   // chuông đồng
    R(x, OUT, 1, 9, 14, 3); R(x, '#2e2e36', 2, 10, 12, 1);   // ống nghe gác ngang
    R(x, '#4c4c58', 2, 9, 3, 1); R(x, '#4c4c58', 11, 9, 3, 1);
    R(x, '#767686', 2, 10); R(x, '#767686', 13, 10);
    for (let i = 0; i < 8; i++) R(x, i % 2 ? '#2e2e36' : '#4c4c58', 8 + (i % 2), 20 + i);   // dây xoắn
    R(x, OUT, 7, 28, 3, 2); R(x, W[1], 8, 28, 1, 1);
  });
}

// ---------- Xuất ----------

const bushes = [0, 1, 2].map(bushV);
const rocks = [0, 1, 2].map(rockV);
const forest = [0, 1, 2, 3, 4, 5].map(forestV);
const floors = [0, 1].map(floorV);
const villageHouses = [villageHouseA(), villageHouseB()];
const baTu = npc(BATU, BATU_PAL), ongSau = npc(ONGSAU, ONGSAU_PAL);

// ---------- Chó canh khách (issue 31) ----------
// Chó con và chó trưởng thành có sprite RIÊNG cho từng tư thế (sủa / chạy / ngủ gật).
// Giữ đúng bảng màu con chó ở art.js: lông vàng cam #d98a3a, mảng kem #fbe7c6.

const DOGP = {
  o: OUT,
  k: '#2a2a2a',   // mắt, mũi
  q: '#a8641f',   // lông trong bóng
  Q: '#d98a3a',   // lông chính
  L: '#f0a855',   // lông bắt sáng (trên-trái)
  W: '#fbe7c6',   // mảng kem
  w: '#dcc49c',   // kem trong bóng
  e: '#8a4a18',   // tai cụp (chó con)
  t: '#e5452f',   // lưỡi
  n: '#f4a0a8',   // lưỡi nhạt
};

// Chó trưởng thành sủa: thân dài, chân cao, tai dựng, đuôi dựng. 17x15, chân sát đáy.
const BARK_ADULT = [
  [ // mõm ngậm, lấy hơi
    '.o...o......o....',
    'oLo.oLo....oLo...',
    'oQLoQLo....oQo...',
    'oQQQQQQo..oQQo...',
    'oQkQQkQo..oQo....',
    'oWWQQQQo.oQo.....',
    'kWWWQQQoooQo.....',
    'ooWWQQQQQQQo.....',
    '.ooQQQQQQQQQQo...',
    '..oQQQQQQQQQQQo..',
    '..oQWWQQQQQQQQo..',
    '..oQWWQQQQQQQQo..',
    '..oQo.oQo..oQo...',
    '..oQo.oQo..oQo...',
    '..oo..oo...oo....',
  ],
  [ // há mõm, ngẩng đầu
    '.o...o......o....',
    'oLo.oLo....oLo...',
    'oQLoQLo....oQo...',
    'oQQQQQQoo.oQQo...',
    'oQkQQkQoo.oQo....',
    'kWWWQQQQooQo.....',
    'ootWQQQQQQQo.....',
    '.oWWoQQQQQQQQo...',
    '..ooQQQQQQQQQQo..',
    '..oQQQQQQQQQQQo..',
    '..oQWWQQQQQQQQo..',
    '..oQWWQQQQQQQo...',
    '..oQo.oQo..oQo...',
    '..oQo.oQo..oQo...',
    '..oo..oo...oo....',
  ],
  [ // há to nhất, lưỡi thò ra
    '.o...o......o....',
    'oLo.oLo....oLo...',
    'oQLoQLo...ooQo...',
    'oQQQQQQoo.oQQo...',
    'kQkQQkQoo.oQo....',
    'oWWWQQQQooQo.....',
    'ottWQQQQQQQo.....',
    'otnoQQQQQQQQQo...',
    'oWWoQQQQQQQQQQo..',
    '.ooQQQQQQQQQQQo..',
    '..oQWWQQQQQQQQo..',
    '..oQWWQQQQQQQo...',
    '..oQo.oQo..oQo...',
    '..oQo.oQo..oQo...',
    '..oo..oo...oo....',
  ],
];

// Chó con sủa: đầu to, thân tròn mập, tai cụp, chân ngắn. 12x11.
const BARK_PUP = [
  [ // mõm ngậm
    '..oooo......',
    '.oQLLQo.o...',
    'oeQQQQeooQo.',
    'oekQQkeoQQo.',
    'oeWWWWeQQQo.',
    'oowWWwoQQQQo',
    '.ooWWooQQQQo',
    '..oQQQQQQQQo',
    '..oQWWQQQQQo',
    '..oQo.oQoQo.',
    '..oo..oo.oo.',
  ],
  [ // há mõm
    '..oooo......',
    '.oQLLQo.o...',
    'oeQQQQeooQo.',
    'oekQQkeoQQo.',
    'oeWWWWeQQQo.',
    'ootwWtoQQQQo',
    '.oWWWWoQQQQo',
    '..oQQQQQQQQo',
    '..oQWWQQQQQo',
    '..oQo.oQoQo.',
    '..oo..oo.oo.',
  ],
  [ // há to, lưỡi hồng
    '..oooo..o...',
    '.oQLLQooQo..',
    'oeQQQQeoQQo.',
    'oekQQkeQQQo.',
    'oeWWWWeQQQo.',
    'oottttoQQQQo',
    '.onnnnoQQQQo',
    '..oWWQQQQQQo',
    '..oQWWQQQQQo',
    '..oQo.oQoQo.',
    '..oo..oo.oo.',
  ],
];

// Chó trưởng thành chạy đuổi: thân chồm về trước, chân duỗi xa, tai và đuôi bay ngược. 19x14.
const RUN_ADULT = [
  [ // bốn chân duỗi hết cỡ
    '....o...o..........',
    '...oLo.oLo....ooo..',
    '..oQLoQLo....oQQQo.',
    '..oQQQQQQo..oQQoo..',
    '..oQkQQkQo.oQQo....',
    '.oWWQQQQQoooQo.....',
    'kWWWQQQQQQQQQo.....',
    'ooWWQQQQQQQQQQQo...',
    '.ooQQQQQQQQQQQQQo..',
    '..oQWWWQQQQQQQQQo..',
    '.ooQQWWQQQQQQQQQo..',
    'oQQo..oQo....oQQQo.',
    'oQo....oQo..oQo.oQo',
    'oo......oo..oo...oo',
  ],
  [ // thu chân về dưới bụng
    '....o...o..........',
    '...oLo.oLo...ooo...',
    '...oQLoQLo..oQQQo..',
    '...oQQQQQQo.oQQoo..',
    '...oQkQQkQooQQo....',
    '..oWWQQQQQQQQo.....',
    '.kWWWQQQQQQQQo.....',
    '.ooWWQQQQQQQQQQo...',
    '..ooQQQQQQQQQQQQo..',
    '...oQWWWQQQQQQQQo..',
    '...oQQWWQQQQQQQQo..',
    '....oQoQo..oQoQo...',
    '....oQoQo..oQoQo...',
    '.....oooo...oooo...',
  ],
  [ // duỗi ngược lại, chân trước chạm đất
    '...o...o...........',
    '..oLo.oLo.....ooo..',
    '.oQLoQLo.....oQQQo.',
    '.oQQQQQQo...oQQoo..',
    '.oQkQQkQo..oQQo....',
    'oWWQQQQQQoooQo.....',
    'kWWQQQQQQQQQQo.....',
    'oWWQQQQQQQQQQQQo...',
    'ooQQQQQQQQQQQQQQo..',
    '.oQWWWQQQQQQQQQQo..',
    '.oQQWWQQQQQQQQQQo..',
    '..oQQo..oQQo..oQQo.',
    '...oQo...oQo...oQo.',
    '...oo.....oo....oo.',
  ],
];

// Chó con chạy: chân ngắn nên sải ngắn, thân tròn nảy lên xuống. 13x11.
const RUN_PUP = [
  [
    '..oooo.......',
    '.oQLLQo..oo..',
    'oeQQQQeooQQo.',
    'oekQQkeoQQo..',
    'oeWWWWeQQQo..',
    'oowWWwQQQQQo.',
    '.ooWWoQQQQQQo',
    '..oQQQQQQQQQo',
    '.ooQWWQQQQQQo',
    'oQo..oQo.oQQo',
    'oo....oo..ooo',
  ],
  [
    '..oooo.......',
    '.oQLLQo...o..',
    'oeQQQQeo.oQo.',
    'oekQQkeooQQo.',
    'oeWWWWeQQQQo.',
    'oowWWwQQQQQQo',
    '.ooWWoQQQQQQo',
    '..oQQQQQQQQQo',
    '..oQWWQQQQQQo',
    '..oQoQo.oQoQo',
    '..oooo..ooooo',
  ],
  [
    '..oooo.......',
    '.oQLLQo..oo..',
    'oeQQQQeooQQo.',
    'oekQQkeoQQo..',
    'oeWWWWeQQQo..',
    'oowWWwQQQQQo.',
    '.ooWWoQQQQQQo',
    '..oQQQQQQQQQo',
    '..oQWWQQQQQQo',
    '..oQQo..oQQQo',
    '..ooo....oooo',
  ],
];

// Nằm ngủ gật: thấp và rộng hơn tư thế đứng, mắt nhắm là một gạch tối.
// Chó lớn duỗi dài, chó con cuộn tròn thành cục.
const NAP_ADULT = [
  '.o...o.............',
  'oQo.oQo...ooooo....',
  'oQQQQQQo.oQQQQQoo..',
  'oQkkQQQQoQQQQQQQQo.',
  'oWWQQQQQQQQQQQQQQQo',
  'oWWWQQQQQQQQQQQQLQo',
  '.oWWWQQQQQQQQQQQoQo',
  '.ooWWWQQQQQQQQQQooo',
  '..ooooooooooooooo..',
];
// Chó con cuộn tròn thành cục, đuôi vòng sát mình.
const NAP_PUP = [
  '..oooo......',
  '.oQLLQooooo.',
  'oeQQQQoQQQQo',
  'oekkQQQQQQQo',
  'oWWWQQQQQQLo',
  '.oWWQQQQQoQo',
  '.ooWQQQQQoQo',
  '..oQQQQQQQoo',
  '..ooooooooo.',
];
// 💤 nhỏ: hai chữ Z xiên bay chéo lên, xanh nhạt, viền sẫm.
const ZZZ31 = [
  '................',
  '.........zzzzz..',
  '............z...',
  '.zzzz......z....',
  '...z......z.....',
  '..z......zzzzz..',
  '.zzzz...........',
  '................',
];
const zzzImg = () => outline(spr(ZZZ31, { z: '#bfe6ff' }), OUT);

// Ghép thân chó nằm với 💤 bay lên ở phía trên (thân vẽ sau nên luôn nằm trên chữ Z).
function napWithZzz(rows) {
  const body = spr(rows, DOGP), z = zzzImg();
  const w = Math.max(body.width, z.width + 1), h = body.height + 6;
  return draw(w, h, x => {
    x.drawImage(z, w - z.width, 0);
    x.drawImage(body, 0, h - body.height);
  });
}

const dogFrames = rows => { const left = rows.map(r => spr(r, DOGP)); return { left, right: left.map(flip) }; };

// Bong bóng thoại "GÂU GÂU!" — chữ pixel 5x5, dấu mũ 2 hàng, đuôi chỉ xuống-trái.
const GLYPH = {
  G: ['.###.', '#....', '#..##', '#...#', '.###.'],
  A: ['.###.', '#...#', '#####', '#...#', '#...#'],
  U: ['#...#', '#...#', '#...#', '#...#', '.###.'],
  '!': ['#', '#', '#', '.', '#'],
};
const HAT31 = ['..#..', '.#.#.'];

function barkBubble() {
  const INK = '#3b2412', CRE = '#fff6e0', W = 48, H = 18, BH = 13;
  const put = (x, g, gx, gy) => g.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') R(x, INK, gx + i, gy + j); }));
  return draw(W, H, x => {
    // thân bong bóng bo góc
    R(x, OUT, 1, 0, W - 2, BH);
    R(x, OUT, 0, 1, W, BH - 2);
    R(x, CRE, 2, 1, W - 4, BH - 2);
    R(x, CRE, 1, 2, W - 2, BH - 4);
    // đuôi chỉ xuống-trái
    [[8, 7], [7, 6], [6, 4], [5, 3], [4, 2], [4, 0]].forEach(([x0, w], i) => {
      R(x, OUT, x0 - 1, BH - 1 + i, w + 2, 1);
      if (w) R(x, CRE, x0, BH - 1 + i, w, 1);
    });
    // chữ GÂU GÂU!
    let gx = 4;
    for (const ch of 'GÂU GÂU!') {
      if (ch === ' ') { gx += 3; continue; }
      const base = ch === 'Â' ? 'A' : ch;
      put(x, GLYPH[base], gx, 5);
      if (ch === 'Â') put(x, HAT31, gx, 2);
      gx += GLYPH[base][0].length + 1;
    }
  });
}

// Xích buộc ở chuồng chó: cọc sắt bên trái + 6 mắt xích võng xuống,
// mắt xích xen kẽ dọc / ngang và chừa lỗ tối ở giữa cho dễ đọc ở cỡ 1x.
function dogChain() {
  const I = RAMP.iron;
  const c = draw(18, 10, x => {
    // cọc đóng vào vách chuồng
    R(x, I[2], 1, 1, 3, 7);
    R(x, I[4], 1, 1, 1, 3);
    R(x, I[3], 1, 4, 1, 4);
    R(x, I[1], 3, 2, 1, 6);
    R(x, I[4], 1, 1, 3, 1);
    const pos = [[5, 2], [7, 3], [9, 4], [11, 5], [13, 5], [15, 4]];
    pos.forEach(([px, py], i) => {
      if (i % 2 === 0) {            // mắt dọc
        R(x, I[3], px, py - 1, 2, 3);
        R(x, I[4], px, py - 1, 1, 1);
        R(x, I[1], px + 1, py + 1, 1, 1);
      } else {                      // mắt ngang
        R(x, I[3], px - 1, py, 3, 2);
        R(x, I[4], px - 1, py, 1, 1);
        R(x, I[1], px + 1, py + 1, 1, 1);
      }
      R(x, I[0], px, py, 1, 1);     // lỗ giữa mắt xích
    });
  });
  return outline(c);
}

// Đứng hình: 3 ngôi sao vàng quay quanh một vòng ellipse, 3 khung lệch nhau 1/3 vòng.
function stunFrame(i) {
  const c = draw(21, 10, x => {
    const list = [0, 1, 2].map(k => {
      const a = (i / 3 + k / 3) * Math.PI * 2;
      return { px: Math.round(10 + Math.cos(a) * 8), py: Math.round(5 + Math.sin(a) * 3), back: Math.sin(a) < 0 };
    }).sort((a, b) => a.py - b.py);
    for (const s of list) {
      const main = s.back ? '#d9b52f' : '#f7d547';
      R(x, main, s.px - 1, s.py); R(x, main, s.px + 1, s.py);
      R(x, main, s.px, s.py - 1); R(x, main, s.px, s.py + 1);
      R(x, s.back ? '#f7d547' : '#fff0a0', s.px, s.py);
    }
  });
  return outline(c);
}

// Mũi tên chỉ hướng chó sủa: cùng khuôn với alertArrow nhưng vàng-cam.
const barkArrow = () => spr(ARROW, { o: OUT, w: '#fff0a0', r: '#f7d547', R: '#f59a23' });

// Bảng màu xúc xích: D nếp thắt, M đỏ nâu tối, C giữa, L bắt sáng trên-trái.
const SAUS = { o: OUT, D: '#8e3d26', M: '#b4583a', C: '#d0805a', L: '#e8a070' };

// Xúc xích trong giỏ: khúc cong nhìn ngang, 14x14 như các icon vật phẩm khác.
// Vẽ theo một cung tròn, bán kính phình ở giữa và thót ở hai đầu cho ra dáng khúc thịt.
function sausageIcon() {
  const pt = t => { const a = Math.PI * (1 + t * 0.52); return [11.6 + Math.cos(a) * 8.6, 11 + Math.sin(a) * 8.6]; };
  const c = draw(14, 14, x => {
    const band = (col, k, ox, oy) => {
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, r = k * Math.sin(Math.PI * t) ** 0.35, [px, py] = pt(t);
        ell(x, col, px + ox, py + oy, r, r);
      }
    };
    band(SAUS.M, 2.2, 0, 0);
    band(SAUS.C, 1.3, -0.5, -0.6);
    band(SAUS.L, 0.35, -1.1, -1.2);
    // thắt nút hai đầu: nếp lõm rồi mẩu thịt nhỏ thò ra
    [0, 1].forEach(t => {
      const [px, py] = pt(t), dx = t ? 0.9 : -0.9, dy = t ? -0.9 : 0.9;
      ell(x, SAUS.D, px, py, 1, 1);
      ell(x, SAUS.M, px + dx, py + dy, 0.8, 0.8);
    });
  });
  return outline(c);
}

// Xúc xích rơi dưới đất: nhìn từ trên-chéo nên bẹt, ngắn và thót hai đầu, kèm bóng đổ nhạt.
const SAUSAGE_GROUND = [
  '..ooooooo..',
  '.oLLCCCMMo.',
  'oDLCCCMMMDo',
  '.oDMMMMMDo.',
  '.ooooooooo.',
];
function sausageGround() {
  const body = spr(SAUSAGE_GROUND, SAUS);
  return draw(11, 7, x => {
    shadow(x, 5, 5, 4, 1.4, 0.26);
    x.drawImage(body, 0, 0);
  });
}

// ---------- Huy hiệu thành tựu xã hội (issue 32) ----------
// Ba huy hiệu 16x18, mỗi cái hai bản vẽ riêng: mở (màu) và khóa (xám, có ổ khóa).
// "Hàng xóm tốt bụng": huân chương tròn xanh lá, bàn tay xòe có trái tim trên lòng bàn tay.
// "Siêu trộm": huân chương tròn tím ánh trăng, mặt nạ bịt mắt kẻ trộm. "Vườn bất khả xâm phạm": khiên gỗ có dấu chân chó.
// Bàn tay xòe (11x11, đã có viền): bốn ngón so le, ngón cái chếch trái, tim đỏ giữa lòng bàn tay
function handHeart(P) {
  return outline(draw(11, 11, x => {
    for (const [cx, r0] of [[3, 2], [5, 1], [7, 1], [9, 2]]) R(x, P.s, cx, r0, 1, 5 - r0);
    R(x, P.s, 3, 5, 7, 4);
    for (const [px, py] of [[1, 3], [1, 4], [2, 4], [2, 5], [2, 6]]) R(x, P.s, px, py);
    R(x, P.s, 4, 9, 5, 1);
    R(x, P.S, 9, 2, 1, 7); R(x, P.S, 4, 8, 6, 1); R(x, P.S, 4, 9, 5, 1);   // bóng bên phải và mép dưới
    R(x, P.h, 5, 5); R(x, P.h, 7, 5); R(x, P.h, 5, 6, 3, 1); R(x, P.h, 6, 7);
    R(x, P.H, 5, 5); R(x, P.R, 7, 6); R(x, P.R, 6, 7);
  }));
}
const MASK = [
  '.ooo...ooo.',
  'oMmMoooMmMo',
  'oMeeMMMeeMo',
  'oMMMMoMMMMo',
  '.oooo.oooo.',
];
const PAW = [
  '..p.p..',
  'p.p.p.p',
  'p.....p',
  '..ppp..',
  '.ppppp.',
  '.ppppp.',
  '..ppp..',
];
const PADLOCK = [
  '.ooo.',
  'oIIIo',
  'oIoIo',
  'ooooo',
  'oLLLo',
  'oLoLo',
  'ooooo',
];
const GREY = ['#4e4a52', '#77727a', '#a19ca2', '#cbc6c8', '#e6e2de'];   // bản khóa: tối → sáng
const padlock = () => spr(PADLOCK, { o: '#3b2f22', L: '#c9a24a', I: '#aeaebe' });
// Huân chương tròn: hai dải ruy băng chéo xuống dưới, vành, lòng huân chương; `pal` = { rim: [tối, vừa, sáng], bg, rib: [tối, sáng] }
function medal(x, pal) {
  for (const [px, d] of [[4, -1], [10, 1]]) {
    for (let i = 0; i < 6; i++) { R(x, OUT, px + Math.round(d * i / 3) - 1, 11 + i, 4, 1); R(x, i < 5 ? pal.rib[i % 2 ? 0 : 1] : OUT, px + Math.round(d * i / 3), 11 + i, 2, 1); }
  }
  ell(x, OUT, 8, 7.5, 7, 7);
  ell(x, pal.rim[0], 8, 7.5, 6, 6);
  ell(x, pal.rim[1], 7.6, 7.1, 5.6, 5.6);
  ell(x, pal.bg, 8, 7.5, 4.4, 4.4);
  R(x, pal.rim[2], 4, 3, 2, 1); R(x, pal.rim[2], 3, 4, 1, 2);   // bắt sáng trên-trái
}
function helperBadge(on) {
  const P = on
    ? { rim: ['#2f6b1f', '#5fb33e', '#bff08a'], bg: '#fff0c8', rib: ['#9e2416', '#e5452f'], hand: { s: '#f0b080', S: '#c98058', h: '#e5452f', H: '#ff9a7a', R: '#9e2416' } }
    : { rim: [GREY[0], GREY[2], GREY[4]], bg: GREY[3], rib: [GREY[0], GREY[1]], hand: { s: GREY[2], S: GREY[1], h: GREY[1], H: GREY[2], R: GREY[0] } };
  return draw(16, 18, x => {
    medal(x, P);
    x.drawImage(handHeart(P.hand), 3, 2);
    if (!on) x.drawImage(padlock(), 11, 11);
  });
}
function robberBadge(on) {
  const P = on
    ? { rim: ['#3a1d4e', '#6b3a8c', '#c79ae6'], bg: '#dccbf2', rib: ['#2e1a0c', '#6b4020'], mask: { o: OUT, M: '#1e1a22', m: '#5a5068', e: '#fff6e0' } }
    : { rim: [GREY[0], GREY[2], GREY[4]], bg: GREY[3], rib: [GREY[0], GREY[1]], mask: { o: OUT, M: GREY[1], m: GREY[2], e: GREY[4] } };
  return draw(16, 18, x => {
    medal(x, P);
    x.drawImage(spr(MASK, P.mask), 3, 5);
    if (on) for (const [sx, sy] of [[10, 4], [6, 11]]) R(x, '#fff6a0', sx, sy);   // ánh trăng lấp lánh
    if (!on) x.drawImage(padlock(), 11, 11);
  });
}
// Khiên gỗ viền sắt, mép trên thẳng, đáy nhọn; giữa khiên in dấu chân chó
function guardBadge(on) {
  const W = on ? RAMP.wood : GREY.slice(0, 4), I = on ? RAMP.iron : GREY;
  return draw(16, 18, x => {
    for (let r = 0; r < 17; r++) {
      const half = r < 10 ? 7 : Math.max(0, 7 - Math.round((r - 9) * 7 / 7.5));
      if (half <= 0) { R(x, OUT, 7, r, 2, 1); continue; }
      R(x, OUT, 8 - half - 1, r, half * 2 + 2, 1);
      if (r === 0 || half < 2) continue;
      R(x, I[2], 8 - half, r, half * 2, 1);                       // vành sắt
      if (r > 1 && half > 2) R(x, W[1], 9 - half, r, half * 2 - 2, 1);   // mặt gỗ
      if (r > 1 && half > 2) R(x, W[2], 9 - half, r, 1, 1);
    }
    R(x, I[4], 1, 1, 14, 1); R(x, I[3], 1, 2, 1, 8);              // bắt sáng mép trên và trái
    for (const px of [5, 10]) R(x, W[0], px, 3, 1, 10);         // ván gỗ dọc
    x.drawImage(spr(PAW, { p: on ? '#f3ead2' : GREY[4] }), 5, 4);
    if (!on) x.drawImage(padlock(), 11, 11);
  });
}

const dogBark31 = { pup: dogFrames(BARK_PUP), adult: dogFrames(BARK_ADULT) };
const dogRun31 = { pup: dogFrames(RUN_PUP), adult: dogFrames(RUN_ADULT) };
const dogNap31 = { pup: napWithZzz(NAP_PUP), adult: napWithZzz(NAP_ADULT) };
const stunStars31 = [0, 1, 2].map(stunFrame);

export const SPR2 = {
  // vườn
  shippingBin: shippingBin(),
  bush: bushes[0], bushes,
  rock: rocks[0], rocks,
  stump: stump(),
  forestTile: forest[0], forest,
  // trong nhà
  floorWood: floors[0], floors,
  wallInner: wallInner(),
  doorMat: doorMat(),
  bed: bed(false), bedSleep: bed(true),
  wardrobe: wardrobe(),
  table: table(),
  stove: stove(),
  rug: rug(),
  window: windowW(),
  pottedPlant: pottedPlant(),
  phone: phone(),
  // làng
  marketStall: marketStall(),
  marketClosed: marketClosed(),
  smithy: smithy(),
  villageHouse: villageHouses[0], villageHouses,
  friendGate: friendGate(),
  homeGate: homeGate(),
  // cổng vườn: hộp quà (đóng / có quà / mở) và sổ lưu bút (đóng / mở)
  giftBox: giftBoxClosed(),
  giftBoxFull: giftBoxFull(),
  giftBoxOpen: giftBoxOpen(),
  guestBook: guestBookClosed(),
  guestBookOpen: guestBookOpen(),
  lampPost: lampPost(),
  bench: benchStone(),
  npcBaTu: baTu.frames, npcBaTuIdle: baTu.idle,
  npcOngSau: ongSau.frames, npcOngSauIdle: ongSau.idle,
  // công cụ & HUD
  tools: {
    hoe: [0, 1, 2].map(hoe),
    can: [0, 1, 2].map(can),
    sickle: [0, 1, 2].map(sickle),
    basket: [0, 1, 2].map(basket),
  },
  stamina: boltIcon(false),
  staminaTired: boltIcon(true),
  sweat: [sweatFrame(0), sweatFrame(1)],
  season: { xuan: hoaMai(), ha: sunIcon(), thu: mapleIcon(), dong: snowIcon() },
  wood: woodIcon(),
  stone: stoneIcon(),
  guidebook: guidebookIcon(),
  todo: todoIcon(),
  giftIcon: giftIcon(),
  alertArrow: alertArrow(),
  // chó canh khách (issue 31)
  dogBark: dogBark31,
  dogRun: dogRun31,
  dogNap: dogNap31,
  barkBubble: barkBubble(),
  dogChain: dogChain(),
  stunStars: stunStars31,
  barkArrow: barkArrow(),
  sausage: sausageIcon(),
  sausageGround: sausageGround(),
  // huy hiệu thành tựu xã hội (issue 32): mở / khóa
  badges: {
    helper: { on: helperBadge(true), off: helperBadge(false) },
    robber: { on: robberBadge(true), off: robberBadge(false) },
    guard: { on: guardBadge(true), off: guardBadge(false) },
  },
};
