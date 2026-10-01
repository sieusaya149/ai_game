# 59. Vòi sen tự động cho chuồng cấp 3

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · DESIGN §2.2, §3.1b · ADR 0005, 0015, 0008 · User story 73

## What to build

Chuồng cấp 3 (Phase 2 để sẵn chỗ vòi sen) nay chạy bằng nước bồn.

- **Vòi sen:** mỗi sáng tự tắm cả chuồng bằng nước bồn, mỗi con tốn 1 lần nước, mỗi con được +5 vui và hết dơ như tắm tay. Chuồng phải nằm trong tầm nước (lý do "ngoài tầm nước" của issue 57).
- **Bồn cạn:** con nào chưa kịp tắm thì để nguyên, không phạt, ngừng tới khi có nước. Thứ tự trừ nước cố định với tưới nhỏ giọt (ADR 0015).
- **Chạy offline và chạy bù:** vòi sen vẫn chạy khi offline và khi server chạy bù, ra cùng kết quả.
- **Mất điện** do bão (issue 55) thì máy bơm ngừng nhưng nước đã có trong bồn vẫn dùng được cho vòi sen.
- **UI:** chạm chuồng cấp 3 thấy vòi sen đang bật/tắt. Hiệu ứng nước khi tắm.
- **Pixel art do agent Opus vẽ.** Sprite cần vẽ: vòi sen gắn chuồng cấp 3 (bật và tắt), hạt nước khi tắm.

## Acceptance criteria

- [ ] Unit test (seam 1): chuồng cấp 3 trong tầm nước có bồn đủ thì sáng ra mọi con được tắm, bồn giảm đúng số con, mỗi con +5 vui và hết dơ.
- [ ] Unit test: bồn cạn giữa chừng thì chỉ tắm được số con đủ nước, không phạt; chuồng cấp 1, 2 và chuồng ngoài tầm nước không có vòi sen.
- [ ] Unit test (seam 3): server chạy bù qua nhiều buổi sáng cho cùng số con đã tắm và cùng mực nước như trình duyệt.
- [ ] E2E (desktop + 360px): dựng bản lưu chuồng heo cấp 3 có bồn đầy, con dơ → tua tới sáng → cả chuồng sạch, bồn giảm.

## Blocked by

- [57](57-bon-va-mang-nuoc.md)
