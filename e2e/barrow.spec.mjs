import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { placeEntity } from '../public/state.js';
import { DAY_MS } from '../public/data.js';

// Cấp 4, hai chuồng gà; người chơi đứng gần chuồng gà đầu.
const save = () => makeSave(s => {
  s.exp = 25 + 70 + 129 + 10; s.coins = 5000; s.time = DAY_MS * 0.4; s.weather = 'sun';
  s.farm.owned = { c: 20, r: 14, w: 40, h: 30 }; s.farm.rev++;
  const r = placeEntity(s, { kind: 'pen', pen: 'chicken' }, 44, 24); if (!r.ok) throw new Error(r.msg);
  s.player.x = 27 * 16 + 8; s.player.y = 22 * 16 + 8;
  for (const a of s.animals) a.nextProduct = 1e15;
});

test('xe rùa: bế gà lên xe rồi thả vào chuồng gà mới ở máng ăn', async ({ page, context }) => {
  await seedSave(context, save());
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
  const bought = await page.evaluate(async () => { const S = await import('/state.js'); const r = S.buy(globalThis.__farm.state, 'barrow'); return { ok: r.ok, n: S.haveItem(globalThis.__farm.state, 'barrow') }; });
  expect(bought).toEqual({ ok: true, n: 1 });
  const info = await page.evaluate(() => {
    const s = globalThis.__farm.state, pens = s.farm.ents.filter(e => e.kind === 'pen' && e.pen === 'chicken');
    const hen = s.animals.find(a => a.type === 'ga' && a.pen === pens[0].id);
    return { hen: hen.id, to: pens[1].id, from: pens[0].id };
  });
  const penOf = () => page.evaluate(id => globalThis.__farm.state.animals.find(a => a.id === id).pen, info.hen);
  const carry = () => page.evaluate(() => globalThis.__farm.state.carry?.animalId ?? null);
  // 1) gà đi lạc thì mục tiêu đổi: đứng lại sát nó rồi chạm tới khi bế được lên xe
  const lift = page.locator('#main-action, #chips .chip').filter({ hasText: 'Chở bằng xe rùa' });
  await expect(async () => {
    await page.evaluate(id => { const s = globalThis.__farm.state, a = s.animals.find(x => x.id === id); s.player.x = a.x; s.player.y = a.y + 6; }, info.hen);
    await expect(lift.first()).toBeVisible({ timeout: 1000 });
    await lift.first().click();
    await expect.poll(carry, { timeout: 2000 }).toBe(info.hen);
  }).toPass({ timeout: 40_000 });
  expect(await penOf()).toBe(info.from);   // chưa thả thì vẫn thuộc chuồng cũ
  // 2) đẩy xe tới máng chuồng mới, chạm nút Thả
  await page.evaluate(async id => { const { mapOf } = await import('/state.js'); const s = globalThis.__farm.state, t = mapOf(s).penById[id].trough; s.player.x = t.x + 8; s.player.y = t.y - 3; }, info.to);
  const drop = page.locator('#main-action, #chips .chip').filter({ hasText: 'vào chuồng này' });
  await expect(async () => {
    await expect(drop.first()).toBeVisible({ timeout: 1000 });
    await drop.first().click();
    await expect.poll(penOf, { timeout: 3000 }).toBe(info.to);
  }).toPass({ timeout: 20_000 });
  expect(await carry()).toBeNull();
  const inPen = await page.evaluate(id => { const a = globalThis.__farm.state.animals.find(x => x.id === id); return { x: a.x, y: a.y }; }, info.hen);
  expect(inPen.x).toBeGreaterThan(40 * 16);   // chuồng mới ở cột 44, xa chuồng cũ ở cột 27
});
