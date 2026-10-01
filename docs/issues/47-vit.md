# 47. Vịt

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0004, 0008, 0013 · User story 113–114

## What to build

- **Vịt là loài mới** trong bảng loài, nuôi chung **chuồng gia cầm** với gà (sức chứa tính chung, lát 35). Mua ở chợ Bà Tư, chọn đực/cái (lát 36).
- **Vòng đời Non → Nhỡ → Trưởng thành → Già** cùng thang tuổi với gà (5 phút / 10 phút / ~20 giờ / ~4 giờ):
  - **Vịt con đi thành hàng theo vịt mẹ**.
  - **Vịt nhỡ** đi khắp trại (thả rông ban ngày như gà, lát 41).
  - **Vịt trưởng thành** đẻ **trứng vịt**, sản phẩm mới (giá, kho, đơn hàng). Vịt già đẻ thưa.
- **Dùng chung luật** với gà: thả rông và đẻ trứng trong bụi (lát 41), về chuồng và con lạc (lát 42), dơ và tắm cát ở chuồng cấp 3 (lát 37), bệnh (lát 38), độ thân (lát 39), kẻ săn mồi (lát 43), trộm trứng (lát 46), đực/cái và ổ ấp có phôi (lát 36). Việc bơi ở hồ để lại Phase 6.
- **Chuyển từ v3:** không có vịt trong bản lưu cũ nên không cần chuyển.
- **Pixel art do agent Opus vẽ:** vịt trống và vịt mái 4 giai đoạn × hướng × khung đi, vịt con đi hàng, trạng thái ngủ, dơ, ướt bọt xà phòng, bệnh; trứng vịt; ổ trứng vịt trong bụi.

## Acceptance criteria

- [ ] Unit test (seam 1): vịt đi đủ 4 giai đoạn đúng mốc giờ; vịt mái trưởng thành đẻ trứng vịt, vịt non và vịt già không đẻ hoặc đẻ thưa; trứng vịt vào kho và bán được; vịt tính chung sức chứa chuồng gia cầm; vịt con đi theo vịt mẹ (nếu có luật theo ô).
- [ ] Unit test: vịt dùng đúng các luật chung (thả rông, về chuồng 18h, tắm, bệnh) như gà; chạy bù offline có vịt không con nào chết (ADR 0004).
- [ ] E2E (Playwright, desktop + 360px): mua vịt ở chợ Bà Tư → thả vào chuồng gia cầm → thấy vịt con đi hàng theo vịt mẹ; dựng bản lưu có vịt mái trưởng thành → đẻ trứng vịt → nhặt được.
- [ ] Pixel art vịt các giai đoạn và trứng vịt có đủ.

## Blocked by

- [41](41-tha-rong-ban-ngay.md)
