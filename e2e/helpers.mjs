// Công cụ dựng tình huống cho e2e. Không đụng vào code game.
import { expect } from '@playwright/test';
import { createGame, SAVE_KEY } from '../public/state.js';

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
export async function seedSave(context, save) {
  await context.addInitScript(([key, json]) => {
    try { if (!localStorage.getItem(key)) localStorage.setItem(key, json); } catch {}
  }, [SAVE_KEY, JSON.stringify(save)]);
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
}

// ---------- Thao tác UI ----------
export async function createCharacter(page, name = 'Tester') {
  await page.getByPlaceholder('Tên của bạn').fill(name);
  await page.getByRole('button', { name: /Vào nông trại/ }).click();
  await expect(page.locator('#creator')).toBeHidden();
  await expect(page.locator('#hud-name')).toHaveText(name);
}

// Chạm/click vào ô ruộng `idx` trên canvas (nhân vật tự đi tới rồi làm hành động chính).
// Ô ngoài màn hình thì chạm về phía đó cho nhân vật đi, camera đi theo, lặp tới khi thấy ô.
export async function tapPlot(page, idx, touch) {
  for (let i = 0; i < 12; i++) {
    const pt = await page.evaluate(async i => {
      const { mapOf } = await import('/state.js');
      const f = globalThis.__farm, { x: wx, y: wy } = mapOf(f.state).plotCenter(i), r = document.getElementById('game-canvas').getBoundingClientRect();
      const top = document.getElementById('hud').getBoundingClientRect().bottom + 4;
      const bot = document.getElementById('bottombar').getBoundingClientRect().top - 4;
      const x = (wx * f.scale - f.view.camX) / f.dpr + r.left, y = (wy * f.scale - f.view.camY) / f.dpr + r.top;
      const ok = x > 4 && x < innerWidth - 4 && y > top && y < bot;
      return { x, y, ok, w: innerWidth, top, bot };
    }, idx);
    if (pt.ok) {
      if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
      return;
    }
    const x = Math.min(pt.w - 20, Math.max(20, pt.x)), y = Math.min(pt.bot - 20, Math.max(pt.top + 20, pt.y));
    if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await page.waitForTimeout(700);
  }
  throw new Error(`Không chạm được ô ruộng ${idx}`);
}
