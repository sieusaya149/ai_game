# 57. Bồn chứa, mạng nước và trạm bơm phụ

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · DESIGN §3.1b · ADR 0005, 0014, 0015, 0008 · User story 57–65

## What to build

Mạng nước là **ngân sách nước theo giờ** và vùng phủ theo khoảng cách ô, không mô phỏng dòng chảy (ADR 0015).

- **Bồn chứa:** có từ giếng cấp 4 (máy bơm), chứa 200 lần nước. **Bồn phụ** +150 lần mỗi bồn. Bồn là một con số "lần nước" gắn với thực thể bồn, hiện mực nước.
- **Giếng bơm đầy bồn** khoảng 20 lần mỗi giờ vườn chạy; hạn hán (issue 55) thì một nửa. Chỉ tính cho thời gian vườn thật sự chạy, đóng băng thì không bơm.
- **Vùng phủ nước:** một công trình "có nước" khi nằm trong **8 ô** tính từ bồn hoặc từ **trạm bơm phụ**. Trạm bơm phụ thêm 8 ô tầm nước và tốn điện (tiền điện hằng ngày làm ở issue 58, ở đây trạm có giá mua và ghi nhận điện tiêu thụ).
- **Điện:** máy bơm và trạm bơm ngừng khi bão làm mất điện (issue 55). Bồn cạn thì máy ngừng, **không ai bị phạt**, cây không chết vì quên.
- **`canPlace` thêm lý do "ngoài tầm nước"** cho công trình cần nước (tưới nhỏ giọt, phun, vòi sen...). Nó đứng trước bước tìm đường, kèm test cho lý do mới (ADR 0005). Công trình đã có sẵn mà sau đó dời ra khỏi tầm thì tạm ngừng chạy chứ không bị xóa.
- **Thứ tự trừ nước cố định** mỗi lượt tick (ví dụ tưới nhỏ giọt trước, vòi sen sau), để chạy bù giống hệt nhau giữa trình duyệt và server. Lát này dựng cơ chế trừ nước và thứ tự; các máy tiêu thụ thêm ở issue 58, 59.
- **UI:** chế độ xây dựng hiện đường ống và vùng phủ màu xanh, mực nước trong bồn. Đặt thử công trình cần nước ngoài tầm thì bóng đỏ kèm lý do "ngoài tầm nước".
- **Pixel art do agent Opus vẽ.** Sprite cần vẽ: bồn chứa (nhiều mức nước), bồn phụ, trạm bơm phụ, đường ống và lớp vùng phủ xanh, thanh mực nước.

## Acceptance criteria

- [ ] Unit test (seam 1): bồn chứa 200 lần, mỗi bồn phụ +150; giếng bơm 20 lần mỗi giờ, hạn hán còn một nửa; bồn không vượt sức chứa.
- [ ] Unit test: vùng phủ 8 ô quanh bồn; trạm bơm phụ thêm 8 ô. `canPlace` công trình cần nước trong tầm thì ok, ngoài tầm thì từ chối với lý do "ngoài tầm nước".
- [ ] Unit test: bồn cạn thì máy ngừng, không trừ âm, không phạt gì. Mất điện do bão thì bơm ngừng.
- [ ] Unit test: đóng băng sau 8 giờ thì bồn không đầy thêm. Thứ tự trừ nước cố định cho cùng kết quả khi chạy lại cùng bản lưu.
- [ ] Unit test (seam 3): server chạy bù đoạn dài có bơm bồn cho cùng mực nước như chạy bù trên trình duyệt với cùng bản lưu.
- [ ] E2E (desktop + 360px): dựng bản lưu giếng cấp 4 → xây bồn → vào chế độ xây dựng thấy vùng phủ xanh và mực nước → đặt công trình cần nước ngoài tầm bị từ chối kèm lý do, trong tầm thì đặt được.

## Blocked by

- [56](56-gieng-4-cap.md)
