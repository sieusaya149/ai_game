# 73. Hao mòn và sửa chữa

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §3.3d · ADR 0014, 0018 · User story 39–44

**Model gợi ý:** Sonnet

## What to build

- **Độ bền trên thực thể** có hao mòn: máy chế biến, máy bơm và trạm bơm, bù nhìn, hàng rào, nhà kính. Chuồng, nhà ở, đồ trang trí **không** hao. Độ bền 100%, mỗi lần dùng mất một ít, bão (hàm thời tiết ADR 0014) làm đồ ngoài trời mất thêm 10–30%. Số liệu: lấy từ bảng số liệu đợt (issue 64).
- Dưới 30%: cờ lê vàng và máy chạy chậm. Về 0%: ngừng chạy, **không mất đồ**.
- **Sửa:** tự sửa tốn gỗ, đinh, thể lực, hồi tới 80%. Thuê **Ông Sáu** tốn khoảng 10–15% giá mua, hồi 100%, mất nửa ngày game (món đó ngừng trong lúc sửa).
- **UI:** thanh độ bền và cờ lê vàng trên khung thông tin, nút Tự sửa / Nhờ Ông Sáu. Dùng hình tạm (khối màu, icon chữ) tới khi issue ART đợt này gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): mỗi lần dùng giảm độ bền; bão làm giảm thêm 10–30% với đồ ngoài trời, không đụng đồ trong nhà; chuồng, nhà, đồ trang trí không hao.
- [ ] Unit test: dưới 30% chạy chậm theo bảng; 0% ngừng mà không mất đồ; tự sửa tốn đúng gỗ, đinh, thể lực và hồi tới 80% (không vượt); Ông Sáu tốn đúng tỉ lệ giá mua, hồi 100%, mất nửa ngày game.
- [ ] Unit test (seam 3): server chạy bù đoạn dài làm hao mòn máy giống trình duyệt.
- [ ] E2E (desktop + 360px): bản lưu máy độ bền 25%, thấy cờ lê vàng, tự sửa rồi nhờ Ông Sáu.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [70](70-khung-may-che-bien-coi-xay-hu-muoi-dua.md)
