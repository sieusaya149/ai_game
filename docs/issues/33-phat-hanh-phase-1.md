# 33. Rà 360px, cập nhật SPEC.md và phát hành Phase 1

## Parent

[PRD 0002](../prd/0002-phase-1-online.md) · ADR 0006, 0008, 0010, 0011 · Toàn bộ user story, đặc biệt 83, 85, 86

## What to build

Gộp ba việc cuối của phase, theo mẫu issue 17, 18 và 19 của Phase 0.

### 1. Rà soát giao diện 360px

Rà mọi màn mới của Phase 1 ở 360px và trên máy có tai thỏ:
- Màn chọn chế độ, đăng nhập / đăng ký, hộp "Mang vườn này lên làng?", biểu tượng mất kết nối.
- Thanh chat nhanh và hàng biểu cảm, danh sách người online.
- Bảng bạn bè, danh sách cổng vườn trong làng.
- Hộp quà, sổ lưu bút, nhật ký vườn (kèm nút "Sang trộm lại 😤").
- Nút giúp / trộm / ném xúc xích, bộ đếm lượt giúp, màn "Trong lúc bạn vắng nhà…" bản mở rộng.

Yêu cầu: không tràn ngang, nút đủ to để bấm, tránh tai thỏ bằng `env(safe-area-inset-*)`, joystick và nút hành động không che bản đồ nhỏ hay thanh chat.

### 2. Cập nhật SPEC.md

`SPEC.md` hiện mô tả game chơi đơn, `server.js` còn ghi là "đừng sửa". Cập nhật để các agent của phase sau làm theo đúng:
- **Vai trò mới của từng file:** `server.js` được viết lại, mô-đun server mới (tài khoản, kho vườn, chạy bù, hàng đợi khách, hiện diện, bạn bè, lệnh quản trị) nằm ở đâu và chỉ gọi gì trong `state.js`.
- **Hợp đồng HTTP và WebSocket** (JSON), bảng SQLite, các trường thêm vào bản lưu v2 cho online.
- **API công khai mới của luật chơi:** luật khách `help | gift | steal | pet | sausage`, phát hiện khách của chó, lịch làng từ giờ server, ngày ngoài đời, chạy bù có hàng đợi, thành tựu xã hội.
- **Target và event mới** (kèm mức và khóa gộp).
- **Seam 3** và cách dựng tình huống online (đăng ký bằng mã mời tạo bằng lệnh quản trị, đẩy bản lưu ghi sẵn, lùi `savedAt`).
- **Lệnh quản trị:** tạo mã mời, đặt lại PIN, xóa tài khoản, sao lưu.
- Liên kết tới `DESIGN.md`, ADR 0002, 0003, 0006, 0007, 0010, 0011, 0012 và PRD 0002.

### 3. Phát hành

Quy trình ở `DESIGN.md` mục 9:
1. **Trên máy local:** chạy hết unit test (seam 1 và seam 3) và e2e (cả hai cỡ màn hình; riêng test online mở 2 trình duyệt headless, 1 worker). Mọi thứ phải pass.
2. **Deploy lên VPS:** `git pull && docker compose up -d --build` trong `~/project/ai_game`. Kiểm tra volume dữ liệu còn nguyên sau khi tạo lại container và chạy thử lệnh sao lưu.
3. **Từ máy local:** smoke live vào `https://game.huninna.com` bằng **tài khoản test riêng**: đăng nhập, vào làng, ra vào vườn mình, rồi **tự xóa tài khoản test** để làng thật không có rác.
4. **Kiểm tra với bạn thật:** tạo mã mời cho nhóm, một người đăng ký, mang vườn cũ lên làng và thấy vườn đúng.
5. **Ghi lại kết quả:** cập nhật trạng thái các issue trong `docs/issues/README.md` và ghi chú phát hành ngắn (số test, commit đã deploy, những gì chỉ giả lập chưa thử máy thật).

## Acceptance criteria

- [ ] E2E ở cỡ 360px mở từng màn trên và kiểm tra không có cuộn ngang, nút nằm trong màn hình và đủ to, các lớp nổi không đè nhau. Mở rộng bộ e2e 360px hiện có.
- [ ] Thử tay trên điện thoại thật có tai thỏ (ghi rõ nếu chỉ giả lập bằng cách đè `env(safe-area-inset-*)`).
- [ ] `SPEC.md` không còn chỗ nào mâu thuẫn với PRD 0002 và các ADR; một agent mới chỉ đọc `SPEC.md` biết file nào được sửa, gọi API nào, test ở đâu. Hợp đồng API khớp với code.
- [ ] Unit test (seam 1 và seam 3) và e2e pass hết trên máy local trước khi deploy. Ghi lại số test pass.
- [ ] Deploy xong, container `ai-game` ở trạng thái Up, file SQLite còn nguyên sau khi khởi động lại container.
- [ ] Lệnh sao lưu chạy được trên VPS và cho ra file đọc lại được.
- [ ] Smoke live pass với tài khoản test và tài khoản đó đã bị xóa sau khi chạy (đăng nhập lại bằng nó thất bại).
- [ ] Một người chơi thật (không phải tài khoản test) đăng ký bằng mã mời, mang vườn cũ lên làng không mất gì.
- [ ] Mọi issue 20–32 ở trạng thái ✅.

## Blocked by

- Tất cả issue 20–32
