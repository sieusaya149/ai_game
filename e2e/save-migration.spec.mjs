import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const V1 = 'nongtrai-save-v1';
const fixture = name => JSON.parse(readFileSync(new URL(`../tests/fixtures/${name}.json`, import.meta.url), 'utf8'));

test('người chơi cũ mở game: vườn v1 hiện lại đủ, bản v1 vẫn còn nguyên', async ({ page, context }) => {
  const old = fixture('v1-mid');
  old.savedAt = Date.now();
  const json = JSON.stringify(old);
  await context.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch {} }, [V1, json]);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);

  await expect(page.locator('#creator')).toBeHidden();
  await expect(page.locator('#hud-name')).toHaveText(old.name);
  await expect(page.locator('#hud-coins-n')).toHaveText(/^\d/);
  const s = await page.evaluate(() => {
    const st = globalThis.__farm.state;
    return { v: st.v, coins: st.coins, p0: st.plots[0].crop?.progress, unlocked: st.plots.filter(p => p.unlocked).length, animals: st.animals.length };
  });
  expect(s.v).toBe(3);
  expect(Math.abs(s.coins - old.coins)).toBeLessThan(300);   // game có thể tự tiêu chút ít (thức ăn...) ngay khi chạy
  expect(s.p0).toBeGreaterThanOrEqual(old.plots[0].crop.progress);
  expect(s.unlocked).toBe(old.plots.filter(p => p.unlocked).length);
  expect(s.animals).toBe(old.animals.length);

  // tải lại: vẫn là vườn đó, bản v1 không bị đụng tới
  await page.reload();
  await page.waitForFunction(() => globalThis.__farm?.state);
  await expect(page.locator('#hud-name')).toHaveText(old.name);
  expect(await page.evaluate(k => localStorage.getItem(k), V1)).toBe(json);
});

test('bản lưu v1 hỏng: vẫn vào được màn tạo nhân vật, bản cũ giữ nguyên', async ({ page, context }) => {
  const bad = '{"v":1,"plots":"hỏng"';
  await context.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch {} }, [V1, bad]);
  await page.goto('/');
  await expect(page.locator('#creator')).toBeVisible();
  expect(await page.evaluate(k => localStorage.getItem(k), V1)).toBe(bad);
});
