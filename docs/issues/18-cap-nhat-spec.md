# 18. Cập nhật SPEC.md theo nền móng mới

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md)

## What to build

`SPEC.md` hiện mô tả bản đồ cố định và ghi `data.js`, `layout.js` là "chỉ đọc", `server.js` là "đừng sửa". Cần cập nhật để các agent của các phase sau làm theo đúng:

- **Vai trò mới của từng file:**
  - `data.js` được sửa, và chứa các bảng mới.
  - `layout.js` chỉ còn bố cục khởi đầu và bố cục chuyển đổi, bản đồ nhà và làng, dựng lưới va chạm.
  - `server.js` sẽ được viết lại ở Phase 1.
- **Hình dạng bản lưu v2** và quy tắc thêm hàm chuyển đổi khi bản lưu đổi phiên bản.
- **API công khai của luật chơi**, gồm cả các hàm mới: kiểm tra vị trí đặt, đặt/dời/cất, mở đất, dọn đất, chuyển bản đồ, thể lực, công cụ, giỏ, thùng giao hàng, danh sách Việc cần làm, mức và khóa gộp của sự kiện.
- **Danh sách target và event mới.**
- **Hai seam test và cách dựng tình huống** bằng bản lưu ghi sẵn (ADR 0008).
- **Liên kết tới `DESIGN.md`**, các ADR và PRD.

## Acceptance criteria

- [ ] `SPEC.md` không còn chỗ nào mâu thuẫn với PRD 0001 và các ADR.
- [ ] Một agent mới chỉ đọc `SPEC.md` là biết file nào mình được sửa, gọi API nào, và test ở đâu.
- [ ] Hợp đồng API trong `SPEC.md` khớp với code sau khi issue 02 xong. Mỗi issue sau thêm hàm mới thì cập nhật lại.

## Blocked by

- [02](02-ban-luu-v2.md)
