import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { E2E_DB } from '../playwright.config.mjs';
import { runAdmin } from '../tests/helpers/server.mjs';
import { makeSave, seedSave, plantedCrop, closeAway } from './helpers.mjs';
import { mapOf, roamOf, createGame, stageStart, sceneMap } from '../public/state.js';
import { DAY_MS, TRICKS } from '../public/data.js';

// Rà giao diện điện thoại: ở 360x740 (và 320x640, 412x915) mở từng màn/bảng rồi kiểm tra
// không cuộn ngang, nút nào cũng nằm trong màn hình và đủ to, các lớp nổi không đè lên nhau,
// và (giả lập tai thỏ bằng cách đè --sl/--sr/--st/--sb) mọi nút nằm trong vùng an toàn.
// Chỉ giả lập: không có điện thoại thật. Ảnh chụp ở test-results/m360/.
const SIZES = [[360, 740], [320, 640], [412, 915]];
const MIN = 40;
const NOTCH = { l: 0, r: 0, t: 47, b: 34 };   // điện thoại dọc có tai thỏ (iPhone: trên 47, dưới 34)

const ready = async page => { await page.waitForFunction(() => globalThis.__farm?.state); await page.keyboard.press('Shift'); };
const v1 = () => { const o = JSON.parse(readFileSync(new URL('../tests/fixtures/v1-mid.json', import.meta.url), 'utf8')); o.savedAt = Date.now(); return o; };
const open = (page, id) => page.evaluate(async id => (await import('/ui.js')).openPanel(id), id);

// Chạy trong trang: trả về danh sách lỗi bố cục. insets = vùng an toàn giả lập (hoặc null).
function measure({ insets, minSize }) {
  const vw = innerWidth, vh = innerHeight, out = [];
  const name = e => (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '') + ' "' + (e.textContent || e.title || '').trim().slice(0, 18) + '"';
  const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  if (sw > vw) out.push(`cuộn ngang: scrollWidth ${sw} > ${vw}`);
  // vùng cuộn thật sự đang cuộn được theo trục đó (thanh tab, khay, thân bảng...)
  const scroller = (e, ax) => { for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p)[ax === 'x' ? 'overflowX' : 'overflowY']; if ((o === 'auto' || o === 'scroll') && (ax === 'x' ? p.scrollWidth > p.clientWidth + 1 : p.scrollHeight > p.clientHeight + 1)) return p; } return null; };
  for (const p of document.querySelectorAll('#ui *')) if (!p.matches('.tabs, .bt-list, [hidden], [hidden] *') && ['auto', 'scroll'].includes(getComputedStyle(p).overflowX) && p.scrollWidth > p.clientWidth + 1 && p.getClientRects().length) out.push('vùng cuộn ngang ngoài ý muốn: ' + name(p));
  const sel = 'button, input:not([type=checkbox]), select, a[href], .chk, #hud .pill';
  const box = insets ? { l: insets.l, r: vw - insets.r, t: insets.t, b: vh - insets.b } : { l: 0, r: vw, t: 0, b: vh };
  for (const e of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (e.closest('#fade, [hidden], .confetti')) continue;
    if (e.closest('.toast, .badge')) continue;
    const sx = scroller(e, 'x'), sy = scroller(e, 'y');
    const rx = sx ? sx.getBoundingClientRect() : r, ry = sy ? sy.getBoundingClientRect() : r;
    // phần nằm ngoài vùng cuộn dọc/ngang: cuộn tới được nên bỏ qua
    if (sy && (r.bottom <= ry.top || r.top >= ry.bottom)) continue;
    if (sx && (r.right <= rx.left || r.left >= rx.right)) continue;
    const bad = [];
    // trục cuộn được: vùng cuộn phải nằm trong màn hình (phần đệm vùng an toàn là việc của vùng đó)
    const bx = sx ? { l: 0, r: vw } : box, by = sy ? { t: 0, b: vh } : box;
    if (rx.left < bx.l - 0.5 || rx.right > bx.r + 0.5) bad.push(`ngoài ngang [${Math.round(rx.left)},${Math.round(rx.right)}]`);
    if (ry.top < by.t - 0.5 || ry.bottom > by.b + 0.5) bad.push(`ngoài dọc [${Math.round(ry.top)},${Math.round(ry.bottom)}]`);
    if (e.scrollWidth > e.clientWidth + 1 && !e.matches('input, .tabs, .bt-list, #todo-btn, .bb-btn') && cs.overflowX !== 'auto') bad.push('chữ tràn khỏi nút');
    if (!insets && (r.width < minSize - 0.5 || r.height < minSize - 0.5)) bad.push(`nhỏ ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (bad.length) out.push(name(e) + ' ' + bad.join('; '));
  }
  for (const e of document.querySelectorAll('.bb-lbl')) if (e.getClientRects().length && e.scrollWidth > e.parentElement.clientWidth + 1) out.push('nhãn thanh dưới tràn: ' + name(e));
  // các lớp nổi không đè lên nhau
  const L = {
    hud: [...document.querySelectorAll('#hud .card, #hud .pill, #hud #tutorial')],
    mini: [document.getElementById('minimap'), document.getElementById('todo-btn'), document.getElementById('hud-speed')],
    joy: [document.getElementById('joy-base')],
    act: [...document.querySelectorAll('#main-action, #chips .chip, #target-name')],
    banner: [document.getElementById('alert-banner')],
  };
  // phần đang thấy được: chip trong danh sách cuộn dọc (#chips trên màn thấp) chỉ tính phần nằm trong khung cuộn
  const vis = e => {
    if (!e || e.closest('[hidden]') || getComputedStyle(e).display === 'none') return null;
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null;
    const sy = scroller(e, 'y'); if (!sy) return r;
    const c = sy.getBoundingClientRect(), top = Math.max(r.top, c.top), bottom = Math.min(r.bottom, c.bottom);
    return bottom - top > 1 ? { left: r.left, right: r.right, top, bottom } : null;
  };
  const keys = Object.keys(L);
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    if (keys[i] === 'hud' && keys[j] === 'banner') continue;   // băng rôn đẩy HUD xuống
    for (const a of L[keys[i]]) for (const b of L[keys[j]]) {
      const ra = vis(a), rb = vis(b);
      if (ra && rb && ra.left < rb.right - 1 && rb.left < ra.right - 1 && ra.top < rb.bottom - 1 && rb.top < ra.bottom - 1) out.push(`đè nhau: ${name(a)} với ${name(b)}`);
    }
  }
  if (document.body.classList.contains('alerting')) { const b = vis(document.getElementById('alert-banner')), h = vis(document.getElementById('hud')); if (b && h && h.top < b.bottom - 1) out.push('HUD đè băng rôn'); }
  return out;
}

async function audit(page, label, size, shot) {
  const [w, h] = size;
  mkdirSync('test-results/m360', { recursive: true });
  // máy bận thì hoạt ảnh và việc tính lại vị trí bản đồ nhỏ xong chậm: đo lại tới khi bố cục ổn định
  const check = (insets, why) => expect.poll(() => page.evaluate(measure, { insets, minSize: MIN }), { message: why, timeout: 6000, intervals: [200, 300, 500] }).toEqual([]);
  await page.waitForTimeout(350);   // hoạt ảnh trượt lên
  await page.screenshot({ path: `test-results/m360/${w}-${label}.png` });
  await check(null, `${label} ${w}x${h}`);
  // giả lập tai thỏ
  await page.addStyleTag({ content: `:root{--sl:${NOTCH.l}px!important;--sr:${NOTCH.r}px!important;--st:${NOTCH.t}px!important;--sb:${NOTCH.b}px!important}` }).then(h => h.evaluate(e => (e.id = 'fake-notch')));
  await page.waitForTimeout(450);   // HUD tính lại vị trí bản đồ nhỏ
  if (shot) await page.screenshot({ path: `test-results/m360/${w}-${label}-notch.png` });
  await check(NOTCH, `${label} ${w}x${h} (tai thỏ)`);
  await page.evaluate(() => document.getElementById('fake-notch')?.remove());
}

// người chơi đứng cạnh ô cải chín: hiện nút hành động chính và các chip
const nearRipe = s => { plantedCrop(s, 0, 1); const p = mapOf(s).plotCenter(0); Object.assign(s.player, { x: p.x, y: p.y + 14 }); };
const crowSave = () => makeSave(s => {
  plantedCrop(s, 0, 1); s.weather = 'rain';
  s.threats = [{ id: 901, kind: 'crow', plot: 0, x: 600, y: 248, arriveAt: 0, state: 'eating', since: s.time + 40_000 }];
  Object.assign(s.player, { x: 560, y: 540, dir: 1 });
});
const busy = s => { s.coins = 1234567; s.can = 3; s.name = 'Nguyễn Văn Tèo Tèo Tèo'.slice(0, 20); s.exp = 5; nearRipe(s); for (let i = 1; i < 6; i++) { plantedCrop(s, i, 0.3); s.plots[i].water = 0; } };

// ---- Phase 2 vật nuôi (issue 49): dựng bằng bản lưu ghi sẵn ----
const TS = 16;
const LV4 = 25 + 70 + 129 + 10;   // cấp 4: đã nuôi được heo, mèo; chưa có kẻ săn mồi, trộm NPC (bảo hộ người mới tới cấp 5)
const hen = (s, extra) => {
  const tpl = createGame().animals.find(a => a.type === 'ga');
  const a = { ...structuredClone(tpl), id: s.nextId++, sex: 'f', stage: 'truong', age: stageStart('ga', 'truong'), nextProduct: 1e15, ready: false,
    pen: s.farm.ents.find(e => e.kind === 'pen' && e.pen === 'chicken')?.id ?? null, ...extra };
  s.animals.push(a);
  return a;
};
// ô thả rông gần chỗ sinh nhất (chắc chắn hợp lệ cho con vật ngủ ngoài)
const nearTile = s => { const sp = mapOf(s).spawn; return [...roamOf(s).tiles].sort((a, b) => Math.hypot(a.c * TS - sp.x, a.r * TS - sp.y) - Math.hypot(b.c * TS - sp.x, b.r * TS - sp.y))[0]; };
// Nửa đêm, một con gà mái lạc ngủ ngoài ngay trước mặt người chơi (con lạc nằm yên một chỗ nên thanh hành động không đổi)
const strayHen = (extra, mutate) => {
  const s = makeSave(s => {
    s.exp = LV4; s.coins = 5000; s.orders = []; s.nextOrderAt = 1e15; s.time = DAY_MS * 0.78; s.duskDay = s.day; s.weather = 'sun';
    for (const a of s.animals) a.nextProduct = 1e15;
    s.animals = s.animals.filter(a => a.type !== 'ga');   // bỏ hai gà mặc định: khỏi giành mục tiêu với con lạc
    const t = nearTile(s);
    hen(s, { name: 'Mái Mơ Lúa Vàng', tile: { ...t }, tileAt: s.time + 1e9, x: t.c * TS + 8, y: t.r * TS + 8, stray: true, ...extra });
    Object.assign(s.player, { x: t.c * TS + 8, y: t.r * TS + 8 + 12, dir: 0 });
    mutate?.(s);
  });
  s.savedAt = Date.now();   // khỏi chạy bù lúc mở trang
  return s;
};
// Đứng sát con gà lạc (ô của nó chắc chắn đi được) cho tới khi nó là mục tiêu đang chọn
const standByHen = page => expect(async () => {
  await page.evaluate(() => { const s = globalThis.__farm.state, a = s.animals.find(x => x.name === 'Mái Mơ Lúa Vàng'); s.player.x = a.x; s.player.y = a.y + 6; });
  await expect(page.locator('#target-name')).toBeVisible({ timeout: 1000 });
  await expect(page.locator('#target-name')).toContainText('Mái Mơ', { timeout: 500 });
}).toPass({ timeout: 15_000 });
// Đóng hộp thoại đang mở bằng nút "Thôi"
const dismiss = async page => {
  await page.locator('#dialog-root .btn', { hasText: 'Thôi' }).click();
  await expect(page.locator('#dialog-root')).toBeHidden();
};
// Chữ vẽ trên canvas ở làng (biển "Chợ Bà Tư", chữ "Đóng cửa" trên bảng của chợ): khung chữ theo px CSS, tính đúng như render.js
const villageSigns = page => page.evaluate(async () => {
  const { sceneMap, marketOpen } = await import('/state.js'), { buildingImg } = await import('/render.js');
  const f = globalThis.__farm, s = f.state, b = sceneMap(s).building('market'), img = buildingImg(b);
  const cv = document.createElement('canvas').getContext('2d'), FONT = "'Nunito', system-ui, sans-serif";
  const css = (wx, wy) => ({ x: (wx * f.scale - f.view.camX) / f.dpr, y: (wy * f.scale - f.view.camY) / f.dpr });
  const box = (text, at, size, up, maxW = Infinity) => { cv.font = `800 ${size}px ${FONT}`; const w = Math.min(maxW, cv.measureText(text).width); return { text, l: at.x - w / 2, r: at.x + w / 2, t: at.y - size * up, b: at.y + size * (1 - up) }; };
  const k = f.scale / f.dpr, lab = css(b.x + img.width / 2, b.y);
  const out = [box('Chợ Bà Tư', { x: lab.x, y: lab.y - 3 * k }, 11, 0.85)];
  if (!marketOpen(s)) out.push(box('Đóng cửa', css(b.x + 24, b.y + 31), 5.5 * k, 0.5, 20 * k));
  return out;
});

for (const size of SIZES) {
  test.describe(`${size[0]}x${size[1]}`, () => {
    test.use({ viewport: { width: size[0], height: size[1] }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test.beforeEach(({}, ti) => test.skip(ti.project.name !== 'mobile', 'chỉ chạy ở project mobile'));

    const scenes = [
      ['hud', makeSave(busy)],
      ['hud-tutorial', makeSave(s => { s.tutorial = 0; })],
      ['alert', crowSave()],
      ['village', makeSave(s => { s.scene = 'village'; s.coins = 500; })],
    ];
    for (const [label, save] of scenes) test(`khung chính: ${label}`, async ({ page, context }) => {
      await seedSave(context, save);
      await page.goto('/'); await ready(page);
      await page.waitForTimeout(700);
      await audit(page, label, size, true);
    });

    test('tạo nhân vật', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#creator')).toBeVisible();
      await page.getByRole('button', { name: /Chơi một mình/ }).click();
      await audit(page, 'creator', size);
    });

    test('chế độ xây dựng', async ({ page, context }) => {
      await seedSave(context, makeSave(s => { s.coins = 1e6; s.inv.deco_flower = 5; }));
      await page.goto('/'); await ready(page);
      await page.locator('#bb-build').click();
      await expect(page.locator('#buildbar')).toBeVisible();
      await audit(page, 'build', size, true);
      for (const tab of await page.locator('.bt-tab').all()) { await tab.click(); await audit(page, 'build-tab-' + (await tab.textContent()).trim().replace(/\W+/g, '_'), size); }
      await page.locator('#build-cancel').click();
    });

    const panels = ['seeds', 'bag', 'board', 'achievements', 'log', 'settings', 'guide', 'todo', 'map', 'shed', 'shipbin', 'smithy', 'house'];
    test('các bảng', async ({ page, context }) => {
      await seedSave(context, makeSave(s => {
        s.coins = 98765; s.exp = 1e5; s.inv.cai = 12; s.inv.deco_flower = 3; s.inv.ga_egg = 7; s.basket = { cai: 9, ca_rot: 4 };
        for (let i = 1; i < 6; i++) { plantedCrop(i === 1 ? s : s, i, 0.3); s.plots[i].water = 0; }
        s.shipbin.items = { cai: 5, ca_rot: 2 };
      }));
      await page.goto('/'); await ready(page);
      for (const id of panels) {
        await open(page, id);
        await expect(page.locator('.sheet')).toBeVisible();
        await audit(page, 'panel-' + id, size, id === 'bag');
        await page.keyboard.press('Escape');
        if (await page.locator('.sheet').count()) await page.locator('.sheet .close').click();
      }
    });

    test('chợ làng: từng tab', async ({ page, context }) => {
      await seedSave(context, makeSave(s => { s.coins = 98765; s.exp = 1e5; s.inv.cai = 12; s.inv.ga_egg = 7; s.time = 0; }));
      await page.goto('/'); await ready(page);
      await open(page, 'market');
      const n = await page.locator('.sheet .tab').count();
      for (let i = 0; i < n; i++) {
        const t = page.locator('.sheet .tab').nth(i);
        await t.scrollIntoViewIfNeeded(); await t.click();
        await audit(page, 'market-' + i, size, i === 0);
      }
    });

    test('Trong lúc bạn vắng nhà', async ({ page, context }) => {
      await seedSave(context, makeSave(s => { for (let i = 0; i < 4; i++) plantedCrop(s, i, 0.5); s.savedAt = Date.now() - 12 * 3600_000; }));
      await page.goto('/'); await ready(page);
      await expect(page.locator('#away')).toBeVisible();
      await audit(page, 'away', size, true);
      await closeAway(page);
    });

    test('Bản mới có gì đổi', async ({ page, context }) => {
      await context.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch {} }, ['nongtrai-save-v1', JSON.stringify(v1())]);
      await context.addInitScript(() => { try { localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {} });
      await page.goto('/'); await ready(page);
      await expect(page.locator('#whatsnew')).toBeVisible();
      await audit(page, 'whatsnew', size, true);
    });

    // ---- Phase 1 online (issue 33) ----
    const mark = (context, name) => context.addInitScript(n => {
      try { localStorage.setItem('nongtrai-online', n); localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {}
    }, name);

    test('chọn chế độ, đăng nhập, đăng ký', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('button', { name: /Vào làng/ })).toBeVisible();
      await audit(page, 'mode', size, true);
      await page.getByRole('button', { name: /Vào làng/ }).click();
      await expect(page.getByRole('button', { name: /Tạo tài khoản mới/ })).toBeVisible();
      await audit(page, 'auth-login', size, true);
      await page.getByRole('button', { name: /Tạo tài khoản mới/ }).click();
      await expect(page.locator('#creator input').first()).toBeVisible();
      await audit(page, 'auth-register', size);
    });

    test('Mang vườn này lên làng?', async ({ page, context, baseURL }) => {
      const name = 'Bu' + Math.random().toString(36).slice(2, 7);
      const invite = (await runAdmin('invite', '--db', E2E_DB)).out;
      expect((await context.request.post('/api/register', { data: { name, pin: '123456', invite } })).ok()).toBe(true);
      await seedSave(context, makeSave(s => { s.coins = 4321; }));
      await page.goto('/'); await ready(page);
      await open(page, 'settings');
      await page.locator('.sheet').getByRole('button', { name: /Vào làng/ }).click();
      await page.getByRole('button', { name: /Vào làng/ }).click();
      await expect(page.getByText('Mang vườn này lên làng?')).toBeVisible();
      await page.addStyleTag({ content: '#hud, #mini-wrap { display: none !important }' });   // HUD nằm dưới hộp thoại phủ kín, người chơi không thấy
      await audit(page, 'bringup', size, true);
    });

    // người chơi online: mở làng, có một bạn, quà và lời nhắn ở cổng
    test('làng real-time, chat, bạn bè, hộp quà, sổ lưu bút', async ({ page, context, browser, baseURL }) => {
      const reg = async ctx => {
        const name = 'Ol' + Math.random().toString(36).slice(2, 7);
        const invite = (await runAdmin('invite', '--db', E2E_DB)).out;
        expect((await ctx.request.post('/api/register', { data: { name, pin: '123456', invite } })).ok()).toBe(true);
        const { play } = await (await ctx.request.post('/api/play', { data: {} })).json();
        return { name, play };
      };
      const other = await browser.newContext({ baseURL });
      const c = await reg(other);
      expect((await other.request.post('/api/farm', { data: { play: c.play, save: makeSave(s => { s.exp = 500; s.inv.cai = 9; s.basket = { cai: 9 }; }, { name: c.name }) } })).ok()).toBe(true);
      const me = await reg(context);
      const guest = { id: 'gst-1', kind: 'steal', act: 'crop', by: c.name, lv: 5, at: Date.now() - 600_000, seen: true, item: 'cai', qty: 3 };
      const save = makeSave(s => {
        s.scene = 'village'; s.coins = 500; s.exp = 500; s.basket = { cai: 5 };
        s.guests = [guest, { id: 'gst-2', kind: 'help', act: 'water', by: c.name, lv: 5, at: Date.now() - 900_000, seen: true }, { id: 'gst-3', kind: 'bark', act: 'bark', by: c.name, lv: 5, at: Date.now() - 300_000, seen: true }];
      }, { name: me.name });
      expect((await context.request.post('/api/farm', { data: { play: me.play, save } })).ok()).toBe(true);
      expect((await context.request.post('/api/friends', { data: { name: c.name } })).ok()).toBe(true);
      expect((await other.request.post('/api/gifts', { data: { to: me.name, item: 'cai', qty: 2, op: 'gift-op-1' } })).ok()).toBe(true);
      expect((await other.request.post('/api/guestbook', { data: { to: me.name, text: 'Vườn bạn đẹp quá, mình ghé chơi nè! Cảm ơn bạn nhiều lắm nhé' } })).ok()).toBe(true);
      await mark(context, me.name);
      await page.goto('/');
      await page.waitForFunction(() => globalThis.__farm?.state?.mode === 'online');
      await closeAway(page);
      await expect(page.locator('#live')).toBeVisible();
      await page.waitForTimeout(500);
      await audit(page, 'online-village', size, true);
      await page.locator('#live-chat').click();
      await expect(page.locator('#live-says')).toBeVisible();
      // mọi câu chat chạm được: không nút nào bị bản đồ nhỏ / nút Việc cần làm che
      expect(await page.evaluate(() => [...document.querySelectorAll('#live-says .btn')].filter(b => { const r = b.getBoundingClientRect(); return [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.right - 4, r.bottom - 4], [r.left + r.width / 2, r.top + r.height / 2]].some(([x, y]) => !b.contains(document.elementFromPoint(x, y))); }).map(b => b.textContent))).toEqual([]);
      await audit(page, 'online-chat', size, true);
      await page.locator('#live-chat').click();
      for (const id of ['online', 'friends', 'giftbox', 'guestbook', 'log']) {
        await open(page, id);
        await expect(page.locator('.sheet')).toBeVisible();
        await page.waitForTimeout(300);
        await audit(page, 'online-' + id, size, true);
        await page.keyboard.press('Escape');
        if (await page.locator('.sheet').count()) await page.locator('.sheet .close').click();
      }
      await other.close();
    });

    // online: server gom việc khách làm lúc vắng (giúp, trộm, chó đớp, quà, lời nhắn) vào màn "Trong lúc bạn vắng nhà"
    test('Trong lúc bạn vắng nhà (có khách)', async ({ page, context, browser, baseURL }) => {
      const reg = async ctx => {
        const name = 'Av' + Math.random().toString(36).slice(2, 7);
        const invite = (await runAdmin('invite', '--db', E2E_DB)).out;
        expect((await ctx.request.post('/api/register', { data: { name, pin: '123456', invite } })).ok()).toBe(true);
        const { play } = await (await ctx.request.post('/api/play', { data: {} })).json();
        return { name, play };
      };
      const other = await browser.newContext({ baseURL });
      const c = await reg(other);
      expect((await other.request.post('/api/farm', { data: { play: c.play, save: makeSave(s => { s.exp = 500; s.basket = { cai: 9 }; }, { name: c.name }) } })).ok()).toBe(true);
      const me = await reg(context);
      const ago = h => Date.now() - h * 3600_000;
      const save = makeSave(s => {
        for (let i = 0; i < 3; i++) plantedCrop(s, i, 0.5);
        s.exp = 500;
        s.guests = [
          { id: 'a1', kind: 'steal', act: 'crop', by: c.name, lv: 6, at: ago(3), seen: false, item: 'cai', qty: 4 },
          { id: 'a2', kind: 'help', act: 'water', by: c.name, lv: 3, at: ago(4), seen: false },
          { id: 'a3', kind: 'bite', act: 'bite', by: c.name, lv: 6, at: ago(5), seen: false, fine: 20 },
        ];
        s.savedAt = ago(10);
      }, { name: me.name });
      expect((await context.request.post('/api/farm', { data: { play: me.play, save } })).ok()).toBe(true);
      expect((await other.request.post('/api/gifts', { data: { to: me.name, item: 'cai', qty: 2, op: 'gift-op-2' } })).ok()).toBe(true);
      expect((await other.request.post('/api/guestbook', { data: { to: me.name, text: 'Ghé chơi nè' } })).ok()).toBe(true);
      await mark(context, me.name);
      await page.goto('/'); await ready(page);
      await expect(page.locator('#away')).toBeVisible();
      await expect(page.locator('#away .away-guests li').first()).toBeVisible();
      await audit(page, 'away-guests', size, true);
      await closeAway(page);
      await other.close();
    });

    test('băng rôn đỏ khi đang ở làng (kèm nút Về vườn)', async ({ page, context }) => {
      await seedSave(context, makeSave(s => {
        plantedCrop(s, 0, 1); s.scene = 'village'; s.weather = 'rain';
        s.threats = [{ id: 901, kind: 'crow', plot: 0, x: 600, y: 248, arriveAt: 0, state: 'eating', since: s.time + 40_000 }];
      }));
      await page.goto('/'); await ready(page);
      await expect(page.locator('#alert-banner')).toBeVisible();
      await expect(page.locator('#alert-home')).toBeVisible();
      await audit(page, 'alert-village', size, true);
    });

    test('chó Mực: xích, thả, cho ăn', async ({ page, context }) => {
      await seedSave(context, makeSave(s => {
        s.dog.adult = true; s.dog.age = 1e12; s.dog.chained = true; s.inv.sausage = 3;
        const h = s.farm.ents.find(e => e.kind === 'doghouse');
        const p = mapOf(s).dogHome; Object.assign(s.dog, p); Object.assign(s.player, { x: p.x + 12, y: p.y + 20 });
        void h;
      }));
      await page.goto('/'); await ready(page);
      await page.waitForTimeout(700);
      await audit(page, 'dog', size, true);
    });

    // ---- Phase 2 vật nuôi (issue 49) ----
    test('con vật: thanh hành động (thuốc, tắm, cách ly) và tên kèm giai đoạn, tim', async ({ page, context }) => {
      // gà mái mệt và dơ: hành động chính là cho uống thuốc, kèm tắm, cách ly, vắc-xin...
      await seedSave(context, strayHen({ dirty: 100, sick: 1, sickMs: 0, sickSince: 0 }, s => { s.inv.soap = 3; s.inv.medicine = 2; s.can = 5; }));
      await page.goto('/'); await ready(page);
      await standByHen(page);
      await expect(page.locator('#chips .chip').nth(3)).toBeVisible();
      await audit(page, 'p2-animal', size, true);
    });

    test('con vật già: hộp bán cho Chú Ba, nghỉ hưu, đổi tên', async ({ page, context }) => {
      await seedSave(context, strayHen({ stage: 'gia', age: stageStart('ga', 'gia') }));
      await page.goto('/'); await ready(page);
      for (const [chip, label] of [[/Bán gà/, 'p2-sell'], [/nghỉ hưu/, 'p2-retire'], [/Đổi tên/, 'p2-rename']]) {
        await standByHen(page);
        await page.locator('#chips .chip', { hasText: chip }).click();
        await expect(page.locator('#dialog-root .dialog')).toBeVisible();
        await audit(page, label, size, true);
        await dismiss(page);
      }
    });

    test('trứng có phôi: soi trứng', async ({ page, context }) => {
      const s = strayHen({}, s => {
        const p = s.player;
        s.eggs = [{ id: s.nextId++, sp: 'ga', x: p.x, y: p.y - 10, laidAt: s.time, fertile: true, mom: { id: 1, name: 'Mái Mơ' }, dad: { id: 2, name: 'Trống Tía' } }];
        s.animals = s.animals.filter(a => !a.stray);
      });
      await seedSave(context, s);
      await page.goto('/'); await ready(page);
      await expect(page.locator('#actions')).toContainText(/Soi trứng/, { timeout: 10_000 });
      await audit(page, 'p2-egg', size);
    });

    test('kẻ săn mồi: báo động đỏ, mũi tên chỉ hướng; con lạc và bảng Việc cần làm', async ({ page, context }) => {
      const s = makeSave(s => {
        s.exp = 1e6; s.coins = 5000; s.orders = []; s.nextOrderAt = 1e15; s.time = DAY_MS * 0.78; s.duskDay = s.day; s.weather = 'sun';
        const tiles = [...roamOf(s).tiles], far = tiles[tiles.length - 1];
        for (let i = 0; i < 3; i++) hen(s, { name: 'Gà lạc ' + (i + 1), tile: { ...far }, tileAt: s.time + 1e9, x: far.c * TS + 8 + i * 6, y: far.r * TS + 8, stray: true, dirty: 100 });
        const a = s.animals.at(-1);
        s.preds.push({ id: s.nextId++, kind: 'weasel', state: 'hunt', since: s.time, warned: false, strikeAt: s.time + 9000, tile: null, x: a.x, y: a.y, tx: a.x, ty: a.y, target: a.id });
        Object.assign(s.player, mapOf(s).spawn);
      });
      s.savedAt = Date.now();
      await seedSave(context, s);
      await page.goto('/'); await ready(page);
      // giữ con chồn ở pha rình (đã báo, chưa ra tay) suốt lúc đo
      await page.evaluate(() => setInterval(() => { const s = globalThis.__farm.state; for (const p of s.preds) if (p.kind === 'weasel') p.strikeAt = s.time + 8000; }, 300));
      await expect(page.locator('#alert-banner')).toBeVisible({ timeout: 10_000 });
      await audit(page, 'p2-pred', size, true);
      await open(page, 'todo');
      await expect(page.locator('.sheet')).toContainText(/lạc/);
      await audit(page, 'p2-todo', size, true);
    });

    test('trạm thú y Cô Út, điện thoại gọi bác sĩ, phả hệ', async ({ page, context }) => {
      await seedSave(context, makeSave(s => {
        s.exp = 1e6; s.coins = 98765; s.scene = 'village'; s.inv.medicine = 3; s.inv.vaccine = 12;
        const [mom, kid] = s.animals.filter(a => a.type === 'ga');
        Object.assign(mom, { name: 'Mái Mơ Lúa Vàng', sick: 3, sickMs: 1, sickSince: s.time });
        Object.assign(kid, { name: 'Gà Con Lông Vàng Óng', mom: { id: mom.id, name: mom.name }, dad: { id: 9999, name: 'Trống Tía Oai Phong' }, sick: 2, sickMs: 1, dose: 1 });
      }));
      await page.goto('/'); await ready(page);
      for (const id of ['vet', 'phone', 'pedigree']) {
        await open(page, id);
        await expect(page.locator('.sheet')).toBeVisible();
        await audit(page, 'p2-' + id, size, true);
        await page.keyboard.press('Escape');
        if (await page.locator('.sheet').count()) await page.locator('.sheet .close').click();
      }
    });

    test('sổ tay: các trang vật nuôi mới', async ({ page, context }) => {
      await seedSave(context, makeSave(s => { s.exp = 1e6; }));
      await page.goto('/'); await ready(page);
      await open(page, 'guide');
      for (const t of ['Đực, cái và sinh sản', 'Vịt', 'Chó Mực và dạy lệnh', 'Vòng đời', 'Tắm cho vật nuôi', 'Bệnh và thú y', 'Lùa về chuồng', 'Kẻ săn mồi']) {
        await page.locator(`.guide-dot[title="${t}"]`).click();
        await expect(page.locator('.guide-page h3')).toHaveText(t);
        await audit(page, 'p2-guide-' + t.replace(/\W+/g, '_'), size, t === 'Lùa về chuồng');
      }
    });

    test('dạy chó: danh sách lệnh, minigame, chọn ô Canh khu', async ({ page, context }) => {
      await seedSave(context, makeSave(s => {
        s.exp = 1e6; s.inv.treat = 9;
        Object.assign(s.dog, { stage: 'truong', age: stageStart('cho', 'truong'), hunger: 100, happy: 90, nextPoop: 1e15, chained: false, tricks: { sit: TRICKS.sit.sessions, guard: TRICKS.guard.sessions } });
      }));
      await page.goto('/'); await ready(page);
      await open(page, 'dog');
      await expect(page.locator('.sheet [data-train]:not([disabled])').first()).toBeVisible();
      await audit(page, 'p2-dog', size, true);
      await page.locator('.sheet [data-train]:not([disabled])').first().click();
      await expect(page.locator('#train-hit')).toBeVisible();
      await audit(page, 'p2-train', size, true);
      await dismiss(page);
      if (await page.locator('.sheet').count()) await page.locator('.sheet .close').click();
      await open(page, 'dog');
      await page.locator('.sheet [data-cmd="guard"]').click();
      await expect(page.locator('#toasts')).toContainText(/gác/, { timeout: 10_000 });   // người chơi đi tới chỗ chó rồi mới ra lệnh
      await audit(page, 'p2-guard-pick', size, true);
    });

    test('bắt được trộm: hộp chọn kiểu phạt', async ({ page, context }) => {
      await seedSave(context, makeSave(s => { s.exp = 1e6; }));
      await page.goto('/'); await ready(page);
      await page.evaluate(async () => {
        const S = await import('/state.js'), ui = await import('/ui.js'), s = globalThis.__farm.state;
        s.caught = { kind: 'thief', name: 'Thằng Tèo', coins: 150 };
        ui.askPunish(S.punishInfo(s));
      });
      await expect(page.locator('#dialog-root .punish')).toBeVisible();
      await audit(page, 'p2-punish', size, true);
      await page.locator('#dialog-root .punish .btn').first().click();
      await expect(page.locator('#dialog-root')).toBeHidden();
    });

    test('chuồng: chọn chuồng trong chế độ xây dựng có nút Nâng cấp, thẻ chuồng cách ly', async ({ page, context }) => {
      await seedSave(context, makeSave(s => {
        s.exp = 1e6; s.coins = 1e6;
        const a = mapOf(s).pens.chicken.area;   // đứng ngay dưới chuồng gà: vào xây dựng là thấy chuồng
        Object.assign(s.player, { x: a.x + a.w / 2, y: a.y + a.h + 20 });
      }));
      await page.goto('/'); await ready(page);
      await page.locator('#bb-build').click();
      await expect(page.locator('#buildbar')).toBeVisible();
      await page.waitForTimeout(700);
      await expect(async () => {
        const p = await page.evaluate(async () => {
          const { mapOf } = await import('/state.js'), f = globalThis.__farm, a = mapOf(f.state).pens.chicken.area, r = document.getElementById('game-canvas').getBoundingClientRect();
          return { x: ((a.x + a.w / 2) * f.scale - f.view.camX) / f.dpr + r.left, y: ((a.y + a.h / 2) * f.scale - f.view.camY) / f.dpr + r.top };
        });
        await page.touchscreen.tap(p.x, p.y);
        await expect(page.locator('#build-upgrade')).toBeVisible({ timeout: 1500 });
      }).toPass({ timeout: 15_000 });
      await audit(page, 'p2-pen-upgrade', size, true);
      await page.locator('.bt-tab', { hasText: 'Chuồng' }).click();
      await expect(page.locator('.bt-card', { hasText: 'Chuồng cách ly' })).toBeVisible();
      await audit(page, 'p2-pen-tray', size);
    });

    // Biển "Chợ Bà Tư" và chữ "Đóng cửa" (vẽ trên canvas) không bị HUD, bản đồ nhỏ hay nút Việc cần làm che,
    // ở mọi chỗ người chơi đứng nhìn chợ: vừa qua cổng làng, đứng trước quầy chợ, đi xuống ghế đá trước chợ.
    for (const [where, at] of [['cổng làng', b => sceneMap(b).arrive.farm], ['trước quầy', (s, m) => m.at], ['ghế đá', (s, m) => ({ x: m.at.x, y: m.at.y + 72 })]]) {
      test(`làng: biển chợ và chữ Đóng cửa không bị che (${where})`, async ({ page, context }) => {
        const save = makeSave(s => { s.scene = 'village'; s.coins = 500; s.time = DAY_MS * 0.6; s.weather = 'sun'; });   // 20h24: chợ đóng cửa
        const m = sceneMap(save).building('market');
        Object.assign(save.player, at(save, m));
        save.savedAt = Date.now();
        await seedSave(context, save);
        await page.goto('/'); await ready(page);
        await page.waitForTimeout(900);   // camera trượt tới chỗ
        const covers = await page.evaluate(() => [...document.querySelectorAll('#hud .card, #hud .pill, #mini-wrap, #todo-btn, #hud-speed')]
          .filter(e => e.getClientRects().length && !e.closest('[hidden]')).map(e => { const r = e.getBoundingClientRect(); return { id: e.id || e.className, l: r.left, r: r.right, t: r.top, b: r.bottom }; }));
        await page.screenshot({ path: `test-results/m360/${size[0]}-p2-village-sign-${where.replace(/\s+/g, '_')}.png` });
        const signs = await villageSigns(page);
        expect(signs.map(x => x.text)).toEqual(['Chợ Bà Tư', 'Đóng cửa']);
        for (const sg of signs) {
          // mép trái/phải màn hình cắt bớt là chuyện cuộn bản đồ bình thường; ở đây chỉ kiểm không bị lớp nổi che
          expect(sg.t >= 0 && sg.b <= size[1], `${sg.text} nằm trong màn hình theo chiều dọc: ${JSON.stringify(sg)}`).toBe(true);
          // chỉ phần chữ nằm trong màn hình (320px: đứng ở cổng thì biển chợ còn lấp ló ngoài mép phải)
          const l = Math.max(0, sg.l), r = Math.min(size[0], sg.r);
          const hit = r - l < 1 ? [] : covers.filter(c => l < c.r && c.l < r && sg.t < c.b && c.t < sg.b);
          expect(hit.map(c => c.id), `${sg.text} bị che`).toEqual([]);
        }
      });
    }
  });
}
