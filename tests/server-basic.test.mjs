import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { bootServer } from './helpers/server.mjs';

test('server: endpoint sức khỏe trả 200 kèm giờ server', async t => {
  const srv = await bootServer();
  t.after(srv.close);
  const { status, body } = await srv.json('/api/health');
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.ok(Math.abs(body.now - Date.now()) < 5000);
});

test('server: API lạ trả 404 JSON, sai phương thức trả 405', async t => {
  const srv = await bootServer();
  t.after(srv.close);
  const a = await srv.json('/api/khong-co');
  assert.equal(a.status, 404);
  assert.equal(a.body.ok, false);
  const b = await srv.json('/api/health', {});
  assert.equal(b.status, 405);
  assert.equal(b.body.ok, false);
});

test('server: WebSocket gửi ping nhận lại pong', async t => {
  const srv = await bootServer();
  t.after(srv.close);
  const ws = await srv.ws();
  ws.send({ t: 'ping', id: 7 });
  const m = await ws.next();
  assert.equal(m.t, 'pong');
  assert.equal(m.id, 7);
  assert.equal(typeof m.now, 'number');
});

test('server: tin nhắn hỏng không làm rớt kết nối', async t => {
  const srv = await bootServer();
  t.after(srv.close);
  const ws = await srv.ws();
  ws.raw.send('không phải JSON');
  ws.send({ t: 'ping' });
  assert.equal((await ws.next()).t, 'pong');
});

test('server: tắt server thì kết nối WebSocket đóng', async () => {
  const srv = await bootServer();
  const ws = await srv.ws();
  await srv.close();
  await ws.closed;
  assert.equal(ws.raw.readyState, ws.raw.CLOSED);
});

test('server: bật tắt hai lần liên tiếp trên hai file SQLite khác nhau', async () => {
  const seen = [];
  for (let i = 0; i < 2; i++) {
    const srv = await bootServer();
    seen.push(srv.dbPath);
    assert.ok(existsSync(srv.dbPath), 'file SQLite được tạo');
    assert.equal((await srv.json('/api/health')).status, 200);
    const ws = await srv.ws();
    ws.send({ t: 'ping' });
    assert.equal((await ws.next()).t, 'pong');
    await srv.close();
    assert.ok(!existsSync(srv.dbPath), 'dọn file tạm sau khi tắt');
  }
  assert.notEqual(seen[0], seen[1]);
});
