# 45. Vòng đời chó và dạy lệnh bằng minigame

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0004, 0008, 0013 · User story 97–107

## What to build

- **Vòng đời chó:** chó con nghịch tha dép và ỉa nhiều; chó nhỡ sủa lung tung và **học được lệnh**; chó trưởng thành canh nhà, đuổi trộm, lùa; chó già ngủ nhiều và **phát hiện trộm chậm hơn** (bán kính phát hiện nhỡ 4 ô, trưởng thành 6 ô, già 4 ô). Chó không chết vì già (lát 34).
- **Dạy lệnh bằng minigame:** khi chó ở giai đoạn nhỡ hoặc trưởng thành, mỗi buổi tốn **1 bánh thưởng** (vật phẩm mới ở chợ Bà Tư), **mỗi ngày game 1 buổi**. Minigame: **bấm đúng lúc chó làm đúng động tác** thì khen. Kết quả minigame là **"đạt/không đạt"** gửi vào luật; luật quyết định tiến độ.
  - **Chó vui thì học nhanh; chó đói hay buồn có thể bỏ giữa chừng** (buổi đó không tính, vẫn mất bánh thưởng hay không chốt trong bảng số liệu).
  - **Ngồi (2 buổi)** là lệnh nền, phải học trước; các lệnh khác bị khóa tới khi học Ngồi.
- **6 lệnh và tác dụng:**
  - 🪑 **Ngồi (2):** đứng yên tại chỗ.
  - 🚶 **Đi theo (3):** đi sát người chơi, kể cả sang làng hay vườn bạn.
  - 🛡️ **Canh khu (4):** gác một chỗ người chơi chọn, **bán kính phát hiện trộm ×2** tại chỗ gác.
  - 🐑 **Lùa (5):** lùa cả đàn về chuồng khoảng **20 giây**, kể cả bò, cừu đi lạc; **tự lùa mỗi tối** nếu chó đang no và vui (kết quả do luật theo ADR 0013: các con lạc ở lát 42 được đưa về, `world.js` chỉ diễn hoạt chó chạy vòng).
  - 👃 **Tìm trứng (4):** đánh hơi trứng giấu trong bụi (đánh dấu trứng trong bụi từ lát 41).
  - 🐦 **Đuổi chim (3):** tự đuổi quạ và diều hâu (liên kết kẻ săn mồi lát 43).
- **Ra lệnh:** hành động trên chó mở danh sách các lệnh đã học; Canh khu cho chọn ô gác.
- **Chó học đủ 6 lệnh** thì **không ăn xúc xích của người lạ** (lát 46 dùng luật này).
- **Online:** chó canh vườn dùng vòng đời và lệnh Canh khu của lát này (thay luật chó đơn giản của Phase 1).
- **Pixel art do agent Opus vẽ:** chó 4 giai đoạn (bổ sung cho lát 34) với các động tác dạy lệnh (ngồi, đứng, bắt tay…), minigame dạy lệnh (thanh bấm, dấu khen), biểu tượng 6 lệnh, bánh thưởng, bong bóng lệnh, chó sủa và ngủ gật.

## Acceptance criteria

- [ ] Unit test (seam 1): mỗi lệnh cần đúng số buổi (2/3/4/5/4/3); phải học Ngồi trước khi học lệnh khác; mỗi ngày game chỉ dạy 1 buổi; mỗi buổi trừ 1 bánh thưởng; kết quả "không đạt" không tăng tiến độ; chó đói/buồn có thể bỏ giữa chừng (hạt giống cố định); chó con không dạy được.
- [ ] Unit test: Canh khu nhân đôi bán kính phát hiện tại ô gác; Lùa đưa cả đàn kể cả bò, cừu lạc về chuồng; chó đã học Lùa tự lùa mỗi tối khi no và vui; chó học đủ 6 lệnh thì miễn nhiễm xúc xích người lạ; chó già phát hiện trộm chậm hơn (bán kính 4 ô).
- [ ] Giao thức server (seam 3): chó canh vườn online dùng lệnh Canh khu của chủ, kết quả khớp với luật trong `state.js`.
- [ ] E2E (Playwright, desktop + 360px): dựng bản lưu có chó nhỡ, đủ bánh thưởng → dạy lệnh Ngồi bằng minigame hai buổi (qua hai ngày game) → học xong thì ra lệnh Ngồi được; dựng bản lưu ở 18h với đàn lạc và chó đã học Lùa → gọi chó lùa đàn về chuồng.
- [ ] Pixel art chó và minigame dạy lệnh có đủ.

## Blocked by

- [42](42-ve-chuong-va-lua.md)
