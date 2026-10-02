// Lưu trữ SQLite (node:sqlite, ADR 0010). Schema đổi theo phiên bản trong `PRAGMA user_version`:
// mỗi phần tử của MIGRATIONS đưa schema lên thêm một bản. Chỉ thêm vào cuối, không sửa bước cũ.
import { DatabaseSync } from 'node:sqlite';

export const MIGRATIONS = [
  // v1: bảng ghi thông tin chung của làng
  db => {
    db.exec('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('created', String(Date.now()));
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
