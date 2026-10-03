import { test, expect } from '@playwright/test';
import { makeSave, seedSave, bigFarmSave, closeAway } from './helpers.mjs';

// Máy yếu giả lập: CPU chậm đi `rate` lần (chỉ giả lập, không phải điện thoại thật).
// Dùng 8×: Phase 3 vẽ nặng hơn nên 12× làm trang đứng hình (keyboard.press treo) và không đo đủ khung hình; 6× đã đủ chậm, 8× chừa lề.
async function throttle(page, rate) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
}
// Bấm một phím vô hại trước: lần chạm đầu tiên tạo AudioContext, trình duyệt ẩn khựng cả giây.
async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
  await closeAway(page);   // màn Trong lúc bạn vắng nhà che game
}
const perf = page => page.evaluate(() => globalThis.__farm.perf);

test('bật tiết kiệm pin trong Cài đặt thì tải lại trang vẫn bật', async ({ page, context }) => {
  await seedSave(context, makeSave());
  await page.goto('/');
  await ready(page);
  expect((await perf(page)).battery).toBe(false);
  await page.locator('.bb-btn[data-panel="settings"]').click();
  const box = page.locator('input[name="battery"]');
  await expect(box).not.toBeChecked();
  await box.check();
  expect((await perf(page)).battery).toBe(true);
  await page.reload();
  await ready(page);
  expect((await perf(page)).battery).toBe(true);
  await page.locator('.bb-btn[data-panel="settings"]').click();
  await expect(page.locator('input[name="battery"]')).toBeChecked();
});

test('tiết kiệm pin khóa khung hình ở mức 30', async ({ page, context }) => {
  await seedSave(context, makeSave());
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: true, hinted: true })));
  await page.reload();
  await ready(page);
  await page.waitForTimeout(3000);
  const p = await perf(page);
  expect(p.battery).toBe(true);
  expect(p.fps).toBeLessThanOrEqual(36);
});

test('dời một công trình chỉ vẽ lại vài mảng nền', async ({ page, context }) => {
  await seedSave(context, bigFarmSave());
  await page.goto('/');
  await ready(page);
  await page.waitForTimeout(800);
  const before = (await perf(page)).chunksDrawn;
  expect(before).toBeLessThan(12);   // chỉ mảng trong khung nhìn mới được vẽ
  const moved = await page.evaluate(async () => {
    const G = await import('/state.js'), s = globalThis.__farm.state;
    const e = s.farm.ents.find(x => x.kind === 'shipbin'), from = { c: e.c, r: e.r };
    // thử các ô lân cận tới khi dời được
    for (let d = 2; d < 30; d++) for (const [dc, dr] of [[d, 0], [-d, 0], [0, d], [0, -d]]) if (G.moveEntity(s, e.id, from.c + dc, from.r + dr).ok) return true;
    return false;
  });
  expect(moved).toBe(true);
  await page.waitForTimeout(600);
  const after = (await perf(page)).chunksDrawn;
  expect(after - before).toBeGreaterThanOrEqual(1);
  expect(after - before).toBeLessThanOrEqual(4);   // chỗ cũ + chỗ mới (mỗi cái tối đa 2 mảng sát ranh)
  await page.waitForTimeout(600);
  expect((await perf(page)).chunksDrawn).toBe(after);   // không đổi gì nữa thì không vẽ lại
});

test('máy chậm (CPU giả lập) thì gợi ý bật tiết kiệm pin, chỉ một lần', async ({ page, context }) => {
  test.setTimeout(150_000);
  await seedSave(context, bigFarmSave(), { hint: true });
  await throttle(page, 8);
  await page.goto('/');
  await ready(page);
  const dlg = page.locator('#dialog-root');
  await expect(dlg).toBeVisible({ timeout: 40_000 });
  await expect(dlg).toContainText('tiết kiệm pin');
  await dlg.getByRole('button', { name: 'Để sau' }).click();
  await expect(dlg).toBeHidden();
  expect((await perf(page)).battery).toBe(false);
  // tải lại: đã gợi ý rồi nên không hỏi nữa dù vẫn chậm
  await page.reload();
  await ready(page);
  await page.waitForTimeout(14_000);
  await expect(dlg).toBeHidden();
});

test('máy chậm: nhận gợi ý thì tiết kiệm pin bật và nhớ qua lần tải lại', async ({ page, context }) => {
  test.setTimeout(150_000);
  await seedSave(context, bigFarmSave(), { hint: true });
  await throttle(page, 8);
  await page.goto('/');
  await ready(page);
  const dlg = page.locator('#dialog-root');
  await expect(dlg).toBeVisible({ timeout: 40_000 });
  await dlg.getByRole('button', { name: 'Bật' }).click();
  expect((await perf(page)).battery).toBe(true);
  await page.reload();
  await ready(page);
  expect((await perf(page)).battery).toBe(true);
});

test('máy nhanh thì không gợi ý', async ({ page, context }) => {
  test.setTimeout(60_000);
  await seedSave(context, makeSave(), { hint: true });
  await page.goto('/');
  await ready(page);
  await page.waitForTimeout(13_000);
  const p = await perf(page);
  test.skip(p.fps < 45, `headless chỉ đạt ${p.fps.toFixed(0)} fps, không đo được "máy nhanh"`);
  await expect(page.locator('#dialog-root')).toBeHidden();
});
