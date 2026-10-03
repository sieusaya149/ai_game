# 91. ART đợt 4B: hồ, cá, ếch, cây trái, sóc, ong, tằm

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §5, §2.1a · ADR 0017 · Hình cho user story 48–58, 59–69, 70, 75–81

**Model gợi ý:** Opus

## What to build

- **Pixel art do agent Opus vẽ**, mỗi loài và mỗi giai đoạn có hình riêng, không dùng chung. Danh sách (PRD 0005, Implementation Decisions, đợt 4B): hồ (nước theo độ sạch, rong), 6 loài cá × 3 cấp, ếch, 7 cây trái + dâu tằm × 3 giai đoạn (mỗi cây có thêm có trái, gãy cành, sâu), trái rụng, sóc, thùng ong, ong, nhà tằm, tằm, kén, mèo vồ.
- Làm trang xem sprite như `public/_sprites3.html`; **tên sprite hẹn trước** để các issue code 79–84 nối vào, dùng hình tạm tới khi issue này gộp.

## Acceptance criteria

- [ ] Có đủ sprite theo danh sách, có trang xem sprite; cá và cây mỗi loài × giai đoạn hình riêng.
- [ ] Tên sprite khớp danh sách hẹn trước; không đổi sprite cũ.
- [ ] Chủ game duyệt bằng mắt trên trang xem sprite.
- [ ] Nếu thêm test thì chỉ kiểm tên sprite có đủ trong bảng art qua API công khai; không thêm hook vào game.

## Blocked by

- [78](78-bang-so-lieu-dot-4b.md)
