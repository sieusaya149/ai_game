// Lệnh quản trị, chạy trong container: `docker compose exec web node server/admin.mjs <lệnh> [...]`.
// File dữ liệu lấy từ `--db` hoặc biến DB_FILE (mặc định ./farm.db). Thêm lệnh mới vào COMMANDS.
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { openDb, backupTo } from './db.mjs';

const stamp = (d = new Date()) => d.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

const COMMANDS = {
  // backup [--out thư-mục]: chép file SQLite ra <thư mục>/farm-YYYYMMDD-HHMMSS.db (mặc định backups/ cạnh file dữ liệu)
  backup({ db: file, out }) {
    const dir = resolve(out || join(dirname(file), 'backups'));
    mkdirSync(dir, { recursive: true });
    const db = openDb(file);
    try { return backupTo(db, join(dir, `farm-${stamp()}.db`)); } finally { db.close(); }
  },
};

const USAGE = `Cách dùng: node server/admin.mjs <lệnh> [--db file.db]
  backup [--out thư-mục]   sao lưu dữ liệu ra file có dấu thời gian`;

function main(argv) {
  const { values, positionals: [cmd] } = parseArgs({
    args: argv, allowPositionals: true, strict: false,
    options: { db: { type: 'string' }, out: { type: 'string' } },
  });
  const run = COMMANDS[cmd];
  if (!run) throw new Error(USAGE);
  const db = resolve(values.db || process.env.DB_FILE || 'farm.db');
  if (!existsSync(db)) throw new Error(`Không thấy file dữ liệu: ${db}`);
  console.log(run({ ...values, db }));
}

try { main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
