// Chó Mực canh khách (issue 31): vườn có chó trưởng thành, no và vui thì khách lạ bị phát hiện, chó sủa
// "GÂU GÂU!" rồi đuổi theo ×1.3 tốc độ đi bộ; đuổi kịp là khách rơi hết đồ vừa trộm, đứng hình 3 giây
// và nộp phạt cho chủ. Hai trình duyệt: chủ vườn A và khách B. Luật nằm trong state.js, phần đuổi theo
// chạy trên trình duyệt của khách (khách mới là người đang di chuyển).
import { test, expect } from '@playwright/test';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, closeAway, villageAt } from './helpers.mjs';
import { moveEntity, mapOf, stageStart } from '../public/state.js';
import { FIELD_SIZE, TS } from '../public/layout.js';
import { GUARD, DAY_MS, NIGHT_FROM } from '../public/data.js';
import { villageCal } from '../public/clock.js';

const uniq = () => 'Dg' + Math.random().toString(36).slice(2, 7);
const opts = (testInfo, baseURL) => ({ baseURL, ...testInfo.project.use });
const GATE_AT = { x: 488, y: 364 };   // chỗ đứng trước cổng bạn bè trong làng
const LV5 = 500;
const st = (page, fn, arg) => page.evaluate(fn, arg);
const world = (page, fn) => page.evaluate(fn);

// `night` = giữ giờ làng ban đêm (chó mới ngủ gật được); mặc định giữ ban ngày cho chó tỉnh táo.
// `villageAt` đẩy giờ của trình duyệt lên trước tới cả chục phút, nên bản lưu phải mang đúng giờ đó:
// không thì game tưởng người chơi vắng nhà lâu, chạy bù và hiện màn "Trong lúc bạn vắng nhà" chắn mất đường đi.
async function player(browser, { baseURL, viewport, isMobile, hasTouch }, mutate, night = false) {
  const context = await browser.newContext({ baseURL, viewport, isMobile, hasTouch });
  const frac = night ? 0.78 : 0.1;
  await villageAt(context, frac);
  const name = uniq();
  const invite = (await runAdmin('invite', '--db', E2E_DB)).out;
  expect((await context.request.post('/api/register', { data: { name, pin: '123456', invite } })).ok()).toBe(true);
  const { play } = await (await context.request.post('/api/play', { data: {} })).json();
  const health = await (await context.request.get('/api/health')).json();
  const shift = ((frac - villageCal(health.now).frac + 1) % 1) * DAY_MS;
  const save = makeSave(s => { s.look.shirt = 4; s.exp = LV5; mutate?.(s); s.savedAt = Date.now() + shift; }, { name });
  expect((await context.request.post('/api/farm', { data: { play, save } })).ok()).toBe(true);
  await context.addInitScript(n => {
    try { localStorage.setItem('nongtrai-online', n); localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {}
  }, name);
  const me = { name, context, save, errors: [], page: null };
  me.visit = async n => (await (await context.request.get('/api/visit?name=' + encodeURIComponent(n))).json());
  me.open = async () => {
    const page = me.page = await context.newPage();
    page.on('pageerror', e => me.errors.push(e.message));
    await page.goto('/');
    await page.waitForFunction(() => globalThis.__farm?.state?.mode === 'online');
    await expect(page.locator('#live')).toBeVisible();
    await closeAway(page);
    return page;
  };
  return me;
}

// Vườn chủ: khối ruộng có ô 0 dời ra gần cổng, chuồng chó dời ra xa ruộng `far` ô (mặc định 8, ngoài bán kính
// 6 ô của chó trưởng thành) nên khách trộm ô 0 chưa bị thấy; muốn bị thấy thì đi về phía chó.
function guardGarden(s, opt = {}) {
  s.scene = 'farm';
  s.farm.ents = s.farm.ents.filter(e => !(e.kind === 'tree' && e.c === 42 && e.r === 28));
  Object.assign(s.farm.ents.find(e => e.kind === 'house'), { c: 39, r: 27 });
  s.farm.rev++;
  const id = k => s.farm.ents.find(e => e.kind === k).id;
  for (const [k, c, r] of [['shed', 39, 20], ['shipbin', 33, 22]]) expect(moveEntity(s, id(k), c, r).ok, k).toBe(true);
  // dời khối ruộng có ô 0 tới chỗ hợp lệ gần cổng nhất: khách bước vào là thấy ngay ô chín
  const t0 = mapOf(s).plotTile(0), exit = mapOf(s).arrive.village, o = s.farm.owned, spots = [];
  const field = s.farm.ents.find(e => e.kind === 'field' && t0.c >= e.c && t0.c < e.c + FIELD_SIZE && t0.r >= e.r && t0.r < e.r + FIELD_SIZE);
  for (let r = o.r; r <= o.r + o.h - FIELD_SIZE; r++) for (let c = o.c; c <= o.c + o.w - FIELD_SIZE; c++)
    spots.push({ c, r, d: Math.hypot((c + 1) * TS + 8 - exit.x, (r + 1) * TS + 8 - exit.y) });
  spots.sort((a, b) => a.d - b.d);
  expect(spots.some(q => q.d > TS && moveEntity(s, field.id, q.c, q.r).ok), 'dời khối ruộng ra gần cổng').toBe(true);
  // chuồng chó cách ô 0 chừng `far` ô
  const f0 = mapOf(s).plotTile(0), far = opt.far ?? 8;
  let placed = false;
  for (const d of [far, far + 1, far - 1, far + 2]) for (const [dc, dr] of [[0, -d], [d, -d], [-d, -d], [d, 0], [-d, 0], [d, d], [-d, d], [0, d]])
    if (!placed && moveEntity(s, id('doghouse'), f0.c + dc, f0.r + dr).ok) placed = true;
  expect(placed, 'đặt được chuồng chó').toBe(true);
  Object.assign(s.dog, mapOf(s).dogHome, { stage: 'truong', age: stageStart('cho', 'truong'), hunger: 100, happy: 100, chained: false, cmd: { id: 'sit' } }, opt.dog ?? {});
  const p = s.plots[0];
  p.soil = 'tilled'; p.water = 100; p.weeds = false;
  p.crop = { id: 'cachua', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
  Object.assign(s.player, { x: 600, y: 470, dir: 0 });
}
const guestAt = (x, y) => s => { s.scene = 'village'; Object.assign(s.player, { x, y, dir: 3 }); };

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
    return { x: sx, y: sy };
  }, [x, y]);
  if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
}

// Từ trước cổng bạn bè trong làng: chạm cổng, chọn cổng vườn của chủ rồi bấm Vào (issue 26, 27)
async function enterGarden(page, owner) {
  await expect(page.locator('#target-name')).toHaveText('Cổng bạn bè');
  await page.locator('#main-action').click();
  await expect(page.locator('.sheet-head h2')).toHaveText(/Bạn bè/);
  await page.locator(`.gate-row[data-name="${owner}"] .gate-go`).click();
  await expect.poll(() => st(page, () => globalThis.__farm.state?.scene)).toBe('visit');
  await expect(page.locator('#visit-bar')).toBeVisible();
}
const plotPos = page => st(page, async () => { const { mapOf } = await import('/state.js'); return mapOf(globalThis.__farm.state).plotCenter(0); });
const dogPos = page => st(page, () => ({ x: globalThis.__farm.state.dog.x, y: globalThis.__farm.state.dog.y }));
const playerAt = (page, p) => st(page, ([x, y]) => Math.hypot(globalThis.__farm.state.player.x - x, globalThis.__farm.state.player.y - y), [p.x, p.y]);
// Chó có đang thấy mình không và đang canh bán kính mấy ô (đọc thẳng luật, không thêm hook vào game)
const seesMe = page => st(page, async () => {
  const { dogSees } = await import('/state.js');
  const s = globalThis.__farm.state;
  return s.scene === 'visit' && dogSees(s, s.player);
});
const radius = page => st(page, async () => {
  const { guardRadius } = await import('/state.js');
  return guardRadius(globalThis.__farm.state);
});

// Đi tới sát ô 0 (không bấm hành động chính): chạm cạnh ô cho nhân vật đi lại gần
async function walkToPlot(page, touch) {
  const at = await plotPos(page);
  for (let i = 0; i < 20; i++) {
    if (await playerAt(page, at) < 24) return at;
    await tapWorld(page, touch, at.x - 14, at.y + 2);
    await page.waitForTimeout(500);
  }
  return at;
}
// Đi tới sát con chó (chạm thẳng vào nó cho nhân vật tự đi vào tầm) rồi chờ nút hành động hiện tên Mực
async function reachDog(page, touch) {
  for (let i = 0; i < 24; i++) {
    const nm = page.locator('#target-name');
    if (await nm.isVisible() && (await nm.textContent()) === 'Mực') return;
    const d = await dogPos(page);
    await tapWorld(page, touch, d.x, d.y - 5);
    await page.waitForTimeout(500);
  }
  await expect(page.locator('#target-name')).toHaveText('Mực');
}
// Đi về phía chó cho tới khi nó phát hiện (hay hết lượt thử)
async function approachDog(page, touch, tries = 14) {
  for (let i = 0; i < tries; i++) {
    if (await world(page, () => !!globalThis.__farm.world.guard?.chasing)) return true;
    const d = await dogPos(page);
    await tapWorld(page, touch, d.x, d.y + 20);
    await page.waitForTimeout(450);
  }
  return world(page, () => !!globalThis.__farm.world.guard?.chasing);
}
const stealHere = async page => {
  const main = page.locator('#main-action');
  // quạ của chủ đậu trên ô chín (chó bị xích chỉ canh 3 ô quanh chuồng nên không đuổi quạ xa): đuổi giúp trước rồi mới trộm
  if (/Đuổi quạ/.test((await main.textContent().catch(() => '')) ?? '')) { await main.click(); await page.waitForTimeout(800); }
  await expect(main).toContainText('Trộm');
  await main.click();
};

test('B trộm ô chín rồi bén mảng tới chó: Mực sủa "GÂU GÂU!" và đuổi, B đứng hình, rơi đồ vừa trộm và nộp phạt', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(180_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), guardGarden);
  const B = await player(browser, opts(testInfo, baseURL), guestAt(GATE_AT.x, GATE_AT.y));
  await A.open();   // chủ đang chơi: thao tác của khách đẩy thẳng sang trình duyệt chủ
  await B.open();
  await enterGarden(B.page, A.name);

  // ô chín nằm ngoài bán kính chó: trộm trót lọt trước đã
  await walkToPlot(B.page, touch);
  expect(await seesMe(B.page)).toBe(false);
  await stealHere(B.page);
  await expect.poll(() => st(B.page, () => globalThis.__farm.state.basket.cachua ?? 0), { timeout: 20_000 }).toBe(1);
  const coins0 = await st(B.page, () => globalThis.__farm.state.coins);

  // đi về phía chó: nó phát hiện, sủa "GÂU GÂU!" rồi đuổi theo
  expect(await approachDog(B.page, touch)).toBe(true);
  expect(await world(B.page, () => globalThis.__farm.world.rt.get('dog')?.bark)).toBe(true);
  await B.page.screenshot({ path: `test-results/dog-bark-${testInfo.project.name}.png` });

  // A đang chơi: băng rôn báo gấp 🔴 "Mực đang sủa ở phía ... vườn!" và chó sủa được ghi vào vườn A.
  // (Chỗ gấp cho mũi tên tắt sau GUARD.barkShowMs = 15 giây giờ thật, mà e2e cố tình chỉnh lệch giờ
  //  làng để giữ ban ngày, nên phần mũi tên kiểm ở test seam 1 `urgentSpots` / `todoList`.)
  await expect(A.page.locator('#alert-banner')).toContainText(/Mực đang sủa ở phía/, { timeout: 20_000 });
  expect(await st(A.page, () => globalThis.__farm.state.stats.barks)).toBe(1);
  await A.page.screenshot({ path: `test-results/dog-owner-alert-${testInfo.project.name}.png` });

  // B đứng im nên chó đuổi kịp: đứng hình 3 giây, rơi hết cà chua vừa trộm, nộp phạt cho chủ
  await expect.poll(() => st(B.page, () => !!globalThis.__farm.state.visit?.bitten), { timeout: 30_000 }).toBe(true);
  expect(await world(B.page, () => globalThis.__farm.world.stun)).toBeGreaterThan(GUARD.biteStunMs - 1500);
  await B.page.screenshot({ path: `test-results/dog-bite-${testInfo.project.name}.png` });
  await expect.poll(() => st(B.page, () => globalThis.__farm.state.basket.cachua ?? 0), { timeout: 15_000 }).toBe(0);
  expect(await st(B.page, () => globalThis.__farm.state.coins)).toBe(coins0 - GUARD.fine);

  // nhật ký khách của A có dòng chó đớp, chủ nhận tiền phạt và đếm được số người đã đuổi
  await expect.poll(() => st(A.page, () => globalThis.__farm.state.stats.chased ?? 0), { timeout: 20_000 }).toBe(1);
  await A.page.locator('.bb-btn[data-panel="log"]').click();
  await expect(A.page.locator(`.guest-row[data-by="${B.name}"]`).first()).toContainText(new RegExp(`bị Mực đớp`));
  await expect(A.page.locator('.sheet-body')).toContainText('sủa vang');
  await A.page.screenshot({ path: `test-results/dog-log-${testInfo.project.name}.png` });
  expect(A.errors.concat(B.errors)).toEqual([]);
  await A.context.close(); await B.context.close();
});

test('B chạy kịp ra cổng thì thoát và giữ đồ đã trộm', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(180_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), s => guardGarden(s, { far: 10 }));
  const B = await player(browser, opts(testInfo, baseURL), guestAt(GATE_AT.x, GATE_AT.y));
  await B.open();
  await enterGarden(B.page, A.name);
  await walkToPlot(B.page, touch);
  await stealHere(B.page);
  await expect.poll(() => st(B.page, () => globalThis.__farm.state.basket.cachua ?? 0), { timeout: 20_000 }).toBe(1);

  // bước về phía chó cho nó phát hiện, rồi quay đầu chạy ngay: cổng ở sát ô ruộng nên thoát kịp
  const d = await dogPos(B.page);
  await tapWorld(B.page, touch, d.x, d.y + 20);
  for (let i = 0; i < 60 && !(await world(B.page, () => !!globalThis.__farm.world.guard?.chasing)); i++) await B.page.waitForTimeout(150);
  expect(await world(B.page, () => !!globalThis.__farm.world.guard?.chasing)).toBe(true);
  await B.page.locator('#visit-leave').click();
  await expect.poll(() => st(B.page, () => globalThis.__farm.state?.scene), { timeout: 40_000 }).toBe('village');
  expect(await st(B.page, () => globalThis.__farm.state.basket.cachua ?? 0)).toBe(1);
  expect(await st(B.page, () => !!globalThis.__farm.state.visit)).toBe(false);
  await B.page.screenshot({ path: `test-results/dog-escape-${testInfo.project.name}.png` });
  expect(B.errors).toEqual([]);
  await A.context.close(); await B.context.close();
});

test('ban đêm Mực ngủ gật 💤: B đứng xa 1 ô không bị phát hiện; ném xúc xích cho chó đói thì chó im lặng', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(180_000);
  const touch = !!testInfo.project.use.hasTouch;
  // bản lưu ghi sẵn: giờ làng ban đêm, Mực đang ngủ một giấc dài, bụng lưng lửng (dưới 50 là chắc chắn ăn xúc xích)
  const night = s => {
    s.time = Math.ceil(NIGHT_FROM * DAY_MS) + 1000;
    guardGarden(s, { far: 4, dog: { cmd: null, hunger: 40, nap: s.time + 30 * 60_000, napCheck: s.time + 30 * 60_000 } });
  };
  const A = await player(browser, opts(testInfo, baseURL), night, true);
  const B = await player(browser, opts(testInfo, baseURL), s => { guestAt(GATE_AT.x, GATE_AT.y)(s); s.inv.sausage = 2; }, true);
  await A.open();   // chủ đang chơi: thao tác của khách đẩy thẳng sang trình duyệt chủ
  await B.open();
  await enterGarden(B.page, A.name);

  // chó ngủ gật: bán kính canh còn đúng 1 ô nên đứng cách 4 ô ở ô chín là trộm thoải mái
  await walkToPlot(B.page, touch);
  expect(await radius(B.page)).toBe(GUARD.napRadius);
  expect(await seesMe(B.page)).toBe(false);
  await B.page.screenshot({ path: `test-results/dog-nap-${testInfo.project.name}.png` });
  await stealHere(B.page);
  await expect.poll(() => st(B.page, () => globalThis.__farm.state.basket.cachua ?? 0), { timeout: 20_000 }).toBe(1);

  // tới sát chó ném xúc xích: đứng sát bên thì chó ngủ vẫn giật mình đớp một cái, cứ chờ hết đứng hình rồi ném.
  // Chó đói dưới 50 thì chắc chắn ăn, im lặng 60 giây (bán kính canh về 0).
  const quiet = () => st(B.page, () => (globalThis.__farm.state.dog.quiet || 0) > Date.now());
  for (let i = 0; i < 10 && !(await quiet()); i++) {
    await reachDog(B.page, touch);
    if (await world(B.page, () => globalThis.__farm.world.stun > 0)) { await B.page.waitForTimeout(1200); continue; }
    const chip = B.page.locator('#chips .chip', { hasText: 'Ném xúc xích' });
    if (await chip.count()) await chip.click().catch(() => {});
    await B.page.waitForTimeout(800);
  }
  expect(await quiet()).toBe(true);
  expect(await radius(B.page)).toBe(0, 'chó mải ăn xúc xích thì không canh ai nữa');
  expect(await seesMe(B.page)).toBe(false);
  await expect.poll(() => st(B.page, () => globalThis.__farm.state.inv.sausage ?? 0), { timeout: 15_000 }).toBe(1);
  await B.page.screenshot({ path: `test-results/dog-sausage-${testInfo.project.name}.png` });

  // chủ đang chơi cũng phải thấy: Mực của A mải ăn nên im lặng, nhật ký ghi dòng ném xúc xích
  await expect.poll(() => st(A.page, () => (globalThis.__farm.state.dog.quiet || 0) > Date.now()), { timeout: 20_000 }).toBe(true);
  await A.page.locator('.bb-btn[data-panel="log"]').click();
  await expect(A.page.locator('.sheet-body')).toContainText('ném xúc xích');
  expect(A.errors.concat(B.errors)).toEqual([]);
  await A.context.close(); await B.context.close();
});

test('A xích Mực vào chuồng: B trộm ô ngoài 3 ô quanh chuồng thì không bị phát hiện', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(180_000);
  const touch = !!testInfo.project.use.hasTouch;
  const A = await player(browser, opts(testInfo, baseURL), s => guardGarden(s, { far: 5 }));
  const B = await player(browser, opts(testInfo, baseURL), guestAt(GATE_AT.x, GATE_AT.y));

  // A đang chơi, chạm vào Mực rồi bấm nút "Xích Mực vào chuồng" (chó chạy lung tung, hụt thì chạm lại)
  await A.open();
  const chained = () => st(A.page, () => !!globalThis.__farm.state.dog.chained);
  for (let i = 0; i < 10 && !(await chained()); i++) {
    await reachDog(A.page, touch);
    await A.page.locator('#chips .chip', { hasText: 'Xích Mực' }).click({ timeout: 2000 }).catch(() => {});
    await A.page.waitForTimeout(400);
  }
  expect(await chained()).toBe(true);
  await A.page.screenshot({ path: `test-results/dog-chain-${testInfo.project.name}.png` });
  // chờ bản lưu của A lên tới server thì khách mới thấy con chó đã bị xích
  await expect.poll(() => A.visit(A.name).then(r => !!r.farm?.dog?.chained), { timeout: 30_000 }).toBe(true);

  // B vào: ô chín cách chuồng 5 ô, ngoài vùng xích 3 ô nên trộm không bị phát hiện
  await B.open();
  await enterGarden(B.page, A.name);
  expect(await st(B.page, () => globalThis.__farm.state.dog.chained)).toBe(true);
  await walkToPlot(B.page, touch);
  expect(await radius(B.page)).toBe(GUARD.chainRadius);
  expect(await seesMe(B.page)).toBe(false, 'ngoài 3 ô quanh chuồng thì sợi xích không với tới');
  await stealHere(B.page);
  await expect.poll(() => st(B.page, () => globalThis.__farm.state.basket.cachua ?? 0), { timeout: 20_000 }).toBe(1);
  await B.page.waitForTimeout(1500);
  expect(await st(B.page, () => !!globalThis.__farm.state.visit?.bitten)).toBe(false);
  expect(A.errors.concat(B.errors)).toEqual([]);
  await A.context.close(); await B.context.close();
});
