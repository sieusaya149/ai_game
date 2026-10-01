# 44. Mèo bắt chuột

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0004, 0008, 0013 · User story 91–96

## What to build

- **Mèo là loài mới** trong bảng loài, thú cưng thứ hai: sống ở **nhà mèo** (3 cấp từ lát 35) và **ra vào tự do qua cửa mèo** trên nhà; **tối ngủ trong bản đồ nhà**. Mèo mua ở chợ Bà Tư. Không dạy được lệnh.
- **Vòng đời Non → Nhỡ → Trưởng thành → Già:** mèo con vờn đuôi, nghịch cuộn len; mèo nhỡ tập vồ, bắt được chuột nhỏ; mèo trưởng thành là **thợ săn chuột**, phơi nắng, leo cây; mèo già lười, **chỉ bắt chuột khi đói**. Mèo không chết vì già.
- **Săn chuột (luật trừu tượng):** mèo **đói vừa phải** thì săn tốt nhất, khoảng **1 con chuột mỗi 10 phút**; **cho ăn no quá thì mèo lười**, nằm phơi nắng và không săn. Luật quyết định chuột bị bắt theo ô và xác suất có hạt giống; server chạy bù cho cùng kết quả.
- **Chiến lợi phẩm:** mèo bắt được chuột thì **mang tới khoe người chơi** (diễn hoạt, người chơi chạm để khen thì tăng độ thân).
- **Cãi nhau với chó:** thỉnh thoảng mèo và chó cãi nhau (sự kiện vui, không gây hại, không đổi chỉ số quan trọng).
- **Lùa 1 con:** mèo chỉ lùa **1 con gần nhất** về chuồng và chỉ khi đang vui (mỏng hơn chó ở lát 45).
- **Dính tới các lát khác:** mèo chịu bệnh (lát 38), độ thân (lát 39), dơ không áp dụng với mèo. Mèo giúp "đủ mèo, chó thì gần như không mất con nào" ở lát 43.
- **Pixel art do agent Opus vẽ:** mèo 4 giai đoạn × hướng × khung đi (ngủ, phơi nắng, vồ, mang chuột); nhà mèo 3 cấp (đã vẽ ở lát 35, xác nhận đủ); cửa mèo trên nhà; chiến lợi phẩm (chuột nhỏ); bong bóng cãi nhau mèo-chó.

## Acceptance criteria

- [ ] Unit test (seam 1): mèo đói vừa phải bắt chuột khoảng mỗi 10 phút (thống kê hạt giống cố định); mèo no quá thì không bắt; mèo già chỉ bắt khi đói; mèo không chết vì già; số chuột giảm khi có mèo và không bao giờ vượt 8.
- [ ] Unit test: mèo chỉ lùa 1 con gần nhất khi đang vui; tối mèo ngủ trong nhà; mua mèo bị từ chối khi chưa có nhà mèo; mèo không học được lệnh.
- [ ] Unit test: chạy bù offline có mèo và chuột → chuột ít đi, không con nào chết (ADR 0004).
- [ ] E2E (Playwright, desktop + 360px): dựng bản lưu có chuột và mèo đói vừa → mèo đuổi và bắt chuột → mang chiến lợi phẩm tới khoe; dựng bản lưu có mèo no quá → mèo nằm phơi nắng không săn; dựng bản lưu ở tối → mèo vào nhà ngủ qua cửa mèo.
- [ ] Pixel art mèo, cửa mèo, nhà mèo có đủ.

## Blocked by

- [43](43-ke-san-moi.md)
