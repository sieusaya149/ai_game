# 95. Bảng số liệu đợt 4C (chủ game duyệt)

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §4, §6b, §8.3, §8.5, §8.6 · ADR 0017, 0019, 0020 · Số liệu cho user story 109–160

**Model gợi ý:** Sonnet

## What to build

- Issue tài liệu, cần chủ game duyệt (HITL). Không viết code. Viết `docs/proposals/phase4c-so-lieu.md` theo khung cân bằng tối 03/10, số trong DESIGN và PRD 0005 là điểm xuất phát.
- Bảng cần có: ❤️1–5 (điểm mỗi nguồn, giới hạn mỗi ngày, món thích/ghét từng cư dân, thưởng từng mức); ⭐ (nguồn và số lượng từng nguồn, danh mục và giá Tiệm Danh Giá, đổi công cần bao nhiêu lần giúp); nhân công (lương từng thợ theo cấp, thể lực 60, tốc độ, ngưỡng lên cấp, giá ca/ngày, số thợ tối đa); hội chợ (tỉ lệ loto, giải, giá vé, trần 10 vé, ném vòng, bắn lon, vòng quay, phần thưởng độc quyền, đảm bảo nhà cái luôn lời); thi nông sản (hạng mục, điểm, giải); chợ phiên (sạp 4/6/8 ô, giá nâng, khách NPC, tần suất mua); uy tín shop (điểm mỗi lần bán, ngưỡng 🏪1–5, thưởng ⭐ mỗi tuần); livestream (độ hot, người xem NPC, giỏ live, thời lượng); mùa dịch (tần suất, mức ×3, giá thuốc, giá tiêm, nhãn An toàn); hợp tác xã (chỉ tiêu theo mùa, thưởng); mã giảm giá (nguồn, hạn 3 ngày); xe hàng rong (giá, ô hàng, tần suất NPC); sự kiện diệt chuột (chỉ tiêu theo số người, thưởng, hại con sót).
- Có phần mô phỏng để đảm bảo xu từ chợ phiên, livestream, xe hàng rong và loto không làm lạm phát (ADR 0009, giá 50–200% giá gốc). Ghi rõ chỗ chốt và chỗ còn đề xuất. Sau khi duyệt, các issue sau chép số vào `data.js`.

## Acceptance criteria

- [ ] Có file `docs/proposals/phase4c-so-lieu.md` đủ các bảng trên, mỗi bảng có cột "điểm xuất phát" và cột "đề xuất".
- [ ] Có phần mô phỏng chứng minh nhà cái loto luôn lời và nguồn xu mới không phá cân bằng 4A, 4B.
- [ ] Chủ game duyệt (ghi ngày duyệt và chỗ sửa vào đầu file). Chưa duyệt thì các issue 96–108 không bắt đầu phần số liệu.
- [ ] Không có test tự động; không đổi code.

## Blocked by

- [94](94-phat-hanh-dot-4b.md)
