# 21. Tài khoản: đăng ký mã mời, PIN, đăng nhập 30 ngày

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0010, 0011, 0012 · User story 1–5, 8–10, 14

## What to build

Người quen có mã mời đăng ký và đăng nhập được; người lạ thì không. Chưa có vườn online, vào xong chỉ thấy màn chờ "Đã vào làng".

- **Mô-đun tài khoản trên server:**
  - **Đăng ký:** tên nhân vật (duy nhất trong làng, không phân biệt hoa thường), PIN 6 số, mã mời dùng một lần. PIN được băm có muối, không lưu rõ.
  - **Đăng nhập:** đúng tên và PIN thì trả mã phiên giữ 30 ngày. Đăng xuất thì hủy mã phiên đó.
  - **Khóa tạm:** sai PIN nhiều lần liên tiếp thì khóa tên đó một lúc, kể cả khi sau đó nhập đúng.
- **Lệnh quản trị trong container:** tạo mã mời, đặt lại PIN, xóa tài khoản. Không có giao diện quản trị. Test seam 3 cũng dùng đúng lệnh này để tạo mã mời.
- **Màn đầu của game:** chọn **Chơi một mình** hoặc **Vào làng**. Chơi một mình vào thẳng bản chơi đơn như Phase 0, không cần mạng. Vào làng mở màn đăng nhập / đăng ký.
- **Màn đăng ký và đăng nhập:**
  - Thông báo lỗi rõ lý do: tên đã có người dùng, mã mời sai, mã mời đã dùng, PIN phải đủ 6 số, sai tên hoặc PIN, đang bị khóa tạm (kèm còn bao lâu).
  - Đăng nhập được giữ 30 ngày trên máy: mở lại game thì vào thẳng, không hỏi PIN. Có nút **Đăng xuất**.
  - Quên PIN: có dòng hướng dẫn "Nhờ quản trị đặt lại PIN".
- **Cổng vườn bạn bè khi offline:** ở làng, cổng vào vườn bạn bè hiện biển **"Đăng nhập để thăm bạn bè"** thay cho biển "Sắp ra mắt".
- **Nút tốc độ x5/x20** vẫn còn khi chơi một mình.

## Acceptance criteria

- [x] Unit test (seam 3): đăng ký thành công với mã mời hợp lệ; mã mời đã dùng bị từ chối; mã mời sai bị từ chối; tên trùng (kể cả khác hoa thường) bị từ chối; PIN không đủ 6 số bị từ chối. Mỗi từ chối trả đúng mã lý do để giao diện hiện đúng câu.
- [x] Unit test (seam 3): PIN lưu trong SQLite không chứa PIN gốc; hai tài khoản cùng PIN có giá trị băm khác nhau.
- [x] Unit test (seam 3): sai PIN đủ số lần quy định thì tên bị khóa tạm và đăng nhập đúng PIN trong lúc khóa vẫn bị từ chối; hết thời gian khóa thì đăng nhập lại được.
- [x] Unit test (seam 3): mã phiên hợp lệ trong 30 ngày, hết hạn thì bị từ chối (dựng bằng lùi hạn phiên trong cơ sở dữ liệu tạm, không hook); sau đăng xuất mã phiên không dùng lại được.
- [x] Unit test: lệnh quản trị tạo mã mời dùng được đúng một lần; đặt lại PIN cho phép đăng nhập bằng PIN mới và từ chối PIN cũ; xóa tài khoản làm tên dùng lại được.
- [x] E2E (Playwright, desktop + 360px): tạo mã mời bằng lệnh quản trị → đăng ký → reload vẫn còn đăng nhập → đăng xuất → quay về màn chọn chế độ. Thử mã mời đã dùng thì thấy câu lỗi đúng.
- [x] E2E: ở chế độ Chơi một mình, cổng vườn bạn bè ở làng hiện biển "Đăng nhập để thăm bạn bè", và nút x5/x20 vẫn dùng được.
- [x] Màn chọn chế độ và màn đăng nhập không tràn ngang ở 360px, ô nhập PIN dùng bàn phím số trên điện thoại.

## Blocked by

- [20](20-server-node-mot-container.md)
