# PRD 0003: Phase 2, vật nuôi

Nguồn: `DESIGN.md` mục 2 (vật nuôi: 2.1, 2.1b, 2.2, 2.3, 2.4, 2.5), 0c (thú cưng), 6.0 và 6.1 (dạy lệnh chó, trộm NPC), 6b (cư dân làng), 8c (hướng dẫn người mới). Liên quan các ADR 0002, 0003, 0004, 0005, 0008, 0013.

## Problem Statement

Sau Phase 0 và 1, con vật trong Nông Trại Vui vẫn rất phẳng:

- Mỗi con chỉ có hai trạng thái "con non" và "trưởng thành", sống mãi mãi, không già, không có đực cái.
- Con vật chỉ đói, có thể bệnh, và cho sản phẩm. Không dơ, không cần tắm, không thân với người chơi, bán đi thì giá cố định.
- Gà nằm yên trong chuồng gà. Không ai đi tìm trứng trong bụi, không có cảnh chạng vạng lùa gà về chuồng, không có chuột, diều hâu, chồn.
- Chuồng chỉ có một cấp, mỗi loại một cái. Không có chuồng cách ly, nên bệnh không có gì để lo.
- Chó Mực chỉ biết đi theo và đuổi trộm. Không dạy được lệnh nào, không lùa được đàn. Chưa có mèo.

Người chơi không có lý do để gắn bó với từng con vật, và phần chăn nuôi thiếu những khoảnh khắc vui đã chốt khi grill (gà vịt đi khắp trại, mèo khoe chuột, heo lăn bùn sau khi tắm, chó lùa đàn lúc chạng vạng).

## Solution

Sau Phase 2, mỗi con vật là một cá thể có tên, giới tính, tuổi và tính cách nhìn thấy được:

- **Vòng đời 4 giai đoạn:** Non → Nhỡ → Trưởng thành → Già, mỗi giai đoạn có hình và hành vi riêng. Tuổi tính bằng **giờ vườn thật sự chạy**, nên lúc vườn đóng băng con vật không già đi. Chó, mèo không chết vì già.
- **Đực/cái và sinh sản:** gà trống gáy 6h sáng và cho trứng có phôi để ấp; heo nái đẻ 1–3 con; bò, cừu đực cái sinh con non. Con đẻ trong trại có tên tự đặt và cây phả hệ.
- **Dơ và tắm:** con vật dơ dần, có vệt bùn và ruồi; tắm bằng nước trong bình tưới và xà phòng thì sủi bọt, lắc mình văng nước, lấp lánh sạch. Heo tắm xong một lúc lại lăn bùn.
- **Bệnh, lây bệnh và cái chết:** 4 giai đoạn Mệt → Bệnh nặng → Nguy kịch → Mất. Chữa bằng thuốc thú y hoặc gọi bác sĩ thú y Cô Út. Bệnh nặng lây sang con cùng chuồng; có chuồng cách ly và vắc-xin. Con mất thì hóa thiên thần bay lên, để lại ngôi mộ nhỏ đặt hoa được. **Offline không bao giờ gây chết** (ADR 0004).
- **Độ thân ❤️1–5** với từng con: tăng khi cho ăn tận tay, vuốt ve, tắm, chữa bệnh; con thân thì cho sản phẩm tốt hơn, chạy lại khi thấy người chơi, đi theo người chơi.
- **Bán cho lái buôn Chú Ba** ở cổng trại, không có cảnh giết mổ. Heo thịt bán theo cân. Con già có thể cho nghỉ hưu.
- **Chuồng 3 cấp** cho từng loại, xây được nhiều chuồng, có **chuồng cách ly**.
- **Gà vịt thả rông ban ngày:** đi khắp trại, ăn sâu ở ruộng, đẻ trứng trong bụi. **Chạng vạng tự về chuồng**, mỗi tối 1–3 con lạc. Lùa bằng tay, rải thóc ở cửa chuồng, hoặc nhờ chó.
- **Kẻ săn mồi:** chuột (ăn cám, trộm trứng, cắn con non), diều hâu (cắp gà vịt con), chồn (bắt con ngủ ngoài chuồng). Khi online luôn cảnh báo trước 10 giây.
- **Mèo:** bắt chuột, khoe chiến lợi phẩm, thỉnh thoảng cãi nhau với chó.
- **Dạy lệnh cho chó** bằng minigame: Ngồi, Đi theo, Canh khu, Lùa, Tìm trứng, Đuổi chim.
- **Trộm NPC mới:** Tí Sún trộm trứng, chồn hương bắt gà vịt ngủ ngoài chuồng.
- **Vịt** là loài mới trong chuồng gia cầm.

## User Stories

### Vòng đời và tuổi

1. As a người chơi, I want con vật có 4 giai đoạn Non, Nhỡ, Trưởng thành, Già với hình riêng, so that nhìn là biết con nào bao nhiêu tuổi.
2. As a người chơi, I want gà con chạy theo gà mẹ và kêu chiếp, so that chuồng gà sinh động.
3. As a người chơi, I want gà nhỡ bới đất và ăn sâu ở ruộng, so that gà có ích cho ruộng.
4. As a người chơi, I want heo nhỡ ăn khỏe và tăng cân nhanh, so that biết lúc nào nên vỗ béo.
5. As a người chơi, I want bò tơ kéo cày được cả hàng ruộng, so that bò nhỡ cũng có việc.
6. As a người chơi, I want cừu nhỡ có lông ngắn chưa xén được, so that biết phải chờ.
7. As a người chơi, I want con già đẻ thưa, cho ít sữa, lông mỏng và hay ngủ, so that thấy rõ con vật đang già.
8. As a người chơi, I want tuổi con vật chỉ tăng khi vườn thật sự chạy, so that vắng nhà lâu không về thấy cả chuồng đã già.
9. As a người chơi, I want được báo trước khi con vật bước vào giai đoạn già, so that chuẩn bị tinh thần hoặc bán đi.
10. As a người chơi, I want gà vịt sống khoảng 1,5 ngày ngoài đời, heo 2,5 ngày, bò cừu 3,5 ngày, so that mỗi con kịp thu lại gấp 5–10 lần tiền mua.
11. As a người chơi, I want chó và mèo không bao giờ chết vì già, so that không mất thú cưng gắn bó lâu.
12. As a người chơi, I want con vật hết giai đoạn già thì có thể ra đi, và hóa thiên thần bay lên, so that cái chết nhẹ nhàng hợp giọng gia đình.

### Đực, cái và sinh sản

13. As a người chơi, I want chọn mua con đực hay con cái (cái đắt hơn khoảng 30%), so that tự lên kế hoạch nhân giống.
14. As a người chơi, I want gà trống gáy lúc 6h sáng, so that buổi sáng trong vườn có không khí.
15. As a người chơi, I want có ít nhất một gà trống thì khoảng 40% trứng có phôi, so that có lý do nuôi trống.
16. As a người chơi, I want soi trứng để biết trứng nào có phôi, so that chỉ ấp trứng nở được.
17. As a người chơi, I want ổ ấp nở trứng có phôi thành gà con, so that đàn tự lớn.
18. As a người chơi, I want 1 heo đực và 1 heo nái no, vui thì nái mang bầu và đẻ 1–3 con, so that nuôi heo có lãi.
19. As a người chơi, I want bò đực và bò cái chung chuồng thì khoảng mỗi 10 giờ có một bê con, so that đàn bò tăng dần.
20. As a người chơi, I want cừu đực và cừu cái sinh cừu non, so that đàn cừu tăng.
21. As a người chơi, I want con đẻ trong trại có giới tính ngẫu nhiên 50/50 và tự có tên như "Bông con", so that mỗi con có danh tính.
22. As a người chơi, I want chuồng đầy thì không sinh sản nữa, so that biết phải bán bớt hoặc nâng chuồng.
23. As a người chơi, I want xem cây phả hệ của từng con trong sổ, so that biết con nào là con của con nào.
24. As a người chơi, I want đổi tên con vật, so that đặt tên theo ý mình.

### Dơ và tắm

25. As a người chơi, I want mỗi con có độ dơ 0–100 tăng dần, từ sạch tới dơ hẳn khoảng 3 giờ, so that phải chăm sóc định kỳ.
26. As a người chơi, I want trời mưa hoặc chuồng bẩn thì con vật dơ nhanh gấp đôi, so that thời tiết và dọn chuồng có ý nghĩa.
27. As a người chơi, I want con dơ có vệt bùn và ruồi bay quanh, so that nhìn là biết cần tắm.
28. As a người chơi, I want con dơ thì mất vui, dễ bệnh, sản phẩm kém, so that tắm có lợi rõ ràng.
29. As a người chơi, I want tắm từng con bằng 1 lần nước trong bình tưới và 1 cục xà phòng, so that tắm có chi phí nhỏ.
30. As a người chơi, I want thấy bọt xà phòng, con vật lắc mình văng nước rồi lấp lánh, so that tắm vui mắt.
31. As a người chơi, I want tắm xong con vật +15 vui và thân hơn một chút, so that tắm đáng làm.
32. As a người chơi, I want heo và trâu đầm bùn thì dơ ngay nhưng không mất vui, chỉ tăng nguy cơ bệnh, so that heo lăn bùn là nét vui không phải hình phạt.
33. As a người chơi, I want mua xà phòng ở chợ Bà Tư, so that có xà phòng để tắm.
34. As a người chơi, I want chuồng gia cầm cấp 3 có ổ cát để gà vịt tự tắm cát, so that nâng chuồng đỡ việc.
35. As a người chơi, I want xúc phân chuồng để chuồng sạch và nhận phân chuồng, so that dọn chuồng có ích.

### Bệnh, lây bệnh và cái chết

36. As a người chơi, I want con vật bệnh qua 4 giai đoạn Mệt, Bệnh nặng, Nguy kịch, Mất với dấu hiệu rõ (bong bóng vàng, đỏ nhấp nháy, đếm ngược), so that biết mức độ nguy hiểm.
37. As a người chơi, I want con mệt không đẻ, không cho sản phẩm, không lớn, so that bệnh có hậu quả thật.
38. As a người chơi, I want chữa giai đoạn Mệt bằng 1 liều thuốc thú y, so that bệnh nhẹ dễ chữa.
39. As a người chơi, I want chữa Bệnh nặng bằng 2 liều thuốc hoặc bác sĩ thú y, và Nguy kịch chỉ bằng bác sĩ, so that để lâu thì tốn kém hơn.
40. As a người chơi, I want gọi bác sĩ thú y Cô Út qua điện thoại ở nhà (đắt), so that cứu được con nguy kịch.
41. As a người chơi, I want mua thuốc và vắc-xin ở trạm thú y của Cô Út trong làng, so that có chỗ mua.
42. As a người chơi, I want vắc-xin tiêm một lần chống bệnh khoảng 10 giờ, so that phòng bệnh cho cả chuồng.
43. As a người chơi, I want con bệnh nặng có 10% mỗi 10 phút lây cho một con cùng chuồng, so that phải tách con bệnh ra.
44. As a người chơi, I want chuồng cách ly không lây bệnh và hồi bệnh nhanh ×1.5, so that có cách xử lý dịch.
45. As a người chơi, I want bệnh đến từ đói lâu, dơ lâu, chuồng bẩn, tuổi già và lây, so that biết cách phòng.
46. As a người chơi, I want con già bị bệnh thì nặng nhanh gấp đôi, so that chăm con già kỹ hơn.
47. As a người chơi, I want đồng hồ gây chết chỉ chạy khi tôi đang chơi, offline thì dừng ở Bệnh nặng, so that ngủ dậy không mất cả chuồng.
48. As a người chơi, I want nhận thông báo trình duyệt khi có con vào giai đoạn Bệnh nặng, so that về chữa kịp.
49. As a người chơi, I want con mất để lại ngôi mộ nhỏ ở góc vườn, đặt hoa thì cả trại hết buồn nhanh hơn, so that có cách tưởng nhớ.
50. As a người chơi mới, I want con vật được bảo hộ không bệnh nặng tới cấp 5, so that không nản ngay buổi đầu.

### Độ thân

51. As a người chơi, I want mỗi con có độ thân ❤️1–5, so that gắn bó với từng con.
52. As a người chơi, I want độ thân tăng khi cho ăn tận tay, vuốt ve, tắm, chữa bệnh và giảm khi để đói hay dơ lâu, so that chăm sóc có ý nghĩa.
53. As a người chơi, I want con ❤️3 cho sản phẩm tốt hơn, ❤️4 chạy lại khi tôi tới gần và ít bệnh hơn, ❤️5 đi theo tôi và sống lâu hơn 10%, so that thân thiết có phần thưởng.
54. As a người chơi, I want bò được vuốt ve đều thì sữa ngon hơn, cừu vui thì ra lông xoăn giá cao, so that mỗi loài có cách chăm riêng.

### Bán con vật

55. As a người chơi, I want bán con vật cho lái buôn Chú Ba tới dắt đi ở cổng trại, không có cảnh giết mổ, so that hợp giọng gia đình.
56. As a người chơi, I want heo thịt bán theo cân, giá = số ký × giá chợ hôm đó, so that vỗ béo có lợi.
57. As a người chơi, I want có cân ở chuồng heo để xem số ký, so that biết lúc nào nên bán.
58. As a người chơi, I want heo tăng cân khi ăn no và ít vận động, so that cách nuôi ảnh hưởng tới giá.
59. As a người chơi, I want bán con ❤️4 trở lên thì phải xác nhận 2 lần, so that không bán nhầm con mình thương.
60. As a người chơi, I want cho con già nghỉ hưu ở lại trại, so that không phải bán con gắn bó lâu.
61. As a người chơi, I want con nghỉ hưu không cho sản phẩm nhưng làm cả chuồng vui hơn, so that nghỉ hưu có ý nghĩa.

### Chuồng 3 cấp và cách ly

62. As a người chơi, I want chuồng gia cầm, heo, chuồng lớn + đồng cỏ đều có 3 cấp với sức chứa tăng dần (6/12/18, 3/5/8, 3/6/9), so that nâng chuồng để nuôi thêm.
63. As a người chơi, I want xây nhiều chuồng cùng loại, có giới hạn theo cấp người chơi, so that mở rộng trại dần.
64. As a người chơi, I want chuồng cấp 3 có thêm đồ (ổ ấp tự động, ổ cát, vũng bùn, cỏ tự mọc), so that nâng chuồng đáng tiền.
65. As a người chơi, I want xây chuồng cách ly (1/2/3 chỗ) từ cấp 3, so that tách con bệnh.
66. As a người chơi, I want chuồng là chỗ ngủ, số con nuôi được tính theo sức chứa kể cả loài thả rông, so that luật rõ ràng.
67. As a người chơi, I want nâng cấp chuồng trong chế độ xây dựng hoặc chạm vào chuồng, so that thao tác quen thuộc.
68. As a người chơi, I want chuồng chó và nhà mèo có 3 cấp (cấp 3 có nệm, đồ chơi tăng vui), so that chăm thú cưng.

### Thả rông, về chuồng và lùa

69. As a người chơi, I want ban ngày gà vịt đi khắp trại trừ trong nhà và ra ngoài cổng, so that trại sinh động.
70. As a người chơi, I want gà vịt vào ruộng thì mổ sâu, nhưng 5% mổ mất hạt vừa gieo, so that thả rông có lợi có hại.
71. As a người chơi, I want mua hàng rào thấp quanh ruộng để gà vịt không vào, so that tự chọn đánh đổi.
72. As a người chơi, I want gà vịt đẻ trứng trong bụi cỏ, gốc cây, so that phải đi tìm trứng.
73. As a người chơi, I want tối đa khoảng 30 con thả rông, so that điện thoại yếu vẫn mượt.
74. As a người chơi, I want 18h phần lớn gà vịt tự về chuồng, mỗi tối 1–3 con lạc, so that có việc nhỏ buổi tối.
75. As a người chơi, I want con lạc có biểu tượng 💤 và mũi tên chỉ hướng, so that tìm được nó.
76. As a người chơi, I want con ❤️ thấp, con non, con ở xa chuồng dễ lạc hơn, so that thân thiết có lợi.
77. As a người chơi, I want gà vịt chạy tránh tôi trong khoảng 2 ô để tôi đi vòng ra sau lùa về cửa chuồng, so that lùa tay như thật.
78. As a người chơi, I want rải thóc ở cửa chuồng (tốn 1 bao cám) thì gà vịt trong 5 ô tự chạy lại vào chuồng, so that có cách lùa nhanh.
79. As a người chơi, I want trên cửa chuồng hiện "Gà 8/10 đã về", so that biết còn bao nhiêu con lạc.
80. As a người chơi, I want con ngủ ngoài chuồng có nguy cơ bị chuột hay chồn tấn công, so that lùa về chuồng có ý nghĩa.
81. As a người chơi, I want đêm bão cả đàn chạy tán loạn, so that bão có cảm giác thật.

### Kẻ săn mồi

82. As a người chơi, I want chuột sinh từ kho, đống rơm, máng, tối đa 8 con, ăn cám và trộm trứng, so that phải đề phòng.
83. As a người chơi, I want chuột cắn con non làm nó bị thương, không chữa thì có thể chết, so that bảo vệ con non.
84. As a người chơi, I want diều hâu hiếm khi xuất hiện ban ngày cắp gà vịt con đang thả rông, so that có lý do làm mái che hay nuôi chó.
85. As a người chơi, I want chồn ra nửa đêm bắt con ngủ ngoài chuồng, so that phải lùa đàn trước khi ngủ.
86. As a người chơi đang online, I want luôn được cảnh báo trước khoảng 10 giây khi kẻ săn mồi sắp tấn công, so that kịp chạy ra đuổi.
87. As a người chơi, I want đuổi chuột, diều hâu, chồn bằng cách chạm vào chúng, so that tự bảo vệ trại.
88. As a người chơi, I want mua bẫy chuột, so that có cách phòng chuột ngoài mèo.
89. As a người chơi offline, I want kẻ săn mồi chỉ ăn cám và trộm trứng, không làm con vật chết, so that vắng nhà không mất con.
90. As a người chơi, I want có đủ mèo và chó thì gần như không mất con nào, so that đầu tư phòng thủ có hiệu quả.

### Mèo

91. As a người chơi, I want nuôi mèo ra vào tự do qua cửa mèo và tối ngủ trong nhà, so that có thú cưng thứ hai.
92. As a người chơi, I want mèo đói vừa phải thì săn chuột tốt nhất, cho no quá thì lười nằm phơi nắng, so that cho mèo ăn cũng phải tính.
93. As a người chơi, I want mèo bắt được chuột thì mang chiến lợi phẩm tới khoe tôi, so that thấy mèo dễ thương.
94. As a người chơi, I want mèo thỉnh thoảng cãi nhau với chó, so that trại có chuyện vui.
95. As a người chơi, I want mèo chỉ lùa 1 con gần nhất khi đang vui, so that mèo có ích một chút.
96. As a người chơi, I want mèo có vòng đời Non, Nhỡ, Trưởng thành, Già (già lười, chỉ bắt chuột khi đói), so that mèo cũng lớn lên.

### Chó và dạy lệnh

97. As a người chơi, I want chó có vòng đời: con thì nghịch tha dép và ỉa nhiều, nhỡ thì sủa lung tung và học được lệnh, trưởng thành canh nhà, già ngủ nhiều, so that chó lớn lên thật.
98. As a người chơi, I want dạy chó bằng minigame bấm đúng lúc chó làm đúng động tác, mỗi buổi tốn 1 bánh thưởng, mỗi ngày game 1 buổi, so that dạy lệnh có công sức.
99. As a người chơi, I want chó vui thì học nhanh, chó đói hay buồn có thể bỏ giữa chừng, so that phải chăm chó trước khi dạy.
100. As a người chơi, I want học lệnh Ngồi (2 buổi) trước rồi mới học lệnh khác, so that có thứ tự.
101. As a người chơi, I want lệnh Đi theo (3 buổi) để chó đi sát tôi kể cả sang làng hay vườn bạn, so that dắt chó đi chơi.
102. As a người chơi, I want lệnh Canh khu (4 buổi) để chó gác một chỗ tôi chọn với bán kính phát hiện trộm ×2, so that canh chỗ quan trọng.
103. As a người chơi, I want lệnh Lùa (5 buổi) để chó lùa cả đàn về chuồng khoảng 20 giây, kể cả bò cừu đi lạc, và tự lùa mỗi tối nếu no và vui, so that đỡ việc buổi tối.
104. As a người chơi, I want lệnh Tìm trứng (4 buổi) để chó đánh hơi trứng giấu trong bụi, so that không bỏ sót trứng.
105. As a người chơi, I want lệnh Đuổi chim (3 buổi) để chó tự đuổi quạ và diều hâu, so that ruộng và gà an toàn hơn.
106. As a người chơi, I want chó đã học đủ 6 lệnh thì không ăn xúc xích của người lạ, so that dạy chó kỹ có thưởng.
107. As a người chơi, I want chó già phát hiện trộm chậm hơn, so that tuổi chó có ảnh hưởng.

### Trộm NPC mới

108. As a người chơi, I want Tí Sún tới trộm trứng khi có từ 3 trứng dưới đất, so that phải nhặt trứng đều.
109. As a người chơi, I want chồn hương ra nửa đêm bắt gà vịt ngủ ngoài chuồng, so that lùa đàn có ý nghĩa.
110. As a người chơi, I want trung bình 1 vụ trộm NPC mỗi 2 đêm và chỉ khi có đồ đáng trộm, vườn giàu thì thường hơn (tối đa 1 vụ mỗi đêm), so that trộm vừa phải.
111. As a người chơi, I want bắt được trộm thì chọn bắt đền 20–60 xu hoặc phạt làm thợ không công hôm sau, so that bắt trộm có lợi.
112. As a người chơi, I want thằng Tèo bị bắt nhiều lần thì mua đèn pin, giày êm, đi lặng lẽ hơn, so that trộm tiến bộ dần.

### Vịt

113. As a người chơi, I want nuôi vịt trong chuồng gia cầm, vịt con đi thành hàng theo vịt mẹ, so that có loài mới dễ thương.
114. As a người chơi, I want vịt đẻ trứng vịt, so that có sản phẩm mới.

### Hướng dẫn và thông báo

115. As a người chơi, I want nhiệm vụ làm quen của Cô Út khi mua heo đầu tiên ở cấp 3 (tắm, chữa bệnh, vắc-xin), so that học hệ thống mới từ từ.
116. As a người chơi, I want con vật nguy kịch và kẻ săn mồi là thông báo 🔴 gấp có mũi tên chỉ hướng, so that không bỏ lỡ.
117. As a người chơi, I want bảng Việc cần làm có thêm con dơ, con lạc, chuồng bẩn, trứng trong bụi, so that biết việc chăn nuôi cần làm.
118. As a người chơi, I want sổ tay có thêm trang vòng đời, tắm, bệnh, lùa và dạy chó, so that tra cứu khi quên.
119. As a người chơi cũ, I want con vật cũ được chuyển sang hệ thống mới mà không mất con nào, so that cập nhật không làm mất trại.

## Implementation Decisions

- **Bản lưu v3.** Con vật đổi hình dạng (giới tính, tuổi theo giờ vườn, giai đoạn, độ dơ, độ thân, bệnh nhiều giai đoạn, cân nặng, tên cha mẹ, vị trí thả rông theo ô), nên thêm một bước chuyển v2→v3 vào chuỗi chuyển bản lưu. Bước chuyển là hàm thuần, không ngẫu nhiên: con trưởng thành cũ thành "Trưởng thành" ở đầu giai đoạn, con non thành "Non"; giới tính gán theo id (chẵn cái, lẻ đực) để có ít nhất một cặp; độ thân 2; sạch. Không ghi đè key v2. Bản online trên server chuyển cùng lúc khi chủ đăng nhập.
- **Tuổi theo giờ vườn chạy** (ADR 0003): dùng bộ đếm giờ vườn đã có từ Phase 0. Bảng tuổi thọ theo loài nằm trong bảng số liệu.
- **Đồng hồ gây chết chỉ chạy khi chủ đang chơi** (ADR 0004): luật bệnh nhận cờ "đang chạy bù" từ cơ chế chạy bù (cả trên trình duyệt lẫn server), và dừng ở Bệnh nặng khi chạy bù. Chết vì già vẫn được.
- **Thả rông và săn mồi là luật trừu tượng (ADR 0013):** `state.js` quyết định theo ô và theo xác suất có hạt giống: con nào lạc lúc chạng vạng và đứng ở ô nào, trứng đẻ ở ô cỏ nào, chuột sinh ở đâu và ăn gì, diều hâu nhắm con nào, cảnh báo trước 10 giây. `world.js` chỉ diễn hoạt kết quả đó. Lùa tay là ngoại lệ: thế giới báo cho luật khi một con đi qua cửa chuồng.
- **Module luật mới trong `state.js`, giao diện nhỏ:** vòng đời và sinh sản; dơ và tắm; bệnh và lây; độ thân; bán và nghỉ hưu; thả rông và về chuồng; kẻ săn mồi; mèo; dạy lệnh chó (kết quả minigame là "đạt/không đạt" gửi vào luật, luật quyết định tiến độ). Mỗi phần có hàm `actionsFor`/`perform` cho target mới: con vật (tắm, chữa, tiêm, bán, nghỉ hưu, soi trứng), cửa chuồng (rải thóc), mộ (đặt hoa), kẻ săn mồi (đuổi), chó (dạy lệnh, ra lệnh).
- **Chuồng 3 cấp và cách ly:** mở rộng `PEN_DEFS` thành bảng chuồng theo loại và cấp (sức chứa, đồ cấp 3, cấp người chơi, giá). Chuồng là thực thể trong bản lưu như Phase 0, nên đặt và dời qua `canPlace` (ADR 0005). Giới hạn số chuồng mỗi loại theo cấp. Chuồng cách ly là loại chuồng mới nhận mọi loài.
- **Vịt và mèo:** thêm vào bảng loài. Mèo có nhà mèo và cửa mèo trên nhà, tối ngủ trong bản đồ nhà.
- **Cư dân mới ở làng:** Cô Út (trạm thú y: thuốc, vắc-xin; gọi bác sĩ qua điện thoại ở nhà) và Chú Ba (lái buôn: tới cổng trại dắt con vật đi, cũng là người lấy hàng ở thùng giao hàng). Vật phẩm mới ở chợ Bà Tư: xà phòng, bánh thưởng cho chó, bẫy chuột, hàng rào thấp, cám rải.
- **Vòi sen tự động** của chuồng cấp 3 cần bồn chứa nước, nên được làm ở Phase 3. Phase 2 chỉ để chỗ cho nó trong bảng chuồng.
- **Online (Phase 1):** khách thấy trạng thái con vật mới (dơ, bệnh, lạc), trộm được sữa và lông đang chờ như đã chốt. Chó canh vườn dùng vòng đời và lệnh Canh khu của phase này. Server chạy bù vườn offline bằng cùng luật nên không có code riêng.
- **Thông báo và Việc cần làm:** thêm loại sự kiện mới với mức và khóa gộp (bệnh nặng 🔴, nguy kịch 🔴, săn mồi sắp tới 🔴, con lạc 🟡, con già 🟡, đẻ con 🟡, nhặt trứng trong bụi ⚪). Bảng Việc cần làm thêm con dơ, con lạc, chuồng bẩn, trứng trong bụi. Thông báo trình duyệt (Notification API) khi có con Bệnh nặng, xin quyền một lần.
- **Bảo hộ người mới:** dưới cấp 5 bệnh không vượt quá Mệt, chưa có chuột, diều hâu, chồn, trộm NPC mới.
- **Pixel art (Opus):** mỗi loài 4 giai đoạn × hướng × khung đi, cộng trạng thái dơ, ướt bọt xà phòng, bệnh, ngủ; gà trống/mái, vịt, mèo, chuột, diều hâu, chồn, Tí Sún, Cô Út, Chú Ba, ngôi mộ, thiên thần, chuồng 3 cấp, chuồng cách ly, cân heo, cửa mèo.

## Testing Decisions

- **Test tốt** chỉ kiểm hành vi qua API công khai của `state.js` và những gì người chơi thấy trên trình duyệt (ADR 0008). Không có hook test. Xác suất được kiểm bằng hạt giống cố định hoặc bằng thống kê trên nhiều lượt tick, không kiểm cách cài đặt.
- **Seam 1 – `state.js` (node --test):** chuyển v2→v3 giữ đủ con, không ngẫu nhiên (prior art: `tests/save-v2.test.mjs`); tuổi chỉ tăng theo giờ vườn và đứng yên khi đóng băng; mỗi giai đoạn có đúng hành vi (đẻ, sữa, lông, kéo cày); sinh sản cần đủ điều kiện và dừng khi chuồng đầy; dơ tăng đúng tốc độ, mưa và chuồng bẩn ×2, tắm trừ nước và xà phòng; bệnh qua đủ giai đoạn, chữa đúng thuốc, lây trong chuồng, cách ly không lây; **chạy bù offline không bao giờ gây chết vì bệnh, đói hay săn mồi** (test riêng, đọc kèm ADR 0004); độ thân tăng giảm và lợi ích từng mức; heo bán theo cân; về chuồng lúc 18h và số con lạc; kẻ săn mồi khi online có cảnh báo trước, khi offline chỉ ăn cám và trứng; dạy lệnh đúng số buổi và thứ tự; bảo hộ người mới.
- **Seam 3 – giao thức server:** server chạy bù vườn có con bệnh nặng và kẻ săn mồi trong 8 tiếng thì không con nào chết.
- **Seam 2 – Playwright (desktop + 360px):** tắm một con heo dơ (thấy bọt, rồi sạch); chữa con bệnh bằng thuốc mua ở trạm thú y; 18h dùng rải thóc lùa gà về và cửa chuồng hiện đủ số; gọi chó lùa đàn; dạy lệnh Ngồi bằng minigame; bán heo theo cân cho Chú Ba; mèo bắt chuột (dựng bản lưu có chuột và mèo); mở bản lưu v2 cũ thì đủ con vật. Prior art: `e2e/stamina.spec.mjs`, `e2e/village.spec.mjs`.

## Out of Scope

- Các loài mới khác: thỏ, ngỗng, dê, trâu, ếch, cá, ong, tằm, bồ câu, công, ngựa (Phase 6). Sóc trộm trái cây đi cùng cây ăn trái (Phase 6).
- Vòi sen tự động, bồn nước (Phase 3).
- Hố ủ phân và phân bón từ phân chuồng (Phase 3; Phase 2 chỉ cất phân chuồng vào kho).
- Tự làm xà phòng từ sáp ong và dầu phộng (Phase 4, máy chế biến).
- Thú cưng cảnh trong nhà (Phase 5).
- Nhân công chăm con vật (Phase 4).
- Sổ sưu tầm, thành tựu mới cho vật nuôi ngoài vài cái cơ bản (Phase 7).

## Further Notes

- Đây là phase có nhiều pixel art nhất từ trước tới giờ. Nên tách việc vẽ (Opus) thành nhiều agent theo nhóm loài, chạy song song với phần luật.
- Các con số tuổi thọ, tốc độ dơ, tỉ lệ lây bệnh, tỉ lệ con lạc lấy từ `DESIGN.md` và sẽ cân bằng lại khi chơi thử.
- ADR 0004 là ranh giới cứng: mọi đề xuất "cho thực tế hơn" về cái chết khi offline phải đọc lại ADR đó.
