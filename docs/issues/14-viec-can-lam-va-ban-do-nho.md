# 14. Bảng Việc cần làm và bản đồ nhỏ

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · DESIGN §8c · User story 28, 62–64

## What to build

- **Một hàm thuần** nhận bản lưu và trả về danh sách việc. Mỗi việc có loại, mức, số lượng, bản đồ, và vị trí gần người chơi nhất.
  - **Các loại việc:** con vật bệnh, con vật đói, ô khô, ô có sâu, ô có cỏ, ô chín, trứng dưới đất, máng hết cám, phân chó, quạ, trộm.
- **Bảng "Việc cần làm" 📋:** xếp theo mức gấp, mỗi dòng có số lượng.
  - Chạm một dòng thì nhân vật **tự đi tới** chỗ gần nhất có việc đó.
  - Nếu đang ở bản đồ khác thì đi qua cửa hoặc cổng trước.
- **Bản đồ nhỏ** ở góc màn hình: chấm đỏ cho việc gấp, chấm vàng cho việc thường, chạm vào để phóng to.
- **Mũi tên chỉ hướng** của issue 13 cũng lấy vị trí từ danh sách này.

## Acceptance criteria

- [ ] Unit test: mỗi loại việc được liệt kê đúng số lượng và đúng mức. Vị trí là chỗ gần người chơi nhất.
- [ ] E2E: dựng bản lưu có 3 ô khô → mở bảng → chạm "💧 3 ô khô" → nhân vật đi tới đứng cạnh một ô khô.
- [ ] E2E: đang ở trong nhà, chạm một việc ngoài vườn → nhân vật ra cửa rồi đi tới đúng chỗ.
- [ ] Bản đồ nhỏ có chấm đúng màu ở đúng chỗ.

## Blocked by

- [06](06-nhieu-ban-do-vao-nha.md)
- [13](13-thong-bao-3-muc.md)
