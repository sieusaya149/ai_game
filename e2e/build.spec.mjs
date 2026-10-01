import { test, expect } from '@playwright/test';
import { makeSave, seedSave, tilePoint, startDrag } from './helpers.mjs';

// Giếng đặt gần cổng, thêm một cây cạnh lối ra cổng: kéo giếng vào ô còn lại là bịt cổng.
const save = () => makeSave(s => {
  Object.assign(s.farm.ents.find(e => e.kind === 'well'), { c: 34, r: 31 });
  s.farm.ents.push({ id: 900, kind: 'tree', c: 36, r: 33 });
  s.farm.rev++;
  s.player.x = 34 * 16 + 8; s.player.y = 28 * 16 + 8;
});
const well = page => page.evaluate(() => { const e = globalThis.__farm.state.farm.ents.find(x => x.kind === 'well'); return [e.c, e.r]; });

async function open(page, context) {
  await seedSave(context, save());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
}
async function enterBuild(page) {
  await page.locator('#bb-build').click();
  await expect(page.locator('#buildbar')).toBeVisible();
  await page.waitForTimeout(700);   // camera dịch xong khi thanh dưới ẩn đi
}
async function dragWell(page, touch, to, check) {
  const d = await startDrag(page, touch, await tilePoint(page, 34, 31));
  await d.move(await tilePoint(page, ...to));
  await check?.();
  await d.end();
}

test('dời giếng tới chỗ hợp lệ → Xong → tải lại vẫn ở chỗ mới', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await open(page, context);
  await enterBuild(page);
  await dragWell(page, touch, [35, 27], async () => {
    await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '1');
  });
  await expect.poll(() => well(page)).toEqual([35, 27]);
  await page.locator('#build-done').click();
  await expect(page.locator('#buildbar')).toBeHidden();
  await expect(page.locator('#bottombar')).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => globalThis.__farm?.state);
  expect(await well(page)).toEqual([35, 27]);
});

test('kéo vào chỗ chặn đường: bóng đỏ, đúng lý do, thả ra thì không dời', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await open(page, context);
  await enterBuild(page);
  await dragWell(page, touch, [37, 33], async () => {
    await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '0');
    await expect(page.locator('#build-msg')).toHaveText('Chặn mất đường từ cổng vào nhà');
    const g = await page.evaluate(() => globalThis.__farm.world.build.ghost);
    expect(g).toMatchObject({ c: 37, r: 33, ok: false, reason: 'blocks_path' });
  });
  expect(await well(page)).toEqual([34, 31]);
  await expect(page.locator('#build-msg')).toHaveAttribute('data-ok', '0');
});

test('Hủy thì mọi thứ về như trước khi vào chế độ xây dựng', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await open(page, context);
  await enterBuild(page);
  await dragWell(page, touch, [35, 27]);
  await expect.poll(() => well(page)).toEqual([35, 27]);
  await page.locator('#build-cancel').click();
  expect(await well(page)).toEqual([34, 31]);
  await page.reload();
  await page.waitForFunction(() => globalThis.__farm?.state);
  expect(await well(page)).toEqual([34, 31]);
});

test('không vào chế độ xây dựng thì kéo không dời được; trong chế độ thì chạm không làm việc khác', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await open(page, context);
  await page.waitForTimeout(400);
  await dragWell(page, touch, [35, 27]);
  await page.waitForTimeout(300);
  expect(await well(page)).toEqual([34, 31]);

  await enterBuild(page);
  const before = await page.evaluate(() => ({ ...globalThis.__farm.state.player }));
  const p = await tilePoint(page, 34, 30);
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);   // chạm cỏ trống: không đi tới
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ ...globalThis.__farm.state.player, path: globalThis.__farm.world.path }));
  expect([after.x, after.y]).toEqual([before.x, before.y]);
  expect(after.path).toBeNull();
});
