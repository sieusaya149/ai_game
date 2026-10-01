import { test, expect } from '@playwright/test';
import { makeSave, seedSave, tapPlot } from './helpers.mjs';
import { mapOf } from '../public/state.js';
import { DAY_MS, THREATS } from '../public/data.js';

// Người chơi đứng ngay trước lối ra cổng vườn, hết hạt cà rốt, ô 0 đã cuốc sẵn, đang chọn gieo cà rốt.
const save = mutate => makeSave(s => {
  const at = mapOf(s).building('gate').at;
  Object.assign(s.player, { x: at.x, y: at.y, dir: 0 });
  s.inv = { seed_carot: 0 };   // loadGame vẫn trả lại đồ khởi đầu khác; chỉ cần hết hạt cà rốt
  s.selectedSeed = 'carot';
  s.plots[0].soil = 'tilled';
  s.animals = [];
  mutate?.(s);
});

const st = page => page.evaluate(() => { const s = globalThis.__farm.state; return { scene: s.scene, x: s.player.x, y: s.player.y, inv: { ...s.inv }, planted: s.stats.planted, crop: s.plots[0].crop?.id ?? null }; });
// Bấm một phím vô hại trước: lần chạm đầu tiên tạo AudioContext, trình duyệt ẩn khựng cả giây làm chạm bị coi là giữ lâu.
async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
}
const screenOf = (page, x, y) => page.evaluate(([x, y]) => {
  const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
  return { x: (x * f.scale - f.view.camX) / f.dpr + rc.left, y: (y * f.scale - f.view.camY) / f.dpr + rc.top };
}, [x, y]);
async function tap(page, touch, x, y) {
  await page.waitForTimeout(400);   // camera dừng hẳn
  const p = await screenOf(page, x, y);
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
// Điểm chạm trên công trình / cổng của bản đồ đang đứng
const where = (page, kind, id) => page.evaluate(async ([kind, id]) => {
  const { sceneMap } = await import('/state.js');
  const m = sceneMap(globalThis.__farm.state);
  if (kind === 'door') { const d = m.doors.find(o => o.to === id); return { x: d.x + d.w / 2, y: d.y + d.h / 2 }; }
  const b = m.building(id); return { x: b.x + 24, y: b.y + 20 };
}, [kind, id]);

test('ra cổng → làng → mua hạt ở chợ → về vườn → gieo hạt vừa mua', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedSave(context, save());
  await page.goto('/');
  await ready(page);

  // đi xuống qua lối ra cổng: sang làng
  await page.keyboard.down('ArrowDown');
  await expect.poll(async () => (await st(page)).scene, { timeout: 8000 }).toBe('village');
  await page.keyboard.up('ArrowDown');
  await expect(page.locator('#fade')).not.toHaveClass(/on/);
  await expect(page.locator('#bb-build')).toBeHidden();

  // chạm vào chợ Bà Tư: tự đi tới và mở chợ
  const stall = await where(page, 'building', 'market');
  await tap(page, touch, stall.x, stall.y);
  await expect(page.locator('#panel-root')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.sheet-head h2')).toHaveText(/Chợ Bà Tư/);
  await expect(page.locator('.note.closed')).toHaveCount(0);
  await page.locator('.row', { hasText: 'Hạt cà rốt' }).getByRole('button', { name: '×1' }).click();
  await expect.poll(async () => (await st(page)).inv.seed_carot).toBe(1);
  await page.locator('#panel-root .close').click();
  await expect(page.locator('#panel-root')).toBeHidden();

  // về vườn qua cổng nhà mình
  const door = await where(page, 'door', 'farm');
  await tap(page, touch, door.x, door.y);
  await expect.poll(async () => (await st(page)).scene, { timeout: 12_000 }).toBe('farm');
  const back = await st(page);
  const gate = await page.evaluate(async () => { const { mapOf } = await import('/state.js'); return mapOf(globalThis.__farm.state).building('gate').at; });
  expect(Math.abs(back.x - gate.x) + Math.abs(back.y - gate.y)).toBeLessThan(2);

  // đi bộ lên gần ruộng (camera đứng yên rồi mới chạm ô), gieo hạt vừa mua
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await st(page)).y, { timeout: 15_000 }).toBeLessThan(300);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(500);
  await tapPlot(page, 0, touch);
  await expect.poll(async () => (await st(page)).crop, { timeout: 15_000 }).toBe('carot');
  const done = await st(page);
  expect(done.planted).toBe(1);
  expect(done.inv.seed_carot ?? 0).toBe(0);
  expect(errors).toEqual([]);
});

test('lúc 20h chợ hiện "Đóng cửa", hành động bị khóa có lý do', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedSave(context, save(s => {
    s.time = (20 - 6) / 24 * DAY_MS;   // 20h
    s.coins = 500;
    Object.assign(s.player, { x: 296, y: 96, dir: 0 });
    s.scene = 'village';
  }));
  await page.goto('/');
  await ready(page);
  expect((await st(page)).scene).toBe('village');

  const stall = await where(page, 'building', 'market');
  await tap(page, touch, stall.x, stall.y);
  // tới nơi thì hiện toast lý do, không mở bảng chợ
  await expect(page.locator('#toasts .toast', { hasText: 'đóng cửa' })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#panel-root')).toBeHidden();
  expect((await st(page)).inv.seed_carot).toBe(0);
  // biển đóng cửa đang treo ở sạp
  const closed = await page.evaluate(async () => { const { marketOpen } = await import('/state.js'); return !marketOpen(globalThis.__farm.state); });
  expect(closed).toBe(true);
  expect(errors).toEqual([]);
});

test('đang ở làng, quạ ăn cây trong vườn: vẫn có thông báo', async ({ page, context }) => {
  await seedSave(context, save(s => {
    Object.assign(s.plots[0], { soil: 'tilled', water: 100, crop: { id: 'cai', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 } });
    s.weather = 'rain';
    s.scene = 'village';
    Object.assign(s.player, { x: 296, y: 96, dir: 0 });
    s.threats = [{ id: 901, kind: 'crow', plot: 0, x: 400, y: 300, arriveAt: 0, state: 'eating', since: 0 }];
    s.time = THREATS.crowEatMs - 500;   // nửa giây nữa là quạ ăn xong
  }));
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#toasts .toast', { hasText: 'Quạ đã ăn mất' })).toBeVisible({ timeout: 8000 });
  expect((await st(page)).scene).toBe('village');
});
