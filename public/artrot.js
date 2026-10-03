// Chuồng xoay 90° (cổng ở bên TRÁI thay vì phía trên): nhà chuồng, ổ đẻ, máng, cân heo, vũng bùn nhìn từ bên hông.
// PENROT (bộ thường) và PENROT_HD (bộ 2x, đúng gấp đôi, vẽ lại chi tiết hơn chứ không phóng to), cùng khóa:
//   pen: { coop: [cấp1, cấp2, cấp3], pig: [...], barn: [...] }, quarantine  nhà chuồng nhìn đầu hồi, cửa quay sang TRÁI
//   nestEmpty, nestEgg   ổ rơm thuôn dọc, vành thấp hở về bên trái (gà vào từ trái), vành sau bên phải cao
//   troughV              máng ăn nằm dọc (1 ô ngang × 2 ô dọc)
//   scale                cân heo nằm dọc, mặt đồng hồ quay sang trái
//   mudV                 vũng bùn SPR.mud đổi chiều rộng/cao (22x40)
//   incubator            ổ ấp trứng (SPR.coop) nhìn đầu hồi, cửa thanh gỗ trên vách hông trái; khung 30x36 như layout.penGeo nest.spr
//   shower: { pig, pasture } × { idle, off, spray: [3 khung] }   vòi sen cấp 3 (art59.SHOWER_ART): cần vươn vào chuồng theo chiều sâu,
//                        giữa đáy ảnh = chân cột (khung đối xứng quanh cột)
// Nhà chuồng: đầu hồi (tường tam giác) quay ra phía người xem, mái chạy lùi về sau-trái (mỗi 2 hàng lùi 1 cột),
// nên thấy được vách hông bên trái có cửa và cầu thang / rơm đi ra bên trái. Game lật ngang ảnh cho chuồng cổng bên phải:
// ánh sáng từ trên (hai mái cùng sắc độ, vách hông chỉ sẫm hơn đầu hồi một bậc), không chữ, nên lật vẫn đúng.
// Mọi ảnh: điểm neo giữa đáy, hàng dưới cùng là mặt đất (bóng đổ / viền chân).
// Cả hai bộ vẽ từ cùng một hàm theo toạ độ bộ thường (số lẻ .5 = một điểm 2x, chỉ hiện ở bộ 2x); mỗi mảng vẽ vào lớp
// riêng rồi viền tối 1 điểm (bộ 2x: viền mép trên nhạt theo màu bên trong).
// Tự đủ, không import art.js: nạp trong test Node (không có document) thì export là null.

const DOM = typeof document !== 'undefined';

// ---------- màu (cùng bảng art3 / art11) ----------
const OUT = '#3b2412';
const WOOD = ['#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868'];
const THATCH = ['#6e4e18', '#9a7428', '#c39a42', '#ddbb62', '#f0d890'];
const TILE = ['#6e2016', '#9e3024', '#c44434', '#e06a52'];
const BLUE_TILE = ['#1e4a6e', '#2e6a9e', '#4a8ac4', '#7ab4e6'];
const GREEN_TILE = ['#2e5a1e', '#3e7a2a', '#5aa03c', '#8ccc5a'];
const Q_TILE = ['#1e5a34', '#2f7a4a', '#4aa060', '#7ad08a'];
const BARN_ROOF = ['#3a2a22', '#5a463c', '#7a645a', '#a08a7c'];
const BARN_RED = ['#7e2418', '#9e3024', '#c44434', '#e06a52'];
const BAMBOO = ['#56601a', '#86922e', '#b4bc54', '#dcdf8e'];
const STONE = ['#4a4650', '#6e6a74', '#918c94', '#b4b0b2', '#dcd8d0'];
const IRON = ['#2e2e36', '#4c4c58', '#767686', '#aeaebe', '#e2e2ea'];
const CREAM = ['#d8ccb4', '#e8dcc4', '#f2e8d4', '#fffaf0'];
const WHITE = ['#c4ccc8', '#d4dcd8', '#eef4f0', '#ffffff'];
const BRICK = ['#8e4028', '#a24a2e', '#b4583a', '#d0805a'];
const CBRICK = ['#c8b8a0', '#d8c8b0', '#f4ead8', '#fffaf0'];
const LEAF = ['#1e4d14', '#2f6b1f', '#3d8c2a', '#5fb33e', '#8fd65a'];
const GLASS = ['#5aa8d8', '#8fd3ff', '#bfe8ff', '#ffffff'];
const MUD = ['#3e2a14', '#5a3e1e', '#7a5a2e', '#9a7a48'];
const NEST = ['#5c3a1a', '#8a6a20', '#a8841c', '#d9b13a', '#f0d060', '#fff0a0'];
const DARK_IN = '#1e1008';
const SK = 0.75;   // độ lùi ngang của chiều sâu: mỗi hàng lùi SK cột sang trái

// ---------- công cụ ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function hash(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
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
const dim = (rp, t = 0.16) => rp.map(c => mix(c, '#2a160a', t));   // vách hông: sẫm hơn đầu hồi một chút
const mod = (a, n) => ((a % n) + n) % n;

class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  in(X, Y) { return X >= 0 && Y >= 0 && X < this.w && Y < this.h; }
  a(X, Y) { return this.in(X, Y) ? this.d[(Y * this.w + X) * 4 + 3] : 0; }
  get(X, Y) { const i = (Y * this.w + X) * 4, d = this.d; return hex(d[i], d[i + 1], d[i + 2]); }
  put(X, Y, c) {
    if (!c || !this.in(X, Y)) return;
    const [r, g, b, a] = typeof c === 'string' ? rgba(c) : c, d = this.d, i = (Y * this.w + X) * 4;
    if (a >= 255 || d[i + 3] === 0) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a; return; }
    if (a <= 0) return;
    const sa = a / 255, da = d[i + 3] / 255, oa = sa + da * (1 - sa);
    d[i] = (r * sa + d[i] * da * (1 - sa)) / oa; d[i + 1] = (g * sa + d[i + 1] * da * (1 - sa)) / oa; d[i + 2] = (b * sa + d[i + 2] * da * (1 - sa)) / oa;
    d[i + 3] = oa * 255;
  }
  erase(X, Y) { if (this.in(X, Y)) this.d.fill(0, (Y * this.w + X) * 4, (Y * this.w + X) * 4 + 4); }
}

// Bút vẽ theo toạ độ bộ thường (k = 1 hoặc 2). Màu là chuỗi hoặc hàm (x, y, X, Y) — x, y tâm điểm ảnh theo đơn vị bộ thường.
function pen(P, k, ox = 0, oy = 0) {
  const col = (c, X, Y) => (typeof c === 'function' ? c((X + 0.5) / k - ox, (Y + 0.5) / k - oy, X, Y) : c);
  const fill = (c, X0, Y0, X1, Y1) => { for (let Y = Y0; Y < Y1; Y++) for (let X = X0; X < X1; X++) P.put(X, Y, col(c, X, Y)); };
  const g = {
    k, P,
    R(c, x, y, w = 1, h = 1) {
      if (k === 1 && (w < 1 || h < 1)) return;
      fill(c, Math.floor((x + ox) * k), Math.floor((y + oy) * k), Math.floor((x + w + ox) * k), Math.floor((y + h + oy) * k));
    },
    E(c, cx, cy, rx, ry) {
      cx += ox; cy += oy;
      for (let Y = Math.floor((cy - ry) * k); Y < Math.ceil((cy + ry) * k); Y++) for (let X = Math.floor((cx - rx) * k); X < Math.ceil((cx + rx) * k); X++) {
        const dx = ((X + 0.5) / k - cx) / rx, dy = ((Y + 0.5) / k - cy) / ry;
        if (dx * dx + dy * dy <= 1) P.put(X, Y, col(c, X, Y));
      }
    },
    // đa giác: điểm có tâm nằm trong [[x, y], ...]
    G(c, pts) {
      pts = pts.map(([x, y]) => [x + ox, y + oy]);
      const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]);
      for (let Y = Math.floor(Math.min(...ys) * k); Y < Math.ceil(Math.max(...ys) * k); Y++) for (let X = Math.floor(Math.min(...xs) * k); X < Math.ceil(Math.max(...xs) * k); X++) {
        const x = (X + 0.5) / k, y = (Y + 0.5) / k;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) P.put(X, Y, col(c, X, Y));
      }
    },
    // nét thẳng dày t (bộ thường tối thiểu 1 điểm)
    L(c, x0, y0, x1, y1, t = 1) {
      x0 += ox; y0 += oy; x1 += ox; y1 += oy;
      const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * k)), T = Math.max(1, Math.round(t * k));
      const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
      for (let i = 0; i <= n; i++) {
        const X = Math.floor((x0 + ((x1 - x0) * i) / n) * k), Y = Math.floor((y0 + ((y1 - y0) * i) / n) * k);
        for (let j = 0; j < T; j++) steep ? P.put(X + j, Y, col(c, X + j, Y)) : P.put(X, Y + j, col(c, X, Y + j));
      }
    },
    // điểm ảnh riêng của bộ 2x (toạ độ 2x tính từ gốc bộ thường)
    hd(fn) { if (k === 2) fn((c, X, Y, w = 1, h = 1) => fill(c, X + ox * 2, Y + oy * 2, X + ox * 2 + w, Y + oy * 2 + h)); },
    // vẽ vào lớp riêng, viền ngoài 1 điểm rồi ghép
    layer(fn, out = OUT) {
      const L = new Pix(P.w, P.h);
      fn(pen(L, k, ox, oy));
      ring(L, out);
      for (let i = 0; i < L.d.length; i += 4) if (L.d[i + 3]) P.put((i / 4) % P.w, Math.floor(i / 4 / P.w), [L.d[i], L.d[i + 1], L.d[i + 2], L.d[i + 3]]);
    },
  };
  return g;
}
function ring(L, col) {
  const { w, h } = L, add = [];
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++)
    if (L.a(X, Y) < 200 && (L.a(X - 1, Y) > 200 || L.a(X + 1, Y) > 200 || L.a(X, Y - 1) > 200 || L.a(X, Y + 1) > 200)) add.push(X, Y);
  for (let i = 0; i < add.length; i += 2) { L.erase(add[i], add[i + 1]); L.put(add[i], add[i + 1], col); }
}
// Bộ 2x: viền mép trên (hứng sáng từ trên) nhạt theo màu bên dưới — chỉ mép trên, không lệch trái/phải
function selTop(P) {
  const O = rgba(OUT), src = new Uint8ClampedArray(P.d), { w, h } = P;
  const isO = (X, Y) => { const i = (Y * w + X) * 4; return src[i + 3] === 255 && src[i] === O[0] && src[i + 1] === O[1] && src[i + 2] === O[2]; };
  const T = (X, Y) => Y < 0 || src[(Y * w + X) * 4 + 3] < 160;
  for (let Y = 0; Y < h - 1; Y++) for (let X = 0; X < w; X++) {
    if (!isO(X, Y) || !T(X, Y - 1) || isO(X, Y + 1) || src[((Y + 1) * w + X) * 4 + 3] < 160) continue;
    const i = ((Y + 1) * w + X) * 4;
    P.erase(X, Y); P.put(X, Y, mix(hex(src[i], src[i + 1], src[i + 2]), OUT, 0.7));
  }
}
// Dựng một cặp ảnh (bộ thường + bộ 2x) trên nền rộng rồi cắt theo khung chung (đơn vị bộ thường) để bộ 2x đúng gấp đôi.
// draw(g) trả về các điểm mốc { tên: [x, y] } (đơn vị bộ thường) → đổi sang toạ độ tính từ giữa đáy ảnh.
const BIG = 160, OFFX = 48, OFFY = 100;
function makePair(draw) {
  const sets = [1, 2].map(k => {
    const P = new Pix(BIG * k, BIG * k), marks = draw(pen(P, k, OFFX, OFFY)) ?? {};
    if (k === 2) selTop(P);
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let Y = 0; Y < P.h; Y++) for (let X = 0; X < P.w; X++) if (P.d[(Y * P.w + X) * 4 + 3]) { x0 = Math.min(x0, X); x1 = Math.max(x1, X + 1); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y + 1); }
    return { P, k, marks, bb: [Math.floor(x0 / k), Math.floor(y0 / k), Math.ceil(x1 / k), Math.ceil(y1 / k)] };
  });
  const bx = sets[0].marks.box; delete sets[0].marks.box;   // khung cố định (vd vũng bùn đúng 22x40)
  const fr = sets[0].marks.frame; delete sets[0].marks.frame;   // khung cỡ cố định [w, h]: giữa ngang theo hình, đáy theo đáy hình
  const [a, b] = bx ? [[bx[0] + OFFX, bx[1] + OFFY, bx[2] + OFFX, bx[3] + OFFY], [bx[0] + OFFX, bx[1] + OFFY, bx[2] + OFFX, bx[3] + OFFY]] : [sets[0].bb, sets[1].bb];
  let X0 = Math.min(a[0], b[0]), Y0 = Math.min(a[1], b[1]), X1 = Math.max(a[2], b[2]), Y1 = Math.max(a[3], b[3]);
  if (fr) { X0 = Math.round((X0 + X1 - fr[0]) / 2); X1 = X0 + fr[0]; Y0 = Y1 - fr[1]; }
  const w = X1 - X0, h = Y1 - Y0;
  const [lo, hi] = sets.map(({ P, k }) => {
    const c = canvas(w * k, h * k), x = c.getContext('2d'), img = x.createImageData(w * k, h * k);
    for (let Y = 0; Y < h * k; Y++) img.data.set(P.d.subarray(((Y + Y0 * k) * P.w + X0 * k) * 4, ((Y + Y0 * k) * P.w + X1 * k) * 4), Y * w * k * 4);
    x.putImageData(img, 0, 0);
    return c;
  });
  const info = { w, h };
  for (const [n, [mx, my]] of Object.entries(sets[0].marks)) info[n] = { x: mx + OFFX - X0 - w / 2, y: my + OFFY - Y0 - h };
  return { lo, hi, info };
}

// ---------- vật liệu: hàm (s, v, X, Y, k) theo toạ độ mặt ----------
// s: dọc theo mặt (đơn vị bộ thường), v: tính từ mép trên mặt xuống.
// Ván ngang (art3.planks / art11.woodH): bộ thường 3 hàng sáng-vừa-tối; bộ 2x tấm 6 điểm, vân, mối nối so le, đinh
function planksM(rp, step = 3, seed = 0, len = 10) {
  return (s, v, X, Y, k) => {
    if (k === 1) {
      const j = mod(Math.floor(v), step), row = Math.floor(v / step);
      if (j === 1 && hash(Math.floor(s / 2) + seed, row) < 0.15) return rp[1];
      return j === 0 ? rp[3] : j === step - 1 ? rp[1] : rp[2];
    }
    const bh = step * 2, Vy = Math.floor(v * 2), row = Math.floor(Vy / bh), j = mod(Vy, bh);
    const Sx = Math.floor(s * 2) + Math.floor(hash(row, seed + 41) * len * 2), u = mod(Sx, len * 2);
    if (j === bh - 1) return rp[0];
    if (j === 0) return rp[3];
    if (u === 0) return rp[1];
    if ((u === 3 || u === len * 2 - 3) && j === bh >> 1) return rp[0];
    if (j === bh - 2) return hash(Sx >> 2, row) < 0.5 ? rp[1] : rp[2];
    const n = hash((Sx >> 2) + seed * 7, Vy);
    return n < 0.15 ? rp[1] : n > 0.93 ? rp[3] : rp[2];
  };
}
// Ván dọc (nhà kho đỏ): bộ thường sọc 3 cột; bộ 2x tấm 6 điểm có khe, vân dọc
function boardsM(rp, seed = 0) {
  return (s, v, X, Y, k) => {
    if (k === 1) { const i = mod(Math.floor(s), 3); return i === 0 ? rp[3] : i === 2 ? rp[1] : rp[2]; }
    const Sx = Math.floor(s * 2), id = Math.floor(Sx / 6), u = mod(Sx, 6), Vy = Math.floor(v * 2);
    if (u === 5) return rp[0];
    if (u === 0) return rp[3];
    if (u === 4) return rp[1];
    const n = hash(id * 13 + seed, (Vy + Math.floor(hash(id, seed) * 9)) >> 2);
    return n < 0.18 ? rp[1] : n > 0.92 ? rp[3] : rp[2];
  };
}
// Gạch (art3 pig): bộ thường hàng 2, viên 4, mạch vữa; bộ 2x viên 8×4 mỗi viên một sắc
function bricksM(rp, mortar1, mortar2, seed = 0, topLight = true) {
  return (s, v, X, Y, k) => {
    if (k === 1) {
      const j = Math.floor(v), row = j >> 1, off = mod(Math.floor(s) + (row % 2) * 2, 4);
      return (j & 1) === 1 || off === 0 ? mortar1 : (topLight && j < 2 ? rp[3] : rp[2]);
    }
    const Vy = Math.floor(v * 2), row = Math.floor(Vy / 4), j = mod(Vy, 4), Sx = Math.floor(s * 2) + (row & 1) * 4, u = mod(Sx, 8), id = Math.floor(Sx / 8);
    if (j === 3 || u === 7) return mortar2;
    const n = hash(id * 7 + seed, row * 13 + seed);
    let q = n < 0.22 ? 1 : n > 0.84 ? 3 : 2;
    if (j === 0) q = Math.min(3, q + 1); else if (j === 2) q = Math.max(0, q - 1);
    if (hash(X * 3 + seed, Y * 5) < 0.05) q = Math.max(0, q - 1);
    if (topLight && Vy < 1) return rp[3];
    return rp[q];
  };
}
// Đá xếp (chân tường heo cấp 3)
function stonesM(rp, mortar, seed = 0) {
  return (s, v, X, Y, k) => {
    const sc = k === 1 ? 1 : 2, bh = k === 1 ? 2.5 : 5;
    const yy = v * sc, row = Math.floor(yy / bh), j = yy - row * bh;
    if (j >= bh - (k === 1 ? 1 : 1)) return mortar;
    let x = -Math.floor(hash(row, seed + 3) * 11), id = 0, u = 0, wdt = 0;
    const xx = Math.floor(s * sc);
    for (;;) { wdt = (k === 1 ? 3 : 6) + Math.floor(hash(row * 31 + id, seed) * (k === 1 ? 3 : 6)); if (xx < x + wdt) { u = xx - x; break; } x += wdt; id++; }
    if (u === wdt - 1) return mortar;
    const n = hash(id * 11 + row, seed + 7);
    let q = n < 0.25 ? 1 : n > 0.8 ? 3 : 2;
    if (j < 1) q = Math.min(3, q + 1);
    return rp[q];
  };
}
// Tre: thanh tre chạy theo s, rộng 2 đơn vị, đốt tre lệch nhau
function bambooM(seed = 0) {
  return (s, v, X, Y, k) => {
    if (k === 1) { const u = mod(Math.floor(s), 2); return v < 1 ? BAMBOO[3] : u === 0 ? BAMBOO[2] : BAMBOO[1]; }
    const Sx = Math.floor(s * 2), u = mod(Sx, 4), pole = Math.floor(Sx / 4), Vy = Math.floor(v * 2);
    const node = 3 + Math.floor(hash(pole, seed) * 6);
    if (Vy === node) return BAMBOO[0];
    if (Vy === node + 1) return BAMBOO[3];
    return BAMBOO[u === 0 ? 3 : u === 3 ? 1 : 2];
  };
}
// Ngói (art3.tiles / art11.tileTex) trên mái: a dọc bờ nóc, b từ bờ nóc xuống diềm
function tileM(rp, seed = 0) {
  const hi = mix(rp[3], '#ffffff', 0.45);
  return (a, b, X, Y, k, Lb) => {
    if (k === 1) {
      const ry = Math.floor(b);
      if (ry === 0) return rp[1];
      if (b > Lb - 1) return rp[0];
      const band = Math.floor((ry - 1) / 3), q = (ry - 1) % 3, ox = mod(Math.floor(a) + (band % 2) * 2 + seed, 4);
      if (ox === 0 && q < 2) return rp[1];
      return q === 0 ? rp[3] : q === 2 ? (ox === 0 ? rp[0] : rp[1]) : rp[2];
    }
    const Vy = Math.floor(b * 2);
    if (Vy === 0) return rp[1];
    if (Vy === 1) return rp[3];
    if (b > Lb - 0.5) return rp[0];
    if (b > Lb - 1) return rp[1];
    const rr = Vy - 2, row = Math.floor(rr / 6), v = mod(rr, 6), xo = Math.floor(a * 2) + (row & 1) * 4 + seed * 3, u = mod(xo, 8), id = Math.floor(xo / 8);
    let q;
    if (v === 0) q = 0;
    else if (v === 5) q = u === 0 ? 1 : 2;
    else if (v === 4) q = u === 0 ? 2 : 3;
    else q = u === 0 ? 1 : (u === 1 && v <= 2) ? 3 : 2;
    const n = hash(id * 5 + seed, row * 11 + 3);
    if (q === 2 && n < 0.16 && v > 0 && v < 4) return mix(rp[2], rp[1], 0.45);
    if (q === 3 && v === 4 && u === 2 && n > 0.7) return hi;
    return rp[q];
  };
}
// Rạ (art3.thatch / art11.roofThatch): lớp rạ song song bờ nóc, sợi rạ chạy xuống theo mái
function thatchM(seed = 0) {
  return (a, b, X, Y, k, Lb) => {
    if (k === 1) {
      if (b > Lb - 1) return THATCH[0];
      const band = Math.floor(b / 3), q = Math.floor(b) % 3, n = hash(Math.floor(a) + seed, band);
      let i = q === 0 ? 3 : q === 2 ? 1 : 2;
      if (mod(Math.floor(a) + band * 2, 3) === 0) i--;
      if (n < 0.12) i = 4;
      return THATCH[Math.max(0, i)];
    }
    if (b > Lb - 0.5) return THATCH[0];
    const Ln = 6, Ax = Math.floor(a * 2), rr = Math.floor(b * 2), jag = Math.floor(hash(Ax + seed * 7, Math.floor(rr / Ln) + 5) * 2.2);
    const li = Math.floor((rr + jag) / Ln), q = (rr + jag) % Ln, st = hash(Ax + seed + li * 13, li + 9);
    let v = 2.4 + (q < 2 ? 0.8 : 0) - (q === Ln - 1 ? 1.9 : q === Ln - 2 ? 0.8 : 0);
    if (st < 0.22) v -= 0.8; else if (st > 0.86) v += 0.9;
    if (b > Lb - 1) v = 1;
    return THATCH[Math.max(0, Math.min(4, Math.round(v)))];
  };
}
// Rơm (ổ, đống rơm): sợi ngắn
function strawT(rp, seed = 0) {
  return (x, y, X, Y) => { const n = hash(Math.floor((X + hash(Y, seed) * 9) / 5) + seed, Y); return rp[n < 0.14 ? 1 : n > 0.9 ? 4 : n > 0.7 ? 3 : 2]; };
}
const glassT = (x0, y0) => (x, y, X, Y) => { const d = mod(X - Y, 9); return d === 2 ? GLASS[3] : y - y0 < 1 ? GLASS[2] : GLASS[1]; };

// ---------- chi tiết ----------
function shadowPoly(g, pts, a = 0.28) { g.G(`rgba(34,22,10,${a})`, pts); }
function shadowE(g, cx, cy, rx, ry, a = 0.28) { g.E(`rgba(34,22,10,${a})`, cx, cy, rx, ry); }
// cột đứng (sáng giữa, không lệch trái phải)
function post(g, rp, x, y0, y1, w = 3) {
  g.layer(L => {
    L.R(rp[2], x + 1, y0, w - 2, y1 - y0 - 1);
    L.hd(N => { for (let Y = Math.round((y0 + 0) * 2); Y < Math.round((y1 - 1) * 2); Y++) { N(rp[3], Math.round((x + 1) * 2), Y, 1, 1); N(rp[1], Math.round((x + w - 1) * 2) - 1, Y, 1, 1); } });
  });
  g.R(rp[3], x + 1, y0, w - 2, 0.5);
}
function strawPile(g, cx, cy, rx, ry) {
  g.E(OUT, cx, cy, rx + 1, ry + 1);
  g.E(strawT(THATCH, cx * 3 + cy), cx, cy, rx, ry);
  g.E((x, y, X, Y) => (hash(X, Y * 3) < 0.25 ? THATCH[4] : THATCH[3]), cx, cy - 0.5, rx - 1.2, Math.max(0.6, ry - 0.8));
  for (let i = 0; i < rx * 2; i++) {
    const px = cx - rx + 0.5 + hash(i, cy * 7) * (rx * 2 - 1), py = cy - ry + 0.5 + hash(cx * 5, i) * (ry * 2 - 1);
    g.R(hash(i, 3) < 0.5 ? THATCH[4] : THATCH[1], Math.floor(px * 2) / 2, Math.floor(py * 2) / 2, g.k === 1 ? 2 : 1.5, g.k === 1 ? 1 : 0.5);
  }
}

// ---------- nhà nhìn đầu hồi, mái lùi về sau-trái ----------
// Gốc toạ độ: góc dưới-trái đầu hồi ở mặt đất (0, 0); vách ở y < 0.
// S: W (rộng đầu hồi), H (cao vách), T (cao tam giác hồi), D (sâu: số hàng mái lùi, lùi D/2 cột sang trái),
// E (nhà sàn: cao gầm), eaveL / eaveR (chìa mái hai bên), roof: { m: vật liệu mái }, front / side / gable: vật liệu vách,
// open(g, geo): lán không vách; under: vẽ trước nhà; deco: chi tiết vách (trước khi lợp mái); top: chi tiết sau cùng.
function house(g, S) {
  const { W, H, T, D, E = 0, eaveL = 1, eaveR = 2, fo = 2 } = S, fx = 0, fy = 0;
  const by = fy - E, dx = -D * SK, dy = -D;
  const add = p => [p[0] + dx, p[1] + dy];
  const F0 = [fx, by], F1 = [fx + W, by], Ft0 = [fx, by - H], Ft1 = [fx + W, by - H], A = [fx + W / 2, by - H - T];
  const ryL = Math.round((T * 2 * eaveL) / W), ryR = Math.round((T * 2 * eaveR) / W);
  // mái nhô ra trước / sau fo hàng (fo/2 cột) theo chiều sâu
  const fwd = p => [p[0] + fo * SK, p[1] + fo];
  const Af = fwd(A), Elf = fwd([fx - eaveL, by - H + ryL]), Erf = fwd([fx + W + eaveR, by - H + ryR]);
  const Dr = D + 2 * fo, back = p => [p[0] - Dr * SK, p[1] - Dr];
  // điểm trên vách hông trái: u lùi theo chiều sâu (hàng, 0 = mép trước), h cao tính từ chân vách
  const side = (u, h) => [fx - u * SK, by - h - u];
  const geo = { F0, F1, Ft0, Ft1, A, Af, Elf, Erf, side, by, fy, fx, W, H, T, D, E, back };

  shadowPoly(g, [[fx - 1, fy + 1.5], [fx + W + 1.5, fy + 1.5], [fx + W + 1.5 + dx, fy + 1.5 + dy], [fx - 1.5 + dx, fy + 1 + dy]]);
  if (S.under) S.under(g, geo);
  if (S.open) S.open(g, geo);
  else {
    const sideM = S.side, fm = S.front, gm = S.gable ?? S.front;
    // vách hông trái: s = u (dọc chiều sâu), v tính từ mép trên vách
    g.layer(L => L.G((x, y, X, Y) => { const u = (fx - x) / SK; return sideM(u, y - (by - H - u), X, Y, g.k); }, [F0, Ft0, add(Ft0), add(F0)]));
    g.layer(L => {
      L.G((x, y, X, Y) => fm(x - fx, y - (by - H), X, Y, g.k), [F0, F1, Ft1, Ft0]);
      L.G((x, y, X, Y) => gm(x - fx, y - (by - H), X, Y, g.k), [Ft0, Ft1, A]);
    });
    if (S.deco) S.deco(g, geo);
  }
  // mái: hai mái cùng sắc độ (sáng từ trên); mái phải vẽ trước, mái trái phủ lên
  const rm = S.roof.m;
  const slope = E0 => {
    const e1 = [-Dr * SK, -Dr], e2 = [E0[0] - Af[0], E0[1] - Af[1]], det = e1[0] * e2[1] - e1[1] * e2[0], Lb = Math.hypot(e2[0], e2[1]);
    g.layer(L => L.G((x, y, X, Y) => {
      const px = x - Af[0], py = y - Af[1], t = (px * e2[1] - py * e2[0]) / det, s = (e1[0] * py - e1[1] * px) / det;
      return rm(t * Dr, s * Lb, X, Y, g.k, Lb);
    }, [Af, E0, back(E0), back(Af)]));
  };
  slope(Erf);
  slope(Elf);
  if (S.top) S.top(g, geo);
  return geo;
}

// tứ giác trên vách hông: u0..u1 dọc chiều sâu, h0..h1 cao từ chân vách
const sideQuad = (o, u0, u1, h0, h1) => [o.side(u0, h0), o.side(u1, h0), o.side(u1, h1), o.side(u0, h1)];
// toạ độ trên vách hông của điểm (x, y): [u, h]
const sideUV = (o, x, y) => { const u = (o.fx - x) / SK; return [u, o.by - y - u]; };
// lỗ cửa tối trên vách hông, ngưỡng sáng, khung viền
function sideDoor(g, o, u0, u1, h, fillc = DARK_IN, deep = '#120804') {
  g.layer(L => L.G((x, y) => {
    const [, hh] = sideUV(o, x, y);
    if (hh > h - 1.5) return deep;
    if (hh < 1) return '#3a2414';
    if (g.k === 2 && hh < 1.5) return '#4e3420';
    return fillc;
  }, sideQuad(o, u0, u1, 0, h)));
}
// cầu thang gà: từ ngưỡng cửa hông (u0..u1) xuống đất, chạy sang trái len cột
function henRampL(g, o, u0, u1, len) {
  const P0 = o.side(u0, 0), P1 = o.side(u1, 0), drop = o.E;
  const Q0 = [P0[0] - len, P0[1] + drop], Q1 = [P1[0] - len, P1[1] + drop];
  g.layer(L => L.G((x, y) => {
    const f = mod((P0[0] - x) / 2 + 0.25, 1);
    if (f < (g.k === 1 ? 0.5 : 0.25)) return WOOD[0];
    if (g.k === 2 && f < 0.5) return WOOD[3];
    return WOOD[2];
  }, [P0, P1, Q1, Q0]));
  return [(Q0[0] + Q1[0]) / 2, (Q0[1] + Q1[1]) / 2];
}
// cột góc nhà sàn: sau-trái và sau-phải (chân ở hàng -D), trước-trái và trước-phải
function stilts(g, o, rp, front) {
  const d = o.D;
  if (!front) {
    post(g, rp, o.fx - d * SK, o.by - d - 0.5, o.fy - d + 0.5);
    post(g, rp, o.fx + o.W - 3 - d * SK, o.by - d - 0.5, o.fy - d + 0.5);
    post(g, rp, o.fx - d * SK / 2, o.by - d / 2 - 0.5, o.fy - d / 2 + 0.5);
  } else {
    post(g, rp, o.fx, o.by - 0.5, o.fy + 0.5);
    post(g, rp, o.fx + o.W - 3, o.by - 0.5, o.fy + 0.5);
  }
}

// ---------- chuồng gà ----------
function coopSide(t) {
  if (t === 0) return g => {
    let foot;
    const o = house(g, {
      W: 14, H: 9, T: 5, D: 12, E: 7, eaveL: 1, eaveR: 3,
      side: bambooM(2), front: bambooM(1), roof: { m: thatchM(3) },
      under: (g, o) => stilts(g, o, BAMBOO, false),
      deco: (g, o) => {
        g.R(BAMBOO[0], o.fx, o.by - 1, o.W, 1);
        g.L('#8a5a2b', o.fx, o.by - 6.5, o.fx + o.W - 0.5, o.by - 6.5, 0.5);
        sideDoor(g, o, 2.5, 8.5, 6);
        stilts(g, o, BAMBOO, true);
      },
      top: (g, o) => { foot = henRampL(g, o, 4, 7, 7); strawPile(g, o.fx + 6, o.fy - 1, 3, 1.4); },
    });
    return { door: o.side(5.5, 0), rampFoot: foot };
  };
  if (t === 1) return g => {
    let foot;
    const o = house(g, {
      W: 16, H: 10, T: 6, D: 12, E: 6, eaveL: 1, eaveR: 2,
      side: planksM(dim(WOOD), 3, 1), front: planksM(WOOD, 3, 2), roof: { m: tileM(TILE, 0) },
      under: (g, o) => stilts(g, o, WOOD, false),
      deco: (g, o) => {
        sideDoor(g, o, 2, 9, 7);
        // ổ đẻ có rơm thò ra trên đầu hồi
        const x0 = o.fx + 5, y0 = o.by - 7;
        g.layer(L => { L.R('#2a1608', x0, y0, 6, 4); L.R('#1a0c04', x0, y0, 6, 1); L.R(strawT(THATCH, 5), x0, y0 + 2, 6, 2); L.R(THATCH[4], x0 + 1, y0 + 2, 2, 0.5); L.R('#fff4e0', x0 + 3, y0 + 1, 2, 1); L.R('#ffffff', x0 + 3, y0 + 1, 0.5, 0.5); L.R('#e8d8b8', x0 + 3, y0 + 2, 2, 0.5); });
        stilts(g, o, WOOD, true);
      },
      top: (g, o) => {
        g.layer(L => { L.R(WOOD[3], o.Af[0] - 1, o.Af[1] - 1.5, 2, 1); L.R('#fff0c8', o.Af[0] - 1, o.Af[1] - 1.5, 1, 0.5); });   // chóp nóc
        foot = henRampL(g, o, 4, 7, 8);
        strawPile(g, o.fx + 13, o.fy - 0.5, 3, 1.4);
      },
    });
    return { door: o.side(5.5, 0), rampFoot: foot };
  };
  return g => {
    let foot;
    const o = house(g, {
      W: 18, H: 11, T: 7, D: 12, E: 6, eaveL: 1, eaveR: 2,
      side: planksM(dim(CREAM, 0.12), 3, 3, 200), front: planksM(CREAM, 3, 4, 200), roof: { m: tileM(BLUE_TILE, 1) },
      under: (g, o) => {
        stilts(g, o, WOOD, false);
        // ổ cát tắm bên phải
        const x0 = o.fx + o.W + 1, y0 = o.fy - 7;
        g.layer(L => {
          L.R(WOOD[2], x0, y0, 9, 7); L.R(WOOD[3], x0, y0, 9, 0.5);
          L.R((x, y, X, Y) => { const n = hash(X * 3, Y * 5); return n < 0.2 ? '#c8a860' : n > 0.86 ? '#fff0c0' : '#ecd394'; }, x0 + 1, y0 + 1, 7, 4);
          L.R('#b89850', x0 + 1, y0 + 1, 7, 0.5); L.R('#b89850', x0 + 2, y0 + 3, 3, 0.5); L.R('#fff0c0', x0 + 5, y0 + 3.5, 2, 0.5);
        });
      },
      deco: (g, o) => {
        sideDoor(g, o, 2, 9, 8);
        // diềm cửa đỏ
        g.layer(L => L.G('#e5452f', sideQuad(o, 1.5, 9.5, 8, 9)));
        g.hd(N => { const p = o.side(2, 8.75), q = o.side(9, 8.75); for (let i = 0; i <= 14; i++) N('#ff7a5a', Math.floor((p[0] + (q[0] - p[0]) * i / 14) * 2), Math.floor((p[1] + (q[1] - p[1]) * i / 14) * 2), 1, 1); });
        // đầu hồi: cửa sổ tròn, chậu hoa
        const cx = o.fx + o.W / 2, cy = o.by - 6.5;
        g.E(OUT, cx, cy, 2.9, 2.9); g.E(glassT(cx - 2, cy - 2), cx, cy, 2.1, 2.1);
        g.R(OUT, cx - 0.5, cy - 2, 1, 4); g.R(OUT, cx - 2, cy - 0.5, 4, 1);
        g.layer(L => { L.R(LEAF[2], cx - 3, o.by - 3, 6, 1.5); L.R(LEAF[4], cx - 3, o.by - 3, 2, 0.5); L.R('#c0603e', cx - 3, o.by - 1.5, 6, 1); });
        g.R('#e5452f', cx - 2, o.by - 4, 1, 1); g.R('#f7d547', cx + 1, o.by - 4, 1, 1);
        post(g, WOOD, o.fx, o.by - o.H, o.fy + 0.5);
        post(g, WOOD, o.fx + o.W - 3, o.by - o.H, o.fy + 0.5);
      },
      top: (g, o) => {
        // chong chóng gà trên đỉnh hồi
        g.layer(L => { L.R(IRON[2], o.Af[0] - 0.5, o.Af[1] - 4, 1, 3); });
        g.layer(L => { L.R('#f7d547', o.Af[0] - 2.5, o.Af[1] - 5, 5, 1); L.R('#d19a1c', o.Af[0] - 2.5, o.Af[1] - 4.5, 5, 0.5); L.R('#e5452f', o.Af[0] - 2.5, o.Af[1] - 6, 1, 1); });
        foot = henRampL(g, o, 4, 8, 8);
      },
    });
    return { door: o.side(5.5, 0), rampFoot: foot };
  };
}

// ---------- chuồng heo ----------
function pigSide(t) {
  if (t === 0) return g => {
    const o = house(g, {
      W: 16, H: 9, T: 5, D: 14, eaveL: 1, eaveR: 2,
      roof: { m: thatchM(7) },
      open: (g, o) => {
        const d = [-o.D * SK, -o.D], sh = p => [p[0] + d[0], p[1] + d[1]];
        // gầm tối: vách trong phía sau và bên phải
        g.G('#1a0e06', [sh(o.F0), sh(o.F1), sh(o.Ft1), sh(o.Ft0)]);
        g.G('#2a1a10', [o.F1, o.Ft1, sh(o.Ft1), sh(o.F1)]);
        g.G('#3a2414', [[o.fx + 1, o.by], [o.fx + o.W - 1, o.by], [o.fx + o.W - 1 + d[0], o.by + d[1]], [o.fx + 1 + d[0], o.by + d[1]]]);
        post(g, WOOD, o.fx - o.D * SK, o.by - o.D - o.H, o.by - o.D + 0.5);
        post(g, WOOD, o.fx + o.W - 3 - o.D * SK, o.by - o.D - o.H, o.by - o.D + 0.5);
        strawPile(g, o.fx + 4, o.by - 6, 5, 1.6);
        post(g, WOOD, o.fx, o.by - o.H, o.by + 0.5);
        post(g, WOOD, o.fx + o.W - 3, o.by - o.H, o.by + 0.5);
      },
    });
    return { door: o.side(o.D / 2, 0) };
  };
  if (t === 1) return g => {
    const o = house(g, {
      W: 18, H: 11, T: 6, D: 14, eaveL: 1, eaveR: 2,
      side: bricksM(dim(BRICK, 0.12), mix('#8e4028', '#2a160a', 0.12), '#6a2c1a', 2, false),
      front: bricksM(BRICK, '#8e4028', '#7a3420', 3), gable: bricksM(BRICK, '#8e4028', '#7a3420', 3, false),
      roof: { m: tileM(TILE, 2) },
      deco: (g, o) => {
        sideDoor(g, o, 2, 12, 8, '#24140c', '#140a04');   // lối vào lớn quay sang trái
        strawPile(g, o.fx - 4, o.by - 2.5, 4, 1.4);          // rơm lót tràn ra cửa
      },
    });
    return { door: o.side(7, 0) };
  };
  const STN = ['#5e5a62', '#76727a', '#8a868e', '#a8a4ac'];
  return g => {
    const o = house(g, {
      W: 20, H: 13, T: 7, D: 14, eaveL: 1, eaveR: 2,
      side: (s, v, X, Y, k) => (v > 9 ? stonesM(dim(STN, 0.1), '#4e4a52', 3)(s, v - 9, X, Y, k) : bricksM(dim(CBRICK, 0.1), '#c8b8a0', '#c4b49c', 5, false)(s, v, X, Y, k)),
      front: (s, v, X, Y, k) => (v > 9 ? stonesM(STN, '#4e4a52', 4)(s, v - 9, X, Y, k) : bricksM(CBRICK, '#d8c8b0', '#d0c0a8', 5)(s, v, X, Y, k)),
      gable: bricksM(CBRICK, '#d8c8b0', '#d0c0a8', 5, false),
      roof: { m: tileM(GREEN_TILE, 3) },
      under: (g, o) => {
        // vũng bùn trước-phải
        const cx = o.fx + o.W + 1, cy = o.fy - 2;
        g.E(OUT, cx, cy, 6, 3.4); g.E(MUD[1], cx, cy, 5.4, 2.8);
        g.E((x, y, X, Y) => (hash(X, Y) < 0.2 ? MUD[1] : MUD[2]), cx - 1, cy - 0.5, 3, 1.3);
        g.R(MUD[3], cx - 3.5, cy - 1.5, 2, 0.5); g.R('#9ad0f0', cx + 1.5, cy + 0.5, 1.5, 0.5); g.R('#cfeaff', cx + 1.5, cy + 0.5, 0.5, 0.5);
      },
      deco: (g, o) => {
        sideDoor(g, o, 2, 12, 9, '#24140c', '#140a04');
        // biển tên hình heo trên đầu hồi
        { const cx = o.fx + o.W / 2, yy = o.by - o.H - 3; g.layer(L => { L.R('#f6efd8', cx - 3, yy, 6, 2); L.R('#f4a4b8', cx - 2, yy + 0.5, 3, 1); L.R('#d8728c', cx + 1, yy + 0.5, 1, 1); }); }
        strawPile(g, o.fx - 4, o.by - 3, 4, 1.4);
        // máng đá trước đầu hồi
        g.layer(L => { L.R(STONE[3], o.fx + 11, o.by - 3, 7, 1); L.R(STONE[4], o.fx + 11, o.by - 3, 7, 0.5); L.R(STONE[1], o.fx + 11, o.by - 2, 7, 2); L.R('#d9b13a', o.fx + 12, o.by - 2, 5, 1); L.R('#f0d060', o.fx + 12, o.by - 2, 3, 0.5); });
      },
    });
    return { door: o.side(7, 0) };
  };
}

// ---------- chuồng lớn bò cừu ----------
function barnDoorSide(g, o, u0, u1, h) {
  g.layer(L => L.G((x, y, X, Y) => {
    const [u, hh] = sideUV(o, x, y), U = (u - u0) / (u1 - u0), V = hh / h, th = g.k === 1 ? 0.07 : 0.06;
    if (U < th * 1.2 || U > 1 - th * 1.2 || V > 1 - th || Math.abs(U - 0.5) < th * 0.7) return '#f3ead2';
    if (Math.abs(U - V) < th * 1.4 || Math.abs(U - (1 - V)) < th * 1.4) return '#f3ead2';
    return boardsM(['#6e2016', '#7e2418', '#8e3024', '#a83c2c'], 7)(u, hh, X, Y, g.k);
  }, sideQuad(o, u0, u1, 0, h)));
}
function loft(g, o, w, h) {
  const x0 = o.fx + o.W / 2 - w / 2, y0 = o.by - o.H - h + 1;
  g.layer(L => { L.R('#2a1608', x0, y0, w, h - 1); L.R('#1a0c04', x0, y0, w, 1); L.R(strawT(THATCH, 3), x0, y0 + h - 3, w, 2); L.R(THATCH[4], x0 + 1, y0 + h - 3, 2, 0.5); });
}
function barnSide(t) {
  if (t === 0) return g => {
    const o = house(g, {
      W: 18, H: 11, T: 6, D: 16, eaveL: 1, eaveR: 2,
      roof: { m: thatchM(11) },
      open: (g, o) => {
        g.G('rgba(34,22,10,0.22)', [[o.fx, o.by], [o.fx + o.W, o.by], [o.fx + o.W - o.D * SK, o.by - o.D], [o.fx - o.D * SK, o.by - o.D]]);
        post(g, BAMBOO, o.fx - o.D * SK, o.by - o.D - o.H, o.by - o.D + 0.5);
        post(g, BAMBOO, o.fx + o.W - 3 - o.D * SK, o.by - o.D - o.H, o.by - o.D + 0.5);
        strawPile(g, o.fx + 6, o.by - 8, 4, 1.4);
        post(g, BAMBOO, o.fx - o.D * SK / 2, o.by - o.D / 2 - o.H, o.by - o.D / 2 + 0.5);
        strawPile(g, o.fx + 9, o.by - 2.5, 5, 1.6);
        // thanh ngang dọc hông trái và đầu hồi
        const p = o.side(0, 3), q = o.side(o.D, 3);
        g.layer(L => L.G(BAMBOO[2], [[p[0], p[1] - 1], [p[0], p[1]], [q[0], q[1]], [q[0], q[1] - 1]]));
        post(g, BAMBOO, o.fx, o.by - o.H, o.by + 0.5);
        post(g, BAMBOO, o.fx + o.W - 3, o.by - o.H, o.by + 0.5);
        g.layer(L => { L.R(BAMBOO[2], o.fx + 3, o.by - 4, o.W - 6, 1); L.R(BAMBOO[3], o.fx + 3, o.by - 4, o.W - 6, 0.5); });
      },
    });
    return { door: o.side(o.D / 2, 0) };
  };
  if (t === 1) return g => {
    const o = house(g, {
      W: 22, H: 14, T: 8, D: 16, eaveL: 1, eaveR: 2,
      side: boardsM(dim(BARN_RED), 4), front: boardsM(BARN_RED, 5), roof: { m: tileM(BARN_ROOF, 4) },
      deco: (g, o) => { barnDoorSide(g, o, 2, 14, 10); loft(g, o, 6, 7); },
    });
    return { door: o.side(8, 0) };
  };
  const trimmed = rp => (s, v, X, Y, k) => (v < 1 || v > 14.5 ? (v < 0.5 && k === 2 ? '#fffaf0' : '#f3ead2') : boardsM(rp, 6)(s, v, X, Y, k));
  return g => {
    const o = house(g, {
      W: 24, H: 16, T: 9, D: 18, eaveL: 1, eaveR: 2,
      side: trimmed(dim(BARN_RED)), front: trimmed(BARN_RED), gable: boardsM(BARN_RED, 8), roof: { m: tileM(BARN_ROOF, 6) },
      under: (g, o) => {
        // máng cỏ bên phải đầu hồi
        const x0 = o.fx + o.W + 1, y0 = o.fy - 12;
        g.layer(L => { for (let i = 0; i < 5; i++) { L.R(WOOD[2], x0 + i * 2, y0 + 1, 1, 6); L.R(WOOD[3], x0 + i * 2, y0 + 1, 0.5, 6); } });
        strawPile(g, x0 + 4.5, y0 + 1, 4, 2);
        g.layer(L => { L.R(planksM(WOOD, 2, 3, 20), x0, y0 + 7, 10, 4); L.R(WOOD[0], x0, y0 + 10, 10, 1); L.R(LEAF[3], x0 + 1, y0 + 6, 2, 1); L.R(LEAF[4], x0 + 7, y0 + 6, 1, 1); });
      },
      deco: (g, o) => {
        barnDoorSide(g, o, 2, 15, 12);
        // cửa sổ vách hông phía sau cửa lớn
        g.layer(L => L.G((x, y) => { const [u, h] = sideUV(o, x, y); return Math.abs(u - 17) < 0.6 ? '#f3ead2' : h > 9.4 ? GLASS[2] : GLASS[1]; }, sideQuad(o, 15.5, 18.5, 7, 10.5)));
        // đầu hồi: hai cửa sổ + ô cỏ khô
        for (const wx of [o.fx + 3, o.fx + o.W - 8]) g.layer(L => { L.R(glassT(wx, o.by - 10), wx, o.by - 10, 5, 4); L.R(OUT, wx + 2, o.by - 10, 1, 4); L.R('#f3ead2', wx + 2.5, o.by - 10, 0.5, 4); L.R('#f3ead2', wx - 0.5, o.by - 5.5, 6, 1); });
        loft(g, o, 7, 8);
      },
      top: (g, o) => {
        g.layer(L => L.R(IRON[2], o.Af[0] - 0.5, o.Af[1] - 6, 1, 5));
        g.layer(L => { L.R('#d19a1c', o.Af[0] - 3.5, o.Af[1] - 6, 7, 1); L.R('#f7d547', o.Af[0] - 3.5, o.Af[1] - 6, 3, 0.5); });
      },
    });
    return { door: o.side(8.5, 0) };
  };
}

function quarantineSide() {
  return g => {
    const o = house(g, {
      W: 16, H: 11, T: 6, D: 10, eaveL: 1, eaveR: 2,
      side: planksM(dim(WHITE, 0.14), 3, 1, 200), front: planksM(WHITE, 3, 2, 200), roof: { m: tileM(Q_TILE, 5) },
      deco: (g, o) => {
        // cửa xanh xám trên vách hông: ô kính, tay nắm vàng
        g.layer(L => L.G((x, y, X, Y) => {
          const [u, h] = sideUV(o, x, y);
          if (h > 5.5 && h < 7.5 && u > 2.6 && u < 6.4) return GLASS[1];
          if (h > 3.4 && h < 4.4 && u > 6 && u < 7.4) return '#f7d547';
          return boardsM(['#3e5a4c', '#4a6a5a', '#5a7a6a', '#7a9a8a'], 2)(u, h, X, Y, g.k);
        }, sideQuad(o, 1.5, 8.5, 0, 9)));
        // bảng chữ thập xanh trên đầu hồi
        const cx = o.fx + o.W / 2;
        g.layer(L => {
          L.R('#ffffff', cx - 3.5, o.by - 9, 7, 7); L.R('#dfe8e4', cx - 3.5, o.by - 2.5, 7, 0.5);
          L.R('#2f9a4a', cx - 1.5, o.by - 8, 3, 5); L.R('#2f9a4a', cx - 2.5, o.by - 7, 5, 3);
          L.R('#5fd07a', cx - 1.5, o.by - 8, 3, 0.5); L.R('#1e7a3a', cx - 1.5, o.by - 3.5, 3, 0.5);
        });
      },
      top: (g, o) => { g.R('#e8f8ec', o.Af[0] - 1, o.Af[1] + 1, 2, 1); g.R('#2f9a4a', o.Af[0] - 0.5, o.Af[1] + 1, 1, 1); },
    });
    return { door: o.side(5, 0) };
  };
}

// ---------- ổ rơm thuôn dọc, vành trái thấp (gà vào từ trái), vành phải cao ----------
function nestSide(withEgg) {
  return g => {
    shadowE(g, 6, 13, 6, 1.8);
    g.E(OUT, 6, 7.5, 5.5, 6.5);
    g.E(strawT(NEST, 4), 6, 7.5, 4.5, 5.5);
    // lòng ổ tối lệch trái (vành trái thấp, nhìn thấy lòng ổ)
    g.E('#6a4e18', 5, 7.5, 3, 4.2);
    g.E('#8a6a20', 4.6, 8, 2.4, 3.4);
    // vành phải dựng cao: rơm sáng, sợi chạy dọc
    g.G((x, y, X, Y) => (hash(X, Y >> 1) < 0.2 ? NEST[5] : y < 5 ? NEST[4] : NEST[3]), [[8, 2], [10, 3], [11, 7], [10.5, 11], [8.5, 12.5], [8.5, 7]]);
    g.hd(N => { for (let i = 0; i < 8; i++) N(NEST[2], 18 + (i % 3), 6 + i * 2.2 | 0, 1, 2); });
    if (withEgg) { g.E('#6b4a2a', 5, 7, 2.2, 2.8); g.E('#fff8ea', 5, 7, 1.6, 2.2); g.R('#ffffff', 4, 5.5, 1, 1); g.hd(N => N('#ece0c8', 10, 16, 3, 1)); }
    // vành trước thấp, rơm tràn ra bên trái
    g.R(NEST[3], 2, 12, 8, 1); g.R(NEST[4], 3, 12, 5, 0.5);
    g.R('#5c3a1a', 3, 13, 6, 1);
    for (const [sx, sy] of [[0, 6], [0, 9], [-1, 11], [1, 3], [1, 12]]) { g.R(NEST[4], sx, sy, 1.5, 1); g.R(NEST[2], sx + 0.5, sy + 0.5, 1, 0.5); }
    return {};
  };
}

// ---------- máng ăn nằm dọc (1 ô ngang × 2 ô dọc) ----------
function troughV() {
  return g => {
    g.layer(L => {
      L.R(WOOD[1], 0, 1, 12, 21);   // mặt trên: hai thành ván dọc + lòng máng
      L.R(planksM(WOOD, 3, 3, 30), 0, 22, 12, 5);   // đầu máng (mặt đứng gần người xem)
    });
    g.R(WOOD[3], 0, 1, 12, 0.5);
    for (const x of [1, 10]) { g.R(WOOD[2], x, 1.5, 1, 20.5); g.R(WOOD[3], x, 1.5, 0.5, 20.5); }
    g.R('#a87a20', 2, 2, 8, 20);
    g.R((x, y, X, Y) => { const n = hash(X * 3, Y * 7); return n < 0.15 ? '#c9a13a' : n < 0.3 ? '#a87a20' : n > 0.85 ? '#fff0a0' : '#f0cf5a'; }, 2, 3, 8, 18);
    g.R('#fff0a0', 2, 3, 8, 0.5);
    if (g.k === 1) for (let y = 4; y < 21; y += 3) g.R('#c9a13a', 3 + (y % 2) * 3, y, 1, 1);
    g.R('#6b4020', 2, 21, 8, 1);
    g.R(WOOD[0], 1, 25, 10, 1); g.R(WOOD[1], 1, 25.5, 10, 0.5);
    g.hd(N => { for (const X of [3, 20]) { N(IRON[1], X, 46, 1, 1); N(IRON[3], X, 45, 1, 1); } });
    return {};
  };
}

// ---------- cân heo nhìn ngang: bàn cân dọc, cột ở mép sau, mặt đồng hồ quay sang trái ----------
function scaleSide() {
  return g => {
    shadowE(g, 7, 16, 6.5, 1.6);
    g.layer(L => {
      L.R(IRON[2], 1, 8, 12, 6); L.R(IRON[3], 1, 8, 12, 1); L.R(IRON[4], 1, 8, 12, 0.5);   // mặt bàn cân
      L.R(IRON[1], 1, 14, 12, 2); L.R(IRON[0], 1, 15.5, 12, 0.5);                       // mép trước
    });
    if (g.k === 1) { g.R(IRON[1], 2, 10, 10, 1); g.R(IRON[1], 2, 12, 10, 1); }
    g.hd(N => { for (let Y = 19; Y < 28; Y += 3) N(IRON[1], 4, Y, 20, 1); N(IRON[4], 4, 17, 6, 1); });
    // cột
    g.layer(L => { L.R(IRON[3], 7, 4, 2, 5); L.R(IRON[4], 7, 4, 0.5, 5); });
    // đồng hồ: vỏ tròn nhìn xiên, mặt trắng quay sang trái
    g.layer(L => { L.E(IRON[2], 7.5, 3.5, 3, 3.5); L.E('#fffaf0', 6.6, 3.5, 2, 2.6); });
    g.hd(N => { N(IRON[3], 18, 3, 1, 8); });
    g.R('#4c4c58', 6, 1, 1, 0.5); g.R('#4c4c58', 6, 5.5, 1, 0.5); g.R('#4c4c58', 4.5, 3, 0.5, 1);
    g.L('#e5452f', 6.5, 3.5, 5.5, 1.5, 0.5);
    g.R(OUT, 6, 3, 1, 1);
    g.hd(N => N('#ffffff', 10, 3, 1, 1));
    return {};
  };
}

// ---------- vũng bùn dọc (SPR.mud chuyển vị) ----------
function mudV() {
  return g => {
    const W = 22, H = 40;
    g.R((x, y, X, Y) => {
      const k = g.k, dx = (x - W / 2) / (W / 2 + 0.3), dy = (y - H / 2) / (H / 2 + 0.6);
      const ang = Math.atan2(dy, dx), rr = Math.hypot(dx, dy) * (1 + 0.07 * Math.sin(ang * 3 + 2.6) + 0.05 * Math.sin(ang * 5 + 1));
      if (rr > 1) return null;
      const n = hash(X * 7 + 3, Y * 5 + 11);
      if (rr > 0.9) return n < 0.6 ? '#6b4a2a' : null;
      if (rr > 0.78) return k === 2 && n < 0.25 ? '#8a6a44' : '#7a5834';
      if (k === 2) {
        if (n < 0.025) return '#a8845a';
        if (mod(X + Y * 2, 13) === 0 && n < 0.5) return '#4a3018';
        if (hash(X >> 1, Y >> 1) < 0.12) return '#5c3f22';
        return n < 0.4 ? '#6b4a2a' : '#5e4024';
      }
      if (n < 0.03) return '#a8845a';
      if (mod(X + Y * 2, 9) === 0 && n < 0.5) return '#5c3f22';
      return n < 0.4 ? '#6b4a2a' : '#5e4024';
    }, 0, 0, W, H);
    g.hd(N => { N("#9ad0f0", 18, 50, 3, 1); N("#cfeaff", 18, 50, 1, 1); N("#9ad0f0", 24, 28, 2, 1); });
    return { box: [0, 0, W, H] };
  };
}

// ---------- ổ ấp trứng (SPR.coop) nhìn đầu hồi: vách trát kem, mái ngói đỏ, cửa thanh gỗ trên vách hông trái ----------
const PLASTER = ['#d8c49a', '#ecd8b0', '#f4e2bd', '#fff4dc'];
const HUT_TILE = ['#8e2a20', '#b8352b', '#d9483b', '#ef7a6a'];
// Vách trát (art11.plaster): bóng diềm mái ở mép trên, đốm vữa, chân vách lấm đất
function plasterM(rp, H, seed = 0) {
  const eave = mix(rp[2], '#5a3719', 0.35), eave2 = mix(rp[2], '#5a3719', 0.16), dirt = mix(rp[1], '#8a6a44', 0.4);
  return (s, v, X, Y, k) => {
    if (v < 1) return k === 2 && v >= 0.5 ? eave2 : eave;
    if (v > H - (k === 1 ? 1 : 0.5)) return hash(X + seed, Y) < 0.5 ? dirt : rp[1];
    if (k === 1) { const n = hash(X * 3 + seed, Y * 7 + seed); return n < 0.06 ? rp[0] : n < 0.24 ? rp[1] : n > 0.95 ? rp[3] : rp[2]; }
    const n = hash(X + seed * 13, Y * 3 + seed);
    if (n < 0.05) return rp[0];
    if (n > 0.96) return rp[3];
    if (hash((X >> 2) + seed, (Y >> 1) * 5) < 0.05) return rp[0];
    if (v < 1.5) return eave2;
    return rp[n < 0.3 ? 1 : 2];
  };
}
// cửa thanh gỗ ngang trên vách hông: lòng tối, thanh gỗ cách một, mép sau thanh sẫm, lanh tô trên
function slatDoorSide(g, o, u0, u1, h) {
  g.layer(L => L.G((x, y) => {
    const [u, hh] = sideUV(o, x, y);
    if (hh > h - 1) return '#120804';
    const j = mod(hh, 2);
    if (j >= 1 && hh > 0.5) return u > u1 - 0.6 ? WOOD[0] : g.k === 2 && j >= 1.5 ? WOOD[3] : WOOD[2];
    return DARK_IN;
  }, sideQuad(o, u0, u1, 0, h)));
  g.layer(L => L.G(WOOD[2], sideQuad(o, u0 - 0.5, u1 + 0.5, h, h + 0.5)), WOOD[0]);
}
function incubatorSide() {
  return g => {
    const o = house(g, {
      W: 14, H: 11, T: 5, D: 10, eaveL: 1, eaveR: 2,
      side: plasterM(dim(PLASTER, 0.12), 11, 5), front: plasterM(PLASTER, 11, 3), gable: plasterM(PLASTER, 99, 3),
      roof: { m: tileM(HUT_TILE, 2) },
      deco: (g, o) => {
        slatDoorSide(g, o, 2.5, 7.5, 7);
        // lỗ thông hơi nhỏ trên đầu hồi
        const cx = o.fx + o.W / 2;
        g.layer(L => { L.R('#2a1608', cx - 1, o.by - o.H - 2.5, 2, 1.5); L.R('#120804', cx - 1, o.by - o.H - 2.5, 2, 0.5); });
        // vài cọng rơm lót rơi ra trước ngưỡng cửa
        for (const [sx, sy] of [[-5, -2], [-3, -1], [-6, -4], [-2, -3.5]]) { g.R(THATCH[3], o.fx + sx, o.by + sy, 2, 1); g.R(THATCH[4], o.fx + sx, o.by + sy, 1, 0.5); g.R(THATCH[1], o.fx + sx + 1.5, o.by + sy + 0.5, 0.5, 0.5); }
      },
      top: (g, o) => g.R(HUT_TILE[3], o.Af[0] - 0.5, o.Af[1] + 0.5, 1, 0.5),
    });
    return { frame: [30, 36], door: o.side(5.75, 0) };   // cùng khung 30 rộng với SPR.coop; đáy khung = chân ô dưới của chân 1x2 (layout.penGeo nest.spr)
  };
}

// ---------- vòi sen chuồng cấp 3 (art59.SHOWER_ART) nhìn nghiêng: cột ở rào gần người xem, cần vươn vào trong chuồng ----------
// Cần chạy theo chiều sâu (lùi lên trên, lệch trái SK như mái nhà), bát sen ở đầu cần, nước xối xuống đất ở cùng độ sâu.
// Gốc toạ độ: chân cột (giữa cột, mặt đất) = giữa đáy ảnh (khung cố định đối xứng quanh cột, lật ngang vẫn đúng chỗ).
const PVC = ['#234a78', '#3a6fa8', '#5f98d2', '#a8d0f2'];
const DRY = ['#4c4a48', '#6f6b66', '#9a958d', '#c9c3b8'];
const CHROME = ['#4e5864', '#7c8894', '#b4bec8', '#e4eaee'];
const DULL = CHROME.map(c => mix(c, '#8a7a66', 0.35));
const LEVER = { on: ['#1f6e2a', '#3cc24e', '#9ce88a'], off: ['#6e1a12', '#b8352b', '#ef6a54'] };
const CONC = ['#6a6a64', '#8c8c84', '#adada4', '#d2d2c8'];
const WATER = ['#123e7a', '#1f6fd1', '#5fb8ff', '#cfeaff'];
const GRASS = ['#2f6b1f', '#4fa83a', '#8fd65a'];
const SMUD = ['#4a2c14', '#6b4020', '#8a5a2b'];
const MIST = '#cfeaff88';
// ống đứng (x0: mép trái, rộng 2): sáng trái, tối phải
function pipeUp(g, x, y0, y1, C) {
  g.R(C[1], x, y0, 2, y1 - y0);
  if (g.k === 1) g.R(C[2], x, y0, 1, y1 - y0);
  else { g.R(C[2], x, y0, 0.5, y1 - y0); g.R(C[3], x + 0.5, y0, 0.5, y1 - y0); g.R(C[0], x + 1.5, y0, 0.5, y1 - y0); }
}
// ống chạy theo chiều sâu từ (x, y) (mép trái, rộng w) lùi d hàng: dải xiên, mép trên-trái hứng sáng
function pipeBack(g, x, y, d, C, w = 2) {
  const dx = -d * SK;
  g.G((px, py) => {
    const t = (px - (x + ((y - py) / d) * dx)) / w;
    if (g.k === 1) return t < 0.45 ? C[2] : C[1];
    return t < 0.22 ? C[3] : t < 0.5 ? C[2] : t > 0.78 ? C[0] : C[1];
  }, [[x, y], [x + w, y], [x + w + dx, y - d], [x + dx, y - d]]);
}
function sideBand(g, x, y, w) { g.R(CHROME[2], x, y, w, 1); g.R(CHROME[3], x, y, w, 0.5); g.R(CHROME[0], x + w - 0.5, y, 0.5, 1); }
// van tay trên cột, cần gạt chĩa sang trái: mở = cần xanh dựng, khóa = cần đỏ nằm ngang
function sideValve(g, x, y, on) {
  g.R(CHROME[1], x - 0.5, y, 3, 3); g.R(CHROME[2], x - 0.5, y, 3, 1); g.R(CHROME[3], x, y + 0.5, 0.5, 0.5); g.R(CHROME[0], x + 2, y + 1, 0.5, 2);
  g.R(CHROME[2], x - 1.5, y + 1, 1, 1);   // trục van
  const L = on ? LEVER.on : LEVER.off;
  if (on) { g.R(L[1], x - 2.5, y - 3, 1, 4.5); g.R(L[2], x - 2.5, y - 3, 0.5, 4.5); g.R(L[2], x - 2.5, y - 3.5, 1, 0.5); g.R(L[0], x - 2, y - 3, 0.5, 0.5); }
  else { g.R(L[1], x - 6.5, y + 1, 5, 1); g.R(L[2], x - 6.5, y + 1, 5, 0.5); g.R(L[0], x - 6.5, y + 1, 0.5, 1); }
}
// bát sen úp xuống (art59.rose): cx giữa bát, y đáy cổ nối cần
function sideRose(g, cx, y, C) {
  g.R(C[1], cx - 1, y, 2, 1.5); g.R(C[2], cx - 1, y, 0.5, 1.5);
  g.R(C[2], cx - 2.5, y + 1.5, 5, 1);
  g.R(C[1], cx - 3, y + 2.5, 6, 1.5);
  g.R(C[3], cx - 2.5, y + 1.5, 2, 0.5); g.R(C[3], cx - 3, y + 2.5, 0.5, 0.5);
  g.R(C[0], cx + 2, y + 2.5, 1, 1.5);
  g.hd(N => { for (let i = 0; i < 5; i++) N(C[0], Math.round((cx - 2.5) * 2) + i * 2 + 1, Math.round((y + 3.5) * 2), 1, 1); });
}
function sideTuft(g, x, y) {
  g.R(GRASS[0], x, y, 1.5, 1);
  g.R(GRASS[1], x, y - 0.5, 0.5, 1); g.R(GRASS[1], x + 1, y - 1, 0.5, 1.5);
  g.R(GRASS[2], x + 0.5, y - 0.5, 0.5, 0.5);
}
function sideDrip(g, cx, y) {
  g.R(WATER[1], cx - 0.5, y, 1, 1.5); g.R(WATER[3], cx - 0.5, y, 0.5, 0.5);
  g.hd(N => N(WATER[0], Math.round(cx * 2), Math.round((y + 1.5) * 2) - 1, 1, 1));
}
const HW = (x, y) => hash(Math.floor(x * 7), Math.floor(y * 13));
// tia nước (art59.spray): từ đáy bát sen (cx, y0) xuống mặt đất y1, khung f 0..2
function sideSpray(g, cx, y0, y1, f) {
  const h = y1 - y0, n = 4;
  g.E('#3f9cf066', cx, y1 - 0.5, 6, 1.5);
  g.hd(N => { N('#cfeaffaa', Math.round((cx - 4) * 2), Math.round((y1 - 1) * 2), 3, 1); N('#cfeaffaa', Math.round((cx + 2) * 2), Math.round((y1 - 0.5) * 2), 2, 1); });
  for (let j = 0; j < n; j++) {
    const off = j - (n - 1) / 2, xAt = t => cx + off * 1.3 + off * 1.6 * t * t * 1.4;
    g.hd(N => {
      for (let Y = Math.round(y0 * 2); Y < Math.round(y1 * 2) - 2; Y++) {
        const t = (Y / 2 - y0) / h;
        if (mod(Y + f * 3 + j * 5, 9) < 6) N(t < 0.5 ? '#a8dcffb0' : '#8fd0ff80', Math.round(xAt(t) * 2), Y, 1, 1);
      }
    });
    for (let s = ((f * 2 + j * 3) % 5) + 0.5; s < h - 1.5; s += 4.5 + (j % 2)) {
      const t = s / h, x = Math.round(xAt(t) - 0.25), y = y0 + s, len = 1.5 + (HW(j, s) > 0.5 ? 0.5 : 0);
      g.R(WATER[2], x, y, 1, len);
      g.R(WATER[3], x, y + len - 0.5, 0.5, 0.5);
      g.hd(N => N(WATER[1], x * 2 + 1, Math.round(y * 2), 1, 1));
    }
  }
  const w = 3.5 + f;
  for (const sgn of [-1, 1]) {
    const x = cx + sgn * w, hop = (f + (sgn > 0 ? 1 : 0)) % 3;
    g.R(WATER[3], Math.round(x), y1 - 2 - hop, 1, 1);
    g.R(WATER[2], Math.round(x - sgn * 1.5), y1 - 1.5 - (hop ? 0.5 : 0), 1, 1);
    g.hd(N => N('#ffffff', Math.round(x * 2), Math.round((y1 - 2 - hop) * 2), 1, 1));
  }
  g.hd(N => { for (let i = 0; i < 8; i++) N(MIST, Math.round((cx - 6 + HW(i, f + 3) * 12) * 2), Math.round((y0 + 3 + HW(f + 3, i) * h * 0.8) * 2), 1, 1); });
}
// nước: chờ = giọt đọng ở bát sen, tắm = tia xối; (cx, y) đáy bát sen, d độ sâu (mặt đất dưới bát ở y = -d)
function showerWater(g, state, f, heads) {
  for (const [i, [cx, y, d]] of heads.entries()) {
    if (state === 'idle') sideDrip(g, cx, y);
    if (state === 'spray') sideSpray(g, cx, y, -d, (f + i) % 3);
  }
}

// Chuồng heo: ống nhựa dựng trên bệ xi măng lấm bùn, cần lùi 12 hàng, một bát sen
const PIG_ARM = 12;
function pigShowerSide(state, f = 0) {
  const on = state !== 'off', C = on ? PVC : DRY, R = on ? CHROME : DULL;
  const top = -27, hx = -PIG_ARM * SK, hy = top - PIG_ARM;   // đầu cần
  return g => {
    shadowE(g, -1, -0.5, 6, 1.6, 0.22);
    // nước ở xa (sau cần, sau cột): vẽ trước, không viền
    if (state === 'spray') showerWater(g, state, f, [[hx, hy + 4, PIG_ARM]]);
    // cần lùi vào chuồng + bát sen
    g.layer(L => { pipeBack(L, -1, top + 1, PIG_ARM, C); L.R(C[1], hx - 1, hy - 0.5, 2, 1.5); L.R(C[2], hx - 1, hy - 0.5, 1, 0.5); });
    g.layer(L => sideRose(L, hx, hy + 0.5, R));
    if (state === 'idle') showerWater(g, state, f, [[hx, hy + 4.5, PIG_ARM]]);
    // bệ xi măng: mặt trên lùi về sau, mặt trước sáng mép
    g.layer(L => {
      L.G(CONC[2], [[-4, -3], [4, -3], [4 - 3 * SK, -6], [-4 - 3 * SK, -6]]);
      L.R(CONC[1], -4, -3, 8, 3); L.R(CONC[3], -4, -3, 8, 0.5);
    });
    g.R(CONC[3], -4 - 3 * SK + 0.5, -6, 7, 0.5); g.R(CONC[0], -4, -0.5, 8, 0.5);
    g.R(SMUD[1], 1.5, -2, 2, 1.5); g.R(SMUD[2], 1.5, -2, 1, 0.5); g.R(SMUD[0], -3, -1, 1.5, 1);
    g.R(SMUD[1], -5.5, -5, 2, 1); g.hd(N => { N(SMUD[2], -9, -11, 2, 1); N(SMUD[0], 4, -3, 1, 1); });
    // cột ống, khuỷu, đai, van
    g.layer(L => {
      pipeUp(L, -1, top, -3, C);
      L.R(C[1], -1, top - 1.5, 2, 2); L.R(C[2], -1, top - 1.5, 1, 0.5); L.R(C[3], -0.5, top - 1.5, 0.5, 0.5);
      sideBand(L, -1.5, top + 7, 3); sideBand(L, -1.5, -7, 3);
    });
    g.layer(L => sideValve(L, -1, -17, on));
    if (!on) { g.R(mix(C[1], '#8a5a2b', 0.45), -1, top + 10, 1, 1.5); g.hd(N => N(mix(C[0], '#8a5a2b', 0.4), 1, -24, 2, 1)); }
    sideTuft(g, 4.5, -0.5); sideTuft(g, -8, -6);
    return { box: [-17, -44, 17, 1], foot: [0, 0] };
  };
}
// Đồng cỏ: cột gỗ trên đá kê, ống ốp mé phải cột (thanh chống nằm sau cột, khuất), cần dài lùi 18 hàng, hai bát sen
const PAS_HEADS = [9, 17];
function pastureShowerSide(state, f = 0) {
  const on = state !== 'off', C = on ? PVC : DRY, R = on ? CHROME : DULL;
  const top = -35, end = PAS_HEADS[1] + 1;
  const heads = PAS_HEADS.map(d => [-d * SK + 3, top - d + 5, d]);
  return g => {
    shadowE(g, 0.5, -0.5, 6, 1.8, 0.22);
    if (state === 'spray') showerWater(g, state, f, heads.slice().reverse());
    // cần dài lùi vào chuồng, bát sen treo dưới cần
    g.layer(L => pipeBack(L, 2, top + 1, end, C));
    for (const [cx, y] of heads) g.layer(L => sideRose(L, cx, y - 4, R));
    if (state === 'idle') showerWater(g, state, f, heads);
    // đá kê chân cột
    g.layer(L => { L.E(STONE[2], 0.5, -2, 5, 2.5); L.E(STONE[3], -0.5, -2.5, 2.5, 1.5); L.R(STONE[4], -2, -3.5, 2, 0.5); });
    // cột gỗ, mũ cột
    g.layer(L => {
      const h = -2 - (top - 1);
      L.R(WOOD[1], -2, top - 1, 4, h); L.R(WOOD[2], -2, top - 1, 2, h); L.R(WOOD[3], -2, top - 1, 0.5, h); L.R(WOOD[0], 1.5, top - 1, 0.5, h);
      L.hd(N => { for (let Y = (top + 4) * 2; Y < -8; Y += 7) N(WOOD[0], -2 + mod(Y, 3), Y, 1, 3); });
    });
    g.layer(L => { L.R(WOOD[0], -2.5, top - 2, 5, 1.5); L.R(WOOD[2], -2.5, top - 2, 5, 0.5); });
    // ống ốp mé phải cột, khuỷu lên cần, đai, van
    g.layer(L => {
      pipeUp(L, 2, top + 1, -3, C);
      L.R(C[1], 2, top - 0.5, 2, 2); L.R(C[2], 2, top - 0.5, 1, 0.5); L.R(C[3], 2.5, top - 0.5, 0.5, 0.5);
      for (const y of [top + 7, -20, -9]) sideBand(L, 1.5, y, 3);
    });
    g.layer(L => sideValve(L, 2, -15, on));
    if (!on) { g.R(mix(C[1], '#8a5a2b', 0.45), 2, top + 11, 1, 1.5); g.hd(N => N(mix(C[0], '#8a5a2b', 0.4), 5, -40, 2, 1)); }
    sideTuft(g, 5.5, -0.5); sideTuft(g, -6, -0.5);
    return { box: [-20, -58, 20, 1], foot: [0, 0] };
  };
}
const showerSet = mk => ({ idle: mk('idle'), off: mk('off'), spray: [0, 1, 2].map(f => mk('spray', f)) });

// ---------- dựng ----------
const DEFS = {
  pen: { coop: [0, 1, 2].map(coopSide), pig: [0, 1, 2].map(pigSide), barn: [0, 1, 2].map(barnSide) },
  quarantine: quarantineSide(),
  nestEmpty: nestSide(false),
  nestEgg: nestSide(true),
  troughV: troughV(),
  scale: scaleSide(),
  mudV: mudV(),
  incubator: incubatorSide(),
  shower: { pig: showerSet((st, f) => pigShowerSide(st, f)), pasture: showerSet((st, f) => pastureShowerSide(st, f)) },
};
function build() {
  const lo = {}, hi = {}, info = {};
  const walk = (d, L, H, I) => {
    for (const [k, v] of Object.entries(d)) {
      if (typeof v === 'function') { const r = makePair(v); L[k] = r.lo; H[k] = r.hi; I[k] = r.info; }
      else if (Array.isArray(v)) { L[k] = []; H[k] = []; I[k] = []; walk(v, L[k], H[k], I[k]); }
      else { L[k] = {}; H[k] = {}; I[k] = {}; walk(v, L[k], H[k], I[k]); }
    }
  };
  walk(DEFS, lo, hi, info);
  return { lo, hi, info };
}
const B = DOM ? build() : null;
export const PENROT = B ? B.lo : null;
export const PENROT_HD = B ? B.hi : null;
// Điểm mốc theo đơn vị bộ thường, tính từ giữa đáy ảnh (x sang phải, y âm = lên trên); bộ 2x nhân đôi.
// { w, h, door: ngưỡng cửa hông (giữa cửa, chân vách), rampFoot: chân cầu thang gà trên mặt đất (chuồng gà), foot: chân cột vòi sen }
export const PENROT_INFO = B ? B.info : null;
