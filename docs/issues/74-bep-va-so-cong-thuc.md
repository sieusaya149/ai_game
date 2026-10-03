# 74. Bếp và sổ công thức

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §3.3c, §6b · ADR 0005 · User story 45–47

**Model gợi ý:** Sonnet

## What to build

- **Bếp trong nhà** (có sẵn): nấu món từ nông sản (2–10 phút) để **hồi thể lực** và giao **đơn đặc biệt** (đơn hàng nhận món ăn). Món ăn không hư, đi qua API kho chung. Nấu đi qua `step` nên chạy bù được.
- **Sổ công thức** mở dần: Chị Hai cho (ở 4A theo cấp, độ thân nối ở 4C), đơn hàng thưởng, mua ở chợ. Ví dụ: Trứng chiên, Canh rau muống, Cơm gà, Bánh bí ngô, Chè đậu, Sinh tố dâu. Số liệu thể lực hồi, thời gian, giá mua công thức: lấy từ bảng số liệu đợt (issue 64). Các phiên bản bếp đắt dần (củi, ga, từ) thuộc Phase 5.
- **UI:** bảng bếp (công thức đã mở, nguyên liệu đủ/thiếu), sổ công thức. Dùng hình tạm (khối màu, icon chữ) tới khi issue ART đợt này gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): nấu đúng công thức tốn đúng nguyên liệu, mất đúng thời gian, ăn hồi đúng thể lực; công thức chưa mở thì không nấu được.
- [ ] Unit test: món ăn giao được đơn đặc biệt; mở công thức qua Chị Hai, đơn thưởng, mua ở chợ; món ăn không hư.
- [ ] E2E (desktop + 360px): vào nhà, nấu một món, ăn thấy thể lực hồi, mở công thức mới từ sổ.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [65](65-ban-luu-v5-kho-theo-lo.md)
