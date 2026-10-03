// Trái khổng lồ (issue 53). Bản lưu ghi sẵn kết quả lần tung lúc cây chín (crop.giant) cho cây thành thạo cấp 3, chăm kỹ ★3;
// tỉ lệ tung kiểm ở unit test bằng hạt giống cố định (tests/giant.test.mjs).
// 1) Một trình duyệt: thấy hình to tràn ra ngoài ô, thu hoạch, giỏ chiếm 5 chỗ, có thông báo.
// 2) Hai trình duyệt qua server: khách vào vườn có trái khổng lồ, trộm được phần thường nhưng không lấy được trái khổng lồ.
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, seedSave, tapPlot } from './helpers.mjs';
import { moveEntity, mapOf } from '../public/state.js';
import { FIELD_SIZE, TS } from '../public/layout.js';
import { GIANT, GUEST, giantKey, starKey } from '../public/data.js';

// Dâu tây chín, bón phân, có chăm tay, không khô, không sâu: ★3
const dau = giant => ({ id: 'dau', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: true, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: true }, giant });
const G3 = giantKey('dau', 3), D3 = starKey('dau', 3);
const st = (page, fn, arg) => page.evaluate(fn, arg);
async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
}
// Chờ camera đứng yên rồi đọc điểm ảnh canvas ở dải 24x8 ngay phía trên ô ruộng idx (chỗ trái khổng lồ tràn ra ngoài ô)
async function aboveTile(page, idx) {
  let last = '';
  for (let k = 0; k < 30; k++) {
    const cur = await st(page, () => JSON.stringify(globalThis.__farm.view));
    if (cur === last) break;
    last = cur;
    await page.waitForTimeout(150);
  }
  return st(page, async i => {
    const { mapOf } = await import('/state.js');
    const f = globalThis.__farm, c = mapOf(f.state).plotCenter(i), cv = document.getElementById('game-canvas');
    const x0 = Math.round((c.x - 12) * f.scale - f.view.camX), y0 = Math.round((c.y - 16) * f.scale - f.view.camY);
    return Array.from(cv.getContext('2d').getImageData(x0, y0, Math.round(24 * f.scale), Math.round(8 * f.scale)).data);
  }, idx);
}
const differ = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 90) n++; return n / (a.length / 4); };

test('ô có trái khổng lồ: hình to tràn ra ngoài ô; thu hoạch được trái khổng lồ, giỏ chiếm 5 chỗ, có thông báo 🟡', async ({ page, context, browser, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const save = giant => makeSave(s => {
    s.weather = 'cloud'; s.exp = 1e6;   // cấp cao nhất: thu hoạch không bật màn lên cấp che ruộng
    s.mastery.dau = { lv: 3, n: 999 };
    Object.assign(s.plots[0], { soil: 'tilled', water: 100, crop: dau(giant) });
    const c = mapOf(s).plotCenter(0);
    Object.assign(s.player, { x: c.x, y: c.y + 40 });   // đứng ngay dưới ô 0: camera nhìn thấy ô
  });
  await seedSave(context, save(true));
  await page.goto('/');
  await ready(page);
  const big = await aboveTile(page, 0);
  await page.screenshot({ path: `test-results/giant-plot-${testInfo.project.name}.png` });

  // cùng vườn, ô 0 không có trái khổng lồ: dải phía trên ô khác hẳn (trái khổng lồ to tràn ra ngoài ô)
  const { viewport, isMobile, hasTouch, deviceScaleFactor } = testInfo.project.use;
  const other = await browser.newContext({ baseURL, viewport, isMobile, hasTouch, deviceScaleFactor });
  await seedSave(other, save(false));
  const p2 = await other.newPage();
  await p2.goto('/');
  await ready(p2);
  const plain = await aboveTile(p2, 0);
  await other.close();
  expect(differ(big, plain)).toBeGreaterThan(0.2);

  // chọn ô: tên ô báo có trái khổng lồ, nút thu hoạch ghi kèm
  const used0 = await st(page, () => Object.values(globalThis.__farm.state.basket).reduce((a, n) => a + n, 0));
  expect(used0).toBe(0);
  await tapPlot(page, 0, touch, () => st(page, k => !!globalThis.__farm.state.basket[k], G3));
  const b = await st(page, () => ({ ...globalThis.__farm.state.basket }));
  expect(b[G3]).toBe(1);
  expect(b[D3]).toBeGreaterThanOrEqual(11);   // 6 × 1,5 (bón phân) + 2 (thành thạo cấp 3), đúng mùa có lúc thêm 1
  await expect(page.locator('#toasts')).toContainText('dâu tây khổng lồ');
  await page.screenshot({ path: `test-results/giant-harvest-${testInfo.project.name}.png` });

  // túi đồ: dòng riêng "Dâu tây khổng lồ ★3", giỏ tính 5 chỗ cho nó
  await page.evaluate(async () => (await import('/ui.js')).openPanel('bag'));
  const cell = page.locator('#panel-root .cell.giant');
  await expect(cell.locator('.cell-name')).toHaveText('Dâu tây khổng lồ ★3');
  await expect(cell.locator('.giant-slots')).toHaveText(`🧺 ${GIANT.slots} chỗ`);
  await expect(page.locator('#panel-root')).toContainText(`🧺 Giỏ (${b[D3] + GIANT.slots}/`);
  await page.screenshot({ path: `test-results/giant-bag-${testInfo.project.name}.png` });
  expect(errors).toEqual([]);
});

// ---------- Hai trình duyệt ----------
const uniq = () => 'Gi' + Math.random().toString(36).slice(2, 7);
const GATE_AT = { x: 488, y: 364 };   // chỗ đứng trước cổng bạn bè trong làng
const LV5 = 500;                      // đủ kinh nghiệm để lên cấp 5 (cấp tối thiểu để trộm và để bị trộm)
async function player(browser, { baseURL, viewport, isMobile, hasTouch }, mutate) {
  const context = await browser.newContext({ baseURL, viewport, isMobile, hasTouch });
  const name = uniq();
  const invite = (await runAdmin('invite', '--db', E2E_DB)).out;
  expect((await context.request.post('/api/register', { data: { name, pin: '123456', invite } })).ok()).toBe(true);
  const { play } = await (await context.request.post('/api/play', { data: {} })).json();
  const save = makeSave(s => { s.look.shirt = 4; s.exp = LV5; mutate?.(s); }, { name });
  expect((await context.request.post('/api/farm', { data: { play, save } })).ok()).toBe(true);
  await context.addInitScript(n => {
    try { localStorage.setItem('nongtrai-online', n); localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {}
  }, name);
  const me = { name, context, errors: [], page: null };
  me.open = async () => {
    const page = me.page = await context.newPage();
    page.on('pageerror', e => me.errors.push(e.message));
    await page.goto('/');
    await page.waitForFunction(() => globalThis.__farm?.state?.mode === 'online');
    return page;
  };
  return me;
}
// Vườn của chủ: khối ruộng có ô 0 dời ra gần cổng; ô 0 dâu tây ★3 có trái khổng lồ
function ownerGarden(s) {
  s.scene = 'farm';
  const t0 = mapOf(s).plotTile(0), exit = mapOf(s).arrive.village, o = s.farm.owned, spots = [];
  const field = s.farm.ents.find(e => e.kind === 'field' && t0.c >= e.c && t0.c < e.c + FIELD_SIZE && t0.r >= e.r && t0.r < e.r + FIELD_SIZE);
  for (let r = o.r; r <= o.r + o.h - FIELD_SIZE; r++) for (let c = o.c; c <= o.c + o.w - FIELD_SIZE; c++)
    spots.push({ c, r, d: Math.hypot((c + 1) * TS + 8 - exit.x, (r + 1) * TS + 8 - exit.y) });
  spots.sort((a, b) => a.d - b.d);
  expect(spots.some(q => q.d > TS && moveEntity(s, field.id, q.c, q.r).ok), 'dời khối ruộng ra gần cổng').toBe(true);
  Object.assign(s.plots[0], { soil: 'tilled', water: 100, weeds: false, crop: dau(true) });
}
const guestAt = (x, y) => s => { s.scene = 'village'; Object.assign(s.player, { x, y, dir: 3 }); };
// Chạm điểm (x, y) của bản đồ (ngoài màn hình thì chạm về phía đó) cho tới khi tên mục tiêu bắt đầu bằng `name`
async function tapWorld(page, touch, x, y) {
  const pt = await st(page, ([wx, wy]) => {
    const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
    const top = document.getElementById('hud').getBoundingClientRect().bottom + 30, bot = document.getElementById('bottombar').getBoundingClientRect().top - 30;
    const sx = (wx * f.scale - f.view.camX) / f.dpr + rc.left, sy = (wy * f.scale - f.view.camY) / f.dpr + rc.top;
    return { x: Math.min(innerWidth - 60, Math.max(60, sx)), y: Math.min(bot - 20, Math.max(top + 20, sy)) };
  }, [x, y]);
  if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
}
async function reach(page, touch, x, y, name) {
  for (let i = 0; i < 25; i++) {
    if (await page.locator('#target-name').isVisible() && (await page.locator('#target-name').textContent()).startsWith(name)) return;
    await tapWorld(page, touch, x, y);
    await page.waitForTimeout(600);
  }
  throw new Error('không tới được ' + name);
}
async function enterGarden(page, owner) {
  await expect(page.locator('#target-name')).toHaveText('Cổng bạn bè');
  await page.locator('#main-action').click();
  await expect(page.locator('.sheet-head h2')).toHaveText(/Bạn bè/);
  await page.locator(`.gate-row[data-name="${owner}"] .gate-go`).click();
  await expect.poll(() => st(page, () => globalThis.__farm.state?.scene)).toBe('visit');
  await expect(page.locator('#visit-bar')).toBeVisible();
}

test('khách vào vườn có trái khổng lồ: trộm được phần dâu thường, thử trộm trái khổng lồ thì không lấy được', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  const use = { baseURL, ...testInfo.project.use };
  const A = await player(browser, use, ownerGarden);
  const B = await player(browser, use, guestAt(GATE_AT.x, GATE_AT.y));
  await B.open();
  await enterGarden(B.page, A.name);

  // chạm ô 0: nút chính là trộm phần dâu thường (được), nút trộm trái khổng lồ mờ kèm lý do
  await tapPlot(B.page, 0, touch, () => st(B.page, k => (globalThis.__farm.state.basket[k] || 0) > 0, D3));
  expect(await st(B.page, k => globalThis.__farm.state.basket[k], D3)).toBe(Math.floor(9 * GUEST.stealPct));   // 6 × 1,5 (bón phân) = 9, lấy 25%
  // đứng sát mép trái ô 0 cho ô 0 thành ô gần nhất (thanh hành động theo ô gần nhất): nút trộm trái khổng lồ hiện mờ
  const c0 = await st(B.page, async () => { const { mapOf } = await import('/state.js'); return mapOf(globalThis.__farm.state).plotCenter(0); });
  await reach(B.page, touch, c0.x - 14, c0.y, 'Dâu tây');
  await expect(B.page.locator('#target-name')).toContainText('khổng lồ');
  const chip = B.page.locator('#chips .chip.disabled', { hasText: 'Trộm dâu tây khổng lồ' });
  if (B.page.viewportSize().width <= 600) await expect(chip).toHaveCount(0);   // điện thoại: bảng hành động ẩn nút không dùng được
  else {
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(B.page.locator('#toasts')).toContainText('Trái khổng lồ nặng quá');
  }
  await B.page.screenshot({ path: `test-results/giant-guest-${testInfo.project.name}.png` });

  // khách không có trái khổng lồ; vườn chủ trên server vẫn còn nguyên trái khổng lồ
  expect(await st(B.page, k => globalThis.__farm.state.basket[k] ?? 0, G3)).toBe(0);
  await expect.poll(async () => (await (await B.context.request.get(`/api/visit?name=${A.name}`)).json()).farm.plots[0].crop.stolen).toBe(Math.floor(9 * GUEST.stealPct));
  const seen = await (await B.context.request.get(`/api/visit?name=${A.name}`)).json();
  expect(seen.farm.plots[0].crop.giant).toBe(true);
  expect(B.errors).toEqual([]);
  await A.context.close(); await B.context.close();
});
