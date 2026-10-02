# 34. Bản lưu v3 và vòng đời 4 giai đoạn theo giờ vườn

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0002, 0003, 0008 · User story 1–12, 119

## What to build

Đây là phần dọn đường cho cả Phase 2. Con vật đổi hình dạng, nên thêm bước chuyển v2→v3, và ngay lát này con vật đã có vòng đời nhìn thấy được.

- **Bản lưu v3:**
  - Thêm một hàm chuyển v2→v3 vào chuỗi chuyển bản lưu, là hàm thuần, không ngẫu nhiên.
  - **Không ghi đè key v2.** Chuyển lỗi thì không ghi gì cả. Bản online trên server chuyển cùng lúc khi chủ đăng nhập.
  - Con vật có thêm: giới tính, tuổi (theo giờ vườn), giai đoạn, độ dơ, độ thân, trạng thái bệnh, cân nặng, tên cha mẹ, vị trí thả rông theo ô. Lát này chỉ cần các trường tuổi và giai đoạn chạy thật, các trường còn lại có giá trị mặc định để các lát sau dùng.
- **Chuyển từ v2:**
  - Con trưởng thành cũ thành "Trưởng thành" ở đầu giai đoạn, con non cũ thành "Non".
  - Giới tính gán theo id (chẵn cái, lẻ đực) để luôn có ít nhất một cặp.
  - Độ thân 2, sạch, không bệnh. Không con nào bị mất.
- **Vòng đời 4 giai đoạn:** Non → Nhỡ → Trưởng thành → Già cho gà, heo, bò, cừu, chó. Tuổi tính bằng **bộ đếm giờ vườn đã có từ Phase 0**, nên lúc vườn đóng băng thì con vật không già đi.
  - **Bảng tuổi thọ theo loài** nằm trong bảng số liệu (Non→Nhỡ / Nhỡ→Trưởng thành / Trưởng thành / Già): gà 5 phút / 10 phút / ~20 giờ / ~4 giờ, heo 10 phút / 20 phút / ~30 giờ / ~6 giờ, bò và cừu 15 phút / 30 phút / ~45 giờ / ~8 giờ, chó 30 phút / 1 giờ / mãi mãi. Tổng xấp xỉ 1,5 / 2,5 / 3,5 ngày ngoài đời.
  - **Hành vi theo giai đoạn:** gà con chạy theo gà mẹ và kêu chiếp; gà nhỡ bới đất (ăn sâu ở ruộng thuộc lát 41); heo nhỡ ăn khỏe và tăng cân nhanh; bò tơ kéo cày được cả hàng ruộng; cừu nhỡ lông ngắn chưa xén được; con già đẻ thưa, cho ít sữa, lông mỏng và hay ngủ.
  - **Chó không chết vì già.** Chó đã là loài sống mãi ở giai đoạn trưởng thành; giai đoạn già của chó chỉ làm nó chậm và ngủ nhiều (phần phát hiện trộm chậm ở lát 45).
- **Báo trước khi bước vào giai đoạn già:** thông báo 🟡 có khóa gộp, để người chơi chuẩn bị hoặc bán đi.
- **Hết giai đoạn già:** con vật có thể ra đi, hóa thiên thần bay lên rồi biến mất (chưa có ngôi mộ, lát 38). Chó không áp dụng.
- **Hiển thị:** mỗi loài có 4 hình theo giai đoạn × hướng × khung đi, con già có dáng khác (còng, màu nhạt), sprite ngủ. Hiện giai đoạn khi chạm vào con vật.
- **Pixel art do agent Opus vẽ:** gà, heo, bò, cừu, chó, mỗi loài 4 giai đoạn (Non, Nhỡ, Trưởng thành, Già) × hướng × khung đi, cộng trạng thái ngủ của từng giai đoạn; thiên thần bay lên (dùng chung cho mọi loài).

## Acceptance criteria

- [x] Unit test (seam 1) cho chuyển v2→v3: nạp bản v2 mẫu có đủ loài và cả con non lẫn trưởng thành → ra v3 đủ số con, giai đoạn đúng, giới tính theo id chẵn lẻ, độ thân 2, sạch. Chạy hai lần cho cùng kết quả (prior art `tests/save-v2.test.mjs`). Key v2 còn nguyên. Bản v2 hỏng thì báo lỗi và không ghi đè.
- [x] Unit test: tuổi chỉ tăng khi giờ vườn chạy và đứng yên khi vườn đóng băng; con vật qua đúng từng mốc giờ của bảng tuổi thọ cho mỗi loài; chó không bao giờ chuyển sang "chết vì già".
- [x] Unit test: mỗi giai đoạn có đúng hành vi (con non không đẻ/không cho sữa, bò tơ kéo cày được, cừu nhỡ không xén được, con già cho sản phẩm thưa hơn).
- [x] Unit test: có thông báo 🟡 báo trước khi một con bước vào giai đoạn già; con hết giai đoạn già thì có thể ra đi.
- [x] E2E (Playwright, desktop + 360px): nạp bản lưu v2 cũ ghi sẵn → vườn hiện đủ con vật như cũ → tua giờ vườn tới mốc đổi giai đoạn thì thấy hình con vật đổi → thấy thông báo con vào giai đoạn già.
- [x] Pixel art của 5 loài × 4 giai đoạn có đủ, nhìn rõ khác nhau ở cỡ hiển thị trên 360px. (art3.js của agent vẽ; đã chụp kiểm tra bằng mắt ở 1280 và 360px)

## Blocked by

- [33](33-phat-hanh-phase-1.md)
