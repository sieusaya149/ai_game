// Các đường API HTTP JSON. Mỗi issue thêm API thì thêm route ở đây và ghi vào SPEC.md.
import { SESSION_MS, register, login, accountOf, endSession, tokenOf } from './accounts.mjs';
import { claimPlay, readFarm, storeFarm, visitFarm } from './farms.mjs';
import { addFriend, removeFriend, listFriends, listGates } from './friends.mjs';
import { sendGift, readGifts, takeGifts, signBook, readBook, gateNews } from './gate.mjs';
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
  // Đọc vườn của người khác `?name=` (chỉ đọc, đã chạy bù nếu chủ offline): { name, farm, savedAt } hoặc 404 no_farm
  r.route('GET', '/api/visit', c => { mustAccount(c); return visitFarm(c, c.url.searchParams.get('name')); });
  // Gửi bản lưu { play, save }: 409 play_replaced (phiên cũ) · 400 save_invalid · 422 implausible (số liệu vô lý)
  r.route('POST', '/api/farm', c => storeFarm(c, mustAccount(c), c.body ?? {}));

  // Bạn bè và cổng vườn (issue 26). Danh sách bạn: { code, friends: [{ name, level, online, ripe, help }] }
  r.route('GET', '/api/friends', c => listFriends(c, mustAccount(c)));
  // Thêm bạn { name } hoặc { code }: 404 no_such_name · 404 bad_code · 409 already_friend · 400 self
  r.route('POST', '/api/friends', c => addFriend(c.db, mustAccount(c), c.body ?? {}));
  // Xóa bạn { name }: chỉ bỏ quan hệ bạn bè
  r.route('POST', '/api/friends/remove', c => removeFriend(c.db, mustAccount(c), c.body ?? {}));
  // Cổng vườn trong làng: { gates: [{ name, level, friend }] }, bạn bè ở đầu, không có chính mình
  r.route('GET', '/api/gates', c => listGates(c, mustAccount(c)));

  // Quà và sổ lưu bút ở cổng (issue 29). Tặng { to, item, qty, op }: 404 no_such_name · 400 self/bad_item/bad_qty/too_many/box_full · { dup } nếu op đã gửi
  r.route('POST', '/api/gifts', c => sendGift(c, mustAccount(c), c.body ?? {}));
  // Hộp quà của mình: { gifts: [{ id, from, item, qty }] }
  r.route('GET', '/api/gifts', c => readGifts(c, mustAccount(c)));
  // Nhận quà { room: chỗ trống trong giỏ }: { taken: [{ id, from, item, qty }], left }
  r.route('POST', '/api/gifts/take', c => takeGifts(c, mustAccount(c), c.body ?? {}));
  // Ký sổ { to, text }: 400 empty/too_long/self · 409 already_signed. Đọc sổ ?name= (không có là sổ của mình): { notes: [{ id, from, text, day }] }
  r.route('POST', '/api/guestbook', c => signBook(c, mustAccount(c), c.body ?? {}));
  r.route('GET', '/api/guestbook', c => readBook(c, mustAccount(c), c.url.searchParams.get('name')));
  // Tin mới ở cổng của mình: { gifts, notes }
  r.route('GET', '/api/gate', c => gateNews(c, mustAccount(c)));
}
