import { test, expect } from '@playwright/test';
import { makeSave, seedSave, installWarp, timeWarp, tapPlot } from './helpers.mjs';
import { mapOf, canPlace, placeEntity } from '../public/state.js';
import { COMPOST } from '../public/data.js';

// Hố ủ phân (issue 61): vườn có một ô cây chết và hố ủ cạnh ruộng, trong kho có 1 phân chuồng, chưa có phân bón.
// Nhổ cây chết (được 1 cây chết) → chạm hố ủ: bỏ cả hai món vào → đậy hố → tua 2 ngày game → lấy 1 phân bón → bón vào ô mới gieo.
const save = () => makeSave(s => {
  Object.assign(s, { coins: 5000, exp: 400, weather: 'cloud', orders: [], nextOrderAt: 1e15 });
  Object.assign(s.inv, { fertilizer: 0, manure: 1, seed_cai: 3 });
  s.selectedSeed = 'cai';
  const field = s.farm.ents.find(e => e.kind === 'field'), i = field.plots[0], p = s.plots[i];
  Object.assign(p, { soil: 'tilled', water: 50, weeds: false });
  p.crop = { id: 'cai', progress: 0.4, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: true, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } };
  // hố ủ ở chỗ trống gần khối ruộng nhất mà chỗ đứng (ô dưới hố) cách ruộng từ 3 ô (đứng ở hố thì chọn hố chứ không chọn ô ruộng)
  const o = s.farm.owned, spots = [], near = (c, r) => c >= field.c - 3 && c <= field.c + 5 && r >= field.r - 3 && r <= field.r + 5;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (!near(c + 1, r + 1) && canPlace(s, { kind: 'compost' }, c, r).ok) spots.push({ c, r, d: Math.hypot(c - field.c - 1, r - field.r - 1) });
  spots.sort((a, b) => a.d - b.d);
  const r = placeEntity(s, { kind: 'compost' }, spots[0].c, spots[0].r);
  if (!r.ok) throw new Error(r.msg);
  const at = mapOf(s).plotCenter(i);
  Object.assign(s.player, { x: at.x, y: at.y + 20, dir: 3 });
});
const st = page => page.evaluate(async () => {
  const S = await import('/state.js'), s = globalThis.__farm.state, f = s.farm.ents.find(e => e.kind === 'field');
  return { pit: S.compostInfo(s), dead: S.haveItem(s, 'cay_chet'), manure: S.haveItem(s, 'manure'), fert: S.haveItem(s, 'fertilizer'), crop: s.plots[f.plots[0]].crop, idx: f.plots[0] };
});
// Chạm vào hố ủ trên canvas (nhân vật tự đi tới rồi làm hành động chính); chưa thấy kết quả thì chạm lại
async function tapPit(page, touch, until) {
  for (let k = 0; k < 4; k++) {
    const pt = await page.evaluate(async () => {
      const S = await import('/state.js'), f = globalThis.__farm, b = S.mapOf(f.state).building('compost'), r = document.getElementById('game-canvas').getBoundingClientRect();
      const wx = b.x + 16, wy = b.y + 12;
      return { x: (wx * f.scale - f.view.camX) / f.dpr + r.left, y: (wy * f.scale - f.view.camY) / f.dpr + r.top };
    });
    if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
    const end = Date.now() + 5000;
    while (Date.now() < end) { if (await until()) return; await page.waitForTimeout(100); }
  }
  throw new Error('Chạm hố ủ nhiều lần mà không thấy kết quả');
}
const press = (page, touch, loc) => (touch ? loc.tap() : loc.click());

test('nhổ cây chết bỏ vào hố ủ, tua 2 ngày game, lấy phân bón ra bón cho ô mới gieo', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await installWarp(context);
  await seedSave(context, save());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');   // Chromium headless khựng ở lần nhấn đầu
  const { idx } = await st(page);

  // nhổ cây chết: được 1 "Cây chết" trong kho
  await tapPlot(page, idx, touch, async () => (await st(page)).dead === 1);
  expect((await st(page)).crop).toBeNull();

  // chạm hố ủ: hành động chính là bỏ đồ vào (cây chết + phân chuồng)
  await tapPit(page, touch, async () => (await st(page)).pit.n === 2);
  expect(await st(page)).toMatchObject({ dead: 0, manure: 0, pit: { state: 'filling', n: 2 } });
  await expect(page.locator('#target-name')).toHaveText('Hố ủ phân · 2/12 món', { timeout: 5000 });
  await expect(page.locator('#main-action .ma-label')).toContainText('Đậy hố');
  await press(page, touch, page.locator('#main-action'));
  await expect.poll(async () => (await st(page)).pit.state, { timeout: 5000 }).toBe('composting');
  await expect(page.locator('#target-name')).toContainText('Hố ủ phân · đang ủ 2 món · còn');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `test-results/compost-ủ-${testInfo.project.name}.png` });

  // tua 2 ngày game (chạy bù): hố xong, có dấu trên hình, lấy được 1 phân bón
  await timeWarp(page, COMPOST.ms + 60_000);
  expect((await st(page)).pit.state).toBe('ready');
  await expect(page.locator('#target-name')).toHaveText('Hố ủ phân · xong, 1 phân bón', { timeout: 5000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `test-results/compost-xong-${testInfo.project.name}.png` });
  await press(page, touch, page.locator('#main-action'));
  await expect.poll(async () => (await st(page)).fert, { timeout: 5000 }).toBe(1);
  expect((await st(page)).pit.state).toBe('empty');

  // cuốc, gieo cải ở ô vừa dọn rồi bón bằng phân từ hố ủ
  await tapPlot(page, idx, touch, async () => (await st(page)).crop?.id === 'cai' || (await page.evaluate(i => globalThis.__farm.state.plots[i].soil, idx)) === 'tilled');
  await tapPlot(page, idx, touch, async () => (await st(page)).crop?.id === 'cai');
  // chạm ô: tưới (nếu đất khô) rồi bón phân là hành động chính kế tiếp
  await tapPlot(page, idx, touch, async () => (await st(page)).crop?.fert === true);
  expect((await st(page)).fert).toBe(0);
  expect(errors).toEqual([]);
});
