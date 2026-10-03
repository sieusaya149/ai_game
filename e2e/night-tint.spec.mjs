// Ban đêm: màn hình tối theo đồng hồ HUD ở vườn, làng, trong nhà; đèn lồng sáng lên ban đêm. Bản lưu ghi sẵn, đo độ sáng canvas.
import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { mapOf, placeEntity, canPlace } from '../public/state.js';
import { DAY_MS } from '../public/data.js';

const H = DAY_MS / 24;   // 1 giờ game; ngày bắt đầu 6h sáng
const save = (hour, scene, lamp) => makeSave(s => {
  s.coins = 1e5; s.exp = 1e6; s.animals = []; s.inv = {}; s.orders = []; s.nextOrderAt = 1e15;
  s.time = (hour - 6) * H; s.duskDay = s.day; s.speed = 1;
  if (scene) s.scene = scene;
  if (lamp) {
    s.inv.deco_lamp = 1;
    const sp = mapOf(s).spawn, o = s.farm.owned, best = [];
    for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (canPlace(s, { kind: 'deco', item: 'deco_lamp' }, c, r).ok) best.push({ c, r, d: Math.hypot(c * 16 - sp.x, r * 16 - sp.y) });
    const t = best.filter(b => b.d > 20).sort((a, b) => a.d - b.d)[0];
    const r = placeEntity(s, { kind: 'deco', item: 'deco_lamp' }, t.c, t.r); if (!r.ok) throw new Error(r.msg);
  }
});
const bright = async (browser, s) => {
  const context = await browser.newContext(), page = await context.newPage();
  await seedSave(context, s);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
  await page.waitForTimeout(600);
  const v = await page.evaluate(() => {
    const c = document.getElementById('game-canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let sum = 0, n = 0;
    for (let i = 0; i < d.length; i += 64) { sum += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; n++; }
    return sum / n;
  });
  await context.close();
  return v;
};

for (const scene of ['farm', 'village', 'house']) {
  test(`màn hình tối dần theo đồng hồ: ${scene}`, async ({ browser }) => {
    test.setTimeout(90_000);   // ba lần tải vườn lớn Phase 3 sát 30 giây
    const noon = await bright(browser, save(12, scene)), eve = await bright(browser, save(19.5, scene)), night = await bright(browser, save(23, scene));
    expect(eve, 'chữ "tối" mà màn hình chưa tối').toBeLessThan(noon * 0.93);
    expect(night).toBeLessThan(eve);
  });
}

test('đèn lồng làm vùng quanh nó sáng hơn ban đêm', async ({ browser }) => {
  const dark = await bright(browser, save(23)), lit = await bright(browser, save(23, null, true));
  expect(lit).toBeGreaterThan(dark * 1.01);
});
