# 82. Sóc và mèo có tác dụng rõ

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §0c (thú cưng), §2.4 · ADR 0013 · User story 69 (phần mèo), 70–74

**Model gợi ý:** Sonnet

## What to build

- Mèo (đã có từ [issue 44](44-meo.md)) có thêm 4 tác dụng. **(1) Vồ chuột:** thấy chuột thì rình rồi vồ, có hoạt cảnh và thông báo. **(2) Đuổi sóc** ở cây ăn trái (sóc của issue 81). **(3) Canh kho:** kho có mèo canh thì chuột không ăn đồ trong kho. **(4) Tha quà** về cửa thỉnh thoảng (lông chim, hạt giống lạ), nhặt qua API kho chung. Tần suất, danh sách quà: lấy từ bảng số liệu đợt (issue 78).
- **Đếm chuột:** khung thông tin mèo hiện số chuột đã bắt (lưu trong bản lưu, bản cũ `?? 0`).
- Dùng luật trừu tượng thả rông/săn mồi (ADR 0013), thứ tự cố định để chạy bù cho cùng kết quả. Hình tạm cho hoạt cảnh vồ tới khi issue ART 91 gộp.

## Acceptance criteria

- [ ] Unit test (seam 1): mèo thấy chuột trong tầm thì rình rồi vồ, chuột chết, số chuột đã bắt tăng; không có mèo thì không.
- [ ] Unit test: mèo gần cây ăn trái đuổi sóc; kho có mèo canh thì chuột không ăn kho; mèo tha quà theo hạt giống, quà vào kho qua API chung.
- [ ] Unit test (seam 3): server chạy bù cho cùng số chuột bắt và quà như trình duyệt (không giết con vật khi offline theo ADR 0004).
- [ ] E2E (desktop + 360px): bản lưu có chuột và mèo, thấy hoạt cảnh vồ và thông báo, khung mèo hiện số chuột đã bắt.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [81](81-cay-an-trai-va-dau-tam.md)
