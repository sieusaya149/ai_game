# 87. Bồ câu, công và ngựa

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §2.1a, §7.1 · ADR 0013 · User story 91–97

**Model gợi ý:** Sonnet

## What to build

- Loài mới dùng lại hệ vật nuôi Phase 2: thêm dòng vào bảng loài (vòng đời 4 giai đoạn, đực/cái, sinh sản, sản phẩm, chuồng), không tách hệ mới. Hình tạm tới khi issue ART 92 gộp; khi phát hành mỗi loài có hình riêng cho từng giai đoạn, không dùng chung.
- **Bồ câu** (cấp 7, chuồng chim trên mái mới): đưa **thư và quà cho bạn online** (đi qua đường quà/lưu bút Phase 1, issue 29), cho ăn đủ thì thư tới nhanh hơn.
- **Công** (cấp 18, thả rông, rất đắt): mỗi sáng **xòe đuôi**, cả trại vui hơn (như Koi); khách thăm vườn thấy công xòe đuôi. Điểm đẹp của vườn thuộc Phase 5.
- **Ngựa** (cấp 15, chuồng ngựa mới): **cưỡi đi nhanh ×2**, phải chải lông và cho ăn cà rốt. Số liệu: lấy từ bảng số liệu đợt (issue 78).

## Acceptance criteria

- [ ] Unit test (seam 1): ba loài đủ 4 giai đoạn, đực/cái; bồ câu đủ ăn thì thư tới nhanh hơn theo bảng; công xòe đuôi mỗi sáng làm vui cả trại; cưỡi ngựa tốc độ ×2, hết cà rốt hoặc chưa chải thì giảm.
- [ ] Unit test (seam 3, `bootServer`): thư/quà bồ câu gửi bạn online tới đúng người và đúng lúc; khách thăm vườn nhận được trạng thái công xòe.
- [ ] E2E (desktop + 360px): nuôi bồ câu gửi quà cho tài khoản thứ hai (hai trình duyệt), cưỡi ngựa ngoài vườn, thấy công xòe đuôi buổi sáng.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [78](78-bang-so-lieu-dot-4b.md)
