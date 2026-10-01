import { test, expect } from '@playwright/test';
import { createCharacter, tapPlot } from './helpers.mjs';

test('người chơi mới: tạo nhân vật, cuốc, gieo, tưới', async ({ page }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await page.goto('/');
  await createCharacter(page);

  const tut = page.locator('#tutorial');
  await expect(tut).toContainText('Bước 1/');
  await expect(page.locator('#hud-can')).toHaveText('10/10');

  await tapPlot(page, 0, touch);
  await expect(tut).toContainText('Gieo hạt cải', { timeout: 15_000 });

  await tapPlot(page, 0, touch);
  await expect(tut).toContainText('Tưới nước', { timeout: 15_000 });

  await tapPlot(page, 0, touch);
  await expect(page.locator('#hud-can')).toHaveText('9/10', { timeout: 15_000 });
  await expect(tut).toContainText('Đợi cây lớn');
});
