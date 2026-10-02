# 20. Server Node một container thay nginx, khung test giao thức

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0006, 0007, 0010, 0011 · User story 83, 85, 86

## What to build

Đây là tracer bullet của Phase 1: người chơi vẫn chỉ thấy bản chơi đơn như cũ, nhưng bên dưới đã có một server thật.

- **Server Node viết lại từ đầu:** `server.js` cũ đang hỏng nên bỏ, không sửa tiếp. Một tiến trình Node duy nhất phục vụ file tĩnh của `public/`, một endpoint sức khỏe và một kênh WebSocket (`ws`, thư viện chạy thật duy nhất, chỉ phía server). Kênh WebSocket lúc này chỉ trả lời ping.
- **Khởi động bằng một hàm:** nhận cổng và đường dẫn cơ sở dữ liệu SQLite (`node:sqlite`), trả về đối tượng để tắt server. Test bật tắt nhiều lần, mỗi lần một file SQLite tạm.
- **Khung test giao thức (seam 3, ADR 0011):** helper chung cho các issue sau: bật server thật với SQLite tạm, mở HTTP và WebSocket thật, tắt và dọn file. Không gọi thẳng hàm bên trong server, không mock cơ sở dữ liệu.
- **Docker và compose:**
  - Container `ai-game` đổi từ nginx sang Node, vẫn nghe HTTP trong mạng `gateway` sau Caddy của `ai_gateway`.
  - Dữ liệu nằm trên một Docker volume.
  - Deploy vẫn là `git pull && docker compose up -d --build`.
- **Lệnh sao lưu:** một lệnh chạy trong container để chép file SQLite ra bản sao có dấu thời gian trên volume, kèm hướng dẫn ngắn cách kéo về máy.
- **Bản chơi đơn không đổi:** vườn offline vẫn ở `localStorage`, mở `public/` bằng server tĩnh bất kỳ vẫn chơi được. Smoke live hiện có vẫn chạy trên bản đã deploy bằng server Node.

## Acceptance criteria

- [x] Unit test (seam 3): bật server với SQLite tạm → endpoint sức khỏe trả 200; mở WebSocket, gửi ping và nhận lại pong; tắt server thì kết nối đóng. Bật tắt hai lần liên tiếp trên hai file khác nhau đều chạy được.
- [x] Unit test (seam 3): yêu cầu một file tĩnh trong `public/` nhận đúng nội dung và kiểu MIME. Đường dẫn cố thoát ra ngoài `public/` (`..`) bị từ chối.
- [x] Unit test: lệnh sao lưu tạo ra file sao có thể mở lại bằng `node:sqlite` và đọc được bảng đã có.
- [x] E2E (Playwright, desktop + 360px): chạy bộ e2e bản chơi đơn hiện có trên server Node local thay cho server tĩnh cũ, tất cả vẫn pass.
- [x] Docker: `docker compose up -d --build` chạy được, container `ai-game` ở trạng thái Up, khởi động lại container thì file SQLite còn nguyên nhờ volume. (Thử trên Docker local: Up (healthy), restart và down/up giữ nguyên DB, gọi được `ai-game:80` từ network `gateway`.)
- [ ] Smoke live (https://game.huninna.com) vẫn pass sau deploy: tải trang, tạo nhân vật, ra làng và về, endpoint sức khỏe trả 200 qua Caddy. (Chưa deploy: người điều phối chạy `npm run test:smoke` sau khi deploy; smoke đã có thêm test `/api/health`, chạy vào bản nginx cũ sẽ đỏ.)
- [x] Không còn import hỏng: `server.js` mới không phụ thuộc hàm cũ đã bị xóa khỏi `data.js`.

## Blocked by

- [19](19-phat-hanh-phase-0.md)
