import { test, expect } from '@playwright/test';
import { createCharacter } from './helpers.mjs';

test('smoke live: trang tải được, không lỗi console, tạo nhân vật được', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('#creator')).toBeVisible();
  await createCharacter(page, 'Smoke');
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);

  // Dọn dữ liệu trình duyệt của test
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
});
