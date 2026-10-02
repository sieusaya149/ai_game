// Quà và sổ lưu bút ở cổng vườn (issue 29, ADR 0012). Quà là hàng đợi trong SQLite nên chủ offline vẫn nhận được;
// luật (món nào tặng được, giới hạn, chia theo sức chứa giỏ) là hàm thuần trong public/state.js, server chỉ gọi lại.
// Chủ online thì được báo qua WebSocket: { t: 'gift', name, item, qty } và { t: 'note', name }.
import { HttpError } from './router.mjs';
import { giftBoxCheck, splitGifts } from '../public/state.js';
import { GIFT } from '../public/data.js';
import { now, serverDay } from '../public/clock.js';

const err = (status, code, msg) => new HttpError(status, msg, { code });
const keyOf = name => String(name ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
const ownerOf = (db, name) => {
  const o = db.prepare('SELECT id, name FROM accounts WHERE name_key = ?').get(keyOf(name));
  if (!o) throw err(404, 'no_such_name', 'Không có người chơi tên này');
  return o;
};
const pending = (db, ownerId) => db.prepare('SELECT id, from_name, item, qty, op, created FROM gifts WHERE owner_id = ? AND qty > 0 ORDER BY id').all(ownerId);

// Khách `a` tặng quà { to, item, qty, op } vào hộp quà ở cổng vườn `to`. Cùng `op` gửi lại thì chỉ tính một lần ({ dup: true })
export function sendGift({ db, live }, a, { to, item, qty, op } = {}) {
  if (typeof op !== 'string' || !op || op.length > 64) throw err(400, 'bad_op', 'Thiếu mã thao tác');
  const o = ownerOf(db, to);
  if (o.id === a.id) throw err(400, 'self', 'Không thể tự tặng quà cho mình');
  if (db.prepare('SELECT 1 FROM gifts WHERE from_id = ? AND op = ?').get(a.id, op)) return { dup: true };
  const c = giftBoxCheck(pending(db, o.id), item, qty);
  if (!c.ok) throw err(400, c.reason, c.msg);
  db.prepare('INSERT INTO gifts (owner_id, from_id, from_name, item, qty, op, created) VALUES (?, ?, ?, ?, ?, ?, ?)').run(o.id, a.id, a.name, item, qty, op, Date.now());
  live.sendTo(o.id, { t: 'gift', name: a.name, item, qty });
  return {};
}

// Hộp quà của mình: { gifts: [{ id, from, item, qty }] } theo thứ tự tới
export function readGifts({ db }, a) {
  return { gifts: pending(db, a.id).map(g => ({ id: g.id, from: g.from_name, item: g.item, qty: g.qty })) };
}

// Chủ nhận quà vào giỏ còn `room` chỗ (hạt giống thì nhận hết): trả { taken: [{ id, from, item, qty }], left } (left = số quà còn nằm lại)
export function takeGifts({ db }, a, { room } = {}) {
  const box = pending(db, a.id).map(g => ({ id: g.id, from: g.from_name, item: g.item, qty: g.qty }));
  const { taken, rest } = splitGifts(box, Number.isFinite(room) ? Math.max(0, Math.floor(room)) : 0);
  db.exec('BEGIN');
  try {
    const upd = db.prepare('UPDATE gifts SET qty = qty - ? WHERE id = ? AND owner_id = ?');
    for (const g of taken) upd.run(g.qty, g.id, a.id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return { taken, left: rest.length };
}

// Khách `a` ký sổ lưu bút của `to` một dòng `text`: mỗi người mỗi ngày (ngoài đời, giờ VN) một dòng mỗi sổ
export function signBook({ db, live }, a, { to, text } = {}) {
  const o = ownerOf(db, to);
  if (o.id === a.id) throw err(400, 'self', 'Không thể tự ký vào sổ của mình');
  const t = String(text ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!t) throw err(400, 'empty', 'Chưa viết gì cả');
  if ([...t].length > GIFT.noteMax) throw err(400, 'too_long', `Lời nhắn tối đa ${GIFT.noteMax} ký tự`);
  const day = serverDay(now());
  if (db.prepare('SELECT 1 FROM guestbook WHERE owner_id = ? AND author_id = ? AND day = ?').get(o.id, a.id, day))
    throw err(409, 'already_signed', 'Hôm nay bạn đã ký sổ này rồi, mai quay lại nhé');
  db.prepare('INSERT INTO guestbook (owner_id, author_id, author_name, text, day, created) VALUES (?, ?, ?, ?, ?, ?)').run(o.id, a.id, a.name, t, day, Date.now());
  live.sendTo(o.id, { t: 'note', name: a.name });
  return {};
}

// Đọc sổ lưu bút, mới nhất ở trên: { notes: [{ id, from, text, day }] }. Không có `name` là sổ của mình (đọc xong thì đánh dấu đã xem)
export function readBook({ db }, a, name) {
  const o = name ? ownerOf(db, name) : a;
  const notes = db.prepare('SELECT id, author_name AS "from", text, day FROM guestbook WHERE owner_id = ? ORDER BY id DESC').all(o.id).map(n => ({ ...n }));
  if (o.id === a.id) db.prepare('UPDATE guestbook SET seen = 1 WHERE owner_id = ? AND seen = 0').run(a.id);
  return { notes };
}

// Tóm tắt cho chủ lúc vào làng: { gifts: số quà đang chờ, notes: số lời nhắn chưa đọc }
export function gateNews({ db }, a) {
  return {
    gifts: db.prepare('SELECT COUNT(*) AS n FROM gifts WHERE owner_id = ? AND qty > 0').get(a.id).n,
    notes: db.prepare('SELECT COUNT(*) AS n FROM guestbook WHERE owner_id = ? AND seen = 0').get(a.id).n,
  };
}
