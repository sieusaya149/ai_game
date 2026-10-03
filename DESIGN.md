# Nông Trại Vui: thiết kế bản mở rộng (bản nháp)

Tài liệu thiết kế. **Đã grill xong toàn bộ 16 chủ đề (mục 11).** Các con số sẽ cân bằng lại khi chơi thử.
Những gì đã có sẵn trong game được mô tả ở `SPEC.md`. File này ghi những gì **thêm mới hoặc thay đổi** so với bản đó.

---

## 0. Nguyên tắc chung

- **Mọi thứ đều có vòng đời và trạng thái nhìn thấy được.** Cây, con vật, cá, nhân công đều có cấp, có nhu cầu và hành vi khác nhau theo cấp. Người chơi nhìn hình là biết cần làm gì.
- **Các hệ thống móc vào nhau, không chạy riêng lẻ.**
  - Phân chuồng, cây héo, rong rêu → phân bón.
  - Gà và vịt ăn sâu ở ruộng. Mèo bắt chuột để bảo vệ gà con.
  - Chó canh trộm cho cả lúc chơi một mình lẫn khi bạn bè ghé vườn.
- **Tự động hóa có giá.** Tưới tự động, phun thuốc tự động, tắm tự động và nhân công đều tốn tiền hằng ngày. Như vậy xu luôn có chỗ tiêu.
- **Giọng điệu gia đình.** Con vật mất thì "về trời" có cánh bay lên, không có máu me. Trộm là trò tinh nghịch, không phải tội ác.

---

## 0b. Thời gian & offline (đã chốt)

- 1 ngày game = 20 phút. 1 tháng = 1 mùa = 7 ngày game. Có 4 mùa.
- **Chạy bù khi offline tối đa 8 tiếng.** Sau đó nông trại **đóng băng**, thời gian đứng yên chờ người chơi quay lại.
- **Trong lúc offline vẫn xảy ra:**
  - Cây lớn, chín, có thể héo.
  - Con vật đói, dơ, lớn lên.
  - Bị trộm, hóa đơn vẫn tính tiền.
- **Trong lúc offline không bao giờ xảy ra:**
  - Con vật **chết vì đói hay vì bệnh**. Bệnh dừng ở giai đoạn "bệnh nặng", chờ người chơi về chữa.
  - Chết vì **già** vẫn có thể xảy ra, vì đã được báo trước khi con vật vào giai đoạn già.
- **Online: cả làng dùng chung một đồng hồ** tính theo giờ server. Ngày đêm, mùa, thời tiết, lễ hội và chu kỳ hóa đơn là chung cho mọi vườn.
  - Online luôn chạy x1. Nút x5/x20 chỉ còn ở chế độ offline và chế độ thử nghiệm.
  - **Đóng băng sau 8 tiếng** chỉ áp dụng cho cây và con vật, **lịch vẫn chạy**.
  - Hóa đơn chỉ tính cho thời gian máy thật sự chạy, không tính lúc vườn đóng băng.
- **Thời tiết xấu** luôn được báo trước 1 ngày qua radio ở nhà hoặc bảng tin.

  | Thời tiết | Mùa | Tần suất | Gây hại | Cách chống |
  |---|---|---|---|---|
  | ⛈️ Bão | Hạ, Thu | ~5% số ngày | Hỏng bù nhìn và hàng rào (phải sửa), gãy cành cây ăn trái, con vật ở ngoài mất vui, có thể mất điện nửa ngày | Lùa con vật vào chuồng, máy phát điện |
  | ☀️🔥 Hạn hán | Hạ | 1 đợt mỗi mùa, 2–3 ngày | Đất khô nhanh gấp 2 lần, giếng hồi nước chậm | Nâng cấp giếng và bồn chứa, phủ rơm giữ ẩm |
  | ❄️ Sương muối | Đông | ~15% số buổi sáng | Cây ở giai đoạn hạt hoặc mầm ngừng lớn 1 ngày | Phủ rơm, nhà kính |
  | 🌈 Cầu vồng | Sau mưa | Thỉnh thoảng | Có lợi: vật nuôi vui hơn, tăng may mắn ở hội chợ | |

  **Thời tiết xấu không bao giờ giết cây hay giết con vật.**
- **Màn "Trong lúc bạn vắng nhà…"** khi mở game: tóm tắt cây chín, cây héo, con vật bệnh, ai ghé trộm hay giúp, chó đuổi được bao nhiêu trộm.

---

## 0c. Nhân vật người chơi

### Thể lực (đã chốt: có, kiểu "mềm")
- **100 điểm.** Cuốc, tưới, gieo, thu hoạch mỗi việc tốn 1 điểm. Tắm hay vuốt ve con vật không tốn.
- **Hết thể lực vẫn làm được**, nhưng đi chậm và làm chậm gấp đôi, có hình nhân vật thở hồng hộc. Không bao giờ bị chặn hẳn.
- **Cách hồi sức:**
  - Ngủ ở nhà: hồi đầy. Offline thì tua thời gian tới sáng; online thì chỉ hồi sức, không tua.
  - Ăn món tự nấu từ nông sản.
  - Ngồi ghế đá: hồi chậm.
- Sang vườn bạn để giúp hay trộm cũng tốn thể lực.

### Nhà (đã chốt: **đi vào trong nhà được**)
- Nhà có **bản đồ nội thất** riêng. Bên trong có giường để ngủ nghỉ, bếp để nấu ăn, tủ đồ, tủ lạnh, radio.
- **Các cấp nhà:**
  - Nhà tranh: giường, tủ đồ.
  - Nhà ngói: thêm bếp, tủ lạnh, radio.
  - Nhà lầu: giường êm, phòng khách cho bạn bè online vào chơi, sân thượng.
  - Ngoài nhà nhìn thấy rõ cấp nhà.
- **Đặt đồ nội thất tự do trên lưới ô:** mua ở sạp, kéo thả, xoay được.
- **Đồ chức năng có nhiều phiên bản đắt dần**, phiên bản đắt thì tốt hơn. Ví dụ bếp củi → bếp ga → bếp từ, nấu nhanh hơn và mở thêm món.
- **Diện tích theo cấp nhà:**
  - Nhà tranh: 8×6 ô.
  - Nhà ngói: 10×8 ô.
  - Nhà lầu: 2 tầng, mỗi tầng 12×8 ô, có cầu thang.
- **Điểm "Nhà đẹp" ❤️:** tính theo đồ đạc và độ gọn gàng, có phân thú cưng thì bị trừ. Nhà càng đẹp thì ngủ dậy càng có nhiều thể lực, và được tính vào bảng xếp hạng làng.
- **Ra vào bằng cửa,** có hiệu ứng chuyển cảnh mờ dần. Đất sau nhà và làng cũng vào theo cách này.
### Ba kiểu thú cưng (đã chốt)

| Thú cưng | Sống ở | Vai trò |
|---|---|---|
| 🐕 Chó Mực | Chuồng chó ngoài sân | Canh trộm, lùa gà vịt |
| 🐈 Mèo | Ra vào tự do qua cửa mèo, tối ngủ trong nhà | Bắt chuột (rình rồi vồ, có hoạt cảnh và thông báo), đuổi sóc ở cây ăn trái, canh kho (kho có mèo thì chuột không ăn đồ), thỉnh thoảng tha "quà" về cửa (lông chim, hạt giống lạ). Khung thông tin hiện số chuột đã bắt |
| 🐶🐰 Thú cưng cảnh: chó Phốc, thỏ, sau này có vẹt | Chỉ ở trong nhà | Tăng điểm Nhà đẹp, thêm thể lực khi ngủ dậy, đi dạo với bạn bè |

**Thú cưng cảnh:**
- **Thanh "buồn đi vệ sinh"** tăng dần. Không dắt ra ngoài kịp thì nó ỉa trong nhà: bị trừ điểm Nhà đẹp và phải lau dọn.
- **Dắt đi dạo** bằng dây ra sân, ra làng, hoặc sang vườn bạn bè.
  - Thú cưng vui hơn, lớn dần và thân hơn.
  - Ỉa ngoài đường thì phải tự xúc. Không xúc thì người khác giẫm phải bị trượt, và người dân trong làng phàn nàn.
- **3 cấp** non → nhỡ → trưởng thành. Trưởng thành thì học được trò (ngồi, bắt tay, xoay vòng).
- **Số lượng tối đa:** 1 con ở nhà tranh, 2 con ở nhà ngói, 3 con ở nhà lầu.

### Quần áo (đã chốt)
- Phần lớn chỉ để đẹp. Có thêm áo, quần, giày, đồ theo mùa hay lễ hội (áo dài Tết, đồ Trung thu), và bộ đồ hiếm lấy ở hội chợ hoặc mua bằng Tiếng tăm ⭐.
- **Một số đồ có tác dụng theo thời tiết:**

| Đồ | Tác dụng | Nếu không có |
|---|---|---|
| 👒 Nón lá | Mùa hạ không tốn thêm thể lực | Nắng hạ: mọi việc tốn thể lực ×1.2 |
| 🧥 Áo mưa | Đi lại bình thường khi mưa | Mưa: đi chậm hơn, nhân vật bị ướt |
| 🧶 Áo len (may từ vải dệt bằng lông cừu) | Mùa đông không mất thể lực | Đông: mất thể lực chậm dần khi ở ngoài trời |
| 🥾 Ủng | Giẫm phân không trượt | Như hiện tại |

- Áo có tác dụng mặc chồng lên ngoài, vẫn giữ kiểu tóc và màu da.

### Công cụ (đã chốt)
- **Giếng = nguồn nước:** tốc độ múc, bồn chứa chung, hồi nước khi hạn hán.
- **Công cụ = sức người:** số ô làm được trong một lần, và mức tốn thể lực.

| Công cụ | Cấp 1 | Cấp 2 (đồng) | Cấp 3 (vàng) |
|---|---|---|---|
| 🪓 Cuốc | 1 ô | 1 hàng 3 ô | 3×3 ô |
| 🚿 Bình tưới | Chứa 10, tưới 1 ô | Chứa 20, tưới 1 hàng 3 ô | Chứa 40, tưới 3×3 ô |
| 🌾 Liềm | Hái 1 ô | 3 ô | 3×3 ô |
| 🧺 Giỏ | 30 món | 60 món | 120 món |

- **Làm nhiều ô một lần tốn ít thể lực hơn** làm từng ô. Ví dụ cuốc 3×3 tốn 5 điểm thay vì 9.
- **Nâng cấp ở tiệm rèn trong làng:** tốn xu và nguyên liệu, mất 1 ngày game. Trong ngày đó không có công cụ để dùng.
- **Giỏ đầy thì phải về kho cất đồ.** Khi đi trộm, giỏ đầy thì không trộm thêm được.

---

## 1. Cây trồng

### 1.1 Năm giai đoạn lớn, mỗi cây một bộ hình riêng
- Giữ nguyên 5 giai đoạn: **hạt → mầm → cây non → ra hoa/trái non → chín**.
- **Mỗi loại cây có bộ sprite riêng cho cả 5 giai đoạn**, không dùng chung mầm/cây non/ra hoa như bây giờ. Ví dụ:
  - Cải xanh: 2 lá mầm tròn → bụi lá xòe → cây cao có ngồng hoa vàng.
  - Cà rốt: lá lông chim mảnh, ngọn cam ló khỏi đất khi gần chín.
  - Lúa: mạ xanh mảnh → bụi lúa → bông lúa trĩu vàng.
  - Cà chua, dưa hấu, bí ngô: dây leo bò, hoa vàng, trái non xanh rồi đổi màu.
  - Bắp: thân cao dần, ra cờ, ra trái có râu.
  - Dâu tây: bụi thấp, hoa trắng, trái đỏ.
- **Cây bệnh, chết, héo cũng theo dáng của từng cây** (lá vàng, rũ xuống), không dùng một hình chung.

### 1.2 Cấp thành thạo: 3 cấp mỗi loại cây
Trồng và thu hoạch một loại cây đủ số lần thì loại cây đó lên cấp, áp dụng cho mọi lần trồng sau.

| Cấp | Phần thưởng |
|---|---|
| 1 | Như hiện tại |
| 2 | +1 sản lượng, 10% ra **trái khổng lồ** |
| 3 | +2 sản lượng, 20% trái khổng lồ, kháng sâu hơn, **tự để giống** (30% được lại 1 hạt mỗi lần thu hoạch) |

**Ngưỡng lên cấp** (đã chốt, tính theo thời gian lớn của cây):

| Nhóm cây | Cấp 2 | Cấp 3 |
|---|---|---|
| Ngắn ngày (≤ 3 phút) | 20 lần thu hoạch | 60 lần |
| Trung bình (5–10 phút) | 12 lần | 35 lần |
| Dài ngày (≥ 12 phút) | 8 lần | 25 lần |

- **Trái khổng lồ:**
  - Chiếm 1 ô nhưng hình to tràn ra ngoài ô, lấp lánh.
  - Bán giá ×3, dùng cho đơn hàng đặc biệt và thi ở lễ hội.
  - **Không trộm được** vì quá nặng. Chiếm 5 chỗ trong giỏ.
- Cấp thành thạo lưu theo người chơi, giữ mãi mãi. Xem được trong Sổ sưu tầm.

### 1.3 Chất lượng nông sản ★1–3
- Chăm kỹ suốt vụ thì nông sản đạt sao cao, bán đắt hơn (★2 ×1.5, ★3 ×2). "Chăm kỹ" nghĩa là không lúc nào khô hẳn, không để sâu quá 30 giây, có bón phân.
- Kho, túi đồ và đơn hàng phân biệt nông sản theo số sao.
- **Máy móc chỉ giữ được tối đa ★2.** Muốn ★3 thì trong vụ phải có ít nhất một lần chăm sóc bằng tay: của chính người chơi, hoặc của nhân công tay nghề cao.
- Tỉ lệ ra trái khổng lồ cao nhất khi có cả cấp thành thạo 3 lẫn ★3.

### 1.4 Danh sách cây và mùa (đã chốt)

16 loại cây, mỗi mùa 4 cây hợp mùa:

| Mùa | Cây hợp mùa |
|---|---|
| Xuân | Cải xanh, Hành lá *(mới)*, Dâu tây, Đậu phộng *(mới)* |
| Hạ | Rau muống *(mới)*, Dưa leo *(mới)*, Bắp, Dưa hấu |
| Thu | Lúa, Khoai lang *(mới)*, Bí ngô, Ớt *(mới)* |
| Đông | Cà rốt, Cà chua, Su hào *(mới)*, Bắp cải *(mới)* |

- **Mùa chỉ làm chậm, không cấm trồng:**
  - Trái mùa: lớn chậm ×0.6, không ra được ★3.
  - Đúng mùa: 10% được thêm sản lượng.
- **Đổi mùa giữa vụ:** cây không chết. Mùa **chốt lúc gieo**: gieo đúng mùa thì lớn đủ tốc độ cả vụ, gieo trái mùa thì chậm cả vụ.

**Cân bằng thời gian và kinh tế (chốt 03/10).** Thời gian lớn thật: rau muống 2 phút, cải 3, hành lá 5, dưa leo 10, su hào 15, cà rốt 20, bắp 30, cà chua 45, dưa hấu 60, ớt 1,5 giờ, đậu phộng 2, khoai lang 3, bắp cải 4, bí ngô 5, dâu 6, lúa 8. Xu/giờ/ô khoảng 36–60 tăng nhẹ theo cấp, EXP ~15% lãi. Lúa mở ở cấp 8. Gà đẻ mỗi 10 phút, vịt 15, bò sữa mỗi giờ, cừu len mỗi 3 giờ, heo mang thai 2 giờ. Đói không bệnh ngay (an toàn ~90 phút, rồi nguy cơ tăng dần). Giá nâng cấp ×2,5–4, thưởng đơn hàng ×1,25, đơn mới mỗi 15 phút. Bảng đầy đủ: `docs/proposals/balance-time-economy.md`, mục "Đã chốt (03/10)".

### 1.5 Nhà kính (đã chốt)
- **Phủ lên một khối 3×3 ô** trong ruộng. Mở ở cấp người chơi 14, rất đắt, mỗi vườn tối đa 2 cái.
- **Tác dụng với các ô bên trong:** bỏ qua ảnh hưởng của mùa (★3 quanh năm), không bị sương muối hay bão, quạ không vào được.
- **Điểm trừ:** tốn điện sưởi mùa đông. Bão có tỉ lệ thấp làm vỡ kính, phải sửa. Trộm vẫn vào được qua cửa.
- **Hiển thị mái:**
  - **Đứng ngoài:** mái phủ kín. Ở cửa có **bảng trạng thái** tóm tắt (`💧 khô · 🐛 sâu · ✨ chín · 🥀 héo`). Có việc gấp thì bong bóng nhấp nháy trên mái.
  - **Bước vào trong:** mái mờ dần rồi ẩn, thấy cây như ruộng thường.
  - Bạn bè online cũng thấy y như vậy.
  - Các công trình có mái khác cũng dùng cách này.

---

## 2. Vật nuôi

### 2.1 Vòng đời: Non → Nhỡ → Trưởng thành → Già
Mỗi giai đoạn có sprite và hành vi riêng.

| Con | Non | Nhỡ | Trưởng thành | Già |
|---|---|---|---|---|
| **Gà** | Chạy theo gà mẹ, kêu chiếp. Dễ bị chuột/diều hâu bắt. | Bới đất, đi khắp trại, **ăn sâu ở ruộng** (thỉnh thoảng mổ luôn hạt mới gieo). | **Gà mái** đẻ trứng ở bất kỳ đâu. **Gà trống** gáy 6h sáng, có trống thì trứng **có phôi** ấp được. | Đẻ thưa, hay ngủ. |
| **Vịt** (mới) | Đi thành hàng theo vịt mẹ. | Đi khắp trại, thích ra hồ bơi. | Đẻ trứng vịt (hay đẻ gần hồ). Phân vịt làm cá lớn nhanh. | Đẻ thưa. |
| **Heo** | Bú mẹ, chạy loăng quăng. | Ủi bùn, ăn khỏe nhất, tăng cân nhanh. | Heo nái đẻ con. Heo thịt **bán theo cân nặng**. | Nái già đẻ ít con hơn. |
| **Bò** | Bê đi theo mẹ. | Bò tơ **kéo cày** được (cuốc cả hàng ruộng). | Bò sữa, được vuốt ve đều thì sữa ngon hơn. | Ít sữa. |
| **Cừu** | Nhảy tưng tưng. | Lông ngắn, chưa xén được. | Lông dài thì xén, cừu vui thì ra lông xoăn giá cao. | Lông mỏng. |
| **Chó** | Nghịch, tha dép, ỉa nhiều. | Sủa lung tung, **dạy được lệnh**. | Canh nhà, đuổi trộm, lùa gà vịt. | Ngủ nhiều, phát hiện trộm chậm hơn. |
| **Mèo** (mới) | Vờn đuôi, nghịch cuộn len. | Tập vồ, bắt được chuột nhỏ. | **Thợ săn chuột**, phơi nắng, leo cây. | Lười, chỉ bắt chuột khi đói. |

- **Tuổi thọ (đã chốt).** Tuổi tính bằng **giờ vườn thật sự chạy**: lúc vườn đóng băng thì con vật không già đi. Mỗi con phải sống đủ lâu để thu lại gấp 5–10 lần tiền mua.

| Con | Non → Nhỡ | Nhỡ → Trưởng thành | Trưởng thành | Già (báo trước) | Tổng, tương đương ngoài đời |
|---|---|---|---|---|---|
| Gà | 20 phút | 40 phút | ~96 giờ | ~24 giờ | ~6 ngày |
| Vịt | 25 phút | 50 phút | ~96 giờ | ~24 giờ | ~6 ngày |
| Heo | 90 phút | 150 phút | ~120 giờ | ~24 giờ | ~7 ngày |
| Bò, cừu | 2 giờ | 3 giờ | ~168 giờ | ~36 giờ | ~10 ngày |
| Chó, mèo, thú cưng cảnh | 30 phút | 1 giờ | Mãi mãi | Chậm chạp, ngủ nhiều | Không chết vì già |

- Hết giai đoạn già thì con vật có thể ra đi bất kỳ lúc nào. **Thú cưng không bao giờ chết vì già**, chỉ có thể chết vì bệnh.
- Mùa và hóa đơn vẫn tính theo lịch ngày game. Riêng tuổi con vật tính theo giờ vườn chạy.
- **Độ thân ❤️1–5 (đã chốt):**
  - **Tăng khi:** cho ăn tận tay, vuốt ve, tắm, chữa bệnh.
  - **Giảm khi:** để đói hay dơ lâu.
  - **Lợi ích:**
    - ❤️3: sản phẩm có tỉ lệ ★ cao hơn.
    - ❤️4: chạy lại khi người chơi tới gần, ít bệnh hơn.
    - ❤️5: đi theo người chơi, tuổi thọ +10%.
- **Bán con vật (đã chốt):**
  - Không có cảnh giết mổ. Lái buôn tới cổng trại dắt con vật đi.
  - **Heo thịt bán theo cân:** cân tăng khi ăn no và ít vận động. Có cân ở chuồng để xem số ký. Giá = số ký × giá chợ hôm đó.
  - Bán con có ❤️4 trở lên thì hỏi xác nhận 2 lần.
  - **Cho nghỉ hưu:** con già ở lại trại, không cho sản phẩm, tăng vui cho cả chuồng, nhưng chiếm một chỗ trong chuồng.

### 2.1a Các loài mới (đã chốt: làm hết)

| Loài | Ở đâu | Cấp người chơi | Cho gì / làm gì | Điểm đặc biệt |
|---|---|---|---|---|
| 🐇 Thỏ angora | Chuồng thỏ | 3 | Lông thỏ | Đẻ 2–4 con một lứa. Dễ bị chuột và chồn bắt. |
| 🪿 Ngỗng | Thả rông | 6 | Trứng ngỗng | **Canh nhà:** thấy người lạ thì kêu inh ỏi và đuổi mổ. |
| 🐐 Dê | Đồng cỏ | 6 | Sữa dê → phô mai dê | Hay nhảy rào trốn đi gặm rau ngoài ruộng. Cần rào cao. |
| 🐃 Trâu | Đồng cỏ | 9 | Kéo cày khối 3×3, kéo xe: có trâu trưởng thành khỏe thì thùng giao hàng trả 85% (thay vì 80%) và chứa gấp đôi | Thích đầm bùn. Bò kéo cày thì xới cả hàng. |
| 🐸 Ếch | Hồ | 8 | Ăn sâu ở ruộng gần hồ, bán được | Kêu ban đêm. Bắt bằng vợt. |
| 🐟 Cá | Hồ | 8+ | Rô, trê, chép, tôm càng, lươn, Koi (cảnh) | Mỗi loài thích một tầng nước, nhiều loài chung một hồ. |
| 🐝 Ong | Thùng ong cạnh vườn trái | 10 | Mật ong, sáp ong | Thụ phấn. Không có đồ bảo hộ thì bị đốt, mất thể lực. |
| 🐛 Tằm | Nhà tằm, ăn lá dâu tằm | 12 | Kén → tơ lụa | Phải trồng cây dâu tằm. |
| 🕊️ Bồ câu | Chuồng chim trên mái | 7 | Đưa thư và quà cho bạn bè online | Cho ăn đầy đủ thì thư tới nhanh hơn. |
| 🦚 Công | Thả rông | 18 | Mỗi sáng xòe đuôi, cả trại vui hơn (như Koi); khách thăm vườn thấy công xòe. Điểm đẹp của vườn ở Phase 5 | Để khoe, rất đắt. |
| 🐎 Ngựa | Chuồng ngựa | 15 | Cưỡi để đi nhanh ×2 | Phải chải lông, cho ăn cà rốt. |

### 2.1b Đực/cái và sinh sản (đã chốt)

| Loài | Con đực | Con cái | Sinh sản |
|---|---|---|---|
| Gà, vịt | Trống: gáy sáng | Mái: đẻ trứng | Có ≥1 trống thì 40% trứng có phôi. Chỉ trứng có phôi mới ấp nở. Soi trứng để biết. |
| Heo | Đực giống | Nái | 1 đực + 1 nái no và vui thì nái mang bầu, đẻ 1–3 con. Con nào cũng bán thịt theo cân được. |
| Bò | Bò đực: kéo cày | Bò cái: cho sữa | Đực + cái thì 1 bê con mỗi ~10 giờ |
| Cừu | Cả hai cho lông | | Đực + cái thì 1 cừu non |

- **Khi mua:** chọn được đực hay cái, con cái đắt hơn ~30%.
- **Con đẻ ra trong trại:** giới tính ngẫu nhiên 50/50.
- **Chuồng đầy thì không sinh sản được nữa.** Phải bán bớt hoặc nâng cấp chuồng.
- **Đặt tên:** con đẻ trong trại tự có tên (ví dụ "Bông con"). Có cây phả hệ trong sổ.

### 2.2 Dơ và tắm (heo, bò, gà, vịt, cừu)
- Mỗi con có chỉ số **dơ 0–100**. Tăng dần theo thời gian, tăng nhanh khi trời mưa, khi chuồng bẩn, và khi heo lăn bùn.
- **Dơ nhiều:** con vật có vệt bùn và ruồi bay quanh, mất vui, dễ bệnh hơn, sản phẩm giảm chất lượng.
- **Tắm từng con:** hành động "Tắm", tốn nước trong bình tưới.
  - **Hiệu ứng tắm:** bọt xà phòng phủ lên, con vật lắc mình văng giọt nước, rồi lấp lánh sạch sẽ và vui hẳn lên.
  - Heo thích bùn: tắm xong heo vui nhưng một lúc sau lại lăn bùn. Đây là nét vui, đừng làm heo dơ quá nhanh.
- **Tắm tự động:** nâng chuồng lên cấp 3 thì có vòi sen. Mỗi sáng tự tắm cả chuồng, tốn nước từ bồn chứa.
- **Chi tiết (đã chốt):**
  - **Tốc độ dơ:** từ sạch tới dơ hẳn khoảng 3 giờ. Mưa hay chuồng bẩn thì nhanh gấp đôi.
  - **Heo và trâu** đầm bùn thì dơ ngay, nhưng không bị mất vui, chỉ tăng nguy cơ bệnh.
  - **Tắm tay:** tốn 1 lần nước trong bình tưới và 1 cục xà phòng. Xà phòng mua ở sạp, hoặc tự làm từ sáp ong và dầu phộng. Con vật +15 vui, độ thân tăng nhẹ.
  - **Gà, vịt, ngỗng** tự tắm cát nếu chuồng có ổ cát. Vịt và ngỗng tự bơi ở hồ.
  - **Ngựa** dùng bàn chải chải lông.
  - **Vòi sen tự động:** mỗi sáng tắm cả chuồng bằng nước bồn, tốn tiền nước. Chỉ được +5 vui vì không có xà phòng.
- **Dọn chuồng:** phân chuồng tích dần, xúc đi thì chuồng sạch hơn và được phân chuồng để ủ phân bón.

### 2.3 Bệnh, lây bệnh và cái chết
- **Diễn tiến bệnh** (đã chốt, tính bằng giờ vườn chạy):

| Giai đoạn | Dấu hiệu | Ảnh hưởng | Cách chữa |
|---|---|---|---|
| 1. Mệt | Bong bóng vàng, đi chậm | Không đẻ, không cho sản phẩm, không lớn | 1 liều thuốc thú y |
| 2. Bệnh nặng (sau ~1 giờ) | Bong bóng đỏ nhấp nháy, nằm một chỗ, có thông báo | Bắt đầu lây | 2 liều thuốc, hoặc bác sĩ thú y |
| 3. Nguy kịch (sau thêm ~30 phút) | Đếm ngược trên đầu | | Chỉ bác sĩ thú y |
| 4. Mất (hết đếm ngược ~15 phút) | Hóa thiên thần, để lại ngôi mộ nhỏ | | |

- **Đồng hồ gây chết chỉ chạy khi chủ vườn đang chơi.** Offline thì dừng ở giai đoạn bệnh nặng.
- **Lây bệnh:** con bệnh nặng thì mỗi 10 phút có 10% lây sang 1 con cùng chuồng.
- **Vắc-xin** tiêm một lần, chống bệnh ~10 giờ.
- **Thông báo trình duyệt** khi có con vật vào giai đoạn bệnh nặng.
- **Nguyên nhân:** đói lả lâu, dơ lâu, chuồng bẩn, tuổi già, bị lây.
- **Lây bệnh:** con bệnh ở chung chuồng thì có thể lây cho con khác. Xây **chuồng cách ly** để tách riêng.
- **Cách chữa:**
  - Thuốc thú y: chữa được giai đoạn mệt.
  - **Bác sĩ thú y** (gọi qua điện thoại ở nhà, đắt): cứu được con bệnh nặng.
- **Già + bệnh** thì tiến triển nhanh gấp đôi.
- **Khi mất:** con vật hóa thiên thần bay lên. Có ngôi mộ nhỏ ở góc vườn; đặt hoa lên thì cả trại hết buồn nhanh hơn.

### 2.4 Gà vịt thả rông, chuột và việc lùa vào chuồng
- **Ban ngày gà vịt đi khắp trại.** Chúng ăn sâu, mổ thóc, đẻ trứng ở bụi cỏ, gốc cây, nên người chơi phải đi tìm trứng.
  - Vùng đi lại: khắp trại, trừ trong nhà ở, trong nhà kính và ra ngoài cổng (cổng tự đóng).
  - **Vào ruộng:** mổ sâu (có lợi), nhưng 5% mổ mất hạt vừa gieo. Mua hàng rào thấp quanh ruộng thì gà vịt không vào được, nhưng mất luôn phần bắt sâu giúp.
  - Tổng số con thả rông tối đa ~30, để giữ hiệu năng trên điện thoại.
- **Chạng vạng (18h):** phần lớn tự về chuồng, trung bình mỗi tối **1–3 con lạc**.
  - Dễ lạc: con ❤️ thấp, con non, con ở xa chuồng.
  - Đêm bão: cả đàn chạy tán loạn.
  - Con lạc có biểu tượng 💤 và mũi tên chỉ hướng.
- **Ngủ ngoài chuồng** thì có nguy cơ bị chuột hoặc chồn tấn công.
- **Kẻ săn mồi (đã chốt):**

| Kẻ săn mồi | Khi nào | Gây hại | Khắc chế |
|---|---|---|---|
| 🐀 Chuột | Cả ngày, sinh từ kho, đống rơm, máng | Ăn cám, trộm trứng, cắn con non (bị thương, không chữa thì có thể chết) | Mèo, bẫy chuột, kho cao cấp |
| 🦅 Diều hâu | Ban ngày, hiếm | Cắp gà con, vịt con đang thả rông | Ngỗng báo động, chó, mái che ở sân |
| 🦊 Chồn | Nửa đêm | Bắt con ngủ ngoài chuồng | Lùa về chuồng, chó, đèn |
| 🐿️ Sóc | Ban ngày | Trộm trái cây | Mèo, lưới bọc cây |

  - **Số lượng chuột:** mỗi giờ sinh thêm nếu không ai bắt, tối đa 8 con. Mèo bắt khoảng 1 con mỗi 10 phút nếu đói vừa phải.
  - **Khi offline:** chỉ ăn cám và trộm trứng, không làm con vật chết.
  - **Khi online:** luôn cảnh báo trước ~10 giây để người chơi kịp chạy ra đuổi.
  - **Mức hại ước tính:** không phòng thủ gì thì mất 0–2 con non mỗi ngày ngoài đời. Đủ mèo, chó, ngỗng thì gần như không mất con nào.
- **Mèo bắt chuột:**
  - Mèo đói vừa phải thì săn tốt nhất. Cho ăn no quá thì mèo lười, chỉ nằm phơi nắng.
  - Bắt được chuột thì mèo mang "chiến lợi phẩm" tới khoe người chơi.
  - Thỉnh thoảng mèo và chó cãi nhau.
- **Lùa vào chuồng (đã chốt):**
  - **Người chơi tự lùa:** gà vịt chạy tránh xa người chơi trong khoảng 2 ô. Đi vòng ra sau để đẩy đàn về cửa chuồng.
  - **Rải thóc ở cửa chuồng:** gà vịt trong bán kính 5 ô tự chạy lại rồi vào chuồng. Tốn 1 bao cám.
  - **Chó** (lệnh "Lùa về chuồng"): dồn cả đàn khoảng 20 giây, lùa được cả bò, cừu, dê đi lạc.
  - **Mèo:** chỉ lùa 1 con gần nhất, và chỉ khi đang vui.
  - **Chó đã dạy lệnh "Lùa"** tự đi lùa con lạc mỗi tối, nếu đang no và vui.
  - Trên cửa chuồng hiện số con đã về, ví dụ `Gà 8/10 đã về`.

### 2.5a Đặt công trình tự do (đã chốt)
- Có **chế độ xây dựng**: đặt công trình ở bất kỳ đâu trên lưới ô, kéo thả để dời chỗ.
- **Nhà ở và cổng cố định.** Còn lại chuồng trại, giếng, kho, máy móc, nhà kính, đồ trang trí đều đặt và dời tự do.
- **Ruộng đặt tự do theo khối 3×3**, thay cho lưới 6×6 cố định. Số ô tối đa vẫn theo cấp người chơi.
- **Ràng buộc khi đặt:**
  - Không chặn đường từ cổng vào nhà (game kiểm tra bằng thuật toán tìm đường).
  - Công trình cần nước phải nằm trong tầm ống nước của bồn chứa.
- **Dời miễn phí**, nhưng con vật trong chuồng sẽ hoảng một lúc.
- **Khu đất bắt đầu nhỏ, mua mở rộng ra các mép bản đồ** (chi tiết ở chủ đề I).

### 2.5 Chuồng trại phải xây, có 3 cấp
- Lúc bắt đầu chỉ có **khung đất trống có biển "Xây chuồng – … xu"**.

| Chuồng | Cấp 1 | Cấp 2 | Cấp 3 |
|---|---|---|---|
| Nhà mèo, chuồng chó | Cấp 1 | Cấp 2 | Cấp 3 (nệm, đồ chơi để tăng vui) |

**Danh sách chuồng (đã chốt, thay cho các dòng chuồng gà/heo/đồng cỏ cũ):**

| Chuồng | Loài | Sức chứa cấp 1 / 2 / 3 | Cấp người chơi | Cấp 3 có thêm |
|---|---|---|---|---|
| 🐔 Gia cầm | Gà, vịt, ngỗng | 6 / 12 / 18 | 1 | Ổ ấp tự động, ổ cát |
| 🐷 Heo | Heo | 3 / 5 / 8 | 3 | Vũng bùn, vòi sen |
| 🐇 Thỏ | Thỏ | 4 / 8 / 12 | 3 | |
| 🐄 Chuồng lớn + đồng cỏ | Bò, trâu, dê, cừu | 3 / 6 / 9 | 5 | Cỏ tự mọc, vòi sen |
| 🐎 Ngựa | Ngựa | 1 / 2 / 3 | 15 | |
| 🕊️ Bồ câu | Bồ câu | 2 / 4 / 6 | 7 | |
| 🐛 Nhà tằm | Tằm | 2 / 4 / 6 nong | 12 | |
| 🐝 Thùng ong | 1 đàn mỗi thùng | Xây nhiều thùng | 10 | |
| 🐟 Hồ | Cá, tôm, lươn, ếch | Theo diện tích | 8 | |
| 🏥 Cách ly | Mọi loài, 1 con mỗi chỗ | 1 / 2 / 3 | 3 | |

- Được xây nhiều chuồng cùng loại. Số chuồng mỗi loại có giới hạn theo cấp người chơi.
- **Chuồng cách ly:** không lây bệnh, hồi bệnh nhanh ×1.5, con vật không được thả rông.
- **Chuồng là chỗ ngủ:** số con nuôi được tính theo sức chứa chuồng, kể cả loài thả rông ban ngày.

---

## 3. Đất, nước và tự động hóa

### 3.1 Mở đất theo cấp (đã chốt, tính theo khối 3×3)

| Cấp người chơi | 1 | 4 | 8 | 12 | 16 | 20 | 25 | 30 |
|---|---|---|---|---|---|---|---|---|
| Số khối (ô) | 1 (9) | 2 (18) | 3 (27) | 4 (36) | 5 (45) | 6 (54) | 7 (63) | 8 (72) |

- Khối đầu tiên miễn phí, các khối sau tốn xu tăng dần.
- **Nâng cấp gắn theo khối:** tưới nhỏ giọt, phun thuốc tự động, đất màu mỡ, nhà kính đều mua cho cả khối 3×3.

### 3.1b Mạng nước (đã chốt)
- **Bồn chứa** cạnh giếng: có từ giếng cấp 4 (200 lần tưới). Bồn phụ +150 mỗi bồn.
- **Tầm ống nước:** 8 ô tính từ bồn. Trạm bơm phụ thêm 8 ô, tốn điện.
- **Giếng bơm đầy bồn** khoảng 20 lần tưới mỗi giờ, hạn hán thì chỉ còn một nửa.
- Mỗi lần tự tưới 1 ô tốn 1 lần nước. Vòi sen tốn 1 lần nước cho mỗi con.
- Chế độ xây dựng hiện đường ống và vùng phủ nước màu xanh. Bồn hiện mực nước.

### 3.2 Giếng gần ruộng, nâng cấp được
- Dời giếng sát ruộng (sửa `layout.js`).

| Cấp | Tên | Bình tưới | Thêm |
|---|---|---|---|
| 1 | Giếng đất | 10 lần | |
| 2 | Giếng xây | 15 lần | Múc nhanh hơn |
| 3 | Bơm tay | 25 lần | |
| 4 | Máy bơm | 40 lần | **Bồn chứa** cấp nước cho tưới tự động và vòi sen |

- Hạn hán thì giếng hồi nước chậm.

### 3.3 Nâng cấp ô đất (từng ô hoặc cả hàng, mua cả hàng thì rẻ hơn)
- **Tưới nhỏ giọt:** đất khô thì tự tưới, lấy nước từ bồn. Bồn cạn thì ngừng.
- **Phun thuốc tự động:** có sâu thì sau 20 giây tự phun, trừ thuốc trừ sâu trong kho.
- **Đất màu mỡ:** cỏ mọc chậm hơn, +sản lượng.
- **Phí vận hành:** máy bơm và máy phun tốn tiền điện mỗi ngày, trừ lúc 6h sáng.

### 3.3b Kho và đồ hư (đã chốt)
- **Kho có 3 cấp:** chứa 100 → 250 → 600 món, **chỉ tính hàng bán được** (hạt, vật tư, cám, gỗ, đá, đồ trang trí không chiếm chỗ). Kho đầy thì đồ thu hoạch chỉ để trong giỏ. Ai đang vượt sức chứa khi chuyển bản lưu thì giữ nguyên. Hàng giao online, quà và hàng sạp trả về **luôn vào kho** dù đầy.
- **Đồ tươi hư dần** (tính bằng giờ vườn chạy, **chỉ lúc chủ vườn đang chơi; chạy bù offline không hư**, ADR 0018):

| Loại | Kho thường | Kho lạnh |
|---|---|---|
| Rau, củ | ~6 giờ | ~30 giờ |
| Trái cây | ~12 giờ | ~60 giờ |
| Trứng | ~8 giờ | ~40 giờ |
| Sữa | ~4 giờ | ~20 giờ |
| Cá | ~3 giờ | ~15 giờ |
| Hạt giống, lông, tơ, đồ đã chế biến | Không hư | Không hư |

- **Đồ hư thành rác hữu cơ**, bỏ vào hố ủ được. Đồ sắp hư hiện viền vàng và số giờ còn lại.
- **Kho lạnh** là công trình riêng, có sức chứa riêng, tốn tiền điện.

### 3.3c Máy chế biến (đã chốt)
- **Mỗi máy là một công trình:** bỏ nguyên liệu vào, chờ, lấy thành phẩm ra.
  - Hàng chờ 2 / 4 / 6 lượt theo cấp máy.
  - Máy chạy cả khi offline. Máy chạy điện thì tốn tiền điện.
- **Thành phẩm** bán giá ×1.5–2 so với nguyên liệu, không bị hư, có giá chợ riêng.

| Máy | Cấp | Đầu vào → Đầu ra | Thời gian |
|---|---|---|---|
| 🌾 Cối xay | 4 | Lúa → Gạo · Bắp → Bột bắp | 10 phút |
| 🧀 Máy làm phô mai | 7 | Sữa bò hoặc sữa dê → Phô mai | 20 phút |
| 🧵 Khung dệt | 8 | Lông cừu hoặc lông thỏ → Vải · Kén → Lụa | 30 phút |
| 🍯 Máy quay mật | 10 | Tổ ong → Mật ong + Sáp ong | 10 phút |
| 🫙 Hũ muối dưa | 5 | Cải, dưa leo, su hào → Dưa muối | 30 phút |
| 🥜 Máy ép dầu | 9 | Đậu phộng → Dầu phộng | 20 phút |
| 🧼 Nồi nấu xà phòng | 6 | Dầu phộng + Sáp ong → Xà phòng | 15 phút |
| 🧥 Máy may | 11 | Vải → Áo len, quần áo · Lụa → Áo dài | 40 phút |
| 🌽 Máy trộn cám | 6 | Lúa/bắp → cám gà vịt · bắp + khoai lang → cám heo · rơm + bắp → cỏ khô bò cừu · bắp + trứng → thức ăn chó mèo | 10–15 phút |
| 🍳 Bếp (trong nhà) | Có sẵn | Công thức nấu ăn: hồi thể lực, giao đơn đặc biệt | 2–10 phút |

- **Máy trộn cám** rẻ hơn mua ở Bà Tư khoảng 30–50% (tính theo giá bán của nông sản đầu vào), đổi lại tốn thời gian. Bà Tư vẫn bán như cũ.
- **Máy ấp 3 cấp:** ổ ấp đứng riêng thành "Máy ấp", nâng ở tiệm rèn. Cấp 1: 1 trứng, thời gian như cũ. Cấp 2: 3 trứng, ×0,75 thời gian, tốn điện. Cấp 3: 6 trứng, ×0,5 thời gian, tốn điện, nhận cả trứng ngỗng. Ổ ấp tự động ở chuồng gia cầm cấp 3 giữ nguyên.
- **Máy gắn cố định** (không thay thợ, gắn như tưới nhỏ giọt): **máng trứng lăn** gắn vào chuồng gia cầm, trứng đẻ trong chuồng tự vào kho (trứng đẻ ngoài vườn khi thả rông vẫn phải nhặt tay); **máy gặt** gắn vào khối ruộng 3×3, tự hái khi chín và cất vào kho, không gieo lại, tối đa ★2. Cả hai tốn điện và có hao mòn.
- **Công thức bếp** mở dần qua sổ công thức: hàng xóm cho, đơn hàng thưởng, mua ở chợ. Ví dụ: Trứng chiên, Canh rau muống, Cơm gà, Bánh bí ngô, Chè đậu, Sinh tố dâu.

### 3.3d Hao mòn & sửa chữa (đã chốt)
- **Có hao mòn:** máy móc, bù nhìn, hàng rào, nhà kính. Chuồng trại, nhà ở và đồ trang trí không hao mòn.
- **Độ bền 100%:**
  - Mỗi lần dùng mất một ít. Bão làm mất thêm 10–30% với đồ ngoài trời.
  - Dưới 30%: hiện cờ lê vàng, máy chạy chậm.
  - Về 0%: hỏng, ngừng chạy, không mất đồ.
- **Sửa chữa:**
  - **Tự sửa:** tốn gỗ, đinh và thể lực, hồi tới 80%.
  - **Thuê thợ:** tốn ~10–15% giá mua, hồi 100%, mất nửa ngày game.
- **Mục tiêu cân bằng:** sửa chữa cộng điện nước chiếm khoảng 15–25% thu nhập.

### 3.4 Hố ủ phân
- **Bỏ vào:** cây héo, cây chết, phân chuồng, phân chó, rong rêu.
- **Lấy ra:** vài ngày sau thành phân bón.

---

## 4. Nhân công

- **Nơi thuê:** bảng ở cổng làng.

| Thợ | Việc |
|---|---|
| Bé Tí | Tưới nước, nhổ cỏ, bắt sâu |
| Cô Lan | Cho ăn, nhặt trứng, vắt sữa, tắm vật nuôi |
| Chú Chín | Thu hoạch, gieo lại đúng loại hạt cũ |
| Anh Bảy | Bảo vệ ca đêm, bắt trộm |

- **Trả công:** theo **buổi** (sáng 6–12h, chiều 12–18h, tối 18–24h) hoặc **cả ngày** (rẻ hơn khoảng 20%). Tiền trừ lúc bắt đầu ca; không đủ tiền thì thợ không tới.
- **Thợ đi lại thật trên bản đồ.** Người chơi có thể khoanh khu vực làm việc cho từng người.
- **Thể lực và tâm trạng:**
  - Thợ mệt thì **ngủ gật dưới gốc cây**, phải tới đánh thức.
  - Trả đúng hạn và thưởng thêm thì thợ chăm hơn. Nợ lương thì thợ nghỉ việc.
  - Thợ làm lâu thì **lên cấp** và làm nhanh hơn.
- **Thợ xài đồ trong kho của bạn.** Hết đồ thì thợ báo: *"Chủ ơi hết cám gà rồi!"*.
- **Trộm bị bắt** có thể bị phạt làm thợ không công 1 ngày (xem mục 6).

**Đã chốt:**
- **Thợ làm cả khi chủ offline**, trong khoảng 8 tiếng chạy bù. Vườn đóng băng thì thợ nghỉ và không tính lương.
- **Hợp đồng theo ca, tự gia hạn:** ví dụ ca sáng và chiều trong 5 ngày game.
  - Đầu mỗi ca tự trừ tiền. Hết tiền thì thợ không tới, gửi thư báo vào hộp thư.
  - Hủy hợp đồng lúc nào cũng được, không mất phí.
- **Số thợ tối đa:** 1 + 1 cho mỗi 8 cấp người chơi, tối đa 4 người.
- **Thể lực thợ:** 60 điểm mỗi ca, hết thì ngồi nghỉ. Lên cấp thì có thêm thể lực và làm nhanh hơn.
- **Thợ cấp 3 trở lên** tính là "bàn tay người", nên ra được ★3. Thợ mới chỉ tối đa ★2.
- **Thợ cho ăn được nhưng không chữa bệnh được.**
- **Báo cáo cuối ca** hiện trong màn "Trong lúc bạn vắng nhà…".
- **Lương:** khoảng 60% giá trị thợ làm ra.

| Thợ | Lương mỗi ca (cấp 1) | Mở ở cấp người chơi |
|---|---|---|
| Bé Tí | 30 xu | 5 |
| Cô Lan | 45 xu | 8 |
| Chú Chín | 60 xu | 12 |
| Anh Bảy | 50 xu, chỉ ca tối | 10 |

  - Mỗi lần thợ lên cấp: lương +20%. Thuê cả ngày (3 ca) rẻ hơn ~20%.
- **Không thuê bạn bè online làm thợ.** Thay vào đó có **"đổi công"**: giúp nhau đủ nhiều lần thì cả hai được Tiếng tăm ⭐.

---

## 5a. Cấu trúc thế giới (đã chốt)

Bỏ ý tưởng "Đất sau nhà" làm bản đồ riêng. Thế giới gồm 3 kiểu bản đồ:

| Bản đồ | Nội dung | Ai thấy |
|---|---|---|
| 🏡 Vườn nhà | Ban đầu chỉ dùng được vùng 24×20 ô ở giữa. Mua mở rộng từng dải ra 4 phía, tối đa 64×48 ô. Hồ, cây ăn trái, ruộng, chuồng đều đặt tự do. | Chủ vườn và bạn bè ghé thăm |
| 🏠 Trong nhà | Nội thất 1–2 tầng | Chủ nhà và bạn bè được mời |
| 🏘️ Làng (bản đồ chung) | Chợ, tiệm rèn, trạm thú y, hội chợ, quán cà phê, bảng tin, bưu điện, cổng vào vườn của từng người | Mọi người online |

- **Mở rộng đất:** giá tăng dần, cần cấp tối thiểu. Dải mới có cây bụi và đá, phải dọn mới dùng được. Dọn tốn thể lực, được gỗ và đá.
- **Đi lại:** ra cổng vườn thì vào làng. Trong làng đi tới cổng vườn của bạn bè thì vào vườn đó. Chuyển bản đồ có hiệu ứng mờ dần.
- **Sạp hàng và chỗ bán nông sản dời ra chợ làng.** Trong vườn chỉ còn **thùng giao hàng**: bỏ đồ vào, sáng hôm sau lái buôn tới lấy và trả tiền.
  - Thùng giao hàng trả **80% giá chợ** của sáng hôm sau.
  - Bán ở chợ được 100%, mặc cả được thêm 0–10%.
  - Rớt giá do bán nhiều áp dụng cho cả hai cách.
- **Chợ mở 6h–18h.** Quán cà phê và hội chợ mở tới khuya.
- **Chơi offline vẫn có làng** nhưng chỉ có NPC. Cổng vào vườn bạn bè khóa lại, có biển "Đăng nhập để thăm bạn bè".
- **Bảng tin làng:** online có bảng xếp hạng, thời tiết, giá chợ, lễ hội. Offline chỉ có giá chợ, thời tiết, lễ hội.

## 5. Hồ cá và vườn cây ăn trái (đặt trong vườn nhà)

### 5.1 Hồ cá
- **Đào hồ**, sau đó mở rộng hồ được.
- **Mua cá giống:** cá rô, cá trê, cá chép. Sau đó có **cá Koi** (chỉ để ngắm, tăng vui cho cả trại).
- **Cá có 3 cấp:** cá bột → cá giống → cá trưởng thành. Cho ăn bằng cám cá.
- **Nước hồ:** bẩn dần, rong rêu mọc, cá chậm lớn hoặc bệnh. Phải vớt rong. Phân vịt làm cá lớn nhanh nhưng cũng làm nước bẩn nhanh.
- **Thu hoạch:** kéo lưới bắt cá trưởng thành.
- **Câu cá:** minigame bấm đúng nhịp, có cá hoang, thỉnh thoảng câu dính ủng cũ.
- **Ếch** sống ở hồ, ăn sâu ở ruộng gần hồ.
- **Nhịp độ (đã chốt):**
  - Hồ đào theo khối, nhỏ nhất 3×3 ô, nối thêm được. Mỗi ô nước tối đa 2 con cá.
  - Cá lớn qua 3 cấp trong khoảng 3–8 giờ, tùy loài.
  - **Độ sạch nước 0–100:** giảm theo số cá, cám thừa, phân vịt. Dưới 40 thì cá chậm lớn, dưới 20 thì cá dễ bệnh.
  - Làm sạch bằng cách vớt rong (bỏ vào hố ủ) hoặc thả ốc.
  - Câu được trong hồ nhà và ở **sông làng** (có cá hiếm theo mùa).

### 5.2 Vườn cây ăn trái
Cây lâu năm, trồng một lần, thu hoạch nhiều lần.

| Cây | Cấp người chơi | Ghi chú |
|---|---|---|
| Chuối | 4 | Ra buồng, chặt buồng |
| Ổi | 6 | |
| Cam | 8 | Hợp mùa đông |
| Xoài | 10 | Hợp mùa hè |
| Mít | 13 | Trái to, nặng |
| Sầu riêng | 16 | Đắt nhất, rụng trái tự nhiên |

- **3 cấp:** cây con → cây non → cây cho trái. Mỗi cây có bộ hình riêng.
- **Thu trái:** rung cây cho trái rơi rồi nhặt. Trái bỏ lâu dưới đất thì có ruồi và hỏng.
- **Chăm cây:**
  - Tỉa cành thì sai trái hơn.
  - Sâu đục thân, nếu không chữa thì cây yếu dần.
  - Bão có thể gãy cành.
- **Sóc** tới trộm trái, giống quạ ở ruộng. Mèo đuổi được sóc.
- **Nhịp độ (đã chốt):**
  - Từ cây con tới lúc cho trái lần đầu: 2–6 giờ. Sau đó cứ 1–3 giờ ra một đợt 3–8 trái. Đúng mùa thì gấp đôi.
  - Cây không chết vì già. Không tỉa cành trong 10 giờ thì ra ít trái hơn.
  - Mỗi cây chiếm khối 2×2 ô. Cỏ không mọc dưới gốc, chó mèo thích nằm dưới bóng cây.
- **Ong và tổ ong:** cho mật, và thụ phấn nên cây ăn trái gần đó sai trái hơn.

---

## 6. Trộm và chó canh nhà

### 6.0 Dạy lệnh cho chó (đã chốt)
- Dạy khi chó ở giai đoạn nhỡ hoặc trưởng thành. Mỗi buổi tốn 1 bánh thưởng, mỗi ngày game chỉ dạy được 1 buổi.
- Chó vui thì học nhanh. Chó đói hay buồn có thể bỏ giữa chừng.
- Buổi dạy là minigame: bấm đúng lúc chó làm đúng động tác thì khen.

| Lệnh | Số buổi | Tác dụng |
|---|---|---|
| 🪑 Ngồi | 2 | Lệnh nền, phải học trước. Đứng yên tại chỗ. |
| 🚶 Đi theo | 3 | Đi sát người chơi, kể cả khi sang làng hay vườn bạn |
| 🛡️ Canh khu | 4 | Gác một chỗ người chơi chọn, bán kính phát hiện trộm ×2 |
| 🐑 Lùa | 5 | Lùa về chuồng theo lệnh, và tự lùa lúc chạng vạng |
| 👃 Tìm trứng | 4 | Đánh hơi tìm trứng đẻ giấu trong bụi |
| 🐦 Đuổi chim | 3 | Tự đuổi quạ, diều hâu, sóc |

- **Mèo không dạy được lệnh**, chỉ có hành vi tự nhiên.
- **Thú cưng cảnh** học trò biểu diễn theo cùng cách dạy, không có tác dụng gameplay.

### 6.1 Trộm

- **Ba loại trộm (NPC):**
  - **Thằng Tèo:** trộm rau, đi lúc đêm.
  - **Tí Sún:** trộm trứng.
  - **Chồn hương:** bắt gà vịt ngủ ngoài chuồng, chỉ ra vào nửa đêm.
- **Chó phát hiện trộm (đã chốt)** — áp dụng cho cả trộm NPC lẫn bạn bè online:
  - **Bán kính:** chó nhỡ 4 ô, trưởng thành 6 ô, già 4 ô.
    - Vui dưới 50 thì bán kính giảm một nửa. Đói dưới 30 thì không canh.
    - Lệnh "Canh khu" nhân đôi bán kính tại chỗ gác.
  - **Chó ngủ gật** khoảng 30% thời gian ban đêm, có biểu tượng 💤. Lúc ngủ chỉ phát hiện trộm ở sát bên (1 ô). Trộm online nhìn thấy chó đang ngủ.
  - **Khi phát hiện:** bong bóng **"GÂU GÂU!"**, màn hình rung nhẹ, thông báo chỉ hướng (*"Mực đang sủa ở góc ruộng!"*). Chủ vườn nhận thông báo nếu đang online.
  - **Đuổi theo** với tốc độ ×1.3 người đi bộ. Trộm gần lối ra thì thoát được. Bị đuổi kịp thì rơi hết đồ trộm, đứng hình 3 giây, nộp phạt cho chủ vườn.
- **Mẹo của trộm:**
  - **Xúc xích:** chó có độ no dưới 50 thì chắc chắn ăn và im lặng 60 giây. Chó đang no vẫn có 30% tham ăn. Chó đã học đủ 6 lệnh thì không ăn đồ người lạ.
  - Đi rón rén vào đêm mưa, chó khó phát hiện hơn.
- **Phòng thủ:**
  - **Xích chó:** chạy được trong bán kính 3 ô quanh chuồng chó, vẫn sủa báo động, ít ỉa bậy.
  - **Thả rông:** đuổi trộm khắp trại, ỉa bậy khắp nơi.
  - **Ngỗng:** phát hiện trong 3 ô, kêu báo động và mổ đuổi một đoạn ngắn. Không bắt được trộm, nhưng làm trộm hái chậm gấp đôi.
  - Đèn lồng, hàng rào, chuông cửa.
- **Bắt được trộm thì chọn:** bắt đền 20–60 xu, hoặc phạt làm thợ không công ngày hôm sau (mỗi tuần làng tối đa 1 lần).
- **Tần suất trộm NPC (đã chốt):**
  - Trung bình 1 vụ mỗi 2 đêm, và chỉ khi có đồ đáng trộm: Tèo cần ≥3 ô chín, Tí Sún cần ≥3 trứng dưới đất, Chồn cần có con vật ngủ ngoài chuồng.
  - Vườn càng giàu thì càng thường, tối đa 1 vụ mỗi đêm. Đèn, hàng rào và chó làm giảm tần suất.
  - Đêm đó đã có bạn bè online sang trộm thì trộm NPC không tới.
  - **Trộm tiến bộ dần:** bị bắt nhiều lần thì Tèo mua đèn pin, giày êm, đi lặng lẽ hơn.

---

## 6b. Cư dân làng (đã chốt)

| Cư dân | Vai trò |
|---|---|
| Bà Tư | Bán hạt giống, vật tư ở chợ |
| Ông Sáu | Thợ rèn: nâng cấp công cụ, sửa chữa |
| Cô Út | Bác sĩ thú y: thuốc, vắc-xin, cứu con vật nguy kịch |
| Chú Ba | Lái buôn: mua con vật, lấy hàng ở thùng giao hàng |
| Chị Hai | Chủ quán cà phê, cho công thức nấu ăn |
| Dì Năm | Thợ may: quần áo, may đồ theo yêu cầu |
| Anh Tám | Chủ hội chợ: trò chơi, loto |
| Bé Bi | Đơn hàng "khó tính" |
| Bé Tí, Cô Lan, Anh Bảy, Chú Chín | Nhân công cho thuê |

- **Độ thân ❤️1–5 với cư dân:** tăng khi giao đơn hàng của họ, tặng quà đúng sở thích (mỗi người có món thích và món ghét), chào hỏi mỗi ngày.
  - Thưởng: giảm giá ở cửa hàng của người đó, công thức mới, đơn hàng giá cao, sự kiện riêng.
- **Cư dân đứng ở chỗ cố định**, chỉ đi loanh quanh gần đó, không có lịch sinh hoạt.
- **Đơn hàng:** tối đa 3 đơn trên bảng, người đặt là cư dân thật. Giao đơn thì tăng độ thân.
- **Đơn việc** (nằm chung bảng, không xin sản phẩm): Chú Ba cần 1 heo ≥ 90 kg (giao con vật, giá cao hơn bán thường); Cô Út nhờ chó biết lệnh "Bắt tay" ra biểu diễn; nhà Bà Tư có chuột nên mượn mèo một buổi (mèo đi vắng, về mang theo quà). Thưởng xu và EXP, ❤️ nối ở đợt 4C.

## 7. Chơi online

### 7.1 Tính năng
- **Tài khoản:** tên + mã PIN, giống bản `server.js` cũ. Có thể thêm đăng nhập bằng mã mời.
- **Bạn bè:** thêm bạn bằng tên hoặc mã kết bạn. Danh sách bạn hiện cấp, trạng thái online, và biểu tượng "🍅 có đồ chín" hoặc "🐛 cần giúp".
- **Ra Cổng → đi qua làng → vào vườn bạn.** Người chơi đi bộ thật trên vườn của bạn.
- **Thấy nhau real-time:** thấy nhân vật của nhau đi lại, có bong bóng chat nhanh và biểu cảm (👋 ❤️ 😂 😡).
- **Việc làm được ở vườn bạn:**
  - **Giúp đỡ:** tưới, nhổ cỏ, bắt sâu, đuổi quạ giúp. Được ít xu và EXP, chủ vườn nhận thông báo cảm ơn. Giới hạn số lần giúp mỗi ngày.
  - **Tặng quà:** để lại hạt giống, sản phẩm. Ký **sổ lưu bút** ở cổng.
  - **Đi dạo:** ngắm vườn, vuốt ve chó mèo của bạn (chó lạ thì phải cho ăn mới chịu).
  - **Trộm 😈:**
    - Hái trộm cây đã chín hoặc nhặt trộm trứng.
    - **Giới hạn:** mỗi ô chỉ bị trộm tối đa một phần sản lượng (chủ luôn còn lại phần lớn). Mỗi người chỉ trộm 1 lần mỗi ô.
    - **Nếu vườn có chó trưởng thành, đang no và vui:** chó phát hiện thì sủa, đuổi theo. Bị chó đớp thì **rơi hết đồ vừa trộm**, đứng hình vài giây và phải nộp phạt cho chủ vườn.
    - Vườn **không có chó**, hoặc chó đang đói hay đang ngủ: trộm dễ hơn nhiều.
    - Ném xúc xích để dụ chó cũng dùng được với chó của bạn bè.
    - Chủ vườn thấy nhật ký: *"Hùng đã trộm 3 cà chua lúc 2h sáng 😤"*, có thể **qua trộm lại** để trả đũa.
- **Luật trộm và giúp (đã chốt):**
  - **Ai vào vườn ai cũng được.** Danh sách bạn bè chỉ để ghim lên đầu và nhận thông báo.
  - **Trộm được:** cây chín, trứng dưới đất, sữa và lông đang chờ lấy, trái cây.
  - **Không trộm được:** con vật, trái khổng lồ, đồ trong kho và trong nhà, cá.
  - **Giới hạn:**
    - Mỗi ô hay mỗi con tối đa 25% sản lượng.
    - Mỗi người 1 lần mỗi ô hay mỗi con.
    - Mỗi vườn mỗi ngày ngoài đời mất tối đa 30% tổng giá trị đồ chín.
  - **Bảo vệ người mới:** chủ vườn dưới cấp 5 không bị trộm. Phải từ cấp 5 mới đi trộm được.
  - **Giúp:** tối đa 10 việc mỗi vườn mỗi ngày. Chủ vườn nhận thông báo.
  - **Nhật ký:** chủ vườn xem ai trộm gì, lúc mấy giờ. Có nút "Sang trộm lại 😤" đi thẳng tới vườn kẻ trộm.
- **Thành tựu xã hội:** "Hàng xóm tốt bụng" (giúp 50 lần), "Siêu trộm" (trộm 30 lần không bị chó đớp), "Vườn bất khả xâm phạm" (chó đuổi 20 kẻ trộm).

### 7.2 Kiến trúc đề xuất
- **Server Node giữ dữ liệu, chưa cần dùng thêm thư viện:**
  - SQLite (`node:sqlite`) lưu tài khoản, vườn, nhật ký, bạn bè.
  - HTTP cho các thao tác.
  - **SSE (server-sent events)** để đẩy cập nhật real-time: vị trí người chơi, sự kiện trộm/giúp. Node chưa có sẵn WebSocket server, nên SSE + `fetch` là đủ cho quy mô bạn bè.
- **Real-time (đã chốt): WebSocket với thư viện `ws`**, ngoại lệ duy nhất cho nguyên tắc "không thư viện", chỉ phía server.
  - Vị trí gửi 6 lần mỗi giây, trình duyệt nội suy cho mượt. Chỉ gửi cho người ở cùng bản đồ.
  - Đăng nhập, lưu vườn, mua bán vẫn qua HTTP.
  - Rớt mạng thì tự kết nối lại, trong lúc đó vẫn chơi được trong vườn mình.
  - *Dòng "SSE" ở trên không còn dùng.*
- **Ai giữ dữ liệu (đã chốt: kết hợp)** — chi tiết ở các gạch đầu dòng ngay dưới. Chủ vườn online gửi bản lưu lên server khoảng mỗi 10 giây. Thao tác của khách được đẩy sang trình duyệt chủ vườn ngay lập tức.
- **Logic game dùng chung:** `state.js` vốn thuần JS, nên chạy được cả trên trình duyệt lẫn trên server.
  - **Chủ vườn đang online:** trình duyệt của chủ chạy mô phỏng và gửi bản lưu lên server định kỳ, như bây giờ chỉ là lưu lên server thay vì `localStorage`.
  - **Khách thao tác** (giúp, trộm): server kiểm tra trên bản lưu mới nhất rồi xếp vào hàng đợi. Trình duyệt của chủ áp dụng ở lần đồng bộ kế tiếp.
  - **Chủ vườn offline:** server tự chạy bù thời gian bằng chính `state.js` rồi áp dụng thao tác của khách.
- **Thời gian online luôn x1.** Nút x5/x20 chỉ còn trong chế độ chơi offline hoặc chế độ thử nghiệm.
- **Chống gian lận nhẹ:** vì chỉ chơi với bạn bè, server chỉ kiểm tra các con số hợp lý (xu không tăng vọt, không trộm quá giới hạn). Không cần chống gian lận chặt.
- **Tài khoản & thiết bị (đã chốt):**
  - **Đăng ký:** tên nhân vật (duy nhất trong làng) + PIN 6 số + mã mời dùng một lần.
  - **Quên PIN:** quản trị đặt lại bằng lệnh trên server.
  - **Mỗi tài khoản chỉ 1 thiết bị chơi tại một thời điểm.** Đăng nhập ở thiết bị mới thì thiết bị cũ tự lưu lần cuối rồi thoát. Server chỉ nhận bản lưu từ thiết bị đang chơi.
  - Đăng nhập được giữ 30 ngày trên mỗi thiết bị.
  - **Lần đầu đăng nhập:** hỏi "Mang vườn này lên làng?" để chuyển bản lưu chơi đơn lên server.
  - **Chế độ offline giữ như cũ** (`localStorage`). Vườn offline và vườn online là hai vườn riêng, không đồng bộ sau lần chuyển đầu.
- **Hosting (đã chốt):** VPS `image.huninna.com`, chạy sau Caddy của `ai_gateway` tại **https://game.huninna.com**.
  - Repo `~/project/ai_game`, deploy bằng `git pull && docker compose up -d --build`.
  - Từ issue 20 container chạy server Node (`server/`, ADR 0010) thay nginx, dữ liệu SQLite lưu trong Docker volume.
  - Khóa gateway `ai-game` chỉ có quyền với `game.huninna.com`, lưu ở `~/.config/ai-game/gateway-key` trên VPS.
- **Đối tượng:** nhóm ≤ 20–30 người quen, đăng nhập bằng tên + PIN + mã mời.
- **`server.js` cũ (hỏng) đã bị xóa** ở issue 20; server viết lại từ đầu trong `server/` theo kiến trúc trên.

---

## 8. Kiểm soát kinh tế (đã chốt hướng)

**Vấn đề:** thu nhập không có giới hạn, còn chi tiêu hầu như chỉ là mua một lần. Xu dồn lên mãi nên mất giá trị và người chơi mất động lực.

**Hướng đã chốt** gồm ba nhánh:

### 8.1 Chi phí sinh hoạt theo tháng
- Hóa đơn **điện, nước** (và lương nhân công, nếu có) tính theo **tháng game**.
- Tiền điện và nước tăng theo những gì người chơi đang dùng: máy bơm, vòi sen, máy phun, đèn, máy chế biến.
- **1 tháng = 7 ngày game** (khoảng 2 tiếng 20 phút ở tốc độ x1), trùng với một mùa.
- **Hóa đơn gửi vào hộp thư ngày 1 của tháng mới.** Người chơi có **3 ngày** để trả.
- **Không trả thì cắt điện:** máy bơm, vòi sen, máy phun, máy chế biến và đèn ngừng chạy. Giếng múc tay vẫn dùng được.
- **Không phạt quá tay:** xu không bao giờ bị âm, đồ không bị tịch thu. Trả xong nợ cộng thêm **phí đóng điện lại** khoảng 10% là máy chạy lại.
- **Khi offline:** máy vẫn chạy thì vẫn tính tiền điện. Tắt máy trước khi nghỉ thì không mất tiền.

### 8.2 Được mùa mất giá
- Một nông sản bị bán ra quá nhiều thì rớt giá, sau đó hồi lại dần. Online thì tính chung cả làng.
- Có sự kiện ngẫu nhiên **"được mùa mất giá"**: một loại cây rớt giá mạnh trong vài ngày. Ngược lại có **"mất mùa được giá"**: một loại cây khan hiếm nên tăng giá.
- **Kho lạnh** để trữ hàng chờ giá lên.
- **Con số cụ thể (đã chốt):**
  - **Rớt giá do bán nhiều tính riêng cho từng người.** Mỗi món có "sức mua", ví dụ 30 cái; món hiếm và đắt thấp hơn (dưa hấu 10 cái).
    - Vượt sức mua thì mỗi cái bán thêm giảm 2%, thấp nhất còn 50%.
    - Sức mua hồi lại trong khoảng 2 ngày game.
  - **Sự kiện được mùa / mất mùa tính chung cho cả làng:** mỗi mùa 2–3 sự kiện, mỗi sự kiện kéo dài 2–3 ngày game.
  - **Kho hiển thị:** giá hôm nay, số còn bán được đủ giá, và mũi tên ↑↓ cho biết xu hướng giá.

### 8.3 Hội chợ ở làng (trò chơi mất phí)
- Trả xu để chơi. Thắng thì được nhiều xu hoặc vật phẩm hiếm. Thua thì mất phí, không được gì.
- **Tỉ lệ thắng thấp** kiểu loto. Tính trung bình thì nhà cái luôn có lời, nên hội chợ là chỗ **hút xu ra khỏi nền kinh tế**.
- **Các trò (đã chốt):**

| Trò | Giá | Cách chơi | Phần thưởng | Trả lại trung bình |
|---|---|---|---|---|
| 🎱 Loto làng | 20 xu/vé | Chọn 3 số từ 1–30, quay lúc 20h mỗi ngày game | 3 số: giải độc đắc cộng dồn · 2 số: 100 xu · 1 số: 1 vé miễn phí | ~25% |
| ⭕ Ném vòng | 10 xu / 3 vòng | Kỹ năng: canh lực và hướng | Gấu bông, đồ trang trí độc quyền | ~70% |
| 🥫 Bắn lon | 15 xu | Kỹ năng: bấm đúng lúc | Xu, hạt giống hiếm | ~60% |
| 🎡 Vòng quay | 30 xu | May rủi | 1% đồ siêu hiếm, còn lại quà an ủi | ~40% |

  - **Giải độc đắc:** khởi điểm 2.000 xu, cộng thêm 50% tiền vé. Online thì cả làng chung một giải. Người trúng được hiện trên bảng tin. Tỉ lệ trúng ~1/4.000 mỗi vé.
  - Tối đa 10 vé loto mỗi ngày game.
- **Chỉ dùng xu trong game.** Không bao giờ bán xu bằng tiền thật, để đây không phải là cờ bạc thật.

### 8.4 Các chỗ tiêu xu khác (đã đồng ý)
- Mục tiêu đắt tiền: nâng cấp nhà, mở "Đất sau nhà", con vật hiếm, đồ trang trí và quần áo hiếm để khoe với bạn bè.
- Đồ hao mòn dần, phải trả tiền sửa.
### 8.5 Tiếng tăm ⭐ (đã chốt)

| Nguồn | ⭐ |
|---|---|
| Giúp bạn bè (đổi công) | +1 mỗi lần, tối đa 10 mỗi ngày |
| Đơn hàng khó tính của Bé Bi | +3–5 |
| Thành tựu | +5–20 |
| Thắng giải lễ hội | +10–30 |
| Lên ❤️5 với một cư dân | +10 |
| Lên cấp thành thạo 3 cho một loại cây | +5 |
| Nhiệm vụ hằng ngày | +1–2 |
| Uy tín shop 🏪 cao (mục 8.6) | +2 mỗi tuần ở 🏪4, +5 mỗi tuần ở 🏪5 |

- **Tiêu ở "Tiệm Danh Giá":** kiểu nhà đặc biệt, màu lông hiếm cho thú cưng, đồ trang trí độc quyền, danh hiệu dưới tên nhân vật, bản thiết kế máy cấp cao.
- **Quy tắc:** không đổi qua lại với xu, không trộm được, không tặng được. Chế độ offline vẫn kiếm được từ mọi nguồn trừ giúp bạn bè.

### 8.6 Chợ và sự kiện làng (đã chốt, Phase 4)

Mọi mốc giờ trong mục này tính theo **giờ ngoài đời (giờ Việt Nam)**, vì 1 ngày game chỉ dài 20 phút.

**Bán gì cho nhau.** Người chơi chỉ mua của nhau thứ mình không tự có hoặc tốn nhiều thời gian mới có: con giống và trứng phôi đã soi · hàng ★ (cho đơn hàng, hợp tác xã, hội chợ) · hạt giống hiếm (tách từ cây ★ / trái khổng lồ) · cây trồng vượt cấp người mua · hàng trái mùa · phân ủ, phân chuồng. Người bán được giá cao hơn thùng giao hàng (80%), người mua đỡ thời gian.

**Giá bán giữa người chơi** (chợ phiên, livestream): người bán tự đặt trong khoảng **50%–200% giá gốc**; hàng không có ở chợ thì game tự tính giá gốc. Giới hạn này để không chuyển xu cho nhau qua giá ảo (giữ luật chống gian lận).

#### Chợ online
- App **"Chợ Làng Online"**, hiện chạy dưới tên **Đặt hàng online** (nút 🛒 "Mua hàng" trên thanh dưới và trong điện thoại), mở từ **cấp 3**. Chơi đơn và online đều dùng được.
- Bán hạt giống, vật tư, thức ăn, trang trí của **Bà Tư** và đồ thú y của **Cô Út** (cùng giá + phí giao). Chỉ có ở chợ: hàng giảm giá hôm nay, hạt theo mùa vừa về, con vật.
- **Ba kiểu giao** (người chơi chọn trên phiếu, mặc định 2 phút), phí tính theo tiền hàng:

| Kiểu | Hàng tới kho sau | Phí |
|---|---|---|
| Giao ngay | tức thì | 30% |
| Sau 1 phút | 1 phút | 20% |
| Sau 2 phút | 2 phút | 10% |

- **Người giao hàng đi bộ thật** từ cổng tới kho (giờ chợ 6h–18h), hàng vào kho (luôn vào dù kho đầy, ADR 0018). Phí không đổi theo giờ. Mưa bão (Phase 3) chỉ làm hàng tới trễ, có thông báo "Shipper kẹt mưa 🌧️". Mã giảm giá (đợt 4C) áp vào đúng chỗ này.

#### Chợ phiên
- **Có giờ hẹn:** mỗi ngày hai phiên **12h–13h** và **20h–21h**, ở quảng trường làng.
- **Sạp:** từ cấp 5, sạp đầu **4 ô miễn phí**, nâng bằng xu lên 6 rồi 8 ô (sạp đẹp dần). Ai cũng mua được, kể cả người mới.
- Sạp mở **suốt phiên**, người bán đi đâu cũng được; hết phiên hàng chưa bán về kho.
- **Khách NPC** đi chợ mua chậm, chỉ mua món giá ≤ giá gốc. Hàng giá cao chờ người chơi thật.
- **Chơi đơn:** vẫn có chợ phiên với NPC (khách NPC + vài sạp NPC bán con giống, hạt hiếm giá cao).

#### Mùa dịch
- Khoảng **1 đợt mỗi tuần ngoài đời**, ngày ngẫu nhiên, kéo dài **1 ngày ngoài đời**, cả làng cùng lúc, báo trước ~1 giờ ("📢 Sắp có cúm gia cầm").
- Mỗi đợt một nhóm: cúm gia cầm (gà, vịt) · dịch tả heo (heo) · lở mồm long móng (bò, cừu).
- Trong đợt: Chú Ba ngừng thu mua, thùng giao hàng trả giá thấp cho sản phẩm nhóm đó; con thuộc nhóm đó **dễ bệnh gấp 3** (hệ thống bệnh Phase 2). Con **đã tiêm phòng** không sao, sản phẩm có nhãn **"✅ An toàn"**.

#### Livestream bán hàng
- Lên live **lúc nào cũng được**, mùa dịch là lúc cần nhất. Từ **cấp 5**, mỗi lần tối đa **30 phút**, tối đa **3 lần mỗi ngày ngoài đời**.
- **Độ hot 🔥:** tăng khi làm việc thật trong vườn trước người xem (thu hoạch, khoe hàng ★ / "✅ An toàn", tắm heo, vuốt ve gà, nút "📣 Rao hàng"); đứng yên thì tụt, lặp một việc thì tăng ít dần. Thỉnh thoảng hiện **câu hỏi của người xem** ("Trứng này gà ta không shop?"), chọn đúng câu trả lời có sẵn thì độ hot tăng mạnh.
- **Giỏ live:** tối đa 6 món, giá 50%–200%. Bạn xem bấm "🛒 Mua", hàng vào hộp quà ở cổng vườn họ, không phí giao. Người xem NPC đông theo độ hot, tự mua món giá ≤ giá gốc; mùa dịch trả tới **150%** cho hàng "✅ An toàn". Hết live hàng chưa bán về kho.
- **Người xem:** bấm 🔴 LIVE ở cổng vườn hoặc danh sách bạn bè → vào vườn như đi thăm (đi lại, giúp vườn như issue 28), thả ❤️ / biểu cảm (có giới hạn), chat bằng câu có sẵn cho live. Ở lại đủ **3 phút** nhận 1 mã giảm giá, tối đa 3 mã mỗi ngày.
- **Uy tín shop 🏪 (1–5, dùng chung cho live + chợ phiên):** là một **mức đánh giá**, tính theo chất lượng ~20 lần bán gần nhất — tăng khi bán hàng ★ / "✅ An toàn" / con giống khỏe, giảm khi bán hàng héo, thối, con bệnh (khách NPC chê "Trứng hư rồi shop ơi 😤"). Uy tín cao thì live đông người xem NPC hơn, sạp chợ phiên đông khách NPC hơn; hiện cạnh tên ở sạp, live, danh sách bạn bè.
  - **Tách riêng với Tiếng tăm ⭐** (mục 8.5): ⭐ là thứ để tiêu, không bao giờ bị trừ; 🏪 lên xuống theo hàng bán. Liên kết duy nhất: 🏪 cao thì mỗi tuần được thưởng thêm ⭐ (bảng ở 8.5).

#### Hợp tác xã
- Mỗi **tuần ngoài đời** một chỉ tiêu chung 2–3 món theo mùa game đang chạy (ví dụ 500 bắp cải + 200 trứng + 50 sữa), góp ở nhà hợp tác xã trong làng.
- Mỗi món góp được trả **100% giá chợ**. Đủ chỉ tiêu thì cả làng có thưởng (xu, mã giảm giá, đồ trang trí hiếm), góp nhiều được nhiều. Không đủ: không phạt.
- Chỉ tiêu tính theo **số người chơi tuần trước** (có mức tối thiểu), NPC góp thêm ~20%. Chơi đơn có chỉ tiêu nhỏ riêng.

#### Mã giảm giá
- 3 loại: **giảm 10%**, **giảm 20%**, **miễn phí giao** (cả giao tận kho). Chỉ dùng cho **Đặt hàng online** (giảm trên tiền hàng, miễn phí giao thì bỏ phí của kiểu giao đã chọn), 1 mã mỗi đơn, hết hạn sau **3 ngày ngoài đời**, tặng bạn được qua hộp quà.
- Nguồn: xem live đủ 3 phút · thưởng hợp tác xã · một số thành tựu · đăng nhập 7 ngày liền · sự kiện làng.

#### Xe bán hàng rong
- Đặt ở tiệm rèn Ông Sáu, ~800 xu, từ cấp 5. **3 ô hàng**, nâng lên 5.
- Đẩy đi bán khắp làng **lúc nào cũng được** (ngoài giờ chợ phiên). Dân làng NPC ghé mua khi đi ngang chỗ đông (quảng trường, bến xe, cổng chợ); người chơi chạm xe để mua. Chỉ để bán, không chở giao giùm.

#### Hội chợ nông sản (thi)
- Mỗi **tối Chủ nhật 20h–21h** (cùng khung chợ phiên), đi cùng các trò chơi hội chợ ở mục 8.3.
- 3 hạng mục: **trái to nhất** (trái khổng lồ; trước Phase 3 là nông sản ★ đẹp nhất) · **vật nuôi đẹp nhất** (độ thân, độ sạch, sức khỏe) · **rổ nông sản** (5 món, chất lượng + đa dạng).
- Người có mặt bình chọn + giám khảo NPC chấm thêm (làng vắng vẫn có kết quả). Giải nhất, nhì, ba: xu, đồ trang trí hiếm (cúp, bảng vinh danh đặt ở vườn), uy tín.
- **Bài dự thi không mất:** nông sản trưng bày xong trả về kho; vật nuôi dự thi bằng **hồ sơ** (hình, tên, độ thân, sạch, khỏe), con vẫn ở chuồng. Mỗi người tối đa 1 bài mỗi hạng mục.

#### Sự kiện cả làng: diệt chuột, bắt rắn, phun thuốc
- **2 lần mỗi tuần ngoài đời**, rơi vào một khung chợ phiên, báo trước ~1 giờ ("🐀 Chuột sắp tràn về làng lúc 20h!"), kéo dài **20 phút** (1 ngày game). Mỗi lần một loại: nạn chuột (ăn đồ, phá kho) · nạn rắn (rình trứng, gà con) · dịch sâu (tràn ruộng, phải phun thuốc).
- Chuột / rắn / sâu xuất hiện ở **vườn của mọi người** đang chơi trong tuần (nhiều ít theo cỡ vườn). Diệt bằng thao tác có sẵn (đập / đặt bẫy chuột, bắt rắn — chó Mực sủa báo chỗ rắn, phun thuốc), sang **vườn bạn diệt giúp** được (nhất là vườn người offline), mèo tự bắt chuột. Mỗi con diệt được cộng vào **thanh tiến độ chung** của làng.
- **Kết quả:** đủ chỉ tiêu (theo số người chơi) thì mọi người có mặt được thưởng (xu, mã giảm giá, thành tựu "Dũng sĩ diệt chuột 🐀"), diệt nhiều / diệt giúp được thêm, người đứng đầu nhận cúp nhỏ. Con sót lại gây hại nhẹ cho chính vườn đó (chuột ăn vài món trong kho, rắn ăn 1–2 trứng, sâu làm vài ô bị bệnh); không bao giờ chết con vật hay mất cả ruộng. Vườn người offline chỉ bị hại tối đa một nửa.
- Chơi đơn: dân làng NPC cùng diệt, chỉ tiêu nhỏ hơn.

## 8a. Tiến trình (đã chốt)

Giả định người chơi đều đặn khoảng 1 tiếng mỗi ngày:

| Mốc | Thời gian chơi | Mở được |
|---|---|---|
| Cấp 5 | Buổi đầu (~1 giờ) | Heo, bò, thợ đầu tiên |
| Cấp 10 | ~3 ngày | Ong, máy móc, Anh Bảy |
| Cấp 15 | ~1 tuần | Ngựa, nhà kính |
| Cấp 20 | ~2 tuần | Gần đủ mọi loài |
| Cấp 30 | ~1–1,5 tháng | Hết nội dung |
| Cấp 50 (tối đa) | ~3 tháng | Từ cấp 31 chỉ thưởng đồ trang trí, danh hiệu, ⭐ |

- **EXP:** việc khó và hiếm (giao đơn, nuôi lớn con vật, lên cấp thành thạo, trái khổng lồ) cho nhiều EXP. Việc lặp lại (tưới, nhổ cỏ) cho rất ít.
- Công thức `expNeed` sẽ chỉnh lại khi chơi thử cho khớp các mốc trên.
- **Lên cấp:** màn chúc mừng liệt kê mọi thứ vừa mở khóa. Thưởng xu, và mỗi 5 cấp có thêm 1 món đồ.

### Lịch ngoài đời và lịch game (đã chốt)
Một năm trong game chỉ dài khoảng 9 tiếng ngoài đời, nên những thứ cần cảm giác đặc biệt dùng lịch ngoài đời:

| Thứ | Lịch | Chi tiết |
|---|---|---|
| Nhiệm vụ hằng ngày | Ngoài đời, làm mới lúc 0h | 3 nhiệm vụ mỗi ngày. Đủ 7 ngày liên tục thì có quà lớn. |
| Lễ hội lớn | Theo ngày lễ thật, 3–7 ngày | Tết Nguyên Đán, Trung thu, Giáng sinh, Quốc tế Thiếu nhi |
| Phiên chợ hội | Cuối tuần ngoài đời | Hàng lạ, giải thưởng gấp đôi, bảng xếp hạng tuần |
| Mùa, thời tiết, hóa đơn | Lịch game | |

- **Sổ sưu tầm:** cây trồng, trái khổng lồ, con vật, cá (theo mùa), món ăn, quần áo, thành tựu. Mỗi trang hoàn thành thưởng ⭐.
- **Thành tựu:** giữ 12 thành tựu cũ, thêm cho từng hệ thống mới, tổng khoảng 60 cái.

## 8b. Cơ chế khác
- **Chế biến:**
  - Cối xay: lúa → gạo.
  - Máy làm phô mai: sữa → phô mai.
  - Khung dệt: lông cừu → vải.
  - Bếp: nấu bánh để giao các đơn đặc biệt.
- **Thời tiết xấu:**
  - **Bão:** đổ bù nhìn, gãy cành.
  - **Hạn hán:** giếng cạn nhanh.
  - **Sương muối:** hại cây non.
  - Báo trước 1 ngày.
- **Lễ hội:**
  - Tết: thi dưa hấu và trái khổng lồ.
  - Trung thu: thắp đèn lồng.
  - Online thì có bảng xếp hạng giữa bạn bè.
- **Nhiệm vụ hằng ngày.**
- **Sổ sưu tầm:** lần đầu thu hoạch mỗi loại cây, câu mỗi loại cá, nuôi mỗi loại con.

---

## 8c. UI/UX (đã chốt)

### Thông báo 3 mức

| Mức | Ví dụ | Cách hiện |
|---|---|---|
| 🔴 Gấp | Con vật nguy kịch, có trộm, diều hâu, máy hỏng | Băng rôn đỏ, âm thanh, rung, mũi tên ở mép màn hình chỉ hướng |
| 🟡 Quan trọng | Cây chín, hóa đơn, thư, lên cấp, đơn mới | Thông báo nhỏ, tự gộp lại ("5 ô cà chua đã chín") |
| ⚪ Thông tin | Nhặt trứng, bán hàng, giúp xong | Chỉ ghi vào nhật ký |

- **Bảng "Việc cần làm" 📋:** danh sách việc trong vườn xếp theo mức gấp. Chạm vào một dòng thì nhân vật tự đi tới chỗ đó.
- **Bản đồ nhỏ** ở góc: chấm đỏ là chỗ gấp, chấm vàng là chỗ có việc. Chạm để phóng to.
- **Cài đặt** cho tắt từng loại thông báo, trừ mức 🔴.

### Hiệu năng (đã chốt)
- **Mục tiêu:** điện thoại tầm trung 60 khung hình mỗi giây. Điện thoại yếu (~3 năm tuổi) giữ được 30.
- **Chỉ vẽ những gì trong khung nhìn.** Nền tĩnh vẽ sẵn thành từng mảng, chỉ vẽ lại khi đặt công trình.
- **Con vật ngoài màn hình** cập nhật AI 2 lần mỗi giây. Logic trong `tick()` vẫn chạy đủ.
- **Giới hạn:** 30 con thả rông, 8 chuột, 12 người chơi khác hiển thị trong làng. Đông hơn thì chỉ hiện tên mờ.
- **Hiệu ứng hạt** giảm khi khung hình tụt.
- **Chế độ tiết kiệm pin:** khóa 30 khung hình, tắt hiệu ứng hạt, giảm ánh sáng đêm. 10 giây đầu chạy dưới 40 khung hình thì gợi ý bật.
- **Mỗi phase đều thử trên một điện thoại Android tầm thấp thật.**

### Hướng dẫn người mới (đã chốt: mở dần từng hệ thống)
- **Buổi đầu (cấp 1–5):** chỉ có ruộng, gà, chó Mực, thể lực, thùng giao hàng.
  - Chưa có hóa đơn, chuột, trộm, ảnh hưởng của mùa.
  - Con vật được "bảo hộ người mới", không bệnh nặng tới cấp 5.
  - Hướng dẫn từng bước như hiện tại.
- **Mỗi hệ thống mở theo cấp có một nhiệm vụ làm quen 2–4 bước** của một cư dân, có thưởng, bỏ qua được:
  - Cô Út (cấp 3, khi mua heo đầu tiên): tắm, chữa bệnh, vắc-xin.
  - Ông Sáu (cấp 4): sửa đồ, nâng cấp công cụ.
  - Bà Tư (đầu mùa thứ 2): mùa.
  - Chú Ba (cấp 6): giá chợ.
  - Tèo (cấp 5): lần trộm đầu tiên rất nhẹ, kèm hướng dẫn phòng trộm.
  - Hóa đơn đầu tiên có thư giải thích, tháng đầu miễn phí.
- **Sổ tay hướng dẫn** trong túi đồ, có hình minh họa cho từng hệ thống.

## 9. Thứ tự làm (đã chốt)

Làm **nền móng trước, online sau**. Đặt công trình tự do và nhiều bản đồ làm thay đổi cấu trúc bản lưu, nên làm online trên cấu trúc cũ thì phải chuyển bản lưu hai lần. Mỗi phase xong là deploy lên `game.huninna.com`, chơi được ngay.

| Phase | Nội dung |
|---|---|
| 0. Nền móng | Bản lưu v2 + tự chuyển bản lưu cũ · đặt công trình tự do + chế độ xây dựng + mở rộng đất · ruộng theo khối · nhiều bản đồ · mô hình thời gian (đồng hồ, đóng băng, lịch ngoài đời) · thể lực + công cụ · thông báo 3 mức + bảng Việc cần làm |
| 1. Online | Server Node + `ws` + SQLite trong Docker · tài khoản, 1 thiết bị · đồng bộ + server chạy bù · làng (chợ, thấy nhau, chat) · thăm vườn, giúp, trộm + giới hạn · chó phát hiện người chơi |
| 2. Vật nuôi | Vòng đời, đực/cái, dơ/tắm, bệnh/chết, độ thân, bán theo cân · chuồng 3 cấp + cách ly · thả rông, về chuồng, lùa · kẻ săn mồi, mèo · dạy lệnh |
| 3. Cây & nước | 16 loại cây với hình riêng · thành thạo, trái khổng lồ, ★ · mùa, thời tiết xấu · nhà kính · giếng, bồn, ống nước, tự động hóa |
| 4. Kinh tế, làng & loài mới (gộp Phase 6 cũ, 3 đợt 4A/4B/4C, ADR 0017) | **4A:** bản lưu v5 · kho 3 cấp, đồ hư, kho lạnh · sức mua, được mùa/mất mùa · hộp thư, hóa đơn tháng · máy chế biến (gồm máy trộn cám) · hao mòn, sửa chữa · bếp. **4B:** hồ cá, câu cá, ếch · cây ăn trái, dâu tằm · mèo có tác dụng · ong, tằm · 7 loài mới, kéo cày, xe trâu · máy ấp 3 cấp, máng trứng lăn, máy gặt · đơn việc. **4C:** cư dân ❤️ · Tiếng tăm ⭐ · nhân công · hội chợ + loto + thi nông sản · chợ phiên + uy tín shop · livestream · mùa dịch · hợp tác xã · mã giảm giá · xe hàng rong · sự kiện diệt chuột/rắn/sâu (mục 8.6) |
| 5. Nhà | Nội thất, đặt đồ, Nhà đẹp · thú cưng cảnh · quần áo có tác dụng |
| 6. Loài & khu mới | Gộp vào Phase 4 (đợt 4B) |
| 7. Mục tiêu dài hạn | Nhiệm vụ hằng ngày · lễ hội · sổ sưu tầm · ~60 thành tựu · nhiệm vụ làm quen |

### Quy trình mỗi phase (đã chốt)
1. Làm song song bằng **subagent**, chọn model hợp với từng việc.
2. **Test e2e toàn bộ chức năng** của phase (và các phase trước) cho tới khi pass hết.
3. **Deploy** lên VPS.
4. **Test live** trên `https://game.huninna.com` sau khi deploy.

### Test & chia việc (đã chốt)
- **Unit:** `node --test` cho `state.js`, server và việc chuyển bản lưu cũ.
- **E2E: Playwright** (chỉ dùng lúc phát triển).
  - Chạy Chromium ở hai cỡ màn hình: máy tính và điện thoại 360px.
  - **Chế độ test `?test=1`** (chỉ khi chạy local): tua thời gian ×1000, dịch chuyển nhân vật, phát đồ.
  - Test online mở 2 trình duyệt cùng lúc (2 người chơi).
- **Không dùng GitHub Actions. Mọi test chạy trên máy của người phát triển:**
  - Unit và e2e chạy trước khi deploy, nhắm vào server chạy local.
  - Smoke test live chạy sau khi deploy, gửi request từ chính máy đó tới `https://game.huninna.com`.
  - Vì máy dễ thiếu RAM: Chromium chạy headless, mỗi lúc 1 worker. Riêng test online thì 2 trình duyệt.
- **Test live:** smoke test bằng Playwright nhắm vào `https://game.huninna.com`, dùng tài khoản test riêng, tự dọn sau khi chạy.
- **Subagent theo model:**

| Việc | Model |
|---|---|
| Cấu trúc bản lưu v2, đồng bộ online, hợp đồng API giữa module, review + gộp | Opus |
| Từng phần theo file (LOGIC, WORLD, UI, SERVER, ART), mỗi agent một worktree | Sonnet |
| Bảng số liệu, viết test e2e theo kịch bản, chạy test và tóm tắt lỗi | Haiku |

## 11. Danh sách chủ đề cần grill

✅ đã chốt · 🔶 đang bàn · ⬜ chưa bàn

| # | Chủ đề | Các nhánh cần chốt | Trạng thái |
|---|---|---|---|
| A | Thời gian & thế giới | Ngày/tháng/mùa ✅ · thời tiết xấu ✅ · chạy bù khi offline ✅ · đồng hồ chung + x1 khi online ✅ | ✅ |
| B | Cây trồng | Sprite riêng ✅ · thành thạo 3 cấp ✅ · ★ ✅ · danh sách cây + mùa ✅ · ngưỡng thành thạo ✅ · trái khổng lồ ✅ · nhà kính ✅ | ✅ |
| C | Vật nuôi | Vòng đời + tuổi thọ ✅ · hành vi theo cấp ✅ · đực/cái ✅ · dơ/tắm ✅ · bệnh/lây/chết ✅ · độ thân ✅ · bán theo cân ✅ · 11 loài mới ✅ | ✅ |
| D | Thả rông & săn mồi | Vùng đi lại + tự về chuồng ✅ · kẻ săn mồi ✅ · mèo săn ✅ · lùa vào chuồng ✅ | ✅ |
| E | Chó & mèo | Dạy lệnh ✅ · xích/thả ✅ · phát hiện & sủa ✅ · xúc xích ✅ · già ✅ | ✅ |
| F | Công trình | Đặt tự do ✅ · chuồng 3 cấp ✅ · cách ly ✅ · nhà ✅ · kho + đồ hư ✅ · kho lạnh ✅ · hố ủ ✅ · máy chế biến ✅ · hao mòn ✅ | ✅ |
| G | Đất, nước, tự động hóa | Mở đất theo khối ✅ · giếng 4 cấp ✅ · bồn + ống nước ✅ · tưới nhỏ giọt ✅ · phun thuốc ✅ · vòi sen ✅ | ✅ |
| H | Nhân công | Loại thợ ✅ · ca & lương ✅ · làm khi offline ✅ · thể lực/tâm trạng ✅ · lên cấp ✅ · khoanh vùng ✅ · dùng đồ trong kho ✅ · không thuê bạn bè ✅ | ✅ |
| I | Bản đồ & khu vực | 3 bản đồ ✅ · mở rộng đất ✅ · giếng đặt tự do ✅ · làng + chợ ✅ · thùng giao hàng ✅ · đi lại ✅ · hồ & cây ăn trái (chi tiết ở mục 5) | ✅ |
| J | Nhân vật người chơi | Thể lực ✅ · công cụ ✅ · quần áo ✅ · nhà + nội thất ✅ · thú cưng cảnh ✅ · (cấp & EXP chuyển sang N) | ✅ |
| K | NPC & trộm NPC | Tần suất trộm NPC ✅ · cư dân làng ✅ · độ thân với cư dân ✅ · đơn hàng ✅ | ✅ |
| L | Kinh tế | Hóa đơn tháng ✅ · được mùa mất giá ✅ · hội chợ ✅ · ngưỡng rớt giá ✅ · trò chơi cụ thể ✅ · Tiếng tăm ⭐ ✅ | ✅ |
| M | Online | Hosting & đối tượng chơi ✅ · tài khoản & thiết bị ✅ · bạn bè ✅ · thăm vườn ✅ · giúp/trộm ✅ · WebSocket ✅ · ai giữ dữ liệu ✅ · chế độ offline ✅ | ✅ |
| N | Tiến trình & mục tiêu | Đường cong cấp ✅ · mở khóa ✅ · nhiệm vụ ✅ · thành tựu ✅ · lễ hội ✅ · sổ sưu tầm ✅ | ✅ |
| O | UI/UX & hiệu năng | Thông báo 3 mức ✅ · bảng Việc cần làm ✅ · bản đồ nhỏ ✅ · hiệu năng ✅ · hướng dẫn người mới ✅ | ✅ |
| Q | Chợ & sự kiện làng (mục 8.6) | Bán gì cho nhau ✅ · chợ online + 2 gói giao ✅ · chợ phiên (giờ, giá, sạp, NPC, chơi đơn) ✅ · mùa dịch ✅ · livestream (lúc nào, độ hot, giỏ live, người xem, giới hạn) ✅ · uy tín shop 🏪 ✅ · 🏪 tách riêng Tiếng tăm ⭐, 🏪 cao thưởng ⭐ ✅ · hợp tác xã ✅ · mã giảm giá ✅ · xe hàng rong ✅ · thi nông sản ✅ · sự kiện diệt chuột/rắn/sâu ✅ | ✅ |
| R | Phase 4 gộp | gộp 4+6 ✅ · 3 đợt ✅ · v5 một lần ✅ · đồ hư khi online ✅ · bảng số duyệt trước ✅ · máy vs thợ ✅ · máy ấp ✅ · máy trộn cám ✅ · đơn việc ✅ · mèo ✅ · công ✅ · kéo cày ✅ · kho ✅ · chợ online ✅ · art ✅ · online ADR 0019/0020 ✅ | ✅ |
| P | Kỹ thuật & triển khai | Thứ tự phase ✅ · quy trình mỗi phase ✅ · chia agent/file + model ✅ · chuyển save cũ ✅ (mục 7) · test local + live từ máy local ✅ | ✅ |

## 10. Câu hỏi còn mở

Không còn. Ba câu cũ đã chốt: online cho ≤ 20–30 người quen qua Internet, có mã mời (mục 7) · không thuê bạn bè làm thợ (mục 4) · không trộm vật nuôi (mục 7).
