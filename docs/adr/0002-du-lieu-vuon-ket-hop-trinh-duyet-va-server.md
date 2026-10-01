# Dữ liệu vườn: trình duyệt chạy khi chủ online, server chạy bù khi chủ offline

Khi chơi online, trình duyệt của chủ vườn chạy mô phỏng (mượt, không trễ mạng) và gửi bản lưu lên server khoảng mỗi 10 giây. Khi chủ offline, server tự chạy bù vườn đó bằng chính `state.js`, để bạn bè vẫn thăm, giúp và trộm được. Thao tác của khách được server kiểm tra trên bản lưu mới nhất, rồi đẩy sang trình duyệt chủ vườn nếu chủ đang online. Vì trình duyệt giữ mô phỏng nên mỗi tài khoản chỉ có 1 thiết bị được chơi tại một thời điểm.

## Considered Options

- **Server giữ toàn bộ:** khó gian lận nhất, nhưng thao tác nào cũng phải chờ mạng, và khối lượng làm lớn hơn nhiều.
- **Trình duyệt giữ toàn bộ:** đơn giản nhất, nhưng vườn đứng yên khi chủ offline, nên không ai thăm hay trộm được.

## Consequences

- `state.js` phải là JS thuần, không đụng tới DOM, để chạy được cả trên Node.
- Chỉ chống gian lận nhẹ: server từ chối các bản lưu có số liệu vô lý. Như vậy là đủ cho nhóm ≤ 20–30 người quen.
