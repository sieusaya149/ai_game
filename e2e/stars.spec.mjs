import { test, expect } from '@playwright/test';
import { makeSave, seedSave, installWarp, timeWarp, tapPlot, closeAway } from './helpers.mjs';
import { DAY_MS, sellPrice, starKey } from '../public/data.js';

// Chất lượng nông sản ★1–3 (issue 52). Bắp cải (lớn 20 phút) để cây chín không kịp héo, cây đang lớn không kịp chín.
const crop = (fert, hand, progress = 1) => ({ id: 'bapcai', progress, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand } });
// summer: đặt lịch về ngày đầu mùa để bắp cải đang lớn đúng mùa (đầu mùa Đông, ngày 22), còn ra được ★3 (issue 54). Cây đã chín thì không cần:
// thu hoạch đúng mùa có 10% lần được thêm quả, làm lệch số đếm.
const save = (plots, summer = false, water = 100) => makeSave(s => {
  s.weather = 'cloud';
  s.exp = 1e6;   // cấp cao nhất: thu hoạch không bật màn lên cấp che ruộng
  if (summer) { s.time += 21 * DAY_MS; s.day = 22; }
  for (const [i, c] of Object.entries(plots)) Object.assign(s.plots[i], { soil: 'tilled', water, crop: c });
});
const state = page => page.evaluate(() => { const s = globalThis.__farm.state; return { coins: s.coins, basket: { ...s.basket }, bin: { ...s.shipbin.items } }; });
const open = (page, id) => page.evaluate(async id => (await import('/ui.js')).openPanel(id), id);
async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
}

test('thu hoạch cây chín ở ba mức sao → giỏ tách ba dòng → bỏ thùng giao hàng, lái buôn trả đúng giá theo sao', async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await installWarp(context);
  // ô 0: chưa bón phân (★1) · ô 1: bón phân, chưa chăm tay lần nào (★2) · ô 2: bón phân, có chăm tay (★3)
  await seedSave(context, save({ 0: crop(false, true), 1: crop(true, false), 2: crop(true, true) }));
  await page.goto('/');
  await ready(page);
  const coins0 = (await state(page)).coins;

  for (const [i, k] of [[0, 'bapcai'], [1, 'bapcai@2'], [2, 'bapcai@3']]) {
    await tapPlot(page, i, touch, async () => !!(await state(page)).basket[k]);
  }
  expect((await state(page)).basket).toEqual({ bapcai: 4, 'bapcai@2': 6, 'bapcai@3': 6 });

  // giỏ: ba dòng riêng, mỗi dòng có tên theo sao
  await open(page, 'bag');
  const names = page.locator('#panel-root .cell-name');
  await expect(names.filter({ hasText: /^Bắp cải$/ })).toHaveCount(1);
  await expect(names.filter({ hasText: 'Bắp cải ★2' })).toHaveCount(1);
  await expect(names.filter({ hasText: 'Bắp cải ★3' })).toHaveCount(1);
  await page.screenshot({ path: `test-results/stars-bag-${testInfo.project.name}.png` });
  await page.locator('#panel-root .close').click();

  // thùng giao hàng: bỏ hết cả ba dòng, xu dự kiến theo giá có sao (80%)
  await open(page, 'shipbin');
  await expect(page.locator('#ship-total')).toContainText('+0 xu');
  for (let n = 3; n > 0; n--) {
    await page.getByRole('button', { name: 'Bỏ hết' }).first().click();
    await expect.poll(async () => Object.keys((await state(page)).basket).length).toBe(n - 1);
  }
  expect((await state(page)).bin).toEqual({ bapcai: 4, 'bapcai@2': 6, 'bapcai@3': 6 });
  const value = Math.floor((4 * sellPrice('bapcai') + 6 * sellPrice(starKey('bapcai', 2)) + 6 * sellPrice(starKey('bapcai', 3))) * 0.8);
  await expect(page.locator('#ship-total')).toContainText(`+${value.toLocaleString('vi-VN')} xu`);
  await page.screenshot({ path: `test-results/stars-ship-${testInfo.project.name}.png` });
  await page.locator('#panel-root .close').click();

  // qua 6h sáng: lái buôn trả đúng số xu
  await timeWarp(page, DAY_MS + 60_000);
  const after = await state(page);
  expect(after.bin).toEqual({});
  expect(after.coins).toBe(coins0 + value);
  expect(errors).toEqual([]);
});

test('ô đang lớn hiện số sao vụ này đang giữ; để đất khô hẳn thì sao tụt', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await installWarp(context);
  // cả khối ruộng cùng một vụ dưa hấu chăm kỹ (bón phân, có chăm tay): ô nào được chọn cũng hiện như nhau
  await seedSave(context, save(Object.fromEntries([...Array(9).keys()].map(i => [i, crop(true, true, 0.3)])), true, 3));   // đất còn 3% nước (đất tụt 1%/phút)
  await page.goto('/');
  await ready(page);
  await closeAway(page);   // gà đẻ trứng lúc vắng (lịch dời về mùa Đông): màn "vắng nhà" che ruộng
  const name = page.locator('#target-name');
  await tapPlot(page, 0, touch, async () => /Bắp cải ★★★/.test(await name.textContent()));
  await page.screenshot({ path: `test-results/stars-plot3-${testInfo.project.name}.png` });

  // vắng 5 phút: đất (3% nước, tụt 1%/phút) khô hẳn lúc cây (4 giờ) còn đang lớn → chỉ còn ★1
  await timeWarp(page, 5 * 60_000);
  expect(await page.evaluate(() => globalThis.__farm.state.plots[0].water)).toBe(0);
  await tapPlot(page, 0, touch, async () => /Bắp cải ★☆☆/.test(await name.textContent()));
  await page.screenshot({ path: `test-results/stars-plot1-${testInfo.project.name}.png` });
  expect(errors).toEqual([]);
});
