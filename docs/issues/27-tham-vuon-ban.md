# 27. Thăm vườn bạn: bước vào, đi dạo, chỉ đọc

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0002, 0005, 0012 · User story 42–48

## What to build

Đi qua làng, bước vào cổng vườn người khác và đi bộ thật trong đó. Khách chưa làm được việc gì tác động tới vườn (issue 28 trở đi).

- **Cảnh mới "vườn của người khác":** dùng lại `sceneMap` với cảnh mới, dựng từ bản lưu của chủ (đã chạy bù ở issue 24), **chỉ đọc**. Khách thấy cây, con vật, công trình, đồ trang trí đúng như chủ để lại.
- **Vào ra bằng cổng:** từ làng, chạm cổng vườn thì chuyển bản đồ sang vườn đó. Đi ra cổng vườn thì về lại làng, ở đúng chỗ cổng vừa vào, để đi tiếp sang vườn khác.
- **Cùng cách điều khiển** như vườn mình (joystick, bấm để đi). Không học thêm gì.
- **Chủ vườn và khách thấy nhau:** mỗi vườn là một bản đồ real-time (như làng ở issue 25). Chủ đang ở trong vườn thì khách thấy chủ, và ngược lại; các khách khác trong cùng vườn cũng thấy nhau. Chủ vườn nhận thông báo 🟡 "X ghé vườn bạn" khi có khách vào (dùng đường đẩy sự kiện từ issue 26).
- **Vuốt ve chó mèo:** khách vuốt ve được chó mèo của chủ. **Chó lạ thì phải cho ăn mới chịu** (khách dùng đồ ăn trong giỏ của mình); chưa cho ăn thì chó không cho vuốt.
- **Chặn:** khách **không vào được nhà** của chủ; **không mở được kho, thùng giao hàng, chế độ xây dựng** của chủ. Chạm vào các thứ đó chỉ hiện lý do ngắn ("Đây là nhà riêng của chủ vườn").
- **Chạy bù khi vào:** vào vườn của chủ offline thì server chạy bù (issue 24) rồi mới trả bản lưu cho khách.
- **Tình huống đặc biệt:** đang dở thao tác nhiều bước thì ra ngoài hủy hết; khách ở trong vườn lúc chủ tắt máy vẫn đi lại bình thường (vườn đã nằm trên server).

## Acceptance criteria

- [ ] Unit test (seam 1): dựng bản đồ khách từ một bản lưu chủ cho đúng các thực thể, chỗ đứng của cổng ra, và lưới va chạm; các vật chặn (cửa nhà, kho, thùng giao hàng) được đánh dấu là không cho khách tương tác.
- [ ] Unit test (seam 1): hàm luật trả lý do từ chối đúng khi khách thử mở nhà, kho, thùng giao hàng, chế độ xây dựng; vuốt ve chó lạ khi chưa cho ăn bị từ chối, cho ăn rồi thì được.
- [ ] Unit test (seam 3): hai kết nối cùng vào bản đồ vườn của A nhận vị trí của nhau; kết nối ở làng thì không. Chủ A nhận sự kiện "khách ghé" khi B vào.
- [ ] Unit test (seam 3): đọc vườn người khác không đổi dữ liệu của chủ (ngoài việc chạy bù đã có từ issue 24); khách không ghi được vào vườn qua lối đọc này.
- [ ] E2E (Playwright, 2 trình duyệt, desktop + 360px): A và B ở làng → B đi tới cổng vườn A rồi vào → B thấy đúng vườn A (cây, con vật dựng sẵn bằng bản lưu ghi sẵn), A đang ở vườn thì thấy B đi lại, A nhận thông báo B ghé → B đi ra cổng về lại làng.
- [ ] E2E: B vào vườn A thử chạm cửa nhà, kho, thùng giao hàng đều bị chặn và có lý do; không vào được chế độ xây dựng.
- [ ] E2E: B vuốt ve chó của A: chưa cho ăn thì chó không cho, sau khi cho ăn thì vuốt được.
- [ ] Mọi nút trong vườn khách (cổng ra, lý do bị chặn) dùng được trên 360px và không đè bản đồ nhỏ.

## Blocked by

- [24](24-server-chay-bu-vuon-offline.md)
- [25](25-lang-real-time.md)
