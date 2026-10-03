// Kẻ săn mồi: chuột, diều hâu, chồn (issue 43, ADR 0004 + 0013), qua API công khai của state.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { PREDATOR as P, DAY_MS, ANIMALS, ITEMS, MAX_CATCHUP_MS, FREE } from '../public/data.js';
import { mapOf } from '../public/farm.js';

const MIN = 60_000, HOUR = 60 * MIN, TS = 16;
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
// Math.random có hạt giống cố định (mulberry32) để chạy lại ra cùng kết quả
const seeded = (seed, fn) => {
  const r = Math.random; let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = r; }
};
const NOON = DAY_MS * 0.3;        // 13h12: ban ngày
const MIDNIGHT = DAY_MS * 0.75;   // 0h: khung giờ chồn
// Vườn cấp đủ cao (hết bảo hộ người mới), không đơn hàng, không con vật sẵn
const newGame = () => {
  const s = G.createGame({ name: 'Hùng' });
  s.orders = []; s.nextOrderAt = 1e15; s.animals = []; s.time = NOON; s.coins = 1e6; s.exp = 5000;
  assert.ok(G.levelInfo(s.exp).level >= P.minLevel, 'đủ cấp để có kẻ săn mồi');
  return s;
};
const bird = (s, stage = 'truong', extra) => {
  const a = { ...structuredClone(G.createGame().animals[0]), id: s.nextId++, type: 'ga', name: 'Gà', stage, age: G.stageStart('ga', stage), nextProduct: 1e15, ready: false, sex: 'f', ...extra };
  s.animals.push(a);
  return a;
};
const run = (s, ms, step = 5000) => { const ev = []; for (let t = 0; t < ms; t += step) ev.push(...G.tick(s, Math.min(step, ms - t))); return ev; };
// Cho ăn no mỗi vòng để con vật không chết đói/bệnh khi chạy lâu
const runFed = (s, ms, step = 5000) => { const ev = []; for (let t = 0; t < ms; t += step) { for (const a of s.animals) { a.hunger = 100; a.sick = 0; } ev.push(...G.tick(s, Math.min(step, ms - t))); } return ev; };
// Đặt sẵn một con chuột ở ô (c, r), sắp ra tay sau `ms`
const putRat = (s, c, r, ms = P.warnMs) => {
  const p = { id: s.nextId++, kind: 'rat', state: 'hunt', since: s.time, warned: false, strikeAt: s.time + ms, tile: { c, r }, x: c * TS + 8, y: r * TS + 8, tileAt: s.time + 1e9, target: null };
  s.preds.push(p);
  return p;
};
const putPred = (s, kind, a, ms = P.warnMs) => {
  const p = { id: s.nextId++, kind, state: 'hunt', since: s.time, warned: false, strikeAt: s.time + ms, tile: null, x: a.x, y: a.y, target: a.id };
  s.preds.push(p);
  return p;
};
// Một ô trống trong đất để đặt đồ
const freeTile = (s, what) => {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (G.canPlace(s, what, c, r).ok) return { c, r };
  throw new Error('không còn chỗ trống');
};

test('chuột sinh ra cạnh kho, đống rơm, máng ăn và không bao giờ quá 8 con', () => {
  const s = newGame();
  s.exp = 1e6;   // đủ cấp xây đồng cỏ (đống rơm ở nhà chuồng) để có đủ cả ba loại ổ
  const spot = freeTile(s, { kind: 'pen', pen: 'pasture' });
  assert.equal(G.placeEntity(s, { kind: 'pen', pen: 'pasture' }, spot.c, spot.r).ok, true);
  const m = mapOf(s), shed = m.building('shed');
  const nests = [
    { c: shed.foot.c, r: shed.foot.r, w: shed.foot.w, h: shed.foot.h },
    ...m.troughs.map(t => ({ c: t.c, r: t.r, w: 2, h: 1 })),
    ...m.penList.filter(p => p.type === 'pasture').map(p => ({ c: Math.floor(p.house.x / TS), r: Math.floor(p.house.y / TS), w: 1, h: 1 })),
  ];
  const nearNest = t => nests.some(n => t.c >= n.c - 1 && t.c <= n.c + n.w && t.r >= n.r - 1 && t.r <= n.r + n.h);
  let born = 0;
  const seen = new Set();   // theo id chứ không theo chỗ trong mảng: có con bỏ đi thì mảng ngắn lại
  // bước ngắn hơn rat.moveMs: tick chia nhỏ bên trong nên bước dài làm chuột kịp đổi ô trước khi mình nhìn
  seeded(1, () => {
    for (let i = 0; i < 15_000 && s.preds.length < P.rat.max; i++) {
      G.tick(s, 2000);
      for (const p of s.preds) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        assert.ok(nearNest(p.tile), `chuột sinh cạnh ổ, không phải ô ${p.tile.c},${p.tile.r}`); born++; p.tileAt = 1e15;
      }
    }
  });
  assert.ok(born >= 3, `sinh được vài con chuột: ${born}`);
  assert.ok(s.preds.length <= P.rat.max, `không quá ${P.rat.max} con`);
});

test('chuột không quá 8 con dù chạy rất lâu, và sinh thêm khi bị bắt bớt', () => {
  const s = newGame();
  seeded(2, () => run(s, 40 * HOUR, 60_000));
  assert.equal(s.preds.filter(p => p.kind === 'rat').length, P.rat.max);
});

test('chuột ăn cám trong máng', () => {
  const s = newGame();
  s.troughs.chicken = 10;
  const rat = putRat(s, ...tileNear(s), 1000);
  seeded(3, () => run(s, 2000, 500));
  assert.equal(s.troughs.chicken, 9);
  assert.ok(s.preds.includes(rat), 'ăn xong chuột vẫn ở lại');
});

test('chuột trộm trứng khi máng hết cám', () => {
  const s = newGame();
  const [c, r] = tileNear(s);
  s.eggs.push({ id: s.nextId++, sp: 'ga', x: c * TS + 8, y: r * TS + 8, laidAt: 0, fertile: false, mom: null, dad: null });
  putRat(s, c, r, 1000);
  seeded(4, () => run(s, 2000, 500));
  assert.equal(s.eggs.length, 0);
});

test('hết cám hết trứng thì chuột cắn con non: con non bị thương, không chữa thì mất', () => {
  const s = newGame();
  const chick = bird(s, 'non');
  putRat(s, ...tileNear(s), 1000);
  const ev = seeded(5, () => run(s, 2000, 500));
  assert.equal(chick.hurt, true);
  assert.ok(ev.some(e => e.type === 'hurt' && e.id === chick.id));
  assert.deepEqual(G.hurtAnimals(s).map(a => a.id), [chick.id]);
  // vết thương không chữa: con non không qua khỏi
  seeded(6, () => runFed(s, P.rat.hurtDeadMs + MIN, 30_000));
  assert.equal(s.animals.some(a => a.id === chick.id), false, 'không chữa thì mất');
});

test('băng bó bằng thuốc thú y: con non khỏi, hết báo động', () => {
  const s = newGame();
  const chick = bird(s, 'non');
  chick.hurt = true; chick.hurtMs = HOUR;
  s.inv.medicine = 2;
  const acts = G.actionsFor(s, { kind: 'animal', id: chick.id });
  assert.equal(acts[0].id, 'medicine', 'băng bó là hành động chính');
  const r = G.perform(s, { kind: 'animal', id: chick.id }, 'medicine');
  assert.equal(r.ok, true, r.msg);
  assert.equal(chick.hurt, false);
  assert.equal(G.hurtAnimals(s).length, 0);
  assert.equal(s.inv.medicine, 1);
  // chạy dài hơn hạn vết thương; mỗi vòng dọn kẻ săn mồi và giữ con non trong chuồng để nó không bị
  // chuột cắn lần nữa hay ngủ ngoài rồi bị chồn hương tha đi — ở đây chỉ kiểm "chữa rồi thì không chết vì vết cũ"
  seeded(7, () => {
    for (let t = 0; t < P.rat.hurtDeadMs + MIN; t += 30_000) {
      s.preds.length = 0; s.threats.length = 0;
      for (const a of s.animals) { a.hunger = 100; a.sick = 0; a.stray = false; a.tile = null; }
      G.tick(s, 30_000);
    }
  });
  assert.ok(s.animals.some(a => a.id === chick.id), 'chữa rồi thì sống');
});

test('diều hâu chỉ cắp con non đang thả rông, ban ngày; con trong chuồng thì nó bỏ đi', () => {
  const s = newGame();
  const chick = bird(s, 'non', { tile: { c: s.farm.owned.c + 8, r: s.farm.owned.r + 8 } });
  const hawk = putPred(s, 'hawk', chick);
  const ev = seeded(8, () => run(s, P.warnMs + 2000, 1000));
  assert.equal(s.animals.some(a => a.id === chick.id), false, 'bị cắp đi');
  assert.ok(ev.some(e => e.type === 'taken' && e.pred === 'hawk'));
  assert.equal(hawk.state, 'leaving');
  // con non đã vào chuồng (tile null, ban đêm nên không ra thả rông): diều hâu bỏ đi tay không
  const s2 = newGame(); s2.time = DAY_MS * 0.9;
  const inside = bird(s2, 'non');
  assert.equal(inside.tile, null);
  putPred(s2, 'hawk', inside);
  seeded(9, () => run(s2, P.warnMs + 2000, 1000));
  assert.ok(s2.animals.some(a => a.id === inside.id), 'trong chuồng thì an toàn');
  assert.equal(s2.preds.length, 0);
});

test('diều hâu không tới khi có chó canh, ban đêm, hay con non đứng dưới mái che', () => {
  const s = newGame(); s.time = DAY_MS * 0.9;   // ban đêm
  bird(s, 'non', { tile: { c: s.farm.owned.c + 8, r: s.farm.owned.r + 8 } });
  seeded(10, () => run(s, 3 * HOUR, 30_000));
  assert.equal(s.preds.some(p => p.kind === 'hawk'), false, 'ban đêm không có diều hâu');
  // ban ngày, có chó canh no và vui: diều hâu lẫn chồn đều không dám tới
  const sd = newGame();
  sd.dog.stage = 'truong'; sd.dog.hunger = 100; sd.dog.happy = 100;
  bird(sd, 'non', { tile: { c: sd.farm.owned.c + 8, r: sd.farm.owned.r + 8 } });
  bird(sd, 'truong', { tile: { c: sd.farm.owned.c + 9, r: sd.farm.owned.r + 8 }, stray: true });
  seeded(30, () => runFed(sd, 20 * HOUR, 30_000));
  assert.equal(sd.preds.some(p => p.kind !== 'rat'), false, 'có chó canh thì không có diều hâu, chồn');
  // ban ngày, có mái che cạnh con non: không nhắm được con nào
  const s2 = newGame();
  const spot = freeTile(s2, { kind: 'deco', item: 'deco_canopy' });
  s2.inv.deco_canopy = 1;
  assert.equal(G.placeEntity(s2, { kind: 'deco', item: 'deco_canopy' }, spot.c, spot.r).ok, true);
  bird(s2, 'non', { tile: { c: spot.c, r: spot.r + 1 } });
  seeded(11, () => run(s2, 5 * HOUR, 30_000));
  assert.equal(s2.preds.some(p => p.kind === 'hawk'), false, 'có mái che thì diều hâu không nhắm');
});

test('chồn chỉ bắt con ngủ ngoài chuồng, lúc nửa đêm; lùa về chuồng là thoát', () => {
  const s = newGame(); s.time = MIDNIGHT;
  const stray = bird(s, 'truong', { tile: { c: s.farm.owned.c + 8, r: s.farm.owned.r + 8 }, stray: true });
  assert.deepEqual(G.strays(s).map(a => a.id), [stray.id]);
  putPred(s, 'weasel', stray);
  const ev = seeded(12, () => run(s, P.warnMs + 2000, 1000));
  assert.equal(s.animals.some(a => a.id === stray.id), false, 'bị chồn bắt');
  assert.ok(ev.some(e => e.type === 'taken' && e.pred === 'weasel'));
  // lùa về chuồng kịp: chồn bỏ đi tay không
  const s2 = newGame(); s2.time = MIDNIGHT;
  const b = bird(s2, 'truong', { tile: { c: s2.farm.owned.c + 8, r: s2.farm.owned.r + 8 }, stray: true });
  putPred(s2, 'weasel', b);
  assert.equal(G.passGate(s2, b.id), true);
  seeded(13, () => run(s2, P.warnMs + 2000, 1000));
  assert.ok(s2.animals.some(a => a.id === b.id), 'về chuồng rồi thì an toàn');
});

test('chồn không mò tới ban ngày và không bắt con đang trong chuồng', () => {
  const s = newGame();   // ban ngày
  bird(s, 'truong', { tile: { c: s.farm.owned.c + 8, r: s.farm.owned.r + 8 }, stray: true });
  seeded(14, () => run(s, 3 * HOUR, 30_000));
  assert.equal(s.preds.some(p => p.kind === 'weasel'), false);
  const s2 = newGame(); s2.time = MIDNIGHT;
  bird(s2, 'truong');   // trong chuồng, không lạc
  seeded(15, () => run(s2, 5 * HOUR, 30_000));
  assert.equal(s2.preds.some(p => p.kind === 'weasel'), false, 'không có con nào ngủ ngoài thì chồn không tới');
});

test('mọi tấn công đều báo 🔴 trước khoảng 10 giây, đuổi kịp thì không ai bị hại', () => {
  for (const [kind, mk] of [['hawk', s => bird(s, 'non', { tile: { c: s.farm.owned.c + 8, r: s.farm.owned.r + 8 } })],
    ['weasel', s => bird(s, 'truong', { tile: { c: s.farm.owned.c + 8, r: s.farm.owned.r + 8 }, stray: true })]]) {
    const s = newGame(); s.time = MIDNIGHT;
    const a = mk(s), p = putPred(s, kind, a);
    const ev = seeded(16, () => run(s, 1000, 1000));
    assert.ok(ev.some(e => e.type === 'predator' && e.id === p.id), `${kind}: có event cảnh báo`);
    const spots = G.urgentSpots(s);
    assert.ok(spots.some(x => x.key === 'pred:' + p.id), `${kind}: có chỗ báo gấp 🔴`);
    assert.ok(p.strikeAt - s.time <= P.warnMs && p.strikeAt > s.time, `${kind}: còn trong khoảng cảnh báo`);
    // đuổi kịp
    const r = G.perform(s, { kind: 'pred', id: p.id }, 'shoo');
    assert.equal(r.ok, true, r.msg);
    seeded(17, () => run(s, 30_000, 1000));
    assert.ok(s.animals.some(x => x.id === a.id), `${kind}: đuổi kịp thì con vật không sao`);
  }
});

test('chuột cũng báo trước 10 giây mỗi lần ra tay; đuổi chuột thì hết hại', () => {
  const s = newGame();
  s.troughs.chicken = 10;
  const rat = putRat(s, ...tileNear(s), P.rat.actMs);
  seeded(18, () => run(s, P.rat.actMs - P.warnMs - 2000, 1000));
  assert.equal(G.urgentSpots(s).some(x => x.key === 'pred:' + rat.id), false, 'còn xa thì chưa báo');
  const ev = seeded(19, () => run(s, 3000, 1000));
  assert.ok(ev.some(e => e.type === 'predator' && e.id === rat.id), 'tới sát giờ thì báo 🔴');
  assert.ok(G.urgentSpots(s).some(x => x.key === 'pred:' + rat.id));
  const r = G.perform(s, { kind: 'pred', id: rat.id }, 'shoo');
  assert.equal(r.ok, true, r.msg);
  seeded(20, () => run(s, MIN, 1000));
  assert.equal(s.troughs.chicken, 10, 'đuổi kịp thì không mất cám');
});

test('bảo hộ người mới: dưới cấp 5 không có chuột, diều hâu, chồn', () => {
  const s = newGame();
  s.exp = 0;
  assert.ok(G.levelInfo(s.exp).level < P.minLevel);
  s.time = MIDNIGHT;
  bird(s, 'non', { tile: { c: s.farm.owned.c + 8, r: s.farm.owned.r + 8 }, stray: true });
  seeded(21, () => run(s, 30 * HOUR, 60_000));
  assert.equal(s.preds.length, 0);
});

test('bẫy chuột: mua ở chợ, đặt trong trại, bắt con chuột đi qua rồi phải gài lại', () => {
  const s = newGame(); s.time = DAY_MS * 0.2;
  assert.equal(ITEMS.deco_rattrap.kind, 'deco');
  const b = G.buy(s, 'deco_rattrap', 1);
  assert.equal(b.ok, true, b.msg);
  const spot = freeTile(s, { kind: 'deco', item: 'deco_rattrap' });
  assert.equal(G.placeEntity(s, { kind: 'deco', item: 'deco_rattrap' }, spot.c, spot.r).ok, true);
  const trap = G.ratTraps(s)[0];
  assert.ok(trap && !trap.shut);
  // con chuột cách bẫy vài ô: ngửi thấy mồi, mò tới và dính bẫy
  const rat = putRat(s, spot.c + 3, spot.r, 1e9);
  rat.tileAt = s.time;
  const ev = seeded(22, () => run(s, 2 * MIN, 1000));
  assert.equal(s.preds.includes(rat), false, 'chuột đã dính bẫy');
  assert.equal(trap.shut, true);
  assert.equal(s.stats.rats, 1);
  assert.ok(ev.some(e => e.type === 'trapped'));
  // bẫy đã sập thì không bắt thêm, phải gài lại
  const rat2 = putRat(s, spot.c, spot.r, 1e9);
  rat2.tileAt = s.time;
  seeded(23, () => run(s, 30_000, 1000));
  assert.ok(s.preds.includes(rat2), 'bẫy sập rồi thì không bắt được');
  const t = { kind: 'deco', id: trap.id };
  assert.equal(G.actionsFor(s, t)[0].id, 'arm');
  assert.equal(G.actionsFor(s, t)[0].disabled, undefined, 'bẫy đã sập thì gài lại được');
  assert.equal(G.perform(s, t, 'arm').ok, true);
  assert.equal(trap.shut, false);
});

test('ADR 0004: chạy bù offline nhiều giờ có chuột, diều hâu, chồn thì không con nào chết', () => {
  const s = newGame();
  s.time = DAY_MS * 0.05;
  s.troughs.chicken = 20; s.troughs.pig = 20; s.troughs.pasture = 20;
  for (let i = 0; i < 6; i++) bird(s, 'non');
  for (let i = 0; i < 4; i++) bird(s, 'truong', { nextProduct: 0 });
  for (let i = 0; i < 5; i++) s.eggs.push({ id: s.nextId++, sp: 'ga', x: s.animals[0].x, y: s.animals[0].y, laidAt: 0, fertile: false, mom: null, dad: null });
  // bản lưu đã có sẵn đủ cả ba loại kẻ săn mồi
  for (let i = 0; i < 4; i++) putRat(s, ...tileNear(s), 1000);
  putPred(s, 'hawk', s.animals[0]);
  putPred(s, 'weasel', s.animals[1]);
  s.animals[1].tile = { c: s.farm.owned.c + 8, r: s.farm.owned.r + 8 }; s.animals[1].stray = true;
  const ids = s.animals.map(a => a.id), feed0 = s.troughs.chicken + s.troughs.pig + s.troughs.pasture, eggs0 = s.eggs.length;
  s.savedAt = Date.now() - 8 * HOUR;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = seeded(24, () => G.loadGame());
  for (const id of ids) assert.ok(l.animals.some(a => a.id === id), `con ${id} vẫn còn sống sau khi chạy bù`);
  assert.equal(l.animals.filter(a => a.hurt).length, 0, 'chạy bù không có con nào bị cắn');
  assert.equal(l.preds.some(p => p.kind !== 'rat'), false, 'diều hâu, chồn bỏ đi tay không');
  const feed1 = l.troughs.chicken + l.troughs.pig + l.troughs.pasture;
  assert.ok(feed1 < feed0 || l.eggs.length < eggs0 + 10, `cám và trứng có hao: cám ${feed0}→${feed1}`);
  assert.ok(l.preds.filter(p => p.kind === 'rat').length <= P.rat.max, 'chạy bù không sinh chuột quá 8');
  assert.ok(MAX_CATCHUP_MS >= 8 * HOUR);
});

test('ADR 0004: con non đang mang vết chuột cắn không chết khi chạy bù', () => {
  const s = newGame();
  const chick = bird(s, 'non');
  chick.hurt = true; chick.hurtMs = P.rat.hurtDeadMs - MIN;
  s.troughs.chicken = 20;
  s.savedAt = Date.now() - 6 * HOUR;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = seeded(25, () => G.loadGame());
  const got = l.animals.find(a => a.id === chick.id);
  assert.ok(got, 'vẫn còn sống');
  assert.ok(got.hurt, 'vẫn còn vết thương, chờ chủ về băng bó');
  assert.ok(got.hurtMs <= P.rat.hurtCapMs, `vết thương bị kẹp lại: ${Math.round(got.hurtMs / MIN)} phút`);
});

test('chạy bù không sinh chuột vượt 8 con dù vắng rất lâu', () => {
  const s = newGame();
  s.troughs.chicken = 20;
  s.savedAt = Date.now() - MAX_CATCHUP_MS;
  store[G.SAVE_KEY] = JSON.stringify(s);
  const l = seeded(26, () => G.loadGame());
  assert.ok(l.preds.length <= P.rat.max, `${l.preds.length} con chuột`);
});

// Một ô trống gần nhà để thả chuột vào (chuột đứng yên vì tileAt rất xa)
function tileNear(s) {
  const m = mapOf(s), o = s.farm.owned;
  for (let r = o.r + 1; r < o.r + o.h; r++) for (let c = o.c + 1; c < o.c + o.w; c++) if (m.isOwned(c, r) && !m.isSolid(c, r)) return [c, r];
  throw new Error('không có ô trống');
}

test('danh sách việc cần làm và mũi tên có kẻ săn mồi sắp ra tay, con non bị thương', () => {
  const s = newGame();
  const chick = bird(s, 'non', { tile: { c: s.farm.owned.c + 8, r: s.farm.owned.r + 8 } });
  const hawk = putPred(s, 'hawk', chick);
  chick.hurt = true;
  seeded(27, () => run(s, 1000, 1000));
  assert.ok(FREE.types.includes('ga'));
  assert.ok(ANIMALS.ga);
  const spots = G.urgentSpots(s);
  assert.ok(spots.some(x => x.key === 'pred:' + hawk.id && /Diều hâu/.test(x.text)));
  assert.ok(spots.some(x => x.key === 'hurt:' + chick.id));
});

test('hotfix: chó canh nhà đuổi chồn, diều hâu đi thì hiện chữ và nhật ký, và lần nào cũng như nhau', () => {
  const play = () => {
    const keep = [P.hawk.chancePerMin, P.weasel.chancePerMin];
    P.hawk.chancePerMin = 0.05; P.weasel.chancePerMin = 0.05;   // dồn nhiều lần định tới trong thời gian ngắn
    try { return play0(); } finally { [P.hawk.chancePerMin, P.weasel.chancePerMin] = keep; }
  };
  const play0 = () => {
    const sd = newGame();
    sd.dog.age = G.stageStart('cho', 'truong'); sd.dog.stage = 'truong'; sd.dog.hunger = 100; sd.dog.happy = 100;
    bird(sd, 'non', { tile: { c: sd.farm.owned.c + 8, r: sd.farm.owned.r + 8 } });
    bird(sd, 'truong', { tile: { c: sd.farm.owned.c + 9, r: sd.farm.owned.r + 8 }, stray: true });
    const ev = [];   // chó luôn no vui, con non luôn non và ở ngoài chuồng, gà lạc luôn lạc
    seeded(30, () => { for (let i = 0; i < 40 * 120; i++) {
      sd.dog.hunger = 100; sd.dog.happy = 100;
      for (const a of sd.animals) { a.hunger = 100; a.sick = 0; a.age = a.stage === 'non' ? 0 : G.stageStart('ga', 'truong'); a.stage = a.stage === 'non' ? 'non' : 'truong'; a.nextProduct = 1e15; }
      ev.push(...G.tick(sd, 30_000)); } });
    return { sd, ev };
  };
  const { sd, ev } = play();
  assert.equal(sd.preds.some(p => p.kind !== 'rat'), false, 'vẫn không có diều hâu, chồn');
  const fx = ev.filter(e => e.type === 'fx' && /đuổi .* đi rồi 🐕/.test(e.text));
  assert.ok(fx.length > 0, 'có hiện chữ bay');
  assert.ok(sd.log.some(l => /Mực đuổi (chồn|diều hâu) đi rồi 🐕/.test(l.text ?? l)), 'có dòng nhật ký');
  assert.deepEqual(play().sd.log.map(l => l.text ?? l), sd.log.map(l => l.text ?? l), 'cùng hạt giống ra cùng kết quả');
  // không chó canh thì không có chữ này
  const s0 = newGame(); bird(s0, 'truong', { tile: { c: s0.farm.owned.c + 9, r: s0.farm.owned.r + 8 }, stray: true });
  seeded(30, () => runFed(s0, 5 * HOUR, 30_000));
  assert.equal(s0.log.some(l => /đi rồi 🐕/.test(l.text ?? l)), false);
});

test('hotfix: chạy bù offline không có chữ chó đuổi kẻ săn mồi', () => {
  const sd = newGame();
  sd.dog.stage = 'truong'; sd.dog.hunger = 100; sd.dog.happy = 100;
  bird(sd, 'truong', { tile: { c: sd.farm.owned.c + 9, r: sd.farm.owned.r + 8 }, stray: true });
  sd.time = MIDNIGHT; sd.savedAt = Date.now() - 8 * HOUR; store[G.SAVE_KEY] = JSON.stringify(sd);
  const l = seeded(31, () => G.loadGame());
  assert.equal(l.log.some(x => /đi rồi 🐕/.test(x.text ?? x)), false);
});
