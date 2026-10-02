# 31. Chó Mực canh khách: phát hiện, đuổi, xúc xích, xích/thả

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0012, 0013 · DESIGN §6.1 · User story 68–78

## What to build

Vườn có chó thì kẻ trộm phải dè chừng. Dùng chó con / trưởng thành hiện có; vòng đời chó đầy đủ và lệnh "Canh khu" thuộc Phase 2.

- **Luật phát hiện khách (`state.js`, seam 1):**
  - **Bán kính:** chó con 4 ô, trưởng thành 6 ô.
  - **Vui dưới 50** thì bán kính giảm một nửa. **Đói dưới 30** thì không canh.
  - **Ngủ gật** khoảng 30% thời gian ban đêm, hiện 💤; lúc ngủ chỉ phát hiện khách đứng **sát bên (1 ô)**.
  - **Xích:** chạy trong bán kính **3 ô** quanh chuồng chó. **Thả rông** đuổi khắp vườn (ADR 0013). Chủ chọn xích hay thả; trạng thái nằm trong bản lưu.
- **Khi phát hiện:** bong bóng **"GÂU GÂU!"**, màn hình rung nhẹ, chó chạy đuổi theo với tốc độ **×1.3** tốc độ đi bộ. Chủ vườn đang online nhận thông báo 🔴 *"Mực đang sủa ở góc ruộng!"* kèm **mũi tên chỉ hướng** (cơ chế mũi tên của issue 13). Chủ đang ở bản đồ khác vẫn nhận (hoàn thiện ở issue 32).
- **Phần đuổi theo chạy trên trình duyệt của khách** (khách là người đang di chuyển): khách chạy kịp tới lối ra thì **thoát**. Bị chó đớp thì trình duyệt khách gửi lên server một thao tác (cùng mã thao tác, hàng đợi của ADR 0012).
- **Bị đớp:** khách **rơi hết đồ vừa trộm** (trả lại, theo luật khách), **đứng hình 3 giây** và **nộp phạt cho chủ vườn** (xu trừ khách, cộng chủ; mức phạt trong `data`). Ghi vào nhật ký: "Hùng bị Mực đớp". Khách bị đớp không tính vào chuỗi "trộm không bị đớp".
- **Xúc xích:** vật phẩm mới **bán ở chợ Bà Tư**. Khách ném xúc xích (thao tác `sausage`): chó có độ no dưới 50 thì **chắc chắn ăn** và **im lặng 60 giây**; chó đang no vẫn có **30% tham ăn**. Phần ngẫu nhiên dùng hạt giống cố định để test được.
- **Chủ có chó thả rông / xích:** một nút chuyển trên chuồng chó hoặc chó.
- **Nhật ký chó:** thống kê "đã đuổi được bao nhiêu người" lưu trong bản lưu cho issue 32.
- **Pixel art mới:** danh sách sprite cần vẽ: chó Mực sủa (con và trưởng thành, 2–4 khung), chó ngủ gật có 💤, chó chạy đuổi, bong bóng "GÂU GÂU!", xúc xích (vật phẩm trong giỏ và trên đất), sợi xích ở chuồng chó, hiệu ứng khách đứng hình (sao quay quanh đầu), mũi tên chỉ hướng chó sủa. **Pixel art do agent Opus vẽ.**

## Acceptance criteria

- [x] Unit test (seam 1): bán kính phát hiện đúng 4 ô chó con, 6 ô trưởng thành; vui < 50 giảm một nửa; đói < 30 thì không phát hiện; chó ngủ chỉ phát hiện ở 1 ô; chó bị xích chỉ phát hiện trong vùng 3 ô quanh chuồng (đúng khi khách ngoài vùng).
- [x] Unit test (seam 1): chó ngủ gật xảy ra ban đêm với tỷ lệ khoảng 30% theo hạt giống cố định trong test, không có ban ngày.
- [x] Unit test (seam 1): thao tác bị đớp làm khách mất toàn bộ đồ vừa trộm (chủ không mất thêm), trừ phạt khách và cộng chủ đúng mức, ghi nhật ký, không tính vào chuỗi trộm; áp dụng hai lần cùng mã chỉ tính một lần.
- [x] Unit test (seam 1): xúc xích với chó no < 50 luôn thành công và đặt trạng thái im lặng 60 giây (không phát hiện trong thời gian đó); chó no hơn thì tỷ lệ ăn khoảng 30% theo hạt giống cố định; hết 60 giây chó canh lại.
- [x] Unit test (seam 1): tốc độ chó đuổi bằng 1.3 lần tốc độ đi bộ; xích/thả đổi vùng chạy theo luật.
- [x] Unit test (seam 3): khi khách bị phát hiện, chủ online nhận sự kiện "chó sủa" kèm hướng; chủ offline thì chỉ ghi nhật ký.
- [x] E2E (Playwright, 2 trình duyệt, desktop + 360px): vườn A có Mực trưởng thành, no và vui (bản lưu ghi sẵn); B vào, trộm ô chín trong vùng chó → thấy bong bóng "GÂU GÂU!", chó đuổi; B không chạy kịp → rơi đồ vừa trộm, đứng hình 3 giây; A thấy thông báo sủa kèm mũi tên và dòng nhật ký.
- [x] E2E: cùng tình huống, B chạy kịp ra cổng thì thoát và giữ đồ đã trộm.
- [x] E2E: ban đêm Mực ngủ 💤 (bản lưu ghi sẵn) → B đi xa 1 ô không bị phát hiện; B mua xúc xích ở chợ Bà Tư, ném cho chó đói → chó im lặng, B trộm không bị phát hiện trong 60 giây.
  - Phần **mua ở chợ Bà Tư** để trong bản lưu ghi sẵn thay vì bấm mua trong game: chợ chỉ mở 6h–18h giờ game mà cảnh này bắt buộc là ban đêm, lúc đó không mua được. Xúc xích là vật phẩm `feed` thường trong `ITEMS` nên tự hiện ở tab Thức ăn của chợ.
- [x] E2E: A chuyển Mực sang xích thì B trộm ô ngoài 3 ô quanh chuồng không bị phát hiện.

## Ghi chú khi làm

- Con số tự chọn (trong `data.js` `GUARD`): phạt khi bị đớp **30 xu**, xúc xích ở chợ Bà Tư **30 xu, từ cấp 5**, đớp được khi cách **11 px**, chó thôi đuổi sau **2 giây** mất dấu, mỗi vườn chỉ ghi một dòng "chó sủa" trong **20 giây**, chủ thấy báo gấp 🔴 + mũi tên trong **15 giây**.
- Giấc ngủ gật: ban đêm cứ 60 giây giờ vườn quay một lần, trúng 30% thì ngủ hết khe đó → đúng khoảng 30% thời gian ban đêm.
- Phần hên xui của xúc xích quay bằng **hạt giống cố định = mã thao tác**, nên server và trình duyệt chủ luôn ra cùng kết quả (ADR 0012); giấc ngủ gật dùng `Math.random` trong `tick`, test thay bằng bộ sinh số có hạt.
- `world.js`: trong vườn người khác chó **không đi theo khách lạ** nữa mà quanh quẩn giữ chuồng — không thì chó tự dí sát mặt khách và luật bán kính thành vô nghĩa.
- Thao tác chó áp dụng trên bản đi dạo chỉ để **xem trước con chó** (sủa, mải ăn): trong bản đi dạo `coins`, `stats`, `log` là của khách chứ không phải của chủ, nên phần ghi sổ của chủ do server và trình duyệt chủ làm.

## Blocked by

- [30](30-trom-va-gioi-han.md)
