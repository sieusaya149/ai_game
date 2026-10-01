# 09. Thể lực

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · DESIGN §0c · User story 36–42

## What to build

- **Thanh thể lực 0–100** trên HUD.
- **Chi phí theo hành động** (bảng trong `data`):
  - **Tốn sức:** cuốc, tưới, gieo, thu hoạch, dọn bụi, đập đá.
  - **Không tốn:** vuốt ve, cho ăn tận tay, nhặt trứng, mua bán.
- **Hết thể lực:** vẫn làm được, nhưng **thời gian làm và tốc độ đi chậm ×2**. Nhân vật có hình thở hồng hộc. Luật chơi trả ra hệ số chậm, phần thế giới áp dụng.
- **Ngủ ở giường trong nhà:**
  - Chỉ được từ 18h trở đi.
  - Hồi đầy thể lực.
  - Khi chơi offline thì tua tới 6h sáng hôm sau. Ngủ là một khoảng chạy mô phỏng thật, nên cây vẫn lớn.
- **Ghế đá** (đồ trang trí có sẵn): ngồi thì hồi chậm theo thời gian.
- **Mỗi sáng 6h** tự hồi một ít.
- **Chuyển từ v1:** thể lực đầy.

## Acceptance criteria

- [x] Unit test: mỗi loại hành động trừ đúng chi phí. Ở 0 thể lực thì hệ số chậm là 2. Ngủ trước 18h bị từ chối, sau 18h thì hồi đầy và tới 6h. Ghế đá hồi theo thời gian. Có hồi buổi sáng.
- [x] E2E: dựng bản lưu có thể lực 0 → nhân vật đi chậm thấy rõ, có hình thở hồng hộc → vào nhà ngủ lúc 19h → sáng ra thanh thể lực đầy.

## Blocked by

- [06](06-nhieu-ban-do-vao-nha.md)
