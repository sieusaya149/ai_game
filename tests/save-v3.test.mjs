import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../public/state.js';
import { migrate, SAVE_VERSION } from '../public/migrate.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const clear = () => { for (const k of Object.keys(store)) delete store[k]; };
const V2 = 'nongtrai-save-v2';
const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
// Ghi bản v2 mẫu như thể người chơi vừa thoát game (không chạy bù)
const seedV2 = (name, mut) => { clear(); const s = fixture(name); s.savedAt = Date.now(); mut?.(s); store[V2] = JSON.stringify(s); return s; };
const quiet = fn => { const r = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = r; } };

test('mở bản v2 có đủ loài: thành v3, đủ con, giai đoạn đúng, giới tính theo id, độ thân 2, sạch', () => {
  const old = seedV2('v2-farm');
  const s = quiet(() => G.loadGame());
  assert.equal(s.v, SAVE_VERSION);   // v2 → v3 → bản mới nhất
  assert.deepEqual(s.animals.map(a => a.id), old.animals.map(a => a.id));
  assert.deepEqual(new Set(s.animals.map(a => a.type)), new Set(['ga', 'heo', 'bo', 'cuu']));
  for (const a of s.animals) {
    const o = old.animals.find(x => x.id === a.id);
    assert.equal(a.stage, o.adult ? 'truong' : 'non', `con ${a.id}`);
    assert.equal(a.sex, a.id % 2 ? 'm' : 'f');
    assert.equal(a.bond, 2);
    assert.equal(a.dirty, 0);
    assert.equal(a.adult, undefined, 'bỏ trường adult cũ');
    assert.equal(a.type, o.type); assert.equal(a.x, o.x); assert.equal(a.name, o.name);
    // trưởng thành cũ: ở đầu giai đoạn trưởng thành (chưa bị đẩy sang già)
    if (o.adult) assert.ok(a.age >= G.stageStart(a.type, 'truong') && a.age < G.stageStart(a.type, 'truong') + 60_000);
    for (const k of ['weight', 'sickSince', 'mom', 'dad', 'tile']) assert.ok(k in a, k);
  }
  // mỗi loài có đủ đực và cái để sau này sinh sản
  for (const t of ['ga', 'heo', 'bo', 'cuu']) assert.deepEqual(new Set(s.animals.filter(a => a.type === t).map(a => a.sex)), new Set(['f', 'm']), t);
  // con bệnh cũ thành "Mệt" (mức 1), con khỏe 0
  const sick = old.animals.find(a => a.sick);
  assert.equal(s.animals.find(a => a.id === sick.id).sick, 1);
  assert.ok(s.animals.filter(a => a.id !== sick.id).every(a => a.sick === 0));
  // chó đã lớn thành "Trưởng thành"
  assert.equal(s.dog.stage, 'truong'); assert.equal(s.dog.adult, undefined);
  assert.equal(s.coins, old.coins);
  assert.deepEqual(s.inv, old.inv);
});

test('chuyển v2→v3 là hàm thuần: chạy hai lần cho cùng kết quả, không đụng bản gốc', () => {
  const raw = fixture('v2-farm'), copy = structuredClone(raw);
  const r = Math.random; Math.random = () => { throw new Error('không được ngẫu nhiên'); };
  try { assert.deepEqual(migrate(raw), migrate(raw)); } finally { Math.random = r; }
  assert.deepEqual(raw, copy);
  // qua loadGame cũng thế (như mở trên hai máy)
  seedV2('v2-farm');
  const a = quiet(() => G.loadGame());
  delete store[G.SAVE_KEY]; delete store['nongtrai-migrated-v3']; delete store['nongtrai-migrated-v4'];
  const b = quiet(() => G.loadGame());
  for (const s of [a, b]) { delete s.savedAt; s.log = []; }
  assert.deepEqual(a, b);
});

test('key v2 còn nguyên sau khi chuyển; bản mới ghi ở key mới', () => {
  seedV2('v2-farm');
  const before = store[V2];
  quiet(() => G.loadGame());
  assert.equal(store[V2], before);
  assert.equal(G.SAVE_KEY, `nongtrai-save-v${SAVE_VERSION}`);
  assert.equal(JSON.parse(store[G.SAVE_KEY]).v, SAVE_VERSION);
  // đã có bản mới thì đọc bản mới, không chuyển lại từ v2
  const s = G.loadGame(); s.coins = 777; G.saveGame(s);
  assert.equal(G.loadGame().coins, 777);
  assert.equal(store[V2], before);
});

test('người chơi v2 đã từng chuyển từ v1 (có cờ cũ) vẫn mở được bản v2', () => {
  seedV2('v2-fresh');
  store['nongtrai-migrated'] = '1';
  store['nongtrai-save-v1'] = JSON.stringify(fixture('v1-mid'));
  const s = quiet(() => G.loadGame());
  assert.equal(s.name, 'Mới');   // của bản v2, không phải v1-mid
  assert.equal(s.v, SAVE_VERSION);
});

test('chơi lại từ đầu thì không lôi bản v2 cũ lên nữa', () => {
  seedV2('v2-fresh');
  assert.ok(quiet(() => G.loadGame()));
  G.resetGame();
  assert.equal(G.loadGame(), null);
  assert.ok(store[V2], 'bản v2 vẫn còn');
});

test('bản v2 hỏng: báo lỗi, không ghi gì, bản v2 giữ nguyên', () => {
  for (const bad of ['{"v":2,"farm":', JSON.stringify({ ...fixture('v2-fresh'), animals: 'hỏng' }), JSON.stringify({ ...fixture('v2-fresh'), animals: [{ id: 1, type: 'rong' }] })]) {
    clear();
    store[V2] = bad;
    assert.equal(G.loadGame(), null);
    assert.match(G.loadProblem(), /Không đọc được/);
    assert.equal(store[V2], bad);
    assert.equal(store[G.SAVE_KEY], undefined);
    assert.equal(store['nongtrai-migrated-v3'], undefined);
  }
});

test('vườn mới tạo ở bản mới nhất: con vật có đủ trường của hình dạng v3', () => {
  clear();
  const s = G.createGame({ name: 'Mới' });
  assert.equal(s.v, SAVE_VERSION);
  const [hen, chick] = s.animals;
  assert.deepEqual([hen.stage, hen.sex, chick.stage, chick.sex], ['truong', 'f', 'non', 'm']);
  for (const a of s.animals) {
    assert.equal(a.bond, 2); assert.equal(a.dirty, 0); assert.equal(a.sick, 0); assert.equal(a.tile, null);
    assert.ok(a.weight > 0);
  }
  assert.equal(s.dog.stage, 'non');
  // nạp lại một bản v3 thiếu trường (như bản lưu của lát trước) thì được bổ sung mặc định
  const raw = structuredClone(s);
  delete raw.animals[0].bond; delete raw.animals[0].tile;
  const m = migrate(raw);
  assert.equal(m.animals[0].bond, 2); assert.equal(m.animals[0].tile, null);
});
