# 110. ART đợt 4C: sạp, xe hàng rong, hội chợ, hợp tác xã, cúp, livestream, rắn

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.3, §8.6 · ADR 0017 · Hình cho user story 100–108, 127–160

**Model gợi ý:** Opus

## What to build

- **Pixel art do agent Opus vẽ.** Sạp 3 cấp (4/6/8 ô), xe hàng rong, gian hội chợ (loto, ném vòng, bắn lon, vòng quay), nhà hợp tác xã, cúp và bảng vinh danh, khung livestream (nút, độ hot 🔥, bình luận), sao 🏪, rắn (và chuột/sâu tràn nếu thiếu).
- Làm trang xem sprite như `public/_sprites3.html`; **tên sprite hẹn trước** để các issue 100–108 nối vào, dùng hình tạm tới khi issue này gộp.

## Acceptance criteria

- [ ] Có đủ sprite theo danh sách, có trang xem sprite; sạp đủ 3 cấp.
- [ ] Tên sprite khớp danh sách hẹn trước; không đổi sprite cũ.
- [ ] Chủ game duyệt bằng mắt trên trang xem sprite.
- [ ] Nếu thêm test thì chỉ kiểm tên sprite có đủ trong bảng art qua API công khai; không thêm hook vào game.

## Blocked by

- [95](95-bang-so-lieu-dot-4c.md)
