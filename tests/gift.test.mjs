// Seam 1: quà ở cổng (issue 29). Luật tặng / nhận nằm trong state.js (ADR 0012); hộp quà là mảng quà đang chờ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, giftCheck, giftTo, giftBoxCheck, takeGifts, splitGifts, basketCap, basketCount, actionsFor, guestCheck, startVisit, sceneMap, mapOf, loadGame } from '../public/state.js';
import { GIFT } from '../public/data.js';
import { createNotifier, eventMeta } from '../public/notify.js';

function guest() {
  const g = createGame({ name: 'Bình' });
  g.tutorial = 99; g.inv.seed_cai = 5; g.basket = { carot: 3 };
  return g;
}

test('gift trừ đúng món khỏi giỏ / kho khách và cộng đúng vào hộp quà', () => {
  const g = guest(), box = [];
  const seeds0 = g.inv.seed_cai;
  let r = giftTo(g, box, 'seed_cai', 2, 'op1');
  assert.equal(r.ok, true);
  assert.equal(g.inv.seed_cai, seeds0 - 2);
  r = giftTo(g, box, 'carot', 3, 'op2');
  assert.equal(r.ok, true);
  assert.equal(g.basket.carot, undefined);
  assert.deepEqual(box.map(x => [x.item, x.qty]), [['seed_cai', 2], ['carot', 3]]);
});

test('gift bị từ chối đúng lý do: món không có, vượt số có, vượt giới hạn một lần, hộp đầy, món không tặng được', () => {
  const g = guest(), box = [];
  const why = (item, qty, b = box) => { const r = giftTo(g, b, item, qty, 'x' + Math.random()); assert.equal(r.ok, false); return r.reason; };
  assert.equal(why('trung', 1), 'no_item');
  assert.equal(why('carot', 4), 'not_enough');
  assert.equal(why('seed_cai', 0), 'bad_qty');
  assert.equal(why('coin', 1), 'bad_item');
  g.inv.seed_cai = GIFT.perGift + 5;
  assert.equal(why('seed_cai', GIFT.perGift + 1), 'too_many');
  const full = Array.from({ length: GIFT.boxMax }, (_, i) => ({ op: 'f' + i, item: 'seed_cai', qty: 1 }));
  assert.equal(why('seed_cai', 1, full), 'box_full');
  assert.equal(giftBoxCheck(full, 'seed_cai', 1).reason, 'box_full');
  // bị từ chối thì không mất gì
  assert.equal(g.inv.seed_cai, GIFT.perGift + 5);
  assert.equal(box.length, 0);
});

test('áp dụng hai lần cùng mã thao tác chỉ tính một lần', () => {
  const g = guest(), box = [];
  assert.equal(giftTo(g, box, 'seed_cai', 2, 'same').ok, true);
  const r = giftTo(g, box, 'seed_cai', 2, 'same');
  assert.equal(r.ok, true); assert.equal(r.dup, true);
  assert.equal(g.inv.seed_cai, 3);
  assert.equal(box.length, 1);
});

test('chủ nhận quà: nông sản vào giỏ, hạt giống vào kho, hộp trống sau đó', () => {
  const owner = createGame({ name: 'Lan' }); owner.basket = {};
  const box = [{ id: 1, item: 'carot', qty: 3 }, { id: 2, item: 'seed_cai', qty: 4 }];
  const seeds0 = owner.inv.seed_cai || 0;
  const r = takeGifts(owner, box);
  assert.equal(r.moved, 7);
  assert.equal(owner.basket.carot, 3);
  assert.equal(owner.inv.seed_cai, seeds0 + 4);
  assert.deepEqual(box, []);
});

test('giỏ đầy thì lấy phần vừa, phần dư ở lại hộp, không mất đồ', () => {
  const owner = createGame({ name: 'Lan' });
  const cap = basketCap(owner);
  owner.basket = { carot: cap - 2 };
  const box = [{ id: 1, item: 'carot', qty: 5 }, { id: 2, item: 'seed_cai', qty: 4 }];
  const seeds0 = owner.inv.seed_cai || 0;
  takeGifts(owner, box);
  assert.equal(basketCount(owner), cap);
  assert.equal(owner.basket.carot, cap);
  assert.equal(owner.inv.seed_cai, seeds0 + 4);   // hạt giống không tính vào giỏ
  assert.deepEqual(box, [{ id: 1, item: 'carot', qty: 3 }]);
  // giỏ đầy hẳn: không lấy gì thêm
  const r = takeGifts(owner, box);
  assert.equal(r.moved, 0);
  assert.deepEqual(box, [{ id: 1, item: 'carot', qty: 3 }]);
  assert.deepEqual(splitGifts(box, 10).taken, [{ id: 1, item: 'carot', qty: 3 }]);
});

test('vườn có hộp quà và sổ lưu bút ở cổng, khách chạm vào được, chủ cũng vậy', () => {
  const host = createGame({ name: 'Lan' }); host.tutorial = 99;
  const m = mapOf(host);
  assert.ok(m.building('giftbox') && m.building('guestbook'));
  const me = createGame({ name: 'Bình' }); me.tutorial = 99;
  const v = startVisit(me, JSON.parse(JSON.stringify(host)), 'Lan');
  for (const id of ['giftbox', 'guestbook']) {
    const t = { kind: 'building', id };
    assert.equal(guestCheck(v, t).ok, true);
    assert.equal(actionsFor(v, t)[0].id, 'open');
    assert.equal(actionsFor(host, t)[0].id, 'open');
    assert.ok(sceneMap(v).building(id).at);
  }
  assert.match(actionsFor(v, { kind: 'building', id: 'giftbox' })[0].label, /Tặng/);
});

test('bản lưu cũ chưa có hộp quà, sổ lưu bút: tải lên thì được thêm cạnh cổng', () => {
  const old = createGame({ name: 'Cũ' });
  old.farm.ents = old.farm.ents.filter(e => e.kind !== 'giftbox' && e.kind !== 'guestbook');
  const s = loadGame(JSON.parse(JSON.stringify(old)));
  const gate = s.farm.ents.find(e => e.kind === 'gate');
  for (const k of ['giftbox', 'guestbook']) {
    const e = s.farm.ents.find(x => x.kind === k);
    assert.ok(e, k);
    assert.ok(Math.abs(e.c - gate.c) < 12 && Math.abs(e.r - gate.r) < 4);
  }
});

test('thông báo 🟡 quà và lời nhắn: gộp nhiều tin cùng loại thành một toast', () => {
  const out = [];
  const push = createNotifier({ show: (id, text) => out.push([id, text]) });
  assert.equal(push({ type: 'gift', name: 'Bình', item: 'seed_cai', qty: 2 }, 1000), true);
  assert.match(out[0][1], /Bình/);
  push({ type: 'gift', name: 'Cúc', item: 'carot', qty: 1 }, 1100);
  assert.equal(out[1][0], out[0][0], 'cùng khóa gộp');
  assert.match(out[1][1], /2 món quà/);
  push({ type: 'note', name: 'Bình' }, 1200);
  assert.notEqual(out[2][0], out[0][0], 'lời nhắn gộp riêng');
  assert.match(out[2][1], /Bình/);
  for (const t of ['gift', 'note']) {
    assert.equal(eventMeta({ type: t, name: 'x', item: 'carot', qty: 1 }).level, 'important');
    assert.equal(eventMeta({ type: t, name: 'x', item: 'carot', qty: 1 }).cat, 'gate');
  }
  // tắt loại 'gate' trong cài đặt thì không hiện
  const off = createNotifier({ show: () => { throw new Error('không được hiện'); }, on: cat => cat !== 'gate' });
  assert.equal(off({ type: 'gift', name: 'Bình', item: 'carot', qty: 1 }, 1000), false);
});
