# 111. Thông báo, việc cần làm và sổ tay đợt 4C

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8c · ADR 0004 · User story 161–163 (phần 4C)

**Model gợi ý:** Sonnet

## What to build

- **Thông báo** đúng mức cho: ❤️ lên, ⭐ nhận, thợ ngủ gật/hết đồ/hết tiền, báo cáo cuối ca, loto quay và người trúng, thi nông sản mở, chợ phiên sắp mở, có người mua sạp, 🏪 đổi, live bắt đầu/có người xem, báo trước mùa dịch, hợp tác xã sắp hết hạn, mã giảm giá sắp hết hạn, sự kiện diệt chuột sắp tới. Khóa gộp tránh dội khi chạy bù.
- **Việc cần làm** thêm: đánh thức thợ, gia hạn hợp đồng, góp hợp tác xã, tiêm phòng trước mùa dịch, bày sạp, diệt chuột. **Sổ tay** thêm trang cho từng hệ thống 4C. Hướng dẫn mở dần ở lần đầu gặp.

## Acceptance criteria

- [ ] Unit test (seam 1): mỗi sự kiện mới có mức và khóa gộp đúng; `todoList` trả đúng các loại việc mới.
- [ ] E2E (desktop + 360px): dựng bản lưu có thợ ngủ gật, mùa dịch sắp tới, chợ phiên sắp mở thì thấy thông báo, việc cần làm, và mở được trang sổ tay mới.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [96](96-do-than-voi-cu-dan.md)
- [97](97-tieng-tam-va-tiem-danh-gia.md)
- [98](98-nhan-cong.md)
- [99](99-trang-thai-chung-cua-lang-tren-server.md)
- [100](100-hoi-cho-loto-va-tro-choi.md)
- [101](101-thi-nong-san.md)
- [102](102-cho-phien-va-uy-tin-shop.md)
- [103](103-livestream-ban-hang.md)
- [104](104-mua-dich-va-tiem-phong.md)
- [105](105-hop-tac-xa.md)
- [106](106-ma-giam-gia.md)
- [107](107-xe-ban-hang-rong.md)
- [108](108-su-kien-diet-chuot-bat-ran-phun-sau.md)
