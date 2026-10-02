// Seam 3 (ADR 0011): bật server thật với SQLite tạm, gọi bằng HTTP/WebSocket thật, tắt và dọn file.
// Dùng chung cho mọi tests/server-*.test.mjs. Không gọi hàm nội bộ server, không mock DB.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { startServer } from '../../server/index.mjs';

const ADMIN = fileURLToPath(new URL('../../server/admin.mjs', import.meta.url));

// Bật server ở cổng ngẫu nhiên, mỗi lần một thư mục tạm riêng. Nhớ gọi `close()` (hoặc `t.after(srv.close)`).
export async function bootServer(opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ai-game-test-'));
  const dbPath = join(dir, 'farm.db');
  const srv = await startServer({ port: 0, host: '127.0.0.1', dbPath, ...opts });
  const url = `http://127.0.0.1:${srv.port}`;
  const sockets = new Set();
  let closed = false;
  return {
    url, dbPath, dir,
    get: (path, init) => fetch(url + path, init),
    // GET/POST JSON, trả { status, body, headers }
    async json(path, body, init = {}) {
      const res = await fetch(url + path, body === undefined ? init
        : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), ...init });
      return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
    },
    // Mở WebSocket, chờ kết nối xong. `next()` chờ tin nhắn JSON kế tiếp, `closed` là promise đóng kết nối.
    async ws(path = '/ws') {
      const s = new WebSocket(url.replace('http', 'ws') + path);
      sockets.add(s);
      const inbox = [], waiting = [];
      s.on('message', d => { const m = JSON.parse(d); waiting.length ? waiting.shift()(m) : inbox.push(m); });
      const sock = {
        raw: s,
        send: m => s.send(JSON.stringify(m)),
        next: (ms = 2000) => inbox.length ? Promise.resolve(inbox.shift()) : new Promise((ok, no) => {
          const t = setTimeout(() => no(new Error('quá lâu không có tin nhắn')), ms);
          waiting.push(m => { clearTimeout(t); ok(m); });
        }),
        closed: new Promise(ok => s.on('close', code => ok(code))),
        close: () => s.close(),
      };
      await new Promise((ok, no) => { s.once('open', ok); s.once('error', no); });
      return sock;
    },
    // Chạy lệnh quản trị trên đúng file SQLite của server này, trả { code, out, err }
    admin: (...args) => runAdmin(...args, '--db', dbPath),
    async close() {
      if (closed) return;
      closed = true;
      for (const s of sockets) s.terminate();
      await srv.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

// Chạy `node server/admin.mjs ...args` như quản trị gõ trong container
export const runAdmin = (...args) => new Promise(ok => {
  execFile(process.execPath, ['--disable-warning=ExperimentalWarning', ADMIN, ...args], (e, out, err) =>
    ok({ code: e ? e.code ?? 1 : 0, out: out.trim(), err: err.trim() }));
});
