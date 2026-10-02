// Bộ sprite thứ ba: vật nuôi Phase 2 (4 giai đoạn, đực/cái), trạng thái & hành động, kẻ săn mồi, NPC, chuồng & đồ dùng.
// Cùng phong cách art.js / art2.js: viền nâu sẫm, sáng từ trên-trái, 3-4 sắc độ mỗi màu, không gradient mượt.
// Con vật quay mặt sang TRÁI ở bản gốc; 'right' là bản lật. Chân chạm hàng điểm ảnh dưới cùng (hàng cuối là viền).

import { canvas as rawCanvas, flip, hash } from './art.js';

const canvas = (w, h) => { const c = rawCanvas(w, h); c.getContext('2d', { willReadFrequently: true }); return c; };
const OUT = '#3b2412';

// ---------- tiện ích vẽ ----------

function draw(w, h, fn) { const c = canvas(w, h); fn(c.getContext('2d'), c); return c; }
function R(x, col, px, py, w = 1, h = 1) { x.fillStyle = col; x.fillRect(px, py, w, h); }
function dots(x, col, list) { for (const [px, py] of list) R(x, col, px, py); }
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
function mix(a, b, t) {
  const A = parseInt(a.slice(1, 7), 16), B = parseInt(b.slice(1, 7), 16);
  const ch = s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}
const rgba = col => {
  const n = parseInt(col.slice(1, 7), 16);
  return [n >> 16, (n >> 8) & 255, n & 255, col.length > 7 ? parseInt(col.slice(7, 9), 16) : 255];
};
function pix(w, h, fn) {
  const c = canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h);
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const col = fn(px, py);
    if (col) img.data.set(rgba(col), (py * w + px) * 4);
  }
  x.putImageData(img, 0, 0);
  return c;
}
function outline(c, col = OUT) {
  const w = c.width, h = c.height, x = c.getContext('2d'), d = x.getImageData(0, 0, w, h).data;
  const solid = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 200;
  x.fillStyle = col;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
    if (!solid(i, j) && (solid(i - 1, j) || solid(i + 1, j) || solid(i, j - 1) || solid(i, j + 1))) x.fillRect(i, j, 1, 1);
  return c;
}
function spr(rows, pal) {
  const W = rows[0].length;
  rows.forEach((r, i) => { if (r.length !== W) throw new Error(`art3: hàng ${i} dài ${r.length} ≠ ${W}: "${r}"`); });
  return pix(W, rows.length, (px, py) => {
    const v = pal[rows[py][px]];
    return typeof v === 'function' ? v(px, py) : v || null;
  });
}
const fade = (ramp, t, to = '#cfc9c2') => ramp.map(c => mix(c, to, t));
const pair = fn => { const left = [fn(0), fn(1)]; return { left, right: left.map(flip) }; };
const dirs = arr => ({ left: arr, right: arr.map(flip) });

// ---------- máy vẽ hình khối ----------
// Mỗi phần là elip E(...) hoặc hộp B(...), tô theo ramp 4 sắc (tối→sáng), sáng từ trên-trái.
// sep: kẻ đường tối ở chỗ phần này đè lên phần đã vẽ trước → tách đầu/cánh/chân khỏi thân.
const E = (cx, cy, rx, ry, r, o = {}) => ({ t: 'e', cx, cy, rx, ry, r, ...o });
const B = (x, y, w, h, r, o = {}) => ({ t: 'b', x, y, w, h, r, ...o });

function fig(w, h, parts) {
  parts = parts.filter(Boolean);
  const ins = (p, X, Y) => p.t === 'e'
    ? ((X - p.cx) / p.rx) ** 2 + ((Y - p.cy) / p.ry) ** 2 <= 1
    : X >= p.x && X < p.x + p.w && Y >= p.y && Y < p.y + p.h;
  const own = (px, py) => {
    if (px < 0 || py < 0 || px >= w || py >= h) return -1;
    let b = -1;
    for (let i = 0; i < parts.length; i++) if (ins(parts[i], px + 0.5, py + 0.5)) b = i;
    return b;
  };
  const c = pix(w, h, (px, py) => {
    const i = own(px, py);
    if (i < 0) return null;
    const p = parts[i];
    if (p.sep) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = own(px + dx, py + dy);
      if (j >= 0 && j < i && !parts[j].ghost && (p.sepUp || dy >= 0 || dx !== 0)) return typeof p.sep === 'string' ? p.sep : p.r[0];
    }
    if (p.col) return p.col;
    let v;
    if (p.t === 'e') {
      const dx = (px + 0.5 - p.cx) / p.rx, dy = (py + 0.5 - p.cy) / p.ry;
      v = 0.3 - dx * 0.5 - dy * 0.78 - (dx * dx + dy * dy) * 0.32;
    } else {
      const fx = p.w === 1 ? 0.5 : (px - p.x) / (p.w - 1);
      v = fx < 0.34 ? 0.45 : fx > 0.66 ? -0.45 : 0.05;
      if (p.w === 1) v = 0.05;
    }
    v += (p.lift || 0) + (hash(px * 3 + 7, py * 5 + 11) - 0.5) * (p.noise ?? 0.14);
    let k = v > 0.6 ? 3 : v > 0.12 ? 2 : v > -0.42 ? 1 : 0;
    if (p.max != null) k = Math.min(k, p.max);
    if (p.min != null) k = Math.max(k, p.min);
    const col = p.r[k];
    return p.pat ? (p.pat(px, py, k, col, p) ?? col) : col;
  });
  return outline(c);
}

// Bốn chân thú nhìn ngang: chân xa tối hơn, chân gần sáng; 2 khung bước kéo.
function quadLegs(o) {
  const { fx, bx, top, len, w = 2, r, hoof, frame, slow = false, far = 1 } = o;
  const s = slow ? 1 : 1;
  const a = frame ? s : -s;
  const legs = [
    [fx + far - a, 1], [bx + far + a, 1], // xa
    [fx + a, 0], [bx - a, 0],             // gần
  ];
  if (slow && frame) { legs[0][0] = fx + far; legs[3][0] = bx; }
  return legs.map(([lx, isFar]) => B(lx, top, w, len, r, {
    max: isFar ? 1 : undefined, min: isFar ? undefined : 1, sep: isFar ? false : true, noise: 0,
    pat: hoof ? (px, py) => (py === top + len - 1 ? (isFar ? hoof[0] : hoof[1]) : undefined) : undefined,
  }));
}

// ---------- bảng màu ----------

const P = {
  hen: ['#6a3412', '#9c5622', '#c87e3c', '#e8aa62'],
  henW: ['#4e260c', '#7e4218', '#a8622a', '#c88442'],
  henTail: ['#2e1a0e', '#4c2a12', '#6e3e18', '#925a26'],
  pullet: ['#9a5c1e', '#c88438', '#e6ac58', '#f8d088'],
  chick: ['#c08410', '#e6b024', '#ffd84a', '#fff29c'],
  chickM: ['#a86c0c', '#d29a1e', '#f2c23c', '#fde486'], // gà trống con: vàng đậm hơn
  red: ['#7a1408', '#b02616', '#e0402a', '#ff7a5a'],
  beak: ['#a85a08', '#d88a14', '#f5b02a', '#ffd870'],
  leg: ['#a86a0c', '#d89a1c', '#f2c040', '#ffe07a'],
  rooBody: ['#4a140c', '#7a2214', '#a83820', '#cc5a30'],
  rooWing: ['#3a1608', '#602610', '#8a3c18', '#b05a28'],
  gold: ['#9a5a10', '#d08a1c', '#f2b432', '#ffdc78'],
  rooTail: ['#0e1a16', '#16302a', '#1f4a3c', '#2f6e56'],
  duck: ['#8c8e9e', '#c2c3cc', '#e9e9ec', '#ffffff'],
  duckY: ['#c49a2a', '#e8c44a', '#fde27a', '#fff6c2'],
  duckling: ['#b8900c', '#e2bc22', '#ffe24a', '#fff59a'],
  bill: ['#a84a08', '#de7414', '#f8a030', '#ffcc68'],
  pig: ['#a84a64', '#d8728c', '#f4a4b8', '#ffd2de'],
  snout: ['#a03e58', '#cc6480', '#ea8ca4', '#ffb8c8'],
  cowW: ['#948c8e', '#cbc4c0', '#eee8e0', '#ffffff'],
  cowK: ['#16161c', '#24242c', '#363642', '#4e4e5a'],
  muzzle: ['#a85a64', '#d27e88', '#eea4a8', '#ffcccc'],
  horn: ['#7a6a4a', '#b8a67c', '#e2d4ac', '#fff4d8'],
  hoof: ['#2a1c14', '#4a3424'],
  wool: ['#a4977e', '#cdc0a4', '#ebe1c8', '#fffaec'],
  woolS: ['#b0a48c', '#d4c9b0', '#efe7d2', '#fffbf0'],
  woolC: ['#b49a6a', '#dcc28c', '#f4e2b0', '#fff8dc'], // lông xoăn vàng kem
  face: ['#1c1616', '#302626', '#483a38', '#665450'],
  dog: ['#111118', '#262634', '#40405a', '#6a6a88'],
  dogG: ['#55555e', '#82828c', '#a8a8b2', '#d0d0d8'],
  cat: ['#8a3a0c', '#c66228', '#ec9246', '#ffc47c'],
  cream: ['#b49676', '#dcc29e', '#f4e2c4', '#fff8ea'],
  rat: ['#3a3438', '#5c5458', '#80767a', '#a89ea0'],
  hawk: ['#3a2010', '#5e3618', '#8a5426', '#b07a40'],
  hawkW: ['#f0e6d0', '#d8c8a8'],
  weasel: ['#4a2a10', '#7a4a1e', '#a46a30', '#c88c4a'],
  pink: '#f08a9e',
};
const EYE = '#1a0e08';

// ---------- GÀ MÁI ----------
// non 9x9 · nhỡ 11x12 · trưởng thành 14x13 · già 14x13

function chick(frame, pose = 'stand', male = false) {
  const C = male ? P.chickM : P.chick;
  const oy = pose === 'stand' ? 0 : 1;
  const legs = pose === 'stand' ? (frame
    ? [B(3, 7, 1, 1, P.leg, { noise: 0 }), B(6, 6, 1, 1, P.leg, { noise: 0 })]
    : [B(4, 7, 1, 1, P.leg, { noise: 0 }), B(6, 7, 1, 1, P.leg, { noise: 0 })]) : [];
  // gà trống con: lông vàng cam có sọc nâu dọc lưng, chân cao hơn, nhú mào đỏ
  const stripe = male ? (px, py, k) => (py + 0.5 < 4.6 + oy && (px === 5 || px === 7) ? '#8a4e14' : undefined) : undefined;
  const c = fig(9, 9, [
    ...legs,
    E(5.3, 5.2 + oy, 3.1, 2.5, C, { pat: stripe }),
    E(6.2, 5.4 + oy, 1.5, 1.1, C, { sep: true, max: 2 }),
    E(3.5, 3.4 + oy, 2.1, 2.1, C, { sep: true, pat: male ? (px, py) => (py + 0.5 < 2.6 + oy && px === 4 ? '#8a4e14' : undefined) : undefined }),
    male && B(3, 1 + oy, 1, 1, P.red, { noise: 0, min: 2 }),
    B(1, 3 + oy + (pose === 'sick' ? 1 : 0), 1, 1, P.beak, { noise: 0, min: 2 }),
  ]);
  const x = c.getContext('2d');
  if (pose === 'sleep') { R(x, '#7a5410', 2, 3 + oy, 2, 1); }
  else if (pose === 'sick') { R(x, EYE, 2, 4 + oy - 1); R(x, '#a07018', 2, 2 + oy); }
  else { R(x, EYE, 2, 3); R(x, '#ffb070', 3, 4); }
  if (!male) R(x, C[3], 4, 1 + oy); // chỏm lông tơ
  return c;
}

function hen(stage, frame, pose = 'stand') {
  if (stage === 'non') return chick(frame, pose);
  const old = stage === 'gia';
  if (stage === 'nho') {
    const oy = pose === 'stand' ? 0 : 2;
    const legs = pose === 'stand' ? (frame
      ? [B(4, 9, 1, 2, P.leg, { noise: 0 }), B(3, 10, 1, 1, P.leg, { noise: 0 }), B(8, 9, 1, 1, P.leg, { noise: 0 })]
      : [B(5, 9, 1, 2, P.leg, { noise: 0 }), B(4, 10, 1, 1, P.leg, { noise: 0 }), B(7, 9, 1, 2, P.leg, { noise: 0 }), B(6, 10, 1, 1, P.leg, { noise: 0 })]) : [];
    const c = fig(11, 12, [
      ...legs,
      E(8.6, 4.6 + oy, 1.1, 1.7, P.henTail),
      E(6.1, 6.4 + oy, 3.7, 2.5, P.pullet, { pat: speck(P.pullet) }),
      E(7, 6.3 + oy, 2.1, 1.3, P.hen, { sep: true }),
      E(3.5, 2.5 + oy, 0.9, 0.6, P.red),
      E(3.5, 3.9 + oy + (pose === 'sick' ? 1 : 0), 1.8, 1.8, P.pullet, { sep: true }),
      B(1, 4 + oy + (pose === 'sick' ? 1 : 0), 1, 1, P.beak, { min: 2, noise: 0 }),
    ]);
    const x = c.getContext('2d');
    faceBird(x, 2, 4 + oy + (pose === 'sick' ? 1 : 0), pose);
    return c;
  }
  const H = old ? fade(P.hen, 0.38) : P.hen, HW = old ? fade(P.henW, 0.35) : P.henW, HT = old ? fade(P.henTail, 0.3) : P.henTail;
  const RD = old ? fade(P.red, 0.35) : P.red;
  const oy = pose === 'stand' ? 0 : 2, hy = (old ? 1 : 0) + (pose === 'sleep' ? 1 : 0) + (pose === 'sick' ? 2 : 0);
  const hx = pose === 'sleep' ? 1 : 0;
  const legs = pose === 'stand' ? (frame
    ? [B(5, 10, 1, 2, P.leg, { noise: 0 }), B(4, 11, 1, 1, P.leg, { noise: 0 }), B(10, 10, 1, 1, P.leg, { noise: 0 })]
    : [B(6, 10, 1, 2, P.leg, { noise: 0 }), B(5, 11, 1, 1, P.leg, { noise: 0 }), B(9, 10, 1, 2, P.leg, { noise: 0 }), B(8, 11, 1, 1, P.leg, { noise: 0 })]) : [];
  const c = fig(14, 13, [
    ...legs,
    E(11.3, 4.4 + oy + (old ? 1 : 0), 1.5, 2.7, HT),
    E(12.2, 5.6 + oy + (old ? 1 : 0), 0.9, 2, HT, { sep: true, max: 2 }),
    E(7.6, 7.3 + oy, 4.7, 3.1, H, { pat: speck(H) }),
    E(8.8, 7.1 + oy, 2.9, 1.8, HW, { sep: true, pat: (px, py, k, col) => (py === Math.round(7.1 + oy) + 1 && px % 2 ? HW[0] : undefined) }),
    E(4.1 + hx, 2.1 + oy + hy, 1.4, 0.9, RD),
    E(4.1 + hx, 4.3 + oy + hy, 2.1, 2.1, H, { sep: true }),
    E(2.8 + hx, 6.4 + oy + hy, 0.6, 0.8, RD),
    B(1 + hx, 4 + oy + hy, 2, 1, P.beak, { noise: 0, min: 1 }),
  ]);
  const x = c.getContext('2d');
  faceBird(x, 3 + hx, 4 + oy + hy, pose, old);
  return c;
}
function speck(ramp) {
  return (px, py, k) => (k >= 1 && hash(px * 7 + 3, py * 13 + 1) < 0.13 ? ramp[Math.min(3, k + 1)] : undefined);
}
function faceBird(x, ex, ey, pose, old) {
  if (pose === 'sleep') { R(x, '#3b2412', ex, ey, 2, 1); return; }
  if (pose === 'sick') { R(x, EYE, ex, ey); R(x, '#5a3a20', ex - 1, ey - 1); R(x, '#5a3a20', ex + 1, ey - 1); return; }
  R(x, EYE, ex, ey);
  if (old) R(x, '#8a6a50', ex, ey - 1);
}

// ---------- GÀ TRỐNG ---------- non 9x9 · nhỡ 12x13 · trưởng thành 15x15 · già 15x15

function rooster(stage, frame, pose = 'stand') {
  if (stage === 'non') return chick(frame, pose, true);
  const old = stage === 'gia';
  if (stage === 'nho') {
    const oy = pose === 'stand' ? 0 : 2, sk = pose === 'sick' ? 1 : 0;
    const legs = pose === 'stand' ? (frame
      ? [B(4, 10, 1, 2, P.leg, { noise: 0 }), B(3, 11, 1, 1, P.leg, { noise: 0 }), B(8, 10, 1, 1, P.leg, { noise: 0 })]
      : [B(5, 10, 1, 2, P.leg, { noise: 0 }), B(4, 11, 1, 1, P.leg, { noise: 0 }), B(8, 10, 1, 2, P.leg, { noise: 0 }), B(7, 11, 1, 1, P.leg, { noise: 0 })]) : [];
    const c = fig(12, 13, [
      ...legs,
      E(9.4, 4.4 + oy, 1.3, 2.4, P.rooTail),
      E(6.4, 7.4 + oy, 3.8, 2.5, P.rooBody),
      E(7.2, 7.2 + oy, 2.2, 1.4, P.rooWing, { sep: true }),
      E(4.3, 5.4 + oy, 1.6, 2, P.gold),
      E(3.8, 2.1 + oy + sk, 1.2, 0.8, P.red),
      E(3.7, 3.9 + oy + sk, 1.8, 1.8, P.gold, { sep: true }),
      E(2.6, 5.9 + oy + sk, 0.5, 0.7, P.red),
      B(1, 4 + oy + sk, 1, 1, P.beak, { min: 2, noise: 0 }),
    ]);
    faceBird(c.getContext('2d'), 3, 4 + oy + sk, pose);
    return c;
  }
  const RB = old ? fade(P.rooBody, 0.3) : P.rooBody, RW = old ? fade(P.rooWing, 0.3) : P.rooWing;
  const G = old ? fade(P.gold, 0.4) : P.gold, T = old ? fade(P.rooTail, 0.25) : P.rooTail, RD = old ? fade(P.red, 0.35) : P.red;
  const oy = pose === 'stand' ? 0 : 3, hy = (old ? 1 : 0) + (pose === 'sick' ? 2 : 0) + (pose === 'sleep' ? 1 : 0);
  const legs = pose === 'stand' ? (frame
    ? [B(5, 12, 1, 2, P.leg, { noise: 0 }), B(4, 13, 1, 1, P.leg, { noise: 0 }), B(10, 12, 1, 1, P.leg, { noise: 0 })]
    : [B(6, 12, 1, 2, P.leg, { noise: 0 }), B(5, 13, 1, 1, P.leg, { noise: 0 }), B(9, 12, 1, 2, P.leg, { noise: 0 }), B(8, 13, 1, 1, P.leg, { noise: 0 })]) : [];
  const tailDrop = old ? 1.5 : 0;
  const c = fig(15, 15, [
    ...legs,
    // lông đuôi liềm cong vồng
    E(12, 4.6 + oy + tailDrop, 2, 3.4, T, { pat: (px, py, k) => (k >= 2 && (px + py) % 3 === 0 ? T[3] : undefined) }),
    E(13, 7.4 + oy + tailDrop, 1.2, 2.6, T, { sep: true }),
    E(8.2, 9.2 + oy, 4.4, 2.9, RB),
    E(9.2, 9 + oy, 2.8, 1.8, RW, { sep: true, pat: (px, py) => (py === Math.round(9 + oy) + 1 && px % 2 ? T[2] : undefined) }),
    E(4.9, 6.8 + oy + hy * 0.5, 2.2, 2.8, G, { pat: (px, py, k) => (k < 3 && (px * 3 + py) % 4 === 0 ? G[Math.max(0, k - 1)] : undefined) }),
    // mào răng cưa to
    E(4.4, 1.9 + oy + hy, 2, 1.2, RD, { pat: (px, py) => (py === Math.round(1.9 + oy + hy) - 1 && px % 2 === 0 ? '' : undefined) }),
    E(4.3, 4.1 + oy + hy, 2.1, 2, G, { sep: true }),
    E(2.9, 6.6 + oy + hy, 0.8, 1.3, RD),
    B(1, 4 + oy + hy, 2, 1, P.beak, { noise: 0, min: 1 }),
  ]);
  const x = c.getContext('2d');
  faceBird(x, 3, 4 + oy + hy, pose, old);
  if (pose === 'stand') { R(x, '#ffe07a', 7, 12); } // cựa
  return c;
}

// ---------- VỊT ---------- non 9x8 · nhỡ 12x11 · trưởng thành 15x12 · già 15x12

function duck(stage, frame, pose = 'stand') {
  const sit = pose !== 'stand', sk = pose === 'sick' ? 1 : 0;
  if (stage === 'non') {
    // vịt con: dáng thuyền dài, mỏ dẹt to 2x2, mũ lông ô-liu, chân màng
    const oy = sit ? 1 : 0;
    const cap = (px, py) => (py + 0.5 < 2.2 + oy + sk ? '#b8a83a' : undefined);
    const c = fig(10, 8, [
      !sit && B(frame ? 4 : 5, 6, 2, 1, P.bill, { noise: 0, min: 1 }),
      !sit && B(frame ? 7 : 7, frame ? 5 : 6, 2, 1, P.bill, { noise: 0, max: 1 }),
      E(5.9, 4.5 + oy, 3.4, 1.9, P.duckling, { pat: (px, py) => (py + 0.5 < 3.4 + oy && px >= 5 && px <= 7 ? '#c8b440' : undefined) }),
      E(8.7, 3.3 + oy, 0.8, 0.8, P.duckling),
      E(6.7, 4.5 + oy, 1.7, 1, P.duckling, { sep: true, max: 2 }),
      E(3.6, 2.7 + oy + sk, 1.9, 1.7, P.duckling, { sep: true, pat: cap }),
      B(1, 3 + oy + sk, 2, 1, P.bill, { noise: 0, min: 2 }),
      B(1, 4 + oy + sk, 2, 1, P.bill, { noise: 0, max: 1 }),
    ]);
    const x = c.getContext('2d');
    if (pose === 'sleep') R(x, '#8a6a10', 3, 3 + oy, 2, 1);
    else { R(x, EYE, 3, 2 + oy + sk); if (pose === 'sick') R(x, '#9a7a10', 4, 1 + oy + sk); }
    return c;
  }
  if (stage === 'nho') {
    const oy = sit ? 2 : 0;
    const c = fig(12, 11, [
      !sit && B(frame ? 4 : 5, 9, 2, 1, P.bill, { noise: 0, min: 1 }),
      !sit && B(frame ? 8 : 7, frame ? 8 : 9, 2, 1, P.bill, { noise: 0, max: 1 }),
      !sit && B(frame ? 5 : 6, 8, 1, 1, P.bill, { noise: 0 }),
      E(6.6, 6.2 + oy, 4, 2.4, P.duckY, { pat: (px, py, k) => (k === 3 && hash(px, py) < 0.4 ? P.duck[3] : undefined) }),
      E(10.3, 4.6 + oy, 0.9, 0.9, P.duckY),
      E(7.4, 6 + oy, 2.4, 1.4, P.duck, { sep: true, max: 2 }),
      E(3.8, 4.6 + oy, 1.2, 1.8, P.duckY),
      E(3.6, 2.9 + oy + sk, 1.8, 1.6, P.duckY, { sep: true }),
      B(1, 3 + oy + sk, 2, 1, P.bill, { noise: 0, min: 2 }),
    ]);
    const x = c.getContext('2d');
    if (pose === 'sleep') R(x, '#8a6a10', 3, 3 + oy, 2, 1);
    else { R(x, EYE, 3, 3 + oy + sk); if (pose === 'sick') R(x, '#8a7020', 2, 2 + oy + sk); }
    return c;
  }
  const old = stage === 'gia';
  const D = old ? fade(P.duck, 0.25, '#c8c2b4') : P.duck, BL = old ? fade(P.bill, 0.3) : P.bill;
  const oy = sit ? 2 : 0, hy = (old ? 1 : 0) + sk * 2 + (pose === 'sleep' ? 2 : 0);
  const hx = pose === 'sleep' ? 2 : 0;
  const c = fig(15, 12, [
    !sit && B(frame ? 5 : 6, 10, 2, 1, BL, { noise: 0, min: 1 }),
    !sit && B(frame ? 10 : 9, frame ? 9 : 10, 2, 1, BL, { noise: 0, max: 1 }),
    !sit && B(frame ? 6 : 7, 9, 1, 1, BL, { noise: 0 }),
    !sit && B(frame ? 10 : 9, 9, 1, frame ? 0 : 1, BL, { noise: 0 }),
    E(8.4, 7 + oy, 5, 2.8, D),
    E(13.1, 5.2 + oy, 1, 1.1, D),
    E(9.2, 6.8 + oy, 3.1, 1.6, D, { sep: true, max: 2, pat: (px, py) => (px >= 11 && py === Math.round(6.8 + oy) ? '#5a7ab8' : undefined) }),
    E(4.6 + hx * 0.5, 5.4 + oy + hy * 0.5, 1.4, 2.4, D),
    E(4.5 + hx, 3.2 + oy + hy, 2, 1.8, D, { sep: true }),
    B(1 + hx, 3 + oy + hy, 3, 1, BL, { noise: 0, min: 2 }),
    B(1 + hx, 4 + oy + hy, 2, 1, BL, { noise: 0, max: 1 }),
  ]);
  const x = c.getContext('2d');
  const ex = 4 + hx, ey = 3 + oy + hy;
  if (pose === 'sleep') R(x, '#8a8c9e', ex, ey, 2, 1);
  else { R(x, EYE, ex, ey); if (pose === 'sick') R(x, '#6a6c7a', ex - 1, ey - 1); if (old) R(x, '#9a9caa', ex, ey - 1); }
  return c;
}

// ---------- HEO ---------- non 14x10 · nhỡ 18x12 · trưởng thành 23x15 · già 23x15

function pig(stage, frame, pose = 'stand') {
  const old = stage === 'gia', sit = pose !== 'stand', sick = pose === 'sick';
  const PK = old ? fade(P.pig, 0.3, '#d8c4c0') : P.pig, SN = old ? fade(P.snout, 0.3, '#d0b8b4') : P.snout;
  const S = {
    non: { w: 14, h: 10, body: [8, 5, 4.5, 2.6], head: [4.6, 4.9, 3, 2.8], ear: [5.6, 2.3, 1.3, 1.1], snout: [1.9, 5.6, 1, 1.3], legs: { fx: 4, bx: 9, top: 7, len: 2, w: 1 }, eye: [3, 4], tail: [12, 3] },
    nho: { w: 18, h: 12, body: [10.2, 6, 6, 3.2], head: [5.2, 6.3, 3.2, 3], ear: [6.2, 3.1, 1.6, 1.3], snout: [2, 7.1, 1.1, 1.5], legs: { fx: 5, bx: 13, top: 9, len: 2 }, eye: [4, 5], tail: [16, 4] },
    truong: { w: 23, h: 15, body: [12.6, 7.4, 7.8, 4.3], head: [6, 7.7, 3.7, 3.5], ear: [7, 4.1, 1.9, 1.5], snout: [2.2, 8.8, 1.3, 1.7], legs: { fx: 6, bx: 16, top: 11, len: 3 }, eye: [4, 7], tail: [20, 5] },
  };
  const s = S[old ? 'truong' : stage];
  const oy = sit ? s.legs.len : 0, hy = (old ? 1 : 0) + (sick ? 1 : 0);
  const [bx, by, brx, bry] = s.body, [hx, hyy, hrx, hry] = s.head, [ex, ey, erx, ery] = s.ear, [nx, ny, nrx, nry] = s.snout;
  const legs = pose === 'stand' ? quadLegs({ ...s.legs, r: PK, hoof: ['#7a3448', '#9a4a5e'], frame, slow: old }) : [];
  const flop = sick ? [B(s.legs.fx - 2, s.h - 3, 3, 1, PK, { sep: true, min: 1 }), B(s.legs.bx + 1, s.h - 3, 3, 1, PK, { sep: true, min: 1 })] : [];
  const c = fig(s.w, s.h, [
    ...legs,
    E(ex + 1.6, ey + oy + hy, erx * 0.7, ery * 0.8, PK, { max: 1 }), // tai xa
    E(bx, by + oy + (old ? 0.4 : 0), brx, bry + (old ? 0.3 : 0), PK, { pat: (px, py, k) => (old && k === 3 && hash(px, py) < 0.25 ? PK[2] : undefined) }),
    ...flop,
    E(hx, hyy + oy + hy, hrx, hry, PK, { sep: true }),
    E(ex - 0.4, ey + oy + hy + (old ? 0.6 : 0), erx, ery, PK, { sep: PK[1], sepUp: false, max: 2, lift: -0.1 }), // tai gần cụp trước
    E(nx, ny + oy + hy, nrx, nry, SN, { sep: true }),
  ]);
  const x = c.getContext('2d');
  const [tx, ty] = s.tail;
  // đuôi xoắn
  const ty2 = ty + oy;
  dots(x, OUT, [[tx + 1, ty2 - 1], [tx + 2, ty2], [tx + 1, ty2 + 1]]);
  dots(x, PK[1], [[tx, ty2], [tx + 1, ty2]]); R(x, PK[2], tx, ty2 - 1);
  // mũi
  const nX = Math.round(nx - nrx), nY = Math.round(ny + oy + hy);
  R(x, '#6a2438', nX + 1, nY - 1); R(x, '#6a2438', nX + 1, nY + 1);
  const [e0, e1] = [s.eye[0], s.eye[1] + oy + hy];
  if (pose === 'sleep') { R(x, '#7a3448', e0, e1, 2, 1); }
  else if (sick) { R(x, EYE, e0, e1); R(x, '#7a3448', e0 - 1, e1 - 1); R(x, '#7a3448', e0 + 1, e1 - 1); R(x, '#7ac8ff', s.w - 7, 2); R(x, '#cfe8ff', s.w - 7, 1); }
  else { R(x, EYE, e0, e1); R(x, '#ffffff', e0, e1 - 1 > 0 ? e1 - 1 : e1); R(x, EYE, e0, e1); if (stage !== 'non') R(x, EYE, e0 + 1, e1); if (old) R(x, PK[0], e0, e1 - 1, 2, 1); }
  R(x, '#f08a9e', e0 + (stage === 'non' ? 1 : 2), e1 + 2); // má hồng
  return c;
}

// ---------- BÒ ---------- non 17x13 · nhỡ 21x15 · trưởng thành 26x17 · già 26x17
// male: bò đực có sừng, vai u, không có bầu sữa, màu lang nâu.

function cow(stage, frame, pose = 'stand', male = false) {
  const old = stage === 'gia', sit = pose !== 'stand', sick = pose === 'sick';
  const W = old ? fade(P.cowW, 0.15, '#d8d0c4') : P.cowW;
  const K = male ? (old ? fade(['#3a1a0c', '#5a2c14', '#7c4220', '#9c5c30'], 0.3) : ['#3a1a0c', '#5a2c14', '#7c4220', '#9c5c30']) : (old ? fade(P.cowK, 0.35, '#8a8690') : P.cowK);
  const MZ = old ? fade(P.muzzle, 0.25) : P.muzzle;
  const S = {
    non: { w: 17, h: 13, body: [10.5, 5.6, 4.6, 2.9], head: [4.5, 4.6, 2.8, 2.9], mz: [2.6, 6.9, 1.7, 1.3], ear: [7.3, 3.2, 1.4, 0.8], legs: { fx: 6, bx: 12, top: 8, len: 4 }, eye: [[3, 4], [5, 4]], spots: [[9, 4, 1.8], [13, 6.5, 1.5]], tail: [15, 4, 6] },
    nho: { w: 21, h: 15, body: [12.5, 6.4, 6.6, 3.4], head: [5, 5, 3, 3.1], mz: [3, 7.6, 1.9, 1.4], ear: [8.1, 3.4, 1.6, 0.8], legs: { fx: 7, bx: 15, top: 9, len: 5 }, eye: [[3, 4], [6, 4]], spots: [[11, 4.5, 2.2], [16, 7.5, 2], [13, 9, 1.4]], tail: [19, 4, 8] },
    truong: { w: 26, h: 17, body: [15.4, 7.6, 8.8, 4.2], head: [5.4, 5.6, 3.3, 3.4], mz: [3.2, 8.6, 2.2, 1.6], ear: [9, 3.8, 1.8, 0.9], legs: { fx: 8, bx: 19, top: 11, len: 5 }, eye: [[4, 5], [7, 5]], spots: [[13, 5.2, 2.8], [20, 8.4, 2.6], [16, 10.4, 1.6], [9.5, 8.5, 1.5]], tail: [24, 5, 10] },
  };
  const s = S[old ? 'truong' : stage];
  const oy = sit ? s.legs.len - 1 : 0, hy = (old ? 1 : 0) + (sick ? 2 : 0) + (pose === 'sleep' ? 1 : 0);
  const [bx, by, brx, bry] = s.body, [hx, hyy, hrx, hry] = s.head, [mx, my, mrx, mry] = s.mz, [ex, ey, erx, ery] = s.ear;
  const spots = s.spots;
  const legs = pose === 'stand' ? quadLegs({ ...s.legs, r: W, hoof: P.hoof, frame, slow: old }) : [];
  const fem = !male && (stage === 'truong' || old);
  const hump = male && stage !== 'non' ? E(bx - brx * 0.45, by - bry * 0.55 + oy, brx * 0.4, bry * 0.55, W, { pat: spotPat(spots, K, oy) }) : null;
  const bigHorn = male && stage !== 'non';
  const hornY = hyy - hry + oy + hy;
  const parts = [
    ...legs,
    fem && !sit && E(bx + 2, by + bry - 0.2 + oy, 1.9, 1.2, MZ, { sep: true }),
    hump,
    E(bx, by + oy, brx, bry, W, { pat: spotPat(spots, K, oy) }),
    sick && B(s.legs.fx - 3, s.h - 3, 4, 1, W, { sep: true, min: 1 }),
    sick && B(s.legs.bx + 1, s.h - 3, 4, 1, W, { sep: true, min: 1 }),
    // sừng
    bigHorn ? E(hx + 2.6, hornY + 0.2, 0.8, 1.6, P.horn, { lift: 0.2 }) : (stage !== 'non' || male) && E(hx + 1.8, hornY + 0.6, 0.6, 0.7, P.horn),
    bigHorn && E(hx - 1.7, hornY + 0.2, 0.8, 1.6, P.horn, { max: 2 }),
    E(ex, ey + oy + hy, erx, ery, W, { sep: true }),
    E(hx, hyy + oy + hy, hrx, hry, W, { sep: true, pat: (px, py, k) => (Math.hypot(px + 0.5 - (hx + 1.3), py + 0.5 - (hyy + oy + hy - 1)) < 1.6 ? K[k] : undefined) }),
    E(mx, my + oy + hy, mrx, mry, MZ, { sep: true }),
  ];
  const c = fig(s.w, s.h, parts);
  const x = c.getContext('2d');
  // đuôi có chùm
  const [tx, ty, tl] = s.tail;
  if (!sit) { line(x, OUT, tx + 1, ty + 1, tx + 1, ty + tl - 1); line(x, W[1], tx, ty + 1, tx, ty + tl - 2); R(x, K[1], tx, ty + tl - 2, 2, 2); R(x, OUT, tx - 1, ty + tl - 2); }
  else { line(x, OUT, tx - 2, s.h - 2, tx + 1, s.h - 2); R(x, K[1], tx + 1, s.h - 3); }
  // mũi, mắt
  const mY = Math.round(my + oy + hy);
  R(x, '#7a3a44', Math.round(mx - mrx) + 1, mY); R(x, '#7a3a44', Math.round(mx + mrx) - 1, mY);
  if (male && stage !== 'non') { R(x, '#e2c040', Math.round(mx), mY + 1); R(x, '#a8841c', Math.round(mx) + 1, mY + 1); } // khoen mũi
  for (const [e0, e1raw] of s.eye) {
    const e1 = e1raw + oy + hy;
    if (pose === 'sleep') R(x, '#5a4a4a', e0, e1);
    else if (sick) { R(x, EYE, e0, e1); R(x, '#6a5a5a', e0 + (e0 < hx ? -1 : 1), e1 - 1); }
    else { R(x, EYE, e0, e1); if (old) R(x, '#b0a8a0', e0, e1 - 1); }
  }
  if (sick) { R(x, '#7ac8ff', Math.round(hx + hrx), Math.round(hyy - hry) + oy + hy); }
  return c;
}
function spotPat(spots, K, oy) {
  return (px, py, k) => {
    for (const [sx, sy, r] of spots) {
      const d = Math.hypot(px + 0.5 - sx, (py + 0.5 - sy - oy) * 1.2);
      if (d < r + (hash(px * 5, py * 3) - 0.5) * 0.9) return K[k];
    }
    return undefined;
  };
}

// ---------- CỪU ---------- non 14x11 · nhỡ 17x13 · trưởng thành 23x16 · già 23x16
// curly: cừu vui lông xoăn (bờm lọn nhỏ, màu kem vàng).

function sheep(stage, frame, pose = 'stand', curly = false) {
  const old = stage === 'gia', sit = pose !== 'stand', sick = pose === 'sick';
  let WL = stage === 'nho' ? P.woolS : curly ? P.woolC : P.wool;
  if (old) WL = fade(WL, 0.3, '#c4c0bc');
  if (stage === 'non') WL = curly ? fade(P.woolC, 0.3, '#ffffff') : P.woolS;
  const F = old ? fade(P.face, 0.25, '#8a8288') : P.face;
  const S = {
    non: { w: 14, h: 11, core: [8.3, 4.8, 4, 2.6], bumps: [[5.6, 3.4, 1.5], [8, 2.6, 1.6], [10.6, 3.1, 1.5], [12, 5, 1.2], [6, 6.6, 1.4], [10, 6.6, 1.5]], head: [3.6, 5.2, 2.1, 2.4], cap: [4.2, 3, 1.5, 1.1], ear: [6.2, 4.4, 1.2, 0.6], legs: { fx: 5, bx: 10, top: 8, len: 2, w: 1 }, eye: [3, 5] },
    nho: { w: 17, h: 13, core: [9.8, 6.1, 5, 3], bumps: [[6.6, 4, 1.6], [9.3, 3.4, 1.7], [12.2, 3.6, 1.7], [14.4, 5.6, 1.4], [13.6, 8, 1.5], [10, 8.6, 1.6], [6.6, 8, 1.5]], head: [4.1, 5.8, 2.3, 2.8], cap: [4.8, 3.4, 1.6, 1], ear: [7, 4.9, 1.4, 0.7], legs: { fx: 6, bx: 12, top: 9, len: 3 }, eye: [3, 6] },
    truong: { w: 23, h: 16, core: [12.6, 7.4, 7.6, 4.3], bumps: [[6.8, 5, 2.4], [9.8, 3.6, 2.6], [13.4, 3.2, 2.7], [17, 3.8, 2.5], [19.6, 6.4, 2.2], [19.4, 9.6, 2.2], [15.8, 11, 2.4], [11.6, 11.4, 2.4], [7.6, 10.4, 2.2]], head: [4.4, 7, 2.5, 3.1], cap: [5.4, 4.2, 2.2, 1.5], ear: [7.8, 6, 1.6, 0.8], legs: { fx: 7, bx: 16, top: 12, len: 3 }, eye: [3, 7] },
  };
  const s = S[old ? 'truong' : stage];
  const oy = sit ? s.legs.len : 0, hy = (old ? 1 : 0) + (sick ? 1 : 0) + (pose === 'sleep' ? 1 : 0);
  const legs = pose === 'stand' ? quadLegs({ ...s.legs, r: F, hoof: ['#120c0c', '#120c0c'], frame, slow: old }) : [];
  const curl = curly && stage !== 'nho';
  const bumps = curl ? [...s.bumps, ...s.bumps.map(([bx, by, r]) => [bx + r * 0.5, by + r * 0.35, r * 0.65])] : s.bumps;
  const woolPat = (px, py, k) => {
    if (curl && k >= 2 && (px * 2 + py * 3) % 5 === 0) return WL[1];
    if (!curl && k === 2 && hash(px * 11, py * 5) < 0.12) return WL[3];
    return undefined;
  };
  const c = fig(s.w, s.h, [
    ...legs,
    sick && B(s.legs.fx - 3, s.h - 3, 3, 1, F, { sep: true }),
    sick && B(s.legs.bx + 2, s.h - 3, 3, 1, F, { sep: true }),
    E(s.core[0], s.core[1] + oy, s.core[2], s.core[3], WL, { pat: woolPat }),
    ...bumps.map(([bx, by, r]) => E(bx, by + oy, r, r * 0.9, WL, { sep: curl ? WL[0] : WL[1], pat: woolPat })),
    E(s.ear[0], s.ear[1] + oy + hy, s.ear[2], s.ear[3], F, { sep: true }),
    E(s.head[0], s.head[1] + oy + hy, s.head[2], s.head[3], F, { sep: true }),
    E(s.cap[0], s.cap[1] + oy + hy, s.cap[2], s.cap[3], WL, { sep: WL[1], ghost: false }),
  ]);
  const x = c.getContext('2d');
  const [e0, e1r] = s.eye, e1 = e1r + oy + hy;
  if (pose === 'sleep') R(x, '#8a7a76', e0, e1, 2, 1);
  else if (sick) { R(x, '#e8dcc8', e0, e1); R(x, '#8a7a76', e0 - 1 < 1 ? e0 : e0 - 1, e1 - 1); R(x, '#7ac8ff', s.w - 5, 1 + oy); }
  else { R(x, '#f2e8d8', e0, e1); R(x, EYE, e0, e1 + 0); R(x, '#f2e8d8', e0 + 1, e1); }
  R(x, '#c87a80', e0 - 1 < 1 ? 1 : e0 - 1, e1 + 2); // mũi hồng
  return c;
}

// ---------- CHÓ MỰC ---------- non 12x11 · nhỡ 16x13 · trưởng thành 19x15 · già 19x15

function dog(stage, frame, pose = 'stand') {
  const old = stage === 'gia', sit = pose !== 'stand', sick = pose === 'sick';
  const D = P.dog, G = P.dogG;
  const S = {
    non: { w: 12, h: 11, body: [7.4, 6.4, 3.3, 2.1], head: [4, 4.4, 2.8, 2.6], snout: [1.8, 5.6, 1.1, 0.9], legs: { fx: 4, bx: 8, top: 8, len: 2 }, eye: [[3, 4], [5, 4]], tail: 'stub' },
    nho: { w: 16, h: 13, body: [9.4, 7, 4.6, 2.3], head: [4.6, 4.6, 2.6, 2.4], snout: [1.9, 5.8, 1.4, 1], legs: { fx: 4, bx: 11, top: 9, len: 3 }, eye: [[3, 4], [5, 4]], tail: 'up' },
    truong: { w: 19, h: 15, body: [11, 8, 5.6, 2.8], head: [5, 4.8, 2.9, 2.6], snout: [2, 6.1, 1.6, 1.1], legs: { fx: 5, bx: 13, top: 10, len: 4 }, eye: [[3, 4], [6, 4]], tail: 'curl' },
  };
  const s = S[old ? 'truong' : stage];
  const oy = sit ? s.legs.len : 0, hy = (old ? 1.4 : 0) + (sick ? 2 : 0) + (pose === 'sleep' ? 2 : 0);
  const hx = pose === 'sleep' ? 0 : 0;
  const [bx, by, brx, bry] = s.body, [hX, hY, hrx, hry] = s.head, [nx, ny, nrx, nry] = s.snout;
  const legs = pose === 'stand' ? quadLegs({ ...s.legs, r: D, frame, slow: old }) : [];
  const parts = [...legs];
  // đuôi
  const tY = by - bry + oy + (old ? 1 : 0);
  if (s.tail === 'stub') parts.push(E(bx + brx + 0.4, tY + 0.8, 0.8, 1.2, D));
  else if (s.tail === 'up') parts.push(E(bx + brx, tY - 0.4, 0.8, 2, D));
  else if (old || sit) parts.push(E(bx + brx + 0.6, by + oy, 0.9, 2.4, D, { max: 2 }));
  else parts.push(E(bx + brx - 0.2, tY - 1.4, 1, 2.3, D), E(bx + brx - 1.4, tY - 3.2, 1.1, 0.9, D, { sep: true }));
  parts.push(E(bx, by + oy, brx, bry, D));
  parts.push(E(bx - brx + 1.8, by + oy - 0.2, 2, bry + 0.4, D, { sep: false })); // ngực
  if (sick) parts.push(B(s.legs.fx - 3, s.h - 3, 3, 1, D, { sep: true, min: 1 }), B(s.legs.bx + 2, s.h - 3, 3, 1, D, { sep: true, min: 1 }));
  // tai
  const eY = hY - hry + oy + hy;
  if (stage === 'non') parts.push(E(hX + 2.2, eY + 2.4, 1, 1.9, D, { sep: true, max: 1 })); // tai cụp
  else if (stage === 'nho') parts.push(E(hX + 1.4, eY + 0.2, 0.8, 1.3, D), E(hX + 2.4, eY + 0.8, 1, 0.8, D, { max: 1 })); // tai lưng chừng
  else if (!old && !sick) parts.push(E(hX + 0.6, eY, 0.8, 1.7, D), E(hX + 2.4, eY + 0.1, 0.8, 1.6, D, { max: 1 }));  // tai vểnh oai
  else parts.push(E(hX + 2, eY + 1, 1.2, 1.2, D, { max: 1 }));
  const gm = old ? (px, py) => (px + 0.5 < hX - 0.4 || py + 0.5 > hY + oy + hy + 1 ? G[1 + (px + py) % 2] : undefined) : undefined;
  parts.push(E(hX, hY + oy + hy, hrx, hry, D, { sep: true, pat: gm }));
  if (stage === 'non') parts.push(E(hX + 2.3, eY + 2.6, 0.8, 1.6, D, { sep: true, max: 1 }));
  parts.push(E(nx, ny + oy + hy, nrx, nry, old ? G : D, { sep: true, lift: old ? 0 : 0.25 }));
  const c = fig(s.w, s.h, parts);
  const x = c.getContext('2d');
  // vòng cổ đỏ
  if (stage !== 'non') {
    const cxp = Math.round(hX + 1), cy0 = Math.round(hY + hry + oy + hy - 1);
    R(x, '#c0302a', cxp, cy0, 1, 3); R(x, '#e85a44', cxp, cy0); R(x, '#f7d547', cxp - 1 < 0 ? cxp : cxp - 1, cy0 + 2);
  }
  // mũi
  const nX = Math.round(nx - nrx), nY = Math.round(ny + oy + hy - nry);
  R(x, '#000000', nX, nY); R(x, '#5a5a6a', nX, nY);
  R(x, '#08080c', nX, nY);
  // mắt hổ phách + chấm vàng trên mày
  for (const [e0, e1r] of s.eye) {
    const e1 = Math.round(e1r + oy + hy);
    if (pose === 'sleep') R(x, '#4a4a58', e0, e1);
    else if (sick) { R(x, '#b07a30', e0, e1); R(x, '#606070', e0 + (e0 < hX ? -1 : 1), e1 - 1); }
    else { R(x, '#e09a3a', e0, e1); if (old) R(x, G[3], e0, e1 - 1); }
  }
  if (!sit && stage === 'truong') { R(x, '#f07a8a', nX + 1, nY + 2); } // lè lưỡi
  if (sick) R(x, '#7ac8ff', Math.round(hX + hrx) + 1, Math.round(eY) + 1);
  return c;
}

// ---------- MÈO MƯỚP VÀNG ---------- non 10x9 · nhỡ 13x11 · trưởng thành 16x13 · già 16x13

function cat(stage, frame, pose = 'stand') {
  const old = stage === 'gia', sit = pose !== 'stand', sick = pose === 'sick';
  const C = old ? fade(P.cat, 0.3, '#e0c8a8') : P.cat, W = P.cream;
  const STR = old ? '#b07a48' : '#9a4410';
  const S = {
    non: { w: 10, h: 9, body: [6, 5.4, 2.8, 1.8], head: [3.4, 3.9, 2.3, 2.1], legs: { fx: 3, bx: 6, top: 7, len: 1, w: 1 }, tail: [8.4, 3.6, 0.7, 1.6] },
    nho: { w: 13, h: 11, body: [7.6, 6.3, 3.8, 2], head: [3.8, 4.2, 2.4, 2.2], legs: { fx: 4, bx: 8, top: 8, len: 2, w: 1 }, tail: [11.2, 3.6, 0.7, 2.4] },
    truong: { w: 16, h: 13, body: [9, 7.6, 4.8, 2.4], head: [4.2, 4.9, 2.7, 2.4], legs: { fx: 4, bx: 11, top: 9, len: 3 }, tail: [14, 4.4, 0.8, 3] },
  };
  const s = S[old ? 'truong' : stage];
  const oy = sit ? s.legs.len : 0, hy = (old ? 1 : 0) + (sick ? 1.5 : 0) + (pose === 'sleep' ? 1.5 : 0);
  const [bx, by, brx, bry] = s.body, [hX, hY, hrx, hry] = s.head;
  const stripes = (px, py, k) => (k < 3 && (px + Math.round(py * 0.4)) % 3 === 0 && py + 0.5 < by + oy + bry * 0.6 ? STR : undefined);
  const legs = pose === 'stand' ? quadLegs({ ...s.legs, r: C, frame, slow: old, far: 1, hoof: [C[1], W[2]] }) : [];
  const [tx, ty, trx, tr] = s.tail;
  const tail = sit
    ? [E(bx + brx - 0.5, by + bry + oy - 0.3, 2.4, 0.8, C, { pat: (px) => (px % 2 ? STR : undefined) })]
    : old ? [E(tx + 0.5, by + oy, trx, tr * 0.6, C, { pat: (px, py) => (py % 2 ? STR : undefined) })]
      : [E(tx, ty + oy, trx, tr, C, { pat: (px, py) => (py % 2 ? STR : undefined) }), E(tx - 0.8, ty - tr + 0.6 + oy, 0.9, 0.9, C, { sep: true })];
  const eY = hY - hry + oy + hy;
  const c = fig(s.w, s.h, [
    ...legs,
    ...(sit ? [] : tail),
    E(bx, by + oy, brx, bry, C, { pat: stripes }),
    E(bx - brx + 1.4, by + oy + 0.5, 1.6, bry * 0.7, W, { sep: false, max: 2 }), // ngực trắng
    ...(sit ? tail : []),
    sick && B(s.legs.fx - 2, s.h - 3, 2, 1, C, { sep: true }),
    // tai nhọn
    B(Math.round(hX - hrx + 0.6), Math.round(eY) - 1, 2, 2, C, { noise: 0 }),
    B(Math.round(hX - hrx + 0.6), Math.round(eY) - 2, 1, 1, C, { noise: 0, min: 2 }),
    B(Math.round(hX + hrx - 2.2), Math.round(eY) - 1, 2, 2, C, { noise: 0, max: 1 }),
    B(Math.round(hX + hrx - 1.2), Math.round(eY) - 2, 1, 1, C, { noise: 0, max: 1 }),
    E(hX, hY + oy + hy, hrx, hry, C, {
      sep: true, sepUp: false,
      pat: (px, py, k) => {
        const ry = py + 0.5 - (hY + oy + hy);
        if (ry > 0.4 && Math.abs(px + 0.5 - (hX - 0.3)) < 1.6) return W[Math.min(3, k + 1)];
        if (ry < -0.8 && (px === Math.round(hX) || px === Math.round(hX) - 2)) return STR;
        return undefined;
      },
    }),
  ]);
  const x = c.getContext('2d');
  const ey = Math.round(hY + oy + hy - 0.4), e0 = Math.round(hX - 1.4), e1 = Math.round(hX + 0.8);
  R(x, '#f08a9e', Math.round(hX - 0.4), ey + 1); // mũi hồng
  for (const ex of [e0, e1]) {
    if (pose === 'sleep') R(x, '#7a3a14', ex, ey);
    else if (sick) { R(x, '#4a8a2a', ex, ey); R(x, '#7a3a14', ex, ey - 1); }
    else if (stage === 'non') { R(x, EYE, ex, ey); }
    else { R(x, '#7ac83a', ex, ey); R(x, EYE, ex, ey); R(x, old ? '#a8b860' : '#8ad84a', ex, ey); R(x, '#1a2a0a', ex, ey); }
  }
  if (!sit && stage !== 'non' && !old) { R(x, '#9ae05a', e0, ey); R(x, '#9ae05a', e1, ey); R(x, EYE, e0, ey + 0); }
  // ria
  R(x, '#fff8ea', 0, ey + 1 < s.h ? ey + 1 : ey);
  if (sick) R(x, '#7ac8ff', Math.round(hX + hrx), Math.round(eY));
  return c;
}

// ---------- tổ hợp theo loài ----------

const STAGES = ['non', 'nho', 'truong', 'gia'];
const species = fn => Object.fromEntries(STAGES.map(st => [st, pair(f => fn(st, f))]));

// ---------- trạng thái phủ (dùng chung) ----------

const MUD = ['#3e2a14', '#5a3e1e', '#7a5a2e', '#9a7a48'];
function dirtOverlay(w, h, n, seed) {
  return draw(w, h, x => {
    for (let i = 0; i < n; i++) {
      const cx = 1 + Math.floor(hash(i * 3 + seed, 7) * (w - 2)), cy = 1 + Math.floor(hash(i * 5 + seed, 13) * (h - 2));
      const r = hash(i, seed) < 0.4 ? 1 : 0;
      ell(x, MUD[1], cx, cy, r + 0.6, r * 0.6 + 0.4);
      R(x, MUD[0], cx, cy + 1 > h - 1 ? cy : cy + 1, r + 1, 1);
      R(x, MUD[3], cx - (r ? 1 : 0), cy - (r ? 0 : 0));
      if (hash(i, seed + 5) < 0.5) { R(x, MUD[2], cx + 1, cy - 1 < 0 ? 0 : cy - 1); }
      if (hash(i, seed + 9) < 0.35) R(x, MUD[0], cx, Math.min(h - 1, cy + 2)); // giọt chảy
    }
  });
}
function fliesFrame(f) {
  return draw(10, 8, x => {
    const pts = [[2, 3], [7, 2], [5, 6]];
    const t = f * 2.1;
    pts.forEach(([px, py], i) => {
      const ax = Math.round(px + Math.cos(t + i * 2.2) * 1.4), ay = Math.round(py + Math.sin(t * 1.3 + i * 2.2) * 1.2);
      R(x, '#1a1a1e', ax, ay); R(x, (f + i) % 2 ? '#d8e8f8' : '#a8b8c8', ax - 1, ay - 1); R(x, '#e8f4ff', ax + 1, ay - 1);
      R(x, 'rgba(60,60,60,0.35)', Math.round(px + Math.cos(t - 0.9 + i * 2.2) * 1.4), Math.round(py + Math.sin((t - 0.9) * 1.3 + i * 2.2) * 1.2));
    });
  });
}
function bubble(x, cx, cy, r) {
  if (r <= 0) { R(x, '#3a6a9a', cx, cy); R(x, '#ffffff', cx, cy); return; }
  ell(x, '#6a9ac8', cx, cy, r + 0.4, r + 0.4);
  ell(x, '#eef6ff', cx, cy, r - 0.4, r - 0.4);
  if (r >= 2) ell(x, '#cfe4f8', cx + 0.5, cy + 0.5, r - 1.2, r - 1.2);
  R(x, '#ffffff', Math.round(cx - r * 0.5), Math.round(cy - r * 0.5));
  if (r >= 2) R(x, '#f8c8f0', Math.round(cx + r * 0.4), Math.round(cy + r * 0.3)); // ánh cầu vồng
}
function soapOverlay(w, h, f, seed) {
  return draw(w, h, x => {
    const n = Math.round(w * h / 22);
    const list = [];
    for (let i = 0; i < n; i++) {
      const r = hash(i + seed, 3) < 0.25 ? 2 : hash(i + seed, 4) < 0.6 ? 1 : 0;
      const cx = 2 + Math.floor(hash(i * 7 + seed, 1) * (w - 4));
      let cy = 2 + Math.floor(hash(i * 3 + seed, 2) * (h - 4)) - f * (1 + (i % 2));
      if (cy < r + 1) cy += h - 4;
      list.push([cx, cy, r]);
    }
    list.sort((a, b) => a[2] - b[2]);
    for (const [cx, cy, r] of list) bubble(x, cx, cy, r);
  });
}
// Giọt nước văng tỏa hai bên khi con vật lắc mình: 0 bắt đầu, 1 bay rộng, 2 rơi tan.
function splashFrame(f) {
  return draw(20, 12, x => {
    const drop = (X, Y, big) => {
      if (big) { R(x, '#1f6fd1', X - 1, Y - 1, 3, 3); R(x, '#5fb8ff', X, Y - 1, 1, 2); R(x, '#5fb8ff', X - 1, Y, 1, 1); R(x, '#dff2ff', X, Y - 1); R(x, '#1f6fd1', X, Y - 2); }
      else { R(x, '#1f6fd1', X, Y); R(x, '#8fd0ff', X, Y - 1); }
    };
    const t = [0.42, 0.75, 1][f];
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1, a = 0.25 + (Math.floor(i / 2) / 5) * 1.1, sp = 0.75 + hash(i, 4) * 0.4;
      const X = Math.round(10 + side * Math.cos(a) * 9.2 * t * sp);
      const Y = Math.round(8 - Math.sin(a) * 9 * t * sp + 7 * t * t);
      if (Y < 2 || Y > 11 || X < 1 || X > 18) continue;
      if (f === 2 && i % 3 === 0) continue;
      drop(X, Y, i % 3 === 1 && f < 2);
    }
    if (f === 0) { R(x, '#dff2ff', 8, 6); R(x, '#dff2ff', 11, 5); R(x, '#8fd0ff', 9, 4); }
    if (f === 2) { ell(x, 'rgba(31,111,209,0.45)', 5, 11, 2, 0.3); ell(x, 'rgba(31,111,209,0.45)', 15, 11, 2, 0.3); }
  });
}
function star(x, cx, cy, s, col, core = '#ffffff') {
  for (let i = 1; i <= s; i++) { R(x, col, cx - i, cy); R(x, col, cx + i, cy); R(x, col, cx, cy - i); R(x, col, cx, cy + i); }
  if (s >= 2) { R(x, col, cx - 1, cy - 1); R(x, col, cx + 1, cy - 1); R(x, col, cx - 1, cy + 1); R(x, col, cx + 1, cy + 1); }
  R(x, core, cx, cy);
}
function sparkleFrame(f) {
  return draw(16, 14, x => {
    const S = [[[3, 4, 2], [11, 3, 1], [8, 10, 1]], [[3, 4, 1], [11, 3, 2], [13, 9, 1], [6, 11, 0]], [[3, 4, 0], [11, 3, 1], [13, 9, 2], [7, 7, 1]]][f];
    for (const [cx, cy, s] of S) star(x, cx, cy, s, s >= 2 ? '#fff3a0' : '#ffe86a');
  });
}

// ---------- hành động đặc biệt ----------

function heoMud(f) {
  return draw(26, 15, x => {
    // vũng bùn
    ell(x, MUD[0], 13, 11, 12.4, 3.4);
    ell(x, MUD[1], 13, 11, 11.6, 2.8);
    ell(x, MUD[2], 11, 10, 7, 1.2);
    // heo nằm ngửa lăn, chân vẫy
    const PK = P.pig;
    const pigC = fig(22, 12, [
      B(f ? 6 : 7, 1, 2, 3, PK, { max: 1 }), B(f ? 15 : 14, 1, 2, 3, PK, { max: 1 }),
      E(11.6, 6.6, 7.4, 3.4, PK, { pat: (px, py, k) => (py >= 8 && hash(px, py + f) < 0.55 ? MUD[k > 1 ? 2 : 1] : undefined) }),
      B(f ? 8 : 9, 0 + 1, 2, 3, PK, { sep: true, min: 1 }), B(f ? 13 : 12, 1, 2, 3, PK, { sep: true, min: 1 }),
      E(4.6, 6.4, 3.3, 3, PK, { sep: true }),
      E(5.4, 9.2, 1.6, 1, PK, { sep: true, max: 1 }),
      E(1.8, 5.6, 1, 1.4, P.snout, { sep: true }),
    ]);
    const px = pigC.getContext('2d');
    R(px, '#6a2438', 1, 5); R(px, '#6a2438', 1, 7);
    R(px, OUT, 4, 4, 2, 1); R(px, OUT, 3, 5); // mắt nhắm sung sướng ^^
    R(px, P.pink, 5, 7);
    dots(px, OUT, [[19, 4], [20, 5], [19, 6]]); R(px, PK[1], 19, 5);
    x.drawImage(pigC, 2, f ? 1 : 0);
    // bùn bắn
    const sp = f ? [[1, 6], [24, 5], [3, 3], [22, 2]] : [[2, 4], [23, 7], [5, 2], [20, 3]];
    for (const [sx, sy] of sp) { R(x, MUD[1], sx, sy); R(x, MUD[3], sx, sy - 1); }
    ell(x, MUD[1], 13, 13, 11, 1.2); R(x, MUD[3], 6, 12, 3, 1); R(x, MUD[3], 18, 13, 2, 1);
  });
}

function dogRun(f) {
  // phi nước đại: khung 0 duỗi dài, khung 1 co chân
  const D = P.dog;
  const legs = f
    ? [B(6, 9, 2, 3, D, { max: 1 }), B(10, 9, 2, 3, D, { max: 1 }), B(7, 9, 2, 3, D, { sep: true, min: 1 }), B(11, 9, 2, 3, D, { sep: true, min: 1 })]
    : [B(2, 9, 3, 2, D, { max: 1 }), B(14, 9, 3, 2, D, { max: 1 }), B(3, 10, 3, 2, D, { sep: true, min: 1 }), B(15, 10, 3, 2, D, { sep: true, min: 1 })];
  const by = f ? 6.6 : 7.4;
  const c = fig(20, 13, [
    ...legs,
    E(17.6, by - 2.4, 0.9, 2, D, { max: 2 }),
    E(10, by, 6.6, 2.6, D),
    E(5.2, by - 0.4, 2.2, 2.6, D),
    E(4.4, by - 5.2, 0.8, 1.5, D), E(6, by - 5.2, 0.8, 1.4, D, { max: 1 }),
    E(4.6, by - 2.6, 2.7, 2.4, D, { sep: true }),
    E(1.9, by - 1.4, 1.4, 1.1, D, { sep: true, lift: 0.25 }),
  ]);
  const x = c.getContext('2d');
  const hy = Math.round(by - 2.6);
  R(x, '#e09a3a', 3, hy - 1); R(x, '#e09a3a', 5, hy - 1);
  R(x, '#08080c', 1, hy); R(x, '#f07a8a', 2, hy + 2); R(x, '#f07a8a', 3, hy + 3);
  R(x, '#c0302a', 6, hy + 1, 1, 3); R(x, '#f7d547', 6, hy + 3);
  return c;
}
function dogSit(f) {
  const D = P.dog;
  const c = fig(14, 16, [
    E(11.4, 13.4, f ? 2.4 : 2, 0.8, D, { max: 2 }), // đuôi quẫy
    B(9, 11, 4, 3, D, { max: 1 }),
    E(9, 10.6, 3.3, 3.6, D),
    B(4, 9, 2, 5, D, { sep: true, min: 1 }), B(6, 9, 2, 5, D, { sep: true, max: 2 }),
    E(5.6, 9, 2.4, 2.4, D),
    E(4.6, 2.6, 0.8, 1.6, D), E(7, 2.6, 0.8, 1.6, D, { max: 1 }),
    E(5.6, 5.4, 2.9, 2.5, D, { sep: true }),
    E(3, 6.6, 1.6, 1.1, D, { sep: true, lift: 0.25 }),
  ]);
  const x = c.getContext('2d');
  R(x, '#e09a3a', 4, 4); R(x, '#e09a3a', 6, 4);
  R(x, '#08080c', 2, 6); R(x, '#f07a8a', 3, 8);
  R(x, '#c0302a', 4, 8, 4, 1); R(x, '#f7d547', 5, 9);
  return c;
}
function dogBeg(f) {
  const D = P.dog;
  const paw = f ? [B(2, 7, 3, 2, D, { sep: true, min: 1 })] : [B(3, 9, 2, 3, D, { sep: true, min: 1 })];
  const c = fig(14, 16, [
    E(11.4, 13.4, 2.2, 0.8, D, { max: 2 }),
    B(9, 11, 4, 3, D, { max: 1 }),
    E(9, 10.6, 3.3, 3.6, D),
    B(6, 9, 2, 5, D, { sep: true, max: 2 }),
    E(5.8, 9, 2.4, 2.4, D),
    ...paw,
    E(4.6, 2.6, 0.8, 1.6, D), E(7, 2.6, 0.8, 1.6, D, { max: 1 }),
    E(5.6, 5.4, 2.9, 2.5, D, { sep: true }),
    E(3, 6.6, 1.6, 1.1, D, { sep: true, lift: 0.25 }),
  ]);
  const x = c.getContext('2d');
  R(x, '#e09a3a', 4, 4); R(x, '#e09a3a', 6, 4); R(x, '#4c4c5c', 4, 3); R(x, '#4c4c5c', 6, 3); // mày nhướn
  R(x, '#08080c', 2, 6); R(x, '#f07a8a', 3, 8);
  R(x, '#c0302a', 5, 8, 3, 1); R(x, '#f7d547', 6, 9);
  if (f) { R(x, P.dog[3], 2, 7); }
  return c;
}

function catPounce(f) {
  const C = P.cat, W = P.cream, STR = '#9a4410';
  const stripes = (px, py, k) => (k < 3 && (px + Math.round(py * 0.4)) % 3 === 0 ? STR : undefined);
  const c = f
    ? fig(18, 12, [ // bay vồ, duỗi thẳng
      B(1, 6, 3, 2, C, { sep: true, min: 1, pat: (px) => (px === 1 ? W[2] : undefined) }),
      B(13, 6, 3, 2, C, { max: 1 }),
      E(16, 3.4, 1.1, 0.8, C, { pat: (px) => (px % 2 ? STR : undefined) }),
      E(9.4, 5.4, 5, 2, C, { pat: stripes }),
      B(3, 1, 2, 2, C, { noise: 0 }), B(6, 1, 2, 2, C, { noise: 0, max: 1 }),
      E(5, 4.2, 2.6, 2.2, C, { sep: true, pat: (px, py, k) => (py >= 5 && px <= 5 ? W[Math.min(3, k + 1)] : undefined) }),
    ])
    : fig(16, 12, [ // rình, mông nhổm
      B(4, 9, 3, 2, C, { min: 1 }), B(11, 8, 2, 3, C, { max: 1 }),
      E(14, 4.6, 0.8, 2.4, C, { pat: (px, py) => (py % 2 ? STR : undefined) }),
      E(9.6, 7.4, 4.4, 2.4, C, { pat: stripes }),
      B(2, 4, 2, 2, C, { noise: 0 }), B(5, 4, 2, 2, C, { noise: 0, max: 1 }),
      E(4.2, 7.6, 2.6, 2.1, C, { sep: true, pat: (px, py, k) => (py >= 8 && px <= 4 ? W[Math.min(3, k + 1)] : undefined) }),
    ]);
  const x = c.getContext('2d');
  const ey = f ? 4 : 7;
  for (const ex of f ? [3, 6] : [2, 5]) { R(x, '#9ae05a', ex, ey); }
  R(x, EYE, f ? 3 : 2, ey); R(x, EYE, f ? 6 : 5, ey);
  R(x, P.pink, f ? 4 : 3, ey + 1);
  return c;
}
function catNap(f) {
  // nằm cuộn tròn phơi nắng, bụng phập phồng
  const C = P.cat, STR = '#9a4410', W = P.cream;
  const c = fig(16, 10, [
    E(8.6, 5.6 + (f ? 0.2 : 0), 6.2, 3.2 + (f ? 0.3 : 0), C, { pat: (px, py, k) => (k < 3 && (px + Math.round(py * 0.5)) % 3 === 0 ? STR : undefined) }),
    E(10, 8.2, 4.6, 0.9, C, { sep: true, pat: (px) => (px % 2 ? STR : undefined) }),
    B(3, 2, 2, 2, C, { noise: 0 }), B(6, 2, 2, 2, C, { noise: 0, max: 1 }), B(3, 1, 1, 1, C, { noise: 0, min: 2 }),
    E(4.8, 5.4, 2.8, 2.4, C, { sep: true, pat: (px, py, k) => (py >= 6 && px <= 5 ? W[Math.min(3, k + 1)] : undefined) }),
    E(3.6, 8.2, 1.8, 0.8, W, { sep: true }),
  ]);
  const x = c.getContext('2d');
  R(x, '#7a3a14', 3, 5); R(x, '#7a3a14', 6, 5); R(x, P.pink, 4, 6);
  return c;
}
function catMouse(f) {
  const base = cat('truong', 0, 'stand');
  return draw(base.width, base.height, x => {
    x.drawImage(base, 0, 0);
    // chuột xám ngậm trong miệng, đuôi lủng lẳng
    const m = fig(6, 5, [E(2.6, 2.4, 1.8, 1.3, P.rat), E(1.6, 1.2, 0.6, 0.6, P.rat, { lift: 0.3 })]);
    x.drawImage(m, 0, 5);
    R(x, P.pink, 0, 7 + (f ? 1 : 0)); R(x, P.pink, 0, 8 + (f ? 1 : 0)); R(x, '#d87a8a', 1, 9);
    R(x, EYE, 2, 6);
    if (f) { R(x, '#fff3a0', 6, 1); R(x, '#fff3a0', 7, 0); R(x, '#fff3a0', 8, 1); } // tự hào
  });
}

// ---------- kẻ săn mồi ----------

function rat(f) {
  const r = P.rat;
  const c = fig(13, 7, [
    B(f ? 3 : 4, 5, 1, 1, ['#d88a9a', '#d88a9a', '#f0a8b8', '#f0a8b8'], { noise: 0 }), B(f ? 8 : 7, 5, 1, 1, ['#c87a8a', '#c87a8a', '#e898a8', '#e898a8'], { noise: 0 }),
    E(6.6, 3.4, 3.6, 1.9, r),
    E(3.6, 1.6, 0.8, 0.8, ['#c87a8a', '#d88a9a', '#f0a8b8', '#ffc8d4']),
    E(2.6, 3.4, 2, 1.5, r, { sep: true }),
  ]);
  const x = c.getContext('2d');
  R(x, EYE, 2, 3); R(x, '#ffffff', 2, 2 - 0); R(x, EYE, 2, 3);
  R(x, '#f08a9e', 0, 3);
  // đuôi dài hồng
  line(x, '#d88a9a', 10, 3, 12, f ? 1 : 5);
  R(x, OUT, 0, 4);
  return c;
}
// Đa giác tô điểm ảnh (tâm điểm ảnh nằm trong) — dùng cho cánh chim.
function inPoly(pts, X, Y) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function hawk(f) {
  // diều hâu nhìn ngang bay sang trái: khung 0 cánh vỗ lên, khung 1 cánh đập xuống; mút cánh xòe "ngón"
  const H = P.hawk, W = 22, Hh = 13;
  const nearUp = [[8, 6], [13, 6.5], [18.5, 1], [16.5, 0.6], [14.5, 1.4], [12.5, 0.8], [10.5, 2]];
  const farUp = [[11, 5.5], [15, 5.5], [20.5, 2.2], [18.5, 1.6]];
  const nearDn = [[8, 6.5], [13, 6.5], [15.5, 12.2], [13.6, 12.4], [12.2, 11.4], [10.6, 12.2], [9, 10]];
  const farDn = [[11, 7], [14.5, 7], [18, 10.6], [16, 10.6]];
  const near = f ? nearDn : nearUp, far = f ? farDn : farUp;
  const body = [E(16.4, 7.2, 2.6, 1.3, H, { max: 2 }), E(10.4, 7.2, 4.6, 2, H)];
  const bodyC = fig(W, Hh, [
    E(17.8, 7.2, 1.8, 1.2, H, { max: 1 }),
    ...body,
    E(5.6, 6.4, 1.9, 1.7, H, { sep: true, lift: 0.2 }),
  ]);
  const wing = (pts, dark) => pix(W, Hh, (px, py) => {
    if (!inPoly(pts, px + 0.5, py + 0.5)) return null;
    const tip = f ? py >= 10 : py <= 2;
    if (tip && px % 2 === (dark ? 1 : 0)) return dark ? H[0] : H[1];
    const v = f ? (py - 6) / 6 : (6 - py) / 6;
    const k = dark ? (v > 0.5 ? 0 : 1) : v > 0.66 ? 1 : v > 0.25 ? 2 : 3;
    return H[k];
  });
  const farW = outline(wing(far, true)), nearW = outline(wing(near, false));
  return draw(W, Hh, x => {
    x.drawImage(farW, 0, 0);
    x.drawImage(bodyC, 0, 0);
    x.drawImage(nearW, 0, 0);
    // bụng & họng trắng sọc, mỏ quặp vàng, mắt
    R(x, P.hawkW[0], 7, 8, 3, 1); R(x, P.hawkW[1], 8, 8); R(x, P.hawkW[0], 5, 7, 2, 1);
    R(x, '#ffe070', 4, 5); R(x, EYE, 4, 5);
    R(x, OUT, 2, 6); R(x, '#f2c040', 3, 6); R(x, '#d89a1c', 3, 7); R(x, OUT, 2, 7);
    R(x, '#f2c040', 4, 5 - 1 < 0 ? 5 : 4); R(x, H[0], 4, 4);
    // móng vuốt thu dưới bụng
    R(x, '#f2c040', 12, 9); R(x, OUT, 12, 10); R(x, OUT, 13, 9);
  });
}
function hawkShadow() {
  return draw(18, 6, x => {
    ell(x, 'rgba(20,14,8,0.28)', 9, 3, 8, 1.2);
    ell(x, 'rgba(20,14,8,0.22)', 9, 3, 2.4, 2);
  });
}
function weasel(f) {
  const W = P.weasel;
  const c = fig(18, 9, [
    B(f ? 3 : 4, 6, 2, 2, W, { max: 1 }), B(f ? 12 : 11, 6, 2, 2, W, { max: 1 }),
    B(f ? 5 : 4, 6, 2, 2, W, { sep: true, min: 1 }), B(f ? 10 : 12, 6, 2, 2, W, { sep: true, min: 1 }),
    E(15.4, 4.4 - (f ? 1 : 0), 2.4, 1, W, { pat: (px) => (px >= 16 ? W[0] : undefined) }),
    E(8.6, 4.6 + (f ? -0.4 : 0), 5.4, 1.9, W),
    E(3.4, 3.8, 2.4, 1.7, W, { sep: true, pat: (px, py) => (py >= 4 && px <= 3 ? P.cream[2] : undefined) }),
    E(4.4, 1.8, 0.7, 0.7, W),
  ]);
  const x = c.getContext('2d');
  R(x, '#2a1a10', 2, 3, 3, 1); R(x, '#ffe070', 2, 3); // mặt nạ + mắt sáng
  R(x, EYE, 0, 4);
  return c;
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
// chân trẻ con: quần đùi + chân trần + dép
const KID_F = [
  ['....oppPPppo....', '....ollooll.....', '...offfoofffo...', '....ooo..ooo....'],
  ['....oppPPppo....', '....olloofffo...', '...offfo.ooo....', '....ooo.........'],
  ['....oppPPppo....', '...offfoollo....', '....ooo.offfo...', '.........ooo....'],
];
const KID_S = [
  ['.....oppPPo.....', '.....ollLLo.....', '....offfffo.....', '....ooooooo.....'],
  ['.....oppPPo.....', '....olloolLo....', '...offo..offo...', '...ooo...ooo....'],
];

function npc(def, pal, lf = LEGS_F, ls = LEGS_S) {
  const mk = rows => spr(rows, pal);
  const down = lf.map(l => mk([...def.down, ...l]));
  const up = lf.map(l => mk([...def.up, ...l]));
  const s0 = mk([...def.left, ...ls[0]]), s1 = mk([...def.left, ...ls[1]]);
  const left = [s0, s1, s0];
  const frames = [down, left, left.map(flip), up];
  const blinkRows = def.down.map(r => r.replace(/e/g, def.blink || 's'));
  const breathe = draw(16, 24, x => {
    x.drawImage(mk([...def.down, ...lf[0]]), 0, 0, 16, 20, 0, 1, 16, 20);
    x.drawImage(mk([...blinkRows, ...lf[0]]), 0, 20, 16, 4, 0, 20, 16, 4);
    x.drawImage(mk([...blinkRows, ...lf[0]]), 0, 0, 16, 20, 0, 1, 16, 20);
  });
  return { frames, idle: [down[0], breathe] };
}

// Tí Sún: thằng bé tóc lởm chởm, răng sún, áo sọc, túi trứng sau lưng.
const TISUN = {
  down: [
    '................',
    '................',
    '................',
    '......o.o.o.....',
    '.....ohohohoo...',
    '....ohhhhhhhho..',
    '...ohhhhhhhhhho.',
    '...ohhHhhhhHhho.',
    '...ohssshhssshho',
    '...ossssssssssso',
    '...osseessseesso',
    '...oscsssssscso.',
    '....osswmwwsso..',
    '.....ossssso....',
    '....oarrwwrrAo..',
    '...osrrwwwwrrso.',
    '...oswwrrrrwwso.',
    '...osrrwwwwrrso.',
    '....oorrrrrroo..',
    '.....orrrrrro...'],
  up: [
    '................',
    '................',
    '................',
    '......o.o.o.....',
    '.....ohohohoo...',
    '....ohhhhhhhho..',
    '...ohhhhhhhhhho.',
    '...ohhhhhhhhhho.',
    '...ohhhhhhhhhho.',
    '...ohhhhhhhhhho.',
    '...oHhhhhhhhhHo.',
    '...osHHhhhhHHso.',
    '....oHHHHHHHHo..',
    '.....ossssso....',
    '....oaBBBBBBAo..',
    '...osBbbbbbbBso.',
    '...osBbbbbbbBso.',
    '...osBbbbbbbBso.',
    '....ooBBBBBBoo..',
    '.....orrrrrro...'],
  left: [
    '................',
    '................',
    '................',
    '.....o.o.o......',
    '....ohohohoo....',
    '...ohhhhhhhho...',
    '..ohhhhhhhhhho..',
    '..osshhhhhhhho..',
    '..osssshhhhhho..',
    '..oseesshhhhho..',
    '.osssssshhhho...',
    '..oscsmsshHo....',
    '...owwwssso.....',
    '....ossssoB.....',
    '....oarrrrBo....',
    '....orwwwwBbo...',
    '....osrrrrBbo...',
    '....oswwwwBbo...',
    '....orrrrroBo...',
    '.....orrrro.....'],
  blink: 's',
};
const TISUN_PAL = {
  o: OUT, h: '#2a1e16', H: '#14100c', s: '#e8b088', c: '#f09080', e: '#1a1008', m: '#8a3a2a', w: '#ffffff',
  r: '#d8402e', a: '#f06a50', A: '#a82a1e', b: '#c8a060', B: '#8a6a34',
  p: '#3a5a8a', P: '#2a4268', f: '#7a4a22', l: '#e8b088', L: '#c88e66',
};

// Cô Út: bác sĩ thú y, tóc búi, áo blouse trắng, ống nghe xanh.
const COUT = {
  down: [
    '......oooo......',
    '.....ohhhho.....',
    '....oohhhhoo....',
    '...ohhhhhhhho...',
    '..ohhhhhhhhhho..',
    '..ohhssssssHho..',
    '..ohsssssssshho.',
    '..ohsessssesho..',
    '..ohscssssscho..',
    '...ohsssmsssho..',
    '....oSssssSo....',
    '..owwwcssswwWo..',
    '..owWwwcccwwWo..',
    '.owWwwwgwwwwWWo.',
    '.owWwwwgwwwwWWo.',
    '.owWwwwGwwxwWWo.',
    '.osWwwwwwwwwWso.',
    '..oWwwwwwwwwWo..',
    '..oWWwwwwwwWWo..',
    '...oWWWWWWWWo...'],
  up: [
    '......oooo......',
    '.....ohhhho.....',
    '....oohHHhoo....',
    '...ohhhhhhhho...',
    '..ohhhhhhhhhho..',
    '..ohhhhhhhhhho..',
    '..ohhhhhhhhhho..',
    '..oHhhhhhhhhHo..',
    '..oHHhhhhhhHHo..',
    '...oHHHHHHHHo...',
    '....oSssssSo....',
    '..owwwwwwwwwWo..',
    '..owWwwwwwwwWo..',
    '.owWwwwwwwwwWWo.',
    '.owWwwwwwwwwWWo.',
    '.owWwwwwwwwwWWo.',
    '.osWwwwwwwwwWso.',
    '..oWwwwwwwwwWo..',
    '..oWWwwwwwwWWo..',
    '...oWWWWWWWWo...'],
  left: [
    '.......oooo.....',
    '......ohhhho....',
    '.....oohhhhoo...',
    '...ohhhhhhhho...',
    '..ohhhhhhhhhho..',
    '..ossshhhhhhho..',
    '..osssshhhhhho..',
    '..oseesshhhhho..',
    '.osssssshhhhHo..',
    '..ocssmshhhHo...',
    '...osssssoHo....',
    '....owcwwwWo....',
    '...owwgwwwwWo...',
    '...owwgwwWwWo...',
    '...owwGwwWwWo...',
    '...owwwwwWwWo...',
    '...owxwwwswWo...',
    '...oWwwwwwWWo...',
    '...oWWwwwwWWo...',
    '....oWWWWWWo....'],
  blink: 's',
};
const COUT_PAL = {
  o: OUT, h: '#3a2418', H: '#24160e', s: '#f2c4a0', S: '#d8a07a', e: '#2a1a10', c: '#5a8ac8', m: '#c8505a',
  w: '#ffffff', W: '#c8d0dc', g: '#5a8ac8', G: '#3a5a8a', x: '#e5452f',
  p: '#4a6a9a', P: '#344c72', f: '#3a3036',
};

// Chú Ba: lái buôn đội nón cối, ria mép, áo nâu, cuộn dây thừng bên hông.
const CHUBA = {
  down: [
    '................',
    '.....oooooo.....',
    '....okkkkkKo....',
    '...okkkkkkkKo...',
    '..okkkkkkkkKKo..',
    '.oyyyyyyyyyyyyo.',
    '..ohssssssssho..',
    '..osesssssseso..',
    '..osssssssssso..',
    '..osmmmmmmmmso..',
    '...osssmmssso...',
    '....oSssssSo....',
    '..oatttsstttTo..',
    '.oaTtttbttttTTo.',
    '.oaTtttbttttTTo.',
    '.oaTtttbttRrTTo.',
    '.osTttttRrrRTso.',
    '..oTTtttRrrRTo..',
    '..oTTttttRRTTo..',
    '...oTTTTTTTTo...'],
  up: [
    '................',
    '.....oooooo.....',
    '....okkkkkKo....',
    '...okkkkkkkKo...',
    '..okkkkkkkkKKo..',
    '.oyyyyyyyyyyyyo.',
    '..ohhhhhhhhhho..',
    '..ohhhhhhhhhho..',
    '..oHhhhhhhhhHo..',
    '..oHHhhhhhhHHo..',
    '...oHHHHHHHHo...',
    '....oSssssSo....',
    '..oattttttttTo..',
    '.oaTttttttttTTo.',
    '.oaTttttttttTTo.',
    '.oaTttttttttTTo.',
    '.osTttttttttTso.',
    '..oTTttttttTTo..',
    '..oTTttttttTTo..',
    '...oTTTTTTTTo...'],
  left: [
    '................',
    '....oooooo......',
    '...okkkkkKo.....',
    '..okkkkkkkKo....',
    '..okkkkkkkKKo...',
    '.oyyyyyyyyyyyo..',
    '..osssshhhhho...',
    '..osesshhhhho...',
    '.ossssshhhhHo...',
    '.ommmmsshhHo....',
    '..osmmssshHo....',
    '...osssssoo.....',
    '....oatttTo.....',
    '...oatttttTo....',
    '...oattRrtTo....',
    '...oatRrrRtTo...',
    '...oatRrrRtTo...',
    '...oatsRRttTo...',
    '...oTTttttTTo...',
    '....oTTTTTTo....'],
  blink: 's',
};
const CHUBA_PAL = {
  o: OUT, k: '#8a9a5a', K: '#5e6c3a', y: '#4e5a2e', h: '#2a2420', H: '#1a1612',
  s: '#d4986a', S: '#b07448', e: '#2a1a10', m: '#3a2a20',
  t: '#8a5a2b', T: '#6b4020', a: '#b07a45', b: '#e0c890', R: '#9a7a3a', r: '#d4b070',
  p: '#3a3430', P: '#262220', f: '#2a1a10',
};

// ---------- chuồng 3 cấp: phần nhà/mái đặt trong góc chuồng ----------

const WOOD = ['#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868'];
const THATCH = ['#6e4e18', '#9a7428', '#c39a42', '#ddbb62', '#f0d890'];
const TILE = ['#6e2016', '#9e3024', '#c44434', '#e06a52'];
const BAMBOO = ['#56601a', '#86922e', '#b4bc54', '#dcdf8e'];
const STONE = ['#4a4650', '#6e6a74', '#918c94', '#b4b0b2', '#dcd8d0'];

function post(x, px, py, w, h, ramp) {
  R(x, OUT, px, py, w, h);
  for (let i = 1; i < w - 1; i++) R(x, i === 1 ? ramp[3] : i === w - 2 ? ramp[1] : ramp[2], px + i, py, 1, h - 1);
}
// vách ván ngang
function planks(x, px, py, w, h, ramp, step = 3) {
  R(x, OUT, px, py, w, h);
  for (let j = 0; j < h - 1; j++) {
    const k = j % step;
    R(x, k === 0 ? ramp[3] : k === step - 1 ? ramp[1] : ramp[2], px + 1, py + j, w - 2, 1);
  }
  for (let j = 0; j < h - 1; j += step) {
    const sx = px + 2 + Math.floor(hash(j, px) * (w - 4));
    R(x, ramp[1], sx, py + j + 1);
  }
  R(x, 'rgba(40,20,8,0.22)', px + w - 4, py, 3, h - 1);
}
// mái rơm: hình thang, sợi rơm sọc dọc
function thatch(x, y0, y1, l0, r0, l1, r1, seed = 0) {
  const c = pix(x.canvas.width, x.canvas.height, (px, py) => {
    if (py < y0 || py > y1) return null;
    const t = (py - y0) / Math.max(1, y1 - y0);
    const l = l0 + (l1 - l0) * t, r = r0 + (r1 - r0) * t;
    if (px < Math.round(l) || px > Math.round(r)) return null;
    if (py === y1) return THATCH[0];
    const band = Math.floor((py - y0) / 3), k = (py - y0) % 3;
    const n = hash(px + seed, band);
    let i = k === 0 ? 3 : k === 2 ? 1 : 2;
    if ((px + band * 2) % 3 === 0) i--;
    if (n < 0.12) i = 4;
    if (px < l + 2) i = Math.min(4, i + 1);
    if (px > r - 3) i = Math.max(0, i - 1);
    return THATCH[Math.max(0, i)];
  });
  outline(c); x.drawImage(c, 0, 0);
}
function tiles(x, y0, y1, l0, r0, l1, r1, ramp = TILE, seed = 0) {
  const c = pix(x.canvas.width, x.canvas.height, (px, py) => {
    if (py < y0 || py > y1) return null;
    const t = (py - y0) / Math.max(1, y1 - y0);
    const l = l0 + (l1 - l0) * t, r = r0 + (r1 - r0) * t;
    if (px < Math.round(l) || px > Math.round(r)) return null;
    const ry = py - y0;
    if (ry <= 1) return ry === 0 ? ramp[1] : ramp[0];
    if (py >= y1) return ramp[0];
    const band = Math.floor((ry - 2) / 3), k = (ry - 2) % 3;
    const ox = (px + (band % 2) * 2 + seed) % 4;
    let col = k === 0 ? ramp[3] : k === 2 ? (ox === 0 ? ramp[0] : ramp[1]) : ramp[2];
    if (ox === 0 && k < 2) col = ramp[1];
    if (px > r - 3 && k > 0) col = ramp[Math.max(0, ramp.indexOf(col) - 1)];
    return col;
  });
  outline(c); x.drawImage(c, 0, 0);
}
function doorHole(x, px, py, w, h, arch = true) {
  R(x, OUT, px, py, w, h);
  R(x, '#1e1008', px + 1, py + 1, w - 2, h - 1);
  R(x, '#3a2414', px + 1, py + h - 2, w - 2, 1);
  if (arch) { R(x, 'rgba(0,0,0,0)', px, py, 1, 1); x.clearRect(px, py, 1, 1); x.clearRect(px + w - 1, py, 1, 1); R(x, OUT, px + 1, py, w - 2, 1); }
}
function ramp(x, px, py, w, h) { // cầu thang gà
  for (let i = 0; i < h; i++) { R(x, OUT, px + i, py + i, w, 2); R(x, WOOD[2], px + i + 1, py + i, w - 2, 1); }
  for (let i = 1; i < h; i += 2) R(x, WOOD[0], px + i + 1, py + i, w - 2, 1);
}
function strawPile(x, cx, cy, rx, ry) {
  ell(x, OUT, cx, cy, rx + 1, ry + 1);
  ell(x, THATCH[2], cx, cy, rx, ry);
  ell(x, THATCH[3], cx - 1, cy - 1, rx - 1.5, ry - 1);
  for (let i = 0; i < rx * 3; i++) {
    const px = Math.round(cx - rx + hash(i, cy) * rx * 2), py = Math.round(cy - ry + hash(cx, i) * ry * 2);
    R(x, hash(i, 3) < 0.5 ? THATCH[4] : THATCH[1], px, py, 2, 1);
  }
}

// Gia cầm cấp 0: chòi tre mái rơm trên cọc · cấp 1: nhà gỗ mái ngói, cầu thang, ổ đẻ · cấp 2: nhà sơn, cửa sổ, ổ cát tắm.
function coopHouse(t) {
  if (t === 0) return draw(34, 32, x => {
    shadow(x, 17, 30, 15, 2);
    for (const px of [5, 26]) post(x, px, 18, 3, 13, BAMBOO);
    R(x, OUT, 3, 12, 28, 9);
    for (let i = 0; i < 26; i += 2) { R(x, BAMBOO[2], 4 + i, 13, 1, 7); R(x, BAMBOO[1], 5 + i, 13, 1, 7); R(x, BAMBOO[3], 4 + i, 13); }
    R(x, BAMBOO[0], 4, 19, 26, 1);
    doorHole(x, 14, 14, 6, 7);
    ramp(x, 18, 21, 4, 7);
    thatch(x, 2, 13, 13, 20, 0, 33, 3);
    strawPile(x, 8, 27, 3, 1.5);
  });
  if (t === 1) return draw(38, 36, x => {
    shadow(x, 19, 34, 17, 2);
    for (const px of [4, 31]) post(x, px, 24, 3, 11, WOOD);
    planks(x, 3, 14, 32, 12, WOOD);
    doorHole(x, 15, 17, 7, 9);
    // ổ đẻ có rơm thò ra
    R(x, OUT, 25, 17, 8, 6); R(x, '#2a1608', 26, 18, 6, 4); R(x, THATCH[3], 26, 20, 6, 2); R(x, THATCH[4], 27, 20, 2, 1);
    R(x, '#fff4e0', 29, 19, 2, 1); R(x, '#e8d8b8', 29, 20);
    ramp(x, 20, 26, 4, 8);
    tiles(x, 3, 15, 15, 22, 0, 37);
    R(x, OUT, 17, 1, 4, 3); R(x, WOOD[3], 18, 2, 2, 1); // con gà trống gió? -> chóp nóc
    strawPile(x, 7, 32, 3, 1.5);
  });
  return draw(46, 40, x => {
    shadow(x, 21, 38, 20, 2);
    // ổ cát tắm (khung gỗ, cát vàng)
    R(x, OUT, 30, 29, 15, 9); R(x, WOOD[2], 31, 30, 13, 7); R(x, WOOD[3], 31, 30, 13, 1);
    for (let i = 0; i < 11; i++) for (let j = 0; j < 5; j++) R(x, hash(i, j + 3) < 0.25 ? '#c8a860' : hash(i + 4, j) < 0.2 ? '#fff0c0' : '#ecd394', 32 + i, 31 + j);
    R(x, '#b89850', 34, 33, 3, 1); R(x, '#b89850', 39, 34, 2, 1);
    for (const px of [4, 26]) post(x, px, 26, 3, 11, WOOD);
    // vách sơn trắng kem, viền gỗ
    R(x, OUT, 3, 15, 27, 13);
    for (let j = 0; j < 12; j++) R(x, j % 3 === 0 ? '#fffaf0' : j % 3 === 2 ? '#d8ccb4' : '#f2e8d4', 4, 16 + j, 25, 1);
    R(x, 'rgba(60,40,20,0.18)', 25, 16, 4, 12);
    post(x, 3, 15, 3, 13, WOOD); post(x, 27, 15, 3, 13, WOOD);
    doorHole(x, 13, 18, 7, 10);
    R(x, '#e5452f', 13, 17, 7, 1); // diềm cửa đỏ
    // cửa sổ tròn
    ell(x, OUT, 23, 21, 2.4, 2.4); ell(x, '#9ad0f0', 23, 21, 1.6, 1.6); R(x, '#ffffff', 22, 20); R(x, OUT, 23, 19, 1, 5); R(x, OUT, 21, 21, 5, 1);
    R(x, '#4fa83a', 7, 24, 4, 2); R(x, '#8fd65a', 7, 24, 2, 1); R(x, '#e5452f', 8, 23); R(x, '#f7d547', 10, 23); // chậu hoa
    R(x, OUT, 6, 26, 6, 1);
    ramp(x, 18, 28, 4, 8);
    tiles(x, 3, 17, 15, 18, -1, 34, ['#1e4a6e', '#2e6a9e', '#4a8ac4', '#7ab4e6']);
    // chong chóng gà trên nóc
    R(x, OUT, 16, 0, 1, 4); R(x, '#f7d547', 14, 1, 4, 1); R(x, '#d19a1c', 18, 1); R(x, '#e5452f', 14, 0);
  });
}

// Heo: cấp 0 mái lá trên cột · cấp 1 chuồng gạch mái ngói · cấp 2 chuồng gạch sơn + vũng bùn
function pigHouse(t) {
  if (t === 0) return draw(32, 26, x => {
    shadow(x, 16, 24, 15, 2);
    for (const px of [2, 27]) post(x, px, 9, 3, 16, WOOD);
    R(x, OUT, 4, 16, 24, 9); R(x, '#2a1a10', 5, 17, 22, 7); // gầm tối
    strawPile(x, 16, 22, 7, 1.6);
    thatch(x, 2, 11, 6, 25, 0, 31, 7);
  });
  if (t === 1) return draw(36, 30, x => {
    shadow(x, 18, 28, 17, 2);
    // tường gạch
    R(x, OUT, 2, 13, 32, 15);
    for (let j = 0; j < 14; j++) for (let i = 0; i < 30; i++) {
      const row = j >> 1, k = j & 1, off = (i + (row % 2) * 2) % 4;
      R(x, k === 1 || off === 0 ? '#8e4028' : (j < 2 ? '#d0805a' : '#b4583a'), 3 + i, 14 + j);
    }
    R(x, OUT, 10, 17, 16, 11); R(x, '#24140c', 11, 18, 14, 10);
    strawPile(x, 18, 26, 6, 1.4);
    tiles(x, 2, 15, 6, 29, 0, 35);
  });
  return draw(44, 36, x => {
    // vũng bùn bên cạnh
    ell(x, OUT, 33, 30, 10, 4.4); ell(x, MUD[1], 33, 30, 9.4, 3.8); ell(x, MUD[2], 31, 29, 6, 1.6); R(x, MUD[3], 28, 28, 3, 1); R(x, '#9ad0f0', 36, 31, 2, 1);
    shadow(x, 16, 33, 15, 2);
    R(x, OUT, 2, 15, 28, 17);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 26; i++) {
      const row = j >> 1, k = j & 1, off = (i + (row % 2) * 2) % 4;
      R(x, j >= 11 ? (k === 1 || off === 0 ? '#5e5a62' : '#8a868e') : (k === 1 || off === 0 ? '#d8c8b0' : '#f4ead8'), 3 + i, 16 + j);
    }
    R(x, OUT, 9, 20, 14, 12); R(x, '#24140c', 10, 21, 12, 11);
    strawPile(x, 16, 30, 5, 1.4);
    // biển tên hình heo
    R(x, OUT, 12, 17, 8, 3); R(x, '#f6efd8', 13, 18, 6, 1); R(x, P.pig[2], 14, 18, 3, 1); R(x, P.pig[1], 17, 18);
    // máng ăn đá
    R(x, OUT, 24, 28, 9, 4); R(x, STONE[3], 25, 28, 7, 1); R(x, STONE[1], 25, 29, 7, 2); R(x, '#d9b13a', 26, 29, 5, 1);
    tiles(x, 3, 17, 5, 26, -1, 32, ['#2e5a1e', '#3e7a2a', '#5aa03c', '#8ccc5a']);
  });
}

// Chuồng lớn bò cừu: cấp 0 lán tre · cấp 1 nhà kho gỗ đỏ · cấp 2 nhà kho lớn + máng cỏ
function barnHouse(t) {
  if (t === 0) return draw(40, 30, x => {
    shadow(x, 20, 28, 19, 2);
    for (const px of [2, 18, 35]) post(x, px, 11, 3, 18, BAMBOO);
    R(x, OUT, 4, 20, 31, 2); R(x, BAMBOO[2], 4, 20, 31, 1);
    strawPile(x, 12, 26, 5, 1.6); strawPile(x, 27, 26, 4, 1.4);
    thatch(x, 2, 13, 8, 31, 0, 39, 11);
  });
  if (t === 1) return draw(46, 38, x => {
    shadow(x, 23, 36, 22, 2);
    R(x, OUT, 3, 15, 40, 21);
    for (let i = 0; i < 38; i++) { const k = i % 3; R(x, k === 0 ? '#e06a52' : k === 2 ? '#9e3024' : '#c44434', 4 + i, 16, 1, 19); }
    R(x, 'rgba(40,10,6,0.25)', 37, 16, 5, 19);
    // cửa lớn chữ X trắng
    R(x, OUT, 15, 20, 16, 16); R(x, '#8e3024', 16, 21, 14, 15);
    line(x, '#f3ead2', 16, 21, 29, 35); line(x, '#f3ead2', 29, 21, 16, 35);
    R(x, '#f3ead2', 16, 21, 14, 1); R(x, '#f3ead2', 16, 21, 1, 15); R(x, '#f3ead2', 29, 21, 1, 15); R(x, OUT, 22, 21, 1, 15);
    // ô cỏ khô trên gác
    R(x, OUT, 19, 11, 8, 7); R(x, '#2a1608', 20, 12, 6, 5); R(x, THATCH[3], 20, 15, 6, 2); R(x, THATCH[4], 21, 15, 2, 1);
    // mái
    tiles(x, 2, 16, 14, 31, 0, 45, ['#3a2a22', '#5a463c', '#7a645a', '#a08a7c']);
    R(x, OUT, 19, 11, 8, 1);
  });
  return draw(56, 44, x => {
    shadow(x, 24, 42, 23, 2);
    R(x, OUT, 3, 18, 42, 24);
    for (let i = 0; i < 40; i++) { const k = i % 3; R(x, k === 0 ? '#e06a52' : k === 2 ? '#9e3024' : '#c44434', 4 + i, 19, 1, 22); }
    R(x, 'rgba(40,10,6,0.25)', 39, 19, 5, 22);
    R(x, '#f3ead2', 4, 19, 40, 1); R(x, '#f3ead2', 4, 40, 40, 1);
    R(x, OUT, 15, 24, 18, 18); R(x, '#8e3024', 16, 25, 16, 17);
    line(x, '#f3ead2', 16, 25, 31, 41); line(x, '#f3ead2', 31, 25, 16, 41);
    R(x, '#f3ead2', 16, 25, 16, 1); R(x, '#f3ead2', 16, 25, 1, 17); R(x, '#f3ead2', 31, 25, 1, 17); R(x, OUT, 23, 25, 2, 17);
    // cửa sổ
    for (const wx of [6, 36]) { R(x, OUT, wx, 24, 7, 6); R(x, '#9ad0f0', wx + 1, 25, 5, 4); R(x, '#ffffff', wx + 1, 25, 2, 1); R(x, OUT, wx + 3, 25, 1, 4); R(x, '#f3ead2', wx, 30, 7, 1); }
    R(x, OUT, 20, 12, 8, 8); R(x, '#2a1608', 21, 13, 6, 6); R(x, THATCH[3], 21, 16, 6, 3); R(x, THATCH[4], 22, 16, 2, 1);
    tiles(x, 2, 19, 16, 32, 0, 47, ['#3a2a22', '#5a463c', '#7a645a', '#a08a7c']);
    R(x, OUT, 20, 12, 8, 1);
    // chong chóng
    R(x, OUT, 24, 0, 1, 7); R(x, '#d19a1c', 21, 2, 7, 1); R(x, '#f7d547', 21, 2, 3, 1);
    // máng cỏ bên hông
    R(x, OUT, 44, 30, 11, 12);
    for (let i = 0; i < 5; i++) { R(x, WOOD[2], 45 + i * 2, 31, 1, 7); }
    strawPile(x, 49, 30, 4, 2);
    R(x, OUT, 44, 37, 11, 5); R(x, WOOD[2], 45, 38, 9, 3); R(x, WOOD[3], 45, 38, 9, 1); R(x, WOOD[0], 45, 40, 9, 1);
    R(x, '#5fb33e', 46, 36, 2, 1); R(x, '#8fd65a', 51, 36);
  });
}

function quarantine() {
  return draw(32, 28, x => {
    shadow(x, 16, 26, 15, 2);
    R(x, OUT, 3, 11, 26, 15);
    for (let j = 0; j < 14; j++) R(x, j % 3 === 0 ? '#ffffff' : j % 3 === 2 ? '#d4dcd8' : '#eef4f0', 4, 12 + j, 24, 1);
    R(x, 'rgba(40,60,50,0.15)', 24, 12, 4, 14);
    R(x, OUT, 6, 16, 8, 10); R(x, '#5a7a6a', 7, 17, 6, 9); R(x, '#7a9a8a', 7, 17, 1, 9); R(x, '#f7d547', 11, 21);
    // chữ thập xanh
    R(x, OUT, 17, 14, 9, 9); R(x, '#ffffff', 18, 15, 7, 7);
    R(x, '#2f9a4a', 20, 16, 3, 5); R(x, '#2f9a4a', 19, 17, 5, 3); R(x, '#5fd07a', 20, 16, 1, 1); R(x, '#5fd07a', 19, 17);
    tiles(x, 2, 12, 12, 19, 0, 31, ['#1e5a34', '#2f7a4a', '#4aa060', '#7ad08a']);
    // biển nhỏ
    R(x, '#e8f8ec', 13, 6, 6, 1);
  });
}

function doghouseT(t) {
  if (t === 0) return draw(22, 20, x => {
    shadow(x, 11, 18, 10, 2);
    planks(x, 2, 8, 18, 11, WOOD);
    doorHole(x, 7, 11, 8, 8);
    for (let i = 0; i < 8; i++) { R(x, OUT, 11 - i - 1, i + 1, (i + 1) * 2 + 1 - 1 + 1, 1); R(x, i % 2 ? WOOD[1] : WOOD[2], 11 - i, i + 1, i * 2 + 1 - 1 + 1, 1); }
    R(x, OUT, 0, 9, 22, 1); R(x, OUT, 10, 0, 2, 1);
    R(x, WOOD[3], 10, 1);
  });
  if (t === 1) return draw(24, 22, x => {
    shadow(x, 12, 20, 11, 2);
    planks(x, 2, 9, 20, 12, ['#8a6a3a', '#b08a52', '#d0aa6a', '#f0d090']);
    doorHole(x, 8, 12, 8, 9);
    for (let i = 0; i < 9; i++) { R(x, OUT, 12 - i - 2, i + 1, i * 2 + 4, 1); R(x, i % 3 === 0 ? TILE[3] : i % 3 === 2 ? TILE[1] : TILE[2], 12 - i - 1, i + 1, i * 2 + 2, 1); }
    R(x, OUT, 0, 10, 24, 1); R(x, TILE[0], 1, 9, 22, 1);
    // bảng tên xương
    R(x, OUT, 9, 10, 6, 3); R(x, '#fff8ea', 10, 11, 4, 1); R(x, '#fff8ea', 9, 11); R(x, '#fff8ea', 14, 11);
  });
  return draw(30, 26, x => {
    shadow(x, 14, 24, 13, 2);
    planks(x, 3, 11, 22, 13, ['#2e4a6e', '#3e6a9a', '#5a8ac4', '#8ab4e6']);
    doorHole(x, 9, 14, 10, 10);
    ell(x, '#c0302a', 14, 22, 3.6, 1); ell(x, '#e85a5a', 13, 22, 2.4, 0.6); // nệm đỏ
    tiles(x, 1, 12, 13, 15, -1, 28, ['#6e2016', '#9e3024', '#c44434', '#e06a52']);
    // bát ăn + xương đồ chơi
    R(x, OUT, 23, 21, 6, 3); R(x, '#aeaebe', 24, 21, 4, 1); R(x, '#d19a1c', 24, 21, 4, 1); R(x, '#767686', 24, 22, 4, 1);
    R(x, OUT, 1, 22, 5, 2); R(x, '#fff8ea', 2, 22, 3, 1); R(x, '#fff8ea', 1, 22); R(x, '#fff8ea', 5, 23);
    R(x, OUT, 12, 9, 4, 3); R(x, '#f7d547', 13, 10, 2, 1); // biển vàng
  });
}

function catDoor() {
  return draw(8, 8, x => {
    R(x, OUT, 0, 1, 8, 7); R(x, WOOD[2], 1, 2, 6, 5);
    ell(x, OUT, 4, 4, 2.3, 2.3); R(x, '#3a2414', 3, 3, 3, 3); R(x, '#8a5a2b', 3, 6, 3, 1);
    R(x, '#c44434', 2, 3, 4, 3); R(x, '#e06a52', 2, 3, 4, 1); R(x, OUT, 2, 6, 4, 1); // nắp lật
    R(x, OUT, 3, 1, 1, 1); R(x, OUT, 5, 1, 1, 1); R(x, WOOD[3], 1, 2, 6, 1);
    // tai mèo nhỏ trên khung
    R(x, OUT, 1, 0); R(x, OUT, 6, 0);
  });
}

function scale() {
  return draw(16, 16, x => {
    shadow(x, 8, 14, 7, 1.6);
    // bàn cân sắt
    R(x, OUT, 1, 10, 14, 5); R(x, '#767686', 2, 11, 12, 3); R(x, '#aeaebe', 2, 11, 12, 1); R(x, '#4c4c58', 2, 13, 12, 1);
    // trụ + mặt đồng hồ
    R(x, OUT, 11, 4, 3, 7); R(x, '#aeaebe', 12, 5, 1, 6);
    ell(x, OUT, 12, 3, 3, 3); ell(x, '#fffaf0', 12, 3, 2, 2);
    R(x, '#e5452f', 12, 2, 1, 2); R(x, OUT, 12, 3); R(x, '#4c4c58', 10, 3); R(x, '#4c4c58', 14, 3); R(x, '#4c4c58', 12, 5);
    R(x, '#e2e2ea', 3, 11, 3, 1);
  });
}

function grave(flower) {
  return draw(12, 14, x => {
    shadow(x, 6, 12, 5.4, 1.4);
    // gò đất cỏ
    ell(x, OUT, 6, 11, 5.5, 2); ell(x, '#5fb33e', 6, 11, 4.6, 1.3); R(x, '#8fd65a', 3, 10, 3, 1); R(x, '#3d8c2a', 7, 12, 3, 1);
    // bia đá bo tròn
    R(x, OUT, 2, 3, 8, 8); R(x, OUT, 3, 2, 6, 1); R(x, OUT, 4, 1, 4, 1);
    R(x, STONE[3], 3, 3, 6, 7); R(x, STONE[3], 4, 2, 4, 1); R(x, STONE[4], 3, 3, 2, 1); R(x, STONE[4], 4, 2, 1, 1);
    R(x, STONE[2], 7, 3, 2, 7); R(x, STONE[1], 3, 9, 6, 1);
    // dấu chân thú khắc
    R(x, STONE[1], 5, 6, 2, 2); R(x, STONE[1], 4, 5); R(x, STONE[1], 7, 5); R(x, STONE[1], 5, 4); R(x, STONE[1], 6, 4);
    if (flower) {
      for (const [fx, fy, col] of [[2, 10, '#ff8fb1'], [9, 10, '#f7d547'], [6, 11, '#ffffff']]) {
        R(x, '#3d8c2a', fx, fy + 1); R(x, col, fx - 1, fy); R(x, col, fx + 1, fy); R(x, col, fx, fy - 1); R(x, col, fx, fy + 1 - 1 + 0); R(x, '#f59a23', fx, fy);
      }
    }
  });
}

function angel(f) {
  return draw(14, 14, x => {
    const y = f ? 0 : 1;
    // hào quang
    ell(x, '#d19a1c', 7, 1 + y, 3, 0.6); ell(x, '#fff3a0', 7, 1 + y, 2, 0.1); x.clearRect(6, 1 + y, 3, 1);
    R(x, '#fff3a0', 5, 1 + y); R(x, '#fff3a0', 9, 1 + y);
    // cánh
    const wy = f ? 6 : 7;
    for (const s of [-1, 1]) {
      const wx = 7 + s * 5;
      ell(x, '#9ab4d8', wx, wy + y, 1.6, 2.2); ell(x, '#ffffff', wx - s * 0.3, wy + y - 0.4, 1, 1.5);
    }
    // thân tròn trắng, tai nhỏ
    const body = fig(10, 10, [
      E(2.6, 2.4, 1, 1.2, ['#c8d4ea', '#e2e8f6', '#f6f8ff', '#ffffff']), E(7.4, 2.4, 1, 1.2, ['#c8d4ea', '#e2e8f6', '#f6f8ff', '#ffffff']),
      E(5, 5, 3.6, 3.4, ['#b8c4de', '#dee4f4', '#f4f6ff', '#ffffff']),
    ]);
    x.drawImage(body, 2, 3 + y);
    // mặt cười nhắm mắt
    R(x, '#3b2412', 5, 8 + y); R(x, '#3b2412', 8, 8 + y); R(x, '#3b2412', 6, 10 + y, 2, 1);
    R(x, '#ffb0c0', 4, 9 + y); R(x, '#ffb0c0', 9, 9 + y);
  });
}

function eggNest() {
  return draw(12, 10, x => {
    shadow(x, 6, 8, 5.6, 1.4);
    // bụi cỏ sau
    for (const [gx, h] of [[1, 5], [3, 7], [5, 8], [8, 7], [10, 5]]) { R(x, OUT, gx, 9 - h, 2, h); R(x, '#3d8c2a', gx, 10 - h, 1, h - 1); R(x, '#5fb33e', gx + 1, 10 - h, 1, h - 1); R(x, '#8fd65a', gx, 9 - h + 1); }
    // trứng
    ell(x, OUT, 5, 6, 2, 2.5); ell(x, '#fff4e0', 5, 6, 1.2, 1.7); R(x, '#ffffff', 4, 5); R(x, '#e8d4b0', 6, 7);
    ell(x, OUT, 8, 7, 1.6, 1.8); ell(x, '#f4e2c4', 8, 7, 0.8, 1.1); R(x, '#fff8ea', 7, 6);
    // cỏ trước
    for (const [gx, h] of [[0, 3], [2, 4], [6, 3], [9, 4], [11, 2]]) { R(x, '#2f6b1f', gx, 10 - h, 1, h); R(x, '#5fb33e', gx, 10 - h); }
  });
}
function eggFertile() {
  return draw(11, 12, x => {
    // hào quang ấm khi soi
    ell(x, 'rgba(255,200,80,0.35)', 5, 6, 5, 5.4);
    ell(x, 'rgba(255,230,140,0.45)', 5, 6, 3.8, 4.4);
    ell(x, OUT, 5, 6, 2.6, 3.4); ell(x, '#ffe2a0', 5, 6, 1.8, 2.6); ell(x, '#fff4d0', 4, 5, 0.8, 1.2);
    // phôi: chấm đỏ có tia máu
    R(x, '#c0402a', 5, 7, 2, 1); R(x, '#e5452f', 5, 6); R(x, '#e88a50', 4, 8); R(x, '#e88a50', 7, 6);
    R(x, '#ffffff', 4, 4);
  });
}
function grainScatter() {
  return draw(16, 8, x => {
    for (let i = 0; i < 26; i++) {
      const px = Math.round(1 + hash(i, 2) * 13 + Math.sin(i) * 0.5), py = Math.round(1 + hash(i, 5) * 5.5);
      R(x, '#8a5a10', px, py + 1); R(x, i % 3 ? '#e8c34a' : '#f7d547', px, py); if (i % 4 === 0) R(x, '#fff0a0', px, py);
    }
  });
}
function lowFence(kind) {
  return draw(16, 16, x => {
    if (kind === 'h') {
      R(x, OUT, 0, 9, 16, 3); R(x, BAMBOO[2], 0, 10, 16, 1); R(x, BAMBOO[3], 0, 10, 16, 0);
      for (const ox of [3, 11]) { R(x, OUT, ox, 6, 3, 9); R(x, BAMBOO[2], ox + 1, 7, 1, 7); R(x, BAMBOO[3], ox + 1, 7); }
      R(x, BAMBOO[1], 0, 11, 16, 0);
      // dây buộc
      R(x, '#8a5a2b', 4, 10); R(x, '#8a5a2b', 12, 10);
    } else {
      R(x, OUT, 7, 0, 3, 16); R(x, BAMBOO[2], 8, 0, 1, 16);
      for (const oy of [2, 10]) { R(x, OUT, 6, oy, 5, 4); R(x, BAMBOO[2], 7, oy + 1, 3, 2); R(x, BAMBOO[3], 7, oy + 1, 3, 1); R(x, '#8a5a2b', 8, oy + 2); }
    }
  });
}
function ratTrap() {
  return draw(12, 8, x => {
    shadow(x, 6, 7, 5.6, 1);
    R(x, OUT, 0, 3, 12, 5); R(x, WOOD[2], 1, 4, 10, 3); R(x, WOOD[3], 1, 4, 10, 1); R(x, WOOD[1], 1, 6, 10, 1);
    // lò xo + thanh kẹp
    R(x, '#767686', 2, 2, 8, 1); R(x, '#aeaebe', 2, 2, 3, 1); R(x, OUT, 2, 1, 8, 1);
    R(x, '#aeaebe', 5, 4, 2, 2); R(x, '#4c4c58', 6, 5);
    // miếng phô mai
    R(x, OUT, 8, 3, 3, 2); R(x, '#f7d547', 8, 4, 2, 1); R(x, '#d19a1c', 9, 4);
  });
}
function vetClinic() {
  return draw(48, 40, x => {
    shadow(x, 24, 38, 23, 2);
    R(x, OUT, 3, 17, 42, 21);
    for (let j = 0; j < 20; j++) R(x, j < 13 ? (j % 3 === 0 ? '#ffffff' : '#eef4f2') : (j % 2 ? '#a8b4b0' : '#c4d0cc'), 4, 18 + j, 40, 1);
    R(x, 'rgba(30,50,40,0.15)', 38, 18, 6, 20);
    // cửa kính
    R(x, OUT, 19, 24, 11, 14); R(x, '#9ad0f0', 20, 25, 9, 12); R(x, '#cfeaff', 20, 25, 3, 5); R(x, OUT, 24, 25, 1, 12); R(x, '#f7d547', 23, 31); R(x, '#f7d547', 25, 31);
    // cửa sổ có rèm
    for (const wx of [6, 34]) { R(x, OUT, wx, 22, 9, 8); R(x, '#9ad0f0', wx + 1, 23, 7, 6); R(x, '#ffffff', wx + 1, 23, 2, 6); R(x, '#ffffff', wx + 6, 23, 1, 6); R(x, '#5fd07a', wx, 30, 9, 1); R(x, OUT, wx, 31, 9, 1); }
    // mái hiên sọc xanh trắng
    for (let i = 0; i < 44; i++) { R(x, OUT, 2 + i, 15, 1, 5); R(x, (i >> 2) % 2 ? '#ffffff' : '#2f9a4a', 2 + i, 16, 1, 3); }
    for (let i = 0; i < 44; i += 4) { R(x, OUT, 2 + i, 19, 4, 1); x.clearRect(3 + i, 20, 2, 1); R(x, (i >> 2) % 2 ? '#e8eee8' : '#1e7a3a', 3 + i, 19, 2, 1); }
    // mái chính
    tiles(x, 2, 15, 8, 39, 0, 47, ['#1e5a34', '#2f7a4a', '#4aa060', '#7ad08a']);
    // bảng chữ thập lớn
    R(x, OUT, 18, 3, 12, 12); R(x, '#ffffff', 19, 4, 10, 10);
    R(x, '#2f9a4a', 22, 5, 4, 8); R(x, '#2f9a4a', 20, 7, 8, 4); R(x, '#5fd07a', 22, 5, 1, 2); R(x, '#5fd07a', 20, 7, 2, 1); R(x, '#1e7a3a', 25, 10, 1, 3);
    // chậu cây hai bên cửa
    for (const px of [15, 31]) { R(x, OUT, px, 33, 4, 5); R(x, '#b4583a', px + 1, 34, 2, 3); ell(x, '#3d8c2a', px + 2, 32, 2, 1.6); R(x, '#8fd65a', px + 1, 31); R(x, '#ff8fb1', px + 3, 31); }
  });
}

// ---------- icon túi đồ 12x12 ----------

function soapBar() {
  return draw(12, 12, x => {
    ell(x, OUT, 6, 7, 5, 3.2); ell(x, '#ffb8d0', 6, 7, 4.2, 2.4); ell(x, '#ffd8e6', 5, 6, 3, 1.2); R(x, '#e888a8', 3, 9, 6, 1);
    R(x, '#fff0f6', 4, 6, 2, 1);
    bubble(x, 9, 3, 1); bubble(x, 5, 2, 0); bubble(x, 11, 6, 0);
  });
}
function vaccine() {
  return draw(12, 12, x => {
    // ống tiêm chéo
    for (let i = 0; i < 6; i++) { R(x, OUT, 2 + i, 8 - i, 3, 3); }
    for (let i = 0; i < 5; i++) { R(x, '#cfeaff', 3 + i, 8 - i, 1, 1); R(x, '#5fd07a', 3 + i, 9 - i, 1, 1); }
    R(x, '#ffffff', 4, 7);
    line(x, OUT, 0, 11, 2, 9); R(x, '#aeaebe', 1, 10); // kim
    R(x, OUT, 8, 1, 3, 3); R(x, '#aeaebe', 9, 2); line(x, OUT, 10, 0, 11, 1); // pít-tông
    R(x, OUT, 6, 5, 4, 1); R(x, '#e2e2ea', 7, 5, 2, 1);
  });
}
function medicine() {
  return draw(12, 12, x => {
    R(x, OUT, 3, 3, 6, 9); R(x, '#ff8fb1', 4, 5, 4, 6); R(x, '#ffc8d8', 4, 5, 1, 6); R(x, '#d86a8a', 7, 5, 1, 6);
    R(x, OUT, 4, 0, 4, 3); R(x, '#ffffff', 5, 1, 2, 2);
    R(x, '#ffffff', 5, 6, 2, 4); R(x, '#ffffff', 4, 7, 4, 2); R(x, '#e5452f', 5, 7, 2, 2);
    R(x, '#ffffff', 4, 4, 4, 1);
  });
}
function treat() {
  return draw(12, 12, x => {
    // bánh quy hình xương
    const bone = [[2, 4], [9, 4], [2, 7], [9, 7]];
    for (const [bx, by] of bone) ell(x, OUT, bx, by, 2, 2);
    R(x, OUT, 2, 4, 8, 4);
    for (const [bx, by] of bone) ell(x, '#d89a50', bx, by, 1, 1);
    R(x, '#d89a50', 3, 5, 6, 2); R(x, '#f2c27a', 2, 3, 2, 1); R(x, '#f2c27a', 3, 5, 6, 1); R(x, '#a86a30', 3, 7, 6, 0);
    R(x, '#8a5420', 5, 6); R(x, '#8a5420', 7, 5);
  });
}
function sausage() {
  return draw(12, 12, x => {
    for (let i = 0; i < 8; i++) { const y = 7 - Math.round(Math.sin((i / 7) * Math.PI) * 2); ell(x, OUT, 2 + i, y, 1.8, 1.8); }
    for (let i = 0; i < 8; i++) { const y = 7 - Math.round(Math.sin((i / 7) * Math.PI) * 2); ell(x, '#c0402a', 2 + i, y, 1, 1); R(x, '#f06a50', 2 + i, y - 1); }
    R(x, '#ffa080', 4, 4, 3, 1);
    R(x, '#e8c870', 0, 8, 1, 2); R(x, '#e8c870', 11, 8, 1, 2); // đầu buộc
  });
}
function manure() {
  return draw(12, 12, x => {
    // bao phân chuồng
    R(x, OUT, 2, 3, 8, 9); R(x, '#a07a48', 3, 4, 6, 7); R(x, '#c8a070', 3, 4, 2, 7); R(x, '#7a5a30', 8, 4, 1, 7);
    R(x, OUT, 3, 1, 6, 2); R(x, '#c8a070', 4, 2, 4, 1); R(x, '#e8c890', 4, 1, 2, 1);
    ell(x, '#5a3a1a', 6, 7, 1.6, 1); R(x, '#7a5434', 5, 6, 2, 1); R(x, '#3d8c2a', 7, 5); R(x, '#8fd65a', 6, 5);
  });
}

// ---------- icon trạng thái (giống STATUS_ROWS) ----------

const HEART_SHAPE = ['.oo.oo.', 'orrorro', 'orrrrro', 'orrrrro', '.orrro.', '..oro..', '...o...'];
function heartN(n) {
  // trái tim đầy dần từ dưới lên theo độ thân 1..5; ❤️5 có ánh lấp lánh
  return draw(9, 8, x => {
    const fill = Math.ceil((n / 5) * 6);
    HEART_SHAPE.forEach((row, py) => [...row].forEach((ch, px) => {
      if (ch === 'o') R(x, OUT, px + 1, py + 1);
      else if (ch === 'r') {
        const on = 6 - py <= fill;
        R(x, on ? (py <= 1 ? '#ff8a8a' : py >= 4 ? '#b8202a' : '#e5303a') : '#f2dcd0', px + 1, py + 1);
      }
    }));
    if (n >= 1) R(x, n >= 5 ? '#ffffff' : '#ffc8c8', 3, 2);
    if (n >= 5) { R(x, '#fff3a0', 8, 0); R(x, '#fff3a0', 0, 5); }
  });
}
function dirtyIcon() {
  return draw(9, 8, x => {
    ell(x, OUT, 4, 5, 3.4, 2.4); ell(x, MUD[2], 4, 5, 2.6, 1.6); R(x, MUD[3], 2, 4, 2, 1); R(x, MUD[1], 4, 6, 3, 1);
    R(x, OUT, 4, 1, 1, 2); R(x, MUD[2], 4, 2); // giọt
    R(x, '#1a1a1e', 7, 1); R(x, '#d8e8f8', 6, 0); R(x, '#d8e8f8', 8, 0); // ruồi
  });
}
function strayIcon() {
  // 💤 kèm dấu hỏi: con vật lạc ngủ ngoài chuồng
  const c = spr([
    '.....qqq.',
    '....qQ.Qq',
    'uuu....Qq',
    '..u...Qq.',
    '.u....q..',
    'uuu......',
    '......q..',
    '.........',
  ], { u: '#5fb8ff', q: '#f59a23', Q: '#ffd870' });
  const z = c.getContext('2d');
  R(z, '#1f6fd1', 0, 5, 3, 1); R(z, '#1f6fd1', 1, 4);
  return c;
}
function warn() {
  return draw(9, 8, x => {
    for (let i = 0; i < 7; i++) { const hw = Math.floor(i * 0.65); R(x, OUT, 4 - hw - 1, i, hw * 2 + 3, 1); }
    R(x, OUT, 0, 7, 9, 1);
    for (let i = 1; i < 7; i++) { const hw = Math.floor((i - 1) * 0.65); R(x, i < 3 ? '#ffe070' : '#f7c530', 4 - hw, i, hw * 2 + 1, 1); }
    R(x, '#e5452f', 4, 2, 1, 3); R(x, '#e5452f', 4, 6);
  });
}

// ---------- ghép bùn lên đúng hình con vật (kẹp theo alpha) ----------

const dirtCache = new WeakMap();
// Phủ vệt bùn chỉ lên phần đục của sprite (level 1..3). Dùng khi muốn bùn bám đúng dáng con vật.
export function muddy(img, level = 2) {
  let m = dirtCache.get(img);
  if (!m) dirtCache.set(img, m = {});
  if (m[level]) return m[level];
  return m[level] = draw(img.width, img.height, x => {
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    const n = Math.round(img.width * img.height * 0.035 * level);
    for (let i = 0; i < n; i++) {
      const px = Math.floor(hash(i * 7 + 1, img.width) * img.width), py = Math.floor(img.height * (0.35 + 0.65 * hash(i * 3, img.height + 2)));
      R(x, MUD[1], px, py, hash(i, 9) < 0.5 ? 2 : 1, 1);
      R(x, MUD[0], px, py + 1);
      if (hash(i, 4) < 0.4) R(x, MUD[2], px, py - 1);
    }
    R(x, 'rgba(90,62,30,' + (0.08 * level) + ')', 0, Math.floor(img.height * 0.6), img.width, img.height);
  });
}

// Nhuốm sắc xanh tái cho dáng bệnh (giữ nguyên viền), thêm giọt mồ hôi nếu chưa có.
function sicken(c) {
  const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height);
  const o = parseInt(OUT.slice(1), 16);
  for (let i = 0; i < d.data.length; i += 4) {
    if (d.data[i + 3] < 200) continue;
    const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2];
    if (((r << 16) | (g << 8) | b) === o) continue;
    const t = 0.22;
    d.data[i] = r * (1 - t) + 0xa8 * t; d.data[i + 1] = g * (1 - t) + 0xc0 * t; d.data[i + 2] = b * (1 - t) + 0x90 * t;
  }
  x.putImageData(d, 0, 0);
  return c;
}

// ---------- Xuất ----------

const ANIMAL = {
  ga: species(hen),
  gaTrong: species(rooster),
  vit: species(duck),
  heo: species(pig),
  bo: species((st, f) => cow(st, f)),
  boDuc: species((st, f) => cow(st, f, 'stand', true)),
  cuu: species((st, f) => sheep(st, f)),
  cuuXoan: species((st, f) => sheep(st, f, 'stand', true)),
  cho: species(dog),
  meo: species(cat),
};

export const SPR3 = {
  animal: ANIMAL,
  // ngủ & bệnh theo dáng từng loài, giai đoạn trưởng thành (bản 'left'); xem sleepBy/sickBy để có đủ giai đoạn
  sleep: {
    ga: hen('truong', 0, 'sleep'), gaTrong: rooster('truong', 0, 'sleep'), vit: duck('truong', 0, 'sleep'), heo: pig('truong', 0, 'sleep'),
    bo: cow('truong', 0, 'sleep'), boDuc: cow('truong', 0, 'sleep', true), cuu: sheep('truong', 0, 'sleep'), cho: dog('truong', 0, 'sleep'), meo: catNap(0),
  },
  sick: {},
  // theo giai đoạn: sleepBy.heo.non ...
  sleepBy: {},
  sickBy: {},
  heoMud: [heoMud(0), heoMud(1)],
  dogHerd: pair(dogRun),
  dogSit: pair(dogSit),
  dogBeg: pair(dogBeg),
  catPounce: pair(catPounce),
  catNap: pair(catNap),
  catMouse: pair(catMouse),
  fx: {
    dirt: { s: dirtOverlay(10, 6, 5, 1), m: dirtOverlay(16, 8, 8, 2), l: dirtOverlay(22, 10, 12, 3) },
    flies: [0, 1, 2].map(fliesFrame),
    soap: { s: [0, 1].map(f => soapOverlay(12, 9, f, 1)), m: [0, 1].map(f => soapOverlay(18, 12, f, 2)), l: [0, 1].map(f => soapOverlay(26, 15, f, 3)) },
    splash: [0, 1, 2].map(splashFrame),
    sparkleClean: [0, 1, 2].map(sparkleFrame),
  },
  rat: pair(rat),
  hawk: pair(hawk),
  hawkShadow: hawkShadow(),
  weasel: pair(weasel),
  pen: {
    coop: [0, 1, 2].map(coopHouse),
    pig: [0, 1, 2].map(pigHouse),
    barn: [0, 1, 2].map(barnHouse),
  },
  quarantine: quarantine(),
  doghouse: [0, 1, 2].map(doghouseT),
  catDoor: catDoor(),
  scale: scale(),
  grave: grave(false),
  graveFlower: grave(true),
  angel: [angel(0), angel(1)],
  eggNest: eggNest(),
  eggFertile: eggFertile(),
  grainScatter: grainScatter(),
  lowFence: { h: lowFence('h'), v: lowFence('v') },
  ratTrap: ratTrap(),
  vetClinic: vetClinic(),
  items: { soapBar: soapBar(), vaccine: vaccine(), medicine: medicine(), treat: treat(), sausage: sausage(), manure: manure() },
  status: {
    heart1: heartN(1), heart2: heartN(2), heart3: heartN(3), heart4: heartN(4), heart5: heartN(5),
    dirtyIcon: dirtyIcon(), strayIcon: strayIcon(), warn: warn(),
  },
};
const POSE = { ga: hen, gaTrong: rooster, vit: duck, heo: pig, bo: (s, f, p) => cow(s, f, p), boDuc: (s, f, p) => cow(s, f, p, true), cuu: (s, f, p) => sheep(s, f, p), cuuXoan: (s, f, p) => sheep(s, f, p, true), cho: dog, meo: cat };
for (const [k, fn] of Object.entries(POSE)) {
  SPR3.sleepBy[k] = Object.fromEntries(STAGES.map(st => [st, fn(st, 0, 'sleep')]));
  SPR3.sickBy[k] = Object.fromEntries(STAGES.map(st => [st, sicken(fn(st, 0, 'sick'))]));
  SPR3.sick[k] = SPR3.sickBy[k].truong;
}
SPR3.sleepBy.meo.truong = SPR3.sleep.meo;
const tisun = npc(TISUN, TISUN_PAL, KID_F, KID_S), cout = npc(COUT, COUT_PAL), chuba = npc(CHUBA, CHUBA_PAL);
Object.assign(SPR3, {
  npcTiSun: tisun.frames, npcTiSunIdle: tisun.idle,
  npcCoUt: cout.frames, npcCoUtIdle: cout.idle,
  npcChuBa: chuba.frames, npcChuBaIdle: chuba.idle,
});
// alias icon túi đồ ở cấp trên cho tiện
Object.assign(SPR3, SPR3.items, SPR3.status);
