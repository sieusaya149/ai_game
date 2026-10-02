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
2. **Deploy lên VPS:** `git pull && docker compose up -d --build` trong `~/project/ai_game`. Kiểm tra volume dữ liệu còn nguyên sau khi tạo lại container và chạy thử lệnh sao lưu. — **gộp vào lần deploy chung sau khi gộp Phase 2 (người dùng chốt tối 2026-10-02: deploy = push rồi pull + build lại trên VPS, không sao lưu).**
3. **Từ máy local:** smoke live vào `https://game.huninna.com` bằng **tài khoản test riêng**: đăng nhập, vào làng, ra vào vườn mình, rồi **tự xóa tài khoản test** để làng thật không có rác. — **chưa làm (người dùng chốt tối 2026-10-02: chưa cần smoke).**
4. **Kiểm tra với bạn thật:** tạo mã mời cho nhóm, một người đăng ký, mang vườn cũ lên làng và thấy vườn đúng. — **lúc deploy tạo 5 mã mời, chỉ báo cho người dùng, không ghi vào repo.**
5. **Ghi lại kết quả:** cập nhật trạng thái các issue trong `docs/issues/README.md` và ghi chú phát hành ngắn (số test, commit đã deploy, những gì chỉ giả lập chưa thử máy thật).

## Acceptance criteria

- [x] E2E ở cỡ 360px mở từng màn trên và kiểm tra không có cuộn ngang, nút nằm trong màn hình và đủ to, các lớp nổi không đè nhau. Mở rộng bộ e2e 360px hiện có.
- [x] Thử tay trên điện thoại thật có tai thỏ (ghi rõ nếu chỉ giả lập bằng cách đè `env(safe-area-inset-*)`). — **chỉ giả lập** (đè `--sl/--sr/--st/--sb` trong `e2e/mobile360.spec.mjs`), chưa thử máy thật.
- [x] `SPEC.md` không còn chỗ nào mâu thuẫn với PRD 0002 và các ADR; một agent mới chỉ đọc `SPEC.md` biết file nào được sửa, gọi API nào, test ở đâu. Hợp đồng API khớp với code.
- [x] Unit test (seam 1 và seam 3) và e2e pass hết trên máy local trước khi deploy. Ghi lại số test pass. — số liệu ở ghi chú phát hành bên dưới.
- [ ] Deploy xong, container `ai-game` ở trạng thái Up, file SQLite còn nguyên sau khi khởi động lại container. — deploy một lần chung với Phase 2, sau khi gộp `phase2` vào `main`.
- [ ] Lệnh sao lưu chạy được trên VPS và cho ra file đọc lại được. — bỏ (người dùng chốt tối 2026-10-02: không sao lưu).
- [ ] Smoke live pass với tài khoản test và tài khoản đó đã bị xóa sau khi chạy (đăng nhập lại bằng nó thất bại). — chưa làm (người dùng chốt tối 2026-10-02: chưa cần smoke).
- [ ] Một người chơi thật (không phải tài khoản test) đăng ký bằng mã mời, mang vườn cũ lên làng không mất gì. — chờ người dùng thử sau deploy (5 mã mời tạo lúc deploy).
- [x] Mọi issue 20–32 ở trạng thái ✅.

## Blocked by

- Tất cả issue 20–32

## Ghi chú phát hành Phase 1 (2026-10-02)

- **Test trên máy local:**
  - Unit (seam 1 + seam 3, `npm test`): 313/313 pass.
  - E2E đầy đủ (`npx playwright test`, 1 worker): 200 pass, 48 bỏ qua (spec chỉ dành cho mobile hoặc chỉ desktop), 2 hỏng. Đã sửa cả hai, chạy lại riêng thì pass:
    - `social.spec` desktop "màn vắng nhà dài": test đo khung lúc hiệu ứng `pop` (phóng to 1.05) chưa xong. Trang của A nằm sau trang B nên trình duyệt chạy hiệu ứng chậm. Bố cục vẫn đúng. Đã sửa test để cho hiệu ứng xong rồi mới đo.
    - `perf.spec` "máy chậm": giả lập CPU chậm 6× chưa đủ chậm trên máy dev nhanh, game không gợi ý tiết kiệm pin. Đã nâng lên 12× (12/12 pass).
  - `mobile360.spec` (360x740, 320x640, 412x915): 48/48 pass.
- **Rà 360px đã sửa:**
  - Đồng hồ ngày làng 5 chữ số vừa một dòng ở 320px.
  - Cột chat nhanh và biểu cảm nằm trên joystick, nút chat cao 40px.
  - Nút đóng màn "Trong lúc bạn vắng nhà" luôn thấy khi danh sách dài.
- **Chỉ giả lập, chưa thử máy thật:** tai thỏ (đè `--sl/--sr/--st/--sb`), máy chậm (giả lập CPU chậm).
- **Lỗi nhỏ còn lại:** ở làng trên màn 360px, HUD che một phần biển "Chợ Bà Tư" và chữ "Đóng cửa". Để lại cho issue 49.
- **Deploy:** gộp chung một lần với Phase 2, sau khi gộp `phase2` vào `main`. Theo luật người dùng chốt tối 2026-10-02: không sao lưu, chưa smoke live, tạo 5 mã mời (chỉ báo cho người dùng). Commit đã deploy ghi ở ghi chú phát hành của issue 49.
