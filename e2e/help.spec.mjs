// Giúp vườn bạn (issue 28): khách tưới / nhổ cỏ giúp trong vườn người khác, server kiểm tra bằng luật trong state.js
// rồi xếp hàng. Hai trình duyệt: chủ vườn A và khách B. Dựng tình huống qua API công khai của server.
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, closeAway, tapPlot } from './helpers.mjs';
import { moveEntity, mapOf } from '../public/state.js';
import { FIELD_SIZE, TS } from '../public/layout.js';
import { GUEST } from '../public/data.js';

const uniq = () => 'Hp' + Math.random().toString(36).slice(2, 7);
const opts = (testInfo, baseURL) => ({ baseURL, ...testInfo.project.use });
const GATE_AT = { x: 488, y: 364 };   // chỗ đứng trước cổng bạn bè trong làng
const st = (page, fn) => page.evaluate(fn);

// Tài khoản mới có vườn ghi sẵn trên server; `open()` mới thật sự mở trình duyệt chơi (chưa mở = chủ đang offline)
async function player(browser, { baseURL, viewport, isMobile, hasTouch }, mutate) {
  const context = await browser.newContext({ baseURL, viewport, isMobile, hasTouch });
  const name = uniq();
  const invite = (await runAdmin('invite', '--db', E2E_DB)).out;
  expect((await context.request.post('/api/register', { data: { name, pin: '123456', invite } })).ok()).toBe(true);
  const { play } = await (await context.request.post('/api/play', { data: {} })).json();
  const save = makeSave(s => { s.look.shirt = 4; mutate?.(s); }, { name });
  expect((await context.request.post('/api/farm', { data: { play, save } })).ok()).toBe(true);
  await context.addInitScript(n => {
    try { localStorage.setItem('nongtrai-online', n); localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {}
  }, name);
  const me = { name, context, save, errors: [], page: null };
  me.open = async () => {
    const page = me.page = await context.newPage();
    page.on('pageerror', e => me.errors.push(e.message));
    await page.goto('/');
    await page.waitForFunction(() => globalThis.__farm?.state?.mode === 'online');
    await expect(page.locator('#live')).toBeVisible();
    return page;
  };
  return me;
}

// Vườn của chủ: nhà, kho, thùng giao hàng, chuồng chó dời gần cổng (cho khách đi ít); ô 0 cây khô cần tưới;
// chủ đứng gần cổng
function ownerGarden(s) {
  s.scene = 'farm';
  s.farm.ents = s.farm.ents.filter(e => !(e.kind === 'tree' && e.c === 42 && e.r === 28));
  Object.assign(s.farm.ents.find(e => e.kind === 'house'), { c: 39, r: 27 });
  s.farm.rev++;
  const id = k => s.farm.ents.find(e => e.kind === k).id;
  for (const [k, c, r] of [['shed', 39, 20], ['shipbin', 33, 22], ['doghouse', 42, 32]]) expect(moveEntity(s, id(k), c, r).ok, k).toBe(true);
  Object.assign(s.dog, mapOf(s).dogHome);
  // dời khối ruộng có ô 0 tới chỗ hợp lệ gần cổng nhất: khách bước vào là thấy ngay ô cần tưới
  const t0 = mapOf(s).plotTile(0), exit = mapOf(s).arrive.village, o = s.farm.owned, spots = [];
  const field = s.farm.ents.find(e => e.kind === 'field' && t0.c >= e.c && t0.c < e.c + FIELD_SIZE && t0.r >= e.r && t0.r < e.r + FIELD_SIZE);
  for (let r = o.r; r <= o.r + o.h - FIELD_SIZE; r++) for (let c = o.c; c <= o.c + o.w - FIELD_SIZE; c++)
    spots.push({ c, r, d: Math.hypot((c + 1) * TS + 8 - exit.x, (r + 1) * TS + 8 - exit.y) });
  spots.sort((a, b) => a.d - b.d);
  expect(spots.some(q => q.d > TS && moveEntity(s, field.id, q.c, q.r).ok), 'dời khối ruộng ra gần cổng').toBe(true);
  plant(s, 0, { water: 0 });
  Object.assign(s.player, { x: 600, y: 470, dir: 0 });
}
function plant(s, idx, { water, weeds = false }) {
  const p = s.plots[idx];
  p.soil = 'tilled'; p.water = water; p.weeds = weeds;
  p.crop = { id: 'carot', progress: 0.4, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
}
const guestAt = (x, y) => s => { s.scene = 'village'; Object.assign(s.player, { x, y, dir: 3 }); };

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
    return { x: sx, y: sy };
  }, [x, y]);
  if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
}
// Chạm về phía chỗ đứng (x, y) cho tới khi nút hành động hiện tên `name`
async function reach(page, touch, x, y, name) {
  for (let i = 0; i < 25; i++) {
    if (await page.locator('#target-name').isVisible() && (await page.locator('#target-name').textContent()) === name) return;
    await tapWorld(page, touch, x, y);
    await page.waitForTimeout(600);
  }
  throw new Error('không tới được ' + name);
}

// Từ trước cổng bạn bè trong làng: chạm cổng, chọn cổng vườn của chủ trong danh sách rồi bấm Vào (issue 26, 27)
async function enterGarden(page, owner) {
  await expect(page.locator('#target-name')).toHaveText('Cổng bạn bè');
  await page.locator('#main-action').click();
  await expect(page.locator('.sheet-head h2')).toHaveText(/Bạn bè/);
  await page.locator(`.gate-row[data-name="${owner}"] .gate-go`).click();
  await expect.poll(() => st(page, () => globalThis.__farm.state?.scene)).toBe('visit');
  await expect(page.locator('#visit-bar')).toBeVisible();
}

test('B tưới giúp vườn A: B được xu và EXP, A đang online thấy ô được tưới và lời cảm ơn có tên B', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), ownerGarden);
  const B = await player(browser, opts(testInfo, baseURL), guestAt(GATE_AT.x, GATE_AT.y));
  await A.open();
  await closeAway(A.page);
  await B.open();
  await enterGarden(B.page, A.name);
  await expect(B.page.locator('#visit-help')).toHaveText(new RegExp(`Còn ${GUEST.helpMax} lượt giúp`));
  const before = await st(B.page, () => ({ coins: globalThis.__farm.state.coins, exp: globalThis.__farm.state.exp }));

  // B đi tới ô 0 (cây khô) và tưới giúp
  await tapPlot(B.page, 0, touch, () => st(B.page, () => globalThis.__farm.state.plots[0].water > 50));
  // B nhận xu và EXP (server xác nhận mới cộng)
  await expect.poll(() => st(B.page, () => globalThis.__farm.state.coins)).toBe(before.coins + GUEST.helpCoins);
  expect(await st(B.page, () => globalThis.__farm.state.exp)).toBe(before.exp + GUEST.helpExp);
  await expect(B.page.locator('#visit-help')).toHaveText(new RegExp(`Còn ${GUEST.helpMax - 1} lượt giúp`));
  // A đang online: thấy ô được tưới và lời cảm ơn có tên B
  await expect.poll(() => st(A.page, () => globalThis.__farm.state.plots[0].water)).toBeGreaterThan(50);
  await expect(A.page.locator('#toasts')).toContainText(`${B.name} đã tưới 1 ô giúp bạn`);
  await B.page.screenshot({ path: `test-results/help-guest-${testInfo.project.name}.png` });
  await A.page.screenshot({ path: `test-results/help-owner-${testInfo.project.name}.png` });

  expect(A.errors.concat(B.errors)).toEqual([]);
  await A.context.close(); await B.context.close();
});

test('vườn đã được giúp đủ 10 việc hôm nay: khách thấy lý do và nút giúp mờ, ô vẫn khô', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch;
  const day = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const C = await player(browser, opts(testInfo, baseURL), s => { ownerGarden(s); s.today = { day, helps: GUEST.helpMax, steals: 0, stolen: 0 }; });
  const B = await player(browser, opts(testInfo, baseURL), guestAt(GATE_AT.x, GATE_AT.y));
  await B.open();
  await enterGarden(B.page, C.name);
  await expect(B.page.locator('#visit-help')).toHaveText(/Còn 0 lượt giúp/);
  // đứng cạnh ô cây khô: nút giúp vẫn hiện nhưng mờ, bấm vào chỉ ra lý do, ô không đổi
  const main = B.page.locator('#main-action');
  const at0 = await st(B.page, async () => { const { mapOf } = await import('/state.js'); return mapOf(globalThis.__farm.state).plotCenter(0); });
  await reach(B.page, touch, at0.x - 16, at0.y, 'Cà rốt');
  await expect(main).toHaveClass(/disabled/);
  await expect(main).toContainText('Tưới giúp');
  await main.click();
  await expect(B.page.locator('#toasts')).toContainText('Vườn này hôm nay đã được giúp đủ');
  expect(await st(B.page, () => globalThis.__farm.state.plots[0].water)).toBe(0);
  expect(await st(B.page, () => globalThis.__farm.state.coins)).toBe(B.save.coins);
  await B.page.screenshot({ path: `test-results/help-full-${testInfo.project.name}.png` });
  expect(B.errors).toEqual([]);
  await C.context.close(); await B.context.close();
});

test('A offline: B tưới giúp, A đăng nhập lại thấy ô đã được tưới và lời cảm ơn có tên B', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  // chủ vắng 6 phút: lúc khách ghé, server chạy bù rồi áp dụng việc giúp ngay trên bản lưu
  const A = await player(browser, opts(testInfo, baseURL), s => { ownerGarden(s); s.savedAt = Date.now() - 6 * 60_000; });
  const B = await player(browser, opts(testInfo, baseURL), guestAt(GATE_AT.x, GATE_AT.y));
  await B.open();
  await enterGarden(B.page, A.name);
  await tapPlot(B.page, 0, touch, () => st(B.page, () => globalThis.__farm.state.plots[0].water > 50));
  await expect.poll(() => st(B.page, () => globalThis.__farm.state.coins)).toBeGreaterThan(B.save.coins);

  // A đăng nhập lại: vườn đã được tưới, màn vắng nhà đóng xong thì hiện lời cảm ơn
  await A.open();
  await closeAway(A.page);
  expect(await st(A.page, () => globalThis.__farm.state.plots[0].water)).toBeGreaterThan(50);
  await expect(A.page.locator('#toasts')).toContainText(`${B.name} đã tưới 1 ô giúp bạn`);
  // chỉ cảm ơn một lần: tải lại trang không hiện lại
  await A.page.reload();
  await A.page.waitForFunction(() => globalThis.__farm?.state?.mode === 'online');
  await closeAway(A.page);
  await A.page.waitForTimeout(500);
  await expect(A.page.locator('#toasts')).not.toContainText('giúp bạn');
  expect(A.errors.concat(B.errors)).toEqual([]);
  await A.context.close(); await B.context.close();
});
