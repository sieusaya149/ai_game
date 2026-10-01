# 55. Thời tiết là hàm thuần: radio, bảng tin, bão, hạn hán, sương muối, cầu vồng, phủ rơm

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · ADR 0003, 0014, 0008 · User story 35–45

## What to build

Thời tiết của một ngày tính bằng một **hàm thuần** từ số ngày game và hạt giống (của làng khi online, của vườn khi offline). Không bốc thăm lúc chạy, nên mọi trình duyệt và server cùng thấy một trời, và chạy bù ra đúng thời tiết đã xảy ra.

- **Hàm thời tiết:** đọc bảng tần suất theo mùa trong `data`. Mưa, mây, nắng của Phase 0 chuyển vào cùng hàm này. Loại thời tiết:
  - ⛈️ **Bão:** ~5% số ngày Hạ và Thu. Làm đổ bù nhìn (dựng lại bằng xu), con vật ngoài trời mất vui (vào chuồng trước bão thì không mất), có thể mất điện nửa ngày (máy bơm, máy phun ngừng, dùng ở issue 57–58).
  - ☀️🔥 **Hạn hán:** 1 đợt mỗi mùa Hạ, 2–3 ngày. Đất khô nhanh gấp 2; giếng hồi nước chậm (một nửa tốc độ bơm, dùng ở issue 57).
  - ❄️ **Sương muối:** ~15% buổi sáng mùa Đông. Cây hạt và mầm ngừng lớn 1 ngày.
  - 🌈 **Cầu vồng:** thỉnh thoảng sau mưa, con vật vui hơn.
- **Không bao giờ giết:** thời tiết xấu không bao giờ giết cây hay con vật.
- **Báo trước 1 ngày:** hàm gọi cho ngày mai. **Radio** trong nhà và **bảng tin làng** chỉ việc gọi hàm đó và hiện kết quả. Báo bão, hạn hán, sương muối thành thông báo 🟡.
- **Phủ rơm:** đặt rơm lên ô để giữ ẩm (đất khô chậm lại trong hạn hán) và chống sương muối. Rơm là đồ tiêu hao, tốn xu hoặc kho vật liệu.
- **Bảo hộ người mới:** dưới cấp 5 chưa có thời tiết xấu.
- **HUD:** icon thời tiết riêng cho hôm nay.
- **Online:** cả làng cùng một thời tiết. Hạt giống làng do server giữ.
- **Pixel art do agent Opus vẽ.** Sprite cần vẽ: hiệu ứng mưa bão, nắng gắt, sương, cầu vồng; bù nhìn đổ; rơm phủ trên ô; radio trong nhà; icon HUD cho từng loại thời tiết; tờ báo thời tiết trên bảng tin làng.

## Acceptance criteria

- [ ] Unit test (seam 1): cùng số ngày và hạt giống cho cùng thời tiết; hạt giống khác cho chuỗi khác. Quét nhiều năm game: tần suất bão, sương muối, hạn hán khớp bảng, hạn hán đúng 1 đợt dài 2–3 ngày mỗi Hạ, không có bão mùa Xuân, Đông.
- [ ] Unit test: hàm báo trước cho ngày mai đúng bằng thời tiết ngày mai thật.
- [ ] Unit test: hạn hán làm đất khô gấp 2, rơm làm chậm lại; sương muối dừng cây hạt và mầm đúng 1 ngày, cây lớn hơn không bị dừng, ô phủ rơm thì không bị dừng.
- [ ] Unit test: bão làm đổ bù nhìn, con vật ngoài trời mất vui, con vật trong chuồng thì không. **Duyệt qua mọi loại thời tiết và nhiều ngày: không cây và không con vật nào chết vì thời tiết.**
- [ ] Unit test: dưới cấp 5 không có thời tiết xấu.
- [ ] Unit test (seam 3, giao thức server): server chạy bù và trình duyệt chạy bù cùng bản lưu ra cùng thời tiết và cùng kết quả vườn qua một đợt hạn hán.
- [ ] E2E (desktop + 360px): dựng bản lưu ngày mai có bão → mở radio trong nhà và bảng tin làng thấy báo bão → tua tới ngày bão thấy hiệu ứng và HUD đổi icon. Bù nhìn đổ dựng lại được bằng xu.
- [ ] E2E: phủ rơm lên ô trong hạn hán, ô khô chậm hơn ô không phủ.

## Blocked by

- [54](54-mua-co-tac-dung.md)
