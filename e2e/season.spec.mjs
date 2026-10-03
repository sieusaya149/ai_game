// Issue 54: mùa có tác dụng lên cây. Nhãn đúng mùa ở chợ, cây trái mùa lớn chậm, đổi mùa giữa vụ, Bà Tư giải thích mùa.
import { test, expect } from '@playwright/test';
import { makeSave, seedSave, installWarp, timeWarp, closeAway } from './helpers.mjs';
import { sceneMap } from '../public/state.js';
import { CROPS, DAY_MS, SEASON, levelInfo } from '../public/data.js';

const ready = async page => { await page.waitForFunction(() => globalThis.__farm?.state); await page.keyboard.press('Shift'); };
const expFor = lv => { let e = 0; while (levelInfo(e).level < lv) e += levelInfo(e).need - levelInfo(e).cur; return e; };
const noHScroll = page => expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
const crop = (id, progress) => ({ id, progress, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } });

test('mùa Xuân: chợ Bà Tư gắn nhãn đúng mùa đúng 4 cây Xuân, cây mùa khác không có', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  const save = makeSave(s => {
    s.scene = 'village'; s.coins = 5000; s.exp = expFor(10); s.time = 0; s.day = 1; s.weather = 'sun';
    Object.assign(s.player, sceneMap(s).building('market').at, { dir: 3 });
  });
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  const stall = await page.evaluate(async () => {
    const { sceneMap } = await import('/state.js');
    const f = globalThis.__farm, b = sceneMap(f.state).building('market'), rc = document.getElementById('game-canvas').getBoundingClientRect();
    return { x: ((b.x + 24) * f.scale - f.view.camX) / f.dpr + rc.left, y: ((b.y + 20) * f.scale - f.view.camY) / f.dpr + rc.top };
  });
  await page.waitForTimeout(400);
  if (touch) await page.touchscreen.tap(stall.x, stall.y); else await page.mouse.click(stall.x, stall.y);
  await expect(page.locator('.sheet-head h2')).toHaveText(/Chợ Bà Tư/, { timeout: 10_000 });
  const row = id => page.locator('#panel-root .row', { hasText: `Hạt ${CROPS[id].name.toLowerCase()}` });
  const tagged = Object.keys(CROPS).filter(id => CROPS[id].season === 'xuan');
  expect(tagged.length).toBe(4);
  for (const id of tagged) await expect(row(id).locator('.season-tag'), id).toHaveText(/Đúng mùa/);
  await expect(page.locator('#panel-root .season-tag')).toHaveCount(4);
  await expect(row('bap').locator('.season-tag')).toHaveCount(0);
  await noHScroll(page);
  await page.screenshot({ path: `test-results/season-market-${testInfo.project.name}.png` });
});

test('trồng cây trái mùa (cấp 5): ô hiện dấu lớn chậm và lớn chậm ×0.6; cây đúng mùa thì không', async ({ page, context }, testInfo) => {
  const save = makeSave(s => {
    s.exp = expFor(5); s.time = 2 * DAY_MS; s.day = 3; s.weather = 'sun';   // mùa Xuân
    for (const [i, id] of [[0, 'bap'], [1, 'cai']]) Object.assign(s.plots[i], { soil: 'tilled', water: 100, crop: crop(id, 0.1) });
  });
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  const info = await page.evaluate(async () => {
    const S = await import('/state.js'), st = globalThis.__farm.state;
    return { season: S.seasonOf(st).key, off: S.seasonGrowMul(st, 'bap'), on: S.seasonGrowMul(st, 'cai') };
  });
  expect(info).toEqual({ season: 'xuan', off: SEASON.slow, on: 1 });
  await page.screenshot({ path: `test-results/season-slow-${testInfo.project.name}.png` });
  // cây trái mùa bị đánh dấu khi lớn, cây đúng mùa không
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.plots[0].crop.offSeason)).toBe(true);
  expect(await page.evaluate(() => globalThis.__farm.state.plots[1].crop.offSeason)).toBeFalsy();
});

test('tua qua đổi mùa giữa vụ: cây vẫn sống, đổi tốc độ; Bà Tư giải thích mùa ở đầu mùa thứ 2', async ({ page, context }, testInfo) => {
  test.setTimeout(60_000);
  const sec = 1000;
  const save = makeSave(s => {
    s.exp = expFor(6); s.time = 7 * DAY_MS - 100 * sec; s.day = 7; s.weather = 'cloud';   // 100 giây nữa hết Xuân
    Object.assign(s.plots[0], { soil: 'tilled', water: 100, crop: crop('dau', 0) });   // dâu tây hợp mùa Xuân, sang Hạ thì chậm
  });
  await installWarp(context);
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#seasonquest')).toBeHidden();   // mùa đầu: Bà Tư chưa nói gì
  await timeWarp(page, 200 * sec);
  const c = await page.evaluate(() => { const st = globalThis.__farm.state; return { crop: st.plots[0].crop, day: st.day, weeds: st.plots[0].weeds }; });
  expect(c.crop.dead).toBe(false);
  expect(c.day).toBe(8);
  // 100 giây hợp mùa + 100 giây trái mùa (×0.6): 160/720 ≈ 0.22 (dư vài giây do chờ tải); tất cả hợp mùa sẽ là 0.28, tất cả trái mùa 0.17
  // (sâu hay cỏ mọc ngẫu nhiên trong lúc chạy bù làm cây lớn chậm hơn nữa: lúc đó chỉ kiểm cây sống)
  if (!c.crop.bugs && !c.crop.sick && !c.weeds) {
    expect(c.crop.progress).toBeGreaterThan(0.2);
    expect(c.crop.progress).toBeLessThan(0.25);
  }
  // đầu mùa thứ 2 trở đi (đã qua ngày 8) Bà Tư giải thích mùa, nhận thưởng một lần
  const box = page.locator('#seasonquest');
  await expect(box).toBeVisible();
  await expect(box).toContainText('Bà Tư');
  await expect(box).toContainText(/trái mùa/);
  await noHScroll(page);
  await page.screenshot({ path: `test-results/season-quest-${testInfo.project.name}.png` });
  const coins = await page.evaluate(() => globalThis.__farm.state.coins);
  await box.getByRole('button', { name: /Nhận thưởng/ }).click();
  await expect(box).toBeHidden();
  expect(await page.evaluate(() => globalThis.__farm.state.coins)).toBe(coins + SEASON.questCoins);
});

test('Bà Tư giải thích mùa bỏ qua được, không thưởng', async ({ page, context }) => {
  const save = makeSave(s => { s.exp = expFor(5); s.time = 8 * DAY_MS; s.day = 9; s.weather = 'sun'; });
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  const box = page.locator('#seasonquest');
  await expect(box).toBeVisible();
  const coins = await page.evaluate(() => globalThis.__farm.state.coins);
  await box.locator('.tut-x').click();
  await expect(box).toBeHidden();
  expect(await page.evaluate(() => globalThis.__farm.state.coins)).toBe(coins);
  expect(await page.evaluate(() => globalThis.__farm.state.seasonQuest)).toBe('skipped');
});
