// Seam 3: quà và sổ lưu bút ở cổng (issue 29). Hàng đợi quà trong SQLite (chủ offline vẫn nhận), sổ lưu bút
// mỗi người mỗi ngày ngoài đời một dòng. Gọi HTTP/WebSocket thật, không mock DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame, takeGifts, basketCap, basketCount } from '../public/state.js';
import { GIFT } from '../public/data.js';
import { setClock } from '../public/clock.js';

async function setup(t) {
  const srv = await bootServer();
  t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const post = (path, body, cookie) => srv.json(path, body, { method: 'POST', headers: { 'content-type': 'application/json', cookie: `nt_session=${cookie}` } });
  const get = (path, cookie) => srv.json(path, undefined, { headers: { cookie: `nt_session=${cookie}` } });
  const player = async (name, mutate) => {
    const invite = (await srv.admin('invite')).out;
    const cookie = cookieOf(await srv.json('/api/register', { name, pin: '123456', invite }));
    const p = {
      name, cookie,
      play: async () => (await post('/api/play', {}, cookie)).body.play,
      gift: (to, item, qty, op) => post('/api/gifts', { to, item, qty, op }, cookie),
      box: async () => (await get('/api/gifts', cookie)).body.gifts,
      take: room => post('/api/gifts/take', { room }, cookie),
      sign: (to, text) => post('/api/guestbook', { to, text }, cookie),
      book: async who => (await get('/api/guestbook' + (who ? '?name=' + encodeURIComponent(who) : ''), cookie)).body.notes,
      news: async () => (await get('/api/gate', cookie)).body,
      farm: async () => (await get('/api/farm', cookie)).body.farm,
    };
    const s = createGame({ name }); s.tutorial = 99; mutate?.(s);
    p.playId = await p.play();
    assert.equal((await post('/api/farm', { play: p.playId, save: s }, cookie)).status, 200);
    return p;
  };
  return { srv, player, post };
}

test('ký sổ lưu bút: dòng rỗng, quá dài, tự ký, ký lần hai trong ngày bị từ chối; đọc sổ mới nhất ở trên', async t => {
  const { player } = await setup(t);
  const a = await player('Lan'), b = await player('Bình'), c = await player('Cúc');
  assert.equal((await b.sign('Lan', '  Vườn   đẹp quá!  ')).status, 200);
  assert.equal((await c.sign('lan', 'Ghé chơi nhé')).status, 200);

  const why = async (r, status, code) => assert.deepEqual([r.status, r.body.code], [status, code]);
  await why(await b.sign('Lan', '   '), 400, 'empty');
  await why(await b.sign('Lan', 'a'.repeat(GIFT.noteMax + 1)), 400, 'too_long');
  await why(await a.sign('Lan', 'tự khen mình'), 400, 'self');
  await why(await b.sign('Lan', 'thêm dòng nữa'), 409, 'already_signed');
  await why(await b.sign('Không Có', 'xin chào'), 404, 'no_such_name');

  const notes = await a.book();
  assert.deepEqual(notes.map(n => [n.from, n.text]), [['Cúc', 'Ghé chơi nhé'], ['Bình', 'Vườn đẹp quá!']], 'mới nhất ở trên, chữ đã gọn khoảng trắng');
  assert.match(notes[0].day, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(Object.keys(notes[0]).sort(), ['day', 'from', 'id', 'text']);
  assert.deepEqual((await b.book('Lan')).map(n => n.from), ['Cúc', 'Bình'], 'khách đọc được sổ của chủ');
});

test('sang ngày ngoài đời mới thì ký lại được', async t => {
  const { player } = await setup(t);
  t.after(() => setClock(null));
  const T = Date.UTC(2026, 4, 10, 3, 0);   // 10h sáng giờ Việt Nam
  setClock(() => T);
  const a = await player('Lan'), b = await player('Bình');
  assert.equal((await b.sign('Lan', 'Hôm nay ghé')).status, 200);
  assert.equal((await b.sign('Lan', 'lần hai')).body.code, 'already_signed');
  setClock(() => T + 24 * 3600_000);
  assert.equal((await b.sign('Lan', 'Mai lại ghé')).status, 200);
  assert.deepEqual((await a.book()).map(n => n.text), ['Mai lại ghé', 'Hôm nay ghé']);
  assert.notEqual((await a.book())[0].day, (await a.book())[1].day);
});

test('tặng quà: vào hàng đợi của chủ, cùng mã thao tác chỉ tính một lần, giới hạn và lý do từ chối', async t => {
  const { srv, player } = await setup(t);
  const a = await player('Lan'), b = await player('Bình');
  assert.equal((await b.gift('Lan', 'seed_cai', 3, 'op1')).status, 200);
  assert.equal((await b.gift('Lan', 'carot', 2, 'op2')).status, 200);
  assert.deepEqual((await a.box()).map(g => [g.from, g.item, g.qty]), [['Bình', 'seed_cai', 3], ['Bình', 'carot', 2]]);

  // cùng op gửi lại: chỉ tính một lần
  const again = await b.gift('Lan', 'seed_cai', 3, 'op1');
  assert.deepEqual([again.status, again.body.dup], [200, true]);
  assert.equal((await a.box()).length, 2);

  const why = async (r, status, code) => assert.deepEqual([r.status, r.body.code], [status, code]);
  await why(await b.gift('Lan', 'cuoc', 1, 'x1'), 400, 'bad_item');
  await why(await b.gift('Lan', 'seed_cai', 0, 'x2'), 400, 'bad_qty');
  await why(await b.gift('Lan', 'seed_cai', GIFT.perGift + 1, 'x3'), 400, 'too_many');
  await why(await b.gift('Bình', 'seed_cai', 1, 'x4'), 400, 'self');
  await why(await b.gift('Không Có', 'seed_cai', 1, 'x5'), 404, 'no_such_name');
  await why(await b.gift('Lan', 'seed_cai', 1, ''), 400, 'bad_op');

  // hộp đầy: không nhận thêm
  for (let i = (await a.box()).length; i < GIFT.boxMax; i++) assert.equal((await b.gift('Lan', 'seed_cai', 1, 'f' + i)).status, 200);
  await why(await b.gift('Lan', 'seed_cai', 1, 'thua'), 400, 'box_full');
  assert.equal((await a.box()).length, GIFT.boxMax);
  assert.equal((await srv.json('/api/gifts', { to: 'Lan', item: 'seed_cai', qty: 1, op: 'z' })).status, 401, 'chưa đăng nhập thì không tặng được');
});

test('quà cho chủ offline nằm trong hàng đợi, còn nguyên khi chủ đăng nhập lại và nhận vào giỏ', async t => {
  const { player } = await setup(t);
  const a = await player('Lan', s => { s.basket = {}; }), b = await player('Bình');
  assert.equal((await b.gift('Lan', 'carot', 4, 'g1')).status, 200);
  assert.equal((await b.gift('Lan', 'seed_cai', 2, 'g2')).status, 200);
  assert.deepEqual(await a.news(), { ok: true, gifts: 2, notes: 0 });

  // chủ đăng nhập lại (phiên chơi mới): hộp quà vẫn còn nguyên
  await a.play();
  const box = await a.box();
  assert.deepEqual(box.map(g => [g.from, g.item, g.qty]), [['Bình', 'carot', 4], ['Bình', 'seed_cai', 2]]);

  // nhận với giỏ chỉ còn 1 chỗ: phần dư ở lại hộp, hạt giống vẫn lấy hết (không tính vào giỏ)
  const r = await a.take(1);
  assert.deepEqual(r.body.taken.map(g => [g.item, g.qty]), [['carot', 1], ['seed_cai', 2]]);
  assert.equal(r.body.left, 1);
  assert.deepEqual((await a.box()).map(g => [g.item, g.qty]), [['carot', 3]]);
  // nhận nốt
  assert.deepEqual((await a.take(99)).body.taken.map(g => [g.item, g.qty]), [['carot', 3]]);
  assert.deepEqual(await a.box(), []);
  assert.deepEqual(await a.news(), { ok: true, gifts: 0, notes: 0 });
  // mã thao tác cũ vẫn bị chặn sau khi chủ nhận hết (không gửi lặp được)
  assert.equal((await b.gift('Lan', 'carot', 4, 'g1')).body.dup, true);
});

test('tin cho chủ đang online: quà và lời nhắn báo qua WebSocket; sổ đọc rồi thì hết "mới"', async t => {
  const { srv, player } = await setup(t);
  const a = await player('Lan'), b = await player('Bình');
  const ws = await srv.ws('/ws', { cookie: a.cookie });
  ws.send({ t: 'hello', play: a.playId });
  assert.equal((await ws.next()).ok, true);
  await b.gift('Lan', 'carot', 2, 'w1');
  assert.deepEqual(await ws.next(), { t: 'gift', name: 'Bình', item: 'carot', qty: 2 });
  await b.sign('Lan', 'Vườn đẹp quá!');
  assert.deepEqual(await ws.next(), { t: 'note', name: 'Bình' });
  assert.deepEqual(await a.news(), { ok: true, gifts: 1, notes: 1 });
  await a.book();
  assert.deepEqual(await a.news(), { ok: true, gifts: 1, notes: 0 });
  ws.close(); await ws.closed;
});

test('luật chia quà của state.js dùng lại được ở trình duyệt chủ: nhận đúng phần server trả', async t => {
  const { player } = await setup(t);
  const a = await player('Lan'), b = await player('Bình');
  await b.gift('Lan', 'carot', 5, 'h1');
  const s = createGame({ name: 'Lan' });
  s.basket = { cai: basketCap(s) - 2 };
  const taken = (await a.take(basketCap(s) - basketCount(s))).body.taken;
  takeGifts(s, taken.map(g => ({ ...g })));
  assert.equal(s.basket.carot, 2);
  assert.equal(basketCount(s), basketCap(s));
  assert.deepEqual((await a.box()).map(g => g.qty), [3]);
});
