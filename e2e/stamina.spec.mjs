import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { mapOf, sceneMap } from '../public/state.js';
import { DAY_MS } from '../public/data.js';

// Bấm một phím vô hại trước: lần chạm đầu tiên tạo AudioContext, trình duyệt ẩn khựng cả giây.
async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
}

// Đứng trước cửa nhà ở vườn, đi sang phải 1,2 giây; trả về quãng đường đi được.
async function walked(browser, testInfo, stamina) {
  const ctx = await browser.newContext(testInfo.project.use);
  const page = await ctx.newPage();
  await seedSave(ctx, makeSave(s => {
    const at = mapOf(s).building('house').at;
    Object.assign(s.player, { x: at.x, y: at.y + 16, dir: 2 });
    s.stamina = stamina;
  }));
  await page.goto('/');
  await ready(page);
  const x0 = await page.evaluate(() => globalThis.__farm.state.player.x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1200);
  await page.keyboard.up('ArrowRight');
  const out = await page.evaluate(() => ({ dx: globalThis.__farm.state.player.x, tired: document.getElementById('hud-stamina').classList.contains('tired'), text: document.getElementById('hud-stam-text').textContent }));
  await ctx.close();
  return { d: out.dx - x0, tired: out.tired, text: out.text };
}

test('hết thể lực: đi chậm thấy rõ, HUD báo mệt; đầy thể lực thì đi bình thường', async ({ browser }, testInfo) => {
  const full = await walked(browser, testInfo, 100);
  const empty = await walked(browser, testInfo, 0);
  expect(full.tired).toBe(false);
  expect(full.text).toBe('100');
  expect(empty.tired).toBe(true);
  expect(empty.text).toBe('0');
  expect(full.d).toBeGreaterThan(40);
  expect(empty.d).toBeGreaterThan(10);
  expect(empty.d / full.d).toBeLessThan(0.7);   // chậm ×2 (có khựng đầu nên chừa dư)
  expect(empty.d / full.d).toBeGreaterThan(0.3);
});

test('vào nhà ngủ lúc 19h: sáng ra thanh thể lực đầy, đã sang ngày mới', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await seedSave(context, makeSave(s => {
    s.time = (19 - 6) / 24 * DAY_MS;
    s.stamina = 12;
    s.scene = 'house';
    const bed = sceneMap(s).building('bed').at;
    Object.assign(s.player, { x: bed.x, y: bed.y, dir: 0 });
  }));
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#hud-stam-text')).toHaveText('12');
  const day0 = await page.evaluate(() => globalThis.__farm.state.day);
  // chạm vào giường: hành động chính là Ngủ
  const pt = await page.evaluate(async () => {
    const { sceneMap } = await import('/state.js');
    const f = globalThis.__farm, b = sceneMap(f.state).building('bed'), rc = document.getElementById('game-canvas').getBoundingClientRect();
    return { x: ((b.x + 16) * f.scale - f.view.camX) / f.dpr + rc.left, y: ((b.y + 12) * f.scale - f.view.camY) / f.dpr + rc.top };
  });
  await page.waitForTimeout(400);
  if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.day), { timeout: 10_000 }).toBe(day0 + 1);
  await expect(page.locator('#hud-stam-text')).toHaveText('100');
  const s = await page.evaluate(() => { const s = globalThis.__farm.state; return { stamina: s.stamina, t: s.time % 1200000 }; });
  expect(s.stamina).toBe(100);
  expect(s.t).toBeLessThan(10_000);   // 6h sáng
  await expect(page.locator('#hud-stamina')).not.toHaveClass(/tired/);
});
