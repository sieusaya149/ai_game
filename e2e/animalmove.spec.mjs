// Hotfix di chuyển vật nuôi: heo không dồn thành cục, chân không bước khi đứng yên, mèo không đi xuyên vật cản.
// Dựng bằng bản lưu ghi sẵn; trong trang tự chạy một world riêng trên bản sao state (hạt giống cố định), không có hook test trong game.
import { test, expect } from '@playwright/test';
import { makeSave, seedSave } from './helpers.mjs';
import { mapOf, roamOf, buyStrip, buyCat, placeEntity, canPlace, stageStart } from '../public/state.js';
import { bumpLayout } from '../public/farm.js';
import { DAY_MS, CLUTTER } from '../public/data.js';

// Vườn rộng, cấp cao, dọn sạch cây/đồ lặt vặt; có sẵn chuồng gà (từ vườn mới)
const bigSave = mutate => makeSave(s => {
  s.coins = 1e9; s.exp = 1e9; s.orders = []; s.nextOrderAt = 1e15; s.duskDay = s.day; s.time = DAY_MS * 0.3;
  for (let i = 0; i < 6; i++) for (const d of ['N', 'S', 'E', 'W']) buyStrip(s, d);
  s.farm.ents = s.farm.ents.filter(e => e.kind !== 'tree' && !CLUTTER[e.kind]); bumpLayout(s);
  s.animals = [];
  mutate(s);
});
const place = (s, what) => {
  const o = s.farm.owned;
  for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (canPlace(s, what, c, r).ok) return placeEntity(s, what, c, r).id;
  throw new Error('không còn chỗ');
};
const open = async (page, context, s) => {
  await seedSave(context, s);
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__farm?.state);
};

// Chạy world riêng `secs` giây (bước 0.1s) trên bản sao state; fn(state, world, W, S) gọi sau mỗi bước, trả kết quả cuối
async function sim(page, secs, hook) {
  return page.evaluate(async ([secs, hook]) => {
    const W = await import('/world.js'), S = await import('/state.js');
    let a = 12345;
    const orig = Math.random;
    Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    try {
      const s = structuredClone(globalThis.__farm.state), w = W.createWorld();
      s.scene = 'farm';
      W.ensurePositions(s);
      const fn = new Function('s', 'w', 'W', 'S', 'step', 'return (' + hook + ')(s, w, W, S, step)');
      return fn(s, w, W, S, () => { S.tick(s, 100); W.update(s, w, 0.1); });
    } finally { Math.random = orig; }
  }, [secs, String(hook)]);
}

test('đàn heo trong chuồng rải ra, không dồn thành cục', async ({ page, context }) => {
  await open(page, context, bigSave(s => {
    const id = place(s, { kind: 'pen', pen: 'pig' });
    s.farm.ents.find(e => e.id === id).lv = 3; bumpLayout(s);
    const area = mapOf(s).pens.pig.area;
    for (let i = 0; i < 8; i++) s.animals.push({ id: s.nextId++, type: 'heo', name: 'Ủn ' + i, sex: i % 2 ? 'f' : 'm', stage: 'truong', age: stageStart('heo', 'truong'), hunger: 40, happy: 100, sick: 0, bond: 0, bondXp: 0, weight: 100, nextProduct: 0, ready: false, pregnant: false, dueAt: 0, pen: id, x: area.x + 5 + i * 5, y: area.y + 40 });
    s.troughs.pig = 1e6; s.player.x = area.x + 300; s.player.y = area.y;
  }));
  // lấy mẫu mỗi giây trong 10 phút: số cặp heo sát nhau (< 7px) trung bình mỗi mẫu
  const close = await sim(page, 600, (s, w, W, S, step) => {
    let n = 0, pairs = 0;
    for (let i = 0; i < 6000; i++) {
      step(); s.player.x = s.animals[0].x + 400;
      if (i % 10 || i < 300) continue;   // bỏ 30 giây đầu
      n++;
      for (let u = 0; u < s.animals.length; u++) for (let v = u + 1; v < s.animals.length; v++) if (Math.hypot(s.animals[u].x - s.animals[v].x, s.animals[u].y - s.animals[v].y) < 7) pairs++;
    }
    return pairs / n;
  });
  expect(close).toBeLessThan(1.2);
});

test('con vật chỉ bước chân khi thật sự nhích, nhịp chân theo quãng đi', async ({ page, context }) => {
  await open(page, context, bigSave(s => {
    const id = place(s, { kind: 'pen', pen: 'chicken' });
    const ids = [id];
    const area = mapOf(s).pens.chicken.area;
    for (let i = 0; i < 6; i++) s.animals.push({ id: s.nextId++, type: 'ga', name: 'Gà ' + i, sex: i % 2 ? 'f' : 'm', stage: 'truong', age: stageStart('ga', 'truong'), hunger: 100, happy: 100, sick: 0, bond: 0, bondXp: 0, weight: 1, nextProduct: 0, ready: false, pregnant: false, dueAt: 0, pen: id, x: area.x + 10 + i * 8, y: area.y + 20 });
    // vài con thả rông ở ô cách xa chỗ đang đứng (đường thẳng vắt qua ô ngoài vùng đi lại)
    const roam = [...roamOf(s).tiles];
    for (let i = 0; i < 3; i++) {
      const t = roam[(i * 37) % roam.length], from = roam[(i * 37 + 71) % roam.length];
      s.animals.push({ id: s.nextId++, type: 'ga', name: 'Gà rông ' + i, sex: 'f', stage: 'truong', age: stageStart('ga', 'truong'), hunger: 100, happy: 100, sick: 0, bond: 0, bondXp: 0, weight: 1, nextProduct: 0, ready: false, pregnant: false, dueAt: 0, pen: id, tile: { c: t.c, r: t.r }, x: from.c * 16 + 8, y: from.r * 16 + 8 });
    }
  }));
  const bad = await sim(page, 300, (s, w, W, S, step) => {
    let walkInPlace = 0, badCadence = 0, walks = 0;
    const last = new Map();
    for (let i = 0; i < 3000; i++) {
      step();
      for (const a of s.animals) {
        const rt = w.rt.get('a' + a.id), p = last.get(a.id);
        if (rt && p) {
          const moved = Math.hypot(a.x - p.x, a.y - p.y);
          if (rt.walking) {
            walks++;
            if (moved < 0.01) walkInPlace++;
            else if (rt.anim - p.anim > 0 && Math.abs((rt.anim - p.anim) * 24 - moved) > 0.5 && rt.anim - p.anim > 0.001 && p.walking) badCadence++;
          }
        }
        last.set(a.id, { x: a.x, y: a.y, anim: rt?.anim ?? 0, walking: rt?.walking });
      }
    }
    return { walkInPlace, badCadence, walks };
  });
  expect(bad.walks).toBeGreaterThan(100);
  expect(bad.walkInPlace).toBe(0);
  expect(bad.badCadence).toBe(0);
});

test('mèo không đi xuyên nhà, rào, cây, nước', async ({ page, context }) => {
  await open(page, context, bigSave(s => {
    place(s, { kind: 'pen', pen: 'pig' }); place(s, { kind: 'pen', pen: 'pasture' });
    const t = place(s, { kind: 'cathouse' });
    for (let i = 0; i < 3; i++) { const r = buyCat(s, i % 2 ? 'm' : 'f'); Object.assign(s.cats.at(-1), { stage: 'truong', age: stageStart('meo', 'truong'), hunger: 40 }); }
    s.time = DAY_MS * 0.3;
  }));
  const bad = await sim(page, 900, (s, w, W, S, step) => {
    let inSolid = 0, moves = 0;
    const last = new Map();
    for (let i = 0; i < 9000; i++) {
      step();
      for (const c of s.cats) {
        if ((c.scene ?? 'farm') !== 'farm') continue;
        if (!W.canStand(c.x, c.y) && last.get(c.id)?.ok) inSolid++;   // bước từ chỗ đứng được vào chỗ vật cản
        if (last.get(c.id) && Math.hypot(c.x - last.get(c.id).x, c.y - last.get(c.id).y) > 0.01) moves++;
        last.set(c.id, { x: c.x, y: c.y, ok: W.canStand(c.x, c.y) });
      }
    }
    return { inSolid, moves };
  });
  expect(bad.moves).toBeGreaterThan(200);
  expect(bad.inSolid).toBe(0);
});
