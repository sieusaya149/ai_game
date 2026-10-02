// Kênh WebSocket (`ws`, ADR 0007) ở đường /ws. Tin nhắn là JSON `{ t: loại, ... }`, tra trong HANDLERS.
// Tài khoản của kết nối lấy từ cookie lúc nâng cấp (`sock.account`); `hello { play }` gắn kết nối vào phiên chơi.
// Các issue sau thêm loại tin vào HANDLERS và đẩy tin tới chủ vườn bằng `live.sendTo(accountId, msg)`.
import { WebSocketServer } from 'ws';
import { accountOf, tokenOf } from './accounts.mjs';
import { playOf } from './farms.mjs';
import { createPresence } from './presence.mjs';

const HANDLERS = {
  ping: (sock, m) => send(sock, { t: 'pong', id: m.id, now: Date.now() }),
  // trình duyệt đang chơi vườn online báo phiên chơi của mình (mỗi lần kết nối/kết nối lại).
  // Phiên đã bị máy khác thay thì trả `kicked` ngay
  hello(sock, m, { db }) {
    if (!sock.account) return send(sock, { t: 'hello', ok: false, code: 'no_session' });
    if (!m.play || playOf(db, sock.account.id) !== m.play) return send(sock, { t: 'kicked' });
    sock.play = m.play;
    send(sock, { t: 'hello', ok: true, now: Date.now() });
  },
};

export const send = (sock, m) => { if (sock.readyState === sock.OPEN) sock.send(JSON.stringify(m)); };

export function attachLive(server, ctx) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  const pres = createPresence(ctx, send);   // làng real-time (issue 25): join, pos, chat, emote
  server.on('upgrade', (req, socket, head) => {
    if (req.url.split('?')[0] !== '/ws') return socket.destroy();
    wss.handleUpgrade(req, socket, head, sock => wss.emit('connection', sock, req));
  });
  wss.on('connection', (sock, req) => {
    sock.account = accountOf(ctx.db, tokenOf(req));
    sock.on('message', data => {
      let m;
      try { m = JSON.parse(data); } catch { return; }   // tin hỏng thì bỏ qua, không ngắt
      (HANDLERS[m?.t] ?? pres.handlers[m?.t])?.(sock, m, ctx);
    });
    sock.on('close', () => pres.leave(sock));
  });
  const socketsOf = id => [...wss.clients].filter(s => s.account?.id === id);
  return {
    // tài khoản đang có trình duyệt giữ phiên chơi kết nối (tức đang online)
    playing: id => socketsOf(id).some(s => s.play && s.readyState === s.OPEN),
    // gửi tin tới mọi kết nối của một tài khoản; trả số kết nối đã gửi
    sendTo(id, m) { const ss = socketsOf(id); for (const s of ss) send(s, m); return ss.length; },
    // lệnh "lưu lần cuối rồi thoát" cho máy đang giữ phiên `play`; trả các kết nối đã nhận lệnh
    kick(id, play) {
      const ss = socketsOf(id).filter(s => s.play === play && s.readyState === s.OPEN);
      for (const s of ss) { send(s, { t: 'kicked' }); s.play = null; }
      return ss;
    },
    // đóng mọi kết nối (mã 1001 = server đi vắng), trình duyệt tự kết nối lại sau
    close() {
      pres.stop();
      for (const s of wss.clients) s.close(1001, 'server tắt');
      return new Promise(ok => {
        const t = setTimeout(() => { for (const s of wss.clients) s.terminate(); }, 1000);
        wss.close(() => { clearTimeout(t); ok(); });
      });
    },
  };
}
