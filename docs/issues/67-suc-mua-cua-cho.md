# 67. Sức mua của chợ

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.2 · ADR 0009, 0018 · User story 14–18

**Model gợi ý:** Sonnet

## What to build

- Mỗi món có **sức mua** riêng, tính **riêng từng người** và lưu trong bản lưu (đã bán bao nhiêu mỗi món trong cửa sổ hồi). Bán vượt sức mua thì giá rớt dần, thấp nhất còn 50%, hồi lại sau khoảng 2 ngày game. Mức rớt, sức mua từng món: lấy từ bảng số liệu đợt (issue 64). Bán xả không ảnh hưởng người chơi khác.
- **Một hàm giá chung:** bán ở chợ Bà Tư, bán cho Chú Ba, đơn hàng, và **thùng giao hàng chốt lúc 6h** đều đi qua cùng hàm giá nên không lách bằng cách bỏ thùng. Bán thì lấy lô gần hư trước (API kho issue 65).
- **UI:** kho và chợ hiện giá hôm nay, số còn bán được đủ giá và mũi tên ↑↓ theo xu hướng. Dùng hình tạm (khối màu, icon chữ) tới khi issue ART đợt này gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): bán vượt sức mua thì giá rớt đúng bước, sàn 50%, hồi sau 2 ngày game; riêng từng món.
- [ ] Unit test: thùng giao hàng chốt lúc 6h dùng cùng hàm giá; bán qua thùng không rẻ hơn hay đắt hơn bán tay cùng lượng.
- [ ] Unit test (seam 3): hai người chơi cùng bán một món, giá của người này không bị ảnh hưởng bởi người kia; server chạy bù cho cùng sức mua hồi như trình duyệt.
- [ ] E2E (desktop + 360px): bán liên tục một món tới khi giá rớt, thấy giá hôm nay, số còn bán đủ giá và mũi tên; tua 2 ngày thì giá hồi.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [65](65-ban-luu-v5-kho-theo-lo.md)
