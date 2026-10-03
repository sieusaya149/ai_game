// Nối sprite cũ → sprite 2x (kiểu A: art gấp đôi, cỡ trên màn hình giữ nguyên).
// Các file art2x (art6..art12) xuất SPRn cùng khóa, cùng cấu trúc với bộ cũ (SPR, SPR2, SPR3, SPR4), mỗi ảnh đúng 2w×2h.
// Lúc tải: đi song song hai cây khóa, ảnh nào đúng cỡ 2x thì ghi vào bảng. File chưa có / khóa chưa có thì không có trong
// bảng, chỗ vẽ tự dùng ảnh cũ. Nhân vật dựng theo ngoại hình (art.character → art5.characterHD) nối lúc cần.
import { SPR, character } from './art.js';
import { SPR2 } from './art2.js';
import { SPR3 } from './art3.js';
import { SPR4 } from './art4.js';
import { characterHD } from './art5.js';

const FILES = [6, 7, 8, 9, 10, 11, 12, 13, 52];   // art52: dấu sao nông sản (issue 52), hình mới nên tự mang bản thường SPR52_OLD
const OLD = [SPR, SPR2, SPR3, SPR4];
const MAP = new WeakMap();
const stats = { files: [], linked: 0, bad: [] };

const isImg = v => typeof HTMLCanvasElement !== 'undefined' && (v instanceof HTMLCanvasElement || v instanceof HTMLImageElement);
function link(o, n, path) {
  if (o == null || n == null) return;
  if (isImg(o) || isImg(n)) {
    if (MAP.has(o)) return;   // đã nối (khóa trùng ở file trước, hoặc SPRn_EXTRA)
    if (!isImg(o) || !isImg(n)) return stats.bad.push(`${path}: không phải ảnh`);
    if (n.width !== o.width * 2 || n.height !== o.height * 2) return stats.bad.push(`${path}: ${o.width}x${o.height} → ${n.width}x${n.height}`);
    MAP.set(o, n); stats.linked++;
    return;
  }
  if (typeof o !== 'object' || typeof n !== 'object') return;
  for (const k of Object.keys(n)) link(o[k], n[k], `${path}.${k}`);
}

// import động: file chưa có (404) hay lỗi thì bỏ qua, không làm vỡ trang
const mods = await Promise.all(FILES.map(i => import(`./art${i}.js`).then(m => [i, m], () => [i, null])));
const OLD_BY = { SPR, SPR2, SPR3, SPR4 };
const EXTRA = { medicine3: () => SPR3?.items?.medicine };   // SPR.items.medicine (14x14) và SPR3.items.medicine (12x12) cùng đường khóa
// Hàm dựng ảnh dẫn xuất bản 2x mà các file art2x xuất kèm (vd muddyHD của art9 thay cho art3.muddy)
export const hdFn = {};
for (const [i, m] of mods) {
  const S = m?.[`SPR${i}`];
  if (!S) continue;
  stats.files.push(`art${i}.js`);
  for (const [n, v] of Object.entries(m)) if (typeof v === 'function' && /HD$/.test(n)) hdFn[n] ??= v;
  // cặp không đặt chung đường khóa được (trùng tên ở hai bộ cũ khác cỡ): SPRn_EXTRA.<tên> nối tay theo EXTRA
  for (const [n, img] of Object.entries(m[`SPR${i}_EXTRA`] ?? {})) { const o = EXTRA[n]?.(); if (o) linkPair(o, img); else stats.bad.push(`SPR${i}_EXTRA.${n}: không biết thay ảnh nào`); }
  const from = m[`SPR${i}_FROM`] ?? {};   // khóa nào chỉ thay cho một bộ cũ (vd crow: 'SPR')
  const own = m[`SPR${i}_OLD`];           // hình mới (không có trong bộ cũ): file tự xuất bản thường cùng khóa
  for (const k of Object.keys(S)) {
    const olds = own?.[k] != null ? [own] : (from[k] ? String(from[k]).split('+').map(n => OLD_BY[n]) : OLD).filter(O => O?.[k] != null);
    if (!olds.length) stats.bad.push(`SPR${i}.${k}: bộ cũ không có khóa này`);
    for (const O of olds) link(O[k], S[k], `SPR${i}.${k}`);
  }
}

// Giếng 4 cấp (issue 56): bộ thường WELLS và bộ 2x WELLS_HD cùng nằm trong artwell.js
const wellArt = await import('./artwell.js').catch(() => null);
if (wellArt) { stats.files.push('artwell.js'); wellArt.WELLS.forEach((o, i) => link(o, wellArt.WELLS_HD[i], `WELLS.${i}`)); }
// Bồn chứa, bồn phụ, trạm bơm phụ, ống nước, vùng phủ, thanh mực nước (issue 57): cùng cây khóa trong arttank.js
const tankArt = await import('./arttank.js').catch(() => null);
if (tankArt?.TANK_ART) { stats.files.push('arttank.js'); link(tankArt.TANK_ART, tankArt.TANK_ART_HD, 'TANK_ART'); }
// Tự động hóa khối ruộng (issue 58): đất màu mỡ, ống nhỏ giọt, máy phun, biểu tượng nâng cấp, cùng cây khóa trong art58.js
const autoArt = await import('./art58.js').catch(() => null);
if (autoArt?.AUTO_ART) { stats.files.push('art58.js'); link(autoArt.AUTO_ART, autoArt.AUTO_ART_HD, 'AUTO_ART'); }

// Ảnh 2x của một ảnh cũ (hoặc undefined)
export const hdOf = img => (img ? MAP.get(img) : undefined);
// Ghi cặp ảnh dẫn xuất (lật, tô màu...) làm từ ảnh cũ và ảnh 2x bằng cùng một phép
export function linkPair(o, n) { if (o && n && n.width === o.width * 2 && n.height === o.height * 2) MAP.set(o, n); }
// Khung nhân vật theo ngoại hình (art.character), đã nối sẵn sang bộ 2x
const looks = new Set();
export function charFrames(look) {
  const o = character(look), key = JSON.stringify(look);
  if (!looks.has(key)) {
    looks.add(key);
    const n = characterHD(look);
    o.forEach((dir, d) => dir.forEach((im, k) => linkPair(im, n?.[d]?.[k])));
  }
  return o;
}
export const hdStats = () => ({ ...stats, bad: [...stats.bad] });
