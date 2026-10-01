# PRD 0002: Phase 1, chơi online

Nguồn: `DESIGN.md` mục 7 (chơi online), 0b (thời gian), 5a (cấu trúc thế giới), 6.1 (chó phát hiện trộm), 9 (thứ tự phase). Liên quan các ADR 0002, 0003, 0006, 0007, 0010, 0011, 0012.

## Problem Statement

Sau Phase 0, Nông Trại Vui là game chơi một mình. Vườn chỉ nằm trong `localStorage` của một trình duyệt, nên:

- Người chơi không có bạn để khoe vườn, không ai ghé thăm, không ai giúp hay trộm. Làng có cổng "Sắp ra mắt: thăm bạn bè" nhưng chưa đi vào được.
- Chó Mực chỉ đuổi được thằng Tèo, một NPC. Ý tưởng "vườn không có chó thì bạn bè sang trộm" chưa có chỗ để xảy ra.
- Đổi máy hay xóa dữ liệu trình duyệt là mất vườn.
- Mỗi người một đồng hồ riêng, nên không có cảm giác "cả làng cùng một buổi sáng".

Phía kỹ thuật, `server.js` cũ đang hỏng và VPS chỉ phục vụ file tĩnh bằng nginx. Chưa có tài khoản, chưa có nơi lưu vườn, chưa có kênh real-time.

## Solution

Sau Phase 1, nhóm bạn bè (≤ 20–30 người quen) chơi chung một làng tại https://game.huninna.com:

- **Tài khoản:** đăng ký bằng tên nhân vật (duy nhất trong làng), PIN 6 số và mã mời dùng một lần. Đăng nhập giữ 30 ngày trên mỗi thiết bị. Mỗi tài khoản chỉ chơi trên 1 thiết bị tại một lúc.
- **Mang vườn lên làng:** lần đầu đăng nhập, game hỏi "Mang vườn này lên làng?" để chuyển vườn chơi đơn lên server. Chế độ chơi đơn vẫn còn, là một vườn riêng.
- **Đồng bộ:** khi chủ vườn đang chơi, trình duyệt chạy mô phỏng và gửi bản lưu lên server khoảng mỗi 10 giây. Khi chủ offline, server chạy bù vườn đó bằng cùng luật chơi, tối đa 8 tiếng rồi đóng băng.
- **Đồng hồ chung:** online cả làng dùng giờ server, luôn x1. Ngày đêm, mùa và thời tiết là chung.
- **Làng sống:** thấy nhân vật của nhau đi lại real-time, có bong bóng chat nhanh và biểu cảm 👋 ❤️ 😂 😡. Chợ Bà Tư, tiệm rèn Ông Sáu vẫn như Phase 0.
- **Thăm vườn bạn:** đi qua làng tới cổng vườn của bạn rồi bước vào, đi bộ thật trên vườn đó.
  - **Giúp:** tưới, nhổ cỏ, bắt sâu, đuổi quạ. Được ít xu và EXP, chủ nhận lời cảm ơn.
  - **Tặng quà và ký sổ lưu bút** ở cổng.
  - **Trộm 😈:** hái cây chín, nhặt trứng, lấy sữa và lông đang chờ. Có giới hạn để chủ luôn còn phần lớn.
  - **Chó Mực canh vườn:** phát hiện người lạ trong bán kính, sủa "GÂU GÂU!", đuổi theo. Bị đớp thì rơi hết đồ, đứng hình, nộp phạt cho chủ vườn. Có thể ném xúc xích dụ chó.
- **Bạn bè:** thêm bằng tên hoặc mã kết bạn. Danh sách ghim bạn lên đầu, hiện cấp, trạng thái online và biểu tượng "🍅 có đồ chín" hay "🐛 cần giúp".
- **Nhật ký vườn:** xem ai trộm gì, lúc mấy giờ, ai đã giúp. Có nút "Sang trộm lại 😤".
- **Màn "Trong lúc bạn vắng nhà…"** có thêm: ai ghé trộm, ai giúp, chó đuổi được bao nhiêu người.

## User Stories

### Tài khoản và thiết bị

1. As a người chơi mới, I want đăng ký bằng tên nhân vật, PIN 6 số và mã mời, so that chỉ người quen mới vào được làng.
2. As a người chơi, I want tên nhân vật là duy nhất trong làng, so that bạn bè nhận ra mình.
3. As a người chơi, I want thấy lý do rõ ràng khi tên đã có người dùng hoặc mã mời sai hay đã dùng, so that tôi biết phải làm gì.
4. As a người chơi, I want đăng nhập được giữ 30 ngày trên máy của mình, so that không phải nhập PIN mỗi lần.
5. As a người chơi, I want đăng xuất được, so that cho người khác mượn máy không lộ vườn.
6. As a người chơi, I want khi tôi đăng nhập ở máy mới thì máy cũ tự lưu lần cuối rồi thoát, so that không bị mất tiến trình và không có hai bản vườn đánh nhau.
7. As a người chơi, I want máy cũ hiện thông báo "Bạn đã đăng nhập ở thiết bị khác", so that tôi hiểu vì sao bị thoát.
8. As a người chơi quên PIN, I want nhờ quản trị đặt lại, so that không mất vườn.
9. As a quản trị, I want tạo mã mời và đặt lại PIN bằng lệnh trên server, so that tôi quản lý nhóm bạn mà không cần giao diện quản trị.
10. As a người chơi, I want nhập sai PIN nhiều lần thì bị khóa tạm, so that người khác không đoán mò được.

### Chế độ chơi đơn và chuyển vườn

11. As a người chơi cũ, I want lần đầu đăng nhập được hỏi "Mang vườn này lên làng?", so that không phải chơi lại từ đầu.
12. As a người chơi, I want chọn "Bắt đầu vườn mới" thay vì mang vườn cũ, so that tôi có thể chơi lại sạch sẽ trên làng.
13. As a người chơi, I want vườn chơi đơn vẫn nằm nguyên trong máy sau khi mang lên làng, so that tôi vẫn chơi offline được.
14. As a người chơi, I want chọn được giữa "Chơi một mình" và "Vào làng" ở màn đầu, so that không có mạng vẫn chơi được.
15. As a người chơi offline, I want cổng vào vườn bạn bè có biển "Đăng nhập để thăm bạn bè", so that tôi biết tính năng đó cần online.
16. As a người chơi offline, I want vẫn có nút tốc độ x5/x20, so that thử nghiệm và chơi nhanh một mình như trước.

### Đồng bộ và thời gian

17. As a chủ vườn đang chơi, I want vườn tự lưu lên server khoảng mỗi 10 giây và khi đóng trang, so that không mất gì khi đổi máy.
18. As a chủ vườn, I want thao tác trong vườn mình không phải chờ mạng, so that game vẫn mượt như chơi đơn.
19. As a chủ vườn, I want rớt mạng thì vẫn chơi tiếp trong vườn mình và tự kết nối lại, so that mạng chập chờn không làm gián đoạn.
20. As a chủ vườn, I want thấy biểu tượng nhỏ khi đang mất kết nối, so that tôi biết lúc đó chưa lưu được lên server.
21. As a chủ vườn vắng nhà, I want server chạy bù vườn của tôi, so that bạn bè ghé vào thấy cây đã lớn, đồ đã chín.
22. As a chủ vườn vắng lâu, I want vườn đóng băng sau 8 tiếng như chơi đơn, so that không quay về thấy vườn tan hoang.
23. As a người chơi online, I want cả làng cùng một giờ, cùng ngày đêm, cùng mùa, so that "sáng nay" của tôi cũng là sáng của bạn bè.
24. As a người chơi online, I want tốc độ luôn x1, so that không ai tua nhanh để vượt người khác.
25. As a chủ vườn, I want offline thì con vật không bao giờ chết vì đói hay bệnh, kể cả khi server chạy bù, so that ngủ dậy không mất cả chuồng.
26. As a chủ vườn, I want thấy màn "Trong lúc bạn vắng nhà…" có cả việc bạn bè làm trong vườn tôi, so that biết ai đã ghé.

### Làng chung

27. As a người chơi, I want thấy nhân vật của bạn bè đi lại trong làng real-time, so that làng có cảm giác sống.
28. As a người chơi, I want nhân vật của người khác di chuyển mượt dù mạng chậm, so that không bị giật cục.
29. As a người chơi, I want thấy tên và ngoại hình (mũ, áo) của người khác, so that nhận ra ai là ai.
30. As a người chơi, I want gửi bong bóng chat nhanh, so that chào hỏi bạn bè khi gặp nhau.
31. As a người chơi, I want bấm biểu cảm 👋 ❤️ 😂 😡, so that trò chuyện nhanh trên điện thoại.
32. As a người chơi, I want chat chỉ hiện với người cùng bản đồ, so that không bị loạn tin nhắn.
33. As a người chơi, I want làng đông quá 12 người thì người ở xa chỉ hiện tên mờ, so that điện thoại yếu vẫn chạy mượt.
34. As a người chơi, I want chợ Bà Tư và tiệm rèn Ông Sáu vẫn hoạt động như cũ khi online, so that không phải học lại.
35. As a người chơi, I want có danh sách người đang online trong làng, so that biết nên ghé thăm ai.

### Bạn bè

36. As a người chơi, I want thêm bạn bằng tên nhân vật hoặc mã kết bạn, so that dễ tìm nhau.
37. As a người chơi, I want danh sách bạn hiện cấp và trạng thái online, so that biết ai đang chơi.
38. As a người chơi, I want thấy "🍅 có đồ chín" hay "🐛 cần giúp" bên cạnh tên bạn, so that biết nên sang giúp hay sang trộm.
39. As a người chơi, I want bạn bè được ghim lên đầu danh sách cổng vườn trong làng, so that không phải tìm lâu.
40. As a người chơi, I want nhận thông báo khi bạn bè ghé vườn tôi, so that tôi chạy ra xem.
41. As a người chơi, I want xóa bạn, so that danh sách gọn.

### Thăm vườn bạn

42. As a người chơi, I want đi tới cổng vườn của một người trong làng rồi bước vào, so that thăm vườn như đi bộ thật.
43. As a khách, I want đi lại trên vườn của bạn với cùng cách điều khiển như vườn mình, so that không phải học thêm.
44. As a khách, I want thấy chủ vườn nếu họ đang ở đó, và họ thấy tôi, so that hai người gặp nhau trong vườn.
45. As a khách, I want vuốt ve chó mèo của bạn (chó lạ thì phải cho ăn mới chịu), so that đi dạo vui.
46. As a khách, I want không vào được nhà của chủ vườn, so that riêng tư được giữ.
47. As a khách, I want không mở được kho, thùng giao hàng, chế độ xây dựng của chủ, so that không phá vườn bạn.
48. As a khách, I want đi ra cổng vườn bạn thì về lại làng, so that đi tiếp sang vườn khác.

### Giúp và tặng quà

49. As a khách, I want tưới, nhổ cỏ, bắt sâu, đuổi quạ giúp bạn, so that làm hàng xóm tốt.
50. As a khách, I want được ít xu và EXP mỗi lần giúp, so that giúp đỡ cũng có lợi.
51. As a chủ vườn, I want nhận thông báo cảm ơn "Lan đã tưới 3 ô giúp bạn", so that biết ai tốt với mình.
52. As a chủ vườn, I want mỗi vườn mỗi ngày chỉ nhận tối đa 10 việc giúp, so that không ai cày xu bằng cách giúp mãi.
53. As a khách, I want thấy lý do khi việc giúp bị khóa ("Vườn này hôm nay đã được giúp đủ"), so that không bấm hoài.
54. As a khách, I want để lại quà (hạt giống, nông sản) ở cổng, so that tặng bạn bất ngờ.
55. As a khách, I want ký sổ lưu bút ở cổng, so that để lại lời nhắn.
56. As a chủ vườn, I want đọc sổ lưu bút và nhận quà khi về, so that thấy vui.

### Trộm

57. As a khách từ cấp 5, I want hái trộm cây đã chín, nhặt trộm trứng dưới đất, lấy sữa và lông đang chờ, so that có chút tinh nghịch.
58. As a chủ vườn dưới cấp 5, I want vườn tôi không bị trộm, so that người mới không nản.
59. As a chủ vườn, I want mỗi ô hay mỗi con chỉ bị trộm tối đa 25% sản lượng, so that tôi luôn còn phần lớn.
60. As a chủ vườn, I want mỗi người chỉ trộm được 1 lần mỗi ô hay mỗi con, so that không bị một người vét sạch.
61. As a chủ vườn, I want mỗi ngày ngoài đời vườn tôi mất tối đa 30% tổng giá trị đồ chín, so that không bị cả làng trộm sạch trong một đêm.
62. As a khách, I want không trộm được con vật, trái khổng lồ, đồ trong kho, trong nhà và cá, so that luật rõ ràng.
63. As a khách, I want giỏ đầy thì không trộm thêm được, so that phải cân nhắc mang gì.
64. As a khách, I want đi trộm cũng tốn thể lực, so that không trộm vô tận.
65. As a chủ vườn, I want nhật ký ghi "Hùng đã trộm 3 cà chua lúc 2h sáng 😤", so that biết ai trộm.
66. As a chủ vườn, I want có nút "Sang trộm lại 😤" đi thẳng tới vườn kẻ trộm, so that trả đũa cho vui.
67. As a chủ vườn, I want đêm nào đã có bạn sang trộm thì trộm NPC không tới, so that không bị trộm hai lần.

### Chó Mực canh vườn

68. As a chủ vườn, I want chó trưởng thành, no và vui phát hiện khách lạ trong bán kính 6 ô (chó con 4 ô), so that nuôi chó có ý nghĩa.
69. As a chủ vườn, I want chó vui dưới 50 thì bán kính giảm một nửa, đói dưới 30 thì không canh, so that phải chăm chó.
70. As a khách, I want thấy chó đang ngủ gật (💤) ban đêm, so that biết lúc nào lẻn vào được.
71. As a khách, I want chó ngủ chỉ phát hiện tôi khi tôi đứng sát bên, so that có cơ hội cho kẻ khéo léo.
72. As a khách bị phát hiện, I want thấy bong bóng "GÂU GÂU!" và chó chạy đuổi theo ×1.3 tốc độ đi bộ, so that hồi hộp.
73. As a khách, I want chạy kịp ra cổng thì thoát, so that còn cơ hội.
74. As a khách bị chó đớp, I want rơi hết đồ vừa trộm, đứng hình 3 giây và nộp phạt cho chủ, so that trộm có rủi ro.
75. As a chủ vườn đang online, I want nhận thông báo "Mực đang sủa ở góc ruộng!" kèm mũi tên chỉ hướng, so that chạy ra kịp.
76. As a khách, I want ném xúc xích để dụ chó im lặng 60 giây (chó no vẫn 30% tham ăn), so that có mẹo.
77. As a chủ vườn, I want xích chó trong bán kính 3 ô quanh chuồng hoặc thả rông, so that chọn kiểu canh.
78. As a chủ vườn, I want màn "Trong lúc bạn vắng nhà" ghi chó đã đuổi được bao nhiêu người, so that tự hào về chó.

### Thành tựu xã hội và nhật ký

79. As a người chơi, I want thành tựu "Hàng xóm tốt bụng" (giúp 50 lần), so that có mục tiêu khi giúp.
80. As a người chơi, I want thành tựu "Siêu trộm" (trộm 30 lần không bị đớp), so that trộm có mục tiêu.
81. As a người chơi, I want thành tựu "Vườn bất khả xâm phạm" (chó đuổi 20 kẻ trộm), so that chăm chó có mục tiêu.
82. As a chủ vườn, I want thông báo gấp khi có trộm trong vườn lúc tôi đang ở làng hoặc vườn khác, so that chạy về kịp.

### Vận hành

83. As a quản trị, I want sao lưu file dữ liệu của làng bằng một lệnh, so that không mất vườn của bạn bè.
84. As a quản trị, I want server từ chối bản lưu có số liệu vô lý (xu tăng vọt, trộm quá giới hạn), so that có chống gian lận nhẹ.
85. As a quản trị, I want deploy bằng `git pull && docker compose up -d --build` như cũ, so that quy trình không đổi.
86. As a người phát triển, I want smoke test live dùng tài khoản test riêng và tự dọn sau khi chạy, so that làng thật không có rác.

## Implementation Decisions

- **Một container Node (ADR 0010).** Thay nginx bằng một tiến trình Node phục vụ file tĩnh của `public/`, API HTTP và WebSocket (`ws`, ADR 0007). Dữ liệu ở `node:sqlite`, một file trên Docker volume. Caddy của `ai_gateway` vẫn lo HTTPS. Server khởi động được bằng một hàm nhận cổng và đường dẫn cơ sở dữ liệu, để test bật tắt nhiều lần.
- **Module server mới, chia sâu:**
  - **Tài khoản:** đăng ký (tên, PIN 6 số băm có muối, mã mời dùng một lần), đăng nhập trả mã phiên giữ 30 ngày, khóa tạm khi sai PIN nhiều lần, đổi phiên chơi khi đăng nhập máy mới.
  - **Kho vườn:** lưu bản lưu v2 của từng tài khoản, kèm phiên chơi đang giữ quyền ghi. Từ chối bản lưu mang phiên cũ hoặc số liệu vô lý (so với bản trước: xu, EXP, đồ tăng quá mức có thể làm được trong khoảng thời gian đó).
  - **Chạy bù:** khi có người cần đọc vườn của chủ đang offline, server nạp bản lưu, chạy bù bằng `state.js` (tối đa 8 tiếng, đóng băng phần dư), áp dụng hàng đợi thao tác khách, rồi lưu lại.
  - **Hàng đợi thao tác khách (ADR 0012):** mỗi thao tác có mã duy nhất. Server kiểm tra bằng hàm luật trong `state.js` trên bản lưu mới nhất, ghi hàng đợi, đẩy sang trình duyệt chủ nếu chủ online. Áp dụng hai lần cùng mã thì lần sau không làm gì.
  - **Hiện diện real-time:** mỗi kết nối WebSocket thuộc một bản đồ (làng, hoặc vườn của một người). Vị trí gửi 6 lần mỗi giây, chỉ phát cho người cùng bản đồ. Chat nhanh và biểu cảm đi cùng kênh này.
  - **Bạn bè, sổ lưu bút, quà, nhật ký vườn:** bảng riêng trong SQLite.
  - **Lệnh quản trị** chạy trong container: tạo mã mời, đặt lại PIN, sao lưu dữ liệu, xóa tài khoản.
- **Hợp đồng HTTP (dạng JSON):** đăng ký, đăng nhập, đăng xuất; lấy và lưu vườn của mình; đọc vườn của người khác để thăm (đã chạy bù); gửi thao tác khách; bạn bè (thêm, xóa, danh sách kèm trạng thái); sổ lưu bút; danh sách cổng vườn trong làng. WebSocket chỉ cho hiện diện, chat, và đẩy sự kiện (thao tác khách tới chủ, "thiết bị khác đã đăng nhập", chó sủa).
- **Luật khách trong `state.js` (ADR 0012):** hàm thuần nhận bản lưu chủ, thông tin khách (tên, cấp, đã trộm ô nào hôm nay) và thao tác `help | gift | steal | pet | sausage`, trả kết quả hoặc lý do từ chối. Mọi giới hạn đã chốt nằm ở đây: 25% mỗi ô hay mỗi con, 1 lần mỗi người mỗi ô, 30% tổng giá trị đồ chín mỗi vườn mỗi ngày ngoài đời, 10 việc giúp mỗi vườn mỗi ngày, chủ dưới cấp 5 không bị trộm, khách dưới cấp 5 không trộm được, giỏ đầy không trộm thêm, trộm tốn thể lực.
- **Chó phát hiện khách:** luật bán kính (chó con 4 ô, trưởng thành 6 ô; vui < 50 giảm nửa; đói < 30 không canh; ngủ gật ~30% thời gian ban đêm chỉ thấy trong 1 ô; xích thì chạy trong 3 ô quanh chuồng) nằm trong `state.js`. Phần đuổi theo (×1.3 tốc độ đi bộ, thoát nếu gần lối ra) chạy trên trình duyệt của khách, vì khách là người đang di chuyển; kết quả "bị đớp" gửi lên server như một thao tác, rơi đồ và nộp phạt. Xúc xích là vật phẩm mới bán ở chợ. Vòng đời chó đầy đủ và lệnh "Canh khu" thuộc Phase 2; Phase 1 dùng trạng thái chó con/trưởng thành hiện có.
- **Đồng hồ:** `clock` của Phase 0 được trỏ sang giờ server khi online (đồng bộ lệch giờ lúc kết nối). Online khóa tốc độ x1. Lịch làng (ngày, mùa) tính từ giờ server và một mốc chung, nên mọi người cùng ngày. Đóng băng 8 tiếng chỉ áp dụng cho cây và con vật, lịch vẫn chạy (ADR 0003).
- **Bản lưu:** thêm các trường cần cho online vào bản lưu v2 (không đổi phiên bản nếu chỉ là trường thêm): chế độ (`offline | online`), tên tài khoản, thống kê trộm/giúp hôm nay theo ngày ngoài đời, trạng thái xích chó, nhật ký khách. Bản lưu offline và online là hai vườn riêng, không đồng bộ sau lần chuyển đầu.
- **Bản đồ vườn khách:** dùng lại `sceneMap` với cảnh mới "vườn của người khác", dựng từ bản lưu của chủ (chỉ đọc), chặn cửa nhà, kho, thùng giao hàng và chế độ xây dựng.
- **Giao diện mới:** màn chọn chế độ (Chơi một mình / Vào làng), đăng nhập và đăng ký, hộp "Mang vườn này lên làng?", danh sách bạn bè, danh sách cổng vườn trong làng, thanh chat nhanh và biểu cảm, sổ lưu bút, nhật ký vườn, biểu tượng mất kết nối. Mọi màn mới phải qua bài rà 360px như issue 17.
- **Màn "Trong lúc bạn vắng nhà"** nhận thêm sự kiện từ hàng đợi khách: giúp, trộm, quà, chó đuổi.
- **Thông báo 3 mức:** trộm trong vườn mình là 🔴 gấp (mọi bản đồ), bạn bè ghé và cảm ơn là 🟡, quà và sổ lưu bút là 🟡.

## Testing Decisions

- **Test tốt** chỉ kiểm hành vi nhìn thấy từ bên ngoài: kết quả trả về của API `state.js`, phản hồi HTTP và tin nhắn WebSocket, và những gì người chơi thấy trên trình duyệt. Không kiểm hàm nội bộ, không mock cơ sở dữ liệu.
- **Seam 1 – `state.js` (node --test):** luật khách (từng giới hạn và từng lý do từ chối), chó phát hiện khách theo tuổi/no/vui/ngủ/xích, áp dụng thao tác hai lần cùng mã, lịch làng từ giờ server, chạy bù có hàng đợi khách. Prior art: `tests/state.test.mjs`, `tests/time.test.mjs`, `tests/notify.test.mjs`.
- **Seam 3 mới – giao thức server (ADR 0011):** bật server thật trong tiến trình test với SQLite tạm, gọi bằng HTTP và WebSocket thật. Kiểm: đăng ký với mã mời, tên trùng, PIN sai bị khóa tạm; đăng nhập máy thứ hai làm máy thứ nhất nhận lệnh thoát và bản lưu phiên cũ bị từ chối; bản lưu vô lý bị từ chối; đọc vườn chủ offline thì đã chạy bù và đóng băng đúng; thao tác khách bị từ chối đúng lý do và được đẩy tới chủ online; vị trí chỉ phát cho người cùng bản đồ; tự kết nối lại.
- **Seam 2 – Playwright:** hai trình duyệt (hai người chơi) vào server chạy local, dựng tình huống bằng API công khai của server (đăng ký tài khoản test, đẩy bản lưu ghi sẵn). Kịch bản: đăng ký → mang vườn lên làng → reload vẫn đúng; hai người thấy nhau trong làng và chat; khách sang vườn bạn giúp tưới, chủ thấy lời cảm ơn; khách trộm bị chó đuổi kịp và rơi đồ; đăng nhập máy thứ hai thì máy thứ nhất thoát. Chạy desktop và 360px, mỗi lúc 1 worker (riêng test online là 2 trình duyệt).
- **Smoke live:** tài khoản test riêng trên `https://game.huninna.com`, đăng nhập, vào làng, ra vào vườn mình, rồi tự xóa tài khoản test.

## Out of Scope

- Vòng đời chó đầy đủ, dạy lệnh, lệnh "Canh khu" (Phase 2). Phase 1 chỉ dùng chó con/trưởng thành hiện có.
- Ngỗng báo động, đèn lồng, chuông cửa và các phòng thủ khác (Phase 2 và 4).
- Bồ câu đưa thư, phòng khách nhà lầu cho bạn bè vào chơi (Phase 5 và 6).
- Bảng xếp hạng làng, lễ hội, hội chợ, giá chợ chung theo sức mua (Phase 4 và 7).
- Chống gian lận chặt: chỉ kiểm tra số liệu hợp lý, vì chỉ chơi với bạn bè.
- Đăng nhập bằng mạng xã hội, email, khôi phục PIN tự động.
- Đồng bộ hai chiều giữa vườn offline và vườn online sau lần chuyển đầu.

## Further Notes

- Đây là phase đầu tiên có server, nên rủi ro lớn nhất là đồng bộ: bản lưu trình duyệt chủ gửi lên mỗi 10 giây và hàng đợi thao tác khách. ADR 0012 chốt cách tránh ghi đè lẫn nhau, cần test kỹ ở seam 3.
- Máy phát triển ít RAM: test online chỉ chạy 2 trình duyệt, headless.
- Nhịp 6 lần mỗi giây và giới hạn 12 người hiển thị là con số đã chốt, có thể chỉnh khi thử với nhóm bạn thật.
