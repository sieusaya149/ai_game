# 28. Giúp vườn bạn: luật khách và hàng đợi thao tác

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0002, 0011, 0012 · User story 49–53

## What to build

Lát đầu tiên của ADR 0012: thao tác của khách là hàm thuần trong `state.js`, server chỉ kiểm tra và xếp hàng. Lấy việc **giúp** làm tracer bullet cho cả cơ chế.

- **Hàm luật khách trong `state.js`:** hàm thuần nhận bản lưu chủ, thông tin khách (tên, cấp, đã làm gì hôm nay) và thao tác, trả về kết quả hoặc **lý do từ chối**. Lát này mới có thao tác `help`. Các thao tác `gift`, `steal`, `pet`, `sausage` thêm vào các issue sau cùng hàm này.
- **Việc giúp:** tưới, nhổ cỏ, bắt sâu, đuổi quạ. Mỗi việc kiểm tra theo trạng thái thật của ô hay của quạ (không có gì để giúp thì từ chối). Khách nhận **ít xu và EXP** mỗi việc.
- **Giới hạn:** mỗi vườn mỗi ngày ngoài đời nhận tối đa **10 việc giúp**. Hết lượt thì khách thấy lý do **"Vườn này hôm nay đã được giúp đủ"**, nút giúp mờ đi để khỏi bấm hoài.
- **Hàng đợi thao tác (ADR 0012):**
  - Mỗi thao tác có **mã duy nhất**. Server gọi đúng hàm luật trên bản lưu mới nhất để kiểm tra, ghi vào hàng đợi, rồi đẩy sang trình duyệt chủ nếu chủ online. Trình duyệt chủ áp dụng bằng cùng hàm đó.
  - **Áp dụng hai lần cùng mã thì lần sau không làm gì.**
  - Chủ offline thì server chạy bù (issue 24) rồi áp dụng hàng đợi ngay trên bản lưu đó và lưu lại.
  - Xung đột hiếm (khách tưới ô mà chủ vừa tưới) thì hàm trả "không còn gì để làm". Khách không nhận thưởng, không có lỗi.
- **Cảm ơn:** chủ vườn nhận thông báo 🟡 gộp kiểu **"Lan đã tưới 3 ô giúp bạn"** (khóa gộp theo người và loại việc).
- **Thưởng của khách:** xu và EXP vào bản lưu của khách khi thao tác được chấp nhận.
- **Giao diện:** trong vườn khách, bấm ô cần giúp hiện các nút tưới / nhổ cỏ / bắt sâu / đuổi quạ phù hợp, có bộ đếm "còn x lượt giúp hôm nay".

## Acceptance criteria

- [x] Unit test (seam 1): `help` trên ô khô thì được (ô được tưới, khách có thưởng); trên ô đã tưới thì từ chối "không còn gì để làm"; nhổ cỏ, bắt sâu, đuổi quạ cũng kiểm đúng theo trạng thái.
- [x] Unit test (seam 1): sau 10 việc giúp trong cùng ngày ngoài đời, việc thứ 11 bị từ chối với lý do "đã được giúp đủ"; sang ngày ngoài đời mới thì giúp lại được.
- [x] Unit test (seam 1): áp dụng hai lần cùng một mã thao tác chỉ tính một lần.
- [x] Unit test (seam 1): sự kiện cảm ơn của nhiều thao tác cùng loại từ cùng một người có cùng khóa gộp.
- [x] Unit test (seam 3): thao tác hợp lệ được nhận, vào hàng đợi, và đẩy tới chủ đang online qua WebSocket; thao tác bị luật từ chối thì trả đúng lý do và không vào hàng đợi.
- [x] Unit test (seam 3): chủ offline (`savedAt` lùi vài tiếng) → khách giúp → đọc lại vườn thấy ô đã được tưới, chạy bù chỉ chạy một lần, thao tác không áp dụng lặp lại khi chủ đăng nhập vào. (Việc giúp dùng *nhổ cỏ*: sau 3 tiếng chạy bù, cây có thể chín hay chết nên không còn tưới được — e2e vẫn kiểm đúng việc tưới khi chủ vắng ngắn.)
- [x] Unit test (seam 3): chủ online vừa tự tưới ô rồi khách tưới cùng ô → kết quả "không còn gì để làm", không lỗi, khách không nhận thưởng.
- [x] E2E (Playwright, 2 trình duyệt, desktop + 360px): B sang vườn A có ô khô → tưới giúp → B thấy xu và EXP tăng, A đang online thấy ô được tưới và thông báo cảm ơn có tên B.
- [x] E2E: B giúp đủ 10 việc rồi thử việc thứ 11 → thấy lý do "Vườn này hôm nay đã được giúp đủ" và nút giúp mờ. (Dựng bằng bản lưu ghi sẵn `today.helps = 10` thay vì bấm 10 lần cho e2e khỏi chạy lâu; mốc 10 có test seam 1 và seam 3.)
- [x] E2E: A offline, B giúp, rồi A đăng nhập lại → thấy ô đã được tưới và thông báo cảm ơn có tên B. (Màn "Trong lúc bạn vắng nhà…" thêm việc của khách ở issue 32.)

## Blocked by

- [27](27-tham-vuon-ban.md)
