import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { buyStrip } from '../public/state.js';
import { DAY_MS, FREE } from '../public/data.js';

// 13h, 10 con gà mái trưởng thành, túi có cám; vườn nới rộng sang đông/tây cho con lạc đứng được ngoài khung nhìn (issue 42)
const flock = makeSave(s => {
  s.time = DAY_MS * 0.3; s.weather = 'sun'; s.exp = 1e9; s.coins = 1e9;
  for (let i = 0; i < 6; i++) { buyStrip(s, 'E'); buyStrip(s, 'W'); }
  const tpl = s.animals.find(a => a.type === 'ga' && a.stage === 'truong');
  for (let i = 0; i < 9; i++) s.animals.push({ ...structuredClone(tpl), id: s.nextId++, sex: 'f', pen: tpl.pen, tile: null, nextProduct: 1e15 });
  for (const a of s.animals) { a.hunger = 100; a.nextProduct = 1e15; }
  s.inv.feed_ga = 5;
});
const tick = (page, ms) => page.evaluate(async ms => { const S = await import('/state.js'); S.tick(globalThis.__farm.state, ms); }, ms);
// điểm màn hình (px CSS) của một toạ độ thế giới, theo camera lúc này
const screenAt = (page, x, y) => page.evaluate(([wx, wy]) => {
  const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
  return { x: (wx * f.scale - f.view.camX) / f.dpr + rc.left, y: (wy * f.scale - f.view.camY) / f.dpr + rc.top };
}, [x, y]);
// Đặt người chơi ở (px, py) rồi dồn các con lạc khác (trừ `keep`) ra xa cả người chơi lẫn cửa chuồng, để chúng đứng yên chờ lượt rải thóc.
const place = (page, arg) => page.evaluate(async ({ keep, px, py, pen }) => {
  const S = await import('/state.js'), s = globalThis.__farm.state, R = S.roamOf(s);
  const [gc, gr] = (await import('/farm.js')).mapOf(s).penById[pen].gates[0];
  s.player.x = px; s.player.y = py;
  const far = R.tiles.filter(t => Math.hypot(t.c * 16 + 8 - px, t.r * 16 + 8 - py) > 160 && Math.abs(t.c - gc) + Math.abs(t.r - gr) > 8);
  S.strays(s).filter(a => a.id !== keep).forEach((a, i) => {
    const t = far[(i * 37) % far.length];
    a.tile = { c: t.c, r: t.r }; a.x = t.c * 16 + 8; a.y = t.r * 16 + 8;
  });
}, arg);

test('chạng vạng gà tự về, con lạc có 💤 và mũi tên, lùa tay và rải thóc đưa về đủ', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await seedSave(context, flock);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  // ban ngày: cả đàn ra vườn kiếm ăn
  await tick(page, 3 * 60_000);
  expect(await page.evaluate(() => globalThis.__farm.state.animals.filter(a => a.tile).length)).toBeGreaterThanOrEqual(8);

  // vặn đồng hồ tới 17h59 rồi qua 18h: phần lớn tự về chuồng, còn 1-3 con lạc ngủ ngoài
  await page.evaluate(ms => { globalThis.__farm.state.time = ms; }, DAY_MS * FREE.duskAt - 1000);
  await tick(page, 3000);
  const info = await page.evaluate(async () => {
    const S = await import('/state.js'), s = globalThis.__farm.state, id = s.animals[0].pen;
    return { ...S.penHome(s, id), id, lost: S.strays(s).map(a => a.id) };
  });
  expect(info.lost.length).toBeGreaterThanOrEqual(1);
  expect(info.lost.length).toBeLessThanOrEqual(3);
  expect(info.home).toBe(info.total - info.lost.length);

  // luật cho lạc 1-3 con mỗi tối; cho đủ 3 con (như một đêm lạc nhiều) để thử cả lùa tay lẫn rải thóc
  const lost = await page.evaluate(async id => {
    const S = await import('/state.js'), s = globalThis.__farm.state, R = S.roamOf(s);
    const [gc, gr] = (await import('/farm.js')).mapOf(s).penById[id].gates[0];
    const far = R.tiles.filter(t => Math.abs(t.c - gc) + Math.abs(t.r - gr) > 8);
    for (const a of s.animals) {
      if (S.strays(s).length >= 3 || a.tile || a.type !== 'ga') continue;
      const t = far[(a.id * 7) % far.length];
      a.tile = { c: t.c, r: t.r }; a.x = t.c * 16 + 8; a.y = t.r * 16 + 8; a.stray = true;
    }
    return S.strays(s).map(a => a.id);
  }, info.id);
  expect(lost.length).toBe(3);
  const id0 = lost[0];

  // con lạc đứng tận rìa đông, người chơi ở rìa tây: mũi tên vàng chỉ hướng con lạc ngoài khung nhìn
  const west = await page.evaluate(async id => {
    const S = await import('/state.js'), s = globalThis.__farm.state, a = s.animals.find(x => x.id === id), R = S.roamOf(s);
    const east = R.tiles.reduce((b, t) => (t.c > b.c ? t : b)), w = R.tiles.reduce((b, t) => (t.c < b.c ? t : b));
    a.tile = { c: east.c, r: east.r }; a.x = east.c * 16 + 8; a.y = east.r * 16 + 8;
    return { x: w.c * 16 + 8, y: w.r * 16 + 8 };
  }, id0);
  await place(page, { keep: id0, px: west.x, py: west.y, pen: info.id });
  await expect(page.locator(`.alert-arrow[data-key="stray:${id0}"]:not([hidden])`)).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: testInfo.outputPath('herd-arrow.png') });

  // lùa tay: đứng sau lưng con lạc, nó chạy tránh người rồi qua cửa chuồng → luật ghi là đã về
  const behind = await page.evaluate(async id => {
    const S = await import('/state.js'), s = globalThis.__farm.state, a = s.animals.find(x => x.id === id), R = S.roamOf(s);
    const [gc, gr] = S.animalPen(s, a).gates[0];
    const near = R.tiles.find(t => Math.abs(t.c - gc) + Math.abs(t.r - gr) === 1) ?? R.tiles.find(t => Math.abs(t.c - gc) <= 1 && Math.abs(t.r - gr) <= 2);
    a.tile = { c: near.c, r: near.r }; a.x = near.c * 16 + 8; a.y = near.r * 16 + 8;
    return { x: a.x + (near.c - gc) * 16, y: a.y + (near.r - gr) * 16 };   // đứng phía đối diện cửa chuồng
  }, id0);
  await place(page, { keep: id0, px: behind.x, py: behind.y, pen: info.id });
  await page.waitForFunction(id => globalThis.__farm.state.animals.find(a => a.id === id).tile === null, id0, { timeout: 10_000 });
  await page.screenshot({ path: testInfo.outputPath('herd-push.png') });

  // rải thóc ở cửa chuồng: đứng ngay cửa, chạm vào biển "đã về" → con lạc trong 5 ô chạy về
  const gate = await page.evaluate(async id => {
    const S = await import('/state.js'), s = globalThis.__farm.state, g = S.gateOf(s, id), R = S.roamOf(s);
    const [gc, gr] = (await import('/farm.js')).mapOf(s).penById[id].gates[0];
    const lure = (await import('/data.js')).FREE.lureRadius;
    const spot = R.tiles.filter(t => { const k = Math.max(Math.abs(t.c - gc), Math.abs(t.r - gr)); return k >= 4 && k <= lure; });
    if (!spot.length) throw new Error('không có ô trống quanh cửa chuồng');
    S.strays(s).forEach((a, i) => { const t = spot[(i * 13) % spot.length]; a.tile = { c: t.c, r: t.r }; a.x = t.c * 16 + 8; a.y = t.r * 16 + 8; });
    s.player.x = g.x; s.player.y = g.y;
    return { ...g, left: S.strays(s).length, feed: s.inv.feed_ga };
  }, info.id);
  expect(gate.left).toBe(2);
  await expect(async () => {
    const pt = await screenAt(page, gate.x, gate.y - 6);
    if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
    const now = await page.evaluate(async id => {
      const S = await import('/state.js'), s = globalThis.__farm.state;
      return { rest: S.strays(s).length, feed: s.inv.feed_ga, ...S.penHome(s, id) };
    }, info.id);
    expect(now.rest).toBe(0);
    expect(now.feed).toBeLessThan(gate.feed);
    expect(now.home).toBe(now.total);
  }).toPass({ timeout: 20_000, intervals: [1200] });
  await page.waitForTimeout(400);
  await expect(page.locator('.alert-arrow[data-key^="stray:"]:not([hidden])')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('herd-done.png') });
});
