# 11. Giỏ có sức chứa

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · User story 50–52

## What to build

- **Nông sản và sản phẩm** thu được vào giỏ trước.
- **Sức chứa:** 30 / 60 / 120 món theo cấp giỏ. Nâng cấp giỏ đi chung đường với issue 10; nếu issue 10 chưa xong thì giỏ ở cấp 1.
- **Không tính vào sức chứa:** hạt giống, vật tư, thức ăn, công cụ.
- **Giỏ đầy** thì thu hoạch, nhặt trứng, vắt sữa bị khóa, kèm lý do "Giỏ đầy, về kho cất đồ".
- **Ở nhà kho:** hành động "Cất hết vào kho", và lấy đồ ra lại. Kho chưa giới hạn ở phase này.
- **Bán ở chợ và bỏ vào thùng giao hàng** lấy đồ từ cả giỏ lẫn kho.
- **HUD** hiện số món trong giỏ trên sức chứa.
- **Chuyển từ v1:** đồ cũ vào kho, giỏ trống.

## Acceptance criteria

- [x] Unit test: đầy giỏ thì khóa thu hoạch kèm lý do. Hạt giống không tính vào sức chứa. Cất vào kho làm giỏ trống. Bán lấy được đồ từ kho.
- [x] E2E: dựng bản lưu có giỏ gần đầy → thu hoạch tới khi bị khóa → về kho cất → thu hoạch tiếp được.

## Blocked by

- [02](02-ban-luu-v2.md)
