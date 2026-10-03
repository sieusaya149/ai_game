# 79. Hồ cá

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §5.1, §2.5a · ADR 0005, 0018 · User story 48–55

**Model gợi ý:** Sonnet

## What to build

- **Hồ cá là công trình theo khối** như khối ruộng: đào nhỏ nhất 3×3 ô (từ cấp 8), nối thêm được, đặt bằng `canPlace` (ADR 0005). Mỗi ô nước tối đa 2 con. Có **độ sạch nước 0–100 chung cả hồ**: dưới 40 cá chậm lớn, dưới 20 dễ bệnh. Độ sạch giảm theo số cá, cám thừa, phân vịt. Số liệu: lấy từ bảng số liệu đợt (issue 78).
- **6 loài:** rô, trê, chép, tôm càng, lươn và Koi (chỉ để ngắm, cả trại vui hơn). Cá lớn qua **3 cấp bột → giống → trưởng thành**, mỗi loài × cấp có hình riêng. Cho ăn bằng **cám cá** (mua ở Bà Tư, hoặc làm sau). Cá là hàng tươi, hư theo bảng kho (issue 65).
- **Làm sạch:** vớt rong (bỏ vào hố ủ) hoặc thả ốc. **Phân vịt** làm cá lớn nhanh nhưng nước bẩn nhanh. **Thu hoạch** bằng kéo lưới, bắt cá trưởng thành. Mọi thứ đi qua `step`, chạy bù được.
- **UI:** màn đào hồ, bảng hồ (độ sạch, cá, cho ăn, vớt rong, thả ốc, kéo lưới). Hình tạm tới khi issue ART 91 gộp; khi phát hành mỗi loài cá có hình riêng từng cấp, không dùng chung.

## Acceptance criteria

- [ ] Unit test (seam 1): đào hồ nhỏ nhất 3×3, nối rộng; mỗi ô tối đa 2 con; `canPlace` hồ có lý do từ chối đúng.
- [ ] Unit test: độ sạch giảm theo cá, cám, phân vịt; ngưỡng 40/20 làm cá chậm lớn / dễ bệnh; vớt rong và ốc làm sạch; rong bỏ hố ủ được.
- [ ] Unit test: cá lớn 3 cấp theo bảng; kéo lưới chỉ lấy cá trưởng thành; Koi làm cả trại vui hơn; cá hư theo kho.
- [ ] Unit test (seam 3): server chạy bù vườn có hồ cá cho cùng độ sạch và cá lớn như trình duyệt.
- [ ] E2E (desktop + 360px): bản lưu cấp 8, đào hồ, thả cá, cho ăn, tua thời gian, vớt rong, kéo lưới.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [78](78-bang-so-lieu-dot-4b.md)
