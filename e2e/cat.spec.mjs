// Mèo bắt chuột (issue 44). Dựng bằng bản lưu ghi sẵn, không có hook test nào trong game (ADR 0008).
import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { mapOf, roamOf, placeEntity, canPlace, upgradePen, buyCat, stageStart } from '../public/state.js';
import { DAY_MS, CAT } from '../public/data.js';

const TS = 16;

// Ô trống trong đất để đặt nhà mèo
const freeTile = (s, what) => {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (canPlace(s, what, c, r).ok) return { c, r };
  throw new Error('không còn chỗ trống');
};
// Vườn đã qua bảo hộ người mới, không con vật, không đơn hàng, có `houses` nhà mèo cấp 3 và `n` con mèo trưởng thành
const base = (n, houses, mutate) => makeSave(s => {
  s.coins = 1e7; s.exp = 1e6; s.animals = []; s.inv = {}; s.orders = []; s.nextOrderAt = 1e15;
  s.time = DAY_MS * 0.1;   // 8h sáng: chợ mở để mua mèo
  s.duskDay = s.day;
  for (let i = 0; i < houses; i++) {
    const t = freeTile(s, { kind: 'cathouse' }), r = placeEntity(s, { kind: 'cathouse' }, t.c, t.r);
    if (!r.ok) throw new Error(r.msg);
    const e = s.farm.ents.at(-1);
    upgradePen(s, e.id); upgradePen(s, e.id);
  }
  for (let i = 0; i < n; i++) {
    const r = buyCat(s, i % 2 ? 'm' : 'f');
    if (!r.ok) throw new Error(r.msg);
    Object.assign(s.cats.at(-1), { stage: 'truong', age: stageStart('meo', 'truong'), name: 'Mèo ' + (i + 1) });
  }
  Object.assign(s.player, mapOf(s).spawn);
  mutate?.(s);
});
// Ô thả rông gần chỗ sinh nhất (chắc chắn đi được)
const nearTiles = s => {
  const sp = mapOf(s).spawn;
  return [...roamOf(s).tiles].sort((a, b) => Math.hypot(a.c * TS - sp.x, a.r * TS - sp.y) - Math.hypot(b.c * TS - sp.x, b.r * TS - sp.y));
};
const putRat = (s, t) => s.preds.push({ id: s.nextId++, kind: 'rat', state: 'hunt', since: s.time, warned: false, strikeAt: s.time + 1e9,
  tile: { c: t.c, r: t.r }, x: t.c * TS + 8, y: t.r * TS + 8, tx: t.c * TS + 8, ty: t.r * TS + 8, tileAt: s.time + 1e9, target: null });
const placeCat = (c, t) => Object.assign(c, { tile: { c: t.c, r: t.r }, x: t.c * TS + 8, y: t.r * TS + 8, tx: t.c * TS + 8, ty: t.r * TS + 8 });

const open = async (page, context, save) => {
  await seedSave(context, save);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
};
const cats = page => page.evaluate(() => {
  const s = globalThis.__farm.state;
  return { list: s.cats.map(c => ({ id: c.id, x: c.x, y: c.y, sun: c.sun, sleep: c.sleep, scene: c.scene, trophy: !!c.trophy, happy: c.happy, bond: c.bond, bondXp: c.bondXp })),
    rats: s.stats.rats || 0, preds: s.preds.filter(p => p.kind === 'rat').length, player: { x: s.player.x, y: s.player.y } };
});
async function tapAt(page, touch, x, y) {
  const pt = await page.evaluate(([wx, wy]) => {
    const f = globalThis.__farm, r = document.getElementById('game-canvas').getBoundingClientRect();
    return { x: (wx * f.scale - f.view.camX) / f.dpr + r.left, y: (wy * f.scale - f.view.camY) / f.dpr + r.top };
  }, [x, y]);
  if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
}

test('chợ: chưa có nhà mèo thì không mua được mèo', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page, context, base(0, 0));
  await page.evaluate(async () => { (await import('/ui.js')).openPanel('market'); });
  await page.locator('.tab', { hasText: 'Vật nuôi' }).click();
  const row = page.locator('.row', { hasText: 'Mèo con' });
  await expect(row).toContainText('thú cưng bắt chuột');
  await expect(row.locator('[data-sex="f"]')).toHaveText('Chưa có nhà mèo');
  await expect(row.locator('[data-sex="f"]')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('chợ: có nhà mèo thì mua được mèo con, mèo ra vườn', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page, context, base(0, 1));
  await page.evaluate(async () => { (await import('/ui.js')).openPanel('market'); });
  await page.locator('.tab', { hasText: 'Vật nuôi' }).click();
  await page.locator('.row', { hasText: 'Mèo con' }).locator('[data-sex="f"]').click();
  await expect.poll(async () => (await cats(page)).list.length).toBe(1);
  expect(errors).toEqual([]);
});

test('mèo đói vừa đuổi bắt chuột rồi mang chiến lợi phẩm tới khoe, chạm để khen', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // 6 con mèo đói vừa phải, 6 con chuột đứng yên quanh chỗ người chơi; vườn chạy nhanh ×20 cho tới lúc có con vồ trúng
  const save = base(6, 2, s => {
    const tiles = nearTiles(s);
    s.cats.forEach((c, i) => { placeCat(c, tiles[10 + i * 2] ?? tiles.at(-1)); c.hunger = 70; c.happy = 60; });
    for (let i = 0; i < 6; i++) putRat(s, tiles[2 + i]);
    s.speed = 20;
  });
  await open(page, context, save);
  const before = await cats(page);
  // có con vồ trúng thì trả vườn về tốc độ thường ngay trong khung hình đó, để kịp xem màn khoe
  await page.waitForFunction(() => {
    const s = globalThis.__farm.state;
    if (!s.cats.some(c => c.trophy)) return false;
    s.speed = 1;
    return true;
  }, null, { timeout: 60_000, polling: 'raf' });
  const got = await cats(page);
  expect(got.rats).toBeGreaterThan(0);
  expect(got.preds).toBeLessThan(6 + 8);
  // mèo đã chạy đi đuổi (không đứng yên chỗ cũ)
  expect(got.list.some(c => { const b = before.list.find(x => x.id === c.id); return Math.hypot(c.x - b.x, c.y - b.y) > 4; })).toBe(true);
  const hunter = got.list.find(c => c.trophy);
  // ngậm chuột chạy tới đứng cạnh người chơi để khoe
  await expect.poll(async () => {
    const st = await cats(page), c = st.list.find(x => x.id === hunter.id);
    return c?.trophy ? Math.round(Math.hypot(c.x - st.player.x, c.y - st.player.y)) : -1;
  }, { timeout: 15_000, intervals: [200] }).toBeLessThan(20);
  await page.screenshot({ path: testInfo.outputPath('cat-trophy.png') });
  // chạm vào mèo: khen là hành động chính → vui hơn, thân hơn, khoe xong
  const was = got.list.find(c => c.id === hunter.id);
  const nm = await page.evaluate(id => globalThis.__farm.state.cats.find(c => c.id === id).name, hunter.id);
  await expect(async () => {
    const c = (await cats(page)).list.find(x => x.id === hunter.id);
    // 360px: dãy nút phụ của mục tiêu có thể nằm đè lên con mèo, chạm vào đó là bấm nhầm nút (Cho ăn). Khi đó bấm nút chính
    const covered = await page.evaluate(([wx, wy]) => {
      const f = globalThis.__farm, r = document.getElementById('game-canvas').getBoundingClientRect();
      return document.elementFromPoint((wx * f.scale - f.view.camX) / f.dpr + r.left, (wy * f.scale - f.view.camY) / f.dpr + r.top)?.id !== 'game-canvas';
    }, [c.x, c.y - 4]);
    const main = page.locator('#main-action'), label = (await main.isVisible()) ? await main.textContent() : '';
    if (c.trophy && covered && /Khen/.test(label) && label.includes(nm)) await main.click();
    else if (c.trophy && !covered) await tapAt(page, touch, c.x, c.y - 4);
    await page.waitForTimeout(400);
    expect((await cats(page)).list.find(x => x.id === hunter.id).trophy).toBe(false);
  }).toPass({ timeout: 12_000, intervals: [300] });
  const after = (await cats(page)).list.find(x => x.id === hunter.id);
  expect(after.bondXp + after.bond * 100).toBeGreaterThan(was.bondXp + was.bond * 100);
  expect(errors).toEqual([]);
});

test('mèo no quá thì nằm phơi nắng, không săn', async ({ page, context }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const save = base(1, 1, s => {
    const tiles = nearTiles(s), c = s.cats[0];
    placeCat(c, tiles[6]);
    Object.assign(c, { hunger: 100, huntAt: s.time });   // tới lượt rình ngay mà vẫn kệ
    for (let i = 0; i < 4; i++) putRat(s, tiles[1 + i]);
  });
  await open(page, context, save);
  const before = (await cats(page)).list[0];
  await page.waitForTimeout(5000);
  const st = await cats(page), c = st.list[0];
  expect(c.sun).toBe(true);
  expect(st.rats).toBe(0);
  expect(Math.hypot(c.x - before.x, c.y - before.y)).toBeLessThan(1);   // nằm yên một chỗ
  await page.screenshot({ path: testInfo.outputPath('cat-sun.png') });
  expect(errors).toEqual([]);
});

test('tối mèo đi về cửa mèo trên nhà rồi vào nhà ngủ', async ({ page, context }, testInfo) => {
  test.setTimeout(60_000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const save = base(1, 1, s => {
    placeCat(s.cats[0], nearTiles(s)[8]);
    s.cats[0].hunger = 60;
    s.time = DAY_MS * 0.745;   // còn vài giây là tối
  });
  const door = mapOf(save).catDoor;
  await open(page, context, save);
  // mèo đi tới cửa mèo (đứng sát cửa) trước khi biến vào nhà
  let near = Infinity;
  await expect.poll(async () => {
    const c = (await cats(page)).list[0];
    if (c.scene === 'farm') near = Math.min(near, Math.hypot(c.x - door.x, c.y - door.y));
    return c.scene;
  }, { timeout: CAT.doorMs + 25_000, intervals: [250] }).toBe('house');
  expect(near).toBeLessThan(4);
  const c = (await cats(page)).list[0];
  expect(c.sleep).toBe(true);
  expect(errors).toEqual([]);
});

test('trong nhà ban đêm: mèo nằm ngủ cạnh giường', async ({ page, context }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const save = base(1, 1, s => {
    s.time = DAY_MS * 0.8;
    s.scene = 'house';
    Object.assign(s.cats[0], { scene: 'house', sleep: true, ...CAT.houseSpot, tx: CAT.houseSpot.x, ty: CAT.houseSpot.y });
    Object.assign(s.player, { x: 96, y: 126, dir: 3 });   // đứng ngay cửa trong nhà
  });
  await open(page, context, save);
  await page.waitForTimeout(800);
  const c = (await cats(page)).list[0];
  expect(c.scene).toBe('house');
  expect(c.sleep).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('cat-house.png') });
  expect(errors).toEqual([]);
});
