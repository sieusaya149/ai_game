// Server của làng (ADR 0010): một tiến trình Node phục vụ public/, API HTTP JSON, WebSocket và SQLite.
// `startServer` là cách duy nhất để bật server, dùng cho main.mjs lẫn test seam 3 (ADR 0011).
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.mjs';
import { createRouter } from './router.mjs';
import { serveStatic } from './static.mjs';
import { attachLive } from './live.mjs';
import { addRoutes } from './api.mjs';

export const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));

// port 0 = cổng ngẫu nhiên. Trả { port, close() }; close() đóng WebSocket, HTTP rồi DB.
export async function startServer({ port = 4173, host = '127.0.0.1', dbPath, publicDir = PUBLIC_DIR } = {}) {
  if (!dbPath) throw new Error('thiếu dbPath');
  const db = openDb(dbPath);
  const ctx = { db };   // route nhận { db, live, ... }; live gắn sau khi có server HTTP
  const router = createRouter(ctx);
  addRoutes(router);
  const files = serveStatic(publicDir);

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      if (!await router.handle(req, res, url)) await files(req, res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.writeHead(500).end();
    }
  });
  const live = ctx.live = attachLive(server, ctx);
  await new Promise((ok, no) => server.once('error', no).listen(port, host, ok));

  let closing;
  return {
    port: server.address().port,
    close: () => closing ??= (async () => {
      await live.close();
      await new Promise(ok => { server.close(ok); server.closeAllConnections(); });
      db.close();
    })(),
  };
}
