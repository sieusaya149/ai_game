// Vẽ thế giới: lớp nền tĩnh (vẽ một lần) + lớp động mỗi khung hình. Không giữ trạng thái game.
import { SPR, canvas as mkCanvas, sprite, flip, paint, hash, rect, disc, fenceTile } from './art.js';
import { TS, GROUND } from './layout.js';
import { SPR2 } from './art2.js';
import { sceneMap, footprint } from './farm.js';
import { canMove, marketOpen } from './state.js';
import { CROP_STAGES, DAY_MS, NIGHT_FROM } from './data.js';

const FONT = "'Nunito', system-ui, sans-serif";

// ---------- Tiện ích ảnh (tô màu, thu nhỏ; có nhớ tạm) ----------
const imgCache = new WeakMap();
function derived(img, key, make) {
  let m = imgCache.get(img);
  if (!m) imgCache.set(img, m = new Map());
  if (!m.has(key)) m.set(key, make());
  return m.get(key);
}
function tinted(img, color, alpha) {
  return derived(img, `t${color}${alpha}`, () => {
    const c = mkCanvas(img.width, img.height), x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = alpha; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return c;
  });
}
function scaled(img, f) {
  return derived(img, `s${f}`, () => {
    const c = mkCanvas(Math.max(1, Math.round(img.width * f)), Math.max(1, Math.round(img.height * f))), x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(img, 0, 0, c.width, c.height);
    return c;
  });
}
const memo = {};
const once = (k, fn) => memo[k] ??= fn();
const pix = (rows, pal) => sprite(rows, pal);

// ---------- Sprite dự phòng (khi ART chưa bổ sung) ----------
function pigFallback() {
  return once('pig', () => {
    const mk = leg => {
      const c = mkCanvas(18, 13), x = c.getContext('2d');
      rect(x, '#3b2412', 3, 2, 13, 9); rect(x, '#f4a0a8', 4, 3, 11, 7);
      rect(x, '#3b2412', 0, 4, 4, 5); rect(x, '#ff8fa0', 1, 5, 2, 3);
      rect(x, '#3b2412', 4, 0, 4, 3); rect(x, '#e07080', 5, 1, 2, 2);
      rect(x, '#2a2a2a', 5, 5, 1, 1);
      rect(x, '#ffc0c8', 6, 3, 6, 1);
      rect(x, '#3b2412', 15, 3, 2, 2); rect(x, '#e07080', 15, 4, 1, 1);
      rect(x, '#3b2412', 4, 10, 3, 3); rect(x, '#3b2412', 12, 10, 3, 3);
      rect(x, '#e07080', 5, 10, 1, leg ? 1 : 2); rect(x, '#e07080', 13, 10, 1, leg ? 2 : 1);
      return c;
    };
    const left = [mk(0), mk(1)];
    return { left, right: left.map(flip) };
  });
}
function crowFallback() {
  return once('crow', () => {
    const mk = up => {
      const c = mkCanvas(14, 12), x = c.getContext('2d');
      rect(x, '#111', 3, 4, 8, 5); rect(x, '#2b2b3a', 4, 5, 6, 3);
      rect(x, '#111', 1, 3, 4, 4); rect(x, '#f59a23', 0, 5, 2, 1); rect(x, '#fff', 2, 4, 1, 1);
      rect(x, '#111', 10, 5, 3, 2);
      if (up) { rect(x, '#111', 5, 0, 4, 5); rect(x, '#2b2b3a', 6, 1, 2, 3); } else { rect(x, '#111', 5, 8, 4, 3); }
      rect(x, '#f59a23', 5, 9, 1, 2); rect(x, '#f59a23', 8, 9, 1, 2);
      return c;
    };
    const left = [mk(1), mk(0)];
    return { left, right: left.map(flip) };
  });
}
const poopImg = () => SPR.poop ?? once('poop', () => {
  const c = mkCanvas(9, 8), x = c.getContext('2d');
  rect(x, '#3b2412', 1, 5, 7, 3); rect(x, '#8a5a2b', 2, 5, 5, 2);
  rect(x, '#3b2412', 2, 3, 5, 3); rect(x, '#8a5a2b', 3, 3, 3, 2);
  rect(x, '#3b2412', 3, 1, 3, 3); rect(x, '#a8703e', 4, 1, 1, 2);
  rect(x, '#fff', 3, 5, 1, 1); rect(x, '#fff', 5, 5, 1, 1);
  return c;
});
const stinkImgs = () => SPR.stink ?? once('stink', () => [0, 1].map(f => {
  const c = mkCanvas(9, 10), x = c.getContext('2d');
  for (let i = 0; i < 9; i++) { const dx = Math.round(Math.sin((i + f * 3) * 0.9) * 1.6); rect(x, i % 3 === 0 ? '#9ccc5a' : '#7fae45', 3 + dx + (i > 4 ? 2 : 0), 9 - i, 1, 1); }
  return c;
}));
const eggImg = () => SPR.eggGround ?? SPR.product.trung;
const wellImg = () => SPR.well ?? once('well', () => {
  const c = mkCanvas(24, 26), x = c.getContext('2d');
  rect(x, '#3b2412', 2, 0, 20, 4); rect(x, '#d9483b', 3, 1, 18, 2);
  rect(x, '#3b2412', 3, 4, 3, 10); rect(x, '#8a5a2b', 4, 4, 1, 10); rect(x, '#3b2412', 18, 4, 3, 10); rect(x, '#8a5a2b', 19, 4, 1, 10);
  rect(x, '#3b2412', 6, 6, 12, 2); rect(x, '#f3ead2', 11, 8, 2, 4);
  rect(x, '#3b2412', 1, 13, 22, 12); rect(x, '#9a9a94', 2, 14, 20, 10); rect(x, '#c7c7c0', 2, 14, 20, 2);
  for (let i = 0; i < 4; i++) rect(x, '#7a7a74', 4 + i * 5, 18, 3, 1);
  rect(x, '#3b2412', 4, 15, 16, 3); rect(x, '#1f6fd1', 5, 16, 14, 2); rect(x, '#5fb8ff', 6, 16, 5, 1);
  return c;
});
const boardImg = () => SPR.board ?? once('board', () => {
  const c = mkCanvas(24, 24), x = c.getContext('2d');
  x.imageSmoothingEnabled = false; x.drawImage(SPR.sign, 0, 0, 24, 24);
  return c;
});
const decoFallback = kind => once('deco' + kind, () => {
  const c = mkCanvas(20, 26), x = c.getContext('2d');
  if (kind === 'deco_scarecrow') {
    rect(x, '#3b2412', 9, 6, 3, 20); rect(x, '#8a5a2b', 10, 6, 1, 20); rect(x, '#3b2412', 1, 10, 18, 3); rect(x, '#8a5a2b', 2, 11, 16, 1);
    rect(x, '#3b2412', 6, 12, 9, 8); rect(x, '#e5452f', 7, 13, 7, 6);
    disc(x, '#3b2412', 10, 5, 4); disc(x, '#f7d547', 10, 5, 3);
    rect(x, '#3b2412', 4, 1, 13, 2); rect(x, '#8a5a2b', 7, -1, 7, 3); rect(x, '#2a2a2a', 8, 4, 1, 1); rect(x, '#2a2a2a', 12, 4, 1, 1);
  } else if (kind === 'deco_flower') {
    rect(x, '#3b2412', 5, 17, 10, 9); rect(x, '#d9483b', 6, 18, 8, 7);
    for (const [fx, fy, col] of [[5, 12, '#ff8fb1'], [10, 9, '#f7d547'], [14, 13, '#ffffff'], [8, 14, '#e5452f']]) { rect(x, '#2f6b1f', fx + 1, fy + 2, 1, 6); disc(x, col, fx + 1, fy, 2); }
  } else if (kind === 'deco_lamp') {
    rect(x, '#3b2412', 9, 8, 3, 18); rect(x, '#8a5a2b', 10, 8, 1, 18);
    rect(x, '#3b2412', 5, 1, 11, 10); rect(x, '#f7d547', 6, 3, 9, 7); rect(x, '#fff0a0', 8, 4, 4, 4); rect(x, '#e5452f', 5, 0, 11, 3);
    rect(x, '#3b2412', 6, 24, 9, 2);
  } else {
    rect(x, '#3b2412', 1, 10, 18, 7); rect(x, '#c98c4a', 2, 11, 16, 3); rect(x, '#a8703e', 2, 14, 16, 2);
    rect(x, '#3b2412', 2, 16, 3, 6); rect(x, '#3b2412', 15, 16, 3, 6); rect(x, '#3b2412', 1, 4, 18, 4); rect(x, '#c98c4a', 2, 5, 16, 2);
  }
  return c;
});
const decoImg = kind => SPR.deco?.[kind] ?? (kind === 'deco_bench' && SPR2?.bench) ?? decoFallback(kind);

// Nội thất dự phòng (khi SPR2 chưa có): khối gỗ đơn giản đúng kích thước sprite thật
const FURN = { bed: [32, 24, '#e5452f'], wardrobe: [24, 32, '#b07a45'], stove: [24, 24, '#9a9a94'], table: [32, 20, '#c98c4a'],
  pottedPlant: [16, 24, '#3d8c2a'], rug: [48, 32, '#c44434'], window: [16, 16, '#8fd3ff'], doorMat: [16, 16, '#d9b860'] };
const furnFallback = k => once('furn' + k, () => {
  const [w, h, col] = FURN[k] ?? [16, 16, '#b07a45'], c = mkCanvas(w, h), x = c.getContext('2d');
  rect(x, '#3b2412', 0, 0, w, h); rect(x, col, 1, 1, w - 2, h - 2); rect(x, 'rgba(255,255,255,0.25)', 1, 1, w - 2, 2);
  return c;
});
const sprite2 = k => SPR2?.[k] ?? furnFallback(k);

// Lớp nền trong nhà: sàn gỗ, vách sau (2 ô), vách hai bên + dưới, khe cửa sáng, rồi thảm/cửa sổ (props)
function interiorLayer(m) {
  const { mw, mh, W, H, ground } = m, c = mkCanvas(W, H), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  const floors = SPR2?.floors ?? [SPR2?.floorWood].filter(Boolean);
  for (let r = 0; r < mh; r++) for (let col = 0; col < mw; col++) {
    const px = col * TS, py = r * TS;
    if (ground[r * mw + col] === GROUND.FLOOR) {
      if (floors.length) x.drawImage(floors[Math.floor(hash(col, r) * floors.length)], px, py);
      else { rect(x, '#a06a3a', px, py, TS, TS); rect(x, '#4a2c14', px, py + 15, TS, 1); }
    } else if (r < 2) {
      if (r === 0) { if (SPR2?.wallInner) x.drawImage(SPR2.wallInner, px, 0); else { rect(x, '#ead4a8', px, 0, TS, 24); rect(x, '#8a5a2b', px, 24, TS, 8); } }
    } else { rect(x, '#2e1a0c', px, py, TS, TS); rect(x, '#5c3a1a', px + 1, py + 1, TS - 2, TS - 2); rect(x, '#8a5a2b', px + 1, py + 1, TS - 2, 1); }
  }
  for (const d of m.doors) { rect(x, '#5c3a1a', d.x, d.y, d.w, 3); rect(x, '#f3e3b0', d.x, d.y + 3, d.w, d.h - 3); rect(x, '#9bd06a', d.x, d.y + d.h - 5, d.w, 5); }
  for (const p of m.props ?? []) x.drawImage(sprite2(p.sprite), p.x, p.y);
  return c;
}

const STATUS_ROWS = {
  heart: ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
  sick: ['.MMMMM.', 'MMMMMMM', 'MkMMMkM', 'MMMMMMM', '.MMkMM.', '..M.M..'],
  zzz: ['UUUUU..', '..UU...', '.UU....', 'UUUUU..'],
  pregnant: ['.nn.nn.', 'nnnnnnn', 'nnnnnnn', '.nnnnn.', '..nnn..', '...n...'],
  scared: ['.rr.', '.rr.', '.rr.', '.rr.', '....', '.rr.'],
  hungry: null,
};
function statusIcon(name) {
  const s = SPR.status?.[name];
  if (s) return s;
  if (name === 'hungry') return SPR.grain;
  if (name === 'milk') return SPR.product.sua;
  if (name === 'wool') return SPR.product.len;
  return STATUS_ROWS[name] ? once('st' + name, () => pix(STATUS_ROWS[name])) : null;
}

// ---------- Chọn sprite theo thực thể (world.js cũng dùng để tính vùng bấm) ----------
export function animalImg(type, adult, face, frame) {
  const set = adult ? SPR.animal?.[type] : SPR.baby?.[type];
  if (set) return set[face][frame % set[face].length];
  const ad = SPR.animal?.[type] ?? (type === 'heo' ? pigFallback() : null);
  if (!ad) return null;
  const im = ad[face][frame % ad[face].length];
  return adult ? im : scaled(im, 0.62);
}
export const dogImg = (adult, face, frame) => animalImg('dog', adult, face, frame);
export function crowImg(face, frame) {
  const set = SPR.crow ?? crowFallback();
  return set[face][frame % set[face].length];
}
export const eggSize = () => { const e = eggImg(); return { w: e.width, h: e.height }; };
export const poopSize = () => { const e = poopImg(); return { w: e.width, h: e.height }; };
const spr2 = key => String(key).split('.').reduce((o, k) => o?.[k], SPR2);   // 'villageHouses.1' = phần tử của mảng
export function buildingImg(b) {
  if (b.interior) return spr2(b.sprite) ?? furnFallback(b.sprite);
  if (b.sprite === 'well') return wellImg();
  if (b.sprite === 'board') return boardImg();
  return SPR[b.sprite] ?? null;
}
export function decoSize(kind) { const i = decoImg(kind); return { w: i.width, h: i.height }; }

// ---------- Lớp nền tĩnh ----------
// Vẽ lại khi bố cục vườn đổi (farm.rev)
const layers = new WeakMap();   // mỗi bản đồ một lớp nền, đi qua lại giữa các bản đồ khỏi vẽ lại
export function staticLayer(m) {
  let hit = layers.get(m);
  if (!hit) layers.set(m, hit = m.interior ? interiorLayer(m) : outdoorLayer(m));
  return hit;
}
function outdoorLayer(m) {
  const { ground, solid, fences, mw: MW, mh: MH, W, H, mud: MUD } = m;
  const gAt = (c, r) => (c < 0 || r < 0 || c >= MW || r >= MH) ? -1 : ground[r * MW + c];
  const isRoad = (c, r) => { const g = gAt(c, r); return g === GROUND.ROAD || g === -1; };
  const land = paint(W, H, (px, py) => {
    const tc = px >> 4, tr = py >> 4, lx = px & 15, ly = py & 15;
    const g = ground[tr * MW + tc], n = hash(px, py);
    if (g === GROUND.ROAD) {
      let d = 99;
      if (!isRoad(tc - 1, tr)) d = Math.min(d, lx);
      if (!isRoad(tc + 1, tr)) d = Math.min(d, 15 - lx);
      if (!isRoad(tc, tr - 1)) d = Math.min(d, ly);
      if (!isRoad(tc, tr + 1)) d = Math.min(d, 15 - ly);
      for (const [dc, dr] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (!isRoad(tc + dc, tr + dr) && isRoad(tc + dc, tr) && isRoad(tc, tr + dr)) {
          d = Math.min(d, Math.max(dc < 0 ? lx : 15 - lx, dr < 0 ? ly : 15 - ly));
        }
      }
      if (d === 0) return '#a98b56';
      if (d === 1) return n < 0.6 ? '#c3a571' : '#d1b683';
      if (d === 2 && n < 0.3) return '#d1b683';
      if (n < 0.07) return '#c8ab77';
      if (n > 0.96) return '#ecd9a8';
      if (hash(px >> 2, py >> 2) < 0.18) return '#d6bb86';
      return '#dcc490';
    }
    if (g === GROUND.FOREST) {
      const b = hash(px >> 3, py >> 3);
      if (n < 0.06) return '#1f3d16';
      return b < 0.3 ? '#2c5520' : b > 0.8 ? '#36662a' : '#305c24';
    }
    if (g === GROUND.FIELD) return n < 0.08 ? '#6a4324' : '#7b512b';
    if (g === GROUND.PEN) {
      let col = '#c9a56b';
      const b = hash(px >> 2, py >> 2);
      if (b < 0.2) col = '#bf9a60'; else if (b > 0.85) col = '#d4b37a';
      if (n < 0.05) col = '#a9854f';
      const s = hash((px >> 1) + 31, py + 17);
      if (s < 0.05) col = '#efd067'; else if (s < 0.08) col = '#dcb13c';
      if (hash(px >> 2, py * 3 + 9) < 0.05 && (px & 3) < 3) col = '#f0d668';
      return col;
    }
    if (g === GROUND.MUD) {
      const b = hash(px >> 2, py >> 2);
      if (b < 0.28) return '#5f3f23';
      if (n > 0.95) return '#8b6a44';
      return n < 0.1 ? '#654427' : '#6f4c2c';
    }
    // cỏ: mảng màu + đốm + viền mềm sát đường đất
    if ((lx === 0 && isRoad(tc - 1, tr) && gAt(tc - 1, tr) === GROUND.ROAD) || (lx === 15 && gAt(tc + 1, tr) === GROUND.ROAD)
      || (ly === 0 && gAt(tc, tr - 1) === GROUND.ROAD) || (ly === 15 && gAt(tc, tr + 1) === GROUND.ROAD)) {
      if (n < 0.65) return '#5d9f3d';
    }
    const b = hash(px >> 3, py >> 3);
    let col = b < 0.22 ? '#67b142' : b > 0.86 ? '#74c24d' : '#6cb846';
    if (n < 0.05) col = '#57a238';
    else if (n < 0.075 && hash(px, py - 1) < 0.5) col = '#5aa63a';
    else if (n > 0.985) col = '#93d95e';
    return col;
  });

  const staticCanvas = mkCanvas(W, H);
  const x = staticCanvas.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(land, 0, 0);

  // vũng bùn chuồng heo
  if (MUD && SPR.mud) x.drawImage(SPR.mud, MUD.x, MUD.y);
  else if (MUD) {
    x.fillStyle = '#3f2a16'; x.beginPath(); x.ellipse(MUD.x + MUD.w / 2, MUD.y + MUD.h / 2, MUD.w / 2, MUD.h / 2, 0, 0, 7); x.fill();
    x.fillStyle = '#54381d'; x.beginPath(); x.ellipse(MUD.x + MUD.w / 2, MUD.y + MUD.h / 2, MUD.w / 2 - 2, MUD.h / 2 - 2, 0, 0, 7); x.fill();
    x.fillStyle = '#7d5a36'; x.fillRect(MUD.x + 10, MUD.y + 6, 6, 1); x.fillRect(MUD.x + 22, MUD.y + 12, 5, 1);
  }

  // hàng rào, xếp theo hàng để chồng lớp đúng
  for (const f of [...fences].sort((a, b) => a.r - b.r || a.c - b.c)) fenceTile(x, f.kind, f.c * TS, f.r * TS);

  // cỏ và hoa lác đác
  const nearRoad = (c, r) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => gAt(c + a, r + b) === GROUND.ROAD);
  for (let r = 0; r < MH; r++) for (let c = 0; c < MW; c++) {
    if (ground[r * MW + c] !== GROUND.GRASS || solid[r * MW + c] || nearRoad(c, r)) continue;
    const h = hash(c * 7 + 3, r * 13 + 5), ox = Math.floor(hash(c, r + 99) * 10) + 1, oy = Math.floor(hash(c + 50, r) * 11) + 2;
    if (h < 0.11) x.drawImage(SPR.tuft, c * TS + ox, r * TS + oy);
    else if (h < 0.15) x.drawImage(SPR.flowers[Math.floor(hash(c + 9, r + 9) * SPR.flowers.length)], c * TS + ox, r * TS + oy);
  }
  return staticCanvas;
}

// ---------- Ban đêm ----------
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
export function nightAmount(state) {
  const f = (state.time % DAY_MS) / DAY_MS;
  return Math.min(smooth(NIGHT_FROM - 0.07, NIGHT_FROM + 0.02, f), 1 - smooth(0.93, 1, f));
}

// ---------- Ô ruộng ----------
export function cropStage(crop) {
  let s = 0;
  for (let i = 0; i < CROP_STAGES.length; i++) if (crop.progress >= CROP_STAGES[i]) s = i;
  return s;
}
function untilledImg() {
  return SPR.soil?.untilled ?? once('untilled', () => paint(16, 16, (px, py) => {
    const edge = px === 0 || py === 0 || px === 15 || py === 15;
    if (edge) return '#8a6a3c';
    return hash(px + 3, py + 8) < 0.12 ? '#7d5f36' : (hash(px, py) < 0.06 ? '#6cb846' : '#a3805a');
  }));
}
function soilImg(p) {
  if (p.soil !== 'tilled') return untilledImg();
  const wet = p.water > 0;
  return SPR.soil ? (wet ? SPR.soil.tilledWet : SPR.soil.tilledDry) : (wet ? SPR.plot : SPR.plotDry);
}
function seedlingImg() {
  return SPR.seedling ?? once('seedling', () => pix(['..b..b..', '.bBb.bBb', '..b..b..'], { b: '#8a5a2b', B: '#3b2412' }));
}
function floweringImg() {
  return SPR.flowering ?? once('flowering', () => {
    const c = mkCanvas(14, 12), x = c.getContext('2d');
    x.drawImage(SPR.grow, 0, 2);
    for (const [fx, fy, col] of [[2, 1, '#ffffff'], [10, 3, '#ffd84a'], [6, 0, '#ff8fb1'], [11, 8, '#ffffff']]) rect(x, col, fx, fy, 2, 2);
    return c;
  });
}
export function cropImg(p) {
  const c = p.crop;
  if (c.dead) return SPR.dead ?? tinted(SPR.grow, '#3b2a18', 0.75);
  if (c.rotten) return SPR.rotten ?? tinted(SPR.grow, '#4a3a20', 0.6);
  const st = cropStage(c);
  let img = st === 0 ? seedlingImg() : st === 1 ? SPR.sprout : st === 2 ? SPR.grow : st === 3 ? floweringImg() : (SPR.ripe[c.id] ?? SPR.grow);
  if (c.sick) img = st >= 1 && SPR.sick ? SPR.sick : tinted(img, '#d4c23a', 0.6);
  return img;
}
// Biểu tượng trong bong bóng của một ô (theo độ ưu tiên)
export function plotProblem(p) {
  const c = p.crop;
  if (c) {
    if (c.dead || c.rotten || c.sick) return 'sick';
    if (c.bugs) return 'bug';
    if (p.water <= 0 && cropStage(c) < 4) return 'dry';
  }
  if (p.weeds) return 'weed';
  return null;
}
const problemIcon = k => k === 'bug' ? SPR.problem.bug : k === 'weed' ? SPR.problem.weed : k === 'dry' ? SPR.problem.dry : statusIcon('sick');

// ---------- Chế độ xây dựng: viền các thứ dời được, bóng xanh/đỏ chỗ định đặt ----------
// b: { ghost: { id, c, r, w, h, ok } | null }
function drawBuild(ctx, state, m, b, now) {
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]); ctx.lineDashOffset = -Math.floor(now / 120) % 5;
  ctx.strokeStyle = 'rgba(255,248,225,0.75)';
  for (const e of state.farm.ents) {
    if (!canMove(e) || e.id === b.ghost?.id) continue;
    const ft = footprint(e);
    ctx.strokeRect(ft.c * TS + 0.5, ft.r * TS + 0.5, ft.w * TS - 1, ft.h * TS - 1);
  }
  ctx.setLineDash([]);
  const g = b.ghost;
  if (!g) return;
  const e = state.farm.ents.find(x => x.id === g.id);
  const dx = e ? (g.c - e.c) * TS : 0, dy = e ? (g.r - e.r) * TS : 0;
  const col = g.ok ? '90,220,90' : '240,70,60';
  ctx.fillStyle = `rgba(${col},0.38)`; ctx.fillRect(g.c * TS, g.r * TS, g.w * TS, g.h * TS);
  ctx.strokeStyle = `rgba(${col},0.95)`; ctx.lineWidth = 2;
  ctx.strokeRect(g.c * TS + 1, g.r * TS + 1, g.w * TS - 2, g.h * TS - 2);
  // vẽ mờ công trình ở chỗ mới
  ctx.globalAlpha = 0.6;
  const bd = m.buildings.find(x => x.ent === e && x.ent.kind !== 'pen'), im = bd && buildingImg(bd);
  if (im) ctx.drawImage(im, Math.round(bd.x + dx), Math.round(bd.y + dy));
  const dc = m.decos.find(x => x.ent === e), di = dc && decoImg(dc.kind);
  if (di) ctx.drawImage(di, Math.round(dc.x + dx - di.width / 2), Math.round(dc.y + dy - di.height + 1));
  ctx.globalAlpha = 1;
}

// ---------- Vẽ một khung hình ----------
// f: { state, w (world), cam:{x,y}, scale, width, height, dpr, now, target, busy, fx }
export function render(ctx, f) {
  const { state, w: wd, scale, width, height, dpr, now } = f;
  const camX = Math.round(f.cam.x * scale), camY = Math.round(f.cam.y * scale);
  const toSX = wx => wx * scale - camX, toSY = wy => wy * scale - camY;
  const PAD = 40;
  const vl = camX / scale - PAD, vt = camY / scale - PAD, vr = (camX + width) / scale + PAD, vb = (camY + height) / scale + PAD;
  const vis = (x, y, r = 30) => x > vl - r && x < vr + r && y > vt - r && y < vb + r;
  const night = nightAmount(state);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const m = sceneMap(state), indoor = !!m.interior, farm = m.scene === 'farm';   // ngoài vườn mới vẽ con vật, chó, quạ, trứng, phân
  ctx.fillStyle = indoor ? '#1a100a' : '#25491a';
  ctx.fillRect(0, 0, width, height);
  ctx.setTransform(scale, 0, 0, scale, -camX, -camY);
  ctx.drawImage(staticLayer(m), 0, 0);

  const blit = (img, x, y) => { if (img) ctx.drawImage(img, Math.round(x), Math.round(y)); };
  const shadow = (x, y, rx) => {
    ctx.fillStyle = 'rgba(20,40,10,0.22)';
    ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y) - 0.5, rx, rx * 0.38, 0, 0, 7); ctx.fill();
  };

  // 1) đất ruộng
  const nextLocked = wd.nextLocked(state);
  for (const p of state.plots) {
    const pt = m.plotTile(p.idx);
    if (!pt) continue;
    const px = pt.c * TS, py = pt.r * TS;
    if (!vis(px, py, 20)) continue;
    if (!p.unlocked) {
      blit(SPR.wild, px, py);
      if (p.idx === nextLocked) {
        ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(px, py, 16, 16);
        rect(ctx, '#3b2412', px + 5, py + 7, 7, 6); rect(ctx, '#f7d547', px + 6, py + 8, 5, 4); rect(ctx, '#d19a1c', px + 8, py + 9, 1, 2);
        rect(ctx, '#3b2412', px + 6, py + 4, 5, 4); rect(ctx, '#b8b8b8', px + 7, py + 5, 3, 3);
        rect(ctx, '#f7d547', px + 6, py + 8, 5, 4); rect(ctx, '#3b2412', px + 8, py + 9, 1, 2);
      }
    } else blit(soilImg(p), px, py);
  }

  // 2) bóng dưới chân
  shadow(state.player.x, state.player.y, 6);
  const animals = farm ? state.animals : [], threats = farm ? state.threats ?? [] : [];
  for (const a of animals) if (a.x != null && vis(a.x, a.y)) shadow(a.x, a.y, a.type === 'bo' ? 11 : a.type === 'cuu' ? 8 : a.adult ? 6 : 4);
  if (farm && state.dog.x != null) shadow(state.dog.x, state.dog.y, 6);
  for (const t of threats) if (t.x != null) shadow(t.x, t.y, t.kind === 'crow' ? 4 : 6);

  // 3) các vật nhô lên, sắp theo y chân
  const items = [];
  const add = (y, fn) => items.push({ y, fn });
  const bubbles = [];
  const bub = (x, y, icon, key) => { if (icon) bubbles.push({ x, y, icon, key }); };

  for (const t of [...m.trees, ...m.border]) if (vis(t.x, t.y, 30)) add(t.y, () => blit(SPR.tree, t.x - 16, t.y - 44));
  for (const b of m.bushes) if (vis(b.x, b.y, 20)) add(b.y, () => blit(SPR.bush, b.x - 8, b.y - 14));

  for (const b of m.buildings) {
    const img = b.id === 'bed' && wd.sleeping && SPR2?.bedSleep ? SPR2.bedSleep : buildingImg(b);   // đang ngủ: giường có người nằm
    if (!img) continue;
    add((b.foot.r + b.foot.h) * TS, () => blit(img, b.x, b.y));
    if (b.npc) {   // người đứng cạnh công trình (Bà Tư), thở nhẹ hai nhịp
      const idle = SPR2?.[b.npc.key + 'Idle'], im = idle?.[Math.floor(now / 700) % idle.length];
      if (im) add(b.npc.y, () => blit(im, b.npc.x - 8, b.npc.y - 24));
    }
    if (b.id === 'market' && SPR2?.marketClosed && !marketOpen(state)) add((b.foot.r + b.foot.h) * TS + 0.5, () => blit(SPR2.marketClosed, b.x + 12, b.y + 22));
  }
  for (const [pen, p] of Object.entries(m.pens)) {
    const tr = p.trough, n = state.troughs?.[pen] ?? 0;
    add(tr.y, () => {
      blit(SPR.trough, tr.x - 13, tr.y - 12);
      if (n <= 0) { rect(ctx, '#8a5a2b', tr.x - 12, tr.y - 9, 24, 3); rect(ctx, '#6b4020', tr.x - 12, tr.y - 9, 24, 1); }
      else { rect(ctx, '#3b2412', tr.x - 10, tr.y + 1, 20, 3); rect(ctx, '#5fd35f', tr.x - 9, tr.y + 2, Math.max(1, Math.round(18 * Math.min(1, n / 20))), 1); }
    });
  }
  // ổ ấp trứng cạnh chuồng gà nhỏ
  const coop = m.building('coop');
  if (coop) add(coop.at.y - 2, () => {
    const im = state.nest?.egg ? SPR.nestEgg : SPR.nestEmpty;
    if (im) blit(im, coop.at.x - im.width / 2, coop.at.y - im.height);
    else {
      rect(ctx, '#3b2412', coop.at.x - 8, coop.at.y - 6, 16, 6); rect(ctx, '#e8c34a', coop.at.x - 7, coop.at.y - 5, 14, 4);
      if (state.nest?.egg) { rect(ctx, '#3b2412', coop.at.x - 3, coop.at.y - 9, 6, 6); rect(ctx, '#fff8e0', coop.at.x - 2, coop.at.y - 8, 4, 4); }
    }
    if (state.nest?.egg) bub(coop.at.x, coop.at.y - 12, SPR.product.trung, 'nest');
  });

  // cây trồng, cỏ, sâu
  for (const p of state.plots) {
    const pt = p.unlocked && m.plotTile(p.idx);
    if (!pt) continue;
    const px = pt.c * TS, py = pt.r * TS;
    if (!vis(px, py, 20)) continue;
    const prob = plotProblem(p);
    add(py + 12, () => {
      if (p.crop) {
        const im = cropImg(p);
        blit(im, px + (16 - im.width) / 2, py + 15 - im.height);
        if (p.crop.sick && !p.crop.dead && !p.crop.rotten && !SPR.sick) { /* đã nhuộm vàng */ }
        if (cropStage(p.crop) >= 4 && !p.crop.dead && !p.crop.rotten) {
          for (let i = 0; i < 2; i++) {
            const ph = (now / 450 + p.idx * 0.7 + i * 0.5) % 2;
            if (ph < 1) blit(SPR.sparkle, px + 2 + i * 8 + (p.idx % 3), py + 1 + i * 4);
          }
        }
        if (p.crop.fert) rect(ctx, '#f7d547', px + 1, py + 14, 2, 1);
      }
      if (p.weeds) blit(SPR.problem.weed, px + 3, py + 9);
      if (p.crop?.bugs) blit(SPR.problem.bug, px + 4 + Math.round(Math.sin(now / 260 + p.idx) * 2), py + 3 + (Math.floor(now / 300 + p.idx) % 2));
    });
    if (prob) bub(px + 8, py + 1, problemIcon(prob), 'p' + p.idx);
  }

  // trứng, phân
  for (const e of farm ? state.eggs ?? [] : []) if (e.x != null && vis(e.x, e.y)) add(e.y, () => { const im = eggImg(); blit(im, e.x - im.width / 2, e.y - im.height + 1); });
  for (const p of farm ? state.poops ?? [] : []) {
    if (p.x == null || !vis(p.x, p.y)) continue;
    add(p.y, () => {
      const im = poopImg(), st = stinkImgs();
      blit(im, p.x - im.width / 2, p.y - im.height + 1);
      const s = st[Math.floor(now / 380 + p.id) % st.length];
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(now / 240 + p.id);
      blit(s, p.x - s.width / 2, p.y - im.height - s.height + 3 - Math.round(Math.sin(now / 500 + p.id)));
      ctx.globalAlpha = 1;
    });
  }
  // đồ trang trí
  for (const d of m.decos) {
    if (!vis(d.x, d.y)) continue;
    const im = decoImg(d.kind);
    add(d.y, () => blit(im, d.x - im.width / 2, d.y - im.height + 1));
  }

  // con vật
  for (const a of animals) {
    if (a.x == null || !vis(a.x, a.y)) continue;
    const rt = wd.rt.get('a' + a.id) ?? {};
    const frame = rt.walking ? Math.floor(rt.anim * 7) % 2 : rt.peck ? Math.floor(rt.anim * 6) % 2 : 0;
    const im = animalImg(a.type, a.adult, rt.face ?? 'left', frame);
    if (!im) continue;
    const dy = rt.peck && frame ? 1 : 0;
    add(a.y, () => blit(im, a.x - im.width / 2, a.y - im.height + 1 + dy));
    const emote = wd.emotes.get('a' + a.id);
    let icon = null;
    if (emote && emote.until > now) icon = statusIcon(emote.icon);
    else if (state.time < (a.scaredUntil ?? 0)) icon = statusIcon('scared');
    else if (a.sick) icon = statusIcon('sick');
    else if (a.hunger < 35) icon = statusIcon('hungry');
    else if (a.ready) icon = statusIcon(a.type === 'cuu' ? 'wool' : 'milk');
    else if (a.pregnant) icon = statusIcon('pregnant');
    else if (night > 0.6 && !rt.walking) icon = statusIcon('zzz');
    bub(a.x, a.y - im.height - 1, icon, 'a' + a.id);
  }
  // chó
  const dog = state.dog;
  if (farm && dog.x != null) {
    const rt = wd.rt.get('dog') ?? {};
    const im = dogImg(dog.adult, rt.face ?? 'right', rt.walking ? Math.floor(rt.anim * (rt.run ? 10 : 7)) % 2 : 0);
    if (im) {
      add(dog.y, () => blit(im, dog.x - im.width / 2, dog.y - im.height + 1));
      const emote = wd.emotes.get('dog');
      const icon = emote && emote.until > now ? statusIcon(emote.icon) : dog.hunger < 30 ? statusIcon('hungry') : null;
      bub(dog.x, dog.y - im.height - 1, icon, 'dog');
    }
  }
  // quạ & thằng Tèo
  for (const t of threats) {
    if (t.x == null || !vis(t.x, t.y, 40)) continue;
    const rt = wd.rt.get('t' + t.id) ?? {};
    if (t.kind === 'crow') {
      const alt = rt.alt ?? 0, frame = t.state === 'eating' ? Math.floor(now / 350) % 2 : Math.floor(now / 90) % 2;
      const im = crowImg(rt.face ?? 'left', frame);
      add(t.y + alt + 20, () => blit(im, t.x - im.width / 2, t.y - alt - im.height + 1));
    } else {
      const frames = wd.teoFrames();
      const dir = rt.dir ?? 0, fr = rt.walking ? [1, 0, 2, 0][Math.floor(rt.anim * 8) % 4] : 0;
      const im = frames[dir][dir === 1 || dir === 2 ? (fr === 2 ? 0 : fr) : fr];
      add(t.y, () => blit(im, t.x - 8, t.y - 23));
    }
  }
  // người chơi
  {
    const p = state.player, frames = wd.playerFrames(state.look);
    const dir = p.dir ?? 0;
    const fr = wd.moving ? [1, 0, 2, 0][Math.floor(wd.walkT * 8) % 4] : 0;
    const im = frames[dir][dir === 1 || dir === 2 ? (fr === 2 ? 0 : fr) : fr];
    const shake = wd.stun > 0 ? (Math.floor(now / 60) % 2 ? 1 : -1) : 0;
    if (!wd.sleeping) add(p.y, () => {
      blit(im, p.x - 8 + shake, p.y - 23);
      if (state.stamina <= 0) {   // hết thể lực: thở hồng hộc, mồ hôi bên đầu
        const sw = SPR2?.sweat?.[Math.floor(now / 350) % 2];
        if (sw) blit(sw, p.x + 4, p.y - 29);
      }
    });
  }

  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.fn();

  // 4) lớp phủ: bong bóng, viền chọn, mũi tên, thanh tiến độ
  let bi = 0;
  for (const b of bubbles) {
    if (!vis(b.x, b.y)) continue;
    const bob = Math.round(Math.sin(now / 320 + bi++) * 1);
    const bx = Math.round(b.x - 6), by = Math.round(b.y - 15 + bob);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(SPR.bubble, bx, by);
    ctx.globalAlpha = 1;
    ctx.drawImage(b.icon, Math.round(bx + 6.5 - b.icon.width / 2), Math.round(by + 5.5 - b.icon.height / 2));
  }
  if (wd.build) drawBuild(ctx, state, m, wd.build, now);
  const tg = f.target;
  if (tg && !wd.build) {
    const a = wd.anchorOf(state, tg.target);
    if (a) {
      if (tg.target.kind === 'plot' || tg.target.kind === 'lockedPlot') {
        const { c, r } = m.plotTile(tg.target.idx);
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(now / 150);
        blit(SPR.select, c * TS, r * TS);
        ctx.globalAlpha = 1;
      }
      const extra = bubbles.some(b => Math.abs(b.x - a.x) < 9 && Math.abs(b.y - (a.top + 2)) < 6) ? 15 : 0;
      const bob = Math.sin(now / 170) * 2;
      blit(SPR.arrow, a.x - 4.5, a.top - 9 - extra + bob);
    }
  }
  if (wd.marker) {
    const m = wd.marker, age = (now - m.t0) / 600;
    if (age < 1) {
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - age)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(m.x, m.y, 2 + age * 7, (2 + age * 7) * 0.5, 0, 0, 7); ctx.stroke();
    }
  }
  if (f.busy != null) {
    const p = state.player, bx = Math.round(p.x - 10), by = Math.round(p.y - 31 - (state.stamina <= 0 ? 7 : 0));
    rect(ctx, '#3b2412', bx - 1, by - 1, 22, 6);
    rect(ctx, '#7a5a3a', bx, by, 20, 4);
    rect(ctx, '#5fd35f', bx, by, Math.max(1, Math.round(20 * f.busy)), 4);
    rect(ctx, '#b8f5a0', bx, by, Math.max(1, Math.round(20 * f.busy)), 1);
  }
  if (wd.stun > 0) {
    const p = state.player;
    for (let i = 0; i < 3; i++) {
      const ang = now / 200 + i * 2.1;
      rect(ctx, '#ffe066', Math.round(p.x + Math.cos(ang) * 7 - 1), Math.round(p.y - 26 + Math.sin(ang) * 2), 2, 2);
    }
  }

  // 5) đêm, đèn, mưa
  if (night > 0.01) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(12,20,74,${((indoor ? 0.3 : 0.52) * night).toFixed(3)})`;   // trong nhà có đèn, tối nhẹ hơn
    ctx.fillRect(0, 0, width, height);
    ctx.setTransform(scale, 0, 0, scale, -camX, -camY);
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, rgb, a) => {
      if (!vis(x, y, r)) return;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, `rgba(${rgb},${(a * night).toFixed(3)})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    for (const d of m.decos) if (d.kind === 'deco_lamp') { const im = decoImg(d.kind); glow(d.x, d.y - im.height * 0.75, 46, '255,190,90', 0.6); }
    const house = m.building('house');
    if (house) for (const wx of [19, 62]) glow(house.x + wx, house.y + 62, 24, '255,205,110', 0.55);
    for (const b of m.buildings) if (b.sprite === 'lampPost') glow(b.x + 6, b.y + 8, 44, '255,190,90', 0.6);   // đèn đường trong làng
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!indoor && state.weather === 'rain') {   // trong nhà: không thấy mưa, mây
    ctx.fillStyle = 'rgba(40,60,100,0.13)'; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(200,228,255,0.55)'; ctx.lineWidth = Math.max(1, Math.round(dpr));
    const len = 14 * dpr, sp = 750 * dpr, n = Math.min(160, Math.round(width * height / (9000 * dpr * dpr)));
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x0 = hash(i, 7) * (width + 100), y0 = hash(i, 11) * height;
      const y = (y0 + now * 0.001 * sp * (0.8 + hash(i, 3) * 0.4)) % (height + len) - len;
      const x = x0 - (y + len) * 0.22;
      ctx.moveTo(x, y); ctx.lineTo(x - len * 0.22, y + len);
    }
    ctx.stroke();
  } else if (!indoor && state.weather === 'cloud') {
    ctx.fillStyle = 'rgba(70,80,100,0.07)'; ctx.fillRect(0, 0, width, height);
  }

  // 6) chữ (tọa độ màn hình)
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const outlined = (text, x, y, size, fill, stroke = '#2a1a0a', lw = 3) => {
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.lineWidth = lw * dpr; ctx.strokeStyle = stroke; ctx.strokeText(text, x, y);
    ctx.fillStyle = fill; ctx.fillText(text, x, y);
  };
  // bảng tên nông trại ở cổng
  const gate = m.building('gate');
  if (gate && vis(gate.x + 20, gate.y + 8, 40)) {
    const text = `Nông trại ${state.name}`;
    let size = Math.round(9 * scale);
    ctx.font = `800 ${size}px ${FONT}`;
    const maxW = 35 * scale;
    while (ctx.measureText(text).width > maxW && size > 6) ctx.font = `800 ${--size}px ${FONT}`;
    ctx.fillStyle = '#3b2412';
    ctx.fillText(text, toSX(gate.x + 20), toSY(gate.y + 7) + size * 0.35);
  }
  // chữ trong làng: tên chỗ, biển "Đóng cửa" của chợ, biển cổng bạn bè
  const fit = (text, x, y, maxW, size, color) => {
    ctx.font = `800 ${size}px ${FONT}`;
    while (ctx.measureText(text).width > maxW && size > 4) ctx.font = `800 ${--size}px ${FONT}`;
    ctx.fillStyle = color; ctx.fillText(text, x, y + size * 0.35);
  };
  for (const b of m.buildings) {
    if (!b.label && !b.sub && b.id !== 'market' && b.id !== 'friendGate') continue;
    const img = buildingImg(b);
    if (!img || !vis(b.x + img.width / 2, b.y + img.height / 2, 40)) continue;
    const cx = b.x + img.width / 2;
    if (b.label) outlined(b.label, toSX(cx), toSY(b.y) - 3 * scale, Math.round(11 * dpr), '#fff6d8');
    if (b.sub) outlined(b.sub, toSX(cx), toSY(b.y + img.height) + 11 * scale, Math.round(11 * dpr), '#ffe9a0');
    if (b.id === 'market' && !marketOpen(state)) fit('Đóng cửa', toSX(b.x + 24), toSY(b.y + 22 + 9), 20 * scale, Math.round(5.5 * scale), '#ffe9a0');
    if (b.id === 'friendGate') fit('Bạn bè', toSX(b.x + 20), toSY(b.y + 18), 14 * scale, Math.round(4.5 * scale), '#4a2c14');
  }
  // tên người chơi
  {
    const p = state.player;
    outlined(state.name, toSX(p.x), toSY(p.y - (f.busy != null ? 33 : 27)), Math.round(11 * dpr), '#ffffff');
  }
  // chữ bay
  for (const e of f.fx) {
    const age = (now - e.t0) / 1400;
    if (age < 0 || age > 1) continue;
    ctx.globalAlpha = age < 0.7 ? 1 : (1 - age) / 0.3;
    outlined(e.text, toSX(e.x), toSY(e.y - 28 - 22 * age), Math.round(15 * dpr), e.color || '#fff', '#2a1a0a', 4);
  }
  ctx.globalAlpha = 1;
}
