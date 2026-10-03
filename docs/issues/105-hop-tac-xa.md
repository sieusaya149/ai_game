# 105. Hợp tác xã

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.6 (Hợp tác xã) · ADR 0019, 0020 · User story 154, 155

**Model gợi ý:** Sonnet

## What to build

- Mỗi **tuần ngoài đời** một **chỉ tiêu chung 2–3 món** theo mùa game đang chạy, góp ở nhà hợp tác xã trong làng (trạng thái chung issue 99, lịch issue 68). **Góp được trả 100% giá chợ** (đi qua hàm giá, API kho chung). **Đủ chỉ tiêu thì cả làng có thưởng**, góp nhiều được nhiều, **không đủ thì không phạt**. Chơi đơn giả lập. Số liệu: lấy từ bảng số liệu đợt (issue 95).
- Thưởng có thể gồm mã giảm giá: cấp bằng API của issue 106 (nếu 106 chưa gộp thì issue gộp sau nối). **UI:** nhà hợp tác xã, thanh tiến độ chung, bảng đóng góp. Hình tạm tới khi issue ART 109/110 gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): chỉ tiêu theo mùa game và cùng hạt giống thì cùng chỉ tiêu; góp trả đúng 100% giá chợ; đủ chỉ tiêu thì có thưởng, không đủ thì không phạt.
- [ ] Unit test (seam 3): nhiều người cùng góp cộng đúng, phát tiến độ cho mọi người, tổng kết cuối tuần đúng một lần.
- [ ] E2E (desktop + 360px, hai trình duyệt): hai người cùng góp, thấy thanh tiến độ và thưởng khi đủ.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [99](99-trang-thai-chung-cua-lang-tren-server.md)
