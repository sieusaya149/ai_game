// Kho vườn online (issue 22, ADR 0002, 0012): mỗi tài khoản một bản lưu v2 + "phiên chơi" đang giữ quyền ghi.
// Một thiết bị mỗi tài khoản: máy mới xin phiên chơi (claimPlay) thì máy cũ nhận lệnh `kicked` qua WebSocket,
// gửi bản lưu cuối bằng phiên cũ; server chờ bản đó (tối đa FINAL_MS) rồi mới đổi phiên và trao vườn cho máy mới.
// Sau đó mọi bản lưu mang phiên cũ bị từ chối (409 play_replaced).
import { randomBytes } from 'node:crypto';
import { HttpError } from './router.mjs';
import { migrate } from '../public/migrate.js';
import { checkSaveJump } from '../public/state.js';
import { MAX_CATCHUP_MS } from '../public/data.js';

export const FINAL_MS = 3000;    // chờ bản lưu cuối của máy cũ tối đa chừng này
const waiting = new Map();       // phiên cũ đang bị thay → hàm báo "đã nhận bản lưu cuối"

const rowOf = (db, id) => db.prepare('SELECT * FROM farms WHERE account_id = ?').get(id);
const farmOut = r => (r?.save ? { farm: JSON.parse(r.save), rev: r.rev, savedAt: r.saved_at } : { farm: null, rev: r?.rev ?? 0 });

// Cấp phiên chơi mới cho tài khoản `a`. Trả { play, farm (null = chưa có vườn), rev, savedAt }
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
  return { play, ...farmOut(rowOf(db, a.id)) };
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
    db.prepare('UPDATE farms SET save = ?, saved_at = ?, updated = ?, rev = rev + 1 WHERE account_id = ?').run(JSON.stringify(s), s.savedAt, now, a.id);
    return { rev: r.rev + 1, savedAt: s.savedAt };
  } finally {
    waiting.get(play)?.();   // bản lưu cuối của máy cũ đã tới (nhận hay từ chối): máy mới khỏi chờ
  }
}
