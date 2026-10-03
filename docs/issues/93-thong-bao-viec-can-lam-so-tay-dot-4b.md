# 93. Thông báo, việc cần làm và sổ tay đợt 4B

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8c · ADR 0004 · User story 161–163 (phần 4B)

**Model gợi ý:** Sonnet

## What to build

- **Thông báo** đúng mức cho: cá lớn, nước hồ bẩn, cá bệnh, trái chín/rụng/ruồi, sâu đục thân, bão gãy cành, sóc tới, mèo vồ chuột, ong, tằm ra kén, ngỗng báo khách, thư bồ câu, máy ấp xong, đơn việc mới. Khóa gộp tránh dội khi chạy bù.
- **Việc cần làm** thêm: cho cá ăn, vớt rong, kéo lưới, rung cây, nhặt trái, tỉa cành, lấy tổ ong, lấy kén, cho tằm ăn, chải ngựa, nhặt trứng ngoài vườn, đơn việc đang chờ.
- **Sổ tay** thêm trang cho hồ cá, câu cá, cây ăn trái, mèo, ong, tằm, từng loài mới, kéo cày và xe trâu, máy ấp, máy gắn cố định, đơn việc. Hướng dẫn mở dần ở lần đầu gặp.

## Acceptance criteria

- [ ] Unit test (seam 1): mỗi sự kiện mới có mức và khóa gộp đúng; `todoList` trả đúng các loại việc mới.
- [ ] E2E (desktop + 360px): dựng bản lưu có hồ bẩn, cây đang rụng trái, tổ ong sẵn sàng thì thấy thông báo, việc cần làm, và mở được trang sổ tay mới.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [79](79-ho-ca.md)
- [80](80-cau-ca-song-lang-va-ech.md)
- [81](81-cay-an-trai-va-dau-tam.md)
- [82](82-soc-va-meo-co-tac-dung-ro.md)
- [83](83-ong-thung-ong-may-quay-mat.md)
- [84](84-tam-va-nha-tam.md)
- [85](85-tho-angora-va-ngong.md)
- [86](86-de-trau-keo-cay-va-xe-trau.md)
- [87](87-bo-cau-cong-va-ngua.md)
- [88](88-may-ap-3-cap.md)
- [89](89-mang-trung-lan-va-may-gat.md)
- [90](90-don-viec-cho-heo-cho-meo.md)
