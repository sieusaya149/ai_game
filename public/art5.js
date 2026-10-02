// Nhân vật art gấp đôi (bản thử): khung 32x48 vẽ vào đúng ô 16x24 của bộ cũ (art.character), cùng frames[hướng][khung].
// Mỗi mảng màu có 4 sắc độ (sáng, gốc, tối, rất tối) + viền tối bao ngoài; mắt và tóc có điểm sáng.
import { canvas, sprite, flip, paint, SKINS, HAIR_COLORS, SHIRTS, PANTS } from './art.js';

// ---------- màu ----------
const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgb2hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hsl2hex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgb2hex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}
// Kéo sắc về phía hue đích (sáng ngả vàng, tối ngả tím) như cách vẽ pixel tay.
const toward = (h, t, a) => h + ((((t - h) % 360) + 540) % 360 - 180) * a;
// [sáng, gốc, tối, rất tối]
export function ramp(base) {
  const [h, s, l] = rgb2hsl(hex2rgb(base));
  const up = l < 0.3 ? 0.17 : 0.13;
  return [
    hsl2hex(toward(h, 55, 0.12), s * 0.95, l + up),
    base,
    hsl2hex(toward(h, 260, 0.08), Math.min(1, s * 1.08), l - Math.min(0.13, l * 0.4)),
    hsl2hex(toward(h, 260, 0.14), Math.min(1, s * 1.12), l - Math.min(0.24, l * 0.62)),
  ];
}
const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };

// Da vẽ tay cho ấm (bóng ngả đỏ nâu thay vì xám)
const SKIN_RAMPS = [
  ['#fff1df', '#ffd7b0', '#f0b088', '#c47c5c'],
  ['#ffd4ad', '#f1b98c', '#d8946a', '#a5634a'],
  ['#e4a77a', '#c98b5f', '#a76a44', '#77462e'],
];
const OUT = '#26150e';
const SHOE = ['#8a5a32', '#5c3418', '#3a2010'];

// ---------- lưới ----------
// Nửa trái (16 cột) + ảnh gương thành 32 cột.
const sym = half => half.map(r => r + [...r].reverse().join(''));
const check = (rows, w, name) => rows.forEach((r, i) => { if (r.length !== w) throw new Error(`${name} hàng ${i}: ${r.length} != ${w}`); });

// Đầu nhìn xuống (hàng 2..27 của khung)
const HEAD_F = [
  '............oooo',
  '..........oohhhh',
  '........oohhhhhh',
  '.......ohhhhhhhh',
  '......ohhhhhhHHH',
  '.....ohhhhHHHHHH',
  '....ohhHHHHHHhhh',
  '....ohhHHHhhhhhh',
  '....ohhhhhhhhhhh',
  '....ojhhhhhhhhhh',
  '....ojhhhhhhhhhh',
  '....ojhhjhhhjhhh',
  '....ojhhohhhohhj',
  '....ojhjdojjdojh',
  '....ojhjsdjoddoj',
  '....ojjossodssdo',
  '....ojjdsssssssd',
  '....ojosssssssss',
  '....ojdssssssSss',
  '....oodsssssssss',
  '....odsccsssssss',
  '.....odssssssssm',
  '.....oddssssssss',
  '......oddsssssss',
  '.......ooooooDDD',
  '............oddd',
];
// Đầu nhìn lên: tóc phủ kín, gáy tối dần
const HEAD_B = [
  ...HEAD_F.slice(0, 9),
  '....ojhhhhhhhhhh',
  '....ojhhhhhhhhhh',
  '....ojhhhhhhhhhh',
  '....ojhhhjhhhhhh',
  '....ojhhhjhhhhhh',
  '....ojhhhjhhhhhh',
  '....ojjhhjhhhhhh',
  '....ojjhhjhhhhhh',
  '....ojjhhjhhhhhh',
  '....ojjjhjhhhhhh',
  '....ojjjjjjhhhhh',
  '....oJjjjjjjjhhh',
  '.....oJjjjjjjjjj',
  '.....oJJjjjJjjjJ',
  '......oJJJJJJJJJ',
  '.......ooooooddd',
  '............oddd',
];
// Thân (hàng 28..39): cổ áo sáng, tay áo có nếp, bàn tay, thắt lưng
const BODY_F = [
  '.......oooooTTdd',
  '......ottttttTTT',
  '.....oTTtttttttt',
  '....outTUttttttt',
  '....outtUttttttt',
  '....ouutUttttttt',
  '....oUUUUttttttt',
  '....oSssottttttt',
  '....osssottttttt',
  '....oddsouuuuuuu',
  '.....ooooQQQQQQQ',
  '......oppppppppp',
];
// Chân trái (cột 6..15, hàng 40..47): đứng / nhấc lên khi bước
const LEG = [
  'opppppppqo', 'oPpppppqqo', 'oPpppppqqo', 'oqqqqqqqQo',
  'offFFfffgo', 'oFfffffggo', 'oggggggggo', '.oooooooo.',
];
const LEG_UP = [...LEG.slice(0, 1), ...LEG.slice(3), '..........', '..........'];

// Tay nhìn ngang (hàng 30..37): cánh tay 3 điểm, cổ tay áo, bàn tay bo tròn
const ARM_S = [
  '........otttttoTtuUtuuuo........',
  '........otttttoTtuUtuuuo........',
  '........ottttuoTtuUtuuuo........',
  '........ottttuoUUUUtuuuo........',
  '........ottttuoSsdotuuuo........',
  '........ottttuossdotuuuo........',
  '........ouuuuuosddouuuuo........',
  '........oUUUUUUoooUUUUUo........',
];
const ARM_W = [
  '........otttttoTtuUtuuuo........',
  '........otttttoTtuUtuuuo........',
  '........ottttoTtuUttuuuo........',
  '........otttuoUUUUttuuuo........',
  '........otttuoSsdottuuuo........',
  '........otttuossdottuuuo........',
  '........ouuuuosddouuuuuo........',
  '........oUUUUUoooUUUUUUo........',
];
// Nhìn trái (32 cột): đầu hàng 2..27, thân 28..39, chân 40..47
const SIDE = [
  '............oooooooo............',
  '..........oohhhhhhhhoo..........',
  '........oohhhhhHHHhhhhoo........',
  '.......ohhhhHHHHHHhhhhhho.......',
  '......ohhhHHHHhhhhhhhhhhjo......',
  '.....ohhhHHHhhhhhhhhhhhhjjo.....',
  '....ohhhhhhhhhhhhhhhhhhhhjjo....',
  '....ohhhhhhhhhhhhhhhhhhhhhjo....',
  '....ohhhhhhhhhhhhhhhjhhhhhjo....',
  '....ohhhjhhhjhhhhhhjhhhhhhjo....',
  '....oohohhhohhhhhhjhhhhhhhjo....',
  '....odjdojodjhhhhhjhhhhhjhjo....',
  '....ososdodsojhhhhjhhhhhjhjo....',
  '....osdssdssdojhhhjhhhhjhhjo....',
  '....ossseesssdojhhhhhhhjhhjo....',
  '....ossswessssdooohhhhhjhhjo....',
  '....ossseessssosDsohhhjhhhjo....',
  '....osssiissssosDdojhhhjhhjo....',
  '....osccssssssoddojhhhhhhhjo....',
  '....osssssssssdoojhhhhhhhhjo....',
  '.....oosssssssssddjjjjjjJJo.....',
  '......odssssssssddJJJJoooo......',
  '.......oosssssssddDDoo..........',
  '........odddsssssdDo............',
  '.........oooDDDDDDo.............',
  '...........oddddddo.............',
  // thân
  '........ooouTTTTTTuoooo.........',
  '........ottTTttttttttuuo........',
  ...ARM_S,
  '........oQQQQQQQQQQQQQQo........',
  '........opppppppppppqqqo........',
];
// Thân nhìn ngang lúc bước: tay đánh ra trước một điểm
const SIDE_WALK = [...SIDE.slice(0, 28), ...ARM_W, ...SIDE.slice(36)];
const SIDE_LEGS = [
  [
    '........opppppppppppqqqo........',
    '........oPppppppppppqqqo........',
    '........oPppppppppppqqqo........',
    '........oqqqqqqqqqqqqQQo........',
    '.......ofFFffffffffffggo........',
    '......o' + 'f'.repeat(14) + 'ggo........',
    '......oggggggggggggggggo........',
    '.......oooooooooooooooo.........',
  ],
  [
    '........oppppppooqqqqqqo........',
    '.......oppppppo.oqqqqqqo........',
    '......oPppppqo..oqqqqqQo........',
    '......oqqqqqQo..oQQQQQQo........',
    '.....ofFFffffo..offffggo........',
    '....oFffffffgo..offffggo........',
    '....oggggggggo..oggggggo........',
    '.....oooooooo....oooooo.........',
  ],
];

// Mắt nhìn xuống: 3x4, điểm sáng góc trên trái, đáy tròng màu nhạt
const EYE_F = ['eee', 'wee', 'eei', 'iii'];

// Tóc dài: lọn hai bên (nhìn xuống), phủ lưng (nhìn lên), buông sau gáy (nhìn ngang)
const LOCK_F = ['ohhjo', 'ohhjo', 'oHhjo', 'oHhjo', 'ohhjo', 'ohhjo', 'ohjjo', 'ohhjo', 'ohhjo', 'oHhjo', 'ohhjo', 'ohjjo',
  'ohjjo', 'ohhjo', 'ojhjo', 'ojjo.', 'oJjo.', '.oJo.', '..o..'];
const LONG_B = sym([
  'ohhhhhhhhhhh', 'ohhhjhhhhjhh', 'ohhhjhhhhjhh', 'ohhhjhhhhjhh', 'ohhjjhhhhjhh', 'ohhjhhhhjjhh', 'ohhjhhhhjhhh',
  'ohjjhhhhjhhh', 'ohjhhhhhjhhh', 'ojjhhhhjjhhh', 'ojjhhhhjhhhj', 'oJjjjjjjjjjJ', '.oJoJJoJJoJJ', '..o.oo.oo.oo',
]);
const LONG_S = ['hhhhhhhjo', 'hhhhhhjjo', 'ohhhjhhjo', 'ohhhjhhjo', 'ohhjhhhjo', 'ohhjhhjjo', 'ohhjhhjjo', 'ohjjhhjo.',
  'ohjhhjjo.', 'ojjhjjo..', '.oJjJo...', '..ooo....'];
// Búi tóc + đuôi ngựa
const BUN = ['...oooooo...', '..oHHhhhjo..', '.oHhhhhhhjo.', '.ohhhhhhjjo.', '..ojjjjjjo..'];
const PT_UP = ['.oooooo.', 'ohhHHhjo', 'ohhHhhjo', 'ohhhhhjo', '.ohhhjo.', '.ohhhjo.', '.ohHhjo.', '.ohhhjo.', '..ohjo..', '..ohjo..', '..ojjo..', '...oo...'];
const PT_SIDE = ['..oooo..', '.ohhhjo.', 'ohhHhhjo', 'ohHhhhjo', 'ohhhhjjo', 'ohhhhjjo', '.ohhhjo.', '.ohhhjo.', '.ohhjjo.', '..ohjo..', '..ojjo..', '...oo...'];

// Kính mát: tròng tối có vệt sáng
const GLASS_F = ['kkkkkkkkkkkkkkkkkkkkkk', '.kwKKKKKk....kwKKKKKk.', '.kKKKKKKk....kKKKKKKk.', '..kkkkkk......kkkkkk..'];
const GLASS_S = ['kkkkkkkkkkkkkk', 'kwKKKk', 'kKKKKk', '.kkkk.'];
const GLASS_PAL = { k: '#1c1c26', K: '#3a4a6a', w: '#cfe6ff' };

[[HEAD_F, 16, 'HEAD_F'], [HEAD_B, 16, 'HEAD_B'], [BODY_F, 16, 'BODY_F'], [LEG, 10, 'LEG'], [LEG_UP, 10, 'LEG_UP'], [SIDE, 32, 'SIDE'],
  ...SIDE_LEGS.map((l, i) => [l, 32, 'SIDE_LEGS' + i])].forEach(([r, w, n]) => check(r, w, n));

// Nón lá vẽ bằng hàm: chóp nhọn, các vòng nan, mép vành tối, sáng bên trái
const STRAW = ['#fff4c0', '#f0d07a', '#d2a24a', '#9c6c28'];
function nonLa() {
  const hw = y => (y <= 12 ? 0.9 + y * 1.13 : y === 13 ? 16 : y === 14 ? 15 : -1);
  const inside = (x, y) => y >= 0 && y < 16 && Math.abs(x + 0.5 - 16) <= hw(y);
  return paint(32, 16, (x, y) => {
    if (!inside(x, y)) return null;
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) return OUT;
    const dx = (x + 0.5 - 16) / Math.max(1, hw(y));
    if (y === 13) return dx < -0.4 ? STRAW[1] : STRAW[3];
    if (y === 12) return dx < -0.2 ? STRAW[0] : dx > 0.55 ? STRAW[2] : STRAW[1];
    if (y === 4 || y === 8 || y === 11) return dx > 0.3 ? STRAW[3] : STRAW[2];   // vòng nan
    if (dx < -0.45) return STRAW[0];
    if (dx > 0.5) return STRAW[2];
    return (x + y) % 7 === 0 ? STRAW[2] : STRAW[1];   // vân nan
  });
}

// ---------- Mũ & phụ kiện vẽ tay (toạ độ trong khung 32x48) ----------
// Viền 1px quanh mọi điểm có màu (lưới phải chừa sẵn một điểm trống ở mép)
const outlined = rows => rows.map((r, y) => [...r].map((c, x) => {
  if (c !== '.') return c;
  const n = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => { const v = rows[y + dy]?.[x + dx]; return v && v !== '.' && v !== 'o'; });
  return n ? 'o' : '.';
}).join(''));
// Mũ lưỡi trai: chỏm mũ lấy đúng dáng mái tóc (hàng 2..11), tóc → vải đỏ 4 sắc độ, rồi vẽ lưỡi trai
const CAP_PAL = { o: OUT, L: '#ff8a68', r: '#e5452f', R: '#b02e1c', D: '#741a10', w: '#ffffff', W: '#e0d8d0' };
const toCap = rows => rows.map(r => r.replace(/[hHjJsdDSecmwi]/g, c => ({ h: 'r', H: 'L', j: 'R', J: 'D' })[c] ?? 'r'));
const CAP_F = [...toCap(sym(HEAD_F.slice(0, 10))), ...sym(['...oLLLLLLLLLLLL', '..orrrrrrrrrrrrr', '..oRRRRRRRRRRRRR', '...ooooooooooooo'])];
[[7, 15], [7, 16], [8, 15], [8, 16]].forEach(([y, x]) => { CAP_F[y] = CAP_F[y].slice(0, x) + 'w' + CAP_F[y].slice(x + 1); });
[[9, 15], [9, 16]].forEach(([y, x]) => { CAP_F[y] = CAP_F[y].slice(0, x) + 'W' + CAP_F[y].slice(x + 1); });
const CAP_B = [...toCap(sym(HEAD_B.slice(0, 10))), ...sym(['....oRRRRRRRRRRR', '....oDDDDDDDDDoo', '.....oooooooooo.'])];
const CAP_S = [...toCap(SIDE.slice(0, 9)), '.ooo' + toCap(SIDE.slice(9, 10))[0].slice(4),
  '.oLLLL' + 'r'.repeat(20) + 'Ro....', 'o' + 'D'.repeat(6) + 'o'.repeat(21) + '....', '.' + 'o'.repeat(6) + '.'.repeat(25)];
// Nơ hồng
const BOW_PAL = { o: OUT, Q: '#ffd0de', q: '#ff8fb1', z: '#cf4680', W: '#ffffff' };
const BOW = sym(['.ooo...', 'oQQqo..', 'oQqqqoo', 'oqqqzoW', 'oqqzzoq', 'ozzzooo', '.ooo.oz', '.....oo']);
// Vương miện: ba chóp, đai có đá đỏ, đá xanh ở giữa
const CROWN_PAL = { o: OUT, Y: '#fff4a8', y: '#f7d547', G: '#d19a1c', r: '#e5452f', R: '#9e2416', u: '#7cc8ff' };
const CROWN = sym(['.o.......o', 'oYo.....oY', 'oYyo...oYy', 'oyyyo.oyyy', 'oyyyyoyyyy', 'oGGGGGGGGG', 'oGrRGGGGGu', 'oooooooooo']);
// Vòng hoa: hoa năm cánh xen lá, viền tự sinh
const WREATH_PAL = { o: '#24401a', n: '#ffd0dc', p: '#ff7fa8', w: '#ffffff', W: '#d8dee8', y: '#ffe680', Y: '#f0b020', c: '#f59a23', r: '#d9483b', l: '#9ad860', g: '#4fa83a', G: '#2f6b1f' };
function wreathRows(w) {
  const FL = [['n', 'p', 'c'], ['w', 'W', 'c'], ['y', 'Y', 'r']];
  const g = [...Array(6)].map(() => Array(w + 2).fill('.'));
  for (let i = 0; i < w; i++) { g[3][i + 1] = i % 2 ? 'g' : 'l'; g[4][i + 1] = i % 3 ? 'G' : 'g'; }
  for (let i = 1, k = 0; i < w - 1; i += 4, k++) {
    const [hi, lo, mid] = FL[k % 3], x = i + 1;
    g[1][x] = hi; g[2][x - 1] = hi; g[2][x] = mid; g[2][x + 1] = lo; g[3][x] = lo;
  }
  return outlined(g.map(r => r.join('')));
}
const WREATH_F = wreathRows(20), WREATH_S = wreathRows(22);
// Khăn quàng đỏ có vân len, đuôi buông
const SCARF_PAL = { o: OUT, L: '#ff8068', r: '#e0402c', R: '#a82818', D: '#6e160c' };
const SCARF_F = ['.....oooooooooo.....', '...ooLLLLLLLLLLoo...', '.ooLrrrrrrrrrrrrLoo.', 'oLrRrrRrrrrrrRrrRrLo', 'o' + 'R'.repeat(18) + 'o', '.' + 'o'.repeat(18) + '.'];
const SCARF_TAIL = ['oLrrRo', 'oLrrRo', 'orrrRo', 'oLrRDo', 'orrRDo', 'oRRDDo', 'oooooo'];
const SCARF_S = ['...ooooooooo....', '..oLLLLLLLLLo...', '.oLrrrrrrrrrro..', 'oLrRrrRrrRrrrRo.', 'o' + 'R'.repeat(13) + 'o.', '.' + 'o'.repeat(13) + '..'];
const SCARF_TAIL_S = ['oLrRo', 'oLrRo', 'orrRo', 'orRDo', 'oRDDo', 'ooooo'];

const hatCache = new Map();
const hatImg = (k, mk) => hatCache.get(k) ?? hatCache.set(k, mk()).get(k);
// [[x, y, ảnh]] theo mũ và hướng (hướng 2 = ảnh lật của hướng 1, lật cả khung nên vẽ như hướng 1)
function hatHD(hat, dir) {
  if (hat === 1) return [[0, 0, hatImg('non', nonLa)]];
  if (hat === 2) return [[0, 2, hatImg('cap' + dir, () => sprite(dir === 0 ? CAP_F : dir === 3 ? CAP_B : CAP_S, CAP_PAL))]];
  if (hat === 3) return [[dir === 1 ? 16 : 18, 2, hatImg('bow', () => sprite(BOW, BOW_PAL))]];
  if (hat === 4) return [[5, 7, hatImg('wr' + (dir === 1), () => sprite(dir === 1 ? WREATH_S : WREATH_F, WREATH_PAL))]];
  if (hat === 5) return [[dir === 1 ? 8 : 6, 0, hatImg('crown', () => sprite(CROWN, CROWN_PAL))]];
  return [];
}
function accHD(acc, dir) {
  if (acc === 1 && dir === 0) return [[5, 18, hatImg('glF', () => sprite(GLASS_F, GLASS_PAL))]];
  if (acc === 1 && dir === 1) return [[5, 16, hatImg('glS', () => sprite(GLASS_S, GLASS_PAL))]];
  if (acc === 2) {
    if (dir === 1) return [[8, 26, hatImg('scS', () => sprite(SCARF_S, SCARF_PAL))], [20, 30, hatImg('sctS', () => sprite(SCARF_TAIL_S, SCARF_PAL))]];
    const band = [6, 26, hatImg('scF', () => sprite(SCARF_F, SCARF_PAL))];
    return dir === 0 ? [band, [18, 30, hatImg('sct', () => sprite(SCARF_TAIL, SCARF_PAL))]] : [band];
  }
  return [];
}

const cache = new Map();
// frames[hướng][khung], khung 32x48 (gấp đôi bộ cũ), chân chạm hàng dưới cùng.
export function characterHD(look) {
  const key = JSON.stringify(look);
  if (cache.has(key)) return cache.get(key);
  const sk = SKIN_RAMPS[look.skin] ?? SKIN_RAMPS[0];
  const hr = ramp(HAIR_COLORS[look.hairColor] || HAIR_COLORS[0]);
  const sh = ramp(SHIRTS[look.shirt] || SHIRTS[0]), pa = ramp(PANTS[look.pants] || PANTS[0]);
  const style = look.hair | 0, hat = look.hat | 0, acc = look.acc | 0;
  const pal = {
    o: OUT, S: sk[0], s: sk[1], d: sk[2], D: sk[3],
    H: hr[0], h: hr[1], j: hr[2], J: hr[3],
    T: sh[0], t: sh[1], u: sh[2], U: sh[3],
    P: pa[0], p: pa[1], q: pa[2], Q: pa[3],
    F: SHOE[0], f: SHOE[1], g: SHOE[2],
    e: '#1e1424', w: '#ffffff', i: '#8c5a3c', c: mix(sk[1], '#ff6070', 0.35), m: '#b2453c',
  };
  const put = (x, cv, px, py) => x.drawImage(cv, px, py);
  const layer = (rows, p = pal) => sprite(rows, p);
  const build = (rows, dir) => {
    const out = canvas(32, 48), x = out.getContext('2d');
    put(x, layer(rows), 0, 0);
    if (dir === 0) for (const ex of [9, 20]) put(x, layer(EYE_F), ex, 18);
    if (style === 1) {
      if (dir === 0) { put(x, layer(LOCK_F), 4, 16); put(x, flip(layer(LOCK_F)), 23, 16); }
      if (dir === 3) put(x, layer(LONG_B), 4, 22);
      if (dir === 1) put(x, layer(LONG_S), 18, 22);
    }
    if (style === 2) {
      if (hat !== 1 && hat !== 2) put(x, layer(BUN), 10, 0);   // nón lá, mũ lưỡi trai trùm kín búi
      if (dir === 3) put(x, layer(PT_UP), 12, 20);
      if (dir === 1) put(x, layer(PT_SIDE), 24, 10);
    }
    for (const [lx, ly, im] of hatHD(hat, dir)) put(x, im, lx, ly);
    for (const [lx, ly, im] of accHD(acc, dir)) put(x, im, lx, ly);
    return out;
  };
  const legs = (l, r) => [...Array(8)].map((_, i) => '......' + l[i] + [...r[i]].reverse().join('') + '......');
  const front = (head, k) => [
    '................................', '................................',
    ...sym(head), ...sym(BODY_F),
    ...legs(k === 2 ? LEG_UP : LEG, k === 1 ? LEG_UP : LEG),
  ];
  const down = [0, 1, 2].map(k => build(front(HEAD_F, k), 0));
  const up = [0, 1, 2].map(k => build(front(HEAD_B, k), 3));
  const side = SIDE_LEGS.map((l, i) => build(['................................', '................................', ...(i ? SIDE_WALK : SIDE), ...l], 1));
  const left = [side[0], side[1], side[0]];
  const frames = [down, left, left.map(flip), up];
  cache.set(key, frames);
  return frames;
}
