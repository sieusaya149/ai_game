// Nói chuyện với server của làng (API HTTP JSON, xem SPEC mục Server). Chơi một mình không gọi gì ở đây.
// Phiên nằm trong cookie HttpOnly do server đặt; localStorage chỉ nhớ "máy này đã vào làng" để khỏi gọi server khi chơi một mình.
const KEY = 'nongtrai-online';

export const rememberedName = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const remember = name => { try { name ? localStorage.setItem(KEY, name) : localStorage.removeItem(KEY); } catch {} };

// Câu báo lỗi theo mã `code` của server
const MSG = {
  name_format: 'Tên cần 2–20 ký tự: chữ, số, dấu cách hoặc _ - .',
  pin_format: 'PIN phải đủ 6 số.',
  invite_invalid: 'Mã mời không đúng.',
  invite_used: 'Mã mời này đã được dùng rồi.',
  name_taken: 'Tên này đã có người dùng.',
  bad_credentials: 'Sai tên hoặc PIN.',
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

export async function login(name, pin) {
  const r = await call('/api/login', { name, pin });
  if (r.ok) remember(r.name);
  return r;
}
export async function register(name, pin, invite) {
  const r = await call('/api/register', { name, pin, invite });
  if (r.ok) remember(r.name);
  return r;
}
export async function logout() {
  await call('/api/logout', {});
  remember(null);
}
// Máy này còn đăng nhập không? Trả tên, hoặc null (hết hạn/chưa vào làng). Mất mạng thì null nhưng giữ ghi nhớ.
export async function whoAmI() {
  if (!rememberedName()) return null;
  const r = await call('/api/me');
  if (r.ok) return r.name;
  if (r.status === 401) remember(null);
  return null;
}
