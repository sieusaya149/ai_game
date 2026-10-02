// Hướng dẫn Cô Út, thông báo, Việc cần làm và sổ tay cho vật nuôi (issue 48). Dựng bằng bản lưu ghi sẵn (ADR 0008).
import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { mapOf, roamOf, placeEntity, canPlace, buyAnimal, createGame, stageStart, levelInfo } from '../public/state.js';
import { DAY_MS } from '../public/data.js';

const TS = 16;
const ready = async page => { await page.waitForFunction(() => globalThis.__farm?.state); await page.keyboard.press('Shift'); };

// Đặt một công trình gần cổng nhất có thể
const nearGate = (s, what) => {
  const g = mapOf(s).building('gate').at, gc = Math.floor(g.x / TS), gr = Math.floor(g.y / TS), cand = [];
  for (let r = gr - 16; r < gr; r++) for (let c = gc - 14; c < gc + 6; c++) cand.push([c, r]);
  cand.sort((a, b) => Math.hypot(a[0] - gc, a[1] - gr) - Math.hypot(b[0] - gc, b[1] - gr));
  const hit = cand.find(([c, r]) => canPlace(s, what, c, r).ok);
  return placeEntity(s, what, hit[0], hit[1]).id;
};
const roamTile = (s, far = 0) => {
  const sp = mapOf(s).spawn, tiles = [...roamOf(s).tiles].sort((a, b) => Math.hypot(a.c * TS - sp.x, a.r * TS - sp.y) - Math.hypot(b.c * TS - sp.x, b.r * TS - sp.y));
  return far ? tiles[tiles.length - 1] : tiles[0];
};
const addBird = (s, tile, extra) => {
  const tpl = createGame().animals.find(a => a.type === 'ga');
  const a = { ...structuredClone(tpl), id: s.nextId++, type: 'ga', name: 'Gà', sex: 'f', stage: 'truong', age: stageStart('ga', 'truong'),
    nextProduct: 1e15, ready: false, pen: s.farm.ents.find(e => e.kind === 'pen')?.id ?? null,
    tile: { ...tile }, tileAt: s.time + 1e9, x: tile.c * TS + 8, y: tile.r * TS + 8, ...extra };
  s.animals.push(a);
  return a;
};
const lvl = (s, n) => { s.exp = 0; while (levelInfo(s.exp).level < n) s.exp += 25; };

// ---- chạm vào thế giới ----
const screenOf = (page, x, y) => page.evaluate(([x, y]) => {
  const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
  return { x: (x * f.scale - f.view.camX) / f.dpr + rc.left, y: (y * f.scale - f.view.camY) / f.dpr + rc.top };
}, [x, y]);
async function tap(page, touch, x, y) {
  await page.waitForTimeout(350);
  let p = await screenOf(page, x, y);
  // chỗ cần chạm đang bị chip hành động của con trước che: chạm ra khoảng đất trống bên trái cho bỏ chọn, rồi chạm lại
  if (await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('#chips, #target-name'), [p.x, p.y])) {
    const e = [24, page.viewportSize().height * 0.45];
    if (touch) await page.touchscreen.tap(...e); else await page.mouse.click(...e);
    await page.waitForTimeout(500);
    p = await screenOf(page, x, y);
  }
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
const animalPt = (page, id) => page.evaluate(id => { const a = globalThis.__farm.state.animals.find(x => x.id === id); return { x: a.x, y: a.y - 4 }; }, id);

test('Cô Út dạy heo đầu tiên ở cấp 3: tắm, chữa bệnh, vắc-xin lần lượt, xong thì khung biến mất', async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let dirtyId, sickId;
  const save = makeSave(s => {
    s.coins = 5000; s.can = 5; s.animals = []; s.inv = { soap: 1, medicine: 1, vaccine: 1 };
    s.time = 10 * 3600_000; s.day = 1; lvl(s, 3);
    nearGate(s, { kind: 'pen', pen: 'pig' });
    buyAnimal(s, 'heo', 'm'); buyAnimal(s, 'heo', 'f');   // mua con heo đầu tiên: mở nhiệm vụ
    const ar = mapOf(s).pens.pig.area;
    const [a, b] = s.animals;
    Object.assign(a, { x: ar.x + ar.w - 10, y: ar.y + 12, dirty: 100, wallowAt: 1e15 });
    Object.assign(b, { x: ar.x + 10, y: ar.y + 14, sick: 1, sickMs: 0 });
    dirtyId = a.id; sickId = b.id;
    const g = mapOf(s).building('gate').at;
    Object.assign(s.player, { x: g.x, y: g.y, dir: 0 });
  });
  expect(save.coUtQuest).toEqual({ step: 0 });
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);

  const box = page.locator('#coutquest');
  await expect(box).toBeVisible();
  await expect(box).toContainText('bước 1/3');
  await expect(box).toContainText('Tắm');
  const step = () => page.evaluate(() => globalThis.__farm.state.coUtQuest?.step);

  // 1. tắm con heo dơ
  await expect(async () => {
    const p = await animalPt(page, dirtyId);
    await tap(page, touch, p.x, p.y);
    await expect.poll(step, { timeout: 4000 }).toBe(1);
  }).toPass({ timeout: 40_000 });
  await expect(box).toContainText('bước 2/3');
  await expect(box).toContainText('bệnh');
  await page.screenshot({ path: testInfo.outputPath('couts-2.png') });

  // 2. chữa con heo mệt
  await expect(async () => {
    const p = await animalPt(page, sickId);
    await tap(page, touch, p.x, p.y);
    await page.waitForTimeout(1200);   // chờ người chơi đi tới con vật xong rồi mới bấm hành động chính
    const main = page.locator('#main-action');
    if (await main.isVisible() && /thuốc thú y/i.test(await main.textContent())) await main.click();
    await expect.poll(step, { timeout: 3000 }).toBe(2);
  }).toPass({ timeout: 40_000 });
  await expect(box).toContainText('bước 3/3');
  await expect(box).toContainText('vắc-xin');

  // 3. tiêm vắc-xin cho con khỏe
  await expect(async () => {   // con đã chữa khỏi, đứng bên trái chuồng (bên phải bị các chip hành động che)
    const p = await animalPt(page, sickId);
    await tap(page, touch, p.x, p.y);
    await page.waitForTimeout(1800);   // chạm vào con vật là làm hành động chính (vuốt ve), đợi xong mới bấm chip được
    await page.locator('#chips .chip', { hasText: /Tiêm vắc-xin/ }).first().click({ timeout: 2000 });
    await expect.poll(step, { timeout: 8000 }).toBe(3);
  }).toPass({ timeout: 40_000 });
  await expect(box).toBeHidden();
  await expect(page.locator('#toasts .toast', { hasText: 'biết chăm heo' })).toBeVisible();
  // không chạy lại sau khi tải lại trang
  await page.reload();
  await ready(page);
  await expect(box).toBeHidden();
  expect(await step()).toBe(3);
  expect(errors).toEqual([]);
});

test('Cô Út: bỏ qua bước bằng nút ✕, bước kế mở ra', async ({ page, context }) => {
  await seedSave(context, makeSave(s => { lvl(s, 3); s.coins = 5000; nearGate(s, { kind: 'pen', pen: 'pig' }); buyAnimal(s, 'heo', 'm'); }));
  await page.goto('/');
  await ready(page);
  const box = page.locator('#coutquest');
  await expect(box).toContainText('bước 1/3');
  await box.getByRole('button').click();
  await expect(box).toContainText('bước 2/3');
});

test('con Nguy kịch ngoài khung nhìn: băng rôn đỏ và mũi tên chỉ về phía con vật', async ({ page, context }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let sickId;
  const save = makeSave(s => {
    s.coins = 5000; s.exp = 1e6; s.animals = []; s.inv = {}; s.time = 10 * 3600_000; s.day = 1;
    nearGate(s, { kind: 'pen', pen: 'pig' });
    buyAnimal(s, 'heo', 'm');
    Object.assign(s.animals[0], { sick: 3, sickMs: 1 });
    sickId = s.animals[0].id;
    Object.assign(s.player, mapOf(s).spawn);   // chỗ sinh: xa chuồng
  });
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  const banner = page.locator('#alert-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('nguy kịch');
  const arrow = page.locator(`.alert-arrow[data-key="sick:${sickId}"]`);
  await expect(arrow).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('nguy-kich.png') });
  // hướng mũi tên khớp hướng từ giữa màn hình tới con vật (sai số 25 độ)
  const diff = await page.evaluate(id => {
    const f = globalThis.__farm, a = f.state.animals.find(x => x.id === id), rc = document.getElementById('game-canvas').getBoundingClientRect();
    const sx = (a.x * f.scale - f.view.camX) / f.dpr + rc.left, sy = (a.y * f.scale - f.view.camY) / f.dpr + rc.top;
    const el = document.querySelector(`.alert-arrow[data-key="sick:${id}"]`), ang = Number(el.dataset.ang);
    const want = Math.atan2(sy - innerHeight / 2, sx - innerWidth / 2) * 180 / Math.PI;
    return { off: sx < 0 || sy < 0 || sx > innerWidth || sy > innerHeight, d: Math.abs(((ang - want + 540) % 360) - 180) };
  }, sickId);
  expect(diff.off).toBe(true);
  expect(diff.d).toBeLessThan(25);
  expect(errors).toEqual([]);
});

test('bảng Việc cần làm hiện đủ con dơ, con lạc, chuồng bẩn, trứng trong bụi; chạm mục thì tới chỗ đó', async ({ page, context }, testInfo) => {
  const save = makeSave(s => {
    s.coins = 5000; s.exp = 1e6; s.animals = []; s.inv = {}; s.can = 5; s.day = 1;
    nearGate(s, { kind: 'pen', pen: 'pig' });
    buyAnimal(s, 'heo', 'm'); s.time = DAY_MS * 0.8; s.duskDay = s.day;   // mua lúc chợ mở, rồi mới sang đêm
    s.manure.pig = 100;
    s.troughs.pig = 10; s.troughs.chicken = 10;
    addBird(s, roamTile(s, 1), { stray: true });
    addBird(s, roamTile(s), { dirty: 100 });   // heo, bò đầm bùn nên không tính là dơ; dùng gà
    const t = roamTile(s);
    s.eggs.push({ id: s.nextId++, sp: 'ga', x: t.c * TS + 8, y: t.r * TS + 14, laidAt: s.time, fertile: false, mom: null, dad: null, tile: { c: t.c, r: t.r } });
    Object.assign(s.player, mapOf(s).spawn);
  });
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  await page.locator('#todo-btn').click();
  const panel = page.locator('#panel-root');
  await expect(panel).toBeVisible();
  for (const re of [/🧼 1 con vật dơ/, /💤 1 con lạc ngủ ngoài/, /💩 1 chuồng bẩn/, /🌿 1 trứng trong bụi/]) await expect(panel.getByRole('button', { name: re })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('viec-can-lam.png') });
  // chạm "trứng trong bụi": nhân vật đi tới gần quả trứng
  const eggId = save.eggs[0].id;
  await panel.getByRole('button', { name: /trứng trong bụi/ }).click();
  await expect(panel).toBeHidden();
  await expect.poll(() => page.evaluate(id => {
    const s = globalThis.__farm.state, e = s.eggs.find(x => x.id === id);
    return Math.hypot(s.player.x - e.x, s.player.y - e.y);
  }, eggId), { timeout: 25_000 }).toBeLessThan(40);
});

test('3 con lạc cùng lúc chỉ ra một toast gộp', async ({ page, context }) => {
  const save = makeSave(s => {
    s.coins = 5000; s.exp = 1e6; s.animals = []; s.inv = {}; s.orders = []; s.nextOrderAt = 1e15;
    s.time = DAY_MS * 0.78; s.weather = 'rain';   // sau 18h, trời mưa: cả đàn tán loạn, 4 con lạc trở lên
    s.troughs.chicken = 10;
    const t = roamTile(s);
    for (let i = 0; i < 4; i++) addBird(s, t, {});
    Object.assign(s.player, mapOf(s).spawn);
  });
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  const toast = page.locator('#toasts .toast', { hasText: 'lạc' });
  await expect(toast.first()).toBeVisible({ timeout: 10_000 });
  await expect(toast.first()).toHaveText(/^[34] con gà lạc/);
  await expect(toast).toHaveCount(1);
  expect(await page.evaluate(() => globalThis.__farm.state.animals.filter(a => a.stray).length)).toBeGreaterThanOrEqual(3);
});

test('sổ tay có các trang mới: vòng đời, tắm, bệnh, lùa, kẻ săn mồi', async ({ page, context }) => {
  await seedSave(context, makeSave(s => { s.exp = 1e6; }));
  await page.goto('/');
  await ready(page);
  await page.locator('.bb-btn[data-panel="bag"]').click();
  await page.getByRole('button', { name: /Sổ tay hướng dẫn/ }).click();
  for (const t of ['Vòng đời', 'Tắm cho vật nuôi', 'Bệnh và thú y', 'Lùa về chuồng', 'Kẻ săn mồi', 'Chó Mực và dạy lệnh']) {
    await page.locator(`.guide-dot[title="${t}"]`).click();
    await expect(page.locator('.guide-page h3')).toHaveText(t);
  }
});
