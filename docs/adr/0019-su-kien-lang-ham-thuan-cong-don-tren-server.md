# Lịch sự kiện làng là hàm thuần; số cộng dồn của cả làng do server giữ

Phase 4 có hai loại trạng thái chung của làng, xử lý theo hai cách khác nhau.

**1. Lịch sự kiện là hàm thuần,** giống thời tiết (ADR 0014). Được mùa/mất mùa, mùa dịch, nạn chuột/rắn/sâu và chỉ tiêu hợp tác xã của tuần được tính từ **hạt giống của làng** cộng **mốc thời gian** (ngày game cho được mùa/mất mùa; giờ thật Việt Nam cho mùa dịch, sự kiện diệt chuột, hợp tác xã, chợ phiên). Chơi đơn dùng hạt giống của vườn. Server, mọi trình duyệt và lần chạy bù đều ra cùng một lịch, nên báo trước được ("📢 Sắp có cúm gia cầm") mà không cần lưu lịch sử.

**2. Số cộng dồn của cả làng do server giữ** trong bảng SQLite riêng: giải độc đắc loto, tiến độ hợp tác xã, thanh tiến độ diệt chuột/rắn/sâu, phiếu bình chọn thi nông sản, số người chơi tuần trước (để tính chỉ tiêu). Trình duyệt chỉ **gửi đóng góp** (vé loto, món góp hợp tác xã, con đã diệt, phiếu bầu) qua WebSocket. Server cộng, kiểm giới hạn bằng hàm thuần trong `state.js`, rồi phát số mới cho mọi người online. Phần thưởng chia cho từng vườn đi theo đường thao tác của ADR 0012 (xếp hàng, có mã duy nhất, áp một lần).

Chơi đơn giả lập phần cộng dồn ngay trong bản lưu (dân làng NPC góp thêm), dùng cùng hàm luật.

## Considered Options

- **Server bốc thăm sự kiện rồi phát:** phải lưu lịch sử để chạy bù và báo trước, bản chơi đơn phải làm cách khác.
- **Mỗi vườn tự giữ số cộng dồn:** không có giải độc đắc chung, không có chỉ tiêu cả làng.
- **Server giữ cả lịch sự kiện:** thừa, vì lịch không phụ thuộc người chơi làm gì.

## Consequences

- Đổi bảng tần suất sự kiện là đổi lịch của cả quá khứ, giống thời tiết. Không sao vì sự kiện đã qua không được lưu.
- Server có thêm bảng `village_state` (hoặc tương đương) và vài loại tin WebSocket mới. Test giao thức qua `bootServer` (ADR 0011).
- Hàm lịch sự kiện dùng cả giờ thật, nên test truyền mốc giờ vào, không đọc đồng hồ máy.
