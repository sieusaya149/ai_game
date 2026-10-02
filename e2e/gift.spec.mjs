// Tặng quà và ký sổ lưu bút ở cổng vườn (issue 29). Hai trình duyệt: chủ vườn A và khách B.
// Dựng tình huống qua API công khai của server (đăng ký, xin phiên chơi, gửi bản lưu ghi sẵn), mã mời bằng lệnh quản trị.
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, closeAway } from './helpers.mjs';

const uniq = () => 'Gf' + Math.random().toString(36).slice(2, 7);
const opts = (testInfo, baseURL) => ({ baseURL, ...testInfo.project.use });
const GATE_AT = { x: 488, y: 364 };   // chỗ đứng trước cổng bạn bè trong làng
const st = (page, fn) => page.evaluate(fn);

// Tài khoản mới có vườn ghi sẵn trên server. open = mở trình duyệt chơi luôn; không thì chủ vườn đang offline.
async function player(browser, use, mutate, open = true) {
  const context = await browser.newContext(use);
  const name = uniq();
  const invite = (await runAdmin('invite', '--db', E2E_DB)).out;
  expect((await context.request.post('/api/register', { data: { name, pin: '123456', invite } })).ok()).toBe(true);
  const { play } = await (await context.request.post('/api/play', { data: {} })).json();
  const save = makeSave(s => mutate?.(s), { name });
  expect((await context.request.post('/api/farm', { data: { play, save } })).ok()).toBe(true);
  const p = { name, context, save, errors: [] };
  p.start = async () => {
    await context.addInitScript(n => {
      try { localStorage.setItem('nongtrai-online', n); localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {}
    }, name);
    p.page = await context.newPage();
    p.page.on('pageerror', e => p.errors.push(e.message));
    await p.page.goto('/');
    await p.page.waitForFunction(() => globalThis.__farm?.state?.mode === 'online');
    await closeAway(p.page);
    await expect(p.page.locator('#live')).toBeVisible();
    return p.page;
  };
  if (open) await p.start();
  return p;
}

// Chủ vườn đứng ngay trong vườn, gần cổng; khách đứng trước cổng bạn bè trong làng với ít hạt giống trong kho
const atGate = s => { s.scene = 'farm'; Object.assign(s.player, { x: 600, y: 500, dir: 2 }); };
const guestAt = extra => s => { s.scene = 'village'; Object.assign(s.player, { x: GATE_AT.x, y: GATE_AT.y, dir: 3 }); extra?.(s); };

// Chạm điểm (x, y) của bản đồ: ngoài màn hình thì chạm về phía đó cho nhân vật đi tới (tránh HUD, thanh dưới, bản đồ nhỏ)
async function tapWorld(page, touch, x, y) {
  const pt = await page.evaluate(([wx, wy]) => {
    const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
    const top = document.getElementById('hud').getBoundingClientRect().bottom + 30, bot = document.getElementById('bottombar').getBoundingClientRect().top - 30;
    const mini = document.getElementById('mini-wrap').getBoundingClientRect();
    let sx = (wx * f.scale - f.view.camX) / f.dpr + rc.left, sy = (wy * f.scale - f.view.camY) / f.dpr + rc.top;
    const ok = sx > 30 && sx < innerWidth - 30 && sy > top && sy < bot && !(sx > mini.left - 14 && sy < mini.bottom + 14);
    if (!ok) {
      sx = Math.min(innerWidth - 60, Math.max(60, sx)); sy = Math.min(bot - 20, Math.max(top + 20, sy));
      if (sx > mini.left - 30 && sy < mini.bottom + 30) sy = Math.min(bot - 20, mini.bottom + 40);
    }
    return { x: sx, y: sy, ok };
  }, [x, y]);
  if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
}
// Đi tới đứng cạnh vật ở cổng (hộp quà / sổ lưu bút) rồi bấm nút hành động chính: mở đúng bảng
async function openGateThing(page, touch, id, title) {
  const at = await page.evaluate(async id => {
    const { sceneMap } = await import('/state.js');
    return sceneMap(globalThis.__farm.state).building(id).at;
  }, id);
  for (let i = 0; i < 25; i++) {
    const name = await page.locator('#target-name').textContent().catch(() => '');
    if (await page.locator('#main-action').isVisible() && /Hộp quà|Sổ lưu bút/.test(name ?? '')
      && (id === 'giftbox') === /Hộp quà/.test(name ?? '')) break;
    await tapWorld(page, touch, at.x, at.y);
    await page.waitForTimeout(600);
    if (i === 24) throw new Error(`không tới được ${id}`);
  }
  await page.locator('#main-action').click();
  await expect(page.locator('.sheet-head h2')).toHaveText(new RegExp(title));
}
// Từ trước cổng bạn bè trong làng: chạm cổng, chọn cổng vườn của chủ trong danh sách rồi bấm Vào
async function enterGarden(page, owner) {
  await expect(page.locator('#target-name')).toHaveText('Cổng bạn bè');
  await page.locator('#main-action').click();
  await expect(page.locator('.sheet-head h2')).toHaveText(/Bạn bè/);
  await page.locator(`.gate-row[data-name="${owner}"] .gate-go`).click();
  await expect.poll(() => st(page, () => globalThis.__farm.state?.scene)).toBe('visit');
  await expect(page.locator('#visit-owner')).toHaveText(owner);
}
// Khách: tặng 1 món `item` ở hộp quà và ký sổ dòng `text`
async function giveAndSign(page, touch, item, text) {
  await openGateThing(page, touch, 'giftbox', 'Hộp quà');
  await page.locator(`.gift-row[data-item="${item}"] .gift-1`).click();
  await expect(page.locator('#gate-msg')).toContainText('vào hộp quà');
  await page.locator('.sheet-head .close').click();
  await openGateThing(page, touch, 'guestbook', 'Sổ lưu bút');
  await page.locator('#note-input').fill(text);
  await page.locator('#note-sign').click();
  await expect(page.locator('#gate-msg')).toContainText('Đã ký sổ lưu bút');
  await expect(page.locator('.note-row').first()).toContainText(text);
}

test('B tặng hạt giống và ký sổ ở cổng vườn A; A đang online thấy thông báo, nhận quà vào kho và đọc được sổ', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(150_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), atGate);
  const B = await player(browser, opts(testInfo, baseURL), guestAt(s => { s.inv.seed_cai = 4; s.basket = {}; }));
  await enterGarden(B.page, A.name);

  const seeds0 = await st(A.page, () => globalThis.__farm.state.inv.seed_cai ?? 0);
  await giveAndSign(B.page, touch, 'seed_cai', 'Vườn đẹp quá!');
  expect(await st(B.page, () => globalThis.__farm.state.inv.seed_cai)).toBe(3);   // trừ đúng khỏi kho khách
  await B.page.screenshot({ path: `test-results/gift-guest-${testInfo.project.name}.png` });

  // A đang online: thông báo 🟡 quà và lời nhắn, hộp quà ở cổng đổi sang "có quà"
  await expect(A.page.locator('#toasts')).toContainText(`${B.name} tặng bạn 1 hạt cải xanh`);
  await expect(A.page.locator('#toasts')).toContainText(`${B.name} vừa ký sổ lưu bút của bạn`);
  await expect.poll(() => st(A.page, () => globalThis.__farm.state.gate?.gifts)).toBe(1);

  // A ra cổng mở hộp quà: hạt giống vào kho, hộp trống lại
  await openGateThing(A.page, touch, 'giftbox', 'Hộp quà');
  await expect(A.page.locator('.gift-row')).toContainText('Hạt cải xanh ×1');
  await expect(A.page.locator('.gift-row')).toContainText(B.name);
  await A.page.screenshot({ path: `test-results/gift-owner-${testInfo.project.name}.png` });
  await A.page.locator('#gift-take').click();
  await expect(A.page.locator('#gate-msg')).toContainText('Đã nhận 1 món');
  expect(await st(A.page, () => globalThis.__farm.state.inv.seed_cai)).toBe(seeds0 + 1);
  await expect(A.page.locator('.gift-list .empty')).toContainText('Hộp quà đang trống');
  await A.page.locator('.sheet-head .close').click();

  // A đọc sổ lưu bút: thấy dòng của B
  await openGateThing(A.page, touch, 'guestbook', 'Sổ lưu bút');
  await expect(A.page.locator(`.note-row[data-from="${B.name}"]`)).toContainText('Vườn đẹp quá!');
  await expect(A.page.locator('#note-input')).toHaveCount(0);   // chủ chỉ đọc, không tự ký sổ mình
  await A.page.screenshot({ path: `test-results/gift-book-${testInfo.project.name}.png` });

  // không tràn ngang; khung viết lưu bút của khách có ô nhập và nút gửi cùng nhìn thấy
  expect(await A.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const fit = await B.page.evaluate(() => {
    const sh = document.querySelector('.sheet'), box = document.querySelector('.sheet-body');
    const inp = document.getElementById('note-input'), go = document.getElementById('note-sign');
    const b = box.getBoundingClientRect(), i = inp.getBoundingClientRect(), g = go.getBoundingClientRect();
    return { wide: sh.getBoundingClientRect().width <= innerWidth, scroll: box.scrollWidth <= box.clientWidth + 1,
      inp: i.right <= b.right + 1 && i.left >= b.left - 1, go: g.bottom <= b.bottom + 1 && g.top >= b.top - 1, tall: g.height };
  });
  expect(fit).toEqual({ wide: true, scroll: true, inp: true, go: true, tall: fit.tall });
  expect(fit.tall).toBeGreaterThanOrEqual(40);
  expect(A.errors.concat(B.errors)).toEqual([]);
  await A.context.close(); await B.context.close();
});

test('A offline lúc B tặng quà và ký sổ: A đăng nhập sau vẫn nhận được quà và đọc được lời nhắn', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(150_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), atGate, false);   // chủ chưa mở trình duyệt
  const B = await player(browser, opts(testInfo, baseURL), guestAt(s => { s.inv.seed_cai = 4; s.basket = { carot: 2 }; }));
  await enterGarden(B.page, A.name);
  await giveAndSign(B.page, touch, 'carot', 'Nhớ tưới cây nhé!');
  expect(await st(B.page, () => globalThis.__farm.state.basket.carot ?? 0)).toBe(1);
  await B.context.close();

  // giờ A mới vào làng: quà và lời nhắn vẫn nằm chờ ở cổng
  await A.start();
  await expect.poll(() => st(A.page, () => globalThis.__farm.state.gate?.gifts)).toBe(1);
  await openGateThing(A.page, touch, 'giftbox', 'Hộp quà');
  await expect(A.page.locator('.gift-row')).toContainText('Cà rốt ×1');
  await A.page.locator('#gift-take').click();
  await expect(A.page.locator('#gate-msg')).toContainText('Đã nhận 1 món');
  expect(await st(A.page, () => globalThis.__farm.state.basket.carot ?? 0)).toBe(1);
  await A.page.locator('.sheet-head .close').click();
  await openGateThing(A.page, touch, 'guestbook', 'Sổ lưu bút');
  await expect(A.page.locator(`.note-row[data-from="${B.name}"]`)).toContainText('Nhớ tưới cây nhé!');
  expect(A.errors).toEqual([]);
  await A.context.close();
});
