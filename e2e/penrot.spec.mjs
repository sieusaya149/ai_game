import { test, expect } from '@playwright/test';
import { makeSave, seedSave, tilePoint, startDrag } from './helpers.mjs';
import { DAY_MS } from '../public/data.js';

// Ban ngày, dọn vườn cho chuồng gà (13x9, góc (24,21)) có chỗ xoay thành 9x13; đàn gà trưởng thành.
const save = () => makeSave(s => {
  s.time = DAY_MS * 0.1;
  s.farm.ents = s.farm.ents.filter(e => ['house', 'gate', 'giftbox', 'guestbook', 'pen'].includes(e.kind));
  Object.assign(s.farm.ents.find(e => e.kind === 'pen'), { c: 24, r: 21 });
  s.farm.rev++;
  const tpl = s.animals.find(a => a.type === 'ga' && a.stage === 'truong');
  for (let i = 0; i < 5; i++) s.animals.push({ ...structuredClone(tpl), id: s.nextId++, sex: 'f', pen: tpl.pen, tile: null, nextProduct: 1e15 });
  s.animals.forEach(a => { a.x = 30 * 16; a.y = 25 * 16; });   // gọn giữa chuồng: tới khi xoay vẫn nằm trong vùng đi lại
  s.player.x = 30 * 16; s.player.y = 27 * 16;
});
const pen = page => page.evaluate(() => { const e = globalThis.__farm.state.farm.ents.find(x => x.kind === 'pen'); return { rot: e.rot ?? 0, c: e.c, r: e.r }; });

test('chế độ xây dựng: chọn chuồng gà, Xoay, Xong → cửa bên trái, gà vẫn ra vào cửa mới', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await seedSave(context, save());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.locator('#bb-build').click();
  await expect(page.locator('#buildbar')).toBeVisible();
  await page.waitForTimeout(700);
  await expect(page.locator('#build-rotate')).toBeHidden();
  const d = await startDrag(page, touch, await tilePoint(page, 28, 23));   // chạm giữa chuồng (không kéo) để chọn
  await d.end();
  await expect(page.locator('#build-rotate')).toBeVisible();
  await page.locator('#build-rotate').click();
  expect(await pen(page)).toMatchObject({ rot: 1, c: 24, r: 21 });
  await page.screenshot({ path: testInfo.outputPath('rot1.png') });
  await page.locator('#build-done').click();
  await expect(page.locator('#buildbar')).toBeHidden();
  await page.reload();
  await page.waitForFunction(() => globalThis.__farm?.state);
  expect((await pen(page)).rot).toBe(1);
  // gà ra vườn qua cửa mới (cột trái), rồi về chuồng
  await page.evaluate(async () => { const S = await import('/state.js'); S.tick(globalThis.__farm.state, 3 * 60_000); });
  const out = await page.evaluate(() => {
    const s = globalThis.__farm.state, p = s.farm.ents.find(x => x.kind === 'pen');
    const free = s.animals.filter(a => a.tile);
    return { free: free.length, inPen: free.some(a => a.tile.c >= p.c && a.tile.c < p.c + 9 && a.tile.r >= p.r && a.tile.r < p.r + 13) };
  });
  expect(out.free).toBeGreaterThan(0);
  expect(out.inPen).toBe(false);
  await page.waitForTimeout(800);
  await page.screenshot({ path: testInfo.outputPath('rot1-day.png') });
});

test('Xoay vòng ba lần rồi Hủy: chuồng về như cũ; xoay không vừa chỗ thì báo lý do', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await seedSave(context, save());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.locator('#bb-build').click();
  await page.waitForTimeout(700);
  const d = await startDrag(page, touch, await tilePoint(page, 28, 23));
  await d.end();
  await page.locator('#build-rotate').click();
  await page.locator('#build-rotate').click();
  expect((await pen(page)).rot).toBe(2);
  await page.screenshot({ path: testInfo.outputPath('rot2.png') });
  await page.locator('#build-cancel').click();
  expect((await pen(page)).rot).toBe(0);
  // đẩy chuồng xuống sát đáy đất: xoay tràn ra ngoài đất
  await page.evaluate(async () => { const S = await import('/state.js'), s = globalThis.__farm.state; S.moveEntity(s, s.farm.ents.find(x => x.kind === 'pen').id, 24, 24); });
  await page.locator('#bb-build').click();
  await page.waitForTimeout(700);
  const d2 = await startDrag(page, touch, await tilePoint(page, 28, 26));
  await d2.end();
  await page.locator('#build-rotate').click();
  await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '0');
  await expect(page.locator('#build-msg')).toContainText('ngoài đất');
  expect((await pen(page)).rot).toBe(0);
});
