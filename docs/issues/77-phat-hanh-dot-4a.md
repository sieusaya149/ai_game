# 77. Rà 360px, cập nhật SPEC.md và phát hành đợt 4A

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · ADR 0006, 0008, 0011, 0017 · Tất cả user story đợt 4A (1–47, 161–164 phần 4A)

**Model gợi ý:** Sonnet

## What to build

- Ba việc chốt đợt, theo mẫu [issue 63](63-phat-hanh-phase-3.md).
- **1. Rà giao diện điện thoại 360px** toàn bộ giao diện mới của 4A: kho và thanh sức chứa, viền hư, kho lạnh, giá hôm nay và mũi tên, hộp thư và hóa đơn, bảng máy chế biến, cờ lê vàng và màn sửa, bếp và sổ công thức, banner cắt điện. Không tràn ngang, nút ≥ 40px, tránh tai thỏ bằng `env(safe-area-inset-*)`, các lớp nổi không đè nhau.
- **2. Cập nhật `SPEC.md`:** hình dạng bản lưu v5 và bước chuyển v4→v5 (và cách thêm bước chuyển kế tiếp); API công khai mới (kho theo lô, kho lạnh, sức mua, module lịch sự kiện, hóa đơn, cắt điện, khung máy chế biến, hao mòn và sửa, bếp); vai trò file mới và bảng `data` mới; cách dựng tình huống bằng fixture `v4-farm`, `v4-fresh` và hạt giống cố định; không mâu thuẫn với PRD 0005 và ADR 0017–0020.
- **3. Kiểm tra local và ghi chú phát hành:** chạy hết unit test và e2e (desktop + 360px) một lần trên máy local, ghi số test pass, ghi ghi chú phát hành ngắn vào `docs/issues/README.md`. **Deploy, smoke live online và mã mời do người điều phối làm** theo luật deploy của repo; agent làm issue này chỉ kiểm tra local, không push, không deploy, không ssh lên VPS.

## Acceptance criteria

- [ ] E2E ở 360px mở từng bảng/màn mới của 4A, không cuộn ngang, nút trong màn hình và ≥ 40px, các lớp nổi không đè nhau.
- [ ] E2E giả lập tai thỏ: mọi nút mới nằm trong vùng an toàn; ghi rõ "chỉ giả lập" nếu chưa thử máy thật.
- [ ] `SPEC.md` khớp với code sau khi issue 64–76 xong; một agent mới chỉ đọc `SPEC.md` biết file nào sửa, gọi API nào, test ở đâu cho hệ thống 4A.
- [ ] Unit và e2e pass hết trên máy local, ghi lại số test pass (đây là lần duy nhất của đợt chạy cả bộ).
- [ ] Vườn `v4-farm` chuyển sang v5 không mất gì (đã kiểm bằng fixture; bản lưu thật của chủ game ghi "chờ chủ game").
- [ ] Mọi issue 64–76 ở trạng thái ✅ trong `docs/issues/README.md`. Việc deploy và smoke live do người điều phối ghi sau.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [64](64-bang-so-lieu-dot-4a.md)
- [65](65-ban-luu-v5-kho-theo-lo.md)
- [66](66-kho-3-cap-va-kho-lanh.md)
- [67](67-suc-mua-cua-cho.md)
- [68](68-lich-su-kien-lang-duoc-mua-mat-mua.md)
- [69](69-hop-thu-va-hoa-don-thang.md)
- [70](70-khung-may-che-bien-coi-xay-hu-muoi-dua.md)
- [71](71-may-pho-mai-khung-det-may-ep-dau-noi-xa-phong-may-may.md)
- [72](72-may-tron-cam.md)
- [73](73-hao-mon-va-sua-chua.md)
- [74](74-bep-va-so-cong-thuc.md)
- [75](75-art-dot-4a.md)
- [76](76-thong-bao-viec-can-lam-so-tay-dot-4a.md)
