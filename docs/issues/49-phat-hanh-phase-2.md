# 49. Rà 360px, cập nhật SPEC.md và phát hành Phase 2

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0004, 0006, 0008 · Tất cả user story

## What to build

Gộp ba việc cuối phase, theo mẫu Phase 0 (17, 18, 19).

**1. Rà soát giao diện điện thoại 360px.** Rà toàn bộ giao diện mới của Phase 2 trên màn hình 360px và máy có tai thỏ:
- Bảng hành động trên con vật (tắm, chữa, tiêm, bán, nghỉ hưu, soi trứng, đổi tên), bảng thông tin con vật có tim, tuổi, giai đoạn, dơ, bệnh.
- Chuồng 3 cấp, nâng cấp, chuồng cách ly; trạm thú y của Cô Út; bán cho Chú Ba và cái cân.
- Minigame dạy chó, danh sách lệnh, chọn ô Canh khu.
- Cảnh báo kẻ săn mồi, con lạc và mũi tên; hộp thoại phạt trộm.
- Bảng Việc cần làm có thêm mục vật nuôi, sổ tay có trang mới, cây phả hệ.

Yêu cầu: không tràn ngang, nút đủ to để bấm, tránh vùng tai thỏ bằng `env(safe-area-inset-*)`, joystick và nút hành động không che bản đồ nhỏ và các hộp thoại.

**2. Cập nhật `SPEC.md`** theo luật vật nuôi mới để các agent phase sau làm đúng:
- Hình dạng bản lưu v3 và hàm chuyển v2→v3.
- API công khai mới của `state.js`: vòng đời, sinh sản, dơ và tắm, bệnh, độ thân, bán và nghỉ hưu, thả rông và về chuồng, kẻ săn mồi, mèo, dạy lệnh chó, bảng chuồng theo loại và cấp.
- Danh sách target và event mới, mức và khóa gộp của sự kiện vật nuôi.
- Cờ "đang chạy bù" của luật bệnh và kẻ săn mồi (ADR 0004), luật thả rông trừu tượng (ADR 0013).
- Cách dựng tình huống bằng bản lưu ghi sẵn cho các e2e vật nuôi.
- Cập nhật cư dân làng (Cô Út, Chú Ba) và vật phẩm mới ở chợ Bà Tư.

**3. Phát hành Phase 2** theo quy trình `DESIGN.md` mục 9:
1. Trên máy local: chạy hết unit test, test giao thức server và e2e (cả hai cỡ màn hình). Mọi thứ phải pass.
2. Deploy lên VPS: `git pull && docker compose up -d --build` trong `~/project/ai_game`.
3. Từ máy local: chạy smoke test live vào `https://game.huninna.com`; thêm các bước: mua một con vật, tắm hoặc chữa được, đi vào làng tới trạm thú y.
4. Kiểm tra bản lưu thật: mở bản live bằng trình duyệt đã có bản lưu v2 thật, xác nhận chuyển sang v3 không mất con vật nào; kiểm tra bản online trên server chuyển cùng lúc khi chủ đăng nhập.
5. Ghi kết quả: cập nhật trạng thái các issue trong `docs/issues/README.md` và ghi chú phát hành ngắn.

## Acceptance criteria

- [ ] E2E ở 360x740, 320x640, 412x915 mở từng bảng trên: không cuộn ngang, nút nằm trong màn hình và đủ lớn, các lớp nổi không đè nhau (mở rộng `e2e/mobile360.spec.mjs`).
- [ ] Giả lập tai thỏ bằng cách đè biến `env(safe-area-inset-*)`: mọi nút nằm trong vùng an toàn. Ghi rõ phần chưa thử máy thật.
- [ ] `SPEC.md` không còn chỗ nào mâu thuẫn với PRD 0003 và các ADR; một agent mới chỉ đọc `SPEC.md` là biết file nào được sửa, gọi API nào, test ở đâu; hợp đồng API khớp với code.
- [ ] Unit, test giao thức server và e2e pass hết trên máy local trước khi deploy. Ghi lại số test pass. Có test riêng xác nhận chạy bù offline không gây chết (ADR 0004).
- [ ] Deploy xong, container `ai-game` ở trạng thái chạy.
- [ ] Smoke live pass.
- [ ] Bản lưu v2 thật chuyển sang v3 không mất gì (nếu chưa mở được bằng trình duyệt thật thì ghi rõ và dùng fixture v2).
- [ ] Mọi issue 34–48 ở trạng thái ✅. Ghi chú phát hành Phase 2 được thêm vào cuối file này.

## Blocked by

- [34](34-ban-luu-v3-vong-doi.md)
- [35](35-chuong-3-cap-va-cach-ly.md)
- [36](36-duc-cai-va-sinh-san.md)
- [37](37-do-va-tam.md)
- [38](38-benh-va-co-ut.md)
- [39](39-do-than.md)
- [40](40-ban-cho-chu-ba.md)
- [41](41-tha-rong-ban-ngay.md)
- [42](42-ve-chuong-va-lua.md)
- [43](43-ke-san-moi.md)
- [44](44-meo.md)
- [45](45-cho-vong-doi-va-day-lenh.md)
- [46](46-trom-npc-moi.md)
- [47](47-vit.md)
- [48](48-huong-dan-thong-bao-vat-nuoi.md)
