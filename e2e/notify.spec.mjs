import { test, expect } from '@playwright/test';
import { makeSave, seedSave, plantedCrop } from './helpers.mjs';

// Bấm một phím vô hại trước: lần chạm đầu tiên tạo AudioContext, trình duyệt ẩn khựng cả giây.
async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
}
// Quạ đang ăn ô 0, nằm ngoài khung nhìn vì người chơi đứng ở góc dưới vườn
const crowSave = mutate => makeSave(s => {
  plantedCrop(s, 0, 1);
  s.weather = 'rain';
  s.threats = [{ id: 901, kind: 'crow', plot: 0, x: 600, y: 248, arriveAt: 0, state: 'eating', since: s.time + 40_000 }];   // 25 giây ăn tính từ lúc since: lùi xa để trình duyệt khởi động chậm cũng không kịp ăn xong
  Object.assign(s.player, { x: 560, y: 540, dir: 1 });   // góc dưới vườn, ô 0 ở xa phía trên
  mutate?.(s);
});

test('quạ đang ăn cây ngoài khung nhìn: băng rôn đỏ + mũi tên chỉ đúng hướng', async ({ page, context }) => {
  await seedSave(context, crowSave());
  await page.goto('/');
  await ready(page);
  const banner = page.locator('#alert-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Quạ đang ăn cây');
  const arrow = page.locator('.alert-arrow[data-key="threat:901"]');
  await expect(arrow).toBeVisible();
  await page.waitForTimeout(600);   // camera dừng hẳn
  const r = await page.evaluate(() => {
    const f = globalThis.__farm, a = document.querySelector('.alert-arrow[data-key="threat:901"]');
    const c = { x: 600, y: 248 };   // tâm ô 0
    const hud = document.getElementById('hud').getBoundingClientRect(), bar = document.getElementById('bottombar').getBoundingClientRect();
    const p = { x: (c.x * f.scale - f.view.camX) / f.dpr, y: (c.y * f.scale - f.view.camY) / f.dpr };
    const mid = { x: innerWidth / 2, y: (hud.bottom + 4 + bar.top - 4) / 2 };
    const ang = Math.atan2(p.y - mid.y, p.x - mid.x) * 180 / Math.PI;
    const rc = a.getBoundingClientRect();
    return { p, want: ang, got: Number(a.dataset.ang), rc: { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 }, w: innerWidth, h: innerHeight, top: hud.bottom, bot: bar.top };
  });
  expect(r.p.y).toBeLessThan(r.top);   // thật sự nằm ngoài khung nhìn (phía trên)
  expect(Math.abs(r.got - r.want)).toBeLessThan(6);
  expect(r.rc.y).toBeLessThan(r.top + 60);   // nằm sát mép trên, phía dưới HUD
  expect(r.rc.y).toBeGreaterThan(r.top - 1);
  expect(r.rc.x).toBeGreaterThan(0);
  expect(r.rc.x).toBeLessThan(r.w);
  // chạm băng rôn thì tắt (mũi tên vẫn còn)
  await banner.click();
  await expect(banner).toBeHidden();
  await expect(arrow).toBeVisible();
});

test('đang ở làng: quạ ăn cây trong vườn vẫn có băng rôn, mũi tên chỉ về cổng', async ({ page, context }) => {
  await seedSave(context, crowSave(s => { s.scene = 'village'; Object.assign(s.player, { x: 200, y: 160, dir: 0 }); }));
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#alert-banner')).toContainText('Về vườn ngay');
  const arrow = page.locator('.alert-arrow[data-key="door"]');
  await expect(arrow).toBeAttached();
  expect(await page.evaluate(() => globalThis.__farm.state.scene)).toBe('village');
});

test('5 ô cải cùng chín chỉ ra một toast gộp; tắt "cây chín" thì không còn toast đó', async ({ page, context }) => {
  const ripening = mutate => makeSave(s => {
    for (let i = 0; i < 5; i++) plantedCrop(s, i, 0.997);
    s.weather = 'rain';
    mutate?.(s);
  });
  await seedSave(context, ripening());
  await page.goto('/');
  await ready(page);
  const toast = page.locator('#toasts .toast', { hasText: 'đã chín' });
  await expect(toast).toHaveText(/^5 ô cải xanh đã chín/, { timeout: 8000 });
  await expect(toast).toHaveCount(1);
  expect(await page.evaluate(() => globalThis.__farm.state.plots.slice(0, 5).every(p => p.crop.progress >= 1))).toBe(true);
});

test('tắt "cây chín" trong cài đặt: không còn toast cây chín, mức gấp không có công tắc', async ({ page, context }) => {
  await seedSave(context, makeSave(s => {
    for (let i = 0; i < 5; i++) plantedCrop(s, i, 0.9);
    s.weather = 'rain';
  }));
  await page.goto('/');
  await ready(page);
  await page.locator('.bb-btn[data-panel="settings"]').click();
  const locked = page.locator('.chk.locked input');
  await expect(locked).toBeDisabled();
  await expect(locked).toBeChecked();
  const ripe = page.locator('input[name="notify-ripe"]');
  await expect(ripe).toBeChecked();
  await ripe.uncheck();
  expect(await page.evaluate(() => globalThis.__farm.state.notify)).toEqual({ ripe: false });
  await page.keyboard.press('Escape');
  await page.evaluate(() => { for (const p of globalThis.__farm.state.plots.slice(0, 5)) p.crop.progress = 0.997; });
  await page.waitForFunction(() => globalThis.__farm.state.plots.slice(0, 5).every(p => p.crop.progress >= 1), null, { timeout: 8000 });
  await page.waitForTimeout(800);
  await expect(page.locator('#toasts .toast', { hasText: 'đã chín' })).toHaveCount(0);
});
