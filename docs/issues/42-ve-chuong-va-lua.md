# 42. Chạng vạng về chuồng, con lạc, lùa tay, rải thóc

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0004, 0008, 0013 · User story 74–81

## What to build

- **18h về chuồng (luật trừu tượng, ADR 0013):** tới chạng vạng, **phần lớn gà vịt tự về chuồng**; luật chọn trung bình **1–3 con lạc mỗi tối** và ô mà con lạc đứng. Chuyển ô có hạt giống nên server chạy bù ra cùng kết quả.
  - **Dễ lạc hơn:** con ❤️ thấp (lát 39), con non, con ở xa chuồng.
  - **Đêm bão:** cả đàn chạy tán loạn, số con lạc tăng mạnh.
  - Chạy bù offline không có lùa tay nên luật tự cho con lạc ngủ ngoài theo tỉ lệ đã chốt; không hề gây chết (ADR 0004). Hậu quả của việc ngủ ngoài (chuột, chồn) làm ở lát 43.
- **Hiển thị con lạc:** biểu tượng 💤 và **mũi tên chỉ hướng** khi con lạc ngoài khung nhìn; thông báo 🟡 "con lạc" gộp theo khóa.
- **Lùa tay (ngoại lệ có giới hạn):** gà vịt **chạy tránh người chơi trong khoảng 2 ô**; người chơi đi vòng ra sau đẩy đàn về cửa chuồng. `world.js` báo cho luật khi một con đã đi qua cửa chuồng; luật ghi con đó là đã về.
- **Rải thóc ở cửa chuồng:** hành động mới trên cửa chuồng, tốn **1 bao cám**; gà vịt **trong 5 ô** tự chạy lại và vào chuồng. Từ chối khi hết cám.
- **Số con đã về trên cửa chuồng:** biển như "Gà 8/10 đã về".
- **Chó lùa** (lệnh Lùa) làm ở lát 45.
- **Pixel art do agent Opus vẽ:** biểu tượng 💤 con lạc, mũi tên chỉ hướng cho con lạc, bao cám và hạt thóc rải, biển số con "đã về" trên cửa chuồng, dáng chạy hoảng của gà vịt khi bị đuổi.

## Acceptance criteria

- [x] Unit test (seam 1): sau 18h phần lớn con về chuồng, số con lạc mỗi tối nằm trong 1–3 (thống kê hạt giống cố định); con ❤️ thấp, con non, con ở xa dễ lạc hơn; đêm bão lạc nhiều hơn rõ rệt; số thả rông vẫn không vượt 30.
- [x] Unit test: rải thóc trừ 1 bao cám, các con trong 5 ô vào chuồng, con ngoài 5 ô không vào; từ chối khi hết cám; báo "đã qua cửa chuồng" ghi con vào chuồng và cập nhật số "đã về".
- [x] Unit test: chạy bù một đêm không con nào chết; con lạc được đánh dấu ngủ ngoài.
- [x] E2E (Playwright, desktop + 360px): dựng bản lưu ở 17h59 với đàn gà → qua 18h thấy gà tự về, còn 1–3 con có 💤 và mũi tên chỉ hướng; chạy ra đẩy một con về cửa chuồng; dùng rải thóc để lùa phần còn lại → cửa chuồng hiện đủ số.
- [x] Pixel art 💤, mũi tên, cám thóc có đủ.

## Blocked by

- [41](41-tha-rong-ban-ngay.md)
