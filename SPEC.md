# Nông Trại Vui: đặc tả kỹ thuật (Phase 0 xong: bản lưu v2, đặt tự do, nhiều bản đồ)

Game nông trại 2D nhìn từ trên xuống, kiểu **nông trại Avatar (TeaMobi)**. Người chơi điều khiển nhân vật đi tới tận nơi để làm mọi việc.
Người chơi hiện vẫn thấy bản chơi đơn, chạy hoàn toàn trong trình duyệt, lưu vào `localStorage`. Từ issue 20 (Phase 1) bản deploy chạy bằng **server Node** trong `server/` (file tĩnh + API HTTP JSON + WebSocket + SQLite, xem mục Server). Mở `public/` bằng server tĩnh bất kỳ vẫn chơi đơn được.

- Chỉ dùng ES modules thuần, **không thư viện, không bước build**. Mọi file game nằm trong `public/`. (Ngoại lệ duy nhất sau này: `ws` phía server ở Phase 1, ADR 0007. Playwright chỉ là thư viện lúc phát triển.)
- Chữ hiển thị cho người chơi: **tiếng Việt có dấu**, giọng vui vẻ, thân thiện kiểu gia đình.
- Comment code: tiếng Việt, ngắn gọn, chỉ khi cần.
- Đồ họa pixel art: canvas có `imageSmoothingEnabled = false`.
- Luật chơi nằm hết trong `state.js` (thuần JS, không DOM) để chạy được trong Node và sau này trên server (ADR 0002, 0005). Phần thế giới/vẽ/UI chỉ gọi API của nó, không tự quyết luật nào.
- Game **không có code nào chỉ dành cho test** (không `?test=1`, không hook). Dựng tình huống bằng bản lưu ghi sẵn (ADR 0008). Lưu ý: `DESIGN.md` mục 9 vẫn nhắc `?test=1`, ADR 0008 là bản chốt sau, ADR thắng.

## Tài liệu liên quan

| Tài liệu | Nội dung |
|---|---|
| [`DESIGN.md`](DESIGN.md) | Thiết kế tổng thể toàn game, thứ tự phase (mục 9), danh sách chủ đề đã grill |
| [`docs/prd/0001-phase-0-nen-mong.md`](docs/prd/0001-phase-0-nen-mong.md) | PRD Phase 0: user story, quyết định, cách test |
| [`docs/adr/`](docs/adr/) | 0001 nền móng trước online sau · 0002 dữ liệu vườn trình duyệt+server · 0003 hai lịch, đóng băng 8 giờ · 0004 offline không gây chết · 0005 đặt tự do, luật đặt nằm trong `state.js` · 0006 VPS sau ai_gateway · 0007 `ws` · 0008 test qua hai seam · 0009 kinh tế chống lạm phát · 0010–0015 (Phase 1–3) · 0016 đổi phiên chơi chờ bản lưu cuối |
| [`docs/issues/`](docs/issues/README.md) | Các issue Phase 0 (01–19) kèm báo cáo từng cái |
| [`README.md`](README.md) | Cách chạy, test, deploy ngắn gọn |

## Các file và việc được sửa

Mọi file trong `public/` đều **được sửa** khi tính năng cần (Phase 0 đã bỏ các ghi chú "chỉ đọc"). Khi sửa, giữ đúng vai trò dưới đây.

| File | Vai trò |
|---|---|
| `public/data.js` | Toàn bộ số liệu cân bằng và các bảng: cây, vật nuôi, vật phẩm, chó, quạ/trộm, ngoại hình, thành tựu, và các bảng của Phase 0: `STAMINA`, `TOOLS`/`TOOL_MAX`/`TOOL_LEVEL`/`GROUP_COST`, `MARKET`, `SHIP_RATE`/`shipValue`, `LAND_STRIP`/`LAND_STRIPS`/`DIR_NAME`, `CLUTTER`/`CLUTTER_RATE`, `FIELD_LIMITS`/`FIELD_PRICES`/`PEN_PRICES`, `NOTIFY_WINDOW`/`NOTIFY_CATS`/`EVENT_LEVEL`, `MAX_CATCHUP_MS`, `SPEEDS`. Thuần dữ liệu và hàm tính từ số liệu |
| `public/layout.js` | Thuần dữ liệu bố cục, **không còn là bản đồ duy nhất**: `TS`, `MAP` (64x48), `GROUND`, `FIELD_SIZE`, `tileHash`; định nghĩa công trình `BUILDING_DEFS` (chân đế `foot`, điểm vẽ `spr`, điểm đứng `at`, `fixed`, `door`) và chuồng `PEN_DEFS`; bố cục vườn mới `START_FARM`; bản đồ cố định trong nhà và làng `SCENES`; bố cục bản v1 `V1` (dùng để chuyển bản lưu cũ) |
| `public/farm.js` | Dựng bản đồ/lưới va chạm từ bản lưu: `mapOf(state)` (vườn, nhớ tạm theo `farm.rev`), `sceneMap(state)` (bản đồ của cảnh đang đứng), `buildMap(farm)` (thử bố cục không nhớ tạm), `footprint`, `reachable`, `bumpLayout`, `hasScene`. Thuần JS |
| `public/migrate.js` | `SAVE_VERSION`, `newFarm`, `migrate(raw)`: chuỗi hàm chuyển bản lưu theo phiên bản (`STEPS`). Thuần JS, không ngẫu nhiên, không đọc đồng hồ |
| `public/clock.js` | Đồng hồ ngoài đời: `now()`, `setClock(fn)` (Phase 1 gắn giờ server), `realDay()` (`'YYYY-MM-DD'` cho nhiệm vụ hằng ngày sau này) |
| `public/state.js` | Mô hình dữ liệu + **mọi luật chơi** + lưu/tải. Thuần JS, không DOM (trừ `localStorage` bọc try/catch). Đây là API công khai duy nhất của luật chơi |
| `public/notify.js` | Thông báo 3 mức: `eventMeta`, `createNotifier` (gộp toast), `arrowTargets`, `arrowFor`. Thuần JS |
| `public/todo.js` | `todoList(state)`: danh sách Việc cần làm cho bảng, bản đồ nhỏ, mũi tên. Thuần JS |
| `public/minimap.js` | Vẽ bản đồ nhỏ: `miniView`, `miniDots`, `drawMini`, `DOT` |
| `public/perf.js` | Hiệu năng: mảng nền `CHUNK`, `dirtyChunks`, `chunksIn`, AI ngoài màn hình `aiStep`, đo FPS `createFps`, tiết kiệm pin (`BATTERY_FPS`, `shouldSuggestBattery`), tùy chọn máy `loadPrefs`/`savePrefs` (khóa `nongtrai-pref`) |
| `public/art.js`, `public/art2.js` | Sprite vẽ bằng code. `art.js` giữ các export `canvas, sprite, flip, paint, hash, rect, disc, fenceTile, character, SPR, icon`; `art2.js` export `SPR2` (sprite của Phase 0: làng, chợ, tiệm rèn, nội thất, thùng giao hàng, bụi/đá, công cụ...). Thêm sprite mới thì giữ nguyên mọi export cũ |
| `public/render.js`, `public/world.js`, `public/main.js` | Vẽ (theo khung nhìn, nền chia mảng 16x16 ô), di chuyển/tìm đường/AI/chế độ xây dựng/camera, vòng lặp, chuyển cảnh mờ dần, input. **Không tự quyết luật**, chỉ gọi `state.js` |
| `public/index.html`, `public/style.css`, `public/ui.js`, `public/sound.js` | HUD, nút hành động, các bảng, tạo nhân vật, thông báo, âm thanh |
| `public/net.js`, `public/sync.js` | Phía trình duyệt của làng: tài khoản (`net.js`, issue 21) và đồng bộ vườn online (`sync.js`, issue 22), xem mục Server |
| `server/` | Server Node (ADR 0010), xem mục Server. `server.js` cũ (hỏng) và `scripts/static-server.mjs` đã bị xóa ở issue 20 |
| `Dockerfile`, `compose.yml`, `.dockerignore` | `node:22-alpine` chạy `server/main.mjs`, nghe cổng 80; container `ai-game` trong network `gateway`, dữ liệu trên volume `data` (`/data/farm.db`) |
| `tests/` | Unit test `node --test`: seam 1 (`state.js`), seam 3 (`server-*.test.mjs`, helper `tests/helpers/server.mjs`) và `tests/fixtures/` (bản lưu v1 mẫu) |
| `e2e/`, `playwright*.config.mjs` | E2E và smoke Playwright (seam 2), `e2e/helpers.mjs` |

## Thời gian

- `state.time`: thời gian game (ms), tăng mỗi khung hình thêm `dtReal * state.speed` (speed ∈ `SPEEDS` = 1, 5, 20). Nút tốc độ vẫn có khi chơi offline.
- Mọi bộ đếm giờ trong luật chơi dùng `state.time`, **không dùng `Date.now()`**. Chỗ cần giờ ngoài đời (`savedAt`, chạy bù) dùng `now()` của `clock.js`.
- Ngày: `DAY_MS` = 20 phút. `dayFraction = (time % DAY_MS) / DAY_MS`. Ban đêm khi `dayFraction >= NIGHT_FROM`. Giờ hiển thị: `6:00 + dayFraction × 24h`. Ngày 1 bắt đầu lúc 6:00 sáng.
- Thời tiết đổi mỗi ngày mới: `sun` 45% · `cloud` 30% · `rain` 25%. Mưa: mọi ô luôn đủ nước. Nắng: đất khô nhanh gấp 1.5 lần.
- **Mùa** (chỉ hiển thị ở Phase 0): mỗi mùa 7 ngày game, Xuân, Hạ, Thu, Đông. `seasonOf(state)`.
- **Hai lịch (ADR 0003):** lịch game (ngày đêm, mùa, thời tiết) theo `state.time`; lịch ngoài đời (`realDay()`) dành cho nhiệm vụ hằng ngày sau này.
- **Chạy bù khi mở lại game:** tối đa `MAX_CATCHUP_MS` = 8 giờ ở tốc độ x1, chia bước ≤ 1000ms; lúc chạy bù không sinh quạ/trộm và (ADR 0004) không có gì làm con vật chết. Phần vắng vượt 8 giờ **không chạy** (đóng băng): ghi vào `frozenMs`, cộng dồn `frozenTotal`.
- **Giờ vườn đã chạy** `simMs`: chỉ tăng khi mô phỏng thật sự chạy (kể cả chạy bù và lúc ngủ). Từ Phase 2 tuổi con vật dựa vào đây (`farmHours(state)`).

## Hình dạng bản lưu v2

Khóa `localStorage`: `nongtrai-save-v2` (`SAVE_KEY`). Bản v1 ở `nongtrai-save-v1` chỉ được **đọc để chuyển, không bao giờ ghi đè hay xóa**. Khóa `nongtrai-migrated` đánh dấu đã chuyển (hoặc đã chơi lại từ đầu) nên không đọc v1 nữa. Tùy chọn riêng của máy (tiết kiệm pin) ở `nongtrai-pref`, không nằm trong bản lưu.

Các trường dưới đây lấy từ `createGame`/`loadGame` thật:

```js
state = {
  v: 2,
  name, look: { skin, hair, hairColor, shirt, pants, hat, acc },   // chỉ số lựa chọn, xem LOOK/HATS/ACCS trong data.js
  owned: { hat: [..], acc: [..] },            // mũ/phụ kiện đã mua (index)
  coins, exp,
  time, speed, day, weather, savedAt,         // savedAt = giờ ngoài đời lần lưu cuối (ms)
  simMs, frozenMs, frozenTotal,               // giờ vườn đã chạy · khoảng đóng băng lần mở gần nhất · tổng đóng băng
  away: { lines: [...], frozenMs, ms } | absent,  // dữ liệu cho màn "Trong lúc bạn vắng nhà", loadGame đặt, UI hiện rồi bỏ qua
  farm: {                                     // vườn: mọi thứ đặt tự do
    rev,                                      // số phiên bố cục; đổi bố cục thì bumpLayout() để mapOf dựng lại
    mw, mh,                                   // kích thước bản đồ (ô), tối đa 64x48
    owned: { c, r, w, h },                    // đất đã mua, luôn là một hình chữ nhật
    paths: [[c, r], ...],                     // ô đường đất
    ents: [ { id, kind, c, r, ... } ],        // thực thể đã đặt, xem dưới
    strips,                                   // số dải đất đã mua (quyết định giá/cấp dải kế tiếp)
  },
  scene: 'farm' | 'house' | 'village',        // bản đồ đang đứng; player.x/y tính theo bản đồ đó
  player: { x, y, dir },                      // điểm ảnh, tâm bàn chân; dir: 0 xuống, 1 trái, 2 phải, 3 lên
  stamina,                                    // 0..STAMINA.max (100)
  sit,                                        // đang ngồi ghế đá (hồi chậm)
  can,                                        // số lần tưới còn trong bình (tối đa canMax(state))
  selectedSeed,                               // id cây (không có tiền tố seed_)
  tools: { hoe:{lv}, can:{lv}, sickle:{lv}, basket:{lv} },   // lv 1..3
  smith: null | { tool, doneAt },             // công cụ đang nằm lò rèn (doneAt theo state.time)
  inv: { ... },                               // KHO: mọi thứ (hạt, vật tư, thức ăn, nông sản, sản phẩm, gỗ, đá, đồ trang trí); chưa giới hạn
  basket: { ... },                            // GIỎ: chỉ nông sản và sản phẩm, có sức chứa basketCap
  shipbin: { items: { cai: 3, ... } },        // thùng giao hàng, chốt lúc 6h sáng
  plots: [ { idx, unlocked, removed?, soil: 'untilled'|'tilled', water: 0..100, weeds: false,
             crop: null | { id, progress, planted, bugs, bugSince, sick, sickSince, fert, boosts, dead, rotten, ripeAt } } ],
  animals: [ { id, type: 'ga'|'heo'|'bo'|'cuu', adult, age, hunger, happy, sick, starvingSince, nextProduct, ready,
               pregnant, dueAt, x, y, name, scaredUntil? } ],
  troughs: { chicken, pig, pasture },
  eggs: [ { id, x, y, laidAt } ],
  nest: { egg, hatchAt },
  dog: { adult, age, hunger, happy, x, y, nextPoop, name },
  poops: [ { id, x, y, at } ],
  threats: [ { id, kind: 'crow'|'thief', plot, x, y, arriveAt, state: 'coming'|'eating'|'leaving', since, loot? } ],
  orders: [ { id, who, items, coins, exp } ], nextOrderAt,
  stats: { harvests, bugs, eggs, poops, slips, piglets, hatches, orders, thieves, crows, earned, planted, shipped, bought, slept },
  achievements: { id: true },
  log: [ { t, text } ],                       // mới nhất ở đầu, tối đa 50
  tutorial,                                   // số bước hướng dẫn đã qua (>= TUTORIAL.length là xong)
  notify: { ripe: false, ... },               // loại thông báo 🟡 đã tắt; thiếu = bật; mức 🔴 không tắt được
  seenWhatsNew,                               // đã xem màn "Bản mới có gì đổi" (WHATS_NEW_VERSION)
  migratedFrom,                               // 1 nếu chuyển từ bản v1
  nextId,                                     // bộ cấp id chung cho thực thể, con vật, trứng...
  // trường cho online (issue 22), thêm vào v2 không đổi phiên bản; bản thiếu thì loadGame bù mặc định
  mode: 'offline' | 'online', account,        // vườn chơi đơn hay vườn trên làng; account = tên tài khoản (null khi offline)
  today: { day: 'YYYY-MM-DD', helps, steals, stolen },   // thống kê hôm nay theo ngày ngoài đời (issue 28/30 dùng)
  guests: [ ... ],                            // nhật ký khách ghé vườn, mới nhất ở đầu (issue 27+)
  // dog.chained: xích chó (issue 31), mặc định false
}
```
Vườn online không bao giờ ghi vào `nongtrai-save-v2`: bản chơi đơn và vườn trên làng là hai bản riêng, chỉ chép một lần lúc "Mang vườn này lên làng?".

**Thực thể đã đặt** (`farm.ents[i]`): `id`, `kind`, `c`, `r` (góc trên-trái, theo ô của bản đồ vườn) và dữ liệu riêng:

| `kind` | Dữ liệu riêng | Ghi chú |
|---|---|---|
| `house`, `gate` | không | cố định, không dời được (`fixed`). Nhà có cửa sang `house`, cổng có cửa sang `village` |
| `shed`, `well`, `board`, `shipbin`, `doghouse` | không | chân đế theo `BUILDING_DEFS`; dời được |
| `field` | `plots: [9 chỉ số vào state.plots]` | khối ruộng 3x3; ô thứ k ở `(c + k%3, r + floor(k/3))` |
| `pen` | `pen: 'chicken'|'pig'|'pasture'` | chuồng, kích thước theo `PEN_DEFS`; mỗi loại chỉ một cái |
| `deco` | `item: 'deco_scarecrow'|'deco_flower'|'deco_lamp'|'deco_bench'` | đồ trang trí 1 ô |
| `tree` | không | cây cảnh, không dời được |
| `bush`, `rock` | không | bụi, đá **chưa dọn** trên dải đất mới; chắn đường, dọn bằng tay (`CLUTTER`) |

Mối liên hệ vị trí: ô ruộng `idx` có thể có `removed: true` (khối ruộng đã cất, giữ chỗ để chỉ số các ô khác không đổi, không phải lỗi). Vị trí của thực thể động (người chơi, con vật, chó, trứng, phân, quạ/trộm) là điểm ảnh trong bản đồ vườn và do phần thế giới cập nhật mỗi khung hình; bộ đếm giờ và luật chơi do `tick()` xử lý.

### Quy tắc đổi phiên bản bản lưu

1. Mỗi lần đổi **hình dạng** bản lưu thì tăng `SAVE_VERSION` trong `migrate.js` và thêm **một hàm chuyển đúng một bậc** vào `STEPS` (khóa là phiên bản nguồn: `STEPS = { 1: v1to2, 2: v2to3 }`). `migrate(raw)` chạy lần lượt tới `SAVE_VERSION`.
2. Hàm chuyển phải **thuần**: không `Math.random`, không đọc đồng hồ, cùng đầu vào cho cùng đầu ra (chạy hai lần cho cùng kết quả). Không ghi đè hay xóa key cũ ngoài `localStorage` (chuyển v1→v2 ghi key v2 mới, giữ nguyên v1). Chuyển lỗi thì `loadGame` trả `null` và `loadProblem()` có thông báo, bản cũ còn nguyên.
3. **Thêm trường nhỏ không đổi cấu trúc** (có giá trị mặc định hợp lý) thì không cần tăng phiên bản: bổ sung trong `loadGame` (mẫu: `basket`, `stamina`, `tools`, `simMs`, `notify`) hoặc trong `migrate` (mẫu: `s.basket ??= {}`). Công trình bị bỏ khỏi game thì thêm vào `RETIRED` trong `migrate.js`.
4. **Test bằng fixture**: bản lưu mẫu của phiên bản cũ nằm ở `tests/fixtures/` (`v1-fresh`, `v1-mid`, `v1-full`, sinh bằng `make-v1.mjs` chạy bằng code của bản v1). Khi có phiên bản mới, chụp thêm fixture của bản trước rồi thêm test vào `tests/save-v2.test.mjs` (hoặc file mới): không mất xu/đồ/cây/con vật, chạy hai lần cho cùng kết quả, bản lỗi không ghi đè.

## API công khai của luật chơi (`public/state.js`)

`R` = `{ ok, msg, ...thêm }`. Hàm trả `ok: false` luôn kèm `msg` tiếng Việt cho người chơi; nhiều hàm kèm `reason` cố định.

### Vòng đời bản lưu
```js
createGame({ name, look })        // → state mới theo START + START_FARM; con vật đặt trong chuồng gà
loadGame(raw?)                    // → state | null. Không truyền: đọc v2 trong localStorage, chưa có thì đọc v1 và migrate.
                                  // Truyền raw (bản lưu đã parse, vd vườn online từ server): đọc bản đó, không đụng localStorage.
                                  // Bù trường thiếu, tự chạy bù (≤ 8 giờ), đặt frozenMs/away
saveGame(state)                   // cập nhật savedAt; vườn chơi đơn thì ghi SAVE_KEY, vườn online (mode 'online') thì không ghi gì
checkSaveJump(prev, next, dtMs)   // → R { reason: 'time'|'coins'|'exp' }: chống gian lận nhẹ, hàm thuần (server dùng). Giờ vườn (simMs)
                                  // tăng không quá dtMs × x20 + một đêm ngủ; của cải (wealthOf = xu + đồ theo giá bán/giá mua) và EXP
                                  // tăng không quá mức cho sẵn + mỗi ô ruộng mỗi phút vườn chạy (SAVE_JUMP)
wealthOf(state), SAVE_JUMP
resetGame()                       // xóa save v2 và đặt cờ "đã chuyển" (không đụng bản v1)
loadProblem()                     // → string | null: vì sao lần loadGame gần nhất không đọc được (bản vẫn được giữ)
awaySummary(events, frozenMs)     // → string[]: các dòng cho màn "Trong lúc bạn vắng nhà"
whatsNewDue(state) / markWhatsNew(state)   // màn "Bản mới có gì đổi" cho bản lưu chuyển từ v1 (xem một lần)
SAVE_KEY
```

### Tick, thời gian, mùa
```js
tick(state, dtGame)               // → events[]; dtGame đã nhân speed. Lớn thì chia bước ≤ 1000ms
clockText(state)                  // '6:30 sáng'
dayText(state)                    // 'Ngày 3'
isNight(state)
seasonOf(state)                   // → { key: 'xuan'|'ha'|'thu'|'dong', name, dayIn: 1..7 }
farmHours(state)                  // giờ vườn đã chạy (simMs / 1 giờ)
marketOpen(state)                 // chợ Bà Tư mở 6h–18h (MARKET)
```

### Target, hành động
```js
actionsFor(state, target)         // → [{ id, icon, label, disabled?: 'lý do', tiles?: [plotIdx...] }]; phần tử đầu là hành động chính.
                                  //   Với ô ruộng dùng công cụ nhiều ô, `tiles` là các ô sẽ bị tác động (để vẽ khung xem trước)
perform(state, target, actionId)  // → { ok, msg, fx: [{ text, color, x, y }], sound?, ...extra }. extra có thể là:
                                  //   open: 'shed'|'shipbin'|'board'|'house'|'market'|'smithy'   → mở bảng
                                  //   go: 'house'|'village'|'farm'        → ý định sang bản đồ khác (main mờ màn hình rồi gọi enterScene)
                                  //   sleep: true                         → main mờ màn hình rồi gọi sleep(state)
                                  //   buyStrip: 'N'|'S'|'E'|'W'           → main hỏi xác nhận rồi gọi buyStrip
                                  //   stunMs                              → khi trượt phân (action 'slip')
toolArea(state, tool, plotIdx, actionId)  // → [plotIdx...] các ô bị tác động (vùng 1 / hàng 3 theo hướng nhìn / 3x3), bỏ ô không hợp lệ
selectSeed(state, cropId)
advanceTutorial(state)            // → true nếu bước hướng dẫn có đổi; TUTORIAL = [till, plant, water, harvest, ship, buy, sleep]
```

### Đặt, dời, cất công trình (chế độ xây dựng, ADR 0005)
```js
canPlace(state, what, c, r)       // → { ok: true } | { ok: false, reason, msg }. what = { id } (dời cái đang có) | { kind, pen?, item? } (đặt mới)
moveEntity(state, id, c, r)       // → R { reason? } dời miễn phí, không giới hạn; dời chuồng thì con vật/trứng đi theo, con vật hoảng (scaredUntil)
placeEntity(state, what, c, r)    // → R { id } đặt mới (khối ruộng/chuồng trừ xu, đồ trang trí lấy từ kho); qua canPlace rồi canAfford
storeEntity(state, id)            // → R { reason? } cất: đồ trang trí về kho; khối ruộng chỉ khi không có cây và không phải khối cuối
canAfford(state, what)            // → { ok } | { ok: false, reason: 'no_item'|'missing'|'level'|'coins', msg }
placeCost(state, what)            // giá xu của món định đặt
snapLayout(state) / restoreLayout(state, snap)   // chụp bố cục lúc vào chế độ xây dựng / trả lại đúng như cũ (nút Hủy)
canMove(ent)  entName(ent)  footprint(ent)
fieldCount(state)  fieldLimit(state)  fieldNextLevel(state)  fieldCost(state)  penLevel(pen)
placeDeco(state, itemId)          // đặt đồ trang trí ngay dưới chân nhân vật (cách đặt cũ, còn dùng được)
```
**Danh sách `reason` của `canPlace`:** `missing` (không thấy công trình), `fixed` (nhà/cổng/cây không dời được), `exists` (đã có chuồng loại đó), `outside` (ngoài đất đã mua), `uncleared` (còn bụi/đá chưa dọn), `overlap` (chồng lên công trình khác), `max_fields` (vượt số khối ruộng tối đa theo cấp), `blocks_path` (chặn đường từ cổng tới nhà, cửa công trình, cửa chuồng hoặc khối ruộng; kiểm tra bằng tìm đường trên lưới va chạm của bố cục thử). `placeEntity` thêm: `scene` (không ở vườn), `no_item`, `level`, `coins`. `storeEntity`: `missing`, `has_crop`, `last_field`, `fixed`.

Thêm luật đặt mới thì thêm một bước kiểm tra trong `canPlace` **trước** bước tìm đường, kèm `reason` mới, và một test cho `reason` đó.

### Mở đất, dọn đất
```js
nextStrip(state, dir)             // dir 'N'|'S'|'E'|'W' → { c, r, w, h, dir, price, level } | null (hết đất / hết bậc giá). Dải dày LAND_STRIP.depth (4) ô
buyStrip(state, dir)              // → R { reason: 'scene'|'max'|'level'|'coins', dir, sound }; rải bụi/đá (theo tileHash) lên ô trống của dải, bump layout
```
Dọn bụi/đá là hành động `clear` của target `clutter` (tốn thể lực, được gỗ/đá vào kho). Vườn không bao giờ vượt 64x48 ô.

### Chuyển bản đồ
```js
enterScene(state, to)             // 'farm'|'house'|'village' → R { reason: 'no_door'|'unknown', scene }; đặt player ở arrive[from] của bản đồ mới
sceneMap(state)  mapOf(state)  reachable(map, from, to)   // bản đồ hiện tại / bản đồ vườn / có đường đi không
```
Thời gian vườn vẫn chạy khi đang ở nhà hay làng. Mở lại game thì đứng đúng bản đồ và chỗ cũ (`scene`, `player`). `main.js` lo hiệu ứng mờ dần rồi gọi `enterScene`.

### Thể lực, ngủ
```js
slowFactor(state)                 // 1, hoặc STAMINA.slow (2) khi hết thể lực: world chia tốc độ đi, main nhân thời gian làm
canSleep(state)                   // chỉ từ STAMINA.sleepHour (18h)
sleep(state)                      // → R { reason: 'early', slept } tua có mô phỏng thật tới 6h sáng hôm sau, hồi đầy thể lực (như chạy bù: không quạ/trộm)
standUp(state)                    // bỏ trạng thái ngồi
```
Chi phí: `STAMINA.cost` {cuốc, tưới, gieo, thu hoạch = 1; dọn bụi 2; đập đá 3}, làm n ô một lần = `cost × GROUP_COST[n]`. Vuốt ve, cho ăn tận tay, nhặt trứng, mua bán không tốn. Hồi: sáng 6h `+morningRegen` (30), ngồi ghế đá `benchPerMin` mỗi phút.

### Công cụ, tiệm rèn
```js
toolLv(state, tool)  toolName(state, tool)  toolAway(state, tool)   // tool: 'hoe'|'can'|'sickle'|'basket'
canMax(state)                     // sức chứa bình tưới theo cấp (10 → 20 → 40)
upgradeCost(state, tool)          // xu nâng lên cấp kế; null nếu đã cấp cao nhất
startUpgrade(state, tool)         // → R { reason: 'unknown'|'busy'|'max'|'coins' }; trừ xu ngay, công cụ vắng mặt 1 ngày game (state.smith), mỗi lúc một cái
```
Vùng tác động theo cấp: cấp 1 một ô, cấp 2 hàng 3 ô theo hướng nhìn, cấp 3 khối 3x3 tâm ở ô mục tiêu. Giỏ không có vùng, chỉ có sức chứa (30 → 60 → 120).

### Giỏ và kho
```js
haveItem(state, id)  takeItem(state, id, n)       // đếm / lấy (giỏ trước, thiếu thì kho); không đủ thì không lấy gì
basketCount(state)  basketCap(state)
stashAll(state)                   // → R { moved } cất hết giỏ vào kho (ở nhà kho)
withdraw(state, id, qty|'all')    // → R { moved } lấy từ kho ra giỏ tới khi giỏ đầy
```
Chỉ nông sản và sản phẩm (`CROPS`, `PRODUCTS`) vào giỏ; hạt, vật tư, thức ăn, gỗ, đá, đồ trang trí luôn ở kho. Giỏ đầy thì hành động thu hoạch/nhặt/vắt sữa bị khóa với lý do "Giỏ đầy, về kho cất đồ".

### Thùng giao hàng
```js
shipAdd(state, id, qty|'all')     // → R { moved } bỏ vào thùng (giỏ trước, thiếu thì kho)
shipTake(state, id, qty|'all')    // → R { moved } lấy lại trước 6h sáng (về giỏ nếu còn chỗ, dư về kho)
shipPreview(state)                // xu dự kiến (SHIP_RATE = 80% giá chợ)
```
Lúc sang ngày mới (6h) lái buôn lấy hết, trả xu, sinh event `shipped`.

### Chợ, cửa hàng, đơn hàng (mua bán chỉ trong giờ chợ mở 6h–18h; ngoài giờ trả `reason: 'closed'`)
```js
buy(state, itemId, qty)           // → R: kiểm tra cấp, xu
buyAnimal(state, type)            // → R: cần đã có chuồng loại đó, chưa chật PEN_CAP
sell(state, itemId, qty|'all')    // → R { coins }
sellAll(state)                    // → R { coins } bán mọi nông sản & sản phẩm (không bán vật tư/hạt)
buyOutfit(state, 'hat'|'acc', index)  setLook(state, look)
fulfillOrder(state, orderId)      // → R
```
Chợ Bà Tư thay sạp hàng và nhà kho bán hàng cũ (sạp bị bỏ khỏi vườn).

### Thông báo, Việc cần làm, cài đặt
```js
notifyOn(state, cat)  setNotify(state, cat, on)   // cat ∈ NOTIFY_CATS (ripe, spoil, hungry, loss, levelup, order)
urgentSpots(state)                // → [{ key, kind, x, y, text }] chỗ đang có chuyện gấp, tính từ trạng thái (không cần event)
// notify.js
eventMeta(event)                  // → { level, cat, group, label } | null (event chưa khai báo mức)
createNotifier({ show, on, win }) // gộp toast mức 'important' cùng khóa trong NOTIFY_WINDOW
arrowTargets(state, items)  arrowFor(point, box, margin)
// todo.js
todoList(state)                   // → [{ kind, level: 'urgent'|'normal', count, scene: 'farm', x, y, target, spots: [{ key, x, y, target }], icon, label }]
                                  //   xếp theo mức gấp rồi số lượng; (x, y, target) là chỗ gần người chơi nhất
```
Loại việc của `todoList`: `crow`, `thief`, `sick` (gấp); `hungry`, `dry`, `bugs`, `weeds`, `ripe`, `egg`, `trough`, `poop` (thường). Bảng Việc cần làm, bản đồ nhỏ và mũi tên đều đọc từ danh sách này (chạm một dòng thì `main.api.todoGo(kind)` cho nhân vật tự đi tới, kể cả khi đang ở bản đồ khác: ra cửa về vườn rồi đi tiếp).

**Mức và khóa gộp của event** (`EVENT_LEVEL` trong `data.js`): mỗi event có `level`, `group(e)` (khóa gộp), `label`; mức `important` có thêm `cat` (loại tắt được) và `text(n, e)` (chữ đã gộp, ví dụ "5 ô cà chua đã chín"). Mức: `urgent` 🔴 (băng rôn đỏ, âm thanh, rung, mũi tên; không tắt được) · `important` 🟡 (toast nhỏ, tự gộp) · `info` ⚪ (chỉ ghi nhật ký) · `direct` (hiện ngay không gộp) · `none` (hiệu ứng/âm thanh, không thông báo). **Thêm event mới thì khai báo trong `EVENT_LEVEL`**, thiếu thì `eventMeta` trả `null`.

### Hằng và tiện ích khác
`UNLOCK_ORDER`, `nextLockedPlot`, `stageOf(crop)`, `levelInfo`, `mapOf`, `reachable`, `footprint`, `sceneMap`, `mmss`, `TUTORIAL`. `UNLOCK_ORDER`/`lockedPlot` chỉ còn cho ô chưa mở trong khối ruộng chuyển từ v1 (mở theo thứ tự cũ); vườn mới không có ô khóa.

### Danh sách target (`{ kind, ... }`)

```js
{ kind: 'plot', idx }          // ô ruộng đã mở
{ kind: 'lockedPlot', idx }    // ô chưa mở kế tiếp trong khối chuyển từ v1
{ kind: 'animal', id }
{ kind: 'egg', id }
{ kind: 'poop', id }
{ kind: 'trough', pen }        // 'chicken'|'pig'|'pasture'
{ kind: 'nest' }
{ kind: 'dog' }
{ kind: 'threat', id }
{ kind: 'deco', id }           // đồ trang trí trong vườn (ghế đá: ngồi nghỉ)
{ kind: 'clutter', id }        // bụi / đá chưa dọn: Dọn bụi, Đập đá
{ kind: 'strip', dir }         // mép vườn: mua dải đất 'N'|'S'|'E'|'W'
{ kind: 'door', to }           // cửa/cổng sang 'house'|'village'|'farm'
{ kind: 'building', id }       // theo bản đồ đang đứng. Vườn: house, gate, shed, shipbin, board, well, doghouse (không tương tác).
                               //   Nhà: bed, wardrobe, (stove, table, plant chỉ để ngắm). Làng: market, smithy, friendGate, homeGate, bench0.., (nhà dân, đèn đường để ngắm)
```
Hành động theo target (id của `actionsFor`): ô ruộng `till plant water weed spray catch fertilize growth harvest clear`; ô khóa `expand`; vật nuôi `collect/milk/shear feed pet medicine vitamin sell`; trứng `collect`; phân `scoop` (và `slip` do WORLD gọi); máng `fill`; ổ ấp `incubate`; chó `feed pet`; quạ/trộm `shoo catch`; `clutter` `clear`; `strip` `buy`; `door` `go`; công trình `open enter talk sleep sit refill`.

### Danh sách event trả về từ `tick()` (`EVENT_LEVEL`)

| `type` | Trường | Mức |
|---|---|---|
| `sick` | `animal` | urgent |
| `eating` | `kind` ('crow'/'thief') | urgent |
| `ripe` | `crop` | important (`ripe`) |
| `rotten`, `dead` | `crop` | important (`spoil`) |
| `hungry` | `animal` | important (`hungry`) |
| `crow`, `thief` | `name` (cây bị mất) | important (`loss`) |
| `levelup` | `level` | important (`levelup`) |
| `order` | — | important (`order`) |
| `egg` | — | info |
| `guard` | `who` | info |
| `shipped` | `coins`, `items`, `t` | info |
| `log` | `text` (đã ghi vào `state.log`) | info |
| `toast` | `text` | direct |
| `achievement` | `id`, `name`, `coins` | direct |
| `fx` | `text`, `color`, `x`, `y` (chữ bay, điểm ảnh) | none |
| `sound` | `name` | none |
| `spawn` | `what` ('chick'/'piglet'/'egg'/'poop'/'crow'/'thief'), `x`, `y` | none |

Tên âm thanh (`sound.js`, `play(name)`, `setMuted(bool)`): `click coin harvest water dig plant spray pop bark oink cluck moo baa slip levelup error eat alarm crow`.

## Luật chơi chính (số liệu lấy trong data.js)

Hành vi của các luật cũ được giữ nguyên; chỉ đổi cách tra vị trí (theo thực thể đã đặt thay vì lưới cố định).

**Ruộng**
- Ruộng là các **khối 3x3** đặt tự do; vườn mới có 1 khối (9 ô), thêm khối ở chế độ xây dựng theo `FIELD_LIMITS` (cấp → số khối tối đa) và `FIELD_PRICES`.
- Chu trình: ô mới là `untilled` → **Cuốc đất** → `tilled` → **Gieo hạt** (tốn 1 `seed_<id>`, theo `selectedSeed`).
- Cây lớn qua 5 giai đoạn (`CROP_STAGES`). Chỉ lớn khi `water > 0`. Có cỏ thì lớn chậm lại (×`weedSlow`), có sâu hoặc bệnh thì dừng lớn.
- **Tưới** tốn 1 `can`, đặt `water` về 100; hết nước thì ra giếng múc (`refill`). **Nhổ cỏ** tay. **Sâu:** phun thuốc (chắc chắn, tốn 1 `pesticide`) hoặc bắt tay (50%). Sâu để lâu → **bệnh** → **chết**; thuốc trừ sâu chữa bệnh. **Bón phân** (+50% sản lượng) và **thuốc tăng trưởng** là hành động phụ.
- **Thu hoạch** khi chín: yield (+50% nếu bón phân), cộng EXP, vào **giỏ**. Chín quá `OVERRIPE` thì **héo**. Cây chết/héo: **Dọn cây**. Thu hoạch xong ô về `untilled`.
- Dời khối ruộng (kể cả đang có cây) giữ nguyên trạng thái ô. Cất khối chỉ khi chưa có cây.
- Cuốc/tưới/thu hoạch/nhổ cỏ bằng công cụ cấp cao làm nhiều ô một lần (`tiles`); ô không hợp lệ trong vùng thì bỏ qua. Bình tưới còn bao nhiêu nước thì tưới được bấy nhiêu ô. Công cụ đang nâng cấp thì hành động bị khóa với lý do.

**Vật nuôi, chó, quạ/trộm**: như bản cũ. Đói dần; máng còn cám thì tự ăn; con non lớn khi `hunger > growNeedsHunger`; bệnh thì không lớn/đẻ; gà đẻ trứng xuống đất; ổ ấp; bò/cừu `ready` → vắt sữa/xén lông; heo mang bầu đẻ 1–3 con (không vượt `PEN_CAP`). Chó ỉa bậy, giẫm phải thì trượt chân, càng nhiều phân vật nuôi càng mất vui, chó trưởng thành no và vui thì canh nhà. Quạ tới ô chín khi không có bù nhìn trong 5 ô; thằng Tèo vào ban đêm khi có ≥2 ô chín (đèn lồng giảm xác suất). Cổng (`gateIn`) là chỗ thằng Tèo đi vào. **Đóng băng/chạy bù không sinh quạ/trộm** và không làm con vật chết (ADR 0004). Chuồng chỉ dời được, luật không đổi.

**Kinh tế**
- **Chợ Bà Tư** (làng, 6h–18h): hạt, vật tư, thức ăn, con non, đồ trang trí, mũ/phụ kiện (đồ chưa đủ cấp hiện khóa); bán nông sản đủ giá.
- **Thùng giao hàng** (vườn): trả 80% giá chợ lúc 6h sáng. **Nhà kho** (vườn): cất giỏ vào kho, lấy ra.
- **Tiệm rèn Ông Sáu** (làng): nâng cấp công cụ, giá `TOOLS[k].price`, mất 1 ngày game.
- **Bảng đơn hàng** (vườn): tối đa 3 đơn, thưởng ×`rewardMul`. **Nhà**: giường (ngủ), tủ đồ (đổi ngoại hình). Làng có ghế đá (hồi thể lực) và cổng bạn bè (biển "Đăng nhập để thăm bạn bè", chưa vào được).
- Lên cấp thưởng `level × 20` xu. Thành tựu thưởng xu. Mua **dải đất** (`LAND_STRIPS`: giá và cấp tăng dần, mọi hướng cộng chung).
- Phase 0 giá chợ chưa biến động. Kinh tế chống lạm phát (ADR 0009) làm ở Phase 4.

## Thế giới, vẽ, giao diện (tóm tắt, chi tiết đọc code)

- **`main.js`**: khởi động (`loadGame()` có save thì vào chơi; không thì `ui.showCreator()` rồi `createGame`); vòng lặp `requestAnimationFrame`: `tick` → di chuyển/AI → tìm target → vẽ → `ui.handleEvents`; lưu 5 giây một lần, khi tab ẩn (`visibilitychange`) và `pagehide` (vườn online: `save()` ghi bản nháp, `sync.js` gửi lên server, xem mục Server). Đang trong chế độ xây dựng thì chỉ lưu bố cục lúc trước khi vào (Xong mới lưu bố cục mới). `api` đưa cho `ui.initUI`: `getState, doAction, changed, newGame, resetGame, buildStart/Done/Cancel/Pick/Store, todoGo, getBattery/setBattery`.
- **`world.js`**: tìm đường BFS trên lưới của `sceneMap`, target gần nhất (`findTarget`), `hitTest`/`pickEntity`, `goToTarget`, kéo thả chế độ xây dựng (bóng xanh/đỏ, gọi `canPlace`). AI con vật cập nhật 2 lần/giây khi ngoài màn hình (`perf.aiStep`).
- **`render.js`**: vẽ theo khung nhìn; nền tĩnh chia mảng 16x16 ô, chỉ vẽ lại mảng nào bẩn; cây/công trình/con vật sắp theo `y`; mưa, đêm, chữ bay.
- **`ui.js`**: HUD (xu, cấp, thể lực, ngày giờ, mùa, thời tiết, bình tưới, tốc độ), nút hành động chính + chip phụ (`Space`/`E`, `1`–`6`), bảng (`openPanel(id)`: `market shed shipbin smithy bag guide seeds board house achievements log todo map settings`), chế độ xây dựng (`showBuild`, `buildTray`), màn "Trong lúc bạn vắng nhà" (`showAway`), "Bản mới có gì đổi" (`showWhatsNew`), băng rôn gấp và mũi tên (`updateAlerts`), thông báo gộp (`createNotifier`), cài đặt (tắt thông báo, tiết kiệm pin). Mọi bảng không tràn ngang ở 360px và tránh tai thỏ (`env(safe-area-inset-*)`).
- **Camera**: theo người chơi, không ra ngoài bản đồ hiện tại; cạnh ngắn màn hình thấy khoảng 12 ô.
- Đồ họa: cần sprite mới thì thêm vào `art2.js` (`SPR2`) hoặc `art.js`, giữ mọi export cũ. `art.icon(key)` tra `SPR.items` → `SPR.ripe` → `SPR.product` → `SPR.baby`/`SPR.animal` → `SPR[key]`.

## Test và dựng tình huống (ADR 0008)

Không có GitHub Actions. Mọi test chạy trên máy local, Chromium ẩn cửa sổ, 1 luồng.

**Seam 1: API công khai của `state.js`**, chạy bằng Node, nơi test chính:
```
npm test            # = node --test (tests/*.test.mjs, gồm cả seam 3 tests/server-*.test.mjs)
```
Mẫu: dựng `localStorage` giả (`globalThis.localStorage = {getItem, setItem, removeItem}`), `G.createGame(...)`, rồi `G.tick/perform/canPlace/...`. Muốn kết quả ngẫu nhiên cố định thì thay `Math.random` tạm (`0.99` = không xảy ra sự kiện nhỏ, `0.0001` = trúng hết). Test mô tả tình huống người chơi gặp ("dời khối ruộng đang có cây thì cây giữ nguyên tiến độ"), không test hàm nội bộ. Các file: `state` (luật gốc), `save-v2` (chuyển bản lưu, fixture), `place` (đặt/dời/cất, mọi `reason`), `build`, `land` (mở đất, dọn), `scene` (chuyển bản đồ), `village` (chợ), `shipbin`, `stamina`, `tools`, `basket`, `time` (chạy bù, đóng băng, mùa), `notify`, `todo`, `perf`, `tutorial`, `online-save` (trường online, `checkSaveJump`).

**Seam 2: trình duyệt thật qua Playwright**, chỉ cho những gì seam 1 không thấy (kéo thả, đi qua cửa, chạm để tự đi tới, giao diện 360px):
```
npm run test:e2e        # = playwright test: tự bật server Node server/main.mjs (PORT 4173, SQLite ở <tmp>/ai-game-e2e.db = `E2E_DB` export từ playwright.config.mjs), chạy 2 project: desktop 1280x800 và mobile 360x740 (cảm ứng)
npx playwright test e2e/place.spec.mjs --project=desktop   # chạy một file / một project
npm run test:smoke      # = playwright test -c playwright.smoke.config.mjs, chỉ desktop, không bật server local
SMOKE_URL=http://127.0.0.1:4173 npm run test:smoke   # đổi địa chỉ (mặc định https://game.huninna.com)
```
(Lần đầu: `npm install` và `npx playwright install chromium`.)

**Dựng tình huống bằng bản lưu ghi sẵn**, không hook trong game (`e2e/helpers.mjs`):
- `makeSave(mutate, opts)`: bản lưu hợp lệ từ chính `createGame` (đặt `tutorial = 99` cho khỏi vướng hướng dẫn), `mutate(s)` chỉnh thêm; `plantedCrop(s, idx, progress)` gieo sẵn cải.
- `seedSave(context, save, { hint })`: ghi bản lưu vào `localStorage` trước khi trang tải (chỉ ghi khi chưa có save nên tải lại không ghi đè); mặc định cũng ghi sẵn `nongtrai-pref` `{ hinted: true }` để hộp gợi ý tiết kiệm pin không chen vào, truyền `{ hint: true }` khi chính là test gợi ý đó.
- Tua thời gian: `installWarp(context)` một lần, rồi `timeWarp(page, ms)` lùi `savedAt` và tải lại để cơ chế chạy bù offline tự đẩy thời gian (vắng quá 8 giờ thì thấy đóng băng). `closeAway(page)` đóng màn "Trong lúc bạn vắng nhà".
- Thao tác: `createCharacter`, `tapPlot` (chạm/click ô ruộng, tự cuộn tới), `tilePoint` (ô → tọa độ màn hình), `startDrag` (kéo bằng chuột hoặc cảm ứng CDP), `bigFarmSave()` (vườn 64x48 đầy công trình, dựng bằng `buyStrip/placeEntity/buyAnimal`).
- Trang lộ `globalThis.__farm` (`state`, `world`, `scale`, `view`, `dpr`, `perf`) chỉ để **đọc** trạng thái; không dùng nó để đổi luật hay phát đồ.
- **Mẹo đã biết:** Chromium headless khựng khoảng 1 giây ở lần nhấn phím đầu tiên, nên các spec bấm `page.keyboard.press('Shift')` trước khi test di chuyển.
- Nhớ hai cỡ màn hình: mỗi spec chạy ở cả desktop và mobile; viết spec dùng chuột lẫn chạm khi cần.

**Seam 3: giao thức server (ADR 0011)**, `tests/server-*.test.mjs`, chạy chung trong `npm test`. Bật server thật trong tiến trình test với SQLite tạm, gọi bằng HTTP/WebSocket thật; không gọi hàm nội bộ server, không mock DB. Helper `tests/helpers/server.mjs`:
- `bootServer(opts?)` → `{ url, dbPath, dir, get(path, init), json(path, body?, init), ws(path = '/ws'), admin(...args), close() }`. Cổng ngẫu nhiên, mỗi lần một thư mục tạm; `close()` tắt server rồi xóa thư mục (dùng `t.after(srv.close)`).
  - `json(path)` = GET, `json(path, body)` = POST JSON; trả `{ status, body }`.
  - `ws(path, { cookie }?)` (cookie = mã phiên, gửi như trình duyệt lúc nâng cấp) chờ mở xong, trả `{ raw, send(obj), next(ms) /* tin JSON kế tiếp */, closed /* promise mã đóng */, close() }`.
  - `admin(...args)` chạy `node server/admin.mjs ...args --db <dbPath>` như quản trị, trả `{ code, out, err }`.
- `runAdmin(...args)`: chạy lệnh quản trị với tham số tự chọn.

Quy tắc: thêm tính năng thì thêm test seam 1 (luật) hoặc seam 3 (giao thức) trước; chỉ thêm e2e cho phần hai seam kia không nhìn thấy. Toàn bộ test cũ phải còn pass.

## Server (`server/`, ADR 0010, 0011)

Một tiến trình Node ≥ 22.13: file tĩnh `public/`, API HTTP JSON, WebSocket (`ws`, thư viện chạy thật duy nhất, ADR 0007), SQLite (`node:sqlite`). Không bước build.

| File | Vai trò |
|---|---|
| `server/index.mjs` | `startServer({ port = 4173, host = '127.0.0.1', dbPath, publicDir = PUBLIC_DIR })` → `Promise<{ port, close() }>`. `port: 0` = cổng ngẫu nhiên; `close()` (gọi nhiều lần cũng được) đóng WebSocket (mã 1001), HTTP, rồi DB. Cách duy nhất để bật server |
| `server/main.mjs` | Điểm vào (`npm start`, CMD Docker). Biến môi trường `PORT` (4173), `HOST` (127.0.0.1; container 0.0.0.0), `DB_FILE` (`./farm.db`; container `/data/farm.db`). SIGTERM/SIGINT thì đóng gọn |
| `server/router.mjs` | `createRouter(ctx)` → `{ route(method, path, fn), handle(req, res, url) }`; `fn({ ...ctx, req, url, body })` trả object → `200 { ok: true, ...obj }`; `throw new HttpError(status, msg)` → `{ ok: false, error }`. Thân JSON tối đa 1 MB (413), JSON hỏng 400, không có đường 404, sai phương thức 405, lỗi khác 500 `Lỗi server`. Chỉ lo đường `/api/*` |
| `server/api.mjs` | `addRoutes(router)`: nơi khai báo mọi route. `ctx` hiện có `db`, `live`, `req`, `res`, `url`, `body` |
| `server/accounts.mjs` | Tài khoản (issue 21): `register`, `login`, `accountOf`, `tokenOf(req)`, `endSession`, `createInvites`, `resetPin`, `deleteAccount`, `cleanName`. Lỗi nghiệp vụ là `HttpError` có `code` |
| `server/farms.mjs` | Kho vườn online (issue 22, ADR 0012, 0016): `claimPlay(ctx, account)`, `readFarm(db, account)`, `storeFarm(ctx, account, { play, save })`, `playOf(db, accountId)`, `FINAL_MS`. Chống gian lận bằng `checkSaveJump` của `state.js` |
| `server/static.mjs` | `serveStatic(dir)`: GET/HEAD, MIME theo đuôi, `.html` `no-store`, file khác `no-cache` + ETag (304). `..`, `\`, byte 0, thoát khỏi `dir` → 403 |
| `server/live.mjs` | `attachLive(server, ctx)` → `{ sendTo(accountId, msg), kick(accountId, play), close() }`. WebSocket ở `/ws` (đường khác bị ngắt), tin tối đa 64 KB. Tài khoản của kết nối lấy từ cookie lúc nâng cấp (`sock.account`), `hello` gắn phiên chơi (`sock.play`). Tin JSON `{ t, ... }` tra trong `HANDLERS(sock, msg, ctx)`; tin hỏng/loại lạ bỏ qua, không ngắt. `send(sock, obj)`. Issue sau đẩy tin tới chủ vườn bằng `ctx.live.sendTo` |
| `server/db.mjs` | `openDb(file)`: WAL, `foreign_keys`, chạy `MIGRATIONS` theo `PRAGMA user_version` (mỗi phần tử một bản, trong transaction; chỉ thêm vào cuối). `backupTo(db, out)` = `VACUUM INTO` |
| `server/admin.mjs` | Lệnh quản trị: `node server/admin.mjs <lệnh> [--db file]` (mặc định `DB_FILE` rồi `./farm.db`). In kết quả ra stdout, lỗi ra stderr + mã thoát 1. Thêm lệnh vào `COMMANDS` |

**Schema SQLite** (`user_version`):
- v1 `meta(key TEXT PRIMARY KEY, value TEXT)` có dòng `created`.
- v2 `accounts(id, name, name_key UNIQUE, pin_hash, pin_salt, created, fails, locked_until)`, `invites(code PK, created, used_by → accounts ON DELETE SET NULL, used_at)`, `sessions(token_hash PK, account_id → accounts ON DELETE CASCADE, created, expires)`. PIN băm `scrypt` (muối 16 byte riêng từng tài khoản); phiên chỉ lưu SHA-256 của mã; `name_key` = tên chữ thường (đã chuẩn hóa NFC).
- v3 `farms(account_id PK → accounts ON DELETE CASCADE, play, save, saved_at, updated, rev)`: một dòng mỗi tài khoản. `play` = phiên chơi đang giữ quyền ghi (mã ngẫu nhiên 16 byte), `save` = bản lưu v2 JSON (`NULL` = chưa có vườn), `saved_at` = `savedAt` của bản lưu (giờ trình duyệt), `updated` = giờ server lúc nhận, `rev` = số bản đã nhận.

**HTTP:**
- `GET /api/health` → `200 { ok: true, now }` (`now` = giờ server ms). Dùng cho Docker HEALTHCHECK, Playwright `webServer`, smoke.
- Lỗi nghiệp vụ trả `{ ok: false, error: 'câu tiếng Việt', code, ... }`; giao diện (`public/net.js`) tự chọn câu theo `code`.
- `POST /api/register` `{ name, pin, invite }` → `200 { ok, name }` + cookie phiên. Tên 2–20 ký tự (chữ có dấu, số, dấu cách, `_ - .`; đầu tên là chữ/số), duy nhất không phân biệt hoa thường; PIN đúng 6 số; mã mời gõ thường/thiếu gạch vẫn được. Lỗi: `400 name_format` · `400 pin_format` · `400 invite_invalid` · `409 invite_used` · `409 name_taken`. Từ chối thì không đốt mã mời.
- `POST /api/login` `{ name, pin }` → `200 { ok, name }` + cookie phiên. Lỗi: `401 bad_credentials` (sai tên hoặc PIN, không phân biệt) · `429 locked` kèm `retryAfter` (giây). Sai PIN 5 lần liên tiếp thì khóa tên 5 phút (kể cả nhập đúng lúc đang khóa); nhập đúng thì đếm lại.
- `POST /api/logout` → hủy phiên của cookie, xóa cookie. `GET /api/me` → `200 { ok, name }` hoặc `401 no_session` (cookie sai/hết hạn).
- **Phiên:** cookie `nt_session` (mã ngẫu nhiên 32 byte, `HttpOnly; SameSite=Lax; Path=/; Max-Age=30 ngày`, thêm `Secure` khi `X-Forwarded-Proto: https` do Caddy gửi), hạn 30 ngày từ lúc đăng nhập. Chọn cookie thay vì header để JS trong trang không đọc được mã. Trình duyệt chỉ nhớ `localStorage['nongtrai-online']` = tên (để biết có nên gọi `/api/me` khi mở game, chơi một mình thì không gọi server).
- **Vườn online (issue 22, ADR 0012, 0016)**, đều cần cookie phiên (thiếu thì `401 no_session`):
  - `POST /api/play` → `200 { ok, play, farm, rev, savedAt? }`: cấp **phiên chơi** mới cho máy này; `farm` = bản lưu trên server hoặc `null` (chưa có vườn). Nếu máy khác đang giữ phiên và mở WebSocket: server gửi nó `{ t: 'kicked' }`, chờ bản lưu cuối mang phiên cũ (nhận như thường), hoặc nó đóng kết nối, hoặc tối đa `FINAL_MS` = 3 giây, rồi mới đổi phiên và trả vườn. Từ đó phiên cũ bị từ chối.
  - `GET /api/farm` → `200 { ok, farm, rev, savedAt }` hoặc `404 no_farm` ("Chưa có vườn"). Lối đọc công khai vườn của chính mình (test dùng).
  - `POST /api/farm` `{ play, save }` → `200 { ok, rev, savedAt }`. Lỗi: `409 play_replaced` (phiên không phải phiên đang giữ quyền ghi: "Vườn đang được chơi ở thiết bị khác") · `400 save_invalid` (không qua `migrate`, thiếu `coins`/`exp`/`savedAt`/`plots`) · `422 implausible` kèm `reason` (`checkSaveJump` của `state.js` so với bản trước; `dtMs` = max(giờ server đã trôi, min(chênh `savedAt` hai bản, giờ server đã trôi + 8 giờ))). Bản đầu tiên của tài khoản (mang vườn chơi đơn lên / vườn mới) nhận nguyên. Server đóng dấu `mode: 'online'`, `account` = tên tài khoản. Bị từ chối thì bản cũ trên server giữ nguyên.
  - `GET /api/visit?name=` (cần đăng nhập) → `200 { ok, name, farm, savedAt }` hoặc `404 no_farm`. Lối đọc công khai vườn người khác (chỉ đọc; issue 27 dùng lại). Chủ đang offline (không có WebSocket giữ phiên chơi) thì server chạy bù trước bằng `loadGame` của `state.js` (tối đa 8 giờ, phần dư đóng băng, vật nuôi không chết), lưu lại với `savedAt` = giờ server; chạy đồng bộ nên đọc nhiều lần chỉ chạy một lần. Tóm tắt vắng nhà cất ở `farm.awayPending`, `loadGame` ở trình duyệt chủ biến nó thành `s.away` (gộp thêm phần vắng sau đó nếu có). `POST /api/play` cũng chạy bù trước khi trao vườn cho chủ.
- Mọi đường khác ngoài `/api/` là file tĩnh của `public/` (`/` = `index.html`).

**WebSocket `/ws`:** cookie phiên gửi kèm lúc nâng cấp cho biết tài khoản.
- `{ t: 'ping', id? }` → `{ t: 'pong', id, now }`.
- `{ t: 'hello', play }` (mỗi lần kết nối/kết nối lại) → `{ t: 'hello', ok: true, now }`; phiên đã bị thay → `{ t: 'kicked' }`; chưa đăng nhập → `{ t: 'hello', ok: false, code: 'no_session' }`.
- Server → trình duyệt: `{ t: 'kicked' }` = máy khác đã vào, lưu lần cuối rồi thoát.

**Lệnh quản trị:**
- `backup [--out thư-mục]`: chép DB (an toàn khi server đang chạy) ra `<thư mục>/farm-YYYYMMDD-HHMMSS.db` (giờ UTC), mặc định `backups/` cạnh file DB (trong container: `/data/backups/`). In đường dẫn file sao lưu.
- `invite [số lượng]`: in mã mời (`XXXX-XXXX`, bỏ O/0/I/1), mỗi dòng một mã, mỗi mã dùng một lần (1–100, mặc định 1).
- `reset-pin <tên> [pin]`: đặt PIN mới (không nêu thì sinh PIN tạm 6 số), mở khóa, hủy mọi phiên của tài khoản. In PIN mới.
- `delete-account <tên>`: xóa tài khoản (và phiên); tên dùng lại được.

**Màn đầu và tài khoản phía trình duyệt (issue 21):** `public/net.js` gọi API trên (`login`, `register`, `logout`, `whoAmI(force?)`, `rememberedName`, `forget`). Mở game: máy còn đăng nhập → vào vườn online; chưa thì có bản lưu chơi đơn → vào thẳng như cũ; chưa có bản lưu → màn chọn **Chơi một mình** / **Vào làng** (cùng lớp phủ `#creator`, `ui.showMode(notice?)/showAuth/showVillage(name, error?)/showBringUp`). Nút Vào làng hỏi `/api/me` trước: cookie còn hạn thì vào luôn, khỏi nhập PIN. Cài đặt có mục "Làng": chơi đơn thì **Vào làng**, vườn online thì **Đăng xuất** (`api.leaveToMode()` lưu vườn, online thì gửi bản cuối, rồi về màn chọn chế độ).

**Vườn online phía trình duyệt (issue 22, `public/sync.js`, `main.js` `startOnline`):**
- Vào làng (đăng nhập, đăng ký, hoặc máy còn đăng nhập) → `claim(name)` (`POST /api/play`). Server có vườn → `loadGame(farm)` (chạy bù theo `savedAt`, màn "Trong lúc bạn vắng nhà") rồi chơi. Chưa có vườn: máy có vườn chơi đơn → hộp **"Mang vườn này lên làng?"**: **Mang vườn chơi đơn lên** (chép bản chơi đơn thành vườn online, đổi tên nhân vật thành tên tài khoản, gửi lên ngay; bản trong `localStorage` giữ nguyên) hoặc **Bắt đầu vườn mới** (màn tạo nhân vật, tên khóa theo tài khoản). Máy không có vườn chơi đơn → thẳng màn tạo nhân vật.
- `startSync({ name, play, rev, getSave, onStatus, onKicked, onReject })` → `{ draft(s), pushNow(), flush(), stop(final) }`. Gửi bản lưu mỗi `SAVE_MS` = 10 giây, ngay khi kết nối (lại) xong, khi có mạng lại (`online`), khi tab ẩn / `pagehide` (`fetch keepalive`, thân < 60 KB). Gửi hỏng thì thử lại sau 3 giây. Thao tác trong vườn không chờ mạng.
- WebSocket gửi `hello { play }` mỗi lần mở; rớt thì tự kết nối lại (chờ 1 → 2 → … tối đa 10 giây). Mất mạng (gửi hỏng, sự kiện `offline` hoặc WebSocket rớt) → `ui.setOnline(false)` hiện chấm nhỏ `#hud-net` 📡 đè góc ảnh đại diện; có lại thì ẩn.
- Nhận `kicked` (hoặc gửi bị `409`): gửi bản cuối (nếu còn kịp), ngắt, quên "máy này đã vào làng" (`net.forget`, tải lại không tự giành vườn), về màn chọn chế độ với dòng **"Bạn đã đăng nhập ở thiết bị khác."**. Bị `422` thì báo một lần bằng toast, lần sau gửi tiếp.
- Bản nháp trên máy: `localStorage['nongtrai-online-draft']` = `{ name, rev, save }`, ghi mỗi lần `save()`. Lần vào làng sau, nếu nháp cùng tài khoản, `rev` trùng với server (chưa máy nào ghi thêm) và `savedAt` mới hơn thì dùng nháp (phần chơi lúc mất mạng rồi đóng trang không mất).
- "Chơi lại từ đầu" khi online: vườn mới thay vườn trên làng, không xóa bản chơi đơn. Đồng hồ và nút x5/x20 như Phase 0 (issue 23 đổi).
## Quy trình phát hành (DESIGN mục 9, ADR 0006)

1. **Local:** `npm test` và `npm run test:e2e` pass hết (không GitHub Actions).
2. **Deploy lên VPS** `image.huninna.com`: vào `~/project/ai_game`, chạy `git pull && docker compose up -d --build`. Container `ai-game` (`node:22-alpine`, chạy `server/main.mjs` nghe cổng 80, người dùng `node`) nằm trong network `gateway`; Caddy của `ai_gateway` chuyển `game.huninna.com` tới `ai-game:80`. Dữ liệu ở volume `ai-game_data` (`/data`). Khóa gateway lưu trên VPS, không nằm trong repo.
3. **Smoke live từ máy local:** `npm run test:smoke` (tới `https://game.huninna.com`): trang tải được, không lỗi console, tạo nhân vật, đi vào làng và về, `GET /api/health` trả 200 qua Caddy; tự dọn dữ liệu trình duyệt sau khi chạy.
4. **Sao lưu:** `docker compose exec web node server/admin.mjs backup`, kéo về máy bằng `docker compose cp` + `scp` (xem README).
5. Mỗi phase xong là deploy; làm theo thứ tự trong `DESIGN.md` mục 9.

## Giữ SPEC.md đúng với code

Mỗi issue/phase thêm hay đổi hàm công khai của `state.js`, target, event, trường bản lưu hoặc vai trò file thì cập nhật SPEC.md trong cùng lần làm. Nguồn sự thật cuối cùng là code (`public/state.js` export) và các test trong `tests/`.
