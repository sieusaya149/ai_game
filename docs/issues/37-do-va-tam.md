# 37. Dơ và tắm, xà phòng, dọn chuồng

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0003, 0008 · User story 25–35

## What to build

- **Độ dơ 0–100** cho mỗi con (gà, vịt, heo, bò, cừu): tăng dần theo giờ vườn chạy, **từ sạch tới dơ hẳn khoảng 3 giờ**. **Trời mưa hoặc chuồng bẩn thì dơ nhanh gấp đôi** (thời tiết đọc từ luật thời tiết đã có).
- **Hậu quả khi dơ:** mất vui, dễ bệnh hơn (nguy cơ bệnh là đầu vào của lát 38), sản phẩm kém chất lượng. Dơ hiện bằng **vệt bùn và ruồi bay quanh**.
- **Heo và bò đầm bùn:** dơ ngay lập tức nhưng **không mất vui**, chỉ tăng nguy cơ bệnh. Heo tắm xong một lúc lại lăn bùn (nét vui, không làm heo dơ quá nhanh). Vũng bùn ở chuồng heo cấp 3 là chỗ lăn.
- **Hành động "Tắm"** trên con vật: tốn **1 lần nước trong bình tưới và 1 cục xà phòng**. Kết quả: độ dơ về 0, **+15 vui**, độ thân tăng nhẹ (số cụ thể chốt cùng lát 39, ở đây chỉ ghi nhận sự kiện "đã tắm"). Từ chối kèm lý do khi hết nước hoặc không có xà phòng.
- **Hoạt cảnh tắm:** bọt xà phòng phủ lên, con vật lắc mình văng giọt nước, rồi lấp lánh sạch.
- **Xà phòng:** thêm vật phẩm bán ở chợ Bà Tư (vào giỏ và kho).
- **Ổ cát:** chuồng gia cầm cấp 3 có ổ cát, gà vịt tự tắm cát nên không cần tắm tay (chỉ giữ độ dơ thấp, không thay thế hoàn toàn khi mưa).
- **Dọn chuồng:** phân chuồng tích dần theo giờ vườn, chuồng bẩn khi phân đầy (đầu vào cho "dơ ×2"). Hành động **xúc phân** làm chuồng sạch và nhận **phân chuồng** cất vào kho (hố ủ phân ở Phase 3, chưa dùng).
- **Việc cần làm:** (hoàn thiện ở lát 48) lát này chỉ cần luật trả ra danh sách con dơ và chuồng bẩn.
- **Pixel art do agent Opus vẽ:** lớp phủ vệt bùn và ruồi (cho gà, heo, bò, cừu, mọi giai đoạn), trạng thái ướt có bọt xà phòng, giọt nước văng, lấp lánh sạch, heo lăn bùn, ổ cát, đống phân chuồng, vật phẩm xà phòng.

## Acceptance criteria

- [ ] Unit test (seam 1): độ dơ tăng từ 0 tới 100 trong khoảng 3 giờ vườn; nhanh gấp đôi khi mưa và khi chuồng bẩn; không tăng khi vườn đóng băng; heo đầm bùn dơ ngay mà vui không giảm.
- [ ] Unit test: tắm trừ đúng 1 nước và 1 xà phòng, đặt dơ về 0, vui +15, phát sự kiện "đã tắm"; bị từ chối khi thiếu nước hay thiếu xà phòng; con dơ thì mất vui và nguy cơ bệnh tăng.
- [ ] Unit test: xúc phân làm chuồng hết bẩn và cộng phân chuồng vào kho; ổ ở chuồng gia cầm cấp 3 giữ dơ gà vịt thấp.
- [ ] E2E (Playwright, desktop + 360px): dựng bản lưu có heo dơ → mua xà phòng ở chợ Bà Tư → tắm → thấy bọt, rồi heo lắc mình, rồi sạch lấp lánh; xúc phân ở chuồng bẩn.
- [ ] Pixel art vệt bùn, ruồi, bọt xà phòng và lấp lánh có đủ.

## Blocked by

- [34](34-ban-luu-v3-vong-doi.md)
