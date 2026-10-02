// NPC art gấp đôi (bản thử): Cô Út, Chú Ba, Tí Sún. Khung 32x48 vẽ vào đúng ô 16x24 của bộ cũ (art3.npc),
// cùng cấu trúc frames[hướng][khung] + idle [đứng, thở]. Theo mẫu art5.characterHD: viền tối 1px,
// mỗi mảng màu 4 sắc độ (sáng, gốc, tối, rất tối), mắt có điểm sáng, tóc có vệt sáng, áo có nếp.
import { canvas, sprite, flip } from './art.js';
import { ramp } from './art5.js';

const OUT = '#26150e';
const W = 32, H = 48;

// ---------- lưới ----------
const sym = half => half.map(r => r + [...r].reverse().join(''));
const mirror = rows => rows.map(r => [...r].reverse().join(''));
const check = (rows, w, name) => rows.forEach((r, i) => { if (r.length !== w) throw new Error(`art7 ${name} hàng ${i}: ${r.length} != ${w}`); });
const pad = n => [...Array(n)].map(() => '.'.repeat(W));
// 4 sắc độ cho một mảng: [sáng, gốc, tối, rất tối] -> 4 chữ cái
const shades = (letters, base) => Object.fromEntries([...letters].map((ch, i) => [ch, (Array.isArray(base) ? base : ramp(base))[i]]));

// Vẽ khung: lưới chính + các lớp phủ [x, y, rows]
function frame(rows, pal, overlays = []) {
  const c = canvas(W, H), x = c.getContext('2d');
  x.drawImage(sprite(rows, pal), 0, 0);
  for (const [ox, oy, r] of overlays) x.drawImage(sprite(r, pal), ox, oy);
  return c;
}

// Chân nhìn xuống: nửa trái 16 cột (hàng 40..47), nửa phải là ảnh gương. Khung 1 nhấc chân phải, khung 2 chân trái.
const legsF = (stand, up) => [0, 1, 2].map(k => {
  const l = k === 2 ? up : stand, r = k === 1 ? up : stand;
  return l.map((row, i) => row + [...r[i]].reverse().join(''));
});

// Dựng NPC: def = { down, up, left: 40 hàng (đầu + thân), legsF: 3 bộ chân, legsS: 2 bộ chân nghiêng,
//   ovDown/ovUp/ovLeft: lớp phủ, eyesDown/eyesLeft: mắt mở, blinkDown: mắt nhắm }
function npcHD(def, pal) {
  const name = def.name;
  check(def.down, W, name + '.down'); check(def.up, W, name + '.up'); check(def.left, W, name + '.left');
  def.legsF.forEach((l, i) => check(l, W, name + '.legsF' + i));
  def.legsS.forEach((l, i) => check(l, W, name + '.legsS' + i));
  const down = def.legsF.map(l => frame([...def.down, ...l], pal, [...def.ovDown, ...def.eyesDown]));
  const up = def.legsF.map(l => frame([...def.up, ...l], pal, def.ovUp));
  const s = def.legsS.map(l => frame([...def.left, ...l], pal, [...def.ovLeft, ...def.eyesLeft]));
  const left = [s[0], s[1], s[0]];
  const frames = [down, left, left.map(flip), up];
  // thở: thân nhích xuống 1px (nửa điểm ảnh bộ cũ) và chớp mắt; chân đứng yên
  const blink = frame([...def.down, ...def.legsF[0]], pal, [...def.ovDown, ...def.blinkDown]);
  const breathe = canvas(W, H), x = breathe.getContext('2d');
  x.drawImage(blink, 0, 40, W, 8, 0, 40, W, 8);
  x.drawImage(blink, 0, 0, W, 40, 0, 1, W, 40);
  return { frames, idle: [down[0], breathe] };
}

// ---------- da, mắt ----------
const SKIN_LIGHT = ['#ffe9d4', '#f6c9a4', '#e0a07a', '#ad6a4e'];
const SKIN_TAN = ['#f0bf8e', '#d4986a', '#b07448', '#7a4a2e'];
const SKIN_KID = ['#fcd4ae', '#e8b088', '#c88e66', '#935f40'];
const EYE = { e: '#1e1424', '!': '#ffffff', i: '#7a4a32' };

// ---------- chân người lớn: quần dài + giày ----------
const LEG = [
  '........oPpppppq',
  '........oPppppqo',
  '........oPppppqo',
  '........oqqqqqQo',
  '.......oFFfffffo',
  '......oFffffffzo',
  '......ozzzzzzzzo',
  '.......oooooooo.',
];
const LEG_UP = [LEG[0], LEG[3], LEG[4], LEG[5], LEG[6], LEG[7], '.'.repeat(16), '.'.repeat(16)];
const LEGS_S = [
  [
    '..........oPppppppqqqo..........',
    '..........oPppppppqqqo..........',
    '..........oPpppppqqqqo..........',
    '..........oqqqqqqqqqQo..........',
    '........ooFFffffffffzo..........',
    '.......oFfffffffffffzo..........',
    '.......ozzzzzzzzzzzzzo..........',
    '........ooooooooooooo...........',
  ],
  [
    '..........oPppppppqqqo..........',
    '.........oPppppo.oqqqqo.........',
    '........oPpppqo...oqqqQo........',
    '........oqqqqQo...oQQQQo........',
    '......ooFFfffo....offfzo........',
    '.....oFffffffo....offfzo........',
    '.....ozzzzzzzo....ozzzzo........',
    '......ooooooo......oooo.........',
  ],
];

// ============================================================
// Cô Út: bác sĩ thú y, tóc búi buộc dây hồng, áo blouse trắng, ống nghe xanh, túi áo chữ thập đỏ.
// ============================================================
const COUT_HEAD_F = [
  '.............ooo',
  '...........ooHHh',
  '..........oHHhhh',
  '..........oHhhhh',
  '..........ojhhhh',
  '..........oyyyYY',
  '........oooYYYYY',
  '......oohhhhhhhh',
  '.....ohhhHHHhhhh',
  '....ohhhHHhhhhhh',
  '....ohhHHhhhhhhj',
  '....ohhhhhhhhhjS',
  '....ohhhhhhhhjSs',
  '....ohhhhhhjjSss',
  '....ohhhhhjsssss',
  '....ohhhhjssssss',
  '....ohhhjsssssss',
  '....ohhjdsssssss',
  '....ohhjdsssssss',
  '....oohjdsssssss',
  '.....ojdssssssss',
  '.....oodssssssss',
  '......oodsssssss',
  '........ooddssss',
];
const COUT_HEAD_B = [
  ...COUT_HEAD_F.slice(0, 10),
  '....ohhHHhhhhhhh',
  '....ohhhhhhhhhhh',
  '....ohhhhhjhhhhh',
  '....ohhhhjhhhhjh',
  '....ohhhhjhhhjhh',
  '....ohhhjhhhhjhh',
  '....ohhhjhhhjhhh',
  '....ohhjhhhhjhhh',
  '....ohhjhhhjhhhh',
  '....oojjhhhjhhhh',
  '.....ojjjjjjjjjj',
  '.....ooJjjjjjjjj',
  '......ooJJJJJJJJ',
  '........oooodddd',
];
const COUT_BODY_F = [
  '.......oooooAodd',
  '.....ooAAAaaAods',
  '....oAAaaaaaaAon',
  '....oAaaaaaaaaon',
  '...oAAaaaaaaaaAo',
  '...oAaBaaaaaaaao',
  '...oAaBaaaaaaaaa',
  '...oAaBaaaaaaaaa',
  '...oAaBaaaaaaaaa',
  '...obbBaaaaaaaaa',
  '...oSsdoaaaaaaaa',
  '...osSdobaaaaaaa',
  '...oddDobaaaaaaa',
  '....ooooaaaaaaaa',
  '.......obbbbbbbb',
  '.......ooooooooo',
];
const COUT_BODY_B = [
  '.......oooooAAAA',
  '.....ooAAAaaaaaa',
  '....oAAaaaaaaaaa',
  '....oAaaaaaaaaaa',
  '...oAAaaaaaaaaaa',
  '...oAaBaaaaaaaaa',
  '...oAaBaaaaaaaaa',
  '...oAaBaaaaaaaaa',
  '...oAaBaaaaaaaaa',
  '...obbBaaaaaaaab',
  '...oSsdoaaaaaaab',
  '...osSdobaaaaaab',
  '...oddDobaaaaaab',
  '....ooooaaaaaaab',
  '.......obbbbbbbb',
  '.......ooooooooo',
];
// nhìn trái: đầu 0..23, thân 24..39
const COUT_SIDE = [
  '...............oooo.............',
  '.............ooHHhhoo...........',
  '............oHHhhhhhjo..........',
  '............oHhhhhhhjo..........',
  '............ojhhhhhjjo..........',
  '............oyyyyYYYYo..........',
  '..........oooYYYYYYYYooo........',
  '........oohhhhhhhhhhhhoo........',
  '.......ohhhHHHHhhhhhhhhjo.......',
  '......ohhHHHhhhhhhhhhhhhjo......',
  '.....ohHHhhhhhhhhhhhhhhhjo......',
  '....ohhhhhhhhhhhhhhhhhhhjjo.....',
  '....oSShhhhhhhhhhhhHhhhhhjo.....',
  '....oSsssshhhhhhhhjhHhhhhjo.....',
  '....ossssssshhhhhjhhhhhhjjo.....',
  '...ossssssssjhhhjhhhhhhhjjo.....',
  '..osssssssssdSdhjhhhhhhjjo......',
  '..oossssssssdsdhjhhhhhjjjo......',
  '....osssssssdddjhhhhhjjjo.......',
  '...osssssssssdojjhhhjjjo........',
  '...osssssssssdo.oJjjjJo.........',
  '....osssssssddo..oooooo.........',
  '.....oddssssddo.................',
  '......oodddddo..................',
  '.........odsddo.................',
  '.......oooAlkaaoooo.............',
  '......oAAAlkaaaAAAaoo...........',
  '......oAAalkaoAAAaaaBo..........',
  '......oAalkoAAaaabBaBo..........',
  '......oAalkoAaaaabBaBo..........',
  '......oAalkoAaaaabBaBo..........',
  '......oAvvVoAaaaabBaBo..........',
  '......oAVVVoAaaaabBaBo..........',
  '......oAaaaobbbbbboaBo..........',
  '......oAaaaoSSsddoaaBo..........',
  '......oAaaaosSsddoabBo..........',
  '......oAaaaaoddDoaabBo..........',
  '......oAaaaaaoooaaabBo..........',
  '......obbbbbbbbbbbbbBo..........',
  '.......oooooooooooooo...........',
];

const COUT_PAL = {
  o: OUT, ...shades('SsdD', SKIN_LIGHT), ...shades('HhjJ', '#4a2c1c'), ...EYE,
  c: '#f39a8e', m: '#b2453c',
  ...shades('AabB', ['#ffffff', '#eef2f6', '#c6cfdc', '#8d98ad']),   // áo blouse trắng
  n: '#a8c8ec', N: '#7898c4',                                      // áo trong xanh nhạt
  l: '#9cc4f0', k: '#4f80c4', K: '#2f5288',                        // ống nghe
  v: '#f2f6fa', V: '#9aa4b2',                                      // đầu ống nghe bạc
  x: '#e5452f', X: '#a8281c',                                      // chữ thập đỏ
  y: '#ffa8c0', Y: '#e0607e',                                      // dây buộc tóc
  ...shades('PpqQ', '#4a6a9a'), F: '#5a4a52', f: '#3a3036', z: '#221c20',
};
const COUT = {
  name: 'COUT',
  down: [...sym(COUT_HEAD_F), ...sym(COUT_BODY_F)],
  up: [...sym(COUT_HEAD_B), ...sym(COUT_BODY_B)],
  left: COUT_SIDE,
  legsF: legsF(LEG, LEG_UP), legsS: LEGS_S,
  ovDown: [
    [16, 18, ['d']], [15, 20, ['mm']],
    [9, 18, ['cc']], [21, 18, ['cc']],
    // ống nghe quàng cổ: đầu nghe bên trái, tai nghe bên phải
    [9, 24, [
      '..k........k.',
      '.lk........kl',
      '.lk........lk',
      '.lk.........k',
      '.lk.........k',
      '.lk........vv',
      '.lk..........',
      'KvvK.........',
      'vvVK.........',
      'KVVK.........',
      '.KK..........',
    ]],
    // túi áo chữ thập đỏ
    [18, 31, ['bbbbb', 'baxab', 'bxxxb', 'baxab', 'bbbbb']],
    // nẹp áo + cúc
    [15, 29, ['b', 'b', 'v', 'b', 'b', 'b', 'v', 'b', 'b']],
  ],
  ovUp: [[11, 30, ['bbbbbbbbbb', '.v......v.']]],
  ovLeft: [[6, 18, ['c']], [4, 20, ['m']]],
  eyesDown: [[10, 15, ['eee', '!ee', 'iie']], [19, 15, ['eee', '!ee', 'iie']]],
  blinkDown: [[10, 16, ['...', 'eee']], [19, 16, ['...', 'eee']]],
  eyesLeft: [[6, 15, ['ee', '!e', 'ie']], [2, 17, ['d']]],
};

// ============================================================
// Chú Ba: lái heo đội nón cối, ria mép rậm, áo bà ba nâu, cuộn dây thừng bên hông, tay xách cân móc.
// ============================================================
const CHUBA_HEAD_F = [
  '................',
  '..........oooooo',
  '........ooGGgggg',
  '.......oGGgggggg',
  '......oGgggggggg',
  '.....oGggggggggg',
  '.....oGggggggggg',
  '....oGgggggggggg',
  '....oggggggggggg',
  '....okkkkkkkkkkk',
  '..ooGGgggggggggg',
  '.oGggggggggggggg',
  '.okkkkkkkkkkkkkk',
  '..ooohhDDDDDDDDD',
  '...oohdddddddddd',
  '..oSdhssssssssss',
  '..osdhssssssssss',
  '..oddhssssssssss',
  '...oohssssssssss',
  '....ojssssssssss',
  '....odssssssssss',
  '.....odsssssssss',
  '......oodsssssss',
  '........oodddsss',
];
const CHUBA_HEAD_B = [
  ...CHUBA_HEAD_F.slice(0, 13),
  '..ooohhjjjjjjjjj',
  '...oohhhhhhhhhhh',
  '..oSohhhhHhhhhhh',
  '..osdhhhhHhhhhhh',
  '..oddhhhhhhhhhhh',
  '...oohhhhhhhhhhh',
  '....ojhhhhhhhhhh',
  '....oJjjjhhhhhhh',
  '.....oJjjjjjjjjj',
  '......ooJJJJJJJJ',
  '........ooddddDd',
];
const CHUBA_BODY_F = [
  '.......oooooTodd',
  '.....ooTTTttTods',
  '....oTTttttttTod',
  '...oTTtttttttttT',
  '..oTTutttttttttt',
  '..oTtutttttttttt',
  '..oTtutttttttttt',
  '..oTtutttttttttt',
  '..oTtutttttttttt',
  '..ouuuUttttttttt',
  '..oSssdotttttttt',
  '..osSsdotttttttt',
  '..odddDotttttttt',
  '...ooooouttttttt',
  '.......ouuuuuuuu',
  '.......ooooooooo',
];
const CHUBA_BODY_B = [
  '.......ooooooTTT',
  '.....ooTTTtttttt',
  '....oTTttttttttt',
  '...oTTtttttttttt',
  '..oTTutttttttttt',
  '..oTtutttttttttt',
  '..oTtutttttttttt',
  '..oTtutttttttttt',
  '..oTtutttttttttt',
  '..ouuuUttttttttt',
  '..oSssdotttttttt',
  '..osSsdotttttttt',
  '..odddDotttttttt',
  '...ooooouttttttu',
  '.......ouuuuuuuu',
  '.......ooooooooo',
];
const CHUBA_SIDE = [
  '................................',
  '..........oooooooo..............',
  '........ooGGgggggggoo...........',
  '.......oGGgggggggggkko..........',
  '......oGgggggggggggggko.........',
  '......oGgggggggggggggkko........',
  '.....oGgggggggggggggggko........',
  '.....oggggggggggggggggko........',
  '.....ogggggggggggggggkko........',
  '.....okkkkkkkkkkkkkkkkko........',
  '..oooGGgggggggggggggggggoooo....',
  '.oGgggggggggggggggggggggggggo...',
  '..okkkkkkkkkkkkkkkkkkkkkkkkko...',
  '....oDDdddddhhhhhhhhhjjooooo....',
  '....odssssssshhhhhhhhhjo........',
  '...osssssssssdSdhhhhhhjo........',
  '..oSsssssssssdsdhhhhhhjo........',
  '.oSssssssssssdddhhhhhjjo........',
  '..ooosssssssssdhhhhhjjo.........',
  '....osssssssssdojhhhjjo.........',
  '....osssssssssdoJjjjjo..........',
  '....odsssssssddo.oooo...........',
  '.....oddssssddo.................',
  '......oooddddo..................',
  '.........odsddo.................',
  '.......oooTTTtoooooo............',
  '......oTTTtttTTTTtttUo..........',
  '.....oTTttttoTTTTtttUo..........',
  '.....oTttbtoTTttuUtuUo..........',
  '.....oTtttoTtttuUtuUo...........',
  '.....oTtttoTtttuUtuUo...........',
  '.....oTttbtoTtttuUtuUo..........',
  '.....oTtttoTtttuUtuUo...........',
  '.....oTttttouuuuuUtuUo..........',
  '.....oTttttoSssddotuUo..........',
  '.....oTttttosSsddotuUo..........',
  '.....oTtttttodddDotuUo..........',
  '.....oTttttttoooottuUo..........',
  '.....ouuuuuuuuuuuuuuUo..........',
  '......ooooooooooooooo...........',
];
const CHUBA_PAL = {
  o: OUT, ...shades('SsdD', SKIN_TAN), ...shades('HhjJ', '#3a3028'), ...EYE,
  M: '#6a2a20',
  ...shades('GgkK', '#8a9a5a'),                                     // nón cối
  ...shades('TtuU', '#8a5a2b'),                                     // áo nâu
  b: '#f0dca8',                                                     // cúc áo
  R: '#f0d690', r: '#d4b070', x: '#9a7a3a', X: '#64481e',           // dây thừng
  y: '#e8c060', Y: '#9a7226', w: '#fbf8ee', n: '#3a2a2a',           // cân móc: vỏ đồng, mặt cân, kim
  ...shades('PpqQ', '#3e3834'), F: '#6a4a30', f: '#3e2a1a', z: '#22160c',
};
// cân móc: vòng xách, mặt cân tròn, móc
const SCALE = ['...o...', '..oYo..', '.oyyyo.', 'oywwwYo', 'oywnwYo', 'oYwwnYo', '.oYYYo.', '...o...', '..oYo..', '..oYoo.', '...ooYo', '....oo.'];
const COIL_F = ['..ooooo..', '.oRrRrxo.', 'oRxoooxro', 'oro...oxo', 'oRo...oxo', 'orxoooxXo', '.oxXxXXo.', '..ooooo..'];
const COIL_S = ['.ooooo.', 'oRrRrxo', 'oro.oxo', 'oRo.oXo', 'orxoxXo', '.oxXXo.', '..ooo..'];
const CHUBA = {
  name: 'CHUBA',
  down: [...sym(CHUBA_HEAD_F), ...sym(CHUBA_BODY_F)],
  up: [...sym(CHUBA_HEAD_B), ...sym(CHUBA_BODY_B)],
  left: CHUBA_SIDE,
  legsF: legsF(LEG, LEG_UP), legsS: LEGS_S,
  ovDown: [
    [14, 16, ['.SS.', 'dssd', '.DD.']],
    [8, 18, ['...oHHhhhhHHo...', '.ohhhhhjjhhhhho.', 'ojjJo..MM..oJjjo', '.oo..........oo.']],
    [15, 22, ['jj']],
    // nẹp áo + cúc
    [15, 27, ['u', 'b', 'u', 'u', 'b', 'u', 'u', 'b', 'u', 'u', 'u']],
    [8, 33, ['uuuuu', 'uTttu', 'utttu', 'uuuuu']],
    [17, 30, COIL_F],
    [1, 37, SCALE],
  ],
  ovUp: [[24, 37, mirror(SCALE)]],
  ovLeft: [[18, 29, COIL_S], [2, 18, ['ohhhho', '.ojjjo', '..oo..']], [11, 37, SCALE]],
  eyesDown: [[8, 14, ['JJJJ']], [20, 14, ['JJJJ']], [9, 15, ['!ee', 'eei']], [20, 15, ['!ee', 'eei']]],
  blinkDown: [[8, 15, ['JJJJ']], [20, 15, ['JJJJ']], [9, 15, ['sss', 'eee']], [20, 15, ['sss', 'eee']]],
  eyesLeft: [[5, 14, ['JJJ']], [6, 15, ['!e', 'ei']]],
};

// ============================================================
// Tí Sún: thằng bé tóc lởm chởm, tai vểnh, răng sún, áo sọc đỏ trắng, quần đùi, dép, túi bố đựng trứng sau lưng.
// ============================================================
const TISUN_TOP = [
  '..........o...o....o............',
  '.........oho.oHo..oho..o........',
  '......o..ohhooHhoohhooho........',
  '......ohoohhhhhhhhhhhhhho.......',
  '.....ohhhhhHHhhhhhhhhhhhooo.....',
  '.....ohhhHHHhhhhhhhhHHhhhho.....',
  '....ohhhHHhhhhhhhhhHHhhhhhjo....',
  '....ohhhhhhhhhhhhhhhhhhhhhjo....',
  '....ohhhhhhjhhhhhhjhhhhhhjjo....',
];
const TISUN_FACE = [
  '....ohhhjhhhjhhh',
  '....ohhjsjhhjsjh',
  '...oojsssSjsssss',
  '..oSojssssssssss',
  '..osdossssssssss',
  '..osdossssssssss',
  '..oddossssssssss',
  '...ooossssssssss',
  '.....odsssssssss',
  '.....odsssssssss',
  '......oddsssssss',
  '.......ooddddsss',
  '.........ooodddd',
];
const TISUN_NAPE = [
  '....ohhhhhhjhhhh',
  '....ohhhjhhhhhjh',
  '...oohhhjhhhhhjh',
  '..oSohhjhhhhhjhh',
  '..osdohhhhhhhjhh',
  '..osdohhhhhhjhhh',
  '..oddohjhhhhjhhh',
  '...oooJjjhhhjhhh',
  '.....oJjjjjjjjjj',
  '.....ooJJjjjjjjj',
  '......ooJJJJJJJJ',
  '........oodddddd',
  '.........ooodddd',
];
const TISUN_BODY = [
  '.........ooTTttt',
  '.......ooTtttttt',
  '......oTtWwwwwww',
  '.....oTtuWwwwwww',
  '.....ouuottttttt',
  '.....oSsottttttt',
  '.....osdoWwwwwww',
  '.....osdoWwwwwww',
  '.....oSsottttttt',
  '.....oddouuttttt',
  '......ooouuuuuuu',
  '........oooooooo',
];
const TISUN_SIDE = [
  ...pad(6),
  '..........o..o..o...............',
  '.........oHooHooHo.o............',
  '.......o.ohHhohhohhoo...........',
  '.......ohohhhhhhhhhhho..........',
  '......ohhhhHHhhhhhhhhhoo........',
  '.....ohhhHHHhhhhhhhhhhjo........',
  '....ohhhHHhhhhhjhhhhhhjjo.......',
  '....ohhhhhhhhhjhhhhHhhhjo.......',
  '....ojhhjhhjhhjhhhHhhhjjo.......',
  '....osjsshjshhhhhHhhhhjjo.......',
  '....ossssssshhhhjhhhhhjjo.......',
  '...osssssssssdhhjhhhhjjo........',
  '..ossssssssssdSSohhhhhjo........',
  '.osssssssssssdsdohhhhjjo........',
  '..oosssssssssdsdohhhhjo.........',
  '....osssssssssddohhhjjo.........',
  '....ossssssssssojjjjjo..........',
  '...ossssssssssdoJJJJo...........',
  '....osssssssddo.oooo............',
  '.....oddssssddo.................',
  '......oodddddo..................',
  '........oddo....................',
  '........ooTTtttoo...............',
  '.......oTTttttttTo..............',
  '.......oWwwoTTttuo..............',
  '.......oWwwoTtttuo..............',
  '.......otttouuuuuo..............',
  '.......otttoSsddoo..............',
  '.......oWwwoSsddoo..............',
  '.......oWwwoSssdoo..............',
  '.......otttooddooo..............',
  '.......ouuttooootuo.............',
  '........ouuuuuuuuo..............',
  '.........oooooooo...............',
];
const KLEG = [
  '........oPpppppq',
  '........oqqqqqQo',
  '.........oSsdo..',
  '.........osddo..',
  '........oFsFfdo.',
  '.......oSssssddo',
  '.......offffffzo',
  '........ooooooo.',
];
const KLEG_UP = [KLEG[0], KLEG[1], KLEG[2], KLEG[4], KLEG[5], KLEG[6], KLEG[7], '.'.repeat(16)];
const KLEGS_S = [
  [
    '..........oPpppppqqo............',
    '..........oqqqqqqqQo............',
    '...........oSssddo..............',
    '...........osssddo..............',
    '..........oFsFsddo..............',
    '.........oSsssssdo..............',
    '.........offfffffo..............',
    '..........ooooooo...............',
  ],
  [
    '..........oPpppppqqo............',
    '.........oPqqqqoqqQo............',
    '........oSsdo...osdo............',
    '.......oSsdo....osddo...........',
    '......oFsFo......osddo..........',
    '.....oSsssdo.....oFsdo..........',
    '.....offfffo.....offfo..........',
    '......ooooo.......ooo...........',
  ],
];
const TISUN_PAL = {
  o: OUT, ...shades('SsdD', SKIN_KID), ...shades('HhjJ', ['#5a4434', '#2e2018', '#1c120c', '#0e0806']), ...EYE,
  c: '#f2867a', m: '#7a2a20', n: '#fffbf0', r: '#e86a7a',
  ...shades('TtuU', ['#ff7a5c', '#d8402e', '#a82a1e', '#6e1a12']),   // áo đỏ
  w: '#ffffff', W: '#e2d8d2',                                       // sọc trắng
  ...shades('PpqQ', '#3a5a8a'),                                     // quần đùi
  F: '#a8743e', f: '#7a4a22', z: '#4a2a12',                         // dép
  ...shades('BbkK', ['#e6c486', '#c8a060', '#8a6a34', '#5a4220']),   // túi bố
  E: '#fff8e8', g: '#e8d4ae', G: '#c4a87c',                         // trứng
  y: '#7ccaf2', Y: '#e0f6ff',                                       // nước mắt
};
const SACK_B = [
  '.....oooo.....',
  '....okBbko....',
  '.....oKKo.....',
  '...oobBbbboo..',
  '..obBBbbbbbko.',
  '.obBbbbbkbbbko',
  '.oBbbbbbbbbbko',
  '.oBbbkbbbbbkKo',
  '.obbbbbbbbbkKo',
  '..okbbbbbbkKo.',
  '...ooooooooo..',
];
const SACK_S = ['.oooo...', 'okBbko..', '.oKKo...', 'obBbbbo.', 'oBbbbbko', 'oBbbkbko', 'oBbbbbko', 'obbkbbKo', 'obbbbkKo', '.okbbKo.', '..ooooo.'];
const TISUN_EYES = [[9, 18, ['eee', '!ee', 'eii']], [20, 18, ['eee', '!ee', 'eii']]];
const TISUN_DOWN = [...pad(6), ...TISUN_TOP, ...sym(TISUN_FACE), ...sym(TISUN_BODY)];
const TISUN = {
  name: 'TISUN',
  down: TISUN_DOWN,
  up: [...pad(6), ...TISUN_TOP, ...sym(TISUN_NAPE), ...sym(TISUN_BODY)],
  left: TISUN_SIDE,
  legsF: legsF(KLEG, KLEG_UP), legsS: KLEGS_S,
  ovDown: [
    [7, 21, ['cc']], [23, 21, ['cc']], [16, 21, ['d']],
    [13, 23, ['mnnmnm', '.mmmm.']],
    [10, 28, ['k', 'k', 'k']], [21, 28, ['k', 'k', 'k']],   // quai túi vắt vai
  ],
  ovUp: [[9, 28, SACK_B]],
  ovLeft: [[18, 28, SACK_S], [5, 21, ['cc']], [3, 23, ['nnm', 'mm.']]],
  eyesDown: TISUN_EYES,
  blinkDown: [[9, 19, ['...', 'eee']], [20, 19, ['...', 'eee']]],
  eyesLeft: [[6, 18, ['ee', '!e', 'ie']]],
};

// Tí Sún rón rén (nhìn trái): khom thấp, hai tay chìa trước ôm quả trứng, nhón chân. 2 khung.
const SNEAK_BODY = [
  '............ooTTTtttoo',
  '...ooo.....oTTttttttTo',
  '..oEEgo..ooTtttttttttuo',
  '.oEEEgooSSsoWwwwwwwwwwo',
  '.oEEggoSsssdoWwwwwwwwwo',
  '.oEgggoosddooottttttuuo',
  '..oggGo.ooo..ottttttuuo',
  '...ooo.......oWwwwwwwWo',
  '.............oWwwwwwWWo',
  '.............ouuuuuuuuo',
].map(r => r.padEnd(W, '.'));
const SNEAK_LEGS = [
  [
    '..............oPpppppqqo........',
    '.............oPpppppqqqo........',
    '..........ooSsso...oSsdo........',
    '.........oSssdo....osddo........',
    '........oFfzo......ofFzo........',
    '........oooo.......oooo.........',
  ],
  [
    '..............oPpppppqqo........',
    '.............oPpppppqqqo........',
    '...........oSsso..oSsdo.........',
    '..........oSsdo..osddo..........',
    '.........oFfzo..oFfzo...........',
    '.........oooo...oooo............',
  ],
];
function tisunSneak(f) {
  const head = TISUN_SIDE.slice(6, 28).map(r => '...' + r.slice(0, W - 3));   // đầu nghiêng thấp xuống, chúi về trước
  const rows = [...pad(10), ...head, ...SNEAK_BODY, ...SNEAK_LEGS[f]];
  check(rows, W, 'SNEAK' + f);
  return frame(rows, TISUN_PAL, [[20, 30, SACK_S], [8, 25, ['cc']], [6, 27, ['nnm', 'mm.']], [9, 22, ['ee', '!e', 'ie']]]);
}

// Tí Sún bị bắt (nhìn thẳng): hai tay giơ lên trời, mắt nhắm tịt, mếu máo, nước mắt; túi trứng rơi dưới chân.
const RAISED_ARM = [
  '.o.o..', 'oSoSo.', 'oSsSso', 'osssdo', 'osssdo', '.osdo.',
  ...[...Array(19)].map(() => '.oSsdo'),
  '.oTtuo', '.oTtuo', '.oTtuo', 'oTttuo', 'oTtttu', '.ooTtt',
];
const CAUGHT_BODY = [
  '.......ooooTTttt',
  '......oTTttttttt',
  '......oWwwwwwwww',
  '......oWwwwwwwww',
  '......ottttttttt',
  '......ottttttttt',
  '......oWwwwwwwww',
  '......oWwwwwwwww',
  '......ottttttttt',
  '......ouuttttttt',
  '.......ouuuuuuuu',
  '........oooooooo',
];
function tisunCaught() {
  const rows = [...pad(6), ...TISUN_TOP, ...sym(TISUN_FACE), ...sym(CAUGHT_BODY), ...legsF(KLEG, KLEG_UP)[0]];
  check(rows, W, 'CAUGHT');
  return frame(rows, TISUN_PAL, [
    [0, 1, RAISED_ARM], [26, 1, mirror(RAISED_ARM)],
    // mắt nhắm tịt > <, lông mày nhíu
    [9, 17, ['jj.', '..j']], [21, 17, ['.jj', 'j..']],
    [9, 19, ['e..', '.ee', 'e..']], [20, 19, ['..e', 'ee.', '..e']],
    [7, 22, ['cc']], [23, 22, ['cc']],
    [13, 22, ['.mmmm.', 'mnmnnm', 'mmrrmm', '.mmmm.']],
    [22, 22, ['Y', 'y', 'y', 'yy', '.y']],
    // túi trứng rơi, một quả lăn ra
    [0, 41, ['..oooo..', '.okBbko.', 'oBbbbbko', 'obEEgbko', 'oBEggbKo', 'obbbbkKo', '.oooooo.']],
    [26, 43, ['.ooo.', 'oEEgo', 'oEggo', 'ogGGo', '.ooo.']],
  ]);
}

const pair = fn => { const left = [fn(0), fn(1)]; return { left, right: left.map(flip) }; };
const cout = npcHD(COUT, COUT_PAL), chuba = npcHD(CHUBA, CHUBA_PAL), tisun = npcHD(TISUN, TISUN_PAL);

export const SPR7 = {
  npcCoUt: cout.frames, npcCoUtIdle: cout.idle,
  npcChuBa: chuba.frames, npcChuBaIdle: chuba.idle,
  npcTiSun: tisun.frames, npcTiSunIdle: tisun.idle,
  npcTiSunSneak: pair(tisunSneak),
  npcTiSunCaught: tisunCaught(),
};
