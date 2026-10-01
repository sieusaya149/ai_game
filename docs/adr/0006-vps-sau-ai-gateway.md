# Chạy trên VPS sau Caddy của ai_gateway, không dùng Cloudflare

Game chạy thành container `ai-game` trong network Docker `gateway` trên VPS `image.huninna.com`. Caddy của `ai_gateway` chuyển `game.huninna.com` tới container đó.

## Considered Options

- **Cloudflare Workers + Durable Objects:** hợp với mô hình mỗi vườn một object, nhưng phải viết server theo kiểu riêng của Cloudflare.
- **Cloudflare Tunnel từ máy phát triển:** máy đó hay thiếu RAM và không bật thường xuyên.

Chọn VPS vì đã có sẵn và đang chạy các project khác theo cùng mẫu, server viết bằng Node + `node:sqlite` bình thường, dữ liệu nằm trong Docker volume.

## Consequences

Site đăng ký bằng khóa gateway `ai-game`. Khóa này chỉ có quyền với `game.huninna.com` và được lưu trên VPS, không nằm trong repo.
