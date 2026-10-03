# 65. Bản lưu v5, kho theo lô và đồ hư

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §3.3b, §0b · ADR 0018, 0004, 0008 · User story 6–11, 164

**Model gợi ý:** Opus

## What to build

- Đây là lát dọn đường cho cả Phase 4, như [issue 50](50-ban-luu-v4-16-cay.md). Về luật chơi, người chơi cũ gần như chỉ thấy đồ tươi bắt đầu hư và viền vàng. Bên dưới, bản lưu đã có chỗ cho mọi hệ thống sau (ADR 0018: **v5 đúng một lần ở đầu 4A**).
- **Bản lưu v5 và bước chuyển v4→v5:** thêm một hàm chuyển đúng một bậc vào chuỗi chuyển đổi, thuần, không ngẫu nhiên, không đọc đồng hồ. Đồ cũ coi như **tươi** (lô mới), kho cấp 1, chưa có kho lạnh, chưa nợ hóa đơn (khoản tiền điện chưa trả của Phase 3 để issue 69 chuyển vào hóa đơn đầu). Bản v4 vẫn được giữ, chuyển lỗi thì không ghi đè. Chuẩn bị chỗ trong bản lưu cho: cấp kho và kho lạnh, sức mua đã bán theo món, hộp thư, hóa đơn, độ bền trên thực thể, hàng chờ máy (các issue sau điền dữ liệu).
- **Kho theo lô:** mỗi món tươi giữ các lô `{ số lượng, sao, độ tươi còn lại }`, món không hư (hạt, lông, tơ, đồ chế biến) giữ số đếm. Kho, giỏ, túi dùng cùng cấu trúc; thùng giao hàng, hộp quà và hàng đang chờ trong máy không hư.
- **Một API kho chung** cho mọi chỗ cộng/trừ hàng (thu hoạch, bán, đơn hàng, trộm, quà, đặt hàng online, thùng giao hàng). Lấy ra thì lấy **lô gần hư nhất trước**. Thay hết chỗ code đang cộng/trừ trực tiếp vào kho cũ bằng API này.
- **Đồng hồ hư chạy trong `tick` lúc chủ đang chơi;** `catchUp` (trình duyệt và server) và lúc vườn đóng băng bỏ qua bước hư (ADR 0018). Thời gian hư: lấy từ bảng số liệu đợt (issue 64). Đồ hư thành **rác hữu cơ**, bỏ vào hố ủ được (luật hố ủ Phase 3).
- **UI:** món sắp hư có viền vàng và số giờ còn lại ở kho, giỏ, túi. Dùng hình tạm (khối màu, icon chữ) tới khi issue ART đợt này gộp; khi phát hành không dùng chung hình giai đoạn.
- Chụp fixture `v4-farm` (vườn đang chơi dở) và `v4-fresh` (vườn mới) bằng code v4 trước khi sửa, lưu cạnh các fixture cũ.

## Acceptance criteria

- [ ] Unit test (seam 1) chuyển v4→v5: nạp `v4-farm` thì cây, con vật, xu, đồ giữ nguyên, đồ cũ thành lô tươi, kho cấp 1. Chạy chuyển hai lần cho cùng kết quả, bản v4 vẫn còn. Bản v4 hỏng thì báo lỗi, không ghi đè (prior art `tests/save-v4.test.mjs`).
- [ ] Unit test: kho theo lô; lấy ra thì lấy lô gần hư trước; món không hư giữ số đếm; mọi chỗ cộng/trừ hàng đi qua API chung (bán, đơn hàng, thu hoạch, trộm, quà, thùng giao hàng cho cùng kết quả như trước).
- [ ] Unit test: đồ hư đúng bảng khi `tick` lúc đang chơi; **`catchUp` không làm đồ hư**; đóng băng không hư; thùng giao hàng, hộp quà, hàng trong máy không hư; hư thành rác hữu cơ, bỏ vào hố ủ được.
- [ ] Unit test (seam 3, `bootServer`): server chạy bù đoạn dài cho đồ không hư và cùng bản lưu với trình duyệt; bản v4 của người dùng cũ lên server thì được chuyển sang v5 không mất gì.
- [ ] E2E (desktop + 360px) với `v4-farm`: vào game thấy vườn như cũ, mở kho thấy đồ sắp hư có viền vàng và số giờ; tua thời gian đang chơi thì đồ hư thành rác, bỏ vào hố ủ được.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [64](64-bang-so-lieu-dot-4a.md)
