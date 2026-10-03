# 72. Máy trộn cám

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §3.3c · ADR 0005 · User story 35, 36

**Model gợi ý:** Sonnet

## What to build

- Thêm **máy trộn cám** vào khung của issue 70. Công thức: lúa/bắp → cám gà vịt; bắp + khoai lang → cám heo; rơm + bắp → cỏ khô bò cừu; bắp + trứng → thức ăn chó mèo. Cám làm ra cùng loại vật tư với cám mua ở Bà Tư (vật nuôi và thợ dùng cám không phân biệt nguồn). Số liệu (cấp mở, thời gian, giá máy, giá cám tự làm rẻ hơn Bà Tư 30–50% tính theo giá bán của nông sản đầu vào): lấy từ bảng số liệu đợt (issue 64).
- Bà Tư vẫn bán cám như cũ. Cám không hư và nằm ở kho vật tư (không chiếm chỗ kho hàng bán được).
- Dùng hình tạm (khối màu, icon chữ) tới khi issue ART đợt này gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): 4 công thức đúng đầu vào/đầu ra; cám tự làm dùng được ở máng ăn như cám mua; chi phí cám tự làm (theo giá bán nguyên liệu) thấp hơn Bà Tư 30–50% theo bảng.
- [ ] Unit test: máy chạy khi chạy bù, dừng khi cắt điện, không mất nguyên liệu.
- [ ] E2E (desktop + 360px): bản lưu có bắp và khoai lang, trộn cám heo, tua thời gian, lấy cám, cho heo ăn.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [70](70-khung-may-che-bien-coi-xay-hu-muoi-dua.md)
