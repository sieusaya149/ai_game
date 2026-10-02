// Issue 32: vắng nhà, thông báo và thành tựu xã hội (seam 1). Việc khách làm cho chủ vườn: mức thông báo, gộp,
// thành tựu "Hàng xóm tốt bụng", "Siêu trộm", "Vườn bất khả xâm phạm" và báo cáo "Trong lúc bạn vắng nhà…".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../public/state.js';
import { EVENT_LEVEL, NOTIFY_CATS, ACHIEVEMENTS } from '../public/data.js';
import { eventMeta, createNotifier } from '../public/notify.js';
import { todoList } from '../public/todo.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const LV5 = 500, LEVELS = ['urgent', 'important', 'info', 'direct', 'none'];
const crop = (id, progress) => ({ id, progress, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 });
// Vườn chủ: ô 0 bắp chín, ô 1 cà rốt khô, ô 2 cà rốt có cỏ; chó trưởng thành no và vui (canh được khách)
function host(name = 'Lan') {
  const s = G.createGame({ name });
  s.exp = LV5; s.orders = []; s.nextOrderAt = 1e12;
  Object.assign(s.plots[0], { soil: 'tilled', water: 100, crop: crop('bap', 1) });
  Object.assign(s.plots[1], { soil: 'tilled', water: 0, crop: crop('carot', 0.4) });
  Object.assign(s.plots[2], { soil: 'tilled', water: 100, weeds: true, crop: crop('carot', 0.4) });
  Object.assign(s.dog, { stage: 'truong', age: G.stageStart('cho', 'truong'), hunger: 100, happy: 100, chained: false, nap: 0, napCheck: 1e15 });
  return s;
}
const guest = (name = 'Bình') => ({ name, level: 6, room: 50, sausage: 0 });
let seq = 0;
const op = (kind, act, extra) => ({ id: `op-${kind}-${++seq}-xxxx`, kind, act, at: Date.now(), ...extra });
const apply = (h, o, who = guest()) => { const r = G.guestOpApply(h, who, o); assert.equal(r.ok, true, r.msg); return r; };
const drain = s => G.tick(s, 0);   // event luật vừa phát (thành tựu) mà chưa qua nhịp tick nào

test('mọi loại sự kiện xã hội mới đều có mức và khóa gộp; 🟡 thì tắt được trong cài đặt', () => {
  // loại event lấy từ mã nguồn (luật chơi + tin server main.js dựng lại), cộng các loại xã hội phải có
  const src = ['state.js', 'main.js'].map(f => readFileSync(new URL('../public/' + f, import.meta.url), 'utf8')).join('\n');
  const types = new Set([...src.matchAll(/type: '(\w+)'/g)].map(m => m[1]));
  assert.ok(types.has('visited'), 'main.js dựng event "visited" từ tin ghé thăm của server');
  for (const t of ['visited', 'helped', 'stolen', 'gift', 'note', 'barked', 'bitten', 'sausaged', 'achievement']) types.add(t);
  for (const type of types) {
    const e = { type, by: 'Bình', act: 'water', item: 'bap', qty: 2, at: 0, name: 'Bình', dog: 'Mực', where: 'phía Đông vườn', id: 'x', crop: 'cai', animal: 'Gà', kind: 'crow', who: 'crow', text: 't', level: 2 };
    const m = eventMeta(e);
    assert.ok(m, `loại event "${type}" chưa có mức`);
    assert.ok(LEVELS.includes(m.level), `${type}: mức ${m.level}`);
    assert.ok(m.group && typeof m.group === 'string', `${type}: khóa gộp`);
    if (m.level === 'important') {
      assert.ok(m.cat in NOTIFY_CATS, `${type}: có loại để tắt trong cài đặt`);
      assert.equal(typeof EVENT_LEVEL[type].text(1, e), 'string');
    }
  }
});

test('trộm và chó sủa là 🔴; ghé thăm, cảm ơn, quà, lời nhắn là 🟡; hai việc giúp liên tiếp của một người gộp một thông báo', () => {
  const lv = type => eventMeta({ type, by: 'Bình', act: 'water' }).level;
  assert.equal(lv('stolen'), 'urgent');
  assert.equal(lv('barked'), 'urgent');
  for (const t of ['visited', 'helped', 'gift', 'note']) assert.equal(lv(t), 'important', t);
  // khóa gộp theo người và loại việc
  assert.notEqual(eventMeta({ type: 'helped', by: 'Bình', act: 'water' }).group, eventMeta({ type: 'helped', by: 'Chi', act: 'water' }).group);
  assert.notEqual(eventMeta({ type: 'visited', by: 'Bình' }).group, eventMeta({ type: 'visited', by: 'Chi' }).group);

  // Bình tưới giúp hai ô liền nhau: chủ nhận đúng một thông báo cảm ơn
  const h = host();
  Object.assign(h.plots[3], { soil: 'tilled', water: 0, crop: crop('carot', 0.4) });
  apply(h, op('help', 'water', { idx: 1 }));
  apply(h, op('help', 'water', { idx: 3 }));
  const shown = [], push = createNotifier({ show: (id, text) => shown.push({ id, text }) });
  const evs = G.takeGuestLog(h);
  assert.deepEqual(evs.map(e => e.type), ['helped', 'helped']);
  evs.forEach((e, i) => push(e, 1000 + i * 500));
  assert.equal(new Set(shown.map(x => x.id)).size, 1);
  assert.equal(shown.at(-1).text, 'Bình đã tưới 2 ô giúp bạn 🙏');

  // trộm: báo gấp kèm chỗ bị trộm (mũi tên chỉ hướng), không phải toast; không có công tắc tắt
  apply(h, op('steal', 'crop', { idx: 0 }));
  assert.equal(push(G.takeGuestLog(h)[0], 9000), false);
  const spot = G.urgentSpots(h).find(p => p.key === 'rob');
  assert.ok(spot, 'có chỗ gấp "đang bị trộm"');
  assert.deepEqual({ x: spot.x, y: spot.y }, G.mapOf(h).plotCenter(0));
  assert.match(spot.text, /Bình/);
  assert.deepEqual(todoList(h).find(i => i.kind === 'rob')?.target, { kind: 'plot', idx: 0 }, 'việc gấp: đi tới chỗ bị trộm');
  assert.equal(G.setNotify(h, 'stolen', false), false);

  // tắt 🟡 "bạn bè ghé" thì không còn toast ghé thăm, các loại khác vẫn hiện
  assert.equal(G.setNotify(h, 'visit', false), true);
  const on = createNotifier({ show: () => {}, on: cat => G.notifyOn(h, cat) });
  assert.equal(on({ type: 'visited', by: 'Chi' }, 0), false);
  assert.equal(on({ type: 'gift', name: 'Chi', item: 'hat_cai', qty: 1 }, 0), true);
});

test('"Hàng xóm tốt bụng" mở ở lần giúp thứ 50, không mở ở 49', () => {
  const a = ACHIEVEMENTS.find(x => x.name === 'Hàng xóm tốt bụng');
  assert.ok(a && a.goal === 50);
  assert.equal(ACHIEVEMENTS.filter(x => x.name === a.name).length, 1, 'tên thành tựu không trùng');
  const reward = apply(host(), op('help', 'water', { idx: 1 })).reward;   // phần thưởng server trả cho khách
  const me = G.createGame({ name: 'Bình' });
  drain(me);
  for (let i = 0; i < 49; i++) G.guestReward(me, reward);
  assert.equal(me.stats[a.stat], 49);
  assert.ok(!me.achievements[a.id]);
  assert.deepEqual(drain(me).filter(e => e.type === 'achievement'), []);
  G.guestReward(me, reward);
  assert.equal(me.achievements[a.id], true);
  const ev = drain(me).find(e => e.type === 'achievement');
  assert.equal(ev?.name, 'Hàng xóm tốt bụng');
});

test('"Siêu trộm": 30 vụ liền không bị đớp; bị đớp ở vụ thứ 20 thì đếm lại từ 0', () => {
  const a = ACHIEVEMENTS.find(x => x.name === 'Siêu trộm');
  assert.ok(a && a.goal === 30);
  const h = host();
  const steal = apply(h, op('steal', 'crop', { idx: 0 })).reward;
  const bite = apply(h, op('bite', 'bite', { loot: { bap: 2 } })).reward;
  const me = G.createGame({ name: 'Bình' });
  for (let i = 0; i < 20; i++) G.guestReward(me, steal);
  G.guestReward(me, bite);   // vụ thứ 20 bị chó đớp
  assert.equal(me.stats[a.stat], 0);
  for (let i = 0; i < 29; i++) G.guestReward(me, steal);
  assert.ok(!me.achievements[a.id], '29 vụ sau khi bị đớp chưa đủ');
  G.guestReward(me, steal);
  assert.equal(me.achievements[a.id], true);
  assert.ok(drain(me).some(e => e.type === 'achievement' && e.id === a.id));
  // chưa bị đớp lần nào: đúng vụ thứ 30 thì mở
  const you = G.createGame({ name: 'Chi' });
  for (let i = 0; i < 29; i++) G.guestReward(you, steal);
  assert.ok(!you.achievements[a.id]);
  G.guestReward(you, steal);
  assert.equal(you.achievements[a.id], true);
});

test('"Vườn bất khả xâm phạm" mở khi chó đuổi được người thứ 20', () => {
  const a = ACHIEVEMENTS.find(x => x.name === 'Vườn bất khả xâm phạm');
  assert.ok(a && a.goal === 20);
  const h = host();
  for (let i = 0; i < 19; i++) apply(h, op('bite', 'bite', { loot: {} }), guest('Kẻ ' + i));
  G.tick(h, 1000);
  assert.ok(!h.achievements[a.id]);
  apply(h, op('bite', 'bite', { loot: {} }), guest('Kẻ 19'));
  const evs = G.tick(h, 1000);
  assert.equal(h.achievements[a.id], true);
  assert.ok(evs.some(e => e.type === 'achievement' && e.id === a.id));
});

test('báo cáo vắng nhà gộp đúng việc giúp, vụ trộm (và món), quà, số người chó đuổi; không có thì không in mục đó', () => {
  const h = host();
  Object.assign(h.plots[3], { soil: 'tilled', water: 0, crop: crop('carot', 0.4) });
  apply(h, op('help', 'water', { idx: 1 }));
  apply(h, op('help', 'weed', { idx: 2 }));
  const r = apply(h, op('steal', 'crop', { idx: 0 }));
  apply(h, op('bite', 'bite', { loot: r.reward.items }));
  apply(h, op('help', 'water', { idx: 3 }), guest('Chi'));
  const qty = r.reward.items.bap;
  // bản lưu đi qua server (chủ vắng) rồi về trình duyệt chủ: nhật ký khách nằm nguyên trong bản lưu
  const s = G.loadGame(JSON.parse(JSON.stringify(h)));
  const got = G.awayGuests(s, { gifts: 1, notes: 0 });
  const by = k => got.filter(g => g.kind === k).map(g => g.text);
  assert.deepEqual(by('help'), ['Bình đã giúp 2 việc (tưới 1 ô, nhổ cỏ 1 ô)', 'Chi đã giúp 1 việc (tưới 1 ô)']);
  assert.deepEqual(by('steal'), [`Bình đã trộm ${qty} bắp`]);
  assert.deepEqual(by('gift'), ['1 phần quà mới trong hộp quà ở cổng']);
  assert.deepEqual(by('note'), []);
  assert.deepEqual(by('chase'), ['Mực đã đuổi được 1 người']);
  assert.deepEqual([...new Set(got.map(g => g.kind))], ['help', 'steal', 'gift', 'chase']);
  assert.ok(got.every(g => g.icon), 'mỗi mục có biểu tượng');
  // lời nhắn mới thì có mục sổ lưu bút
  assert.deepEqual(G.awayGuests(s, { notes: 2 }).filter(g => g.kind === 'note').map(g => g.text), ['2 lời nhắn mới trong sổ lưu bút']);
  // khách đã được báo rồi (chủ đang online lúc đó) thì không in lại
  G.takeGuestLog(s);
  assert.deepEqual(G.awayGuests(s, {}), []);
  assert.deepEqual(G.awayGuests(G.createGame({ name: 'An' })), []);
});
