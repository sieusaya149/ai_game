import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { mapOf } from '../public/state.js';

// Người chơi đứng ngay trước cửa nhà, chưa đội mũ.
const save = () => makeSave(s => {
  const at = mapOf(s).building('house').at;
  Object.assign(s.player, { x: at.x, y: at.y, dir: 3 });
  s.look.hat = 0;
});

const st = page => page.evaluate(() => { const s = globalThis.__farm.state; return { scene: s.scene, x: s.player.x, y: s.player.y, hat: s.look.hat }; });
// Bấm một phím vô hại trước: lần chạm đầu tiên tạo AudioContext, trình duyệt ẩn khựng cả giây làm chạm bị coi là giữ lâu.
async function ready(page) {
  await page.waitForFunction(() => globalThis.__farm?.state);
  await page.keyboard.press('Shift');
}

// Điểm ảnh bản đồ (x, y) ra tọa độ màn hình theo camera hiện tại
const screenOf = (page, x, y) => page.evaluate(([x, y]) => {
  const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
  return { x: (x * f.scale - f.view.camX) / f.dpr + rc.left, y: (y * f.scale - f.view.camY) / f.dpr + rc.top };
}, [x, y]);
async function tap(page, touch, x, y) {
  await page.waitForTimeout(400);   // camera dừng hẳn
  const p = await screenOf(page, x, y);
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
// Chạm vào đồ vật / cửa của bản đồ đang đứng
const thing = (page, kind, id) => page.evaluate(async ([kind, id]) => {
  const { sceneMap } = await import('/state.js');
  const m = sceneMap(globalThis.__farm.state);
  if (kind === 'door') { const d = m.doors.find(o => o.to === id); return { x: d.x + d.w / 2, y: d.y - 4 }; }
  const b = m.building(id); return { x: b.x + 10, y: b.y + 10 };
}, [kind, id]);

test('vào nhà → mở tủ đồ đổi mũ → ra ngoài → tải lại vẫn đúng bản đồ và vị trí', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedSave(context, save());
  await page.goto('/');
  await ready(page);

  // chạm vào nhà: đang đứng trước cửa nên vào luôn (mờ dần rồi sang bản đồ trong nhà)
  const house = await page.evaluate(() => { const s = globalThis.__farm.state, h = s.farm.ents.find(e => e.kind === 'house'); return { x: h.c * 16 + 32, y: h.r * 16 + 24 }; });
  await page.evaluate(() => { const el = document.getElementById('fade'); new MutationObserver(() => { if (el.classList.contains('on')) globalThis.__faded = true; }).observe(el, { attributes: true }); });
  await tap(page, touch, house.x, house.y);
  await expect.poll(async () => (await st(page)).scene).toBe('house');
  expect(await page.evaluate(() => globalThis.__faded)).toBe(true);   // có mờ dần
  await expect(page.locator('#fade')).not.toHaveClass(/on/);
  await expect(page.locator('#bb-build')).toBeHidden();   // trong nhà không có chế độ xây dựng

  // tủ đồ trong nhà: đi tới, mở bảng, đổi sang nón lá
  const ward = await thing(page, 'building', 'wardrobe');
  await tap(page, touch, ward.x, ward.y);
  await expect(page.locator('#panel-root')).toBeVisible({ timeout: 10_000 });
  await page.locator('.le-row', { hasText: 'Mũ' }).getByRole('button', { name: '▶' }).click();
  await expect.poll(async () => (await st(page)).hat).toBe(1);
  await page.locator('#panel-root .close').click();
  await expect(page.locator('#panel-root')).toBeHidden();

  // tải lại khi đang trong nhà: vẫn trong nhà, đúng chỗ, vẫn đội nón
  const inside = await st(page);
  await page.reload();
  await ready(page);
  expect(await st(page)).toEqual(inside);

  // ra cửa: về đứng trước nhà ngoài vườn
  const door = await thing(page, 'door', 'farm');
  await tap(page, touch, door.x, door.y);
  await expect.poll(async () => (await st(page)).scene, { timeout: 10_000 }).toBe('farm');
  const out = await st(page);
  const at = await page.evaluate(async () => { const { mapOf } = await import('/state.js'); return mapOf(globalThis.__farm.state).building('house').at; });
  expect([out.x, out.y]).toEqual([at.x, at.y]);
  await expect(page.locator('#bb-build')).toBeVisible();

  await page.reload();
  await ready(page);
  expect(await st(page)).toEqual(out);
  expect(errors).toEqual([]);
});

test('bước vào ô cửa nhà là vào nhà, bước xuống ô cửa trong nhà là ra vườn', async ({ page, context }) => {
  await seedSave(context, save());
  await page.goto('/');
  await ready(page);
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await st(page)).scene, { timeout: 5000 }).toBe('house');
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(400);
  await page.keyboard.down('ArrowDown');
  await expect.poll(async () => (await st(page)).scene, { timeout: 5000 }).toBe('farm');
  await page.keyboard.up('ArrowDown');
});
