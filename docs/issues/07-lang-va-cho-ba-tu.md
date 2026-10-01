# 07. Làng và chợ Bà Tư

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · User story 4, 26, 30, 32, 35

## What to build

- **Ra cổng vườn thì tới làng**, một bản đồ cố định. Đi vào cổng nhà mình trong làng thì về vườn.
- **Chợ của Bà Tư** trong làng:
  - Mua hạt, vật tư, thức ăn, con non, đồ trang trí, mũ áo, giống sạp hàng cũ.
  - Bán nông sản đủ giá, giống quầy bán ở nhà kho cũ.
  - **Mở 6h–18h.** Ngoài giờ thì hành động bị khóa, có lý do và biển "Đóng cửa".
- **Sạp hàng bị bỏ khỏi vườn**, kể cả với vườn chuyển từ v1. Nhà kho trong vườn chỉ còn là chỗ cất đồ.
- **Có chỗ cho tiệm rèn** của Ông Sáu (issue 10 mới dùng tới).
- **Cổng vào vườn bạn bè** có biển "Sắp ra mắt: thăm bạn bè".
- **Thông báo gấp vẫn tới** khi đang ở làng.

## Acceptance criteria

- [ ] Unit test: mua và bán ở chợ trong giờ thì được, ngoài giờ thì bị từ chối kèm lý do. Vườn chuyển từ v1 không còn sạp hàng.
- [ ] E2E: ra cổng → tới làng → mua hạt ở chợ → về vườn → gieo được hạt vừa mua.
- [ ] E2E: dựng bản lưu lúc 20h → chợ hiện "Đóng cửa".
- [ ] Đang ở làng mà có quạ ăn cây trong vườn thì vẫn thấy thông báo (thông báo 3 mức đầy đủ thuộc issue 13).

## Blocked by

- [06](06-nhieu-ban-do-vao-nha.md)
