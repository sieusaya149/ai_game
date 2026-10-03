// Thế giới: di chuyển, va chạm, tìm đường, AI con vật/chó/quạ/trộm, tìm target. Không vẽ gì.
import { TS, GROUND } from './layout.js';
import { ANIMALS, CROPS, DOG, GUARD, WALK_SPEED, DIR_NAME, BOND, FREE, PREDATOR } from './data.js';
import { character } from './art.js';
import * as ST from './state.js';
import { troughOf } from './farm.js';
import { aiStep } from './perf.js';
import { animalImg, dogImg, catImg, crowImg, eggSize, poopSize, buildingImg, decoSize, TEO_LOOK } from './render.js';

const SPEED = WALK_SPEED;         // px/s của người chơi (luật chó đuổi tính theo con số này)
const HW = 5, HH = 3;             // nửa hộp chân 10x6
const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];
const THREAT_NAME = { crow: 'Con quạ', thief: 'Thằng Tèo', tisun: 'Tí Sún', civet: 'Con chồn hương' };
const isBeast = t => t.kind === 'crow' || t.kind === 'civet';   // con thú: chạm nhỏ, không có bong bóng cao như người
const A_SPEED = { ga: 20, vit: 17, heo: 16, bo: 11, cuu: 13 };

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const dirOf = (dx, dy) => Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 0 : 3) : (dx < 0 ? 1 : 2);

// Bản đồ của cảnh đang đứng (vườn hoặc trong nhà...). Mọi hàm xuất ra nhận state đều gọi use(state) trước khi đụng tới M.
// Con vật, chó, quạ, trộm, trứng, phân luôn ở vườn: chỉ chạy/vẽ/chạm được khi đang ở vườn (atFarm).
let M = null;
const use = s => (M = ST.sceneMap(s));
const atFarm = () => !!M.garden;   // vườn mình hoặc vườn người khác đang thăm
// Bản đồ đang đứng theo cách chó/mèo ghi chỗ ở: thăm vườn người khác thì chó mèo của chủ vườn ở 'farm'
const here = s => (s.scene === 'visit' ? 'farm' : s.scene);
// Chó đang ở cùng bản đồ với người chơi? Bình thường nó ở vườn; có lệnh Đi theo thì nó lẽo đẽo sang làng, vào nhà (issue 45)
export const dogHere = s => (s.dog.scene ?? 'farm') === here(s);
// Mèo ở cùng bản đồ với người chơi (ban ngày ngoài vườn, ban đêm ngủ trong nhà; issue 44)
const catsHere = s => ST.catsIn(s, here(s));
export const nextLockedIdx = s => ST.nextLockedPlot(s);

export function createWorld() {
  return {
    rt: new Map(),            // dữ liệu chạy của từng thực thể (hướng, khung hình, AI)
    emotes: new Map(),        // biểu tượng cảm xúc tạm (tim...)
    fx: [],                   // chữ bay
    input: { x: 0, y: 0 },    // bàn phím / joystick
    path: null, pending: null, pendingT: 0, repathT: 0, stuckT: 0,
    stun: 0, moving: false, walkT: 0, busy: false,
    marker: null, lastSlip: null, curKey: null, doorArmed: false,
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
  return !M.isSolidPx(x - HW, y - HH) && !M.isSolidPx(x + HW, y - HH) && !M.isSolidPx(x - HW, y + HH) && !M.isSolidPx(x + HW, y + HH);
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
  const MW = M.mw, MH = M.mh;
  const sc = clamp(Math.floor(sx / TS), 0, MW - 1), sr = clamp(Math.floor(sy / TS), 0, MH - 1);
  const gc = clamp(Math.floor(gx / TS), 0, MW - 1), gr = clamp(Math.floor(gy / TS), 0, MH - 1);
  const d = new Int32Array(MW * MH).fill(-1), prev = new Int32Array(MW * MH).fill(-1);
  const q = [sr * MW + sc]; d[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const cur = q[h], c = cur % MW, r = (cur - c) / MW;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr, ni = nr * MW + nc;
      if (nc < 0 || nr < 0 || nc >= MW || nr >= MH || d[ni] >= 0 || M.isSolid(nc, nr)) continue;
      d[ni] = d[cur] + 1; prev[ni] = cur; q.push(ni);
    }
  }
  let goal = gr * MW + gc;
  const exact = d[goal] >= 0 && !M.isSolid(gc, gr);
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
  use(state);
  const p = state.player, F = ST.mapOf(state);
  if (p.x == null || p.y == null) { p.x = M.spawn.x; p.y = M.spawn.y; }
  p.dir ??= 0;
  for (const a of state.animals) {
    if ((a.x == null || a.y == null) && a.tile) { a.x = a.tile.c * TS + 8; a.y = a.tile.r * TS + 8; continue; }
    const pn = (a.x == null || a.y == null) && ST.animalPen(state, a); if (pn) Object.assign(a, inArea(pn.area));
  }
  const d = state.dog;
  if (d.x == null || d.y == null) { d.x = F.dogHome.x; d.y = F.dogHome.y; }
  for (const e of state.eggs ?? []) if (e.x == null) Object.assign(e, inArea((F.pens.chicken ?? Object.values(F.pens)[0]).area));
  for (const o of state.poops ?? []) if (o.x == null) { o.x = d.x; o.y = d.y; }
}

// ---------- Con vật trong chuồng ----------
// w.view (main.js đặt): khung nhìn của camera theo điểm ảnh bản đồ. Con vật ngoài khung chỉ cập nhật AI 2 lần/giây (gom dt).
const onScreen = (w, o) => !w.view || (o.x >= w.view.x0 && o.x <= w.view.x1 && o.y >= w.view.y0 && o.y <= w.view.y1);
// Tốc độ theo giai đoạn: con non lon ton, con già chậm chạp
const STAGE_SPEED = { non: 1.25, nho: 1.1, truong: 1, gia: 0.6 };
// Gà/vịt mẹ gần nhất cùng loài cho con non chạy theo
const POULTRY = ['ga', 'vit'];
const henOf = (state, a) => POULTRY.includes(a.type) && a.stage === 'non'
  ? state.animals.filter(h => h.type === a.type && h.sex === 'f' && (h.stage === 'truong' || h.stage === 'gia') && h.x != null).sort((u, v) => dist(u, a) - dist(v, a))[0] : null;
// Vịt con đi thành hàng sau vịt mẹ: con thứ k cách mẹ (k+1) bước, phía sau hướng mẹ đang đi
function duckRow(state, w, a, hen) {
  const k = state.animals.filter(o => o.type === 'vit' && o.stage === 'non' && o.id < a.id && henOf(state, o) === hen).length;
  const hr = rtOf(w, 'a' + hen.id), back = (hr.tx ?? hen.x) >= hen.x ? -1 : 1;
  return { x: hen.x + back * (7 + 6 * k), y: hen.y + 1 };
}
// Gà thả rông (luật chọn ô a.tile, ở đây chỉ đi tới đó): thẳng tới điểm trong ô, không bước vào ô ngoài vùng đi lại; kẹt lâu thì nhảy tới nơi.
// Lùa một con thả rông ra xa điểm src (người chơi lát 42, con chó lát 45): nó chạy ngược hướng src, tới cửa chuồng thì
// luật ghi là đã về (ST.passGate). radius px, speed px/giây. Trả true nếu con này đang bị lùa (đã xử lý xong lượt đi của nó).
export function shoo(state, a, src, dt, { radius = FREE.shyRadius, speed = 46, w } = {}) {
  const rt = rtOf(w ?? { rt: new Map() }, 'a' + a.id);
  if (!a.tile || a.x == null) return false;
  return herd(state, a, rt, dt, ST.roamOf(state), src, radius, speed);
}
function herd(state, a, rt, dt, R, src = state.player, radius = FREE.shyRadius, speed = 46) {
  const dx = a.x - src.x, dy = a.y - src.y, d = Math.hypot(dx, dy);
  rt.scared = false;
  if (d >= radius) return false;
  const gates = ST.animalPen(state, a)?.gates ?? [];
  const ok = (x, y) => { const c = Math.floor(x / TS), r = Math.floor(y / TS); return R.has(c, r) || gates.some(g => g[0] === c && g[1] === r); };
  const st = speed * (STAGE_SPEED[a.stage] ?? 1) * dt, ux = dx / (d || 1), uy = d ? dy / d : 1;
  let nx = a.x + ux * st, ny = a.y + uy * st;
  if (!ok(nx, ny)) { if (ok(nx, a.y)) ny = a.y; else if (ok(a.x, ny)) nx = a.x; else { nx = a.x; ny = a.y; } }
  a.x = nx; a.y = ny;
  const c = Math.floor(a.x / TS), r = Math.floor(a.y / TS);
  if (gates.some(g => g[0] === c && g[1] === r)) { ST.passGate(state, a.id); return true; }
  if (R.has(c, r)) a.tile = { c, r };
  if (Math.abs(dx) > 0.4) rt.face = dx < 0 ? 'left' : 'right';
  rt.walking = true; rt.peck = false; rt.scared = true; rt.anim += dt * 2;
  return true;
}
function freeWalk(state, a, w, dt0) {
  const rt = rtOf(w, 'a' + a.id), dt = aiStep(rt, dt0, onScreen(w, a));
  if (!dt) return;
  const R = ST.roamOf(state);
  if (a.stray && herd(state, a, rt, dt, R)) return;
  const tx = a.tile.c * TS + 3 + (a.id * 7) % 10, ty = a.tile.r * TS + 6 + (a.id * 5) % 8;
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  rt.walking = false; rt.peck = false;
  if (d < 1.5) { rt.stuck = 0; rt.peck = true; rt.anim += dt; return; }   // tới nơi: bới đất
  const st = Math.min(d, (A_SPEED[a.type] ?? 14) * (STAGE_SPEED[a.stage] ?? 1) * dt), nx = a.x + dx / d * st, ny = a.y + dy / d * st;
  const ok = (x, y) => R.has(Math.floor(x / TS), Math.floor(y / TS));
  if (ok(nx, ny) || !ok(a.x, a.y)) { a.x = nx; a.y = ny; rt.stuck = 0; } else if ((rt.stuck = (rt.stuck || 0) + dt) > 1.5) { a.x = tx; a.y = ty; rt.stuck = 0; }
  if (Math.abs(dx) > 0.4) rt.face = dx < 0 ? 'left' : 'right';
  rt.walking = true; rt.anim += dt;
}
function updateAnimals(state, w, dt0, out) {
  const p = state.player;
  const ms = M.mudSpot;
  const inMudSpot = a => !!ms && Math.abs(a.x - ms.x) < ms.rx && Math.abs(a.y - ms.y) < ms.ry;
  for (const a of state.animals) {
    if (a.tile && atFarm()) { freeWalk(state, a, w, dt0); continue; }
    const pen = ST.animalPen(state, a);
    if (!pen) continue;
    const area = pen.area, rt = rtOf(w, 'a' + a.id), seen = onScreen(w, a);
    const dt = aiStep(rt, dt0, seen);
    if (!dt) continue;
    if (a.sick >= 2) { rt.walking = false; rt.peck = false; rt.nap = false; rt.mode = 'idle'; rt.timer = 1; continue; }   // bệnh nặng: nằm một chỗ
    const near = Math.hypot(p.x - a.x, p.y - a.y) < 26;
    const scared = state.time < (a.scaredUntil ?? 0);   // vừa bị dời chuồng: chạy loạn một lúc
    const speed = (A_SPEED[a.type] ?? 14) * (STAGE_SPEED[a.stage] ?? 1) * (a.sick ? 0.5 : 1) * (scared ? 3 : 1);
    rt.walking = false; rt.peck = false;
    // gà con kêu chiếp (thỉnh thoảng, khi đang ở trên màn hình)
    if (POULTRY.includes(a.type) && a.stage === 'non' && seen && out && state.scene === 'farm' && Math.random() < dt * 0.06) {
      out.results.push({ ok: true, sound: 'chirp', fx: [{ text: 'chiếp', color: '#fff6a0', x: a.x, y: a.y + 14 }] });
    }
    // ❤️4+ chạy lại khi người chơi tới gần, ❤️5 đi theo từ xa (trong phạm vi chuồng)
    const bp = ST.bondPerk(a), pd = Math.hypot(p.x - a.x, p.y - a.y);
    if (!scared && !a.sick && state.scene === 'farm' && pd >= 30 && ((bp.runTo && pd < BOND.runRange) || bp.follow)) {
      rt.tx = clamp(p.x, area.x, area.x + area.w); rt.ty = clamp(p.y + 4, area.y, area.y + area.h); rt.mode = 'walk';
    }
    if (scared && rt.mode !== 'walk') { const t = inArea(area, 2); rt.tx = t.x; rt.ty = t.y; rt.mode = 'walk'; }
    if (rt.mode === 'walk') {
      if (near && !scared) { rt.mode = 'idle'; rt.timer = 0.8; }
      else {
        const dx = rt.tx - a.x, dy = rt.ty - a.y, d = Math.hypot(dx, dy);
        if (d < 1.5) { rt.mode = 'idle'; rt.timer = a.type === 'heo' && inMudSpot(a) ? rnd(3, 7) : rnd(1.2, 4); }
        else {
          const st = Math.min(d, speed * dt);
          a.x = clamp(a.x + dx / d * st, area.x, area.x + area.w);
          a.y = clamp(a.y + dy / d * st, area.y, area.y + area.h);
          a.walk = (a.walk || 0) + st;   // quãng đã đi (heo ít đi thì mau béo)
          if (Math.abs(dx) > 0.4) rt.face = dx < 0 ? 'left' : 'right';
          rt.walking = true; rt.anim += dt;
        }
      }
    } else {
      rt.timer -= dt;
      if (rt.mode === 'peck') { rt.peck = true; rt.anim += dt; if (rt.timer <= 0) rt.mode = 'idle'; }
      if (rt.mode === 'nap' && (rt.timer <= 0 || scared)) { rt.mode = 'idle'; rt.nap = false; }
      if (rt.timer <= 0 && !near) {
        rt.nap = false;
        const inMud = a.type === 'heo' && inMudSpot(a);
        const trough = pen.trough ? state.troughs?.[ANIMALS[a.type].pen] ?? 0 : 0;   // chuồng cách ly không có máng
        const hen = henOf(state, a);
        if (hen && a.type === 'vit' && Math.random() < 0.9) {   // vịt con đi hàng theo vịt mẹ
          const r = duckRow(state, w, a, hen);
          rt.tx = clamp(r.x, area.x, area.x + area.w); rt.ty = clamp(r.y, area.y, area.y + area.h); rt.mode = 'walk';
        } else if (hen && Math.random() < 0.75) {   // gà con lon ton theo gà mẹ
          rt.tx = clamp(hen.x + rnd(-9, 9), area.x, area.x + area.w); rt.ty = clamp(hen.y + rnd(2, 7), area.y, area.y + area.h); rt.mode = 'walk';
        } else if (a.stage === 'gia' && Math.random() < 0.45) {   // con già hay ngủ gật
          rt.mode = 'nap'; rt.nap = true; rt.timer = rnd(4, 9);
        } else if (a.hunger < 60 && trough > 0 && Math.random() < 0.6) {
          rt.tx = clamp(pen.trough.x + rnd(-14, 14), area.x, area.x + area.w); rt.ty = area.y + rnd(1, 8); rt.mode = 'walk';
        } else if (a.type === 'heo' && ms && !inMud && Math.random() < 0.45) {
          rt.tx = rnd(ms.x0, ms.x1); rt.ty = rnd(ms.y0, ms.y1); rt.mode = 'walk';
        } else if (POULTRY.includes(a.type) && Math.random() < (a.stage === 'nho' ? 0.7 : 0.4)) {   // gà nhỡ bới đất nhiều
          rt.mode = 'peck'; rt.timer = rnd(0.8, 1.8);
        } else {
          const t = inArea(area, 2); rt.tx = t.x; rt.ty = t.y; rt.mode = 'walk';
        }
      }
    }
  }
}

// ---------- Chó Mực ----------
// Chó chỉ chạy trên cỏ/đường trong đất nhà, không vào chuồng, không giẫm ruộng (chừa 1 ô quanh khối ruộng)
const dogAllowed = (c, r) => {
  if (!atFarm()) return !M.isSolid(c, r);   // đi theo chủ sang làng, vào nhà: chỗ nào người đi được thì chó đi được (vườn bạn đang thăm vẫn là vườn)
  if (!M.isOwned(c, r) || M.isSolid(c, r)) return false;
  const g = M.ground[r * M.mw + c];
  if (g !== GROUND.GRASS && g !== GROUND.ROAD) return false;
  for (const { rect } of M.penList) if (c >= rect.c && c < rect.c + rect.w && r >= rect.r && r < rect.r + rect.h) return false;
  return !M.fields.some(f => c >= f.c - 1 && c < f.c + 4 && r >= f.r - 1 && r < f.r + 4);
};
const dogCan = (x, y) => dogAllowed(Math.floor(x / TS), Math.floor(y / TS)) && dogAllowed(Math.floor((x - 3) / TS), Math.floor(y / TS)) && dogAllowed(Math.floor((x + 3) / TS), Math.floor(y / TS));
function updateDog(state, w, dt0, out) {
  const d = state.dog, p = state.player, rt = rtOf(w, 'dog');
  // đang canh khách lạ thì chó luôn cập nhật, dù chạy ngoài khung nhìn
  const chasing = state.scene === 'visit' && w.guard?.chasing;
  const dt = chasing ? dt0 : aiStep(rt, dt0, onScreen(w, d));
  if (!dt) return;
  // chó nhỡ sủa lung tung cả ngày (issue 45)
  rt.barkT = Math.max(0, (rt.barkT ?? 0) - dt);
  if (d.stage === 'nho' && out && !rt.barkT && onScreen(w, d) && Math.random() < dt * 0.09) {
    rt.barkT = 0.7;
    out.results.push({ ok: true, sound: 'bark', fx: [{ text: 'Gâu!', color: '#fff6a0', x: d.x, y: d.y - 14 }] });
  }
  if (!dogCan(d.x, d.y)) { const home = atFarm() ? M.dogHome : p; d.x = home.x; d.y = home.y; }
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
  if (guardStep(state, w, rt, dt, goTo, out)) return;   // canh khách lạ: sủa rồi đuổi
  // đang có lệnh (issue 45): luật đã quyết kết quả, đây chỉ là diễn hoạt
  const cmd = d.cmd?.id;
  rt.pose = rt.barkT ? 'bark' : null;
  if (cmd === 'sit') { rt.pose = 'sit'; rt.anim += dt; rt.mode = 'idle'; return; }
  if (cmd === 'guard') {
    const sp = ST.dogPost(state);
    if (sp && atFarm()) {
      const tx = sp.c * TS + 8, ty = sp.r * TS + 8;
      if (goTo(tx, ty, 50)) { rt.pose = 'bark'; rt.anim += dt; }
      return;
    }
  }
  if (cmd === 'herd' && atFarm()) {
    rt.pose = 'herd'; rt.run = true;
    // chạy tới con ở ngoài chuồng gần nhất rồi lùa nó về phía cửa chuồng
    const near = ST.outOfPen(state).filter(a => a.x != null).sort((u, v) => dist(u, d) - dist(v, d))[0];
    if (near) {
      goTo(near.x + (near.x > d.x ? -10 : 10), near.y, 78);
      shoo(state, near, d, dt, { radius: 40, speed: 58, w });
    } else goTo(p.x, p.y, 70);
    rt.anim += dt * 1.6;
    return;
  }
  if (cmd === 'follow') {
    rt.run = dp > 70;
    if (dp > 18) goTo(p.x, p.y, rt.run ? 72 : 44);
    else { rt.walking = false; rt.anim += dt; }
    return;
  }
  // chó già hay ngủ gật tại chỗ
  if (d.stage === 'gia' && rt.mode === 'idle' && rt.timer > 0 && dp > 40) { rt.nap = true; rt.anim += dt; return; }
  rt.nap = false;
  if (rt.mode === 'follow') {
    rt.run = dp > 70;
    if (dp < 22 || rt.timer <= 0 || rt.stuck > 0.5) { rt.mode = 'idle'; rt.timer = rnd(0.6, 2); rt.stuck = 0; }
    else goTo(p.x, p.y, rt.run ? 62 : 36);
  } else if (rt.mode === 'wander') {
    if (goTo(rt.tx, rt.ty, 30) || rt.stuck > 0.5) { rt.mode = 'idle'; rt.timer = rnd(1, 3.5); rt.stuck = 0; }
  } else if (rt.timer <= 0) {
    // khách lạ (đang thăm vườn người khác): chó không đi theo, chỉ quanh quẩn giữ chuồng
    const post = state.scene === 'visit' ? M.dogHome : null;
    if (!post && dp > 34 && Math.random() < 0.6) { rt.mode = 'follow'; rt.timer = rnd(3, 7); }
    else {
      const far = post ? 22 : 90, c = post ?? d;
      for (let i = 0; i < 8; i++) {
        const tx = c.x + rnd(-far, far), ty = c.y + rnd(-far * 0.8, far * 0.8);
        if (dogCan(tx, ty)) { rt.tx = tx; rt.ty = ty; rt.mode = 'wander'; break; }
      }
      if (rt.mode !== 'wander') rt.timer = 1;
    }
  }
}

// ---------- Chó canh khách lạ (issue 31) ----------
// Luật (bán kính, ngủ gật, xích, tốc độ đuổi) nằm trong state.js; ở đây chỉ diễn hoạt và báo cho main.js biết
// lúc nào gửi thao tác lên server. Chỉ chạy trong vườn người khác: khách mới là người đang di chuyển (ADR 0013).
// out.bark = chó vừa phát hiện khách · out.bite = chó đuổi kịp và đớp trúng.
function guardStep(state, w, rt, dt, goTo, out) {
  if (state.scene !== 'visit') { w.guard = null; return false; }
  const g = (w.guard ??= { chasing: false, lost: 0 });
  const d = state.dog, p = state.player;
  const sees = !state.visit.bitten && ST.dogSees(state, p);
  if (sees) {
    g.lost = 0;
    if (!g.chasing) { g.chasing = true; if (out) out.bark = true; }
  } else if (g.chasing) {
    g.lost += dt * 1000;
    if (g.lost > GUARD.loseMs) g.chasing = false;
  }
  rt.bark = g.chasing;
  if (!g.chasing) return false;
  // bị xích thì chỉ chạy tới mép vùng xích, thả rông thì đuổi tới chân khách
  const area = ST.guardArea(state);
  let tx = p.x, ty = p.y;
  if (area) {
    const dx = p.x - area.x, dy = p.y - area.y, len = Math.hypot(dx, dy) || 1;
    if (len > area.r) { tx = area.x + dx / len * area.r; ty = area.y + dy / len * area.r; }
  }
  goTo(tx, ty, ST.chaseSpeed());
  rt.run = true;
  if (out && dist(d, p) <= GUARD.biteRange) out.bite = true;
  return true;
}

// ---------- Mèo (issue 44) ----------
// Luật (state.js) đã chọn ô đi tuần, ô con chuột bị vồ, lúc về cửa mèo; ở đây chỉ diễn hoạt:
// đi tới (tx, ty), chạy vồ chuột, ngậm chiến lợi phẩm chạy tới khoe người chơi, mèo con vờn cuộn len, mèo nhỡ tập vồ.
function updateCats(state, w, dt0) {
  const p = state.player;
  for (const c of catsHere(state)) {
    const rt = rtOf(w, 'c' + c.id);
    const dt = aiStep(rt, dt0, onScreen(w, c));
    if (!dt) continue;
    rt.walking = false; rt.anim += dt;
    rt.pounceT = Math.max(0, (rt.pounceT ?? 0) - dt);
    if (c.trophy && !rt.trophy) rt.pounceT = 0.7;   // vừa vồ trúng: dáng vồ một nhịp rồi mới ngậm chuột
    rt.trophy = !!c.trophy;
    if (c.sleep || c.sun || c.sick >= 2) { rt.yarn = false; rt.shown = false; continue; }   // ngủ, phơi nắng, bệnh nặng: nằm yên một chỗ
    // ngậm chuột thì chạy tới đứng cạnh người chơi để khoe, không thì tới chỗ luật chọn
    const show = c.trophy && !rt.pounceT;
    const tx = show ? p.x + (c.x < p.x ? -12 : 12) : c.tx ?? c.x, ty = show ? p.y + 2 : c.ty ?? c.y;
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
    rt.shown = show && d <= 2;   // đã tới đứng cạnh người chơi: thả chuột xuống khoe
    const rat = !show &&(state.preds ?? []).some(r => r.kind === 'rat' && Math.abs(r.x - tx) < 2 && Math.abs(r.y - ty) < 2);
    rt.run = show || rat || !!c.inAt;
    if (d > 1 && !rt.pounceT) {
      const st = Math.min(d, (rt.run ? 64 : 26) * STAGE_SPEED[c.stage] * dt);
      c.x += dx / d * st; c.y += dy / d * st;
      if (Math.abs(dx) > 0.4) rt.face = dx < 0 ? 'left' : 'right';
      rt.walking = true;
      rt.yarn = false;
    } else if (!rt.pounceT) {
      // đứng yên: mèo con nghịch cuộn len, mèo nhỡ thỉnh thoảng tập vồ
      if (c.stage === 'non') rt.yarn = true;
      else if (c.stage === 'nho' && Math.random() < dt * 0.25) rt.pounceT = 0.6;
      if (show && Math.abs(p.x - c.x) > 0.4) rt.face = p.x < c.x ? 'left' : 'right';
    }
  }
}

// ---------- Quạ & trộm NPC (thằng Tèo, Tí Sún, chồn hương) ----------
function updateThreats(state, w, dt) {
  for (const t of state.threats ?? []) {
    const rt = rtOf(w, 't' + t.id), pc = t.at ?? M.plotCenter(t.plot);
    rt.walking = false;
    if (t.kind === 'crow') {
      const { x0, y0, x1, y1 } = M.view;
      if (t.x == null) {
        const s = Math.floor(Math.random() * 4);
        [t.x, t.y] = s === 0 ? [rnd(x0, x1), y0 - 24] : s === 1 ? [rnd(x0, x1), y1 + 24] : s === 2 ? [x0 - 24, rnd(y0, y1)] : [x1 + 24, rnd(y0, y1)];
        rt.alt = 14;
      }
      rt.alt ??= 14;
      let tx = pc.x, ty = pc.y + 4, sp = 70;
      if (t.state === 'leaving') {
        if (!rt.exit) {
          const ds = [t.x - x0, x1 - t.x, t.y - y0, y1 - t.y], m = ds.indexOf(Math.min(...ds));
          rt.exit = m === 0 ? { x: x0 - 40, y: t.y } : m === 1 ? { x: x1 + 40, y: t.y } : m === 2 ? { x: t.x, y: y0 - 40 } : { x: t.x, y: y1 + 40 };
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
      if (t.x == null) { t.x = M.gateIn.x; t.y = M.gateIn.y; }
      // đang ra tay thì đứng yên một chỗ (luật đã chốt vị trí), chưa tới thì đi vào, xong thì chuồn ra cổng
      const want = t.state === 'leaving' ? 'out' : t.state === 'eating' ? 'stay' : 'in';
      if (want === 'stay') { rt.pathFor = want; rt.path = null; continue; }
      if (rt.pathFor !== want) {
        rt.pathFor = want;
        rt.path = want === 'in' ? findPath(t.x, t.y, pc.x, pc.y) : [...findPath(t.x, t.y, M.gateIn.x, M.gateIn.y), { x: M.gateIn.x, y: M.view.y1 + 30 }];
      }
      const wp = rt.path?.[0];
      if (wp) {
        const sp = t.kind === 'civet' ? 62 : 44;   // chồn hương chạy nhanh hơn người
        const dx = wp.x - t.x, dy = wp.y - t.y, d = Math.hypot(dx, dy), st = Math.min(d, sp * dt);
        if (d < 0.8) rt.path.shift();
        else { t.x += dx / d * st; t.y += dy / d * st; rt.dir = dirOf(dx, dy); rt.walking = true; rt.anim += dt; }
      }
    }
  }
}

// ---------- Kẻ săn mồi: chuột, diều hâu, chồn (issue 43) ----------
// Luật (state.js) đã chọn ô của chuột và con mồi của diều hâu/chồn; ở đây chỉ diễn hoạt cho đẹp:
// chuột lon ton tới ô luật chọn, diều hâu lượn vòng trên cao rồi sà xuống, chồn men theo đất tới con mồi.
function updatePreds(state, w, dt) {
  for (const p of state.preds ?? []) {
    const rt = rtOf(w, 'p' + p.id);
    rt.walking = false; rt.eat = false;
    const tx = p.tx ?? p.x, ty = p.ty ?? p.y;
    if (p.state === 'leaving') {   // bị đuổi hay vừa xong việc: chuồn thẳng
      const away = rt.face === 'right' ? 1 : -1;
      p.x += (p.kind === 'rat' ? 80 : 70) * dt * away;
      if (p.kind === 'hawk') p.y -= 50 * dt;
      rt.walking = true; rt.anim += dt * 4;
      continue;
    }
    if (p.kind === 'rat') {
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      if (d > 1) {
        const st = Math.min(d, 40 * dt);
        p.x += dx / d * st; p.y += dy / d * st;
        if (Math.abs(dx) > 0.4) rt.face = dx < 0 ? 'left' : 'right';
        rt.walking = true;
      } else rt.eat = true;   // tới ô rồi thì gặm nhấm tại chỗ
      rt.anim += dt * (rt.walking ? 2.6 : 1.2);
      continue;
    }
    // Diều hâu lượn vòng thu hẹp dần rồi sà xuống; chồn men tới con mồi. t = 0 lúc mới tới, 1 lúc ra tay.
    const t = clamp(1 - (p.strikeAt - state.time) / PREDATOR.warnMs, 0, 1);
    rt.a = (rt.a ?? Math.random() * 6.28) + dt * (p.kind === 'hawk' ? 1.8 : 0.9);
    const rr = (1 - t) * (p.kind === 'hawk' ? 30 : 26);
    const gx = tx + Math.cos(rt.a) * rr, gy = ty + Math.sin(rt.a) * rr * 0.6 - (p.kind === 'hawk' ? 10 + 28 * (1 - t) : 0);
    const k = Math.min(1, dt * 6);
    p.x += (gx - p.x) * k; p.y += (gy - p.y) * k;
    rt.face = Math.cos(rt.a) < 0 ? 'left' : 'right';
    rt.ground = ty;                               // chỗ đổ bóng (mặt đất dưới con mồi)
    rt.dive = p.kind === 'hawk' && t > 0.55;      // đã cụp cánh sà xuống
    rt.pounce = p.kind === 'weasel' && t > 0.7;   // chồn chồm lên vồ
    rt.walking = p.kind === 'weasel';
    rt.anim += dt * 3;
  }
}

// ---------- Target & phạm vi tương tác ----------
export const keyOf = t => t.kind + (t.id ?? t.idx ?? t.pen ?? t.to ?? t.dir ?? '');
const doorOf = to => M.doors.find(d => d.to === to);
const inDoor = (d, x, y) => x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h;
const troughAnchor = tg => { const t = troughOf(M, tg); return t ? { x: t.x, y: t.r * TS + 8 } : null; };
const scaleOf = t => (M.penById[t.id] ?? M.pens[t.pen])?.scale;   // cân của chuồng heo { pen, id }
const coop = () => M.building('coop');
// Điểm trên ranh đất nhà theo hướng dir, thẳng với người chơi (target mua đất: đứng sát mép là chạm được)
function stripEdge(state, dir) {
  const o = M.owned, p = state.player;
  if (!ST.nextStrip(state, dir)) return null;
  const x = dir === 'E' ? (o.c + o.w) * TS : dir === 'W' ? o.c * TS : clamp(p.x, o.c * TS, (o.c + o.w) * TS);
  const y = dir === 'S' ? (o.r + o.h) * TS : dir === 'N' ? o.r * TS : clamp(p.y, o.r * TS, (o.r + o.h) * TS);
  return { x, y };
}
const gateOn = (state, id) => ST.isDusk(state) && ST.penHome(state, id).total > 0;   // cửa chuồng chỉ là target từ chạng vạng (rải thóc, xem số con đã về)
const findBy = (list, id) => (list ?? []).find(e => e.id === id);

// Bụi/đá theo id (bản đồ vườn lớn có hàng trăm cái, tìm mỗi khung hình thì chậm): bảng tra nhớ theo bản đồ
const clutterIdx = new WeakMap();
function clutterOf(id) {
  let t = clutterIdx.get(M);
  if (!t) clutterIdx.set(M, t = new Map(M.clutter.map(o => [o.id, o])));
  return t.get(id);
}
export function targetPos(state, t) {
  use(state);
  switch (t.kind) {
    case 'plot': case 'lockedPlot': return M.plotCenter(t.idx);
    case 'animal': return findBy(state.animals, t.id);
    case 'egg': return findBy(state.eggs, t.id);
    case 'poop': return findBy(state.poops, t.id);
    case 'threat': return findBy(state.threats, t.id);
    case 'pred': return findBy(state.preds, t.id);
    case 'dog': return state.dog;
    case 'cat': return findBy(state.cats, t.id);
    case 'trough': return troughAnchor(t);
    case 'gate': return ST.gateOf(state, t.id);
    case 'scale': { const c = scaleOf(t); return c ? { x: c.x, y: c.y + 8 } : null; }
    case 'nest': return coop()?.at ?? null;
    case 'building': return M.buildings.find(b => b.id === t.id)?.at ?? null;
    case 'door': return doorOf(t.to)?.at ?? null;
    case 'deco': return M.decos.find(d => d.id === t.id) ?? null;
    case 'clutter': { const c = clutterOf(t.id); return c ? { x: c.x + 8, y: c.y + 8 } : null; }
    case 'strip': return stripEdge(state, t.dir);
  }
  return null;
}
export function exists(state, t) {
  use(state);
  if (!atFarm() && !['building', 'door'].includes(t.kind) && !(t.kind === 'dog' && dogHere(state)) && t.kind !== 'cat') return false;
  if (t.kind === 'cat') return catsHere(state).some(c => c.id === t.id);
  if (t.kind === 'plot') return !!state.plots[t.idx]?.unlocked;
  if (t.kind === 'lockedPlot') return t.idx === ST.nextLockedPlot(state);
  if (t.kind === 'strip' && !atFarm()) return false;
  const pos = targetPos(state, t);
  return !!pos && pos.x != null;
}
// Đồ đặt trong vườn chạm vào được (ngồi ghế đá, đặt hoa lên mộ)
const TAPPABLE_DECO = new Set(['deco_bench', 'grave', 'grave_flower', 'deco_rattrap']);
// bù nhìn bị bão quật đổ (issue 55) chạm được để dựng lại
const tappable = d => TAPPABLE_DECO.has(d.kind) || (d.kind === 'deco_scarecrow' && !!d.ent?.down);
const RANGE = { animal: 20, egg: 20, poop: 20, threat: 20, pred: 26, dog: 20, cat: 20, trough: 22, gate: 24, scale: 22, nest: 22, building: 22, door: 22, deco: 22, clutter: 24, strip: 18 };
// Khoảng cách tới target nếu trong tầm, ngược lại Infinity
export function rangeDist(state, t) {
  use(state);
  const p = state.player, pos = targetPos(state, t);
  if (!pos || pos.x == null) return Infinity;
  if (t.kind === 'plot' || t.kind === 'lockedPlot') {
    const { c, r } = M.plotTile(t.idx);
    return Math.abs(c - Math.floor(p.x / TS)) <= 1 && Math.abs(r - Math.floor(p.y / TS)) <= 1 ? dist(p, pos) : Infinity;
  }
  const d = dist(p, pos);
  return d <= RANGE[t.kind] ? d : Infinity;
}
export const inRange = (state, t) => rangeDist(state, t) < Infinity;
const BIAS = { threat: 10, pred: 12, poop: 3, egg: 3, animal: 2, dog: 2, cat: 2, lockedPlot: -2 };
// Kẻ săn mồi chỉ được ưu tiên khi đang trong khoảng cảnh báo (sắp ra tay). Con chuột lang thang ngang qua
// không được giành mất ô ruộng, quả trứng hay cái máng ngay dưới chân người chơi.
function biasOf(state, t) {
  if (t.kind !== 'pred') return BIAS[t.kind] ?? 0;
  const p = findBy(state.preds, t.id);
  return p?.state === 'hunt' && p.strikeAt - state.time <= PREDATOR.warnMs ? BIAS.pred : -4;
}

export function findTarget(state, w) {
  use(state);
  const p = state.player, face = DIRV[p.dir ?? 0], now = performance.now();
  let best = null, bestS = Infinity;
  const consider = t => {
    const d = rangeDist(state, t);
    if (d === Infinity) return;
    const pos = targetPos(state, t), vx = pos.x - p.x, vy = pos.y - p.y, len = Math.hypot(vx, vy);
    let s = d - biasOf(state, t);
    if (len > 3 && (vx * face[0] + vy * face[1]) / len > 0.5) s -= 8;
    if (w.curKey === keyOf(t)) s -= 3;
    if (w.tapKey === keyOf(t) && now < w.tapUntil) s -= 40;   // thứ vừa chạm vào: giữ làm mục tiêu khi còn trong tầm
    if (s < bestS) { bestS = s; best = t; }
  };
  const { c: pc, r: pr } = { c: Math.floor(p.x / TS), r: Math.floor(p.y / TS) };
  for (let r = pr - 1; r <= pr + 1; r++) for (let c = pc - 1; c <= pc + 1; c++) {
    const idx = M.plotAt(c, r);
    if (idx < 0) continue;
    if (state.plots[idx]?.unlocked) consider({ kind: 'plot', idx });
    else if (idx === ST.nextLockedPlot(state)) consider({ kind: 'lockedPlot', idx });
  }
  if (atFarm()) {
    for (const a of state.animals) consider({ kind: 'animal', id: a.id });
    for (const e of state.eggs ?? []) consider({ kind: 'egg', id: e.id });
    for (const o of state.poops ?? []) consider({ kind: 'poop', id: o.id });
    for (const t of state.threats ?? []) consider({ kind: 'threat', id: t.id });
    for (const p of state.preds ?? []) consider({ kind: 'pred', id: p.id });
    consider({ kind: 'nest' });
    for (const c of M.clutter) if (Math.abs(c.x + 8 - p.x) <= RANGE.clutter && Math.abs(c.y + 8 - p.y) <= RANGE.clutter) consider({ kind: 'clutter', id: c.id });   // ngoài tầm thì khỏi xét
    for (const dir of ['N', 'S', 'E', 'W']) consider({ kind: 'strip', dir });
  }
  if (dogHere(state)) consider({ kind: 'dog' });
  for (const c of catsHere(state)) consider({ kind: 'cat', id: c.id });
  for (const { pen, id } of M.troughs) consider({ kind: 'trough', pen, id });
  for (const p of M.penList) if (p.scale) consider({ kind: 'scale', pen: p.type, id: p.id });
  if (atFarm()) for (const p of M.penList) if (gateOn(state, p.id)) consider({ kind: 'gate', id: p.id });
  for (const d of M.decos) if (tappable(d)) consider({ kind: 'deco', id: d.id });
  for (const b of M.buildings) if (b.at && b.id !== 'coop') consider({ kind: 'building', id: b.id });
  if (!atFarm()) for (const d of M.doors) consider({ kind: 'door', to: d.to });   // ngoài vườn thì sang nhà/làng bằng nút của nhà/cổng
  w.curKey = best ? keyOf(best) : null;
  return best;
}

export function nameOf(state, t) {
  use(state);
  switch (t.kind) {
    case 'plot': { const c = state.plots[t.idx]?.crop; return c ? (CROPS[c.id]?.name ?? 'Cây trồng') : `Ô ruộng ${t.idx + 1}`; }
    case 'lockedPlot': return 'Đất hoang';
    case 'animal': { const a = findBy(state.animals, t.id); return a ? `${ST.animalLabel(a)} ${'❤️'.repeat(a.bond || 1)}` : 'Vật nuôi'; }
    case 'egg': { const e = findBy(state.eggs, t.id); return e?.candled ? (e.fertile ? 'Trứng có phôi ✨' : 'Trứng trống') : 'Quả trứng'; }
    case 'poop': return 'Phân chó';
    case 'threat': return THREAT_NAME[findBy(state.threats, t.id)?.kind] ?? 'Con quạ';
    case 'pred': { const p = findBy(state.preds, t.id); return p ? 'Con ' + ST.PRED_NAME[p.kind].toLowerCase() : ''; }
    case 'dog': return state.dog.name || DOG.name;
    case 'cat': { const c = findBy(state.cats, t.id); return c ? `${ST.animalLabel(c)} ${'❤️'.repeat(c.bond || 1)}` : 'Mèo'; }
    case 'trough': return `Máng ăn (${(M.penById[t.id] ?? M.pens[t.pen]).name})`;
    case 'gate': { const h = ST.penHome(state, t.id); return `Cửa ${M.penById[t.id]?.name?.toLowerCase() ?? 'chuồng'} (${h.home}/${h.total} đã về)`; }
    case 'scale': return 'Cân heo';
    case 'nest': return 'Ổ ấp trứng';
    case 'building': return M.buildings.find(b => b.id === t.id)?.name ?? '';
    case 'door': return doorOf(t.to)?.name ?? 'Cửa';
    case 'deco': { const d = M.decos.find(o => o.id === t.id); return d ? ST.entName(d.ent) : 'Đồ trang trí'; }
    case 'clutter': return M.clutter.find(o => o.id === t.id) ? ST.entName(M.clutter.find(o => o.id === t.id).ent) : '';
    case 'strip': return `Đất phía ${DIR_NAME[t.dir]}`;
  }
  return '';
}

// Điểm neo mũi tên: x và y đỉnh của vật (điểm ảnh bản đồ)
export function anchorOf(state, t) {
  const pos = targetPos(state, t);
  if (!pos || pos.x == null) return null;
  switch (t.kind) {
    case 'plot': case 'lockedPlot': return { x: pos.x, top: M.plotTile(t.idx).r * TS + 1 };
    case 'animal': { const a = findBy(state.animals, t.id); const im = animalImg(a, 'left', 0); return { x: a.x, top: a.y - (im?.height ?? 12) - 1 }; }
    case 'egg': return { x: pos.x, top: pos.y - eggSize().h - 1 };
    case 'poop': return { x: pos.x, top: pos.y - poopSize().h - 8 };
    case 'dog': { const im = dogImg(state.dog, 'left', 0); return { x: pos.x, top: pos.y - (im?.height ?? 12) - 1 }; }
    case 'cat': { const im = catImg(pos); return { x: pos.x, top: pos.y - (im?.height ?? 10) - 1 }; }
    case 'threat': { const th = pos; return isBeast(th) ? { x: th.x, top: th.y - 16 } : { x: th.x, top: th.y - 26 }; }
    case 'pred': { const p = findBy(state.preds, t.id); return { x: pos.x, top: pos.y - (p?.kind === 'rat' ? 9 : p?.kind === 'weasel' ? 11 : 15) }; }
    case 'trough': return { x: pos.x, top: pos.y - 12 };
    case 'gate': return { x: pos.x, top: pos.y - 16 };
    case 'scale': return { x: pos.x, top: pos.y - 24 };
    case 'nest': return { x: pos.x, top: pos.y - 14 };
    case 'building': {
      const b = M.buildings.find(bb => bb.id === t.id);
      return { x: b.at.x, top: Math.max(b.y - 2, (b.foot.r + b.foot.h) * TS - 44) };
    }
    case 'door': return { x: pos.x, top: pos.y - 14 };
    case 'deco': return { x: pos.x, top: pos.y - decoSize(pos.kind).h - 1 };
    case 'clutter': return { x: pos.x, top: pos.y - 14 };
    case 'strip': return { x: pos.x, top: pos.y - 16 };
  }
  return null;
}

// ---------- Chạm vào màn hình: tìm thứ bị chạm ----------
const hitRect = (x, y, w, h, wx, wy, pad = 3) => wx >= x - pad && wx <= x + w + pad && wy >= y - pad && wy <= y + h + pad;
export function hitTest(state, wx, wy) {
  use(state);
  if (!atFarm()) for (const d of M.doors) if (hitRect(d.x, d.y - TS, d.w, d.h + TS, wx, wy, 0)) return { kind: 'door', to: d.to };   // ô cửa + thảm chùi chân
  for (const t of atFarm() ? state.threats ?? [] : []) {
    if (t.x == null) continue;
    const hit = t.kind === 'crow' ? Math.hypot(wx - t.x, wy - t.y + 6) < 12
      : t.kind === 'civet' ? hitRect(t.x - 10, t.y - 11, 20, 13, wx, wy)
      : hitRect(t.x - 8, t.y - 24, 16, 26, wx, wy);
    if (hit) return { kind: 'threat', id: t.id };
  }
  // diều hâu, chồn đang rình con mồi: chạm trúng chúng trước cả con vật (phải đuổi kịp trong 10 giây)
  for (const p of atFarm() ? state.preds ?? [] : []) {
    if (p.x == null || p.kind === 'rat') continue;
    const [hw, hh] = p.kind === 'weasel' ? [10, 11] : [12, 14];
    if (hitRect(p.x - hw, p.y - hh, hw * 2, hh + 4, wx, wy, 4)) return { kind: 'pred', id: p.id };
  }
  // máng ăn xét trước con vật: con vật hay đứng ăn ngay trên máng, chạm vào máng phải chọn được máng (chạm thân con vật phía trên vẫn trúng con vật)
  for (const { pen, id } of M.troughs) { const tr = M.penById[id].trough; if (hitRect(tr.x - 13, tr.y - 12, 26, 12, wx, wy)) return { kind: 'trough', pen, id }; }
  if (atFarm()) {
    for (const a of [...state.animals].sort((u, v) => v.y - u.y)) {
      const im = animalImg(a, 'left', 0);
      if (im && hitRect(a.x - im.width / 2, a.y - im.height, im.width, im.height, wx, wy)) return { kind: 'animal', id: a.id };
    }
    for (const o of state.poops ?? []) if (Math.hypot(wx - o.x, wy - o.y + 3) < 9) return { kind: 'poop', id: o.id };
    for (const e of state.eggs ?? []) if (Math.hypot(wx - e.x, wy - e.y + 3) < 8) return { kind: 'egg', id: e.id };
    // con chuột chạy ngang: xét sau trứng, phân... để nó không giành mất cái đang nằm dưới chân
    for (const p of state.preds ?? []) if (p.kind === 'rat' && p.x != null && hitRect(p.x - 8, p.y - 9, 16, 13, wx, wy, 0)) return { kind: 'pred', id: p.id };
  }
  for (const c of catsHere(state)) {
    const im = catImg(c);
    if (im && hitRect(c.x - im.width / 2, c.y - im.height, im.width, im.height, wx, wy)) return { kind: 'cat', id: c.id };
  }
  if (dogHere(state)) {
    const dog = state.dog, di = dogImg(dog, 'left', 0);
    if (di && dog.x != null && hitRect(dog.x - di.width / 2, dog.y - di.height, di.width, di.height, wx, wy)) return { kind: 'dog' };
  }
  for (const d of M.decos) if (tappable(d)) { const z = decoSize(d.kind); if (hitRect(d.x - z.w / 2, d.y - z.h, z.w, z.h, wx, wy)) return { kind: 'deco', id: d.id }; }
  if (atFarm()) for (const p of M.penList) { const g = gateOn(state, p.id) && ST.gateOf(state, p.id); if (g && hitRect(g.x - 14, g.y - 16, 28, 22, wx, wy)) return { kind: 'gate', id: p.id }; }
  for (const p of M.penList) if (p.scale && hitRect(p.scale.x - 8, p.scale.y - 14, 16, 16, wx, wy)) return { kind: 'scale', pen: p.type, id: p.id };
  const cp = coop();
  if (cp && hitRect(cp.x, cp.y, 30, 28, wx, wy, 0) || cp && hitRect(cp.at.x - 9, cp.at.y - 12, 18, 12, wx, wy)) return { kind: 'nest' };
  for (const b of M.buildings) {
    if (!b.at || b.id === 'coop') continue;
    const im = buildingImg(b);
    if (hitRect(b.x, b.y, im?.width ?? 24, im?.height ?? 24, wx, wy, 0) || (b.hit && hitRect(b.hit.x, b.hit.y, b.hit.w, b.hit.h, wx, wy, 0))) return { kind: 'building', id: b.id };
  }
  if (atFarm()) for (const c of M.clutter) if (hitRect(c.x, c.y - 4, TS, TS + 4, wx, wy, 0)) return { kind: 'clutter', id: c.id };
  const idx = M.plotAt(Math.floor(wx / TS), Math.floor(wy / TS));
  if (idx >= 0) {
    if (state.plots[idx]?.unlocked) return { kind: 'plot', idx };
    if (idx === ST.nextLockedPlot(state)) return { kind: 'lockedPlot', idx };
  }
  return null;
}

// ---------- Lệnh đi tới ----------
export function walkTo(state, w, x, y) {
  use(state);
  const p = state.player;
  w.pending = null; w.tapKey = null;
  w.path = findPath(p.x, p.y, x, y);
  w.marker = { x, y, t0: performance.now() };
  return w.path.length > 0;
}
// act = false: chỉ đi tới đứng trong tầm, không tự làm hành động chính (đi theo Việc cần làm)
export function goToTarget(state, w, t, act = true) {
  pickTarget(w, t);
  w.pending = t; w.pendingAct = act; w.pendingT = 0; w.repathT = 0; w.path = null;
}
// Người chơi chạm vào con vật nuôi t (chó, mèo, gia súc hay chạy lăng xăng, đứng cạnh thứ khác): thanh hành động theo
// t khi nó còn trong tầm (6 giây, tới khi chạm chỗ khác hay đi bằng cần điều khiển). Thứ đứng yên thì chọn theo gần nhất như cũ.
export const TAP_KEEP_MS = 6000;
const KEEP_KINDS = new Set(['dog', 'cat', 'animal']);
export function pickTarget(w, t) { w.tapKey = KEEP_KINDS.has(t.kind) ? keyOf(t) : null; w.tapUntil = performance.now() + TAP_KEEP_MS; }
export function faceTo(state, x, y) {
  const p = state.player;
  if (Math.hypot(x - p.x, y - p.y) > 0.5) p.dir = dirOf(x - p.x, y - p.y);
}
export function cancelMove(w) { w.path = null; w.pending = null; }

// ---------- Bố cục vừa đổi (dời công trình, hủy dời) ----------
// Đường đã tính không còn đúng: bỏ đi để tự tìm lại; con vật/chó chọn đích mới.
function relayout(state, w) {
  w.path = null; w.repathT = 0; w.stuckT = 0; w.marker = null;
  for (const [k, rt] of w.rt) {
    if (k[0] === 't') rt.pathFor = null;
    else { rt.mode = 'idle'; rt.timer = 0; rt.stuck = 0; }
  }
}

// ---------- Chế độ xây dựng: chạm vào công trình nào ----------
// Trả về thực thể trong state.farm.ents (kể cả nhà, cổng, cây để báo không dời được), hoặc null.
export function pickEntity(state, wx, wy) {
  use(state);
  const c = Math.floor(wx / TS), r = Math.floor(wy / TS);
  const inFoot = e => { const f = ST.footprint(e); return c >= f.c && r >= f.r && c < f.c + f.w && r < f.r + f.h; };
  const ents = state.farm.ents;
  const deco = ents.find(e => e.kind === 'deco' && inFoot(e));
  if (deco) return deco;
  for (const b of [...M.buildings].sort((u, v) => (v.foot.r + v.foot.h) - (u.foot.r + u.foot.h))) {
    const im = buildingImg(b);
    if (hitRect(b.x, b.y, im?.width ?? 16, im?.height ?? 16, wx, wy, 0) && b.ent.kind !== 'pen') return b.ent;
  }
  return ents.find(e => e.kind !== 'pen' && inFoot(e)) ?? ents.find(inFoot) ?? null;
}

// ---------- Cập nhật mỗi khung hình ----------
// Trả về { results: [kết quả perform (trượt phân)], arrived: target đã tới nơi khi đang đi tới thứ được chạm,
//   door: cửa vừa bước vào (main.js chuyển bản đồ) }
export function update(state, w, dt) {
  ensurePositions(state);
  if (w.map !== M) { if (w.map) relayout(state, w); w.map = M; }
  const out = { results: [], arrived: null };
  const p = state.player;
  w.stun = Math.max(0, w.stun - dt * 1000);
  w.moving = false;
  const speed = SPEED / ST.slowFactor(state);   // hết thể lực thì đi chậm

  if (w.stun <= 0 && !w.busy) {
    let vx = w.input.x, vy = w.input.y;
    const len = Math.hypot(vx, vy);
    if (len > 0.15) {
      w.path = null; w.pending = null; w.tapKey = null;
      if (len > 1) { vx /= len; vy /= len; }
      const ox = p.x, oy = p.y;
      moveBox(p, vx * speed * dt, vy * speed * dt);
      p.dir = dirOf(vx, vy);
      w.moving = Math.hypot(p.x - ox, p.y - oy) > 0.01;
    } else if (w.path?.length) {
      const wp = w.path[0], dx = wp.x - p.x, dy = wp.y - p.y, d = Math.hypot(dx, dy);
      if (d < 1.5) { w.path.shift(); if (!w.path.length) w.path = null; }
      else {
        const st = Math.min(d, speed * dt), ox = p.x, oy = p.y;
        moveBox(p, dx / d * st, dy / d * st);
        p.dir = dirOf(dx, dy);
        const moved = Math.hypot(p.x - ox, p.y - oy);
        w.moving = moved > 0.01;
        w.stuckT = moved < st * 0.3 ? w.stuckT + dt : 0;
        if (w.stuckT > 0.35) { w.path = null; w.stuckT = 0; }
      }
    }
  }
  if (w.moving) { w.walkT += dt; ST.standUp(state); }   // đi là đứng dậy khỏi ghế

  // bước vào ô cửa → sang bản đồ khác (phải ra khỏi ô cửa một lần rồi mới tính, khỏi bị đẩy qua lại)
  const door = M.doors.find(d => inDoor(d, p.x, p.y));
  if (!door) w.doorArmed = true;
  else if (w.doorArmed && w.moving) { w.doorArmed = false; w.path = null; w.pending = null; out.door = door; }
  // ở trong nhà: con vật, quạ ngoài vườn đứng yên (luật vẫn chạy trong tick)
  if (atFarm()) updateFarm(state, w, dt, out);
  if (dogHere(state)) updateDog(state, w, dt, out);   // chó đi theo thì chạy cả ở làng, trong nhà
  updateCats(state, w, dt);

  // đang đi tới thứ được chạm
  const t = w.pending;
  if (t) {
    w.pendingT += dt;
    if (!exists(state, t) || w.pendingT > 15) { w.pending = null; w.path = null; }
    else if (inRange(state, t)) { if (w.pendingAct !== false) out.arrived = t; w.pending = null; w.path = null; }
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

// Phần chỉ chạy khi đang ở vườn: giẫm phân, con vật, chó, quạ, trộm
function updateFarm(state, w, dt, out) {
  const p = state.player;
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

  updateAnimals(state, w, dt, out);
  updateThreats(state, w, dt);
  updatePreds(state, w, dt);
}
