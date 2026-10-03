// Màu lông chó/mèo và bát ăn của chó (góp ý người chơi). Dựng bằng bản lưu ghi sẵn, không có hook test nào trong game (ADR 0008).
import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { mapOf, placeEntity, canPlace, upgradePen, stageStart, buyCat } from '../public/state.js';
import { DAY_MS, COAT, DOG } from '../public/data.js';

// Vườn ban ngày (chợ, trạm thú y mở), giàu, không con vật, không đơn hàng; `cathouse` = có nhà mèo cấp 3
const base = (mutate, cathouse = false) => makeSave(s => {
  s.coins = 5000; s.exp = 1e6; s.animals = []; s.orders = []; s.nextOrderAt = 1e15;
  s.time = DAY_MS * 0.1; s.duskDay = s.day;
  if (cathouse) {
    const o = s.farm.owned;
    out: for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (canPlace(s, { kind: 'cathouse' }, c, r).ok) { placeEntity(s, { kind: 'cathouse' }, c, r); break out; }
    const e = s.farm.ents.at(-1); upgradePen(s, e.id); upgradePen(s, e.id);
  }
  Object.assign(s.dog, { stage: 'truong', age: stageStart('cho', 'truong'), nextPoop: 1e15 });
  mutate?.(s);
});
const open = async (page, context, save) => {
  await seedSave(context, save);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
};
const st = (page, fn) => page.evaluate(fn);
const panel = (page, id) => page.evaluate(async p => { (await import('/ui.js')).openPanel(p); }, id);
async function tapAt(page, touch, x, y) {
  const pt = await page.evaluate(([wx, wy]) => {
    const f = globalThis.__farm, r = document.getElementById('game-canvas').getBoundingClientRect();
    return { x: (wx * f.scale - f.view.camX) / f.dpr + r.left, y: (wy * f.scale - f.view.camY) / f.dpr + r.top };
  }, [x, y]);
  if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
}

test('nhận nuôi chó ở màn tạo nhân vật: chọn màu lông vàng', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  const solo = page.getByRole('button', { name: /Chơi một mình/ }), input = page.getByPlaceholder('Tên của bạn');
  await expect(solo.or(input).first()).toBeVisible({ timeout: 15_000 });
  if (await solo.isVisible()) await solo.click();
  await input.fill('Tester');
  const pick = page.locator('#creator .coats[data-sp="cho"]');
  await expect(pick.locator('.coat')).toHaveCount(4);
  await expect(pick.locator('[data-coat="den"]')).toHaveAttribute('aria-pressed', 'true');   // mặc định chó Mực đen
  await pick.locator('[data-coat="vang"]').click();
  await expect(pick.locator('[data-coat="vang"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Vào nông trại/ }).click();
  await expect(page.locator('#creator')).toBeHidden();
  expect(await st(page, () => globalThis.__farm.state.dog.coat)).toBe('vang');
  expect(errors).toEqual([]);
});

test('chợ: chọn màu lông tam thể rồi mua mèo con', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page, context, base(null, true));
  await panel(page, 'market');
  await page.locator('.tab', { hasText: 'Vật nuôi' }).click();
  const row = page.locator('.row', { hasText: 'Mèo con' });
  await row.locator('[data-coat="tamthe"]').click();
  await expect(row.locator('[data-coat="tamthe"]')).toHaveAttribute('aria-pressed', 'true');
  await row.locator('[data-sex="f"]').click();
  await expect.poll(() => st(page, () => globalThis.__farm.state.cats.map(c => c.coat))).toEqual(['tamthe']);
  expect(errors).toEqual([]);
});

test('trạm thú y Cô Út: đổi màu lông chó và mèo, mỗi lần tốn ít xu', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page, context, base(s => { buyCat(s, 'f'); Object.assign(s.cats[0], { name: 'Mun', stage: 'truong', age: stageStart('meo', 'truong') }); }, true));
  const coins = await st(page, () => globalThis.__farm.state.coins);
  await panel(page, 'vet');
  const dog = page.locator('#vet-coats [data-pet="dog"]');
  await expect(dog).toContainText('lông đen');
  await dog.locator('[data-coat="trang"]').click();
  await expect.poll(() => st(page, () => globalThis.__farm.state.dog.coat)).toBe('trang');
  await expect(page.locator('#vet-coats [data-pet="dog"]')).toContainText('lông trắng');
  const cat = page.locator('#vet-coats .row', { hasText: 'Mun' });
  await cat.locator('[data-coat="den"]').click();
  await expect.poll(() => st(page, () => globalThis.__farm.state.cats[0].coat)).toBe('den');
  expect(await st(page, () => globalThis.__farm.state.coins)).toBe(coins - 2 * COAT.price);
  expect(errors).toEqual([]);
});

test('bát ăn cạnh chuồng chó: chạm vào bát để đổ xương, chó đói tự đi tới bát ăn', async ({ page, context }, info) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const save = base(s => {
    s.inv.dogfood = 5; s.basket = {};
    s.dog.hunger = DOG.bowlHungry + 0.5;   // vài giây nữa là đói
    const m = mapOf(s);
    Object.assign(s.player, { x: m.dogBowl.x + 4, y: m.dogBowl.y + 18 });
    Object.assign(s.dog, { x: m.dogBowl.x + 60, y: m.dogBowl.y + 10 });
  });
  const bowl = mapOf(save).dogBowl;
  await open(page, context, save);
  const touch = !!info.project.use.hasTouch;
  for (let i = 0; i < 4 && !(await st(page, () => globalThis.__farm.state.dog.bowl)); i++) {
    await tapAt(page, touch, bowl.x, bowl.y - 3);
    await page.waitForTimeout(800);
  }
  expect(await st(page, () => globalThis.__farm.state.dog.bowl)).toBe(1);
  expect(await st(page, () => globalThis.__farm.state.inv.dogfood + (globalThis.__farm.state.basket.dogfood || 0))).toBe(4);
  await expect(page.locator('#target-name')).toContainText(`còn 1/${DOG.bowlMax} phần`);
  // chó đói: đi tới bát rồi ăn sạch bát
  await expect.poll(() => st(page, () => { const d = globalThis.__farm.state.dog; return d.eatAt > 0; }), { timeout: 10_000 }).toBe(true);
  await expect.poll(async () => {
    const d = await st(page, () => ({ x: globalThis.__farm.state.dog.x, y: globalThis.__farm.state.dog.y }));
    return Math.hypot(d.x - (bowl.x - 9), d.y - (bowl.y + 1)) < 6;
  }, { timeout: 10_000 }).toBe(true);
  await expect.poll(() => st(page, () => globalThis.__farm.state.dog.bowl), { timeout: 12_000 }).toBe(0);
  expect(await st(page, () => globalThis.__farm.state.dog.hunger)).toBeGreaterThan(95);
  await expect(page.locator('#target-name')).toContainText('trống');
  expect(errors).toEqual([]);
});
