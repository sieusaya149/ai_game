import { test, expect } from '@playwright/test';
import { makeSave, seedSave, tilePoint, startDrag, installWarp, timeWarp } from './helpers.mjs';
import { placeEntity } from '../public/state.js';
import { AUTO } from '../public/data.js';

// Tự động hóa theo khối ruộng (issue 58): vườn có máy bơm (giếng cấp 4, ô 33,17) và bồn chứa ở ô 29,18 còn 12 lần nước,
// khối ruộng đầu (ô 37,15) cách bồn 7 ô (trong tầm), gieo sẵn 9 ô bắp cải trên đất khô. Chế độ xây dựng: chạm khối → Nâng cấp khối
// → mua tưới nhỏ giọt → khối hiện biểu tượng. Tua thời gian: ô tự được tưới, bồn trừ 1 lần mỗi ô; tua tiếp thì bồn cạn, máy ngừng,
// ô khô lại. Qua 6h sáng: nhật ký ghi tiền điện máy bơm lúc 6:00.
const FIELD = { c: 37, r: 15 };
const save = () => makeSave(s => {
  s.coins = 20_000;
  s.weather = 'cloud'; s.wday = 1;   // trời nhiều mây cả ngày 1 (không mưa tự tưới)
  s.farm.ents.find(e => e.kind === 'well').lv = 4;
  const r = placeEntity(s, { kind: 'tank' }, 29, 18);
  if (!r.ok) throw new Error(r.msg);
  s.water.level = 12;
  s.coins = 20_000;
  const f = s.farm.ents.find(e => e.kind === 'field');
  for (const i of f.plots) Object.assign(s.plots[i], {
    unlocked: true, soil: 'tilled', water: 0, weeds: false,
    crop: { id: 'bapcai', progress: 0.05, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: false } },
  });
  Object.assign(s.player, { x: 34 * 16 + 8, y: 21 * 16 + 8, dir: 0 });
});
const farm = page => page.evaluate(() => {
  const s = globalThis.__farm.state, f = s.farm.ents.find(e => e.kind === 'field');
  return { up: f.up, level: s.water.level, water: f.plots.map(i => s.plots[i].water), coins: s.coins, time: s.time };
});
// Màu điểm ảnh canvas ở toạ độ thế giới (x, y)
const px = (page, x, y) => page.evaluate(([x, y]) => {
  const f = globalThis.__farm, cv = document.getElementById('game-canvas');
  return [...cv.getContext('2d').getImageData(Math.round(x * f.scale - f.view.camX), Math.round(y * f.scale - f.view.camY), 1, 1).data];
}, [x, y]);
// Kéo chỗ đất trống (ô from) để ô `tile` về giữa phần trên màn hình (khay xây dựng che phần dưới)
async function centerOn(page, touch, from, tile) {
  const vp = page.viewportSize(), a = await tilePoint(page, ...from), t = await tilePoint(page, ...tile);
  const d = await startDrag(page, touch, a);
  await d.move({ x: a.x + vp.width / 2 - t.x, y: a.y + vp.height * 0.32 - t.y });
  await d.end();
  let last = null;
  await expect.poll(async () => {
    const v = await page.evaluate(() => [globalThis.__farm.view.camX, globalThis.__farm.view.camY]), same = !!last && v[0] === last[0] && v[1] === last[1];
    last = v;
    return same;
  }, { intervals: [150] }).toBe(true);
}

test('mua tưới nhỏ giọt cho một khối: tua thời gian thì ô tự được tưới, khối hiện biểu tượng; bồn cạn thì ngừng; tiền điện lúc 6h', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch, name = testInfo.project.name;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await installWarp(context);
  await seedSave(context, save());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
  await page.locator('#bb-build').click();
  await expect(page.locator('#buildbar')).toBeVisible();
  await page.waitForTimeout(700);
  await centerOn(page, touch, [33, 22], [FIELD.c + 1, FIELD.r + 1]);
  // góc trên trái khối: chưa có biểu tượng
  const bx = FIELD.c * 16 - 1.5, by = FIELD.r * 16 - 0.5;   // vành kem bên trái giọt nước của biểu tượng
  const before = await px(page, bx, by);

  // chạm khối ruộng (không kéo): hiện nút Nâng cấp khối
  await expect(page.locator('#build-fieldup')).toBeHidden();
  const d = await startDrag(page, touch, await tilePoint(page, FIELD.c + 1, FIELD.r + 1));
  await d.end();
  await expect(page.locator('#build-fieldup')).toBeVisible();
  await page.locator('#build-fieldup').click();
  const sheet = page.locator('.sheet');
  await expect(sheet).toContainText('Nâng cấp khối ruộng');
  const block = sheet.locator('.fu-block.on');
  await expect(block).toContainText('Khối ruộng 1');
  // ba nâng cấp có giá, chưa có cái nào
  for (const k of ['drip', 'spray', 'rich']) {
    await expect(block.locator(`.row[data-up="${k}"]`)).toHaveAttribute('data-has', '0');
    await expect(block.locator(`.row[data-up="${k}"]`)).toContainText(AUTO.ups[k].price.toLocaleString('vi-VN'));
  }
  const c0 = (await farm(page)).coins;
  await block.locator('.row[data-up="drip"] button').click();
  await expect(block.locator('.row[data-up="drip"]')).toHaveAttribute('data-has', '1');
  await expect(block.locator('.fu-badges img, .fu-badges .ico')).toHaveCount(1);
  const st = await farm(page);
  expect(st.up.drip).toBe(true);
  expect(st.coins).toBe(c0 - AUTO.ups.drip.price);
  await page.screenshot({ path: `test-results/auto-panel-${name}.png` });
  await page.locator('.sheet .close').click();
  await expect(sheet).toBeHidden();
  // khối hiện biểu tượng nâng cấp ở góc (nền tròn kem)
  await page.waitForTimeout(300);
  const after = await px(page, bx, by);
  expect(after, `góc khối đổi màu: ${before} → ${after}`).not.toEqual(before);
  expect(after[0] > 200 && after[1] > 200, `biểu tượng nền kem: ${after}`).toBe(true);
  await page.screenshot({ path: `test-results/auto-badge-${name}.png` });
  await page.locator('#build-done').click();
  await expect(page.locator('#buildbar')).toBeHidden();

  // tua 1 phút: cả 9 ô được tưới, bồn trừ 9 lần (máy bơm bơm thêm chưa tới 1 lần)
  await timeWarp(page, 60_000);
  let f = await farm(page);
  expect(f.water.every(w => w > 0), `ô đã tưới: ${f.water}`).toBe(true);
  expect(f.level).toBe(3);
  await page.screenshot({ path: `test-results/auto-watered-${name}.png` });
  // tua 5 phút: đất khô lại, bồn chỉ đủ vài ô rồi cạn: máy ngừng, phần còn lại khô, bồn không âm
  await timeWarp(page, 5 * 60_000);
  f = await farm(page);
  expect(f.level).toBe(0);
  expect(f.water.filter(w => w <= 0).length, `ô khô: ${f.water}`).toBeGreaterThanOrEqual(3);
  await page.locator('#bb-build').click();
  await expect(page.locator('#buildbar')).toBeVisible();
  await page.waitForTimeout(500);
  await centerOn(page, touch, [33, 22], [FIELD.c + 1, FIELD.r + 1]);
  const d2 = await startDrag(page, touch, await tilePoint(page, FIELD.c + 1, FIELD.r + 1));
  await d2.end();
  await page.locator('#build-fieldup').click();
  await expect(page.locator('.fu-block.on .row[data-up="drip"]')).toContainText('Bồn cạn');
  await page.screenshot({ path: `test-results/auto-empty-${name}.png` });
  await page.locator('.sheet .close').click();
  await page.locator('#build-done').click();

  // qua 6h sáng hôm sau: nhật ký ghi tiền điện lúc 6:00, xu trừ đúng số đó
  const c1 = (await farm(page)).coins;
  await timeWarp(page, 16 * 60_000);
  await page.locator('[data-panel="log"]').click();
  const line = page.locator('.log-row', { hasText: 'Trả tiền điện' });
  await expect(line).toHaveCount(1);
  await expect(line.locator('.log-t')).toContainText(/ 6:0[01]$/);   // bước tick 1 giây: dòng nhật ký ghi ở giây đầu của 6h
  const paid = Number((await line.textContent()).match(/Trả tiền điện ([\d.]+) xu/)[1].replace(/\./g, ''));
  expect(paid).toBeGreaterThan(0);
  expect((await farm(page)).coins).toBe(c1 - paid);
  await page.screenshot({ path: `test-results/auto-log-${name}.png` });
  expect(errors).toEqual([]);
});
