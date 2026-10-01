# Thả rông, về chuồng và kẻ săn mồi là luật trừu tượng trong `state.js`, không phụ thuộc vị trí điểm ảnh

Server chạy bù vườn offline chỉ có `state.js`, không có `world.js` (đi lại, tìm đường, AI từng khung hình). Vì vậy mọi kết quả có ảnh hưởng tới bản lưu đều do luật trong `state.js` quyết định ở mức ô và theo xác suất có hạt giống: con nào lạc khi chạng vạng, con lạc đang ở ô nào, chuột ăn bao nhiêu cám, trứng đẻ ở ô cỏ nào, diều hâu nhắm con nào. `world.js` chỉ **diễn hoạt** những kết quả đó cho đẹp: con vật đi tới ô luật đã chọn, gà chạy tránh người chơi trong 2 ô, chó chạy vòng lùa đàn.

Lùa bằng tay là ngoại lệ có giới hạn: vị trí con vật đang thả rông được lưu theo ô trong bản lưu, và `world.js` báo cho luật biết khi một con đã đi qua cửa chuồng. Khi chạy bù offline thì không có lùa tay, nên luật tự cho con lạc ngủ ngoài theo tỉ lệ đã chốt.

## Consequences

- Kết quả chạy bù trên server và trên trình duyệt giống nhau, test được bằng `node --test`.
- Kẻ săn mồi khi offline chỉ ăn cám và trộm trứng (ADR 0004). Cảnh báo trước 10 giây khi online là việc của luật, không phải của AI.
- Giới hạn 30 con thả rông và 8 chuột nằm trong luật, không chỉ trong phần vẽ.
