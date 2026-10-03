// Seam 1: giếng 4 cấp (issue 56, Phase 3): sức chứa bình tưới theo cấp giếng, nâng cấp tại chỗ bằng xu, múc nhanh hơn, lưu và nạp.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { WELL } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const newGame = () => { const s = G.createGame({ name: 'Hùng', look: {} }); s.orders = []; s.nextOrderAt = 1e12; return s; };
const WELL_T = { kind: 'building', id: 'well' };
const wellEnt = s => s.farm.ents.find(e => e.kind === 'well');
const refill = s => G.perform(s, WELL_T, 'refill');
const act = (s, id) => G.actionsFor(s, WELL_T).find(a => a.id === id);
// Tưới tới khi bình hết: đếm số lần tưới được (ô đang có cây, đặt khô lại sau mỗi lần)
function waterCount(s) {
  const p = s.plots[0];
  if (!p.crop) { G.perform(s, { kind: 'plot', idx: 0 }, 'till'); G.perform(s, { kind: 'plot', idx: 0 }, 'plant'); }
  let n = 0;
  for (;;) {
    p.water = 0;
    if (!G.perform(s, { kind: 'plot', idx: 0 }, 'water').ok) return n;
    n++;
  }
}

test('bình tưới chứa 10 / 15 / 25 / 40 lần theo cấp giếng; nâng cấp trừ đúng xu', () => {
  const s = newGame();
  s.coins = 1e6;
  assert.equal(G.wellLv(s), 1);
  const want = [10, 15, 25, 40];
  for (let lv = 1; lv <= 4; lv++) {
    if (lv > 1) {
      const coins = s.coins, price = G.wellInfo(s).next.price;
      assert.equal(price, WELL[lv - 1].price);
      const r = G.upgradeWell(s);
      assert.ok(r.ok, r.msg);
      assert.equal(r.lv, lv);
      assert.equal(s.coins, coins - price);
    }
    assert.equal(G.wellLv(s), lv);
    assert.equal(G.canMax(s), want[lv - 1]);
    s.can = 0;
    assert.ok(refill(s).ok);
    assert.equal(s.can, want[lv - 1]);
    assert.equal(waterCount(s), want[lv - 1], `cấp ${lv} tưới được ${want[lv - 1]} lần`);
  }
});

test('không đủ xu thì bị từ chối, không mất xu; không nâng quá cấp 4', () => {
  const s = newGame();
  s.coins = WELL[1].price - 1;
  const r = G.upgradeWell(s);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'coins');
  assert.equal(s.coins, WELL[1].price - 1);
  assert.equal(G.wellLv(s), 1);
  assert.match(act(s, 'upgradeWell').disabled, /xu/);
  // đủ xu thì nút bật, có giá trong nhãn
  s.coins = 1e6;
  const a = act(s, 'upgradeWell');
  assert.equal(a.disabled, undefined);
  assert.match(a.label, new RegExp(WELL[1].name));
  assert.match(a.label, new RegExp(WELL[1].price.toLocaleString('vi-VN')));
  for (let i = 0; i < 3; i++) assert.ok(G.upgradeWell(s).ok);
  assert.equal(G.wellLv(s), 4);
  const coins = s.coins, top = G.upgradeWell(s);
  assert.equal(top.ok, false);
  assert.equal(top.reason, 'max');
  assert.equal(s.coins, coins);
  assert.equal(G.wellLv(s), 4);
  assert.equal(G.wellInfo(s).next, null);
  assert.equal(act(s, 'upgradeWell'), undefined, 'cấp 4 thì không còn nút nâng');
  // hành động chính vẫn là múc nước
  assert.equal(G.actionsFor(s, WELL_T)[0].id, 'refill');
});

test('nâng cấp qua hành động ở giếng (perform), giữ nguyên chỗ và hướng', () => {
  const s = newGame();
  s.coins = 1e6;
  const e = wellEnt(s), at = { c: e.c, r: e.r, dir: e.dir };
  const r = G.perform(s, WELL_T, 'upgradeWell');
  assert.ok(r.ok, r.msg);
  assert.equal(r.sound, 'coin');
  assert.match(r.msg, new RegExp(WELL[1].name.toLowerCase()));
  assert.equal(G.wellLv(s), 2);
  assert.deepEqual({ c: e.c, r: e.r, dir: e.dir }, at);
  assert.ok(G.mapOf(s).building('well'));
});

test('wellInfo: tên, sức chứa bình, cấp kế và giá', () => {
  const s = newGame();
  s.coins = 0;
  const i = G.wellInfo(s);
  assert.equal(i.lv, 1);
  assert.equal(i.name, 'Giếng đất');
  assert.equal(i.can, 10);
  assert.deepEqual({ lv: i.next.lv, name: i.next.name, can: i.next.can, price: i.next.price }, { lv: 2, name: 'Giếng xây', can: 15, price: WELL[1].price });
  assert.match(i.next.error, /xu/);
  assert.deepEqual(WELL.map(w => w.name), ['Giếng đất', 'Giếng xây', 'Bơm tay', 'Máy bơm']);
});

test('múc nước ở giếng xây nhanh hơn giếng đất, cấp sau không chậm hơn cấp trước', () => {
  const s = newGame();
  s.coins = 1e6;
  const ms = [G.refillMs(s)];
  for (let i = 0; i < 3; i++) { G.upgradeWell(s); ms.push(G.refillMs(s)); }
  assert.ok(ms[1] < ms[0], `giếng xây ${ms[1]}ms < giếng đất ${ms[0]}ms`);
  for (let i = 1; i < 4; i++) assert.ok(ms[i] <= ms[i - 1]);
  assert.ok(ms.every(v => v > 0));
});

test('nâng cấp không làm mất nước đang có trong bình', () => {
  const s = newGame();
  s.coins = 1e6;
  s.can = 7;
  G.upgradeWell(s);
  assert.equal(s.can, 7);
  s.can = 10;   // bình cấp 1 đầy
  G.upgradeWell(s);
  assert.equal(s.can, 10);
  // múc thêm thì đầy theo sức chứa mới
  assert.ok(refill(s).ok);
  assert.equal(s.can, 25);
});

test('bình tưới đã rèn ở tiệm rèn: giếng cộng thêm vào sức chứa của bình', () => {
  const s = newGame();
  s.coins = 1e6;
  s.tools.can.lv = 2;   // bình đồng chứa 20
  assert.equal(G.canMax(s), 20);
  G.upgradeWell(s);
  assert.equal(G.canMax(s), 25);
  assert.equal(G.canCap(3, 4), 70);
  assert.equal(G.canCap(1, 1), 10);
});

test('giếng giữ nguyên cấp qua lưu và nạp; nạp lại không làm vơi bình', () => {
  for (const k of Object.keys(store)) delete store[k];
  const s = newGame();
  s.coins = 1e6;
  G.upgradeWell(s); G.upgradeWell(s);
  s.can = 25;
  G.saveGame(s);
  const t = G.loadGame();
  assert.equal(G.wellLv(t), 3);
  assert.equal(t.can, 25);
  assert.equal(G.canMax(t), 25);
  // bản lưu sửa tay cấp lạ thì kẹp về 1..4
  const raw = JSON.parse(store[G.SAVE_KEY]);
  raw.farm.ents.find(e => e.kind === 'well').lv = 9;
  store[G.SAVE_KEY] = JSON.stringify(raw);
  assert.equal(G.wellLv(G.loadGame()), 4);
});

test('đang ở trong nhà / ngoài làng thì không nâng giếng', () => {
  const s = newGame();
  s.coins = 1e6;
  s.scene = 'house';
  const r = G.upgradeWell(s);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'scene');
  assert.equal(G.wellLv(s), 1);
});
