# 26. Bạn bè và danh sách cổng vườn trong làng

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0011 · User story 36–41

## What to build

Làng có bảng bạn bè và các cổng vườn để chọn nơi sang thăm. Chưa bước vào vườn được (issue 27).

- **Bạn bè (bảng riêng trong SQLite):**
  - Thêm bạn bằng **tên nhân vật** hoặc **mã kết bạn** (mỗi tài khoản có một mã của mình, xem được trong bảng bạn bè).
  - Xóa bạn.
  - Danh sách bạn hiện **cấp**, **trạng thái online**, và biểu tượng **"🍅 có đồ chín"** hay **"🐛 cần giúp"** (cây chín, sâu hoặc cỏ chưa xử lý) lấy từ bản lưu mới nhất của vườn bạn. Chỉ là cờ tóm tắt, server không lộ cả bản lưu.
- **Ai vào vườn ai cũng được:** kết bạn không phải điều kiện để thăm, chỉ để ghim và nhận thông báo (DESIGN §7.1).
- **Cổng vườn trong làng:** làng có hàng cổng, mỗi cổng ứng với vườn của một người chơi. Danh sách cổng lấy từ server, **bạn bè được ghim lên đầu**, rồi tới người còn lại. Mỗi cổng hiện tên chủ vườn và cấp.
- **Nhận thông báo khi bạn bè ghé vườn mình:** chuẩn bị đường đẩy sự kiện "bạn bè ghé" xuống chủ vườn qua WebSocket, hiện thông báo 🟡 (mức quan trọng). Nguồn sự kiện ghé là issue 27.
- **Giao diện:** nút Bạn bè trong làng mở bảng danh sách; ô nhập tên hoặc mã; nút xóa có hỏi lại. Lỗi rõ lý do: không có tên đó, đã là bạn, tự thêm chính mình.
- **Pixel art mới:** biểu tượng trạng thái trong danh sách và biển hiệu cổng vườn. Danh sách sprite cần vẽ: cổng vườn của người chơi trong làng (gỗ, có biển tên, 2 kiểu cho cổng thường và cổng bạn ghim), chấm online/offline, biểu tượng 🍅 và 🐛 pixel. **Pixel art do agent Opus vẽ.**

## Acceptance criteria

- [x] Unit test (seam 3): thêm bạn bằng tên và bằng mã đều thành công; tên không tồn tại, mã sai, đã là bạn, tự thêm mình đều bị từ chối với đúng lý do.
- [x] Unit test (seam 3): danh sách bạn trả đúng cấp, online (có kết nối WebSocket) hay offline; cờ 🍅 bật khi vườn bạn có ô chín và 🐛 bật khi có sâu hoặc cỏ (dựng bằng đẩy bản lưu ghi sẵn).
- [x] Unit test (seam 3): danh sách bạn không chứa bản lưu hay số liệu riêng ngoài cấp và các cờ.
- [x] Unit test (seam 3): xóa bạn chỉ bỏ quan hệ bạn bè, không xóa vườn hay tài khoản của ai; sau khi xóa, người kia không còn trong phần ghim của người xóa.
- [x] Unit test (seam 3): danh sách cổng vườn có bạn bè ở đầu rồi tới người khác, không có chính mình.
- [x] E2E (Playwright, 2 trình duyệt, desktop + 360px): A thêm B bằng tên → danh sách A hiện B với cấp và online; B offline thì chuyển sang offline; cổng vườn của B ở đầu danh sách cổng của A.
- [x] E2E: thêm bạn bằng mã kết bạn của B thành công; xóa bạn thì B biến khỏi phần ghim.
- [x] Bảng bạn bè và danh sách cổng không tràn ngang ở 360px, nút đủ to.

## Blocked by

- [25](25-lang-real-time.md)
