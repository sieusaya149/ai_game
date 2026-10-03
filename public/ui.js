// Giao diện: HUD, nút hành động, các bảng, tạo nhân vật, hướng dẫn.
import * as S from './state.js';
import * as art from './art.js';
import * as D from './data.js';
import * as sound from './sound.js';
import { SPR2 } from './art2.js';
import { SPR3 } from './art3.js';
import * as R from './render.js';
import { createNotifier, arrowTargets, arrowFor } from './notify.js';
import { todoList } from './todo.js';
import { drawMini } from './minimap.js';
import * as net from './net.js';
import { hdOf, charFrames } from './hd.js';
import { COURIER_ART } from './artcourier.js';

// Kiểu A: ảnh DOM có kích thước do CSS quyết định nên dùng thẳng bản 2x (nét hơn, cỡ không đổi)
const hd = im => (im && hdOf(im)) || im;

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
  trung: '🥚', trung_phoi: '🐣', trung_vit: '🥚', trung_vit_phoi: '🐣', sua: '🥛', len: '🧶', sua_ngon: '🥛', len_xoan: '🧶', pesticide: '🧴', growth: '🧪', fertilizer: '🌿', medicine: '💊', vaccine: '💉', vitamin: '💊',
  feed_ga: '🌽', feed_heo: '🥣', hay: '🌾', dogfood: '🦴', catfood: '🐟',
  deco_scarecrow: '🧑‍🌾', deco_flower: '🌸', deco_lamp: '🏮', deco_bench: '🪑', deco_lowfence: '🚧', deco_rattrap: '🪤', deco_canopy: '⛱️',
  wood: '🪵', stone: '🪨', soap: '🧼', manure: '💩',
  ga: '🐔', vit: '🦆', heo: '🐖', bo: '🐄', cuu: '🐑', dog: '🐕', meo: '🐈', cathouse: '🏠',
};
const ITEM3 = { soap: 'soapBar', manure: 'manure', medicine: 'medicine', vaccine: 'vaccine', treat: 'treat', deco_rattrap: 'ratTrap', catfood: 'catfood' };
const iconCache = new Map();
function iconUrl(key) {
  if (iconCache.has(key)) return iconCache.get(key);
  let u = null;
  try { const A = art.SPR, src = A.items[key] || A.ripe[key] || A.product[key] || A.baby[key]?.left[0] || A.animal[key]?.left[0] || A[key]; u = (hdOf(src) ? hdOf(src).toDataURL() : art.icon(key)) || null; } catch { u = null; }
  if (!u) try { u = ({ trung_phoi: SPR3?.eggFertile, trung_vit_phoi: SPR3?.eggDuckFertile, trung_vit: SPR3?.eggDuck, vit: SPR3?.animal?.vit?.non?.left?.[0], meo: SPR3?.animal?.meo?.truong?.left?.[0], cathouse: SPR3?.cathouse?.[0] }[key] ?? SPR2?.[key]); u = hd(u)?.toDataURL?.() || null; } catch { u = null; }   // vật phẩm chỉ có icon trong art2 (gỗ, đá), trứng có phôi ở art3
  if (!u) try { u = hd(SPR3?.items?.[ITEM3[key]])?.toDataURL?.() || null; } catch { u = null; }   // xà phòng, phân chuồng vẽ ở art3
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
    for (const pen of Object.keys(D.PEN_PRICES)) {
      const lv = S.penLevel(pen), low = level(s) < lv, n = s.farm.ents.filter(e => e.kind === 'pen' && e.pen === pen).length, max = S.penLimit(s, pen), nx = S.penNextLevel(s, pen);
      const full = !low && n >= max;
      cards.push(card({ kind: 'pen', pen }, penIco(pen), low ? PEN_NAME2[pen] : `${PEN_NAME2[pen]} ${n}/${max}`,
        low ? `Cần cấp ${lv}` : full ? (nx ? `Cấp ${nx} để có thêm` : 'Đã tối đa') : `🪙 ${fmt(D.PEN_PRICES[pen])}`, low || full));
    }
    // nhà mèo (issue 44): không phải chuồng có rào nhưng xây ở cùng khay
    for (const kind of Object.keys(D.BUILD_PRICES)) {
      const lv = S.penLevel(kind), low = level(s) < lv, n = s.farm.ents.filter(e => e.kind === kind).length, max = S.penLimit(s, kind), nx = S.penNextLevel(s, kind);
      const full = !low && n >= max;
      cards.push(card({ kind }, ico(kind), low ? PEN_NAME2[kind] : `${PEN_NAME2[kind]} ${n}/${max}`,
        low ? `Cần cấp ${lv}` : full ? (nx ? `Cấp ${nx} để có thêm` : 'Đã tối đa') : `🪙 ${fmt(D.BUILD_PRICES[kind])}`, low || full));
    }
  } else {
    for (const k of Object.keys(s.inv || {})) if (s.inv[k] > 0 && D.ITEMS[k]?.kind === 'deco') cards.push(card({ kind: 'deco', item: k }, ico(k), D.ITEMS[k].name, `Có ×${s.inv[k]}`));
    empty = 'Chưa có đồ trang trí. Mua ở Chợ Bà Tư nhé.';
  }
  const tab = (id, label) => h('button', { class: 'bt-tab' + (trayTab === id ? ' on' : ''), type: 'button', on: { click: () => { trayTab = id; api.buildPick(null); } } }, label);
  $('build-tray').replaceChildren(
    h('div', { class: 'bt-tabs' }, tab('field', 'Ruộng'), tab('pen', 'Chuồng'), tab('deco', 'Trang trí')),
    cards.length ? h('div', { class: 'bt-list' }, cards) : h('div', { class: 'bt-empty' }, empty));
}
const PEN_NAME2 = { chicken: 'Chuồng gà', pig: 'Chuồng heo', pasture: 'Đồng cỏ bò cừu', quarantine: 'Chuồng cách ly', cathouse: 'Nhà mèo' };
const penIco = pen => (pen === 'quarantine' ? h('span', { class: 'ico emo' }, '🏥') : ico({ chicken: 'ga', pig: 'heo', pasture: 'bo' }[pen]));
// Nút Cất cho món đang chạm (label = tên món, null = ẩn)
export function buildSel(label, up) {   // label: món cất được (nút Cất); up: S.upgradeInfo của chuồng đang chọn (nút Nâng cấp)
  const b = $('build-store'), u = $('build-upgrade');
  b.hidden = !label;
  if (label) b.textContent = `Cất ${label.toLowerCase()}`;
  u.hidden = !up;
  if (up) { u.textContent = `⬆️ Nâng lên cấp ${up.lv} (🪙 ${fmt(up.price)})`; u.classList.toggle('dim', !!up.error); }
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
// icon: canvas pixel art hiện trước chữ (vd quà ở cổng).
function pushToast(text, cls = '', key = '', icon = null) {
  const box = $('toasts');
  if (!box || !text) return;
  const body = () => (icon ? [canvasIco(icon, 'toast-ico'), h('span', {}, text)] : [text]);
  const old = key && [...box.children].find(c => c.dataset.key === key);
  if (old) {
    old.replaceChildren(...body());
    old.style.animation = 'none'; void old.offsetWidth; old.style.animation = '';
    clearTimeout(old._t); old._t = setTimeout(() => old.remove(), 2800);
    return;
  }
  const dup = [...box.children].find(c => c.textContent === text);
  if (dup) dup.remove();
  const t = h('div', { class: 'toast ' + cls }, ...body());
  if (key) t.dataset.key = key;
  box.append(t);
  while (box.children.length > 3) box.firstChild.remove();
  t._t = setTimeout(() => t.remove(), 2800);
}
// Pixel art (canvas) thành thẻ <canvas> dùng được trong DOM
function canvasIco(src, cls = 'ico') {
  src = hd(src);
  const c = h('canvas', { class: cls, width: src.width, height: src.height });
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}
const TOAST_ICON = { gift: () => SPR2?.giftIcon, delivered: () => COURIER_ART?.box };   // sprite riêng cho vài loại thông báo
// 🟡 toast nhỏ, tự gộp cùng khóa; loại nào tắt trong cài đặt (s.notify) thì bỏ qua
const notifier = createNotifier({ show: (id, text, e) => pushToast(text, '', 'n' + id, TOAST_ICON[e.type]?.() ?? null), on: cat => !cat || S.notifyOn(st(), cat) });
// Tin từ server (quà, lời nhắn ở cổng): đi qua cùng đường gộp toast như event của luật chơi
export const netEvent = e => notifier(e, Date.now());
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

// ---------- Bắt được trộm: chọn kiểu phạt (issue 46) ----------
// info = S.punishInfo(state). Đóng hộp mà không chọn thì mặc định bắt đền xu, khỏi mất công.
export function askPunish(info) {
  if (!info) return Promise.resolve(null);
  return new Promise(resolve => {
    const root = $('dialog-root');
    const done = id => {
      root.hidden = true; root.replaceChildren(); dialogResolve = null;
      const r = S.punishThief(st(), id || 'pay');
      if (r.msg) toast(r.msg);
      sound.play(r.ok ? (id === 'chore' ? 'pop' : 'coin') : 'error');
      resolve(r);
    };
    dialogResolve = () => done('pay');
    // ảnh kẻ bị bắt: Tí Sún có dáng "bị bắt" riêng, thằng Tèo dùng nhân vật dựng sẵn
    const face = hd(info.kind === 'tisun' ? R.tisunImg('caught') : charFrames(R.TEO_LOOK)?.[0]?.[0]);
    const pic = face && h('canvas', { class: 'thumb', width: face.width, height: face.height });
    if (pic) pic.getContext('2d').drawImage(face, 0, 0);
    const line = o => btn([spriteIcon(SPR3?.punishIcon?.[o.id]) ?? o.icon, ' ', o.label],
      () => { if (!o.disabled) done(o.id); }, o.id === 'pay' ? 'green' : 'plain',
      o.disabled ? { disabled: true, title: o.disabled } : {});
    root.replaceChildren(h('div', { class: 'dialog punish' },
      pic,
      h('div', { class: 'dialog-text' }, `Bắt được ${info.name} trong vườn! Phạt thế nào đây?`),
      h('div', { class: 'punish-opts' }, ...info.options.map(line)),
      h('div', { class: 'dialog-err' }, info.options.find(o => o.disabled)?.disabled ?? '')));
    root.hidden = false;
  });
}
// Sprite 16x16 thành <canvas> nhỏ cho nút bấm; chưa có art thì trả null để dùng emoji
function spriteIcon(im) {
  if (!im) return null;
  im = hd(im);
  const c = h('canvas', { class: 'ico', width: im.width, height: im.height });
  c.getContext('2d').drawImage(im, 0, 0);
  return c;
}

// ---------- Đặt tên con vật ----------
// Trả về true nếu đã đổi tên. Tên rỗng hoặc dài quá thì báo lỗi ngay trong hộp, không đóng.
export function askRename(id) {
  const a = st().animals.find(x => x.id === id);
  if (!a) return Promise.resolve(false);
  return new Promise(resolve => {
    const root = $('dialog-root');
    const done = v => { root.hidden = true; root.replaceChildren(); dialogResolve = null; resolve(v); };
    dialogResolve = done;
    const input = h('input', { class: 'name-input', type: 'text', value: a.name, autocomplete: 'off', 'aria-label': 'Tên con vật' });
    const err = h('div', { class: 'dialog-err', role: 'alert' });
    const ok = () => {
      const r = S.renameAnimal(st(), id, input.value);
      if (!r.ok) { err.textContent = r.msg; sound.play('error'); return; }
      sound.play('pop'); done(true); refreshPanel();
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
    root.replaceChildren(h('div', { class: 'dialog' },
      h('div', { class: 'dialog-text' }, `Đặt tên cho ${S.animalLabel(a)}`),
      input, err,
      h('div', { class: 'dialog-btns' }, btn('Thôi', () => done(false), 'plain'), btn('Lưu tên', ok, 'green', { id: 'name-ok' }))));
    root.hidden = false;
    input.focus(); input.select();
  });
}

// ---------- Xem trước nhân vật ----------
function makePreview(getLook, scale = 6) {
  const c = h('canvas', { class: 'preview', width: 32, height: 48 });   // khung 2x, CSS giữ cỡ cũ
  c.style.width = 16 * scale + 'px';
  c.style.height = 24 * scale + 'px';
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const DIRS = [0, 2, 3, 1];
  let t = 0, iv;
  const draw = () => {
    if (t > 3 && !c.isConnected) return clearInterval(iv);
    try {
      const frames = charFrames(getLook());
      const d = DIRS[Math.floor(t / 10) % 4], im = frames[d][[0, 1, 0, 2][t % 4]];
      g.clearRect(0, 0, 32, 48);
      g.drawImage(hd(im), 0, 0, 32, 48);
    } catch { /* art chưa sẵn sàng */ }
    t++;
  };
  iv = setInterval(draw, 170);
  draw();
  return c;
}
function thumb(look) {
  const c = h('canvas', { class: 'thumb', width: 32, height: 48 });
  try { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(hd(charFrames(look)[0][0]), 0, 0, 32, 48); } catch {}
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
    const old = charFrames(look)[0][0], src = hdOf(old);
    const c = $('hud-avatar'), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    // bản 2x: cắt mặt 22x22, phóng x2 cho vừa 44 (điểm đều); thiếu thì như cũ: đầu + vai
    if (src) g.drawImage(src, 5, 4, 22, 22, 0, 0, 44, 44);
    else g.drawImage(old, 0, 0, 16, 15, 0, 0, 44, 41);
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
    const ic = hd(SPR2?.[tired ? 'staminaTired' : 'stamina']), cv = $('hud-stam-ico'), cx = cv.getContext('2d');
    if (ic) { cv.width = ic.width; cv.height = ic.height; cx.drawImage(ic, 0, 0); } else cx.clearRect(0, 0, cv.width, cv.height);
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
  if (!/Ngày/i.test(clock)) clock = `Ngày ${S.dayOf(s)} · ${clock}`;
  setText('hud-time', clock);
  const se = S.seasonOf(s);
  if (memo.get('hud-season') !== se.key) {
    memo.set('hud-season', se.key);
    setText('hud-season', se.name);
    const ic = hd(SPR2?.season?.[se.key]), cv = $('hud-season-ico'), cx = cv.getContext('2d');
    if (ic) { cv.width = ic.width; cv.height = ic.height; cx.drawImage(ic, 0, 0); } else cx.clearRect(0, 0, cv.width, cv.height);
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
  setText('hud-speed', `⏩ x${S.speedOf(s)}`);
  $('hud-speed').hidden = s.mode === 'online';   // online luôn x1

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
  updateCoUtQuest(s);
  if (panel === 'market' && S.marketOpen(s) !== marketWasOpen) refreshPanel();   // chợ vừa đóng/mở cửa khi đang xem
  if (panel === 'order') {   // đơn vừa lên đường / vừa tới kho thì vẽ lại bảng; còn không thì chỉ đổi giờ dự kiến
    const pend = S.pendingDeliveries(s);
    if (orderKey !== JSON.stringify(pend.map(d => [d.id, d.onWay]))) refreshPanel();
    else for (const d of pend) { const e = document.querySelector(`[data-eta="${d.id}"]`); if (e) e.textContent = etaText(d); }
  }
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

// ---------- Nhiệm vụ làm quen của Cô Út: tắm → chữa bệnh → vắc-xin khi mua con heo đầu tiên (issue 48) ----------
const COUT_TEXT = {
  bathe: 'Tắm cho một con vật nuôi: chạm vào con vật rồi chọn Tắm (cần xà phòng và nước trong bình, mua xà phòng ở chợ Bà Tư).',
  cure: 'Chữa cho một con vật đang bệnh: cho uống thuốc thú y, hoặc gọi bác sĩ ở điện thoại trong nhà nếu nguy kịch (mua thuốc ở trạm thú y Cô Út trong làng).',
  vaccinate: 'Tiêm vắc-xin cho một con vật khỏe mạnh để phòng bệnh (mua vắc-xin ở trạm thú y Cô Út).',
};
let coutKey = '';
function updateCoUtQuest(s) {
  const box = $('coutquest');
  if (!box) return;
  const q = S.coUtQuestInfo(s);
  if (!q || q.done) {
    if (q?.done && coutKey !== 'done') pushToast('Cô Út: Giỏi lắm, bạn đã biết chăm heo rồi đó! 🐷');
    box.hidden = true; coutKey = q?.done ? 'done' : '';
    return;
  }
  const key = q.step + q.id;
  if (coutKey === key && !box.hidden) return;
  coutKey = key;
  box.hidden = false;
  box.replaceChildren(
    h('div', { class: 'tut-step' }, `Cô Út: bước ${q.step + 1}/${q.total}`),
    h('div', { class: 'tut-text' }, COUT_TEXT[q.id]),
    h('button', { class: 'tut-x', type: 'button', title: 'Bỏ qua bước này', on: { click: () => { S.skipCoUtQuest(st()); commit(); } } }, '✕'));
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
  const a = cur.actions[0];
  if (a.disabled && (target.kind === 'strip' || target.kind === 'lockedPlot')) name = `${name ? name + '. ' : ''}${a.disabled}`;   // đất chưa mua được: nói luôn vì sao
  nm.hidden = !name;
  nm.textContent = name || '';
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
  PANELS[id].open?.();
  sound.play('pop');
}
function closePanel() {
  if (!panel) return;
  PANELS[panel].close?.();
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

function row({ icon, name, desc, right, locked, cls = '', data }) {
  const e = h('div', { class: 'row ' + cls + (locked ? ' locked' : '') },
    h('div', { class: 'row-ico' }, icon),
    h('div', { class: 'row-main' }, h('div', { class: 'row-name' }, name), desc && h('div', { class: 'row-desc' }, desc)),
    right && h('div', { class: 'row-act' }, right));
  if (data) for (const [k, v] of Object.entries(data)) e.dataset[k] = v;
  return e;
}
const empty = text => h('div', { class: 'empty' }, text);
const section = t => h('h3', { class: 'sec' }, t);
const coinTag = n => h('span', { class: 'price' }, '🪙 ' + fmt(n));

// ---------- Chọn màu lông chó, mèo ----------
// Mỗi nút là hình con vật trưởng thành đúng màu đó (dựng như trong vườn, bộ 2x nếu có); data-coat = khóa màu
function coatPicker(sp, cur, onPick, disabled = false) {
  return h('div', { class: 'coats', role: 'group', 'data-sp': sp }, Object.entries(D.COATS[sp]).map(([k, name]) => {
    const pet = { stage: 'truong', sex: 'f', coat: k }, im = hd(sp === 'cho' ? R.dogImg(pet, 'left', 0) : R.catImg(pet));
    const c = im && h('canvas', { width: im.width, height: im.height });
    c?.getContext('2d').drawImage(im, 0, 0);
    return h('button', { class: 'coat nosound' + (k === cur ? ' on' : ''), type: 'button', 'data-coat': k, 'aria-pressed': String(k === cur), title: name, disabled,
      on: { click: () => { sound.play('click'); onPick(k); } } }, c, h('span', {}, name));
  }));
}
// Hình con vật đúng giai đoạn và màu lông hiện tại, cho ô biểu tượng của hàng
function petIco(sp, a) {
  const im = hd(sp === 'cho' ? R.dogImg(a, 'left', 0) : R.catImg({ ...a, sleep: false, sun: false, trophy: null }));
  const c = h('canvas', { class: 'thumb', width: im?.width ?? 1, height: im?.height ?? 1 });
  if (im) c.getContext('2d').drawImage(im, 0, 0);
  return c;
}
let catCoat = D.COAT.def.meo;   // màu lông đang chọn để mua mèo ở chợ

// ---------- Chợ Bà Tư ----------
const PEN_NAME = { chicken: 'chuồng gà', pig: 'chuồng heo', pasture: 'bãi cỏ', cathouse: 'nhà mèo' };
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
        const n = S.penCount(s, a.pen), cap = S.penCap(s, a.pen);
        const locked = a.lv > lv, full = n >= cap;
        // mèo là thú cưng: bắt chuột, không bán được, phải có nhà mèo trước
        const what = a.pet ? 'thú cưng bắt chuột · không bán' : `${a.product ? 'cho ' + D.itemName(a.product).toLowerCase() : 'biết đẻ con'} · bán ${a.sell} xu`;
        list.append(row({
          icon: ico(type), name: a.baby, locked,
          desc: [`Trưởng thành sau ${D.stageStart(type, 'truong') / MIN} phút · ${what}`, h('br'), `Đang có ${n}/${cap} ở ${PEN_NAME[a.pen]}`, ...(S.breedAdvice(s, type) ? [h('br'), `💡 ${S.breedAdvice(s, type)}`] : []),
            type === 'meo' && !locked && coatPicker('meo', catCoat, k => { catCoat = k; refreshPanel(); })],
          right: locked ? h('span', { class: 'lock' }, '🔒 Cấp ' + a.lv)
            : h('div', { class: 'sexbuy' }, ['m', 'f'].map(sex => h('div', { class: 'sexopt' }, coinTag(D.animalPrice(type, sex)),
              btn(full ? (cap ? 'Đầy' : a.pet ? 'Chưa có nhà mèo' : 'Chưa có chuồng') : (sex === 'm' ? 'Mua ♂ đực' : 'Mua ♀ cái'), () => res(S.buyAnimal(st(), type, sex, type === 'meo' ? catCoat : undefined), 'coin')?.ok && (flags.bought = true), 'green sm', { disabled: shut || full || s.coins < D.animalPrice(type, sex), 'data-sex': sex })))),
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
    // thuốc thú y, vắc-xin chỉ bán ở trạm thú y Cô Út
    const items = Object.entries(D.ITEMS).filter(([id, it]) => it.kind === t && !D.VET_ITEMS.includes(id)).sort((a, b) => a[1].lv - b[1].lv);
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
  const src = hd(SPR2?.tools?.[k]?.[lv - 1]);
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

// ---------- Trạm thú y Cô Út: bán thuốc thú y và vắc-xin ----------
const SICK_TAG = S.SICK_NAME.map((n, i) => (i === 0 ? n : (i === 1 ? '🥱 ' : '🔴 ') + n));
const sickOnes = s => s.animals.filter(a => a.sick);
PANELS.vet = {
  title: '💊 Trạm thú y Cô Út',
  render(body, s) {
    const shut = !S.marketOpen(s), lv = level(s);
    if (shut) body.append(h('div', { class: 'note closed' }, `🔒 Cô Út nghỉ rồi. Trạm thú y mở từ ${D.MARKET.open}h tới ${D.MARKET.close}h nhé!`));
    body.append(h('div', { class: 'note' }, 'Cô Út: "Con vật mệt thì 1 liều thuốc là khỏi, bệnh nặng phải 2 liều. Nguy kịch thì gọi bác sĩ ở điện thoại trong nhà. Tiêm vắc-xin trước cho đỡ lo!"'));
    const list = h('div', { class: 'list' });
    body.append(list);
    for (const id of D.VET_ITEMS) {
      const it = D.ITEMS[id], locked = it.lv > lv;
      list.append(row({
        icon: ico(id), name: it.name, locked,
        desc: [it.desc, h('br'), `Đang có: ${have(s, id)}`],
        right: locked ? h('span', { class: 'lock' }, '🔒 Cấp ' + it.lv)
          : [coinTag(it.price), h('div', { class: 'qtys' },
            btn('×1', () => buyItem(id, 1), 'green sm', { disabled: shut || s.coins < it.price }),
            btn('×5', () => buyItem(id, 5), 'green sm', { disabled: shut || s.coins < it.price * 5 }))],
      }));
    }
    // đổi màu lông chó, mèo (góp ý người chơi): mỗi lần đổi tốn D.COAT.price xu
    body.append(section(`✂️ Tỉa lông, đổi màu lông (${D.COAT.price} xu một lần)`));
    const pets = h('div', { class: 'list', id: 'vet-coats' });
    body.append(pets);
    for (const [who, a, sp] of [['dog', s.dog, 'cho'], ...S.cats(s).map(c => [c.id, c, 'meo'])]) {
      pets.append(row({
        icon: petIco(sp, a), name: `${a.name} · lông ${D.COATS[sp][a.coat]?.toLowerCase() ?? ''}`,
        desc: coatPicker(sp, a.coat, k => res(S.setCoat(st(), who, k), 'coin'), shut || s.coins < D.COAT.price),
        data: { pet: String(who) },
      }));
    }
    const ill = sickOnes(s);
    body.append(section(ill.length ? `🤒 Đang bệnh (${ill.length})` : '🤒 Cả trại đang khỏe'));
    const who = h('div', { class: 'list' });
    body.append(who);
    if (!ill.length) who.append(empty('Không con nào bị bệnh. Giữ chuồng sạch và cho ăn đủ nhé!'));
    for (const a of ill) {
      who.append(row({
        icon: ico(a.type), name: `${a.name} · ${SICK_TAG[a.sick]}`,
        desc: a.sick === 2 ? `Đã uống ${a.dose || 0}/${D.SICK.doses[2]} liều` : a.sick >= 3 ? `Còn ${S.mmss(S.sickLeft(a))} — chỉ bác sĩ thú y cứu được` : 'Cho uống 1 liều thuốc là khỏi',
      }));
    }
  },
};
// ---------- Điện thoại trong nhà: gọi bác sĩ thú y ----------
PANELS.phone = {
  title: '📞 Điện thoại',
  render(body, s) {
    body.append(orderOpenBtn());
    body.append(h('div', { class: 'note' }, `Gọi bác sĩ thú y tới tận vườn: ${D.SICK.vetPrice} xu một lần, cứu được cả con bệnh nặng lẫn nguy kịch.`));
    const ill = sickOnes(s), list = h('div', { class: 'list' });
    body.append(list);
    if (!ill.length) return list.append(empty('Cả trại đang khỏe, chưa cần gọi bác sĩ.'));
    for (const a of ill) {
      list.append(row({
        icon: ico(a.type), name: `${a.name} · ${SICK_TAG[a.sick]}`,
        desc: a.sick >= 3 ? `Còn ${S.mmss(S.sickLeft(a))}` : a.sick === 1 ? 'Mệt nhẹ, bác sĩ khám là khỏi ngay (hoặc cho uống 1 liều thuốc)' : `Đã uống ${a.dose || 0}/${D.SICK.doses[2]} liều`,
        right: [coinTag(D.SICK.vetPrice), btn('Gọi bác sĩ', () => res(S.callVet(st(), a.id), 'coin'), 'green', { disabled: s.coins < D.SICK.vetPrice })],
      }));
    }
  },
};

// ---------- Đặt hàng online: chợ Bà Tư + trạm thú y Cô Út, người giao hàng mang tới kho ----------
// Phiếu đặt hàng (món → số) chỉ nằm ở giao diện; bấm "Đặt hàng" mới trừ xu (S.orderOnline).
let orderCart = {};
let orderKey = '';
const ORDER_TABS = [['seed', '🌱 Hạt giống'], ['supply', '🧴 Vật tư'], ['feed', '🌾 Thức ăn'], ['deco', '🪴 Trang trí'], ['vet', '💊 Thú y']];
tabs.order = 'seed';
const boxIco = () => (COURIER_ART?.box ? canvasIco(COURIER_ART.box, 'ico big') : h('span', { class: 'ico emo big' }, '📦'));
const itemsText = items => Object.entries(items).map(([k, n]) => `${itemLabel(k)} ×${n}`).join(', ');
const etaText = d => (d.onWay ? `🚚 Đang trên đường, còn ${S.mmss(d.eta)}` : `Dự kiến tới kho sau ${S.mmss(d.eta)}`);
const orderOpenBtn = () => h('button', { class: 'guide-open', id: 'open-order', type: 'button', on: { click: () => openPanel('order') } },
  boxIco(), h('b', {}, 'Đặt hàng online'), h('small', {}, 'Giao tận nhà kho'));
PANELS.order = {
  title: '🛒 Đặt hàng online',
  render(body, s) {
    const lv = level(s), pend = S.pendingDeliveries(s);
    orderKey = JSON.stringify(pend.map(d => [d.id, d.onWay]));
    body.append(h('div', { class: 'note' }, `Đặt hàng chợ Bà Tư và trạm thú y Cô Út lúc nào cũng được, người giao hàng mang tới tận nhà kho. Phí giao ${Math.round(D.DELIVERY.feePct * 100)}% tiền hàng (ít nhất ${D.DELIVERY.feeMin} xu). Chợ đóng cửa (${D.MARKET.close}h–${D.MARKET.open}h) thì sáng mai mới giao. Vật nuôi và quần áo vẫn phải ra làng mua.`));
    // đơn đang chờ giao
    body.append(section(`🚚 Đang chờ giao (${pend.length}/${D.DELIVERY.maxPending})`));
    const pl = h('div', { class: 'list', id: 'order-pending' });
    body.append(pl);
    if (!pend.length) pl.append(empty('Chưa có đơn nào đang chờ giao.'));
    for (const d of pend) {
      pl.append(row({
        icon: boxIco(), name: itemsText(d.items), cls: 'parcel', data: { order: d.id },
        desc: [h('span', { class: 'eta', 'data-eta': d.id }, etaText(d)), ` · đã trả ${fmt(d.total)} xu`],
      }));
    }
    // phiếu đặt hàng
    const q = S.orderQuote(s, orderCart), picked = Object.keys(q.items);
    body.append(section('🧾 Phiếu đặt hàng'));
    const cl = h('div', { class: 'list', id: 'order-cart' });
    body.append(cl);
    if (!picked.length) cl.append(empty('Chọn món ở dưới để thêm vào phiếu.'));
    for (const k of picked) {
      cl.append(row({
        icon: ico(k), name: `${itemLabel(k)} ×${q.items[k]}`, desc: `${fmt(D.ITEMS[k].price * q.items[k])} xu`,
        right: h('div', { class: 'qtys' },
          btn('−1', () => { orderCart[k] = q.items[k] - 1; if (orderCart[k] <= 0) delete orderCart[k]; sound.play('click'); refreshPanel(); }, 'plain sm nosound'),
          btn('✕', () => { delete orderCart[k]; sound.play('click'); refreshPanel(); }, 'plain sm nosound', { title: 'Bỏ món này' })),
      }));
    }
    if (picked.length) {
      const full = pend.length >= D.DELIVERY.maxPending, poor = s.coins < q.total;
      body.append(h('div', { class: 'sell-all order-total', id: 'order-total' },
        h('div', {}, `Tiền hàng ${fmt(q.cost)} + phí giao ${fmt(q.fee)} = `, h('b', {}, fmt(q.total) + ' xu')),
        btn('Đặt hàng', () => { const r = res(S.orderOnline(st(), orderCart), 'coin'); if (r?.ok) { orderCart = {}; refreshPanel(); } }, 'green', { disabled: full || poor, id: 'order-buy' })));
      if (full) body.append(h('div', { class: 'note closed' }, `Đang chờ giao ${D.DELIVERY.maxPending} đơn rồi, đợi hàng tới đã nhé!`));
      else if (poor) body.append(h('div', { class: 'note closed' }, 'Chưa đủ xu cho phiếu này.'));
    }
    // các món đặt được
    body.append(tabBar(ORDER_TABS, 'order'));
    const t = tabs.order, list = h('div', { class: 'list' });
    body.append(list);
    const ids = t === 'vet' ? D.VET_ITEMS : Object.keys(D.ITEMS).filter(id => D.ITEMS[id].kind === t && !D.VET_ITEMS.includes(id));
    for (const id of ids.filter(S.canOrder).sort((a, b) => D.ITEMS[a].lv - D.ITEMS[b].lv)) {
      const it = D.ITEMS[id], locked = it.lv > lv, inCart = orderCart[id] || 0;
      const add = n => { orderCart[id] = Math.min(D.DELIVERY.maxQty, inCart + n); sound.play('click'); refreshPanel(); };
      list.append(row({
        icon: ico(id), name: it.name, locked, data: { item: id },
        desc: [`Đang có: ${have(s, id)}`, inCart ? ` · trong phiếu: ${inCart}` : ''],
        right: locked ? h('span', { class: 'lock' }, '🔒 Cấp ' + it.lv)
          : [coinTag(it.price), h('div', { class: 'qtys' }, btn('+1', () => add(1), 'green sm nosound'), btn('+5', () => add(5), 'green sm nosound'))],
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
    body.append(orderOpenBtn());   // mua online từ bất cứ đâu
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
const HOUR = 60 * MIN;
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
  { title: 'Đực, cái và sinh sản', art: () => [SPR3?.animal?.gaTrong?.truong?.left?.[0], SPR3?.animal?.ga?.truong?.left?.[0], SPR3?.eggFertile, SPR3?.animal?.ga?.non?.left?.[0]],
    text: [`Mua con đực hay cái tùy bạn, con cái đắt hơn khoảng ${Math.round((D.BREED.femaleMul - 1) * 100)}%. Gà trống gáy lúc ${D.BREED.cockHour}h sáng.`,
      `Có gà trống trưởng thành thì chừng ${Math.round(D.BREED.fertile * 100)}% trứng có phôi. Chạm vào trứng, chọn Soi trứng để biết; chỉ trứng có phôi mới ấp nở được trong ổ ấp.`,
      'Heo, bò, cừu: cần 1 con đực VÀ 1 con cái trưởng thành, no (trên 30) và vui (trên 40), không bệnh, ở chung chuồng thì sinh con — nhớ mua đủ cả hai giới (mặc định hay mua nhầm toàn đực). Chạm vào con vật, dòng 💡 cho biết vì sao nó chưa sinh sản. Chuồng đầy thì dừng, nhớ nâng chuồng hoặc bán bớt.',
      'Ở chuồng gà có hai thứ gần nhau: mái chuồng chỉ là nhà của đàn gà (lớn lên khi nâng cấp chuồng), còn Ổ ấp trứng cạnh máng mới là chỗ chạm vào được — đặt trứng có phôi (cần gà trống) vào đó để nở gà con.',
      'Con sinh trong trại tự có tên theo mẹ. Xem cha mẹ, con cái và đổi tên ở Phả hệ vật nuôi.'] },
  { title: 'Vịt', art: () => [SPR3?.animal?.vit?.non?.left?.[0], SPR3?.animal?.vit?.nho?.left?.[0], SPR3?.animal?.vit?.truong?.left?.[0], SPR3?.animal?.vitDuc?.truong?.left?.[0], SPR3?.eggDuck],
    text: [`Vịt mở ở cấp ${D.ANIMALS.vit.lv}, nuôi chung chuồng gia cầm với gà nên sức chứa tính chung.`,
      'Vịt con lon ton đi thành hàng sau vịt mẹ. Vịt nhỡ đi khắp trại ban ngày như gà, tối tự về chuồng.',
      `Vịt mái trưởng thành đẻ trứng vịt (${D.PRODUCTS.trung_vit.price} xu, đắt hơn trứng gà); vịt già đẻ thưa dần. Có vịt cồ thì trứng có phôi, ấp nở ra vịt con.`,
      'Thả rông thì vịt hay đẻ giấu trong bụi — nhớ đi một vòng vườn nhặt trứng. Chuyện vịt bơi ở hồ để dành phần sau nhé.'] },
  { title: 'Chó Mực và dạy lệnh', art: () => [SPR3?.animal?.cho?.non?.left?.[0], SPR3?.animal?.cho?.nho?.left?.[0], SPR3?.animal?.cho?.truong?.left?.[0], SPR3?.animal?.cho?.gia?.left?.[0], SPR3?.items?.treat],
    text: ['Chó con nghịch và ỉa nhiều, chó nhỡ sủa lung tung nhưng đã học được lệnh, chó trưởng thành canh nhà đuổi trộm, chó già ngủ nhiều và nhìn xa kém hơn. Chó không bao giờ ra đi vì già.',
      `Chạm vào chó, chọn Dạy lệnh. Mỗi ngày game một buổi, mỗi buổi tốn 1 ${D.ITEMS.treat.name.toLowerCase()} (mua ở chợ Bà Tư). Bấm Khen đúng lúc kim chạy vào vạch xanh là đạt.`,
      `Chó vui thì học nhanh gấp đôi; chó đói hay buồn thì hay bỏ dở giữa chừng (vẫn mất bánh). Phải thuộc lệnh ${D.TRICKS.sit.name} trước rồi mới học lệnh khác.`,
      `Sáu lệnh: ${Object.values(D.TRICKS).map(t => `${t.icon} ${t.name} (${t.sessions})`).join(' · ')}. Thuộc đủ cả sáu thì chó không ăn xúc xích của người lạ.`,
      'Chạm vào chuồng chó (hoặc vào chó) để Xích hay Thả chó: xích thì chó chỉ canh 3 ô quanh chuồng và không nhận lệnh gác, lùa, đi theo; thả thì chó chạy rông canh cả vườn. Chó chưa lớn, đói hoặc buồn thì không canh nhà.'] },
  { title: 'Vòng đời', art: () => [SPR3?.animal?.ga?.non?.left?.[0], SPR3?.animal?.ga?.nho?.left?.[0], SPR3?.animal?.ga?.truong?.left?.[0], SPR3?.animal?.ga?.gia?.left?.[0]],
    text: [`Mỗi con vật lớn qua 4 giai đoạn: ${D.STAGE_NAME.non} → ${D.STAGE_NAME.nho} → ${D.STAGE_NAME.truong} → ${D.STAGE_NAME.gia}, mỗi giai đoạn một hình và nết riêng.`,
      'Tuổi tính theo giờ vườn thật sự chạy (đóng băng thì không già đi). Gà vịt sống nhanh nhất rồi tới heo, bò cừu sống lâu nhất; chó mèo không bao giờ ra đi vì già.',
      `Sắp vào giai đoạn già thì được báo trước khoảng ${D.AGING.warnMs / HOUR} giờ vườn để chuẩn bị hoặc bán đi. Con già đẻ thưa, cho ít sản phẩm hơn và hay ngủ.`] },
  { title: 'Tắm cho vật nuôi', lv: 2, art: () => [SPR3?.items?.soapBar, SPR3?.fx?.soap?.m?.[0], SPR3?.fx?.sparkleClean?.[0]],
    text: [`Con vật dơ dần theo giờ vườn, dơ hẳn sau khoảng ${D.DIRT.fullMs / HOUR} giờ; trời mưa hoặc chuồng bẩn thì nhanh gấp ${D.DIRT.fastMul} lần. Dơ từ ${D.DIRT.high} trở lên là mất vui, dễ bệnh hơn, sản phẩm kém.`,
      `Tắm tốn 1 ${D.ITEMS.soap.name.toLowerCase()} (mua ở chợ Bà Tư) và 1 nước trong bình tưới: sủi bọt, con vật lắc mình văng nước rồi sạch bong, +${D.DIRT.bathHappy} vui và thân hơn một chút.`,
      'Heo và bò đầm bùn thì dơ ngay nhưng không mất vui — đó là nét vui của chúng, tắm xong một lúc lại lăn bùn tiếp.'] },
  { title: 'Bệnh và thú y', art: () => [SPR3?.status?.warn, SPR3?.items?.medicine, SPR3?.items?.vaccine, SPR3?.quarantine],
    text: [`Bệnh qua 4 giai đoạn: ${S.SICK_NAME.join(' → ')}.`,
      `Mệt chữa bằng ${D.SICK.doses[1]} liều thuốc thú y, Bệnh nặng cần ${D.SICK.doses[2]} liều, Nguy kịch chỉ bác sĩ thú y mới cứu được (gọi qua điện thoại ở nhà, ${D.SICK.vetPrice} xu).`,
      'Bệnh nặng lây cho một con cùng chuồng; chuồng cách ly không lây và hồi bệnh nhanh hơn. Thuốc, vắc-xin mua ở trạm thú y Cô Út trong làng.',
      `Dưới cấp ${D.SICK.minLevel}, con vật không bệnh quá Mệt — người chơi mới được bảo hộ.`] },
  { title: 'Lùa về chuồng', lv: D.ANIMALS.vit.lv, art: () => [SPR3?.homeBoard, SPR3?.strayArrow, SPR3?.dogHerd?.left?.[0], SPR3?.animal?.meo?.truong?.left?.[0]],
    text: [`Chạng vạng (18h) gà vịt thả rông tự về chuồng, trừ ${D.FREE.strayPerDusk[0]}–${D.FREE.strayPerDusk[1]} con lạc 💤 ngủ ngoài tới sáng — không con nào gặp nguy hiểm chỉ vì chuyện này.`,
      `Lùa tay: đi vòng ra sau con lạc, đẩy nó về phía cửa chuồng. Nhanh hơn thì rải thóc ở cửa chuồng (tốn 1 bao cám), mọi con lạc trong ${D.FREE.lureRadius} ô quanh đó tự chạy về.`,
      `Chó học lệnh ${D.TRICKS.herd.name} (${D.TRICKS.herd.sessions} buổi) thì lùa cả đàn về chuồng trong khoảng ${D.TRAIN.herdMs / 1000} giây, và tự làm mỗi tối nếu no và vui.`,
      `Mèo không học lệnh nhưng cũng giúp được: mèo nhỡ trở lên đang vui (từ ${D.CAT.herdHappy}) thì chạm vào mèo, chọn Nhờ lùa — mỗi lần nó lùa 1 con gần nhất về chuồng.`] },
  { title: 'Kẻ săn mồi', lv: D.PREDATOR.minLevel, art: () => [SPR3?.rat?.left?.[0], SPR3?.hawk?.left?.[0], SPR3?.weasel?.left?.[0], SPR3?.status?.predIcon],
    text: [`Từ cấp ${D.PREDATOR.minLevel}: chuột ăn cám, trộm trứng và cắn con non; diều hâu cắp gà vịt con đang thả rông ban ngày; chồn bắt con ngủ ngoài chuồng lúc nửa đêm.`,
      `Đang chơi thì luôn được báo trước khoảng ${D.PREDATOR.warnMs / 1000} giây trước khi nó ra tay — chạm vào để đuổi là kịp, không ai bị hại.`,
      'Phòng chuột bằng bẫy chuột; phòng diều hâu bằng mái che sân; phòng chồn bằng đèn lồng hoặc lùa đàn vào chuồng trước khi ngủ. Chó canh nhà (đã trưởng thành, no và vui) đuổi được diều hâu và chồn — thấy dòng "Mực đuổi chồn đi rồi 🐕" là nó đang làm việc; còn chuột thì chó không đuổi, đã có mèo và bẫy chuột lo.',
      `Mèo mở cùng cấp với chuột (cấp ${D.ANIMALS.meo.lv}). Mèo trưởng thành khỏe mạnh trong trại làm chuột sinh ra thưa đi một nửa, và chạm vào mèo để xem nó đã bắt bao nhiêu con chuột.`] },
];
let guidePage = 0;
// Hệ thống mới chỉ hiện trang sổ tay khi người chơi tới cấp tương ứng (page.lv, thiếu = luôn hiện); không dội cả loạt lên người mới
const guidePages = s => GUIDE.filter(p => !p.lv || level(s) >= p.lv);
function guideIcon() {
  const c = h('canvas', { class: 'guide-ico', width: 12, height: 12 });
  const gb = hd(spr().guidebook);
  if (gb) { c.width = gb.width; c.height = gb.height; c.getContext('2d').drawImage(gb, 0, 0); }
  return c;
}
// Xếp các sprite thành một hàng trong canvas 160x56, mỗi cái vừa ô của nó
function guideArt(list) {
  const W = 160, H = 56, items = list.filter(Boolean);
  // canvas gấp đôi (CSS quyết định cỡ hiện): sprite có bản 2x thì vẽ bản đó, điểm 2x vẫn nguyên số
  const cv = h('canvas', { class: 'guide-art', width: W * 2, height: H * 2 }), g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.scale(2, 2);
  const slot = W / Math.max(1, items.length);
  items.forEach((im, i) => {
    const k = Math.min((H - 4) / im.height, (slot - 6) / im.width), z = k >= 1 ? Math.floor(k) : k;
    const w = Math.round(im.width * z), hh = Math.round(im.height * z);
    g.drawImage(hd(im), Math.round(slot * i + (slot - w) / 2), Math.round((H - hh) / 2), w, hh);
  });
  return cv;
}
PANELS.guide = {
  title: '📖 Sổ tay',
  render(body) {
    body.append(h('button', { class: 'guide-open', id: 'open-pedigree', type: 'button', on: { click: () => openPanel('pedigree') } }, h('span', { class: 'ico emo' }, '🌳'), h('b', {}, 'Phả hệ vật nuôi'), h('small', {}, 'Tên, cha mẹ, con của từng con')));
    const pages = guidePages(st()), n = pages.length; guidePage = Math.min(guidePage, n - 1);
    const p = pages[guidePage], go = d => { guidePage = (guidePage + d + n) % n; sound.play('click'); refreshPanel(); };
    body.append(
      h('div', { class: 'guide-dots' }, pages.map((q, i) => h('button', { class: 'guide-dot nosound' + (i === guidePage ? ' on' : ''), type: 'button', title: q.title, 'aria-label': q.title, on: { click: () => { guidePage = i; sound.play('click'); refreshPanel(); } } }))),
      h('div', { class: 'guide-page' }, guideArt(p.art()), h('h3', {}, p.title), p.text.map(t => h('p', {}, t))),
      h('div', { class: 'guide-nav' }, btn('◀ Trước', () => go(-1), 'plain sm nosound'), h('span', { class: 'mini' }, `Trang ${guidePage + 1}/${n}`), btn('Sau ▶', () => go(1), 'plain sm nosound')));
  },
};

// ---------- Phả hệ vật nuôi: tên, cha, mẹ, con của từng con; đổi tên ở đây hoặc ở hành động trên con vật ----------
const SEX_MARK = { m: '♂', f: '♀' };
const kin = r => r?.name ?? null;
PANELS.pedigree = {
  title: '🌳 Phả hệ vật nuôi',
  render(body, s) {
    if (!s.animals.length) return body.append(empty('Chưa có con vật nào. Mua ở chợ Bà Tư hoặc đợi gà ấp nở nhé!'));
    const list = h('div', { class: 'list' });
    body.append(list);
    const order = Object.keys(D.ANIMALS);
    for (const a of [...s.animals].sort((x, y) => order.indexOf(x.type) - order.indexOf(y.type) || x.id - y.id)) {
      const p = S.pedigree(s, a.id), note = S.breedNote(s, a);
      const born = p.mom || p.dad;
      list.append(h('div', { class: 'row ped-row', 'data-id': a.id },
        h('div', { class: 'row-ico' }, ico(a.type)),
        h('div', { class: 'row-main' },
          h('div', { class: 'row-name ped-name' }, `${a.name} ${SEX_MARK[a.sex] ?? ''}`),
          h('div', { class: 'row-desc' }, S.stageName(a), a.pregnant ? ' · đang mang thai 💕' : '', note ? ` · ${note}` : ''),
          h('div', { class: 'row-desc ped-kin' }, born ? [`Mẹ: ${kin(p.mom) ?? '?'} · Cha: ${kin(p.dad) ?? '?'}`] : 'Mua ở chợ hoặc chưa rõ cha mẹ'),
          p.kids.length ? h('div', { class: 'row-desc ped-kids' }, `Con: ${p.kids.map(k => `${k.name} ${SEX_MARK[k.sex] ?? ''}`).join(', ')}`) : null),
        h('div', { class: 'row-act' }, btn('✏️ Đổi tên', () => askRename(a.id), 'plain sm'))));
    }
  },
};

// ---------- Dạy lệnh cho chó Mực (issue 45) ----------
// Minigame chỉ gửi vào luật kết quả "đạt / không đạt"; mọi tiến độ do state.js quyết.
const trickIco = id => {
  let u = null;
  try { u = hd(SPR3?.trickIcon?.[id])?.toDataURL?.() || null; } catch { u = null; }
  return u ? h('img', { class: 'ico', src: u, alt: '', draggable: false }) : h('span', { class: 'ico emo' }, D.TRICKS[id].icon);
};
async function doTrain(id) {
  const r = S.trainStart(st(), id);
  if (!r.ok) { res(r); return; }
  commit();
  if (r.quit) { pushToast(r.msg, 'bad'); sound.play('error'); return; }
  const pass = await showTrain(id);
  res(S.trainResult(st(), id, pass), pass ? 'pop' : null);
}
function doCommand(id) {
  closePanel();
  api?.doAction({ kind: 'dog' }, 'cmd_' + id);
}
PANELS.dog = {
  title: '🐕 Dạy lệnh cho chó',
  render(body, s) {
    const g = s.dog, n = have(s, 'treat');
    body.append(h('div', { class: 'note' },
      `Mỗi ngày game dạy được một buổi, mỗi buổi tốn 1 bánh thưởng (đang có ${n}). ${g.name} đang vui ${Math.round(g.happy)}/100 — vui thì học nhanh, đói hay buồn thì hay bỏ dở giữa chừng.`));
    const list = h('div', { class: 'list' });
    body.append(list);
    for (const t of S.trickList(s)) {
      const right = t.done
        ? (t.auto ? h('span', { class: 'tick' }, '✓') : btn('Ra lệnh', () => doCommand(t.id), 'green sm', { 'data-cmd': t.id }))
        : btn(`Dạy buổi ${t.step + 1}`, () => doTrain(t.id), 'green', { disabled: !t.can.ok, 'data-train': t.id });
      list.append(row({
        icon: trickIco(t.id), name: `${t.name} · ${t.sessions} buổi`, locked: !t.done && !t.can.ok && t.can.reason === 'base',
        desc: [t.desc, h('br'), t.done ? (t.auto ? `${g.name} tự làm, không cần ra lệnh` : `Đã thuộc ${t.icon}`) : `Đã học ${t.step}/${t.sessions} buổi${t.can.ok ? '' : ' · ' + t.can.msg}`],
        right,
      }));
    }
  },
};
// Minigame "bấm đúng lúc": kim chạy qua lại trên thanh, bấm Khen khi kim nằm trong vạch xanh.
// Đạt TRAIN.need lượt trúng trong TRAIN.rounds lượt là xong buổi.
export function showTrain(trickId) {
  const T = D.TRAIN, tr = D.TRICKS[trickId], g = st().dog;
  return new Promise(resolve => {
    const root = $('dialog-root');
    let raf = 0, hits = 0, round = 1, zone = 0.1, t0 = performance.now(), live = true;
    const done = v => { live = false; cancelAnimationFrame(raf); root.hidden = true; root.replaceChildren(); dialogResolve = null; resolve(v); };
    dialogResolve = () => done(hits >= T.need);
    const mark = h('div', { class: 'train-mark', id: 'train-mark' });
    const zoneEl = h('div', { class: 'train-zone', id: 'train-zone' });
    const bar = h('div', { class: 'train-bar', id: 'train-bar' }, zoneEl, mark);
    const star = h('div', { class: 'train-praise' });
    const wrap = h('div', { class: 'train-wrap' }, bar, star);
    const score = h('div', { class: 'train-score', id: 'train-score' });
    const pup = h('canvas', { class: 'train-dog', id: 'train-dog', width: 48, height: 40 });
    // dùng pixel art làm nền cho thanh, vạch khen, kim và dấu khen
    const skin = (el, im) => { try { const u = hd(im)?.toDataURL?.(); if (u) el.style.backgroundImage = `url(${u})`; } catch { /* chưa có art thì dùng màu CSS */ } };
    skin(bar, SPR3?.trainBar?.track); skin(zoneEl, SPR3?.trainBar?.zone); skin(mark, SPR3?.trainBar?.mark);
    const newRound = () => {   // viền xanh/đỏ của lượt trước giữ nguyên tới khi bấm lượt sau
      zone = 0.06 + Math.random() * (0.88 - T.zone);
      zoneEl.style.left = (zone * 100) + '%'; zoneEl.style.width = (T.zone * 100) + '%';
      t0 = performance.now();
    };
    const setScore = () => { score.textContent = `Lượt ${Math.min(round, T.rounds)}/${T.rounds} · Khen trúng ${hits}/${T.need}`; };
    const pos = () => { const u = ((performance.now() - t0) % (T.sweepMs * 2)) / T.sweepMs; return u <= 1 ? u : 2 - u; };
    const drawPup = pose => {
      const c = pup.getContext('2d');
      c.imageSmoothingEnabled = false; c.clearRect(0, 0, pup.width, pup.height);
      const im = R.dogPoseImg(g, pose, 'right', Math.floor(performance.now() / 260));
      if (im) c.drawImage(hd(im), Math.round((pup.width - im.width * 2) / 2), pup.height - im.height * 2, im.width * 2, im.height * 2);
    };
    let pose = 'beg', poseUntil = 0, shown = 0;   // shown = chỗ kim đang hiện trên màn hình
    const loop = () => {
      if (!live) return;
      const p = shown = pos();
      mark.style.left = (p * 100) + '%';
      if (performance.now() > poseUntil) { pose = Math.floor(performance.now() / 1800) % 2 ? 'sit' : 'beg'; }
      drawPup(pose);
      raf = requestAnimationFrame(loop);
    };
    const praise = ok => {
      pose = ok ? 'sit' : 'bark'; poseUntil = performance.now() + 700;
      bar.classList.remove('good', 'bad');
      void bar.offsetWidth;
      bar.classList.add(ok ? 'good' : 'bad');
      if (ok) { skin(star, SPR3?.praise?.left?.[0]); star.style.left = mark.style.left; star.classList.add('on'); setTimeout(() => star.classList.remove('on'), 650); }
    };
    const tap = () => {
      if (!live || round > T.rounds) return;
      // chấm theo chỗ kim người chơi đang thấy: máy chậm thì khung hình thưa, kim vẽ trễ so với đồng hồ
      const p = shown, ok = p >= zone && p <= zone + T.zone;
      if (ok) hits++;
      sound.play(ok ? 'pop' : 'error');
      praise(ok);
      round++;
      setScore();
      if (round > T.rounds) { setTimeout(() => done(hits >= T.need), 650); return; }
      newRound();
    };
    root.replaceChildren(h('div', { class: 'dialog train' },
      h('div', { class: 'dialog-text' }, `${g.name} đang tập lệnh ${tr.name} ${tr.icon} — bấm Khen đúng lúc kim chạy vào vạch xanh!`),
      pup, wrap, score,
      h('div', { class: 'dialog-btns' },
        btn('Thôi', () => done(false), 'plain'),
        btn('👏 Khen!', tap, 'green', { id: 'train-hit' }))));
    root.hidden = false;
    newRound(); setScore(); loop();
  });
}

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
  ['crows', '🐦 Quạ đã đuổi'], ['thieves', '🕵️ Trộm đã bắt'], ['rats', '🪤 Chuột dính bẫy'], ['preds', '💨 Kẻ săn mồi đã đuổi'], ['orders', '📋 Đơn đã giao'], ['earned', '🪙 Tổng xu kiếm được'],
];
PANELS.house = {
  title: '🏠 Nhà của bạn',
  render(body, s) {
    body.append(tabBar([['wardrobe', '👕 Tủ đồ'], ['stats', '📊 Thống kê']], 'house'));
    if (tabs.house === 'stats') {
      const li = S.levelInfo(s.exp);
      const list = h('div', { class: 'stats' },
        h('div', { class: 'stat big' }, h('span', {}, '⭐ Cấp độ'), h('b', {}, li.level)),
        h('div', { class: 'stat big' }, h('span', {}, '📅 Ngày thứ'), h('b', {}, S.dayOf(s))),
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

// Huy hiệu pixel art của thành tựu xã hội (issue 32), mở / khóa; thành tựu khác dùng emoji
const achIcon = (a, done, cls = 'ico') => {
  const b = a?.badge && SPR2?.badges?.[a.badge];
  return b ? canvasIco(done ? b.on : b.off, cls + ' ach-badge') : h('span', { class: cls + ' emo' }, done ? '🏅' : '🔘');
};
PANELS.achievements = {
  title: '🏆 Thành tựu',
  render(body, s) {
    const list = h('div', { class: 'list' });
    for (const a of D.ACHIEVEMENTS) {
      const val = s.stats?.[a.stat] || 0, done = !!s.achievements?.[a.id] || val >= a.goal;
      list.append(row({
        icon: achIcon(a, done), name: a.name, cls: done ? 'done' : '',
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
// Nhật ký khách (issue 28, 30): ai đã giúp, ai đã trộm gì lúc mấy giờ. Dòng trộm có nút "Sang trộm lại 😤"
// đi thẳng qua làng tới vườn kẻ trộm; kẻ trộm chưa tới cấp 5 hay vườn mình còn nhỏ thì nút mờ kèm lý do.
const DOG_LINE = {
  bark: (g, dog) => `${dog} sủa vang đuổi ${g.by} lúc ${D.hourText(g.at)} 🐕`,
  bite: (g, dog) => `${g.by} bị ${dog} đớp lúc ${D.hourText(g.at)}, nộp phạt ${g.fine ?? D.GUARD.fine} xu 🐕`,
  sausage: (g, dog) => `${g.by} ném xúc xích cho ${dog} lúc ${D.hourText(g.at)}: ${g.ate ? 'nó mải ăn quên sủa' : 'nó không thèm'} 🌭`,
};
const GUEST_ICO = { steal: '😈', bark: '🐕', bite: '🐕', sausage: '🌭' };
const guestLine = (g, dog) => (DOG_LINE[g.kind] ? DOG_LINE[g.kind](g, dog)
  : g.kind === 'steal' ? `${g.by} đã trộm ${g.qty} ${D.itemName(g.item).toLowerCase()} lúc ${D.hourText(g.at)} 😤`
  : `${g.by} đã ${D.HELP_JOBS[g.act]?.verb ?? 'giúp'} giúp bạn lúc ${D.hourText(g.at)} 🙏`);
function revengeWhy(s, g) {
  if (s.mode !== 'online') return 'Chỉ sang vườn người khác được khi đang chơi trong làng';
  if (S.levelInfo(s.exp).level < D.GUEST.stealLv) return `Phải tới cấp ${D.GUEST.stealLv} mới đi trộm được`;
  if ((g.lv || 1) < D.GUEST.stealLv) return S.STEAL_SMALL;
  return null;
}
async function goRevenge(name) {
  closePanel();
  const r = await api.revenge(name);
  if (r?.ok || !r?.error) return;
  sound.play('error');
  pushToast(r.error);
}
PANELS.log = {
  title: '📜 Nhật ký',
  render(body, s) {
    const guests = s.guests ?? [];
    if (guests.length) {
      body.append(section('Khách ghé vườn'));
      for (const g of guests) {
        const why = g.kind === 'steal' ? revengeWhy(s, g) : null;
        body.append(h('div', { class: 'row guest-row' + (g.kind === 'steal' ? ' stolen' : ''), 'data-by': g.by },
          h('div', { class: 'row-ico' }, GUEST_ICO[g.kind] ?? '🙏'),
          h('div', { class: 'row-main' }, h('div', { class: 'row-name' }, guestLine(g, s.dog?.name ?? D.DOG.name))),
          g.kind === 'steal' && h('div', { class: 'row-act' },
            btn('😤 Sang trộm lại', () => goRevenge(g.by), 'red sm nosound revenge', { disabled: !!why, title: why ?? `Sang vườn ${g.by}` }))));
      }
      body.append(section('Nhật ký vườn'));
    }
    if (!(s.log || []).length) return body.append(empty(guests.length ? 'Vườn chưa có chuyện gì khác.' : 'Chưa có gì xảy ra. Ra ruộng làm việc thôi!'));
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
// ---------- Người đang ở cùng bản đồ (issue 25, vườn online) ----------
const LIVE_ICON = () => { try { return hd(SPR2?.onlineIcon)?.toDataURL?.() || null; } catch { return null; } };
PANELS.online = {
  title: '👥 Người đang ở đây',
  render(body, s) {
    const u = LIVE_ICON(), face = () => (u ? h('img', { class: 'ico', src: u, alt: '' }) : h('span', { class: 'ico emo' }, '🧑‍🌾'));
    const list = [...(api.people?.() ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    body.append(h('div', { class: 'note' }, s.scene === 'village' ? 'Bạn bè đang ở trong làng cùng bạn.' : 'Bạn đang ở ngoài làng: ra cổng vườn sang làng để gặp mọi người.'));
    body.append(row({ icon: face(), name: `${s.name} (bạn)`, desc: `Cấp ${level(s)}` }));
    for (const p of list) body.append(row({ icon: face(), name: p.name, desc: `Cấp ${p.level}`, cls: 'online-row' }));
    if (!list.length) body.append(empty('Chưa có ai khác ở đây.'));
  },
};

// ---------- Bạn bè và cổng vườn (issue 26) ----------
// Dữ liệu lấy từ server mỗi lần mở bảng (và sau khi thêm/xóa); chưa tải xong thì hiện "Đang tải"
const fr = { data: null, gates: null, err: '', msg: '', input: '' };
async function loadFriends() {
  const [f, g] = await Promise.all([net.friends(), net.gates()]);
  fr.data = f.ok ? f : null; fr.gates = g.ok ? g.gates : null;
  if (!(f.ok && g.ok)) fr.err = f.error || g.error || 'Không tải được danh sách.';
  if (panel === 'friends') refreshPanel();
}
// Bước vào vườn của `name` (issue 27): được thì đóng bảng, không thì báo lý do ngay trong bảng
async function visitGate(name) {
  const r = await api.visit(name);
  if (r.ok) { closePanel(); return; }
  if (!r.error) return;
  fr.err = r.error; fr.msg = '';
  sound.play('error');
  refreshPanel();
}
const friendIcon = (cls, text) => h('span', { class: 'fr-ico ' + cls, title: text, 'aria-label': text }, SPR2?.friendIcons?.[cls] ? h('img', { class: 'ico', src: hd(SPR2.friendIcons[cls]).toDataURL(), alt: '' }) : { ripe: '🍅', help: '🐛', on: '●', off: '○' }[cls]);
PANELS.friends = {
  title: '👫 Bạn bè',
  open() { fr.msg = ''; fr.err = ''; loadFriends(); },
  render(body) {
    const add = async e => {
      e?.preventDefault();
      const who = $('fr-input').value.trim();
      fr.input = who;
      if (!who) return;
      const r = await net.addFriend(who);
      fr.err = r.ok ? '' : r.error; fr.msg = r.ok ? `Đã thêm ${r.name} vào danh sách bạn.` : '';
      if (r.ok) fr.input = '';
      sound.play(r.ok ? 'pop' : 'error');
      await loadFriends();
    };
    body.append(h('form', { class: 'fr-add', on: { submit: add } },
      h('input', { id: 'fr-input', class: 'fr-input', type: 'text', maxlength: 24, placeholder: 'Tên hoặc mã kết bạn', autocomplete: 'off', value: fr.input, on: { input: e => { fr.input = e.target.value; } } }),
      h('button', { class: 'btn green sm', type: 'submit' }, 'Thêm')));
    if (fr.err) body.append(h('div', { class: 'note closed', role: 'alert', id: 'fr-err' }, fr.err));
    else if (fr.msg) body.append(h('div', { class: 'note', id: 'fr-msg' }, fr.msg));
    if (!fr.data) return body.append(empty(fr.err ? '' : 'Đang tải...'));
    body.append(h('div', { class: 'note' }, 'Mã kết bạn của bạn: ', h('b', { id: 'fr-code' }, fr.data.code), ' (đưa mã này cho bạn để họ thêm bạn)'));
    body.append(section('Bạn bè'));
    if (!fr.data.friends.length) body.append(empty('Chưa có bạn nào. Nhập tên hoặc mã kết bạn ở trên nhé.'));
    for (const f of fr.data.friends) {
      body.append(h('div', { class: 'row fr-row', 'data-name': f.name },
        h('div', { class: 'row-ico' }, friendIcon(f.online ? 'on' : 'off', f.online ? 'Đang online' : 'Đang offline')),
        h('div', { class: 'row-main' }, h('div', { class: 'row-name' }, f.name), h('div', { class: 'row-desc fr-state' }, `Cấp ${f.level} · ${f.online ? 'online' : 'offline'}`)),
        h('div', { class: 'fr-flags' }, f.ripe && friendIcon('ripe', 'Có đồ chín'), f.help && friendIcon('help', 'Cần giúp')),
        h('button', { class: 'btn red sm nosound fr-del', type: 'button', 'aria-label': `Xóa bạn ${f.name}`, on: { click: async () => {
          if (!await confirmBox(`Xóa ${f.name} khỏi danh sách bạn? Vườn của họ vẫn ở đó.`, 'Xóa', 'Giữ lại', true)) return;
          const r = await net.removeFriend(f.name);
          fr.err = r.ok ? '' : r.error; fr.msg = r.ok ? `Đã xóa ${f.name} khỏi danh sách bạn.` : '';
          await loadFriends();
        } } }, '✖')));
    }
    body.append(section('Cổng vườn trong làng'));
    if (!fr.gates?.length) return body.append(empty('Chưa có vườn nào khác trong làng.'));
    for (const g of fr.gates) body.append(h('div', { class: 'row gate-row' + (g.friend ? ' pinned' : ''), 'data-name': g.name },
      h('div', { class: 'row-ico' }, g.friend ? '📌' : '🚪'),
      h('div', { class: 'row-main' }, h('div', { class: 'row-name' }, `Vườn ${g.name}`), h('div', { class: 'row-desc' }, `Cấp ${g.level}${g.friend ? ' · bạn bè' : ''}`)),
      h('div', { class: 'row-act' }, btn('🚪 Vào', () => visitGate(g.name), 'green sm gate-go', { 'aria-label': `Vào vườn ${g.name}` }))));
  },
};
// ---------- Quà và sổ lưu bút ở cổng (issue 29) ----------
// Hộp quà và sổ nằm trên server nên chủ offline vẫn nhận được. Khách bấm hộp quà thì chọn món trong giỏ / kho để tặng,
// bấm sổ thì viết một dòng; chủ bấm thì nhận quà vào giỏ và đọc các dòng đã ký (mới nhất ở trên).
const gt = { box: null, notes: null, err: '', msg: '', text: '', busy: false, sent: new Set() };
const visitOwner = s => s?.visit?.owner ?? null;
const dayText = d => { const [, m, n] = String(d).split('-'); return n ? `${n}/${m}` : d; };
// Nắp hộp / sổ mở ra khi bảng đang mở (render.js đọc state.gate.open)
function gateOpen(id) { const s = stOk(); if (s) s.gate = { ...(s.gate ?? {}), open: id }; }
// Đếm lại quà, lời nhắn mới ở cổng vườn mình (đang thăm vườn người khác thì thôi)
export async function refreshGate() {
  const s = stOk();
  if (!s || s.mode !== 'online' || s.visit) return;
  const r = await net.gateNews();
  const cur = stOk();
  if (r.ok && cur && !cur.visit) cur.gate = { ...(cur.gate ?? {}), gifts: r.gifts, notes: r.notes };
}
const gateNote = body => {
  if (gt.err) body.append(h('div', { class: 'note closed', role: 'alert', id: 'gate-err' }, gt.err));
  else if (gt.msg) body.append(h('div', { class: 'note', id: 'gate-msg' }, gt.msg));
};
async function loadBox() {
  gt.box = null;
  const r = await net.myGifts();
  gt.box = r.ok ? r.gifts : [];
  if (!r.ok) gt.err = r.error;
  if (panel === 'giftbox') refreshPanel();
}
// Khách tặng qty món k: hàng đợi nằm trên server nên hỏi server trước, được rồi mới trừ khỏi giỏ / kho khách.
// Mã thao tác op tự chứa: cùng mã gửi lại (bấm hai lần, mạng chập chờn) chỉ tính một lần.
async function giveGift(k, qty) {
  const s = stOk(), owner = visitOwner(s);
  if (!s || !owner || gt.busy) return;
  const pre = S.giftCheck(s, null, k, qty);
  if (!pre.ok) { gt.err = pre.msg; gt.msg = ''; sound.play('error'); return refreshPanel(); }
  const op = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  gt.busy = true; refreshPanel();
  const r = await net.sendGift(owner, k, qty, op);
  gt.busy = false;
  if (!r.ok) { gt.err = r.error; gt.msg = ''; sound.play('error'); return refreshPanel(); }
  const cur = stOk();
  if (!cur) return;   // đã rời vườn trong lúc chờ mạng
  if (!gt.sent.has(op)) { gt.sent.add(op); S.giftTo(cur, [], k, qty, op); }
  gt.err = ''; gt.msg = `Đã bỏ ${qty} ${itemLabel(k).toLowerCase()} vào hộp quà của ${owner} 🎁`;
  sound.play('pop');
  commit();
}
// Chủ mở hộp: server chia theo chỗ trống trong giỏ (luật splitGifts của state.js), phần dư nằm lại hộp
async function takeAllGifts() {
  const s = stOk();
  if (!s || gt.busy) return;
  gt.busy = true; refreshPanel();
  const r = await net.takeGifts(Math.max(0, S.basketCap(s) - S.basketCount(s)));
  gt.busy = false;
  if (!r.ok) { gt.err = r.error; gt.msg = ''; sound.play('error'); return refreshPanel(); }
  const cur = stOk();
  if (!cur) return;
  const n = S.addGifts(cur, r.taken);
  gt.err = '';
  gt.msg = n ? `Đã nhận ${n} món` + (r.left ? ', giỏ đầy nên còn quà nằm lại trong hộp' : '') : r.left ? 'Giỏ đầy, về kho cất đồ rồi quay lại nhé' : 'Hộp quà đang trống';
  sound.play(n ? 'pop' : 'error');
  commit();
  await loadBox();
  refreshGate();
}
PANELS.giftbox = {
  title: '🎁 Hộp quà ở cổng',
  open() { gt.err = ''; gt.msg = ''; gateOpen('giftbox'); if (!visitOwner(stOk())) loadBox(); refreshPanel(); },
  close() { gateOpen(null); },
  render(body, s) {
    const owner = visitOwner(s);
    gateNote(body);
    if (!owner && s.mode !== 'online') return body.append(empty('Hộp quà ở cổng chỉ có khi bạn chơi trong làng.'));
    if (owner) {
      body.append(h('div', { class: 'note' }, `Chọn hạt giống hoặc nông sản trong giỏ / kho của bạn để bỏ vào hộp quà ở cổng vườn ${owner}. Mỗi lần tối đa ${D.GIFT.perGift} món.`));
      const keys = [...new Set([...Object.keys(s.basket || {}), ...Object.keys(s.inv || {})])].filter(k => S.giftable(k) && have(s, k) > 0).sort();
      const list = h('div', { class: 'list gift-list' });
      body.append(list);
      if (!keys.length) return list.append(empty('Giỏ và kho chưa có gì để tặng. Mua hạt giống ở chợ Bà Tư nhé!'));
      for (const k of keys) {
        const n = have(s, k), many = Math.min(n, D.GIFT.perGift);
        list.append(row({
          icon: ico(k, 'big'), name: `${itemLabel(k)} ×${n}`, desc: D.ITEMS[k]?.kind === 'seed' ? 'Hạt giống' : 'Nông sản',
          cls: 'gift-row', data: { item: k },
          right: h('div', { class: 'qtys' },
            btn('Tặng 1', () => giveGift(k, 1), 'green sm gift-1', { disabled: gt.busy }),
            many > 1 && btn(`Tặng ${many}`, () => giveGift(k, many), 'green sm gift-many', { disabled: gt.busy })),
        }));
      }
      return;
    }
    body.append(h('div', { class: 'sell-all' },
      h('div', {}, '🧺 Giỏ ', h('b', {}, `${S.basketCount(s)}/${S.basketCap(s)}`)),
      btn('Nhận hết vào giỏ', takeAllGifts, 'green', { id: 'gift-take', disabled: !gt.box?.length || gt.busy })));
    if (!gt.box) return body.append(empty('Đang tải...'));
    const list = h('div', { class: 'list gift-list' });
    body.append(list);
    if (!gt.box.length) return list.append(empty('Hộp quà đang trống. Bạn bè ghé vườn để quà ở đây nhé!'));
    for (const g of gt.box) list.append(row({ icon: ico(g.item, 'big'), name: `${itemLabel(g.item)} ×${g.qty}`, desc: `${g.from} tặng`, cls: 'gift-row', data: { item: g.item } }));
    body.append(h('p', { class: 'mini' }, 'Nông sản vào giỏ, hạt giống vào kho. Giỏ đầy thì phần dư nằm lại trong hộp, không mất đâu.'));
  },
};

async function loadNotes() {
  const s = stOk();
  if (!s || s.mode !== 'online') return;
  gt.notes = null;
  const r = await net.readBook(visitOwner(s));
  gt.notes = r.ok ? r.notes : [];
  if (!r.ok) gt.err = r.error;
  if (!visitOwner(s)) refreshGate();   // đọc sổ của mình xong thì hết "mới"
  if (panel === 'guestbook') refreshPanel();
}
async function signNote(e) {
  e?.preventDefault();
  const s = stOk(), owner = visitOwner(s), text = ($('note-input')?.value ?? '').trim();
  if (!s || !owner || gt.busy) return;
  if (!text) { gt.err = 'Chưa viết gì cả'; gt.msg = ''; sound.play('error'); return refreshPanel(); }
  gt.busy = true;
  const r = await net.signBook(owner, text);
  gt.busy = false;
  if (!r.ok) { gt.err = r.error; gt.msg = ''; sound.play('error'); return refreshPanel(); }
  gt.text = ''; gt.err = ''; gt.msg = `Đã ký sổ lưu bút của ${owner}. Cảm ơn bạn!`;
  sound.play('pop');
  await loadNotes();
}
PANELS.guestbook = {
  title: '📖 Sổ lưu bút',
  open() { gt.err = ''; gt.msg = ''; gt.notes = null; gateOpen('guestbook'); loadNotes(); refreshPanel(); },
  close() { gateOpen(null); },
  render(body, s) {
    const owner = visitOwner(s);
    if (!owner && s.mode !== 'online') return body.append(empty('Sổ lưu bút ở cổng chỉ có khi bạn chơi trong làng.'));
    if (owner) {
      const left = t => `${[...t].length}/${D.GIFT.noteMax}`;
      body.append(h('form', { class: 'note-form', on: { submit: signNote } },
        h('textarea', { id: 'note-input', class: 'note-input', rows: 2, maxlength: D.GIFT.noteMax, placeholder: `Viết một dòng cho ${owner}...`, value: gt.text,
          on: { input: e => { gt.text = e.target.value; $('note-left').textContent = left(gt.text); } } }),
        h('div', { class: 'note-send' },
          h('span', { class: 'mini', id: 'note-left' }, left(gt.text)),
          h('button', { class: 'btn green', id: 'note-sign', type: 'submit', disabled: gt.busy }, '✍️ Ký sổ'))));
      body.append(h('p', { class: 'mini' }, `Mỗi ngày ký được một dòng ở mỗi sổ, tối đa ${D.GIFT.noteMax} ký tự.`));
    }
    gateNote(body);
    body.append(section(owner ? `Mọi người đã viết cho ${owner}` : 'Mọi người đã viết cho bạn'));
    if (!gt.notes) return body.append(empty('Đang tải...'));
    if (!gt.notes.length) return body.append(empty(owner ? 'Sổ còn trắng tinh. Bạn ký dòng đầu tiên nhé!' : 'Chưa ai ký sổ của bạn.'));
    const list = h('div', { class: 'list' });
    body.append(list);
    for (const n of gt.notes) list.append(h('div', { class: 'row note-row', 'data-from': n.from },
      h('div', { class: 'row-main' },
        h('div', { class: 'note-head' }, h('b', {}, n.from), h('span', { class: 'note-day' }, dayText(n.day))),
        h('div', { class: 'note-text' }, n.text))));
  },
};

// Thanh "đang ở vườn của X" + số lượt giúp còn lại hôm nay (issue 28) + nút về làng; owner = null thì ẩn
export function setVisit(owner, help) {
  const e = $('visit-bar');
  if (!e) return;
  e.hidden = !owner;
  if (!owner) return;
  $('visit-owner').textContent = owner;
  const t = help == null ? '' : 'Còn ' + help + ' lượt giúp hôm nay';
  if ($('visit-help').textContent !== t) $('visit-help').textContent = t;
}

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
// Chỗ đặt bản đồ nhỏ theo HUD (HUD lùi xuống khi có băng rôn đỏ thì updateAlerts gọi lại ngay, khỏi chờ nhịp HUD)
function placeMini() {
  const wrap = $('mini-wrap');
  // đo hết rồi mới ghi: đọc xen kẽ ghi làm trình duyệt phải tính lại bố cục hai lần mỗi nhịp
  const hud = $('hud').getBoundingClientRect(), act = $('actions').getBoundingClientRect();
  const main = $('main-action').getBoundingClientRect(), nm = $('target-name').getBoundingClientRect();
  const wide = innerWidth - hud.right >= 120, top = wide ? hud.top : hud.bottom + 8;   // màn rộng: ngang HUD; màn hẹp: ngay dưới HUD
  wrap.style.top = top + 'px';
  wrap.style.setProperty('--mini-top', top + 'px');
  wrap.classList.toggle('narrow', !wide);   // màn hẹp: nút tốc độ sang mép trái (style.css)
  // Cột nút cao nhất tới ngay dưới hàng bản đồ nhỏ thu gọn (nút Việc cần làm 42px); dư chip thì danh sách cuộn dọc
  const floor = main.height ? main.top - 8 : act.bottom;
  $('chips').style.maxHeight = Math.max(84, floor - (top + 50) - (nm.height ? nm.height + 8 : 0) - 4) + 'px';
  // Cột nút hành động cao tới đây thì bản đồ nhỏ thu lại còn nút Việc cần làm (máy nhỏ, nhiều nút).
  // 102px bản đồ + 14px nút 📋 lòi xuống dưới + 8px hở
  wrap.classList.toggle('compact', act.height > 0 && act.top < top + 124);
}
function renderMini(s) {
  $('mini-wrap').hidden = false;
  const items = todoList(s);
  placeMini();
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
    const ic = hd(SPR2?.todo), cv = $('todo-ico'), g = cv.getContext('2d');
    if (ic) { cv.width = ic.width; cv.height = ic.height; g.drawImage(ic, 0, 0); } else { g.font = '10px sans-serif'; g.fillText('📋', 0, 10); }
  }
}

let resetting = false;
PANELS.settings = {
  title: '⚙️ Cài đặt',
  render(body, s) {
    body.append(...(s.mode === 'online'
        ? [section('Tốc độ game'), h('p', { class: 'mini' }, 'Cả làng chạy cùng giờ, luôn ở tốc độ x1.')]
        : [section('Tốc độ game'),
          h('div', { class: 'seg' }, D.SPEEDS.map(v => btn('x' + v, () => { s.speed = v; sound.play('pop'); commit(); }, (s.speed === v ? 'orange' : 'plain') + ' nosound'))),
          h('p', { class: 'mini' }, 'x5 và x20 giúp cây lớn nhanh để xem thử. Chơi thoải mái thì để x1.')]),
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
        h('li', {}, '🗺️ Mua đất: từ cấp 5, đứng sát mép vườn rồi bấm Mua đất. Đất mua từng dải, vườn luôn là một hình chữ nhật.'),
        h('li', {}, '📱 Điện thoại: chạm mặt đất để đi, chạm vật để làm việc, hoặc dùng cần điều khiển.')),
      section('Làng'),
      ...(s.mode === 'online'
        ? [h('p', { class: 'mini' }, `Đang ở làng với tên ${s.account}. Vườn tự lưu lên làng.`),
          btn('Đăng xuất', () => { closePanel(); net.logout(api.leaveToMode()); }, 'plain')]
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
    api.newGame({ name, look: { ...look }, dogCoat });
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  const preview = makePreview(() => look, 6);
  // màu lông chó Mực (góp ý người chơi): chọn lúc nhận nuôi, đổi lại ở trạm thú y Cô Út
  let dogCoat = D.COAT.def.cho;
  const coats = h('div', { class: 'dog-coat' });
  const pickCoat = () => coats.replaceChildren(h('p', { class: 'mini' }, `Chó ${D.DOG.name} của bạn màu lông:`), coatPicker('cho', dogCoat, k => { dogCoat = k; pickCoat(); }));
  pickCoat();
  root.replaceChildren(h('div', { class: 'creator-card' },
    h('h1', {}, 'Nông Trại Vui'),
    h('p', { class: 'sub' }, online ? `Vườn mới của ${online.name} trên làng. Chọn ngoại hình nào!` : 'Chào mừng bạn tới nông trại mới! Hãy giới thiệu bản thân nào.'),
    h('div', { class: 'stage' }, preview, h('div', { class: 'shadow' })),
    dice,
    input,
    editor,
    coats,
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
// Cột biểu cảm / chat nhanh / người đang ở đây: chỉ hiện khi chơi vườn online. n = số người khác cùng bản đồ
export function setLive(on, n = 0) {
  const e = $('live');
  if (!e) return;
  e.hidden = !on;
  if (!on) $('live-says').hidden = true;
  $('live-n').textContent = String(n + 1);
  if (panel === 'online') refreshPanel();
}
export function setOnline(on) {
  const e = $('hud-net');
  if (e) e.hidden = !!on;
}
// ---------- Sự kiện từ tick() ----------
function showBadge(ev) {
  const box = $('badges'), a = D.ACHIEVEMENTS.find(x => x.id === ev.id);
  const b = h('div', { class: 'badge', 'data-id': ev.id ?? '' },
    h('div', { class: 'badge-ico' }, a?.badge ? achIcon(a, true, 'ico big') : '🏆'),   // thành tựu xã hội: huy hiệu riêng (issue 32)
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
// Việc để dành tới lúc màn này đóng (vd cảm ơn khách đã giúp lúc chủ vắng, issue 28): màn đang mở thì toast bị che
let afterAwayFns = [];
export function afterAway(fn) { if (awayOpen) afterAwayFns.push(fn); else fn(); }
export function closeAway() {
  awayOpen = false;
  const root = $('away');
  root.hidden = true; root.replaceChildren();
  const fns = afterAwayFns; afterAwayFns = [];
  for (const f of fns) f();
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
  const guests = away.guests ?? [];   // việc khách làm lúc mình vắng (issue 32): giúp, trộm, quà, lời nhắn, chó đuổi
  root.replaceChildren(h('div', { class: 'away-card', role: 'dialog', 'aria-label': 'Trong lúc bạn vắng nhà' },
    h('div', { class: 'away-ico' }, '🏡'),
    h('h2', {}, 'Trong lúc bạn vắng nhà…'),
    away.ms ? h('p', { class: 'away-sub' }, `Bạn đã đi ${spanOf(away.ms)}.`) : null,
    away.lines.length
      ? h('ul', { class: 'away-list' }, away.lines.map(l => h('li', { class: frozen(l) ? 'cold' : '' }, h('span', { class: 'ico emo' }, frozen(l) ? '❄️' : '•'), h('span', {}, l))))
      : guests.length ? null : h('p', { class: 'mini' }, 'Mọi thứ vẫn yên ổn, không có gì đặc biệt.'),
    guests.length ? h('h3', { class: 'away-h' }, 'Khách ghé vườn') : null,
    guests.length ? h('ul', { class: 'away-list away-guests' }, guests.map(g => h('li', { 'data-kind': g.kind }, h('span', { class: 'ico emo' }, g.icon), h('span', {}, g.text)))) : null,
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
      case 'stolen': alertNow(D.EVENT_LEVEL.stolen.text(1, e)); break;   // có người trộm vườn mình (issue 30)
      case 'barked': alertNow(D.EVENT_LEVEL.barked.text(1, e)); break;    // chó sủa báo có khách lạ (issue 31)
    }
    notifier(e, Date.now());
  }
}

// ---------- 🔴 Báo gấp: băng rôn đỏ + tiếng + rung + mũi tên ở mép màn hình ----------
// Lấy chỗ gấp từ state (S.urgentSpots) nên bản lưu đang có sự cố cũng báo; hiện ở mọi bản đồ.
const BANNER_MS = 8000;
let seenUrgent = new Set(), bannerUntil = 0, bannerOff = false, alertEv = null, barKey = '';
// Báo gấp đến từ một event chứ không phải chỗ cố định trong vườn (vd có người sang trộm, issue 30)
function alertNow(text) {
  alertEv = { text, until: performance.now() + BANNER_MS };
  bannerOff = false;
  sound.play('alarm');
  try { navigator.vibrate?.([220, 90, 220]); } catch { /* máy không rung */ }
}
function arrowEl(key, kind) {
  const box = $('alert-arrows');
  let el = [...box.children].find(c => c.dataset.key === key);
  if (!el) {
    el = h('canvas', { class: 'alert-arrow', width: 12, height: 12 });
    el.dataset.key = key;
    const src = kind === 'stray' ? SPR3?.strayArrow : (key.startsWith('bark:') && SPR2?.barkArrow) || SPR2?.alertArrow;   // mũi tên chỉ hướng chó sủa (issue 31), con lạc thì mũi tên vàng
    if (src) { const s2 = hd(src); el.width = s2.width; el.height = s2.height; el.getContext('2d').drawImage(s2, 0, 0); } else { const c = el.getContext('2d'); c.fillStyle = kind === 'stray' ? '#f2b81e' : '#e5452f'; c.fillRect(0, 3, 12, 6); }
    box.append(el);
  }
  return el;
}
// toScreen(x, y): toạ độ bản đồ đang đứng → px CSS trên màn hình. s = vườn của mình; visiting = đang đứng trong vườn
// người khác (issue 32): vẫn báo gấp nhưng không có mũi tên (bản đồ đang đứng không phải bản đồ của s).
// Ở ngoài vườn mình thì băng rôn kèm nút "Về vườn".
export function updateAlerts(s, toScreen, nowMs = performance.now(), visiting = false) {
  const spots = S.urgentSpots(s), urgent = todoList(s).filter(i => i.level === 'urgent'), keys = new Set(spots.map(p => p.key));
  if (spots.some(p => !seenUrgent.has(p.key))) {
    sound.play('alarm');
    try { navigator.vibrate?.([220, 90, 220]); } catch { /* máy không rung */ }
    bannerUntil = nowMs + BANNER_MS; bannerOff = false;
  }
  seenUrgent = keys;
  if (alertEv && nowMs >= alertEv.until) alertEv = null;
  const bn = $('alert-banner'), spotOn = spots.length > 0 && nowMs < bannerUntil;
  const on = !bannerOff && (spotOn || !!alertEv), out = visiting || s.scene !== 'farm';
  if (on) {
    const text = spotOn
      ? (spots.length === 1 ? spots[0].text : `${spots.length} sự cố trong vườn!`) + (out ? ' Về vườn ngay!' : '')
      : alertEv.text;
    if (bn.textContent !== text) bn.textContent = text;
  }
  bn.hidden = !on;
  $('alert-home').hidden = !(on && out);
  document.body.classList.toggle('alerting', on);
  // chữ, nút hay cỡ màn hình đổi thì đo lại chiều cao hàng băng rôn cho HUD lùi xuống vừa đủ
  const bk = on ? `${bn.textContent}|${out}|${innerWidth}` : '';
  if (bk !== barKey) { barKey = bk; if (on) document.body.style.setProperty('--alert-h', $('alert-bar').offsetHeight + 'px'); placeMini(); }
  const rootBox = $('alert-arrows');
  if (visiting) { rootBox.replaceChildren(); return; }
  const lost = s.scene === 'farm' ? S.strays(s) : [];   // con lạc ngủ ngoài: mũi tên vàng khi ngoài khung nhìn (không báo động)
  if (!urgent.length && !lost.length && !rootBox.firstChild) return;   // không có gì gấp: khỏi đo bố cục mỗi khung hình
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
  for (const a of lost) {
    const key = 'stray:' + a.id, p = arrowFor(toScreen(a.x, a.y), box, 22), el = arrowEl(key, 'stray');
    el.hidden = !p;
    if (!p) continue;
    live.add(key);
    el.style.transform = `translate(${(p.x - 18).toFixed(1)}px, ${(p.y - 18).toFixed(1)}px) rotate(${p.ang.toFixed(4)}rad)`;
    el.dataset.ang = String(Math.round(p.ang * 180 / Math.PI));
  }
  for (const el of [...rootBox.children]) if (!live.has(el.dataset.key)) el.remove();
}
export function dismissBanner() { bannerOff = true; alertEv = null; $('alert-banner').hidden = true; $('alert-home').hidden = true; document.body.classList.remove('alerting'); }

// ---------- Khởi tạo ----------
export function initUI(a) {
  api = a;
  for (const b of document.querySelectorAll('.bb-btn[data-panel]')) b.addEventListener('click', () => { sound.play('click'); openPanel(b.dataset.panel); });
  $('bb-seed').addEventListener('click', () => { sound.play('click'); openPanel('seeds'); });
  $('main-action').addEventListener('click', () => runAction(cur.actions[0]));
  $('alert-banner').addEventListener('click', dismissBanner);
  $('alert-home').addEventListener('click', () => { sound.play('click'); api.goHome(); });   // báo gấp lúc ở ngoài vườn (issue 32)
  $('minimap').addEventListener('click', () => { if (!isBlocking()) openPanel('map'); });
  $('todo-btn').addEventListener('click', () => { if (!isBlocking()) openPanel('todo'); });
  $('hud-speed').addEventListener('click', () => {
    const s = st();
    if (s.mode === 'online') return;
    const i = D.SPEEDS.indexOf(s.speed);
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

  // làng real-time: biểu cảm bấm là bay lên đầu, 💬 mở danh sách câu có sẵn
  const says = $('live-says');
  $('live-emotes').append(...D.EMOTES.map(e => btn(e, () => { says.hidden = true; api.emote(e); }, 'live-btn nosound', { title: 'Biểu cảm ' + e, 'aria-label': e })));
  says.append(...D.QUICK_CHAT.map(t => btn(t, () => { says.hidden = true; api.say(t); }, 'small')));
  $('live-chat').addEventListener('click', () => { says.hidden = !says.hidden; });
  $('live-people').addEventListener('click', () => { says.hidden = true; if (!isBlocking()) openPanel('online'); });
  $('live-friends').addEventListener('click', () => { says.hidden = true; if (!isBlocking()) openPanel('friends'); });

  $('bb-build').addEventListener('click', () => { if (!isBlocking()) api.buildStart(); });
  $('visit-leave').addEventListener('click', () => { if (!isBlocking()) api.leaveVisit(); });
  $('build-done').addEventListener('click', () => api.buildDone());
  $('build-cancel').addEventListener('click', () => api.buildCancel());
  $('build-store').addEventListener('click', () => api.buildStore());
$('build-upgrade').addEventListener('click', () => api.buildUpgrade());

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
