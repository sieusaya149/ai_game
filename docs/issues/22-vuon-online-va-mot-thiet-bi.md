# 22. Vườn online: mang vườn lên làng, tự lưu, một thiết bị

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0002, 0011, 0012 · User story 6, 7, 11–13, 15–20, 84

## What to build

Mỗi tài khoản có một vườn trên server, chơi trong trình duyệt và tự lưu lên làng. Đây là lát cắt rủi ro nhất của Phase 1: đồng bộ.

- **Kho vườn trên server:** lưu bản lưu v2 của từng tài khoản, kèm **phiên chơi** đang giữ quyền ghi. Bản lưu có thêm các trường cho online (chế độ `offline | online`, tên tài khoản, thống kê trộm/giúp hôm nay theo ngày ngoài đời, trạng thái xích chó, nhật ký khách). Chỉ là trường thêm nên không đổi số phiên bản v2.
- **Mang vườn lên làng:** lần đầu đăng nhập mà chưa có vườn online, hộp **"Mang vườn này lên làng?"** có hai nút: mang vườn chơi đơn lên, hoặc **Bắt đầu vườn mới**. Chọn mang thì bản lưu offline được chép lên server; **vườn chơi đơn vẫn nằm nguyên trong `localStorage`**. Từ đó hai vườn là hai bản riêng, không đồng bộ lại.
- **Tự lưu:** khi chơi online, trình duyệt chạy mô phỏng và gửi bản lưu lên server khoảng mỗi 10 giây, và khi đóng trang. Thao tác trong vườn mình không chờ mạng.
- **Rớt mạng:** vẫn chơi tiếp trong vườn mình, hiện **biểu tượng nhỏ mất kết nối**, tự kết nối lại và lưu bù lên server khi có mạng.
- **Một thiết bị mỗi tài khoản (ADR 0012):** đăng nhập ở máy mới thì server cấp phiên chơi mới, đẩy lệnh xuống máy cũ qua WebSocket. Máy cũ lưu lần cuối rồi thoát, hiện **"Bạn đã đăng nhập ở thiết bị khác"**. Server từ chối mọi bản lưu mang phiên cũ.
- **Chống gian lận nhẹ:** server từ chối bản lưu có số liệu vô lý so với bản trước (xu, EXP, số đồ tăng quá mức có thể làm được trong khoảng thời gian giữa hai bản lưu).
- **Đồng hồ vẫn như Phase 0** (chưa dùng giờ server, việc của issue 23), nút x5/x20 vẫn dùng được cho tới lúc đó.

## Acceptance criteria

- [x] Unit test (seam 3): đẩy bản lưu rồi lấy lại cho đúng nội dung; tài khoản mới chưa có vườn thì trả "chưa có vườn".
- [x] Unit test (seam 3): đăng nhập lần hai trên thiết bị khác → thiết bị thứ nhất (đang mở WebSocket) nhận lệnh thoát; bản lưu mang phiên cũ bị từ chối với lý do rõ, bản lưu mang phiên mới được nhận.
- [x] Unit test (seam 3): bản lưu có xu tăng vọt vượt mức hợp lý (dựng bằng `savedAt` sát bản trước) bị từ chối và bản cũ trên server giữ nguyên; bản lưu hợp lý thì nhận.
- [x] Unit test (seam 3): WebSocket rớt rồi mở lại với cùng phiên thì tiếp tục nhận sự kiện bình thường.
- [x] Unit test (seam 1): bản lưu có các trường online mới vẫn đọc được bởi code Phase 0; bản lưu thiếu các trường đó được bù mặc định, không lỗi.
- [x] E2E (Playwright, desktop + 360px): đăng ký → hộp "Mang vườn này lên làng?" → mang vườn chơi đơn dựng sẵn (bản lưu ghi sẵn) lên → reload vẫn đúng vườn, đúng xu, đúng cây. Bản lưu chơi đơn trong `localStorage` còn nguyên.
- [x] E2E: chọn "Bắt đầu vườn mới" cho ra vườn khởi đầu sạch, không đụng bản lưu chơi đơn.
- [x] E2E: chơi một thao tác, chờ qua một nhịp tự lưu, đọc lại vườn qua API công khai thấy thao tác đó. Cắt mạng của trình duyệt → hiện biểu tượng mất kết nối, vẫn thao tác được → bật mạng lại → biểu tượng biến mất và vườn lên server.
- [x] E2E hai trình duyệt: đăng nhập cùng tài khoản ở trình duyệt B → trình duyệt A hiện "Bạn đã đăng nhập ở thiết bị khác" và thoát về màn đầu; vườn mà A đã chơi không bị mất.
- [x] Hộp "Mang vườn này lên làng?" và biểu tượng mất kết nối không tràn ngang và không đè HUD ở 360px.

## Blocked by

- [21](21-tai-khoan-va-dang-nhap.md)
