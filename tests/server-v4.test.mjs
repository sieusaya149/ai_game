// Seam 3: bản lưu v4 (issue 50) đi qua server. Dòng vườn v3 do server Phase 2 ghi trong SQLite lên v4 khi chủ đăng nhập
// hoặc khách ghé, không mất gì; bản v4 mới của cùng vườn qua được checkSaveJump; trình duyệt cũ còn gửi v3 vẫn nhận.
// Dựng dòng cũ bằng cách ghi thẳng file SQLite như server cũ để lại (dữ liệu ghi sẵn, không đụng code server).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { bootServer } from './helpers/server.mjs';
import { createGame } from '../public/state.js';
import { migrate } from '../public/migrate.js';
import { setClock } from '../public/clock.js';
import { CROPS, starOf } from '../public/data.js';

const H = 3600_000, T = Date.now();
const rnd = Math.random;
const v3 = ago => {
  const s = JSON.parse(readFileSync(new URL('./fixtures/v3-farm.json', import.meta.url), 'utf8'));
  return Object.assign(s, { mode: 'online', account: 'Lan', savedAt: T - ago });
};
async function setup(t) {
  setClock(() => T);
  Math.random = () => 0.99;   // sâu, bệnh cố định
  t.after(() => { setClock(); Math.random = rnd; });
  const srv = await bootServer();
  t.after(srv.close);
  const cookieOf = r => /nt_session=([^;]*)/.exec(r.headers.get('set-cookie') ?? '')?.[1];
  const post = (path, body, c) => srv.json(path, body, { method: 'POST', headers: { 'content-type': 'application/json', cookie: `nt_session=${c}` } });
  const user = async name => {
    const invite = (await srv.admin('invite')).out;
    const cookie = cookieOf(await srv.json('/api/register', { name, pin: '123456', invite }));
    return { play: () => post('/api/play', {}, cookie), save: (play, save) => post('/api/farm', { play, save }, cookie), visit: n => srv.json('/api/visit?name=' + n, undefined, { headers: { cookie: `nt_session=${cookie}` } }) };
  };
  // chủ vườn có dòng vườn bản v3 trong DB (như server Phase 2 để lại)
  const ownerV3 = async (old) => {
    const u = await user('Lan');
    assert.equal((await u.save((await u.play()).body.play, createGame({ name: 'Lan' }))).status, 200);
    const db = new DatabaseSync(srv.dbPath);
    db.prepare("UPDATE farms SET save = ?, saved_at = ? WHERE account_id = (SELECT id FROM accounts WHERE name = 'Lan')").run(JSON.stringify(old), old.savedAt);
    assert.equal(JSON.parse(db.prepare('SELECT save FROM farms').get().save).v, 3, 'trong DB đang là bản v3');
    db.close();
    return u;
  };
  return { srv, user, ownerV3 };
}
// vườn v4 nhận được giữ đủ mọi thứ của bản v3
function kept(f, old) {
  assert.equal(f.v, 4);
  for (const o of old.plots.filter(p => p.crop)) {
    const c = f.plots[o.idx].crop;
    assert.equal(c?.id, o.crop.id, `ô ${o.idx} còn cây`);
    assert.ok(c.progress >= o.crop.progress, `ô ${o.idx} không lùi tiến độ`);
    assert.deepEqual(Object.keys(c.q).sort(), ['bugMax', 'dry', 'hand']);   // chạy bù lâu thì đất có thể khô hẳn (mất sao, issue 52)
    assert.equal(c.q.hand, false);
  }
  for (const [k, n] of Object.entries(old.basket)) assert.equal(f.basket[k], n, `giỏ ${k}`);
  for (const [k, n] of Object.entries(old.inv)) if (CROPS[k]) assert.equal(f.inv[k], n, `kho ${k}`);
  assert.ok(Object.keys({ ...f.basket, ...f.inv }).filter(k => CROPS[k]).every(k => starOf(k) === 1), 'nông sản cũ là ★1');
  assert.deepEqual(f.orders.slice(0, old.orders.length), old.orders, 'đơn hàng cũ còn nguyên (chạy bù có thể thêm đơn mới)');
  assert.deepEqual(f.animals.map(a => [a.id, a.type, a.name]), old.animals.map(a => [a.id, a.type, a.name]));
  assert.equal(f.farm.ents.find(e => e.kind === 'well').lv, 1);
  assert.deepEqual(f.mastery.cai, { lv: 1, n: 0 });
  assert.equal(Object.keys(f.mastery).length, 16);
  assert.deepEqual(f.water, { level: 0, pump: 0, power: 0 });
  assert.equal(f.stats.harvests, old.stats.harvests);
}

test('chủ đăng nhập lại: dòng vườn v3 trong DB lên v4 ngay lúc nhận phiên chơi, cây và đồ còn nguyên', async t => {
  const { ownerV3 } = await setup(t);
  const old = v3(2 * H), u = await ownerV3(old);
  const r = await u.play();
  assert.equal(r.status, 200);
  kept(r.body.farm, old);
  assert.equal(r.body.farm.simMs - old.simMs, 2 * H, 'chạy bù đủ 2 giờ');
});

test('khách ghé lúc chủ vắng: vườn v3 lên v4, chạy bù và lưu lại; chủ về thấy đúng như vậy', async t => {
  const { user, ownerV3 } = await setup(t);
  const old = v3(30 * 60_000), u = await ownerV3(old);
  const seen = (await (await user('Bình')).visit('Lan')).body.farm;
  kept(seen, old);
  const mine = (await u.play()).body.farm;
  assert.equal(mine.v, 4);
  assert.deepEqual(mine.plots, seen.plots);
});

test('bản v4 của cùng vườn gửi sau bản v3 được nhận; trình duyệt cũ còn gửi v3 thì server lưu thành v4', async t => {
  const { user } = await setup(t);
  const u = await user('Lan'), play = (await u.play()).body.play;
  const old = v3(0);
  old.savedAt = T;
  assert.equal((await u.save(play, old)).status, 200, 'bản v3 từ trình duyệt chưa tải lại');
  const stored = (await u.play()).body;
  assert.equal(stored.farm.v, 4);
  // trình duyệt đã tải bản mới: gửi v4 (đã chuyển từ chính bản đó) vài giây sau
  const next = migrate(old);
  next.simMs += 5000; next.savedAt = T + 5000;
  assert.equal((await u.save(stored.play, next)).status, 200);
});
