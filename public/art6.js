// NPC art gấp đôi (bản thử): Bà Tư (chủ chợ) và Ông Sáu (thợ rèn), khung 32x48 vẽ vào đúng ô 16x24 của bộ cũ (art2 npc).
// Cùng cấu trúc bộ cũ: frames[hướng][khung] (0 xuống, 1 trái, 2 phải, 3 lên; 3 khung đi) và idle = [đứng, thở].
// Theo mẫu art5 (characterHD): viền tối 1px, mỗi mảng màu 4 sắc độ (sáng, gốc, tối, rất tối), mắt có điểm sáng.
import { canvas, sprite, flip, paint } from './art.js';

const OUT = '#26150e';

// Hàng viết gọn kiểu "4.o2hj8d" = "....ohhjdddddddd" (số đứng trước là số lần lặp ký tự sau).
const rle = s => s.replace(/(\d+)(\D)/g, (_, n, c) => c.repeat(+n));
const R = rows => rows.map(rle);
// Nửa trái 16 cột + ảnh gương thành 32 cột.
const sym = half => R(half).map(r => r + [...r].reverse().join(''));
const bad = [];
const check = (rows, w, name) => rows.forEach((r, i) => { if (r.length !== w) bad.push(`${name} hàng ${i}: ${r.length} != ${w}`); });
const blank = n => Array(n).fill('.'.repeat(32));

// ---------- chân (chung hình, khác màu) ----------
// Chân trái nhìn xuống (cột 6..15, hàng 40..47); nửa phải là ảnh gương.
const LEG = R(['2.o6pq', '2.oP5pq', '2.oP4pqo', '2.o5qQo', '.of2F3fgo', 'oF5f2go', 'o8go', '.8o.']);
const LEG_UP = [LEG[0], ...LEG.slice(3), '..........', '..........'];
const legs = (l, r) => [...Array(8)].map((_, i) => '......' + l[i] + [...r[i]].reverse().join('') + '......');
// Nhìn trái (32 cột): đứng / bước
const SIDE_LEGS = [
  [
    '..........oPppppppqqqo..........',
    '..........oPppppppqqqo..........',
    '..........oPppppppqqqo..........',
    '..........oqqqqqqqqQQo..........',
    '........oFFffffffffggo..........',
    '.......oFffffffffffggo..........',
    '.......ogggggggggggggo..........',
    '........oooooooooooooo..........',
  ],
  [
    '..........oPppppppqqqo..........',
    '.........oPppppppoqqqqo.........',
    '........oPpppppqo.oqqqqo........',
    '.......oqqqqqqQo..oqqqQo........',
    '......oFFffffgo...offfgo........',
    '.....oFffffffgo...offfgo........',
    '.....oggggggggo...oggggo........',
    '......oooooooo.....oooo.........',
  ],
];
[[LEG, 10, 'LEG'], ...SIDE_LEGS.map((l, i) => [l, 32, 'SIDE_LEGS' + i])].forEach(([r, w, n]) => check(r, w, n));

// Mắt nhìn xuống 2x3: điểm sáng trên trái, đáy tròng nâu
const EYE = ['ee', 'we', 'ii'];

// ---------- Bà Tư: nón lá, tóc bạc búi sau gáy, áo bà ba tím có hàng nút, quần đen, dép nâu ----------
const BT_HEAD_F = [
  '4.o11h', '4.o11h',
  '4.o2hj8d',
  '4.ohjd8s',
  '4.ohjs3j5s',
  '4.ohj9s',
  '4.ojd9s',
  '4.ojd7sSd',
  '4.ojs3c2sd3s',
  '4.ods2c5s2m',
  '5.od9s',
  '6.o2d7s',
];
const BT_BODY_F = [
  '5.8oT2D',
  '4.o3T5t2Td',
  '3.o2T8tuT',
  '3.oT9tub',
  '2.oT3tU6tuT',
  '2.oT2tuU6tuT',
  '2.oT2tuU6tub',
  '2.oT2tuU6tuT',
  '2.oT2tuUt4utuT',
  '2.oT2tuUtu2tutub',
  '2.osSsdUt4utuT',
  '2.o2dsDU6tuT',
  '3.4oU6tuT',
  '4.oU8tuT',
  '4.oU10u',
  '5.11o',
];
const BT_HEAD_B = [
  '4.o11h', '4.o11h',
  '4.o5hj5h',
  '4.oj4hj5h',
  '4.oj4hj5h',
  '4.oj3hj6h',
  '4.o2j3hj5h',
  '4.o2j3hj5h',
  '5.oJ2j2hj4h',
  '6.oJ3jhj3j',
  '7.o2J6j',
  '8.4o4d',
];
// Búi tóc sau gáy (nhìn lên), vẽ đè giữa gáy
const BT_BUN_B = ['..JJJJ..', '.JhHHhJ.', 'JhHhhhjJ', 'JhhhhjjJ', 'JjhhjjJJ', '.JjjjJJ.', '..oooo..'];
const BT_BODY_B = [
  '5.7oD3d',
  '4.o3T8t',
  '3.o2T10t',
  '3.oT11t',
  '2.oT3tU8t',
  '2.oT2tuU8t',
  '2.oT2tuU8t',
  '2.oT2tuU8t',
  '2.oT2tuU8t',
  '2.oT2tuU8t',
  '2.osSsdU8t',
  '2.o2dsDU8t',
  '3.4oU8t',
  '4.oU10t',
  '4.oU10u',
  '5.11o',
];
// Nhìn trái: mặt bên trái, tóc ra sau, búi tóc sau gáy, tay áo che thân
const BT_SIDE = [
  '....ohhhhhhhhhhhhhhhhhhhhho.....',
  '....ohhhhhhhhhhhhhhhhhhhhho.....',
  '....oddddddddddhhhhhhhhhhjjo....',
  '....odsssssssssdhhhhhhhhhjjo....',
  '....osjjjssssssdhhhhhjhhhjjo....',
  '....oseesssssssdShhhhjhhhjjo....',
  '....oswesssssssdSshhhjhhhjjo....',
  '...ossiisssssssdsdhhhhhhjjo.....',
  '....osssccsssssddDhhhhhhjjo.....',
  '....omssccssssssdjhhhhhjjo......',
  '.....odssssssssdDjjhhhjjo.......',
  '......oodddsdDDojjjJo...........',
  // thân
  '........oooTTttttttuoooo........',
  '.......oTTtttttttttttuuo........',
  '.......oTttuoTTTTttuUuuo........',
  '.......oTttuoTTTtttuUuuo........',
  '.......oTttuoTTTtttuUuuo........',
  '.......oTttuoTTTtttuUuuo........',
  '.......oTttuoTTTtttuUuuo........',
  '.......oTttuoTTTtttuUuuo........',
  '.......oTttuoTTTtttuUuuo........',
  '.......oTttuoTTTTTTUUuuo........',
  '.......oTttuoSsssdDouuuo........',
  '.......oTttuuoddDDouuuuo........',
  '.......oTtttuuoooouuuuuo........',
  '.......oTttttttttttttuuo........',
  '.......oUuuuuuuuuuuuuuUo........',
  '........oooooooooooooooo........',
];
// Búi tóc sau gáy (nhìn trái)
const BT_BUN_S = ['..JJJ..', '.JhHhJ.', 'JhHhhjJ', 'Jhhhjjo', 'Jjhjjjo', '.oJJJo.', '..ooo..'];

// ---------- Ông Sáu: khăn đỏ buộc đầu, râu tóc bạc, áo xanh xắn tay, tạp dề da ----------
const OS_HEAD_F = [
  '16.', '16.',
  '10.6o',
  '8.2o6h',
  '7.oh2H5h',
  '6.oh2H6h',
  '5.ohH8h',
  '5.oj9h',
  '4.ok10K',
  '4.ox10k',
  '4.o2x9d',
  '4.o2x9s',
  '4.ods2B2b5s',
  '4.odsb3n5s',
  '4.od10s',
  '4.od10s',
  '4.od8sSs',
  '4.odS7sSd',
  '4.onb4sbB3b',
  '4.on2b2s2b2Bbn',
  '4.on7bn2m',
  '4.on2bB5b2n',
  '5.on2bB6b',
  '6.on2b2B4b',
];
const OS_BODY_F = [
  '3.7on2bB2b',
  '2.oT4tuTon4b',
  '2.oT3tuUoLon3b',
  '2.oT3tuUoLaon2b',
  '2.oT3tuUoL2aonb',
  '2.oT3tuUoL3a2o',
  '2.o4TuUoL5a',
  '2.oS3sdDoL5a',
  '2.oS3sdDoLa4A',
  '2.oS3sdDoLaA3a',
  '2.oS3sdDoLaA3a',
  '2.osS2sdDoLa4A',
  '3.o4DoL6a',
  '3.5oL7a',
  '6.oL8a',
  '6.o9A',
];
const OS_HEAD_B = [
  '16.', '16.',
  '10.6o',
  '8.2o6h',
  '7.oh2H5h',
  '6.oh2H6h',
  '5.ohH8h',
  '5.oj9h',
  '4.ok10K',
  '4.ox10k',
  '4.ojh2H7h',
  '4.oj2H8h',
  '4.ojH3hj5h',
  '4.oj4hj5h',
  '4.oj3hj6h',
  '4.o2j3hj5h',
  '4.o2j3hj5h',
  '4.oJj4hj2hjh',
  '5.oJ2j3hj3j',
  '5.oJ3j2hj3j',
  '6.o2J7j',
  '7.o2J3jJ2j',
  '8.3oD4d',
  '7.4oD4d',
];
const OS_BODY_B = [
  '3.5ou7t',
  '2.oT3tuTtaA4t',
  '2.oT3tuUtaA4t',
  '2.oT3tuUtaA4t',
  '2.oT3tuUtaA4t',
  '2.oT3tuUtaA4t',
  '2.o4TuU7a',
  '2.oS3sdD7A',
  '2.oS3sdDu6t',
  '2.oS3sdDu6t',
  '2.oS3sdDu6t',
  '2.osS2sdDu6t',
  '3.o4Du7t',
  '3.5ou7t',
  '6.oU8u',
  '6.o9Q',
];
const OS_SIDE = R([
  '32.', '32.',
  '10.12o10.',
  '8.2o12h2o8.',
  '7.o2h2H11hjo7.',
  '6.oh2H13h2jo6.',
  '5.ohH15h2jo6.',
  '5.o17h2jo6.',
  '4.o20Ko6.',
  '4.o20ko6.',
  '....oddddddddddhhhhhhhhhjo......',
  '....osssssssssdhhhhhhhhhjo......',
  '....osBBbbssssnhhhhhhhhhjo......',
  '....osbnnnssssnhddhhhhhhjo......',
  '....oseessssssnhSsdhhhhhjo......',
  '....oswessssssnhSsdhhhhhjo......',
  '..osssiissssssnhsdhhhhhhjo......',
  '...oddssssssssnhdDhhhhhjo.......',
  '...obbBbbBbnssbnnhhhhhjo........',
  '...obbbbbbbbbbbbnhhhhjjo........',
  '....ombbbbbbbbbbndDjjjo.........',
  '.....obbbbbbbbbndDJJo...........',
  '.....obbBbbbbbbnddDo............',
  '......obbbbbbbnddDDo............',
  // thân
  '7.o5bno5t6o6.',
  '7.on4bno6tU2uo7.',
  '7.o2n3bnoT5tU2uo7.',
  '7.oL2n2bnoT5tU2uo7.',
  '7.oL2a3noT5tU2uo7.',
  '7.oL5aoT5tU2uo7.',
  '7.oL5ao5TuU2uo7.',
  '7.oL5aoS3sdDo2uo7.',
  '7.oL5aoS3sdDo2uo7.',
  '7.oL5aoS3sdDo2uo7.',
  '7.oL5aosS2sdDo2uo7.',
  '7.oL5ao2d4Do2uo7.',
  '7.oL5a8o2uo7.',
  '7.oL13a2Ao7.',
  '7.oL13a2Ao7.',
  '8.o14Ao8.',
]);
// Nút khăn sau đầu: nhìn lên (giữa gáy) và nhìn trái (sau gáy, đuôi khăn bay ra sau)
const KNOT_B = ['.ooo..ooo.', 'oKkkooKkxo', 'okxkKkkxxo', '.ooxkkxoo.', '..okxokxo.', '..okoo.oxo', '.okxo..oxo', '.ooo....o.'];
const KNOT_S = ['.ooo....', 'oKkxoo..', 'okxxKkoo', 'oxoxkkxo', '.o.oxxXo', '....oxo.', '.....o..'];

[[BT_HEAD_F, BT_BODY_F, BT_HEAD_B, BT_BODY_B, OS_HEAD_F, OS_BODY_F, OS_HEAD_B, OS_BODY_B]].flat().forEach((h, i) => check(R(h), 16, 'nửa ' + i));
check(BT_SIDE, 32, 'BT_SIDE'); check(OS_SIDE, 32, 'OS_SIDE');
if (bad.length) throw new Error(bad.join('\n'));

// Nón lá 32x14: chóp nhọn, vòng nan, vành tối, sáng bên trái
const STRAW = ['#fff6cc', '#f2dc98', '#d4b468', '#9a7a32'];
function nonLa() {
  const hw = y => (y <= 11 ? 1.4 + y * 1.2 : y === 12 ? 16 : y === 13 ? 15 : -1);
  const inside = (x, y) => y >= 0 && y < 14 && Math.abs(x + 0.5 - 16) <= hw(y);
  return paint(32, 14, (x, y) => {
    if (!inside(x, y)) return null;
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) return OUT;
    const dx = (x + 0.5 - 16) / Math.max(1, hw(y));
    if (y === 12) return dx < -0.2 ? STRAW[0] : dx > 0.55 ? STRAW[2] : STRAW[1];
    if (y === 4 || y === 8) return dx > 0.3 ? STRAW[3] : STRAW[2];   // vòng nan
    if (y === 11) return dx > 0.3 ? STRAW[3] : STRAW[2];
    if (dx < -0.45) return STRAW[0];
    if (dx > 0.5) return STRAW[2];
    return (x + y) % 7 === 0 ? STRAW[2] : STRAW[1];   // vân nan
  });
}

const PAL_BT = {
  o: OUT, S: '#ffe2c6', s: '#ebb994', d: '#cc8e6a', D: '#9a5e44',
  H: '#f6f3ee', h: '#cfcac4', j: '#a29c98', J: '#76706e',
  T: '#b486b2', t: '#8a5a8a', u: '#6a4270', U: '#4a2c52',
  P: '#4a4456', p: '#2f2a36', q: '#221e28', Q: '#16131a',
  F: '#9a6a3a', f: '#7a4a22', g: '#4e2e14',
  b: '#f3ead2', e: '#2a1a10', w: '#ffffff', i: '#7a4e36', c: '#ee9a8a', m: '#a0504a',
};
const PAL_OS = {
  o: OUT, S: '#f2c090', s: '#d89a68', d: '#b0744a', D: '#7e4e30',
  H: '#6e676c', h: '#4a4448', j: '#363036', J: '#221e22',
  K: '#ea6a50', k: '#c0402e', x: '#8a2a1e', X: '#5e1a12',
  B: '#f8f6f1', b: '#e2ded6', n: '#b4aea4', N: '#8a847a',
  T: '#6f92b4', t: '#4a6a8a', u: '#344c66', U: '#22344a',
  L: '#b8824a', a: '#8a5a2b', A: '#6b4020', Q: '#1c1816',
  P: '#56504a', p: '#3a3430', q: '#2a2522',
  F: '#4a3424', f: '#2a1a10', g: '#160c06',
  e: '#1e1424', w: '#ffffff', i: '#6a4632', m: '#8a4a3a',
};

function npcHD(cfg) {
  const { pal, headF, bodyF, headB, bodyB, side, eye, after } = cfg;
  const build = (rows, dir) => {
    const out = canvas(32, 48), x = out.getContext('2d');
    x.drawImage(sprite(rows, pal), 0, 0);
    if (dir === 0) for (const ex of eye) x.drawImage(sprite(EYE, pal), ex[0], ex[1]);
    after?.(x, dir);
    return out;
  };
  const front = (head, body, k) => [...blank(48 - 8 - head.length - body.length), ...sym(head), ...sym(body),
    ...legs(k === 2 ? LEG_UP : LEG, k === 1 ? LEG_UP : LEG)];
  const down = [0, 1, 2].map(k => build(front(headF, bodyF, k), 0));
  const up = [0, 1, 2].map(k => build(front(headB, bodyB, k), 3));
  const sides = SIDE_LEGS.map(l => build([...blank(40 - side.length), ...side, ...l], 1));
  const left = [sides[0], sides[1], sides[0]];
  const frames = [down, left, left.map(flip), up];
  // Thở: thân trên hạ 2 điểm ảnh (1 điểm của bộ cũ), chân giữ nguyên
  const breathe = canvas(32, 48), bx = breathe.getContext('2d');
  bx.drawImage(down[0], 0, 0, 32, 40, 0, 2, 32, 40);
  bx.clearRect(0, 40, 32, 8);
  bx.drawImage(down[0], 0, 40, 32, 8, 0, 40, 32, 8);
  return { frames, idle: [down[0], breathe] };
}

let made = null;
function make() {
  if (made) return made;
  const hat = nonLa(), bun = sprite(BT_BUN_S, PAL_BT), bunB = sprite(BT_BUN_B, PAL_BT);
  const baTu = npcHD({
    pal: PAL_BT, headF: BT_HEAD_F, bodyF: BT_BODY_F, headB: BT_HEAD_B, bodyB: BT_BODY_B, side: BT_SIDE,
    eye: [[8, 17], [22, 17]],
    after: (x, dir) => {
      if (dir === 1) x.drawImage(bun, 21, 17);
      if (dir === 3) x.drawImage(bunB, 12, 16);
      x.drawImage(hat, 0, 0);
    },
  });
  const kb = sprite(KNOT_B, PAL_OS), ks = sprite(KNOT_S, PAL_OS);
  const ongSau = npcHD({
    pal: PAL_OS, headF: OS_HEAD_F, bodyF: OS_BODY_F, headB: OS_HEAD_B, bodyB: OS_BODY_B, side: OS_SIDE,
    eye: [[8, 14], [22, 14]],
    after: (x, dir) => { if (dir === 3) x.drawImage(kb, 11, 7); if (dir === 1) x.drawImage(ks, 23, 7); },
  });
  return (made = { baTu, ongSau });
}

export const SPR6 = typeof document === 'undefined' ? {} : (() => {
  const { baTu, ongSau } = make();
  return {
    npcBaTu: baTu.frames, npcBaTuIdle: baTu.idle,
    npcOngSau: ongSau.frames, npcOngSauIdle: ongSau.idle,
  };
})();
