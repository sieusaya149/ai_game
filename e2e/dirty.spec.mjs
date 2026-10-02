import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { mapOf, placeEntity, canPlace, buyAnimal } from '../public/state.js';

// Vườn có chuồng heo gần cổng, heo dơ bét, chuồng heo đầy phân, bình đầy nước, chưa có xà phòng. Người chơi đứng ở cổng.
const save = () => makeSave(s => {
  s.coins = 1e5; s.exp = 1e6; s.can = 5; s.animals = [];
  const g = mapOf(s).building('gate').at, gc = Math.floor(g.x / 16), gr = Math.floor(g.y / 16);
  const cand = [];
  for (let r = gr - 14; r < gr; r++) for (let c = gc - 12; c < gc + 6; c++) cand.push([c, r]);
  cand.sort((a, b) => Math.hypot(a[0] - gc, a[1] - gr) - Math.hypot(b[0] - gc, b[1] - gr));
  const [c, r] = cand.find(([c, r]) => canPlace(s, { kind: 'pen', pen: 'pig' }, c, r).ok);
  placeEntity(s, { kind: 'pen', pen: 'pig' }, c, r);
  buyAnimal(s, 'heo'); s.coins = 500;
  s.animals[0].dirty = 100; s.animals[0].wallowAt = 1e15;   // dơ sẵn và chưa tới lúc lăn bùn lại
  s.manure.pig = 100;
  s.inv = { seed_carot: 0 };
  Object.assign(s.player, { x: g.x, y: g.y, dir: 0 });
});

const st = page => page.evaluate(() => { const s = globalThis.__farm.state; return { scene: s.scene, inv: { ...s.inv }, can: s.can, heo: { dirty: s.animals[0].dirty, happy: s.animals[0].happy }, manure: s.manure.pig }; });
const screenOf = (page, x, y) => page.evaluate(([x, y]) => {
  const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
  return { x: (x * f.scale - f.view.camX) / f.dpr + rc.left, y: (y * f.scale - f.view.camY) / f.dpr + rc.top };
}, [x, y]);
async function tap(page, touch, x, y) {
  await page.waitForTimeout(400);
  const p = await screenOf(page, x, y);
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
const where = (page, id) => page.evaluate(async id => {
  const { sceneMap } = await import('/state.js');
  const b = sceneMap(globalThis.__farm.state).building(id); return { x: b.x + 24, y: b.y + 20 };
}, id);
const door = (page, to) => page.evaluate(async to => {
  const { sceneMap } = await import('/state.js');
  const d = sceneMap(globalThis.__farm.state).doors.find(o => o.to === to); return { x: d.x + d.w / 2, y: d.y + d.h / 2 };
}, to);

test('heo dơ: mua xà phòng ở chợ → tắm (bọt, lắc mình, lấp lánh) → sạch; xúc phân chuồng bẩn', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedSave(context, save());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
  // ghi lại các pha hoạt cảnh tắm đang vẽ
  await page.evaluate(async () => {
    const { bathPhase } = await import('/render.js');
    const seen = globalThis.__phases = [];
    setInterval(() => {
      for (const b of globalThis.__farm.world.baths ?? []) { const p = bathPhase(b, performance.now()); if (p && !b.wallow && seen.at(-1) !== p.name) seen.push(p.name); }
    }, 30);
  });

  // ra làng, mua xà phòng ở chợ Bà Tư
  await page.keyboard.down('ArrowDown');
  await expect.poll(async () => (await st(page)).scene, { timeout: 12_000 }).toBe('village');
  await page.keyboard.up('ArrowDown');
  await expect(page.locator('#fade')).not.toHaveClass(/on/);
  const stall = await where(page, 'market');
  await tap(page, touch, stall.x, stall.y);
  await expect(page.locator('.sheet-head h2')).toHaveText(/Chợ Bà Tư/, { timeout: 10_000 });
  await page.getByRole('button', { name: /Vật tư/ }).click();
  await page.locator('.row', { hasText: 'Xà phòng' }).getByRole('button', { name: '×1' }).click();
  await expect.poll(async () => (await st(page)).inv.soap).toBe(1);
  await page.locator('#panel-root .close').click();
  const back = await door(page, 'farm');
  await tap(page, touch, back.x, back.y);
  await expect.poll(async () => (await st(page)).scene, { timeout: 12_000 }).toBe('farm');
  await page.waitForTimeout(600);

  const heoPt = () => page.evaluate(() => { const a = globalThis.__farm.state.animals[0]; return { x: a.x, y: a.y - 4 }; });
  // tắm cho heo
  const before = await st(page);
  expect(before.heo.dirty).toBe(100);
  await expect(async () => {
    const p = await heoPt();
    await tap(page, touch, p.x, p.y);
    await expect.poll(async () => (await st(page)).heo.dirty, { timeout: 4000 }).toBe(0);
  }).toPass({ timeout: 25_000 });
  const after = await st(page);
  expect(after.inv.soap ?? 0).toBe(0);
  expect(after.can).toBe(before.can - 1);
  expect(after.heo.happy).toBeGreaterThan(before.heo.happy);
  await page.screenshot({ path: testInfo.outputPath('tam-1.png') });
  await expect.poll(() => page.evaluate(() => globalThis.__phases.join('>')), { timeout: 5000 }).toBe('soap>shake>sparkle');

  // xúc phân chuồng bẩn: chạm vào máng
  const trough = await page.evaluate(async () => { const { mapOf } = await import('/state.js'); const t = mapOf(globalThis.__farm.state).pens.pig.trough; return { x: t.x, y: t.y - 6 }; });
  await expect(async () => {
    await tap(page, touch, trough.x, trough.y);
    const main = page.locator('#main-action');   // đã đứng sẵn ở máng thì chạm chỉ chọn mục tiêu, bấm nút hành động chính
    if (await main.isVisible() && /Xúc phân/.test(await main.textContent())) await main.click();
    await expect.poll(async () => (await st(page)).inv.manure ?? 0, { timeout: 4000 }).toBeGreaterThanOrEqual(1);
  }).toPass({ timeout: 25_000 });
  expect((await st(page)).manure).toBeLessThan(5);   // chuồng sạch (chỉ mới tích lại chút ít)
  expect(errors).toEqual([]);
});
