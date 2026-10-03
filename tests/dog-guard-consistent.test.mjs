// Hotfix "chó lúc sủa lúc không": một con chó, một bộ luật canh cho trộm NPC, kẻ săn mồi lẫn khách online,
// và người chơi xem được vì sao chó đang canh hay không (dogGuardStatus).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, startVisit, perform, barkOp, guardRadius, dogSees, setChained, raidChance, stageStart, dogGuardStatus, commandDog,
} from '../public/state.js';
import { setClock } from '../public/clock.js';
import { GUARD, DOG, DAY_MS, NIGHT_FROM } from '../public/data.js';
import { TS } from '../public/layout.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const T0 = Date.UTC(2026, 9, 2, 3, 0);   // 10h sáng giờ Việt Nam
let clock = T0;
test.beforeEach(() => { clock = T0; setClock(() => clock); });
test.after(() => setClock(null));

function host(mutate) {
  const s = createGame({ name: 'Lan' }); s.tutorial = 99; s.exp = 500;
  Object.assign(s.dog, { stage: 'truong', age: stageStart('cho', 'truong'), hunger: 100, happy: 100, chained: false });
  for (let i = 0; i <= 5; i++) {
    const p = s.plots[i];
    p.soil = 'tilled'; p.water = 100;
    p.crop = { id: 'bap', progress: 1, planted: 0, bugs: false, bugSince: 0, sick: false, sickSince: 0, fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 };
  }
  mutate?.(s);
  return s;
}
const guest = () => { const me = createGame({ name: 'Bình' }); me.tutorial = 99; me.exp = 500; return me; };

test('khách bị chó thấy lần hai trong thời gian nghỉ 20 giây vẫn nghe chó sủa (chỉ không báo chủ thêm)', () => {
  const v = startVisit(guest(), JSON.parse(JSON.stringify(host())), 'Lan');
  Object.assign(v.player, { x: v.dog.x + 2 * TS, y: v.dog.y });
  const first = barkOp(v);
  assert.equal(first.guestOp.kind, 'bark');
  clock += 5000;
  const again = barkOp(v);
  assert.ok(again, 'chó vẫn sủa, khách vẫn thấy rung và nghe tiếng');
  assert.equal(again.guestOp ?? null, null, 'nhưng chủ chỉ nhận một lần báo trong GUARD.barkEvery');
  clock += GUARD.barkEvery;
  assert.equal(barkOp(v).guestOp.kind, 'bark', 'hết thời gian nghỉ thì báo chủ tiếp');
});

test('chó đi theo chủ sang làng thì không canh vườn, không thấy ai ở vườn', () => {
  const s = host();
  s.dog.cmd = { id: 'follow' }; s.dog.scene = 'village';
  assert.equal(guardRadius(s), 0);
  assert.equal(dogSees(s, { x: s.dog.x, y: s.dog.y }), false);
});

test('trộm NPC và kẻ săn mồi: chó chỉ làm khó khi thật sự canh được (cùng luật với khách online)', () => {
  const base = raidChance(host(s => { s.dog.stage = 'non'; }));
  assert.ok(raidChance(host()) < base, 'chó trưởng thành no vui làm trộm ngại');
  assert.ok(raidChance(host(s => { s.dog.hunger = 35; })) < base, 'đói 35 vẫn canh (đói dưới 30 mới nằm bẹp)');
  assert.ok(raidChance(host(s => { s.dog.stage = 'nho'; })) < base, 'chó nhỡ cũng canh được 4 ô');
  assert.equal(raidChance(host(s => { s.dog.hunger = 10; })), base, 'chó đói lả thì không canh');
  assert.equal(raidChance(host(s => { s.dog.quiet = clock + 30_000; })), base, 'đang mải ăn xúc xích thì không canh');
  assert.equal(raidChance(host(s => { s.dog.cmd = { id: 'follow' }; s.dog.scene = 'village'; })), base, 'chó đi theo chủ sang làng thì vườn không có ai canh');
});

test('trạng thái canh của chó: nhãn và lý do cho từng tình huống', () => {
  const st = fn => dogGuardStatus(host(fn));
  const ok = st();
  assert.equal(ok.on, true);
  assert.match(ok.label, /Đang canh/);
  assert.match(ok.why, new RegExp(String(DOG.guardRadius.truong)));

  const pup = st(s => { s.dog.stage = 'non'; });
  assert.equal(pup.on, false);
  assert.match(pup.label, /Còn bé/);

  const hungry = st(s => { s.dog.hunger = 10; });
  assert.equal(hungry.on, false);
  assert.match(hungry.label, /Đói nên lười canh/);

  const chained = st(s => { s.dog.chained = true; });
  assert.equal(chained.on, true);
  assert.match(chained.label, /xích/);
  assert.match(chained.why, new RegExp(String(GUARD.chainRadius)));

  const quiet = st(s => { s.dog.quiet = clock + 30_000; });
  assert.equal(quiet.on, false);
  assert.match(quiet.label, /xúc xích/);

  const away = st(s => { s.dog.cmd = { id: 'follow' }; s.dog.scene = 'village'; });
  assert.equal(away.on, false);
  assert.match(away.label, /đi theo/);

  const sad = st(s => { s.dog.happy = 20; });
  assert.equal(sad.on, true);
  assert.match(sad.why, /buồn/);

  const old = st(s => { s.dog.stage = 'gia'; });
  assert.match(old.why, /già/);

  // đang ngủ gật ban đêm: nói rõ bao lâu nữa dậy
  const night = host();
  night.time = Math.floor(night.time / DAY_MS) * DAY_MS + DAY_MS * NIGHT_FROM + 1000;
  night.dog.nap = night.time + 40_000;
  const asleep = dogGuardStatus(night);
  assert.equal(asleep.on, true, 'ngủ gật vẫn thấy kẻ lạ sát bên');
  assert.match(asleep.label, /Đang ngủ/);
  assert.match(asleep.why, /40 giây/);
});
