// Trộm vườn bạn (issue 30): khách từ cấp 5 hái trộm ô đã chín trong vườn người khác, luật và giới hạn nằm
// trong state.js, server kiểm tra rồi xếp hàng. Hai trình duyệt: chủ vườn A và khách B.
// Lát này chưa có chó canh (issue 31) nên trộm cứ thành công trong giới hạn.
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, closeAway, tapPlot } from './helpers.mjs';
import { moveEntity, mapOf } from '../public/state.js';
import { FIELD_SIZE, TS } from '../public/layout.js';
import { CROPS, GUEST } from '../public/data.js';

const uniq = () => 'St' + Math.random().toString(36).slice(2, 7);
const opts = (testInfo, baseURL) => ({ baseURL, ...testInfo.project.use });
const GATE_AT = { x: 488, y: 364 };   // chỗ đứng trước cổng bạn bè trong làng
const LV5 = 500;                      // đủ kinh nghiệm để lên cấp 5 (cấp tối thiểu để trộm và để bị trộm)
const st = (page, fn) => page.evaluate(fn);

// Tài khoản mới có vườn ghi sẵn trên server; `open()` mới thật sự mở trình duyệt chơi (chưa mở = chủ đang offline)
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

// Vườn của chủ: công trình dời gần cổng (cho khách đi ít); ô 0 là cà chua đã chín; chủ đứng gần cổng
function ownerGarden(s) {
  s.scene = 'farm';
  s.farm.ents = s.farm.ents.filter(e => !(e.kind === 'tree' && e.c === 42 && e.r === 28));
  Object.assign(s.farm.ents.find(e => e.kind === 'house'), { c: 39, r: 27 });
  s.farm.rev++;
  const id = k => s.farm.ents.find(e => e.kind === k).id;
  for (const [k, c, r] of [['shed', 39, 20], ['shipbin', 33, 22], ['doghouse', 43, 32]]) expect(moveEntity(s, id(k), c, r).ok, k).toBe(true);
  Object.assign(s.dog, mapOf(s).dogHome);
  // dời khối ruộng có ô 0 tới chỗ hợp lệ gần cổng nhất: khách bước vào là thấy ngay ô chín
  const t0 = mapOf(s).plotTile(0), exit = mapOf(s).arrive.village, o = s.farm.owned, spots = [];
  const field = s.farm.ents.find(e => e.kind === 'field' && t0.c >= e.c && t0.c < e.c + FIELD_SIZE && t0.r >= e.r && t0.r < e.r + FIELD_SIZE);
  for (let r = o.r; r <= o.r + o.h - FIELD_SIZE; r++) for (let c = o.c; c <= o.c + o.w - FIELD_SIZE; c++)
    spots.push({ c, r, d: Math.hypot((c + 1) * TS + 8 - exit.x, (r + 1) * TS + 8 - exit.y) });
  spots.sort((a, b) => a.d - b.d);
  expect(spots.some(q => q.d > TS && moveEntity(s, field.id, q.c, q.r).ok), 'dời khối ruộng ra gần cổng').toBe(true);
  const p = s.plots[0];
  p.soil = 'tilled'; p.water = 100; p.weeds = false;
  p.crop = { id: 'cachua', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
  Object.assign(s.player, { x: 600, y: 470, dir: 0 });
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
    if (await page.locator('#target-name').isVisible() && (await page.locator('#target-name').textContent()).startsWith(name)) return;   // ô ruộng có cây kèm sao (issue 52): 'Cà chua ★☆☆'
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
const plotCenter0 = page => st(page, async () => { const { mapOf } = await import('/state.js'); return mapOf(globalThis.__farm.state).plotCenter(0); });

test('B trộm ô cà chua chín của A: B có cà chua trong giỏ, ô của A còn lại phần lớn; trộm lần hai cùng ô thì bị chặn', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), ownerGarden);
  const B = await player(browser, opts(testInfo, baseURL), guestAt(GATE_AT.x, GATE_AT.y));
  await B.open();
  await enterGarden(B.page, A.name);

  const full = CROPS.cachua.yield, take = Math.max(1, Math.floor(full * GUEST.stealPct));
  await tapPlot(B.page, 0, touch, () => st(B.page, () => (globalThis.__farm.state.basket.cachua || 0) > 0));
  expect(await st(B.page, () => globalThis.__farm.state.basket.cachua)).toBe(take);
  // ô của A chỉ mất phần nhỏ: phần lớn vẫn còn cho chủ
  expect(await st(B.page, () => globalThis.__farm.state.plots[0].crop.stolen)).toBe(take);
  const seen = await (await B.context.request.get(`/api/visit?name=${A.name}`)).json();
  expect(seen.farm.plots[0].crop.stolen).toBe(take);
  expect(seen.farm.plots[0].crop.robbed).toEqual([B.name]);
  expect(full - take).toBeGreaterThan(take);
  await B.page.screenshot({ path: `test-results/steal-guest-${testInfo.project.name}.png` });

  // trộm lần hai cùng ô: nút mờ kèm lý do, bấm vào chỉ báo lý do, ô không mất thêm
  const main = B.page.locator('#main-action');
  const at0 = await plotCenter0(B.page);
  await reach(B.page, touch, at0.x - 16, at0.y, 'Cà chua');
  await expect(main).toHaveClass(/disabled/);
  await expect(main).toContainText('Trộm');
  await main.click();
  await expect(B.page.locator('#toasts')).toContainText('một lần rồi');
  expect(await st(B.page, () => globalThis.__farm.state.plots[0].crop.stolen)).toBe(take);
  expect(B.errors).toEqual([]);
  await A.context.close(); await B.context.close();
});

test('A mở nhật ký thấy dòng B đã trộm, bấm "Sang trộm lại" thì đi qua làng vào đúng vườn B', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), ownerGarden);
  const B = await player(browser, opts(testInfo, baseURL), guestAt(GATE_AT.x, GATE_AT.y));
  await B.open();
  await enterGarden(B.page, A.name);
  await tapPlot(B.page, 0, touch, () => st(B.page, () => (globalThis.__farm.state.basket.cachua || 0) > 0));

  // A đăng nhập lại: nhật ký có dòng "B đã trộm 1 cà chua lúc ..."
  await A.open();
  await closeAway(A.page);
  await A.page.locator('.bb-btn[data-panel="log"]').click();
  const row = A.page.locator(`.guest-row[data-by="${B.name}"]`);
  await expect(row).toContainText(`${B.name} đã trộm 1 cà chua lúc`);
  await A.page.screenshot({ path: `test-results/steal-log-${testInfo.project.name}.png` });

  // bấm "Sang trộm lại 😤": A đi thẳng qua làng vào vườn B
  await row.locator('.revenge').click();
  await expect.poll(() => st(A.page, () => globalThis.__farm.state?.visit?.owner ?? null), { timeout: 20_000 }).toBe(B.name);
  await expect(A.page.locator('#visit-bar')).toBeVisible();
  await expect(A.page.locator('#visit-owner')).toHaveText(B.name);
  expect(A.errors.concat(B.errors)).toEqual([]);
  await A.context.close(); await B.context.close();
});

test('vườn chủ dưới cấp 5: khách thấy nút Trộm mờ kèm lý do, ô không mất gì', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch;
  const C = await player(browser, opts(testInfo, baseURL), s => { ownerGarden(s); s.exp = 0; });
  const B = await player(browser, opts(testInfo, baseURL), guestAt(GATE_AT.x, GATE_AT.y));
  await B.open();
  await enterGarden(B.page, C.name);
  const main = B.page.locator('#main-action');
  const at0 = await plotCenter0(B.page);
  await reach(B.page, touch, at0.x - 16, at0.y, 'Cà chua');
  await expect(main).toContainText('Trộm');
  await expect(main).toHaveClass(/disabled/);
  await main.click();
  await expect(B.page.locator('#toasts')).toContainText('Vườn này còn quá nhỏ để trộm');
  expect(await st(B.page, () => globalThis.__farm.state.plots[0].crop.stolen ?? 0)).toBe(0);
  expect(await st(B.page, () => globalThis.__farm.state.basket.cachua ?? 0)).toBe(0);
  await B.page.screenshot({ path: `test-results/steal-small-${testInfo.project.name}.png` });
  expect(B.errors).toEqual([]);
  await C.context.close(); await B.context.close();
});
