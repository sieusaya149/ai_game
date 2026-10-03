# Đề xuất cân bằng: thời gian thực tế hơn và chống lạm phát xu

Trạng thái: **đề xuất, chưa sửa code.** Mọi số liệu "hiện tại" đọc từ `public/data.js`, `public/state.js`, `DESIGN.md` (ngày 2026-10-03). Số "đề xuất" tính bằng script mô hình (xem §4.1 để biết giả định), cần chơi thử rồi chỉnh.

## 1. Tóm tắt vấn đề

| Hiện tượng | Nguyên nhân trong code |
|---|---|
| Cây chín quá nhanh | `CROPS[].grow` từ 1,5 đến 20 phút. Cải xanh 1,5 phút cho lãi ròng 480 xu mỗi giờ mỗi ô. |
| Chơi offline gần như vô nghĩa | Cây héo sau `grow × 0.5` kể từ lúc chín (`OVERRIPE = 1.5`, `state.js:783`), tức cải héo sau 45 giây, dưa hấu sau 10 phút. Đất khô sau 4 phút (`waterDrainPerMin: 25`), sâu thành bệnh sau 2 phút, bệnh thành chết sau 4 phút. |
| Vật nuôi nhanh | Gà ra trứng mỗi 2,5 phút (336 xu mỗi giờ mỗi con); lớn tới trưởng thành sau 15 phút; trứng nở trong ổ 3 phút; heo mang thai 6 phút. |
| Mua con non rồi bán lấy lời | Gà mua 40 bán 90, vịt mua 55 bán 120, bò mua 300 bán 700 (con nhỡ bán 60%: 420 sau 45 phút). Đây là lỗ hổng lạm phát lớn nhất của vật nuôi. |
| Nâng cấp rẻ | Nâng công cụ 200 xu, ruộng khối 300 xu, chuồng gà cấp 2 300 xu so với thu nhập hàng nghìn xu mỗi giờ. |
| Chợ không chặn bán xả | ADR 0009 nói giá rớt khi bán vượt "sức mua" nhưng **chưa có trong code** (`grep` không thấy). |

Lưu ý: yêu cầu nói cửa sổ chín hiện là `max(0.5×grow, 10 phút)`, nhưng code hiện chỉ có `0.5×grow` (không có sàn 10 phút). Cải 1,5 phút nghĩa là 45 giây để kịp hái.

## 2. Cách thời gian chạy (đã xác minh)

| Mục | Giá trị hiện tại | Ghi chú |
|---|---|---|
| Ngày game (`DAY_MS`) | **20 phút thật** | Chợ mở 6h-18h game = **10 phút thật mở, 10 phút đóng** mỗi ngày game. |
| Mùa | 7 ngày game = **140 phút thật**; một năm 4 mùa = 560 phút | `seasonOf`, `state.js:~515`. |
| Chạy bù offline (`MAX_CATCHUP_MS`) | tối đa **8 giờ** thật; phần dư đóng băng (ADR 0003) | Server chạy bù cho chủ offline bằng chính `loadGame` (`server/farms.mjs`). |
| Online | khóa tốc độ x1 | Offline không bao giờ gây chết vật nuôi (ADR 0004). |
| Cây | `progress` là **tỉ lệ 0..1** (không phải ms), tăng `dt/grow` | Đổi `grow` thì cây đang trồng tự co giãn, không cần di trú. |
| Vật nuôi | `age` tính bằng ms giờ vườn; giai đoạn = `stageAt(age)` | Đổi `LIFE` làm con non có thể **tụt giai đoạn** (xem §6.7). |
| EXP | `expNeed(L) = floor(25 × L^1.5)`; tích lũy: lên cấp 5 = 425, cấp 10 = 2.770, cấp 15 = 8.200 | |
| Số ô | 9 ô/khối, khối thứ n mở ở cấp 1/4/8/12/16/20: cấp 5 = 18 ô, cấp 10 = 27 ô, cấp 15 = 36 ô | `FIELD_LIMITS`. |
| Một vụ | Không có mọc lại (không `regrow`): hái xong phải gieo lại. Mỗi lần hái nhận `exp` một lần (không nhân sản lượng). | `state.js:3040`. |

## 3. Số liệu HIỆN TẠI

### 3.1 Cây trồng (1 ô, thời gian thật)

Lãi ròng = sản lượng × giá bán - giá hạt. Xu/giờ = lãi ròng ÷ giờ lớn. Giả định hái và gieo lại đúng lúc, giá chợ 100%, ★1, không phân bón.

| Cây | Cấp | Lớn | Hạt | SL | Giá | EXP | Lãi ròng | Xu/giờ | EXP/giờ | Cửa sổ trước héo |
|---|---|---|---|---|---|---|---|---|---|---|
| Cải xanh | 1 | 1,5 p | 8 | 4 | 5 | 2 | 12 | 480 | 80 | 0,75 p |
| Cà rốt | 1 | 3 p | 15 | 4 | 9 | 4 | 21 | 420 | 80 | 1,5 p |
| Hành lá | 2 | 2 p | 10 | 4 | 7 | 3 | 18 | 540 | 90 | 1 p |
| Lúa | 2 | 5 p | 20 | 5 | 10 | 6 | 30 | 360 | 72 | 2,5 p |
| Rau muống | 3 | 2,5 p | 12 | 5 | 6 | 3 | 18 | 432 | 72 | 1,25 p |
| Cà chua | 3 | 8 p | 35 | 5 | 18 | 10 | 55 | 413 | 75 | 4 p |
| Su hào | 4 | 6 p | 30 | 4 | 18 | 8 | 42 | 420 | 80 | 3 p |
| Bắp | 4 | 10 p | 50 | 6 | 22 | 14 | 82 | 492 | 84 | 5 p |
| Dưa leo | 5 | 7 p | 40 | 6 | 16 | 10 | 56 | 480 | 86 | 3,5 p |
| Dâu tây | 6 | 12 p | 80 | 6 | 35 | 20 | 130 | 650 | 100 | 6 p |
| Khoai lang | 6 | 9 p | 45 | 5 | 22 | 12 | 65 | 433 | 80 | 4,5 p |
| Ớt | 7 | 10 p | 60 | 8 | 18 | 14 | 84 | 504 | 84 | 5 p |
| Bí ngô | 8 | 15 p | 120 | 5 | 60 | 28 | 180 | 720 | 112 | 7,5 p |
| Đậu phộng | 9 | 13 p | 100 | 6 | 38 | 22 | 128 | 591 | 102 | 6,5 p |
| Dưa hấu | 10 | 20 p | 180 | 6 | 80 | 40 | 300 | 900 | 120 | 10 p |
| Bắp cải | 12 | 18 p | 150 | 4 | 95 | 34 | 230 | 767 | 113 | 9 p |

Nhận xét: xu/giờ gần như phẳng (360-900), nên chỉ cần chọn cây ngắn nhất là đủ; EXP/giờ 72-120.

### 3.2 Vật nuôi

| Loài | Cấp | Giá mua | Non | Nhỡ | Trưởng thành | Già | Sản phẩm / chu kỳ | Giá sản phẩm | Giá bán trưởng thành | Xu/giờ sản phẩm |
|---|---|---|---|---|---|---|---|---|---|---|
| Gà | 1 | 40 | 5 p | 10 p | 20 giờ | 4 giờ | trứng / 2,5 p | 14 | 90 | 336 |
| Vịt | 2 | 55 | 5 p | 10 p | 20 giờ | 4 giờ | trứng vịt / 3 p | 18 | 120 | 360 |
| Heo | 3 | 120 | 10 p | 20 p | 30 giờ | 6 giờ | không (bán theo cân) | 4-7 xu/kg × tới 100 kg | 380 | |
| Bò | 5 | 300 | 15 p | 30 p | 45 giờ | 8 giờ | sữa / 4 p | 40 (ngon 60) | 700 | 600 |
| Cừu | 7 | 400 | 15 p | 30 p | 45 giờ | 8 giờ | lông / 6 p | 60 (xoăn 90) | 800 | 600 |
| Mèo | 4 | 180 | 20 p | 40 p | 40 giờ | không già | không | | không bán | |

Các hằng số khác của vật nuôi (`HUSBANDRY`, `BREED`, `SICK`):

| Hằng số | Hiện tại |
|---|---|
| Đói từ 100 xuống 0 (`hungerMs`) | **5 phút**; tự ăn khi dưới 60, tức **mỗi 2 phút một phần ăn** |
| Máng chứa / 1 bao | 20 phần / 5 phần; cám gà 6 xu (1,2 xu/phần = 36 xu/giờ mỗi con) |
| Đói lả thành bệnh (`sickAfterStarving`) | 3 phút |
| Trứng bỏ quên tự nở | sau 10 phút, 20% nếu có phôi |
| Ổ ấp (`nestHatchMs`) | 3 phút |
| Heo mang thai: xác suất / phút; thời gian mang | 25% mỗi phút; 6 phút; đẻ 1-3 con, **không giới hạn số lứa** (nái nghỉ 6 phút) |
| Bò, cừu mang thai | 10 giờ, 8 giờ (đã theo giờ thật, khá hợp lý) |
| Bệnh | Mệt → Bệnh nặng 60 p → Nguy kịch 90 p → mất 105 p (giờ vườn); thuốc 40, vắc-xin 60 (10 giờ) |
| Số trứng nằm ngoài tối đa | 30 cho cả trại (`s.eggs.length < 30`); sữa, lông chỉ chứa 1 (cờ `ready`) |

### 3.3 Các hằng số cây trồng ảnh hưởng thời gian

| Hằng số | Hiện tại | Nghĩa thực tế |
|---|---|---|
| `waterDrainPerMin` | 25%/phút | đất khô sau 4 phút; cây chỉ lớn khi còn nước |
| `weedChancePerMin` | 6%/phút | cỏ gần như chắc chắn mọc trong 1 vụ dài |
| `bugChancePerMin` | 7%/phút | chừng 14 phút có một đợt sâu |
| `bugToSick` / `sickToDead` | 2 p / 4 p | không ai vắng mặt được 6 phút |
| `STARS.bugMs` | 30 giây | điều kiện ★ ("chăm kỹ") |
| `growthBoost` | +50% tổng thời gian lớn, tối đa 2 lần/cây, thuốc 30 xu | với cây dài là tiết kiệm hàng giờ chỉ với 30 xu |
| `OVERRIPE` | 1,5 | héo khi `progress` ≥ 1,5 |

## 4. Số liệu ĐỀ XUẤT

### 4.1 Nguyên tắc

1. **Tầng thời gian**: 10 p, 15 p, 20 p, 30 p, 45 p, 1 giờ, 1,5 giờ, 2 giờ, 4 giờ, 5 giờ, 6 giờ, 8 giờ, 10 giờ, 12 giờ, 16 giờ, 24 giờ. Cây ngắn dành cho người đang chơi; cây dài dành cho đi ngủ (khoảng 6 giờ), đi làm (8-12 giờ), qua ngày.
2. **Xu/giờ mỗi ô** đặt 44-54 ở cây ngắn (cần canh tay) và 35-42 ở cây dài, nhưng thực tế người chơi chỉ canh được khoảng 25-50% thời gian với cây 10-30 phút, nên tỉ suất hiệu dụng của cây dài cao hơn. Tức là: **cây dài trả cao mỗi vụ (hàng trăm xu), không trả cao mỗi giờ.**
3. **Lãi mỗi vụ tăng theo cấp** (9 xu → 1.000 xu), nên mở khóa cây mới luôn là bước nhảy rõ rệt, nhưng không cây nào áp đảo.
4. EXP = 15% lãi ròng mỗi vụ (tối thiểu 2). EXP/giờ ≈ 6-12, chậm hơn khoảng 10 lần so với hiện nay, nhưng vì mỗi giờ thật làm được ít hơn nên tốc độ lên cấp tính theo ngày chơi vẫn dễ chịu (xem §5.3).
5. Hạt ≈ 25-30% doanh thu để hạt là một khoản chi thật. Giữ nguyên `yield`, `season`, `lv` của từng cây.

### 4.2 Cây trồng

| Cây | Cấp | Lớn | Hạt | SL | Giá | EXP | Lãi ròng/vụ | Xu/giờ | EXP/giờ | Nhóm thành thạo |
|---|---|---|---|---|---|---|---|---|---|---|
| Cải xanh | 1 | **10 p** | 3 | 4 | 3 | 2 | 9 | 54 | 12 | ngắn |
| Cà rốt | 1 | **15 p** | 4 | 4 | 4 | 2 | 12 | 48 | 8 | ngắn |
| Hành lá | 2 | **20 p** | 5 | 4 | 5 | 2 | 15 | 45 | 6 | ngắn |
| Lúa | 2 | **30 p** | 8 | 5 | 6 | 3 | 22 | 44 | 6 | ngắn |
| Rau muống | 3 | **45 p** | 9 | 5 | 9 | 5 | 36 | 48 | 7 | trung bình |
| Cà chua | 3 | **1 giờ** | 12 | 5 | 11 | 6 | 43 | 43 | 6 | trung bình |
| Su hào | 4 | **1,5 giờ** | 18 | 4 | 21 | 10 | 66 | 44 | 7 | trung bình |
| Bắp | 4 | **2 giờ** | 26 | 6 | 20 | 14 | 94 | 47 | 7 | trung bình |
| Dưa leo | 5 | **4 giờ** | 55 | 6 | 34 | 22 | 149 | 37 | 5,5 | trung bình |
| Dâu tây | 6 | **5 giờ** | 75 | 6 | 44 | 28 | 189 | 38 | 5,6 | dài |
| Khoai lang | 6 | **6 giờ** | 90 | 5 | 60 | 32 | 210 | 35 | 5,3 | dài |
| Ớt | 7 | **8 giờ** | 115 | 8 | 52 | 45 | 301 | 38 | 5,6 | dài |
| Bí ngô | 8 | **10 giờ** | 170 | 5 | 110 | 57 | 380 | 38 | 5,7 | dài |
| Đậu phộng | 9 | **12 giờ** | 210 | 6 | 110 | 68 | 450 | 38 | 5,7 | dài |
| Dưa hấu | 10 | **16 giờ** | 300 | 6 | 150 | 90 | 600 | 38 | 5,6 | dài |
| Bắp cải | 12 | **24 giờ** | 480 | 4 | 370 | 150 | 1.000 | 42 | 6,3 | dài |

Đối chiếu Hay Day (**từ trí nhớ, chưa kiểm tra lại**): lúa mì 2 phút, bắp 5 phút, cà rốt 10 phút, đậu nành 20 phút, mía 30 phút, chàm 2 giờ, bí ngô 3 giờ, bông khoảng 8 giờ (không héo). Đề xuất của ta dịch chuyển lên chút so với Hay Day cho cây đầu (10 phút thay vì 2) đúng như chủ game muốn, và giữ cây dài trong khoảng 4-24 giờ.

Phân bố tầng theo nhu cầu người chơi:

| Mục đích | Cây | Thời gian lớn |
|---|---|---|
| Đang chơi, canh liên tục | cải, cà rốt, hành, lúa | 10-30 phút |
| Quay lại sau 1-2 giờ | rau muống, cà chua, su hào, bắp | 45 phút - 2 giờ |
| Qua một buổi (4-6 giờ) | dưa leo, dâu, khoai lang | 4-6 giờ |
| Qua đêm, ca làm việc | ớt, bí ngô, đậu phộng | 8-12 giờ |
| Một ngày trở lên | dưa hấu, bắp cải | 16-24 giờ |

Các hằng số đi kèm (đề xuất):

| Hằng số | Hiện tại | Đề xuất | Lý do |
|---|---|---|---|
| `waterDrainPerMin` | 25 | **1,0** (khô sau ~100 phút) | cây dài không thể phụ thuộc tưới mỗi 4 phút. Cây vẫn dừng lớn khi khô. Giếng, tưới nhỏ giọt, mưa càng có giá trị. |
| `weedChancePerMin` | 0,06 | **0,004** | ~1 đợt cỏ mỗi 4 giờ |
| `bugChancePerMin` | 0,07 | **0,005** | ~1 đợt sâu mỗi 3 giờ |
| `bugToSick` / `sickToDead` | 2 p / 4 p | **45 p / 90 p** | thời gian xử lý quy đổi tương đương ngày chơi mới |
| `STARS.bugMs` | 30 giây | **10 phút** | để ★ còn đạt được |
| `OVERRIPE` | 1,5 hằng số | **theo cây:** `1 + max(1, 180 / grow_phút)` | cửa sổ trước héo = `max(grow, 3 giờ)`. Cải 10 phút để được 3 giờ, ớt 8 giờ để được 8 giờ. Tính bằng thời gian 3 giờ nên người chơi ngủ một giấc sớm không mất cây. |
| `growthBoost` | +50% tổng, 2 lần | **+50% nhưng tối đa 90 phút mỗi lần**; thuốc 30 xu → **120 xu** | tránh bơm xu mua rút 8 giờ thành 5 giờ |
| Phân bón | 12 xu, +50% SL | **40 xu** | +50% SL cho cây 1.000 xu đáng giá hơn nhiều so với cây 9 xu |
| Thuốc trừ sâu | 15 | **20** | |

## 5. Vật nuôi đề xuất

### 5.1 Bảng chính

| Loài | Giá mua | Non | Nhỡ | Trưởng thành | Già | Chu kỳ sản phẩm | Giá sản phẩm | Xu/giờ | Giá bán trưởng thành |
|---|---|---|---|---|---|---|---|---|---|
| Gà | 40 → **80** | 5 p → **30 p** | 10 p → **1 giờ** | 20 giờ (giữ) | 4 giờ | 2,5 p → **30 p** | 14 → **16** | 32 | 90 → **110** |
| Vịt | 55 → **110** | 30 p | 1 giờ | 20 giờ | 4 giờ | 3 p → **40 p** | 18 → **22** | 33 | 120 → **150** |
| Heo | 120 → **300** | 10 p → **2 giờ** | 20 p → **6 giờ** | 30 giờ | 6 giờ | không | giá kg 4-7 (giữ) | | 380 → theo cân (~500) |
| Bò | 300 → **900** | 15 p → **4 giờ** | 30 p → **8 giờ** | 45 giờ → **120 giờ** | 8 giờ | 4 p → **90 p** | 40 → **70** (ngon 105) | 47 | 700 → **1.100** |
| Cừu | 400 → **1.100** | 15 p → **3 giờ** | 30 p → **6 giờ** | 45 giờ → **120 giờ** | 8 giờ | 6 p → **3 giờ** | 60 → **150** (xoăn 225) | 50 | 800 → **1.300** |
| Mèo, chó | giữ | giữ | giữ | giữ | giữ | | | | |

Giải thích chọn số:
- Xu/giờ vật nuôi 32-50 ngang một ô ruộng, vì một con chiếm ít chỗ hơn (gà 1/6 chuồng) nhưng cần thức ăn, tắm, thú y.
- Thời gian trưởng thành ở mức 1,5 giờ (gà) tới 12 giờ (bò): người chơi chờ được trong cùng một nhịp với cây. Tuổi trưởng thành của bò, cừu kéo dài 45 → 120 giờ để tổng thu hồi vẫn 5-10 lần vốn (bò 120 giờ × 47 = 5.640 so với vốn 900).
- **Giá bán ≥ giá mua nhưng con nhỡ chỉ bán 60%** (`TRADE.stageMul`), nên hết lỗ hổng mua con non bán lấy lời. Mức bán heo theo cân nhắm lãi ~200 xu sau 8 giờ nuôi.
- Gà vịt trên cùng chuồng cạnh tranh trứng: số trứng ngoài trời tối đa 30 cho cả trại là giới hạn rất chặt với offline (6 gà × 2 trứng/giờ = 12 trứng/giờ, đầy sau 2,5 giờ). Đề xuất nâng trần lên **60 hoặc theo sức chứa chuồng × 10**, hoặc để trứng chồng trong ổ.

### 5.2 Ăn uống, sinh sản, ấp trứng

| Hằng số | Hiện tại | Đề xuất | Ghi chú |
|---|---|---|---|
| `hungerMs` | 5 p | **3 giờ** (tự ăn khi <60 → mỗi ~72 phút) | |
| Giá cám gà / bao 5 phần | 6 | **20** (4 xu/phần, ~3,3 xu/giờ mỗi con, ~8% giá trị trứng) | cám là khoản chi thật |
| Cám heo / cỏ khô | 10 / 8 | **40 / 35** | |
| `troughMax` | 20 phần | **40** | 6 gà ăn 40 phần trong ~8 giờ, vừa đủ qua đêm |
| `sickAfterStarving` | 3 p | **90 p** | |
| `sickChancePerMin` | 0,004 | giữ (0,004/phút = 1 lần mỗi 4 giờ) hoặc 0,0015 | cần chơi thử |
| `SICK` (toSevere, deadAt...) | 60/90/105 p | giữ | đã ở thang giờ, chỉ cần xem lại thuốc 40 xu |
| `eggForgetMs` | 10 p | **3 giờ** (xác suất nở 20% → 10%) | |
| `nestHatchMs` | 3 p | **2 giờ** | trứng có phôi, gà con tự lớn tiếp từ đầu |
| `pigBreedChancePerMin` | 0,25 | **0,01** (~1,7 giờ chờ ghép đôi) | |
| `pigGestation` | 6 p | **12 giờ**; nái nghỉ sau lứa cũng 12 giờ | giữ 1-3 con/lứa; nếu chưa đủ thì giảm xuống [1,2] vì heo là nguồn lạm phát |
| `BREED.gestation` bò, cừu | 10 giờ, 8 giờ | giữ | đã hợp lý |
| Thuốc thú y / vắc-xin / vitamin | 40 / 60 / 35 | **60 / 90 / 120** | vitamin cho vọt nửa giai đoạn: giờ tiết kiệm 2-4 giờ |
| `AGING.warnMs` | 1 giờ | giữ | |

Đối chiếu Hay Day (**từ trí nhớ, chưa kiểm tra lại**): gà trứng 20 phút, bò sữa 1 giờ, heo thịt 4 giờ, cừu len 6 giờ, dê 8 giờ. Đề xuất gần đó nhưng chậm hơn chút cho gà (30 p) và bò (90 p) để cân với chi phí cám.

## 6. Chống lạm phát

### 6.1 Chỗ tiêu xu (sink): bảng so sánh

Đề xuất chung: giá công trình, nâng cấp **tăng 2,5-4 lần**, tăng mạnh hơn ở cấp cao; đồ trang trí giữ nguyên.

| Hạng mục | Hiện tại | Đề xuất |
|---|---|---|
| **Công cụ** nâng cấp 2 / 3 (`TOOLS.price`) | cuốc 200/800, bình 200/800, liềm 250/900, giỏ 150/600 | cuốc **600/2.800**, bình **600/2.800**, liềm **700/3.200**, giỏ **400/2.000** |
| **Giếng** cấp 2/3/4 | 600 / 2.000 / 5.000 | **1.800 / 6.000 / 15.000** |
| **Khối ruộng** thứ 2..8 (`FIELD_PRICES`) | 300, 600, 1.000, 1.500, 2.200, 3.000, 4.000 | **1.000, 2.500, 5.000, 9.000, 15.000, 24.000, 36.000** |
| Mua ô lẻ `expandCost(n)` | 60 × 1,2^(n-9) | 120 × 1,25^(n-9) |
| **Dải đất** thứ 1..8 (`LAND_STRIPS`) | 500, 800, 1.200, 1.700, 2.400, 3.300, 4.500, 6.000 | **1.200, 2.000, 3.200, 5.000, 8.000, 12.000, 18.000, 26.000**; từ dải 9 trở đi ×2,5 |
| **Xây chuồng** (`PEN_PRICES`) | gà 200, heo 600, đồng cỏ 1.500, cách ly 400 | **400, 1.500, 4.500, 1.000** |
| Chuồng gà nâng 2/3 | 300 / 800 | **900 / 2.500** |
| Chuồng heo nâng 2/3 | 800 / 2.000 | **2.500 / 7.000** |
| Đồng cỏ nâng 2/3 | 2.000 / 4.500 | **7.000 / 16.000** |
| Cách ly nâng 2/3 | 500 / 1.200 | **1.200 / 3.000** |
| Nhà chó nâng 2/3 | 150 / 400 | **300 / 900** |
| Nhà mèo xây; nâng 2/3 | 350; 250 / 600 | **700; 600 / 1.500** |
| Hố ủ phân (`BUILD_PRICES.compost`) | 250 | **500** |
| Công trình nước: bồn chính / bồn phụ / trạm bơm phụ | 1.500 / 800 / 1.200 | **4.000 / 2.000 / 3.000** |
| Nâng cấp khối ruộng (`AUTO`): nhỏ giọt / phun / đất mỡ | 800 / 1.200 / 1.500 | **3.000 / 4.500 / 5.500** |
| Nhà kính (`GLASS`): xây / sưởi mỗi ngày game / sửa | 12.000 / 60 / 800 | **30.000 / 150 / 2.000** |
| Tiền điện (`AUTO.price`, xu mỗi số điện) | 50 | giữ 50 (đã là chi phí định kỳ) |
| Rơm, xà phòng, vitamin | 5, 10, 35 | 8, 15, 120 |

Mục tiêu: mỗi hạng mục cấp trung (khối ruộng thứ 4, chuồng đồng cỏ, giếng bơm) bằng **vài ngày** thu nhập của người chơi ở cấp mở khóa nó, thay vì vài giờ.

### 6.2 Các van khác

| Van | Hiện tại | Đề xuất |
|---|---|---|
| Thưởng đơn hàng (`ORDERS.rewardMul`) | 1,6 × giá bán | **1,25** (trên chợ 1,0, thùng giao 0,8) |
| Tần suất đơn mới (`newEvery`) | 3 p | **15 p** (tối đa 3 đơn chờ, giữ) |
| Đơn hàng chọn cây | mọi cây đã mở | chỉ cây có `grow` ≤ 4 giờ; thêm hạn giao đơn (ví dụ 24 giờ thật) |
| EXP đơn hàng | `round(exp × 1,6 / 2)` | giữ công thức; vì EXP cây giảm nên EXP đơn giảm theo |
| Đơn trái khổng lồ | ×1,5 giá bán | giữ (hiếm) |
| Sức mua chợ (chưa có) | không | **thêm theo ADR 0009**: mỗi người, mỗi loại hàng, bán vượt 40 món/ngày game thì giá rớt dần 5% mỗi 10 món, thấp nhất 50%, hồi lại mỗi ngày |
| Giá bán chặn trên | không | giá bán một món tối đa = 1,5 × giá chuẩn (cho sao ★3 + khổng lồ), hiện ★3 ×2 và khổng lồ ×3 ×2 = ×6 |
| Heo theo cân | 4-7 xu/kg | giữ; dùng hạn nái nghỉ 12 giờ để chặn nhân bản |

### 6.3 Ước tính thu nhập mỗi ngày (giả định)

Mô hình: **3 buổi chơi mỗi ngày, mỗi buổi 20 phút** (sáng, trưa, tối); khoảng cách giữa các buổi 6 giờ, 6 giờ, 12 giờ; cả ruộng được gieo lại đúng loại tối ưu. Trong buổi chơi: gieo cây ngắn (mỗi chu kỳ tối thiểu 2 phút ở số hiện tại, 3 phút ở đề xuất). Cuối buổi: gieo cây dài vừa khít khoảng nghỉ (cây hiện tại héo ngay nên không có). Đây là chơi hoàn hảo; chơi thật khoảng 50-60%.

| Cấp (số ô) | Cây hiện tại (xu/ngày) | Cây đề xuất (xu/ngày) | EXP hiện tại | EXP đề xuất |
|---|---|---|---|---|
| 5 (18 ô) | 9.700 | 6.300 | 1.620 | 1.010 |
| 10 (27 ô) | 24.300 | 24.900 | 3.240 | 3.890 |
| 15 (36 ô) | 32.400 | 33.300 | 4.320 | 5.180 |

Chia ra phần chủ động và phần offline (đề xuất): cấp 10 chỉ ~1.400 xu/ngày đến từ cây ngắn trong 60 phút chơi (hiện tại ~24.000 chỉ từ 60 phút đó); khoảng 94% đến từ cây dài thu khi quay lại. Nghĩa là **xu theo giờ chủ động giảm 15 lần, nhưng người vắng nhà không bị phạt.**

Cộng thêm (ước tính):

| Nguồn | Cấp 5 hiện / đề xuất | Cấp 10 | Cấp 15 |
|---|---|---|---|
| Trứng (6 gà, trần 30 trứng, 6 lần ghé/ngày) | 2.500 / 2.900 | 2.500 / 2.900 | 2.500 / 2.900 |
| Sữa, lông (3 bò, 3 cừu, mỗi con 1 lần mỗi lần ghé) | 0 | 720 / 1.260 (bò) | 1.800 / 3.960 (bò + cừu) |
| Phần thưởng thêm của đơn hàng (giả định 25% sản lượng đưa vào đơn) | +15% / +6% cây | +15% / +6% | +15% / +6% |
| **Tổng, chơi hoàn hảo** | ~12.500 / ~9.700 | ~28.300 / ~29.700 | ~38.500 / ~42.000 |

Chi tiêu tương ứng (đề xuất), ví dụ mốc: xây khối ruộng thứ 4 (9.000) + chuồng đồng cỏ (4.500) + nâng bình tưới (2.800) mất khoảng **1 ngày** ở cấp 8-10, thay vì vài giờ. Thu nhập tuyệt đối ở cấp cao **không giảm** (vì cây dài trả hậu), phần giảm lạm phát đến từ **sink ×3-4, đơn hàng ×1,25, hết lỗ hổng mua bán con non, và trần bán hàng**.

## 7. Tương tác cần lưu ý

### 7.1 Chín, héo, chết

- Cửa sổ chín hiện `0.5×grow` (không phải `max(0.5×grow, 10 p)`). Đề xuất `max(grow, 3 giờ)`: `OVERRIPE` thành hàm theo cây, sửa ở `state.js:781-783` và mọi chỗ khác đọc `OVERRIPE` (`grep OVERRIPE`).
- Cây chín nằm ngoài lâu hơn nên **trộm, quạ** (`robbable`, `RAID.ripeNeed`, `GUEST.dayPct` 30% giá trị chín mỗi ngày) có nhiều thời gian lấy hơn. Cần xem lại tần suất quạ, trộm theo giờ để không áp lên người vắng nhà quá nặng.
- `server/friends.mjs:30` coi `rotten`, `dead` là cây không hiển thị, cần giữ cùng ngưỡng.
- Cây bệnh, chết trong lúc chạy bù: ADR 0004 chỉ bảo vật nuôi không chết. Với cây, cần thêm: **chạy bù không chuyển bệnh thành chết** (đặt trần như `SICK.catchUpCap`), nếu không đi ngủ 8 giờ là chết sạch cây dài dù `sickToDead` 90 phút.

### 7.2 Mùa (mâu thuẫn lớn nhất)

- Một mùa chỉ **140 phút thật**. Cây dài hơn 2,3 giờ luôn trải qua ít nhất một mùa trái vụ: `crop.offSeason` được đặt khi bất kỳ tick nào chậm (`state.js:793`), nên **cây ≥ 3 giờ gần như không bao giờ ra ★3** và chậm 0,6× phần lớn thời gian (chỉ từ cấp 5).
- Hai hướng sửa (chọn một): (a) tăng `DAY_MS` lên 60 phút (mùa 7 giờ, năm 28 giờ), hoặc (b) giữ `DAY_MS` nhưng chốt mùa **lúc gieo** (`offSeason` quyết định theo mùa lúc gieo, chậm theo mùa lúc gieo). Khuyến nghị (b) vì tránh chạm lịch làng, thời tiết, hóa đơn, hố ủ phân. Nếu chọn (a) thì phải đổi chợ mở theo giờ thật (30 phút mở / 30 đóng) và hố ủ phân (`2 × DAY_MS` = 2 giờ).
- Thời tiết (hạn, bão mỗi mùa/ngày game 20 phút): ngày nắng đất khô ×1,5, hạn hán ×3; với `waterDrainPerMin` mới (1%/phút) hạn hán thành 3%/phút = khô sau 33 phút, vẫn là mối đe dọa đáng kể nhưng không chết ngay. Sương muối giữ cây hạt/mầm đứng yên một ngày game (20 phút), không đáng kể với cây 4+ giờ.
- Phủ rơm (`mulchDry` 0,5), nhà kính (bỏ qua mùa, vẫn có ý nghĩa) cần giữ giá phù hợp (§6.1).

### 7.3 Thành thạo (mastery) và sao

- Nhóm: đặt lại theo thời gian (ngắn ≤ 30 p, trung bình 45 p-4 giờ, dài ≥ 5 giờ). Ngưỡng 20/60, 12/35, 8/25 lần hái: với cây 10-30 phút vẫn nhanh (60 lần hái 18 ô = 4 vòng); cây dài 25 lần hái (cần 2 vòng 18 ô) quá dễ vì mỗi ô tính một lần. Cân nhắc ngưỡng theo vụ thay vì theo ô, hoặc nâng ngưỡng nhóm dài lên 12/40.
- `MASTERY.exp` (40, 100) là hằng số: giữ, nhưng lên cấp 2 nhanh hơn so với EXP cây mới. Xem lại cùng `expNeed`.
- Sao ★2 cần bón phân, ★3 cần thêm chăm tay: tăng giá phân (§4.2) tăng chi phí ★; sửa `STARS.bugMs` (§4.2) để còn đạt được.
- Trái khổng lồ (`GIANT.priceMul` 3, `expMul` 5): với cây 16-24 giờ, một trái khổng lồ ★3 bán 150 × 3 × 2 = 900 xu, EXP ×5. Cần trần giá (§6.2).

### 7.4 Kiểm tra bản lưu phía server (`checkSaveJump`, `state.js:485`)

- `sim ≤ dt × tốc độ + simSlack` (đặt cho online x1): không ảnh hưởng.
- Giới hạn xu: `3.000 + 150 × (ô + 10) × phút_chạy`. Một đợt chạy bù 8 giờ cho 27 ô: 150 × 37 × 480 = 2,7 triệu xu; thu nhập đề xuất tối đa vài chục nghìn mỗi ngày nên **lỏng gấp trăm lần**, không cần sửa để game chạy, nhưng nên **siết `wealthPerPlotMin` 150 → 10 và `expPerPlotMin` 30 → 2** sau khi đo (nếu không thì giới hạn chống gian lận mất tác dụng). Khi siết, một lần hái cây 24 giờ ở 36 ô tăng 36.000 xu trong một lần lưu; phần `goneCropsValue` đã tính giá trị cây vừa biến mất nên có thể vẫn qua, cần test.
- `wealthOf` tính giá trị đồ trong kho theo `sellPrice`: đổi giá bán lại thì mọi so sánh trước/sau vẫn nhất quán trong cùng một bản server.

### 7.5 Danh sách test, fixture cần cập nhật

Các file dùng hằng số thời gian, phút, `grow`, `LIFE`, `HUSBANDRY`, `SICK`, `DAY_MS`... (con số cho biết số dòng khớp, thô). Hầu hết import hằng số từ `data.js` nên tự theo; những dòng viết thẳng số phút (`n * MIN`, `tick(s, 60_000)`) sẽ vỡ:

| Nhóm | File |
|---|---|
| Nhiều nhất (cần rà từng dòng) | `tests/tank.test.mjs`, `tests/sick.test.mjs`, `tests/season.test.mjs`, `tests/auto.test.mjs`, `tests/help.test.mjs`, `tests/stars.test.mjs` |
| Vừa | `tests/life.test.mjs`, `tests/state.test.mjs`, `tests/free.test.mjs`, `tests/duck.test.mjs`, `tests/breed.test.mjs`, `tests/shower.test.mjs`, `tests/weather.test.mjs`, `tests/tools.test.mjs`, `tests/greenhouse.test.mjs`, `tests/save-v4.test.mjs`, `tests/cat.test.mjs`, `tests/social.test.mjs`, `tests/server-catchup.test.mjs`, `tests/herd.test.mjs`, `tests/crops16.test.mjs` |
| Ít | `tests/village-clock`, `server-help`, `server-stable`, `dogtrick`, `compost`, `stamina`, `server-auto`, `predator`, `thief`, `dirty`, `shipbin`, `todo`, `mastery`, `giant`, `steal`, `land`, `pens`, `place`, `well`, `trade`, `bond`, `visit`, `basket` (`.test.mjs`) |
| e2e | `e2e/auto.spec.mjs`, `dirty`, `duck`, `notify`, `online`, `help`, `weather`, `mobile360`, `smoke-online` (đều có dòng phút/giờ); `crops16.spec.mjs`, `breed`, `bond`, `cat`, `dog`, `dogtrick` |
| Fixture | `tests/fixtures/v1-*.json`, `v2-*.json`, `v3-*.json` (cây đang trồng với `progress` tỉ lệ, vật nuôi với `age`) và `make-v1/2/3.mjs` |

Cách làm đỡ đau (theo TDD đã chốt): trước khi đổi số, thay các số cứng bằng `CROPS.x.grow`, `LIFE.ga.non`, `HUSBANDRY.*` trong test (một issue riêng, test vẫn xanh), sau đó đổi `data.js` và chỉ phải sửa test thật sự mô tả hành vi.

### 7.6 Phá vỡ bản lưu đang chơi (di trú)

- **Cây đang trồng**: `progress` là tỉ lệ nên tự co giãn. Cây đã `progress ≥ 1` và đang tính héo: ngưỡng héo đổi từ 1,5 thành `1 + max(1, 180/grow)` (cải: 19) làm cây hiện tại được gia hạn, an toàn. Cây `rotten` hay `dead` giữ nguyên.
- **Vật nuôi**: giai đoạn suy từ `age`. Gà con tuổi 6 phút (đang "nhỡ" theo số cũ) với `LIFE.ga.non` 30 phút sẽ **tụt về "non"**; bò 40 phút tuổi (đang "trưởng thành" theo số cũ) thành "non", mất sản phẩm. Di trú bản lưu: `a.age = max(a.age, stageStart(a.type, a.stage))` để không tụt giai đoạn; con đang non/nhỡ giữ giai đoạn đó, thời gian còn lại dài ra.
- `a.nextProduct`, `a.dueAt`, `s.nextOrderAt`, `e.check` là mốc tuyệt đối; con nào hết hạn trước khi đổi sẽ cho sản phẩm ngay một lần, không sao.
- Bản lưu đang có nhiều hạt, đồ giá cũ: giữ nguyên; giá bán đổi ngay theo bảng mới (kho đồ cũ có thể mất giá 0 vì cây dài giá cao hơn thì lại tăng giá). Nên **phát một lần quà bồi thường** hoặc thông báo trong nhật ký lúc nâng phiên bản.
- Nâng `SAVE_VERSION` (có `tests/save-v4.test.mjs`): thêm bước di trú trong `loadGame`, thêm fixture v5 mẫu.

## 8. Thứ tự làm đề xuất (nếu chủ game duyệt)

1. Issue A (không đổi hành vi): thay số cứng trong test bằng hằng số (§7.5).
2. Issue B: cây trồng (§4.2 bảng và hằng số `OVERRIPE`, tưới, cỏ, sâu, `bugMs`, di trú cây), cộng chốt mùa lúc gieo.
3. Issue C: vật nuôi (§5, di trú `age`, trần trứng).
4. Issue D: sink + đơn hàng + sức mua chợ + trần giá (§6).
5. Issue E: siết `checkSaveJump` và smoke online sau khi deploy.

Mỗi issue phải chạy e2e liên quan (không chạy toàn bộ) và smoke online sau deploy theo luật repo.

## 9. Câu hỏi mở cho chủ game

1. Cây ngắn nhất 10 phút: chốt luôn hay xuống 5 phút cho cấp 1 để người mới không chờ lâu (Hay Day: lúa mì 2 phút)?
2. Chốt mùa lúc gieo (khuyến nghị) hay tăng `DAY_MS` lên 60 phút? Nếu tăng thì chợ đóng cửa nửa mỗi giờ có chịu được không, hay mở rộng giờ chợ?
3. Cửa sổ trước héo: `max(grow, 3 giờ)` có hợp không, hay muốn cây không héo chút nào (như Hay Day) và chỉ giảm chất lượng sao?
4. Cây bệnh/chết lúc người chơi offline: cho phép chết như hiện nay (khi mở game thấy héo) hay giữ nguyên "offline không bao giờ gây chết" (ADR 0004) cho cả cây?
5. Mức chịu chơi của người chơi hoàn hảo: 3 buổi × 20 phút mỗi ngày là giả định của tôi. Người chơi mục tiêu chơi nhiều hơn hay ít hơn?
6. Giá nâng cấp tăng 2,5-4 lần ổn chưa, hay muốn "đắt thật" (×5-10) để mục tiêu dài hạn tính bằng tuần?
7. Trần trứng 30 cho cả trại: nâng lên hoặc để trứng chồng trong ổ cho người offline?
8. Heo đẻ 12 giờ và vẫn 1-3 con/lứa; hay muốn bỏ nhân giống heo thành nguồn thu và chỉ giữ cho bò, cừu, gà?
9. Có đổi EXP cây xuống 15% lãi ròng (chậm hơn nhiều theo giờ) hay muốn người chơi lên cấp nhanh ở cấp thấp (bù bằng EXP nhiệm vụ làm quen)?
10. Có tặng quà bồi thường khi nâng cấp bản lưu (kho đồ, hạt giống cũ) không?
