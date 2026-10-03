// Thời tiết là hàm thuần của ngày game và hạt giống (issue 55, ADR 0014). Không bốc thăm lúc chạy: cùng ngày, cùng hạt giống
// thì mọi trình duyệt và server cùng thấy một trời, radio báo được ngày mai, chạy bù ra đúng trời đã qua.
// Hạt giống: của làng khi online (clock.js VILLAGE_SEED), của vườn khi chơi đơn (state.wseed). Bảng tần suất: data.js WEATHER.
import { WEATHER, GLASS } from './data.js';

// Băm vài số nguyên thành số 0..1 (trộn kiểu murmur3 fmix32). Thuần, như nhau ở mọi máy.
const fmix = h => {
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};
export function rand01(...xs) {
  let h = 0x9e3779b9;
  for (const x of xs) h = fmix((h ^ fmix((Math.floor(x) | 0) + 0x632be5ab)) + 0x165667b1);
  return h / 4294967296;
}

const KEYS = ['xuan', 'ha', 'thu', 'dong'];
// Mùa của ngày game `day` (1 = ngày đầu Xuân năm đầu), mỗi mùa 7 ngày (như state.seasonOf)
export const seasonKeyOf = day => KEYS[Math.floor(Math.max(0, day - 1) / 7) % 4];
const yearOf = day => Math.floor(Math.max(0, day - 1) / 28);

// Đợt hạn hán của mùa Hạ năm thứ `y` (0 = năm đầu): { from, to } là ngày game đầu và cuối (gồm cả hai)
export function droughtOf(seed, y) {
  const [lo, hi] = WEATHER.drought;
  const len = lo + Math.floor(rand01(seed, y, 11) * (hi - lo + 1));
  const from = y * 28 + 8 + Math.floor(rand01(seed, y, 12) * (7 - len + 1));   // ngày 8..14 của năm là mùa Hạ
  return { from, to: from + len - 1 };
}

// Trời gốc của một ngày (chưa tính cầu vồng): hạn hán thắng mọi thứ, còn lại bốc theo bảng mùa
function baseOn(seed, day) {
  const key = seasonKeyOf(day);
  if (key === 'ha') { const d = droughtOf(seed, yearOf(day)); if (day >= d.from && day <= d.to) return 'drought'; }
  let r = rand01(seed, day, 1);
  for (const [k, p] of Object.entries(WEATHER.table[key])) if ((r -= p) < 0) return k;
  return 'sun';
}
const WET = new Set(['rain', 'storm']);
export const isWet = k => WET.has(k);
export const isBad = k => WEATHER.bad.includes(k);

// Thời tiết của ngày game `day` theo hạt giống `seed`:
// 'sun' | 'cloud' | 'rain' | 'storm' | 'drought' | 'frost' | 'rainbow'. Chưa tính bảo hộ người mới (state.weatherOf lo).
export function weatherOn(seed, day) {
  const k = baseOn(seed, day);
  if ((k === 'sun' || k === 'cloud') && day > 1 && WET.has(baseOn(seed, day - 1)) && rand01(seed, day, 2) < WEATHER.rainbow) return 'rainbow';
  return k;
}
// Ngày bão này có mất điện nửa ngày đầu không (thuần theo hạt giống)
export const outageOn = (seed, day) => weatherOn(seed, day) === 'storm' && rand01(seed, day, 3) < WEATHER.outage;
// Ngày bão này có làm vỡ kính nhà kính trên khối ruộng `id` không (issue 60; thuần theo hạt giống, ngày, khối)
export const glassBreakOn = (seed, day, id) => weatherOn(seed, day) === 'storm' && rand01(seed, day, 4, id) < GLASS.breakChance;
