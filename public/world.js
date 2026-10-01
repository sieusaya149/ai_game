// Thế giới: di chuyển, va chạm, tìm đường, AI con vật/chó/quạ/trộm, tìm target. Không vẽ gì.
import { TS, MW, MH, H, GROUND, PENS, BUILDINGS, TROUGHS, SPAWN, DOG_HOME, GATE_IN, GRID_DATA, isSolid, isSolidPx, plotTile, plotCenter, plotAt } from './layout.js';
import { GRID, ANIMALS, CROPS, DOG } from './data.js';
import { character } from './art.js';
import * as ST from './state.js';
import { animalImg, dogImg, crowImg, eggSize, poopSize, buildingImg, decoSize } from './render.js';

const SPEED = 70;                 // px/s của người chơi
const HW = 5, HH = 3;             // nửa hộp chân 10x6
const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];
const TEO_LOOK = { skin: 1, hair: 0, hairColor: 4, shirt: 4, pants: 2, hat: 2, acc: 1 };
const A_SPEED = { ga: 20, heo: 16, bo: 11, cuu: 13 };

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const dirOf = (dx, dy) => Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 0 : 3) : (dx < 0 ? 1 : 2);

// Thứ tự mở ô ruộng (khớp state.js nếu có export UNLOCK_ORDER)
export const UNLOCK_ORDER = (() => {
  const ord = ST.UNLOCK_ORDER;
  if (Array.isArray(ord) && ord.every(Number.isInteger)) return ord;
  return Array.from({ length: GRID * GRID }, (_, i) => i).sort((a, b) => {
    const ra = Math.floor(a / GRID), ca = a % GRID, rb = Math.floor(b / GRID), cb = b % GRID;
    return Math.max(ra, ca) - Math.max(rb, cb) || Math.min(ra, ca) - Math.min(rb, cb) || ra - rb;
  });
})();
export function nextLockedIdx(state) {
  for (const i of UNLOCK_ORDER) if (state.plots[i] && !state.plots[i].unlocked) return i;
  return -1;
}

export function createWorld() {
  return {
    rt: new Map(),            // dữ liệu chạy của từng thực thể (hướng, khung hình, AI)
    emotes: new Map(),        // biểu tượng cảm xúc tạm (tim...)
    fx: [],                   // chữ bay
    input: { x: 0, y: 0 },    // bàn phím / joystick
    path: null, pending: null, pendingT: 0, repathT: 0, stuckT: 0,
    stun: 0, moving: false, walkT: 0, busy: false,
    marker: null, lastSlip: null, curKey: null,
    nextLocked: nextLockedIdx,
    anchorOf,
    playerFrames: look => character(look),
    teoFrames: () => character(TEO_LOOK),
  };
}
const rtOf = (w, key) => {
  let r = w.rt.get(key);
  if (!r) w.rt.set(key, r = { face: Math.random() < 0.5 ? 'left' : 'right', mode: 'idle', timer: rnd(0.2, 2), anim: 0, walking: false, peck: false, tx: 0, ty: 0, stuck: 0, dir: 0 });
  return r;
};

// ---------- Va chạm & di chuyển người chơi ----------
export function canStand(x, y) {
  return !isSolidPx(x - HW, y - HH) && !isSolidPx(x + HW, y - HH) && !isSolidPx(x - HW, y + HH) && !isSolidPx(x + HW, y + HH);
}
function moveBox(p, dx, dy) {
  if (dx && canStand(p.x + dx, p.y)) p.x += dx;
  if (dy && canStand(p.x, p.y + dy)) p.y += dy;
}

// ---------- Tìm đường BFS trên lưới ô ----------
function lineClear(x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3);
  for (let i = 1; i <= n; i++) if (!canStand(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false;
  return true;
}
export function findPath(sx, sy, gx, gy, smooth = true) {
  const sc = clamp(Math.floor(sx / TS), 0, MW - 1), sr = clamp(Math.floor(sy / TS), 0, MH - 1);
  const gc = clamp(Math.floor(gx / TS), 0, MW - 1), gr = clamp(Math.floor(gy / TS), 0, MH - 1);
  const d = new Int16Array(MW * MH).fill(-1), prev = new Int16Array(MW * MH).fill(-1);
  const q = [sr * MW + sc]; d[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const cur = q[h], c = cur % MW, r = (cur - c) / MW;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr, ni = nr * MW + nc;
      if (nc < 0 || nr < 0 || nc >= MW || nr >= MH || d[ni] >= 0 || isSolid(nc, nr)) continue;
      d[ni] = d[cur] + 1; prev[ni] = cur; q.push(ni);
    }
  }
  let goal = gr * MW + gc;
  const exact = d[goal] >= 0 && !isSolid(gc, gr);
  if (!exact) {
    let best = Infinity;
    for (const i of q) {
      const c = i % MW, r = (i - c) / MW, s = (Math.abs(c - gc) + Math.abs(r - gr)) * 100 + d[i];
      if (s < best) { best = s; goal = i; }
    }
  }
  const tiles = [];
  for (let i = goal; i !== sr * MW + sc && i >= 0; i = prev[i]) tiles.push(i);
  tiles.reverse();
  let pts = tiles.map(i => ({ x: (i % MW) * TS + 8, y: Math.floor(i / MW) * TS + 8 }));
  if (exact && pts.length && canStand(gx, gy)) pts[pts.length - 1] = { x: gx, y: gy };
  else if (exact && !pts.length && canStand(gx, gy)) pts = [{ x: gx, y: gy }];
  if (!smooth || pts.length < 2) return pts;
  const out = []; let cx = sx, cy = sy, i = 0;
  while (i < pts.length) {
    let j = i;
    for (let k = pts.length - 1; k > i; k--) if (lineClear(cx, cy, pts[k].x, pts[k].y)) { j = k; break; }
    out.push(pts[j]); cx = pts[j].x; cy = pts[j].y; i = j + 1;
  }
  return out;
}

// ---------- Vị trí ban đầu ----------
const inArea = (a, m = 0) => ({ x: rnd(a.x + m, a.x + a.w - m), y: rnd(a.y + m, a.y + a.h - m) });
export function ensurePositions(state) {
  const p = state.player;
  if (p.x == null || p.y == null) { p.x = SPAWN.x; p.y = SPAWN.y; }
  p.dir ??= 0;
  for (const a of state.animals) if (a.x == null || a.y == null) Object.assign(a, inArea(PENS[ANIMALS[a.type].pen].area));
  const d = state.dog;
  if (d.x == null || d.y == null) { d.x = DOG_HOME.x; d.y = DOG_HOME.y; }
  for (const e of state.eggs ?? []) if (e.x == null) Object.assign(e, inArea(PENS.chicken.area));
  for (const o of state.poops ?? []) if (o.x == null) { o.x = d.x; o.y = d.y; }
}

// ---------- Con vật trong chuồng ----------
function updateAnimals(state, w, dt) {
  const p = state.player;
  for (const a of state.animals) {
    const pen = PENS[ANIMALS[a.type].pen], area = pen.area, rt = rtOf(w, 'a' + a.id);
    const near = Math.hypot(p.x - a.x, p.y - a.y) < 26;
    const speed = (A_SPEED[a.type] ?? 14) * (a.adult ? 1 : 1.25) * (a.sick ? 0.5 : 1);
    rt.walking = false; rt.peck = false;
    if (rt.mode === 'walk') {
      if (near) { rt.mode = 'idle'; rt.timer = 0.8; }
      else {
        const dx = rt.tx - a.x, dy = rt.ty - a.y, d = Math.hypot(dx, dy);
        if (d < 1.5) { rt.mode = 'idle'; rt.timer = a.type === 'heo' && Math.abs(a.x - 332) < 22 && Math.abs(a.y - 351) < 14 ? rnd(3, 7) : rnd(1.2, 4); }
        else {
          const st = Math.min(d, speed * dt);
          a.x = clamp(a.x + dx / d * st, area.x, area.x + area.w);
          a.y = clamp(a.y + dy / d * st, area.y, area.y + area.h);
          if (Math.abs(dx) > 0.4) rt.face = dx < 0 ? 'left' : 'right';
          rt.walking = true; rt.anim += dt;
        }
      }
    } else {
      rt.timer -= dt;
      if (rt.mode === 'peck') { rt.peck = true; rt.anim += dt; if (rt.timer <= 0) rt.mode = 'idle'; }
      if (rt.timer <= 0 && !near) {
        const inMud = a.type === 'heo' && Math.abs(a.x - 332) < 22 && Math.abs(a.y - 351) < 14;
        const trough = state.troughs?.[ANIMALS[a.type].pen] ?? 0;
        if (a.hunger < 60 && trough > 0 && Math.random() < 0.6) {
          rt.tx = clamp(pen.trough.x + rnd(-14, 14), area.x, area.x + area.w); rt.ty = area.y + rnd(1, 8); rt.mode = 'walk';
        } else if (a.type === 'heo' && !inMud && Math.random() < 0.45) {
          rt.tx = rnd(316, 348); rt.ty = rnd(344, 358); rt.mode = 'walk';
        } else if (a.type === 'ga' && Math.random() < 0.4) {
          rt.mode = 'peck'; rt.timer = rnd(0.8, 1.8);
        } else {
          const t = inArea(area, 2); rt.tx = t.x; rt.ty = t.y; rt.mode = 'walk';
        }
      }
    }
  }
}

// ---------- Chó Mực ----------
const dogAllowed = (c, r) => {
  if (r > 25 || isSolid(c, r)) return false;
  const g = GRID_DATA.ground[r * MW + c];
  if (g !== GROUND.GRASS && g !== GROUND.ROAD) return false;
  for (const { rect } of Object.values(PENS)) if (c >= rect.c && c < rect.c + rect.w && r >= rect.r && r < rect.r + rect.h) return false;
  return !(c >= 20 && c < 28 && r >= 3 && r < 11);
};
const dogCan = (x, y) => dogAllowed(Math.floor(x / TS), Math.floor(y / TS)) && dogAllowed(Math.floor((x - 3) / TS), Math.floor(y / TS)) && dogAllowed(Math.floor((x + 3) / TS), Math.floor(y / TS));
function updateDog(state, w, dt) {
  const d = state.dog, p = state.player, rt = rtOf(w, 'dog');
  if (!dogCan(d.x, d.y)) { d.x = DOG_HOME.x; d.y = DOG_HOME.y; }
  const dp = dist(d, p);
  rt.walking = false; rt.run = false;
  rt.timer -= dt;
  const goTo = (tx, ty, speed) => {
    const dx = tx - d.x, dy = ty - d.y, len = Math.hypot(dx, dy);
    if (len < 1) return true;
    const st = Math.min(len, speed * dt), ox = d.x, oy = d.y;
    if (dogCan(d.x + dx / len * st, d.y)) d.x += dx / len * st;
    if (dogCan(d.x, d.y + dy / len * st)) d.y += dy / len * st;
    const moved = Math.hypot(d.x - ox, d.y - oy);
    if (Math.abs(dx) > 0.5) rt.face = dx < 0 ? 'left' : 'right';
    rt.walking = moved > 0.01; rt.anim += dt;
    rt.stuck = moved < st * 0.3 ? rt.stuck + dt : 0;
    return false;
  };
  if (rt.mode === 'follow') {
    rt.run = dp > 70;
    if (dp < 22 || rt.timer <= 0 || rt.stuck > 0.5) { rt.mode = 'idle'; rt.timer = rnd(0.6, 2); rt.stuck = 0; }
    else goTo(p.x, p.y, rt.run ? 62 : 36);
  } else if (rt.mode === 'wander') {
    if (goTo(rt.tx, rt.ty, 30) || rt.stuck > 0.5) { rt.mode = 'idle'; rt.timer = rnd(1, 3.5); rt.stuck = 0; }
  } else if (rt.timer <= 0) {
    if (dp > 34 && Math.random() < 0.6) { rt.mode = 'follow'; rt.timer = rnd(3, 7); }
    else {
      for (let i = 0; i < 8; i++) {
        const tx = d.x + rnd(-90, 90), ty = d.y + rnd(-70, 70);
        if (dogCan(tx, ty)) { rt.tx = tx; rt.ty = ty; rt.mode = 'wander'; break; }
      }
      if (rt.mode !== 'wander') rt.timer = 1;
    }
  }
}

// ---------- Quạ & thằng Tèo ----------
function updateThreats(state, w, dt) {
  for (const t of state.threats ?? []) {
    const rt = rtOf(w, 't' + t.id), pc = plotCenter(t.plot);
    rt.walking = false;
    if (t.kind === 'crow') {
      if (t.x == null) {
        const s = Math.floor(Math.random() * 4), W_ = 34 * TS;
        [t.x, t.y] = s === 0 ? [rnd(0, W_), -24] : s === 1 ? [rnd(0, W_), H + 24] : s === 2 ? [-24, rnd(0, H)] : [W_ + 24, rnd(0, H)];
        rt.alt = 14;
      }
      rt.alt ??= 14;
      let tx = pc.x, ty = pc.y + 4, sp = 70;
      if (t.state === 'leaving') {
        if (!rt.exit) {
          const W_ = 34 * TS, ds = [t.x, W_ - t.x, t.y, H - t.y], m = ds.indexOf(Math.min(...ds));
          rt.exit = m === 0 ? { x: -40, y: t.y } : m === 1 ? { x: W_ + 40, y: t.y } : m === 2 ? { x: t.x, y: -40 } : { x: t.x, y: H + 40 };
          rt.exit.x += rnd(-30, 30); rt.exit.y += rnd(-20, 20);
        }
        tx = rt.exit.x; ty = rt.exit.y; sp = 110;
        rt.alt = Math.min(14, rt.alt + 40 * dt);
      } else {
        rt.exit = null;
        if (t.state === 'eating') sp = 220;
      }
      const dx = tx - t.x, dy = ty - t.y, d = Math.hypot(dx, dy);
      if (d > 0.5) {
        const st = Math.min(d, sp * dt);
        t.x += dx / d * st; t.y += dy / d * st;
        if (Math.abs(dx) > 0.5) rt.face = dx < 0 ? 'left' : 'right';
      }
      if (t.state !== 'leaving') rt.alt = d < 2 ? Math.max(0, rt.alt - 40 * dt) : Math.min(14, Math.max(rt.alt, d / 4));
    } else {
      if (t.x == null) { t.x = GATE_IN.x; t.y = GATE_IN.y; }
      const want = t.state === 'leaving' ? 'out' : 'in';
      if (rt.pathFor !== want) {
        rt.pathFor = want;
        rt.path = want === 'in' ? findPath(t.x, t.y, pc.x, pc.y) : [...findPath(t.x, t.y, GATE_IN.x, GATE_IN.y), { x: GATE_IN.x, y: H + 30 }];
      }
      const wp = rt.path?.[0];
      if (wp) {
        const dx = wp.x - t.x, dy = wp.y - t.y, d = Math.hypot(dx, dy), st = Math.min(d, 44 * dt);
        if (d < 0.8) rt.path.shift();
        else { t.x += dx / d * st; t.y += dy / d * st; rt.dir = dirOf(dx, dy); rt.walking = true; rt.anim += dt; }
      }
    }
  }
}

// ---------- Target & phạm vi tương tác ----------
export const keyOf = t => t.kind + (t.id ?? t.idx ?? t.pen ?? '');
const troughAnchor = pen => { const t = PENS[pen].trough; return { x: t.x, y: t.r * TS + 8 }; };
const coop = () => BUILDINGS.find(b => b.id === 'coop');
const findBy = (list, id) => (list ?? []).find(e => e.id === id);

export function targetPos(state, t) {
  switch (t.kind) {
    case 'plot': case 'lockedPlot': return plotCenter(t.idx);
    case 'animal': return findBy(state.animals, t.id);
    case 'egg': return findBy(state.eggs, t.id);
    case 'poop': return findBy(state.poops, t.id);
    case 'threat': return findBy(state.threats, t.id);
    case 'dog': return state.dog;
    case 'trough': return troughAnchor(t.pen);
    case 'nest': return coop().at;
    case 'building': return BUILDINGS.find(b => b.id === t.id)?.at ?? null;
  }
  return null;
}
export function exists(state, t) {
  if (t.kind === 'plot') return !!state.plots[t.idx]?.unlocked;
  if (t.kind === 'lockedPlot') return t.idx === nextLockedIdx(state);
  const pos = targetPos(state, t);
  return !!pos && pos.x != null;
}
const RANGE = { animal: 20, egg: 20, poop: 20, threat: 20, dog: 20, trough: 22, nest: 22, building: 22 };
// Khoảng cách tới target nếu trong tầm, ngược lại Infinity
export function rangeDist(state, t) {
  const p = state.player, pos = targetPos(state, t);
  if (!pos || pos.x == null) return Infinity;
  if (t.kind === 'plot' || t.kind === 'lockedPlot') {
    const { c, r } = plotTile(t.idx);
    return Math.abs(c - Math.floor(p.x / TS)) <= 1 && Math.abs(r - Math.floor(p.y / TS)) <= 1 ? dist(p, pos) : Infinity;
  }
  const d = dist(p, pos);
  return d <= RANGE[t.kind] ? d : Infinity;
}
export const inRange = (state, t) => rangeDist(state, t) < Infinity;
const BIAS = { threat: 10, poop: 3, egg: 3, animal: 2, dog: 2, lockedPlot: -2 };

export function findTarget(state, w) {
  const p = state.player, face = DIRV[p.dir ?? 0];
  let best = null, bestS = Infinity;
  const consider = t => {
    const d = rangeDist(state, t);
    if (d === Infinity) return;
    const pos = targetPos(state, t), vx = pos.x - p.x, vy = pos.y - p.y, len = Math.hypot(vx, vy);
    let s = d - (BIAS[t.kind] ?? 0);
    if (len > 3 && (vx * face[0] + vy * face[1]) / len > 0.5) s -= 8;
    if (w.curKey === keyOf(t)) s -= 3;
    if (s < bestS) { bestS = s; best = t; }
  };
  const { c: pc, r: pr } = { c: Math.floor(p.x / TS), r: Math.floor(p.y / TS) };
  for (let r = pr - 1; r <= pr + 1; r++) for (let c = pc - 1; c <= pc + 1; c++) {
    const idx = plotAt(c, r);
    if (idx < 0) continue;
    if (state.plots[idx]?.unlocked) consider({ kind: 'plot', idx });
    else if (idx === nextLockedIdx(state)) consider({ kind: 'lockedPlot', idx });
  }
  for (const a of state.animals) consider({ kind: 'animal', id: a.id });
  for (const e of state.eggs ?? []) consider({ kind: 'egg', id: e.id });
  for (const o of state.poops ?? []) consider({ kind: 'poop', id: o.id });
  for (const t of state.threats ?? []) consider({ kind: 'threat', id: t.id });
  consider({ kind: 'dog' });
  for (const { pen } of TROUGHS) consider({ kind: 'trough', pen });
  consider({ kind: 'nest' });
  for (const b of BUILDINGS) if (b.at && b.id !== 'coop') consider({ kind: 'building', id: b.id });
  w.curKey = best ? keyOf(best) : null;
  return best;
}

export function nameOf(state, t) {
  switch (t.kind) {
    case 'plot': { const c = state.plots[t.idx]?.crop; return c ? (CROPS[c.id]?.name ?? 'Cây trồng') : `Ô ruộng ${t.idx + 1}`; }
    case 'lockedPlot': return 'Đất hoang';
    case 'animal': { const a = findBy(state.animals, t.id); return a ? (a.name || (a.adult ? ANIMALS[a.type].name : ANIMALS[a.type].baby)) : 'Vật nuôi'; }
    case 'egg': return 'Quả trứng';
    case 'poop': return 'Phân chó';
    case 'threat': return findBy(state.threats, t.id)?.kind === 'thief' ? 'Thằng Tèo' : 'Con quạ';
    case 'dog': return state.dog.name || DOG.name;
    case 'trough': return `Máng ăn (${PENS[t.pen].name})`;
    case 'nest': return 'Ổ ấp trứng';
    case 'building': return BUILDINGS.find(b => b.id === t.id)?.name ?? '';
  }
  return '';
}

// Điểm neo mũi tên: x và y đỉnh của vật (điểm ảnh bản đồ)
export function anchorOf(state, t) {
  const pos = targetPos(state, t);
  if (!pos || pos.x == null) return null;
  switch (t.kind) {
    case 'plot': case 'lockedPlot': return { x: pos.x, top: plotTile(t.idx).r * TS + 1 };
    case 'animal': { const a = findBy(state.animals, t.id); const im = animalImg(a.type, a.adult, 'left', 0); return { x: a.x, top: a.y - (im?.height ?? 12) - 1 }; }
    case 'egg': return { x: pos.x, top: pos.y - eggSize().h - 1 };
    case 'poop': return { x: pos.x, top: pos.y - poopSize().h - 8 };
    case 'dog': { const im = dogImg(state.dog.adult, 'left', 0); return { x: pos.x, top: pos.y - (im?.height ?? 12) - 1 }; }
    case 'threat': { const th = pos; const alt = 0; return th.kind === 'crow' ? { x: th.x, top: th.y - 16 - alt } : { x: th.x, top: th.y - 26 }; }
    case 'trough': return { x: pos.x, top: pos.y - 12 };
    case 'nest': return { x: pos.x, top: pos.y - 14 };
    case 'building': {
      const b = BUILDINGS.find(bb => bb.id === t.id);
      return { x: b.at.x, top: Math.max(b.y - 2, (b.foot.r + b.foot.h) * TS - 44) };
    }
  }
  return null;
}

// ---------- Chạm vào màn hình: tìm thứ bị chạm ----------
const hitRect = (x, y, w, h, wx, wy, pad = 3) => wx >= x - pad && wx <= x + w + pad && wy >= y - pad && wy <= y + h + pad;
export function hitTest(state, wx, wy) {
  for (const t of state.threats ?? []) {
    if (t.x == null) continue;
    if (t.kind === 'crow' ? Math.hypot(wx - t.x, wy - t.y + 6) < 12 : hitRect(t.x - 8, t.y - 24, 16, 26, wx, wy)) return { kind: 'threat', id: t.id };
  }
  for (const a of [...state.animals].sort((u, v) => v.y - u.y)) {
    const im = animalImg(a.type, a.adult, 'left', 0);
    if (im && hitRect(a.x - im.width / 2, a.y - im.height, im.width, im.height, wx, wy)) return { kind: 'animal', id: a.id };
  }
  const dog = state.dog, di = dogImg(dog.adult, 'left', 0);
  if (di && hitRect(dog.x - di.width / 2, dog.y - di.height, di.width, di.height, wx, wy)) return { kind: 'dog' };
  for (const o of state.poops ?? []) if (Math.hypot(wx - o.x, wy - o.y + 3) < 9) return { kind: 'poop', id: o.id };
  for (const e of state.eggs ?? []) if (Math.hypot(wx - e.x, wy - e.y + 3) < 8) return { kind: 'egg', id: e.id };
  for (const { pen } of TROUGHS) { const tr = PENS[pen].trough; if (hitRect(tr.x - 13, tr.y - 12, 26, 12, wx, wy)) return { kind: 'trough', pen }; }
  const cp = coop();
  if (hitRect(cp.x, cp.y, 30, 28, wx, wy, 0) || hitRect(cp.at.x - 9, cp.at.y - 12, 18, 12, wx, wy)) return { kind: 'nest' };
  for (const b of BUILDINGS) {
    if (!b.at || b.id === 'coop') continue;
    const im = buildingImg(b);
    if (hitRect(b.x, b.y, im?.width ?? 24, im?.height ?? 24, wx, wy, 0)) return { kind: 'building', id: b.id };
  }
  const idx = plotAt(Math.floor(wx / TS), Math.floor(wy / TS));
  if (idx >= 0) {
    if (state.plots[idx]?.unlocked) return { kind: 'plot', idx };
    if (idx === nextLockedIdx(state)) return { kind: 'lockedPlot', idx };
  }
  return null;
}

// ---------- Lệnh đi tới ----------
export function walkTo(state, w, x, y) {
  const p = state.player;
  w.pending = null;
  w.path = findPath(p.x, p.y, x, y);
  w.marker = { x, y, t0: performance.now() };
  return w.path.length > 0;
}
export function goToTarget(state, w, t) {
  w.pending = t; w.pendingT = 0; w.repathT = 0; w.path = null;
}
export function faceTo(state, x, y) {
  const p = state.player;
  if (Math.hypot(x - p.x, y - p.y) > 0.5) p.dir = dirOf(x - p.x, y - p.y);
}
export function cancelMove(w) { w.path = null; w.pending = null; }

// ---------- Cập nhật mỗi khung hình ----------
// Trả về { results: [kết quả perform (trượt phân)], arrived: target đã tới nơi khi đang đi tới thứ được chạm }
export function update(state, w, dt) {
  ensurePositions(state);
  const out = { results: [], arrived: null };
  const p = state.player;
  w.stun = Math.max(0, w.stun - dt * 1000);
  w.moving = false;

  if (w.stun <= 0 && !w.busy) {
    let vx = w.input.x, vy = w.input.y;
    const len = Math.hypot(vx, vy);
    if (len > 0.15) {
      w.path = null; w.pending = null;
      if (len > 1) { vx /= len; vy /= len; }
      const ox = p.x, oy = p.y;
      moveBox(p, vx * SPEED * dt, vy * SPEED * dt);
      p.dir = dirOf(vx, vy);
      w.moving = Math.hypot(p.x - ox, p.y - oy) > 0.01;
    } else if (w.path?.length) {
      const wp = w.path[0], dx = wp.x - p.x, dy = wp.y - p.y, d = Math.hypot(dx, dy);
      if (d < 1.5) { w.path.shift(); if (!w.path.length) w.path = null; }
      else {
        const st = Math.min(d, SPEED * dt), ox = p.x, oy = p.y;
        moveBox(p, dx / d * st, dy / d * st);
        p.dir = dirOf(dx, dy);
        const moved = Math.hypot(p.x - ox, p.y - oy);
        w.moving = moved > 0.01;
        w.stuckT = moved < st * 0.3 ? w.stuckT + dt : 0;
        if (w.stuckT > 0.35) { w.path = null; w.stuckT = 0; }
      }
    }
  }
  if (w.moving) w.walkT += dt;

  // giẫm phân
  if (w.lastSlip != null) {
    const o = findBy(state.poops, w.lastSlip);
    if (!o || dist(o, p) > 12) w.lastSlip = null;
  }
  if (w.moving && w.stun <= 0) {
    for (const o of state.poops ?? []) {
      if (o.id !== w.lastSlip && dist(o, p) <= 6) {
        w.lastSlip = o.id; w.stun = DOG.slipStunMs; w.path = null; w.pending = null;
        out.results.push(ST.perform(state, { kind: 'poop', id: o.id }, 'slip'));
        break;
      }
    }
  }

  updateAnimals(state, w, dt);
  updateDog(state, w, dt);
  updateThreats(state, w, dt);

  // đang đi tới thứ được chạm
  const t = w.pending;
  if (t) {
    w.pendingT += dt;
    if (!exists(state, t) || w.pendingT > 15) { w.pending = null; w.path = null; }
    else if (inRange(state, t)) { out.arrived = t; w.pending = null; w.path = null; }
    else {
      w.repathT -= dt;
      if (!w.path || w.repathT <= 0) {
        const pos = targetPos(state, t);
        w.path = findPath(p.x, p.y, pos.x, pos.y);
        w.repathT = 0.5;
      }
    }
  }
  return out;
}
