// Dựng bản đồ vườn từ state.farm (đất đã mua, đường đất, các thực thể đã đặt). Thuần JS, chạy được trong Node.
// mapOf(state) có nhớ tạm theo state.farm.rev: đổi bố cục thì gọi bumpLayout(state).
import { TS, GROUND, BUILDING_DEFS, PEN_DEFS, FIELD_SIZE } from './layout.js';

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

function build(f) {
  const { mw, mh, owned } = f, W = mw * TS, H = mh * TS;
  const idx = (c, r) => r * mw + c;
  const ground = new Uint8Array(mw * mh), solid = new Uint8Array(mw * mh);
  const fences = [], buildings = [], pens = {}, troughs = [], trees = [], decos = [], fields = [];
  const plotPos = new Map(), plotByTile = new Map();
  const inside = (c, r) => c >= 0 && r >= 0 && c < mw && r < mh;
  const fill = (c, r, w, h, g) => { for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (inside(x, y)) ground[idx(x, y)] = g; };
  const block = (c, r, w = 1, h = 1) => { for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (inside(x, y)) solid[idx(x, y)] = 1; };
  const open = [];   // ô ngoài đất nhưng vẫn đi được (lối ra cổng)

  for (let r = 0; r < mh; r++) for (let c = 0; c < mw; c++) if (!inRect(owned, c, r)) { ground[idx(c, r)] = GROUND.FOREST; solid[idx(c, r)] = 1; }
  for (const [c, r] of f.paths) if (inside(c, r)) ground[idx(c, r)] = GROUND.ROAD;

  let spawn = null, dogHome = null, gateIn = null, mud = null, mudSpot = null;
  for (const e of f.ents) {
    const px = e.c * TS, py = e.r * TS;
    if (e.kind === 'field') {
      fill(e.c, e.r, FIELD_SIZE, FIELD_SIZE, GROUND.FIELD);
      fields.push(e);
      e.plots.forEach((pi, k) => {
        const t = { c: e.c + k % FIELD_SIZE, r: e.r + Math.floor(k / FIELD_SIZE) };
        plotPos.set(pi, t); plotByTile.set(idx(t.c, t.r), pi);
      });
    } else if (e.kind === 'pen') {
      const d = PEN_DEFS[e.pen], rect = { c: e.c, r: e.r, w: d.w, h: d.h };
      if (d.ground) fill(e.c + d.ground.c, e.r + d.ground.r, d.ground.w, d.ground.h, GROUND[d.ground.kind]);
      const gates = d.gates.map(([dc, dr]) => [e.c + dc, e.r + dr]);
      const isGate = (x, y) => gates.some(([gx, gy]) => gx === x && gy === y);
      for (let x = rect.c; x < rect.c + rect.w; x++) for (const y of [rect.r, rect.r + rect.h - 1]) if (!isGate(x, y)) fences.push({ c: x, r: y, kind: 'h' });
      for (let y = rect.r + 1; y < rect.r + rect.h - 1; y++) for (const x of [rect.c, rect.c + rect.w - 1]) if (!isGate(x, y)) fences.push({ c: x, r: y, kind: 'v' });
      const trough = { c: e.c + d.trough.c, r: e.r + d.trough.r, x: px + d.trough.x, y: py + d.trough.y };
      pens[e.pen] = { name: d.name, rect, gates, trough, area: { x: px + d.area.x, y: py + d.area.y, w: d.area.w, h: d.area.h }, ent: e };
      troughs.push({ pen: e.pen, c: trough.c, r: trough.r, w: 2 });
      block(trough.c, trough.r, 2, 1);
      if (d.nest) {
        const n = d.nest;
        buildings.push({ id: 'coop', kind: 'coop', name: 'Ổ ấp trứng', sprite: 'coop', x: px + n.spr.x, y: py + n.spr.y,
          foot: { c: e.c + n.foot.c, r: e.r + n.foot.r, w: n.foot.w, h: n.foot.h }, at: { x: px + n.at.x, y: py + n.at.y }, ent: e });
        block(e.c + n.foot.c, e.r + n.foot.r, n.foot.w, n.foot.h);
      }
      if (d.mud) {
        mud = { x: px + d.mud.x, y: py + d.mud.y, w: d.mud.w, h: d.mud.h };
        const q = d.mudSpot;
        mudSpot = { x: px + q.x, y: py + q.y, rx: q.rx, ry: q.ry, x0: px + q.x0, x1: px + q.x1, y0: py + q.y0, y1: py + q.y1 };
      }
    } else if (e.kind === 'tree') {
      trees.push({ x: px + 8, y: py + 14, ent: e });
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
      if (d.in) gateIn = { x: px + d.in.x, y: py + d.in.y };
      if (d.exit) for (const [dc, dr] of d.exit) open.push([e.c + dc, e.r + dr]);
      if (e.kind === 'house') spawn = { x: px + 32, y: py + 78 };
    }
  }
  for (const fe of fences) block(fe.c, fe.r);
  for (const [c, r] of open) if (inside(c, r)) { solid[idx(c, r)] = 0; ground[idx(c, r)] = GROUND.ROAD; }

  // viền cây quanh đất: cây phía trên và hai bên, bụi phía dưới (chừa lối ra cổng)
  const border = [], bushes = [];
  const top = (owned.r - 1) * TS + 14, left = (owned.c - 1) * TS + 6, right = (owned.c + owned.w) * TS + 10, bottom = (owned.r + owned.h) * TS + 15;
  for (let x = (owned.c - 1) * TS + 4; x <= (owned.c + owned.w) * TS + 4; x += 32) border.push({ x, y: top });
  for (let y = owned.r * TS + 14; y < (owned.r + owned.h) * TS; y += 30) { border.push({ x: left, y }); border.push({ x: right, y }); }
  for (let c = owned.c; c < owned.c + owned.w; c++) if (!open.some(([oc, or]) => oc === c && or === owned.r + owned.h)) bushes.push({ x: c * TS + 8, y: bottom });

  const isSolid = (c, r) => !inside(c, r) || solid[idx(c, r)] === 1;
  const pad = 2 * TS;
  const view = { x0: Math.max(0, owned.c * TS - pad), y0: Math.max(0, owned.r * TS - pad), x1: Math.min(W, (owned.c + owned.w) * TS + pad), y1: Math.min(H, (owned.r + owned.h) * TS + pad) };
  const plotTile = i => plotPos.get(i) ?? null;
  return {
    rev: f.rev, mw, mh, W, H, owned, view, ground, solid, fences, buildings, pens, troughs, trees, border, bushes, decos, fields, mud, mudSpot,
    spawn: spawn ?? { x: (owned.c + 2) * TS, y: (owned.r + 2) * TS }, dogHome: dogHome ?? spawn, gateIn,
    isSolid, isSolidPx: (x, y) => isSolid(Math.floor(x / TS), Math.floor(y / TS)),
    isOwned: (c, r) => inRect(owned, c, r),
    building: id => buildings.find(b => b.id === id) ?? null,
    plotTile,
    plotCenter: i => { const t = plotPos.get(i); return t ? { x: t.c * TS + 8, y: t.r * TS + 8 } : null; },
    plotAt: (c, r) => plotByTile.get(idx(c, r)) ?? -1,
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
