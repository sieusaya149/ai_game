# 109. ART đợt 4C: cư dân và thợ

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §4, §6b · ADR 0017 · Hình cho user story 109–126

**Model gợi ý:** Opus

## What to build

- **Pixel art do agent Opus vẽ.** Cư dân (hình riêng từng người, theo bảng §6b) và **4 thợ** (Bé Tí, Cô Lan, Chú Chín, Anh Bảy) mỗi người có hình đi, ngủ gật, làm việc; bảng thuê ở cổng làng.
- Làm trang xem sprite như `public/_sprites3.html`; **tên sprite hẹn trước** để các issue 96, 98 nối vào, dùng hình tạm tới khi issue này gộp.

## Acceptance criteria

- [ ] Có đủ sprite theo danh sách, có trang xem sprite; mỗi thợ đủ đi/ngủ gật/làm việc.
- [ ] Tên sprite khớp danh sách hẹn trước; không đổi sprite cũ.
- [ ] Chủ game duyệt bằng mắt trên trang xem sprite.
- [ ] Nếu thêm test thì chỉ kiểm tên sprite có đủ trong bảng art qua API công khai; không thêm hook vào game.

## Blocked by

- [95](95-bang-so-lieu-dot-4c.md)
