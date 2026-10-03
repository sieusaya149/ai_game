# 71. Máy phô mai, khung dệt, máy ép dầu, nồi xà phòng, máy may

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §3.3c · ADR 0005 · User story 34

**Model gợi ý:** Sonnet

## What to build

- Thêm 5 máy vào khung của issue 70, chỉ là dòng dữ liệu và sprite (số liệu: lấy từ bảng số liệu đợt (issue 64)): **máy làm phô mai** (cấp 7: sữa bò hoặc sữa dê → phô mai), **khung dệt** (cấp 8: lông cừu hoặc lông thỏ → vải, kén → lụa), **máy ép dầu** (cấp 9: đậu phộng → dầu phộng), **nồi nấu xà phòng** (cấp 6: dầu phộng + sáp ong → xà phòng), **máy may** (cấp 11: vải → áo len, quần áo; lụa → áo dài).
- Nguyên liệu của 4B (sữa dê, lông thỏ, kén, sáp ong) chưa có ở đợt này: bảng công thức vẫn khai đủ, test dựng bằng bản lưu có sẵn nguyên liệu, và công thức chỉ dùng được khi người chơi có nguyên liệu. Sữa bò, lông cừu, đậu phộng đã có từ trước.
- Mỗi máy có sprite tạm riêng (để issue ART đợt 4A thay). Dùng hình tạm (khối màu, icon chữ) tới khi issue ART đợt này gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): mỗi máy có đúng công thức, thời gian, cấp mở theo bảng; thành phẩm đúng; hàng chờ theo cấp; mọi máy mới chạy được khi `catchUp` và dừng khi cắt điện.
- [ ] Unit test: nguyên liệu chưa có thì không bỏ vào được và có lý do; nồi xà phòng nhận đúng dầu phộng + sáp ong từ bản lưu dựng sẵn.
- [ ] E2E (desktop + 360px): với bản lưu có sữa, đậu phộng và dầu phộng, chạy máy làm phô mai, máy ép dầu và nồi xà phòng; thấy thành phẩm trong kho.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [70](70-khung-may-che-bien-coi-xay-hu-muoi-dua.md)
