# 101. Thi nông sản

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.6 (Hội chợ nông sản) · ADR 0019, 0020 · User story 131–134

**Model gợi ý:** Sonnet

## What to build

- **Tối Chủ nhật 20h–21h giờ thật**, ba hạng mục: **trái to nhất, vật nuôi đẹp nhất, rổ nông sản 5 món**. Gửi bài thi, **người có mặt bình chọn** (phiếu qua trạng thái chung issue 99), **giám khảo NPC chấm thêm** (nên làng vắng vẫn có kết quả). Bài dự thi **trả về sau khi trưng bày**, vật nuôi dự thi bằng hồ sơ (không rời trại). Giải nhất, nhì, ba có xu, cúp, bảng vinh danh đặt ở vườn. Số liệu: lấy từ bảng số liệu đợt (issue 95). Dùng lịch issue 68 cho mốc giờ.
- **UI:** bảng gửi bài, gian trưng bày, màn bình chọn, bảng vinh danh. Hình tạm tới khi issue ART 109/110 gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): chỉ nhận bài trong khung giờ; bài trả về sau khi trưng bày; vật nuôi dự thi không rời trại; điểm = phiếu + giám khảo NPC theo hạt giống; giải đúng bảng.
- [ ] Unit test (seam 3): phiếu bình chọn cộng đúng, mỗi người một phiếu mỗi hạng mục, không tự bình chọn bài mình; kết quả phát cho mọi người.
- [ ] E2E (desktop + 360px, hai trình duyệt): người một gửi bài, người hai bình chọn, thấy kết quả và cúp.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [99](99-trang-thai-chung-cua-lang-tren-server.md)
