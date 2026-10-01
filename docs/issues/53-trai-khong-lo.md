# 53. Trái khổng lồ

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · ADR 0004, 0008 · User story 17–21, 84

## What to build

Thỉnh thoảng thu hoạch ra một **trái khổng lồ**, bất ngờ có thưởng cho người chăm kỹ.

- **Tỉ lệ ra:** cấp thành thạo 2 được 10%, cấp 3 được 20%; cao nhất khi có cả cấp 3 lẫn ★3 (thêm hệ số, con số chốt trong bảng `data`). Cấp 1 không ra. Tỉ lệ đọc từ cấp thành thạo (issue 51) và sao (issue 52).
- **Sản phẩm riêng theo loại cây:** trái khổng lồ là một món riêng cho từng cây, không phải cây thường nhân lên.
- **Giá và chỗ chứa:** bán ×3; chiếm **5 chỗ trong giỏ**, nên phải tính khi mang về (kho đầy hoặc giỏ đầy thì xử lý như món thường nhưng theo 5 chỗ). Dùng được cho một loại đơn hàng đặc biệt đơn giản (đơn đầy đủ của cư dân thuộc Phase 4).
- **Không trộm được:** luật trộm (Phase 1) thêm "không trộm được trái khổng lồ" cho cả khách trộm và trộm NPC; ô còn trái khổng lồ chưa thu thì trộm bỏ qua nó.
- **Thông báo 🟡** khi thu được trái khổng lồ, cho nhiều EXP.
- **Hiển thị:** hình to tràn ra ngoài ô, lấp lánh. Trong túi và giỏ có biểu tượng riêng.
- **Pixel art do agent Opus vẽ.** Sprite cần vẽ: trái khổng lồ cho 16 loại cây (hình to hơn ô, có lớp lấp lánh), biểu tượng nhỏ trong túi và giỏ.

## Acceptance criteria

- [ ] Unit test (seam 1): thống kê nhiều lượt với hạt giống ngẫu nhiên cố định: cấp 1 không bao giờ ra, cấp 2 ≈ 10%, cấp 3 ≈ 20%, cấp 3 + ★3 cao hơn cấp 3 thường (dung sai rộng).
- [ ] Unit test: trái khổng lồ bán ×3 (nhân thêm hệ số sao nếu có), chiếm 5 chỗ trong giỏ; giỏ không đủ chỗ thì xử lý đúng như đã chốt cho món thường.
- [ ] Unit test: luật trộm từ chối trái khổng lồ nhưng vẫn lấy được cây chín thường có sao; ô đang có trái khổng lồ không bị lấy mất nó.
- [ ] Unit test: đơn hàng đặc biệt nhận trái khổng lồ.
- [ ] E2E (desktop + 360px): dựng bản lưu cây cấp thành thạo 3 ★3 với hạt giống ngẫu nhiên đã chọn cho ra trái khổng lồ → thấy hình to lấp lánh, thu hoạch, giỏ chiếm 5 chỗ, có thông báo.
- [ ] E2E (hai trình duyệt qua server): khách vào vườn có trái khổng lồ, thử trộm thì không lấy được.

## Blocked by

- [51](51-cap-thanh-thao.md)
- [52](52-chat-luong-sao.md)
