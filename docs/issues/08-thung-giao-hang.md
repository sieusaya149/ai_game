# 08. Thùng giao hàng

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · User story 33, 34

## What to build

- **Thùng giao hàng trong vườn:** là một thực thể đặt được. Vườn mới và vườn chuyển từ v1 đều có sẵn một thùng cạnh nhà kho.
- **Bỏ đồ vào thùng:** bỏ nông sản và sản phẩm vào. Bảng thùng hiện danh sách đồ và **số xu dự kiến** (80% giá chợ).
- **Lấy lại đồ** trước lúc lái buôn tới.
- **Chốt giá lúc 6h sáng:** lái buôn lấy hết đồ và trả xu. Có thông báo, và ghi vào màn "Trong lúc bạn vắng nhà" nếu việc này xảy ra lúc vắng.

## Acceptance criteria

- [ ] Unit test: số xu = 80% giá lúc chốt. Lấy lại đồ trước 6h được. Sau 6h thùng trống và xu đã cộng. Chạy bù offline qua 6h cũng chốt đúng.
- [ ] E2E: bỏ 5 cải vào thùng → thấy số xu dự kiến → lùi `savedAt` qua 6h → tải lại thì nhận đúng xu.

## Blocked by

- [02](02-ban-luu-v2.md)
