import { DAY_MS } from './data.js';

// Đồng hồ ngoài đời. Offline đọc giờ máy; Phase 1 gọi setClock(() => giờServer) mà không đổi luật chơi.
let source = () => Date.now();
export const now = () => source();
export const setClock = fn => { source = fn ?? (() => Date.now()); };

// Ngày ngoài đời theo giờ địa phương, dạng 'YYYY-MM-DD' (cho nhiệm vụ hằng ngày).
export function realDay(t = now()) {
  const d = new Date(t), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------- Giờ server và lịch làng (issue 23, ADR 0003, 0014) ----------
// Online: đo độ lệch giờ máy so với server rồi trỏ now() sang giờ server; chơi đơn không gọi gì.
export const VILLAGE_EPOCH = Date.UTC(2026, 0, 1);   // mốc chung của cả làng: 0h giờ UTC là 6:00 sáng ngày 1
export const REAL_TZ_MS = 7 * 3600_000;              // "ngày ngoài đời" tính theo giờ Việt Nam (UTC+7)
// Hạt giống thời tiết của làng (ADR 0014, issue 55): server và mọi trình duyệt dùng chung module này, nên cả làng cùng một trời.
// Đổi số này là đổi thời tiết cả quá khứ lẫn tương lai của làng (chỉ ảnh hưởng chạy bù sau lần đổi).
export const VILLAGE_SEED = 20260101;

// Lịch làng: hàm thuần của giờ server t → { day: ngày game (từ 1), tod: ms trong ngày game, frac: 0..1 }
export function villageCal(t) {
  const x = Math.max(0, t - VILLAGE_EPOCH);
  return { day: Math.floor(x / DAY_MS) + 1, tod: x % DAY_MS, frac: (x % DAY_MS) / DAY_MS };
}
// Ngày ngoài đời ('YYYY-MM-DD', giờ Việt Nam) từ giờ server: cho giới hạn theo ngày, đổi đúng lúc nửa đêm
export const serverDay = t => new Date(t + REAL_TZ_MS).toISOString().slice(0, 10);

// Đo độ lệch (giờ server − giờ máy). ask() → giờ server (ms). Đo vài lần, lấy lần có thời gian khứ hồi ngắn nhất
// (tin cậy nhất); mỗi lần lấy giờ server nằm giữa lúc gửi và lúc nhận. Trả null nếu không lần nào được.
export async function measureOffset(ask, tries = 3, local = Date.now) {
  let best = null;
  for (let i = 0; i < tries; i++) {
    const a = local();
    let srv; try { srv = await ask(); } catch { continue; }
    const b = local();
    if (!Number.isFinite(srv)) continue;
    if (!best || b - a < best.rtt) best = { rtt: b - a, offset: srv - (a + b) / 2 };
  }
  return best ? Math.round(best.offset) : null;
}
// Giờ của now() = giờ máy + offset (offset null: về giờ máy)
export const useServerTime = offset => setClock(offset == null ? null : () => Date.now() + offset);