# 99. Trạng thái chung của làng trên server

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §7.2, §8.6 · ADR 0019 (phần 2), 0011, 0020 · Nền cho user story 128, 154, 158

**Model gợi ý:** Opus

## What to build

- Nền cho mọi sự kiện cộng dồn của làng (ADR 0019 phần 2): **giải độc đắc, tiến độ hợp tác xã, thanh diệt chuột, phiếu bình chọn**. Có **bảng SQLite riêng** cho trạng thái chung, **tin WebSocket** gửi đóng góp và phát số mới cho mọi người đang online, **chơi đơn giả lập** trong bản lưu (cùng API công khai, khác nơi giữ). Dùng lịch hàm thuần của issue 68 để biết kỳ nào đang chạy.
- Thiết kế hợp đồng giao thức rõ (loại tin, đóng góp phải hợp lệ do server kiểm, chống gửi trùng bằng mã duy nhất), vì các issue 100, 101, 105, 108 đều dựa vào đây. Server là nguồn đúng khi online, khách chỉ gửi đóng góp (ADR 0012).
- Không có UI riêng ngoài một bảng kiểm tra tạm cho test; UI thật làm ở các issue dùng nó.

## Acceptance criteria

- [ ] Unit test (seam 3, `bootServer`): đóng góp vào một bộ đếm cộng đúng và phát cho mọi người; gửi trùng cùng mã chỉ tính một lần; đóng góp không hợp lệ bị từ chối; kết thúc kỳ thì đóng sổ đúng.
- [ ] Unit test (seam 3): server khởi động lại thì trạng thái chung còn nguyên (SQLite); hai người đóng góp đồng thời cho tổng đúng.
- [ ] Unit test (seam 1): chế độ chơi đơn giả lập trong bản lưu cho cùng API và cùng kết quả với cùng hạt giống.
- [ ] E2E (desktop, online hai trình duyệt): hai người cùng đóng góp, cả hai thấy số đổi theo thời gian thực (bằng bảng kiểm tra tạm).
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [95](95-bang-so-lieu-dot-4c.md)
