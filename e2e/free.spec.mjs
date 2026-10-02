import { test, expect } from '@playwright/test';
import { makeSave, seedSave, tilePoint } from './helpers.mjs';
import { DAY_MS } from '../public/data.js';

// Ban ngày (8h24, còn lâu mới tới 18h về chuồng), đàn gà trưởng thành trong chuồng; ruộng 9 ô có cây giữa chừng, bị sâu (sâu không tự thành bệnh).
const flock = (n, extra) => makeSave(s => {
  s.time = DAY_MS * 0.1; s.exp = 400; s.coins = 500;
  for (const p of s.plots) { p.soil = 'tilled'; p.water = 100; p.crop = { id: 'cai', progress: 0.5, planted: 0, bugs: true, bugSince: 1e12, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 }; }
  const tpl = s.animals.find(a => a.type === 'ga' && a.stage === 'truong');
  for (let i = 0; i < n; i++) s.animals.push({ ...structuredClone(tpl), id: s.nextId++, sex: 'f', pen: tpl.pen, tile: null, nextProduct: 1e15 });
  s.player.x = 40 * 16 + 8; s.player.y = 20 * 16 + 8;
  extra?.(s);
});
async function open(page, context, s) {
  await seedSave(context, s);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
}
// Cho vườn chạy `ms` bằng đúng hàm tick công khai của luật chơi
const tick = (page, ms) => page.evaluate(async ms => { const S = await import('/state.js'); S.tick(globalThis.__farm.state, ms); }, ms);

test('ban ngày gà đi khắp trại, vào ruộng mổ sâu', async ({ page, context }) => {
  await open(page, context, flock(25));
  await tick(page, 5 * 60_000);
  const st = await page.evaluate(() => {
    const s = globalThis.__farm.state, free = s.animals.filter(a => a.tile);
    return { free: free.length, pecks: s.stats.pecks || 0, bugs: s.plots.filter(p => p.crop?.bugs).length, dist: free.reduce((n, a) => n + Math.hypot(a.tile.c * 16 + 8 - a.x, a.tile.r * 16 + 8 - a.y), 0) };
  });
  expect(st.free).toBeGreaterThan(20);
  expect(st.pecks).toBeGreaterThan(0);
  expect(st.bugs).toBeLessThan(9);
  await page.waitForTimeout(3000);   // world.js diễn hoạt gà đi tới ô luật đã chọn
  const dist2 = await page.evaluate(() => globalThis.__farm.state.animals.filter(a => a.tile).reduce((n, a) => n + Math.hypot(a.tile.c * 16 + 8 - a.x, a.tile.r * 16 + 8 - a.y), 0));
  expect(dist2).toBeLessThan(st.dist);
  await page.screenshot({ path: test.info().outputPath('free-day.png') });
});

test('mua hàng rào thấp, rào quanh ruộng: gà không vào nữa', async ({ page, context }, testInfo) => {
  await open(page, context, flock(25, s => { s.time = DAY_MS * 0.1; }));
  // chợ: mua đủ hàng rào qua luật mua bán
  const ring = await page.evaluate(async () => {
    const S = await import('/state.js'), s = globalThis.__farm.state, f = s.farm.ents.find(e => e.kind === 'field'), out = [];
    for (let c = f.c - 1; c <= f.c + 3; c++) for (let r = f.r - 1; r <= f.r + 3; r++) {
      const inside = c >= f.c && c <= f.c + 2 && r >= f.r && r <= f.r + 2, corner = (c === f.c - 1 || c === f.c + 3) && (r === f.r - 1 || r === f.r + 3);
      if (!inside && !corner) out.push([c, r]);
    }
    const b = S.buy(s, 'deco_lowfence', out.length); if (!b.ok) throw new Error(b.msg);
    return out;
  });
  expect(ring.length).toBe(12);
  // vào chế độ xây dựng: thấy hàng rào trong tab Trang trí, đặt bằng cách chạm ô
  await page.locator('#bb-build').click();
  await expect(page.locator('#buildbar')).toBeVisible();
  await page.locator('.bt-tab', { hasText: 'Trang trí' }).click();
  await expect(page.locator('.bt-card', { hasText: 'Hàng rào thấp' })).toBeEnabled();
  await page.locator('#build-done').click();
  await page.evaluate(async ring => {
    const S = await import('/state.js'), s = globalThis.__farm.state;
    for (const [c, r] of ring) { const x = S.placeEntity(s, { kind: 'deco', item: 'deco_lowfence' }, c, r); if (!x.ok) throw new Error(x.msg); }
  }, ring);
  await tick(page, 5 * 60_000);
  const st = await page.evaluate(() => {
    const s = globalThis.__farm.state, f = s.farm.ents.find(e => e.kind === 'field');
    return { pecks: s.stats.pecks || 0, bugs: s.plots.filter(p => p.crop?.bugs).length, inField: s.animals.filter(a => a.tile && a.tile.c >= f.c && a.tile.c < f.c + 3 && a.tile.r >= f.r && a.tile.r < f.r + 3).length, free: s.animals.filter(a => a.tile).length };
  });
  expect(st.free).toBeGreaterThan(20);
  expect(st).toMatchObject({ pecks: 0, inField: 0, bugs: 9 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: testInfo.outputPath('free-fence.png') });
});

test('đi tìm và nhặt trứng trong bụi', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  await open(page, context, flock(0, s => { for (const a of s.animals) a.nextProduct = 0; }));
  await tick(page, 90_000);
  const egg = await page.evaluate(() => { const e = globalThis.__farm.state.eggs.find(e => e.tile); return e && { id: e.id, ...e.tile }; });
  expect(egg).toBeTruthy();
  // đứng gần ổ trứng rồi chạm vào nó
  await page.evaluate(e => { const p = globalThis.__farm.state.player; p.x = (e.c + 2) * 16 + 8; p.y = e.r * 16 + 8; }, egg);
  await page.waitForTimeout(500);
  await page.screenshot({ path: testInfo.outputPath('free-egg.png') });
  // trứng nhặt về: trứng thường hoặc trứng có phôi (lát 36: chạm lần đầu là soi trứng, lần sau mới nhặt)
  const got = () => page.evaluate(() => { const b = globalThis.__farm.state.basket; return (b.trung || 0) + (b.trung_phoi || 0); });
  const before = await got();
  await expect(async () => {
    const pt = await tilePoint(page, egg.c, egg.r);   // tính lại mỗi lần: camera đi theo người chơi
    if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
    expect(await got()).toBeGreaterThan(before);
  }).toPass({ timeout: 15_000, intervals: [1500] });
  expect(await page.evaluate(id => globalThis.__farm.state.eggs.some(e => e.id === id), egg.id)).toBe(false);
});
