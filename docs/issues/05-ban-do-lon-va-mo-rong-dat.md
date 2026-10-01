# 05. Bản đồ lớn và mở rộng đất

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · User story 8–13

## What to build

- **Bản đồ vườn lớn tối đa 64×48 ô.**
  - Vườn mới chỉ dùng được vùng 24×20 ô ở giữa, xung quanh là rừng cây bụi.
  - Vườn chuyển từ v1 thì toàn bộ vùng 34×27 cũ đã là đất đã mua.
- **Mua dải đất:** đứng ở mép vườn thì thấy dải đất kế tiếp theo hướng đó (Bắc, Nam, Đông, Tây), giá và cấp cần có. Mua thì dải đó thành đất của mình.
- **Dọn đất:** dải mới có **cây bụi và đá**. Dọn bằng tay, tốn thể lực (khi đã có issue 09), được **gỗ** và **đá** vào túi. Chưa dọn thì không đặt công trình lên được (lý do mới trong hàm kiểm tra).
- **Camera** theo kích thước bản đồ.
- **Số liệu dải đất** lấy từ bảng trong `data`.

## Acceptance criteria

- [ ] Unit test: dải đất theo thứ tự, cần đủ giá và cấp, không vượt quá 64×48 ô.
- [ ] Unit test: dọn bụi được gỗ, dọn đá được đá. Đặt công trình lên ô chưa dọn thì bị từ chối kèm lý do.
- [ ] E2E: mua dải đất phía Đông → dọn một bụi → thấy gỗ trong túi → đặt được đồ lên ô vừa dọn.
- [ ] Vườn chuyển từ v1 thấy vùng cũ nằm giữa bản đồ lớn, không mất gì.

## Blocked by

- [02](02-ban-luu-v2.md)
