// Khởi động game, vòng lặp, camera, nhập liệu (bàn phím, chạm, joystick) và cầu nối giữa state/ui/world/render.
import {
  loadGame, loadProblem, saveGame, createGame, resetGame as resetSave, tick, actionsFor, perform, mapOf, sceneMap, enterScene,
  startVisit, guestCheck, guestReward, guestOpApply, takeGuestLog, awayGuests, helpLeft, barkOp, biteOp, keepLoot, nextStrip, buyStrip, canPlace, canMove, moveEntity, placeEntity, storeEntity, upgradePen, upgradeInfo, canAfford, fieldCount, fieldLimit, entName, footprint, snapLayout, restoreLayout, slowFactor, sleep, speedOf, sellQuote, commandDog,
} from './state.js';
import * as ui from './ui.js';
import { TS } from './layout.js';
import { DIR_NAME, LIVE, itemName, ANIMALS } from './data.js';
import * as R from './render.js';
import * as V from './world.js';
import { eventMeta } from './notify.js';
import { todoList } from './todo.js';
import * as P from './perf.js';
import * as net from './net.js';
import { claim, startSync, syncClock } from './sync.js';
import { useServerTime } from './clock.js';
import { createPeers } from './presence.js';

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
  // số chẵn điểm canvas cho mỗi điểm bản đồ: art 2x (kiểu A) mỗi điểm = scale/2 điểm canvas, luôn đều.
  // Chọn số chẵn gần nhất theo tỉ lệ (lệch tầm nhìn ít nhất): lo..lo+2, lấy lo+2 khi s vượt trung bình nhân.
  const lo = Math.max(2, 2 * Math.floor(s / 2));
  return s * s > lo * (lo + 2) ? lo + 2 : lo;
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
  // chó sủa / đớp: rung màn hình nhẹ một chút (issue 31)
  const left = shakeUntil - performance.now();
  if (left > 0) { const a = 2 * left / SHAKE_MS; cam.x += (Math.random() - 0.5) * a * 2; cam.y += (Math.random() - 0.5) * a * 2; }
}
const SHAKE_MS = 400;
let shakeUntil = 0;

// ---------- API cho ui.js ----------
function changed() { dirty = true; }

// Bán con vật: báo giá, con ❤️4+ phải xác nhận 2 lần. Nghỉ hưu: hỏi một lần (không quay lại được)
async function askAnimal(target, id) {
  const a = state.animals.find(x => x.id === target.id);
  if (!a) return null;
  const nm = ANIMALS[a.type].name.toLowerCase();
  if (id === 'retire') return await ui.confirmBox(`Cho ${nm} nghỉ hưu? Nó ở lại trại nhưng không cho sản phẩm nữa.`, 'Nghỉ hưu', 'Thôi') ? target : null;
  const q = sellQuote(state, a);
  const ask = q.kg != null ? `Chú Ba trả ${q.price} xu cho ${q.kg} kg (${q.unit} xu/kg hôm nay). Bán ${nm} này?` : `Chú Ba trả ${q.price} xu. Bán ${nm} này?`;
  for (let i = 0; i < Math.max(1, q.need); i++) {
    const text = q.need ? (i ? `Chắc chắn bán ${nm} ${'❤️'.repeat(a.bond)} chứ? Không đón lại được đâu!` : `${ask} Con này thân với bạn lắm ${'❤️'.repeat(a.bond)}`) : ask;
    if (!await ui.confirmBox(text, i ? 'Bán thật' : 'Bán', 'Thôi', !!q.need)) return null;
  }
  return { ...target, confirms: q.need };
}

async function doAction(target, id) {
  if (!state || busy || fading || world.stun > 0) return;
  if (target.kind === 'animal' && (id === 'sell' || id === 'retire') && !(target = await askAnimal(target, id))) return;
  if (busy || !V.exists(state, target)) return;
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
  if (target?.id === 'friendGate' && sync) { ui.openPanel('friends'); changed(); return; }   // cổng bạn bè: mở bảng bạn bè khi đang online
  if (res.msg && (!res.ok || !res.fx?.length)) ui.toast(res.msg);
  if (res.open) ui.openPanel(res.open);
  if (res.sold) (world.deals ??= []).push({ ...res.sold, t0: now });   // Chú Ba tới dắt đi
  if (res.rename) ui.askRename(res.rename).then(r => r && changed());
  if (res.go) goScene(res.go);
  if (res.bath != null) (world.baths ??= []).push({ id: res.bath, t0: now });
  if (res.grain) (world.grains ??= []).push({ ...res.grain, t0: now });   // nắm thóc vừa rải ở cửa chuồng
  if (res.pickSpot) { world.pick = res.pickSpot; ui.toast('Chạm vào chỗ muốn ' + state.dog.name + ' gác 🛡️'); }   // lệnh Canh khu: chọn ô gác
  if (res.punish) ui.askPunish(res.punish).then(() => changed());   // bắt được trộm: hộp thoại chọn kiểu phạt
  if (res.buyStrip) askStrip(res.buyStrip);
  if (res.sleep) goSleep();
  if (res.guestOp) sync?.send({ t: 'guest', op: res.guestOp });   // việc giúp trong vườn người khác (issue 28): server kiểm tra rồi xếp hàng
  if (res.ok && target && (/pet|vuot|stroke|love|praise/i.test(id ?? '') || ((target.kind === 'animal' || target.kind === 'cat') && id === 'feed'))) {
    const key = target.kind === 'dog' ? 'dog' : target.kind === 'animal' ? 'a' + target.id : target.kind === 'cat' ? 'c' + target.id : null;
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

// Bản để lưu (đã đóng dấu savedAt). Đang trong chế độ xây dựng thì lấy bố cục lúc trước khi vào (chỉ Xong mới lưu bố cục mới).
function snapshot() {
  if (!state) return null;
  if (home) { saveGame(home); return home; }   // đang thăm vườn người khác: chỉ lưu vườn mình, bản đi dạo không bao giờ lưu
  const c = world.build ? structuredClone(state) : state;
  if (world.build) restoreLayout(c, world.build.snap);
  saveGame(c);   // chơi đơn: ghi localStorage; vườn online: chỉ đóng dấu giờ, không đụng bản chơi đơn
  return c;
}
// Lưu game: chơi đơn vào localStorage; vườn online thì ghi bản nháp trên máy, sync.js tự gửi lên server mỗi 10 giây
function save() {
  const c = snapshot();
  if (c && sync) sync.draft(c);
}

// ---------- Vườn online (issue 22) ----------
let sync = null;       // đồng bộ với server khi đang chơi vườn online
let pending = null;    // { name, claim }: đã có phiên chơi, đang chờ chọn "mang vườn lên" hoặc tạo vườn mới
let home = null;       // vườn của mình khi đang thăm vườn người khác (lúc đó state là bản đi dạo của startVisit)
// Vào làng với tài khoản `name`: xin phiên chơi (máy cũ nếu có sẽ lưu lần cuối rồi thoát), rồi chơi vườn trên server
async function startOnline(name) {
  ui.showVillage(name);
  const r = await claim(name);
  if (!r.ok) {
    if (r.status === 401) { net.forget(); ui.showMode(); } else ui.showVillage(name, r.error);
    return;
  }
  pending = { name, claim: r };
  await syncClock();   // giờ server trước khi chạy bù, để giờ máy lệch không ảnh hưởng
  if (r.farm) {
    const s = loadGame(r.farm);
    if (!s) { pending = null; ui.showVillage(name, 'Không đọc được vườn trên làng. Báo quản trị giúp nhé.'); return; }
    playOnline(s);
    // màn vắng nhà: phần vườn chạy bù (s.away) + việc khách làm lúc mình vắng và tin ở cổng (issue 32).
    // Vắng ngắn mà có khách thì vẫn hiện, chỉ có phần khách
    const guests = awayGuests(s, r.gate), away = s.away; delete s.away;
    ui.showAway(guests.length ? { lines: [], frozenMs: 0, ms: null, ...away, guests } : away);
    ui.afterAway(() => ui.handleEvents(takeGuestLog(s)));   // khách giúp lúc mình vắng (issue 28): cảm ơn một lần, sau màn vắng nhà
    return;
  }
  // tài khoản chưa có vườn: có vườn chơi đơn thì hỏi mang lên, không thì tạo vườn mới
  const solo = loadGame();
  if (!solo) { ui.showCreator({ name }); return; }
  delete solo.away;
  ui.showBringUp(name, solo, {
    bring: () => { playOnline(solo); sync.pushNow(); },   // bản chơi đơn trong localStorage vẫn nằm nguyên
    fresh: () => ui.showCreator({ name }),
  });
}
// Bắt đầu chơi bản lưu `s` như vườn online của tài khoản đang chờ
function playOnline(s) {
  const { name, claim: r } = pending;
  pending = null;
  Object.assign(s, { mode: 'online', account: name, name });
  ui.closeCreator();
  state = s;
  sync = startSync({
    name, play: r.play, rev: r.rev, getSave: snapshot,
    onStatus: ui.setOnline,
    onKicked: () => { sync = null; useServerTime(null); quit(); net.forget(); ui.showMode('Bạn đã đăng nhập ở thiết bị khác.'); },
    onReject: msg => ui.toast(`Làng chưa nhận bản lưu: ${msg}`),
    onMessage: liveMsg,
  });
  begin();
  ui.refreshGate();   // quà, lời nhắn đang chờ ở cổng (issue 29)
}
// Rời vườn đang chơi (không lưu): về trạng thái chưa vào game
function quit() {
  if (world.build) { world.build = null; ui.showBuild(false); }
  state = null; home = null; busy = null; curTarget = null; lastTargetKey = '';
  ui.setTarget(null, [], ''); syncTarget.key = '';   // vào lại đúng chỗ cũ (cùng mục tiêu) thì vẫn hiện lại nút hành động
  ui.setVisit(null);
  ui.setOnline(true);
  liveReset();
}

// ---------- Làng real-time (issue 25): người khác cùng bản đồ, chat nhanh, biểu cảm (giao thức ở SPEC mục Server) ----------
const peers = createPeers();
const me = { chat: null, emote: null, chatUntil: 0, emoteT0: 0 };   // bong bóng của chính mình
let liveMap = null, livePos = '', livePosAt = 0;
function liveReset() { peers.clear(); liveMap = null; ui.setLive(!!sync, 0); }
// tin từ WebSocket (qua sync.js): kết nối (lại) thì vào lại bản đồ ở khung hình tới; rớt thì xóa người khác
function liveMsg(m) {
  if (m.t === 'hello' || m.t === 'down') { liveReset(); return; }
  // bạn bè ghé vườn mình (issue 26, 27): toast 🟡 gộp theo người, tắt được trong cài đặt (issue 32)
  if (m.t === 'visit') { ui.netEvent({ type: 'visited', by: m.name }); return; }
  if (m.t === 'guest') { guestAck(m); return; }       // server trả lời việc mình vừa giúp (issue 28)
  if (m.t === 'guestop') { guestDid(m.op); return; }  // khách vừa giúp vườn mình: áp dụng rồi cảm ơn
  // quà, lời nhắn mới ở cổng (issue 29): toast 🟡 gộp, và đếm lại để sprite hộp quà / sổ đổi theo
  if (m.t === 'gift' || m.t === 'note') { ui.netEvent({ type: m.t, name: m.name, item: m.item, qty: m.qty }); ui.refreshGate(); return; }
  if (peers.receive(m, performance.now())) ui.setLive(true, peers.size);
}

// ---------- Giúp và trộm vườn bạn (issue 28, 30, ADR 0012): luật ở state.js, server kiểm tra và xếp hàng ----------
// Server nhận việc: cộng xu, EXP và đồ trộm được vào vườn mình (bản đi dạo không tự cộng). Từ chối thì chỉ báo lý do.
function guestAck(m) {
  const mine = home ?? state;
  if (!mine) return;
  if (!m.ok) { if (m.msg) ui.toast(m.msg); ui.handleEvents([{ type: 'sound', name: 'error' }]); return; }
  const r = m.reward;   // chó sủa thì không có phần thưởng gì cả
  guestReward(mine, r);
  keepLoot(state, r?.items);   // đồ vừa trộm: bị chó đớp là rơi hết (issue 31)
  const p = state.player, t0 = performance.now();
  const lines = r?.items ? Object.entries(r.items).map(([k, n]) => [`+${n} ${itemName(k)}`, '#5cd65c'])
    : r?.lose || r?.fine   // bị chó đớp hay vừa ném xúc xích: mất đồ, mất xu
      ? [...Object.entries(r.lose ?? {}).map(([k, n]) => [`-${n} ${itemName(k)}`, '#ff6b6b']), ...(r.fine ? [[`-${r.fine} xu`, '#ff6b6b']] : [])]
      : r?.coins != null ? [[`+${r.coins} xu`, '#ffd23f'], [`+${r.exp} EXP`, '#7ad7ff']] : [];
  for (const [i, [text, color]] of lines.entries()) world.fx.push({ text, color, x: p.x, y: p.y - 14 - i * 10, t0 });
  if (lines.length) ui.handleEvents([{ type: 'sound', name: r.items ? 'pop' : r.fine ? 'error' : 'coin' }]);
  changed();
}
// Khách vừa làm gì đó trong vườn mình (chủ đang online): áp dụng bằng chính hàm luật rồi báo
// (giúp: cảm ơn 🟡 gộp theo người và việc · trộm: báo gấp 🔴)
function guestDid(op) {
  const mine = home ?? state;
  if (!mine || !op) return;
  // `sausage` = số xúc xích khách đang có, server điền sẵn: thiếu thì luật tưởng khách tay không (issue 31)
  guestOpApply(mine, { name: op.by, level: op.level, room: op.room, sausage: op.sausage }, op);
  const evs = takeGuestLog(mine);
  if (evs.length) ui.handleEvents(evs);
  changed();
}
// ---------- Chó canh khách (issue 31): world phát hiện, luật ở state.js, server xác nhận ----------
// Chó sủa: báo cho chủ vườn (kèm chỗ thấy mình) và rung nhẹ màn hình của khách.
function dogBark() {
  const r = barkOp(state);
  if (!r) return;
  sync?.send({ t: 'guest', op: r.guestOp });
  ui.handleEvents([{ type: 'sound', name: 'bark' }]);
  shakeUntil = performance.now() + SHAKE_MS;
  try { navigator.vibrate?.(120); } catch { /* máy không rung */ }
}
// Chó đớp trúng: đứng hình 3 giây, rơi hết đồ vừa trộm và nộp phạt (server xác nhận thì guestAck trừ)
function dogBite() {
  const r = biteOp(state);
  if (!r) return;
  sync?.send({ t: 'guest', op: r.guestOp });
  world.stun = r.stunMs; world.path = null; world.pending = null; busy = null; world.busy = false;
  world.fx.push({ text: 'GÂU! 🐕', color: '#ff6b6b', x: state.player.x, y: state.player.y - 16, t0: performance.now() });
  ui.toast(r.msg);
  ui.handleEvents([{ type: 'sound', name: 'bark' }]);
  shakeUntil = performance.now() + SHAKE_MS;
  changed();
}

// mỗi khung hình: đổi bản đồ thì báo join, đi thì gửi vị trí tối đa LIVE.hz lần mỗi giây
function liveFrame(now) {
  if (!sync || !state) return;
  const p = state.player, x = Math.round(p.x), y = Math.round(p.y), dir = p.dir ?? 0, key = `${x},${y},${dir}`;
  const owner = state.visit?.owner, map = owner ? 'farm:' + owner : state.scene;   // vườn người khác: bản đồ vườn của chủ
  if (liveMap !== map) {
    if (!sync.send({ t: 'join', map: owner ? 'farm' : state.scene, owner, x, y, dir, look: state.look })) return;
    peers.clear(); ui.setLive(true, 0);
    liveMap = map; livePos = key; livePosAt = now;
    return;
  }
  if (key === livePos || now - livePosAt < 1000 / LIVE.hz) return;
  if (sync.send({ t: 'pos', x, y, dir })) { livePos = key; livePosAt = now; }
}
// câu chat nhanh / biểu cảm: hiện trên đầu mình ngay, gửi cho người cùng bản đồ
function say(text) { me.chat = text; me.chatUntil = performance.now() + LIVE.chatMs; sync?.send({ t: 'chat', text }); }
function emote(e) { me.emote = e; me.emoteT0 = performance.now(); sync?.send({ t: 'emote', e }); }
const myTalk = now => ({ chat: now < me.chatUntil ? me.chat : null, emote: me.emote && now - me.emoteT0 < LIVE.emoteMs ? { e: me.emote, age: (now - me.emoteT0) / LIVE.emoteMs } : null });

const api = {
  getState: () => state,
  getBattery: () => prefs.battery,
  setBattery(on) { prefs.battery = !!on; P.savePrefs(prefs); },
  doAction,
  changed,
  newGame({ name, look, dogCoat }) {
    const s = createGame({ name, look, dogCoat });
    if (pending) { playOnline(s); sync.pushNow(); return; }   // vườn online mới: gửi lên làng ngay
    if (sync) {   // Chơi lại từ đầu khi đang online: vườn mới thay vườn trên làng, bản chơi đơn không đổi
      Object.assign(s, { mode: 'online', account: state?.account ?? name });
      state = s; begin(); sync.pushNow(); return;
    }
    state = s;
    begin();
  },
  buildStart() {
    if (state?.visit) { ui.toast(guestCheck(state, { kind: 'build' }).msg); return; }
    if (!state || world.build || busy || fading || state.scene !== 'farm') return;   // chỉ xây dựng ở vườn
    V.cancelMove(world);
    world.build = { snap: snapLayout(state), focus: { x: state.player.x, y: state.player.y }, ghost: null, drag: null, pan: null, place: null, sel: null };
    ui.showBuild(true);
  },
  buildDone() {
    if (!world.build) return;
    world.build = null;
    ui.showBuild(false);
    save();
    ui.toast('Đã lưu bố cục mới');
    changed();
  },
  buildCancel() {
    if (!world.build) return;
    restoreLayout(state, world.build.snap);
    world.build = null;
    ui.showBuild(false);
    save();
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
  // Nâng cấp chuồng đang chọn trong chế độ xây dựng
  buildUpgrade() {
    const b = world.build;
    if (!b?.sel) return;
    const r = upgradePen(state, b.sel);
    ui.buildMsg(r.msg, r.ok);
    ui.handleEvents([{ type: 'sound', name: r.ok ? 'coin' : 'error' }]);
    ui.buildSel(null, upgradeInfo(state, b.sel));
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
  startSolo: () => startSolo(false),
  say, emote,
  people: () => peers.roster(),
  visit,
  revenge,
  // Nút "Về vườn" trên băng rôn đỏ (issue 32): tự đi về vườn mình. Đang thăm vườn bạn thì đi ra cổng trước
  // (như nút "Về làng", không bỏ chạy tắt khỏi chó canh), ra tới làng thì đi tiếp tới cổng về vườn nhà.
  goHome() {
    if (!state || busy || fading || world.build || world.stun > 0) return false;
    if (state.visit) { plan = null; homeAfter = performance.now() + 60_000; V.goToTarget(state, world, { kind: 'building', id: 'gate' }); return true; }
    if (state.scene === 'farm' || !sceneMap(state).doors.some(d => d.to === 'farm')) return false;
    plan = null;
    V.goToTarget(state, world, { kind: 'door', to: 'farm' });
    return true;
  },
  // Nút "Về làng" lúc thăm vườn: tự đi ra cổng, tới nơi là ra làng như đi bộ ra
  leaveVisit() {
    if (!state?.visit || busy || fading || world.stun > 0) return;
    plan = null;
    V.goToTarget(state, world, { kind: 'building', id: 'gate' });
  },
  startOnline,
  // Về màn chọn chế độ (Cài đặt → Vào làng / Đăng xuất): lưu vườn (online thì gửi bản cuối lên làng) rồi rời vườn
  async leaveToMode() {
    const fin = snapshot(), s = sync;
    sync = null; pending = null;
    quit();
    useServerTime(null);
    ui.showMode();
    await s?.stop(fin);
  },
  resetGame() {
    const online = sync ? state?.account : null;
    if (!online) resetSave();   // vườn online: không đụng bản chơi đơn; vườn mới sẽ thay vườn trên làng
    quit();
    ui.showCreator(online ? { name: online } : undefined);
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
    if (home) { leaveVisit(); return; }   // vườn người khác chỉ có cổng ra làng
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

// ---------- Thăm vườn người khác (issue 27): đọc vườn chủ (server đã chạy bù) rồi mờ màn hình bước vào; ra cổng là về làng ----------
// Bản đi dạo (state.js startVisit) thay chỗ state; vườn mình (home) vẫn chạy tiếp và được lưu như thường.
// Vào hay ra đều dựng lại world (begin): thao tác đang dở, đường đi, kế hoạch đều hủy.
async function visit(name) {
  const bad = error => ({ ok: false, error });
  if (!state || !sync || home || state.scene !== 'village') return bad('Ra làng rồi mới sang vườn người khác được');
  const r = await net.visitFarm(name);
  if (!r.ok) return bad(r.error);
  if (!state || home || fading || world.build || state.scene !== 'village') return bad('');
  if (r.name.toLocaleLowerCase('vi') === String(state.account).toLocaleLowerCase('vi')) return bad('Đây là vườn của bạn: về bằng cổng về vườn nhà nhé');
  const v = startVisit(state, r.farm, r.name);
  if (!v) return bad('Không đọc được vườn này');
  fading = true; plan = null;
  V.cancelMove(world);
  world.busy = true; world.input.x = world.input.y = 0;
  const el = document.getElementById('fade');
  el.classList.add('on');
  setTimeout(() => {
    fading = false; world.busy = false;
    el.classList.remove('on');
    if (!state || home || state.scene !== 'village') return;
    home = state; state = v;
    begin();
    ui.setVisit(r.name, helpLeft(v));
  }, FADE_MS);
  return { ok: true };
}
// Nút "Sang trộm lại 😤" trong nhật ký vườn (issue 30): đi thẳng qua làng rồi vào vườn kẻ trộm.
// Trả { ok: true } hoặc { ok: false, error } để bảng nhật ký hiện lý do.
async function revenge(name) {
  const bad = error => ({ ok: false, error });
  if (!state || !sync) return bad('Phải ở trong làng mới sang vườn người khác được');
  if (home) return bad('Bạn đang ở vườn người khác rồi');
  for (let hop = 0; hop < 2 && state.scene !== 'village'; hop++) {   // trong nhà thì ra vườn trước, rồi ra làng
    if (fading || world.build) return bad('');
    const doors = sceneMap(state).doors.map(d => d.to);
    const to = doors.includes('village') ? 'village' : doors.includes('farm') ? 'farm' : null;
    if (!to) return bad('Từ đây chưa ra làng được');
    goScene(to);
    await new Promise(ok => setTimeout(ok, FADE_MS + 80));
  }
  if (!state || home || state.scene !== 'village') return bad('Chưa ra tới làng được');
  return visit(name);
}

// Ra cổng vườn người khác: về lại vườn mình, nhân vật vẫn đứng ở làng đúng chỗ lúc bước vào
let homeAfter = 0;   // giờ hết hạn của "ra làng xong thì đi tiếp về vườn nhà" (nút Về vườn, issue 32)
function leaveVisit() {
  state = home; home = null; plan = null;
  begin();
  if (homeAfter > performance.now()) V.goToTarget(state, world, { kind: 'door', to: 'farm' });
  homeAfter = 0;
  ui.setVisit(null);
  ui.refreshGate();   // về vườn mình: đếm lại quà, lời nhắn ở cổng
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
    #joy-base{position:fixed;left:calc(14px + var(--sl,0px));bottom:calc(var(--ui-bottom,64px) + 20px);
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
  if (world.pick) {   // đang chọn ô gác cho chó
    const what = world.pick; world.pick = null;
    applyResult(commandDog(state, what, { c: Math.floor(wx / TS), r: Math.floor(wy / TS) }));
    return;
  }
  const hit = V.hitTest(state, wx, wy);
  if (!hit) { V.walkTo(state, world, wx, wy); return; }
  // đã trong tầm thì quay mặt về thứ vừa chạm; thanh hành động theo đúng thứ đó (V.pickTarget), không theo hướng đang nhìn
  if (V.inRange(state, hit)) { const q = V.targetPos(state, hit); if (q) V.faceTo(state, q.x, q.y); V.pickTarget(world, hit); autoAct(hit); }
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
    else if (ent && upgradeInfo(state, ent.id)) { b.sel = ent.id; ui.buildSel(null, upgradeInfo(state, ent.id)); }   // chuồng, chuồng chó: nâng cấp
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
  const events = tick(home ?? state, dtMs * speedOf(state)) ?? [];   // đang thăm vườn người khác: vườn mình vẫn chạy

  // 3) nhập liệu → di chuyển, AI
  if (ui.isBlocking()) { keys.clear(); world.input.x = world.input.y = 0; }
  else {
    const kx = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0), ky = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
    world.input.x = kx || joy.x; world.input.y = ky || joy.y;
    if (plan && (world.input.x || world.input.y)) plan = null;   // tự đi bằng tay thì bỏ kế hoạch
  }
  const res = V.update(state, world, dt);
  for (const r of res.results) applyResult(r);
  if (res.bark) dogBark();     // chó trong vườn người khác vừa phát hiện mình (issue 31)
  if (res.bite) dogBite();
  if (busy && now - busy.t0 >= actionMs()) finishAction();
  if (res.arrived && !busy) autoAct(res.arrived);
  if (res.door) goScene(res.door.to);

  // 4) target
  syncTarget(now);
  liveFrame(now);

  // 5) vẽ
  updateCamera(dt, false);
  view = { camX: Math.round(cam.x * scale), camY: Math.round(cam.y * scale) };
  world.fx = world.fx.filter(f => now - f.t0 < 1500);
  if (state.scene === 'farm') for (const e of events) if (e.type === 'fx') world.fx.push({ text: e.text, color: e.color, x: e.x, y: e.y, t0: now });
  // gà trống gáy: bong bóng nốt nhạc trên đầu nó
  for (const e of events) if (e.type === 'cockcrow') world.emotes.set('a' + e.id, { icon: 'crow', until: now + 2600 });
  // con vật già ra đi: thiên thần bay lên
  world.angels = (world.angels ?? []).filter(g => now - g.t0 < R.ANGEL_MS);
  if (state.scene === 'farm') for (const e of events) if ((e.type === 'passed' || e.type === 'died') && e.x != null) world.angels.push({ x: e.x, y: e.y, t0: now });
  for (const e of events) if (e.type === 'sickSevere') browserNotify(`${e.animal} bệnh nặng rồi!`, 'Cho uống 2 liều thuốc hoặc gọi bác sĩ thú y nhé.');
  world.baths = (world.baths ?? []).filter(b => now - b.t0 < R.BATH_MS);
  world.grains = (world.grains ?? []).filter(g => now - g.t0 < R.GRAIN_MS);
  if (state.scene === 'farm') for (const e of events) if (e.type === 'wallow') world.baths.push({ id: e.id, t0: now, wallow: true });
  R.render(ctx, {
    state, w: world, cam, scale, width: canvas.width, height: canvas.height, dpr, now,
    target: curTarget ? { target: curTarget } : null,
    busy: busy ? clamp((now - busy.t0) / actionMs(), 0, 1) : null,
    fx: world.fx, battery: prefs.battery, quality: P.particleBudget(fps.fps),
    peers: sync ? peers.view(state.player, now) : null, me: sync ? myTalk(now) : null,
  });

  // 6) sự kiện cho UI, HUD, lưu
  const forUI = events.filter(e => e.type === 'sound' || ['important', 'direct'].includes(eventMeta(e)?.level));
  if (forUI.length) ui.handleEvents(forUI);
  // báo gấp của vườn mình ở mọi bản đồ, cả lúc đang thăm vườn người khác (issue 32)
  ui.updateAlerts(home ?? state, (x, y) => ({ x: (x * scale - view.camX) / dpr, y: (y * scale - view.camY) / dpr }), now, !!home);
  if (now - lastHud > 250) { lastHud = now; ui.renderHUD(state); if (state.visit) ui.setVisit(state.visit.owner, helpLeft(state)); }
  if (joy.el) joy.el.style.display = ui.isBlocking() ? 'none' : '';
  if (now - lastSave > 5000) { lastSave = now; save(); }
}

// Thông báo trình duyệt khi có con vào Bệnh nặng: xin quyền một lần (nhớ đã hỏi), chỉ gửi khi tab đang ẩn
let askedNotify = false;
function browserNotify(title, body) {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default' && !askedNotify && !localStorage.getItem('nongtrai-asked-notify')) {
      askedNotify = true; localStorage.setItem('nongtrai-asked-notify', '1');
      Notification.requestPermission();
    } else if (Notification.permission === 'granted' && document.hidden) new Notification(title, { body, tag: 'sick' });
  } catch { /* trình duyệt không cho: bỏ qua */ }
}

// Ẩn tab / đóng trang: lưu ngay; vườn online gửi luôn lên làng (keepalive, vẫn đi khi trang đã đóng)
const saveNow = () => { save(); sync?.flush(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
window.addEventListener('pagehide', saveNow);

// ---------- Khởi động ----------
resize();
setupJoystick();
ui.initUI(api);
// Vào bản chơi đơn: có bản lưu thì chơi tiếp, chưa có thì tạo nhân vật
function startSolo(first) {
  ui.closeCreator();
  state = loadGame();
  if (state) {
    begin();
    const away = state.away; delete state.away;   // chỉ hiện một lần, không lưu lại
    ui.showAway(away);
    ui.showWhatsNew(state);   // đợi màn vắng nhà đóng rồi mới hiện
  } else if (!first) ui.showCreator();
  else {
    ui.showMode();
    if (loadProblem()) ui.toast('Không đọc được bản lưu cũ, bản cũ vẫn được giữ nguyên. Bạn có thể bắt đầu vườn mới.');
  }
}
globalThis.__farm = { get state() { return state; }, get peers() { return sync && state ? peers.view(state.player, performance.now()) : []; }, get world() { return world; }, get scale() { return scale; }, get view() { return view; }, get dpr() { return dpr; },
  get perf() { return { chunksDrawn: R.chunkStats().drawn, fps: fps.avg, fpsNow: fps.fps, measured: fps.elapsed, battery: prefs.battery, hinted: prefs.hinted }; } };
requestAnimationFrame(t => { last = t; lastSave = t; requestAnimationFrame(frame); });
// Máy này còn đăng nhập thì vào vườn online. Không thì: có bản lưu chơi đơn → chơi tiếp, chưa có → chọn chế độ.
const who = await net.whoAmI();
if (who) startOnline(who);
else startSolo(true);
