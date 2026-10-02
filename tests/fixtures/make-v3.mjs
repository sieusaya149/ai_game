// Chạy MỘT LẦN bằng code bản v3 (trước issue 50) để chụp bản lưu v3 thật làm mẫu test chuyển v3→v4.
// node tests/fixtures/make-v3.mjs  → ghi v3-*.json cạnh file này.
import { writeFileSync } from 'node:fs';
import * as G from '../../public/state.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const out = (name, s) => writeFileSync(new URL(`./${name}.json`, import.meta.url), JSON.stringify(s, null, 1));
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };

// Đang chơi dở: cây đang lớn ở nhiều giai đoạn (một ô có bón phân, một ô chín), đồ trong giỏ, kho, thùng giao hàng, đơn hàng
const farm = quiet(() => {
  const s = G.createGame({ name: 'Dở', look: {} });
  s.tutorial = 99; s.coins = 3000; s.exp = 900;
  const at = idx => ({ kind: 'plot', idx });
  G.buy(s, 'seed_lua', 4); G.buy(s, 'seed_cachua', 2);
  const plant = (idx, seed, fert) => {
    s.selectedSeed = seed;
    G.perform(s, at(idx), 'till'); G.perform(s, at(idx), 'plant'); G.perform(s, at(idx), 'water');
    if (fert) G.perform(s, at(idx), 'fertilize');
  };
  plant(0, 'cai'); plant(1, 'carot', true); plant(2, 'lua'); plant(3, 'cachua'); plant(4, 'cai');
  // thu hoạch vài lần cho có thống kê
  s.plots[4].crop.progress = 1; G.perform(s, at(4), 'harvest');
  plant(4, 'cai'); s.plots[4].crop.progress = 1; G.perform(s, at(4), 'harvest');
  plant(4, 'cai');
  G.tick(s, 20_000);
  Object.assign(s.plots[0].crop, { progress: 1, ripeAt: s.time });   // chín
  Object.assign(s.plots[1].crop, { progress: 0.5 });                  // ra hoa
  Object.assign(s.plots[2].crop, { progress: 0.2 });                  // mầm
  Object.assign(s.plots[3].crop, { progress: 0.4 });                  // cây non
  s.basket = { cai: 6, carot: 3, trung: 2 };
  s.inv.lua = 5; s.inv.sua_ngon = 1;
  s.shipbin.items = { cai: 2, trung: 1 };
  s.orders = [{ id: s.nextId++, who: 'Cô Ba', items: { cai: 3, carot: 2 }, coins: 50, exp: 10 }];
  return s;
});
farm.savedAt = 1_700_000_000_000;
out('v3-farm', farm);

// Vừa tạo nhân vật
const fresh = G.createGame({ name: 'Mới', look: {} });
fresh.savedAt = 1_700_000_000_000;
out('v3-fresh', fresh);
console.log('ok', farm.v, farm.stats.harvests, farm.plots.slice(0, 5).map(p => p.crop && `${p.crop.id}:${p.crop.progress}`).join(' '));
