// Bạn bè và cổng vườn (issue 26): A thêm B bằng tên và bằng mã, thấy cấp/online/cờ, cổng của B ở đầu, xóa bạn; không tràn ngang 360px.
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, closeAway } from './helpers.mjs';
import { plantedCrop } from './helpers.mjs';

const uniq = () => 'Bb' + Math.random().toString(36).slice(2, 7);

async function player(browser, { baseURL, viewport, isMobile, hasTouch }, mutate) {
  const context = await browser.newContext({ baseURL, viewport, isMobile, hasTouch });
  const name = uniq();
  const invite = (await runAdmin('invite', '--db', E2E_DB)).out;
  expect((await context.request.post('/api/register', { data: { name, pin: '123456', invite } })).ok()).toBe(true);
  const { play } = await (await context.request.post('/api/play', { data: {} })).json();
  const save = makeSave(s => { s.scene = 'village'; mutate?.(s); }, { name });
  expect((await context.request.post('/api/farm', { data: { play, save } })).ok()).toBe(true);
  await context.addInitScript(n => {
    try { localStorage.setItem('nongtrai-online', n); localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {}
  }, name);
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state?.mode === 'online');
  await closeAway(page);
  await expect(page.locator('#live')).toBeVisible();
  return { name, context, page };
}
const opts = (testInfo, baseURL) => ({ baseURL, ...testInfo.project.use });
const openFriends = async page => {
  await page.locator('#live-friends').click();
  await expect(page.locator('.sheet-head h2')).toHaveText(/Bạn bè/);
  await expect(page.locator('#fr-code')).toBeVisible();
};
const closePanel = async page => { await page.locator('#panel-root .close').click(); await expect(page.locator('#panel-root')).toBeHidden(); };
const noHScroll = page => expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.getElementById('sheet-body').scrollWidth <= document.getElementById('sheet-body').clientWidth)).toBe(true);
const add = async (page, who) => { await page.locator('#fr-input').fill(who); await page.getByRole('button', { name: 'Thêm', exact: true }).click(); };

test('A thêm B bằng tên rồi bằng mã: cấp, online/offline, cờ, cổng ở đầu; xóa bạn thì hết ghim', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  const errors = [];
  const A = await player(browser, opts(testInfo, baseURL));
  const B = await player(browser, opts(testInfo, baseURL), s => { s.exp = 1000; plantedCrop(s, 0, 1); });
  const C = await player(browser, opts(testInfo, baseURL));
  for (const p of [A, B, C]) p.page.on('pageerror', e => errors.push(e.message));

  await openFriends(A.page);
  // lỗi rõ lý do
  await add(A.page, 'Không Có Ai');
  await expect(A.page.locator('#fr-err')).toContainText('Không có người chơi nào tên này');
  await add(A.page, A.name);
  await expect(A.page.locator('#fr-err')).toContainText('chính bạn');
  // thêm B bằng tên
  await add(A.page, B.name);
  const rowB = A.page.locator('.fr-row', { hasText: B.name });
  await expect(rowB).toContainText('online');
  await expect(rowB).not.toContainText('offline');
  await expect(rowB).toContainText(/Cấp [2-9]/);
  await expect(rowB.locator('.fr-ico.ripe')).toBeVisible();
  await add(A.page, B.name);
  await expect(A.page.locator('#fr-err')).toContainText('Đã là bạn');
  // cổng của B ở đầu danh sách cổng, ghim
  const gates = A.page.locator('.gate-row');
  await expect(gates.first()).toHaveAttribute('data-name', B.name);
  await expect(gates.first()).toHaveClass(/pinned/);
  await noHScroll(A.page);
  await A.page.screenshot({ path: `test-results/friends-${testInfo.project.name}.png` });

  // thêm C bằng mã kết bạn của C
  await openFriends(C.page);
  const code = await C.page.locator('#fr-code').textContent();
  await add(A.page, 'ZZZ-ZZZ');
  await expect(A.page.locator('#fr-err')).toContainText('Mã kết bạn không đúng');
  await add(A.page, code);
  await expect(A.page.locator('.fr-row', { hasText: C.name })).toBeVisible();

  // B offline thì mở lại bảng thấy offline
  await B.context.close();
  await expect.poll(async () => {
    await closePanel(A.page); await openFriends(A.page);
    return A.page.locator('.fr-row', { hasText: B.name }).textContent();
  }, { timeout: 15_000 }).toContain('offline');

  // xóa B (có hỏi lại): B hết ở phần bạn bè, cổng của B không còn ghim
  await A.page.getByRole('button', { name: `Xóa bạn ${B.name}` }).click();
  await A.page.getByRole('button', { name: 'Giữ lại' }).click();
  await expect(A.page.locator('.fr-row', { hasText: B.name })).toBeVisible();
  await A.page.getByRole('button', { name: `Xóa bạn ${B.name}` }).click();
  await A.page.getByRole('button', { name: 'Xóa', exact: true }).click();
  await expect(A.page.locator('.fr-row', { hasText: B.name })).toHaveCount(0);
  await expect(A.page.locator('.gate-row', { hasText: B.name })).not.toHaveClass(/pinned/);
  await expect(A.page.locator('.gate-row.pinned')).toHaveAttribute('data-name', C.name);   // chỉ còn C được ghim
  await noHScroll(A.page);
  expect(errors).toEqual([]);
  await A.context.close(); await C.context.close();
});
