# 30. Trộm: giới hạn, nhật ký, sang trộm lại

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0009, 0012 · DESIGN §6.1, §7.1 · User story 57–67

## What to build

Khách từ cấp 5 trộm được vườn bạn, nhưng luật luôn chừa lại phần lớn cho chủ. Lát này **chưa có chó canh** (issue 31): chó chưa phát hiện, trộm cứ thành công trong giới hạn.

- **Thao tác `steal` trong luật khách (`state.js`, ADR 0012):**
  - **Trộm được:** cây đã chín, trứng dưới đất, sữa và lông đang chờ lấy (và trái cây nếu vườn đã có).
  - **Không trộm được:** con vật, trái khổng lồ, đồ trong kho, trong nhà, cá. Thử trộm các thứ này bị từ chối với lý do.
  - **Bảo vệ người mới:** chủ dưới cấp 5 không bị trộm; khách dưới cấp 5 không đi trộm được. Lý do hiện rõ ("Vườn này còn quá nhỏ để trộm").
  - **Giới hạn:**
    - Mỗi ô hay mỗi con chỉ bị trộm tối đa **25%** sản lượng.
    - Mỗi người trộm **1 lần mỗi ô hay mỗi con**.
    - Mỗi vườn mỗi ngày ngoài đời mất tối đa **30% tổng giá trị đồ chín**.
  - **Giỏ đầy** thì không trộm thêm. **Trộm tốn thể lực** (bảng chi phí trong `data`, cùng cơ chế thể lực Phase 0), hết sức thì làm chậm như bình thường.
- **Nhật ký vườn:** mỗi vụ trộm ghi vào nhật ký khách của chủ (người trộm, món gì, bao nhiêu, mấy giờ), ví dụ *"Hùng đã trộm 3 cà chua lúc 2h sáng 😤"*. Chủ xem được trong bảng nhật ký ở vườn hoặc ở làng.
- **Nút "Sang trộm lại 😤":** trong dòng nhật ký, bấm là chủ đi thẳng (qua làng) tới vườn của kẻ trộm. Nếu kẻ trộm dưới cấp 5 hay vườn không trộm được thì nút mờ kèm lý do.
- **Trộm NPC nhường:** đêm nào đã có bạn sang trộm thì Thằng Tèo và các trộm NPC không tới vườn đó (luật trong `state.js`, tính theo thống kê trộm trong ngày).
- **Thông báo gấp:** chủ nhận thông báo 🔴 khi có trộm (cơ chế đẩy tới mọi bản đồ làm đầy đủ ở issue 32); lát này chỉ cần chủ đang ở vườn mình thấy.
- **Thống kê:** số lần trộm hôm nay (theo ngày ngoài đời) của khách và của vườn được ghi trong bản lưu để các giới hạn tính ra.
- **Giao diện:** trong vườn khách, bấm ô chín hiện nút **Trộm 😈** có chỉ ra số được lấy và còn bao nhiêu; hiển thị lý do khi bị chặn.

## Acceptance criteria

- [ ] Unit test (seam 1): trộm 1 ô chín chỉ lấy tối đa 25% sản lượng; người thứ hai trộm cùng ô khi là người khác vẫn được (nếu chưa chạm trần), còn cùng một người trộm lần hai cùng ô bị từ chối.
- [ ] Unit test (seam 1): tổng giá trị đã bị trộm trong một ngày ngoài đời chạm 30% thì các vụ trộm tiếp theo trong ngày bị từ chối; sang ngày mới thì trộm lại được.
- [ ] Unit test (seam 1): chủ dưới cấp 5 không bị trộm; khách dưới cấp 5 không trộm được; cả hai trả đúng lý do.
- [ ] Unit test (seam 1): trộm con vật, trái khổng lồ, đồ trong kho/nhà, cá đều bị từ chối.
- [ ] Unit test (seam 1): giỏ đầy thì từ chối; trộm trừ đúng thể lực theo bảng.
- [ ] Unit test (seam 1): đêm có vụ trộm của người chơi thì trộm NPC không tới; đêm không có thì tính theo luật cũ.
- [ ] Unit test (seam 3): vụ trộm hợp lệ được nhận, vào hàng đợi, đẩy tới chủ online, ghi nhật ký; áp dụng hai lần cùng mã chỉ tính một lần; vụ vượt giới hạn bị từ chối đúng lý do.
- [ ] Unit test (seam 3): bản lưu của khách báo xu tăng quá mức so với các vụ trộm đã được nhận (vượt giới hạn) bị từ chối (chống gian lận nhẹ).
- [ ] E2E (Playwright, 2 trình duyệt, desktop + 360px): B (cấp ≥ 5) sang vườn A (cấp ≥ 5, có ô cà chua chín dựng bằng bản lưu ghi sẵn) → trộm → B có cà chua trong giỏ, ô của A còn lại phần lớn; B thử trộm lần hai cùng ô thấy lý do bị chặn.
- [ ] E2E: A mở nhật ký thấy dòng "B đã trộm ... lúc ..." → bấm "Sang trộm lại 😤" → A đi qua làng vào đúng vườn B.
- [ ] E2E: vườn A cấp dưới 5 → B không thấy nút Trộm hoạt động, có lý do.

## Blocked by

- [28](28-giup-vuon-ban.md)
