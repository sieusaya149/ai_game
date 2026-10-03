// Biểu tượng thông báo, Việc cần làm và Sổ tay cho cây và nước (Phase 3, issue 62). Mỗi hình 16x16 (bộ 2x: 32x32):
//   masteryUp    cây lên cấp thành thạo: mầm hai lá trên ụ đất, mũi tên vàng chỉ lên bên phải
//   tankLow      bồn sắp cạn: bồn inox nhỏ (như arttank), ống thủy chỉ còn đáy nước, dấu "!" đỏ góc trên-phải
//   powerOut     hết tiền điện, máy ngừng: tia sét xám tắt, dấu gạch chéo đỏ góc dưới-phải
//   compostReady hố ủ đã xong: hố ván gỗ (như art61), mùn đen đầy miệng, mầm non, lấp lánh vàng
//   weather      trang thời tiết trong Sổ tay: mặt trời sau đám mây, ba giọt mưa
//   season       trang mùa trong Sổ tay: bốn lá xoay quanh tâm, màu xuân · hạ · thu · đông
// Trái khổng lồ không cần hình mới: thông báo dùng art53 SPR53_OLD.giantIcon[id] (16x16, theo từng loại cây).
// Vẽ một lần bằng hàm hình theo toạ độ bộ thường (như artwell, arttank, art58); nét .5 chỉ hiện ở bộ 2x, nên bộ 2x là hình
// vẽ tay gấp đôi chứ không phóng to. Viền tối 1 điểm tự bao quanh; nước, lấp lánh vẽ sau viền.
// ui.js / render.js đọc ART62?.<khóa> ?? hình cũ; hd.js nối ART62 → ART62_HD theo cùng cây khóa
// (bí danh SPR62_OLD / SPR62 để thêm 62 vào FILES của hd.js cũng được).
import { Pix, pen, outline, mix, OUT, IRON, WATER, GRASS } from './artwell.js';

const LEAF = ['#1e4d14', '#2f6b1f', '#3d8c2a', '#5fb33e', '#8fd65a'];
const GOLD = ['#6b4a0a', '#c08a16', '#f2c63a', '#ffe680', '#fffbe0'];
const SOIL = ['#2e1c10', '#45301c', '#5e4228', '#7a5a3a'];
const HUMUS = ['#1a0f08', '#2a1a0e', '#3e2816', '#56391f', '#76522e'];
const WOOD = ['#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868', '#f4c88c'];
const INOX = ['#4e5864', '#7c8894', '#a9b5be', '#d6dfe4', '#f4f8fa'];
const WET = INOX.map(c => mix(c, '#2f78c8', 0.4));                // thân dưới mực nước
const RED = ['#7a1a12', '#b8352b', '#ef6a54', '#ffb4a4'];
const DIM = ['#4a463c', '#6e6858', '#948c74', '#b8b096'];          // tia sét tắt: vàng bạc màu
const SUN = ['#c06a10', '#f29a1c', '#ffd23a', '#fff1a0'];
const CLOUD = ['#7f93a8', '#b4c4d4', '#e2ecf4', '#ffffff'];
const SEASON = {                                                    // [tối, gốc, sáng, điểm sáng]
  xuan: ['#3f7a1e', '#6cbf3a', '#a6e46a', '#e0ffb8'],             // xuân: lá non
  ha: ['#174a14', '#2a7a22', '#44a83a', '#86d46a'],               // hạ: lá đậm
  thu: ['#7a3010', '#c2581a', '#ee8e2e', '#ffd08a'],              // thu: lá cam
  dong: ['#4a6a88', '#8cb0cc', '#cfe4f2', '#ffffff'],             // đông: lá phủ sương
};

// Ảnh w x h, vẽ phần đặc → viền → phần không viền (wet)
function make(k, draw, wet, w = 16, h = 16) {
  const P = new Pix(w * k, h * k);
  draw(tool(P, k));
  outline(P, k === 2);
  if (wet) wet(tool(P, k));
  return P.toCanvas();
}
// pen của artwell + S(test, col): tô mọi điểm có tâm (u, v) thoả test — đa giác, elip xoay
function tool(P, k) {
  const g = pen(P, k);
  g.S = (test, col) => {
    for (let Y = 0; Y < P.h; Y++) for (let X = 0; X < P.w; X++) {
      const u = (X + 0.5) / k, v = (Y + 0.5) / k;
      if (test(u, v)) P.put(X, Y, typeof col === 'function' ? col(u, v) : col);
    }
  };
  return g;
}
// điểm trong đa giác (toạ độ bộ thường)
const inPoly = pts => (u, v) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > v) !== (yj > v) && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
// khối tròn sáng trên-trái: ramp 4 hoặc 5 sắc độ, tâm (cx, cy), bán kính r
const vol = (ramp, cx, cy, rx, ry = rx) => (u, v) => {
  const t = -(((u - cx) / rx) * 0.8 + (v - cy) / ry) / 1.3, n = ramp.length;
  return n === 5 ? (t > 0.6 ? ramp[4] : t > 0.22 ? ramp[3] : t > -0.22 ? ramp[2] : t > -0.6 ? ramp[1] : ramp[0])
    : (t > 0.5 ? ramp[3] : t > 0 ? ramp[2] : t > -0.5 ? ramp[1] : ramp[0]);
};
// lá elip xoay góc a (radian), dài len, rộng wid, tâm (cx, cy); sáng nửa trên gân, tối nửa dưới
function leaf(g, cx, cy, a, len, wid, R) {
  const c = Math.cos(a), s = Math.sin(a);
  const loc = (u, v) => [((u - cx) * c + (v - cy) * s) / len, (-(u - cx) * s + (v - cy) * c) / wid];
  g.S((u, v) => { const [p, q] = loc(u, v); return p * p + q * q <= 1; }, (u, v) => {
    const [p, q] = loc(u, v), up = -s * p * len + c * q * wid;   // q < 0 là nửa phía trên-trái của gân
    if (g.k === 2 && Math.abs(q) < 0.16 && Math.abs(p) < 0.8) return R[0];   // gân lá (bộ 2x)
    if (q < 0) return p < -0.2 && q < -0.45 ? R[R.length - 1] : R[R.length - 2];
    return up > 0.6 ? R[1] : R[R.length > 4 ? 2 : 1];
  });
}
// lấp lánh 4 cánh (không viền)
function spark(g, x, y, C = GOLD) {
  g.R(C[3], x, y - 1, 1, 3); g.R(C[3], x - 1, y, 3, 1); g.R(C[4], x, y, 1, 1);
  g.hd(N => { N(C[2], x * 2, y * 2 - 3, 2, 1); N(C[2], x * 2 + 4, y * 2, 1, 2); N(C[2], x * 2 - 3, y * 2, 1, 2); N(C[2], x * 2, y * 2 + 4, 2, 1); });
}

// ---------- cây lên cấp thành thạo ----------
function masteryUp(g) {
  g.E(vol(SOIL, 6, 12.5, 5, 2.2), 6, 13.2, 5, 2.1);                         // ụ đất
  g.hd(N => { N(SOIL[3], 6, 23, 2, 1); N(SOIL[0], 15, 27, 2, 1); N(SOIL[3], 18, 24, 1, 1); });
  g.R(LEAF[1], 5.5, 6.5, 1.5, 6.5); g.R(LEAF[2], 5.5, 6.5, 0.5, 6.5);        // thân
  leaf(g, 3.2, 7.2, 0.45, 3, 1.55, LEAF);                                   // lá trái, chếch xuống trái
  leaf(g, 8.6, 5.2, -0.5, 3.1, 1.6, LEAF);                                  // lá phải, vươn lên phải
  g.E(LEAF[3], 6.25, 5.6, 0.9, 1);                                          // búp ngọn
  g.hd(N => { N(LEAF[4], 12, 10, 1, 1); });
  // mũi tên vàng chỉ lên: đầu tam giác, thân 3 điểm
  g.S(inPoly([[12.5, 0.6], [15.4, 4.4], [9.6, 4.4]]), vol(GOLD, 12.5, 3, 2.6, 2));
  g.R(u => (u < 12 ? GOLD[3] : u < 13 ? GOLD[2] : GOLD[1]), 11, 4.4, 3, 6.6);
  g.R(GOLD[4], 11, 4.4, 0.5, 6.1); g.R(GOLD[0], 11, 10.5, 3, 0.5);
}
function masteryWet(g) { spark(g, 14, 12); }

// ---------- bồn sắp cạn ----------
function tankLow(g) {
  // chân giá sắt
  for (const x of [3, 9]) { g.R(IRON[2], x, 12.5, 1.5, 2.5); g.R(IRON[3], x, 12.5, 0.5, 2.5); g.R(IRON[0], x + 1, 12.5, 0.5, 2.5); }
  g.R(IRON[1], 2, 12, 10, 1); g.R(IRON[3], 2, 12, 10, 0.5);                // mâm đỡ
  // thân inox, nước chỉ còn sát đáy
  const wl = 10, sh = C => u => { const t = (u - 2.5) / 9; return t < 0.12 ? C[2] : t < 0.3 ? C[3] : t < 0.4 ? C[4] : t < 0.62 ? C[2] : t < 0.84 ? C[1] : C[0]; };
  g.R((u, v) => (v >= wl ? sh(WET)(u) : sh(INOX)(u)), 2.5, 3.5, 9, 8.5);
  g.hd(N => { N(INOX[1], 5, 14, 18, 1); N(INOX[4], 5, 15, 9, 1); });       // gân ngang
  // nắp vòm, cửa thăm
  g.E((u) => (u < 5.5 ? INOX[3] : u < 8.5 ? INOX[2] : INOX[1]), 7, 3.5, 4.5, 1.6);
  g.E(INOX[4], 5.4, 3, 1.2, 0.6);
  g.R(INOX[1], 6, 1.5, 2, 1); g.R(INOX[3], 6, 1.5, 2, 0.5);
  // ống thủy: kính sáng, nước xanh chỉ ở đáy
  const fr = mix(INOX[0], OUT, 0.35);
  g.R(fr, 8, 4.5, 2.5, 7); g.R('#dbeaf0', g.k === 1 ? 9 : 8.5, 5, g.k === 1 ? 1 : 1.5, 6);
  g.R(WATER[1], g.k === 1 ? 9 : 8.5, 9.5, g.k === 1 ? 1 : 1.5, 1.5); g.R(WATER[3], 8.5, 9.5, 1.5, 0.5);
  g.hd(N => { for (const Y of [12, 16, 20]) N(fr, 21, Y, 1, 1); });        // vạch chia
}
function tankWet(g) {
  // dấu "!" đỏ trong vòng tròn, góc trên-phải (không viền chung, tự có vành tối)
  g.E(RED[0], 12.5, 3.5, 3, 3);
  g.E(g.k === 1 ? RED[1] : vol([RED[1], RED[1], RED[2], RED[3]], 12.5, 3.5, 2.4), 12.5, 3.5, 2.4, 2.4);
  if (g.k === 1) { g.R('#ffffff', 12, 1, 1, 3); g.R('#ffffff', 12, 5, 1, 1); }
  else { g.R('#ffffff', 12, 1.5, 1, 2.5); g.R('#ffffff', 12, 4.5, 1, 1); g.R(RED[3], 11.5, 1.5, 0.5, 0.5); }
}

// ---------- hết tiền điện, máy ngừng ----------
const BOLT = [[9.5, 0.6], [3.2, 9], [7.2, 9], [5.4, 15.4], [12.6, 6.4], [8.6, 6.4], [10.8, 0.6]];
function powerOut(g) {
  g.S(inPoly(BOLT), vol(DIM, 7.5, 6, 5, 6));
  g.hd(N => { for (let i = 0; i < 6; i++) N(DIM[3], 17 - i, 3 + i * 2, 1, 2); });   // mép sáng trái
}
function powerWet(g) {
  // vòng đỏ có gạch chéo, góc dưới-phải
  const cx = 12.4, cy = 12.4;
  g.E(OUT, cx, cy, 3.4, 3.4);
  if (g.k === 1) {   // bộ thường: vẽ tay 5x5 cho rõ vòng và gạch
    const M = ['.rrr.', 'rrccr', 'rcrcr', 'rccrr', '.rrr.'];
    M.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && g.R(ch === 'r' ? RED[1] : '#f6eccc', 10 + x, 10 + y, 1, 1)));
    return;
  }
  g.E(RED[1], cx, cy, 2.9, 2.9);
  g.E('#f6eccc', cx, cy, 1.9, 1.9);
  g.S((u, v) => Math.hypot(u - cx, v - cy) < 2.9 && Math.abs((u - cx) - (v - cy)) < 0.95, RED[1]);
  g.hd(N => { N(RED[3], 21, 20, 2, 1); });
}

// ---------- hố ủ đã xong ----------
function compostReady(g) {
  // mùn đen tơi vun quá miệng hố, vụn sáng
  g.E((u, v) => { const b = vol(HUMUS, 6.5, 6, 7, 3.6)(u, v); return g.k === 2 && ((u * 7 + v * 13) % 5.3) < 0.18 ? '#9a7a52' : b; }, 8, 8.4, 7, 3.4);
  // mầm non hai lá
  g.R(LEAF[1], 7.5, 3.5, 1, 3);
  leaf(g, 5.9, 3.6, 0.35, 1.9, 1.05, LEAF); leaf(g, 9.9, 3.1, -0.4, 1.9, 1.05, LEAF);
  // vách ván trước: hai tấm, cột góc
  g.R(WOOD[2], 1, 8.5, 14, 6.5);
  g.R(WOOD[4], 1, 8.5, 14, g.k === 2 ? 0.5 : 1); if (g.k === 2) g.R(WOOD[3], 1, 9, 14, 0.5);
  g.R(WOOD[0], 1, 11.5, 14, 0.5); g.R(WOOD[1], 1, 12, 14, g.k === 2 ? 0.5 : 1); if (g.k === 1) g.R(WOOD[3], 1, 12, 14, 0);
  g.R(WOOD[1], 1, 14, 14, 1);
  for (const x of [0.5, 13.5]) { g.R(WOOD[2], x, 7.5, 2, 7.5); g.R(WOOD[3], x, 7.5, 1, 7.5); g.R(WOOD[4], x, 7.5, 2, g.k === 2 ? 0.5 : 1); g.R(WOOD[0], x + 1.5, 8, 0.5, 7); }
  g.hd(N => { N(WOOD[1], 12, 20, 3, 1); N(WOOD[1], 18, 26, 4, 1); N(IRON[0], 7, 20, 1, 1); N(IRON[0], 24, 20, 1, 1); });   // vân gỗ, đinh
}
function compostWet(g) { spark(g, 13, 2.5); spark(g, 2.5, 4.5); }

// ---------- thời tiết ----------
function weather(g) {
  // mặt trời góc trên-trái, tia ngắn
  for (const [x, y, w, h] of [[5, 0.5, 1, 1.5], [0.5, 5, 1.5, 1], [1.5, 1.5, 1, 1], [8.5, 1.5, 1, 1], [1.5, 8.5, 1, 1]]) g.R(SUN[2], x, y, w, h);
  g.E(vol(SUN, 5.5, 5.5, 3.2), 5.5, 5.5, 3.2, 3.2);
  // mây phía trước
  const cl = vol(CLOUD, 9.5, 8.5, 5.5, 3);
  g.E(cl, 9.6, 7.4, 2.9, 2.6); g.E(cl, 6.4, 9.4, 2.2, 1.9); g.E(cl, 12.6, 9.2, 2.4, 2.1);
  g.R(cl, 5.5, 9.5, 8.5, 2); g.R(CLOUD[0], 5.5, 11, 8.5, 0.5);
  g.hd(N => { N(CLOUD[3], 16, 11, 3, 1); N(CLOUD[3], 15, 12, 1, 1); });
  // giọt mưa
  for (const [x, y] of [[6.5, 13], [10, 13.5], [13, 12.8]]) {
    g.R(WATER[1], x, y, 1, 1.6); g.R(WATER[2], x, y, 0.5, 1); g.hd(N => N(WATER[3], Math.round(x * 2), Math.round(y * 2), 1, 1));
  }
}

// ---------- mùa: bốn lá xoay quanh tâm ----------
function season(g) {
  const c = 8, d = 4.4, L = 3.1, W = 2.3;
  leaf(g, c - d * 0.72, c - d * 0.72, Math.PI / 4, L, W, SEASON.xuan);    // trên-trái: xuân
  leaf(g, c + d * 0.72, c - d * 0.72, -Math.PI / 4, L, W, SEASON.ha);     // trên-phải: hạ
  leaf(g, c + d * 0.72, c + d * 0.72, Math.PI / 4, L, W, SEASON.thu);     // dưới-phải: thu
  leaf(g, c - d * 0.72, c + d * 0.72, -Math.PI / 4, L, W, SEASON.dong);   // dưới-trái: đông
  g.E(vol(WOOD, 8, 8, 1.4), 8, 8, 1.4, 1.4);                              // cuống chung ở tâm
}
function seasonWet(g) { g.hd(N => { N('#ffffff', 7, 22, 1, 1); N('#ffffff', 10, 25, 1, 1); N(SEASON.dong[2], 5, 25, 1, 1); }); }   // tuyết li ti trên lá đông

const NODOC = typeof document === 'undefined';
const build = k => ({
  masteryUp: make(k, masteryUp, masteryWet),
  tankLow: make(k, tankLow, tankWet),
  powerOut: make(k, powerOut, powerWet),
  compostReady: make(k, compostReady, compostWet),
  weather: make(k, weather),
  season: make(k, season, seasonWet),
});
export const ART62 = NODOC ? null : build(1);
export const ART62_HD = NODOC ? null : build(2);
export { ART62 as SPR62_OLD, ART62_HD as SPR62 };
