// Bộ sprite gấp đôi (kiểu A) cho gia súc, kẻ săn mồi / thú phá và đồ đi kèm.
// Mỗi sprite đúng 2w×2h của sprite cũ cùng khóa, chân / đáy chạm hàng dưới cùng như cũ.
// Phong cách theo art5.characterHD: viền tối 1px (viền nhạt hơn ở mép hứng sáng trên-trái), 4 sắc độ mỗi mảng màu,
// điểm sáng ở mắt, mặt bóng; kết cấu nhẹ (lông, len, vân gỗ). Con vật quay mặt sang TRÁI, 'right' là bản lật.
//
// Thay cho khóa nào (SPR9_FROM ghi nguồn của từng khóa cấp trên):
//   SPR3.animal.{heo,bo,boDuc,cuu,cuuXoan}, SPR3.sleep / sleepBy / sick / sickBy (cùng các loài đó),
//   SPR3.heoMud, SPR3.fx.{dirt,flies}, SPR3.rat / ratEat / ratFlee / ratTrophy, SPR3.hawk / hawkDive / hawkCarry / hawkShadow,
//   SPR3.weasel / weaselCatch, SPR3.civet / civetCatch / civetFlee, SPR3.hurtPatch, SPR3.ratTrap / ratTrapShut / ratTrapFull,
//   SPR3.grave / graveFlower / angel, SPR.crow (art.js).
// muddyHD(img, level): bản 2× của art3.muddy (bùn bám đúng dáng con vật), dùng cho sprite 2×.

import { canvas as rawCanvas, flip, hash } from './art.js';

const canvas = (w, h) => { const c = rawCanvas(w, h); c.getContext('2d', { willReadFrequently: true }); return c; };
const OUT = '#2e1a0c';
const EYE = '#1a0e08';

// ---------- tiện ích vẽ ----------

function draw(w, h, fn) { const c = canvas(w, h); fn(c.getContext('2d'), c); return c; }
function R(x, col, px, py, w = 1, h = 1) { x.fillStyle = col; x.fillRect(px, py, w, h); }
function dots(x, col, list) { for (const [px, py] of list) R(x, col, px, py); }
function line(x, col, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) R(x, col, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n));
}
function ell(x, col, cx, cy, rx, ry) {
  x.fillStyle = col;
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    const t = 1 - (dy * dy) / ((ry + 0.5) ** 2);
    if (t <= 0) continue;
    const hw = Math.round(rx * Math.sqrt(t) + 0.25);
    x.fillRect(Math.round(cx - hw), Math.round(cy + dy), hw * 2 + 1, 1);
  }
}
function mix(a, b, t) {
  const A = parseInt(a.slice(1, 7), 16), B = parseInt(b.slice(1, 7), 16);
  const ch = s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}
const rgba = col => {
  const n = parseInt(col.slice(1, 7), 16);
  return [n >> 16, (n >> 8) & 255, n & 255, col.length > 7 ? parseInt(col.slice(7, 9), 16) : 255];
};
function pix(w, h, fn) {
  const c = canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h);
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const col = fn(px, py);
    if (col) img.data.set(rgba(col), (py * w + px) * 4);
  }
  x.putImageData(img, 0, 0);
  return c;
}
// Viền chọn lọc: mép trên / trái (hứng sáng) lấy sắc tối của chính mảng màu kề bên, mép dưới / phải viền tối hẳn.
function outline(c, col = OUT) {
  const w = c.width, h = c.height, x = c.getContext('2d'), img = x.getImageData(0, 0, w, h), d = img.data;
  const solid = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 200;
  const at = (i, j) => { const o = (j * w + i) * 4; return '#' + ((d[o] << 16) | (d[o + 1] << 8) | d[o + 2]).toString(16).padStart(6, '0'); };
  const marks = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (solid(i, j)) continue;
    const L = solid(i - 1, j), Rr = solid(i + 1, j), U = solid(i, j - 1), D = solid(i, j + 1);
    if (!(L || Rr || U || D)) continue;
    const lit = !L && !U && (D || Rr) && j < h - 2;
    marks.push([i, j, lit ? mix(at(D ? i : i + 1, D ? j + 1 : j), col, 0.74) : col]);
  }
  for (const [i, j, k] of marks) R(x, k, i, j);
  return c;
}
function spr(rows, pal) {
  const W = rows[0].length;
  rows.forEach((r, i) => { if (r.length !== W) throw new Error(`art9: hàng ${i} dài ${r.length} ≠ ${W}: "${r}"`); });
  return pix(W, rows.length, (px, py) => {
    const v = pal[rows[py][px]];
    return typeof v === 'function' ? v(px, py) : v || null;
  });
}
const fade = (ramp, t, to = '#cfc9c2') => ramp.map(c => mix(c, to, t));
const pair = fn => { const left = [fn(0), fn(1)]; return { left, right: left.map(flip) }; };
// Dán ảnh con lên ảnh mẹ chỉ ở chỗ đã có màu (vẽ chi tiết không tràn ra nền).
function atop(x, fn) { x.save(); x.globalCompositeOperation = 'source-atop'; fn(); x.restore(); }

// ---------- máy vẽ hình khối 2× ----------
// E / B nhận toạ độ đã ở lưới 2×. sep: đường tối tách phần đè lên phần trước. gloss: ngưỡng điểm bóng.
const E = (cx, cy, rx, ry, r, o = {}) => ({ t: 'e', cx, cy, rx, ry, r, ...o });
const B = (x, y, w, h, r, o = {}) => ({ t: 'b', x, y, w, h, r, ...o });
// Đổi số đo lưới cũ sang lưới 2×: tâm ×2, bán kính ×2 + 1 (bù phần viền cũ dày 2 điểm 2×).
const e2 = (cx, cy, rx, ry, r, o) => E(cx * 2, cy * 2, rx * 2 + 1, ry * 2 + 1, r, o);
const b2 = (x, y, w, h, r, o) => B(x * 2, y * 2, w * 2, h * 2, r, o);

// Đa giác (tai nhọn, cánh): tô theo tâm điểm ảnh, đổ bóng như elip bao quanh nó.
const G = (pts, r, o = {}) => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { t: 'p', pts, r, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: Math.max(1, (x1 - x0) / 2), ry: Math.max(1, (y1 - y0) / 2), ...o };
};
function inPoly(pts, X, Y) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

function fig(w, h, parts) {
  parts = parts.filter(Boolean);
  const ins = (p, X, Y) => p.t === 'e'
    ? ((X - p.cx) / p.rx) ** 2 + ((Y - p.cy) / p.ry) ** 2 <= 1
    : p.t === 'p' ? inPoly(p.pts, X, Y)
      : X >= p.x && X < p.x + p.w && Y >= p.y && Y < p.y + p.h;
  const own = (px, py) => {
    if (px < 0 || py < 0 || px >= w || py >= h) return -1;
    let b = -1;
    for (let i = 0; i < parts.length; i++) if (ins(parts[i], px + 0.5, py + 0.5)) b = i;
    return b;
  };
  const c = pix(w, h, (px, py) => {
    const i = own(px, py);
    if (i < 0) return null;
    const p = parts[i];
    if (p.sep) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = own(px + dx, py + dy);
      if (j >= 0 && j < i && !parts[j].ghost && (p.sepUp || dy >= 0 || dx !== 0)) return typeof p.sep === 'string' ? p.sep : mix(p.r[0], OUT, 0.35);
    }
    if (p.col) return p.col;
    let v;
    if (p.t !== 'b') {
      const dx = (px + 0.5 - p.cx) / p.rx, dy = (py + 0.5 - p.cy) / p.ry;
      v = 0.3 - dx * 0.5 - dy * 0.78 - (dx * dx + dy * dy) * 0.32;
    } else {
      const fx = p.w === 1 ? 0.5 : (px - p.x) / (p.w - 1);
      v = fx < 0.3 ? 0.45 : fx > 0.7 ? -0.45 : 0.05;
      if (p.w <= 2) v = px === p.x ? 0.45 : 0.05;
    }
    v += (p.lift || 0) + (hash(px * 3 + 7, py * 5 + 11) - 0.5) * (p.noise ?? 0);
    let k = v > 0.6 ? 3 : v > 0.12 ? 2 : v > -0.42 ? 1 : 0;
    if (p.max != null) k = Math.min(k, p.max);
    if (p.min != null) k = Math.max(k, p.min);
    let col = p.r[k];
    if (p.gloss != null && v > p.gloss && k === 3) col = mix(p.r[3], '#ffffff', 0.45);
    return p.pat ? (p.pat(px, py, k, col, p, v) ?? col) : col;
  });
  return outline(c);
}

// Bốn chân thú nhìn ngang (số đo lưới cũ): chân xa tối hơn, chân gần sáng; 2 khung bước kéo.
// Chân 2× rộng 2w+1, dài tới hàng sát đáy để viền nằm đúng hàng cuối.
function quadLegs(o) {
  const { fx, bx, top, len, w = 2, r, hoof, frame, slow = false, far = 1 } = o;
  const a = frame ? 1 : -1;
  const legs = [[fx + far - a, 1], [bx + far + a, 1], [fx + a, 0], [bx - a, 0]];
  if (slow && frame) { legs[0][0] = fx + far; legs[3][0] = bx; }
  const T = top * 2, Hh = len * 2 + 1, bot = T + Hh;
  return legs.map(([lx, isFar]) => B(lx * 2, T, w * 2 + 1, Hh, r, {
    max: isFar ? 1 : undefined, min: isFar ? undefined : 1, sep: isFar ? false : true, noise: 0,
    pat: hoof ? (px, py) => (py >= bot - 2 ? (py === bot - 2 && px === lx * 2 + 1 && !isFar ? hoof[2] : isFar ? hoof[0] : hoof[1]) : undefined) : undefined,
  }));
}

// Mắt 2×2 có điểm sáng góc trên trái (nhìn sang trái).
function eye(x, px, py, big = true) {
  if (big) { R(x, EYE, px, py, 2, 2); R(x, '#ffffff', px, py); }
  else { R(x, EYE, px, py, 1, 2); R(x, '#fff6e8', px, py); }
}
// Mắt nhắm (cung cong xuống) dài n điểm
function lid(x, col, px, py, n = 3) { R(x, col, px, py); R(x, col, px + 1, py + 1, Math.max(1, n - 2), 1); R(x, col, px + n - 1, py); }
// Giọt mồ hôi lạnh (dáng bệnh)
function sweat(x, px, py) {
  dots(x, '#3a78b8', [[px + 1, py], [px, py + 1], [px + 2, py + 1], [px, py + 2], [px + 2, py + 2], [px + 1, py + 3]]);
  R(x, '#9ad8ff', px + 1, py + 1, 1, 2); R(x, '#e8f8ff', px + 1, py + 1);
}

// ---------- bảng màu (giữ đúng bảng gốc art3) ----------

const P = {
  pig: ['#a84a64', '#d8728c', '#f4a4b8', '#ffd2de'],
  snout: ['#a03e58', '#cc6480', '#ea8ca4', '#ffb8c8'],
  cowW: ['#948c8e', '#cbc4c0', '#eee8e0', '#ffffff'],
  cowK: ['#16161c', '#24242c', '#363642', '#4e4e5a'],
  cowB: ['#3a1a0c', '#5a2c14', '#7c4220', '#9c5c30'],
  muzzle: ['#a85a64', '#d27e88', '#eea4a8', '#ffcccc'],
  horn: ['#7a6a4a', '#b8a67c', '#e2d4ac', '#fff4d8'],
  hoof: ['#2a1c14', '#4a3424', '#6a5040'],
  wool: ['#a4977e', '#cdc0a4', '#ebe1c8', '#fffaec'],
  woolS: ['#b0a48c', '#d4c9b0', '#efe7d2', '#fffbf0'],
  woolC: ['#b49a6a', '#dcc28c', '#f4e2b0', '#fff8dc'],
  face: ['#1c1616', '#302626', '#483a38', '#665450'],
  cream: ['#b49676', '#dcc29e', '#f4e2c4', '#fff8ea'],
  chick: ['#c08410', '#e6b024', '#ffd84a', '#fff29c'],
  rat: ['#3a3438', '#5c5458', '#80767a', '#a89ea0'],
  ratPink: ['#a85a6a', '#c87a8a', '#e898a8', '#ffc8d4'],
  hawk: ['#3a2010', '#5e3618', '#8a5426', '#b07a40'],
  hawkW: ['#b8a888', '#d8c8a8', '#f0e6d0', '#fffaf0'],
  talon: ['#a86a0c', '#d89a1c', '#f2c040', '#ffe07a'],
  weasel: ['#4a2a10', '#7a4a1e', '#a46a30', '#c88c4a'],
  civet: ['#463c30', '#6c5f4c', '#94856c', '#bcac90'],
  civetDark: ['#100e0a', '#221d16', '#342c22', '#4a4032'],
  pink: '#f08a9e',
};

// ---------- HEO ---------- non 28x20 · nhỡ 36x24 · trưởng thành 46x30 · già 46x30
// Da hồng bóng, lông tơ lưa thưa, nếp nhăn cổ; mõm có đĩa mũi và hai lỗ mũi; đuôi xoắn tít.
// già: hồng nhạt ngả xám, lông bạc, nếp nhăn mắt, bụng xệ, đầu cúi.

const PIG = {
  non: { w: 14, h: 10, body: [8, 5, 4.5, 2.6], head: [4.6, 4.9, 3, 2.8], ear: [5.6, 2.3, 1.3, 1.1], snout: [1.9, 5.6, 1, 1.3], legs: { fx: 4, bx: 9, top: 7, len: 2, w: 1 }, eye: [3, 4], tail: [12, 3] },
  nho: { w: 18, h: 12, body: [10.2, 6, 6, 3.2], head: [5.2, 6.3, 3.2, 3], ear: [6.2, 3.1, 1.6, 1.3], snout: [2, 7.1, 1.1, 1.5], legs: { fx: 5, bx: 13, top: 9, len: 2 }, eye: [4, 5], tail: [16, 4] },
  truong: { w: 23, h: 15, body: [12.6, 7.4, 7.8, 4.3], head: [6, 7.7, 3.7, 3.5], ear: [7, 4.1, 1.9, 1.5], snout: [2.2, 8.8, 1.3, 1.7], legs: { fx: 6, bx: 16, top: 11, len: 3 }, eye: [4, 7], tail: [20, 5] },
};
function pigTail(x, PK, tx, ty) {
  // xoắn ốc nhỏ 5x5 dựng sau mông
  const rows = ['.ooo.', 'oLpLo', 'opoPo', 'o.oPo', '..oo.'];
  rows.forEach((r, j) => [...r].forEach((ch, i) => {
    const col = ch === 'o' ? OUT : ch === 'p' ? PK[1] : ch === 'P' ? PK[0] : ch === 'L' ? PK[2] : null;
    if (col) R(x, col, tx + i, ty + j);
  }));
}
// Tai gần cụp về trước, vẽ tay theo giai đoạn: mặt trên sáng, mép dưới sẫm, lòng tai hồng đậm.
const PIG_EAR = {
  non: ['...oo.', '.ooLlo', 'oLlldo', '.oooo.'],
  nho: ['.....oo.', '...ooLlo', '.ooLlldo', 'oLlldDDo', '.oooooo.'],
  truong: ['.......oo.', '.....ooLlo', '...ooLLllo', '.ooLLllldo', 'oLLlllddDo', 'oddddDDDo.', '.oooooooo.'],
  gia: ['........o.', '......oLlo', '....ooLllo', '..ooLllldo', '.oLLllddDo', 'oLlldDDDo.', 'odDDDDoo..', '.oooo.....'],
};
function pigEar(x, PK, stage, cx, cy) {
  const rows = PIG_EAR[stage], w = rows[0].length, h = rows.length;
  const pal = { o: mix(PK[0], OUT, 0.55), L: PK[3], l: PK[2], d: PK[1], D: mix(PK[0], '#c04060', 0.3) };
  x.drawImage(spr(rows, pal), Math.round(cx - w / 2), Math.round(cy - h / 2));
}
function pig(stage, frame, pose = 'stand') {
  const old = stage === 'gia', sit = pose !== 'stand', sick = pose === 'sick', sleep = pose === 'sleep';
  const PK = old ? fade(P.pig, 0.3, '#d8c4c0') : P.pig, SN = old ? fade(P.snout, 0.3, '#d0b8b4') : P.snout;
  const s = PIG[old ? 'truong' : stage], W = s.w * 2, H = s.h * 2;
  const oy = sit ? s.legs.len : 0, hy = (old ? 1 : 0) + (sick ? 1 : 0);
  const [bx, by, brx, bry] = s.body, [hx, hyy, hrx, hry] = s.head, [ex, ey, erx, ery] = s.ear, [nx, ny, nrx, nry] = s.snout;
  const legs = pose === 'stand' ? quadLegs({ ...s.legs, r: PK, hoof: ['#6a2a3c', '#8a3c50', '#b86478'], frame, slow: old }) : [];
  const flop = sick ? [b2(s.legs.fx - 2, s.h - 3, 3, 1, PK, { sep: true, min: 1 }), b2(s.legs.bx + 1, s.h - 3, 3, 1, PK, { sep: true, min: 1 })] : [];
  const HX = hx * 2, HY = (hyy + oy + hy) * 2;
  // lông tơ: vệt ngắn sáng trên lưng (theo lưới đều, không lấm tấm); già thì lông bạc thưa
  const skin = (px, py, k) => {
    if (old && k >= 1 && (px * 3 + py * 5) % 13 === 0 && (py & 1)) return mix(PK[k], '#ffffff', 0.28);   // lông bạc thưa
    return undefined;
  };
  const c = fig(W, H, [
    ...legs,
    E((ex + 1.6) * 2, (ey + oy + hy) * 2 - 1, erx * 1.3, ery * 1.5, PK, { max: 1, noise: 0 }),     // tai xa
    e2(bx, by + oy + (old ? 0.4 : 0), brx, bry + (old ? 0.3 : 0), PK, { pat: skin, gloss: 0.8 }),
    ...flop,
    e2(hx, hyy + oy + hy, hrx, hry, PK, { sep: PK[1], gloss: 0.9 }),
    e2(nx, ny + oy + hy, nrx, nry, SN, { sep: true, gloss: 0.7 }),
  ]);
  const x = c.getContext('2d');
  // nếp nhăn cổ sau đầu (già nhăn nhiều hơn)
  const nk = Math.round(HX + hrx * 2 - 1), nkY = Math.round(HY + hry * 0.6);
  atop(x, () => { for (let i = 0; i < (old ? 3 : stage === 'non' ? 1 : 2); i++) line(x, mix(PK[1], PK[2], 0.4), nk - i, nkY + i * 2, nk - i + 2, nkY + i * 2); });
  pigEar(x, PK, stage, (ex - 0.4) * 2 - 1, (ey + oy + hy + (old ? 0.6 : 0)) * 2 + 0.5);
  // đuôi xoắn
  const [tx, ty] = s.tail;
  pigTail(x, PK, tx * 2 - 1, (ty + oy) * 2 - 2);
  // đĩa mũi phía trước + hai lỗ mũi
  const sx = Math.round(nx * 2 - nrx * 2 - 1) + 1, sy = Math.round((ny + oy + hy) * 2);
  atop(x, () => {
    const dh = Math.max(4, Math.round(nry * 4) - 1);
    R(x, SN[3], sx - 1, sy - (dh >> 1), 1, dh); R(x, SN[2], sx, sy - (dh >> 1), 1, dh);
    R(x, '#5a1a2e', sx, sy - 2, 1, 2); R(x, '#5a1a2e', sx, sy + 1, 1, 2);
    R(x, SN[0], sx + 1, sy - 2, 1, 2); R(x, SN[0], sx + 1, sy + 1, 1, 2);
    R(x, SN[1], sx + 2, sy - (dh >> 1), 1, dh);
  });
  // mắt
  const E0 = s.eye[0] * 2, E1 = (s.eye[1] + oy + hy) * 2;
  if (sleep) lid(x, '#7a3448', E0 - 1, E1, 4);
  else if (sick) {
    R(x, EYE, E0, E1 + 1, 2, 1); R(x, '#7a3448', E0 - 1, E1 - 1); R(x, '#7a3448', E0 + 2, E1 - 1); R(x, '#7a3448', E0, E1, 2, 1);
    sweat(x, W - 14, 2);
  } else {
    const ew3 = stage === 'non' ? 2 : 3;
    R(x, EYE, E0, E1 - 1, ew3, 3); R(x, '#ffffff', E0, E1 - 1); R(x, '#4a2a1c', E0 + ew3 - 1, E1 + 1);   // mắt có điểm sáng
    if (old) { R(x, PK[0], E0 - 1, E1 - 2, ew3 + 2, 1); R(x, EYE, E0, E1 - 1, ew3, 1); R(x, PK[1], E0, E1 + 2, ew3, 1); }   // mí sụp, bọng mắt
  }
  // má hồng
  R(x, P.pink, E0 + (stage === 'non' ? 2 : 4), E1 + 4, 3, 1); R(x, mix(P.pink, '#ffffff', 0.4), E0 + (stage === 'non' ? 2 : 4), E1 + 4);
  return c;
}

// ---------- BÒ ---------- non 34x26 · nhỡ 42x30 · trưởng thành 52x34 · già 52x34
// Lang trắng đen (bò đực lang nâu, sừng to có ngấn, vai u, khoen mũi vàng). Mõm hồng có lỗ mũi, mắt có điểm sáng,
// lòng tai hồng, đuôi có chùm, bò cái lớn có bầu sữa hai núm. già: lông xỉn, đốm nhạt, đầu cúi, mắt có mí.

const COW = {
  non: { w: 17, h: 13, body: [10.5, 5.6, 4.6, 2.9], head: [4.5, 4.6, 2.8, 2.9], mz: [2.6, 6.9, 1.7, 1.3], ear: [7.3, 3.2, 1.4, 0.8], legs: { fx: 6, bx: 12, top: 8, len: 4 }, eye: [[3, 4], [5, 4]], spots: [[9, 4, 1.8], [13, 6.5, 1.5]], tail: [15, 4, 6] },
  nho: { w: 21, h: 15, body: [12.5, 6.4, 6.6, 3.4], head: [5, 5, 3, 3.1], mz: [3, 7.6, 1.9, 1.4], ear: [8.1, 3.4, 1.6, 0.8], legs: { fx: 7, bx: 15, top: 9, len: 5 }, eye: [[3, 4], [6, 4]], spots: [[11, 4.5, 2.2], [16, 7.5, 2], [13, 9, 1.4]], tail: [19, 4, 8] },
  truong: { w: 26, h: 17, body: [15.4, 7.6, 8.8, 4.2], head: [5.4, 5.6, 3.3, 3.4], mz: [3.2, 8.6, 2.2, 1.6], ear: [9, 3.8, 1.8, 0.9], legs: { fx: 8, bx: 19, top: 11, len: 5 }, eye: [[4, 5], [7, 5]], spots: [[13, 5.2, 2.8], [20, 8.4, 2.6], [16, 10.4, 1.6], [9.5, 8.5, 1.5]], tail: [24, 5, 10] },
};
// Đốm lang mép răng cưa theo khối 2x2 (không lấm tấm), lưới 2×.
function spotPat(spots, K, oy, extra) {
  return (px, py, k) => {
    for (const [sx, sy, r] of spots) {
      const d = Math.hypot(px + 0.5 - sx * 2, (py + 0.5 - (sy + oy) * 2) * 1.2);
      if (d < r * 2 + 0.6 + (hash(px >> 1, (py >> 1) + 31) - 0.5) * 1.8) return K[k];
    }
    return extra ? extra(px, py, k) : undefined;
  };
}
function cow(stage, frame, pose = 'stand', male = false) {
  const old = stage === 'gia', sit = pose !== 'stand', sick = pose === 'sick', sleep = pose === 'sleep';
  const W = old ? fade(P.cowW, 0.15, '#d8d0c4') : P.cowW;
  const K = male ? (old ? fade(P.cowB, 0.3) : P.cowB) : (old ? fade(P.cowK, 0.35, '#8a8690') : P.cowK);
  const MZ = old ? fade(P.muzzle, 0.25) : P.muzzle;
  const s = COW[old ? 'truong' : stage], Wd = s.w * 2, Ht = s.h * 2;
  const oy = sit ? s.legs.len - 1 : 0, hy = (old ? 1 : 0) + (sick ? 2 : 0) + (sleep ? 1 : 0);
  const [bx, by, brx, bry] = s.body, [hx, hyy, hrx, hry] = s.head, [mx, my, mrx, mry] = s.mz, [ex, ey, erx, ery] = s.ear;
  // lông: vệt ngắn nhạt trên mảng trắng sáng, già thêm lông xám
  const hair = (px, py, k) => (k === 2 && (px * 2 + py * 5) % 19 === 0 ? W[1] : old && k >= 2 && (px * 5 + py * 3) % 17 === 0 ? mix(W[2], '#a8a098', 0.5) : undefined);
  const legs = pose === 'stand' ? quadLegs({ ...s.legs, r: W, hoof: P.hoof, frame, slow: old }) : [];
  const fem = !male && (stage === 'truong' || old);
  const big = male && stage !== 'non';
  const hump = big ? e2(bx - brx * 0.45, by - bry * 0.55 + oy, brx * 0.4, bry * 0.55, W, { pat: spotPat(s.spots, K, oy, hair) }) : null;
  const HX = hx * 2, HY = (hyy + oy + hy) * 2, hornY = (hyy - hry + oy + hy) * 2;
  const patch = (px, py, k) => (Math.hypot(px + 0.5 - (hx + 1.3) * 2, (py + 0.5 - (hyy + oy + hy - 1) * 2) * 1.1) < 3.4 + (hash(px >> 1, py >> 1) - 0.5) ? K[k] : undefined);
  const parts = [
    ...legs,
    fem && !sit && e2(bx + 2, by + bry - 0.2 + oy, 1.9, 1.2, MZ, { sep: true, gloss: 0.6 }),                  // bầu sữa
    hump,
    e2(bx, by + oy, brx, bry, W, { pat: spotPat(s.spots, K, oy, hair) }),
    sick && b2(s.legs.fx - 3, s.h - 3, 4, 1, W, { sep: true, min: 1 }),
    sick && b2(s.legs.bx + 1, s.h - 3, 4, 1, W, { sep: true, min: 1 }),
    e2(ex, ey + oy + hy, erx, ery, W, { sep: true, pat: (px, py, k) => (py > (ey + oy + hy) * 2 && px < ex * 2 + erx ? mix(MZ[1], W[1], 0.3) : undefined) }),
    e2(hx, hyy + oy + hy, hrx, hry, W, { sep: true, pat: patch }),
    e2(mx, my + oy + hy, mrx, mry, MZ, { sep: true, gloss: 0.55 }),
  ];
  const c = fig(Wd, Ht, parts);
  const x = c.getContext('2d');
  // sừng: bò đực sừng to cong vểnh có ngấn, bò cái / bê lớn sừng nhú
  const HP = old ? fade(P.horn, 0.2, '#b8b0a0') : P.horn;
  const hornPal = dim => ({ o: OUT, H: dim ? HP[2] : HP[3], h: dim ? HP[1] : HP[2], d: dim ? HP[0] : HP[1], t: HP[0] });
  const BIG_HORN = ['oo...', 'oto..', 'ohHo.', '.ohho', '.odho', '.ohdo', '.oddo'];
  const SMALL_HORN = ['.o.', 'oto', 'oHo', 'ohd'];
  if (big) {
    x.drawImage(spr(BIG_HORN, hornPal(true)), Math.round((hx + 2.6) * 2) - 2, Math.max(0, Math.round(hornY) - 5));
    x.drawImage(spr(BIG_HORN, hornPal(false)), Math.round((hx - 1.7) * 2) - 2, Math.max(0, Math.round(hornY) - 4));
  } else if (stage !== 'non' || male) x.drawImage(spr(SMALL_HORN, hornPal(false)), Math.round((hx + 1.8) * 2) - 1, Math.round(hornY) - 2);
  // núm vú
  if (fem && !sit) { const ux = Math.round((bx + 2) * 2), uy = Math.round((by + bry - 0.2 + oy + 1.2) * 2) + 1; R(x, MZ[0], ux - 2, uy, 1, 2); R(x, MZ[0], ux + 2, uy, 1, 2); R(x, OUT, ux - 2, uy + 2); R(x, OUT, ux + 2, uy + 2); }
  // đuôi có chùm
  const [tx, ty, tl] = s.tail, TX = tx * 2, TY = ty * 2;
  if (!sit) {
    line(x, OUT, TX + 2, TY + 2, TX + 2, TY + tl * 2 - 3); line(x, W[1], TX + 1, TY + 2, TX + 1, TY + tl * 2 - 4); line(x, W[0], TX, TY + 3, TX, TY + tl * 2 - 5);
    const fy = TY + tl * 2 - 5;
    R(x, OUT, TX - 1, fy, 4, 5); R(x, K[1], TX, fy, 2, 4); R(x, K[2], TX, fy, 1, 2); R(x, K[0], TX + 1, fy + 3, 2, 1);
  } else {
    line(x, OUT, TX - 4, Ht - 3, TX + 2, Ht - 3); line(x, W[1], TX - 4, Ht - 4, TX + 1, Ht - 4); R(x, K[1], TX + 1, Ht - 5, 2, 2); R(x, OUT, TX + 3, Ht - 5, 1, 2);
  }
  // mũi, miệng
  const mY = Math.round((my + oy + hy) * 2), mL = Math.round((mx - mrx) * 2), mR = Math.round((mx + mrx) * 2);
  atop(x, () => {
    R(x, '#6a2a34', mL + 1, mY - 1, 1, 2); R(x, MZ[3], mL + 2, mY - 1);
    R(x, '#6a2a34', mR - 2, mY - 1, 1, 2); R(x, MZ[3], mR - 1, mY - 1);
    R(x, MZ[0], mL + 2, mY + 2, mR - mL - 3, 1);                                                  // khoé miệng
  });
  if (big) { R(x, '#e2c040', Math.round(mx * 2) - 1, mY + 2, 2, 2); R(x, '#fff0a0', Math.round(mx * 2) - 1, mY + 2); R(x, '#a8841c', Math.round(mx * 2) + 1, mY + 3); R(x, OUT, Math.round(mx * 2), mY + 4); } // khoen mũi
  for (const [e0r, e1raw] of s.eye) {
    const e0 = e0r * 2, e1 = (e1raw + oy + hy) * 2;
    if (sleep) lid(x, '#4a3a3a', e0 - 1, e1, 3);
    else if (sick) { R(x, EYE, e0, e1 + 1, 2, 1); R(x, '#6a5a5a', e0 + (e0 < HX ? -1 : 2), e1 - 1); R(x, '#6a5a5a', e0, e1, 2, 1); }
    else { R(x, EYE, e0, e1, 2, 2); R(x, '#ffffff', e0, e1); if (old) R(x, '#b0a8a0', e0, e1 - 1, 2, 1); }
  }
  if (sick) sweat(x, Math.round((hx + hrx) * 2) + 1, Math.max(0, Math.round((hyy - hry + oy + hy) * 2) - 2));
  return c;
}

// ---------- CỪU ---------- non 28x22 · nhỡ 34x26 · trưởng thành 46x32 · già 46x32
// Len từng búi tròn có viền tách, mỗi búi sáng phía trên trái và có nét xoăn nhỏ; mặt đen có mắt trắng, mũi hồng.
// curly (cừu xoăn): lọn nhỏ dày, màu kem vàng. già: len xỉn ngả xám, mặt bạc, đầu cúi.

const SHEEP = {
  non: { w: 14, h: 11, core: [8.3, 4.8, 4, 2.6], bumps: [[5.6, 3.4, 1.5], [8, 2.6, 1.6], [10.6, 3.1, 1.5], [12, 5, 1.2], [6, 6.6, 1.4], [10, 6.6, 1.5]], head: [3.6, 5.2, 2.1, 2.4], cap: [4.2, 3, 1.5, 1.1], ear: [6.2, 4.4, 1.2, 0.6], legs: { fx: 5, bx: 10, top: 8, len: 2, w: 1 }, eye: [3, 5] },
  nho: { w: 17, h: 13, core: [9.8, 6.1, 5, 3], bumps: [[6.6, 4, 1.6], [9.3, 3.4, 1.7], [12.2, 3.6, 1.7], [14.4, 5.6, 1.4], [13.6, 8, 1.5], [10, 8.6, 1.6], [6.6, 8, 1.5]], head: [4.1, 5.8, 2.3, 2.8], cap: [4.8, 3.4, 1.6, 1], ear: [7, 4.9, 1.4, 0.7], legs: { fx: 6, bx: 12, top: 9, len: 3 }, eye: [3, 6] },
  truong: { w: 23, h: 16, core: [12.6, 7.4, 7.6, 4.3], bumps: [[6.8, 5, 2.4], [9.8, 3.6, 2.6], [13.4, 3.2, 2.7], [17, 3.8, 2.5], [19.6, 6.4, 2.2], [19.4, 9.6, 2.2], [15.8, 11, 2.4], [11.6, 11.4, 2.4], [7.6, 10.4, 2.2]], head: [4.4, 7, 2.5, 3.1], cap: [5.4, 4.2, 2.2, 1.5], ear: [7.8, 6, 1.6, 0.8], legs: { fx: 7, bx: 16, top: 12, len: 3 }, eye: [3, 7] },
};
function sheep(stage, frame, pose = 'stand', curly = false) {
  const old = stage === 'gia', sit = pose !== 'stand', sick = pose === 'sick', sleep = pose === 'sleep';
  let WL = stage === 'nho' ? P.woolS : curly ? P.woolC : P.wool;
  if (old) WL = fade(WL, 0.3, '#c4c0bc');
  if (stage === 'non') WL = curly ? fade(P.woolC, 0.3, '#ffffff') : P.woolS;
  const F = old ? fade(P.face, 0.25, '#8a8288') : P.face;
  const s = SHEEP[old ? 'truong' : stage], W = s.w * 2, H = s.h * 2;
  const oy = sit ? s.legs.len : 0, hy = (old ? 1 : 0) + (sick ? 1 : 0) + (sleep ? 1 : 0);
  const legs = pose === 'stand' ? quadLegs({ ...s.legs, r: F, hoof: ['#0c0808', '#120c0c', '#3a2a28'], frame, slow: old }) : [];
  const curl = curly && stage !== 'nho';
  const bumps = curl ? [...s.bumps, ...s.bumps.map(([bx, by, r]) => [bx + r * 0.5, by + r * 0.35, r * 0.65])] : s.bumps;
  // nét xoăn: len thường có dấu móc thưa, len xoăn có lọn nhỏ dày
  const woolPat = (px, py, k) => {
    if (curl) { if (k >= 1 && py % 3 === 0 && (px + (py / 3) * 2) % 4 === 0) return WL[Math.max(0, k - 1)]; if (k >= 2 && py % 3 === 1 && (px + ((py - 1) / 3) * 2) % 4 === 1) return WL[3]; return undefined; }
    if (k === 2 && (px * 3 + py * 7) % 17 === 0) return WL[1];
    if (k === 2 && (px * 3 + py * 7) % 17 === 3) return WL[3];
    return undefined;
  };
  const faceTex = old ? (px, py, k) => (k >= 1 && (px + py * 2) % 5 === 0 ? mix(F[k], '#d8d0cc', 0.35) : undefined) : undefined;   // lông mặt bạc
  const c = fig(W, H, [
    ...legs,
    sick && b2(s.legs.fx - 3, s.h - 3, 3, 1, F, { sep: true }),
    sick && b2(s.legs.bx + 2, s.h - 3, 3, 1, F, { sep: true }),
    e2(s.core[0], s.core[1] + oy, s.core[2], s.core[3], WL, { pat: woolPat }),
    ...bumps.map(([bx, by, r]) => E(bx * 2, (by + oy) * 2, r * 2 + 0.8, r * 1.8 + 0.8, WL, { sep: curl ? WL[0] : WL[1], pat: woolPat })),
    e2(s.ear[0], s.ear[1] + oy + hy, s.ear[2], s.ear[3], F, { sep: true, pat: (px, py, k) => (py > (s.ear[1] + oy + hy) * 2 && px < s.ear[0] * 2 + 1 ? '#a86a6a' : undefined) }),
    e2(s.head[0], s.head[1] + oy + hy, s.head[2], s.head[3], F, { sep: true, pat: faceTex, gloss: 0.7 }),
    e2(s.cap[0], s.cap[1] + oy + hy, s.cap[2], s.cap[3], WL, { sep: WL[1], pat: woolPat }),
  ]);
  const x = c.getContext('2d');
  const e0 = s.eye[0] * 2, e1 = (s.eye[1] + oy + hy) * 2;
  if (sleep) lid(x, '#8a7a76', e0 - 1, e1, 4);
  else if (sick) { R(x, '#e8dcc8', e0, e1 + 1, 2, 1); R(x, EYE, e0 + 1, e1 + 1); R(x, '#8a7a76', e0 - 1, e1 - 1, 3, 1); sweat(x, W - 9, 1 + oy * 2); }
  else { R(x, '#f2e8d8', e0 - 1, e1, 4, 2); R(x, EYE, e0, e1, 2, 2); R(x, '#ffffff', e0, e1); R(x, '#c8b8a8', e0 - 1, e1 + 1); }
  // mũi hồng, miệng
  const nX = Math.max(2, e0 - 2), nY = e1 + 4;
  R(x, '#c87a80', nX, nY, 2, 1); R(x, '#e8a0a4', nX, nY); R(x, mix(F[0], '#000000', 0.3), nX + 1, nY + 2, 2, 1);
  return c;
}

// ---------- KẺ SĂN MỒI & THÚ PHÁ ----------
// Chuột xám lông có vệt, tai hồng, đuôi trần hồng; diều hâu nâu lông cánh xòe "ngón", ức trắng sọc, mỏ quặp vàng;
// chồn nâu mặt nạ tối mắt vàng; chồn hương xám tro mặt nạ đen sọc kem, đuôi khoang; quạ đen ánh xanh.

const S2 = pts => pts.map(([a, b]) => [a * 2, b * 2]);
const furPat = (r, step = 7) => (px, py, k) => (k >= 2 && (px + py * 3) % step === 0 && (py & 1) ? r[k - 1] : undefined);
const ratFur = furPat(P.rat);
const FOOT = P.ratPink;
// đuôi trần: nét hồng 1px có viền tối phía dưới, ngọn nhạt dần
function ratTail(x, pts) {
  for (let i = 0; i < pts.length - 1; i++) { const [a, b] = pts[i], [c, d] = pts[i + 1]; line(x, OUT, a, b + 1, c, d + 1); }
  for (let i = 0; i < pts.length - 1; i++) { const [a, b] = pts[i], [c, d] = pts[i + 1]; line(x, i < pts.length - 2 ? FOOT[2] : FOOT[3], a, b, c, d); }
}
function ratEar(cx, cy, r = 1.7) { return E(cx, cy, r, r, P.ratPink, { sep: true, pat: (px, py) => (Math.hypot(px + 0.5 - cx - 0.4, py + 0.5 - cy - 0.3) < r * 0.55 ? P.ratPink[0] : undefined) }); }
function whisk(x, px, py) { R(x, 'rgba(232,224,228,0.85)', px - 2, py, 2, 1); R(x, 'rgba(232,224,228,0.6)', px - 3, py + 2, 2, 1); }

function rat(f) {
  const r = P.rat;
  const c = fig(26, 14, [
    B(f ? 6 : 8, 10, 3, 3, FOOT, { max: 1 }), B(f ? 16 : 14, 10, 3, 3, FOOT, {}),
    e2(6.6, 3.4, 3.6, 1.9, r, { pat: ratFur }),
    ratEar(7.2, 3.6, 2),
    e2(2.6, 3.4, 2, 1.5, r, { sep: true, pat: ratFur, gloss: 0.8 }),
  ]);
  const x = c.getContext('2d');
  eye(x, 4, 5);
  R(x, P.pink, 0, 6, 2, 2); R(x, '#ffc0cc', 0, 6); R(x, OUT, 1, 9, 2, 1);
  whisk(x, 3, 8);
  ratTail(x, f ? [[20, 7], [23, 5], [25, 2]] : [[20, 7], [23, 8], [25, 10]]);
  return c;
}
function ratEat(f) {
  const r = P.rat, ch = f ? 0 : 1;
  const c = fig(26, 14, [
    B(14, 10, 3, 3, FOOT, {}), B(18, 10, 3, 3, FOOT, { max: 1 }),
    e2(8.8, 2.9, 2.7, 1.9, r, { pat: ratFur }),
    ratEar(12.8, 2.8, 1.9),
    E(10.4, 8.6 - ch * 0.8, 5, 4.2, r, { sep: true, pat: ratFur, gloss: 0.8 }),
  ]);
  const x = c.getContext('2d');
  const ey = 7 - ch;
  // miếng mồi vàng có lỗ
  ell(x, OUT, 2.4, 9.4, 3, 3); ell(x, '#f7d547', 2.4, 9.4, 2.2, 2.1);
  R(x, '#fff0a0', 1, 8, 2, 1); R(x, '#d19a1c', 3, 10); R(x, '#d19a1c', 1, 11, 2, 1); R(x, '#b07a10', 4, 9);
  eye(x, 8, ey);
  R(x, P.pink, 6, ey + 3, 2, 2); R(x, '#ffc0cc', 6, ey + 3);
  // hai chân trước ôm mồi
  R(x, FOOT[3], 6, 10, 2, 2); R(x, FOOT[2], 8, 10, 2, 2); R(x, OUT, 6, 12, 4, 1); R(x, OUT, 5, 10, 1, 2);
  ratTail(x, [[21, 6], [23, 4], [24, 1]]);
  return c;
}
function ratFlee(f) {
  const r = P.rat, dy = f ? 0.8 : 0;
  const legs = f ? [B(6, 10, 4, 3, FOOT, {}), B(20, 10, 4, 3, FOOT, { max: 1 })] : [B(10, 10, 3, 3, FOOT, {}), B(16, 10, 4, 3, FOOT, { max: 1 })];
  const c = fig(36, 14, [
    ...legs,
    E(15.6, 6 + dy, 10.2, 4, r, { pat: ratFur }),
    E(11.2, 3.4 + dy, 2.6, 1.4, P.ratPink, { max: 1, sep: true }),
    E(6, 6 + dy, 5.4, 3.6, r, { sep: true, pat: ratFur, gloss: 0.8 }),
  ]);
  const x = c.getContext('2d');
  const ey = 4 + Math.round(dy);
  R(x, '#ffffff', 3, ey, 3, 2); R(x, EYE, 4, ey + 1, 2, 2); R(x, '#ffffff', 4, ey + 1);          // mắt trợn hoảng
  R(x, P.pink, 0, ey + 3, 2, 2);
  ratTail(x, [[25, 6 + Math.round(dy)], [28, 5], [31, 4]]); R(x, OUT, 31, 5);
  // vạch gió
  R(x, '#cfd8e0', f ? 30 : 32, 9, 4, 1); R(x, '#aebcc8', f ? 28 : 30, 2, 5, 1); R(x, '#e8eef4', f ? 33 : 34, 11, 2, 1);
  return c;
}
function ratTrophy() {
  return draw(18, 12, x => {
    ell(x, 'rgba(34,22,10,0.28)', 8, 10, 8, 1.6);
    const c = fig(16, 10, [E(8.8, 5.6, 6, 3.4, P.rat, { pat: ratFur }), ratEar(5.4, 2.4, 1.6), E(3.6, 3.6, 2.8, 2.4, P.rat, { sep: true, lift: 0.3 })]);
    x.drawImage(c, 0, 0);
    dots(x, OUT, [[3, 3], [5, 3], [4, 4], [3, 5], [5, 5]]);                                          // mắt chéo bất tỉnh
    R(x, P.pink, 0, 4, 2, 2);
    ratTail(x, [[14, 6], [16, 5], [17, 3]]);
    R(x, FOOT[2], 8, 9, 2, 1); R(x, FOOT[2], 11, 9, 2, 1);
  });
}

// diều hâu: cánh tô theo đa giác, lông bay xòe "ngón" ở mút, dải lông phủ sẫm
function hawkWing(W, Hh, pts, dark, tip, v) {
  const H = P.hawk;
  return outline(pix(W, Hh, (px, py) => {
    if (!inPoly(pts, px + 0.5, py + 0.5)) return null;
    if (tip(py)) return (px >> 1) % 2 === (dark ? 1 : 0) ? null : dark ? H[0] : H[1];          // ngón lông tách rời
    const t = v(px, py);
    if (!dark && py % 4 === 0 && t > 0.2) return H[1];                                             // vạch lông phủ
    const k = dark ? (t > 0.5 ? 0 : 1) : t > 0.66 ? 1 : t > 0.25 ? 2 : 3;
    return H[k];
  }));
}
function hawkHead(x, hx, hy, look = 'side') {
  // mỏ quặp vàng chóp đen, mắt vàng con ngươi đen, mày sẫm
  R(x, OUT, hx - 5, hy + 1, 1, 3); R(x, P.talon[2], hx - 4, hy + 1, 2, 2); R(x, P.talon[3], hx - 4, hy + 1); R(x, P.talon[1], hx - 3, hy + 3); R(x, OUT, hx - 4, hy + 3); R(x, '#2a1a10', hx - 5, hy + 3);
  R(x, '#ffe070', hx - 1, hy - 1, 2, 2); R(x, EYE, hx - 1, hy); R(x, P.hawk[0], hx - 2, hy - 2, 4, 1);
  if (look === 'side') R(x, P.hawkW[2], hx - 2, hy + 2, 3, 1);
}
function hawk(f) {
  const H = P.hawk, W = 44, Hh = 26;
  const nearUp = [[8, 6], [13, 6.5], [18.5, 1], [16.5, 0.6], [14.5, 1.4], [12.5, 0.8], [10.5, 2]];
  const farUp = [[11, 5.5], [15, 5.5], [20.5, 2.2], [18.5, 1.6]];
  const nearDn = [[8, 6.5], [13, 6.5], [15.5, 12.2], [13.6, 12.4], [12.2, 11.4], [10.6, 12.2], [9, 10]];
  const farDn = [[11, 7], [14.5, 7], [18, 10.6], [16, 10.6]];
  const near = S2(f ? nearDn : nearUp), far = S2(f ? farDn : farUp);
  const bodyC = fig(W, Hh, [
    e2(17.8, 7.2, 1.8, 1.2, H, { max: 1, pat: (px, py) => (py % 3 === 0 ? H[0] : undefined) }),         // đuôi có vằn
    e2(16.4, 7.2, 2.6, 1.3, H, { max: 2 }),
    e2(10.4, 7.2, 4.6, 2, H, { pat: (px, py, k) => (py >= 16 && px < 22 ? (px + py) % 4 === 0 ? P.hawkW[0] : P.hawkW[2] : undefined) }),   // ức trắng sọc
    e2(5.6, 6.4, 1.9, 1.7, H, { sep: true, lift: 0.2, gloss: 0.8 }),
  ]);
  const tip = f ? py => py >= 21 : py => py <= 4;
  const v = f ? (px, py) => (py - 12) / 12 : (px, py) => (12 - py) / 12;
  const farW = hawkWing(W, Hh, far, true, tip, v), nearW = hawkWing(W, Hh, near, false, tip, v);
  return draw(W, Hh, x => {
    x.drawImage(farW, 0, 0); x.drawImage(bodyC, 0, 0); x.drawImage(nearW, 0, 0);
    hawkHead(x, 10, 10);
    R(x, P.talon[2], 24, 18, 2, 1); R(x, OUT, 24, 19, 3, 1); R(x, OUT, 26, 18);                      // móng thu dưới bụng
  });
}
function hawkShadow() {
  return draw(36, 12, x => {
    ell(x, 'rgba(20,14,8,0.28)', 18, 6, 16, 2.4);
    ell(x, 'rgba(20,14,8,0.22)', 18, 6, 4.8, 4);
  });
}
function sweep(x0, y0, x1, y1, w0, w1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  return [[x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0]];
}
function hawkDive(f) {
  const H = P.hawk, W = 32, Hh = 28, sw = f ? 0.5 : 0;
  const far = S2(sweep(6.2, 5.2 + sw, 12.6, 0.5, 1.6, 0.9)), near = S2(sweep(7.8, 8.6 - sw, 15, 3.2, 2, 1.1));
  const bodyC = fig(W, Hh, [
    e2(12.4, 2.4, 1.3, 1.1, H, { max: 2, pat: (px, py) => ((px + py) % 3 === 0 ? H[0] : undefined) }),
    e2(10.6, 3.8, 1.5, 1.4, H),
    e2(8.8, 5.4, 1.8, 1.7, H),
    e2(6.8, 7.1, 2.1, 1.9, H, { pat: (px, py) => (py >= 16 && px < 15 ? (px + py) % 4 === 0 ? P.hawkW[0] : P.hawkW[2] : undefined) }),
    e2(4.3, 8.8, 2.2, 1.9, H, { sep: true, lift: 0.2, gloss: 0.8 }),
  ]);
  const wing = (pts, dark) => outline(pix(W, Hh, (px, py) => {
    if (!inPoly(pts, px + 0.5, py + 0.5)) return null;
    if (py <= 4 && (px >> 1) % 2 === (dark ? 1 : 0)) return null;
    if (py <= 4) return dark ? H[0] : H[1];
    if (!dark && (px - py) % 5 === 0) return H[1];
    return H[dark ? (py < 8 ? 0 : 1) : py < 6 ? 1 : py < 12 ? 2 : 3];
  }));
  const farW = wing(far, true), nearW = wing(near, false);
  return draw(W, Hh, x => {
    x.drawImage(farW, 0, 0); x.drawImage(bodyC, 0, 0); x.drawImage(nearW, 0, 0);
    // đầu chúc xuống: mắt dữ, mỏ quặp chúi đất
    R(x, '#ffe070', 7, 15, 3, 2); R(x, EYE, 7, 16, 2, 1); R(x, P.hawk[0], 6, 14, 4, 1); R(x, '#fff6dc', 6, 15);
    R(x, OUT, 2, 18, 1, 4); R(x, P.talon[2], 3, 18, 2, 3); R(x, P.talon[3], 3, 18); R(x, P.talon[1], 4, 21); R(x, OUT, 4, 22, 2, 1); R(x, '#2a1a10', 3, 21);
    // chân vàng duỗi ra trước, ba ngón móng xòe
    const ty = f ? 2 : 0;
    line(x, P.talon[1], 14, 18 + ty, 11, 22 + ty); line(x, P.talon[2], 13, 18 + ty, 10, 22 + ty);
    dots(x, P.talon[2], [[8, 23 + ty], [9, 24 + ty], [11, 24 + ty], [12, 25 + ty]]);
    dots(x, OUT, [[7, 23 + ty], [8, 24 + ty], [10, 25 + ty], [13, 25 + ty], [12, 21 + ty], [15, 19 + ty]]);
  });
}
function hawkCarry(f) {
  const H = P.hawk, W = 44, Hh = 36;
  const upNear = [[8, 7], [13.6, 6.4], [20.6, 1.2], [18.6, 0.6], [16.4, 1.8], [14.2, 1], [11.4, 2.8]];
  const upFar = [[10, 6], [14.6, 5.8], [20, 2.6], [18, 2]];
  const dnNear = [[8, 7.2], [13.6, 7], [19.4, 11.4], [17.4, 11.8], [15.8, 10.6], [13.8, 11.4], [10.8, 9.4]];
  const dnFar = [[10, 7.6], [14.6, 7.4], [18.4, 10], [16.4, 10]];
  const near = S2(f ? dnNear : upNear), far = S2(f ? dnFar : upFar);
  const bodyC = fig(W, Hh, [
    e2(17.8, 7.6, 2.1, 1.2, H, { max: 1, pat: (px, py) => (py % 3 === 0 ? H[0] : undefined) }),
    e2(15.2, 7.4, 2.4, 1.5, H, { max: 2 }),
    e2(10.2, 7.6, 4.8, 2.3, H, { pat: (px, py) => (py >= 17 && px < 22 ? (px + py) % 4 === 0 ? P.hawkW[0] : P.hawkW[2] : undefined) }),
    e2(5.2, 6.6, 2, 1.8, H, { sep: true, lift: 0.2, gloss: 0.8 }),
  ]);
  const tip = f ? py => py >= 19 : py => py <= 4;
  const v = f ? (px, py) => (py - 12) / 12 : (px, py) => (12 - py) / 12;
  const farW = hawkWing(W, Hh, far, true, tip, v), nearW = hawkWing(W, Hh, near, false, tip, v);
  // gà con bị cắp: mềm oặt, đầu gục, chân thõng
  const prey = fig(20, 12, [
    e2(5.4, 2.6, 3.2, 1.7, P.chick, { pat: (px, py, k) => (k >= 2 && (px + py * 2) % 6 === 0 ? P.chick[3] : undefined) }),
    e2(7.4, 2.4, 1.3, 1, P.chick, { sep: true, max: 2 }),
    e2(2.1, 3.3, 1.7, 1.5, P.chick, { sep: true }),
  ]);
  const pc = prey.getContext('2d');
  lid(pc, OUT, 2, 6, 3); R(pc, '#d88a14', 0, 8, 2, 2); R(pc, '#a85a08', 0, 9);
  R(pc, '#d89a1c', 10, 8, 1, 2); R(pc, OUT, 10, 10, 2, 1); R(pc, '#a86a0c', 14, 8, 1, 2); R(pc, OUT, 15, 10, 2, 1);
  return draw(W, Hh, x => {
    x.drawImage(farW, 0, 0); x.drawImage(bodyC, 0, 0); x.drawImage(nearW, 0, 0);
    hawkHead(x, 9, 11);
    x.drawImage(prey, f ? 12 : 14, 23);
    for (const lx of [18, 24]) { R(x, P.talon[2], lx, 20, 2, 2); R(x, P.talon[1], lx, 22, 2, 2); R(x, OUT, lx - 1, 24, 4, 1); }   // móng quặp lưng mồi
  });
}

const weaselPat = furPat(P.weasel, 9);
function weaselFace(x, ex, ey, open = false) {
  R(x, '#2a1a10', ex - 2, ey, 6, 2);                                                                // mặt nạ
  R(x, '#ffe070', ex, ey, 2, 2); R(x, '#fff8c0', ex, ey); R(x, EYE, ex + 1, ey + 1);                // mắt sáng
  if (!open) R(x, EYE, 0, ey + 2, 2, 2);
}
function weasel(f) {
  const W = P.weasel, CR = P.cream;
  const c = fig(36, 18, [
    b2(f ? 3 : 4, 6, 2, 2, W, { max: 1 }), b2(f ? 12 : 11, 6, 2, 2, W, { max: 1 }),
    e2(15.4, 4.4 - (f ? 1 : 0), 2.4, 1, W, { pat: px => (px >= 33 ? W[0] : px >= 31 ? W[1] : undefined) }),   // đuôi chóp tối
    e2(8.6, 4.6 + (f ? -0.4 : 0), 5.4, 1.9, W, { pat: weaselPat }),
    b2(f ? 5 : 4, 6, 2, 2, W, { sep: true, min: 1 }), b2(f ? 10 : 12, 6, 2, 2, W, { sep: true, min: 1 }),
    e2(3.4, 3.8, 2.4, 1.7, W, { sep: true, gloss: 0.8, pat: (px, py) => (py >= 8 && px <= 7 ? CR[(py & 1) + 1] : undefined) }),   // cằm kem
    e2(4.4, 1.8, 0.7, 0.7, W, { pat: (px, py) => (px === 9 && py === 4 ? CR[1] : undefined) }),
  ]);
  const x = c.getContext('2d');
  weaselFace(x, 4, 6);
  return c;
}
function weaselCatch(f) {
  const W = P.weasel, CR = P.cream, st = f ? 1 : 0;
  const c = fig(40, 22, [
    b2(f ? 15 : 16, 7, 2, 3, W, { max: 1 }),
    B(2, 18, 10, 3, W, { max: 1 }),
    e2(16.4, 2.6 - st * 0.4, 2.3, 0.9, W, { pat: px => (px >= 35 ? W[0] : undefined) }),
    e2(13.6, 5.6, 3.2, 2.1, W, { pat: weaselPat }),
    e2(9.6, 3.7 - st * 0.4, 3.5, 1.8, W, { pat: weaselPat }),
    b2(f ? 12 : 13, 7, 2, 3, W, { sep: true, min: 1 }),
    e2(5.8, 4.2, 2.5, 1.9, W, { sep: true, gloss: 0.8, pat: (px, py) => (py >= 10 && px <= 13 ? CR[(py & 1) + 1] : undefined) }),
    e2(7, 2.1, 0.8, 0.8, W),
    B(0, 14, (6 + st) * 2, 4, W, { sep: true, min: 1, pat: px => (px <= 3 ? CR[2] : undefined) }),
  ]);
  const x = c.getContext('2d');
  weaselFace(x, 8, 6, true);
  R(x, EYE, 6, 7);
  // miệng há, răng nanh
  R(x, '#6a1a20', 5, 10, 6, 2); R(x, '#8a2430', 8, 12, 4, 1); R(x, '#fff6e8', 6, 10); R(x, '#fff6e8', 9, 10); R(x, '#fff6e8', 10, 12);
  R(x, OUT, 4, 9, 1, 4); R(x, '#2a1a10', 2, 8, 2, 2);
  // móng vuốt bàn trước
  dots(x, '#f4ead8', [[0, 17], [0, 19], [1, 21]]);
  return c;
}

// chồn hương
const civetRing = (off = 0) => (px, py, k) => ((((px + off * 2) >> 2) & 1) ? P.civetDark[Math.min(3, k + 1)] : P.cream[Math.min(3, k + 1)]);
const civetRingV = (off = 0) => (px, py, k) => ((((py + off * 2) >> 2) & 1) ? P.civetDark[Math.min(3, k + 1)] : P.cream[Math.min(3, k + 1)]);
const civetSpeck = (px, py, k) => (k >= 1 && (px * 2 + py * 3) % 11 === 0 ? P.civetDark[k >= 2 ? 3 : 2] : k >= 2 && (px + py * 3) % 7 === 0 ? P.civet[1] : undefined);
function civetFace(x, ex, ey) {
  const D = P.civetDark, K = P.cream;
  atop(x, () => {
    R(x, K[2], ex - 6, ey - 4, 12, 2); R(x, K[3], ex - 4, ey - 4, 6, 1);                           // sọc kem sống mũi
    R(x, D[1], ex - 6, ey - 2, 12, 2); R(x, D[0], ex - 4, ey, 8, 2);                               // mặt nạ đen
    R(x, K[2], ex - 6, ey + 2, 6, 2); R(x, K[3], ex - 6, ey + 2, 2, 1);                            // má kem
    R(x, '#ffd23c', ex, ey - 1, 3, 2); R(x, '#fff6c0', ex, ey - 1); R(x, '#2a1a10', ex + 2, ey);    // mắt vàng ánh đèn
  });
}
function civet(f) {
  const C = P.civet, K = P.cream;
  const c = fig(40, 22, [
    b2(f ? 3 : 5, 7, 2, 3, C, { max: 1, sep: true }), b2(f ? 13 : 11, 7, 2, 3, C, { max: 1, sep: true }),
    e2(16, 5.6 - (f ? 0.5 : 0), 4, 1.1, C, { pat: civetRing(f ? 2 : 0) }),
    e2(8.6, 6.4, 5.2, 1.9, C, { pat: civetSpeck }),
    e2(4, 4.6, 2.5, 2, C, { sep: true, gloss: 0.85 }),
    b2(0, 4, 3, 2, C, { sep: true, min: 1 }),
    b2(5, 2, 2, 1, C, { sep: true }),
    b2(f ? 5 : 3, 7, 2, 3, C, { min: 1, sep: true }), b2(f ? 11 : 13, 7, 2, 3, C, { min: 1, sep: true }),
  ]);
  const x = c.getContext('2d');
  civetFace(x, 6, 9);
  R(x, '#2a1a12', 0, 8, 2, 2); R(x, '#5a4a40', 0, 8);
  R(x, K[1], 10, 4, 2, 1); R(x, '#a07a6a', 11, 5);
  return c;
}
function civetCatch(f) {
  const C = P.civet, D = P.civetDark;
  const c = fig(36, 28, [
    b2(11, 10, 2, 3, C, { max: 1 }),
    e2(16.2, 7, 1.3, 4, C, { pat: civetRingV(f ? 2 : 0) }),
    e2(15.2, 2.4, 1.5, 1.4, C, { pat: civetRingV(f ? 1 : 3), sep: true }),
    e2(13, 10, 3, 2.6, C, { pat: civetSpeck }),
    e2(10.4, 7, 2.4, 2.6, C, { sep: true, pat: civetSpeck }),
    e2(8.4, 4.4, 2.2, 2.2, C, { sep: true }),
    b2(14, 10, 2, 3, C, { min: 1, sep: true }),
    b2(f ? 4 : 5, 5, 3, 2, C, { max: 1, sep: true }),
    b2(f ? 6 : 5, 7, 4, 2, C, { min: 1, sep: true }),
    e2(5.6, 2.2, 2.3, 2, C, { sep: true, gloss: 0.85 }),
    b2(1, 1, 3, 1, C, { sep: true, min: 2 }),
    b2(1, 3, 3, 1, C, { sep: true, max: 1 }),
    b2(7, 0, 2, 1, C, { sep: true }),
  ]);
  const x = c.getContext('2d');
  civetFace(x, 10, 5);
  R(x, '#6e1a14', 2, 4, 6, 2); R(x, '#a8302a', 3, 5, 4, 1);                                        // miệng há đỏ
  dots(x, '#ffffff', [[2, 3], [7, 3], [4, 6], [5, 6]]); R(x, '#ffffff', 2, 2); R(x, '#ffffff', 7, 2);   // răng nanh
  for (const [a, b] of [[18, 2], [22, 6], [26, 12]]) { R(x, OUT, a, b, 1, 2); R(x, D[1], a + 1, b + 1, 1, 2); R(x, OUT, a + 1, b - 1); }   // lông gáy dựng
  dots(x, '#e8dccc', [[f ? 8 : 10, 12], [f ? 8 : 10, 13], [f ? 12 : 10, 16], [f ? 12 : 10, 17]]);     // móng vuốt
  return c;
}
function civetFlee(f) {
  const C = P.civet;
  const c = fig(44, 20, [
    b2(f ? 2 : 5, 6, 2, 3, C, { max: 1, sep: true }), b2(f ? 16 : 13, 6, 2, 3, C, { max: 1, sep: true }),
    e2(16.8, 5.8, 3, 1, C, { pat: civetRing(f ? 2 : 0) }),
    e2(19.6, 7.6, 1.5, 2.1, C, { pat: civetRingV(f ? 1 : 3), sep: true }),
    e2(9.8, 4.6, 6.2, 1.7, C, { pat: civetSpeck }),
    e2(3.8, 4, 2.4, 1.9, C, { sep: true, gloss: 0.85 }),
    b2(0, 3, 3, 2, C, { sep: true, min: 1 }),
    b2(4, 1, 4, 1, C, { sep: true, max: 1 }),
    b2(f ? 5 : 2, 6, 2, 3, C, { min: 1, sep: true }), b2(f ? 13 : 16, 6, 2, 3, C, { min: 1, sep: true }),
  ]);
  const x = c.getContext('2d');
  civetFace(x, 6, 8);
  R(x, '#2a1a12', 0, 7, 2, 2);
  R(x, '#cfd8e0', 40, 4, 3, 1); R(x, '#aebcc8', 38, 10, 4, 1);                                       // vạch gió
  return c;
}

// Quạ (SPR.crow, art.js): đen ánh xanh tím, mỏ cam, cánh vỗ lên / xuống. left[0] cánh khép dưới, left[1] cánh vỗ lên.
const CROW = ['#0c0c14', '#1c1c2a', '#2e2e42', '#4a4a62'];
function crow(up) {
  const hy = up ? 10 : 6, by = up ? 12 : 8;
  const wing = up
    ? G([[11, 9], [20, 10], [19, 4], [17, 0], [14, 2], [12, 1], [10, 5]], CROW, { sep: true, pat: (px, py) => (py <= 3 && px % 3 === 0 ? null : (px + py) % 4 === 0 ? CROW[1] : undefined) })
    : G([[9, 11], [20, 10], [21, 16], [17, 17], [13, 16], [10, 14]], CROW, { sep: true, pat: (px, py) => ((px + py) % 4 === 0 ? CROW[1] : undefined) });
  const c = fig(24, 18, [
    G([[18, by - 2], [24, by - 1], [24, by + 3], [18, by + 2]], CROW, { max: 1 }),                     // đuôi
    E(13, by, 7, 4.6, CROW, { gloss: 0.6 }),
    E(6.4, hy, 3.6, 3.4, CROW, { sep: true, gloss: 0.7 }),
    wing,
  ]);
  const x = c.getContext('2d');
  R(x, '#f59a23', 0, hy, 3, 2); R(x, '#f7d547', 0, hy); R(x, '#b86a10', 1, hy + 1, 2, 1); R(x, OUT, 0, hy + 2, 3, 1);   // mỏ
  R(x, '#ffffff', 5, hy - 2, 2, 2); R(x, EYE, 6, hy - 1);                                             // mắt
  R(x, '#6a7aa8', 10, by - 3, 3, 1);                                                                  // ánh xanh trên lưng
  R(x, '#e8a030', 12, by + 4, 1, 2); R(x, '#e8a030', 15, by + 4, 1, 2);                               // chân
  return c;
}

// ---------- đồ đi kèm ----------

const WOOD = ['#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868'];
const STONE = ['#4a4650', '#6e6a74', '#918c94', '#b4b0b2', '#dcd8d0'];
const STEEL = ['#4c4c58', '#767686', '#aeaebe', '#dcdce6'];
// Mặt gỗ bẫy: ván có vân, mép trên sáng, mép dưới tối, viền ngoài
function trapBoard(x, y) {
  R(x, OUT, 0, y, 24, 10);
  R(x, WOOD[2], 1, y + 1, 22, 8); R(x, WOOD[3], 1, y + 1, 22, 1); R(x, WOOD[1], 1, y + 7, 22, 2); R(x, WOOD[0], 1, y + 8, 22, 1);
  for (const [gx, gy, gw] of [[3, 3, 6], [12, 4, 8], [6, 5, 5], [16, 2, 4]]) R(x, WOOD[1], gx, y + gy, gw, 1);   // vân gỗ
  R(x, WOOD[3], 20, y + 5, 2, 1);
}
function trapShadow(x, cy) { ell(x, 'rgba(34,22,10,0.28)', 12, cy, 11.4, 1.6); }
function ratTrap() {
  return draw(24, 16, x => {
    trapShadow(x, 14); trapBoard(x, 6);
    // lò xo + thanh kẹp dựng
    R(x, OUT, 3, 2, 16, 1); R(x, OUT, 3, 5, 16, 1);
    R(x, STEEL[1], 4, 3, 14, 2); R(x, STEEL[2], 4, 3, 6, 1); R(x, STEEL[3], 5, 3, 2, 1);
    for (const sx of [8, 10, 12]) R(x, STEEL[0], sx, 7, 1, 2);                                          // vòng lò xo
    R(x, STEEL[2], 10, 8, 4, 3); R(x, STEEL[3], 10, 8); R(x, STEEL[0], 12, 10, 2, 1);                 // chốt gài
    // miếng phô mai có lỗ
    R(x, OUT, 16, 6, 6, 4); R(x, '#f7d547', 17, 7, 4, 2); R(x, '#fff0a0', 17, 7, 2, 1); R(x, '#d19a1c', 19, 8); R(x, '#d19a1c', 20, 7);
  });
}
function ratTrapShut() {
  return draw(24, 16, x => {
    trapShadow(x, 14); trapBoard(x, 6);
    // thanh kẹp thép nằm ngang sát mặt gỗ
    R(x, OUT, 2, 6, 20, 1); R(x, OUT, 2, 10, 20, 1);
    R(x, STEEL[2], 3, 7, 18, 2); R(x, STEEL[1], 3, 9, 18, 1); R(x, STEEL[3], 4, 7, 6, 1);
    // lò xo bẹp bên trái, chốt bật ra bên phải
    R(x, OUT, 0, 4, 6, 2); R(x, STEEL[1], 1, 4, 4, 1); R(x, STEEL[0], 2, 10, 2, 2);
    R(x, STEEL[0], 18, 8, 2, 3); R(x, STEEL[2], 20, 10, 2, 1); R(x, OUT, 22, 10);
  });
}
function ratTrapFull() {
  return draw(24, 18, x => {
    trapShadow(x, 16); trapBoard(x, 8);
    // chuột xám nằm bẹp, đầu thò bên trái
    const r = fig(20, 10, [E(12, 5.4, 6.8, 3.6, P.rat, { pat: ratFur }), ratEar(7, 2.6, 1.5), E(4.6, 6, 3.8, 3.2, P.rat, { sep: true })]);
    const rx = r.getContext('2d');
    lid(rx, OUT, 3, 4, 4); R(rx, P.pink, 0, 6, 2, 2);
    x.drawImage(r, 0, 4);
    ratTail(x, [[18, 10], [20, 12], [23, 13]]);
    // thanh kẹp thép đè ngang lưng chuột
    R(x, OUT, 8, 2, 14, 1); R(x, STEEL[3], 10, 4, 4, 1); R(x, STEEL[2], 9, 3, 12, 2); R(x, STEEL[3], 10, 3, 4, 1); R(x, STEEL[1], 9, 5, 12, 2);
    R(x, OUT, 8, 7, 14, 1); R(x, OUT, 8, 3, 1, 4); R(x, STEEL[0], 20, 3, 2, 4);
    // lò xo bẹp bên trái
    R(x, OUT, 2, 2, 8, 2); R(x, STEEL[1], 3, 3, 4, 1); R(x, STEEL[0], 5, 5, 2, 2); R(x, OUT, 2, 4, 1, 2);
    // vòng sao choáng
    R(x, '#fff3a0', 3, 0); R(x, '#fff3a0', 6, 1);
  });
}
function hurtPatch() {
  const CO = Math.cos(0.5), SI = Math.sin(0.5);
  const c = pix(24, 20, (px, py) => {
    const X = (px + 0.5) / 2 - 6, Y = (py + 0.5) / 2 - 5;
    const u = X * CO - Y * SI, v = X * SI + Y * CO;
    if (Math.abs(u) > 4.6 || Math.abs(v) > 2.3) return null;
    const base = v < -1.2 ? '#fffaf0' : v < 0.9 ? '#f2e6d2' : '#d8c8ac';
    return (Math.round(u * 2) + Math.round(v * 2)) % 3 === 0 && v > -1.2 ? mix(base, '#c8b490', 0.4) : base;   // sợi gạc
  });
  outline(c);
  const x = c.getContext('2d');
  for (const [tx, ty, sy] of [[20, 6, -1], [3, 14, 1]]) {
    R(x, '#c8b490', tx, ty, 2, 2); R(x, '#e2d4b4', tx, ty);
    line(x, '#c8b490', tx + (sy < 0 ? 2 : -1), ty + sy * 1, tx + (sy < 0 ? 3 : -2), ty + sy * 3); R(x, OUT, tx + (sy < 0 ? 3 : -2), ty + sy * 4);
  }
  // vết máu thấm loang ở giữa
  R(x, '#9e2416', 10, 10, 4, 2); R(x, '#c0302a', 10, 8, 3, 2); R(x, '#e5452f', 11, 9, 2, 1); R(x, '#9e2416', 9, 12, 2, 1); R(x, '#c0302a', 13, 11);
  return c;
}
function grave(flower) {
  return draw(24, 28, x => {
    ell(x, 'rgba(34,22,10,0.28)', 12, 24, 10.8, 2.6);
    // gò đất cỏ: viền, mặt cỏ sáng trên, tối dưới, lá cỏ lởm chởm
    ell(x, OUT, 12, 22, 11, 4); ell(x, '#3d8c2a', 12, 22, 10, 3.2); ell(x, '#5fb33e', 11.5, 21.4, 9, 2.4); ell(x, '#8fd65a', 9, 20.6, 4.6, 1);
    for (const gx of [3, 7, 15, 19]) { R(x, '#3d8c2a', gx, 19, 1, 2); R(x, '#8fd65a', gx + 1, 18); }
    // bia đá bo tròn: mặt sáng trái, cạnh tối phải, rêu, vết nứt
    R(x, OUT, 4, 5, 16, 16); R(x, OUT, 5, 3, 14, 2); R(x, OUT, 7, 2, 10, 1); R(x, OUT, 9, 1, 6, 1);
    R(x, STONE[3], 5, 5, 14, 15); R(x, STONE[3], 6, 3, 12, 2); R(x, STONE[3], 8, 2, 8, 1);
    R(x, STONE[4], 5, 5, 3, 1); R(x, STONE[4], 6, 4, 4, 1); R(x, STONE[4], 8, 2, 3, 1); R(x, STONE[4], 5, 6, 1, 6);
    R(x, STONE[2], 15, 4, 4, 16); R(x, STONE[1], 18, 6, 1, 14); R(x, STONE[1], 5, 18, 14, 2); R(x, STONE[0], 5, 20, 14, 1);
    R(x, '#6a8a4a', 5, 17, 3, 1); R(x, '#6a8a4a', 6, 16); R(x, '#7aa25a', 17, 17, 2, 1);               // rêu
    line(x, STONE[1], 16, 6, 14, 9);                                                                   // vết nứt
    // dấu chân thú khắc: đệm lớn + bốn ngón, có mép sáng
    const paw = [[10, 11, 4, 3], [9, 8, 2, 2], [11, 7, 2, 2], [13, 7, 2, 2], [15, 8, 2, 2]];
    for (const [a, b, w, h] of paw) { R(x, STONE[1], a, b, w, h); R(x, STONE[4], a, b + h, w, 1); }
    if (flower) {
      for (const [fx, fy, col] of [[3, 20, '#ff8fb1'], [20, 20, '#f7d547'], [12, 23, '#ffffff']]) {
        R(x, '#3d8c2a', fx, fy + 2, 1, 3); R(x, '#5fb33e', fx + 1, fy + 3);
        R(x, OUT, fx - 2, fy - 1, 5, 3); R(x, OUT, fx - 1, fy - 2, 3, 5);
        R(x, col, fx - 1, fy, 3, 1); R(x, col, fx, fy - 1, 1, 3); R(x, mix(col, '#ffffff', 0.5), fx - 1, fy);
        R(x, '#f59a23', fx, fy);
      }
    }
  });
}
function angel(f) {
  return draw(28, 28, x => {
    const y = f ? 0 : 2;
    // hào quang vàng có điểm sáng
    ell(x, '#9a6a10', 14, 2 + y, 6, 1.4); ell(x, '#f2c040', 14, 2 + y, 5, 0.9); x.clearRect(10, 2 + y, 8, 1);
    R(x, '#fff3a0', 9, 2 + y, 2, 1); R(x, '#fff3a0', 17, 2 + y, 2, 1); R(x, '#ffffff', 10, 1 + y);
    // đôi cánh lông vũ: viền xanh nhạt, lông trắng có vạch
    const wy = f ? 12 : 14;
    for (const s of [-1, 1]) {
      const wx = 14 + s * 10;
      ell(x, '#7a94bc', wx, wy + y, 3.6, 4.8); ell(x, '#ffffff', wx - s * 0.6, wy + y - 0.8, 2.4, 3.6);
      ell(x, '#e2e8f6', wx + s * 0.4, wy + y + 1.4, 1.6, 2);
      for (let k = 0; k < 3; k++) R(x, '#c8d4ea', wx + s * (1 - k), wy + y + 2 + k, 1, 1);
    }
    const cl = ['#c8d4ea', '#e2e8f6', '#f6f8ff', '#ffffff'];
    const body = fig(20, 20, [
      E(4.8, 3.6, 2.4, 3.2, cl), E(15.2, 3.6, 2.4, 3.2, cl),
      E(10, 11, 7.6, 6.8, ['#b8c4de', '#dee4f4', '#f4f6ff', '#ffffff'], { gloss: 0.7 }),
    ]);
    x.drawImage(body, 4, 6 + y);
    // mặt cười nhắm mắt, má hồng
    lid(x, '#3b2412', 9, 16 + y, 3); lid(x, '#3b2412', 16, 16 + y, 3);
    R(x, '#3b2412', 12, 20 + y, 4, 1); R(x, '#3b2412', 11, 19 + y); R(x, '#3b2412', 16, 19 + y);
    R(x, '#ffb0c0', 7, 18 + y, 2, 1); R(x, '#ffb0c0', 19, 18 + y, 2, 1);
  });
}

// ---------- ghép bùn / bệnh ----------

const MUD = ['#3e2a14', '#5a3e1e', '#7a5a2e', '#9a7a48'];
// Vệt bùn rời (fx.dirt): cục bùn có mặt sáng ướt, mép dưới tối, vài giọt chảy.
function mudBlob(x, cx, cy, r) {
  ell(x, MUD[0], cx, cy + 0.5, r + 0.7, r * 0.7 + 0.6);
  ell(x, MUD[1], cx, cy, r, r * 0.65);
  if (r >= 1.5) ell(x, MUD[2], cx - r * 0.3, cy - r * 0.25, r * 0.45, r * 0.25);
  R(x, MUD[3], Math.round(cx - r * 0.5), Math.round(cy - r * 0.45));
}
function dirtOverlay(w, h, n, seed) {
  return draw(w, h, x => {
    for (let i = 0; i < n; i++) {
      const cx = 2 + Math.floor(hash(i * 3 + seed, 7) * (w - 4)), cy = 2 + Math.floor(hash(i * 5 + seed, 13) * (h - 5));
      const r = hash(i, seed) < 0.4 ? 2.2 : 1.3;
      mudBlob(x, cx, cy, r);
      if (hash(i, seed + 9) < 0.4) { R(x, MUD[1], cx, cy + Math.ceil(r), 1, 2); R(x, MUD[0], cx, Math.min(h - 1, cy + Math.ceil(r) + 2)); }   // giọt chảy
    }
  });
}
// Ruồi bay quanh con dơ: thân đen có mắt đỏ, cánh trong vỗ hai thì, vệt bay mờ.
function fliesFrame(f) {
  return draw(20, 16, x => {
    const pts = [[4, 6], [14, 4], [10, 12]];
    const t = f * 2.1;
    pts.forEach(([px, py], i) => {
      const ax = Math.round(px + Math.cos(t + i * 2.2) * 2.8), ay = Math.round(py + Math.sin(t * 1.3 + i * 2.2) * 2.4);
      const tx = Math.round(px + Math.cos(t - 0.9 + i * 2.2) * 2.8), ty = Math.round(py + Math.sin((t - 0.9) * 1.3 + i * 2.2) * 2.4);
      R(x, 'rgba(60,60,60,0.3)', tx, ty, 2, 1); R(x, 'rgba(60,60,60,0.18)', tx + Math.sign(tx - ax), ty + 1);
      const up = (f + i) % 2;
      R(x, up ? '#e8f4ff' : '#c4d4e4', ax - 1, ay - (up ? 2 : 1), 2, 1); R(x, up ? '#d8e8f8' : '#b0c0d0', ax + 1, ay - (up ? 2 : 1), 2, 1);
      R(x, '#14141a', ax, ay, 2, 2); R(x, '#3a3a46', ax, ay); R(x, '#a02020', ax - 1, ay);
    });
  });
}
// Bản 2× của art3.muddy: phủ bùn chỉ lên phần đục của sprite (level 1..3), cục bùn 2–3 điểm có mặt ướt.
const dirtCache = new WeakMap();
export function muddyHD(img, level = 2) {
  let m = dirtCache.get(img);
  if (!m) dirtCache.set(img, m = {});
  if (m[level]) return m[level];
  return m[level] = draw(img.width, img.height, x => {
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    const n = Math.round(img.width * img.height * 0.011 * level);
    for (let i = 0; i < n; i++) {
      const px = Math.floor(hash(i * 7 + 1, img.width) * img.width), py = Math.floor(img.height * (0.35 + 0.65 * hash(i * 3, img.height + 2)));
      const big = hash(i, 9) < 0.5;
      R(x, MUD[1], px, py, big ? 3 : 2, 2); R(x, MUD[0], px, py + 2, big ? 3 : 2, 1);
      R(x, MUD[2], px, py); if (big && hash(i, 4) < 0.5) R(x, MUD[3], px + 1, py);
      if (hash(i, 6) < 0.3) R(x, MUD[0], px + 1, py + 3);
    }
    R(x, 'rgba(90,62,30,' + (0.08 * level) + ')', 0, Math.floor(img.height * 0.6), img.width, img.height);
  });
}
// Heo lăn đầm bùn (52x30): nằm ngửa trong vũng, bốn chân vẫy, mắt nhắm sung sướng, bùn bắn tung.
function heoMud(f) {
  return draw(52, 30, x => {
    ell(x, MUD[0], 26, 22, 25, 7);
    ell(x, MUD[1], 26, 22, 23.4, 5.8);
    ell(x, MUD[2], 22, 20, 14, 2.4);
    R(x, MUD[3], 14, 19, 6, 1); R(x, MUD[3], 30, 21, 4, 1);                                        // mặt bùn bóng
    const PK = P.pig;
    const belly = (px, py, k) => (py >= 16 && hash(px >> 1, (py >> 1) + f) < 0.55 ? MUD[k > 1 ? 2 : 1] : py >= 15 && hash(px, py + f) < 0.25 ? MUD[2] : undefined);
    const pigC = fig(44, 24, [
      B(f ? 12 : 14, 2, 4, 7, PK, { max: 1 }), B(f ? 30 : 28, 2, 4, 7, PK, { max: 1 }),              // chân xa
      E(23.2, 13.2, 15.6, 7.6, PK, { pat: belly, gloss: 0.75 }),
      B(f ? 16 : 18, 2, 4, 7, PK, { sep: true, min: 1 }), B(f ? 26 : 24, 2, 4, 7, PK, { sep: true, min: 1 }),
      E(9.2, 12.8, 7.4, 6.8, PK, { sep: PK[1], gloss: 0.85 }),
      E(10.8, 18.6, 3.6, 2.4, PK, { sep: true, max: 1 }),                                           // tai lật
      E(3.8, 11.2, 2.6, 3.4, P.snout, { sep: true, gloss: 0.6 }),
    ]);
    const px = pigC.getContext('2d');
    for (const lx of [f ? 16 : 18, f ? 26 : 24]) R(px, '#8a3c50', lx, 2, 4, 2);                     // móng
    R(px, P.snout[3], 1, 9, 1, 5); R(px, '#5a1a2e', 2, 9, 1, 2); R(px, '#5a1a2e', 2, 13, 1, 2);
    lid(px, OUT, 7, 8, 5); R(px, OUT, 6, 7);                                                        // mắt nhắm ^^
    R(px, P.pink, 10, 13, 3, 1);
    pigTail(px, PK, 38, 6);
    x.drawImage(pigC, 4, f ? 2 : 0);
    // bùn bắn
    const sp = f ? [[2, 12], [48, 10], [6, 6], [44, 4], [26, 2]] : [[4, 8], [46, 14], [10, 4], [40, 6], [30, 1]];
    for (const [sx, sy] of sp) { R(x, MUD[0], sx, sy + 1, 2, 2); R(x, MUD[1], sx, sy, 2, 2); R(x, MUD[3], sx, sy); }
    ell(x, MUD[1], 26, 26, 22, 2.2); R(x, MUD[3], 12, 25, 6, 1); R(x, MUD[3], 36, 26, 4, 1); R(x, MUD[0], 8, 28, 36, 1);
  });
}
// Nhuốm sắc xanh tái cho dáng bệnh (giữ nguyên viền).
function sicken(c) {
  const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height);
  const o = parseInt(OUT.slice(1), 16);
  for (let i = 0; i < d.data.length; i += 4) {
    if (d.data[i + 3] < 200) continue;
    const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2];
    if (((r << 16) | (g << 8) | b) === o) continue;
    const t = 0.22;
    d.data[i] = r * (1 - t) + 0xa8 * t; d.data[i + 1] = g * (1 - t) + 0xc0 * t; d.data[i + 2] = b * (1 - t) + 0x90 * t;
  }
  x.putImageData(d, 0, 0);
  return c;
}

// ---------- Xuất ----------

const STAGES = ['non', 'nho', 'truong', 'gia'];
const species = fn => Object.fromEntries(STAGES.map(st => [st, pair(f => fn(st, f))]));
const POSE = { heo: pig, bo: (s, f, p) => cow(s, f, p), boDuc: (s, f, p) => cow(s, f, p, true), cuu: (s, f, p) => sheep(s, f, p), cuuXoan: (s, f, p) => sheep(s, f, p, true) };

export const SPR9 = {
  animal: {
    heo: species(pig), bo: species((st, f) => cow(st, f)), boDuc: species((st, f) => cow(st, f, 'stand', true)),
    cuu: species((st, f) => sheep(st, f)), cuuXoan: species((st, f) => sheep(st, f, 'stand', true)),
  },
  sleep: { heo: pig('truong', 0, 'sleep'), bo: cow('truong', 0, 'sleep'), boDuc: cow('truong', 0, 'sleep', true), cuu: sheep('truong', 0, 'sleep') },
  sick: {},
  sleepBy: {},
  sickBy: {},
  heoMud: [heoMud(0), heoMud(1)],
  fx: {
    dirt: { s: dirtOverlay(20, 12, 5, 1), m: dirtOverlay(32, 16, 8, 2), l: dirtOverlay(44, 20, 12, 3) },
    flies: [0, 1, 2].map(fliesFrame),
  },
  rat: pair(rat),
  ratEat: pair(ratEat),
  ratFlee: pair(ratFlee),
  ratTrophy: ratTrophy(),
  hawk: pair(hawk),
  hawkDive: pair(hawkDive),
  hawkCarry: pair(hawkCarry),
  hawkShadow: hawkShadow(),
  weasel: pair(weasel),
  weaselCatch: pair(weaselCatch),
  hurtPatch: hurtPatch(),
  civet: pair(civet),
  civetCatch: pair(civetCatch),
  civetFlee: pair(civetFlee),
  crow: pair(i => crow(!!i)),
  ratTrap: ratTrap(),
  ratTrapShut: ratTrapShut(),
  ratTrapFull: ratTrapFull(),
  grave: grave(false),
  graveFlower: grave(true),
  angel: [angel(0), angel(1)],
};
for (const [k, fn] of Object.entries(POSE)) {
  SPR9.sleepBy[k] = Object.fromEntries(STAGES.map(st => [st, fn(st, 0, 'sleep')]));
  SPR9.sickBy[k] = Object.fromEntries(STAGES.map(st => [st, sicken(fn(st, 0, 'sick'))]));
  SPR9.sick[k] = SPR9.sickBy[k].truong;
}
// Nguồn của từng khóa cấp trên (để nối vào render): mặc định SPR3
export const SPR9_FROM = { crow: 'SPR' };
