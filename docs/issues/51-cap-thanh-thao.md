# 51. Cấp thành thạo 3 cấp mỗi loại cây

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · ADR 0004, 0008 · User story 10–16

## What to build

Mỗi loại cây có cấp thành thạo 1–3, tăng theo số lần thu hoạch loại cây đó, giữ mãi mãi và áp dụng cho mọi lần trồng sau.

- **Ngưỡng lên cấp theo nhóm cây** (bảng trong `data`):
  - Ngắn ngày (≤ 3 phút): cấp 2 ở 20 lần thu hoạch, cấp 3 ở 60 lần.
  - Trung bình (5–10 phút): 12 lần và 35 lần.
  - Dài ngày (≥ 12 phút): 8 lần và 25 lần.
- **Phần thưởng:**
  - Cấp 1: như hiện tại.
  - Cấp 2: +1 sản lượng, 10% ra trái khổng lồ (tỉ lệ này được dùng ở issue 53).
  - Cấp 3: +2 sản lượng, 20% trái khổng lồ, kháng sâu hơn, 30% được lại 1 hạt mỗi lần thu hoạch.
- **Luật chơi:** thu hoạch cộng số lần cho loại cây đó, lên cấp khi chạm ngưỡng. Thưởng sản lượng và hạt giống đọc từ cấp lúc thu hoạch. Kháng sâu hơn làm sâu tới chậm hơn trên cây cấp 3. Lên cấp thành thạo cho nhiều EXP.
- **UI:** khi chọn hạt hiện cấp thành thạo và tiến độ lên cấp ("12/35 lần"). Lên cấp thì có thông báo 🟡 và màn chúc mừng ngắn nêu phần thưởng mới.

## Acceptance criteria

- [ ] Unit test (seam 1): với một cây mỗi nhóm, thu hoạch đúng số lần ngưỡng thì lên đúng cấp 2 rồi cấp 3, không sớm hơn một lần. Cấp 2 thu +1, cấp 3 thu +2 sản lượng.
- [ ] Unit test: cấp 3 có kháng sâu (sâu tới chậm hơn cấp 1 với cùng hạt giống ngẫu nhiên cố định) và về lâu dài khoảng 30% lần thu được lại 1 hạt (thống kê nhiều lượt, dung sai rộng).
- [ ] Unit test: cấp thành thạo giữ qua lưu và nạp, và là riêng cho từng loại cây.
- [ ] Unit test: lên cấp phát sự kiện mức 🟡 có khóa gộp, và cộng EXP.
- [ ] E2E (desktop + 360px): dựng bản lưu cây ngắn ngày ở 19 lần thu hoạch → thu một ô → thấy thông báo và màn chúc mừng lên cấp 2; mở chọn hạt thấy cấp và tiến độ đúng.

## Blocked by

- [50](50-ban-luu-v4-16-cay.md)
