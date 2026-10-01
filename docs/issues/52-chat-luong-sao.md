# 52. Chất lượng nông sản ★1–3

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · ADR 0004, 0008 · User story 22–27

## What to build

Chăm kỹ suốt vụ thì nông sản ra sao cao, bán đắt hơn. Sao được theo dõi ngay trên từng ô trong lúc cây lớn.

- **Luật "chăm kỹ" theo dõi mỗi ô trong vụ:** không lúc nào khô hẳn, không để sâu quá 30 giây, có bón phân. Phạm một điều thì mất sao cao của vụ đó, không lấy lại được.
- **Ra sao khi thu hoạch:** ★1 mặc định, ★2 và ★3 tùy mức chăm. ★2 bán ×1.5, ★3 bán ×2.
- **Máy móc chỉ giữ tối đa ★2:** nếu cả vụ không có lần chăm tay nào (tưới, bắt sâu, bón phân bằng tay của chính người chơi) thì không ra ★3. Cần ít nhất một lần chăm tay trong vụ. Luật này đặt sẵn để tưới nhỏ giọt và phun tự động (issue 58) dùng sau.
- **Nông sản có sao ở mọi nơi:** túi, giỏ, kho, thùng giao hàng, đơn hàng và chợ đều tách theo sao, bán đúng giá theo sao. Đơn hàng đọc sao.
- **Hiển thị trên ô ruộng:** ô đang lớn hiện vụ này đang giữ được mấy sao, để biết lúc nào lỡ mất sao. Nông sản có viền sao.
- **Pixel art do agent Opus vẽ.** Sprite cần vẽ: viền sao ★1, ★2, ★3 cho 16 loại nông sản (hoặc một lớp viền dùng chung kèm biến thể màu), biểu tượng sao trên ô đang lớn.

## Acceptance criteria

- [ ] Unit test (seam 1) cho từng điều kiện: ô khô hẳn một lần thì không ra sao cao; sâu quá 30 giây thì mất sao; không bón phân thì không ra ★3; chăm đủ thì ra ★3.
- [ ] Unit test: máy tưới và phun tự động cả vụ không chăm tay thì tối đa ★2; thêm một lần chăm tay thì ra được ★3.
- [ ] Unit test: giá bán ★2 = ×1.5, ★3 = ×2. Túi, kho, giỏ, thùng giao hàng và đơn hàng không gộp các sao khác nhau với nhau.
- [ ] Unit test: nông sản cũ sau chuyển v3→v4 là ★1 (đã có ở issue 50, test thêm đường bán).
- [ ] E2E (desktop + 360px): dựng bản lưu cây chín ở cả ba mức sao → thu hoạch → túi tách thành ba dòng → bỏ vào thùng giao hàng bán, số xu đúng theo sao.
- [ ] E2E: ô đang lớn hiện số sao hiện tại, tưới để cây khô hẳn thì số sao tụt.

## Blocked by

- [50](50-ban-luu-v4-16-cay.md)
