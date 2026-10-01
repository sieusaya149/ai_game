# Mạng nước là ngân sách nước theo giờ và vùng phủ theo khoảng cách ô, không mô phỏng dòng chảy

Bồn chứa là một con số "lần nước". Giếng bơm thêm theo giờ vườn chạy (khoảng 20 lần mỗi giờ, hạn hán thì một nửa). Tưới nhỏ giọt, vòi sen và các máy cần nước trừ vào con số đó, theo thứ tự cố định mỗi lượt tick. Một công trình "có nước" khi nằm trong **8 ô** tính từ bồn hoặc từ trạm bơm phụ; ống nước chỉ là hình vẽ của vùng phủ đó trong chế độ xây dựng. Bồn cạn thì máy ngừng, không ai bị phạt.

## Considered Options

- **Mô phỏng ống nối từng ô, nước chảy theo đường ống:** đẹp hơn nhưng khó cân bằng, khó hiểu với người chơi, và nặng cho server chạy bù.

## Consequences

- `canPlace` có thêm lý do "ngoài tầm nước" cho công trình cần nước, theo cùng luật đặt công trình của ADR 0005.
- Thứ tự trừ nước cố định giúp kết quả chạy bù giống hệt nhau giữa trình duyệt và server.
