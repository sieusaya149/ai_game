// Seam 1: người khác cùng bản đồ (issue 25): ai hiện đầy đủ / tên mờ khi làng đông, nội suy vị trí cho mượt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { crowdSplit, sampleTrack, createPeers } from '../public/presence.js';
import { LIVE } from '../public/data.js';

const people = n => Array.from({ length: n }, (_, i) => ({ id: i + 1, x: 100 + (i + 1) * 20, y: 100 }));

test('làng không quá 12 người (tính cả mình): ai cũng hiện đầy đủ', () => {
  assert.equal(LIVE.crowd, 12);
  const full = crowdSplit({ x: 100, y: 100 }, people(11));
  assert.equal(full.size, 11);
});

test('làng quá 12 người: 11 người gần mình nhất hiện đầy đủ, người ở xa chỉ hiện tên mờ', () => {
  const ps = people(15);   // id 1 gần nhất, id 15 xa nhất
  let full = crowdSplit({ x: 100, y: 100 }, ps);
  assert.equal(full.size, 11);
  for (let id = 1; id <= 11; id++) assert.ok(full.has(id), `người ${id} ở gần phải hiện đầy đủ`);
  for (let id = 12; id <= 15; id++) assert.ok(!full.has(id), `người ${id} ở xa chỉ hiện tên`);
  // người xem đi sang đầu bên kia: người xa thành gần
  full = crowdSplit({ x: 420, y: 100 }, ps);
  assert.ok(full.has(15) && full.has(5));
  assert.ok(!full.has(1) && !full.has(2));
});

test('nội suy: giữa hai mốc thì ở giữa, ngoài mốc thì đứng yên ở mốc gần nhất', () => {
  const tr = [{ t: 0, x: 0, y: 0 }, { t: 100, x: 10, y: 20 }, { t: 200, x: 10, y: 20 }];
  assert.deepEqual(sampleTrack(tr, -50), { x: 0, y: 0, moving: false });
  assert.deepEqual(sampleTrack(tr, 50), { x: 5, y: 10, moving: true });
  assert.deepEqual(sampleTrack(tr, 150), { x: 10, y: 20, moving: false });
  assert.deepEqual(sampleTrack(tr, 999), { x: 10, y: 20, moving: false });
});

test('người khác đi: vị trí vẽ đổi dần theo từng khung hình, không nhảy cóc; mất vài gói vẫn đi tiếp mượt', () => {
  const P = createPeers(), gap = 1000 / LIVE.hz;
  P.receive({ t: 'joined', people: [{ id: 7, name: 'Minh', level: 3, look: {}, x: 100, y: 100, dir: 0 }] }, 0);
  // đứng yên một lúc rồi mới đi, mỗi nhịp 6 điểm ảnh; gói thứ 4, 5 bị mất. Mỗi khung hình 16ms: nhận gói tới hạn rồi vẽ
  const packets = Array.from({ length: 10 }, (_, i) => ({ at: 5000 + i * gap, x: 106 + i * 6 })).filter((_, i) => i !== 3 && i !== 4);
  const xs = [];
  for (let t = 4900; t <= 5000 + 10 * gap + LIVE.delayMs; t += 16) {
    while (packets[0]?.at <= t) P.receive({ t: 'pos', id: 7, x: packets.shift().x, y: 100, dir: 2 }, t);
    xs.push(P.view({ x: 0, y: 0 }, t)[0].x);
  }
  for (let i = 1; i < xs.length; i++) {
    assert.ok(xs[i] >= xs[i - 1], 'không đi lùi');
    assert.ok(xs[i] - xs[i - 1] < 6, `mỗi khung hình nhích ít (${xs[i - 1]} → ${xs[i]})`);
  }
  assert.equal(xs[0], 100);
  assert.equal(xs.at(-1), 160);
  assert.ok(new Set(xs).size > 20, 'nhiều vị trí trung gian');
});

test('bong bóng chat, biểu cảm hết hạn; vào / rời bản đồ cập nhật danh sách người đang ở đây', () => {
  const P = createPeers();
  P.receive({ t: 'joined', people: [] }, 0);
  assert.equal(P.receive({ t: 'enter', p: { id: 2, name: 'Lan', level: 5, look: {}, x: 50, y: 50, dir: 0 } }, 0), true);
  P.receive({ t: 'chat', id: 2, text: 'Chào cả làng!' }, 100);
  P.receive({ t: 'emote', id: 2, e: '😂' }, 100);
  let v = P.view({ x: 0, y: 0 }, 200)[0];
  assert.equal(v.chat, 'Chào cả làng!');
  assert.equal(v.emote.e, '😂');
  v = P.view({ x: 0, y: 0 }, 100 + LIVE.chatMs + 1)[0];
  assert.equal(v.chat, null);
  assert.equal(v.emote, null);
  assert.deepEqual(P.roster(), [{ id: 2, name: 'Lan', level: 5 }]);
  assert.equal(P.receive({ t: 'leave', id: 2 }, 300), true);
  assert.equal(P.size, 0);
});
