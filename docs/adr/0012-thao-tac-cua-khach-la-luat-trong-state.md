# Thao tác của khách là luật trong `state.js`, server chỉ kiểm tra và xếp hàng

Giúp, tặng quà, trộm và mọi giới hạn đi kèm (25% mỗi ô, 1 lần mỗi người mỗi ô, 30% mỗi vườn mỗi ngày, 10 lần giúp, bảo vệ người dưới cấp 5) được viết thành **hàm thuần trong `state.js`**: nhận bản lưu của chủ vườn, người làm và thao tác, trả về kết quả hoặc lý do từ chối. Server gọi đúng hàm đó trên bản lưu mới nhất để kiểm tra, ghi thao tác vào hàng đợi kèm một mã duy nhất, rồi đẩy sang trình duyệt chủ vườn nếu chủ đang online. Trình duyệt chủ áp dụng lại cùng hàm đó. Áp dụng hai lần cùng một mã thì lần sau không làm gì.

**Một thiết bị mỗi tài khoản** dùng "phiên chơi": đăng nhập ở máy mới thì server cấp phiên mới, máy cũ nhận lệnh lưu lần cuối rồi thoát, và server từ chối mọi bản lưu mang phiên cũ.

## Considered Options

- **Luật khách viết riêng trên server:** nhanh lúc đầu, nhưng hai bản luật sẽ lệch nhau, và trình duyệt chủ không biết vì sao một thao tác bị từ chối.
- **Server áp dụng thẳng vào bản lưu khi chủ online:** sẽ ghi đè lẫn nhau với bản lưu trình duyệt chủ gửi lên mỗi 10 giây.

## Consequences

- Khi chủ offline, server chạy bù vườn bằng `state.js` (ADR 0002) rồi áp dụng hàng đợi ngay trên bản lưu đó.
- Xung đột hiếm (khách hái ô mà chủ vừa hái) được giải quyết bằng cách hàm luật trả "không còn gì để lấy". Khách không nhận được đồ, không có lỗi.
