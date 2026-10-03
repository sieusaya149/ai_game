// Độ tối của màn hình khớp đồng hồ HUD: chữ "tối/đêm" trên đồng hồ thì màn hình phải tối, ban ngày thì sáng; online và chơi đơn như nhau.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { setClock, VILLAGE_EPOCH } from '../public/clock.js';
import { DAY_MS } from '../public/data.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HOUR = DAY_MS / 24;   // 1 ngày game = 24 giờ trong game, bắt đầu 6h sáng

function solo(h) { const s = G.createGame({ name: 'A' }); s.time = (h - 6) * HOUR; return s; }
function onl(h) { setClock(() => VILLAGE_EPOCH + (h - 6) * HOUR); const s = G.createGame({ name: 'B' }); s.mode = 'online'; s.account = 'B'; return s; }

for (const [name, mk] of [['chơi đơn', solo], ['online', onl]]) {
  test(`độ tối theo đồng hồ (${name})`, t => {
    t.after(() => setClock(null));
    const at = h => { const s = mk(h); return { txt: G.clockText(s), a: G.nightAmount(s) }; };
    assert.equal(at(12).a, 0);                        // trưa sáng
    assert.equal(at(17.9).a, 0);                      // chiều
    assert.ok(at(19).a > 0.2, 'chữ "tối" mà màn hình chưa tối');
    assert.ok(at(21).a >= 0.99);
    assert.match(at(22).txt, /đêm/); assert.ok(at(22).a >= 0.99, '22h là "đêm" phải tối hẳn');
    assert.ok(at(27).a >= 0.99);
    assert.ok(at(29.9).a < at(29).a);                   // sáng dần tới 6h
    assert.equal(at(30.5).a, 0);
  });
}
