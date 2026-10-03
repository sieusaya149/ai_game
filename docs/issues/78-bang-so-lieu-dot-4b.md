# 78. Bảng số liệu đợt 4B (chủ game duyệt)

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §2.1a, §2.5, §3.3c, §5 · ADR 0017 · Số liệu cho user story 48–107

**Model gợi ý:** Sonnet

## What to build

- Issue tài liệu, cần chủ game duyệt (HITL). Không viết code. Viết `docs/proposals/phase4b-so-lieu.md` theo khung cân bằng tối 03/10 (`docs/proposals/balance-time-economy.md`), số trong DESIGN và PRD 0005 là điểm xuất phát.
- Bảng cần có: hồ cá (giá đào, giá nối, tốc độ giảm độ sạch theo cá/cám/phân vịt, ngưỡng 40/20, giá cám cá, giá ốc), 6 loài cá (giá giống, thời gian 3 cấp, giá bán, Koi); câu cá (tần suất cá, cá hiếm theo mùa, xác suất ủng cũ); ếch; 7 cây ăn trái và dâu tằm (cấp mở, giá cây, thời gian 3 giai đoạn, chu kỳ ra trái, sản lượng, gấp đôi đúng mùa, tỉa cành, sâu đục thân, bão gãy cành); sóc; mèo (tần suất vồ, quà); ong và máy quay mật; tằm (nong, ăn lá, kén); 7 loài mới (cấp mở, giá, vòng đời, sản phẩm, chuồng, tuổi thọ); kéo cày (thể lực, số lần cày mỗi ngày game, mệt); trâu kéo xe (85%, ×2 sức chứa); máy ấp 3 cấp (giá, điện); máng trứng lăn, máy gặt (giá, điện, hao mòn); đơn việc (thưởng xu, EXP).
- Ghi rõ chỗ nào chốt, chỗ nào còn đề xuất. Sau khi duyệt, các issue sau chép số vào `data.js`.

## Acceptance criteria

- [ ] Có file `docs/proposals/phase4b-so-lieu.md` đủ các bảng trên, mỗi bảng có cột "điểm xuất phát" và cột "đề xuất".
- [ ] Có phần mô phỏng thu nhập một ngày ở vài mốc cấp, kiểm nguồn thu mới (cá, trái, mật, lụa, loài mới) không làm lệch cân bằng của 4A.
- [ ] Chủ game duyệt (ghi ngày duyệt và chỗ sửa vào đầu file). Chưa duyệt thì các issue 79–90 không bắt đầu phần số liệu.
- [ ] Không có test tự động; không đổi code.

## Blocked by

- [77](77-phat-hanh-dot-4a.md)
