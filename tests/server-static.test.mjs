import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { bootServer } from './helpers/server.mjs';

// index.html được gắn ?v=<mtime> vào style.css / main.js (phá cache CDN); bỏ đi thì phải trùng file gốc
const unbust = s => s.replace(/[?]v=[0-9a-z]+"/g, '"');
const pub = f => readFileSync(new URL(`../public/${f}`, import.meta.url));
// Gửi đường dẫn thô (fetch tự chuẩn hóa `..`, trình duyệt cũng vậy, kẻ xấu thì không)
const raw = (url, path) => new Promise((ok, no) => {
  const u = new URL(url);
  http.get({ host: u.hostname, port: u.port, path }, res => {
    let body = '';
    res.on('data', d => body += d).on('end', () => ok({ status: res.statusCode, body }));
  }).on('error', no);
});

test('file tĩnh: trả đúng nội dung và kiểu MIME', async t => {
  const srv = await bootServer();
  t.after(srv.close);
  for (const [f, type] of [['state.js', 'text/javascript'], ['style.css', 'text/css'], ['index.html', 'text/html']]) {
    const res = await srv.get('/' + f);
    assert.equal(res.status, 200, f);
    assert.match(res.headers.get('content-type'), new RegExp('^' + type), f);
    const got = Buffer.from(await res.arrayBuffer());
    assert.deepEqual(f === 'index.html' ? Buffer.from(unbust(got.toString())) : got, pub(f), f);
  }
});

test('file tĩnh: `/` là index.html và không bị cache, file khác hỏi lại bằng ETag', async t => {
  const srv = await bootServer();
  t.after(srv.close);
  const home = await srv.get('/');
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.equal(unbust(html), pub('index.html').toString());
  assert.match(html, /href="style[.]css[?]v=[0-9a-z]+"/);
  assert.match(html, /src="main[.]js[?]v=[0-9a-z]+"/);
  assert.match(home.headers.get('cache-control'), /no-store/);

  const js = await srv.get('/main.js');
  const tag = js.headers.get('etag');
  assert.ok(tag);
  assert.match(js.headers.get('cache-control'), /no-cache/);
  const again = await srv.get('/main.js', { headers: { 'if-none-match': tag } });
  assert.equal(again.status, 304);
});

test('file tĩnh: file không có trả 404, HEAD không kèm thân', async t => {
  const srv = await bootServer();
  t.after(srv.close);
  assert.equal((await srv.get('/khong-co.js')).status, 404);
  const h = await srv.get('/state.js', { method: 'HEAD' });
  assert.equal(h.status, 200);
  assert.equal(await h.text(), '');
});

test('file tĩnh: đường dẫn cố thoát ra ngoài public/ bị từ chối', async t => {
  const srv = await bootServer();
  t.after(srv.close);
  const secret = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
  for (const p of ['/../package.json', '/..%2fpackage.json', '/%2e%2e/package.json', '/..\\package.json', '/x/../../package.json', '/%00']) {
    const res = await raw(srv.url, p);
    assert.ok(res.status === 403 || res.status === 404, `${p} → ${res.status}`);
    assert.notEqual(res.body, secret, p);
  }
});
