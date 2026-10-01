// Khởi động game, vòng lặp, camera, nhập liệu (bàn phím, chạm, joystick) và cầu nối giữa state/ui/world/render.
import {
  loadGame, loadProblem, saveGame, createGame, resetGame as resetSave, tick, actionsFor, perform, mapOf, sceneMap, enterScene,
  nextStrip, buyStrip, canPlace, canMove, moveEntity, placeEntity, storeEntity, canAfford, fieldCount, fieldLimit, entName, footprint, snapLayout, restoreLayout, slowFactor, sleep,
} from './state.js';
import * as ui from './ui.js';
import { TS } from './layout.js';
import { DIR_NAME } from './data.js';
import * as R from './render.js';
import * as V from './world.js';
import { eventMeta } from './notify.js';
import { todoList } from './todo.js';
import * as P from './perf.js';

const ACTION_MS = 350;
const actionMs = () => ACTION_MS * slowFactor(state);   // hết thể lực thì làm chậm
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Canvas ----------
let canvas = document.getElementById('game-canvas');
if (!canvas) {
  canvas = document.createElement('canvas');
  canvas.id = 'game-canvas';
  document.body.prepend(canvas);
}
Object.assign(canvas.style, {
  position: 'fixed', inset: '0', width: '100%', height: '100%', display: 'block', zIndex: '0',
  touchAction: 'none', imageRendering: 'pixelated', userSelect: 'none', webkitUserSelect: 'none',
});
const ctx = canvas.getContext('2d');

let state = null;
let world = V.createWorld();
let busy = null;                  // { target, id, t0 }
let dpr = 1, scale = 2;
let cam = { x: 0, y: 0 }, view = { camX: 0, camY: 0 };
let curTarget = null, lastTargetKey = '', dirty = true;
let plan = null;                  // { kind, until }: việc cần làm ngoài vườn đang đi tới từ bản đồ khác (ra cửa/cổng, chuyển cảnh, đi tiếp)
let lastHud = 0, lastActions = 0, lastSave = 0, last = performance.now();
// Hiệu năng: cài đặt riêng của máy (tiết kiệm pin), đo FPS, gợi ý bật tiết kiệm pin sau 10 giây đầu nếu máy chậm
const prefs = P.loadPrefs(), fps = P.createFps();
let hintDone = false;
async function suggestBattery() {
  prefs.hinted = true; P.savePrefs(prefs);
  if (await ui.confirmBox('Máy đang chạy hơi chậm. Bật chế độ tiết kiệm pin cho mượt hơn? (Đổi lại được trong Cài đặt)', 'Bật', 'Để sau')) { prefs.battery = true; P.savePrefs(prefs); }
}

function computeScale() {
  const forced = Number(new URLSearchParams(location.search).get('scale'));
  if (forced > 0) return forced * dpr;
  const s = Math.min(canvas.width, canvas.height) / (12 * TS);   // cạnh ngắn thấy ~12 ô
  return dpr >= 2 ? Math.max(1, Math.round(s * 2) / 2) : Math.max(1, Math.round(s));
}
function resize() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
  canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
  scale = computeScale();
  if (state) updateCamera(0, true);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

let insets = null;
function updateCamera(dt, snap) {
  // chế độ xây dựng: camera theo điểm nhìn riêng (kéo chỗ trống để xem chỗ khác)
  const vw = canvas.width / scale, vh = canvas.height / scale, p = world.build?.focus ?? state.player;
  // Chừa chỗ cho HUD trên và thanh dưới: nhân vật nằm giữa phần màn hình còn thấy được.
  const px = v => v * dpr / scale;
  // Đo bố cục HUD tốn (buộc trình duyệt dàn trang), nên nhớ 250ms; đổi chế độ xây dựng hay cỡ màn hình thì đo lại
  const ik = `${!!world.build}${innerWidth}x${innerHeight}`, t = performance.now();
  if (!insets || insets.k !== ik || t - insets.t > 250) {
    const barTop = document.getElementById(world.build ? 'buildbar' : 'bottombar')?.getBoundingClientRect().top;
    insets = { k: ik, t, top: document.getElementById('hud')?.getBoundingClientRect().bottom || 0, bot: barTop ? innerHeight - barTop : 0 };
  }
  const topW = px(insets.top), botW = px(insets.bot);
  // camera không trôi quá đất nhà quá 2 ô (m.view); bản đồ nhỏ hơn màn hình thì nằm giữa
  const v = sceneMap(state).view;
  const fit = (t, size, a, b, lo = 0, hi = 0) => size - lo - hi >= b - a ? a + (b - a - size + hi - lo) / 2 : clamp(t, a - lo, b - size + hi);
  const tx = fit(p.x - vw / 2, vw, v.x0, v.x1);
  const ty = fit(p.y - 8 - topW - (vh - topW - botW) / 2, vh, v.y0, v.y1, topW, botW);
  if (snap) { cam.x = tx; cam.y = ty; return; }
  const k = 1 - Math.exp(-dt * 9);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
}

// ---------- API cho ui.js ----------
function changed() { dirty = true; }

function doAction(target, id) {
  if (!state || busy || fading || world.stun > 0) return;
  const pos = V.targetPos(state, target);
  if (pos) V.faceTo(state, pos.x, pos.y);
  V.cancelMove(world);
  world.input.x = world.input.y = 0;
  world.busy = true;
  busy = { target, id, t0: performance.now() };
}

function applyResult(res, target, id) {
  if (!res) return;
  const now = performance.now();
  for (const f of res.fx ?? []) world.fx.push({ ...f, t0: now });
  const evs = [];
  if (res.sound) evs.push({ type: 'sound', name: res.sound });
  else if (res.ok === false) evs.push({ type: 'sound', name: 'error' });
  if (evs.length) ui.handleEvents(evs);
  if (res.msg && (!res.ok || !res.fx?.length)) ui.toast(res.msg);
  if (res.open) ui.openPanel(res.open);
  if (res.go) goScene(res.go);
  if (res.buyStrip) askStrip(res.buyStrip);
  if (res.sleep) goSleep();
  if (res.ok && target && /pet|vuot|stroke|love/i.test(id ?? '')) {
    const key = target.kind === 'dog' ? 'dog' : target.kind === 'animal' ? 'a' + target.id : null;
    if (key) world.emotes.set(key, { icon: 'heart', until: now + 1600 });
  }
  changed();
}

// Mua đất phải xác nhận một lần
async function askStrip(dir) {
  const d = nextStrip(state, dir);
  if (!d || !await ui.confirmBox(`Mua đất phía ${DIR_NAME[dir]}? Tốn ${d.price} xu.`, 'Mua', 'Thôi')) return;
  applyResult(buyStrip(state, dir));
}

function finishAction() {
  const { target, id } = busy;
  busy = null; world.busy = false;
  if (!V.exists(state, target)) { changed(); return; }
  applyResult(perform(state, target, id), target, id);
}

function begin() {
  if (world.build) ui.showBuild(false);
  world = V.createWorld();
  busy = null; lastTargetKey = ''; curTarget = null; dirty = true;
  V.ensurePositions(state);
  updateCamera(0, true);
  ui.renderHUD(state);
  save();
}

// Lưu game. Đang trong chế độ xây dựng thì lưu bố cục lúc trước khi vào (chỉ Xong mới lưu bố cục mới).
function save() {
  if (!state) return;
  if (!world.build) { saveGame(state); return; }
  const c = structuredClone(state);
  restoreLayout(c, world.build.snap);
  saveGame(c);
}

const api = {
  getState: () => state,
  getBattery: () => prefs.battery,
  setBattery(on) { prefs.battery = !!on; P.savePrefs(prefs); },
  doAction,
  changed,
  newGame({ name, look }) {
    state = createGame({ name, look });
    begin();
  },
  buildStart() {
    if (!state || world.build || busy || fading || state.scene !== 'farm') return;   // chỉ xây dựng ở vườn
    V.cancelMove(world);
    world.build = { snap: snapLayout(state), focus: { x: state.player.x, y: state.player.y }, ghost: null, drag: null, pan: null, place: null, sel: null };
    ui.showBuild(true);
  },
  buildDone() {
    if (!world.build) return;
    world.build = null;
    ui.showBuild(false);
    saveGame(state);
    ui.toast('Đã lưu bố cục mới');
    changed();
  },
  buildCancel() {
    if (!world.build) return;
    restoreLayout(state, world.build.snap);
    world.build = null;
    ui.showBuild(false);
    saveGame(state);
    changed();
  },
  // Chọn món để đặt (what = { kind, pen?, item? }) hoặc bỏ chọn (null)
  buildPick(what) {
    const b = world.build;
    if (!b) return;
    Object.assign(b, { place: what, sel: null, drag: null, ghost: null });
    ui.buildSel(null);
    ui.buildTray(state, b);
    ui.buildMsg(what ? `Kéo ${entName(what).toLowerCase()} ra vườn để đặt` : BUILD_HINT, null);
  },
  // Cất món đang chạm về túi (đồ trang trí) hoặc bỏ đi (khối ruộng trống)
  buildStore() {
    const b = world.build;
    if (!b?.sel) return;
    const r = storeEntity(state, b.sel);
    b.sel = null; ui.buildSel(null);
    ui.buildMsg(r.msg, r.ok);
    ui.handleEvents([{ type: 'sound', name: r.ok ? 'pop' : 'error' }]);
    ui.buildTray(state, b);
    changed();
  },
  // Đi tới chỗ gần nhất có việc loại kind (không tự làm). Ở bản đồ khác thì ra cửa/cổng trước, sang vườn rồi đi tiếp.
  todoGo(kind) {
    if (!state || busy || fading || world.build || world.stun > 0) return false;
    const it = todoList(state).find(i => i.kind === kind);
    if (!it) return false;
    if (state.scene === 'farm') { plan = null; V.goToTarget(state, world, it.target, false); return true; }
    if (!sceneMap(state).doors.some(d => d.to === 'farm')) return false;
    plan = { kind, until: performance.now() + 30_000 };
    V.goToTarget(state, world, { kind: 'door', to: 'farm' });
    return true;
  },
  resetGame() {
    if (world.build) { world.build = null; ui.showBuild(false); }
    resetSave();
    state = null; busy = null; curTarget = null; lastTargetKey = '';
    ui.setTarget(null, [], '');
    ui.showCreator();
  },
};

// ---------- Chuyển bản đồ: mờ dần → đổi bản đồ (luật ở state.enterScene) → hiện dần ----------
const FADE_MS = 220;
let fading = false;
function goScene(to) {
  if (!state || fading || world.build) return;
  fading = true;
  V.cancelMove(world);
  world.busy = true; world.input.x = world.input.y = 0;
  const el = document.getElementById('fade');
  el.classList.add('on');
  setTimeout(() => {
    fading = false; world.busy = false;
    el.classList.remove('on');
    if (!state) return;
    const r = enterScene(state, to);
    if (!r.ok) { ui.toast(r.msg); return; }
    world.fx = []; world.marker = null;
    curTarget = null; lastTargetKey = ''; dirty = true;
    if (plan && state.scene === 'farm' && performance.now() < plan.until) {   // việc cần làm: về tới vườn thì đi tiếp tới chỗ gần nhất
      const it = todoList(state).find(i => i.kind === plan.kind);
      if (it) V.goToTarget(state, world, it.target, false);
    }
    plan = null;
    updateCamera(0, true);
    ui.renderHUD(state);
    save();
  }, FADE_MS);
}

// ---------- Ngủ: mờ dần, chạy mô phỏng tới sáng (luật ở state.sleep), sáng dần ----------
const SLEEP_MS = 1100;
function goSleep() {
  if (!state || fading || world.build) return;
  fading = true;
  V.cancelMove(world);
  world.busy = true; world.input.x = world.input.y = 0; world.sleeping = true;
  const el = document.getElementById('fade');
  el.classList.add('on');
  setTimeout(() => {
    fading = false; world.busy = false; world.sleeping = false;
    el.classList.remove('on');
    if (!state) return;
    const r = sleep(state);
    ui.toast(r.msg);
    if (r.ok) ui.handleEvents([{ type: 'sound', name: 'levelup' }]);
    world.fx = []; dirty = true;
    ui.renderHUD(state);
    save();
  }, SLEEP_MS);
}

// ---------- Nhập liệu: bàn phím ----------
const KEYMAP = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
const keys = new Set();
window.addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (!k || e.ctrlKey || e.metaKey || e.altKey) return;
  if (ui.isBlocking() || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)) return;
  keys.add(k); e.preventDefault();
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys.delete(k); });
window.addEventListener('blur', () => keys.clear());

// ---------- Nhập liệu: joystick ảo ----------
const joy = { x: 0, y: 0, el: null };
function setupJoystick() {
  const touchy = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || /[?&]joy=1/.test(location.search);
  if (!touchy) return;
  const st = document.createElement('style');
  st.textContent = `
    #joy-base{position:fixed;left:calc(14px + env(safe-area-inset-left,0px));bottom:calc(84px + env(safe-area-inset-bottom,0px));
      width:112px;height:112px;border-radius:50%;background:rgba(255,248,225,.28);border:3px solid rgba(90,58,26,.55);
      box-shadow:inset 0 0 12px rgba(0,0,0,.18);z-index:5;touch-action:none;user-select:none;-webkit-user-select:none}
    #joy-knob{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;
      background:radial-gradient(circle at 35% 30%,#fff3c4,#e2a93f 70%);border:3px solid #5a3a1a;box-shadow:0 3px 6px rgba(0,0,0,.35);pointer-events:none}`;
  document.head.appendChild(st);
  const base = document.createElement('div'), knob = document.createElement('div');
  base.id = 'joy-base'; knob.id = 'joy-knob';
  base.appendChild(knob); document.body.appendChild(base);
  joy.el = base;
  let pid = null;
  const set = e => {
    const r = base.getBoundingClientRect(), R_ = r.width / 2;
    let dx = (e.clientX - (r.left + R_)) / R_, dy = (e.clientY - (r.top + R_)) / R_;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    joy.x = dx; joy.y = dy;
    knob.style.transform = `translate(${dx * R_ * 0.6}px,${dy * R_ * 0.6}px)`;
  };
  const end = e => {
    if (e.pointerId !== pid) return;
    pid = null; joy.x = joy.y = 0; knob.style.transform = '';
  };
  base.addEventListener('pointerdown', e => { pid = e.pointerId; base.setPointerCapture(pid); set(e); e.preventDefault(); });
  base.addEventListener('pointermove', e => { if (e.pointerId === pid) set(e); });
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
}

// ---------- Nhập liệu: chạm / click vào bản đồ ----------
let down = null;
canvas.addEventListener('pointerdown', e => {
  if (world.build) { buildDown(e); return; }
  down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
});
canvas.addEventListener('pointermove', e => { if (world.build) buildMove(e); });
canvas.addEventListener('pointercancel', () => {
  down = null;
  if (world.build) { Object.assign(world.build, { drag: null, pan: null, ghost: null }); ui.buildMsg(BUILD_HINT, null); }
});
canvas.addEventListener('pointerup', e => {
  if (world.build) { buildUp(e); return; }
  if (!down || down.id !== e.pointerId) return;
  const ok = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12 && performance.now() - down.t < 700;
  down = null;
  if (ok) onTap(e.clientX, e.clientY);
});

function onTap(cx, cy) {
  if (!state || busy || fading || world.stun > 0 || ui.isBlocking()) return;
  plan = null;
  const r = canvas.getBoundingClientRect();
  const wx = ((cx - r.left) * dpr + view.camX) / scale, wy = ((cy - r.top) * dpr + view.camY) / scale;
  const hit = V.hitTest(state, wx, wy);
  if (!hit) { V.walkTo(state, world, wx, wy); return; }
  if (V.inRange(state, hit)) autoAct(hit);
  else V.goToTarget(state, world, hit);
}

// ---------- Chế độ xây dựng: kéo thả công trình, kéo chỗ trống để xem chỗ khác ----------
const BUILD_HINT = 'Chạm và kéo công trình để dời chỗ';
const toWorld = (cx, cy) => {
  const r = canvas.getBoundingClientRect();
  return { x: ((cx - r.left) * dpr + view.camX) / scale, y: ((cy - r.top) * dpr + view.camY) / scale };
};
function buildDown(e) {
  const b = world.build;
  if (b.drag || b.pan) return;   // ngón thứ hai: bỏ qua
  canvas.setPointerCapture?.(e.pointerId);
  const p = toWorld(e.clientX, e.clientY);
  b.sel = null; ui.buildSel(null);
  if (b.place) {   // đang cầm món mới: bóng theo ngón tay ngay từ lúc chạm
    b.drag = { pid: e.pointerId, place: b.place };
    placeGhost(b, p);
    return;
  }
  const ent = V.pickEntity(state, p.x, p.y);
  if (ent && canMove(ent)) {
    const ft = footprint(ent);
    b.drag = { pid: e.pointerId, id: ent.id, tap: true, oc: clamp(Math.floor(p.x / TS) - ent.c, 0, ft.w - 1), or: clamp(Math.floor(p.y / TS) - ent.r, 0, ft.h - 1) };
    ui.buildMsg(`Kéo ${entName(ent).toLowerCase()} tới chỗ mới`, null);
    return;
  }
  if (ent) ui.buildMsg(`${entName(ent)} không dời được`, false);
  b.pan = { pid: e.pointerId, x: e.clientX, y: e.clientY };
}
function buildMove(e) {
  const b = world.build, d = b.drag;
  if (d?.place && d.pid === e.pointerId) { placeGhost(b, toWorld(e.clientX, e.clientY)); return; }
  if (d?.pid === e.pointerId) {
    d.tap = false;
    const ent = state.farm.ents.find(x => x.id === d.id), p = toWorld(e.clientX, e.clientY);
    const c = Math.floor(p.x / TS) - d.oc, r = Math.floor(p.y / TS) - d.or;
    if (!ent || (b.ghost ? b.ghost.c === c && b.ghost.r === r : c === ent.c && r === ent.r)) return;
    const ft = footprint(ent), chk = canPlace(state, { id: d.id }, c, r);
    b.ghost = { id: d.id, c, r, w: ft.w, h: ft.h, ok: chk.ok, reason: chk.reason ?? null };
    ui.buildMsg(chk.ok ? 'Thả ra để đặt ở đây' : chk.msg, chk.ok);
  } else if (b.pan?.pid === e.pointerId) {
    const v = mapOf(state).view;
    b.focus.x = clamp(b.focus.x - (e.clientX - b.pan.x) * dpr / scale, v.x0, v.x1);
    b.focus.y = clamp(b.focus.y - (e.clientY - b.pan.y) * dpr / scale, v.y0, v.y1);
    b.pan.x = e.clientX; b.pan.y = e.clientY;
  }
}
function buildUp(e) {
  const b = world.build;
  if (b.pan?.pid === e.pointerId) b.pan = null;
  if (b.drag?.pid !== e.pointerId) return;
  const g = b.ghost, d = b.drag;
  b.drag = null; b.ghost = null;
  if (d.tap && !g) {   // chạm không kéo: chọn món, hiện nút Cất nếu cất được
    const ent = state.farm.ents.find(x => x.id === d.id);
    if (ent && (ent.kind === 'deco' || ent.kind === 'field')) { b.sel = ent.id; ui.buildSel(entName(ent)); }
    ui.buildMsg(BUILD_HINT, null);
    return;
  }
  if (!g) { ui.buildMsg(b.place ? `Kéo ${entName(b.place).toLowerCase()} ra vườn để đặt` : BUILD_HINT, null); return; }
  const r = d.place ? placeEntity(state, d.place, g.c, g.r) : moveEntity(state, g.id, g.c, g.r);
  ui.buildMsg(r.msg || BUILD_HINT, r.ok ? true : false);
  ui.handleEvents([{ type: 'sound', name: r.ok ? 'pop' : 'error' }]);
  if (d.place) {
    const w = d.place;   // đặt xong mà không đặt thêm được (hết đồ, đủ khối, đã có chuồng): bỏ chọn
    if (r.ok && (w.kind === 'pen' || (w.kind === 'deco' && !canAfford(state, w).ok) || (w.kind === 'field' && fieldCount(state) >= fieldLimit(state)))) b.place = null;
    ui.buildTray(state, b);
  }
  changed();
}
// Bóng của món mới theo con trỏ: tâm khối nằm dưới ngón tay
function placeGhost(b, p) {
  const what = b.place, ft = footprint(what);
  const c = Math.floor(p.x / TS) - Math.floor(ft.w / 2), r = Math.floor(p.y / TS) - Math.floor(ft.h / 2);
  if (b.ghost?.c === c && b.ghost?.r === r) return;
  const chk = canPlace(state, what, c, r), aff = chk.ok ? canAfford(state, what) : chk, ok = chk.ok && aff.ok;
  b.ghost = { id: null, what, c, r, w: ft.w, h: ft.h, ok, reason: aff.reason ?? null };
  ui.buildMsg(ok ? 'Thả ra để đặt ở đây' : aff.msg, ok);
}

// Tự làm hành động chính của target (không tự chọn hành động phụ như Bán)
function autoAct(target) {
  const main = actionsFor(state, target)?.[0];
  if (!main) return;
  if (main.disabled) { ui.toast(main.disabled); return; }
  doAction(target, main.id);
}

// ---------- Vòng lặp ----------
function syncTarget(now) {
  const t = V.findTarget(state, world);
  curTarget = t;
  const tk = t ? V.keyOf(t) : '';
  if (!dirty && tk === lastTargetKey && now - lastActions < 120) return;
  lastActions = now; dirty = false;
  const acts = t ? actionsFor(state, t) : [];
  const key = JSON.stringify([t, acts, t ? V.nameOf(state, t) : '']);
  lastTargetKey = tk;
  if (key !== syncTarget.key) {
    syncTarget.key = key;
    ui.setTarget(t, acts, t ? V.nameOf(state, t) : '');
  }
}
syncTarget.key = '';

function frame(now) {
  requestAnimationFrame(frame);
  if (prefs.battery && now - last < 1000 / P.BATTERY_FPS - 8) return;   // tiết kiệm pin: khóa 30 khung hình (bỏ qua một nhịp màn 60Hz)
  const dtMs = Math.min(100, now - last); if (state) fps.push(now - last); last = now;
  if (!state) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#25491a'; ctx.fillRect(0, 0, canvas.width, canvas.height); return; }
  const dt = dtMs / 1000;
  if (!hintDone && fps.elapsed >= P.SUGGEST_AFTER_MS && !ui.isBlocking()) {   // đo đủ 10 giây: chỉ xét một lần
    hintDone = true;
    if (P.shouldSuggestBattery(fps, prefs)) suggestBattery();
  }
  world.view = { x0: cam.x - 40, y0: cam.y - 40, x1: cam.x + canvas.width / scale + 40, y1: cam.y + canvas.height / scale + 40 };

  // 1-2) thời gian game
  const events = tick(state, dtMs * (state.speed || 1)) ?? [];

  // 3) nhập liệu → di chuyển, AI
  if (ui.isBlocking()) { keys.clear(); world.input.x = world.input.y = 0; }
  else {
    const kx = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0), ky = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
    world.input.x = kx || joy.x; world.input.y = ky || joy.y;
    if (plan && (world.input.x || world.input.y)) plan = null;   // tự đi bằng tay thì bỏ kế hoạch
  }
  const res = V.update(state, world, dt);
  for (const r of res.results) applyResult(r);
  if (busy && now - busy.t0 >= actionMs()) finishAction();
  if (res.arrived && !busy) autoAct(res.arrived);
  if (res.door) goScene(res.door.to);

  // 4) target
  syncTarget(now);

  // 5) vẽ
  updateCamera(dt, false);
  view = { camX: Math.round(cam.x * scale), camY: Math.round(cam.y * scale) };
  world.fx = world.fx.filter(f => now - f.t0 < 1500);
  if (state.scene === 'farm') for (const e of events) if (e.type === 'fx') world.fx.push({ text: e.text, color: e.color, x: e.x, y: e.y, t0: now });
  R.render(ctx, {
    state, w: world, cam, scale, width: canvas.width, height: canvas.height, dpr, now,
    target: curTarget ? { target: curTarget } : null,
    busy: busy ? clamp((now - busy.t0) / actionMs(), 0, 1) : null,
    fx: world.fx, battery: prefs.battery, quality: P.particleBudget(fps.fps),
  });

  // 6) sự kiện cho UI, HUD, lưu
  const forUI = events.filter(e => e.type === 'sound' || ['important', 'direct'].includes(eventMeta(e)?.level));
  if (forUI.length) ui.handleEvents(forUI);
  ui.updateAlerts(state, (x, y) => ({ x: (x * scale - view.camX) / dpr, y: (y * scale - view.camY) / dpr }), now);
  if (now - lastHud > 250) { lastHud = now; ui.renderHUD(state); }
  if (joy.el) joy.el.style.display = ui.isBlocking() ? 'none' : '';
  if (now - lastSave > 5000) { lastSave = now; save(); }
}

document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);

// ---------- Khởi động ----------
resize();
setupJoystick();
ui.initUI(api);
state = loadGame();
if (state) {
  begin();
  const away = state.away; delete state.away;   // chỉ hiện một lần, không lưu lại
  ui.showAway(away);
} else {
  ui.showCreator();
  if (loadProblem()) ui.toast('Không đọc được bản lưu cũ, bản cũ vẫn được giữ nguyên. Bạn có thể bắt đầu vườn mới.');
}
globalThis.__farm = { get state() { return state; }, get world() { return world; }, get scale() { return scale; }, get view() { return view; }, get dpr() { return dpr; },
  get perf() { return { chunksDrawn: R.chunkStats().drawn, fps: fps.avg, fpsNow: fps.fps, measured: fps.elapsed, battery: prefs.battery, hinted: prefs.hinted }; } };
requestAnimationFrame(t => { last = t; lastSave = t; requestAnimationFrame(frame); });
