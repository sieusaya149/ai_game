# Seam test thứ ba: giao thức server (HTTP + WebSocket)

Bổ sung cho ADR 0008. Từ Phase 1 có thêm đúng một seam: **giao thức của server nhìn từ bên ngoài**. Test bằng `node --test`, bật server thật ngay trong tiến trình test với một file SQLite tạm (hoặc `:memory:`), rồi gọi bằng HTTP và WebSocket thật như trình duyệt. Không gọi thẳng hàm bên trong server, không mock cơ sở dữ liệu.

E2E online mở hai trình duyệt (hai người chơi) vào server chạy local. Tình huống được dựng qua chính API công khai của server: đăng ký tài khoản test, đẩy bản lưu ghi sẵn lên. Vẫn không có hook nào chỉ dành cho test. Muốn tua thời gian của một vườn online thì lùi `savedAt` trong bản lưu đẩy lên, để cơ chế server chạy bù tự đẩy thời gian tới. Riêng mã mời được tạo bằng lệnh quản trị trên server, nên test cũng tạo mã mời bằng lệnh đó.

Phase 2 và 3 không thêm seam mới: luật vật nuôi, cây và nước nằm trong `state.js` (seam 1), và server chạy bù cũng chỉ gọi `state.js`.

## Consequences

- Server phải khởi động được bằng một hàm nhận cổng và đường dẫn cơ sở dữ liệu, để test bật và tắt nhiều lần.
- Smoke live dùng một tài khoản test riêng và tự xóa vườn của nó sau khi chạy.
