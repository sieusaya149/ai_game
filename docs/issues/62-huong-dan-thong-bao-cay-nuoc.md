# 62. Thông báo, Việc cần làm và sổ tay cho cây và nước

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · DESIGN §8c · ADR 0008 · User story 79–82

## What to build

Nối các hệ thống mới vào ba chỗ người chơi đã quen: thông báo 3 mức, bảng Việc cần làm và Sổ tay.

- **Thông báo 🟡 mới** (có mức và khóa gộp như mọi sự kiện, gộp trong khoảng ngắn):
  - Cây lên cấp thành thạo (issue 51).
  - Thu được trái khổng lồ (issue 53).
  - Bồn sắp cạn (dưới ngưỡng chốt trong `data`) và hết tiền điện làm máy ngừng (issue 57, 58).
- **Việc cần làm** (`todoList`) thêm loại việc mới: **bồn cạn** và **hố ủ đã xong**. Chạm một dòng thì nhân vật tự đi tới bồn hoặc hố ủ, kể cả khi đang ở bản đồ khác. Bản đồ nhỏ và mũi tên đọc từ cùng danh sách. Việc "hố ủ đã xong" đọc dữ liệu hố ủ (issue 61).
- **Sổ tay** có thêm trang: mùa, ★ chất lượng, thành thạo, thời tiết, nhà kính, nước (giếng, bồn, tầm nước), tự động hóa, hố ủ. Có hình minh họa như các trang cũ; trang mở dần theo cấp.
- **Cài đặt thông báo** tắt được từng loại 🟡 mới. 🔴 vẫn không tắt được.
- **Pixel art do agent Opus vẽ.** Sprite cần vẽ: hình minh họa cho các trang sổ tay mới, biểu tượng thông báo và Việc cần làm cho "bồn cạn" và "hố ủ xong" (nếu chưa dùng lại được biểu tượng có sẵn).

## Acceptance criteria

- [x] Unit test (seam 1): mọi loại sự kiện mới đều có mức và khóa gộp (test đi qua hết danh sách loại sự kiện đã có sẵn).
- [x] Unit test: `todoList` trả loại "bồn cạn" khi bồn dưới ngưỡng và "hố ủ xong" khi hố có phân lấy được, kèm vị trí để mũi tên và bản đồ nhỏ dùng.
- [x] Unit test: hết xu trả điện thì phát đúng một thông báo gộp, không lặp mỗi tick.
- [x] E2E (desktop + 360px): dựng bản lưu cây ngay ngưỡng lên cấp → thu hoạch → thấy thông báo lên cấp và, với trái khổng lồ, thông báo riêng.
- [x] E2E: dựng bản lưu bồn gần cạn và hố ủ đã xong → bảng Việc cần làm hiện hai dòng mới, chạm dòng thì nhân vật đi tới đúng chỗ.
- [x] E2E: mở Sổ tay thấy các trang mới, tắt loại thông báo "thành thạo" trong cài đặt thì không còn thấy thông báo đó.

## Blocked by

- [51](51-cap-thanh-thao.md)
- [53](53-trai-khong-lo.md)
- [57](57-bon-va-mang-nuoc.md)
- [58](58-tu-dong-hoa-khoi-ruong.md)
- [61](61-ho-u-phan.md)
