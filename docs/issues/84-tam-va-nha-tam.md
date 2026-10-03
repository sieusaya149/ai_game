# 84. Tằm và nhà tằm

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §2.1a, §3.3c · ADR 0005 · User story 79, 80

**Model gợi ý:** Sonnet

## What to build

- **Nhà tằm** 2/4/6 nong (từ cấp 12), nong là chỗ đặt tằm, **tằm ăn lá dâu tằm** (cây của issue 81), cho **kén**. Chuồng mới thêm vào `PEN_TABLE`. Số liệu: lấy từ bảng số liệu đợt (issue 78).
- **Chuỗi hàng giá cao:** kén qua khung dệt thành lụa, lụa qua máy may thành áo dài (máy của issue 71). Issue này nối chuỗi và kiểm cả chuỗi bằng test.
- Hình tạm tới khi issue ART 91 gộp; khi phát hành tằm, kén, nhà tằm có hình riêng.

## Acceptance criteria

- [ ] Unit test (seam 1): `canPlace` nhà tằm; số nong theo cấp; tằm ăn lá dâu, hết lá thì đói; ra kén theo bảng.
- [ ] Unit test: chuỗi kén → lụa → áo dài qua khung dệt và máy may, đúng đầu vào/đầu ra.
- [ ] Unit test (seam 3): server chạy bù cho cùng số kén như trình duyệt (tằm không chết vì offline, ADR 0004).
- [ ] E2E (desktop + 360px): trồng dâu, xây nhà tằm, cho ăn, thu kén, cho vào khung dệt và máy may.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [81](81-cay-an-trai-va-dau-tam.md)
