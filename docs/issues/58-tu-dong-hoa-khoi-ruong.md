# 58. Tự động hóa theo khối: tưới nhỏ giọt, phun thuốc, đất màu mỡ, tiền điện

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · DESIGN §3.3 · ADR 0005, 0015, 0008, 0011 · User story 66–72, 74

## What to build

Ba nâng cấp mua cho cả một **khối ruộng 3×3** (thuộc tính của thực thể khối ruộng, nên dời khối thì nâng cấp đi theo), cộng tiền điện hằng ngày.

- **Tưới nhỏ giọt:** ô trong khối khô thì tự tưới, lấy 1 lần nước từ bồn cho mỗi ô. Bồn cạn thì ngừng. Khối phải nằm trong tầm nước (lý do "ngoài tầm nước" của issue 57).
- **Phun thuốc tự động:** có sâu thì sau 20 giây tự phun, trừ thuốc trừ sâu trong kho. Hết thuốc thì ngừng.
- **Đất màu mỡ:** cỏ mọc chậm hơn, thêm sản lượng. Không cần nước.
- **Chăm bằng máy và sao:** tưới và phun tự động tính là chăm của máy, giữ tối đa ★2 như luật ở issue 52.
- **Tiền điện hằng ngày:** máy bơm và máy phun tốn điện mỗi ngày game, **trừ lúc 6h sáng game** và ghi vào nhật ký. Chỉ tính thời gian vườn thật sự chạy, không tính lúc đóng băng (vắng nhà không bị tính oan). Không đủ xu thì máy ngừng tới khi đủ, không nợ. Phase 4 sẽ gom vào hóa đơn tháng.
- **Chạy offline và chạy bù:** tưới nhỏ giọt và phun tự động chạy cả khi chạy bù offline và khi server chạy bù, ra cùng kết quả (thứ tự trừ nước cố định, ADR 0015). Hạn hán đất khô nhanh gấp 2 nên tưới nhiều hơn.
- **UI:** mỗi khối ruộng hiện biểu tượng các nâng cấp đã có. Màn mua nâng cấp theo khối có giá, hiện rõ khối nào đã có gì.
- **Pixel art do agent Opus vẽ.** Sprite cần vẽ: ống nhỏ giọt trên khối, máy phun, lớp đất màu mỡ (đất sậm hơn, ít cỏ), biểu tượng nâng cấp trên góc khối.

## Acceptance criteria

- [x] Unit test (seam 1): khối có tưới nhỏ giọt thì ô khô tự được tưới và bồn giảm đúng 1 lần mỗi ô; bồn cạn thì không tưới và không trừ âm.
- [x] Unit test: khối có phun tự động, ô có sâu thì sau 20 giây sâu hết và kho trừ đúng 1 thuốc; kho hết thuốc thì không phun.
- [x] Unit test: đất màu mỡ làm cỏ mọc chậm và thêm sản lượng so với khối không nâng.
- [x] Unit test: tiền điện trừ lúc 6h sáng game, ghi nhật ký; không đủ xu thì máy ngừng, đủ xu lại chạy; đoạn đóng băng không bị tính. Chỉ tính cho máy có thật.
- [x] Unit test: dời khối ruộng thì nâng cấp đi theo; dời ra ngoài tầm nước thì bị `canPlace` từ chối.
- [x] Unit test: tưới tự động cả vụ không chăm tay thì tối đa ★2.
- [x] Unit test (seam 3): server chạy bù vườn có tưới nhỏ giọt trong hạn hán cho kết quả giống hệt chạy bù trên trình duyệt với cùng bản lưu.
- [x] E2E (desktop + 360px): dựng bản lưu có máy bơm và bồn → mua tưới nhỏ giọt cho một khối → tua thời gian thì ô tự được tưới → khối hiện biểu tượng nâng cấp. Bồn cạn thì ngừng, nhật ký ghi tiền điện lúc 6h.

## Blocked by

- [57](57-bon-va-mang-nuoc.md)
