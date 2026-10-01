# 06. Nhiều bản đồ: vào nhà

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · User story 25, 27, 29

## What to build

Dựng hệ thống nhiều bản đồ, bắt đầu với **vườn ↔ trong nhà**.

- **Đi vào cửa nhà:** chuyển cảnh mờ dần, rồi vào bản đồ nội thất cố định của nhà tranh (có giường, tủ đồ). Đi ra cửa thì về đứng trước nhà.
- **Lưu vị trí:** bản đồ hiện tại và vị trí người chơi nằm trong bản lưu. Tải lại thì đứng đúng chỗ.
- **Thời gian vườn vẫn chạy** khi người chơi ở trong nhà. Cây vẫn lớn, sự kiện vẫn sinh ra.
- **Tủ đồ** (đổi ngoại hình) dời từ "chạm vào nhà" vào bên trong nhà. Giường thì issue 09 mới dùng tới.
- **Luật chuyển bản đồ** nằm trong luật chơi, test được bằng Node.

## Acceptance criteria

- [x] Unit test: chuyển vườn → nhà → vườn đúng vị trí. Tick khi đang ở trong nhà thì cây ngoài vườn vẫn lớn.
- [x] E2E: đi vào nhà → mở tủ đồ đổi mũ → ra ngoài → tải lại trang thì vẫn đúng bản đồ và vị trí.
- [x] Không còn đường đi cũ nào tới tủ đồ bằng cách chạm vào nhà từ ngoài.

## Blocked by

- [02](02-ban-luu-v2.md)
