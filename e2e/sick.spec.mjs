// Bệnh 4 giai đoạn, trạm thú y Cô Út, chuồng cách ly, bác sĩ qua điện thoại, ngôi mộ (issue 38).
import { test, expect } from '@playwright/test';
import { makeSave, seedSave, noCatchUp } from './helpers.mjs';
import { mapOf, placeEntity, canPlace, buyAnimal } from '../public/state.js';
import { SICK } from '../public/data.js';

const HOUR = 3600_000;

// Vườn có chuồng heo (và chuồng cách ly nếu cần) ngay cạnh cổng, người chơi đứng ở cổng, 10 giờ sáng.
const nearGate = (s, what) => {
  const g = mapOf(s).building('gate').at, gc = Math.floor(g.x / 16), gr = Math.floor(g.y / 16);
  const cand = [];
  for (let r = gr - 16; r < gr; r++) for (let c = gc - 14; c < gc + 6; c++) cand.push([c, r]);
  cand.sort((a, b) => Math.hypot(a[0] - gc, a[1] - gr) - Math.hypot(b[0] - gc, b[1] - gr));
  const hit = cand.find(([c, r]) => canPlace(s, what, c, r).ok);
  const res = placeEntity(s, what, hit[0], hit[1]);
  return res.id;
};
const base = (mutate, extra) => makeSave(s => {
  s.coins = 1e5; s.exp = 1e6; s.can = 5; s.animals = []; s.inv = {};
  s.time = 10 * HOUR; s.day = 1;
  nearGate(s, { kind: 'pen', pen: 'pig' });
  mutate?.(s);
  const g = mapOf(s).building('gate').at;
  Object.assign(s.player, { x: g.x, y: g.y, dir: 0 });
  Object.assign(s, extra);
});

const look = page => page.evaluate(() => {
  const s = globalThis.__farm.state;
  return {
    scene: s.scene, coins: s.coins, inv: { ...s.inv },
    animals: s.animals.map(a => ({ id: a.id, sick: a.sick, dose: a.dose, pen: a.pen, x: a.x, y: a.y })),
    pens: s.farm.ents.filter(e => e.kind === 'pen').map(e => ({ id: e.id, pen: e.pen })),
    graves: s.farm.ents.filter(e => e.kind === 'grave').map(e => ({ id: e.id, flower: e.flower, x: e.c * 16 + 8, y: e.r * 16 + 14 })),
    angels: (globalThis.__farm.world.angels ?? []).length,
  };
});
const screenOf = (page, x, y) => page.evaluate(([x, y]) => {
  const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
  return { x: (x * f.scale - f.view.camX) / f.dpr + rc.left, y: (y * f.scale - f.view.camY) / f.dpr + rc.top };
}, [x, y]);
async function tap(page, touch, x, y) {
  await page.waitForTimeout(350);
  let p = await screenOf(page, x, y);
  // joystick ảo (điện thoại) nằm đè lên trạm thú y gần mép trái: lùi sang điểm khác trên công trình mà không bị che
  for (const [dx, dy] of [[0, 0], [20, -10], [22, -26], [14, -34], [0, -34], [-14, -34]]) {
    const q = await screenOf(page, x + dx, y + dy);
    if (await page.evaluate(([qx, qy]) => document.elementFromPoint(qx, qy)?.id === 'game-canvas', [q.x, q.y])) { p = q; break; }
  }
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
// Chạm một chỗ trong thế giới; chỗ nào ngoài màn hình thì chạm về phía đó cho nhân vật đi tới, camera theo sau.
async function tapFar(page, touch, x, y) {
  for (let i = 0; i < 14; i++) {
    const pt = await page.evaluate(([wx, wy]) => {
      const f = globalThis.__farm, r = document.getElementById('game-canvas').getBoundingClientRect();
      const top = document.getElementById('hud').getBoundingClientRect().bottom + 4;
      const bot = document.getElementById('bottombar').getBoundingClientRect().top - 4;
      const mini = document.getElementById('mini-wrap').getBoundingClientRect();
      const x = (wx * f.scale - f.view.camX) / f.dpr + r.left, y = (wy * f.scale - f.view.camY) / f.dpr + r.top;
      const inMini = x > mini.left - 14 && x < mini.right + 14 && y > mini.top - 14 && y < mini.bottom + 14;
      return { x, y, ok: x > 4 && x < innerWidth - 4 && y > top && y < bot && !inMini, w: innerWidth, top, bot, miniBottom: mini.bottom + 24, miniLeft: mini.left - 24 };
    }, [x, y]);
    let tx = pt.x, ty = pt.y;
    if (!pt.ok) {
      tx = Math.min(pt.w - 20, Math.max(20, pt.x)); ty = Math.min(pt.bot - 20, Math.max(pt.top + 20, pt.y));
      if (tx > pt.miniLeft && ty < pt.miniBottom) ty = Math.min(pt.bot - 20, pt.miniBottom);
    }
    if (touch) await page.touchscreen.tap(tx, ty); else await page.mouse.click(tx, ty);
    if (pt.ok) return;
    await page.waitForTimeout(700);
  }
  throw new Error(`Không chạm tới chỗ (${x}, ${y})`);
}
// Đi bộ bằng phím mũi tên tới (tx, ty), dừng khi `until()` đúng — khỏi lo nút trên HUD che chỗ cần chạm.
async function walkKeys(page, tx, ty, until, timeout = 25_000) {
  for (const t0 = Date.now(); Date.now() - t0 < timeout;) {
    if (await until()) return;
    const p = await page.evaluate(() => ({ x: globalThis.__farm.state.player.x, y: globalThis.__farm.state.player.y }));
    const keys = [];
    if (tx - p.x > 4) keys.push('ArrowRight'); else if (tx - p.x < -4) keys.push('ArrowLeft');
    if (ty - p.y > 4) keys.push('ArrowDown'); else if (ty - p.y < -4) keys.push('ArrowUp');
    if (!keys.length) { await page.waitForTimeout(300); continue; }
    for (const k of keys) await page.keyboard.down(k);
    await page.waitForTimeout(220);
    for (const k of keys) await page.keyboard.up(k);
  }
  throw new Error(`Đi mãi không tới (${tx}, ${ty})`);
}
const where = (page, id) => page.evaluate(async id => {
  const { sceneMap } = await import('/state.js');
  const b = sceneMap(globalThis.__farm.state).building(id);
  return { x: b.at ? b.at.x : b.x, y: b.at ? b.at.y - 10 : b.y };
}, id);
const door = (page, to) => page.evaluate(async to => {
  const { sceneMap } = await import('/state.js');
  const d = sceneMap(globalThis.__farm.state).doors.find(o => o.to === to);
  return { x: d.x + d.w / 2, y: d.y + d.h / 2 };
}, to);
const ready = async page => { await page.waitForFunction(() => globalThis.__farm?.state); await page.keyboard.press('Shift'); };

test('con mệt: ra làng mua thuốc ở trạm thú y Cô Út rồi cho uống là khỏi', async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedSave(context, base(s => { buyAnimal(s, 'heo'); s.animals[0].sick = 1; s.animals[0].sickMs = 0; }));
  await page.goto('/');
  await ready(page);
  expect((await look(page)).inv.medicine ?? 0).toBe(0);

  // ra làng
  await page.keyboard.down('ArrowDown');
  await expect.poll(async () => (await look(page)).scene, { timeout: 15_000 }).toBe('village');
  await page.keyboard.up('ArrowDown');
  await expect(page.locator('#fade')).not.toHaveClass(/on/);

  // trạm thú y Cô Út: mua 1 liều thuốc thú y
  const clinic = await where(page, 'vet');
  await expect(async () => {
    await tap(page, touch, clinic.x, clinic.y);
    await expect(page.locator('.sheet-head h2')).toHaveText(/Trạm thú y Cô Út/, { timeout: 3000 });
  }).toPass({ timeout: 30_000 });
  await page.screenshot({ path: testInfo.outputPath('co-ut.png') });
  await page.locator('.row', { hasText: 'Thuốc thú y' }).getByRole('button', { name: '×1' }).click();
  await expect.poll(async () => (await look(page)).inv.medicine).toBe(1);
  await page.locator('#panel-root .close').click();

  // về vườn, cho heo uống thuốc
  const back = await door(page, 'farm');
  await expect(async () => {
    const atFarm = async () => (await look(page)).scene === 'farm';
    await walkKeys(page, back.x, back.y + 10, atFarm, 12_000).catch(() => {});
    const main = page.locator('#main-action');   // đứng ở cổng rồi: bấm nút "Về vườn nhà"
    if (await main.isVisible() && /vườn nhà/i.test(await main.textContent())) await main.click();
    await expect.poll(atFarm, { timeout: 4000 }).toBe(true);
  }).toPass({ timeout: 45_000 });
  await expect(async () => {
    const a = (await look(page)).animals[0];
    await tap(page, touch, a.x, a.y - 4);
    const main = page.locator('#main-action');
    if (await main.isVisible() && /thuốc thú y/i.test(await main.textContent())) await main.click();
    await expect.poll(async () => (await look(page)).animals[0].sick, { timeout: 3000 }).toBe(0);
  }).toPass({ timeout: 40_000 });
  expect((await look(page)).inv.medicine ?? 0).toBe(0);
  expect(errors).toEqual([]);
});

test('hai con cùng chuồng, một con bệnh nặng: chuyển con bệnh vào chuồng cách ly', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedSave(context, base(s => {
    nearGate(s, { kind: 'pen', pen: 'quarantine' });
    buyAnimal(s, 'heo'); buyAnimal(s, 'heo');
    // hai đầu chuồng cho khỏi chồng lên nhau khi chạm
    const ar = mapOf(s).pens.pig.area;
    Object.assign(s.animals[0], { sick: 2, sickMs: SICK.toSevere, dose: 0, x: ar.x + 10, y: ar.y + 12 });
    Object.assign(s.animals[1], { x: ar.x + ar.w - 10, y: ar.y + ar.h - 6 });
  }));
  await page.goto('/');
  await ready(page);
  const before = await look(page);
  expect(before.animals).toHaveLength(2);
  expect(before.animals[0].pen).toBe(before.animals[1].pen);
  const quarId = before.pens.find(p => p.pen === 'quarantine').id;

  const sickId = before.animals.find(a => a.sick >= 2).id;
  await expect(async () => {
    const a = (await look(page)).animals.find(x => x.id === sickId);
    await tap(page, touch, a.x, a.y - 4);
    // chỉ con Bệnh nặng mới có hành động chính "uống 0/2 liều": thấy nó là đã chạm đúng con
    await expect(page.locator('#main-action')).toContainText(/0\/2 liều/, { timeout: 2000 });
    await page.locator('#chips .chip', { hasText: 'cách ly' }).first().click();
    await expect.poll(async () => (await look(page)).animals.find(x => x.id === sickId).pen, { timeout: 3000 }).toBe(quarId);
  }).toPass({ timeout: 40_000 });
  const after = await look(page);
  expect(after.animals.find(x => x.id !== sickId).pen).not.toBe(quarId);   // con khỏe vẫn ở chuồng thường
  await page.screenshot({ path: testInfo.outputPath('cach-ly.png') });
  expect(errors).toEqual([]);
});

test('con nguy kịch: gọi bác sĩ thú y ở điện thoại trong nhà thì khỏi', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const save = base(s => {
    buyAnimal(s, 'heo');
    Object.assign(s.animals[0], { sick: 3, sickMs: SICK.toCritical });
    s.coins = SICK.vetPrice + 10;
  });
  save.scene = 'house';
  Object.assign(save.player, { x: 96, y: 126, dir: 3 });   // đứng ngay cửa trong nhà
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  await expect.poll(async () => (await look(page)).scene).toBe('house');

  const phone = await where(page, 'phone');
  await expect(async () => {
    await tap(page, touch, phone.x, phone.y);
    const main = page.locator('#main-action');
    if (await main.isVisible() && /bác sĩ/i.test(await main.textContent())) await main.click();
    await expect(page.locator('.sheet-head h2')).toHaveText(/Điện thoại/, { timeout: 2500 });
  }).toPass({ timeout: 40_000 });
  await page.screenshot({ path: testInfo.outputPath('dien-thoai.png') });
  await page.locator("#panel-root").getByRole("button", { name: "Gọi bác sĩ" }).click();
  await expect.poll(async () => (await look(page)).animals[0].sick, { timeout: 5000 }).toBe(0);
  expect((await look(page)).coins).toBe(10);
  expect(errors).toEqual([]);
});

test('hotfix: con gà mới Mệt cũng hiện ở điện thoại và gọi bác sĩ được', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const save = base(s => {
    buyAnimal(s, 'ga');
    Object.assign(s.animals[0], { sick: 1, sickMs: 0 });
    s.coins = SICK.vetPrice + 10;
  });
  save.scene = 'house';
  Object.assign(save.player, { x: 96, y: 126, dir: 3 });
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  await expect.poll(async () => (await look(page)).scene).toBe('house');
  const phone = await where(page, 'phone');
  await expect(async () => {
    await tap(page, touch, phone.x, phone.y);
    const main = page.locator('#main-action');
    if (await main.isVisible() && /bác sĩ/i.test(await main.textContent())) await main.click();
    await expect(page.locator('.sheet-head h2')).toHaveText(/Điện thoại/, { timeout: 2500 });
  }).toPass({ timeout: 40_000 });
  await expect(page.locator('#panel-root')).toContainText('Mệt');
  await page.locator('#panel-root').getByRole('button', { name: 'Gọi bác sĩ' }).click();
  await expect.poll(async () => (await look(page)).animals[0].sick, { timeout: 5000 }).toBe(0);
  expect(errors).toEqual([]);
});

test('con vừa mất: thiên thần bay lên, để lại ngôi mộ, đặt hoa lên mộ', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedSave(context, base(s => {
    buyAnimal(s, 'heo');
    Object.assign(s.animals[0], { sick: 3, sickMs: SICK.deadAt - 3000 });
    s.inv.deco_flower = 1;
  }));
  await noCatchUp(context);   // trang tải chậm hơn 3 giây thì game chạy bù, bệnh bị kẹp ở Bệnh nặng và con vật không chết
  await page.goto('/');
  await ready(page);
  // đồng hồ chạy tới lúc con vật ra đi: thiên thần hiện lên rồi còn lại ngôi mộ
  await expect.poll(async () => (await look(page)).angels, { timeout: 20_000, intervals: [50] }).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('thien-than.png') });
  await expect.poll(async () => (await look(page)).graves.length, { timeout: 10_000 }).toBe(1);
  expect((await look(page)).animals).toHaveLength(0);

  await expect(async () => {
    const g = (await look(page)).graves[0];
    const done = async () => (await look(page)).graves[0].flower === true;
    await tapFar(page, touch, g.x + 24, g.y);   // đi tới ô cạnh mộ trước cho chắc trong tầm tay
    await page.waitForTimeout(900);
    await tapFar(page, touch, g.x, g.y - 4);    // rồi chạm vào mộ
    const main = page.locator('#main-action');
    if (await main.isVisible() && /hoa/i.test(await main.textContent())) await main.click();
    await expect.poll(done, { timeout: 3000 }).toBe(true);
  }).toPass({ timeout: 45_000 });
  await page.screenshot({ path: testInfo.outputPath('ngoi-mo.png') });
  expect((await look(page)).inv.deco_flower ?? 0).toBe(0);
  expect(errors).toEqual([]);
});
