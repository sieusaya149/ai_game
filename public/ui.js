// Giao diện: HUD, nút hành động, các bảng, tạo nhân vật, hướng dẫn.
import * as S from './state.js';
import * as art from './art.js';
import * as D from './data.js';
import * as sound from './sound.js';
import { SPR2 } from './art2.js';
import { createNotifier, arrowTargets, arrowFor } from './notify.js';
import { todoList } from './todo.js';
import { drawMini } from './minimap.js';
import * as net from './net.js';

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n || 0).toLocaleString('vi-VN');
const MIN = 60_000;

// ---------- Tiện ích DOM ----------
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
      else if (k in e) { try { e[k] = v; } catch { e.setAttribute(k, v); } }
      else e.setAttribute(k, v);
    }
  }
  const add = k => {
    if (k == null || k === false) return;
    if (Array.isArray(k)) k.forEach(add);
    else e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  };
  kids.forEach(add);
  return e;
}
const btn = (label, onClick, cls = '', extra = {}) => h('button', { class: 'btn ' + cls, type: 'button', on: { click: onClick }, ...extra }, label);

// ---------- Biểu tượng (art.icon, không có thì dùng emoji) ----------
const EMOJI = {
  cai: '🥬', carot: '🥕', lua: '🌾', cachua: '🍅', bap: '🌽', dau: '🍓', bingo: '🎃', duahau: '🍉',
  trung: '🥚', sua: '🥛', len: '🧶', pesticide: '🧴', growth: '🧪', fertilizer: '🌿', medicine: '💉', vitamin: '💊',
  feed_ga: '🌽', feed_heo: '🥣', hay: '🌾', dogfood: '🦴',
  deco_scarecrow: '🧑‍🌾', deco_flower: '🌸', deco_lamp: '🏮', deco_bench: '🪑',
  wood: '🪵', stone: '🪨',
  ga: '🐔', heo: '🐖', bo: '🐄', cuu: '🐑', dog: '🐕',
};
const iconCache = new Map();
function iconUrl(key) {
  if (iconCache.has(key)) return iconCache.get(key);
  let u = null;
  try { u = art.icon(key) || null; } catch { u = null; }
  if (!u) try { u = SPR2?.[key]?.toDataURL?.() || null; } catch { u = null; }   // vật phẩm chỉ có icon trong art2 (gỗ, đá)
  iconCache.set(key, u);
  return u;
}
function emojiFor(key) {
  if (EMOJI[key]) return EMOJI[key];
  if (key.startsWith('seed_')) return '🌱';
  return '📦';
}
function ico(key, cls = '') {
  const u = iconUrl(key);
  return u ? h('img', { class: 'ico ' + cls, src: u, alt: '', draggable: false }) : h('span', { class: 'ico emo ' + cls }, emojiFor(key));
}
// Icon của hành động có thể là emoji hoặc khóa vật phẩm
const isKey = s => typeof s === 'string' && /^[a-z][a-z_0-9]+$/i.test(s);
const actIcon = s => (isKey(s) ? ico(s) : h('span', { class: 'ico emo' }, s || '✋'));
const itemLabel = k => D.itemName(k);

// ---------- Trạng thái UI ----------
let api = null;
let panel = null;            // id bảng đang mở
const tabs = { market: 'seed', house: 'wardrobe' };
let marketWasOpen = true;    // chợ đang mở lúc vẽ bảng lần gần nhất, để vẽ lại khi chợ đóng/mở giữa chừng
let wardLook = null;         // ngoại hình đang xem thử trong tủ đồ
let cur = { target: null, actions: [], name: '' };
let creatorOpen = false, celebOpen = false, awayOpen = false, dialogResolve = null;
const celebQueue = [];
const flags = { sold: false, bought: false };
const st = () => api.getState();
const level = s => S.levelInfo(s.exp).level;
const have = (s, k) => S.haveItem(s, k);   // giỏ + kho

const typing = el => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
// Nhãn từ state.js đã kèm icon ở đầu; bỏ đi vì nút đã vẽ icon riêng.
const bareLabel = a => a.icon && a.label.startsWith(a.icon) ? a.label.slice(a.icon.length).trim() : a.label;

export function isBlocking() {
  return !!panel || creatorOpen || celebOpen || awayOpen || newsOpen || !!dialogResolve || building || typing(document.activeElement);
}

// ---------- Chế độ xây dựng (main.js lo kéo thả, ở đây chỉ bật/tắt giao diện) ----------
let building = false;
export function showBuild(on) {
  building = on;
  document.body.classList.toggle('building', on);
  $('buildbar').hidden = !on;
  $('bb-build').classList.toggle('on', on);
  if (on) { buildMsg('Chạm và kéo công trình để dời chỗ', null); buildSel(null); buildTray(st(), null); }
}
// Khay đồ đặt được: tab Khối ruộng / Chuồng / Đồ trang trí. b = world.build (b.place = món đang chọn)
let trayTab = 'field';
const samePick = (a, b) => !!a && !!b && a.kind === b.kind && a.pen === b.pen && a.item === b.item;
export function buildTray(s, b) {
  if (!building) return;
  const pick = b?.place ?? null, cards = [];
  const card = (what, icon, name, sub, off) => h('button', {
    class: 'bt-card' + (samePick(pick, what) ? ' on' : ''), type: 'button', disabled: !!off,
    on: { click: () => api.buildPick(samePick(pick, what) ? null : what) },
  }, icon, h('b', {}, name), h('small', {}, sub));
  let empty = '';
  if (trayTab === 'field') {
    const n = S.fieldCount(s), max = S.fieldLimit(s), nx = S.fieldNextLevel(s), full = n >= max;
    cards.push(card({ kind: 'field' }, h('span', { class: 'ico emo' }, '🟫'), `Khối ruộng ${n}/${max}`,
      full ? (nx ? `Cấp ${nx} để có thêm` : 'Đã tối đa') : S.fieldCost(s) ? `🪙 ${fmt(S.fieldCost(s))}` : 'Miễn phí', full));
  } else if (trayTab === 'pen') {
    const have = new Set(s.farm.ents.filter(e => e.kind === 'pen').map(e => e.pen));
    for (const pen of Object.keys(D.PEN_PRICES)) {
      if (have.has(pen)) continue;
      const lv = S.penLevel(pen), low = level(s) < lv;
      cards.push(card({ kind: 'pen', pen }, ico({ chicken: 'ga', pig: 'heo', pasture: 'bo' }[pen]), PEN_NAME2[pen], low ? `Cần cấp ${lv}` : `🪙 ${fmt(D.PEN_PRICES[pen])}`, low));
    }
    empty = 'Bạn đã có đủ các loại chuồng rồi.';
  } else {
    for (const k of Object.keys(s.inv || {})) if (s.inv[k] > 0 && D.ITEMS[k]?.kind === 'deco') cards.push(card({ kind: 'deco', item: k }, ico(k), D.ITEMS[k].name, `Có ×${s.inv[k]}`));
    empty = 'Chưa có đồ trang trí. Mua ở Chợ Bà Tư nhé.';
  }
  const tab = (id, label) => h('button', { class: 'bt-tab' + (trayTab === id ? ' on' : ''), type: 'button', on: { click: () => { trayTab = id; api.buildPick(null); } } }, label);
  $('build-tray').replaceChildren(
    h('div', { class: 'bt-tabs' }, tab('field', 'Ruộng'), tab('pen', 'Chuồng'), tab('deco', 'Trang trí')),
    cards.length ? h('div', { class: 'bt-list' }, cards) : h('div', { class: 'bt-empty' }, empty));
}
const PEN_NAME2 = { chicken: 'Chuồng gà', pig: 'Chuồng heo', pasture: 'Đồng cỏ bò cừu' };
// Nút Cất cho món đang chạm (label = tên món, null = ẩn)
export function buildSel(label) {
  const b = $('build-store');
  b.hidden = !label;
  if (label) b.textContent = `Cất ${label.toLowerCase()}`;
}
// ok: true = đặt được (xanh), false = không được (đỏ), null = gợi ý
export function buildMsg(text, ok) {
  const el = $('build-msg');
  el.textContent = text;
  if (ok == null) delete el.dataset.ok; else el.dataset.ok = ok ? '1' : '0';
}

function commit() {
  api.changed();
  renderHUD(st());
  refreshPanel();
}
// Kết quả của hàm state.js: toast thông báo + tiếng
function res(r, okSound) {
  if (!r) return r;
  if (r.msg) pushToast(r.msg, r.ok ? '' : 'bad');
  if (r.ok && okSound) sound.play(okSound);
  if (!r.ok) sound.play('error');
  commit();
  return r;
}

// ---------- Toast ----------
// key: toast gộp. Cùng key thì đổi chữ và chạy lại thời gian hiện thay vì thêm toast mới.
function pushToast(text, cls = '', key = '') {
  const box = $('toasts');
  if (!box || !text) return;
  const old = key && [...box.children].find(c => c.dataset.key === key);
  if (old) {
    old.textContent = text;
    old.style.animation = 'none'; void old.offsetWidth; old.style.animation = '';
    clearTimeout(old._t); old._t = setTimeout(() => old.remove(), 2800);
    return;
  }
  const dup = [...box.children].find(c => c.textContent === text);
  if (dup) dup.remove();
  const t = h('div', { class: 'toast ' + cls }, text);
  if (key) t.dataset.key = key;
  box.append(t);
  while (box.children.length > 3) box.firstChild.remove();
  t._t = setTimeout(() => t.remove(), 2800);
}
// 🟡 toast nhỏ, tự gộp cùng khóa; loại nào tắt trong cài đặt (s.notify) thì bỏ qua
const notifier = createNotifier({ show: (id, text) => pushToast(text, '', 'n' + id), on: cat => !cat || S.notifyOn(st(), cat) });
export function toast(text) { pushToast(text); }

// ---------- Hộp xác nhận ----------
export function confirmBox(text, yes = 'Đồng ý', no = 'Thôi', danger = false) {
  return new Promise(resolve => {
    const root = $('dialog-root');
    const done = v => { root.hidden = true; root.replaceChildren(); dialogResolve = null; resolve(v); };
    dialogResolve = done;
    root.replaceChildren(h('div', { class: 'dialog' },
      h('div', { class: 'dialog-text' }, text),
      h('div', { class: 'dialog-btns' },
        btn(no, () => done(false), 'plain'),
        btn(yes, () => done(true), danger ? 'red' : 'green'))));
    root.hidden = false;
  });
}

// ---------- Xem trước nhân vật ----------
function makePreview(getLook, scale = 6) {
  const c = h('canvas', { class: 'preview', width: 16, height: 24 });
  c.style.width = 16 * scale + 'px';
  c.style.height = 24 * scale + 'px';
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const DIRS = [0, 2, 3, 1];
  let t = 0, iv;
  const draw = () => {
    if (t > 3 && !c.isConnected) return clearInterval(iv);
    try {
      const frames = art.character(getLook());
      const d = DIRS[Math.floor(t / 10) % 4];
      g.clearRect(0, 0, 16, 24);
      g.drawImage(frames[d][[0, 1, 0, 2][t % 4]], 0, 0);
    } catch { /* art chưa sẵn sàng */ }
    t++;
  };
  iv = setInterval(draw, 170);
  draw();
  return c;
}
function thumb(look) {
  const c = h('canvas', { class: 'thumb', width: 16, height: 24 });
  try { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(art.character(look)[0][0], 0, 0); } catch {}
  return c;
}

// Bộ chọn ngoại hình dùng chung cho màn tạo nhân vật và tủ đồ
const LOOK_KEYS = ['skin', 'hair', 'hairColor', 'shirt', 'pants', 'hat', 'acc'];
const lookCount = k => (k === 'hat' ? D.HATS.length : k === 'acc' ? D.ACCS.length : D.LOOK[k]);
function lookValueText(k, i) {
  if (k === 'hat') return D.HATS[i]?.name ?? '?';
  if (k === 'acc') return D.ACCS[i]?.name ?? '?';
  return `${i + 1}/${lookCount(k)}`;
}
function lookEditor(look, allowed, onChange, extra) {
  const wrap = h('div', { class: 'look-editor' });
  const vals = {};
  wrap.sync = () => { for (const k of LOOK_KEYS) vals[k].textContent = lookValueText(k, look[k]); };
  for (const k of LOOK_KEYS) {
    const list = allowed(k);
    const val = vals[k] = h('span', { class: 'le-val' }, lookValueText(k, look[k]));
    const step = dir => {
      const i = list.indexOf(look[k]);
      look[k] = list[(i + dir + list.length) % list.length];
      val.textContent = lookValueText(k, look[k]);
      sound.play('pop');
      onChange(k);
    };
    const off = list.length < 2;
    wrap.append(h('div', { class: 'le-row' },
      h('span', { class: 'le-lbl' }, D.LOOK_NAMES[k]),
      btn('◀', () => step(-1), 'sm', { disabled: off }),
      val,
      btn('▶', () => step(1), 'sm', { disabled: off }),
      extra?.(k)));
  }
  return wrap;
}

// ---------- HUD ----------
let lastAvatar = '';
const memo = new Map();
function setText(id, v) {
  if (memo.get(id) === v) return;
  memo.set(id, v);
  const e = $(id);
  if (e) e.textContent = v;
}
function drawAvatar(look) {
  const key = JSON.stringify(look);
  if (key === lastAvatar) return;
  try {
    const src = art.character(look)[0][0];
    const c = $('hud-avatar'), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(src, 0, 0, 16, 15, 0, 0, 44, 41); // đầu + vai, phóng to
    lastAvatar = key;
  } catch { /* chờ art */ }
}
const WEATHER = { sun: '☀️', cloud: '⛅', rain: '🌧️' };

export function renderHUD(s) {
  if (!s || !api) return;
  const li = S.levelInfo(s.exp);
  setText('hud-name', s.name);
  setText('hud-level', 'Cấp ' + li.level);
  setText('hud-exp-text', `${li.cur}/${li.need}`);
  const bar = $('hud-exp'), pct = Math.min(100, (li.cur / li.need) * 100) + '%';
  if (bar.style.width !== pct) bar.style.width = pct;
  drawAvatar(s.look);
  const stam = Math.round(s.stamina ?? D.STAMINA.max), tired = stam <= 0;   // thanh thể lực
  setText('hud-stam-text', String(stam));
  const sb = $('hud-stam'), sp = (stam / D.STAMINA.max) * 100 + '%';
  if (sb.style.width !== sp) sb.style.width = sp;
  if (memo.get('hud-tired') !== tired) {
    memo.set('hud-tired', tired);
    $('hud-stamina').classList.toggle('tired', tired);
    const ic = SPR2?.[tired ? 'staminaTired' : 'stamina'], cx = $('hud-stam-ico').getContext('2d');
    cx.clearRect(0, 0, 12, 12);
    if (ic) cx.drawImage(ic, 0, 0);
  }
  $('bb-build').style.display = s.scene && s.scene !== 'farm' ? 'none' : '';   // chế độ xây dựng chỉ có ở vườn
  renderMini(s);

  const coinsTxt = fmt(s.coins);
  if (memo.get('hud-coins-n') !== coinsTxt) {
    const prev = memo.get('hud-coins-n');
    setText('hud-coins-n', coinsTxt);
    if (prev != null) { const c = $('hud-coins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  }
  let clock = '';
  try { clock = S.clockText(s); } catch { clock = ''; }
  if (!/Ngày/i.test(clock)) clock = `Ngày ${s.day} · ${clock}`;
  setText('hud-time', clock);
  const se = S.seasonOf(s);
  if (memo.get('hud-season') !== se.key) {
    memo.set('hud-season', se.key);
    setText('hud-season', se.name);
    const ic = SPR2?.season?.[se.key], cx = $('hud-season-ico').getContext('2d');
    cx.clearRect(0, 0, 12, 12);
    if (ic) cx.drawImage(ic, 0, 0);
  }
  $('hud-clock').title = `Mùa ${se.name}, ngày ${se.dayIn}/7`;
  let night = false;
  try { night = S.isNight(s); } catch {}
  setText('hud-weather', (night ? '🌙' : '') + (night && s.weather !== 'rain' ? '' : WEATHER[s.weather] || '☀️'));
  setText('hud-can', `${s.can}/${S.canMax(s)}`);
  setText('hud-basket-n', `${S.basketCount(s)}/${S.basketCap(s)}`);
  $('hud-basket').classList.toggle('full', S.basketCount(s) >= S.basketCap(s));
  if (panel === 'smithy') {   // rèn xong giữa chừng thì vẽ lại bảng; còn không thì chỉ đổi đồng hồ đếm
    if (smithKey !== JSON.stringify([s.smith, s.tools])) refreshPanel(); else if ($('smith-left')) $('smith-left').textContent = smithLeft(s);
  }
  $('hud-water').classList.toggle('empty', s.can <= 0);
  setText('hud-speed', `⏩ x${s.speed || 1}`);

  // Túi hạt đang chọn
  const seedKey = 'seed_' + s.selectedSeed;
  const seedBtn = $('bb-seed');
  if (seedBtn.dataset.k !== seedKey) {
    seedBtn.dataset.k = seedKey;
    seedBtn.querySelector('.bb-ico').replaceChildren(ico(seedKey));
  }
  const n = have(s, seedKey);
  setText('bb-seed-n', n > 99 ? '99+' : String(n));
  $('bb-seed-n').classList.toggle('zero', n <= 0);

  // Chấm đỏ đơn giao được
  $('dot-board').hidden = !(s.orders || []).some(o => Object.entries(o.items).every(([k, q]) => have(s, k) >= q));

  updateTutorial(s);
  if (panel === 'market' && S.marketOpen(s) !== marketWasOpen) refreshPanel();   // chợ vừa đóng/mở cửa khi đang xem
}

// ---------- Hướng dẫn nhanh ----------
// Luật chuyển bước nằm ở S.TUTORIAL / S.advanceTutorial; ở đây chỉ có lời nhắn theo bước (có thể đổi theo tình hình).
const TUT = S.TUTORIAL.length;
const TUT_TEXT = {
  till: () => 'Đi tới ruộng (góc trên phải) rồi bấm Cuốc đất.',
  plant: () => 'Gieo hạt cải xuống ô đất vừa cuốc.',
  water: () => 'Tưới nước cho cây. Hết nước thì ra giếng múc.',
  harvest: s => {
    const live = s.plots.filter(p => p.crop && !p.crop.dead && !p.crop.rotten);
    if (live.some(p => p.crop.progress >= 1)) return 'Cây chín rồi! Bấm Thu hoạch.';
    if (!live.length) return 'Chưa có cây nào đang lớn. Cuốc đất rồi gieo hạt lại nhé.';
    if (live.some(p => p.crop.bugs || p.crop.sick)) return 'Cây có sâu! Bấm Bắt sâu hoặc xịt thuốc trừ sâu cho cây.';
    if (live.every(p => p.water <= 0)) return 'Cây khô nước rồi, tưới thêm cho cây lớn nhé.';
    return 'Đợi cây lớn. Sốt ruột thì bật x5 trong ⚙️ Cài đặt.';
  },
  ship: () => 'Bỏ nông sản vào thùng giao hàng cạnh nhà kho. 6h sáng mai lái buôn trả xu.',
  buy: s => (S.marketOpen(s) ? 'Ra cổng vườn tới làng, ghé chợ Bà Tư mua hạt giống.' : 'Chợ Bà Tư đóng cửa rồi. 6h sáng mai ra làng mua hạt giống nhé.'),
  sleep: s => (S.canSleep(s) ? 'Về nhà, bấm giường để ngủ. Sáng mai thể lực đầy lại.' : `Tối nay ${D.STAMINA.sleepHour}h về nhà ngủ nhé. Sốt ruột thì bật x5 hoặc x20 trong ⚙️ Cài đặt.`),
};
let shownKey = '';
function updateTutorial(s) {
  const box = $('tutorial');
  if (!box) return;
  const was = Number.isFinite(s.tutorial) ? s.tutorial : 0;
  if (S.advanceTutorial(s)) {
    if (s.tutorial >= TUT && was < TUT) pushToast('Bạn đã thành thạo việc nhà nông rồi!');
    else if (shownKey) sound.play('pop');
  }
  const step = s.tutorial;
  if (step >= TUT) { box.hidden = true; shownKey = 'done'; return; }
  const text = TUT_TEXT[S.TUTORIAL[step].id](s), key = step + text;
  if (shownKey === key && !box.hidden) return;
  shownKey = key;
  box.hidden = false;
  box.replaceChildren(
    h('div', { class: 'tut-step' }, `Bước ${step + 1}/${TUT}`),
    h('div', { class: 'tut-text' }, text),
    h('button', { class: 'tut-x', type: 'button', title: 'Bỏ qua hướng dẫn', on: { click: () => { st().tutorial = TUT; updateTutorial(st()); } } }, '✕'));
  box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
}

// ---------- Nút hành động ----------
function runAction(a) {
  if (!a || !cur.target) return;
  if (a.disabled) { pushToast(String(a.disabled), 'bad'); sound.play('error'); return; }
  api.doAction(cur.target, a.id);
}
export function setTarget(target, actions, name) {
  cur = { target, actions: actions || [], name: name || '' };
  const main = $('main-action'), chips = $('chips'), nm = $('target-name');
  if (!target || !cur.actions.length) {
    main.hidden = true; chips.replaceChildren(); nm.hidden = !(target && name);
    if (!nm.hidden) nm.textContent = name;
    return;
  }
  nm.hidden = !name;
  nm.textContent = name || '';
  const a = cur.actions[0];
  main.hidden = false;
  main.classList.toggle('disabled', !!a.disabled);
  main.querySelector('.ma-icon').replaceChildren(actIcon(a.icon));
  main.querySelector('.ma-label').textContent = bareLabel(a);
  main.title = a.disabled || a.label;
  chips.replaceChildren(...cur.actions.slice(1, 7).map((c, i) => h('button', {
    class: 'chip nosound' + (c.disabled ? ' disabled' : ''), type: 'button', title: c.disabled || c.label,
    on: { click: () => runAction(c) },
  }, actIcon(c.icon), h('span', { class: 'chip-lbl' }, bareLabel(c)), h('kbd', {}, String(i + 1)))));
}

// ---------- Khung bảng ----------
const PANELS = {};
function shell(title) {
  const coins = h('span', { class: 'sheet-coins', id: 'sheet-coins' });
  return h('section', { class: 'sheet', role: 'dialog' },
    h('header', { class: 'sheet-head' },
      h('h2', {}, title), coins,
      h('button', { class: 'btn red sm nosound close', type: 'button', title: 'Đóng (Esc)', on: { click: closePanel } }, '✕')),
    h('div', { class: 'sheet-body', id: 'sheet-body' }));
}
export function openPanel(id) {
  if (!api || !PANELS[id]) return;
  if (creatorOpen) return;
  if (id === 'house') { wardLook = null; tabs.house = 'wardrobe'; }   // mở từ tủ đồ trong nhà
  panel = id;
  const root = $('panel-root');
  root.replaceChildren(h('div', { class: 'backdrop', on: { click: closePanel } }), shell(PANELS[id].title));
  root.hidden = false;
  refreshPanel();
  sound.play('pop');
}
function closePanel() {
  if (!panel) return;
  panel = null;
  $('panel-root').hidden = true;
  $('panel-root').replaceChildren();
  wardLook = null;
}
function refreshPanel() {
  if (!panel) return;
  const body = $('sheet-body');
  if (!body) return;
  const top = body.scrollTop;
  const s = st();
  $('sheet-coins').textContent = '🪙 ' + fmt(s.coins);
  const keep = body.querySelector('.tabs')?.scrollLeft || 0;
  body.replaceChildren();
  PANELS[panel].render(body, s);
  const tb = body.querySelector('.tabs');
  if (tb) tb.scrollLeft = keep;
  body.scrollTop = top;
}
const tabBar = (list, key, onPick) => h('div', { class: 'tabs' }, list.map(([id, label]) =>
  h('button', { class: 'tab nosound' + (tabs[key] === id ? ' on' : ''), type: 'button', on: { click: () => { tabs[key] = id; sound.play('click'); onPick?.(); refreshPanel(); } } }, label)));

function row({ icon, name, desc, right, locked, cls = '' }) {
  return h('div', { class: 'row ' + cls + (locked ? ' locked' : '') },
    h('div', { class: 'row-ico' }, icon),
    h('div', { class: 'row-main' }, h('div', { class: 'row-name' }, name), desc && h('div', { class: 'row-desc' }, desc)),
    right && h('div', { class: 'row-act' }, right));
}
const empty = text => h('div', { class: 'empty' }, text);
const section = t => h('h3', { class: 'sec' }, t);
const coinTag = n => h('span', { class: 'price' }, '🪙 ' + fmt(n));

// ---------- Chợ Bà Tư ----------
const PEN_NAME = { chicken: 'chuồng gà', pig: 'chuồng heo', pasture: 'bãi cỏ' };
async function buyItem(id, qty) {
  const r = res(S.buy(st(), id, qty), 'coin');
  if (!r?.ok) return;
  flags.bought = true;
  if (D.ITEMS[id]?.kind === 'deco') pushToast('Vào 🔨 Xây dựng để đặt ra vườn nhé');
}
const sellable = s => [...new Set([...Object.keys(s.basket || {}), ...Object.keys(s.inv || {})])].filter(k => (D.CROPS[k] || D.PRODUCTS[k]) && have(s, k) > 0);
const sold = r => { if (r?.ok) flags.sold = true; };
PANELS.market = {
  title: '🏪 Chợ Bà Tư',
  render(body, s) {
    const lv = level(s), shut = !S.marketOpen(s);
    marketWasOpen = !shut;
    if (shut) body.append(h('div', { class: 'note closed' }, `🔒 Đóng cửa. Chợ mở từ ${D.MARKET.open}h tới ${D.MARKET.close}h, sáng mai quay lại nhé!`));
    body.append(tabBar([['seed', '🌱 Hạt giống'], ['supply', '🧴 Vật tư'], ['feed', '🌾 Thức ăn'], ['animal', '🐔 Vật nuôi'], ['deco', '🪴 Trang trí'], ['fashion', '👒 Thời trang'], ['sell', '💰 Bán hàng']], 'market'));
    const t = tabs.market, list = h('div', { class: 'list' });
    body.append(list);
    if (t === 'sell') {
      const keys = sellable(s);
      if (!keys.length) return list.append(empty('Chưa có gì để bán. Thu hoạch nông sản hoặc nhặt trứng rồi mang ra chợ nhé!'));
      const total = keys.reduce((a, k) => a + have(s, k) * D.sellPrice(k), 0);
      body.insertBefore(h('div', { class: 'sell-all' },
        h('div', {}, 'Bán tất cả ', h('b', {}, '+' + fmt(total) + ' xu')),
        btn('Bán tất cả', () => sold(res(S.sellAll(st()), 'coin')), 'orange', { disabled: shut })), list);
      for (const k of keys) {
        const n = have(s, k), p = D.sellPrice(k);
        list.append(row({
          icon: ico(k), name: D.itemName(k), desc: `Có ${n} · ${p} xu/cái`,
          right: h('div', { class: 'qtys' },
            btn('Bán 1', () => sold(res(S.sell(st(), k, 1), 'coin')), 'green sm', { disabled: shut }),
            btn('Bán hết', () => sold(res(S.sell(st(), k, 'all'), 'coin')), 'orange sm', { disabled: shut })),
        }));
      }
      return;
    }
    if (t === 'animal') {
      for (const [type, a] of Object.entries(D.ANIMALS).sort((x, y) => x[1].lv - y[1].lv)) {
        const n = (s.animals || []).filter(x => D.ANIMALS[x.type].pen === a.pen).length, cap = D.PEN_CAP[a.pen];
        const locked = a.lv > lv, full = n >= cap;
        list.append(row({
          icon: ico(type), name: a.baby, locked,
          desc: [`Lớn sau ${a.grow / MIN} phút · ${a.product ? 'cho ' + D.itemName(a.product).toLowerCase() : 'biết đẻ con'} · bán ${a.sell} xu`, h('br'), `Đang có ${n}/${cap} ở ${PEN_NAME[a.pen]}`],
          right: locked ? h('span', { class: 'lock' }, '🔒 Cấp ' + a.lv)
            : [coinTag(a.price), btn(full ? 'Đầy' : 'Mua', () => res(S.buyAnimal(st(), type), 'coin')?.ok && (flags.bought = true), 'green', { disabled: shut || full || s.coins < a.price })],
        }));
      }
      return;
    }
    if (t === 'fashion') {
      const own = (slot, i) => (slot === 'hat' ? D.HATS : D.ACCS)[i].price === 0 || (s.owned?.[slot] || []).includes(i);
      for (const [slot, arr, head] of [['hat', D.HATS, 'Mũ'], ['acc', D.ACCS, 'Phụ kiện']]) {
        list.append(section(head));
        arr.forEach((it, i) => {
          if (i === 0) return;
          const owned = own(slot, i), worn = s.look[slot] === i;
          list.append(row({
            icon: thumb({ ...s.look, [slot]: i }), name: it.name, cls: 'fashion',
            desc: owned ? (worn ? 'Đang mặc' : 'Đã có') : null,
            right: owned ? (worn ? h('span', { class: 'tick' }, '✓') : btn('Mặc', () => res(S.setLook(st(), { ...s.look, [slot]: i }), 'pop') , 'plain sm'))
              : [coinTag(it.price), btn('Mua', () => res(S.buyOutfit(st(), slot, i), 'coin'), 'green', { disabled: shut || s.coins < it.price })],
          }));
        });
      }
      return;
    }
    const items = Object.entries(D.ITEMS).filter(([, it]) => it.kind === t).sort((a, b) => a[1].lv - b[1].lv);
    for (const [id, it] of items) {
      const locked = it.lv > lv;
      const c = it.crop && D.CROPS[it.crop];
      const desc = c ? `Lớn sau ${c.grow / MIN} phút · thu ${c.yield} · bán ${c.price} xu/quả` : it.desc;
      list.append(row({
        icon: ico(id), name: it.name, locked,
        desc: [desc, h('br'), `Đang có: ${have(s, id)}`],
        right: locked ? h('span', { class: 'lock' }, '🔒 Cấp ' + it.lv)
          : [coinTag(it.price), h('div', { class: 'qtys' },
            btn('×1', () => buyItem(id, 1), 'green sm', { disabled: shut || s.coins < it.price }),
            btn('×5', () => buyItem(id, 5), 'green sm', { disabled: shut || s.coins < it.price * 5 }))],
      }));
    }
  },
};

// ---------- Nhà kho: chỗ cất đồ (bán thì ra chợ Bà Tư trong làng) ----------
PANELS.shed = {
  title: '📦 Nhà kho',
  render(body, s) {
    body.append(h('div', { class: 'note' }, 'Đồ cất ở đây, kho không giới hạn. Muốn bán nông sản thì mang ra chợ Bà Tư trong làng (mở 6h–18h) nhé!'));
    body.append(h('div', { class: 'sell-all' },
      h('div', {}, '🧺 Giỏ ', h('b', {}, `${S.basketCount(s)}/${S.basketCap(s)}`)),
      btn('Cất hết vào kho', () => res(S.stashAll(st()), 'pop'), 'green', { disabled: !S.basketCount(s) })));
    PANELS.bag.render(body, s, true);
  },
};
// ---------- Thùng giao hàng: lái buôn lấy hết lúc 6h sáng, trả 80% giá chợ ----------
PANELS.shipbin = {
  title: '📮 Thùng giao hàng',
  render(body, s) {
    const inBin = Object.keys(s.shipbin.items), pct = Math.round(D.SHIP_RATE * 100);
    body.append(h('div', { class: 'note' }, `Bỏ nông sản vào đây, 6 giờ sáng lái buôn ghé lấy hết và trả ${pct}% giá chợ. Lấy lại được trước lúc đó.`));
    body.append(h('div', { class: 'sell-all', id: 'ship-total' }, h('div', {}, 'Dự kiến nhận ', h('b', {}, '+' + fmt(S.shipPreview(s)) + ' xu'))));
    body.append(section(`📮 Trong thùng (${inBin.reduce((a, k) => a + s.shipbin.items[k], 0)})`));
    const bin = h('div', { class: 'list' });
    body.append(bin);
    if (!inBin.length) bin.append(empty('Thùng đang trống.'));
    for (const k of inBin) {
      const n = s.shipbin.items[k];
      bin.append(row({
        icon: ico(k, 'big'), name: `${itemLabel(k)} ×${n}`, desc: `+${fmt(D.shipValue({ [k]: n }))} xu`,
        right: h('div', { class: 'qtys' }, btn('Lấy 1', () => res(S.shipTake(st(), k, 1), 'pop'), 'plain sm'), btn('Lấy hết', () => res(S.shipTake(st(), k, 'all'), 'pop'), 'plain sm')),
      }));
    }
    body.append(section('Bỏ vào thùng'));
    const keys = sellable(s), src = h('div', { class: 'list' });
    body.append(src);
    if (!keys.length) src.append(empty('Giỏ và kho chưa có nông sản để bỏ vào.'));
    for (const k of keys) {
      const n = have(s, k);
      src.append(row({
        icon: ico(k, 'big'), name: `${itemLabel(k)} ×${n}`, desc: `${fmt(D.shipValue({ [k]: 1 }))} xu/cái`,
        right: h('div', { class: 'qtys' }, btn('Bỏ 1', () => res(S.shipAdd(st(), k, 1), 'pop'), 'green sm'), btn('Bỏ hết', () => res(S.shipAdd(st(), k, 'all'), 'pop'), 'green sm')),
      }));
    }
  },
};
// ---------- Tiệm rèn Ông Sáu ----------
// Icon công cụ theo cấp (SPR2.tools.<tên>[cấp-1], canvas 16x16); chưa có art thì emoji
function toolIco(k, lv) {
  const src = SPR2?.tools?.[k]?.[lv - 1];
  if (!src) return h('span', { class: 'ico emo big' }, D.TOOLS[k].icon);
  const c = h('canvas', { class: 'ico big tool-ico', width: src.width, height: src.height });
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}
const smithLeft = s => s.smith ? `còn ${S.mmss(s.smith.doneAt - s.time)}` : '';
let smithKey = '';
PANELS.smithy = {
  title: '🔨 Tiệm rèn Ông Sáu',
  render(body, s) {
    smithKey = JSON.stringify([s.smith, s.tools]);
    body.append(h('div', { class: 'note' }, 'Gửi công cụ cho Ông Sáu rèn lên cấp: tốn xu và mất 1 ngày game. Lúc đó công cụ nằm lò, chưa dùng được. Mỗi lúc chỉ rèn một món.'));
    if (s.smith) body.append(h('div', { class: 'note' }, `🔥 Ông Sáu đang rèn ${D.TOOLS[s.smith.tool].name.toLowerCase()} lên cấp ${S.toolLv(s, s.smith.tool) + 1}, `, h('b', { id: 'smith-left' }, smithLeft(s))));
    const list = h('div', { class: 'list' });
    body.append(list);
    for (const k of Object.keys(D.TOOLS)) {
      const lv = S.toolLv(s, k), cost = S.upgradeCost(s, k), d = D.TOOLS[k], away = S.toolAway(s, k);
      const area = d.area[lv] && { row: 'hàng 3 ô', block: '3×3 ô', one: '1 ô' }[d.area[lv]];
      const next = k === 'can' ? `chứa ${d.canMax[lv] ?? ''} lần${area ? ', tưới ' + area : ''}` : k === 'basket' ? `chứa ${d.cap[lv]} món` : area ? `làm ${area} một lần` : '';
      list.append(row({
        icon: toolIco(k, lv), name: `${d.name} ${D.TOOL_LEVEL[lv - 1]} (cấp ${lv})`,
        desc: cost == null ? 'Đã là cấp cao nhất' : `Lên cấp ${lv + 1}: ${next}`,
        right: away ? h('span', { class: 'lock' }, '🔥 Đang rèn')
          : cost == null ? h('span', { class: 'tick' }, '✓')
          : [coinTag(cost), btn('Nâng cấp', () => res(S.startUpgrade(st(), k), 'coin'), 'green', { disabled: !!s.smith || s.coins < cost })],
      }));
    }
  },
};

// ---------- Túi đồ ----------
PANELS.bag = {
  title: '🎒 Túi đồ',
  render(body, s, inShed = false) {
    body.append(h('div', { class: 'chips-line' },
      h('span', { class: 'mini' }, `💧 Bình nước ${s.can}/${S.canMax(s)}`),
      h('span', { class: 'mini' }, `🧺 Giỏ ${S.basketCount(s)}/${S.basketCap(s)}`),
      h('span', { class: 'mini' }, `🪙 ${fmt(s.coins)} xu`)));
    body.append(h('button', { class: 'guide-open', type: 'button', on: { click: () => openPanel('guide') } }, guideIcon(), h('b', {}, 'Sổ tay hướng dẫn'), h('small', {}, 'Thể lực, công cụ, xây dựng, thùng giao hàng, chợ...')));
    body.append(section('Công cụ'));
    const tl = h('div', { class: 'grid' });
    for (const k of Object.keys(D.TOOLS)) {
      const lv = S.toolLv(s, k);
      tl.append(h('div', { class: 'cell' }, toolIco(k, lv), h('div', { class: 'cell-name' }, D.TOOLS[k].name), h('div', { class: 'cell-sub' }, S.toolAway(s, k) ? 'Đang rèn' : `Cấp ${lv} (${D.TOOL_LEVEL[lv - 1]})`)));
    }
    body.append(tl);
    const isProduce = k => D.CROPS[k] || D.PRODUCTS[k];
    const groups = [
      [`🧺 Giỏ (${S.basketCount(s)}/${S.basketCap(s)})`, s.basket, isProduce],
      ['📦 Kho: nông sản & sản phẩm', s.inv, isProduce],
      ['Hạt giống', s.inv, k => D.ITEMS[k]?.kind === 'seed'],
      ['Vật tư', s.inv, k => D.ITEMS[k]?.kind === 'supply'],
      ['Thức ăn', s.inv, k => D.ITEMS[k]?.kind === 'feed'],
      ['Nguyên liệu', s.inv, k => D.ITEMS[k]?.kind === 'material'],
      ['Đồ trang trí', s.inv, k => D.ITEMS[k]?.kind === 'deco'],
    ];
    let any = false;
    for (const [title, src, pred] of groups) {
      const keys = Object.keys(src || {}).filter(k => src[k] > 0 && pred(k));
      if (!keys.length) continue;
      any = true;
      body.append(section(title));
      const list = h('div', { class: 'grid' });
      for (const k of keys) {
        const it = D.ITEMS[k];
        const act = it?.kind === 'seed' ? btn(s.selectedSeed === it.crop ? 'Đang chọn' : 'Chọn gieo', () => { S.selectSeed(st(), it.crop); sound.play('pop'); commit(); }, 'plain sm', { disabled: s.selectedSeed === it.crop })
          : it?.kind === 'deco' ? btn('Đặt ở 🔨', () => { closePanel(); api.buildStart(); }, 'green sm')
          : inShed && src === s.inv && isProduce(k) ? btn('Lấy ra', () => res(S.withdraw(st(), k, 'all'), 'pop'), 'plain sm', { disabled: S.basketCount(s) >= S.basketCap(s) }) : null;
        list.append(h('div', { class: 'cell' }, ico(k, 'big'), h('b', { class: 'cell-n' }, '×' + src[k]), h('div', { class: 'cell-name' }, itemLabel(k)), act));
      }
      body.append(list);
    }
    if (!any) body.append(empty('Túi đồ đang trống.'));
  },
};

// ---------- Sổ tay hướng dẫn ----------
// Mỗi trang: tên, lời giải thích, và các sprite có sẵn vẽ vào canvas nhỏ rồi phóng to (pixelated).
const spr = () => SPR2 ?? {};
const GUIDE = [
  { title: 'Thể lực', art: () => [spr().stamina, spr().staminaTired, spr().bed],
    text: [`Mỗi việc ở ruộng đều tốn thể lực (thanh ⚡ cạnh tên bạn). Hết thể lực thì đi và làm chậm gấp ${D.STAMINA.slow} lần.`,
      `Cách hồi: ngồi ghế đá (hồi ${D.STAMINA.benchPerMin} mỗi phút), ngủ (từ ${D.STAMINA.sleepHour}h), hoặc đợi 6h sáng tự hồi ${D.STAMINA.morningRegen}.`] },
  { title: 'Công cụ', art: () => [spr().tools?.hoe[0], spr().tools?.hoe[1], spr().tools?.hoe[2], spr().tools?.can[2], spr().tools?.sickle[2], spr().smithy],
    text: ['Cuốc, bình tưới, liềm và giỏ có 3 cấp: sắt, đồng, vàng.',
      'Cấp cao làm cả hàng 3 ô hoặc khối 3×3 một lần, tốn ít thể lực hơn làm từng ô. Bình và giỏ cấp cao chứa nhiều hơn.',
      'Nâng cấp ở tiệm rèn trong làng. Rèn mất một ngày game, công cụ đó nằm lò rèn tới khi xong.'] },
  { title: 'Chế độ xây dựng', art: () => [spr().shippingBin, spr().lampPost, spr().bench],
    text: ['Bấm 🔨 Xây dựng ở thanh dưới để dời nhà, kho, chuồng, ruộng, đồ trang trí.',
      'Chạm và kéo công trình tới chỗ mới (chỗ đỏ là không đặt được). Cất để cho vào kho, Xong để giữ, Hủy để trả lại như cũ.',
      'Khay phía dưới có khối ruộng, chuồng và đồ trang trí đã mua.'] },
  { title: 'Mở đất', art: () => [spr().bushes?.[0], spr().rocks?.[0], spr().stump],
    text: ['Dải đất mới mua ở mép vườn có bụi cây và đá. Đứng gần rồi bấm dọn là được gỗ, đá.',
      `Dọn bụi tốn ${D.STAMINA.cost.clearBush} thể lực, đập đá tốn ${D.STAMINA.cost.breakRock}. Dọn xong đặt ruộng, chuồng ở 🔨 Xây dựng.`] },
  { title: 'Thùng giao hàng', art: () => [spr().shippingBin],
    text: ['Thùng nằm cạnh nhà kho. Bỏ nông sản và sản phẩm vào thùng cho tiện, không phải ra chợ.',
      `6h sáng lái buôn lấy hết và trả ${Math.round(D.SHIP_RATE * 100)}% giá chợ. Trước giờ đó vẫn lấy lại được.`] },
  { title: 'Chợ và giờ mở cửa', art: () => [spr().marketStall, spr().marketClosed],
    text: [`Chợ Bà Tư ở trong làng, ra cổng vườn là tới. Mở cửa ${D.MARKET.open}h–${D.MARKET.close}h, ngoài giờ đó không mua bán được.`,
      'Ở chợ có hạt giống, vật tư, thức ăn, đồ trang trí. Bán thẳng ở chợ được giá đủ; thùng giao hàng tiện hơn nhưng trừ một phần.'] },
];
let guidePage = 0;
function guideIcon() {
  const c = h('canvas', { class: 'guide-ico', width: 12, height: 12 });
  if (spr().guidebook) c.getContext('2d').drawImage(spr().guidebook, 0, 0);
  return c;
}
// Xếp các sprite thành một hàng trong canvas 160x56, mỗi cái vừa ô của nó
function guideArt(list) {
  const W = 160, H = 56, items = list.filter(Boolean);
  const cv = h('canvas', { class: 'guide-art', width: W, height: H }), g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  const slot = W / Math.max(1, items.length);
  items.forEach((im, i) => {
    const k = Math.min((H - 4) / im.height, (slot - 6) / im.width), z = k >= 1 ? Math.floor(k) : k;
    const w = Math.round(im.width * z), hh = Math.round(im.height * z);
    g.drawImage(im, Math.round(slot * i + (slot - w) / 2), Math.round((H - hh) / 2), w, hh);
  });
  return cv;
}
PANELS.guide = {
  title: '📖 Sổ tay',
  render(body) {
    const n = GUIDE.length, p = GUIDE[guidePage], go = d => { guidePage = (guidePage + d + n) % n; sound.play('click'); refreshPanel(); };
    body.append(
      h('div', { class: 'guide-dots' }, GUIDE.map((_, i) => h('button', { class: 'guide-dot nosound' + (i === guidePage ? ' on' : ''), type: 'button', title: GUIDE[i].title, 'aria-label': GUIDE[i].title, on: { click: () => { guidePage = i; sound.play('click'); refreshPanel(); } } }))),
      h('div', { class: 'guide-page' }, guideArt(p.art()), h('h3', {}, p.title), p.text.map(t => h('p', {}, t))),
      h('div', { class: 'guide-nav' }, btn('◀ Trước', () => go(-1), 'plain sm nosound'), h('span', { class: 'mini' }, `Trang ${guidePage + 1}/${n}`), btn('Sau ▶', () => go(1), 'plain sm nosound')));
  },
};

// ---------- Chọn hạt ----------
PANELS.seeds = {
  title: '🌱 Chọn hạt giống',
  render(body, s) {
    const keys = Object.keys(D.ITEMS).filter(k => D.ITEMS[k].kind === 'seed' && have(s, k) > 0);
    if (!keys.length) body.append(empty('Bạn hết hạt giống rồi. Ghé chợ Bà Tư trong làng mua thêm nhé!'));
    else {
      const list = h('div', { class: 'grid' });
      for (const k of keys) {
        const c = D.CROPS[D.ITEMS[k].crop];
        const on = s.selectedSeed === D.ITEMS[k].crop;
        list.append(h('button', { class: 'cell pick nosound' + (on ? ' on' : ''), type: 'button', on: { click: () => { S.selectSeed(st(), D.ITEMS[k].crop); sound.play('pop'); commit(); closePanel(); } } },
          ico(k, 'big'), h('b', { class: 'cell-n' }, '×' + s.inv[k]), h('div', { class: 'cell-name' }, c.name), h('div', { class: 'cell-sub' }, `${c.grow / MIN} phút`)));
      }
      body.append(list);
    }
    body.append(h('div', { class: 'note' }, 'Hết hạt thì ra cổng vườn, ghé chợ Bà Tư trong làng mua thêm nhé (mở 6h–18h).'));
  },
};

// ---------- Bảng đơn hàng ----------
PANELS.board = {
  title: '📋 Đơn hàng',
  render(body, s) {
    const orders = s.orders || [];
    if (!orders.length) body.append(empty('Chưa có đơn nào. Hàng xóm sẽ sớm ghé đặt hàng!'));
    const list = h('div', { class: 'list' });
    for (const o of orders) {
      const ok = Object.entries(o.items).every(([k, q]) => have(s, k) >= q);
      list.append(h('div', { class: 'order' + (ok ? ' ready' : '') },
        h('div', { class: 'order-who' }, '🧑 ', h('b', {}, o.who), ' cần:'),
        h('div', { class: 'order-items' }, Object.entries(o.items).map(([k, q]) => {
          const g = have(s, k);
          return h('span', { class: 'need' + (g >= q ? ' ok' : '') }, ico(k), ` ${Math.min(g, 999)}/${q}`);
        })),
        h('div', { class: 'order-foot' },
          h('span', { class: 'reward' }, `🪙 +${fmt(o.coins)}  ⭐ +${fmt(o.exp)} EXP`),
          btn('Giao hàng', () => res(S.fulfillOrder(st(), o.id), 'coin'), 'green', { disabled: !ok }))));
    }
    body.append(list);
    if (orders.length < D.ORDERS.max) {
      const left = Math.max(0, Math.ceil(((s.nextOrderAt || 0) - s.time) / MIN));
      body.append(h('div', { class: 'note' }, `Đơn mới sẽ tới sau khoảng ${left || 1} phút nữa.`));
    }
  },
};

// ---------- Nhà ----------
const STAT_LABELS = [
  ['harvests', '🧺 Lần thu hoạch'], ['planted', '🌱 Cây đã gieo'], ['bugs', '🐛 Sâu đã diệt'], ['eggs', '🥚 Trứng đã nhặt'],
  ['hatches', '🐣 Gà ấp nở'], ['piglets', '🐖 Heo con chào đời'], ['poops', '💩 Phân đã dọn'], ['slips', '🤸 Lần trượt phân'],
  ['crows', '🐦 Quạ đã đuổi'], ['thieves', '🕵️ Trộm đã bắt'], ['orders', '📋 Đơn đã giao'], ['earned', '🪙 Tổng xu kiếm được'],
];
PANELS.house = {
  title: '🏠 Nhà của bạn',
  render(body, s) {
    body.append(tabBar([['wardrobe', '👕 Tủ đồ'], ['stats', '📊 Thống kê']], 'house'));
    if (tabs.house === 'stats') {
      const li = S.levelInfo(s.exp);
      const list = h('div', { class: 'stats' },
        h('div', { class: 'stat big' }, h('span', {}, '⭐ Cấp độ'), h('b', {}, li.level)),
        h('div', { class: 'stat big' }, h('span', {}, '📅 Ngày thứ'), h('b', {}, s.day)),
        h('div', { class: 'stat big' }, h('span', {}, '🐾 Vật nuôi'), h('b', {}, (s.animals || []).length)),
        STAT_LABELS.map(([k, l]) => h('div', { class: 'stat' }, h('span', {}, l), h('b', {}, fmt(s.stats?.[k] || 0)))));
      return body.append(list);
    }
    if (!wardLook) wardLook = { ...s.look };
    const owns = (slot, i) => (slot === 'hat' ? D.HATS : D.ACCS)[i]?.price === 0 || (s.owned?.[slot] || []).includes(i);
    const missing = ['hat', 'acc'].filter(k => !owns(k, wardLook[k]));
    const onChange = () => {
      // Chỉ áp dụng phần đã có; phần chưa mua thì xem thử thôi
      const applied = { ...wardLook };
      for (const k of ['hat', 'acc']) if (!owns(k, applied[k])) applied[k] = st().look[k];
      S.setLook(st(), applied);
      commit();
    };
    body.append(h('div', { class: 'wardrobe' },
      h('div', { class: 'stage' }, makePreview(() => wardLook, 6), h('div', { class: 'shadow' })),
      lookEditor(wardLook, k => [...Array(lookCount(k)).keys()], onChange)));
    for (const k of missing) {
      const it = (k === 'hat' ? D.HATS : D.ACCS)[wardLook[k]];
      body.append(h('div', { class: 'note lockednote' },
        `🔒 ${it.name} chưa mua (${fmt(it.price)} xu). Đang xem thử thôi. `,
        'Mua ở chợ Bà Tư trong làng nhé.'));
    }
  },
};

PANELS.achievements = {
  title: '🏆 Thành tựu',
  render(body, s) {
    const list = h('div', { class: 'list' });
    for (const a of D.ACHIEVEMENTS) {
      const val = s.stats?.[a.stat] || 0, done = !!s.achievements?.[a.id] || val >= a.goal;
      list.append(row({
        icon: h('span', { class: 'ico emo' }, done ? '🏅' : '🔘'), name: a.name, cls: done ? 'done' : '',
        desc: [a.desc, h('div', { class: 'prog' }, h('i', { style: `width:${Math.min(100, (val / a.goal) * 100)}%` }), h('span', {}, `${Math.min(val, a.goal)}/${a.goal}`))],
        right: done ? h('span', { class: 'tick' }, '✓') : h('span', { class: 'price' }, '🪙 ' + a.coins),
      }));
    }
    body.append(list);
  },
};

function timeLabel(t) {
  const day = Math.floor(t / D.DAY_MS) + 1, fr = (t % D.DAY_MS) / D.DAY_MS;
  const hrs = (6 + fr * 24) % 24, hh = Math.floor(hrs), mm = Math.floor((hrs - hh) * 60);
  return `Ngày ${day} · ${hh}:${String(mm).padStart(2, '0')}`;
}
PANELS.log = {
  title: '📜 Nhật ký',
  render(body, s) {
    if (!(s.log || []).length) return body.append(empty('Chưa có gì xảy ra. Ra ruộng làm việc thôi!'));
    body.append(h('div', { class: 'log' }, s.log.map(e => h('div', { class: 'log-row' }, h('span', { class: 'log-t' }, timeLabel(e.t)), h('span', {}, e.text)))));
  },
};

// ---------- Việc cần làm 📋 & bản đồ nhỏ ----------
PANELS.todo = {
  title: '📋 Việc cần làm',
  render(body, s) {
    const items = todoList(s);
    if (!items.length) return body.append(empty('Hết việc rồi, nghỉ ngơi chút nhé 😌'));
    if (s.scene && s.scene !== 'farm') body.append(h('div', { class: 'note' }, 'Bạn đang ở ngoài vườn: chạm một việc để đi về vườn rồi tới đúng chỗ.'));
    body.append(...items.map(it => h('button', {
      class: 'row todo-row nosound' + (it.level === 'urgent' ? ' urgent' : ''), type: 'button', 'data-kind': it.kind,
      on: { click: () => { sound.play('click'); closePanel(); api.todoGo(it.kind); } },
    }, h('div', { class: 'row-main' }, h('div', { class: 'row-name' }, it.label)),
    it.level === 'urgent' && h('span', { class: 'todo-tag' }, 'Gấp'), h('span', { class: 'todo-go' }, '›'))));
  },
};
PANELS.map = {
  title: '🗺️ Bản đồ',
  render(body, s) {
    const size = Math.min(320, innerWidth - 48), cv = h('canvas', { class: 'mini-big', width: size, height: size });
    cv.style.width = cv.style.height = size + 'px';
    drawMini(cv, s, todoList(s));
    body.append(cv, h('div', { class: 'mini-legend' }, '🔴 Việc gấp   🟡 Có việc   🔵 Bạn'));
  },
};
let miniKey = '';
// Bản đồ nhỏ ở góc + nút 📋: vẽ lại theo nhịp HUD. Chấm xuất ra data-dots (điểm ảnh canvas) để kiểm tra.
function renderMini(s) {
  const wrap = $('mini-wrap');
  wrap.hidden = false;
  const items = todoList(s), hud = $('hud').getBoundingClientRect();
  wrap.style.top = (innerWidth - hud.right >= 120 ? hud.top : hud.bottom + 8) + 'px';   // màn rộng: ngang HUD; màn hẹp: ngay dưới HUD
  const m = drawMini($('mini-cv'), s, items), mm = $('minimap');
  const key = JSON.stringify(m.dots);
  if (key !== miniKey) { miniKey = key; mm.dataset.dots = key; }
  mm.dataset.view = [m.k, m.ox, m.oy].map(v => v.toFixed(4)).join(',');
  const n = items.length, urgent = items.some(i => i.level === 'urgent');
  setText('todo-n', String(n));
  $('todo-n').hidden = !n;
  $('todo-btn').classList.toggle('urgent', urgent);
  if (!memo.get('todo-ico')) {
    memo.set('todo-ico', 1);
    const ic = SPR2?.todo, g = $('todo-ico').getContext('2d');
    if (ic) g.drawImage(ic, 0, 0); else { g.font = '10px sans-serif'; g.fillText('📋', 0, 10); }
  }
}

let resetting = false;
PANELS.settings = {
  title: '⚙️ Cài đặt',
  render(body, s) {
    body.append(section('Tốc độ game'),
      h('div', { class: 'seg' }, D.SPEEDS.map(v => btn('x' + v, () => { s.speed = v; sound.play('pop'); commit(); }, (s.speed === v ? 'orange' : 'plain') + ' nosound'))),
      h('p', { class: 'mini' }, 'x5 và x20 giúp cây lớn nhanh để xem thử. Chơi thoải mái thì để x1.'),
      section('Âm thanh'),
      h('div', { class: 'seg' }, btn(sound.isMuted() ? '🔇 Đang tắt tiếng' : '🔊 Đang bật tiếng', () => { sound.setMuted(!sound.isMuted()); sound.play('pop'); refreshPanel(); }, sound.isMuted() ? 'plain' : 'green nosound')),
      section('Thông báo'),
      h('div', { class: 'notify-list' },
        h('label', { class: 'chk locked' }, h('input', { type: 'checkbox', checked: true, disabled: true }), '🔴 Báo gấp: quạ, trộm, con vật bệnh (luôn bật)'),
        Object.entries(D.NOTIFY_CATS).map(([cat, label]) => h('label', { class: 'chk' },
          h('input', { type: 'checkbox', checked: S.notifyOn(s, cat), name: 'notify-' + cat, on: { change: e => { S.setNotify(s, cat, e.target.checked); commit(); } } }), '🟡 ' + label))),
      h('p', { class: 'mini' }, 'Việc nhỏ như nhặt trứng, bán hàng chỉ ghi vào Nhật ký.'),
      section('Hiệu năng'),
      h('label', { class: 'chk' },
        h('input', { type: 'checkbox', checked: api.getBattery(), name: 'battery', on: { change: e => { api.setBattery(e.target.checked); sound.play('pop'); refreshPanel(); } } }), '🔋 Tiết kiệm pin'),
      h('p', { class: 'mini' }, 'Giữ 30 khung hình mỗi giây, tắt mưa và lấp lánh, ánh đèn ban đêm nhẹ hơn. Hợp với máy yếu hoặc sắp hết pin.'),
      section('Điều khiển'),
      h('ul', { class: 'help' },
        h('li', {}, '🖥️ Máy tính: ', h('kbd', {}, '↑↓←→'), ' hoặc ', h('kbd', {}, 'WASD'), ' để đi.'),
        h('li', {}, h('kbd', {}, 'Space'), ' / ', h('kbd', {}, 'E'), ': hành động chính.'),
        h('li', {}, h('kbd', {}, '1'), '–', h('kbd', {}, '6'), ': các hành động phụ.'),
        h('li', {}, h('kbd', {}, 'Esc'), ': đóng bảng.'),
        h('li', {}, '📱 Điện thoại: chạm mặt đất để đi, chạm vật để làm việc, hoặc dùng cần điều khiển.')),
      section('Làng'),
      ...(s.mode === 'online'
        ? [h('p', { class: 'mini' }, `Đang ở làng với tên ${s.account}. Vườn tự lưu lên làng.`),
          btn('Đăng xuất', async () => { closePanel(); await api.leaveToMode(); await net.logout(); }, 'plain')]
        : [btn('🏘️ Vào làng', () => { closePanel(); api.leaveToMode(); }, 'green')]),
      section('Nguy hiểm'),
      btn('🗑️ Chơi lại từ đầu', async () => {
        if (resetting) return;
        resetting = true;
        try {
          if (!await confirmBox('Chơi lại từ đầu? Toàn bộ nông trại hiện tại sẽ mất.', 'Tiếp tục', 'Thôi', true)) return;
          if (!await confirmBox('Chắc chắn 100% chưa? Không thể hoàn tác đâu nhé!', 'Xóa hết', 'Giữ lại', true)) return;
          closePanel();
          api.resetGame();
        } finally { resetting = false; }
      }, 'red'));
  },
};

// ---------- Màn tạo nhân vật ----------
// online: { name } = vườn mới trên làng, tên nhân vật là tên tài khoản (không sửa được)
export function showCreator(online) {
  if (!api) return;
  closePanel();
  creatorOpen = true;
  const root = $('creator');
  const look = { ...D.DEFAULT_LOOK };
  const input = h('input', { class: 'name-input', type: 'text', maxLength: 20, placeholder: 'Tên của bạn', autocomplete: 'off', spellcheck: false, value: online?.name ?? '', readOnly: !!online });
  const allowed = k => (k === 'hat' ? [0, 1] : k === 'acc' ? [0] : [...Array(lookCount(k)).keys()]);
  const editor = lookEditor(look, allowed, () => {}, null);
  const dice = btn('🎲 Ngẫu nhiên', () => {
    for (const k of ['skin', 'hair', 'hairColor', 'shirt', 'pants']) look[k] = Math.floor(Math.random() * lookCount(k));
    look.hat = Math.random() < 0.5 ? 1 : 0;
    editor.sync();
  }, 'plain sm');
  const go = () => {
    const name = input.value.trim();
    if (name.length < 2 || name.length > 20) {
      pushToast('Tên cần từ 2 đến 20 ký tự nhé!', 'bad');
      sound.play('error');
      input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
      input.focus();
      return;
    }
    creatorOpen = false;
    root.hidden = true;
    root.replaceChildren();
    sound.play('levelup');
    api.newGame({ name, look: { ...look } });
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  const preview = makePreview(() => look, 6);
  root.replaceChildren(h('div', { class: 'creator-card' },
    h('h1', {}, 'Nông Trại Vui'),
    h('p', { class: 'sub' }, online ? `Vườn mới của ${online.name} trên làng. Chọn ngoại hình nào!` : 'Chào mừng bạn tới nông trại mới! Hãy giới thiệu bản thân nào.'),
    h('div', { class: 'stage' }, preview, h('div', { class: 'shadow' })),
    dice,
    input,
    editor,
    h('p', { class: 'mini' }, 'Mũ đẹp, kính và khăn quàng mua thêm ở chợ Bà Tư trong làng sau nhé!'),
    btn('🌾 Vào nông trại', go, 'orange big')));
  root.hidden = false;
  if (matchMedia('(pointer:fine)').matches) input.focus();
}

// ---------- Màn chọn chế độ, đăng nhập / đăng ký, "Đã vào làng" (issue 21). Dùng chung lớp phủ #creator ----------
function showCard(...kids) {
  closePanel();
  creatorOpen = true;
  const root = $('creator');
  root.replaceChildren(h('div', { class: 'creator-card' }, h('h1', {}, 'Nông Trại Vui'), ...kids));
  root.hidden = false;
}
// notice: câu báo ở đầu (vd "Bạn đã đăng nhập ở thiết bị khác.")
export function showMode(notice) {
  if (!api) return;
  showCard(
    notice ? h('p', { class: 'auth-err', role: 'alert' }, notice) : null,
    h('p', { class: 'sub' }, 'Bạn muốn chơi thế nào?'),
    btn('🌾 Chơi một mình', () => api.startSolo(), 'orange big wide'),
    h('p', { class: 'mini' }, 'Chơi ngay trên máy này, không cần mạng.'),
    btn('🏘️ Vào làng', async () => { const who = await net.whoAmI(true); if (who) api.startOnline(who); else showAuth('login'); }, 'green big wide'),
    h('p', { class: 'mini' }, 'Đăng nhập để gặp bạn bè trong làng. Cần mã mời của quản trị.'));
}
export function closeCreator() {
  creatorOpen = false;
  const root = $('creator');
  root.hidden = true; root.replaceChildren();
}
export function showAuth(mode = 'login') {
  const reg = mode === 'register';
  const name = h('input', { class: 'name-input', type: 'text', maxLength: 20, placeholder: 'Tên nhân vật', autocomplete: 'username', spellcheck: false, name: 'name' });
  const pin = h('input', { class: 'name-input', type: 'password', inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6, placeholder: 'PIN 6 số', autocomplete: reg ? 'new-password' : 'current-password', name: 'pin' });
  const invite = reg ? h('input', { class: 'name-input', type: 'text', maxLength: 12, placeholder: 'Mã mời', autocomplete: 'off', autocapitalize: 'characters', spellcheck: false, name: 'invite' }) : null;
  const err = h('p', { class: 'auth-err', role: 'alert', hidden: true });
  const fail = text => { err.textContent = text; err.hidden = false; sound.play('error'); };
  let busy = false;
  const submit = async e => {
    e.preventDefault();
    if (busy) return;
    busy = true; err.hidden = true; go.disabled = true;
    try {
      const r = reg ? await net.register(name.value, pin.value, invite.value) : await net.login(name.value, pin.value);
      if (r.ok) api.startOnline(r.name); else fail(r.error);
    } finally { busy = false; go.disabled = false; }
  };
  const go = h('button', { class: 'btn orange big wide', type: 'submit' }, reg ? 'Đăng ký' : 'Đăng nhập');
  showCard(
    h('div', { class: 'seg' },
      btn('Đã có tài khoản', () => showAuth('login'), reg ? 'plain sm' : 'orange sm'),
      btn('Tạo tài khoản mới', () => showAuth('register'), reg ? 'orange sm' : 'plain sm')),
    h('form', { class: 'auth-form', on: { submit } }, name, pin, invite, err, go),
    reg ? h('p', { class: 'mini' }, 'Tên nhân vật không trùng ai trong làng. PIN gồm đúng 6 số, nhớ kỹ nhé.') : h('p', { class: 'mini' }, 'Quên PIN? Nhờ quản trị đặt lại PIN.'),
    btn('← Quay lại', showMode, 'plain sm'));
  if (matchMedia('(pointer:fine)').matches) name.focus();
}
// Đang vào làng (chờ server trao vườn); error = không vào được, cho thử lại
export function showVillage(name, error) {
  showCard(
    h('h2', {}, error ? 'Chưa vào được làng' : 'Đang vào làng…'),
    error ? h('p', { class: 'auth-err', role: 'alert' }, error) : h('p', { class: 'sub' }, `Chào ${name}! Đang mở vườn của bạn.`),
    error ? btn('🔄 Thử lại', () => api.startOnline(name), 'green big wide') : null,
    btn('🌾 Chơi một mình', () => api.startSolo(), 'orange big wide'),
    btn('Đăng xuất', async () => { await net.logout(); showMode(); }, 'plain sm'));
}
// Tài khoản chưa có vườn trên làng mà máy này có vườn chơi đơn (issue 22)
export function showBringUp(name, solo, { bring, fresh }) {
  const lv = S.levelInfo(solo.exp).level;
  showCard(
    h('h2', {}, 'Mang vườn này lên làng?'),
    h('p', { class: 'sub' }, `Tài khoản ${name} chưa có vườn trên làng. Bạn muốn mang vườn chơi một mình trên máy này lên, hay bắt đầu vườn mới?`),
    h('div', { class: 'bring-farm' },
      h('b', {}, `Vườn của ${solo.name}`),
      h('span', {}, `Cấp ${lv} · 🪙 ${fmt(solo.coins)} · ${S.dayText(solo)}`)),
    btn('🧺 Mang vườn chơi đơn lên', bring, 'green big wide'),
    btn('🌱 Bắt đầu vườn mới', fresh, 'orange big wide'),
    h('p', { class: 'mini' }, 'Vườn chơi một mình vẫn nằm nguyên trên máy này. Từ đây hai vườn là hai bản riêng.'));
}
// Biểu tượng nhỏ mất kết nối với làng (vườn online), vẫn chơi tiếp được
export function setOnline(on) {
  const e = $('hud-net');
  if (e) e.hidden = !!on;
}
// ---------- Sự kiện từ tick() ----------
function showBadge(ev) {
  const box = $('badges');
  const b = h('div', { class: 'badge' },
    h('div', { class: 'badge-ico' }, '🏆'),
    h('div', {}, h('div', { class: 'badge-t' }, 'Thành tựu mới!'), h('div', { class: 'badge-n' }, ev.name), ev.coins ? h('div', { class: 'badge-c' }, '+' + fmt(ev.coins) + ' xu') : null));
  box.append(b);
  sound.play('coin');
  setTimeout(() => b.remove(), 4200);
}
function nextCelebration() {
  const root = $('celebrate');
  const lv = celebQueue.shift();
  if (lv == null) { celebOpen = false; root.hidden = true; root.replaceChildren(); return; }
  celebOpen = true;
  const unlocked = [
    ...Object.entries(D.ITEMS).filter(([, it]) => it.lv === lv).map(([k, it]) => ({ key: k, name: it.name })),
    ...Object.entries(D.ANIMALS).filter(([, a]) => a.lv === lv).map(([k, a]) => ({ key: k, name: a.baby })),
  ];
  const conf = Array.from({ length: 48 }, () => {
    const i = h('i');
    i.style.cssText = `--x:${Math.random() * 100}vw;--dx:${(Math.random() - 0.5) * 30}vw;--d:${1.8 + Math.random() * 2}s;--w:${Math.random() * 1.2}s;--c:hsl(${Math.floor(Math.random() * 360)} 85% 60%);--r:${Math.floor(Math.random() * 720)}deg`;
    return i;
  });
  root.replaceChildren(
    h('div', { class: 'confetti' }, conf),
    h('div', { class: 'celeb-card' },
      h('div', { class: 'celeb-star' }, '🎉'),
      h('h2', {}, 'Lên cấp ' + lv + '!'),
      h('p', {}, `Thưởng ${fmt(lv * 20)} xu. Bạn giỏi quá!`),
      unlocked.length ? h('div', { class: 'unlock' }, h('div', { class: 'mini' }, 'Mới mở khóa'), h('div', { class: 'unlock-list' }, unlocked.map(u => h('div', { class: 'un' }, ico(u.key), h('span', {}, u.name))))) : null,
      btn('Tuyệt vời!', nextCelebration, 'orange big')));
  root.hidden = false;
  sound.play('levelup');
}
// ---------- Màn "Trong lúc bạn vắng nhà…" (away = s.away từ loadGame) ----------
export function closeAway() {
  awayOpen = false;
  const root = $('away');
  root.hidden = true; root.replaceChildren();
  if (newsWait) showWhatsNew(stOk());
}
// ---------- "Bản mới có gì đổi" (chỉ save chuyển từ v1, một lần; đợi màn vắng nhà đóng rồi mới hiện) ----------
const NEWS = [
  ['🔨', 'Chế độ xây dựng', 'Dời nhà, kho, chuồng, ruộng tùy ý ở nút 🔨.'],
  ['🏪', 'Chợ Bà Tư ra làng', 'Mua bán ở chợ trong làng, mở 6h–18h. Sạp hàng trong vườn không còn.'],
  ['📮', 'Thùng giao hàng', 'Bỏ nông sản vào thùng, 6h sáng lái buôn trả xu.'],
  ['⚡', 'Thể lực', 'Làm việc tốn thể lực. Ngồi ghế đá hoặc ngủ (từ 18h) để hồi.'],
  ['⛏️', 'Công cụ 3 cấp', 'Nâng cấp ở tiệm rèn để làm cả hàng, cả khối.'],
];
let newsOpen = false, newsWait = false;
const stOk = () => { try { return st(); } catch { return null; } };
export function closeNews() {
  newsOpen = false;
  const root = $('whatsnew');
  root.hidden = true; root.replaceChildren();
}
export function showWhatsNew(s) {
  if (newsOpen || creatorOpen || !s || !S.whatsNewDue(s)) return;
  if (awayOpen) { newsWait = true; return; }
  newsWait = false; newsOpen = true;
  S.markWhatsNew(s);
  const root = $('whatsnew');
  root.replaceChildren(h('div', { class: 'away-card', role: 'dialog', 'aria-label': 'Bản mới có gì đổi' },
    h('div', { class: 'away-ico' }, '🎉'),
    h('h2', {}, 'Bản mới có gì đổi'),
    h('ul', { class: 'away-list news-list' }, NEWS.map(([i, t, d]) => h('li', {}, h('span', { class: 'ico emo' }, i), h('span', {}, h('b', {}, t + ':'), ' ', d)))),
    h('p', { class: 'mini' }, 'Xem lại trong 🎒 Túi đồ > Sổ tay hướng dẫn.'),
    btn('Hiểu rồi!', () => { sound.play('pop'); closeNews(); }, 'orange big')));
  root.hidden = false;
  sound.play('levelup');
}
export function showAway(away) {
  if (!away || awayOpen || creatorOpen) return;
  awayOpen = true;
  const root = $('away'), frozen = l => l.startsWith('Vườn đã đóng băng');
  const gone = spanOf(away.ms);
  root.replaceChildren(h('div', { class: 'away-card', role: 'dialog', 'aria-label': 'Trong lúc bạn vắng nhà' },
    h('div', { class: 'away-ico' }, '🏡'),
    h('h2', {}, 'Trong lúc bạn vắng nhà…'),
    h('p', { class: 'away-sub' }, `Bạn đã đi ${gone}.`),
    away.lines.length
      ? h('ul', { class: 'away-list' }, away.lines.map(l => h('li', { class: frozen(l) ? 'cold' : '' }, h('span', { class: 'ico emo' }, frozen(l) ? '❄️' : '•'), h('span', {}, l))))
      : h('p', { class: 'mini' }, 'Mọi thứ vẫn yên ổn, không có gì đặc biệt.'),
    away.frozenMs > 0 ? h('p', { class: 'mini' }, 'Vườn chỉ chạy tối đa 8 giờ khi bạn đi vắng, phần còn lại được giữ nguyên.') : null,
    btn('Về làm việc thôi!', () => { sound.play('pop'); closeAway(); }, 'orange big')));
  root.hidden = false;
  sound.play('levelup');
}
function spanOf(ms) {
  const tot = Math.round(ms / 60000), hr = Math.floor(tot / 60), m = tot % 60;
  return hr ? `${hr} giờ${m ? ' ' + m + ' phút' : ''}` : `${Math.max(1, m)} phút`;
}
export function handleEvents(events) {
  if (!events || !events.length) return;
  const hasToast = events.some(e => e.type === 'toast');
  let logged = 0;
  for (const e of events) {
    switch (e.type) {
      case 'toast': pushToast(e.text); break;
      case 'log': if (!hasToast && logged++ < 2) pushToast(e.text); break;
      case 'sound': sound.play(e.name); break;
      case 'levelup': celebQueue.push(e.level); if (!celebOpen) nextCelebration(); break;
      case 'achievement': showBadge(e); break;
    }
    notifier(e, Date.now());
  }
}

// ---------- 🔴 Báo gấp: băng rôn đỏ + tiếng + rung + mũi tên ở mép màn hình ----------
// Lấy chỗ gấp từ state (S.urgentSpots) nên bản lưu đang có sự cố cũng báo; hiện ở mọi bản đồ.
const BANNER_MS = 8000;
let seenUrgent = new Set(), bannerUntil = 0, bannerOff = false;
function arrowEl(key) {
  const box = $('alert-arrows');
  let el = [...box.children].find(c => c.dataset.key === key);
  if (!el) {
    el = h('canvas', { class: 'alert-arrow', width: 12, height: 12 });
    el.dataset.key = key;
    const src = SPR2?.alertArrow;
    if (src) el.getContext('2d').drawImage(src, 0, 0); else { const c = el.getContext('2d'); c.fillStyle = '#e5452f'; c.fillRect(0, 3, 12, 6); }
    box.append(el);
  }
  return el;
}
// toScreen(x, y): toạ độ bản đồ đang đứng → px CSS trên màn hình
export function updateAlerts(s, toScreen, nowMs = performance.now()) {
  const spots = S.urgentSpots(s), urgent = todoList(s).filter(i => i.level === 'urgent'), keys = new Set(spots.map(p => p.key));
  if (spots.some(p => !seenUrgent.has(p.key))) {
    sound.play('alarm');
    try { navigator.vibrate?.([220, 90, 220]); } catch { /* máy không rung */ }
    bannerUntil = nowMs + BANNER_MS; bannerOff = false;
  }
  seenUrgent = keys;
  const bn = $('alert-banner'), on = spots.length > 0 && !bannerOff && nowMs < bannerUntil;
  if (on) {
    const text = (spots.length === 1 ? spots[0].text : `${spots.length} sự cố trong vườn!`) + (s.scene === 'farm' ? '' : ' Về vườn ngay!');
    if (bn.textContent !== text) bn.textContent = text;
  }
  bn.hidden = !on;
  document.body.classList.toggle('alerting', on);
  const rootBox = $('alert-arrows');
  if (!urgent.length && !rootBox.firstChild) return;   // không có gì gấp: khỏi đo bố cục mỗi khung hình
  const hud = $('hud').getBoundingClientRect(), bar = $('bottombar').getBoundingClientRect();
  const box = { l: 0, t: hud.bottom + 4, r: innerWidth, b: bar.top - 4 };
  const live = new Set();
  for (const t of arrowTargets(s, urgent)) {
    const a = arrowFor(toScreen(t.x, t.y), box, 22), el = arrowEl(t.key);
    el.hidden = !a;
    if (!a) continue;
    live.add(t.key);
    el.style.transform = `translate(${(a.x - 18).toFixed(1)}px, ${(a.y - 18).toFixed(1)}px) rotate(${a.ang.toFixed(4)}rad)`;
    el.dataset.ang = String(Math.round(a.ang * 180 / Math.PI));
  }
  for (const el of [...rootBox.children]) if (!live.has(el.dataset.key)) el.remove();
}
export function dismissBanner() { bannerOff = true; $('alert-banner').hidden = true; document.body.classList.remove('alerting'); }

// ---------- Khởi tạo ----------
export function initUI(a) {
  api = a;
  for (const b of document.querySelectorAll('.bb-btn[data-panel]')) b.addEventListener('click', () => { sound.play('click'); openPanel(b.dataset.panel); });
  $('bb-seed').addEventListener('click', () => { sound.play('click'); openPanel('seeds'); });
  $('main-action').addEventListener('click', () => runAction(cur.actions[0]));
  $('alert-banner').addEventListener('click', dismissBanner);
  $('minimap').addEventListener('click', () => { if (!isBlocking()) openPanel('map'); });
  $('todo-btn').addEventListener('click', () => { if (!isBlocking()) openPanel('todo'); });
  $('hud-speed').addEventListener('click', () => {
    const s = st(), i = D.SPEEDS.indexOf(s.speed);
    s.speed = D.SPEEDS[(i + 1) % D.SPEEDS.length];
    sound.play('pop');
    renderHUD(s);
  });
  // Chặn zoom bằng cử chỉ trên iOS
  for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, e => e.preventDefault());
  document.addEventListener('click', e => {
    const b = e.target.closest?.('button');
    if (!b) return;
    if (!b.classList.contains('nosound')) sound.play('click');
    if (!b.disabled) setTimeout(() => b.blur(), 0); // tránh Space bấm lại nút
  });

  $('bb-build').addEventListener('click', () => { if (!isBlocking()) api.buildStart(); });
  $('build-done').addEventListener('click', () => api.buildDone());
  $('build-cancel').addEventListener('click', () => api.buildCancel());
  $('build-store').addEventListener('click', () => api.buildStore());

  addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (awayOpen) closeAway();
      else if (newsOpen) closeNews();
      else if (dialogResolve) dialogResolve(false);
      else if (building) api.buildCancel();
      else if (panel) closePanel();
      return;
    }
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isBlocking()) return;
    if (e.code === 'Space' || e.key === 'e' || e.key === 'E') {
      if (cur.actions[0]) { e.preventDefault(); runAction(cur.actions[0]); }
    } else if (/^[1-6]$/.test(e.key)) {
      const c = cur.actions[Number(e.key)];
      if (c) runAction(c);
    }
  });
  try { const s = a.getState(); if (s) renderHUD(s); } catch { /* chưa có game */ }
}
