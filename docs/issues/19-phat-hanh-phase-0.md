# 19. Phát hành Phase 0

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · ADR 0006, 0008 · User story 73

## What to build

Quy trình phát hành đã chốt ở `DESIGN.md` mục 9:

1. **Trên máy local:** chạy hết unit test và e2e (cả hai cỡ màn hình). Mọi thứ phải pass.
2. **Deploy lên VPS:** `git pull && docker compose up -d --build` trong `~/project/ai_game`. Nginx vẫn phục vụ file tĩnh, chưa có server Node.
3. **Từ máy local:** chạy smoke test live nhắm vào `https://game.huninna.com`. Thêm vào smoke các bước: đi vào làng và về được, mở được chế độ xây dựng.
4. **Kiểm tra bản lưu thật:** mở bản live bằng trình duyệt đã có bản lưu v1 thật, xác nhận vườn chuyển sang v2 không mất gì.
5. **Ghi lại kết quả:** cập nhật trạng thái các issue trong `docs/issues/README.md` và ghi chú phát hành ngắn.

## Acceptance criteria

- [ ] Unit và e2e pass hết trên máy local trước khi deploy. Ghi lại số test pass.
- [ ] Deploy xong, container `ai-game` ở trạng thái chạy.
- [ ] Smoke live pass.
- [ ] Bản lưu v1 thật chuyển sang v2 không mất gì.
- [ ] Mọi issue 01–18 ở trạng thái ✅.

## Blocked by

- Tất cả issue 01–18
