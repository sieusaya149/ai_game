// Bạn bè và cổng vườn (issue 26, PRD 0002): danh sách bạn một chiều (A thêm B thì A ghim B), mỗi tài khoản có mã kết bạn.
// Ai vào vườn ai cũng được; kết bạn chỉ để ghim lên đầu danh sách cổng và nhận thông báo "bạn ghé vườn".
// Server chỉ trả cấp, online và hai cờ tóm tắt (🍅 có đồ chín, 🐛 cần giúp), không lộ bản lưu.
import { randomInt } from 'node:crypto';
import { HttpError } from './router.mjs';
import { levelInfo } from '../public/data.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // giống mã mời: bỏ O/0/I/1
const err = (status, code, msg) => new HttpError(status, msg, { code });
const keyOf = name => String(name ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
const cleanCode = c => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const show = raw => raw.slice(0, 3) + '-' + raw.slice(3);

// Mã kết bạn của tài khoản (6 ký tự, hiện dạng ABC-DEF); chưa có thì cấp ở lần xem đầu
export function codeOf(db, a) {
  let code = db.prepare('SELECT friend_code FROM accounts WHERE id = ?').get(a.id)?.friend_code;
  while (!code) {
    const c = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
    try { db.prepare('UPDATE accounts SET friend_code = ? WHERE id = ?').run(c, a.id); code = c; } catch { /* trùng mã: thử mã khác */ }
  }
  return show(code);
}

// Tóm tắt vườn từ bản lưu mới nhất: cấp + hai cờ
function summary(save) {
  let s = null;
  try { s = JSON.parse(save ?? 'null'); } catch { s = null; }
  if (!s) return { level: 1, ripe: false, help: false };
  const plots = (Array.isArray(s.plots) ? s.plots : []).filter(p => p.unlocked);
  const c = p => p.crop && !p.crop.dead && !p.crop.rotten ? p.crop : null;
  return {
    level: levelInfo(s.exp || 0).level,
    ripe: plots.some(p => c(p)?.progress >= 1),
    help: plots.some(p => p.weeds || c(p)?.bugs),
  };
}

// Thêm bạn bằng tên hoặc mã kết bạn: { name } | { code }. Trả { name } của người vừa thêm
export function addFriend(db, a, { name, code } = {}) {
  const who = code != null
    ? db.prepare('SELECT id, name FROM accounts WHERE friend_code = ?').get(cleanCode(code))
    : db.prepare('SELECT id, name FROM accounts WHERE name_key = ?').get(keyOf(name));
  if (!who) throw code != null ? err(404, 'bad_code', 'Không có mã kết bạn này') : err(404, 'no_such_name', 'Không có người chơi tên này');
  if (who.id === a.id) throw err(400, 'self', 'Không thể tự kết bạn với chính mình');
  if (db.prepare('SELECT 1 FROM friends WHERE account_id = ? AND friend_id = ?').get(a.id, who.id)) throw err(409, 'already_friend', 'Đã là bạn rồi');
  db.prepare('INSERT INTO friends (account_id, friend_id, created) VALUES (?, ?, ?)').run(a.id, who.id, Date.now());
  return { name: who.name };
}

// Xóa bạn: chỉ bỏ quan hệ, không đụng tới vườn hay tài khoản
export function removeFriend(db, a, { name } = {}) {
  const who = db.prepare('SELECT id FROM accounts WHERE name_key = ?').get(keyOf(name));
  const r = who && db.prepare('DELETE FROM friends WHERE account_id = ? AND friend_id = ?').run(a.id, who.id);
  if (!r?.changes) throw err(404, 'not_friend', 'Người này chưa là bạn của bạn');
  return {};
}

// { code, friends: [{ name, level, online, ripe, help }] } theo tên
export function listFriends({ db, live }, a) {
  const rows = db.prepare(`SELECT x.id, x.name, f.save FROM friends r JOIN accounts x ON x.id = r.friend_id
    LEFT JOIN farms f ON f.account_id = x.id WHERE r.account_id = ? ORDER BY x.name_key`).all(a.id);
  return { code: codeOf(db, a), friends: rows.map(r => ({ name: r.name, online: live.playing(r.id), ...summary(r.save) })) };
}

// Cổng vườn trong làng: vườn của mọi người chơi khác (có bản lưu), bạn bè ở đầu rồi tới người còn lại, mỗi nhóm theo tên
export function listGates({ db }, a) {
  const rows = db.prepare(`SELECT x.name, f.save, EXISTS(SELECT 1 FROM friends r WHERE r.account_id = ? AND r.friend_id = x.id) AS fr
    FROM accounts x JOIN farms f ON f.account_id = x.id WHERE x.id != ? AND f.save IS NOT NULL ORDER BY fr DESC, x.name_key`).all(a.id, a.id);
  return { gates: rows.map(r => ({ name: r.name, level: summary(r.save).level, friend: !!r.fr })) };
}

// Chủ vườn `ownerId` được báo khi `visitor` (tài khoản) ghé vườn, nếu visitor nằm trong danh sách bạn của chủ vườn.
// Nguồn sự kiện là issue 27 (vào vườn người khác). Tin WebSocket: { t: 'visit', name }
export function notifyVisit({ db, live }, visitor, ownerId) {
  if (!db.prepare('SELECT 1 FROM friends WHERE account_id = ? AND friend_id = ?').get(ownerId, visitor.id)) return 0;
  return live.sendTo(ownerId, { t: 'visit', name: visitor.name });
}
