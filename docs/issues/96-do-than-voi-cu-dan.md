# 96. Độ thân với cư dân

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §6b · ADR 0012 · User story 109–112

**Model gợi ý:** Sonnet

## What to build

- **Độ thân ❤️1–5 với từng cư dân** (Bà Tư, Ông Sáu, Cô Út, Chú Ba, Chị Hai, Dì Năm, Anh Tám, Bé Bi; thợ nhân công nằm ở issue 98) lưu trong bản lưu. Tăng khi **giao đơn của họ**, **tặng quà đúng sở thích** (mỗi người có món thích và món ghét: ghét thì giảm), **chào hỏi mỗi ngày** (có giới hạn mỗi ngày). Điểm và giới hạn: lấy từ bảng số liệu đợt (issue 95).
- **Thưởng:** giảm giá ở cửa hàng của người đó, công thức mới (Chị Hai, nối sổ công thức issue 74), đơn hàng giá cao, sự kiện riêng. Nối ❤️ vào đơn việc của issue 90 và đơn hàng thường. Mọi thao tác là thao tác của khách đi qua `state.js` (ADR 0012).
- **UI:** thanh ❤️ trong bảng thoại từng cư dân, màn tặng quà. Hình tạm tới khi issue ART 109/110 gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): ❤️ tăng đúng theo từng nguồn, chạm giới hạn mỗi ngày thì không tăng; quà thích tăng, quà ghét giảm; không xuống dưới 1 hoặc vượt 5.
- [ ] Unit test: mỗi mức ❤️ mở đúng thưởng (giảm giá đúng %, công thức mở, đơn giá cao xuất hiện).
- [ ] E2E (desktop + 360px): chào hỏi, tặng quà, giao đơn cho một cư dân, thấy ❤️ lên và thưởng mở.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [95](95-bang-so-lieu-dot-4c.md)
