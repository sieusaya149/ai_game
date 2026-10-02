import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { makeSave, seedSave, installWarp, timeWarp } from './helpers.mjs';
import { stageStart, lifeEnd } from '../public/state.js';
import { SAVE_VERSION } from '../public/migrate.js';
import { AGING, DAY_MS } from '../public/data.js';

const MIN = 60_000;
const V2 = 'nongtrai-save-v2';
const fixture = name => JSON.parse(readFileSync(new URL(`../tests/fixtures/${name}.json`, import.meta.url), 'utf8'));
// Hình con vật đang dùng (đọc qua render.js của chính trang, không đổi gì trong game)
const spriteOf = (page, id) => page.evaluate(async id => {
  const { animalImg } = await import('/render.js');
  const a = globalThis.__farm.state.animals.find(x => x.id === id);
  return animalImg(a, 'left', 0).toDataURL();
}, id);

test('mở bản lưu v2 cũ: đủ con vật; tua giờ vườn qua mốc thì gà con thành gà nhỡ, đổi hình', async ({ page, context }) => {
  const old = fixture('v2-farm');
  old.savedAt = Date.now();
  const chickPos = old.animals.find(a => a.type === 'ga' && !a.adult);
  Object.assign(old.player, { x: chickPos.x, y: chickPos.y + 30 });   // đứng sát chuồng gà cho dễ thấy
  const json = JSON.stringify(old);
  await context.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch {} }, [V2, json]);
  // đã gợi ý tiết kiệm pin rồi: khỏi hiện hộp gợi ý giữa chừng
  await context.addInitScript(() => { try { if (!localStorage.getItem('nongtrai-pref')) localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {} });
  await installWarp(context);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await expect(page.locator('#creator')).toBeHidden();
  const s = await page.evaluate(() => { const st = globalThis.__farm.state; return { v: st.v, ids: st.animals.map(a => a.id), stages: st.animals.map(a => a.stage) }; });
  expect(s.v).toBe(SAVE_VERSION);
  expect(s.ids).toEqual(old.animals.map(a => a.id));
  expect(s.stages).toEqual(old.animals.map(a => a.adult ? 'truong' : 'non'));
  expect(await page.evaluate(k => localStorage.getItem(k), V2)).toBe(json);   // bản v2 còn nguyên

  const chick = old.animals.find(a => a.type === 'ga' && !a.adult).id;
  const before = await spriteOf(page, chick);
  await timeWarp(page, stageStart('ga', 'nho') + MIN);   // vắng 6 phút: gà con qua mốc 5 phút
  const st = await page.evaluate(id => globalThis.__farm.state.animals.find(a => a.id === id).stage, chick);
  expect(st).toBe('nho');
  expect(await spriteOf(page, chick)).not.toBe(before);
  expect(await page.evaluate(() => globalThis.__farm.state.animals.length)).toBe(old.animals.length);

  await page.evaluate(ms => { globalThis.__farm.state.time = ms; }, DAY_MS * 0.9);   // ban đêm gà về chuồng (ban ngày thả rông chạy lung tung)
  await page.waitForTimeout(1500);
  // chạm vào con gà: thấy giới tính và giai đoạn trong tên mục tiêu (gà trong chuồng chạy lung tung nên trúng con nào cũng được)
  const touch = test.info().project.name === 'mobile';
  await expect(async () => {
    const pt = await page.evaluate(id => {
      const f = globalThis.__farm, a = f.state.animals.find(x => x.id === id), r = document.getElementById('game-canvas').getBoundingClientRect();
      return { x: (a.x * f.scale - f.view.camX) / f.dpr + r.left, y: ((a.y - 4) * f.scale - f.view.camY) / f.dpr + r.top };
    }, chick);
    if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
    await expect(page.locator('#target-name')).toHaveText(/^Gà [♀♂] · (Nhỡ|Trưởng thành) (❤️)+$/, { timeout: 1500 });
  }).toPass({ timeout: 15_000 });
});

test('con gà sắp già thì có thông báo 🟡; con hết tuổi già thì ra đi', async ({ page, context }) => {
  const save = makeSave(s => {
    const [hen, chick] = s.animals;
    hen.age = stageStart('ga', 'gia') - AGING.warnMs - 3000;   // 3 giây nữa là tới lúc báo
    Object.assign(chick, { stage: 'gia', age: lifeEnd('ga') - 4000 });   // 4 giây nữa là ra đi
  });
  save.savedAt = Date.now();
  await seedSave(context, save);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await expect(page.locator('#toasts .toast', { hasText: 'sắp già' })).toHaveText(/1 con gà sắp già/, { timeout: 10_000 });
  await expect(page.locator('#toasts .toast', { hasText: 'ra đi' })).toHaveText(/1 con gà đã già và ra đi/, { timeout: 10_000 });
  expect(await page.evaluate(() => globalThis.__farm.state.animals.length)).toBe(1);
});
