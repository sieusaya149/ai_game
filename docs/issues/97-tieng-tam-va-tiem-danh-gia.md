# 97. Tiếng tăm ⭐ và Tiệm Danh Giá

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.5, §6b · ADR 0012, 0020 · User story 113–117

**Model gợi ý:** Sonnet

## What to build

- **⭐ kiếm từ:** đổi công (giúp bạn đủ nhiều lần thì cả hai được ⭐, issue 28 đã có việc giúp, ở đây thêm đếm và thưởng, chạy ở server nên cần seam 3), đơn khó tính của Bé Bi, ❤️5 với cư dân, thành thạo 3, uy tín shop cao (nối khi issue 102 gộp). **Nguồn từ thành tựu, lễ hội, nhiệm vụ hằng ngày để Phase 7 nối vào.** Số lượng mỗi nguồn: lấy từ bảng số liệu đợt (issue 95).
- **Tiệm Danh Giá:** tiêu ⭐ lấy màu lông hiếm cho thú cưng, đồ trang trí độc quyền, danh hiệu dưới tên, bản thiết kế máy cấp cao (kiểu nhà đặc biệt nối ở Phase 5). **⭐ không đổi qua lại với xu, không trộm được, không tặng được.**
- **UI:** số ⭐ trên HUD và hồ sơ, cửa hàng Tiệm Danh Giá. Hình tạm tới khi issue ART 109/110 gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): mỗi nguồn ⭐ cho đúng số lượng, không nhân đôi nếu làm lại; ⭐ không có đường đổi ra xu, không bị trộm, không tặng được; mua đồ ở Tiệm Danh Giá trừ đúng ⭐, đồ độc quyền đi vào đúng chỗ (màu lông, danh hiệu).
- [ ] Unit test (seam 3): đổi công giữa hai tài khoản cho cả hai ⭐ đúng một lần, giới hạn chống gian lận (giúp qua lại giữa hai tài khoản của cùng một người không lách được theo luật Phase 1).
- [ ] E2E (desktop + 360px): bản lưu có ⭐, mua một món ở Tiệm Danh Giá, thấy danh hiệu dưới tên.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [96](96-do-than-voi-cu-dan.md)
