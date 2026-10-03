import { test, expect } from '@playwright/test';
import { makeSave, seedSave, tilePoint, startDrag, tapPlot } from './helpers.mjs';

// Cấp 4 (được 2 khối ruộng), đủ xu, có một chậu hoa trong túi.
const save = () => makeSave(s => {
  s.exp = 25 + 70 + 129 + 10;
  s.coins = 2000;
  s.inv.deco_flower = 1;
  s.player.x = 36 * 16 + 8; s.player.y = 22 * 16 + 8;
});
const fields = page => page.evaluate(() => globalThis.__farm.state.farm.ents.filter(e => e.kind === 'field').map(e => ({ c: e.c, r: e.r, plots: e.plots })));

async function enterBuild(page, context) {
  await seedSave(context, save());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');   // Chromium headless khựng ở lần nhấn đầu
  await page.locator('#bb-build').click();
  await expect(page.locator('#buildbar')).toBeVisible();
  await page.waitForTimeout(700);
}
async function dragTo(page, touch, from, to, check) {
  const d = await startDrag(page, touch, await tilePoint(page, ...from));
  await d.move(await tilePoint(page, ...to));
  await check?.();
  await d.end();
}

test('đặt khung khối ruộng mới miễn phí → mở ô có cờ → cuốc được ô đó', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await enterBuild(page, context);
  await expect(page.locator('#build-tray')).toContainText('Khối ruộng 1/2');
  await page.locator('.bt-card').first().click();
  await dragTo(page, touch, [33, 20], [37, 24], async () => {
    await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '1');
  });
  await expect.poll(async () => (await fields(page)).length).toBe(2);
  await expect(page.locator('#build-tray')).toContainText('Cấp 8 để có thêm');
  await expect(page.locator('.bt-card').first()).toBeDisabled();   // đủ 2/2: không chọn thêm được
  expect(await page.evaluate(() => globalThis.__farm.state.coins)).toBe(2000);   // đặt khung miễn phí
  await page.locator('#build-done').click();
  await expect(page.locator('#buildbar')).toBeHidden();

  await page.waitForTimeout(800);   // camera về theo nhân vật
  const idx = (await fields(page))[1].plots[0];
  expect(await page.evaluate(i => globalThis.__farm.state.plots[i].unlocked, idx)).toBe(false);
  await tapPlot(page, idx, touch, () => page.evaluate(i => globalThis.__farm.state.plots[i].unlocked, idx));   // chạm ô có cờ → mở ô (trả xu)
  expect(await page.evaluate(() => globalThis.__farm.state.coins)).toBeLessThan(2000);
  await tapPlot(page, idx, touch);
  await expect.poll(() => page.evaluate(i => globalThis.__farm.state.plots[i].soil, idx), { timeout: 15000 }).toBe('tilled');
  await page.reload();
  await page.waitForFunction(() => globalThis.__farm?.state);
  expect((await fields(page)).length).toBe(2);
});

test('đặt chậu hoa từ túi bằng chế độ xây dựng, rồi cất lại', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await enterBuild(page, context);
  await page.locator('.bt-tab', { hasText: 'Trang trí' }).click();
  await expect(page.locator('.bt-card')).toContainText('×1');
  await page.locator('.bt-card').click();
  await dragTo(page, touch, [33, 20], [34, 21], async () => {
    await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '1');
  });
  const deco = () => page.evaluate(() => ({ e: globalThis.__farm.state.farm.ents.find(x => x.kind === 'deco'), n: globalThis.__farm.state.inv.deco_flower ?? 0 }));
  await expect.poll(async () => (await deco()).e?.c).toBe(34);
  expect((await deco()).n).toBe(0);
  await expect(page.locator('#build-tray')).toContainText('Chưa có đồ trang trí');

  // chạm vào chậu hoa → nút Cất → về túi
  await page.locator('.bt-tab', { hasText: 'Trang trí' }).click();
  const p = await tilePoint(page, 34, 21);
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
  await expect(page.locator('#build-store')).toBeVisible();
  await page.locator('#build-store').click();
  await expect.poll(async () => (await deco()).n).toBe(1);
  expect((await deco()).e).toBeUndefined();

  // đặt lại rồi Xong: giữ nguyên sau khi tải lại
  await page.locator('.bt-card').click();
  await dragTo(page, touch, [33, 20], [34, 21]);
  await page.locator('#build-done').click();
  await page.reload();
  await page.waitForFunction(() => globalThis.__farm?.state);
  expect((await deco()).e?.c).toBe(34);
});
