// Issue 55: thời tiết là hàm thuần của lịch game + hạt giống. Radio trong nhà và bảng tin làng báo bão ngày mai;
// tua tới ngày bão thì có hiệu ứng, HUD đổi icon, bù nhìn bị quật đổ dựng lại bằng xu; phủ rơm trong hạn hán thì ô khô chậm hơn.
import { test, expect } from '@playwright/test';
import { makeSave, seedSave, installWarp, timeWarp, closeAway } from './helpers.mjs';
import { sceneMap, mapOf, canPlace, placeEntity } from '../public/state.js';
import { weatherOn } from '../public/weather.js';
import { DAY_MS, WEATHER, levelInfo } from '../public/data.js';

const SEED = 7;   // hạt giống vườn: ngày 8 có bão, ngày 12 hạn hán
const STORM = 8, DROUGHT = 12;
const ready = async page => { await page.waitForFunction(() => globalThis.__farm?.state); await page.keyboard.press('Shift'); await closeAway(page); };
const expFor = lv => { let e = 0; while (levelInfo(e).level < lv) e += levelInfo(e).need - levelInfo(e).cur; return e; };
const noHScroll = page => expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
const crop = (id, progress) => ({ id, progress, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } });
// vườn chơi đơn cấp 6 đứng ở ngày `day`, phần `frac` của ngày; trời hôm nay đúng theo hạt giống
const atDay = (day, frac, mutate) => makeSave(s => {
  s.exp = expFor(6); s.coins = 1000; s.orders = []; s.nextOrderAt = 1e15; s.wseed = SEED;
  s.time = (day - 1 + frac) * DAY_MS; s.day = day; s.wday = day; s.weather = weatherOn(SEED, day);
  for (const a of s.animals) a.nextProduct = 1e15;
  mutate?.(s);
});
// Điểm bản đồ (x, y) ra toạ độ màn hình; chạm (chờ camera dừng)
const screenOf = (page, x, y) => page.evaluate(([x, y]) => {
  const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
  return { x: (x * f.scale - f.view.camX) / f.dpr + rc.left, y: (y * f.scale - f.view.camY) / f.dpr + rc.top };
}, [x, y]);
async function tap(page, touch, x, y) {
  await page.waitForTimeout(500);
  const p = await screenOf(page, x, y);
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
// chạm vào đồ vật của bản đồ đang đứng tới khi bảng `panel` mở (chạm có thể hụt lúc camera còn trượt)
async function openThing(page, touch, id, title) {
  for (let i = 0; i < 4; i++) {
    const b = await page.evaluate(async id => { const { sceneMap } = await import('/state.js'); const b = sceneMap(globalThis.__farm.state).building(id); return { x: b.x + 8, y: b.y + 10 }; }, id);
    await tap(page, touch, b.x, b.y);
    try { await expect(page.locator('.sheet-head h2')).toHaveText(title, { timeout: 5000 }); return; } catch { /* chạm lại */ }
  }
  throw new Error('không mở được ' + id);
}

test('radio trong nhà báo ngày mai có bão', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  expect(weatherOn(SEED, STORM)).toBe('storm');
  await seedSave(context, atDay(STORM - 1, 0.25, s => { s.scene = 'house'; Object.assign(s.player, sceneMap(s).building('radio').at, { dir: 0 }); }));
  await page.goto('/');
  await ready(page);
  await openThing(page, touch, 'radio', /Radio/);
  await expect(page.locator('#wx-tomorrow')).toHaveAttribute('data-kind', 'storm');
  await expect(page.locator('#wx-tomorrow')).toContainText('Bão');
  await noHScroll(page);
  await page.screenshot({ path: `test-results/weather-radio-${testInfo.project.name}.png` });
});

test('bảng tin làng báo ngày mai có bão', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await seedSave(context, atDay(STORM - 1, 0.25, s => { s.scene = 'village'; Object.assign(s.player, sceneMap(s).building('newsboard').at, { dir: 3 }); }));
  await page.goto('/');
  await ready(page);
  await openThing(page, touch, 'newsboard', /Bảng tin làng/);
  await expect(page.locator('#wx-tomorrow')).toHaveAttribute('data-kind', 'storm');
  await expect(page.locator('#wx-tomorrow')).toContainText('Bão');
  await expect(page.locator('.wx-paper')).toBeVisible();
  await noHScroll(page);
  await page.screenshot({ path: `test-results/weather-board-${testInfo.project.name}.png` });
});

test('tua tới ngày bão: HUD đổi icon, có hiệu ứng bão, bù nhìn bị quật đổ dựng lại bằng xu; game vẫn mượt', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch;
  const save = atDay(STORM - 1, 0.6, s => {
    s.inv.deco_scarecrow = 1;
    const sp = mapOf(s).spawn, c0 = Math.floor(sp.x / 16), r0 = Math.floor(sp.y / 16);
    let ok = false;
    for (let d = 2; d < 8 && !ok; d++) for (const [dc, dr] of [[d, 0], [-d, 0], [0, d], [0, -d]]) if (!ok && canPlace(s, { kind: 'deco', item: 'deco_scarecrow' }, c0 + dc, r0 + dr).ok) ok = placeEntity(s, { kind: 'deco', item: 'deco_scarecrow' }, c0 + dc, r0 + dr).ok;
    const e = s.farm.ents.find(x => x.item === 'deco_scarecrow');
    Object.assign(s.player, { x: e.c * 16 + 8, y: e.r * 16 + 8 + 20, dir: 0 });
  });
  await installWarp(context);
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#hud-weather')).not.toHaveAttribute('data-kind', 'storm');
  // vắng tới sáng ngày bão: chạy bù qua 6h sáng
  await timeWarp(page, 0.4 * DAY_MS + 60_000);
  await page.keyboard.press('Shift');
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.weather)).toBe('storm');
  await expect(page.locator('#hud-weather')).toHaveAttribute('data-kind', 'storm');
  await expect(page.locator('#hud-weather')).toHaveAttribute('title', WEATHER.kinds.storm.name);
  expect(await page.evaluate(() => globalThis.__farm.state.farm.ents.find(e => e.item === 'deco_scarecrow').down)).toBe(true);
  // hiệu ứng bão vẽ mỗi khung hình mà vẫn mượt
  await page.waitForTimeout(2500);
  const p = await page.evaluate(() => globalThis.__farm.perf);
  console.log(`[${testInfo.project.name}] fps khi bão: ${p.fps}`);
  expect(p.fps).toBeGreaterThanOrEqual(25);
  await page.screenshot({ path: `test-results/weather-storm-${testInfo.project.name}.png` });
  // bù nhìn đổ: chạm vào là dựng lại, tốn xu
  const coins = await page.evaluate(() => globalThis.__farm.state.coins);
  const e = await page.evaluate(() => { const e = globalThis.__farm.state.farm.ents.find(x => x.item === 'deco_scarecrow'); return { x: e.c * 16 + 8, y: e.r * 16 + 10 }; });
  for (let i = 0; i < 4; i++) {
    await tap(page, touch, e.x, e.y);
    try { await expect.poll(() => page.evaluate(() => globalThis.__farm.state.farm.ents.find(x => x.item === 'deco_scarecrow').down), { timeout: 4000 }).toBe(false); break; } catch { /* chạm lại */ }
  }
  expect(await page.evaluate(() => globalThis.__farm.state.farm.ents.find(x => x.item === 'deco_scarecrow').down)).toBe(false);
  expect(await page.evaluate(() => globalThis.__farm.state.coins)).toBe(coins - WEATHER.scarecrowFix);
});

test('phủ rơm lên ô trong hạn hán: ô phủ khô chậm hơn ô không phủ', async ({ page, context }, testInfo) => {
  test.setTimeout(60_000);
  expect(weatherOn(SEED, DROUGHT)).toBe('drought');
  const save = atDay(DROUGHT, 0.1, s => {
    s.inv.straw = 3; s.inv.fertilizer = 0; s.inv.growth = 0;
    for (const i of [0, 8]) Object.assign(s.plots[i], { soil: 'tilled', water: 80, weeds: false, crop: crop('bap', 0.2) });   // dưới 95 để "Tưới" là việc chính, "Phủ rơm" hiện thành nút phụ
    const p = mapOf(s).plotCenter(0);
    Object.assign(s.player, { x: p.x - 15, y: p.y + 2, dir: 2 });   // đứng sát mép trái ô 0 (ngoài khối ruộng)
  });
  await installWarp(context);
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#hud-weather')).toHaveAttribute('data-kind', 'drought');
  const chip = page.locator('#chips .chip', { hasText: 'Phủ rơm' });
  await expect(chip).toBeVisible({ timeout: 10_000 });
  await chip.click();
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.plots[0].mulch)).toBe(true);
  expect(await page.evaluate(() => globalThis.__farm.state.inv.straw)).toBe(2);
  await page.screenshot({ path: `test-results/weather-mulch-${testInfo.project.name}.png` });
  // tưới lại đầy cả hai ô rồi vắng 15 phút (đất tụt 1%/phút, hạn hán ×2, phủ rơm ×0,5; vẫn trong ngày hạn 20 phút)
  await page.evaluate(() => { for (const i of [0, 8]) globalThis.__farm.state.plots[i].water = 100; });
  await timeWarp(page, 15 * 60_000);
  const w = await page.evaluate(() => ({ mulched: globalThis.__farm.state.plots[0].water, bare: globalThis.__farm.state.plots[8].water, weather: globalThis.__farm.state.weather }));
  expect(w.weather).toBe('drought');
  expect(w.mulched).toBeGreaterThan(w.bare + 10);
});
