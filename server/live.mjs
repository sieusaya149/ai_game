// Kênh WebSocket (`ws`, ADR 0007) ở đường /ws. Tin nhắn là JSON `{ t: loại, ... }`.
// Hiện chỉ có `ping` → `pong`; các issue sau thêm loại mới vào HANDLERS.
import { WebSocketServer } from 'ws';

const HANDLERS = {
  ping: (sock, m) => send(sock, { t: 'pong', id: m.id, now: Date.now() }),
};

export const send = (sock, m) => { if (sock.readyState === sock.OPEN) sock.send(JSON.stringify(m)); };

export function attachLive(server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    if (req.url.split('?')[0] !== '/ws') return socket.destroy();
    wss.handleUpgrade(req, socket, head, sock => wss.emit('connection', sock, req));
  });
  wss.on('connection', sock => {
    sock.on('message', data => {
      let m;
      try { m = JSON.parse(data); } catch { return; }   // tin hỏng thì bỏ qua, không ngắt
      HANDLERS[m?.t]?.(sock, m);
    });
  });
  return {
    // đóng mọi kết nối (mã 1001 = server đi vắng), trình duyệt tự kết nối lại sau
    close() {
      for (const s of wss.clients) s.close(1001, 'server tắt');
      return new Promise(ok => {
        const t = setTimeout(() => { for (const s of wss.clients) s.terminate(); }, 1000);
        wss.close(() => { clearTimeout(t); ok(); });
      });
    },
  };
}
