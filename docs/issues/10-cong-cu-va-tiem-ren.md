# 10. Công cụ 3 cấp và tiệm rèn Ông Sáu

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · DESIGN §0c · User story 31, 43–49

## What to build

- **Bốn công cụ có sẵn ở cấp 1:** cuốc, bình tưới, liềm, giỏ (sức chứa của giỏ là issue 11).
- **Vùng tác động theo cấp:**
  - Cuốc và liềm: 1 ô → 1 hàng 3 ô theo hướng nhìn → 3×3 ô lấy ô mục tiêu làm tâm.
  - Bình tưới: chứa 10 → 20 → 40 lần, và tưới 1 → 3 → 3×3 ô.
- **Khung vàng xem trước** các ô sẽ bị tác động. Danh sách hành động trả thêm danh sách ô đó.
- **Ô không hợp lệ** trong vùng thì bỏ qua, không lỗi.
- **Làm nhiều ô tốn ít thể lực hơn**, theo bảng giảm giá. Ví dụ cuốc 3×3 tốn 5 thay vì 9.
- **Tiệm rèn của Ông Sáu** trong làng:
  - Nâng cấp tốn xu, mất **1 ngày game**. Trong lúc đó tạm không có công cụ đó.
  - Mỗi lúc chỉ nâng được 1 công cụ. Xong thì có thông báo.
- **Chuyển từ v1:** mọi công cụ ở cấp 1. Bình tưới giữ số nước đang có.

## Acceptance criteria

- [ ] Unit test: vùng 1 / 3 / 3×3 theo hướng nhìn. Bỏ qua ô không hợp lệ. Chi phí thể lực giảm giá đúng. Sức chứa bình tưới theo cấp. Nâng cấp mất 1 ngày, trong lúc đó công cụ không dùng được. Chỉ nâng 1 công cụ mỗi lúc.
- [ ] E2E: ra tiệm rèn nâng cuốc → tua 1 ngày → cuốc 3 ô một lần, thấy khung vàng 3 ô trước khi làm.

## Blocked by

- [07](07-lang-va-cho-ba-tu.md)
- [09](09-the-luc.md)
