import { test, expect } from '@playwright/test';
import { makeSave, seedSave, installWarp, timeWarp } from './helpers.mjs';
import { mapOf, placeEntity, canPlace, buyAnimal, upgradePen, footprint } from '../public/state.js';
import { DAY_MS, TANK } from '../public/data.js';

// Vòi sen chuồng cấp 3 (issue 59): vườn có máy bơm, bồn đầy 200 lần nước, chuồng heo cấp 3 trong tầm nước với 3 con heo dơ bét.
// Còn 1 phút nữa là 6h sáng → tua 2 phút → cả chuồng sạch, bồn còn 197; chạm máng thấy "Vòi sen đang bật (sáng nay tắm 3/3 con)".
const gap = (a, b) => Math.max(0, a.c - (b.c + b.w - 1), b.c - (a.c + a.w - 1), a.r - (b.r + b.h - 1), b.r - (a.r + a.h - 1));
const save = () => makeSave(s => {
  s.coins = 1e7; s.exp = 1e6; s.animals = []; s.coUtQuest = null;
  s.time = 0.2 * DAY_MS;   // chợ mở để mua heo
  const well = s.farm.ents.find(e => e.kind === 'well'), o = s.farm.owned;
  well.lv = 4;
  const near = (what, w, h, ft, d) => { for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (gap({ c, r, w, h }, ft) <= d && canPlace(s, what, c, r).ok) return placeEntity(s, what, c, r); };
  near({ kind: 'tank' }, 2, 2, footprint(well), 2);
  const tank = s.farm.ents.find(e => e.kind === 'tank');
  const pen = near({ kind: 'pen', pen: 'pig' }, 6, 9, footprint(tank), TANK.range);
  upgradePen(s, pen.id); upgradePen(s, pen.id);
  for (let i = 0; i < 3; i++) buyAnimal(s, 'heo', 'f');
  for (const a of s.animals) { a.dirty = 100; a.happy = 50; a.hunger = 100; a.wallowAt = 0; }
  s.coUtQuest = null;   // thẻ nhiệm vụ Cô Út (mua heo đầu tiên thì có) che nửa trên màn hẹp
  s.water.level = 200;
  s.time = DAY_MS - 60_000; s.day = 1; s.wday = 1; s.weather = 'cloud';   // 5:59 sáng ngày 2 (giờ game)
  const g = mapOf(s).penById[pen.id].gates[0];
  Object.assign(s.player, { x: g[0] * 16 + 8, y: (g[1] - 1) * 16 + 8, dir: 0 });
});
const st = page => page.evaluate(() => { const s = globalThis.__farm.state; return { level: s.water.level, pigs: s.animals.filter(a => a.type === 'heo').map(a => a.dirty) }; });
const screenOf = (page, x, y) => page.evaluate(([x, y]) => {
  const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
  return { x: (x * f.scale - f.view.camX) / f.dpr + rc.left, y: (y * f.scale - f.view.camY) / f.dpr + rc.top };
}, [x, y]);

test('chuồng heo cấp 3 có bồn đầy, heo dơ → tua tới sáng → vòi sen tắm cả chuồng sạch, bồn giảm; chạm máng thấy vòi sen đang bật', async ({ page, context }, testInfo) => {
  test.setTimeout(60_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await installWarp(context);
  await seedSave(context, save());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  const before = await st(page);
  expect(before.pigs).toEqual([100, 100, 100]);
  expect(before.level).toBe(200);

  await timeWarp(page, 2 * 60_000);
  const after = await st(page);
  expect(after.pigs).toEqual([0, 0, 0]);
  expect(after.level).toBe(197);

  // chạm máng chuồng heo: dòng vòi sen đang bật, cả 3 con đã tắm sáng nay
  const tr = await page.evaluate(async () => { const { mapOf } = await import('/state.js'); const t = mapOf(globalThis.__farm.state).pens.pig.trough; return { x: t.x + 8, y: t.y - 3 }; });
  const chip = page.locator('.chip', { hasText: 'Vòi sen đang bật' });
  await expect(async () => {
    const p = await screenOf(page, tr.x, tr.y);
    if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
    await expect(chip).toBeVisible({ timeout: 2500 });
  }).toPass({ timeout: 20_000 });
  await expect(chip).toContainText('3/3');
  expect(errors).toEqual([]);
});
