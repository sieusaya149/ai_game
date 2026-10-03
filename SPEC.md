# Nông Trại Vui: đặc tả kỹ thuật (Phase 0, Phase 1 online, Phase 2 vật nuôi đã xong)

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
| [`docs/prd/0002-phase-1-online.md`](docs/prd/0002-phase-1-online.md) | PRD Phase 1 (làng online): tài khoản, vườn online, làng real-time, bạn bè, giúp/trộm, chó canh khách |
| [`docs/prd/0003-phase-2-vat-nuoi.md`](docs/prd/0003-phase-2-vat-nuoi.md) | PRD Phase 2 (vật nuôi): vòng đời 4 giai đoạn, đực/cái và sinh sản, dơ và tắm, bệnh và thú y, độ thân, bán cho Chú Ba, thả rông và về chuồng, kẻ săn mồi, mèo, dạy lệnh chó, trộm NPC mới, vịt |
| [`docs/adr/`](docs/adr/) | 0001 nền móng trước online sau · 0002 dữ liệu vườn trình duyệt+server · 0003 hai lịch, đóng băng 8 giờ · 0004 offline không gây chết · 0005 đặt tự do, luật đặt nằm trong `state.js` · 0006 VPS sau ai_gateway · 0007 `ws` · 0008 test qua hai seam · 0009 kinh tế chống lạm phát · 0010–0015 (Phase 1–3) · 0016 đổi phiên chơi chờ bản lưu cuối |
| [`docs/issues/`](docs/issues/README.md) | Các issue Phase 0 (01–19), Phase 1 (20–33) và Phase 2 (34–49) kèm báo cáo từng cái; ghi chú phát hành ở cuối issue 33 và 49 |
| [`README.md`](README.md) | Cách chạy, test, deploy ngắn gọn |

## Các file và việc được sửa

Mọi file trong `public/` đều **được sửa** khi tính năng cần (Phase 0 đã bỏ các ghi chú "chỉ đọc"). Khi sửa, giữ đúng vai trò dưới đây.

| File | Vai trò |
|---|---|
| `public/data.js` | Toàn bộ số liệu cân bằng và các bảng: cây, vật nuôi, vật phẩm, chó, quạ/trộm, ngoại hình, thành tựu, và các bảng của Phase 0: `STAMINA`, `TOOLS`/`TOOL_MAX`/`TOOL_LEVEL`/`GROUP_COST`, `MARKET`, `SHIP_RATE`/`shipValue`, `LAND_STRIP`/`LAND_STRIPS`/`DIR_NAME`, `CLUTTER`/`CLUTTER_RATE`, `FIELD_LIMITS`/`FIELD_PRICES`/`PEN_PRICES`, `NOTIFY_WINDOW`/`NOTIFY_CATS`/`EVENT_LEVEL`, `MAX_CATCHUP_MS`, `SPEEDS`, làng real-time `LIVE`/`QUICK_CHAT`/`EMOTES`, khách giúp và trộm vườn `GUEST`/`HELP_JOBS`/`hourText`, quà và sổ lưu bút ở cổng `GIFT`, chó canh khách `GUARD`/`WALK_SPEED` (bán kính theo giai đoạn nằm ở `DOG.guardRadius`, dùng chung với trộm NPC); Phase 2: `PEN_TABLE`/`PEN_LEVELS` (chuồng theo loại và cấp; `PEN_CAP` đã bỏ), `STAGES`/`STAGE_NAME`/`LIFE`/`stageStart`/`stageAt`/`lifeEnd`, `AGING`, `STAGE_CAN`, `WEIGHT`/`weightAt`, `FREE`, `PREDATOR`, `TRICKS`/`TRICK_BASE`/`TRAIN` (6 lệnh của chó và số liệu dạy lệnh), `THREATS`/`RAID` (quạ và trộm NPC), `BREED`/`animalPrice` (đực cái, sinh sản), `DIRT`/`MANURE` (dơ, phân chuồng), `SICK`/`VET_ITEMS` (bệnh, thú y), `BOND` (độ thân), `TRADE`/`pigKgPrice` (bán cho Chú Ba), `CAT` (mèo), `CO_UT_QUEST`, `BUILD_PRICES` (nhà mèo...). Thuần dữ liệu và hàm tính từ số liệu |
| `public/layout.js` | Thuần dữ liệu bố cục, **không còn là bản đồ duy nhất**: `TS`, `MAP` (64x48), `GROUND`, `FIELD_SIZE`, `tileHash`; định nghĩa công trình `BUILDING_DEFS` (chân đế `foot`, điểm vẽ `spr`, điểm đứng `at`, `fixed`, `door`) và chuồng `PEN_DEFS`; bố cục vườn mới `START_FARM`; bản đồ cố định trong nhà và làng `SCENES`; bố cục bản v1 `V1` (dùng để chuyển bản lưu cũ) |
| `public/farm.js` | Dựng bản đồ/lưới va chạm từ bản lưu: `mapOf(state)` (vườn, nhớ tạm theo `farm.rev`), `sceneMap(state)` (bản đồ của cảnh đang đứng), `buildMap(farm)` (thử bố cục không nhớ tạm), `troughOf(map, {pen, id?})`; bản đồ vườn có `pens` (chuồng đầu tiên mỗi loại), `penList`/`penById` (mọi chuồng: `{ id, type, lv, name, rect, gates, trough|null, area, house, ent }`), `footprint`, `reachable`, `bumpLayout`, `hasScene`. Thuần JS |
| `public/migrate.js` | `SAVE_VERSION` (3), `newFarm`, `migrate(raw)`: chuỗi hàm chuyển bản lưu theo phiên bản (`STEPS`: v1→v2, v2→v3); `animalDefaults`/`fillAnimal`: hình dạng con vật v3 và mặc định của nó. Thuần JS, không ngẫu nhiên, không đọc đồng hồ |
| `public/clock.js` | Đồng hồ ngoài đời: `now()`, `setClock(fn)`, `realDay()` (giờ máy), và (issue 23) `measureOffset(ask, tries?, local?)` → độ lệch ms hoặc null, `useServerTime(offset|null)` (trỏ `now()` sang giờ server), `villageCal(t)` → `{ day, tod, frac }`, `serverDay(t)` → `'YYYY-MM-DD'` giờ Việt Nam (UTC+7), `VILLAGE_EPOCH` |
| `public/state.js` | Mô hình dữ liệu + **mọi luật chơi** + lưu/tải. Thuần JS, không DOM (trừ `localStorage` bọc try/catch). Đây là API công khai duy nhất của luật chơi |
| `public/notify.js` | Thông báo 3 mức: `eventMeta`, `createNotifier` (gộp toast), `arrowTargets`, `arrowFor`. Thuần JS |
| `public/todo.js` | `todoList(state)`: danh sách Việc cần làm cho bảng, bản đồ nhỏ, mũi tên. Thuần JS |
| `public/minimap.js` | Vẽ bản đồ nhỏ: `miniView`, `miniDots`, `drawMini`, `DOT` |
| `public/perf.js` | Hiệu năng: mảng nền `CHUNK`, `dirtyChunks`, `chunksIn`, AI ngoài màn hình `aiStep`, đo FPS `createFps`, tiết kiệm pin (`BATTERY_FPS`, `shouldSuggestBattery`), tùy chọn máy `loadPrefs`/`savePrefs` (khóa `nongtrai-pref`) |
| `public/art.js`, `public/art2.js`, `public/art3.js` | Sprite vẽ bằng code. `art.js` giữ các export `canvas, sprite, flip, paint, hash, rect, disc, fenceTile, character, SPR, icon`; `art2.js` export `SPR2` (sprite của Phase 0: làng, chợ, tiệm rèn, nội thất, thùng giao hàng, bụi/đá, công cụ...; Phase 1 thêm hộp quà và sổ lưu bút ở cổng, đồ phụ của chó canh khách `barkBubble`, `dogChain`, `stunStars`, `barkArrow`, `sausage`/`sausageGround`; xem `public/_sprites2.html`); `art3.js` export `SPR3` (Phase 2: `SPR3.animal[loài][non|nho|truong|gia] = { left, right }` với loài `ga gaTrong vit vitDuc heo bo boDuc cuu cuuXoan cho meo`, `sleepBy[loài][giai đoạn]`, `angel`, chuồng, kẻ săn mồi, dáng lệnh của chó `dogSitBy/dogBegBy/dogHerdBy/dogBarkBy[giai đoạn]`...; xem `_sprites3.html`). `render.animalImg(a, face, frame, sleep)` chọn hình theo `a.type/stage/sex` (đực: `gaTrong`, `vitDuc`, `boDuc`), thiếu art thì dùng sprite cũ. Thêm sprite mới thì giữ nguyên mọi export cũ |
| `public/render.js`, `public/world.js`, `public/main.js` | Vẽ (theo khung nhìn, nền chia mảng 16x16 ô), di chuyển/tìm đường/AI/chế độ xây dựng/camera, vòng lặp, chuyển cảnh mờ dần, input. **Không tự quyết luật**, chỉ gọi `state.js` |
| `public/index.html`, `public/style.css`, `public/ui.js`, `public/sound.js` | HUD, nút hành động, các bảng, tạo nhân vật, thông báo, âm thanh |
| `public/net.js`, `public/sync.js` | Phía trình duyệt của làng: tài khoản (`net.js`, issue 21) và đồng bộ vườn online (`sync.js`, issue 22), xem mục Server |
| `public/presence.js` | Người khác cùng bản đồ (issue 25): `crowdSplit(me, people, max)`, `sampleTrack(track, t)`, `createPeers()`. Thuần JS, xem mục Server |
| `server/` | Server Node (ADR 0010), xem mục Server. `server.js` cũ (hỏng) và `scripts/static-server.mjs` đã bị xóa ở issue 20 |
| `Dockerfile`, `compose.yml`, `.dockerignore` | `node:22-alpine` chạy `server/main.mjs`, nghe cổng 80; container `ai-game` trong network `gateway`, dữ liệu trên volume `data` (`/data/farm.db`) |
| `tests/` | Unit test `node --test`: seam 1 (`state.js`), seam 3 (`server-*.test.mjs`, helper `tests/helpers/server.mjs`) và `tests/fixtures/` (bản lưu v1 và v2 mẫu) |
| `e2e/`, `playwright*.config.mjs` | E2E và smoke Playwright (seam 2), `e2e/helpers.mjs` |

## Thời gian

- `state.time`: thời gian game (ms), tăng mỗi khung hình thêm `dtReal * state.speed` (speed ∈ `SPEEDS` = 1, 5, 20). Nút tốc độ chỉ có khi chơi một mình; online luôn x1 (`speedOf(state)`; `loadGame` ép `speed = 1`; `checkSaveJump` coi vườn online là x1).
- Mọi bộ đếm giờ trong luật chơi dùng `state.time`, **không dùng `Date.now()`**. Chỗ cần giờ ngoài đời (`savedAt`, chạy bù) dùng `now()` của `clock.js`.
- Ngày: `DAY_MS` = 20 phút. `dayFraction = (time % DAY_MS) / DAY_MS`. Ban đêm khi `dayFraction >= NIGHT_FROM` (0.75 = 0h, lúc màn hình tối nhất). Giờ hiển thị: `6:00 + dayFraction × 24h`. Ngày 1 bắt đầu lúc 6:00 sáng.
- **Chạng vạng** `isDusk(state)`: `dayFraction >= FREE.duskAt` (0.5 = **18h**). Mốc gà vịt thôi thả rông mà về chuồng (issue 42); đừng nhầm với `isNight` (nửa đêm).
- Thời tiết đổi mỗi ngày mới: `sun` 45% · `cloud` 30% · `rain` 25%. Mưa: mọi ô luôn đủ nước. Nắng: đất khô nhanh gấp 1.5 lần.
- **Mùa** (chỉ hiển thị ở Phase 0): mỗi mùa 7 ngày game, Xuân, Hạ, Thu, Đông. `seasonOf(state)`.
- **Hai lịch (ADR 0003):** lịch game (ngày đêm, mùa, thời tiết) theo `state.time`; lịch ngoài đời (`realDay()` chơi đơn, `serverDay()` online) dành cho nhiệm vụ hằng ngày.
- **Lịch làng (online, issue 23):** khi vào làng, `sync.js` `syncClock()` đo lệch giờ qua `GET /api/health` (lấy lần khứ hồi ngắn nhất trong 3 lần, đo lại mỗi 5 phút) rồi `useServerTime(offset)`. Với vườn `mode: 'online'` thì ngày, mùa, ngày/đêm, giờ chợ, ngủ đều tính từ `villageCal(now())` (`VILLAGE_EPOCH` = 0h UTC ngày 2026-01-01 = 6:00 sáng ngày 1; `dayOf`, `dayFraction`, `seasonOf`, `clockText` đọc từ đó), nên cả làng cùng ngày/mùa/ban đêm và lịch không dừng khi vườn đóng băng. `state.time`/`state.day` vẫn là giờ vườn cho cây, con vật, thời tiết, bộ đếm. Rời làng thì `useServerTime(null)`.
- **Chạy bù khi mở lại game:** tối đa `MAX_CATCHUP_MS` = 8 giờ ở tốc độ x1, chia bước ≤ 1000ms; lúc chạy bù không sinh quạ/trộm và (ADR 0004) không có gì làm con vật chết. Phần vắng vượt 8 giờ **không chạy** (đóng băng): ghi vào `frozenMs`, cộng dồn `frozenTotal`. Với vườn online, **giờ làng trong lúc chạy bù trôi theo bước đang mô phỏng** (`loadGame` đặt mốc `catchBase` = giờ ngoài đời lúc bắt đầu phần chạy bù; `dayOf`/`dayFraction` đọc `catchBase + simMs` thay cho `now()`), nên 8 giờ vắng là 24 ngày làng có ngày có đêm (chạng vạng, mèo ra vào, chồn nửa đêm...), không phải cả 8 giờ đứng yên ở giờ lúc mở lại (issue 49 sửa: trước đó server chạy bù lúc làng đang đêm thì mèo ngủ suốt 8 giờ, không bắt được con chuột nào).
- **Giờ vườn đã chạy** `simMs`: chỉ tăng khi mô phỏng thật sự chạy (kể cả chạy bù và lúc ngủ). Từ Phase 2 tuổi con vật dựa vào đây (`farmHours(state)`).

## Hình dạng bản lưu v3

Khóa `localStorage`: `nongtrai-save-v3` (`SAVE_KEY`, từ issue 34). `loadGame` đọc lần lượt **v3 → v2 (`nongtrai-save-v2`) → v1 (`nongtrai-save-v1`)**; bản cũ chỉ được **đọc để chuyển, không bao giờ ghi đè hay xóa**. Mỗi bản cũ có cờ riêng "đã chuyển (hoặc đã chơi lại từ đầu)" để không đọc lại: `nongtrai-migrated-v3` cho v2, `nongtrai-migrated` cho v1 (cờ cũ của Phase 0; người chơi v2 đã có cờ này vẫn được đọc v2). Chuyển xong thì ghi bản mới vào `SAVE_KEY` và đặt cả hai cờ; `resetGame` cũng đặt cả hai. Chuyển lỗi thì không ghi gì. Tùy chọn riêng của máy (tiết kiệm pin) ở `nongtrai-pref`, không nằm trong bản lưu.

(Bản online trên server: server không tự kiểm số phiên bản mà luôn đi qua chính `migrate()` / `loadGame(raw)` của `public/`: `POST /api/farm` chạy `migrate(save)` trước khi lưu, chạy bù (`catchUpFarm`) dùng `loadGame`, khách thăm vườn dùng `startVisit` → `loadGame`. Vườn đã lưu bằng bản v2 trước khi gộp Phase 2 tự lên v3 ở lần đọc/ghi kế tiếp, giữ nguyên các trường online.)

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
  troughs: { [id chuồng]: số phần cám },   // theo từng chuồng; bản lưu cũ khóa theo loại được chép cho từng chuồng khi nạp
  manure: { chicken, pig, pasture },          // phân chuồng tích dần 0..100 (đầy = chuồng bẩn), xúc ở máng (hành động `muck`)
  eggs: [ { id, sp?, x, y, laidAt, fertile?, candled?, mom?, dad? } ],   // sp = loài đẻ ('ga' | 'vit'; thiếu = 'ga'); fertile: có phôi (ẩn tới khi soi); mom/dad = { id, name }
  clutch: [ { sp?, mom, dad } ],               // gốc gác của các trứng có phôi đã nhặt (khớp theo thứ tự với món trung_phoi / trung_vit_phoi)
  nest: { egg, hatchAt, sp?, mom, dad },       // sp = loài quả trứng đang ấp
  dog: { stage, age, hunger, happy, x, y, nextPoop, name,     // stage/age như con vật, theo LIFE.cho
         tricks: { <lệnh>: số buổi đã đạt }, trainDay, session,   // dạy lệnh (issue 45); session = buổi đang mở
         cmd: null | { id, spot?, until?, list? }, herdDay, scene,   // lệnh đang thi hành · ngày đã tự lùa · bản đồ chó đang đứng
         chained, nap, napCheck, quiet, barkAt, barkX, barkY,   // issue 31: xích · ngủ gật ban đêm (giờ vườn) · mải ăn xúc xích tới (giờ ngoài đời) · lần sủa gần nhất
         coat, bowl, eatAt },   // màu lông (COATS.cho, mặc định 'den') · số phần xương trong bát 0..DOG.bowlMax · lúc chó tới bát ăn (giờ vườn, 0 = không)
  cats: [ { id, type: 'meo', name, sex, pet: true, stage, age, hunger, happy, sick, sickSince, sickMs, dose, vaccUntil, bond, bondXp,   // mèo (issue 44)
          scene: 'farm'|'house', sleep, sun, x, y, tx, ty, tile, tileAt, inAt, huntAt, trophy: null | { until }, spatUntil, coat } ],   // coat: màu lông (COATS.meo, mặc định 'vang')
  poops: [ { id, x, y, at } ],
  threats: [ { id, kind: 'crow'|'thief'|'tisun'|'civet', plot, at?, target?, x, y, arriveAt, state: 'coming'|'eating'|'leaving', since, loot? } ],
                                              // quạ/Tèo nhắm ô ruộng `plot`; Tí Sún và chồn hương nhắm điểm `at` (chồn hương kèm `target` = id con vật)
  preds: [ { id, kind: 'rat'|'hawk'|'weasel', state: 'hunt'|'leaving', since, strikeAt, warned, x, y, tx, ty, tile?, tileAt?, target?, carry? } ],   // kẻ săn mồi (issue 43)
  raid: null | { day, kind, at, done },       // vụ trộm NPC đã chốt cho đêm nay (issue 46); kind = null là đêm yên
  caught: null | { kind, name, coins },       // trộm người vừa bắt được, đang chờ chọn kiểu phạt
  chore: null | { day, name },                // trộm bị phạt sang làm thợ không công vào ngày `day`
  teoCaught,                                  // số lần thằng Tèo bị bắt (càng nhiều càng đi lặng lẽ)
  choreWeek,                                  // tuần làng gần nhất đã dùng hình phạt thợ không công (-1 = chưa dùng)
  orders: [ { id, who, items, coins, exp } ], nextOrderAt,
  stats: { harvests, bugs, eggs, poops, slips, piglets, hatches, orders, thieves, crows, rats, preds, earned, planted, shipped, bought, slept,
           chased, barks, robStreak, helps },   // issue 31: chó đã đớp bao nhiêu khách, đã sủa mấy lần; chuỗi trộm chưa bị đớp;
                                                //   issue 32: helps = số việc mình đã giúp vườn bạn (thành tựu xã hội)
  robAt?: { at, x, y, by, item, target },     // issue 32: vụ trộm gần nhất trong vườn mình (chỗ gấp 🔴 trong GUEST.robShowMs)
  achievements: { id: true },
  grief: null | { until },                    // cả trại đang buồn vì có con mất (theo state.time); xem "Bệnh 4 giai đoạn" (lát 38)
  log: [ { t, text } ],                       // mới nhất ở đầu, tối đa 50
  tutorial,                                   // số bước hướng dẫn đã qua (>= TUTORIAL.length là xong)
  notify: { ripe: false, ... },               // loại thông báo 🟡 đã tắt; thiếu = bật; mức 🔴 không tắt được
  seenWhatsNew,                               // đã xem màn "Bản mới có gì đổi" (WHATS_NEW_VERSION)
  migratedFrom,                               // 1 nếu chuyển từ bản v1
  nextId,                                     // bộ cấp id chung cho thực thể, con vật, trứng...
  // trường cho online (issue 22), thêm từ v2 không đổi phiên bản; bản thiếu thì loadGame bù mặc định. v2→v3 giữ nguyên các trường này
  //   (`v2to3` chép cả bản lưu, chỉ đổi con vật và chó); server nhận/chạy bù bản v2 cũ qua `migrate`/`loadGame` nên tự lên v3
  mode: 'offline' | 'online', account,        // vườn chơi đơn hay vườn trên làng; account = tên tài khoản (null khi offline)
  today: { day: 'YYYY-MM-DD', helps, steals, stolen, robs },   // thống kê hôm nay theo ngày ngoài đời (`serverDay`).
                                              //   helps = số việc khách đã giúp vườn này (issue 28) · steals = số vụ vườn này bị trộm ·
                                              //   stolen = tổng giá trị (xu) vườn này đã mất vì trộm · robs = số vụ chính mình đi trộm (issue 30)
  guests: [{ id, kind, act, by, lv, at, seen, item, qty, fine, ate }],  // nhật ký việc khách làm trong vườn, mới nhất ở đầu, tối đa GUEST.logMax (60).
                                              //   `id` = mã thao tác đã áp dụng (áp dụng lại cùng mã thì không làm gì), `seen` = chủ đã được báo,
                                              //   `lv` = cấp của khách lúc đó (nút "Sang trộm lại"), `item`/`qty` chỉ có ở dòng kind 'steal' (issue 28, 30)
  // plots[i].crop.stolen / .robbed: số món khách đã trộm của ô và tên những người đã trộm ô đó (issue 30, chỉ có khi bị trộm)
  //   kind: 'help' | 'steal' | 'bark' | 'bite' | 'sausage'; `fine` chỉ có ở dòng 'bite', `ate` chỉ có ở dòng 'sausage' (issue 31)
  // dog (issue 31): chained = xích chó (mặc định false) · nap = giấc ngủ gật tới lúc nào (giờ vườn) · napCheck = lần quay kế tiếp
  //   · quiet = mải ăn xúc xích tới lúc nào (giờ NGOÀI ĐỜI) · barkAt/barkX/barkY = lần sủa gần nhất và chỗ thấy khách lạ
  deliveries: [{ id, items: { itemId: qty }, cost, fee, at, due }],  // mua online: đơn đã trả tiền, chờ giao (at/due theo state.time).
                                              //   Bản lưu cũ thiếu thì [] (không đổi phiên bản v3)
  courier: null | { id, ids, state: 'coming'|'leaving', from, at, since, arriveAt, x?, y? },  // người giao hàng đang đi: ids = các đơn
                                              //   đang mang, from = cổng, at = trước cửa nhà kho, x/y do world.js diễn. Thiếu/hỏng thì null
}
```
Vườn online không bao giờ ghi vào `SAVE_KEY` (`nongtrai-save-v3`): bản chơi đơn và vườn trên làng là hai bản riêng, chỉ chép một lần lúc "Mang vườn này lên làng?".

**Thực thể đã đặt** (`farm.ents[i]`): `id`, `kind`, `c`, `r` (góc trên-trái, theo ô của bản đồ vườn) và dữ liệu riêng:

| `kind` | Dữ liệu riêng | Ghi chú |
|---|---|---|
| `house`, `gate` | không | cố định, không dời được (`fixed`). Nhà có cửa sang `house`, cổng có cửa sang `village` |
| `shed`, `well`, `board`, `shipbin`, `doghouse` | không | chân đế theo `BUILDING_DEFS`; dời được |
| `field` | `plots: [9 chỉ số vào state.plots]` | khối ruộng 3x3; ô thứ k ở `(c + k%3, r + floor(k/3))` |
| `pen` | `pen: 'chicken'|'pig'|'pasture'|'quarantine'`, `lv?: 1..3` | chuồng, kích thước theo `PEN_DEFS` (không đổi theo cấp); `lv` thiếu = 1; nhiều chuồng mỗi loại, giới hạn theo cấp người chơi (`PEN_TABLE.limit`). Chuồng chó (`doghouse`) cũng có `lv?` |
| `deco` | `item: 'deco_scarecrow'|'deco_flower'|'deco_lamp'|'deco_bench'|'deco_lowfence'|'deco_rattrap'|'deco_canopy'`, `shut?` (bẫy chuột đã sập) | đồ trang trí 1 ô |
| `grave` | `animal` (loài), `name?` (chỉ con ❤️4+), `flower: bool` | ngôi mộ 1 ô, con vật mất để lại (lát 38); đặt/dời qua `canPlace` như mọi công trình |
| `tree` | không | cây cảnh, không dời được |
| `bush`, `rock` | không | bụi, đá **chưa dọn** trên dải đất mới; chắn đường, dọn bằng tay (`CLUTTER`) |

### Con vật (v3)

Hình dạng chung cho mọi loài trong `state.animals` (nền cho cả Phase 2, issue 34–48). Mặc định nằm ở **một chỗ**: `animalDefaults(a)` / `fillAnimal(a)` trong `migrate.js`. `migrate()` gọi `fillAnimal` cho mọi con vật mỗi lần nạp bản lưu, và `mkAnimal` (state.js) cũng dùng nó khi sinh con mới.

```js
Animal = {
  id, type: 'ga'|'vit'|'heo'|'bo'|'cuu',      // mèo ('meo') là thú cưng, nằm ở state.cats chứ không ở đây (mục Mèo); loài mới: thêm vào ANIMALS + LIFE
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
createGame({ name, look, dogCoat }) // → state v3 mới theo START + START_FARM; gà mái trưởng thành + gà trống con trong chuồng gà, chó con màu lông dogCoat (lạ / thiếu: 'den')
loadGame(raw?)                    // → state | null. Không truyền: đọc v3 trong localStorage, chưa có thì v2, rồi v1, và migrate.
                                  // Truyền raw (bản lưu đã parse, vd vườn online từ server): đọc bản đó, không đụng localStorage.
                                  // Bù trường thiếu, tự chạy bù (≤ 8 giờ), đặt frozenMs/away
saveGame(state)                   // cập nhật savedAt; vườn chơi đơn thì ghi SAVE_KEY, vườn online (mode 'online') thì không ghi gì
checkSaveJump(prev, next, dtMs)   // → R { reason: 'time'|'coins'|'exp' }: chống gian lận nhẹ, hàm thuần (server dùng). Giờ vườn (simMs)
                                  // tăng không quá dtMs × x20 + một đêm ngủ; của cải (wealthOf = xu + đồ theo giá bán/giá mua) và EXP
                                  // tăng không quá mức cho sẵn + mỗi ô ruộng mỗi phút vườn chạy (SAVE_JUMP). wealthOf tính cả hàng mua
                                  // online đang chờ giao (deliveries), nên đặt hàng chỉ giảm của cải (phí giao) và nhận hàng không tăng
                                  // + giá trần của con vật có ở bản trước mà mất ở bản sau (bán cho Chú Ba, Phase 2)
wealthOf(state), SAVE_JUMP
resetGame()                       // xóa save hiện tại và đặt mọi cờ "đã chuyển" (không đụng bản v1, v2)
loadProblem()                     // → string | null: vì sao lần loadGame gần nhất không đọc được (bản vẫn được giữ)
awaySummary(events, frozenMs)     // → string[]: các dòng cho màn "Trong lúc bạn vắng nhà" (cả thành tựu mở lúc chạy bù, issue 32)
awayGuests(state, gate?)          // issue 32 → [{ kind: 'help'|'steal'|'gift'|'note'|'chase', icon, text }]: phần "Khách ghé vườn"
                                  //   của màn vắng nhà, gom từ nhật ký khách chưa xem (gọi trước takeGuestLog) và gate = { gifts, notes }
                                  //   (tin ở cổng, POST /api/play trả kèm). Mỗi người một dòng giúp ("Bình đã giúp 2 việc (tưới 1 ô,
                                  //   nhổ cỏ 1 ô)") và một dòng trộm ("Bình đã trộm 2 bắp"); quà, lời nhắn, "Mực đã đuổi được n người"
                                  //   (số lần chó đớp). Không có gì thì không có mục đó
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
breedNote(state, animal)          // → chữ lý do heo/bò/cừu này chưa sinh sản | null (đủ cặp còn chỗ, hay đang mang thai). Thứ tự: chuồng cách ly · còn nhỏ · bệnh · đói (≤ growNeedsHunger) · chưa vui (≤ 40) · "Cần 1 heo đực/cái trưởng thành ở cùng chuồng" · bạn đời còn đói/chưa vui/bệnh · "Chuồng đầy, nâng cấp chuồng để có chỗ cho heo con". Hiện ở dòng 💡 khi chạm vào con vật, ở Phả hệ và
breedAdvice(state, type)          // → chữ nhắc mua đủ đực và cái (loài chưa có con nào / chỉ có một giới) | null; buyAnimal nối vào msg, bảng chợ hiện dưới con non
animalPrice(type, sex)            // (data.js) giá mua theo giới tính
{ kind: 'egg' } actions           // candle (Soi trứng: e.candled = true, res.fertile) · collect (theo e.sp: gà → trung_phoi/trung, vịt → trung_vit_phoi/trung_vit)
{ kind: 'animal' } action         // rename → res.rename = id (UI mở hộp nhập tên rồi gọi renameAnimal)
{ kind: 'nest' } action           // incubate: chỉ nhận trứng có phôi (trung_phoi, hết thì trung_vit_phoi); nở ra con đúng loài
```

- Luật (BREED trong data.js): chỉ gà mái đẻ; có gà trống trưởng thành thì 40% trứng `fertile`; gà trống gáy lúc 6h (đổi ngày; không gáy khi chạy bù): event `cockcrow {id}` + `sound cockcrow` + chữ bay.
- Trứng có phôi mới nở: ổ ấp (nhận trứng có phôi), trứng bỏ quên (20% mỗi 10 phút), ổ ấp tự động ở chuồng gà cấp 3 (`pen.incub = { at, sp, mom, dad }`, tự nhận trứng có phôi nằm trong chuồng). Nở ra con non đúng loài của quả trứng.
- Heo/bò/cừu: đực + cái trưởng thành, no (> growNeedsHunger) và vui (> 40), cùng chuồng (cách ly không sinh). Heo: mỗi phút 25% một nái mang bầu, đẻ 1–3 (nái già 1–2); bò mang thai `BREED.gestation.bo` = 10 giờ vườn, cừu 8 giờ, đẻ 1 con. `a.mate` = cha lứa đang mang. Chuồng đầy (sức chứa cả loại chuồng) thì không thụ thai, không đẻ, hiện chữ "Chuồng đầy". Con vật bị đóng băng thì không sinh (dựa `s.time`). Lần đầu một quả trứng **có phôi** xuất hiện khi đang chơi (không phải chạy bù): toast + nhật ký chỉ cách dùng **Ổ ấp trứng** (`s.nestHint = true`, một lần). Ổ ấp trên bản đồ có chữ "Ổ ấp"; chạm vào thì thấy giải thích: nở trứng có phôi, còn mái chuồng bên cạnh chỉ là nhà của đàn gà (lớn theo cấp chuồng).
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
Số liệu trong `data.js`: `STAGES`, `STAGE_NAME`, `LIFE` (thời lượng từng giai đoạn theo loài; gà 5 phút / 10 phút / 20 giờ / 4 giờ, heo 10 / 20 phút / 30 / 6 giờ, bò và cừu 15 / 30 phút / 45 / 8 giờ, chó 30 phút / 1 giờ / 40 giờ / mãi mãi — chó có tuổi già nhưng `lifeEnd('cho')` vẫn là Infinity), `AGING` (`warnMs` báo trước 1 giờ, `oldEvery` ×2, heo nhỡ `pigHungry` ×1.5 / `pigGain` ×2), `STAGE_CAN`, `WEIGHT`/`weightAt`.

Luật:
- Mỗi bước tick: `age += d` (giờ vườn, nên vắng quá 8 giờ thì phần đóng băng không làm già), rồi `stage = stageAt(...)`. Sang giai đoạn mới thì ghi nhật ký + chữ bay; vào trưởng thành thì bắt đầu đếm sản phẩm.
- **Non**: không đẻ, không sữa, không lông, chưa bán được; uống vitamin được. **Nhỡ**: chưa cho sản phẩm (cừu nhỡ lông ngắn chưa xén), bán được, bò tơ kéo cày được (`animalCan(a, 'plow')`; hành động kéo cày trên ruộng chưa làm), heo nhỡ đói nhanh ×1.5 và lên cân ×2, gà nhỡ bới đất nhiều (world). **Trưởng thành**: như cũ. **Già**: chu kỳ sản phẩm ×2 (đẻ thưa, ít sữa, lông mỏng), đi chậm, hay ngủ gật (world), bò già không kéo cày.
- Còn `AGING.warnMs` nữa là vào giai đoạn già: event `oldSoon` (🟡, gộp theo loài, cat `old`), một lần.
- Hết giai đoạn già: con vật ra đi (bỏ khỏi `animals`), event `passed` + `spawn` `angel`, để lại ngôi mộ (`grave`, lát 38); được phép cả lúc chạy bù (ADR 0004). Chó và mèo không áp dụng (`LIFE.cho.gia = LIFE.meo.gia = Infinity`).
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

### Dơ, tắm, dọn chuồng (issue 37)
- `DIRT`, `MANURE` (data.js). Độ dơ tăng 0→100 trong 3 giờ vườn, ×2 khi trời mưa hoặc chuồng bẩn (`manure[pen] >= 100`); không chạy khi vườn đóng băng. Dơ `>= DIRT.high` (60): mất vui dần, nguy cơ bệnh ×2 (đầu vào lát 38). Heo, bò đầm bùn: dơ 100 ngay, không mất vui, event `wallow`; tắm xong `DIRT.wallowAfterMs` mới lăn lại. Mèo không dơ.
- `isDirty(a)`, `penDirty(s, pen)`, `dirtyAnimals(s)`, `dirtyPens(s)` (cho Việc cần làm).
- Hành động `bath` trên con vật: tốn 1 `soap` + 1 nước trong bình; `dirty = 0`, vui +`DIRT.bathHappy`, độ thân qua `addBond(s, a, 'bath')`; result có `bath: id` (main.js phát hoạt cảnh), event `bathed {animal, id}`, bước `bathe` của nhiệm vụ Cô Út. Từ chối (nút mờ kèm lý do): hết xà phòng / bình hết nước.
- Hành động `muck` trên máng (`{ kind: 'trough', pen }`): `manure[pen] = 0`, nhận `max(1, floor(độ đầy / 25))` `manure` (phân chuồng, kho), event `mucked {pen, qty}`.
- Ổ cát: gà, vịt tự tắm cát nếu thực thể chuồng có cờ `ent.sand` (chuồng gia cầm cấp 3); dơ không vượt `DIRT.sandCap` (30), trừ khi trời mưa.
- Vật phẩm: `soap` (supply, bán ở chợ), `manure` (material). Render: `bathPhase(b, now)` (`soap` → `shake` → `sparkle`), `BATH_MS`.

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
**Nguyên nhân mắc bệnh (hotfix: chỉ khi bị bỏ bê):** đói lả quá `HUSBANDRY.sickAfterStarving` (luôn bệnh), hoặc — CHỈ khi con vật đang đói (hunger < `HUSBANDRY.hungryBelow` = 40), dơ (`isDirty`), chuồng bẩn (`penDirty`) hay già — xác suất `HUSBANDRY.sickChancePerMin` ×`sickFactor(a)` (❤️4+ thấp hơn) ×`DIRT.sickMul` (dơ) ×`SICK.dirtyPenMul` (chuồng bẩn) ×`SICK.oldChanceMul` (già). Con đang được vắc-xin thì miễn.
**Lây:** con Bệnh nặng ở chuồng thường, mỗi `SICK.spread.everyMs` (10 phút) có `SICK.spread.p` (10%) lây cho **một** con cùng chuồng còn khỏe và chưa tiêm. Chuồng cách ly không lây (và con trong đó không thả rông).
**ADR 0004 (cứng):** khi chạy bù offline (cờ `catchUp` trong state.js, dùng chung cho trình duyệt và server), tiến triển bệnh bị kẹp ở `SICK.catchUpCap` — bệnh **dừng ở Bệnh nặng**, con đang Nguy kịch **hạ về Bệnh nặng**, và không con nào chết vì bệnh hay vì đói. Chết vì già vẫn xảy ra (đã báo trước ở lát 34).
**Ngôi mộ:** con mất để lại thực thể `grave` ở ô hợp lệ gần góc Tây-Nam của đất (chọn qua `canPlace`, nên không chặn đường, dời được như công trình); con ❤️4+ thì mộ có tên. Cả trại buồn `SICK.griefMs`: vui tụt `griefHappy` ngay và không lên quá `griefCap` tới khi hết buồn; đặt hoa lên mộ thì hết buồn nhanh hơn.
**Mua bán:** `VET_ITEMS` (`medicine`, `vaccine`) chỉ bán ở **trạm thú y Cô Út** trong làng (công trình `vet`, bảng `PANELS.vet`, cùng giờ mở cửa chợ), không có ở quầy vật tư chợ Bà Tư. Hotfix: `medicine` và `vaccine` mua được từ **cấp 1** (gà cấp 1 vẫn bị Mệt, không được bế tắc). Điện thoại trong nhà = đồ đặc `phone` (bảng `PANELS.phone`) liệt kê **mọi** con đang bệnh, kể cả Mệt (`callVet` chữa được mọi mức).

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

### Vòng đời chó và dạy lệnh bằng minigame (issue 45)

```js
trickProgress(s, id)  knowsTrick(s, id)  knownTricks(s)   // số buổi đã đạt · đã thuộc lệnh? · các lệnh đã thuộc
trickProof(s)                     // thuộc đủ 6 lệnh: chó không ăn xúc xích người lạ (lát 46)
trickList(s)                      // → [{ id, name, icon, sessions, auto?, desc, step, done, can }] cho bảng dạy lệnh
canTrain(s, id)                   // → R { reason? }: unknown | stage (chó con / chó già) | learned | base (chưa thuộc Ngồi) | daily | no_item
trainStart(s, id)                 // mở một buổi: trừ 1 bánh thưởng, ghi trainDay → R { trick, quit }
trainResult(s, id, pass)          // chốt kết quả minigame "đạt/không đạt" → R { trick, step, progress, need, learned }
commandDog(s, id, spot?)          // ra lệnh ('stop' = cho nghỉ); Canh khu nhận ô gác, thiếu thì lấy ô người chơi đứng.
                                  //   Đang bị xích (issue 31) thì Canh khu / Lùa / Đi theo trả reason 'chained'
dogPost(s)                        // → { c, r } chỗ đang gác, hay null
guardRadius(s, t?) · dogSees(s, pos, { mul, t }?)   // bán kính phát hiện và "chó có thấy không": MỘT bộ luật chung cho trộm NPC
                                  //   lẫn khách online, xem mục "Chó Mực canh khách lạ"
outOfPen(s)                       // → [animal] các con đang ngoài chuồng (thả rông, lạc, bò/cừu đi lạc)
```

- Số liệu: `TRICKS` (Ngồi 2 · Đi theo 3 · Canh khu 4 · Lùa 5 · Tìm trứng 4 · Đuổi chim 3 buổi; Đuổi chim có `auto: true` = tự làm, không ra lệnh), `TRICK_BASE = 'sit'`, `TRAIN` (giai đoạn dạy được `['nho','truong']`, bánh thưởng `treat`, `fastHappy` 70, `quitHunger` 40 / `quitHappy` 35 / `quitChance` 0.5, `happyGain` 10, minigame `rounds` 3 / `need` 2 / `zone` 0.26 / `sweepMs` 1500, `herdMs` 20 giây, `stayMs` 2 phút, `autoHunger` 50 / `autoHappy` 60), `DOG.guardRadius`/`DOG.guardPostMul`.
- **Dạy lệnh:** mỗi ngày game một buổi, mỗi buổi tốn 1 `treat` (**Bánh thưởng**, vật phẩm `feed` ở chợ Bà Tư, 15 xu). Chó con chưa học được, chó già thôi học. Phải thuộc **Ngồi** trước mọi lệnh khác. Minigame (bấm đúng lúc) **chỉ gửi vào luật `pass` đạt/không đạt**; luật cộng tiến độ: chó vui ≥ `fastHappy` thì một buổi đạt ăn **2 buổi**, không thì 1. Buổi không đạt: tiến độ 0, bánh thưởng vẫn mất. Chó đói (`hunger < quitHunger`) hay buồn (`happy < quitHappy`) thì `quitChance` bỏ giữa chừng — `trainStart` trả `quit: true`, không mở `session`, `trainResult` trả `ok: false` (`reason: 'no_session'`), bánh thưởng vẫn mất.
- **Tác dụng từng lệnh:** Ngồi (đứng yên) · Đi theo (chó sang cả làng, trong nhà: `dog.scene` theo `enterScene`) · Canh khu (`dog.cmd = { id:'guard', spot }`, bán kính phát hiện ×2 tại chỗ gác) · Lùa (`dog.cmd = { id:'herd', until, list }`: luật chốt ngay danh sách `outOfPen` rồi đưa về dần trong `herdMs`, con về rồi ở yên `stayMs`; `world.js` chỉ diễn hoạt chó chạy vòng, ADR 0013) · Tìm trứng (đánh dấu `e.found = true` cho mọi `hiddenEggs`) · Đuổi chim (bị động: chó đuổi quạ ở bất cứ đâu, không cần trong bán kính).
- **Tự lùa mỗi tối:** từ `isDusk`, mỗi ngày game một lần, nếu chó thuộc Lùa và `hunger ≥ autoHunger` và `happy ≥ autoHappy` thì tự gọi lùa (event `dogHerd`).
- **Phát hiện trộm:** `stepThreats` chỉ cho chó đuổi quạ/trộm khi `guardOn` **và** `dogSees(...)` (hoặc là quạ và chó đã thuộc Đuổi chim), rồi mới tới `DOG.guardChance`. Mọi trộm NPC (kể cả Tí Sún và chồn hương) dùng chung đường này; riêng thằng Tèo có `dogSees(s, at, { mul: thiefStealth(s) })`. Ngủ gật, xích, mải ăn xúc xích (issue 31) cũng thu bán kính với trộm NPC như với khách online.
- **Xúc xích:** chó thuộc đủ 6 lệnh (`trickProof`) thì không bao giờ ăn xúc xích khách ném (issue 31), kể cả lúc đói.
- **Giao diện:** hành động trên chó có `train` (mở bảng `dog`), `cmd_<lệnh>` cho từng lệnh đã thuộc, `cmd_stop` khi đang có lệnh. `cmd_guard` trả `pickSpot: 'guard'` — `main.js` chờ chạm một ô rồi gọi `commandDog(s, 'guard', { c, r })`. Bảng `PANELS.dog` (ui.js) liệt kê 6 lệnh và chạy minigame `showTrain(trickId)` (thanh `#train-bar` có vạch `#train-zone`, kim `#train-mark`, nút `#train-hit`).
- **Pixel art (art3.js):** `SPR3.dogSitBy/dogBegBy/dogHerdBy/dogBarkBy[giai đoạn]` (mỗi giai đoạn một bộ riêng), `SPR3.dogRunBy[giai đoạn]` (dáng chạy đuổi khách của issue 31, 3 khung, mỗi giai đoạn một bộ riêng), `trainBar`, `praise`, `trickIcon` (6 lệnh), `cmdBubble`, `guardPost`, `sniffMark`, `items.treat`. `render.dogPoseImg(dog, pose, face, frame)` chọn dáng theo `world` `rt.pose` (`sit|beg|herd|bark`).

### Màu lông chó, mèo và bát ăn của chó (góp ý người chơi, bản live Phase 1+2)
```js
setCoat(state, who, coat)  // who = 'dog' | id con mèo. Ở trạm thú y Cô Út (giờ chợ), tốn COAT.price xu → { ok, msg, price }
                           //   reason 'missing' | 'closed' | 'coat' (màu không có ở loài này) | 'same' | 'coins'
```
- **Màu lông:** `COATS.cho` = vang, den, trang, dom; `COATS.meo` = muop, vang, den, tamthe; `COAT.def` = { cho: 'den', meo: 'vang' } (màu của art gốc). Chó chọn ở màn tạo nhân vật (`api.newGame({ name, look, dogCoat })`), mèo chọn lúc mua ở chợ, đổi lại ở bảng trạm thú y Cô Út (mục "Tỉa lông, đổi màu lông"). `loadGame` bù màu thiếu / lạ về mặc định (không đổi phiên bản bản lưu). Màu nằm trong bản lưu nên khách thăm vườn thấy đúng màu (seam 3: `tests/server-pet.test.mjs`).
- **Vẽ:** `coat.js` `recolor(img, sp, coat, k)` dựng mọi khung, mọi giai đoạn, mọi dáng từ chính sprite gốc (bộ cũ k = 1, bộ 2x k = 2): mỗi điểm ảnh lông nằm trên dải 4 sắc của bộ gốc được đổi sang dải màu mới đúng vị trí đó; dáng già (phai) và dáng bệnh (nhuốm xanh) nhận ra và dựng lại bằng đúng phép đó. Đốm và tam thể chọn dải theo trường nhiễu cố định tính trên lưới bộ cũ (bản 2x trùng mảng, mép mịn hơn). `render.dogImg / dogPoseImg / catImg` đọc `dog.coat` / `c.coat`, ảnh dẫn xuất nối bản 2x như mọi ảnh dẫn xuất khác.
- **Bát ăn:** `mapOf(s).dogBowl` (điểm chân, `BUILDING_DEFS.doghouse.bowl`, đi theo chuồng chó). Target `{ kind: 'bowl' }`, hành động `fill` ("Đổ xương vào bát"): lấy 1 `dogfood`, `dog.bowl + 1` tới `DOG.bowlMax`; tên target "Bát ăn của Mực · trống / còn n/3 phần". Mỗi bước, chó ở vườn, bát còn phần mà `hunger < DOG.bowlHungry` thì `eatAt = time + DOG.bowlWalkMs`; tới lúc đó ăn 1 phần (`hunger = 100`, event `dogBowl` mức info, tóm tắt vắng nhà "Chó đã tự ra bát ăn n bữa"). Chó đi theo ra làng / vào nhà thì hoãn. Cùng luật chạy ở trình duyệt, chạy bù `loadGame` và chạy bù ở server. `world.js` chỉ diễn: lúc `eatAt` đang chờ chó đi tới cạnh bát, tới nơi cúi đầu ăn (`dogPoseImg(dog, 'eat', ...)`, khung đứng có phần đầu dịch xuống 1 điểm). Cho ăn tận miệng (`feed` trên chó) vẫn giữ như cũ. Khách thăm vườn: `fill` luôn `disabled`, nhãn cho biết bát còn bao nhiêu.
- **Art:** `SPR3.dogBowl.{empty,full}` 10x7 (art3, vẽ bằng `art14.dogBowl`), `SPR14.dogBowl` 20x14 bản 2x (hd.js nối, `FILES` có 14).

### Kẻ săn mồi: chuột, diều hâu, chồn (issue 43, ADR 0004 + 0013)
```js
preds(state)             // → state.preds: [{ id, kind: 'rat'|'hawk'|'weasel', state: 'hunt'|'leaving', strikeAt, x, y, tx, ty, tile?, target? }]
predWarning(state)       // → những con đang trong khoảng cảnh báo (strikeAt - time <= PREDATOR.warnMs): nguồn của báo 🔴 và mũi tên
hurtAnimals(state)       // → con non đang mang vết chuột cắn (a.hurt), chưa băng bó
ratTraps(state)          // → các thực thể bẫy chuột đã đặt ({ kind: 'deco', item: 'deco_rattrap', shut? })
PRED_NAME                // { rat: 'Chuột', hawk: 'Diều hâu', weasel: 'Chồn' }
```
- **Luật trừu tượng (ADR 0013):** mọi quyết định theo ô và xác suất nằm trong `state.js` (`stepPreds`); `world.js` chỉ diễn hoạt (chuột lon ton tới ô `p.tile`, diều hâu lượn vòng thu hẹp dần rồi sà xuống, chồn men tới con mồi). Luật đặt `p.tx/p.ty` = điểm nó nhắm tới, `world.js` kéo `p.x/p.y` tới đó.
- **Cảnh báo trước 10 giây là việc của luật:** mỗi con có `strikeAt` = lúc ra tay. Khi còn `PREDATOR.warnMs` (10 giây) thì luật phát event `predator` (mức urgent) và `urgentSpots` có mục `pred:<id>`. **Đuổi kịp trong khoảng đó thì không ai bị hại**: target `{ kind: 'pred', id }`, hành động `shoo`.
- **🐀 Chuột:** sinh ở ô cạnh **nhà kho, đống rơm (nhà chuồng đồng cỏ), máng ăn**, mỗi phút `PREDATOR.rat.spawnPerMin` (≈1 con mỗi giờ vườn; **có mèo trưởng thành khỏe** — không bệnh, đói ≥ `CAT.guardMinHunger` — thì nhân `CAT.ratSpawnMul` = 0.5, nên ≈ 1 con mỗi 2 giờ; chó không đuổi chuột), **tối đa `PREDATOR.rat.max` = 8 con**. Cứ `rat.moveMs` đổi ô một lần (lang thang trong bán kính `rat.radius`); cứ `rat.actMs` ra tay một lần: **ăn 1 phần cám** trong máng, **trộm 1 quả trứng**, hoặc **cắn con non** (`rat.biteChance`, hoặc chắc chắn khi hết cả cám lẫn trứng).
- **Con non bị cắn:** `a.hurt = true`, `a.hurtMs` tăng theo giờ vườn; quá `rat.hurtDeadMs` thì con non không qua khỏi (chỉ khi đang chơi). Chữa bằng **1 liều thuốc thú y** (hành động `medicine` trên con vật, cũng là hành động chính lúc đó).
- **🦅 Diều hâu:** chỉ **ban ngày**, chỉ nhắm **con non đang thả rông** (`a.stage === 'non'` và có `a.tile`); con vào chuồng rồi thì nó bỏ đi tay không. Khắc chế: **chó canh** (`guardOn`; khi chó chặn một lần định tới thì hiện chữ bay và nhật ký "Mực đuổi diều hâu đi rồi 🐕", chỉ khi đang chơi, cùng hạt giống ra cùng kết quả) và **mái che sân** `deco_canopy` (con non trong `hawk.coverRadius` ô quanh mái che thì không bị nhắm).
- **🦊 Chồn:** chỉ trong khung giờ **nửa đêm** (`weasel.from`–`weasel.to`, 23h–2h), chỉ bắt **con ngủ ngoài chuồng** (`strays`). Khắc chế: lùa về chuồng (`passGate`), **chó canh** (cùng chữ "Mực đuổi chồn đi rồi 🐕"), **đèn lồng** (`weasel.lampMul` mỗi cái, tối đa 3).
- **🪤 Bẫy chuột:** vật phẩm `deco_rattrap` bán ở chợ Bà Tư, đặt bằng `placeEntity` như đồ trang trí. Chuột trong `trap.lure` ô ngửi thấy mồi và mò tới; bước vào ô có bẫy chưa sập thì bị bắt (`stats.rats++`, event `trapped`), bẫy mang cờ `shut: true` và phải **gài lại** bằng hành động `arm` trên chính nó.
- **Bảo hộ người mới:** dưới cấp `PREDATOR.minLevel` (5) không sinh con nào.
- **ADR 0004 (cứng):** khi chạy bù offline (`catchUp`) **chuột chỉ ăn cám và trộm trứng** — không cắn con non; diều hâu, chồn **không tới** (con đã có sẵn trong bản lưu thì bỏ đi tay không), nên **không con nào chết**. Vết thương đang có bị kẹp ở `rat.hurtCapMs`. Chạy bù cũng không sinh chuột quá 8.
- Hiển thị: `render.js` vẽ `SPR3.rat`/`ratEat`/`ratFlee`, `SPR3.hawk`/`hawkDive`/`hawkCarry` (+ `hawkShadow` in trên mặt đất), `SPR3.weasel`/`weaselCatch`, băng gạc `SPR3.hurtPatch` trên con non bị cắn, bẫy `SPR3.ratTrap`/`ratTrapShut`/`ratTrapFull`, mái che `SPR3.canopy`; bong bóng cảnh báo `SPR3.status.warn` trên đầu kẻ săn mồi sắp ra tay, `SPR3.status.hurtIcon` trên con bị thương.

### Mèo bắt chuột (issue 44, ADR 0004 + 0013)
```js
cats(state)              // → state.cats (thú cưng, không nằm trong state.animals)
catOf(state, id)         // → con mèo theo id | null
catsIn(state, scene)     // → mèo đang ở bản đồ 'farm' (ban ngày) hay 'house' (ban đêm)
catTrophies(state)       // → mèo đang ngậm chuột tới khoe (c.trophy)
catHouses(state) · catCap(state)   // → các nhà mèo đã xây · tổng chỗ (PEN_TABLE.cathouse.cap theo cấp)
buyCat(state, sex, coat = 'vang')   // mua ở chợ Bà Tư: reason 'closed' | 'level' | 'no_pen' (chưa có nhà mèo) | 'full' | 'sex' | 'coat' | 'coins'; buyAnimal(s, 'meo', sex, coat) gọi vào đây
catHunting(state, c)     // → mèo này đang chịu săn không (ngoài vườn, thức, đói vừa phải)
catHerd(state, id)       // lùa 1 con ngoài chuồng gần mèo nhất; reason 'stage' | 'mood' (happy < CAT.herdHappy) | 'none'
praiseCat(state, id)     // khen mèo đang khoe chuột: +happy, +độ thân, trophy = null; reason 'none' khi chưa có gì để khoe
```
- **Mở khoá:** mèo, cá khô, nhà mèo mở ở **cấp 5** = `PREDATOR.minLevel`, cùng cấp với chuột (hotfix: trước đây cấp 4, mèo nuôi rồi mà chưa có chuột). `catCatches(cat)` = số chuột con mèo đã bắt (`cat.caught`, thiếu = 0), hiện ở chữ khi chạm vào mèo ("Đã bắt N con chuột").
- **Nhà mèo:** `{ kind: 'cathouse' }` đặt bằng `placeEntity` (giá `BUILD_PRICES.cathouse`, cấp/giới hạn theo `PEN_TABLE.cathouse`), nâng cấp bằng `upgradePen`. Cửa mèo là `mapOf(s).catDoor` trên nhà (`BUILDING_DEFS.house.catDoor`), chỗ nhà mèo là `mapOf(s).catHome`.
- **Săn (luật trừu tượng):** mỗi `CAT.huntEvery` một lượt rình, nhắm con chuột gần nhất theo ô, trúng với `CAT.catchChance[giai đoạn]` × hệ số đói (đói trong `CAT.bestHunger` = 1, ngoài khoảng = `CAT.offBand`). No hơn `CAT.lazyFull` thì `c.sun = true` (nằm phơi nắng, không săn); mèo con không săn; mèo già chỉ săn khi `hunger < CAT.oldHungry`. Trưởng thành ≈ 1 con chuột mỗi 10 phút vườn. Trúng: chuột biến mất, `stats.rats++`, event `catRat`, rồi `c.trophy = { until }` + event `catTrophy` (chạy bù offline thì vẫn bớt chuột nhưng không có màn khoe).
- **Luật chỉ chọn ô:** luật đặt `c.tile` và `c.tx/c.ty` (ô đi tuần, ô con chuột bị vồ, cửa mèo); `world.js` kéo `c.x/c.y` tới đó. Đang có `trophy` thì `world.js` cho mèo ngậm chuột chạy tới đứng cạnh người chơi rồi thả chuột xuống khoe; chạm vào mèo thì `praise` là hành động chính.
- **Đêm:** vừa tối (`isNight`) mèo đi về cửa mèo (`c.inAt` = lúc chui qua, sau `CAT.doorMs`), rồi `scene = 'house'`, `sleep = true`, nằm ở `CAT.houseSpot` trong bản đồ nhà. Sáng chui ra cửa mèo lại vườn.
- **Cãi nhau với chó:** chó đứng trong `CAT.spatRadius` ô thì thỉnh thoảng (`CAT.spatPerMin`) có event `catSpat`, `c.spatUntil` để vẽ bong bóng. Không đổi chỉ số nào.
- **Không dạy lệnh, không dơ, không bán, không chết vì già** (`LIFE.meo.gia = Infinity`). Mắc bệnh như vật nuôi (`CAT.sickMul`), uống thuốc/tiêm vắc-xin bằng chung hàm; đổi tên bằng `renameAnimal`.
- **ADR 0004:** chạy bù offline mèo vẫn bắt chuột (chuột ít đi), không con vật nào chết. Server chạy bù vườn online có mèo ra cùng kết quả với `loadGame` ở trình duyệt (cùng hạt giống ngẫu nhiên), kể cả khi khách ghé lúc làng đang đêm (giờ làng trôi theo bước chạy bù, mục Thời gian); test seam 3 ở `tests/server-catchup.test.mjs`.
- **Lùa 1 con** (`catHerd`, hành động `herd` "Nhờ <tên> lùa 1 con gần nhất về chuồng"): mèo nhỡ trở lên, `happy >= CAT.herdHappy`; sổ tay trang "Lùa về chuồng" có cả đoạn về mèo.
- Hiển thị: `render.catImg(c, rt)` chọn `SPR3.animal.meo` / `sleepBy.meo` / `catPounceBy` / `catNapBy` (phơi nắng) / `catMouseBy` (ngậm chuột) theo giai đoạn; `SPR3.ratTrophy` (chuột thả xuống khoe), `SPR3.catYarn` (mèo con vờn len), `SPR3.spatBubble`, `SPR3.catDoor` trên nhà, `SPR3.cathouse[cấp-1]`, `SPR3.items.catfood` (cá khô, mua ở chợ).
### Trộm NPC: Tí Sún, chồn hương, phạt trộm (issue 46)

```js
raidPool(s)                       // → ['thief'|'tisun'|'civet'] trộm nào có đồ đáng trộm để tới đêm nay
raidChance(s)                     // → 0..RAID.max xác suất đêm nay có một vụ trộm NPC
raidTonight(s)                    // → null | { kind, at, done } vụ đã chốt cho đêm nay
guestRaids(s)                     // → số vụ bạn bè online sang trộm vườn này hôm nay (= stealsToday, issue 30, theo ngày ngoài đời)
villageWeek(s)                    // → tuần làng (7 ngày game một tuần)
thiefStealth(s)                   // → hệ số bán kính phát hiện của thằng Tèo (RAID.stealthPerCatch ^ teoCaught, sàn stealthMin)
thiefGear(s)                      // → { torch, shoes } đồ thằng Tèo đã sắm sau những lần bị bắt
punishInfo(s)                     // → null | { kind, name, coins, options } cho hộp thoại chọn phạt
punishOptions(s)                  // → [{ id: 'pay'|'chore', icon, label, disabled }]
punishThief(s, choice = 'pay')    // chọn kiểu phạt → R { coins } hay R { chore: ngày }; reason: none | unknown | weekly
```

- **Luật ở mức luật chơi (ADR 0013):** mỗi đêm `planRaid` chốt **đúng một** vụ (hoặc không vụ nào) nên không bao giờ quá 1 vụ mỗi đêm; `world.js` chỉ diễn hoạt kẻ trộm đi từ `gateIn` tới chỗ đã chốt.
- **Ai tới:** thằng Tèo cần ≥ `RAID.ripeNeed` (3) ô chín · **Tí Sún** cần ≥ `RAID.eggNeed` (3) trứng dưới đất (trứng trong bụi cũng tính) · **chồn hương** cần có con ngủ ngoài chuồng (`stray`). **Bảo hộ người mới:** dưới cấp `RAID.minLevel` (5) chưa gặp Tí Sún và chồn hương. Hôm đã có bạn online sang trộm (`guestRaids(s) > 0`, tức `today.steals` của ngày ngoài đời) thì trộm NPC không tới.
- **Tần suất:** `RAID.nightly` 0.5 = trung bình 1 vụ mỗi 2 đêm; vườn càng giàu (ô chín + trứng + con ngủ ngoài) càng thường, tối đa ×`RAID.richMul` và chặn trên `RAID.max`. Mỗi đèn lồng (tính tối đa `lampMax` 3 cái) ×`lampMul`, có hàng rào thấp ×`fenceMul`, chó đang canh nhà ×`dogMul`.
- **Ra tay:** Tèo hái một ô chín sau `THREATS.thiefStealMs` · Tí Sún ôm `RAID.eggTake` (2–3) quả sau `RAID.eggStealMs` · chồn hương tha con vật đi sau `RAID.civetCatchMs`.
- **Bắt được:** target `threat` của trộm người có hành động `catch` → `res.punish = punishInfo(s)`, `main.js` mở `ui.askPunish`. Hai lựa chọn: **bắt đền** `THREATS.thiefCaughtCoins` (20–60 xu) hoặc **phạt làm thợ không công ngày mai** — mỗi tuần làng một lần (`choreWeek`). Sáng hôm sau `doChore` tưới hết cây khô, nhổ cỏ và dọn sạch phân chó. Chồn hương là con thú: hành động `shoo`, đuổi đi là xong, không có hộp thoại phạt.
- **Trộm tiến bộ dần:** mỗi lần bắt được thằng Tèo thì `teoCaught++`; bán kính chó phát hiện nó ×`RAID.stealthPerCatch` (0.85) mỗi lần, sàn `stealthMin` 0.5. Bị bắt `torchAt` (1) lần thì có đèn pin, `shoesAt` (3) lần thì có giày êm (render vẽ đè lên nhân vật).
- **Bản lưu:** `raid`/`caught`/`chore`/`teoCaught`/`choreWeek` là trường mới, bản lưu cũ thiếu thì `loadGame` điền mặc định (không cần bước chuyển v3). Thoát game lúc hộp thoại phạt còn mở (`caught` khác null) thì lần mở sau coi như đã chọn **bắt đền**: cộng xu và ghi nhật ký.
- **Chạy bù offline (ADR 0004):** `stepRaidAway` vẫn cho trộm NPC "đã tới" nhưng **chỉ mất trứng hoặc rau** — chồn hương không nằm trong pool, không con vật nào chết hay bị bắt đi, và không để lại kẻ trộm đứng trong vườn.
- **Pixel art (art3.js):** `SPR3.npcTiSun` (đi, dùng lại bộ NPC của Tí Sún), `npcTiSunSneak` (rón rén), `npcTiSunCaught` (giơ tay, mếu) · `civet` / `civetCatch` / `civetFlee` (mỗi tư thế một bộ riêng, khác hẳn `weasel`) · `thiefTorch`, `thiefShoes` (đồ thằng Tèo), `thiefBubble` (bong bóng báo trộm), `punishIcon.pay` / `punishIcon.chore`. `render.tisunImg(pose, face, frame, dir)` và `render.civetImg(pose, face, frame)`.

### Hướng dẫn Cô Út, thông báo, Việc cần làm và sổ tay vật nuôi (issue 48)

```js
coUtQuestInfo(s)         // → null | { step, total: 3, id: 'bathe'|'cure'|'vaccinate'|null, done }
skipCoUtQuest(s)         // bỏ qua bước đang mở → R; ok:false khi không có bước nào mở
```

- **Nhiệm vụ Cô Út:** mua **con heo đầu tiên** (`buyAnimal`, chưa có heo và chưa có nhiệm vụ) mở chuỗi `CO_UT_QUEST` = tắm → chữa bệnh → vắc-xin; mỗi bước mở khi bước trước xong (làm sai thứ tự không tính), bỏ qua được. Tiến độ ở `s.coUtQuest = null | { step }` (bản lưu cũ `?? null`), xong hoặc bỏ qua hết thì không chạy lại. Heo chỉ mua được từ cấp `ANIMALS.heo.lv` (3). UI: khung `#coutquest` cạnh khung hướng dẫn, nút ✕ bỏ qua bước.
- **Thông báo:** mọi loại sự kiện vật nuôi đều có mức và khóa gộp trong `EVENT_LEVEL`. 🔴 `sickSevere`, `sickCritical`, `predator`; 🟡 `stray` (con lạc), `oldSoon`, `passed`, `born` (loại tắt/bật mới `birth`), `taken`, `died`; ⚪ `egg`, `cured`, `bathed`, `vaccinated`, `shooed`. Thông báo trình duyệt cho bệnh nặng đã có từ issue 38.
- **Việc cần làm** (`todoList`) thêm `stray` (💤 con lạc ngủ ngoài), `dirty` (🧼, không tính heo/bò đầm bùn), `muck` (💩 chuồng bẩn) và `bushEgg` (🌿 trứng trong bụi; `egg` chỉ còn trứng không nằm trong bụi), mỗi dòng có số lượng, chạm thì nhân vật đi tới.
- **Sổ tay:** thêm trang Vòng đời, Tắm, Bệnh và thú y, Lùa về chuồng (rải thóc, chó học Lùa, mèo lùa 1 con), Kẻ săn mồi. Mỗi trang có `lv` tùy chọn; trang chỉ hiện khi cấp người chơi ≥ `lv` (Tắm 2, Bệnh = `ANIMALS.heo.lv`, Lùa = `ANIMALS.vit.lv`, Kẻ săn mồi = `PREDATOR.minLevel`), cấp 1 chỉ thấy 10 trang.

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
demolishPen(state, id)            // → R { refund, reason? } phá bỏ chuồng trống (chuồng không cất vào túi được): từ chối 'has_animals' khi còn con nào (kể cả đang đi lang thang, nằm cách ly), 'has_eggs' khi còn trứng trong chuồng / ổ ấp; hoàn floor(PEN_REFUND 0.5 x (giá xây + giá các lần nâng cấp)); xóa máng s.troughs[id], phân của loại nếu là chuồng cuối loại; bumpLayout. Chuồng cuối của loài cũng phá được. UI: chạm chuồng ở chế độ xây dựng -> nút "Phá bỏ (hoàn xu)" + hộp xác nhận; Hủy trả lại chuồng, máng, phân, xu (snapLayout/restoreLayout giữ troughs, manure)
demolishRefund(entity)            // → số xu hoàn khi phá chuồng đó
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

### Thăm vườn người khác (issue 27, ADR 0012)
```js
startVisit(me, raw, owner)        // → bản đi dạo `v` (null nếu bản lưu chủ hỏng). raw = bản lưu chủ từ GET /api/visit (đã chạy bù)
                                  //   v.scene = 'visit', v.visit = { owner, fed, level (cấp chủ vườn: trong v thì `exp` là của khách) }.
                                  //   Đất, cây, con vật, chó... (farm, plots, animals, troughs, manure, eggs, clutch,
                                  //   nest, dog, cats, poops, shipbin, time, day, weather, simMs, nextId, today, guests) là bản sao của chủ,
                                  //   threats = quạ của chủ (trộm NPC thì không: bắt trộm là việc của chủ); preds = [], raid/caught/chore = null;
                                  //   chó của chủ luôn ở 'farm' (lệnh Đi theo / Lùa bị bỏ trong bản đi dạo);
                                  //   phần còn lại dùng chung với bản lưu khách `me` (giỏ, kho, đơn hàng... cùng đối tượng; coins, exp,
                                  //   stamina, can, selectedSeed đọc ghi thẳng vào me). v không bao giờ được lưu hay gửi đi.
sceneMap(v)                       // bản đồ khách: như mapOf của vườn chủ, scene 'visit', garden: true; chỉ còn cửa ra làng (doors),
                                  //   ô cửa nhà bị chắn; exit = chỗ đứng trong cổng (tới và ra); công trình riêng mang `guest` = lý do
                                  //   (BUILDING_DEFS[...].guest: house, shed, shipbin, board)
guestCheck(v, target, actionId)   // → { ok: true } | { ok: false, reason, msg }. reason: 'private' (nhà, kho, thùng giao hàng, bảng đơn),
                                  //   'build' (target { kind: 'build' } = chế độ xây dựng), 'stranger' (vuốt chó lạ chưa cho ăn),
                                  //   'no_food' (giỏ khách không có dogfood), 'help_full' / 'nothing' (việc giúp, xem mục dưới),
                                  //   các lý do của việc trộm (actionId 'steal', issue 30), 'guest' (mọi việc khác)
visitWorld(h)                     // → phần vườn chủ khách thấy được (tin `world`, sửa lỗi "khách không thấy chủ thu hoạch"): đúng các
                                  //   trường bản sao ở trên + threats (chỉ quạ) + level (cấp chủ). Không có xu, kho, giỏ, tên, chỗ đứng...
VISIT_KEYS                        // tên các trường của visitWorld (server chỉ chuyển tiếp đúng các trường này)
visitSync(v, w)                   // → true | false (tin hỏng / v không phải bản đi dạo: không đổi gì). Áp visitWorld của chủ lên bản
                                  //   đi dạo. Giữ: phần của khách, chỗ đứng của khách; chỗ đứng của con vật, mèo, quạ (cùng id, cách
                                  //   chỗ chủ gửi < 64px) và chó (world.js đang cho đi lại); lần sủa / nghỉ của chó mới hơn
                                  //   (barkAt, barkX, barkY, quiet: khỏi sủa lại ngay); `farm` y nguyên thì giữ đối tượng cũ (khỏi dựng lại
                                  //   bản đồ). Việc giúp / trộm khách vừa làm (v.visit.mine, ghi lúc perform) mà nhật ký khách của tin
                                  //   chưa có mã đó thì áp lại bằng guestOpApply; tin có rồi, áp không được nữa hay quá 15 giây thì bỏ.
```
Bản đi dạo **không tự chạy mô phỏng** (`main.js` chỉ `tick` vườn mình); nó đổi theo tin `world` của chủ. `main.js` phía chủ: server báo có khách (`watch`, n > 0) thì gửi `{ t: 'world', w: visitWorld(vườn mình) }` ngay, rồi mỗi khi vườn đổi (`changed()`: mọi hành động, việc khách) tối đa 1 lần/giây và đều đặn 4 giây/lần cho phần tự đổi (cây lớn, gà đẻ...); đang thăm vườn khác vẫn gửi vườn nhà; đang ở chế độ xây dựng thì chưa gửi. Phía khách: tin `world` có `owner` đúng vườn đang thăm thì `visitSync` rồi `ensurePositions`. `sync.send` không gửi tin dài quá 200 000 ký tự (server ngắt ở 256 KB).
Ở cảnh `visit`, `actionsFor` chỉ còn: cổng (`enter` → `go: 'village'`), hộp quà và sổ lưu bút ở cổng (`open`, issue 29), chó (`pet`, `feed` bằng `dogfood` trong **giỏ** của khách; cho ăn rồi thì chó quen tới hết lượt thăm), các việc giúp ở ô ruộng và con quạ (issue 28), việc trộm ở ô chín / trứng dưới đất / con vật đang chờ lấy sữa, lông (`steal`, issue 30), công trình riêng (hành động thường nhưng `disabled` = lý do); còn lại `[]`. `todoList` trả `[]`. `main.js`: nút **🚪 Vào** ở mỗi cổng vườn trong bảng `friends` (chạm Cổng bạn bè trong làng khi online, issue 26) gọi `api.visit(name)` (chỉ khi đang đứng ở làng; lỗi hiện trong bảng) → `net.visitFarm(name)` → `startVisit` → mờ màn hình rồi `state` = bản đi dạo, vườn mình giữ ở `home` (vẫn `tick`, vẫn lưu/gửi như thường; bỏ báo gấp 🔴 khi đang thăm). Ra cổng (bước qua ô cổng, nút cổng, hoặc nút **🚪 Về làng** ở `#visit-bar` tự đi ra cổng) → về `home`, đứng ở làng đúng chỗ lúc vào. Vào hay ra đều dựng lại `world` nên thao tác đang dở bị hủy. Chế độ xây dựng ẩn nút; gọi vẫn chỉ hiện lý do.

### Giúp và trộm vườn bạn: thao tác của khách (issue 28, 30, ADR 0012)
Thao tác của khách là **hàm thuần** trên bản lưu chủ: server kiểm tra rồi xếp hàng bằng chính các hàm này, trình duyệt chủ áp dụng cũng bằng các hàm này. Không có gì ngẫu nhiên (bắt sâu giúp luôn trúng, phần trộm được tính theo bảng) nên hai nơi ra cùng kết quả.
```js
// op = { id (mã duy nhất), kind: 'help' | 'steal',
//        act: 'water'|'weed'|'catch'|'shoo' (help) | 'crop'|'egg'|'product' (steal),
//        idx (ô ruộng) | crow (id con quạ) | egg (id quả trứng) | animal (id con vật),
//        at (giờ ngoài đời), by (tên khách), level (cấp khách), room (chỗ trống giỏ khách) }
//        — `by`, `level`, `room`, `at` do server điền
// who = { name, level, room } của khách
guestOps(state, target)           // → các thao tác khách làm được lên target ngay lúc này (chưa có mã): [{ kind, act, idx|crow|egg|animal }]
guestOpCheck(host, who, op)       // thuần, không đổi gì → { ok: true, target } (trộm thì thêm { item, qty }) | { ok: false, reason, msg }
                                  //   reason: 'op_invalid' (thao tác lạ) · 'done' (mã này đã áp dụng rồi) · 'help_full' ("Vườn này hôm
                                  //   nay đã được giúp đủ") · 'nothing' ("Ở đây không còn gì để làm/để trộm", vd chủ vừa tưới ô đó)
                                  //   trộm: 'cant_steal' (con vật, trái khổng lồ, đồ trong kho/nhà, cá) · 'host_new' ("Vườn này còn quá
                                  //   nhỏ để trộm") · 'guest_new' (khách chưa tới cấp 5) · 'robbed' (người này trộm ở đây rồi) ·
                                  //   'full' (giỏ khách đầy) · 'day_full' (vườn đã mất 30% giá trị đồ chín hôm nay)
guestOpApply(host, who, op)       // kiểm tra rồi áp dụng lên bản lưu chủ → { ok: true, msg, reward, event } | lý do từ chối.
                                  //   reward = { coins, exp, help: 1 } (giúp) | { items: { <món>: qty }, steal: 1 } (trộm).
                                  //   Trộm còn ghi host.robAt (chỗ bị trộm, cho mũi tên 🔴, issue 32)
                                  //   Cộng host.today.helps (giúp) hay today.steals + today.stolen (trộm) và ghi một dòng vào
                                  //   host.guests (nhớ op.id) nên áp dụng lại cùng mã là no-op
guestReward(me, reward)           // cộng xu + EXP, bỏ đồ trộm được vào giỏ/kho và cộng me.today.robs (chỉ gọi khi server đã xác nhận);
                                  //   issue 32: help → stats.helps++, steal → stats.robStreak++, bite → robStreak = 0, rồi xét thành tựu
takeGuestLog(state)               // các dòng guests chưa seen → [{ type: 'helped', by, act, at }] / [{ type: 'stolen', by, item, qty, at }]
                                  //   rồi đánh dấu đã xem (báo một lần)
helpsToday(state, t?)             // số việc giúp vườn này đã nhận hôm nay (ngày ngoài đời theo serverDay)
helpLeft(state, t?)               // số lượt giúp còn lại hôm nay (GUEST.helpMax - helpsToday)
stealsToday(state, t?)            // số vụ vườn này bị trộm hôm nay · stolenToday(state, t?) = tổng giá trị đã mất
robsToday(state, t?)              // số vụ chính mình đi trộm hôm nay (bản lưu khách)
ripeValue(state)                  // tổng giá trị đồ đang chín chờ lấy trong vườn (cây chín, trứng dưới đất, sữa và lông đang chờ)
stealLeft(state, t?)              // giá trị vườn này còn chịu mất hôm nay (GUEST.dayPct của ripeValue + phần đã mất)
HELP_FULL                         // câu "Vườn này hôm nay đã được giúp đủ" · STEAL_SMALL = "Vườn này còn quá nhỏ để trộm"
```
- **Việc giúp** (`GUEST`, `HELP_JOBS` trong data.js): tưới (`water`), nhổ cỏ (`weed`), bắt sâu (`catch`), đuổi quạ (`shoo`). Điều kiện đúng như của chủ (`FIT`): ô khô mới tưới được, có cỏ mới nhổ, có sâu mới bắt, con quạ còn đó mới đuổi. Giúp không tốn nước bình, thể lực hay đồ của khách.
- **Thưởng khách:** `GUEST.helpCoins` = 3 xu + `GUEST.helpExp` = 2 EXP mỗi việc. **Giới hạn:** mỗi vườn mỗi **ngày ngoài đời** nhận tối đa `GUEST.helpMax` = 10 việc giúp.
- **Giao diện:** ở cảnh `visit`, chạm ô ruộng (hay con quạ) hiện các nút 💧 Tưới giúp / 🌿 Nhổ cỏ giúp / 🤏 Bắt sâu giúp / 🪶 Đuổi quạ giúp đúng theo trạng thái (id hành động `help_<act>`); hết lượt thì nút vẫn hiện nhưng **mờ** kèm lý do. Thanh `#visit-bar` có thêm dòng "Còn x lượt giúp hôm nay" (`ui.setVisit(owner, left)`).
- **Luồng:** `perform` trả thêm `guestOp` (thao tác vừa làm, đã áp dụng lên bản đi dạo để khách thấy liền) → `main.js` gửi `{ t: 'guest', op }` lên server → server kiểm tra trên bản lưu mới nhất của chủ rồi trả `{ t: 'guest', ok, reward }` (khách lúc đó mới được cộng xu/EXP hay nhận đồ trộm được) hoặc lý do từ chối (toast). Chủ đang online nhận `{ t: 'guestop', op }` → `guestOpApply` trên vườn mình → `takeGuestLog` → toast 🟡 gộp "Lan đã tưới 3 ô giúp bạn 🙏" hay băng rôn 🔴 "Bình đã trộm 1 cà chua lúc 3h chiều 😤". Chủ vắng thì server áp dụng thẳng vào bản lưu; lần sau chủ vào làng, `takeGuestLog` báo sau khi đóng màn "Trong lúc bạn vắng nhà" (`ui.afterAway(fn)`).

**Trộm (issue 30, DESIGN §7.1).** Trong giới hạn thì vụ trộm thành công; chó canh vườn (issue 31) không chặn vụ trộm mà **phạt sau**: bị đớp thì rơi hết đồ vừa trộm.
- **Trộm được:** cây đã chín (`act: 'crop'`, `idx`), trứng dưới đất (`'egg'`, `egg` = id quả trứng), sữa và lông đang chờ lấy (`'product'`, `animal` = id con vật). **Không trộm được:** con vật (`'animal'`), trái khổng lồ (`'giant'`), đồ trong kho và trong nhà (`'store'`), cá (`'fish'`) — bốn act này luôn trả `cant_steal` kèm lý do riêng.
- **Giới hạn** (`GUEST` trong data.js): mỗi vụ lấy `max(1, floor(còn lại × GUEST.stealPct=0.25))` món của ô hay con đó; mỗi người **một lần mỗi ô hay mỗi con** (`crop.robbed` giữ tên người đã trộm ô đó, trứng và sữa thì mất luôn mục tiêu); mỗi vườn mỗi **ngày ngoài đời** mất tối đa `GUEST.dayPct` = 30% tổng giá trị đồ chín (`stealLeft`). Chủ hay khách dưới `GUEST.stealLv` = cấp 5 thì không có chuyện trộm. Giỏ khách không đủ chỗ thì từ chối.
- **Chi phí:** `STAMINA.cost.steal` = 2 thể lực mỗi vụ, trừ ngay lúc khách bấm (cùng cơ chế thể lực Phase 0; hết sức thì đi và làm chậm). Khách **không** được xu hay EXP, chỉ được đồ.
- **Sản lượng ô:** `crop.stolen` = số món đã bị trộm, `harvestQty` trừ đi phần đó nên chủ hái phần còn lại.
- **Trộm NPC nhường:** hôm nào vườn đã có `stealsToday > 0` thì không có trộm NPC nào (thằng Tèo, Tí Sún, chồn hương): `raidPool` trả `[]` qua `guestRaids` (issue 46).
- **Giao diện:** ở cảnh `visit`, chạm ô chín / quả trứng / con vật đang chờ lấy hiện nút **😈 Trộm n &lt;món&gt; (còn m)** (id hành động `steal`); bị chặn thì nút vẫn hiện nhưng **mờ** kèm lý do. Chủ xem nhật ký khách trong bảng **📜 Nhật ký** (mục "Khách ghé vườn", `.guest-row[data-by]`): dòng trộm `.stolen` ghi "B đã trộm 1 cà chua lúc 3h chiều 😤" (giờ ngoài đời giờ Việt Nam, `data.js hourText`) và có nút **😤 Sang trộm lại** (`.revenge`) gọi `api.revenge(name)` — đi qua làng rồi vào thẳng vườn kẻ trộm; kẻ trộm dưới cấp 5 hay mình chưa tới cấp 5 thì nút mờ kèm lý do.
- **Báo gấp 🔴:** event `stolen` là mức `urgent`; `ui.handleEvents` bật băng rôn đỏ + tiếng + rung ngay (`alertNow`), không cần chỗ cố định trong vườn. Đẩy tới mọi bản đồ làm đầy đủ ở issue 32.

### Chó Mực canh khách lạ (issue 31, DESIGN §6.1, ADR 0013)
Luật nằm trong `state.js` ở mức ô và theo trạng thái bản lưu; `world.js` chỉ **diễn hoạt** (chó sủa, chạy đuổi) và báo cho `main.js` biết lúc nào gửi thao tác lên server. Phần đuổi theo chạy trên **trình duyệt của khách** vì khách mới là người đang di chuyển.
```js
guardRadius(state, t?)            // bán kính canh tính theo Ô (0 = không canh), chung cho khách online và trộm NPC:
                                  //   theo giai đoạn DOG.guardRadius (non 0 · nhỡ 4 · trưởng thành 6 · già 4);
                                  //   vui < GUARD.sadHappy (50) còn một nửa; đang gác (lệnh Canh khu) ×DOG.guardPostMul;
                                  //   đói < GUARD.hungryStop (30) hay đang mải ăn xúc xích thì 0; ngủ gật còn
                                  //   GUARD.napRadius = 1; bị xích thì tối đa GUARD.chainRadius = 3
dogSees(state, pos, { mul = 1, t }?) // chó có thấy kẻ lạ đứng ở pos ({ x, y } điểm ảnh bản đồ) không. Tâm vùng canh: chỗ gác
                                  //   (lệnh Canh khu), chuồng chó khi bị xích, không thì chính con chó. mul < 1 = đi lặng lẽ
guardArea(state)                  // vùng chó chạy được khi bị xích: { x, y, r } (điểm ảnh); null = thả rông, khắp vườn
dogAsleep(state)                  // đang ngủ gật (ban đêm và state.time < dog.nap)
dogQuiet(state, t?)               // đang mải ăn xúc xích (t < dog.quiet, giờ ngoài đời)
walkSpeed() / chaseSpeed()        // px/s người đi bộ (WALK_SPEED = 70) và chó đuổi (× GUARD.chaseMul = 1.3)
setChained(state, on)             // chủ xích chó / thả rông (hành động `chain` ở target { kind: 'dog' }); xích thì thôi lệnh
                                  //   Canh khu / Lùa / Đi theo (issue 45)
barkOp(state) / biteOp(state)     // chỉ ở cảnh 'visit': kiểm bằng luật, xem trước ngay trên con chó của bản đi dạo
                                  //   rồi trả { msg, guestOp, ... } cho main.js gửi lên server (biteOp còn trả `stunMs`);
                                  //   null = chưa làm được. KHÔNG ghi sổ của chủ ở đây: trong bản đi dạo `coins`,
                                  //   `stats`, `log` là của khách, nên xu phạt và thống kê để server + trình duyệt chủ làm
keepLoot(state, items)            // ghi đồ khách vừa trộm được trong lượt thăm (gọi khi server xác nhận); bị đớp là rơi hết
```
- **Ngủ gật** (`stepDog`): ban đêm cứ `GUARD.napEvery` = 60 giây giờ vườn lại quay một lần, trúng `GUARD.napRate` = 30% thì ngủ `GUARD.napMs` = 60 giây → khoảng **30% thời gian ban đêm**. Ban ngày `dogAsleep` luôn false (không xóa `dog.nap`, vì server chạy bù theo giờ làng thật).
- **Thao tác mới của khách** (cùng hàng đợi và cùng mã thao tác của ADR 0012, áp dụng hai lần cùng mã chỉ tính một lần):
  - `{ kind: 'bark', act: 'bark', x, y }` — chó phát hiện khách ở (x, y). Ghi `dog.barkAt/barkX/barkY`, `stats.barks++`, event `barked` (🔴) kèm `where` ("phía Đông vườn"). Một vườn chỉ ghi một dòng trong `GUARD.barkEvery` = 20 giây (`reason: 'barking'`).
  - `{ kind: 'bite', act: 'bite', loot: { <món>: n } }` — chó đớp trúng. Chủ được `GUARD.fine` = 30 xu, `stats.chased++`, nhật ký "X bị Mực đớp"; khách nhận `reward = { lose: loot, fine, bite: 1 }` → `guestReward` bỏ hết đồ vừa trộm, trừ xu (không âm) và đặt `stats.robStreak = 0`. Chủ **không mất thêm** gì (phần đã bị trộm vẫn tính). Khách đứng hình `GUARD.biteStunMs` = 3 giây.
  - `{ kind: 'sausage', act: 'sausage' }` — khách ném xúc xích (vật phẩm `sausage`, 30 xu ở chợ Bà Tư, cấp 5). Chó thuộc đủ 6 lệnh (`trickProof`, issue 45) thì **không bao giờ ăn**. Còn lại: chó no dưới `GUARD.sausageHunger` = 50 thì **chắc chắn ăn**, chó đang no vẫn `GUARD.sausageGreed` = 30% tham ăn — phần hên xui quay bằng **hạt giống cố định = mã thao tác**, nên server và trình duyệt chủ ra cùng kết quả. Ăn thì `dog.quiet = at + GUARD.quietMs` (im lặng 60 giây). Kết quả trả `{ ate }`, khách mất 1 xúc xích dù chó có ăn hay không.
  - Cả ba từ chối với `reason: 'no_guard'` khi vườn không có chó đang canh, `'no_item'` khi khách hết xúc xích.
  - **Ai kiểm cái gì (issue 45 + 49):** khách mới là người di chuyển, nên **"chó có thấy khách không"** do trình duyệt khách tính bằng `dogSees` trên bản đi dạo (`startVisit` giữ nguyên `dog.stage`, `dog.chained`, `dog.cmd` Canh khu của chủ: tâm vùng canh là chỗ gác, bán kính ×`DOG.guardPostMul`). Server **không kiểm vị trí** của thao tác sủa/đớp; nó chỉ kiểm bằng `guestOpApply` những gì không phụ thuộc vị trí: `guardRadius(host) > 0` theo bản lưu chủ (chó con, chó đói, chó đang mải ăn xúc xích thì `no_guard`), nhịp `barking`, mã thao tác. Test seam 3: `tests/server-dog.test.mjs`.
- **Chủ vườn:** online thì nhận `{ t: 'guestop', op }` → `guestOpApply` → `takeGuestLog` → băng rôn 🔴 "Mực đang sủa ở phía Đông vườn!" kèm **mũi tên** (todo kind `bark`, sprite `SPR2.barkArrow`, tắt sau `GUARD.barkShowMs` = 15 giây) và toast 🟡 khi chó đớp được hay bị ném xúc xích (loại thông báo `guard`). Offline thì server áp dụng thẳng vào bản lưu, chủ về đọc nhật ký.
- **Chó trong vườn người khác không đi theo khách lạ** (`world.js`): nó quanh quẩn giữ chuồng, chỉ rời chỗ khi đuổi. Lúc đuổi thì chạy `chaseSpeed()`, đớp khi cách khách `GUARD.biteRange` = 11 px, mất dấu `GUARD.loseMs` = 2 giây thì thôi đuổi; màn hình khách rung nhẹ lúc chó sủa và lúc bị đớp.
- **Nhật ký chó:** `stats.chased` = đã đớp được bao nhiêu người, `stats.barks` = đã sủa mấy lần (issue 32 dùng cho thành tựu và màn "Trong lúc bạn vắng nhà"). `stats.robStreak` = chuỗi trộm chưa bị đớp của chính mình.

**Vắng nhà, thông báo và thành tựu xã hội (issue 32).**
- **Màn "Trong lúc bạn vắng nhà…"** có thêm mục **Khách ghé vườn** (`awayGuests`, `ui.showAway({ ..., guests })`): ai giúp mấy việc, ai trộm món gì bao nhiêu, quà và lời nhắn mới ở cổng, chó đuổi được bao nhiêu người. Vắng ngắn (không có `s.away`) mà có khách thì vẫn hiện, chỉ có phần khách. Màn dài thì cuộn trong khung (`.away-card` `overflow-y: auto`), không tràn ngang.
- **Thông báo 3 mức cho việc của khách:** 🔴 `stolen`, `barked` (cùng chỗ gấp `rob`, `bark` trong `urgentSpots` / todo) hiện ở **mọi bản đồ**: ở vườn mình có mũi tên chỉ chỗ; ở làng, trong nhà mũi tên chỉ về cửa/cổng; đang thăm vườn bạn thì chỉ có băng rôn (`ui.updateAlerts(mine, toScreen, now, visiting)`). Ở ngoài vườn mình băng rôn có nút **🏡 Về vườn** (`#alert-home` → `api.goHome()`: tự đi tới cửa/cổng về vườn; đang thăm vườn bạn thì đi ra cổng trước rồi đi tiếp). 🟡 `visited` (tin `{ t: 'visit' }` của server, gộp theo người, loại `visit` = "Bạn bè ghé"), `helped` (gộp theo người và việc), `gift`, `note`. Kênh tới chủ là `live.sendTo(accountId)` theo người, không theo bản đồ.
- **Thành tựu xã hội** (`ACHIEVEMENTS` có `badge`; tiến độ trong `stats`): `helper50` "Hàng xóm tốt bụng" giúp 50 lần (`stats.helps`, bản lưu của người giúp) · `robber30` "Siêu trộm" trộm 30 lần liền không bị chó đớp (`stats.robStreak`, bị đớp về 0) · `guard20` "Vườn bất khả xâm phạm" chó đuổi được 20 kẻ trộm (`stats.chased`, bản lưu chủ). Mở khóa: huy hiệu "Thành tựu mới!" (`#badges .badge[data-id]`) dùng sprite riêng; danh sách 🏆 Thành tựu có huy hiệu khóa/mở và thanh tiến độ. Thành tựu giao 10 đơn hàng đổi tên thành "Giao hàng tận tâm" để không trùng tên.
- **Sprite:** `SPR2.badges.helper|robber|guard.on|off` (16x18): huân chương xanh có bàn tay xòe + trái tim, huân chương tím có mặt nạ kẻ trộm, khiên gỗ có dấu chân chó; bản khóa xám có ổ khóa.

### Quà và sổ lưu bút ở cổng (issue 29, ADR 0012)
```js
GATE_BOXES                        // ['giftbox', 'guestbook'] — hai vật ở cổng vườn (BUILDING_DEFS, fixed, loadGame tự thêm vào vườn cũ)
giftable(itemId)                  // tặng được không: hạt giống, nông sản hoặc sản phẩm
giftBoxCheck(box, item, qty)      // chỉ xét hộp (server dùng): { ok } | { ok: false, reason, msg }
                                  //   reason: 'bad_item' | 'bad_qty' | 'too_many' (> GIFT.perGift) | 'box_full' (hộp đã có GIFT.boxMax quà chờ)
giftCheck(state, box, item, qty)  // thêm phần của khách: 'no_item' (không có món) | 'not_enough' (thiếu); box = null thì chưa biết hộp
giftTo(state, box, item, qty, op) // trừ khỏi giỏ/kho khách rồi đẩy { op, item, qty } vào `box`. op đã có trong box → { ok: true, dup: true }
splitGifts(box, room)             // thuần: → { taken, rest }. Nông sản chỉ lấy tới khi hết `room` chỗ giỏ, hạt giống lấy hết; phần dư nằm lại
addGifts(state, taken)            // cho các phần đã lấy vào giỏ/kho, trả tổng số món
takeGifts(state, box)             // chủ mở hộp: splitGifts theo chỗ trống trong giỏ, sửa `box` tại chỗ, → R { taken, moved }
```
`data.js` `GIFT` = `{ perGift: 10, boxMax: 12, noteMax: 80 }`. Hộp quà là **hàng đợi trên server** (bảng `gifts`) nên chủ offline vẫn nhận; `state.js` chỉ giữ luật thuần, server và trình duyệt gọi lại cùng hàm. `state.gate = { gifts, notes, open }` là **tin từ server**, không nằm trong bản lưu (`loadGame` xóa đi): `gifts`/`notes` = số đang chờ / chưa đọc, `open` = id bảng đang mở (render đổi sprite hộp quà, sổ). Khách (`guestCheck`) được chạm hai vật này như cổng; `actionsFor` cho `open` 🎁 "Tặng quà cho chủ vườn" / 📖 "Ký sổ lưu bút" (khách) hoặc "Mở hộp quà" / "Đọc sổ lưu bút" (chủ), `main.js` mở bảng `giftbox` / `guestbook`.

### Thể lực, ngủ
```js
slowFactor(state)                 // 1, hoặc STAMINA.slow (2) khi hết thể lực: world chia tốc độ đi, main nhân thời gian làm
canSleep(state)                   // chỉ từ STAMINA.sleepHour (18h)
sleep(state)                      // → R { reason: 'early', slept } tua có mô phỏng thật tới 6h sáng hôm sau, hồi đầy thể lực (như chạy bù: không quạ/trộm)
standUp(state)                    // bỏ trạng thái ngồi
```
Chi phí: `STAMINA.cost` {cuốc, tưới, gieo, thu hoạch = 1; dọn bụi 2; đập đá 3}, làm n ô một lần = `cost × GROUP_COST[n]`. Vuốt ve, cho ăn tận tay, nhặt trứng, mua bán không tốn. Hồi: sáng 6h `+morningRegen` (30; chỉ khi đang chơi, chạy bù lúc vắng nhà không hồi), ngồi ghế đá `benchPerMin` mỗi phút.

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
fulfillOrder(state, orderId)      // → R. Đơn của làng xin: cây trồng đã mở khoá, trứng gà/vịt, và (30% đơn) sản phẩm vật nuôi
                                  // khác (sữa bò, lông cừu) chỉ khi nhà đang nuôi loài đó và đủ cấp; heo, chó, mèo không có sản phẩm nên không có đơn.
                                  // Thưởng vẫn = tổng giá bán × ORDERS.rewardMul; dạng đơn không đổi nên bản lưu cũ không cần migrate.
```
Chợ Bà Tư thay sạp hàng và nhà kho bán hàng cũ (sạp bị bỏ khỏi vườn).

### Mua online, người giao hàng (hotfix sau Phase 2)
```js
canOrder(itemId)                  // món đặt online được: ITEMS có giá, kind seed | supply (gồm thuốc thú y, vắc-xin) | feed | deco
deliveryMode(id)                  // một phần tử của DELIVERY.modes: 'now' (ms 0, phí 30%) | 'm1' (1 phút, 20%) | 'm2' (2 phút, 10%); thiếu hoặc lạ → 'm2' (client cũ)
deliveryFee(cost, mode)           // phí giao = max(DELIVERY.feeMin, ceil(cost × phí của kiểu giao)); cost 0 → 0
orderQuote(state, cart, mode)     // → R { items, cost, fee, total }: cart = { itemId: qty }, hàm thuần, không trừ xu (qty ≤ DELIVERY.maxQty)
orderOnline(state, cart, mode)    // → R { order, reason? }: trừ xu ngay (tiền hàng + phí theo kiểu giao). 'now': hàng vào kho tức thì (event delivered, nhật ký, không có đơn chờ, không bị giới hạn maxPending, order null). 'm1'/'m2': thêm vào state.deliveries { due, by = at + ms }. Đặt lúc nào cũng
                                  // được (chợ đóng vẫn đặt). Từ chối: giỏ trống, món không đặt được, chưa đủ cấp, reason 'coins' |
                                  // 'pending' (đã có DELIVERY.maxPending đơn chờ) | 'visit' (đang ở vườn bạn). Có hạt giống thì tính bước "mua" của hướng dẫn
pendingDeliveries(state)          // → [{ ...đơn, total, eta, onWay }]: eta = ms giờ vườn dự kiến tới kho
deliveryEta(state, order)         // ms dự kiến: đang trên đường → arriveAt - time; chưa đi → chờ tới due, rơi vào lúc chợ đóng thì tới 6h sáng, + quãng đi bộ; không vượt hạn `by` khi chợ mở
```
Luật trong `step` (chạy như nhau ở trình duyệt và lúc chạy bù, cả server): người giao hàng rảnh, chợ đang mở (`marketOpen`, giờ chợ không đổi 6h–18h) và có đơn đã tới `due` (= `by` − quãng đi bộ, nên người giao hàng tới kịp hạn; đơn cũ trong bản lưu chỉ có `due` vẫn chạy như trước) thì lên đường mang **mọi** đơn đã tới hạn: `courier = { state: 'coming', from: cổng (gateIn), at: trước nhà kho, arriveAt }`, thời gian đi = max(walkMin, quãng thẳng / speed × walkMul). Đơn tới hạn `by` lúc chợ mở thì hàng vào kho đúng hạn dù người giao hàng còn đang đi (tổng thời gian đã chọn gồm cả quãng đi bộ). Tới `arriveAt`: hàng vào **kho** (`inv`, không vào giỏ, kho không giới hạn nên không có chuyện đầy), các đơn đó rời `deliveries`, event `delivered`, nhật ký "Người giao hàng đã giao tới kho: …", chữ bay "Hàng tới rồi 📦"; `state = 'leaving'` rồi sau `leaveMs` thì `courier = null` (chuyến sau mới đi tiếp). Đang thăm vườn bạn thì không giao (về nhà mới giao), `startVisit` không mang người giao hàng theo. Vật nuôi, quần áo vẫn chỉ mua ở làng. Màn "Trong lúc bạn vắng nhà" có dòng "Người giao hàng đã giao N đơn hàng online tới kho 📦".

Giao diện: bảng `order` (🛒 Đặt hàng online) mở từ nút 🛒 "Mua hàng" ở thanh dưới (`#bb-order`, ở vườn/làng/nhà, ẩn khi đang thăm vườn bạn), từ nút "Đặt hàng online" trong Túi đồ (cả trong nhà kho) và trong bảng điện thoại; chọn kiểu giao bằng ba nút `#order-modes [data-mode]` (Giao ngay 30% · sau 1 phút 20% · sau 2 phút 10%, ghi phí xu cho phiếu hiện tại, mặc định 2 phút), chọn chợ Bà Tư / trạm Cô Út bằng `#order-shops`; có danh sách đơn chờ giao với giờ dự kiến (đổi từng giây, `[data-eta]`), phiếu đặt hàng (−1 / ✕, tổng = tiền hàng + phí giao, nút `#order-buy`), các tab Hạt giống / Vật tư / Thức ăn / Trang trí (Bà Tư), đồ thú y (Cô Út) với nút +1 / +5. Người giao hàng có sprite riêng (`artcourier.js`: `COURIER_ART.carry|empty[hướng][khung]` 16x24, `box` 12x10; bản 2x `COURIER_ART_HD`, `hd.js` nối), toast "Hàng đã giao tới kho" dùng icon thùng hàng.

### Thông báo, Việc cần làm, cài đặt
```js
notifyOn(state, cat)  setNotify(state, cat, on)   // cat ∈ NOTIFY_CATS (ripe, spoil, hungry, loss, levelup, order, help, gate, guard, visit, old, stray, ill, pest, birth)
urgentSpots(state)                // → [{ key, kind, x, y, text }] chỗ đang có chuyện gấp, tính từ trạng thái (không cần event).
                                  //   kind: crow/thief (đang ăn), sick, bark (chó sủa), rob (bạn vừa trộm, issue 32), kẻ săn mồi sắp ra tay (rat/hawk/...), hurt (con non bị chuột cắn)
// notify.js
eventMeta(event)                  // → { level, cat, group, label } | null (event chưa khai báo mức)
createNotifier({ show, on, win }) // gộp toast mức 'important' cùng khóa trong NOTIFY_WINDOW
arrowTargets(state, items)  arrowFor(point, box, margin)
// todo.js
todoList(state)                   // → [{ kind, level: 'urgent'|'normal', count, scene: 'farm', x, y, target, spots: [{ key, x, y, target }], icon, label }]
                                  //   xếp theo mức gấp rồi số lượng; (x, y, target) là chỗ gần người chơi nhất
```
Loại việc của `todoList`: `crow`, `thief`, `tisun`, `civet`, `pred` (kẻ săn mồi sắp ra tay), `hurt` (con non bị chuột cắn), `sick` (con Bệnh nặng trở lên — gấp); `tired` (con mệt), `hungry`, `dry`, `bugs`, `weeds`, `ripe`, `egg`, `trough`, `poop` (thường). Bảng Việc cần làm, bản đồ nhỏ và mũi tên đều đọc từ danh sách này (chạm một dòng thì `main.api.todoGo(kind)` cho nhân vật tự đi tới, kể cả khi đang ở bản đồ khác: ra cửa về vườn rồi đi tiếp).

**Mức và khóa gộp của event** (`EVENT_LEVEL` trong `data.js`): mỗi event có `level`, `group(e)` (khóa gộp), `label`; mức `important` có thêm `cat` (loại tắt được) và `text(n, e)` (chữ đã gộp, ví dụ "5 ô cà chua đã chín"). Mức: `urgent` 🔴 (băng rôn đỏ, âm thanh, rung, mũi tên; không tắt được) · `important` 🟡 (toast nhỏ, tự gộp) · `info` ⚪ (chỉ ghi nhật ký) · `direct` (hiện ngay không gộp) · `none` (hiệu ứng/âm thanh, không thông báo). **Thêm event mới thì khai báo trong `EVENT_LEVEL`**, thiếu thì `eventMeta` trả `null`.

### Hằng và tiện ích khác
`UNLOCK_ORDER`, `nextLockedPlot`, `stageOf(crop)`, `levelInfo`, `mapOf`, `reachable`, `footprint`, `sceneMap`, `mmss`, `TUTORIAL`. `UNLOCK_ORDER`/`lockedPlot` chỉ còn cho ô chưa mở trong khối ruộng chuyển từ v1 (mở theo thứ tự cũ); vườn mới không có ô khóa. Chạm ô khóa chưa tới lượt thì hành động `expand` bị vô hiệu kèm lý do "Mở ô N trước (mở đất theo thứ tự)".

### Danh sách target (`{ kind, ... }`)

```js
{ kind: 'plot', idx }          // ô ruộng đã mở
{ kind: 'lockedPlot', idx }    // ô chưa mở kế tiếp trong khối chuyển từ v1
{ kind: 'animal', id }
{ kind: 'egg', id }
{ kind: 'poop', id }
{ kind: 'trough', pen, id? }   // pen: 'chicken'|'pig'|'pasture'; id = thực thể chuồng (có nhiều chuồng cùng loại). Máng ăn theo từng chuồng: state.troughs[id chuồng] (không có id thì chuồng đầu của loại)
{ kind: 'scale', pen: 'pig' }  // cái cân cạnh máng chuồng heo (PEN_DEFS.pig.scale): cân heo (issue 40)
{ kind: 'gate', id }           // cửa chuồng (id thực thể chuồng); chỉ là target từ chạng vạng (isDusk), cho rải thóc và xem số con đã về
{ kind: 'nest' }
{ kind: 'dog' }           // chó Mực: ở vườn, hay bất cứ bản đồ nào khi đang có lệnh Đi theo
{ kind: 'bowl' }               // bát ăn của chó cạnh chuồng chó (vườn mình và vườn đang thăm)
{ kind: 'threat', id }
{ kind: 'pred', id }           // chuột, diều hâu, chồn: chạm để đuổi (issue 43)
{ kind: 'cat', id }            // mèo (issue 44): ở vườn ban ngày, trong nhà ban đêm
{ kind: 'deco', id }           // đồ trang trí trong vườn (ghế đá: ngồi nghỉ)
{ kind: 'clutter', id }        // bụi / đá chưa dọn: Dọn bụi, Đập đá
{ kind: 'strip', dir }         // mép vườn: mua dải đất 'N'|'S'|'E'|'W'
// Mua đất theo dải, vườn luôn là hình chữ nhật. Hành động `buy` ghi cỡ dải và giá ("dải 4×24 ô, 500 xu, cấp 5");
// chưa đủ cấp thì vô hiệu với lý do "Mua đất ở mép vườn từ cấp N", và ui.js nối lý do đó vào tên đích để người chơi đứng ở mép vườn là đọc thấy.
// Hướng dẫn trong Cài đặt có mục "Mua đất".
{ kind: 'door', to }           // cửa/cổng sang 'house'|'village'|'farm'
{ kind: 'building', id }       // theo bản đồ đang đứng. Vườn (cả vườn người khác đang thăm): house, gate, giftbox, guestbook, shed, shipbin, board, well, doghouse (chạm vào: `chain` xích/thả chó, `feed`, `pet` như chạm vào chó; khách chỉ thấy lý do `guest`).
                               //   Nhà: bed, wardrobe, phone (gọi bác sĩ thú y), (stove, table, plant chỉ để ngắm). Làng: market (Bà Tư), smithy (Ông Sáu),
                               //   vet (trạm thú y Cô Út), houseC (nhà Chú Ba, lái buôn mua vật nuôi đứng trước nhà), friendGate, homeGate, bench0.., (nhà dân, đèn đường để ngắm)
```
Hành động theo target (id của `actionsFor`): ô ruộng `till plant water weed spray catch fertilize growth harvest clear`; ô khóa `expand`; vật nuôi `collect/milk/shear feed pet bath medicine vaccinate isolate/unisolate vitamin rename sell retire/unretire` (`sell`, `retire` hỏi xác nhận ở `main.js` trước khi gọi `perform`); trứng `collect candle`; phân `scoop` (và `slip` do WORLD gọi); máng `fill muck vaccinatePen` (và `upgrade` nâng cấp chuồng); cân `weigh`; cửa chuồng `scatter` (rải thóc gọi về); ổ ấp `incubate`; chó `feed pet chain train cmd_<lệnh> cmd_stop`; bát ăn `fill`; mèo `praise feed pet medicine vaccinate herd rename`; quạ/trộm `shoo catch`; chuột/diều hâu/chồn `shoo`; bẫy chuột (`deco`) `arm`; `clutter` `clear`; `strip` `buy`; `door` `go`; công trình `open enter talk sleep sit refill`.

### Danh sách event trả về từ `tick()` (`EVENT_LEVEL`)

| `type` | Trường | Mức |
|---|---|---|
| `sick` | `animal`, `id` | important (`ill`) — con vật vừa chuyển sang Mệt |
| `sickSevere` | `animal`, `id` | urgent — vừa sang Bệnh nặng (main.js xin quyền + gửi thông báo trình duyệt) |
| `sickCritical` | `animal`, `id` | urgent — vừa sang Nguy kịch |
| `died` | `animal`, `id`, `kind`, `sex`, `x`, `y` | important (`old`) — mất vì bệnh; main đẩy thiên thần vào `world.angels` |
| `cured` | `animal`, `id` | info |
| `vaccinated` | `animal`, `id` | info — vừa tiêm vắc-xin |
| `bathed` | `animal`, `id` | info — vừa tắm xong |
| `mucked` | `pen`, `qty` | info — vừa xúc phân chuồng |
| `wallow` | `id` | none — heo, bò lăn bùn (dơ ngay, không mất vui) |
| `born` | `kind`, `animal`, `id`, `x`, `y` | important (`birth`), gộp theo loài — con mới sinh hoặc nở |
| `cockcrow` | `id` (gà trống) | none — 6h sáng gà trống gáy (render vẽ bong bóng) |
| `grave` | `id` (thực thể mộ) | none |
| `eating` | `kind` ('crow'/'thief'/'tisun'/'civet') | urgent |
| `predator` | `kind` ('rat'/'hawk'/'weasel'), `id`, `animal?` | urgent — kẻ săn mồi sắp ra tay, còn ~10 giây để đuổi |
| `hurt` | `animal`, `id` | urgent — con non vừa bị chuột cắn |
| `taken` | `animal`, `id`, `pred`, `kind`, `sex`, `x`, `y` | important (`loss`) — diều hâu/chồn bắt mất con vật |
| `ratFeed` | `pen` | important (`pest`) — chuột ăn mất một phần cám |
| `ratEgg` | — | important (`pest`) — chuột trộm mất một quả trứng |
| `trapped` | `id` (thực thể bẫy) | info — bẫy chuột sập |
| `catRat` | `id`, `cat` | info — mèo bắt được một con chuột (cả lúc chạy bù) |
| `catTrophy` | `id` | info — mèo ngậm chuột tới khoe người chơi |
| `catSpat` | `id` | info — mèo với chó cãi nhau (vui thôi) |
| `catHerd` | `id`, `animal` | info — mèo lùa một con về chuồng |
| `dogBowl` | — | info — chó tự ra bát ăn 1 phần (tóm tắt vắng nhà đếm số bữa) |
| `shooed` | `pred`, `id` | info — đã đuổi được kẻ săn mồi |
| `ripe` | `crop` | important (`ripe`) |
| `rotten`, `dead` | `crop` | important (`spoil`) |
| `hungry` | `animal` | important (`hungry`) |
| `crow`, `thief` | `name` (cây bị mất) | important (`loss`) |
| `tisun` | `n` (số trứng bị lấy) | important (`loss`) |
| `civet` | `animal` (tên loài bị tha đi) | important (`loss`) |
| `levelup` | `level` | important (`levelup`) |
| `order` | — | important (`order`) |
| `helped` | `by` (tên khách), `act` ('water'/'weed'/'catch'/'shoo'), `at` | important (`help`) |
| `stolen` | `by` (tên kẻ trộm), `item`, `qty`, `at` (giờ ngoài đời) | urgent |
| `gift` | `name`, `item`, `qty` (tin từ server, không do `tick()` phát) | important (`gate`) |
| `note` | `name` (tin từ server) | important (`gate`) |
| `barked` | `by`, `dog`, `where`, `x`, `y`, `at` (chó sủa báo khách lạ, issue 31) | urgent |
| `bitten` | `by`, `dog`, `fine`, `at` | important (`guard`) |
| `sausaged` | `by`, `dog`, `ate`, `at` | important (`guard`) |
| `stray` | `animal` (tên loài), `id` | important (`stray`), gộp theo loài: "N con gà lạc, chưa về chuồng 💤" |
| `oldSoon` | `animal` (tên loài), `id` | important (`old`), gộp theo loài |
| `passed` | `animal`, `id`, `kind` (loại), `sex`, `x`, `y` | important (`old`), gộp theo loài; main đẩy thiên thần bay lên vào `world.angels` |
| `egg` | — | info |
| `guard` | `who` (loại kẻ bị đuổi: 'crow'/'thief'/'tisun'/'civet') | info |
| `trick` | `trick`, `name` | info — chó vừa học xong một lệnh (kèm `toast`) |
| `dogHerd` | `n` | info — tối đến chó tự lùa đàn về |
| `shipped` | `coins`, `items`, `t` | info |
| `delivered` | `orders` (số đơn), `items` ({ món: số }) | important (cat `parcel`): "Hàng đã giao tới kho 📦" |
| `log` | `text` (đã ghi vào `state.log`) | info |
| `toast` | `text` | direct |
| `achievement` | `id`, `name`, `coins` | direct |
| `fx` | `text`, `color`, `x`, `y` (chữ bay, điểm ảnh) | none |
| `sound` | `name` | none |
| `spawn` | `what` ('chick'/'piglet'/'egg'/'poop'/'crow'/'thief'/'tisun'/'civet'/'angel'/'rat'/'hawk'/'weasel'), `x`, `y` | none |

**Khóa gộp của sự kiện vật nuôi** (`EVENT_LEVEL[type].group(e)`, cùng khóa trong `NOTIFY_WINDOW` thì gộp thành một toast "N con ..."): theo loài `sick:<loài>`, `sick2:<loài>` (sickSevere), `sick3:<loài>` (sickCritical), `died:<loài>`, `passed:<loài>`, `oldSoon:<loài>`, `stray:<loài>`, `cured:<loài>`, `born:<loại>`; theo con `pred:<id>` (predator), `hurt:<id>`, `catTrophy:<id>`, `bathed:<id>`, `vaccinated:<id>`, `grave:<id>`, `wallow:<id>`; theo chuồng `mucked:<pen>`; theo kẻ săn mồi `taken:<pred>`, `shooed:<pred>`; một khóa chung `ratFeed`, `ratEgg`, `trapped`, `catRat`, `catSpat`, `catHerd`, `dogHerd`, `dogBowl`, `cockcrow`; trộm NPC `loss:tisun`, `loss:civet`; chó `trick:<lệnh>`, `guard:<kẻ bị đuổi>`. Loại tắt/bật được trong cài đặt là `cat` của từng dòng (`NOTIFY_CATS`: thêm `old`, `stray`, `ill`, `pest`, `birth` ở Phase 2).

Tên âm thanh (`sound.js`, `play(name)`, `setMuted(bool)`): `click coin harvest water dig plant spray pop bark oink cluck chirp moo baa slip levelup error eat alarm crow` (`chirp`: gà con kêu, world phát kèm chữ "chiếp").

## Luật chơi chính (số liệu lấy trong data.js)

Hành vi của các luật cũ được giữ nguyên; chỉ đổi cách tra vị trí (theo thực thể đã đặt thay vì lưới cố định).

**Ruộng**
- Ruộng là các **khối 3x3** đặt tự do; vườn mới có 1 khối (9 ô), thêm khối ở chế độ xây dựng theo `FIELD_LIMITS` (cấp → số khối tối đa) và `FIELD_PRICES`.
- Chu trình: ô mới là `untilled` → **Cuốc đất** → `tilled` → **Gieo hạt** (tốn 1 `seed_<id>`, theo `selectedSeed`).
- Cây lớn qua 5 giai đoạn (`CROP_STAGES`). Chỉ lớn khi `water > 0`. Có cỏ thì lớn chậm lại (×`weedSlow`), có sâu hoặc bệnh thì dừng lớn.
- **Tưới** tốn 1 `can`, đặt `water` về 100; hết nước thì ra giếng múc (`refill`). **Nhổ cỏ** tay. **Sâu:** phun thuốc (chắc chắn, tốn 1 `pesticide`) hoặc bắt tay (50%). Sâu để lâu → **bệnh** → **chết**; thuốc trừ sâu chữa bệnh. **Bón phân** (+50% sản lượng) và **thuốc tăng trưởng** là hành động phụ.
- **Thu hoạch** khi chín: yield (+50% nếu bón phân), cộng EXP, vào **giỏ**. Chín quá thì **héo**: cửa sổ chín→héo `ripeWindow(id)` = `max((OVERRIPE−1) × grow, RIPE_FLOOR)` (nửa thời gian lớn, sàn **10 phút game**, nên với bảng cây hiện tại mọi cây đều có đúng 10 phút; trước đây cải chỉ có 45 giây). **Chạy bù offline (ADR 0004) không cho cây đã chín già đi tới héo** (`stepPlot` đứng yên khi `catchUp`; server và trình duyệt khớp nhau, test `tests/server-catchup.test.mjs`). Cảnh báo **sắp héo**: `ripeLeft(crop)` (1 → 0, `null` nếu chưa chín/đã héo) và `wilting(crop)` (true khi đã qua `WILT_WARN` = 80% cửa sổ); nhãn hành động Thu hoạch thêm "– sắp héo!", tên đích ô thêm "– sắp héo!", cây ngả nâu nhấp nháy. Dưới mỗi ô cây vẽ một thanh nhỏ (render.js `cropBar`, 2 hàng điểm ảnh thế giới): xanh = tiến độ lớn, cam = đếm ngược chín→héo, đỏ nhấp nháy = sắp héo. Cây chết/héo: **Dọn cây**. Thu hoạch xong ô về `untilled`.
- Dời khối ruộng (kể cả đang có cây) giữ nguyên trạng thái ô. Cất khối chỉ khi chưa có cây.
- Cuốc/tưới/thu hoạch/nhổ cỏ bằng công cụ cấp cao làm nhiều ô một lần (`tiles`); ô không hợp lệ trong vùng thì bỏ qua. Bình tưới còn bao nhiêu nước thì tưới được bấy nhiêu ô. Công cụ đang nâng cấp thì hành động bị khóa với lý do.

**Vật nuôi, chó, quạ/trộm**: đói dần; máng còn cám thì tự ăn; tuổi và giai đoạn theo giờ vườn (mục Vòng đời con vật); bệnh hoặc đói (`hunger <= growNeedsHunger`) thì không lên cân/đẻ; gà đẻ trứng xuống đất; ổ ấp; bò/cừu `ready` → vắt sữa/xén lông; heo mang bầu đẻ 1–3 con (không vượt `penCap`, sức chứa theo loại và cấp chuồng `PEN_TABLE`). Chó ỉa bậy, giẫm phải thì trượt chân, càng nhiều phân vật nuôi càng mất vui, chó trưởng thành no và vui thì canh nhà (đuổi quạ và trộm NPC theo `DOG.guardChance`; bán kính phát hiện dùng chung một bộ luật với khách lạ online, xem mục "Chó Mực canh khách lạ"). Quạ tới ô chín khi không có bù nhìn trong 5 ô; ban đêm luật chốt nhiều lắm một vụ trộm NPC (thằng Tèo ≥3 ô chín · Tí Sún ≥3 trứng dưới đất · chồn hương có con ngủ ngoài chuồng — xem mục "Trộm NPC"). Cổng (`gateIn`) là chỗ trộm đi vào. **Đóng băng/chạy bù không sinh quạ**, trộm NPC chỉ lấy trứng hoặc rau và không làm con vật chết hay bị bắt đi, trừ chết vì già (ADR 0004). Chuồng chỉ dời được, luật không đổi.

**Kinh tế**
- **Chợ Bà Tư** (làng, 6h–18h): hạt, vật tư, thức ăn, con non, đồ trang trí, mũ/phụ kiện (đồ chưa đủ cấp hiện khóa); bán nông sản đủ giá. Phase 2 thêm: con non chọn **đực/cái** (`animalPrice`, cái đắt hơn), vịt và mèo (mèo cần nhà mèo), xà phòng `soap` (tắm), bánh thưởng `treat` (dạy chó), cá khô `catfood`, xúc xích `sausage` (ném chó nhà người khác), bẫy chuột `deco_rattrap`, mái che sân `deco_canopy`, hàng rào thấp `deco_lowfence`. Thuốc thú y, vắc-xin **không** bán ở đây (chỉ ở trạm thú y Cô Út).
- **Chú Ba** (làng, đứng trước nhà `houseC`): lái buôn mua vật nuôi. Người chơi bán ngay tại vườn (hành động `sell` trên con vật, `sellQuote`/`sellAnimal`), Chú Ba tới dắt đi (hoạt cảnh `world.deals`); heo bán theo cân (cái cân cạnh chuồng heo, giá mỗi ký đổi theo ngày `pigKgPrice`).
- **Thùng giao hàng** (vườn): trả 80% giá chợ lúc 6h sáng. **Nhà kho** (vườn): cất giỏ vào kho, lấy ra.
- **Tiệm rèn Ông Sáu** (làng): nâng cấp công cụ, giá `TOOLS[k].price`, mất 1 ngày game.
- **Trạm thú y Cô Út** (làng, cùng giờ chợ): bán thuốc thú y và vắc-xin, kèm bảng điểm danh con đang bệnh. Gọi bác sĩ thú y qua điện thoại trong nhà (`SICK.vetPrice` xu).
- **Bảng đơn hàng** (vườn): tối đa 3 đơn, thưởng ×`rewardMul`. **Nhà**: giường (ngủ), tủ đồ (đổi ngoại hình), điện thoại (gọi bác sĩ thú y). Làng có ghế đá (hồi thể lực) và cổng bạn bè (biển "Đăng nhập để thăm bạn bè" khi chưa đăng nhập).
- Lên cấp thưởng `level × 20` xu. Thành tựu thưởng xu. Mua **dải đất** (`LAND_STRIPS`: giá và cấp tăng dần, mọi hướng cộng chung).
- Phase 0 giá chợ chưa biến động. Kinh tế chống lạm phát (ADR 0009) làm ở Phase 4.

## Thế giới, vẽ, giao diện (tóm tắt, chi tiết đọc code)

- **`main.js`**: khởi động (`loadGame()` có save thì vào chơi; không thì `ui.showCreator()` rồi `createGame`); vòng lặp `requestAnimationFrame`: `tick` → di chuyển/AI → tìm target → vẽ → `ui.handleEvents`; lưu 5 giây một lần, khi tab ẩn (`visibilitychange`) và `pagehide` (vườn online: `save()` ghi bản nháp, `sync.js` gửi lên server, xem mục Server). Đang trong chế độ xây dựng thì chỉ lưu bố cục lúc trước khi vào (Xong mới lưu bố cục mới). `api` đưa cho `ui.initUI`: `getState, doAction, changed, newGame, resetGame, buildStart/Done/Cancel/Pick/Store, todoGo, getBattery/setBattery`.
- **`world.js`**: tìm đường BFS trên lưới của `sceneMap`, target gần nhất (`findTarget`), `hitTest`/`pickEntity`, `goToTarget`, kéo thả chế độ xây dựng (bóng xanh/đỏ, gọi `canPlace`). AI con vật cập nhật 2 lần/giây khi ngoài màn hình (`perf.aiStep`).
- **`render.js`**: vẽ theo khung nhìn; nền tĩnh chia mảng 16x16 ô, chỉ vẽ lại mảng nào bẩn; cây/công trình/con vật sắp theo `y`; mưa, đêm, chữ bay.
- **`ui.js`**: HUD (xu, cấp, thể lực, ngày giờ, mùa, thời tiết, bình tưới, tốc độ), nút hành động chính + chip phụ (`Space`/`E`, `1`–`6`), bảng (`openPanel(id)`: `market shed shipbin smithy vet phone pedigree dog bag guide seeds board house achievements log todo map settings`), chế độ xây dựng (`showBuild`, `buildTray`), màn "Trong lúc bạn vắng nhà" (`showAway`), "Bản mới có gì đổi" (`showWhatsNew`), băng rôn gấp và mũi tên (`updateAlerts`), thông báo gộp (`createNotifier`), cài đặt (tắt thông báo, tiết kiệm pin). Mọi bảng không tràn ngang ở 360px và tránh tai thỏ (`env(safe-area-inset-*)`). Bố cục góc phải (`placeMini`, chạy theo nhịp HUD): màn hẹp thì bản đồ nhỏ nằm ngay dưới HUD và nút tốc độ sang mép trái cùng hàng (để cạnh bản đồ nhỏ thì che biển chợ Bà Tư); cột nút hành động cao tới bản đồ nhỏ thì bản đồ nhỏ thu còn nút 📋 (`compact`); danh sách chip có `max-height` theo chỗ còn lại và cuộn dọc (con vật có tới 6 chip trên máy 320x640).
- **Camera**: theo người chơi, không ra ngoài bản đồ hiện tại; cạnh ngắn màn hình thấy khoảng 12 ô.
- Đồ họa: cần sprite mới thì thêm vào `art2.js` (`SPR2`), `art3.js` (`SPR3`, vật nuôi) hoặc `art.js`, giữ mọi export cũ. Bệnh (lát 38): `SPR3.sickBy[loài][giai đoạn]` (dáng nằm bệnh riêng cho từng loài ở từng giai đoạn), `SPR3.grave`/`graveFlower`, `SPR3.vetClinic`, `SPR3.npcCoUt`, `SPR2.phone`; bong bóng vàng (Mệt) / đỏ nhấp nháy (Bệnh nặng, Nguy kịch) và đồng hồ đếm ngược do `render.js` vẽ. Dạy lệnh chó (lát 45): `SPR3.dogSitBy/dogBegBy/dogHerdBy/dogBarkBy[giai đoạn]`, `trainBar`, `praise`, `trickIcon`, `cmdBubble`, `guardPost`, `sniffMark`, `items.treat`. `art.icon(key)` tra `SPR.items` → `SPR.ripe` → `SPR.product` → `SPR.baby`/`SPR.animal` → `SPR[key]`.

## Test và dựng tình huống (ADR 0008)

Không có GitHub Actions. Mọi test chạy trên máy local, Chromium ẩn cửa sổ, 1 luồng.

**Seam 1: API công khai của `state.js`**, chạy bằng Node, nơi test chính:
```
npm test            # = node --test (tests/*.test.mjs, gồm cả seam 3 tests/server-*.test.mjs)
```
Mẫu: dựng `localStorage` giả (`globalThis.localStorage = {getItem, setItem, removeItem}`), `G.createGame(...)`, rồi `G.tick/perform/canPlace/...`. Muốn kết quả ngẫu nhiên cố định thì thay `Math.random` tạm (`0.99` = không xảy ra sự kiện nhỏ, `0.0001` = trúng hết). Test mô tả tình huống người chơi gặp ("dời khối ruộng đang có cây thì cây giữ nguyên tiến độ"), không test hàm nội bộ. Các file: `state` (luật gốc), `save-v2` (chuyển bản lưu v1, fixture), `save-v3` (chuyển v2→v3, fixture), `life` (vòng đời 4 giai đoạn), `place` (đặt/dời/cất, mọi `reason`), `build`, `land` (mở đất, dọn), `scene` (chuyển bản đồ), `village` (chợ), `shipbin`, `stamina`, `tools`, `basket`, `time` (chạy bù, đóng băng, mùa), `sick` (bệnh 4 giai đoạn, lây, thú y, ngôi mộ, ranh giới ADR 0004), `dogtrick` (vòng đời chó, dạy lệnh, 6 lệnh), `notify`, `todo`, `perf`, `tutorial`, `online-save` (trường online, `checkSaveJump`), `presence` (người khác cùng bản đồ: tên mờ khi đông, nội suy), `visit` (luật khách), `help` (thao tác giúp của khách, giới hạn mỗi ngày, mã thao tác), `steal` (luật trộm: 25% mỗi ô, một lần mỗi người, trần 30% mỗi ngày, bảo vệ người mới, giỏ đầy, thể lực, trộm NPC nhường). Phase 2: `pens` (chuồng 3 cấp, cách ly), `breed` (đực cái, sinh sản, phả hệ), `dirty` (dơ, tắm), `bond` (độ thân), `trade` (bán cho Chú Ba, nghỉ hưu), `free` (thả rông), `herd` (chạng vạng, con lạc, rải thóc), `predator` (kẻ săn mồi), `cat` (mèo), `coat` (màu lông chó/mèo), `bowl` (bát ăn của chó), `dog-guard` (một bộ luật chó cho trộm NPC và khách), `thief` (trộm NPC mới, phạt), `duck` (vịt), `coutquest` (nhiệm vụ Cô Út), `todo`/`notify` (mục vật nuôi). Hotfix: `online-shop` (mua online, người giao hàng, chạy bù, của cải), seam 3 `server-order` (chống gian lận nhận đơn lớn, server chạy bù giao hàng).
Luật có ngẫu nhiên (kẻ săn mồi, bệnh, con lạc...) thì test phải **tất định**: hoặc dọn sạch nguồn ngẫu nhiên không liên quan (vd `s.preds = []` mỗi bước), hoặc thay `Math.random` bằng bộ sinh số có hạt giống cố định (mulberry32, mẫu ở `tests/cat.test.mjs` `seeded`, `tests/duck.test.mjs` đặt lại hạt giống đầu mỗi test). Không thống kê "thường thì đúng" bằng `Math.random` thật.

**Seam 2: trình duyệt thật qua Playwright**, chỉ cho những gì seam 1 không thấy (kéo thả, đi qua cửa, chạm để tự đi tới, giao diện 360px):
```
npm run test:e2e        # = playwright test: tự bật server Node server/main.mjs (PORT 4173, SQLite ở <tmp>/ai-game-e2e.db = `E2E_DB` export từ playwright.config.mjs), chạy 2 project: desktop 1280x800 và mobile 360x740 (cảm ứng)
npx playwright test e2e/place.spec.mjs --project=desktop   # chạy một file / một project
npm run test:smoke      # = playwright test -c playwright.smoke.config.mjs (e2e/smoke*.spec.mjs), chỉ desktop, không bật server local
SMOKE_URL=http://127.0.0.1:4173 npm run test:smoke   # đổi địa chỉ (mặc định https://game.huninna.com)
```
**Smoke online** (`e2e/smoke-online.spec.mjs`, chạy chung trong `npm run test:smoke`): hai trình duyệt A, B trên bản đã deploy. Đăng ký bằng mã mời, mang vườn chơi đơn lên làng, thấy nhau trong làng, chat nhanh + biểu cảm, kết bạn, B thăm vườn A và tưới giúp (A đang online thấy ngay), B mua gà con ở chợ, A và B đăng xuất rồi đăng nhập lại thấy vườn còn nguyên, `/api/health` ok. Mã mời lấy từ biến `SMOKE_INVITES="mã1,mã2"` (thiếu thì bỏ qua có lý do). Tài khoản test tên `zzsmoke` + 5 ký tự ngẫu nhiên; cuối lần chạy in dòng `SMOKE_ACCOUNTS: <tên A> <tên B>` (in cả khi hỏng giữa chừng) để quản trị xóa bằng `delete-account` (không có API công khai để xóa). Cách chạy sau deploy:
```
# trên VPS
cd ~/project/ai_game && docker compose exec web node server/admin.mjs invite 2
# trên máy local (Windows PowerShell), thư mục repo
$env:SMOKE_INVITES='XXXX-XXXX,YYYY-YYYY'; npm run test:smoke; Remove-Item Env:SMOKE_INVITES
# trên VPS, với hai tên in ra ở dòng SMOKE_ACCOUNTS
cd ~/project/ai_game && docker compose exec web node server/admin.mjs delete-account zzsmokeXXXXX
cd ~/project/ai_game && docker compose exec web node server/admin.mjs delete-account zzsmokeYYYYY
```
Thử với server local: bật `node server/main.mjs` (PORT, DB_FILE tự chọn), tạo mã bằng `node server/admin.mjs invite 2 --db <file>`, đặt `$env:SMOKE_URL='http://127.0.0.1:<cổng>'`. Smoke chỉ lệch giờ làng (`villageAt`) của trình duyệt B ở bước mua (chợ mở ban ngày), sau khi đã giúp vườn A: lệch sớm hơn thì vườn mở trên máy đó bị chạy bù quãng lệch.

**Test ổn định online** (`tests/server-stable.test.mjs`, seam 3): khách rớt WebSocket rồi gửi lại cùng mã thao tác (tính một lần); chủ rớt WebSocket đúng lúc khách giúp, rồi gửi bản lưu của máy mình (việc khách không mất); tin `guestop` tới chủ bị lạc; gửi lại cùng bản lưu; server khởi động lại trên cùng file SQLite (`srv.restart()`: tài khoản, cookie, phiên chơi, vườn, bạn bè, hàng đợi khách còn nguyên); 8 khách cùng vào làng và cùng giúp một vườn (đúng 10 việc, không mất/lặp); hai máy mới cùng giành vườn trong khi máy cũ đang chơi; bản lưu lớn (~27 KB, 27 vật nuôi; quá 1 MB thì 413); vườn lớn vắng 3 ngày chạy bù khi khách ghé (~1,5 giây trên máy dev, tối đa 8 giờ). `e2e/online-stable.spec.mjs`: đứng yên trước cổng bạn bè rồi mang vườn chơi đơn lên làng thì nút hành động vẫn hiện.
(Lần đầu: `npm install` và `npx playwright install chromium`.)

**Dựng tình huống bằng bản lưu ghi sẵn**, không hook trong game (`e2e/helpers.mjs`):
- `makeSave(mutate, opts)`: bản lưu hợp lệ từ chính `createGame` (đặt `tutorial = 99` cho khỏi vướng hướng dẫn), `mutate(s)` chỉnh thêm; `plantedCrop(s, idx, progress)` gieo sẵn cải.
- `seedSave(context, save, { hint })`: ghi bản lưu vào `localStorage` trước khi trang tải (chỉ ghi khi chưa có save nên tải lại không ghi đè); mặc định cũng ghi sẵn `nongtrai-pref` `{ hinted: true }` để hộp gợi ý tiết kiệm pin không chen vào, truyền `{ hint: true }` khi chính là test gợi ý đó.
- Tua thời gian: `installWarp(context)` một lần, rồi `timeWarp(page, ms)` lùi `savedAt` và tải lại để cơ chế chạy bù offline tự đẩy thời gian (vắng quá 8 giờ thì thấy đóng băng). `closeAway(page)` đóng màn "Trong lúc bạn vắng nhà".
- Thao tác: `createCharacter`, `tapPlot` (chạm/click ô ruộng, tự cuộn tới), `tilePoint` (ô → tọa độ màn hình), `startDrag` (kéo bằng chuột hoặc cảm ứng CDP), `bigFarmSave()` (vườn 64x48 đầy công trình, dựng bằng `buyStrip/placeEntity/buyAnimal`).
- Trang lộ `globalThis.__farm` (`state`, `world`, `scale`, `view`, `dpr`, `perf`) chỉ để **đọc** trạng thái; không dùng nó để đổi luật hay phát đồ.
- **Mẹo đã biết:** Chromium headless khựng khoảng 1 giây ở lần nhấn phím đầu tiên, nên các spec bấm `page.keyboard.press('Shift')` trước khi test di chuyển.
- Nhớ hai cỡ màn hình: mỗi spec chạy ở cả desktop và mobile; viết spec dùng chuột lẫn chạm khi cần. `e2e/mobile360.spec.mjs` rà thêm 320x640 và 412x915 (chỉ chạy ở project mobile): mỗi màn/bảng kiểm không cuộn ngang, nút trong màn và ≥ 40px, các lớp nổi (HUD, bản đồ nhỏ, joystick, nút hành động, băng rôn) không đè nhau, và giả lập tai thỏ bằng cách đè `--sl/--sr/--st/--sb` (biến CSS lấy từ `env(safe-area-inset-*)`). Màn mới thì thêm vào đây.
- Cổng e2e: `$env:E2E_PORT=<cổng>` trước `npx playwright test` (DB e2e tự theo cổng), nhiều worktree chạy song song không đụng nhau.

**Dựng tình huống vật nuôi (Phase 2)** bằng bản lưu ghi sẵn (mẫu ở `e2e/predator.spec.mjs`, `petguide.spec.mjs`, `mobile360.spec.mjs`):
- Con vật: chép con mẫu từ `createGame().animals` rồi đổi `type/stage/age` (`stageStart(loài, giai đoạn)`), `sex`, `name`, `sick/sickMs`, `dirty`, `bond`, `mom/dad`; nhớ `pen` = id thực thể chuồng đúng loài. Đặt `nextProduct: 1e15` cho khỏi đẻ giữa chừng.
- Thả rông / con lạc: `tile: { c, r }` lấy từ `roamOf(s).tiles`, `x/y` = giữa ô, `tileAt: s.time + 1e9` (đứng yên), `stray: true` + giờ đêm (`s.time = DAY_MS * 0.78`) và `s.duskDay = s.day` (khỏi chạy luật chạng vạng lần nữa). Con lạc ngủ yên một chỗ nên thanh hành động không đổi khi người chơi đứng sát.
- Kẻ săn mồi: đẩy thẳng vào `s.preds` (`{ kind, state: 'hunt', strikeAt, target, x, y }`); cần cấp ≥ `PREDATOR.minLevel` để luật còn chạy; dưới cấp 5 (vd `exp` của cấp 4) thì không có kẻ săn mồi, trộm NPC ngẫu nhiên chen vào.
- Mèo: đặt nhà mèo bằng `canPlace`/`placeEntity({ kind: 'cathouse' })` rồi `buyCat(s, sex)` (giờ chợ mở) — hoặc thêm vào `s.cats`. Chó: `Object.assign(s.dog, { stage, age: stageStart('cho', stage), tricks: { sit: 2, ... } })`.
- Chuồng: `placeEntity(s, { kind: 'pen', pen })`, `buyAnimal(s, type, sex)`; nâng cấp bằng `upgradePen`. Bản lưu v2 thật: `tests/fixtures/v2-farm.json` ghi vào khóa `nongtrai-save-v2` (mẫu `e2e/life.spec.mjs`).
- Đặt `save.savedAt = Date.now()` ngay trước `seedSave` nếu không muốn chạy bù lúc mở trang (bản dựng từ lúc khai báo test có thể đã cũ vài giây).

**Seam 3: giao thức server (ADR 0011)**, `tests/server-*.test.mjs`, chạy chung trong `npm test`. Bật server thật trong tiến trình test với SQLite tạm, gọi bằng HTTP/WebSocket thật; không gọi hàm nội bộ server, không mock DB. Helper `tests/helpers/server.mjs`:
- `bootServer(opts?)` → `{ url, dbPath, dir, get(path, init), json(path, body?, init), ws(path = '/ws'), admin(...args), restart(), close() }`. Cổng ngẫu nhiên, mỗi lần một thư mục tạm; `restart()` tắt server rồi bật lại trên cùng file SQLite, cùng cổng (như container khởi động lại); `close()` tắt server rồi xóa thư mục (dùng `t.after(srv.close)`).
  - `json(path)` = GET, `json(path, body)` = POST JSON; trả `{ status, body }`.
  - `ws(path, { cookie }?)` (cookie = mã phiên, gửi như trình duyệt lúc nâng cấp) chờ mở xong, trả `{ raw, send(obj), next(ms) /* tin JSON kế tiếp */, closed /* promise mã đóng */, close() }`.
  - `admin(...args)` chạy `node server/admin.mjs ...args --db <dbPath>` như quản trị, trả `{ code, out, err }`.
- `runAdmin(...args)`: chạy lệnh quản trị với tham số tự chọn.
- Server chạy cùng tiến trình test nên `setClock(fn)` và `Math.random` đặt trong test áp dụng cho cả server (mẫu `tests/server-catchup.test.mjs`: cố định giờ, hạt giống, rồi so kết quả chạy bù của server với `loadGame` ở "trình duyệt"). Dòng SQLite do server cũ để lại (vd bản lưu v2 trước Phase 2) dựng bằng cách ghi thẳng file `srv.dbPath` bằng `node:sqlite` (dữ liệu ghi sẵn, không gọi code server).
- Test seam 3 của Phase 2: `server-catchup` (chạy bù 8 giờ có vật bệnh, kẻ săn mồi, mèo; vườn v2 có trường online lên v3 qua cả khách ghé lẫn chủ đăng nhập lại), `server-dog` (chó canh khách: sủa, đớp, xúc xích; Canh khu của chủ đi tới bản đi dạo của khách và nhân đôi bán kính; chó con không canh nên server từ chối sủa, chó già thấy gần hơn).

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
| `server/farms.mjs` | Kho vườn online (issue 22, ADR 0012, 0016): `claimPlay(ctx, account)`, `readFarm(db, account)`, `storeFarm(ctx, account, { play, save })`, `visitFarm(ctx, name)`, `playOf(db, accountId)`, `farmRow(db, accountId)`, `catchUpFarm(db, row)`, `writeFarm(db, accountId, save, t?)`, `FINAL_MS`. Chống gian lận bằng `checkSaveJump` của `state.js`. `claimPlay` của cùng một tài khoản chạy lần lượt (máy sau chờ máy trước xong) |
| `server/guests.mjs` | Hàng đợi thao tác của khách (issue 28, 30, ADR 0012): `createGuests(ctx, send, pres)` → `{ handlers: { guest } }`, `submitGuestOp(ctx, guest, ownerId, op)`, `runGuestQueue(db, row)`, `missedOps(db, ownerId, save, since)` (áp dụng vào bản lưu chủ vừa gửi lên các việc khách nó còn thiếu, trả các việc đó), `stealsOf(db, guestId, t?)` (số vụ trộm đã nhận của một người hôm nay). Luật lấy từ `guestOpApply` của `state.js`, server không có bản luật riêng |
| `server/static.mjs` | `serveStatic(dir)`: GET/HEAD, MIME theo đuôi, `.html` `no-store`, file khác `no-cache` + ETag (304). `..`, `\`, byte 0, thoát khỏi `dir` → 403 |
| `server/presence.mjs` | Làng real-time (issue 25): `createPresence(ctx, send)` → `{ handlers: { join, pos, chat, emote }, leave(sock), gardenOf(sock), stop() }` (`gardenOf` = id chủ vườn mà kết nối đang đứng trong, cho issue 28). Mỗi kết nối thuộc một bản đồ (`sock.pres`); `live.mjs` tra `handlers` sau `HANDLERS` và gọi `leave` khi kết nối đóng |
| `server/gate.mjs` | Quà và sổ lưu bút ở cổng (issue 29): `sendGift`, `readGifts`, `takeGifts`, `signBook`, `readBook`, `gateNews`. Gọi lại luật thuần của `public/state.js` |
| `server/live.mjs` | `attachLive(server, ctx)` → `{ sendTo(accountId, msg), kick(accountId, play), close() }`. WebSocket ở `/ws` (đường khác bị ngắt), tin tối đa 256 KB (tin `world` của chủ cỡ bản lưu). Tài khoản của kết nối lấy từ cookie lúc nâng cấp (`sock.account`), `hello` gắn phiên chơi (`sock.play`). Tin JSON `{ t, ... }` tra trong `HANDLERS(sock, msg, ctx)` rồi tới `presence`, `guests`; tin hỏng/loại lạ bỏ qua, không ngắt. `send(sock, obj)`. Issue sau đẩy tin tới chủ vườn bằng `ctx.live.sendTo` |
| `server/db.mjs` | `openDb(file)`: WAL, `foreign_keys`, chạy `MIGRATIONS` theo `PRAGMA user_version` (mỗi phần tử một bản, trong transaction; chỉ thêm vào cuối). `backupTo(db, out)` = `VACUUM INTO` |
| `server/admin.mjs` | Lệnh quản trị: `node server/admin.mjs <lệnh> [--db file]` (mặc định `DB_FILE` rồi `./farm.db`). In kết quả ra stdout, lỗi ra stderr + mã thoát 1. Thêm lệnh vào `COMMANDS` |

**Schema SQLite** (`user_version`):
- v1 `meta(key TEXT PRIMARY KEY, value TEXT)` có dòng `created`.
- v2 `accounts(id, name, name_key UNIQUE, pin_hash, pin_salt, created, fails, locked_until)`, `invites(code PK, created, used_by → accounts ON DELETE SET NULL, used_at)`, `sessions(token_hash PK, account_id → accounts ON DELETE CASCADE, created, expires)`. PIN băm `scrypt` (muối 16 byte riêng từng tài khoản); phiên chỉ lưu SHA-256 của mã; `name_key` = tên chữ thường (đã chuẩn hóa NFC).
- v3 `farms(account_id PK → accounts ON DELETE CASCADE, play, save, saved_at, updated, rev)`: một dòng mỗi tài khoản. `play` = phiên chơi đang giữ quyền ghi (mã ngẫu nhiên 16 byte), `save` = bản lưu JSON (v3; dòng lưu từ trước Phase 2 có thể còn v2, đọc ra vẫn qua `migrate`/`loadGame`) (`NULL` = chưa có vườn), `saved_at` = `savedAt` của bản lưu (giờ trình duyệt), `updated` = giờ server lúc nhận, `rev` = số bản đã nhận.
- v4 `accounts.friend_code` (UNIQUE) + `friends(account_id, friend_id, created)` (issue 26, xem mục Bạn bè).
- v5 `guest_ops(id TEXT PK, owner_id → accounts ON DELETE CASCADE, guest_id → accounts ON DELETE CASCADE, op, created, applied)` (issue 28): hàng đợi thao tác của khách. `id` = mã thao tác do khách sinh (duy nhất nên gửi lại không nhân đôi), `op` = thao tác JSON (đã có `by`, `level`, `room`, `sausage` và `at` do server điền; `kind` 'help', 'steal', 'bark', 'bite' hay 'sausage'), `applied` = giờ server lúc **server** tự áp dụng vào bản lưu chủ (`NULL` = đang chờ trình duyệt chủ áp dụng). Dòng đã áp dụng quá 7 ngày thì xóa.
- v6 (issue 29) `gifts(id, owner_id → accounts ON DELETE CASCADE, from_id, from_name, item, qty, op, created, UNIQUE(from_id, op))` = hàng đợi quà ở cổng (`qty` = số còn chờ; nhận hết thì 0 nhưng giữ dòng để mã thao tác `op` vẫn chặn gửi lặp) và `guestbook(id, owner_id, author_id, author_name, text, day, created, seen, UNIQUE(owner_id, author_id, day))` = sổ lưu bút (`day` = ngày ngoài đời giờ Việt Nam, `seen` = chủ đã đọc chưa).
- v7 `farms.claimed` = giờ server lúc cấp phiên chơi đang giữ quyền ghi (dòng có từ trước lấy giờ chạy migration). Dùng để biết việc khách nào server tự áp dụng sau khi máy chủ vườn đã nhận vườn.

**HTTP:**
- `GET /api/health` → `200 { ok: true, now }` (`now` = giờ server ms). Dùng cho Docker HEALTHCHECK, Playwright `webServer`, smoke.
- Lỗi nghiệp vụ trả `{ ok: false, error: 'câu tiếng Việt', code, ... }`; giao diện (`public/net.js`) tự chọn câu theo `code`.
- `POST /api/register` `{ name, pin, invite }` → `200 { ok, name }` + cookie phiên. Tên 2–20 ký tự (chữ có dấu, số, dấu cách, `_ - .`; đầu tên là chữ/số), duy nhất không phân biệt hoa thường; PIN đúng 6 số; mã mời gõ thường/thiếu gạch vẫn được. Lỗi: `400 name_format` · `400 pin_format` · `400 invite_invalid` · `409 invite_used` · `409 name_taken`. Từ chối thì không đốt mã mời.
- `POST /api/login` `{ name, pin }` → `200 { ok, name }` + cookie phiên. Lỗi: `401 bad_credentials` (sai tên hoặc PIN, không phân biệt) · `429 locked` kèm `retryAfter` (giây). Sai PIN 5 lần liên tiếp thì khóa tên 5 phút (kể cả nhập đúng lúc đang khóa); nhập đúng thì đếm lại.
- `POST /api/logout` → hủy phiên của cookie, xóa cookie. `GET /api/me` → `200 { ok, name }` hoặc `401 no_session` (cookie sai/hết hạn).
- **Phiên:** cookie `nt_session` (mã ngẫu nhiên 32 byte, `HttpOnly; SameSite=Lax; Path=/; Max-Age=30 ngày`, thêm `Secure` khi `X-Forwarded-Proto: https` do Caddy gửi), hạn 30 ngày từ lúc đăng nhập. Chọn cookie thay vì header để JS trong trang không đọc được mã. Trình duyệt chỉ nhớ `localStorage['nongtrai-online']` = tên (để biết có nên gọi `/api/me` khi mở game, chơi một mình thì không gọi server).
- **Vườn online (issue 22, ADR 0012, 0016)**, đều cần cookie phiên (thiếu thì `401 no_session`):
  - `POST /api/play` → `200 { ok, play, farm, rev, savedAt?, gate: { gifts, notes } }` (`gate` như `GET /api/gate`, cho màn vắng nhà, issue 32): cấp **phiên chơi** mới cho máy này; `farm` = bản lưu trên server hoặc `null` (chưa có vườn). Nếu máy khác đang giữ phiên và mở WebSocket: server gửi nó `{ t: 'kicked' }`, chờ bản lưu cuối mang phiên cũ (nhận như thường), hoặc nó đóng kết nối, hoặc tối đa `FINAL_MS` = 3 giây, rồi mới đổi phiên và trả vườn. Từ đó phiên cũ bị từ chối. Nhiều máy cùng xin một lúc thì xếp hàng, nên bản cuối của máy cũ không bị máy thứ hai chen ngang làm mất.
  - `GET /api/farm` → `200 { ok, farm, rev, savedAt }` hoặc `404 no_farm` ("Chưa có vườn"). Lối đọc công khai vườn của chính mình (test dùng).
  - `POST /api/farm` `{ play, save }` → `200 { ok, rev, savedAt }`. Lỗi: `409 play_replaced` (phiên không phải phiên đang giữ quyền ghi: "Vườn đang được chơi ở thiết bị khác") · `400 save_invalid` (không qua `migrate`, thiếu `coins`/`exp`/`savedAt`/`plots`) · `422 implausible` kèm `reason` (`checkSaveJump` của `state.js` so với bản trước — `dtMs` = max(giờ server đã trôi, min(chênh `savedAt` hai bản, giờ server đã trôi + 8 giờ)) — hoặc `reason: 'steals'` khi `today.robs` khai nhiều vụ trộm hơn số server đã nhận hôm nay, issue 30). Bản đầu tiên của tài khoản (mang vườn chơi đơn lên / vườn mới) nhận nguyên. Server đóng dấu `mode: 'online'`, `account` = tên tài khoản. Bị từ chối thì bản cũ trên server giữ nguyên. Nhận thì server áp dụng thêm các việc khách mà bản lưu này còn thiếu (`missedOps`: việc còn chờ, hoặc việc server tự áp dụng sau `farms.claimed`, vd chủ rớt WebSocket đúng lúc khách giúp nên server tưởng chủ vắng; nhật ký khách đã đầy thì bỏ việc cũ hơn dòng cũ nhất) rồi đẩy `{ t: 'guestop', op }` cho trình duyệt chủ áp dụng (trùng mã thì bỏ qua).
  - `GET /api/visit?name=` (cần đăng nhập) → `200 { ok, name, farm, savedAt }` hoặc `404 no_farm`. Lối đọc công khai vườn người khác (chỉ đọc: chỉ có GET, phương thức khác `405`; issue 27 dùng để thăm vườn). Chủ đang offline (không có WebSocket giữ phiên chơi) thì server chạy bù trước bằng `loadGame` của `state.js` (tối đa 8 giờ, phần dư đóng băng, vật nuôi không chết), lưu lại với `savedAt` = giờ server; chạy đồng bộ nên đọc nhiều lần chỉ chạy một lần. Tóm tắt vắng nhà cất ở `farm.awayPending`, `loadGame` ở trình duyệt chủ biến nó thành `s.away` (gộp thêm phần vắng sau đó nếu có). `POST /api/play` cũng chạy bù trước khi trao vườn cho chủ.
- **Bạn bè và cổng vườn (issue 26, `server/friends.mjs`)**, cần cookie phiên. Bảng `friends` (migration v4, quan hệ **một chiều**: A thêm B thì A ghim B; B không tự thành bạn của A), cột `accounts.friend_code` (mã kết bạn 6 ký tự dạng `ABC-DEF`, bỏ O/0/I/1, cấp lười ở lần xem đầu). Ai vào vườn ai cũng được, kết bạn chỉ để ghim và nhận thông báo.
  - `GET /api/friends` → `200 { ok, code, friends: [{ name, level, online, ripe, help }] }` theo tên. `online` = có kết nối WebSocket giữ phiên chơi; `ripe` (🍅) = có ô đất mở với cây chín (chưa héo/chết); `help` (🐛) = có ô có cỏ hoặc cây có sâu. Chỉ có bấy nhiêu trường, không lộ bản lưu. Chưa có vườn thì cấp 1, hai cờ tắt.
  - `POST /api/friends` `{ name }` hoặc `{ code }` (không phân biệt hoa thường, dấu cách, dấu -) → `200 { ok, name }`. Lỗi: `404 no_such_name` · `404 bad_code` · `409 already_friend` · `400 self`.
  - `POST /api/friends/remove` `{ name }` → `200 { ok }` hoặc `404 not_friend`. Chỉ xóa dòng quan hệ, vườn và tài khoản của ai cũng còn nguyên.
  - `GET /api/gates` → `200 { ok, gates: [{ name, level, friend }] }`: vườn của mọi người chơi khác đã có bản lưu, bạn bè (`friend: true`) ở đầu rồi tới người còn lại, mỗi nhóm theo tên; không có chính mình.
  - Thông báo ghé vườn: `notifyVisit({ db, live }, visitor, ownerId)` trong `friends.mjs` gửi `{ t: 'visit', name }` tới chủ vườn qua WebSocket nếu `visitor` nằm trong danh sách bạn của chủ vườn. `presence.mjs` gọi khi khách join `farm` của chủ (issue 27). Trình duyệt hiện toast 🟡 "<tên> vừa ghé thăm vườn của bạn 👋" (event `visited`, tắt được bằng loại "Bạn bè ghé", issue 32).
  - Trình duyệt: `net.friends()`, `net.gates()`, `net.addFriend(who)` (nhập mã dạng ABC-DEF thì thử mã trước, không ra thì thử tên), `net.removeFriend(name)`. Nút 👫 trong cột `#live` (`#live-friends`) hoặc chạm "Cổng bạn bè" trong làng (khi online) mở bảng `friends`: ô nhập tên/mã (`#fr-input`), mã của mình (`#fr-code`), danh sách bạn (`.fr-row`: chấm online/offline, cấp, 🍅 🐛, nút ✖ có hỏi lại), danh sách cổng (`.gate-row`, bạn bè `.pinned` ở đầu). Pixel art đọc `SPR2.friendIcons[on|off|ripe|help]` (canvas), chưa có thì emoji/chấm chữ; cổng vườn vẽ trên bản đồ làng và biển hiệu chờ art của agent Opus.
- **Quà và sổ lưu bút ở cổng (issue 29, `server/gate.mjs`)**, cần cookie phiên. Bảng `gifts` và `guestbook` (migration v6). Luật (món nào tặng được, giới hạn, chia theo sức chứa giỏ) là hàm thuần của `public/state.js`, server chỉ gọi lại. Quà là hàng đợi nên **chủ offline vẫn nhận**; chủ đang online thì được báo thêm qua WebSocket.
  - `POST /api/gifts` `{ to, item, qty, op }` → `200 { ok }`, hoặc `200 { ok, dup: true }` nếu `op` này đã gửi rồi (mã thao tác tự chứa: gửi lại chỉ tính một lần). Lỗi: `400 bad_op` · `404 no_such_name` · `400 self` · `400 bad_item` / `bad_qty` / `too_many` / `box_full` (theo `giftBoxCheck`).
  - `GET /api/gifts` → `200 { ok, gifts: [{ id, from, item, qty }] }`: hộp quà của mình, theo thứ tự tới.
  - `POST /api/gifts/take` `{ room }` → `200 { ok, taken: [{ id, from, item, qty }], left }`: chia theo `splitGifts` với `room` = chỗ trống trong giỏ (nông sản tới khi đầy, hạt giống lấy hết), trừ `qty` trong bảng; `left` = số quà còn nằm lại. Dòng đã nhận hết giữ `qty = 0` để `op` vẫn chặn gửi lặp.
  - `POST /api/guestbook` `{ to, text }` → `200 { ok }`. Chữ được chuẩn hóa NFC và gộp khoảng trắng. Lỗi: `404 no_such_name` · `400 self` · `400 empty` · `400 too_long` (> `GIFT.noteMax`) · `409 already_signed` (mỗi người mỗi **ngày ngoài đời** (`serverDay`, giờ Việt Nam) một dòng mỗi sổ).
  - `GET /api/guestbook?name=` → `200 { ok, notes: [{ id, from, text, day }] }`, **mới nhất ở trên**. Không có `name` là sổ của mình, đọc xong thì các dòng hết "mới".
  - `GET /api/gate` → `200 { ok, gifts, notes }`: số quà đang chờ và số lời nhắn chưa đọc ở cổng vườn mình.
  - WebSocket tới chủ vườn: `{ t: 'gift', name, item, qty }` và `{ t: 'note', name }`. Trình duyệt biến thành event `gift` / `note` (`ui.netEvent`) nên toast 🟡 **tự gộp** ("3 món quà mới trong hộp quà ở cổng 🎁"), tắt được bằng loại `gate` trong Cài đặt.
  - Trình duyệt: `net.sendGift(to, item, qty, op)`, `net.myGifts()`, `net.takeGifts(room)`, `net.signBook(to, text)`, `net.readBook(name?)`, `net.gateNews()`; `ui.refreshGate()` đếm lại (lúc vào làng, khi có tin mới, sau khi nhận quà / đọc sổ). Bảng `giftbox`: khách thấy danh sách món tặng được (`.gift-row[data-item]`, nút `.gift-1` / `.gift-many`), chủ thấy quà đang chờ và nút **Nhận hết vào giỏ** (`#gift-take`). Bảng `guestbook`: khách có ô nhập `#note-input` + nút `#note-sign`, ai cũng đọc được các dòng (`.note-row[data-from]`). Pixel art `SPR2.giftBox` / `giftBoxFull` / `giftBoxOpen`, `SPR2.guestBook` / `guestBookOpen` (đổi theo `state.gate`), `SPR2.giftIcon` trên toast.
- Mọi đường khác ngoài `/api/` là file tĩnh của `public/` (`/` = `index.html`).

**WebSocket `/ws`:** cookie phiên gửi kèm lúc nâng cấp cho biết tài khoản.
- `{ t: 'ping', id? }` → `{ t: 'pong', id, now }`.
- `{ t: 'hello', play }` (mỗi lần kết nối/kết nối lại) → `{ t: 'hello', ok: true, now }`; phiên đã bị thay → `{ t: 'kicked' }`; chưa đăng nhập → `{ t: 'hello', ok: false, code: 'no_session' }`.
- Server → trình duyệt: `{ t: 'kicked' }` = máy khác đã vào, lưu lần cuối rồi thoát.
- **Làng real-time (issue 25, `server/presence.mjs`)**, cần cookie phiên. Mỗi kết nối thuộc một bản đồ; mọi tin dưới đây chỉ phát cho người **cùng bản đồ** (không gửi lại người gửi). `village` là bản đồ chung; `farm`/`house` là bản đồ riêng của từng tài khoản. Khách thăm vườn (issue 27) join `farm` kèm `owner` = tên chủ: vào chung bản đồ vườn của chủ, nên chủ, khách và các khách khác thấy nhau. Tài khoản có tên bắt đầu bằng `zzsmoke` (không phân biệt hoa thường, `SMOKE_PREFIX` trong `presence.mjs`) vào `village` thì ở làng thử riêng (mã nội bộ `village:test`): không thấy và không bị người thật thấy (người, vị trí, chat, biểu cảm), hai tài khoản smoke vẫn thấy nhau; vườn và nhà không đổi.
  - `{ t: 'join', map: 'village'|'farm'|'house', owner?, x, y, dir, look? }` (mỗi lần đổi cảnh và mỗi lần kết nối lại) → `{ t: 'joined', map, me: accountId, people: [{ id, name, level, look, x, y, dir }] }` (người khác đang ở đó, vị trí mới nhất); người cùng bản đồ nhận `{ t: 'enter', p }`. Tên lấy theo tài khoản; ngoại hình và cấp lấy từ vườn đã lưu trên server (chưa có vườn thì `look` trong tin, cấp 1). Cùng tài khoản join bằng kết nối mới thì kết nối cũ rời bản đồ. Lỗi: `{ t: 'error', code: 'no_session' | 'map_invalid' | 'no_farm' }` (`no_farm`: không có tài khoản tên `owner`). Khách (owner khác mình) vừa vào vườn thì server gọi `notifyVisit` (issue 26): khách là bạn của chủ thì mọi kết nối của chủ nhận `{ t: 'visit', name }` (vào lại bằng kết nối mới thay kết nối cũ thì không báo lại).
  - Đổi bản đồ / đóng kết nối → người ở bản đồ cũ nhận `{ t: 'leave', id }`.
  - `{ t: 'pos', x, y, dir }` → người khác nhận `{ t: 'pos', id, x, y, dir }`, **tối đa `LIVE.hz` = 6 lần mỗi giây mỗi người gửi** (các tin cách nhau ≥ 1000/6 ms; gửi dồn thì giữ vị trí mới nhất, phát ở nhịp kế tiếp nên vị trí cuối luôn tới). x, y kẹp trong 0..4096.
  - **Khách thấy chủ làm gì ngay (sửa lỗi online):** khách vào / ra vườn của chủ (join, đổi bản đồ, đóng kết nối) thì mọi kết nối của chủ nhận `{ t: 'watch', n }` (n = số khách đang đứng trong vườn, không tính chủ); kết nối giữ phiên chơi của chủ vừa `hello` xong mà đang có khách thì nhận `{ t: 'watch', n }` ngay sau `hello`. Trình duyệt chủ gửi `{ t: 'world', w }` (w = `visitWorld` của `state.js`) → mọi người trong bản đồ `farm` của chủ trừ chủ nhận `{ t: 'world', owner: tên chủ, w }`, `w` chỉ giữ các trường trong `VISIT_KEYS`. Chỉ nhận từ kết nối đang giữ phiên chơi hiện tại của chủ (đã `hello` đúng `play`); khách, kết nối khác của chủ, tin hỏng (`w` không phải object) thì bỏ qua, không ngắt. Chủ có thể đang ở nhà, ở làng hay thăm vườn khác. Tin WebSocket tối đa 256 KB. Test seam 3: `tests/server-visit.test.mjs`; e2e hai trình duyệt: `e2e/visit-live.spec.mjs`.
  - `{ t: 'chat', text }` (`text` phải nằm trong `QUICK_CHAT` của `data.js`) → `{ t: 'chat', id, text }`; `{ t: 'emote', e }` (`e` trong `EMOTES` 👋 ❤️ 😂 😡) → `{ t: 'emote', id, e }`. Câu/biểu cảm lạ → người gửi nhận `{ t: 'error', code: 'chat_invalid' }`, không ai nhận gì; chưa join → `not_joined`.
- **Hàng đợi thao tác của khách (issue 28, 30, `server/guests.mjs`, ADR 0012)**, cần cookie phiên và phải đang đứng trong vườn người khác (đã `join` `farm` kèm `owner`).
  - `{ t: 'guest', op }` → `{ t: 'guest', id, ok: true, reward }` hoặc `{ t: 'guest', id, ok: false, reason, msg }`. Các dạng `op` nhận được (`id` 8–64 ký tự `A-Za-z0-9_-`):
    - `{ id, kind: 'help'|'steal', act: 'water'|'weed'|'catch'|'shoo'|'crop'|'egg'|'product', idx | crow | egg | animal }` → `reward` = `{ coins, exp, help: 1 }` khi giúp, `{ items, steal }` khi trộm;
    - `{ id, kind: 'bark', act: 'bark', x, y }` (chỗ chó thấy khách, số nguyên trong ±10000) — không có `reward`;
    - `{ id, kind: 'bite', act: 'bite', loot: { <món>: n } }` (tối đa 20 món, `n` nguyên 1..10000, món phải có trong `ITEMS`/`CROPS`/`PRODUCTS`) → `reward` = `{ lose, fine, bite }`;
    - `{ id, kind: 'sausage', act: 'sausage' }` → `reward` = `{ lose: { sausage: 1 } }`.
    Server chỉ nhận đúng các trường trên; `by`, `level`, `room` (chỗ trống trong giỏ theo vườn đã lưu của khách), `sausage` (số xúc xích khách đang có) và `at` do server điền, không tin trình duyệt. `reason`: `no_session` · `not_joined` (chưa vào vườn ai) · `self` (vườn của chính mình) · `no_farm` · `op_invalid` · và các lý do của luật (`done`, `help_full`, `nothing`, `cant_steal`, `host_new`, `guest_new`, `robbed`, `full`, `day_full`, `no_guard`, `no_item`, `barking`).
  - Server lấy bản lưu mới nhất của chủ, áp dụng các thao tác còn chờ trong hàng đợi rồi kiểm tra thao tác mới bằng `guestOpApply` của `state.js`. Bị từ chối thì **không** ghi vào hàng đợi. Nhận thì ghi `guest_ops` và:
    - chủ **đang online** (có WebSocket giữ phiên chơi): `applied = NULL`, đẩy `{ t: 'guestop', op }` tới mọi kết nối của chủ; trình duyệt chủ áp dụng rồi gửi bản lưu lên như thường.
    - chủ **offline**: server chạy bù vườn (issue 24) rồi áp dụng ngay trên bản lưu đó, lưu lại (`saved_at` không đổi) và đánh dấu `applied`.
  - `GET /api/visit` và `POST /api/play` cũng chạy hàng đợi (sau khi chạy bù) khi chủ offline, nên khách đọc lại hay chủ đăng nhập vào đều thấy việc đã được giúp (hay vụ trộm đã xảy ra). Áp dụng hai lần cùng mã thì lần sau không làm gì (`reason: 'done'`).
- **Phía trình duyệt (`main.js` + `public/presence.js`):** dùng chung WebSocket của `sync.js` (`startSync({ ..., onMessage })`, `sync.send(msg)`; `onMessage` nhận mọi tin ngoài `kicked`, kể cả `hello` lúc kết nối (lại) xong và `{ t: 'down' }` lúc rớt). Đổi cảnh hoặc kết nối lại thì gửi `join`; đi thì gửi `pos` tối đa 6 lần/giây (chỉ khi vị trí đổi). `createPeers()` → `{ receive(msg, now), view(me, now), roster(), clear(), size }` giữ vài mốc vị trí mỗi người và vẽ trễ `LIVE.delayMs` = 300 ms, nội suy giữa hai mốc (`sampleTrack`) nên đi mượt dù mạng chậm/mất gói. `crowdSplit(me, people, LIVE.crowd = 12)`: bản đồ quá 12 người (tính cả mình) thì chỉ 11 người gần nhất vẽ cả nhân vật, người xa chỉ hiện **tên mờ**. `render` nhận `f.peers` (đã nội suy, có `full`, `chat`, `emote`) và `f.me` (bong bóng của mình); `__farm.peers` để test đọc.
- **Giao diện:** cột `#live` ở mép trái (điện thoại: ngay trên joystick): 4 nút biểu cảm, 💬 mở danh sách câu chat nhanh (`#live-says`), 👥 + số người (`#live-n`, tính cả mình) mở bảng `online` (tên, cấp người đang ở cùng bản đồ). Chỉ hiện khi chơi vườn online (`ui.setLive(on, n)`), ẩn khi xây dựng. Bong bóng chat hiện `LIVE.chatMs` = 4 giây, biểu cảm bay lên trong `LIVE.emoteMs` = 2,5 giây. Pixel art đọc `SPR2.chatBubble` (khung 9 ô, góc = 1/3 cạnh) + `SPR2.chatTail`, `SPR2.emotes[emoji]`, `SPR2.onlineIcon`; chưa có thì vẽ tạm/emoji.

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

> Luật người dùng chốt tối 2026-10-02: agent làm issue phát hành (33, 49, 63) chỉ làm **phần kiểm tra local** (bước 1, rà 360px, SPEC, ghi chú phát hành ở cuối file issue). **Deploy chỉ người điều phối làm**, ở mốc người dùng đồng ý: `git push` (thường, không force) rồi trên VPS `cd ~/project/ai_game && git pull && docker compose up -d --build`. **Không sao lưu** (bỏ bước 4), **chưa cần smoke live** (bước 3 để sau). Lần đầu lên server Node thì tạo 5 mã mời bằng lệnh quản trị, chỉ ghi trong báo cáo cho người dùng, không ghi vào repo. Subagent không bao giờ push, deploy hay ssh lên VPS.

1. **Local:** `npm test` và `npm run test:e2e` pass hết (không GitHub Actions).
2. **Deploy lên VPS** `image.huninna.com`: vào `~/project/ai_game`, chạy `git pull && docker compose up -d --build`. Container `ai-game` (`node:22-alpine`, chạy `server/main.mjs` nghe cổng 80, người dùng `node`) nằm trong network `gateway`; Caddy của `ai_gateway` chuyển `game.huninna.com` tới `ai-game:80`. Dữ liệu ở volume `ai-game_data` (`/data`). Khóa gateway lưu trên VPS, không nằm trong repo.
3. **Smoke live từ máy local:** `npm run test:smoke` (tới `https://game.huninna.com`): trang tải được, không lỗi console, tạo nhân vật, đi vào làng và về, `GET /api/health` trả 200 qua Caddy; tự dọn dữ liệu trình duyệt sau khi chạy. Có `SMOKE_INVITES` (2 mã mời tạo trên VPS) thì chạy thêm smoke online hai người chơi, xong xóa hai tài khoản `zzsmoke…` in ở dòng `SMOKE_ACCOUNTS` (lệnh ở mục Test, phần Smoke online).
4. **Sao lưu:** `docker compose exec web node server/admin.mjs backup`, kéo về máy bằng `docker compose cp` + `scp` (xem README).
5. Mỗi phase xong là deploy; làm theo thứ tự trong `DESIGN.md` mục 9.

## Giữ SPEC.md đúng với code

Mỗi issue/phase thêm hay đổi hàm công khai của `state.js`, target, event, trường bản lưu hoặc vai trò file thì cập nhật SPEC.md trong cùng lần làm. Nguồn sự thật cuối cùng là code (`public/state.js` export) và các test trong `tests/`.
