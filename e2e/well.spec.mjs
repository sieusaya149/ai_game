import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { mapOf } from '../public/state.js';
import { WELL } from '../public/data.js';

// Giếng 4 cấp (issue 56): đứng trước giếng, bình rỗng, nhiều xu. Mỗi cấp: múc đầy đúng sức chứa, nâng giếng bằng nút có giá,
// hình giếng đổi (render.buildingImg theo cấp) và nước trong bình giữ nguyên.
const CAP = [10, 15, 25, 40];
const save = () => makeSave(s => {
  s.coins = 30_000; s.can = 0;
  const at = mapOf(s).building('well').at;
  Object.assign(s.player, { x: at.x, y: at.y, dir: 3 });
});
const st = page => page.evaluate(async () => {
  const S = await import('/state.js'), s = globalThis.__farm.state;
  return { lv: S.wellLv(s), can: s.can, coins: s.coins };
});
// Hình render sẽ vẽ cho giếng lúc này (bản 2x nếu có), dạng dataURL
const wellPic = page => page.evaluate(async () => {
  const S = await import('/state.js'), R = await import('/render.js'), H = await import('/hd.js');
  const im = R.buildingImg(S.mapOf(globalThis.__farm.state).building('well'));
  return { url: (H.hdOf(im) ?? im).toDataURL(), w: im.width, h: im.height, hd: !!H.hdOf(im) };
});
const press = (page, touch, loc) => (touch ? loc.tap() : loc.click());

test('nâng giếng từ cấp 1 lên 4: mỗi cấp hình đổi, bình múc đầy đúng 10 / 15 / 25 / 40 lần', async ({ page, context }, testInfo) => {
  test.setTimeout(60_000);   // 4 lần múc + 3 lần nâng, máy ảo chậm
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedSave(context, save());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');   // Chromium headless khựng ở lần nhấn đầu

  const pics = new Set();
  let coins = (await st(page)).coins;
  for (let lv = 1; lv <= 4; lv++) {
    const cap = CAP[lv - 1];
    // chạm giếng: tên, cấp và sức chứa bình
    await expect(page.locator('#target-name')).toHaveText(`${WELL[lv - 1].name} · cấp ${lv} · bình ${cap} lần`, { timeout: 5000 });
    const pic = await wellPic(page);
    expect([pic.w, pic.h, pic.hd]).toEqual([16, 24, true]);
    pics.add(pic.url);
    expect(pics.size, `cấp ${lv} có hình riêng`).toBe(lv);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `test-results/well-lv${lv}-${testInfo.project.name}.png` });

    // múc nước: bình đầy đúng sức chứa của cấp này
    await expect(page.locator('#main-action .ma-label')).toContainText(`/${cap})`);
    await press(page, touch, page.locator('#main-action'));
    await expect.poll(async () => (await st(page)).can, { timeout: 5000 }).toBe(cap);
    await expect(page.locator('#hud-can')).toHaveText(`${cap}/${cap}`);

    if (lv === 4) break;
    // nút nâng cấp có tên cấp sau và giá; nâng xong trừ đúng xu, nước trong bình giữ nguyên
    const up = page.locator('#chips .chip', { hasText: `Nâng lên ${WELL[lv].name}` });
    await expect(up).toContainText(WELL[lv].price.toLocaleString('vi-VN'));
    await press(page, touch, up);
    await expect.poll(async () => (await st(page)).lv, { timeout: 5000 }).toBe(lv + 1);
    const now = await st(page);
    expect(now.coins).toBe(coins - WELL[lv].price);
    expect(now.can).toBe(cap);
    coins = now.coins;
  }
  // cấp 4: hết nút nâng
  await expect(page.locator('#chips .chip', { hasText: 'Nâng lên' })).toHaveCount(0);
  // tải lại vẫn là máy bơm, bình còn đầy
  await page.reload();
  await page.waitForFunction(() => globalThis.__farm?.state);
  expect(await st(page)).toMatchObject({ lv: 4, can: 40 });
  expect(errors).toEqual([]);
});
