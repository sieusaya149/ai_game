# 104. Mùa dịch và tiêm phòng

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.6 (Mùa dịch), §2.3 · ADR 0019 (phần 1), 0004 · User story 151–153

**Model gợi ý:** Sonnet

## What to build

- **Khoảng 1 đợt mỗi tuần thật**, kéo dài 1 ngày thật, **báo trước khoảng 1 giờ**, tính bằng lịch hàm thuần của issue 68. Mỗi đợt một loại: **cúm gia cầm, dịch tả heo hoặc lở mồm long móng**. Con thuộc nhóm đó **dễ bệnh ×3** (luật bệnh Phase 2); **con đã tiêm phòng không sao** và sản phẩm có nhãn "✅ An toàn" bán được giá cao hơn trong mùa dịch (nối uy tín 🏪 của issue 102 khi gộp).
- Trong mùa dịch **Chú Ba ngừng mua** và **thùng giao hàng trả giá thấp** cho nhóm bị dịch. Offline không bao giờ gây chết con vật (ADR 0004): hạn chế mức bệnh khi chạy bù theo luật Phase 2. Số liệu (giá tiêm, mức giá): lấy từ bảng số liệu đợt (issue 95).
- **UI:** banner báo trước, nhãn "✅ An toàn", nút tiêm ở Cô Út/trạm thú y. Hình tạm tới khi issue ART 109/110 gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): lịch mùa dịch cho cùng kết quả với cùng hạt giống; báo trước ~1 giờ; con thuộc nhóm bị dịch bệnh ×3, con đã tiêm không bệnh; nhãn An toàn trên sản phẩm của con tiêm.
- [ ] Unit test: Chú Ba ngừng mua nhóm bị dịch, thùng giao hàng trả giá thấp theo bảng; không con vật nào chết vì chạy bù.
- [ ] Unit test (seam 3): server chạy bù đi qua mùa dịch cho cùng kết quả như trình duyệt.
- [ ] E2E (desktop + 360px): dựng bản lưu sát mùa dịch, thấy báo trước, tiêm phòng, vào mùa dịch thấy con tiêm không bệnh.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [95](95-bang-so-lieu-dot-4c.md)
