// Bản đồ nhỏ: vẽ đất đã mua, công trình, người chơi và chấm việc (đỏ = gấp, vàng = có việc) lên một canvas vuông.
// Vị trí chấm lấy từ danh sách Việc cần làm (todo.js). Ở bản đồ khác vườn thì vẽ bản đồ đó, chấm nằm ở cửa/cổng về vườn.
import { sceneMap } from './state.js';
import { GROUND, TS } from './layout.js';

export const DOT = { urgent: '#e5452f', normal: '#ffd23a', me: '#3aa0ff' };
const TILE = { [GROUND.GRASS]: '#6fb04a', [GROUND.ROAD]: '#cdb27a', [GROUND.FIELD]: '#8a5a2b', [GROUND.PEN]: '#b89a62', [GROUND.MUD]: '#6b4a2a', [GROUND.FOREST]: '#2f5a2a', [GROUND.FLOOR]: '#d9b98a', [GROUND.WALL]: '#7a5a3a' };

// Khung hiện trên bản đồ nhỏ (đất đã mua; trong nhà là cả phòng) → hệ số phóng k và độ lệch để đặt vào canvas cạnh `size`
export function miniView(m, size) {
  const o = m.owned, w = o.w * TS, h = o.h * TS, k = Math.min(size / w, size / h);
  return { k, ox: (size - w * k) / 2 - o.c * TS * k, oy: (size - h * k) / 2 - o.r * TS * k };
}

// Các chấm { c: 'urgent'|'normal', x, y } theo điểm ảnh canvas (đã làm tròn)
export function miniDots(s, items, size) {
  const m = sceneMap(s), v = miniView(m, size), out = [];
  const at = (c, x, y) => out.push({ c, x: Math.round(x * v.k + v.ox), y: Math.round(y * v.k + v.oy) });
  if (!items.length) return out;
  if (m.scene === 'farm') {
    for (const it of items) for (const p of it.spots) at(it.level, p.x, p.y);
  } else {
    const d = m.doors.find(o => o.to === 'farm');
    if (d) at(items.some(i => i.level === 'urgent') ? 'urgent' : 'normal', d.x + d.w / 2, d.y + d.h / 2);
  }
  return out;
}

const base = new Map();   // nền vẽ sẵn theo cảnh + bố cục + cỡ, chỉ vẽ lại khi bố cục đổi
function baseOf(m, size) {
  const key = `${m.scene}:${m.rev ?? 0}:${size}`, hit = base.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d'), { k, ox, oy } = miniView(m, size), o = m.owned;
  g.fillStyle = '#25491a'; g.fillRect(0, 0, size, size);
  const rect = (c, r, w, h, col) => { g.fillStyle = col; g.fillRect(Math.floor(c * TS * k + ox), Math.floor(r * TS * k + oy), Math.max(1, Math.ceil(w * TS * k)), Math.max(1, Math.ceil(h * TS * k))); };
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) rect(c, r, 1, 1, TILE[m.ground[r * m.mw + c]] ?? TILE[GROUND.GRASS]);
  for (const f of m.fences) rect(f.c, f.r, 1, 1, '#e8d9b0');
  for (const t of m.trees) rect(Math.floor(t.x / TS), Math.floor(t.y / TS), 1, 1, '#1f4a1f');
  for (const c of m.clutter) rect(Math.floor(c.x / TS), Math.floor(c.y / TS), 1, 1, '#8a8a8a');
  for (const b of m.buildings) rect(b.foot.c, b.foot.r, b.foot.w, b.foot.h, '#a0522d');
  for (const d of m.doors) rect(d.x / TS, d.y / TS, d.w / TS, d.h / TS, '#fff3c4');
  if (base.size > 12) base.clear();
  base.set(key, cv);
  return cv;
}

// Vẽ lên canvas vuông cv. Trả về { k, ox, oy, dots } để ui ghi ra data-attr
export function drawMini(cv, s, items) {
  const size = cv.width, m = sceneMap(s), g = cv.getContext('2d'), v = miniView(m, size);
  g.imageSmoothingEnabled = false;
  g.drawImage(baseOf(m, size), 0, 0);
  const dots = miniDots(s, items, size), r = Math.max(2, Math.round(size / 48));
  const me = { x: Math.round(s.player.x * v.k + v.ox), y: Math.round(s.player.y * v.k + v.oy) };
  for (const d of dots) {   // viền trắng cho dễ thấy trên nền cỏ, rồi tới lõi màu
    g.fillStyle = '#fff'; g.fillRect(d.x - r - 1, d.y - r - 1, 2 * r + 3, 2 * r + 3);
    g.fillStyle = DOT[d.c]; g.fillRect(d.x - r, d.y - r, 2 * r + 1, 2 * r + 1);
  }
  g.fillStyle = '#fff'; g.fillRect(me.x - r, me.y - r, 2 * r + 1, 2 * r + 1);
  g.fillStyle = DOT.me; g.fillRect(me.x - r + 1, me.y - r + 1, 2 * r - 1, 2 * r - 1);
  return { k: v.k, ox: v.ox, oy: v.oy, dots };
}
