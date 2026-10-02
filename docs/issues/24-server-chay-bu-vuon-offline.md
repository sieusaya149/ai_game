# 24. Server chạy bù vườn offline, đóng băng, không gây chết

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0002, 0003, 0004, 0011 · User story 21, 22, 25

## What to build

Chủ vườn tắt máy thì vườn của họ vẫn sống để bạn bè ghé vào thấy cây đã lớn, đồ đã chín.

- **Chạy bù trên server:** khi có người cần đọc vườn của một chủ đang offline, server nạp bản lưu mới nhất, chạy bù bằng chính `state.js` từ `savedAt` tới giờ server, rồi lưu lại. Mô-đun này chỉ gọi hàm luật chơi, không có luật riêng của server.
- **Đóng băng sau 8 tiếng:** chạy bù tối đa 8 tiếng mô phỏng, phần dư bị bỏ (cây và con vật không tiến thêm) như chơi đơn, riêng lịch vẫn chạy (ADR 0003).
- **Không gây chết (ADR 0004):** chạy bù và đóng băng không bao giờ làm con vật chết vì đói hay bệnh, kể cả khi chạy trên server. Con vật có thể đói, bệnh nặng nhưng vẫn sống.
- **Nạp một lần:** nhiều người cùng đọc vườn một chủ offline thì chỉ chạy bù một lần rồi dùng kết quả, không chạy bù chồng nhau.
- **Chủ quay lại:** chủ đăng nhập thì vườn đã chạy bù trên server được trao lại cho trình duyệt, nhận được màn "Trong lúc bạn vắng nhà…" của Phase 0 đúng với những gì đã xảy ra.
- **Chưa có khách:** issue này chỉ dựng cơ chế chạy bù. Hàng đợi thao tác khách thêm ở issue 28.
- **Lối đọc công khai tối thiểu** cho test: đọc trạng thái vườn của người khác (đã chạy bù, chỉ đọc) qua HTTP. Issue 27 dùng lại lối này để thăm vườn.

## Acceptance criteria

- [x] Unit test (seam 3): đẩy bản lưu có cây đang lớn rồi lùi `savedAt` 3 tiếng, đọc vườn bằng tài khoản khác → cây đã lớn đúng 3 tiếng, trạng thái đã lưu lại trên server.
- [x] Unit test (seam 3): lùi `savedAt` 20 tiếng → chỉ tiến 8 tiếng mô phỏng (đóng băng đúng), lịch vẫn tiến đủ.
- [x] Unit test (seam 3): vườn có con vật đói và bệnh, lùi 20 tiếng → con vật vẫn sống, không có sự kiện chết.
- [x] Unit test (seam 3): hai người đọc vườn cùng lúc chỉ chạy bù một lần (cây không lớn gấp đôi); đọc lần hai ngay sau đó không đổi gì.
- [x] Unit test (seam 1): chạy bù một khoảng dài bằng một lần gọi cho kết quả giống với chạy chơi đơn cùng khoảng đó.
- [x] E2E (Playwright, desktop + 360px): tài khoản A đẩy bản lưu có cây sắp chín với `savedAt` lùi 2 tiếng, rồi tắt → đăng nhập lại thấy màn "Trong lúc bạn vắng nhà…" ghi đúng cây đã chín trong lúc vắng.
- [x] E2E: tài khoản A có vườn đóng băng (`savedAt` lùi 20 tiếng) → vào lại thấy con vật còn sống, không báo chết.

## Blocked by

- [22](22-vuon-online-va-mot-thiet-bi.md)
