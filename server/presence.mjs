// Làng real-time (issue 25, ADR 0007): mỗi kết nối WebSocket thuộc một bản đồ; vị trí, chat nhanh, biểu cảm chỉ phát cho người cùng bản đồ.
// Làng là bản đồ chung; vườn và nhà là bản đồ riêng của từng người. Khách thăm vườn (issue 27) vào `farm` kèm `owner` (tên chủ):
// cùng bản đồ vườn của chủ nên chủ, khách và các khách khác thấy nhau; khách là bạn của chủ thì chủ được báo (friends.notifyVisit).
// Vị trí của mỗi người gửi được phát tối đa LIVE.hz lần mỗi giây: gửi dồn thì giữ bản mới nhất, phát khi tới nhịp.
import { notifyVisit } from './friends.mjs';
import { LIVE, QUICK_CHAT, EMOTES, LOOK, DEFAULT_LOOK, levelInfo } from '../public/data.js';

const GAP = 1000 / LIVE.hz;
const MAPS = ['village', 'farm', 'house'];
const num = (v, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null);

// Ngoại hình (số nguyên theo từng ô) và cấp lấy từ vườn đã lưu trên server; chưa có vườn thì từ tin `join`, cấp 1
function profile(db, a, m) {
  let s = null;
  try { s = JSON.parse(db.prepare('SELECT save FROM farms WHERE account_id = ?').get(a.id)?.save ?? 'null'); } catch { s = null; }
  const src = s?.look ?? m.look ?? {}, look = {};
  for (const k of Object.keys(DEFAULT_LOOK)) look[k] = Number.isInteger(src[k]) && src[k] >= 0 && src[k] < (LOOK[k] ?? 100) ? src[k] : DEFAULT_LOOK[k];
  return { name: a.name, level: s ? levelInfo(s.exp || 0).level : 1, look };
}
const pub = p => ({ id: p.id, name: p.name, level: p.level, look: p.look, x: p.x, y: p.y, dir: p.dir });

export function createPresence(ctx, send) {
  const { db } = ctx;
  const maps = new Map();   // mã bản đồ → Map(accountId → người)
  const others = p => [...(maps.get(p.map)?.values() ?? [])].filter(o => o !== p);
  const cast = (p, m) => { for (const o of others(p)) send(o.sock, m); };

  // rời bản đồ đang đứng (đổi bản đồ, đóng kết nối, tài khoản vào lại bằng kết nối khác)
  function leave(sock) {
    const p = sock.pres;
    if (!p) return;
    sock.pres = null;
    clearTimeout(p.timer);
    const room = maps.get(p.map);
    if (room?.get(p.id) !== p) return;
    room.delete(p.id);
    if (!room.size) maps.delete(p.map);
    cast(p, { t: 'leave', id: p.id });
  }
  function flush(p) {
    p.timer = 0; p.sent = Date.now();
    cast(p, { t: 'pos', id: p.id, x: p.x, y: p.y, dir: p.dir });
  }
  const say = (sock, ok, m) => {
    if (!sock.pres) return send(sock, { t: 'error', code: 'not_joined' });
    if (!ok) return send(sock, { t: 'error', code: 'chat_invalid' });
    cast(sock.pres, { ...m, id: sock.pres.id });
  };

  const handlers = {
    // vào một bản đồ (mỗi lần đổi cảnh và mỗi lần kết nối lại) → { joined, map, me, people: người khác đang ở đó }
    join(sock, m) {
      if (!sock.account) return send(sock, { t: 'error', code: 'no_session' });
      if (!MAPS.includes(m.map)) return send(sock, { t: 'error', code: 'map_invalid' });
      const a = sock.account;
      let host = a.id;   // bản đồ vườn/nhà của ai
      if (m.map === 'farm' && m.owner != null) {
        const key = String(m.owner).normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
        host = db.prepare('SELECT id FROM accounts WHERE name_key = ?').get(key)?.id;
        if (!host) return send(sock, { t: 'error', code: 'no_farm' });
      }
      leave(sock);
      const map = m.map === 'village' ? 'village' : `${m.map}:${host}`;
      const old = maps.get(map)?.get(a.id);
      if (old) leave(old.sock);   // cùng tài khoản ở kết nối cũ (máy cũ, kết nối chưa kịp đóng): thay luôn
      const room = maps.get(map) ?? maps.set(map, new Map()).get(map);
      const p = { sock, id: a.id, map, ...profile(db, a, m), x: num(m.x, 0, 4096) ?? 0, y: num(m.y, 0, 4096) ?? 0, dir: num(m.dir, 0, 3) | 0, sent: 0, timer: 0 };
      sock.pres = p;
      send(sock, { t: 'joined', map: m.map, me: p.id, people: others(p).map(pub) });
      cast(p, { t: 'enter', p: pub(p) });
      room.set(p.id, p);
      if (host !== a.id && !old && ctx.live) notifyVisit(ctx, a, host);   // chủ vườn: "X vừa ghé thăm vườn của bạn" (nếu X là bạn của chủ)
    },
    pos(sock, m) {
      const p = sock.pres;
      if (!p) return;
      const x = num(m.x, 0, 4096), y = num(m.y, 0, 4096);
      if (x == null || y == null) return;
      Object.assign(p, { x, y, dir: num(m.dir, 0, 3) | 0 });
      if (p.timer) return;   // đã hẹn phát ở nhịp tới: lúc đó lấy vị trí mới nhất
      const wait = p.sent + GAP - Date.now();
      if (wait <= 0) flush(p); else p.timer = setTimeout(flush, wait, p);
    },
    chat: (sock, m) => say(sock, QUICK_CHAT.includes(m.text), { t: 'chat', text: m.text }),
    emote: (sock, m) => say(sock, EMOTES.includes(m.e), { t: 'emote', e: m.e }),
  };
  return {
    handlers, leave,
    stop() { for (const room of maps.values()) for (const p of room.values()) clearTimeout(p.timer); },
  };
}
