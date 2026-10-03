import { test, expect } from '@playwright/test';
import { makeSave, seedSave, installWarp } from './helpers.mjs';
import { stageStart, mapOf } from '../public/state.js';

const open = async (page, context, save) => {
  await seedSave(context, save);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
};
const press = (page, touch, p) => (touch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));
const screenOf = (page, x, y) => page.evaluate(([x, y]) => {
  const f = globalThis.__farm, r = document.getElementById('game-canvas').getBoundingClientRect();
  return { x: (x * f.scale - f.view.camX) / f.dpr + r.left, y: (y * f.scale - f.view.camY) / f.dpr + r.top };
}, [x, y]);
const duck = (s, extra) => ({ ...structuredClone(s.animals[0]), id: s.nextId++, type: 'vit', name: 'Vịt', sex: 'f', stage: 'truong', age: stageStart('vit', 'truong'), hunger: 100, happy: 100, nextProduct: s.time + 1e12, tile: null, ...extra });

test('chợ: mua vịt cái → vào chuồng gia cầm; vịt con đi theo vịt mẹ', async ({ page, context }) => {
  test.setTimeout(90_000);   // đàn vịt con xếp hàng theo mẹ mất vài chục giây máy ảo
  await open(page, context, makeSave(s => { s.exp = 1e4; s.coins = 1e4; s.time = 1000; s.animals = []; s.troughs.chicken = 20; }));
  await page.evaluate(async () => { (await import('/ui.js')).openPanel('market'); });
  await page.locator('.tab', { hasText: 'Vật nuôi' }).click();
  const row = page.locator('.row', { hasText: 'Vịt con' });
  await expect(row.locator('.sexopt')).toHaveCount(2);
  await row.locator('[data-sex="f"]').click();
  const ducks = () => page.evaluate(() => globalThis.__farm.state.animals.filter(a => a.type === 'vit'));
  await expect.poll(async () => (await ducks()).length).toBe(1);
  const d = (await ducks())[0];
  expect(d.sex).toBe('f'); expect(d.stage).toBe('non');
  const pen = await page.evaluate(id => globalThis.__farm.state.farm.ents.find(e => e.id === id)?.pen, d.pen);
  expect(pen).toBe('chicken');
  // dựng vịt mẹ + 3 vịt con: chúng đi thành hàng theo mẹ. Vịt mua lúc 6h sáng là đã ra thả rông (có a.tile),
  // nên gọi cả nhà về chuồng (tile null) rồi vặn đồng hồ sang tối để không con nào ra lại.
  await page.evaluate(async () => {
    const S = globalThis.__farm.state, M = (await import('/state.js')).mapOf(S), a = M.pens.chicken.area;
    const mom = S.animals.find(x => x.type === 'vit');
    Object.assign(mom, { stage: 'truong', age: (await import('/state.js')).stageStart('vit', 'truong'), hunger: 100, nextProduct: S.time + 1e12, tile: null, stray: false, x: a.x + a.w / 2, y: a.y + a.h / 2 });
    for (let i = 0; i < 3; i++) S.animals.push({ ...structuredClone(mom), id: S.nextId++, stage: 'non', age: 0, sex: 'm', tile: null, stray: false, x: a.x + 8, y: a.y + 8 });
    S.time = 0.9 * 20 * 60_000;
  });
  await page.waitForTimeout(500);
  await expect.poll(() => page.evaluate(() => {
    const S = globalThis.__farm.state, mom = S.animals.find(a => a.type === 'vit' && a.stage === 'truong'), kids = S.animals.filter(a => a.type === 'vit' && a.stage === 'non');
    return kids.length === 3 && kids.every(k => Math.hypot(k.x - mom.x, k.y - mom.y) < 45);
  }), { timeout: 40_000, intervals: [1000] }).toBe(true);
});

test('vịt mái trưởng thành đẻ trứng vịt → nhặt được trứng vịt', async ({ page, context }) => {
  const touch = test.info().project.name === 'mobile';
  const save = makeSave(s => {
    s.animals = [duck(s, { nextProduct: s.time })];
    s.troughs.chicken = 20;
    const a = mapOf(s).pens.chicken.area;
    s.player.x = a.x + a.w / 2; s.player.y = a.y + a.h + 6;
  });
  await installWarp(context);
  await open(page, context, save);
  const egg = () => page.evaluate(() => globalThis.__farm.state.eggs.find(e => e.sp === 'vit'));
  await expect.poll(egg, { timeout: 20_000 }).toBeTruthy();
  const e = await egg();
  await page.evaluate(([x, y]) => { Object.assign(globalThis.__farm.state.player, { x, y: y + 8 }); }, [e.x, e.y]);
  await expect(async () => {
    const q = await egg();
    await press(page, touch, await screenOf(page, q.x, q.y - 2));
    await expect(page.locator('#target-name')).toHaveText(/trứng/i, { timeout: 1500 });
  }).toPass({ timeout: 15_000, intervals: [600] });
  await page.locator('#main-action').click();   // Soi trứng
  await expect.poll(async () => (await egg())?.candled).toBe(true);
  await page.locator('#main-action').click();   // nhặt
  await expect.poll(() => page.evaluate(() => { const s = globalThis.__farm.state; return (s.basket.trung_vit || 0) + (s.inv.trung_vit || 0) + (s.basket.trung_vit_phoi || 0) + (s.inv.trung_vit_phoi || 0); }), { timeout: 8000 }).toBeGreaterThanOrEqual(1);
});

test('pixel art: mỗi giai đoạn vịt một sprite riêng, vịt cồ khác vịt mái và khác gà', async ({ page }) => {
  await page.goto('/');
  const urls = await page.evaluate(async () => {
    const { SPR3 } = await import('/art3.js');
    const o = {};
    for (const sp of ['vit', 'vitDuc', 'ga', 'gaTrong'])
      for (const st of ['non', 'nho', 'truong', 'gia']) {
        o[`${sp}.${st}.đi0`] = SPR3.animal[sp][st].left[0].toDataURL();
        o[`${sp}.${st}.đi1`] = SPR3.animal[sp][st].left[1].toDataURL();
        if (sp.startsWith('vit')) { o[`${sp}.${st}.ngủ`] = SPR3.sleepBy[sp][st].toDataURL(); o[`${sp}.${st}.bệnh`] = SPR3.sickBy[sp][st].toDataURL(); }
      }
    o.eggDuck = SPR3.eggDuck.toDataURL(); o.eggNestDuck = SPR3.eggNestDuck.toDataURL(); o.eggNest = SPR3.eggNest.toDataURL();
    return o;
  });
  const vals = Object.values(urls);
  expect(vals.every(Boolean)).toBe(true);
  expect(new Set(vals).size).toBe(vals.length);   // không giai đoạn nào dùng chung art
});
