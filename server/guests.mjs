// Hàng đợi thao tác của khách (issue 28, ADR 0012): luật nằm trong `state.js`, server chỉ kiểm tra và xếp hàng.
// Khách gửi `{ t: 'guest', op }` qua WebSocket khi đang đứng trong vườn người khác. Server lấy bản lưu mới nhất của chủ,
// áp dụng các thao tác còn đang chờ rồi gọi `guestOpApply` để kiểm tra thao tác mới:
//   · bị từ chối → trả lý do cho khách, không ghi gì vào hàng đợi;
//   · chủ đang online → ghi vào hàng đợi rồi đẩy `{ t: 'guestop', op }` sang trình duyệt chủ (trình duyệt chủ áp dụng
//     bằng chính hàm đó rồi gửi bản lưu lên như thường);
//   · chủ offline → chạy bù vườn (issue 24) rồi áp dụng ngay trên bản lưu đó và lưu lại.
// Mã thao tác là duy nhất nên áp dụng hai lần cùng mã thì lần sau không làm gì (guestOpApply trả reason 'done').
import { guestOpApply } from '../public/state.js';
import { levelInfo } from '../public/data.js';
import { catchUpFarm, farmRow, writeFarm } from './farms.mjs';

const ACTS = ['water', 'weed', 'catch', 'shoo'];
const KEEP_MS = 7 * 86400_000;   // thao tác đã áp dụng giữ chừng này rồi dọn
const no = (reason, msg) => ({ ok: false, reason, msg });

// Lọc thao tác nhận từ khách: chỉ giữ đúng các trường server biết, mọi thứ còn lại (ai làm, lúc nào) do server điền
function cleanOp(raw) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(String(raw?.id ?? '')) || raw.kind !== 'help' || !ACTS.includes(raw.act)) return null;
  const op = { id: raw.id, kind: 'help', act: raw.act };
  if (raw.act === 'shoo') op.crow = raw.crow;
  else op.idx = raw.idx;
  const n = op.act === 'shoo' ? op.crow : op.idx;
  return Number.isInteger(n) && n >= 0 && n < 1e6 ? op : null;
}

const pendingOf = (db, ownerId) => db.prepare('SELECT id, op FROM guest_ops WHERE owner_id = ? AND applied IS NULL ORDER BY created, rowid').all(ownerId);
const parse = row => { try { return JSON.parse(row.op); } catch { return null; } };
// Áp dụng các thao tác đang chờ lên bản lưu `save` (đã parse). Thao tác đã có trong bản lưu thì guestOpApply tự bỏ qua.
function applyPending(rows, save) {
  for (const row of rows) {
    const op = parse(row);
    if (op) guestOpApply(save, { name: op.by, level: op.level }, op);
  }
}
const markApplied = (db, rows, t) => { const q = db.prepare('UPDATE guest_ops SET applied = ? WHERE id = ?'); for (const r of rows) q.run(t, r.id); };

// Chủ vườn đang offline: áp dụng hàng đợi lên bản lưu (đã chạy bù trước đó) rồi lưu lại. Trả dòng farms mới nhất.
// farms.mjs gọi trước khi trả vườn cho người đọc (GET /api/visit) hay trao lại cho chủ (POST /api/play).
export function runGuestQueue(db, row) {
  if (!row?.save) return row;
  const rows = pendingOf(db, row.account_id);
  if (!rows.length) return row;
  const save = JSON.parse(row.save);
  applyPending(rows, save);
  const t = Date.now();
  writeFarm(db, row.account_id, save, t);
  markApplied(db, rows, t);
  return farmRow(db, row.account_id);
}

// Khách `guest` (tài khoản) gửi một thao tác lên vườn `ownerId`. Trả { ok: true, id, reward } hoặc { ok: false, reason, msg }
export function submitGuestOp(ctx, guest, ownerId, raw) {
  const { db, live } = ctx;
  const op = cleanOp(raw);
  if (!op) return no('op_invalid', 'Thao tác này chưa làm được');
  if (ownerId === guest.id) return no('self', 'Đây là vườn của bạn mà');
  let row = farmRow(db, ownerId);
  if (!row?.save) return no('no_farm', 'Không có vườn này');
  const online = live?.playing(ownerId);
  if (!online) row = catchUpFarm(db, row) ?? row;   // chủ vắng: chạy bù vườn trước (issue 24)
  const pending = pendingOf(db, ownerId);
  const save = JSON.parse(row.save);
  applyPending(pending, save);                      // hàng đợi còn tồn: tính cả vào giới hạn mỗi ngày
  const t = Date.now();
  Object.assign(op, { by: guest.name, level: levelOf(db, guest.id), at: t });
  const r = guestOpApply(save, { name: op.by, level: op.level }, op);
  if (!r.ok) return r;
  db.prepare('INSERT OR IGNORE INTO guest_ops (id, owner_id, guest_id, op, created, applied) VALUES (?, ?, ?, ?, ?, ?)')
    .run(op.id, ownerId, guest.id, JSON.stringify(op), t, online ? null : t);
  if (online) live.sendTo(ownerId, { t: 'guestop', op });
  else { writeFarm(db, ownerId, save, t); markApplied(db, pending, t); }
  db.prepare('DELETE FROM guest_ops WHERE applied IS NOT NULL AND created < ?').run(t - KEEP_MS);
  return { ok: true, id: op.id, reward: r.reward };
}

// Cấp của khách lấy từ vườn đã lưu của họ (luật sau này dùng: trộm cần cấp 5)
function levelOf(db, id) {
  try { return levelInfo(JSON.parse(farmRow(db, id)?.save ?? 'null')?.exp || 0).level; } catch { return 1; }
}

// Loại tin WebSocket của hàng đợi (live.mjs tra sau HANDLERS và presence). `pres.gardenOf(sock)` cho biết
// khách đang đứng trong vườn của ai.
export function createGuests(ctx, send, pres) {
  return {
    handlers: {
      guest(sock, m) {
        if (!sock.account) return send(sock, { t: 'guest', ok: false, reason: 'no_session', msg: 'Chưa đăng nhập' });
        const ownerId = pres.gardenOf(sock);
        if (!ownerId) return send(sock, { t: 'guest', ok: false, reason: 'not_joined', msg: 'Vào vườn rồi mới giúp được' });
        send(sock, { t: 'guest', id: m.op?.id, ...submitGuestOp(ctx, sock.account, ownerId, m.op) });
      },
    },
  };
}
