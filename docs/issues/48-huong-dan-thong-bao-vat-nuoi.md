# 48. Hướng dẫn Cô Út, thông báo, Việc cần làm và sổ tay cho vật nuôi

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0008, 0013 · User story 115–118

## What to build

Lát này gom mọi thứ giúp người chơi **biết mình cần làm gì** với hệ thống vật nuôi mới, nối vào cơ chế đã có từ Phase 0 (thông báo 3 mức, Việc cần làm, hướng dẫn mở dần, sổ tay).

- **Nhiệm vụ làm quen của Cô Út:** khi người chơi **mua con heo đầu tiên ở cấp người chơi 3**, Cô Út dạy lần lượt **tắm**, **chữa bệnh**, **vắc-xin** bằng chuỗi nhiệm vụ nhỏ (mỗi bước mở khi bước trước xong, có thể bỏ qua). Tiến độ lưu trong bản lưu v3.
- **Thông báo 3 mức cho vật nuôi:** mỗi loại sự kiện mới đều có mức và khóa gộp.
  - 🔴 **Gấp (có mũi tên chỉ hướng, rung):** con vật **Bệnh nặng và Nguy kịch**, **kẻ săn mồi sắp tới**.
  - 🟡 **Quan trọng:** con lạc, con vào giai đoạn già, đẻ con.
  - ⚪ **Thông tin:** nhặt trứng trong bụi.
  - Các loại này vẫn tắt/bật được trong cài đặt, trừ thông báo gấp. Thông báo trình duyệt (Notification API) khi có con Bệnh nặng, xin quyền một lần (đã làm ở lát 38).
- **Bảng Việc cần làm** thêm các mục: **con dơ**, **con lạc**, **chuồng bẩn**, **trứng trong bụi**; chạm vào mục thì tới chỗ đó. Danh sách do luật trả ra.
- **Sổ tay** thêm các trang: **vòng đời**, **tắm**, **bệnh** (4 giai đoạn, thuốc, cách ly), **lùa** (rải thóc, chó, mèo), **dạy chó** (6 lệnh), và có thể thêm **kẻ săn mồi**. Trang mở khi người chơi đã gặp hệ thống đó lần đầu.
- **Hướng dẫn mở dần:** các hệ thống mới (tắm, bệnh, lùa, dạy chó, kẻ săn mồi) chỉ hiện gợi ý khi người chơi tới cấp tương ứng, không dội cả loạt lên người mới.

## Acceptance criteria

- [x] Unit test (seam 1): mọi loại sự kiện vật nuôi mới đều có mức và khóa gộp (một test đi qua hết danh sách loại sự kiện); chuỗi nhiệm vụ Cô Út mở đúng thứ tự khi mua heo đầu tiên ở cấp 3 và không chạy lại; danh sách Việc cần làm trả ra đúng con dơ, con lạc, chuồng bẩn, trứng trong bụi.
- [x] E2E (Playwright, desktop + 360px): dựng bản lưu mua heo đầu tiên ở cấp 3 → thấy nhiệm vụ Cô Út, làm xong từng bước (tắm, chữa, vắc-xin); dựng bản lưu có con Nguy kịch ngoài khung nhìn → thấy băng rôn đỏ và mũi tên chỉ đúng hướng; dựng bản lưu có con dơ, con lạc, chuồng bẩn, trứng trong bụi → bảng Việc cần làm hiện đủ bốn loại; mở sổ tay thấy các trang mới.
- [x] E2E: nhiều sự kiện cùng khóa (ví dụ 3 con lạc) chỉ thấy một thông báo gộp.

## Blocked by

- [38](38-benh-va-co-ut.md)
- [42](42-ve-chuong-va-lua.md)
- [43](43-ke-san-moi.md)
