// Việc cần làm: đọc state, liệt kê việc trong vườn theo loại, mức gấp, số lượng và chỗ gần người chơi nhất. Thuần JS, không DOM.
// Bảng 📋, bản đồ nhỏ và mũi tên chỉ hướng đều lấy vị trí từ đây.
import { mapOf, dirtyAnimals, dirtyPens, predWarning, strays } from './state.js';
import { ANIMALS, HUSBANDRY } from './data.js';
import { TS } from './layout.js';

const isRipe = p => p.crop && !p.crop.dead && !p.crop.rotten && p.crop.progress >= 1;
const alive = p => p.crop && !p.crop.dead && !p.crop.rotten && p.crop.progress < 1;
const DRY = 30;   // dưới mức này thì cây cần tưới (như hành động Tưới nước trong plotActs)

// Mỗi loại: mức, biểu tượng, nhãn theo số lượng, và hàm gom các chỗ { id, x, y, target }
const KINDS = [
  { kind: 'crow', kp: 'threat', level: 'urgent', icon: '🪶', label: n => `${n} con quạ đang ăn cây`, spots: s => threats(s, 'crow') },
  { kind: 'thief', kp: 'threat', level: 'urgent', icon: '🧢', label: () => 'Có trộm đang hái cây', spots: s => threats(s, 'thief') },
  { kind: 'pred', level: 'urgent', icon: '🐀', label: n => `${n} kẻ săn mồi đang rình`, spots: s => predWarning(s).map(p => ({ id: p.id, x: p.x, y: p.y, target: { kind: 'pred', id: p.id } })) },
  { kind: 'hurt', level: 'urgent', icon: '🩹', label: n => `${n} con non bị chuột cắn`, spots: s => animals(s, a => a.hurt) },
  { kind: 'tisun', kp: 'threat', level: 'urgent', icon: '🥚', label: () => 'Tí Sún đang lấy trứng', spots: s => threats(s, 'tisun') },
  { kind: 'civet', kp: 'threat', level: 'urgent', icon: '🦝', label: () => 'Chồn hương đang rình gà', spots: s => threats(s, 'civet') },
  { kind: 'sick', level: 'urgent', icon: '🤒', label: n => `${n} con vật bệnh nặng`, spots: s => animals(s, a => a.sick >= 2) },
  { kind: 'tired', level: 'normal', icon: '🥱', label: n => `${n} con vật mệt`, spots: s => animals(s, a => a.sick && a.sick < 2) },
  { kind: 'hungry', level: 'normal', icon: '🍽️', label: n => `${n} con vật đói`, spots: s => animals(s, a => !a.sick && a.hunger < HUSBANDRY.growNeedsHunger) },
  { kind: 'dirty', level: 'normal', icon: '🧼', label: n => `${n} con vật dơ`, spots: s => animals(s, a => dirtyAnimals(s).includes(a)) },
  { kind: 'stray', level: 'normal', icon: '💤', label: n => `${n} con lạc ngủ ngoài`, spots: s => animals(s, a => strays(s).includes(a)) },
  { kind: 'muck', level: 'normal', icon: '💩', label: n => `${n} chuồng bẩn`, spots: s => muckPens(s) },
  { kind: 'dry', level: 'normal', icon: '💧', label: n => `${n} ô khô`, spots: s => plots(s, p => alive(p) && p.water < DRY) },
  { kind: 'bugs', level: 'normal', icon: '🐛', label: n => `${n} ô có sâu`, spots: s => plots(s, p => alive(p) && p.crop.bugs) },
  { kind: 'weeds', level: 'normal', icon: '🌿', label: n => `${n} ô có cỏ`, spots: s => plots(s, p => p.weeds) },
  { kind: 'ripe', level: 'normal', icon: '🌾', label: n => `${n} ô chín`, spots: s => plots(s, isRipe) },
  { kind: 'egg', level: 'normal', icon: '🥚', label: n => `${n} trứng dưới đất`, spots: s => (s.eggs ?? []).map(e => ({ id: e.id, x: e.x, y: e.y, target: { kind: 'egg', id: e.id } })) },
  { kind: 'trough', level: 'normal', icon: '🥣', label: n => `${n} máng hết cám`, spots: s => troughs(s) },
  { kind: 'poop', level: 'normal', icon: '💩', label: n => `${n} đống phân chó`, spots: s => (s.poops ?? []).map(o => ({ id: o.id, x: o.x, y: o.y, target: { kind: 'poop', id: o.id } })) },
];

// Chỗ kẻ trộm đang đứng: quạ/Tèo nhắm một ô ruộng, Tí Sún và chồn hương nhắm một điểm trong vườn (t.at)
const threatAt = (s, t) => t.at ?? (s.plots[t.plot] ? mapOf(s).plotCenter(t.plot) : null);
const threats = (s, kind) => (s.threats ?? []).filter(t => t.kind === kind && t.state === 'eating' && threatAt(s, t))
  .map(t => ({ id: t.id, ...threatAt(s, t), target: { kind: 'threat', id: t.id } }));
const animals = (s, ok) => (s.animals ?? []).filter(a => a.x != null && ok(a)).map(a => ({ id: a.id, x: a.x, y: a.y, target: { kind: 'animal', id: a.id } }));
const plots = (s, ok) => s.plots.filter(p => p.unlocked && ok(p) && mapOf(s).plotCenter(p.idx))
  .map(p => ({ id: p.idx, ...mapOf(s).plotCenter(p.idx), target: { kind: 'plot', idx: p.idx } }));
// Máng trống của chuồng đang có con vật ăn máng đó; đứng ở mép dưới máng như world.troughAnchor
function troughs(s) {
  const m = mapOf(s);
  return Object.entries(m.pens).filter(([pen]) => (s.troughs?.[pen] ?? 0) <= 0 && s.animals.some(a => ANIMALS[a.type].pen === pen))
    .map(([pen, p]) => ({ id: pen, x: p.trough.x, y: p.trough.r * TS + 8, target: { kind: 'trough', pen } }));
}

// Chuồng bẩn: đứng ở máng, chạm vào máng để xúc phân
function muckPens(s) {
  const m = mapOf(s);
  return dirtyPens(s).filter(pen => m.pens[pen]).map(pen => ({ id: pen, x: m.pens[pen].trough.x, y: m.pens[pen].trough.r * TS + 8, target: { kind: 'trough', pen } }));
}

// Điểm tính khoảng cách: chỗ người chơi đứng; ở bản đồ khác thì chỗ sẽ đứng khi về vườn
export function homePoint(s) {
  if (!s.scene || s.scene === 'farm') return s.player;
  const m = mapOf(s);
  return m.arrive[s.scene] ?? m.spawn;
}

// [{ kind, level: 'urgent'|'normal', count, scene: 'farm', x, y, target, spots: [{ key, x, y, target }], icon, label }]
// x, y, target là chỗ gần nhất; spots là mọi chỗ, gần trước xa sau. Xếp theo mức gấp rồi số lượng.
export function todoList(s) {
  const at = homePoint(s), d = p => Math.hypot(p.x - at.x, p.y - at.y);
  const out = [];
  for (const k of KINDS) {
    const spots = k.spots(s).sort((a, b) => d(a) - d(b)).map(p => ({ key: `${k.kp ?? k.kind}:${p.id}`, x: p.x, y: p.y, target: p.target }));
    if (!spots.length) continue;
    const n = spots.length, [{ x, y, target }] = spots;
    out.push({ kind: k.kind, level: k.level, count: n, scene: 'farm', x, y, target, spots, icon: k.icon, label: `${k.icon} ${k.label(n)}` });
  }
  return out.map((it, i) => [it, i]).sort(([a, i], [b, j]) => (a.level === b.level ? 0 : a.level === 'urgent' ? -1 : 1) || b.count - a.count || i - j).map(([it]) => it);
}
