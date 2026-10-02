// Chạy MỘT LẦN bằng code bản v2 (trước issue 34) để chụp bản lưu v2 thật làm mẫu test chuyển v2→v3.
// node tests/fixtures/make-v2.mjs  → ghi v2-*.json cạnh file này.
import { writeFileSync } from 'node:fs';
import * as G from '../../public/state.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const out = (name, s) => writeFileSync(new URL(`./${name}.json`, import.meta.url), JSON.stringify(s, null, 1));
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };

// Vườn có đủ 4 loài, cả con non lẫn trưởng thành, một con bệnh, chó đã lớn
const farm = quiet(() => {
  const s = G.createGame({ name: 'Chuồng', look: {} });
  s.coins = 1e6; s.exp = 1e6;
  const o = s.farm.owned;
  const spot = what => { for (let r = o.r; r < o.r + o.h; r++) for (let c = o.c; c < o.c + o.w; c++) if (G.canPlace(s, what, c, r).ok) return G.placeEntity(s, what, c, r).ok; return false; };
  for (const d of ['E', 'S', 'E', 'S']) G.buyStrip(s, d);
  // dọn bụi/đá cho rộng chỗ
  s.farm.ents = s.farm.ents.filter(e => e.kind !== 'bush' && e.kind !== 'rock'); s.farm.rev++;
  spot({ kind: 'pen', pen: 'pig' }); spot({ kind: 'pen', pen: 'pasture' });
  for (const t of ['ga', 'heo', 'heo', 'heo', 'bo', 'bo', 'cuu', 'cuu']) G.buyAnimal(s, t);
  // mỗi loài một con trưởng thành (theo id), các con còn lại vẫn non
  for (const t of ['heo', 'bo', 'cuu']) { const a = s.animals.find(x => x.type === t); a.adult = true; a.age = 999; }
  s.animals.find(x => x.type === 'heo' && !x.adult).sick = true;
  s.dog.adult = true; s.dog.age = 999;
  G.tick(s, 30_000);
  s.coins = 4321; s.exp = 2500;
  return s;
});
farm.savedAt = 1_700_000_000_000;
out('v2-farm', farm);

// Vừa tạo nhân vật
const fresh = G.createGame({ name: 'Mới', look: {} });
fresh.savedAt = 1_700_000_000_000;
out('v2-fresh', fresh);
console.log('ok', farm.animals.map(a => `${a.id}:${a.type}:${a.adult ? 'A' : 'b'}`).join(' '));
