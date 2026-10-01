// Giao diện: HUD, nút hành động, các bảng, tạo nhân vật, hướng dẫn.
import * as S from './state.js';
import * as art from './art.js';
import * as D from './data.js';
import * as sound from './sound.js';
import { SPR2 } from './art2.js';

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
  ga: '🐔', heo: '🐖', bo: '🐄', cuu: '🐑', dog: '🐕',
};
const iconCache = new Map();
function iconUrl(key) {
  if (iconCache.has(key)) return iconCache.get(key);
  let u = null;
  try { u = art.icon(key) || null; } catch { u = null; }
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
let creatorOpen = false, celebOpen = false, dialogResolve = null;
const celebQueue = [];
const flags = { sold: false, bought: false };
const st = () => api.getState();
const level = s => S.levelInfo(s.exp).level;
const have = (s, k) => S.haveItem(s, k);   // giỏ + kho

const typing = el => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
// Nhãn từ state.js đã kèm icon ở đầu; bỏ đi vì nút đã vẽ icon riêng.
const bareLabel = a => a.icon && a.label.startsWith(a.icon) ? a.label.slice(a.icon.length).trim() : a.label;

export function isBlocking() {
  return !!panel || creatorOpen || celebOpen || !!dialogResolve || building || typing(document.activeElement);
}

// ---------- Chế độ xây dựng (main.js lo kéo thả, ở đây chỉ bật/tắt giao diện) ----------
let building = false;
export function showBuild(on) {
  building = on;
  document.body.classList.toggle('building', on);
  $('buildbar').hidden = !on;
  $('bb-build').classList.toggle('on', on);
  if (on) buildMsg('Chạm và kéo công trình để dời chỗ', null);
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
function pushToast(text, cls = '') {
  const box = $('toasts');
  if (!box || !text) return;
  const dup = [...box.children].find(c => c.textContent === text);
  if (dup) dup.remove();
  const t = h('div', { class: 'toast ' + cls }, text);
  box.append(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => t.remove(), 2800);
}
export function toast(text) { pushToast(text); }

// ---------- Hộp xác nhận ----------
function confirmBox(text, yes = 'Đồng ý', no = 'Thôi', danger = false) {
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
const TUT = [
  { text: 'Đi tới ruộng (góc trên phải) rồi bấm Cuốc đất.', done: s => s.plots.some(p => p.soil === 'tilled' || p.crop) },
  { text: 'Gieo hạt cải xuống ô đất vừa cuốc.', done: s => s.stats.planted >= 1 || s.plots.some(p => p.crop) },
  { text: 'Tưới nước cho cây. Hết nước thì ra giếng múc.', done: s => s.plots.some(p => p.crop && p.water > 0) || s.stats.harvests >= 1 },
  { text: 'Đợi cây lớn. Sốt ruột thì bật x5 trong ⚙️ Cài đặt.', done: s => s.stats.harvests >= 1 || s.plots.some(p => p.crop && p.progress >= 1) },
  { text: 'Cây chín rồi! Bấm Thu hoạch.', done: s => s.stats.harvests >= 1 },
  { text: 'Ra cổng vườn tới làng, mang nông sản bán ở chợ Bà Tư (mở 6h–18h).', done: s => flags.sold || s.stats.earned > 0 },
  { text: 'Ghé chợ Bà Tư mua thêm hạt giống.', done: () => flags.bought },
  { text: 'Ra chuồng gà nhặt trứng và đổ cám vào máng.', done: s => s.stats.eggs >= 1 || (s.troughs?.chicken || 0) > 0 },
  { text: 'Coi chừng chó Mực ỉa bậy! Thấy bãi phân thì xúc đi, đừng giẫm nhé.', done: s => s.stats.poops >= 1 || s.stats.slips >= 1 },
];
let shownStep = -1;
function updateTutorial(s) {
  const box = $('tutorial');
  if (!box) return;
  let step = Number.isFinite(s.tutorial) ? s.tutorial : 0;
  while (step < TUT.length && TUT[step].done(s)) step++;
  if (step !== s.tutorial) {
    const fin = step >= TUT.length && (s.tutorial ?? 0) < TUT.length;
    s.tutorial = step;
    if (fin) pushToast('Bạn đã thành thạo việc nhà nông rồi!');
    else if (step > 0 && shownStep >= 0) sound.play('pop');
  }
  if (step >= TUT.length) { box.hidden = true; shownStep = step; return; }
  if (shownStep === step && !box.hidden) return;
  shownStep = step;
  box.hidden = false;
  box.replaceChildren(
    h('div', { class: 'tut-step' }, `Bước ${step + 1}/${TUT.length}`),
    h('div', { class: 'tut-text' }, TUT[step].text),
    h('button', { class: 'tut-x', type: 'button', title: 'Bỏ qua hướng dẫn', on: { click: () => { st().tutorial = TUT.length; updateTutorial(st()); } } }, '✕'));
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
  if (D.ITEMS[id]?.kind === 'deco') {
    const yes = await confirmBox(`Đặt ${D.ITEMS[id].name} ngay dưới chân bạn?`, 'Đặt luôn', 'Để trong túi');
    if (yes) res(S.placeDeco(st(), id), 'pop');
  }
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
          : it?.kind === 'deco' ? btn('Đặt xuống', () => res(S.placeDeco(st(), k), 'pop'), 'green sm')
          : inShed && src === s.inv && isProduce(k) ? btn('Lấy ra', () => res(S.withdraw(st(), k, 'all'), 'pop'), 'plain sm', { disabled: S.basketCount(s) >= S.basketCap(s) }) : null;
        list.append(h('div', { class: 'cell' }, ico(k, 'big'), h('b', { class: 'cell-n' }, '×' + src[k]), h('div', { class: 'cell-name' }, itemLabel(k)), act));
      }
      body.append(list);
    }
    if (!any) body.append(empty('Túi đồ đang trống.'));
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

let resetting = false;
PANELS.settings = {
  title: '⚙️ Cài đặt',
  render(body, s) {
    body.append(section('Tốc độ game'),
      h('div', { class: 'seg' }, D.SPEEDS.map(v => btn('x' + v, () => { s.speed = v; sound.play('pop'); commit(); }, (s.speed === v ? 'orange' : 'plain') + ' nosound'))),
      h('p', { class: 'mini' }, 'x5 và x20 giúp cây lớn nhanh để xem thử. Chơi thoải mái thì để x1.'),
      section('Âm thanh'),
      h('div', { class: 'seg' }, btn(sound.isMuted() ? '🔇 Đang tắt tiếng' : '🔊 Đang bật tiếng', () => { sound.setMuted(!sound.isMuted()); sound.play('pop'); refreshPanel(); }, sound.isMuted() ? 'plain' : 'green nosound')),
      section('Điều khiển'),
      h('ul', { class: 'help' },
        h('li', {}, '🖥️ Máy tính: ', h('kbd', {}, '↑↓←→'), ' hoặc ', h('kbd', {}, 'WASD'), ' để đi.'),
        h('li', {}, h('kbd', {}, 'Space'), ' / ', h('kbd', {}, 'E'), ': hành động chính.'),
        h('li', {}, h('kbd', {}, '1'), '–', h('kbd', {}, '6'), ': các hành động phụ.'),
        h('li', {}, h('kbd', {}, 'Esc'), ': đóng bảng.'),
        h('li', {}, '📱 Điện thoại: chạm mặt đất để đi, chạm vật để làm việc, hoặc dùng cần điều khiển.')),
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
export function showCreator() {
  if (!api) return;
  closePanel();
  creatorOpen = true;
  const root = $('creator');
  const look = { ...D.DEFAULT_LOOK };
  const input = h('input', { class: 'name-input', type: 'text', maxLength: 20, placeholder: 'Tên của bạn', autocomplete: 'off', spellcheck: false });
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
    h('p', { class: 'sub' }, 'Chào mừng bạn tới nông trại mới! Hãy giới thiệu bản thân nào.'),
    h('div', { class: 'stage' }, preview, h('div', { class: 'shadow' })),
    dice,
    input,
    editor,
    h('p', { class: 'mini' }, 'Mũ đẹp, kính và khăn quàng mua thêm ở chợ Bà Tư trong làng sau nhé!'),
    btn('🌾 Vào nông trại', go, 'orange big')));
  root.hidden = false;
  if (matchMedia('(pointer:fine)').matches) input.focus();
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
  }
}

// ---------- Khởi tạo ----------
export function initUI(a) {
  api = a;
  for (const b of document.querySelectorAll('.bb-btn[data-panel]')) b.addEventListener('click', () => { sound.play('click'); openPanel(b.dataset.panel); });
  $('bb-seed').addEventListener('click', () => { sound.play('click'); openPanel('seeds'); });
  $('main-action').addEventListener('click', () => runAction(cur.actions[0]));
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

  addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (dialogResolve) dialogResolve(false);
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
