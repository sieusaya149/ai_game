// Hotfix B: thanh tiến độ / đếm ngược dưới ô cây, cảnh báo "sắp héo", gợi ý mua đất ở mép vườn.
import { test, expect } from '@playwright/test';
import { makeSave, seedSave, plantedCrop } from './helpers.mjs';
import { mapOf } from '../public/state.js';

const wait = async page => { await page.waitForFunction(() => globalThis.__farm?.state); await page.keyboard.press('Shift'); await page.waitForTimeout(800); };

test('ô cây sắp héo hiện chữ "sắp héo" ở tên đích và nút thu hoạch', async ({ page, context }, testInfo) => {
  const save = makeSave(s => {
    s.weather = 'rain'; plantedCrop(s, 0, 1.2); plantedCrop(s, 1, 6.5); plantedCrop(s, 2, 0.5);
    Object.assign(s.player, { ...mapOf(s).plotCenter(1), dir: 0 });   // đứng sát ô 1 (chạm vào là tự thu hoạch mất)
  });
  await seedSave(context, save);
  await page.goto('/'); await wait(page);
  await expect(page.locator('#target-name')).toHaveText('Cải xanh – sắp héo!');
  await expect(page.locator('#main-action')).toContainText('sắp héo');
  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}-${testInfo.project.name === 'mobile' ? 360 : 1280}.png` });
});

test('cây chín chưa gần héo thì không có chữ "sắp héo"', async ({ page, context }) => {
  await seedSave(context, makeSave(s => { s.weather = 'rain'; plantedCrop(s, 0, 1.2); Object.assign(s.player, { ...mapOf(s).plotCenter(0), dir: 0 }); }));
  await page.goto('/'); await wait(page);
  await expect(page.locator('#target-name')).toHaveText('Cải xanh');
  await expect(page.locator('#main-action')).not.toContainText('sắp héo');
});

test('chưa đủ cấp: đứng sát mép vườn thấy gợi ý mua đất từ cấp 5, kèm kích thước dải và giá', async ({ page, context }) => {
  await seedSave(context, makeSave(s => { s.player.x = 43 * 16 + 8; s.player.y = 22 * 16 + 8; s.player.dir = 2; }));
  await page.goto('/'); await wait(page);
  await expect(page.locator('#target-name')).toContainText('Mua đất ở mép vườn từ cấp 5');
  await expect(page.locator('#target-name')).toContainText('500 xu');
});
