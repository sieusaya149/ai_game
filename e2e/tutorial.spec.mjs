import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createCharacter, tapPlot, installWarp, timeWarp, seedSave, makeSave } from './helpers.mjs';
import { DAY_MS } from '../public/data.js';

const st = page => page.evaluate(() => { const s = globalThis.__farm.state; return { scene: s.scene, tutorial: s.tutorial, day: s.day, seeds: s.inv.seed_cai || 0 }; });
const screenOf = (page, x, y) => page.evaluate(([x, y]) => {
  const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
  return { x: (x * f.scale - f.view.camX) / f.dpr + rc.left, y: (y * f.scale - f.view.camY) / f.dpr + rc.top };
}, [x, y]);
// Chạm vào điểm (x, y) của bản đồ; ngoài màn hình thì chạm về phía đó cho nhân vật đi, camera theo, lặp tới khi thấy.
// Máy bận thì mỗi vòng nhân vật đi được ít hơn nên để rộng số vòng; chỉ chạm khi điểm nằm trên mặt bản đồ
// (lớp nổi che mất thì bỏ vòng đó, khỏi lỡ bấm trúng nút).
async function tap(page, touch, x, y) {
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);   // camera dừng hẳn
    // lỡ chạm trúng công trình nằm trên đường đi: đóng bảng rồi đi tiếp
    if (await page.locator('#panel-root:not([hidden])').count()) { await page.locator('#panel-root .close').first().click(); await page.waitForTimeout(250); }
    const p = await screenOf(page, x, y);
    const b = await page.evaluate(() => ({ w: innerWidth, top: document.getElementById('hud').getBoundingClientRect().bottom + 4, bot: document.getElementById('bottombar').getBoundingClientRect().top - 4, mini: document.getElementById('mini-wrap').getBoundingClientRect().toJSON() }));
    const inMini = (px, py) => px > b.mini.left - 14 && px < b.mini.right + 14 && py > b.mini.top - 14 && py < b.mini.bottom + 14;
    const ok = p.x > 4 && p.x < b.w - 4 && p.y > b.top && p.y < b.bot && !inMini(p.x, p.y);
    const onMap = ([px, py]) => document.elementFromPoint(px, py)?.id === 'game-canvas';
    const press = (px, py) => (touch ? page.touchscreen.tap(px, py) : page.mouse.click(px, py));
    if (ok) {
      if (!(await page.evaluate(onMap, [p.x, p.y]))) continue;
      await press(p.x, p.y);
      return;
    }
    // điểm ngoài màn hình: kẹp về mép rồi lùi dần về giữa màn hình (cùng hướng) tới khi chạm được chỗ đi được.
    // Điểm mép có thể trúng nút nổi (nút tốc độ góc trên trái) hay chỗ kín không có đường tới (trong chuồng rào)
    let tx = Math.min(b.w - 20, Math.max(20, p.x)), ty = Math.min(b.bot - 20, Math.max(b.top + 20, p.y));
    if (inMini(tx, ty)) ty = b.mini.bottom + 24;
    const cx = b.w / 2, cy = (b.top + b.bot) / 2;
    for (let k = 0; k <= 8; k++) {
      const f = 1 - k * 0.1, px = cx + (tx - cx) * f, py = cy + (ty - cy) * f;
      if (!(await page.evaluate(onMap, [px, py]))) continue;
      await press(px, py);
      if (await page.evaluate(() => (globalThis.__farm.world.path?.length ?? 0) > 0 || !!globalThis.__farm.world.pending)) break;
    }
  }
  throw new Error(`Không chạm được điểm ${x},${y}`);
}
// Điểm chạm trên công trình / cổng của bản đồ đang đứng
const where = (page, kind, id) => page.evaluate(async ([kind, id]) => {
  const { sceneMap } = await import('/state.js');
  const m = sceneMap(globalThis.__farm.state);
  if (kind === 'door') { const d = m.doors.find(o => o.to === id); return { x: d.x + d.w / 2, y: d.y + d.h / 2 }; }
  const b = m.building(id), f = b.foot;
  return b.hit ? { x: b.hit.x + b.hit.w / 2, y: b.hit.y + b.hit.h / 2 } : { x: f.c * 16 + f.w * 8, y: f.r * 16 + f.h * 8 };
}, [kind, id]);
// Đã gợi ý tiết kiệm pin rồi: khỏi hiện hộp gợi ý giữa chừng
const noHint = ctx => ctx.addInitScript(() => { try { localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {} });

test('người chơi mới đi hết hướng dẫn: cuốc → gieo → tưới → thu hoạch → thùng → chợ → ngủ', async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await installWarp(context);
  await noHint(context);
  await context.addInitScript(() => { Math.random = () => 0.99; });   // không sâu, cỏ, quạ, trộm bất chợt chen vào lúc chờ cây lớn
  await page.goto('/');
  await createCharacter(page);
  await page.keyboard.press('Shift');   // lần chạm đầu tạo AudioContext, trình duyệt ẩn khựng cả giây
  const tut = page.locator('#tutorial');
  await expect(tut).toContainText('Bước 1/7');

  await tapPlot(page, 0, touch);
  await expect(tut).toContainText('Bước 2/7', { timeout: 15_000 });
  await tapPlot(page, 0, touch);
  await expect(tut).toContainText('Bước 3/7', { timeout: 15_000 });
  await tapPlot(page, 0, touch);
  await expect(tut).toContainText('Bước 4/7', { timeout: 15_000 });
  await expect(tut).toContainText('Đợi cây lớn');

  // chờ cây lớn: bật x20 (cải lớn trong 1,5 phút game)
  await page.evaluate(() => { globalThis.__farm.state.speed = 20; });
  await expect(tut).toContainText('Cây chín rồi', { timeout: 20_000 });
  await page.evaluate(() => { globalThis.__farm.state.speed = 1; });
  await tapPlot(page, 0, touch);
  await expect(tut).toContainText('Bước 5/7', { timeout: 15_000 });
  await expect(tut).toContainText('thùng giao hàng');

  // bỏ hết nông sản vào thùng
  const bin = await where(page, 'building', 'shipbin');
  await tap(page, touch, bin.x, bin.y);
  await expect(page.locator('#panel-root')).toBeVisible({ timeout: 12_000 });
  await page.getByRole('button', { name: 'Bỏ hết' }).click();
  await page.locator('#panel-root .close').click();
  await expect(tut).toContainText('Bước 6/7', { timeout: 5000 });
  await expect(tut).toContainText('chợ Bà Tư');

  // ra làng, mua hạt ở chợ, về vườn
  const gate = await where(page, 'building', 'gate');
  await tap(page, touch, gate.x, gate.y);
  await expect.poll(async () => (await st(page)).scene, { timeout: 15_000 }).toBe('village');
  const stall = await where(page, 'building', 'market');
  await tap(page, touch, stall.x, stall.y);
  await expect(page.locator('#panel-root')).toBeVisible({ timeout: 12_000 });
  await page.locator('.row', { hasText: 'Hạt cải' }).getByRole('button', { name: '×1' }).click();
  await page.locator('#panel-root .close').click();
  await expect(tut).toContainText('Bước 7/7');
  await expect(tut).toContainText('18h về nhà ngủ');
  const door = await where(page, 'door', 'farm');
  await tap(page, touch, door.x, door.y);
  await expect.poll(async () => (await st(page)).scene, { timeout: 15_000 }).toBe('farm');

  // chờ tới tối (tua hơn 10 phút = hơn 12 giờ game), vào nhà ngủ
  await timeWarp(page, DAY_MS / 2 + 60_000);
  await page.keyboard.press('Shift');
  await expect(tut).toContainText('bấm giường');
  const house = await where(page, 'building', 'house');
  await tap(page, touch, house.x, house.y);
  await expect.poll(async () => (await st(page)).scene, { timeout: 15_000 }).toBe('house');
  const bed = await where(page, 'building', 'bed');
  const day0 = (await st(page)).day;
  await tap(page, touch, bed.x, bed.y);
  await expect.poll(async () => (await st(page)).tutorial, { timeout: 15_000 }).toBe(7);
  await expect.poll(async () => (await st(page)).day, { timeout: 5000 }).toBeGreaterThan(day0);
  await expect(tut).toBeHidden();
  expect(errors).toEqual([]);
});

const V1 = 'nongtrai-save-v1';
const v1 = async (context, ago) => {
  const old = JSON.parse(readFileSync(new URL('../tests/fixtures/v1-mid.json', import.meta.url), 'utf8'));
  old.savedAt = Date.now() - ago;
  await context.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch {} }, [V1, JSON.stringify(old)]);
  await noHint(context);
};

test('bản v1: "Bản mới có gì đổi" hiện đúng một lần, tải lại thì hết', async ({ page, context }) => {
  await v1(context, 0);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  const news = page.locator('#whatsnew');
  await expect(news).toBeVisible();
  await expect(news).toContainText('Bản mới có gì đổi');
  for (const t of ['Chế độ xây dựng', 'Chợ Bà Tư', 'Thùng giao hàng', 'Thể lực', 'Công cụ']) await expect(news).toContainText(t);
  await page.screenshot({ path: `test-results/news-${test.info().project.name}.png` });
  await news.getByRole('button', { name: 'Hiểu rồi!' }).click();
  await expect(news).toBeHidden();

  await page.reload();
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.waitForTimeout(800);
  await expect(news).toBeHidden();
  expect(await page.evaluate(() => globalThis.__farm.state.seenWhatsNew)).toBe(2);
});

test('v1 vắng nhà lâu: màn "Trong lúc bạn vắng nhà" trước, đóng rồi mới tới "Bản mới có gì đổi"', async ({ page, context }) => {
  await v1(context, 30 * 60_000);
  await page.goto('/');
  await expect(page.locator('#away')).toBeVisible();
  await expect(page.locator('#whatsnew')).toBeHidden();
  await page.locator('#away').getByRole('button').click();
  await expect(page.locator('#whatsnew')).toBeVisible();
});

test('sổ tay mở từ túi đồ, lật đủ các trang (cấp cao)', async ({ page, context }) => {
  await noHint(context);
  await seedSave(context, makeSave(s => { s.exp = 1e6; }));
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
  await page.locator('.bb-btn[data-panel="bag"]').click();
  await page.getByRole('button', { name: /Sổ tay hướng dẫn/ }).click();
  const head = page.locator('.sheet-head h2'), body = page.locator('.guide-page');
  await expect(head).toHaveText(/Sổ tay/);
  const titles = ['Thể lực', 'Công cụ', 'Chế độ xây dựng', 'Mở đất', 'Thùng giao hàng', 'Chợ và giờ mở cửa', 'Đực, cái và sinh sản', 'Vịt', 'Chó Mực và dạy lệnh', 'Chó canh nhà',
    'Vòng đời', 'Xe rùa', 'Tắm cho vật nuôi', 'Bệnh và thú y', 'Lùa về chuồng', 'Kẻ săn mồi',
    'Bốn mùa', 'Chất lượng ★', 'Thành thạo cây', 'Thời tiết', 'Nhà kính', 'Nước: giếng, bồn, tầm nước', 'Tự động hóa khối ruộng', 'Hố ủ phân'];
  for (let i = 0; i < titles.length; i++) {
    await expect(body.locator('h3')).toHaveText(titles[i]);
    await expect(body.locator('canvas.guide-art')).toBeVisible();
    await expect(page.locator('.guide-nav .mini')).toHaveText(`Trang ${i + 1}/${titles.length}`);
    await page.screenshot({ path: `test-results/guide-${i + 1}-${test.info().project.name}.png` });
    if (i < titles.length - 1) await page.getByRole('button', { name: 'Sau ▶' }).click();
  }
  await page.getByRole('button', { name: '◀ Trước' }).click();
  await expect(body.locator('h3')).toHaveText(titles.at(-2));
});

test('sổ tay mở dần theo cấp: cấp 1 chỉ có các trang cơ bản, chưa thấy tắm, bệnh, lùa, kẻ săn mồi', async ({ page, context }) => {
  await noHint(context);
  await seedSave(context, makeSave());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
  await page.locator('.bb-btn[data-panel="bag"]').click();
  await page.getByRole('button', { name: /Sổ tay hướng dẫn/ }).click();
  await expect(page.locator('.guide-nav .mini')).toHaveText(/^Trang 1\/\d+$/);
  const dots = page.locator('.guide-dot');
  expect(await dots.count()).toBeGreaterThanOrEqual(11);
  await expect(dots.nth(10)).toHaveAttribute('title', 'Vòng đời');
  for (const t of ['Xe rùa', 'Tắm cho vật nuôi', 'Lùa về chuồng', 'Kẻ săn mồi']) await expect(page.locator(`.guide-dot[title="${t}"]`)).toHaveCount(0);
});
