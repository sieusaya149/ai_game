# 89. Máng trứng lăn và máy gặt

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §3.3c, §3.3d · ADR 0005 · User story 100–104

**Model gợi ý:** Sonnet

## What to build

- Hai **máy gắn cố định** (không thay thợ, gắn như tưới nhỏ giọt của Phase 3). **Máng trứng lăn** gắn vào chuồng gia cầm: trứng đẻ trong chuồng tự vào kho, **trứng đẻ ngoài vườn khi thả rông vẫn phải nhặt tay**. **Máy gặt** gắn vào khối ruộng 3×3: tự hái khi chín, cất vào kho, **không gieo lại**, chất lượng **tối đa ★2** (luật chất lượng Phase 3). Số liệu: lấy từ bảng số liệu đợt (issue 78).
- Cả hai **tốn điện và có hao mòn** (ghi điện vào đồng hồ issue 69, độ bền theo issue 73); hết điện, hỏng hoặc dưới 30% thì chậm/ngừng. Kho đầy thì máy ngừng bỏ vào kho, hàng giữ tại chỗ (không mất).
- Hình tạm tới khi issue ART 92 gộp.

## Acceptance criteria

- [ ] Unit test (seam 1): gắn máng vào chuồng gia cầm thì trứng trong chuồng vào kho, trứng ngoài vườn không; gắn máy gặt vào khối ruộng thì tự hái cây chín, không gieo lại, sản phẩm không vượt ★2.
- [ ] Unit test: tốn điện, cắt điện thì ngừng; hao mòn dưới 30% chậm, 0% ngừng; kho đầy thì hàng không mất.
- [ ] Unit test (seam 3): server chạy bù vườn có máy gặt và máng trứng cho cùng sản lượng như trình duyệt.
- [ ] E2E (desktop + 360px): gắn máng trứng và máy gặt, tua thời gian, thấy trứng và rau vào kho; trứng thả rông ngoài vườn vẫn phải nhặt.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [78](78-bang-so-lieu-dot-4b.md)
