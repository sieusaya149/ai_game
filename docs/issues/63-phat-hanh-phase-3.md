# 63. Rà 360px, cập nhật SPEC.md và phát hành Phase 3

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · ADR 0006, 0008, 0011 · Tất cả user story

## What to build

Ba việc chốt phase, gộp thành một lát như cuối Phase 0.

**1. Rà soát giao diện điện thoại 360px.** Rà toàn bộ giao diện mới của Phase 3 trên 360px và máy có tai thỏ:
- Màn chọn hạt (cấp thành thạo, nhãn đúng mùa), chợ hạt cây mới.
- Ô đang lớn hiện sao, túi/kho/giỏ/thùng giao hàng tách theo sao.
- HUD có icon thời tiết, radio và bảng tin làng.
- Chế độ xây dựng với vùng phủ nước, mực nước bồn, đặt bị từ chối "ngoài tầm nước".
- Màn mua nâng cấp theo khối, biểu tượng nâng cấp trên khối.
- Nhà kính với mái, bảng trạng thái và bong bóng.
- Hố ủ, giếng 4 cấp, Việc cần làm mới, Sổ tay trang mới.

Yêu cầu: không tràn ngang, nút đủ to để bấm (≥ 40px), tránh vùng tai thỏ bằng `env(safe-area-inset-*)`, các lớp nổi không đè nhau.

**2. Cập nhật `SPEC.md`:**
- Hình dạng **bản lưu v4**, bước chuyển v3→v4 và cách thêm bước chuyển kế tiếp.
- API công khai mới: thành thạo, sao, trái khổng lồ, mùa, hàm thời tiết (ngày game + hạt giống), giếng 4 cấp, bồn và mạng nước, nâng cấp theo khối, nhà kính, hố ủ, lý do `canPlace` mới ("ngoài tầm nước", nhà kính, v.v.), loại việc `todoList` mới, danh sách sự kiện mới với mức và khóa gộp.
- Vai trò file mới (module thời tiết, nước...), bảng `data` mới, thứ tự trừ nước cố định.
- Bổ sung cách dựng tình huống bằng bản lưu ghi sẵn và hạt giống cố định cho thời tiết (ADR 0008, 0014).
- Không còn chỗ nào mâu thuẫn với PRD 0004 và các ADR.

**3. Phát hành** theo quy trình ở `DESIGN.md` mục 9: chạy hết unit test và e2e (desktop + 360px) trên máy local; deploy lên VPS (`git pull && docker compose up -d --build`); smoke live nhắm vào `https://game.huninna.com` (thêm các bước vào nhà nghe radio, mở chế độ xây dựng thấy vùng phủ nước); mở bản live bằng trình duyệt có bản lưu v3 thật để xác nhận vườn chuyển sang v4 không mất gì; ghi kết quả vào `docs/issues/README.md` và ghi chú phát hành ngắn.

## Acceptance criteria

- [ ] E2E ở cỡ 360px mở từng bảng/màn mới trên và kiểm tra không có cuộn ngang; nút nằm trong màn hình và ≥ 40px; các lớp nổi không đè nhau.
- [ ] E2E giả lập tai thỏ: đè biến safe-area, mọi nút mới nằm trong vùng an toàn. Thử máy thật khi có, nếu chưa thì ghi rõ "chỉ giả lập".
- [x] `SPEC.md` khớp với code sau khi issue 50–62 xong; một agent mới chỉ đọc `SPEC.md` là biết file nào được sửa, gọi API nào, test ở đâu cho các hệ thống Phase 3.
- [ ] Unit và e2e pass hết trên máy local trước khi deploy; ghi lại số test pass.
- [ ] Deploy xong, container `ai-game` ở trạng thái chạy. Smoke live pass.
- [ ] Bản lưu v3 thật chuyển sang v4 không mất gì (cây đang trồng, đồ trong túi thành ★1, giếng cấp 1). Nếu chưa mở được bằng trình duyệt có save thật thì ghi "chờ chủ game" như Phase 0 và đã kiểm bằng fixture v3.
- [ ] Mọi issue 50–62 ở trạng thái ✅ trong `docs/issues/README.md`.

## Blocked by

- Tất cả issue 50–62

## Ghi chú phát hành

- Ghi chú cho người chơi: [`docs/release/phase-3.md`](../release/phase-3.md). Số liệu thời gian và giá lấy từ mục "Đã chốt (03/10)" của đề xuất cân bằng; nếu `p3-balance` đổi thêm số thì rà lại mục "Nhịp thời gian mới".
- `SPEC.md` đã rà (bỏ dòng lặp ở bảng file và bản lưu, sửa tiêu đề và quy trình phát hành); phần số liệu cân bằng sẽ do nhánh `p3-balance` cập nhật khi gộp.
