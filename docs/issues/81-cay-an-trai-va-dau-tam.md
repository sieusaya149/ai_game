# 81. Cây ăn trái và dâu tằm

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §5.2 · ADR 0005, 0014 · User story 59–69

**Model gợi ý:** Sonnet

## What to build

- **7 cây:** chuối, ổi, cam, xoài, mít, sầu riêng và **dâu tằm** (lá nuôi tằm). Mỗi cây là thực thể **2×2 đặt tự do** (ADR 0005), mở dần theo cấp. 3 giai đoạn **cây con → cây non → cây cho trái**, mỗi cây có bộ hình riêng. Trồng một lần, thu nhiều lần, **không chết vì già**. Số liệu: lấy từ bảng số liệu đợt (issue 78).
- **Thu trái:** rung cây cho trái rơi rồi nhặt; trái bỏ lâu dưới đất thì có ruồi và hỏng. **Tỉa cành** thì sai trái hơn, lâu không tỉa thì ra ít trái. **Sâu đục thân** làm cây yếu dần nếu không chữa. **Bão** có thể gãy cành (hàm thời tiết ADR 0014). Đúng mùa ra gấp đôi trái.
- **Sóc** tới trộm trái, như quạ ở ruộng; đuổi bằng tay (mèo đuổi sóc ở issue 82). Dâu tằm cho lá (tằm dùng ở issue 84).
- **UI:** màn đặt cây, rung cây, nhặt trái, tỉa cành, thuốc trị sâu. Hình tạm tới khi issue ART 91 gộp; khi phát hành mỗi cây có bộ hình riêng cho từng giai đoạn (có trái, gãy cành, sâu), không dùng chung.

## Acceptance criteria

- [ ] Unit test (seam 1): `canPlace` cây 2×2; 3 giai đoạn đúng thời gian; chu kỳ ra trái; đúng mùa gấp đôi; không chết vì già.
- [ ] Unit test: rung cây cho trái rơi, nhặt vào kho; trái bỏ lâu thì ruồi rồi hỏng; tỉa cành tăng sản lượng, lâu không tỉa thì giảm.
- [ ] Unit test: sâu đục thân làm yếu dần, chữa thì hết; bão gãy cành theo hạt giống thời tiết; sóc trộm trái, đuổi bằng tay thì chạy.
- [ ] Unit test (seam 3): server chạy bù vườn cây ăn trái cho cùng sản lượng như trình duyệt.
- [ ] E2E (desktop + 360px): trồng cây, tua thời gian tới cây cho trái, rung cây, nhặt trái, tỉa cành.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [78](78-bang-so-lieu-dot-4b.md)
