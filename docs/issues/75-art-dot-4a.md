# 75. ART đợt 4A

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §3.3b, §3.3c, §3.3d · ADR 0017 · Hình cho user story 8, 12, 21, 29–35, 41, 45

**Model gợi ý:** Opus

## What to build

- **Pixel art do agent Opus vẽ**, mỗi thứ có hình riêng. Danh sách sprite (PRD 0005, Implementation Decisions, đợt 4A): kho 3 cấp, kho lạnh, hộp thư, 8 máy chế biến (mỗi máy 3 trạng thái: đang chạy, dừng, hỏng), cờ lê vàng, bếp, thành phẩm và món ăn, viền hư (viền vàng).
- Làm trang xem sprite như `public/_sprites3.html` (ví dụ `public/_sprites5.html`) để chủ game duyệt bằng mắt. **Tên sprite hẹn trước** (ghi ở đầu issue và trong comment của file art) để các issue code 66–74 nối vào mà không phải đoán tên; issue code dùng hình tạm tới khi issue này gộp.
- Theo phong cách và bảng màu các file `public/art*.js` hiện có; mỗi loại thành phẩm một hình riêng, không dùng chung.

## Acceptance criteria

- [ ] Có đủ sprite theo danh sách trên, có trang xem sprite; mỗi máy có đủ 3 trạng thái.
- [ ] Tên sprite khớp danh sách hẹn trước; không đổi sprite cũ.
- [ ] Chủ game duyệt bằng mắt trên trang xem sprite.
- [ ] Nếu thêm test thì chỉ kiểm tên sprite có đủ trong bảng art qua API công khai của file art; không thêm hook vào game.

## Blocked by

- [64](64-bang-so-lieu-dot-4a.md)
