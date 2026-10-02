import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { bootServer } from './helpers/server.mjs';

// Bật server + hàm tiện: mã mời mới, đăng ký/đăng nhập (trả kèm cookie), sửa DB tạm để lùi giờ (không hook trong game)
async function setup(t) {
  const srv = await bootServer();
  t.after(srv.close);
  const invite = async () => (await srv.admin('invite')).out;
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const reg = async (name, pin = '123456', code) => srv.json('/api/register', { name, pin, invite: code ?? await invite() });
  const login = (name, pin) => srv.json('/api/login', { name, pin });
  const me = tok => srv.json('/api/me', undefined, { headers: { cookie: `nt_session=${tok}` } });
  const sql = fn => { const db = new DatabaseSync(srv.dbPath); try { return fn(db); } finally { db.close(); } };
  return { srv, invite, cookieOf, reg, login, me, sql };
}

test('đăng ký: mã mời hợp lệ thì vào được, cookie phiên HttpOnly SameSite=Lax', async t => {
  const { reg, cookieOf, me } = await setup(t);
  const r = await reg('Bé Tư');
  assert.equal(r.status, 200);
  assert.equal(r.body.name, 'Bé Tư');
  const c = r.headers.get('set-cookie');
  assert.match(c, /HttpOnly/);
  assert.match(c, /SameSite=Lax/);
  assert.doesNotMatch(c, /Secure/);
  assert.equal((await me(cookieOf(r))).body.name, 'Bé Tư');
});

test('đăng ký: sau HTTPS (X-Forwarded-Proto) cookie có Secure', async t => {
  const { srv, invite } = await setup(t);
  const r = await srv.json('/api/register', { name: 'An', pin: '123456', invite: await invite() }, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-proto': 'https' } });
  assert.match(r.headers.get('set-cookie'), /Secure/);
});

test('đăng ký: từ chối kèm mã lý do (mã mời sai/đã dùng, tên trùng kể cả khác hoa thường, PIN, tên xấu)', async t => {
  const { reg, invite } = await setup(t);
  const code = await invite();
  assert.equal((await reg('Lan', '123456', code)).status, 200);

  let r = await reg('Khác', '123456', code);
  assert.deepEqual([r.status, r.body.code], [409, 'invite_used']);
  r = await reg('Khác', '123456', 'ZZZZ-ZZZZ');
  assert.deepEqual([r.status, r.body.code], [400, 'invite_invalid']);
  r = await reg('LAN');
  assert.deepEqual([r.status, r.body.code], [409, 'name_taken']);
  r = await reg('lan');
  assert.equal(r.body.code, 'name_taken');
  for (const pin of ['12345', '1234567', 'abcdef', '12 456', '']) assert.equal((await reg('Mới', pin)).body.code, 'pin_format', pin);
  for (const name of ['', 'A', 'x'.repeat(21), '<b>', ' _a']) assert.equal((await reg(name)).body.code, 'name_format', name);
  // lần từ chối không đốt mã mời: tên trùng rồi vẫn dùng mã đó cho tên khác được
  const c2 = await invite();
  assert.equal((await reg('lan', '123456', c2)).body.code, 'name_taken');
  assert.equal((await reg('Hoa', '123456', c2)).status, 200);
});

test('đăng ký: tên tiếng Việt có dấu, tên trùng không phân biệt hoa thường với chữ có dấu', async t => {
  const { reg, login } = await setup(t);
  assert.equal((await reg('Nguyễn Văn Ớt')).status, 200);
  assert.equal((await reg('nguyễn văn ớt')).body.code, 'name_taken');
  assert.equal((await login('NGUYỄN  VĂN ỚT', '123456')).status, 200);
});

test('PIN không lưu rõ; hai tài khoản cùng PIN có băm khác nhau', async t => {
  const { reg, sql } = await setup(t);
  await reg('Một', '246810');
  await reg('Hai', '246810');
  const rows = sql(db => db.prepare('SELECT * FROM accounts').all());
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].pin_hash, rows[1].pin_hash);
  assert.notEqual(rows[0].pin_salt, rows[1].pin_salt);
  for (const r of rows) assert.ok(!JSON.stringify(r).includes('246810'));
});

test('đăng nhập: đúng tên (không phân biệt hoa thường) và PIN thì có phiên; sai thì 401', async t => {
  const { reg, login, cookieOf, me } = await setup(t);
  await reg('Cúc');
  let r = await login('cúc', '123456');
  assert.equal(r.status, 200);
  assert.equal(r.body.name, 'Cúc');
  assert.equal((await me(cookieOf(r))).status, 200);
  r = await login('Cúc', '000000');
  assert.deepEqual([r.status, r.body.code], [401, 'bad_credentials']);
  r = await login('Không có', '123456');
  assert.deepEqual([r.status, r.body.code], [401, 'bad_credentials']);
  assert.equal((await me(undefined)).status, 401);
});

test('khóa tạm: sai PIN 5 lần thì khóa, đúng PIN lúc khóa vẫn bị từ chối, hết khóa đăng nhập lại được', async t => {
  const { reg, login, sql } = await setup(t);
  await reg('Dũng');
  for (let i = 0; i < 4; i++) assert.equal((await login('Dũng', '000000')).body.code, 'bad_credentials');
  assert.equal((await login('Dũng', '000000')).body.code, 'bad_credentials');   // lần thứ 5
  let r = await login('Dũng', '123456');
  assert.deepEqual([r.status, r.body.code], [429, 'locked']);
  assert.ok(r.body.retryAfter > 0 && r.body.retryAfter <= 300);
  // hết thời gian khóa (lùi hạn khóa trong DB tạm)
  sql(db => db.prepare('UPDATE accounts SET locked_until = ?').run(Date.now() - 1000));
  assert.equal((await login('Dũng', '123456')).status, 200);
});

test('khóa tạm: nhập đúng giữa chừng thì đếm lại từ đầu', async t => {
  const { reg, login } = await setup(t);
  await reg('Em');
  for (let i = 0; i < 4; i++) await login('Em', '000000');
  assert.equal((await login('Em', '123456')).status, 200);
  for (let i = 0; i < 4; i++) await login('Em', '000000');
  assert.equal((await login('Em', '123456')).status, 200);
});

test('phiên: sống 30 ngày, hết hạn thì bị từ chối; đăng xuất hủy phiên', async t => {
  const { srv, reg, cookieOf, me, sql } = await setup(t);
  const tok = cookieOf(await reg('Giang'));
  assert.equal((await me(tok)).status, 200);
  const { created, expires } = sql(db => db.prepare('SELECT * FROM sessions').get());
  assert.equal(Math.round((expires - created) / 86400_000), 30);
  assert.ok(!sql(db => JSON.stringify(db.prepare('SELECT * FROM sessions').all())).includes(tok));   // chỉ lưu băm

  sql(db => db.prepare('UPDATE sessions SET expires = ?').run(Date.now() - 1));
  assert.equal((await me(tok)).status, 401);

  const t2 = cookieOf(await srv.json('/api/login', { name: 'Giang', pin: '123456' }));
  assert.equal((await me(t2)).status, 200);
  const out = await srv.json('/api/logout', {}, { method: 'POST', headers: { 'content-type': 'application/json', cookie: `nt_session=${t2}` } });
  assert.equal(out.status, 200);
  assert.match(out.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await me(t2)).status, 401);
});

test('quản trị: invite dùng đúng một lần, in n mã', async t => {
  const { srv, reg } = await setup(t);
  const r = await srv.admin('invite', '3');
  const codes = r.out.split('\n');
  assert.equal(codes.length, 3);
  assert.equal(new Set(codes).size, 3);
  assert.equal((await reg('Hà', '123456', codes[0])).status, 200);
  assert.equal((await reg('Hải', '123456', codes[0])).body.code, 'invite_used');
  assert.equal((await reg('Hải', '123456', codes[1].toLowerCase().replace('-', ''))).status, 200);   // gõ thường, thiếu gạch vẫn được
  assert.notEqual((await srv.admin('invite', '0')).code, 0);
});

test('quản trị: reset-pin (PIN tạm hoặc PIN chỉ định) đổi PIN, mở khóa, hủy phiên cũ', async t => {
  const { srv, reg, login, me, cookieOf, sql } = await setup(t);
  const tok = cookieOf(await reg('Khoa', '111111'));
  for (let i = 0; i < 5; i++) await login('Khoa', '000000');
  assert.equal((await login('Khoa', '111111')).body.code, 'locked');

  const r = await srv.admin('reset-pin', 'khoa');
  assert.equal(r.code, 0);
  assert.match(r.out, /^\d{6}$/);
  assert.equal((await me(tok)).status, 401);
  assert.equal((await login('Khoa', '111111')).body.code, 'bad_credentials');
  assert.equal((await login('Khoa', r.out)).status, 200);

  assert.equal((await srv.admin('reset-pin', 'Khoa', '654321')).out, '654321');
  assert.equal((await login('Khoa', '654321')).status, 200);
  assert.notEqual((await srv.admin('reset-pin', 'Khoa', '12')).code, 0);
  assert.notEqual((await srv.admin('reset-pin', 'Ai đó')).code, 0);
  assert.equal(sql(db => db.prepare('SELECT COUNT(*) n FROM accounts').get().n), 1);
});

test('quản trị: delete-account xóa tài khoản, phiên, và tên dùng lại được', async t => {
  const { srv, reg, login, me, cookieOf } = await setup(t);
  const tok = cookieOf(await reg('Lụa'));
  assert.equal((await srv.admin('delete-account', 'lụa')).code, 0);
  assert.equal((await me(tok)).status, 401);
  assert.equal((await login('Lụa', '123456')).status, 401);
  assert.equal((await reg('Lụa', '222222')).status, 200);
  assert.equal((await login('Lụa', '222222')).status, 200);
});
