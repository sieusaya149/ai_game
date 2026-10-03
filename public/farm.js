// Dựng bản đồ vườn từ state.farm (đất đã mua, đường đất, các thực thể đã đặt). Thuần JS, chạy được trong Node.
// mapOf(state) có nhớ tạm theo state.farm.rev: đổi bố cục thì gọi bumpLayout(state).
import { TS, GROUND, BUILDING_DEFS, PEN_DEFS, FIELD_SIZE, SCENES, tileHash } from './layout.js';

const cache = new WeakMap();
export const bumpLayout = s => { s.farm.rev = (s.farm.rev || 0) + 1; };

export function mapOf(s) {
  const f = s.farm;
  const hit = cache.get(f);
  if (hit && hit.rev === f.rev) return hit;
  const m = build(f);
  cache.set(f, m);
  return m;
}

const inRect = (o, c, r) => c >= o.c && r >= o.r && c < o.c + o.w && r < o.r + o.h;

// Viền cây quanh một vùng đi được: cây phía trên và hai bên, bụi phía dưới (chừa cột c mà gap(c) báo là lối ra)
function edge(owned, gap) {
  const border = [], bushes = [];
  const top = (owned.r - 1) * TS + 14, left = (owned.c - 1) * TS + 6, right = (owned.c + owned.w) * TS + 10, bottom = (owned.r + owned.h) * TS + 15;
  for (let x = (owned.c - 1) * TS + 4; x <= (owned.c + owned.w) * TS + 4; x += 32) border.push({ x, y: top });
  for (let y = owned.r * TS + 14; y < (owned.r + owned.h) * TS; y += 30) { border.push({ x: left, y }); border.push({ x: right, y }); }
  for (let c = owned.c; c < owned.c + owned.w; c++) if (!gap(c)) bushes.push({ x: c * TS + 8, y: bottom });
  return { border, bushes };
}

// Các ô một thực thể chiếm chỗ { c, r, w, h }: chuồng tính cả khung rào, ruộng là khối 3x3, đồ trang trí/cây 1 ô.
export function footprint(e) {
  if (e.kind === 'field') return { c: e.c, r: e.r, w: FIELD_SIZE, h: FIELD_SIZE };
  if (e.kind === 'pen') { const d = PEN_DEFS[e.pen]; return { c: e.c, r: e.r, w: d.w, h: d.h }; }
  const d = BUILDING_DEFS[e.kind];
  return { c: e.c, r: e.r, w: d?.foot.w ?? 1, h: d?.foot.h ?? 1 };
}

// Dựng bản đồ từ một bố cục bất kỳ, không nhớ tạm (để thử bố cục trước khi đặt).
export const buildMap = f => build(f);
// Máng của mục tiêu { pen, id? }: máng đúng chuồng nếu có id, không thì chuồng đầu tiên của loại
export const troughOf = (m, t) => (m.penById[t.id] ?? m.pens[t.pen])?.trough;

function build(f) {
  const { mw, mh, owned } = f, W = mw * TS, H = mh * TS;
  const idx = (c, r) => r * mw + c;
  const ground = new Uint8Array(mw * mh), solid = new Uint8Array(mw * mh);
  const fences = [], buildings = [], pens = {}, penList = [], penById = {}, troughs = [], trees = [], decos = [], fields = [], clutter = [];
  const plotPos = new Map(), plotByTile = new Map();
  const inside = (c, r) => c >= 0 && r >= 0 && c < mw && r < mh;
  const fill = (c, r, w, h, g) => { for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (inside(x, y)) ground[idx(x, y)] = g; };
  const block = (c, r, w = 1, h = 1) => { for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (inside(x, y)) solid[idx(x, y)] = 1; };
  const open = [];   // ô ngoài đất nhưng vẫn đi được (lối ra cổng)

  for (let r = 0; r < mh; r++) for (let c = 0; c < mw; c++) if (!inRect(owned, c, r)) { ground[idx(c, r)] = GROUND.FOREST; solid[idx(c, r)] = 1; }
  for (const [c, r] of f.paths) if (inside(c, r)) ground[idx(c, r)] = GROUND.ROAD;

  let spawn = null, dogHome = null, dogBowl = null, catHome = null, catDoor = null, gateIn = null, mud = null, mudSpot = null;
  const doors = [], unblock = [], arrive = {};
  for (const e of f.ents) {
    const px = e.c * TS, py = e.r * TS;
    if (e.kind === 'field') {
      fill(e.c, e.r, FIELD_SIZE, FIELD_SIZE, GROUND.FIELD);
      fields.push(e);
      (e.plots ?? []).forEach((pi, k) => {
        const t = { c: e.c + k % FIELD_SIZE, r: e.r + Math.floor(k / FIELD_SIZE) };
        plotPos.set(pi, t); plotByTile.set(idx(t.c, t.r), pi);
      });
    } else if (e.kind === 'pen') {
      const d = PEN_DEFS[e.pen], rect = { c: e.c, r: e.r, w: d.w, h: d.h };
      if (d.ground) fill(e.c + d.ground.c, e.r + d.ground.r, d.ground.w, d.ground.h, GROUND[d.ground.kind]);
      const gates = d.gates.map(([dc, dr]) => [e.c + dc, e.r + dr]);
      const isGate = (x, y) => gates.some(([gx, gy]) => gx === x && gy === y);
      for (let x = rect.c; x < rect.c + rect.w; x++) for (const y of [rect.r, rect.r + rect.h - 1]) if (!isGate(x, y)) fences.push({ c: x, r: y, kind: 'h', lv: e.lv ?? 1 });
      for (let y = rect.r + 1; y < rect.r + rect.h - 1; y++) for (const x of [rect.c, rect.c + rect.w - 1]) if (!isGate(x, y)) fences.push({ c: x, r: y, kind: 'v', lv: e.lv ?? 1 });
      const trough = d.trough ? { c: e.c + d.trough.c, r: e.r + d.trough.r, x: px + d.trough.x, y: py + d.trough.y } : null;
      const pen = { id: e.id, type: e.pen, lv: e.lv ?? 1, name: d.name, rect, gates, trough, area: { x: px + d.area.x, y: py + d.area.y, w: d.area.w, h: d.area.h }, house: { x: px + d.house.x, y: py + d.house.y, sprite: d.house.sprite }, ent: e };
      pens[e.pen] ??= pen;   // pens[loại] = chuồng đầu tiên của loại đó; penList/penById có đủ mọi chuồng
      penList.push(pen); penById[e.id] = pen;
      if (trough) { troughs.push({ pen: e.pen, id: e.id, c: trough.c, r: trough.r, w: 2 }); block(trough.c, trough.r, 2, 1); }
      if (d.scale) {   // cân heo đặt cạnh máng của từng chuồng heo
        pen.scale = { c: e.c + d.scale.c, r: e.r + d.scale.r, x: px + d.scale.x, y: py + d.scale.y };
        block(pen.scale.c, pen.scale.r, 1, 1);
      }
      if (d.nest && !buildings.some(b => b.id === 'coop')) {   // ổ ấp chỉ có ở chuồng gà đầu tiên
        const n = d.nest;
        buildings.push({ id: 'coop', kind: 'coop', name: 'Ổ ấp trứng', sprite: 'coop', x: px + n.spr.x, y: py + n.spr.y,
          foot: { c: e.c + n.foot.c, r: e.r + n.foot.r, w: n.foot.w, h: n.foot.h }, at: { x: px + n.at.x, y: py + n.at.y }, ent: e });
        block(e.c + n.foot.c, e.r + n.foot.r, n.foot.w, n.foot.h);
      }
      if (d.mud && !mud) {
        mud = { x: px + d.mud.x, y: py + d.mud.y, w: d.mud.w, h: d.mud.h };
        const q = d.mudSpot;
        mudSpot = { x: px + q.x, y: py + q.y, rx: q.rx, ry: q.ry, x0: px + q.x0, x1: px + q.x1, y0: py + q.y0, y1: py + q.y1 };
      }
    } else if (e.kind === 'tree') {
      trees.push({ x: px + 8, y: py + 14, ent: e });
      block(e.c, e.r);
    } else if (e.kind === 'bush' || e.kind === 'rock') {   // bụi, đá chưa dọn: chắn đường
      clutter.push({ id: e.id, kind: e.kind, x: px, y: py, v: tileHash(e.c, e.r) % 3, ent: e });
      block(e.c, e.r);
    } else if (e.kind === 'grave') {   // ngôi mộ: chiếm 1 ô, chắn đường
      decos.push({ id: e.id, kind: e.flower ? 'grave_flower' : 'grave', x: px + 8, y: py + 14, ent: e });
      block(e.c, e.r);
    } else if (e.kind === 'deco') {
      decos.push({ id: e.id, kind: e.item, x: px + 8, y: py + 12, ent: e });
    } else {
      const d = BUILDING_DEFS[e.kind];
      if (!d) continue;
      const b = { id: e.kind, kind: e.kind, name: d.name, sprite: d.sprite, x: px + d.spr.x, y: py + d.spr.y,
        foot: { c: e.c, r: e.r, w: d.foot.w, h: d.foot.h }, at: d.at ? { x: px + d.at.x, y: py + d.at.y } : null, ent: e };
      buildings.push(b);
      block(e.c, e.r, d.foot.w, d.foot.h);
      if (d.home) dogHome = { x: px + d.home.x, y: py + d.home.y };
      if (d.bowl) dogBowl = { x: px + d.bowl.x, y: py + d.bowl.y };   // bát ăn của chó: điểm chân (giữa đáy) của bát
      if (d.catHome) catHome = { x: px + d.catHome.x, y: py + d.catHome.y, lv: e.lv ?? 1 };
      if (d.catDoor) catDoor = { x: px + d.catDoor.x, y: py + d.catDoor.y };   // cửa mèo trên nhà: mèo ra vào tự do
      if (d.in) gateIn = { x: px + d.in.x, y: py + d.in.y };
      if (d.exit) for (const [dc, dr] of d.exit) open.push([e.c + dc, e.r + dr]);
      if (d.door) {
        const o = d.door;
        doors.push({ to: o.to, name: d.name, x: (e.c + o.c) * TS, y: (e.r + o.r) * TS, w: o.w * TS, h: o.h * TS, at: b.at });
        for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) unblock.push([e.c + o.c + x, e.r + o.r + y]);
        if (b.at) arrive[o.to] = { x: b.at.x, y: b.at.y, dir: o.dir ?? 0 };   // từ trong đó đi ra: đứng trước cửa
      }
      if (e.kind === 'house') spawn = { x: px + 32, y: py + 78 };
    }
  }
  for (const fe of fences) block(fe.c, fe.r);
  for (const [c, r] of open) if (inside(c, r)) { solid[idx(c, r)] = 0; ground[idx(c, r)] = GROUND.ROAD; }
  for (const [c, r] of unblock) if (inside(c, r)) solid[idx(c, r)] = 0;

  const { border, bushes } = edge(owned, c => open.some(([oc, or]) => oc === c && or === owned.r + owned.h));

  const isSolid = (c, r) => !inside(c, r) || solid[idx(c, r)] === 1;
  const pad = 4 * TS;   // chừa đủ chỗ thấy trọn dải đất kế tiếp (dày 4 ô) từ mép vườn
  const view = { x0: Math.max(0, owned.c * TS - pad), y0: Math.max(0, owned.r * TS - pad), x1: Math.min(W, (owned.c + owned.w) * TS + pad), y1: Math.min(H, (owned.r + owned.h) * TS + pad) };
  const plotTile = i => plotPos.get(i) ?? null;
  return {
    scene: 'farm', garden: true, rev: f.rev, mw, mh, W, H, owned, view, ground, solid, fences, buildings, pens, penList, penById, troughs, trees, border, bushes, decos, fields, clutter, mud, mudSpot,
    doors, arrive,
    spawn: spawn ?? { x: (owned.c + 2) * TS, y: (owned.r + 2) * TS }, dogHome: dogHome ?? spawn, dogBowl, catHome, catDoor, gateIn,
    isSolid, isSolidPx: (x, y) => isSolid(Math.floor(x / TS), Math.floor(y / TS)),
    isOwned: (c, r) => inRect(owned, c, r),
    building: id => buildings.find(b => b.id === id) ?? null,
    plotTile,
    plotCenter: i => { const t = plotPos.get(i); return t ? { x: t.c * TS + 8, y: t.r * TS + 8 } : null; },
    plotAt: (c, r) => plotByTile.get(idx(c, r)) ?? -1,
  };
}

// ---------- Bản đồ của cảnh đang đứng (state.scene) ----------
// Vườn dựng từ state.farm; cảnh khác là bản đồ cố định trong SCENES. Cùng giao diện với mapOf để world/render dùng chung.
// garden = bản đồ có ruộng, con vật, chó (vườn mình hoặc vườn người khác đang thăm).
export const sceneMap = s => (s.scene === 'visit' ? visitMap(s) : !s.scene || s.scene === 'farm' ? mapOf(s) : fixedMap(s.scene));
export const hasScene = id => id === 'farm' || !!SCENES[id];

// ---------- Vườn người khác đang thăm (issue 27) ----------
// Cùng bản đồ dựng từ state.farm (bản lưu của chủ), nhưng cửa nhà bị chắn lại, chỉ còn cổng ra làng; exit là chỗ đứng
// ngay trong cổng (khách tới và ra ở đây). Công trình riêng của chủ (nhà, kho, thùng giao hàng, bảng đơn) mang lý do `guest`.
const visits = new WeakMap();
let visitSeq = 0;
function visitMap(s) {
  const m = mapOf(s), hit = visits.get(m);
  if (hit) return hit;
  const solid = m.solid.slice(), doors = m.doors.filter(d => d.to === 'village');
  for (const d of m.doors) if (d.to !== 'village')
    for (let y = d.y; y < d.y + d.h; y += TS) for (let x = d.x; x < d.x + d.w; x += TS) solid[(y / TS) * m.mw + x / TS] = 1;
  const isSolid = (c, r) => c < 0 || r < 0 || c >= m.mw || r >= m.mh || solid[r * m.mw + c] === 1;
  const buildings = m.buildings.map(b => (BUILDING_DEFS[b.id]?.guest ? { ...b, guest: BUILDING_DEFS[b.id].guest } : b));
  const exit = m.arrive.village ?? m.spawn;
  const v = {
    ...m, scene: 'visit', rev: `v${++visitSeq}`, solid, doors, buildings, exit, spawn: exit, arrive: { village: exit },
    isSolid, isSolidPx: (x, y) => isSolid(Math.floor(x / TS), Math.floor(y / TS)),
    building: id => buildings.find(b => b.id === id) ?? null,
  };
  visits.set(m, v);
  return v;
}

const fixed = new Map();
function fixedMap(id) {
  if (!fixed.has(id)) fixed.set(id, buildFixed(id, SCENES[id]));
  return fixed.get(id);
}
function buildFixed(id, d) {
  const { mw, mh } = d, W = mw * TS, H = mh * TS, idx = (c, r) => r * mw + c;
  const out = !!d.walk;   // ngoài trời (làng) hay trong nhà
  const ground = new Uint8Array(mw * mh).fill(out ? GROUND.FOREST : GROUND.FLOOR), solid = new Uint8Array(mw * mh).fill(out ? 1 : 0);
  const inside = (c, r) => c >= 0 && r >= 0 && c < mw && r < mh;
  const block = (c, r, w, h, g) => { for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (inside(x, y)) { solid[idx(x, y)] = 1; if (g != null) ground[idx(x, y)] = g; } };
  const owned = out ? { ...d.walk } : { c: 0, r: 0, w: mw, h: mh };
  if (out) {
    for (let r = owned.r; r < owned.r + owned.h; r++) for (let c = owned.c; c < owned.c + owned.w; c++) { ground[idx(c, r)] = GROUND.GRASS; solid[idx(c, r)] = 0; }
    for (const [c, r, w, h] of d.paths) for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) ground[idx(x, y)] = GROUND.ROAD;
  }
  for (const [c, r, w, h] of d.walls) block(c, r, w, h, GROUND.WALL);
  const trees = (d.trees ?? []).map(([c, r]) => { block(c, r, 1, 1); return { x: c * TS + 8, y: r * TS + 14 }; });
  const buildings = d.furniture.map(o => {
    const f = o.foot, px = f.c * TS, py = f.r * TS;
    block(f.c, f.r, f.w, f.h);
    const b = { id: o.kind, kind: o.kind, name: o.name, sprite: o.sprite, interior: true, x: px + o.spr.x, y: py + o.spr.y,
      foot: { ...f }, at: o.at ? { x: px + o.at.x, y: py + o.at.y } : null, label: o.label, sub: o.sub };
    if (o.npc) {   // người đứng cạnh: chạm vào cũng như chạm công trình
      b.npc = { key: o.npc.key, x: b.x + o.npc.x, y: b.y + o.npc.y };
      b.hit = { x: b.npc.x - 8, y: b.npc.y - 24, w: 16, h: 24 };
    }
    return b;
  });
  const doors = d.doors.map(o => ({ to: o.to, name: o.name, x: o.c * TS, y: o.r * TS, w: o.w * TS, h: o.h * TS, at: o.at }));
  for (const o of d.doors) for (let y = o.r; y < o.r + o.h; y++) for (let x = o.c; x < o.c + o.w; x++) if (inside(x, y)) solid[idx(x, y)] = 0;   // lối bước qua cổng
  const { border, bushes } = out ? edge(owned, () => false) : { border: [], bushes: [] };
  const clear = p => (d.clear ?? []).some(o => p.x >= o.x0 && p.x <= o.x1 && p.y >= o.y0 && p.y <= o.y1);
  const isSolid = (c, r) => !inside(c, r) || solid[idx(c, r)] === 1;
  const pad = 2 * TS;
  const view = out ? { x0: Math.max(0, owned.c * TS - pad), y0: Math.max(0, owned.r * TS - pad), x1: Math.min(W, (owned.c + owned.w) * TS + pad), y1: Math.min(H, (owned.r + owned.h) * TS + pad) }
    : { x0: 0, y0: 0, x1: W, y1: H };
  return {
    scene: id, interior: !out, outdoor: out, name: d.name, mw, mh, W, H, owned, view, ground, solid,
    fences: [], buildings, pens: {}, penList: [], penById: {}, troughs: [], trees, border: border.filter(p => !clear(p)), bushes, decos: [], fields: [], clutter: [], mud: null, mudSpot: null,
    props: d.props, doors, arrive: d.arrive, spawn: Object.values(d.arrive)[0], dogHome: null, dogBowl: null, catHome: null, catDoor: null, gateIn: null,
    isSolid, isSolidPx: (x, y) => isSolid(Math.floor(x / TS), Math.floor(y / TS)), isOwned: (c, r) => inside(c, r),
    building: bid => buildings.find(b => b.id === bid) ?? null,
    plotTile: () => null, plotCenter: () => null, plotAt: () => -1,
  };
}

// Có đường đi (4 hướng, qua ô không chắn) giữa hai điểm ảnh không. Dùng để kiểm tra bố cục.
export function reachable(m, from, to) {
  const sc = Math.floor(from.x / TS), sr = Math.floor(from.y / TS), gc = Math.floor(to.x / TS), gr = Math.floor(to.y / TS);
  const seen = new Uint8Array(m.mw * m.mh), q = [sr * m.mw + sc];
  seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const cur = q[h], c = cur % m.mw, r = (cur - c) / m.mw;
    if (c === gc && r === gr) return true;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (m.isSolid(nc, nr)) continue;
      const ni = nr * m.mw + nc;
      if (!seen[ni]) { seen[ni] = 1; q.push(ni); }
    }
  }
  return false;
}
