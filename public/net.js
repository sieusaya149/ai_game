// Nói chuyện với server của làng (API HTTP JSON, xem SPEC mục Server). Chơi một mình không gọi gì ở đây.
// Phiên nằm trong cookie HttpOnly do server đặt; localStorage chỉ nhớ "máy này đã vào làng" để khỏi gọi server khi chơi một mình.
const KEY = 'nongtrai-online';

export const rememberedName = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const remember = name => { try { name ? localStorage.setItem(KEY, name) : localStorage.removeItem(KEY); } catch {} };
// Thôi tự vào làng khi mở game (vd đã bị máy khác thay): lần sau hiện màn chọn chế độ
export const forget = () => remember(null);

// Câu báo lỗi theo mã `code` của server
const MSG = {
  name_format: 'Tên cần 2–20 ký tự: chữ, số, dấu cách hoặc _ - .',
  pin_format: 'PIN phải đủ 6 số.',
  invite_invalid: 'Mã mời không đúng.',
  invite_used: 'Mã mời này đã được dùng rồi.',
  name_taken: 'Tên này đã có người dùng.',
  bad_credentials: 'Sai tên hoặc PIN.',
  no_such_name: 'Không có người chơi nào tên này.',
  bad_code: 'Mã kết bạn không đúng.',
  already_friend: 'Đã là bạn rồi.',
  self: 'Đó là chính bạn mà.',
  not_friend: 'Người này chưa là bạn của bạn.',
  no_farm: 'Không thấy vườn của người này trong làng.',
};
export const lockText = sec => (sec >= 90 ? `${Math.ceil(sec / 60)} phút` : `${sec} giây`);

// POST/GET JSON → { ok, ... }; mất mạng thì { ok: false, error }
async function call(path, body) {
  try {
    const res = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json();
    if (d.error && d.code) d.error = d.code === 'locked' ? `Nhập sai nhiều lần, thử lại sau ${lockText(d.retryAfter)}.` : MSG[d.code] ?? d.error;
    return { status: res.status, ...d };
  } catch { return { ok: false, status: 0, error: 'Không kết nối được tới làng. Kiểm tra mạng rồi thử lại nhé.' }; }
}

// Đăng xuất đang chạy (lưu lần cuối rồi xóa phiên): hỏi phiên / đăng nhập phải chờ nó xong,
// không thì mạng chậm sẽ thấy cookie cũ còn hạn, vào lại tài khoản vừa thoát rồi bị server đá ra
let leaving = null;

export async function login(name, pin) {
  await leaving;
  const r = await call('/api/login', { name, pin });
  if (r.ok) remember(r.name);
  return r;
}
export async function register(name, pin, invite) {
  await leaving;
  const r = await call('/api/register', { name, pin, invite });
  if (r.ok) remember(r.name);
  return r;
}
// before: việc phải xong trước khi xóa phiên (gửi bản lưu cuối bằng phiên này)
export function logout(before) {
  return leaving = (async () => {
    await before;
    await call('/api/logout', {});
    remember(null);
  })();
}
// Đọc vườn của người khác để thăm (issue 27, chỉ đọc, server đã chạy bù): { ok, name, farm, savedAt } hoặc { ok: false, error }
export const visitFarm = name => call('/api/visit?name=' + encodeURIComponent(name));
// Máy này còn đăng nhập không? Trả tên, hoặc null (hết hạn/chưa vào làng). Mất mạng thì null nhưng giữ ghi nhớ.
// force: hỏi server kể cả khi máy không nhớ (nút Vào làng: cookie còn hạn thì khỏi nhập PIN)
export async function whoAmI(force) {
  await leaving;
  if (!force && !rememberedName()) return null;
  const r = await call('/api/me');
  if (r.ok) { remember(r.name); return r.name; }
  if (r.status === 401) remember(null);
  return null;
}

// Bạn bè và cổng vườn (issue 26). friends() → { ok, code, friends: [{ name, level, online, ripe, help }] }
export const friends = () => call('/api/friends');
// gates() → { ok, gates: [{ name, level, friend }] }: bạn bè ở đầu
export const gates = () => call('/api/gates');
// who: tên hoặc mã kết bạn (dạng ABC-DEF). Mã thì thử mã trước, không ra mới thử là tên
export async function addFriend(who) {
  who = who.trim();
  if (/^[A-Za-z0-9]{3}[- ]?[A-Za-z0-9]{3}$/.test(who)) {
    const r = await call('/api/friends', { code: who });
    if (r.status !== 404) return r;
    const n = await call('/api/friends', { name: who });
    return n.ok || !who.includes('-') ? n : r;   // có dấu - thì nhiều khả năng là mã: báo lỗi mã
  }
  return call('/api/friends', { name: who });
}
export const removeFriend = name => call('/api/friends/remove', { name });

// Quà và sổ lưu bút ở cổng (issue 29). `op` = mã thao tác tự chứa: gửi lại cùng mã thì server trả { dup: true }
export const sendGift = (to, item, qty, op) => call('/api/gifts', { to, item, qty, op });
export const myGifts = () => call('/api/gifts');
// room = chỗ trống trong giỏ; server trả { taken: [{ id, from, item, qty }], left }
export const takeGifts = room => call('/api/gifts/take', { room });
export const signBook = (to, text) => call('/api/guestbook', { to, text });
// name rỗng = sổ của mình (đọc xong thì hết "mới")
export const readBook = name => call('/api/guestbook' + (name ? '?name=' + encodeURIComponent(name) : ''));
// { gifts, notes }: số quà đang chờ và số lời nhắn chưa đọc ở cổng vườn mình
export const gateNews = () => call('/api/gate');
