# 38. Bệnh 4 giai đoạn, lây bệnh, trạm thú y Cô Út, ngôi mộ

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0003, 0004, 0008 · User story 36–50

## What to build

- **Bệnh 4 giai đoạn** (tính bằng giờ vườn chạy):
  - **1. Mệt:** bong bóng vàng, đi chậm. Không đẻ, không cho sản phẩm, không lớn. Chữa bằng **1 liều thuốc thú y**.
  - **2. Bệnh nặng** (sau khoảng 1 giờ): bong bóng đỏ nhấp nháy, nằm một chỗ, có thông báo 🔴. Chữa bằng **2 liều thuốc** hoặc bác sĩ thú y. Bắt đầu lây.
  - **3. Nguy kịch** (sau thêm khoảng 30 phút): đếm ngược trên đầu. Chỉ chữa bằng **bác sĩ thú y**.
  - **4. Mất** (hết đếm ngược khoảng 15 phút): hóa thiên thần bay lên, để lại ngôi mộ.
- **Nguyên nhân bệnh:** đói lả lâu, dơ lâu (lát 37), chuồng bẩn, tuổi già, bị lây. Con già mắc bệnh thì **tiến triển nhanh gấp đôi**.
- **Ranh giới ADR 0004 (cứng):** đồng hồ gây chết **chỉ chạy khi chủ đang chơi**. Luật bệnh nhận cờ "đang chạy bù" từ cơ chế chạy bù (cả trình duyệt lẫn server). Khi chạy bù, bệnh **dừng ở Bệnh nặng**, không chuyển Nguy kịch, không chết vì bệnh, đói hay bất cứ nguyên nhân nào khác. Chết vì già vẫn có thể xảy ra (con đã được báo trước ở lát 34).
- **Lây bệnh:** con Bệnh nặng thì **mỗi 10 phút có 10% lây** cho một con cùng chuồng. **Chuồng cách ly không lây và hồi bệnh nhanh ×1.5** (con vật trong cách ly không thả rông). Chuyển con vào/ra chuồng cách ly bằng một hành động.
- **Thuốc, vắc-xin và gọi bác sĩ:**
  - **Trạm thú y của Cô Út** trong làng: bán thuốc thú y và vắc-xin (thêm cư dân vào bản đồ làng).
  - **Vắc-xin** tiêm một lần chống bệnh khoảng 10 giờ vườn, tiêm theo con hoặc cả chuồng.
  - **Gọi bác sĩ thú y qua điện thoại ở nhà** (đắt): cứu con Bệnh nặng và Nguy kịch.
- **Bảo hộ người mới:** dưới cấp người chơi 5, bệnh không vượt quá Mệt.
- **Thông báo:** Bệnh nặng và Nguy kịch là 🔴 gấp (có mũi tên chỉ hướng, rung trên điện thoại); xin quyền **Notification API** một lần rồi gửi thông báo trình duyệt khi có con vào Bệnh nặng.
- **Ngôi mộ:** con mất để lại **ngôi mộ nhỏ ở góc vườn** (thực thể đặt được và dời được qua hàm kiểm tra vị trí). Đặt hoa lên mộ thì **cả trại hết buồn nhanh hơn**. Con có độ thân cao thì mộ có tên.
- **Online:** khách thấy con bệnh. Server chạy bù vườn dùng cùng luật nên không có code riêng.
- **Pixel art do agent Opus vẽ:** bong bóng bệnh vàng và đỏ, đếm ngược, trạng thái bệnh (nằm, uể oải) cho gà, heo, bò, cừu, chó; Cô Út và trạm thú y; ngôi mộ nhỏ và hoa đặt mộ; thiên thần bay lên (mở rộng từ lát 34); vật phẩm thuốc, vắc-xin, điện thoại ở nhà (nếu chưa có).

## Acceptance criteria

- [x] Unit test (seam 1): bệnh đi đủ Mệt → Bệnh nặng → Nguy kịch → Mất đúng mốc giờ; mỗi giai đoạn chữa đúng thuốc (1 liều cho Mệt, 2 liều hoặc bác sĩ cho Bệnh nặng, chỉ bác sĩ cho Nguy kịch); sai cách chữa bị từ chối.
- [x] Unit test: lây 10% mỗi 10 phút trong chuồng thường (thống kê hạt giống cố định), không lây trong chuồng cách ly, hồi nhanh ×1.5 trong cách ly; vắc-xin chống bệnh khoảng 10 giờ; con già tiến triển nhanh gấp đôi; dưới cấp 5 bệnh không vượt quá Mệt.
- [x] **Unit test riêng cho ADR 0004:** chạy bù nhiều giờ vườn với con đang Bệnh nặng, đói lâu, dơ lâu → không con nào chuyển Nguy kịch hay chết, bệnh dừng ở Bệnh nặng. Cùng cảnh đó khi chơi trực tiếp thì chuyển tiếp bình thường.
- [x] Unit test: con mất để lại ngôi mộ ở chỗ hợp lệ; đặt hoa làm cả trại hết buồn nhanh hơn; mọi sự kiện bệnh có mức và khóa gộp.
- [x] Giao thức server (seam 3): server chạy bù vườn 8 tiếng có con Bệnh nặng và Nguy kịch hạ về Bệnh nặng thì không con nào chết. — làm lúc gộp `phase2` vào `main`: `tests/server-catchup.test.mjs`.
- [x] E2E (Playwright, desktop + 360px): dựng bản lưu có con Mệt → mua thuốc ở trạm thú y của Cô Út → chữa khỏi; dựng bản lưu có hai con cùng chuồng, một con Bệnh nặng → chuyển vào chuồng cách ly; dựng con Nguy kịch → gọi bác sĩ ở điện thoại nhà → khỏi; dựng bản lưu có con vừa mất → thấy thiên thần và ngôi mộ → đặt hoa.
- [x] Pixel art bong bóng, trạng thái bệnh, Cô Út, ngôi mộ có đủ.

## Blocked by

- [35](35-chuong-3-cap-va-cach-ly.md)
- [37](37-do-va-tam.md)
