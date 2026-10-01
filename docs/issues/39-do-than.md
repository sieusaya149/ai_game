# 39. Độ thân ❤️1–5

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0003, 0008 · User story 51–54

## What to build

- **Độ thân ❤️1–5 cho từng con vật** (thang điểm ẩn bên dưới, hiện số tim). Bản lưu v3 đã có trường này, mặc định ❤️2 cho con chuyển từ v2 (lát 34).
- **Tăng khi:** cho ăn tận tay, vuốt ve, tắm (lát 37), chữa bệnh (lát 38). **Giảm khi** để đói hay dơ lâu. Có giới hạn tăng mỗi ngày game với cùng một cách để không cày được.
- **Lợi ích theo mức:**
  - **❤️3:** sản phẩm có tỉ lệ ★ cao hơn.
  - **❤️4:** chạy lại khi người chơi tới gần, ít bệnh hơn (giảm nguy cơ ở lát 38).
  - **❤️5:** đi theo người chơi, **tuổi thọ +10%**.
- **Điểm riêng từng loài:** bò được vuốt ve đều thì sữa ngon hơn; cừu vui thì ra lông xoăn giá cao.
- **Hiển thị:** số tim khi chạm vào con vật, tim bay lên khi vuốt ve hoặc cho ăn tận tay. Con ❤️4–5 chạy lại gần người chơi và ❤️5 đi theo sau người chơi (phần đi theo thuộc `world.js`, lát này chỉ cần luật trả ra mức thân để diễn hoạt).
- **Mua con vật mới:** bắt đầu ở ❤️1 hoặc mức mặc định trong bảng số liệu.
- **Pixel art do agent Opus vẽ:** tim bay lên (nhiều mức), biểu tượng tim 1–5 cho bảng thông tin con vật, bong bóng tim khi con vật chạy lại.

## Acceptance criteria

- [ ] Unit test (seam 1): độ thân tăng đúng với từng hành động (cho ăn tận tay, vuốt ve, tắm, chữa bệnh), giảm khi đói và khi dơ lâu, kẹp trong 1–5; giới hạn tăng mỗi ngày.
- [ ] Unit test: ❤️3 tăng tỉ lệ ★ của sản phẩm (thống kê hạt giống cố định); ❤️4 giảm nguy cơ bệnh; ❤️5 kéo dài tuổi thọ +10% (mốc già đến muộn hơn 10%); sữa bò và lông xoăn cừu theo đúng luật riêng.
- [ ] E2E (Playwright, desktop + 360px): dựng bản lưu có bò ❤️1 → vuốt ve và cho ăn tận tay nhiều lần → thấy tim bay và số tim tăng; dựng bản lưu có gà ❤️4 → đi lại gần thì gà chạy lại; dựng bản lưu có heo ❤️5 → heo đi theo người chơi.
- [ ] Pixel art tim và biểu tượng có đủ.

## Blocked by

- [34](34-ban-luu-v3-vong-doi.md)
