// Các đường API HTTP JSON. Mỗi issue thêm API thì thêm route ở đây và ghi vào SPEC.md.
import { SESSION_MS, register, login, accountOf, endSession, tokenOf } from './accounts.mjs';
import { claimPlay, readFarm, storeFarm } from './farms.mjs';
import { HttpError } from './router.mjs';

const COOKIE = 'nt_session';
// Tài khoản của cookie, không có thì 401
const mustAccount = ({ db, req }) => {
  const a = accountOf(db, tokenOf(req));
  if (!a) throw new HttpError(401, 'Chưa đăng nhập', { code: 'no_session' });
  return a;
};

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
  r.route('GET', '/api/me', c => ({ name: mustAccount(c).name }));

  // Vườn online (issue 22, ADR 0012). Bắt đầu chơi trên máy này: cấp phiên chơi mới, máy cũ lưu lần cuối rồi thoát
  r.route('POST', '/api/play', async c => claimPlay(c, mustAccount(c)));
  // Đọc vườn của mình: { farm, rev, savedAt } hoặc 404 no_farm
  r.route('GET', '/api/farm', c => readFarm(c.db, mustAccount(c)));
  // Gửi bản lưu { play, save }: 409 play_replaced (phiên cũ) · 400 save_invalid · 422 implausible (số liệu vô lý)
  r.route('POST', '/api/farm', c => storeFarm(c, mustAccount(c), c.body ?? {}));
}
