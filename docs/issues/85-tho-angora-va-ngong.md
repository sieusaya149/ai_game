# 85. Thỏ angora và ngỗng

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §2.1a, §2.1b, §2.4 · ADR 0013 · User story 82–85, 97

**Model gợi ý:** Sonnet

## What to build

- Loài mới dùng lại hệ vật nuôi Phase 2: thêm dòng vào bảng loài (vòng đời 4 giai đoạn, đực/cái, sinh sản, sản phẩm, chuồng), không tách hệ mới. Hình tạm tới khi issue ART 92 gộp; khi phát hành mỗi loài có hình riêng cho từng giai đoạn, không dùng chung.
- **Thỏ angora** (cấp 3, chuồng thỏ mới): lông thỏ (nguyên liệu khung dệt), đẻ 2–4 con một lứa, **dễ bị chuột và chồn bắt** (luật kẻ săn mồi Phase 2).
- **Ngỗng** (cấp 6, thả rông): trứng ngỗng (ấp được ở máy ấp cấp 3, issue 88). **Canh nhà:** thấy người lạ thì kêu inh ỏi và đuổi mổ (móc nhỏ như chó Mực canh khách, issue 31). Số liệu hai loài: lấy từ bảng số liệu đợt (issue 78).
- Mỗi loài đủ 4 giai đoạn, đực/cái, sinh sản theo luật Phase 2 (user story 97 áp cho cả issue 86, 87).

## Acceptance criteria

- [ ] Unit test (seam 1): hai loài có bảng đủ 4 giai đoạn, đực/cái; lứa thỏ 2–4 con; sinh sản theo luật Phase 2; sản phẩm đúng.
- [ ] Unit test: chuồng thỏ mở đúng cấp; thỏ bị chuột/chồn bắt theo luật kẻ săn mồi; ngỗng phát hiện người lạ thì kêu và đuổi, không làm khách bị thương nặng.
- [ ] Unit test (seam 3): server chạy bù cho cùng vòng đời và sản phẩm như trình duyệt.
- [ ] E2E (desktop + 360px): mua thỏ và ngỗng, thấy chuồng thỏ, ngỗng đi thả rông; khách (vườn bạn) bị ngỗng đuổi.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [78](78-bang-so-lieu-dot-4b.md)
