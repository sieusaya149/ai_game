# 02. Bản lưu v2: vườn dựng từ thực thể và khối ruộng 3×3

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · ADR 0001, 0005 · User story 1, 2, 3, 6, 7, 71

## What to build

Đây là phần dọn đường cho mọi lát sau. Người chơi gần như không thấy gì thay đổi, nhưng bên dưới vườn đã được dựng theo cách mới.

- **Thực thể đã đặt:** vườn không còn đọc vị trí công trình cố định, mà dựng từ **danh sách thực thể đã đặt** (id, loại, vị trí ô, chân đế, dữ liệu riêng).
- **Khối ruộng 3×3:** ruộng là các khối 3×3 thay cho lưới 6×6.
- **Lưới va chạm và tìm đường** dựng từ danh sách thực thể.
- **Bản lưu v2:**
  - Có khóa lưu riêng và số phiên bản.
  - Có chuỗi hàm chuyển đổi theo thứ tự, bắt đầu từ v1→v2.
  - Lần đầu chỉ có v1 thì chuyển sang v2 và **giữ nguyên v1**. Chuyển lỗi thì không ghi đè gì cả.
- **Chuyển từ v1:**
  - 36 ô cũ thành 4 khối ở đúng chỗ lưới cũ. Ô chưa mở thì đánh dấu khóa, và mở theo thứ tự cũ.
  - Chuồng, giếng, kho, ổ ấp, chuồng chó, bảng đơn hàng, đồ trang trí thành thực thể ở vị trí cũ.
  - Vườn cũ được đặt vào giữa bản đồ và tính là đất đã mua.
  - Sạp hàng tạm giữ trong vườn tới issue 07.
- **Tách mô-đun:** luật chơi tách thành các mô-đun con phía sau **API công khai cũ**, để phần còn lại của game không phải đổi cách gọi.
- **Vườn mới tạo** gồm: 1 khối ruộng, nhà, cổng, giếng, nhà kho, chuồng gà có 2 con gà, chó Mực.

## Acceptance criteria

- [ ] Mở game bằng bản lưu v1 mẫu (mới tạo, đang chơi dở có cây và con vật, đã mở hết 36 ô): vườn nhìn như cũ, cây giữ nguyên tiến độ, không mất xu, đồ, cấp hay con vật.
- [ ] Chạy chuyển đổi hai lần trên cùng một bản v1 cho cùng kết quả. Bản v1 vẫn còn trong `localStorage`.
- [ ] Bản v1 hỏng thì game báo lỗi, không ghi đè, và không bị treo.
- [ ] Vườn mới tạo đúng các thứ khởi đầu như trên.
- [ ] Toàn bộ unit test cũ vẫn pass (chỉ sửa phần dựng vị trí). Thêm unit test cho chuyển đổi.
- [ ] Thêm e2e: nạp bản v1 ghi sẵn → vườn hiện đúng → thu hoạch được một ô.

## Blocked by

- [01](01-khung-test-e2e-va-smoke.md)
