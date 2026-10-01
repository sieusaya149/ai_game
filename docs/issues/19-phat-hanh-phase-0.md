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

- [x] Unit và e2e pass hết trên máy local trước khi deploy. Ghi lại số test pass.
- [x] Deploy xong, container `ai-game` ở trạng thái chạy.
- [x] Smoke live pass.
- [ ] Bản lưu v1 thật chuyển sang v2 không mất gì. — **chờ chủ game mở bản live bằng trình duyệt đang có save v1 thật**; đã kiểm bằng fixture v1 (unit + e2e `save-migration`).
- [x] Mọi issue 01–18 ở trạng thái ✅.

## Blocked by

- Tất cả issue 01–18

## Ghi chú phát hành (2026-10-02)

- Local: unit **178/178** pass, e2e **114 pass** (30 skip là test chỉ dành cho một cỡ màn hình), desktop 1280 + mobile 360.
- Deploy: VPS `~/project/ai_game` ở commit `f09255d`, `docker compose up -d --build`, container `ai-game` Up.
- Smoke live từ máy local vào https://game.huninna.com: pass (tải trang, tạo nhân vật, mở chế độ xây dựng, ra làng và về, không lỗi console).
- Chỉ giả lập, chưa thử máy thật: kéo thả cảm ứng (03/04), FPS máy yếu (15, đo bằng CPU throttling), tai thỏ (17).
- Phase 0 có: bản lưu v2 + chuyển từ v1, chế độ xây dựng, đặt ruộng/chuồng/đồ trang trí, bản đồ lớn + mua đất + dọn bụi đá, vào nhà, làng + chợ Bà Tư, thùng giao hàng, thể lực + ngủ, công cụ 3 cấp + tiệm rèn, giỏ + kho, đóng băng sau 8h + màn vắng nhà + mùa, thông báo 3 mức, việc cần làm + bản đồ nhỏ, hiệu năng + tiết kiệm pin, hướng dẫn + sổ tay, rà 360px, SPEC.md mới.