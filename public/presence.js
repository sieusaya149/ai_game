// Người khác cùng bản đồ (issue 25), phía trình duyệt. Thuần JS, không DOM: chạy được trong Node (seam 1).
// Server phát vị trí tối đa LIVE.hz lần/giây; ở đây giữ vài mốc vị trí gần nhất của mỗi người và vẽ trễ LIVE.delayMs
// để nội suy giữa hai mốc, nên nhân vật đi mượt kể cả khi mạng chậm hay mất vài gói.
import { LIVE, chatMs } from './data.js';

// Ai hiện đầy đủ nhân vật: bản đồ có quá `max` người (tính cả người xem) thì chỉ (max - 1) người gần người xem nhất
// hiện đầy đủ, người ở xa hơn chỉ hiện tên mờ. Trả Set id người hiện đầy đủ.
export function crowdSplit(me, people, max = LIVE.crowd) {
  if (people.length + 1 <= max) return new Set(people.map(p => p.id));
  const d = p => Math.hypot(p.x - me.x, p.y - me.y);
  return new Set([...people].sort((a, b) => d(a) - d(b) || a.id - b.id).slice(0, max - 1).map(p => p.id));
}

// Vị trí trên đường đi `track` (các mốc { t, x, y } theo giờ nhận, tăng dần) ở thời điểm t: nội suy giữa hai mốc,
// trước mốc đầu / sau mốc cuối thì đứng ở mốc đó. moving = đang ở giữa hai mốc khác chỗ
export function sampleTrack(track, t) {
  const n = track.length;
  if (!n) return null;
  if (t <= track[0].t) return { x: track[0].x, y: track[0].y, moving: false };
  for (let i = 1; i < n; i++) {
    const a = track[i - 1], b = track[i];
    if (t > b.t) continue;
    const k = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, moving: a.x !== b.x || a.y !== b.y };
  }
  return { x: track[n - 1].x, y: track[n - 1].y, moving: false };
}

// Danh sách người khác trên bản đồ đang đứng, cập nhật từ tin WebSocket (`joined`, `enter`, `leave`, `pos`, `chat`, `emote`).
// now = giờ trình duyệt (performance.now()), dùng làm mốc nhận
export function createPeers() {
  const peers = new Map();
  const add = (p, now) => peers.set(p.id, { id: p.id, name: p.name, level: p.level, look: p.look, dir: p.dir ?? 0, track: [{ t: now - LIVE.delayMs, x: p.x, y: p.y }], chat: null, emote: null });
  return {
    clear: () => peers.clear(),
    get size() { return peers.size; },
    // tin từ server; trả true nếu danh sách người đổi (để vẽ lại bảng người đang online)
    receive(m, now) {
      const p = peers.get(m.id);
      switch (m.t) {
        case 'joined': peers.clear(); for (const o of m.people) add(o, now); return true;
        case 'enter': add(m.p, now); return true;
        case 'leave': return peers.delete(m.id);
        case 'pos':
          if (!p) return false;
          {   // đứng yên lâu rồi mới đi: đi từ chỗ cũ trong một nhịp, khỏi trượt chậm suốt quãng đứng yên
            const last = p.track.at(-1), gap = 1000 / LIVE.hz;
            if (now - last.t > gap * 2) p.track.push({ t: now - gap, x: last.x, y: last.y });
          }
          p.track.push({ t: now, x: m.x, y: m.y }); p.dir = m.dir;
          if (p.track.length > 8) p.track.splice(0, p.track.length - 8);
          return false;
        case 'chat': if (p) p.chat = { text: m.text, until: now + chatMs(m.text) }; return false;
        case 'emote': if (p) p.emote = { e: m.e, t0: now, until: now + LIVE.emoteMs }; return false;
      }
      return false;
    },
    // người để vẽ ở thời điểm now (đã nội suy), kèm full = hiện đầy đủ hay chỉ tên mờ theo vị trí người xem `me`
    view(me, now) {
      const list = [...peers.values()].map(p => {
        const at = sampleTrack(p.track, now - LIVE.delayMs);
        return { id: p.id, name: p.name, level: p.level, look: p.look, dir: p.dir, x: at.x, y: at.y, moving: at.moving,
          chat: p.chat && p.chat.until > now ? p.chat.text : null, emote: p.emote && p.emote.until > now ? { e: p.emote.e, age: (now - p.emote.t0) / LIVE.emoteMs } : null };
      });
      const full = crowdSplit(me, list);
      for (const p of list) p.full = full.has(p.id);
      return list;
    },
    // tên, cấp của người đang ở đây (bảng người đang online)
    roster: () => [...peers.values()].map(p => ({ id: p.id, name: p.name, level: p.level })),
  };
}
