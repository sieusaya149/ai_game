# 80. Câu cá, sông làng và ếch

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §5.1, §2.1a · ADR 0014 · User story 56–58

**Model gợi ý:** Sonnet

## What to build

- **Câu cá** là minigame bấm đúng nhịp, ở **hồ nhà** và **sông làng** (có cá hiếm theo mùa, hàm mùa của Phase 3), thỉnh thoảng dính ủng cũ. Kết quả cá đi qua API kho chung. Tần suất, cá hiếm: lấy từ bảng số liệu đợt (issue 78).
- **Ếch** sống ở hồ, **ăn sâu ở ruộng gần hồ**, bắt bằng vợt để bán, kêu ban đêm. Ếch dùng lại hệ vật nuôi/thực thể tối thiểu (không cần đủ 4 giai đoạn nếu bảng số liệu chốt như vậy).
- **UI:** cần câu (công cụ mới), minigame nhịp bấm dùng được trên 360px, vợt bắt ếch. Hình tạm tới khi issue ART 91 gộp.

## Acceptance criteria

- [ ] Unit test (seam 1): minigame trả kết quả đúng theo hạt giống và nhịp truyền vào (không đọc đồng hồ máy); cá hiếm chỉ ra đúng mùa ở sông làng; có xác suất ủng cũ theo bảng.
- [ ] Unit test: ếch ăn sâu ở ruộng trong tầm hồ, không ăn ở ruộng xa; bắt bằng vợt cho ra hàng bán được.
- [ ] E2E (desktop + 360px): câu cá ở hồ nhà và sông làng, bắt ếch bằng vợt.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [79](79-ho-ca.md)
