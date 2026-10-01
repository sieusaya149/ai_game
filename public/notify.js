// Thông báo 3 mức: tra mức/khóa gộp của event, gộp toast, mũi tên chỉ hướng. Thuần JS, không DOM.
import { EVENT_LEVEL, NOTIFY_WINDOW } from './data.js';
import { sceneMap } from './farm.js';

export const EVENT_TYPES = Object.keys(EVENT_LEVEL);

// { level, cat, group, label } của một event; null nếu loại event chưa khai báo.
export function eventMeta(e) {
  const m = EVENT_LEVEL[e?.type];
  return m ? { level: m.level, cat: m.cat ?? null, group: String(m.group(e)), label: m.label } : null;
}

// Gộp event 'important' cùng khóa trong NOTIFY_WINDOW thành một toast: show(id, text) được gọi lại cùng id khi có thêm.
// on(cat) = loại thông báo đó đang bật.
export function createNotifier({ show, on = () => true, win = NOTIFY_WINDOW }) {
  const groups = new Map();
  let seq = 0;
  return function push(e, t) {
    const m = eventMeta(e);
    if (m?.level !== 'important' || !on(m.cat)) return false;
    let g = groups.get(m.group);
    if (!g || t - g.last > win) {
      g = { id: ++seq, n: 0, last: t };
      if (groups.size > 40) for (const [k, v] of groups) if (t - v.last > win) groups.delete(k);
      groups.set(m.group, g);
    }
    g.n++; g.last = t;
    show(g.id, EVENT_LEVEL[e.type].text(g.n, e));
    return true;
  };
}

// Chỗ mũi tên chỉ tới, lấy từ các việc gấp của todoList (todo.js). Ở vườn: chính các chỗ đó. Ở bản đồ khác: cửa/cổng dẫn về vườn.
export function arrowTargets(s, items) {
  if (!items.length) return [];
  if (s.scene === 'farm') return items.flatMap(i => i.spots.map(p => ({ key: p.key, x: p.x, y: p.y })));
  const d = sceneMap(s).doors.find(o => o.to === 'farm');
  return d ? [{ key: 'door', x: d.x + d.w / 2, y: d.y + d.h / 2 }] : [];
}

// Điểm p (toạ độ màn hình) so với khung box { l, t, r, b }: trong khung thì null, ngoài thì vị trí mũi tên
// nằm sát mép khung (cách mép m) trên tia từ tâm khung tới p, và góc (rad, 0 = sang phải) để xoay sprite.
export function arrowFor(p, box, m = 18) {
  if (p.x >= box.l && p.x <= box.r && p.y >= box.t && p.y <= box.b) return null;
  const cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2, dx = p.x - cx, dy = p.y - cy;
  const k = Math.min(((box.r - box.l) / 2 - m) / Math.abs(dx || 1e-9), ((box.b - box.t) / 2 - m) / Math.abs(dy || 1e-9));
  return { x: cx + dx * k, y: cy + dy * k, ang: Math.atan2(dy, dx) };
}
