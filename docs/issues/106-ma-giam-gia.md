# 106. Mã giảm giá

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.6 (Chợ online, Mã giảm giá) · ADR 0020, 0018 · User story 156, 157 (và nguồn mã của 149)

**Model gợi ý:** Sonnet

## What to build

- Gắn vào **Đặt hàng online đang chạy** (xem SPEC.md mục `deliveryMode` / `orderOnline`): **giao ngay 30%, sau 1 phút 20%, sau 2 phút 10%**, người giao đi bộ tới kho. Ba loại mã: **giảm 10%**, **giảm 20%**, **miễn phí giao** (bỏ phí của kiểu giao đã chọn). **1 mã mỗi đơn**, **hết hạn sau 3 ngày thật**, **tặng bạn được qua hộp quà** (thao tác khách có mã duy nhất, ADR 0020). Không đổi các gói giao đang chạy.
- Cung cấp **API cấp mã** (`grantCoupon`) cho các nguồn: xem live đủ 3 phút (issue 103), thưởng hợp tác xã (105), sự kiện làng; thành tựu và đăng nhập 7 ngày nối ở Phase 7. Issue nào gộp sau thì nối nguồn của mình.
- Hàng giảm giá hôm nay, hạt theo mùa vừa về, con vật chỉ có khi tới chợ (giữ nguyên). **UI:** ô chọn mã trên phiếu đặt hàng, túi mã, nút tặng bạn. Hình tạm tới khi issue ART 109/110 gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): mỗi loại mã tính đúng với 3 kiểu giao; 1 mã mỗi đơn; hết hạn sau 3 ngày thật; mã đã dùng không dùng lại; xu không âm khi mã lớn hơn phí.
- [ ] Unit test (seam 3): tặng mã cho bạn qua hộp quà, nhận đúng một lần, mã hết hạn không dùng được; server áp mã khi chạy bù đơn đúng như trình duyệt.
- [ ] E2E (desktop + 360px): có mã trong túi, đặt hàng online chọn kiểu giao và mã, thấy tổng giảm đúng.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [95](95-bang-so-lieu-dot-4c.md)
