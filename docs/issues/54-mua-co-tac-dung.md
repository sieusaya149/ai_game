# 54. Mùa có tác dụng lên cây

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · DESIGN §1.4, §8c · ADR 0003, 0008 · User story 28–34

## What to build

HUD đã hiện mùa từ Phase 0 nhưng mùa chưa làm gì. Lát này cho mùa có tác dụng, nhưng chỉ làm chậm chứ không cấm trồng.

- **Cây hợp mùa:** mỗi mùa có 4 cây hợp mùa theo bảng ở issue 50.
- **Trái mùa:** lớn chậm ×0.6 và **không ra ★3** (luật sao ở issue 52 đọc thêm điều kiện này).
- **Đúng mùa:** 10% số lần thu được thêm sản lượng.
- **Đổi mùa giữa vụ:** cây không chết, không mất gì, chỉ lớn chậm lại (hoặc nhanh lại) từ lúc đổi mùa. Phần tiến độ đã lớn giữ nguyên.
- **Chạy bù và đóng băng:** mùa đọc từ lịch game (ADR 0003), nên chạy bù offline qua ranh giới mùa tính đúng tốc độ từng đoạn. Thời gian đóng băng không làm đổi tốc độ.
- **Bảo hộ người mới:** dưới cấp 5 mùa chưa ảnh hưởng tới cây.
- **UI:**
  - Hạt giống ở chợ và ở màn chọn hạt có nhãn "đúng mùa".
  - Ô trái mùa hiện dấu hiệu lớn chậm.
  - Nhiệm vụ làm quen của Bà Tư đầu mùa thứ 2 giải thích mùa, có thưởng, bỏ qua được.
- **Pixel art do agent Opus vẽ.** Sprite cần vẽ: nhãn "đúng mùa" cho hạt, dấu hiệu lớn chậm (một biểu tượng nhỏ trên ô), biểu tượng bốn mùa nếu chưa đủ cho nhãn.

## Acceptance criteria

- [x] Unit test (seam 1): cây trái mùa tới chín mất đúng 1/0.6 thời gian; cây đúng mùa không chậm. Cây trái mùa không bao giờ ra ★3 dù chăm kỹ.
- [x] Unit test: đúng mùa khoảng 10% lần thu thêm sản lượng (thống kê, dung sai rộng).
- [x] Unit test: qua ranh giới mùa giữa vụ cây không chết, tiến độ không lùi, tốc độ đổi đúng từ ranh giới, kể cả khi chạy bù một khoảng dài trong một lượt.
- [x] Unit test: người chơi dưới cấp 5 không bị chậm trái mùa; từ cấp 5 thì có.
- [x] E2E (desktop + 360px): dựng bản lưu mùa Xuân → chợ hiện nhãn "đúng mùa" ở 4 cây Xuân → trồng cây trái mùa thấy dấu hiệu lớn chậm.
- [x] E2E: tua qua đổi mùa giữa vụ → cây vẫn sống, đổi tốc độ. Bà Tư giải thích mùa ở đầu mùa thứ 2.

## Blocked by

- [50](50-ban-luu-v4-16-cay.md)
