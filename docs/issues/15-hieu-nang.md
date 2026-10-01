# 15. Hiệu năng trên bản đồ lớn

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · DESIGN §8c · User story 69, 70

## What to build

- **Chỉ vẽ trong khung nhìn.**
- **Nền tĩnh chia mảng:** chỉ vẽ lại mảng nào vừa có công trình đặt, dời hay cất.
- **AI ngoài màn hình:** con vật ngoài màn hình cập nhật AI 2 lần mỗi giây. Logic trong `tick()` không đổi.
- **Hiệu ứng hạt** (mưa, lấp lánh) giảm số hạt khi khung hình tụt.
- **Chế độ tiết kiệm pin** trong Cài đặt: khóa 30 khung hình, tắt hiệu ứng hạt, giảm ánh sáng đêm.
  - 10 giây đầu chạy dưới 40 khung hình mỗi giây thì gợi ý bật.
- **Đo thử** trên một điện thoại Android tầm thấp thật, với vườn 64×48 ô đã mở hết và nhiều công trình.

## Acceptance criteria

- [ ] Vườn 64×48 ô đầy công trình (bản lưu ghi sẵn): điện thoại tầm thấp thật giữ ≥ 30 khung hình mỗi giây. Ghi lại số đo và tên máy vào issue.
- [ ] Đặt hay dời một công trình chỉ vẽ lại mảng nền liên quan.
- [ ] E2E: bật tiết kiệm pin thì cài đặt được lưu lại, tải lại trang vẫn bật.
- [ ] E2E: giả lập máy chậm (giới hạn CPU trong Playwright) thì hiện gợi ý bật tiết kiệm pin.

## Blocked by

- [05](05-ban-do-lon-va-mo-rong-dat.md)
