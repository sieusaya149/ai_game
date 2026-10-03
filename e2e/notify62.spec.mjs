// Thông báo, Việc cần làm và Sổ tay cho cây và nước (issue 62). Dựng tình huống bằng bản lưu ghi sẵn (ADR 0008).
import { test, expect } from '@playwright/test';
import { makeSave, seedSave, tapPlot, closeAway } from './helpers.mjs';
import { placeEntity, canPlace, mapOf, enterScene, compostAdd, compostStart, footprint } from '../public/state.js';
import { TANK } from '../public/data.js';

const NOPREF = ctx => ctx.addInitScript(() => { try { localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {} });
async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
  await closeAway(page);   // máy chậm: bản lưu ghi sẵn đã cũ > 3 giây nên game chạy bù và hiện màn "vắng nhà"
}
// Dâu tây chín ★3 có trái khổng lồ, ở ngưỡng thành thạo: thu hoạch thì lên cấp 3
const dau = () => ({ id: 'dau', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: true, boosts: 0, dead: false, rotten: false, ripeAt: 0, q: { dry: false, bugMax: 0, hand: true }, giant: true });
const harvestSave = () => makeSave(s => {
  s.weather = 'cloud'; s.exp = 1e6;
  s.mastery.dau = { lv: 2, n: 24 };
  Object.assign(s.plots[0], { soil: 'tilled', water: 100, crop: dau() });
  const c = mapOf(s).plotCenter(0);
  Object.assign(s.player, { x: c.x, y: c.y + 40 });
});
const spot = (s, what) => {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (canPlace(s, what, c, r).ok) return { c, r };
  throw new Error('không còn chỗ');
};
// Vườn có giếng cấp 4, bồn chứa gần cạn và hố ủ đã xong; người chơi đứng xa hai chỗ đó
function waterSave(mutate) {
  return makeSave(s => {
    Object.assign(s, { weather: 'cloud', exp: 1e6, coins: 1e5 });
    s.farm.ents.find(e => e.kind === 'well').lv = 4;
    for (const kind of ['tank', 'compost']) { const p = spot(s, { kind }); expect(placeEntity(s, { kind }, p.c, p.r).ok, kind).toBe(true); }
    s.water.level = TANK.low - 5;
    s.inv.manure = 6;
    expect(compostAdd(s, 'manure', 6).ok).toBe(true);
    expect(compostStart(s).ok).toBe(true);
    s.farm.ents.find(e => e.kind === 'compost').readyAt = 1;   // đã ủ xong
    s.troughs.chicken = 10;
    mutate?.(s);
  });
}
const nearOf = (page, id) => page.evaluate(async id => {
  const { mapOf } = await import('/state.js');
  const s = globalThis.__farm.state;
  if (s.scene !== 'farm') return 1e9;
  const at = mapOf(s).building(id).at;
  return Math.hypot(s.player.x - at.x, s.player.y - at.y);
}, id);

test('thu hoạch ngay ngưỡng thành thạo + trái khổng lồ: hai toast 🟡 riêng, có biểu tượng', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch, errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await NOPREF(context);
  await seedSave(context, harvestSave());
  await page.goto('/');
  await ready(page);
  await tapPlot(page, 0, touch, () => page.evaluate(() => !globalThis.__farm.state.plots[0].crop));
  const mastery = page.locator('#toasts .toast', { hasText: 'Thành thạo dâu tây lên cấp 3' }), giant = page.locator('#toasts .toast', { hasText: 'dâu tây khổng lồ' });
  await expect(mastery).toHaveCount(1);
  await expect(giant).toHaveCount(1);
  await expect(mastery.locator('canvas.toast-ico')).toHaveCount(1);
  await expect(giant.locator('canvas.toast-ico')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('tắt "thành thạo" trong cài đặt: không còn toast thành thạo, toast trái khổng lồ vẫn hiện', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await NOPREF(context);
  await seedSave(context, harvestSave());
  await page.goto('/');
  await ready(page);
  await page.locator('.bb-btn[data-panel="settings"]').click();
  for (const cat of ['mastery', 'giant', 'water', 'compost']) await expect(page.locator(`input[name="notify-${cat}"]`)).toBeChecked();
  await page.locator('input[name="notify-mastery"]').uncheck();
  expect(await page.evaluate(() => globalThis.__farm.state.notify)).toEqual({ mastery: false });
  await expect(page.locator('.chk.locked input')).toBeDisabled();
  await page.keyboard.press('Escape');
  await tapPlot(page, 0, touch, () => page.evaluate(() => !globalThis.__farm.state.plots[0].crop));
  await expect(page.locator('#toasts .toast', { hasText: 'khổng lồ' })).toHaveCount(1);
  expect(await page.evaluate(() => globalThis.__farm.state.mastery.dau.lv)).toBe(3);
  await page.waitForTimeout(600);
  await expect(page.locator('#toasts .toast', { hasText: 'Thành thạo' })).toHaveCount(0);
});

test('Việc cần làm: bồn cạn và hố ủ xong hiện hai dòng mới, chạm dòng thì nhân vật đi tới đúng chỗ', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await NOPREF(context);
  const save = waterSave(s => { const t = mapOf(s).spawn; Object.assign(s.player, { x: t.x, y: t.y }); });
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  await page.locator('#todo-btn').click();
  await expect(page.locator('.todo-row[data-kind="tank"]')).toContainText('Bồn nước sắp cạn');
  await expect(page.locator('.todo-row[data-kind="compost"]')).toContainText('Hố ủ phân đã xong');
  await page.screenshot({ path: `test-results/notify62-todo-${test.info().project.name}.png` });
  expect(await nearOf(page, 'tank')).toBeGreaterThan(40);
  await page.locator('.todo-row[data-kind="tank"]').click();
  await expect(page.locator('#panel-root')).toBeHidden();
  await expect.poll(() => nearOf(page, 'tank'), { timeout: 20_000 }).toBeLessThan(40);
  expect(await page.evaluate(() => globalThis.__farm.state.water.level)).toBeLessThan(TANK.low);
  expect(errors).toEqual([]);
});

test('đang ở trong nhà: chạm "hố ủ xong" thì ra vườn rồi đi tới hố ủ', async ({ page, context }) => {
  await NOPREF(context);
  await seedSave(context, waterSave(s => { enterScene(s, 'house'); }));
  await page.goto('/');
  await ready(page);
  expect(await page.evaluate(() => globalThis.__farm.state.scene)).toBe('house');
  await page.locator('#todo-btn').click();
  await page.locator('.todo-row[data-kind="compost"]').click();
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.scene), { timeout: 10_000 }).toBe('farm');
  await expect.poll(() => nearOf(page, 'compost'), { timeout: 30_000 }).toBeLessThan(40);
});

test('Sổ tay có các trang mới cho cây và nước, mở dần theo cấp', async ({ page, context }) => {
  await NOPREF(context);
  await seedSave(context, makeSave(s => { s.exp = 1e6; }));
  await page.goto('/');
  await ready(page);
  await page.locator('.bb-btn[data-panel="bag"]').click();
  await page.getByRole('button', { name: /Sổ tay hướng dẫn/ }).click();
  const NEW = ['Bốn mùa', 'Chất lượng ★', 'Thành thạo cây', 'Thời tiết', 'Nhà kính', 'Nước: giếng, bồn, tầm nước', 'Tự động hóa khối ruộng', 'Hố ủ phân'];
  for (const t of NEW) {
    await page.locator(`.guide-dot[title="${t}"]`).click();
    await expect(page.locator('.guide-page h3')).toHaveText(t);
    await expect(page.locator('.guide-page canvas.guide-art')).toBeVisible();
    if (t === 'Hố ủ phân') await page.screenshot({ path: `test-results/notify62-guide-${test.info().project.name}.png` });
  }
  // người chơi cấp 1 chưa thấy trang nào trong số này
  await page.keyboard.press('Escape');
  await page.evaluate(() => { globalThis.__farm.state.exp = 0; });
  await page.locator('.bb-btn[data-panel="bag"]').click();
  await page.getByRole('button', { name: /Sổ tay hướng dẫn/ }).click();
  for (const t of NEW) await expect(page.locator(`.guide-dot[title="${t}"]`)).toHaveCount(0);
});
