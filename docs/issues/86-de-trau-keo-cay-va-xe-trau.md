# 86. Dê, trâu, kéo cày và xe trâu

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §2.1a, §3.3c · ADR 0005, 0013 · User story 86–90, 97

**Model gợi ý:** Sonnet

## What to build

- Loài mới dùng lại hệ vật nuôi Phase 2: thêm dòng vào bảng loài (vòng đời 4 giai đoạn, đực/cái, sinh sản, sản phẩm, chuồng), không tách hệ mới. Hình tạm tới khi issue ART 92 gộp; khi phát hành mỗi loài có hình riêng cho từng giai đoạn, không dùng chung.
- **Dê** (cấp 6, đồng cỏ): sữa dê (nguyên liệu phô mai dê, issue 71), **hay nhảy rào gặm rau**, cần rào cao. **Trâu** (cấp 9, đồng cỏ): thích đầm bùn.
- **Kéo cày:** dắt bò tơ, bò đực hoặc trâu ra ruộng rồi bấm "Cày": **bò xới cả hàng, trâu xới khối 3×3**. Người tốn ít thể lực hơn cuốc, con vật mau đói và mệt hơn, mỗi con cày một số lần mỗi ngày game. Số liệu: lấy từ bảng số liệu đợt (issue 78).
- **Xe trâu:** trại có trâu trưởng thành khỏe thì thùng giao hàng trả **85%** thay vì 80% và chứa **gấp đôi**.
- Mỗi loài đủ 4 giai đoạn, đực/cái theo luật Phase 2.

## Acceptance criteria

- [ ] Unit test (seam 1): bảng loài dê, trâu đủ 4 giai đoạn, đực/cái; dê nhảy qua rào thấp, không nhảy qua rào cao; trâu thích đầm bùn.
- [ ] Unit test: cày bằng bò xới đúng cả hàng, trâu đúng khối 3×3; tốn thể lực người ít hơn cuốc; con vật mệt và mau đói; mỗi con có giới hạn lần cày mỗi ngày game; con quá nhỏ hoặc bệnh không cày được.
- [ ] Unit test: có trâu trưởng thành khỏe thì thùng giao hàng trả 85% và sức chứa ×2; trâu non/bệnh/không có thì như cũ.
- [ ] Unit test (seam 3): server chạy bù cho cùng số lần cày hồi và thùng giao hàng giống trình duyệt.
- [ ] E2E (desktop + 360px): dắt bò ra ruộng bấm Cày, thấy cả hàng được xới; dắt trâu thấy khối 3×3.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [78](78-bang-so-lieu-dot-4b.md)
