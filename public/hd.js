// Nối sprite cũ → sprite 2x (kiểu A: art gấp đôi, cỡ trên màn hình giữ nguyên).
// Các file art2x (art6..art12) xuất SPRn cùng khóa, cùng cấu trúc với bộ cũ (SPR, SPR2, SPR3, SPR4), mỗi ảnh đúng 2w×2h.
// Lúc tải: đi song song hai cây khóa, ảnh nào đúng cỡ 2x thì ghi vào bảng. File chưa có / khóa chưa có thì không có trong
// bảng, chỗ vẽ tự dùng ảnh cũ. Nhân vật dựng theo ngoại hình (art.character → art5.characterHD) nối lúc cần.
import { SPR, character } from './art.js';
import { SPR2 } from './art2.js';
import { SPR3 } from './art3.js';
import { SPR4 } from './art4.js';
import { characterHD } from './art5.js';

const FILES = [6, 7, 8, 9, 10, 11, 12, 13, 14];
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
  for (const k of Object.keys(S)) {
    const olds = (from[k] ? String(from[k]).split('+').map(n => OLD_BY[n]) : OLD).filter(O => O?.[k] != null);
    if (!olds.length) stats.bad.push(`SPR${i}.${k}: bộ cũ không có khóa này`);
    for (const O of olds) link(O[k], S[k], `SPR${i}.${k}`);
  }
}

// Người giao hàng và thùng hàng (mua online): bộ thường COURIER_ART và bộ 2x COURIER_ART_HD cùng nằm trong artcourier.js
const courierArt = await import('./artcourier.js').catch(() => null);
if (courierArt?.COURIER_ART) { stats.files.push('artcourier.js'); link(courierArt.COURIER_ART, courierArt.COURIER_ART_HD, 'COURIER_ART'); }

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
