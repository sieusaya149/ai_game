# 88. Máy ấp 3 cấp

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §3.3c, §2.1b · ADR 0005 · User story 98, 99

**Model gợi ý:** Sonnet

## What to build

- Ổ ấp đứng riêng thành **Máy ấp**, nâng ở tiệm rèn. Cấp 1: 1 trứng, thời gian như cũ. Cấp 2: 3 trứng, ×0,75 thời gian, tốn điện. Cấp 3: 6 trứng, ×0,5 thời gian, tốn điện, **nhận cả trứng ngỗng** (issue 85). Cấp 2–3 ghi điện vào đồng hồ của issue 69 và dừng khi cắt điện (trứng không hỏng, thời gian ấp tạm dừng). Giá nâng, điện: lấy từ bảng số liệu đợt (issue 78).
- **Ổ ấp tự động ở chuồng gia cầm cấp 3 giữ nguyên.** Chỉ trứng có phôi mới ấp nở (luật Phase 2). Bản lưu có ổ ấp cũ chuyển thành máy ấp cấp 1 không mất trứng đang ấp.
- Hình tạm tới khi issue ART 92 gộp.

## Acceptance criteria

- [ ] Unit test (seam 1): số trứng và hệ số thời gian đúng 3 cấp; cấp 1 không tốn điện; cấp 1–2 từ chối trứng ngỗng, cấp 3 nhận; trứng không phôi không nở.
- [ ] Unit test: cắt điện thì máy cấp 2–3 tạm dừng, có điện chạy tiếp, trứng không mất; ổ ấp tự động chuồng cấp 3 không đổi; ổ ấp cũ trong bản lưu thành máy cấp 1 giữ trứng đang ấp.
- [ ] Unit test (seam 3): server chạy bù ấp trứng trong máy cấp 3 cho cùng số con nở như trình duyệt.
- [ ] E2E (desktop + 360px): nâng máy ấp ở tiệm rèn, đặt nhiều trứng, tua thời gian, thấy gà con nở.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [78](78-bang-so-lieu-dot-4b.md)
