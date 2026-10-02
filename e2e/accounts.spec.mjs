import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { createCharacter, makeSave, seedSave } from './helpers.mjs';

// Mã mời mới bằng đúng lệnh quản trị trong container, trên cùng file SQLite của server e2e
const invite = async () => (await runAdmin('invite', '--db', E2E_DB)).out;
const uniq = () => 'Bạn' + Math.random().toString(36).slice(2, 7);

// Không tràn ngang
const noHScroll = page => expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.getElementById('creator').scrollWidth <= innerWidth)).toBe(true);

async function signUp(page, name, code, pin = '123456') {
  await page.getByRole('button', { name: 'Tạo tài khoản mới' }).click();
  await page.getByPlaceholder('Tên nhân vật').fill(name);
  await page.getByPlaceholder('PIN 6 số').fill(pin);
  await page.getByPlaceholder('Mã mời').fill(code);
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
}

test('đăng ký bằng mã mời, reload vẫn đăng nhập, đăng xuất về màn chọn chế độ', async ({ page }) => {
  const name = uniq(), code = await invite();
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Chơi một mình/ })).toBeVisible();
  await noHScroll(page);
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await noHScroll(page);
  await expect(page.getByPlaceholder('PIN 6 số')).toHaveAttribute('inputmode', 'numeric');
  await expect(page.getByText('Nhờ quản trị đặt lại PIN')).toBeVisible();

  await page.getByRole('button', { name: 'Tạo tài khoản mới' }).click();
  await noHScroll(page);
  await signUp(page, name, code);
  // chưa có vườn online, máy chưa có vườn chơi đơn: tạo vườn mới, tên nhân vật là tên tài khoản
  await expect(page.getByPlaceholder('Tên của bạn')).toHaveValue(name);
  await page.getByRole('button', { name: /Vào nông trại/ }).click();
  await expect(page.locator('#hud-name')).toHaveText(name);

  await page.reload();
  await expect(page.locator('#hud-name')).toHaveText(name);   // giữ đăng nhập, không hỏi PIN, vào thẳng vườn online
  await expect(page.locator('#creator')).toBeHidden();

  await page.locator('.bb-btn[data-panel="settings"]').click();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page.getByRole('button', { name: /Chơi một mình/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Chơi một mình/ })).toBeVisible();   // đăng xuất rồi thì reload không tự vào
});

test('câu lỗi đúng lý do: mã mời đã dùng, mã sai, tên trùng, PIN ngắn, sai PIN', async ({ page, browser }) => {
  const name = uniq(), code = await invite();
  await page.goto('/');
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await signUp(page, name, code);
  await expect(page.getByPlaceholder('Tên của bạn')).toHaveValue(name);

  // người khác (trình duyệt sạch) thử lại
  const ctx = await browser.newContext({ viewport: page.viewportSize() });
  const p2 = await ctx.newPage();
  await p2.goto('/');
  await p2.getByRole('button', { name: /Vào làng/ }).click();
  await signUp(p2, uniq(), code);
  await expect(p2.getByRole('alert')).toHaveText('Mã mời này đã được dùng rồi.');
  await signUp(p2, uniq(), 'ZZZZ-ZZZZ');
  await expect(p2.getByRole('alert')).toHaveText('Mã mời không đúng.');
  await signUp(p2, name.toUpperCase(), await invite());
  await expect(p2.getByRole('alert')).toHaveText('Tên này đã có người dùng.');
  await signUp(p2, uniq(), await invite(), '123');
  await expect(p2.getByRole('alert')).toHaveText('PIN phải đủ 6 số.');
  await p2.getByRole('button', { name: 'Đã có tài khoản' }).click();
  await p2.getByPlaceholder('Tên nhân vật').fill(name);
  await p2.getByPlaceholder('PIN 6 số').fill('000000');
  await p2.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(p2.getByRole('alert')).toHaveText('Sai tên hoặc PIN.');
  await p2.getByPlaceholder('PIN 6 số').fill('123456');
  await p2.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(p2.getByPlaceholder('Tên của bạn')).toHaveValue(name);   // vào được: tài khoản chưa có vườn thì tạo vườn
  await ctx.close();
});

test('bị khóa tạm thì hiện còn bao lâu', async ({ page }) => {
  const name = uniq();
  await page.goto('/');
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await signUp(page, name, await invite());
  await expect(page.getByPlaceholder('Tên của bạn')).toHaveValue(name);
  await page.context().clearCookies();   // như máy khác: chưa đăng nhập
  await page.reload();
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await page.getByPlaceholder('Tên nhân vật').fill(name);
  for (let i = 0; i < 5; i++) {
    await page.getByPlaceholder('PIN 6 số').fill('000000');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  }
  await page.getByPlaceholder('PIN 6 số').fill('123456');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/Nhập sai nhiều lần, thử lại sau \d+ phút/);
});

test('chơi một mình: cổng bạn bè ghi "Đăng nhập để thăm bạn bè", nút tốc độ x5/x20 còn dùng được', async ({ page, context }) => {
  await page.goto('/');
  await createCharacter(page, 'Solo');
  // tốc độ trong Cài đặt
  await page.locator('.bb-btn[data-panel="settings"]').click();
  await page.getByRole('button', { name: 'x20' }).click();
  expect(await page.evaluate(() => globalThis.__farm.state.speed)).toBe(20);
  await page.getByRole('button', { name: 'x5', exact: true }).click();
  expect(await page.evaluate(() => globalThis.__farm.state.speed)).toBe(5);
  await page.keyboard.press('Escape');
  // nút tốc độ trên màn hình xoay vòng
  await page.locator('#hud-speed').click();
  expect(await page.evaluate(() => globalThis.__farm.state.speed)).toBe(20);

  // cổng bạn bè ở làng
  const msg = await page.evaluate(async () => {
    const S = await import('/state.js'), s = globalThis.__farm.state;
    S.enterScene(s, 'village');
    const t = { kind: 'building', id: 'friendGate' };
    return S.perform(s, t, S.actionsFor(s, t)[0].id).msg;
  });
  expect(msg).toContain('Đăng nhập để thăm bạn bè');
});

test('chơi một mình có sẵn bản lưu: vào thẳng; Cài đặt → Vào làng đưa về màn chọn chế độ, chơi tiếp được', async ({ page, context }) => {
  await seedSave(context, makeSave(null, { name: 'Cũ' }));
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await expect(page.locator('#hud-name')).toHaveText('Cũ');
  await page.locator('.bb-btn[data-panel="settings"]').click();
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await expect(page.getByRole('button', { name: /Chơi một mình/ })).toBeVisible();
  await page.getByRole('button', { name: /Chơi một mình/ }).click();
  await expect(page.locator('#creator')).toBeHidden();
  await expect(page.locator('#hud-name')).toHaveText('Cũ');
});
