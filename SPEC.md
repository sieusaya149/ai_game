# Nông Trại Vui: đặc tả kỹ thuật (Phase 0 xong; Phase 2 đang làm: bản lưu v3, vòng đời con vật)

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
| [`docs/adr/`](docs/adr/) | 0001 nền móng trước online sau · 0002 dữ liệu vườn trình duyệt+server · 0003 hai lịch, đóng băng 8 giờ · 0004 offline không gây chết · 0005 đặt tự do, luật đặt nằm trong `state.js` · 0006 VPS sau ai_gateway · 0007 `ws` · 0008 test qua hai seam · 0009 kinh tế chống lạm phát |
| [`docs/issues/`](docs/issues/README.md) | Các issue Phase 0 (01–19) kèm báo cáo từng cái |
| [`README.md`](README.md) | Cách chạy, test, deploy ngắn gọn |

## Các file và việc được sửa

Mọi file trong `public/` đều **được sửa** khi tính năng cần (Phase 0 đã bỏ các ghi chú "chỉ đọc"). Khi sửa, giữ đúng vai trò dưới đây.

| File | Vai trò |
|---|---|
| `public/data.js` | Toàn bộ số liệu cân bằng và các bảng: cây, vật nuôi, vật phẩm, chó, quạ/trộm, ngoại hình, thành tựu, và các bảng của Phase 0: `STAMINA`, `TOOLS`/`TOOL_MAX`/`TOOL_LEVEL`/`GROUP_COST`, `MARKET`, `SHIP_RATE`/`shipValue`, `LAND_STRIP`/`LAND_STRIPS`/`DIR_NAME`, `CLUTTER`/`CLUTTER_RATE`, `FIELD_LIMITS`/`FIELD_PRICES`/`PEN_PRICES`, `NOTIFY_WINDOW`/`NOTIFY_CATS`/`EVENT_LEVEL`, `MAX_CATCHUP_MS`, `SPEEDS`; Phase 2: `PEN_TABLE`/`PEN_LEVELS` (chuồng theo loại và cấp; `PEN_CAP` đã bỏ), `STAGES`/`STAGE_NAME`/`LIFE`/`stageStart`/`stageAt`/`lifeEnd`, `AGING`, `STAGE_CAN`, `WEIGHT`/`weightAt`. Thuần dữ liệu và hàm tính từ số liệu |
| `public/layout.js` | Thuần dữ liệu bố cục, **không còn là bản đồ duy nhất**: `TS`, `MAP` (64x48), `GROUND`, `FIELD_SIZE`, `tileHash`; định nghĩa công trình `BUILDING_DEFS` (chân đế `foot`, điểm vẽ `spr`, điểm đứng `at`, `fixed`, `door`) và chuồng `PEN_DEFS`; bố cục vườn mới `START_FARM`; bản đồ cố định trong nhà và làng `SCENES`; bố cục bản v1 `V1` (dùng để chuyển bản lưu cũ) |
| `public/farm.js` | Dựng bản đồ/lưới va chạm từ bản lưu: `mapOf(state)` (vườn, nhớ tạm theo `farm.rev`), `sceneMap(state)` (bản đồ của cảnh đang đứng), `buildMap(farm)` (thử bố cục không nhớ tạm), `troughOf(map, {pen, id?})`; bản đồ vườn có `pens` (chuồng đầu tiên mỗi loại), `penList`/`penById` (mọi chuồng: `{ id, type, lv, name, rect, gates, trough|null, area, house, ent }`), `footprint`, `reachable`, `bumpLayout`, `hasScene`. Thuần JS |
| `public/migrate.js` | `SAVE_VERSION` (3), `newFarm`, `migrate(raw)`: chuỗi hàm chuyển bản lưu theo phiên bản (`STEPS`: v1→v2, v2→v3); `animalDefaults`/`fillAnimal`: hình dạng con vật v3 và mặc định của nó. Thuần JS, không ngẫu nhiên, không đọc đồng hồ |
| `public/clock.js` | Đồng hồ ngoài đời: `now()`, `setClock(fn)` (Phase 1 gắn giờ server), `realDay()` (`'YYYY-MM-DD'` cho nhiệm vụ hằng ngày sau này) |
| `public/state.js` | Mô hình dữ liệu + **mọi luật chơi** + lưu/tải. Thuần JS, không DOM (trừ `localStorage` bọc try/catch). Đây là API công khai duy nhất của luật chơi |
| `public/notify.js` | Thông báo 3 mức: `eventMeta`, `createNotifier` (gộp toast), `arrowTargets`, `arrowFor`. Thuần JS |
| `public/todo.js` | `todoList(state)`: danh sách Việc cần làm cho bảng, bản đồ nhỏ, mũi tên. Thuần JS |
| `public/minimap.js` | Vẽ bản đồ nhỏ: `miniView`, `miniDots`, `drawMini`, `DOT` |
| `public/perf.js` | Hiệu năng: mảng nền `CHUNK`, `dirtyChunks`, `chunksIn`, AI ngoài màn hình `aiStep`, đo FPS `createFps`, tiết kiệm pin (`BATTERY_FPS`, `shouldSuggestBattery`), tùy chọn máy `loadPrefs`/`savePrefs` (khóa `nongtrai-pref`) |
| `public/art.js`, `public/art2.js`, `public/art3.js` | Sprite vẽ bằng code. `art.js` giữ các export `canvas, sprite, flip, paint, hash, rect, disc, fenceTile, character, SPR, icon`; `art2.js` export `SPR2` (sprite của Phase 0: làng, chợ, tiệm rèn, nội thất, thùng giao hàng, bụi/đá, công cụ...); `art3.js` export `SPR3` (Phase 2: `SPR3.animal[loài][non|nho|truong|gia] = { left, right }` với loài `ga gaTrong vit vitDuc heo bo boDuc cuu cuuXoan cho meo`, `sleepBy[loài][giai đoạn]`, `angel`, chuồng, kẻ săn mồi...; xem `_sprites3.html`). `render.animalImg(a, face, frame, sleep)` chọn hình theo `a.type/stage/sex` (đực: `gaTrong`, `vitDuc`, `boDuc`), thiếu art thì dùng sprite cũ. Thêm sprite mới thì giữ nguyên mọi export cũ |
| `public/render.js`, `public/world.js`, `public/main.js` | Vẽ (theo khung nhìn, nền chia mảng 16x16 ô), di chuyển/tìm đường/AI/chế độ xây dựng/camera, vòng lặp, chuyển cảnh mờ dần, input. **Không tự quyết luật**, chỉ gọi `state.js` |
| `public/index.html`, `public/style.css`, `public/ui.js`, `public/sound.js` | HUD, nút hành động, các bảng, tạo nhân vật, thông báo, âm thanh |
| `server/` | Server Node (ADR 0010), xem mục Server. `server.js` cũ (hỏng) và `scripts/static-server.mjs` đã bị xóa ở issue 20 |
| `Dockerfile`, `compose.yml`, `.dockerignore` | `node:22-alpine` chạy `server/main.mjs`, nghe cổng 80; container `ai-game` trong network `gateway`, dữ liệu trên volume `data` (`/data/farm.db`) |
| `tests/` | Unit test `node --test`: seam 1 (`state.js`), seam 3 (`server-*.test.mjs`, helper `tests/helpers/server.mjs`) và `tests/fixtures/` (bản lưu v1 mẫu) |
| `e2e/`, `playwright*.config.mjs` | E2E và smoke Playwright (seam 2), `e2e/helpers.mjs` |

## Thời gian

- `state.time`: thời gian game (ms), tăng mỗi khung hình thêm `dtReal * state.speed` (speed ∈ `SPEEDS` = 1, 5, 20). Nút tốc độ vẫn có khi chơi offline.
- Mọi bộ đếm giờ trong luật chơi dùng `state.time`, **không dùng `Date.now()`**. Chỗ cần giờ ngoài đời (`savedAt`, chạy bù) dùng `now()` của `clock.js`.
- Ngày: `DAY_MS` = 20 phút. `dayFraction = (time % DAY_MS) / DAY_MS`. Ban đêm khi `dayFraction >= NIGHT_FROM` (0.75 = 0h, lúc màn hình tối nhất). Giờ hiển thị: `6:00 + dayFraction × 24h`. Ngày 1 bắt đầu lúc 6:00 sáng.
- **Chạng vạng** `isDusk(state)`: `dayFraction >= FREE.duskAt` (0.5 = **18h**). Mốc gà vịt thôi thả rông mà về chuồng (issue 42); đừng nhầm với `isNight` (nửa đêm).
- Thời tiết đổi mỗi ngày mới: `sun` 45% · `cloud` 30% · `rain` 25%. Mưa: mọi ô luôn đủ nước. Nắng: đất khô nhanh gấp 1.5 lần.
- **Mùa** (chỉ hiển thị ở Phase 0): mỗi mùa 7 ngày game, Xuân, Hạ, Thu, Đông. `seasonOf(state)`.
- **Hai lịch (ADR 0003):** lịch game (ngày đêm, mùa, thời tiết) theo `state.time`; lịch ngoài đời (`realDay()`) dành cho nhiệm vụ hằng ngày sau này.
- **Chạy bù khi mở lại game:** tối đa `MAX_CATCHUP_MS` = 8 giờ ở tốc độ x1, chia bước ≤ 1000ms; lúc chạy bù không sinh quạ/trộm và (ADR 0004) không có gì làm con vật chết. Phần vắng vượt 8 giờ **không chạy** (đóng băng): ghi vào `frozenMs`, cộng dồn `frozenTotal`.
- **Giờ vườn đã chạy** `simMs`: chỉ tăng khi mô phỏng thật sự chạy (kể cả chạy bù và lúc ngủ). Từ Phase 2 tuổi con vật dựa vào đây (`farmHours(state)`).

## Hình dạng bản lưu v3

Khóa `localStorage`: `nongtrai-save-v3` (`SAVE_KEY`, từ issue 34). `loadGame` đọc lần lượt **v3 → v2 (`nongtrai-save-v2`) → v1 (`nongtrai-save-v1`)**; bản cũ chỉ được **đọc để chuyển, không bao giờ ghi đè hay xóa**. Mỗi bản cũ có cờ riêng "đã chuyển (hoặc đã chơi lại từ đầu)" để không đọc lại: `nongtrai-migrated-v3` cho v2, `nongtrai-migrated` cho v1 (cờ cũ của Phase 0; người chơi v2 đã có cờ này vẫn được đọc v2). Chuyển xong thì ghi bản mới vào `SAVE_KEY` và đặt cả hai cờ; `resetGame` cũng đặt cả hai. Chuyển lỗi thì không ghi gì. Tùy chọn riêng của máy (tiết kiệm pin) ở `nongtrai-pref`, không nằm trong bản lưu.

(Bản online trên server: Phase 1 trong nhánh này chưa lưu vườn lên server; khi có, server chạy cùng `migrate()` lúc chủ đăng nhập.)

Các trường dưới đây lấy từ `createGame`/`loadGame` thật:

```js
state = {
  v: 3,
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
  animals: [ Animal ],                        // xem "Con vật (v3)" ngay dưới
  troughs: { chicken, pig, pasture },
  manure: { chicken, pig, pasture },          // phân chuồng tích dần 0..100 (đầy = chuồng bẩn), xúc ở máng (hành động `muck`)
  eggs: [ { id, sp?, x, y, laidAt, fertile?, candled?, mom?, dad? } ],   // sp = loài đẻ ('ga' | 'vit'; thiếu = 'ga'); fertile: có phôi (ẩn tới khi soi); mom/dad = { id, name }
  clutch: [ { sp?, mom, dad } ],               // gốc gác của các trứng có phôi đã nhặt (khớp theo thứ tự với món trung_phoi / trung_vit_phoi)
  nest: { egg, hatchAt, sp?, mom, dad },       // sp = loài quả trứng đang ấp
  dog: { stage, age, hunger, happy, x, y, nextPoop, name },   // stage/age như con vật, theo LIFE.cho
  poops: [ { id, x, y, at } ],
  threats: [ { id, kind: 'crow'|'thief', plot, x, y, arriveAt, state: 'coming'|'eating'|'leaving', since, loot? } ],
  orders: [ { id, who, items, coins, exp } ], nextOrderAt,
  stats: { harvests, bugs, eggs, poops, slips, piglets, hatches, orders, thieves, crows, earned, planted, shipped, bought, slept },
  achievements: { id: true },
  grief: null | { until },                    // cả trại đang buồn vì có con mất (theo state.time); xem "Bệnh 4 giai đoạn" (lát 38)
  log: [ { t, text } ],                       // mới nhất ở đầu, tối đa 50
  tutorial,                                   // số bước hướng dẫn đã qua (>= TUTORIAL.length là xong)
  notify: { ripe: false, ... },               // loại thông báo 🟡 đã tắt; thiếu = bật; mức 🔴 không tắt được
  seenWhatsNew,                               // đã xem màn "Bản mới có gì đổi" (WHATS_NEW_VERSION)
  migratedFrom,                               // 1 nếu chuyển từ bản v1
  nextId,                                     // bộ cấp id chung cho thực thể, con vật, trứng...
}
```

**Thực thể đã đặt** (`farm.ents[i]`): `id`, `kind`, `c`, `r` (góc trên-trái, theo ô của bản đồ vườn) và dữ liệu riêng:

| `kind` | Dữ liệu riêng | Ghi chú |
|---|---|---|
| `house`, `gate` | không | cố định, không dời được (`fixed`). Nhà có cửa sang `house`, cổng có cửa sang `village` |
| `shed`, `well`, `board`, `shipbin`, `doghouse` | không | chân đế theo `BUILDING_DEFS`; dời được |
| `field` | `plots: [9 chỉ số vào state.plots]` | khối ruộng 3x3; ô thứ k ở `(c + k%3, r + floor(k/3))` |
| `pen` | `pen: 'chicken'|'pig'|'pasture'|'quarantine'`, `lv?: 1..3` | chuồng, kích thước theo `PEN_DEFS` (không đổi theo cấp); `lv` thiếu = 1; nhiều chuồng mỗi loại, giới hạn theo cấp người chơi (`PEN_TABLE.limit`). Chuồng chó (`doghouse`) cũng có `lv?` |
| `deco` | `item: 'deco_scarecrow'|'deco_flower'|'deco_lamp'|'deco_bench'` | đồ trang trí 1 ô |
| `grave` | `animal` (loài), `name?` (chỉ con ❤️4+), `flower: bool` | ngôi mộ 1 ô, con vật mất để lại (lát 38); đặt/dời qua `canPlace` như mọi công trình |
| `tree` | không | cây cảnh, không dời được |
| `bush`, `rock` | không | bụi, đá **chưa dọn** trên dải đất mới; chắn đường, dọn bằng tay (`CLUTTER`) |

### Con vật (v3)

Hình dạng chung cho mọi loài trong `state.animals` (nền cho cả Phase 2, issue 34–48). Mặc định nằm ở **một chỗ**: `animalDefaults(a)` / `fillAnimal(a)` trong `migrate.js`. `migrate()` gọi `fillAnimal` cho mọi con vật mỗi lần nạp bản lưu, và `mkAnimal` (state.js) cũng dùng nó khi sinh con mới.

```js
Animal = {
  id, type: 'ga'|'vit'|'heo'|'bo'|'cuu',      // (lát sau: mèo... thêm loài vào ANIMALS + LIFE)
  name,                                       // mặc định tên loài ('Gà'); lát sau đặt tên riêng / "Bông con"
  sex: 'f'|'m',                               // cái / đực. Mặc định theo id: chẵn cái, lẻ đực
  stage: 'non'|'nho'|'truong'|'gia',          // giai đoạn (STAGES), cập nhật mỗi tick theo age
  age,                                        // ms GIỜ VƯỜN đã sống (cộng đúng bằng d mỗi bước tick, nên đóng băng thì đứng yên)
  hunger: 0..100, happy: 0..100,
  sick: 0|1|2|3, sickSince,                   // 0 khỏe · 1 Mệt · 2 Bệnh nặng · 3 Nguy kịch (lát 38); `if (a.sick)` vẫn đúng
  sickMs, dose, vaccUntil,                    // tiến triển bệnh (ms giờ vườn, đã nhân hệ số) · số liều thuốc đã uống ở giai đoạn này · vắc-xin hết hạn lúc simMs này
  starvingSince,
  dirty: 0..100,                              // độ dơ (lát 37), mặc định 0 = sạch; thêm wallowAt (heo, bò: sau lúc này mới lăn bùn lại)
  bond: 1..5, bondXp: 0..20,                  // độ thân ❤️ (nguồn sự thật) · điểm ẩn trong tim hiện tại (BOND.perHeart), mặc định ❤️2; bondDay/petLast/petStreak: sổ đếm giới hạn mỗi ngày và chuỗi ngày vuốt ve
  weight,                                     // kg; con non/nhỡ ăn no thì lên cân tới WEIGHT[type][1] (lát bán theo cân dùng tiếp)
  mom: null | { id, name }, dad: null | { id, name },   // cha mẹ khi đẻ trong trại (lát sinh sản, phả hệ)
  tile: null | { c, r },                      // ô đang đứng khi thả rông (ADR 0013); null = trong chuồng
  stray: false,                               // chạng vạng chưa về chuồng, ngủ ngoài tới sáng (issue 42); luôn đi kèm tile ≠ null
  nextProduct, ready,                         // sản phẩm (theo state.time); con già chu kỳ ×AGING.oldEvery
  pregnant, dueAt,
  x, y, scaredUntil?,                         // điểm ảnh, do world cập nhật
}
```

**Thêm trường cho lát sau:** thêm một dòng mặc định vào `animalDefaults` là xong, **không tăng phiên bản** (bản v3 cũ thiếu trường sẽ được điền khi nạp). Chỉ tăng lên v4 khi đổi nghĩa/cấu trúc trường đã có. Đã có `pen: id thực thể chuồng | null` (issue 35; null thì `settlePens` xếp vào chuồng cùng loại còn chỗ). Đã thêm sau v3: `sickMs`/`dose`/`vaccUntil` (lát 38), `retired` (lát 40), `tile` (lát 41).

**Chuyển v2→v3** (`v2to3`, thuần): bỏ `adult`; con trưởng thành cũ thành `stage: 'truong'` ở **đầu** giai đoạn (`age = stageStart(type, 'truong')`), con non thành `'non'` (`age = 0`); `sex` theo id chẵn/lẻ (mỗi loài có ít nhất một cặp nếu có ≥ 2 con); `bond: 2`, `dirty: 0`, `sick: true → 1`, các trường khác theo `animalDefaults`. Không con nào bị mất. Chó: `adult` → `stage` tương tự (theo `LIFE.cho`). Bản v2 hỏng (`animals` không phải mảng, con vật loài lạ / không có id) thì ném lỗi, `loadGame` trả `null`, không ghi gì.

Mối liên hệ vị trí: ô ruộng `idx` có thể có `removed: true` (khối ruộng đã cất, giữ chỗ để chỉ số các ô khác không đổi, không phải lỗi). Vị trí của thực thể động (người chơi, con vật, chó, trứng, phân, quạ/trộm) là điểm ảnh trong bản đồ vườn và do phần thế giới cập nhật mỗi khung hình; bộ đếm giờ và luật chơi do `tick()` xử lý.

### Quy tắc đổi phiên bản bản lưu

1. Mỗi lần đổi **hình dạng** bản lưu thì tăng `SAVE_VERSION` trong `migrate.js` và thêm **một hàm chuyển đúng một bậc** vào `STEPS` (khóa là phiên bản nguồn: `STEPS = { 1: v1to2, 2: v2to3 }`). `migrate(raw)` chạy lần lượt tới `SAVE_VERSION`.
2. Hàm chuyển phải **thuần**: không `Math.random`, không đọc đồng hồ, cùng đầu vào cho cùng đầu ra (chạy hai lần cho cùng kết quả). Không ghi đè hay xóa key cũ ngoài `localStorage`: mỗi phiên bản lưu ở key riêng (`nongtrai-save-vN`), chuyển xong ghi key mới, giữ nguyên key cũ; thêm key cũ vào `OLD_KEYS` của state.js kèm cờ "đã chuyển" riêng. Chuyển lỗi thì `loadGame` trả `null` và `loadProblem()` có thông báo, bản cũ còn nguyên.
3. **Thêm trường nhỏ không đổi cấu trúc** (có giá trị mặc định hợp lý) thì không cần tăng phiên bản: bổ sung trong `loadGame` (mẫu: `basket`, `stamina`, `tools`, `simMs`, `notify`) hoặc trong `migrate` (mẫu: `s.basket ??= {}`). Công trình bị bỏ khỏi game thì thêm vào `RETIRED` trong `migrate.js`.
4. **Test bằng fixture**: bản lưu mẫu của phiên bản cũ nằm ở `tests/fixtures/`: `v1-fresh`, `v1-mid`, `v1-full` (sinh bằng `make-v1.mjs` chạy bằng code của bản v1); `v2-farm` (đủ 4 loài, con non lẫn trưởng thành, một con bệnh, chó đã lớn) và `v2-fresh` (sinh bằng `make-v2.mjs` chạy bằng code bản v2 trước issue 34). Test: `tests/save-v2.test.mjs` (v1 → mới nhất), `tests/save-v3.test.mjs` (v2 → v3). Khi có phiên bản mới, chụp thêm fixture của bản trước rồi thêm test: không mất xu/đồ/cây/con vật, chạy hai lần cho cùng kết quả, bản lỗi không ghi đè.

## API công khai của luật chơi (`public/state.js`)

`R` = `{ ok, msg, ...thêm }`. Hàm trả `ok: false` luôn kèm `msg` tiếng Việt cho người chơi; nhiều hàm kèm `reason` cố định.

### Vòng đời bản lưu
```js
createGame({ name, look })        // → state v3 mới theo START + START_FARM; gà mái trưởng thành + gà trống con trong chuồng gà, chó con
loadGame()                        // → state | null. Đọc v3, chưa có thì v2, rồi v1, và migrate. Tự chạy bù (≤ 8 giờ), đặt frozenMs/away
saveGame(state)                   // ghi SAVE_KEY, cập nhật savedAt
resetGame()                       // xóa save hiện tại và đặt mọi cờ "đã chuyển" (không đụng bản v1, v2)
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

### Đực/cái, sinh sản, tên, phả hệ (issue 36)

```
renameAnimal(state, id, name)     // → R { id }: cắt khoảng trắng; reason: empty | long (> BREED.nameMax = 16) | missing; cập nhật tên trong mom/dad của các con
pedigree(state, id)               // → { id, name, sex, mom, dad, kids: [{id,name,sex}] } | null
breedNote(state, animal)          // → 'Chuồng đầy' | null: nái/bò/cừu cái đủ cặp nhưng chuồng đầy nên không sinh
animalPrice(type, sex)            // (data.js) giá mua theo giới tính
{ kind: 'egg' } actions           // candle (Soi trứng: e.candled = true, res.fertile) · collect (theo e.sp: gà → trung_phoi/trung, vịt → trung_vit_phoi/trung_vit)
{ kind: 'animal' } action         // rename → res.rename = id (UI mở hộp nhập tên rồi gọi renameAnimal)
{ kind: 'nest' } action           // incubate: chỉ nhận trứng có phôi (trung_phoi, hết thì trung_vit_phoi); nở ra con đúng loài
```

- Luật (BREED trong data.js): chỉ gà mái đẻ; có gà trống trưởng thành thì 40% trứng `fertile`; gà trống gáy lúc 6h (đổi ngày; không gáy khi chạy bù): event `cockcrow {id}` + `sound cockcrow` + chữ bay.
- Trứng có phôi mới nở: ổ ấp (nhận trứng có phôi), trứng bỏ quên (20% mỗi 10 phút), ổ ấp tự động ở chuồng gà cấp 3 (`pen.incub = { at, sp, mom, dad }`, tự nhận trứng có phôi nằm trong chuồng). Nở ra con non đúng loài của quả trứng.
- Heo/bò/cừu: đực + cái trưởng thành, no (> growNeedsHunger) và vui (> 40), cùng chuồng (cách ly không sinh). Heo: mỗi phút 25% một nái mang bầu, đẻ 1–3 (nái già 1–2); bò mang thai `BREED.gestation.bo` = 10 giờ vườn, cừu 8 giờ, đẻ 1 con. `a.mate` = cha lứa đang mang. Chuồng đầy (sức chứa cả loại chuồng) thì không thụ thai, không đẻ, hiện chữ "Chuồng đầy". Con vật bị đóng băng thì không sinh (dựa `s.time`).
- Con mới sinh/nở: sex 50/50, `name` = "<tên mẹ> con", `mom`/`dad` = { id, name }; event `born`. Chưa có chống cận huyết (con gái trưởng thành sớm có thể phối với cha).
```js
stageStart(kind, stage)           // tuổi (ms giờ vườn) lúc bắt đầu giai đoạn; kind = loại con vật hoặc 'cho'
stageAt(kind, age)                // → 'non'|'nho'|'truong'|'gia'
lifeEnd(kind)                     // tuổi ra đi vì già; Infinity = không bao giờ (chó)
animalCan(animal, what)           // what: 'product' (đẻ/sữa/lông) | 'plow' (kéo cày) | 'sell' | 'vitamin' — theo STAGE_CAN
sellQuote(state, animal)          // → { price, kg (heo, không thì null), unit (xu/kg hôm nay), need (số lần phải xác nhận) }. Con thường: ANIMALS[].sell × TRADE.stageMul × TRADE.bondMul; heo: số ký × pigKgPrice(day) × bondMul; bệnh/dơ nhân sickMul/dirtyMul
sellAnimal(state, id, confirms=0) // bán cho Chú Ba (con ❤️4+ cần confirms ≥ 2) → R { coins, kg, sold } (sold để main.js vẽ cảnh Chú Ba dắt đi vào world.deals); perform(.., 'sell') gọi hàm này, đọc target.confirms
retireAnimal(state, id)           // chỉ con Già; a.retired = true: không sản phẩm (animalCan 'product' = false), cả chuồng vui >= TRADE.retireHappy, vẫn chiếm chỗ; không đảo ngược (TRADE.retireUndo)
weighPigs(state)                  // [{ id, name, kg }]; target { kind: 'scale', pen: 'pig' } (cân đặt sẵn cạnh máng, PEN_DEFS.pig.scale) có hành động 'weigh'. Heo tăng cân cả khi lớn: ăn no + ít đi lại (a.walk do world cộng) thì mau béo. Số liệu: TRADE, pigKgPrice(day) trong data.js. Chú Ba đứng trước nhà houseC ở làng
stageName(animal)                 // 'Non' | 'Nhỡ' | 'Trưởng thành' | 'Già'
animalLabel(animal)               // 'Gà ♀ · Nhỡ' (tên mục tiêu khi chạm vào con vật)
```
Số liệu trong `data.js`: `STAGES`, `STAGE_NAME`, `LIFE` (thời lượng từng giai đoạn theo loài; gà 5 phút / 10 phút / 20 giờ / 4 giờ, heo 10 / 20 phút / 30 / 6 giờ, bò và cừu 15 / 30 phút / 45 / 8 giờ, chó 30 phút / 1 giờ / mãi mãi), `AGING` (`warnMs` báo trước 1 giờ, `oldEvery` ×2, heo nhỡ `pigHungry` ×1.5 / `pigGain` ×2), `STAGE_CAN`, `WEIGHT`/`weightAt`.

Luật:
- Mỗi bước tick: `age += d` (giờ vườn, nên vắng quá 8 giờ thì phần đóng băng không làm già), rồi `stage = stageAt(...)`. Sang giai đoạn mới thì ghi nhật ký + chữ bay; vào trưởng thành thì bắt đầu đếm sản phẩm.
- **Non**: không đẻ, không sữa, không lông, chưa bán được; uống vitamin được. **Nhỡ**: chưa cho sản phẩm (cừu nhỡ lông ngắn chưa xén), bán được, bò tơ kéo cày được (`animalCan(a, 'plow')`; hành động kéo cày trên ruộng chưa làm), heo nhỡ đói nhanh ×1.5 và lên cân ×2, gà nhỡ bới đất nhiều (world). **Trưởng thành**: như cũ. **Già**: chu kỳ sản phẩm ×2 (đẻ thưa, ít sữa, lông mỏng), đi chậm, hay ngủ gật (world), bò già không kéo cày.
- Còn `AGING.warnMs` nữa là vào giai đoạn già: event `oldSoon` (🟡, gộp theo loài, cat `old`), một lần.
- Hết giai đoạn già: con vật ra đi (bỏ khỏi `animals`), event `passed` + `spawn` `angel`; được phép cả lúc chạy bù (ADR 0004). Chưa có mộ (lát 38). Chó không áp dụng (`LIFE.cho.truong = Infinity`).
- Vitamin: cộng nửa giai đoạn đang ở (`vitaminBoost`), không vượt đầu giai đoạn trưởng thành.
- Chó: lớn theo giờ vườn như con vật (`dog.stage`), canh nhà khi trưởng thành/già (`guardOn`).

### Độ thân ❤️ (issue 39)
```js
addBond(s, a, reason)               // reason 'feed'|'pet'|'bath'|'cure'; cộng BOND.gain[reason] điểm, tối đa BOND.perDay[reason] lần/ngày game/con; trả số điểm cộng (0 = hết lượt). Lát tắm (37), chữa bệnh (38) gọi hàm này
bondPerk(a)                       // { runTo: ❤️4+, follow: ❤️5 } cho world.js diễn hoạt
sickFactor(a)                     // 1, hoặc BOND.sickMul (0.5) khi ❤️4+: nhân vào xác suất bệnh (lát 38)
lifeMarks(a)                      // { gia, end }: mốc già / mốc ra đi của con này, ×BOND.lifeMul (1.1) khi ❤️5
starChance(s, a)                  // xác suất milk/shear ra sữa ngon / lông xoăn (BOND.star): ❤️3+ cao hơn; bò vuốt ve nhiều ngày liền, cừu đang vui thì thêm
```
Đói (hunger ≤ BOND.hungerBelow) hoặc dơ (dirty ≥ BOND.dirtyAbove) thì tụt BOND.lossPerMin điểm/phút, không dưới ❤️1. Cho ăn tận tay, vuốt ve, thuốc thú y cộng độ thân; kết quả perform có ond. Sản phẩm sao: sua_ngon, lông xoăn = len_xoan (PRODUCTS, giá cao hơn).

### Bệnh 4 giai đoạn, thú y, ngôi mộ (issue 38)
```js
giveMedicine(state, animalId)    // cho uống 1 liều `medicine`: Mệt 1 liều là khỏi, Bệnh nặng 2 liều → { ok, msg, cured?, dose?, reason? } ('healthy'|'critical'|'no_item'|'missing')
callVet(state, animalId)         // gọi bác sĩ thú y ở điện thoại trong nhà (SICK.vetPrice xu, chỉ khi scene === 'house'): cứu con Bệnh nặng và Nguy kịch → { ok, msg, price?, reason? } ('scene'|'healthy'|'coins'|'missing')
vaccinate(state, animalId)       // tiêm 1 `vaccine`, chống bệnh SICK.vaccineMs (10 giờ vườn) → { ok, msg, reason? } ('sick'|'no_item'|'missing')
vaccinatePen(state, penId)       // tiêm cho mọi con khỏe trong chuồng, hết vắc-xin thì dừng → { ok, msg, n? }
vaccinated(state, a)             // đang còn vắc-xin bảo vệ?
isolate(state, animalId)         // chuyển vào chuồng cách ly còn chỗ (một hành động) → { ok, msg, reason? } ('no_quarantine'|'full')
unisolate(state, animalId)       // đưa về chuồng thường đúng loài
sickLeft(a)                      // ms giờ vườn còn lại trước khi mất (chỉ khác null khi Nguy kịch) — render vẽ đếm ngược trên đầu
SICK_NAME                        // ['Khỏe','Mệt','Bệnh nặng','Nguy kịch']
graves(state)                    // các thực thể `grave` trong vườn
grieving(state)                  // cả trại đang buồn vì vừa có con mất
placeFlower(state, graveId)      // đặt 1 `deco_flower` lên mộ → { ok, msg, reason? } ('missing'|'done'|'no_item'); phần buồn còn lại co còn SICK.flowerGriefMul
```
Số liệu ở `SICK` (data.js). **Tiến triển:** `a.sickMs` cộng theo giờ vườn, ×`oldMul` (2) với con già, ÷`quarantineMul` (1.5) khi ở chuồng cách ly (hồi nhanh hơn). Mốc: `toSevere` (1 giờ) → Bệnh nặng, `toCritical` (1 giờ 30) → Nguy kịch, `deadAt` (1 giờ 45) → mất. Dưới cấp `SICK.minLevel` (5) thì chặn ở Mệt (bảo hộ người mới).
**Nguyên nhân mắc bệnh:** đói lả quá `HUSBANDRY.sickAfterStarving`, hoặc xác suất `HUSBANDRY.sickChancePerMin` ×`sickFactor(a)` (❤️4+ thấp hơn) ×`DIRT.sickMul` (dơ) ×`SICK.dirtyPenMul` (chuồng bẩn) ×`SICK.oldChanceMul` (già). Con đang được vắc-xin thì miễn.
**Lây:** con Bệnh nặng ở chuồng thường, mỗi `SICK.spread.everyMs` (10 phút) có `SICK.spread.p` (10%) lây cho **một** con cùng chuồng còn khỏe và chưa tiêm. Chuồng cách ly không lây (và con trong đó không thả rông).
**ADR 0004 (cứng):** khi chạy bù offline (cờ `catchUp` trong state.js, dùng chung cho trình duyệt và server), tiến triển bệnh bị kẹp ở `SICK.catchUpCap` — bệnh **dừng ở Bệnh nặng**, con đang Nguy kịch **hạ về Bệnh nặng**, và không con nào chết vì bệnh hay vì đói. Chết vì già vẫn xảy ra (đã báo trước ở lát 34).
**Ngôi mộ:** con mất để lại thực thể `grave` ở ô hợp lệ gần góc Tây-Nam của đất (chọn qua `canPlace`, nên không chặn đường, dời được như công trình); con ❤️4+ thì mộ có tên. Cả trại buồn `SICK.griefMs`: vui tụt `griefHappy` ngay và không lên quá `griefCap` tới khi hết buồn; đặt hoa lên mộ thì hết buồn nhanh hơn.
**Mua bán:** `VET_ITEMS` (`medicine`, `vaccine`) chỉ bán ở **trạm thú y Cô Út** trong làng (công trình `vet`, bảng `PANELS.vet`, cùng giờ mở cửa chợ), không có ở quầy vật tư chợ Bà Tư. Điện thoại trong nhà = đồ đặc `phone` (bảng `PANELS.phone`).

### Thả rông ban ngày, hàng rào thấp, trứng trong bụi (issue 41, ADR 0013)
```js
roamOf(state)            // → { tiles: [{c,r}], has(c,r) }: vùng gà thả rông đi lại = ô trong đất, tới được từ nhà, không phải ô chắn/chuồng/ô hàng rào thấp (ngoài cổng, trong nhà không tính). Ruộng rào kín thì ô ruộng không nằm trong vùng. Nhớ tạm theo farm.rev
hiddenEggs(state)        // → trứng đang nằm trong bụi: s.eggs có `tile: {c,r}` (x,y = giữa ô); nhặt bằng perform(egg, 'collect') như trứng thường
```
Mỗi bước tick (ban ngày, FREE trong data.js): tối đa `FREE.max` (30) con loài `FREE.types` (gà, vịt), không bệnh, không ở chuồng cách ly, có `a.tile`; cứ `FREE.moveMs` đổi sang ô khác cách ≤ `FREE.radius` ô (`a.tileAt` = lúc đổi kế). Sáng ra bước từ cửa chuồng; từ chạng vạng `isDusk` (18h) trở đi, hoặc bệnh/cách ly/vượt 30, thì `tile = null` và về chuồng (trừ con lạc, xem issue 42). Vịt con thì không tự chọn ô: bám `tile` của vịt mái gần nhất đang thả rông (đi thành hàng theo mẹ). Đứng ở ô ruộng có cây: con nhỡ trở lên mổ sâu (`stats.pecks`), 5% (`FREE.seedLoss`) lần mổ mất hạt vừa gieo (cây ở giai đoạn 0). Gà/vịt mái trưởng thành thả rông đẻ trứng ở ô cỏ gần bụi/đá/cây trong `FREE.layRadius`, mỗi ô một ổ. Chạy bù offline dùng đúng luật này.
Hàng rào thấp: vật phẩm `deco_lowfence` (ITEMS, kind deco, bán ở chợ), đặt bằng `placeEntity` như đồ trang trí (qua `canPlace`), người chơi bước qua được, chỉ chặn gà. `world.js` diễn hoạt gà theo `a.tile` (`freeWalk`); `render.js` vẽ `SPR3.lowFence` (ngang/dọc theo hàng xóm) và `SPR3.eggNest` / `SPR3.eggNestDuck` cho trứng có `tile`.

### Chạng vạng về chuồng, con lạc, lùa tay, rải thóc (issue 42, ADR 0013)
```js
isDusk(state)            // → đã qua 18h (FREE.duskAt) hay chưa
strays(state)            // → [animal] các con đang lạc, ngủ ngoài chuồng (a.stray && a.tile). Rỗng ban ngày
penHome(state, penId)    // → { type, home, total }: số con thả rông của chuồng đã về / tổng. total = 0 nếu chuồng không nuôi loài thả rông
gateOf(state, penId)     // → { x, y } điểm ảnh giữa cửa chuồng, hay null nếu chuồng không có ô cửa
passGate(state, id)      // world.js báo "con id vừa đi qua cửa chuồng" → luật ghi là đã về (tile = null, stray = false). → false nếu nó đang ở trong chuồng rồi
shoo(state, a, src, dt, { radius, speed, w })   // world.js: lùa một con ra xa điểm src; tới ô cửa thì tự gọi passGate. → true nếu nó đang bị lùa
```
- **Luật chạng vạng (thuần, chạy bù ra cùng kết quả):** mỗi ngày đúng một lần, bước tick đầu tiên có `isDusk` gọi `dusk(state)` (đánh dấu `state.duskDay = state.day`). Mọi con đang thả rông về chuồng, trừ `FREE.strayPerDusk` = **1–3 con lạc** (đàn nhỏ thì tối đa nửa đàn) được bốc theo trọng số: ❤️ thấp, con non/nhỡ, con đứng xa cửa chuồng thì dễ lạc hơn. **Đêm mưa bão** (`weather === 'rain'`) cả đàn tán loạn: `max(FREE.stormMin, 40% đàn)` con lạc. Con lạc mang `stray: true`, giữ nguyên `tile`, **ngủ ngoài tới sáng** và không bao giờ chết vì chuyện này (ADR 0004). Sáng hôm sau `stray` tự về `false` và nó đi kiếm ăn như thường. Mỗi con lạc phát event `stray` (gộp theo loài).
- **Lùa tay:** `world.js` cho con lạc chạy tránh người chơi trong `FREE.shyRadius` (32px ≈ 2 ô) — đi vòng ra sau mà đẩy nó về phía cửa chuồng; bước vào ô cửa thì gọi `passGate`. Dùng `shoo(...)` nếu cần lùa từ nguồn khác (chó lùa, lát 45).
- **Rải thóc:** target mới `{ kind: 'gate', id }` (cửa chuồng, chỉ hiện từ chạng vạng và khi chuồng có loài thả rông). Hành động `scatter` tốn **1 bao cám** của loài đó (`ANIMALS[type].feed`); mọi con lạc của chuồng trong `FREE.lureRadius` (5 ô quanh ô cửa) vào chuồng ngay. Hết cám thì `disabled`; không còn con nào lạc cũng `disabled`. Kết quả có thêm `grain: { x, y }` để main đẩy hoạt cảnh thóc rải vào `world.grains`.
- **Hiển thị:** `render.js` treo biển `SPR3.homeBoard` trên cửa chuồng với số `home/total` (đỏ khi chưa đủ, xanh khi đủ); con lạc đeo `SPR3.strayIcon` (💤) và ngủ gật; `ui.js` vẽ mũi tên vàng `SPR3.strayArrow` (`.alert-arrow[data-key="stray:<id>"]`) khi con lạc ở ngoài khung nhìn. Con đang bị lùa dùng dáng chạy hoảng `SPR3.run.<loài>.<giai đoạn>` (gà mái, gà trống, vịt).

### Vịt (issue 47)

Vịt là **loài mới** trong `ANIMALS`/`LIFE` (`type: 'vit'`), không có trong bản lưu cũ nên **không cần bước chuyển v3**.

- Nuôi **chung chuồng gia cầm** với gà (`ANIMALS.vit.pen = 'chicken'`): `penCount`/`penCap` tính chung, chuồng đầy thì không mua thêm được dù là loài nào.
- Mua ở chợ Bà Tư từ cấp `ANIMALS.vit.lv` (2), chọn đực/cái như gà (`buyAnimal(state, 'vit', sex)`, `animalPrice`).
- Vòng đời cùng thang tuổi với gà (`LIFE.vit` = 5 phút / 10 phút / 20 giờ / 4 giờ).
- **Vịt mái trưởng thành đẻ trứng vịt**: cùng nhánh luật với gà (`POULTRY = ['ga', 'vit']` trong state.js). Quả trứng ghi `sp: 'vit'`; có vịt cồ (vịt trống) trưởng thành thì `BREED.fertile` quả có phôi — phôi tính theo **trống cùng loài**. Vịt già đẻ thưa (chu kỳ ×2 như mọi loài già).
- Sản phẩm mới: `PRODUCTS.trung_vit` (18 xu) và `PRODUCTS.trung_vit_phoi`. Vào giỏ/kho, bán ở chợ và thùng giao hàng như mọi sản phẩm; đơn hàng của làng có lúc xin trứng vịt khi người chơi đã đủ cấp nuôi vịt.
- Dùng chung mọi luật khác với gà: thả rông ban ngày và đẻ trứng trong bụi (41), chạng vạng về chuồng / lạc / lùa tay / rải thóc (42), dơ và tự tắm cát ở chuồng cấp 3 (37), bệnh (38), độ thân (39), bán cho Chú Ba (40), ổ ấp và ổ ấp tự động (36).
- **Vịt con đi thành hàng theo vịt mẹ**: trong chuồng thì `world.js` xếp con thứ k cách mẹ 7 + 6k px về phía sau hướng mẹ đang đi; ra vườn thì `state.js` cho vịt con bám đúng `tile` của vịt mái gần nhất đang thả rông (không có mẹ thì tự đi như gà). Vịt nhỡ bới đất như gà nhỡ; `A_SPEED.vit = 17`.
- Pixel art (art3.js): `SPR3.animal.vit` (vịt mái: thân trắng, mỏ cam) và `SPR3.animal.vitDuc` (vịt cồ: đầu xanh lục, vòng cổ trắng, ức nâu, đuôi đen vểnh) — mỗi giai đoạn một bộ riêng, kèm `sleepBy`/`sickBy`; `eggDuck`, `eggDuckFertile`, `eggNestDuck`. Tiếng kêu `quack` (sound.js).
- Bơi ở hồ để lại Phase 6.

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
fieldCount(state)  fieldLimit(state)  fieldNextLevel(state)  fieldCost(state)  penLevel(pen)   // penLevel = cấp người chơi để xây loại chuồng đó (PEN_TABLE.lv)
penLimit(state, pen)  penNextLevel(state, pen)   // số chuồng loại pen tối đa ở cấp hiện tại · cấp kế để có thêm (null = hết)
// Chuồng 3 cấp (issue 35). Bảng `PEN_TABLE` trong data.js: cap (sức chứa 3 cấp), lv, limit, up (giá nâng), upLv (cấp người chơi để nâng), extra3 (đồ cấp 3).
//   gà 6/12/18 (cấp 1) · heo 3/5/8 (cấp 3) · chuồng lớn + đồng cỏ 3/6/9 (cấp 5) · cách ly 1/2/3 (cấp 3, nhận mọi loài) · chuồng chó 3 cấp
upgradeInfo(state, id)    // → { lv (cấp sau khi nâng), price, need (cấp người chơi), error? } | null (đã tối đa / không nâng được). id = chuồng hoặc chuồng chó
upgradePen(state, id)     // → R { id, lv } nâng 1 cấp, trừ xu, con vật giữ nguyên; reason: scene missing max level coins
penLv(ent)  penCapOf(ent)  penUse(state, id)   // cấp · sức chứa · số con đang ở chuồng id (a.pen). Tính cả con thả rông
penCount(state, loại)  penCap(state, loại)     // tổng con / tổng sức chứa của mọi chuồng loại đó (chuồng cách ly là loại `quarantine`)
animalPen(state, a)       // → chuồng (trên mapOf(state).penById) con vật a đang ở; tự xếp nếu a.pen chưa có
moveAnimal(state, animalId, penId)   // → R chuyển sang chuồng đúng loài hoặc chuồng cách ly còn chỗ; reason: missing species full
placeDeco(state, itemId)          // đặt đồ trang trí ngay dưới chân nhân vật (cách đặt cũ, còn dùng được)
```
**Danh sách `reason` của `canPlace`:** `missing` (không thấy công trình), `fixed` (nhà/cổng/cây không dời được), `max_pens` (đủ số chuồng loại đó ở cấp hiện tại, `PEN_TABLE.limit`), `level` (chuồng mới chưa đủ cấp xây), `missing` (loại chuồng lạ), `outside` (ngoài đất đã mua), `uncleared` (còn bụi/đá chưa dọn), `overlap` (chồng lên công trình khác), `max_fields` (vượt số khối ruộng tối đa theo cấp), `blocks_path` (chặn đường từ cổng tới nhà, cửa công trình, cửa chuồng hoặc khối ruộng; kiểm tra bằng tìm đường trên lưới va chạm của bố cục thử). `placeEntity` thêm: `scene` (không ở vườn), `no_item`, `level`, `coins`. `storeEntity`: `missing`, `has_crop`, `last_field`, `fixed`.

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
buyAnimal(state, type, sex = 'm')   // → R { price }: sex 'm' đực | 'f' cái (đắt hơn BREED.femaleMul ≈ 30%, animalPrice(type, sex)); cần chuồng loại đó còn chỗ; reason: no_pen full sex
sell(state, itemId, qty|'all')    // → R { coins }
sellAll(state)                    // → R { coins } bán mọi nông sản & sản phẩm (không bán vật tư/hạt)
buyOutfit(state, 'hat'|'acc', index)  setLook(state, look)
fulfillOrder(state, orderId)      // → R
```
Chợ Bà Tư thay sạp hàng và nhà kho bán hàng cũ (sạp bị bỏ khỏi vườn).

### Thông báo, Việc cần làm, cài đặt
```js
notifyOn(state, cat)  setNotify(state, cat, on)   // cat ∈ NOTIFY_CATS (ripe, spoil, hungry, loss, levelup, order, old)
urgentSpots(state)                // → [{ key, kind, x, y, text }] chỗ đang có chuyện gấp, tính từ trạng thái (không cần event)
// notify.js
eventMeta(event)                  // → { level, cat, group, label } | null (event chưa khai báo mức)
createNotifier({ show, on, win }) // gộp toast mức 'important' cùng khóa trong NOTIFY_WINDOW
arrowTargets(state, items)  arrowFor(point, box, margin)
// todo.js
todoList(state)                   // → [{ kind, level: 'urgent'|'normal', count, scene: 'farm', x, y, target, spots: [{ key, x, y, target }], icon, label }]
                                  //   xếp theo mức gấp rồi số lượng; (x, y, target) là chỗ gần người chơi nhất
```
Loại việc của `todoList`: `crow`, `thief`, `sick` (con Bệnh nặng trở lên — gấp); `tired` (con mệt), `hungry`, `dry`, `bugs`, `weeds`, `ripe`, `egg`, `trough`, `poop` (thường). Bảng Việc cần làm, bản đồ nhỏ và mũi tên đều đọc từ danh sách này (chạm một dòng thì `main.api.todoGo(kind)` cho nhân vật tự đi tới, kể cả khi đang ở bản đồ khác: ra cửa về vườn rồi đi tiếp).

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
{ kind: 'trough', pen, id? }   // pen: 'chicken'|'pig'|'pasture'; id = thực thể chuồng (có nhiều chuồng cùng loại). Máng ăn gom theo loại: state.troughs[loại]
{ kind: 'gate', id }           // cửa chuồng (id thực thể chuồng); chỉ là target từ chạng vạng (isDusk), cho rải thóc và xem số con đã về
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
Hành động theo target (id của `actionsFor`): ô ruộng `till plant water weed spray catch fertilize growth harvest clear`; ô khóa `expand`; vật nuôi `collect/milk/shear feed pet bath medicine vitamin sell`; trứng `collect`; phân `scoop` (và `slip` do WORLD gọi); máng `fill muck` (và `upgrade` nâng cấp chuồng); cửa chuồng `scatter` (rải thóc gọi về); ổ ấp `incubate`; chó `feed pet`; quạ/trộm `shoo catch`; `clutter` `clear`; `strip` `buy`; `door` `go`; công trình `open enter talk sleep sit refill`.

### Danh sách event trả về từ `tick()` (`EVENT_LEVEL`)

| `type` | Trường | Mức |
|---|---|---|
| `sick` | `animal`, `id` | important (`ill`) — con vật vừa chuyển sang Mệt |
| `sickSevere` | `animal`, `id` | urgent — vừa sang Bệnh nặng (main.js xin quyền + gửi thông báo trình duyệt) |
| `sickCritical` | `animal`, `id` | urgent — vừa sang Nguy kịch |
| `died` | `animal`, `id`, `kind`, `sex`, `x`, `y` | important (`old`) — mất vì bệnh; main đẩy thiên thần vào `world.angels` |
| `cured` | `animal`, `id` | info |
| `grave` | `id` (thực thể mộ) | none |
| `eating` | `kind` ('crow'/'thief') | urgent |
| `ripe` | `crop` | important (`ripe`) |
| `rotten`, `dead` | `crop` | important (`spoil`) |
| `hungry` | `animal` | important (`hungry`) |
| `crow`, `thief` | `name` (cây bị mất) | important (`loss`) |
| `levelup` | `level` | important (`levelup`) |
| `order` | — | important (`order`) |
| `stray` | `animal` (tên loài), `id` | important (`stray`), gộp theo loài: "N con gà lạc, chưa về chuồng 💤" |
| `oldSoon` | `animal` (tên loài), `id` | important (`old`), gộp theo loài |
| `passed` | `animal`, `id`, `kind` (loại), `sex`, `x`, `y` | important (`old`), gộp theo loài; main đẩy thiên thần bay lên vào `world.angels` |
| `egg` | — | info |
| `guard` | `who` | info |
| `shipped` | `coins`, `items`, `t` | info |
| `log` | `text` (đã ghi vào `state.log`) | info |
| `toast` | `text` | direct |
| `achievement` | `id`, `name`, `coins` | direct |
| `fx` | `text`, `color`, `x`, `y` (chữ bay, điểm ảnh) | none |
| `sound` | `name` | none |
| `spawn` | `what` ('chick'/'piglet'/'egg'/'poop'/'crow'/'thief'/'angel'), `x`, `y` | none |

Tên âm thanh (`sound.js`, `play(name)`, `setMuted(bool)`): `click coin harvest water dig plant spray pop bark oink cluck chirp moo baa slip levelup error eat alarm crow` (`chirp`: gà con kêu, world phát kèm chữ "chiếp").

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

**Vật nuôi, chó, quạ/trộm**: đói dần; máng còn cám thì tự ăn; tuổi và giai đoạn theo giờ vườn (mục Vòng đời con vật); bệnh hoặc đói (`hunger <= growNeedsHunger`) thì không lên cân/đẻ; gà đẻ trứng xuống đất; ổ ấp; bò/cừu `ready` → vắt sữa/xén lông; heo mang bầu đẻ 1–3 con (không vượt `PEN_CAP`). Chó ỉa bậy, giẫm phải thì trượt chân, càng nhiều phân vật nuôi càng mất vui, chó trưởng thành no và vui thì canh nhà. Quạ tới ô chín khi không có bù nhìn trong 5 ô; thằng Tèo vào ban đêm khi có ≥2 ô chín (đèn lồng giảm xác suất). Cổng (`gateIn`) là chỗ thằng Tèo đi vào. **Đóng băng/chạy bù không sinh quạ/trộm** và không làm con vật chết, trừ chết vì già (ADR 0004). Chuồng chỉ dời được, luật không đổi.

**Kinh tế**
- **Chợ Bà Tư** (làng, 6h–18h): hạt, vật tư, thức ăn, con non, đồ trang trí, mũ/phụ kiện (đồ chưa đủ cấp hiện khóa); bán nông sản đủ giá.
- **Thùng giao hàng** (vườn): trả 80% giá chợ lúc 6h sáng. **Nhà kho** (vườn): cất giỏ vào kho, lấy ra.
- **Tiệm rèn Ông Sáu** (làng): nâng cấp công cụ, giá `TOOLS[k].price`, mất 1 ngày game.
- **Trạm thú y Cô Út** (làng, cùng giờ chợ): bán thuốc thú y và vắc-xin, kèm bảng điểm danh con đang bệnh. Gọi bác sĩ thú y qua điện thoại trong nhà (`SICK.vetPrice` xu).
- **Bảng đơn hàng** (vườn): tối đa 3 đơn, thưởng ×`rewardMul`. **Nhà**: giường (ngủ), tủ đồ (đổi ngoại hình), điện thoại (gọi bác sĩ thú y). Làng có ghế đá (hồi thể lực) và cổng bạn bè ("Sắp ra mắt: thăm bạn bè").
- Lên cấp thưởng `level × 20` xu. Thành tựu thưởng xu. Mua **dải đất** (`LAND_STRIPS`: giá và cấp tăng dần, mọi hướng cộng chung).
- Phase 0 giá chợ chưa biến động. Kinh tế chống lạm phát (ADR 0009) làm ở Phase 4.

## Thế giới, vẽ, giao diện (tóm tắt, chi tiết đọc code)

- **`main.js`**: khởi động (`loadGame()` có save thì vào chơi; không thì `ui.showCreator()` rồi `createGame`); vòng lặp `requestAnimationFrame`: `tick` → di chuyển/AI → tìm target → vẽ → `ui.handleEvents`; lưu 5 giây một lần, khi tab ẩn (`visibilitychange`) và `pagehide`. Đang trong chế độ xây dựng thì chỉ lưu bố cục lúc trước khi vào (Xong mới lưu bố cục mới). `api` đưa cho `ui.initUI`: `getState, doAction, changed, newGame, resetGame, buildStart/Done/Cancel/Pick/Store, todoGo, getBattery/setBattery`.
- **`world.js`**: tìm đường BFS trên lưới của `sceneMap`, target gần nhất (`findTarget`), `hitTest`/`pickEntity`, `goToTarget`, kéo thả chế độ xây dựng (bóng xanh/đỏ, gọi `canPlace`). AI con vật cập nhật 2 lần/giây khi ngoài màn hình (`perf.aiStep`).
- **`render.js`**: vẽ theo khung nhìn; nền tĩnh chia mảng 16x16 ô, chỉ vẽ lại mảng nào bẩn; cây/công trình/con vật sắp theo `y`; mưa, đêm, chữ bay.
- **`ui.js`**: HUD (xu, cấp, thể lực, ngày giờ, mùa, thời tiết, bình tưới, tốc độ), nút hành động chính + chip phụ (`Space`/`E`, `1`–`6`), bảng (`openPanel(id)`: `market shed shipbin smithy bag guide seeds board house achievements log todo map settings`), chế độ xây dựng (`showBuild`, `buildTray`), màn "Trong lúc bạn vắng nhà" (`showAway`), "Bản mới có gì đổi" (`showWhatsNew`), băng rôn gấp và mũi tên (`updateAlerts`), thông báo gộp (`createNotifier`), cài đặt (tắt thông báo, tiết kiệm pin). Mọi bảng không tràn ngang ở 360px và tránh tai thỏ (`env(safe-area-inset-*)`).
- **Camera**: theo người chơi, không ra ngoài bản đồ hiện tại; cạnh ngắn màn hình thấy khoảng 12 ô.
- Đồ họa: cần sprite mới thì thêm vào `art2.js` (`SPR2`), `art3.js` (`SPR3`, vật nuôi) hoặc `art.js`, giữ mọi export cũ. Bệnh (lát 38): `SPR3.sickBy[loài][giai đoạn]` (dáng nằm bệnh riêng cho từng loài ở từng giai đoạn), `SPR3.grave`/`graveFlower`, `SPR3.vetClinic`, `SPR3.npcCoUt`, `SPR2.phone`; bong bóng vàng (Mệt) / đỏ nhấp nháy (Bệnh nặng, Nguy kịch) và đồng hồ đếm ngược do `render.js` vẽ. `art.icon(key)` tra `SPR.items` → `SPR.ripe` → `SPR.product` → `SPR.baby`/`SPR.animal` → `SPR[key]`.

## Test và dựng tình huống (ADR 0008)

Không có GitHub Actions. Mọi test chạy trên máy local, Chromium ẩn cửa sổ, 1 luồng.

**Seam 1: API công khai của `state.js`**, chạy bằng Node, nơi test chính:
```
npm test            # = node --test (tests/*.test.mjs, gồm cả seam 3 tests/server-*.test.mjs)
```
Mẫu: dựng `localStorage` giả (`globalThis.localStorage = {getItem, setItem, removeItem}`), `G.createGame(...)`, rồi `G.tick/perform/canPlace/...`. Muốn kết quả ngẫu nhiên cố định thì thay `Math.random` tạm (`0.99` = không xảy ra sự kiện nhỏ, `0.0001` = trúng hết). Test mô tả tình huống người chơi gặp ("dời khối ruộng đang có cây thì cây giữ nguyên tiến độ"), không test hàm nội bộ. Các file: `state` (luật gốc), `save-v2` (chuyển bản lưu v1, fixture), `save-v3` (chuyển v2→v3, fixture), `life` (vòng đời 4 giai đoạn), `place` (đặt/dời/cất, mọi `reason`), `build`, `land` (mở đất, dọn), `scene` (chuyển bản đồ), `village` (chợ), `shipbin`, `stamina`, `tools`, `basket`, `time` (chạy bù, đóng băng, mùa), `sick` (bệnh 4 giai đoạn, lây, thú y, ngôi mộ, ranh giới ADR 0004), `notify`, `todo`, `perf`, `tutorial`.

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
  - `ws()` chờ mở xong, trả `{ raw, send(obj), next(ms) /* tin JSON kế tiếp */, closed /* promise mã đóng */, close() }`.
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
| `server/api.mjs` | `addRoutes(router)`: nơi khai báo mọi route. `ctx` hiện có `db` |
| `server/static.mjs` | `serveStatic(dir)`: GET/HEAD, MIME theo đuôi, `.html` `no-store`, file khác `no-cache` + ETag (304). `..`, `\`, byte 0, thoát khỏi `dir` → 403 |
| `server/live.mjs` | WebSocket ở `/ws` (đường khác bị ngắt), tin tối đa 64 KB. Tin JSON `{ t, ... }` tra trong `HANDLERS`; tin hỏng/loại lạ bỏ qua, không ngắt. `send(sock, obj)` |
| `server/db.mjs` | `openDb(file)`: WAL, `foreign_keys`, chạy `MIGRATIONS` theo `PRAGMA user_version` (mỗi phần tử một bản, trong transaction; chỉ thêm vào cuối). `backupTo(db, out)` = `VACUUM INTO` |
| `server/admin.mjs` | Lệnh quản trị: `node server/admin.mjs <lệnh> [--db file]` (mặc định `DB_FILE` rồi `./farm.db`). In kết quả ra stdout, lỗi ra stderr + mã thoát 1. Thêm lệnh vào `COMMANDS` |

**Schema SQLite** (`user_version`): v1 `meta(key TEXT PRIMARY KEY, value TEXT)` có dòng `created`.

**HTTP:**
- `GET /api/health` → `200 { ok: true, now }` (`now` = giờ server ms). Dùng cho Docker HEALTHCHECK, Playwright `webServer`, smoke.
- Mọi đường khác ngoài `/api/` là file tĩnh của `public/` (`/` = `index.html`).

**WebSocket `/ws`:** `{ t: 'ping', id? }` → `{ t: 'pong', id, now }`.

**Lệnh quản trị:**
- `backup [--out thư-mục]`: chép DB (an toàn khi server đang chạy) ra `<thư mục>/farm-YYYYMMDD-HHMMSS.db` (giờ UTC), mặc định `backups/` cạnh file DB (trong container: `/data/backups/`). In đường dẫn file sao lưu.

## Quy trình phát hành (DESIGN mục 9, ADR 0006)

1. **Local:** `npm test` và `npm run test:e2e` pass hết (không GitHub Actions).
2. **Deploy lên VPS** `image.huninna.com`: vào `~/project/ai_game`, chạy `git pull && docker compose up -d --build`. Container `ai-game` (`node:22-alpine`, chạy `server/main.mjs` nghe cổng 80, người dùng `node`) nằm trong network `gateway`; Caddy của `ai_gateway` chuyển `game.huninna.com` tới `ai-game:80`. Dữ liệu ở volume `ai-game_data` (`/data`). Khóa gateway lưu trên VPS, không nằm trong repo.
3. **Smoke live từ máy local:** `npm run test:smoke` (tới `https://game.huninna.com`): trang tải được, không lỗi console, tạo nhân vật, đi vào làng và về, `GET /api/health` trả 200 qua Caddy; tự dọn dữ liệu trình duyệt sau khi chạy.
4. **Sao lưu:** `docker compose exec web node server/admin.mjs backup`, kéo về máy bằng `docker compose cp` + `scp` (xem README).
5. Mỗi phase xong là deploy; làm theo thứ tự trong `DESIGN.md` mục 9.

## Giữ SPEC.md đúng với code

Mỗi issue/phase thêm hay đổi hàm công khai của `state.js`, target, event, trường bản lưu hoặc vai trò file thì cập nhật SPEC.md trong cùng lần làm. Nguồn sự thật cuối cùng là code (`public/state.js` export) và các test trong `tests/`.

### Dơ, tắm, dọn chuồng (lát 37)
- `DIRT`, `MANURE` (data.js). Độ dơ tăng 0→100 trong 3 giờ vườn, ×2 khi trời mưa hoặc chuồng bẩn (`manure[pen] >= 100`); không chạy khi vườn đóng băng. Dơ `>= DIRT.high` (60): mất vui dần, nguy cơ bệnh ×2 (đầu vào lát 38). Heo, bò đầm bùn: dơ 100 ngay, không mất vui; tắm xong `DIRT.wallowAfterMs` mới lăn lại.
- `isDirty(a)`, `penDirty(s, pen)`, `dirtyAnimals(s)`, `dirtyPens(s)` (cho Việc cần làm).
- Hành động `bath` trên con vật: tốn 1 `soap` + 1 nước trong bình; `dirty = 0`, vui +15, `bond` +0.2 (tối đa 5, lát 39 chuẩn hóa); result có `bath: id` (main.js phát hoạt cảnh), event `bathed {animal, id}`. Từ chối: `Hết xà phòng...` / `Bình hết nước...`.
- Hành động `muck` trên máng (`{ kind: 'trough', pen }`): `manure[pen] = 0`, nhận `max(1, floor(độ đầy / 25))` `manure` (phân chuồng, kho), event `mucked {pen, qty}`.
- Ổ cát: gà có tự tắm cát nếu thực thể chuồng có cờ `ent.sand` (lát 35 đặt); dơ không vượt `DIRT.sandCap` (30), trừ khi trời mưa.
- Vật phẩm: `soap` (supply, bán ở chợ), `manure` (material). Render: `bathPhase(b, now)` (`soap` → `shake` → `sparkle`), `BATH_MS`.
