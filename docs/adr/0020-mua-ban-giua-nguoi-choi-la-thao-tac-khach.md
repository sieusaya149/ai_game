# Mua bán giữa người chơi là thao tác khách theo ADR 0012

Chợ phiên, giỏ livestream và xe hàng rong cho người chơi mua hàng của nhau. Mỗi lần mua là **một thao tác khách** như giúp hay trộm (ADR 0012):

1. **Bày hàng:** người bán đưa hàng từ kho lên sạp (hay giỏ live, xe hàng rong). Hàng **rời kho người bán ngay**, nằm trong bản lưu của người bán ở chỗ "đang bày", có giá do người bán đặt trong khoảng 50%–200% giá gốc.
2. **Mua:** người mua gửi thao tác lên server. Server gọi hàm thuần trong `state.js` trên bản lưu mới nhất của người bán để kiểm (hàng còn, đúng giá, người mua đủ xu, không tự mua của mình, giới hạn mỗi ngày). Hợp lệ thì server xếp thao tác **"bán được"** cho người bán (cộng xu, bớt hàng đang bày) với mã duy nhất, và trả kết quả cho người mua.
3. **Người mua** trừ xu trong bản lưu của mình và nhận hàng vào **hộp quà ở cổng vườn**. Cùng một mã thì không áp hai lần, ở cả hai phía.
4. **Hết phiên hay hết live**, hàng chưa bán quay về kho người bán (vào kho dù đầy, ADR 0018).

Khách NPC mua cùng đường này nhưng chạy ngay trong `state.js` của người bán (cả lúc chạy bù), không qua server.

## Considered Options

- **Server giữ toàn bộ giao dịch và cả xu của hai bên:** chặt hơn nhưng trái ADR 0002 (trình duyệt giữ mô phỏng), phải chờ mạng và làm lại nhiều.
- **Chuyển thẳng giữa hai trình duyệt:** không ai kiểm, dễ gian lận và mất hàng khi một bên rớt mạng.

## Consequences

- Chống gian lận vẫn ở mức nhẹ như ADR 0002 (nhóm ≤ 20–30 người quen). Khung giá 50%–200% chặn chuyển xu cho nhau qua giá ảo.
- Mua hàng của người đang offline vẫn được: server chạy bù vườn người bán rồi áp thao tác như với vườn offline.
- Xung đột hiếm (hai người cùng mua món cuối) được giải bằng hàm luật trả "đã bán hết". Người mua không mất xu.
- Uy tín shop 🏪 tính từ lịch sử bán của chính người bán, nằm trong bản lưu người bán.
