# 103. Livestream bán hàng

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.6 (Livestream) · ADR 0020 · User story 145–150

**Model gợi ý:** Sonnet

## What to build

- **Từ cấp 5**, mỗi lần tối đa **30 phút**, tối đa **3 lần mỗi ngày thật**. **Độ hot 🔥** tăng khi làm việc thật trước người xem và khi trả lời đúng câu hỏi người xem. **Giỏ live 6 món**, giá 50%–200% giá gốc, bán theo ADR 0020 (dùng lại luật mua của issue 102). **Người xem NPC** đông theo độ hot và uy tín 🏪. Số liệu: lấy từ bảng số liệu đợt (issue 95).
- **Người xem vào vườn bằng đường thăm vườn đang có** (issue 26–28), thêm trạng thái "đang live" ở cổng và danh sách bạn bè; xem thả ❤️, chat câu có sẵn, bấm mua. **Xem đủ 3 phút được mã giảm giá**, tối đa 3 mã mỗi ngày: issue này đếm thời gian xem và phát sự kiện, cấp mã bằng API của issue 106 (nếu 106 chưa gộp thì issue gộp sau nối).
- Độ hot và người xem NPC là luật trong bản lưu người live. **UI:** nút Lên live, khung live, bình luận. Hình tạm tới khi issue ART 109/110 gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): giới hạn 30 phút và 3 lần/ngày thật; độ hot tăng/giảm theo bảng; giỏ live 6 món, giá 50–200%; người xem NPC theo độ hot và 🏪; hết live thì hàng chưa bán về kho.
- [ ] Unit test (seam 3): người xem vào vườn đang live, mua trong giỏ live theo ADR 0020 (mã duy nhất, không mất xu khi hết hàng); đếm xem đủ 3 phút và tối đa 3 mã/ngày.
- [ ] E2E (desktop + 360px, **hai trình duyệt**): người một lên live, người hai vào xem, thả ❤️, mua một món, thấy độ hot đổi.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [102](102-cho-phien-va-uy-tin-shop.md)
