// Công cụ dựng tình huống cho e2e. Không đụng vào code game.
import { expect } from '@playwright/test';
import { createGame, SAVE_KEY, buyStrip, placeEntity, canPlace, buyAnimal, mapOf } from '../public/state.js';
import { villageCal } from '../public/clock.js';
import { DAY_MS } from '../public/data.js';

// Lịch làng chạy theo giờ server thật (issue 23): test cần giờ ban ngày thì trả `now` của /api/health lệch tới
// lúc `frac` (0 = 6h sáng) của ngày làng gần nhất. Chỉ đổi phản hồi mạng, không đụng code game.
export async function villageAt(context, frac = 0.1) {
  await context.route('**/api/health', async route => {
    const res = await route.fetch(), body = await res.json();
    const shift = ((frac - villageCal(body.now).frac + 1) % 1) * DAY_MS;
    await route.fulfill({ response: res, json: { ...body, now: body.now + shift } });
  });
}

// Bản lưu hợp lệ lấy thẳng từ createGame của game; mutate(s) để chỉnh thêm.
export function makeSave(mutate, opts = { name: 'Tester' }) {
  const s = createGame(opts);
  s.tutorial = 99; // bỏ khung hướng dẫn cho đỡ vướng
  mutate?.(s);
  return s;
}

// Một ô đã cuốc, đã gieo cải, có nước, lớn tới `progress`.
export function plantedCrop(s, idx, progress) {
  const p = s.plots[idx];
  p.soil = 'tilled';
  p.water = 100;
  p.crop = { id: 'cai', progress, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
}

// Ghi sẵn bản lưu trước khi trang tải. Chỉ ghi khi chưa có save, nên tải lại không ghi đè.
export async function seedSave(context, save, opts = {}) {
  await context.addInitScript(([key, json]) => {
    try { if (!localStorage.getItem(key)) localStorage.setItem(key, json); } catch {}
  }, [SAVE_KEY, JSON.stringify(save)]);
  // Đã gợi ý tiết kiệm pin rồi: khỏi hiện hộp gợi ý giữa chừng lúc máy ảo chạy chậm (test riêng cho gợi ý dùng seedSave với { hint: true })
  if (!opts.hint) await context.addInitScript(() => { try { if (!localStorage.getItem('nongtrai-pref')) localStorage.setItem('nongtrai-pref', JSON.stringify({ battery: false, hinted: true })); } catch {} });
}

// Tua thời gian: lùi savedAt `ms` rồi tải lại, để loadGame chạy bù offline.
// Phải lùi ở lúc trang mới bắt đầu tải (sau pagehide của trang cũ, vốn tự lưu đè), nên dùng init script + sessionStorage.
export async function installWarp(context) {
  await context.addInitScript(key => {
    try {
      const ms = Number(sessionStorage.getItem('__warp'));
      if (!ms) return;
      sessionStorage.removeItem('__warp');
      const s = JSON.parse(localStorage.getItem(key));
      s.savedAt = Date.now() - ms;
      localStorage.setItem(key, JSON.stringify(s));
    } catch {}
  }, SAVE_KEY);
}
export async function timeWarp(page, ms) {
  await page.evaluate(v => sessionStorage.setItem('__warp', String(v)), ms);
  await page.reload();
  await page.waitForFunction(() => globalThis.__farm?.state);
  await closeAway(page);
}
// Đóng màn "Trong lúc bạn vắng nhà" nếu nó hiện (nó che game).
export async function closeAway(page) {
  const away = page.locator('#away');
  try { await away.waitFor({ state: 'visible', timeout: 1500 }); } catch { return; }
  await away.getByRole('button').click();
  await expect(away).toBeHidden();
}

// ---------- Thao tác UI ----------
export async function createCharacter(page, name = 'Tester') {
  // màn đầu hỏi chế độ chơi: chọn Chơi một mình (bản server cũ không có màn này)
  // chờ màn đầu hiện hẳn (art nạp xong mới dựng màn) rồi mới xem là màn nào
  const solo = page.getByRole('button', { name: /Chơi một mình/ }), input = page.getByPlaceholder('Tên của bạn');
  await expect(solo.or(input).first()).toBeVisible({ timeout: 15_000 });
  if (await solo.isVisible()) await solo.click();
  await input.fill(name);
  await page.getByRole('button', { name: /Vào nông trại/ }).click();
  await expect(page.locator('#creator')).toBeHidden();
  await expect(page.locator('#hud-name')).toHaveText(name);
}

// Chạm/click vào ô ruộng `idx` trên canvas (nhân vật tự đi tới rồi làm hành động chính).
// Ô ngoài màn hình thì chạm về phía đó cho nhân vật đi, camera đi theo, lặp tới khi thấy ô.
// `until` (tùy chọn): hàm async trả true khi kết quả mong đợi đã xảy ra. Chạm có thể bị game bỏ qua (nhấn quá 700ms lúc máy ì,
// camera còn trượt nên trượt ô, nhân vật đang bận), nên chưa thấy kết quả thì chạm lại thay vì chờ mãi.
export async function tapPlot(page, idx, touch, until) {
  if (!until) return tapPlotOnce(page, idx, touch);
  for (let attempt = 0; attempt < 4; attempt++) {
    await tapPlotOnce(page, idx, touch);
    const end = Date.now() + 5000;
    while (Date.now() < end) {
      if (await until()) return;
      await page.waitForTimeout(100);
    }
  }
  throw new Error(`Chạm ô ruộng ${idx} nhiều lần mà không thấy kết quả`);
}

async function tapPlotOnce(page, idx, touch) {
  // chờ camera dừng trượt (theo nhân vật) để tọa độ tính ra còn đúng lúc chạm
  let last = '';
  for (let k = 0; k < 30; k++) {
    const cur = await page.evaluate(() => JSON.stringify(globalThis.__farm.view));
    if (cur === last) break;
    last = cur;
    await page.waitForTimeout(120);
  }
  for (let i = 0; i < 12; i++) {
    const pt = await page.evaluate(async i => {
      const { mapOf } = await import('/state.js');
      const f = globalThis.__farm, { x: wx, y: wy } = mapOf(f.state).plotCenter(i), r = document.getElementById('game-canvas').getBoundingClientRect();
      const top = document.getElementById('hud').getBoundingClientRect().bottom + 4;
      const bot = document.getElementById('bottombar').getBoundingClientRect().top - 4;
      const x = (wx * f.scale - f.view.camX) / f.dpr + r.left, y = (wy * f.scale - f.view.camY) / f.dpr + r.top;
      const mini = document.getElementById('mini-wrap').getBoundingClientRect();   // bản đồ nhỏ che một góc màn hình
      const inMini = (x, y) => x > mini.left - 14 && x < mini.right + 14 && y > mini.top - 14 && y < mini.bottom + 14;
      const ok = x > 4 && x < innerWidth - 4 && y > top && y < bot && !inMini(x, y);
      return { x, y, ok, w: innerWidth, top, bot, miniBottom: mini.bottom + 24, miniLeft: mini.left - 24 };
    }, idx);
    if (pt.ok) {
      if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
      return;
    }
    let x = Math.min(pt.w - 20, Math.max(20, pt.x)), y = Math.min(pt.bot - 20, Math.max(pt.top + 20, pt.y));
    if (x > pt.miniLeft && y < pt.miniBottom) y = Math.min(pt.bot - 20, pt.miniBottom);   // không chạm trúng bản đồ nhỏ
    if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await page.waitForTimeout(700);
  }
  throw new Error(`Không chạm được ô ruộng ${idx}`);
}

// Tâm ô (c, r) của bản đồ ra tọa độ màn hình (px CSS), theo camera hiện tại.
export async function tilePoint(page, c, r) {
  return page.evaluate(([c, r]) => {
    const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
    const wx = c * 16 + 8, wy = r * 16 + 8;
    return { x: (wx * f.scale - f.view.camX) / f.dpr + rc.left, y: (wy * f.scale - f.view.camY) / f.dpr + rc.top };
  }, [c, r]);
}

// Kéo từ điểm `from` bằng chuột hoặc ngón tay (CDP touch). Trả về { move(to), end() } để kiểm tra giữa chừng.
export async function startDrag(page, touch, from) {
  if (!touch) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    return { move: to => page.mouse.move(to.x, to.y, { steps: 8 }), end: () => page.mouse.up() };
  }
  const cdp = await page.context().newCDPSession(page);
  const touchAt = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
  await touchAt('touchStart', from);
  let at = from;
  return {
    async move(to) {
      for (let i = 1; i <= 8; i++) await touchAt('touchMove', { x: at.x + (to.x - at.x) * i / 8, y: at.y + (to.y - at.y) * i / 8 });
      at = to;
    },
    end: () => touchAt('touchEnd'),
  };
}
// Vườn 64x48 mở hết đất, đầy công trình: dựng bằng API công khai (buyStrip, placeEntity, buyAnimal).
export function bigFarmSave() {
  return makeSave(s => {
    s.coins = 1e9; s.exp = 1e9;
    for (let i = 0; i < 40; i++) for (const d of ['N', 'S', 'E', 'W']) buyStrip(s, d);
    const o = s.farm.owned;
    s.inv.deco_scarecrow = s.inv.deco_flower = s.inv.deco_lamp = s.inv.deco_bench = 999;
    const decos = ['deco_flower', 'deco_lamp', 'deco_bench', 'deco_scarecrow'];
    // khối ruộng và chuồng ở những chỗ trống tìm được, rồi rải đồ trang trí cách 3 ô khắp vườn
    const spot = what => { for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (canPlace(s, what, c, r).ok) return placeEntity(s, what, c, r).ok; return false; };
    for (let i = 0; i < 8; i++) spot({ kind: 'field' });
    spot({ kind: 'pen', pen: 'pig' }); spot({ kind: 'pen', pen: 'pasture' });
    let k = 0;
    for (let r = o.r; r < o.r + o.h; r += 3) for (let c = o.c; c < o.c + o.w; c += 3) if (canPlace(s, { kind: 'deco', item: decos[k % 4] }, c, r).ok) placeEntity(s, { kind: 'deco', item: decos[k++ % 4] }, c, r);
    for (const t of ['ga', 'ga', 'ga', 'ga', 'ga', 'heo', 'heo', 'bo', 'bo', 'cuu', 'cuu']) buyAnimal(s, t);
    // ruộng trồng cải đã chín: nhiều ô lấp lánh
    for (const p of s.plots) if (p.unlocked) plantedCrop(s, p.idx, 1e9);
    mapOf(s);
  });
}