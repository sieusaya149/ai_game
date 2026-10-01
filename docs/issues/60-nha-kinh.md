# 60. Nhà kính có mái và bảng trạng thái

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · DESIGN §1.5 · ADR 0003, 0005, 0014, 0008 · User story 46–54

## What to build

Nhà kính là thực thể phủ đúng footprint của một khối ruộng 3×3, có cửa, và là công trình đầu tiên có **mái** hiển thị theo người đứng trong hay ngoài.

- **Mở khóa và giới hạn:** mở ở cấp người chơi 14, rất đắt, tối đa 2 cái mỗi vườn. Chỉ đặt lên khối ruộng có sẵn; `canPlace` từ chối đúng lý do khi chưa đủ cấp, vượt 2 cái, hoặc không trùng khối ruộng.
- **Tác dụng với các ô bên trong:**
  - Bỏ qua ảnh hưởng của mùa (★3 quanh năm, không bị chậm trái mùa).
  - Không bị sương muối hay bão (issue 55), quạ không vào được.
  - Trộm vẫn vào được qua cửa.
- **Điểm trừ:** tốn điện sưởi mùa Đông (trừ vào tiền điện hằng ngày lúc 6h, cùng cơ chế issue 58). Bão có tỉ lệ thấp làm **vỡ kính**, phải sửa bằng xu mới hưởng lại tác dụng. Hao mòn và sửa tự động thuộc Phase 4.
- **Hiển thị mái (cơ chế "công trình có mái"):**
  - Đứng ngoài: mái phủ kín. Ở cửa có **bảng trạng thái** tóm tắt các ô bên trong (💧 khô · 🐛 sâu · ✨ chín · 🥀 héo). Có việc gấp thì bong bóng nhấp nháy trên mái.
  - Bước vào cửa: mái mờ dần rồi ẩn, thấy cây như ruộng thường. Ra ngoài thì mái hiện lại.
  - Khách online thấy y như chủ.
- **Pixel art do agent Opus vẽ.** Sprite cần vẽ: mái kính (đủ để mờ dần), khung nhà kính và cửa, bảng trạng thái ở cửa (các biểu tượng 💧🐛✨🥀), bong bóng nhấp nháy, kính vỡ.

## Acceptance criteria

- [ ] Unit test (seam 1): đặt nhà kính bị từ chối khi dưới cấp 14, khi đã có 2 cái, khi không trùng một khối ruộng; đặt đúng thì ok.
- [ ] Unit test: ô trong nhà kính bỏ qua trái mùa và được ra ★3 giữa Đông; không bị sương muối dừng cây; bão không đổ gì bên trong; quạ không vào.
- [ ] Unit test: sưởi mùa Đông có tiền điện; kính vỡ thì mất tác dụng cho tới khi sửa, sửa tốn xu. Trộm vẫn vào được qua cửa.
- [ ] Unit test: hàm tóm tắt trạng thái trả đúng số ô khô, sâu, chín, héo bên trong.
- [ ] E2E (desktop + 360px): dựng bản lưu có nhà kính và vài ô khô, sâu, chín → đứng ngoài thấy mái phủ và bảng trạng thái đúng số → bước vào cửa thì mái mờ rồi ẩn → ra ngoài mái hiện lại.
- [ ] E2E (hai trình duyệt qua server): khách vào vườn thấy nhà kính và bảng trạng thái giống chủ.

## Blocked by

- [54](54-mua-co-tac-dung.md)
- [55](55-thoi-tiet-xau.md)
