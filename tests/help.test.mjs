// Seam 1: khách giúp vườn bạn (issue 28, ADR 0012). Thao tác của khách là hàm thuần trong state.js:
// nhận bản lưu chủ, thông tin khách và thao tác, trả kết quả hoặc lý do từ chối. Không có gì ngẫu nhiên,
// nên server và trình duyệt chủ chạy cùng hàm trên cùng bản lưu thì ra cùng kết quả.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startVisit, guestCheck, guestOps, guestOpApply, guestReward, actionsFor, perform, helpLeft, takeGuestLog } from '../public/state.js';
import { setClock, serverDay } from '../public/clock.js';
import { GUEST, EVENT_LEVEL } from '../public/data.js';
import { eventMeta } from '../public/notify.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const T0 = Date.UTC(2026, 9, 2, 3, 0);   // 10h sáng giờ Việt Nam
let clock = T0;
test.beforeEach(() => { clock = T0; setClock(() => clock); });
test.after(() => setClock(null));

const crop = (p, extra = {}) => { p.soil = 'tilled'; p.crop = { id: 'cai', progress: 0.5, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, ...extra }; };

// vườn chủ Lan: ô 0 khô, ô 1 đủ nước, ô 2 có cỏ, ô 3 có sâu, một con quạ đang ăn ô 4
function host() {
  const s = createGame({ name: 'Lan' }); s.tutorial = 99;
  crop(s.plots[0]); s.plots[0].water = 0;
  crop(s.plots[1]); s.plots[1].water = 100;
  crop(s.plots[2]); s.plots[2].water = 50; s.plots[2].weeds = true;
  crop(s.plots[3], { bugs: true }); s.plots[3].water = 50;
  crop(s.plots[4], { progress: 1 });
  s.threats = [{ id: 901, kind: 'crow', plot: 4, x: 10, y: 10, arriveAt: 0, state: 'eating', since: 0 }];
  return s;
}
const guest = { name: 'Bình', level: 3 };
let seq = 0;
const op = (act, extra) => ({ id: `op-${++seq}`, kind: 'help', act, ...extra });

test('giúp tưới: ô khô thì được (ô được tưới, khách có thưởng); ô đã đủ nước thì từ chối "không còn gì để làm"', () => {
  const s = host(), me = createGame({ name: 'Bình' });
  const coins0 = me.coins, exp0 = me.exp;
  const r = guestOpApply(s, guest, op('water', { idx: 0 }));
  assert.equal(r.ok, true);
  assert.equal(s.plots[0].water, 100);
  assert.deepEqual(r.reward, { coins: GUEST.helpCoins, exp: GUEST.helpExp, help: 1 });   // help: đếm cho thành tựu "Hàng xóm tốt bụng" (issue 32)
  guestReward(me, r.reward);
  assert.equal(me.coins, coins0 + GUEST.helpCoins);
  assert.equal(me.exp, exp0 + GUEST.helpExp);
  // ô đã đủ nước: chủ vừa tưới trước, khách không nhận thưởng, không có lỗi
  const r2 = guestOpApply(s, guest, op('water', { idx: 1 }));
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, 'nothing');
  assert.match(r2.msg, /không còn gì để làm/i);
  assert.equal(r2.reward, undefined);
  // tưới lại chính ô vừa tưới (mã khác) cũng không còn gì để làm
  assert.equal(guestOpApply(s, guest, op('water', { idx: 0 })).reason, 'nothing');
});

test('nhổ cỏ, bắt sâu, đuổi quạ kiểm đúng theo trạng thái thật của ô hay của quạ', () => {
  const s = host();
  assert.equal(guestOpApply(s, guest, op('weed', { idx: 0 })).reason, 'nothing');   // ô 0 không có cỏ
  assert.equal(guestOpApply(s, guest, op('weed', { idx: 2 })).ok, true);
  assert.equal(s.plots[2].weeds, false);
  assert.equal(guestOpApply(s, guest, op('weed', { idx: 2 })).reason, 'nothing');

  assert.equal(guestOpApply(s, guest, op('catch', { idx: 0 })).reason, 'nothing');  // ô 0 không có sâu
  assert.equal(guestOpApply(s, guest, op('catch', { idx: 3 })).ok, true);           // bắt sâu giúp không hên xui
  assert.equal(s.plots[3].crop.bugs, false);
  assert.equal(guestOpApply(s, guest, op('catch', { idx: 3 })).reason, 'nothing');

  assert.equal(guestOpApply(s, guest, op('shoo', { crow: 123 })).reason, 'nothing'); // không có con quạ này
  assert.equal(guestOpApply(s, guest, op('shoo', { crow: 901 })).ok, true);
  assert.deepEqual(s.threats, []);
  assert.equal(guestOpApply(s, guest, op('shoo', { crow: 901 })).reason, 'nothing');
  // ô chưa mở, ô trống, thao tác lạ: từ chối
  assert.equal(guestOpApply(s, guest, op('water', { idx: 999 })).reason, 'nothing');
  assert.equal(guestOpApply(s, guest, { id: 'x1', kind: 'help', act: 'dance', idx: 0 }).reason, 'op_invalid');
  assert.equal(guestOpApply(s, guest, { id: 'x2', kind: 'steal', idx: 0 }).reason, 'op_invalid');
});

test('mỗi vườn mỗi ngày ngoài đời chỉ nhận 10 việc giúp; sang ngày mới thì giúp lại được', () => {
  const s = host();
  assert.equal(helpLeft(s), GUEST.helpMax);
  for (let i = 0; i < GUEST.helpMax; i++) {
    s.plots[0].water = 0;
    assert.equal(guestOpApply(s, guest, op('water', { idx: 0 })).ok, true, `việc thứ ${i + 1}`);
    assert.equal(helpLeft(s), GUEST.helpMax - i - 1);
  }
  s.plots[0].water = 0;
  const r = guestOpApply(s, guest, op('water', { idx: 0 }));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'help_full');
  assert.equal(r.msg, 'Vườn này hôm nay đã được giúp đủ');
  assert.equal(s.plots[0].water, 0);
  assert.equal(s.today.day, serverDay(T0));
  assert.equal(s.today.helps, GUEST.helpMax);
  // sang ngày ngoài đời mới (nửa đêm giờ Việt Nam): lại được giúp
  clock = T0 + 24 * 3600_000;
  assert.equal(helpLeft(s), GUEST.helpMax);
  assert.equal(guestOpApply(s, guest, op('water', { idx: 0 })).ok, true);
  assert.equal(s.today.helps, 1);
  assert.equal(s.today.day, serverDay(clock));
});

test('áp dụng hai lần cùng một mã thao tác chỉ tính một lần', () => {
  const s = host();
  const o = op('water', { idx: 0 });
  assert.equal(guestOpApply(s, guest, o).ok, true);
  assert.equal(s.today.helps, 1);
  s.plots[0].water = 0;   // chủ để ô khô lại: thao tác cũ vẫn không chạy lần hai
  const again = guestOpApply(s, guest, o);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'done');
  assert.equal(s.plots[0].water, 0);
  assert.equal(s.today.helps, 1);
  assert.equal(s.guests.filter(g => g.id === o.id).length, 1);
});

test('cảm ơn: nhiều việc cùng loại từ cùng một người có cùng khóa gộp, khác người hay khác việc thì khác khóa', () => {
  const s = host();
  const evs = [];
  for (let i = 0; i < 3; i++) { s.plots[0].water = 0; evs.push(guestOpApply(s, guest, op('water', { idx: 0 })).event); }
  s.plots[2].weeds = true;
  evs.push(guestOpApply(s, guest, op('weed', { idx: 2 })).event);
  s.plots[0].water = 0;
  evs.push(guestOpApply(s, { name: 'Chị Tư', level: 9 }, op('water', { idx: 0 })).event);
  const keys = evs.map(e => eventMeta(e).group);
  assert.equal(new Set(keys.slice(0, 3)).size, 1, 'ba lần tưới của Bình chung một khóa');
  assert.notEqual(keys[3], keys[0]);
  assert.notEqual(keys[4], keys[0]);
  assert.equal(eventMeta(evs[0]).level, 'important');
  assert.equal(eventMeta(evs[0]).cat, 'help');
  // chữ gộp: "Bình đã tưới 3 ô giúp bạn"
  assert.match(EVENT_LEVEL.helped.text(3, evs[0]), /^Bình đã tưới 3 ô giúp bạn/);
});

test('nhật ký khách: việc khách làm lúc chủ vắng chỉ được cảm ơn một lần khi chủ về', () => {
  const s = host();
  guestOpApply(s, guest, op('water', { idx: 0 }));
  s.plots[2].weeds = true;
  guestOpApply(s, guest, op('weed', { idx: 2 }));
  const evs = takeGuestLog(s);
  assert.deepEqual(evs.map(e => [e.type, e.by, e.act]), [['helped', 'Bình', 'water'], ['helped', 'Bình', 'weed']]);
  assert.deepEqual(takeGuestLog(s), []);
  assert.equal(s.guests.length, 2);
  assert.equal(s.guests[0].by, 'Bình');
});

test('trong vườn khách: ô cần giúp hiện đúng nút, làm xong gửi kèm mã thao tác; hết lượt thì nút mờ kèm lý do', () => {
  const raw = JSON.parse(JSON.stringify(host()));
  const me = createGame({ name: 'Bình' }); me.tutorial = 99;
  const v = startVisit(me, raw, 'Lan');
  assert.equal(helpLeft(v), GUEST.helpMax);
  const plot = i => ({ kind: 'plot', idx: i });
  assert.deepEqual(actionsFor(v, plot(0)).map(a => a.id), ['help_water']);
  assert.deepEqual(actionsFor(v, plot(2)).map(a => a.id), ['help_water', 'help_weed']);
  assert.deepEqual(actionsFor(v, plot(3)).map(a => a.id), ['help_water', 'help_catch']);
  assert.deepEqual(actionsFor(v, plot(1)), []);   // ô không cần gì
  assert.deepEqual(actionsFor(v, { kind: 'threat', id: 901 }).map(a => a.id), ['help_shoo']);
  assert.deepEqual(guestOps(v, plot(2)).map(o => o.act), ['water', 'weed']);

  const r = perform(v, plot(0), 'help_water');
  assert.equal(r.ok, true);
  assert.equal(v.plots[0].water, 100);
  assert.equal(r.guestOp.kind, 'help');
  assert.equal(r.guestOp.act, 'water');
  assert.equal(r.guestOp.idx, 0);
  assert.ok(r.guestOp.id?.length >= 8, 'thao tác có mã duy nhất');
  assert.notEqual(perform(v, plot(2), 'help_weed').guestOp.id, r.guestOp.id);
  assert.equal(helpLeft(v), GUEST.helpMax - 2);
  // thưởng vào bản lưu khách do server xác nhận, bản đi dạo không tự cộng
  assert.equal(me.coins, createGame({ name: 'Bình' }).coins);
  // vườn chủ (bản lưu gốc) không đổi: bản đi dạo chỉ là bản sao
  assert.equal(raw.plots[0].water, 0);

  // hết lượt: nút vẫn hiện nhưng mờ kèm lý do, bấm vào chỉ báo lý do
  v.plots[2].weeds = true;
  v.today = { day: serverDay(T0), helps: GUEST.helpMax, steals: 0, stolen: 0 };
  assert.equal(helpLeft(v), 0);
  const acts = actionsFor(v, plot(2));
  assert.ok(acts.length);
  assert.ok(acts.every(a => a.disabled === 'Vườn này hôm nay đã được giúp đủ'));
  assert.equal(guestCheck(v, plot(2), 'help_weed').reason, 'help_full');
  const bad = perform(v, plot(2), 'help_weed');
  assert.equal(bad.ok, false);
  assert.equal(bad.msg, 'Vườn này hôm nay đã được giúp đủ');
  assert.equal(v.plots[2].weeds, true);
  // khách vẫn không làm được việc của chủ
  assert.equal(guestCheck(v, plot(0), 'harvest').reason, 'guest');
  assert.equal(perform(v, plot(4), 'harvest').ok, false);
});
