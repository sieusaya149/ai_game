import { test, expect } from '@playwright/test';
import { makeSave, seedSave, installWarp, timeWarp, tapPlot } from './helpers.mjs';
import { mapOf, sceneMap } from '../public/state.js';
import { DAY_MS } from '../public/data.js';

// Bấm một phím vô hại trước: lần chạm đầu tiên tạo AudioContext, trình duyệt ẩn khựng cả giây làm chạm bị coi là giữ lâu.
async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
}
const screenOf = (page, x, y) => page.evaluate(([x, y]) => {
  const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
  return { x: (x * f.scale - f.view.camX) / f.dpr + rc.left, y: (y * f.scale - f.view.camY) / f.dpr + rc.top };
}, [x, y]);

test('ra tiệm rèn nâng cuốc → tua 1 ngày → cuốc lên cấp 2', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await installWarp(context);
  await seedSave(context, makeSave(s => {
    s.scene = 'village'; s.coins = 1000;
    const at = sceneMap(s).building('smithy').at;
    Object.assign(s.player, { x: at.x, y: at.y, dir: 3 });
  }));
  await page.goto('/');
  await ready(page);

  // chạm vào tiệm rèn: đang đứng trước cửa nên mở bảng luôn
  await page.waitForTimeout(400);
  const b = await page.evaluate(async () => { const m = (await import('/state.js')).sceneMap(globalThis.__farm.state), s = m.building('smithy'); return { x: s.x + 24, y: s.y + 20 }; });
  const p = await screenOf(page, b.x, b.y);
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
  await expect(page.locator('.sheet-head h2')).toHaveText(/Tiệm rèn/, { timeout: 10_000 });
  await page.screenshot({ path: `test-results/tools-smithy-${testInfo.project.name}.png` });

  // nâng cuốc (món đầu tiên)
  await page.locator('.sheet .row').first().getByRole('button', { name: 'Nâng cấp' }).click();
  await expect(page.locator('.sheet .note', { hasText: 'đang rèn cuốc' })).toBeVisible();
  const smith = await page.evaluate(() => { const s = globalThis.__farm.state; return { smith: s.smith, coins: s.coins, time: s.time }; });
  expect(smith.smith.tool).toBe('hoe');
  expect(smith.smith.doneAt - smith.time).toBeGreaterThan(DAY_MS - 5000);
  expect(smith.coins).toBeLessThan(1000);
  await page.screenshot({ path: `test-results/tools-smithy-busy-${testInfo.project.name}.png` });

  // tua 1 ngày game: tải lại, chạy bù offline thì cuốc rèn xong
  await timeWarp(page, DAY_MS + 5000);
  const after = await page.evaluate(() => { const s = globalThis.__farm.state; return { hoe: s.tools.hoe.lv, smith: s.smith }; });
  expect(after).toEqual({ hoe: 2, smith: null });
  expect(errors).toEqual([]);
});

test('cuốc cấp 2: thấy khung 3 ô trước khi làm, cuốc 3 ô một lần', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let idx = -1;
  const save = makeSave(s => {
    s.tools.hoe.lv = 2;
    const m = mapOf(s);
    // ô đầu hàng (bên trái không phải ruộng, phải có thêm 2 ô ruộng), người chơi đứng bên trái nhìn sang phải
    for (let i = 0; i < s.plots.length && idx < 0; i++) {
      const t = m.plotTile(i);
      if (t && m.plotAt(t.c - 1, t.r) < 0 && m.plotAt(t.c + 1, t.r) >= 0 && m.plotAt(t.c + 2, t.r) >= 0 && !m.isSolidPx((t.c - 1) * 16 + 8, t.r * 16 + 8)) {
        idx = i; Object.assign(s.player, { x: (t.c - 1) * 16 + 8, y: t.r * 16 + 8, dir: 2 });
      }
    }
  });
  expect(idx).toBeGreaterThanOrEqual(0);
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);

  // khung vàng: hành động chính của ô đang chỉ vào có 3 ô
  await expect(page.locator('#main-action .ma-label')).toContainText('3 ô', { timeout: 5000 });
  const tiles = await page.evaluate(async idx => { const S = await import('/state.js'); return S.actionsFor(globalThis.__farm.state, { kind: 'plot', idx })[0].tiles; }, idx);
  expect(tiles).toHaveLength(3);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `test-results/tools-frame-${testInfo.project.name}.png` });

  await tapPlot(page, idx, touch);
  await expect.poll(() => page.evaluate(t => t.filter(i => globalThis.__farm.state.plots[i].soil === 'tilled').length, tiles), { timeout: 8000 }).toBe(3);
  const tilled = await page.evaluate(() => globalThis.__farm.state.plots.filter(p => p.soil === 'tilled').length);
  expect(tilled).toBe(3);
  await page.screenshot({ path: `test-results/tools-done-${testInfo.project.name}.png` });
  expect(errors).toEqual([]);
});
