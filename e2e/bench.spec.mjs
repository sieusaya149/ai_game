import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { sceneMap } from '../public/state.js';

// Ghế đá ở làng: chạm vào thì nhân vật ngồi (state.sit) và hình vẽ đổi, không còn đứng nguyên.
async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
}

// Chụp vùng quanh nhân vật (điểm ảnh canvas) để so hình đứng và hình ngồi.
const shot = page => page.evaluate(() => {
  const f = globalThis.__farm, p = f.state.player, c = document.getElementById('game-canvas');
  const x = Math.round(p.x * f.scale - f.view.camX) - 40, y = Math.round(p.y * f.scale - f.view.camY) - 90;
  const d = c.getContext('2d').getImageData(Math.max(0, x), Math.max(0, y), 80, 100).data;
  let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) >>> 0;
  return h;
});

test('chạm ghế đá ở làng: nhân vật ngồi và vẫn ngồi, thể lực hồi dần', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await seedSave(context, makeSave(s => {
    s.scene = 'village'; s.stamina = 20; s.time = 0.1 * 20 * 60_000;
    const b = sceneMap(s, 'village').building('bench0');
    Object.assign(s.player, { x: b.at.x, y: b.at.y, dir: 0 });
  }));
  await page.goto('/');
  await ready(page);
  await page.waitForTimeout(600);
  const standing = await shot(page);
  await page.waitForTimeout(700);
  expect(await shot(page), 'đứng yên thì hình ổn định').toBe(standing);
  const pt = await page.evaluate(async () => {
    const { sceneMap } = await import('/state.js');
    const f = globalThis.__farm, b = sceneMap(f.state).building('bench0'), rc = document.getElementById('game-canvas').getBoundingClientRect();
    return { x: ((b.x + 12) * f.scale - f.view.camX) / f.dpr + rc.left, y: ((b.y + 8) * f.scale - f.view.camY) / f.dpr + rc.top };
  });
  await expect.poll(async () => {
    if (await page.evaluate(() => globalThis.__farm.state.sit)) return true;
    if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(1200);
    return page.evaluate(() => globalThis.__farm.state.sit);
  }, { timeout: 15_000 }).toBe(true);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => globalThis.__farm.state.sit)).toBe(true);
  expect(await shot(page)).not.toBe(standing);   // hình vẽ ngồi khác hình đứng
});
