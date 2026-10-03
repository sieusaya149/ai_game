# Phase 4 gộp với Phase 6, phát hành thành ba đợt, mỗi đợt có bảng số liệu duyệt trước

Phase 4 (kinh tế và làng) và Phase 6 (loài và khu mới) gộp thành một phase: **Phase 4 — Kinh tế, làng và loài mới**. Lý do gộp: ong cần máy quay mật, tằm cần khung dệt và máy may, cá và trái cây cần kho, đồ hư, kho lạnh và sức mua của chợ mới có ý nghĩa. Làm riêng thì một bên phải làm tạm rồi nối lại sau.

Phase gộp khoảng 45–50 issue, gấp 3 lần Phase 3, nên chia thành **ba đợt, mỗi đợt tự phát hành** (unit + e2e liên quan, deploy, smoke live):

1. **4A — Kinh tế và sản xuất:** bản lưu v5, kho 3 cấp, đồ hư, kho lạnh, sức mua, được mùa/mất mùa, hộp thư và hóa đơn tháng, máy chế biến, hao mòn và sửa chữa, bếp.
2. **4B — Loài và khu mới:** hồ cá, câu cá, cây ăn trái, ong, tằm, 7 loài còn lại, máy ấp, máy gắn cố định, mèo, đơn việc.
3. **4C — Làng:** cư dân ❤️, Tiếng tăm ⭐, nhân công, hội chợ, chợ phiên, livestream, mùa dịch, hợp tác xã, mã giảm giá, xe hàng rong, sự kiện diệt chuột/rắn/sâu.

Thứ tự này theo luật **chỗ hút xu ra cùng lúc hoặc trước nguồn thu mới**: máy chế biến bán ×1,5–2 và loài mới là nguồn thu, nên sức mua, đồ hư, hóa đơn và hao mòn phải lên server trước.

Mỗi đợt mở đầu bằng **một bảng số liệu** (giá mua/bán, thời gian, cấp mở, điện, sức chứa) trong `docs/proposals/`, theo khung cân bằng tối 03/10 (3 nhịp "đang chơi / ghé lại / trồng rồi đi", nâng cấp ×2,5–4, giá mua con > giá bán). Chủ game duyệt bảng xong mới giao issue code. Code đọc số từ `data.js`, không rải số trong luật.

Pixel art mỗi đợt là **issue ART riêng do agent Opus vẽ**, chạy song song ngay đầu đợt với tên sprite đã hẹn trong PRD. Issue code dùng hình tạm có sẵn rồi nối art thật khi gộp. Khi phát hành không bao giờ dùng chung hình giai đoạn giữa các loài.

## Considered Options

- **Một lần phát hành cuối phase:** người chơi online chờ rất lâu, và lần gộp cuối rủi ro như lần gộp `phase2` (18 file xung đột).
- **Ra nội dung loài trước, kinh tế sau:** người chơi háo hức hơn, nhưng xu lạm phát ngay trên server thật.
- **Agent tự đặt số rồi cân sau (như Phase 3):** nhanh hơn nhưng phải làm lại số, và người chơi thật thấy số đổi qua lại.

## Consequences

- Không đánh số lại: Phase 5 (Nhà) và Phase 7 (Mục tiêu dài hạn) giữ số; Phase 6 ghi "gộp vào Phase 4".
- Luật "xong dứt điểm phase rồi mới sang phase sau" áp cho cả Phase 4; ba đợt nằm trong phase. Phase 4 chỉ xong khi đợt 4C đã deploy và smoke live pass.
- Mỗi đợt có issue "Thông báo và hướng dẫn" và issue "Phát hành" riêng.
