// Vắng nhà, thông báo và thành tựu xã hội (issue 32): việc khách làm tới chủ vườn ở mọi bản đồ, gom lại khi chủ về,
// và thành tựu "Hàng xóm tốt bụng". Hai trình duyệt (chủ A, khách B); có tình huống khách B chỉ cần làm qua giao thức
// công khai của server (WebSocket + HTTP với cookie của B, ADR 0011) để dựng đủ bốn loại việc lúc A vắng nhà.
import { test, expect } from '@playwright/test';
import WebSocket from 'ws';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, closeAway, tapPlot } from './helpers.mjs';
import { moveEntity, mapOf, stageStart } from '../public/state.js';
import { FIELD_SIZE, TS } from '../public/layout.js';
import { CROPS, GUEST } from '../public/data.js';

const uniq = () => 'So' + Math.random().toString(36).slice(2, 7);
const opts = (testInfo, baseURL) => ({ baseURL, ...testInfo.project.use });
const GATE_AT = { x: 488, y: 364 };   // chỗ đứng trước cổng bạn bè trong làng
const LV5 = 500;
const st = (page, fn, arg) => page.evaluate(fn, arg);
const crop = (id, progress) => ({ id, progress, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 });

// Tài khoản mới có vườn ghi sẵn trên server; `open()` mới thật sự mở trình duyệt chơi (chưa mở = chủ đang offline)
async function player(browser, { baseURL, viewport, isMobile, hasTouch }, mutate) {
  const context = await browser.newContext({ baseURL, viewport, isMobile, hasTouch });
  const name = uniq();
  const invite = (await runAdmin('invite', '--db', E2E_DB)).out;
  expect((await context.request.post('/api/register', { data: { name, pin: '123456', invite } })).ok()).toBe(true);
  const { play } = await (await context.request.post('/api/play', { data: {} })).json();
  const save = makeSave(s => { s.look.shirt = 4; s.exp = LV5; mutate?.(s); }, { name });
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
  // Kết nối WebSocket bằng cookie của tài khoản này (như trình duyệt), không mở trang
  me.sock = async () => {
    const cookie = (await context.cookies()).find(c => c.name === 'nt_session').value;
    const s = new WebSocket(baseURL.replace('http', 'ws') + '/ws', { headers: { cookie: `nt_session=${cookie}` } });
    const inbox = [];
    s.on('message', d => inbox.push(JSON.parse(d)));
    await new Promise((ok, no) => { s.once('open', ok); s.once('error', no); });
    const until = async t => { await expect.poll(() => inbox.findIndex(m => m.t === t), { timeout: 5000 }).toBeGreaterThan(-1); return inbox.splice(inbox.findIndex(m => m.t === t), 1)[0]; };
    return { send: m => s.send(JSON.stringify(m)), until, close: () => s.close() };
  };
  return me;
}

// Vườn của chủ: công trình dời gần cổng; khối ruộng có ô 0 dời ra sát cổng. Ô 0 cà chua chín, ô 1 cà rốt khô,
// ô 2 cà rốt có cỏ; chó trưởng thành no và vui (canh được khách)
function ownerGarden(s) {
  s.scene = 'farm';
  s.farm.ents = s.farm.ents.filter(e => !(e.kind === 'tree' && e.c === 42 && e.r === 28));
  Object.assign(s.farm.ents.find(e => e.kind === 'house'), { c: 39, r: 27 });
  s.farm.rev++;
  const id = k => s.farm.ents.find(e => e.kind === k).id;
  for (const [k, c, r] of [['shed', 39, 20], ['shipbin', 33, 22], ['doghouse', 43, 32]]) expect(moveEntity(s, id(k), c, r).ok, k).toBe(true);
  Object.assign(s.dog, mapOf(s).dogHome, { stage: 'truong', age: stageStart('cho', 'truong'), hunger: 100, happy: 100, chained: false });
  const t0 = mapOf(s).plotTile(0), exit = mapOf(s).arrive.village, o = s.farm.owned, spots = [];
  const field = s.farm.ents.find(e => e.kind === 'field' && t0.c >= e.c && t0.c < e.c + FIELD_SIZE && t0.r >= e.r && t0.r < e.r + FIELD_SIZE);
  for (let r = o.r; r <= o.r + o.h - FIELD_SIZE; r++) for (let c = o.c; c <= o.c + o.w - FIELD_SIZE; c++)
    spots.push({ c, r, d: Math.hypot((c + 1) * TS + 8 - exit.x, (r + 1) * TS + 8 - exit.y) });
  spots.sort((a, b) => a.d - b.d);
  expect(spots.some(q => q.d > TS && moveEntity(s, field.id, q.c, q.r).ok), 'dời khối ruộng ra gần cổng').toBe(true);
  Object.assign(s.plots[0], { soil: 'tilled', water: 100, weeds: false, crop: crop('cachua', 1) });
  Object.assign(s.plots[1], { soil: 'tilled', water: 0, weeds: false, crop: crop('carot', 0.4) });
  Object.assign(s.plots[2], { soil: 'tilled', water: 100, weeds: true, crop: crop('carot', 0.4) });
  Object.assign(s.player, { x: 600, y: 470, dir: 0 });
}
const inVillage = (x, y) => s => { s.scene = 'village'; Object.assign(s.player, { x, y, dir: 3 }); };

// Từ trước cổng bạn bè trong làng: chạm cổng, chọn cổng vườn của chủ rồi bấm Vào (issue 26, 27)
async function enterGarden(page, owner) {
  await expect(page.locator('#target-name')).toHaveText('Cổng bạn bè');
  await page.locator('#main-action').click();
  await expect(page.locator('.sheet-head h2')).toHaveText(/Bạn bè/);
  await page.locator(`.gate-row[data-name="${owner}"] .gate-go`).click();
  await expect.poll(() => st(page, () => globalThis.__farm.state?.scene)).toBe('visit');
  await expect(page.locator('#visit-bar')).toBeVisible();
}

test('A đang ở làng, B trộm vườn A: A thấy băng rôn đỏ và nút "Về vườn" ngay ở làng, bấm là tự đi về vườn', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(150_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), s => { ownerGarden(s); inVillage(GATE_AT.x - 40, GATE_AT.y)(s); });
  const B = await player(browser, opts(testInfo, baseURL), inVillage(GATE_AT.x, GATE_AT.y));
  await A.open();
  await closeAway(A.page);
  expect(await st(A.page, () => globalThis.__farm.state.scene)).toBe('village');
  await expect(A.page.locator('#alert-home')).toBeHidden();
  await B.open();
  await enterGarden(B.page, A.name);
  await tapPlot(B.page, 0, touch, () => st(B.page, () => (globalThis.__farm.state.basket.cachua || 0) > 0));

  // A vẫn đứng ở làng: băng rôn 🔴 có tên B và nút "Về vườn"
  const banner = A.page.locator('#alert-banner'), home = A.page.locator('#alert-home');
  await expect(banner).toBeVisible({ timeout: 15_000 });
  await expect(banner).toContainText(B.name);
  await expect(home).toBeVisible();
  expect(await st(A.page, () => globalThis.__farm.state.scene)).toBe('village');
  await A.page.screenshot({ path: `test-results/social-village-alert-${testInfo.project.name}.png` });
  // bấm "Về vườn": nhân vật tự đi tới cổng về vườn nhà, tới nơi thì nút biến mất
  await home.click();
  await expect.poll(() => st(A.page, () => globalThis.__farm.state.scene), { timeout: 40_000 }).toBe('farm');
  await expect(home).toBeHidden();
  expect(A.errors.concat(B.errors)).toEqual([]);
  await A.context.close(); await B.context.close();
});

test('A offline: B giúp 2 việc, trộm 1 ô, bị chó đuổi, để lại một quà → A về thấy màn vắng nhà đủ bốn nhóm', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const A = await player(browser, opts(testInfo, baseURL), ownerGarden);
  const B = await player(browser, opts(testInfo, baseURL), inVillage(GATE_AT.x, GATE_AT.y));
  // B làm qua giao thức công khai: vào vườn A, giúp, trộm, bị chó đớp rơi đồ vừa trộm, rồi tặng quà ở cổng
  const b = await B.sock();
  b.send({ t: 'join', map: 'farm', owner: A.name, x: 300, y: 300, dir: 0 });
  await b.until('joined');
  let n = 0, loot = {};
  for (const op of [{ kind: 'help', act: 'water', idx: 1 }, { kind: 'help', act: 'weed', idx: 2 }, { kind: 'steal', act: 'crop', idx: 0 }, { kind: 'bite', act: 'bite', loot: null }]) {
    b.send({ t: 'guest', op: { ...op, ...(op.kind === 'bite' ? { loot } : {}), id: `e2e-${Date.now()}-${++n}` } });
    const ack = await b.until('guest');
    expect(ack.ok, `${op.kind}: ${ack.msg}`).toBe(true);
    if (ack.reward?.items) loot = ack.reward.items;
  }
  b.close();
  expect((await B.context.request.post('/api/gifts', { data: { to: A.name, item: 'cai', qty: 3, op: 'gift-' + Date.now() } })).ok()).toBe(true);
  const take = Math.max(1, Math.floor(CROPS.cachua.yield * GUEST.stealPct));
  expect(loot).toEqual({ cachua: take });

  // A đăng nhập: màn "Trong lúc bạn vắng nhà…" có đủ bốn nhóm với số đúng
  await A.open();
  const away = A.page.locator('#away');
  await expect(away).toBeVisible();
  const item = k => away.locator(`.away-guests li[data-kind="${k}"]`);
  await expect(item('help')).toHaveText(`🤝${B.name} đã giúp 2 việc (tưới 1 ô, nhổ cỏ 1 ô)`);
  await expect(item('steal')).toHaveText(`😈${B.name} đã trộm ${take} cà chua`);
  await expect(item('gift')).toHaveText('🎁1 phần quà mới trong hộp quà ở cổng');
  await expect(item('chase')).toHaveText('🐕Mực đã đuổi được 1 người');
  await expect(item('note')).toHaveCount(0);
  await A.page.screenshot({ path: `test-results/social-away-${testInfo.project.name}.png` });

  // màn dài hơn (thêm nhiều dòng) vẫn không tràn ngang và cuộn được trong khung
  const fit = await st(A.page, () => {
    const card = document.querySelector('#away .away-card'), list = card.querySelector('.away-guests');
    for (let i = 0; i < 30; i++) list.append(list.lastElementChild.cloneNode(true));
    // hiệu ứng "pop" phóng to 1.05 lúc mở; trang của A nằm sau trang B nên trình duyệt có thể chạy chậm hiệu ứng, cho xong hẳn rồi mới đo
    card.getAnimations().forEach(a => a.finish());
    card.scrollTop = 0;
    const before = card.scrollTop;
    card.scrollTop = 99999;
    const r = card.getBoundingClientRect();
    return { scrolled: card.scrollTop > before, wide: card.scrollWidth - card.clientWidth, page: document.documentElement.scrollWidth - innerWidth, bottom: r.bottom, top: r.top, h: innerHeight, w: innerWidth, right: r.right };
  });
  expect(fit.scrolled).toBe(true);
  expect(fit.wide).toBeLessThanOrEqual(0);
  expect(fit.page).toBeLessThanOrEqual(0);
  expect(fit.top).toBeGreaterThanOrEqual(0);
  expect(fit.bottom).toBeLessThanOrEqual(fit.h);
  expect(fit.right).toBeLessThanOrEqual(fit.w);
  await A.page.screenshot({ path: `test-results/social-away-long-${testInfo.project.name}.png` });

  // đóng màn: lời cảm ơn 🟡 hiện sau (việc khách chỉ báo một lần)
  await away.getByRole('button', { name: /Về làm việc/ }).click();
  await expect(A.page.locator('#toasts')).toContainText(`${B.name} đã`);
  expect(A.errors).toEqual([]);
  await A.context.close(); await B.context.close();
});

test('tắt 🟡 "Bạn bè ghé" trong cài đặt thì không còn thấy; thông báo gấp không có công tắc tắt', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  const A = await player(browser, opts(testInfo, baseURL), ownerGarden);
  const B = await player(browser, opts(testInfo, baseURL), inVillage(GATE_AT.x, GATE_AT.y));
  expect((await A.context.request.post('/api/friends', { data: { name: B.name } })).ok()).toBe(true);   // A ghim B: được báo khi B ghé
  await A.open();
  await closeAway(A.page);
  const b = await B.sock();
  const visitA = async () => {
    b.send({ t: 'join', map: 'village', x: 300, y: 300, dir: 0 }); await b.until('joined');
    b.send({ t: 'join', map: 'farm', owner: A.name, x: 300, y: 300, dir: 0 }); await b.until('joined');
  };
  // còn bật: B ghé là có toast
  await visitA();
  const toast = A.page.locator('#toasts .toast', { hasText: 'vừa ghé thăm' });
  await expect(toast).toContainText(`${B.name} vừa ghé thăm vườn của bạn`);
  await expect(toast).toHaveCount(0, { timeout: 6000 });

  // tắt "Bạn bè ghé": mức gấp chỉ có công tắc khóa, không tắt được
  await A.page.locator('.bb-btn[data-panel="settings"]').click();
  const locked = A.page.locator('.chk.locked input');
  await expect(locked).toBeDisabled();
  await expect(locked).toBeChecked();
  const visit = A.page.locator('input[name="notify-visit"]');
  await expect(visit).toBeChecked();
  await visit.uncheck();
  expect(await st(A.page, () => globalThis.__farm.state.notify)).toEqual({ visit: false });
  await A.page.screenshot({ path: `test-results/social-settings-${testInfo.project.name}.png` });
  await A.page.keyboard.press('Escape');
  await visitA();
  await A.page.waitForTimeout(1500);
  await expect(toast).toHaveCount(0);
  b.close();
  expect(A.errors).toEqual([]);
  await A.context.close(); await B.context.close();
});

test('B đã giúp 49 lần, giúp thêm 1 lần nữa thì thấy huy hiệu "Hàng xóm tốt bụng"', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), ownerGarden);
  const B = await player(browser, opts(testInfo, baseURL), s => { inVillage(GATE_AT.x, GATE_AT.y)(s); s.stats.helps = 49; });
  await B.open();
  await closeAway(B.page);
  await enterGarden(B.page, A.name);
  await tapPlot(B.page, 1, touch, () => st(B.page, () => globalThis.__farm.state.plots[1].water > 50));
  const badge = B.page.locator('#badges .badge[data-id="helper50"]');
  await expect(badge).toBeVisible({ timeout: 15_000 });
  await expect(badge).toContainText('Hàng xóm tốt bụng');
  await expect(badge.locator('canvas.ach-badge')).toBeVisible();   // huy hiệu pixel art riêng
  await B.page.screenshot({ path: `test-results/social-badge-${testInfo.project.name}.png` });
  // danh sách thành tựu: đã mở, thanh tiến độ đầy
  await B.page.waitForTimeout(500);
  expect(await st(B.page, () => globalThis.__farm.state.stats.helps)).toBe(50);
  expect(B.errors).toEqual([]);
  await A.context.close(); await B.context.close();
});
