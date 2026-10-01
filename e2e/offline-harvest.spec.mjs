import { test, expect } from '@playwright/test';
import { makeSave, plantedCrop, seedSave, installWarp, timeWarp, tapPlot } from './helpers.mjs';

test('save ghi sẵn: tua thời gian thì cây chín và thu hoạch được', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await seedSave(context, makeSave(s => plantedCrop(s, 0, 0.95)));
  await installWarp(context);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);

  // Chưa chín (cải cần ~90s, còn ~4s thực)
  expect(await page.evaluate(() => globalThis.__farm.state.plots[0].crop.progress)).toBeLessThan(1);
  await expect(page.locator('#bb-seed-n')).toHaveText('6');

  await timeWarp(page, 25_000);
  expect(await page.evaluate(() => globalThis.__farm.state.plots[0].crop.progress)).toBeGreaterThanOrEqual(1);

  await tapPlot(page, 0, touch);
  // Thu hoạch xong: ô trống, túi đồ có cải
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.plots[0].crop), { timeout: 15_000 }).toBeNull();
  await page.locator('.bb-btn[data-panel="bag"]').click();
  await expect(page.locator('#panel-root .cell', { has: page.getByText('Cải xanh', { exact: true }) })).toContainText('×4');
});
