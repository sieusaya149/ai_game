# Kho theo lô, đồ hư chỉ tính lúc chủ vườn đang chơi

Đồ tươi hư dần nên kho và giỏ không còn lưu được dạng `{ món: số lượng }`; mỗi món tươi phải nhớ **từng lô kèm độ tươi**. Đây là đổi cấu trúc nên tăng **bản lưu v5, đúng một lần ở đầu đợt 4A**, kèm mọi trường mới đã biết trước của Phase 4. Lúc chuyển, đồ đang có trong kho và giỏ coi như **vừa thu hoạch**, nên không ai mất gì vì cập nhật. Đợt 4B và 4C chỉ thêm trường có mặc định qua `fillSave`, không tăng phiên bản trừ khi bắt buộc.

**Đồng hồ hư chỉ chạy khi chủ vườn đang chơi** (đang ở vườn, trong nhà hay ngoài làng đều tính). Lúc chạy bù offline (trình duyệt hay server) và lúc vườn đóng băng thì đồ **không hư thêm**. Kho thường và giỏ hư theo bảng thời gian; kho lạnh hư chậm khoảng ×5. Thùng giao hàng, hộp quà, sạp chợ phiên, giỏ live và hàng chờ trong máy chế biến **không hư**.

**Sức chứa kho chỉ tính hàng bán được** (nông sản, sản phẩm vật nuôi, thành phẩm máy). Hạt, vật tư, cám, gỗ, đá, đồ trang trí không chiếm chỗ. Ai đang vượt sức chứa lúc chuyển v5 thì giữ nguyên, chỉ không cất thêm được tới khi xuống dưới mức. Hàng giao online, quà, hàng sạp hay giỏ live trả về **luôn vào kho dù đầy** (vượt tạm), không bao giờ mất.

## Considered Options

- **Hư theo "giờ vườn chạy", kể cả 8 tiếng chạy bù (đúng chữ DESIGN):** ngủ một đêm dậy là rau (6 giờ), sữa (4 giờ), cá (3 giờ) trong kho thường đã thối hết. Trái tinh thần ADR 0004 và luật "vắng nhà không chết cây" (chốt tối 03/10).
- **Hư chậm lại khi chạy bù (×0,25):** vẫn phạt người chơi vì ngủ, và thêm một con số khó giải thích.
- **Bỏ đồ hư:** khỏi đổi cấu trúc, nhưng mất một vòi hút xu của ADR 0009 và kho lạnh chỉ còn để trữ chờ giá.
- **Mỗi phần tử một độ tươi riêng:** đúng nhất nhưng bản lưu phình to. Gộp theo lô (cùng món, cùng sao, cùng mốc thu) là đủ.

## Consequences

- Mọi chỗ đang cộng/trừ kho và giỏ (thu hoạch, bán, đơn hàng, trộm, quà, đặt hàng online, thùng giao hàng, máy) phải đi qua một API kho chung; lấy ra thì lấy lô gần hư nhất trước.
- Đồ hư thành **rác hữu cơ**, bỏ vào hố ủ được (Phase 3).
- Server chạy bù không cần biết đồng hồ hư, vì lúc chạy bù đồ không hư. Không có rủi ro lệch kết quả giữa trình duyệt và server.
- Fixture `v4-farm`, `v4-fresh` phải chụp bằng code bản v4 trước issue v5; test chuyển v4→v5 không mất xu, đồ, cây, con vật.
