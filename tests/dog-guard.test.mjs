// Seam 1: chó Mực canh khách lạ (issue 31, DESIGN §6.1, ADR 0012, 0013).
// Luật bán kính, ngủ gật, xích/thả, bị đớp và xúc xích đều là hàm thuần trong state.js: server kiểm tra
// và trình duyệt chủ áp dụng bằng chính các hàm này. Phần ngẫu nhiên quay bằng hạt giống cố định
// (mã thao tác với xúc xích, Math.random thay được trong test với giấc ngủ gật).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, startVisit, tick, actionsFor, perform, takeGuestLog,
  guestOpApply, guestReward, guardRadius, guardArea, dogAsleep, dogQuiet, dogSees,
  walkSpeed, chaseSpeed, setChained, barkOp, biteOp, keepLoot, mapOf, urgentSpots,
} from '../public/state.js';
import { todoList } from '../public/todo.js';
import { setClock, serverDay } from '../public/clock.js';
import { GUARD, GUEST, CROPS, DAY_MS, NIGHT_FROM, EVENT_LEVEL } from '../public/data.js';
import { TS } from '../public/layout.js';
import { eventMeta } from '../public/notify.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const T0 = Date.UTC(2026, 9, 2, 3, 0);   // 10h sáng giờ Việt Nam
let clock = T0;
test.beforeEach(() => { clock = T0; setClock(() => clock); });
test.after(() => setClock(null));

const LV5 = 500;
const ripe = (p, id = 'bap') => {
  p.soil = 'tilled'; p.water = 100;
  p.crop = { id, progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
};

// Vườn chủ Lan cấp 5, chó Mực trưởng thành no và vui, ô 0..5 bắp đã chín
function host(mutate) {
  const s = createGame({ name: 'Lan' }); s.tutorial = 99; s.exp = LV5;
  Object.assign(s.dog, { adult: true, hunger: 100, happy: 100, chained: false });
  for (let i = 0; i <= 5; i++) ripe(s.plots[i]);
  mutate?.(s);
  return s;
}
const guest = (name = 'Bình') => { const me = createGame({ name }); me.tutorial = 99; me.exp = LV5; return me; };
const who = (name, { level = 5, room = 30, sausage = 0 } = {}) => ({ name, level, room, sausage });
let seq = 0;
const op = (kind, act, extra) => ({ id: `op-${++seq}`, kind, act, at: clock, ...extra });
// Chỗ đứng cách chó `n` ô về phía đông
const away = (s, n) => ({ x: s.dog.x + n * TS, y: s.dog.y });

test('bán kính phát hiện: chó con 4 ô, chó trưởng thành 6 ô; vui dưới 50 còn một nửa; đói dưới 30 thì không canh', () => {
  const s = host();
  assert.equal(guardRadius(s), GUARD.radius.adult);
  assert.equal(dogSees(s, away(s, 5)), true);
  assert.equal(dogSees(s, away(s, 7)), false, 'ngoài 6 ô thì không thấy');

  s.dog.adult = false;
  assert.equal(guardRadius(s), GUARD.radius.pup);
  assert.equal(dogSees(s, away(s, 3)), true);
  assert.equal(dogSees(s, away(s, 5)), false, 'chó con chỉ thấy trong 4 ô');

  // vui dưới 50: bán kính còn một nửa
  s.dog.adult = true; s.dog.happy = 20;
  assert.equal(guardRadius(s), GUARD.radius.adult / 2);
  assert.equal(dogSees(s, away(s, 2)), true);
  assert.equal(dogSees(s, away(s, 5)), false);

  // đói dưới 30: nằm bẹp, không canh nữa dù khách đứng ngay cạnh
  s.dog.happy = 100; s.dog.hunger = 10;
  assert.equal(guardRadius(s), 0);
  assert.equal(dogSees(s, { x: s.dog.x, y: s.dog.y }), false);
});

test('chó ngủ gật chỉ thấy khách sát bên 1 ô; chó bị xích chỉ canh trong 3 ô quanh chuồng', () => {
  const s = host(h => { h.time = Math.ceil(NIGHT_FROM * DAY_MS) + 1000; h.dog.nap = h.time + 10_000; h.dog.napCheck = h.time + 10_000; });
  assert.equal(dogAsleep(s), true);
  assert.equal(guardRadius(s), GUARD.napRadius);
  assert.equal(dogSees(s, away(s, 1)), true, 'khách đứng sát bên thì chó vẫn giật mình');
  assert.equal(dogSees(s, away(s, 3)), false);

  // xích chó: vùng canh là 3 ô quanh chuồng, không theo chỗ chó đang đứng
  const c = host();
  assert.equal(guardArea(c), null, 'thả rông thì chạy khắp vườn');
  assert.equal(setChained(c, true).ok, true);
  assert.equal(c.dog.chained, true);
  const home = mapOf(c).dogHome;
  assert.deepEqual(guardArea(c), { x: home.x, y: home.y, r: GUARD.chainRadius * TS });
  assert.equal(guardRadius(c), GUARD.chainRadius);
  assert.equal(dogSees(c, { x: home.x + 2 * TS, y: home.y }), true);
  assert.equal(dogSees(c, { x: home.x + 5 * TS, y: home.y }), false, 'ngoài 3 ô quanh chuồng thì xích không với tới');
  // chó đi lạc xa chuồng vẫn chỉ canh quanh chuồng
  c.dog.x = home.x + 5 * TS;
  assert.equal(dogSees(c, { x: c.dog.x, y: c.dog.y }), false);
  assert.equal(setChained(c, false).ok, true);
  assert.equal(dogSees(c, { x: c.dog.x, y: c.dog.y }), true);
});

test('chó ngủ gật khoảng 30% thời gian ban đêm, ban ngày thì không', () => {
  // hạt giống cố định: thay Math.random bằng bộ sinh số có hạt, chạy lại cho cùng kết quả
  const seeded = seed => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const real = Math.random;
  const night = Math.ceil(NIGHT_FROM * DAY_MS) + 1000;
  const DAYS = 40, SECS = 240;   // 40 đêm, mỗi đêm theo dõi 240 giây đầu
  const run = from => {
    const s = host();
    let nap = 0;
    Math.random = seeded(20261002);
    try {
      for (let d = 0; d < DAYS; d++) {
        s.time = d * DAY_MS + from;
        for (let k = 0; k < SECS; k++) { tick(s, 1000); if (dogAsleep(s)) nap++; }
      }
    } finally { Math.random = real; }
    return nap / (DAYS * SECS);
  };
  const atNight = run(night);
  assert.ok(Math.abs(atNight - GUARD.napRate) < 0.08, `ban đêm ngủ gật ${Math.round(atNight * 100)}% thời gian (mong đợi ~30%)`);
  assert.equal(run(DAY_MS * 0.3), 0, 'ban ngày chó tỉnh như sáo');
});

test('tốc độ chó đuổi bằng 1.3 lần tốc độ đi bộ', () => {
  assert.equal(chaseSpeed(), walkSpeed() * GUARD.chaseMul);
  assert.ok(chaseSpeed() > walkSpeed());
});

test('bị đớp: khách rơi hết đồ vừa trộm, nộp phạt cho chủ, ghi nhật ký, chuỗi trộm về 0; cùng mã chỉ tính một lần', () => {
  const s = host(), me = guest();
  const r = guestOpApply(s, who('Bình'), op('steal', 'crop', { idx: 0 }));
  assert.equal(r.ok, true);
  guestReward(me, r.reward);
  assert.equal(me.basket.bap, r.reward.items.bap);
  assert.equal(me.stats.robStreak, 1, 'trộm trót lọt thì chuỗi tăng (issue 32 dùng)');

  const coins0 = me.coins, hostCoins0 = s.coins, stolen0 = s.plots[0].crop.stolen;
  const bite = op('bite', 'bite', { loot: { bap: r.reward.items.bap } });
  const b = guestOpApply(s, who('Bình'), bite);
  assert.equal(b.ok, true);
  assert.equal(s.coins, hostCoins0 + GUARD.fine, 'chủ vườn được tiền phạt');
  assert.equal(s.plots[0].crop.stolen, stolen0, 'chủ không mất thêm gì');
  assert.equal(s.stats.chased, 1, 'nhật ký chó: đã đuổi được 1 người');

  guestReward(me, b.reward);
  assert.equal(me.basket.bap, undefined, 'rơi hết đồ vừa trộm');
  assert.equal(me.coins, coins0 - GUARD.fine);
  assert.equal(me.stats.robStreak, 0, 'bị đớp thì chuỗi "trộm không bị đớp" về 0');

  const evs = takeGuestLog(s);
  assert.deepEqual(evs.map(e => [e.type, e.by]), [['stolen', 'Bình'], ['bitten', 'Bình']]);
  assert.equal(evs[1].fine, GUARD.fine);
  assert.equal(eventMeta(evs[1]).label, 'Chó đớp được khách lạ');
  assert.ok(s.log.some(l => /Bình bị Mực đớp/.test(l.text)), 'nhật ký vườn có dòng "Bình bị Mực đớp"');

  // áp dụng lại cùng mã thao tác: không tính thêm lần nào
  const again = guestOpApply(s, who('Bình'), bite);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'done');
  assert.equal(s.coins, hostCoins0 + GUARD.fine);
  assert.equal(s.stats.chased, 1);
});

test('vườn không có chó thì không ai bị đớp; chó đói dưới 30 cũng không đớp', () => {
  const s = host(h => { h.dog.hunger = 5; });
  const r = guestOpApply(s, who('Bình'), op('bite', 'bite', { loot: {} }));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'no_guard');
  assert.equal(s.stats.chased, 0);
});

test('xúc xích: chó no dưới 50 chắc chắn ăn và im lặng 60 giây, hết giờ thì canh lại', () => {
  const s = host(h => { h.dog.hunger = 40; });
  const spot = away(s, 2);
  assert.equal(dogSees(s, spot), true);
  const r = guestOpApply(s, who('Bình', { sausage: 1 }), op('sausage', 'sausage'));
  assert.equal(r.ok, true);
  assert.equal(r.ate, true);
  assert.deepEqual(r.reward.lose, { sausage: 1 });
  assert.equal(dogQuiet(s, clock), true);
  assert.equal(dogSees(s, spot, clock), false, 'chó mải ăn thì không phát hiện ai');
  assert.equal(dogSees(s, spot, clock + GUARD.quietMs - 500), false);
  assert.equal(dogQuiet(s, clock + GUARD.quietMs + 1), false);
  assert.equal(dogSees(s, spot, clock + GUARD.quietMs + 1), true, 'hết 60 giây chó canh lại');

  // không có xúc xích trong giỏ thì ném gì
  assert.equal(guestOpApply(s, who('Bình', { sausage: 0 }), op('sausage', 'sausage')).reason, 'no_item');
});

test('chó đang no vẫn tham ăn khoảng 30%, quay theo mã thao tác nên server và chủ ra cùng kết quả', () => {
  const s = host();   // hunger 100
  let ate = 0;
  const N = 400;
  for (let i = 0; i < N; i++) {
    const o = { id: `xx-${i}`, kind: 'sausage', act: 'sausage', at: clock };
    const r = guestOpApply(s, who('Bình', { sausage: 1 }), o);
    assert.equal(r.ok, true);
    if (r.ate) ate++;
    s.dog.quiet = 0;   // thử mã kế tiếp từ đầu
  }
  const rate = ate / N;
  assert.ok(Math.abs(rate - GUARD.sausageGreed) < 0.08, `chó no tham ăn ${Math.round(rate * 100)}% (mong đợi ~30%)`);

  // cùng một mã thao tác: hai nơi quay ra cùng kết quả
  const two = host();
  const o = { id: 'cung-ma', kind: 'sausage', act: 'sausage', at: clock };
  assert.equal(guestOpApply(host(), who('Bình', { sausage: 1 }), o).ate, guestOpApply(two, who('Bình', { sausage: 1 }), o).ate);
});

test('chó sủa: chủ nhận sự kiện kèm hướng và mũi tên báo gấp, nhật ký ghi một dòng', () => {
  const s = host();
  const m = mapOf(s), spot = { x: m.view.x1 - 20, y: m.view.y0 + 20 };
  const r = guestOpApply(s, who('Bình'), op('bark', 'bark', { x: Math.round(spot.x), y: Math.round(spot.y) }));
  assert.equal(r.ok, true);
  assert.equal(r.event.type, 'barked');
  assert.equal(r.event.dog, 'Mực');
  assert.match(r.event.where, /phía/, 'sự kiện kèm hướng để chủ biết chạy về đâu');
  assert.equal(eventMeta(r.event).level, 'urgent');
  assert.match(EVENT_LEVEL.barked.text(1, r.event), /Mực đang sủa ở phía/);
  assert.equal(s.stats.barks, 1);

  // chỗ gấp 🔴 (cơ chế mũi tên issue 13) chỉ sáng một lúc rồi tắt
  const spots = urgentSpots(s);
  assert.ok(spots.some(p => p.kind === 'bark'), 'có chỗ gấp để mũi tên chỉ tới');
  // mũi tên và bản đồ nhỏ lấy chỗ từ todoList: một việc gấp "chó đang sủa" đúng chỗ chó thấy khách
  const job = todoList(s).find(i => i.kind === 'bark');
  assert.ok(job, 'bảng Việc cần làm có dòng chó đang sủa');
  assert.equal(job.level, 'urgent');
  assert.deepEqual([job.x, job.y], [s.dog.barkX, s.dog.barkY]);
  clock += GUARD.barkShowMs + 1000;
  assert.equal(urgentSpots(s).some(p => p.kind === 'bark'), false);
  assert.equal(todoList(s).some(i => i.kind === 'bark'), false);

  // sủa dồn dập thì chỉ ghi một dòng nhật ký (khỏi spam)
  clock = T0 + 1000;
  const again = guestOpApply(s, who('Bình'), op('bark', 'bark', { x: 10, y: 10 }));
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'barking');
  assert.equal(s.stats.barks, 1);
});


test('trong vườn khách: chó phát hiện thì gửi thao tác sủa, bị đớp thì gửi thao tác đớp và đứng hình 3 giây', () => {
  const raw = JSON.parse(JSON.stringify(host()));
  const me = guest();
  const v = startVisit(me, raw, 'Lan');
  // khách trộm một ô (server xác nhận thì đồ mới vào giỏ và mới tính là "đồ vừa trộm") rồi bị chó thấy
  const done = perform(v, { kind: 'plot', idx: 0 }, 'steal');
  assert.equal(done.ok, true);
  keepLoot(v, { bap: 1 });
  Object.assign(v.player, { x: v.dog.x + 2 * TS, y: v.dog.y });
  assert.equal(dogSees(v, v.player), true);

  const bark = barkOp(v);
  assert.equal(bark.guestOp.kind, 'bark');
  assert.ok(bark.guestOp.id.length >= 8);
  assert.equal(bark.guestOp.x, Math.round(v.player.x));

  const bite = biteOp(v);
  assert.equal(bite.guestOp.kind, 'bite');
  assert.deepEqual(bite.guestOp.loot, { bap: 1 }, 'đồ vừa trộm trong lượt thăm này');
  assert.equal(bite.stunMs, GUARD.biteStunMs);
  assert.equal(biteOp(v), null, 'đã bị đớp rồi thì thôi');
  assert.equal(raw.plots[0].crop.stolen, undefined, 'vườn chủ thật không bị bản đi dạo đụng tới');
});

test('thao tác chó trong bản đi dạo không đụng vào xu, thống kê hay nhật ký của chính khách', () => {
  // bản đi dạo dùng chung xu, stats và log với bản lưu khách, nên phần ghi sổ của chủ vườn
  // (tiền phạt, số người đã đuổi, dòng nhật ký) phải để server và trình duyệt chủ làm
  const me = guest();
  me.inv.sausage = 1;
  const v = startVisit(me, JSON.parse(JSON.stringify(host())), 'Lan');
  const coins0 = me.coins, logs0 = me.log.length;
  Object.assign(v.player, { x: v.dog.x + 2 * TS, y: v.dog.y });
  barkOp(v);
  keepLoot(v, { bap: 1 }); give2(me, 'bap', 1);
  biteOp(v);
  perform(v, { kind: 'dog' }, 'sausage');
  assert.equal(me.coins, coins0, 'tiền phạt là của chủ vườn, khách chỉ mất khi server xác nhận');
  assert.equal(me.stats.chased, 0);
  assert.equal(me.stats.barks, 0);
  assert.equal(me.log.length, logs0);
  assert.equal(me.basket.bap, 1, 'đồ chỉ rơi khi server xác nhận');
});
const give2 = (s, k, n) => { s.basket[k] = (s.basket[k] || 0) + n; };

test('trong vườn khách: nút Ném xúc xích ở con chó, hết xúc xích thì mờ', () => {
  const raw = JSON.parse(JSON.stringify(host()));
  const me = guest();
  me.inv.sausage = 1;
  const v = startVisit(me, raw, 'Lan');
  const t = { kind: 'dog' };
  const acts = actionsFor(v, t);
  const sa = acts.find(a => a.id === 'sausage');
  assert.ok(sa, 'khách thấy nút ném xúc xích');
  assert.match(sa.label, /Ném xúc xích/);
  assert.equal(sa.disabled, undefined);
  const r = perform(v, t, 'sausage');
  assert.equal(r.ok, true);
  assert.equal(r.guestOp.kind, 'sausage');
  assert.equal(dogQuiet(v, clock), r.ate);

  // khúc xúc xích chỉ mất khi server xác nhận, như mọi thao tác khách khác
  assert.equal(me.inv.sausage, 1);
  guestReward(me, { lose: { sausage: 1 } });
  const none = actionsFor(v, t).find(a => a.id === 'sausage');
  assert.match(none.disabled, /xúc xích/i, 'hết xúc xích thì nút mờ kèm lý do');
  assert.ok(CROPS.bap && GUEST.stealLv === 5 && serverDay(clock));
});
