import { test, expect } from '@playwright/test';
import { makeSave, plantedCrop, seedSave } from './helpers.mjs';

test('vắng 12 tiếng: màn "Trong lúc bạn vắng nhà" có dòng đóng băng, đóng lại được, HUD có mùa', async ({ page, context }) => {
  await seedSave(context, makeSave(s => { plantedCrop(s, 0, 0.5); s.savedAt = Date.now() - 12 * 3600_000; }));
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');

  const away = page.locator('#away');
  await expect(away).toBeVisible();
  await expect(away).toContainText('Trong lúc bạn vắng nhà');
  await expect(away).toContainText('Vườn đã đóng băng 4 giờ');
  // cải gieo dở có tin trong 8 giờ chạy bù (thường là chín; sâu bệnh ngẫu nhiên có thể làm nó hỏng/chết trước)
  await expect(away).toContainText(/ô cải xanh/);

  // không tràn ngang
  const box = await page.locator('.away-card').boundingBox(), vw = page.viewportSize().width;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vw);

  await away.getByRole('button', { name: /Về làm việc/ }).click();
  await expect(away).toBeHidden();
  await expect(page.locator('#hud-season')).toHaveText(/Xuân|Hạ|Thu|Đông/);
  await expect(page.locator('#hud-clock')).toBeVisible();
});

test('mở lại ngay thì không có màn tóm tắt', async ({ page, context }) => {
  await seedSave(context, makeSave());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await expect(page.locator('#away')).toBeHidden();
  await expect(page.locator('#hud-season')).toHaveText(/Xuân|Hạ|Thu|Đông/);
});
