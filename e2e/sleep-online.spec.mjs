// Ngủ online (hotfix): không tua thời gian, màn Zzz, tải lại vẫn ngủ, nút Dậy giữ thể lực đã hồi.
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, seedSave, closeAway, villageAt } from './helpers.mjs';
import { sceneMap } from '../public/state.js';

const uniq = () => 'Ng' + Math.random().toString(36).slice(2, 7);

test('online: bấm giường ngủ lúc 19h, không tua giờ, tải lại vẫn ngủ, bấm Dậy thì giữ thể lực', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch;
  await villageAt(context, 13 / 24 + 0.005);   // 19h làng
  await seedSave(context, makeSave(s => {
    s.scene = 'house'; s.stamina = 12;
    const bed = sceneMap(s).building('bed').at;
    Object.assign(s.player, { x: bed.x, y: bed.y, dir: 0 });
  }, { name: 'Bé Solo' }));
  await page.goto('/');
  await page.locator('.bb-btn[data-panel="settings"]').click();
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await page.getByRole('button', { name: 'Tạo tài khoản mới' }).click();
  const name = uniq();
  await page.getByPlaceholder('Tên nhân vật').fill(name);
  await page.getByPlaceholder('PIN 6 số').fill('123456');
  await page.getByPlaceholder('Mã mời').fill((await runAdmin('invite', '--db', E2E_DB)).out);
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await page.getByRole('button', { name: /Mang vườn chơi đơn lên/ }).click();
  await expect(page.locator('#hud-name')).toHaveText(name);
  await closeAway(page);

  const t0 = await page.evaluate(() => globalThis.__farm.state.time);
  await expect(page.locator('#main-action')).toBeVisible();
  await page.locator('#main-action').click();   // đứng sát giường: hành động chính là Ngủ
  await expect(page.locator('#sleepz')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1500);
  const s = await page.evaluate(() => { const f = globalThis.__farm.state; return { time: f.time, asleep: Number.isFinite(f.sleepUntil), stamina: f.stamina, night: f.mode }; });
  expect(s.asleep).toBe(true);
  expect(s.time - t0).toBeLessThan(10_000);   // không nhảy tới sáng
  expect(s.stamina).toBeGreaterThanOrEqual(12);

  await page.reload();
  await page.waitForFunction(() => globalThis.__farm?.state);
  await closeAway(page);
  await expect(page.locator('#sleepz')).toBeVisible();   // tải lại giữa đêm vẫn đang ngủ

  await page.locator('#sleepz-wake').click();
  await expect(page.locator('#sleepz')).toBeHidden();
  const w = await page.evaluate(() => { const f = globalThis.__farm.state; return { asleep: Number.isFinite(f.sleepUntil), stamina: f.stamina, slept: f.stats.slept }; });
  expect(w.asleep).toBe(false);
  expect(w.slept).toBe(1);
  expect(w.stamina).toBeGreaterThanOrEqual(12);
  expect(w.stamina).toBeLessThan(40);   // vài giây ngủ chưa hồi được bao nhiêu
});
