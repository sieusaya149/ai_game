import { test, expect } from '@playwright/test';
import { makeSave, seedSave, installWarp, timeWarp } from './helpers.mjs';
import { CLUTTER, HUSBANDRY, animalPrice } from '../public/data.js';
import { bumpLayout } from '../public/farm.js';
import { stageStart, buyStrip, placeEntity, canPlace, mapOf } from '../public/state.js';

const MIN = 60_000;
const open = async (page, context, save) => {
  await seedSave(context, save);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state?.animals?.length);
};
const press = (page, touch, p) => (touch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));
// Điểm trên màn hình (px CSS) của một chỗ trong thế giới
const screenOf = (page, x, y) => page.evaluate(([x, y]) => {
  const f = globalThis.__farm, r = document.getElementById('game-canvas').getBoundingClientRect();
  return { x: (x * f.scale - f.view.camX) / f.dpr + r.left, y: (y * f.scale - f.view.camY) / f.dpr + r.top };
}, [x, y]);

test('soi trứng thấy có phôi → nhặt → bỏ vào ổ ấp → gà con nở, có tên theo mẹ', async ({ page, context }) => {
  const touch = test.info().project.name === 'mobile';
  const save = makeSave(s => {
    const [hen, roo] = s.animals;
    Object.assign(hen, { name: 'Bông', sex: 'f', stage: 'truong', age: stageStart('ga', 'truong'), nextProduct: s.time + 1e12 });
    Object.assign(roo, { name: 'Cu', sex: 'm', stage: 'truong', age: stageStart('ga', 'truong'), nextProduct: s.time + 1e12 });
    const a = mapOf(s).pens.chicken.area;
    s.eggs.push({ id: 9001, x: a.x + a.w / 2, y: a.y + a.h - 10, laidAt: s.time, fertile: true, mom: { id: hen.id, name: 'Bông' }, dad: { id: roo.id, name: 'Cu' } });
    s.player.x = a.x + a.w / 2; s.player.y = a.y + a.h + 6;
    s.troughs.chicken = 20;
  });
  await installWarp(context);
  await open(page, context, save);
  const egg = () => page.evaluate(() => globalThis.__farm.state.eggs.find(e => e.id === 9001));
  // chạm vào trứng: hành động chính là Soi trứng
  await expect(async () => {
    const e = await egg();
    await press(page, touch, await screenOf(page, e.x, e.y - 2));
    await expect(page.locator('#target-name')).toHaveText(/trứng/i, { timeout: 1500 });
  }).toPass({ timeout: 15_000, intervals: [600] });
  await expect(page.locator('#main-action .ma-label')).toHaveText('Soi trứng');
  await page.locator('#main-action').click();
  await expect.poll(async () => (await egg())?.candled, { timeout: 8000 }).toBe(true);
  await expect(page.locator('#target-name')).toHaveText(/Trứng có phôi/);
  await expect(page.locator('#main-action .ma-label')).toHaveText(/Nhặt trứng có phôi/);
  await page.locator('#main-action').click();
  await expect.poll(() => page.evaluate(() => { const s = globalThis.__farm.state; return (s.basket.trung_phoi || 0) + (s.inv.trung_phoi || 0); }), { timeout: 8000 }).toBe(1);
  // ổ ấp
  const nest = await page.evaluate(() => globalThis.__farm.world && import('/state.js').then(S => S.mapOf(globalThis.__farm.state).building('coop').at));
  await page.evaluate(n => { Object.assign(globalThis.__farm.state.player, { x: n.x, y: n.y + 8 }); }, nest);   // đứng cạnh ổ ấp
  await expect(page.locator('#target-name')).toHaveText(/Ổ ấp/, { timeout: 8000 });
  await page.locator('#main-action').click();
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.nest.egg), { timeout: 10_000 }).toBe(true);
  // tua tới hết thời gian ấp (30 phút): trứng nở
  await timeWarp(page, HUSBANDRY.nestHatchMs + MIN);
  const chick = await page.evaluate(() => globalThis.__farm.state.animals.find(a => a.stage === 'non' || a.stage === 'nho'));
  expect(chick.name).toBe('Bông con');
  expect(chick.mom.name).toBe('Bông'); expect(chick.dad.name).toBe('Cu');
  expect(await page.evaluate(() => globalThis.__farm.state.nest.egg)).toBe(false);
});

// Vườn có chuồng heo cấp 2; nái Bông sắp đẻ, đực Ủn đứng cạnh
function pigSave() {
  return makeSave(s => {
    s.coins = 1e9; s.exp = 1e9;
    for (let i = 0; i < 20; i++) for (const d of ['N', 'S', 'E', 'W']) buyStrip(s, d);
    s.farm.ents = s.farm.ents.filter(e => e.kind !== 'tree' && !CLUTTER[e.kind]); bumpLayout(s);
    const o = s.farm.owned;
    let id;
    outer: for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (canPlace(s, { kind: 'pen', pen: 'pig' }, c, r).ok) { id = placeEntity(s, { kind: 'pen', pen: 'pig' }, c, r).id; break outer; }
    s.farm.ents.find(e => e.id === id).lv = 2; bumpLayout(s);
    s.animals = [];
    const area = mapOf(s).pens.pig.area, mk = (name, sex, x, extra) => ({ id: s.nextId++, type: 'heo', name, sex, stage: 'truong', age: stageStart('heo', 'truong'), hunger: 100, happy: 100, sick: 0, bond: 2, bondXp: 0, weight: 100, nextProduct: 0, ready: false, pregnant: false, dueAt: 0, pen: id, x, y: area.y + area.h / 2, ...extra });
    const boar = mk('Ủn', 'm', area.x + area.w / 2 + 10);
    const sow = mk('Bông', 'f', area.x + area.w / 2 - 10, { pregnant: true, dueAt: s.time + 4000, mate: { id: boar.id, name: 'Ủn' } });
    s.animals.push(boar, sow);
    s.troughs.pig = 20;
    s.player.x = area.x + area.w + 40; s.player.y = area.y + area.h / 2;
    s.savedAt = Date.now();
  });
}

test('heo nái bầu đẻ heo con có tên → cây phả hệ trong sổ tay → đổi tên', async ({ page, context }) => {
  await open(page, context, pigSave());
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.animals.filter(a => a.mom).length), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  const kid = await page.evaluate(() => globalThis.__farm.state.animals.find(a => a.mom));
  expect(kid.name).toBe('Bông con'); expect(kid.mom.name).toBe('Bông'); expect(kid.dad.name).toBe('Ủn');
  // Túi đồ → Sổ tay → Phả hệ vật nuôi
  await page.locator('.bb-btn[data-panel="bag"]').click();
  await page.locator('.guide-open').first().click();
  await page.locator('#open-pedigree').click();
  const row = page.locator(`.ped-row[data-id="${kid.id}"]`);
  await expect(row.locator('.ped-name')).toContainText('Bông con');
  await expect(row.locator('.ped-kin')).toHaveText('Mẹ: Bông · Cha: Ủn');
  await expect(page.locator('.ped-row', { hasText: 'Ủn ♂' }).locator('.ped-kids')).toContainText('Bông con');
  await expect(page.locator('.ped-row', { hasText: 'Bông ♀' }).first().locator('.ped-kids')).toContainText('Bông con');
  // đổi tên: tên rỗng bị từ chối, tên hợp lệ được lưu
  await row.getByRole('button', { name: /Đổi tên/ }).click();
  await page.locator('.name-input').fill('');
  await page.locator('#name-ok').click();
  await expect(page.locator('.dialog-err')).toHaveText(/không được để trống/);
  await page.locator('.name-input').fill('x'.repeat(40));
  await page.locator('#name-ok').click();
  await expect(page.locator('.dialog-err')).toHaveText(/dài quá/);
  await page.locator('.name-input').fill('Ỉn Mập');
  await page.locator('#name-ok').click();
  await expect(page.locator('.name-input')).toHaveCount(0);
  await expect(row.locator('.ped-name')).toContainText('Ỉn Mập');
  expect(await page.evaluate(id => globalThis.__farm.state.animals.find(a => a.id === id).name, kid.id)).toBe('Ỉn Mập');
});

test('chợ: mua vật nuôi chọn đực hay cái, con cái đắt hơn 30%', async ({ page, context }) => {
  await open(page, context, makeSave(s => { s.exp = 1e4; }));
  await page.evaluate(async () => { (await import('/ui.js')).openPanel('market'); });
  await page.locator('.tab', { hasText: 'Vật nuôi' }).click();
  const first = page.locator('.row').first();
  await expect(first.locator('.sexopt')).toHaveCount(2);
  await expect(first.locator('.sexopt').nth(0)).toContainText(String(animalPrice('ga', 'm')));
  await expect(first.locator('.sexopt').nth(1)).toContainText(String(animalPrice('ga', 'f')));
  await expect(first.locator('[data-sex="m"]')).toContainText('đực');
  await expect(first.locator('[data-sex="f"]')).toContainText('cái');
});
