# 76. Thông báo, việc cần làm và sổ tay đợt 4A

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8c · ADR 0004, 0018 · User story 161–163 (phần 4A)

**Model gợi ý:** Sonnet

## What to build

- **Thông báo** đúng mức (3 mức của issue 13) cho: đồ sắp hư, kho đầy, hóa đơn tới, sắp cắt điện và đã cắt điện, máy xong hàng, máy sắp hỏng, bán vượt sức mua, sự kiện được mùa/mất mùa. Có khóa gộp để không dội thông báo khi chạy bù.
- **Việc cần làm** có thêm: lấy hàng ở máy, trả hóa đơn, sửa máy dưới 30%, bán hoặc chế biến đồ sắp hư.
- **Sổ tay** thêm trang cho kho và đồ hư, giá chợ và sức mua, hóa đơn và cắt điện, máy chế biến, hao mòn, bếp. Hướng dẫn mở dần: mỗi hệ thống hiện ở lần đầu người chơi gặp nó.
- Dùng hình tạm (khối màu, icon chữ) tới khi issue ART đợt này gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): mỗi sự kiện mới có mức thông báo và khóa gộp đúng; `todoList` trả đúng các loại việc mới theo trạng thái bản lưu.
- [ ] E2E (desktop + 360px): bản lưu có máy xong hàng, hóa đơn mới, đồ sắp hư thì thấy thông báo và việc cần làm; sổ tay mở được các trang mới.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [66](66-kho-3-cap-va-kho-lanh.md)
- [67](67-suc-mua-cua-cho.md)
- [68](68-lich-su-kien-lang-duoc-mua-mat-mua.md)
- [69](69-hop-thu-va-hoa-don-thang.md)
- [70](70-khung-may-che-bien-coi-xay-hu-muoi-dua.md)
- [71](71-may-pho-mai-khung-det-may-ep-dau-noi-xa-phong-may-may.md)
- [72](72-may-tron-cam.md)
- [73](73-hao-mon-va-sua-chua.md)
- [74](74-bep-va-so-cong-thuc.md)
