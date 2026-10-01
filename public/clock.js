// Đồng hồ ngoài đời. Offline đọc giờ máy; Phase 1 gọi setClock(() => giờServer) mà không đổi luật chơi.
let source = () => Date.now();
export const now = () => source();
export const setClock = fn => { source = fn ?? (() => Date.now()); };

// Ngày ngoài đời theo giờ địa phương, dạng 'YYYY-MM-DD' (cho nhiệm vụ hằng ngày).
export function realDay(t = now()) {
  const d = new Date(t), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
