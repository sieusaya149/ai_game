# 13. Thông báo 3 mức

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · DESIGN §8c · User story 58–61, 65

## What to build

- **Mọi sự kiện có mức và khóa gộp:** mọi sự kiện luật chơi phát ra đều có **mức** (gấp / quan trọng / thông tin) và **khóa gộp**.
- **🔴 Gấp** (quạ đang ăn cây, có trộm, con vật bệnh):
  - Băng rôn đỏ trên cùng, có âm thanh, rung trên điện thoại.
  - **Mũi tên ở mép màn hình** chỉ hướng tới chỗ có chuyện, khi chỗ đó nằm ngoài khung nhìn.
- **🟡 Quan trọng** (cây chín, lên cấp, đơn hàng mới): thông báo nhỏ, tự gộp các sự kiện cùng khóa trong một khoảng ngắn.
- **⚪ Thông tin** (nhặt trứng, bán hàng): chỉ ghi vào nhật ký.
- **Cài đặt** cho tắt từng loại thông báo. Thông báo gấp không tắt được.
- **Áp dụng mọi bản đồ:** thông báo gấp vẫn hiện khi người chơi đang ở trong nhà hay ngoài làng.

## Acceptance criteria

- [x] Unit test: mọi loại sự kiện đều có mức và khóa gộp (một test đi qua hết danh sách loại sự kiện).
- [x] E2E: dựng bản lưu có quạ đang ăn cây ở ngoài khung nhìn → thấy băng rôn đỏ và mũi tên chỉ đúng hướng.
- [x] E2E: thu hoạch 5 ô liền thì chỉ thấy 1 thông báo gộp. Tắt loại "cây chín" trong cài đặt thì không còn thấy thông báo đó.

## Blocked by

- [02](02-ban-luu-v2.md)
