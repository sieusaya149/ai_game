// Seam 1: khách trộm vườn bạn (issue 30, ADR 0012). Như việc giúp, luật trộm là hàm thuần trong state.js:
// nhận bản lưu chủ, thông tin khách ({ name, level, room }) và thao tác, trả kết quả hoặc lý do từ chối.
// Lát này chưa có chó canh (issue 31): trộm cứ thành công trong giới hạn.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, startVisit, guestCheck, guestOps, guestOpApply, guestReward, actionsFor, perform,
  takeGuestLog, stealsToday, stolenToday, robsToday, stealLeft, ripeValue, tick, raidTonight,
} from '../public/state.js';
import { setClock, serverDay } from '../public/clock.js';
import { GUEST, STAMINA, CROPS, PRODUCTS, RAID, starKey, sellPrice } from '../public/data.js';
import { eventMeta } from '../public/notify.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const T0 = Date.UTC(2026, 9, 2, 3, 0);   // 10h sáng giờ Việt Nam
let clock = T0;
test.beforeEach(() => { clock = T0; setClock(() => clock); });
test.after(() => setClock(null));

const LV5 = 500;   // đủ kinh nghiệm để lên cấp 5 (cấp tối thiểu để trộm và để bị trộm)
const BAP2 = starKey('bap', 2);   // ô 0 bón phân, không khô, không sâu: bắp ★2 (issue 52)
const ripe = (p, id = 'bap', fert = false) => {
  p.soil = 'tilled'; p.water = 100;
  p.crop = { id, progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
};

// Vườn chủ Lan cấp 5: ô 0 bắp đã bón phân (9 bắp), ô 1..5 bắp thường (6 bắp mỗi ô)
function host(mutate) {
  const s = createGame({ name: 'Lan' }); s.tutorial = 99; s.exp = LV5;
  ripe(s.plots[0], 'bap', true);
  for (let i = 1; i <= 5; i++) ripe(s.plots[i], 'bap');
  mutate?.(s);
  return s;
}
const who = (name, level = 5, room = 30) => ({ name, level, room });
let seq = 0;
const op = (act, extra) => ({ id: `steal-${++seq}`, kind: 'steal', act, ...extra });

test('trộm một ô chín chỉ lấy tối đa 25% sản lượng; người khác vẫn trộm được ô đó, chính mình thì không', () => {
  const s = host();
  const full = 9;   // bắp yield 6, bón phân +50%
  const take = Math.floor(full * GUEST.stealPct);
  assert.equal(take, 2);
  const r = guestOpApply(s, who('Bình'), op('crop', { idx: 0 }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.reward.items, { [BAP2]: take });
  assert.equal(s.plots[0].crop.stolen, take, 'ô mất đúng phần bị trộm, phần lớn vẫn còn của chủ');
  assert.match(actionsFor(s, { kind: 'plot', idx: 0 })[0].label, new RegExp(`\\(${full - take}\\)`), 'chủ thu hoạch phần còn lại');

  // chính Bình trộm lần hai cùng ô: bị từ chối
  const again = guestOpApply(s, who('Bình'), op('crop', { idx: 0 }));
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'robbed');
  assert.match(again.msg, /một lần rồi/i);
  assert.equal(s.plots[0].crop.stolen, take);

  // người khác trộm cùng ô: còn được (chưa chạm trần mỗi ngày của vườn)
  const r2 = guestOpApply(s, who('Chị Tư', 9), op('crop', { idx: 0 }));
  assert.equal(r2.ok, true);
  assert.equal(r2.reward.items[BAP2], Math.floor((full - take) * GUEST.stealPct));
  assert.equal(s.today.steals, 2);
  assert.equal(s.today.stolen, (take + r2.reward.items[BAP2]) * sellPrice(BAP2));
});

test('cả vườn mỗi ngày ngoài đời mất tối đa 30% giá trị đồ chín; sang ngày mới thì trộm lại được', () => {
  // một ô cà chua chín: 5 trái × 18 xu = 90 xu, trần mỗi ngày 27 xu nên chỉ chịu được một vụ
  const s = createGame({ name: 'Lan' }); s.tutorial = 99; s.exp = LV5;
  ripe(s.plots[0], 'cachua');
  assert.equal(ripeValue(s), 5 * CROPS.cachua.price);
  assert.equal(stealLeft(s), Math.floor(ripeValue(s) * GUEST.dayPct));

  const r = guestOpApply(s, who('Bình'), op('crop', { idx: 0 }));
  assert.equal(r.ok, true);
  assert.equal(stolenToday(s), CROPS.cachua.price);
  const r2 = guestOpApply(s, who('Chị Tư', 9), op('crop', { idx: 0 }));
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, 'day_full');
  assert.match(r2.msg, /hôm nay/i);
  assert.equal(s.today.steals, 1);

  // sang ngày ngoài đời mới (nửa đêm giờ Việt Nam): trần tính lại
  clock = T0 + 24 * 3600_000;
  assert.equal(stolenToday(s), 0);
  assert.equal(stealsToday(s), 0);
  const r3 = guestOpApply(s, who('Chị Tư', 9), op('crop', { idx: 0 }));
  assert.equal(r3.ok, true);
  assert.equal(s.today.day, serverDay(clock));
  assert.equal(s.today.steals, 1);
});

test('bảo vệ người mới: vườn dưới cấp 5 không bị trộm, khách dưới cấp 5 không trộm được', () => {
  const small = host(s => { s.exp = 0; });
  const r = guestOpApply(small, who('Bình'), op('crop', { idx: 0 }));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'host_new');
  assert.equal(r.msg, 'Vườn này còn quá nhỏ để trộm');
  assert.equal(small.plots[0].crop.stolen, undefined);

  const s = host();
  const r2 = guestOpApply(s, who('Bé Tí', 4), op('crop', { idx: 0 }));
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, 'guest_new');
  assert.match(r2.msg, new RegExp(`cấp ${GUEST.stealLv}`));
  assert.equal(s.today.steals, 0);
});

test('trộm trứng dưới đất và sữa, lông đang chờ lấy thì được; con vật, trái khổng lồ, đồ trong kho / nhà, cá thì không', () => {
  const s = host(h => {
    for (const i of [6, 7, 8]) ripe(h.plots[i], 'bapcai');   // đồ chín đủ giá trị để một ngày trộm được cả sữa, lông (giới hạn 30% giá trị đồ chín)
    h.eggs = [{ id: 501, x: 10, y: 10, at: 0 }];
    h.animals = [
      { id: 601, type: 'bo', adult: true, ready: true, hunger: 80, happy: 80, sick: false, age: 0, x: 0, y: 0, nextProduct: 0, starvingSince: 0 },
      { id: 602, type: 'cuu', adult: true, ready: true, hunger: 80, happy: 80, sick: false, age: 0, x: 0, y: 0, nextProduct: 0, starvingSince: 0 },
      { id: 603, type: 'ga', adult: true, ready: false, hunger: 80, happy: 80, sick: false, age: 0, x: 0, y: 0, nextProduct: 0, starvingSince: 0 },
    ];
  });
  const e = guestOpApply(s, who('Bình'), op('egg', { egg: 501 }));
  assert.equal(e.ok, true);
  assert.deepEqual(e.reward.items, { trung: 1 });
  assert.deepEqual(s.eggs, []);
  assert.equal(guestOpApply(s, who('Bình'), op('egg', { egg: 501 })).reason, 'nothing');

  const m = guestOpApply(s, who('Bình'), op('product', { animal: 601 }));
  assert.equal(m.ok, true);
  assert.deepEqual(m.reward.items, { sua: 1 });
  assert.equal(s.animals[0].ready, false);
  const w = guestOpApply(s, who('Chị Tư', 9), op('product', { animal: 602 }));
  assert.deepEqual(w.reward.items, { len: 1 });
  // con gà chưa có gì để lấy
  assert.equal(guestOpApply(s, who('Bình'), op('product', { animal: 603 })).reason, 'nothing');

  // những thứ luật không cho trộm: mỗi thứ một lý do rõ ràng
  for (const [act, re] of [['animal', /con vật/i], ['giant', /khổng lồ/i], ['store', /kho/i], ['fish', /cá/i]]) {
    const r = guestOpApply(s, who('Bình'), op(act, { idx: 0 }));
    assert.equal(r.ok, false, act);
    assert.equal(r.reason, 'cant_steal', act);
    assert.match(r.msg, re, act);
  }
  assert.equal(guestOpApply(s, who('Bình'), { id: 'x1', kind: 'steal', act: 'dance', idx: 0 }).reason, 'op_invalid');
});

test('giỏ đầy thì không trộm thêm; trộm trừ thể lực theo bảng', () => {
  const s = host();
  const r = guestOpApply(s, who('Bình', 5, 1), op('crop', { idx: 0 }));   // lấy 2 bắp mà giỏ chỉ còn 1 chỗ
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'full');
  assert.match(r.msg, /Giỏ đầy/);
  assert.equal(guestOpApply(s, who('Bình', 5, 0), op('crop', { idx: 1 })).reason, 'full');

  // thể lực trừ lúc khách bấm trộm trong vườn chủ (cùng cơ chế thể lực Phase 0)
  const me = createGame({ name: 'Bình' }); me.tutorial = 99; me.exp = LV5;
  const v = startVisit(me, JSON.parse(JSON.stringify(host())), 'Lan');
  const st0 = me.stamina;
  const done = perform(v, { kind: 'plot', idx: 0 }, 'steal');
  assert.equal(done.ok, true);
  assert.equal(me.stamina, st0 - STAMINA.cost.steal);
});

test('đêm đã có người chơi sang trộm thì Thằng Tèo không tới; đêm không có thì vẫn tới như cũ', () => {
  const rand = Math.random;
  const nightRun = steals => {
    const s = host(h => {
      h.time = 0.8 * 20 * 60_000;   // ban đêm
      h.today = { day: serverDay(T0), helps: 0, steals, stolen: 0 };
    });
    try { Math.random = () => 0.0001; tick(s, 60_000); } finally { Math.random = rand; }
    // trộm NPC chốt mỗi đêm đúng một vụ (issue 46); tick 60 giây có khi Tèo đã hái xong và chuồn rồi
    return raidTonight(s)?.kind === 'thief';
  };
  assert.equal(nightRun(0), true, 'đêm chưa ai trộm: Thằng Tèo vẫn lẻn vào');
  assert.equal(nightRun(1), false, 'đêm đã có người sang trộm: Tèo nhường');
  assert.ok(RAID.nightly > 0);
});

test('nhật ký vườn: mỗi vụ trộm ghi người trộm, món gì, bao nhiêu, mấy giờ; chủ chỉ được báo một lần', () => {
  const s = host();
  guestOpApply(s, who('Bình'), op('crop', { idx: 0 }));
  guestOpApply(s, who('Chị Tư', 9), op('crop', { idx: 1 }));
  const evs = takeGuestLog(s);
  assert.deepEqual(evs.map(e => [e.type, e.by, e.item, e.qty]), [['stolen', 'Bình', BAP2, 2], ['stolen', 'Chị Tư', 'bap', 1]]);
  assert.ok(evs.every(e => Number.isFinite(e.at)));
  assert.deepEqual(takeGuestLog(s), []);
  // thông báo gấp 🔴 và câu nhật ký có tên, số lượng, giờ
  const m = eventMeta(evs[0]);
  assert.equal(m.level, 'urgent');
  assert.match(m.label, /trộm/i);
  // dòng nhật ký giữ cấp của kẻ trộm để biết có sang trộm lại được không
  assert.deepEqual(s.guests.map(g => [g.kind, g.by, g.lv, g.item, g.qty]), [['steal', 'Chị Tư', 9, 'bap', 1], ['steal', 'Bình', 5, BAP2, 2]]);
});

test('trong vườn khách: ô chín hiện nút Trộm kèm số lấy được và số còn lại; trộm xong gửi kèm mã thao tác', () => {
  const raw = JSON.parse(JSON.stringify(host(h => { h.eggs = [{ id: 501, x: 10, y: 10, at: 0 }]; })));
  const me = createGame({ name: 'Bình' }); me.tutorial = 99; me.exp = LV5;
  const v = startVisit(me, raw, 'Lan');
  const plot0 = { kind: 'plot', idx: 0 };
  const acts = actionsFor(v, plot0);
  assert.deepEqual(acts.map(a => a.id), ['steal']);
  assert.match(acts[0].label, /😈 Trộm 2 bắp/);
  assert.match(acts[0].label, /còn 7/);
  assert.deepEqual(guestOps(v, plot0).map(o => [o.kind, o.act]), [['steal', 'crop']]);
  assert.deepEqual(actionsFor(v, { kind: 'egg', id: 501 }).map(a => a.id), ['steal']);

  const r = perform(v, plot0, 'steal');
  assert.equal(r.ok, true);
  assert.equal(r.guestOp.kind, 'steal');
  assert.equal(r.guestOp.act, 'crop');
  assert.equal(r.guestOp.idx, 0);
  assert.ok(r.guestOp.id?.length >= 8);
  assert.equal(v.plots[0].crop.stolen, 2, 'bản đi dạo đổi ngay cho khách thấy');
  assert.equal(raw.plots[0].crop.stolen, undefined, 'vườn chủ thật không đụng tới');
  assert.equal(me.basket.bap, undefined, 'đồ chỉ vào giỏ khi server xác nhận');

  // server xác nhận: đồ vào giỏ, số vụ chính mình đi trộm hôm nay tăng (khác với số vụ vườn mình bị trộm)
  guestReward(me, r.guestOp && { items: { bap: 2 }, steal: 1 });
  assert.equal(me.basket.bap, 2);
  assert.equal(robsToday(me), 1);
  assert.equal(stealsToday(me), 0);

  // trộm lần hai cùng ô: nút mờ kèm lý do, bấm vào chỉ báo lý do
  const again = actionsFor(v, plot0);
  assert.equal(again[0].disabled, guestCheck(v, plot0, 'steal').msg);
  assert.equal(guestCheck(v, plot0, 'steal').reason, 'robbed');
  assert.equal(perform(v, plot0, 'steal').ok, false);
  assert.equal(v.plots[0].crop.stolen, 2);
});

test('vườn chủ dưới cấp 5: khách vẫn thấy nút Trộm nhưng mờ kèm lý do', () => {
  const raw = JSON.parse(JSON.stringify(host(h => { h.exp = 0; })));
  const me = createGame({ name: 'Bình' }); me.tutorial = 99; me.exp = LV5;
  const v = startVisit(me, raw, 'Lan');
  const plot0 = { kind: 'plot', idx: 0 };
  const acts = actionsFor(v, plot0);
  assert.deepEqual(acts.map(a => a.id), ['steal']);
  assert.equal(acts[0].disabled, 'Vườn này còn quá nhỏ để trộm');
  const r = perform(v, plot0, 'steal');
  assert.equal(r.ok, false);
  assert.equal(r.msg, 'Vườn này còn quá nhỏ để trộm');
  assert.equal(v.plots[0].crop.stolen, undefined);
  assert.equal(me.stamina, createGame({ name: 'Bình' }).stamina, 'bị chặn thì không tốn thể lực');
});

test('khách dưới cấp 5 đứng trong vườn cấp cao: nút Trộm mờ kèm lý do', () => {
  const raw = JSON.parse(JSON.stringify(host()));
  const me = createGame({ name: 'Bé Tí' }); me.tutorial = 99;
  const v = startVisit(me, raw, 'Lan');
  const acts = actionsFor(v, { kind: 'plot', idx: 0 });
  assert.equal(acts[0].id, 'steal');
  assert.match(acts[0].disabled, new RegExp(`cấp ${GUEST.stealLv}`));
  assert.ok(PRODUCTS.sua);
});
