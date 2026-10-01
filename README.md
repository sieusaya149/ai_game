# 🌾 Nông Trại Vui

Game nông trại pixel art 2D nhìn từ trên xuống, kiểu nông trại Avatar ngày xưa. Chơi đơn, chạy hoàn toàn trên trình duyệt, tiến trình lưu trong máy (localStorage).

## Chạy

```bash
npm start            # mở http://localhost:3000
```

Cần Node.js 22.13 trở lên. `server.js` chỉ dùng để phục vụ các file trong `public/`; phần API nhiều người chơi của nó hiện chưa dùng tới.

## Test

```bash
npm install                        # lần đầu
npx playwright install chromium    # lần đầu: tải Chromium cho e2e
npm test                           # unit test (node --test)
npm run test:e2e                   # e2e: tự bật server tĩnh cho public/, chạy máy tính + điện thoại 360px
npm run test:smoke                 # smoke trên https://game.huninna.com (đổi bằng biến SMOKE_URL)
```

Test chạy ở máy local, Chromium ẩn cửa sổ, 1 luồng (không dùng GitHub Actions). Trợ giúp dựng tình huống nằm ở `e2e/helpers.mjs`: ghi sẵn save vào localStorage và tua thời gian (lùi `savedAt` rồi tải lại).

## Deploy

Trên VPS (`image.huninna.com`), repo nằm ở `~/project/ai_game`, chạy sau Caddy của `ai_gateway`:

```bash
git pull && docker compose up -d --build   # game.huninna.com → ai-game:80
```

## Cách chơi

- **Máy tính:** đi bằng phím mũi tên hoặc WASD. `Space`/`E` làm hành động chính, `1`–`6` làm các hành động phụ, `Esc` đóng bảng.
- **Điện thoại:**
  - Chạm vào mặt đất thì nhân vật đi tới đó.
  - Chạm vào ô ruộng hay con vật thì nhân vật đi tới rồi tự làm luôn.
  - Có cần điều khiển ảo ở góc dưới trái.
- **Muốn nhanh:** bấm nút `x1` ở trên để đổi sang x5 hoặc x20.

## Có gì trong game

- **Ruộng:** cuốc đất → gieo hạt → tưới nước (hết nước thì ra giếng múc) → cây lớn qua 5 giai đoạn → thu hoạch.
  - Cỏ dại làm cây chậm lớn. Sâu để lâu thì cây bệnh, bệnh để lâu thì cây chết.
  - Thuốc trừ sâu diệt sâu và chữa bệnh; cũng có thể bắt sâu bằng tay (hên xui).
  - Phân bón tăng sản lượng; thuốc tăng trưởng rút ngắn thời gian chờ.
  - Chín mà không hái thì cây héo.
- **Vật nuôi:**
  - Gà con lớn thành gà mái, đẻ trứng xuống đất. Trứng bỏ quên có thể tự nở; bỏ vào ổ ấp thì chắc chắn nở gà con.
  - Heo con lớn lên. Heo no và vui thì mang bầu, đẻ 1–3 heo con.
  - Bò cho sữa, cừu cho lông.
  - Đổ cám vào máng cho cả chuồng hoặc cho ăn tận tay. Vuốt ve để vật nuôi vui; bệnh thì cho uống thuốc thú y, con non cho uống vitamin để lớn nhanh.
- **Chó Mực:**
  - Lớn dần, cần cho ăn và vuốt ve.
  - Hay ỉa bậy: giẫm phải thì trượt chân, xúc phân thì có thể được phân bón.
  - Chó no và vui sẽ đuổi quạ và trộm.
- **Kẻ phá hoại:**
  - Quạ bay tới ăn cây chín; cắm bù nhìn thì quạ không dám tới.
  - Thằng Tèo lẻn vào trộm ban đêm; bắt được thì nó đền xu.
- **Kinh tế:**
  - Sạp hàng bán hạt, thuốc, thức ăn, con giống, đồ trang trí, mũ và phụ kiện.
  - Nhà kho để bán nông sản.
  - Bảng đơn hàng của hàng xóm, thưởng cao hơn bán thường.
  - Mở rộng ruộng từ 3x3 lên 6x6.
  - Có thành tựu kèm thưởng.
- **Nhân vật:** tự chọn màu da, kiểu tóc, màu tóc, áo, quần, mũ và phụ kiện. Vào nhà để đổi trang phục.
- **Thế giới:** ngày đêm, trời nắng, mây, mưa (mưa tự tưới ruộng). Có hướng dẫn từng bước cho người mới.

## Cân chỉnh

Mọi con số (giá, thời gian, xác suất sâu bệnh, tốc độ lớn...) nằm trong `public/data.js`. Bản đồ nằm trong `public/layout.js`.

## Cấu trúc

```
public/data.js     số liệu cân bằng
public/layout.js   bản đồ, va chạm
public/state.js    luật chơi, lưu/tải (test: node --test tests/*.test.mjs)
public/art.js      toàn bộ pixel art vẽ bằng code
public/render.js   vẽ bản đồ và thực thể
public/world.js    di chuyển, tìm đường, AI con vật/chó/quạ/trộm
public/ui.js       HUD, bảng, tạo nhân vật (+ sound.js: âm thanh tổng hợp)
public/main.js     vòng lặp game, camera, điều khiển
SPEC.md            đặc tả kỹ thuật giữa các module
```
