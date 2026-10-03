# 102. Chợ phiên và uy tín shop

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.6 (Chợ phiên, uy tín shop) · ADR 0020, 0009, 0018 · User story 135–143

**Model gợi ý:** Sonnet

## What to build

- **Chợ phiên 12h–13h và 20h–21h giờ thật** ở quảng trường (lịch issue 68). **Sạp từ cấp 5**, 4 ô miễn phí, nâng 6 rồi 8. Người bán **đặt giá 50%–200% giá gốc**, sạp mở suốt phiên dù chủ đi đâu, hết phiên hàng chưa bán **về kho**. **Khách NPC** chỉ mua món giá ≤ giá gốc. **Chơi đơn có sạp và khách NPC.** Số liệu: lấy từ bảng số liệu đợt (issue 95).
- **Mua bán giữa người chơi theo ADR 0020:** hàng rời kho khi bày; mua là **thao tác khách có mã duy nhất**; hàng vào hộp quà ở cổng vườn người mua (luôn vào dù kho đầy, ADR 0018); người mua không tự mua của mình; hai người mua món cuối thì một người nhận "đã bán hết" và không mất xu; mua ở sạp người đang offline được áp đúng một lần.
- **Uy tín shop 🏪1–5:** tính theo chất lượng khoảng **20 lần bán gần nhất** (tăng khi bán ★, hàng An toàn, con giống khỏe; giảm khi bán hàng hư hay con bệnh). 🏪 cao thì đông khách NPC hơn, 🏪4–5 được thưởng ⭐ mỗi tuần. Dùng chung cho livestream và xe hàng rong; **tách riêng với ⭐**.
- **UI:** bày hàng, đặt giá, danh sách sạp ở quảng trường, màn mua, hộp quà, sao 🏪. Hình tạm tới khi issue ART 109/110 gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): sạp 4/6/8 ô theo cấp, giá trong 50–200%, giá ngoài khoảng bị từ chối; khách NPC chỉ mua giá ≤ giá gốc; hết phiên hàng về kho; uy tín 🏪 theo 20 lần bán gần nhất; thưởng ⭐ mỗi tuần cho 🏪4–5.
- [ ] Unit test (seam 3, `bootServer`): mua ở sạp theo ADR 0020: mã duy nhất, không áp hai lần; không tự mua; hai người mua món cuối thì một người được, người kia nhận "đã bán hết" và không mất xu; mua ở sạp chủ offline áp đúng một lần; hàng vào hộp quà người mua.
- [ ] Unit test: chơi đơn có sạp NPC và khách NPC (không cần server).
- [ ] E2E (desktop + 360px, **hai trình duyệt**): người một bày sạp, người hai mua, hàng vào hộp quà, xu hai bên đúng.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [99](99-trang-thai-chung-cua-lang-tren-server.md)
