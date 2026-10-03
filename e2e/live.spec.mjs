// Làng real-time (issue 25): hai trình duyệt thấy nhau, đi mượt, chat nhanh, biểu cảm; chat chỉ trong cùng bản đồ;
// chợ Bà Tư vẫn như cũ khi online; cột chat/biểu cảm không đè joystick, nút hành động, bản đồ nhỏ ở 360px.
// Dựng tình huống qua API công khai của server (đăng ký, xin phiên chơi, gửi bản lưu ghi sẵn), mã mời bằng lệnh quản trị.
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, closeAway, villageAt } from './helpers.mjs';
import { QUICK_CHAT } from '../public/data.js';

const uniq = () => 'Lg' + Math.random().toString(36).slice(2, 7);

// Một người chơi trong trình duyệt riêng: tài khoản mới, vườn trên server ghi sẵn (mutate chỉnh bản lưu), máy nhớ "đã vào làng"
async function player(browser, { baseURL, viewport, isMobile, hasTouch }, mutate) {
  const context = await browser.newContext({ baseURL, viewport, isMobile, hasTouch });
  await villageAt(context);   // chợ chỉ mở ban ngày
  const name = uniq();
  const invite = (await runAdmin('invite', '--db', E2E_DB)).out;
  expect((await context.request.post('/api/register', { data: { name, pin: '123456', invite } })).ok()).toBe(true);
  const { play } = await (await context.request.post('/api/play', { data: {} })).json();
  const save = makeSave(s => { s.scene = 'village'; s.look.shirt = 4; mutate?.(s); }, { name });
  expect((await context.request.post('/api/farm', { data: { play, save } })).ok()).toBe(true);
  await context.addInitScript(n => {
    try { localStorage.setItem('nongtrai-online', n); localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {}
  }, name);
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state?.mode === 'online');
  await closeAway(page);
  await expect(page.locator('#live')).toBeVisible();
  await page.keyboard.press('Shift');
  return { name, context, page };
}
const opts = (testInfo, baseURL) => ({ baseURL, ...testInfo.project.use });
const peers = page => page.evaluate(() => globalThis.__farm.peers.map(p => ({ name: p.name, x: p.x, y: p.y, full: p.full, chat: p.chat, emote: p.emote?.e ?? null, look: p.look })));
const at = (x, y) => s => Object.assign(s.player, { x, y, dir: 0 });

// Điện thoại: cột biểu cảm gọn thành một nút 😊, bấm mới bung ra (màn rộng thì không có nút này)
const openEmotes = async page => { const t = page.locator('#live-emote-toggle'); if (await t.isVisible()) await t.click(); };

test('hai người trong làng: thấy tên và nhân vật nhau, đi mượt, thấy bong bóng chat và biểu cảm 😂', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(60_000);
  const errors = [];
  const A = await player(browser, opts(testInfo, baseURL), at(200, 180));
  const B = await player(browser, opts(testInfo, baseURL), at(250, 184));
  for (const p of [A, B]) p.page.on('pageerror', e => errors.push(e.message));

  await expect.poll(() => peers(A.page).then(l => l.map(p => p.name))).toEqual([B.name]);
  await expect.poll(() => peers(B.page).then(l => l.map(p => p.name))).toEqual([A.name]);
  const seen = (await peers(A.page))[0];
  expect(seen.full).toBe(true);
  expect(seen.look.shirt).toBe(4);
  await expect(A.page.locator('#live-n')).toHaveText('2');

  // B đi sang phải: A thấy vị trí đổi liên tục từng chút, không nhảy
  const x0 = seen.x;
  await B.page.keyboard.down('ArrowRight');
  const xs = [];
  for (let i = 0; i < 40; i++) { xs.push((await peers(A.page))[0].x); await A.page.waitForTimeout(25); }
  await B.page.keyboard.up('ArrowRight');
  const steps = xs.slice(1).map((x, i) => x - xs[i]);
  expect(xs.at(-1)).toBeGreaterThan(x0 + 20);
  expect(new Set(xs.map(Math.round)).size).toBeGreaterThan(10);   // nhiều vị trí trung gian
  expect(Math.max(...steps)).toBeLessThan(16);                     // không bước nào nhảy xa
  expect(Math.min(...steps)).toBeGreaterThanOrEqual(-0.5);

  // B bấm câu chat: A thấy bong bóng trên đầu B
  await B.page.locator('#live-chat').click();
  await B.page.getByRole('button', { name: QUICK_CHAT[0] }).click();
  await expect.poll(() => peers(A.page).then(l => l[0].chat)).toBe(QUICK_CHAT[0]);
  // A bấm 😂: B thấy biểu cảm
  await openEmotes(A.page);
  await A.page.getByRole('button', { name: '😂' }).click();
  await expect.poll(() => peers(B.page).then(l => l[0].emote)).toBe('😂');
  await A.page.screenshot({ path: `test-results/live-village-${testInfo.project.name}.png` });
  await B.page.screenshot({ path: `test-results/live-village-b-${testInfo.project.name}.png` });

  // bảng người đang ở đây: tên, cấp
  await A.page.locator('#live-people').click();
  await expect(A.page.locator('.sheet-head h2')).toHaveText(/Người đang ở đây/);
  await expect(A.page.locator('.online-row', { hasText: B.name })).toContainText('Cấp 1');
  expect(errors).toEqual([]);
  await A.context.close(); await B.context.close();
});

test('chat tự gõ: gõ WASD/phím tắt không làm nhân vật đi, Enter gửi, người kia thấy tin (từ tục bị che), quá 20 từ không gửi được', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(60_000);
  const A = await player(browser, opts(testInfo, baseURL), at(200, 180));
  const B = await player(browser, opts(testInfo, baseURL), at(250, 184));
  await expect.poll(() => peers(A.page).then(l => l.length)).toBe(1);
  await B.page.locator('#live-chat').click();
  const input = B.page.locator('#live-chat-in');
  const x0 = (await peers(A.page))[0].x;
  await input.click();
  if (testInfo.project.use.hasTouch) {   // điện thoại: đang gõ thì khung chat lên đầu màn hình, bàn phím ảo không che
    const box = await B.page.locator('#live-says').boundingBox();
    expect(box.y).toBeLessThan(B.page.viewportSize().height / 3);
  }
  await input.pressSequentially('wasd e 1 dm xin chao');
  if (process.env.SHOT) await B.page.screenshot({ path: process.env.SHOT });
  await B.page.waitForTimeout(400);
  expect((await peers(A.page))[0].x).toBe(x0);   // phím di chuyển không chạy khi đang gõ
  await expect(B.page.locator('#live-chat-n')).toHaveText('6/20 từ');
  await input.fill(Array.from({ length: 21 }, () => 'a').join(' '));
  await B.page.locator('#live-chat-send').click();
  await expect(B.page.locator('#live-chat-n')).toHaveClass(/bad/);
  await expect(B.page.locator('#live-says')).toBeVisible();
  await input.fill('wasd e 1 dm xin chao');
  await input.press('Enter');
  await expect.poll(() => peers(A.page).then(l => l[0].chat)).toBe('wasd e 1 *** xin chao');
  await expect(B.page.locator('#live-says')).toBeHidden();
  await A.context.close(); await B.context.close();
});

test('một người ở làng, một người trong nhà: không thấy nhau, không thấy chat của nhau', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(60_000);
  const A = await player(browser, opts(testInfo, baseURL), at(200, 180));
  const B = await player(browser, opts(testInfo, baseURL), s => { s.scene = 'house'; Object.assign(s.player, { x: 96, y: 100, dir: 0 }); });
  await A.page.waitForTimeout(800);
  expect(await peers(A.page)).toEqual([]);
  expect(await peers(B.page)).toEqual([]);
  await B.page.locator('#live-chat').click();
  await B.page.getByRole('button', { name: QUICK_CHAT[1] }).click();
  await A.page.locator('#live-chat').click();
  await A.page.getByRole('button', { name: QUICK_CHAT[2] }).click();
  await openEmotes(A.page);
  await A.page.getByRole('button', { name: '👋' }).click();
  await A.page.waitForTimeout(800);
  expect(await peers(A.page)).toEqual([]);
  expect(await peers(B.page)).toEqual([]);
  await A.context.close(); await B.context.close();
});

test('online: mua hạt giống ở chợ Bà Tư vẫn như cũ; cột chat/biểu cảm không đè joystick, nút hành động, bản đồ nhỏ', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(60_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), s => { at(296, 96)(s); s.coins = 500; s.inv = { seed_carot: 0 }; });
  const { page } = A;
  const stall = await page.evaluate(async () => { const { sceneMap } = await import('/state.js'); const b = sceneMap(globalThis.__farm.state).building('market'); return { x: b.x + 24, y: b.y + 20 }; });
  await page.waitForTimeout(400);
  const p = await page.evaluate(([x, y]) => { const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect(); return { x: (x * f.scale - f.view.camX) / f.dpr + rc.left, y: (y * f.scale - f.view.camY) / f.dpr + rc.top }; }, [stall.x, stall.y]);
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
  await expect(page.locator('.sheet-head h2')).toHaveText(/Chợ Bà Tư/, { timeout: 10_000 });
  await page.locator('.row', { hasText: 'Hạt cà rốt' }).getByRole('button', { name: '×1' }).click();
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.inv.seed_carot)).toBe(1);
  await page.locator('#panel-root .close').click();

  // đứng cạnh chợ: có nút hành động; cột làng không đè gì
  await expect(page.locator('#main-action')).toBeVisible();
  await page.locator('#live-chat').click();
  await page.screenshot({ path: `test-results/live-layout-${testInfo.project.name}.png` });
  const measure = () => page.evaluate(() => {
    const r = sel => [...document.querySelectorAll(sel)].filter(e => e.offsetParent || getComputedStyle(e).position === 'fixed').map(e => { const b = e.getBoundingClientRect(); return { sel, l: b.left, t: b.top, r: b.right, b: b.bottom }; }).filter(b => b.r > b.l);
    return { live: r('#live .live-btn'), others: [...r('#joy-base'), ...r('#main-action'), ...r('#chips .chip'), ...r('#target-name'), ...r('#mini-wrap'), ...r('#hud-speed'), ...r('#todo-btn')] };
  });
  const phone = page.viewportSize().width <= 600;
  const check = boxes => {
    if (touch) expect(boxes.others.some(o => o.sel === '#joy-base')).toBe(true);
    for (const a of boxes.live) for (const o of boxes.others)
      expect(a.r <= o.l || o.r <= a.l || a.b <= o.t || o.b <= a.t, `${JSON.stringify(a)} đè ${JSON.stringify(o)}`).toBe(true);
  };
  const boxes = await measure();
  expect(boxes.live.length).toBe(phone ? 4 : 7);   // điện thoại: 😊 + chat + bạn bè + người đang ở đây; màn rộng: 4 biểu cảm + 3 nút kia
  check(boxes);
  if (phone) {   // bung biểu cảm ra: 4 biểu cảm thêm vào, vẫn không đè gì
    await page.locator('#live-emote-toggle').click();
    const open = await measure();
    expect(open.live.length).toBe(8);
    check(open);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await A.context.close();
});
