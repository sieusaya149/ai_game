// Thông báo 3 mức: mọi loại event có mức + khóa gộp, gộp toast, tắt từng loại, chỗ gấp và mũi tên.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../public/state.js';
import { EVENT_LEVEL, NOTIFY_CATS } from '../public/data.js';
import { todoList } from '../public/todo.js';
import { eventMeta, createNotifier, arrowFor, arrowTargets, EVENT_TYPES } from '../public/notify.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e12; return s; };
const LEVELS = ['urgent', 'important', 'info', 'direct', 'none'];

test('mọi loại event luật chơi phát ra đều có mức và khóa gộp', () => {
  // danh sách loại event lấy từ chính mã nguồn state.js
  const src = readFileSync(new URL('../public/state.js', import.meta.url), 'utf8');
  const types = new Set([...src.matchAll(/type: '(\w+)'/g)].map(m => m[1]));
  for (const t of ['toast', 'fx', 'sound', 'spawn', 'log']) types.add(t);   // phát qua hàm tiện ích
  assert.ok(types.size >= 15, 'tìm được danh sách loại event');
  for (const type of types) {
    const m = eventMeta({ type, crop: 'cai', animal: 'Gà', kind: 'crow', who: 'crow', id: 'x', text: 't', name: 'x', level: 2 });
    assert.ok(m, `loại event "${type}" chưa có mức`);
    assert.ok(LEVELS.includes(m.level), `${type}: mức ${m.level}`);
    assert.ok(m.group && typeof m.group === 'string', `${type}: khóa gộp`);
  }
  for (const t of EVENT_TYPES) {
    const e = EVENT_LEVEL[t];
    if (e.level === 'important') {
      assert.ok(e.cat in NOTIFY_CATS, `${t}: cat để tắt được`);
      assert.equal(typeof e.text, 'function', `${t}: có chữ gộp`);
    } else assert.ok(!e.cat, `${t}: chỉ mức quan trọng mới tắt được`);
  }
});

test('event thật khi chạy game đều có mức', () => {
  const s = newGame();
  s.dog.adult = false; s.speed = 1;
  for (const p of s.plots.slice(0, 3)) { p.soil = 'tilled'; p.water = 100; p.crop = { id: 'cai', progress: 0.99, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 }; }
  const seen = new Set(), r = Math.random;
  try {
    for (const [v, n] of [[0.99, 2], [0.0001, 12], [0.5, 30], [0.99, 40]]) {
      Math.random = () => v;
      for (let i = 0; i < n; i++) for (const e of G.tick(s, 10_000)) seen.add(e.type);
    }
  } finally { Math.random = r; }
  assert.ok(seen.has('ripe') && seen.has('eating'), 'chạy thử có phát event');
  for (const t of seen) assert.ok(eventMeta({ type: t }) ?? (() => { throw new Error(`thiếu mức cho ${t}`); })());
});

test('gộp: 5 ô cải chín liền nhau chỉ ra một toast, cách xa ra toast mới', () => {
  const shown = [];
  const push = createNotifier({ show: (id, text) => shown.push({ id, text }) });
  for (let i = 0; i < 5; i++) push({ type: 'ripe', crop: 'cai' }, 1000 + i * 400);
  assert.equal(new Set(shown.map(x => x.id)).size, 1);
  assert.equal(shown.at(-1).text, '5 ô cải xanh đã chín 🌾');
  push({ type: 'ripe', crop: 'cai' }, 20_000);
  assert.equal(new Set(shown.map(x => x.id)).size, 2);
  assert.match(shown.at(-1).text, /^1 ô cải xanh đã chín/);
  push({ type: 'ripe', crop: 'lua' }, 20_100);   // khác loại cây thì khác khóa
  assert.equal(new Set(shown.map(x => x.id)).size, 3);
});

test('mức thông tin, gấp, thẳng không thành toast gộp', () => {
  const shown = [];
  const push = createNotifier({ show: (id, text) => shown.push(text) });
  for (const e of [{ type: 'egg' }, { type: 'shipped', coins: 5 }, { type: 'sick', animal: 'Gà' }, { type: 'toast', text: 'x' }, { type: 'fx' }]) assert.equal(push(e, 0), false);
  assert.deepEqual(shown, []);
});

test('tắt từng loại: ripe tắt thì không hiện, loại khác vẫn hiện; mức gấp không tắt được', () => {
  const s = newGame();
  assert.equal(G.setNotify(s, 'ripe', false), true);
  assert.equal(G.notifyOn(s, 'ripe'), false);
  assert.equal(G.notifyOn(s, 'order'), true);
  assert.equal(G.setNotify(s, 'sick', false), false, 'gấp không có công tắc');
  assert.equal(G.setNotify(s, 'urgent', false), false);
  assert.deepEqual(s.notify, { ripe: false });
  const shown = [];
  const push = createNotifier({ show: (id, t) => shown.push(t), on: c => G.notifyOn(s, c) });
  push({ type: 'ripe', crop: 'cai' }, 0);
  push({ type: 'order' }, 0);
  assert.equal(shown.length, 1);
  assert.match(shown[0], /đơn hàng/);
  G.setNotify(s, 'ripe', true);
  assert.deepEqual(s.notify, {});
});

test('cài đặt thông báo được lưu và đọc lại; khóa lạ bị bỏ', () => {
  const s = newGame();
  G.setNotify(s, 'levelup', false);
  s.notify.bogus = false;
  G.saveGame(s);
  const back = G.loadGame();
  assert.deepEqual(back.notify, { levelup: false });
  delete store[G.SAVE_KEY];
  const old = newGame(); delete old.notify; G.saveGame(old);
  assert.deepEqual(G.loadGame().notify, {}, 'bản lưu cũ chưa có: bật hết');
});

test('urgentSpots: quạ đang ăn và con vật bệnh; ở bản đồ khác mũi tên chỉ về cổng/cửa về vườn', () => {
  const s = newGame();
  assert.deepEqual(G.urgentSpots(s), []);
  s.plots[0].crop = { id: 'cai', progress: 1 };
  s.threats = [{ id: 7, kind: 'crow', plot: 0, x: 0, y: 0, arriveAt: 0, state: 'coming', since: 0 }];
  assert.deepEqual(G.urgentSpots(s), [], 'mới bay tới thì chưa gấp');
  s.threats[0].state = 'eating';
  s.animals[0].sick = true;
  const spots = G.urgentSpots(s), c = G.mapOf(s).plotCenter(0);
  assert.equal(spots.length, 2);
  assert.deepEqual([spots[0].x, spots[0].y], [c.x, c.y]);
  assert.equal(spots[1].key, 'sick:' + s.animals[0].id);
  const urgent = todoList(s).filter(i => i.level === 'urgent');
  assert.deepEqual(arrowTargets(s, urgent).map(t => [t.x, t.y]).sort(), spots.map(p => [p.x, p.y]).sort());
  G.enterScene(s, 'village');
  const t = arrowTargets(s, urgent), door = G.sceneMap(s).doors.find(d => d.to === 'farm');
  assert.equal(t.length, 1);
  assert.deepEqual([t[0].x, t[0].y], [door.x + door.w / 2, door.y + door.h / 2]);
  assert.deepEqual(arrowTargets(s, []), []);
});

test('arrowFor: trong khung thì không có; ngoài khung thì nằm sát mép, góc hướng về điểm đó', () => {
  const box = { l: 0, t: 100, r: 400, b: 700 };
  assert.equal(arrowFor({ x: 200, y: 400 }, box), null);
  const right = arrowFor({ x: 2000, y: 400 }, box, 20);
  assert.equal(right.x, 380); assert.equal(Math.round(right.y), 400); assert.ok(Math.abs(right.ang) < 1e-9);
  const up = arrowFor({ x: 200, y: -500 }, box, 20);
  assert.equal(up.y, 120); assert.ok(Math.abs(up.ang + Math.PI / 2) < 1e-9);
  const corner = arrowFor({ x: 1000, y: 1500 }, box, 20);
  assert.ok(corner.x <= 380 && corner.y <= 680 && corner.x >= 20 && corner.y >= 120);
  assert.ok(Math.abs(corner.ang - Math.atan2(1100, 800)) < 1e-9);
});
