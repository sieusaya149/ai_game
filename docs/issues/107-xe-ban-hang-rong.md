# 107. Xe bán hàng rong

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.6 (Xe bán hàng rong) · ADR 0020 · User story 144

**Model gợi ý:** Sonnet

## What to build

- **Xe bán hàng rong** đặt ở tiệm rèn, **từ cấp 5**, 3 ô hàng nâng lên 5. **Đẩy đi bán khắp làng** ngoài giờ chợ phiên; **dân làng NPC ghé mua ở chỗ đông**. Bán theo ADR 0020 như sạp (giá 50–200%, uy tín 🏪 dùng chung với issue 102, hàng rời kho khi bày, hàng chưa bán về kho khi cất xe). Số liệu: lấy từ bảng số liệu đợt (issue 95).
- **UI:** nút đẩy xe, bảng ô hàng, bóng dân làng ghé mua. Hình tạm tới khi issue ART 109/110 gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): xe 3 → 5 ô theo nâng cấp; chỉ bán ngoài giờ chợ phiên; NPC chỉ mua giá ≤ giá gốc, chỗ đông bán nhiều hơn; cất xe thì hàng chưa bán về kho; điểm 🏪 cập nhật theo lần bán.
- [ ] Unit test (seam 3): người chơi khác mua của xe theo ADR 0020 (mã duy nhất, không mất xu khi hết hàng).
- [ ] E2E (desktop + 360px): xếp hàng lên xe, đẩy ra chỗ đông, thấy NPC mua, cất xe.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [102](102-cho-phien-va-uy-tin-shop.md)
