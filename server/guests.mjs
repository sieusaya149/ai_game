// Hàng đợi thao tác của khách (issue 28, ADR 0012): luật nằm trong `state.js`, server chỉ kiểm tra và xếp hàng.
// Khách gửi `{ t: 'guest', op }` qua WebSocket khi đang đứng trong vườn người khác. Server lấy bản lưu mới nhất của chủ,
// áp dụng các thao tác còn đang chờ rồi gọi `guestOpApply` để kiểm tra thao tác mới:
//   · bị từ chối → trả lý do cho khách, không ghi gì vào hàng đợi;
//   · chủ đang online → ghi vào hàng đợi rồi đẩy `{ t: 'guestop', op }` sang trình duyệt chủ (trình duyệt chủ áp dụng
//     bằng chính hàm đó rồi gửi bản lưu lên như thường);
//   · chủ offline → chạy bù vườn (issue 24) rồi áp dụng ngay trên bản lưu đó và lưu lại.
// Mã thao tác là duy nhất nên áp dụng hai lần cùng mã thì lần sau không làm gì (guestOpApply trả reason 'done').
import { guestOpApply, basketCap, basketCount, haveItem } from '../public/state.js';
import { migrate } from '../public/migrate.js';
import { levelInfo, ITEMS, GUEST, isProduce } from '../public/data.js';
import { serverDay } from '../public/clock.js';
import { catchUpFarm, farmRow, writeFarm } from './farms.mjs';

// Thao tác nhận được và tên trường số đi kèm mỗi việc (issue 28 giúp, issue 30 trộm, issue 31 chó canh khách)
const ACTS = { water: 'idx', weed: 'idx', catch: 'idx', shoo: 'crow', crop: 'idx', egg: 'egg', product: 'animal' };
const KINDS = { help: ['water', 'weed', 'catch', 'shoo'], steal: ['crop', 'egg', 'product'], bark: ['bark'], bite: ['bite'], sausage: ['sausage'] };
const KEEP_MS = 7 * 86400_000;   // thao tác đã áp dụng giữ chừng này rồi dọn
const no = (reason, msg) => ({ ok: false, reason, msg });
const known = k => !!ITEMS[k] || isProduce(k);   // nông sản mọi mức sao (Phase 3)
const coord = v => (Number.isFinite(v) ? Math.round(Math.max(-1e4, Math.min(1e4, v))) : 0);

// Lọc thao tác nhận từ khách: chỉ giữ đúng các trường server biết, mọi thứ còn lại (ai làm, cấp mấy, giỏ còn
// mấy chỗ, lúc nào) do server điền
function cleanOp(raw) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(String(raw?.id ?? '')) || !KINDS[raw.kind]?.includes(raw.act)) return null;
  const head = { id: raw.id, kind: raw.kind, act: raw.act };
  // chó sủa: chỗ khách bị thấy · chó đớp: đồ khách vừa trộm (rơi hết) · xúc xích: không kèm gì
  if (raw.kind === 'bark') return { ...head, x: coord(raw.x), y: coord(raw.y) };
  if (raw.kind === 'sausage') return head;
  if (raw.kind === 'bite') {
    const loot = {};
    for (const [k, n] of Object.entries(raw.loot ?? {}).slice(0, 20)) {
      if (!known(k) || !Number.isInteger(n) || n <= 0 || n > 1e4) return null;
      loot[k] = n;
    }
    return { ...head, loot };
  }
  const key = ACTS[raw.act], op = { ...head, [key]: raw[key] };
  return Number.isInteger(op[key]) && op[key] >= 0 && op[key] < 1e6 ? op : null;
}

const pendingOf = (db, ownerId) => db.prepare('SELECT id, op FROM guest_ops WHERE owner_id = ? AND applied IS NULL ORDER BY created, rowid').all(ownerId);
const parse = row => { try { return JSON.parse(row.op); } catch { return null; } };
const whoOf = op => ({ name: op.by, level: op.level, room: op.room, sausage: op.sausage });
// Áp dụng các thao tác đang chờ lên bản lưu `save` (đã parse). Thao tác đã có trong bản lưu thì guestOpApply tự bỏ qua.
function applyPending(rows, save) {
  for (const row of rows) {
    const op = parse(row);
    if (op) guestOpApply(save, whoOf(op), op);
  }
}
// Bản lưu chủ trong DB (đã qua migrate lúc nhận; dòng lưu từ trước Phase 2 có thể còn v2 thì đưa lên v3 trước khi áp luật)
const farmSave = row => migrate(JSON.parse(row.save));
const markApplied = (db, rows, t) => { const q = db.prepare('UPDATE guest_ops SET applied = ? WHERE id = ?'); for (const r of rows) q.run(t, r.id); };

// Chủ vườn đang offline: áp dụng hàng đợi lên bản lưu (đã chạy bù trước đó) rồi lưu lại. Trả dòng farms mới nhất.
// farms.mjs gọi trước khi trả vườn cho người đọc (GET /api/visit) hay trao lại cho chủ (POST /api/play).
export function runGuestQueue(db, row) {
  if (!row?.save) return row;
  const rows = pendingOf(db, row.account_id);
  if (!rows.length) return row;
  const save = farmSave(row);
  applyPending(rows, save);
  const t = Date.now();
  writeFarm(db, row.account_id, save, t);
  markApplied(db, rows, t);
  return farmRow(db, row.account_id);
}

// Bản lưu chủ vừa gửi lên (phiên chơi cấp lúc `since`) còn thiếu việc khách nào thì áp dụng luôn vào `save`, trả các
// việc đó: việc server tự áp dụng sau mốc ấy (chủ rớt WebSocket một lúc nên server tưởng chủ vắng nhà) hoặc việc đang chờ
// mà tin đẩy sang trình duyệt chủ bị lạc. Nhật ký khách đã đầy (rơi bớt việc cũ) thì bỏ qua việc cũ hơn dòng cũ nhất còn giữ.
export function missedOps(db, ownerId, save, since = 0) {
  const log = save.guests ?? [], seen = new Set(log.map(g => g.id));
  const from = log.length >= GUEST.logMax ? Math.min(...log.map(g => g.at)) : 0;
  const rows = db.prepare('SELECT op FROM guest_ops WHERE owner_id = ? AND (applied IS NULL OR applied >= ?) AND created >= ? ORDER BY created, rowid')
    .all(ownerId, since, from);
  const out = [];
  for (const row of rows) {
    const op = parse(row);
    if (op && !seen.has(op.id) && guestOpApply(save, whoOf(op), op).ok) out.push(op);
  }
  return out;
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
  const save = farmSave(row);
  applyPending(pending, save);                      // hàng đợi còn tồn: tính cả vào giới hạn mỗi ngày
  const t = Date.now();
  const me = guestSave(db, guest.id);
  Object.assign(op, { by: guest.name, level: levelInfo(me?.exp || 0).level, room: roomOf(me), sausage: sausageOf(me), at: t });
  const r = guestOpApply(save, whoOf(op), op);
  if (!r.ok) return r;
  db.prepare('INSERT OR IGNORE INTO guest_ops (id, owner_id, guest_id, op, created, applied) VALUES (?, ?, ?, ?, ?, ?)')
    .run(op.id, ownerId, guest.id, JSON.stringify(op), t, online ? null : t);
  if (online) live.sendTo(ownerId, { t: 'guestop', op });
  else { writeFarm(db, ownerId, save, t); markApplied(db, pending, t); }
  db.prepare('DELETE FROM guest_ops WHERE applied IS NOT NULL AND created < ?').run(t - KEEP_MS);
  return { ok: true, id: op.id, reward: r.reward };
}

// Cấp và sức chứa giỏ của khách lấy từ vườn đã lưu của họ (luật trộm cần: cấp 5 và giỏ còn chỗ)
function guestSave(db, id) {
  try { return JSON.parse(farmRow(db, id)?.save ?? 'null'); } catch { return null; }
}
function roomOf(me) {
  try { return me ? Math.max(0, basketCap(me) - basketCount(me)) : 0; } catch { return 0; }
}
// Số xúc xích khách đang có (luật ném xúc xích cần, issue 31)
function sausageOf(me) {
  try { return me ? haveItem(me, 'sausage') : 0; } catch { return 0; }
}

// Số vụ trộm server đã nhận của khách `id` trong ngày ngoài đời của `t` (farms.mjs dùng để chặn bản lưu khai khống)
export function stealsOf(db, id, t = Date.now()) {
  const from = Date.parse(serverDay(t) + 'T00:00:00Z') - 7 * 3600_000;   // nửa đêm giờ Việt Nam
  const rows = db.prepare('SELECT op FROM guest_ops WHERE guest_id = ? AND created >= ?').all(id, from);
  return rows.reduce((a, r) => a + (parse(r)?.kind === 'steal' ? 1 : 0), 0);
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
