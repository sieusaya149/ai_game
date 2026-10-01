# 03. Chế độ xây dựng: dời công trình

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · ADR 0005 · User story 14–17, 21, 23, 24

## What to build

Người chơi bật **chế độ xây dựng** bằng một nút, rồi kéo các công trình đã có sang chỗ khác. Khi đang kéo, game hiện bóng xanh nếu đặt được và bóng đỏ nếu không được, kèm lý do.

- **Luật chỉ ở một chỗ:** một hàm kiểm tra duy nhất trong luật chơi, nhận (bản lưu, loại, vị trí). Kết quả là hợp lệ, hoặc không hợp lệ kèm một lý do cố định trong danh sách: chồng lên công trình khác, ngoài đất đã mua, chặn đường từ cổng vào cửa nhà.
  - Kiểm tra chặn đường bằng tìm đường trên lưới va chạm, như thể công trình đã nằm ở chỗ mới.
- **Không dời được:** nhà ở và cổng.
- **Dời miễn phí**, không giới hạn số lần.
- **Dời chuồng:** con vật đi theo và hoảng một lúc.
- **Dời khối ruộng:** giữ nguyên trạng thái các ô, kể cả cây đang lớn.
- **Sau khi đổi bố cục:** nhân vật, con vật và chó tự tìm đường mới, không bị kẹt.
- **Trên điện thoại:** kéo bằng ngón tay, có nút Xong và Hủy to.

## Acceptance criteria

- [ ] Có unit test cho từng lý do không hợp lệ, có test riêng cho trường hợp chặn đường. Có test dời khối ruộng đang có cây, và dời chuồng có con vật.
- [ ] Hủy thì trả mọi thứ về như trước khi vào chế độ xây dựng.
- [ ] E2E bằng chuột và bằng chạm: dời giếng tới chỗ hợp lệ → Xong → tải lại trang vẫn ở chỗ mới. Kéo vào chỗ chặn đường thì thấy bóng đỏ và đúng lý do.
- [ ] Không vào chế độ xây dựng thì không chạm nhầm được.

## Blocked by

- [02](02-ban-luu-v2.md)
