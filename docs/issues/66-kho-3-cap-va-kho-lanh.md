# 66. Kho 3 cấp và kho lạnh

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §3.3b · ADR 0018 · User story 1–5, 12, 13

**Model gợi ý:** Sonnet

## What to build

- Sức chứa kho tính bằng một hàm: chỉ đếm **hàng bán được**; hạt giống, vật tư, cám, gỗ, đá, đồ trang trí không chiếm chỗ. Sức chứa 3 cấp (100 → 250 → 600) và giá nâng cấp kho: lấy từ bảng số liệu đợt (issue 64).
- **Kho đầy:** đồ thu hoạch chỉ để trong giỏ, thông báo nói rõ lý do ("Kho đầy, bán bớt hoặc nâng kho"). Ai đang vượt sức chứa (ví dụ vừa chuyển từ v4) thì **giữ nguyên**, chỉ không nhận thêm. Hàng giao online, quà và hàng sạp trả về **luôn vào kho** dù đầy.
- **Kho lạnh:** công trình riêng đặt bằng `canPlace` (ADR 0005), sức chứa riêng, đồ hư chậm ×5, tốn điện (ghi vào đồng hồ điện chung của issue 69, chưa có hóa đơn thì chỉ ghi số). Cắt điện thì ngừng làm lạnh, đồ hư như kho thường.
- **UI:** thanh sức chứa kho, màn nâng cấp kho, màn xây kho lạnh, nhãn "kho lạnh" trên lô. Dùng hình tạm (khối màu, icon chữ) tới khi issue ART đợt này gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): sức chứa theo cấp; chỉ hàng bán được chiếm chỗ; kho đầy thì thu hoạch vào giỏ và có lý do; đang vượt sức chứa thì giữ nguyên, không nhận thêm.
- [ ] Unit test: hàng giao online, quà, hàng sạp luôn vào kho dù đầy.
- [ ] Unit test: kho lạnh có sức chứa riêng, đồ trong kho lạnh hư chậm ×5; cắt điện thì hư như thường; `catchUp` vẫn không hư.
- [ ] E2E (desktop + 360px) với bản lưu kho gần đầy: thu hoạch tới khi đầy thấy lý do, nâng kho thì nhận thêm được, xây kho lạnh, bỏ đồ sang kho lạnh.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [65](65-ban-luu-v5-kho-theo-lo.md)
