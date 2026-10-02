// Chơi online ổn định (phần seam 3 không thấy): đổi từ vườn chơi đơn sang vườn online khi đang đứng yên một chỗ.
// Tìm ra lúc viết smoke live: nút hành động mất hẳn nếu vào lại đúng chỗ cũ (cùng mục tiêu) sau khi rời vườn.
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, seedSave, closeAway } from './helpers.mjs';

const GATE_AT = { x: 488, y: 364 };   // trước cổng bạn bè trong làng
const uniq = () => 'On' + Math.random().toString(36).slice(2, 7);

test('đứng trước cổng bạn bè rồi mang vườn chơi đơn lên làng: nút hành động vẫn hiện và mở được bảng Bạn bè', async ({ page, context }) => {
  test.setTimeout(60_000);
  await seedSave(context, makeSave(s => { s.scene = 'village'; Object.assign(s.player, { ...GATE_AT, dir: 3 }); }, { name: 'Bé Solo' }));
  await page.goto('/');
  await expect(page.locator('#main-action')).toBeVisible();   // chơi đơn: cổng có nút "Xem cổng bạn bè"

  await page.locator('.bb-btn[data-panel="settings"]').click();
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await page.getByRole('button', { name: 'Tạo tài khoản mới' }).click();
  const name = uniq();
  await page.getByPlaceholder('Tên nhân vật').fill(name);
  await page.getByPlaceholder('PIN 6 số').fill('123456');
  await page.getByPlaceholder('Mã mời').fill((await runAdmin('invite', '--db', E2E_DB)).out);
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await page.getByRole('button', { name: /Mang vườn chơi đơn lên/ }).click();
  await expect(page.locator('#hud-name')).toHaveText(name);
  await closeAway(page);

  // vẫn đứng đúng chỗ cũ, trước cùng cái cổng: nút hành động phải hiện lại
  await expect(page.locator('#target-name')).toBeVisible();
  await expect(page.locator('#main-action')).toBeVisible();
  await page.locator('#main-action').click();
  await expect(page.locator('.sheet-head h2')).toHaveText(/Bạn bè/);
});
