// Vẽ thế giới: lớp nền tĩnh (vẽ một lần) + lớp động mỗi khung hình. Không giữ trạng thái game.
import { SPR, canvas as mkCanvas, sprite, flip, paint, hash, rect, disc, fenceTile } from './art.js';
import { TS, GROUND, tileHash, BUILDING_DEFS, FIELD_SIZE } from './layout.js';
import { SPR2 } from './art2.js';
import { SPR4 } from './art4.js';
import { SPR3, muddy } from './art3.js';
import { hdOf, linkPair, charFrames, hdFn } from './hd.js';
import { WELLS } from './artwell.js';
import { SPR52_OLD } from './art52.js';   // sao trên ô ruộng (issue 52)
import { WX } from './artw.js';
import { TANK_ART, BAR_IN } from './arttank.js';
import { SPR53_OLD } from './art53.js';   // trái khổng lồ (issue 53)
import { GH, GH_AT } from './art60.js';   // nhà kính (issue 60)
import { SPR61_OLD } from './art61.js';   // hố ủ phân (issue 61)
import { recolor } from './coat.js';
import { COURIER_ART } from './artcourier.js';
const BARROW = (await import('./artbarrow.js').catch(() => null))?.BARROW ?? null;   // art xe rùa vẽ sau: chưa có thì không vẽ xe cạnh người
import { sceneMap, footprint } from './farm.js';
import { nightAmount, haveItem, canMove, ripeLeft, wilting, marketOpen, dayFraction, actionsFor, nextStrip, dogAsleep as dogNapping, dogQuiet, penUse, penCapOf, penHome, gateOf, isDusk, sickLeft, mmss, dogPost, thiefGear, catsIn, catHouses, seasonGrowMul, plotSeasonMul, frostHold, glassStatus, tankInfo, waterNet, waterOn, autoInfo } from './state.js';
import { cropStar, compostInfo } from './state.js';
import { AUTO_ART } from './art58.js';   // tự động hóa khối ruộng (issue 58)
import { CHUNK_PX, chunkGrid, chunksIn, dirtyChunks } from './perf.js';
import { CROP_STAGES, DAY_MS, NIGHT_FROM, TRADE, TRICKS, TANK, COMPOST } from './data.js';
import { SHOWER_ART } from './art59.js';   // vòi sen chuồng cấp 3 (issue 59)
import { showerInfo } from './state.js';
import { SHOWER } from './data.js';
const PENROT = (await import('./artrot.js').catch(() => null))?.PENROT ?? null;   // chuồng xoay: ảnh nhìn nghiêng quay mặt sang trái (artrot.js), thiếu thì dùng ảnh nhìn thẳng
const sideImg = (im, rot) => (im && rot === 2 ? derived(im, 'flip', flip) : im);   // cửa bên phải: lật ngang ảnh

const FONT = "'Nunito', system-ui, sans-serif";

// ---------- Tiện ích ảnh (tô màu, thu nhỏ; có nhớ tạm) ----------
const imgCache = new WeakMap();
// make(ảnh, k) dựng ảnh dẫn xuất (k = 1 bộ cũ, 2 bản 2x: cỡ tính theo ảnh cũ nhân k để bản 2x đúng gấp đôi);
// ảnh gốc có bản 2x thì dựng luôn bản 2x bằng cùng phép và nối hai bản (hd.js)
function derived(img, key, make) {
  let m = imgCache.get(img);
  if (!m) imgCache.set(img, m = new Map());
  if (!m.has(key)) {
    const v = make(img, 1), h = hdOf(img);
    if (h) linkPair(v, make(h, 2));
    m.set(key, v);
  }
  return m.get(key);
}
function tinted(img, color, alpha) {
  return derived(img, `t${color}${alpha}`, im => {
    const c = mkCanvas(im.width, im.height), x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = alpha; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return c;
  });
}
function scaled(img, f) {
  return derived(img, `s${f}`, (im, k) => {
    const c = mkCanvas(Math.max(1, Math.round(img.width * f)) * k, Math.max(1, Math.round(img.height * f)) * k), x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(im, 0, 0, c.width, c.height);
    return c;
  });
}
// Kiểu A: scale chẵn (main.js) thì mỗi điểm art 2x = scale/2 điểm màn hình, đều. Ép ?scale= lẻ thì cả thế giới dùng bộ cũ.
let HD = true;
// Con vật dơ (art3.muddy): ảnh có bản 2x thì vết bùn vẽ bằng hàm 2x của art9 (muddyHD) cho cùng ảnh dơ
function dirty(img, lv) {
  const v = muddy(img, lv), h = hdOf(img);
  if (h && hdFn.muddyHD && !hdOf(v)) linkPair(v, hdFn.muddyHD(h, lv));
  return v;
}
// Vẽ sprite ở toạ độ thế giới (ctx đã đặt phép biến đổi camera): có bản 2x thì vẽ bản đó vào đúng khung của ảnh cũ
function put(ctx, img, x, y) {
  if (!img) return;
  const h = HD && hdOf(img);
  if (h) ctx.drawImage(h, Math.round(x), Math.round(y), img.width, img.height);
  else ctx.drawImage(img, Math.round(x), Math.round(y));
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
// Trứng đã soi: có phôi = SPR3.eggFertile / eggDuckFertile (sáng, chấm phôi); trống = trứng sáng không chấm. Chưa soi: trứng gà thường, trứng vịt = SPR3.eggDuck.
const eggEmpty = () => once('eggEmpty', () => pix(['....ggg....', '...gOOOg...', '..gOyyyOg..', '..OyywyyO..', '..OyyyyyO..', '..OyyyyyO..', '..OyyyyyO..', '...OyyyO...', '....OOO....'], { g: 'rgba(255,230,140,0.4)', O: '#3b2412', y: '#fff0c0', w: '#ffffff' }));
const eggImgOf = e => (e.candled ? (e.fertile ? (e.sp === 'vit' ? SPR3?.eggDuckFertile : SPR3?.eggFertile) : null) ?? eggEmpty() : e.sp === 'vit' ? SPR3?.eggDuck ?? eggImg() : eggImg());
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
const decoImg = kind => (kind === 'deco_lowfence' ? SPR3?.lowFence?.h : kind === 'grave' ? SPR3?.grave : kind === 'grave_flower' ? SPR3?.graveFlower
  : kind === 'deco_rattrap' ? SPR3?.ratTrap : kind === 'deco_canopy' ? SPR3?.canopy : null)
  ?? SPR.deco?.[kind] ?? (kind === 'deco_bench' && SPR2?.bench) ?? decoFallback(kind);
// Bẫy chuột: đang gài / đã sập (e.shut). Thiếu art thì dùng lại hình bẫy đang gài.
const trapImg = e => (e.shut ? SPR3?.ratTrapFull ?? SPR3?.ratTrapShut : SPR3?.ratTrap) ?? decoImg('deco_rattrap');
// Kẻ săn mồi (issue 43): mỗi loài một bộ hình riêng cho từng tư thế
function predImg(p, rt) {
  const f = Math.floor((rt.anim ?? 0) * 6) % 2;
  const set = p.kind === 'rat' ? (p.state === 'leaving' ? SPR3?.ratFlee : rt.eat ? SPR3?.ratEat : SPR3?.rat)
    : p.kind === 'hawk' ? (p.carry ? SPR3?.hawkCarry : rt.dive ? SPR3?.hawkDive : SPR3?.hawk)
      : (rt.pounce ? SPR3?.weaselCatch : SPR3?.weasel);
  const base = set ?? (p.kind === 'rat' ? SPR3?.rat : p.kind === 'hawk' ? SPR3?.hawk : SPR3?.weasel);
  if (!base) return null;
  const side = base[rt.face === 'right' ? 'right' : 'left'];
  return side[f % side.length];
}

// Hàng rào thấp nằm cạnh hàng rào khác theo chiều dọc (mà không có hàng xóm ngang) thì vẽ cọc dọc
const lowFenceAt = (m, e) => {
  const at = (c, r) => m.decos.some(d => d.kind === 'deco_lowfence' && d.ent.c === c && d.ent.r === r);
  return (!(at(e.c - 1, e.r) || at(e.c + 1, e.r)) && (at(e.c, e.r - 1) || at(e.c, e.r + 1)) ? SPR3?.lowFence?.v : SPR3?.lowFence?.h) ?? decoImg('deco_lowfence');
};

// Nội thất dự phòng (khi SPR2 chưa có): khối gỗ đơn giản đúng kích thước sprite thật
const FURN = { bed: [32, 24, '#e5452f'], wardrobe: [24, 32, '#b07a45'], stove: [24, 24, '#9a9a94'], table: [32, 20, '#c98c4a'],
  pottedPlant: [16, 24, '#3d8c2a'], rug: [48, 32, '#c44434'], window: [16, 16, '#8fd3ff'], doorMat: [16, 16, '#d9b860'],
  phone: [16, 30, '#4c4c58'], vetClinic: [48, 40, '#2f9a4a'] };
const furnFallback = k => once('furn' + k, () => {
  const [w, h, col] = FURN[k] ?? [16, 16, '#b07a45'], c = mkCanvas(w, h), x = c.getContext('2d');
  rect(x, '#3b2412', 0, 0, w, h); rect(x, col, 1, 1, w - 2, h - 2); rect(x, 'rgba(255,255,255,0.25)', 1, 1, w - 2, 2);
  return c;
});
const sprite2 = k => SPR2?.[k] ?? furnFallback(k);

// Lớp nền trong nhà: sàn gỗ, vách sau (2 ô), vách hai bên + dưới, khe cửa sáng, rồi thảm/cửa sổ (props)
function interiorLayer(m, R = 1) {
  const { mw, mh, W, H, ground } = m, c = mkCanvas(W * R, H * R), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.scale(R, R);
  const floors = SPR2?.floors ?? [SPR2?.floorWood].filter(Boolean);
  for (let r = 0; r < mh; r++) for (let col = 0; col < mw; col++) {
    const px = col * TS, py = r * TS;
    if (ground[r * mw + col] === GROUND.FLOOR) {
      if (floors.length) put(x, floors[Math.floor(hash(col, r) * floors.length)], px, py);
      else { rect(x, '#a06a3a', px, py, TS, TS); rect(x, '#4a2c14', px, py + 15, TS, 1); }
    } else if (r < 2) {
      if (r === 0) { if (SPR2?.wallInner) put(x, SPR2.wallInner, px, 0); else { rect(x, '#ead4a8', px, 0, TS, 24); rect(x, '#8a5a2b', px, 24, TS, 8); } }
    } else { rect(x, '#2e1a0c', px, py, TS, TS); rect(x, '#5c3a1a', px + 1, py + 1, TS - 2, TS - 2); rect(x, '#8a5a2b', px + 1, py + 1, TS - 2, 1); }
  }
  for (const d of m.doors) { rect(x, '#5c3a1a', d.x, d.y, d.w, 3); rect(x, '#f3e3b0', d.x, d.y + 3, d.w, d.h - 3); rect(x, '#9bd06a', d.x, d.y + d.h - 5, d.w, 5); }
  for (const p of m.props ?? []) put(x, sprite2(p.sprite), p.x, p.y);
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
  const s = SPR.status?.[name] ?? SPR3?.status?.[name];
  if (s) return s;
  if (name === 'crow') return once('stcrow', () => pix(['...yyyy', '...y..y', '...y..y', '...y.yy', '.yyy.y.', 'yyyy...', '.yy....'], { y: '#f2b81e' }));   // nốt nhạc: gà trống gáy
  if (name === 'hungry') return SPR.grain;
  if (name === 'milk') return SPR.product.sua;
  if (name === 'wool') return SPR.product.len;
  return STATUS_ROWS[name] ? once('st' + name, () => pix(STATUS_ROWS[name])) : null;
}

// ---------- Chọn sprite theo thực thể (world.js cũng dùng để tính vùng bấm) ----------
// a = { type, stage, sex }. Hình theo giai đoạn ở SPR3 (art3.js): con đực có bộ riêng (gà trống, bò đực).
// Thiếu art thì dự phòng bằng sprite cũ: non = SPR.baby, nhỡ = bản thu nhỏ, già = bản nhạt màu.
const SP3 = { dog: 'cho' }, MALE = { ga: 'gaTrong', vit: 'vitDuc', bo: 'boDuc' };
const sp3Key = a => (a.sex === 'm' && MALE[a.type] && SPR3?.animal?.[MALE[a.type]]) ? MALE[a.type] : SP3[a.type] ?? a.type;
export function animalImg(a, face, frame, sleep, run) {
  const stage = a.stage ?? 'truong', key = sp3Key(a);
  // bệnh nặng trở lên: nằm bẹp một chỗ, dáng bệnh riêng của từng loài ở từng giai đoạn
  if (a.sick >= 2) { const z = SPR3?.sickBy?.[key]?.[stage]; if (z) return face === 'right' ? derived(z, 'flip', flip) : z; }
  if (sleep) { const z = SPR3?.sleepBy?.[key]?.[stage]; if (z) return face === 'right' ? derived(z, 'flip', flip) : z; }
  if (run) { const r = SPR3?.run?.[key]?.[stage]; if (r) return r[face][frame % r[face].length]; }   // đang bị lùa: dáng chạy hoảng
  const set3 = SPR3?.animal?.[key]?.[stage];
  if (set3) return set3[face][frame % set3[face].length];
  const baby = SPR.baby?.[a.type];
  if (stage === 'non' && baby) return baby[face][frame % baby[face].length];
  const ad = SPR.animal?.[a.type] ?? (a.type === 'heo' ? pigFallback() : null);
  if (!ad) return null;
  const im = ad[face][frame % ad[face].length];
  if (stage === 'non') return scaled(im, 0.62);
  if (stage === 'nho') return scaled(im, 0.8);
  return stage === 'gia' ? tinted(im, '#d8d0c0', 0.35) : im;
}
// Hoạt cảnh tắm: bọt phủ (1.2 giây), lắc mình văng nước (0.8), lấp lánh sạch (1.0). main.js đẩy vào wd.baths khi tắm.
// Vòi sen tắm (b.shower, issue 59): hạt nước rơi thay cho bọt xà phòng.
export const BATH_MS = 3000, WALLOW_MS = 2200, SHOWER_FX_MS = SHOWER.fxMs;
export function bathPhase(b, now) {
  const e = now - b.t0;
  return e < 1200 ? { name: b.shower ? 'rain' : 'soap', t: e / 1200 } : e < 2000 ? { name: 'shake', t: (e - 1200) / 800 } : e < BATH_MS ? { name: 'sparkle', t: (e - 2000) / 1000 } : null;
}
// Con cái mang thai: thân nở ra một chút (bụng to)
const bellied = img => derived(img, 'belly', (im, k) => {
  const c = mkCanvas(Math.round(img.width * 1.2) * k, im.height), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(im, 0, 0, c.width, c.height);
  return c;
});
export const GRAIN_MS = 2800;   // nắm thóc rải ở cửa chuồng còn trên đất chừng này ms
export const ANGEL_MS = 2600;   // thiên thần bay lên trong chừng này ms
export const DEAL_MS = TRADE.visitMs;   // Chú Ba dắt con vật đi: cảnh dài chừng này ms
const angelFallback = () => once('angel', () => {
  const c = mkCanvas(10, 11), x = c.getContext('2d');
  rect(x, '#f7d547', 3, 0, 4, 1); rect(x, '#ffffff', 0, 4, 3, 2); rect(x, '#ffffff', 7, 4, 3, 2); rect(x, '#fff3e0', 3, 2, 4, 8);
  return c;
});
// Màu lông (coat.js): dựng từ chính sprite gốc ở cả bộ cũ lẫn bộ 2x; màu mặc định (thiếu / lạ) thì dùng ảnh gốc
const coated = (img, sp, coat) => (img && coat ? derived(img, 'coat:' + coat, (im, k) => recolor(im, sp, coat, k)) : img);
export const dogImg = (dog, face, frame, sleep) => coated(animalImg({ type: 'dog', stage: dog.stage, sex: 'm' }, face, frame, sleep), 'cho', dog.coat);
// Dáng chó theo động tác lệnh (issue 45): mỗi giai đoạn một bộ art riêng; thiếu art thì về dáng đứng
const DOG_POSE = { sit: 'dogSitBy', beg: 'dogBegBy', herd: 'dogHerdBy', bark: 'dogBarkBy' };
// Cúi đầu ăn ở bát: phần đầu (phía mặt quay về, nửa trên) dịch xuống 1 điểm của bộ cũ, dựng từ chính khung đứng
// của giai đoạn đó (cả bộ cũ lẫn 2x, đúng màu lông) nên không dùng chung hình giữa các giai đoạn
const dipped = (img, face) => derived(img, 'dip' + face, (im, k) => {
  const c = mkCanvas(im.width, im.height), x = c.getContext('2d'), w = im.width, cut = Math.round(w * 0.42), hh = Math.round(im.height * 0.62);
  x.drawImage(im, 0, 0);
  const sx = face === 'right' ? w - cut : 0;
  x.clearRect(sx, 0, cut, hh);
  x.drawImage(im, sx, 0, cut, hh - k, sx, k, cut, hh - k);
  return c;
});
export function dogPoseImg(dog, pose, face, frame) {
  if (pose === 'eat') { const im = dogImg(dog, face, 0); return frame % 2 ? dipped(im, face) : im; }
  const set = pose && SPR3?.[DOG_POSE[pose]]?.[dog.stage];
  return set ? coated(set[face][frame % set[face].length], 'cho', dog.coat) : dogImg(dog, face, frame);
}
// Mèo (issue 44): mỗi dáng một bộ art riêng theo giai đoạn ở art3 (vồ, phơi nắng, ngậm chuột); thiếu art thì về dáng đứng.
// rt = dữ liệu chạy của world.js (hướng, đang đi, đang vồ, đã tới chỗ khoe)
export const catImg = (c, rt) => coated(catBase(c, rt), 'meo', c.coat);
function catBase(c, rt = {}) {
  const st = c.stage ?? 'truong', face = rt.face ?? 'left', base = { type: 'meo', stage: st, sex: c.sex };
  const fr = Math.floor((rt.anim ?? 0) * (rt.walking ? (rt.run ? 10 : 7) : 2)) % 2;
  const pose = key => { const set = SPR3?.[key]?.[st]; return set ? set[face][fr % set[face].length] : null; };
  if (c.sick >= 2 || c.sleep) return animalImg(base, face, 0, c.sleep);
  if (rt.pounceT) return pose('catPounceBy') ?? animalImg(base, face, 0);
  if (c.sun) return pose('catNapBy') ?? animalImg(base, face, 0, true);
  if (c.trophy && !rt.shown) return pose('catMouseBy') ?? animalImg(base, face, 0);
  return animalImg(base, face, rt.walking ? fr : 0);
}
// Chó canh khách (issue 31): đứng sủa thì dáng sủa theo giai đoạn (art3, issue 45); chạy đuổi thì dáng chạy
// theo giai đoạn (art3 dogRunBy, mỗi giai đoạn một bộ 3 khung riêng). Thiếu art thì về dáng đi bộ.
function guardImg(dog, face, rt, now) {
  const fr = Math.floor(now / 110);
  if (!rt.walking) return dogPoseImg(dog, 'bark', face, fr);
  const frames = SPR3?.dogRunBy?.[dog.stage ?? 'truong']?.[face];
  if (frames?.length) return coated(frames[fr % frames.length], 'cho', dog.coat);
  return dogImg(dog, face, Math.floor(rt.anim * 10) % 2);
}
// Sao quay quanh đầu lúc đứng hình; chưa có sprite thì vẽ tạm ba chấm vàng
function stunStars(ctx, blit, x, y, now) {
  const set = SPR2?.stunStars;
  if (set?.length) { const im = set[Math.floor(now / 140) % set.length]; return blit(im, x - im.width / 2, y - im.height); }
  for (let i = 0; i < 3; i++) {
    const a = now / 220 + i * 2.1;
    ctx.fillStyle = '#f7d547';
    ctx.fillRect(Math.round(x + Math.cos(a) * 8) - 1, Math.round(y - 3 + Math.sin(a) * 3) - 1, 2, 2);
  }
}
// Bong bóng "GÂU GÂU!" trên đầu chó; chưa có sprite thì vẽ tạm bằng chữ
function barkBubble(ctx, blit, x, y) {
  const im = SPR2?.barkBubble;
  if (im) return blit(im, x - im.width / 2, y - im.height);
  ctx.font = `bold 9px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#fff6e0';
  const w = ctx.measureText('GÂU GÂU!').width + 6;
  ctx.fillRect(Math.round(x - w / 2), Math.round(y - 12), Math.round(w), 12);
  ctx.fillStyle = '#3b2412'; ctx.fillText('GÂU GÂU!', Math.round(x), Math.round(y - 2));
}
export function crowImg(face, frame) {
  const set = SPR.crow ?? crowFallback();
  return set[face][frame % set[face].length];
}
// Thằng Tèo: nhân vật dựng bằng art.character (world.js vẽ cùng bảng khung hình với người chơi)
export const TEO_LOOK = { skin: 1, hair: 0, hairColor: 4, shirt: 4, pants: 2, hat: 2, acc: 1 };
const COURIER_LOOK = { skin: 0, hair: 0, hairColor: 1, shirt: 2, pants: 0, hat: 1, acc: 0 };   // chỉ dùng khi thiếu art người giao hàng
// Tí Sún: đi / rón rén / bị bắt — mỗi tư thế một bộ sprite riêng (issue 46)
export function tisunImg(pose, face = 'left', frame = 0, dir = 0) {
  if (pose === 'caught') return SPR3?.npcTiSunCaught ?? null;
  if (pose === 'sneak') { const a = SPR3?.npcTiSunSneak?.[face]; if (a) return a[frame % a.length]; }
  const set = SPR3?.npcTiSun;
  return set ? set[dir][frame % set[dir].length] : null;
}
// Chồn hương: đi đêm / bắt / bị đuổi. Chưa có art thì mượn tạm con chồn của kẻ săn mồi.
export function civetImg(pose = 'walk', face = 'left', frame = 0) {
  const key = pose === 'catch' ? 'civetCatch' : pose === 'flee' ? 'civetFlee' : 'civet';
  const a = SPR3?.[key]?.[face] ?? SPR3?.weasel?.[face];
  return a ? a[frame % a.length] : null;
}
const oneOf = v => (Array.isArray(v) ? v[0] : v) ?? null;
// Đồ thằng Tèo sắm sau mỗi lần bị bắt: đèn pin rồi giày êm (issue 46)
function teoGear(blit, state, t, face) {
  const g = thiefGear(state);
  const sh = g.shoes && oneOf(SPR3?.thiefShoes?.[face]);
  if (sh) blit(sh, Math.round(t.x - sh.width / 2), t.y - sh.height + 1);
  const to = g.torch && oneOf(SPR3?.thiefTorch?.[face]);
  if (to) blit(to, face === 'right' ? t.x + 4 : t.x - 4 - to.width, t.y - 15);
}
export const eggSize = () => { const e = eggImg(); return { w: e.width, h: e.height }; };
export const poopSize = () => { const e = poopImg(); return { w: e.width, h: e.height }; };
const spr2 = key => String(key).split('.').reduce((o, k) => o?.[k], SPR2);   // 'villageHouses.1' = phần tử của mảng
// Hộp quà và sổ lưu bút ở cổng (issue 29): sprite đổi theo trạng thái — đang mở bảng, đang có quà chờ, hay đóng
export function gateImg(id, s) {
  const g = s.gate ?? {};
  if (id === 'giftbox') return (g.open === id && SPR2?.giftBoxOpen) || (g.gifts > 0 && SPR2?.giftBoxFull) || SPR2?.giftBox;
  return (g.open === id && SPR2?.guestBookOpen) || SPR2?.guestBook;
}
const spr3 = key => String(key).split('.').reduce((o, k) => o?.[k], SPR3);   // công trình vẽ ở art3 (trạm thú y)
const PEN_SHORT = { chicken: 'Gà', pig: 'Heo', pasture: 'Bò cừu', quarantine: 'Cách ly' };
// Hình mức nước của bồn (0 = cạn … 4 = đầy, TANK_FRAC)
export function tankStage(s) {
  const k = s ? tankInfo(s) : null;
  if (!k?.cap || k.level <= 0) return 0;
  if (k.level >= k.cap) return 4;
  const f = k.level / k.cap;
  return f < 0.375 ? 1 : f < 0.625 ? 2 : 3;
}
// s (tuỳ chọn): bồn vẽ theo mực nước, trạm bơm phụ theo điện; không có s thì hình mặc định
export function buildingImg(b, s) {
  if (b.interior) return spr2(b.sprite) ?? spr3(b.sprite) ?? WX[b.sprite] ?? furnFallback(b.sprite);   // WX: radio, bảng tin làng (issue 55)
  if (b.sprite === 'well') return WELLS[(b.ent?.lv ?? 1) - 1] ?? wellImg();   // giếng 4 cấp (issue 56)
  if (b.sprite === 'tank' || b.sprite === 'tank2') return TANK_ART?.[b.sprite][tankStage(s)] ?? null;   // bồn chứa, bồn phụ (issue 57)
  if (b.sprite === 'booster') return TANK_ART?.booster[s && !waterOn(s, b.ent) ? 'off' : 'on'] ?? null;
  if (b.sprite === 'board') return boardImg();
  if (b.sprite === 'doghouse' && SPR3?.doghouse) return SPR3.doghouse[(b.ent?.lv ?? 1) - 1] ?? SPR3.doghouse[0];   // chuồng chó 3 cấp
  if (b.sprite === 'cathouse' && SPR3?.cathouse) return SPR3.cathouse[(b.ent?.lv ?? 1) - 1] ?? SPR3.cathouse[0];   // nhà mèo 3 cấp
  if (b.sprite === 'compost') return SPR61_OLD.compost?.[0] ?? null;   // cỡ hố ủ (hình theo trạng thái: compostImg)
  if (b.sprite === 'coop' && b.rot && PENROT?.incubator) return sideImg(PENROT.incubator, b.rot);   // ổ ấp chuồng xoay: nhìn đầu hồi 30x36, đáy khung = chân ô (layout nest.spr)
  return SPR[b.sprite] ?? SPR2?.[b.sprite] ?? null;
}
// Hố ủ phân (issue 61): hình theo trạng thái rỗng / đang bỏ đồ / đang ủ / đã xong
const COMPOST_IMG = { empty: 0, filling: 1, composting: 2, ready: 3 };
export function compostImg(s) {
  const i = compostInfo(s);
  return SPR61_OLD.compost?.[COMPOST_IMG[i?.state] ?? 0] ?? null;
}
export function decoSize(kind) { const i = decoImg(kind); return { w: i.width, h: i.height }; }

// ---------- Lớp nền tĩnh ----------
// Ngoài trời chia mảng 16x16 ô, mỗi mảng một canvas vẽ lười (lúc cần blit lần đầu). Bố cục vườn đổi (farm.rev) thì
// chỉ bỏ các mảng khác bản trước (perf.dirtyChunks), mảng còn lại dùng lại canvas cũ. Trong nhà nhỏ nên một canvas.
const layers = new WeakMap();   // mỗi bản đồ một lớp nền, đi qua lại giữa các bản đồ khỏi vẽ lại
let lastFarm = null;            // lớp vườn gần nhất, để mượn mảng chưa đổi
let chunkDraws = 0;             // số lần vẽ một mảng (đếm để kiểm chứng "chỉ vẽ lại mảng liên quan")
export const chunkStats = () => ({ drawn: chunkDraws });
function layerOf(m) {
  let L = layers.get(m);
  if (L) return L;
  if (m.interior) L = { m, canvas: null };
  else {
    const { cw, ch } = chunkGrid(m.mw, m.mh), prev = m.scene === 'farm' ? lastFarm : null, dirty = dirtyChunks(prev?.m, m);
    // mảng mượn dựng ở độ phân giải của lớp trước (r), drawStatic bỏ hết nếu r khác R hiện tại
    L = { m, cw, r: prev?.r, cv: Array.from({ length: cw * ch }, (_, i) => (prev && !dirty.has(i) ? prev.cv[i] : null)) };
    if (m.scene === 'farm') lastFarm = L;
  }
  layers.set(m, L);
  return L;
}
// Lớp nền dựng ở độ phân giải R (1, hoặc 2 khi có sprite nền 2x), vẽ ra đúng cỡ bản đồ
let staticR = null;
const staticRes = () => (HD ? (staticR ??= hdFn.landHD || [SPR2?.forest?.[0], SPR.mud, SPR.tuft, SPR.flowers?.[0], SPR2?.floors?.[0], SPR2?.floorWood, SPR2?.wallInner].some(hdOf) ? 2 : 1) : 1);
// Vẽ nền của bản đồ m phần trong hình chữ nhật (x0,y0)-(x1,y1) điểm ảnh bản đồ; ctx đã đặt phép biến đổi camera
export function drawStatic(ctx, m, x0, y0, x1, y1) {
  const L = layerOf(m), R = staticRes();
  if (L.r !== R) { L.r = R; L.canvas = null; if (L.cv) L.cv.fill(null); }
  if (m.interior) { ctx.drawImage(L.canvas ??= interiorLayer(m, R), 0, 0, m.W, m.H); return; }
  for (const i of chunksIn(m.mw, m.mh, x0, y0, x1, y1)) ctx.drawImage(L.cv[i] ??= outdoorChunk(m, i, L.cw, R), (i % L.cw) * CHUNK_PX, Math.floor(i / L.cw) * CHUNK_PX, CHUNK_PX, CHUNK_PX);
}
function outdoorChunk(m, ci, cw, R = 1) {
  chunkDraws++;
  const { ground, solid, fences, mw: MW, mh: MH, W, H, mud: MUD } = m;
  const ox = (ci % cw) * CHUNK_PX, oy = Math.floor(ci / cw) * CHUNK_PX;
  const gAt = (c, r) => (c < 0 || r < 0 || c >= MW || r >= MH) ? -1 : ground[r * MW + c];
  const isRoad = (c, r) => { const g = gAt(c, r); return g === GROUND.ROAD || g === -1; };
  // nền 2x (art12.landHD, cùng luật đường đất/cỏ) khi lớp nền dựng ở R = 2
  const land = R === 2 && hdFn.landHD ? hdFn.landHD(m, ox, oy, CHUNK_PX, CHUNK_PX) : paint(CHUNK_PX, CHUNK_PX, (qx, qy) => {
    const px = qx + ox, py = qy + oy;
    if (px >= W || py >= H) return null;
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

  const staticCanvas = mkCanvas(CHUNK_PX * R, CHUNK_PX * R);
  const x = staticCanvas.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.scale(R, R);
  x.drawImage(land, 0, 0, CHUNK_PX, CHUNK_PX);
  x.translate(-ox, -oy);   // từ đây vẽ theo toạ độ bản đồ, phần ngoài mảng tự bị cắt
  // các ô của mảng này (thêm 1 ô quanh cho hình lố ra ngoài ô)
  const c0 = Math.max(0, (ox >> 4) - 1), c1 = Math.min(MW - 1, ((ox + CHUNK_PX) >> 4)), r0 = Math.max(0, (oy >> 4) - 1), r1 = Math.min(MH - 1, ((oy + CHUNK_PX) >> 4));
  // rừng ngoài đất: lát ô cây liền nhau, chọn biến thể theo băm toạ độ (chưa có art thì giữ màu xanh phẳng ở trên)
  const fv = SPR2?.forest;
  if (fv?.length) for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (ground[r * MW + c] === GROUND.FOREST) put(x, fv[tileHash(c, r) % fv.length], c * TS, r * TS);

  // vũng bùn chuồng heo
  const mudHere = MUD && MUD.x < ox + CHUNK_PX && MUD.x + MUD.w > ox && MUD.y < oy + CHUNK_PX && MUD.y + MUD.h > oy;
  const mudV = MUD?.rot && sideImg(PENROT?.mudV, MUD.rot);
  if (mudHere && (mudV || (!MUD.rot && SPR.mud))) put(x, mudV || SPR.mud, MUD.x, MUD.y);
  else if (mudHere) {
    x.fillStyle = '#3f2a16'; x.beginPath(); x.ellipse(MUD.x + MUD.w / 2, MUD.y + MUD.h / 2, MUD.w / 2, MUD.h / 2, 0, 0, 7); x.fill();
    x.fillStyle = '#54381d'; x.beginPath(); x.ellipse(MUD.x + MUD.w / 2, MUD.y + MUD.h / 2, MUD.w / 2 - 2, MUD.h / 2 - 2, 0, 0, 7); x.fill();
    x.fillStyle = '#7d5a36'; x.fillRect(MUD.x + 10, MUD.y + 6, 6, 1); x.fillRect(MUD.x + 22, MUD.y + 12, 5, 1);
  }

  // hàng rào, xếp theo hàng để chồng lớp đúng (nền 2x thì vẽ bằng art11.fenceTileHD, cùng chữ ký)
  const fence = R === 2 && hdFn.fenceTileHD || fenceTile;
  for (const f of fences.filter(f => f.c >= c0 && f.c <= c1 && f.r >= r0 && f.r <= r1).sort((a, b) => a.r - b.r || a.c - b.c)) fence(x, f.kind, f.c * TS, f.r * TS, f.lv);

  // cỏ và hoa lác đác
  const nearRoad = (c, r) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => gAt(c + a, r + b) === GROUND.ROAD);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (ground[r * MW + c] !== GROUND.GRASS || solid[r * MW + c] || nearRoad(c, r)) continue;
    const h = hash(c * 7 + 3, r * 13 + 5), ox = Math.floor(hash(c, r + 99) * 10) + 1, oy = Math.floor(hash(c + 50, r) * 11) + 2;
    if (h < 0.11) put(x, SPR.tuft, c * TS + ox, r * TS + oy);
    else if (h < 0.15) put(x, SPR.flowers[Math.floor(hash(c + 9, r + 9) * SPR.flowers.length)], c * TS + ox, r * TS + oy);
  }
  return staticCanvas;
}

// ---------- Ban đêm ----------
export { nightAmount };

// ---------- Thời tiết toàn màn (issue 55) ----------
// Nhẹ: chỉ vài lớp tô màu và số hạt có giới hạn theo `quality` (FPS tụt thì bớt, tiết kiệm pin = 0 hạt, không chớp sét, không gradient).
// Ảnh toàn màn (cầu vồng, sét, hơi nóng) phóng nguyên lần; lần chẵn thì dùng bản 2x cho đều điểm.
function screenImg(ctx, img, x, y, k) {
  const h = k % 2 === 0 && hdOf(img);
  ctx.drawImage(h || img, Math.round(x), Math.round(y), img.width * k, img.height * k);
}
function drawWeather(ctx, f, night, quality) {
  const { state, width, height, dpr, now, scale } = f, wx = state.weather;
  const fill = c => { ctx.fillStyle = c; ctx.fillRect(0, 0, width, height); };
  if (wx === 'rain' || wx === 'storm') {
    const storm = wx === 'storm';
    fill(storm ? 'rgba(18,24,54,0.32)' : 'rgba(40,60,100,0.13)');
    ctx.strokeStyle = storm ? 'rgba(210,230,255,0.6)' : 'rgba(200,228,255,0.55)'; ctx.lineWidth = Math.max(1, Math.round(dpr));
    const len = (storm ? 20 : 14) * dpr, sp = (storm ? 1100 : 750) * dpr, slant = storm ? 0.45 : 0.22;
    const n = Math.round(Math.min(storm ? 240 : 160, Math.round(width * height / ((storm ? 6000 : 9000) * dpr * dpr))) * quality);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x0 = hash(i, 7) * (width + 160), y0 = hash(i, 11) * height;
      const y = (y0 + now * 0.001 * sp * (0.8 + hash(i, 3) * 0.4)) % (height + len) - len;
      const x = x0 - (y + len) * slant;
      ctx.moveTo(x, y); ctx.lineTo(x - len * slant, y + len);
    }
    ctx.stroke();
    // bão: thỉnh thoảng chớp sét (nhẹ, không chớp liên hồi; tiết kiệm pin thì thôi)
    if (storm && !f.battery) {
      const T = 6500, cyc = Math.floor(now / T), ph = now % T;
      if (ph < 110 || (ph > 210 && ph < 280)) {
        fill('rgba(255,255,235,0.2)');
        const k = Math.max(2, Math.round(height * 0.55 / WX.bolt.height / 2) * 2), bx = 0.15 + hash(cyc, 5) * 0.7;
        screenImg(ctx, WX.bolt, bx * width, 0, k);
      }
    }
  } else if (wx === 'cloud') fill('rgba(70,80,100,0.07)');
  else if (wx === 'drought') {   // nắng gắt: trời ngả cam, chói góc trên, hơi nóng bốc lên
    fill(`rgba(255,128,30,${(0.17 * (1 - night)).toFixed(3)})`);
    if (!f.battery && night < 0.5) {
      const g = ctx.createRadialGradient(width * 0.88, 0, 0, width * 0.88, 0, Math.max(width, height) * 0.55);
      g.addColorStop(0, 'rgba(255,240,180,0.55)'); g.addColorStop(0.35, 'rgba(255,220,140,0.22)'); g.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
    }
    const n = Math.round(14 * quality * (1 - night)), k = Math.max(2, Math.round(scale / 2) * 2);
    for (let i = 0; i < n; i++) {
      const life = 3200, t = (now + hash(i, 9) * life) % life / life;
      ctx.globalAlpha = Math.sin(t * Math.PI) * 0.8;
      screenImg(ctx, WX.heat, hash(i, 4) * width, height * (0.35 + hash(i, 6) * 0.6) - t * 40 * dpr, k);
    }
    ctx.globalAlpha = 1;
  } else if (wx === 'frost') {   // sương muối: sáng sớm trắng xanh, hạt băng lấp lánh rơi chậm
    const frac = dayFraction(state), morning = 1 - Math.min(1, Math.max(0, (frac - 0.12) / 0.3));
    fill(`rgba(200,228,255,${(0.08 + 0.2 * morning).toFixed(3)})`);
    const n = Math.round(26 * quality), sz = Math.max(2, Math.round(dpr * 2));
    for (let i = 0; i < n; i++) {
      const x = (hash(i, 2) * width + Math.sin(now / 1400 + i) * 12 * dpr), y = (hash(i, 8) * height + now * 0.02 * dpr * (0.6 + hash(i, 1))) % height;
      ctx.fillStyle = i % 3 ? 'rgba(255,255,255,0.75)' : 'rgba(191,227,255,0.85)';
      ctx.fillRect(Math.round(x), Math.round(y), sz, sz);
    }
  } else if (wx === 'rainbow' && night < 0.6) {   // cầu vồng vắt ngang trời
    const k0 = Math.max(1, Math.ceil(width * 1.05 / WX.rainbow.width)), k = k0 > 1 ? k0 + (k0 % 2) : 1;   // vắt qua cả màn, lần chẵn cho đều điểm
    ctx.globalAlpha = 0.3 * (1 - night);
    screenImg(ctx, WX.rainbow, (width - WX.rainbow.width * k) / 2, height * 0.1, k);
    ctx.globalAlpha = 1;
  }
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
  const c = p.crop, own = SPR4.crop[c.id];
  if (c.dead) return own?.dead ?? SPR.dead ?? tinted(SPR.grow, '#3b2a18', 0.75);
  if (c.rotten) return own?.rotten ?? SPR.rotten ?? tinted(SPR.grow, '#4a3a20', 0.6);
  const st = cropStage(c);
  if (own) return c.sick ? (st >= 1 ? own.sick : tinted(own.stages[0], '#d4c23a', 0.6)) : own.stages[st];
  let img = st === 0 ? seedlingImg() : st === 1 ? SPR.sprout : st === 2 ? SPR.grow : st === 3 ? floweringImg() : (SPR.ripe[c.id] ?? SPR.grow);
  if (c.sick) img = st >= 1 && SPR.sick ? SPR.sick : tinted(img, '#d4c23a', 0.6);
  return img;
}
// Hình trái khổng lồ của ô (issue 53): sprite riêng từng cây (art53); null nếu ô không có trái khổng lồ hay thiếu sprite
export function giantImg(p) {
  const c = p.crop;
  return c?.giant && !c.dead && !c.rotten && c.progress >= 1 ? SPR53_OLD.giant?.[c.id] ?? null : null;
}

// Khối ruộng có nâng cấp (issue 58): Map ô → { f: khối, info: autoInfo } (cùng một object cho cả 9 ô của khối)
const FIELD_PX = FIELD_SIZE * TS;
function fieldUps(state) {
  const out = new Map();
  for (const f of state.farm?.ents ?? []) {
    if (f.kind !== 'field' || !f.up || !(f.up.drip || f.up.spray || f.up.rich)) continue;
    const u = { f, info: autoInfo(state, f) };
    for (const i of f.plots ?? []) out.set(i, u);
  }
  return out;
}

// Thanh nhỏ dưới ô: xanh = tiến độ lớn, cam = đếm ngược chín→héo, đỏ nhấp nháy = sắp héo (2 hàng điểm ảnh thế giới, nét nguyên theo tỉ lệ chẵn)
function cropBar(ctx, c, px, py, now) {
  if (c.dead || c.rotten) return;
  const left = ripeLeft(c), f = left == null ? Math.min(1, c.progress) : left;
  const col = left == null ? '#5fd35f' : wilting(c) ? (Math.floor(now / 300) % 2 ? '#ff4a3a' : '#c02a20') : '#f2a52b';
  rect(ctx, '#2b1a0c', px + 2, py + 14, 12, 2);
  rect(ctx, col, px + 2, py + 15, Math.max(1, Math.round(12 * f)), 2);
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

// ---------- Chế độ xây dựng: mạng nước (issue 57, ADR 0015) ----------
// Vùng phủ xanh: ô trong đất nhà cách một nút mạng nước (bồn, bồn phụ, trạm bơm phụ đã nối) không quá TANK.range ô, có viền.
// Đang đặt / kéo bồn chính thì vùng xanh là tầm của giếng (bồn phải nằm trong đó). Ống: từ giếng tới bồn, từ mỗi nút về nút nó nối
// vào; có nước thì ống xanh, khô (bồn cạn, mất điện, máy bơm không tới) thì ống xám. Thanh mực nước trên đỉnh bồn.
function drawWater(ctx, state, b) {
  const A = TANK_ART, f = state.farm;
  if (!A || !f) return;
  const g = b.ghost, moving = g && (g.what?.kind === 'tank' || f.ents.find(e => e.id === g.id)?.kind === 'tank');
  const well = f.ents.find(e => e.kind === 'well'), net = waterNet(state);
  const src = moving ? (well ? [footprint(well)] : []) : net.map(n => n.ft);
  if (!src.length) return;
  const R = TANK.range, o = f.owned, on = new Set(), key = (c, r) => c * 4096 + r;
  for (const ft of src) for (let r = Math.max(o.r, ft.r - R); r < Math.min(o.r + o.h, ft.r + ft.h + R); r++) for (let c = Math.max(o.c, ft.c - R); c < Math.min(o.c + o.w, ft.c + ft.w + R); c++) on.add(key(c, r));
  ctx.fillStyle = 'rgba(30,140,190,0.9)';
  for (const k of on) {
    const c = Math.floor(k / 4096), r = k % 4096, x = c * TS, y = r * TS;
    put(ctx, A.cover, x, y);
    if (!on.has(key(c, r - 1))) ctx.fillRect(x, y, TS, 1);
    if (!on.has(key(c, r + 1))) ctx.fillRect(x, y + TS - 1, TS, 1);
    if (!on.has(key(c - 1, r))) ctx.fillRect(x, y, 1, TS);
    if (!on.has(key(c + 1, r))) ctx.fillRect(x + TS - 1, y, 1, TS);
  }
  if (moving || !net.length) return;
  const k = tankInfo(state), mid = ft => ({ x: (ft.c + ft.w / 2) * TS, y: (ft.r + ft.h / 2) * TS });
  // ống chữ L: ngang theo hàng của nút gốc rồi dọc xuống nút sau, khớp nối ở góc và hai đầu
  const pipe = (a, z, wet) => {
    const P = wet ? A.pipe.wet : A.pipe.dry, x0 = Math.min(a.x, z.x), x1 = Math.max(a.x, z.x), y0 = Math.min(a.y, z.y), y1 = Math.max(a.y, z.y);
    for (let x = x0; x < x1; x += TS) put(ctx, P.h, Math.min(x, x1 - TS), a.y - 3);
    for (let y = y0; y < y1; y += TS) put(ctx, P.v, z.x - 3, Math.min(y, y1 - TS));
    for (const p of [a, { x: z.x, y: a.y }, z]) put(ctx, P.j, p.x - 4, p.y - 4);
  };
  if (well) pipe(mid(footprint(well)), mid(net[0].ft), k.pumping);
  for (const n of net) if (n.from) pipe(mid(footprint(n.from)), mid(n.ft), k.level > 0 && waterOn(state, n.e));
}
// Thanh mực nước trên đỉnh bồn chính (chế độ xây dựng)
function tankBar(ctx, state) {
  const A = TANK_ART, net = A && state.farm ? waterNet(state) : [];
  if (!net.length) return;
  const k = tankInfo(state), t = net[0].ft, bx = t.c * TS + t.w * TS / 2 - A.bar.width / 2, by = t.r * TS + BUILDING_DEFS.tank.spr.y - A.bar.height - 2;
  put(ctx, A.bar, bx, by);
  ctx.fillStyle = '#5fb8ff';
  ctx.fillRect(Math.round(bx) + BAR_IN.x, Math.round(by) + BAR_IN.y, Math.round(BAR_IN.w * Math.min(1, k.level / k.cap)), BAR_IN.h);
}

// ---------- Chế độ xây dựng: viền các thứ dời được, bóng xanh/đỏ chỗ định đặt ----------
// b: { ghost: { id, c, r, w, h, ok } | null }
function drawBuild(ctx, state, m, b, now) {
  tankBar(ctx, state);
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]); ctx.lineDashOffset = -Math.floor(now / 120) % 5;
  ctx.strokeStyle = 'rgba(255,248,225,0.75)';
  for (const e of state.farm.ents) {
    if (!canMove(e) || e.id === b.ghost?.id) continue;
    const ft = footprint(e);
    ctx.strokeRect(ft.c * TS + 0.5, ft.r * TS + 0.5, ft.w * TS - 1, ft.h * TS - 1);
  }
  ctx.setLineDash([]);
  const se = b.sel != null && state.farm.ents.find(x => x.id === b.sel);   // món đang chọn (để Cất): viền đậm
  if (se) { const ft = footprint(se); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.strokeRect(ft.c * TS + 1, ft.r * TS + 1, ft.w * TS - 2, ft.h * TS - 2); ctx.lineWidth = 1; }
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
  if (im) put(ctx, im, bd.x + dx, bd.y + dy);
  const dc = m.decos.find(x => x.ent === e), di = dc && decoImg(dc.kind);
  if (di) put(ctx, di, Math.round(dc.x + dx - di.width / 2), Math.round(dc.y + dy - di.height + 1));
  const ni = g.what?.kind === 'deco' && decoImg(g.what.item);   // món mới đặt: vẽ mờ theo ngón tay
  if (ni) put(ctx, ni, Math.round(g.c * TS + 8 - ni.width / 2), Math.round(g.r * TS + 13 - ni.height));
  const ci = g.what?.kind === 'cathouse' && SPR3?.cathouse?.[0];   // nhà mèo mới xây
  if (ci) put(ctx, ci, g.c * TS - 5, g.r * TS - 8);
  const wd = g.what && TANK_ART && { tank: TANK_ART.tank[0], tank2: TANK_ART.tank2[0], booster: TANK_ART.booster.on }[g.what.kind];   // công trình nước mới xây
  if (wd) { const o = BUILDING_DEFS[g.what.kind].spr; put(ctx, wd, g.c * TS + o.x, g.r * TS + o.y); }
  if (g.what?.kind === 'greenhouse') put(ctx, GH.house, g.c * TS + GH_AT.house.x, g.r * TS + GH_AT.house.y);   // nhà kính mới xây (issue 60)
  const cp = g.what?.kind === 'compost' && SPR61_OLD.compost?.[0];   // hố ủ phân mới xây
  if (cp) put(ctx, cp, g.c * TS, g.r * TS - 8);
  ctx.globalAlpha = 1;
}

// ---------- Vẽ một khung hình ----------
// f: { state, w (world), cam:{x,y}, scale, width, height, dpr, now, target, busy, fx }
// Bong bóng chat nhanh và biểu cảm trên đầu một người (issue 25), tọa độ màn hình: (x, y) = đáy bong bóng.
// who.chat = câu đang nói (hoặc null), who.emote = { e, age 0..1 } (hoặc null).
// Có pixel art thì dùng: SPR2.chatBubble (khung 9 ô, góc = 1/3 cạnh), SPR2.chatTail (đuôi), SPR2.emotes[e]; chưa có thì vẽ tạm.
function talk(ctx, who, x, y, dpr, now) {
  if (who.chat) {
    const size = Math.round(11 * dpr), pad = 5 * dpr;
    ctx.font = `800 ${size}px ${FONT}`;
    const w = Math.ceil(ctx.measureText(who.chat).width + pad * 2), h = size + pad * 1.6;
    const bx = Math.round(x - w / 2), by = Math.round(y - h - 5 * dpr);
    const nine = SPR2?.chatBubble, tail = SPR2?.chatTail;
    if (nine) {
      const c = Math.floor(nine.width / 3), k = Math.max(2, 2 * Math.round(dpr)), cc = c * k, sw = nine.width - 2 * c, sh = nine.height - 2 * c;
      // k chẵn (theo dpr): bản 2x mỗi điểm = k/2 điểm màn hình, đều
      const nh = HD && hdOf(nine), th = HD && hdOf(tail);
      const part = (sx, sy, sW, sH, dx, dy, dW, dH) => (nh ? ctx.drawImage(nh, sx * 2, sy * 2, sW * 2, sH * 2, dx, dy, dW, dH) : ctx.drawImage(nine, sx, sy, sW, sH, dx, dy, dW, dH));
      const iw = w - 2 * cc, ih = h - 2 * cc;
      part(0, 0, c, c, bx, by, cc, cc); part(c, 0, sw, c, bx + cc, by, iw, cc); part(c + sw, 0, c, c, bx + w - cc, by, cc, cc);
      part(0, c, c, sh, bx, by + cc, cc, ih); part(c, c, sw, sh, bx + cc, by + cc, iw, ih); part(c + sw, c, c, sh, bx + w - cc, by + cc, cc, ih);
      part(0, c + sh, c, c, bx, by + h - cc, cc, cc); part(c, c + sh, sw, c, bx + cc, by + h - cc, iw, cc); part(c + sw, c + sh, c, c, bx + w - cc, by + h - cc, cc, cc);
      if (tail) ctx.drawImage(th || tail, Math.round(x - tail.width * k / 2), by + h - k, tail.width * k, tail.height * k);
    } else {
      const lw = Math.max(1, Math.round(2 * dpr));
      ctx.fillStyle = '#3b2412';
      ctx.fillRect(bx - lw, by - lw, w + lw * 2, h + lw * 2);
      ctx.beginPath(); ctx.moveTo(x - 5 * dpr, by + h); ctx.lineTo(x + 5 * dpr, by + h); ctx.lineTo(x, by + h + 6 * dpr); ctx.fill();
      ctx.fillStyle = '#fffaf0';
      ctx.fillRect(bx, by, w, h);
      ctx.beginPath(); ctx.moveTo(x - 3 * dpr, by + h - 1); ctx.lineTo(x + 3 * dpr, by + h - 1); ctx.lineTo(x, by + h + 3 * dpr); ctx.fill();
    }
    ctx.fillStyle = '#3b2412'; ctx.textAlign = 'center';
    ctx.fillText(who.chat, x, by + h / 2 + size * 0.36);
    y = by - 2 * dpr;
  }
  if (who.emote) {
    const { e, age } = who.emote, rise = age * 18 * dpr, im = SPR2?.emotes?.[e];
    ctx.globalAlpha = age < 0.7 ? 1 : Math.max(0, (1 - age) / 0.3);
    const bob = Math.sin(now / 150) * dpr;
    if (im) { const k = Math.max(2, 2 * Math.round(dpr)); ctx.drawImage((HD && hdOf(im)) || im, Math.round(x - im.width * k / 2), Math.round(y - im.height * k - rise + bob), im.width * k, im.height * k); }
    else { ctx.font = `${Math.round(20 * dpr)}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(e, x, y - rise + bob); }
    ctx.globalAlpha = 1;
  }
}

// ---------- Nhà kính (issue 60): "công trình có mái" ----------
// Người chơi (cả khách đang thăm) đứng trong khối ruộng có nhà kính thì mái mờ dần rồi ẩn, ra ngoài thì hiện lại.
// Mái hiện thì bảng trạng thái ở cửa đếm ô khô, sâu, chín, héo; có sâu thì bong bóng "!" nhấp nháy trên mái,
// bong bóng việc của từng ô bên trong ẩn đi.
const ROOF_FADE_MS = 350;
const roofs = new Map();   // id khối ruộng → { a: độ đậm mái 0..1, t: lúc vẽ trước }
let roofInfo = [];
function roofAlpha(id, inside, now) {
  let o = roofs.get(id);
  if (!o) roofs.set(id, o = { a: inside ? 0 : 1, t: now });
  const dt = Math.max(0, Math.min(200, now - o.t));
  o.t = now;
  o.a = Math.max(0, Math.min(1, o.a + (inside ? -1 : 1) * dt / ROOF_FADE_MS));
  return o.a;
}
const inField = (e, o) => o?.x != null && o.x >= e.c * TS && o.x < (e.c + FIELD_SIZE) * TS && o.y >= e.r * TS && o.y < (e.r + FIELD_SIZE) * TS;

export function render(ctx, f) {
  const { state, w: wd, scale, width, height, dpr, now } = f;
  const camX = Math.round(f.cam.x * scale), camY = Math.round(f.cam.y * scale);
  const toSX = wx => wx * scale - camX, toSY = wy => wy * scale - camY;
  const PAD = 40;
  const vl = camX / scale - PAD, vt = camY / scale - PAD, vr = (camX + width) / scale + PAD, vb = (camY + height) / scale + PAD;
  const vis = (x, y, r = 30) => x > vl - r && x < vr + r && y > vt - r && y < vb + r;
  const night = nightAmount(state);
  const quality = f.battery ? 0 : f.quality ?? 1;   // lượng hạt: 1 = đủ, thấp hơn khi FPS tụt, 0 = tắt (tiết kiệm pin)
  const sparkles = quality >= 0.75 ? 2 : quality >= 0.4 ? 1 : 0;

  HD = Number.isInteger(scale / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const m = sceneMap(state), indoor = !!m.interior, farm = !!m.garden;   // ngoài vườn mới vẽ con vật, chó, quạ, trứng, phân
  ctx.fillStyle = indoor ? '#1a100a' : '#25491a';
  ctx.fillRect(0, 0, width, height);
  ctx.setTransform(scale, 0, 0, scale, -camX, -camY);
  drawStatic(ctx, m, camX / scale, camY / scale, (camX + width) / scale, (camY + height) / scale);

  const blit = (img, x, y) => put(ctx, img, x, y);
  // Trái khổng lồ trên ô (issue 53): đáy hình chạm mép dưới ô, giữa ô theo chiều ngang (hình 24x24 tràn 4 điểm mỗi bên, 8 điểm
  // phía trên); hai đốm lấp lánh (SPR53.giantSpark) nhấp nháy lệch pha
  const giant = (im, px, py, idx) => {
    const x = px + (16 - im.width) / 2, y = py + 16 - im.height, fr = SPR53_OLD.giantSpark;
    blit(im, x, y);
    for (const [i, sx, sy] of [[0, 0.25, 0.3], [1, 0.72, 0.55]]) {
      const f = [0, 1, 2, 1, 0][Math.floor(now / 140 + idx * 3 + i * 4) % 8];
      const sp = fr?.[f] ?? (f === 2 ? SPR.sparkle : null);
      if (f != null && sp) blit(sp, Math.round(x + im.width * sx - sp.width / 2), Math.round(y + im.height * sy - sp.height / 2));
    }
  };
  // nhà kính trên các khối ruộng: độ đậm mái theo chỗ người chơi đứng, số trên bảng trạng thái
  const glassFields = (m.fields ?? []).filter(e => e.up?.glass);
  roofInfo = glassFields.map(e => {
    const inside = inField(e, state.player), st = glassStatus(state, e.id);
    return { id: e.id, alpha: roofAlpha(e.id, inside, now), inside, broken: !!e.up.glass.broken, board: { dry: st.dry, bugs: st.bugs, ripe: st.ripe, rotten: st.rotten }, urgent: st.urgent };
  });
  const roofed = idx => { const e = m.fieldOf?.(idx); return !!e?.up?.glass && (roofInfo.find(r => r.id === e.id)?.alpha ?? 0) > 0.5; };
  // người (người chơi, người khác, thằng Tèo): khung theo ngoại hình, có bản 2x (art5) thì put() tự dùng
  const person = (look, dir, k, wx, wy) => blit(charFrames(look)[dir][k], wx, wy);
  // Biển "đã về" trên cửa chuồng: SPR3.homeBoard nếu có, không thì tấm gỗ vẽ tạm. Còn con chưa về thì chữ đỏ.
  const homeSign = (g, h) => {
    const im = SPR3?.homeBoard, x = Math.round(g.x), y = Math.round(g.y) - 12;
    if (im) blit(im, x - im.width / 2, y - im.height);
    else { rect(ctx, '#6b4020', x - 13, y - 9, 26, 9); rect(ctx, '#fff6dc', x - 12, y - 8, 24, 7); }
    ctx.font = '6px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = h.home < h.total ? '#7a1f10' : '#1d5a1d';
    ctx.fillText(`${h.home}/${h.total}`, x, y - 2);
  };
  const shadow = (x, y, rx) => {
    ctx.fillStyle = 'rgba(20,40,10,0.22)';
    ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y) - 0.5, rx, rx * 0.38, 0, 0, 7); ctx.fill();
  };

  // 1) đất ruộng
  const nextLocked = wd.nextLocked(state);
  const ups = farm ? fieldUps(state) : null;   // ô → khối có nâng cấp (issue 58)
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
    } else {
      blit(soilImg(p), px, py);
      if (p.soil === 'tilled' && p.water <= 0 && state.weather === 'drought') blit(WX.crack, px, py);   // hạn hán: đất khô nứt nẻ
      if (p.mulch) blit(WX.mulch, px, py);   // rơm phủ (issue 55)
      const u = ups?.get(p.idx);
      if (u && AUTO_ART) {   // đất màu mỡ, ống nhỏ giọt dưới gốc cây (issue 58)
        if (u.f.up.rich) blit(AUTO_ART.rich, px, py);
        const st = u.info.drip;
        if (st) blit(st === 'on' ? AUTO_ART.drip.on[Math.floor(now / 500 + p.idx * 0.37) % 2] : AUTO_ART.drip[st], px, py);
      }
    }
  }
  // khung chân nhà kính nằm trên đất (vẫn thấy khi mái ẩn); kính vỡ thì có mảnh kính rơi
  for (const e of glassFields) if (vis(e.c * TS + 24, e.r * TS + 24, 40)) blit(e.up.glass.broken ? GH.baseBroken : GH.base, e.c * TS, e.r * TS);

  // 2) bóng dưới chân
  shadow(state.player.x, state.player.y, 6);
  const carry = farm && !state.visit ? state.carry?.animalId : null;   // con đang nằm trên xe rùa: không vẽ ở chuồng
  const animals = farm ? state.animals.filter(a => a.id !== carry) : [], threats = farm ? state.threats ?? [] : [], preds = farm ? state.preds ?? [] : [];
  const small = { non: 0.6, nho: 0.8 };
  for (const a of animals) if (a.x != null && vis(a.x, a.y)) shadow(a.x, a.y, Math.round((a.type === 'bo' ? 11 : a.type === 'cuu' ? 8 : 6) * (small[a.stage] ?? 1)));
  if (farm && state.dog.x != null && vis(state.dog.x, state.dog.y)) shadow(state.dog.x, state.dog.y, 6);
  const here = m.garden ? 'farm' : m.scene;   // vườn bạn đang thăm (scene 'visit'): chó mèo của chủ ghi chỗ ở là 'farm'
  const cats = catsIn(state, here);
  for (const c of cats) if (c.x != null && vis(c.x, c.y)) shadow(c.x, c.y, Math.round(5 * (small[c.stage] ?? 1)));
  for (const t of threats) if (t.x != null && vis(t.x, t.y, 40)) shadow(t.x, t.y, t.kind === 'crow' ? 4 : 6);
  const courier = farm && !state.visit ? state.courier : null;   // người giao hàng (mua online)
  if (courier?.x != null && vis(courier.x, courier.y, 40)) shadow(courier.x, courier.y, 6);
  for (const p of preds) if (p.x != null && vis(p.x, p.y, 40) && p.kind !== 'hawk') shadow(p.x, p.y, p.kind === 'rat' ? 4 : 6);

  if (wd.build && farm) drawWater(ctx, state, wd.build);   // vùng phủ xanh, ống nước nằm dưới các vật (issue 57)
  // 3) các vật nhô lên, sắp theo y chân
  const items = [];
  const add = (y, fn) => items.push({ y, fn });
  const bubbles = [];
  // tone: 'warn' bong bóng vàng (mệt) · 'bad' bong bóng đỏ nhấp nháy (bệnh nặng, nguy kịch)
  const bub = (x, y, icon, key, tone) => { if (icon) bubbles.push({ x, y, icon, key, tone }); };

  for (const t of [...m.trees, ...m.border]) if (vis(t.x, t.y, 30)) add(t.y, () => blit(SPR.tree, t.x - 16, t.y - 44));
  // máy phun dựng ở góc trên phải khối, biểu tượng nâng cấp ở góc trên trái (issue 58)
  for (const { f, info } of new Set(ups?.values() ?? [])) {
    const x = f.c * TS, y = f.r * TS, A = AUTO_ART;
    if (!A || !vis(x + 24, y + 24, 40)) continue;
    if (info.spray) add(y + 3, () => blit(info.spray === 'on' ? A.sprayer.on[Math.floor(now / 260) % 2] : A.sprayer[info.spray], x + FIELD_PX - 6, y - 21));
    const ks = ['drip', 'spray', 'rich'].filter(k => f.up[k]);
    if (ks.length) add(y + 13, () => ks.forEach((k, i) => blit(A.badge[k], x - 3 + i * 8, y - 5)));
  }
  for (const b of m.bushes) if (vis(b.x, b.y, 20)) add(b.y, () => blit(SPR.bush, b.x - 8, b.y - 14));
  // bụi, đá chưa dọn trên đất mới mua
  for (const o of m.clutter ?? []) if (o.kind !== 'tree' && vis(o.x, o.y, 20)) add(o.y + TS, () => {
    const im = (o.kind === 'bush' ? SPR2?.bushes : SPR2?.rocks)?.[o.v];
    if (im) blit(im, o.x, o.y);
    else if (o.kind === 'bush') blit(SPR.bush, o.x, o.y + 2);
    else { ctx.fillStyle = '#7d7a80'; ctx.beginPath(); ctx.ellipse(o.x + 8, o.y + 11, 7, 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#a8a4aa'; ctx.fillRect(o.x + 5, o.y + 8, 4, 2); }
  });

  for (const b of m.buildings) {
    // đang ngủ: giường có người nằm; hộp quà / sổ lưu bút ở cổng đổi sprite theo trạng thái
    const img = b.id === 'bed' && wd.sleeping && SPR2?.bedSleep ? SPR2.bedSleep
      : (b.id === 'giftbox' || b.id === 'guestbook') ? (gateImg(b.id, state) ?? buildingImg(b))
      : b.id === 'compost' ? compostImg(state) : buildingImg(b, state);
    if (!img || !vis(b.x + img.width / 2, b.y + img.height / 2, Math.max(img.width, img.height) / 2)) continue;
    add((b.foot.r + b.foot.h) * TS, () => blit(img, b.x, b.y));
    if (b.npc) {   // người đứng cạnh công trình (Bà Tư), thở nhẹ hai nhịp
      const idle = SPR2?.[b.npc.key + 'Idle'] ?? SPR3?.[b.npc.key + 'Idle'], im = idle?.[Math.floor(now / 700) % idle.length];
      if (im) add(b.npc.y, () => blit(im, b.npc.x - 8, b.npc.y - 24));
    }
    if (b.id === 'market' && SPR2?.marketClosed && !marketOpen(state)) add((b.foot.r + b.foot.h) * TS + 0.5, () => blit(SPR2.marketClosed, b.x + 12, b.y + 22));
    if (b.id === 'compost') {   // đang ủ: hơi bốc lên + vạch tiến độ; đã xong: bao phân bón nhún nhảy trên hố
      const ci = compostInfo(state), y0 = (b.foot.r + b.foot.h) * TS + 0.5;
      if (ci?.state === 'composting') add(y0, () => {
        const st = SPR61_OLD.compostSteam, k = Math.floor(now / 260) % 3;
        if (st) { blit(st[k], b.x + 3, b.y - 10); blit(st[(k + 1) % 3], b.x + 13, b.y - 11); }
        const w = 22, done = Math.max(0, Math.min(1, 1 - ci.left / COMPOST.ms));
        rect(ctx, '#3b2412', b.x + 5, b.y - 3, w + 2, 3); rect(ctx, '#6b4a2a', b.x + 6, b.y - 2, w, 1);
        rect(ctx, '#7fc858', b.x + 6, b.y - 2, Math.max(1, Math.round(w * done)), 1);
      });
      const dn = ci?.state === 'ready' && SPR61_OLD.compostDone;
      if (dn) add(y0, () => blit(dn, b.x + 21, b.y - 12 + Math.round(Math.sin(now / 260) * 1.5)));   // lệch phải: mũi tên chọn đích nằm giữa hố
    }
    if (b.id === 'doghouse' && farm && state.dog?.chained) {   // sợi xích buộc ở chuồng (issue 31)
      const ch = SPR2?.dogChain;
      add((b.foot.r + b.foot.h) * TS + 0.5, () => {
        if (ch) blit(ch, b.x + img.width / 2 - ch.width / 2, b.y + img.height - 4);
        else { ctx.fillStyle = '#767686'; for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(b.x + 4 + i * 3), Math.round(b.y + img.height - 3 + (i % 2)), 2, 2); }
      });
    }
    const bw = b.id === 'doghouse' && farm && m.dogBowl && SPR3?.dogBowl?.[state.dog?.bowl > 0 ? 'full' : 'empty'];
    if (bw) add(m.dogBowl.y, () => blit(bw, m.dogBowl.x - bw.width / 2, m.dogBowl.y - bw.height));   // bát ăn cạnh chuồng chó
  }
  for (const p of m.penList) {   // nhà/mái chuồng theo cấp, rồi máng
    const hs = p.house, hi = (p.rot && sideImg(hs.sprite === 'quarantine' ? PENROT?.quarantine : PENROT?.pen?.[hs.sprite]?.[p.lv - 1], p.rot)) || (hs.sprite === 'quarantine' ? SPR3?.quarantine : SPR3?.pen?.[hs.sprite]?.[p.lv - 1]);
    if (hi && vis(hs.x, hs.y - hi.height / 2, hi.width)) add(hs.y, () => blit(hi, hs.x - hi.width / 2, hs.y - hi.height));
    const sa = p.shower && SHOWER_ART?.[p.type];   // vòi sen chuồng cấp 3 (issue 59): phun khi đang tắm, có nước thì chờ, không nước thì tắt
    if (sa && vis(p.shower.x + 8, p.shower.y - 18, 30)) {
      const on = (wd.showers ?? []).some(x => x.pen === p.id && now - x.t0 < SHOWER_FX_MS);
      const sv = p.rot && PENROT?.shower?.[p.type], A = sv || sa;   // chuồng xoay: vòi sen nhìn nghiêng, giữa đáy ảnh = chân cột
      const im0 = on ? A.spray[Math.floor(now / 110) % A.spray.length] : showerInfo(state, p.ent)?.on ? A.idle : A.off, im = sv ? sideImg(im0, p.rot) : im0;
      add(p.shower.y, () => blit(im, sv ? p.shower.x - im.width / 2 : p.shower.x - sa.ax, p.shower.y - im.height));
    }
    const hm = farm && isDusk(state) ? penHome(state, p.id) : null, gt = hm?.total ? gateOf(state, p.id) : null;
    if (gt && vis(gt.x, gt.y, 24)) add(gt.y + 3, () => homeSign(gt, hm));   // biển số con đã về trên cửa chuồng
    const tr = p.trough, n = state.troughs?.[p.id] ?? 0;
    if (!tr || !vis(tr.x, tr.y, 20)) continue;
    if (tr.v) {   // máng dọc của chuồng xoay: thanh đo cám nhỏ bên cạnh
      add(tr.y, () => {
        const im = sideImg(PENROT?.troughV, p.rot);
        if (im) blit(im, tr.x - im.width / 2, tr.y - im.height);
        else { rect(ctx, '#6b4020', tr.x - 7, tr.y - 28, 14, 28); rect(ctx, '#8a5a2b', tr.x - 5, tr.y - 26, 10, 24); }
        rect(ctx, '#3b2412', tr.x - 2, tr.y - 24, 4, 20);
        if (n > 0) { const hh = Math.max(1, Math.round(18 * Math.min(1, n / 20))); rect(ctx, '#5fd35f', tr.x - 1, tr.y - 5 - hh, 2, hh); }
      });
      continue;
    }
    add(tr.y, () => {
      blit(SPR.trough, tr.x - 13, tr.y - 12);
      if (n <= 0) { rect(ctx, '#8a5a2b', tr.x - 12, tr.y - 9, 24, 3); rect(ctx, '#6b4020', tr.x - 12, tr.y - 9, 24, 1); }
      else { rect(ctx, '#3b2412', tr.x - 10, tr.y + 1, 20, 3); rect(ctx, '#5fd35f', tr.x - 9, tr.y + 2, Math.max(1, Math.round(18 * Math.min(1, n / 20))), 1); }
    });
  }
  for (const p of m.penList) {   // cân heo, mỗi chuồng heo một cái
    const sc = p.scale, im = SPR3?.scale;
    const si = (p.rot && sideImg(PENROT?.scale, p.rot)) || im, sd = si !== im;   // chuồng xoay: cân nhìn nghiêng 14x19
    if (sc && si && vis(sc.x, sc.y, 20)) add(sc.y, () => blit(si, sd ? sc.x - si.width / 2 : sc.x - 8, sd ? sc.y - si.height + 2 : sc.y - 14));
  }
  // ổ ấp trứng cạnh chuồng gà nhỏ
  const coop = m.building('coop');
  if (coop && vis(coop.at.x, coop.at.y, 30)) add(coop.at.y - 2, () => {
    const im = (coop.rot && sideImg(state.nest?.egg ? PENROT?.nestEgg : PENROT?.nestEmpty, coop.rot)) || (state.nest?.egg ? SPR.nestEgg : SPR.nestEmpty);   // chuồng xoay: ổ nhìn nghiêng
    if (im) blit(im, coop.at.x - im.width / 2, coop.at.y - im.height);
    else {
      rect(ctx, '#3b2412', coop.at.x - 8, coop.at.y - 6, 16, 6); rect(ctx, '#e8c34a', coop.at.x - 7, coop.at.y - 5, 14, 4);
      if (state.nest?.egg) { rect(ctx, '#3b2412', coop.at.x - 3, coop.at.y - 9, 6, 6); rect(ctx, '#fff8e0', coop.at.x - 2, coop.at.y - 8, 4, 4); }
    }
    if (state.nest?.egg) bub(coop.at.x, coop.at.y - 12, (state.nest.sp === 'vit' ? SPR3?.eggDuck : null) ?? SPR.product.trung, 'nest');
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
        const gi = giantImg(p), warn = wilting(p.crop), im0 = cropImg(p), im = warn ? tinted(im0, '#8a5a1a', Math.floor(now / 350) % 2 ? 0.45 : 0.25) : im0;   // sắp héo: ngả nâu nhấp nháy
        if (gi) giant(gi, px, py, p.idx);   // trái khổng lồ: hình to tràn ra ngoài ô, lấp lánh (issue 53)
        else blit(im, px + (16 - im.width) / 2, py + 15 - im.height);
        cropBar(ctx, p.crop, px, py, now);
        if (p.crop.sick && !p.crop.dead && !p.crop.rotten && !SPR.sick) { /* đã nhuộm vàng */ }
        if (!gi && cropStage(p.crop) >= 4 && !p.crop.dead && !p.crop.rotten) {
          for (let i = 0; i < sparkles; i++) {
            const ph = (now / 450 + p.idx * 0.7 + i * 0.5) % 2;
            if (ph < 1) blit(SPR.sparkle, px + 2 + i * 8 + (p.idx % 3), py + 1 + i * 4);
          }
        }
        if (p.crop.fert) rect(ctx, '#f7d547', px + 1, py + 14, 2, 1);
        if (frostHold(state, p)) blit(WX.frostBite, px, py);   // sương muối bám cây hạt / mầm: vẽ chồng lên hình riêng của cây
        // trái mùa: lớn chậm (issue 54): ốc sên bò ở góc dưới-phải ô (nửa thò ra mép, không che cây); thiếu sprite thì emoji
        if (p.crop.progress < 1 && !p.crop.dead && !p.crop.rotten && plotSeasonMul(state, p) < 1) {   // trong nhà kính đang chạy thì không chậm
          const sn = SPR2?.slowSnail?.[Math.floor(now / 700 + p.idx) % 2];
          if (sn) blit(sn, px + 11, py + 9);
          else { ctx.font = '6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🐌', px + 13, py + 6); }
        }
        // vụ này đang giữ mấy sao (issue 52): ba sao nhỏ ở mép trên ô (mép dưới là chỗ hạt, mầm), tụt ngay khi lỡ chăm
        const pips = !gi && !p.crop.dead && !p.crop.rotten && SPR52_OLD.plotStars?.[cropStar(p.crop) - 1];
        if (pips) blit(pips, px + 2, py);
      }
      if (p.weeds) blit(SPR.problem.weed, px + 3, py + 9);
      if (p.crop?.bugs) blit(SPR.problem.bug, px + 4 + Math.round(Math.sin(now / 260 + p.idx) * 2), py + 3 + (Math.floor(now / 300 + p.idx) % 2));
    });
    if (prob && !roofed(p.idx)) bub(px + 8, py + 1, problemIcon(prob), 'p' + p.idx);   // dưới mái nhà kính: bảng ở cửa báo thay
  }

  // mái nhà kính + bảng trạng thái ở cửa + bong bóng việc gấp, mờ theo roofInfo; xếp theo mép dưới khối nên phủ lên cây bên trong
  for (const r of roofInfo) {
    const e = glassFields.find(x => x.id === r.id), px = e.c * TS, py = e.r * TS;
    if (r.alpha <= 0.01 || !vis(px + 24, py + 12, 60)) continue;
    add((e.r + FIELD_SIZE) * TS - 0.5, () => {
      ctx.globalAlpha = r.alpha;
      blit(r.broken ? GH.houseBroken : GH.house, px + GH_AT.house.x, py + GH_AT.house.y);
      const bx = px + GH_AT.board.x, by = py + GH_AT.board.y;
      blit(GH.board, bx, by);
      [r.board.dry, r.board.bugs, r.board.ripe, r.board.rotten].forEach((n, i) => { const d = GH_AT.digit(i); blit(GH.digits[Math.min(9, n)], bx + d.x, by + d.y); });
      if (r.urgent) blit(GH.alert[Math.floor(now / 400) % 2], px + GH_AT.alert.x, py + GH_AT.alert.y + (Math.floor(now / 400) % 2 ? -1 : 0));
      ctx.globalAlpha = 1;
    });
  }

  // trứng, phân
  // trứng trong bụi: vẽ ổ cỏ (đã soi thì vẽ như trứng đã soi)
  for (const e of farm ? state.eggs ?? [] : []) if (e.x != null && vis(e.x, e.y)) add(e.y, () => {
    const im = (e.tile && !e.candled && (e.sp === 'vit' ? SPR3?.eggNestDuck : SPR3?.eggNest)) || eggImgOf(e);
    blit(im, e.x - im.width / 2, e.y - im.height + 1);
    // chó vừa đánh hơi ra (lệnh Tìm trứng): treo dấu mùi cho dễ thấy
    const sn = e.found && SPR3?.sniffMark;
    if (sn) { const f = sn.left[Math.floor(now / 320) % sn.left.length]; blit(f, e.x - f.width / 2, e.y - im.height - f.height - 1); }
  });
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
  // thóc vừa rải ở cửa chuồng: bao cám nghiêng xuống rồi hạt nằm trên đất, mờ dần
  for (const g of farm ? wd.grains ?? [] : []) {
    const u = (now - g.t0) / GRAIN_MS;
    if (u < 0 || u > 1 || !vis(g.x, g.y)) continue;
    add(g.y - 1, () => {
      ctx.globalAlpha = u > 0.75 ? (1 - u) / 0.25 : 1;
      const im = SPR3?.grainScatter;
      if (im) blit(im, g.x - im.width / 2, g.y - im.height + 5);
      else { rect(ctx, '#e8c34a', g.x - 6, g.y - 2, 12, 3); }
      const sk = SPR3?.feedSack;
      if (sk && u < 0.45) blit(sk, g.x + 5, g.y - sk.height - 3 + Math.round(u * 6));
      ctx.globalAlpha = 1;
    });
  }
  // đồ trang trí
  for (const d of m.decos) {
    if (!vis(d.x, d.y)) continue;
    if (d.kind === 'deco_lowfence') { const fe = lowFenceAt(m, d.ent); add(d.y, () => blit(fe, d.ent.c * TS, d.ent.r * TS)); continue; }   // hàng rào thấp: vẽ theo ô, ngang hay dọc tùy hàng xóm
    if (d.kind === 'deco_rattrap') { const tp = trapImg(d.ent); add(d.y, () => blit(tp, d.x - tp.width / 2, d.y - tp.height + 1)); continue; }   // bẫy chuột: gài / đã sập
    const im = d.kind === 'deco_scarecrow' && d.ent?.down ? WX.scarecrowDown : decoImg(d.kind);   // bù nhìn bị bão quật đổ (issue 55)
    add(d.y, () => blit(im, d.x - im.width / 2, d.y - im.height + 1));
  }

  // con vật
  for (const a of animals) {
    if (a.x == null || !vis(a.x, a.y)) continue;
    const rt = wd.rt.get('a' + a.id) ?? {};
    const frame = rt.walking ? Math.floor(rt.anim * 7) % 2 : rt.peck ? Math.floor(rt.anim * 6) % 2 : 0;
    const sleeping = !rt.walking && (night > 0.6 || rt.nap || a.stray);   // ban đêm, hoặc con già ngủ gật
    let im = animalImg(a, rt.face ?? 'left', frame, sleeping, rt.scared);
    if (!im) continue;
    if (a.pregnant && !sleeping) im = bellied(im);
    const dy = rt.peck && frame ? 1 : 0;
    const bath = (wd.baths ?? []).find(b => b.id === a.id && !b.wallow), ph = bath && bathPhase(bath, now);
    const wal = !bath && (wd.baths ?? []).some(b => b.id === a.id && b.wallow && now - b.t0 < WALLOW_MS);
    // dơ: bùn bám đúng dáng con vật, dơ nhiều thì ruồi bay quanh; đang tắm thì hiện sạch
    const lv = bath ? 0 : a.dirty >= 80 ? 3 : a.dirty >= 55 ? 2 : a.dirty >= 30 ? 1 : 0;
    const body = lv ? dirty(im, lv) : im;
    const shake = ph?.name === 'shake' ? Math.round(Math.sin(now / 38) * 2) : 0;
    add(a.y, () => {
      const bx = a.x - im.width / 2 + shake, by = a.y - im.height + 1 + dy;
      if (wal && a.type === 'heo' && SPR3?.heoMud) { const m = SPR3.heoMud[Math.floor(now / 220) % 2]; blit(m, a.x - m.width / 2, a.y - m.height + 1); }
      else blit(body, bx, by);
      if (lv >= 2 && SPR3?.fx?.flies) { const f = SPR3.fx.flies[Math.floor(now / 160 + a.id) % 3]; blit(f, a.x - f.width / 2, by - f.height + 2); }
      if (ph?.name === 'soap') { const sz = im.width < 14 ? 's' : im.width < 20 ? 'm' : 'l', o = SPR3.fx.soap[sz][Math.floor(now / 250) % 2]; blit(o, a.x - o.width / 2, a.y - (im.height + o.height) / 2 + 1); }
      if (ph?.name === 'rain' && SHOWER_ART) { const o = SHOWER_ART.drops[Math.floor(now / 130) % 3]; blit(o, a.x - o.width / 2, a.y - im.height - o.height / 2 + 3); }
      if (ph?.name === 'shake') { const sp = SPR3.fx.splash[Math.floor(ph.t * 3.2) % 3]; blit(sp, a.x - sp.width / 2, a.y - im.height - sp.height / 2); }
      if (ph?.name === 'sparkle') { const sp = SPR3.fx.sparkleClean[Math.floor(ph.t * 3) % 3]; blit(sp, a.x - sp.width / 2, a.y - im.height - sp.height / 2 + 2); }
      if (a.hurt && SPR3?.hurtPatch) { const hp = SPR3.hurtPatch; blit(hp, a.x - hp.width / 2 + 1, a.y - im.height / 2 - hp.height / 2 + 1); }   // băng gạc vết chuột cắn
    });
    const emote = wd.emotes.get('a' + a.id);
    let icon = null, tone = null;
    if (emote && emote.until > now) icon = statusIcon(emote.icon);
    else if (state.time < (a.scaredUntil ?? 0)) icon = statusIcon('scared');
    else if (a.hurt) { icon = statusIcon('hurtIcon') ?? statusIcon('sick'); tone = 'bad'; }   // con non bị chuột cắn: băng gạc nhấp nháy đỏ
    else if (a.sick) { icon = statusIcon('sick'); tone = a.sick >= 2 ? 'bad' : 'warn'; }
    else if (rt.scared) icon = statusIcon('scared');
    else if (a.stray) icon = SPR3?.strayIcon ?? statusIcon('zzz');   // con lạc ngủ ngoài 💤
    else if (a.hunger < 35) icon = statusIcon('hungry');
    else if (a.ready) icon = statusIcon(a.type === 'cuu' ? 'wool' : 'milk');
    else if (a.pregnant) icon = statusIcon('pregnant');
    else if (sleeping) icon = statusIcon('zzz');
    bub(a.x, a.y - im.height - 1, icon, 'a' + a.id, tone);
    // nguy kịch: đếm ngược trên đầu
    const left = sickLeft(a);
    if (left != null) add(a.y + 2, () => {
      const t = mmss(left), w = t.length * 4 + 5, tx = Math.round(a.x), ty = Math.round(a.y - im.height - 24);
      rect(ctx, '#3b2412', tx - w / 2 - 1, ty - 1, w + 2, 9);
      rect(ctx, now % 700 < 350 ? '#e5452f' : '#ff8a72', tx - w / 2, ty, w, 7);
      ctx.font = '6px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#fff6dc'; ctx.fillText(t, tx, ty + 6);
    });
    if (a.retired) add(a.y + 1, () => { ctx.font = '7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🪑', a.x + im.width / 2 + 1, a.y); });   // nghỉ hưu: ghế bên cạnh
  }
  // Chú Ba tới cổng, dắt con vật vừa bán đi (cảnh thuần hiển thị; main.js đẩy vào wd.deals khi bán xong)
  const gin = m.gateIn;
  for (const d of farm && gin ? wd.deals ?? [] : []) {
    const u = (now - d.t0) / DEAL_MS, spot = { x: d.x, y: d.y };
    if (u < 0 || u > 1) continue;
    const lerp = (p, q, k) => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k });
    const out = u > 0.47, cb = u < 0.35 ? lerp(gin, spot, u / 0.35) : !out ? spot : lerp(spot, gin, (u - 0.47) / 0.53);
    const from = u < 0.35 ? gin : spot, to = u < 0.35 ? spot : gin, mv = u < 0.35 || out;
    const dx = to.x - from.x, dy = to.y - from.y, dir = !mv ? 0 : Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0;
    const set = SPR3?.npcChuBa?.[dir], im = set ? set[mv ? Math.floor(now / 140) % set.length : 0] : null;
    const pet = animalImg({ type: d.type, stage: d.stage, sex: d.sex }, dx < 0 ? 'left' : 'right', out ? Math.floor(now / 160) % 2 : 0);
    const L = Math.hypot(dx, dy) || 1, ap = out ? { x: cb.x - dx / L * 18, y: cb.y - dy / L * 18 } : spot;
    add(Math.max(cb.y, ap.y), () => {
      ctx.globalAlpha = u > 0.92 ? (1 - u) / 0.08 : 1;
      if (pet) blit(pet, ap.x - pet.width / 2, ap.y - pet.height + 1);
      if (out) { ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(cb.x + (dx < 0 ? -5 : 5), cb.y - 9); ctx.lineTo(ap.x, ap.y - 4); ctx.stroke(); }
      if (im) blit(im, cb.x - 8, cb.y - 23);
      if (u > 0.3 && u < 0.62) {   // bong bóng báo giá
        const t = d.kg != null ? `${d.kg} kg × ${d.unit} = ${d.price} xu` : `${d.price} xu`;
        ctx.font = '6px sans-serif'; ctx.textAlign = 'center';
        const w = ctx.measureText(t).width + 6, bx = Math.round(cb.x - w / 2), by = Math.round(cb.y - 36);
        rect(ctx, '#3b2412', bx - 1, by - 1, w + 2, 11); rect(ctx, '#fff6dc', bx, by, w, 9);
        ctx.fillStyle = '#3b2412'; ctx.fillText(t, cb.x, by + 7);
      }
      ctx.globalAlpha = 1;
    });
  }
  // con vật già ra đi: thiên thần bay lên rồi mờ dần (main.js đẩy vào wd.angels khi có event 'passed')
  for (const g of wd.angels ?? []) {
    const t = (now - g.t0) / ANGEL_MS;
    if (t < 0 || t > 1 || !vis(g.x, g.y, 60)) continue;
    const im = SPR3?.angel?.[Math.floor(now / 250) % 2] ?? angelFallback();
    add(g.y + 100, () => {
      ctx.globalAlpha = t < 0.7 ? 1 : (1 - t) / 0.3;
      blit(im, g.x - im.width / 2 + Math.round(Math.sin(t * 9) * 2), g.y - im.height - t * 46);
      ctx.globalAlpha = 1;
    });
  }
  // chỗ chó đang gác (lệnh Canh khu)
  const post = farm && dogPost(state);
  if (post && SPR3?.guardPost) {
    const px = post.c * TS + 8, py = post.r * TS + 14;
    if (vis(px, py)) add(py, () => blit(SPR3.guardPost, px - SPR3.guardPost.width / 2, py - SPR3.guardPost.height));
  }
  // chó (đi theo chủ thì vẽ cả ở làng, trong nhà; issue 31: ngủ gật 💤, sủa "GÂU GÂU!", chạy đuổi khách lạ, khúc xúc xích dưới đất)
  const dog = state.dog;
  if ((dog.scene ?? 'farm') === here && dog.x != null && vis(dog.x, dog.y)) {
    const rt = wd.rt.get('dog') ?? {};
    const face = rt.face ?? 'right', nap = dogNapping(state), quiet = dogQuiet(state);
    const moving = rt.walking || rt.pose === 'herd';
    const im = rt.bark ? guardImg(dog, face, rt, now)   // đang sủa, đuổi khách lạ
      : rt.pose ? dogPoseImg(dog, rt.pose, face, Math.floor(rt.anim * (rt.pose === 'herd' ? 9 : 3)))
      : dogImg(dog, face, moving ? Math.floor(rt.anim * (rt.run ? 10 : 7)) % 2 : 0, nap || (!moving && rt.nap));
    if (im) {
      add(dog.y, () => {
        if (quiet) blit(SPR2?.sausageGround ?? SPR.items?.dogfood, dog.x - 4, dog.y - 5);   // khúc xúc xích nó đang gặm
        blit(im, dog.x - im.width / 2, dog.y - im.height + 1);
      });
      if (rt.bark) add(dog.y + 0.5, () => barkBubble(ctx, blit, dog.x, dog.y - im.height - 2));
      const emote = wd.emotes.get('dog');
      const icon = emote && emote.until > now ? statusIcon(emote.icon) : nap || rt.nap ? statusIcon('zzz') : dog.hunger < 30 ? statusIcon('hungry') : null;
      if (!rt.bark) bub(dog.x, dog.y - im.height - 1, icon, 'dog');
      // bong bóng lệnh đang thi hành
      const tr = dog.cmd && TRICKS[dog.cmd.id], bb = SPR3?.cmdBubble, ti = tr && SPR3?.trickIcon?.[dog.cmd.id];
      if (tr && bb && ti) add(dog.y + 1, () => {
        // lòng bong bóng 12x10 (5 hàng dưới là đuôi nhọn): thu icon 16x16 cho vừa
        const bx = Math.round(dog.x + im.width / 2 - 2), by = Math.round(dog.y - im.height - bb.height - 1);
        const w = Math.min(12, ti.width), hh = Math.min(10, ti.height);
        blit(bb, bx, by);
        ctx.drawImage((HD && hdOf(ti)) || ti, bx + Math.round((bb.width - w) / 2), by + 2, w, hh);
      });
    }
  }
  // cửa mèo trên nhà: mèo ra vào tự do (chỉ hiện khi đã nuôi mèo hoặc đã xây nhà mèo)
  const cd = farm && m.catDoor, cdi = SPR3?.catDoor;
  if (cd && cdi && (cats.length || state.cats?.length || catHouses(state).length) && vis(cd.x, cd.y)) add(cd.y + 7, () => blit(cdi, cd.x - cdi.width / 2, cd.y - cdi.height + 1));
  // mèo (issue 44): ban ngày ngoài vườn, ban đêm ngủ trong nhà
  for (const c of cats) {
    if (c.x == null || !vis(c.x, c.y)) continue;
    const rt = wd.rt.get('c' + c.id) ?? {};
    const im = catImg(c, rt);
    if (!im) continue;
    add(c.y, () => {
      blit(im, c.x - im.width / 2, c.y - im.height + 1);
      const side = rt.face === 'right' ? 1 : -1;
      // mèo con vờn cuộn len cạnh chân
      const yn = rt.yarn && SPR3?.catYarn?.[rt.face ?? 'left'];
      if (yn) { const f = yn[Math.floor(now / 260) % yn.length]; blit(f, c.x + side * (im.width / 2 + 1) - (side < 0 ? f.width : 0), c.y - f.height + 1); }
      // tới chỗ người chơi rồi: thả con chuột xuống trước mặt để khoe
      const tp = c.trophy && rt.shown && SPR3?.ratTrophy;
      if (tp) blit(rt.face === 'right' ? derived(tp, 'flip', flip) : tp, c.x + side * (im.width / 2) - (side < 0 ? tp.width : 0), c.y - tp.height + 2);
    });
    // cãi nhau với chó: bong bóng ồn ào trên đầu (vui thôi, không hại gì)
    const sb = state.time < (c.spatUntil || 0) && SPR3?.spatBubble?.left;
    if (sb) { const f = sb[Math.floor(now / 200) % sb.length]; add(c.y + 1, () => blit(f, c.x - f.width / 2, c.y - im.height - f.height - 2)); }
    const emote = wd.emotes.get('c' + c.id);
    const icon = emote && emote.until > now ? statusIcon(emote.icon) : c.sick ? statusIcon('sick') : c.sleep ? statusIcon('zzz') : c.hunger < 15 ? statusIcon('hungry') : null;
    if (!sb) bub(c.x, c.y - im.height - 1, icon, 'c' + c.id, c.sick >= 2 ? 'bad' : c.sick ? 'warn' : null);
  }
  // quạ & trộm NPC (thằng Tèo, Tí Sún, chồn hương)
  for (const t of threats) {
    if (t.x == null || !vis(t.x, t.y, 40)) continue;
    const rt = wd.rt.get('t' + t.id) ?? {};
    const face = rt.dir === 2 ? 'right' : 'left';
    if (t.kind === 'crow') {
      const alt = rt.alt ?? 0, frame = t.state === 'eating' ? Math.floor(now / 350) % 2 : Math.floor(now / 90) % 2;
      const im = crowImg(rt.face ?? 'left', frame);
      add(t.y + alt + 20, () => blit(im, t.x - im.width / 2, t.y - alt - im.height + 1));
    } else if (t.kind === 'civet') {
      const pose = t.state === 'eating' ? 'catch' : t.state === 'leaving' ? 'flee' : 'walk';
      const im = civetImg(pose, face, Math.floor(now / (pose === 'flee' ? 110 : 190)));
      if (im) add(t.y, () => blit(im, t.x - Math.round(im.width / 2), t.y - im.height + 1));
    } else {
      const dir = rt.dir ?? 0, fr = rt.walking ? [1, 0, 2, 0][Math.floor(rt.anim * 8) % 4] : 0;
      const k = dir === 1 || dir === 2 ? (fr === 2 ? 0 : fr) : fr;
      // Tí Sún rón rén lúc đang lục trứng; lúc đi thì dùng bộ khung đi riêng của nó
      const im = t.kind === 'tisun'
        ? (t.state === 'eating' ? tisunImg('sneak', face, Math.floor(now / 280)) : null) ?? tisunImg('walk', face, k, dir) ?? charFrames(TEO_LOOK)[dir][k]
        : charFrames(TEO_LOOK)[dir][k];
      add(t.y, () => { blit(im, t.x - 8, t.y - 23); if (t.kind === 'thief') teoGear(blit, state, t, face); });
    }
    // bong bóng báo trộm: nhấp nháy trên đầu kẻ đang ra tay
    const bb = t.kind !== 'crow' && t.state === 'eating' && SPR3?.thiefBubble;
    if (bb) add(t.y + 0.5, () => {
      ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(now / 240));
      blit(bb, Math.round(t.x - bb.width / 2), Math.round(t.y - (t.kind === 'civet' ? 14 : 28) - bb.height));
      ctx.globalAlpha = 1;
    });
  }
  // người giao hàng: ôm thùng hàng đi vào, giao xong để thùng trước cửa kho rồi đi tay không ra cổng
  if (courier) {
    const box = COURIER_ART?.box, c = courier;
    if (c.state === 'leaving' && box) add(c.at.y - 1, () => blit(box, Math.round(c.at.x + 7 - box.width / 2), Math.round(c.at.y - box.height + 1)));
    if (c.x != null && vis(c.x, c.y, 40)) {
      const rt = wd.rt.get('courier') ?? {}, dir = rt.dir ?? 3, fr = rt.walking ? [1, 0, 2, 0][Math.floor((rt.anim ?? 0) * 8) % 4] : 0;
      const set = COURIER_ART?.[c.state === 'leaving' ? 'empty' : 'carry'], im = set?.[dir]?.[fr] ?? charFrames(COURIER_LOOK)[dir][fr];
      add(c.y, () => blit(im, Math.round(c.x - 8), Math.round(c.y - 23)));
    }
  }
  // kẻ săn mồi: chuột lon ton dưới đất, chồn men theo đất, diều hâu bay có bóng riêng in trên mặt đất
  for (const p of preds) {
    if (p.x == null || !vis(p.x, p.y, 48)) continue;
    const rt = wd.rt.get('p' + p.id) ?? {};
    const im = predImg(p, rt);
    if (!im) continue;
    if (p.kind === 'hawk') {
      const gy = rt.ground ?? p.y, sh = SPR3?.hawkShadow;
      if (sh) add(gy - 0.5, () => { ctx.globalAlpha = 0.7; blit(sh, p.x - sh.width / 2, gy - sh.height / 2); ctx.globalAlpha = 1; });
      add(gy + 24, () => blit(im, p.x - im.width / 2, p.y - im.height + 1));
    } else add(p.y, () => blit(im, p.x - im.width / 2, p.y - im.height + 1));
    if (p.state !== 'leaving' && p.strikeAt - state.time <= 10_000) bub(p.x, p.y - im.height - 1, statusIcon('predIcon') ?? statusIcon('warn'), 'pred' + p.id, 'bad');   // bong bóng cảnh báo 🔴
  }
  // người chơi
  {
    const p = state.player;
    const dir = p.dir ?? 0;
    const fr = wd.moving ? [1, 0, 2, 0][Math.floor(wd.walkT * 8) % 4] : 0;
    const k = dir === 1 || dir === 2 ? (fr === 2 ? 0 : fr) : fr;
    const shake = wd.stun > 0 ? (Math.floor(now / 60) % 2 ? 1 : -1) : 0;
    const load = carry != null ? state.animals.find(a => a.id === carry) : null;   // chỉ đẩy xe khi đang chở con vật
    const bs = load ? (BARROW?.barrowLoaded ?? BARROW?.barrow) : null;
    const bw = bs?.[dir === 1 ? 'left' : 'right']?.[wd.moving ? Math.floor(now / 160) % 2 : 0] ?? null;
    if (bw && !wd.sleeping) {
      const bx = p.x + (dir === 1 ? -bw.width - 3 : 3), by = p.y - bw.height + 2;
      add(p.y - 0.1, () => {
        blit(bw, bx, by);   // xe rùa đẩy bên người
        const im = animalImg(load, dir === 1 ? 'left' : 'right', 0, false), k = Math.min(1, 11 / Math.max(im?.width ?? 1, 1), 9 / Math.max(im?.height ?? 1, 1));
        if (im) {   // con vật thu nhỏ nằm trong thùng xe
          const w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
          ctx.drawImage((HD && hdOf(im)) || im, Math.round(bx + (bw.width - w) / 2), Math.round(by + 8 - h + 1), w, h);
        }
      });
    }
    if (!wd.sleeping) add(p.y, () => {
      if (state.sit && !wd.moving) {   // ngồi ghế đá: hạ thân xuống, cắt phần chân (chưa có sprite ngồi riêng)
        ctx.save(); ctx.beginPath(); ctx.rect(p.x - 12, p.y - 36, 24, 37); ctx.clip();
        person(state.look, dir, 0, p.x - 8 + shake, p.y - 19);
        ctx.restore();
      } else person(state.look, dir, k, p.x - 8 + shake, p.y - 23);
      if (state.stamina <= 0) {   // hết thể lực: thở hồng hộc, mồ hôi bên đầu
        const sw = SPR2?.sweat?.[Math.floor(now / 350) % 2];
        if (sw) blit(sw, p.x + 4, p.y - 29);
      }
      if (wd.stun > 0) stunStars(ctx, blit, p.x, p.y - 25, now);   // bị chó đớp / trượt phân: đứng hình, sao quay quanh đầu
    });
  }
  // người khác cùng bản đồ (issue 25, đã nội suy): người gần vẽ cả nhân vật, người xa (làng đông) chỉ hiện tên mờ ở phần chữ
  for (const o of f.peers ?? []) {
    if (!o.full || !vis(o.x, o.y)) continue;
    const dir = o.dir ?? 0;
    const fr = o.moving ? [1, 0, 2, 0][Math.floor(now / 125) % 4] : 0;
    const k = dir === 1 || dir === 2 ? (fr === 2 ? 0 : fr) : fr;
    shadow(o.x, o.y, 6);
    add(o.y, () => person(o.look, dir, k, o.x - 8, o.y - 23));
  }

  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.fn();

  // 4) lớp phủ: bong bóng, viền chọn, mũi tên, thanh tiến độ
  let bi = 0;
  for (const b of bubbles) {
    if (!vis(b.x, b.y)) continue;
    const bob = Math.round(Math.sin(now / 320 + bi++) * 1);
    const bx = Math.round(b.x - 6), by = Math.round(b.y - 15 + bob);
    const blink = b.tone === 'bad' ? 0.55 + 0.45 * Math.abs(Math.sin(now / 240)) : 1;   // đỏ thì nhấp nháy
    ctx.globalAlpha = 0.92 * blink;
    put(ctx, b.tone === 'warn' ? tinted(SPR.bubble, '#f7d547', 0.55) : b.tone === 'bad' ? tinted(SPR.bubble, '#e5452f', 0.6) : SPR.bubble, bx, by);
    ctx.globalAlpha = 1;
    put(ctx, b.icon, Math.round(bx + 6.5 - b.icon.width / 2), Math.round(by + 5.5 - b.icon.height / 2));
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
        // công cụ cấp cao: khung vàng các ô sẽ bị tác động
        const tiles = tg.target.kind === 'plot' ? actionsFor(state, tg.target)[0]?.tiles : null;
        if (tiles?.length > 1) {
          ctx.fillStyle = 'rgba(255,216,74,0.22)'; ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 1;
          for (const i of tiles) {
            const o = m.plotTile(i);
            ctx.fillRect(o.c * TS, o.r * TS, TS, TS);
            ctx.strokeRect(o.c * TS + 0.5, o.r * TS + 0.5, TS - 1, TS - 1);
          }
        }
      }
      if (tg.target.kind === 'strip') {   // viền mờ dải đất kế tiếp
        const d = nextStrip(state, tg.target.dir);
        if (d) {
          ctx.globalAlpha = 0.55 + 0.25 * Math.sin(now / 250);
          ctx.fillStyle = 'rgba(255,240,150,0.3)'; ctx.fillRect(d.c * TS, d.r * TS, d.w * TS, d.h * TS);
          ctx.strokeStyle = '#ffe58a'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
          ctx.strokeRect(d.c * TS + 0.5, d.r * TS + 0.5, d.w * TS - 1, d.h * TS - 1);
          ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
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
    ctx.fillStyle = `rgba(12,20,74,${((indoor ? 0.3 : f.battery ? 0.4 : 0.52) * night).toFixed(3)})`;   // trong nhà có đèn, tối nhẹ hơn; tiết kiệm pin: nhẹ hơn nữa vì bỏ ánh đèn
    ctx.fillRect(0, 0, width, height);
    ctx.setTransform(scale, 0, 0, scale, -camX, -camY);
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, rgb, a) => {
      if (f.battery || !vis(x, y, r)) return;   // tiết kiệm pin: không vẽ gradient đèn
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, `rgba(${rgb},${(a * night).toFixed(3)})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    for (const d of m.decos) if (d.kind === 'deco_lamp') { const im = decoImg(d.kind); glow(d.x, d.y - im.height * 0.75, 60, '255,190,90', 0.8); }
    const house = m.building('house');
    if (house) for (const wx of [19, 62]) glow(house.x + wx, house.y + 62, 24, '255,205,110', 0.55);
    for (const b of m.buildings) if (b.sprite === 'lampPost') glow(b.x + 6, b.y + 8, 44, '255,190,90', 0.6);   // đèn đường trong làng
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!indoor) drawWeather(ctx, f, night, quality);   // trong nhà: không thấy trời (issue 55)

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
    const text = `Nông trại ${state.visit?.owner ?? state.name}`;
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
    if (b.sub && !(b.id === 'friendGate' && state.mode === 'online')) outlined(b.sub, toSX(cx), toSY(b.y + img.height) + 11 * scale, Math.round(11 * dpr), '#ffe9a0');
    if (b.id === 'market' && !marketOpen(state)) fit('Đóng cửa', toSX(b.x + 24), toSY(b.y + 22 + 9), 20 * scale, Math.round(5.5 * scale), '#ffe9a0');
    if (b.id === 'friendGate') fit('Bạn bè', toSX(b.x + 20), toSY(b.y + 18), 14 * scale, Math.round(4.5 * scale), '#4a2c14');
  }
  // biển chuồng: tên ngắn + số con/sức chứa
  for (const p of m.penList) {
    const cx = (p.rect.c + p.rect.w / 2) * TS, y = p.rect.r * TS - 1;
    if (!vis(cx, y, 40)) continue;
    outlined(`${PEN_SHORT[p.type]} ${penUse(state, p.id)}/${penCapOf(p.ent)}`, toSX(cx), toSY(y), Math.round(10 * dpr), '#fff6d8');
  }
  // tên người chơi
  {
    const p = state.player;
    outlined(state.name, toSX(p.x), toSY(p.y - (f.busy != null ? 33 : 27)), Math.round(11 * dpr), '#ffffff');
  }
  // người khác: tên (người xa trong làng đông chỉ có tên mờ), bong bóng chat, biểu cảm bay lên; rồi tới bong bóng của mình
  for (const o of f.peers ?? []) {
    if (!vis(o.x, o.y)) continue;
    ctx.globalAlpha = o.full ? 1 : 0.45;
    outlined(o.name, toSX(o.x), toSY(o.y - (o.full ? 27 : 8)), Math.round(11 * dpr), '#d6f1ff');
    ctx.globalAlpha = 1;
    talk(ctx, o, toSX(o.x), toSY(o.y - (o.full ? 27 : 8)) - 13 * dpr, dpr, now);
  }
  if (f.me) talk(ctx, f.me, toSX(state.player.x), toSY(state.player.y - (f.busy != null ? 33 : 27)) - 13 * dpr, dpr, now);
  // chữ bay
  for (const e of f.fx) {
    const age = (now - e.t0) / 1400;
    if (age < 0 || age > 1) continue;
    ctx.globalAlpha = age < 0.7 ? 1 : (1 - age) / 0.3;
    outlined(e.text, toSX(e.x), toSY(e.y - 28 - 22 * age), Math.round(15 * dpr), e.color || '#fff', '#2a1a0a', 4);
  }
  ctx.globalAlpha = 1;
}
