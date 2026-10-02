import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { CLUTTER } from '../public/data.js';
import { bumpLayout } from '../public/farm.js';
import { DAY_MS } from '../public/data.js';
import { stageStart, buyStrip, placeEntity, canPlace, buyAnimal, mapOf } from '../public/state.js';

// Vườn có đủ chuồng, chỉ có đúng một con `type` ở tim `bond`, đứng giữa chuồng, người chơi đứng cách `dx,dy` (px)
function farmWith(type, bond, dx, dy, extra = {}, far = false) {
  return makeSave(s => {
    s.coins = 1e9; s.exp = 1e9;
    for (let i = 0; i < 20; i++) for (const d of ['N', 'S', 'E', 'W']) buyStrip(s, d);
    s.farm.ents = s.farm.ents.filter(e => e.kind !== 'tree' && !CLUTTER[e.kind]); bumpLayout(s);   // dọn cây cối, bụi rậm cho có chỗ đặt chuồng
    const o = s.farm.owned;
    for (const pen of ['pasture', 'pig']) {
      outer: for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (canPlace(s, { kind: 'pen', pen }, c, r).ok) { placeEntity(s, { kind: 'pen', pen }, c, r); break outer; }
    }
    s.animals = []; s.inv.hay = s.inv.feed_heo = 50;
    buyAnimal(s, type);
    const a = s.animals[0], area = mapOf(s).pens[{ ga: 'chicken', heo: 'pig', bo: 'pasture' }[type]].area;
    Object.assign(a, { stage: 'truong', age: stageStart(type, 'truong'), bond, bondXp: 0, hunger: 100, happy: 60, x: area.x + (far ? 6 : area.w / 2), y: area.y + area.h / 2, ...extra });
    s.player.x = far ? area.x + area.w + 60 : a.x + dx; s.player.y = a.y + dy;
    s.savedAt = Date.now();
  });
}
const open = async (page, context, save) => {
  await seedSave(context, save);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state?.animals?.length);
};
const dist = page => page.evaluate(() => { const { animals: [a], player: p } = globalThis.__farm.state; return Math.hypot(a.x - p.x, a.y - p.y); });

test('bò ❤️1: vuốt ve và cho ăn tận tay thì tim bay lên và số tim tăng', async ({ page, context }) => {
  await open(page, context, farmWith('bo', 1, 0, 24, { hunger: 30 }));
  const touch = test.info().project.name === 'mobile';
  let sawHeart = false;
  await expect(async () => {
    const pt = await page.evaluate(() => {
      const f = globalThis.__farm, a = f.state.animals[0], r = document.getElementById('game-canvas').getBoundingClientRect();
      return { x: (a.x * f.scale - f.view.camX) / f.dpr + r.left, y: ((a.y - 6) * f.scale - f.view.camY) / f.dpr + r.top };
    });
    if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
    sawHeart ||= await page.evaluate(() => globalThis.__farm.world.fx.some(f => f.text.includes('❤️')));
    expect(await page.evaluate(() => globalThis.__farm.state.animals[0].bond)).toBeGreaterThanOrEqual(2);
  }).toPass({ timeout: 25_000, intervals: [700] });
  expect(sawHeart).toBe(true);
  await expect(page.locator('#target-name')).toHaveText(/Bò .*❤️/);
});

test('gà ❤️4: người chơi tới gần thì gà chạy lại', async ({ page, context }) => {
  const sv = farmWith('ga', 4, 60, 0); sv.time = DAY_MS * 0.76;   // ban đêm gà ở trong chuồng (ban ngày thả rông, issue 41)
  await open(page, context, sv);
  expect(await dist(page)).toBeGreaterThan(50);
  await expect.poll(() => dist(page), { timeout: 15_000 }).toBeLessThan(32);
});

test('heo ❤️5: heo đi theo người chơi (người đứng ngoài chuồng thì heo ra sát hàng rào phía người)', async ({ page, context }) => {
  await open(page, context, farmWith('heo', 5, 0, 0, {}, true));
  const gap = () => page.evaluate(async () => {
    const { mapOf } = await import('/state.js'), s = globalThis.__farm.state, a = s.animals[0], area = mapOf(s).pens.pig.area;
    return area.x + area.w - a.x;
  });
  expect(await gap()).toBeGreaterThan(20);
  await expect.poll(gap, { timeout: 20_000 }).toBeLessThan(6);
});