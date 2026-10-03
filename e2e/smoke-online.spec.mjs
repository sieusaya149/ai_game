// Smoke live chơi online: hai trình duyệt A và B trên bản đã deploy (mặc định https://game.huninna.com).
// Chạy theo playwright.smoke.config.mjs (không bật server local). Không có mã mời thì bỏ qua.
//
// Cách chạy sau mỗi lần deploy:
//   1. Trên VPS, tạo 2 mã mời:
//        cd ~/project/ai_game && docker compose exec web node server/admin.mjs invite 2
//   2. Trên máy local (Windows PowerShell), ở thư mục repo:
//        $env:SMOKE_INVITES='XXXX-XXXX,YYYY-YYYY'; npm run test:smoke; Remove-Item Env:SMOKE_INVITES
//      (chỉ chạy bộ online: npx playwright test -c playwright.smoke.config.mjs e2e/smoke-online.spec.mjs)
//      Thử với server local: $env:SMOKE_URL='http://127.0.0.1:4173' (mã mời tạo bằng admin trên DB của server đó).
//      Giả lập mạng chậm như bản thật: thêm $env:SMOKE_LAG_MS='300' (mỗi request /api/* trễ chừng đó).
//   3. Cuối lần chạy in ra dòng "SMOKE_ACCOUNTS: zzsmokeXXXXX zzsmokeYYYYY". Xóa hai tài khoản test trên VPS:
//        cd ~/project/ai_game && docker compose exec web node server/admin.mjs delete-account zzsmokeXXXXX
//        cd ~/project/ai_game && docker compose exec web node server/admin.mjs delete-account zzsmokeYYYYY
//
// Kịch bản: đăng ký bằng mã mời, mang vườn chơi đơn lên làng, thấy nhau trong làng, chat + biểu cảm, kết bạn,
// B thăm vườn A và tưới giúp một ô (A đang online thấy ngay, B thấy vườn A cập nhật theo A), B mua gà con ở chợ, cả hai đăng xuất rồi đăng nhập lại
// thấy vườn còn nguyên, /api/health trả ok. Tên tài khoản test có tiền tố `zzsmoke` để dễ nhận ra và xóa.
// Chợ chỉ mở ban ngày giờ làng: tới bước mua, trình duyệt B mới lệch giờ làng sang sáng (villageAt, chỉ đổi phản hồi
// /api/health phía trình duyệt test). Lệch sớm hơn thì vườn nào mở trên máy đó cũng bị chạy bù quãng lệch (kể cả vườn A
// lúc B ghé thăm: cây khô để lâu thì có sâu, bệnh, chết, B không tưới được nữa).
import { test, expect } from '@playwright/test';
import { makeSave, seedSave, closeAway, tapPlot, villageAt } from './helpers.mjs';
import { moveEntity, mapOf } from '../public/state.js';
import { FIELD_SIZE, TS } from '../public/layout.js';
import { GUEST, QUICK_CHAT } from '../public/data.js';

const INVITES = (process.env.SMOKE_INVITES || '').split(/[\s,;]+/).filter(Boolean);
const rand = () => Math.random().toString(36).slice(2, 7);
const NAMES = ['zzsmoke' + rand(), 'zzsmoke' + rand()];
const PIN = String(100000 + Math.floor(Math.random() * 900000));
const LAG = Number(process.env.SMOKE_LAG_MS) || 0;
const NET = { timeout: 20_000 };                  // mạng thật: chờ rộng tay
const GATE_AT = { x: 488, y: 364 };               // trước cổng bạn bè trong làng
const MARKET_AT = { x: 296, y: 96 };              // cạnh sạp chợ Bà Tư
const st = (page, fn, arg) => page.evaluate(fn, arg);
const registered = [];

test.describe.configure({ mode: 'serial' });
test.use({ actionTimeout: 20_000 });   // không để một cú bấm treo tới hết giờ cả test
test.afterAll(() => {
  // tên tài khoản test để quản trị chạy delete-account (in cả khi test hỏng giữa chừng)
  if (registered.length) console.log('SMOKE_ACCOUNTS: ' + registered.join(' '));
});

// Vườn A: khối ruộng dời ra sát cổng vườn, ô 0 cà rốt khô cần tưới; A đứng trong làng
function ownerGarden(s) {
  s.farm.ents = s.farm.ents.filter(e => !(e.kind === 'tree' && e.c === 42 && e.r === 28));
  Object.assign(s.farm.ents.find(e => e.kind === 'house'), { c: 39, r: 27 });
  s.farm.rev++;
  const id = k => s.farm.ents.find(e => e.kind === k).id;
  for (const [k, c, r] of [['shed', 39, 20], ['shipbin', 33, 22], ['doghouse', 43, 32]]) expect(moveEntity(s, id(k), c, r).ok, k).toBe(true);
  Object.assign(s.dog, mapOf(s).dogHome);
  const t0 = mapOf(s).plotTile(0), exit = mapOf(s).arrive.village, o = s.farm.owned, spots = [];
  const field = s.farm.ents.find(e => e.kind === 'field' && t0.c >= e.c && t0.c < e.c + FIELD_SIZE && t0.r >= e.r && t0.r < e.r + FIELD_SIZE);
  for (let r = o.r; r <= o.r + o.h - FIELD_SIZE; r++) for (let c = o.c; c <= o.c + o.w - FIELD_SIZE; c++)
    spots.push({ c, r, d: Math.hypot((c + 1) * TS + 8 - exit.x, (r + 1) * TS + 8 - exit.y) });
  spots.sort((a, b) => a.d - b.d);
  expect(spots.some(q => q.d > TS && moveEntity(s, field.id, q.c, q.r).ok), 'dời khối ruộng ra gần cổng').toBe(true);
  const p = s.plots[0];
  p.soil = 'tilled'; p.water = 0; p.weeds = false;
  p.crop = { id: 'carot', progress: 0.4, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
  s.scene = 'village'; Object.assign(s.player, { ...MARKET_AT, dir: 0 });
}
const guestGarden = s => { s.scene = 'village'; Object.assign(s.player, { ...GATE_AT, dir: 3 }); };

// Đăng nhập / đăng ký trên màn đầu (Vào làng → biểu mẫu)
async function openAuth(page) {
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await expect(page.getByPlaceholder('PIN 6 số')).toBeVisible(NET);
}
async function logIn(page, name) {
  await openAuth(page);
  await page.getByPlaceholder('Tên nhân vật').fill(name);
  await page.getByPlaceholder('PIN 6 số').fill(PIN);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}
// Chạm điểm (x, y) của bản đồ; ngoài màn hình thì chạm về phía đó (tránh HUD, thanh dưới, bản đồ nhỏ)
async function tapWorld(page, x, y) {
  const pt = await page.evaluate(([wx, wy]) => {
    const f = globalThis.__farm, rc = document.getElementById('game-canvas').getBoundingClientRect();
    const top = document.getElementById('hud').getBoundingClientRect().bottom + 30, bot = document.getElementById('bottombar').getBoundingClientRect().top - 30;
    const mini = document.getElementById('mini-wrap').getBoundingClientRect();
    let sx = (wx * f.scale - f.view.camX) / f.dpr + rc.left, sy = (wy * f.scale - f.view.camY) / f.dpr + rc.top;
    sx = Math.min(innerWidth - 60, Math.max(60, sx)); sy = Math.min(bot - 20, Math.max(top + 20, sy));
    if (sx > mini.left - 30 && sy < mini.bottom + 30) sy = Math.min(bot - 20, mini.bottom + 40);
    return { x: sx, y: sy };
  }, [x, y]);
  await page.mouse.click(pt.x, pt.y);
}
// Đứng trước cổng bạn bè rồi bấm nút hành động tới khi bảng Bạn bè mở; chưa thấy nút thì chạm về phía cổng rồi thử lại
async function openGate(page) {
  for (let i = 0; i < 12; i++) {
    const main = page.locator('#main-action'), name = page.locator('#target-name');
    if (await page.locator('.sheet-head h2', { hasText: /Bạn bè/ }).isVisible()) return;
    if (await main.isVisible() && await name.isVisible() && (await name.textContent()) === 'Cổng bạn bè') {
      await main.click({ timeout: 3000 }).catch(() => {});
      if (await page.locator('.sheet-head h2', { hasText: /Bạn bè/ }).waitFor({ timeout: 3000 }).then(() => true, () => false)) return;
    }
    await tapWorld(page, GATE_AT.x, GATE_AT.y);
    await page.waitForTimeout(800);
  }
  throw new Error('không mở được cổng bạn bè: ' + JSON.stringify(await st(page, () => globalThis.__farm.state.player)));
}
const serverFarm = async page => (await (await page.request.get('/api/farm')).json()).farm ?? null;
const peers = page => st(page, () => globalThis.__farm.peers.map(p => ({ name: p.name, chat: p.chat, emote: p.emote?.e ?? null })));
const inGame = async page => {
  await page.waitForFunction(() => globalThis.__farm?.state?.mode === 'online', null, NET);
  await closeAway(page);
  await expect(page.locator('#live')).toBeVisible(NET);
};

// Tới sạp chợ Bà Tư rồi mở bảng chợ: sạp trên màn hình thì chạm thẳng (nhân vật tự đi tới), chưa thì đi về phía đó
async function openMarket(page) {
  const sheet = page.locator('.sheet-head h2', { hasText: /Chợ Bà Tư/ });
  for (let i = 0; i < 15; i++) {
    if (await sheet.isVisible()) return;
    const p = await st(page, async () => {
      const { sceneMap } = await import('/state.js');
      const f = globalThis.__farm, b = sceneMap(f.state).building('market'), rc = document.getElementById('game-canvas').getBoundingClientRect();
      const x = ((b.x + 24) * f.scale - f.view.camX) / f.dpr + rc.left, y = ((b.y + 20) * f.scale - f.view.camY) / f.dpr + rc.top;
      const top = document.getElementById('hud').getBoundingClientRect().bottom + 20, bot = document.getElementById('bottombar').getBoundingClientRect().top - 20;
      return { x, y, wx: b.x + 24, wy: b.y + 40, on: x > 80 && x < innerWidth - 160 && y > top && y < bot };
    });
    if (p.on) {
      await page.mouse.click(p.x, p.y);
      if (await sheet.waitFor({ timeout: 4000 }).then(() => true, () => false)) return;
    } else await tapWorld(page, p.wx, p.wy);
    await page.waitForTimeout(800);
  }
  throw new Error('không mở được chợ Bà Tư');
}
// Cài đặt → Đăng xuất → Vào làng → đăng nhập lại; trả trạng thái vườn trước và sau
async function relog(P) {
  const pick = () => st(P.page, () => { const s = globalThis.__farm.state; return { account: s.account, coins: s.coins, animals: s.animals.map(a => a.id).sort((a, b) => a - b), water: s.plots[0].water, guests: s.guests.map(g => [g.by, g.act]) }; });
  const before = await pick();
  await P.page.locator('.bb-btn[data-panel="settings"]').click();
  await P.page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(P.page.getByRole('button', { name: /Chơi một mình/ })).toBeVisible(NET);
  await logIn(P.page, P.name);
  await expect(P.page.locator('#creator')).toBeHidden(NET);
  await inGame(P.page);
  return { before, after: await pick() };
}

// Trình duyệt mới có vườn chơi đơn ghi sẵn → Cài đặt → Vào làng → đăng ký bằng mã mời → Mang vườn chơi đơn lên
async function bringUp(browser, baseURL, name, invite, mutate) {
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } });
  await seedSave(context, makeSave(mutate, { name: 'Smoke' }));
  if (LAG) await context.route('**/api/**', async r => { await new Promise(res => setTimeout(res, LAG)); await r.continue().catch(() => {}); });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#hud-name')).toHaveText('Smoke', NET);
  await page.locator('.bb-btn[data-panel="settings"]').click();
  await page.getByRole('button', { name: /Vào làng/ }).click();
  await openAuth(page);
  await page.getByRole('button', { name: 'Tạo tài khoản mới' }).click();
  await page.getByPlaceholder('Tên nhân vật').fill(name);
  await page.getByPlaceholder('PIN 6 số').fill(PIN);
  await page.getByPlaceholder('Mã mời').fill(invite);
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mang vườn này lên làng?' })).toBeVisible(NET);
  registered.push(name);
  await page.getByRole('button', { name: /Mang vườn chơi đơn lên/ }).click();
  await expect(page.locator('#creator')).toBeHidden(NET);
  await expect(page.locator('#hud-name')).toHaveText(name, NET);
  await inGame(page);
  await expect.poll(() => serverFarm(page).then(f => f?.name), NET).toBe(name);
  await page.keyboard.press('Shift');
  return { name, context, page, errors };
}

test('smoke live online: hai người chơi làng, kết bạn, giúp vườn, mua vật nuôi, đăng nhập lại vườn còn nguyên', async ({ browser, baseURL }) => {
  test.skip(INVITES.length < 2, 'Cần 2 mã mời: tạo trên VPS bằng `docker compose exec web node server/admin.mjs invite 2`, rồi chạy với $env:SMOKE_INVITES="mã1,mã2"');
  test.setTimeout(300_000);
  let A, B;
  try {
    await test.step('1–2. đăng ký A, B bằng mã mời, mang vườn chơi đơn lên làng', async () => {
      A = await bringUp(browser, baseURL, NAMES[0], INVITES[0], ownerGarden);
      B = await bringUp(browser, baseURL, NAMES[1], INVITES[1], guestGarden);
    });

    await test.step('3. cùng ở làng: thấy nhau trong danh sách người đang ở đây', async () => {
      await expect.poll(() => peers(A.page).then(l => l.map(p => p.name)), NET).toContain(B.name);
      await expect.poll(() => peers(B.page).then(l => l.map(p => p.name)), NET).toContain(A.name);
      await A.page.locator('#live-people').click();
      await expect(A.page.locator('.sheet-head h2')).toHaveText(/Người đang ở đây/);
      await expect(A.page.locator('.online-row', { hasText: B.name })).toBeVisible(NET);
      await A.page.locator('#panel-root .close').click();
    });

    await test.step('4. B chat nhanh, A thả biểu cảm: bên kia nhận được', async () => {
      await B.page.locator('#live-chat').click();
      await B.page.getByRole('button', { name: QUICK_CHAT[0] }).click();
      await expect.poll(() => peers(A.page).then(l => l.find(p => p.name === B.name)?.chat), { ...NET, intervals: [100] }).toBe(QUICK_CHAT[0]);
      await A.page.getByRole('button', { name: '👋' }).click();
      await expect.poll(() => peers(B.page).then(l => l.find(p => p.name === A.name)?.emote), { ...NET, intervals: [100] }).toBe('👋');
    });

    await test.step('5. A kết bạn với B', async () => {
      await A.page.locator('#live-friends').click();
      await A.page.locator('#fr-input').fill(B.name);
      await A.page.getByRole('button', { name: 'Thêm', exact: true }).click();
      await expect(A.page.locator('.fr-row', { hasText: B.name })).toBeVisible(NET);
      await A.page.locator('#panel-root .close').click();
      const fr = await (await A.page.request.get('/api/friends')).json();
      expect(fr.friends.map(f => f.name)).toContain(B.name);
    });

    await test.step('6. B thăm vườn A, tưới giúp ô 0; A đang online thấy ô được tưới', async () => {
      const coins = await st(B.page, () => globalThis.__farm.state.coins);
      await openGate(B.page);
      await B.page.locator(`.gate-row[data-name="${A.name}"] .gate-go`).click();
      await expect.poll(() => st(B.page, () => globalThis.__farm.state?.scene), NET).toBe('visit');
      await expect(B.page.locator('#visit-help')).toHaveText(new RegExp(`Còn ${GUEST.helpMax} lượt giúp`), NET);
      // chạm tới khi ô được tưới (ô vừa mọc cỏ hay có sâu thì lần chạm đầu là nhổ cỏ / bắt sâu giúp)
      await tapPlot(B.page, 0, false, () => st(B.page, () => globalThis.__farm.state.plots[0].water > 50));
      await expect.poll(() => st(B.page, () => globalThis.__farm.state.coins), NET).toBeGreaterThanOrEqual(coins + GUEST.helpCoins);
      await expect.poll(() => st(A.page, () => globalThis.__farm.state.plots[0].water), NET).toBeGreaterThan(50);
      await expect(A.page.locator('#toasts')).toContainText(`${B.name} đã tưới 1 ô giúp bạn`, NET);
      // B thấy vườn A theo A ngay (tin `world` A gửi qua server): nhật ký khách trong bản đi dạo là của A, việc tưới đã được A xem
      await expect.poll(() => st(B.page, n => globalThis.__farm.state.guests?.some(g => g.by === n && g.act === 'water' && g.seen), B.name), NET).toBe(true);
    });

    await test.step('7. B về làng, mua một gà con ở chợ Bà Tư', async () => {
      await B.page.locator('#visit-leave').click();
      await expect.poll(() => st(B.page, () => globalThis.__farm.state?.scene), NET).toBe('village');
      await expect(B.page.locator('#fade')).not.toHaveClass(/on/);
      // chợ chỉ mở ban ngày giờ làng: từ đây trình duyệt B thấy giờ làng là buổi sáng; đăng nhập lại để đo giờ server mới
      await villageAt(B.context);
      await relog(B);
      const n = await st(B.page, () => globalThis.__farm.state.animals.length);
      await openMarket(B.page);
      await B.page.getByRole('button', { name: /Vật nuôi/ }).click();
      await B.page.locator('.row', { hasText: 'Gà con' }).getByRole('button', { name: 'Mua ♂ đực' }).click();
      await expect.poll(() => st(B.page, () => globalThis.__farm.state.animals.length)).toBe(n + 1);
      await B.page.locator('#panel-root .close').click();
    });

    await test.step('8. A và B đăng xuất rồi đăng nhập lại: vườn còn ô đã được tưới, còn gà mới mua', async () => {
      const a = await relog(A);
      expect(a.after.account).toBe(A.name);
      expect(a.after.coins).toBe(a.before.coins);
      expect(a.after.animals).toEqual(a.before.animals);
      expect(a.after.water).toBeGreaterThan(0);
      expect(a.after.guests).toContainEqual([B.name, 'water']);
      const b = await relog(B);
      expect(b.after.account).toBe(B.name);
      expect(b.after.animals).toEqual(b.before.animals);
      expect(b.after.coins).toBe(b.before.coins);
      // và trên server cũng vậy
      expect((await serverFarm(A.page)).guests.some(g => g.by === B.name && g.act === 'water')).toBe(true);
      expect((await serverFarm(B.page)).animals.length).toBe(b.before.animals.length);
    });

    await test.step('9. /api/health trả ok', async () => {
      const res = await A.page.request.get('/api/health');
      expect(res.status()).toBe(200);
      expect((await res.json()).ok).toBe(true);
    });

    expect(A.errors.concat(B.errors)).toEqual([]);
  } finally {
    for (const p of [A, B]) await p?.context.close();
  }
});
