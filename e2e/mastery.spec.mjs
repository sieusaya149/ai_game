// Issue 51: cấp thành thạo. Cây ngắn ngày ở 19 lần thu hoạch, thu thêm một ô thì lên cấp 2.
import { test, expect } from '@playwright/test';
import { makeSave, plantedCrop, seedSave, tapPlot } from './helpers.mjs';

test('thu hoạch lần thứ 20 một cây ngắn ngày: có thông báo và màn chúc mừng lên cấp 2, chọn hạt hiện đúng cấp và tiến độ', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await context.addInitScript(() => { try { localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {} });
  await seedSave(context, makeSave(s => {
    plantedCrop(s, 0, 1);
    s.mastery.cai = { lv: 1, n: 19 };
    s.inv.seed_cai = 3; s.selectedSeed = 'cai';
  }));
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
  // trước khi thu hoạch, chọn hạt hiện cấp 1 và 19/20
  await page.locator('#bb-seed').click();
  await expect(page.locator('.mastery[data-crop="cai"]')).toHaveText('🟡 Cấp 1 · 19/20 lần');
  await page.keyboard.press('Escape');
  await tapPlot(page, 0, touch, () => page.evaluate(() => !globalThis.__farm.state.plots[0].crop));
  await expect(page.locator('#celebrate [data-celeb="mastery"]')).toContainText('Thành thạo Cải xanh cấp 2');
  await expect(page.locator('#toasts')).toContainText('Thành thạo cải xanh lên cấp 2');
  // EXP thưởng có thể kéo theo màn lên cấp người chơi: bấm hết các màn
  for (let i = 0; i < 3 && await page.locator('#celebrate').isVisible(); i++) await page.locator('#celebrate').getByRole('button', { name: 'Tuyệt vời!' }).click();
  await expect(page.locator('#celebrate')).toBeHidden();
  await page.locator('#bb-seed').click();
  await expect(page.locator('.mastery[data-crop="cai"]')).toHaveText('🟡 Cấp 2 · 20/60 lần');
});
