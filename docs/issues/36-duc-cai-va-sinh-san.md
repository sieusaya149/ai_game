# 36. Đực/cái, sinh sản, trứng có phôi, tên và phả hệ

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0003, 0008 · User story 13–24

## What to build

- **Chọn giới tính khi mua:** chợ/chuồng cho chọn đực hay cái, con cái đắt hơn khoảng 30%. Con đẻ trong trại có giới tính ngẫu nhiên 50/50 (có hạt giống).
- **Gà trống, gà mái:** gà trống **gáy lúc 6h sáng** (có âm thanh, bong bóng). Có ít nhất một gà trống trưởng thành trong trại thì khoảng **40% trứng có phôi**; không có trống thì không trứng nào có phôi.
- **Soi trứng:** hành động mới trên trứng, hiện cho biết trứng có phôi hay không (dấu sáng trong trứng). Ổ ấp **chỉ nhận trứng có phôi** và nở thành gà con (Non). Ổ ấp tự động ở chuồng gia cầm cấp 3 làm việc tương tự.
- **Heo:** 1 đực + 1 nái trưởng thành, no và vui thì nái mang bầu (bụng to), rồi **đẻ 1–3 con**. Nái già đẻ ít con hơn.
- **Bò:** bò đực + bò cái chung chuồng thì khoảng **mỗi 10 giờ vườn có một bê con**.
- **Cừu:** cừu đực + cừu cái sinh cừu non.
- **Sinh sản dừng khi chuồng đầy** (sức chứa từ lát 35): hiện lý do "Chuồng đầy", để biết cần bán bớt hoặc nâng chuồng. Tuổi sinh sản tính theo giờ vườn như lát 34, nên đóng băng thì không đẻ.
- **Tên và phả hệ:**
  - Con đẻ trong trại **tự có tên** theo mẹ, ví dụ "Bông con".
  - Đổi tên được qua hành động trên con vật (nhập tên, giới hạn độ dài).
  - **Cây phả hệ** trong sổ tay: cha, mẹ, con của từng con (lưu tên cha mẹ trong bản lưu v3).
- **Hiển thị:** gà trống khác gà mái (mào, màu lông); heo nái bầu có bụng to; con mới sinh bước ra từ mẹ.
- **Online:** khách thấy giới tính và tên con vật.
- **Pixel art do agent Opus vẽ:** gà trống và gà mái (4 giai đoạn × hướng × khung đi, bổ sung cho lát 34), heo nái mang bầu, hiệu ứng soi trứng (trứng sáng có phôi, trứng sáng trống), trứng có phôi (dấu nhỏ), bong bóng gáy.

## Acceptance criteria

- [x] Unit test (seam 1): con cái đắt hơn khoảng 30%; thống kê trên nhiều lần tick với hạt giống cố định cho thấy 40% trứng có phôi khi có trống và 0% khi không có trống; giới tính con đẻ xấp xỉ 50/50.
- [x] Unit test: ổ ấp từ chối trứng không phôi và nở trứng có phôi thành gà con; heo nái mang bầu chỉ khi có đủ đực, nái, no và vui, đẻ 1–3 con; bò đẻ khoảng mỗi 10 giờ vườn; cừu sinh con khi có đủ đực cái.
- [x] Unit test: chuồng đầy thì không ai sinh sản; vườn đóng băng thì không sinh sản; con đẻ ra có tên và có cha mẹ đúng trong bản lưu; đổi tên được và bị từ chối khi tên rỗng hoặc quá dài.
- [x] E2E (Playwright, desktop + 360px; tua ấp nở bằng timeWarp): dựng bản lưu có trống, mái và trứng → soi trứng thấy trứng có phôi → bỏ vào ổ ấp → gà con nở; dựng bản lưu có heo nái bầu sắp đẻ → thấy heo con ra đời với tên → mở sổ tay thấy cây phả hệ → đổi tên được.
- [x] Gà trống gáy lúc 6h sáng trong game có thể kiểm bằng cách dựng bản lưu ở 5h59. (unit test; e2e không chụp âm thanh)
- [x] Pixel art gà trống/mái, heo nái bầu, hiệu ứng soi trứng có đủ. (gà trống/mái và trứng có phôi dùng SPR3; heo nái bầu = sprite heo kéo giãn ngang, trứng soi trống và bong bóng gáy là fallback vẽ trong render.js, chờ agent Opus vẽ đẹp hơn)

## Blocked by

- [35](35-chuong-3-cap-va-cach-ly.md)
