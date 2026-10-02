// Seam 3: chơi online ổn định (sau deploy). Rớt mạng rồi nối lại, server khởi động lại trên cùng file SQLite,
// nhiều khách cùng lúc, hai máy cùng tài khoản giành vườn, bản lưu lớn, chạy bù dài. Server thật, HTTP/WS thật.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootServer } from './helpers/server.mjs';
import { createGame, buyStrip, placeEntity, canPlace, buyAnimal, mapOf } from '../public/state.js';
import { GUEST, MAX_CATCHUP_MS, CLUTTER, levelInfo } from '../public/data.js';

const H = 3600_000;
async function setup(t) {
  const srv = await bootServer();
  t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const hdr = cookie => ({ headers: { 'content-type': 'application/json', cookie: `nt_session=${cookie}` } });
  const post = (path, body, cookie) => srv.json(path, body, { method: 'POST', ...hdr(cookie) });
  const get = (path, cookie) => srv.json(path, undefined, hdr(cookie));
  // người chơi có vườn trên server (mutate chỉnh bản lưu đầu tiên)
  const player = async (name, mutate) => {
    const invite = (await srv.admin('invite')).out;
    const cookie = cookieOf(await post('/api/register', { name, pin: '123456', invite }));
    const { play } = (await post('/api/play', {}, cookie)).body;
    const s = createGame({ name }); s.tutorial = 99; mutate?.(s);
    assert.equal((await post('/api/farm', { play, save: s }, cookie)).status, 200);
    return {
      name, cookie, play, save: s,
      ws: () => srv.ws('/ws', { cookie }),
      push: (save, p = play) => post('/api/farm', { play: p, save }, cookie),
      claim: () => post('/api/play', {}, cookie),
      farm: async () => (await get('/api/farm', cookie)).body,
      visit: async n => (await get('/api/visit?name=' + encodeURIComponent(n), cookie)).body,
    };
  };
  return { srv, player, post, get };
}
async function until(ws, t, ms = 3000) {
  for (;;) { const m = await ws.next(ms); if (m.t === t) return m; }
}
// gom hết tin loại `t` tới khi im lặng `ms`
async function drain(ws, t, ms = 400) {
  const got = [];
  for (;;) { let m; try { m = await ws.next(ms); } catch { return got; } if (m.t === t) got.push(m); }
}
const join = async (ws, msg) => { ws.send({ t: 'join', x: 300, y: 300, dir: 0, ...msg }); return until(ws, 'joined'); };
const hello = async (ws, play) => { ws.send({ t: 'hello', play }); return until(ws, 'hello'); };
async function poll(get, pred, ms = 3000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await get();
    if (pred(v)) return v;
    if (Date.now() > end) assert.fail(`chờ quá lâu, giá trị cuối: ${JSON.stringify(v)}`);
    await new Promise(ok => setTimeout(ok, 50));
  }
}
const crop = p => { p.soil = 'tilled'; p.crop = { id: 'cai', progress: 0.3, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } }; };
// mọi ô có cây khô và cỏ: 9 ô x 2 việc = 18 việc giúp
const garden = s => { for (const p of s.plots) { crop(p); p.water = 0; p.weeds = true; } };
const op = (id, act, idx) => ({ id, kind: 'help', act, idx });

// ---------- Rớt WebSocket rồi nối lại ----------

test('khách gửi thao tác rồi rớt mạng trước khi nhận trả lời; nối lại gửi lại cùng mã: chỉ tính một lần', async t => {
  const { player } = await setup(t);
  const A = await player('Lan', garden), B = await player('Bình');
  const a = await A.ws();
  await hello(a, A.play);
  await join(a, { map: 'farm' });   // chủ đang online
  let b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });
  b.send({ t: 'guest', op: op('help-rs01-aaaa', 'water', 0) });
  b.raw.terminate();                 // rớt ngay, không kịp nhận trả lời
  await b.closed;

  b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });
  b.send({ t: 'guest', op: op('help-rs01-aaaa', 'water', 0) });   // trình duyệt gửi lại cùng mã
  const again = await until(b, 'guest');
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'done', 'đã nhận lần đầu rồi: lần gửi lại không tính nữa');
  // chủ chỉ nhận đúng một thao tác
  const pushed = await drain(a, 'guestop');
  assert.deepEqual(pushed.map(m => m.op.id), ['help-rs01-aaaa']);
  // chủ rời đi: server áp dụng hàng đợi đúng một lần
  a.close(); await a.closed;
  const f = await poll(() => B.visit('Lan'), r => r.farm.plots[0].water === 100);
  assert.equal(f.farm.today.helps, 1);
  assert.deepEqual(f.farm.guests.map(g => g.id), ['help-rs01-aaaa']);
});

test('chủ rớt WebSocket một lúc, khách giúp đúng lúc đó: chủ nối lại và gửi bản lưu của máy mình, việc khách giúp không mất', async t => {
  const { player } = await setup(t);
  const A = await player('Lan', garden), B = await player('Bình');
  let a = await A.ws();
  await hello(a, A.play);
  a.raw.terminate();                 // mạng chủ chập chờn: server tưởng chủ đã offline
  await a.closed;
  const b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });
  b.send({ t: 'guest', op: op('help-gap1-aaaa', 'water', 0) });
  assert.equal((await until(b, 'guest')).ok, true);

  // chủ nối lại với cùng phiên chơi rồi gửi bản lưu đang có trên máy (chưa biết việc khách vừa làm)
  a = await A.ws();
  assert.equal((await hello(a, A.play)).ok, true);
  const mine = structuredClone(A.save);
  mine.savedAt = Date.now();
  assert.equal((await A.push(mine)).status, 200);
  const f = (await A.farm()).farm;
  assert.equal(f.plots[0].water, 100, 'ô khách tưới vẫn còn tưới');
  assert.equal(f.today.helps, 1);
  assert.deepEqual(f.guests.map(g => [g.id, g.by]), [['help-gap1-aaaa', 'Bình']]);
  // trình duyệt chủ cũng được báo để áp dụng (bản lưu sau của nó có luôn việc này)
  assert.equal((await until(a, 'guestop')).op.id, 'help-gap1-aaaa');
  // gửi tiếp bản lưu (vẫn chưa có việc đó, vd tin bị lạc): server vẫn giữ, không nhân đôi
  mine.savedAt = Date.now() + 1;
  assert.equal((await A.push(mine)).status, 200);
  const g = (await A.farm()).farm;
  assert.equal(g.today.helps, 1);
  assert.equal(g.guests.length, 1);
});

test('chủ online nhưng tin "khách vừa giúp" bị lạc: bản lưu chủ gửi lên thiếu việc đó thì server vẫn giữ và báo lại', async t => {
  const { player } = await setup(t);
  const A = await player('Lan', garden), B = await player('Bình');
  const a = await A.ws();
  await hello(a, A.play);
  await join(a, { map: 'farm' });
  const b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });
  b.send({ t: 'guest', op: op('help-lost-aaaa', 'weed', 4) });
  assert.equal((await until(b, 'guest')).ok, true);
  await until(a, 'guestop');   // coi như trình duyệt chủ không kịp áp dụng tin này
  const mine = structuredClone(A.save);
  mine.savedAt = Date.now();
  assert.equal((await A.push(mine)).status, 200);
  const f = (await A.farm()).farm;
  assert.equal(f.plots[4].weeds, false);
  assert.deepEqual(f.guests.map(g => g.id), ['help-lost-aaaa']);
  assert.equal((await until(a, 'guestop')).op.id, 'help-lost-aaaa', 'báo lại cho trình duyệt chủ');
  // trình duyệt chủ đã áp dụng (bản lưu có việc đó): không báo hay áp dụng thêm
  f.savedAt = Date.now() + 1;
  assert.equal((await A.push(f)).status, 200);
  await drain(a, 'guestop').then(l => assert.deepEqual(l, []));
  assert.equal((await A.farm()).farm.today.helps, 1);
});

test('trình duyệt gửi lại cùng bản lưu (mất trả lời lần đầu): nhận cả hai, vườn đúng bản đó', async t => {
  const { player } = await setup(t);
  const A = await player('Lan');
  const s = structuredClone(A.save);
  s.coins += 5; s.savedAt = Date.now();
  const [r1, r2] = await Promise.all([A.push(s), A.push(s)]);
  assert.deepEqual([r1.status, r2.status], [200, 200]);
  const f = (await A.farm()).farm;
  assert.equal(f.coins, s.coins);
  assert.deepEqual(f.plots, s.plots);
});

// ---------- Server khởi động lại ----------

test('server khởi động lại trên cùng file SQLite: tài khoản, phiên đăng nhập, phiên chơi, vườn, bạn bè và hàng đợi khách còn nguyên', async t => {
  const { srv, player, post, get } = await setup(t);
  const A = await player('Lan', garden), B = await player('Bình');
  assert.equal((await post('/api/friends', { name: 'Bình' }, A.cookie)).status, 200);
  const a = await A.ws();
  await hello(a, A.play);
  await join(a, { map: 'farm' });
  const b = await B.ws();
  await join(b, { map: 'farm', owner: 'Lan' });
  b.send({ t: 'guest', op: op('help-rb01-aaaa', 'weed', 3) });   // chủ online: thao tác nằm chờ trong hàng đợi
  assert.equal((await until(b, 'guest')).ok, true);
  await until(a, 'guestop');
  const before = (await A.farm()).farm;

  await srv.restart();
  assert.equal(await a.closed, 1001, 'server tắt: kết nối đóng gọn để trình duyệt tự nối lại');

  // phiên đăng nhập (cookie) và phiên chơi vẫn dùng được
  assert.equal((await get('/api/me', A.cookie)).body.name, 'Lan');
  const a2 = await A.ws();
  assert.equal((await hello(a2, A.play)).ok, true);
  assert.deepEqual((await A.farm()).farm, before);
  const next = structuredClone(before);
  next.savedAt = Date.now();
  assert.equal((await A.push(next)).status, 200);
  assert.deepEqual((await get('/api/friends', A.cookie)).body.friends.map(f => f.name), ['Bình']);
  // chủ đăng nhập máy khác sau đó: hàng đợi vẫn còn, việc khách giúp được áp dụng
  a2.close(); await a2.closed;
  const got = (await A.claim()).body.farm;
  assert.equal(got.plots[3].weeds, false);
  assert.deepEqual(got.guests.map(g => g.id), ['help-rb01-aaaa']);
  assert.equal(got.today.helps, 1);
});

// ---------- Nhiều khách cùng lúc ----------

test('8 khách cùng vào làng rồi cùng giúp một vườn: đúng 10 việc được nhận, không mất, không lặp, server vẫn khỏe', async t => {
  const { srv, player } = await setup(t);
  const A = await player('Lan', garden);
  const G = [];
  for (let i = 0; i < 8; i++) G.push(await player('Khách ' + i));
  const a = await A.ws();
  await hello(a, A.play);
  await join(a, { map: 'farm' });
  const socks = await Promise.all(G.map(g => g.ws()));

  // cùng vào làng: ai cũng thấy người vào trước mình, người vào sau thì được báo
  const joined = await Promise.all(socks.map(s => join(s, { map: 'village' })));
  assert.equal(Math.max(...joined.map(j => j.people.length)), 7);
  const enters = await Promise.all(socks.map(s => drain(s, 'enter', 300)));
  joined.forEach((j, i) => assert.equal(j.people.length + enters[i].length, 7, `khách ${i} thấy đủ 7 người kia`));

  // cùng sang vườn Lan, mỗi người gửi 2 việc khác nhau cùng lúc: 16 việc > 10 lượt mỗi ngày
  await Promise.all(socks.map(s => join(s, { map: 'farm', owner: 'Lan' })));
  socks.forEach((s, i) => { s.send({ t: 'guest', op: op(`help-many-w${i}00`, 'water', i) }); s.send({ t: 'guest', op: op(`help-many-g${i}00`, 'weed', i) }); });
  const acks = (await Promise.all(socks.map(async s => [await until(s, 'guest'), await until(s, 'guest')]))).flat();
  const ok = acks.filter(m => m.ok), no = acks.filter(m => !m.ok);
  assert.equal(ok.length, GUEST.helpMax);
  assert.ok(no.every(m => m.reason === 'help_full'), JSON.stringify(no));
  assert.equal(new Set(ok.map(m => m.id)).size, ok.length);
  // chủ online nhận đúng các việc đã được nhận, mỗi việc một lần
  const pushed = await drain(a, 'guestop');
  assert.deepEqual(pushed.map(m => m.op.id).sort(), ok.map(m => m.id).sort());

  // chủ rời đi: hàng đợi áp dụng đúng 10 việc
  a.close(); await a.closed;
  const f = await poll(() => G[0].visit('Lan'), r => r.farm.today.helps === GUEST.helpMax);
  assert.deepEqual(f.farm.guests.map(g => g.id).sort(), ok.map(m => m.id).sort());
  assert.equal((await srv.json('/api/health')).body.ok, true);
});

// ---------- Hai máy cùng tài khoản ----------

test('hai máy mới cùng giành vườn một lúc trong khi máy cũ đang chơi: chỉ một máy giữ quyền ghi, vườn không hỏng', async t => {
  const { srv, post } = await setup(t);
  const invite = (await srv.admin('invite')).out;
  const reg = await srv.json('/api/register', { name: 'Lan', pin: '123456', invite });
  const c0 = /nt_session=([^;]*)/.exec(reg.headers.get('set-cookie'))[1];
  const login = async () => /nt_session=([^;]*)/.exec((await srv.json('/api/login', { name: 'Lan', pin: '123456' })).headers.get('set-cookie'))[1];
  const p0 = (await post('/api/play', {}, c0)).body.play;
  const s = createGame({ name: 'Lan' }); s.tutorial = 99; s.coins = 400;
  assert.equal((await post('/api/farm', { play: p0, save: s }, c0)).status, 200);
  const w0 = await srv.ws('/ws', { cookie: c0 });
  await hello(w0, p0);

  const [c1, c2] = [await login(), await login()];
  const claims = Promise.all([post('/api/play', {}, c1), post('/api/play', {}, c2)]);
  assert.equal((await until(w0, 'kicked')).t, 'kicked');
  const fin = structuredClone(s); fin.coins = 410; fin.savedAt = Date.now();
  assert.equal((await post('/api/farm', { play: p0, save: fin }, c0)).status, 200);   // bản cuối của máy cũ
  const [r1, r2] = await claims;
  assert.deepEqual([r1.status, r2.status], [200, 200]);
  assert.equal(r1.body.farm.coins, 410);
  assert.equal(r2.body.farm.coins, 410);

  // gửi thử bằng cả ba phiên: đúng một phiên được nhận
  const tries = [[c0, p0], [c1, r1.body.play], [c2, r2.body.play]].map(([c, p], i) => {
    const x = structuredClone(fin); x.coins = 420 + i; x.savedAt = Date.now() + i;
    return post('/api/farm', { play: p, save: x }, c);
  });
  const rs = await Promise.all(tries);
  const won = rs.map((r, i) => [r.status, i]).filter(([st]) => st === 200);
  assert.equal(won.length, 1, JSON.stringify(rs.map(r => r.status)));
  assert.ok(rs.every(r => r.status === 200 || r.body.code === 'play_replaced'));
  const f = (await srv.json('/api/farm', undefined, { headers: { cookie: `nt_session=${c1}` } })).body.farm;
  assert.equal(f.coins, 420 + won[0][1]);
  assert.deepEqual(f.plots, fin.plots);
});

// ---------- Bản lưu lớn ----------

// Vườn 64x48 mở hết đất, đầy công trình, nhiều vật nuôi (dựng bằng API công khai của state.js)
// EXP như người chơi thật cấp 15 (EXP khủng thì levelInfo tự chậm, không phải chuyện người chơi gặp)
function bigFarm(s) {
  s.coins = 1e9; s.exp = 0;
  while (levelInfo(s.exp).level < 15) s.exp += 50;
  for (let i = 0; i < 40; i++) for (const d of ['N', 'S', 'E', 'W']) buyStrip(s, d);
  s.farm.ents = s.farm.ents.filter(e => !CLUTTER[e.kind]);   // đất đã dọn hết bụi, đá
  const o = s.farm.owned;
  s.inv.deco_scarecrow = s.inv.deco_flower = s.inv.deco_lamp = s.inv.deco_bench = 999;
  const spot = what => { for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (canPlace(s, what, c, r).ok) return placeEntity(s, what, c, r).ok; return false; };
  for (let i = 0; i < 3; i++) for (const pen of ['pig', 'pasture', 'chicken']) spot({ kind: 'pen', pen });
  for (let i = 0; i < 8; i++) spot({ kind: 'field' });
  const decos = ['deco_flower', 'deco_lamp', 'deco_bench', 'deco_scarecrow'];
  let k = 0;
  for (let r = o.r; r < o.r + o.h; r += 3) for (let c = o.c; c < o.c + o.w; c += 3) if (canPlace(s, { kind: 'deco', item: decos[k % 4] }, c, r).ok) placeEntity(s, { kind: 'deco', item: decos[k++ % 4] }, c, r);
  for (let i = 0; i < 40; i++) for (const t of ['ga', 'vit', 'heo', 'bo', 'cuu']) buyAnimal(s, t, i % 2 ? 'f' : 'm');
  for (const p of s.plots) if (p.unlocked) { crop(p); p.water = 60; }
  mapOf(s);
}

test('bản lưu lớn (vườn mở hết đất, đầy công trình, nhiều vật nuôi): lưu rồi đọc lại đúng, dưới giới hạn 1 MB của server', async t => {
  const { player, srv } = await setup(t);
  const A = await player('Lan', bigFarm);
  const size = JSON.stringify({ play: A.play, save: A.save }).length;
  assert.ok(A.save.animals.length >= 25, `vật nuôi: ${A.save.animals.length}`);
  assert.ok(A.save.plots.filter(p => p.crop).length >= 30, `ô có cây: ${A.save.plots.filter(p => p.crop).length}`);
  assert.ok(size < 1024 * 1024 / 4, `bản lưu ${size} byte: còn xa giới hạn 1 MB`);
  t.diagnostic(`bản lưu lớn: ${size} byte, ${A.save.animals.length} vật nuôi, ${A.save.plots.length} ô, ${A.save.farm.ents.length} công trình`);
  const f = (await A.farm()).farm;
  const { mode, account, ...rest } = f;
  assert.deepEqual([mode, account], ['online', 'Lan']);
  assert.deepEqual(rest, (({ mode, account, ...x }) => x)(A.save));
  // máy khác nhận lại đúng vườn đó
  const got = (await A.claim()).body.farm;
  assert.equal(got.animals.length, A.save.animals.length);
  assert.deepEqual(got.plots, f.plots);
  // quá 1 MB thì server từ chối gọn, vườn cũ còn nguyên
  const huge = structuredClone(f); huge.log = Array.from({ length: 30_000 }, (_, i) => ({ t: i, text: 'x'.repeat(40) })); huge.savedAt = Date.now();
  const r = await srv.json('/api/farm', { play: A.play, save: huge }, { method: 'POST', headers: { 'content-type': 'application/json', cookie: `nt_session=${A.cookie}` } });
  assert.equal(r.status, 413);
  assert.equal((await A.farm()).farm.animals.length, A.save.animals.length);
});

// ---------- Chạy bù dài ----------

test('vườn lớn vắng 3 ngày: khách ghé thì server chạy bù nhanh (vài giây), tối đa 8 giờ, vật nuôi còn đủ', async t => {
  const { player } = await setup(t);
  const A = await player('Lan', s => { bigFarm(s); s.savedAt = Date.now() - 72 * H; });
  const B = await player('Bình');
  const t0 = performance.now();
  const r = await B.visit('Lan');
  const ms = performance.now() - t0;
  t.diagnostic(`chạy bù 3 ngày (vườn lớn): ${Math.round(ms)} ms`);
  assert.ok(ms < 5000, `chạy bù mất ${Math.round(ms)} ms`);
  assert.equal(r.farm.simMs - A.save.simMs, MAX_CATCHUP_MS);
  assert.ok(r.farm.frozenTotal >= 64 * H - 60_000);
  assert.equal(r.farm.animals.length, A.save.animals.length);
  // chủ quay về: nhận ngay, chỉ chạy bù thêm mấy giây vừa trôi chứ không chạy lại cả quãng vắng
  const t1 = performance.now();
  const got = (await A.claim()).body.farm;
  assert.ok(performance.now() - t1 < 2000);
  assert.ok(got.simMs - r.farm.simMs < 60_000, `chạy bù thêm ${got.simMs - r.farm.simMs} ms`);
});
