// Mạng nước (Phase 3, issue 57): bồn chứa inox trên giá sắt (5 mức nước), bồn phụ (5 mức nước), trạm bơm phụ (có điện / mất điện),
// đoạn ống nước (có nước / khô: ngang, dọc, khớp nối), ô vùng phủ xanh, thanh mực nước.
// Mỗi ảnh có bộ thường và bộ 2x (kiểu A, đúng gấp đôi, cùng điểm neo), vẽ từ cùng một hàm như artwell.js.
// Mức nước của bồn đọc được ở hai chỗ: ống thủy trước thân bồn, và phần thân dưới mực nước lạnh màu hơn, đọng hơi nước (bộ 2x).
// hd.js nối TANK_ART → TANK_ART_HD theo cùng cây khóa; render.js chọn ảnh theo mực nước, điện, trạng thái ống.
import { hash } from './art.js';
import { Pix, pen, outline, mix, OUT, IRON, CONC, WATER, GRASS } from './artwell.js';

const INOX = ['#4e5864', '#7c8894', '#a9b5be', '#d6dfe4', '#f4f8fa'];
const WET = INOX.map(c => mix(c, '#2f78c8', 0.24));             // thân dưới mực nước
const PVC = ['#234a78', '#3a6fa8', '#5f98d2', '#a8d0f2'];         // ống nhựa xanh có nước
const DRY = ['#4c4a48', '#6f6b66', '#9a958d', '#c9c3b8'];         // ống khô
const ORANGE = ['#6e360c', '#ad5d18', '#e39232', '#ffd07a'];     // mô tơ trạm bơm phụ sơn cam
const RED = ['#7a1a12', '#b8352b', '#ef6a54'];
const LAMP = { on: ['#1f6e2a', '#3cc24e', '#b8ffb0'], off: ['#3a1410', '#6e2018', '#9a3a2c'] };
export const TANK_FRAC = [0, 0.25, 0.5, 0.75, 1];                // mức nước của từng hình (0 = cạn, 4 = đầy)
export const BAR_IN = { x: 7, y: 2, w: 14, h: 3 };               // lòng thanh mực nước (toạ độ bộ thường), render tô phần nước
const H = (x, y) => hash(Math.floor(x * 9), Math.floor(y * 11));

function make(k, w, h, draw, edge = true) {
  const P = new Pix(w * k, h * k);
  draw(pen(P, k));
  if (edge) outline(P, k === 2);
  return P.toCanvas();
}

// ---------- chi tiết dùng chung ----------
// thân trụ inox đứng, nước tới phân số f từ đáy: sáng trái, vệt bóng, tối phải, gân ngang; dưới mực nước lạnh màu, đọng hơi nước
function drum(g, x, y, w, h, f, rib = 6) {
  const wl = y + h - h * f;
  const shade = C => (u => { const t = (u - x) / w; return t < 0.1 ? C[2] : t < 0.18 ? C[3] : t < 0.26 ? C[4] : t < 0.4 ? C[3] : t < 0.66 ? C[2] : t < 0.86 ? C[1] : C[0]; });
  const dry = shade(INOX), wet = shade(WET);
  g.R((u, v) => (f > 0 && v >= wl ? wet(u) : dry(u)), x, y, w, h);
  // gân ngang của bồn inox: bộ thường 1 hàng tối, bộ 2x hàng tối + hàng sáng
  for (let ry = y + rib / 2; ry < y + h - 1; ry += rib) {
    const C = f > 0 && ry >= wl ? WET : INOX, d = u => mix(dry(u) === C[4] ? C[3] : C[1], OUT, 0.15);
    if (g.k === 1) g.R(u => mix((u - x) / w < 0.6 ? C[1] : C[0], C[2], 0.3), x, ry, w, 1);
    else { g.R(d, x, ry, w, 0.5); g.R(u => ((u - x) / w < 0.5 ? C[4] : C[3]), x, ry + 0.5, w, 0.5); }
  }
  // mép mực nước: một vệt sáng mảnh (2x), hơi nước đọng li ti dưới mực nước
  if (f > 0 && f < 1) g.R(u => mix(wet(u), '#ffffff', 0.25), x + 0.5, wl, w - 1, 0.5);
  g.hd(N => {
    if (f <= 0) return;
    for (let Y = Math.ceil(wl * 2) + 2; Y < (y + h) * 2 - 1; Y++) for (let X = x * 2 + 2; X < (x + w) * 2 - 2; X++) {
      if (H(X, Y) < 0.035) N(WET[4], X, Y, 1, 1);
    }
  });
}
// nắp vòm và cửa thăm trên đỉnh bồn
function lid(g, cx, y, rx, ry, hw) {
  g.E((u, v) => (u < cx - rx * 0.3 ? INOX[3] : u < cx + rx * 0.4 ? INOX[2] : INOX[1]), cx, y, rx, ry);
  g.E(INOX[4], cx - rx * 0.4, y - ry * 0.35, rx * 0.3, ry * 0.3);
  g.R(INOX[1], cx - hw, y - ry - 1, hw * 2, 1.5);
  g.R(INOX[3], cx - hw, y - ry - 1, hw * 2, 0.5);
  g.R(INOX[0], cx - hw, y - ry, hw * 2, 0.5);
  g.R(INOX[4], cx - hw + 0.5, y - ry - 1, 1, 0.5);
}
// ống thủy dựng trước thân bồn: khung tối, kính nhạt, nước xanh tới phân số f, có vạch chia
function gauge(g, x, y, h, f, w = 3) {
  const fr = mix(INOX[0], OUT, 0.35), glass = '#dbeaf0', top = y + h - h * f;
  g.R(fr, x, y, w, h);
  const ix = g.k === 1 ? x + (w > 2 ? 1 : 0) : x + 0.5, iw = g.k === 1 ? 1 : w - 1;
  g.R(glass, ix, y + 0.5, iw, h - 1);
  if (f > 0) {
    g.R(WATER[1], ix, Math.max(y + 0.5, top), iw, y + h - 0.5 - Math.max(y + 0.5, top));
    g.R(WATER[2], ix, Math.max(y + 0.5, top), Math.min(iw, 1), y + h - 0.5 - Math.max(y + 0.5, top));
    g.R(WATER[3], ix, Math.max(y + 0.5, top), iw, 0.5);
  }
  g.hd(N => { for (let i = 1; i < 4; i++) N(fr, (x + w) * 2, Math.round((y + h * i / 4) * 2), 2, 1); });   // vạch chia 1/4
}
// đoạn ống nằm ngang (x, y, dài w, dày 2), C = bảng màu ống
function pipeH(g, x, y, w, C = PVC) {
  g.R(C[1], x, y, w, 2);
  if (g.k === 1) g.R(C[2], x, y, w, 1);
  else { g.R(C[2], x, y, w, 0.5); g.R(C[3], x, y + 0.5, w, 0.5); g.R(C[0], x, y + 1.5, w, 0.5); }
}
function pipeV(g, x, y, h, C = PVC) {
  g.R(C[1], x, y, 2, h);
  if (g.k === 1) g.R(C[2], x, y, 1, h);
  else { g.R(C[2], x, y, 0.5, h); g.R(C[3], x + 0.5, y, 0.5, h); g.R(C[0], x + 1.5, y, 0.5, h); }
}
// giá sắt: chân trước, chân sau tối hơn, thanh giằng chéo
function stand(g, x0, x1, y0, y1) {
  const leg = (x, back) => { g.R(back ? IRON[1] : IRON[2], x, y0, 1.5, y1 - y0); if (!back) { g.R(IRON[3], x, y0, 0.5, y1 - y0); g.R(IRON[0], x + 1, y0, 0.5, y1 - y0); } };
  leg(x0 + 3, true); leg(x1 - 4.5, true);
  // thanh giằng chéo giữa hai chân trước
  const n = g.k === 2 ? 2 * (x1 - x0) : x1 - x0;
  for (let i = 0; i <= n; i++) {
    const t = i / n, xx = x0 + 1 + t * (x1 - x0 - 3), ya = y0 + 1 + t * (y1 - y0 - 3), yb = y1 - 2 - t * (y1 - y0 - 3);
    g.T(IRON[1], xx, ya, 0.5, 0.5); g.T(IRON[1], xx, yb, 0.5, 0.5);
  }
  leg(x0, false); leg(x1 - 1.5, false);
}
function pad(g, x, y, w, h) {   // bệ xi măng
  g.R(CONC[2], x, y, w, h); g.R(CONC[3], x, y, w, 0.5); g.R(CONC[3], x, y, 0.5, h);
  g.R(CONC[1], x, y + h - 1, w, 1); g.R(CONC[0], x, y + h - 0.5, w, 0.5);
  g.hd(N => { for (let X = x * 2 + 3; X < (x + w) * 2 - 2; X += 7) N(CONC[1], X, Math.round((y + h / 2) * 2), 2, 1); });
}
function grassTuft(g, x, y) {
  g.R(GRASS[0], x, y, 1.5, 1);
  g.R(GRASS[1], x, y - 0.5, 0.5, 1); g.R(GRASS[1], x + 1, y - 1, 0.5, 1.5);
  g.R(GRASS[2], x + 0.5, y - 0.5, 0.5, 0.5);
}
function valve(g, x, y) {   // tay van đỏ
  g.E(RED[0], x, y, 1.75, 0.8); g.R(RED[1], x - 1.5, y - 0.5, 3, 0.5); g.R(RED[2], x - 1, y - 0.5, 1, 0.5);
  g.R(IRON[1], x - 0.25, y, 0.5, 1.5);
}

// ---------- Bồn chứa 32x48 (chân 2x2 ô): bồn inox trên giá sắt, ống vào từ giếng bên trái, ống ra có van bên phải ----------
function tank(f) {
  return g => {
    pad(g, 2, 43, 28, 4);
    // ống vào từ giếng: chui xuống đất bên trái, cong lên vào đáy bồn
    pipeV(g, 2, 27, 17);
    pipeH(g, 2, 27, 5);
    g.R(PVC[0], 1.5, 26.5, 3, 0.5); g.R(PVC[0], 1.5, 43, 3, 0.5);   // đai nối
    stand(g, 5, 27, 33.5, 44);
    g.R(IRON[1], 4, 32, 24, 2); g.R(IRON[2], 4, 32, 24, 0.5); g.R(IRON[0], 4, 33.5, 24, 0.5);   // mâm đỡ
    drum(g, 6, 6, 20, 26, f);
    lid(g, 16, 6, 10, 2.5, 3);
    gauge(g, 20.5, 9, 21, f);
    // ống ra bên phải có van, chờ nối vào mạng nước
    pipeH(g, 26, 29, 4.5);
    pipeV(g, 28.5, 29, 15);
    valve(g, 28.5, 31);
    // tràn: bồn đầy thì nước rỉ ở ống tràn trên đỉnh
    g.R(INOX[1], 24, 3.5, 4, 1); g.R(INOX[3], 24, 3.5, 4, 0.5);
    if (f >= 1) {
      g.R(WATER[2], 27.5, 4.5, 0.5, 2); g.R(WATER[3], 27.5, 4.5, 0.5, 0.5);
      g.R(WATER[2], 27, 7, 1, 1); g.R(WATER[1], 27.5, 9, 0.5, 1);
    }
    if (f <= 0) { g.R(mix(INOX[1], '#8a5a2b', 0.35), 7, 30, 3, 1); g.hd(N => { N('#8a5a2b', 16, 58, 2, 1); N('#8a5a2b', 30, 61, 1, 1); }); }   // cạn: vệt bụi ở đáy
    grassTuft(g, 0.5, 46.5); grassTuft(g, 29.5, 46.5);
  };
}
// ---------- Bồn phụ 16x28 (chân 1 ô): bồn inox nhỏ trên giá thấp ----------
function tank2(f) {
  return g => {
    pad(g, 1, 24, 14, 3);
    stand(g, 2.5, 13.5, 19.5, 24.5);
    g.R(IRON[1], 2, 19, 12, 1.5); g.R(IRON[2], 2, 19, 12, 0.5);
    drum(g, 3, 6, 10, 13, f, 5);
    lid(g, 8, 6, 5, 1.75, 1.5);
    gauge(g, 9.5, 8, 10, f, 2);
    pipeH(g, 13, 16, 2);
    if (f >= 1) { g.R(WATER[2], 3.5, 3.5, 0.5, 0.5); g.R(WATER[3], 12, 4, 0.5, 0.5); }
    if (f <= 0) g.hd(N => { N('#8a5a2b', 9, 34, 2, 1); });
    grassTuft(g, 0.5, 27);
  };
}
// ---------- Trạm bơm phụ 16x26 (chân 1 ô): mô tơ cam, đầu bơm gang, tủ điện có đèn (xanh: có điện, đỏ tối: mất điện) ----------
function booster(on) {
  return g => {
    pad(g, 1, 21, 14, 4);
    // cột và tủ điện
    g.R(IRON[1], 12.5, 4, 1, 17); g.R(IRON[2], 12.5, 4, 0.5, 17);
    g.R(IRON[2], 9.5, 3, 5.5, 6); g.R(IRON[3], 9.5, 3, 5.5, 0.5); g.R(IRON[3], 9.5, 3, 0.5, 6); g.R(IRON[0], 9.5, 8.5, 5.5, 0.5);
    g.R(IRON[1], 10.5, 2, 3.5, 1);   // mái che tủ
    const L = on ? LAMP.on : LAMP.off;
    g.R(L[1], 10.5, 4.5, 2, 2); g.R(L[2], 10.5, 4.5, 1, 1); g.R(L[0], 12, 6, 0.5, 0.5);
    g.R('#f7d547', 13, 5, 1.5, 2); g.hd(N => { N(OUT, 27, 11, 1, 1); N(OUT, 26, 12, 2, 1); N(OUT, 27, 13, 1, 1); });   // tem sét
    if (on) g.hd(N => { N(L[2], 20, 7, 1, 1); N(L[2], 25, 7, 1, 1); N(L[2], 22, 6, 2, 1); });   // đèn hắt sáng
    // dây điện từ tủ xuống mô tơ
    g.T('#26262c', 11, 9, 0.5, 4);
    // ống vào, ống ra
    pipeV(g, 1.5, 9, 7);
    pipeH(g, 1.5, 8, 8);
    // mô tơ nằm ngang
    g.R(ORANGE[1], 5, 13, 7, 6); g.R(ORANGE[2], 5, 13, 7, 1.5); g.R(ORANGE[3], 5, 13, 7, 0.5); g.R(ORANGE[0], 5, 18, 7, 1);
    g.hd(N => { for (let X = 12; X < 23; X += 2) N(ORANGE[0], X, 29, 1, 6); });
    if (g.k === 1) for (const x of [7, 9]) g.R(ORANGE[0], x, 15, 1, 2);
    g.R(ORANGE[0], 11, 13, 1, 6);
    g.R(IRON[1], 5.5, 19, 1.5, 2); g.R(IRON[1], 10, 19, 1.5, 2);
    // đầu bơm gang
    g.E(IRON[2], 3, 16, 2.25, 3); g.E(IRON[3], 2.5, 15.25, 1.25, 1.5); g.R(IRON[4], 2, 14.5, 0.5, 0.5);
    g.R(IRON[1], 4.5, 14.5, 0.5, 3);
    if (on) { g.R(WATER[2], 9.5, 10, 0.5, 1); g.R(WATER[3], 9.5, 10, 0.5, 0.5); g.hd(N => { N(PVC[3], 8, 16, 2, 1); N(PVC[3], 14, 16, 2, 1); }); }   // nước chảy trong ống
    else g.hd(N => { N(DRY[2], 8, 17, 2, 1); N(DRY[2], 14, 17, 2, 1); });
    grassTuft(g, 0.5, 25); grassTuft(g, 14, 25);
  };
}
// ---------- Đoạn ống trong chế độ xây dựng: ngang 16x6, dọc 6x16, khớp nối 8x8 ----------
function seg(C, wet, dir) {
  return g => {
    if (dir === 'h') {
      g.R(OUT, 0, 0, 16, 6);
      g.R(C[1], 0, 1, 16, 4); g.R(C[2], 0, 1, 16, 1); g.R(C[0], 0, 4, 16, 1);
      g.hd(N => { N(C[3], 0, 2, 32, 1); for (let X = 1; X < 32; X += 8) N(wet ? '#e4f4ff' : mix(C[1], '#8a5a2b', 0.5), X, 5, wet ? 3 : 2, 1); });
      if (!wet) g.R(mix(C[1], '#8a5a2b', 0.4), 11, 2, 1, 1);
    } else if (dir === 'v') {
      g.R(OUT, 0, 0, 6, 16);
      g.R(C[1], 1, 0, 4, 16); g.R(C[2], 1, 0, 1, 16); g.R(C[0], 4, 0, 1, 16);
      g.hd(N => { N(C[3], 2, 0, 1, 32); for (let Y = 1; Y < 32; Y += 8) N(wet ? '#e4f4ff' : mix(C[1], '#8a5a2b', 0.5), 5, Y, 1, wet ? 3 : 2); });
      if (!wet) g.R(mix(C[1], '#8a5a2b', 0.4), 2, 11, 1, 1);
    } else {
      g.R(OUT, 0, 0, 8, 8);
      g.R(C[0], 1, 1, 6, 6); g.R(C[1], 1.5, 1.5, 5, 5); g.R(C[2], 1, 1, 6, 1); g.R(C[2], 1, 1, 1, 6);
      g.R(C[3], 1.5, 1.5, 1, 0.5);
      g.R(wet ? WATER[2] : C[0], 3, 3, 2, 2); g.R(wet ? WATER[3] : C[1], 3, 3, 1, 1);
    }
  };
}
// ---------- Ô vùng phủ xanh 16x16 (trong suốt, không viền) ----------
function cover(g) {
  g.R('#38c4e05c', 0, 0, 16, 16);
  g.hd(N => { for (let Y = 2; Y < 32; Y += 8) for (let X = (Y % 16 === 2 ? 2 : 6); X < 32; X += 8) { N('#dcfaff78', X, Y, 2, 1); N('#dcfaff50', X + 2, Y + 1, 1, 1); } });
  if (g.k === 1) for (let y = 1; y < 16; y += 4) for (let x = (y % 8 === 1 ? 1 : 3); x < 16; x += 4) g.R('#dcfaff70', x, y, 1, 1);
}
// ---------- Thanh mực nước 22x7: giọt nước + khung, lòng trống (render tô nước theo BAR_IN) ----------
function bar(g) {
  g.E(WATER[1], 3, 4.5, 2.25, 2.25);
  g.R(WATER[1], 2.5, 1, 1, 2); g.R(WATER[1], 2, 2, 2, 1);
  g.R(WATER[3], 2, 3.5, 1, 1); g.R(WATER[2], 3, 1.5, 0.5, 1);
  g.R('#3b2412', 6, 1, 16, 5); g.R('#fff6d8', 6, 1, 16, 0.5); g.R('#1b2a3a', 7, 2, 14, 3);
  g.hd(N => { for (let i = 1; i < 4; i++) N('#33475e', 14 + Math.round(28 * i / 4), 4, 1, 6); });
}

const NODOC = typeof document === 'undefined';
const build = k => ({
  tank: TANK_FRAC.map(f => make(k, 32, 48, tank(f))),
  tank2: TANK_FRAC.map(f => make(k, 16, 28, tank2(f))),
  booster: { on: make(k, 16, 26, booster(true)), off: make(k, 16, 26, booster(false)) },
  pipe: {
    wet: { h: make(k, 16, 6, seg(PVC, true, 'h'), false), v: make(k, 6, 16, seg(PVC, true, 'v'), false), j: make(k, 8, 8, seg(PVC, true, 'j'), false) },
    dry: { h: make(k, 16, 6, seg(DRY, false, 'h'), false), v: make(k, 6, 16, seg(DRY, false, 'v'), false), j: make(k, 8, 8, seg(DRY, false, 'j'), false) },
  },
  cover: make(k, 16, 16, cover, false),
  bar: make(k, 22, 7, bar),
});
export const TANK_ART = NODOC ? null : build(1);
export const TANK_ART_HD = NODOC ? null : build(2);
