# 04. Đặt khối ruộng và đồ trang trí mới

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · User story 18–20, 22

## What to build

Trong chế độ xây dựng có danh sách đồ có thể đặt:

- **Khối ruộng 3×3:**
  - **Số khối tối đa theo cấp:** 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8 khối ở các cấp 1 / 4 / 8 / 12 / 16 / 20 / 25 / 30.
  - Khối đầu tiên miễn phí, các khối sau tốn xu tăng dần.
  - Hiện số khối đang có, số tối đa, và cấp cần đạt để có thêm.
- **Đồ trang trí đã mua:** đặt bằng chế độ xây dựng, thay cho cách cũ chỉ đặt được dưới chân nhân vật.
- **Cất đồ đã đặt:** cất đồ trang trí về túi được. Khối ruộng chỉ cất được khi trống.

Mọi lần đặt đều qua cùng hàm kiểm tra của issue 03. Thêm lý do "vượt số khối ruộng tối đa".

## Acceptance criteria

- [ ] Có unit test cho: giới hạn khối theo cấp, giá khối tăng dần, khối đầu miễn phí, vượt giới hạn thì bị từ chối kèm đúng lý do.
- [ ] Unit test: cất khối ruộng đang có cây thì bị từ chối. Cất đồ trang trí thì đồ quay về túi.
- [ ] E2E: lên đủ cấp (dùng bản lưu ghi sẵn) → mua và đặt khối ruộng mới → cuốc được ô trong khối đó.
- [ ] E2E: đặt một chậu hoa từ túi bằng chế độ xây dựng.

## Blocked by

- [03](03-che-do-xay-dung-doi-cong-trinh.md)
