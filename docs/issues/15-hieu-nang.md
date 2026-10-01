# 15. Hiệu năng trên bản đồ lớn

## Parent

[PRD 0001](../prd/0001-phase-0-nen-mong.md) · DESIGN §8c · User story 69, 70

## What to build

- **Chỉ vẽ trong khung nhìn.**
- **Nền tĩnh chia mảng:** chỉ vẽ lại mảng nào vừa có công trình đặt, dời hay cất.
- **AI ngoài màn hình:** con vật ngoài màn hình cập nhật AI 2 lần mỗi giây. Logic trong `tick()` không đổi.
- **Hiệu ứng hạt** (mưa, lấp lánh) giảm số hạt khi khung hình tụt.
- **Chế độ tiết kiệm pin** trong Cài đặt: khóa 30 khung hình, tắt hiệu ứng hạt, giảm ánh sáng đêm.
  - 10 giây đầu chạy dưới 40 khung hình mỗi giây thì gợi ý bật.
- **Đo thử** trên một điện thoại Android tầm thấp thật, với vườn 64×48 ô đã mở hết và nhiều công trình.

## Acceptance criteria

- [x] Vườn 64×48 ô đầy công trình (bản lưu ghi sẵn): điện thoại tầm thấp thật giữ ≥ 30 khung hình mỗi giây. Ghi lại số đo và tên máy vào issue. **Chỉ giả lập** (người dùng chốt không có điện thoại thật): đo bằng Playwright + giới hạn CPU, số đo ở mục "Số đo" bên dưới.
- [x] Đặt hay dời một công trình chỉ vẽ lại mảng nền liên quan.
- [x] E2E: bật tiết kiệm pin thì cài đặt được lưu lại, tải lại trang vẫn bật.
- [x] E2E: giả lập máy chậm (giới hạn CPU trong Playwright) thì hiện gợi ý bật tiết kiệm pin.

## Blocked by

- [05](05-ban-do-lon-va-mo-rong-dat.md)

## Cách làm (ghi lại)

- `public/perf.js` (thuần, test bằng Node): `dirtyChunks(mapCũ, mapMới)` ra tập mảng 16×16 ô khác nhau (so `ground`, `solid`, `fences`, `mud`; ô đổi thì cả 8 ô quanh nó, vì nền vẽ phụ thuộc ô kế bên), `chunksIn` (mảng trong khung nhìn), `aiStep` (gom thời gian AI ngoài màn hình, 2 lần/giây), `createFps`, `particleBudget`, `shouldSuggestBattery`, `loadPrefs/savePrefs`.
- `render.js`: nền ngoài trời là mảng canvas 256×256 vẽ lười khi cần blit; farm mới (`farm.rev` đổi) mượn lại canvas của mảng chưa bẩn. Bộ đếm `chunkStats().drawn`, lộ ra `__farm.perf.chunksDrawn`. Mọi vòng vẽ (công trình, máng, ổ ấp, chó, bóng đổ, quạ...) đều cắt theo khung nhìn.
- `world.js`: con vật và chó ngoài khung nhìn (`world.view` do `main.js` đặt) chỉ chạy AI 2 lần/giây với dt gom lại; `tick()` không đổi. Tra bụi/đá theo bảng (trước là `find` tuyến tính mỗi khung, O(n²) với vườn đầy bụi).
- Tiết kiệm pin lưu ở localStorage `nongtrai-pref` (`{ battery, hinted }`), riêng của máy, không nằm trong save: khóa 30 khung (`main.js`), không mưa/lấp lánh, không vẽ gradient đèn và đêm bớt tối (0.52 → 0.40). Cài đặt → Hiệu năng → "Tiết kiệm pin".
- Gợi ý: đo FPS các khung hình thật (bỏ khung dài >500ms như tab ẩn); đủ 10 giây mà trung bình <40 thì hỏi một lần (`hinted` lưu lại, hỏi rồi thì không hỏi nữa). Đợi hết màn "vắng nhà"/bảng đang mở mới hỏi.
- Fixture: `bigFarmSave()` trong `e2e/helpers.mjs` dựng bằng `buyStrip`/`placeEntity`/`buyAnimal`: 64×48 mở hết, 8 khối ruộng (72 ô, đều đã chín), chuồng gà + heo, ~240 đồ trang trí, ~630 bụi/đá, 9 con vật. `seedSave` mặc định ghi sẵn `hinted: true` để hộp gợi ý không chen vào các e2e khác (`{ hint: true }` để thử gợi ý).

## Số đo (chỉ giả lập, không có điện thoại thật)

Cấu hình: Chromium headless (Playwright 1.63) trên PC Windows 11, canvas 2D phần mềm; CDP `Emulation.setCPUThrottlingRate`; vườn `bigFarmSave()`; nhân vật đi liên tục 10 giây sau 4 giây khởi động; FPS trung bình các khung vẽ thật. Hai viewport: desktop 1280×800 (dpr 1), mobile 360×740 (dpr 2, cảm ứng). Máy đo hơi nhiễu (RAM thấp), nên ghi khoảng của 2-3 lần chạy.

| CPU giả lập | Tiết kiệm pin | desktop 1280 | mobile 360 |
|---|---|---|---|
| 1× (không giới hạn) | tắt | 60 | 60 |
| 1× | bật | 30 | 30 |
| 4× (≈ tầm trung) | tắt | 35–47 | 43–47 |
| 4× | bật | 28–29 | 28–29 |
| 6× (≈ tầm thấp) | tắt | 18–30 | 28–32 |
| 6× | bật | 20–26 | 22–25 |

Đọc kết quả: ở 4× giữ ≥ 30 (mobile ổn định ~43–47); ở 6× quanh ngưỡng 30 (mobile 28–32). Tiết kiệm pin khóa đúng 30 khi máy đủ mạnh (1×); khi CPU giả lập đã nghẽn thì khóa 30 không cho thêm khung hình (chi phí mỗi khung hình quyết định, phần lớn là việc vẽ canvas và dàn trang DOM không phải JS), nên cột "bật" ở 6× không nhanh hơn. Lợi ích của chế độ này là điện năng trên máy còn dư sức, không phải tăng FPS máy nghẹt. Con số thật trên điện thoại Android tầm thấp **chưa đo** (chỉ giả lập).

Kiểm chứng nền ghép mảng không có đường nối: so từng điểm ảnh nền ghép từ 12 mảng với nền vẽ liền một tấm 1024×768 (cùng thuật toán, một tấm không chia): 0 điểm ảnh lệch, ở vườn mặc định, vườn 64×48 đầy công trình và làng 40×28 (tạm thời, đã bỏ test này). Ảnh chụp 1280 và 360 ở chỗ giáp mảng không thấy đường nối.
