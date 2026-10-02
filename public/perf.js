// Hiệu năng: phần tính toán thuần (chạy được trong Node) cho nền tĩnh chia mảng, AI ngoài màn hình, đo FPS, tiết kiệm pin.
import { TS } from './layout.js';

// ---------- Nền tĩnh chia mảng ----------
export const CHUNK = 16;                       // 1 mảng = 16x16 ô = 256x256 điểm ảnh
export const CHUNK_PX = CHUNK * TS;
export const chunkGrid = (mw, mh) => ({ cw: Math.ceil(mw / CHUNK), ch: Math.ceil(mh / CHUNK) });

// Những mảng khác nhau giữa hai bản đồ ngoài trời (cùng kích thước), trả về tập chỉ số mảng (hàng * cw + cột).
// Nền vẽ mỗi điểm ảnh phụ thuộc ô kế bên (viền đường, cỏ lác đác), nên ô đổi thì các mảng chứa 8 ô quanh nó cũng bẩn.
// a = null (chưa có bản trước) hoặc đổi kích thước: bẩn hết.
export function dirtyChunks(a, b) {
  const { cw, ch } = chunkGrid(b.mw, b.mh), out = new Set();
  if (!a || a.mw !== b.mw || a.mh !== b.mh) { for (let i = 0; i < cw * ch; i++) out.add(i); return out; }
  const { mw, mh } = b;
  const mark = (c, r, pad = 1) => {
    for (let y = Math.max(0, r - pad); y <= Math.min(mh - 1, r + pad); y++) for (let x = Math.max(0, c - pad); x <= Math.min(mw - 1, c + pad); x++) out.add(Math.floor(y / CHUNK) * cw + Math.floor(x / CHUNK));
  };
  for (let i = 0; i < mw * mh; i++) if (a.ground[i] !== b.ground[i] || a.solid[i] !== b.solid[i]) mark(i % mw, Math.floor(i / mw));
  const fk = f => f.c + ',' + f.r + f.kind + (f.lv ?? 1), was = new Set(a.fences.map(fk)), now = new Set(b.fences.map(fk));
  for (const f of a.fences) if (!now.has(fk(f))) mark(f.c, f.r);
  for (const f of b.fences) if (!was.has(fk(f))) mark(f.c, f.r);
  const same = (p, q) => (!p && !q) || (p && q && p.x === q.x && p.y === q.y && p.w === q.w && p.h === q.h);
  if (!same(a.mud, b.mud)) for (const m of [a.mud, b.mud]) if (m) {   // vũng bùn là ảnh lớn hơn một ô
    for (let r = Math.floor(m.y / TS); r <= Math.floor((m.y + m.h - 1) / TS); r++) for (let c = Math.floor(m.x / TS); c <= Math.floor((m.x + m.w - 1) / TS); c++) mark(c, r);
  }
  return out;
}

// Các mảng giao với hình chữ nhật (điểm ảnh) x0,y0..x1,y1
export function chunksIn(mw, mh, x0, y0, x1, y1) {
  const { cw, ch } = chunkGrid(mw, mh), out = [];
  const c0 = Math.max(0, Math.floor(x0 / CHUNK_PX)), c1 = Math.min(cw - 1, Math.floor(x1 / CHUNK_PX));
  const r0 = Math.max(0, Math.floor(y0 / CHUNK_PX)), r1 = Math.min(ch - 1, Math.floor(y1 / CHUNK_PX));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push(r * cw + c);
  return out;
}

// ---------- AI ngoài màn hình ----------
// Dùng với dữ liệu chạy rt của một con vật: trong màn hình thì chạy mỗi khung hình; ngoài thì gom thời gian, 2 lần/giây.
// Trả về dt cần cập nhật bây giờ (0 = bỏ qua khung hình này). Tổng thời gian cập nhật luôn bằng tổng dt thật.
export const OFFSCREEN_AI_MS = 500;
export function aiStep(rt, dt, onscreen) {
  const acc = (rt.acc ?? 0) + dt;
  if (onscreen || acc * 1000 >= OFFSCREEN_AI_MS) { rt.acc = 0; return acc; }
  rt.acc = acc;
  return 0;
}

// ---------- Đo FPS ----------
// push(ms) với ms là thời gian giữa hai khung hình thật. Khung hình quá dài (tab ẩn, treo) không tính.
export const FPS_SKIP_MS = 500;
export function createFps() {
  let ema = 60, t = 0, n = 0;
  return {
    push(ms) {
      if (!(ms > 0) || ms > FPS_SKIP_MS) return;
      ema += (1000 / ms - ema) * 0.05;
      t += ms; n++;
    },
    get fps() { return ema; },                 // trung bình trượt, cho hiệu ứng hạt
    get elapsed() { return t; },               // ms đã đo
    get avg() { return t ? n * 1000 / t : 60; },   // FPS trung bình từ đầu
  };
}

// Lượng hạt nên vẽ (0.25..1): đủ khi >= 50 fps, ít dần tới 1/4 khi <= 25 fps
export const particleBudget = fps => Math.max(0.25, Math.min(1, (fps - 25) / 25));

// ---------- Tiết kiệm pin ----------
export const BATTERY_FPS = 30;
export const SUGGEST_AFTER_MS = 10_000, SUGGEST_BELOW_FPS = 40;
// Đo đủ 10 giây mà trung bình dưới 40 fps thì gợi ý (một lần: hinted = đã từng gợi ý)
export const shouldSuggestBattery = (meter, prefs) => !prefs.battery && !prefs.hinted && meter.elapsed >= SUGGEST_AFTER_MS && meter.avg < SUGGEST_BELOW_FPS;

// Cài đặt riêng của máy này (không thuộc tiến trình chơi): { battery, hinted }
export const PREF_KEY = 'nongtrai-pref';
export function loadPrefs(storage = globalThis.localStorage) {
  try { const p = JSON.parse(storage.getItem(PREF_KEY)); return { battery: p?.battery === true, hinted: p?.hinted === true }; }
  catch { return { battery: false, hinted: false }; }
}
export function savePrefs(prefs, storage = globalThis.localStorage) {
  try { storage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* không có localStorage */ }
}
