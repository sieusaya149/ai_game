# 46. Trộm NPC mới: Tí Sún, chồn hương, phạt trộm

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0004, 0008, 0013 · User story 108–112

## What to build

- **Hai trộm NPC mới** (thằng Tèo đã có từ trước):
  - **Tí Sún:** trộm **trứng**, khi có từ **3 trứng dưới đất** trở lên (trứng trong bụi từ lát 41 cũng tính).
  - **Chồn hương:** ra vào **nửa đêm**, bắt gà vịt **ngủ ngoài chuồng** (con lạc từ lát 42). Cần có con ngủ ngoài chuồng.
- **Tần suất trộm NPC (đã chốt):** trung bình **1 vụ mỗi 2 đêm**, và chỉ khi có đồ đáng trộm; vườn càng giàu thì càng thường, **tối đa 1 vụ mỗi đêm**. Đèn, hàng rào và chó làm giảm tần suất. Đêm đã có bạn bè online sang trộm thì trộm NPC không tới. Luật chọn trộm nào theo đồ trong vườn (Tèo cần ≥3 ô chín).
- **Chó phát hiện và đuổi** theo luật chó đã chốt (bán kính, ngủ gật, GÂU GÂU, đuổi ×1.3 tốc độ người đi bộ; chó học đủ 6 lệnh thì không ăn xúc xích, lát 45). Trộm NPC mới dùng lại hệ thống phát hiện này.
- **Bắt được trộm thì chọn:** **bắt đền 20–60 xu** hoặc **phạt làm thợ không công ngày hôm sau** (mỗi tuần làng tối đa 1 lần). Hiện hộp thoại chọn hai lựa chọn.
- **Trộm tiến bộ dần:** thằng Tèo bị bắt nhiều lần thì **mua đèn pin, giày êm, đi lặng lẽ hơn** (bán kính phát hiện nhỏ đi theo số lần bị bắt, lưu trong bản lưu).
- **Khi offline (ADR 0004):** chồn hương **không làm con vật chết**; trộm NPC khi chạy bù chỉ lấy trứng hoặc rau, không bắt gà vịt.
- **Bảo hộ người mới:** dưới cấp người chơi 5 chưa có trộm NPC mới (Tí Sún, chồn hương).
- **Pixel art do agent Opus vẽ:** Tí Sún (đi, rón rén, bị bắt), chồn hương (đi đêm, bắt, bị đuổi), Tèo có đèn pin và giày êm (biến thể), bong bóng báo trộm, hộp thoại chọn phạt.

## Acceptance criteria

- [x] Unit test (seam 1): Tí Sún chỉ tới khi có ≥3 trứng dưới đất; chồn hương chỉ tới khi có con ngủ ngoài chuồng; trung bình 1 vụ mỗi 2 đêm (thống kê hạt giống cố định) và không bao giờ quá 1 vụ mỗi đêm; không tới khi đã có bạn online trộm; đèn, hàng rào, chó giảm tần suất. — `tests/thief.test.mjs`. Phần "bạn online sang trộm" mới chỉ để sẵn chỗ móc `state.guestRaid = { day, n }` (`guestRaids(s)`): nhánh Phase 2 chưa có phần online của Phase 1, test dựng tay giá trị đó.
- [x] Unit test: bắt được trộm thì chọn được bắt đền 20–60 xu hoặc phạt thợ không công; phạt thợ chỉ 1 lần mỗi tuần làng; Tèo bị bắt nhiều lần thì đi lặng lẽ hơn (bán kính phát hiện nhỏ đi).
- [x] **Unit test riêng cho ADR 0004:** chạy bù offline có trộm NPC → không con nào chết hoặc bị bắt đi; dưới cấp 5 không có Tí Sún và chồn hương.
- [x] E2E (Playwright, desktop + 360px): dựng bản lưu có 3 trứng dưới đất ở ban đêm → Tí Sún tới lấy trứng, chó sủa → đuổi kịp thì chọn bắt đền; dựng bản lưu có gà ngủ ngoài chuồng → chồn hương tới → đuổi được. — `e2e/thief.spec.mjs`. Chỗ "chó sủa" để cho unit test lo: e2e dựng chó con (chưa canh nhà) để vụ trộm không bị `DOG.guardChance` ngẫu nhiên cắt ngang.
- [x] Pixel art Tí Sún và chồn hương có đủ. — Tí Sún: đi (`npcTiSun`), rón rén (`npcTiSunSneak`), bị bắt (`npcTiSunCaught`); chồn hương: đi đêm (`civet`), chồm bắt (`civetCatch`), bị đuổi (`civetFlee`); thêm `thiefTorch`, `thiefShoes`, `thiefBubble`, `punishIcon`.

## Blocked by

- [42](42-ve-chuong-va-lua.md)
- [45](45-cho-vong-doi-va-day-lenh.md)
