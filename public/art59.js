// Vòi sen chuồng cấp 3 (Phase 3, issue 59): gắn ở rào trái của chuồng heo và đồng cỏ, cần vòi vươn vào trong chuồng.
// - Chuồng heo: ống nhựa xanh dựng trên bệ xi măng lấm bùn, một bát sen, van tay. 24x34.
// - Đồng cỏ (bò, trâu, dê, cừu to con): cột gỗ ốp ống nhựa, thanh chống chéo, cần dài hai bát sen. 32x40.
// Mỗi loại 3 trạng thái: idle (có nước, đang chờ: van xanh mở, giọt nước đọng ở bát sen), off (không có nước: ống khô bạc màu,
// van đỏ khóa ngang, bát sen xỉn), spray (đang tắm: 3 khung nước xối xuống, bắn tung tóe ở dưới).
// drops: hạt nước rơi trên lưng con vật lúc vòi sen tắm, 3 khung 16x14.
// Mỗi ảnh có bộ thường và bộ 2x (kiểu A, đúng gấp đôi, cùng điểm neo), vẽ từ cùng một hàm như artwell.js, arttank.js.
// Điểm neo: chân cột (giữa cột, hàng cuối ảnh) = SHOWER_ART.<loại>.ax; render đặt chân cột lên ô rào trái của chuồng.
// hd.js nối SHOWER_ART → SHOWER_ART_HD theo cùng cây khóa.
import { hash } from './art.js';
import { Pix, pen, outline, mix, CONC, WATER, WOOD, GRASS } from './artwell.js';

const PVC = ['#234a78', '#3a6fa8', '#5f98d2', '#a8d0f2'];         // ống nhựa xanh có nước
const DRY = ['#4c4a48', '#6f6b66', '#9a958d', '#c9c3b8'];         // ống khô bạc màu
const CHROME = ['#4e5864', '#7c8894', '#b4bec8', '#e4eaee'];      // bát sen inox
const DULL = CHROME.map(c => mix(c, '#8a7a66', 0.35));            // bát sen xỉn khi khô
const LEVER = { on: ['#1f6e2a', '#3cc24e', '#9ce88a'], off: ['#6e1a12', '#b8352b', '#ef6a54'] };
const MUD = ['#4a2c14', '#6b4020', '#8a5a2b'];
const STONE = ['#6e6a74', '#918c94', '#b4b0b2', '#dcd8d0'];
const MIST = '#cfeaff88';
const H = (x, y) => hash(Math.floor(x * 7), Math.floor(y * 13));

// Vẽ phần đặc rồi viền tối, sau đó mới phủ nước (nước không có viền)
function make(k, w, h, draw, wet) {
  const P = new Pix(w * k, h * k);
  draw(pen(P, k));
  outline(P, k === 2);
  if (wet) wet(pen(P, k));
  return P.toCanvas();
}

// ---------- chi tiết dùng chung ----------
function pipeV(g, x, y, h, C) {
  g.R(C[1], x, y, 2, h);
  if (g.k === 1) g.R(C[2], x, y, 1, h);
  else { g.R(C[2], x, y, 0.5, h); g.R(C[3], x + 0.5, y, 0.5, h); g.R(C[0], x + 1.5, y, 0.5, h); }
}
function pipeH(g, x, y, w, C) {
  g.R(C[1], x, y, w, 2);
  if (g.k === 1) g.R(C[2], x, y, w, 1);
  else { g.R(C[2], x, y, w, 0.5); g.R(C[3], x, y + 0.5, w, 0.5); g.R(C[0], x, y + 1.5, w, 0.5); }
}
// khuỷu ống (góc trên của cột)
function elbow(g, x, y, C) {
  g.R(C[1], x, y, 3, 3); g.R(C[2], x, y, 2, 1); g.R(C[2], x, y, 1, 2);
  g.R(C[3], x + 0.5, y + 0.5, 0.5, 0.5); g.R(C[0], x + 2.5, y + 2, 0.5, 1);
}
// đai kẹp ống
function band(g, x, y, w) { g.R(CHROME[2], x, y, w, 1); g.R(CHROME[3], x, y, w, 0.5); g.R(CHROME[0], x + w - 0.5, y, 0.5, 1); }
// van tay: thân inox, cần gạt xanh dựng dọc (mở) hoặc đỏ nằm ngang (khóa)
function valve(g, x, y, on) {
  g.R(CHROME[1], x - 0.5, y, 3, 3); g.R(CHROME[2], x - 0.5, y, 3, 1); g.R(CHROME[3], x, y + 0.5, 0.5, 0.5); g.R(CHROME[0], x + 2, y + 1, 0.5, 2);
  const L = on ? LEVER.on : LEVER.off;
  if (on) { g.R(L[1], x + 2.5, y - 3, 1, 4); g.R(L[2], x + 2.5, y - 3, 0.5, 4); g.R(L[0], x + 3, y - 3, 0.5, 0.5); g.R(L[2], x + 2.5, y - 3.5, 1, 0.5); }
  else { g.R(L[1], x + 2.5, y + 1, 5, 1); g.R(L[2], x + 2.5, y + 1, 5, 0.5); g.R(L[0], x + 7, y + 1, 0.5, 1); }
}
// bát sen úp xuống, cổ nối vào cần (cx: giữa bát, y: đáy cần)
function rose(g, cx, y, C) {
  g.R(C[1], cx - 1, y, 2, 1.5); g.R(C[2], cx - 1, y, 0.5, 1.5);   // cổ
  g.R(C[2], cx - 2.5, y + 1.5, 5, 1);                              // vai bát
  g.R(C[1], cx - 3, y + 2.5, 6, 1.5);                              // mặt bát
  g.R(C[3], cx - 2.5, y + 1.5, 2, 0.5); g.R(C[3], cx - 3, y + 2.5, 0.5, 0.5);
  g.R(C[0], cx + 2, y + 2.5, 1, 1.5);
  g.hd(N => { for (let i = 0; i < 5; i++) N(C[0], Math.round((cx - 2.5) * 2) + i * 2 + 1, Math.round((y + 3.5) * 2), 1, 1); });   // lỗ sen
}
function tuft(g, x, y) {
  g.R(GRASS[0], x, y, 1.5, 1);
  g.R(GRASS[1], x, y - 0.5, 0.5, 1); g.R(GRASS[1], x + 1, y - 1, 0.5, 1.5);
  g.R(GRASS[2], x + 0.5, y - 0.5, 0.5, 0.5);
}

// ---------- nước ----------
// giọt nước đọng ở bát sen (có nước, chưa tắm)
function drip(g, cx, y) {
  g.R(WATER[1], cx - 0.5, y, 1, 1.5); g.R(WATER[3], cx - 0.5, y, 0.5, 0.5);
  g.hd(N => N(WATER[0], Math.round(cx * 2), Math.round((y + 1.5) * 2) - 1, 1, 1));
}
// tia nước xối từ bát sen (cx, y0) xuống đáy y1, khung f (0..2): các tia tỏa ra, hạt nước trượt xuống theo khung, bắn tóe ở đáy
function spray(g, cx, y0, y1, f) {
  const h = y1 - y0, n = 4;
  // vũng nước loang dưới đáy (trong, không viền)
  g.E('#3f9cf066', cx, y1 - 0.5, 6, 1.5);
  g.hd(N => { N('#cfeaffaa', Math.round((cx - 4) * 2), Math.round((y1 - 1) * 2), 3, 1); N('#cfeaffaa', Math.round((cx + 2) * 2), Math.round((y1 - 0.5) * 2), 2, 1); });
  for (let j = 0; j < n; j++) {
    const off = j - (n - 1) / 2;
    const xAt = t => cx + off * 1.3 + off * 1.6 * t * t * 1.4;   // tia tỏa cong ra khi rơi
    // thân tia: dải nước trong mờ liền (2x), đứt quãng theo khung để thấy nước chảy
    g.hd(N => {
      for (let Y = Math.round(y0 * 2); Y < Math.round(y1 * 2) - 2; Y++) {
        const t = (Y / 2 - y0) / h;
        if (((Y + f * 3 + j * 5) % 9) < 6) N(t < 0.5 ? '#a8dcffb0' : '#8fd0ff80', Math.round(xAt(t) * 2), Y, 1, 1);
      }
    });
    // giọt nước trượt xuống: đầu sáng, đuôi xanh, dài ngắn khác nhau
    for (let s = ((f * 2 + j * 3) % 5) + 0.5; s < h - 1.5; s += 4.5 + (j % 2)) {
      const t = s / h, x = Math.round(xAt(t) - 0.25), y = y0 + s, len = 1.5 + (H(j, s) > 0.5 ? 0.5 : 0);
      g.R(WATER[2], x, y, 1, len);
      g.R(WATER[3], x, y + len - 0.5, 0.5, 0.5);
      g.hd(N => N(WATER[1], x * 2 + 1, Math.round(y * 2), 1, 1));
    }
  }
  // bắn tóe dưới đáy: giọt nảy lên thành vương miện, đổi theo khung
  const w = 3.5 + f;
  for (const sgn of [-1, 1]) {
    const x = cx + sgn * w, hop = (f + (sgn > 0 ? 1 : 0)) % 3;
    g.R(WATER[3], Math.round(x), y1 - 2 - hop, 1, 1);
    g.R(WATER[2], Math.round(x - sgn * 1.5), y1 - 1.5 - (hop ? 0.5 : 0), 1, 1);
    g.hd(N => N('#ffffff', Math.round(x * 2), Math.round((y1 - 2 - hop) * 2), 1, 1));
  }
  // hơi nước li ti quanh tia (2x)
  g.hd(N => { for (let i = 0; i < 8; i++) N(MIST, Math.round((cx - 6 + H(i, f + 3) * 12) * 2), Math.round((y0 + 3 + H(f + 3, i) * h * 0.8) * 2), 1, 1); });
}

// ---------- Vòi sen chuồng heo 24x34: cột ống trên bệ xi măng lấm bùn, cần ngắn một bát sen ----------
const PIG = { w: 24, h: 34, ax: 4, head: 16 };
function pigShower(state) {
  const on = state !== 'off', C = on ? PVC : DRY, R = on ? CHROME : DULL;
  return g => {
    // bệ xi măng, lấm bùn heo
    g.R(CONC[1], 0.5, 30, 7, 4); g.R(CONC[3], 0.5, 30, 7, 1); g.R(CONC[2], 0.5, 31, 1, 2); g.R(CONC[0], 0.5, 33, 7, 1);
    g.R(MUD[1], 5, 31, 2, 1.5); g.R(MUD[2], 5, 31, 1, 0.5); g.R(MUD[0], 1.5, 32.5, 1.5, 1);
    g.hd(N => { N(MUD[1], 9, 66, 2, 1); N(MUD[2], 12, 61, 1, 1); });
    // cột ống, khuỷu, cần ngang
    pipeV(g, 3, 6, 24, C);
    elbow(g, 3, 4, C);
    pipeH(g, 6, 4, PIG.head - 6, C);
    g.R(C[1], PIG.head - 0.5, 4, 1, 2);
    band(g, 2.5, 12, 3); band(g, 2.5, 25, 3);
    valve(g, 3, 18, on);
    rose(g, PIG.head, 6, R);
    if (!on) { g.R(mix(C[1], '#8a5a2b', 0.45), 3, 14, 1, 1.5); g.hd(N => N(mix(C[0], '#8a5a2b', 0.4), 13, 40, 2, 1)); }   // vệt gỉ
    tuft(g, 8.5, 33.5);
  };
}
function pigWet(state, f) {
  if (state === 'idle') return g => drip(g, PIG.head, 10.5);
  if (state === 'spray') return g => spray(g, PIG.head, 10.5, 32, f);
  return null;
}

// ---------- Vòi sen đồng cỏ 32x40: cột gỗ ốp ống, thanh chống chéo, cần dài hai bát sen ----------
const BARN = { w: 32, h: 40, ax: 4, heads: [16, 26] };
function barnShower(state) {
  const on = state !== 'off', C = on ? PVC : DRY, R = on ? CHROME : DULL;
  return g => {
    // đá kê chân cột
    g.E(STONE[1], 4.5, 37.5, 4.5, 2.5); g.E(STONE[2], 3.5, 37, 2.5, 1.5); g.R(STONE[3], 2, 36, 2, 0.5); g.R(STONE[0], 2, 39, 6, 1);
    // cột gỗ, mũ cột
    g.R(WOOD[1], 2, 2, 4, 35); g.R(WOOD[2], 2, 2, 2, 35); g.R(WOOD[3], 2, 2, 0.5, 35); g.R(WOOD[0], 5.5, 2, 0.5, 35);
    g.hd(N => { for (let Y = 8; Y < 72; Y += 7) N(WOOD[0], 7 + (Y % 3), Y, 1, 3); });
    g.R(WOOD[0], 1.5, 1, 5, 1.5); g.R(WOOD[2], 1.5, 1, 5, 0.5);
    // thanh chống chéo từ cột lên cần
    for (let i = 0; i < 8; i++) { g.R(WOOD[1], 6 + i, 14 - i, 1.5, 1.5); g.R(WOOD[2], 6 + i, 14 - i, 1, 0.5); }
    // ống ốp bên phải cột, khuỷu, cần ngang dài, hai bát sen
    pipeV(g, 6, 7, 30, C);
    elbow(g, 6, 5, C);
    pipeH(g, 9, 5, BARN.heads[1] - 9, C);
    g.R(C[1], BARN.heads[1] - 0.5, 5, 1, 2);
    for (const y of [11, 21, 31]) band(g, 5.5, y, 3);
    valve(g, 6, 24, on);
    for (const x of BARN.heads) rose(g, x, 7, R);
    if (!on) { g.R(mix(C[1], '#8a5a2b', 0.45), 6, 17, 1, 1.5); g.hd(N => N(mix(C[0], '#8a5a2b', 0.4), 40, 11, 2, 1)); }
    tuft(g, 9, 39.5); tuft(g, 0, 39.5);
  };
}
function barnWet(state, f) {
  if (state === 'idle') return g => { for (const x of BARN.heads) drip(g, x, 11.5); };
  if (state === 'spray') return g => { for (const x of BARN.heads) spray(g, x, 11.5, 38, (f + (x > 20 ? 1 : 0)) % 3); };
  return null;
}

// ---------- Hạt nước trên lưng con vật lúc vòi sen tắm 16x14, 3 khung ----------
function drops(f) {
  return g => {
    for (let i = 0; i < 6; i++) {
      const x = 1.5 + i * 2.4 + (i % 2) * 0.5, y = ((i * 5 + f * 4) % 10) + 1;
      g.hd(N => N('#a8dcff99', Math.round(x * 2), Math.round(y * 2) - 3, 1, 3));   // vệt rơi
      if (g.k === 1) { g.R(WATER[3], x, y, 1, 1); g.R(WATER[1], x, y + 1, 1, 1); continue; }
      g.R('#e4f4ff', x, y, 0.5, 0.5);                                   // đầu giọt nhọn
      g.R(WATER[2], x, y + 0.5, 1, 1.5); g.R(WATER[3], x, y + 0.5, 0.5, 0.5); g.R(WATER[1], x + 0.5, y + 1.5, 0.5, 0.5);
    }
    // tóe nước ở dưới
    const w = 3 + f;
    g.R(WATER[2], 8 - w, 12.5 - (f % 2), 1, 1); g.R(WATER[2], 7 + w, 12.5 - ((f + 1) % 2), 1, 1);
    g.R(WATER[3], 7.5, 13, 1, 1);
  };
}

const STATES = ['idle', 'off', 'spray'];
const NODOC = typeof document === 'undefined';
const set = (k, D, draw, wet) => ({
  ax: D.ax,
  idle: make(k, D.w, D.h, draw('idle'), wet('idle')),
  off: make(k, D.w, D.h, draw('off'), wet('off')),
  spray: [0, 1, 2].map(f => make(k, D.w, D.h, draw('spray'), wet('spray', f))),
});
const build = k => ({
  pig: set(k, PIG, pigShower, pigWet),
  pasture: set(k, BARN, barnShower, barnWet),
  drops: [0, 1, 2].map(f => { const P = new Pix(16 * k, 14 * k); drops(f)(pen(P, k)); return P.toCanvas(); }),
});
export const SHOWER_STATES = STATES;
export const SHOWER_ART = NODOC ? null : build(1);
export const SHOWER_ART_HD = NODOC ? null : build(2);
