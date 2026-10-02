// Lưu trữ SQLite (node:sqlite, ADR 0010). Schema đổi theo phiên bản trong `PRAGMA user_version`:
// mỗi phần tử của MIGRATIONS đưa schema lên thêm một bản. Chỉ thêm vào cuối, không sửa bước cũ.
import { DatabaseSync } from 'node:sqlite';

export const MIGRATIONS = [
  // v1: bảng ghi thông tin chung của làng
  db => {
    db.exec('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('created', String(Date.now()));
  },
  // v2: tài khoản, mã mời, phiên đăng nhập (issue 21). Phiên chỉ lưu băm của mã; mã mời giữ lại sau khi xóa tài khoản
  db => {
    db.exec(`
      CREATE TABLE accounts (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE,
        pin_hash TEXT NOT NULL, pin_salt TEXT NOT NULL, created INTEGER NOT NULL,
        fails INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE invites (
        code TEXT PRIMARY KEY, created INTEGER NOT NULL,
        used_by INTEGER REFERENCES accounts(id) ON DELETE SET NULL, used_at INTEGER);
      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created INTEGER NOT NULL, expires INTEGER NOT NULL)`);
  },
  // v3: vườn online (issue 22). Mỗi tài khoản một dòng: phiên chơi đang giữ quyền ghi, bản lưu JSON (NULL = chưa có vườn),
  // savedAt của bản lưu (giờ trình duyệt), giờ server lúc nhận, số lần đã ghi (rev)
  db => {
    db.exec(`
      CREATE TABLE farms (
        account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        play TEXT, save TEXT, saved_at INTEGER, updated INTEGER, rev INTEGER NOT NULL DEFAULT 0)`);
  },
  // v4: bạn bè (issue 26). Quan hệ một chiều (A ghim B); mã kết bạn của tài khoản cấp lười ở lần xem đầu
  db => {
    db.exec(`
      ALTER TABLE accounts ADD COLUMN friend_code TEXT;
      CREATE UNIQUE INDEX accounts_friend_code ON accounts(friend_code);
      CREATE TABLE friends (
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        friend_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created INTEGER NOT NULL, PRIMARY KEY (account_id, friend_id))`);
  },
  // v5: hàng đợi thao tác của khách trong vườn người khác (issue 28, ADR 0012). `id` là mã thao tác do khách sinh
  // (duy nhất, nên gửi lại cũng không nhân đôi), `op` là thao tác dạng JSON, `applied` = giờ server lúc server tự
  // áp dụng vào bản lưu chủ (NULL = đang chờ trình duyệt chủ áp dụng)
  db => {
    db.exec(`
      CREATE TABLE guest_ops (
        id TEXT PRIMARY KEY,
        owner_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        guest_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        op TEXT NOT NULL, created INTEGER NOT NULL, applied INTEGER);
      CREATE INDEX guest_ops_owner ON guest_ops(owner_id, applied)`);
  },
  // v6: quà ở cổng và sổ lưu bút (issue 29)
  // gifts: hàng đợi quà, qty = số còn chờ (nhận hết thì 0, giữ dòng để mã thao tác op vẫn chặn gửi lặp)
  // guestbook: mỗi người một dòng mỗi ngày ngoài đời mỗi sổ; seen = chủ đã đọc chưa
  db => {
    db.exec(`
      CREATE TABLE gifts (
        id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        from_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL, from_name TEXT NOT NULL,
        item TEXT NOT NULL, qty INTEGER NOT NULL, op TEXT NOT NULL, created INTEGER NOT NULL,
        UNIQUE (from_id, op));
      CREATE INDEX gifts_owner ON gifts(owner_id, qty);
      CREATE TABLE guestbook (
        id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        author_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL, author_name TEXT NOT NULL,
        text TEXT NOT NULL, day TEXT NOT NULL, created INTEGER NOT NULL, seen INTEGER NOT NULL DEFAULT 0,
        UNIQUE (owner_id, author_id, day))`);
  },
  // v7: giờ server lúc cấp phiên chơi đang giữ quyền ghi (farms.claimed). Việc khách mà server tự áp dụng sau mốc này
  // (chủ rớt mạng một lúc) thì trình duyệt chủ chưa biết: bản lưu nó gửi lên thiếu thì server áp dụng lại.
  // Dòng có từ trước: lấy giờ chạy migration, coi như vừa cấp phiên
  db => {
    db.exec('ALTER TABLE farms ADD COLUMN claimed INTEGER NOT NULL DEFAULT 0');
    db.prepare('UPDATE farms SET claimed = ?').run(Date.now());
  },
];

// Mở (tạo nếu chưa có) file SQLite và đưa schema lên bản mới nhất
export function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const ver = db.prepare('PRAGMA user_version').get().user_version;
  for (let v = ver; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      MIGRATIONS[v](db);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); db.close(); throw e; }
  }
  return db;
}

// Chép toàn bộ dữ liệu ra một file mới, an toàn cả khi server đang ghi (VACUUM INTO)
export function backupTo(db, out) {
  db.prepare('VACUUM INTO ?').run(out);
  return out;
}
