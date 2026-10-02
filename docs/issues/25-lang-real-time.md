# 25. Làng real-time: thấy nhau, chat nhanh, biểu cảm

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0007, 0011 · User story 27–35

## What to build

Làng có người thật đi lại. Chợ Bà Tư và tiệm rèn Ông Sáu của Phase 0 vẫn y như cũ.

- **Hiện diện theo bản đồ:** mỗi kết nối WebSocket thuộc một bản đồ (lúc này là làng; issue 27 thêm vườn của từng người). Server chỉ phát cho người cùng bản đồ.
- **Vị trí 6 lần mỗi giây** (con số đã chốt, chỉnh được khi thử với nhóm thật). Trình duyệt nhận vị trí rồi **nội suy** để nhân vật người khác đi mượt kể cả khi mạng chậm hay mất vài gói.
- **Thấy tên và ngoại hình:** mỗi người khác hiện tên và ngoại hình (mũ, áo) theo bản lưu của họ, vẽ lại bằng bộ sprite nhân vật hiện có.
- **Bong bóng chat nhanh:** vài câu có sẵn (chào hỏi, cảm ơn, hẹn gặp...) bấm là hiện bong bóng trên đầu nhân vật vài giây.
- **Biểu cảm 👋 ❤️ 😂 😡:** một hàng nút nhỏ, bấm là hiện biểu cảm bay lên đầu nhân vật. Dùng được bằng một ngón tay trên điện thoại.
- **Chat chỉ hiện với người cùng bản đồ**, nên ở làng thì người trong vườn không nhận được.
- **Làng đông:** quá 12 người thì người ở xa chỉ hiện **tên mờ** thay vì cả nhân vật (số 12 là con số đã chốt, chỉnh được). Người ở gần vẫn đầy đủ.
- **Danh sách người đang online:** nút mở bảng liệt kê người đang ở trong làng (tên, cấp). Chưa có nút kết bạn hay thăm vườn, hai việc đó thuộc issue 26 và 27.
- **Chợ Bà Tư, tiệm rèn Ông Sáu, thùng giao hàng** hoạt động y như Phase 0 khi online.
- **Pixel art mới:** biểu tượng biểu cảm và khung bong bóng chat nếu bộ hiện có chưa đủ. Danh sách sprite cần vẽ: bong bóng chat (khung 9 ô có đuôi), 4 biểu cảm 👋 ❤️ 😂 😡 dạng pixel, biểu tượng người chơi trong danh sách online. **Pixel art do agent Opus vẽ.**

## Acceptance criteria

- [x] Unit test (seam 3): hai kết nối cùng bản đồ làng nhận được vị trí của nhau; kết nối ở bản đồ khác (dựng bằng chọn bản đồ khác lúc kết nối) không nhận gì.
- [x] Unit test (seam 3): tần suất vị trí server phát không vượt quá 6 lần mỗi giây cho mỗi người gửi, dù người đó gửi dồn dập.
- [x] Unit test (seam 3): chat nhanh và biểu cảm chỉ đến người cùng bản đồ; chuỗi lạ ngoài danh sách câu cho phép bị từ chối.
- [x] Unit test (seam 3): rớt WebSocket rồi tự kết nối lại → vào lại làng, nhận lại vị trí của người khác.
- [x] Unit test (seam 1): hàm chọn ai hiện đầy đủ, ai hiện tên mờ khi làng quá 12 người, theo khoảng cách tới người xem.
- [x] E2E (Playwright, 2 trình duyệt, desktop + 360px): hai người cùng vào làng → mỗi bên thấy tên và nhân vật bên kia; một bên đi thì bên kia thấy di chuyển mượt (vị trí đổi liên tục chứ không nhảy); một bên bấm câu chat thì bên kia thấy bong bóng; bấm 😂 thì bên kia thấy biểu cảm.
- [x] E2E: hai người ở hai bản đồ khác nhau (một ở làng, một ở trong nhà) không thấy chat của nhau.
- [x] E2E: mua một hạt giống ở chợ Bà Tư khi online vẫn được như cũ.
- [x] Thanh chat và hàng biểu cảm không đè joystick, nút hành động và bản đồ nhỏ ở 360px. (kiểm bằng e2e 360px giả lập, chưa thử máy thật)

## Blocked by

- [22](22-vuon-online-va-mot-thiet-bi.md)
