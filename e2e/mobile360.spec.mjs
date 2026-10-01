import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { makeSave, seedSave, plantedCrop, closeAway } from './helpers.mjs';
import { mapOf } from '../public/state.js';

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
    mini: [document.getElementById('minimap'), document.getElementById('todo-btn')],
    joy: [document.getElementById('joy-base')],
    act: [...document.querySelectorAll('#main-action, #chips .chip, #target-name')],
    banner: [document.getElementById('alert-banner')],
  };
  const vis = e => { if (!e || e.closest('[hidden]') || getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return r.width && r.height ? r : null; };
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
  await page.waitForTimeout(350);   // hoạt ảnh trượt lên
  await page.screenshot({ path: `test-results/m360/${w}-${label}.png` });
  expect(await page.evaluate(measure, { insets: null, minSize: MIN }), `${label} ${w}x${h}`).toEqual([]);
  // giả lập tai thỏ
  await page.addStyleTag({ content: `:root{--sl:${NOTCH.l}px!important;--sr:${NOTCH.r}px!important;--st:${NOTCH.t}px!important;--sb:${NOTCH.b}px!important}` }).then(h => h.evaluate(e => (e.id = 'fake-notch')));
  await page.waitForTimeout(450);   // HUD tính lại vị trí bản đồ nhỏ
  if (shot) await page.screenshot({ path: `test-results/m360/${w}-${label}-notch.png` });
  expect(await page.evaluate(measure, { insets: NOTCH, minSize: MIN }), `${label} ${w}x${h} (tai thỏ)`).toEqual([]);
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
  });
}
