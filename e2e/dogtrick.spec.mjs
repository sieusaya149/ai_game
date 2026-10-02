// Dạy lệnh cho chó bằng minigame và ra lệnh Lùa (issue 45), ở cả desktop lẫn 360px.
import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { buyStrip, stageStart } from '../public/state.js';
import { DAY_MS, FREE, TRICKS } from '../public/data.js';

const NOON = DAY_MS * 0.3;
// Chó nhỡ, no, vui vừa phải (dưới ngưỡng học nhanh) và đầy bánh thưởng
const pupSave = makeSave(s => {
  s.time = NOON; s.weather = 'sun'; s.coins = 1e6;
  Object.assign(s.dog, { stage: 'nho', age: stageStart('cho', 'nho'), hunger: 100, happy: 55, nextPoop: 1e15 });
  s.inv.treat = 10;
  for (const a of s.animals) { a.hunger = 100; a.nextProduct = 1e15; }
});
// 13h, đàn gà thả rông, chó trưởng thành đã thuộc Ngồi + Lùa nhưng chưa đủ vui để tự lùa
const herdSave = makeSave(s => {
  s.time = NOON; s.weather = 'sun'; s.exp = 1e9; s.coins = 1e9;
  for (let i = 0; i < 4; i++) { buyStrip(s, 'E'); buyStrip(s, 'W'); }
  Object.assign(s.dog, { stage: 'truong', age: stageStart('cho', 'truong'), hunger: 100, happy: 55, nextPoop: 1e15, tricks: { sit: 2, herd: 5 } });
  const tpl = s.animals.find(a => a.type === 'ga' && a.stage === 'truong');
  for (let i = 0; i < 7; i++) s.animals.push({ ...structuredClone(tpl), id: s.nextId++, sex: 'f', pen: tpl.pen, tile: null, nextProduct: 1e15 });
  for (const a of s.animals) { a.hunger = 100; a.nextProduct = 1e15; }
});

const tick = (page, ms) => page.evaluate(async ms => { const S = await import('/state.js'); S.tick(globalThis.__farm.state, ms); }, ms);
// Sang ngày game mới (mỗi ngày chỉ dạy được một buổi)
const nextDay = async page => { await page.evaluate(ms => { globalThis.__farm.state.time += ms; }, DAY_MS); await tick(page, 200); };
// Đứng sát chó để thanh hành động hiện ra
const standByDog = page => page.evaluate(() => {
  const s = globalThis.__farm.state;
  s.player.x = s.dog.x + 8; s.player.y = s.dog.y + 4;
});
const dogState = page => page.evaluate(() => {
  const d = globalThis.__farm.state.dog;
  return { stage: d.stage, tricks: { ...d.tricks }, cmd: d.cmd?.id ?? null, treat: globalThis.__farm.state.inv.treat ?? 0 };
});

// Chơi một lượt minigame: đợi kim chạy vào giữa vạch xanh rồi bấm Khen (đọc hình học DOM, không dùng hook trong game)
const praise = page => page.evaluate(() => new Promise((resolve, reject) => {
  const btn = document.getElementById('train-hit'), m = document.getElementById('train-mark'), z = document.getElementById('train-zone');
  if (!btn || !m || !z) { reject(new Error('chưa mở minigame')); return; }
  let n = 0;
  const step = () => {
    if (++n > 600) { reject(new Error('kim không vào vạch')); return; }
    const a = m.getBoundingClientRect(), b = z.getBoundingClientRect(), c = a.left + a.width / 2;
    if (c > b.left + b.width * 0.3 && c < b.right - b.width * 0.3) { btn.click(); resolve(true); return; }
    requestAnimationFrame(step);
  };
  step();
}));

// Một buổi dạy trọn vẹn: mở bảng, bấm Dạy, khen đủ số lượt
async function trainOnce(page, trick) {
  await standByDog(page);
  await expect(page.getByRole('button', { name: /Dạy lệnh/ })).toBeVisible();
  await page.getByRole('button', { name: /Dạy lệnh/ }).click();
  await expect(page.locator('#panel-root .sheet')).toBeVisible();
  await page.locator(`button[data-train="${trick}"]`).click();
  await expect(page.locator('.dialog.train')).toBeVisible();
  for (let i = 0; i < 3; i++) await praise(page);
  await expect(page.locator('.dialog.train')).toBeHidden();
}

test('dạy chó lệnh Ngồi qua hai ngày game rồi ra lệnh được', async ({ page, context }) => {
  await seedSave(context, pupSave);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);

  // buổi 1
  await trainOnce(page, 'sit');
  let d = await dogState(page);
  expect(d.tricks.sit).toBe(1);
  expect(d.treat).toBe(9);
  // trong ngày không dạy thêm buổi nữa
  await expect(page.locator('button[data-train="sit"]')).toBeDisabled();

  // buổi 2 ở ngày game sau: học xong lệnh Ngồi
  await page.keyboard.press('Escape');
  await expect(page.locator('#panel-root .sheet')).toBeHidden();
  await nextDay(page);
  await trainOnce(page, 'sit');
  d = await dogState(page);
  expect(d.tricks.sit).toBe(TRICKS.sit.sessions);
  expect(d.treat).toBe(8);

  // học xong thì ra lệnh Ngồi được
  await page.keyboard.press('Escape');
  await expect(page.locator('#panel-root .sheet')).toBeHidden();
  await standByDog(page);
  const cmd = page.getByRole('button', { name: /Lệnh: Ngồi/ });
  await expect(cmd).toBeVisible();
  await cmd.click();
  await expect.poll(async () => (await dogState(page)).cmd).toBe('sit');
});

test('18h gọi chó lùa đàn gà lạc về chuồng', async ({ page, context }) => {
  await seedSave(context, herdSave);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);

  // ban ngày cả đàn ra vườn, rồi qua 18h để có con lạc
  await tick(page, 3 * 60_000);
  await page.evaluate(ms => { globalThis.__farm.state.time = ms; }, DAY_MS * FREE.duskAt - 1000);
  await tick(page, 3000);
  const lost = await page.evaluate(async () => (await import('/state.js')).strays(globalThis.__farm.state).length);
  expect(lost).toBeGreaterThanOrEqual(1);

  // gọi chó lùa: cả đàn về chuồng trong khoảng 20 giây giờ game
  await standByDog(page);
  const cmd = page.getByRole('button', { name: /Lệnh: Lùa/ });
  await expect(cmd).toBeVisible();
  await cmd.click();
  await expect.poll(async () => (await dogState(page)).cmd).toBe('herd');
  for (let i = 0; i < 12; i++) await tick(page, 2000);
  await expect.poll(async () => page.evaluate(async () => (await import('/state.js')).strays(globalThis.__farm.state).length)).toBe(0);
  expect(await page.evaluate(() => globalThis.__farm.state.animals.filter(a => a.tile).length)).toBe(0);
});
