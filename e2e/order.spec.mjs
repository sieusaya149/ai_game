// Mua online (hotfix): đặt hàng từ Túi đồ, người giao hàng mang tới kho, đơn chờ giao có giờ dự kiến.
import { test, expect } from '@playwright/test';
import { makeSave, seedSave, closeAway } from './helpers.mjs';
import { DAY_MS as DAY, ITEMS } from '../public/data.js';
import { deliveryFee } from '../public/state.js';

async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await closeAway(page);
  await page.keyboard.press('Shift');
}
const st = (page, fn) => page.evaluate(fn);
async function openOrder(page) {
  await page.locator('.bb-btn[data-panel="bag"]').click();
  await page.locator('#open-order').click();
  await expect(page.locator('.sheet-head h2')).toHaveText('🛒 Đặt hàng online');
}

test('đặt cám gà ở Túi đồ: trừ xu ngay, đơn chờ có giờ dự kiến, người giao hàng đi vào kho, hàng vào kho kèm thông báo', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // x20 cho nhanh: 2 phút chờ của luật chỉ còn vài giây; buổi sáng nên chợ đang mở
  await seedSave(context, makeSave(s => { s.speed = 20; s.coins = 500; s.time = 0; }));
  await page.goto('/');
  await ready(page);
  const feed0 = await st(page, () => globalThis.__farm.state.inv.feed_ga || 0);

  await openOrder(page);
  await page.getByRole('button', { name: '🌾 Thức ăn' }).click();
  await page.locator('[data-item="feed_ga"]').getByRole('button', { name: '+5' }).click();
  const total = ITEMS.feed_ga.price * 5 + deliveryFee(ITEMS.feed_ga.price * 5);   // phí giao 10% tiền hàng, ít nhất 5 xu
  await expect(page.locator('#order-total')).toContainText(`= ${total} xu`);
  // phiếu chưa trừ xu
  expect(await st(page, () => globalThis.__farm.state.coins)).toBe(500);
  if (testInfo.project.name === 'mobile') {   // 360px: bảng không tràn ngang
    const over = await page.evaluate(() => { const b = document.getElementById('sheet-body'); return b.scrollWidth - b.clientWidth; });
    expect(over).toBeLessThanOrEqual(0);
  }
  await page.screenshot({ path: `test-results/order-${testInfo.project.name}.png` });
  await page.locator('#order-buy').click();
  await expect(page.locator('#order-pending .parcel')).toHaveCount(1);
  await expect(page.locator('#order-pending')).toContainText('Cám gà ×5');
  await expect(page.locator('#order-pending .eta').first()).toContainText(/Dự kiến tới kho sau|Đang trên đường/);
  expect(await st(page, () => globalThis.__farm.state.coins)).toBe(500 - total);
  expect(await st(page, () => globalThis.__farm.state.inv.feed_ga || 0)).toBe(feed0);
  await page.locator('#panel-root .close').click();

  // người giao hàng xuất hiện ở cổng rồi đi vào
  await page.waitForFunction(() => globalThis.__farm.state.courier?.state === 'coming', null, { timeout: 15_000 });
  await page.waitForFunction(() => globalThis.__farm.state.courier?.x != null);
  const p0 = await st(page, () => ({ ...globalThis.__farm.state.courier }));
  await page.waitForTimeout(500);
  const p1 = await st(page, () => ({ ...globalThis.__farm.state.courier }));
  expect(Math.hypot(p1.x - p0.x, p1.y - p0.y)).toBeGreaterThan(1);
  // tới kho: hàng vào kho (không vào giỏ), thông báo
  await expect(page.locator('#toasts')).toContainText('Hàng đã giao tới kho', { timeout: 20_000 });
  const s = await st(page, () => { const s = globalThis.__farm.state; return { feed: s.inv.feed_ga, basket: s.basket.feed_ga, left: s.deliveries.length, c: s.courier?.state }; });
  expect(s).toEqual({ feed: feed0 + 5, basket: undefined, left: 0, c: 'leaving' });
  expect(errors).toEqual([]);
});

test('đặt lúc chợ đóng (tối): vẫn đặt được, đơn chờ ghi giờ dự kiến tới sáng mai', async ({ page, context }) => {
  await seedSave(context, makeSave(s => { s.coins = 500; s.time = DAY * 0.6; s.day = 1; s.exp = 5000; }));
  await page.goto('/');
  await ready(page);
  await openOrder(page);
  await page.locator('#order-shops').getByRole('button', { name: '💊 Cô Út' }).click();
  await page.locator('[data-item="vaccine"]').getByRole('button', { name: '+1' }).click();
  await page.locator('#order-buy').click();
  await expect(page.locator('#order-pending .parcel')).toHaveCount(1);
  // còn hơn 8 phút (tới 6h sáng mai), chưa giao
  const eta = await page.locator('#order-pending .eta').first().textContent();
  const [m] = /(\d+):\d\d/.exec(eta).slice(1).map(Number);
  expect(m).toBeGreaterThanOrEqual(8);
  expect(await st(page, () => globalThis.__farm.state.coins)).toBe(500 - ITEMS.vaccine.price - deliveryFee(ITEMS.vaccine.price));
});

test('nút "Mua online" ở thanh dưới mở thẳng bảng đặt hàng, chọn Cô Út, giao ngay: hàng vào kho tức thì, phí 30%; thanh dưới không tràn', async ({ page, context }, testInfo) => {
  await seedSave(context, makeSave(s => { s.coins = 500; s.exp = 5000; }));
  await page.goto('/');
  await ready(page);
  // thanh dưới vừa khung, không nút nào tràn chữ (360px)
  const bar = await page.evaluate(() => {
    const b = document.getElementById('bottombar'), r = b.getBoundingClientRect();
    return { over: b.scrollWidth - b.clientWidth, labels: [...b.querySelectorAll('.bb-btn')].filter(x => x.offsetParent).map(x => { const l = x.querySelector('.bb-lbl'); return l.scrollWidth - x.clientWidth; }), right: r.right, vw: innerWidth };
  });
  await page.screenshot({ path: `test-results/order-bar-${testInfo.project.name}.png` });
  expect(bar.over).toBeLessThanOrEqual(0);
  for (const o of bar.labels) expect(o).toBeLessThanOrEqual(2);   // chữ lệch dưới 2px là làm tròn
  await page.locator('#bb-order').click();
  await expect(page.locator('.sheet-head h2')).toHaveText('🛒 Đặt hàng online');
  await expect(page.locator('#order-modes .mode')).toHaveCount(3);
  await expect(page.locator('#order-modes .mode.on')).toHaveAttribute('data-mode', 'm2');   // mặc định: rẻ nhất
  await page.locator('#order-shops').getByRole('button', { name: '💊 Cô Út' }).click();
  const vac0 = await st(page, () => globalThis.__farm.state.inv.vaccine || 0);
  await page.locator('[data-item="vaccine"]').getByRole('button', { name: '+1' }).click();
  await page.locator('#order-modes [data-mode="now"]').click();
  const total = ITEMS.vaccine.price + Math.ceil(ITEMS.vaccine.price * 0.3);
  await expect(page.locator('#order-total')).toContainText(`= ${total} xu`);
  if (testInfo.project.name === 'mobile') {
    const over = await page.evaluate(() => { const b = document.getElementById('sheet-body'); return b.scrollWidth - b.clientWidth; });
    expect(over).toBeLessThanOrEqual(0);
  }
  await page.screenshot({ path: `test-results/order-now-${testInfo.project.name}.png` });
  await page.locator('#order-buy').click();
  await expect(page.locator('#order-pending .parcel')).toHaveCount(0);
  const s = await st(page, () => { const s = globalThis.__farm.state; return { v: s.inv.vaccine, coins: s.coins, d: s.deliveries.length }; });
  expect(s).toEqual({ v: vac0 + 1, coins: 500 - total, d: 0 });
});
