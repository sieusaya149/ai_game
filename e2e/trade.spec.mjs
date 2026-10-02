import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { CLUTTER, pigKgPrice } from '../public/data.js';
import { bumpLayout } from '../public/farm.js';
import { stageStart, buyStrip, placeEntity, canPlace, buyAnimal, mapOf } from '../public/state.js';

// Vườn có chuồng heo + bãi bò, đúng một con `type` giữa chuồng, người chơi đứng sát con vật
function farmWith(type, extra = {}) {
  return makeSave(s => {
    s.coins = 1000; s.exp = 1e9;
    const rich = s.coins; s.coins = 1e9;
    for (let i = 0; i < 20; i++) for (const d of ['N', 'S', 'E', 'W']) buyStrip(s, d);
    s.farm.ents = s.farm.ents.filter(e => e.kind !== 'tree' && !CLUTTER[e.kind]); bumpLayout(s);
    const o = s.farm.owned;
    for (const pen of ['pasture', 'pig']) {
      outer: for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (canPlace(s, { kind: 'pen', pen }, c, r).ok) { placeEntity(s, { kind: 'pen', pen }, c, r); break outer; }
    }
    s.animals = []; s.inv.hay = s.inv.feed_heo = 50; s.troughs.pig = 20; s.troughs.pasture = 20;
    buyAnimal(s, type, 'f');   // con cái: bò cái mới có sữa (lát 36)
    s.coins = rich;
    const a = s.animals[0], area = mapOf(s).pens[{ heo: 'pig', bo: 'pasture' }[type]].area;
    Object.assign(a, { stage: 'truong', age: stageStart(type, 'truong'), bond: 2, bondXp: 0, hunger: 100, happy: 60, x: area.x + area.w / 2, y: area.y + area.h / 2, ...extra });
    s.player.x = a.x; s.player.y = a.y + 24;
    s.savedAt = Date.now();
  });
}
const open = async (page, context, save) => {
  await seedSave(context, save);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state?.animals?.length);
};
// Đứng sát con vật (hoặc cái cân) rồi bấm chip có chữ `label`; thử lại vì con vật đi lang thang
const chip = (page, label) => page.locator('#chips .chip', { hasText: label });
const standBy = (page, what) => page.evaluate(w => {
  const s = globalThis.__farm.state, a = s.animals[0];
  if (w === 'scale') { import('/state.js').then(S => { const c = S.mapOf(s).pens.pig.scale; s.player.x = c.x; s.player.y = c.y + 14; }); }
  else { s.player.x = a.x; s.player.y = a.y + 14; }
}, what);
const press = async (page, label) => {
  await expect(async () => {
    if (await page.locator('#dialog-root .dialog').count()) return;   // hộp xác nhận đã hiện
    await standBy(page, 'animal'); await chip(page, label).click({ timeout: 800, noWaitAfter: true });
    await expect(page.locator('#dialog-root .dialog')).toBeVisible({ timeout: 1000 });   // lúc đang bận việc khác thì nhấp bị bỏ qua
  }).toPass({ timeout: 20_000, intervals: [400] });
};
const dialogBtn = (page, name) => page.locator('#dialog-root').getByRole('button', { name, exact: true });
const coins = page => page.evaluate(() => globalThis.__farm.state.coins);

test('heo béo: cân xem số ký, bán thì Chú Ba tới dắt đi, xu = số ký × giá chợ hôm đó', async ({ page, context }) => {
  // heo vừa tắm, chưa lăn bùn lại (lát 37: heo dơ thì Chú Ba trả ít hơn)
  await open(page, context, farmWith('heo', { weight: 80, dirty: 0, wallowAt: 1e15 }));
  const before = await coins(page), day = await page.evaluate(() => globalThis.__farm.state.day);
  await expect(async () => {
    await standBy(page, 'scale');
    await page.locator('#main-action').click({ timeout: 800 });
    await expect(page.locator('body')).toContainText(/Cân heo: .*8\d(\.\d)? kg/, { timeout: 800 });
  }).toPass({ timeout: 20_000, intervals: [400] });
  await press(page, 'Bán heo');
  await expect(dialogBtn(page, 'Bán')).toBeVisible();
  await dialogBtn(page, 'Bán').click();
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.animals.length)).toBe(0);
  const deal = await page.evaluate(() => globalThis.__farm.world.deals[0]);
  expect(deal.kg).toBeGreaterThanOrEqual(80); expect(deal.unit).toBe(pigKgPrice(day));
  expect(await coins(page)).toBe(before + Math.floor(deal.kg * deal.unit));
  await page.waitForTimeout(1500);   // Chú Ba đang đi trên màn hình
  await page.screenshot({ path: test.info().outputPath('chu-ba.png') });
});

test('bò già ❤️4: bán phải xác nhận hai lần', async ({ page, context }) => {
  await open(page, context, farmWith('bo', { stage: 'gia', age: stageStart('bo', 'gia') + 1000, bond: 4 }));
  const before = await coins(page);
  await press(page, 'Bán bò');
  await dialogBtn(page, 'Bán').click();
  await expect(dialogBtn(page, 'Bán thật')).toBeVisible();
  await dialogBtn(page, 'Thôi').click();   // đổi ý ở lần hai
  expect(await page.evaluate(() => globalThis.__farm.state.animals.length)).toBe(1);
  expect(await coins(page)).toBe(before);
  await press(page, 'Bán bò');
  await dialogBtn(page, 'Bán').click();
  await dialogBtn(page, 'Bán thật').click();
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.animals.length)).toBe(0);
  expect(await coins(page)).toBeGreaterThan(before);
});

test('bò già nghỉ hưu: ở lại chuồng, không còn cho sữa', async ({ page, context }) => {
  await open(page, context, farmWith('bo', { stage: 'gia', age: stageStart('bo', 'gia') + 1000, ready: true }));
  await press(page, 'nghỉ hưu');
  await dialogBtn(page, 'Nghỉ hưu').click();
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.animals[0].retired)).toBe(true);
  const a = await page.evaluate(() => globalThis.__farm.state.animals[0]);
  expect(a.ready).toBe(false);
  await standBy(page, 'animal');
  await expect(page.locator('#actions')).not.toContainText('sữa');
});
