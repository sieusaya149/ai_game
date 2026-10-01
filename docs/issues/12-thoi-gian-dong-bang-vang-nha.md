# 12. Thời gian: đóng băng và màn "Trong lúc bạn vắng nhà"

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · ADR 0003 · User story 53–57

## What to build

- **Đồng hồ trừu tượng hóa:** offline thì dùng đồng hồ local, kèm tốc độ x1/x5/x20. Phase 1 sẽ thay bằng đồng hồ server mà không đổi luật chơi.
- **Chạy bù tối đa 8 tiếng.** Phần vắng vượt quá thì không chạy, và ghi lại khoảng đóng băng.
- **Bộ đếm "giờ vườn đã chạy"** chỉ tăng khi mô phỏng thật sự chạy (kể cả lúc chạy bù). Phase 2 sẽ dùng nó để tính tuổi con vật.
- **Ghi sự kiện lúc vắng:** trong lúc chạy bù, luật chơi ghi lại các sự kiện: cây chín, cây héo, trứng mới, con vật đói hay bệnh, quạ, trộm, chó đuổi trộm, thùng giao hàng.
- **Màn "Trong lúc bạn vắng nhà…"** khi mở lại game: tóm tắt gộp các sự kiện đó, và cho biết vườn đã đóng băng bao lâu nếu vắng quá 8 tiếng.
- **Mùa trên HUD:** Xuân, Hạ, Thu, Đông, mỗi mùa 7 ngày game. Chỉ hiển thị, chưa ảnh hưởng gì.
- **Tiện ích "ngày ngoài đời hiện tại"** cho nhiệm vụ hằng ngày sau này.

## Acceptance criteria

- [ ] Unit test: vắng 3 tiếng thì chạy đủ 3 tiếng. Vắng 12 tiếng thì chỉ chạy 8 tiếng và ghi đóng băng 4 tiếng. Bộ đếm giờ vườn tăng đúng. Mùa đổi sau mỗi 7 ngày.
- [ ] Unit test: tóm tắt gộp đúng ("5 ô cà chua đã chín").
- [ ] E2E: lùi `savedAt` 12 tiếng → thấy màn tóm tắt có dòng đóng băng → đóng lại được → HUD có mùa.

## Blocked by

- [02](02-ban-luu-v2.md)
