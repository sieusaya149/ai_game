// Lệnh quản trị, chạy trong container: `docker compose exec web node server/admin.mjs <lệnh> [...]`.
// File dữ liệu lấy từ `--db` hoặc biến DB_FILE (mặc định ./farm.db). Thêm lệnh mới vào COMMANDS.
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { openDb, backupTo } from './db.mjs';
import { createInvites, resetPin, deleteAccount } from './accounts.mjs';

const stamp = (d = new Date()) => d.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

const COMMANDS = {
  // backup [--out thư-mục]: chép file SQLite ra <thư mục>/farm-YYYYMMDD-HHMMSS.db (mặc định backups/ cạnh file dữ liệu)
  backup({ db: file, out }) {
    const dir = resolve(out || join(dirname(file), 'backups'));
    mkdirSync(dir, { recursive: true });
    const db = openDb(file);
    try { return backupTo(db, join(dir, `farm-${stamp()}.db`)); } finally { db.close(); }
  },
  // invite [số lượng]: in mã mời mới, mỗi dòng một mã (mỗi mã dùng được một lần)
  invite({ db: file, args: [n = '1'] }) {
    const k = Number(n);
    if (!Number.isInteger(k) || k < 1 || k > 100) throw new Error('Số lượng mã mời phải từ 1 đến 100');
    return withDb(file, db => createInvites(db, k).join('\n'));
  },
  // reset-pin <tên> [pin-mới]: đặt PIN mới (không nêu thì sinh PIN tạm), mở khóa, đăng xuất mọi máy. In PIN mới
  'reset-pin': ({ db: file, args: [name, pin] }) => withDb(file, db => resetPin(db, name, pin)),
  // delete-account <tên>: xóa tài khoản (tên dùng lại được)
  'delete-account': ({ db: file, args: [name] }) => withDb(file, db => `Đã xóa tài khoản ${deleteAccount(db, name)}`),
};

async function withDb(file, fn) {
  const db = openDb(file);
  try { return await fn(db); } finally { db.close(); }
}

const USAGE = `Cách dùng: node server/admin.mjs <lệnh> [--db file.db]
  backup [--out thư-mục]   sao lưu dữ liệu ra file có dấu thời gian
  invite [số lượng]        in mã mời (mỗi mã dùng một lần)
  reset-pin <tên> [pin]    đặt lại PIN (không nêu pin thì in PIN tạm)
  delete-account <tên>     xóa tài khoản`;

async function main(argv) {
  const { values, positionals: [cmd, ...args] } = parseArgs({
    args: argv, allowPositionals: true, strict: false,
    options: { db: { type: 'string' }, out: { type: 'string' } },
  });
  const run = COMMANDS[cmd];
  if (!run) throw new Error(USAGE);
  const db = resolve(values.db || process.env.DB_FILE || 'farm.db');
  if (!existsSync(db)) throw new Error(`Không thấy file dữ liệu: ${db}`);
  console.log(await run({ ...values, db, args }));
}

try { await main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
