import { test, expect } from '@playwright/test';
import { makeSave, seedSave, plantedCrop, tapPlot } from './helpers.mjs';

// Bấm một phím vô hại trước: lần chạm đầu tiên tạo AudioContext, trình duyệt ẩn khựng cả giây làm chạm bị coi là giữ lâu.
async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
}
const basket = page => page.evaluate(async () => { const s = globalThis.__farm.state, G = await import('/state.js'); return { n: G.basketCount(s), cap: G.basketCap(s), kho: (s.inv.trung ?? 0) + (s.inv.cai ?? 0), left: s.plots.filter(p => p.crop).length }; });

test('giỏ gần đầy → thu hoạch tới khi bị khóa → về kho cất → thu hoạch tiếp được', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // cải chín ở ô 0, 1, 2 (mỗi ô 4 cải); giỏ có 22/30 nên chỉ thu thêm được 2 ô
  await seedSave(context, makeSave(s => {
    s.basket = { trung: 22 };
    for (const i of [0, 1, 2]) plantedCrop(s, i, 1);
  }));
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#hud-basket-n')).toHaveText('22/30');

  await tapPlot(page, 0, touch);
  await expect.poll(async () => (await basket(page)).n, { timeout: 10_000 }).toBe(26);
  await tapPlot(page, 1, touch);
  await expect.poll(async () => (await basket(page)).n, { timeout: 10_000 }).toBe(30);
  await expect(page.locator('#hud-basket')).toHaveClass(/full/);
  await page.screenshot({ path: `test-results/basket-hud-${testInfo.project.name}.png` });

  // ô thứ ba bị khóa: giỏ đầy, cây vẫn còn
  await tapPlot(page, 2, touch);
  await expect(page.locator('#toasts')).toContainText('Giỏ đầy, về kho cất đồ', { timeout: 10_000 });
  expect((await basket(page)).n).toBe(30);
  expect((await basket(page)).left).toBe(1);

  // vào nhà kho, cất hết
  const shed = await page.evaluate(async () => { const b = (await import('/state.js')).mapOf(globalThis.__farm.state).building('shed'); return { x: b.x + 10, y: b.y + 10 }; });
  // đi dần về phía nhà kho (chạm về hướng đó cho nhân vật đi, camera theo), tới gần thì chạm vào kho
  for (let i = 0; i < 20 && !(await page.locator('#panel-root').isVisible()); i++) {
    await page.waitForTimeout(600);
    const p = await page.evaluate(([x, y]) => {
      const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
      const top = document.getElementById('hud').getBoundingClientRect().bottom + 4, bot = document.getElementById('bottombar').getBoundingClientRect().top - 4;
      const px = (x * f.scale - f.view.camX) / f.dpr + rc.left, py = (y * f.scale - f.view.camY) / f.dpr + rc.top;
      const ok = px > 4 && px < innerWidth - 4 && py > top && py < bot;
      return { ok, x: Math.min(innerWidth - 20, Math.max(20, px)), y: Math.min(bot - 20, Math.max(top + 20, py)) };
    }, [shed.x, shed.y]);
    if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
  }
  await expect(page.locator('#panel-root')).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: `test-results/basket-shed-${testInfo.project.name}.png` });
  await page.getByRole('button', { name: 'Cất hết vào kho' }).click();
  await expect.poll(async () => (await basket(page)).n).toBe(0);
  expect((await basket(page)).kho).toBe(22 + 8);   // 22 trứng + 8 cải;
  await page.screenshot({ path: `test-results/basket-shed2-${testInfo.project.name}.png` });
  await page.locator('#panel-root .close').click();
  await expect(page.locator('#panel-root')).toBeHidden();
  await expect(page.locator('#hud-basket-n')).toHaveText('0/30');

  // giờ thu hoạch tiếp được
  await tapPlot(page, 2, touch);
  await expect.poll(async () => (await basket(page)).n, { timeout: 10_000 }).toBe(4);
  expect(errors).toEqual([]);
});
