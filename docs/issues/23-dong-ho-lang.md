# 23. Đồng hồ làng: giờ server, x1, lịch chung

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0003, 0014 · DESIGN §0b · User story 23, 24

## What to build

Online cả làng cùng một buổi sáng.

- **`clock` trỏ sang giờ server:** khi vào làng, trình duyệt đo độ lệch giờ với server lúc kết nối (và đo lại định kỳ), rồi dùng giờ server cho mọi tính toán thời gian của vườn online. Giờ máy người chơi không còn ảnh hưởng.
- **Online luôn x1:** nút x5/x20 ẩn hoặc khóa khi chơi online. Chơi một mình vẫn có như Phase 0.
- **Lịch làng:** ngày, mùa tính từ giờ server và một mốc chung, nên mọi người cùng ngày game, cùng mùa. Ngày đêm theo cùng lịch đó nên hai người cùng thấy trời sáng hay tối.
- **Đóng băng 8 tiếng chỉ áp dụng cho cây và con vật** (ADR 0003): lịch làng vẫn chạy tiếp kể cả khi một vườn đã đóng băng.
- **Lịch ngoài đời** (cho các giới hạn theo ngày ở issue sau) có một hàm thuần lấy ngày ngoài đời từ giờ server, để test dựng được ranh giới nửa đêm.

## Acceptance criteria

- [x] Unit test (seam 1): lịch làng là hàm của giờ server và mốc chung: cùng một giờ cho cùng ngày, mùa và giờ trong ngày; qua đúng ranh giới mùa thì đổi mùa. Hai "người chơi" có độ lệch giờ máy khác nhau, sau khi áp độ lệch, ra cùng kết quả.
- [x] Unit test (seam 1): vườn đóng băng sau 8 tiếng nhưng lịch làng vẫn tiến đủ thời gian đã trôi; tuổi con vật vẫn tính theo giờ vườn thật sự chạy.
- [x] Unit test (seam 1): hàm "ngày ngoài đời" đổi đúng lúc qua nửa đêm theo múi giờ đã chốt.
- [x] Unit test (seam 3): server trả giờ hiện tại khi trình duyệt hỏi đồng bộ giờ; sai số đo lệch nằm trong ngưỡng test.
- [x] E2E (Playwright, desktop + 360px): hai trình duyệt cùng vào làng, một bên có đồng hồ máy bị lệch (dựng bằng cách chỉnh giờ trình duyệt của Playwright) → cả hai hiện cùng ngày game và cùng ban ngày hay ban đêm.
- [x] E2E: vào làng thì không còn nút x5/x20, chơi một mình thì vẫn còn và dùng được.

## Blocked by

- [22](22-vuon-online-va-mot-thiet-bi.md)
