// Kho vườn online (issue 22, ADR 0002, 0012): mỗi tài khoản một bản lưu v2 + "phiên chơi" đang giữ quyền ghi.
// Một thiết bị mỗi tài khoản: máy mới xin phiên chơi (claimPlay) thì máy cũ nhận lệnh `kicked` qua WebSocket,
// gửi bản lưu cuối bằng phiên cũ; server chờ bản đó (tối đa FINAL_MS) rồi mới đổi phiên và trao vườn cho máy mới.
// Sau đó mọi bản lưu mang phiên cũ bị từ chối (409 play_replaced).
import { randomBytes } from 'node:crypto';
import { HttpError } from './router.mjs';
import { migrate } from '../public/migrate.js';
import { checkSaveJump, loadGame } from '../public/state.js';
import { now as clock, serverDay } from '../public/clock.js';
import { MAX_CATCHUP_MS } from '../public/data.js';
import { runGuestQueue, stealsOf } from './guests.mjs';
import { gateNews } from './gate.mjs';

export const FINAL_MS = 3000;    // chờ bản lưu cuối của máy cũ tối đa chừng này
const waiting = new Map();       // phiên cũ đang bị thay → hàm báo "đã nhận bản lưu cuối"

const rowOf = (db, id) => db.prepare('SELECT * FROM farms WHERE account_id = ?').get(id);
export const farmRow = rowOf;
// Ghi đè bản lưu của chủ (server tự sửa: chạy bù, hàng đợi khách). savedAt của bản lưu không đổi.
export function writeFarm(db, accountId, save, t = Date.now()) {
  db.prepare('UPDATE farms SET save = ?, updated = ?, rev = rev + 1 WHERE account_id = ?').run(JSON.stringify(save), t, accountId);
}
const farmOut = r => (r?.save ? { farm: JSON.parse(r.save), rev: r.rev, savedAt: r.saved_at } : { farm: null, rev: r?.rev ?? 0 });

// Cấp phiên chơi mới cho tài khoản `a`. Trả { play, farm (null = chưa có vườn), rev, savedAt, gate }
// gate = { gifts, notes }: quà đang chờ, lời nhắn chưa đọc ở cổng, cho màn "Trong lúc bạn vắng nhà…" (issue 32)
export async function claimPlay({ db, live }, a) {
  const old = rowOf(db, a.id)?.play;
  const socks = old ? live.kick(a.id, old) : [];
  // chờ bản lưu cuối, hoặc máy cũ đóng kết nối (vd chính trang đó vừa tải lại), hoặc hết giờ chờ
  if (socks.length) {
    await new Promise(ok => {
      const done = () => { clearTimeout(t); waiting.delete(old); ok(); };
      const t = setTimeout(done, FINAL_MS);
      waiting.set(old, done);
      let left = socks.length;
      for (const s of socks) s.once('close', () => { if (--left === 0) done(); });
    });
  }
  const play = randomBytes(16).toString('base64url');
  db.prepare('INSERT INTO farms (account_id, play) VALUES (?, ?) ON CONFLICT(account_id) DO UPDATE SET play = excluded.play').run(a.id, play);
  return { play, ...farmOut(runGuestQueue(db, catchUpFarm(db, rowOf(db, a.id)))), gate: gateNews({ db }, a) };
}

// Chạy bù vườn của chủ đang offline bằng chính loadGame (luật trong state.js: tối đa 8 giờ, phần dư đóng băng,
// vật nuôi không chết). Chạy đồng bộ nên nhiều người đọc cùng lúc cũng chỉ chạy một lần: lần sau savedAt đã là giờ server.
// Tóm tắt "Trong lúc bạn vắng nhà" cất vào `awayPending` để chủ về thì loadGame ở trình duyệt đưa lại.
export function catchUpFarm(db, r) {
  if (!r?.save) return r;
  const raw = JSON.parse(r.save);
  if (clock() - raw.savedAt <= 3000) return r;   // vắng ngắn quá: không có gì để chạy
  const s = loadGame(raw);
  if (!s) return r;
  if (s.away) s.awayPending = s.away;
  delete s.away;
  db.prepare('UPDATE farms SET save = ?, saved_at = ?, updated = ?, rev = rev + 1 WHERE account_id = ?').run(JSON.stringify(s), s.savedAt, Date.now(), r.account_id);
  return rowOf(db, r.account_id);
}

// Đọc vườn của người khác (chỉ đọc, đã chạy bù nếu chủ đang offline): { name, farm, savedAt } hoặc 404 no_farm
export function visitFarm({ db, live }, name) {
  const key = String(name ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
  const acc = db.prepare('SELECT id, name FROM accounts WHERE name_key = ?').get(key);
  let r = acc && rowOf(db, acc.id);
  if (!r?.save) throw new HttpError(404, 'Không có vườn này', { code: 'no_farm' });
  if (!live.playing(acc.id)) r = runGuestQueue(db, catchUpFarm(db, r));   // chủ vắng: chạy bù rồi áp dụng việc khách đã làm
  return { name: acc.name, farm: JSON.parse(r.save), savedAt: r.saved_at };
}

export const playOf = (db, accountId) => rowOf(db, accountId)?.play ?? null;

export function readFarm(db, a) {
  const r = rowOf(db, a.id);
  if (!r?.save) throw new HttpError(404, 'Chưa có vườn', { code: 'no_farm' });
  return farmOut(r);
}

// Nhận bản lưu từ trình duyệt đang giữ phiên chơi. Bản đầu tiên (mang vườn chơi đơn lên / vườn mới) nhận nguyên;
// các bản sau so với bản trước bằng checkSaveJump (luật trong state.js) theo thời gian giữa hai bản.
export function storeFarm({ db }, a, { play, save } = {}) {
  const r = rowOf(db, a.id);
  if (!play || r?.play !== play) throw new HttpError(409, 'Vườn đang được chơi ở thiết bị khác', { code: 'play_replaced' });
  try {
    let s;
    try { s = migrate(save); } catch { s = null; }
    if (!s || !Number.isFinite(s.coins) || !Number.isFinite(s.exp) || !Number.isFinite(s.savedAt) || !Array.isArray(s.plots))
      throw new HttpError(400, 'Bản lưu không đúng định dạng', { code: 'save_invalid' });
    s.mode = 'online'; s.account = a.name;
    const now = Date.now();
    if (r.save) {
      // khoảng thời gian: theo savedAt của hai bản (chịu được giờ máy lệch, có chạy bù), nhưng không quá giờ server đã trôi + 8 giờ chạy bù
      const prev = JSON.parse(r.save), real = now - r.updated;
      const dt = Math.max(real, Math.min(s.savedAt - prev.savedAt, real + MAX_CATCHUP_MS));
      const chk = checkSaveJump(prev, s, dt);
      if (!chk.ok) throw new HttpError(422, chk.msg, { code: 'implausible', reason: chk.reason });
    }
    // Chống gian lận nhẹ (issue 30): bản lưu không được khai nhiều vụ trộm hôm nay hơn số server đã nhận,
    // nên xu và đồ "trộm được" cũng không vượt quá các vụ trộm hợp lệ
    const claimed = s.today?.day === serverDay(now) ? Math.floor(s.today.robs || 0) : 0;
    if (claimed > stealsOf(db, a.id, now)) throw new HttpError(422, 'Số vụ trộm trong bản lưu không khớp với làng', { code: 'implausible', reason: 'steals' });
    db.prepare('UPDATE farms SET save = ?, saved_at = ?, updated = ?, rev = rev + 1 WHERE account_id = ?').run(JSON.stringify(s), s.savedAt, now, a.id);
    return { rev: r.rev + 1, savedAt: s.savedAt };
  } finally {
    waiting.get(play)?.();   // bản lưu cuối của máy cũ đã tới (nhận hay từ chối): máy mới khỏi chờ
  }
}
