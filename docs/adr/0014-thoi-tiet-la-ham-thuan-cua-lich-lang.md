# Thời tiết là hàm thuần của ngày game và hạt giống của làng

Thời tiết của một ngày (nắng, mưa, mây, bão, hạn hán, sương muối, cầu vồng) được tính bằng một hàm thuần từ **số ngày game** và **hạt giống của làng**, không bốc thăm ngẫu nhiên lúc chạy. Như vậy mọi trình duyệt và server đều thấy cùng một thời tiết khi online (dùng chung đồng hồ làng, ADR 0003), radio và bảng tin báo trước được ngày mai, và server chạy bù vườn offline ra đúng thời tiết đã xảy ra. Chơi offline thì hạt giống là của riêng vườn.

## Considered Options

- **Server bốc thăm mỗi ngày rồi phát cho mọi người:** cần lưu lịch sử thời tiết để chạy bù, và bản offline lại phải làm một cách khác.
- **Mỗi vườn tự bốc thăm:** bạn bè cùng làng sẽ thấy trời khác nhau, sai với "cả làng dùng chung một đồng hồ".

## Consequences

- Tần suất (bão ~5% số ngày Hạ/Thu, hạn hán 1 đợt mỗi mùa Hạ, sương muối ~15% buổi sáng Đông) là bảng số liệu, hàm thời tiết đọc bảng đó.
- Đổi bảng hay đổi công thức là đổi thời tiết của cả quá khứ. Không sao, vì thời tiết đã qua không được lưu lại, chỉ ảnh hưởng tới chạy bù sau lần đổi.
- Thời tiết xấu không bao giờ giết cây hay con vật, như đã chốt.
