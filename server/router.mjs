// Router HTTP JSON tự viết: `route(method, path, fn)`, fn nhận { req, url, body, ...ctx } và trả object (gửi 200 JSON).
// Muốn báo lỗi thì `throw new HttpError(status, 'lý do')`, client nhận { ok: false, error }.
export class HttpError extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

const MAX_BODY = 1 << 20;   // 1 MB, đủ cho một bản lưu vườn

export function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

async function readBody(req) {
  let size = 0;
  const parts = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw new HttpError(413, 'Dữ liệu quá lớn');
    parts.push(c);
  }
  if (!size) return null;
  try { return JSON.parse(Buffer.concat(parts)); } catch { throw new HttpError(400, 'JSON hỏng'); }
}

export function createRouter(ctx = {}) {
  const routes = new Map();   // path → { METHOD: fn }
  return {
    route(method, path, fn) { routes.set(path, { ...routes.get(path), [method]: fn }); return this; },
    // Trả false nếu không phải đường API (để phần file tĩnh lo)
    async handle(req, res, url) {
      if (!url.pathname.startsWith('/api/')) return false;
      try {
        const r = routes.get(url.pathname);
        if (!r) throw new HttpError(404, 'Không có API này');
        const fn = r[req.method];
        if (!fn) throw new HttpError(405, 'Sai phương thức');
        const body = req.method === 'GET' || req.method === 'HEAD' ? null : await readBody(req);
        sendJson(res, 200, { ok: true, ...await fn({ ...ctx, req, url, body }) });
      } catch (e) {
        const status = e instanceof HttpError ? e.status : 500;
        if (status === 500) console.error(e);
        sendJson(res, status, { ok: false, error: status === 500 ? 'Lỗi server' : e.message });
      }
      return true;
    },
  };
}
