// Người giao hàng: mang đơn mua online từ tiệm làng về kho của vườn.
// COURIER_ART (khung 16x24) và COURIER_ART_HD (khung 32x48, vẽ lại chi tiết hơn), cùng khóa, cùng điểm neo:
//   carry[hướng][khung]  ôm thùng hàng đi tới, empty[hướng][khung]  đi về tay không (vẫy tay khi nhìn xuống),
//   box  thùng các-tông đứng riêng (gói hàng thả cạnh kho, icon bảng đơn / thông báo).
// Hướng: 0 xuống, 1 trái, 2 phải, 3 lên. Khung: 0 đứng, 1 và 2 hai bước chân. Chân chạm hàng dưới cùng.
// Tự đủ, không import art.js: file này còn được nạp trong test Node (không có document).

const DOM = typeof document !== 'undefined';

// ---------- công cụ vẽ ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function sprite(rows, pal) {
  const c = canvas(Math.max(...rows.map(r => r.length)), rows.length), x = c.getContext('2d');
  rows.forEach((row, py) => [...row].forEach((ch, px) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(px, py, 1, 1); } }));
  return c;
}
function flip(src) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.scale(-1, 1); x.drawImage(src, -src.width, 0);
  return c;
}
// Chồng nhiều lớp [ảnh, x, y] lên một khung w x h
function stack(w, h, layers) {
  const c = canvas(w, h), x = c.getContext('2d');
  for (const [im, px, py] of layers) x.drawImage(im, px, py);
  return c;
}
function hash(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// Chép lớp phủ vào lưới chữ: '.' bỏ qua, ',' xoá thành trong suốt
function put(rows, ov, x0, y0) {
  const g = rows.map(r => [...r]);
  ov.forEach((r, y) => [...r].forEach((c, x) => {
    const row = g[y0 + y];
    if (c === '.' || !row || x0 + x < 0 || x0 + x >= row.length) return;
    row[x0 + x] = c === ',' ? '.' : c;
  }));
  return g.map(r => r.join(''));
}
const sym = half => half.map(r => r + [...r].reverse().join(''));
const check = (rows, w, name) => rows.forEach((r, i) => { if (r.length !== w) throw new Error(`${name} hàng ${i}: ${r.length} != ${w}`); });

// ---------- màu ----------
const OUT = '#26150e';
// Bản 1x: mỗi mảng 2-3 sắc độ cho dễ đọc ở cỡ nhỏ
const PAL1 = {
  o: '#3b2412', s: '#f1b98c', d: '#d0906a', e: '#2a1a10', m: '#c0504a', c: '#f2a0a0', h: '#2b1a12',
  a: '#62cc7c', g: '#2e9a52', G: '#1d6a38',               // đồng phục xanh lá
  Y: '#ffc35a', O: '#f28a1e', Q: '#b8580c',               // viền cam
  n: '#3a4878', N: '#252e52', w: '#f6f4ee', W: '#a8a8b8', // quần xanh than, giày trắng
  b: '#8a5a2e', B: '#5c3a1a',                             // dây đeo, túi
};
// Bản 2x: 4 sắc độ mỗi mảng (sáng, gốc, tối, rất tối), sáng từ trên trái
const PAL2 = {
  o: OUT, S: '#ffd4ad', s: '#f1b98c', d: '#d8946a', D: '#a5634a',
  e: '#1e1424', i: '#8c5a3c', w: '#ffffff', c: '#f3a48c', m: '#b2453c',
  H: '#5a3e28', h: '#3a2618', j: '#24160e', J: '#140c08',
  A: '#72d68a', g: '#2e9a52', G: '#1f7340', K: '#134a2a',
  Y: '#ffc866', O: '#f28a1e', Q: '#c0600f', R: '#7e3a08',
  N: '#5664a2', n: '#38457a', v: '#283260', V: '#1a2040',
  x: '#e8e6de', X: '#b0aeb8', z: '#6a6a78',
  t: '#c08850', b: '#8a5a2e', B: '#5c3a1a',
};
const BOX_PAL = {
  o: OUT, Z: '#7a4e2a', L: '#fbe2b0', P: '#ecc488', p: '#d29e60', q: '#a87040',
  T: '#fff4cc', y: '#e8d48e', Y: '#b89c58', w: '#ffffff', W: '#c4c4cc', r: '#e0483a', k: '#6a5a50',
};

// ---------- thùng các-tông ----------
// Mặt trên (hàng 1..top) sáng, nếp gấp, mặt trước; băng keo chữ thập trên nắp, băng dọc chạy xuống mặt trước, nhãn trắng.
// hd: viền chọn lọc (trên/trái nâu, dưới/phải tối), vân bìa, mép băng keo, nhãn có sọc đỏ + dòng chữ, mũi tên "đặt đứng".
function boxRows(W, H, top, hd, label) {
  const g = [...Array(H)].map(() => Array(W).fill('.'));
  const tw = hd ? 4 : 2, tx = (W - tw) >> 1, m = (top + 1) >> 1;
  const tapeH = y => (hd ? y === m || y === m + 1 : top >= 3 && y === m);
  const tapeEnd = H - 3;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ex = x === 0 || x === W - 1, ey = y === 0 || y === H - 1;
    if (ex && ey) continue;
    if (ex || ey) { g[y][x] = hd && (y === 0 || x === 0) ? 'Z' : 'o'; continue; }
    const inT = x >= tx && x < tx + tw;
    if (y <= top) {                                   // nắp
      let c = hd && (y === 1 || x === 1) ? 'L' : x === W - 2 ? 'p' : 'P';
      if (tapeH(y)) c = hd && y === m + 1 && !inT ? 'y' : 'T';
      else if (inT) c = hd && x === tx + tw - 1 ? 'y' : 'T';
      g[y][x] = c;
    } else if (y === top + 1) g[y][x] = inT ? 'Y' : 'q';   // nếp gấp giữa hai mặt
    else {                                            // mặt trước
      let c = x === W - 2 || y === H - 2 ? 'q' : hd && x === 1 ? 'P' : 'p';
      if (hd && c === 'p' && hash(x * 3 + W, y * 5 + H) < 0.07) c = 'q';   // vân bìa
      if (inT && y <= tapeEnd) c = hd && x === tx ? 'T' : x === tx + tw - 1 ? 'Y' : 'y';
      if (hd && inT && y === tapeEnd && (x - tx) % 2) c = 'p';             // mép băng keo xé răng cưa
      g[y][x] = c;
    }
  }
  if (label) {
    const lx = hd ? 2 : 1, ly = top + 2 + (hd ? 1 : 0);
    const lw = Math.min(hd ? 7 : 3, tx - lx - (hd ? 1 : 0)), lh = Math.min(hd ? 5 : 2, H - 2 - ly);
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      let c = 'w';
      if (hd) {
        if (x === 0 || y === 0 || x === lw - 1 || y === lh - 1) c = x === lw - 1 || y === lh - 1 ? 'W' : 'w';
        if (y === 1 && x > 0 && x < lw - 1) c = 'r';
        if (y >= 2 && y < lh - 1 && x > 0 && x < lw - 1 - (y % 2) && x % 3 !== 0) c = 'k';
      } else if (y === lh - 1 && x === 1) c = 'r';
      g[ly + y][lx + x] = c;
    }
  }
  if (hd && H >= 18) {                               // mũi tên in "đặt đứng"
    const ax = tx + tw + 4, ay = top + 3;
    [[0, 0], [-1, 1], [0, 1], [1, 1], [-2, 2], [0, 2], [2, 2], [0, 3], [0, 4]].forEach(([dx, dy]) => { g[ay + dy][ax + dx] = 'Z'; });
  }
  return g.map(r => r.join(''));
}

// ==================================================================== bản 1x (16x24)
const B16 = '.'.repeat(16);
// Đầu nhìn xuống: mũ lưỡi trai xanh có phù hiệu cam, lưỡi trai cam, tóc mai đen
const HEAD1_F = [
  '.....oooooo.....',
  '...ooagggggoo...',
  '..oagggOOgggGo..',
  '..oggggOOggGGo..',
  '.oYOOOOOOOOOOQo.',
  '..ohddddddddho..',
  '..ohssssssssho..',
  '..ossessssesso..',
  '..ossessssesso..',
  '..ocssssssssco..',
  '...osssmmssso...',
  '....oodssdoo....',
  '....oOOddOOo....',
];
// Đầu nhìn lên: chỏm mũ, khóa cam sau gáy, tóc ngắn, tai
const HEAD1_B = [
  '.....oooooo.....',
  '...ooagggggoo...',
  '..oaggggggggGo..',
  '..oggggggggGGo..',
  '..oGGGGOOGGGGo..',
  '..ohhhhhhhhhho..',
  '..ohhhhhhhhhho..',
  '..ohhhhhhhhhho..',
  '.oshhhhhhhhhhso.',
  '..ohhhhhhhhhho..',
  '...ohhhhhhhho...',
  '....oodssdoo....',
  '....oOOOOOOo....',
];
// Áo khoác xanh, sọc cam ngang ngực, tay buông
const BODY1 = [
  '..oaggggggggGo..',
  '..oaggggggggGo..',
  '..oYOOOOOOOOQo..',
  '..oaggggggggGo..',
  '..osggggggggso..',
  '...onnnnnnnno...',
];
// Nhìn lên lúc ôm thùng: hai tay đưa ra trước nên thân hẹp lại, không thấy bàn tay
const BODY1_BC = [
  '...oaggggggGo...',
  '...oaggggggGo...',
  '...oYOOOOOOQo...',
  '...oaggggggGo...',
  '...oggggggGGo...',
  '...onnnnnnnno...',
];
// Dây đeo chéo + túi nhỏ bên hông (nhìn xuống / nhìn lên)
const STRAP1_F = ['...........b', '..........b.', '.........b..', '.......bb...', '....obbB....', '....oBBo....'];
const STRAP1_B = ['....b.......', '.....b......', '......b.....', '.......bb...', '........Bbbo', '........oBBo'];
const LEGS1_F = [
  ['...onnNoonnNo...', '...onnNoonnNo...', '...owwWoowwWo...', '....ooo..ooo....'],
  ['...onnNoonnNo...', '...onnNoowwWo...', '...owwWo.ooo....', '....ooo.........'],
  ['...onnNoonnNo...', '...owwWoonnNo...', '....ooo.owwWo...', '.........ooo....'],
];
// Tay vẫy (nhìn xuống, đi về): bàn tay giơ cạnh đầu
const WAVE1 = ['.oo', 'oss', 'osd', 'oOQ', 'oag', 'oag', 'oag'];
// Hai bàn tay bám hai bên thùng
const HANDS1 = ['.oss........sso.', '.osd........dso.', '..oo........oo..'];

// Nhìn trái
const HEAD1_S = [
  '.....oooooo.....',
  '...ooagggggGo...',
  '..oaOgggggggGo..',
  '..oOOggggggGGo..',
  'oYOOOOGGGGGGGo..',
  '.oQQQddhhhGGGo..',
  '..ossssshhhhho..',
  '..osesssdhhhho..',
  '..osesssdhhhho..',
  '..ocsssshhhhho..',
  '...omsssshhho...',
  '....ossssso.....',
  '....oOOdOOo.....',
];
const BODY1_S = [
  '....oagggggo....',
  '....oaggggGo....',
  '....oYOOOOQo....',
  '....oaggggGo....',
  '....oggggGGo....',
  '....onnnnnNo....',
];
// Tay nhìn ngang: buông / đánh ra trước / đánh ra sau / ôm thùng
const ARM1_D = ['G..', 'G..', 'G..', 'Q..', 's..'];
const ARM1_F = ['..G', '.G.', 'G..', 'Q..', 's..'];
const ARM1_B = ['G..', '.G.', '..Q', '..s'];
const ARM1_C = ['..oao', '.ogo.', 'oOo..', 'oso..', '.o...'];
const LEGS1_S = [
  ['....onnnnnno....', '....onnnnnNo....', '...owwwwwwWo....', '...oooooooo.....'],
  ['....onnnoNNo....', '...onno.oNNo....', '..owwo..oWWo....', '..ooo...ooo.....'],
  ['....oNNnnnno....', '...oNNo.onno....', '..oWWo..owwo....', '..ooo...ooo.....'],
];

[[HEAD1_F, 'HEAD1_F'], [HEAD1_B, 'HEAD1_B'], [BODY1, 'BODY1'], [BODY1_BC, 'BODY1_BC'], [HEAD1_S, 'HEAD1_S'], [BODY1_S, 'BODY1_S'],
  [HANDS1, 'HANDS1'], ...LEGS1_F.map((l, i) => [l, 'LEGS1_F' + i]), ...LEGS1_S.map((l, i) => [l, 'LEGS1_S' + i])]
  .forEach(([r, n]) => check(r, 16, n));

function build1() {
  const P = PAL1, bp = BOX_PAL;
  const boxF = sprite(boxRows(10, 7, 2, false, false), bp);
  const boxB = sprite(boxRows(14, 6, 2, false, false), bp);
  const boxS = sprite(boxRows(8, 6, 1, false, false), bp);
  const hands = sprite(HANDS1, P);
  const frame = (head, body, legs) => [B16, ...head, ...body, ...legs];
  // nhìn xuống
  const down = carry => [0, 1, 2].map(k => {
    let rows = put(frame(HEAD1_F, BODY1, LEGS1_F[k]), STRAP1_F, 2, 14);
    if (!carry) rows = put(put(rows, WAVE1, 13, 7), ['gGo', 'G..', 'G..', 'G..', 'G..'], 12, 14);   // tay phải giơ lên vẫy
    const im = sprite(rows, P);
    return carry ? stack(16, 24, [[im, 0, 0], [boxF, 3, 14], [hands, 0, 16]]) : im;
  });
  // nhìn lên: thùng sau lưng (phía trước mặt), chỉ ló góc qua vai
  const up = carry => [0, 1, 2].map(k => {
    const rows = put(frame(HEAD1_B, carry ? BODY1_BC : BODY1, LEGS1_F[k]), STRAP1_B, 2, 14);
    const im = sprite(rows, P);
    return carry ? stack(16, 24, [[boxB, 1, 12], [im, 0, 0]]) : im;
  });
  // nhìn trái: k=1 chân gần bước trước, k=2 chân xa bước trước
  const left = carry => [0, 1, 2].map(k => {
    const rows = frame(HEAD1_S, BODY1_S, LEGS1_S[k]);
    if (!carry) {
      const [arm, ax] = [[ARM1_D, 7], [ARM1_B, 8], [ARM1_F, 5]][k];
      return sprite(put(rows, arm, ax, 14), P);
    }
    return stack(16, 24, [[sprite(rows, P), 0, 0], [boxS, 0, 14], [sprite(ARM1_C, P), 4, 14]]);
  });
  const set = carry => { const l = left(carry); return [down(carry), l, l.map(flip), up(carry)]; };
  return { carry: set(true), empty: set(false), box: sprite(boxRows(12, 10, 3, false, true), bp) };
}

// ==================================================================== bản 2x (32x48)
const B32 = '.'.repeat(32);
// Đầu nhìn xuống (nửa trái, hàng 2..27): chỏm mũ có phù hiệu cam + logo trắng, lưỡi trai cam 3 hàng, bóng lưỡi trai trên trán
const HEAD2_F = [
  '............oooo',
  '..........ooAAgg',
  '........ooAAgggg',
  '.......oAAgggggg',
  '......oAgggggggg',
  '.....oAggggooooo',
  '.....oAgggoYYYYY',
  '....oAggggoYOOOO',
  '....oAggggoYOOxx',
  '....ogggggoQQQQx',
  '....oGgggggooooo',
  '...oYYYYYYYYYYYY',
  '..oYOOOOOOOOOOOO',
  '..oQQQQQQQQQQQQQ',
  '...ooooooooooooo',
  '....ojhddddddddd',
  '....ojhdssssssss',
  '....ojdsssssssss',
  '....ojdssssssSss',
  '....oodsssssssss',
  '....odsccsssssss',
  '.....odssssssmss',
  '.....oddssssssmm',
  '......oddsssssss',
  '.......ooooooDDD',
  '............oddd',
];
// Đầu nhìn lên: đường may chỏm mũ, khe sau có dây cam, tóc gáy, tai
const HEAD2_B = [
  '............oooo',
  '..........ooAAgg',
  '........ooAAgggg',
  '.......oAAgggggg',
  '......oAggggGggg',
  '.....oAgggggGggg',
  '.....oAgggggGggg',
  '....oAggggggGggg',
  '....ogggggggGooo',
  '....ogggggggohhh',
  '....oGggggggoOOO',
  '....oGGGGGGGGGGG',
  '....oKKKKKKKKKKK',
  '....ojhhhhhhhhhh',
  '...osjhhhhhhhhhh',
  '...osjhhhhjhhhhh',
  '...odjhhhhjhhhhh',
  '....ojjhhhjhhhhh',
  '....ojjhhhjhhhjh',
  '....ojjjhhjhhhjh',
  '....ojjjjjjjjjjj',
  '.....oJjjjjjjjjj',
  '.....oJJjjjJjjjJ',
  '......oJJJJJJJJJ',
  '.......ooooooddd',
  '............oddd',
];
// Thân (hàng 28..39): cổ áo cam, đường khóa kéo giữa, sọc cam 2 hàng, cổ tay cam, gấu áo tối
const BODY2_F = [
  '.......ooooOOOdd',
  '......oAAgYOOOOO',
  '.....oAAAggggggG',
  '....oAggKAgggggG',
  '....oYYOKYYYYYYY',
  '....oOOQKOOOOOOO',
  '....oAggKggggggG',
  '....oYOQKgggggGG',
  '....oSssoggggggG',
  '....osdsoGGGGGGG',
  '....oddooKKKKKKK',
  '......onnnnnnnnn',
];
const BODY2_B = [
  '.......ooooYOOOO',
  '......oAAgQQQQQQ',
  '.....oAAAggggggg',
  ...BODY2_F.slice(3),
];
// Nhìn lên lúc ôm thùng: cẳng tay đưa ra trước, khuỷu tay khép
const BODY2_BC = [
  ...BODY2_B.slice(0, 7),
  '....oGGGKgggggGG',
  '.....ooooggggggG',
  '........oGGGGGGG',
  '........oKKKKKKK',
  BODY2_B[11],
];
// Chân (cột 6..15 / 16..25), giày thể thao trắng sọc cam, đế xám
const LEG2 = [
  'onnnnnnnvo', 'oNnnnnnvvo', 'oNnnnnnvvo', 'ovvvvvvvVo',
  'oxxwwxxxXo', 'owxOOOxXXo', 'ozzzzzzzzo', '.oooooooo.',
];
const LEG2_UP = [LEG2[0], ...LEG2.slice(3), '..........', '..........'];
const EYE2 = ['eee', 'wee', 'eei', 'iii'];
// Bàn tay bám cạnh thùng
const HAND2 = ['.ooo.', 'oSsdo', 'ossdo', 'osddo', '.ooo.'];
// Tay phải giơ cao vẫy (cột 24..31, hàng 17..30)
const WAVE2 = [
  '....ooo.',
  '...oSsdo',
  '...oSsdo',
  '...osddo',
  '....odo.',
  '...oYOQo',
  '...oAgGo',
  '..oAgGo.',
  '..oAgGo.',
  '.oAggGo.',
  '.oAggGo.',
  'oAggGGo.',
  'oAggGo..',
  'ogggGo..',
];
// Túi đeo chéo: nắp sáng, khóa cam
const SATCHEL2 = ['.oooooo.', 'otttttbo', 'otbbbbBo', 'obbYYbBo', 'obbbbBBo', 'oBBBBBBo', '.oooooo.'];

// Nhìn trái (32 cột): đầu hàng 2..27, thân không tay 28..39
const SIDE2 = [
  '............oooooooo............',
  '..........ooAAAAggggoo..........',
  '........ooAAgggggggggGoo........',
  '.......oAAggggggggggggGGo.......',
  '......oAAgggggggggggggggGo......',
  '.....oAoooogggggggggggggGGo.....',
  '.....ooYYOogggggggggGgggGGo.....',
  '....oYOxOOogggggggggGgggggGo....',
  '....oOOOQoggggggggggGggggGGo....',
  '.oooooooooGGGGGGGGGGGGGGGGGo....',
  'oYYYYYOOOOOhhhhhhhhhhhhhhjo.....',
  'oQQQQQQQQQdddddhhhhhhhhhhjo.....',
  '.ooooooooodddddhhhhhhhhhhhjo....',
  '....oddddddddojhhhhhhhhhhhjo....',
  '....ossseesssdojhhhhhhhhhjjo....',
  '....ossswessssdooohhhhhhhjjo....',
  '....ossseessssosDsohhhhhhjjo....',
  '....osssiissssosDdojhhhhhjjo....',
  '....osccssssssoddojhhhhhhjjo....',
  '....omssssssssdoojhhhhhhhjjo....',
  '.....oosssssssssddjjjjjjJJo.....',
  '......odssssssssddJJJJoooo......',
  '.......oosssssssddDDoo..........',
  '........odddsssssdDo............',
  '.........oooDDDDDDo.............',
  '...........oddddddo.............',
  // thân
  '........oooQYYOOOOQoooo.........',
  '........oAAggggggggggGGo........',
  '........oAggggggggggGGGo........',
  '........oAggggggggggGGGo........',
  '........oYYYYYYOOOOOOOQo........',
  '........oOOOOOOQQQQQQQRo........',
  '........oAggggggggggGGGo........',
  '........oggggggggggGGGGo........',
  '........oggggggggggGGGKo........',
  '........oKKKKKKKKKKKKKKo........',
  '........oVVVVVVVVVVVVVVo........',
  '........onnnnnnnnnnnvvvo........',
];
// Tay nhìn ngang: buông / ra trước / ra sau / co lại ôm thùng (sọc cam trên tay áo khớp sọc thân)
const ARM2_D = ['oAggKo', 'oAggKo', 'oAggKo', 'oAggKo', 'oAgGKo', 'oAgGKo', 'oYOOQo', 'oSsdDo', 'osddDo', '.oooo.'];
const ARM2_F = ['...oAggKo', '...oAggKo', '..oAggKo.', '..oAggKo.', '.oAgGKo..', '.oAgGKo..', 'oYOOQo...', 'oSsdDo...', 'osddDo...', '.oooo....'];
const ARM2_B = ['oAggKo...', 'oAggKo...', '.oAggKo..', '.oAggKo..', '..oAgGKo.', '..oAgGKo.', '...oYOOQo', '...oSsdDo', '...osddDo', '....oooo.'];
const ARM2_C = ['...oAggKo', '...oAggKo', '..oAggKo.', '..oAggKo.', '.oAgGKo..', 'oYOOQo...', 'oSsdDo...', 'osddDo...', '.oooo....'];
const SIDE2_LEGS = [
  [
    '........onnnnnnnnnnnvvvo........',
    '........oNnnnnnnnnnnvvvo........',
    '........oNnnnnnnnnnnvvvo........',
    '........ovvvvvvvvvvvvVVo........',
    '.......oxwwxxxxxxxxxxXXo........',
    '......oxxOOOxxxxxxxxxXXo........',
    '......ozzzzzzzzzzzzzzzzo........',
    '.......oooooooooooooooo.........',
  ],
  [
    '........onnnnnnoovvvvvvo........',
    '.......onnnnnno.ovvvvvvo........',
    '......oNnnnnvo..ovvvvvVo........',
    '......ovvvvvVo..oVVVVVVo........',
    '.....oxwwxxxxo..oXXXXzzo........',
    '....oxOOOxxxXo..oXOOXzzo........',
    '....ozzzzzzzzo..ozzzzzzo........',
    '.....oooooooo....oooooo.........',
  ],
  [
    '........ovvvvvvoonnnnnno........',
    '.......ovvvvvvo.oNnnnnvo........',
    '......ovvvvvVo..oNnnnnvo........',
    '......oVVVVVVo..ovvvvvVo........',
    '.....oXXXXXXzo..oxwwxxXo........',
    '....oXQQQXXXzo..oxOOxxXo........',
    '....ozzzzzzzzo..ozzzzzzo........',
    '.....oooooooo....oooooo.........',
  ],
];

[[HEAD2_F, 16, 'HEAD2_F'], [HEAD2_B, 16, 'HEAD2_B'], [BODY2_F, 16, 'BODY2_F'], [BODY2_B, 16, 'BODY2_B'], [BODY2_BC, 16, 'BODY2_BC'],
  [LEG2, 10, 'LEG2'], [LEG2_UP, 10, 'LEG2_UP'], [WAVE2, 8, 'WAVE2'], [SIDE2, 32, 'SIDE2'],
  ...SIDE2_LEGS.map((l, i) => [l, 32, 'SIDE2_LEGS' + i])].forEach(([r, w, n]) => check(r, w, n));
if (HEAD2_F.length !== 26 || HEAD2_B.length !== 26 || BODY2_F.length !== 12 || BODY2_BC.length !== 12 || SIDE2.length !== 38) throw new Error('courier: sai số hàng');

// Ánh sáng từ trên trái: nửa phải bỏ điểm sáng, mép phải tối thêm một bậc
const DIM = { A: 'g', Y: 'O', S: 's', N: 'n', H: 'h', t: 'b' };
const RIM = { A: 'G', g: 'G', Y: 'Q', O: 'Q', S: 'd', s: 'd', h: 'j', n: 'v', b: 'B' };
const litLeft = rows => rows.map(r => [...r].map((c, x) => {
  if (x < 16) return c;
  const nx = r[x + 1];
  return (nx === 'o' || nx === '.' || nx === undefined) && RIM[c] ? RIM[c] : DIM[c] ?? c;
}).join(''));

// Dây đeo chéo vẽ bằng bậc thang 2 điểm (sáng trên, tối dưới)
function strap(rows, x0, y0, x1, y1) {
  const n = Math.abs(x1 - x0), sx = Math.sign(x1 - x0);
  let g = rows;
  for (let i = 0; i <= n; i++) {
    const x = x0 + i * sx, y = y0 + Math.round((i * (y1 - y0)) / n);
    g = put(g, ['t', 'b', 'B'], x, y);
  }
  return g;
}

function build2() {
  const P = PAL2, bp = BOX_PAL;
  const boxF = sprite(boxRows(20, 13, 5, true, true), bp);
  const boxB = sprite(boxRows(28, 12, 5, true, false), bp);
  const boxS = sprite(boxRows(16, 12, 3, true, false), bp);
  const hand = sprite(HAND2, P), eye = sprite(EYE2, P);
  const legs = k => [...Array(8)].map((_, i) => '......' + (k === 2 ? LEG2_UP : LEG2)[i] + (k === 1 ? LEG2_UP : LEG2)[i] + '......');
  const front = (head, body, k) => [B32, B32, ...litLeft(sym(head)), ...litLeft(sym(body)), ...legs(k)];
  // nhìn xuống
  const down = carry => [0, 1, 2].map(k => {
    let rows = front(HEAD2_F, BODY2_F, k);
    rows = put(strap(rows, 23, 29, 12, 36), SATCHEL2, 8, 36);
    if (!carry) {
      // bỏ tay phải đang buông, thay bằng tay giơ lên vẫy
      rows = put(rows, Array(8).fill('o,,,,'), 23, 31);
      rows = put(rows, WAVE2, 24, 17);
    }
    const im = stack(32, 48, [[sprite(rows, P), 0, 0], [eye, 9, 18], [eye, 20, 18]]);
    return carry ? stack(32, 48, [[im, 0, 0], [boxF, 6, 29], [hand, 2, 33], [flip(hand), 25, 33]]) : im;
  });
  // nhìn lên
  const up = carry => [0, 1, 2].map(k => {
    let rows = front(HEAD2_B, carry ? BODY2_BC : BODY2_B, k);
    rows = put(strap(rows, 8, 29, 19, 36), SATCHEL2, 17, 36);
    const im = sprite(rows, P);
    return carry ? stack(32, 48, [[boxB, 2, 24], [im, 0, 0]]) : im;
  });
  // nhìn trái
  const left = carry => [0, 1, 2].map(k => {
    const rows = [B32, B32, ...SIDE2, ...SIDE2_LEGS[k]];
    if (!carry) {
      const [arm, ax] = [[ARM2_D, 14], [ARM2_B, 14], [ARM2_F, 11]][k];
      return sprite(put(rows, arm, ax, 29), P);
    }
    return stack(32, 48, [[sprite(rows, P), 0, 0], [boxS, 0, 28], [sprite(ARM2_C, P), 11, 29]]);
  });
  const set = carry => { const l = left(carry); return [down(carry), l, l.map(flip), up(carry)]; };
  return { carry: set(true), empty: set(false), box: sprite(boxRows(24, 20, 7, true, true), bp) };
}

export const COURIER_ART = DOM ? build1() : null;
export const COURIER_ART_HD = DOM ? build2() : null;
