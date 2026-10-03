# 112. Rà 360px, cập nhật SPEC.md và phát hành Phase 4

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · ADR 0006, 0008, 0011, 0017, 0019, 0020 · Tất cả user story (1–164)

**Model gợi ý:** Sonnet

## What to build

- Ba việc chốt phase, theo mẫu [issue 63](63-phat-hanh-phase-3.md), [77](77-phat-hanh-dot-4a.md) và [94](94-phat-hanh-dot-4b.md).
- **1. Rà giao diện 360px** toàn bộ giao diện mới của 4C: bảng ❤️ và tặng quà, Tiệm Danh Giá, bảng thuê và khoanh vùng thợ, báo cáo cuối ca, hội chợ (loto, ném vòng, bắn lon, vòng quay), thi nông sản, chợ phiên và sạp, 🏪, livestream (cả phía người xem), mùa dịch, hợp tác xã, mã giảm giá, xe hàng rong, thanh sự kiện diệt chuột. Không tràn ngang, nút ≥ 40px, `env(safe-area-inset-*)`, lớp nổi không đè nhau.
- **2. Cập nhật `SPEC.md`:** API công khai 4C (độ thân, ⭐, nhân công, trạng thái chung của làng và giao thức WebSocket mới, hội chợ, thi nông sản, sạp và mua giữa người chơi theo ADR 0020, livestream, mùa dịch, hợp tác xã, mã giảm giá, xe hàng rong, sự kiện diệt chuột); bảng `data` mới; vai trò file mới; cách test online hai trình duyệt; không mâu thuẫn PRD 0005 và ADR 0017–0020. Đối chiếu để SPEC.md bao trọn cả ba đợt 4A–4C.
- **3. Kiểm tra local và ghi chú phát hành:** chạy hết unit và e2e (desktop + 360px, gồm test online hai trình duyệt), ghi số pass, ghi chú phát hành Phase 4 vào `docs/issues/README.md`. **Deploy, smoke live online (thêm bước chợ phiên hai tài khoản test, xóa tài khoản test sau khi chạy) và mã mời do người điều phối làm**; agent chỉ kiểm tra local, không push, không deploy, không ssh lên VPS.

## Acceptance criteria

- [ ] E2E ở 360px mở từng bảng/màn mới của 4C không cuộn ngang, nút ≥ 40px, các lớp nổi không đè nhau.
- [ ] E2E giả lập tai thỏ: mọi nút mới trong vùng an toàn; ghi "chỉ giả lập" nếu chưa thử máy thật.
- [ ] `SPEC.md` khớp với code sau khi issue 95–111 xong và bao trọn Phase 4.
- [ ] Unit và e2e pass hết trên máy local, ghi lại số test pass.
- [ ] Bản lưu v5 cũ (đợt 4A, 4B) vẫn nạp được, không mất gì khi thêm hệ thống 4C (kiểm bằng fixture `v4-farm` đi qua chuỗi chuyển).
- [ ] Mọi issue 95–111 ở trạng thái ✅ trong `docs/issues/README.md`. Deploy và smoke live do người điều phối ghi sau.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [95](95-bang-so-lieu-dot-4c.md)
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
- [109](109-art-dot-4c-cu-dan-va-tho.md)
- [110](110-art-dot-4c-sap-xe-hoi-cho-hop-tac-xa-cup-livestream-ran.md)
- [111](111-thong-bao-viec-can-lam-so-tay-dot-4c.md)
