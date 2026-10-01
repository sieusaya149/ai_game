# 32. Vắng nhà, thông báo và thành tựu xã hội

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0002, 0012 · User story 26, 40, 78–82

## What to build

Gói các việc khách làm lại cho chủ vườn: thấy khi về, nhận ngay khi đang bận chỗ khác, và có mục tiêu để theo đuổi.

- **Màn "Trong lúc bạn vắng nhà…" mở rộng:** ngoài cây chín, đồ làm xong của Phase 0, màn này nhận thêm sự kiện từ hàng đợi khách trong lúc chủ offline:
  - ai **giúp** (và giúp mấy việc),
  - ai **trộm** (món gì, bao nhiêu),
  - **quà** và lời nhắn mới ở cổng,
  - **chó đuổi được bao nhiêu người**.
- **Thông báo 3 mức cho sự kiện xã hội:**
  - **🔴 Gấp:** có trộm trong vườn mình hoặc chó sủa — hiện ở **mọi bản đồ** (đang ở làng, trong nhà, hay vườn bạn khác), kèm mũi tên khi chỗ đó nằm ngoài khung nhìn, hoặc nút "Về vườn" nếu ở ngoài vườn.
  - **🟡 Quan trọng:** bạn bè ghé, lời cảm ơn khi được giúp, quà và lời nhắn sổ lưu bút. Gộp theo khóa (người và loại việc).
  - **⚪ Thông tin:** các sự kiện lặt vặt chỉ ghi vào nhật ký.
  - Mọi loại sự kiện mới đều có mức và khóa gộp (như issue 13). Thông báo gấp không tắt được, thông báo 🟡 tắt được từng loại trong cài đặt.
- **Thành tựu xã hội (tiến độ lưu trong bản lưu):**
  - **"Hàng xóm tốt bụng":** giúp 50 lần.
  - **"Siêu trộm":** trộm 30 lần **không bị chó đớp** (bị đớp thì chuỗi về 0).
  - **"Vườn bất khả xâm phạm":** chó đuổi được 20 kẻ trộm.
  - Mở khóa thì có thông báo 🟡 và hiện trong danh sách thành tựu sẵn có của game; có thanh tiến độ.
- **Pixel art mới:** huy hiệu cho 3 thành tựu. Danh sách sprite cần vẽ: huy hiệu "Hàng xóm tốt bụng" (bàn tay giúp), "Siêu trộm" (mặt nạ), "Vườn bất khả xâm phạm" (khiên có dấu chân chó), mỗi cái khóa và mở. **Pixel art do agent Opus vẽ.**

## Acceptance criteria

- [ ] Unit test (seam 1): mọi loại sự kiện xã hội mới đều có mức và khóa gộp (một test đi qua hết danh sách loại sự kiện, như issue 13).
- [ ] Unit test (seam 1): trộm và chó sủa là mức 🔴; ghé thăm, cảm ơn, quà, lời nhắn là 🟡; hai thao tác giúp liên tiếp của cùng một người gộp thành một thông báo.
- [ ] Unit test (seam 1): thành tựu "Hàng xóm tốt bụng" mở ở lần giúp thứ 50, không mở ở 49; "Siêu trộm" mở ở lần trộm thứ 30 liền không bị đớp, và bị đớp ở lần thứ 20 thì phải đếm lại từ 0; "Vườn bất khả xâm phạm" mở khi chó đuổi người thứ 20.
- [ ] Unit test (seam 1): báo cáo vắng nhà tổng hợp đúng số việc giúp, số vụ trộm (và món), quà, và số người chó đuổi từ hàng đợi khách; khi không có sự kiện nào thì không in mục đó.
- [ ] Unit test (seam 3): sự kiện 🔴 được đẩy tới chủ đang ở **bản đồ khác** (dựng bằng chủ đang ở bản đồ làng) nhờ kênh riêng theo người chứ không theo bản đồ.
- [ ] E2E (Playwright, 2 trình duyệt, desktop + 360px): A đang ở làng, B trộm vườn A → A thấy băng rôn đỏ và nút "Về vườn" ngay ở làng.
- [ ] E2E: A offline, B giúp 2 việc, trộm 1 ô, bị chó đuổi một lần, để lại một quà → A đăng nhập thấy màn "Trong lúc bạn vắng nhà…" liệt kê đủ bốn nhóm với số đúng.
- [ ] E2E: tắt thông báo 🟡 loại "bạn bè ghé" trong cài đặt thì không còn thấy; thông báo gấp không có công tắc tắt.
- [ ] E2E: dựng bản lưu giúp 49 lần → giúp thêm 1 lần → thấy thông báo mở thành tựu "Hàng xóm tốt bụng".
- [ ] Màn vắng nhà dài hơn không tràn ngang, cuộn được trên 360px.

## Blocked by

- [29](29-qua-va-so-luu-but.md)
- [31](31-cho-muc-canh-khach.md)
