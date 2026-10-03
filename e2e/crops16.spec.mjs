// Issue 50: bản lưu v4, 16 loại cây với hình riêng từng giai đoạn, hạt cây mới ở chợ Bà Tư.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { makeSave, seedSave, tapPlot } from './helpers.mjs';
import { canPlace, placeEntity, buyStrip, sceneMap } from '../public/state.js';
import { CROPS, SEASON, levelInfo } from '../public/data.js';

const fixture = name => JSON.parse(readFileSync(new URL(`../tests/fixtures/${name}.json`, import.meta.url), 'utf8'));
const pref = battery => async context => context.addInitScript(b => { try { localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: b, hinted: true })); } catch {} }, battery);
const ready = async page => { await page.waitForFunction(() => globalThis.__farm?.state); await page.keyboard.press('Shift'); };
const expFor = lv => { let e = 0; while (levelInfo(e).level < lv) e += levelInfo(e).need - levelInfo(e).cur; return e; };

test('bản lưu v3 ghi sẵn có cây đang lớn: game mở, cây còn nguyên tiến độ, thu hoạch được', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  const old = fixture('v3-farm');
  old.savedAt = Date.now();
  const json = JSON.stringify(old);
  await pref(false)(context);
  await context.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch {} }, ['nongtrai-save-v3', json]);
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#creator')).toBeHidden();
  await expect(page.locator('#hud-name')).toHaveText(old.name);
  const s = await page.evaluate(() => { const st = globalThis.__farm.state; return { v: st.v, plots: st.plots.map(p => p.crop && { id: p.crop.id, progress: p.crop.progress }), cai: (st.basket.cai || 0) + (st.inv.cai || 0) }; });
  expect(s.v).toBe(4);
  for (const p of old.plots.filter(p => p.crop)) {
    expect(s.plots[p.idx]?.id).toBe(p.crop.id);
    expect(s.plots[p.idx].progress).toBeGreaterThanOrEqual(p.crop.progress);
  }
  // ô 0 đã chín: thu hoạch được, giỏ thêm đúng sản lượng
  const ripe = old.plots.find(p => p.crop?.progress >= 1);
  await tapPlot(page, ripe.idx, touch, () => page.evaluate(i => !globalThis.__farm.state.plots[i].crop, ripe.idx));
  // đếm cả cải có sao (issue 52); đúng mùa thì 10% lần được thêm SEASON.bonusQty (issue 54)
  const cai = await page.evaluate(() => { const st = globalThis.__farm.state; return ['cai', 'cai@2', 'cai@3'].reduce((n, k) => n + (st.basket[k] || 0) + (st.inv[k] || 0), 0); });
  expect(cai).toBeGreaterThanOrEqual(s.cai + CROPS.cai.yield);
  expect(cai).toBeLessThanOrEqual(s.cai + CROPS.cai.yield + SEASON.bonusQty);
  // bản v3 vẫn còn nguyên
  expect(await page.evaluate(() => localStorage.getItem('nongtrai-save-v3'))).toBe(json);
});

// ---------- Hình riêng từng cây ----------
// 6 khối ruộng, mỗi khối trồng hàng dưới cùng (3 ô) để không cây nào vẽ đè lên ô của cây khác; hai hàng trên để trống.
const IDS = Object.keys(CROPS);
const STATES = ['s0', 's1', 's2', 's3', 's4', 'sick', 'rotten', 'dead'];
function cropsFarm() {
  return makeSave(s => {
    s.coins = 1e9; s.exp = expFor(20);
    for (const d of ['S', 'E']) buyStrip(s, d);
    s.farm.ents = s.farm.ents.filter(e => e.kind !== 'bush' && e.kind !== 'rock'); s.farm.rev++;
    const o = s.farm.owned;
    for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) {
      if (s.farm.ents.filter(e => e.kind === 'field').length >= 6) break;
      if (canPlace(s, { kind: 'field' }, c, r).ok && placeEntity(s, { kind: 'field' }, c, r).ok) for (const i of s.farm.ents.at(-1).plots) s.plots[i].unlocked = true;
    }
    s.animals = []; s.dog.chained = true; s.weather = 'sun'; s.coins = 1000;
    for (const p of s.plots) Object.assign(p, { soil: 'untilled', water: 0, weeds: false, crop: null });
  });
}
const slots = s => s.farm.ents.filter(e => e.kind === 'field').flatMap(f => f.plots.slice(6).map(idx => ({ idx, field: f })));

test('16 cây ở 5 giai đoạn, bệnh, héo, chết: mỗi cây một hình riêng, không hai cây nào dùng chung hình', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const save = cropsFarm(), places = slots(save).slice(0, IDS.length);
  expect(places.length).toBe(IDS.length);
  for (const { idx } of places) Object.assign(save.plots[idx], { soil: 'tilled', water: 100 });
  await pref(true)(context);   // tiết kiệm pin: tắt lấp lánh trên cây chín để ảnh chụp đứng yên
  await seedSave(context, save, { hint: true });
  await page.goto('/');
  await ready(page);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  const sig = {};   // sig[id][state] = chữ ký điểm ảnh của cây (phần khác với ô đất trống)
  const fields = [...new Set(places.map(p => p.field.id))];
  for (const fid of fields) {
    const mine = places.map((p, i) => ({ ...p, id: IDS[i] })).filter(p => p.field.id === fid);
    const f = mine[0].field;
    // đứng dưới hàng cây 3 ô: camera thấy trọn hàng cây, nhân vật không che
    await page.evaluate(([x, y]) => Object.assign(globalThis.__farm.state.player, { x, y }), [(f.c + 1) * 16 + 8, (f.r + 2 + 3) * 16 + 8]);
    let last = '';
    for (let k = 0; k < 30; k++) { const v = await page.evaluate(() => JSON.stringify(globalThis.__farm.view)); if (v === last) break; last = v; await page.waitForTimeout(120); }
    // đặt trạng thái cho các ô của khối này, chờ vẽ lại, rồi đọc điểm ảnh từng ô trên canvas
    const shoot = (state, base) => page.evaluate(async ([cells, state, base]) => {
      const f = globalThis.__farm, s = f.state, now = s.time;
      const prog = { s0: 0.05, s1: 0.22, s2: 0.52, s3: 0.85, s4: 1, sick: 0.52, rotten: 1.6, dead: 0.52 }[state];
      s.weather = 'sun';
      for (const { idx, id } of cells) {
        const p = s.plots[idx];
        Object.assign(p, { water: 100, weeds: false });
        p.crop = state ? { id, progress: prog, planted: 0, bugs: false, bugSince: 0, sick: state === 'sick', sickSince: now, fert: false, boosts: 0,
          dead: state === 'dead', rotten: state === 'rotten', ripeAt: prog >= 1 ? now : 0, q: { dry: false, bugMax: 0, hand: false } } : null;
      }
      await new Promise(r => setTimeout(r, 200));
      const { mapOf } = await import('/state.js');
      const m = mapOf(s), cv = document.getElementById('game-canvas'), ctx = cv.getContext('2d'), sc = f.scale;
      // ô bị bong bóng "cây bệnh" che phần trên: chỉ so phần thân ô; còn lại so cả ô và một ô phía trên (cây cao)
      globalThis.__base ||= {};
      const out = {};
      for (const { idx, id } of cells) for (const tall of base ? [true, false] : [!['sick', 'rotten', 'dead'].includes(state)]) {
        const t = m.plotTile(idx);
        const x0 = t.c * 16 * sc - f.view.camX, y0 = (tall ? (t.r - 1) * 16 : t.r * 16 + 4) * sc - f.view.camY;
        const w = 16 * sc, h = (tall ? 32 : 12) * sc;
        if (x0 < 0 || y0 < 0 || x0 + w > cv.width || y0 + h > cv.height) return { error: `ô ${idx} ngoài khung hình` };
        const px = ctx.getImageData(x0, y0, w, h).data, key = `${idx}:${tall}`;
        if (base) { globalThis.__base[key] = px; continue; }
        const b = globalThis.__base[key];
        let hsh = 2166136261, n = 0;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i] === b[i] && px[i + 1] === b[i + 1] && px[i + 2] === b[i + 2]) continue;
          n++;
          for (const v of [i, px[i], px[i + 1], px[i + 2]]) { hsh ^= v; hsh = Math.imul(hsh, 16777619) >>> 0; }
        }
        out[id] = `${n}:${hsh}`;
      }
      return out;
    }, [mine.map(({ idx, id }) => ({ idx, id })), state, base]);
    expect(await shoot(null, true)).toEqual({});
    for (const st of STATES) {
      const r = await shoot(st, false);
      expect(r.error).toBeUndefined();
      for (const [id, v] of Object.entries(r)) {
        expect(Number(v.split(':')[0]), `${id} ở ${st} phải hiện ra trên ô`).toBeGreaterThan(20);
        (sig[id] ||= {})[st] = v;
      }
      if (st === 's3') await testInfo.attach(`khoi-${fid}-${st}.png`, { body: await page.screenshot(), contentType: 'image/png' });
    }
  }
  // mỗi trạng thái: 16 cây 16 hình khác nhau; mỗi cây: 8 trạng thái 8 hình khác nhau
  for (const st of STATES) {
    const seen = new Map();
    for (const id of IDS) {
      expect(seen.get(sig[id][st]), `${id} và ${seen.get(sig[id][st])} dùng chung hình ở ${st}`).toBeUndefined();
      seen.set(sig[id][st], id);
    }
  }
  for (const id of IDS) expect(new Set(STATES.map(st => sig[id][st])).size, `${id}: mỗi giai đoạn một hình`).toBe(STATES.length);
  expect(errors).toEqual([]);
});

// ---------- Chợ Bà Tư bán hạt cây mới theo cấp ----------
test('chợ Bà Tư ở cấp 7: thấy hạt cây mới đã mở và mua được, cây cấp cao hơn còn khóa', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  const save = makeSave(s => {
    s.scene = 'village'; s.coins = 5000; s.exp = expFor(7); s.time = 0; s.weather = 'sun';
    Object.assign(s.player, sceneMap(s).building('market').at, { dir: 3 });
  });
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  // đứng trước quầy: chạm quầy để mở chợ
  const stall = await page.evaluate(async () => {
    const { sceneMap } = await import('/state.js');
    const f = globalThis.__farm, b = sceneMap(f.state).building('market'), rc = document.getElementById('game-canvas').getBoundingClientRect();
    return { x: ((b.x + 24) * f.scale - f.view.camX) / f.dpr + rc.left, y: ((b.y + 20) * f.scale - f.view.camY) / f.dpr + rc.top };
  });
  await page.waitForTimeout(400);
  if (touch) await page.touchscreen.tap(stall.x, stall.y); else await page.mouse.click(stall.x, stall.y);
  await expect(page.locator('.sheet-head h2')).toHaveText(/Chợ Bà Tư/, { timeout: 10_000 });
  await expect(page.locator('.note.closed')).toHaveCount(0);
  const row = name => page.locator('#panel-root .row', { hasText: name });
  for (const id of ['hanhla', 'raumuong', 'suhao', 'dualeo', 'khoailang', 'ot']) {
    await expect(row(`Hạt ${CROPS[id].name.toLowerCase()}`).getByRole('button', { name: '×1' }), id).toBeEnabled();
  }
  for (const id of ['dauphong', 'bapcai']) await expect(row(`Hạt ${CROPS[id].name.toLowerCase()}`)).toContainText(`Cấp ${CROPS[id].lv}`);
  // túi hạt cây mới có hình vẽ riêng như túi cây cũ, không còn hiện emoji thay thế
  for (const id of ['hanhla', 'dauphong', 'raumuong', 'dualeo', 'khoailang', 'ot', 'suhao', 'bapcai']) await expect(row(`Hạt ${CROPS[id].name.toLowerCase()}`).locator('.row-ico img.ico'), id).toBeVisible();
  await row('Hạt ớt').scrollIntoViewIfNeeded();
  await row('Hạt ớt').getByRole('button', { name: '×5' }).click();
  await expect.poll(() => page.evaluate(() => globalThis.__farm.state.inv.seed_ot)).toBe(5);
  expect(await page.evaluate(() => globalThis.__farm.state.coins)).toBe(5000 - 5 * CROPS.ot.seed);
});
