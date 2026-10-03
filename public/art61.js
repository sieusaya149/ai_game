// Art hố ủ phân (issue 61). Hình mới nên có cả hai bản, cùng khóa:
//   SPR61_OLD = bản thường (cỡ như bộ cũ), SPR61 = bản 2x, mỗi ảnh đúng gấp đôi; hd.js nối hai bản qua SPR61_OLD.
//   compost[0..3] 32x24 (2x: 64x48): hố rỗng · đang bỏ đồ (đống lá, thân cây, phân) · đang ủ (đậy chiếu rơm, dây buộc, đá chặn)
//                                   · đã xong (mùn đen tơi, mầm non mọc lên). Chân đế 2x1 ô, đáy hình chạm đáy ô.
//   compostSteam[0..2] 16x14: hơi bốc lên khi đang ủ (render vẽ luân phiên) · compostDone 12x14: bao phân bón nhún nhảy trên hố đã xong
//   items.cay_heo / cay_chet / phan_cho 14x14: icon cây héo, cây chết, phân chó (kho, nút hành động)
// Mỗi hình vẽ một lần bằng hàm hình học theo toạ độ bản thường; vân gỗ, rơm, mùn, lá tô theo từng điểm ảnh của bản đang vẽ,
// nên bản 2x có chi tiết mịn gấp đôi chứ không phải phóng to. Viền tối 1px tự dựng ở bước cuối (mép trên-trái nhạt hơn).
// Phong cách theo art5: mỗi mảng 4 sắc độ, sáng từ trên-trái, điểm sáng.
import { canvas, hash } from './art.js';

const OUT = '#3b2412', OUT_L = '#6e4a2a';
const WOOD = ['#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868', '#f4c88c'];      // [tối, gốc tối, gốc, sáng, điểm sáng]
const INNER = ['#24140a', '#3a2212', '#55341a', '#6e4626'];               // gỗ phía trong hố (khuất bóng)
const SOIL = ['#1e120a', '#2e1c10', '#45301c', '#5e4228', '#7a5a3a'];
const HUMUS = ['#1a0f08', '#2a1a0e', '#3e2816', '#56391f', '#76522e'];   // mùn đã ủ: đen, tơi
const LEAF = ['#1e4d14', '#2f6b1f', '#3d8c2a', '#5fb33e', '#8fd65a'];
const WILT = ['#5a4a14', '#857224', '#ad9638', '#cdb658', '#e6d68a'];    // lá úa vàng
const DRY = ['#3c2c1e', '#5e4a36', '#806a52', '#a28c72', '#c4b096'];      // thân khô xám nâu
const DUNG = ['#2e1c0c', '#4a2e14', '#6a4422', '#8c6034', '#b88a5a'];
const HAY = ['#7a5a1a', '#a8822e', '#cfa544', '#e8c45a', '#f8e49a'];
const ROPE = ['#4e3a22', '#7a5e3a', '#a08458'];
const STONE = ['#4a4650', '#6e6a74', '#918c94', '#b8b4b8', '#dedad6'];
const IRON = ['#2e2e36', '#5e5e6a', '#9a9aa8', '#e2e2ea'];

// ---------- màu ----------
const PARSE = new Map();
function rgba(c) {
  let v = PARSE.get(c);
  if (v) return v;
  if (c[0] === '#') { const n = parseInt(c.slice(1, 7), 16); v = [n >> 16, (n >> 8) & 255, n & 255, 255]; }
  else { const m = c.match(/[\d.]+/g).map(Number); v = [m[0], m[1], m[2], Math.round((m[3] ?? 1) * 255)]; }
  PARSE.set(c, v);
  return v;
}

// ---------- lưới vẽ ----------
// Toạ độ x, y, w, h theo bản thường (số lẻ .5 = một điểm của bản 2x); màu là chuỗi hoặc hàm (X, Y) theo điểm ảnh thật.
function grid(w, h, k) {
  const W = w * k, H = h * k, d = new Uint8ClampedArray(W * H * 4), soft = new Uint8Array(W * H);
  const put = (X, Y, c, sf) => {
    if (!c || X < 0 || Y < 0 || X >= W || Y >= H) return;
    const [r, g, b, a] = rgba(c), i = (Y * W + X) * 4;
    if (a >= 255) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; soft[Y * W + X] = sf ? 1 : 0; return; }
    const sa = a / 255, da = d[i + 3] / 255, oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    d[i] = (r * sa + d[i] * da * (1 - sa)) / oa; d[i + 1] = (g * sa + d[i + 1] * da * (1 - sa)) / oa; d[i + 2] = (b * sa + d[i + 2] * da * (1 - sa)) / oa;
    d[i + 3] = oa * 255;
    if (sf || da === 0) soft[Y * W + X] = 1;
  };
  const col = (c, X, Y) => (typeof c === 'function' ? c(X, Y) : c);
  const at = v => Math.round(v * k);
  const g = {
    k, W, H,
    P(c, X, Y) { put(X, Y, col(c, X, Y)); },                                  // một điểm ảnh của bản đang vẽ
    R(c, x, y, w, h) { for (let Y = at(y); Y < at(y + h); Y++) for (let X = at(x); X < at(x + w); X++) put(X, Y, col(c, X, Y)); },
    E(c, cx, cy, rx, ry, clip) {                                               // elip; clip(X, Y) = false thì bỏ
      for (let Y = Math.floor((cy - ry) * k); Y <= Math.ceil((cy + ry) * k); Y++) for (let X = Math.floor((cx - rx) * k); X <= Math.ceil((cx + rx) * k); X++) {
        const u = ((X + 0.5) / k - cx) / rx, v = ((Y + 0.5) / k - cy) / ry;
        if (u * u + v * v <= 1 && (!clip || clip(X, Y))) put(X, Y, col(c, X, Y));
      }
    },
    // đường thẳng dày t (bản thường) từ (x0, y0) tới (x1, y1)
    L(c, x0, y0, x1, y1, t = 1) {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * k * 2) + 1, r = Math.max(1, Math.round(t * k));
      for (let i = 0; i <= n; i++) {
        const X = Math.floor((x0 + (x1 - x0) * i / n) * k), Y = Math.floor((y0 + (y1 - y0) * i / n) * k);
        for (let a = 0; a < r; a++) for (let b = 0; b < r; b++) put(X + a, Y + b, col(c, X + a, Y + b));
      }
    },
    shadow(cx, cy, rx, ry) { for (let Y = Math.floor((cy - ry) * k); Y <= Math.ceil((cy + ry) * k); Y++) for (let X = Math.floor((cx - rx) * k); X <= Math.ceil((cx + rx) * k); X++) { const u = ((X + 0.5) / k - cx) / rx, v = ((Y + 0.5) / k - cy) / ry; if (u * u + v * v <= 1) put(X, Y, 'rgba(30,20,10,0.26)', true); } },
    soft(c, x, y, w, h) { for (let Y = at(y); Y < at(y + h); Y++) for (let X = at(x); X < at(x + w); X++) put(X, Y, col(c, X, Y), true); },
    erase(x, y, w, h) { for (let Y = at(y); Y < at(y + h); Y++) for (let X = at(x); X < at(x + w); X++) if (X >= 0 && Y >= 0 && X < W && Y < H) { d.fill(0, (Y * W + X) * 4, (Y * W + X) * 4 + 4); soft[Y * W + X] = 0; } },
    // viền 1px quanh mọi mảng đặc (bỏ qua bóng, hơi): điểm trống sát mảng đặc thành viền; mép trên-trái hứng sáng thì nhạt hơn
    outline() {
      const solid = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H && d[(Y * W + X) * 4 + 3] >= 200 && !soft[Y * W + X];
      const marks = [];
      for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
        if (solid(X, Y)) continue;
        const l = solid(X - 1, Y), r = solid(X + 1, Y), u = solid(X, Y - 1), b = solid(X, Y + 1);
        if (!(l || r || u || b)) continue;
        marks.push([X, Y, (r || b) && !l && !u ? OUT_L : OUT]);
      }
      for (const [X, Y, c] of marks) put(X, Y, c);
    },
    canvas() {
      const c = canvas(W, H), x = c.getContext('2d'), img = x.createImageData(W, H);
      img.data.set(d); x.putImageData(img, 0, 0);
      return c;
    },
  };
  return g;
}

// Khối tròn có sáng trên-trái: ramp [rất tối, tối, gốc, sáng, điểm sáng]; nhiễu theo điểm ảnh cho kết cấu
function vol(g, ramp, cx, cy, rx, ry, grain = 0.25, seed = 1) {
  return (X, Y) => {
    const u = ((X + 0.5) / g.k - cx) / rx, v = ((Y + 0.5) / g.k - cy) / ry;
    let lit = -(u * 0.8 + v) / 1.3 + (hash(X + seed * 31, Y + seed * 17) - 0.5) * grain * 2;
    return lit > 0.62 ? ramp[4] : lit > 0.25 ? ramp[3] : lit > -0.2 ? ramp[2] : lit > -0.6 ? ramp[1] : ramp[0];
  };
}
// Vân gỗ ngang trong một tấm ván: sợi ngắn ngẫu nhiên tối/sáng hơn gốc
const grainH = (g, base, dark, light, seed) => (X, Y) => {
  const run = Math.floor((X + Math.floor(hash(Y, seed) * 9)) / (3 * g.k)), h = hash(run * 7 + seed, Y * 3 + seed);
  return h < 0.16 ? dark : h > 0.9 ? light : base;
};

// ---------- hố ủ ----------
// Khung hố: thùng ván không nắp, 4 cột góc. Nội dung (fill) vẽ giữa nền hố và vách trước nên đống đầy che vách sau.
function pit(k, fill) {
  const g = grid(32, 24, k);
  g.shadow(16, 21.6, 15.5, 2.4);
  // mép trên vách sau (hứng sáng) và mặt trong vách sau (khuất bóng)
  g.R(WOOD[3], 2, 3, 28, 1); g.R(grainH(g, WOOD[2], WOOD[1], WOOD[3], 3), 2, 4, 28, 1);
  g.R(grainH(g, INNER[3], INNER[2], INNER[3], 5), 3, 5, 26, 3);
  g.R(INNER[1], 3, 5, 26, 1);                                            // bóng dưới mép vách sau
  if (k === 2) for (const x of [9.5, 16, 22.5]) g.R(INNER[1], x, 5.5, 0.5, 2.5);   // khe ván
  // nền hố: đất tối, vài cục đất và sỏi
  g.R((X, Y) => { const h = hash(X * 3, Y * 5); return h < 0.15 ? SOIL[1] : h > 0.9 ? SOIL[3] : SOIL[2]; }, 3, 8, 26, 4);
  g.R(SOIL[0], 3, 8, 26, 1);
  // thành bên nhìn từ trên (mép ván dọc)
  for (const x of [2, 29]) { g.R(WOOD[2], x, 4, 1, 8); g.R(x === 2 ? WOOD[3] : WOOD[1], x, 4, 1, 8); }
  fill?.(g);
  // vách trước: hai tấm ván, mặt trên tấm cao hứng sáng
  g.R(grainH(g, WOOD[2], WOOD[1], WOOD[3], 11), 2, 12, 28, 4);
  g.R(grainH(g, WOOD[2], WOOD[1], WOOD[3], 17), 2, 16, 28, 5);
  g.R(WOOD[4], 2, 12, 28, k === 2 ? 0.5 : 1); if (k === 2) g.R(WOOD[3], 2, 12.5, 28, 0.5);
  g.R(WOOD[0], 2, 15.5, 28, 0.5); g.R(WOOD[1], 2, 16, 28, k === 2 ? 0.5 : 1);      // khe giữa hai tấm
  g.R(WOOD[1], 2, 20, 28, 1); if (k === 2) g.R(WOOD[0], 2, 20.5, 28, 0.5);          // chân ván khuất bóng
  g.soft('rgba(60,30,10,0.18)', 22, 13, 7, 7);                                        // bóng mờ phía phải
  // cột góc: mặt trái hứng sáng, mặt phải tối; đầu cột nhô cao hơn vách
  for (const x of [1, 28]) {
    g.R(WOOD[2], x, 2, 3, 20);
    g.R(WOOD[3], x, 2, 1, 20); g.R(WOOD[1], x + 2, 2, 1, 20);
    g.R(WOOD[4], x, 2, 3, 1); if (k === 2) { g.R(WOOD[3], x + 0.5, 2.5, 2, 0.5); g.R(WOOD[0], x + 2.5, 2.5, 0.5, 19.5); }
    g.R(WOOD[1], x, 21, 3, 1);
  }
  // đinh trên ván
  for (const [x, y] of [[4, 13.5], [26.5, 13.5], [4, 18], [26.5, 18]]) { g.R(IRON[0], x, y, 1, 1); if (k === 2) g.R(IRON[3], x, y, 0.5, 0.5); }
  // bảng gỗ nhỏ có hình lá (hố ủ phân)
  g.R(WOOD[0], 12, 14, 8, 6); g.R(WOOD[3], 13, 15, 6, 4); g.R(WOOD[4], 13, 15, 6, k === 2 ? 0.5 : 1); g.R(WOOD[2], 13, 18.5, 6, 0.5);
  if (k === 2) {
    g.E(LEAF[2], 16, 17, 2, 1.2); g.R(LEAF[4], 14.5, 16.5, 1.5, 0.5); g.R(LEAF[0], 15, 17, 2.5, 0.5); g.R(LEAF[1], 17.5, 17.5, 1, 0.5);
    for (const x of [13, 18.5]) { g.R(IRON[1], x, 14.5, 0.5, 0.5); }
  } else { g.R(LEAF[2], 15, 16, 2, 2); g.R(LEAF[4], 15, 16, 1, 1); g.R(LEAF[1], 16, 17, 1, 1); }
  g.outline();
  return g.canvas();
}

// Hố rỗng: chỉ ít cọng rơm, lá khô rơi trong đáy
const emptyFill = g => {
  g.R(HAY[2], 7, 10, 3, 1); g.R(HAY[3], 7, 10, 1, 1);
  g.R(WILT[2], 19, 9, 2, 1);
  g.R(SOIL[3], 13, 10, 2, 1); g.R(SOIL[4], 24, 10, 1, 1);
  if (g.k === 2) { g.R(HAY[1], 9, 10.5, 1.5, 0.5); g.R(WILT[1], 20.5, 9.5, 1, 0.5); g.R(STONE[3], 16, 11, 0.5, 0.5); g.R(STONE[2], 5, 9, 1, 0.5); }
};
// Đang bỏ đồ: đống lá úa, thân khô vun cao quá miệng hố; trên mặt có lá xanh, lá vàng, thân cây gác ngang, cục phân chuồng
const fillingFill = g => {
  const base = (X, Y) => {   // nền đống: mảng 3x3 điểm bản thường, mỗi mảng lá úa hoặc thân khô
    const h = hash(Math.floor(X / (3 * g.k)) * 5 + 3, Math.floor(Y / (3 * g.k)) * 7 + 1);
    return vol(g, h < 0.55 ? WILT : h < 0.85 ? DRY : LEAF, 15, 7.5, 13, 6.5, 0.3, 4)(X, Y);
  };
  g.E(base, 15.5, 8.6, 13.5, 6.6);
  const leaf = (ramp, x, y, rx, ry, sd) => g.E(vol(g, ramp, x, y, rx, ry, 0.15, sd), x, y, rx, ry);
  g.L(DRY[3], 5, 6, 14, 3, 1); g.L(DRY[1], 5.5, 7, 14, 4, 0.5);                  // thân cây khô gác ngang
  leaf(LEAF, 8, 3.6, 2.4, 1.4, 2); leaf(LEAF, 20.5, 3.4, 2.6, 1.5, 5); leaf(WILT, 14.5, 2.4, 2, 1.2, 3);
  leaf(LEAF, 24.5, 6.6, 2.2, 1.3, 8);
  g.L(LEAF[1], 20.5, 4.6, 21, 6.5, 0.5); g.L(LEAF[1], 8, 4.8, 8.5, 6.5, 0.5);    // cuống lá
  leaf(DUNG, 18, 8.4, 2.8, 1.8, 6); leaf(DUNG, 9, 9.4, 2.2, 1.4, 7);           // cục phân chuồng
  if (g.k === 2) { g.R(LEAF[4], 7, 3, 1, 0.5); g.R(LEAF[4], 19.5, 2.5, 1, 0.5); g.R(WILT[4], 14, 2, 0.5, 0.5); g.R(DUNG[4], 17, 7.5, 1, 0.5); g.R(DRY[4], 7, 5.5, 2, 0.5); }
};
// Đang ủ: chiếu rơm đậy kín, phồng nhẹ; hai dây buộc, hòn đá chặn giữa
const coverFill = g => {
  const straw = (X, Y) => {
    const y = Y / g.k + 0.5, sx = Math.floor((X + Math.floor(hash(Y, 9) * 7)) / (2 * g.k)), h = hash(sx * 3, Y * 5 + 2);
    const lit = y < 5.5 ? 1 : y > 10 ? -1 : 0;
    const i = Math.max(0, Math.min(4, 2 + lit + (h < 0.2 ? -1 : h > 0.85 ? 1 : 0)));
    return HAY[i];
  };
  g.E(straw, 16, 8.2, 14.5, 6, (X, Y) => Y / g.k < 12.5);
  g.R(straw, 2.5, 8, 27, 4.5);
  g.R('rgba(40,24,10,0.35)', 3, 11, 26, 1);                                  // mép rơm ẩm
  for (const x of [9, 23]) {   // dây buộc vắt qua
    g.R(ROPE[1], x, 2.6, 1, 9.8); g.R(ROPE[2], x, 2.6, g.k === 2 ? 0.5 : 0, 9.8);
    if (g.k === 2) for (let y = 4; y < 12; y += 1.5) g.R(ROPE[0], x + 0.5, y, 0.5, 0.5);
  }
  g.E(vol(g, STONE, 16, 5, 2.8, 1.9, 0.2, 8), 16, 5, 2.8, 1.9);
  g.L(HAY[4], 5, 7, 8, 6, 0.5); g.L(HAY[4], 25, 6.5, 27, 7.5, 0.5);
  if (g.k === 2) { g.L(HAY[1], 11, 10, 15, 9.5, 0.5); g.L(HAY[1], 18, 10.5, 21, 10, 0.5); g.R(STONE[4], 15, 4, 0.5, 0.5); }
};
// Đã xong: mùn đen tơi đầy hố, vụn sáng; hai mầm non mọc lên
const readyFill = g => {
  const humus = (X, Y) => {
    const base = vol(g, HUMUS, 15, 7.5, 13.5, 6.5, 0.45, 9)(X, Y), h = hash(X * 11 + 5, Y * 13 + 1);
    return h > 0.965 ? '#9a7a52' : h < 0.03 ? '#e8d8b0' : base;   // vụn rơm mục, vỏ trứng
  };
  g.E(humus, 16, 8.2, 14, 7);
  const sprout = (x, y, s) => {
    g.L(LEAF[1], x, y + 1.5, x, y + 3.5, 0.5);
    g.E(vol(g, LEAF, x - 1.2, y + 0.6, 1.4, 0.9, 0.15, s), x - 1.2, y + 0.6, 1.4, 0.9);
    g.E(vol(g, LEAF, x + 1.2, y + 0.2, 1.4, 0.9, 0.15, s + 1), x + 1.2, y + 0.2, 1.4, 0.9);
    if (g.k === 2) { g.R(LEAF[4], x - 1.5, y, 0.5, 0.5); g.R(LEAF[4], x + 0.5, y - 0.5, 0.5, 0.5); }
  };
  sprout(10, 0.8, 11); sprout(21.5, 1.6, 13);
};

// ---------- hơi bốc lên ----------
// 16x14: hai cột hơi so le cuộn lên, khung sau nhích lên 1/3 chu kỳ; trắng hai mức trong (không chuyển màu mịn), lên cao thì nhạt dần
function steam(k, f) {
  const g = grid(16, 14, k);
  const puff = (cx, cy, r, a) => {
    g.E(`rgba(232,238,242,${(a * 0.6).toFixed(2)})`, cx, cy, r, r * 0.85);
    g.E(`rgba(255,255,255,${a.toFixed(2)})`, cx - r * 0.3, cy - r * 0.3, r * 0.5, r * 0.42);
  };
  for (const [x0, ph] of [[5, 0], [11, 0.5]]) for (let j = 0; j < 3; j++) {
    const t = ((f / 3 + ph + j / 3) % 1), y = 12.5 - t * 10.5;
    puff(x0 + Math.sin((t + ph) * Math.PI * 2) * 1.4, y, 1.3 + t * 1.6, 0.85 * (1 - t * 0.75));
  }
  return g.canvas();
}

// ---------- dấu "đã xong": bao phân bón nhỏ có lá xanh và lấp lánh ----------
function done(k) {
  const g = grid(12, 14, k);
  g.E(vol(g, ['#3e2410', '#5c3a1a', '#8a5a2b', '#b07a45', '#d8a868'], 6, 9, 4.5, 4.5, 0.15, 3), 6, 9.2, 4.4, 4.2);
  g.R(vol(g, ['#3e2410', '#5c3a1a', '#8a5a2b', '#b07a45', '#d8a868'], 6, 6, 3, 3, 0.1, 4), 3.5, 3.5, 5, 3);   // cổ bao
  g.R('#c8a070', 3.5, 3.5, 5, 1);
  g.R(LEAF[2], 2, 8, 8, 2); g.R(LEAF[3], 2, 8, 8, g.k === 2 ? 0.5 : 1);    // dải xanh
  g.E(LEAF[4], 6, 8.9, 1.2, 0.8);
  if (g.k === 2) { g.R(LEAF[0], 5.5, 9, 1.5, 0.5); g.R('#e8c890', 4, 4, 1, 0.5); g.R('#f4dcb0', 3, 7.5, 0.5, 0.5); }
  g.outline();
  // lấp lánh góc trên-phải (không viền)
  const sp = (x, y) => { g.R('#fff6c0', x, y - 1, 1, 3); g.R('#fff6c0', x - 1, y, 3, 1); g.R('#ffffff', x, y, 1, 1); };
  sp(10, 1.5);
  return g.canvas();
}

// ---------- icon vật phẩm 14x14 ----------
// Cây héo: thân cong gục, lá úa vàng rủ xuống, bầu rễ đất
function cayHeo(k) {
  const g = grid(14, 14, k);
  g.E(vol(g, SOIL, 7, 11.5, 3.6, 1.8, 0.3, 2), 7, 11.6, 3.6, 1.8);
  g.L(DRY[2], 4.5, 12.5, 3, 13, 0.5); g.L(DRY[2], 9.5, 12.6, 11, 13, 0.5);   // rễ
  g.L(WILT[1], 7, 10.5, 6.5, 6, 1); g.L(WILT[1], 6.5, 6, 8.5, 3.2, 1);        // thân cong gục
  g.E(vol(g, WILT, 10, 4.6, 2.4, 1.3, 0.2, 4), 10, 4.6, 2.4, 1.3);            // ngọn gục
  g.E(vol(g, WILT, 4.4, 7.6, 2.4, 1.2, 0.2, 5), 4.4, 7.8, 2.4, 1.2);          // lá rủ trái
  g.E(vol(g, WILT, 9.6, 8.4, 2.2, 1.1, 0.2, 6), 9.6, 8.6, 2.2, 1.1);          // lá rủ phải
  g.R(DRY[1], 2.5, 8.5, 1, 1); g.R(DRY[1], 11.5, 9.2, 1, 1);                 // chóp lá cháy nâu
  if (g.k === 2) { g.R(WILT[4], 9, 4, 1, 0.5); g.R(WILT[4], 3.5, 7, 1, 0.5); g.R(WILT[0], 7, 8, 0.5, 2); g.R(SOIL[4], 5.5, 10.5, 1, 0.5); }
  g.outline();
  return g.canvas();
}
// Cây chết: thân gỗ khô xám, cành trơ, lá quắt đen; bầu rễ khô
function cayChet(k) {
  const g = grid(14, 14, k);
  g.E(vol(g, DRY.map((c, i) => [SOIL[0], SOIL[1], SOIL[2], DRY[1], DRY[2]][i]), 7, 11.5, 3.4, 1.7, 0.3, 3), 7, 11.6, 3.4, 1.7);
  g.L(DRY[1], 4.5, 12.4, 2.5, 13, 0.5); g.L(DRY[1], 9.5, 12.5, 11.5, 12.8, 0.5);
  g.L(DRY[2], 7, 11, 7, 3, 1);                                                 // thân thẳng
  g.L(DRY[2], 7, 7, 4, 4.5, 0.5); g.L(DRY[2], 7.5, 6, 10.5, 3.5, 0.5);        // cành trơ
  g.L(DRY[3], 7, 11, 7, 3, 0.5);
  g.E(vol(g, ['#1e1a18', '#2e2824', '#433a32', '#5a4e44', '#74665a'], 3.6, 4.8, 1.4, 0.9, 0.2, 7), 3.6, 4.8, 1.4, 0.9);   // lá quắt
  g.E(vol(g, ['#1e1a18', '#2e2824', '#433a32', '#5a4e44', '#74665a'], 11, 3.6, 1.3, 0.8, 0.2, 8), 11, 3.6, 1.3, 0.8);
  g.E(vol(g, ['#1e1a18', '#2e2824', '#433a32', '#5a4e44', '#74665a'], 8.5, 9, 1.3, 0.8, 0.2, 9), 8.6, 9.2, 1.3, 0.8);
  if (g.k === 2) { g.R(DRY[4], 6.5, 3.5, 0.5, 6); g.R(DRY[0], 7.5, 4, 0.5, 6.5); g.R('#8a7a6a', 3, 4.5, 0.5, 0.5); }
  g.outline();
  return g.canvas();
}
// Phân chó: đống xoắn ba tầng màu nâu, mặt bóng; hai làn mùi xanh
function phanCho(k) {
  const g = grid(14, 14, k);
  g.E(vol(g, DUNG, 7, 10.6, 5, 2.4, 0.15, 2), 7, 10.8, 5, 2.3);
  g.E(vol(g, DUNG, 7, 8.4, 3.9, 2, 0.15, 3), 7, 8.4, 3.8, 1.9);
  g.E(vol(g, DUNG, 7.4, 6.4, 2.6, 1.6, 0.15, 4), 7.4, 6.4, 2.6, 1.5);
  g.E(vol(g, DUNG, 8.4, 4.8, 1.2, 1.1, 0.15, 5), 8.4, 4.8, 1.1, 1.1);
  g.R(DUNG[1], 3, 9.5, 8, g.k === 2 ? 0.5 : 0); g.R(DUNG[1], 4.5, 7.5, 6, g.k === 2 ? 0.5 : 0);   // rãnh giữa các tầng
  g.outline();
  for (const [x, y] of [[2, 1], [11.5, 0.5]]) { g.R('#7fc858', x, y + 2, 1, 1); g.R('#7fc858', x + 1, y + 1, 1, 1); g.R('#a8e070', x, y, 1, 1); }
  if (g.k === 2) { g.R('#d8b088', 4.5, 9.5, 1, 0.5); g.R('#d8b088', 6, 7.5, 1, 0.5); g.R('#e8c8a0', 7.5, 4.5, 0.5, 0.5); }
  return g.canvas();
}

const FILLS = [emptyFill, fillingFill, coverFill, readyFill];
const make = k => ({
  compost: FILLS.map(f => pit(k, f)),
  compostSteam: [0, 1, 2].map(f => steam(k, f)),
  compostDone: done(k),
  items: { cay_heo: cayHeo(k), cay_chet: cayChet(k), phan_cho: phanCho(k) },
});
const web = typeof document !== 'undefined';
export const SPR61_OLD = web ? make(1) : {};
export const SPR61 = web ? make(2) : {};
