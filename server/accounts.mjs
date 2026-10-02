// Tài khoản của làng (ADR 0012): đăng ký bằng mã mời, PIN 6 số băm scrypt có muối, phiên 30 ngày, khóa tạm khi sai PIN.
// Hàm ở đây nhận `db`; route (api.mjs) và lệnh quản trị (admin.mjs) cùng dùng. Lỗi nghiệp vụ ném `HttpError` kèm `code` cho giao diện.
import { randomBytes, randomInt, scrypt, createHash, timingSafeEqual } from 'node:crypto';
import { HttpError } from './router.mjs';

export const SESSION_MS = 30 * 24 * 3600_000;
export const MAX_FAILS = 5;                  // sai liên tiếp từng này lần thì khóa tên
export const LOCK_MS = 5 * 60_000;
const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // bỏ O/0/I/1 cho dễ đọc

const err = (status, code, msg, extra) => new HttpError(status, msg, { code, ...extra });
const hash = (pin, salt) => new Promise((ok, no) => scrypt(pin, salt, 32, (e, k) => (e ? no(e) : ok(k))));
const sha = s => createHash('sha256').update(s).digest('hex');

// Tên nhân vật: 2–20 ký tự, chữ (có dấu), số, khoảng trắng, _ - . ; chuẩn hóa NFC, gộp khoảng trắng
export function cleanName(raw) {
  const name = String(raw ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
  if ([...name].length < 2 || [...name].length > 20 || !/^[\p{L}\p{N}][\p{L}\p{M}\p{N} _.-]*$/u.test(name))
    throw err(400, 'name_format', 'Tên cần 2–20 ký tự: chữ, số, dấu cách, _ - .');
  return name;
}
const nameKey = name => name.toLocaleLowerCase('vi');
const checkPin = pin => { if (!/^\d{6}$/.test(String(pin ?? ''))) throw err(400, 'pin_format', 'PIN phải đủ 6 số'); return String(pin); };
const cleanInvite = c => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// ---------- Mã mời ----------
export function createInvites(db, n = 1) {
  const ins = db.prepare('INSERT INTO invites (code, created) VALUES (?, ?)');
  return Array.from({ length: n }, () => {
    const raw = Array.from({ length: 8 }, () => INVITE_CHARS[randomInt(INVITE_CHARS.length)]).join('');
    ins.run(raw, Date.now());
    return raw.slice(0, 4) + '-' + raw.slice(4);
  });
}

// ---------- Phiên ----------
function openSession(db, accountId) {
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, account_id, created, expires) VALUES (?, ?, ?, ?)')
    .run(sha(token), accountId, Date.now(), Date.now() + SESSION_MS);
  return token;
}

// Mã phiên → { id, name } hoặc null (sai, hết hạn)
export function accountOf(db, token) {
  if (!token) return null;
  return db.prepare(`SELECT a.id, a.name FROM sessions s JOIN accounts a ON a.id = s.account_id
    WHERE s.token_hash = ? AND s.expires > ?`).get(sha(token), Date.now()) ?? null;
}
// Mã phiên trong cookie `nt_session` của request HTTP (cả lúc nâng cấp WebSocket)
export const tokenOf = req => /(?:^|;\s*)nt_session=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
export function endSession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token));
}

// ---------- Đăng ký, đăng nhập ----------
export async function register(db, { name, pin, invite }) {
  name = cleanName(name); pin = checkPin(pin);
  const code = cleanInvite(invite);
  const inv = db.prepare('SELECT used_at FROM invites WHERE code = ?').get(code);
  if (!inv) throw err(400, 'invite_invalid', 'Mã mời không đúng');
  if (inv.used_at) throw err(409, 'invite_used', 'Mã mời này đã được dùng rồi');
  const salt = randomBytes(16), h = await hash(pin, salt);
  db.exec('BEGIN IMMEDIATE');   // kiểm tra lại trong giao dịch: hai người cùng dùng một mã / một tên
  try {
    if (db.prepare('SELECT 1 FROM invites WHERE code = ? AND used_at IS NULL').get(code) === undefined) throw err(409, 'invite_used', 'Mã mời này đã được dùng rồi');
    if (db.prepare('SELECT 1 FROM accounts WHERE name_key = ?').get(nameKey(name))) throw err(409, 'name_taken', 'Tên này đã có người dùng');
    const id = Number(db.prepare('INSERT INTO accounts (name, name_key, pin_hash, pin_salt, created) VALUES (?, ?, ?, ?, ?)')
      .run(name, nameKey(name), h.toString('base64'), salt.toString('base64'), Date.now()).lastInsertRowid);
    db.prepare('UPDATE invites SET used_by = ?, used_at = ? WHERE code = ?').run(id, Date.now(), code);
    db.exec('COMMIT');
    return { name, token: openSession(db, id) };
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

export async function login(db, { name, pin }) {
  const bad = () => err(401, 'bad_credentials', 'Sai tên hoặc PIN');
  const a = db.prepare('SELECT * FROM accounts WHERE name_key = ?').get(nameKey(String(name ?? '').normalize('NFC').trim().replace(/\s+/g, ' ')));
  if (!a) throw bad();
  if (a.locked_until > Date.now()) throw err(429, 'locked', 'Nhập sai nhiều lần, tạm khóa', { retryAfter: Math.ceil((a.locked_until - Date.now()) / 1000) });
  const got = await hash(String(pin ?? ''), Buffer.from(a.pin_salt, 'base64'));
  if (!timingSafeEqual(got, Buffer.from(a.pin_hash, 'base64'))) {
    const fails = a.fails + 1;
    if (fails >= MAX_FAILS) db.prepare('UPDATE accounts SET fails = 0, locked_until = ? WHERE id = ?').run(Date.now() + LOCK_MS, a.id);
    else db.prepare('UPDATE accounts SET fails = ? WHERE id = ?').run(fails, a.id);
    throw bad();
  }
  db.prepare('UPDATE accounts SET fails = 0 WHERE id = ?').run(a.id);
  return { name: a.name, token: openSession(db, a.id) };
}

// ---------- Quản trị ----------
const find = (db, name) => {
  const a = db.prepare('SELECT id, name FROM accounts WHERE name_key = ?').get(nameKey(String(name ?? '').normalize('NFC').trim().replace(/\s+/g, ' ')));
  if (!a) throw new Error(`Không có tài khoản tên "${name}"`);
  return a;
};
// Đặt PIN mới (không truyền thì sinh PIN tạm), mở khóa, hủy mọi phiên cũ. Trả PIN mới.
export async function resetPin(db, name, pin = String(randomInt(1_000_000)).padStart(6, '0')) {
  const a = find(db, name);
  try { checkPin(pin); } catch { throw new Error('PIN phải đủ 6 số'); }
  const salt = randomBytes(16);
  db.prepare('UPDATE accounts SET pin_hash = ?, pin_salt = ?, fails = 0, locked_until = 0 WHERE id = ?')
    .run((await hash(pin, salt)).toString('base64'), salt.toString('base64'), a.id);
  db.prepare('DELETE FROM sessions WHERE account_id = ?').run(a.id);
  return pin;
}
export function deleteAccount(db, name) {
  const a = find(db, name);
  db.prepare('DELETE FROM accounts WHERE id = ?').run(a.id);   // phiên xóa theo (CASCADE), mã mời giữ lại ở trạng thái đã dùng
  return a.name;
}
