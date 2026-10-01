# 16. Hướng dẫn mới và Sổ tay

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · DESIGN §8c · User story 5, 66, 67

## What to build

- **Hướng dẫn nhanh cho người chơi mới**, các bước mới: cuốc → gieo → tưới → thu hoạch → bỏ vào thùng giao hàng → ra chợ mua hạt → về nhà ngủ. Bước tự tăng theo những gì người chơi đã làm.
- **Thông báo "Bản mới có gì đổi"** hiện một lần cho người chơi cũ, ngay sau khi chuyển bản lưu: chế độ xây dựng, chợ đã ra làng, thùng giao hàng, thể lực, công cụ.
- **Sổ tay hướng dẫn** trong túi đồ: các trang về thể lực, công cụ, chế độ xây dựng, mở đất, thùng giao hàng, chợ và giờ mở cửa. Mỗi trang có hình minh họa bằng sprite có sẵn.

## Acceptance criteria

- [ ] E2E: người chơi mới đi hết các bước hướng dẫn tới lúc ngủ, mỗi bước tự chuyển sang bước sau.
- [ ] E2E: nạp bản v1 → thấy thông báo "Bản mới có gì đổi" đúng một lần. Tải lại thì không thấy nữa.
- [ ] Sổ tay mở được từ túi đồ, đủ các trang trên.

## Blocked by

- [07](07-lang-va-cho-ba-tu.md)
- [08](08-thung-giao-hang.md)
- [09](09-the-luc.md)
- [10](10-cong-cu-va-tiem-ren.md)
