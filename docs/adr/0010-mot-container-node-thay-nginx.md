# Một container Node thay cho nginx: file tĩnh, HTTP, WebSocket và SQLite chung một tiến trình

Từ Phase 1, container `ai-game` chạy một tiến trình Node duy nhất. Nó phục vụ các file trong `public/`, API HTTP (đăng nhập, lưu vườn, thao tác của khách), WebSocket qua `ws` (ADR 0007), và lưu dữ liệu bằng `node:sqlite` trong một file nằm trên Docker volume. Caddy của `ai_gateway` vẫn đứng trước và lo HTTPS (ADR 0006), nên Node chỉ nghe HTTP trong mạng `gateway`. `server.js` cũ đang hỏng được viết lại, không sửa tiếp.

## Considered Options

- **Giữ nginx cho file tĩnh, thêm container Node cho API:** tách bạch hơn, nhưng thêm một container, thêm cấu hình proxy, và nhóm ≤ 20–30 người không cần chia tải.
- **Postgres hay Redis:** mạnh hơn nhưng thêm dịch vụ phải chạy và sao lưu. SQLite một file là đủ, sao lưu chỉ cần chép file.

## Consequences

- Bản chơi đơn vẫn chạy được không cần server (mở `public/` bằng server tĩnh), vì vườn offline vẫn ở `localStorage`.
- Mất volume là mất hết vườn online: phải có lệnh sao lưu file SQLite trên VPS.
- Một tiến trình nên khởi động lại là ngắt mọi kết nối WebSocket. Trình duyệt phải tự kết nối lại và chơi tiếp trong vườn mình lúc rớt mạng.
