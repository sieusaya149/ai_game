# PRD 0005: Phase 4, kinh tế, làng và loài mới

Phase 4 cũ (kinh tế và làng) gộp với Phase 6 cũ (loài và khu mới), chia ba đợt **4A → 4B → 4C**, mỗi đợt tự phát hành (ADR 0017).

Nguồn: `DESIGN.md` mục 2.1a (loài mới), 2.5 (chuồng), 3.3b (kho, đồ hư), 3.3c (máy chế biến), 3.3d (hao mòn), 4 (nhân công), 5 (hồ cá, cây ăn trái), 6b (cư dân), 8.1–8.6 (kinh tế, hội chợ, Tiếng tăm, chợ và sự kiện làng), 8a (tiến trình), cộng các mục "nhóm 3" trong `HANDOVER.md` đã chốt khi grill ngày 2026-10-03. Liên quan các ADR 0002, 0003, 0004, 0005, 0008, 0009, 0011, 0012, 0014, 0015, 0017, 0018, 0019, 0020.

## Problem Statement

Sau Phase 3 vườn đã có nhiều cây, vật nuôi và máy nước, nhưng:

- **Xu không có chỗ đi.** Thu nhập không có trần, chi tiêu gần như chỉ là mua một lần. Chợ không chặn bán xả: ADR 0009 có nói "sức mua" nhưng code chưa có. Nâng cấp rẻ so với thu nhập. Không có hóa đơn, không có hao mòn, không có đồ hư.
- **Nông sản chỉ có một đầu ra:** bán thô. Không có máy chế biến, không có bếp. Kho chứa vô hạn nên không phải tính chuyện cất trữ.
- **Làng còn mỏng.** Cư dân chỉ đứng bán, không có độ thân, không có nhân công, không có hội chợ, không có chợ giữa người chơi, không có sự kiện chung để cả làng cùng làm.
- **Thiếu nội dung lâu dài:** chưa có hồ cá, cây ăn trái, ong, tằm và 7 loài vật đã chốt trong DESIGN. Người chơi đã thấy vòng lặp lặp lại.
- **Feedback người chơi (nhóm 3):** muốn nâng cấp ổ ấp, máy làm thức ăn từ nông sản tự trồng, máy nhặt trứng và máy thu hoạch, mèo có tác dụng rõ, có việc cho heo, chó, mèo.

## Solution

### Đợt 4A — Kinh tế và sản xuất

- **Bản lưu v5, kho theo lô (ADR 0018).** Kho 3 cấp chứa 100 → 250 → 600 món, chỉ tính hàng bán được. Ai đang vượt thì giữ nguyên.
- **Đồ hư:** rau củ, trái cây, trứng, sữa, cá hư dần theo giờ, **chỉ khi chủ vườn đang chơi**. Sắp hư thì có viền vàng và số giờ còn lại. Hư thì thành rác hữu cơ, bỏ vào hố ủ được.
- **Kho lạnh:** công trình riêng, sức chứa riêng, hư chậm ×5, tốn điện.
- **Sức mua của chợ, tính riêng từng người (ADR 0009):** bán vượt sức mua thì giá rớt dần, thấp nhất còn 50%, hồi lại sau khoảng 2 ngày game. Kho hiện giá hôm nay, số còn bán được đủ giá và mũi tên ↑↓.
- **Được mùa mất giá / mất mùa được giá:** sự kiện chung cả làng, 2–3 lần mỗi mùa, mỗi lần 2–3 ngày game, tính bằng hàm thuần (ADR 0019).
- **Hộp thư và hóa đơn tháng:** tiền điện của Phase 3 gom thành hóa đơn điện nước mỗi tháng game (7 ngày). Hóa đơn tới hộp thư ngày 1, có 3 ngày để trả. Không trả thì cắt điện (máy bơm, vòi sen, máy phun, máy chế biến, đèn ngừng). Trả nợ cộng phí đóng lại khoảng 10%. Xu không bao giờ âm, đồ không bị tịch thu.
- **Máy chế biến:** mỗi máy là một công trình có hàng chờ 2/4/6 lượt theo cấp, chạy cả khi offline, tốn điện. Danh sách: cối xay, hũ muối dưa, máy làm phô mai, khung dệt, máy ép dầu, nồi nấu xà phòng, máy may, **máy trộn cám** (mới). Thành phẩm bán ×1,5–2, không hư, có giá chợ riêng. Máy quay mật ra cùng ong ở 4B.
- **Máy trộn cám:** lúa/bắp → cám gà vịt; bắp + khoai lang → cám heo; rơm + bắp → cỏ khô bò cừu; bắp + trứng → thức ăn chó mèo. Rẻ hơn mua ở Bà Tư khoảng 30–50% (tính theo giá bán của nông sản đầu vào), đổi lại tốn thời gian. Bà Tư vẫn bán như cũ.
- **Hao mòn và sửa chữa:** máy móc, bù nhìn, hàng rào, nhà kính có độ bền 100%. Dưới 30% có cờ lê vàng và chạy chậm; về 0% thì ngừng, không mất đồ. Tự sửa tốn gỗ, đinh, thể lực, hồi tới 80%. Thuê Ông Sáu tốn khoảng 10–15% giá mua, hồi 100%, mất nửa ngày game.
- **Bếp và công thức:** bếp trong nhà nấu món từ nông sản (2–10 phút) để hồi thể lực và giao đơn đặc biệt. Công thức mở dần qua sổ công thức (Chị Hai cho, đơn hàng thưởng, mua ở chợ). Các phiên bản bếp đắt dần (bếp củi → ga → từ) thuộc Phase 5.

### Đợt 4B — Loài và khu mới

- **Hồ cá:** đào theo khối, nhỏ nhất 3×3 ô, nối thêm được, mỗi ô nước tối đa 2 con. Rô, trê, chép, tôm càng, lươn và Koi (chỉ để ngắm, cả trại vui hơn). Cá qua 3 cấp bột → giống → trưởng thành. Cho ăn bằng cám cá. Độ sạch nước 0–100: dưới 40 cá chậm lớn, dưới 20 dễ bệnh. Làm sạch bằng vớt rong (bỏ vào hố ủ) hoặc thả ốc. Phân vịt làm cá lớn nhanh nhưng nước bẩn nhanh. Thu hoạch bằng kéo lưới.
- **Câu cá:** minigame bấm đúng nhịp ở hồ nhà và **sông làng** (có cá hiếm theo mùa), thỉnh thoảng dính ủng cũ.
- **Ếch** sống ở hồ, ăn sâu ở ruộng gần hồ, bắt bằng vợt để bán, kêu ban đêm.
- **Cây ăn trái:** chuối, ổi, cam, xoài, mít, sầu riêng và **dâu tằm** (lá nuôi tằm). Mỗi cây chiếm khối 2×2, qua 3 giai đoạn cây con → cây non → cây cho trái, mỗi cây có bộ hình riêng. Rung cây cho trái rơi rồi nhặt; trái bỏ lâu dưới đất thì có ruồi và hỏng. Tỉa cành thì sai trái hơn. Sâu đục thân làm cây yếu dần nếu không chữa. Bão có thể gãy cành. Cây không chết vì già.
- **Sóc** tới trộm trái, như quạ ở ruộng.
- **Mèo có tác dụng rõ:** thấy chuột thì rình rồi vồ (có hoạt cảnh và thông báo); đuổi sóc ở cây ăn trái; kho có mèo canh thì chuột không ăn đồ trong kho; thỉnh thoảng tha "quà" về cửa (lông chim, hạt giống lạ). Khung thông tin mèo hiện số chuột đã bắt.
- **Ong:** thùng ong cạnh vườn trái, mỗi thùng một đàn, cho tổ ong. **Máy quay mật** biến tổ ong thành mật ong + sáp ong. Ong thụ phấn nên cây ăn trái gần đó sai trái hơn. Không có đồ bảo hộ thì bị đốt, mất thể lực.
- **Tằm:** nhà tằm 2/4/6 nong, ăn lá dâu tằm, cho kén. Khung dệt biến kén thành lụa, máy may biến lụa thành áo dài.
- **7 loài mới, mỗi loài đủ 4 giai đoạn, có đực/cái:** thỏ angora (chuồng thỏ, lông thỏ, đẻ 2–4 con, dễ bị chuột và chồn bắt), ngỗng (thả rông, trứng ngỗng, thấy người lạ thì kêu và đuổi mổ), dê (đồng cỏ, sữa dê → phô mai dê, hay nhảy rào gặm rau, cần rào cao), trâu (đồng cỏ, thích đầm bùn), bồ câu (chuồng chim trên mái, đưa thư và quà cho bạn online, cho ăn đủ thì thư tới nhanh hơn), công (thả rông, rất đắt), ngựa (chuồng ngựa, cưỡi đi nhanh ×2, phải chải lông và cho ăn cà rốt).
- **Kéo cày:** dắt bò tơ, bò đực hoặc trâu ra ruộng rồi bấm "Cày": bò xới cả hàng, trâu xới khối 3×3. Người tốn ít thể lực hơn cuốc, con vật mau đói và mệt hơn, mỗi con cày một số lần mỗi ngày game.
- **Xe trâu:** trại có trâu trưởng thành khỏe thì thùng giao hàng trả 85% thay vì 80% và chứa gấp đôi.
- **Công:** mỗi sáng xòe đuôi thì cả trại vui hơn (như Koi), khách thăm vườn thấy công xòe đuôi. Điểm đẹp của vườn thuộc Phase 5.
- **Máy ấp 3 cấp:** ổ ấp đứng riêng thành "Máy ấp", nâng ở tiệm rèn. Cấp 1: 1 trứng, thời gian như cũ. Cấp 2: 3 trứng, ×0,75 thời gian, tốn điện. Cấp 3: 6 trứng, ×0,5 thời gian, tốn điện, nhận cả trứng ngỗng. Ổ ấp tự động ở chuồng gia cầm cấp 3 giữ nguyên.
- **Máy gắn cố định** (không thay thợ): **máng trứng lăn** gắn vào chuồng gia cầm, trứng đẻ trong chuồng tự vào kho (trứng đẻ ngoài vườn khi thả rông vẫn phải nhặt tay). **Máy gặt** gắn vào khối ruộng 3×3 như tưới nhỏ giọt: tự hái khi chín, cất vào kho, không gieo lại, tối đa ★2. Cả hai tốn điện và có hao mòn.
- **Đơn việc:** bảng đơn hàng (vẫn tối đa 3 đơn, người đặt là cư dân) có thêm loại đơn không xin sản phẩm. Ví dụ: Chú Ba cần 1 heo ≥ 90 kg (giao con vật, giá cao hơn bán thường); Cô Út nhờ chó biết lệnh "Bắt tay" ra biểu diễn; nhà Bà Tư có chuột nên mượn mèo một buổi (mèo đi vắng, về mang theo quà). Thưởng xu và EXP; ❤️ cư dân nối thêm ở 4C.

### Đợt 4C — Làng

- **Cư dân ❤️1–5:** tăng khi giao đơn của họ, tặng quà đúng sở thích (mỗi người có món thích và món ghét), chào hỏi mỗi ngày. Thưởng: giảm giá ở cửa hàng của người đó, công thức mới, đơn hàng giá cao, sự kiện riêng. Bé Bi có đơn "khó tính" thưởng ⭐.
- **Tiếng tăm ⭐:** kiếm từ đổi công, đơn khó tính, lên ❤️5 với cư dân, thành thạo 3, uy tín shop cao (thành tựu, lễ hội, nhiệm vụ hằng ngày nối ở Phase 7). Tiêu ở **Tiệm Danh Giá**: màu lông hiếm cho thú cưng, đồ trang trí độc quyền, danh hiệu dưới tên, bản thiết kế máy cấp cao (kiểu nhà đặc biệt nối ở Phase 5). Không đổi qua lại với xu, không trộm được, không tặng được.
- **Nhân công:** bảng thuê ở cổng làng, 4 thợ (Bé Tí, Cô Lan, Chú Chín, Anh Bảy), hợp đồng theo ca tự gia hạn, tiền trừ đầu ca, thợ đi lại thật và làm trong vùng được khoanh, thể lực 60 mỗi ca, ngủ gật khi mệt, lên cấp, làm cả khi chủ offline trong 8 giờ chạy bù, báo cáo cuối ca. Thợ cấp 3 trở lên ra được ★3. Số thợ tối đa 1 + 1 cho mỗi 8 cấp, tối đa 4.
- **Trạng thái chung của làng trên server (ADR 0019):** giải độc đắc, tiến độ hợp tác xã, thanh diệt chuột, phiếu bình chọn.
- **Hội chợ:** loto làng (chọn 3 số từ 1–30, quay 20h mỗi ngày game, giải độc đắc chung cả làng, tối đa 10 vé mỗi ngày game), ném vòng, bắn lon, vòng quay. Nhà cái luôn lời. Chỉ dùng xu trong game.
- **Thi nông sản:** tối Chủ nhật 20h–21h giờ thật, ba hạng mục (trái to nhất, vật nuôi đẹp nhất, rổ nông sản 5 món). Người có mặt bình chọn, giám khảo NPC chấm thêm. Bài dự thi không mất.
- **Chợ phiên:** 12h–13h và 20h–21h giờ thật ở quảng trường. Sạp từ cấp 5 (4 ô miễn phí, nâng lên 6 rồi 8). Người bán đặt giá 50%–200% giá gốc. Khách NPC chỉ mua món giá ≤ giá gốc. Mua của người khác theo ADR 0020. Chơi đơn có sạp và khách NPC.
- **Uy tín shop 🏪1–5:** tính theo chất lượng khoảng 20 lần bán gần nhất. Dùng chung cho chợ phiên, livestream và xe hàng rong. Tách riêng với ⭐; 🏪4 và 🏪5 được thưởng ⭐ mỗi tuần.
- **Livestream bán hàng:** từ cấp 5, mỗi lần tối đa 30 phút, tối đa 3 lần mỗi ngày thật. Độ hot 🔥, câu hỏi người xem, giỏ live 6 món, người xem vào vườn như đi thăm, xem đủ 3 phút được mã giảm giá.
- **Mùa dịch:** khoảng 1 đợt mỗi tuần thật, kéo dài 1 ngày thật, báo trước khoảng 1 giờ. Cúm gia cầm, dịch tả heo hoặc lở mồm long móng. Con thuộc nhóm đó dễ bệnh ×3; con đã tiêm phòng không sao và sản phẩm có nhãn "✅ An toàn".
- **Hợp tác xã:** mỗi tuần thật có chỉ tiêu chung 2–3 món theo mùa game. Góp được trả 100% giá chợ. Đủ chỉ tiêu thì cả làng có thưởng. Không đủ thì không phạt.
- **Mã giảm giá:** giảm 10%, giảm 20%, miễn phí giao. Chỉ dùng ở **Đặt hàng online đang chạy** (bản sửa nóng: giao ngay 30%, sau 1 phút 20%, sau 2 phút 10%), 1 mã mỗi đơn, hết hạn sau 3 ngày thật, tặng bạn được qua hộp quà. Hàng giảm giá hôm nay, hạt theo mùa vừa về và con vật chỉ có khi tới chợ.
- **Xe bán hàng rong:** đặt ở tiệm rèn, từ cấp 5, 3 ô hàng nâng lên 5. Đẩy đi bán khắp làng ngoài giờ chợ phiên. Dân làng NPC ghé mua ở chỗ đông.
- **Sự kiện diệt chuột, bắt rắn, phun sâu:** 2 lần mỗi tuần thật, rơi vào một khung chợ phiên, kéo dài 20 phút. Diệt ở vườn mình và vườn bạn, cộng vào thanh tiến độ chung. Con sót lại chỉ gây hại nhẹ, không bao giờ chết con vật hay mất cả ruộng.

## User Stories

### 4A — Kho và đồ hư

1. As a người chơi, I want kho có 3 cấp chứa 100, 250, 600 món hàng bán được, so that nâng kho là mục tiêu đầu tư.
2. As a người chơi, I want hạt, vật tư, cám, gỗ, đá, đồ trang trí không chiếm chỗ kho, so that kho đầy không chặn việc mua đồ dùng.
3. As a người chơi cũ, I want đồ đang có giữ nguyên khi cập nhật dù vượt sức chứa, so that cập nhật không làm mất gì.
4. As a người chơi, I want kho đầy thì đồ thu hoạch chỉ để trong giỏ và có lý do rõ, so that biết phải bán hay nâng kho.
5. As a người chơi, I want hàng giao online, quà và hàng sạp trả về luôn vào kho dù đầy, so that không bao giờ mất hàng đã trả tiền.
6. As a người chơi, I want rau, trái, trứng, sữa, cá hư dần theo giờ, so that phải tính bán hay chế biến.
7. As a người chơi, I want đồ chỉ hư lúc mình đang chơi, không hư lúc offline, so that ngủ dậy không mất cả kho.
8. As a người chơi, I want đồ sắp hư có viền vàng và số giờ còn lại, so that biết bán món nào trước.
9. As a người chơi, I want bán hay giao đơn thì game lấy lô gần hư nhất trước, so that không phải tự chọn.
10. As a người chơi, I want đồ hư thành rác hữu cơ bỏ vào hố ủ được, so that không phí hoàn toàn.
11. As a người chơi, I want thùng giao hàng, hộp quà và hàng đang chờ trong máy không hư, so that không bị phạt oan.
12. As a người chơi, I want xây kho lạnh có sức chứa riêng để đồ hư chậm ×5, so that trữ được hàng chờ giá lên.
13. As a người chơi, I want kho lạnh tốn điện và ngừng làm lạnh khi bị cắt điện, so that có chi phí duy trì.

### 4A — Giá chợ

14. As a người chơi, I want mỗi món có sức mua riêng, bán vượt thì giá rớt dần tới 50%, so that không xả một loại hàng mãi được.
15. As a người chơi, I want sức mua hồi lại sau khoảng 2 ngày game, so that luân phiên cây trồng có lợi.
16. As a người chơi online, I want rớt giá do bán nhiều tính riêng từng người, so that không ai xả hàng để hại người khác.
17. As a người chơi, I want kho và chợ hiện giá hôm nay, số còn bán được đủ giá và mũi tên ↑↓, so that biết lúc nào nên bán.
18. As a người chơi, I want thùng giao hàng cũng tính sức mua, so that không lách bằng cách bỏ thùng.
19. As a người chơi online, I want sự kiện "được mùa mất giá" và "mất mùa được giá" chung cả làng, so that cả làng cùng bàn chuyện giá.
20. As a người chơi, I want sự kiện giá được báo trên bảng tin làng và radio, so that kịp trữ hàng hay bán sớm.

### 4A — Hộp thư và hóa đơn

21. As a người chơi, I want có hộp thư ở cổng vườn nhận thư, hóa đơn và tin báo, so that có một chỗ đọc mọi giấy tờ.
22. As a người chơi, I want hóa đơn điện nước tới hộp thư ngày 1 mỗi tháng game, liệt kê từng máy đã dùng, so that biết tiền đi đâu.
23. As a người chơi, I want 3 ngày game để trả hóa đơn, so that không bị phạt ngay.
24. As a người chơi, I want quá hạn thì cắt điện chứ không trừ âm xu hay tịch thu đồ, so that không bao giờ bị phá sản.
25. As a người chơi, I want bị cắt điện thì giếng múc tay vẫn dùng được, so that vẫn tưới được bằng tay.
26. As a người chơi, I want trả nợ cộng phí đóng lại khoảng 10% thì máy chạy lại, so that có đường quay về.
27. As a người chơi, I want tắt máy trước khi nghỉ thì không mất tiền điện lúc offline, so that tự quản chi phí.
28. As a người chơi cũ, I want tiền điện hằng ngày của Phase 3 chuyển thành hóa đơn tháng không mất khoản nợ cũ, so that chuyển đổi êm.

### 4A — Máy chế biến

29. As a người chơi, I want xây máy chế biến như công trình, bỏ nguyên liệu vào, chờ, lấy thành phẩm, so that nông sản có đầu ra mới.
30. As a người chơi, I want mỗi máy có hàng chờ 2, 4, 6 lượt theo cấp, so that nâng máy có ích.
31. As a người chơi, I want máy chạy cả khi offline, so that về là có hàng.
32. As a người chơi, I want thành phẩm bán ×1,5–2 giá nguyên liệu và không hư, so that chế biến là cách giữ giá trị.
33. As a người chơi, I want cối xay (lúa → gạo, bắp → bột bắp) và hũ muối dưa (cải, dưa leo, su hào → dưa muối), so that cây dễ trồng có đầu ra.
34. As a người chơi, I want máy làm phô mai, khung dệt, máy ép dầu, nồi nấu xà phòng, máy may, so that sữa, lông, đậu phộng có chuỗi chế biến.
35. As a người chơi, I want máy trộn cám làm cám gà vịt, cám heo, cỏ khô, thức ăn chó mèo từ nông sản tự trồng, so that bớt phải mua ở Bà Tư.
36. As a người chơi, I want cám tự làm rẻ hơn cám mua khoảng 30–50%, so that đáng công chờ.
37. As a người chơi, I want máy mở dần theo cấp người chơi, so that không ngợp lúc đầu.
38. As a người chơi, I want máy bị cắt điện thì dừng giữa chừng và chạy tiếp khi có điện, không mất nguyên liệu, so that không bị phạt nặng.

### 4A — Hao mòn và sửa chữa

39. As a người chơi, I want máy, bù nhìn, hàng rào, nhà kính có độ bền 100% giảm dần khi dùng, so that có chi phí duy trì.
40. As a người chơi, I want bão làm đồ ngoài trời mất thêm 10–30% độ bền, so that bão có hậu quả.
41. As a người chơi, I want dưới 30% có cờ lê vàng và máy chạy chậm, về 0% thì ngừng mà không mất đồ, so that kịp sửa.
42. As a người chơi, I want tự sửa bằng gỗ, đinh và thể lực (tới 80%), so that có cách sửa rẻ.
43. As a người chơi, I want thuê Ông Sáu sửa tới 100% mất nửa ngày game, so that có cách sửa nhanh gọn.
44. As a người chơi, I want chuồng, nhà ở, đồ trang trí không hao mòn, so that không phải lo mọi thứ.

### 4A — Bếp

45. As a người chơi, I want nấu món ăn ở bếp trong nhà từ nông sản, so that có cách hồi thể lực.
46. As a người chơi, I want món ăn dùng để giao đơn đặc biệt, so that nấu ăn có giá trị.
47. As a người chơi, I want sổ công thức mở dần qua Chị Hai, đơn hàng thưởng và chợ, so that có cái để sưu tầm.

### 4B — Hồ cá và câu cá

48. As a người chơi cấp 8, I want đào hồ theo khối 3×3 và nối rộng ra, so that có khu nuôi cá.
49. As a người chơi, I want thả cá rô, trê, chép, tôm càng, lươn, mỗi ô nước tối đa 2 con, so that phải tính diện tích hồ.
50. As a người chơi, I want cá lớn qua cá bột, cá giống, cá trưởng thành với hình riêng từng loài, so that thấy cá lớn.
51. As a người chơi, I want cho cá ăn bằng cám cá, so that có việc chăm hồ.
52. As a người chơi, I want độ sạch nước giảm theo số cá, cám thừa, phân vịt, so that phải giữ hồ sạch.
53. As a người chơi, I want vớt rong bỏ vào hố ủ hoặc thả ốc để làm sạch, so that có cách giữ nước.
54. As a người chơi, I want kéo lưới bắt cá trưởng thành, so that thu hoạch hồ.
55. As a người chơi, I want thả cá Koi để ngắm và làm cả trại vui hơn, so that hồ cũng để trang trí.
56. As a người chơi, I want câu cá bằng minigame bấm đúng nhịp ở hồ nhà và sông làng, so that có trò chơi nhỏ.
57. As a người chơi, I want sông làng có cá hiếm theo mùa và thỉnh thoảng câu dính ủng cũ, so that câu cá có bất ngờ.
58. As a người chơi, I want ếch sống ở hồ, ăn sâu ở ruộng gần hồ, bắt bằng vợt bán được, so that hồ giúp ruộng.

### 4B — Cây ăn trái

59. As a người chơi, I want trồng chuối, ổi, cam, xoài, mít, sầu riêng mở dần theo cấp, mỗi cây khối 2×2, so that có cây lâu năm.
60. As a người chơi, I want mỗi cây có hình riêng ở cây con, cây non, cây cho trái, so that nhìn là biết cây gì.
61. As a người chơi, I want cây trồng một lần thu nhiều lần, không chết vì già, so that đầu tư lâu dài.
62. As a người chơi, I want rung cây cho trái rơi rồi nhặt, so that thu trái có cảm giác thật.
63. As a người chơi, I want trái bỏ lâu dưới đất thì có ruồi và hỏng, so that phải nhặt kịp.
64. As a người chơi, I want tỉa cành thì sai trái hơn, lâu không tỉa thì ra ít trái, so that có việc chăm.
65. As a người chơi, I want cây bị sâu đục thân yếu dần nếu không chữa, so that phải để ý cây.
66. As a người chơi, I want bão có thể làm gãy cành, so that thời tiết ảnh hưởng tới vườn trái.
67. As a người chơi, I want cây đúng mùa ra gấp đôi trái, so that mùa có ý nghĩa với cây trái.
68. As a người chơi, I want trồng dâu tằm để lấy lá nuôi tằm, so that có chuỗi tằm tơ.
69. As a người chơi, I want sóc tới trộm trái, đuổi được bằng tay hoặc bằng mèo, so that vườn trái có kẻ phá.

### 4B — Mèo

70. As a người chơi, I want thấy mèo rình rồi vồ chuột kèm thông báo, so that biết mèo đang làm việc.
71. As a người chơi, I want mèo đuổi sóc ở cây ăn trái, so that nuôi mèo có lợi rõ.
72. As a người chơi, I want kho có mèo canh thì chuột không ăn đồ trong kho, so that mèo bảo vệ kho.
73. As a người chơi, I want thỉnh thoảng mèo tha quà về cửa, so that mèo dễ thương.
74. As a người chơi, I want khung thông tin mèo hiện số chuột đã bắt, so that thấy công của mèo.

### 4B — Ong và tằm

75. As a người chơi cấp 10, I want đặt thùng ong cạnh vườn trái, mỗi thùng một đàn, so that có mật.
76. As a người chơi, I want lấy tổ ong rồi cho vào máy quay mật để ra mật ong và sáp ong, so that có chuỗi ong.
77. As a người chơi, I want ong thụ phấn làm cây ăn trái gần đó sai trái hơn, so that ong và vườn trái hỗ trợ nhau.
78. As a người chơi, I want không mặc đồ bảo hộ thì bị ong đốt mất thể lực, so that đồ bảo hộ có ích.
79. As a người chơi cấp 12, I want xây nhà tằm 2/4/6 nong, cho tằm ăn lá dâu, so that có kén.
80. As a người chơi, I want kén qua khung dệt thành lụa, lụa qua máy may thành áo dài, so that có hàng giá cao.
81. As a người chơi, I want xà phòng làm từ dầu phộng và sáp ong, so that chuỗi chế biến nối nhau.

### 4B — Loài mới

82. As a người chơi, I want nuôi thỏ angora trong chuồng thỏ để lấy lông thỏ, đẻ 2–4 con một lứa, so that có loài nhỏ dễ nuôi.
83. As a người chơi, I want thỏ dễ bị chuột và chồn bắt, so that phải bảo vệ chuồng thỏ.
84. As a người chơi, I want nuôi ngỗng thả rông lấy trứng ngỗng, so that có thêm gia cầm.
85. As a người chơi, I want ngỗng thấy người lạ thì kêu và đuổi mổ, so that ngỗng canh nhà như chó.
86. As a người chơi, I want nuôi dê lấy sữa dê làm phô mai dê, so that có thêm sữa.
87. As a người chơi, I want dê hay nhảy rào gặm rau, cần rào cao, so that dê có cá tính.
88. As a người chơi, I want nuôi trâu thích đầm bùn, so that đồng cỏ có thêm loài.
89. As a người chơi, I want dắt bò hoặc trâu ra ruộng cày cả hàng hoặc khối 3×3, so that đỡ cuốc tay.
90. As a người chơi, I want có trâu khỏe thì thùng giao hàng trả 85% và chứa gấp đôi, so that trâu có ích lâu dài.
91. As a người chơi, I want nuôi bồ câu trên mái để gửi thư và quà cho bạn online, so that có cách liên lạc dễ thương.
92. As a người chơi, I want bồ câu được ăn đầy đủ thì thư tới nhanh hơn, so that chăm bồ câu có lợi.
93. As a người chơi cấp 18, I want nuôi công xòe đuôi mỗi sáng làm cả trại vui hơn, so that có con vật để khoe.
94. As a khách, I want thấy công xòe đuôi khi thăm vườn bạn, so that thấy vườn bạn đẹp.
95. As a người chơi cấp 15, I want nuôi ngựa, cưỡi đi nhanh ×2, so that đi lại vườn lớn nhanh hơn.
96. As a người chơi, I want ngựa phải được chải lông và cho ăn cà rốt, so that ngựa cần chăm.
97. As a người chơi, I want mỗi loài mới có đủ 4 giai đoạn với hình riêng, có đực/cái, sinh sản theo luật Phase 2, so that loài mới chơi như loài cũ.

### 4B — Máy cho vật nuôi và ruộng

98. As a người chơi, I want nâng ổ ấp thành máy ấp 3 cấp (1, 3, 6 trứng; nhanh dần), so that ấp trứng không còn chậm và lẻ tẻ.
99. As a người chơi, I want máy ấp cấp 3 ấp được trứng ngỗng, so that nhân giống ngỗng.
100. As a người chơi, I want gắn máng trứng lăn vào chuồng gia cầm để trứng đẻ trong chuồng tự vào kho, so that đỡ nhặt từng quả.
101. As a người chơi, I want trứng đẻ ngoài vườn khi thả rông vẫn phải tự nhặt, so that máy không thay hết việc.
102. As a người chơi, I want gắn máy gặt vào khối ruộng để tự hái khi chín và cất vào kho, so that ruộng lớn không héo khi bận.
103. As a người chơi, I want máy gặt không gieo lại và chỉ ra tối đa ★2, so that tự tay hay thuê thợ vẫn có giá trị.
104. As a người chơi, I want máng trứng lăn và máy gặt tốn điện và có hao mòn, so that tự động hóa có giá.

### 4B — Đơn việc

105. As a người chơi, I want có đơn của Chú Ba cần heo đạt cân, so that nuôi heo có mục tiêu.
106. As a người chơi, I want có đơn nhờ chó biểu diễn lệnh đã dạy, so that dạy chó có ích.
107. As a người chơi, I want có đơn mượn mèo bắt chuột một buổi, mèo về mang quà, so that mèo có việc làm.
108. As a người chơi, I want đơn việc nằm chung bảng đơn hàng (tối đa 3 đơn), so that không thêm bảng mới.

### 4C — Cư dân và Tiếng tăm

109. As a người chơi, I want có độ thân ❤️1–5 với từng cư dân, so that làm quen dân làng có ý nghĩa.
110. As a người chơi, I want tăng ❤️ bằng giao đơn, tặng quà đúng sở thích và chào hỏi mỗi ngày, so that biết cách làm thân.
111. As a người chơi, I want mỗi cư dân có món thích và món ghét, so that phải tìm hiểu từng người.
112. As a người chơi, I want ❤️ cao thì được giảm giá, công thức mới, đơn giá cao, sự kiện riêng, so that làm thân có thưởng.
113. As a người chơi, I want đơn khó tính của Bé Bi thưởng ⭐, so that có thử thách.
114. As a người chơi, I want kiếm ⭐ từ đổi công, đơn khó tính, ❤️5 cư dân, thành thạo 3, uy tín shop, so that có nhiều đường lên danh tiếng.
115. As a người chơi, I want tiêu ⭐ ở Tiệm Danh Giá cho màu lông hiếm, đồ trang trí độc quyền, danh hiệu, bản thiết kế máy cấp cao, so that có thứ để khoe.
116. As a người chơi, I want ⭐ không đổi được ra xu, không trộm, không tặng, so that ⭐ giữ giá trị.
117. As a người chơi online, I want giúp bạn đủ nhiều lần thì cả hai được ⭐ (đổi công), so that giúp nhau có thưởng.

### 4C — Nhân công

118. As a người chơi cấp 5, I want thuê thợ ở bảng cổng làng theo ca hoặc cả ngày, so that có người phụ việc.
119. As a người chơi, I want hợp đồng tự gia hạn, trừ tiền đầu ca, hủy lúc nào cũng được, so that dễ quản lý.
120. As a người chơi, I want khoanh vùng làm việc cho từng thợ, so that thợ làm đúng chỗ.
121. As a người chơi, I want thợ đi lại thật, mệt thì ngủ gật dưới gốc cây, phải đánh thức, so that thợ có hồn.
122. As a người chơi, I want thợ dùng đồ trong kho và báo khi hết, so that biết phải mua thêm.
123. As a người chơi, I want thợ làm cả khi tôi offline trong 8 giờ chạy bù, có báo cáo cuối ca, so that vắng nhà vườn vẫn được chăm.
124. As a người chơi, I want thợ lên cấp làm nhanh hơn, cấp 3 ra được ★3, lương tăng theo cấp, so that giữ thợ lâu có lợi.
125. As a người chơi, I want hết tiền thì thợ không tới và gửi thư báo, so that không bị nợ lương.
126. As a người chơi, I want thợ cho ăn được nhưng không chữa bệnh được, so that vẫn phải tự chăm con bệnh.

### 4C — Hội chợ và thi nông sản

127. As a người chơi, I want mua vé loto chọn 3 số, quay lúc 20h mỗi ngày game, so that có trò may rủi.
128. As a người chơi online, I want giải độc đắc chung cả làng, người trúng hiện trên bảng tin, so that cả làng cùng hồi hộp.
129. As a người chơi, I want chơi ném vòng, bắn lon (kỹ năng) và vòng quay (may rủi) để lấy đồ trang trí độc quyền, so that hội chợ vui.
130. As a người chơi, I want hội chợ chỉ dùng xu trong game và giới hạn vé mỗi ngày, so that không thành cờ bạc thật.
131. As a người chơi, I want gửi bài thi trái to nhất, vật nuôi đẹp nhất, rổ nông sản vào tối Chủ nhật, so that có dịp khoe.
132. As a người chơi, I want bình chọn bài của người khác và có giám khảo NPC chấm thêm, so that làng vắng vẫn có kết quả.
133. As a người chơi, I want bài dự thi trả về sau khi trưng bày, vật nuôi dự thi bằng hồ sơ, so that không mất gì khi đi thi.
134. As a người chơi, I want giải nhất, nhì, ba có xu, cúp, bảng vinh danh đặt ở vườn, so that thắng có cái để khoe.

### 4C — Chợ phiên, uy tín shop, xe hàng rong

135. As a người chơi cấp 5, I want bày sạp ở chợ phiên 12h–13h và 20h–21h, so that bán hàng cho người khác.
136. As a người chơi, I want tự đặt giá 50%–200% giá gốc, so that hàng hiếm bán được giá.
137. As a người chơi, I want sạp mở suốt phiên dù tôi đi đâu, hết phiên hàng chưa bán về kho, so that không phải đứng canh.
138. As a người mua, I want mua hàng ở sạp người khác, hàng vào hộp quà ở cổng vườn, so that có con giống, hàng ★, hạt hiếm.
139. As a người chơi, I want khách NPC đi chợ mua món giá ≤ giá gốc, so that chợ không vắng.
140. As a người chơi đơn, I want vẫn có chợ phiên với khách NPC và sạp NPC, so that chơi một mình vẫn đủ.
141. As a người chơi, I want nâng sạp 4 → 6 → 8 ô, sạp đẹp dần, so that có chỗ tiêu xu.
142. As a người chơi, I want uy tín shop 🏪1–5 tăng khi bán hàng ★, hàng An toàn, con giống khỏe, giảm khi bán hàng hư hay con bệnh, so that bán hàng tốt có lợi.
143. As a người chơi, I want 🏪 cao thì đông khách NPC hơn và mỗi tuần được thêm ⭐, so that giữ uy tín có thưởng.
144. As a người chơi, I want đẩy xe hàng rong đi bán khắp làng ngoài giờ chợ phiên, so that bán được lúc khác.

### 4C — Livestream

145. As a người chơi cấp 5, I want lên livestream tối đa 30 phút, 3 lần mỗi ngày thật, so that bán hàng kiểu mới.
146. As a người chơi, I want độ hot 🔥 tăng khi làm việc thật trước người xem và trả lời đúng câu hỏi người xem, so that live sinh động.
147. As a người chơi, I want giỏ live 6 món giá 50%–200%, so that bán trong lúc live.
148. As a người xem, I want vào vườn bạn đang live như đi thăm, thả ❤️, chat câu có sẵn và bấm mua, so that tham gia live.
149. As a người xem, I want xem đủ 3 phút được mã giảm giá, tối đa 3 mã mỗi ngày, so that xem live có lợi.
150. As a người chơi, I want người xem NPC đông theo độ hot và uy tín, so that live không vắng khi ít người online.

### 4C — Mùa dịch, hợp tác xã, mã giảm giá, sự kiện diệt chuột

151. As a người chơi, I want được báo trước khoảng 1 giờ khi sắp có mùa dịch, so that kịp tiêm phòng.
152. As a người chơi, I want con đã tiêm phòng không sao và sản phẩm có nhãn "✅ An toàn" bán được giá cao trong mùa dịch, so that tiêm phòng có lợi.
153. As a người chơi, I want trong mùa dịch Chú Ba ngừng mua và thùng giao hàng trả giá thấp cho nhóm bị dịch, so that mùa dịch có hậu quả thật.
154. As a người chơi online, I want cả làng góp hàng cho chỉ tiêu hợp tác xã mỗi tuần, được trả 100% giá chợ, so that cùng làm một việc lớn.
155. As a người chơi, I want đủ chỉ tiêu thì cả làng có thưởng, góp nhiều được nhiều, không đủ thì không phạt, so that tham gia không áp lực.
156. As a người chơi, I want dùng mã giảm 10%, 20%, miễn phí giao ở Đặt hàng online, so that mua rẻ hơn.
157. As a người chơi, I want tặng mã cho bạn qua hộp quà, so that chia sẻ ưu đãi.
158. As a người chơi online, I want sự kiện diệt chuột, bắt rắn, phun sâu chung cả làng 2 lần mỗi tuần, báo trước 1 giờ, so that cả làng cùng chống.
159. As a người chơi, I want sang vườn bạn diệt giúp, nhất là vườn người offline, so that giúp nhau có thật.
160. As a người chơi, I want con sót lại chỉ gây hại nhẹ, không bao giờ chết con vật hay mất cả ruộng, so that sự kiện không phá game.

### Hướng dẫn, thông báo và người chơi cũ

161. As a người chơi, I want thông báo đúng mức cho đồ sắp hư, hóa đơn tới, sắp cắt điện, máy xong hàng, máy sắp hỏng, so that không bỏ lỡ.
162. As a người chơi, I want bảng Việc cần làm có thêm việc của từng đợt (lấy hàng ở máy, trả hóa đơn, cho cá ăn, rung cây, lấy mật, đánh thức thợ...), so that biết việc mới.
163. As a người chơi, I want sổ tay có trang cho từng hệ thống mới, so that tra cứu khi quên.
164. As a người chơi cũ, I want vườn chuyển sang v5 không mất xu, đồ, cây, con vật, so that cập nhật an toàn.

## Implementation Decisions

- **Bản lưu v5 một lần ở đầu 4A (ADR 0018).** Kho và giỏ theo lô: mỗi món tươi giữ các lô `{ số lượng, sao, độ tươi còn lại }`, món không hư giữ số đếm. Thêm cấp kho, kho lạnh, sức mua đã bán theo món, hộp thư, hóa đơn, độ bền trên thực thể có hao mòn, hàng chờ máy. Bước chuyển v4→v5 thuần: đồ cũ thành lô tươi mới, kho cấp 1, không nợ hóa đơn (khoản tiền điện chưa trả của Phase 3 chuyển vào hóa đơn đầu tiên). Fixture `v4-farm`, `v4-fresh` chụp bằng code v4.
- **Một API kho chung** cho mọi chỗ cộng/trừ hàng (thu hoạch, bán, đơn, trộm, quà, đặt hàng online, thùng giao hàng, máy, thợ, sạp). Lấy ra thì lấy lô gần hư nhất trước. Sức chứa tính bằng hàm, chỉ đếm hàng bán được.
- **Đồng hồ hư chỉ chạy trong `tick` lúc chủ đang chơi;** `catchUp` (trình duyệt và server) bỏ qua bước hư. Server không cần biết gì thêm.
- **Sức mua theo người (ADR 0009)** nằm trong bản lưu: đã bán bao nhiêu mỗi món trong cửa sổ hồi. Thùng giao hàng chốt lúc 6h cũng đi qua cùng hàm giá.
- **Lịch sự kiện làng là hàm thuần (ADR 0019):** một module lịch dùng chung cho được mùa/mất mùa, mùa dịch, sự kiện diệt chuột, chỉ tiêu hợp tác xã, giờ chợ phiên. Đầu vào là hạt giống và mốc thời gian, không đọc đồng hồ máy.
- **Trạng thái cộng dồn của làng trên server (ADR 0019):** bảng SQLite riêng, tin WebSocket gửi đóng góp và phát số mới. Chơi đơn giả lập trong bản lưu.
- **Mua bán giữa người chơi (ADR 0020):** hàng rời kho khi bày, mua là thao tác khách có mã duy nhất, hàng vào hộp quà người mua.
- **Máy chế biến là một kiểu công trình** đặt bằng `canPlace` (ADR 0005), có bảng công thức trong `data.js` (đầu vào, đầu ra, thời gian, điện, cấp mở). Một khung chung cho mọi máy; thêm máy là thêm dòng dữ liệu và sprite. Máy chạy theo giờ vườn như mọi luật khác, cả lúc chạy bù.
- **Hóa đơn tháng thay tiền điện hằng ngày của Phase 3.** Mọi máy dùng điện cộng vào một đồng hồ điện chung; hóa đơn chốt ngày 1 của tháng game, gửi hộp thư. Cắt điện là một cờ mà mọi máy đọc.
- **Hao mòn là thuộc tính độ bền trên thực thể,** giảm theo lần dùng và theo bão (hàm thời tiết ADR 0014).
- **Hồ cá là công trình theo khối** như khối ruộng, nối được, có độ sạch nước chung cả hồ. **Cây ăn trái là thực thể 2×2** đặt tự do. Cả hai dùng luật đặt của ADR 0005.
- **Loài mới dùng lại hệ vật nuôi Phase 2:** thêm dòng vào bảng loài (vòng đời, đực/cái, sản phẩm, chuồng). Loài có hành vi riêng (ngỗng canh nhà, dê nhảy rào, công xòe đuôi, ngựa cưỡi, bồ câu đưa thư) là móc nhỏ trong luật, không tách hệ mới. Chuồng mới (thỏ, ngựa, bồ câu, nhà tằm, thùng ong) thêm vào `PEN_TABLE`.
- **Máy gắn cố định** (máng trứng lăn, máy gặt) là nâng cấp gắn vào chuồng hay khối ruộng, như tưới nhỏ giọt của Phase 3. Giới hạn ★2 dùng luật chất lượng có sẵn.
- **Thợ là thực thể động** do luật điều khiển theo ca và vùng khoanh; `world.js` chỉ diễn đi lại. Luật thợ chạy cả lúc chạy bù (trình duyệt và server) với thứ tự việc cố định để kết quả giống nhau.
- **Livestream:** người xem vào vườn bằng đường thăm vườn đang có (issue 26–28), thêm trạng thái "đang live" ở cổng và danh sách bạn bè. Người xem NPC và độ hot là luật trong bản lưu người live.
- **Mã giảm giá** gắn vào Đặt hàng online đang chạy (giao ngay 30%, 1 phút 20%, 2 phút 10%). DESIGN §8.6 được sửa theo bản đang chạy.
- **Số liệu:** mỗi đợt có bảng số liệu trong `docs/proposals/` theo khung cân bằng tối 03/10, chủ game duyệt trước khi code (ADR 0017). Số trong PRD này lấy từ DESIGN, chỉ là điểm xuất phát.
- **Pixel art (Opus, issue riêng mỗi đợt):** 4A: kho 3 cấp, kho lạnh, hộp thư, 8 máy chế biến (đang chạy/dừng/hỏng), cờ lê vàng, bếp, thành phẩm và món ăn, viền hư. 4B: hồ (nước theo độ sạch, rong), 6 loài cá × 3 cấp, ếch, 7 cây trái + dâu tằm × 3 giai đoạn (có trái, gãy cành, sâu), trái rụng, sóc, thùng ong, ong, nhà tằm, tằm, kén, 7 loài × 4 giai đoạn (đực/cái, ngủ), chuồng thỏ, chuồng ngựa, chuồng bồ câu, người cưỡi ngựa, công xòe đuôi, máy ấp 3 cấp, máng trứng lăn, máy gặt, mèo vồ. 4C: cư dân và 4 thợ (đi, ngủ gật, làm việc), bảng thuê, sạp 3 cấp, xe hàng rong, gian hội chợ, nhà hợp tác xã, cúp và bảng vinh danh, khung livestream, rắn.

## Testing Decisions

- **Test tốt** chỉ kiểm hành vi qua API công khai của `state.js`, giao thức server và những gì người chơi thấy (ADR 0008). Không thêm hook test vào game. Dựng tình huống bằng bản lưu ghi sẵn, hạt giống cố định cho thời tiết và lịch sự kiện, mốc giờ truyền vào.
- **Mỗi issue chạy lại đúng các spec e2e liên quan, không chạy cả bộ.** Issue phát hành mỗi đợt mới chạy cả bộ unit và e2e một lần.
- **Seam 1 – `state.js` (node --test):**
  - 4A: chuyển v4→v5 không mất gì, chạy hai lần cùng kết quả, bản lỗi không ghi đè (prior art `tests/save-v4.test.mjs`); sức chứa chỉ đếm hàng bán được, vượt khi chuyển thì giữ, hàng giao/quà luôn vào; đồ hư theo bảng khi đang chơi, **không hư khi `catchUp`**, kho lạnh ×5, lấy lô gần hư trước, hư thành rác hữu cơ; sức mua rớt 2% mỗi món vượt, sàn 50%, hồi sau 2 ngày, riêng từng người, áp cả thùng giao hàng; lịch được mùa/mất mùa cùng kết quả với cùng hạt giống; hóa đơn chốt ngày 1, hạn 3 ngày, cắt điện không làm âm xu, trả nợ cộng phí thì chạy lại, tắt máy thì không tính điện; máy chế biến hàng chờ theo cấp, chạy khi chạy bù, dừng khi cắt điện mà không mất nguyên liệu; hao mòn, bão làm mòn thêm, dưới 30% chậm, 0% ngừng, tự sửa tới 80%, thuê thợ tới 100%; bếp nấu đúng công thức.
  - 4B: hồ nhận tối đa 2 con mỗi ô, độ sạch giảm theo cá, cám, phân vịt, ngưỡng 40/20; cá lớn 3 cấp; ếch ăn sâu ở ruộng gần hồ; cây trái 3 giai đoạn, ra trái theo chu kỳ, đúng mùa gấp đôi, tỉa cành, sâu đục thân, bão gãy cành, không chết vì già; sóc trộm trái, mèo đuổi sóc; mèo vồ chuột và canh kho; ong thụ phấn tăng trái trong tầm, đốt khi không có đồ bảo hộ; tằm ăn lá dâu ra kén; 7 loài mới có vòng đời, đực/cái, sinh sản, sản phẩm đúng bảng; ngỗng phát hiện người lạ; kéo cày xới đúng hàng/khối; trâu nâng thùng giao hàng; máy ấp 3 cấp; máng trứng lăn chỉ lấy trứng trong chuồng; máy gặt không gieo lại và tối đa ★2; đơn việc kiểm đúng điều kiện (cân heo, lệnh chó, mèo đi vắng).
  - 4C: ❤️ cư dân tăng đúng nguồn và giới hạn mỗi ngày; ⭐ không đổi ra xu, không trộm, không tặng; thợ theo ca, trừ tiền đầu ca, hết tiền không tới, thể lực 60, ngủ gật, lên cấp, làm trong chạy bù với thứ tự cố định; loto đúng tỉ lệ và trần 10 vé; bày sạp và mua theo ADR 0020 (giá 50–200%, đã bán hết, không tự mua, cùng mã không áp hai lần); khách NPC chỉ mua ≤ giá gốc; uy tín shop theo 20 lần bán gần nhất; độ hot livestream; mùa dịch ×3 bệnh, tiêm phòng miễn, nhãn An toàn; hợp tác xã trả 100% giá chợ; mã giảm giá đúng loại, hết hạn, 1 mã mỗi đơn; sự kiện diệt chuột không bao giờ giết con vật, vườn offline chỉ bị hại một nửa.
- **Seam 3 – giao thức server (`bootServer`):** server chạy bù vườn có máy chế biến, hóa đơn, cây trái, hồ cá, thợ cho cùng kết quả với trình duyệt; đồ không hư lúc server chạy bù; đóng góp loto, hợp tác xã, diệt chuột được cộng đúng và phát cho mọi người; mua ở sạp người đang offline được áp đúng một lần; hai người mua món cuối thì một người nhận "đã bán hết" và không mất xu.
- **Seam 2 – Playwright (desktop + 360px):** mỗi issue có một kịch bản người chơi thấy được bằng bản lưu ghi sẵn, ví dụ: bỏ lúa vào cối xay, tua thời gian, lấy gạo ra bán; nhận hóa đơn trong hộp thư và trả; đào hồ, thả cá, kéo lưới; trồng cây trái, rung cây, nhặt trái; thuê thợ và thấy thợ làm việc; bày sạp, người thứ hai mua (test online hai trình duyệt). Prior art: `e2e/offline-harvest.spec.mjs`, `e2e/build.spec.mjs`, các spec online của Phase 1.

## Out of Scope

- Nội thất, đặt đồ, Nhà đẹp, điểm đẹp của vườn, thú cưng cảnh, quần áo và tác dụng của quần áo, các phiên bản bếp củi/ga/từ, tủ lạnh (Phase 5). Công và cá Koi chỉ có tác dụng "vui" tạm ở phase này.
- Nhiệm vụ hằng ngày, lễ hội, sổ sưu tầm, khoảng 60 thành tựu, nhiệm vụ làm quen mới, bảng thành tựu liên tục (Phase 7). Các nguồn ⭐ từ thành tựu, lễ hội, nhiệm vụ hằng ngày nối ở Phase 7.
- Đánh nhau hoặc hôn người chơi khác (để sau, chưa thiết kế).
- Máy phát điện chống mất điện khi bão (chưa có trong DESIGN).
- Đổi các gói giao của Đặt hàng online đang chạy.
- Trộm vật nuôi (đã chốt không làm).

## Further Notes

- **Thứ tự và song song:** 4A trước hết vì có v5 và các chỗ hút xu. Trong mỗi đợt, issue bảng số liệu và issue ART chạy đầu tiên, song song nhau; issue code bắt đầu khi bảng số đã duyệt.
- **Xoay chuồng** (nhánh `p4-penrot`, xong cả art lẫn code) gộp vào `main` ngay sau khi phát hành Phase 3, không cần issue mới.
- **Đợt 4C là đợt nặng online nhất** (chợ phiên, livestream, trạng thái chung). Nên giao issue nền "trạng thái chung của làng trên server" cho agent Opus, các issue còn lại Sonnet.
- Số issue lớn, nên giữ mỗi agent một worktree, cổng e2e riêng, và hạn chế số agent chạy e2e cùng lúc (máy từng quá tải khi khoảng 47 trình duyệt chạy cùng lúc).
- Mốc "điện nước + sửa chữa chiếm khoảng 15–25% thu nhập" (DESIGN §3.3d) là chỉ tiêu cho bảng số liệu 4A.
