# 90. Đơn việc cho heo, chó, mèo

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §6b, §6.0 · ADR 0012 · User story 105–108

**Model gợi ý:** Sonnet

## What to build

- **Đơn việc** nằm chung bảng đơn hàng (vẫn **tối đa 3 đơn**, người đặt là cư dân), loại đơn không xin sản phẩm. Ba mẫu ban đầu: **Chú Ba cần 1 heo ≥ 90 kg** (giao con vật, giá cao hơn bán thường); **Cô Út nhờ chó biết lệnh "Bắt tay"** ra biểu diễn (kiểm lệnh đã dạy ở Phase 2); **nhà Bà Tư có chuột nên mượn mèo một buổi** (mèo đi vắng, về mang theo quà, dùng luật mèo issue 82). Thưởng xu và EXP: lấy từ bảng số liệu đợt (issue 78). ❤️ cư dân nối thêm ở 4C (issue 96).
- Thao tác giao đơn là thao tác của khách đi qua `state.js` (ADR 0012). Con vật được giao thì rời trại đúng như bán cho Chú Ba (luật Phase 2). Mèo đi vắng thì không bắt chuột ở vườn mình trong buổi đó.

## Acceptance criteria

- [ ] Unit test (seam 1): bảng đơn có đơn việc chung với đơn thường, tối đa 3; đơn heo chỉ giao được con ≥ 90 kg và giá cao hơn bán thường; đơn chó chỉ xong khi chó biết lệnh; đơn mượn mèo làm mèo vắng một buổi rồi về mang quà.
- [ ] Unit test: thưởng xu và EXP đúng; đơn hết hạn/hủy được như đơn thường.
- [ ] E2E (desktop + 360px): bản lưu có heo 95 kg, chó biết Bắt tay, mèo; nhận và giao ba loại đơn việc.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [78](78-bang-so-lieu-dot-4b.md)
