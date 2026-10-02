import { test, expect } from '@playwright/test';
import { createCharacter } from './helpers.mjs';

const scene = page => page.evaluate(() => globalThis.__farm.state.scene);
// Điểm giữa cửa dẫn tới `to` và vị trí nhân vật, đổi ra tọa độ màn hình
const points = (page, to) => page.evaluate(async to => {
  const { sceneMap } = await import('/state.js');
  const f = globalThis.__farm, s = f.state, d = sceneMap(s).doors.find(o => o.to === to);
  const rc = document.getElementById('game-canvas').getBoundingClientRect();
  const scr = (x, y) => ({ x: (x * f.scale - f.view.camX) / f.dpr + rc.left, y: (y * f.scale - f.view.camY) / f.dpr + rc.top });
  return { door: scr(d.x + d.w / 2, d.y + d.h / 2), me: scr(s.player.x, s.player.y) };
}, to);
// Cửa ngoài màn hình thì chạm một đoạn ngắn từ nhân vật về phía cửa (tránh chạm nhầm nhà), lặp tới khi tới nơi
async function tapDoor(page, touch, to) {
  await page.waitForTimeout(500);   // camera dừng hẳn
  const { door, me } = await points(page, to), vp = page.viewportSize();
  let { x, y } = door;
  const dx = x - me.x, dy = y - me.y, len = Math.hypot(dx, dy), max = 220;
  const inView = x > 40 && x < vp.width - 40 && y > 140 && y < vp.height - 110;
  if (!inView && len > max) { x = me.x + dx / len * max; y = me.y + dy / len * max; }
  if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
}
async function goTo(page, touch, to) {
  for (let i = 0; i < 10 && (await scene(page)) !== to; i++) {
    await tapDoor(page, touch, to);
    await expect.poll(() => scene(page), { timeout: 6000 }).toBe(to).catch(() => {});
  }
  expect(await scene(page)).toBe(to);
  await expect(page.locator('#fade')).not.toHaveClass(/on/);
}

test('smoke live: endpoint sức khỏe của server Node trả 200 qua Caddy', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  expect((await res.json()).ok).toBe(true);
});

test('smoke live: tải trang, tạo nhân vật, mở chế độ xây dựng, ra làng và về', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('#creator')).toBeVisible();
  await createCharacter(page, 'Smoke');
  await page.keyboard.press('Shift');   // lần nhấn đầu tạo AudioContext, trình duyệt ẩn khựng một lúc

  // chế độ xây dựng mở và hủy được
  await page.locator('#bb-build').click();
  await expect(page.locator('#buildbar')).toBeVisible();
  await page.locator('#build-cancel').click();
  await expect(page.locator('#buildbar')).toBeHidden();

  // ra làng qua cổng vườn rồi về
  await goTo(page, touch, 'village');
  await goTo(page, touch, 'farm');

  await page.waitForTimeout(800);
  expect(errors).toEqual([]);

  // Dọn dữ liệu trình duyệt của test
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
});
