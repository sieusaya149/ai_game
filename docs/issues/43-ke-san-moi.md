# 43. Kẻ săn mồi: chuột, diều hâu, chồn

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0004, 0008, 0013 · User story 82–90

## What to build

- **Luật kẻ săn mồi trừu tượng (ADR 0013):** luật quyết định theo ô và xác suất có hạt giống: chuột sinh ở đâu và ăn gì, diều hâu nhắm con nào, chồn bắt con nào ngủ ngoài chuồng. `world.js` chỉ diễn hoạt.
- **🐀 Chuột:** sinh từ **kho, đống rơm, máng**; mỗi giờ sinh thêm nếu không ai bắt, **tối đa 8 con**. Ăn cám, trộm trứng, **cắn con non** làm nó bị thương (không chữa thì có thể chết).
- **🦅 Diều hâu:** hiếm, ban ngày, cắp **gà con, vịt con đang thả rông** (lát 41). Khắc chế: chó, mái che ở sân.
- **🦊 Chồn:** nửa đêm, bắt con **ngủ ngoài chuồng** (con lạc từ lát 42). Khắc chế: lùa về chuồng, chó, đèn.
- **Khi online luôn cảnh báo trước khoảng 10 giây:** thông báo 🔴 gấp có mũi tên chỉ hướng (luật quyết định, không phải AI). Cảnh báo này là việc của luật.
- **Đuổi kẻ săn mồi:** chạm vào chuột, diều hâu hoặc chồn để đuổi. Đuổi kịp trong 10 giây cảnh báo thì con vật không bị hại.
- **Bẫy chuột:** vật phẩm mới ở chợ Bà Tư, đặt trong trại, bắt chuột đi qua, cần đặt lại.
- **Khi offline (ADR 0004, ranh giới cứng):** kẻ săn mồi **chỉ ăn cám và trộm trứng**, không làm con vật chết. Chạy bù không sinh chuột vượt 8.
- **Bảo hộ người mới:** dưới cấp người chơi 5 chưa có chuột, diều hâu, chồn.
- **Mức hại ước tính (kiểm bằng thống kê):** không phòng thủ gì thì mất 0–2 con non mỗi ngày ngoài đời; đủ mèo (lát 44), chó thì gần như không mất con nào.
- **Pixel art do agent Opus vẽ:** chuột (chạy, ăn, bị đuổi), diều hâu (bay, sà xuống, cắp), chồn (đi đêm, bắt), con non bị thương, bẫy chuột (mở, đóng, có chuột), bong bóng cảnh báo.

## Acceptance criteria

- [ ] Unit test (seam 1): chuột sinh từ kho/rơm/máng, không quá 8; chuột ăn cám, trộm trứng, cắn con non; diều hâu chỉ cắp con non thả rông ban ngày; chồn chỉ bắt con ngủ ngoài chuồng ban đêm; đuổi trong thời gian cảnh báo thì không có hại; bẫy chuột bắt chuột.
- [ ] Unit test: mọi tấn công khi online có cảnh báo 🔴 đúng khoảng 10 giây trước; bảo hộ người mới dưới cấp 5 không có kẻ săn mồi.
- [ ] **Unit test riêng cho ADR 0004:** chạy bù offline nhiều giờ có chuột, diều hâu, chồn → không con nào chết, cám và trứng bị hao nhưng con vật còn đủ.
- [ ] Giao thức server (seam 3): server chạy bù vườn 8 tiếng có kẻ săn mồi thì không con nào chết, cám và trứng hao theo luật.
- [ ] E2E (Playwright, desktop + 360px): dựng bản lưu có chồn sắp tới → thấy cảnh báo 🔴 và mũi tên chỉ hướng → chạm đuổi chồn kịp; dựng bản lưu có diều hâu và gà con thả rông → đuổi được; đặt bẫy chuột bắt được chuột.
- [ ] Pixel art chuột, diều hâu, chồn có đủ.

## Blocked by

- [42](42-ve-chuong-va-lua.md)
