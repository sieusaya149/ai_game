# 17. Rà soát giao diện điện thoại 360px

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · User story 23, 68

## What to build

Rà toàn bộ giao diện mới của Phase 0 trên màn hình 360px và trên máy có tai thỏ:
- Chế độ xây dựng (danh sách công trình, nút Xong/Hủy).
- Chợ làng, tiệm rèn, thùng giao hàng.
- Bảng Việc cần làm, bản đồ nhỏ.
- Màn "Trong lúc bạn vắng nhà", Sổ tay.
- HUD có thêm thể lực, giỏ và mùa.

Yêu cầu:
- Không có gì tràn ngang.
- Nút đủ to để bấm.
- Tránh vùng tai thỏ bằng `env(safe-area-inset-*)`.
- Joystick và nút hành động không che bản đồ nhỏ.

## Acceptance criteria

- [ ] E2E ở cỡ 360px mở từng bảng trên và kiểm tra không có cuộn ngang (chiều rộng nội dung ≤ chiều rộng màn hình).
- [ ] Thử tay trên một điện thoại thật có tai thỏ: HUD và nút không bị che.

## Blocked by

- [03](03-che-do-xay-dung-doi-cong-trinh.md)
- [07](07-lang-va-cho-ba-tu.md)
- [08](08-thung-giao-hang.md)
- [10](10-cong-cu-va-tiem-ren.md)
- [14](14-viec-can-lam-va-ban-do-nho.md)
- [16](16-huong-dan-va-so-tay.md)
