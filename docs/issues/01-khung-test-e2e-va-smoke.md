# 01. Khung test e2e và smoke live

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · ADR 0008

## What to build

Dựng khung test **trên bản game hiện tại**, trước khi đụng vào code game, để mọi lát sau đều có e2e kiểm tra.

- **Playwright** là thư viện chỉ dùng lúc phát triển. Chạy local, Chromium ẩn cửa sổ, 1 luồng, hai cỡ màn hình (máy tính và điện thoại 360px).
- **Lệnh e2e** tự bật server phục vụ thư mục `public/` rồi chạy test. Không dựa vào `server.js` đang hỏng.
- **Công cụ dựng tình huống:**
  - Ghi sẵn một bản lưu vào `localStorage` trước khi mở trang.
  - **Tua thời gian:** lùi `savedAt` rồi tải lại trang, để cơ chế chạy bù offline tự đẩy thời gian tới.
  - Game không có code nào chỉ dành cho test.
- **Lệnh smoke** chạy một bộ test ngắn nhắm vào `https://game.huninna.com`, rồi xóa dữ liệu trình duyệt của test.
- **Hướng dẫn chạy** trong README: cài, chạy unit, chạy e2e, chạy smoke.

## Acceptance criteria

- [ ] Một lệnh chạy unit (`node --test`), một lệnh chạy e2e, một lệnh chạy smoke. Ghi rõ trong README.
- [ ] Có e2e cho bản hiện tại, pass ở cả hai cỡ màn hình: tạo nhân vật → cuốc → gieo → tưới.
- [ ] Có e2e dùng bản lưu ghi sẵn có cây sắp chín. Lùi `savedAt` rồi tải lại thì thấy cây chín và thu hoạch được.
- [ ] Smoke chạy với bản live hiện tại thì pass: trang tải được, console không có lỗi, tạo nhân vật được.
- [ ] Game chưa có dòng code nào thêm vào chỉ để phục vụ test.
- [ ] 25 unit test hiện có vẫn pass.

## Blocked by

None - can start immediately
