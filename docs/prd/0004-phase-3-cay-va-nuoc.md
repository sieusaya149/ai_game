# PRD 0004: Phase 3, cây trồng và nước

Nguồn: `DESIGN.md` mục 0b (thời tiết xấu), 1 (cây trồng: 1.1–1.5), 3 (đất, nước và tự động hóa: 3.1, 3.1b, 3.2, 3.3, 3.4), 8a (tiến trình), 8c (hướng dẫn người mới). Liên quan các ADR 0003, 0004, 0005, 0008, 0014, 0015.

## Problem Statement

Sau Phase 0–2, ruộng vẫn là phần đơn giản nhất của game:

- Chỉ có 8 loại cây, và cả 8 cây dùng chung hình mầm, cây non và ra hoa. Chỉ lúc chín mới nhìn ra là cây gì.
- Trồng cải lần thứ 100 cũng y như lần đầu. Không có cấp thành thạo, không có trái khổng lồ, không có nông sản ngon hơn khi chăm kỹ.
- HUD đã hiện mùa (Phase 0) nhưng mùa không ảnh hưởng gì. Thời tiết chỉ có nắng, mưa, mây; không có bão, hạn hán hay sương muối để lo trước.
- Nước chỉ có giếng một cấp và bình tưới. Ruộng lớn bao nhiêu cũng phải tưới tay từng lần, không có cách tự động hóa nào để tiêu xu.
- Cây chết hay héo chỉ bị nhổ bỏ, không quay lại thành phân bón.

Kết quả là người chơi lâu năm thấy làm ruộng lặp lại, còn xu dồn lên vì không có chỗ đầu tư lâu dài.

## Solution

Sau Phase 3:

- **16 loại cây, mỗi cây một bộ hình riêng cho cả 5 giai đoạn** hạt → mầm → cây non → ra hoa/trái non → chín, kể cả lúc bệnh, héo, chết. Mỗi mùa có 4 cây hợp mùa.
- **Cấp thành thạo 3 cấp mỗi loại cây:** cấp 2 được +1 sản lượng và 10% trái khổng lồ; cấp 3 được +2 sản lượng, 20% trái khổng lồ, kháng sâu hơn và tự để giống.
- **Trái khổng lồ:** hình to tràn ra ngoài ô, lấp lánh, bán ×3, không trộm được, chiếm 5 chỗ trong giỏ.
- **Chất lượng ★1–3:** chăm kỹ suốt vụ (không lúc nào khô hẳn, không để sâu quá 30 giây, có bón phân) thì ra ★2 (×1.5) hay ★3 (×2). Túi, kho, đơn hàng và thùng giao hàng phân biệt theo sao.
- **Mùa có tác dụng:** trái mùa lớn chậm ×0.6 và không ra ★3; đúng mùa 10% thêm sản lượng. Đổi mùa giữa vụ thì cây chỉ lớn chậm lại, không chết.
- **Thời tiết xấu, báo trước 1 ngày** qua radio trong nhà và bảng tin làng: bão (đổ bù nhìn, con vật ngoài trời mất vui, có thể mất điện nửa ngày), hạn hán (đất khô nhanh ×2, giếng hồi chậm), sương muối (cây hạt và mầm ngừng lớn 1 ngày), cầu vồng (con vật vui hơn). **Thời tiết xấu không bao giờ giết cây hay con vật.** Phủ rơm để giữ ẩm và chống sương muối.
- **Nhà kính** phủ lên một khối 3×3: bỏ qua mùa (★3 quanh năm), không bị sương muối, bão hay quạ. Mái phủ kín khi đứng ngoài, có bảng trạng thái ở cửa; bước vào thì mái mờ dần.
- **Giếng 4 cấp:** Giếng đất → Giếng xây → Bơm tay → Máy bơm, bình tưới chứa 10 → 15 → 25 → 40 lần. Máy bơm có **bồn chứa** 200 lần nước, thêm bồn phụ +150.
- **Mạng nước (ADR 0015):** công trình trong 8 ô quanh bồn hoặc trạm bơm phụ thì có nước. Chế độ xây dựng hiện vùng phủ màu xanh và mực nước trong bồn.
- **Tự động hóa theo khối 3×3:** tưới nhỏ giọt (đất khô thì tự tưới bằng nước bồn), phun thuốc tự động (có sâu thì sau 20 giây tự phun, trừ thuốc trong kho), đất màu mỡ (cỏ mọc chậm, thêm sản lượng). Máy bơm, máy phun tốn tiền điện mỗi ngày, trừ lúc 6h sáng.
- **Vòi sen cho chuồng cấp 3** (để chỗ từ Phase 2) nay chạy bằng nước bồn: mỗi sáng tự tắm cả chuồng.
- **Hố ủ phân:** bỏ cây héo, cây chết, phân chuồng, phân chó vào; vài ngày sau thành phân bón.

## User Stories

### Cây và hình riêng

1. As a người chơi, I want mỗi loại cây có hình riêng ở cả 5 giai đoạn, so that nhìn ruộng là biết cây gì đang lớn tới đâu.
2. As a người chơi, I want cải xanh có 2 lá mầm tròn, rồi bụi lá xòe, rồi ngồng hoa vàng, so that cây trông như thật.
3. As a người chơi, I want cà rốt có lá lông chim và ngọn cam ló khỏi đất khi gần chín, so that biết sắp được nhổ.
4. As a người chơi, I want lúa từ mạ xanh thành bụi lúa rồi bông lúa trĩu vàng, so that ruộng lúa đẹp.
5. As a người chơi, I want cà chua, dưa hấu, bí ngô có dây leo bò, hoa vàng, trái non xanh rồi đổi màu, so that cây dây có nét riêng.
6. As a người chơi, I want bắp thân cao dần, ra cờ, ra trái có râu, so that bắp khác hẳn cây khác.
7. As a người chơi, I want cây bệnh, héo, chết theo dáng của từng cây (lá vàng, rũ xuống), so that nhận ra cây nào đang có vấn đề.
8. As a người chơi, I want có thêm 8 cây mới: hành lá, đậu phộng, rau muống, dưa leo, khoai lang, ớt, su hào, bắp cải, so that có nhiều lựa chọn theo mùa.
9. As a người chơi, I want mua hạt cây mới ở chợ Bà Tư theo cấp người chơi, so that cây mới mở dần.

### Cấp thành thạo

10. As a người chơi, I want mỗi loại cây có cấp thành thạo 1–3 tăng theo số lần thu hoạch, so that trồng lâu một loại có thưởng.
11. As a người chơi, I want ngưỡng lên cấp theo nhóm cây (ngắn ngày 20/60 lần, trung bình 12/35, dài ngày 8/25), so that cây dài ngày không bị thiệt.
12. As a người chơi, I want cấp 2 được +1 sản lượng và 10% trái khổng lồ, so that thấy rõ tiến bộ.
13. As a người chơi, I want cấp 3 được +2 sản lượng, 20% trái khổng lồ, kháng sâu hơn và 30% được lại 1 hạt mỗi lần thu, so that cây thành thạo gần như tự nuôi mình.
14. As a người chơi, I want cấp thành thạo áp dụng cho mọi lần trồng sau và giữ mãi mãi, so that không mất công.
15. As a người chơi, I want thấy cấp thành thạo và tiến độ lên cấp khi chọn hạt, so that biết mình còn bao lâu.
16. As a người chơi, I want có thông báo và màn chúc mừng khi một loại cây lên cấp thành thạo, so that thấy tự hào.

### Trái khổng lồ

17. As a người chơi, I want thỉnh thoảng thu được trái khổng lồ hình to tràn ra ngoài ô và lấp lánh, so that có bất ngờ khi thu hoạch.
18. As a người chơi, I want trái khổng lồ bán giá ×3 và dùng cho đơn hàng đặc biệt, so that đáng giá.
19. As a người chơi, I want trái khổng lồ không trộm được, so that bạn bè không lấy mất.
20. As a người chơi, I want trái khổng lồ chiếm 5 chỗ trong giỏ, so that phải tính khi mang về.
21. As a người chơi, I want tỉ lệ trái khổng lồ cao nhất khi có cả thành thạo 3 lẫn ★3, so that chăm kỹ có thưởng lớn.

### Chất lượng ★

22. As a người chơi, I want nông sản có sao ★1–3 tùy chăm sóc trong vụ, so that chăm kỹ được trả công.
23. As a người chơi, I want biết "chăm kỹ" là không lúc nào khô hẳn, không để sâu quá 30 giây, có bón phân, so that biết cách lên sao.
24. As a người chơi, I want thấy trên ô ruộng vụ này đang giữ được mấy sao, so that biết lúc nào lỡ mất sao.
25. As a người chơi, I want ★2 bán ×1.5, ★3 bán ×2, so that sao có giá trị rõ.
26. As a người chơi, I want túi, kho, giỏ, đơn hàng, thùng giao hàng và chợ phân biệt nông sản theo sao, so that bán đúng giá.
27. As a người chơi, I want máy móc chỉ giữ được tối đa ★2, cần ít nhất một lần chăm tay trong vụ mới ra ★3, so that tự tay làm vẫn có ý nghĩa.

### Mùa

28. As a người chơi, I want mỗi mùa có 4 cây hợp mùa (Xuân: cải, hành lá, dâu, đậu phộng; Hạ: rau muống, dưa leo, bắp, dưa hấu; Thu: lúa, khoai lang, bí ngô, ớt; Đông: cà rốt, cà chua, su hào, bắp cải), so that mỗi mùa trồng khác nhau.
29. As a người chơi, I want cây trái mùa vẫn trồng được nhưng lớn chậm ×0.6 và không ra ★3, so that mùa chỉ làm chậm chứ không cấm.
30. As a người chơi, I want cây đúng mùa có 10% được thêm sản lượng, so that trồng đúng mùa có lợi.
31. As a người chơi, I want đổi mùa giữa vụ thì cây không chết, chỉ lớn chậm lại, so that không bị phạt bất ngờ.
32. As a người chơi, I want hạt giống ở chợ có nhãn "đúng mùa", so that chọn nhanh.
33. As a người chơi mới, I want mùa chưa ảnh hưởng tới cây cho tới cấp 5, so that buổi đầu đơn giản.
34. As a người chơi, I want nhiệm vụ làm quen của Bà Tư đầu mùa thứ 2 giải thích mùa, so that hiểu hệ thống.

### Thời tiết xấu

35. As a người chơi, I want nghe radio trong nhà hoặc xem bảng tin làng biết thời tiết ngày mai, so that chuẩn bị trước.
36. As a người chơi online, I want cả làng cùng một thời tiết, so that bạn bè cùng chống bão.
37. As a người chơi, I want bão (~5% số ngày Hạ và Thu) làm đổ bù nhìn và con vật ngoài trời mất vui, so that bão có hậu quả.
38. As a người chơi, I want bão có thể làm mất điện nửa ngày (máy bơm, máy phun ngừng), so that biết vì sao máy không chạy.
39. As a người chơi, I want lùa con vật vào chuồng trước bão thì chúng không mất vui, so that chuẩn bị có ích.
40. As a người chơi, I want hạn hán (1 đợt mỗi mùa Hạ, 2–3 ngày) làm đất khô nhanh gấp 2 và giếng hồi nước chậm, so that nâng giếng và bồn có lý do.
41. As a người chơi, I want sương muối (~15% buổi sáng Đông) làm cây hạt và mầm ngừng lớn 1 ngày, so that mùa đông khác các mùa khác.
42. As a người chơi, I want cầu vồng thỉnh thoảng hiện sau mưa và làm con vật vui hơn, so that có ngày đẹp.
43. As a người chơi, I want thời tiết xấu không bao giờ giết cây hay con vật, so that không bao giờ mất trắng vì trời.
44. As a người chơi, I want phủ rơm lên ô để giữ ẩm trong hạn hán và chống sương muối, so that có cách chống rẻ.
45. As a người chơi, I want thời tiết hiện trên HUD với icon riêng, so that biết hôm nay trời gì.

### Nhà kính

46. As a người chơi cấp 14, I want xây nhà kính phủ lên một khối ruộng 3×3, tối đa 2 cái mỗi vườn, so that có mục tiêu lớn để tiêu xu.
47. As a người chơi, I want ô trong nhà kính bỏ qua mùa (★3 quanh năm), không bị sương muối, bão hay quạ, so that nhà kính đáng tiền.
48. As a người chơi, I want nhà kính tốn điện sưởi mùa đông, so that có chi phí duy trì.
49. As a người chơi, I want bão có tỉ lệ thấp làm vỡ kính phải sửa, so that nhà kính không hoàn hảo.
50. As a người chơi, I want đứng ngoài thì mái phủ kín và có bảng trạng thái ở cửa (💧 khô · 🐛 sâu · ✨ chín · 🥀 héo), so that biết bên trong cần gì mà không phải vào.
51. As a người chơi, I want có việc gấp thì bong bóng nhấp nháy trên mái, so that không bỏ lỡ.
52. As a người chơi, I want bước vào cửa nhà kính thì mái mờ dần rồi ẩn, so that làm việc bên trong như ruộng thường.
53. As a khách online, I want thấy nhà kính của bạn y như chủ thấy, so that trải nghiệm giống nhau.
54. As a khách, I want trộm vẫn vào được nhà kính qua cửa, so that nhà kính không phải pháo đài.

### Giếng, bồn và mạng nước

55. As a người chơi, I want nâng giếng qua 4 cấp (Giếng đất, Giếng xây, Bơm tay, Máy bơm) để bình tưới chứa 10, 15, 25, 40 lần, so that tưới tay đỡ mệt.
56. As a người chơi, I want giếng xây múc nhanh hơn, so that cấp 2 có cảm giác khác.
57. As a người chơi, I want máy bơm có bồn chứa 200 lần nước, so that có nước cho máy tự động.
58. As a người chơi, I want xây thêm bồn phụ +150 lần mỗi bồn, so that vườn lớn đủ nước.
59. As a người chơi, I want giếng bơm đầy bồn khoảng 20 lần mỗi giờ, hạn hán thì một nửa, so that hiểu giới hạn nước.
60. As a người chơi, I want bồn hiện mực nước, so that biết còn bao nhiêu.
61. As a người chơi, I want công trình trong 8 ô quanh bồn mới có nước, so that phải sắp xếp vườn hợp lý.
62. As a người chơi, I want xây trạm bơm phụ để thêm 8 ô tầm nước (tốn điện), so that ruộng xa vẫn có nước.
63. As a người chơi, I want chế độ xây dựng hiện đường ống và vùng phủ nước màu xanh, so that thấy chỗ nào có nước.
64. As a người chơi, I want đặt công trình cần nước ngoài tầm thì bị từ chối với lý do "ngoài tầm nước", so that không đặt nhầm.
65. As a người chơi, I want bồn cạn thì máy ngừng chứ không phạt gì, so that không bị mất cây vì quên.

### Tự động hóa

66. As a người chơi, I want mua tưới nhỏ giọt cho cả khối 3×3, đất khô thì tự tưới bằng nước bồn, so that ruộng lớn không phải tưới tay.
67. As a người chơi, I want mua phun thuốc tự động cho cả khối, có sâu thì sau 20 giây tự phun và trừ thuốc trong kho, so that sâu không phá ruộng lúc vắng.
68. As a người chơi, I want nâng đất màu mỡ cho cả khối để cỏ mọc chậm và thêm sản lượng, so that đầu tư đất lâu dài.
69. As a người chơi, I want thấy trên mỗi khối ruộng biểu tượng các nâng cấp đã có, so that nhớ khối nào có gì.
70. As a người chơi, I want máy bơm và máy phun tốn tiền điện mỗi ngày, trừ lúc 6h sáng và ghi vào nhật ký, so that tự động hóa có giá.
71. As a người chơi, I want tiền điện chỉ tính cho thời gian vườn thật sự chạy, không tính lúc đóng băng, so that vắng nhà không bị tính oan.
72. As a người chơi, I want không đủ xu trả tiền điện thì máy ngừng tới khi đủ, so that không bị nợ.
73. As a người chơi, I want vòi sen ở chuồng cấp 3 mỗi sáng tự tắm cả chuồng bằng nước bồn (+5 vui), so that đỡ việc tắm.
74. As a người chơi, I want tưới tự động và tắm tự động vẫn chạy khi offline và khi server chạy bù, so that vắng nhà ruộng vẫn được tưới.

### Hố ủ phân

75. As a người chơi, I want xây hố ủ phân, so that tận dụng đồ bỏ đi.
76. As a người chơi, I want bỏ cây héo, cây chết, phân chuồng, phân chó vào hố ủ, so that không phải vứt.
77. As a người chơi, I want vài ngày game sau lấy ra phân bón, so that có phân bón miễn phí.
78. As a người chơi, I want phân bón từ hố ủ được tính là "có bón phân" cho ★, so that vòng lặp phân → cây khép kín.

### Hướng dẫn, thông báo và người chơi cũ

79. As a người chơi, I want thông báo 🟡 khi cây lên cấp thành thạo và khi thu được trái khổng lồ, so that không bỏ lỡ.
80. As a người chơi, I want thông báo 🟡 khi bồn sắp cạn và khi hết tiền điện, so that biết máy sắp ngừng.
81. As a người chơi, I want bảng Việc cần làm có thêm "bồn cạn", "hố ủ đã xong", so that biết việc mới.
82. As a người chơi, I want sổ tay có trang mùa, ★, thành thạo, thời tiết, nhà kính, nước và tự động hóa, so that tra cứu khi quên.
83. As a người chơi cũ, I want cây đang trồng dở và nông sản trong túi được giữ nguyên (thành ★1), so that cập nhật không mất gì.
84. As a khách online, I want trộm được cây chín có sao, nhưng không trộm được trái khổng lồ, so that luật trộm khớp với hệ thống mới.

## Implementation Decisions

- **Bản lưu v4.** Ô ruộng có thêm theo dõi chất lượng vụ (đã khô hẳn chưa, sâu lâu nhất, có bón phân, có chăm tay), phủ rơm; nông sản có sao (túi, giỏ, kho, thùng giao hàng, đơn hàng tách theo sao); thêm cấp thành thạo theo loại cây, giếng có cấp, bồn chứa và mực nước, nâng cấp theo khối ruộng, nhà kính, hố ủ. Thêm bước chuyển v3→v4 thuần, không ngẫu nhiên: đồ cũ thành ★1, thành thạo bắt đầu từ cấp 1 với số lần thu hoạch lấy từ thống kê đã có, giếng cấp 1.
- **Cây trong bảng số liệu:** 16 cây, mỗi cây có mùa hợp, nhóm thời gian (ngắn/trung bình/dài) cho ngưỡng thành thạo, cấp mở khóa, giá. 8 cây cũ giữ id và số liệu, chỉ thêm mùa và nhóm.
- **Thời tiết là hàm thuần (ADR 0014):** thời tiết của một ngày tính từ số ngày game và hạt giống (của làng khi online, của vườn khi offline), đọc bảng tần suất theo mùa. Radio và bảng tin chỉ việc gọi hàm cho ngày mai. Mưa, mây và nắng của Phase 0 chuyển vào cùng hàm này.
- **Mạng nước là ngân sách theo giờ (ADR 0015):** bồn là một con số; giếng bơm thêm theo giờ vườn chạy; tưới nhỏ giọt, vòi sen trừ theo thứ tự cố định mỗi lượt tick. Vùng phủ 8 ô quanh bồn và trạm bơm phụ. `canPlace` thêm lý do "ngoài tầm nước" cho công trình cần nước (ADR 0005).
- **Nâng cấp gắn theo khối ruộng 3×3:** tưới nhỏ giọt, phun thuốc tự động, đất màu mỡ, nhà kính là thuộc tính của thực thể khối ruộng, nên dời khối thì nâng cấp đi theo.
- **Nhà kính** là thực thể phủ đúng footprint của một khối ruộng, có cửa. Hiển thị mái dùng cơ chế mới "công trình có mái": render ẩn mái khi người chơi đứng trong footprint; bảng trạng thái ở cửa tóm tắt các ô bên trong. Khách online thấy như chủ.
- **Tiền điện hằng ngày:** trừ lúc 6h sáng game, chỉ cho thời gian vườn chạy, ghi nhật ký. Không đủ xu thì máy ngừng. Phase 4 sẽ gom vào hóa đơn tháng (ngoài phạm vi).
- **Chất lượng ★:** luật theo dõi trong vụ ở mỗi ô; máy móc tự tưới/phun giới hạn ★2 nếu cả vụ không có lần chăm tay nào. Giá bán nhân theo sao. Thùng giao hàng và đơn hàng đọc sao.
- **Trái khổng lồ:** là một sản phẩm riêng theo loại cây, chiếm 5 chỗ giỏ, giá ×3; luật trộm (Phase 1) thêm "không trộm được trái khổng lồ".
- **Hố ủ phân:** công trình nhận vật phẩm hữu cơ, sau vài ngày game cho phân bón. Phân chuồng từ Phase 2 và phân chó hiện có là đầu vào.
- **Bảo hộ người mới:** dưới cấp 5 mùa chưa làm chậm cây, chưa có thời tiết xấu.
- **Pixel art (Opus):** 16 cây × 5 giai đoạn + bệnh/héo/chết theo dáng từng cây, trái khổng lồ, nông sản 16 loại với viền sao, thời tiết (mưa bão, nắng gắt, sương, cầu vồng), bù nhìn đổ, giếng 4 cấp, bồn, trạm bơm, đường ống, ống nhỏ giọt, máy phun, đất màu mỡ, nhà kính có mái và bảng trạng thái, hố ủ, rơm phủ, radio.

## Testing Decisions

- **Test tốt** chỉ kiểm hành vi qua API công khai của `state.js` và những gì người chơi thấy (ADR 0008). Không có hook test. Thời tiết kiểm bằng hạt giống cố định.
- **Seam 1 – `state.js` (node --test):** chuyển v3→v4 giữ nguyên cây đang lớn và đồ trong túi (prior art: `tests/save-v2.test.mjs`); thành thạo lên đúng ngưỡng theo nhóm cây và cho đúng thưởng; tỉ lệ trái khổng lồ theo cấp (thống kê nhiều lượt); ★ theo từng điều kiện chăm kỹ, máy chỉ tới ★2; mùa ×0.6 và +10%, đổi mùa giữa vụ không chết; hàm thời tiết cho cùng kết quả với cùng hạt giống, đúng tần suất theo mùa, và báo trước ngày mai; sương muối dừng cây hạt và mầm 1 ngày; hạn hán đất khô ×2; **không thời tiết nào giết cây hay con vật**; giếng 4 cấp và sức chứa bình tưới; bồn bơm theo giờ vườn chạy, hạn hán một nửa, cạn thì máy ngừng; vùng phủ 8 ô và lý do "ngoài tầm nước" khi đặt; tưới nhỏ giọt và phun tự động chạy cả khi chạy bù offline; tiền điện trừ lúc 6h và không tính lúc đóng băng; nhà kính bỏ qua mùa và quạ; hố ủ cho phân bón; luật trộm từ chối trái khổng lồ.
- **Seam 3 – giao thức server:** server chạy bù vườn có tưới nhỏ giọt trong hạn hán thì kết quả giống hệt chạy bù trên trình duyệt với cùng bản lưu.
- **Seam 2 – Playwright (desktop + 360px):** trồng cây đúng mùa và thấy hình riêng từng giai đoạn; nghe radio báo bão ngày mai; xây máy bơm và bồn, thấy vùng phủ xanh trong chế độ xây dựng, đặt máy phun ngoài tầm thì bị từ chối; mua tưới nhỏ giọt cho một khối, tua thời gian thì ô tự được tưới; vào nhà kính thì mái mờ đi, ra ngoài thì thấy bảng trạng thái; thu hoạch ★3 và bán đúng giá; bỏ cây chết vào hố ủ rồi lấy phân bón. Prior art: `e2e/offline-harvest.spec.mjs`, `e2e/build.spec.mjs`.

## Out of Scope

- Hóa đơn tháng, hao mòn và sửa chữa máy, bù nhìn, hàng rào, nhà kính (Phase 4). Phase 3 chỉ cần dựng lại bù nhìn bị bão làm đổ và sửa kính vỡ bằng xu.
- Máy chế biến, kho lạnh, đồ hư (Phase 4).
- Nhân công tưới, thu hoạch (Phase 4).
- Cây ăn trái, hồ cá, ong thụ phấn (Phase 6). Gãy cành cây ăn trái do bão đi cùng cây ăn trái.
- Máy phát điện chống mất điện (Phase 4).
- Thi trái khổng lồ ở lễ hội, sổ sưu tầm (Phase 7).
- Đơn hàng đặc biệt dùng trái khổng lồ chỉ cần có một loại đơn đơn giản; đơn của cư dân đầy đủ thuộc Phase 4.

## Further Notes

- 16 cây × 5 giai đoạn × trạng thái là khối pixel art lớn. Nên giao cho nhiều agent Opus theo nhóm mùa, kèm trang xem sprite như `_sprites2.html`.
- Thứ tự trừ nước cố định (ADR 0015) và thời tiết theo hạt giống (ADR 0014) là điều kiện để server chạy bù ra cùng kết quả. Test ở seam 3 phải khóa điều này.
- Các con số (tần suất thời tiết, tốc độ bơm, giá điện, ngưỡng thành thạo) lấy từ `DESIGN.md`, sẽ cân bằng lại khi chơi thử, nhất là mục tiêu "điện nước + sửa chữa chiếm 15–25% thu nhập" của Phase 4.
