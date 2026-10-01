// Chạy MỘT LẦN bằng code bản v1 để chụp bản lưu v1 thật làm mẫu test chuyển đổi.
// node tests/fixtures/make-v1.mjs  → ghi v1-*.json cạnh file này.
import { writeFileSync } from 'node:fs';
import * as G from '../../public/state.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const out = (name, s) => writeFileSync(new URL(`./${name}.json`, import.meta.url), JSON.stringify(s, null, 1));
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };

// 1. Vừa tạo nhân vật
const fresh = G.createGame({ name: 'Mới', look: {} });
fresh.savedAt = 1_700_000_000_000;
out('v1-fresh', fresh);

// 2. Đang chơi dở: có cây đang lớn, cây chín, con vật, trứng, phân, đồ trang trí, đơn hàng
const mid = G.createGame({ name: 'Dở', look: { hat: 1 } });
quiet(() => {
  for (const i of [0, 1, 2]) { G.perform(mid, { kind: 'plot', idx: i }, 'till'); G.perform(mid, { kind: 'plot', idx: i }, 'plant'); G.perform(mid, { kind: 'plot', idx: i }, 'water'); }
  mid.weather = 'rain';
  G.tick(mid, 70_000);                       // ô 0..2 lớn được một nửa
  G.perform(mid, { kind: 'plot', idx: 6 }, 'till');
  G.tick(mid, 6 * 60_000);                    // gà đẻ trứng, chó ỉa
});
// đặt rõ tiến độ: ô 0 chín, ô 1 lớn một nửa, ô 2 mới nhú
Object.assign(mid.plots[0].crop, { progress: 1, ripeAt: mid.time, rotten: false });
Object.assign(mid.plots[1].crop, { progress: 0.5, ripeAt: 0, rotten: false });
Object.assign(mid.plots[2].crop, { progress: 0.2, ripeAt: 0, rotten: false });
mid.coins = 5000; mid.exp = 400;
mid.inv.deco_scarecrow = 1; mid.player.x = 120; mid.player.y = 200; G.placeDeco(mid, 'deco_scarecrow');
G.buy(mid, 'seed_carot', 4);
mid.savedAt = 1_700_000_000_000;
out('v1-mid', mid);

// 3. Đã mở hết 36 ô
const full = G.createGame({ name: 'Đầy', look: {} });
for (const p of full.plots) p.unlocked = true;
full.coins = 99999; full.exp = 20000;
full.savedAt = 1_700_000_000_000;
out('v1-full', full);
console.log('ok');
