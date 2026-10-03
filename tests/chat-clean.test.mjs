// Seam 1: chuẩn hóa chat tự gõ (hàm dùng chung client và server)
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanChat, CHAT } from '../public/data.js';

test('cleanChat: gọn khoảng trắng, bỏ ký tự điều khiển', () => {
  assert.equal(cleanChat('  a   b\nc\u0000d\t'), 'a b c d');
  assert.equal(cleanChat('a​b'), 'a b');
});
test('cleanChat: từ chối rỗng, không phải chuỗi, quá 20 từ hoặc 120 ký tự', () => {
  for (const bad of ['', '  \n', 5, null, undefined, {}, ['a'], 'a '.repeat(21), 'x'.repeat(CHAT.maxChars + 1)]) assert.equal(cleanChat(bad), null);
  assert.ok(cleanChat('a '.repeat(20)));
  assert.equal(cleanChat('x'.repeat(CHAT.maxChars)).length, CHAT.maxChars);
});
test('cleanChat: che từ tục theo nguyên từ, không phân biệt hoa thường và dấu; không che nhầm từ thường', () => {
  assert.equal(cleanChat('Đm, vcl! địt mẹ'), '***, ***! ***');
  assert.equal(cleanChat('ĐỊT  MẸ nó'), '*** nó');
  assert.equal(cleanChat('buổi sáng các bạn ngủ lớn dmx'), 'buổi sáng các bạn ngủ lớn dmx');
});
