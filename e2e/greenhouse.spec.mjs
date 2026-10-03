// Issue 60: nhà kính phủ một khối ruộng, "công trình có mái". Đứng ngoài thấy mái phủ kín và bảng trạng thái ở cửa đếm ô khô,
// sâu, chín, héo; bước vào cửa thì mái mờ dần rồi ẩn, ra ngoài thì hiện lại. Khách online thấy nhà kính và bảng y như chủ.
// Mái đọc bằng màu điểm ảnh: độ sáng trung bình của canvas trên khối ruộng (mái phủ khác hẳn đất và cây bên dưới). Dựng tình huống bằng bản lưu ghi sẵn.
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, seedSave, closeAway } from './helpers.mjs';
import { placeEntity, glassDoor } from '../public/state.js';
import { weatherOn } from '../public/weather.js';
import { DAY_MS, levelInfo } from '../public/data.js';

const SEED = 7;
const expFor = lv => { let e = 0; while (levelInfo(e).level < lv) e += levelInfo(e).need - levelInfo(e).cur; return e; };
const crop = (id, progress, extra) => ({ id, progress, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false }, ...extra });
const ready = async page => { await page.waitForFunction(() => globalThis.__farm?.state); await page.keyboard.press('Shift'); await closeAway(page); };
// độ sáng trung bình (0..255) của canvas trên khối ruộng f; đọc từ chính canvas, không cần hook của game
const lum = (page, f) => page.evaluate(({ c, r, n }) => {
  const { scale, view } = globalThis.__farm, cv = document.getElementById('game-canvas');
  const x = Math.max(0, Math.round(c * 16 * scale - view.camX)), y = Math.max(0, Math.round(r * 16 * scale - view.camY));
  const w = Math.min(cv.width - x, Math.round(n * 16 * scale)), h = Math.min(cv.height - y, Math.round(n * 16 * scale));
  const d = cv.getContext('2d').getImageData(x, y, w, h).data;
  let t = 0; for (let i = 0; i < d.length; i += 4) t += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
  return t / (d.length / 4);
}, { c: f.c, r: f.r, n: 3 });
const noHScroll = page => expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
// một ngày khô ráo (không mưa, không bão) để đất khô vẫn khô suốt test
const DRY_DAY = (() => { for (let d = 30; ; d++) if (['sun', 'cloud'].includes(weatherOn(SEED, d))) return d; })();

// Vườn cấp 14 có nhà kính trên khối ruộng đầu: 2 ô khô, 1 ô sâu, 3 ô chín (bắp cải lớn lâu, chín lâu mới héo), 1 ô héo
function glassFarm(s) {
  s.exp = expFor(14); s.coins = 50_000; s.orders = []; s.nextOrderAt = 1e15; s.wseed = SEED;
  for (const a of s.animals) a.nextProduct = 1e15;
  const f = s.farm.ents.find(e => e.kind === 'field');
  expect(placeEntity(s, { kind: 'greenhouse' }, f.c, f.r).ok).toBe(true);
  const set = (k, water, c) => Object.assign(s.plots[f.plots[k]], { unlocked: true, soil: 'tilled', water, weeds: false, crop: c });
  set(0, 0, crop('bapcai', 0.3)); set(1, 0, crop('bapcai', 0.4));
  set(2, 100, crop('bapcai', 0.5, { bugs: true, bugSince: 1e15 }));
  set(3, 100, crop('bapcai', 1)); set(4, 100, crop('bapcai', 1.05)); set(5, 100, crop('bapcai', 1.1));
  set(6, 100, crop('bapcai', 1.5, { rotten: true }));
  return f;
}
const BOARD = { dry: 2, bugs: 1, ripe: 3, rotten: 1 };

test('đứng ngoài thấy mái phủ và bảng trạng thái đúng số; bước vào cửa mái mờ rồi ẩn; ra ngoài mái hiện lại', async ({ page, context }, testInfo) => {
  test.setTimeout(60_000);
  let f;
  const save = makeSave(s => {
    s.time = (DRY_DAY - 1 + 0.25) * DAY_MS; s.day = DRY_DAY; s.wday = DRY_DAY; s.weather = weatherOn(SEED, DRY_DAY);
    f = glassFarm(s);
    const d = glassDoor(f);
    Object.assign(s.player, { x: d.x, y: d.y + 22, dir: 3 });   // đứng ngoài, trước cửa (dưới mép khối)
  });
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  // đứng ngoài: mái phủ kín khối ruộng
  await page.waitForTimeout(600);
  const out = await lum(page, f);
  await page.screenshot({ path: `test-results/greenhouse-outside-${testInfo.project.name}.png` });
  await noHScroll(page);

  // bước lên qua cửa: vào trong khối thì mái mờ dần (có lúc nửa trong nửa đục) rồi ẩn hẳn
  const seen = [];
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => { seen.push(await lum(page, f)); return Math.abs(seen.at(-1) - out) > 6; }, { intervals: [30], timeout: 6000 }).toBe(true);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(900);
  const inn = await lum(page, f);
  expect(Math.abs(inn - out), `mái ẩn: ngoài ${out}, trong ${inn}`).toBeGreaterThan(6);
  const t = v => (v - inn) / (out - inn);   // 1 = mái đậm như lúc ở ngoài, 0 = đã ẩn
  expect(seen.some(v => t(v) > 0.15 && t(v) < 0.85), `mờ dần: ${seen.map(v => t(v).toFixed(2)).join(',')}`).toBe(true);
  const me = await page.evaluate(() => { const p = globalThis.__farm.state.player; return { x: p.x, y: p.y }; });
  expect(me.y).toBeLessThan((f.r + 3) * 16);
  await page.screenshot({ path: `test-results/greenhouse-inside-${testInfo.project.name}.png` });

  // ra ngoài: mái hiện lại
  await page.keyboard.down('ArrowDown');
  await expect.poll(async () => page.evaluate(() => globalThis.__farm.state.player.y), { timeout: 6000 }).toBeGreaterThan((f.r + 3) * 16);
  await page.keyboard.up('ArrowDown');
  await expect.poll(async () => Math.abs(t(await lum(page, f)) - 1), { timeout: 4000 }).toBeLessThan(0.15);
  // bảng ở cửa đếm theo các ô bên trong (số do state tính)
  const live = await page.evaluate(async id => { const { glassStatus } = await import('/state.js'); const { urgent, ...b } = glassStatus(globalThis.__farm.state, id); void urgent; return b; }, f.id);
  expect(live).toEqual(BOARD);
});

// ---- Hai trình duyệt qua server: khách vào vườn thấy nhà kính và bảng trạng thái giống chủ ----
const uniq = () => 'Gh' + Math.random().toString(36).slice(2, 7);
const GATE_AT = { x: 488, y: 364 };   // chỗ đứng trước cổng bạn bè trong làng
async function player(browser, { baseURL, viewport, isMobile, hasTouch }, mutate) {
  const context = await browser.newContext({ baseURL, viewport, isMobile, hasTouch });
  const name = uniq();
  const invite = (await runAdmin('invite', '--db', E2E_DB)).out;
  expect((await context.request.post('/api/register', { data: { name, pin: '123456', invite } })).ok()).toBe(true);
  const { play } = await (await context.request.post('/api/play', { data: {} })).json();
  const save = makeSave(mutate, { name });
  expect((await context.request.post('/api/farm', { data: { play, save } })).ok()).toBe(true);
  await context.addInitScript(n => {
    try { localStorage.setItem('nongtrai-online', n); localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {}
  }, name);
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state?.mode === 'online');
  await closeAway(page);
  return { name, context, page, save };
}

test('khách online vào vườn thấy nhà kính và bảng trạng thái giống chủ', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  const opts = { baseURL, ...testInfo.project.use };
  let f;
  const A = await player(browser, opts, s => {
    s.scene = 'farm';
    f = glassFarm(s);
    for (const k of [0, 1]) s.plots[f.plots[k]].crop = null;   // khỏi lệ thuộc trời mưa: chỉ còn ô sâu, chín, héo
    const d = glassDoor(f);
    Object.assign(s.player, { x: d.x, y: d.y + 22, dir: 3 });
  });
  const B = await player(browser, opts, s => { s.scene = 'village'; Object.assign(s.player, { ...GATE_AT, dir: 3 }); });
  await A.page.waitForTimeout(800);
  const host = await lum(A.page, f);
  // B vào vườn A qua cổng bạn bè
  await expect(B.page.locator('#target-name')).toHaveText('Cổng bạn bè');
  await B.page.locator('#main-action').click();
  await expect(B.page.locator('.sheet-head h2')).toHaveText(/Bạn bè/);
  await B.page.locator(`.gate-row[data-name="${A.name}"] .gate-go`).click();
  await expect.poll(() => B.page.evaluate(() => globalThis.__farm.state?.scene)).toBe('visit');
  // B thấy đúng nhà kính đó: mái phủ (B đứng ngoài), cùng số trên bảng, cùng bong bóng việc gấp
  // B đi tới trước cửa nhà kính: camera thấy nhà kính, chụp lại để so với chủ
  await B.page.evaluate(([x, y]) => { const s = globalThis.__farm.state; Object.assign(s.player, { x, y }); }, [glassDoor(f).x, glassDoor(f).y + 22]);
  await B.page.waitForTimeout(800);
  expect(Math.abs((await lum(B.page, f)) - host), 'khách thấy mái như chủ').toBeLessThan(12);
  await B.page.screenshot({ path: `test-results/greenhouse-guest-${testInfo.project.name}.png` });
  await A.page.screenshot({ path: `test-results/greenhouse-owner-${testInfo.project.name}.png` });
  await A.context.close(); await B.context.close();
});
