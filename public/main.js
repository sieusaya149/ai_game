// Khởi động game, vòng lặp, camera, nhập liệu (bàn phím, chạm, joystick) và cầu nối giữa state/ui/world/render.
import { loadGame, loadProblem, saveGame, createGame, resetGame as resetSave, tick, actionsFor, perform, mapOf } from './state.js';
import * as ui from './ui.js';
import { TS } from './layout.js';
import * as R from './render.js';
import * as V from './world.js';

const ACTION_MS = 350;
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
let lastHud = 0, lastActions = 0, lastSave = 0, last = performance.now();

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

function updateCamera(dt, snap) {
  const vw = canvas.width / scale, vh = canvas.height / scale, p = state.player;
  // Chừa chỗ cho HUD trên và thanh dưới: nhân vật nằm giữa phần màn hình còn thấy được.
  const px = v => v * dpr / scale;
  const topW = px(document.getElementById('hud')?.getBoundingClientRect().bottom || 0);
  const barTop = document.getElementById('bottombar')?.getBoundingClientRect().top;
  const botW = px(barTop ? innerHeight - barTop : 0);
  // camera không trôi quá đất nhà quá 2 ô (m.view)
  const v = mapOf(state).view;
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
  if (!state || busy || world.stun > 0) return;
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
  if (res.ok && target && /pet|vuot|stroke|love/i.test(id ?? '')) {
    const key = target.kind === 'dog' ? 'dog' : target.kind === 'animal' ? 'a' + target.id : null;
    if (key) world.emotes.set(key, { icon: 'heart', until: now + 1600 });
  }
  changed();
}

function finishAction() {
  const { target, id } = busy;
  busy = null; world.busy = false;
  if (!V.exists(state, target)) { changed(); return; }
  applyResult(perform(state, target, id), target, id);
}

function begin() {
  world = V.createWorld();
  busy = null; lastTargetKey = ''; curTarget = null; dirty = true;
  V.ensurePositions(state);
  updateCamera(0, true);
  ui.renderHUD(state);
  saveGame(state);
}

const api = {
  getState: () => state,
  doAction,
  changed,
  newGame({ name, look }) {
    state = createGame({ name, look });
    begin();
  },
  resetGame() {
    resetSave();
    state = null; busy = null; curTarget = null; lastTargetKey = '';
    ui.setTarget(null, [], '');
    ui.showCreator();
  },
};

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
canvas.addEventListener('pointerdown', e => { down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointercancel', () => { down = null; });
canvas.addEventListener('pointerup', e => {
  if (!down || down.id !== e.pointerId) return;
  const ok = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12 && performance.now() - down.t < 700;
  down = null;
  if (ok) onTap(e.clientX, e.clientY);
});

function onTap(cx, cy) {
  if (!state || busy || world.stun > 0 || ui.isBlocking()) return;
  const r = canvas.getBoundingClientRect();
  const wx = ((cx - r.left) * dpr + view.camX) / scale, wy = ((cy - r.top) * dpr + view.camY) / scale;
  const hit = V.hitTest(state, wx, wy);
  if (!hit) { V.walkTo(state, world, wx, wy); return; }
  if (V.inRange(state, hit)) autoAct(hit);
  else V.goToTarget(state, world, hit);
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
  const dtMs = Math.min(100, now - last); last = now;
  if (!state) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#25491a'; ctx.fillRect(0, 0, canvas.width, canvas.height); return; }
  const dt = dtMs / 1000;

  // 1-2) thời gian game
  const events = tick(state, dtMs * (state.speed || 1)) ?? [];

  // 3) nhập liệu → di chuyển, AI
  if (ui.isBlocking()) { keys.clear(); world.input.x = world.input.y = 0; }
  else {
    const kx = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0), ky = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
    world.input.x = kx || joy.x; world.input.y = ky || joy.y;
  }
  const res = V.update(state, world, dt);
  for (const r of res.results) applyResult(r);
  if (busy && now - busy.t0 >= ACTION_MS) finishAction();
  if (res.arrived && !busy) autoAct(res.arrived);

  // 4) target
  syncTarget(now);

  // 5) vẽ
  updateCamera(dt, false);
  view = { camX: Math.round(cam.x * scale), camY: Math.round(cam.y * scale) };
  world.fx = world.fx.filter(f => now - f.t0 < 1500);
  for (const e of events) if (e.type === 'fx') world.fx.push({ text: e.text, color: e.color, x: e.x, y: e.y, t0: now });
  R.render(ctx, {
    state, w: world, cam, scale, width: canvas.width, height: canvas.height, dpr, now,
    target: curTarget ? { target: curTarget } : null,
    busy: busy ? clamp((now - busy.t0) / ACTION_MS, 0, 1) : null,
    fx: world.fx,
  });

  // 6) sự kiện cho UI, HUD, lưu
  const forUI = events.filter(e => e.type === 'toast' || e.type === 'levelup' || e.type === 'achievement' || e.type === 'sound');
  if (forUI.length) ui.handleEvents(forUI);
  if (now - lastHud > 250) { lastHud = now; ui.renderHUD(state); }
  if (joy.el) joy.el.style.display = ui.isBlocking() ? 'none' : '';
  if (now - lastSave > 5000) { lastSave = now; saveGame(state); }
}

document.addEventListener('visibilitychange', () => { if (document.hidden && state) saveGame(state); });
window.addEventListener('pagehide', () => { if (state) saveGame(state); });

// ---------- Khởi động ----------
resize();
setupJoystick();
ui.initUI(api);
state = loadGame();
if (state) begin();
else {
  ui.showCreator();
  if (loadProblem()) ui.toast('Không đọc được bản lưu cũ, bản cũ vẫn được giữ nguyên. Bạn có thể bắt đầu vườn mới.');
}
globalThis.__farm = { get state() { return state; }, get world() { return world; }, get scale() { return scale; }, get view() { return view; }, get dpr() { return dpr; } };
requestAnimationFrame(t => { last = t; lastSave = t; requestAnimationFrame(frame); });
