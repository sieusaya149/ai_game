// Nhiệm vụ làm quen của Cô Út: mua con heo đầu tiên thì mở chuỗi tắm → chữa bệnh → vắc-xin (issue 48).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { CO_UT_QUEST, levelInfo } from '../public/data.js';

const MIN = 60_000, HOUR = 60 * MIN;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

// Vườn sạch, chủ đủ cấp mua heo (ANIMALS.heo.lv = 3), chợ đang mở
const game = (lv = 3, coins = 100000) => {
  const s = G.createGame({ name: 'Chủ trại' });
  s.coins = coins; s.exp = 0; s.orders = []; s.nextOrderAt = 1e15; s.animals = [];
  s.time = 12 * HOUR; s.day = 1;
  s.farm.owned = { c: 10, r: 8, w: 50, h: 38 }; s.farm.rev++;
  while (levelInfo(s.exp).level < lv) s.exp += 50;
  return s;
};
const pigPen = (s, c = 50, r = 10) => { const r2 = G.placeEntity(s, { kind: 'pen', pen: 'pig' }, c, r); assert.equal(r2.ok, true, r2.msg); return r2.id; };

test('chưa mua heo thì chưa có nhiệm vụ; mua con heo đầu tiên mở bước tắm', () => {
  const s = game();
  assert.equal(G.coUtQuestInfo(s), null);
  pigPen(s);
  const r = G.buyAnimal(s, 'heo');
  assert.equal(r.ok, true, r.msg);
  assert.deepEqual(G.coUtQuestInfo(s), { step: 0, total: CO_UT_QUEST.length, id: 'bathe', done: false });
});

test('mua thêm con heo thứ hai không mở lại, không làm lùi tiến độ đang có', () => {
  const s = game();
  pigPen(s);
  G.buyAnimal(s, 'heo');
  assert.equal(G.skipCoUtQuest(s).ok, true);   // sang bước 'cure'
  const before = G.coUtQuestInfo(s);
  const r = G.buyAnimal(s, 'heo');
  assert.equal(r.ok, true, r.msg);
  assert.deepEqual(G.coUtQuestInfo(s), before, 'mua thêm heo không chạy lại nhiệm vụ');
});

test('mua con vật khác (không phải heo) thì không mở nhiệm vụ', () => {
  const s = game(1);   // vườn mới đã có sẵn chuồng gà
  const r = G.buyAnimal(s, 'ga');
  assert.equal(r.ok, true, r.msg);
  assert.equal(G.coUtQuestInfo(s), null);
});

test('đi đúng thứ tự: tắm → chữa bệnh → vắc-xin; làm trước lượt thì không tính; xong cả 3 thì done', () => {
  const s = game();
  pigPen(s);
  G.buyAnimal(s, 'heo');
  const a = s.animals[0];
  assert.equal(G.coUtQuestInfo(s).id, 'bathe');

  // chữa bệnh trước khi tới lượt: không tính (bước đang mở vẫn là 'bathe')
  s.inv.medicine = 5;
  Object.assign(a, { sick: 1, sickMs: 0, dose: 0 });
  assert.equal(G.giveMedicine(s, a.id).cured, true);
  assert.equal(a.sick, 0);
  assert.equal(G.coUtQuestInfo(s).id, 'bathe', 'chữa trước lượt không tính vào nhiệm vụ');

  // bước 1: tắm
  s.inv.soap = 1; s.can = 1; a.dirty = 80;
  assert.equal(G.perform(s, { kind: 'animal', id: a.id }, 'bath').ok, true);
  assert.deepEqual(G.coUtQuestInfo(s), { step: 1, total: 3, id: 'cure', done: false });
  // tắm lại lần nữa (đã qua bước này): không lùi, không lặp
  s.inv.soap = 1; s.can = 1;
  G.perform(s, { kind: 'animal', id: a.id }, 'bath');
  assert.equal(G.coUtQuestInfo(s).id, 'cure');

  // bước 2: chữa bệnh
  Object.assign(a, { sick: 1, sickMs: 0, dose: 0 });
  assert.equal(G.giveMedicine(s, a.id).cured, true);
  assert.deepEqual(G.coUtQuestInfo(s), { step: 2, total: 3, id: 'vaccinate', done: false });

  // bước 3: vắc-xin
  s.inv.vaccine = 1;
  assert.equal(G.vaccinate(s, a.id).ok, true);
  assert.deepEqual(G.coUtQuestInfo(s), { step: 3, total: 3, id: null, done: true });
});

test('bỏ qua từng bước cũng theo đúng thứ tự rồi xong; xong rồi thì không bỏ qua được nữa', () => {
  const s = game();
  pigPen(s);
  G.buyAnimal(s, 'heo');
  assert.equal(G.skipCoUtQuest(s).ok, true);
  assert.equal(G.coUtQuestInfo(s).id, 'cure');
  assert.equal(G.skipCoUtQuest(s).ok, true);
  assert.equal(G.coUtQuestInfo(s).id, 'vaccinate');
  assert.equal(G.skipCoUtQuest(s).ok, true);
  assert.equal(G.coUtQuestInfo(s).done, true);
  assert.equal(G.skipCoUtQuest(s).ok, false, 'xong rồi thì không bỏ qua được nữa');
});

test('gọi bác sĩ thú y cũng tính là chữa bệnh xong bước (cureAnimal dùng chung)', () => {
  const s = game();
  pigPen(s);
  G.buyAnimal(s, 'heo');
  G.skipCoUtQuest(s);   // sang bước 'cure'
  const a = s.animals[0];
  s.scene = 'house';
  s.coins = 100000;
  Object.assign(a, { sick: 3, sickMs: 0 });
  const r = G.callVet(s, a.id);
  assert.equal(r.ok, true, r.msg);
  assert.equal(G.coUtQuestInfo(s).id, 'vaccinate');
});
