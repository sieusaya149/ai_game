# Công trình đặt tự do; luật đặt và chuyển bản đồ nằm trong `state.js`

Bỏ bản đồ cố định 34×27 ô và lưới ruộng 6×6. Chuồng trại, giếng, máy móc, nhà kính, đồ trang trí và **ruộng (theo khối 3×3)** đều đặt và dời tự do trên vùng đất đã mua. Chỉ nhà ở và cổng là cố định. Đất mua mở rộng ra 4 phía, tối đa 64×48 ô. Như vậy có đủ chỗ cho hàng chục loại công trình mới, và vườn của mỗi người một kiểu để khoe.

Mọi luật đặt công trình và chuyển bản đồ nằm trong `state.js`, được kiểm tra qua API công khai của nó:

- Không chồng lên nhau.
- Chỉ đặt trên đất đã mua.
- Không chặn đường từ cổng vào cửa nhà (game kiểm tra bằng tìm đường).

`world.js` chỉ gọi các hàm đó, không tự quyết. Nhờ vậy cùng một luật chạy được trên server khi chơi online, và test được bằng `node --test` mà không cần trình duyệt.
