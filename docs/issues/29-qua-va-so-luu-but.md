# 29. Tặng quà và sổ lưu bút ở cổng

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0012 · User story 54–56

## What to build

Khách để lại món quà và lời nhắn ở cổng vườn; chủ về là thấy.

- **Tặng quà (thao tác `gift` trong luật khách):** khách chọn **hạt giống hoặc nông sản** từ giỏ của mình, bỏ vào **hộp quà ở cổng** vườn bạn. Trừ khỏi giỏ khách, cộng vào hộp quà. Có giới hạn số món mỗi lần và số quà đang chờ ở một cổng để hộp không phình vô hạn. Cùng cơ chế mã thao tác và hàng đợi như issue 28 nên tặng hai lần cùng mã chỉ tính một lần.
- **Nhận quà:** chủ ra cổng vườn mở hộp quà, lấy đồ vào giỏ (giỏ đầy thì lấy được phần vừa; phần dư nằm lại trong hộp). Quà của chủ offline cũng nằm chờ.
- **Sổ lưu bút ở cổng:** bảng riêng trong SQLite. Khách ký một dòng lời nhắn ngắn (có giới hạn độ dài và mỗi người mỗi ngày chỉ ký một lần mỗi sổ). Chủ đọc được tất cả dòng, mới nhất ở trên, kèm tên người ký và ngày.
- **Thông báo:** chủ nhận thông báo 🟡 khi có quà hoặc lời nhắn mới (gộp nếu nhiều).
- **Giao diện:** ở cổng vườn có hai vật tương tác (hộp quà và sổ lưu bút). Khách bấm hộp quà thì chọn món để tặng; bấm sổ thì viết dòng nhắn. Chủ bấm thì thấy quà để nhận và các dòng đã ký.
- **Pixel art mới:** danh sách sprite cần vẽ: hộp quà ở cổng (đóng, mở, có quà), sổ lưu bút trên giá (đóng, mở), biểu tượng quà trên thông báo. **Pixel art do agent Opus vẽ.**

## Acceptance criteria

- [x] Unit test (seam 1): `gift` trừ đúng món khỏi giỏ khách, cộng đúng vào hộp quà; món khách không có, số lượng vượt giỏ, hay hộp đã đầy đều bị từ chối với đúng lý do; áp dụng hai lần cùng mã chỉ tính một lần.
- [x] Unit test (seam 1): chủ nhận quà vào giỏ đúng; giỏ đầy thì phần dư ở lại hộp, không mất đồ.
- [x] Unit test (seam 3): ký sổ lưu bút được; dòng quá dài, rỗng, hay ký lần thứ hai trong cùng ngày ngoài đời bị từ chối; đọc sổ trả các dòng theo thứ tự mới nhất trước.
- [x] Unit test (seam 3): quà gửi cho chủ offline vẫn vào hộp qua hàng đợi và còn nguyên khi chủ đăng nhập lại.
- [x] E2E (Playwright, 2 trình duyệt, desktop + 360px): B tặng một gói hạt giống ở cổng vườn A và ký sổ "Vườn đẹp quá!" → A (đang online) thấy thông báo → A mở hộp quà nhận hạt giống vào giỏ → A đọc sổ thấy dòng của B.
- [x] E2E: A offline lúc B tặng quà, A đăng nhập sau đó vẫn nhận được quà và đọc được lời nhắn.
- [x] Khung chọn quà và khung viết lưu bút không tràn ngang ở 360px, ô nhập không bị bàn phím che mất nút gửi. (bàn phím thật **chỉ giả lập**: e2e 360px kiểm tra khung không tràn ngang và nút ✍️ Ký sổ nằm ngay dưới ô nhập, cùng nhìn thấy trong khung bảng)

## Blocked by

- [27](27-tham-vuon-ban.md)
