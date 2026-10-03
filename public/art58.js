// Tự động hóa theo khối ruộng (Phase 3, issue 58): đất màu mỡ (lớp phủ lên ô), ống tưới nhỏ giọt (theo từng ô: chờ / đang nhỏ giọt 2 khung /
// ngừng vì bồn cạn hay ngoài tầm nước), máy phun thuốc tự động dựng ở góc khối (chờ / đang phun 2 khung / ngừng vì mất điện, chưa trả
// tiền điện, hết thuốc), biểu tượng nâng cấp trên góc khối (nhỏ giọt, phun thuốc, màu mỡ).
// Mỗi ảnh có bộ thường và bộ 2x (kiểu A, đúng gấp đôi, cùng điểm neo), vẽ từ cùng một hàm như artwell.js, arttank.js.
// hd.js nối AUTO_ART → AUTO_ART_HD theo cùng cây khóa; render.js chọn ảnh theo state.autoInfo.
import { hash } from './art.js';
import { Pix, pen, outline, mix, OUT, IRON, WATER, GRASS } from './artwell.js';

const HOSE = ['#121216', '#24242a', '#3a3a44', '#5c5c6a'];          // ống PE đen
const DUST = ['#4e4840', '#6e675c', '#8e877a', '#b0a898'];          // ống ngừng: bạc màu, bụi đất
const CAP = ['#163e70', '#2a6cb8', '#5aa2e8', '#b4dcff'];           // đầu nhỏ giọt nhựa xanh
const HUMUS = ['#1c0f06', '#2e1a0c', '#46290f', '#5e3a18'];          // đất mùn
const BRASS = ['#6a4a10', '#a8781c', '#dcae3c', '#fbe08a'];          // đầu phun đồng
const TANKG = ['#1d4a2a', '#2f7a44', '#4eaa64', '#9ee0a8'];          // bình thuốc xanh lá
const MIST = ['#e8fff0', '#c8f0d8', '#a6dcbc'];                      // sương thuốc
const LAMP = { on: ['#1f6e2a', '#3cc24e', '#b8ffb0'], off: ['#3a1410', '#7a2018', '#b04030'] };
const H = (x, y) => hash(Math.floor(x * 5 + 3), Math.floor(y * 9 + 1));

function make(k, w, h, draw, edge = true) {
  const P = new Pix(w * k, h * k);
  draw(pen(P, k));
  if (edge) outline(P, k === 2);
  return P.toCanvas();
}

// ---------- Đất màu mỡ 16x16 (lớp phủ, không viền): đất sậm như mùn, vụn phân ủ, rễ nhỏ, giun đất ----------
function rich(g) {
  g.R('#1a0c0466', 0, 0, 16, 16);   // sậm cả ô, vẫn thấy luống cuốc bên dưới
  // cục mùn (bộ thường 1 điểm, bộ 2x có mặt sáng)
  const clods = [[2, 3], [9, 2], [13, 6], [5, 8], [11, 11], [2, 12], [7, 14], [14, 13]];
  for (const [x, y] of clods) {
    g.R(HUMUS[1], x, y, 1.5, 1);
    g.R(HUMUS[3], x, y, 0.5, 0.5);
    g.R(HUMUS[0], x + 0.5, y + 1, 1, 0.5);
  }
  // vụn phân ủ: rơm vàng nhạt, vỏ trứng trắng
  for (const [x, y, c] of [[6, 4, '#c9a24a'], [12, 9, '#c9a24a'], [3, 10, '#e8e0cc'], [10, 5, '#a8823a']]) g.R(c, x, y, 1, 0.5);
  // giun đất hồng nhô lên một nửa
  g.R('#b0606a', 8, 10, 2, 0.5); g.R('#d88890', 8.5, 9.5, 1, 0.5); g.R('#7a3a40', 10, 10, 0.5, 0.5);
  // lấm tấm mùn mịn ở bộ 2x
  g.hd(N => {
    for (let Y = 1; Y < 31; Y++) for (let X = 1; X < 31; X++) {
      const v = H(X, Y);
      if (v < 0.05) N(HUMUS[0] + 'aa', X, Y, 1, 1);
      else if (v > 0.975) N(HUMUS[3] + 'cc', X, Y, 1, 1);
    }
  });
}

// ---------- Ống nhỏ giọt 16x16 (lớp phủ, không viền tự động): ống chạy ngang sát mép dưới ô, đầu nhỏ giọt ở giữa ----------
// st: 'idle' | 'on' (f = khung 0/1) | 'off'
function drip(st, f = 0) {
  return g => {
    const C = st === 'off' ? DUST : HOSE, K = st === 'off' ? DUST : CAP;
    // ống: viền tối trên dưới, thân, vệt bóng
    g.R(mix(C[0], OUT, 0.4), 0, 12, 16, 3);
    g.R(C[1], 0, 12.5, 16, 2);
    if (g.k === 1) g.R(C[2], 0, 12, 16, 1);
    else { g.R(C[2], 0, 12.5, 16, 0.5); g.R(C[3], 0, 13, 16, 0.5); }
    // khớp nối mỗi mép ô (ống liền giữa các ô)
    g.R(C[0], 0, 11.5, 1, 4); g.R(C[0], 15, 11.5, 1, 4);
    g.hd(N => { N(C[3], 0, 24, 1, 1); N(C[3], 30, 24, 1, 1); });
    // đầu nhỏ giọt: chụp nhựa trên ống
    g.R(mix(K[0], OUT, 0.3), 6.5, 10.5, 3, 3);
    g.R(K[1], 7, 11, 2, 2);
    g.R(K[2], 7, 11, 1, 1);
    g.hd(N => { N(K[3], 14, 22, 1, 1); });
    if (st === 'on') {
      // đất ẩm loang quanh đầu nhỏ giọt, giọt nước: khung 0 đang đọng, khung 1 rơi xuống, vòng gợn
      g.E('#1a3a5a40', 8, 15, 4, 1.25);
      if (!f) { g.R(WATER[2], 7.5, 13.5, 1, 1); g.R(WATER[3], 7.5, 13.5, 0.5, 0.5); }
      else {
        g.R(WATER[1], 7.5, 14.5, 1, 1); g.R(WATER[3], 7.5, 14.5, 0.5, 0.5);
        g.hd(N => { N(WATER[2] + 'aa', 11, 31, 2, 1); N(WATER[2] + 'aa', 19, 31, 2, 1); });
      }
      g.hd(N => { N(WATER[3], 16, 25, 1, 1); });   // ống có nước: ánh xanh trên thân
    } else if (st === 'off') {
      // bụi đất bám, đầu nhỏ giọt khô nứt
      g.R(mix(DUST[2], '#8a5a2b', 0.4), 3, 12.5, 1, 0.5); g.R(mix(DUST[2], '#8a5a2b', 0.4), 12, 13.5, 1.5, 0.5);
      g.hd(N => { N('#8a5a2b', 15, 23, 1, 1); N(OUT, 16, 24, 1, 2); });
    }
  };
}

// ---------- Máy phun thuốc tự động 12x24 (chân dựng ở góc khối) ----------
// Cột sắt mạ kẽm, bình thuốc xanh dưới chân, hộp điều khiển có đèn (xanh: có điện, đỏ: ngừng), đầu phun đồng 2 tay trên đỉnh.
// st: 'idle' | 'on' (f = khung 0/1: tay phun xoay, sương thuốc) | 'off'
function sprayer(st, f = 0) {
  return g => {
    // bình thuốc dưới chân
    g.R(TANKG[1], 1, 17, 5, 6); g.R(TANKG[2], 1, 17, 2, 6); g.R(TANKG[3], 1.5, 17.5, 0.5, 4); g.R(TANKG[0], 5, 17, 1, 6);
    g.R(TANKG[0], 2, 16, 3, 1); g.R(IRON[3], 2.5, 15.5, 2, 0.5);
    g.hd(N => { N('#f4f0d8', 4, 39, 6, 3); N(OUT, 6, 40, 2, 1); });   // nhãn bình
    // ống mềm từ bình lên cột
    g.T(HOSE[1], 5.5, 15, 0.5, 2); g.T(HOSE[1], 6, 14.5, 1, 0.5);
    // cột
    g.R(IRON[2], 6.5, 4, 1.5, 19.5); g.R(IRON[3], 6.5, 4, 0.5, 19.5); g.R(IRON[1], 7.5, 4, 0.5, 19.5);
    g.R(IRON[1], 5.5, 22.5, 3.5, 1);   // chân đế
    // hộp điều khiển, đèn
    g.R(IRON[1], 8, 10, 3.5, 4); g.R(IRON[3], 8, 10, 3.5, 0.5); g.R(IRON[0], 8, 13.5, 3.5, 0.5);
    const L = st === 'off' ? LAMP.off : LAMP.on;
    g.R(L[1], 9, 11, 1.5, 1.5); g.R(L[2], 9, 11, 0.5, 0.5);
    if (st !== 'off') g.hd(N => N(L[2] + '88', 21, 21, 1, 1));
    // đầu phun: thân đồng, hai tay ngang (khung 1 xoay chéo), lỗ phun
    g.R(BRASS[1], 6, 2.5, 2.5, 2); g.R(BRASS[3], 6, 2.5, 1, 0.5); g.R(BRASS[0], 6, 4, 2.5, 0.5);
    if (st === 'on' && f) {
      g.T(BRASS[2], 3.5, 1.5, 2.5, 0.5); g.T(BRASS[2], 8.5, 4.5, 2.5, 0.5);
      g.R(BRASS[3], 3, 1, 1, 1); g.R(BRASS[3], 10.5, 4.5, 1, 1);
    } else {
      g.R(BRASS[2], 2.5, 3, 3.5, 1); g.R(BRASS[2], 8.5, 3, 3, 1);
      g.R(BRASS[1], 2, 3, 1, 1.5); g.R(BRASS[1], 10.5, 3, 1, 1.5);
      g.hd(N => { N(BRASS[3], 6, 6, 4, 1); N(BRASS[3], 18, 6, 4, 1); });
    }
    if (st === 'on') {
      // sương thuốc bay hai bên: đám mây mờ (trong suốt nên không bị viền), khung 1 bay xa và loang rộng hơn
      const d = f ? 1 : 0;
      for (const x of [1.5 - d * 0.5, 10.5 + d * 0.5]) { g.E(MIST[1] + '90', x, 5.5 + d, 1.5 + d * 0.5, 1.25 + d * 0.25); g.E(MIST[0] + '70', x, 5 + d, 0.75, 0.5); }
      g.hd(N => { for (const [X, Y] of [[1, 9 + d * 4], [4, 13 + d * 3], [20, 9 + d * 4], [18, 13 + d * 3], [2, 17 + d * 2], [21, 17 + d * 2]]) N(MIST[2] + '99', X, Y, 1, 1); });
    } else if (st === 'off') {
      // dấu gạch chéo nhỏ trên hộp: ngừng chạy
      g.hd(N => { N(LAMP.off[2], 17, 25, 1, 1); N(LAMP.off[2], 19, 25, 1, 1); });
    }
    // cỏ dưới chân
    g.R(GRASS[0], 0, 23, 1.5, 0.5); g.R(GRASS[1], 9.5, 22.5, 0.5, 1); g.R(GRASS[2], 10, 22, 0.5, 0.5);
  };
}

// ---------- Biểu tượng nâng cấp 9x9 trên góc khối: nền tròn kem, hình bên trong ----------
function badge(kind) {
  return g => {
    g.E('#f6eccc', 4.5, 4.5, 3.6, 3.6);
    g.E('#fffaf0', 3.8, 3.6, 1.6, 1.4);
    g.hd(N => { for (let i = 0; i < 6; i++) N('#c8b88a', 10 + i, 15, 1, 1); });
    if (kind === 'drip') {   // giọt nước
      g.E(WATER[1], 4.5, 5.3, 1.9, 1.8);
      g.R(WATER[1], 4, 2.5, 1, 1.5); g.R(WATER[1], 4.25, 1.75, 0.5, 1);
      g.R(WATER[3], 3.5, 4.5, 0.5, 1); g.R(WATER[2], 4, 5, 0.5, 0.5);
      g.R(WATER[0], 5, 6.5, 1, 0.5);
    } else if (kind === 'spray') {   // bình xịt thuốc
      g.R(TANKG[1], 3, 3.5, 3, 4); g.R(TANKG[2], 3, 3.5, 1, 4); g.R(TANKG[0], 5.5, 3.5, 0.5, 4);
      g.R(IRON[2], 4, 2, 1, 1.5); g.R(IRON[3], 4, 2, 0.5, 0.5);
      g.R(IRON[2], 5, 2, 1.5, 0.5);
      g.R(MIST[1], 6.5, 1.5, 0.5, 0.5); g.R(MIST[1], 7, 2.5, 0.5, 0.5);
      if (g.k === 1) g.R(MIST[2], 6, 1, 1, 1);
    } else {   // ụ đất mùn, một mầm lá nghiêng sang phải
      g.E(HUMUS[2], 4.5, 6.5, 3, 1.25); g.E(HUMUS[3], 4, 6, 1.5, 0.5);
      g.R(GRASS[0], 4, 3.5, 1, 2.5);
      g.E(GRASS[1], 6, 3, 1.5, 1); g.R(GRASS[2], 5.5, 2.5, 1, 0.5);
      g.R(GRASS[1], 2.5, 4, 1.5, 0.5);
    }
  };
}

const NODOC = typeof document === 'undefined';
const build = k => ({
  rich: make(k, 16, 16, rich, false),
  drip: {
    idle: make(k, 16, 16, drip('idle'), false),
    on: [make(k, 16, 16, drip('on', 0), false), make(k, 16, 16, drip('on', 1), false)],
    off: make(k, 16, 16, drip('off'), false),
  },
  sprayer: {
    idle: make(k, 12, 24, sprayer('idle')),
    on: [make(k, 12, 24, sprayer('on', 0)), make(k, 12, 24, sprayer('on', 1))],
    off: make(k, 12, 24, sprayer('off')),
  },
  badge: { drip: make(k, 9, 9, badge('drip')), spray: make(k, 9, 9, badge('spray')), rich: make(k, 9, 9, badge('rich')) },
});
export const AUTO_ART = NODOC ? null : build(1);
export const AUTO_ART_HD = NODOC ? null : build(2);
