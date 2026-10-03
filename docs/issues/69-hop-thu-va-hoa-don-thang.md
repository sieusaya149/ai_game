# 69. Hộp thư và hóa đơn tháng

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.1, §3.3d · ADR 0018, 0004 · User story 21–28

**Model gợi ý:** Sonnet

## What to build

- **Hộp thư** ở cổng vườn nhận thư, hóa đơn và tin báo (một chỗ đọc mọi giấy tờ; chỗ khác trong game gửi thư vào đây được).
- **Đồng hồ điện chung:** mọi máy dùng điện (máy bơm, trạm bơm, vòi sen, máy phun, kho lạnh, máy chế biến, đèn) cộng vào một đồng hồ theo từng máy. **Hóa đơn điện nước tháng game (7 ngày) thay tiền điện hằng ngày của Phase 3:** chốt ngày 1, gửi hộp thư, liệt kê từng máy, hạn trả 3 ngày game. Giá điện từng máy: lấy từ bảng số liệu đợt (issue 64). Tắt máy trước khi nghỉ thì không tính điện lúc offline.
- **Quá hạn thì cắt điện** (một cờ mà mọi máy đọc): máy bơm, vòi sen, máy phun, kho lạnh, máy chế biến, đèn ngừng; giếng múc tay vẫn dùng được. **Xu không bao giờ âm, đồ không bị tịch thu.** Trả nợ cộng phí đóng lại khoảng 10% thì có điện lại. Khoản tiền điện Phase 3 chưa trả chuyển vào hóa đơn đầu tiên (không mất nợ cũ).
- **UI:** biểu tượng hộp thư có số thư chưa đọc, màn hóa đơn với nút Trả, banner "Đã bị cắt điện". Dùng hình tạm (khối màu, icon chữ) tới khi issue ART đợt này gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): hóa đơn chốt ngày 1 của tháng game, liệt kê đúng từng máy; hạn 3 ngày; quá hạn thì cắt điện, xu không âm, đồ giữ nguyên.
- [ ] Unit test: trả nợ cộng phí thì máy chạy lại; giếng múc tay vẫn dùng được khi mất điện; máy tắt thì không tính điện.
- [ ] Unit test: v4→v5 đưa khoản tiền điện Phase 3 chưa trả vào hóa đơn đầu, không mất nợ cũ (dùng fixture `v4-farm` có nợ điện).
- [ ] Unit test (seam 3): server chạy bù qua nhiều tháng game tạo hóa đơn và cắt điện giống trình duyệt; đồ không mất.
- [ ] E2E (desktop + 360px): dựng bản lưu sát ngày 1, tua tới thấy thư hóa đơn trong hộp thư, mở, trả; bản lưu quá hạn thì thấy cắt điện và trả nợ có phí.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [65](65-ban-luu-v5-kho-theo-lo.md)
