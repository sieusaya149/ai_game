# Issues

Mỗi issue là một lát cắt dọc, đi xuyên qua mọi lớp: luật chơi, server, thế giới/vẽ, UI, test.

Trạng thái: ⬜ chưa làm · 🔶 đang làm · ✅ xong

## Phase 0, nền móng

Nguồn: [PRD 0001](../prd/0001-phase-0-nen-mong.md).

| # | Issue | Bị chặn bởi | Trạng thái |
|---|---|---|---|
| 01 | [Khung test e2e và smoke live](01-khung-test-e2e-va-smoke.md) | — | ✅ |
| 02 | [Bản lưu v2: thực thể và khối ruộng](02-ban-luu-v2.md) | 01 | ✅ |
| 03 | [Chế độ xây dựng: dời công trình](03-che-do-xay-dung-doi-cong-trinh.md) | 02 | ✅ |
| 04 | [Đặt khối ruộng và đồ trang trí mới](04-dat-khoi-ruong-va-do-trang-tri.md) | 03 | ✅ |
| 05 | [Bản đồ lớn và mở rộng đất](05-ban-do-lon-va-mo-rong-dat.md) | 02 | ✅ |
| 06 | [Nhiều bản đồ: vào nhà](06-nhieu-ban-do-vao-nha.md) | 02 | ✅ |
| 07 | [Làng và chợ Bà Tư](07-lang-va-cho-ba-tu.md) | 06 | ✅ |
| 08 | [Thùng giao hàng](08-thung-giao-hang.md) | 02 | ✅ |
| 09 | [Thể lực](09-the-luc.md) | 06 | ✅ |
| 10 | [Công cụ 3 cấp và tiệm rèn](10-cong-cu-va-tiem-ren.md) | 07, 09 | ✅ |
| 11 | [Giỏ có sức chứa](11-gio-co-suc-chua.md) | 02 | ✅ |
| 12 | [Thời gian: đóng băng và vắng nhà](12-thoi-gian-dong-bang-vang-nha.md) | 02 | ✅ |
| 13 | [Thông báo 3 mức](13-thong-bao-3-muc.md) | 02 | ✅ |
| 14 | [Việc cần làm và bản đồ nhỏ](14-viec-can-lam-va-ban-do-nho.md) | 06, 13 | ✅ |
| 15 | [Hiệu năng](15-hieu-nang.md) | 05 | ✅ |
| 16 | [Hướng dẫn mới và Sổ tay](16-huong-dan-va-so-tay.md) | 07, 08, 09, 10 | ✅ |
| 17 | [Rà soát giao diện điện thoại 360px](17-ra-soat-dien-thoai-360.md) | 03, 07, 08, 10, 14, 16 | ✅ |
| 18 | [Cập nhật SPEC.md](18-cap-nhat-spec.md) | 02 | ✅ |
| 19 | [Phát hành Phase 0](19-phat-hanh-phase-0.md) | tất cả | 🔶 |

**Làm song song được sau khi 02 xong:** 03, 05, 06, 08, 11, 12, 13, 18.

## Phase 1, chơi online

Nguồn: [PRD 0002](../prd/0002-phase-1-online.md).

| # | Issue | Bị chặn bởi | Trạng thái |
|---|---|---|---|
| 20 | [Server Node một container](20-server-node-mot-container.md) | 19 | ✅ |
| 21 | [Tài khoản và đăng nhập](21-tai-khoan-va-dang-nhap.md) | 20 | ✅ |
| 22 | [Vườn online và một thiết bị](22-vuon-online-va-mot-thiet-bi.md) | 21 | ✅ |
| 23 | [Đồng hồ làng](23-dong-ho-lang.md) | 22 | ✅ |
| 24 | [Server chạy bù vườn offline](24-server-chay-bu-vuon-offline.md) | 22 | ✅ |
| 25 | [Làng real-time](25-lang-real-time.md) | 22 | ✅ |
| 26 | [Bạn bè và cổng vườn](26-ban-be-va-cong-vuon.md) | 25 | ✅ |
| 27 | [Thăm vườn bạn](27-tham-vuon-ban.md) | 24, 25 | ✅ |
| 28 | [Giúp vườn bạn](28-giup-vuon-ban.md) | 27 | ✅ |
| 29 | [Quà và sổ lưu bút](29-qua-va-so-luu-but.md) | 27 | ✅ |
| 30 | [Trộm và giới hạn](30-trom-va-gioi-han.md) | 28 | ✅ |
| 31 | [Chó Mực canh khách](31-cho-muc-canh-khach.md) | 30 | ✅ |
| 32 | [Vắng nhà, thông báo, thành tựu xã hội](32-vang-nha-thong-bao-thanh-tuu-xa-hoi.md) | 29, 31 | ⬜ |
| 33 | [Phát hành Phase 1](33-phat-hanh-phase-1.md) | 20–32 | ⬜ |

**Làm song song được:** sau 22 thì 23, 24, 25; sau 27 thì 28, 29.

## Phase 2, vật nuôi

Nguồn: [PRD 0003](../prd/0003-phase-2-vat-nuoi.md).

| # | Issue | Bị chặn bởi | Trạng thái |
|---|---|---|---|
| 34 | [Bản lưu v3 và vòng đời](34-ban-luu-v3-vong-doi.md) | 33 | ⬜ |
| 35 | [Chuồng 3 cấp và cách ly](35-chuong-3-cap-va-cach-ly.md) | 34 | ⬜ |
| 36 | [Đực/cái và sinh sản](36-duc-cai-va-sinh-san.md) | 35 | ⬜ |
| 37 | [Dơ và tắm](37-do-va-tam.md) | 34 | ⬜ |
| 38 | [Bệnh và Cô Út](38-benh-va-co-ut.md) | 35, 37 | ⬜ |
| 39 | [Độ thân](39-do-than.md) | 34 | ⬜ |
| 40 | [Bán cho Chú Ba](40-ban-cho-chu-ba.md) | 39 | ⬜ |
| 41 | [Thả rông ban ngày](41-tha-rong-ban-ngay.md) | 35 | ⬜ |
| 42 | [Về chuồng và lùa](42-ve-chuong-va-lua.md) | 41 | ⬜ |
| 43 | [Kẻ săn mồi](43-ke-san-moi.md) | 42 | ⬜ |
| 44 | [Mèo](44-meo.md) | 43 | ⬜ |
| 45 | [Vòng đời chó và dạy lệnh](45-cho-vong-doi-va-day-lenh.md) | 42 | ⬜ |
| 46 | [Trộm NPC mới](46-trom-npc-moi.md) | 42, 45 | ⬜ |
| 47 | [Vịt](47-vit.md) | 41 | ⬜ |
| 48 | [Hướng dẫn và thông báo vật nuôi](48-huong-dan-thong-bao-vat-nuoi.md) | 38, 42, 43 | ⬜ |
| 49 | [Phát hành Phase 2](49-phat-hanh-phase-2.md) | 34–48 | ⬜ |

**Làm song song được:** sau 34 thì 35, 37, 39; sau 35 thì 36, 41.

## Phase 3, cây trồng và nước

Nguồn: [PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md).

| # | Issue | Bị chặn bởi | Trạng thái |
|---|---|---|---|
| 50 | [Bản lưu v4 và 16 loại cây](50-ban-luu-v4-16-cay.md) | 49 | ⬜ |
| 51 | [Cấp thành thạo](51-cap-thanh-thao.md) | 50 | ⬜ |
| 52 | [Chất lượng ★](52-chat-luong-sao.md) | 50 | ⬜ |
| 53 | [Trái khổng lồ](53-trai-khong-lo.md) | 51, 52 | ⬜ |
| 54 | [Mùa có tác dụng](54-mua-co-tac-dung.md) | 50 | ⬜ |
| 55 | [Thời tiết xấu](55-thoi-tiet-xau.md) | 54 | ⬜ |
| 56 | [Giếng 4 cấp](56-gieng-4-cap.md) | 50 | ⬜ |
| 57 | [Bồn và mạng nước](57-bon-va-mang-nuoc.md) | 56 | ⬜ |
| 58 | [Tự động hóa theo khối ruộng](58-tu-dong-hoa-khoi-ruong.md) | 57 | ⬜ |
| 59 | [Vòi sen cho chuồng](59-voi-sen-chuong.md) | 57 | ⬜ |
| 60 | [Nhà kính](60-nha-kinh.md) | 54, 55 | ⬜ |
| 61 | [Hố ủ phân](61-ho-u-phan.md) | 52 | ⬜ |
| 62 | [Thông báo và hướng dẫn cây, nước](62-huong-dan-thong-bao-cay-nuoc.md) | 51, 53, 57, 58, 61 | ⬜ |
| 63 | [Phát hành Phase 3](63-phat-hanh-phase-3.md) | 50–62 | ⬜ |

**Làm song song được:** sau 50 thì 51, 52, 54, 56; sau 57 thì 58, 59.