// Trộm NPC mới (issue 46): Tí Sún trộm trứng, chồn hương bắt con ngủ ngoài, hộp thoại chọn phạt.
// Chạy ở cả desktop 1280 lẫn điện thoại 360px.
import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { mapOf, roamOf } from '../public/state.js';
import { DAY_MS, NIGHT_FROM } from '../public/data.js';

const NIGHT = DAY_MS * NIGHT_FROM + 2000;   // vừa qua nửa đêm

// Vườn ban đêm, cấp cao, chó còn là chó con (chưa canh nhà) và đã chốt sẵn vụ trộm `kind` cho đêm nay.
// savedAt đặt về tương lai để loadGame không chạy bù (chạy bù sẽ "tiêu" mất vụ trộm, ADR 0004).
const nightSave = (kind, extra) => makeSave(s => {
  s.time = NIGHT; s.day = 1; s.weather = 'sun'; s.exp = 1e6; s.coins = 500;
  s.orders = []; s.nextOrderAt = 1e15;
  s.dog.nextPoop = 1e15;
  for (const a of s.animals) { a.hunger = 100; a.nextProduct = 1e15; }
  extra?.(s);
  s.raid = { day: 1, kind, at: s.time, done: false };
  s.savedAt = Date.now() + 5 * 60_000;
});

// 4 quả trứng nằm ngay cạnh chỗ người chơi đứng
const eggSave = nightSave('tisun', s => {
  s.animals = [];
  const m = mapOf(s);
  for (let i = 0; i < 4; i++) s.eggs.push({ id: s.nextId++, sp: 'ga', x: m.spawn.x + 12 + i * 10, y: m.spawn.y + 24, laidAt: 0, fertile: false, mom: null, dad: null });
});
// Một con gà mái đang ngủ ngoài chuồng
const straySave = nightSave('civet', s => {
  const t = roamOf(s).tiles.find(x => x.r > 2) ?? roamOf(s).tiles[0];
  const a = s.animals.find(x => x.type === 'ga' && x.stage === 'truong');
  Object.assign(a, { stray: true, tile: { c: t.c, r: t.r }, x: t.c * 16 + 8, y: t.r * 16 + 8 });
  s.animals = [a];
});

const tick = (page, ms) => page.evaluate(ms => import('/state.js').then(S => S.tick(globalThis.__farm.state, ms)), ms);
const threats = page => page.evaluate(() => (globalThis.__farm.state.threats ?? []).map(t => ({ kind: t.kind, state: t.state })));
// Đứng sát kẻ trộm để thanh hành động hiện ra (vị trí do world cập nhật mỗi khung hình)
const standByThief = page => page.evaluate(() => {
  const s = globalThis.__farm.state, t = s.threats.find(x => x.kind !== 'crow');
  if (!t) return false;
  s.player.x = t.x + 8; s.player.y = t.y + 4;
  return true;
});
async function open(page, context, save) {
  await seedSave(context, save);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
}
// Đợi kẻ trộm đi tới nơi rồi đứng sát bên: tua từng nhịp nhỏ cho world kịp diễn hoạt
async function waitThief(page, kind) {
  await expect.poll(async () => (await threats(page)).some(t => t.kind === kind), { timeout: 15_000 }).toBe(true);
  for (let i = 0; i < 40; i++) {
    await tick(page, 700);
    await page.waitForTimeout(90);
    if (await standByThief(page)) {
      const t = (await threats(page)).find(x => x.kind === kind);
      if (t?.state === 'eating') return;
    }
  }
  throw new Error(`${kind} không tới nơi`);
}

test('Tí Sún lẻn vào lấy trứng, bắt được thì chọn bắt đền xu', async ({ page, context }) => {
  await open(page, context, eggSave);
  await waitThief(page, 'tisun');
  expect(await page.evaluate(() => globalThis.__farm.state.eggs.length)).toBe(4);

  const coins0 = await page.evaluate(() => globalThis.__farm.state.coins);
  const act = page.getByRole('button', { name: /Bắt Tí Sún/ });
  await expect(act).toBeVisible();
  await act.click();

  // hộp thoại chọn phạt: bắt đền xu hay phạt làm thợ không công
  const box = page.locator('.dialog.punish');
  await expect(box).toBeVisible();
  await expect(box).toContainText('Phạt thế nào đây?');
  await expect(box.getByRole('button', { name: /Bắt đền/ })).toBeVisible();
  await expect(box.getByRole('button', { name: /thợ không công/ })).toBeVisible();
  await box.getByRole('button', { name: /Bắt đền/ }).click();
  await expect(box).toBeHidden();

  const after = await page.evaluate(() => ({ coins: globalThis.__farm.state.coins, eggs: globalThis.__farm.state.eggs.length, caught: globalThis.__farm.state.teoCaught }));
  expect(after.coins - coins0).toBeGreaterThanOrEqual(20);
  expect(after.coins - coins0).toBeLessThanOrEqual(60);
  expect(after.eggs).toBe(4);           // bắt kịp thì không mất quả nào
  expect(after.caught).toBe(0);         // Tí Sún không phải thằng Tèo
  expect(await threats(page)).toEqual([]);
});

test('bắt Tí Sún rồi phạt làm thợ không công', async ({ page, context }) => {
  await open(page, context, eggSave);
  await waitThief(page, 'tisun');
  const coins0 = await page.evaluate(() => globalThis.__farm.state.coins);
  await page.getByRole('button', { name: /Bắt Tí Sún/ }).click();
  const box = page.locator('.dialog.punish');
  await expect(box).toBeVisible();
  await box.getByRole('button', { name: /thợ không công/ }).click();
  await expect(box).toBeHidden();
  const st = await page.evaluate(() => ({ coins: globalThis.__farm.state.coins, chore: globalThis.__farm.state.chore?.day ?? null, week: globalThis.__farm.state.choreWeek }));
  expect(st.coins).toBe(coins0);        // phạt thợ thì không lấy xu
  expect(st.chore).toBe(2);             // sang ngày mai nó tới làm
  expect(st.week).toBe(0);
});

test('chồn hương rình con gà ngủ ngoài chuồng, đuổi được thì gà còn nguyên', async ({ page, context }) => {
  await open(page, context, straySave);
  await waitThief(page, 'civet');
  const act = page.getByRole('button', { name: /Đuổi chồn hương/ });
  await expect(act).toBeVisible();
  await act.click();
  await expect.poll(async () => (await threats(page)).length).toBe(0);
  expect(await page.evaluate(() => globalThis.__farm.state.animals.length)).toBe(1);
  await expect(page.locator('.dialog.punish')).toBeHidden();   // con thú thì không có hộp thoại phạt
});
