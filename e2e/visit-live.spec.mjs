// Sửa lỗi online: khách đang đứng trong vườn phải thấy chủ làm gì ngay (trước đây chủ thu hoạch xong, cây vẫn nằm đó
// trên máy khách tới khi khách ra vào lại). Hai trình duyệt: chủ A đang online ở vườn mình, khách B vào vườn A.
// Chiều ngược lại vẫn chạy: B tưới giúp thì A thấy, và tin vườn của A gửi về không xóa mất việc B vừa làm.
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, closeAway, tapPlot } from './helpers.mjs';
import { moveEntity, mapOf } from '../public/state.js';
import { FIELD_SIZE, TS } from '../public/layout.js';

const uniq = () => 'Lv' + Math.random().toString(36).slice(2, 7);
const opts = (testInfo, baseURL) => ({ baseURL, ...testInfo.project.use });
const GATE_AT = { x: 488, y: 364 };   // chỗ đứng trước cổng bạn bè trong làng
const st = (page, fn) => page.evaluate(fn);

// Tài khoản mới có vườn ghi sẵn trên server; `open()` mới thật sự mở trình duyệt chơi (chưa mở = chủ đang offline)
async function player(browser, { baseURL, viewport, isMobile, hasTouch }, mutate) {
  const context = await browser.newContext({ baseURL, viewport, isMobile, hasTouch });
  const name = uniq();
  const invite = (await runAdmin('invite', '--db', E2E_DB)).out;
  expect((await context.request.post('/api/register', { data: { name, pin: '123456', invite } })).ok()).toBe(true);
  const { play } = await (await context.request.post('/api/play', { data: {} })).json();
  const save = makeSave(s => { s.look.shirt = 4; mutate?.(s); }, { name });
  expect((await context.request.post('/api/farm', { data: { play, save } })).ok()).toBe(true);
  await context.addInitScript(n => {
    try { localStorage.setItem('nongtrai-online', n); localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {}
  }, name);
  const me = { name, context, save, errors: [], page: null };
  me.open = async () => {
    const page = me.page = await context.newPage();
    page.on('pageerror', e => me.errors.push(e.message));
    await page.goto('/');
    await page.waitForFunction(() => globalThis.__farm?.state?.mode === 'online');
    await expect(page.locator('#live')).toBeVisible();
    return page;
  };
  return me;
}

// Vườn của chủ: nhà, kho, thùng giao hàng, chuồng chó dời gần cổng (cho khách đi ít); ô 0 cây khô cần tưới;
// chủ đứng gần cổng
function ownerGarden(s) {
  s.scene = 'farm';
  s.farm.ents = s.farm.ents.filter(e => !(e.kind === 'tree' && e.c === 42 && e.r === 28));
  Object.assign(s.farm.ents.find(e => e.kind === 'house'), { c: 39, r: 27 });
  s.farm.rev++;
  const id = k => s.farm.ents.find(e => e.kind === k).id;
  for (const [k, c, r] of [['shed', 39, 20], ['shipbin', 33, 22], ['doghouse', 43, 32]]) expect(moveEntity(s, id(k), c, r).ok, k).toBe(true);
  Object.assign(s.dog, mapOf(s).dogHome);
  // dời khối ruộng có ô 0 tới chỗ hợp lệ gần cổng nhất: khách bước vào là thấy ngay ô cần tưới
  const t0 = mapOf(s).plotTile(0), exit = mapOf(s).arrive.village, o = s.farm.owned, spots = [];
  const field = s.farm.ents.find(e => e.kind === 'field' && t0.c >= e.c && t0.c < e.c + FIELD_SIZE && t0.r >= e.r && t0.r < e.r + FIELD_SIZE);
  for (let r = o.r; r <= o.r + o.h - FIELD_SIZE; r++) for (let c = o.c; c <= o.c + o.w - FIELD_SIZE; c++)
    spots.push({ c, r, d: Math.hypot((c + 1) * TS + 8 - exit.x, (r + 1) * TS + 8 - exit.y) });
  spots.sort((a, b) => a.d - b.d);
  expect(spots.some(q => q.d > TS && moveEntity(s, field.id, q.c, q.r).ok), 'dời khối ruộng ra gần cổng').toBe(true);
  plant(s, 0, { water: 0 });
  plant(s, 1, { water: 100 }); s.plots[1].crop.progress = 1;   // ô 1 đã chín: chủ thu hoạch
  Object.assign(s.player, { x: 600, y: 470, dir: 0 });
}
function plant(s, idx, { water, weeds = false }) {
  const p = s.plots[idx];
  p.soil = 'tilled'; p.water = water; p.weeds = weeds;
  p.crop = { id: 'carot', progress: 0.4, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
}
const guestAt = (x, y) => s => { s.scene = 'village'; Object.assign(s.player, { x, y, dir: 3 }); };

// Từ trước cổng bạn bè trong làng: chạm cổng, chọn cổng vườn của chủ trong danh sách rồi bấm Vào (issue 26, 27)
async function enterGarden(page, owner) {
  await expect(page.locator('#target-name')).toHaveText('Cổng bạn bè');
  await page.locator('#main-action').click();
  await expect(page.locator('.sheet-head h2')).toHaveText(/Bạn bè/);
  await page.locator(`.gate-row[data-name="${owner}"] .gate-go`).click();
  await expect.poll(() => st(page, () => globalThis.__farm.state?.scene)).toBe('visit');
  await expect(page.locator('#visit-bar')).toBeVisible();
}


test('A thu hoạch trong lúc B đang thăm: B thấy ô trống trong vài giây; B tưới giúp thì A thấy và B vẫn thấy ô đã tưới', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), ownerGarden);
  const B = await player(browser, opts(testInfo, baseURL), guestAt(GATE_AT.x, GATE_AT.y));
  await A.open();
  await closeAway(A.page);
  await B.open();
  await enterGarden(B.page, A.name);
  const crop = (page, i) => page.evaluate(i => globalThis.__farm.state.plots[i].crop?.id ?? null, i);
  expect(await crop(B.page, 1)).toBe('carot');

  // A thu hoạch ô 1: B thấy ô trống ngay (chưa tới nhịp lưu 10 giây của A)
  await tapPlot(A.page, 1, touch, async () => (await crop(A.page, 1)) === null);
  const t0 = Date.now();
  await expect.poll(() => crop(B.page, 1), { timeout: 4000, intervals: [100] }).toBe(null);
  expect(Date.now() - t0).toBeLessThan(4000);

  // chiều ngược lại: B tưới giúp ô 0, A thấy; vài nhịp gửi vườn sau B vẫn thấy ô đã tưới
  await tapPlot(B.page, 0, touch, () => st(B.page, () => globalThis.__farm.state.plots[0].water > 50));
  await expect.poll(() => st(A.page, () => globalThis.__farm.state.plots[0].water)).toBeGreaterThan(50);
  await B.page.waitForTimeout(5000);
  expect(await st(B.page, () => globalThis.__farm.state.plots[0].water)).toBeGreaterThan(50);
  expect(await crop(B.page, 1)).toBe(null);
  // B vẫn đang ở vườn A (tin vườn không làm B rời đi)
  expect(await st(B.page, () => globalThis.__farm.state.visit.owner)).toBe(A.name);

  expect(A.errors.concat(B.errors)).toEqual([]);
  await A.context.close(); await B.context.close();
});
