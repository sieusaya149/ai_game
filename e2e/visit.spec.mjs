// Thăm vườn bạn (issue 27): từ cổng bạn bè trong làng bước vào vườn người khác, đi bộ thật trong đó, chỉ đọc.
// Hai trình duyệt: chủ vườn A (đang ở vườn mình) và khách B. Dựng tình huống qua API công khai của server
// (đăng ký, xin phiên chơi, gửi bản lưu ghi sẵn), mã mời bằng lệnh quản trị.
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, closeAway, plantedCrop } from './helpers.mjs';
import { moveEntity, mapOf } from '../public/state.js';

const uniq = () => 'Vt' + Math.random().toString(36).slice(2, 7);
const opts = (testInfo, baseURL) => ({ baseURL, ...testInfo.project.use });
const GATE_AT = { x: 488, y: 364 };   // chỗ đứng trước cổng bạn bè trong làng

// Tài khoản mới có vườn ghi sẵn trên server; open = mở trình duyệt chơi luôn (không thì chủ vườn đang offline)
async function player(browser, { baseURL, viewport, isMobile, hasTouch }, mutate, open = true) {
  const context = await browser.newContext({ baseURL, viewport, isMobile, hasTouch });
  const name = uniq();
  const invite = (await runAdmin('invite', '--db', E2E_DB)).out;
  expect((await context.request.post('/api/register', { data: { name, pin: '123456', invite } })).ok()).toBe(true);
  const { play } = await (await context.request.post('/api/play', { data: {} })).json();
  const save = makeSave(s => { s.look.shirt = 4; mutate?.(s); }, { name });
  expect((await context.request.post('/api/farm', { data: { play, save } })).ok()).toBe(true);
  if (!open) return { name, context, save };
  await context.addInitScript(n => {
    try { localStorage.setItem('nongtrai-online', n); localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {}
  }, name);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state?.mode === 'online');
  await closeAway(page);
  await expect(page.locator('#live')).toBeVisible();
  return { name, context, page, save, errors };
}

// Vườn của chủ: nhà, kho, thùng giao hàng, chuồng chó dời gần cổng (cho khách đi ít), một ô cà rốt đang lớn, chủ đứng gần cổng
function ownerGarden(s) {
  s.scene = 'farm';
  s.farm.ents = s.farm.ents.filter(e => !(e.kind === 'tree' && e.c === 42 && e.r === 28));
  Object.assign(s.farm.ents.find(e => e.kind === 'house'), { c: 39, r: 27 });   // nhà không dời được bằng tay: bản lưu ghi sẵn
  s.farm.rev++;
  const id = k => s.farm.ents.find(e => e.kind === k).id;
  for (const [k, c, r] of [['shed', 39, 20], ['shipbin', 33, 22], ['doghouse', 43, 31]]) expect(moveEntity(s, id(k), c, r).ok, k).toBe(true);
  Object.assign(s.dog, mapOf(s).dogHome);
  plantedCrop(s, 0, 0.6); s.plots[0].crop.id = 'carot';
  Object.assign(s.player, { x: 600, y: 470, dir: 0 });
}
const guestAt = (x, y, extra) => s => { s.scene = 'village'; Object.assign(s.player, { x, y, dir: 3 }); extra?.(s); };

const st = (page, fn) => page.evaluate(fn);
const peers = page => page.evaluate(() => globalThis.__farm.peers.map(p => ({ name: p.name, x: p.x, y: p.y })));

// Chạm điểm (x, y) của bản đồ: ngoài màn hình thì chạm về phía đó cho nhân vật đi tới (tránh HUD, thanh dưới, bản đồ nhỏ)
async function tapWorld(page, touch, x, y) {
  const pt = await page.evaluate(([wx, wy]) => {
    const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
    const top = document.getElementById('hud').getBoundingClientRect().bottom + 30, bot = document.getElementById('bottombar').getBoundingClientRect().top - 30;
    const mini = document.getElementById('mini-wrap').getBoundingClientRect();
    let sx = (wx * f.scale - f.view.camX) / f.dpr + rc.left, sy = (wy * f.scale - f.view.camY) / f.dpr + rc.top;
    const ok = sx > 30 && sx < innerWidth - 30 && sy > top && sy < bot && !(sx > mini.left - 14 && sy < mini.bottom + 14);
    if (!ok) {
      sx = Math.min(innerWidth - 60, Math.max(60, sx)); sy = Math.min(bot - 20, Math.max(top + 20, sy));
      if (sx > mini.left - 30 && sy < mini.bottom + 30) sy = Math.min(bot - 20, mini.bottom + 40);
    }
    return { x: sx, y: sy, ok };
  }, [x, y]);
  if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
  return pt.ok;
}
// Chạm về phía chỗ đứng (x, y) cho tới khi đứng cạnh thứ có tên `name` (nút hành động hiện tên đó)
async function reach(page, touch, x, y, name) {
  for (let i = 0; i < 25; i++) {
    if (await page.locator('#target-name').isVisible() && (await page.locator('#target-name').textContent()).startsWith(name)) return;   // ô ruộng có cây kèm sao (issue 52): 'Cà chua ★☆☆'
    await tapWorld(page, touch, x, y);
    await page.waitForTimeout(600);
  }
  throw new Error(`không tới được ${name}`);
}
// Từ trước cổng bạn bè trong làng: chạm cổng, chọn cổng vườn của chủ trong danh sách (issue 26), bấm Vào
async function enterGarden(page, owner) {
  await expect(page.locator('#target-name')).toHaveText('Cổng bạn bè');
  await page.locator('#main-action').click();
  await expect(page.locator('.sheet-head h2')).toHaveText(/Bạn bè/);
  await page.locator(`.gate-row[data-name="${owner}"] .gate-go`).click();
  await expect.poll(() => st(page, () => globalThis.__farm.state?.scene)).toBe('visit');
  await expect(page.locator('#visit-bar')).toBeVisible();
  await expect(page.locator('#visit-owner')).toHaveText(owner);
}
const noOverlap = (a, b) => a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t;
const boxOf = (page, sel) => page.evaluate(sel => [...document.querySelectorAll(sel)].map(e => { const b = e.getBoundingClientRect(); return { sel, l: b.left, t: b.top, r: b.right, b: b.bottom }; }).filter(b => b.r > b.l), sel);

test('B từ làng bước vào vườn A: thấy đúng vườn, A thấy B đi lại và nhận thông báo, B ra cổng về đúng chỗ ở làng', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), ownerGarden);
  const B = await player(browser, opts(testInfo, baseURL), guestAt(GATE_AT.x, GATE_AT.y));
  expect((await A.context.request.post('/api/friends', { data: { name: B.name } })).ok()).toBe(true);   // A ghim B: được báo khi B ghé
  await enterGarden(B.page, A.name);

  // B thấy đúng vườn A: cây cà rốt đang lớn, đàn gà, nhà dời sẵn; đứng ngay trong cổng
  const seen = await st(B.page, () => { const s = globalThis.__farm.state; return { owner: s.visit.owner, crop: s.plots[0].crop?.id, progress: s.plots[0].crop?.progress, animals: s.animals.map(a => a.type), house: s.farm.ents.find(e => e.kind === 'house'), p: { x: s.player.x, y: s.player.y }, name: s.name }; });
  expect(seen.owner).toBe(A.name);
  expect(seen.name).toBe(B.name);
  expect(seen.crop).toBe('carot');
  expect(seen.progress).toBeGreaterThanOrEqual(0.6);
  expect(seen.animals).toEqual(A.save.animals.map(a => a.type));
  expect([seen.house.c, seen.house.r]).toEqual([39, 27]);
  expect(seen.p).toEqual({ x: 592, y: 538 });
  await expect(B.page.locator('#bb-build')).toBeHidden();

  // A đang ở vườn: thấy B, nhận thông báo B ghé; B thấy A
  await expect.poll(() => peers(A.page).then(l => l.map(p => p.name))).toEqual([B.name]);
  await expect(A.page.locator('#toasts')).toContainText(`${B.name} vừa ghé thăm vườn của bạn`);
  await expect.poll(() => peers(B.page).then(l => l.map(p => p.name))).toEqual([A.name]);

  // B đi lên theo đường đất: A thấy B đi
  const y0 = (await peers(A.page))[0].y;
  await B.page.keyboard.down('ArrowUp');
  await B.page.waitForTimeout(700);
  await B.page.keyboard.up('ArrowUp');
  await expect.poll(() => peers(A.page).then(l => l[0]?.y)).toBeLessThan(y0 - 20);
  await B.page.screenshot({ path: `test-results/visit-guest-${testInfo.project.name}.png` });
  await A.page.screenshot({ path: `test-results/visit-owner-${testInfo.project.name}.png` });

  // 360px: thanh "Vườn của A" và nút về làng không đè bản đồ nhỏ, cột làng, nút hành động; không tràn ngang
  const bar = (await boxOf(B.page, '#visit-bar'))[0], leave = (await boxOf(B.page, '#visit-leave'))[0];
  expect(leave.b - leave.t).toBeGreaterThanOrEqual(36);
  for (const sel of ['#mini-wrap', '#live .live-btn', '#main-action', '#chips .chip', '#joy-base', '#hud-speed', '#todo-btn'])
    for (const o of await boxOf(B.page, sel)) expect(noOverlap(bar, o), `#visit-bar đè ${sel}`).toBe(true);
  expect(await B.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  // B bấm Về làng: tự đi ra cổng, về làng đúng chỗ đứng trước cổng bạn bè; A thấy B rời vườn
  await B.page.locator('#visit-leave').click();
  await expect.poll(() => st(B.page, () => globalThis.__farm.state.scene), { timeout: 20_000 }).toBe('village');
  expect(await st(B.page, () => { const p = globalThis.__farm.state.player; return { x: p.x, y: p.y }; })).toEqual(GATE_AT);
  await expect(B.page.locator('#visit-bar')).toBeHidden();
  await expect.poll(() => peers(A.page)).toEqual([]);
  // vườn A trên server không đổi vì B (cây vẫn là cây của A, không có gì của B)
  const farmA = await (await A.context.request.get('/api/farm')).json();
  expect(farmA.farm.name).toBe(A.name);
  expect(A.errors.concat(B.errors)).toEqual([]);
  await A.context.close(); await B.context.close();
});

test('B trong vườn A: nhà, thùng giao hàng, kho bị chặn kèm lý do, không có xây dựng; chó lạ phải cho ăn mới cho vuốt', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), ownerGarden, false);   // chủ đang offline
  const B = await player(browser, opts(testInfo, baseURL), guestAt(GATE_AT.x, GATE_AT.y, s => { s.basket = { dogfood: 2 }; }));
  const { page } = B;
  await enterGarden(page, A.name);
  await expect(page.locator('#bb-build')).toBeHidden();

  // chạm vào nhà, thùng giao hàng, kho: chỉ hiện lý do, không mở bảng, không vào nhà
  for (const [id, name, why] of [
    ['house', 'Nhà', 'Đây là nhà riêng của chủ vườn'],
    ['shipbin', 'Thùng giao hàng', 'Thùng giao hàng của chủ vườn'],
    ['shed', 'Nhà kho', 'Kho riêng của chủ vườn'],
  ]) {
    const at = await page.evaluate(async id => { const { sceneMap } = await import('/state.js'); return sceneMap(globalThis.__farm.state).building(id).at; }, id);
    await reach(page, touch, at.x, at.y, name);
    await expect(page.locator('#main-action')).toHaveClass(/disabled/);
    await page.locator('#main-action').click();
    await expect(page.locator('#toasts')).toContainText(why);
    await expect(page.locator('#panel-root')).toBeHidden();
    expect(await st(page, () => globalThis.__farm.state.scene)).toBe('visit');
  }
  await page.screenshot({ path: `test-results/visit-blocked-${testInfo.project.name}.png` });

  // chó lạ: chạm vào thì không cho vuốt; cho ăn (xương trong giỏ của B) rồi thì vuốt được
  const dogName = A.save.dog.name;
  const nearDog = async () => {
    for (let i = 0; i < 12; i++) {
      const d = await st(page, () => globalThis.__farm.state.dog);
      await tapWorld(page, touch, d.x, d.y - 6);
      try { await expect(page.locator('#target-name')).toContainText(dogName, { timeout: 2500 }); return; } catch { /* chó chạy đi: chạm lại */ }
    }
    throw new Error('không tới được chỗ chó');
  };
  // lại gần chó rồi bấm nút (chó hay chạy lăng xăng: ra khỏi tầm thì lại gần lần nữa)
  const onDog = async (btn, label) => {
    for (let i = 0; i < 8; i++) {
      await nearDog();
      try { await expect(btn).toContainText(label, { timeout: 1000 }); await btn.click({ timeout: 1500 }); return; } catch { /* chó chạy khỏi tầm */ }
    }
    throw new Error(`không bấm được ${label}`);
  };
  await onDog(page.locator('#main-action'), 'Vuốt ve');
  await expect(page.locator('#toasts')).toContainText(`${dogName} chưa quen bạn`);
  expect(await st(page, () => globalThis.__farm.state.visit.fed)).toBe(false);
  // bấm trúng lúc chó vừa chạy khỏi tầm thì chưa cho ăn được: bấm lại tới khi giỏ hao đi
  await expect.poll(async () => {
    if (!(await st(page, () => globalThis.__farm.state.visit.fed))) await onDog(page.locator('#chips .chip', { hasText: `Cho ${dogName} ăn` }), 'Cho');
    return st(page, () => globalThis.__farm.state.basket.dogfood);
  }, { timeout: 30_000 }).toBe(1);
  expect(await st(page, () => globalThis.__farm.state.visit.fed)).toBe(true);
  await expect.poll(async () => {
    await onDog(page.locator('#main-action:not(.disabled)'), 'Vuốt ve');
    return st(page, () => globalThis.__farm.world.emotes.has('dog'));
  }, { timeout: 30_000 }).toBe(true);
  expect(B.errors).toEqual([]);
  await A.context.close(); await B.context.close();
});
