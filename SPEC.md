sellQuote(state, animal)          // → { price, kg (heo, không thì null), unit (xu/kg hôm nay), need (số lần phải xác nhận) }. Con thường: ANIMALS[].sell × TRADE.stageMul × TRADE.bondMul; heo: số ký × pigKgPrice(day) × bondMul; bệnh/dơ nhân sickMul/dirtyMul
Mỗi issue/phase thêm hay đổi hàm công khai của `state.js`, target, event, trường bản lưu hoặc vai trò file thì cập nhật SPEC.md trong cùng lần làm. Nguồn sự thật cuối cùng là code (`public/state.js` export) và các test trong `tests/`.
sellQuote(state, animal)          // → { price, kg (heo, không thì null), unit (xu/kg hôm nay), need (số lần phải xác nhận) }. Con thường: ANIMALS[].sell × TRADE.stageMul × TRADE.bondMul; heo: số ký × pigKgPrice(day) × bondMul; bệnh/dơ nhân sickMul/dirtyMul
sellAnimal(state, id, confirms=0) // bán cho Chú Ba (con ❤️4+ cần confirms ≥ 2) → R { coins, kg, sold } (sold để main.js vẽ cảnh Chú Ba dắt đi vào world.deals); perform(.., 'sell') gọi hàm này, đọc target.confirms
retireAnimal(state, id)           // chỉ con Già; a.retired = true: không sản phẩm (animalCan 'product' = false), cả chuồng vui >= TRADE.retireHappy, vẫn chiếm chỗ; không đảo ngược (TRADE.retireUndo)
weighPigs(state)                  // [{ id, name, kg }]; target { kind: 'scale', pen: 'pig' } (cân đặt sẵn cạnh máng, PEN_DEFS.pig.scale) có hành động 'weigh'. Heo tăng cân cả khi lớn: ăn no + ít đi lại (a.walk do world cộng) thì mau béo. Số liệu: TRADE, pigKgPrice(day) trong data.js. Chú Ba đứng trước nhà houseC ở làng
sellQuote(state, animal)          // → { price, kg (heo, không thì null), unit (xu/kg hôm nay), need (số lần phải xác nhận) }. Con thường: ANIMALS[].sell × TRADE.stageMul × TRADE.bondMul; heo: số ký × pigKgPrice(day) × bondMul; bệnh/dơ nhân sickMul/dirtyMul
sellAnimal(state, id, confirms=0) // bán cho Chú Ba (con ❤️4+ cần confirms ≥ 2) → R { coins, kg, sold } (sold để main.js vẽ cảnh Chú Ba dắt đi vào world.deals). perform(.., 'sell') cũng gọi hàm này, đọc target.confirms
retireAnimal(state, id)           // chỉ con Già; a.retired = true: không sản phẩm (animalCan 'product' = false), cả chuồng vui ≥ TRADE.retireHappy, vẫn chiếm chỗ. Không đảo ngược (TRADE.retireUndo)
weighPigs(state)                  // [{ id, name, kg }]; target { kind: 'scale', pen: 'pig' } (cân đặt sẵn cạnh máng, PEN_DEFS.pig.scale) có hành động 'weigh'
Hành động con vật thêm `retire`; heo tăng cân cả khi lớn: ăn no + ít đi lại (a.walk do world cộng) thì mau béo. Số liệu: `TRADE`, `pigKgPrice(day)` trong data.js. Chú Ba đứng trước nhà houseC trong làng (chạm: lời nhắn).
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
| `public/data.js` | Toàn bộ số liệu cân bằng và các bảng: cây, vật nuôi, vật phẩm, chó, quạ/trộm, ngoại hình, thành tựu, và các bảng của Phase 0: `STAMINA`, `TOOLS`/`TOOL_MAX`/`TOOL_LEVEL`/`GROUP_COST`, `MARKET`, `SHIP_RATE`/`shipValue`, `LAND_STRIP`/`LAND_STRIPS`/`DIR_NAME`, `CLUTTER`/`CLUTTER_RATE`, `FIELD_LIMITS`/`FIELD_PRICES`/`PEN_PRICES`, `NOTIFY_WINDOW`/`NOTIFY_CATS`/`EVENT_LEVEL`, `MAX_CATCHUP_MS`, `SPEEDS`, làng real-time `LIVE`/`QUICK_CHAT`/`EMOTES`, khách giúp và trộm vườn `GUEST`/`HELP_JOBS`/`hourText`, quà và sổ lưu bút ở cổng `GIFT`, chó canh khách `GUARD`/`WALK_SPEED`. Thuần dữ liệu và hàm tính từ số liệu |
| `public/layout.js` | Thuần dữ liệu bố cục, **không còn là bản đồ duy nhất**: `TS`, `MAP` (64x48), `GROUND`, `FIELD_SIZE`, `tileHash`; định nghĩa công trình `BUILDING_DEFS` (chân đế `foot`, điểm vẽ `spr`, điểm đứng `at`, `fixed`, `door`) và chuồng `PEN_DEFS`; bố cục vườn mới `START_FARM`; bản đồ cố định trong nhà và làng `SCENES`; bố cục bản v1 `V1` (dùng để chuyển bản lưu cũ) |
| `public/farm.js` | Dựng bản đồ/lưới va chạm từ bản lưu: `mapOf(state)` (vườn, nhớ tạm theo `farm.rev`), `sceneMap(state)` (bản đồ của cảnh đang đứng), `buildMap(farm)` (thử bố cục không nhớ tạm), `footprint`, `reachable`, `bumpLayout`, `hasScene`. Thuần JS |
| `public/migrate.js` | `SAVE_VERSION`, `newFarm`, `migrate(raw)`: chuỗi hàm chuyển bản lưu theo phiên bản (`STEPS`). Thuần JS, không ngẫu nhiên, không đọc đồng hồ |
| `public/clock.js` | Đồng hồ ngoài đời: `now()`, `setClock(fn)`, `realDay()` (giờ máy), và (issue 23) `measureOffset(ask, tries?, local?)` → độ lệch ms hoặc null, `useServerTime(offset|null)` (trỏ `now()` sang giờ server), `villageCal(t)` → `{ day, tod, frac }`, `serverDay(t)` → `'YYYY-MM-DD'` giờ Việt Nam (UTC+7), `VILLAGE_EPOCH` |
| `public/state.js` | Mô hình dữ liệu + **mọi luật chơi** + lưu/tải. Thuần JS, không DOM (trừ `localStorage` bọc try/catch). Đây là API công khai duy nhất của luật chơi |
| `public/notify.js` | Thông báo 3 mức: `eventMeta`, `createNotifier` (gộp toast), `arrowTargets`, `arrowFor`. Thuần JS |
| `public/todo.js` | `todoList(state)`: danh sách Việc cần làm cho bảng, bản đồ nhỏ, mũi tên. Thuần JS |
| `public/minimap.js` | Vẽ bản đồ nhỏ: `miniView`, `miniDots`, `drawMini`, `DOT` |
| `public/perf.js` | Hiệu năng: mảng nền `CHUNK`, `dirtyChunks`, `chunksIn`, AI ngoài màn hình `aiStep`, đo FPS `createFps`, tiết kiệm pin (`BATTERY_FPS`, `shouldSuggestBattery`), tùy chọn máy `loadPrefs`/`savePrefs` (khóa `nongtrai-pref`) |
| `public/art.js`, `public/art2.js` | Sprite vẽ bằng code. `art.js` giữ các export `canvas, sprite, flip, paint, hash, rect, disc, fenceTile, character, SPR, icon`; `art2.js` export `SPR2` (sprite của Phase 0: làng, chợ, tiệm rèn, nội thất, thùng giao hàng, bụi/đá, công cụ...; Phase 1 thêm hộp quà và sổ lưu bút ở cổng, chó canh khách `dogBark`/`dogRun`/`dogNap` (chó con và chó trưởng thành mỗi loại một sprite riêng cho từng tư thế), `barkBubble`, `dogChain`, `stunStars`, `barkArrow`, `sausage`/`sausageGround`; xem thử ở `public/_sprites2.html`). Thêm sprite mới thì giữ nguyên mọi export cũ |
| `public/render.js`, `public/world.js`, `public/main.js` | Vẽ (theo khung nhìn, nền chia mảng 16x16 ô), di chuyển/tìm đường/AI/chế độ xây dựng/camera, vòng lặp, chuyển cảnh mờ dần, input. **Không tự quyết luật**, chỉ gọi `state.js` |
| `public/index.html`, `public/style.css`, `public/ui.js`, `public/sound.js` | HUD, nút hành động, các bảng, tạo nhân vật, thông báo, âm thanh |
| `public/net.js`, `public/sync.js` | Phía trình duyệt của làng: tài khoản (`net.js`, issue 21) và đồng bộ vườn online (`sync.js`, issue 22), xem mục Server |
| `public/presence.js` | Người khác cùng bản đồ (issue 25): `crowdSplit(me, people, max)`, `sampleTrack(track, t)`, `createPeers()`. Thuần JS, xem mục Server |
| `server/` | Server Node (ADR 0010), xem mục Server. `server.js` cũ (hỏng) và `scripts/static-server.mjs` đã bị xóa ở issue 20 |
| `Dockerfile`, `compose.yml`, `.dockerignore` | `node:22-alpine` chạy `server/main.mjs`, nghe cổng 80; container `ai-game` trong network `gateway`, dữ liệu trên volume `data` (`/data/farm.db`) |
| `tests/` | Unit test `node --test`: seam 1 (`state.js`), seam 3 (`server-*.test.mjs`, helper `tests/helpers/server.mjs`) và `tests/fixtures/` (bản lưu v1 mẫu) |
| `e2e/`, `playwright*.config.mjs` | E2E và smoke Playwright (seam 2), `e2e/helpers.mjs` |

## Thời gian

- `state.time`: thời gian game (ms), tăng mỗi khung hình thêm `dtReal * state.speed` (speed ∈ `SPEEDS` = 1, 5, 20). Nút tốc độ chỉ có khi chơi một mình; online luôn x1 (`speedOf(state)`; `loadGame` ép `speed = 1`; `checkSaveJump` coi vườn online là x1).
- Mọi bộ đếm giờ trong luật chơi dùng `state.time`, **không dùng `Date.now()`**. Chỗ cần giờ ngoài đời (`savedAt`, chạy bù) dùng `now()` của `clock.js`.
- Ngày: `DAY_MS` = 20 phút. `dayFraction = (time % DAY_MS) / DAY_MS`. Ban đêm khi `dayFraction >= NIGHT_FROM`. Giờ hiển thị: `6:00 + dayFraction × 24h`. Ngày 1 bắt đầu lúc 6:00 sáng.
- Thời tiết đổi mỗi ngày mới: `sun` 45% · `cloud` 30% · `rain` 25%. Mưa: mọi ô luôn đủ nước. Nắng: đất khô nhanh gấp 1.5 lần.
- **Mùa** (chỉ hiển thị ở Phase 0): mỗi mùa 7 ngày game, Xuân, Hạ, Thu, Đông. `seasonOf(state)`.
- **Hai lịch (ADR 0003):** lịch game (ngày đêm, mùa, thời tiết) theo `state.time`; lịch ngoài đời (`realDay()` chơi đơn, `serverDay()` online) dành cho nhiệm vụ hằng ngày.
- **Lịch làng (online, issue 23):** khi vào làng, `sync.js` `syncClock()` đo lệch giờ qua `GET /api/health` (lấy lần khứ hồi ngắn nhất trong 3 lần, đo lại mỗi 5 phút) rồi `useServerTime(offset)`. Với vườn `mode: 'online'` thì ngày, mùa, ngày/đêm, giờ chợ, ngủ đều tính từ `villageCal(now())` (`VILLAGE_EPOCH` = 0h UTC ngày 2026-01-01 = 6:00 sáng ngày 1; `dayOf`, `dayFraction`, `seasonOf`, `clockText` đọc từ đó), nên cả làng cùng ngày/mùa/ban đêm và lịch không dừng khi vườn đóng băng. `state.time`/`state.day` vẫn là giờ vườn cho cây, con vật, thời tiết, bộ đếm. Rời làng thì `useServerTime(null)`.
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
  dog: { adult, age, hunger, happy, x, y, nextPoop, name, chained, nap, napCheck, quiet, barkAt, barkX, barkY },
  poops: [ { id, x, y, at } ],
  threats: [ { id, kind: 'crow'|'thief', plot, x, y, arriveAt, state: 'coming'|'eating'|'leaving', since, loot? } ],
  orders: [ { id, who, items, coins, exp } ], nextOrderAt,
  stats: { harvests, bugs, eggs, poops, slips, piglets, hatches, orders, thieves, crows, earned, planted, shipped, bought, slept,
           chased, barks, robStreak },   // issue 31: chó đã đớp bao nhiêu khách, đã sủa mấy lần; chuỗi trộm chưa bị đớp (issue 32 dùng)
  achievements: { id: true },
  log: [ { t, text } ],                       // mới nhất ở đầu, tối đa 50
  tutorial,                                   // số bước hướng dẫn đã qua (>= TUTORIAL.length là xong)
  notify: { ripe: false, ... },               // loại thông báo 🟡 đã tắt; thiếu = bật; mức 🔴 không tắt được
  seenWhatsNew,                               // đã xem màn "Bản mới có gì đổi" (WHATS_NEW_VERSION)
  migratedFrom,                               // 1 nếu chuyển từ bản v1
  nextId,                                     // bộ cấp id chung cho thực thể, con vật, trứng...
  // trường cho online (issue 22), thêm vào v2 không đổi phiên bản; bản thiếu thì loadGame bù mặc định
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

### Thăm vườn người khác (issue 27, ADR 0012)
```js
startVisit(me, raw, owner)        // → bản đi dạo `v` (null nếu bản lưu chủ hỏng). raw = bản lưu chủ từ GET /api/visit (đã chạy bù)
                                  //   v.scene = 'visit', v.visit = { owner, fed, level (cấp chủ vườn: trong v thì `exp` là của khách) }.
                                  //   Đất, cây, con vật, chó... (farm, plots, animals, troughs, eggs,
                                  //   nest, dog, poops, shipbin, time, day, weather, simMs, nextId, today, guests) là bản sao của chủ,
                                  //   threats = quạ của chủ (thằng Tèo thì không: bắt trộm là việc của chủ);
                                  //   phần còn lại dùng chung với bản lưu khách `me` (giỏ, kho, đơn hàng... cùng đối tượng; coins, exp,
                                  //   stamina, can, selectedSeed đọc ghi thẳng vào me). v không bao giờ được lưu hay gửi đi.
sceneMap(v)                       // bản đồ khách: như mapOf của vườn chủ, scene 'visit', garden: true; chỉ còn cửa ra làng (doors),
                                  //   ô cửa nhà bị chắn; exit = chỗ đứng trong cổng (tới và ra); công trình riêng mang `guest` = lý do
                                  //   (BUILDING_DEFS[...].guest: house, shed, shipbin, board)
guestCheck(v, target, actionId)   // → { ok: true } | { ok: false, reason, msg }. reason: 'private' (nhà, kho, thùng giao hàng, bảng đơn),
                                  //   'build' (target { kind: 'build' } = chế độ xây dựng), 'stranger' (vuốt chó lạ chưa cho ăn),
                                  //   'no_food' (giỏ khách không có dogfood), 'help_full' / 'nothing' (việc giúp, xem mục dưới),
                                  //   các lý do của việc trộm (actionId 'steal', issue 30), 'guest' (mọi việc khác)
```
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
                                  //   reward = { coins, exp } (giúp) | { items: { <món>: qty }, steal: 1 } (trộm).
                                  //   Cộng host.today.helps (giúp) hay today.steals + today.stolen (trộm) và ghi một dòng vào
                                  //   host.guests (nhớ op.id) nên áp dụng lại cùng mã là no-op
guestReward(me, reward)           // cộng xu + EXP, bỏ đồ trộm được vào giỏ/kho và cộng me.today.robs (chỉ gọi khi server đã xác nhận)
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
- **Trộm NPC nhường:** đêm nào vườn đã có `stealsToday > 0` thì thằng Tèo không lẻn vào (`stepThreats`).
- **Giao diện:** ở cảnh `visit`, chạm ô chín / quả trứng / con vật đang chờ lấy hiện nút **😈 Trộm n &lt;món&gt; (còn m)** (id hành động `steal`); bị chặn thì nút vẫn hiện nhưng **mờ** kèm lý do. Chủ xem nhật ký khách trong bảng **📜 Nhật ký** (mục "Khách ghé vườn", `.guest-row[data-by]`): dòng trộm `.stolen` ghi "B đã trộm 1 cà chua lúc 3h chiều 😤" (giờ ngoài đời giờ Việt Nam, `data.js hourText`) và có nút **😤 Sang trộm lại** (`.revenge`) gọi `api.revenge(name)` — đi qua làng rồi vào thẳng vườn kẻ trộm; kẻ trộm dưới cấp 5 hay mình chưa tới cấp 5 thì nút mờ kèm lý do.
- **Báo gấp 🔴:** event `stolen` là mức `urgent`; `ui.handleEvents` bật băng rôn đỏ + tiếng + rung ngay (`alertNow`), không cần chỗ cố định trong vườn. Đẩy tới mọi bản đồ làm đầy đủ ở issue 32.

### Chó Mực canh khách lạ (issue 31, DESIGN §6.1, ADR 0013)
Luật nằm trong `state.js` ở mức ô và theo trạng thái bản lưu; `world.js` chỉ **diễn hoạt** (chó sủa, chạy đuổi) và báo cho `main.js` biết lúc nào gửi thao tác lên server. Phần đuổi theo chạy trên **trình duyệt của khách** vì khách mới là người đang di chuyển.
```js
guardRadius(state, t?)            // bán kính canh tính theo Ô (0 = không canh): chó con GUARD.radius.pup = 4,
                                  //   trưởng thành GUARD.radius.adult = 6; vui < GUARD.sadHappy (50) còn một nửa;
                                  //   đói < GUARD.hungryStop (30) hay đang mải ăn xúc xích thì 0; ngủ gật còn
                                  //   GUARD.napRadius = 1; bị xích thì tối đa GUARD.chainRadius = 3
dogSees(state, pos, t?)           // chó có thấy khách đứng ở pos ({ x, y } điểm ảnh bản đồ) không. Tâm vùng canh:
                                  //   chính con chó khi thả rông, chuồng chó khi bị xích
guardArea(state)                  // vùng chó chạy được khi bị xích: { x, y, r } (điểm ảnh); null = thả rông, khắp vườn
dogAsleep(state)                  // đang ngủ gật (ban đêm và state.time < dog.nap)
dogQuiet(state, t?)               // đang mải ăn xúc xích (t < dog.quiet, giờ ngoài đời)
walkSpeed() / chaseSpeed()        // px/s người đi bộ (WALK_SPEED = 70) và chó đuổi (× GUARD.chaseMul = 1.3)
setChained(state, on)             // chủ xích chó / thả rông (hành động `chain` ở target { kind: 'dog' })
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
  - `{ kind: 'sausage', act: 'sausage' }` — khách ném xúc xích (vật phẩm `sausage`, 30 xu ở chợ Bà Tư, cấp 5). Chó no dưới `GUARD.sausageHunger` = 50 thì **chắc chắn ăn**, chó đang no vẫn `GUARD.sausageGreed` = 30% tham ăn — phần hên xui quay bằng **hạt giống cố định = mã thao tác**, nên server và trình duyệt chủ ra cùng kết quả. Ăn thì `dog.quiet = at + GUARD.quietMs` (im lặng 60 giây). Kết quả trả `{ ate }`, khách mất 1 xúc xích dù chó có ăn hay không.
  - Cả ba từ chối với `reason: 'no_guard'` khi vườn không có chó đang canh, `'no_item'` khi khách hết xúc xích.
- **Chủ vườn:** online thì nhận `{ t: 'guestop', op }` → `guestOpApply` → `takeGuestLog` → băng rôn 🔴 "Mực đang sủa ở phía Đông vườn!" kèm **mũi tên** (todo kind `bark`, sprite `SPR2.barkArrow`, tắt sau `GUARD.barkShowMs` = 15 giây) và toast 🟡 khi chó đớp được hay bị ném xúc xích (loại thông báo `guard`). Offline thì server áp dụng thẳng vào bản lưu, chủ về đọc nhật ký.
- **Chó trong vườn người khác không đi theo khách lạ** (`world.js`): nó quanh quẩn giữ chuồng, chỉ rời chỗ khi đuổi. Lúc đuổi thì chạy `chaseSpeed()`, đớp khi cách khách `GUARD.biteRange` = 11 px, mất dấu `GUARD.loseMs` = 2 giây thì thôi đuổi; màn hình khách rung nhẹ lúc chó sủa và lúc bị đớp.
- **Nhật ký chó:** `stats.chased` = đã đớp được bao nhiêu người, `stats.barks` = đã sủa mấy lần (issue 32 dùng cho thành tựu và màn "Trong lúc bạn vắng nhà"). `stats.robStreak` = chuỗi trộm chưa bị đớp của chính mình.

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
notifyOn(state, cat)  setNotify(state, cat, on)   // cat ∈ NOTIFY_CATS (ripe, spoil, hungry, loss, levelup, order, help, gate, guard)
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
{ kind: 'building', id }       // theo bản đồ đang đứng. Vườn (cả vườn người khác đang thăm): house, gate, giftbox, guestbook, shed, shipbin, board, well, doghouse (không tương tác).
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
| `helped` | `by` (tên khách), `act` ('water'/'weed'/'catch'/'shoo'), `at` | important (`help`) |
| `stolen` | `by` (tên kẻ trộm), `item`, `qty`, `at` (giờ ngoài đời) | urgent |
| `gift` | `name`, `item`, `qty` (tin từ server, không do `tick()` phát) | important (`gate`) |
| `note` | `name` (tin từ server) | important (`gate`) |
| `barked` | `by`, `dog`, `where`, `x`, `y`, `at` (chó sủa báo khách lạ, issue 31) | urgent |
| `bitten` | `by`, `dog`, `fine`, `at` | important (`guard`) |
| `sausaged` | `by`, `dog`, `ate`, `at` | important (`guard`) |
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

**Vật nuôi, chó, quạ/trộm**: như bản cũ. Đói dần; máng còn cám thì tự ăn; con non lớn khi `hunger > growNeedsHunger`; bệnh thì không lớn/đẻ; gà đẻ trứng xuống đất; ổ ấp; bò/cừu `ready` → vắt sữa/xén lông; heo mang bầu đẻ 1–3 con (không vượt `PEN_CAP`). Chó ỉa bậy, giẫm phải thì trượt chân, càng nhiều phân vật nuôi càng mất vui, chó trưởng thành no và vui thì canh nhà (đuổi quạ và thằng Tèo theo `DOG.guardChance`; canh **khách lạ** là luật riêng, xem mục "Chó Mực canh khách lạ"). Quạ tới ô chín khi không có bù nhìn trong 5 ô; thằng Tèo vào ban đêm khi có ≥2 ô chín (đèn lồng giảm xác suất). Cổng (`gateIn`) là chỗ thằng Tèo đi vào. **Đóng băng/chạy bù không sinh quạ/trộm** và không làm con vật chết (ADR 0004). Chuồng chỉ dời được, luật không đổi.

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
Mẫu: dựng `localStorage` giả (`globalThis.localStorage = {getItem, setItem, removeItem}`), `G.createGame(...)`, rồi `G.tick/perform/canPlace/...`. Muốn kết quả ngẫu nhiên cố định thì thay `Math.random` tạm (`0.99` = không xảy ra sự kiện nhỏ, `0.0001` = trúng hết). Test mô tả tình huống người chơi gặp ("dời khối ruộng đang có cây thì cây giữ nguyên tiến độ"), không test hàm nội bộ. Các file: `state` (luật gốc), `save-v2` (chuyển bản lưu, fixture), `place` (đặt/dời/cất, mọi `reason`), `build`, `land` (mở đất, dọn), `scene` (chuyển bản đồ), `village` (chợ), `shipbin`, `stamina`, `tools`, `basket`, `time` (chạy bù, đóng băng, mùa), `notify`, `todo`, `perf`, `tutorial`, `online-save` (trường online, `checkSaveJump`), `presence` (người khác cùng bản đồ: tên mờ khi đông, nội suy), `visit` (luật khách), `help` (thao tác giúp của khách, giới hạn mỗi ngày, mã thao tác), `steal` (luật trộm: 25% mỗi ô, một lần mỗi người, trần 30% mỗi ngày, bảo vệ người mới, giỏ đầy, thể lực, trộm NPC nhường).

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
| `server/farms.mjs` | Kho vườn online (issue 22, ADR 0012, 0016): `claimPlay(ctx, account)`, `readFarm(db, account)`, `storeFarm(ctx, account, { play, save })`, `visitFarm(ctx, name)`, `playOf(db, accountId)`, `farmRow(db, accountId)`, `catchUpFarm(db, row)`, `writeFarm(db, accountId, save, t?)`, `FINAL_MS`. Chống gian lận bằng `checkSaveJump` của `state.js` |
| `server/guests.mjs` | Hàng đợi thao tác của khách (issue 28, 30, ADR 0012): `createGuests(ctx, send, pres)` → `{ handlers: { guest } }`, `submitGuestOp(ctx, guest, ownerId, op)`, `runGuestQueue(db, row)`, `stealsOf(db, guestId, t?)` (số vụ trộm đã nhận của một người hôm nay). Luật lấy từ `guestOpApply` của `state.js`, server không có bản luật riêng |
| `server/static.mjs` | `serveStatic(dir)`: GET/HEAD, MIME theo đuôi, `.html` `no-store`, file khác `no-cache` + ETag (304). `..`, `\`, byte 0, thoát khỏi `dir` → 403 |
| `server/presence.mjs` | Làng real-time (issue 25): `createPresence(ctx, send)` → `{ handlers: { join, pos, chat, emote }, leave(sock), gardenOf(sock), stop() }` (`gardenOf` = id chủ vườn mà kết nối đang đứng trong, cho issue 28). Mỗi kết nối thuộc một bản đồ (`sock.pres`); `live.mjs` tra `handlers` sau `HANDLERS` và gọi `leave` khi kết nối đóng |
| `server/gate.mjs` | Quà và sổ lưu bút ở cổng (issue 29): `sendGift`, `readGifts`, `takeGifts`, `signBook`, `readBook`, `gateNews`. Gọi lại luật thuần của `public/state.js` |
| `server/live.mjs` | `attachLive(server, ctx)` → `{ sendTo(accountId, msg), kick(accountId, play), close() }`. WebSocket ở `/ws` (đường khác bị ngắt), tin tối đa 64 KB. Tài khoản của kết nối lấy từ cookie lúc nâng cấp (`sock.account`), `hello` gắn phiên chơi (`sock.play`). Tin JSON `{ t, ... }` tra trong `HANDLERS(sock, msg, ctx)` rồi tới `presence`, `guests`; tin hỏng/loại lạ bỏ qua, không ngắt. `send(sock, obj)`. Issue sau đẩy tin tới chủ vườn bằng `ctx.live.sendTo` |
| `server/db.mjs` | `openDb(file)`: WAL, `foreign_keys`, chạy `MIGRATIONS` theo `PRAGMA user_version` (mỗi phần tử một bản, trong transaction; chỉ thêm vào cuối). `backupTo(db, out)` = `VACUUM INTO` |
| `server/admin.mjs` | Lệnh quản trị: `node server/admin.mjs <lệnh> [--db file]` (mặc định `DB_FILE` rồi `./farm.db`). In kết quả ra stdout, lỗi ra stderr + mã thoát 1. Thêm lệnh vào `COMMANDS` |

**Schema SQLite** (`user_version`):
- v1 `meta(key TEXT PRIMARY KEY, value TEXT)` có dòng `created`.
- v2 `accounts(id, name, name_key UNIQUE, pin_hash, pin_salt, created, fails, locked_until)`, `invites(code PK, created, used_by → accounts ON DELETE SET NULL, used_at)`, `sessions(token_hash PK, account_id → accounts ON DELETE CASCADE, created, expires)`. PIN băm `scrypt` (muối 16 byte riêng từng tài khoản); phiên chỉ lưu SHA-256 của mã; `name_key` = tên chữ thường (đã chuẩn hóa NFC).
- v3 `farms(account_id PK → accounts ON DELETE CASCADE, play, save, saved_at, updated, rev)`: một dòng mỗi tài khoản. `play` = phiên chơi đang giữ quyền ghi (mã ngẫu nhiên 16 byte), `save` = bản lưu v2 JSON (`NULL` = chưa có vườn), `saved_at` = `savedAt` của bản lưu (giờ trình duyệt), `updated` = giờ server lúc nhận, `rev` = số bản đã nhận.
- v4 `accounts.friend_code` (UNIQUE) + `friends(account_id, friend_id, created)` (issue 26, xem mục Bạn bè).
- v5 `guest_ops(id TEXT PK, owner_id → accounts ON DELETE CASCADE, guest_id → accounts ON DELETE CASCADE, op, created, applied)` (issue 28): hàng đợi thao tác của khách. `id` = mã thao tác do khách sinh (duy nhất nên gửi lại không nhân đôi), `op` = thao tác JSON (đã có `by`, `level`, `room`, `sausage` và `at` do server điền; `kind` 'help', 'steal', 'bark', 'bite' hay 'sausage'), `applied` = giờ server lúc **server** tự áp dụng vào bản lưu chủ (`NULL` = đang chờ trình duyệt chủ áp dụng). Dòng đã áp dụng quá 7 ngày thì xóa.
- v6 (issue 29) `gifts(id, owner_id → accounts ON DELETE CASCADE, from_id, from_name, item, qty, op, created, UNIQUE(from_id, op))` = hàng đợi quà ở cổng (`qty` = số còn chờ; nhận hết thì 0 nhưng giữ dòng để mã thao tác `op` vẫn chặn gửi lặp) và `guestbook(id, owner_id, author_id, author_name, text, day, created, seen, UNIQUE(owner_id, author_id, day))` = sổ lưu bút (`day` = ngày ngoài đời giờ Việt Nam, `seen` = chủ đã đọc chưa).

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
  - `POST /api/farm` `{ play, save }` → `200 { ok, rev, savedAt }`. Lỗi: `409 play_replaced` (phiên không phải phiên đang giữ quyền ghi: "Vườn đang được chơi ở thiết bị khác") · `400 save_invalid` (không qua `migrate`, thiếu `coins`/`exp`/`savedAt`/`plots`) · `422 implausible` kèm `reason` (`checkSaveJump` của `state.js` so với bản trước — `dtMs` = max(giờ server đã trôi, min(chênh `savedAt` hai bản, giờ server đã trôi + 8 giờ)) — hoặc `reason: 'steals'` khi `today.robs` khai nhiều vụ trộm hơn số server đã nhận hôm nay, issue 30). Bản đầu tiên của tài khoản (mang vườn chơi đơn lên / vườn mới) nhận nguyên. Server đóng dấu `mode: 'online'`, `account` = tên tài khoản. Bị từ chối thì bản cũ trên server giữ nguyên.
  - `GET /api/visit?name=` (cần đăng nhập) → `200 { ok, name, farm, savedAt }` hoặc `404 no_farm`. Lối đọc công khai vườn người khác (chỉ đọc: chỉ có GET, phương thức khác `405`; issue 27 dùng để thăm vườn). Chủ đang offline (không có WebSocket giữ phiên chơi) thì server chạy bù trước bằng `loadGame` của `state.js` (tối đa 8 giờ, phần dư đóng băng, vật nuôi không chết), lưu lại với `savedAt` = giờ server; chạy đồng bộ nên đọc nhiều lần chỉ chạy một lần. Tóm tắt vắng nhà cất ở `farm.awayPending`, `loadGame` ở trình duyệt chủ biến nó thành `s.away` (gộp thêm phần vắng sau đó nếu có). `POST /api/play` cũng chạy bù trước khi trao vườn cho chủ.
- **Bạn bè và cổng vườn (issue 26, `server/friends.mjs`)**, cần cookie phiên. Bảng `friends` (migration v4, quan hệ **một chiều**: A thêm B thì A ghim B; B không tự thành bạn của A), cột `accounts.friend_code` (mã kết bạn 6 ký tự dạng `ABC-DEF`, bỏ O/0/I/1, cấp lười ở lần xem đầu). Ai vào vườn ai cũng được, kết bạn chỉ để ghim và nhận thông báo.
  - `GET /api/friends` → `200 { ok, code, friends: [{ name, level, online, ripe, help }] }` theo tên. `online` = có kết nối WebSocket giữ phiên chơi; `ripe` (🍅) = có ô đất mở với cây chín (chưa héo/chết); `help` (🐛) = có ô có cỏ hoặc cây có sâu. Chỉ có bấy nhiêu trường, không lộ bản lưu. Chưa có vườn thì cấp 1, hai cờ tắt.
  - `POST /api/friends` `{ name }` hoặc `{ code }` (không phân biệt hoa thường, dấu cách, dấu -) → `200 { ok, name }`. Lỗi: `404 no_such_name` · `404 bad_code` · `409 already_friend` · `400 self`.
  - `POST /api/friends/remove` `{ name }` → `200 { ok }` hoặc `404 not_friend`. Chỉ xóa dòng quan hệ, vườn và tài khoản của ai cũng còn nguyên.
  - `GET /api/gates` → `200 { ok, gates: [{ name, level, friend }] }`: vườn của mọi người chơi khác đã có bản lưu, bạn bè (`friend: true`) ở đầu rồi tới người còn lại, mỗi nhóm theo tên; không có chính mình.
  - Thông báo ghé vườn: `notifyVisit({ db, live }, visitor, ownerId)` trong `friends.mjs` gửi `{ t: 'visit', name }` tới chủ vườn qua WebSocket nếu `visitor` nằm trong danh sách bạn của chủ vườn. `presence.mjs` gọi khi khách join `farm` của chủ (issue 27). Trình duyệt hiện toast 🟡 "<tên> vừa ghé thăm vườn của bạn".
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
- **Làng real-time (issue 25, `server/presence.mjs`)**, cần cookie phiên. Mỗi kết nối thuộc một bản đồ; mọi tin dưới đây chỉ phát cho người **cùng bản đồ** (không gửi lại người gửi). `village` là bản đồ chung; `farm`/`house` là bản đồ riêng của từng tài khoản. Khách thăm vườn (issue 27) join `farm` kèm `owner` = tên chủ: vào chung bản đồ vườn của chủ, nên chủ, khách và các khách khác thấy nhau.
  - `{ t: 'join', map: 'village'|'farm'|'house', owner?, x, y, dir, look? }` (mỗi lần đổi cảnh và mỗi lần kết nối lại) → `{ t: 'joined', map, me: accountId, people: [{ id, name, level, look, x, y, dir }] }` (người khác đang ở đó, vị trí mới nhất); người cùng bản đồ nhận `{ t: 'enter', p }`. Tên lấy theo tài khoản; ngoại hình và cấp lấy từ vườn đã lưu trên server (chưa có vườn thì `look` trong tin, cấp 1). Cùng tài khoản join bằng kết nối mới thì kết nối cũ rời bản đồ. Lỗi: `{ t: 'error', code: 'no_session' | 'map_invalid' | 'no_farm' }` (`no_farm`: không có tài khoản tên `owner`). Khách (owner khác mình) vừa vào vườn thì server gọi `notifyVisit` (issue 26): khách là bạn của chủ thì mọi kết nối của chủ nhận `{ t: 'visit', name }` (vào lại bằng kết nối mới thay kết nối cũ thì không báo lại).
  - Đổi bản đồ / đóng kết nối → người ở bản đồ cũ nhận `{ t: 'leave', id }`.
  - `{ t: 'pos', x, y, dir }` → người khác nhận `{ t: 'pos', id, x, y, dir }`, **tối đa `LIVE.hz` = 6 lần mỗi giây mỗi người gửi** (các tin cách nhau ≥ 1000/6 ms; gửi dồn thì giữ vị trí mới nhất, phát ở nhịp kế tiếp nên vị trí cuối luôn tới). x, y kẹp trong 0..4096.
  - `{ t: 'chat', text }` (`text` phải nằm trong `QUICK_CHAT` của `data.js`) → `{ t: 'chat', id, text }`; `{ t: 'emote', e }` (`e` trong `EMOTES` 👋 ❤️ 😂 😡) → `{ t: 'emote', id, e }`. Câu/biểu cảm lạ → người gửi nhận `{ t: 'error', code: 'chat_invalid' }`, không ai nhận gì; chưa join → `not_joined`.
- **Hàng đợi thao tác của khách (issue 28, 30, `server/guests.mjs`, ADR 0012)**, cần cookie phiên và phải đang đứng trong vườn người khác (đã `join` `farm` kèm `owner`).
  - `{ t: 'guest', op }` → `{ t: 'guest', id, ok: true, reward }` hoặc `{ t: 'guest', id, ok: false, reason, msg }`. Các dạng `op` nhận được (`id` 8–64 ký tự `A-Za-z0-9_-`):
    - `{ id, kind: 'help'|'steal', act: 'water'|'weed'|'catch'|'shoo'|'crop'|'egg'|'product', idx | crow | egg | animal }` → `reward` = `{ coins, exp }` khi giúp, `{ items, steal }` khi trộm;
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

1. **Local:** `npm test` và `npm run test:e2e` pass hết (không GitHub Actions).
2. **Deploy lên VPS** `image.huninna.com`: vào `~/project/ai_game`, chạy `git pull && docker compose up -d --build`. Container `ai-game` (`node:22-alpine`, chạy `server/main.mjs` nghe cổng 80, người dùng `node`) nằm trong network `gateway`; Caddy của `ai_gateway` chuyển `game.huninna.com` tới `ai-game:80`. Dữ liệu ở volume `ai-game_data` (`/data`). Khóa gateway lưu trên VPS, không nằm trong repo.
3. **Smoke live từ máy local:** `npm run test:smoke` (tới `https://game.huninna.com`): trang tải được, không lỗi console, tạo nhân vật, đi vào làng và về, `GET /api/health` trả 200 qua Caddy; tự dọn dữ liệu trình duyệt sau khi chạy.
4. **Sao lưu:** `docker compose exec web node server/admin.mjs backup`, kéo về máy bằng `docker compose cp` + `scp` (xem README).
5. Mỗi phase xong là deploy; làm theo thứ tự trong `DESIGN.md` mục 9.

## Giữ SPEC.md đúng với code

Mỗi issue/phase thêm hay đổi hàm công khai của `state.js`, target, event, trường bản lưu hoặc vai trò file thì cập nhật SPEC.md trong cùng lần làm. Nguồn sự thật cuối cùng là code (`public/state.js` export) và các test trong `tests/`.
