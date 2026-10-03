// Vườn online (issue 22): mang vườn chơi đơn lên làng, tự lưu, rớt mạng, một thiết bị mỗi tài khoản.
// Dựng tình huống qua API công khai của server + bản lưu ghi sẵn; mã mời bằng lệnh quản trị (ADR 0011).
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, plantedCrop, seedSave, tapPlot } from './helpers.mjs';
import { SAVE_KEY } from '../public/state.js';

const invite = async () => (await runAdmin('invite', '--db', E2E_DB)).out;
const uniq = () => 'Làng' + Math.random().toString(36).slice(2, 7);
const touch = () => test.info().project.name === 'mobile';
const noHScroll = page => expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.getElementById('creator').scrollWidth <= innerWidth)).toBe(true);

// Vườn trên server, đọc qua API công khai bằng cookie của trình duyệt
const serverFarm = async page => (await (await page.request.get('/api/farm')).json()).farm ?? null;
const soloSave = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), SAVE_KEY);

async function openAuth(page) {
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await expect(page.getByPlaceholder('PIN 6 số')).toBeVisible();
}
async function signUp(page, name) {
  await openAuth(page);
  await page.getByRole('button', { name: 'Tạo tài khoản mới' }).click();
  await page.getByPlaceholder('Tên nhân vật').fill(name);
  await page.getByPlaceholder('PIN 6 số').fill('123456');
  await page.getByPlaceholder('Mã mời').fill(await invite());
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
}
async function logIn(page, name) {
  await openAuth(page);
  await page.getByPlaceholder('Tên nhân vật').fill(name);
  await page.getByPlaceholder('PIN 6 số').fill('123456');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}
// Từ vườn chơi đơn đang mở: Cài đặt → Vào làng
async function soloToVillage(page) {
  await page.locator('.bb-btn[data-panel="settings"]').click();
  await page.getByRole('button', { name: /Vào làng/ }).click();
}
// Tài khoản mới, chưa có vườn chơi đơn: tạo vườn mới trên làng
async function newOnlineFarm(page, name) {
  await page.goto('/');
  await signUp(page, name);
  await expect(page.getByPlaceholder('Tên của bạn')).toHaveValue(name);
  await page.getByRole('button', { name: /Vào nông trại/ }).click();
  await expect(page.locator('#creator')).toBeHidden();
  await expect(page.locator('#hud-name')).toHaveText(name);
  await expect.poll(() => serverFarm(page).then(f => f?.name)).toBe(name);
}
// Đã gợi ý tiết kiệm pin rồi: khỏi hộp gợi ý chen vào giữa test dài
const noHint = ctx => ctx.addInitScript(() => { try { localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {} });
const soilOf = (page, i) => page.evaluate(i => globalThis.__farm.state.plots[i].soil, i);

const SOLO = () => makeSave(s => { s.coins = 777; plantedCrop(s, 0, 0.5); }, { name: 'Bé Solo' });

test('mang vườn chơi đơn lên làng: reload vẫn đúng vườn, đúng xu, đúng cây; bản chơi đơn còn nguyên', async ({ page, context }) => {
  await seedSave(context, SOLO());
  await page.goto('/');
  await expect(page.locator('#hud-name')).toHaveText('Bé Solo');
  await soloToVillage(page);
  const before = await soloSave(page);   // rời vườn chơi đơn thì nó được lưu lần cuối; từ đây không được đổi nữa
  const name = uniq();
  await signUp(page, name);

  await expect(page.getByRole('heading', { name: 'Mang vườn này lên làng?' })).toBeVisible();
  await expect(page.getByText('Vườn của Bé Solo')).toBeVisible();
  await noHScroll(page);
  await page.screenshot({ path: `test-results/online-bringup-${test.info().project.name}.png` });
  await page.getByRole('button', { name: /Mang vườn chơi đơn lên/ }).click();
  await expect(page.locator('#creator')).toBeHidden();
  await expect(page.locator('#hud-name')).toHaveText(name);
  await expect(page.locator('#hud-coins-n')).toHaveText('777');
  await expect.poll(() => serverFarm(page).then(f => f?.coins)).toBe(777);

  await page.reload();
  await page.waitForFunction(() => globalThis.__farm?.state);
  const s = await page.evaluate(() => { const s = globalThis.__farm.state; return { mode: s.mode, account: s.account, coins: s.coins, crop: s.plots[0].crop }; });
  expect(s).toMatchObject({ mode: 'online', account: name, coins: 777 });
  expect(s.crop.id).toBe('cai');
  expect(s.crop.progress).toBeGreaterThanOrEqual(0.5);
  await expect(page.locator('#hud-net')).toBeHidden();

  // bản chơi đơn trong localStorage không đổi chút nào
  expect(await soloSave(page)).toEqual(before);
});

test('"Bắt đầu vườn mới" cho vườn khởi đầu sạch, không đụng bản chơi đơn', async ({ page, context }) => {
  await seedSave(context, SOLO());
  await page.goto('/');
  await expect(page.locator('#hud-name')).toHaveText('Bé Solo');
  await soloToVillage(page);
  const before = await soloSave(page);   // rời vườn chơi đơn thì nó được lưu lần cuối; từ đây không được đổi nữa
  const name = uniq();
  await signUp(page, name);
  await page.getByRole('button', { name: /Bắt đầu vườn mới/ }).click();
  await expect(page.getByPlaceholder('Tên của bạn')).toHaveValue(name);
  await page.getByRole('button', { name: /Vào nông trại/ }).click();
  await expect(page.locator('#hud-name')).toHaveText(name);
  await expect(page.locator('#hud-coins-n')).toHaveText('250');
  expect(await page.evaluate(() => globalThis.__farm.state.plots.every(p => !p.crop))).toBe(true);
  await expect.poll(() => serverFarm(page).then(f => f?.coins)).toBe(250);
  expect(await soloSave(page)).toEqual(before);
  // về chơi một mình: vẫn là vườn cũ
  await page.locator('.bb-btn[data-panel="settings"]').click();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await page.getByRole('button', { name: /Chơi một mình/ }).click();
  await expect(page.locator('#hud-name')).toHaveText('Bé Solo');
  await expect(page.locator('#hud-coins-n')).toHaveText('777');
});

test('mạng chậm: đăng xuất rồi bấm Vào làng ngay thì hiện ô đăng nhập; đăng nhập lại không còn biểu tượng mất mạng', async ({ page, context }) => {
  test.setTimeout(60_000);
  await noHint(context);
  const name = uniq();
  await newOnlineFarm(page, name);
  // mỗi request tới server chậm 800 ms (mạng di động yếu): lưu lần cuối + đăng xuất chưa xong thì người chơi đã bấm tiếp
  await context.route('**/api/**', async r => { await new Promise(res => setTimeout(res, 800)); await r.continue().catch(() => {}); });
  await page.locator('.bb-btn[data-panel="settings"]').click();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await expect(page.getByPlaceholder('PIN 6 số')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('nongtrai-online'))).toBeNull();
  await page.getByPlaceholder('Tên nhân vật').fill(name);
  await page.getByPlaceholder('PIN 6 số').fill('123456');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.locator('#creator')).toBeHidden();
  await page.waitForFunction(() => globalThis.__farm?.state?.mode === 'online');
  await expect(page.locator('#hud-name')).toHaveText(name);
  await expect(page.locator('#hud-net')).toBeHidden();
});

test('tự lưu lên làng; mất mạng vẫn chơi, hiện biểu tượng, có mạng lại thì tự lưu bù', async ({ page, context }) => {
  test.setTimeout(90_000);
  await noHint(context);
  const name = uniq();
  await newOnlineFarm(page, name);
  await page.keyboard.press('Shift');

  await tapPlot(page, 0, touch());
  await expect.poll(() => soilOf(page, 0), { timeout: 10_000 }).toBe('tilled');
  // qua một nhịp tự lưu (~10 giây) thì server có thao tác đó
  await expect.poll(() => serverFarm(page).then(f => f?.plots[0].soil), { timeout: 15_000 }).toBe('tilled');

  await context.setOffline(true);
  await expect(page.locator('#hud-net')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: `test-results/online-netoff-${test.info().project.name}.png` });
  // biểu tượng không đè chữ trong HUD
  const box = await page.locator('#hud-net').boundingBox(), nameBox = await page.locator('#hud-name').boundingBox();
  expect(box.x + box.width <= nameBox.x || box.y >= nameBox.y + nameBox.height).toBe(true);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width);
  await tapPlot(page, 1, touch());   // vẫn thao tác được
  await expect.poll(() => soilOf(page, 1), { timeout: 10_000 }).toBe('tilled');

  await context.setOffline(false);
  await expect(page.locator('#hud-net')).toBeHidden({ timeout: 20_000 });
  await expect.poll(() => serverFarm(page).then(f => f?.plots[1].soil), { timeout: 15_000 }).toBe('tilled');
});

test('hai trình duyệt: đăng nhập ở B thì A thoát về màn đầu, vườn A đã chơi không mất', async ({ page, context, browser, baseURL, isMobile, hasTouch }) => {
  test.setTimeout(60_000);
  await noHint(context);
  const name = uniq();
  await newOnlineFarm(page, name);
  await page.keyboard.press('Shift');
  await tapPlot(page, 0, touch());
  await expect.poll(() => soilOf(page, 0), { timeout: 10_000 }).toBe('tilled');   // chưa chắc đã tự lưu

  const ctxB = await browser.newContext({ baseURL, viewport: page.viewportSize(), isMobile, hasTouch });
  await noHint(ctxB);
  const b = await ctxB.newPage();
  await b.goto('/');
  await logIn(b, name);
  await expect(page.getByText('Bạn đã đăng nhập ở thiết bị khác')).toBeVisible();
  await expect(page.getByRole('button', { name: /Chơi một mình/ })).toBeVisible();
  await page.screenshot({ path: `test-results/online-kicked-${test.info().project.name}.png` });

  await expect(b.locator('#creator')).toBeHidden();
  await expect(b.locator('#hud-name')).toHaveText(name);
  expect(await soilOf(b, 0)).toBe('tilled');   // bản lưu cuối của A tới trước khi B nhận vườn

  // A đã thoát: không còn gửi gì lên (B giữ quyền ghi)
  await tapPlot(b, 1, touch());
  await expect.poll(() => serverFarm(b).then(f => f?.plots[1].soil), { timeout: 15_000 }).toBe('tilled');
  expect(await page.evaluate(() => globalThis.__farm.state)).toBe(null);
  // A tải lại: không tự vào làng (khỏi giành lại vườn của B)
  await page.reload();
  await expect(page.getByRole('button', { name: /Chơi một mình/ })).toBeVisible();
  await ctxB.close();
});

// Giờ trong HUD ('Ngày 5/7 · 7:30 sáng', ngày trong mùa) → số phút game kể từ đầu mùa; so hai máy cùng thời điểm nên không cần số ngày cộng dồn
const gameMin = async page => {
  const t = await page.locator('#hud-time').textContent();
  const [, d, h, m, part] = t.match(/Ngày (\d+).*?(\d+):(\d+) (\S+)/);
  const h24 = part === 'sáng' ? +h : part === 'chiều' ? (+h === 12 ? 12 : +h + 12) : part === 'tối' ? +h + 12 : (+h >= 10 ? +h + 12 : +h % 12 + 24);   // đêm: 22h..5h
  return (+d - 1) * 1440 + (h24 - 6 + 24) % 24 * 60 + +m;
};
test('đồng hồ làng: máy lệch giờ vẫn cùng ngày game và cùng ngày/đêm với người kia; online không có x5/x20', async ({ browser, page, context, baseURL }) => {
  test.setTimeout(90_000);
  await noHint(context);
  await newOnlineFarm(page, uniq());
  const isMobile = test.info().project.use.isMobile, hasTouch = test.info().project.use.hasTouch;
  const ctxB = await browser.newContext({ baseURL, viewport: page.viewportSize(), isMobile, hasTouch });
  await noHint(ctxB);
  await ctxB.addInitScript(() => { const real = Date.now.bind(Date); Date.now = () => real() + 29 * 3600_000 + 777_000; });   // máy B lệch +29 giờ
  const b = await ctxB.newPage();
  await newOnlineFarm(b, uniq());
  const skew = await b.evaluate(() => Date.now()) - Date.now();
  expect(skew).toBeGreaterThan(28 * 3600_000);   // máy B thật sự lệch
  const [ma, mb] = [await gameMin(page), await gameMin(b)];
  expect(Math.abs(ma - mb)).toBeLessThan(10);   // cùng ngày, cùng giờ (sai số vài giây thật)
  expect(await page.locator('#hud-weather').textContent().then(t => t.includes('🌙')))
    .toBe(await b.locator('#hud-weather').textContent().then(t => t.includes('🌙')));
  // online: khóa x1
  await expect(page.locator('#hud-speed')).toBeHidden();
  await page.locator('.bb-btn[data-panel="settings"]').click();
  await expect(page.getByRole('button', { name: 'x5', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'x20', exact: true })).toHaveCount(0);
  await page.screenshot({ path: `test-results/clock-online-${test.info().project.name}.png` });
  await ctxB.close();
});

test('chơi một mình vẫn có nút x5/x20 và dùng được', async ({ page, context }) => {
  await seedSave(context, SOLO());
  await page.goto('/');
  await expect(page.locator('#hud-name')).toHaveText('Bé Solo');
  await expect(page.locator('#hud-speed')).toBeVisible();
  await page.locator('#hud-speed').click({ force: true });
  await expect(page.locator('#hud-speed')).toHaveText('⏩ x5');
  await page.locator('.bb-btn[data-panel="settings"]').click();
  await expect(page.getByRole('button', { name: 'x20', exact: true })).toBeVisible();
});
