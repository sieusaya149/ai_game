# 100. Hội chợ: loto và trò chơi

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.3 · ADR 0019, 0009 · User story 127–130

**Model gợi ý:** Sonnet

## What to build

- **Loto làng:** mua vé chọn 3 số từ 1–30, **quay lúc 20h mỗi ngày game**, **giải độc đắc chung cả làng** (trạng thái chung issue 99), người trúng hiện trên bảng tin, **tối đa 10 vé mỗi ngày game**. Chơi đơn giả lập. Tỉ lệ, giải: lấy từ bảng số liệu đợt (issue 95). **Nhà cái luôn lời; chỉ dùng xu trong game.**
- **Trò chơi ở gian Anh Tám:** ném vòng và bắn lon (kỹ năng, minigame), vòng quay (may rủi), phần thưởng là đồ trang trí độc quyền (nhận qua API kho chung). Giới hạn vé/lượt mỗi ngày.
- **UI:** gian hội chợ, vé loto, bảng kết quả, minigame dùng được trên 360px. Hình tạm tới khi issue ART 110 gộp.

## Acceptance criteria

- [ ] Unit test (seam 1): loto chọn 3 số 1–30, quay theo hạt giống đúng 20h, tỉ lệ và giải đúng bảng; trần 10 vé/ngày; nhà cái lời kỳ vọng dương (kiểm bằng số học trên bảng, không mô phỏng ngẫu nhiên không cố định).
- [ ] Unit test: ném vòng và bắn lon cho kết quả theo kỹ năng truyền vào, vòng quay theo hạt giống; phần thưởng độc quyền vào đúng chỗ.
- [ ] Unit test (seam 3): giải độc đắc chung cộng dồn từ nhiều người mua, người trúng được trả đúng một lần, bảng tin báo.
- [ ] E2E (desktop + 360px, hai trình duyệt cho phần chung): mua vé, chờ quay, thấy kết quả; chơi ném vòng.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [99](99-trang-thai-chung-cua-lang-tren-server.md)
