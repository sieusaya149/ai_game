# 98. Nhân công

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §4 · ADR 0004, 0012 · User story 118–126

**Model gợi ý:** Sonnet

## What to build

- **Bảng thuê ở cổng làng**, 4 thợ: **Bé Tí, Cô Lan, Chú Chín, Anh Bảy**, mỗi người làm một nhóm việc (DESIGN §4). Từ cấp 5. Số thợ tối đa 1 + 1 cho mỗi 8 cấp, tối đa 4. Hợp đồng theo ca (hoặc cả ngày), **tự gia hạn, tiền trừ đầu ca, hủy lúc nào cũng được**, hết tiền thì thợ không tới và gửi thư báo (hộp thư issue 69). Lương theo cấp: lấy từ bảng số liệu đợt (issue 95).
- **Thợ là thực thể động do luật điều khiển** theo ca và **vùng khoanh**; `world.js` chỉ diễn đi lại. Thợ đi lại thật, **thể lực 60 mỗi ca**, mệt thì **ngủ gật dưới gốc cây** (phải đánh thức), lên cấp làm nhanh hơn, **cấp 3 trở lên ra được ★3**. Thợ dùng đồ trong kho (cám trộn của issue 72 và cám mua như nhau) và báo khi hết. **Cho ăn được nhưng không chữa bệnh được.**
- **Chạy cả khi chủ offline trong 8 giờ chạy bù** (trình duyệt và server) với **thứ tự việc cố định** để kết quả giống nhau; báo cáo cuối ca. Ca đang chạy khi chạy bù đi qua API kho chung.
- **UI:** bảng thuê, bảng thợ (khoanh vùng, nghỉ, đánh thức), báo cáo cuối ca. Hình tạm tới khi issue ART 109/110 gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): thuê thợ theo cấp và số tối đa; tiền trừ đầu ca, hủy được; hết tiền thì không tới và có thư báo; thể lực 60, ngủ gật, đánh thức; lên cấp; cấp 3 ra ★3; chỉ làm trong vùng khoanh; không chữa bệnh được.
- [ ] Unit test: thợ dùng đồ trong kho và báo khi hết; thứ tự việc cố định cho cùng kết quả khi chạy lại cùng bản lưu.
- [ ] Unit test (seam 3): server chạy bù ca 8 giờ cho cùng việc làm, cùng báo cáo như trình duyệt.
- [ ] E2E (desktop + 360px): thuê Cô Lan, khoanh vùng, thấy thợ đi lại và làm việc, mệt thì ngủ gật, đánh thức, mở báo cáo cuối ca.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [95](95-bang-so-lieu-dot-4c.md)
