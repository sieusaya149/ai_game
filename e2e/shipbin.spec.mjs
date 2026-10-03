import { test, expect } from '@playwright/test';
import { makeSave, seedSave, installWarp, timeWarp } from './helpers.mjs';
import { mapOf } from '../public/state.js';
import { DAY_MS as DAY } from '../public/data.js';

// Người chơi đứng ngay cạnh thùng giao hàng, giỏ có 5 bắp cải (giá 80, nên số xu dự kiến đủ lớn để thấy).
const save = () => makeSave(s => {
  const at = mapOf(s).building('shipbin').at;
  Object.assign(s.player, { x: at.x, y: at.y, dir: 3 });
  s.basket = { bapcai: 5 };
});

// Bấm một phím vô hại trước: lần chạm đầu tiên tạo AudioContext, trình duyệt ẩn khựng cả giây làm chạm bị coi là giữ lâu.
async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
}

test('bỏ 5 bắp cải vào thùng → thấy số xu dự kiến → qua 6h sáng, tải lại nhận đúng xu', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await installWarp(context);
  await seedSave(context, save());
  await page.goto('/');
  await ready(page);
  const coins0 = await page.evaluate(() => globalThis.__farm.state.coins);

  // chạm vào thùng
  await page.waitForTimeout(400);
  const p = await page.evaluate(() => {
    const f = globalThis.__farm, s = f.state, e = s.farm.ents.find(x => x.kind === 'shipbin'), rc = document.getElementById('game-canvas').getBoundingClientRect();
    const wx = e.c * 16 + 16, wy = e.r * 16 + 8;
    return { x: (wx * f.scale - f.view.camX) / f.dpr + rc.left, y: (wy * f.scale - f.view.camY) / f.dpr + rc.top };
  });
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
  await expect(page.locator('#panel-root')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#ship-total')).toContainText('+0 xu');

  await page.getByRole('button', { name: 'Bỏ hết' }).click();
  await expect(page.locator('#ship-total')).toContainText('+320 xu');   // 5 bắp cải x 80 xu x 80%
  await page.screenshot({ path: `test-results/shipbin-${testInfo.project.name}.png` });

  // lấy lại một ít rồi bỏ lại: số xu dự kiến đổi theo
  await page.getByRole('button', { name: 'Lấy 1' }).click();
  await expect(page.locator('#ship-total')).toContainText('+256 xu');
  await page.getByRole('button', { name: 'Bỏ 1' }).click();
  await expect(page.locator('#ship-total')).toContainText('+320 xu');
  await page.locator('#panel-root .close').click();
  expect(await page.evaluate(() => globalThis.__farm.state.coins)).toBe(coins0);

  // vắng nhà qua 6h sáng (1 ngày game = 20 phút thật)
  await timeWarp(page, DAY + 60_000);
  const after = await page.evaluate(() => { const s = globalThis.__farm.state; return { coins: s.coins, bin: s.shipbin.items, log: s.log.map(l => l.text) }; });
  expect(after.coins).toBe(coins0 + 320);
  expect(after.bin).toEqual({});
  expect(after.log.some(t => t.includes('Lái buôn'))).toBe(true);
  expect(errors).toEqual([]);
});
