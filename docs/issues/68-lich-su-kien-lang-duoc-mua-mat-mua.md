# 68. Lịch sự kiện làng và được mùa/mất mùa

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.2, §8.6 · ADR 0019 (phần 1), 0014 · User story 19, 20

**Model gợi ý:** Sonnet

## What to build

- **Module lịch sự kiện làng là hàm thuần** (ADR 0019): đầu vào là hạt giống và mốc thời gian (không đọc đồng hồ máy), đầu ra là danh sách sự kiện đang và sắp diễn ra. Viết đủ tổng quát để dùng lại cho mùa dịch (104), hợp tác xã (105), sự kiện diệt chuột (108) và giờ chợ phiên (102). Cùng hạt giống thì cùng kết quả ở trình duyệt và server.
- **Được mùa mất giá / mất mùa được giá:** 2–3 lần mỗi mùa game, mỗi lần 2–3 ngày game, chọn nhóm cây (hoặc món) bị ảnh hưởng và mức giá. Hệ số giá nhân vào hàm giá của issue 67. Tần suất và mức: lấy từ bảng số liệu đợt (issue 64).
- **Báo tin:** radio và bảng tin làng đọc sự kiện từ module lịch, có báo trước. Dùng hình tạm (khối màu, icon chữ) tới khi issue ART đợt này gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): module lịch cho cùng kết quả với cùng hạt giống và mốc giờ; số lần mỗi mùa và độ dài đúng bảng; không phụ thuộc đồng hồ máy.
- [ ] Unit test: được mùa làm giá nhóm bị ảnh hưởng giảm, mất mùa làm tăng; hệ số đi qua hàm giá của issue 67 (cả thùng giao hàng).
- [ ] Unit test (seam 3): server và trình duyệt cùng hạt giống thì cùng lịch.
- [ ] E2E (desktop + 360px): dựng bản lưu có sự kiện giá đang chạy, vào nhà nghe radio và xem bảng tin thấy thông báo, giá ở kho đổi đúng.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [67](67-suc-mua-cua-cho.md)
