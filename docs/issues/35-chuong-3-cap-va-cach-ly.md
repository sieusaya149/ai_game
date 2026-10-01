# 35. Chuồng 3 cấp, nhiều chuồng cùng loại, chuồng cách ly, chuồng chó

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0005, 0008 · User story 62–68

## What to build

- **Bảng chuồng theo loại và cấp:** mở rộng bảng chuồng hiện có thành bảng theo (loại chuồng, cấp) gồm sức chứa, đồ có thêm ở cấp 3, cấp người chơi cần, giá xây và giá nâng.
  - 🐔 **Gia cầm:** sức chứa 6 / 12 / 18, cấp người chơi 1. Cấp 3 có chỗ cho ổ ấp tự động và ổ cát.
  - 🐷 **Heo:** 3 / 5 / 8, cấp người chơi 3. Cấp 3 có chỗ cho vũng bùn (vòi sen để dành cho Phase 3, chỉ giữ chỗ trong bảng).
  - 🐄 **Chuồng lớn + đồng cỏ** (bò, cừu): 3 / 6 / 9, cấp người chơi 5. Cấp 3 có cỏ tự mọc.
  - 🏥 **Chuồng cách ly:** 1 / 2 / 3 chỗ, cấp người chơi 3, **chỉ xây được từ cấp 3 của người chơi**, nhận mọi loài, mỗi chỗ một con.
  - 🐕 **Chuồng chó** (và nhà mèo để dành cho lát 44): 3 cấp, cấp 3 có nệm và đồ chơi làm tăng vui.
- **Nhiều chuồng cùng loại:** xây thêm chuồng thứ hai, thứ ba, có **giới hạn số chuồng mỗi loại theo cấp người chơi** (bảng số liệu). Chuồng là thực thể đã đặt như Phase 0, nên đặt, dời, cất đều qua một hàm kiểm tra vị trí duy nhất (ADR 0005); chuồng không được chặn đường từ cổng vào nhà.
- **Nâng cấp:** chạm vào chuồng hoặc dùng trong chế độ xây dựng → "Nâng cấp" trừ xu, sức chứa tăng ngay, con vật không mất. Từ chối khi thiếu xu hoặc thiếu cấp người chơi.
- **Chuồng là chỗ ngủ:** số con nuôi được tính theo sức chứa của chuồng, kể cả loài thả rông ban ngày. Mua con vật khi chuồng đầy thì bị từ chối kèm lý do. Con vật được xếp vào chuồng còn chỗ.
- **Chuyển từ v3:** chuồng đã có ở v2/v3 thành cấp 1; không con nào bị đẩy ra khỏi chuồng.
- **Hiển thị:** khung chuồng đổi hình theo cấp, có biển sức chứa "Gà 5/12".
- **Pixel art do agent Opus vẽ:** chuồng gia cầm, chuồng heo, chuồng lớn + đồng cỏ, mỗi loại 3 cấp; chuồng cách ly 3 cấp (1/2/3 chỗ); chuồng chó 3 cấp (cấp 3 có nệm, đồ chơi); nhà mèo 3 cấp (vẽ sẵn, dùng ở lát 44); ổ cát, vũng bùn, cỏ tự mọc (đồ cấp 3).

## Acceptance criteria

- [ ] Unit test (seam 1) cho bảng chuồng: sức chứa đúng 6/12/18, 3/5/8, 3/6/9 và 1/2/3 cho cách ly; nâng cấp trừ đúng xu, giữ nguyên con vật; từ chối khi thiếu xu hay thiếu cấp.
- [ ] Unit test: giới hạn số chuồng mỗi loại theo cấp; chuồng cách ly không xây được dưới cấp người chơi yêu cầu; chuồng mới đi qua hàm kiểm tra vị trí và bị từ chối khi chặn đường cổng-nhà.
- [ ] Unit test: mua con vật khi chuồng đầy bị từ chối; sức chứa tính cả con thả rông; chuyển lên v3 không làm con nào ra khỏi chuồng.
- [ ] E2E (Playwright, desktop + 360px): dựng bản lưu có chuồng gà đầy cấp 1 → nâng lên cấp 2 → mua thêm gà được; xây chuồng gà thứ hai trong chế độ xây dựng; xây chuồng cách ly ở cấp 3.
- [ ] Pixel art chuồng 3 cấp cho từng loại và chuồng cách ly có đủ, nhìn ra khác nhau giữa các cấp.

## Blocked by

- [34](34-ban-luu-v3-vong-doi.md)
