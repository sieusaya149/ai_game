// Phục vụ file tĩnh của public/. index.html không cache (deploy mới là thấy ngay);
// file khác không có hash trong tên nên cho trình duyệt giữ nhưng hỏi lại bằng ETag (304 nếu chưa đổi).
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
};

export function serveStatic(dir) {
  const root = resolve(dir);
  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return end(res, 405);
    // giải mã đường dẫn thô; `..`, `\`, byte 0 hay thoát ra ngoài root đều bị từ chối
    let path;
    try { path = decodeURIComponent(req.url.split('?')[0]); } catch { return end(res, 400); }
    if (path.includes('\0') || path.includes('\\') || path.split('/').includes('..')) return end(res, 403);
    if (path.endsWith('/')) path += 'index.html';
    const file = join(root, path);
    if (!file.startsWith(root + sep)) return end(res, 403);

    const st = await stat(file).catch(() => null);
    if (!st?.isFile()) return end(res, 404);
    const html = extname(file) === '.html';
    const tag = `W/"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
    const head = {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': html ? 'no-store' : 'no-cache',
      'x-content-type-options': 'nosniff',
    };
    if (!html) {
      head.etag = tag;
      if (req.headers['if-none-match'] === tag) { res.writeHead(304, head); return res.end(); }
    }
    if (html) {   // style.css / main.js kèm ?v=<mtime>: CDN hay Safari giữ bản CSS cũ thì HTML mới vẫn kéo bản mới (từng hiện thẻ nhiệm vụ không nền trên iPhone)
      let body = await readFile(file, 'utf8');
      for (const name of ['style.css', 'main.js']) {
        const s2 = await stat(join(root, name)).catch(() => null);
        if (s2) body = body.replace(`"${name}"`, `"${name}?v=${Math.floor(s2.mtimeMs).toString(36)}"`);
      }
      res.writeHead(200, { ...head, 'content-length': Buffer.byteLength(body) });
      return res.end(req.method === 'HEAD' ? undefined : body);
    }
    res.writeHead(200, { ...head, 'content-length': st.size });
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).on('error', () => res.destroy()).pipe(res);
  };
}

const end = (res, status) => res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' }).end(String(status));
