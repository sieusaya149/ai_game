# 92. ART đợt 4B: 7 loài mới, chuồng mới, máy ấp, máy gắn cố định

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §2.1a, §2.5, §3.3c · ADR 0017 · Hình cho user story 82–104

**Model gợi ý:** Opus

## What to build

- **Pixel art do agent Opus vẽ.** **Mỗi loài × 4 giai đoạn, đực/cái, ngủ**, không dùng chung hình giai đoạn: thỏ angora, ngỗng, dê, trâu, bồ câu, công (cả xòe đuôi), ngựa (cả có người cưỡi). Cộng chuồng thỏ, chuồng ngựa, chuồng bồ câu, máy ấp 3 cấp, máng trứng lăn, máy gặt.
- Làm trang xem sprite như `public/_sprites3.html`; **tên sprite hẹn trước** để các issue code 85–89 nối vào, dùng hình tạm tới khi issue này gộp.

## Acceptance criteria

- [ ] Có đủ sprite theo danh sách, có trang xem sprite; mỗi loài đủ 4 giai đoạn × đực/cái × ngủ.
- [ ] Tên sprite khớp danh sách hẹn trước; không đổi sprite cũ.
- [ ] Chủ game duyệt bằng mắt trên trang xem sprite.
- [ ] Nếu thêm test thì chỉ kiểm tên sprite có đủ trong bảng art qua API công khai; không thêm hook vào game.

## Blocked by

- [78](78-bang-so-lieu-dot-4b.md)
