// Server chạy bù vườn lúc chủ offline (issue 24). Dựng tình huống qua API công khai: chủ rời trang (đóng WebSocket),
// đẩy bản lưu lùi savedAt bằng phiên chơi mới, rồi đăng nhập lại bằng giao diện.
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { plantedCrop } from './helpers.mjs';

const H = 3600_000;
const uniq = () => 'Vắng' + Math.random().toString(36).slice(2, 7);
const noHScroll = page => expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

async function onlineFarm(page, name) {
  await page.goto('/');
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await page.getByRole('button', { name: 'Tạo tài khoản mới' }).click();
  await page.getByPlaceholder('Tên nhân vật').fill(name);
  await page.getByPlaceholder('PIN 6 số').fill('123456');
  await page.getByPlaceholder('Mã mời').fill((await runAdmin('invite', '--db', E2E_DB)).out);
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await page.getByRole('button', { name: /Vào nông trại/ }).click();
  await expect(page.locator('#hud-name')).toHaveText(name);
  await expect.poll(async () => (await (await page.request.get('/api/farm')).json()).farm?.name).toBe(name);
}

// Chủ "tắt máy": rời trang, đẩy bản lưu đã sửa với savedAt lùi `ago`, rồi mở lại trang (cookie còn nên tự vào làng)
async function awayAndBack(page, context, name, ago, mutate) {
  await page.goto('about:blank');
  const api = context.request;
  const { farm } = await (await api.get('/api/farm')).json();
  mutate(farm);
  farm.savedAt = Date.now() - ago;
  const { play } = await (await api.post('/api/play', { data: {} })).json();
  expect((await api.post('/api/farm', { data: { play, save: farm } })).status()).toBe(200);
  await page.goto('/');
}

test('vắng 2 tiếng: vào lại thấy "Trong lúc bạn vắng nhà" ghi cây đã chín', async ({ page, context }) => {
  test.setTimeout(60_000);
  const name = uniq();
  await onlineFarm(page, name);
  await awayAndBack(page, context, name, 2 * H, f => { plantedCrop(f, 0, 0.99); f.plots[0].water = 100; });
  const away = page.locator('#away');
  await expect(away).toBeVisible();
  await expect(away).toContainText('Trong lúc bạn vắng nhà');
  await expect(away).toContainText(/ô cải xanh đã chín/);
  await noHScroll(page);
  await page.screenshot({ path: `test-results/catchup-away-${test.info().project.name}.png` });
  await away.getByRole('button', { name: /Về làm việc/ }).click();
  expect(await page.evaluate(() => globalThis.__farm.state.plots[0].crop.progress)).toBeGreaterThanOrEqual(1);
});

test('vườn đóng băng (vắng 20 tiếng): con vật còn sống, không báo chết', async ({ page, context }) => {
  test.setTimeout(60_000);
  const name = uniq();
  await onlineFarm(page, name);
  let n = 0;
  await awayAndBack(page, context, name, 20 * H, f => { n = f.animals.length; for (const a of f.animals) { a.hunger = 0; a.sick = true; a.starvingSince = 1; } });
  expect(n).toBeGreaterThan(0);
  const away = page.locator('#away');
  await expect(away).toBeVisible();
  await expect(away).toContainText('Vườn đã đóng băng 12 giờ');
  await expect(away).not.toContainText('chết');
  await noHScroll(page);
  await away.getByRole('button', { name: /Về làm việc/ }).click();
  expect(await page.evaluate(() => globalThis.__farm.state.animals.length)).toBe(n);
});
