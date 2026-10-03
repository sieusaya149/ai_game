// Art 2x (kiểu A) cho nền, thiên nhiên, đồ trang trí và biểu tượng. Mỗi sprite đúng 2w×2h của sprite cũ cùng khóa,
// giữ điểm neo (đáy chạm đất ở cùng chỗ). Phong cách theo art5.characterHD: viền tối 1px (mép hứng sáng trên-trái viền
// nhạt hơn), mỗi mảng màu 4 sắc độ, sáng từ trên-trái, điểm sáng ở mặt bóng, kết cấu nhẹ. Bảng màu giữ như bộ cũ.
//
// SPR12 gom khóa của nhiều bộ cũ; SPR12_FROM ghi khóa cấp trên nào thay cho bộ nào (hd.js tự dò theo tên khóa):
//   từ SPR  (art.js):  soil.{untilled,tilledWet,tilledDry}, plot, plotDry, wild, select, mud, tree, bush, tuft, flowers[3],
//                      problem.{weed,bug,dry}, deco.{deco_scarecrow,deco_flower,deco_lamp,deco_bench}, items.{seed_<16 cây> (8 túi cây
//                      mới do art4.js ghi thêm vào SPR.items), ...}, grain, bubble, sparkle, arrow, sign, status.{hungry,sick,heart,zzz,milk,wool,pregnant}
//   từ SPR2 (art2.js): bush, bushes[3], rock, rocks[3], stump, forestTile, forest[6], lampPost, bench, tools.{hoe,can,sickle,
//                      basket}[3], stamina, staminaTired, sweat[2], season.{xuan,ha,thu,dong}, seasonTag, slowSnail[2], wood, stone, guidebook, todo,
//                      giftIcon, alertArrow, barkBubble, dogChain, stunStars[3], barkArrow, sausage, sausageGround,
//                      badges.{helper,robber,guard}.{on,off}
//   từ SPR3 (art3.js): items.{soapBar,vaccine,medicine,treat,catfood,sausage,manure,feedSack}, status.{heart1..5,dirtyIcon,
//                      strayIcon,warn,hurtIcon,predIcon}, strayArrow, grainScatter, fx.{soap,splash,sparkleClean}, praise,
//                      trickIcon.{sit,follow,guard,herd,egg,bird}, cmdBubble, sniffMark, thiefBubble, punishIcon.{pay,chore},
//                      trainBar.{track,zone,mark}
//   Lưu ý: khóa trùng tên ở hai bộ (bush, bench, items, status, sausage) — hd.js nối theo từng bộ cũ có khóa đó và chỉ ghi
//   ảnh nào đúng cỡ 2x, nên mỗi khóa con chỉ khớp đúng bộ của nó.
//
// Nền ngoài trời không phải sprite mà vẽ từng điểm ảnh trong render.outdoorChunk; bản 2x là hàm landHD() bên dưới
// (cùng luật: viền đường đất theo ô kề, chọn màu theo băm toạ độ nên tất định và liền mạch qua mọi ô / mọi mảng).
import { canvas as rawCanvas, flip, hash, SPR } from './art.js';
import { ramp } from './art5.js';
import { SEEDPIC10 } from './art10.js';
import { GROUND } from './layout.js';

const canvas = (w, h) => { const c = rawCanvas(w, h); c.getContext('2d', { willReadFrequently: true }); return c; };
const OUT = '#26150e';

// ---------- tiện ích vẽ ----------
const hexN = h => parseInt(h.slice(1, 7), 16);
const rgba = col => { const n = hexN(col); return [n >> 16, (n >> 8) & 255, n & 255, col.length > 7 ? parseInt(col.slice(7, 9), 16) : 255]; };
const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function mix(a, b, t) { const A = rgba(a), B = rgba(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
const shade = (c, f) => { const A = rgba(c); return toHex(A[0] * f, A[1] * f, A[2] * f); };

function draw(w, h, fn) { const c = canvas(w, h); fn(c.getContext('2d'), c); return c; }
function R(x, col, px, py, w = 1, h = 1) { x.fillStyle = col; x.fillRect(px, py, w, h); }
function dots(x, col, list) { for (const [px, py] of list) R(x, col, px, py); }
function line(x, col, x0, y0, x1, y1, w = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) R(x, col, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, w);
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
// Tô từng điểm ảnh; màu '#rrggbb' hoặc '#rrggbbaa'
function pix(w, h, fn) {
  const c = canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h);
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const col = fn(px, py);
    if (col) img.data.set(rgba(col), (py * w + px) * 4);
  }
  x.putImageData(img, 0, 0);
  return c;
}
// Sprite dạng chữ; giá trị bảng màu có thể là hàm (px, py) => màu
function spr(rows, pal) {
  const W = Math.max(...rows.map(r => r.length));
  return pix(W, rows.length, (px, py) => { const v = pal[rows[py][px]]; return typeof v === 'function' ? v(px, py) : v || null; });
}
// Viền 1px quanh mọi điểm đục. Mép trên-trái hứng sáng: viền pha màu thân cho nhạt hơn (kiểu viền chọn lọc).
function outline(c, col = OUT, soft = 0.38) {
  const w = c.width, h = c.height, x = c.getContext('2d'), img = x.getImageData(0, 0, w, h), d = img.data;
  const A = (i, j) => (i >= 0 && j >= 0 && i < w && j < h ? d[(j * w + i) * 4 + 3] : 0);
  const out = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (A(i, j) > 200) continue;
    const r = A(i + 1, j) > 200, b = A(i, j + 1) > 200, l = A(i - 1, j) > 200, t = A(i, j - 1) > 200;
    if (!(r || b || l || t)) continue;
    let c2 = col;
    if (soft && (r || b) && !l && !t) {
      const o = r ? ((j * w + i + 1) * 4) : (((j + 1) * w + i) * 4);
      c2 = mix(col, toHex(d[o], d[o + 1], d[o + 2]), soft);
    }
    out.push([i, j, c2]);
  }
  for (const [i, j, c2] of out) R(x, c2, i, j);
  return c;
}
// Ramp 4 sắc của art5: [sáng, gốc, tối, rất tối]
const RP = base => ramp(base);
// Khối tròn chiếu sáng trên-trái, 4 sắc độ (+ điểm bóng nếu spec)
function ball(x, cx, cy, rx, ry, rp, { spec = false, noise = 0.08, seed = 0, hi = null } = {}) {
  for (let py = Math.floor(cy - ry - 1); py <= Math.ceil(cy + ry + 1); py++) for (let px = Math.floor(cx - rx - 1); px <= Math.ceil(cx + rx + 1); px++) {
    const dx = (px + 0.5 - cx) / rx, dy = (py + 0.5 - cy) / ry, d = dx * dx + dy * dy;
    if (d > 1) continue;
    const v = -dx * 0.5 - dy * 0.75 - d * 0.35 + 0.3 + (hash(px * 3 + seed, py * 5 + seed) - 0.5) * noise;
    let col = v > 0.5 ? rp[0] : v > 0.0 ? rp[1] : v > -0.45 ? rp[2] : rp[3];
    if (spec && Math.hypot(dx + 0.42, dy + 0.48) < 0.2) col = hi ?? mix(rp[0], '#ffffff', 0.6);
    R(x, col, px, py);
  }
}
// Hộp có cạnh sáng trên-trái, tối dưới-phải (đã gồm viền)
function box(x, px, py, w, h, rp, o = OUT) {
  R(x, o, px, py, w, h);
  R(x, rp[1], px + 1, py + 1, w - 2, h - 2);
  R(x, rp[0], px + 1, py + 1, w - 2, 1); R(x, rp[0], px + 1, py + 1, 1, h - 2);
  R(x, rp[2], px + 1, py + h - 2, w - 2, 1); R(x, rp[2], px + w - 2, py + 2, 1, h - 3);
}
// Nhiễu giá trị mượt (tất định theo toạ độ)
function vnoise(x, y, s, seed = 0) {
  const X = x / s, Y = y / s, i = Math.floor(X), j = Math.floor(Y), fx = X - i, fy = Y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(i + seed * 131, j), b = hash(i + 1 + seed * 131, j), c = hash(i + seed * 131, j + 1), d = hash(i + 1 + seed * 131, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const pair = fn => { const left = [fn(0), fn(1)]; return { left, right: left.map(flip) }; };

// =====================================================================
// NỀN NGOÀI TRỜI (thay phần paint() trong render.outdoorChunk)
// =====================================================================
// Cỏ: 3 mảng sắc độ lớn (nhiễu mượt) + khóm lá nhỏ thưa (2-3 điểm, gốc tối, ngọn sáng) + đốm hiếm. Độ tương phản thấp
// để con vật và cây trồng vẫn nổi.
const GRASS = [
  { b: '#67b142', d: '#539d35', l: '#7cc650' },
  { b: '#6cb846', d: '#57a438', l: '#84ce58' },
  { b: '#74c24d', d: '#5fae40', l: '#8dd65e' },
];
const TUFTS = [
  [[0, 0, 'd'], [0, -1, 'd'], [0, -2, 'l']],
  [[0, 0, 'd'], [-1, -1, 'd'], [1, -1, 'd'], [-1, -2, 'l'], [1, -2, 'l']],
  [[0, 0, 'd'], [1, 0, 'd'], [0, -1, 'd'], [-1, -2, 'l'], [1, -1, 'l']],
  [[0, 0, 'd'], [-1, 0, 'd'], [-1, -1, 'l'], [1, -1, 'd'], [1, -2, 'l']],
];
function grassPx(X, Y) {
  const p = vnoise(X, Y, 26, 7) + (hash(X >> 1, Y >> 1) - 0.5) * 0.05;
  const G = GRASS[p < 0.36 ? 0 : p > 0.68 ? 2 : 1];
  // khóm lá: lưới 6x7, mỗi ô tối đa một khóm nằm gọn trong ô
  const ci = Math.floor(X / 6), cj = Math.floor(Y / 7);
  if (hash(ci * 3 + 1, cj * 5 + 2) < 0.5) {
    const ax = ci * 6 + 1 + Math.floor(hash(ci, cj + 77) * 4), ay = cj * 7 + 2 + Math.floor(hash(ci + 55, cj) * 5);
    const t = TUFTS[Math.floor(hash(ci + 9, cj + 13) * TUFTS.length)];
    for (const [dx, dy, k] of t) if (ax + dx === X && ay + dy === Y) return G[k];
  }
  const n = hash(X * 3 + 11, Y * 7 + 3);
  if (n > 0.9975) return '#a3e070';
  if (n < 0.004) return '#4f9532';
  return G.b;
}
// Đường đất: viền tối, mép sáng, lòng đất có mảng và sỏi nhỏ; cỏ lấn mép đường lượn theo nhiễu (liền mạch qua ô)
const ROADC = { rim: '#a98b56', rim2: '#b99c66', edge: '#c3a571', edge2: '#d1b683', base: '#dcc490', patch: '#d6bb86', dk: '#c8ab77', lt: '#ecd9a8' };
function pebble(X, Y) {
  const ci = Math.floor(X / 9), cj = Math.floor(Y / 8);
  if (hash(ci * 7 + 3, cj * 11 + 1) >= 0.2) return null;
  const ax = ci * 9 + 2 + Math.floor(hash(ci, cj + 5) * 4), ay = cj * 8 + 2 + Math.floor(hash(ci + 3, cj) * 3);
  const big = hash(ci + 1, cj + 1) < 0.4, dx = X - ax, dy = Y - ay;
  if (big) {   // 3x2 + bóng
    if (dy === 2 && dx >= 0 && dx <= 2) return '#b89c68';
    if (dy < 0 || dy > 1 || dx < 0 || dx > 2) return null;
    return dx === 0 && dy === 0 ? '#f6ead0' : dy === 1 && dx === 2 ? '#a48a5a' : '#d8c8a0';
  }
  if (dy === 1 && (dx === 0 || dx === 1)) return dx === 1 ? '#b89c68' : '#c4ac7a';
  if (dy === 0 && dx === 0) return '#f2e4c4';
  if (dy === 0 && dx === 1) return '#cdb88a';
  return null;
}
// d = khoảng cách (điểm 2x) tới mép không phải đường
function roadPx(X, Y, d) {
  const w = Math.floor(vnoise(X, Y, 5, 13) * 3.2);   // cỏ lấn 0..2 điểm, lượn sóng
  if (d < w) return hash(X, Y) < 0.5 ? '#5d9f3d' : '#67b142';
  const e = d - w, n = hash(X, Y);
  if (e === 0) return ROADC.rim;
  if (e === 1) return n < 0.5 ? ROADC.rim2 : ROADC.edge;
  if (e === 2) return n < 0.6 ? ROADC.edge : ROADC.edge2;
  if (e === 3) return n < 0.5 ? ROADC.edge2 : ROADC.base;
  const pb = pebble(X, Y);
  if (pb) return pb;
  if (n < 0.045) return ROADC.dk;
  if (n > 0.975) return ROADC.lt;
  return vnoise(X, Y, 9, 21) < 0.33 ? ROADC.patch : ROADC.base;
}
function forestPx(X, Y) {
  const b = vnoise(X, Y, 14, 3), n = hash(X, Y);
  if (n < 0.05) return '#1f3d16';
  return b < 0.33 ? '#2c5520' : b > 0.7 ? '#36662a' : '#305c24';
}
function fieldPx(X, Y) {
  const n = hash(X, Y), b = vnoise(X, Y, 7, 5);
  if (n < 0.06) return '#6a4324';
  if (n > 0.985) return '#946a3e';
  // cục đất nhỏ: điểm sáng trên-trái, bóng dưới
  const ci = X >> 2, cj = Y >> 2;
  if (hash(ci + 3, cj + 8) < 0.12) { const lx = X & 3, ly = Y & 3; if (lx === 1 && ly === 1) return '#8c6236'; if (ly === 2 && lx >= 1 && lx <= 2) return '#62401f'; }
  return b < 0.35 ? '#744c28' : '#7b512b';
}
// Chuồng: đất nện phủ rơm (sợi rơm 3-4 điểm theo 3 hướng, có bóng)
function penPx(X, Y) {
  const ci = Math.floor(X / 6), cj = Math.floor(Y / 6);
  if (hash(ci * 5 + 2, cj * 3 + 7) < 0.42) {
    const ax = ci * 6 + 1 + Math.floor(hash(ci, cj + 3) * 2), ay = cj * 6 + 1 + Math.floor(hash(ci + 7, cj) * 3);
    const dir = Math.floor(hash(ci + 1, cj + 2) * 3), len = 3 + (hash(ci + 4, cj + 4) < 0.5 ? 1 : 0);
    for (let k = 0; k < len; k++) {
      const sx = ax + k, sy = dir === 0 ? ay : dir === 1 ? ay + (k >> 1) : ay + 1 - (k >> 1);
      if (X === sx && Y === sy) return k === 0 ? '#fff0a0' : k === len - 1 ? '#dcb13c' : '#efd067';
      if (X === sx && Y === sy + 1 && k > 0) return '#a9854f';
    }
  }
  const b = vnoise(X, Y, 8, 9), n = hash(X, Y);
  if (n < 0.04) return '#a9854f';
  return b < 0.3 ? '#bf9a60' : b > 0.76 ? '#d4b37a' : '#c9a56b';
}
function mudPx(X, Y) {
  const b = vnoise(X, Y, 8, 17), n = hash(X, Y);
  if (b < 0.3) return n > 0.97 ? '#6f4c2c' : '#5f3f23';
  if (n > 0.975) return '#8b6a44';
  if (n < 0.08) return '#654427';
  return '#6f4c2c';
}
// Canvas 2w×2h: nền của bản đồ m ở vùng điểm ảnh bản đồ (ox,oy)..(ox+w,oy+h). Ô ngoài bản đồ để trống.
export function landHD(m, ox, oy, w, h) {
  const { ground, mw: MW, mh: MH, W, H } = m;
  const gAt = (c, r) => (c < 0 || r < 0 || c >= MW || r >= MH) ? -1 : ground[r * MW + c];
  const isRoad = (c, r) => { const g = gAt(c, r); return g === GROUND.ROAD || g === -1; };
  const X0 = ox * 2, Y0 = oy * 2;
  return pix(w * 2, h * 2, (qx, qy) => {
    const X = qx + X0, Y = qy + Y0;
    if (X >= W * 2 || Y >= H * 2) return null;
    const tc = X >> 5, tr = Y >> 5, lx = X & 31, ly = Y & 31;
    const g = ground[tr * MW + tc];
    if (g === GROUND.ROAD) {
      let d = 99;
      if (!isRoad(tc - 1, tr)) d = Math.min(d, lx);
      if (!isRoad(tc + 1, tr)) d = Math.min(d, 31 - lx);
      if (!isRoad(tc, tr - 1)) d = Math.min(d, ly);
      if (!isRoad(tc, tr + 1)) d = Math.min(d, 31 - ly);
      for (const [dc, dr] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (!isRoad(tc + dc, tr + dr) && isRoad(tc + dc, tr) && isRoad(tc, tr + dr)) {
          d = Math.min(d, Math.max(dc < 0 ? lx : 31 - lx, dr < 0 ? ly : 31 - ly));
        }
      }
      return roadPx(X, Y, d);
    }
    if (g === GROUND.FOREST) return forestPx(X, Y);
    if (g === GROUND.FIELD) return fieldPx(X, Y);
    if (g === GROUND.PEN) return penPx(X, Y);
    if (g === GROUND.MUD) return mudPx(X, Y);
    // cỏ: sát đường đất thì sẫm lại một dải mềm 2-3 điểm
    let e = 99;
    if (gAt(tc - 1, tr) === GROUND.ROAD) e = Math.min(e, lx);
    if (gAt(tc + 1, tr) === GROUND.ROAD) e = Math.min(e, 31 - lx);
    if (gAt(tc, tr - 1) === GROUND.ROAD) e = Math.min(e, ly);
    if (gAt(tc, tr + 1) === GROUND.ROAD) e = Math.min(e, 31 - ly);
    if (e <= 2) { const n = hash(X + 5, Y + 9); if (n < [0.75, 0.45, 0.18][e]) return e === 0 ? '#5a9a3a' : '#5d9f3d'; }
    return grassPx(X, Y);
  });
}

// =====================================================================
// Ô ĐẤT TRỒNG (32x32 thay 16x16)
// =====================================================================
// Ô ruộng đã cuốc: luống đất chu kỳ 8 điểm (đỉnh luống sáng, sườn, bóng, rãnh), mép đỉnh luống lởm chởm, cục đất có
// điểm sáng; mép ô vát (trên-trái sáng, dưới-phải tối) như bộ cũ.
function tilledTile(P, seed, dry) {
  return pix(32, 32, (px, py) => {
    const n = hash(px + seed, py + seed * 3);
    if (px === 0 || py === 0) return P.edgeL;
    if (px === 31 || py === 31) return P.edgeD;
    if (px === 1 || py === 1) return (px === 1 && py > 1 && py < 31) || (py === 1 && px < 31) ? P.bevel : P.edgeL;
    if (px === 30 || py === 30) return P.edgeD2;
    const shift = hash((px >> 2) + seed, (py >> 3) + 40) < 0.3 ? 1 : 0;   // đỉnh luống lởm chởm
    const k = (py + shift) & 7;
    // cục đất nằm trên đỉnh luống
    const ci = px >> 2, cj = (py + shift) >> 3;
    if (hash(ci * 3 + seed, cj * 7 + 1) < 0.22) {
      const cx = (ci << 2) + 1;
      if (k === 1 && px === cx) return P.clodHi;
      if (k === 1 && px === cx + 1) return P.top;
      if (k === 2 && (px === cx || px === cx + 1)) return P.mid;
      if (k === 3 && (px === cx || px === cx + 1)) return P.sh;
    }
    if (k === 0) return n < 0.12 ? P.mid : P.top;
    if (k === 1) return n < 0.2 ? P.top : P.top2;
    if (k === 2 || k === 3) return P.mid;
    if (k === 4) return P.sh;
    if (k === 5) return P.trough;
    if (dry && ((px * 7 + py * 3) % 23 === 0 && n < 0.6)) return P.crack;   // vết nứt khô
    if (!dry && n < 0.08) return P.glint;                                    // ánh nước đọng
    if (n > 0.95) return P.speck;
    return P.base;
  });
}
const TILL_DRY = { edgeL: '#b08556', bevel: '#c79d68', edgeD: '#8a6640', edgeD2: '#9c7648', top: '#e4c08c', top2: '#dcb680', clodHi: '#f2d6a4', mid: '#d3aa72', sh: '#b08556', trough: '#9c7648', base: '#c29b64', crack: '#8a6a40', glint: '#d0aa74', speck: '#a8845a' };
const TILL_WET = { edgeL: '#6b4222', bevel: '#7a4e2c', edgeD: '#462814', edgeD2: '#553217', top: '#a06a38', top2: '#946232', clodHi: '#b8844e', mid: '#7f5230', sh: '#573520', trough: '#4a2c18', base: '#63402a', crack: '#4a2c18', glint: '#8a6a50', speck: '#6b4426' };
// Bộ dự phòng cũ (plotTile) cùng bố cục, màu như cũ
const PLOT_WET = { edgeL: '#6b4222', bevel: '#7a4e2c', edgeD: '#462814', edgeD2: '#553217', top: '#a36a38', top2: '#946234', clodHi: '#b8844e', mid: '#8e5a30', sh: '#6f4424', trough: '#5a3820', base: '#8e5a30', crack: '#5a3820', glint: '#a36a38', speck: '#7a4a28' };
const PLOT_DRY = { edgeL: '#b08556', bevel: '#c49a64', edgeD: '#8a6640', edgeD2: '#9c7648', top: '#dcb47c', top2: '#d4ac74', clodHi: '#ecd0a0', mid: '#cfa56d', sh: '#b8905e', trough: '#a8844f', base: '#cfa56d', crack: '#9c7648', glint: '#d8b07a', speck: '#9c7648' };
// Đất chưa cuốc: nền nện chặt, cục đất 2x2..3x3 có sáng trên-trái, sỏi nhỏ, mép vát
function untilledTile() {
  return pix(32, 32, (px, py) => {
    const n = hash(px + 11, py + 5);
    if (px === 0 || py === 0) return '#8a5a30';
    if (px === 31 || py === 31) return '#5e3a1e';
    if (px === 30 || py === 30) return '#6b4222';
    const ci = Math.floor(px / 5), cj = Math.floor(py / 5);
    if (hash(ci * 5 + 1, cj * 3 + 2) < 0.34) {
      const ax = ci * 5 + 1, ay = cj * 5 + 1, s = hash(ci + 2, cj + 9) < 0.45 ? 3 : 2, dx = px - ax, dy = py - ay;
      if (dx >= 0 && dy >= 0 && dx < s && dy < s) return dx === 0 && dy === 0 ? '#c08a52' : dx === s - 1 || dy === s - 1 ? '#7a4f2a' : '#a4703f';
      if (dy === s && dx >= 1 && dx <= s) return '#6e4626';
    }
    if (n < 0.04) return '#c8a070';
    if (n > 0.97) return '#6e4626';
    return vnoise(px, py, 6, 4) < 0.45 ? '#946334' : '#8a5a2e';
  });
}
// Ô đất bỏ hoang: cỏ dại um tùm, lá dài 4-6 điểm chéo, ngọn sáng
function wildTile() {
  const c = pix(32, 32, (px, py) => {
    const b = vnoise(px, py, 8, 2);
    return b < 0.4 ? '#5a9e3a' : '#6cb846';
  });
  const x = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const bx = Math.floor(hash(i, 3) * 30) + 1, by = Math.floor(hash(i, 7) * 26) + 5, h = 3 + Math.floor(hash(i, 9) * 4), lean = hash(i, 11) < 0.5 ? -1 : 1;
    for (let k = 0; k < h; k++) R(x, k === h - 1 ? '#8fd65a' : k > h - 3 ? '#4fa83a' : '#3f8f2c', bx + Math.round(lean * k * 0.4), by - k);
  }
  return c;
}
// Khung chọn ô: 4 góc vàng (cùng dáng bộ cũ), mép trong sẫm cho nổi trên cỏ sáng
function selectTile() {
  const on = (px, py) => (px < 4 || py < 4 || px > 27 || py > 27) && !((px > 7 && px < 24) || (py > 7 && py < 24));
  return pix(32, 32, (px, py) => {
    if (!on(px, py)) return null;
    const inner = (px === 3 || py === 3 || px === 28 || py === 28);
    return inner ? '#d8b020' : (px === 0 || py === 0) ? '#fffbc0' : '#fff27a';
  });
}

// =====================================================================
// THIÊN NHIÊN
// =====================================================================
// Tán lá: hợp các khối tròn, khối thấp hơn đè trước; khe tối giữa các chùm; sáng trên-trái; vân lá theo ô 2x2.
function foliage(w, h, blobs, rp, { edge = null, bg = null, wrap = false, seed = 0, leaf = true } = {}) {
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
    const [cx, cy, r, ownR] = list[i];
    const rr = ownR || rp;
    const below = own(px, py + 1), below2 = own(px, py + 2), right = own(px + 1, py);
    // khe tối 2 điểm dưới khối đè, và 1 điểm bên phải
    if (below >= 0 && below !== i && list[below][1] > cy) return rr[0];
    if (below2 >= 0 && below2 !== i && list[below2][1] > cy && hash(px + seed, py) < 0.6) return rr[1];
    if (right >= 0 && right !== i && list[right][1] > cy && hash(px + seed, py) < 0.5) return rr[0];
    const wx = wrap ? ((px % w) + w) % w : px, wy = wrap ? ((py % h) + h) % h : py;
    const dx = (px + 0.5 - cx) / r, dy = (py + 0.5 - cy) / r;
    const nb = hash(((wx >> 1) * 3 + seed), ((wy >> 1) * 7 + seed * 3)) - 0.5, nf = hash(wx * 5 + seed, wy * 3 + 1) - 0.5;
    const v = -dx * 0.55 - dy * 0.8 - (dx * dx + dy * dy) * 0.3 + nb * 0.42 + nf * 0.14 + 0.3;
    let k = v > 0.8 ? 4 : v > 0.42 ? 3 : v > -0.04 ? 2 : v > -0.5 ? 1 : 0;
    // vân lá: chấm sáng nhỏ hình lá ở vùng sáng, chấm tối ở vùng tối
    if (leaf && k >= 2 && k < 4 && ((wx + (wy >> 1) * 3) % 5 === 0) && hash(wx + 31, wy + seed) < 0.5) k++;
    else if (leaf && k >= 1 && k <= 2 && hash(wx * 7 + 3, wy * 5 + seed) < 0.07) k--;
    return rr[k];
  });
}

const LEAF5 = ['#1e4d14', '#2f6b1f', '#3d8c2a', '#5fb33e', '#8fd65a'];
// Cây to (64x88 thay 32x44): bóng cỏ, thân có vân vỏ, tán nhiều chùm
function treeHD() {
  return draw(64, 88, x => {
    // bóng cỏ dưới gốc
    for (let i = 0; i < 4; i++) { R(x, '#4f8f32', 16 + i * 2, 80 + i * 2, 32 - i * 4, 2); }
    R(x, '#437c2a', 20, 84, 24, 2); R(x, '#5c9e3a', 18, 80, 6, 1);
    // thân
    const bark = pix(18, 28, (px, py) => {
      const flare = py > 22 ? (py - 22) * 0.7 : 0;
      const l = 2 - flare, r = 15 + flare;
      if (px < l || px > r) return null;
      const t = (px - l) / (r - l);
      if (px < l + 1 || px > r - 1) return OUT;
      const groove = hash(px, py >> 2) < 0.25 || (px % 4 === 1 && hash(px, (py >> 3) + 9) < 0.5);
      let col = t < 0.28 ? '#b07a45' : t < 0.6 ? '#8a5a2b' : t < 0.82 ? '#6b4020' : '#552f16';
      if (groove) col = t < 0.28 ? '#8a5a2b' : '#4a2c14';
      if (t < 0.18 && hash(px + 3, py) < 0.4) col = '#c8925a';
      return col;
    });
    x.drawImage(bark, 23, 56);
    R(x, '#3b2412', 26, 82, 12, 1);
    // rễ nổi
    R(x, OUT, 20, 81, 5, 2); R(x, '#8a5a2b', 21, 81, 3, 1); R(x, OUT, 39, 81, 5, 2); R(x, '#6b4020', 40, 81, 3, 1);
    const blobs = [[32, 36, 26], [16, 44, 14], [48, 44, 14], [32, 18, 18], [18, 24, 12], [46, 24, 12]];
    const crown = foliage(64, 64, blobs.map(([a, b, r]) => [a, b, r + 0.5]), LEAF5, { seed: 7 });
    outline(crown, '#15360d', 0.3);
    x.drawImage(crown, 0, 0);
    // vài chùm sáng rực trên đỉnh
    for (const [cx, cy] of [[24, 12], [14, 22], [40, 14], [26, 32], [44, 38]]) { R(x, '#8fd65a', cx, cy, 2, 1); R(x, '#c8f08a', cx, cy - 1); }
  });
}
// Bụi cây tròn (SPR.bush 32x30): ba chùm, quả đỏ, hoa hồng
function bushHD() {
  return draw(32, 30, x => {
    const blobs = [[10, 17, 10], [22, 17, 10], [16, 11, 10.5]];
    const leaves = foliage(32, 30, blobs, LEAF5, { seed: 3 });
    outline(leaves, '#163a0e', 0.3);
    x.drawImage(leaves, 0, 0);
    for (const [bx, by, c] of [[8, 18, '#e5452f'], [22, 20, '#ff8fb1'], [14, 22, '#e5452f']]) {
      R(x, OUT, bx - 1, by, 4, 3); R(x, c, bx, by, 2, 2); R(x, mix(c, '#ffffff', 0.6), bx, by); R(x, shade(c, 0.7), bx + 1, by + 1);
    }
  });
}
// Bụi dọn được (SPR2.bushes 32x32): quả mọng / hoa / cành khô
const BUSH_DEF = [
  { blobs: [[10, 19, 8.6], [22, 19, 8.6], [16, 12, 9.4], [16, 22, 8]], berries: '#e5452f' },
  { blobs: [[8, 20, 7.4], [16, 15, 9.4], [24, 20, 7.4], [16, 23, 7.4]], flowers: '#ff8fb1' },
  { blobs: [[10, 17, 8], [21, 14, 9], [16, 22, 8], [25, 22, 5.6], [7, 23, 5.2]], twigs: true },
];
function bushV(i) {
  const def = BUSH_DEF[i];
  const rp = i === 2 ? ['#1c3c12', '#2a5a1c', '#3a7426', '#5a9634', '#86b850'] : LEAF5;
  const leaves = outline(foliage(32, 32, def.blobs, rp, { seed: i * 17 + 3 }), '#163a0e', 0.3);
  return draw(32, 32, x => {
    shadow(x, 16, 28, 14, 3.2);
    x.drawImage(leaves, 0, 0);
    if (def.berries) for (const [bx, by] of [[8, 18], [18, 14], [22, 22], [12, 24], [24, 16], [14, 10]]) {
      R(x, '#5a1008', bx, by + 2, 3, 1); R(x, '#9e2416', bx, by + 1, 3, 1); R(x, def.berries, bx, by, 3, 2); R(x, '#ffb0a0', bx, by);
    }
    if (def.flowers) for (const [fx, fy] of [[10, 16], [20, 12], [24, 20], [14, 22], [6, 22]]) {
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) R(x, Math.abs(dx) + Math.abs(dy) === 2 && dy === 2 ? '#c2306f' : def.flowers, fx + dx, fy + dy);
      R(x, '#ffd0de', fx - 2, fy); R(x, '#ffd0de', fx, fy - 2);
      R(x, '#fff3a0', fx, fy); R(x, '#f7d547', fx + 1, fy);
    }
    if (def.twigs) {
      for (const [a, b, c, d] of [[4, 12, 8, 16], [26, 8, 22, 12], [14, 4, 16, 8], [28, 18, 26, 20]]) { line(x, '#3b2412', a, b + 1, c, d + 1); line(x, '#6b4a26', a, b, c, d); }
      for (const [tx, ty] of [[4, 12], [26, 8], [14, 4], [28, 18]]) R(x, '#a8844a', tx, ty);
    }
  });
}
// Đá (32x32): trường độ cao từ elip méo, chiếu sáng theo pháp tuyến, 5 sắc
const STONE = ['#4a4650', '#6e6a74', '#918c94', '#b4b0b2', '#dcd8d0'];
function rockField(w, h, shapes, rp, seed = 0) {
  const H = (X, Y) => {
    let best = 0;
    for (const [cx, cy, rx, ry] of shapes) {
      const dx = (X - cx) / rx, dy = (Y - cy) / ry, a = Math.atan2(dy, dx);
      const wob = 1 + Math.sin(a * 3 + seed) * 0.07 + Math.sin(a * 5 + seed * 2.3) * 0.05 + Math.sin(a * 9 + seed) * 0.02;
      const d = (dx * dx + dy * dy) / (wob * wob);
      if (d < 1) best = Math.max(best, Math.sqrt(1 - d) * (0.8 + 0.2 * ry / rx));
    }
    return best;
  };
  return pix(w, h, (px, py) => {
    const X = px + 0.5, Y = py + 0.5, h0 = H(X, Y);
    if (h0 <= 0) return null;
    const fx = (H(X + 1.5, Y) - H(X - 1.5, Y)) / 3, fy = (H(X, Y + 1.5) - H(X, Y - 1.5)) / 3;
    let b = 0.5 + (fx * 0.55 + fy * 0.85) * -3.2;
    if (h0 > 0.85) b = Math.max(b, 0.7);
    b += (hash((px >> 1) + seed * 13, py >> 1) - 0.5) * 0.14 + (hash(px, py + seed) - 0.5) * 0.06;
    if (H(X, Y + 2.4) <= 0) b -= 0.25;
    return b > 0.86 ? rp[4] : b > 0.64 ? rp[3] : b > 0.42 ? rp[2] : b > 0.22 ? rp[1] : rp[0];
  });
}
const STONE_SHAPES = [
  [[16, 19, 12.6, 10]],
  [[16, 21, 13.2, 8.2]],
  [[11, 21.2, 8.6, 7.2], [22, 18, 8, 7.6]],
];
function rockV(i) {
  const body = outline(rockField(32, 32, STONE_SHAPES[i], STONE, i * 2 + 1), OUT, 0.3);
  return draw(32, 32, x => {
    shadow(x, 16, 28, 14, 3.6);
    x.drawImage(body, 0, 0);
    if (i === 0) {   // vết nứt có mép sáng
      line(x, '#3e3a44', 18, 10, 15, 19); line(x, '#3e3a44', 15, 19, 16, 22);
      line(x, '#dcd8d0', 19, 11, 17, 16);
      line(x, '#3e3a44', 24, 20, 22, 25);
    }
    if (i === 1) {   // rêu phủ đỉnh
      const d = body.getContext('2d').getImageData(0, 0, 32, 32).data;
      for (let px = 6; px < 26; px++) for (let py = 12; py < 20; py++) {
        const o = (py * 32 + px) * 4;
        if (d[o + 3] > 200 && d[o] > 120 && vnoise(px, py, 3, 5) < 0.62 - (py - 12) * 0.07) R(x, hash(px + 1, py) < 0.4 ? '#5f9a32' : py < 15 ? '#9ac860' : '#86b850', px, py);
      }
      dots(x, '#3d7420', [[8, 18], [9, 19], [22, 16], [23, 17]]);
    }
    if (i === 2) { line(x, '#3e3a44', 16, 21, 18, 25); R(x, OUT, 3, 27, 3, 2); R(x, '#918c94', 3, 26, 3, 1); R(x, '#dcd8d0', 3, 26); }
  });
}
// Gốc cây (32x32): mặt cắt có vòng gỗ, vỏ nứt dọc, rễ bò, rêu chân
function stumpHD() {
  const body = pix(32, 32, (px, py) => {
    const X = px + 0.5, Y = py + 0.5;
    const tx = (X - 16) / 11, ty = (Y - 12) / 6;
    const top = tx * tx + ty * ty;
    const roots = [[5.2, 24.8, 4.4, 2.6], [26.8, 24, 4, 2.6], [19, 27.2, 3.6, 2]];
    const inRoot = roots.some(([cx, cy, rx, ry]) => ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1);
    const inBody = Math.abs(X - 16) <= 11 && Y >= 12 && (Y <= 22 || ((X - 16) / 11) ** 2 + ((Y - 22) / 4.8) ** 2 <= 1);
    if (top <= 1) {
      const r = Math.sqrt(top);
      if (r > 0.86) return (tx + ty < -0.3) ? '#c98c4a' : '#8a5a2b';
      if (r < 0.1) return '#8a5428';
      if (Math.abs(X - 16 - (Y - 12) * -0.9) < 0.7 && X > 16.6 && r < 0.84) return '#8a5a2b';   // vết nứt
      const ring = Math.floor(r * 7.5 + hash(px >> 2, py >> 1) * 0.3) % 2;
      const lit = tx + ty < 0;
      return ring ? (lit ? '#e8b878' : '#d49a5a') : (lit ? '#f2cc90' : '#e0a868');
    }
    if (inBody || inRoot) {
      const dx = (X - 16) / 12;
      const groove = hash(px, py >> 2) < 0.22 || (px % 3 === 0 && hash(px, 9) < 0.55);
      let col = dx < -0.55 ? '#a06a38' : dx < 0.1 ? '#7a4a22' : dx < 0.6 ? '#68401e' : '#523218';
      if (groove) col = shade(col, 0.75);
      if (inRoot && !inBody) col = Y < 25 ? '#8a5a2b' : '#5c3a1a';
      if (Y > 23 && vnoise(px, py, 2.5, 3) < 0.4) col = hash(px, py) < 0.4 ? '#6aa83e' : '#4f8a2e';   // rêu chân
      return col;
    }
    return null;
  });
  outline(body, OUT, 0.3);
  return draw(32, 32, x => { shadow(x, 16, 28, 15, 3.2); x.drawImage(body, 0, 0); });
}
// Ô rừng rậm (32x32, ghép liền: các khối ở góc/mép giống nhau ở mọi biến thể)
const FOREST_BASE = [[0, 0, 10.4], [16, 0, 6.4], [0, 16, 6.4]];
const FOR5 = ['#123210', '#1d4e18', '#2a6c22', '#3f8c32', '#68b04a'];
const FL = ['#163e10', '#24601a', '#3a8228', '#5aa83c', '#8ccc5a'];
const FB = ['#0f2c10', '#18441a', '#225c26', '#347838', '#5a9850'];
const FOREST_VAR = [
  [[15, 15, 12.8]],
  [[18, 18, 12], [8, 23, 6, FB]],
  [[13, 18, 12, FL], [24, 9, 6.8]],
  [[18, 14, 12.4, FB], [10, 24, 5.6]],
  [[16, 17, 10.8], [24, 24, 5.2, FL], [8, 9, 5.2]],
  [[16, 15, 13.2, FL]],
];
function forestV(i) {
  const c = foliage(32, 32, [...FOREST_BASE, ...FOREST_VAR[i]], FOR5, { wrap: true, bg: '#0a2008', seed: 5 + i });
  if (i === 4) { const x = c.getContext('2d'); for (const [fx, fy] of [[14, 12], [20, 18]]) { R(x, '#7a1a10', fx, fy + 1, 2, 1); R(x, '#b83a2c', fx, fy, 2, 1); R(x, '#ff8a6a', fx, fy - 1); } }
  return c;
}
// Khóm cỏ nhỏ (10x6) và hoa dại (6x6)
function tuftHD() {
  return spr([
    'd.....l..d',
    'dl...ld.ld',
    '.dl.ldl.d.',
    '.ddldgdgd.',
    'ddgdgggdgd',
    '.ddgdgdgd.',
  ].map(r => r.slice(0, 10)), { d: '#2f6b1f', g: '#4fa83a', l: '#8fd65a' });
}
function flowerHD(petal, petalD, center) {
  return spr([
    '..pp..',
    '.pPPp.',
    'pPccPp',
    'pPcCPq',
    '.qPPq.',
    '..qq..',
  ], { p: petal, P: mix(petal, '#ffffff', 0.25), q: petalD, c: center, C: shade(center, 0.8) });
}
// Vũng bùn (80x44): mép loang, lòng sẫm, ánh ướt
function mudHD() {
  return pix(80, 44, (px, py) => {
    const dx = (px - 39.5) / 40, dy = (py - 21.5) / 22;
    const ang = Math.atan2(dy, dx);
    const rr = Math.hypot(dx, dy) * (1 + 0.07 * Math.sin(ang * 3 + 1) + 0.05 * Math.sin(ang * 5) + 0.02 * Math.sin(ang * 11));
    if (rr > 1) return null;
    if (rr > 0.92) return hash(px, py) < 0.55 ? '#6b4a2a' : null;
    if (rr > 0.84) return dy < -0.2 ? '#86623c' : '#7a5834';
    if (rr > 0.78) return '#5a3c20';
    const n = hash(px, py), b = vnoise(px, py, 6, 3);
    if (n < 0.02) return '#a8845a';
    if (dy < -0.3 && dx < 0 && vnoise(px, py, 4, 8) > 0.72) return '#8b6a44';   // ánh ướt bên trên-trái
    return b < 0.4 ? '#5e4024' : '#6b4a2a';
  });
}
// Cỏ dại mọc trên ruộng (20x14)
function weedHD() {
  const c = draw(20, 14, x => {
    const blades = [[3, 13, -1, 9], [6, 13, 0, 11], [9, 13, 1, 12], [12, 13, -1, 10], [15, 13, 1, 9], [17, 13, 1, 6], [1, 13, -1, 5], [10, 13, -1, 7]];
    for (const [bx, by, lean, h] of blades) for (let k = 0; k < h; k++) {
      const px = bx + Math.round(lean * k * 0.35), col = k > h - 2 ? '#8fd65a' : k > h * 0.55 ? '#4fa83a' : '#2f6b1f';
      R(x, col, px, by - k); if (k < h * 0.6) R(x, '#3d8c2a', px + 1, by - k);
    }
  });
  return outline(c, '#173a0e', 0.4);
}
// Sâu bọ (16x16): bọ cánh cứng tím, có râu, mắt, vệt sáng
function bugHD() {
  return draw(16, 16, x => {
    line(x, '#2a2a2a', 3, 1, 5, 4); line(x, '#2a2a2a', 12, 1, 10, 4);
    for (const [a, b, c, d] of [[2, 9, 4, 8], [13, 9, 11, 8], [2, 13, 4, 12], [13, 13, 11, 12]]) line(x, '#2a2a2a', a, b, c, d);
    ell(x, OUT, 7.5, 9.5, 5, 5);
    ball(x, 8, 10, 4.4, 4.4, ['#b07ad8', '#8e4fc0', '#6a3494', '#4a1f66'], { spec: true });
    line(x, '#4a1f66', 8, 6, 8, 14);
    ell(x, OUT, 7.5, 4.5, 3, 2); ell(x, '#3a2a46', 7.5, 4.5, 2, 1);
    R(x, '#ffffff', 6, 4); R(x, '#ffffff', 9, 4);
  });
}
// Giọt nước báo khô (14x18)
function dropHD() {
  const c = pix(14, 18, (px, py) => {
    const X = px + 0.5, Y = py + 0.5;
    const r = Y > 10 ? 5.6 : 5.6 * Math.max(0, (Y - 1) / 9.5) ** 0.9;
    const dx = X - 7, dy = Y - 11;
    const inside = Y >= 1 && (Y <= 11 ? Math.abs(dx) <= r : dx * dx + dy * dy <= 5.6 * 5.6);
    if (!inside) return null;
    if (dx < -2.2 && dy < 1.5 && dy > -4) return '#ffffff';
    if (dx < -1 && dy < 2) return '#8fd3ff';
    if (dx > 2.5 || dy > 3.8) return '#1f6fd1';
    return '#5fb8ff';
  });
  return outline(c, '#123e7a', 0.4);
}

// =====================================================================
// ĐỒ TRANG TRÍ
// =====================================================================
const WOOD = ['#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868'];
// Bù nhìn (32x52)
function scarecrowHD() {
  return draw(32, 52, x => {
    // cọc đứng + thanh ngang
    R(x, OUT, 14, 20, 4, 32); R(x, '#b07a45', 15, 20, 1, 31); R(x, '#8a5a2b', 16, 20, 1, 31);
    R(x, OUT, 0, 24, 32, 6); R(x, '#c98c4a', 1, 25, 30, 1); R(x, '#a06a38', 1, 26, 30, 2); R(x, '#7a4a22', 1, 28, 30, 1);
    // rơm thò ra hai tay
    for (const [sx, sy, c] of [[0, 21], [1, 22], [2, 22], [0, 29], [1, 30], [29, 21], [30, 22], [31, 23], [30, 29], [31, 30], [2, 31], [29, 31]]) R(x, c ?? '#f0cf5a', sx, sy);
    dots(x, '#c9a13a', [[1, 21], [30, 21], [0, 30], [31, 29]]);
    // áo xanh vá
    R(x, OUT, 6, 26, 20, 18);
    R(x, '#3f8ce0', 7, 27, 18, 16); R(x, '#7ab8f4', 7, 27, 18, 1); R(x, '#7ab8f4', 7, 27, 1, 16); R(x, '#2a64b0', 24, 28, 1, 15); R(x, '#2a64b0', 7, 42, 18, 1);
    R(x, OUT, 9, 29, 7, 7); R(x, '#e5452f', 10, 30, 5, 5); R(x, '#ff8a6a', 10, 30, 5, 1); R(x, '#a82818', 10, 34, 5, 1);
    dots(x, '#ffffff', [[11, 31], [13, 33]]);
    R(x, OUT, 17, 33, 5, 7); R(x, '#f7d547', 18, 34, 3, 5); R(x, '#fff3a0', 18, 34, 3, 1);
    for (const sx of [19, 21]) R(x, '#d19a1c', sx, 37);
    line(x, '#26509a', 12, 39, 14, 41);
    // rơm dưới áo
    for (let i = 0; i < 9; i++) { R(x, i % 2 ? '#c9a13a' : '#f0cf5a', 8 + i * 2, 44, 1, 2 + (i % 3)); }
    // đầu bao bố
    ell(x, OUT, 16, 15, 7, 7);
    ball(x, 16, 15, 6.2, 6.2, ['#f6dca8', '#e8c98a', '#c8a464', '#a07e44'], { noise: 0.12 });
    // mũ rơm
    R(x, OUT, 4, 8, 24, 5); R(x, '#f0cf5a', 5, 9, 22, 2); R(x, '#c9a13a', 5, 11, 22, 1); R(x, '#fff0a0', 5, 9, 8, 1);
    R(x, OUT, 8, 0, 16, 10); R(x, '#f0cf5a', 9, 1, 14, 7); R(x, '#fff0a0', 9, 1, 14, 1); R(x, '#fff0a0', 9, 1, 1, 7); R(x, '#c9a13a', 22, 2, 1, 6);
    R(x, '#e5452f', 9, 6, 14, 2); R(x, '#a82818', 9, 7, 14, 1);
    for (let i = 0; i < 5; i++) R(x, '#d8b040', 11 + i * 3, 2, 1, 3);
    // mặt khâu chỉ
    R(x, '#2a2a2a', 12, 14, 2, 2); R(x, '#2a2a2a', 19, 14, 2, 2); R(x, '#ffffff', 12, 14); R(x, '#ffffff', 19, 14);
    R(x, OUT, 15, 16, 3, 2); R(x, '#f59a23', 15, 16, 2, 1);
    for (const sx of [12, 15, 18, 21]) { R(x, '#5c3a1a', sx, 19); R(x, '#5c3a1a', sx + 1, 20); }
  });
}
// Chậu hoa (20x20)
function flowerPotHD() {
  return draw(20, 20, x => {
    line(x, '#2f6b1f', 6, 10, 6, 15); line(x, '#2f6b1f', 10, 6, 10, 15); line(x, '#2f6b1f', 14, 8, 14, 15);
    for (const [lx, ly, d] of [[4, 12, -1], [16, 12, 1], [8, 11, -1], [12, 10, 1]]) { R(x, '#4fa83a', lx, ly, 2, 1); R(x, '#8fd65a', lx + (d < 0 ? 0 : 1), ly - 1); }
    const fl = (cx, cy, col) => {
      for (const [dx, dy] of [[0, -2], [-2, 0], [2, 0], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) R(x, (dx + dy > 0) ? shade(col, 0.82) : col, cx + dx, cy + dy);
      R(x, OUT, cx, cy - 3); R(x, OUT, cx - 3, cy); R(x, OUT, cx + 3, cy); R(x, OUT, cx, cy + 3);
      R(x, mix(col, '#ffffff', 0.5), cx - 1, cy - 1);
      R(x, '#f7d547', cx, cy); R(x, '#d19a1c', cx + 1, cy);
    };
    fl(6, 6, '#ff8fb1'); fl(10, 3, '#e5452f'); fl(14, 6, '#f6f0e4');
    // chậu đất nung
    R(x, OUT, 2, 14, 16, 6);
    R(x, '#d9704a', 3, 15, 14, 2); R(x, '#f08a62', 3, 15, 14, 1); R(x, '#b4583a', 3, 16, 14, 1);
    R(x, OUT, 3, 17, 14, 1);
    R(x, '#c8603a', 4, 18, 12, 1); R(x, '#e07a52', 4, 18, 3, 1);
  });
}
// Đèn lồng (16x44)
function lampHD() {
  return draw(16, 44, x => {
    // cột
    R(x, OUT, 6, 18, 4, 26); R(x, '#b07a45', 7, 18, 1, 25); R(x, '#8a5a2b', 8, 18, 1, 25);
    for (let y = 22; y < 42; y += 6) R(x, '#6b4020', 7, y, 2, 1);
    R(x, OUT, 2, 40, 12, 4); R(x, '#8a5a2b', 3, 41, 10, 1); R(x, '#b07a45', 3, 41, 4, 1);
    // móc treo
    R(x, OUT, 4, 0, 8, 4); R(x, '#f7d547', 5, 1, 6, 2); R(x, '#fff3a0', 5, 1, 2, 1);
    // đèn lồng đỏ
    ell(x, OUT, 8, 10, 6, 6);
    ball(x, 8, 10, 5.2, 5.2, ['#ff8a6a', '#e5452f', '#b8302a', '#8a1e14'], { spec: true, hi: '#ffd0a0' });
    for (const lx of [5, 8, 11]) for (let y = 6; y < 15; y++) if (hash(lx, y) < 0.9) R(x, lx === 8 ? '#f7d547' : '#c03a2a', lx, y);
    R(x, '#fff3a0', 8, 8, 1, 4);
    R(x, OUT, 4, 15, 8, 2); R(x, '#d19a1c', 5, 15, 6, 1);
    // tua vàng
    for (const tx of [6, 8, 10]) { R(x, '#f7d547', tx, 17, 1, 3); R(x, '#d19a1c', tx, 19); }
  });
}
// Ghế đá (40x24) — dùng chung khuôn cho icon ghế (28x18)
function benchHD(w = 40, h = 24) {
  const lw = Math.round(w * 0.2), lx = [Math.round(w * 0.05), w - Math.round(w * 0.05) - lw];
  return draw(w, h, x => {
    for (const px of lx) { R(x, OUT, px, Math.round(h * 0.5), lw, h - Math.round(h * 0.5)); R(x, '#a8a8a0', px + 1, Math.round(h * 0.5) + 1, lw - 2, h - Math.round(h * 0.5) - 2); R(x, '#cacac2', px + 1, Math.round(h * 0.5) + 1, 1, h - Math.round(h * 0.5) - 2); R(x, '#86867e', px + lw - 2, Math.round(h * 0.5) + 1, 1, h - Math.round(h * 0.5) - 2); }
    const ty = Math.round(h * 0.16), th = Math.round(h * 0.5);
    R(x, OUT, 0, ty, w, th);
    const top = pix(w - 2, th - 2, (px, py) => {
      const n = hash(px + 2, py + 7);
      if (py >= th - 4) return py === th - 4 ? '#b4b0a8' : '#9a968e';
      if (py === 0) return '#f6f3ee';
      if (n < 0.1) return '#c4c0b8';
      if (n > 0.95) return '#ffffff';
      return py < 2 ? '#ededE6'.toLowerCase() : '#dcd8d0';
    });
    x.drawImage(top, 1, ty + 1);
    R(x, '#9a9a92', Math.round(w * 0.22), ty + 3, 1, 3); R(x, '#9a9a92', Math.round(w * 0.66), ty + 2, 1, 3);
  });
}
// Đèn đường sắt (24x60, SPR2.lampPost)
const IRON = ['#2e2e36', '#4c4c58', '#767686', '#aeaebe', '#e2e2ea'];
function lampPostHD() {
  return draw(24, 60, x => {
    shadow(x, 12, 58, 8, 2);
    // cột có gờ
    R(x, OUT, 8, 18, 8, 38);
    R(x, '#3a3a44', 9, 18, 6, 37); R(x, '#5a5a66', 10, 18, 2, 37); R(x, '#8a8a98', 10, 18, 1, 37); R(x, '#2e2e36', 14, 18, 1, 37);
    for (const y of [26, 40]) { R(x, OUT, 7, y, 10, 3); R(x, '#767686', 8, y + 1, 8, 1); R(x, '#aeaebe', 8, y + 1, 3, 1); }
    // đế đá
    R(x, OUT, 4, 52, 16, 8); R(x, '#8a8478', 5, 53, 14, 6); R(x, '#aaa498', 5, 53, 14, 1); R(x, '#aaa498', 5, 53, 1, 6); R(x, '#6e6a60', 5, 58, 14, 1); R(x, '#6e6a60', 18, 54, 1, 5);
    // lồng kính
    R(x, OUT, 2, 4, 20, 16);
    R(x, '#ffe9a0', 3, 5, 18, 14); R(x, '#fff8d8', 4, 6, 4, 6); R(x, '#f7c843', 15, 7, 5, 11); R(x, '#ffd870', 12, 6, 3, 12);
    R(x, OUT, 11, 4, 2, 16);
    ell(x, '#f59a23', 12, 13, 2, 2); R(x, '#fff3a0', 11, 12);
    // nắp
    R(x, OUT, 0, 0, 24, 6); R(x, IRON[2], 1, 1, 22, 3); R(x, IRON[3], 1, 1, 9, 1); R(x, IRON[1], 1, 4, 22, 1);
    R(x, OUT, 10, 0, 4, 1);
    R(x, OUT, 4, 18, 16, 3); R(x, IRON[2], 5, 18, 14, 1); R(x, IRON[3], 5, 18, 4, 1);
    // quầng sáng
    R(x, 'rgba(255,230,140,0.28)', 0, 6, 2, 12); R(x, 'rgba(255,230,140,0.28)', 22, 6, 2, 12);
  });
}
// Ghế đá công viên (48x28, SPR2.bench)
function benchStoneHD() {
  return draw(48, 28, x => {
    shadow(x, 24, 24, 22, 3.2);
    for (const px of [4, 34]) { R(x, OUT, px, 12, 10, 14); R(x, '#a8a49c', px + 1, 13, 8, 12); R(x, '#cac6be', px + 1, 13, 2, 12); R(x, '#86827a', px + 7, 13, 2, 12); R(x, '#76726a', px + 1, 24, 8, 1); }
    R(x, OUT, 0, 2, 48, 16);
    const top = pix(46, 14, (px, py) => {
      const n = hash(px + 2, py + 7);
      if (py >= 10) return py === 10 ? '#b4b0a8' : py < 13 ? '#9a968e' : '#86827a';
      if (py === 0) return '#ffffff';
      if (vnoise(px, py, 3, 2) < 0.22) return '#cac6be';
      if (n > 0.93) return '#ffffff';
      return py < 3 ? '#f2efe8' : '#e2ded6';
    });
    x.drawImage(top, 1, 3);
  });
}

// =====================================================================
// HÌNH KHỐI CHO BIỂU TƯỢNG
// =====================================================================
// Dải 6 bậc như SPR4.produce mới (art10.js): [viền, tối, hơi tối, gốc, sáng, điểm sáng]
const C6 = {
  leaf: ['#1a4212', '#2f6b1f', '#3d8c2a', '#56a83a', '#8fd65a', '#c8f08a'],
  red: ['#4e1006', '#8a1e12', '#c0301f', '#e5452f', '#ff7a5a', '#ffd2c4'],
  orange: ['#5e2c06', '#a4520c', '#d8761a', '#f59a23', '#ffbe5a', '#ffe0a8'],
  yellow: ['#7a5a0c', '#c08a16', '#e8b82a', '#f7d547', '#fff09a', '#fffbe0'],
  gold: ['#6e4e10', '#a07a1c', '#c89c2c', '#e2bc44', '#f4d870', '#fff0b0'],
  white: ['#8a8478', '#c4bcae', '#e6ded0', '#f6f0e4', '#ffffff', '#ffffff'],
  cream: ['#7c8a5c', '#a8b884', '#ccdaa8', '#e4eecc', '#f6faea', '#ffffff'],
  wmel: ['#0f3a14', '#1f5a24', '#2f7a30', '#5cb85c', '#8cd47a', '#c8f0b0'],
  wood: ['#3e2610', '#5c3a1a', '#8a5a2b', '#b07a45', '#d0a068', '#e8c494'],
  tan: ['#5a3e1c', '#8a6232', '#b48a52', '#d2ac74', '#e8cc9c', '#f6e6c6'],
  pink: ['#5e1830', '#9a3456', '#c85a7c', '#e886a2', '#f8b4c8', '#ffe0ea'],
  blue: ['#123e7a', '#1f6fd1', '#3f8ce0', '#5fb8ff', '#8fd3ff', '#e0f4ff'],
  purp: ['#2a1040', '#4a1f66', '#6a3494', '#8e4fc0', '#b07ad8', '#e0c8f4'],
  iron: ['#24242c', '#3a3a44', '#5a5a66', '#8a8a98', '#c0c0cc', '#eeeef4'],
  stone: ['#36323c', '#4a4650', '#6e6a74', '#918c94', '#b4b0b2', '#dcd8d0'],
  skin: ['#5a2e1a', '#c47c5c', '#f0b088', '#ffd7b0', '#fff1df', '#ffffff'],
  straw: ['#5e4410', '#9a7428', '#c9a13a', '#f0cf5a', '#fff0a0', '#fffbe0'],
  mud: ['#2e1c0c', '#4a3018', '#6b4a2a', '#8a6a44', '#a8845a', '#c8a880'],
};
// Elip xoay (ang, radian) tô 4 sắc theo ánh sáng trên-trái trong toạ độ màn hình
function oval(x, cx, cy, rx, ry, ang, r6, { spec = false, noise = 0.06, seed = 0, lift = 0, flat = false } = {}) {
  const ca = Math.cos(ang), sa = Math.sin(ang), M = Math.max(rx, ry) + 1;
  for (let py = Math.floor(cy - M); py <= Math.ceil(cy + M); py++) for (let px = Math.floor(cx - M); px <= Math.ceil(cx + M); px++) {
    const X = px + 0.5 - cx, Y = py + 0.5 - cy, u = (X * ca + Y * sa) / rx, v = (-X * sa + Y * ca) / ry, d = u * u + v * v;
    if (d > 1) continue;
    const sx = X / M, sy = Y / M;
    const val = flat ? 0.2 - sy * 0.6 : -sx * 0.55 - sy * 0.8 - d * 0.35 + 0.32 + lift + (hash(px * 3 + seed, py * 5 + seed) - 0.5) * noise;
    let col = val > 0.52 ? r6[4] : val > 0.02 ? r6[3] : val > -0.42 ? r6[2] : r6[1];
    if (spec && Math.hypot(sx + 0.36, sy + 0.42) < 0.17) col = r6[5];
    R(x, col, px, py);
  }
}
// Dựng một phần riêng rồi viền theo màu viền của dải màu (viền chọn lọc)
function part(w, h, fn, out = OUT, soft = 0.38) { return outline(draw(w, h, fn), out, soft); }
// Lá thuôn dọc trục: gốc (x0,y0) → ngọn (x1,y1), rộng tối đa w, gân giữa sáng
function leafShape(x, x0, y0, x1, y1, w, r6, vein = true) {
  const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  const minX = Math.floor(Math.min(x0, x1) - w - 1), maxX = Math.ceil(Math.max(x0, x1) + w + 1), minY = Math.floor(Math.min(y0, y1) - w - 1), maxY = Math.ceil(Math.max(y0, y1) + w + 1);
  for (let py = minY; py <= maxY; py++) for (let px = minX; px <= maxX; px++) {
    const X = px + 0.5 - x0, Y = py + 0.5 - y0, t = (X * ux + Y * uy) / L, s = -X * uy + Y * ux;
    if (t < 0 || t > 1) continue;
    const hw = w * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.8;
    if (Math.abs(s) > hw) continue;
    const side = s / Math.max(0.5, hw);
    let col = (side * -uy + side * ux) < 0 ? r6[4] : r6[3];
    if (Math.abs(side) > 0.7) col = side < 0 ? r6[3] : r6[2];
    if (vein && Math.abs(s) < 0.55 && t > 0.08 && t < 0.9) col = r6[5 - 1 + (t > 0.5 ? 0 : 0)];
    R(x, col, px, py);
  }
}
const sparkleDot = (x, px, py) => { R(x, '#ffffff', px, py); R(x, '#fff4b0', px - 1, py); R(x, '#fff4b0', px + 1, py); R(x, '#fff4b0', px, py - 1); R(x, '#fff4b0', px, py + 1); };
// Sao 4 cánh nét mảnh (s = bán kính cánh)
function star4(x, cx, cy, s, col, core = '#ffffff', mid = null) {
  for (let i = 1; i <= s; i++) { const c = i === s ? col : (mid ?? col); R(x, c, cx - i, cy); R(x, c, cx + i, cy); R(x, c, cx, cy - i); R(x, c, cx, cy + i); }
  if (s >= 3) { R(x, mid ?? col, cx - 1, cy - 1); R(x, mid ?? col, cx + 1, cy - 1); R(x, mid ?? col, cx - 1, cy + 1); R(x, mid ?? col, cx + 1, cy + 1); }
  R(x, core, cx, cy);
}
// Sao 5 cánh đặc (bán kính ngoài ro), tô 4 sắc, đã gồm viền
function star5(w, h, cx, cy, ro, r6, out = OUT) {
  const ri = ro * 0.48;
  const inside = (X, Y) => {
    const a = Math.atan2(Y, X) + Math.PI / 2, k = ((a % (Math.PI * 2 / 5)) + Math.PI * 2 / 5) % (Math.PI * 2 / 5) - Math.PI / 5;
    const r = Math.hypot(X, Y), lim = (ro * ri * Math.cos(Math.PI / 5)) / (ri * Math.cos(Math.PI / 5) * Math.cos(k) + (ro - ri * Math.cos(Math.PI / 5)) * Math.abs(Math.sin(k)) * 0 + ro * Math.cos(Math.PI / 5) * 0 + 1e-9);
    void lim;
    // nội suy tuyến tính giữa đỉnh nhọn (ro) và góc lõm (ri)
    const t = Math.abs(k) / (Math.PI / 5);
    return r <= ro * (1 - t) + ri * t + 0.35;
  };
  return outline(pix(w, h, (px, py) => {
    const X = px + 0.5 - cx, Y = py + 0.5 - cy;
    if (!inside(X, Y)) return null;
    const v = -X / ro * 0.6 - Y / ro * 0.8;
    return v > 0.35 ? r6[4] : v > -0.2 ? r6[3] : r6[2];
  }), out, 0.3);
}

// =====================================================================
// NÔNG SẢN 8 CÂY GỐC (SPR.ripe) — màu theo SPR4.produce mới (art10)
// =====================================================================
function ripeCai() {   // cải thìa 28x22
  const L = C6.leaf, W = C6.white;
  const leaves = part(28, 22, x => {
    leafShape(x, 12, 15, 4, 2, 4.2, L); leafShape(x, 16, 15, 24, 2, 4.2, L);
    leafShape(x, 13, 15, 9, 0, 4.4, L); leafShape(x, 15, 15, 19, 0, 4.4, L);
    leafShape(x, 14, 16, 14, 1, 4.6, ['#163a14', '#24561c', '#2f7028', '#3f8a34', '#5ea84a', '#8fcc6a']);
  }, L[0]);
  const stalk = part(28, 22, x => {
    oval(x, 14, 16.5, 5.6, 4.6, 0, W);
    for (const sx of [11, 14, 17]) R(x, W[2], sx, 13, 1, 7);
    R(x, W[4], 11, 14, 1, 3);
  }, '#7a7466');
  return draw(28, 22, x => { x.drawImage(leaves, 0, 0); x.drawImage(stalk, 0, 0); });
}
function ripeCarot() {   // cà rốt 28x24
  const L = C6.leaf, O = C6.orange;
  const tops = part(28, 24, x => {
    for (const [tx, ty, w] of [[6, 2, 2.2], [14, 0, 2.4], [22, 3, 2.2], [10, 3, 1.8], [18, 2, 1.8]]) leafShape(x, 14, 13, tx, ty, w, L);
  }, L[0]);
  const root = part(28, 24, x => {
    for (let y = 11; y <= 23; y++) {
      const hw = 6.2 * Math.max(0, 1 - (y - 11) / 12.5) ** 0.85 + 0.3;
      for (let px = Math.round(14 - hw); px <= Math.round(14 + hw - 1); px++) {
        const t = (px + 0.5 - (14 - hw)) / (2 * hw);
        let c = t < 0.28 ? O[4] : t < 0.7 ? O[3] : O[2];
        if ((y === 14 || y === 17 || y === 20) && t > 0.15 && t < 0.62) c = O[2];
        if ((y === 15 || y === 18) && t > 0.5 && t < 0.85) c = O[1];
        R(x, c, px, y);
      }
    }
    R(x, O[5], 10, 12, 2, 1); R(x, O[5], 10, 13);
  }, O[0]);
  return draw(28, 24, x => { x.drawImage(tops, 0, 0); x.drawImage(root, 0, 0); });
}
function ripeLua() {   // bó lúa chín 32x24
  const Y = C6.gold, L = ['#2f4a12', '#4a6a1c', '#6a8c2c', '#8aa83e', '#b4c862', '#dce49a'];
  const stems = part(32, 24, x => {
    for (const [tx, ty] of [[5, 6], [16, 3], [27, 6], [10, 4], [22, 4]]) line(x, L[2], 16, 23, tx + (tx < 16 ? 2 : tx > 16 ? -2 : 0), ty + 6);
    leafShape(x, 15, 23, 6, 14, 1.8, L, false); leafShape(x, 17, 23, 27, 15, 1.8, L, false);
    R(x, L[1], 14, 20, 4, 4);
  }, L[0]);
  const grains = part(32, 24, x => {
    // bông lúa trĩu: chuỗi hạt cong rủ xuống từ ngọn
    for (const [sx, sy, dx] of [[7, 12, -1], [16, 9, 0], [25, 12, 1], [11, 10, -1], [21, 10, 1]]) {
      for (let k = 0; k < 6; k++) {
        const gx = sx + dx * k * 0.9 + (dx === 0 ? (k % 2 ? 1 : -1) : 0), gy = sy - k * 1.6 + (k > 3 ? (k - 3) * 1.2 : 0);
        oval(x, gx, gy, 1.4, 1.9, dx * 0.5, Y, { noise: 0 });
      }
    }
  }, Y[0]);
  return draw(32, 24, x => { x.drawImage(stems, 0, 0); x.drawImage(grains, 0, 0); });
}
function ripeCachua() {   // chùm cà chua 30x28
  const L = C6.leaf, Rr = C6.red;
  const leaves = part(30, 28, x => {
    leafShape(x, 15, 5, 5, 1, 3, L); leafShape(x, 15, 5, 25, 1, 3, L); leafShape(x, 15, 6, 15, 0, 2.6, L);
    line(x, L[2], 15, 5, 10, 12); line(x, L[2], 15, 5, 21, 12); line(x, L[2], 15, 6, 14, 18);
  }, L[0]);
  const fruit = (cx, cy, r) => part(30, 28, x => {
    oval(x, cx, cy, r, r * 0.92, 0, Rr, { spec: true });
    for (const [dx, dy] of [[0, -1], [-1, -1], [1, -1], [-2, -1], [2, -1], [0, -2]]) R(x, dx === 0 && dy === -2 ? L[2] : L[3], Math.round(cx) + dx, Math.round(cy - r * 0.92) + dy + 1);
  }, Rr[0]);
  return draw(30, 28, x => {
    x.drawImage(leaves, 0, 0);
    for (const [cx, cy, r] of [[9, 13, 5.2], [21, 12, 5], [14, 21, 5.6], [24, 21, 4.4]]) x.drawImage(fruit(cx, cy, r), 0, 0);
  });
}
function ripeBap() {   // trái bắp 28x30
  const L = C6.leaf, Y = C6.yellow;
  const cob = part(28, 30, x => {
    for (let py = 3; py <= 25; py++) for (let px = 8; px <= 19; px++) {
      const u = (px + 0.5 - 14) / 5.6, v = (py + 0.5 - 14) / 11.5;
      if (u * u + v * v > 1) continue;
      const kern = ((px & 1) ^ ((py >> 1) & 1)) === 0;
      let c = u < -0.35 ? Y[4] : u > 0.45 ? Y[2] : Y[3];
      if (!kern && (py & 1)) c = u > 0.3 ? Y[1] : Y[2];
      if (u < -0.4 && v < -0.3 && kern) c = Y[5];
      R(x, c, px, py);
    }
  }, Y[0]);
  const husk = part(28, 30, x => {
    leafShape(x, 12, 28, 4, 8, 3.6, L); leafShape(x, 16, 28, 24, 8, 3.6, L);
    leafShape(x, 13, 29, 9, 14, 2.6, ['#163a14', '#24561c', '#2f7028', '#3f8a34', '#5ea84a', '#8fcc6a']);
  }, L[0]);
  return draw(28, 30, x => {
    x.drawImage(cob, 0, 0); x.drawImage(husk, 0, 0);
    // râu bắp
    for (const [a, b] of [[12, 1], [14, 0], [16, 1], [13, 2]]) { R(x, '#a0603a', a, b, 1, 3); R(x, '#d8a050', a, b); }
  });
}
function ripeDau() {   // dâu tây 30x22
  const L = C6.leaf, Rr = C6.red;
  const leaves = part(30, 22, x => { leafShape(x, 15, 6, 4, 1, 3.2, L); leafShape(x, 15, 6, 26, 1, 3.2, L); leafShape(x, 15, 6, 15, 0, 2.8, L); }, L[0]);
  const berry = (cx, cy, s) => part(30, 22, x => {
    for (let py = Math.floor(cy - 4 * s); py <= Math.ceil(cy + 5 * s); py++) for (let px = Math.floor(cx - 5 * s); px <= Math.ceil(cx + 5 * s); px++) {
      const X = (px + 0.5 - cx) / s, Y = (py + 0.5 - cy) / s;
      const hw = Y < 0 ? 4.4 * Math.sqrt(Math.max(0, 1 - (Y / 4) ** 2)) : 4.4 * (1 - Y / 5.2);
      if (Y < -4 || Y > 5.2 || Math.abs(X) > hw) continue;
      const v = -X * 0.12 - Y * 0.14;
      let c = v > 0.3 ? Rr[4] : v > -0.2 ? Rr[3] : Rr[2];
      if (((px + py * 2) % 4 === 0) && Math.abs(X) < hw - 0.8 && Y > -3) c = v > 0 ? '#ffe680' : '#e8c040';   // hạt
      if (Math.hypot(X + 1.8, Y + 1.8) < 0.9) c = Rr[5];
      R(x, c, px, py);
    }
    for (const dx of [-2, -1, 0, 1, 2]) R(x, L[3], Math.round(cx) + dx, Math.round(cy - 4 * s) + (Math.abs(dx) === 2 ? 1 : 0));
    R(x, L[4], Math.round(cx) - 1, Math.round(cy - 4 * s) - 1);
  }, Rr[0]);
  return draw(30, 22, x => { x.drawImage(leaves, 0, 0); for (const [cx, cy, s] of [[8, 12, 0.95], [22, 12, 0.95], [15, 15, 1.05]]) x.drawImage(berry(cx, cy, s), 0, 0); });
}
function ripeBingo() {   // bí ngô 30x26
  const O = C6.orange;
  const body = part(30, 26, x => {
    oval(x, 7.5, 15, 6.2, 8.4, 0, O, { spec: false });
    oval(x, 22.5, 15, 6.2, 8.4, 0, O, { lift: -0.15 });
    oval(x, 15, 15.5, 7.4, 9.4, 0, O, { spec: true });
    // rãnh múi
    for (let py = 8; py <= 23; py++) { R(x, O[2], 9 + (py > 19 ? 1 : 0) - (py < 11 ? 0 : 0), py); R(x, O[2], 20 - (py > 19 ? 1 : 0), py); }
    for (let py = 10; py <= 21; py++) { R(x, O[1], 21 - (py > 19 ? 1 : 0), py); }
  }, O[0]);
  const stem = part(30, 26, x => {
    R(x, '#6b4020', 14, 2, 3, 5); R(x, '#8a5a2b', 14, 2, 1, 5); R(x, '#a8743a', 15, 2);
    leafShape(x, 17, 5, 25, 2, 2.4, C6.leaf, false);
    line(x, C6.leaf[3], 12, 5, 9, 3); R(x, C6.leaf[4], 9, 2);
  });
  return draw(30, 26, x => { x.drawImage(body, 0, 0); x.drawImage(stem, 0, 0); });
}
function ripeDuahau() {   // dưa hấu 30x26
  const G = C6.wmel;
  const body = part(30, 26, x => {
    for (let py = 4; py <= 25; py++) for (let px = 1; px <= 28; px++) {
      const u = (px + 0.5 - 15) / 13.6, v = (py + 0.5 - 15) / 10.4, d = u * u + v * v;
      if (d > 1) continue;
      const stripe = Math.abs(Math.sin((u * 2.4 + Math.sin(v * 3) * 0.12) * Math.PI)) < 0.32;
      const lit = -u * 0.5 - v * 0.8 - d * 0.3 + 0.3;
      let c = stripe ? (lit > 0.2 ? G[2] : G[1]) : lit > 0.45 ? G[4] : lit > -0.05 ? G[3] : G[2];
      if (Math.hypot(u + 0.42, v + 0.48) < 0.13) c = G[5];
      R(x, c, px, py);
    }
  }, G[0]);
  const stem = part(30, 26, x => { R(x, '#5c3a1a', 14, 1, 2, 4); leafShape(x, 16, 3, 23, 1, 2, C6.leaf, false); });
  return draw(30, 26, x => { x.drawImage(body, 0, 0); x.drawImage(stem, 0, 0); });
}
const RIPE = { cai: ripeCai(), carot: ripeCarot(), lua: ripeLua(), cachua: ripeCachua(), bap: ripeBap(), dau: ripeDau(), bingo: ripeBingo(), duahau: ripeDuahau() };

// =====================================================================
// VẬT PHẨM TÚI ĐỒ (SPR.items 28x28)
// =====================================================================
const CROP_TINT = {
  cai: C6.leaf, carot: C6.orange, lua: C6.gold, cachua: C6.red, bap: C6.yellow, dau: C6.pink, bingo: C6.orange, duahau: C6.wmel,
  // 8 cây mới (art4.js): dải màu theo nông sản, gốc [3] trùng màu miệng túi bản 1x
  hanhla: ['#1f4a2a', '#2e6e3a', '#47924c', '#6cb466', '#a0d890', '#d8f4c8'],
  dauphong: C6.wood,
  raumuong: ['#163a14', '#24561c', '#2f7028', '#3f8a34', '#5ea84a', '#8fcc6a'],
  dualeo: ['#2f4a12', '#4a6a1c', '#6a8c2c', '#8aa83e', '#b4c862', '#dce49a'],
  khoailang: ['#3e0c22', '#6e1c3e', '#9c2e58', '#c04a78', '#e07aa0', '#f8b8d0'],
  ot: ['#3a0610', '#6e0e1c', '#a0182a', '#cc2a36', '#ee5a5a', '#ffc0b8'],
  suhao: ['#24103a', '#3e1c5e', '#5c2e84', '#7a46a8', '#a070c8', '#d0b0e8'],
  bapcai: ['#1c4038', '#2a5e4c', '#3f7e62', '#5e9e7a', '#8cc49c', '#c4e6c8'],
};
// Túi hạt giống: túi giấy kraft, miệng gấp màu theo cây (mép răng cưa), in hình nông sản 22x18 vẽ cùng nét với cây trồng 2x
// (art10.js SEEDPIC10)
function seedBag(id) {
  const T = CROP_TINT[id], pic = SEEDPIC10[id];
  return draw(28, 28, x => {
    shadow(x, 14, 26, 11, 1.6, 0.22);
    // thân túi
    R(x, OUT, 2, 5, 24, 22);
    R(x, '#f3ead2', 3, 6, 22, 20); R(x, '#fffaea', 3, 6, 1, 20); R(x, '#fffaea', 3, 6, 22, 1);
    R(x, '#d9c9a0', 22, 7, 3, 19); R(x, '#c8b68a', 24, 7, 1, 19); R(x, '#d9c9a0', 3, 24, 22, 2);
    for (const fy of [9, 17]) R(x, '#e6dabc', 4, fy, 17, 1);   // nếp giấy
    // miệng túi gấp
    R(x, OUT, 1, 0, 26, 9);
    R(x, T[3], 2, 1, 24, 7); R(x, T[4], 2, 1, 24, 2); R(x, T[2], 2, 6, 24, 1); R(x, T[1], 2, 7, 24, 1);
    for (let px = 2; px < 26; px += 4) { R(x, '#ffffff', px, 2, 2, 1); R(x, T[5], px, 3); }
    // hình nông sản
    if (pic) x.drawImage(pic, 3, 8);
  });
}
// Lọ thuốc: nắp màu, cổ kính, thân bo góc, nhãn trắng có dấu
function bottleHD(liq, capC, mark, rays) {
  return draw(28, 28, x => {
    if (rays) for (const [a, b, c, d] of [[1, 4, 4, 7], [26, 4, 23, 7], [0, 16, 3, 16], [27, 16, 24, 16], [13, 0, 13, 1]]) { line(x, '#f7d547', a, b, c, d); }
    // nắp
    box(x, 8, 0, 12, 6, [mix(capC, '#ffffff', 0.45), capC, shade(capC, 0.72)]);
    // cổ
    R(x, OUT, 10, 5, 8, 5); R(x, '#dff3ff', 11, 5, 6, 5); R(x, '#ffffff', 11, 5, 2, 5); R(x, '#a8cce0', 16, 5, 1, 5);
    // thân
    const body = pix(28, 28, (px, py) => {
      if (py < 9 || py > 27 || px < 3 || px > 24) return null;
      const corner = (py === 9 || py === 27) && (px <= 4 || px >= 23) || (py === 10 || py === 26) && (px === 3 || px === 24);
      if (corner) return null;
      if (py === 9 || py === 27 || px === 3 || px === 24 || (py === 10 && (px === 4 || px === 23)) || (py === 26 && (px === 4 || px === 23))) return OUT;
      if (py < 12) return '#e6f6ff';   // phần kính trống trên mặt thuốc
      if (py === 12) return mix(liq, '#ffffff', 0.5);
      return px < 7 ? mix(liq, '#ffffff', 0.25) : px > 20 ? shade(liq, 0.72) : py > 23 ? shade(liq, 0.85) : liq;
    });
    x.drawImage(body, 0, 0);
    R(x, '#ffffff', 5, 11, 2, 6); R(x, '#ffffff', 5, 18, 1, 3);   // ánh kính
    // nhãn
    R(x, '#ffffff', 7, 16, 14, 9); R(x, '#e2e2ea', 7, 24, 14, 1); R(x, '#d0d0dc', 20, 16, 1, 9);
    mark(x);
  });
}
// Bao tải: miệng buộc túm, thân phình, dải màu, nhãn trắng có dấu
function sackHD(body, band, mark) {
  const rp = [mix(body, '#ffffff', 0.3), body, shade(body, 0.78), shade(body, 0.6)];
  return draw(28, 28, x => {
    const s = pix(28, 28, (px, py) => {
      if (py < 6) { const hw = 5 + (py > 3 ? 1 : 0); return Math.abs(px + 0.5 - 14) <= hw ? (Math.abs(px + 0.5 - 14) > hw - 1 || py === 0 ? OUT : (px % 3 === 0 ? rp[2] : rp[1])) : null; }
      const hw = py < 9 ? 8 + (py - 6) : py > 24 ? 11 - (py - 24) * 1.2 : 11;
      const X = px + 0.5 - 14;
      if (Math.abs(X) > hw || py > 27) return null;
      if (Math.abs(X) > hw - 1 || py === 27) return OUT;
      const t = X / hw;
      return t < -0.55 ? rp[0] : t > 0.55 || py > 24 ? rp[2] : (hash(px, py) < 0.12 ? rp[2] : rp[1]);
    });
    x.drawImage(s, 0, 0);
    R(x, OUT, 7, 6, 14, 3); R(x, band, 8, 7, 12, 1);   // dây buộc
    R(x, mix(band, '#ffffff', 0.4), 8, 7, 3, 1);
    R(x, OUT, 7, 11, 14, 12); R(x, '#ffffff', 8, 12, 12, 10); R(x, '#e4e0d8', 8, 21, 12, 1); R(x, '#ecebe6', 19, 12, 1, 10);
    mark(x);
  });
}
function hayIconHD() {
  return draw(28, 28, x => {
    for (const px of [4, 9, 15, 20, 23]) { line(x, '#c9a13a', px, 6, px + 2, 2); R(x, '#fff0a0', px + 2, 2); }
    R(x, OUT, 2, 6, 24, 20);
    const s = pix(22, 18, (px, py) => {
      const n = hash(px * 3, py >> 1), str = hash(px >> 2, py * 7 + (px & 3));
      if (py === 0) return '#fff0a0';
      let c = str < 0.25 ? '#c9a13a' : str > 0.85 ? '#fff0a0' : '#f0cf5a';
      if (px < 2) c = n < 0.5 ? '#fff0a0' : '#f0cf5a';
      if (px > 19 || py > 15) c = '#c9a13a';
      return c;
    });
    x.drawImage(s, 3, 7);
    R(x, OUT, 11, 6, 6, 20); R(x, '#e5452f', 12, 7, 4, 18); R(x, '#ff8a6a', 12, 7, 1, 18); R(x, '#a82818', 15, 7, 1, 18);
    R(x, '#3b2412', 3, 24, 22, 1);
  });
}
function boneHD() {
  const c = pix(28, 28, (px, py) => {
    const X = px + 0.5, Y = py + 0.5;
    const along = (X - Y) / Math.SQRT2;   // trục chéo
    const t = ((X + Y) / Math.SQRT2 - 19.8) ;   // toạ độ dọc trục
    void t;
    const k = (X - 4) * 0.5 + (24 - Y) * 0.5;
    const shaft = Math.abs(X + Y - 28) < 3.2 * Math.SQRT2 / 1.4 && X > 7 && X < 21;
    const knob = [[4.5, 21.5], [6.5, 23.5], [21.5, 4.5], [23.5, 6.5]].some(([cx, cy]) => Math.hypot(X - cx, Y - cy) < 3.4);
    if (!(shaft || knob)) return null;
    void along; void k;
    const lit = (X + Y) < 26 ? 1 : 0;
    const edge = X - Y;
    return lit && edge < 0 ? '#ffffff' : (X + Y) > 30 ? '#d8ccb0' : '#fff8ea';
  });
  outline(c, OUT, 0.3);
  return c;
}
function toolHandHD() {
  const S = C6.skin;
  return part(28, 28, x => {
    // lòng bàn tay
    for (let py = 11; py <= 26; py++) for (let px = 7; px <= 22; px++) {
      const u = (px + 0.5 - 14.5) / 8, v = (py + 0.5 - 19) / 8;
      if (u * u * 1.2 + v * v * 0.9 > 1) continue;
      R(x, u < -0.3 ? S[4] : u > 0.45 || v > 0.6 ? S[2] : S[3], px, py);
    }
    // bốn ngón
    for (const [fx, top, h] of [[7, 4, 9], [11, 1, 12], [15, 1, 12], [19, 4, 9]]) {
      for (let py = top; py < top + h; py++) { R(x, S[4], fx, py); R(x, S[3], fx + 1, py); R(x, S[2], fx + 2, py); }
      R(x, S[3], fx + 1, top - 1); R(x, '#ffe8d8', fx + 1, top + 1);   // móng sáng
    }
    // ngón cái
    for (let k = 0; k < 7; k++) { R(x, S[3], 1 + k, 12 + Math.round(k * 0.4), 2, 3); R(x, S[4], 1 + k, 12 + Math.round(k * 0.4)); }
    R(x, S[2], 10, 24, 10, 1);
  }, '#5a2e1a');
}
// Cán gỗ chéo từ (x0,y0) xuống (x1,y1), dày 2 + sáng một bên
function handle(x, x0, y0, x1, y1, W = C6.wood) {
  line(x, OUT, x0 + 1, y0, x1 + 1, y1); line(x, OUT, x0 - 1, y0, x1 - 1, y1); line(x, OUT, x0, y0 - 1, x1, y1 - 1); line(x, OUT, x0, y0 + 1, x1, y1 + 1);
  line(x, W[3], x0, y0, x1, y1); line(x, W[4], x0 - 1 + 1, y0 - 1 + 1, x1, y1);
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) if (i % 5 === 2) R(x, W[2], Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n));
}
function toolHoeHD() {
  return draw(28, 28, x => {
    for (let i = 0; i <= 18; i++) { const px = 25 - i, py = 1 + i; R(x, OUT, px - 1, py - 1, 4, 4); }
    for (let i = 0; i <= 18; i++) { const px = 25 - i, py = 1 + i; R(x, C6.wood[3], px, py, 2, 2); R(x, C6.wood[4], px, py); R(x, C6.wood[2], px + 1, py + 1); }
    // lưỡi cuốc
    R(x, OUT, 0, 18, 15, 10);
    R(x, '#b8b8c0', 1, 19, 13, 6); R(x, '#e8e8f0', 1, 19, 13, 2); R(x, '#8a8a98', 1, 24, 13, 2); R(x, '#ffffff', 2, 19, 4, 1);
    R(x, OUT, 2, 26, 11, 2); R(x, '#5a5a66', 3, 26, 9, 1);
    R(x, OUT, 13, 15, 5, 6); R(x, '#8a8a98', 14, 16, 3, 4); R(x, '#c0c0cc', 14, 16, 1, 3);
  });
}
function toolCanHD() {
  const B = C6.blue;
  return draw(28, 28, x => {
    // vòi + hoa sen
    for (let i = 0; i < 9; i++) { R(x, OUT, 16 + i, 16 - i, 3, 4); }
    for (let i = 0; i < 9; i++) { R(x, B[3], 17 + i, 17 - i, 1, 2); R(x, B[4], 17 + i, 17 - i); }
    R(x, OUT, 23, 2, 5, 8); R(x, B[4], 24, 3, 3, 6); R(x, B[5], 24, 3, 1, 5); R(x, B[2], 26, 4, 1, 5);
    // quai
    R(x, OUT, 0, 6, 6, 16); R(x, B[2], 1, 8, 3, 12); R(x, B[3], 1, 8, 1, 12); R(x, OUT, 4, 10, 2, 8);
    R(x, OUT, 4, 6, 12, 3); R(x, B[3], 5, 7, 10, 1);
    // thân
    R(x, OUT, 3, 10, 17, 18);
    R(x, B[2], 4, 11, 15, 16); R(x, B[4], 4, 11, 3, 15); R(x, B[5], 5, 12, 1, 10); R(x, B[1], 16, 12, 3, 15); R(x, B[1], 4, 23, 15, 4);
    R(x, B[3], 7, 11, 9, 1); R(x, '#ffffff', 8, 13, 2, 2);
  });
}
function toolShovelHD() {
  return draw(28, 28, x => {
    for (let i = 0; i <= 10; i++) { const px = 24 - i, py = 2 + i; R(x, OUT, px - 1, py - 1, 4, 4); }
    for (let i = 0; i <= 10; i++) { const px = 24 - i, py = 2 + i; R(x, C6.wood[3], px, py, 2, 2); R(x, C6.wood[4], px, py); }
    R(x, OUT, 20, 0, 8, 4); R(x, C6.wood[3], 21, 1, 6, 2); R(x, C6.wood[4], 21, 1, 6, 1);   // tay nắm
    const blade = pix(28, 28, (px, py) => {
      const X = px + 0.5 - 11, Y = py + 0.5 - 19;
      const u = (X - Y) / Math.SQRT2, v = (X + Y) / Math.SQRT2;
      if (Math.abs(u) > 5.2 - Math.max(0, v - 2) * 0.9 || v < -6 || v > 7) return null;
      return u < -2.5 ? '#f0f0f6' : u > 2.5 ? '#8a8a98' : v > 3 ? '#a8a8b4' : '#c8c8d0';
    });
    outline(blade, OUT, 0.3);
    x.drawImage(blade, 0, 0);
    R(x, '#ffffff', 8, 15, 1, 4);
  });
}
function toolBasketHD() {
  const B = ['#5a3c14', '#7a5a22', '#a8823a', '#cfa85a', '#ecd28e'];
  return draw(28, 28, x => {
    // quai
    for (let a = 0; a <= 20; a++) { const t = Math.PI * (a / 20); const px = Math.round(14 - Math.cos(t) * 9), py = Math.round(12 - Math.sin(t) * 10); R(x, OUT, px - 1, py - 1, 3, 3); }
    for (let a = 0; a <= 20; a++) { const t = Math.PI * (a / 20); const px = Math.round(14 - Math.cos(t) * 9), py = Math.round(12 - Math.sin(t) * 10); R(x, a < 8 ? '#e0a868' : '#b07a45', px, py); }
    // rau củ
    for (const [cx, cy, r6] of [[8, 11, C6.red], [14, 9, C6.leaf], [20, 11, C6.orange]]) { ell(x, OUT, cx, cy, 3.2, 3.2); oval(x, cx, cy, 2.6, 2.6, 0, r6, { spec: true }); }
    // thân giỏ đan
    const body = pix(28, 28, (px, py) => {
      if (py < 13 || py > 27) return null;
      const l = 1 + Math.floor((py - 13) / 5), r = 26 - Math.floor((py - 13) / 5);
      if (px < l || px > r) return null;
      if (px === l || px === r || py === 27) return OUT;
      if (py === 13) return OUT;
      if (py === 14 || py === 15) return px < 8 ? B[4] : B[3];
      const ck = ((px >> 2) + (py >> 1)) % 2;
      let v = ck ? 3 : 2;
      if (px <= l + 2) v++;
      if (px >= r - 2 || py >= 25) v--;
      if ((py & 1) === 0 && ck) v--;
      return B[Math.max(0, Math.min(4, v))];
    });
    x.drawImage(body, 0, 0);
  });
}
// Đồ trang trí cắt thành icon 28x28 (cùng cách cắt như bộ cũ fromDeco)
const fromDeco = (src, sx, sy, w, h, dx = 0, dy = 0) => draw(28, 28, x => x.drawImage(src, sx, sy, w, h, dx, dy, w, h));
function makeItems() {
  const items = {};
  for (const id of Object.keys(CROP_TINT)) items[`seed_${id}`] = seedBag(id);
  const skull = x => { R(x, OUT, 10, 17, 8, 7); R(x, '#ffffff', 11, 18, 6, 4); R(x, OUT, 12, 19, 2, 2); R(x, OUT, 15, 19, 2, 2); R(x, OUT, 13, 22, 3, 2); R(x, '#ffffff', 13, 22); R(x, '#ffffff', 15, 22); };
  const spark = x => { star4(x, 14, 20, 3, '#f7d547', '#ffffff', '#b36ad6'); };
  const cross = x => { R(x, '#b8202a', 12, 17, 4, 8); R(x, '#b8202a', 10, 19, 8, 4); R(x, '#e5452f', 12, 17, 3, 7); R(x, '#e5452f', 10, 19, 7, 3); R(x, '#ff8a6a', 12, 17, 1, 2); };
  const pills = x => { ell(x, OUT, 11, 20, 2.6, 2.6); ell(x, '#f59a23', 11, 20, 1.8, 1.8); R(x, '#ffe0a8', 10, 19); ell(x, OUT, 17, 21, 2.6, 2.6); ell(x, '#e5452f', 17, 21, 1.8, 1.8); R(x, '#ffb0a0', 16, 20); };
  items.pesticide = bottleHD('#5cb85c', '#e5452f', skull);
  items.growth = bottleHD('#b36ad6', '#f7d547', spark, true);
  items.medicine = bottleHD('#ff8fb1', '#ffffff', cross);
  items.vitamin = bottleHD('#f59a23', '#4fa83a', pills);
  items.fertilizer = sackHD('#8a5a2b', '#5c3a1a', x => { leafShape(x, 14, 20, 10, 13, 2.2, C6.leaf, false); leafShape(x, 14, 20, 18, 13, 2.2, C6.leaf, false); R(x, '#3d8c2a', 13, 18, 2, 3); R(x, '#6b4a2a', 11, 20, 6, 1); });
  items.feed_ga = sackHD('#f7d547', '#d19a1c', x => { for (const [gx, gy] of [[11, 18], [14, 17], [17, 18], [12, 15], [16, 15], [14, 19]]) { R(x, '#8a5a10', gx, gy + 1, 2, 1); R(x, '#e8b82a', gx, gy, 2, 1); R(x, '#fff09a', gx, gy); } });
  items.feed_heo = sackHD('#ff9db4', '#d8687f', x => { ell(x, OUT, 14, 17, 4, 3.4); ell(x, '#f4a4b8', 14, 17, 3.2, 2.6); ell(x, '#ea8ca4', 14, 18, 1.8, 1.2); R(x, OUT, 13, 18); R(x, OUT, 15, 18); R(x, OUT, 11, 15); R(x, OUT, 17, 15); });
  items.hay = hayIconHD();
  items.dogfood = boneHD();
  items.deco_scarecrow = fromDeco(DECO.deco_scarecrow, 2, 0, 28, 28);
  items.deco_flower = fromDeco(DECO.deco_flower, 0, 0, 20, 20, 4, 6);
  items.deco_lamp = fromDeco(DECO.deco_lamp, 0, 0, 16, 28, 6, 0);
  items.deco_bench = draw(28, 28, x => x.drawImage(benchHD(28, 18), 0, 6));
  items.hand = toolHandHD(); items.hoe = toolHoeHD(); items.can = toolCanHD(); items.shovel = toolShovelHD(); items.basket = toolBasketHD();
  return items;
}

// =====================================================================
// BIỂU TƯỢNG TRẠNG THÁI / HUD (SPR)
// =====================================================================
function grainHD() {   // bát thóc 18x12
  return draw(18, 12, x => {
    for (const [gx, gy] of [[4, 1], [8, 0], [12, 1], [6, 2], [10, 2], [14, 3], [2, 3]]) { ell(x, OUT, gx + 0.5, gy + 1.5, 1.6, 1.6); R(x, '#f7d547', gx, gy + 1, 2, 2); R(x, '#fff09a', gx, gy + 1); R(x, '#d19a1c', gx + 1, gy + 2); }
    R(x, OUT, 0, 4, 18, 3); R(x, OUT, 1, 7, 16, 3); R(x, OUT, 3, 10, 12, 2);
    R(x, '#b07a45', 1, 5, 16, 1); R(x, '#e0a868', 1, 5, 6, 1); R(x, '#8a5a2b', 2, 6, 14, 3); R(x, '#a8703e', 2, 6, 4, 2); R(x, '#5c3a1a', 4, 9, 10, 1);
  });
}
function bubbleHD() {   // bong bóng 26x30, đuôi chúc xuống-trái
  return pix(26, 30, (px, py) => {
    const inBody = (X, Y) => {
      if (Y < 0 || Y > 23 || X < 0 || X > 25) return false;
      const cx = X < 4 ? 4 : X > 21 ? 21 : X, cy = Y < 4 ? 4 : Y > 19 ? 19 : Y;
      return Math.hypot(X - cx, Y - cy) <= 4.2;
    };
    const tail = (X, Y) => Y >= 22 && Y <= 29 && X >= 8 && X <= 15 - (Y - 22) && X <= 15 && X >= 8 + Math.max(0, (Y - 25)) * 0;
    const T = (X, Y) => inBody(X, Y) || (Y >= 22 && Y <= 28 && X >= 8 && X < 8 + Math.max(1, 7 - (Y - 22) * 1.1));
    if (!T(px, py)) return null;
    if (!T(px - 1, py) || !T(px + 1, py) || !T(px, py - 1) || !T(px, py + 1)) return '#3b2412';
    void tail;
    if (py <= 2) return '#fffaf0';
    if (py >= 21 && inBody(px, py)) return '#e2d6b8';
    if (px >= 23) return '#e8dcc0';
    return '#f3ead2';
  });
}
function sparkleHD() {   // lấp lánh 10x10
  return draw(10, 10, x => {
    for (const [dx, dy] of [[0, -4], [0, -3], [0, 3], [0, 4], [-4, 0], [-3, 0], [3, 0], [4, 0]]) R(x, Math.abs(dx + dy) === 4 ? '#f7d547' : '#fff09a', 5 + dx, 5 + dy);
    R(x, '#ffffff', 4, 4, 2, 2); R(x, '#fff09a', 3, 4, 1, 2); R(x, '#fff09a', 6, 4, 1, 2); R(x, '#fff09a', 4, 3, 2, 1); R(x, '#fff09a', 4, 6, 2, 1);
    R(x, '#f7d547', 5, 1); R(x, '#f7d547', 9, 5);
  });
}
function arrowHD() {   // mũi tên chỉ xuống 18x16
  return pix(18, 16, (px, py) => {
    const X = px + 0.5;
    const inS = (X, Y) => (Y >= 0 && Y <= 6 && X >= 5 && X <= 13) || (Y >= 5 && Y <= 15 && Math.abs(X - 9) <= 9 - (Y - 5) * 0.86);
    if (!inS(X, py + 0.5)) return null;
    if (!inS(X - 1, py + 0.5) || !inS(X + 1, py + 0.5) || !inS(X, py - 0.5) || !inS(X, py + 1.5)) return '#3b2412';
    const t = (X - 9) / 6;
    return t < -0.4 ? '#fff09a' : t > 0.4 ? '#d19a1c' : py > 11 ? '#e8b82a' : '#f7d547';
  });
}
function signHD() {   // biển gỗ dấu cộng 24x24
  return draw(24, 24, x => {
    R(x, OUT, 0, 0, 24, 20);
    const s = pix(22, 18, (px, py) => { const g = hash(px >> 2, py) < 0.2; return py === 0 ? '#c8925a' : py === 17 ? '#6b4020' : g ? '#7a4e26' : py % 6 === 5 ? '#7a4e26' : '#8a5a2b'; });
    x.drawImage(s, 1, 1);
    R(x, '#ffffff', 10, 3, 4, 14); R(x, '#ffffff', 3, 8, 18, 4); R(x, '#d8d0c0', 13, 4, 1, 13); R(x, '#d8d0c0', 4, 11, 17, 1);
    R(x, OUT, 10, 20, 4, 4); R(x, '#5c3a1a', 11, 20, 2, 4); R(x, '#8a5a2b', 11, 20, 1, 4);
  });
}
// Đùi gà (đói) 18x16
function hungryHD() {
  return draw(18, 16, x => {
    const meat = part(18, 16, y => { oval(y, 12, 5.5, 5.2, 4.2, -0.6, C6.red, { spec: true }); }, C6.red[0]);
    const bone = part(18, 16, y => {
      for (let i = 0; i < 6; i++) R(y, i < 3 ? '#ffffff' : '#f3ead2', 3 + i, 11 - i, 2, 2);
      ell(y, '#fff8ea', 2.5, 12.5, 1.8, 1.8); ell(y, '#fff8ea', 4.5, 14, 1.6, 1.4); R(y, '#ffffff', 2, 11);
    }, OUT);
    x.drawImage(bone, 0, 0); x.drawImage(meat, 0, 0);
  });
}
// Mặt xanh ốm 18x18
function sickHD() {
  return draw(18, 18, x => {
    ell(x, OUT, 9, 9, 8, 8);
    oval(x, 9, 9, 7.2, 7.2, 0, ['#1f4a1c', '#2f7a30', '#4a9e3e', '#5cb85c', '#8cd47a', '#c8f0b0'], { spec: true });
    for (const ex of [5, 11]) { R(x, OUT, ex, 6, 2, 1); R(x, OUT, ex, 8, 2, 1); R(x, OUT, ex + 1, 7); R(x, OUT, ex - 1 + 1, 7); }
    R(x, OUT, 6, 12, 6, 1); R(x, OUT, 5, 13); R(x, OUT, 12, 13);
    R(x, '#8cd47a', 13, 3); R(x, '#5fb8ff', 14, 10, 1, 2); R(x, '#ffffff', 14, 10);   // giọt mồ hôi
  });
}
function heartHD(fillRows = 99, top = C6.red) {   // trái tim 18x16
  const shape = (X, Y) => {
    const a = Math.hypot(X - 5.2, Y - 5.2) <= 4.3, b = Math.hypot(X - 12.8, Y - 5.2) <= 4.3;
    const tri = Y >= 5 && Y <= 15 && Math.abs(X - 9) <= (15 - Y) * 0.85;
    return a || b || tri;
  };
  return pix(18, 16, (px, py) => {
    const X = px + 0.5, Y = py + 0.5;
    if (!shape(X, Y)) return null;
    if (!shape(X - 1, Y) || !shape(X + 1, Y) || !shape(X, Y - 1) || !shape(X, Y + 1)) return OUT;
    if (py < 15 - fillRows) return '#f2dcd0';
    if (Math.hypot(X - 5, Y - 4.6) < 1.4) return '#ffffff';
    const v = -(X - 9) * 0.06 - (Y - 7) * 0.12;
    return v > 0.25 ? top[4] : v > -0.3 ? top[3] : top[2];
  });
}
function zzzHD() {   // 18x12 chữ Z xanh
  return draw(18, 12, x => {
    const Z = (ox, oy, s, col, dk) => {
      R(x, col, ox, oy, s * 2, 2); R(x, dk, ox, oy + 1, s * 2, 1);
      for (let i = 0; i < s * 2; i++) R(x, col, ox + s * 2 - 2 - i, oy + 2 + Math.floor(i * (s * 2 - 4) / (s * 2)), 2, 1);
      R(x, col, ox, oy + s * 2 - 2, s * 2, 2); R(x, dk, ox, oy + s * 2 - 1, s * 2, 1);
    };
    Z(0, 0, 5, '#8fd3ff', '#1f6fd1'); Z(11, 5, 3, '#8fd3ff', '#1f6fd1');
    outline(x.canvas, '#123e7a', 0.4);
  });
}
function milkHD() {   // chai sữa 12x18
  return draw(12, 18, x => {
    R(x, OUT, 3, 0, 6, 4); R(x, C6.blue[3], 4, 1, 4, 2); R(x, C6.blue[4], 4, 1, 2, 1);
    R(x, OUT, 2, 3, 8, 3); R(x, '#ffffff', 3, 4, 6, 1);
    R(x, OUT, 0, 5, 12, 13); R(x, '#ffffff', 1, 6, 10, 11); R(x, '#e4e8f0', 9, 7, 2, 10); R(x, '#d0d8e4', 1, 15, 10, 2);
    R(x, C6.blue[3], 1, 9, 10, 4); R(x, C6.blue[4], 1, 9, 10, 1); R(x, C6.blue[2], 9, 10, 2, 3);
    R(x, '#ffffff', 2, 7, 1, 2);
  });
}
function woolHD() {   // cuộn len 18x14
  return part(18, 14, x => {
    for (const [cx, cy, r] of [[5, 5, 3.6], [10, 4, 3.8], [14, 6, 3.4], [4, 9, 3.2], [9, 9, 4], [14, 10, 3.2]]) oval(x, cx, cy, r, r * 0.9, 0, C6.white, { noise: 0.1 });
    for (const [px, py] of [[8, 6], [12, 8], [6, 10]]) R(x, '#d8d0c4', px, py, 2, 1);
  }, '#6a6458');
}
// Nông sản vật nuôi (SPR.product): trứng 14x16, chai sữa 14x20, cuộn lông cừu 18x14
function eggHD() {
  return part(14, 16, x => {
    for (let py = 1; py <= 14; py++) for (let px = 1; px <= 12; px++) {
      const X = px + 0.5 - 7, Y = py + 0.5 - 8.4, ry = Y < 0 ? 7.4 : 6.2;
      const d = (X / 5.6) ** 2 + (Y / ry) ** 2;
      if (d > 1) continue;
      const v = -X / 5.6 * 0.5 - Y / ry * 0.75 - d * 0.3 + 0.3;
      R(x, v > 0.5 ? '#ffffff' : v > 0 ? '#fff8ea' : v > -0.4 ? '#efe2c8' : '#d8c6a4', px, py);
    }
    R(x, '#ffffff', 4, 4, 1, 3); R(x, '#ffffff', 5, 3);
  }, '#6b4a2a', 0.35);
}
function milkBottleHD() {
  return draw(14, 20, x => {
    R(x, OUT, 4, 0, 6, 4); R(x, C6.blue[3], 5, 1, 4, 2); R(x, C6.blue[4], 5, 1, 2, 1);
    R(x, OUT, 3, 3, 8, 3); R(x, '#ffffff', 4, 4, 6, 1);
    R(x, OUT, 1, 5, 12, 15); R(x, '#ffffff', 2, 6, 10, 13); R(x, '#e4e8f0', 10, 7, 2, 12); R(x, '#d0d8e4', 2, 17, 10, 2);
    // nhãn có giọt sữa xanh
    R(x, C6.blue[3], 2, 9, 10, 6); R(x, C6.blue[4], 2, 9, 10, 1); R(x, C6.blue[2], 10, 10, 2, 5);
    R(x, '#ffffff', 6, 10, 2, 1); R(x, '#ffffff', 5, 11, 4, 3); R(x, '#dfe8f4', 7, 13, 2, 1);
    R(x, '#ffffff', 3, 7, 1, 2);
  });
}
function pregnantHD() {   // vòng hồng có tim đỏ 18x16
  return draw(18, 16, x => {
    ell(x, OUT, 9, 8, 8, 7.4);
    oval(x, 9, 8, 7.2, 6.6, 0, C6.pink, { spec: true });
    const h = heartHD(99);
    x.drawImage(h, 0, 0, 18, 16, 4, 4, 10, 9);
  });
}

// =====================================================================
// CÔNG CỤ THEO CẤP (SPR2.tools 32x32) & HUD 24x24 (SPR2)
// =====================================================================
const METAL = [
  ['#3a3c44', '#4e5058', '#7a7e88', '#aeb2ba', '#e4e6ea', '#ffffff'],
  ['#4a1c0c', '#6e2c16', '#a8502a', '#d9844e', '#f8c09a', '#fff0e0'],
  ['#5e3a08', '#8a5410', '#c98e1c', '#f2c838', '#fff4b0', '#ffffff'],
];
const HANDLE = [C6.wood, ['#1e1006', '#2e1a0c', '#5a3818', '#7e5428', '#a87a44', '#c8a070'], ['#260c04', '#3a1408', '#6a2416', '#94382a', '#c25a44', '#e88a70']];
function finishTier(c, t, spots) {
  outline(c, OUT, 0.35);
  const x = c.getContext('2d');
  if (t === 1) R(x, '#ffffff', spots[0][0], spots[0][1]);
  if (t === 2) for (const [sx, sy] of spots) sparkleDot(x, sx, sy);
  return c;
}
function hoeT(t) {
  const M = METAL[t], Hd = HANDLE[t];
  const c = draw(32, 32, x => {
    for (let i = 0; i <= 17; i++) { R(x, Hd[4], 1 + i, 28 - i); R(x, Hd[4], 2 + i, 27 - i); R(x, Hd[3], 2 + i, 28 - i); R(x, Hd[3], 3 + i, 28 - i); R(x, Hd[2], 3 + i, 29 - i); }
    for (let i = 3; i < 17; i += 5) R(x, Hd[1], 3 + i, 28 - i);
    if (t > 0) { R(x, M[3], 6, 24, 2, 1); R(x, M[2], 7, 23, 2, 1); R(x, M[3], 8, 22, 2, 1); }   // đai kim loại ở cán
    // khâu + lưỡi cuốc chúc xuống
    R(x, Hd[4], 20, 10); R(x, Hd[3], 21, 10);
    const head = pix(14, 20, (px, py) => {
      if (py < 6) { if (px >= 1 && px <= 8 && (py > 0 || (px > 1 && px < 8))) return px < 3 ? M[4] : px > 6 ? M[1] : M[3]; return null; }
      if (px >= 3 && px <= 8 && py < 16) return px === 3 ? M[3] : px === 8 ? M[1] : (py % 4 === 0 ? M[2] : M[2]);
      if (py >= 14 && py <= 18 && px >= 1 && px <= 12 - (18 - py)) return py === 14 ? M[4] : py === 18 ? M[1] : px < 4 ? M[3] : M[2];
      return null;
    });
    x.drawImage(head, 17, 2);
    R(x, M[5], 20, 3); R(x, M[4], 21, 8, 1, 8);
  });
  return finishTier(c, t, [[24, 12], [28, 18]]);
}
function canT(t) {
  const M = METAL[t];
  const c = draw(32, 32, x => {
    // quai
    for (const [px, py] of [[6, 12], [6, 10], [7, 8], [8, 7], [10, 6], [12, 6], [14, 6], [16, 7], [17, 8], [18, 10]]) { R(x, M[2], px, py, 2, 2); R(x, M[3], px, py); }
    // thân
    const body = pix(32, 32, (px, py) => {
      if (px < 4 || px > 21 || py < 12 || py > 27) return null;
      if ((px === 4 || px === 21) && (py === 12 || py === 27)) return null;
      if (py === 14 && t > 0) return M[4];
      if (py === 12 || py === 13) return M[3];
      if (px <= 6) return M[4];
      if (px >= 19 || py >= 26) return M[1];
      if (px >= 17 || py >= 24) return M[2];
      return M[3];
    });
    x.drawImage(body, 0, 0);
    R(x, M[5], 5, 15, 1, 6);
    // vòi
    for (let i = 0; i < 8; i++) { R(x, M[3], 20 + i, 21 - i, 1, 2); R(x, M[2], 21 + i, 21 - i, 1, 2); }
    R(x, M[2], 21, 22, 2, 1);
    // hoa sen
    R(x, M[3], 26, 8, 4, 6); R(x, M[4], 26, 8, 1, 6); R(x, M[1], 29, 9, 1, 5); R(x, M[5], 27, 9);
    if (t === 0) { R(x, C6.blue[3], 8, 18, 8, 2); R(x, C6.blue[4], 8, 18, 3, 1); }   // nước trong bình
  });
  return finishTier(c, t, [[8, 16], [26, 4]]);
}
function sickleT(t) {
  const M = METAL[t], Hd = HANDLE[t];
  const c = draw(32, 32, x => {
    const blade = pix(32, 32, (px, py) => {
      const X = px + 0.5, Y = py + 0.5;
      const d1 = Math.hypot(X - 19.2, Y - 14.4), d2 = Math.hypot(X - 21.2, Y - 16.8);
      if (d1 > 11.6 || d2 < 9.8 || Y > 18.4 || X < 10) return null;
      if (d2 < 11.2) return M[4];
      if (d1 > 10.4) return M[1];
      return (X + Y < 24) ? M[3] : M[2];
    });
    x.drawImage(blade, 0, 0);
    // cán gỗ quấn dây
    for (let i = 0; i < 10; i++) { R(x, Hd[3], 10 - i, 18 + i, 2, 2); R(x, Hd[4], 10 - i, 18 + i); }
    for (const k of [3, 5, 7]) { R(x, '#2e1a0c', 10 - k, 18 + k, 2, 1); }
    R(x, M[2], 11, 16, 3, 2); R(x, M[3], 11, 16);
  });
  return finishTier(c, t, [[14, 6], [28, 12]]);
}
function basketT(t) {
  const B = ['#5a3c14', '#7a5a22', '#a8823a', '#cfa85a', '#ecd28e'];
  const rim = t === 0 ? ['#3e2610', '#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868', '#f0c890'] : METAL[t];
  const c = draw(32, 32, x => {
    for (let a = 0; a <= 24; a++) { const th = Math.PI * (a / 24); const px = Math.round(15.5 - Math.cos(th) * 9.5), py = Math.round(15 - Math.sin(th) * 11); R(x, rim[3], px, py, 2, 2); R(x, rim[4], px, py); }
    const veg = [[12, 14, C6.leaf], [18, 14, C6.red], [14, 12, C6.orange], [20, 12, C6.leaf], [10, 12, C6.red]];
    for (const [vx, vy, r6] of veg.slice(0, 2 + t + (t === 2 ? 1 : 0))) { ell(x, r6[1], vx, vy, 2.4, 2.4); oval(x, vx, vy, 2, 2, 0, r6, { spec: true }); }
    const body = pix(32, 32, (px, py) => {
      if (py < 16 || py > 29) return null;
      const l = 4 + Math.floor((py - 16) / 3), r = 27 - Math.floor((py - 16) / 3);
      if (px < l || px > r) return null;
      if (py === 16 || py === 17) return px < 10 ? rim[4] : rim[3];
      if (py === 18) return rim[2];
      const ck = ((px >> 2) + (py >> 1)) % 2;
      let v = ck ? 3 : 2;
      if (px <= l + 2) v++;
      if (px >= r - 2 || py >= 28) v--;
      if ((py & 1) && !ck) v--;
      return B[Math.max(0, Math.min(4, v))];
    });
    x.drawImage(body, 0, 0);
  });
  return finishTier(c, t, [[22, 18], [8, 4]]);
}
// Tia sét thể lực 24x24 (mệt: xám, có vết nứt)
function boltHD(tired) {
  const P = tired ? ['#3a3a44', '#6a6a76', '#9a9aa6', '#c8c8d0', '#e8e8ee'] : ['#3b2412', '#f08a1a', '#ffd83a', '#ffe878', '#fffbd8'];
  const inS = (X, Y) => {
    // hai nửa tia: trên (rộng dần sang phải) và dưới, nối ở giữa
    const up = Y >= 1 && Y <= 13 && X >= 13 - Y * 0.75 && X <= 20 - Y * 0.75 + (Y > 8 ? (Y - 8) * 1.4 : 0);
    const mid = Y >= 9 && Y <= 13 && X >= 3 && X <= 22;
    const dn = Y >= 12 && Y <= 23 && X >= 13 - (Y - 12) * 0.75 && X <= 17.5 - (Y - 12) * 0.75;
    return up || mid || dn;
  };
  const c = pix(24, 24, (px, py) => {
    const X = px + 0.5, Y = py + 0.5;
    if (!inS(X, Y)) return null;
    if (!inS(X - 1.2, Y) || !inS(X + 1.2, Y) || !inS(X, Y - 1.2) || !inS(X, Y + 1.2)) return P[0];
    const t = X - (13 - Y * 0.6);
    return t < 2 ? P[4] : Y > 14 && t > 2.5 ? P[1] : Y < 9 && t > 5 ? P[2] : P[2 + (t < 4 ? 1 : 0)];
  });
  if (tired) { const x = c.getContext('2d'); for (const [px, py] of [[12, 8], [11, 9], [11, 10], [12, 11], [11, 12], [10, 13]]) R(x, '#3a3a44', px, py); }
  return c;
}
function sweatHD(f) {
  const drop = (s) => {
    const w = s ? 10 : 6, h = s ? 12 : 8;
    return outline(pix(w, h, (px, py) => {
      const X = px + 0.5 - w / 2, Y = py + 0.5;
      const r = (w / 2 - 1);
      const inS = Y < h * 0.45 ? Math.abs(X) <= r * (Y / (h * 0.45)) : Math.hypot(X, Y - h * 0.6) <= r;
      if (!inS || Y > h - 1) return null;
      if (X < -r * 0.3 && Y < h * 0.65 && Y > h * 0.3) return '#ffffff';
      return X > r * 0.35 || Y > h * 0.75 ? '#3f8ce0' : '#8fd3ff';
    }), '#1f4f9a', 0.4);
  };
  const big = drop(1), small = drop(0);
  return draw(16, 16, x => {
    if (f === 0) { x.drawImage(big, 0, 2); x.drawImage(small, 10, 0); }
    else { x.drawImage(big, 0, 4); x.drawImage(small, 10, 6); R(x, 'rgba(255,255,255,0.8)', 12, 0, 2, 2); R(x, 'rgba(255,255,255,0.8)', 14, 2, 2, 2); }
  });
}
function hoaMaiHD() {
  const c = pix(24, 24, (px, py) => {
    const X = px + 0.5, Y = py + 0.5;
    if (Math.hypot(X - 12, Y - 12) < 3) return (X + Y < 24) ? '#f59a23' : '#d0700f';
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + k * Math.PI * 2 / 5, cx = 12 + Math.cos(a) * 5.8, cy = 12 + Math.sin(a) * 5.8;
      const dx = X - cx, dy = Y - cy;
      if (dx * dx + dy * dy < 17.6) {
        const rad = (dx * Math.cos(a) + dy * Math.sin(a));
        if (Math.abs(dx * Math.sin(a) - dy * Math.cos(a)) < 0.6 && rad < 1.5 && rad > -3) return '#f0b020';   // gân cánh
        return dx + dy < -2.4 ? '#fff6a0' : dx + dy > 2.6 ? '#e0a818' : '#ffd83a';
      }
    }
    return null;
  });
  outline(c, OUT, 0.35);
  const x = c.getContext('2d');
  for (const [px, py] of [[11, 10], [13, 11], [11, 13], [13, 13]]) R(x, '#9e2416', px, py);
  R(x, '#fff6a0', 12, 12); R(x, '#ffd870', 10, 11);
  return c;
}
function sunHD() {
  const c = pix(24, 24, (px, py) => {
    const X = px + 0.5 - 12, Y = py + 0.5 - 12, d = Math.hypot(X, Y);
    if (d < 6.4) return X + Y < -4 ? '#fff6b0' : X + Y > 4.5 ? '#f5a623' : Math.hypot(X + 2.4, Y + 2.4) < 1.5 ? '#ffffff' : '#ffd83a';
    const a = (Math.atan2(Y, X) / (Math.PI / 4) + 8) % 1;
    if (d > 8 && d < 11.4 && (a < 0.16 || a > 0.84)) return d < 9.6 ? '#ffc84a' : '#f59a23';
    return null;
  });
  return outline(c, OUT, 0.35);
}
function mapleHD() {
  const c = pix(24, 24, (px, py) => {
    const X = px + 0.5 - 12, Y = py + 0.5 - 11;
    const a = Math.atan2(X, -Y), r = Math.hypot(X, Y);
    // 5 thùy nhọn: bán kính dao động theo góc
    const lobes = 7.6 + 2.6 * Math.cos(a * 5) ** 2 * (Math.abs(a) < 2.4 ? 1 : 0.2) - (Math.abs(a) > 2.5 ? 3.5 : 0);
    const serr = 0.6 * Math.abs(Math.sin(a * 15));
    if (r > lobes - serr) {
      if (Math.abs(X) < 0.8 && Y > 4 && Y < 12) return '#6b4020';   // cuống
      return null;
    }
    if (Math.abs(X) < 0.7 && Y > -8 && Y < 6) return '#f7d547';   // gân giữa
    if (Math.abs(Math.abs(X) - Math.abs(Y) * 0.9) < 0.6 && Y < 3 && Y > -6) return '#f0b030';
    const v = -X * 0.06 - Y * 0.08;
    return v > 0.28 ? '#ffa040' : v < -0.2 ? '#c43a1a' : '#e8601a';
  });
  return outline(c, OUT, 0.35);
}
function snowHD() {
  const c = draw(24, 24, x => {
    const C = '#e8f6ff', L = '#9ad0f0';
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) for (let i = -9; i <= 9; i++) { const px = 11 + dx * i, py = 11 + dy * i; R(x, Math.abs(i) > 6 ? L : C, px, py, (dx && dy) ? 1 : (dx ? 1 : 2), (dx && dy) ? 1 : (dx ? 2 : 1)); }
    for (const s of [1, -1]) for (const [ax, ay] of [[0, 6], [6, 0]]) {
      const bx = 11 + ax * s, by = 11 + ay * s;
      if (ax) { R(x, L, bx + s, by - 2); R(x, L, bx + s, by + 3); R(x, L, bx + 2 * s, by - 3); R(x, L, bx + 2 * s, by + 4); }
      else { R(x, L, bx - 2, by + s); R(x, L, bx + 3, by + s); R(x, L, bx - 3, by + 2 * s); R(x, L, bx + 4, by + 2 * s); }
    }
    R(x, '#ffffff', 11, 11, 2, 2);
  });
  return outline(c, '#24508a', 0.35);
}
// Lá thuôn 4 sắc cho mầm "Đúng mùa": nửa hứng sáng (trên-trái) nhạt có vệt bóng, nửa kia đậm, gân giữa tối
function tagLeaf(x, x0, y0, x1, y1, w, G) {
  const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  for (let py = Math.floor(Math.min(y0, y1) - w - 1); py <= Math.max(y0, y1) + w + 1; py++) for (let px = Math.floor(Math.min(x0, x1) - w - 1); px <= Math.max(x0, x1) + w + 1; px++) {
    const X = px + 0.5 - x0, Y = py + 0.5 - y0, t = (X * ux + Y * uy) / L, s = -X * uy + Y * ux;
    if (t < 0 || t > 1) continue;
    const hw = w * Math.sin(Math.PI * Math.min(1, t * 1.08)) ** 0.7;
    if (Math.abs(s) > hw) continue;
    const lit = Math.sign(s) * (uy * 0.6 - ux * 0.8) > 0;
    let col = lit ? G[1] : G[2];
    if (lit && Math.abs(s) > hw * 0.4 && t > 0.25 && t < 0.7) col = G[0];
    if (!lit && Math.abs(s) > hw * 0.6) col = G[3];
    if (Math.abs(s) < 0.5 && t > 0.08 && t < 0.85) col = G[2];
    R(x, col, px, py);
  }
}
// Nhãn "Đúng mùa" 20x20 (2x của SPR2.seasonTag): mầm hai lá trên thân cong
function seasonTagHD() {
  const G = ['#c4ec8a', '#8fd65a', '#5fb33e', '#3d8c2a'];
  const c = draw(20, 20, x => {
    line(x, '#6fb840', 10, 8, 9, 11); line(x, '#3d7c26', 11, 9, 10, 11);
    R(x, '#6fb840', 8, 11, 1, 6); R(x, '#4f9a30', 9, 11, 1, 6);
    R(x, '#2f6b1f', 6, 17, 6, 1); R(x, '#4f9a30', 7, 16, 1, 1); R(x, '#2f6b1f', 10, 16, 1, 1);
    tagLeaf(x, 8.5, 11.5, 2, 6.5, 2.6, G);
    tagLeaf(x, 10.5, 9.5, 16.5, 2, 3.2, G);
  });
  return outline(c, '#1e3d10', 0.35);
}
// Dấu "lớn chậm" 20x14 (2x của SPR2.slowSnail[f]): ốc sên vỏ cam xoắn, khung 1 thân co, đầu thụt vào
function slowSnailHD(f) {
  const SHELL = ['#ffe9a0', '#ffd06a', '#e89a3a', '#c06a28'], BODY = ['#f8f2dc', '#e4dcb6', '#c9bf98', '#a39670'];
  const tail = f ? 4 : 2;
  const c = draw(20, 14, x => {
    // thân: dải dưới vỏ, đuôi thon trái, cổ + đầu tròn bên phải
    R(x, BODY[1], tail, 10, 16 - tail, 1); R(x, BODY[2], tail, 11, 18 - tail, 1); R(x, BODY[3], tail, 11, 2, 1);
    R(x, BODY[2], 12, 9, 3, 2); R(x, BODY[1], 12, 9, 2, 1);
    ball(x, 16, 8, 2, 2.4, BODY, { noise: 0 });
    ball(x, 7, 6, 5, 4.2, SHELL, { spec: true, noise: 0.04, seed: 7 });
    // vân xoắn: từ tâm ra mép phải, mép sáng ở trong vòng xoắn
    const SP = [[7, 6], [8, 6], [8, 7], [7, 8], [5, 8], [4, 7], [4, 5], [5, 4], [7, 3], [9, 4], [10, 6], [10, 8], [9, 9]];
    for (let i = 1; i < SP.length; i++) line(x, '#a85a1e', SP[i - 1][0], SP[i - 1][1], SP[i][0], SP[i][1]);
    dots(x, '#fff0b8', [[6, 5], [6, 4], [5, 5]]);
  });
  outline(c, OUT, 0.35);
  // râu mắt (2x của các điểm SNAIL_EYES bộ cũ): nét 1px, mắt 2x2 có chấm sáng
  const x = c.getContext('2d');
  const eyes = f ? [[16, 5, 16, 2], [14, 5, 12, 2]] : [[16, 5, 18, 2], [14, 5, 14, 2]];
  for (const [x0, y0, x1, y1] of eyes) { line(x, OUT, x0, y0, x1, y1); R(x, OUT, Math.min(x1, 18), y1 - 2, 2, 2); R(x, '#ffffff', Math.min(x1, 18), y1 - 2); }
  return c;
}
function woodHD() {
  const c = draw(24, 24, x => {
    const log = (lx, ly) => {
      for (const [dy, col] of [[0, '#d09a5a'], [1, '#b07a45'], [2, '#8a5a2b'], [3, '#8a5a2b'], [4, '#8a5a2b'], [5, '#7a4e26'], [6, '#6b4020'], [7, '#5c3a1a'], [8, '#5c3a1a']]) R(x, col, lx, ly + dy, 14, 1);
      for (const [gx, gy, w] of [[2, 3, 3], [7, 4, 4], [4, 6, 3], [10, 2, 2], [11, 6, 2]]) R(x, '#5c3a1a', lx + gx, ly + gy, w, 1);
      R(x, '#e8b878', lx + 2, ly + 1, 5, 1);
      // mặt cắt tròn có vân
      ell(x, '#3b2412', lx + 14, ly + 4, 3.2, 4.4);
      ell(x, '#e8b878', lx + 14, ly + 4, 2.4, 3.6); ell(x, '#c98c4a', lx + 14, ly + 4, 1.4, 2.2); R(x, '#f6d6a0', lx + 13, ly + 1, 1, 2); R(x, '#8a5a2b', lx + 14, ly + 4);
    };
    log(4, 2); log(0, 12);
  });
  return outline(c, OUT, 0.35);
}
function stoneHD() {
  const c = rockField(24, 24, [[10, 14.4, 7.6, 6.4], [16.4, 10.8, 5.6, 5]], STONE, 3);
  outline(c, OUT, 0.3);
  R(c.getContext('2d'), '#4a4650', 10, 14, 1, 2);
  return c;
}
function guidebookHD() {
  return draw(24, 24, x => {
    R(x, OUT, 2, 0, 20, 24);
    R(x, '#3d8c2a', 3, 1, 18, 17); R(x, '#5fb33e', 4, 1, 17, 2); R(x, '#2a6a1e', 3, 1, 2, 17); R(x, '#2f7424', 19, 3, 2, 15);
    for (let y = 4; y < 17; y += 4) R(x, '#357a26', 3, y, 2, 1);
    const st = star5(12, 12, 6, 6, 5, C6.yellow, '#7a5a0c');
    x.drawImage(st, 6, 3);
    R(x, OUT, 3, 18, 18, 1);
    R(x, '#f3ead2', 3, 19, 18, 3); R(x, '#d8cba8', 3, 21, 18, 1); R(x, '#c9b88a', 19, 19, 2, 3);
    R(x, OUT, 14, 18, 3, 6); R(x, '#e5452f', 15, 18, 1, 5); R(x, '#9e2416', 15, 22); R(x, OUT, 15, 23);
  });
}
function todoHD() {
  return draw(24, 24, x => {
    R(x, OUT, 2, 2, 20, 22); R(x, '#b07a45', 3, 3, 18, 20); R(x, '#d09a5a', 3, 3, 18, 1); R(x, '#8a5a2b', 19, 3, 2, 20); R(x, '#8a5a2b', 3, 21, 18, 2);
    R(x, OUT, 5, 5, 14, 17); R(x, '#fbf6e6', 6, 6, 12, 15); R(x, '#e8dfc6', 17, 6, 1, 15);
    R(x, OUT, 8, 0, 8, 6); R(x, '#aeb2ba', 9, 1, 6, 3); R(x, '#e4e6ea', 9, 1, 3, 1); R(x, '#7a7e88', 9, 3, 6, 1);
    for (let i = 0; i < 3; i++) {
      const y = 8 + i * 4;
      if (i < 2) { R(x, '#3f8f2c', 7, y + 1); R(x, '#3f8f2c', 8, y + 2); R(x, '#3f8f2c', 9, y + 1); R(x, '#3f8f2c', 10, y); R(x, '#7fc858', 10, y - 1); }
      else { R(x, '#9a9a9a', 7, y, 3, 3); R(x, '#fbf6e6', 8, y + 1); }
      R(x, '#a8a8a8', 12, y + 1, 5, 1);
    }
  });
}
function giftIconHD() {
  const RIB = ['#9e2416', '#e5452f', '#ff9a7a'];
  return draw(24, 24, x => {
    R(x, OUT, 2, 8, 20, 16);
    R(x, '#b07a45', 3, 9, 18, 14); R(x, '#e0a868', 3, 9, 18, 2); R(x, '#8a5a2b', 3, 20, 18, 3); R(x, '#8a5a2b', 19, 11, 2, 9);
    R(x, RIB[1], 10, 9, 4, 14); R(x, RIB[2], 10, 9, 1, 14); R(x, RIB[0], 13, 9, 1, 14);
    R(x, RIB[1], 3, 14, 18, 2); R(x, RIB[2], 3, 14, 6, 1); R(x, RIB[0], 3, 15, 18, 1);
    // nơ
    R(x, OUT, 3, 0, 18, 9);
    x.clearRect(3, 0, 2, 2); x.clearRect(19, 0, 2, 2); x.clearRect(10, 0, 4, 3);
    for (const px of [5, 14]) { R(x, RIB[1], px, 2, 5, 5); R(x, RIB[2], px, 2, 5, 1); R(x, RIB[2], px, 2, 1, 4); R(x, RIB[0], px, 6, 5, 1); }
    R(x, RIB[0], 10, 4, 4, 5); R(x, RIB[1], 10, 4, 4, 2);
  });
}
// Mũi tên báo động chỉ sang phải (24x24), cùng khuôn cho mũi tên chó sủa (vàng-cam)
function arrowRightHD(pal) {
  const inS = (X, Y) => (X >= 1 && X <= 14 && Y >= 7 && Y <= 16) || (X >= 12 && X <= 23 && Math.abs(Y - 11.5) <= 11.5 - (X - 12) * 1.0);
  return pix(24, 24, (px, py) => {
    const X = px + 0.5, Y = py + 0.5;
    if (!inS(X, Y)) return null;
    if (!inS(X - 1, Y) || !inS(X + 1, Y) || !inS(X, Y - 1) || !inS(X, Y + 1)) return pal.o;
    if (Y < 9.5 && X < 15 || (X >= 14 && Y < 11.5 - (23 - X) * 0.1 && Y - 11.5 < -(11.5 - (X - 12)) + 2.2)) return pal.w;
    if (Y > 14.5 && X < 14 || (X >= 13 && Y - 11.5 > (11.5 - (X - 12)) - 2.2)) return pal.R;
    return pal.r;
  });
}
// Bong bóng "GÂU GÂU!" 96x36: chữ pixel 5x5 vẽ gấp đôi, có bóng chữ
const GLYPH = {
  G: ['.###.', '#....', '#..##', '#...#', '.###.'],
  A: ['.###.', '#...#', '#####', '#...#', '#...#'],
  U: ['#...#', '#...#', '#...#', '#...#', '.###.'],
  '!': ['#', '#', '#', '.', '#'],
};
const HAT31 = ['..#..', '.#.#.'];
function barkBubbleHD() {
  const W = 96, H = 36, BH = 26, CRE = '#fff6e0', INK = '#3b2412';
  return draw(W, H, x => {
    const body = pix(W, H, (px, py) => {
      const inB = (X, Y) => {
        if (Y < 0 || Y >= BH || X < 0 || X >= W) return false;
        const cx = Math.max(4, Math.min(W - 5, X)), cy = Math.max(4, Math.min(BH - 5, Y));
        return Math.hypot(X - cx, Y - cy) <= 4.3;
      };
      const inT = (X, Y) => Y >= BH - 2 && Y < H && X >= 8 + (Y - BH + 2) * 0.1 && X <= 22 - (Y - BH + 2) * 1.2;
      const T = (X, Y) => inB(X, Y) || inT(X, Y);
      if (!T(px, py)) return null;
      if (!T(px - 1, py) || !T(px + 1, py) || !T(px, py - 1) || !T(px, py + 1)) return OUT;
      if (py < 3) return '#fffcf2';
      if (py > BH - 4 && inB(px, py)) return '#efe0c0';
      return CRE;
    });
    x.drawImage(body, 0, 0);
    const put = (g, gx, gy) => g.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') { R(x, '#c8a878', gx + i * 2 + 1, gy + j * 2 + 1, 2, 2); } }));
    const ink = (g, gx, gy) => g.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') R(x, INK, gx + i * 2, gy + j * 2, 2, 2); }));
    let gx = 8;
    for (const ch of 'GÂU GÂU!') {
      if (ch === ' ') { gx += 6; continue; }
      const base = ch === 'Â' ? 'A' : ch, g = GLYPH[base];
      put(g, gx, 10); if (ch === 'Â') put(HAT31, gx, 4);
      ink(g, gx, 10); if (ch === 'Â') ink(HAT31, gx, 4);
      gx += g[0].length * 2 + 2;
    }
  });
}
// Xích chó 36x20: cọc sắt + mắt xích tròn có lỗ, võng xuống
function dogChainHD() {
  const I = C6.iron;
  const c = draw(36, 20, x => {
    R(x, I[3], 2, 2, 6, 14); R(x, I[4], 2, 2, 2, 6); R(x, I[2], 6, 4, 2, 12); R(x, I[5], 2, 2, 6, 1); R(x, I[1], 2, 15, 6, 1);
    R(x, I[2], 1, 6, 8, 2); R(x, I[4], 1, 6, 3, 1);
    const pos = [[11, 5], [15, 7], [19, 9], [23, 10], [27, 10], [31, 8]];
    pos.forEach(([px, py], i) => {
      const vert = i % 2 === 0;
      const rx = vert ? 1.6 : 2.6, ry = vert ? 2.6 : 1.6;
      ell(x, I[3], px, py, rx, ry);
      R(x, I[5], Math.round(px - rx), Math.round(py - ry) + 1); R(x, I[4], Math.round(px - rx) + 1, Math.round(py - ry));
      R(x, I[1], Math.round(px + rx) - 1, Math.round(py + ry) - 1);
      x.clearRect(px - (vert ? 0 : 1), py - (vert ? 1 : 0), vert ? 1 : 2, vert ? 2 : 1);
    });
  });
  return outline(c, OUT, 0.35);
}
// Sao choáng 42x20, 3 khung lệch 1/3 vòng (sao 5 cánh nhỏ)
function stunHD(i) {
  const front = star5(9, 9, 4.5, 4.7, 4.2, C6.yellow), back = star5(9, 9, 4.5, 4.7, 3.6, ['#4e3a08', '#8a6a12', '#b8961e', '#d9b52f', '#f0d060', '#fff0a0']);
  return draw(42, 20, x => {
    const list = [0, 1, 2].map(k => {
      const a = (i / 3 + k / 3) * Math.PI * 2;
      return { px: Math.round(21 + Math.cos(a) * 16), py: Math.round(10 + Math.sin(a) * 5.5), back: Math.sin(a) < 0 };
    }).sort((a, b) => a.py - b.py);
    for (const s of list) x.drawImage(s.back ? back : front, s.px - 4, s.py - 4);
  });
}
// Xúc xích cong (28x28) và xúc xích dưới đất (22x14)
const SAUS = ['#4a1a0c', '#8e3d26', '#b4583a', '#d0805a', '#e8a070', '#ffd0b0'];
function sausageIconHD() {
  const pt = t => { const a = Math.PI * (1 + t * 0.52); return [23.2 + Math.cos(a) * 17.2, 22 + Math.sin(a) * 17.2]; };
  const c = draw(28, 28, x => {
    for (let i = 0; i <= 80; i++) {
      const t = i / 80, r = 4.4 * Math.sin(Math.PI * t) ** 0.35, [px, py] = pt(t);
      ell(x, SAUS[2], px, py, r, r);
    }
    for (let i = 0; i <= 80; i++) { const t = i / 80, r = 2.8 * Math.sin(Math.PI * t) ** 0.35, [px, py] = pt(t); ell(x, SAUS[3], px - 1, py - 1.2, r, r); }
    for (let i = 4; i <= 76; i++) { const t = i / 80, [px, py] = pt(t); R(x, SAUS[4], Math.round(px - 2.2), Math.round(py - 2.6)); }
    for (let i = 20; i <= 40; i += 2) { const t = i / 80, [px, py] = pt(t); R(x, SAUS[5], Math.round(px - 2.4), Math.round(py - 2.8)); }
    for (const t of [0, 1]) {
      const [px, py] = pt(t), dx = t ? 1.8 : -1.8, dy = t ? -1.8 : 1.8;
      ell(x, SAUS[1], px, py, 2, 2);
      ell(x, SAUS[2], px + dx, py + dy, 1.4, 1.4); R(x, '#e8c870', Math.round(px + dx * 1.6), Math.round(py + dy * 1.6));
    }
  });
  return outline(c, OUT, 0.3);
}
function sausageGroundHD() {
  const body = spr([
    '...oooooooooooooo...',
    '.ooLLLLCCCCCCCMMMoo.',
    'oDLLhhCCCCCCCCMMMMDo',
    'oDLCCCCCCCCCCMMMMMDo',
    'oDDMMMMMMMMMMMMMMDDo',
    '.ooDDDDDDDDDDDDDDoo.',
    '...oooooooooooooo...',
  ], { o: OUT, D: SAUS[1], M: SAUS[2], C: SAUS[3], L: SAUS[4], h: SAUS[5] });
  return draw(22, 14, x => { shadow(x, 11, 10, 9, 2.8, 0.26); x.drawImage(body, 1, 2); R(x, '#e8c870', 0, 5, 1, 2); R(x, '#e8c870', 21, 5, 1, 2); });
}
// Huy hiệu (32x36), bản mở và bản khóa xám có ổ khóa
const GREY = ['#4e4a52', '#77727a', '#a19ca2', '#cbc6c8', '#e6e2de'];
function padlockHD() {
  return outline(draw(10, 14, x => {
    R(x, '#aeaebe', 2, 0, 6, 2); R(x, '#aeaebe', 1, 1, 2, 6); R(x, '#aeaebe', 7, 1, 2, 6); R(x, '#e2e2ea', 2, 0, 3, 1); R(x, '#767686', 8, 2, 1, 5);
    R(x, '#c9a24a', 0, 6, 10, 8); R(x, '#f2c838', 0, 6, 10, 2); R(x, '#8a6a28', 0, 12, 10, 2); R(x, '#3b2f22', 4, 8, 2, 3); R(x, '#3b2f22', 5, 10, 1, 2);
  }), '#3b2f22', 0.3);
}
function medalHD(x, pal) {
  for (const [px, d] of [[8, -1], [20, 1]]) {
    for (let i = 0; i < 12; i++) { R(x, OUT, px + Math.round(d * i / 3) - 1, 22 + i, 6, 1); R(x, i < 11 ? pal.rib[(i >> 1) % 2 ? 0 : 1] : OUT, px + Math.round(d * i / 3), 22 + i, 4, 1); }
  }
  ell(x, OUT, 16, 15, 14, 14);
  ell(x, pal.rim[0], 16, 15, 13, 13);
  ell(x, pal.rim[1], 15.4, 14.4, 12, 12);
  ell(x, pal.bgD, 16, 15, 9.6, 9.6);
  ell(x, pal.bg, 15.5, 14.5, 8.6, 8.6);
  for (const [px, py] of [[8, 6], [7, 7], [6, 8], [6, 9], [9, 5], [10, 5]]) R(x, pal.rim[2], px, py);
}
function handHeartHD(P) {
  return outline(draw(22, 22, x => {
    for (const [cx, r0] of [[5, 4], [9, 2], [13, 2], [17, 4]]) { R(x, P.s, cx, r0, 2, 11 - r0); R(x, P.S, cx + 1, r0 + 1, 1, 9 - r0); }
    R(x, P.s, 5, 10, 14, 8);
    for (let k = 0; k < 5; k++) R(x, P.s, 1 + k, 7 + k, 3, 2);
    R(x, P.s, 7, 18, 10, 2);
    R(x, P.S, 18, 5, 1, 13); R(x, P.S, 6, 17, 13, 1); R(x, P.S, 7, 19, 10, 1);
    // tim giữa lòng bàn tay
    for (const [px, py, w] of [[8, 10, 3], [13, 10, 3], [8, 11, 8], [9, 12, 6], [10, 13, 4], [11, 14, 2]]) R(x, P.h, px, py, w, 1);
    R(x, P.H, 8, 10, 2, 1); R(x, P.H, 8, 11); R(x, P.R, 14, 12, 1, 1); R(x, P.R, 12, 14, 1, 1);
  }), OUT, 0.3);
}
const MASK_HD = [
  '..oooo......oooo..',
  '.oMMMMoooooooMMMMo',
  'oMmmMMMMMMMMMMmmMo',
  'oMmeeeMMMMMMeeemMo',
  'oMMeeeMMooMMeeeMMo',
  'oMMMMMMo..oMMMMMMo',
  '.oMMMMo....oMMMMo.',
  '..oooo......oooo..',
];
function helperBadgeHD(on) {
  const P = on
    ? { rim: ['#2f6b1f', '#5fb33e', '#bff08a'], bg: '#fff0c8', bgD: '#e8d4a0', rib: ['#9e2416', '#e5452f'], hand: { s: '#f0b080', S: '#c98058', h: '#e5452f', H: '#ff9a7a', R: '#9e2416' } }
    : { rim: [GREY[0], GREY[2], GREY[4]], bg: GREY[3], bgD: GREY[2], rib: [GREY[0], GREY[1]], hand: { s: GREY[2], S: GREY[1], h: GREY[1], H: GREY[2], R: GREY[0] } };
  return draw(32, 36, x => { medalHD(x, P); x.drawImage(handHeartHD(P.hand), 5, 4); if (!on) x.drawImage(padlockHD(), 21, 21); });
}
function robberBadgeHD(on) {
  const P = on
    ? { rim: ['#3a1d4e', '#6b3a8c', '#c79ae6'], bg: '#dccbf2', bgD: '#c0aae0', rib: ['#2e1a0c', '#6b4020'], mask: { o: OUT, M: '#1e1a22', m: '#5a5068', e: '#fff6e0' } }
    : { rim: [GREY[0], GREY[2], GREY[4]], bg: GREY[3], bgD: GREY[2], rib: [GREY[0], GREY[1]], mask: { o: OUT, M: GREY[1], m: GREY[2], e: GREY[4] } };
  return draw(32, 36, x => {
    medalHD(x, P);
    x.drawImage(spr(MASK_HD, P.mask), 7, 11);
    if (on) for (const [sx, sy] of [[21, 7], [11, 22]]) sparkleDot(x, sx, sy);
    if (!on) x.drawImage(padlockHD(), 21, 21);
  });
}
const PAW_HD = [
  '...pp..pp...',
  '..pPPppPPp..',
  'pp.pPp.pPp.pp',
  'pPp.......pPp',
  '.pp.pppp..pp.',
  '...pPPPPp....',
  '..pPPPPPPp...',
  '..pPPPPPPp...',
  '...pPPPPp....',
  '....pppp.....',
].map(r => r.padEnd(13, '.').slice(0, 13));
function guardBadgeHD(on) {
  const W = on ? ['#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868'] : GREY.slice(0, 4), I = on ? ['#2e2e36', '#4c4c58', '#767686', '#aeaebe', '#e2e2ea'] : GREY;
  return draw(32, 36, x => {
    for (let r = 0; r < 34; r++) {
      const half = r < 20 ? 14 : Math.max(0, 14 - Math.round((r - 19) * 14 / 15));
      if (half <= 0) { R(x, OUT, 15, r, 2, 1); continue; }
      R(x, OUT, 16 - half - 1, r, half * 2 + 2, 1);
      if (r === 0 || half < 2) continue;
      R(x, I[2], 16 - half, r, half * 2, 1);
      if (r > 2 && half > 3) R(x, W[1], 18 - half, r, half * 2 - 4, 1);
      if (r > 2 && half > 3) R(x, W[2], 18 - half, r, 2, 1);
    }
    R(x, I[4], 2, 1, 28, 1); R(x, I[3], 2, 2, 1, 18); R(x, I[3], 2, 1, 1, 1);
    for (const px of [10, 21]) R(x, W[0], px, 5, 1, 20);
    const pw = spr(PAW_HD, { p: on ? '#f3ead2' : GREY[4], P: on ? '#fffaf0' : '#ffffff' });
    x.drawImage(pw, 10, 8);
    if (!on) x.drawImage(padlockHD(), 21, 21);
  });
}

// =====================================================================
// SPR3: ICON TÚI ĐỒ 24x24, TRẠNG THÁI 18x16, HIỆU ỨNG TẮM, DẠY LỆNH
// =====================================================================
// Bọt xà phòng: vòng sáng, ánh cầu vồng
function soapBubble(x, cx, cy, r) {
  if (r <= 0) { R(x, '#ffffff', cx, cy); R(x, '#cfe4f8', cx + 1, cy + 1); return; }
  ell(x, '#9ab8d8', cx, cy, r, r);
  ell(x, '#eef6ff', cx, cy, r - 0.6, r - 0.6);
  if (r >= 2) ell(x, '#dbeaf8', cx + 0.5, cy + 0.5, r - 1.4, r - 1.4);
  R(x, '#ffffff', Math.round(cx - r * 0.5), Math.round(cy - r * 0.5), r >= 3 ? 2 : 1, 1);
  if (r >= 2) R(x, '#f8c8f0', Math.round(cx + r * 0.4), Math.round(cy + r * 0.3));
}
function soapBarHD() {
  return draw(24, 24, x => {
    ell(x, OUT, 12, 14, 10, 6.4);
    oval(x, 12, 14, 9.2, 5.6, 0, ['#8a2a50', '#d06a8a', '#e888a8', '#ffb8d0', '#ffd8e6', '#fff0f6'], { spec: true });
    R(x, '#e888a8', 6, 18, 12, 1);
    R(x, '#fff0f6', 8, 11, 5, 1);
    soapBubble(x, 18, 6, 2.6); soapBubble(x, 10, 4, 1.4); soapBubble(x, 22, 12, 1);
  });
}
function vaccineHD() {
  const c = draw(24, 24, x => {
    for (let i = 0; i < 11; i++) R(x, '#cfeaff', 5 + i, 16 - i, 3, 3);
    for (let i = 0; i < 10; i++) { R(x, '#5fd07a', 6 + i, 18 - i, 2, 1); R(x, '#ffffff', 5 + i, 15 - i); }
    for (let i = 1; i < 9; i += 3) R(x, '#7a8a9a', 7 + i, 14 - i, 2, 1);   // vạch chia
    line(x, '#aeaebe', 1, 22, 4, 19); R(x, '#e2e2ea', 1, 22);   // kim
    R(x, '#aeaebe', 13, 9, 6, 2); R(x, '#e2e2ea', 13, 9, 3, 1);   // tay đẩy ngang
    for (let i = 0; i < 4; i++) R(x, '#aeaebe', 17 + i, 5 - i + 2, 2, 2);
    R(x, '#767686', 20, 1, 3, 3); R(x, '#aeaebe', 20, 1, 2, 1);
  });
  return outline(c, OUT, 0.35);
}
function medicine3HD() {
  return draw(24, 24, x => {
    R(x, OUT, 6, 6, 12, 18); R(x, '#ff8fb1', 7, 10, 10, 13); R(x, '#ffc8d8', 7, 10, 2, 13); R(x, '#d86a8a', 15, 10, 2, 13); R(x, '#c05a7a', 7, 21, 10, 2);
    R(x, '#ffd8e6', 7, 7, 10, 3); R(x, '#ffffff', 8, 7, 2, 2);
    R(x, OUT, 8, 0, 8, 7); R(x, '#ffffff', 9, 1, 6, 5); R(x, '#e2e2ea', 13, 2, 2, 4); R(x, '#d0d0dc', 9, 5, 6, 1);
    R(x, '#ffffff', 9, 12, 6, 8); R(x, '#e8e2ea', 14, 12, 1, 8);
    R(x, '#e5452f', 11, 13, 2, 6); R(x, '#e5452f', 9, 15, 6, 2); R(x, '#ff7a5a', 11, 13); R(x, '#a82818', 12, 18);
  });
}
function treatHD() {
  return part(24, 24, x => {
    for (const [bx, by] of [[4, 8], [19, 8], [4, 15], [19, 15]]) oval(x, bx, by, 3.4, 3.4, 0, ['#5a3010', '#8a5420', '#b87a3c', '#d89a50', '#f2c27a', '#ffe0b0']);
    R(x, '#d89a50', 5, 9, 14, 6); R(x, '#f2c27a', 5, 9, 14, 2); R(x, '#b87a3c', 5, 14, 14, 1);
    for (const [px, py] of [[9, 11], [13, 12], [16, 10], [7, 13]]) R(x, '#8a5420', px, py);
  }, '#3b2412');
}
function catfoodHD() {
  return part(24, 24, x => {
    oval(x, 10, 12, 8.2, 5, 0, ['#5a3410', '#8a5420', '#b07030', '#c98a3a', '#f0c070', '#fff0c8'], { spec: false });
    for (const [px, py] of [[17, 8], [17, 16]]) R(x, '#c98a3a', px, py - 3 + (py > 10 ? 1 : 0), 5, 4);
    R(x, '#c98a3a', 16, 10, 3, 4);
    for (let i = 0; i < 4; i++) R(x, '#e0a850', 19 + i, 6 + i, 1, 1), R(x, '#a86a30', 19 + i, 17 - i, 1, 1);
    for (const [px, py] of [[8, 10], [11, 10], [9, 13], [12, 13], [14, 11]]) R(x, '#8a5420', px, py, 2, 1);   // vảy
    R(x, '#f0c070', 5, 9, 8, 1);
    R(x, '#fff6dc', 4, 10, 2, 2); R(x, '#3b2412', 4, 10); R(x, '#8a5420', 2, 13, 2, 1);
  }, '#3b2412');
}
function sausage3HD() {
  const c = draw(24, 24, x => {
    for (let i = 0; i < 16; i++) { const y = 14 - Math.round(Math.sin((i / 15) * Math.PI) * 4); ell(x, SAUS[2], 4 + i, y, 2.6, 2.6); }
    for (let i = 0; i < 16; i++) { const y = 14 - Math.round(Math.sin((i / 15) * Math.PI) * 4); R(x, SAUS[3], 3 + i, y - 1, 2, 1); }
    for (let i = 3; i < 13; i++) { const y = 14 - Math.round(Math.sin((i / 15) * Math.PI) * 4); R(x, SAUS[4], 4 + i, y - 2); }
    R(x, '#e8c870', 0, 15, 2, 3); R(x, '#e8c870', 22, 15, 2, 3);
  });
  return outline(c, OUT, 0.3);
}
function manureHD() {
  return draw(24, 24, x => {
    R(x, OUT, 4, 6, 16, 18); R(x, '#a07a48', 5, 7, 14, 16); R(x, '#c8a070', 5, 7, 3, 16); R(x, '#7a5a30', 16, 7, 3, 16); R(x, '#7a5a30', 5, 21, 14, 2);
    R(x, OUT, 6, 1, 12, 6); R(x, '#c8a070', 7, 2, 10, 4); R(x, '#e8c890', 7, 2, 4, 1); R(x, '#a07a48', 7, 5, 10, 1);
    R(x, OUT, 6, 6, 12, 1); R(x, '#8a5a2b', 7, 6, 10, 1);
    ell(x, '#3a2410', 12, 15, 3.6, 2.4); ell(x, '#5a3a1a', 12, 14.5, 2.8, 1.6); R(x, '#7a5434', 10, 13, 3, 1);
    leafShape(x, 13, 12, 17, 8, 1.6, C6.leaf, false); R(x, '#8fd65a', 16, 8);
  });
}
function feedSackHD() {
  return draw(20, 22, x => {
    shadow(x, 10, 20, 8.8, 2.4);
    R(x, OUT, 2, 4, 16, 18); R(x, '#d9c79a', 3, 5, 14, 15); R(x, '#efe2bd', 3, 5, 14, 4); R(x, '#efe2bd', 3, 5, 2, 15); R(x, '#b8a271', 3, 17, 14, 3); R(x, '#c8b488', 15, 7, 2, 12);
    R(x, OUT, 6, 0, 8, 6); R(x, '#c8b488', 7, 1, 6, 4); R(x, '#e2d4b0', 7, 1, 2, 3);
    R(x, OUT, 5, 4, 10, 2); R(x, '#8a5a2b', 6, 4, 8, 1); R(x, '#b07a45', 6, 4, 3, 1);
    R(x, '#e8c34a', 7, 9, 6, 6); R(x, '#8a5a10', 7, 13, 6, 2); R(x, '#f7d547', 8, 9, 3, 2); R(x, '#fff09a', 8, 9);
  });
}
// Trạng thái (18x16)
function dirtyIconHD() {
  return draw(18, 16, x => {
    ell(x, OUT, 8, 10, 7, 5);
    oval(x, 8, 10, 6.2, 4.2, 0, C6.mud, { spec: true });
    R(x, OUT, 8, 1, 2, 5); R(x, C6.mud[3], 8, 3, 2, 2); R(x, C6.mud[4], 8, 3);
    R(x, '#1a1a1e', 14, 2, 2, 2); R(x, '#d8e8f8', 12, 0, 2, 2); R(x, '#d8e8f8', 16, 0, 2, 2); R(x, '#ffffff', 12, 0);
  });
}
function strayIconHD() {
  const c = draw(18, 16, x => {
    // chữ z
    R(x, '#5fb8ff', 0, 4, 6, 2); R(x, '#5fb8ff', 3, 6, 2, 2); R(x, '#5fb8ff', 1, 8, 2, 2); R(x, '#5fb8ff', 0, 10, 6, 2); R(x, '#1f6fd1', 0, 11, 6, 1); R(x, '#1f6fd1', 0, 5, 6, 1);
    // dấu hỏi
    R(x, '#f59a23', 10, 0, 6, 2); R(x, '#f59a23', 8, 2, 2, 2); R(x, '#f59a23', 15, 2, 2, 4); R(x, '#f59a23', 13, 6, 2, 2); R(x, '#f59a23', 12, 8, 2, 3);
    R(x, '#ffd870', 10, 0, 3, 1); R(x, '#ffd870', 15, 2, 1, 2); R(x, '#f59a23', 12, 13, 2, 2);
  });
  return outline(c, '#3b2412', 0.45);
}
function warnHD() {
  return pix(18, 16, (px, py) => {
    const X = px + 0.5, Y = py + 0.5;
    const inS = (X, Y) => Y >= 0.5 && Y <= 15.5 && Math.abs(X - 9) <= (Y - 0.5) * 0.6 + 0.6;
    if (!inS(X, Y)) return null;
    if (!inS(X - 1, Y) || !inS(X + 1, Y) || !inS(X, Y - 1) || !inS(X, Y + 1)) return OUT;
    if (Math.abs(X - 9) < 1.1 && ((Y > 4 && Y < 10.5) || (Y > 11.5 && Y < 13.5))) return '#c0301f';
    if (Y < 6) return '#ffe878';
    return X - 9 > (Y - 0.5) * 0.3 ? '#e8b020' : '#f7c530';
  });
}
function hurtIconHD() {
  return draw(16, 16, x => {
    R(x, OUT, 0, 0, 16, 16);
    R(x, '#ffffff', 1, 1, 14, 14); R(x, '#e6e2d8', 1, 11, 14, 4); R(x, '#d8d2c4', 14, 2, 1, 13); R(x, '#fffdf6', 1, 1, 13, 1);
    for (const [px, py] of [[3, 3], [12, 3], [3, 12], [12, 12]]) R(x, '#d8d2c4', px, py);   // lỗ thoáng băng gạc
    R(x, '#b8202a', 6, 4, 4, 9); R(x, '#b8202a', 3, 6, 10, 4);
    R(x, '#e5452f', 6, 4, 3, 8); R(x, '#e5452f', 3, 6, 9, 3); R(x, '#ff7a5a', 6, 4, 1, 2); R(x, '#ff7a5a', 3, 6, 2, 1);
  });
}
function predIconHD() {
  return draw(16, 16, x => {
    const pad = (cx, cy, rx, ry) => { ell(x, '#8e1e12', cx, cy, rx, ry); ell(x, '#c0302a', cx - 0.4, cy - 0.4, rx - 0.6, ry - 0.6); R(x, '#e8604a', Math.round(cx - rx * 0.5), Math.round(cy - ry * 0.5)); };
    pad(4, 2.5, 1.4, 1.8); pad(11, 2.5, 1.4, 1.8); pad(1.6, 7, 1.2, 1.6); pad(13.6, 7, 1.2, 1.6);
    pad(7.5, 11, 4.4, 3.6);
  });
}
function heartNHD(n) {   // 18x16, tim đầy dần theo độ thân 1..5
  const c = heartHD(Math.ceil((n / 5) * 13), C6.red);
  const x = c.getContext('2d');
  if (n >= 5) { sparkleDot(x, 16, 1); R(x, '#fff3a0', 1, 11); }
  return c;
}
function strayArrowHD() { return arrowRightHD({ o: '#4a3208', w: '#ffeca8', r: '#f2b81e', R: '#b57a0c' }); }
function grainScatterHD() {
  return draw(32, 16, x => {
    for (let i = 0; i < 40; i++) {
      const px = Math.round(2 + hash(i, 2) * 27 + Math.sin(i) * 0.8), py = Math.round(2 + hash(i, 5) * 11);
      R(x, '#8a5a10', px, py + 1, 2, 1); R(x, i % 3 ? '#e8c34a' : '#f7d547', px, py, 2, 1); if (i % 4 === 0) R(x, '#fff0a0', px, py);
    }
  });
}
function soapOverlayHD(w, h, f, seed) {
  return draw(w, h, x => {
    const n = Math.round(w * h / 60);
    const list = [];
    for (let i = 0; i < n; i++) {
      const r = hash(i + seed, 3) < 0.25 ? 3.2 : hash(i + seed, 4) < 0.6 ? 2 : 0;
      const cx = 3 + Math.floor(hash(i * 7 + seed, 1) * (w - 6));
      let cy = 3 + Math.floor(hash(i * 3 + seed, 2) * (h - 6)) - f * (2 + (i % 2) * 2);
      if (cy < r + 1) cy += h - 6;
      list.push([cx, cy, r]);
    }
    list.sort((a, b) => a[2] - b[2]);
    for (const [cx, cy, r] of list) soapBubble(x, cx, cy, r);
  });
}
function splashHD(f) {
  return draw(40, 24, x => {
    const drop = (X, Y, big) => {
      if (big) { ell(x, '#1f6fd1', X, Y, 2, 2.4); ell(x, '#5fb8ff', X - 0.3, Y - 0.3, 1.2, 1.6); R(x, '#dff2ff', X - 1, Y - 1); R(x, '#1f6fd1', X, Y - 3); }
      else { R(x, '#1f6fd1', X, Y, 2, 2); R(x, '#8fd0ff', X, Y); R(x, '#8fd0ff', X, Y - 1, 1, 1); }
    };
    const t = [0.42, 0.75, 1][f];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1, a = 0.25 + (Math.floor(i / 2) / 7) * 1.1, sp = 0.75 + hash(i, 4) * 0.4;
      const X = Math.round(20 + side * Math.cos(a) * 18.4 * t * sp);
      const Y = Math.round(16 - Math.sin(a) * 18 * t * sp + 14 * t * t);
      if (Y < 4 || Y > 22 || X < 2 || X > 37) continue;
      if (f === 2 && i % 3 === 0) continue;
      drop(X, Y, i % 3 === 1 && f < 2);
    }
    if (f === 0) { R(x, '#dff2ff', 16, 12, 2, 2); R(x, '#dff2ff', 22, 10, 2, 2); R(x, '#8fd0ff', 18, 8, 2, 2); }
    if (f === 2) { ell(x, 'rgba(31,111,209,0.45)', 10, 22, 4, 0.6); ell(x, 'rgba(31,111,209,0.45)', 30, 22, 4, 0.6); }
  });
}
function sparkleCleanHD(f) {
  return draw(32, 28, x => {
    const S = [[[6, 8, 4], [22, 6, 2], [16, 20, 2]], [[6, 8, 2], [22, 6, 4], [26, 18, 2], [12, 22, 1]], [[6, 8, 1], [22, 6, 2], [26, 18, 4], [14, 14, 2]]][f];
    for (const [cx, cy, s] of S) star4(x, cx, cy, s, s >= 4 ? '#ffe86a' : '#fff3a0', '#ffffff', s >= 4 ? '#fff3a0' : null);
  });
}
function praiseHD(f) {
  const st = star5(22, 22, 11, 11.6, f ? 9.6 : 8, C6.yellow, '#7a5a0c');
  return draw(28, 28, x => {
    x.drawImage(st, f ? 3 : 3, f ? 2 : 3);
    for (const [tx, ty] of f ? [[24, 4], [2, 22]] : [[2, 2], [24, 24]]) { R(x, '#fff3a0', tx, ty, 2, 2); R(x, '#f7d547', tx, ty + (f ? -2 : 2), 2, 1); }
  });
}
// Icon lệnh 32x32
const DOGK = ['#08080c', '#111118', '#262634', '#40405a', '#6a6a88', '#9a9ab8'];
function iconSitHD() {
  return draw(32, 32, x => {
    ell(x, OUT, 16, 16, 15, 15); ell(x, '#f2e2c0', 16, 16, 13.4, 13.4); ell(x, '#fff8ea', 12, 12, 7, 6);
    const d = part(20, 22, y => {
      oval(y, 11, 14.4, 5, 5.4, 0, DOGK);           // thân ngồi
      R(y, DOGK[2], 4, 14, 3, 7); R(y, DOGK[3], 4, 14, 1, 7);   // chân trước
      oval(y, 8, 5.6, 1.6, 2.8, -0.2, DOGK); oval(y, 12.4, 5.8, 1.6, 2.6, 0.2, DOGK);   // tai
      oval(y, 10, 9.6, 4.4, 4, 0, DOGK);             // đầu
      oval(y, 5.2, 11.6, 2.4, 1.8, 0, DOGK, { lift: 0.25 });   // mõm
    }, '#000000', 0);
    const dx = d.getContext('2d');
    R(dx, '#e09a3a', 8, 8, 2, 1); R(dx, '#ffffff', 8, 8); R(dx, '#08080c', 2, 11, 2, 1); R(dx, '#c0302a', 6, 14, 5, 1);
    x.drawImage(d, 7, 5);
  });
}
function iconFollowHD() {
  return draw(32, 32, x => {
    const paw = (px, py, col, hl) => {
      for (const [dx, dy] of [[2, 0], [6, 0], [0, 3], [8, 3]]) { R(x, col, px + dx, py + dy, 2, 2); }
      ell(x, col, px + 4.5, py + 6.5, 3, 2.4); R(x, hl, px + 3, py + 5, 2, 1); R(x, hl, px + 2, py, 1, 1);
    };
    paw(1, 22, '#6a4a2a', '#9a7a52'); paw(11, 12, '#4a3420', '#8a6a48'); paw(21, 2, '#2e1c0e', '#6a4a2a');
  });
}
function iconGuardHD() {
  return pix(32, 32, (px, py) => {
    const X = px + 0.5, Y = py + 0.5;
    const half = Y < 18 ? 12 : 12 - (Y - 18) * 0.9;
    const inS = (X, Y) => Y > 2 && Y < 30.5 && Math.abs(X - 16) <= (Y < 18 ? 12 : 12 - (Y - 18) * 0.95);
    if (!inS(X, Y)) return null;
    if (!inS(X - 1, Y) || !inS(X + 1, Y) || !inS(X, Y - 1) || !inS(X, Y + 1)) return OUT;
    void half;
    const cross = (Math.abs(X - 16) < 2.2 && Y > 7 && Y < 23) || (Math.abs(Y - 13) < 2.2 && Math.abs(X - 16) < 7);
    if (cross) return X < 15 && Y < 12 ? '#fff09a' : '#f7d547';
    if (X < 16) return Y < 6 || X < 7 ? '#8ab4e6' : '#5a8ac4';
    return X > 25 ? '#223a58' : '#2e4a6e';
  });
}
function iconHerdHD() {
  const WOOL = ['#6a5e48', '#a4977e', '#cdc0a4', '#ebe1c8', '#fffaec', '#ffffff'], FACE = ['#0c0a0a', '#1c1616', '#302626', '#483a38', '#665450', '#8a7470'];
  return draw(32, 32, x => {
    ell(x, OUT, 16, 16, 15, 15); ell(x, '#f0641e', 16, 16, 13.4, 13.4); ell(x, '#ff9a4a', 14, 14, 10.6, 10.6);
    x.globalCompositeOperation = 'destination-out';
    ell(x, '#000', 16, 16, 9.8, 9.8); x.fillRect(18, 18, 14, 14);
    x.globalCompositeOperation = 'source-over';
    R(x, OUT, 22, 20, 10, 4); R(x, OUT, 24, 24, 6, 2); R(x, OUT, 26, 26, 2, 2);
    R(x, '#f0641e', 24, 21, 6, 2); R(x, '#f0641e', 26, 23, 2, 2); R(x, '#ff9a4a', 24, 21, 2, 1);
    const sh = part(18, 14, y => {
      R(y, FACE[2], 4, 10, 2, 4); R(y, FACE[2], 12, 10, 2, 4);
      oval(y, 10.4, 6.4, 6, 4.2, 0, WOOL, { noise: 0.2 });
      oval(y, 4, 6.8, 3.2, 3, 0, FACE);
    }, OUT, 0.3);
    R(sh.getContext('2d'), '#f2e8d8', 2, 6, 2, 1);
    x.drawImage(sh, 6, 9);
  });
}
function iconEggHD() {
  return draw(32, 32, x => {
    ell(x, OUT, 22, 20, 6.8, 8.8); oval(x, 22, 20, 6, 8, 0, ['#8a7a5a', '#c8b48c', '#e8dcbc', '#f4e8d0', '#fff8ea', '#ffffff'], { spec: true });
    ell(x, OUT, 8, 12, 7.2, 6); oval(x, 8, 12, 6.4, 5.2, 0, DOGK, { spec: true });
    for (const [px, py] of [[4, 12], [4, 14], [10, 12], [10, 14], [6, 16], [8, 16]]) R(x, '#000000', px, py, 2, 1);
    for (const [px, py] of [[14, 4], [18, 6], [16, 8], [20, 2]]) { R(x, '#cfeaff', px, py, 2, 1); R(x, '#ffffff', px, py); }
  });
}
function iconBirdHD() {
  const CR = ['#0a0a12', '#20202c', '#363648', '#525268', '#787892', '#a0a0bc'];
  return draw(32, 32, x => {
    const cr = part(28, 22, y => {
      R(y, C6.orange[2], 10, 17, 2, 4); R(y, C6.orange[2], 16, 17, 2, 4);
      oval(y, 23, 8.4, 3.2, 4.4, 0.4, CR);
      oval(y, 14.8, 12.8, 8.4, 5.2, 0, CR, { spec: true });
      oval(y, 16.4, 12, 5.2, 3, 0, CR, { lift: -0.2 });
      oval(y, 6.8, 7.6, 4.6, 4.2, 0, CR);
      R(y, C6.orange[3], 0, 7, 3, 2); R(y, C6.orange[4], 0, 7, 2, 1);
    }, OUT, 0.3);
    const cx = cr.getContext('2d'); R(cx, '#fff8ea', 5, 6, 2, 2); R(cx, '#0a0a12', 6, 7);
    x.drawImage(cr, 4, 6);
    for (let i = 0; i < 28; i++) { R(x, OUT, 1 + i, 2 + i, 3, 3); }
    for (let i = 0; i < 27; i++) { R(x, '#e5452f', 2 + i, 3 + i, 2, 2); }
    for (let i = 0; i < 10; i++) R(x, '#ff7a5a', 2 + i, 3 + i);
  });
}
function cmdBubbleHD() {   // 40x36, lòng trống cho icon lệnh
  return pix(40, 36, (px, py) => {
    const inB = (X, Y) => { if (Y < 0 || Y > 25 || X < 0 || X > 39) return false; const cx = Math.max(5, Math.min(34, X)), cy = Math.max(5, Math.min(20, Y)); return Math.hypot(X - cx, Y - cy) <= 5.3; };
    const inT = (X, Y) => Y >= 24 && Y <= 35 && Math.abs(X - 19.5) <= Math.max(0.6, 5 - (Y - 24) * 0.45);
    const T = (X, Y) => inB(X, Y) || inT(X, Y);
    if (!T(px, py)) return null;
    if (!T(px - 1, py) || !T(px + 1, py) || !T(px, py - 1) || !T(px, py + 1)) return OUT;
    if (py <= 2) return '#ffffff';
    if (py >= 20 && py <= 22 && inB(px, py)) return '#e8dcc4';
    return '#fff8ea';
  });
}
function sniffHD(f) {
  return draw(20, 20, x => {
    const rings = f ? [[9, 8, 7.6, '#9ad0f0'], [9, 8, 4.6, '#cfeaff']] : [[9, 8, 6.4, '#9ad0f0'], [9, 8, 3.6, '#cfeaff']];
    for (const [cx, cy, r, col] of rings) {
      for (let a = 0; a < Math.PI * 1.7; a += 0.05) {
        const rr = r * (1 - a / 14);
        R(x, col, Math.round(cx + Math.cos(a + 2.2) * rr), Math.round(cy + Math.sin(a + 2.2) * rr));
      }
    }
    R(x, '#fff8ea', 8, 8, 2, 2);
  });
}
function thiefBubbleHD() {
  return pix(28, 28, (px, py) => {
    const inB = (X, Y) => { if (Y < 0 || Y > 21 || X < 0 || X > 27) return false; const cx = Math.max(5, Math.min(22, X)), cy = Math.max(5, Math.min(16, Y)); return Math.hypot(X - cx, Y - cy) <= 5.3; };
    const inT = (X, Y) => Y >= 20 && Y <= 27 && X >= 11 && X <= 17 - (Y - 20) * 0.85;
    const T = (X, Y) => inB(X, Y) || inT(X, Y);
    if (!T(px, py)) return null;
    if (!T(px - 1, py) || !T(px + 1, py) || !T(px, py - 1) || !T(px, py + 1)) return OUT;
    if ((px === 13 || px === 14) && ((py >= 4 && py <= 13) || (py >= 16 && py <= 17))) return py < 6 ? '#ffffff' : px === 14 ? '#f8c0b4' : '#ffffff';
    if (py <= 2 || (px <= 2 && py < 12)) return '#ff7a5a';
    if (py >= 18 || px >= 25) return '#9e2416';
    return '#e5452f';
  });
}
function iconPayHD() {
  const S = C6.skin;
  return draw(32, 32, x => {
    ell(x, OUT, 16, 8, 6.8, 6.8);
    oval(x, 16, 8, 6, 6, 0, ['#5e3a08', '#9a5a10', '#d08a1c', '#f2b432', '#ffdc78', '#fff6c0'], { spec: true });
    R(x, '#9a5a10', 16, 4, 2, 9); R(x, '#9a5a10', 14, 6, 5, 1); R(x, '#9a5a10', 14, 11, 5, 1); R(x, '#ffdc78', 15, 4, 1, 1);
    for (const [px, py] of [[6, 4], [27, 9], [25, 2]]) sparkleDot(x, px, py);
    const hand = part(32, 14, y => {
      for (const fx of [3, 9, 15, 21]) { R(y, S[3], fx, 2, 4, 6); R(y, S[4], fx, 2, 1, 6); R(y, S[2], fx + 3, 3, 1, 5); }
      R(y, S[3], 1, 6, 26, 5); R(y, S[4], 1, 6, 26, 1); R(y, S[2], 2, 10, 24, 2); R(y, S[1], 4, 12, 20, 1);
    }, '#5a2e1a');
    x.drawImage(hand, 1, 17);
  });
}
function iconChoreHD() {
  return draw(32, 32, x => {
    // cán chổi chéo
    for (let i = 0; i < 24; i++) R(x, OUT, 5 + i, 29 - i, 3, 3);
    for (let i = 0; i < 23; i++) { R(x, '#b07a45', 6 + i, 29 - i, 1, 1); R(x, '#e0a868', 6 + i, 28 - i, 1, 1); }
    // bó rơm
    R(x, OUT, 0, 20, 12, 12); R(x, '#9a7428', 1, 21, 10, 10); R(x, '#c39a42', 1, 21, 8, 8); R(x, '#ddbb62', 1, 21, 5, 2);
    for (const [px, py] of [[3, 26], [7, 24], [5, 28], [2, 29], [9, 27]]) R(x, '#6e4e18', px, py, 1, 2);
    R(x, OUT, 2, 20, 8, 2); R(x, '#8a5a2b', 3, 20, 6, 1);
    // cán búa chéo ngược
    for (let i = 0; i < 24; i++) R(x, OUT, 27 - i, 29 - i, 3, 3);
    for (let i = 0; i < 23; i++) { R(x, '#8a5a2b', 28 - i, 29 - i); R(x, '#b07a45', 27 - i, 29 - i); }
    // đầu búa
    R(x, OUT, 0, 0, 16, 13); R(x, '#918c94', 1, 1, 14, 11); R(x, '#c4c0c6', 1, 1, 12, 2); R(x, '#dcd8d0', 1, 1, 4, 1);
    R(x, '#4a4650', 1, 10, 14, 2); R(x, '#6e6a74', 11, 3, 4, 7);
  });
}
function trainTrackHD() {
  return draw(192, 24, x => {
    R(x, OUT, 0, 0, 192, 24);
    R(x, '#8a5a2b', 1, 1, 190, 22); R(x, '#b07a45', 1, 1, 190, 2); R(x, '#5c3a1a', 1, 20, 190, 3);
    for (let px = 8; px < 190; px += 23) R(x, '#7a4e26', px, 3, 1, 3);   // vân gỗ
    R(x, OUT, 6, 6, 180, 12);
    R(x, '#e8d6b0', 7, 7, 178, 10); R(x, '#fff8ea', 7, 7, 178, 2); R(x, '#d0b88c', 7, 15, 178, 2);
    for (const nx of [3, 187]) { R(x, '#e0a868', nx, 4, 2, 2); R(x, '#3b2412', nx + 1, 5); R(x, '#5c3a1a', nx, 18, 2, 2); }
  });
}
function trainZoneHD() {
  return draw(48, 24, x => {
    R(x, OUT, 0, 4, 48, 16);
    R(x, '#5fb33e', 1, 5, 46, 14); R(x, '#8fd65a', 1, 5, 46, 4); R(x, '#c8f08a', 4, 5, 40, 1); R(x, '#3d8c2a', 1, 16, 46, 3);
    R(x, '#1e5a1c', 1, 5, 4, 14); R(x, '#1e5a1c', 43, 5, 4, 14);
    R(x, '#2f7a2a', 5, 5, 2, 14); R(x, '#2f7a2a', 41, 5, 2, 14);
  });
}
function trainMarkHD() {
  return pix(10, 32, (px, py) => {
    const X = px + 0.5, Y = py + 0.5;
    const hw = Y < 6 ? (Y - 0.5) * 0.9 + 0.5 : Y > 26 ? (31.5 - Y) * 0.9 + 0.5 : 2.6;
    const inS = (X, Y) => { const h2 = Y < 6 ? (Y - 0.5) * 0.9 + 0.5 : Y > 26 ? (31.5 - Y) * 0.9 + 0.5 : 2.6; return Y > 0 && Y < 32 && Math.abs(X - 5) <= h2 + (Y > 4 && Y < 10 || Y > 22 && Y < 28 ? 1.6 : 0); };
    void hw;
    if (!inS(X, Y)) return null;
    if (!inS(X - 1, Y) || !inS(X + 1, Y) || !inS(X, Y - 1) || !inS(X, Y + 1)) return OUT;
    return X < 5 ? '#ffb070' : X < 6.5 ? '#ff9a4a' : '#f0641e';
  });
}

// =====================================================================
// XUẤT (phần nền & thiên nhiên; phần biểu tượng ghép thêm bên dưới)
// =====================================================================
const bushes = [0, 1, 2].map(bushV);
const rocks = [0, 1, 2].map(rockV);
const forest = [0, 1, 2, 3, 4, 5].map(forestV);
const DECO = { deco_scarecrow: scarecrowHD(), deco_flower: flowerPotHD(), deco_lamp: lampHD(), deco_bench: benchHD() };

export const SPR12 = {
  // ---- SPR (art.js) ----
  soil: { untilled: untilledTile(), tilledWet: tilledTile(TILL_WET, 3, false), tilledDry: tilledTile(TILL_DRY, 1, true) },
  plot: tilledTile(PLOT_WET, 5, false),
  plotDry: tilledTile(PLOT_DRY, 7, true),
  wild: wildTile(),
  select: selectTile(),
  mud: mudHD(),
  tree: treeHD(),
  tuft: tuftHD(),
  flowers: [flowerHD('#ff8fb1', '#d8608a', '#f7d547'), flowerHD('#ffffff', '#cfc8c0', '#f7d547'), flowerHD('#5fb8ff', '#2f84d8', '#ffffff')],
  problem: { weed: weedHD(), bug: bugHD(), dry: dropHD() },
  deco: DECO,
  // ---- SPR2 (art2.js) ----
  bushes, rock: rocks[0], rocks,
  stump: stumpHD(),
  forestTile: forest[0], forest,
  lampPost: lampPostHD(),
};
// bush: SPR.bush (16x15) và SPR2.bush (16x16) trùng tên, cỡ khác nhau — xuất ảnh của SPR (32x30), còn SPR2.bush trỏ tới
// bushes[0] nên vẫn được nối qua SPR2.bushes. bench: SPR2.bench (24x14) — SPR không có khóa này.
SPR12.bush = bushHD();
SPR12.bench = benchStoneHD();

Object.assign(SPR12, {
  // ---- SPR (art.js): nông sản, túi đồ, biểu tượng ----
  ripe: RIPE,
  product: { trung: eggHD(), sua: milkBottleHD(), len: woolHD() },
  grain: grainHD(),
  bubble: bubbleHD(),
  sparkle: sparkleHD(),
  arrow: arrowHD(),
  sign: signHD(),
  // items: gộp SPR.items (28x28) và SPR3.items (24x24 / 20x22) — mỗi khóa con chỉ có ở một bộ
  items: {
    ...makeItems(),
    soapBar: soapBarHD(), vaccine: vaccineHD(), treat: treatHD(), catfood: catfoodHD(), sausage: sausage3HD(), manure: manureHD(), feedSack: feedSackHD(),
  },
  // status: gộp SPR.status (art.js) và SPR3.status (art3.js)
  status: {
    hungry: hungryHD(), sick: sickHD(), heart: heartHD(), zzz: zzzHD(), milk: milkHD(), wool: woolHD(), pregnant: pregnantHD(),
    heart1: heartNHD(1), heart2: heartNHD(2), heart3: heartNHD(3), heart4: heartNHD(4), heart5: heartNHD(5),
    dirtyIcon: dirtyIconHD(), strayIcon: strayIconHD(), warn: warnHD(), hurtIcon: hurtIconHD(), predIcon: predIconHD(),
  },
  // ---- SPR2 (art2.js): công cụ theo cấp, HUD, đồ của chó, huy hiệu ----
  tools: { hoe: [0, 1, 2].map(hoeT), can: [0, 1, 2].map(canT), sickle: [0, 1, 2].map(sickleT), basket: [0, 1, 2].map(basketT) },
  stamina: boltHD(false),
  staminaTired: boltHD(true),
  sweat: [sweatHD(0), sweatHD(1)],
  season: { xuan: hoaMaiHD(), ha: sunHD(), thu: mapleHD(), dong: snowHD() },
  seasonTag: seasonTagHD(),
  slowSnail: [slowSnailHD(0), slowSnailHD(1)],
  wood: woodHD(),
  stone: stoneHD(),
  guidebook: guidebookHD(),
  todo: todoHD(),
  giftIcon: giftIconHD(),
  alertArrow: arrowRightHD({ o: '#3b1208', w: '#ff9a7a', r: '#e5452f', R: '#9e2416' }),
  barkBubble: barkBubbleHD(),
  dogChain: dogChainHD(),
  stunStars: [0, 1, 2].map(stunHD),
  barkArrow: arrowRightHD({ o: OUT, w: '#fff0a0', r: '#f7d547', R: '#f59a23' }),
  sausage: sausageIconHD(),
  sausageGround: sausageGroundHD(),
  badges: {
    helper: { on: helperBadgeHD(true), off: helperBadgeHD(false) },
    robber: { on: robberBadgeHD(true), off: robberBadgeHD(false) },
    guard: { on: guardBadgeHD(true), off: guardBadgeHD(false) },
  },
  // ---- SPR3 (art3.js): hiệu ứng tắm, dạy lệnh, báo trộm ----
  // fx: chỉ 3 khóa con của nhóm này (fx.dirt / fx.flies ở art9.js, phần nối gộp sâu)
  fx: {
    soap: { s: [0, 1].map(f => soapOverlayHD(24, 18, f, 1)), m: [0, 1].map(f => soapOverlayHD(36, 24, f, 2)), l: [0, 1].map(f => soapOverlayHD(52, 30, f, 3)) },
    splash: [0, 1, 2].map(splashHD),
    sparkleClean: [0, 1, 2].map(sparkleCleanHD),
  },
  strayArrow: strayArrowHD(),
  grainScatter: grainScatterHD(),
  praise: pair(praiseHD),
  trickIcon: { sit: iconSitHD(), follow: iconFollowHD(), guard: iconGuardHD(), herd: iconHerdHD(), egg: iconEggHD(), bird: iconBirdHD() },
  cmdBubble: cmdBubbleHD(),
  sniffMark: pair(sniffHD),
  thiefBubble: thiefBubbleHD(),
  punishIcon: { pay: iconPayHD(), chore: iconChoreHD() },
  trainBar: { track: trainTrackHD(), zone: trainZoneHD(), mark: trainMarkHD() },
});
// Cặp ảnh không đặt chung khóa được: SPR.items.medicine (lọ 14x14, đã ở SPR12.items.medicine) và SPR3.items.medicine
// (hộp thuốc 12x12) trùng đường khóa. Bản 2x của SPR3.items.medicine nằm ở đây; render nối bằng
// hd.linkPair(SPR3.items.medicine, SPR12_EXTRA.medicine3).
export const SPR12_EXTRA = { medicine3: medicine3HD() };

// Khóa cấp trên → bộ cũ nó thay (để nối vào render / kiểm cỡ). 'SPR+SPR3' = nhánh gộp khóa con của cả hai bộ.
export const SPR12_FROM = {
  soil: 'SPR', plot: 'SPR', plotDry: 'SPR', wild: 'SPR', select: 'SPR', mud: 'SPR', tree: 'SPR', tuft: 'SPR', flowers: 'SPR',
  problem: 'SPR', deco: 'SPR', bush: 'SPR',
  bushes: 'SPR2', rock: 'SPR2', rocks: 'SPR2', stump: 'SPR2', forestTile: 'SPR2', forest: 'SPR2', lampPost: 'SPR2', bench: 'SPR2',
  ripe: 'SPR', product: 'SPR', grain: 'SPR', bubble: 'SPR', sparkle: 'SPR', arrow: 'SPR', sign: 'SPR',
  items: 'SPR+SPR3', status: 'SPR+SPR3',
  tools: 'SPR2', stamina: 'SPR2', staminaTired: 'SPR2', sweat: 'SPR2', season: 'SPR2', seasonTag: 'SPR2', slowSnail: 'SPR2', wood: 'SPR2', stone: 'SPR2', guidebook: 'SPR2',
  todo: 'SPR2', giftIcon: 'SPR2', alertArrow: 'SPR2', barkBubble: 'SPR2', dogChain: 'SPR2', stunStars: 'SPR2', barkArrow: 'SPR2',
  sausage: 'SPR2', sausageGround: 'SPR2', badges: 'SPR2',
  fx: 'SPR3', strayArrow: 'SPR3', grainScatter: 'SPR3', praise: 'SPR3', trickIcon: 'SPR3', cmdBubble: 'SPR3', sniffMark: 'SPR3',
  thiefBubble: 'SPR3', punishIcon: 'SPR3', trainBar: 'SPR3',
};
