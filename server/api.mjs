// Các đường API HTTP JSON. Mỗi issue thêm API thì thêm route ở đây và ghi vào SPEC.md.
import { SESSION_MS, register, login, accountOf, endSession } from './accounts.mjs';
import { HttpError } from './router.mjs';

const COOKIE = 'nt_session';
const tokenOf = req => /(?:^|;\s*)nt_session=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];

// Cookie phiên: HttpOnly (JS trong trang không đọc được), SameSite=Lax, Secure khi sau HTTPS (Caddy gửi X-Forwarded-Proto)
function setSession({ req, res }, token) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  const age = token ? Math.floor(SESSION_MS / 1000) : 0;
  res.setHeader('set-cookie', `${COOKIE}=${token ?? ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure}`);
}

export function addRoutes(r) {
  // sức khỏe: Caddy/Docker/smoke gọi; `now` là giờ server (sau này cho clock.js)
  r.route('GET', '/api/health', ({ db }) => {
    db.prepare('SELECT 1').get();
    return { now: Date.now() };
  });

  r.route('POST', '/api/register', async c => {
    const { name, token } = await register(c.db, c.body ?? {});
    setSession(c, token);
    return { name };
  });
  r.route('POST', '/api/login', async c => {
    const { name, token } = await login(c.db, c.body ?? {});
    setSession(c, token);
    return { name };
  });
  r.route('POST', '/api/logout', c => {
    endSession(c.db, tokenOf(c.req));
    setSession(c, null);
    return {};
  });
  // đang đăng nhập là ai (cookie hợp lệ), không thì 401
  r.route('GET', '/api/me', ({ db, req }) => {
    const a = accountOf(db, tokenOf(req));
    if (!a) throw new HttpError(401, 'Chưa đăng nhập', { code: 'no_session' });
    return { name: a.name };
  });
}
