# Đổi phiên chơi: server chờ bản lưu cuối của máy cũ rồi mới trao vườn cho máy mới

Chi tiết cho phần "một thiết bị mỗi tài khoản" của ADR 0012. Máy mới xin phiên chơi (`POST /api/play`) thì server **chưa trả lời ngay**: nó gửi `kicked` qua WebSocket tới máy đang giữ phiên cũ, máy cũ gửi bản lưu cuối bằng phiên cũ (phiên đó vẫn đang giữ quyền ghi nên được nhận như mọi bản khác), rồi đóng kết nối. Server chờ tới khi nhận bản cuối, hoặc máy cũ đóng kết nối, hoặc hết `FINAL_MS` (3 giây). Sau đó mới đổi phiên, đọc vườn và trả cho máy mới. Từ lúc đổi, mọi bản lưu mang phiên cũ bị từ chối `409 play_replaced`, máy cũ hiện "Bạn đã đăng nhập ở thiết bị khác".

## Considered Options

- **Đổi phiên ngay, cho phiên cũ ghi thêm trong một cửa sổ ngắn:** máy mới đã đọc vườn trước khi bản cuối tới, nên lần tự lưu đầu tiên của máy mới ghi đè mất bản cuối. Cửa sổ chỉ làm bản cuối "được nhận" trên giấy.
- **Máy mới tự đợi vài giây rồi đọc lại vườn:** phải đoán thời gian, và vẫn có lúc đọc trước khi bản cuối tới.

## Consequences

- Đăng nhập máy mới có thể chậm tới 3 giây khi máy cũ đang mở mà không trả lời (tab bị treo). Máy cũ không có WebSocket (mất mạng, đã đóng) thì đổi ngay, phần chưa gửi của máy cũ (tối đa một nhịp tự lưu, cộng thời gian mất mạng) bị bỏ: máy mới thắng.
- Trang tự tải lại cũng là "máy mới": bản lưu `keepalive` lúc `pagehide` thường tới trước, và kết nối cũ đóng làm server khỏi chờ.
- Hàng đợi thao tác của khách (issue 28, 30) đẩy tới đúng các kết nối đang giữ phiên hiện tại (`live.sendTo`).
