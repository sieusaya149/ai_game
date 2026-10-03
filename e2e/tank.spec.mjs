import { test, expect } from '@playwright/test';
import { makeSave, seedSave, tilePoint, startDrag } from './helpers.mjs';
import { WATER_BUILD } from '../public/data.js';

// Bồn và mạng nước (issue 57): vườn có máy bơm (giếng cấp 4, ô 33,17), sẵn 120 lần nước chờ bồn. Xây bồn ở ô 29,18 (2x2) bằng
// chế độ xây dựng → thấy vùng phủ xanh và mực nước → trạm bơm phụ đặt ở ô 40,21 (cách bồn 10 ô) bị từ chối "ngoài tầm nước",
// ở ô 37,21 (cách 7 ô) thì đặt được.
const save = () => makeSave(s => {
  s.coins = 20_000;
  s.farm.ents.find(e => e.kind === 'well').lv = 4;
  s.water.level = 120;
  Object.assign(s.player, { x: 34 * 16 + 8, y: 21 * 16 + 8, dir: 0 });
});
const ents = page => page.evaluate(() => globalThis.__farm.state.farm.ents.filter(e => ['tank', 'tank2', 'booster'].includes(e.kind)).map(e => [e.kind, e.c, e.r]));
const coins = page => page.evaluate(() => globalThis.__farm.state.coins);
const press = (page, loc) => loc.click();   // nút DOM: bấm chuột cả trên điện thoại (chạm CDP ở canvas làm tap() hụt)
// Màu điểm ảnh canvas ở giữa ô (c, r) (lệch lên trái một chút, tránh hạt chấm của lớp vùng phủ)
const px = (page, c, r) => page.evaluate(([c, r]) => {
  const f = globalThis.__farm, cv = document.getElementById('game-canvas');
  const x = Math.round((c * 16 + 5) * f.scale - f.view.camX), y = Math.round((r * 16 + 5) * f.scale - f.view.camY);
  return [...cv.getContext('2d').getImageData(x, y, 1, 1).data];
}, [c, r]);
// Kéo chỗ đất trống (ô from) để ô `tile` về giữa phần trên màn hình (khay xây dựng che phần dưới)
async function centerOn(page, touch, from, tile) {
  const vp = page.viewportSize(), a = await tilePoint(page, ...from), t = await tilePoint(page, ...tile);
  const d = await startDrag(page, touch, a);
  await d.move({ x: a.x + vp.width / 2 - t.x, y: a.y + vp.height * 0.32 - t.y });
  await d.end();
  // camera lướt dần tới chỗ mới: chờ đứng yên rồi mới tính toạ độ ô
  let last = null;
  await expect.poll(async () => {
    const v = await page.evaluate(() => [globalThis.__farm.view.camX, globalThis.__farm.view.camY]), same = !!last && v[0] === last[0] && v[1] === last[1];
    last = v;
    return same;
  }, { intervals: [150] }).toBe(true);
}

test('xây bồn cạnh máy bơm, thấy vùng phủ xanh và mực nước; trạm bơm phụ ngoài tầm bị từ chối, trong tầm đặt được', async ({ page, context }, testInfo) => {
  test.setTimeout(60_000);
  const touch = !!testInfo.project.use.hasTouch, name = testInfo.project.name;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedSave(context, save());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
  await page.locator('#bb-build').click();
  await expect(page.locator('#buildbar')).toBeVisible();
  await page.waitForTimeout(700);
  await expect(page.locator('#build-water')).toBeHidden();   // chưa có bồn

  // khay Nước: bồn chứa mở (có máy bơm), bồn phụ và trạm bơm phụ chờ có bồn
  await press(page, page.locator('.bt-tab', { hasText: 'Nước' }));
  const tankCard = page.locator('.bt-card', { hasText: /^Bồn chứa/ });
  await expect(tankCard).toBeEnabled();
  await expect(tankCard).toContainText(WATER_BUILD.tank.price.toLocaleString('vi-VN'));
  await expect(page.locator('.bt-card', { hasText: 'Trạm bơm phụ' })).toBeDisabled();
  await expect(page.locator('.bt-card', { hasText: 'Bồn phụ' })).toContainText('Cần bồn chứa');

  // đưa chỗ đặt bồn vào giữa màn hình, ghi màu một ô trống trong tầm (chưa có vùng phủ)
  await centerOn(page, touch, [33, 22], [33, 20]);
  const before = await px(page, 33, 22);

  // kéo bồn (2x2, ngón tay ở giữa khối) tới ô 29,18
  await press(page, tankCard);
  const c0 = await coins(page);
  let d = await startDrag(page, touch, await tilePoint(page, 31, 21));
  await d.move(await tilePoint(page, 30, 19));
  await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '1');
  await d.end();
  await expect.poll(() => ents(page)).toEqual([['tank', 29, 18]]);
  expect(await coins(page)).toBe(c0 - WATER_BUILD.tank.price);
  // mực nước hiện ở thanh xây dựng; vùng phủ xanh phủ lên ô trống trong tầm
  await expect(page.locator('#build-water')).toBeVisible();
  await expect(page.locator('#build-water')).toContainText('Bồn 120/200');
  await page.waitForTimeout(300);
  const after = await px(page, 33, 22);
  expect(after[1] - after[0], `ô 33,22 xanh hơn: ${before} → ${after}`).toBeGreaterThan(before[1] - before[0] + 8);
  await page.screenshot({ path: `test-results/tank-cover-${name}.png` });

  // trạm bơm phụ: đưa vùng giữa ô 37 và 40 vào màn hình (khung nhỏ của điện thoại)
  await centerOn(page, touch, [33, 22], [38, 21]);
  await press(page, page.locator('.bt-card', { hasText: 'Trạm bơm phụ' }));
  d = await startDrag(page, touch, await tilePoint(page, 39, 23));
  await d.move(await tilePoint(page, 40, 21));
  await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '0');
  await expect(page.locator('#build-msg')).toContainText('Ngoài tầm nước');
  expect(await page.evaluate(() => globalThis.__farm.world.build.ghost)).toMatchObject({ c: 40, r: 21, ok: false, reason: 'no_water' });
  await page.screenshot({ path: `test-results/tank-out-${name}.png` });
  await d.end();
  await page.waitForTimeout(200);
  expect(await ents(page)).toEqual([['tank', 29, 18]]);   // thả ra ngoài tầm: không đặt
  await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '0');
  // trong tầm thì đặt được
  d = await startDrag(page, touch, await tilePoint(page, 38, 23));
  await d.move(await tilePoint(page, 37, 21));
  await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '1');
  await d.end();
  await expect.poll(() => ents(page)).toEqual([['tank', 29, 18], ['booster', 37, 21]]);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `test-results/tank-booster-${name}.png` });

  // Xong → tải lại: bồn, trạm còn nguyên, mực nước giữ
  await page.locator('#build-done').click();
  await expect(page.locator('#buildbar')).toBeHidden();
  await page.reload();
  await page.waitForFunction(() => globalThis.__farm?.state);
  expect(await ents(page)).toEqual([['tank', 29, 18], ['booster', 37, 21]]);
  expect(await page.evaluate(() => globalThis.__farm.state.water.level)).toBeGreaterThanOrEqual(120);
  expect(errors).toEqual([]);
});
