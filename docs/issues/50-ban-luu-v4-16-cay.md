# 50. Bản lưu v4, 16 loại cây và hình riêng 5 giai đoạn

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · ADR 0004, 0005, 0008 · User story 1–9, 83

## What to build

Đây là lát dọn đường cho cả Phase 3. Về luật chơi, người chơi cũ gần như chưa thấy gì mới ngoài 8 loại cây thêm và hình cây đẹp hơn. Bên dưới, bản lưu đã có chỗ cho mọi hệ thống sau.

- **Bản lưu v4 và bước chuyển v3→v4:**
  - Thêm một hàm chuyển đúng một bậc vào chuỗi chuyển đổi, thuần, không ngẫu nhiên, không đọc đồng hồ. Bản v3 vẫn được giữ nguyên, chuyển lỗi thì không ghi đè gì.
  - Ô ruộng có chỗ theo dõi chất lượng vụ (đã khô hẳn chưa, sâu lâu nhất, có bón phân, có chăm tay) và phủ rơm.
  - Nông sản có sao: túi, giỏ, kho, thùng giao hàng, đơn hàng tách theo sao. Đồ cũ thành ★1.
  - Có chỗ cho cấp thành thạo theo loại cây (bắt đầu cấp 1, số lần thu hoạch lấy từ thống kê đã có), giếng có cấp (giếng cấp 1), bồn chứa và mực nước, nâng cấp theo khối ruộng, nhà kính, hố ủ.
  - Cây đang trồng dở và nông sản trong túi giữ nguyên tiến độ.
- **16 loại cây trong bảng số liệu:**
  - 8 cây cũ giữ id và số liệu, chỉ thêm **mùa hợp** và **nhóm thời gian** (ngắn / trung bình / dài).
  - 8 cây mới: hành lá, đậu phộng, rau muống, dưa leo, khoai lang, ớt, su hào, bắp cải. Mỗi cây có mùa hợp, nhóm thời gian, cấp mở khóa, giá hạt, giá bán.
  - Mùa hợp: Xuân (cải xanh, hành lá, dâu tây, đậu phộng); Hạ (rau muống, dưa leo, bắp, dưa hấu); Thu (lúa, khoai lang, bí ngô, ớt); Đông (cà rốt, cà chua, su hào, bắp cải).
- **Chợ Bà Tư:** bán hạt cây mới theo cấp người chơi, cây mới mở dần.
- **Hình riêng cho từng cây:** mỗi cây có bộ hình riêng cho cả 5 giai đoạn (hạt, mầm, cây non, ra hoa/trái non, chín) và cho trạng thái bệnh, héo, chết theo dáng của chính cây đó, không còn dùng chung hình mầm, cây non và ra hoa. Nét riêng đã chốt: cải xanh có 2 lá mầm tròn, bụi lá xòe, ngồng hoa vàng; cà rốt lá lông chim, ngọn cam ló khỏi đất; lúa từ mạ thành bông trĩu vàng; cà chua, dưa hấu, bí ngô có dây leo, hoa vàng, trái non xanh rồi đổi màu; bắp thân cao dần, ra cờ, ra trái có râu; dâu tây bụi thấp, hoa trắng, trái đỏ.
- **Pixel art do agent Opus vẽ.** Sprite cần vẽ: 16 cây × 5 giai đoạn, cộng bệnh, héo, chết theo dáng từng cây; 16 loại nông sản (viền sao thuộc issue 52). Nên chia nhóm theo mùa, kèm trang xem sprite như `_sprites2.html`.

## Acceptance criteria

- [ ] Unit test (seam 1) cho chuyển v3→v4: nạp bản v3 mẫu (mới tạo, đang chơi dở có cây đang lớn và đồ trong túi) thì cây giữ nguyên tiến độ, đồ cũ thành ★1, giếng cấp 1, thành thạo cấp 1 với số lần thu hoạch lấy từ thống kê. Chạy chuyển hai lần cho cùng kết quả, bản v3 vẫn còn. Bản v3 hỏng thì báo lỗi, không ghi đè.
- [ ] Unit test: bảng cây có đúng 16 cây, mỗi mùa đúng 4 cây hợp mùa, 8 cây cũ giữ nguyên id và số liệu cũ, mọi cây đều có nhóm thời gian và cấp mở khóa.
- [ ] Unit test: hạt cây mới chỉ mua được khi đủ cấp người chơi; chưa đủ cấp thì bị từ chối.
- [ ] Toàn bộ unit test cũ vẫn pass.
- [ ] E2E (Playwright, desktop + 360px): nạp bản lưu v3 ghi sẵn có cây đang lớn → game mở, cây còn nguyên tiến độ, thu hoạch được.
- [ ] E2E: dựng bản lưu có đủ 16 cây ở đủ 5 giai đoạn, bệnh, héo, chết → mỗi cây hiện hình riêng (kiểm bằng ảnh chụp từng cây), không có hai cây khác loại dùng cùng hình ở giai đoạn giữa.
- [ ] E2E: mở chợ Bà Tư ở cấp đủ → thấy hạt cây mới và mua được.

## Blocked by

- [49](49-phat-hanh-phase-2.md)
