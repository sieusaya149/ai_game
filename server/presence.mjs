// Làng real-time (issue 25, ADR 0007): mỗi kết nối WebSocket thuộc một bản đồ; vị trí, chat nhanh, biểu cảm chỉ phát cho người cùng bản đồ.
// Làng là bản đồ chung; vườn và nhà là bản đồ riêng của từng người. Khách thăm vườn (issue 27) vào `farm` kèm `owner` (tên chủ):
// cùng bản đồ vườn của chủ nên chủ, khách và các khách khác thấy nhau; khách là bạn của chủ thì chủ được báo (friends.notifyVisit).
// Vị trí của mỗi người gửi được phát tối đa LIVE.hz lần mỗi giây: gửi dồn thì giữ bản mới nhất, phát khi tới nhịp.
// Khách thấy chủ làm gì ngay: server báo chủ số khách đang đứng trong vườn (`watch { n }`, đổi là báo, kết nối lại
// thì báo sau hello); trình duyệt chủ gửi phần vườn khách thấy được (`world { w }`), server chuyển cho khách trong vườn.
import { notifyVisit } from './friends.mjs';
import { LIVE, CHAT, cleanChat, QUICK_CHAT, EMOTES, LOOK, DEFAULT_LOOK, levelInfo } from '../public/data.js';
import { VISIT_KEYS, WORLD_MS } from '../public/state.js';
import { playOf } from './farms.mjs';

const GAP = 1000 / LIVE.hz;
const WORLD_GAP = WORLD_MS / 4;   // tin `world` của một chủ: tối đa 4 tin/giây (chủ thật gửi 1/giây)
const MAPS = ['village', 'farm', 'house'];
// Tài khoản smoke live (e2e/smoke-online.spec.mjs) có tên bắt đầu bằng tiền tố này: chơi ở làng thử riêng, người thật không thấy và ngược lại
export const SMOKE_PREFIX = 'zzsmoke';
const VILLAGE_TEST = 'village:test';   // mã bản đồ nội bộ của làng thử (vẫn là làng, không phải vườn nào)
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
  const lastWorld = new Map();   // accountId → giờ tin `world` gần nhất được chuyển
  const maps = new Map();   // mã bản đồ → Map(accountId → người)
  const others = p => [...(maps.get(p.map)?.values() ?? [])].filter(o => o !== p);
  const cast = (p, m) => { for (const o of others(p)) send(o.sock, m); };
  // số khách đang đứng trong vườn của `host` (không tính chính chủ) và báo cho chủ
  const guestsIn = host => [...(maps.get(`farm:${host}`)?.values() ?? [])].filter(o => o.id !== host);
  const watch = host => ctx.live?.sendTo(host, { t: 'watch', n: guestsIn(host).length });
  const hostOf = p => { const [kind, id] = p.map.split(':'); return kind === 'farm' && Number(id) !== p.id ? Number(id) : null; };   // 'village:test' có kind 'village' nên không bị coi là vườn

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
    if (hostOf(p)) watch(hostOf(p));
  }
  function flush(p) {
    p.timer = 0; p.sent = Date.now();
    cast(p, { t: 'pos', id: p.id, x: p.x, y: p.y, dir: p.dir });
  }
  const chatLogs = new Map();   // tài khoản → giờ các tin tự gõ gần đây (đổi bản đồ / kết nối lại không xóa giới hạn)
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
      const map = m.map === 'village' ? (a.name.toLowerCase().startsWith(SMOKE_PREFIX) ? VILLAGE_TEST : 'village') : `${m.map}:${host}`;
      const old = maps.get(map)?.get(a.id);
      if (old) leave(old.sock);   // cùng tài khoản ở kết nối cũ (máy cũ, kết nối chưa kịp đóng): thay luôn
      const room = maps.get(map) ?? maps.set(map, new Map()).get(map);
      const p = { sock, id: a.id, map, ...profile(db, a, m), x: num(m.x, 0, 4096) ?? 0, y: num(m.y, 0, 4096) ?? 0, dir: num(m.dir, 0, 3) | 0, sent: 0, timer: 0 };
      sock.pres = p;
      send(sock, { t: 'joined', map: m.map, me: p.id, people: others(p).map(pub) });
      cast(p, { t: 'enter', p: pub(p) });
      room.set(p.id, p);
      if (host !== a.id) watch(host);
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
    // phần vườn của chủ (state.js visitWorld): chỉ nhận từ máy đang giữ phiên chơi của chủ, chỉ giữ các trường của vườn
    world(sock, m) {
      const a = sock.account;
      if (!a || !sock.play || playOf(db, a.id) !== sock.play || !m.w || typeof m.w !== 'object' || Array.isArray(m.w)) return;
      const guests = guestsIn(a.id);
      if (!guests.length) return;
      const t = Date.now();
      if (t - (lastWorld.get(a.id) ?? 0) < WORLD_GAP) return;   // chống lạm dụng: tối đa 4 tin/giây/chủ, thừa thì bỏ
      lastWorld.set(a.id, t);
      const w = {};
      for (const k of VISIT_KEYS) if (k in m.w) w[k] = m.w[k];
      const msg = { t: 'world', owner: a.name, w };
      for (const o of guests) send(o.sock, msg);
    },
    // chat nhanh (câu có sẵn) hoặc tự gõ: server chuẩn hóa lại, tối đa CHAT.perMin tin/phút và cách nhau CHAT.gap ms mỗi người
    chat(sock, m) {
      if (QUICK_CHAT.includes(m.text)) return say(sock, true, { t: 'chat', text: m.text });
      const text = cleanChat(m.text), p = sock.pres, t = Date.now();
      if (p && text) {
        const who = sock.account?.id ?? sock, log = (chatLogs.get(who) ?? []).filter(x => t - x < 60000);
        if (log.length >= CHAT.perMin || (log.length && t - log.at(-1) < CHAT.gap)) return send(sock, { t: 'error', code: 'chat_rate' });
        log.push(t); chatLogs.set(who, log);
      }
      say(sock, !!text, { t: 'chat', text });
    },
    emote: (sock, m) => say(sock, EMOTES.includes(m.e), { t: 'emote', e: m.e }),
  };
  return {
    handlers, leave,
    // máy chủ vừa kết nối (lại) xong: đang có khách trong vườn thì báo ngay
    hello(sock) { const n = guestsIn(sock.account.id).length; if (n) send(sock, { t: 'watch', n }); },
    // Kết nối này đang đứng trong vườn của ai (issue 28: thao tác của khách chỉ nhận khi khách đang ở trong vườn đó)
    gardenOf(sock) { const [kind, id] = String(sock.pres?.map ?? '').split(':'); return kind === 'farm' ? Number(id) : null; },
    stop() { for (const room of maps.values()) for (const p of room.values()) clearTimeout(p.timer); },
  };
}
