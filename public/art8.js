// Bộ sprite 2× (kiểu A) cho gia cầm & thú nuôi trong nhà: gà mái, gà trống, vịt mái, vịt cồ, chó Mực, mèo mướp vàng,
// kèm trứng / ổ trứng / trứng soi, cuộn len, chuột chiến lợi phẩm.
// Mỗi sprite vẽ lại ở độ phân giải gấp đôi bộ cũ (art3.js SPR3, art.js SPR): cũ w×h → mới 2w×2h, cùng khóa, cùng cấu trúc,
// cùng điểm neo (hàng dưới cùng là viền chân / đáy). Cỡ trên màn hình giữ nguyên: render vẽ ảnh mới ở một nửa kích thước.
//
// Khóa xuất (thay cho khóa nào của bộ cũ):
//   animal.{ga,gaTrong,vit,vitDuc,cho,meo}.<giai đoạn>.{left,right}[2]   ← SPR3.animal.*
//   run.{ga,gaTrong,vit}.<giai đoạn>.{left,right}[2]                    ← SPR3.run.*
//   sleep.{…}, sick.{…}, sleepBy.{…}.<gđ>, sickBy.{…}.<gđ>               ← SPR3.sleep / sick / sleepBy / sickBy
//   dogSitBy, dogBegBy, dogHerdBy, dogBarkBy (+ dogSit/dogBeg/dogHerd/dogBark), dogRunBy  ← SPR3 cùng tên
//   catPounceBy, catNapBy, catMouseBy, catYarn, ratTrophy, spatBubble   ← SPR3 cùng tên
//   eggNest, eggFertile, eggDuck, eggNestDuck, eggDuckFertile            ← SPR3 cùng tên
//   eggGround                                                             ← SPR.eggGround (art.js)
//
// Cách vẽ: giữ nguyên bố cục khối (elip / hộp, tọa độ theo lưới cũ) của từng loài, từng giai đoạn trong art3.js, nhưng
// rasterize ở lưới 2×: viền 1px chọn lọc (mép hứng sáng trên-trái nhạt hơn), đường tách khối 1px, 4 sắc độ mỗi mảng,
// kết cấu lông (vảy lông gà, lông vũ cánh, lông tơ, sọc mướp, lông chó), điểm sáng ở mắt, mỏ, mào, mũi.

import { canvas as rawCanvas, flip, hash } from './art.js';

const canvas = (w, h) => { const c = rawCanvas(w, h); c.getContext('2d', { willReadFrequently: true }); return c; };
const OUT = '#2e1a0c';
const K = 2;   // hệ số phóng

// ---------- màu ----------
function mix(a, b, t) {
  const A = parseInt(a.slice(1, 7), 16), B = parseInt(b.slice(1, 7), 16);
  const ch = s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}
const rgba = col => {
  if (col.startsWith('rgba')) { const m = col.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], Math.round(m[3] * 255)]; }
  const n = parseInt(col.slice(1, 7), 16);
  return [n >> 16, (n >> 8) & 255, n & 255, col.length > 7 ? parseInt(col.slice(7, 9), 16) : 255];
};
const fade = (ramp, t, to = '#cfc9c2') => ramp.map(c => mix(c, to, t));

// ---------- tiện ích vẽ (tọa độ lưới mới) ----------
function draw(w, h, fn) { const c = canvas(w, h); fn(c.getContext('2d'), c); return c; }
function px(x, col, X, Y, w = 1, h = 1) { x.fillStyle = col; x.fillRect(X, Y, w, h); }
// ô cũ (ox, oy) → khối 2×2 ở lưới mới
const R2 = (x, col, ox, oy, w = 1, h = 1) => px(x, col, ox * K, oy * K, w * K, h * K);
function dots(x, col, list) { for (const [X, Y] of list) px(x, col, X, Y); }
function line(x, col, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) px(x, col, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n));
}
// elip liên tục (tâm, bán kính theo lưới mới): tô ô có tâm nằm trong elip
function ellH(x, col, cx, cy, rx, ry) {
  x.fillStyle = col;
  for (let Y = Math.floor(cy - ry); Y <= Math.ceil(cy + ry); Y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++)
    if (((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1) x.fillRect(X, Y, 1, 1);
}
// elip cũ ell(cx, cy, rx, ry) ↔ elip liên tục mới
const eo = (cx, cy, rx, ry) => [cx * K + 1, cy * K + 1, rx * K + 1, ry * K + 1];
const shadowO = (x, cx, cy, rx, ry, a = 0.28) => ellH(x, `rgba(34,22,10,${a})`, ...eo(cx, cy, rx, ry));
function pix(w, h, fn) {
  const c = canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h);
  for (let py = 0; py < h; py++) for (let qx = 0; qx < w; qx++) {
    const col = fn(qx, py);
    if (col) img.data.set(rgba(col), (py * w + qx) * 4);
  }
  x.putImageData(img, 0, 0);
  return c;
}
// Viền 1px chọn lọc: ô trống sát hình; nằm ở mép trên / trái (hứng sáng) thì pha màu khối kề, còn lại viền tối.
function outline(c, col = OUT, lit = 0.32) {
  const w = c.width, h = c.height, x = c.getContext('2d'), id = x.getImageData(0, 0, w, h), d = id.data;
  const a = (i, j) => (i >= 0 && j >= 0 && i < w && j < h ? d[(j * w + i) * 4 + 3] : 0);
  const solid = (i, j) => a(i, j) > 200;
  const hex = (i, j) => { const o = (j * w + i) * 4; return '#' + ((d[o] << 16) | (d[o + 1] << 8) | d[o + 2]).toString(16).padStart(6, '0'); };
  const out = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (a(i, j) > 0) continue;
    const dn = solid(i, j + 1), rt = solid(i + 1, j), up = solid(i, j - 1), lf = solid(i - 1, j);
    if (!(dn || rt || up || lf)) continue;
    const litEdge = (dn || rt) && !up && !lf;
    out.push([i, j, litEdge && lit > 0 ? mix(col, hex(dn ? i : i + 1, dn ? j + 1 : j), lit) : col]);
  }
  for (const [i, j, k] of out) { x.fillStyle = k; x.fillRect(i, j, 1, 1); }
  return c;
}
const pair = fn => { const left = [fn(0), fn(1)]; return { left, right: left.map(flip) }; };

// ---------- máy vẽ hình khối 2× ----------
// Khối khai báo theo lưới CŨ (như art3.js); mỗi khối được nới 0.5 ô cũ để viền 1px mới trùng mép ngoài của viền cũ.
// thin: hộp không nới ngang (chân chim mảnh), chỉ nới đáy để vẫn chạm hàng viền dưới cùng.
// pat(X, Y, k, col, p, u, v): X, Y lưới mới; u, v tọa độ liên tục lưới cũ.
const E = (cx, cy, rx, ry, r, o = {}) => ({ t: 'e', cx, cy, rx, ry, r, ...o });
const B = (x, y, w, h, r, o = {}) => ({ t: 'b', x, y, w, h, r, ...o });
const GE = 0.35;

function fig(w, h, parts) {
  parts = parts.filter(Boolean);
  const W = w * K, H = h * K;
  const ins = (p, u, v) => {
    if (p.t === 'e') { const g = p.grow ?? GE; return ((u - p.cx) / (p.rx + g)) ** 2 + ((v - p.cy) / (p.ry + g)) ** 2 <= 1; }
    const gx = p.thin ? 0 : p.gx ?? p.grow ?? 0.5, gt = p.thin ? 0 : p.grow ?? 0.5, gb = p.grow ?? 0.5;
    return u >= p.x - gx && u < p.x + p.w + gx && v >= p.y - gt && v < p.y + p.h + gb;
  };
  const own = (X, Y) => {
    if (X < 0 || Y < 0 || X >= W || Y >= H) return -1;
    const u = (X + 0.5) / K, v = (Y + 0.5) / K;
    let b = -1;
    for (let i = 0; i < parts.length; i++) if (ins(parts[i], u, v)) b = i;
    return b;
  };
  const map = new Int16Array(W * H);
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) map[Y * W + X] = own(X, Y);
  const at = (X, Y) => (X < 0 || Y < 0 || X >= W || Y >= H ? -1 : map[Y * W + X]);
  const c = pix(W, H, (X, Y) => {
    const i = at(X, Y);
    if (i < 0) return null;
    const p = parts[i], u = (X + 0.5) / K, v = (Y + 0.5) / K;
    if (p.sep) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = at(X + dx, Y + dy);
      if (j >= 0 && j < i && !parts[j].ghost && (p.sepUp || dy >= 0 || dx !== 0)) return typeof p.sep === 'string' ? p.sep : p.r[0];
    }
    if (p.col) return p.col;
    let s;
    if (p.t === 'e') {
      const g = p.grow ?? GE, dx = (u - p.cx) / (p.rx + g), dy = (v - p.cy) / (p.ry + g);
      s = 0.3 - dx * 0.5 - dy * 0.78 - (dx * dx + dy * dy) * 0.32;
    } else {
      const gx = p.thin ? 0 : p.gx ?? 0.5, fx = p.w + 2 * gx <= 1.01 ? 0.5 : (u - (p.x - gx)) / (p.w + 2 * gx);
      s = fx < 0.34 ? 0.45 : fx > 0.66 ? -0.45 : 0.05;
      if (p.w === 1 && p.thin) s = X % 2 ? -0.2 : 0.45;
    }
    s += (p.lift || 0) + (hash(X * 3 + 7, Y * 5 + 11) - 0.5) * (p.noise ?? 0.1);
    let k = s > 0.6 ? 3 : s > 0.12 ? 2 : s > -0.42 ? 1 : 0;
    if (p.max != null) k = Math.min(k, p.max);
    if (p.min != null) k = Math.max(k, p.min);
    let col = p.r[k];
    if (p.gloss && s > p.gloss) col = mix(p.r[3], '#ffffff', 0.55);
    if (p.pat) { const q = p.pat(X, Y, k, col, p, u, v); if (q !== undefined) col = q; }
    return col;
  });
  return outline(c);
}

// Bốn chân thú nhìn ngang: chân xa tối hơn, chân gần sáng; 2 khung bước kéo.
function quadLegs(o) {
  const { fx, bx, top, len, w = 2, r, hoof, frame, slow = false, far = 1 } = o;
  const a = frame ? 1 : -1;
  const legs = [[fx + far - a, 1], [bx + far + a, 1], [fx + a, 0], [bx - a, 0]];
  if (slow && frame) { legs[0][0] = fx + far; legs[3][0] = bx; }
  const foot = top * K + len * K - 1;   // hàng bàn chân (lưới mới)
  return legs.map(([lx, isFar]) => B(lx, top, w, len, r, {
    max: isFar ? 1 : undefined, min: isFar ? undefined : 1, sep: !isFar, noise: 0, gx: w === 1 ? 0.5 : 0,
    pat: (X, Y) => (hoof && Y >= foot ? (isFar ? hoof[0] : hoof[1]) : Y === foot + 1 ? r[0] : undefined),
  }));
}

// ---------- bảng màu (giữ nguyên art3.js) ----------
const P = {
  hen: ['#6a3412', '#9c5622', '#c87e3c', '#e8aa62'],
  henW: ['#4e260c', '#7e4218', '#a8622a', '#c88442'],
  henTail: ['#2e1a0e', '#4c2a12', '#6e3e18', '#925a26'],
  pullet: ['#9a5c1e', '#c88438', '#e6ac58', '#f8d088'],
  chick: ['#c08410', '#e6b024', '#ffd84a', '#fff29c'],
  chickM: ['#a86c0c', '#d29a1e', '#f2c23c', '#fde486'],
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
  ducklingM: ['#9a7608', '#c4a018', '#e8c63a', '#f8e487'],
  drakeHead: ['#0b3620', '#115c38', '#1d8a52', '#49bd80'],
  drakeBody: ['#6e7280', '#9a9ea8', '#c4c8ce', '#e6e8ec'],
  drakeBr: ['#58240f', '#85381b', '#a85628', '#c87c46'],
  drakeTail: ['#121420', '#212534', '#353b4c', '#4c5466'],
  collar: ['#d4d4d8', '#e8e8ea', '#ffffff', '#ffffff'],
  bill: ['#a84a08', '#de7414', '#f8a030', '#ffcc68'],
  billM: ['#8a7a10', '#b8a420', '#dcc840', '#f2e480'],
  dog: ['#111118', '#262634', '#40405a', '#6a6a88'],
  dogG: ['#55555e', '#82828c', '#a8a8b2', '#d0d0d8'],
  cat: ['#8a3a0c', '#c66228', '#ec9246', '#ffc47c'],
  cream: ['#b49676', '#dcc29e', '#f4e2c4', '#fff8ea'],
  rat: ['#3a3438', '#5c5458', '#80767a', '#a89ea0'],
  pink: '#f08a9e',
};
const EYE = '#1a0e08';
const GLINT = '#ffffff';

// ---------- kết cấu lông (lưới mới) ----------
// vảy lông: gạch ngắn so le mỗi 3 hàng, chỉ ở vùng gốc / sáng
const scale = (ramp, lo = 1) => (X, Y, k) => (k >= lo && k <= 2 && Y % 3 === 2 && (X + Math.floor(Y / 3) * 2) % 4 < 2 ? ramp[k - 1] : undefined);
// lông tơ: chấm sáng lác đác
const fluff = ramp => (X, Y, k) => (k >= 1 && k < 3 && hash(X * 7 + 3, Y * 13 + 1) < 0.1 ? ramp[k + 1] : undefined);
// lông vũ cánh: vạch dọc ở nửa dưới cánh (đầu lông cánh)
const quill = (ramp, cy) => (X, Y, k, col, p, u, v) => (v > cy + 0.15 && X % 3 === 0 ? ramp[Math.max(0, k - 1)] : v > cy - 0.6 && v < cy - 0.1 && (X + Y) % 4 === 0 ? ramp[Math.min(3, k + 1)] : undefined);
const both = (...fs) => (...a) => { for (const f of fs) { if (!f) continue; const r = f(...a); if (r !== undefined) return r; } return undefined; };

// mỏ chim: đường miệng tối giữa hai hàm, điểm sáng góc trên
const beakPat = (ramp, mouthY) => (X, Y, k) => (Y === mouthY ? ramp[0] : undefined);

// ---------- mắt (ô cũ → 2×2 mới) ----------
function birdEye(x, ex, ey, col = EYE) {
  R2(x, col, ex, ey); px(x, GLINT, ex * K, ey * K);
}
function faceBird(x, ex, ey, pose, old, lid = '#3b2412') {
  const X = ex * K, Y = ey * K;
  if (pose === 'sleep') { px(x, lid, X - 1, Y + 1, 4, 1); px(x, lid, X - 1, Y); px(x, mix(lid, '#ffffff', 0.25), X + 3, Y); return; }
  if (pose === 'sick') {
    R2(x, EYE, ex, ey); px(x, '#8a7a6a', X, Y);   // mắt đờ, không sáng
    px(x, '#5a3a20', X - 2, Y - 2, 2, 1); px(x, '#5a3a20', X + 2, Y - 2, 2, 1);
    px(x, '#5a3a20', X - 1, Y - 1); px(x, '#5a3a20', X + 2, Y - 1);
    return;
  }
  if (pose === 'run') {   // mắt trợn khi hoảng: lòng trắng to, con ngươi nhỏ
    px(x, '#fff6dc', X, Y - 2, 4, 4); px(x, EYE, X, Y - 1, 2, 2); px(x, GLINT, X, Y - 1);
    px(x, '#5a3a20', X - 1, Y - 3, 4, 1);
    return;
  }
  birdEye(x, ex, ey);
  if (old) px(x, '#8a6a50', X - 1, Y - 1, 3, 1);
}

// ---------- GÀ CON ---------- non 9x9 → 18x18
function chick(frame, pose = 'stand', male = false) {
  const C = male ? P.chickM : P.chick;
  const run = pose === 'run', up = pose === 'stand' || run;
  const oy = up ? 0 : 1;
  const L = (a, b, w, h) => B(a, b, w, h, P.leg, { noise: 0, thin: true, min: 1 });
  const legs = !up ? [] : run ? (frame ? [L(1, 7, 3, 1), L(6, 7, 3, 1)] : [L(3, 7, 2, 1), L(6, 6, 1, 2)])
    : (frame ? [L(3, 7, 1, 1), L(6, 6, 1, 1)] : [L(4, 7, 1, 1), L(6, 7, 1, 1)]);
  const stripe = male ? (X, Y, k, c, p, u, v) => (v < 4.6 + oy && (X === 11 || X === 15) ? '#8a4e14' : X === 12 && v < 4.4 + oy ? '#b07020' : undefined) : undefined;
  const c = fig(9, 9, [
    ...legs,
    E(5.3, 5.2 + oy, 3.1, 2.5, C, { pat: both(stripe, fluff(C)) }),
    E(6.2, 5.4 + oy - (run ? 1.3 : 0), 1.5, 1.1, C, { sep: true, max: 2, pat: (X, Y, k, col, p, u, v) => (v > 5.9 + oy - (run ? 1.3 : 0) && X % 2 === 0 ? C[0] : undefined) }),
    E(3.5, 3.4 + oy, 2.1, 2.1, C, { sep: true, pat: both(male ? (X, Y, k, c, p, u, v) => (v < 2.6 + oy && X === 9 ? '#8a4e14' : undefined) : undefined, fluff(C)) }),
    male && B(3, 1 + oy, 1, 1, P.red, { noise: 0, min: 2, gloss: 0.4, pat: (X, Y) => (Y === (1 + oy) * K - 1 && X % 2 === 0 ? null : Y === (1 + oy) * K + 2 && X === 8 ? null : undefined) }),
    B(1, 3 + oy + (pose === 'sick' ? 1 : 0), 1, 1, P.beak, { noise: 0, min: 2, pat: (X, Y) => (Y === (3 + oy + (pose === 'sick' ? 1 : 0)) * K + 1 ? P.beak[1] : X === 1 && Y % 2 === 0 ? P.beak[3] : undefined) }),
  ]);
  const x = c.getContext('2d');
  if (pose === 'sleep') { px(x, '#7a5410', 4, 7 + 2 * oy, 4, 1); px(x, '#7a5410', 3, 6 + 2 * oy); }
  else if (pose === 'sick') { R2(x, EYE, 2, 4 + oy - 1); px(x, '#8a7a6a', 4, (3 + oy) * K); px(x, '#a07018', 4, (2 + oy) * K + 1, 3, 1); }
  else {
    if (run) { px(x, '#fff6dc', 4, 4, 4, 4); px(x, EYE, 4, 5, 2, 2); px(x, GLINT, 4, 5); }
    else birdEye(x, 2, 3);
    px(x, '#ffb070', 6, 9, 2, 1); px(x, '#ff9a60', 7, 10);   // má hồng
  }
  if (!male) { px(x, C[3], 8, 2 + 2 * oy, 2, 1); px(x, C[2], 9, 1 + 2 * oy); px(x, OUT, 10, 1 + 2 * oy); px(x, OUT, 8, 1 + 2 * oy); }   // chỏm lông tơ
  return c;
}

// ---------- GÀ MÁI ---------- non 9x9 · nhỡ 11x12 · trưởng thành 14x13 · già 14x13 (mới gấp đôi)
function hen(stage, frame, pose = 'stand') {
  if (stage === 'non') return chick(frame, pose);
  const old = stage === 'gia', run = pose === 'run', up = pose === 'stand' || run;
  const L = (a, b, w, h) => B(a, b, w, h, P.leg, { noise: 0, thin: true, min: 1 });
  if (stage === 'nho') {
    const oy = up ? 0 : 2, sk = pose === 'sick' ? 1 : 0;
    const legs = !up ? [] : run ? (frame ? [L(3, 9, 1, 2), L(1, 11, 3, 1), L(8, 9, 1, 2), L(8, 11, 3, 1)] : [L(5, 9, 1, 1), L(4, 10, 2, 1), L(7, 9, 1, 2), L(6, 11, 3, 1)])
      : (frame ? [L(4, 9, 1, 2), L(3, 10, 1, 1), L(8, 9, 1, 1)] : [L(5, 9, 1, 2), L(4, 10, 1, 1), L(7, 9, 1, 2), L(6, 10, 1, 1)]);
    const wy = 6.3 + oy - (run ? 1.4 : 0);
    const c = fig(11, 12, [
      ...legs,
      E(8.6, 4.6 + oy, 1.1, 1.7, P.henTail, { pat: (X, Y, k) => (k >= 1 && (X + Y) % 4 === 0 ? P.henTail[Math.min(3, k + 1)] : undefined) }),
      E(6.1, 6.4 + oy, 3.7, 2.5, P.pullet, { pat: both(scale(P.pullet), fluff(P.pullet)) }),
      E(7, wy, 2.1, 1.3, P.hen, { sep: true, pat: quill(P.hen, wy) }),
      E(3.5, 2.5 + oy, 0.9, 0.6, P.red, { gloss: 0.5 }),
      E(3.5, 3.9 + oy + sk, 1.8, 1.8, P.pullet, { sep: true, pat: fluff(P.pullet) }),
      B(1, 4 + oy + sk, 1, 1, P.beak, { min: 2, noise: 0, pat: beakPat(P.beak, (4 + oy + sk) * K + 1) }),
    ]);
    faceBird(c.getContext('2d'), 2, 4 + oy + sk, pose);
    return c;
  }
  const H = old ? fade(P.hen, 0.38) : P.hen, HW = old ? fade(P.henW, 0.35) : P.henW, HT = old ? fade(P.henTail, 0.3) : P.henTail;
  const RD = old ? fade(P.red, 0.35) : P.red;
  const oy = up ? 0 : 2, hy = (old ? 1 : 0) + (pose === 'sleep' ? 1 : 0) + (pose === 'sick' ? 2 : 0) + (run ? 1 : 0);
  const hx = pose === 'sleep' ? 1 : run ? -1 : 0;
  const wy = run ? 1.6 : 0;
  const legs = !up ? [] : run ? (frame ? [L(4, 10, 1, 2), L(2, 12, 3, 1), L(10, 10, 1, 2), L(10, 12, 3, 1)] : [L(6, 10, 1, 1), L(5, 11, 2, 1), L(9, 10, 1, 2), L(8, 12, 3, 1)])
    : (frame ? [L(5, 10, 1, 2), L(4, 11, 1, 1), L(10, 10, 1, 1)] : [L(6, 10, 1, 2), L(5, 11, 1, 1), L(9, 10, 1, 2), L(8, 11, 1, 1)]);
  const wcy = 7.1 + oy - wy;
  const c = fig(14, 13, [
    ...legs,
    E(11.3, 4.4 + oy + (old ? 1 : 0), 1.5, 2.7, HT, { pat: (X, Y, k) => (k >= 1 && (X + Y) % 4 === 0 ? HT[Math.min(3, k + 1)] : undefined) }),
    E(12.2, 5.6 + oy + (old ? 1 : 0), 0.9, 2, HT, { sep: true, max: 2, pat: (X, Y, k) => (X % 3 === 0 ? HT[0] : undefined) }),
    E(7.6, 7.3 + oy, 4.7, 3.1, H, { pat: both(scale(H), fluff(H)) }),
    E(8.8, wcy, 2.9, 1.8, HW, { sep: true, pat: quill(HW, wcy) }),
    E(4.1 + hx, 2.1 + oy + hy, 1.4, 0.9, RD, { gloss: 0.55, pat: (X, Y, k, col, p, u, v) => (v < 1.6 + oy + hy && X % 3 === 0 ? null : undefined) }),
    E(4.1 + hx, 4.3 + oy + hy, 2.1, 2.1, H, { sep: true, pat: fluff(H) }),
    E(2.8 + hx, 6.4 + oy + hy, 0.6, 0.8, RD, { gloss: 0.5 }),
    B(1 + hx, 4 + oy + hy, 2, 1, P.beak, { noise: 0, min: 1, pat: beakPat(P.beak, (4 + oy + hy) * K + 1) }),
  ]);
  const x = c.getContext('2d');
  faceBird(x, 3 + hx, 4 + oy + hy, pose, old);
  return c;
}

// ---------- GÀ TRỐNG ---------- non 9x9 · nhỡ 12x13 · trưởng thành 15x15 · già 15x15
function rooster(stage, frame, pose = 'stand') {
  if (stage === 'non') return chick(frame, pose, true);
  const old = stage === 'gia', run = pose === 'run', up = pose === 'stand' || run;
  const L = (a, b, w, h) => B(a, b, w, h, P.leg, { noise: 0, thin: true, min: 1 });
  if (stage === 'nho') {
    const oy = up ? 0 : 2, sk = pose === 'sick' ? 1 : 0;
    const legs = !up ? [] : run ? (frame ? [L(3, 10, 1, 2), L(1, 12, 3, 1), L(8, 10, 1, 2), L(8, 12, 3, 1)] : [L(5, 10, 1, 1), L(4, 11, 2, 1), L(8, 10, 1, 2), L(7, 12, 3, 1)])
      : (frame ? [L(4, 10, 1, 2), L(3, 11, 1, 1), L(8, 10, 1, 1)] : [L(5, 10, 1, 2), L(4, 11, 1, 1), L(8, 10, 1, 2), L(7, 11, 1, 1)]);
    const wcy = 7.2 + oy - (run ? 1.5 : 0);
    const c = fig(12, 13, [
      ...legs,
      E(9.4, 4.4 + oy, 1.3, 2.4, P.rooTail, { pat: (X, Y, k) => (k >= 2 && (X + Y) % 4 === 0 ? P.rooTail[3] : undefined) }),
      E(6.4, 7.4 + oy, 3.8, 2.5, P.rooBody, { pat: scale(P.rooBody) }),
      E(7.2, wcy, 2.2, 1.4, P.rooWing, { sep: true, pat: quill(P.rooWing, wcy) }),
      E(4.3, 5.4 + oy, 1.6, 2, P.gold, { pat: (X, Y, k) => (k < 3 && (X + Math.floor(Y / 2)) % 3 === 0 ? P.gold[Math.max(0, k - 1)] : undefined) }),
      E(3.8, 2.1 + oy + sk, 1.2, 0.8, P.red, { gloss: 0.5, pat: (X, Y, k, col, p, u, v) => (v < 1.6 + oy + sk && X % 3 === 1 ? null : undefined) }),
      E(3.7, 3.9 + oy + sk, 1.8, 1.8, P.gold, { sep: true }),
      E(2.6, 5.9 + oy + sk, 0.5, 0.7, P.red, { gloss: 0.5 }),
      B(1, 4 + oy + sk, 1, 1, P.beak, { min: 2, noise: 0, pat: beakPat(P.beak, (4 + oy + sk) * K + 1) }),
    ]);
    faceBird(c.getContext('2d'), 3, 4 + oy + sk, pose);
    return c;
  }
  const RB = old ? fade(P.rooBody, 0.3) : P.rooBody, RW = old ? fade(P.rooWing, 0.3) : P.rooWing;
  const G = old ? fade(P.gold, 0.4) : P.gold, T = old ? fade(P.rooTail, 0.25) : P.rooTail, RD = old ? fade(P.red, 0.35) : P.red;
  const oy = up ? 0 : 3, hy = (old ? 1 : 0) + (pose === 'sick' ? 2 : 0) + (pose === 'sleep' ? 1 : 0) + (run ? 1 : 0);
  const wy = run ? 1.7 : 0;
  const legs = !up ? [] : run ? (frame ? [L(4, 12, 1, 2), L(2, 14, 3, 1), L(10, 12, 1, 2), L(10, 14, 3, 1)] : [L(6, 12, 1, 1), L(5, 13, 2, 1), L(9, 12, 1, 2), L(8, 14, 3, 1)])
    : (frame ? [L(5, 12, 1, 2), L(4, 13, 1, 1), L(10, 12, 1, 1)] : [L(6, 12, 1, 2), L(5, 13, 1, 1), L(9, 12, 1, 2), L(8, 13, 1, 1)]);
  const tailDrop = old ? 1.5 : 0;
  const wcy = 9 + oy - wy;
  const sheen = (X, Y, k) => (k >= 1 && (X + Y) % 5 === 0 ? T[Math.min(3, k + 1)] : k >= 2 && (X + Y) % 5 === 1 ? T[3] : undefined);
  const c = fig(15, 15, [
    ...legs,
    E(12, 4.6 + oy + tailDrop, 2, 3.4, T, { pat: sheen }),
    E(13, 7.4 + oy + tailDrop, 1.2, 2.6, T, { sep: true, pat: sheen }),
    E(8.2, 9.2 + oy, 4.4, 2.9, RB, { pat: scale(RB) }),
    E(9.2, wcy, 2.8, 1.8, RW, { sep: true, pat: (X, Y, k, col, p, u, v) => (v > wcy + 0.2 && X % 3 === 0 ? RW[0] : v > wcy + 0.2 && X % 3 === 1 && k >= 1 ? T[2] : v > wcy - 0.7 && v < wcy - 0.1 && (X + Y) % 4 === 0 ? RW[3] : undefined) }),
    E(4.9, 6.8 + oy + hy * 0.5, 2.2, 2.8, G, { pat: (X, Y, k) => (k < 3 && (X + Math.floor(Y / 2)) % 3 === 0 ? G[Math.max(0, k - 1)] : undefined) }),
    // mào răng cưa to
    E(4.4, 1.9 + oy + hy, 2, 1.2, RD, { gloss: 0.55, pat: (X, Y, k, col, p, u, v) => (v < 1.4 + oy + hy && X % 4 >= 2 ? null : undefined) }),
    E(4.3, 4.1 + oy + hy, 2.1, 2, G, { sep: true }),
    E(2.9, 6.6 + oy + hy, 0.8, 1.3, RD, { gloss: 0.5 }),
    B(1, 4 + oy + hy, 2, 1, P.beak, { noise: 0, min: 1, pat: beakPat(P.beak, (4 + oy + hy) * K + 1) }),
  ]);
  const x = c.getContext('2d');
  faceBird(x, 3, 4 + oy + hy, pose, old);
  if (up) { px(x, '#ffe07a', 14, 24, 1, 2); px(x, '#c89020', 15, 25); }   // cựa
  return c;
}

// ---------- VỊT ---------- non 10x8 · nhỡ 12x11 · trưởng thành 15x12 · già 15x12 (mới gấp đôi)
// chân màng: hộp mảnh, hàng dưới có kẽ màng
const webFoot = (a, b, w, h, r, o = {}) => B(a, b, w, h, r, { noise: 0, thin: true, ...o, pat: (X, Y) => (Y === (b + h) * K && X % 3 === 2 ? r[0] : undefined) });
// mỏ dẹt: đường miệng, lỗ mũi, điểm sáng sống mỏ
const billPat = (r, top, nose) => (X, Y) => (Y === top * K - 1 ? r[3] : nose && X === nose[0] && Y === nose[1] ? r[0] : undefined);
function duckEye(x, ex, ey, pose, lid, sickCol, extra) {
  const X = ex * K, Y = ey * K;
  if (pose === 'sleep') { px(x, lid, X - 1, Y + 1, 4, 1); px(x, lid, X + 3, Y); return; }
  if (pose === 'run') { px(x, '#fff6dc', X, Y - 2, 4, 4); px(x, EYE, X, Y - 1, 2, 2); px(x, GLINT, X, Y - 1); return; }
  R2(x, EYE, ex, ey);
  if (pose === 'sick') { px(x, '#8a8478', X, Y); px(x, sickCol, X - 2, Y - 2, 3, 1); px(x, sickCol, X - 1, Y - 1); }
  else px(x, GLINT, X, Y);
  if (extra) extra(X, Y);
}

function duck(stage, frame, pose = 'stand') {
  const run = pose === 'run', sit = pose !== 'stand' && !run, sk = pose === 'sick' ? 1 : 0;
  if (stage === 'non') {
    const oy = sit ? 1 : 0;
    const cap = (X, Y, k, c, p, u, v) => (v < 2.2 + oy + sk ? (k >= 2 && X % 3 === 0 ? '#d4c450' : '#b8a83a') : undefined);
    const c = fig(10, 8, [
      !sit && webFoot(run ? (frame ? 2 : 4) : (frame ? 4 : 5), 6, run ? 3 : 2, 1, P.bill, { min: 1 }),
      !sit && webFoot(run ? (frame ? 7 : 6) : 7, frame ? 5 : 6, run ? 3 : 2, 1, P.bill, { max: 1 }),
      E(5.9, 4.5 + oy, 3.4, 1.9, P.duckling, { pat: both((X, Y, k, c, p, u, v) => (v < 3.4 + oy && u >= 5 && u < 8 ? (hash(X, Y) < 0.2 ? '#d8c650' : '#c8b440') : undefined), fluff(P.duckling)) }),
      E(8.7, 3.3 + oy, 0.8, 0.8, P.duckling),
      E(6.7, 4.5 + oy - (run ? 1.2 : 0), 1.7, 1, P.duckling, { sep: true, max: 2, pat: fluff(P.duckling) }),
      E(3.6, 2.7 + oy + sk, 1.9, 1.7, P.duckling, { sep: true, pat: both(cap, fluff(P.duckling)) }),
      B(1, 3 + oy + sk, 2, 1, P.bill, { noise: 0, min: 2, pat: billPat(P.bill, 3 + oy + sk, [3, (3 + oy + sk) * K]) }),
      B(1, 4 + oy + sk, 2, 1, P.bill, { noise: 0, max: 1 }),
    ]);
    duckEye(c.getContext('2d'), 3, 2 + oy + sk, pose, '#8a6a10', '#9a7a10');
    return c;
  }
  if (stage === 'nho') {
    const oy = sit ? 2 : 0;
    const wcy = 6 + oy - (run ? 1.4 : 0);
    const c = fig(12, 11, [
      !sit && webFoot(run ? (frame ? 2 : 4) : (frame ? 4 : 5), 9, run ? 3 : 2, 1, P.bill, { min: 1 }),
      !sit && webFoot(run ? (frame ? 8 : 7) : (frame ? 8 : 7), frame ? 8 : 9, run ? 3 : 2, 1, P.bill, { max: 1 }),
      !sit && B(frame ? 5 : 6, 8, 1, 1, P.bill, { noise: 0, thin: true }),
      // lông tơ vàng đang thay dần sang lông trắng
      E(6.6, 6.2 + oy, 4, 2.4, P.duckY, { pat: (X, Y, k) => (k >= 2 && hash(X * 3, Y * 5) < 0.35 ? P.duck[3] : k === 1 && hash(X, Y * 3) < 0.12 ? P.duck[2] : undefined) }),
      E(10.3, 4.6 + oy, 0.9, 0.9, P.duckY),
      E(7.4, wcy, 2.4, 1.4, P.duck, { sep: true, max: 2, pat: quill(P.duck, wcy) }),
      E(3.8, 4.6 + oy, 1.2, 1.8, P.duckY, { pat: fluff(P.duckY) }),
      E(3.6, 2.9 + oy + sk, 1.8, 1.6, P.duckY, { sep: true, pat: fluff(P.duckY) }),
      B(1, 3 + oy + sk, 2, 1, P.bill, { noise: 0, min: 2, pat: billPat(P.bill, 3 + oy + sk, [3, (3 + oy + sk) * K]) }),
    ]);
    duckEye(c.getContext('2d'), 3, 3 + oy + sk, pose, '#8a6a10', '#8a7020');
    return c;
  }
  const old = stage === 'gia';
  const D = old ? fade(P.duck, 0.25, '#c8c2b4') : P.duck, BL = old ? fade(P.bill, 0.3) : P.bill;
  const oy = sit ? 2 : 0, hy = (old ? 1 : 0) + sk * 2 + (pose === 'sleep' ? 2 : 0) + (run ? 1 : 0);
  const hx = pose === 'sleep' ? 2 : run ? -1 : 0;
  const wy = run ? 1.6 : 0, wcy = 6.8 + oy - wy;
  const c = fig(15, 12, [
    !sit && webFoot(run ? (frame ? 3 : 5) : (frame ? 5 : 6), 10, run ? 3 : 2, 1, BL, { min: 1 }),
    !sit && webFoot(run ? (frame ? 10 : 8) : (frame ? 10 : 9), frame ? 9 : 10, run ? 3 : 2, 1, BL, { max: 1 }),
    !sit && B(frame ? 6 : 7, 9, 1, 1, BL, { noise: 0, thin: true }),
    !sit && !frame && B(9, 9, 1, 1, BL, { noise: 0, thin: true }),
    E(8.4, 7 + oy, 5, 2.8, D, { pat: scale(D, 1) }),
    E(13.1, 5.2 + oy, 1, 1.1, D, { pat: (X, Y, k) => (X % 2 === 0 && k < 3 ? D[Math.max(0, k - 1)] : undefined) }),
    // cánh: gương cánh xanh lam (2 hàng, mép trên sáng) ở đầu cánh
    E(9.2, wcy, 3.1, 1.6, D, { sep: true, max: 2, pat: (X, Y, k, col, p, u, v) => (u >= 11 && v >= wcy - 0.1 && v < wcy + 0.5 ? (v < wcy + 0.15 ? '#8aa8e0' : '#5a7ab8') : quill(D, wcy + 0.3)(X, Y, k, col, p, u, v)) }),
    E(4.6 + hx * 0.5, 5.4 + oy + hy * 0.5, 1.4, 2.4, D, { pat: fluff(D) }),
    E(4.5 + hx, 3.2 + oy + hy, 2, 1.8, D, { sep: true }),
    B(1 + hx, 3 + oy + hy, 3, 1, BL, { noise: 0, min: 2, pat: billPat(BL, 3 + oy + hy, [(1 + hx) * K + 3, (3 + oy + hy) * K]) }),
    B(1 + hx, 4 + oy + hy, 2, 1, BL, { noise: 0, max: 1 }),
  ]);
  duckEye(c.getContext('2d'), 4 + hx, 3 + oy + hy, pose, '#8a8c9e', '#6a6c7a', old ? (X, Y) => px(c.getContext('2d'), '#9a9caa', X - 1, Y - 1, 3, 1) : null);
  return c;
}

// ---------- VỊT CỒ ---------- non 10x8 · nhỡ 12x11 · trưởng thành 16x13 · già 16x13
// Đầu xanh lục ánh kim, vòng cổ trắng, ức nâu hạt dẻ, thân xám, lông đuôi đen vểnh.
function drake(stage, frame, pose = 'stand') {
  const sit = pose !== 'stand', sk = pose === 'sick' ? 1 : 0;
  // ánh kim: dải sáng chéo trên đầu xanh
  const irid = HDp => (X, Y, k) => (k >= 2 && (X + Y) % 4 === 0 ? HDp[3] : k === 1 && (X + Y) % 6 === 0 ? HDp[2] : undefined);
  if (stage === 'non') {
    const oy = sit ? 1 : 0;
    const cap = (X, Y, k, c, p, u, v) => (v < 2.4 + oy + sk ? '#7a6a14' : undefined);
    const c = fig(10, 8, [
      !sit && webFoot(frame ? 4 : 5, 6, 2, 1, P.billM, { min: 1 }),
      !sit && webFoot(7, frame ? 5 : 6, 2, 1, P.billM, { max: 1 }),
      E(5.9, 4.5 + oy, 3.5, 2, P.ducklingM, { pat: both((X, Y, k, c, p, u, v) => (v < 3.6 + oy && u >= 4 && u < 9 ? (X % 4 === 0 ? '#a08218' : '#8a6c10') : undefined), fluff(P.ducklingM)) }),
      E(8.8, 3.2 + oy, 0.9, 0.9, P.ducklingM),
      E(6.7, 4.5 + oy, 1.8, 1, P.ducklingM, { sep: true, max: 2, pat: fluff(P.ducklingM) }),
      E(3.6, 2.7 + oy + sk, 2, 1.8, P.ducklingM, { sep: true, pat: both(cap, fluff(P.ducklingM)) }),
      B(1, 3 + oy + sk, 2, 1, P.billM, { noise: 0, min: 2, pat: billPat(P.billM, 3 + oy + sk, [3, (3 + oy + sk) * K]) }),
      B(1, 4 + oy + sk, 2, 1, P.billM, { noise: 0, max: 1 }),
    ]);
    const x = c.getContext('2d');
    // vệt kẻ mắt sẫm
    duckEye(x, 3, 2 + oy + sk, pose, '#6a5a10', '#8a7a10', pose === 'sleep' ? null : (X, Y) => { px(x, '#7a6a14', X - 3, Y + 1, 3, 1); px(x, '#7a6a14', X + 2, Y + 1, 2, 1); });
    return c;
  }
  if (stage === 'nho') {
    const oy = sit ? 2 : 0;
    const c = fig(12, 11, [
      !sit && webFoot(frame ? 4 : 5, 9, 2, 1, P.billM, { min: 1 }),
      !sit && webFoot(frame ? 8 : 7, frame ? 8 : 9, 2, 1, P.billM, { max: 1 }),
      !sit && B(frame ? 5 : 6, 8, 1, 1, P.billM, { noise: 0, thin: true }),
      E(10.4, 4.3 + oy, 1, 1, P.drakeTail),
      E(6.6, 6.2 + oy, 4.1, 2.5, P.drakeBody, { pat: (X, Y, k) => (k >= 1 && hash(X * 7 + 3, Y * 13 + 1) < 0.16 ? P.drakeBody[k - 1] : undefined) }),
      E(7.4, 6 + oy, 2.5, 1.4, P.drakeBr, { sep: true, max: 2, pat: quill(P.drakeBr, 6 + oy) }),
      E(3.8, 4.6 + oy, 1.3, 1.9, P.drakeBody, { min: 2, pat: (X, Y, k, c, p, u, v) => (v > 5.2 + oy && hash(X, Y) < 0.4 ? P.drakeBr[2] : undefined) }),
      E(3.6, 2.9 + oy + sk, 1.9, 1.7, P.drakeHead, { sep: true, pat: irid(P.drakeHead) }),
      B(1, 3 + oy + sk, 2, 1, P.billM, { noise: 0, min: 2, pat: billPat(P.billM, 3 + oy + sk, [3, (3 + oy + sk) * K]) }),
    ]);
    duckEye(c.getContext('2d'), 3, 3 + oy + sk, pose, '#0b3620', '#1d8a52');
    return c;
  }
  const old = stage === 'gia';
  const HD = old ? fade(P.drakeHead, 0.3, '#9aa89e') : P.drakeHead, BD = old ? fade(P.drakeBody, 0.25) : P.drakeBody;
  const BR = old ? fade(P.drakeBr, 0.3) : P.drakeBr, TL = old ? fade(P.drakeTail, 0.28) : P.drakeTail, BL = old ? fade(P.billM, 0.3) : P.billM;
  const oy = sit ? 2 : 0, hy = (old ? 1 : 0) + sk * 2 + (pose === 'sleep' ? 2 : 0);
  const hx = pose === 'sleep' ? 2 : 0, td = old ? 1 : 0;
  // thân xám vân sóng mảnh (lông vịt cồ), cánh có gương xanh lam
  const vermic = (X, Y, k) => (k >= 1 && k <= 2 && (Y + ((X >> 1) & 1)) % 3 === 0 ? BD[k - 1] : undefined);
  const c = fig(16, 13, [
    !sit && webFoot(frame ? 5 : 6, 11, 2, 1, BL, { min: 1 }),
    !sit && webFoot(frame ? 11 : 10, frame ? 10 : 11, 2, 1, BL, { max: 1 }),
    !sit && B(frame ? 6 : 7, 10, 1, 1, BL, { noise: 0, thin: true }),
    E(13.9, 6.4 + oy + td, 1.8, 1.5, TL, { pat: (X, Y, k) => (k >= 1 && X % 3 === 0 ? TL[Math.min(3, k + 1)] : undefined) }),
    E(8.6, 7.8 + oy, 5.2, 3, BD, { pat: vermic }),
    E(9.4, 7.5 + oy, 3.3, 1.7, BD, { sep: true, max: 2, pat: (X, Y, k, col, p, u, v) => (u >= 11 && u < 14 && v >= 7.3 + oy && v < 8 + oy ? (v < 7.6 + oy ? '#6a8ade' : '#2f4f9e') : quill(BD, 7.8 + oy)(X, Y, k, col, p, u, v)) }),
    E(12.9, 4.8 + oy + td, 1.4, 1.1, TL, { sep: true, gloss: 0.6 }),
    E(11.7, 4.2 + oy + td, 0.7, 0.7, TL, { sep: true }),
    E(5.6, 7.7 + oy, 2, 2.2, BR, { sep: true, pat: scale(BR) }),
    E(4.8 + hx * 0.5, 5.9 + oy + hy * 0.5, 1.5, 2.4, BR, { pat: fluff(BR) }),
    B(3 + hx, 5 + oy + hy, 4, 1, P.collar, { noise: 0, min: 2, grow: 0.25, pat: (X, Y) => (Y === (5 + oy + hy) * K + 1 ? P.collar[1] : undefined) }),
    E(4.6 + hx, 3.2 + oy + hy, 2.1, 1.9, HD, { sep: true, pat: irid(HD) }),
    B(1 + hx, 3 + oy + hy, 3, 1, BL, { noise: 0, min: 2, pat: billPat(BL, 3 + oy + hy, [(1 + hx) * K + 3, (3 + oy + hy) * K]) }),
    B(1 + hx, 4 + oy + hy, 2, 1, BL, { noise: 0, max: 1 }),
  ]);
  const x = c.getContext('2d');
  duckEye(x, 4 + hx, 3 + oy + hy, pose, '#0b3620', '#115c38', old ? (X, Y) => px(x, '#b0bcb4', X - 1, Y - 1, 3, 1) : null);
  return c;
}

// ---------- CHÓ MỰC ---------- non 12x11 · nhỡ 16x13 · trưởng thành 19x15 · già 19x15 (mới gấp đôi)
// Lông đen tuyền ánh xanh: vệt lông sáng ngắn theo chiều xuôi, mõm/má bạc ở chó già.
const fur = r => (X, Y, k) => (k === 2 && hash(X * 5 + 1, (Y >> 1) * 9 + 4) < 0.1 ? r[3] : k === 1 && hash(X * 5 + 1, (Y >> 1) * 9 + 4) < 0.07 ? r[2] : k === 2 && hash(X * 3, Y * 7) < 0.12 ? r[1] : undefined);
const grizzle = (cond, base) => (X, Y, k, col, p, u, v) => (cond(u, v) ? P.dogG[1 + (hash(X * 7, Y * 3) < 0.45 ? 1 : 0) + (k >= 2 ? 1 : 0)] : base ? base(X, Y, k) : undefined);
const dogGray = (hX, hY) => grizzle((u, v) => u < hX - 0.4 || v > hY + 1, fur(P.dog));
const furD = fur(P.dog);

// mắt hổ phách 2×2: điểm sáng trên-trái, con ngươi tối dưới-phải
function dogEye(x, ex, ey, mode, old) {
  const X = ex * K, Y = ey * K;
  if (mode === 'sleep') { px(x, '#5a5a6a', X - 1, Y + 1, 3, 1); return; }
  if (mode === 'sick') { R2(x, '#b07a30', ex, ey); px(x, '#6a4a20', X + 1, Y + 1); return; }
  R2(x, '#e09a3a', ex, ey); px(x, '#4a2a08', X + 1, Y + 1); px(x, GLINT, X, Y); px(x, '#f8c060', X + 1, Y);
  if (old) px(x, P.dogG[3], X - 1, Y - 1, 3, 1);
}
function dogNose(x, nX, nY) { R2(x, '#08080c', nX, nY); px(x, '#7a7a92', nX * K, nY * K); }
function dogTongue(x, X, Y, len = 2) { px(x, '#f07a8a', X, Y, 2, len); px(x, '#ffb0bc', X, Y); px(x, '#d8566a', X + 1, Y + len - 1); px(x, '#d8566a', X, Y + len, 2, 1); px(x, '#a8405a', X, Y + len); }
// vòng cổ đỏ dọc (đứng) hay ngang (ngồi), thẻ tên vàng
function dogCollar(x, cX, cY, horiz) {
  if (horiz) {
    px(x, '#c0302a', (cX - 2) * K, (cY + 1) * K, 6, 2); px(x, '#e85a44', (cX - 2) * K, (cY + 1) * K, 5, 1); px(x, '#8a1a14', (cX - 2) * K + 5, (cY + 1) * K + 1);
    px(x, '#f7d547', (cX - 1) * K, (cY + 2) * K, 2, 2); px(x, '#fff3a0', (cX - 1) * K, (cY + 2) * K); px(x, '#b07a10', (cX - 1) * K + 1, (cY + 2) * K + 1);
  } else {
    px(x, '#c0302a', cX * K, cY * K, 2, 6); px(x, '#e85a44', cX * K, cY * K, 1, 5);
    const tx = cX - 1 < 0 ? cX : cX - 1;
    px(x, '#f7d547', tx * K, (cY + 2) * K, 2, 2); px(x, '#fff3a0', tx * K, (cY + 2) * K); px(x, '#b07a10', tx * K + 1, (cY + 2) * K + 1);
  }
}

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
  const [bx, by, brx, bry] = s.body, [hX, hY, hrx, hry] = s.head, [nx, ny, nrx, nry] = s.snout;
  const legs = pose === 'stand' ? quadLegs({ ...s.legs, r: D, frame, slow: old }) : [];
  const parts = [...legs];
  const tY = by - bry + oy + (old ? 1 : 0);
  const tailPat = (X, Y, k) => (k >= 1 && (X + Y) % 3 === 0 ? D[Math.min(3, k + 1)] : undefined);
  if (s.tail === 'stub') parts.push(E(bx + brx + 0.4, tY + 0.8, 0.8, 1.2, D, { pat: tailPat }));
  else if (s.tail === 'up') parts.push(E(bx + brx, tY - 0.4, 0.8, 2, D, { pat: tailPat }));
  else if (old || sit) parts.push(E(bx + brx + 0.6, by + oy, 0.9, 2.4, D, { max: 2, pat: tailPat }));
  else parts.push(E(bx + brx - 0.2, tY - 1.4, 1, 2.3, D, { pat: tailPat }), E(bx + brx - 1.4, tY - 3.2, 1.1, 0.9, D, { sep: true }));
  parts.push(E(bx, by + oy, brx, bry, D, { pat: furD, lift: -0.12 }));
  parts.push(E(bx - brx + 1.8, by + oy - 0.2, 2, bry + 0.4, D, { pat: furD, lift: -0.12 }));
  if (sick) parts.push(B(s.legs.fx - 3, s.h - 3, 3, 1, D, { sep: true, min: 1 }), B(s.legs.bx + 2, s.h - 3, 3, 1, D, { sep: true, min: 1 }));
  const eY = hY - hry + oy + hy;
  const earIn = (X, Y, k) => (k <= 1 && hash(X, Y) < 0.5 ? '#3a2a34' : undefined);   // lòng tai ửng nâu
  if (stage === 'non') parts.push(E(hX + 2.2, eY + 2.4, 1, 1.9, D, { sep: true, max: 1 }));
  else if (stage === 'nho') parts.push(E(hX + 1.4, eY + 0.2, 0.8, 1.3, D), E(hX + 2.4, eY + 0.8, 1, 0.8, D, { max: 1, pat: earIn }));
  else if (!old && !sick) parts.push(E(hX + 0.6, eY, 0.8, 1.7, D, { pat: (X, Y, k, c, p, u, v) => (u > hX + 0.5 && v > eY - 0.6 && v < eY + 1 ? '#3a2a34' : undefined) }), E(hX + 2.4, eY + 0.1, 0.8, 1.6, D, { max: 1 }));
  else parts.push(E(hX + 2, eY + 1, 1.2, 1.2, D, { max: 1 }));
  parts.push(E(hX, hY + oy + hy, hrx, hry, D, { sep: true, pat: old ? grizzle((u, v) => u < hX - 0.4 || v > hY + oy + hy + 1, furD) : furD }));
  if (stage === 'non') parts.push(E(hX + 2.3, eY + 2.6, 0.8, 1.6, D, { sep: true, max: 1 }));
  parts.push(E(nx, ny + oy + hy, nrx, nry, old ? G : D, { sep: true, lift: old ? 0 : 0.25 }));
  const c = fig(s.w, s.h, parts);
  const x = c.getContext('2d');
  if (stage !== 'non') dogCollar(x, Math.round(hX + 1), Math.round(hY + hry + oy + hy - 1), false);
  const nX = Math.round(nx - nrx), nY = Math.round(ny + oy + hy - nry);
  dogNose(x, nX, nY);
  for (const [e0, e1r] of s.eye) {
    const e1 = Math.round(e1r + oy + hy);
    if (pose === 'sleep') dogEye(x, e0, e1, 'sleep');
    else if (sick) { dogEye(x, e0, e1, 'sick'); px(x, '#606070', (e0 + (e0 < hX ? -1 : 1)) * K, (e1 - 1) * K + 1, 2, 1); }
    else dogEye(x, e0, e1, '', old);
  }
  if (!sit && stage === 'truong') dogTongue(x, (nX + 1) * K, (nY + 2) * K - 1);
  if (sick) { const X = (Math.round(hX + hrx) + 1) * K, Y = (Math.round(eY) + 1) * K; px(x, '#7ac8ff', X, Y, 2, 3); px(x, '#d8f0ff', X, Y); px(x, '#4a98d8', X + 1, Y + 2); }
  return c;
}

function dogEars(mode, hX, hY, hry) {
  const D = P.dog, eY = hY - hry;
  if (mode === 'cup') return { back: [E(hX + 2.2, eY + 2.4, 1, 1.9, D, { sep: true, max: 1 })], front: [E(hX + 2.3, eY + 2.6, 0.8, 1.6, D, { sep: true, max: 1 })] };
  if (mode === 'half') return { back: [E(hX + 1.4, eY + 0.2, 0.8, 1.3, D), E(hX + 2.4, eY + 0.8, 1, 0.8, D, { max: 1 })], front: [] };
  if (mode === 'ru') return { back: [E(hX + 2, eY + 1, 1.2, 1.2, D, { max: 1 })], front: [] };
  return { back: [E(hX + 0.6, eY, 0.8, 1.7, D, { pat: (X, Y, k, c, p, u, v) => (u > hX + 0.5 && v > eY - 0.6 && v < eY + 1 ? '#3a2a34' : undefined) }), E(hX + 2.4, eY + 0.1, 0.8, 1.6, D, { max: 1 })], front: [] };
}
function dogFace(x, o) {
  const old = o.stage === 'gia';
  const [nx, ny, nrx, nry] = o.snout, [hX, hY, , hry] = o.head;
  const nX = Math.round(nx - nrx), nY = Math.round(ny - nry);
  dogNose(x, nX, nY);
  for (const [ex, ey] of o.eyes) { dogEye(x, ex, ey, '', old); if (!old && o.brow) px(x, '#5c5c70', ex * K - 1, ey * K - 1, 3, 1); }
  if (o.stage !== 'non') dogCollar(x, Math.round(hX + 1), Math.round(hY + hry - 1), o.collarH);
  if (o.tongue) dogTongue(x, (nX + 1) * K, (nY + 2) * K, 3);
}

const SEAT = {
  non: { w: 10, h: 11, rump: [6.5, 7.8, 2.4, 2.4], chest: [4.5, 7.6, 1.8, 1.8], fl: [2, 7, 2, 3], head: [3.9, 3.4, 2.5, 2.3], snout: [1.5, 4.6, 1.2, 0.9], ear: 'cup', tail: [8.3, 8.4, 1.0, 1.0], eyes: [[3, 3], [5, 3]] },
  nho: { w: 12, h: 14, rump: [7.6, 9.8, 2.9, 3.0], chest: [5.2, 9.2, 2.0, 2.2], fl: [3, 8, 2, 5], head: [4.5, 4.2, 2.4, 2.2], snout: [1.7, 5.5, 1.3, 1.0], ear: 'half', tail: [9.8, 11.6, 1.2, 0.9], eyes: [[3, 4], [5, 4]] },
  truong: { w: 14, h: 16, rump: [9.0, 11.2, 3.2, 3.3], chest: [6.0, 10.6, 2.2, 2.5], fl: [4, 9, 2, 6], head: [4.8, 4.8, 2.8, 2.5], snout: [1.9, 6.2, 1.6, 1.1], ear: 'up', tail: [11.2, 13.6, 1.4, 0.9], eyes: [[3, 4], [6, 4]], tongue: true },
  gia: { w: 14, h: 16, rump: [9.0, 11.4, 3.1, 3.2], chest: [6.0, 11.2, 2.1, 2.3], fl: [4, 10, 2, 5], head: [4.9, 6.4, 2.7, 2.4], snout: [2.0, 7.7, 1.6, 1.1], ear: 'ru', tail: [11.2, 14.0, 1.3, 0.8], eyes: [[3, 6], [6, 6]] },
};
// bàn chân trước: hàng dưới tối, kẽ ngón
const paw = (r, bottomY) => (X, Y, k) => (Y >= bottomY ? (X % 3 === 0 ? r[0] : r[1]) : undefined);
function dogSeat(stage, f, beg) {
  const D = P.dog, s = SEAT[stage], old = stage === 'gia';
  const [bx, by, brx, bry] = s.rump, [ccx, ccy, crx, cry] = s.chest;
  const [hX, hY, hrx, hry] = s.head, [nx, ny, nrx, nry] = s.snout;
  const [lx, ly, lw, lh] = s.fl;
  const ear = dogEars(s.ear, hX, hY, hry);
  const wag = f ? 0.7 : 0, lift = beg ? (f ? 3 : 2) : 0;
  const pawY = (ly + lh) * K;
  const c = fig(s.w, s.h, [
    E(s.tail[0], s.tail[1] - wag, s.tail[2], s.tail[3], D, { max: 2 }),
    E(bx, by, brx, bry, D, { pat: furD, lift: -0.12 }),
    B(lx, ly, lw, lh, D, { max: 1, pat: paw(D, pawY) }),
    !beg && B(lx + 1, ly, lw, lh, D, { sep: true, min: 1, pat: both(paw(D, pawY), (X, Y, k) => (k >= 1 && Y % 4 === 1 && X % 2 ? D[2] : undefined)) }),
    E(ccx, ccy, crx, cry, D, { pat: furD, lift: -0.12 }),
    old && E(ccx + 0.8, ccy - cry + 0.3, 1.7, 1.2, D, { max: 1 }),
    ...ear.back,
    E(hX, hY, hrx, hry, D, { sep: true, pat: old ? dogGray(hX, hY) : furD }),
    ...ear.front,
    E(nx, ny, nrx, nry, old ? P.dogG : D, { sep: true, lift: old ? 0 : 0.25 }),
    beg && B(lx - 1, ly - lift, lw + 1, 2, D, { sep: true, min: 1, pat: (X, Y) => (X < (lx - 1) * K + 1 ? (Y % 2 ? D[0] : D[1]) : undefined) }),
  ]);
  dogFace(c.getContext('2d'), { stage, head: s.head, snout: s.snout, eyes: s.eyes, tongue: s.tongue && !beg, brow: beg, collarH: true });
  return c;
}

const HERD = {
  non: { w: 13, h: 9, by: 5.2, body: [6.8, 4.2, 1.7], sh: [3.8, -0.3, 1.8, 1.8], head: [3.2, -2.0, 2.0, 1.8], snout: [1.2, -0.9, 0.9, 0.7], tail: [11.6, -1.4, 0.7, 1.2], ear: 'cup', ll: 2, lw: 2, st: 2.6 },
  nho: { w: 16, h: 11, by: 6.4, body: [8.4, 5.2, 2.0], sh: [4.4, -0.3, 2.0, 2.2], head: [3.8, -2.3, 2.2, 2.0], snout: [1.5, -1.1, 1.1, 0.9], tail: [14.2, -1.8, 0.8, 1.6], ear: 'half', ll: 3, lw: 2, st: 3.6 },
  truong: { w: 20, h: 13, by: 7.4, body: [10.0, 6.6, 2.6], sh: [5.2, -0.4, 2.2, 2.6], head: [4.6, -2.6, 2.7, 2.4], snout: [1.9, -1.4, 1.4, 1.1], tail: [17.6, -2.4, 0.9, 2.0], ear: 'up', ll: 3, lw: 3, st: 4.8 },
  gia: { w: 20, h: 13, by: 7.8, body: [10.0, 6.2, 2.3], sh: [5.4, -0.5, 2.1, 2.4], head: [5.0, -2.2, 2.6, 2.3], snout: [2.3, -1.0, 1.4, 1.1], tail: [17.2, 0.2, 0.9, 1.4], ear: 'ru', ll: 3, lw: 3, st: 2.8 },
};
function dogGallop(stage, f) {
  const D = P.dog, s = HERD[stage], old = stage === 'gia';
  const by = s.by - (f ? 0.8 : 0);
  const lt = s.h - 1 - s.ll;
  const mid = s.w / 2;
  const legs = f
    ? [B(Math.round(mid - 3.2), lt, s.lw, s.ll, D, { max: 1, gx: 0 }), B(Math.round(mid + 1.0), lt, s.lw, s.ll, D, { max: 1, gx: 0 }),
      B(Math.round(mid - 2.0), lt, s.lw, s.ll, D, { sep: true, min: 1, gx: 0 }), B(Math.round(mid + 2.0), lt, s.lw, s.ll, D, { sep: true, min: 1, gx: 0 })]
    : [B(Math.round(mid - s.st - 2), lt, s.lw + 1, s.ll - 1, D, { max: 1, gx: 0 }), B(Math.round(mid + s.st - 1), lt, s.lw + 1, s.ll - 1, D, { max: 1, gx: 0 }),
      B(Math.round(mid - s.st - 1), lt + 1, s.lw + 1, s.ll - 1, D, { sep: true, min: 1, gx: 0 }), B(Math.round(mid + s.st), lt + 1, s.lw + 1, s.ll - 1, D, { sep: true, min: 1, gx: 0 })];
  const head = [s.head[0], by + s.head[1], s.head[2], s.head[3]];
  const snout = [s.snout[0], by + s.snout[1], s.snout[2], s.snout[3]];
  const ear = dogEars(s.ear, head[0], head[1], head[3]);
  const c = fig(s.w, s.h, [
    ...legs,
    E(s.tail[0], by + s.tail[1], s.tail[2], s.tail[3], D, { max: 2 }),
    E(s.body[0], by, s.body[1], s.body[2], D, { pat: furD, lift: -0.12 }),
    old && E(s.body[0] + 2.2, by - s.body[2] + 0.5, 1.9, 1.3, D, { max: 1 }),
    E(s.sh[0], by + s.sh[1], s.sh[2], s.sh[3], D, { pat: furD, lift: -0.12 }),
    ...ear.back,
    E(head[0], head[1], head[2], head[3], D, { sep: true, pat: old ? dogGray(head[0], head[1]) : furD }),
    ...ear.front,
    E(snout[0], snout[1], snout[2], snout[3], old ? P.dogG : D, { sep: true, lift: old ? 0 : 0.25 }),
  ]);
  const hy = Math.round(head[1]);
  dogFace(c.getContext('2d'), { stage, head, snout, eyes: [[Math.round(head[0] - 1.6), hy - 1], [Math.round(head[0] + 0.4), hy - 1]], tongue: stage === 'truong' });
  return c;
}

const BARK = {
  non: { w: 12, h: 11, body: [7.4, 6.4, 3.3, 2.1], head: [4.0, 3.8, 2.8, 2.6], snout: [1.8, 4.9, 1.1, 0.8], jaw: [2.5, 6.4, 1.8, 0.7], ear: 'cup', legs: { fx: 4, bx: 8, top: 8, len: 2 }, tail: [10.6, 4.6, 0.8, 1.3], eyes: [[3, 3], [5, 3]] },
  nho: { w: 16, h: 13, body: [9.4, 7.0, 4.6, 2.3], head: [4.6, 4.0, 2.6, 2.4], snout: [1.9, 5.1, 1.4, 1.0], jaw: [2.9, 6.8, 2.2, 0.8], ear: 'half', legs: { fx: 4, bx: 11, top: 9, len: 3 }, tail: [14.2, 4.6, 0.8, 1.9], eyes: [[3, 3], [5, 3]] },
  truong: { w: 19, h: 15, body: [11, 8.0, 5.6, 2.8], head: [5.0, 4.2, 2.9, 2.6], snout: [2.0, 5.3, 1.6, 1.0], jaw: [3.4, 7.4, 2.6, 0.9], ear: 'up', legs: { fx: 5, bx: 13, top: 10, len: 4 }, tail: [17.0, 4.8, 1.0, 2.2], eyes: [[3, 3], [6, 3]] },
  gia: { w: 19, h: 15, body: [11, 8.4, 5.4, 2.6], head: [5.2, 5.6, 2.9, 2.5], snout: [2.2, 6.8, 1.6, 1.0], jaw: [3.6, 8.8, 2.5, 0.9], ear: 'ru', legs: { fx: 5, bx: 13, top: 10, len: 4 }, tail: [16.8, 8.6, 1.3, 1.1], eyes: [[3, 5], [6, 5]] },
};
// miệng há: lòng miệng đỏ sẫm + răng nanh trắng + lưỡi
function mouth(x, X, Y) {
  px(x, '#5a1a20', X - 1, Y - 1, 4, 2); px(x, '#f07a8a', X, Y, 3, 1); px(x, '#ffb0bc', X, Y);
  px(x, '#ffffff', X - 1, Y - 1); px(x, '#ffffff', X + 3, Y - 1);
}
function dogBarkPose(stage, f) {
  const D = P.dog, s = BARK[stage], old = stage === 'gia';
  const [bx, by, brx, bry] = s.body;
  const [hX, hY, hrx, hry] = s.head, [jx, jy, jrx, jry] = s.jaw;
  const up = f ? 1 : 0;
  const snout = [s.snout[0], s.snout[1] - up, s.snout[2], s.snout[3]];
  const ear = dogEars(s.ear, hX, hY, hry);
  const c = fig(s.w, s.h, [
    ...quadLegs({ ...s.legs, r: D, frame: f, slow: old }),
    E(s.tail[0], s.tail[1] - (f ? 0.8 : 0), s.tail[2], s.tail[3], D, { max: 2 }),
    E(bx, by, brx, bry, D, { pat: furD, lift: -0.12 }),
    old && E(bx + 2.2, by - bry + 0.4, 1.9, 1.3, D, { max: 1 }),
    E(bx - brx + 1.8, by - 0.2, 2, bry + 0.4, D, { pat: furD, lift: -0.12 }),
    E(jx, jy, jrx, jry, old ? P.dogG : D, { sep: true, max: 1 }),
    ...ear.back,
    E(hX, hY, hrx, hry, D, { sep: true, pat: old ? dogGray(hX, hY) : furD }),
    ...ear.front,
    E(snout[0], snout[1], snout[2], snout[3], old ? P.dogG : D, { sep: true, lift: old ? 0 : 0.25 }),
  ]);
  const x = c.getContext('2d');
  dogFace(x, { stage, head: s.head, snout, eyes: s.eyes.map(([a, b]) => [a, b - up]), brow: true });
  mouth(x, Math.round(jx - jrx + 1) * K, Math.round(jy - jry) * K);
  return c;
}

const CHASE = {
  non: { w: 14, h: 12, body: [7.8, 6.2, 3.6, 2.0], head: [3.6, 4.6, 2.7, 2.5], snout: [1.3, 5.6, 1.0, 0.8], jaw: [2.1, 6.9, 1.4, 0.6], st: 2, lift: 1, tail: [11.6, 4.8, 0.9, 0.8] },
  nho: { w: 18, h: 13, body: [9.4, 6.0, 4.8, 2.1], head: [4.0, 4.0, 2.4, 2.2], snout: [1.6, 5.0, 1.2, 0.9], jaw: [2.5, 6.3, 1.7, 0.6], st: 3, lift: 1, tail: [15.4, 4.3, 1.6, 0.6] },
  truong: { w: 22, h: 15, body: [11, 7.4, 5.8, 2.5], head: [4.6, 5.0, 2.8, 2.5], snout: [1.8, 6.2, 1.5, 0.9], jaw: [2.8, 7.6, 2.0, 0.7], st: 4, lift: 1, tail: [18.4, 5.4, 2.0, 0.8] },
  gia: { w: 22, h: 15, body: [11, 7.8, 5.6, 2.3], head: [5.0, 6.0, 2.8, 2.4], snout: [2.1, 7.2, 1.5, 0.9], jaw: [3.1, 8.5, 1.9, 0.7], st: 3, lift: 0.6, tail: [17.4, 8.4, 1.3, 1.0] },
};
function legRows(ax, ay, fx, fy, r, near, lw = 2) {
  const n = Math.max(1, fy - ay), xs = [];
  for (let i = 0; i <= n; i++) xs.push(Math.round(ax + (fx - ax) * i / n));
  return xs.map((x0, i) => {
    const x1 = xs[i + 1] ?? x0;
    return B(Math.min(x0, x1), ay + i, lw + Math.abs(x1 - x0), 1, r, near ? { sep: true, min: 1, noise: 0, gx: 0.5 } : { max: 1, noise: 0, gx: 0 });
  });
}
function dogChase(stage, f) {
  const D = P.dog, s = CHASE[stage], old = stage === 'gia';
  const up = f === 1 ? -s.lift : 0, dip = f === 2 ? 0.6 : 0;
  const [bx, by0, brx, bry] = s.body, by = by0 + up;
  const head = [s.head[0], s.head[1] + up + dip, s.head[2], s.head[3]];
  const snout = [s.snout[0], s.snout[1] + up + dip, s.snout[2], s.snout[3]];
  const jaw = [s.jaw[0], s.jaw[1] + up + dip + (f === 1 ? 0.3 : 0), s.jaw[2], s.jaw[3]];
  const [hX, hY, , hry] = head, eY = hY - hry;
  const g = s.h - 2, ay = Math.round(by + bry - 1), st = s.st, k = Math.floor(st / 2);
  const sh = Math.round(bx - brx + 1.5), hp = Math.round(bx + brx - 2.5);
  const FEET = [
    { ff: [-st, 1], fn: [-st - 1, 0], hf: [st, 0], hn: [st + 1, 1] },
    { ff: [k, 0], fn: [k - 1, 1], hf: [-k, 0], hn: [1 - k, 1] },
    { ff: [-1, 0], fn: [0, 0], hf: [st - 1, 0], hn: [st, 1] },
  ][f];
  const leg = (ax, [dx, lift], near) => legRows(ax, ay, Math.max(0, Math.min(s.w - 2, ax + dx)), g - lift, D, near);
  const ears = {
    non: [E(hX + 2.0, eY + 1.4 - (f === 1 ? 0.8 : 0), 1.4, 0.9, D, { sep: true, max: 1 })],
    nho: [E(hX + 1.7, eY + 0.4, 1.4, 0.7, D), E(hX + 3.1, eY + 0.7, 0.8, 0.5, D, { max: 1 })],
    truong: [E(hX + 1.5, eY + 0.2, 1.8, 0.8, D, { pat: (X, Y, kk, c, p, u, v) => (v > eY + 0.3 && u < hX + 2.6 ? '#3a2a34' : undefined) }), E(hX + 2.9, eY + 0.6, 1.3, 0.6, D, { max: 1 })],
    gia: [E(hX + 2.0, eY + 1.3 - (f === 1 ? 0.4 : 0), 1.4, 1.1, D, { max: 1 })],
  }[stage];
  const front = stage === 'non' ? ears : [], back = stage === 'non' ? [] : ears;
  const wav = f === 1 ? 0.6 : f === 2 ? -0.3 : 0;
  const [tx, ty, trx, tr] = s.tail;
  // gió tạt: vệt lông bay ngược trên lưng
  const windFur = (X, Y, kk, c, p, u, v) => (kk >= 2 && v < by - bry * 0.3 && (X - Y * 2) % 7 === 0 ? D[3] : furD(X, Y, kk));
  const c = fig(s.w, s.h, [
    ...leg(sh + 1, FEET.ff, false), ...leg(hp + 1, FEET.hf, false),
    E(tx, ty + up + (old ? 0 : -wav), trx, tr, D, { max: 2, pat: (X, Y, kk) => (kk >= 1 && (X + Y) % 3 === 0 ? D[kk + 1] : undefined) }),
    stage === 'truong' && E(tx + trx - 0.4, ty + up - wav - 0.6, 0.8, 0.6, D, { max: 2 }),
    E(bx, by, brx, bry, D, { pat: windFur }),
    f === 1 && !old && E(bx + 0.6, by - bry + 0.5, brx * 0.6, 0.9, D, { pat: furD, lift: -0.12 }),
    old && E(bx + 2.2, by - bry + 0.4, 1.9, 1.3, D, { max: 1 }),
    E(bx - brx + 1.8, by - 0.2, 2, bry + 0.4, D, { pat: furD, lift: -0.12 }),
    ...leg(sh, FEET.fn, true), ...leg(hp, FEET.hn, true),
    E(jaw[0], jaw[1], jaw[2], jaw[3], old ? P.dogG : D, { sep: true, max: 1 }),
    ...back,
    E(head[0], head[1], head[2], head[3], D, { sep: true, pat: old ? dogGray(head[0], head[1]) : furD }),
    ...front,
    E(snout[0], snout[1], snout[2], snout[3], old ? P.dogG : D, { sep: true, lift: old ? 0 : 0.25 }),
  ]);
  const x = c.getContext('2d'), hy = Math.round(hY);
  dogFace(x, { stage, head, snout, eyes: [[Math.round(hX - 1.6), hy - 1], [Math.round(hX + 0.4), hy - 1]], brow: true });
  mouth(x, Math.round(jaw[0] - jaw[2] + 1) * K, Math.round(jaw[1] - jaw[3]) * K);
  return c;
}
const byStage = fn => Object.fromEntries(STAGES.map(st => [st, pair(f => fn(st, f))]));
const byStage3 = fn => Object.fromEntries(STAGES.map(st => { const left = [0, 1, 2].map(f => fn(st, f)); return [st, { left, right: left.map(flip) }]; }));

// ---------- MÈO MƯỚP VÀNG ---------- non 10x9 · nhỡ 13x11 · trưởng thành 16x13 · già 16x13 (mới gấp đôi)
// sọc mướp chéo 1 ô cũ (2px mới) cách 3 ô; viền sọc mềm bằng sắc tối của lông
const tabby = (STR, C, cond = () => true) => (X, Y, k, col, p, u, v) => {
  if (k >= 3 || !cond(u, v)) return undefined;
  const m = (X + Math.round(Y * 0.4)) % 6;
  return m < 2 ? STR : m === 2 && k >= 1 ? C[k - 1] : undefined;
};
const rings = STR => (X, Y) => (Y % 4 < 2 ? STR : undefined);
const ringsX = STR => X => (X % 4 < 2 ? STR : undefined);
// mắt mèo: lục, con ngươi khe dọc, điểm sáng; mèo con mắt tròn đen láy
function catEye(x, ex, ey, mode, old, kit) {
  const X = ex * K, Y = ey * K;
  if (mode === 'sleep') { px(x, '#7a3a14', X - 1, Y + 1, 3, 1); px(x, '#7a3a14', X - 1, Y); return; }
  if (mode === 'sick') { R2(x, '#4a8a2a', ex, ey); px(x, '#7a3a14', X, Y - 1, 2, 2); px(x, '#1a2a0a', X + 1, Y + 1); return; }
  if (kit) { R2(x, EYE, ex, ey); px(x, GLINT, X, Y); return; }
  R2(x, old ? '#a8b860' : '#8ad84a', ex, ey); px(x, '#1a2a0a', X + 1, Y, 1, 2); px(x, GLINT, X, Y); px(x, old ? '#7a8a40' : '#5aa82a', X, Y + 1);
}
const catNose = (x, X, Y) => { px(x, P.pink, X, Y, 2, 1); px(x, '#ffb8c4', X, Y); px(x, '#a8505a', X + 1, Y + 1); };
const whisk = (x, X0, Y) => { px(x, '#fff8ea', X0, Y, 4, 1); px(x, '#e8dcc8', X0, Y + 2, 3, 1); px(x, '#fff8ea', X0 + 3, Y + 1); };
// tai mèo nhọn: lòng tai hồng (chỉ tai gần)
const earPink = (a, b) => (X, Y) => (X >= a * K && X <= a * K + 1 && Y >= b * K + 1 && Y <= b * K + 2 ? '#e88a8a' : undefined);

const catPal = stage => (stage === 'gia'
  ? { C: fade(P.cat, 0.3, '#e0c8a8'), STR: '#b07a48', W: fade(P.cream, 0.25, '#e8e0d4') }
  : { C: P.cat, STR: '#9a4410', W: P.cream });

function cat(stage, frame, pose = 'stand') {
  const old = stage === 'gia', sit = pose !== 'stand', sick = pose === 'sick';
  const { C, W, STR } = catPal(stage);
  const S = {
    non: { w: 10, h: 9, body: [6, 5.4, 2.8, 1.8], head: [3.4, 3.9, 2.3, 2.1], legs: { fx: 3, bx: 6, top: 7, len: 1, w: 1 }, tail: [8.4, 3.6, 0.7, 1.6] },
    nho: { w: 13, h: 11, body: [7.6, 6.3, 3.8, 2], head: [3.8, 4.2, 2.4, 2.2], legs: { fx: 4, bx: 8, top: 8, len: 2, w: 1 }, tail: [11.2, 3.6, 0.7, 2.4] },
    truong: { w: 16, h: 13, body: [9, 7.6, 4.8, 2.4], head: [4.2, 4.9, 2.7, 2.4], legs: { fx: 4, bx: 11, top: 9, len: 3 }, tail: [14, 4.4, 0.8, 3] },
  };
  const s = S[old ? 'truong' : stage];
  const oy = sit ? s.legs.len : 0, hy = (old ? 1 : 0) + (sick ? 1.5 : 0) + (pose === 'sleep' ? 1.5 : 0);
  const [bx, by, brx, bry] = s.body, [hX, hY, hrx, hry] = s.head;
  const stripes = tabby(STR, C, (u, v) => v < by + oy + bry * 0.6);
  const legs = pose === 'stand' ? quadLegs({ ...s.legs, r: C, frame, slow: old, far: 1, hoof: [C[1], W[2]] }) : [];
  const [tx, ty, trx, tr] = s.tail;
  const tail = sit
    ? [E(bx + brx - 0.5, by + bry + oy - 0.3, 2.4, 0.8, C, { pat: ringsX(STR) })]
    : old ? [E(tx + 0.5, by + oy, trx, tr * 0.6, C, { pat: rings(STR) })]
      : [E(tx, ty + oy, trx, tr, C, { pat: rings(STR) }), E(tx - 0.8, ty - tr + 0.6 + oy, 0.9, 0.9, C, { sep: true, pat: (X, Y, k) => (k >= 2 ? undefined : STR) })];
  const eY = hY - hry + oy + hy;
  const ea = Math.round(hX - hrx + 0.6), eb = Math.round(eY) - 1;
  const c = fig(s.w, s.h, [
    ...legs,
    ...(sit ? [] : tail),
    E(bx, by + oy, brx, bry, C, { pat: both(stripes, fluff(C)) }),
    E(bx - brx + 1.4, by + oy + 0.5, 1.6, bry * 0.7, W, { sep: false, max: 2, pat: fluff(W) }),
    ...(sit ? tail : []),
    sick && B(s.legs.fx - 2, s.h - 3, 2, 1, C, { sep: true }),
    B(ea, eb, 2, 2, C, { noise: 0, pat: earPink(ea, eb) }),
    B(ea, Math.round(eY) - 2, 1, 1, C, { noise: 0, min: 2, gx: 0 }),
    B(Math.round(hX + hrx - 2.2), eb, 2, 2, C, { noise: 0, max: 1 }),
    B(Math.round(hX + hrx - 1.2), Math.round(eY) - 2, 1, 1, C, { noise: 0, max: 1, gx: 0 }),
    E(hX, hY + oy + hy, hrx, hry, C, {
      sep: true, sepUp: false,
      pat: (X, Y, k, col, p, u, v) => {
        const ry = v - (hY + oy + hy);
        if (ry > 0.4 && Math.abs(u - (hX - 0.3)) < 1.6) return W[Math.min(3, k + 1)];
        if (ry < -0.8 && X % 2 === 0 && (Math.floor(u) === Math.round(hX) || Math.floor(u) === Math.round(hX) - 2 || (ry < -1.4 && Math.floor(u) === Math.round(hX) - 1))) return STR;
        if (ry > -0.2 && ry < 0.4 && u > hX + 1.2 && Y % 2 === 0) return STR;   // sọc má
        return fluff(C)(X, Y, k);
      },
    }),
  ]);
  const x = c.getContext('2d');
  const ey = Math.round(hY + oy + hy - 0.4), e0 = Math.round(hX - 1.4), e1 = Math.round(hX + 0.8);
  catNose(x, Math.round(hX - 0.4) * K, (ey + 1) * K);
  for (const ex of [e0, e1]) catEye(x, ex, ey, pose === 'sleep' ? 'sleep' : sick ? 'sick' : '', old, stage === 'non');
  whisk(x, Math.max(0, Math.round((hX - hrx) * K) - 2), (ey + 1 < s.h ? ey + 1 : ey) * K + 1);
  if (sick) { const X = Math.round(hX + hrx) * K, Y = Math.round(eY) * K; px(x, '#7ac8ff', X, Y, 2, 3); px(x, '#d8f0ff', X, Y); px(x, '#4a98d8', X + 1, Y + 2); }
  return c;
}

const CAT_K = { non: 0.62, nho: 0.8, truong: 1, gia: 1 };
function catPounce(stage, f) {
  const k = CAT_K[stage], old = stage === 'gia', { C, W, STR } = catPal(stage);
  const z = v => v * k, Z = v => Math.round(v * k);
  const stripes = tabby(STR, C);
  const fly = f && !old;
  const c = fly
    ? fig(Z(18), Z(12), [
      B(Z(1), Z(6), Math.max(2, Z(3)), Math.max(1, Z(2)), C, { sep: true, min: 1, pat: (X, Y, kk, col, p, u) => (Math.floor(u) <= Z(1) ? (X % 2 ? W[1] : W[2]) : undefined) }),
      B(Z(13), Z(6), Math.max(2, Z(3)), Math.max(1, Z(2)), C, { max: 1 }),
      E(z(16), z(3.4), z(1.1), z(0.8), C, { pat: rings(STR) }),
      E(z(9.4), z(5.4), z(5), z(2), C, { pat: both(stripes, fluff(C)) }),
      B(Z(3), Z(1), 2, 2, C, { noise: 0, pat: earPink(Z(3), Z(1)) }), B(Z(6), Z(1), 2, 2, C, { noise: 0, max: 1 }),
      E(z(5), z(4.2), z(2.6), z(2.2), C, { sep: true, pat: (X, Y, kk, col, p, u, v) => (v >= Z(5) && u < Z(5) + 1 ? W[Math.min(3, kk + 1)] : fluff(C)(X, Y, kk)) }),
    ])
    : fig(Z(16), Z(12), [
      B(Z(4), Z(9), Math.max(2, Z(3)), Math.max(1, Z(2)), C, { min: 1, pat: (X, Y, kk, col, p, u, v) => (v > Z(9) + Math.max(1, Z(2)) - 0.1 ? W[2] : undefined) }),
      B(Z(11), Z(8), 2, Math.max(2, Z(3)), C, { max: 1 }),
      E(z(14), z(4.6), z(0.8), z(2.4), C, { pat: rings(STR) }),
      E(z(9.6), z(7.4), z(4.4), z(2.4), C, { pat: both(stripes, fluff(C)) }),
      B(Z(2), Z(4), 2, 2, C, { noise: 0, pat: earPink(Z(2), Z(4)) }), B(Z(5), Z(4), 2, 2, C, { noise: 0, max: 1 }),
      E(z(4.2), z(7.6), z(2.6), z(2.1), C, { sep: true, pat: (X, Y, kk, col, p, u, v) => (v >= Z(8) && u < Z(4) + 1 ? W[Math.min(3, kk + 1)] : fluff(C)(X, Y, kk)) }),
    ]);
  const x = c.getContext('2d');
  const ey = fly ? Z(4) : Z(7), eyes = fly ? [Z(3), Z(6)] : [Z(2), Z(5)];
  for (const ex of eyes) {   // mắt mở to khi vồ: đồng tử nở tròn
    R2(x, old ? '#a8b860' : '#9ae05a', ex, ey); px(x, EYE, ex * K + 1, ey * K, 1, 2); px(x, EYE, ex * K, ey * K + 1); px(x, GLINT, ex * K, ey * K);
  }
  catNose(x, (eyes[0] + 1) * K, (ey + 1) * K);
  return c;
}
function catNap(stage, f) {
  const k = CAT_K[stage], { C, W, STR } = catPal(stage);
  const z = v => v * k, Z = v => Math.round(v * k);
  const curl = tabby(STR, C);
  const c = fig(Z(16), Z(10), [
    E(z(8.6), z(5.6) + (f ? 0.2 : 0), z(6.2), z(3.2) + (f ? 0.3 : 0), C, { pat: both(curl, fluff(C)) }),
    E(z(10), z(8.2), z(4.6), z(0.9), C, { sep: true, pat: ringsX(STR) }),
    B(Z(3), Z(2), 2, 2, C, { noise: 0, pat: earPink(Z(3), Z(2)) }), B(Z(6), Z(2), 2, 2, C, { noise: 0, max: 1 }), B(Z(3), Z(1), 1, 1, C, { noise: 0, min: 2, gx: 0 }),
    E(z(4.8), z(5.4), z(2.8), z(2.4), C, { sep: true, pat: (X, Y, kk, col, p, u, v) => (v >= Z(6) && u < Z(5) + 1 ? W[Math.min(3, kk + 1)] : fluff(C)(X, Y, kk)) }),
    E(z(3.6), z(8.2), z(1.8), z(0.8), W, { sep: true, pat: (X, Y) => (Y === Math.round(z(8.2) * K) + 1 && X % 3 === 0 ? W[0] : undefined) }),   // bàn chân kẽ ngón
  ]);
  const x = c.getContext('2d');
  for (const ex of [Z(3), Z(6)]) { px(x, '#7a3a14', ex * K - 1, Z(5) * K + 1, 3, 1); px(x, '#7a3a14', ex * K + 2, Z(5) * K); }   // mắt nhắm cong
  catNose(x, Z(4) * K, Z(6) * K);
  if (stage === 'gia' && f) { const X = Z(8) * K - 1, Y = Z(1) * K - 1; px(x, '#cfe8ff', X, Y, 3, 3); px(x, '#ffffff', X, Y); px(x, '#8ab4dc', X + 2, Y + 2); }   // bong bóng ngáy
  return c;
}
// mèo đứng ngậm chuột (chuột xám, đuôi hồng lủng lẳng); khung 1 vênh mặt tự hào
function catMouse(stage, f) {
  const base = cat(stage, 0, 'stand'), k = CAT_K[stage];
  const mw = Math.max(4, Math.round(6 * k)), mh = Math.max(3, Math.round(5 * k));
  return draw(base.width, base.height, x => {
    x.drawImage(base, 0, 0);
    const m = fig(mw, mh, [
      E(mw * 0.45, mh * 0.5, mw * 0.3, mh * 0.26, P.rat, { pat: fluff(P.rat) }),
      E(mw * 0.27, mh * 0.24, 0.6, 0.6, P.rat, { lift: 0.3, pat: (X, Y, kk) => (kk >= 2 && X % 2 ? '#d88a9a' : undefined) }),
    ]);
    const my = Math.max(0, base.height / K - mh - 1);
    x.drawImage(m, 0, my * K);
    const t = f ? 1 : 0;
    px(x, P.pink, 0, (my + 2 + t) * K, 1, 4); px(x, P.pink, 1, (my + 4 + t) * K - 1); px(x, '#d87a8a', 2, Math.min(base.height / K - 1, my + 4) * K + 1, 2, 1);
    px(x, EYE, 4, (my + 1) * K, 2, 2); px(x, GLINT, 4, (my + 1) * K);
    if (f) for (const [sx, sy] of [[mw, 1], [mw + 2, 0], [mw + 4, 1]]) { px(x, '#fff3a0', sx * K, sy * K + 1, 2, 1); px(x, '#fff3a0', sx * K + 1 - 1 + 0, sy * K, 1, 1); px(x, '#ffffff', sx * K, sy * K + 1); }
  });
}
// cuộn len 7x7 → 14x14: vòng chỉ quấn cong, điểm sáng, sợi len thò ra (2 khung lăn)
function catYarn(f) {
  return draw(14, 14, x => {
    shadowO(x, 3, 6, 3, 1);
    const ball = pix(14, 14, (X, Y) => {
      const dx = (X + 0.5 - 7) / 5.6, dy = (Y + 0.5 - 7) / 5.6, r = dx * dx + dy * dy;
      if (r > 1) return null;
      const s = 0.3 - dx * 0.5 - dy * 0.7 - r * 0.3;
      const kk = s > 0.6 ? 3 : s > 0.1 ? 2 : s > -0.4 ? 1 : 0;
      const Y2 = ['#8a2a52', '#c0407a', '#e87aa8', '#ffc0d8'];
      // sợi quấn: các cung chéo đổi hướng theo khung lăn
      const w = f ? X + Y * 0.6 : X * 0.6 - Y + 14;
      if (Math.round(w) % 4 === 0) return Y2[Math.max(0, kk - 1)];
      return Y2[kk];
    });
    x.drawImage(outline(ball), 0, 0);
    px(x, '#ffe0ec', f ? 4 : 8, 4, 2, 1); px(x, '#ffffff', f ? 4 : 8, 4);
    // sợi len thò ra
    px(x, '#e87aa8', 12, f ? 10 : 8, 1, 2); px(x, '#c0407a', 13, f ? 11 : 9, 1, 2); px(x, '#e87aa8', 12, 12, 2, 1); px(x, '#c0407a', 13, 13);
  });
}
// chuột chiến lợi phẩm nằm dưới chân người chơi 9x6 → 18x12
function ratTrophy() {
  return draw(18, 12, x => {
    shadowO(x, 4, 5, 4, 1);
    const c = fig(8, 5, [E(4.4, 2.8, 2.6, 1.6, P.rat, { pat: fluff(P.rat) }), E(1.8, 1.8, 1, 1, P.rat, { lift: 0.3 })]);
    x.drawImage(c, 0, 0);
    px(x, '#d88a9a', 2, 2, 2, 2); px(x, '#f8b8c4', 2, 2);   // tai hồng
    px(x, EYE, 4, 4, 2, 1); px(x, EYE, 5, 3);               // mắt nhắm kiểu "x"
    px(x, P.pink, 1, 6);                                    // mũi
    line(x, P.pink, 14, 7, 16, 5); line(x, '#d87a8a', 16, 5, 17, 3); px(x, '#d87a8a', 15, 7);   // đuôi cong
  });
}
// bong bóng mèo chó cãi nhau 14x11 → 28x22: mây bụi, dấu chấm than, ngôi sao, nét giận
function spatBubble(f) {
  return draw(28, 22, x => {
    const cl = draw(28, 22, y => {
      for (const [cx, cy, r] of [[4, 5, 2.6], [9, 4, 2.2], [7, 7, 2]]) {
        const [X, Y, RX, RY] = eo(cx + (f ? 1 : 0), cy, r, r * 0.8);
        ellH(y, f ? '#fff0c0' : '#ffe08a', X, Y, RX, RY);
        ellH(y, f ? '#fff8e0' : '#fff0b0', X - RX * 0.3, Y - RY * 0.3, RX * 0.45, RY * 0.4);
      }
    });
    x.drawImage(outline(cl, '#8a5a2b', 0.25), 0, 0);
    px(x, '#e5452f', 9, 6, 2, 5); px(x, '#ff8a6a', 9, 6, 1, 4); px(x, '#e5452f', 9, 13, 2, 2);   // dấu !
    const sx = 19, sy = 7;   // ngôi sao 5 cánh nhỏ
    px(x, '#f7d547', sx, sy - 3, 1, 7); px(x, '#f7d547', sx - 3, sy, 7, 1); px(x, '#f7d547', sx - 1, sy - 1, 3, 3); px(x, '#fff8b0', sx, sy - 1); px(x, '#c89a1c', sx + 1, sy + 1);
    const g = f ? [22, 16] : [4, 18];   // nét giận
    px(x, '#3b2412', g[0], g[1], 2, 1); px(x, '#3b2412', g[0] + 1, g[1] + 1, 2, 1); px(x, '#3b2412', g[0] + (f ? 2 : -2), g[1] + 2, 2, 1);
  });
}

// ---------- TRỨNG & Ổ TRỨNG (lưới mới) ----------
// Quả trứng: đầu trên thon hơn, 4 sắc độ sáng từ trên-trái, điểm sáng bóng, viền 1px. spots: lấm tấm vỏ.
function eggH(W, H, cx, cy, rx, ry, ramp, spots = 0) {
  return outline(pix(W, H, (X, Y) => {
    const dy = (Y + 0.5 - cy) / ry, dx = (X + 0.5 - cx) / (rx * (1 + 0.12 * dy));
    if (dx * dx + dy * dy > 1) return null;
    const s = 0.3 - dx * 0.55 - dy * 0.7 - (dx * dx + dy * dy) * 0.3;
    if (s > 0.86) return '#ffffff';
    const k = s > 0.6 ? 3 : s > 0.1 ? 2 : s > -0.42 ? 1 : 0;
    if (spots && k >= 1 && hash(X * 11 + 5, Y * 7 + 2) < spots) return ramp[k - 1];
    return ramp[k];
  }));
}
// ngọn cỏ thon: gốc rộng w, chóp 1px, nghiêng lean; trái sáng, phải tối
function blade(x, bx, by, h, w, lean, [dk, md, lt]) {
  for (let i = 0; i < h; i++) {
    const t = i / h, ww = Math.max(1, Math.round(w * (1 - t * 0.85))), x0 = Math.round(bx + lean * t * t);
    for (let j = 0; j < ww; j++) px(x, j === ww - 1 && ww > 1 ? dk : j === 0 && (ww > 2 || t > 0.6) ? lt : md, x0 + j, by - i);
  }
}
// bụi cỏ sau ổ: nhiều ngọn chen nhau, cao giữa thấp hai bên
function tuft(y, G) {
  for (let i = 0; i <= 10; i++) {
    const h = Math.round(7 + 9 * Math.sin(Math.PI * (i + 0.5) / 11) - (i % 2) * 3);
    blade(y, 1 + i * 2, 17, h, 4, (i - 5) * 0.5 + (i % 2 ? 1 : -1), G);
  }
}
const layer = (W, H, fn, lit) => outline(draw(W, H, fn), OUT, lit);
const GRASS = ['#2f6b1f', '#3d8c2a', '#6cc048'], GRASS_D = ['#255e18', '#2f7a28', '#5aae40'];

function nestH(eggs, G) {
  return draw(24, 20, x => {
    shadowO(x, 6, 8, 5.6, 1.4);
    // bụi cỏ sau (có viền)
    x.drawImage(layer(24, 20, y => tuft(y, G)), 0, 0);
    for (const e of eggs) x.drawImage(e, 0, 0);
    // cỏ trước, mảnh, không viền
    for (const [gx, h, ln] of [[0, 3, 0], [2, 4, -1], [6, 3, 1], [9, 4, 1], [11, 2, 0]]) blade(x, gx * 2, 19, h * 2, 2, ln, [G[0], G[1], G[2]]);
  });
}
const EGG_W = ['#c9b48c', '#e4d4b2', '#f3ead2', '#fffaf0'];
// trứng gà trên đất (SPR.eggGround 6x7 → 12x14)
const eggGround = () => eggH(12, 14, 6, 7, 5, 6, EGG_W, 0.05);
function eggNest() {
  return nestH([
    eggH(24, 20, 11, 13, 4, 5, ['#d4bc94', '#ecdaba', '#fff4e0', '#ffffff'], 0.05),
    eggH(24, 20, 17, 15, 3.2, 3.6, ['#c8ae88', '#e2cca8', '#f4e2c4', '#fff8ea'], 0.05),
  ], GRASS);
}
function eggNestDuck() {
  return nestH([
    eggH(24, 20, 11, 13, 4.6, 5.6, ['#8fbe97', '#b4d8ba', '#d6ecd8', '#f6fff6']),
    eggH(24, 20, 17, 15, 3.6, 4, ['#88b490', '#a9cfae', '#cae4cd', '#eaf7ea']),
  ], GRASS_D);
}
function eggDuck() {
  return draw(18, 20, x => {
    shadowO(x, 8, 7, 3.4, 0.9);
    x.drawImage(eggH(18, 20, 9, 9, 6, 7.6, ['#7fae88', '#a6d0ad', '#bfe0c4', '#e4f4e6']), 0, 0);
  });
}
// phôi soi đèn: chấm đỏ đậm giữa, mạch máu mảnh tỏa ra
function embryo(x, cx, cy) {
  for (const [dx, dy, ex, ey] of [[-1, 0, -5, -2], [1, 0, 5, -3], [0, 1, -3, 4], [1, 1, 4, 3], [0, -1, 1, -5]]) line(x, '#e07a52', cx + dx, cy + dy, cx + ex, cy + ey);
  dots(x, '#f0a070', [[cx - 5, cy - 3], [cx + 5, cy - 4], [cx - 4, cy + 4]]);
  px(x, '#c0402a', cx - 1, cy - 1, 3, 3); px(x, '#9a2a1a', cx, cy, 2, 2); px(x, '#ff6a50', cx - 1, cy - 1);
}
function glow(x, cx, cy, rx, ry) {
  ellH(x, 'rgba(255,200,80,0.35)', ...eo(cx, cy, rx, ry));
  ellH(x, 'rgba(255,230,140,0.45)', ...eo(cx, cy, rx * 0.76, ry * 0.81));
}
function eggFertile() {
  return draw(22, 24, x => {
    glow(x, 5, 6, 5, 5.4);
    x.drawImage(eggH(22, 24, 11, 13, 5.2, 6.8, ['#e0b060', '#f4cc80', '#ffe2a0', '#fff4d0']), 0, 0);
    embryo(x, 11, 14);
  });
}
function eggDuckFertile() {
  return draw(24, 26, x => {
    glow(x, 5.5, 6.5, 5.4, 5.8);
    x.drawImage(eggH(24, 26, 12, 14, 5.8, 7.4, ['#a8c080', '#c6dc9c', '#dcecb4', '#f0f8d8']), 0, 0);
    embryo(x, 12, 15);
  });
}

// ---------- tổ hợp theo loài ----------
const STAGES = ['non', 'nho', 'truong', 'gia'];
const species = fn => Object.fromEntries(STAGES.map(st => [st, pair(f => fn(st, f))]));
const runner = fn => Object.fromEntries(STAGES.map(st => [st, pair(f => fn(st, f, 'run'))]));

// Nhuốm sắc xanh tái cho dáng bệnh (giữ nguyên viền tối).
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

const POSE = { ga: hen, gaTrong: rooster, vit: duck, vitDuc: drake, cho: dog, meo: cat };
const ANIMAL = Object.fromEntries(Object.entries(POSE).map(([k, fn]) => [k, species(fn)]));

export const SPR8 = {
  animal: ANIMAL,
  run: { ga: runner(hen), gaTrong: runner(rooster), vit: runner(duck) },
  sleep: {}, sick: {}, sleepBy: {}, sickBy: {},
  dogSitBy: byStage((st, f) => dogSeat(st, f, false)),
  dogBegBy: byStage((st, f) => dogSeat(st, f, true)),
  dogHerdBy: byStage(dogGallop),
  dogBarkBy: byStage(dogBarkPose),
  dogRunBy: byStage3(dogChase),
  catPounceBy: byStage(catPounce),
  catNapBy: byStage(catNap),
  catMouseBy: byStage(catMouse),
  catYarn: pair(catYarn),
  spatBubble: pair(spatBubble),
  ratTrophy: ratTrophy(),
  eggGround: eggGround(),
  eggNest: eggNest(),
  eggFertile: eggFertile(),
  eggDuck: eggDuck(),
  eggNestDuck: eggNestDuck(),
  eggDuckFertile: eggDuckFertile(),
};
// giữ nguyên tên cũ: trỏ tới bản giai đoạn trưởng thành
SPR8.dogHerd = SPR8.dogHerdBy.truong;
SPR8.dogSit = SPR8.dogSitBy.truong;
SPR8.dogBeg = SPR8.dogBegBy.truong;
SPR8.dogBark = SPR8.dogBarkBy.truong;
for (const [k, fn] of Object.entries(POSE)) {
  SPR8.sleepBy[k] = Object.fromEntries(STAGES.map(st => [st, fn(st, 0, 'sleep')]));
  SPR8.sickBy[k] = Object.fromEntries(STAGES.map(st => [st, sicken(fn(st, 0, 'sick'))]));
  SPR8.sleep[k] = SPR8.sleepBy[k].truong;
  SPR8.sick[k] = SPR8.sickBy[k].truong;
}
