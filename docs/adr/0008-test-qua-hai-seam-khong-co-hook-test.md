# Test qua hai seam, game không có code nào chỉ dành cho test, chạy trên máy local

1. **API công khai của `state.js`**, test bằng `node --test`. Phần lớn luật chơi được test ở đây.
2. **Trình duyệt thật qua Playwright**, chỉ cho những gì seam 1 không nhìn thấy: kéo thả, đi qua cửa, chạm để tự đi tới, giao diện điện thoại 360px.

Game không có chế độ `?test=1` hay hàm nào chỉ dành cho test. Muốn dựng tình huống thì e2e **ghi sẵn bản lưu vào `localStorage`**. Muốn tua thời gian thì lùi `savedAt` về quá khứ, để cơ chế chạy bù offline có sẵn tự đẩy thời gian tới.

Không dùng GitHub Actions. Mọi test, kể cả smoke test sau khi deploy (gửi request tới `https://game.huninna.com`), đều chạy trên máy của người phát triển. Chromium chạy ẩn cửa sổ, mỗi lúc 1 luồng test, vì máy hay thiếu RAM.
