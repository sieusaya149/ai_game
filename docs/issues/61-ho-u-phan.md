# 61. Hố ủ phân

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · DESIGN §3.4 · ADR 0005, 0008 · User story 75–78

## What to build

Cây héo, cây chết và phân thừa không còn là đồ bỏ: bỏ vào hố ủ, vài ngày sau thành phân bón.

- **Công trình hố ủ phân:** đặt tự do theo luật đặt công trình (ADR 0005), giá mua trong `data`.
- **Đầu vào:** cây héo, cây chết (nhổ rồi bỏ vào), phân chuồng (Phase 2), phân chó. Bỏ nhiều thứ cùng lúc thì chờ theo lô; sức chứa và tỉ lệ đổi (bao nhiêu đầu vào ra 1 phân bón) chốt trong bảng `data`.
- **Đầu ra:** vài ngày game sau lấy ra **phân bón**. Chạy theo giờ vườn chạy, không chạy lúc đóng băng, chạy cả khi chạy bù.
- **Vòng lặp khép kín:** phân bón từ hố ủ được tính là "có bón phân" cho điều kiện ★ (issue 52).
- **UI:** chạm hố ủ để bỏ đồ vào và lấy phân ra; hố hiện đang ủ bao nhiêu và còn bao lâu. Hố xong thì hiện dấu hiệu trên hình.
- **Pixel art do agent Opus vẽ.** Sprite cần vẽ: hố ủ phân (rỗng, đang ủ, đã xong), hơi bốc lên khi đang ủ.

## Acceptance criteria

- [ ] Unit test (seam 1): bỏ cây héo, cây chết, phân chuồng, phân chó vào được; bỏ đồ không hợp lệ (ví dụ nông sản chín) bị từ chối; quá sức chứa bị từ chối.
- [ ] Unit test: sau đúng số ngày game đã chốt thì lấy ra được đúng lượng phân bón; chưa đủ ngày thì chưa lấy được; đóng băng không làm hố chạy.
- [ ] Unit test: ô bón bằng phân từ hố ủ tính là "có bón phân" cho ★3.
- [ ] Unit test: hố ủ lưu và nạp giữ nguyên đồ đang ủ và thời gian còn lại.
- [ ] E2E (desktop + 360px): dựng bản lưu có cây chết → nhổ và bỏ vào hố ủ → tua vài ngày game → lấy được phân bón → bón vào ô được.

## Blocked by

- [52](52-chat-luong-sao.md)
