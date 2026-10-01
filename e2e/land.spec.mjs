import { test, expect } from '@playwright/test';
import { makeSave, seedSave, tilePoint, startDrag } from './helpers.mjs';

// Cấp 5, đủ xu, đứng sát mép Đông của đất nhà, có một chậu hoa trong túi.
const save = () => makeSave(s => {
  s.exp = 25 + 70 + 129 + 200 + 10;
  s.coins = 2000;
  s.inv.deco_flower = 1;
  s.player.x = 43 * 16 + 8; s.player.y = 22 * 16 + 8; s.player.dir = 2;
});
const st = page => page.evaluate(() => { const s = globalThis.__farm.state; return { owned: s.farm.owned, coins: s.coins, wood: s.inv.wood ?? 0, bushes: s.farm.ents.filter(e => e.kind === 'bush').map(e => [e.c, e.r, e.id]), p: s.player }; });

test('mua dải Đông → dọn một bụi → có gỗ → đặt chậu hoa lên ô vừa dọn', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await seedSave(context, save());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');   // Chromium headless khựng ở lần nhấn đầu
  await page.waitForTimeout(800);

  // mua đất: nút hành động chính hiện giá và cấp, hỏi lại trước khi trừ xu
  const main = page.locator('#main-action');
  await expect(main).toContainText('Mua đất phía Đông');
  await expect(main).toContainText('500 xu');
  await main.click();
  await expect(page.locator('.dialog')).toBeVisible();
  await page.locator('.dialog').getByRole('button', { name: 'Mua' }).click();
  await expect.poll(async () => (await st(page)).owned.w).toBe(28);
  expect((await st(page)).coins).toBe(1500);

  // dọn bụi gần nhất: chạm vào bụi, nhân vật tự đi tới rồi dọn
  const before = await st(page);
  const [bc, br] = before.bushes.sort((a, b) => Math.hypot(a[0] - 43, a[1] - 22) - Math.hypot(b[0] - 43, b[1] - 22))[0];
  await page.waitForTimeout(900);   // camera theo đất mới
  const bp = await tilePoint(page, bc, br);
  if (touch) await page.touchscreen.tap(bp.x, bp.y); else await page.mouse.click(bp.x, bp.y);
  await expect.poll(async () => (await st(page)).wood, { timeout: 15000 }).toBeGreaterThan(0);
  expect((await st(page)).bushes.some(b => b[0] === bc && b[1] === br)).toBe(false);

  // túi đồ thấy gỗ
  await page.locator('[data-panel="bag"]').click();
  await expect(page.locator('#panel-root')).toContainText('Gỗ');
  await page.locator('#panel-root .close').click();
  await expect(page.locator('#panel-root')).toBeHidden();

  // đặt chậu hoa lên ô vừa dọn bằng chế độ xây dựng
  await page.locator('#bb-build').click();
  await expect(page.locator('#buildbar')).toBeVisible();
  await page.waitForTimeout(700);
  await page.locator('.bt-tab', { hasText: 'Trang trí' }).click();
  await page.locator('.bt-card').click();
  const d = await startDrag(page, touch, await tilePoint(page, 42, 22));
  await d.move(await tilePoint(page, bc, br));
  await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '1');
  await d.end();
  await expect.poll(() => page.evaluate(([c, r]) => globalThis.__farm.state.farm.ents.some(e => e.kind === 'deco' && e.c === c && e.r === r), [bc, br])).toBe(true);
});
