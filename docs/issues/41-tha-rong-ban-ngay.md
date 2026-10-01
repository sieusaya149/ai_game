# 41. Gà vịt thả rông ban ngày, trứng trong bụi, hàng rào thấp

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0004, 0008, 0013 · User story 69–73

## What to build

- **Thả rông ban ngày (luật trừu tượng, ADR 0013):** mỗi con gà vịt thả rông có **vị trí theo ô** lưu trong bản lưu. Luật quyết định theo ô và theo xác suất có hạt giống; `world.js` chỉ diễn hoạt con vật đi tới ô luật đã chọn.
  - **Vùng đi lại:** khắp trại, trừ trong nhà ở, trong nhà kính và ra ngoài cổng (cổng tự đóng).
  - **Tối đa khoảng 30 con thả rông** (giới hạn nằm trong luật, không chỉ trong phần vẽ). Con vượt giới hạn ở trong chuồng.
  - Chuồng cách ly: con trong đó không thả rông (từ lát 38).
- **Vào ruộng:** mổ sâu (có lợi: giảm sâu cho ô đó), nhưng **5% lần mổ mất hạt vừa gieo**. Gà nhỡ trở lên mới ăn sâu (hành vi từ lát 34).
- **Hàng rào thấp:** vật phẩm mới ở chợ Bà Tư, đặt quanh khối ruộng; gà vịt không vào ruộng được, đổi lại **mất luôn phần bắt sâu giúp**. Đặt qua hàm kiểm tra vị trí như mọi thực thể, và hàng rào thấp không chặn đường cổng-nhà của người chơi.
- **Trứng trong bụi:** gà mái và vịt trưởng thành thả rông **đẻ trứng ở ô cỏ, bụi, gốc cây** do luật chọn thay vì rơi sẵn trong chuồng. Người chơi phải đi tìm và nhặt. Trứng đẻ ở ô nào lưu theo ô trong bản lưu.
- **Chạy bù offline:** gà vịt thả rông vẫn đẻ trứng trong bụi khi vườn chạy bù, không con nào chết (ADR 0004). Chuyển từ v3 trước: gà trong bản lưu cũ ở trong chuồng cho tới khi sang ban ngày.
- **Việc cần làm:** (hoàn thiện ở lát 48) lát này chỉ cần luật trả ra danh sách trứng trong bụi.
- **Pixel art do agent Opus vẽ:** lớp phủ ổ trứng trong bụi (bụi cỏ, gốc cây), hàng rào thấp (ngang, dọc, góc), vật phẩm hàng rào thấp trong chợ, hiệu ứng gà mổ sâu (đã có tối thiểu thì bổ sung).

## Acceptance criteria

- [ ] Unit test (seam 1): ban ngày con thả rông có vị trí hợp lệ (không trong nhà, nhà kính, ngoài cổng); số thả rông không bao giờ vượt 30; mổ ruộng giảm sâu và 5% mất hạt (thống kê hạt giống cố định); hàng rào thấp chặn gà vào ô.
- [ ] Unit test: gà mái đẻ trứng ở ô cỏ do luật chọn, nhặt được và cộng vào kho; chạy bù nhiều giờ có trứng trong bụi và không con nào chết.
- [ ] E2E (Playwright, desktop + 360px): dựng bản lưu có đàn gà ban ngày → gà đi khắp trại, vào ruộng mổ sâu; mua hàng rào thấp đặt quanh ruộng → gà không vào; đi tìm và nhặt trứng trong bụi.
- [ ] Pixel art ổ trứng trong bụi và hàng rào thấp có đủ.

## Blocked by

- [35](35-chuong-3-cap-va-cach-ly.md)
