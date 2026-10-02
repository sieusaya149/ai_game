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
