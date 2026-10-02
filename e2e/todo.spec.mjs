import { test, expect } from '@playwright/test';
import { makeSave, seedSave, plantedCrop } from './helpers.mjs';
import { mapOf, enterScene } from '../public/state.js';

// 3 ô khô (ô 0, 1, 2 ở xa chỗ người chơi đứng); máng đầy để không có việc nào khác
const dry3 = s => { for (const i of [0, 1, 2]) { plantedCrop(s, i, 0.3); s.plots[i].water = 0; } s.troughs.chicken = 10; };

async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');   // lần nhấn đầu làm Chromium ẩn khựng ~1s
}
// Người chơi đang đứng trong tầm một ô ruộng khô (cách tối đa 1 ô)?
const nearDry = page => page.evaluate(async () => {
  const { mapOf } = await import('/state.js');
  const s = globalThis.__farm.state;
  if (s.scene !== 'farm') return false;
  const m = mapOf(s), c = Math.floor(s.player.x / 16), r = Math.floor(s.player.y / 16);
  return s.plots.some(p => p.unlocked && p.water < 30 && p.crop && (t => Math.abs(t.c - c) <= 1 && Math.abs(t.r - r) <= 1)(m.plotTile(p.idx)));
});
const openTodo = async page => { await page.locator('#todo-btn').click(); await expect(page.locator('#panel-root')).toBeVisible(); };

test('bảng Việc cần làm: chạm "3 ô khô" thì nhân vật tự đi tới đứng cạnh một ô khô', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedSave(context, makeSave(dry3));
  await page.goto('/');
  await ready(page);
  expect(await nearDry(page)).toBe(false);
  await expect(page.locator('#todo-n')).toHaveText('1');
  await openTodo(page);
  await expect(page.locator('.todo-row')).toHaveCount(1);
  await page.getByRole('button', { name: /💧 3 ô khô/ }).click();
  await expect(page.locator('#panel-root')).toBeHidden();
  await expect.poll(() => nearDry(page), { timeout: 15_000 }).toBe(true);
  // chỉ đi tới, không tự tưới
  expect(await page.evaluate(() => globalThis.__farm.state.plots.filter(p => p.crop && p.water === 0).length)).toBe(3);
  expect(errors).toEqual([]);
});

test('đang ở trong nhà: chạm việc ngoài vườn thì ra cửa rồi đi tới đúng chỗ', async ({ page, context }) => {
  await seedSave(context, makeSave(s => { dry3(s); enterScene(s, 'house'); }));
  await page.goto('/');
  await ready(page);
  expect(await page.evaluate(() => globalThis.__farm.state.scene)).toBe('house');
  await openTodo(page);
  await expect(page.locator('#panel-root .note')).toContainText('về vườn');
  await page.getByRole('button', { name: /3 ô khô/ }).click();
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.scene), { timeout: 10_000 }).toBe('farm');
  await expect.poll(() => nearDry(page), { timeout: 20_000 }).toBe(true);
});

test('bản đồ nhỏ: chấm đỏ cho việc gấp, chấm vàng cho việc thường, đúng màu đúng chỗ; chạm để phóng to', async ({ page, context }) => {
  // exp cao: trên cấp 5 thì bệnh mới được vượt mức Mệt (bảo hộ người mới, issue 38)
  const save = makeSave(s => { dry3(s); s.exp = 1e6; s.animals[0].sick = 2; s.animals[0].sickMs = 60 * 60_000; });
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  // chỗ mong đợi, tính độc lập từ bản lưu: khung là đất đã mua, vừa khít canvas 96px
  const m = mapOf(save), o = m.owned, w = o.w * 16, h = o.h * 16, k = Math.min(96 / w, 96 / h);
  const px = p => ({ x: Math.round(p.x * k + (96 - w * k) / 2 - o.c * 16 * k), y: Math.round(p.y * k + (96 - h * k) / 2 - o.r * 16 * k) });
  const want = [...[0, 1, 2].map(i => ({ ...px(m.plotCenter(i)), c: 'normal' })), { ...px(save.animals[0]), c: 'urgent' }];
  await expect.poll(() => page.locator('#minimap').getAttribute('data-dots')).toBeTruthy();
  const dots = JSON.parse(await page.locator('#minimap').getAttribute('data-dots'));
  for (const d of want) expect(dots).toContainEqual(d);
  // đọc điểm ảnh thật của canvas tại các chấm
  const RGB = { urgent: [229, 69, 47], normal: [255, 210, 58] };
  for (const d of want) {
    const rgb = await page.evaluate(([x, y]) => [...document.getElementById('mini-cv').getContext('2d').getImageData(x, y, 1, 1).data].slice(0, 3), [d.x, d.y]);
    expect(rgb, `chấm ${d.c} tại ${d.x},${d.y}`).toEqual(RGB[d.c]);
  }
  await expect(page.locator('#todo-btn')).toHaveClass(/urgent/);
  // chạm bản đồ nhỏ: phóng to, chạm ra ngoài thì đóng
  await page.locator('#minimap').click();
  await expect(page.locator('.mini-big')).toBeVisible();
  await page.locator('#panel-root .backdrop').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('#panel-root')).toBeHidden();
});

test('bản đồ nhỏ và nút 📋 không đè lên joystick, nút hành động, thanh dưới', async ({ page, context }) => {
  await seedSave(context, makeSave(dry3));
  await page.goto('/?joy=1');
  await ready(page);
  const rect = sel => page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }, sel);
  const mini = await rect('#mini-wrap'), hud = await rect('#hud'), bar = await rect('#bottombar'), joy = await rect('#joy-base');
  const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  expect(hit(mini, bar)).toBe(false);
  expect(hit(mini, joy)).toBe(false);
  expect(mini.r).toBeLessThanOrEqual(page.viewportSize().width);
  if (page.viewportSize().width < 600) expect(mini.t).toBeGreaterThanOrEqual(hud.b);   // màn hẹp: nằm dưới HUD, không che HUD
});
