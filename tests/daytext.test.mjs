// Seam 1: số ngày hiển thị online là số nhỏ tính từ ngày mở làng, tăng 1 mỗi ngày làng; mùa/thời tiết (dayOf) không đổi.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/state.js';
import { DAY_MS } from '../public/data.js';
import { setClock, VILLAGE_OPEN } from '../public/clock.js';

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

test('online: Ngày 1 lúc mở làng, tăng 1 mỗi ngày làng, dayOf nội bộ giữ nguyên', () => {
  const s = G.createGame({ name: 'Hùng', look: {} });
  s.mode = 'online';
  try {
    setClock(() => VILLAGE_OPEN + 1000);
    assert.equal(G.dayText(s), 'Ngày 1');
    const internal = G.dayOf(s);
    assert.ok(internal > 1000);
    setClock(() => VILLAGE_OPEN + DAY_MS + 1000);
    assert.equal(G.dayText(s), 'Ngày 2');
    assert.equal(G.dayOf(s), internal + 1);
    setClock(() => VILLAGE_OPEN + 40 * DAY_MS + 1000);
    assert.equal(G.dayText(s), 'Ngày 41');
  } finally { setClock(null); }
});

test('HUD: ngày trong mùa 1..7, hết 7 ngày thì sang mùa mới và quay về 1', () => {
  const s = G.createGame({ name: 'Hùng', look: {} });
  for (const [day, want] of [[1, 'Ngày 1/7'], [7, 'Ngày 7/7'], [8, 'Ngày 1/7'], [2373, 'Ngày 7/7'], [2376, 'Ngày 3/7']]) {
    s.day = day;
    assert.equal(G.seasonDayText(s), want);
  }
});
