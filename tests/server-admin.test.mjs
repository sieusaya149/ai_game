import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { bootServer, runAdmin } from './helpers/server.mjs';

test('admin backup: tạo bản sao có dấu thời gian, mở lại bằng node:sqlite đọc được bảng đã có', async t => {
  const srv = await bootServer();
  t.after(srv.close);
  // server đang chạy (WAL đang mở) vẫn sao lưu được
  const { code, out } = await srv.admin('backup');
  assert.equal(code, 0);
  assert.ok(existsSync(out), out);
  assert.equal(dirname(out), join(dirname(srv.dbPath), 'backups'));
  assert.match(out, /farm-\d{8}-\d{6}\.db$/);

  const db = new DatabaseSync(out, { readOnly: true });
  try {
    const rows = db.prepare('SELECT key FROM meta').all().map(r => r.key);
    assert.ok(rows.includes('created'));
    assert.ok(db.prepare('PRAGMA user_version').get().user_version >= 1);
  } finally { db.close(); }
});

test('admin backup: --out chọn thư mục khác; thiếu file dữ liệu thì báo lỗi', async t => {
  const srv = await bootServer();
  t.after(srv.close);
  const out = join(srv.dir, 'ngoai');
  const r = await srv.admin('backup', '--out', out);
  assert.equal(r.code, 0);
  assert.equal(dirname(r.out), out);

  const miss = await runAdmin('backup', '--db', join(srv.dir, 'khong-co.db'));
  assert.notEqual(miss.code, 0);
  assert.match(miss.err, /không thấy/i);
});

test('admin: lệnh lạ thì in hướng dẫn và thoát lỗi', async () => {
  const r = await runAdmin('lam-gi-do');
  assert.notEqual(r.code, 0);
  assert.match(r.err, /backup/);
});
