# 83. Ong, thùng ong và máy quay mật

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §2.1a, §3.3c · ADR 0005 · User story 75–78, 81

**Model gợi ý:** Sonnet

## What to build

- **Thùng ong** cạnh vườn trái (từ cấp 10), mỗi thùng một đàn, cho **tổ ong** theo chu kỳ. **Máy quay mật** (khung máy chế biến của issue 70) biến tổ ong thành **mật ong + sáp ong**; sáp ong nối vào nồi xà phòng (issue 71) cùng dầu phộng. Số liệu: lấy từ bảng số liệu đợt (issue 78).
- **Thụ phấn:** cây ăn trái trong tầm thùng ong sai trái hơn. **Không có đồ bảo hộ thì bị đốt**, mất thể lực (đồ bảo hộ là vật dụng mới ở tiệm rèn hoặc chợ).
- Chuồng mới (thùng ong) thêm vào `PEN_TABLE`. Hình tạm tới khi issue ART 91 gộp.

## Acceptance criteria

- [ ] Unit test (seam 1): `canPlace` thùng ong; chu kỳ ra tổ ong; máy quay mật ra đúng mật và sáp, chạy bù được, dừng khi cắt điện.
- [ ] Unit test: cây ăn trái trong tầm thùng ong ra thêm trái theo bảng, ngoài tầm thì không; không đồ bảo hộ thì bị đốt mất thể lực, có thì không.
- [ ] Unit test: sáp ong dùng được trong nồi xà phòng (chuỗi mật → xà phòng).
- [ ] E2E (desktop + 360px): đặt thùng ong cạnh cây, lấy tổ ong, quay mật, thấy mật và sáp trong kho.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [81](81-cay-an-trai-va-dau-tam.md)
