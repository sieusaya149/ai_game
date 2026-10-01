# PRD 0001: Phase 0, nền móng

Nguồn: `DESIGN.md` (đã grill xong 16 chủ đề), mục 9 (thứ tự phase). Liên quan các ADR 0001, 0003, 0005, 0008.

## Problem Statement

Nông Trại Vui hiện là một bản đồ cố định 34×27 ô:
- Ruộng là lưới 6×6 ô ở chỗ cố định.
- Chuồng, nhà kho, sạp hàng và giếng nằm ở vị trí đặt sẵn.
- Chỉ có một bản đồ duy nhất.

Người chơi không thể sắp xếp vườn theo ý mình. Vườn ai cũng giống vườn ai. Cũng không còn chỗ cho hàng chục loại công trình, con vật và khu vực mới đã được chốt cho các phase sau.

Nhân vật không có giới hạn sức làm, và công cụ không nâng cấp được. Vì vậy thu nhập chỉ bị giới hạn bởi thời gian ngồi chơi, còn việc làm đồng lặp đi lặp lại từng ô một rất nhàm.

Thông báo hiện ra cái nào cũng như cái nào. Khi vườn có nhiều việc, người chơi không biết việc nào gấp, và phải đi khắp vườn mới biết chỗ nào cần làm.

Ngoài ra, mọi phase sau, trước hết là online, cần một **cấu trúc bản lưu mới**, một **mô hình thời gian** rõ ràng (đóng băng sau 8 tiếng, lịch ngoài đời), và **luật chơi tách khỏi phần vẽ** để chạy được trên server. Nếu thêm tính năng mới trên cấu trúc cũ thì sau này phải làm lại và chuyển bản lưu thêm lần nữa.

## Solution

Sau Phase 0, người chơi có:

- **Một khu vườn của riêng mình.** Ban đầu chỉ dùng được vùng đất nhỏ ở giữa, sau đó mua thêm từng dải đất ra 4 phía. Đất mới phải dọn cây bụi và đá mới dùng được, dọn xong được gỗ và đá.
- **Chế độ xây dựng:**
  - Đặt và dời tự do ruộng (theo khối 3×3), chuồng, giếng, nhà kho, thùng giao hàng và đồ trang trí.
  - Nhà ở và cổng cố định.
  - Game không cho đặt chồng lên nhau, đặt ra ngoài đất của mình, hay chặn đường từ cổng vào nhà.
- **Ba kiểu bản đồ** nối với nhau qua cửa và cổng, có hiệu ứng chuyển cảnh mờ dần:
  - **Vườn nhà.**
  - **Trong nhà:** có giường để ngủ hồi thể lực.
  - **Làng:** có chợ của Bà Tư (mua hạt, vật tư, bán nông sản) và tiệm rèn của Ông Sáu (nâng cấp công cụ).
  - Trong vườn có **thùng giao hàng**: bỏ đồ vào, sáng hôm sau lái buôn trả 80% giá chợ.
- **Thể lực 100 điểm**, kiểu "mềm": làm việc tốn sức. Hết sức thì vẫn làm được nhưng chậm gấp đôi, nhân vật thở hồng hộc. Ngủ thì hồi đầy, ngồi ghế đá thì hồi chậm.
- **Công cụ 3 cấp** (cuốc, bình tưới, liềm, giỏ): cấp cao làm được 1 hàng 3 ô hoặc 3×3 ô trong một lần, và tốn ít sức hơn. Giỏ có sức chứa, đầy thì phải về kho cất.
- **Thông báo 3 mức** (🔴 gấp, 🟡 quan trọng, ⚪ thông tin), tự gộp lại, có mũi tên chỉ hướng.
  - **Bảng "Việc cần làm"**: chạm vào một dòng thì nhân vật tự đi tới.
  - **Bản đồ nhỏ** có chấm đỏ và chấm vàng.
- **Màn "Trong lúc bạn vắng nhà…"** khi mở lại game. Vườn vắng quá 8 tiếng thì đóng băng chờ người chơi về.
- **Bản lưu cũ tự chuyển sang bản lưu mới**, không mất gì: ruộng, cây, con vật, đồ và xu vẫn còn nguyên.

## User Stories

### Bản lưu và chuyển đổi
1. Là người chơi cũ, tôi muốn mở game bản mới mà vườn cũ vẫn còn nguyên (ruộng, cây đang lớn, con vật, túi đồ, xu, cấp), để không phải chơi lại từ đầu.
2. Là người chơi cũ, tôi muốn 36 ô ruộng cũ hiện ra thành 4 khối 3×3 ở đúng chỗ cũ, cây đang lớn vẫn giữ tiến độ, để nhận ra vườn của mình.
3. Là người chơi cũ, tôi muốn chuồng, giếng, nhà kho, ổ ấp và đồ trang trí cũ vẫn ở vị trí cũ, và dời đi được, để từ từ sắp xếp lại theo ý mình.
4. Là người chơi cũ, tôi muốn sạp hàng cũ chuyển ra chợ trong làng, và trong vườn có thùng giao hàng thay cho chỗ bán ở nhà kho, để vẫn mua bán được.
5. Là người chơi cũ, tôi muốn thấy một thông báo ngắn giải thích những gì đã đổi khi mở bản mới lần đầu, để không bị bỡ ngỡ.
6. Là người chơi, tôi muốn việc chuyển bản lưu chỉ chạy một lần và không bao giờ làm hỏng bản lưu: nếu lỗi thì vẫn giữ bản cũ, để không mất vườn.
7. Là người chơi mới, tôi muốn bắt đầu với 1 khối ruộng 3×3, nhà, cổng, giếng, nhà kho, thùng giao hàng, chuồng gà có 2 con gà và chó Mực, để chơi được ngay.

### Vườn và mở rộng đất
8. Là người chơi, tôi muốn bắt đầu với vùng đất 24×20 ô ở giữa bản đồ, xung quanh là rừng cây bụi, để thấy rõ còn nhiều đất để mở rộng.
9. Là người chơi, tôi muốn mua thêm từng dải đất về phía Bắc, Nam, Đông hoặc Tây, mỗi dải có giá và cấp tối thiểu, để vườn lớn dần theo tiến độ.
10. Là người chơi, tôi muốn thấy giá và cấp cần có của dải đất kế tiếp khi đứng ở mép vườn, để biết cần cố gắng tới đâu.
11. Là người chơi, tôi muốn dải đất mới mua có cây bụi và đá, phải dọn bằng tay (tốn thể lực) mới đặt đồ được, để việc mở đất có cảm giác thành quả.
12. Là người chơi, tôi muốn dọn cây bụi được gỗ và dọn đá được đá, để sau này có nguyên liệu sửa chữa.
13. Là người chơi, tôi muốn vườn không bao giờ vượt quá 64×48 ô, để bản đồ không quá nặng trên điện thoại.

### Chế độ xây dựng
14. Là người chơi, tôi muốn bật chế độ xây dựng bằng một nút, để sắp xếp vườn mà không sợ chạm nhầm vào việc khác.
15. Là người chơi, tôi muốn kéo một công trình đi chỗ khác và thấy bóng xanh (đặt được) hoặc bóng đỏ (không đặt được) trước khi thả, để biết trước kết quả.
16. Là người chơi, tôi muốn được giải thích vì sao không đặt được ("chồng lên Giếng", "ngoài đất của bạn", "chặn đường từ cổng vào nhà"), để sửa cho đúng.
17. Là người chơi, tôi muốn dời công trình miễn phí và không giới hạn số lần, để thử nhiều cách sắp xếp.
18. Là người chơi, tôi muốn mua một khối ruộng 3×3 mới và đặt ở đâu tùy ý, miễn còn trong giới hạn số khối theo cấp, để mở rộng ruộng.
19. Là người chơi, tôi muốn dời cả khối ruộng, kể cả khi đang có cây (cây vẫn giữ nguyên trạng thái), để không phải đợi thu hoạch mới sắp xếp lại được.
20. Là người chơi, tôi muốn thấy số khối ruộng đang có và số khối tối đa ở cấp hiện tại, cùng cấp cần đạt để có thêm khối, để có mục tiêu.
21. Là người chơi, tôi muốn con vật trong chuồng đi theo khi tôi dời chuồng (và hoảng một lúc), để chuồng mới không bị trống.
22. Là người chơi, tôi muốn đặt đồ trang trí đã mua ngay trong chế độ xây dựng, thay vì chỉ đặt được dưới chân nhân vật, để bố trí chính xác hơn.
23. Là người chơi điện thoại, tôi muốn kéo thả bằng ngón tay, có nút "Xong" và "Hủy" to dễ bấm, để xây dựng thoải mái trên màn hình nhỏ.
24. Là người chơi, tôi muốn nhân vật, con vật và chó tự tìm đường mới ngay sau khi tôi đổi bố cục, để không ai bị kẹt.

### Nhiều bản đồ
25. Là người chơi, tôi muốn đi vào cửa nhà thì vào trong nhà, đi ra cửa thì về vườn, có hiệu ứng mờ dần, để có cảm giác thật sự đi vào nhà.
26. Là người chơi, tôi muốn ra cổng vườn thì tới làng, đi vào cổng nhà mình trong làng thì về vườn, để đi chợ như thật.
27. Là người chơi, tôi muốn thời gian trong vườn vẫn chạy khi tôi đang ở trong nhà hay ngoài làng, để cây không ngừng lớn chỉ vì tôi đi chợ.
28. Là người chơi, tôi muốn vẫn nhận thông báo gấp từ vườn khi đang ở bản đồ khác (ví dụ có trộm), để chạy về kịp.
29. Là người chơi, tôi muốn mở lại game thì đứng đúng bản đồ và đúng chỗ đã đứng lúc thoát, để không phải đi lại từ đầu.
30. Là người chơi, tôi muốn trong làng có chợ của Bà Tư (mua hạt, vật tư, thức ăn, con non, đồ trang trí, mũ áo; bán nông sản đủ giá), để mua bán ở một chỗ.
31. Là người chơi, tôi muốn trong làng có tiệm rèn của Ông Sáu để nâng cấp công cụ, để có mục tiêu tiêu xu.
32. Là người chơi, tôi muốn chợ chỉ mở từ 6h đến 18h, ban đêm thì có biển "Đóng cửa", để làng có nhịp sinh hoạt.
33. Là người chơi, tôi muốn bỏ nông sản vào thùng giao hàng trong vườn, sáng hôm sau được 80% giá chợ, để không phải ngày nào cũng ra chợ.
34. Là người chơi, tôi muốn thấy trước số xu dự kiến nhận từ thùng giao hàng và lấy lại được đồ trước lúc lái buôn tới, để không bán nhầm.
35. Là người chơi, tôi muốn cổng vào vườn bạn bè trong làng có biển "Sắp ra mắt: thăm bạn bè", để biết sắp có tính năng online.

### Thể lực
36. Là người chơi, tôi muốn thấy thanh thể lực trên HUD, để biết còn làm được bao nhiêu việc.
37. Là người chơi, tôi muốn cuốc, tưới, gieo, thu hoạch, dọn bụi, đập đá mỗi việc tốn sức, còn vuốt ve, cho ăn tận tay, nhặt trứng, mua bán thì không tốn, để việc nhẹ không bị phạt.
38. Là người chơi, tôi muốn khi hết thể lực vẫn làm được nhưng đi chậm và làm chậm gấp đôi, nhân vật thở hồng hộc, để không bao giờ bị chặn đứng.
39. Là người chơi, tôi muốn ngủ ở giường trong nhà để hồi đầy thể lực. Khi chơi offline thì được tua tới 6h sáng hôm sau, để kết thúc một ngày làm việc.
40. Là người chơi, tôi muốn không ngủ được trước 18h, để không lạm dụng việc tua giờ.
41. Là người chơi, tôi muốn ngồi ghế đá (đồ trang trí đã có) để hồi thể lực chậm, để có chỗ nghỉ giữa giờ.
42. Là người chơi, tôi muốn thể lực tự hồi một chút mỗi sáng dù không ngủ, để chơi không liên tục vẫn có sức.

### Công cụ
43. Là người chơi, tôi muốn có sẵn cuốc, bình tưới, liềm và giỏ cấp 1, để làm đồng như trước.
44. Là người chơi, tôi muốn nâng cuốc lên cấp đồng (1 hàng 3 ô) rồi cấp vàng (3×3 ô) ở tiệm rèn, để làm đồng nhanh hơn.
45. Là người chơi, tôi muốn bình tưới cấp cao vừa chứa nhiều nước hơn (10 → 20 → 40) vừa tưới được nhiều ô một lần, để ít phải ra giếng.
46. Là người chơi, tôi muốn liềm cấp cao hái được 3 ô hoặc 3×3 ô một lần, để thu hoạch nhanh khi ruộng lớn.
47. Là người chơi, tôi muốn làm nhiều ô một lần tốn ít thể lực hơn làm từng ô (ví dụ cuốc 3×3 tốn 5 thay vì 9), để việc nâng cấp có giá trị.
48. Là người chơi, tôi muốn thấy trước vùng ô sẽ bị tác động (khung vàng 1 / 3 / 3×3 ô) khi chọn hành động, để không cuốc nhầm.
49. Là người chơi, tôi muốn việc nâng cấp công cụ mất 1 ngày game, trong lúc đó tôi tạm không có công cụ đó, để phải lên kế hoạch.
50. Là người chơi, tôi muốn giỏ chứa có giới hạn (30 → 60 → 120 món). Giỏ đầy thì thu hoạch tiếp sẽ báo "Giỏ đầy, về kho cất đồ", để có lý do quay về kho.
51. Là người chơi, tôi muốn cất đồ từ giỏ vào kho (kho chưa giới hạn ở phase này) và lấy ra lại, để quản lý đồ.
52. Là người chơi, tôi muốn hạt giống, vật tư và công cụ không tính vào sức chứa của giỏ, để giỏ chỉ dùng cho nông sản và sản phẩm.

### Thời gian và vắng nhà
53. Là người chơi, tôi muốn khi mở lại game sau một thời gian vắng, vườn được chạy bù tối đa 8 tiếng rồi dừng, để cây không héo hết nếu tôi đi lâu.
54. Là người chơi, tôi muốn thấy màn "Trong lúc bạn vắng nhà…" tóm tắt mọi chuyện (cây chín, cây héo, trứng mới, con vật đói hay bệnh, trộm, quạ, chó đuổi trộm), để biết ngay cần làm gì.
55. Là người chơi, tôi muốn màn đó cho biết vườn đã đóng băng bao lâu (nếu vắng quá 8 tiếng), để hiểu vì sao cây không lớn thêm.
56. Là người chơi, tôi muốn thấy mùa hiện tại (Xuân, Hạ, Thu, Đông, mỗi mùa 7 ngày game) cạnh ngày giờ trên HUD, để quen với lịch trước khi mùa có ảnh hưởng ở Phase 3.
57. Là người chơi, tôi muốn nút tốc độ x1/x5/x20 vẫn còn khi chơi offline, để thử nhanh.

### Thông báo, Việc cần làm, bản đồ nhỏ
58. Là người chơi, tôi muốn việc gấp (con vật bệnh nặng, có trộm, quạ đang ăn cây) hiện băng rôn đỏ, có âm thanh và rung trên điện thoại, để không bỏ lỡ.
59. Là người chơi, tôi muốn có mũi tên ở mép màn hình chỉ hướng tới chỗ đang có việc gấp, để chạy tới ngay.
60. Là người chơi, tôi muốn việc quan trọng (cây chín, lên cấp, đơn hàng mới) hiện thông báo nhỏ và tự gộp lại ("5 ô cà chua đã chín"), để màn hình không bị ngập.
61. Là người chơi, tôi muốn việc thông tin (nhặt trứng, bán hàng) chỉ ghi vào nhật ký, để không bị làm phiền.
62. Là người chơi, tôi muốn mở bảng "Việc cần làm" thấy mọi việc trong vườn xếp theo mức gấp (bệnh, khô, sâu, cỏ, chín, trứng, máng hết cám…), mỗi dòng có số lượng, để nắm cả vườn trong một cái nhìn.
63. Là người chơi, tôi muốn chạm vào một dòng trong bảng Việc cần làm thì nhân vật tự đi tới chỗ gần nhất có việc đó, kể cả khi đang ở bản đồ khác, để đỡ phải tự tìm.
64. Là người chơi, tôi muốn bản đồ nhỏ ở góc màn hình có chấm đỏ (gấp) và chấm vàng (có việc), chạm vào thì phóng to, để định hướng trong vườn lớn.
65. Là người chơi, tôi muốn tắt từng loại thông báo trong Cài đặt, trừ thông báo gấp, để tùy chỉnh mức làm phiền.

### Hướng dẫn và điện thoại
66. Là người chơi mới, tôi muốn phần hướng dẫn nhanh dẫn qua: cuốc → gieo → tưới → thu hoạch → bỏ vào thùng giao hàng → ra chợ mua hạt → về nhà ngủ, để biết các chỗ mới.
67. Là người chơi, tôi muốn có Sổ tay hướng dẫn trong túi đồ giải thích thể lực, công cụ, chế độ xây dựng, mở đất, thùng giao hàng, để đọc lại khi quên.
68. Là người chơi điện thoại, tôi muốn mọi bảng mới (xây dựng, Việc cần làm, tiệm rèn, thùng giao hàng) không tràn ngang ở màn hình 360px và tránh tai thỏ, để chơi thoải mái.
69. Là người chơi điện thoại yếu, tôi muốn game vẫn mượt (≥ 30 khung hình mỗi giây) với vườn 64×48 ô, để không bị giật.
70. Là người chơi, tôi muốn có chế độ tiết kiệm pin trong Cài đặt (khóa 30 khung hình, tắt hiệu ứng hạt), và được gợi ý bật khi máy chạy chậm, để chơi lâu hơn.

### Người phát triển
71. Là người phát triển, tôi muốn toàn bộ luật của Phase 0 (chuyển bản lưu, luật đặt công trình, mở đất, thể lực, công cụ, thời gian, Việc cần làm, phân loại thông báo, chuyển bản đồ) chạy được trong Node mà không cần trình duyệt, để test nhanh và dùng lại được trên server ở Phase 1.
72. Là người phát triển, tôi muốn dựng mọi tình huống e2e bằng cách ghi sẵn bản lưu, để game không có code nào chỉ dành cho test.
73. Là người phát triển, tôi muốn deploy Phase 0 lên `game.huninna.com` bằng đúng quy trình hiện có, rồi chạy smoke test từ máy local, để biết bản live hoạt động.

## Implementation Decisions

### Mô-đun

- **Luật chơi (`state`).** Vẫn là một API công khai duy nhất cho phần còn lại của game. Bên trong được tách thành các mô-đun con thuần JS, không đụng DOM: bản lưu & chuyển đổi, thời gian, đất & đặt công trình, bản đồ, thể lực, công cụ & giỏ, Việc cần làm & thông báo. Luật cũ (ruộng, vật nuôi, chó, quạ, trộm, đơn hàng, thành tựu) giữ nguyên hành vi, chỉ đổi cách tra vị trí: tra theo thực thể đã đặt thay vì theo lưới cố định.
- **Số liệu (`data`).** Thêm các bảng: công cụ theo cấp (vùng tác động, sức chứa, giá nâng cấp, thời gian nâng cấp), chi phí thể lực theo hành động, số khối ruộng tối đa theo cấp, các dải đất mở rộng (hướng, kích thước, giá, cấp), kích thước và chân đế của từng loại công trình, giá thùng giao hàng, lịch mùa. `SPEC.md` ghi file này "chỉ đọc", nhưng Phase 0 được phép sửa nó.
- **Bố cục (`layout`).** Không còn là bố cục duy nhất của vườn. Giữ ba việc:
  1. Dựng **bố cục khởi đầu** cho vườn mới, và **bố cục chuyển đổi** từ bản cũ.
  2. Định nghĩa bản đồ **trong nhà** và **làng** (hai bản đồ này cố định).
  3. Dựng lưới va chạm từ danh sách thực thể đã đặt.
- **Thế giới (`world`), vẽ (`render`), vòng lặp (`main`).** Thêm chế độ xây dựng (kéo thả, bóng xanh/đỏ, gọi luật đặt công trình của `state`), chuyển cảnh giữa các bản đồ, camera theo kích thước bản đồ hiện tại, vẽ theo khung nhìn với nền tĩnh chia mảng, bản đồ nhỏ, mũi tên chỉ hướng, tự đi tới khi chạm dòng trong bảng Việc cần làm. `world` không tự quyết luật nào.
- **Giao diện (`ui`).** Thêm thanh thể lực, giỏ, mùa trên HUD. Thêm các bảng: chế độ xây dựng (danh sách công trình, Xong/Hủy, lý do không đặt được), Việc cần làm, tiệm rèn, thùng giao hàng, chợ làng (thay sạp và nhà kho cũ), màn "Trong lúc bạn vắng nhà", Sổ tay hướng dẫn. Thêm thông báo 3 mức và cài đặt tắt thông báo, chế độ tiết kiệm pin.
- **Hình (`art`).** Thêm sprite: công cụ 3 cấp, cây bụi và đá ở đất chưa dọn, thùng giao hàng, giường, nội thất nhà tranh tối thiểu, tiệm rèn, chợ làng và nhà của Bà Tư, Ông Sáu, bóng xanh/đỏ khi đặt, mũi tên mép màn hình, biểu tượng thể lực. Giữ nguyên mọi export hiện có.
- **Server.** Không đổi ở phase này. Vẫn là nginx phục vụ file tĩnh.

### Bản lưu v2

- **Khóa lưu mới**, tách khỏi khóa v1. Lần đầu đọc mà chỉ có v1 thì chuyển sang v2 và **giữ nguyên v1**, không xóa. Chuyển lỗi thì báo lỗi và chơi tiếp bằng v1 trên bố cục chuyển đổi, không ghi đè.
- **Có số phiên bản**, và có một chuỗi hàm chuyển đổi theo thứ tự (v1→v2, sau này v2→v3), để Phase 1 dùng lại cho server.
- **Hình dạng chính:**
  - **Thực thể đã đặt:** mỗi cái có id, loại, vị trí ô, kích thước chân đế, dữ liệu riêng.
  - **Khối ruộng:** mỗi khối 9 ô, giữ nguyên cấu trúc ô và cây cũ.
  - **Đất đã mua:** danh sách dải đất, cùng các ô bụi và đá chưa dọn.
  - **Bản đồ và vị trí hiện tại của người chơi.**
  - **Thể lực.**
  - **Công cụ:** cấp từng loại, công cụ đang nâng cấp và lúc xong.
  - **Giỏ và kho.**
  - **Thùng giao hàng.**
  - **Đồng hồ:** thời gian game, giờ vườn đã chạy, mốc đóng băng.
  - **Nhật ký sự kiện lúc vắng nhà**, dùng cho màn tóm tắt.
- **Chuyển từ v1:**
  - 36 ô cũ thành 4 khối 3×3 ở đúng chỗ lưới cũ. Ô chưa mở ở v1 thì khối đó vẫn có, nhưng các ô chưa mở được đánh dấu khóa. Mở ô vẫn theo thứ tự cũ cho tới khi cả khối mở hết. Như vậy không ai mất đất hay mất tiền đã bỏ ra.
  - Chuồng, giếng, kho, ổ ấp, chuồng chó, bảng đơn hàng, đồ trang trí thành thực thể đã đặt ở vị trí cũ.
  - Sạp hàng cũ bị bỏ khỏi vườn (chợ ra làng). Thêm thùng giao hàng cạnh nhà kho.
  - Vườn cũ 34×27 được đặt vào giữa bản đồ mới và tính là đất đã mua.
  - Thể lực đầy. Công cụ ở cấp 1, riêng bình tưới giữ số nước đang có.

### Luật đặt công trình

- **Một hàm kiểm tra duy nhất** nhận (bản lưu, loại công trình, vị trí). Kết quả là hợp lệ, hoặc không hợp lệ kèm một lý do cố định trong danh sách: chồng lên công trình khác, ngoài đất đã mua, đè lên bụi hay đá chưa dọn, chặn đường từ cổng vào cửa nhà, vượt số khối ruộng tối đa.
- **Kiểm tra chặn đường** bằng tìm đường trên lưới va chạm như thể công trình đã đặt.
- **Đặt, dời, cất đi** đều gọi hàm kiểm tra trước. Dời khối ruộng thì giữ nguyên trạng thái các ô. Dời chuồng thì dời con vật theo, và con vật hoảng một lúc.

### Thời gian

- **Đồng hồ trừu tượng hóa.** Offline thì dùng đồng hồ local như hiện tại, kèm tốc độ x1/x5/x20. Phase 1 sẽ thay bằng đồng hồ server mà không đổi luật chơi.
- **Chạy bù tối đa 8 tiếng** (giữ mức hiện có). Phần vượt quá thì không chạy, ghi lại khoảng đóng băng cho màn tóm tắt.
- **"Giờ vườn đã chạy"** là một bộ đếm riêng. Chỉ tăng khi mô phỏng thật sự chạy, kể cả lúc chạy bù. Từ Phase 2 tuổi con vật dựa vào bộ đếm này.
- **Lịch mùa** tính từ số ngày game. Phase 0 chỉ hiển thị, chưa ảnh hưởng gì.
- **Lịch ngoài đời:** thêm tiện ích "ngày ngoài đời hiện tại" để dùng cho nhiệm vụ hằng ngày sau này. Phase 0 chưa có nhiệm vụ.

### Thể lực và công cụ

- **Thể lực 0–100.**
  - Mỗi hành động có chi phí trong bảng số liệu. Hành động nhiều ô tính theo bảng giảm giá.
  - Hết thể lực: thời gian làm một hành động và tốc độ đi nhân 2. Luật chơi trả ra hệ số này để phần thế giới áp dụng.
  - Ngủ: chỉ được sau 18h. Offline thì tua tới 6h và hồi đầy.
  - Ghế đá: hồi chậm theo thời gian ngồi.
  - Mỗi sáng: tự hồi một ít.
- **Vùng tác động của công cụ:**
  - Mỗi công cụ có kiểu vùng (1 ô, 1 hàng 3 ô theo hướng nhìn, 3×3 lấy ô mục tiêu làm tâm).
  - Hành động áp lên mọi ô hợp lệ trong vùng. Ô không hợp lệ thì bỏ qua, không lỗi.
  - Danh sách hành động trả thêm danh sách ô sẽ bị tác động, để vẽ khung xem trước.
- **Nâng cấp công cụ:** trừ xu ngay, công cụ đó tạm không dùng được, xong sau 1 ngày game thì có thông báo. Mỗi lúc chỉ nâng được 1 công cụ.
- **Giỏ:**
  - Nông sản và sản phẩm thu được vào giỏ trước. Hạt giống, vật tư và thức ăn không tính vào sức chứa.
  - Giỏ đầy thì việc thu hoạch bị khóa, kèm lý do.
  - Ở nhà kho có hành động "Cất hết vào kho".
  - Bán ở chợ và bỏ vào thùng giao hàng lấy đồ từ giỏ lẫn từ kho.

### Thùng giao hàng và chợ

- **Thùng giao hàng:**
  - Đồ trong thùng được chốt giá lúc 6h sáng hôm sau, theo 80% giá chợ. Phase 0 giá chợ chưa biến động, nên bằng giá bán hiện tại.
  - Trước lúc đó lấy lại đồ được.
- **Chợ làng** dùng lại logic mua bán hiện có. Mở 6h–18h. Ngoài giờ thì hành động bị khóa, kèm lý do.

### Việc cần làm và thông báo

- **Một hàm thuần** nhận bản lưu và trả về danh sách việc. Mỗi việc có loại, mức (gấp / quan trọng), số lượng, bản đồ, và vị trí gần người chơi nhất. Bảng Việc cần làm, bản đồ nhỏ và mũi tên chỉ hướng đều đọc từ danh sách này.
- **Mọi sự kiện mà luật chơi phát ra đều có mức** (gấp / quan trọng / thông tin) và khóa gộp. Giao diện gộp các sự kiện cùng khóa trong một khoảng ngắn, rồi lọc theo cài đặt. Sự kiện gấp không tắt được.

### Hiệu năng

- Chỉ vẽ trong khung nhìn. Nền tĩnh chia mảng, chỉ vẽ lại mảng nào vừa có công trình thay đổi.
- Con vật ngoài màn hình cập nhật AI 2 lần mỗi giây.
- Đo thử trên điện thoại Android tầm thấp thật, với vườn 64×48 ô.

## Testing Decisions

- **Test tốt** chỉ kiểm tra hành vi nhìn thấy được từ bên ngoài, qua đúng seam đã chốt. Không test hàm nội bộ, không test cấu trúc bên trong của mô-đun con. Test mô tả tình huống người chơi gặp, ví dụ "dời khối ruộng đang có cây thì cây giữ nguyên tiến độ".
- **Seam 1: API công khai của luật chơi**, test bằng `node --test`. Đây là nơi test chính, cùng kiểu với bộ `tests/state.test.mjs` hiện có (25 test, dựng state bằng `createGame` rồi gọi `tick`/`perform`). Cần thêm:
  - **Chuyển bản lưu:** dùng vài bản lưu v1 mẫu (mới tạo, đang chơi dở có cây và con vật, đã mở hết 36 ô). Không mất xu, đồ, cây, con vật. Chạy chuyển hai lần cho cùng kết quả. Bản lưu lỗi thì không ghi đè.
  - **Luật đặt công trình:** mỗi lý do không hợp lệ có ít nhất một test. Test riêng trường hợp chặn đường. Dời khối ruộng và dời chuồng giữ nguyên trạng thái.
  - **Mở đất:** dải đất theo cấp và giá, dọn bụi và đá được gỗ và đá, giới hạn 64×48 ô.
  - **Thể lực:** chi phí, hệ số chậm khi hết thể lực, ngủ (giờ, tua tới 6h, hồi đầy), ghế đá, hồi buổi sáng.
  - **Công cụ:** vùng 1 / 3 / 3×3, bỏ qua ô không hợp lệ, giảm giá thể lực, nâng cấp mất 1 ngày, giỏ đầy.
  - **Thời gian:** chạy bù tối đa 8 tiếng, ghi khoảng đóng băng, bộ đếm giờ vườn đã chạy, lịch mùa.
  - **Thùng giao hàng và chợ:** chốt giá lúc 6h, lấy lại đồ, giờ mở cửa.
  - **Việc cần làm:** đủ loại việc, xếp đúng mức, vị trí gần nhất.
  - **Mức và khóa gộp của sự kiện.**
  - **Chuyển bản đồ:** cửa, cổng, vị trí khi tải lại.
  - **Toàn bộ 25 test cũ vẫn phải pass**, chỉ sửa phần dựng vị trí cho hợp bố cục mới.
- **Seam 2: trình duyệt thật qua Playwright**, chạy local, Chromium ẩn cửa sổ, 1 luồng, ở hai cỡ màn hình (máy tính và điện thoại 360px). Tình huống được dựng bằng **bản lưu ghi sẵn vào `localStorage`**. Thời gian được tua bằng cách **lùi `savedAt`** rồi tải lại trang. Không có hook test trong game. Các kịch bản:
  - **Người chơi mới:** tạo nhân vật, làm hết các bước hướng dẫn.
  - **Mở game với bản lưu v1:** thấy thông báo, vườn còn nguyên.
  - **Chế độ xây dựng:** kéo thả hợp lệ và không hợp lệ (thấy lý do), Xong và Hủy, cả bằng chuột lẫn chạm.
  - **Chuyển bản đồ:** vào nhà ngủ, ra làng mua hạt và nâng cấp công cụ, về vườn.
  - **Thùng giao hàng:** sau khi tua qua 6h thì nhận được xu.
  - **Bảng Việc cần làm:** chạm một dòng thì nhân vật tới đúng chỗ.
  - **Thông báo gấp:** dựng bản lưu có quạ đang ăn cây, thấy băng rôn đỏ và mũi tên.
  - **Màn "Trong lúc bạn vắng nhà":** lùi `savedAt` 12 tiếng thì thấy tóm tắt và thông tin đóng băng.
  - **Điện thoại 360px:** không có bảng nào tràn ngang.
- **Smoke test live** sau khi deploy, chạy từ máy local tới `https://game.huninna.com`:
  - Trang tải được, không có lỗi trong console.
  - Tạo nhân vật được, gieo một ô được.
  - Đi vào làng và đi về được.
  - Xóa dữ liệu trình duyệt của test sau khi chạy.
- **Unit test** chạy liên tục khi đang phát triển. **E2E và smoke** chạy trước và sau mỗi lần deploy.

## Out of Scope

- **Mọi thứ online** (Phase 1): tài khoản, server Node, WebSocket, đồng hồ chung, thăm vườn bạn, giúp và trộm của người chơi. Cổng vào vườn bạn bè trong làng chỉ có biển "Sắp ra mắt".
- **Chiều sâu vật nuôi** (Phase 2): vòng đời 4 giai đoạn, đực/cái, dơ/tắm, bệnh chết, chuồng 3 cấp phải xây, thả rông, kẻ săn mồi, mèo, dạy lệnh. Chuồng hiện có giữ nguyên luật cũ, chỉ dời được.
- **Cây và nước** (Phase 3): cây mới, mùa ảnh hưởng tới cây, thời tiết xấu, nhà kính, nâng cấp giếng, bồn, ống nước, tự động hóa. Phase 0 không có luật "trong tầm ống nước".
- **Kinh tế** (Phase 4): sức mua và rớt giá, hóa đơn, hao mòn, giới hạn kho, đồ hư, kho lạnh, máy chế biến, cư dân ❤️, nhân công, hội chợ, Tiếng tăm ⭐.
- **Nhà đầy đủ** (Phase 5): đặt nội thất, các cấp nhà, bếp, ăn uống hồi thể lực, thú cưng cảnh, quần áo có tác dụng. Phase 0 chỉ có nội thất cố định tối thiểu với một chiếc giường.
- **Loài và khu mới** (Phase 6), **nhiệm vụ, lễ hội, sổ sưu tầm** (Phase 7).

## Further Notes

- **Quy trình làm:**
  - **Opus:** chốt hợp đồng API giữa các mô-đun và hình dạng bản lưu v2 trước.
  - **Sonnet:** các agent LOGIC, WORLD, UI, ART làm song song, mỗi agent một worktree riêng.
  - **Haiku:** viết kịch bản e2e và dựng các bản lưu mẫu.
  - Opus gộp code, chạy hết unit và e2e trên máy local, deploy, rồi chạy smoke test live (ADR 0008).
- **Cần sửa `SPEC.md`:** đang ghi `data.js`/`layout.js` là chỉ đọc, và `server.js` không được sửa. Phase 0 sẽ ghi lại vai trò mới cho các file đó.
- **Số liệu cụ thể** (giá dải đất, chi phí thể lực, giá nâng cấp công cụ) lấy theo `DESIGN.md` nếu có, phần còn thiếu đặt tạm rồi cân bằng khi chơi thử.
- **`server.js` cũ vẫn hỏng import và không được dùng.** Phase 1 sẽ viết lại.
