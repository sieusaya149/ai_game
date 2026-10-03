# 70. Khung máy chế biến: cối xay và hũ muối dưa

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §3.3c · ADR 0005, 0018 · User story 29–33, 37, 38

**Model gợi ý:** Sonnet

## What to build

- **Một khung chung cho mọi máy chế biến** (PRD, Implementation Decisions): máy là một kiểu công trình đặt bằng `canPlace` (ADR 0005), có bảng công thức trong `data.js` (đầu vào, đầu ra, thời gian, điện, cấp mở), hàng chờ 2/4/6 lượt theo cấp máy: bỏ nguyên liệu vào, chờ, lấy thành phẩm. Thêm máy sau này chỉ là thêm dòng dữ liệu và sprite.
- Máy chạy theo giờ vườn như mọi luật khác, **chạy cả lúc offline** (chạy bù trình duyệt và server). Tốn điện (ghi vào đồng hồ điện của issue 69). **Cắt điện thì dừng giữa chừng, có điện lại thì chạy tiếp, không mất nguyên liệu.** Nguyên liệu lấy qua API kho chung (lô gần hư trước); thành phẩm không hư, có giá chợ riêng, bán ×1,5–2 giá nguyên liệu, đi qua hàm giá của issue 67.
- Máy mở dần theo cấp người chơi. Hai máy đầu để chứng minh khung: **cối xay** (cấp 4: lúa → gạo, bắp → bột bắp) và **hũ muối dưa** (cấp 5: cải, dưa leo, su hào → dưa muối). Số liệu: lấy từ bảng số liệu đợt (issue 64).
- **UI:** bảng máy (chọn công thức, số lượt trong hàng chờ, thanh tiến độ, nút Lấy hàng), icon máy đang chạy/dừng. Dùng hình tạm (khối màu, icon chữ) tới khi issue ART đợt này gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): `canPlace` máy; hàng chờ đúng 2/4/6 theo cấp; bỏ nguyên liệu thì trừ kho, hết thời gian thì có thành phẩm; thành phẩm không hư, giá chợ riêng.
- [ ] Unit test: máy chạy khi `catchUp` (thời gian offline); cắt điện thì dừng và chạy tiếp khi có điện, không mất nguyên liệu; máy mở đúng cấp.
- [ ] Unit test (seam 3): server chạy bù vườn có cối xay đang chạy cho cùng thành phẩm như trình duyệt.
- [ ] E2E (desktop + 360px): bản lưu có lúa và cối xay, bỏ lúa vào, tua thời gian, lấy gạo ra bán; hũ muối dưa tương tự.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [65](65-ban-luu-v5-kho-theo-lo.md)
- [69](69-hop-thu-va-hoa-don-thang.md)
