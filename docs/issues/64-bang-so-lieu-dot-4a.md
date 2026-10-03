# 64. Bảng số liệu đợt 4A (chủ game duyệt)

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §3.3b, §3.3c, §3.3d, §8.1, §8.2 · ADR 0009, 0017, 0018 · Số liệu cho user story 1, 12, 14–15, 22–23, 30, 32, 36, 39, 42–43

**Model gợi ý:** Sonnet

## What to build

- Issue tài liệu, cần chủ game duyệt (HITL). Không viết code. Viết `docs/proposals/phase4a-so-lieu.md` theo khung cân bằng tối 03/10 (đọc `docs/proposals/balance-time-economy.md`), lấy số trong DESIGN làm điểm xuất phát.
- Bảng cần có: sức chứa kho 3 cấp và kho lạnh (giá xây, giá nâng, điện của kho lạnh); thời gian hư từng nhóm đồ ở kho thường và kho lạnh; sức mua từng món (mỗi lần bán vượt rớt bao nhiêu, sàn 50%, hồi sau 2 ngày game); tần suất và mức được mùa/mất mùa; giá điện từng máy và cách tính hóa đơn tháng, hạn trả 3 ngày, phí đóng lại khoảng 10%; công thức, thời gian, giá xây và giá nâng của 8 máy chế biến (cối xay, hũ muối dưa, máy làm phô mai, khung dệt, máy ép dầu, nồi xà phòng, máy may, máy trộn cám); máy trộn cám rẻ hơn mua ở Bà Tư 30–50% (tính theo giá bán của nông sản đầu vào); độ bền, mức hao mỗi lần dùng, mức hao do bão, giá tự sửa (gỗ, đinh, thể lực), giá thuê Ông Sáu 10–15% giá mua; công thức bếp, thể lực hồi, thời gian nấu 2–10 phút.
- Mục tiêu cân bằng: điện nước cộng sửa chữa chiếm khoảng 15–25% thu nhập (DESIGN §3.3d). Bảng có một phần mô phỏng thu nhập một ngày ở vài mốc cấp (5, 10, 15) để chứng minh mục tiêu này.
- Ghi rõ chỗ nào là số chốt, chỗ nào còn đề xuất để chủ game sửa. Sau khi duyệt, các issue sau chép số vào `data.js`.

## Acceptance criteria

- [ ] Có file `docs/proposals/phase4a-so-lieu.md` đủ các bảng nêu trên, mỗi bảng có cột "điểm xuất phát từ DESIGN" và cột "đề xuất".
- [ ] Có phần mô phỏng thu nhập chứng minh điện nước + sửa chữa nằm trong 15–25%.
- [ ] Chủ game duyệt bảng (ghi ngày duyệt và chỗ sửa vào đầu file). Chưa duyệt thì các issue 65–74 không bắt đầu phần số liệu.
- [ ] Không có test tự động; không đổi code.

## Blocked by

- [63](63-phat-hanh-phase-3.md)
