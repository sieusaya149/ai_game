// Kẻ săn mồi: chuột, diều hâu, chồn (issue 43). Dựng bằng bản lưu ghi sẵn, không có hook test nào trong game (ADR 0008).
import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { mapOf, roamOf, placeEntity, canPlace, createGame, stageStart } from '../public/state.js';
import { DAY_MS, PREDATOR as P } from '../public/data.js';

const TS = 16;

// Vườn đã qua bảo hộ người mới, không con vật, không đơn hàng; `mutate` dựng tình huống.
const base = mutate => makeSave(s => {
  s.coins = 1e5; s.exp = 1e6; s.animals = []; s.inv = {}; s.orders = []; s.nextOrderAt = 1e15;
  s.duskDay = s.day;   // khỏi chạy luật chạng vạng giữa chừng
  mutate?.(s);
});
// Ô thả rông thứ k tính từ chỗ gần nhà nhất (ô chắc chắn hợp lệ cho con vật thả rông)
const roamTile = (s, far = 0) => {
  const m = mapOf(s), sp = m.spawn;
  const tiles = [...roamOf(s).tiles].sort((a, b) => (Math.hypot(a.c * TS - sp.x, a.r * TS - sp.y)) - (Math.hypot(b.c * TS - sp.x, b.r * TS - sp.y)));
  return far ? tiles[tiles.length - 1] : tiles[0];
};
const addBird = (s, stage, tile, extra) => {
  const tpl = createGame().animals.find(a => a.type === 'ga');
  const a = { ...structuredClone(tpl), id: s.nextId++, type: 'ga', name: 'Gà', sex: 'f', stage, age: stageStart('ga', stage),
    nextProduct: 1e15, ready: false, pen: s.farm.ents.find(e => e.kind === 'pen')?.id ?? null,
    tile: { ...tile }, tileAt: s.time + 1e9, x: tile.c * TS + 8, y: tile.r * TS + 8, ...extra };
  s.animals.push(a);
  return a;
};
const addPred = (s, kind, a, inMs = P.warnMs) => {
  const p = { id: s.nextId++, kind, state: 'hunt', since: s.time, warned: false, strikeAt: s.time + inMs,
    tile: null, x: a.x, y: a.y, tx: a.x, ty: a.y, target: a.id };
  s.preds.push(p);
  return p;
};
const ready = async page => { await page.waitForFunction(() => globalThis.__farm?.state); await page.keyboard.press('Shift'); };
const look = page => page.evaluate(() => {
  const s = globalThis.__farm.state;
  return { preds: s.preds.map(p => ({ id: p.id, kind: p.kind, state: p.state, x: p.x, y: p.y })), animals: s.animals.map(a => a.id), rats: s.stats.rats };
});
// Chạm vào một chỗ trong thế giới (px bản đồ) trên canvas
async function tapAt(page, touch, x, y) {
  const pt = await page.evaluate(([wx, wy]) => {
    const f = globalThis.__farm, r = document.getElementById('game-canvas').getBoundingClientRect();
    return { x: (wx * f.scale - f.view.camX) / f.dpr + r.left, y: (wy * f.scale - f.view.camY) / f.dpr + r.top };
  }, [x, y]);
  if (pt.x < 2 || pt.y < 2 || pt.x > 4000) return;
  if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
}
// Chạm đi chạm lại vào kẻ săn mồi (nó đang lượn vòng) tới khi nó biến mất
async function shooPred(page, touch, id) {
  await expect(async () => {
    const p = (await look(page)).preds.find(x => x.id === id);
    if (!p) return;
    await tapAt(page, touch, p.x, p.y);
    expect((await look(page)).preds.some(x => x.id === id && x.state === 'hunt')).toBe(false);
  }).toPass({ timeout: 9000, intervals: [350, 350, 350, 350] });
}

test('chồn nửa đêm: báo động 🔴 có mũi tên chỉ hướng, chạm đuổi kịp thì con lạc không sao', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // con lạc ngủ ngoài ở góc xa, chồn đang rình nó; người chơi đứng ở chỗ sinh (xa tít)
  const save = base(s => {
    s.time = DAY_MS * 0.78;   // 0h40, nửa đêm
    const far = roamTile(s, 1);
    const bird = addBird(s, 'truong', far, { stray: true });
    addPred(s, 'weasel', bird);
    Object.assign(s.player, mapOf(s).spawn);
  });
  const pid = save.preds[0].id, aid = save.animals[0].id;
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);

  // băng rôn đỏ + mũi tên chỉ hướng về phía con chồn (nó ở ngoài khung nhìn)
  await expect(page.locator('#alert-banner')).toBeVisible();
  await expect(page.locator('#alert-banner')).toContainText('Chồn');
  await expect(page.locator(`.alert-arrow[data-key="pred:${pid}"]`)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('pred-weasel-alert.png') });
  expect(errors).toEqual([]);

  // đứng ngay cạnh con lạc rồi đuổi chồn trong lúc còn kịp
  const save2 = base(s => {
    s.time = DAY_MS * 0.78;
    const t = roamTile(s);
    const bird = addBird(s, 'truong', t, { stray: true });
    addPred(s, 'weasel', bird);
    Object.assign(s.player, { x: bird.x, y: bird.y + 6, dir: 0 });
  });
  const pid2 = save2.preds[0].id, aid2 = save2.animals[0].id;
  await context.clearCookies();
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.addInitScript(([k, j]) => { try { localStorage.setItem(k, j); } catch {} }, ['nongtrai-save-v3', JSON.stringify(save2)]);
  await page.goto('/');
  await ready(page);
  await shooPred(page, touch, pid2);
  await page.waitForTimeout(P.warnMs + 1500);
  const st = await look(page);
  expect(st.animals).toContain(aid2);
  expect(st.preds.some(p => p.kind === 'weasel' && p.state === 'hunt')).toBe(false);
  expect(aid).toBeTruthy();
  expect(errors).toEqual([]);
});

test('diều hâu ban ngày: đuổi kịp thì gà con thả rông không bị cắp', async ({ page, context }, testInfo) => {
  const touch = !!testInfo.project.use.hasTouch;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const save = base(s => {
    s.time = DAY_MS * 0.2;   // 10h48 sáng
    const t = roamTile(s);
    const chick = addBird(s, 'non', t);
    addPred(s, 'hawk', chick);
    Object.assign(s.player, { x: chick.x, y: chick.y + 6, dir: 0 });
  });
  const pid = save.preds[0].id, aid = save.animals[0].id;
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#alert-banner')).toContainText('Diều hâu');
  await page.screenshot({ path: testInfo.outputPath('pred-hawk.png') });
  await shooPred(page, touch, pid);
  await page.waitForTimeout(P.warnMs + 1500);
  const st = await look(page);
  expect(st.animals).toContain(aid);
  expect(st.preds.some(p => p.kind === 'hawk' && p.state === 'hunt')).toBe(false);
  expect(errors).toEqual([]);
});

test('bẫy chuột đặt trong trại bắt được con chuột đi qua', async ({ page, context }, testInfo) => {
  test.setTimeout(60_000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const save = base(s => {
    s.time = DAY_MS * 0.2;
    s.inv.deco_rattrap = 1;
    const t = roamTile(s);
    const r = placeEntity(s, { kind: 'deco', item: 'deco_rattrap' }, t.c, t.r);
    if (!r.ok) throw new Error(r.msg);
    // con chuột đứng cách bẫy 1 ô: tới lượt đổi ô là nó ngửi thấy mồi và mò tới
    const rc = t.c + 1, rr = t.r;
    s.preds.push({ id: s.nextId++, kind: 'rat', state: 'hunt', since: s.time, warned: false, strikeAt: s.time + 1e9,
      tile: { c: rc, r: rr }, x: rc * TS + 8, y: rr * TS + 8, tx: rc * TS + 8, ty: rr * TS + 8, tileAt: 0, target: null });
    Object.assign(s.player, { x: t.c * TS + 8, y: (t.r + 2) * TS + 8, dir: 3 });
    if (!canPlace) throw new Error('thiếu canPlace');
  });
  await seedSave(context, save);
  await page.goto('/');
  await ready(page);
  await expect.poll(async () => (await look(page)).rats, { timeout: 40_000, intervals: [1000] }).toBe(1);
  const st = await page.evaluate(() => {
    const s = globalThis.__farm.state, e = s.farm.ents.find(x => x.item === 'deco_rattrap');
    return { shut: !!e.shut, preds: s.preds.length, id: e.id };
  });
  expect(st.shut).toBe(true);
  expect(st.preds).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('pred-trap.png') });
  expect(errors).toEqual([]);
});
