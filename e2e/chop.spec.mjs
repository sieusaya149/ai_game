import { test, expect } from '@playwright/test';
import { makeSave, seedSave, tilePoint } from './helpers.mjs';

// Đứng trên đường đất cạnh cây (35,30).
const save = () => makeSave(s => { s.player.x = 36 * 16 + 8; s.player.y = 32 * 16 + 8; s.player.dir = 0; });
const st = page => page.evaluate(() => { const s = globalThis.__farm.state; return { wood: s.inv.wood ?? 0, tree: s.farm.ents.some(e => e.kind === 'tree' && e.c === 35 && e.r === 30), p: s.player }; });

test('chạm cây → chặt → được gỗ → đi xuyên qua ô đó', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await seedSave(context, save());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
  await page.waitForTimeout(800);
  const tap = async () => { const p = await tilePoint(page, 35, 30); if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y); };

  for (let i = 0; i < 4 && (await st(page)).tree; i++) {
    await tap();
    await expect.poll(async () => (await st(page)).wood, { timeout: 5000 }).toBeGreaterThan(0).catch(() => {});
  }
  expect((await st(page)).wood).toBeGreaterThan(0);
  expect((await st(page)).tree).toBe(false);

  // ô trống rồi: chạm vào đó nhân vật đi tới đúng ô
  await tap();
  await expect.poll(async () => { const { p } = await st(page); return Math.hypot(p.x - (35 * 16 + 8), p.y - (30 * 16 + 8)); }, { timeout: 10000 }).toBeLessThan(10);
});
