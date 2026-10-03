// Bát ăn của chó cạnh chuồng chó (góp ý người chơi): bát men đỏ, trống / có hạt và khúc xương.
// Cùng một hình học vẽ ở hai độ phân giải: bộ cũ 10x7 (art3 dùng `dogBowl(full, 1)`, SPR3.dogBowl) và bộ 2x 20x14
// (SPR14.dogBowl, hd.js nối). Bản 2x lấy mẫu ở tâm điểm ảnh mới nên dáng trùng bản cũ, thêm vệt sáng men, hạt có
// khối sáng tối, viền 1 điểm (mép hứng sáng trên-trái viền nhạt hơn) theo mẫu art5. Đáy bát chạm hàng dưới cùng.
import { canvas, hash } from './art.js';

const W = 10, H = 7;
const C = {
  out: ['#3b2412', '#2e1a0c'], outLite: '#6a3222',
  body: ['#f08a70', '#d8583e', '#b4402a', '#842a1c'],   // sáng, gốc, tối, rất tối
  rim: ['#ffc4ae', '#f29a80'], hole: ['#4a1810', '#6c2618'],
  kib: ['#6e3c16', '#a4662a', '#cc8a44', '#eeb874'],
  bone: ['#9a8a66', '#d8cba8', '#f4ead2', '#fffcf2'],
};
const inEll = (u, v, cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2;
// Màu (hoặc null) tại điểm (u, v) theo toạ độ bộ cũ
function shade(u, v, full, k, X, Y) {
  const top = inEll(u, v, 5, 3.2, 4.8, 1.3);
  // khúc xương nằm vắt trên đống hạt
  if (full && v >= 0.2 && v <= 2.7 && u >= 2.4 && u <= 7.6) {
    const knob = u < 3.5 || u > 6.5, bar = v >= 1.0 && v <= 2.0;
    if (knob || bar) return v < 1.0 || (knob && u < 3 && v < 1.6) ? C.bone[3] : v > 2.0 ? C.bone[1] : C.bone[2];
  }
  if (full && v < 3.6 && inEll(u, v, 5, 3.1, 3.7, 1.9) <= 1) {   // đống hạt nhô lên khỏi miệng bát
    const n = hash(Math.floor(u * 1.6) + 7, Math.floor(v * 1.6) + 3);
    if (k > 1 && hash(X, Y + 11) < 0.18) return C.kib[3];
    return C.kib[n < 0.3 ? 1 : n < 0.8 ? 2 : (u < 5 ? 3 : 0)];
  }
  if (top <= 1) {
    if (top > 0.55) return u < 5 && v < 3.2 ? C.rim[0] : C.rim[1];   // vành bát
    return v < 3.0 ? C.hole[0] : C.hole[1];                           // lòng bát trống
  }
  const hw = 4.8 - (v - 3.2) * 0.42;
  if (v < 3.2 || v > 6.95 || Math.abs(u - 5) > hw) return null;
  const t = (u - (5 - hw)) / (2 * hw);
  if (k > 1 && t > 0.14 && t < 0.24 && v > 3.9 && v < 5.6) return C.body[0];   // vệt sáng men
  if (v > 6.1) return C.body[3];
  return C.body[t < 0.2 ? 0 : t < 0.68 ? 1 : 2];
}
// Bộ cũ 10x7 vẽ tay theo cùng dáng (ở 1 điểm ảnh khúc xương, vành bát không lấy mẫu ra được)
const ROWS1 = {
  empty: ['..........', '..........', '..oooooo..', '.orhhhhRo.', 'orRRRRRRRo', 'oabbbbbcco', '.oddddddo.'],
  full: ['...W..W...', '..kWwwWk..', '.okKwKkKo.', '.orKkKkRo.', 'orRRRRRRRo', 'oabbbbbcco', '.oddddddo.'],
};
const PAL1 = { o: C.out[0], r: C.rim[0], R: C.rim[1], h: C.hole[0], a: C.body[0], b: C.body[1], c: C.body[2], d: C.body[3], k: C.kib[1], K: C.kib[2], w: C.bone[2], W: C.bone[3] };
// Vẽ bát ở độ phân giải k (1 = bộ cũ, 2 = bộ 2x)
export function dogBowl(full, k = 1) {
  if (k === 1) {
    const c = canvas(W, H), x = c.getContext('2d');
    ROWS1[full ? 'full' : 'empty'].forEach((row, Y) => [...row].forEach((ch, X) => { if (PAL1[ch]) { x.fillStyle = PAL1[ch]; x.fillRect(X, Y, 1, 1); } }));
    return c;
  }
  const w = W * k, h = H * k, c = canvas(w, h), x = c.getContext('2d');
  const col = [];
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) col[Y * w + X] = shade((X + 0.5) / k, (Y + 0.5) / k, full, k, X, Y);
  const at = (X, Y) => (X < 0 || Y < 0 || X >= w || Y >= h ? null : col[Y * w + X]);
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    const v = at(X, Y);
    if (!v) continue;
    const edgeL = !at(X - 1, Y), edgeR = !at(X + 1, Y), edgeU = !at(X, Y - 1), edgeD = !at(X, Y + 1);
    // viền: mép hứng sáng trên-trái nhạt hơn ở bản 2x
    const food = C.bone.includes(v) ? C.bone[0] : C.kib.includes(v) ? C.kib[0] : null;   // xương, hạt: viền màu của nó
    const out = food ? (edgeR || edgeD ? food : v) : edgeL || edgeR || edgeU || edgeD ? (k > 1 && (edgeU || edgeL) && !edgeD && Y < h * 0.55 ? C.outLite : C.out[k > 1 ? 1 : 0]) : v;
    x.fillStyle = out; x.fillRect(X, Y, 1, 1);
  }
  return c;
}
export const SPR14 = { dogBowl: { empty: dogBowl(false, 2), full: dogBowl(true, 2) } };
