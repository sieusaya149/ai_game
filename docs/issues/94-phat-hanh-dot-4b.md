# 94. Rà 360px, cập nhật SPEC.md và phát hành đợt 4B

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · ADR 0006, 0008, 0011, 0017 · Tất cả user story đợt 4B (48–108, 161–163 phần 4B)

**Model gợi ý:** Sonnet

## What to build

- Ba việc chốt đợt, theo mẫu [issue 63](63-phat-hanh-phase-3.md) và [issue 77](77-phat-hanh-dot-4a.md).
- **1. Rà giao diện 360px** toàn bộ giao diện mới của 4B: màn đào hồ và bảng hồ, câu cá, vợt ếch, màn đặt cây ăn trái, rung/nhặt/tỉa, thùng ong và máy quay mật, nhà tằm, 7 loài mới và chuồng mới, dắt thú cày, cưỡi ngựa, máy ấp, máng trứng lăn, máy gặt, bảng đơn việc. Không tràn ngang, nút ≥ 40px, `env(safe-area-inset-*)`, lớp nổi không đè nhau.
- **2. Cập nhật `SPEC.md`:** bảng loài mới và `PEN_TABLE` mới, API hồ cá, câu cá, cây ăn trái, mèo, ong, tằm, kéo cày, xe trâu, máy ấp, máy gắn cố định, đơn việc; bảng `data` mới; vai trò file mới; không mâu thuẫn PRD 0005 và ADR 0017–0020.
- **3. Kiểm tra local và ghi chú phát hành:** chạy hết unit và e2e (desktop + 360px), ghi số pass, ghi chú phát hành vào `docs/issues/README.md`. **Deploy, smoke live online do người điều phối làm**; agent chỉ kiểm tra local, không push, không deploy, không ssh lên VPS.

## Acceptance criteria

- [ ] E2E ở 360px mở từng bảng/màn mới của 4B không cuộn ngang, nút ≥ 40px, các lớp nổi không đè nhau.
- [ ] E2E giả lập tai thỏ: mọi nút mới trong vùng an toàn; ghi "chỉ giả lập" nếu chưa thử máy thật.
- [ ] `SPEC.md` khớp với code sau khi issue 78–93 xong.
- [ ] Unit và e2e pass hết trên máy local, ghi số test pass.
- [ ] Bản lưu v5 đã có từ đợt 4A vẫn nạp được, không mất gì khi thêm hệ thống mới (kiểm bằng fixture `v4-farm` đi qua chuỗi chuyển).
- [ ] Mọi issue 78–93 ở trạng thái ✅ trong `docs/issues/README.md`. Deploy và smoke live do người điều phối ghi sau.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [78](78-bang-so-lieu-dot-4b.md)
- [79](79-ho-ca.md)
- [80](80-cau-ca-song-lang-va-ech.md)
- [81](81-cay-an-trai-va-dau-tam.md)
- [82](82-soc-va-meo-co-tac-dung-ro.md)
- [83](83-ong-thung-ong-may-quay-mat.md)
- [84](84-tam-va-nha-tam.md)
- [85](85-tho-angora-va-ngong.md)
- [86](86-de-trau-keo-cay-va-xe-trau.md)
- [87](87-bo-cau-cong-va-ngua.md)
- [88](88-may-ap-3-cap.md)
- [89](89-mang-trung-lan-va-may-gat.md)
- [90](90-don-viec-cho-heo-cho-meo.md)
- [91](91-art-dot-4b-ho-ca-ech-cay-trai-soc-ong-tam.md)
- [92](92-art-dot-4b-7-loai-moi-chuong-may-ap-may-gan.md)
- [93](93-thong-bao-viec-can-lam-so-tay-dot-4b.md)
