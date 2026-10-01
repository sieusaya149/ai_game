// Hướng dẫn người mới: cuốc → gieo → tưới → thu hoạch → bỏ vào thùng → mua hạt → ngủ. Bước tự tăng theo việc đã làm.
// "Bản mới có gì đổi": hiện một lần cho save chuyển từ v1.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { DAY_MS } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const newGame = () => { const s = G.createGame({ name: 'Hùng' }); s.orders = []; s.nextOrderAt = 1e12; return s; };
const plot = i => ({ kind: 'plot', idx: i });
const stepId = s => G.TUTORIAL[s.tutorial]?.id ?? 'xong';

test('người chơi mới đi hết các bước tới lúc ngủ, mỗi việc làm xong thì bước tự chuyển', () => {
  const s = newGame();
  assert.equal(s.tutorial, 0);
  assert.deepEqual(G.TUTORIAL.map(t => t.id), ['till', 'plant', 'water', 'harvest', 'ship', 'buy', 'sleep']);

  assert.ok(G.perform(s, plot(0), 'till').ok);
  assert.equal(stepId(s), 'plant');
  assert.ok(G.perform(s, plot(0), 'plant').ok);
  assert.equal(stepId(s), 'water');
  assert.ok(G.perform(s, plot(0), 'water').ok);
  assert.equal(stepId(s), 'harvest');
  s.plots[0].crop.progress = 1;
  assert.ok(G.perform(s, plot(0), 'harvest').ok);
  assert.equal(stepId(s), 'ship');
  assert.ok(G.shipAdd(s, 'cai', 'all').ok);
  assert.equal(stepId(s), 'buy');
  assert.ok(G.buy(s, 'seed_cai', 1).ok);
  assert.equal(stepId(s), 'sleep');
  assert.equal(G.sleep(s).ok, false);   // chưa 18h
  assert.equal(stepId(s), 'sleep');
  s.time = DAY_MS / 2;
  assert.ok(G.sleep(s).ok);
  assert.equal(s.tutorial, G.TUTORIAL.length);
});

test('làm trước thứ tự thì bước nhảy qua phần đã làm; tutorial 99 là đã xong', () => {
  const s = newGame();
  assert.ok(G.buy(s, 'seed_cai', 1).ok);   // mua hạt sớm: chưa tính vì còn bước cuốc
  assert.equal(stepId(s), 'till');
  G.perform(s, plot(0), 'till'); G.perform(s, plot(0), 'plant'); G.perform(s, plot(0), 'water');
  s.plots[0].crop.progress = 1;
  G.perform(s, plot(0), 'harvest');
  G.shipAdd(s, 'cai', 'all');
  assert.equal(stepId(s), 'sleep');   // bước mua hạt đã làm từ trước
  const d = newGame(); d.tutorial = 99;
  assert.equal(G.advanceTutorial(d), false);
  assert.equal(d.tutorial, 99);
});

test('vườn mới đủ hạt và xu để đi hết hướng dẫn', () => {
  const s = newGame();
  assert.ok(s.inv.seed_cai >= 1);
  assert.ok(s.coins >= 8);   // đủ mua 1 gói hạt cải
});

test('"Bản mới có gì đổi": chỉ cho save chuyển từ v1, một lần', () => {
  const fresh = newGame();
  assert.equal(G.whatsNewDue(fresh), false);
  const old = newGame(); old.migratedFrom = 1;
  assert.equal(G.whatsNewDue(old), true);
  G.markWhatsNew(old);
  assert.equal(G.whatsNewDue(old), false);
  assert.equal(old.seenWhatsNew, G.WHATS_NEW_VERSION);
});
