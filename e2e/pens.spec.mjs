import { test, expect } from '@playwright/test';
import { makeSave, seedSave, tilePoint, startDrag } from './helpers.mjs';
import { buyAnimal } from '../public/state.js';

// Cấp 4 (xây được 2 chuồng gà), nhiều xu; đất mở rộng sang phải và xuống dưới cho thoải mái đặt chuồng.
const save = (lv = 4, extra) => makeSave(s => {
  s.exp = lv >= 4 ? 25 + 70 + 129 + 10 : lv === 3 ? 25 + 70 + 10 : 25 + 10;
  s.coins = 5000;
  s.farm.owned = { c: 20, r: 14, w: 40, h: 30 }; s.farm.rev++;
  s.player.x = 50 * 16 + 8; s.player.y = 26 * 16 + 8;
  extra?.(s);
});
const fullCoop = s => { while (s.animals.filter(a => a.type === 'ga').length < 6) buyAnimal(s, 'ga'); };
const pens = page => page.evaluate(() => globalThis.__farm.state.farm.ents.filter(e => e.kind === 'pen').map(e => ({ pen: e.pen, lv: e.lv ?? 1 })));

async function open(page, context, s) {
  await seedSave(context, s);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');   // Chromium headless khựng ở lần nhấn đầu
}
async function enterBuild(page) {
  await page.locator('#bb-build').click();
  await expect(page.locator('#buildbar')).toBeVisible();
  await page.waitForTimeout(700);
}
const tap = async (page, touch, p) => { if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y); };
const buy = (page, type) => page.evaluate(async t => { const S = await import('/state.js'); const r = S.buyAnimal(globalThis.__farm.state, t); return { ok: r.ok, reason: r.reason }; }, type);

test('chuồng gà đầy cấp 1 → nâng cấp trong chế độ xây dựng → mua thêm gà được', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await open(page, context, save(4, s => { fullCoop(s); s.player.x = 27 * 16 + 8; s.player.y = 22 * 16 + 8; }));
  expect(await buy(page, 'ga')).toEqual({ ok: false, reason: 'full' });
  await enterBuild(page);
  await tap(page, touch, await tilePoint(page, 27, 25));   // chạm vào chuồng gà
  await expect(page.locator('#build-upgrade')).toBeVisible();
  await expect(page.locator('#build-upgrade')).toContainText('cấp 2');
  const coins0 = await page.evaluate(() => globalThis.__farm.state.coins);
  await page.locator('#build-upgrade').click();
  await expect.poll(async () => (await pens(page))[0].lv).toBe(2);
  expect(await page.evaluate(() => globalThis.__farm.state.coins)).toBe(coins0 - 300);
  expect(await buy(page, 'ga')).toEqual({ ok: true });
  expect(await page.evaluate(() => globalThis.__farm.state.animals.filter(a => a.type === 'ga').length)).toBe(7);
  await page.locator('#build-done').click();
  await expect(page.locator('#buildbar')).toBeHidden();
  await page.reload();
  await page.waitForFunction(() => globalThis.__farm?.state);
  expect((await pens(page))[0].lv).toBe(2);
});

test('xây chuồng gà thứ hai trong chế độ xây dựng', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await open(page, context, save(4));
  await enterBuild(page);
  await page.locator('.bt-tab', { hasText: 'Chuồng' }).click();
  await expect(page.locator('.bt-card', { hasText: 'Chuồng gà 1/2' })).toBeEnabled();
  await page.locator('.bt-card', { hasText: 'Chuồng gà 1/2' }).click();
  const d = await startDrag(page, touch, await tilePoint(page, 50, 22));
  await d.move(await tilePoint(page, 50, 26));
  await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '1');
  await d.end();
  await expect.poll(async () => (await pens(page)).filter(p => p.pen === 'chicken').length).toBe(2);
  expect(await page.evaluate(() => globalThis.__farm.state.coins)).toBe(4800);
  await expect(page.locator('.bt-card', { hasText: 'Chuồng gà 2/2' })).toBeDisabled();
  await expect(page.locator('.bt-card', { hasText: 'Chuồng gà 2/2' })).toContainText('Cấp 8');
});

test('chuồng cách ly: khóa dưới cấp 3, xây được từ cấp 3', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await open(page, context, save(3));
  await enterBuild(page);
  await page.locator('.bt-tab', { hasText: 'Chuồng' }).click();
  await expect(page.locator('.bt-card', { hasText: 'Chuồng cách ly' })).toBeEnabled();
  await page.locator('.bt-card', { hasText: 'Chuồng cách ly' }).click();
  const d = await startDrag(page, touch, await tilePoint(page, 50, 22));
  await d.move(await tilePoint(page, 50, 26));
  await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '1');
  await d.end();
  await expect.poll(async () => (await pens(page)).filter(p => p.pen === 'quarantine').length).toBe(1);
  expect(await page.evaluate(() => globalThis.__farm.state.coins)).toBe(4600);
});

test('dưới cấp 3 thẻ chuồng cách ly bị khóa', async ({ page, context }) => {
  await open(page, context, save(2));
  await enterBuild(page);
  await page.locator('.bt-tab', { hasText: 'Chuồng' }).click();
  await expect(page.locator('.bt-card', { hasText: 'Chuồng cách ly' })).toBeDisabled();
  await expect(page.locator('.bt-card', { hasText: 'Chuồng cách ly' })).toContainText('Cần cấp 3');
});

test('phá bỏ chuồng: còn gà thì bị từ chối, hết gà thì phá được và hoàn xu (hỏi lại trước)', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await open(page, context, save(4, s => { s.player.x = 27 * 16 + 8; s.player.y = 22 * 16 + 8; }));
  await enterBuild(page);
  await tap(page, touch, await tilePoint(page, 27, 25));
  await expect(page.locator('#build-demolish')).toBeVisible();
  await page.locator('#build-demolish').click();
  await expect(page.locator('#build-msg')).toContainText('vật nuôi');
  await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '0');
  expect((await pens(page)).length).toBe(1);
  // bán hết gà (đổi trực tiếp bản lưu đang chạy là cách dựng tình huống, không phải hook)
  await page.evaluate(() => { globalThis.__farm.state.animals.length = 0; });
  const coins0 = await page.evaluate(() => globalThis.__farm.state.coins);
  await page.locator('#build-demolish').click();
  await page.locator('.dialog-btns .btn', { hasText: 'Thôi' }).click();
  expect((await pens(page)).length).toBe(1);
  await page.locator('#build-demolish').click();
  await page.locator('.dialog-btns .btn', { hasText: 'Phá bỏ' }).click();
  await expect.poll(async () => (await pens(page)).length).toBe(0);
  expect(await page.evaluate(() => globalThis.__farm.state.coins)).toBe(coins0 + 100);
  await expect(page.locator('#build-demolish')).toBeHidden();
  // Hủy: chuồng trở lại
  await page.locator('#build-cancel').click();
  await expect.poll(async () => (await pens(page)).length).toBe(1);
  expect(await page.evaluate(() => globalThis.__farm.state.coins)).toBe(coins0);
});
