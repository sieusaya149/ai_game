# Nông Trại Vui: đặc tả kỹ thuật (bản chơi đơn, chạy hoàn toàn trên trình duyệt)

Game nông trại 2D nhìn từ trên xuống, kiểu **nông trại Avatar (TeaMobi)**. Người chơi điều khiển nhân vật đi tới tận nơi để làm mọi việc.
**Không có backend**: toàn bộ chạy trong trình duyệt, lưu vào `localStorage`. File tĩnh được phục vụ bởi `server.js` có sẵn (đừng sửa file đó).

- Chỉ dùng ES modules thuần, **không thư viện, không bước build**. Mọi file nằm trong `public/`.
- Chữ hiển thị cho người chơi: **tiếng Việt có dấu**, giọng vui vẻ, thân thiện kiểu gia đình.
- Comment code: tiếng Việt, ngắn gọn, chỉ khi cần.
- Đồ họa pixel art: canvas có `imageSmoothingEnabled = false`.

## Các file và người phụ trách

| File | Người phụ trách | Nội dung |
|---|---|---|
| `public/data.js` | có sẵn, **chỉ đọc** | Toàn bộ số liệu cân bằng: cây, vật nuôi, vật phẩm, chó, quạ/trộm, ngoại hình, thành tựu |
| `public/layout.js` | có sẵn, **chỉ đọc** | Bản đồ 34x27 ô (ô 16px): đường, ruộng, chuồng, công trình, va chạm (`isSolid`, `isSolidPx`) |
| `public/state.js` | **agent LOGIC** | Mô hình dữ liệu game + mọi luật chơi + lưu/tải. Thuần JS, không DOM (trừ `localStorage` có bọc try/catch) |
| `tests/state.test.mjs` | **agent LOGIC** | Test bằng `node --test tests/` |
| `public/art.js` | **agent ART** | Toàn bộ sprite (đã có sẵn nhiều, phải giữ nguyên các export hiện có) |
| `public/render.js`, `public/world.js`, `public/main.js` | **agent WORLD** | Vẽ bản đồ và thực thể, di chuyển, tìm đường, AI con vật, camera, input, vòng lặp game |
| `public/index.html`, `public/style.css`, `public/ui.js`, `public/sound.js` | **agent UI** | HUD, nút hành động, các bảng (sạp hàng, kho, túi đồ, đơn hàng, tủ đồ, thành tựu, cài đặt), tạo nhân vật, âm thanh |

Mỗi agent chỉ sửa file của mình. Cần gì từ module khác thì làm theo đúng API dưới đây.

## Thời gian

- `state.time`: thời gian game (ms), tăng mỗi khung hình thêm `dtReal * state.speed` (speed ∈ `SPEEDS` = 1, 5, 20).
- Mọi bộ đếm giờ dùng `state.time`, **không dùng `Date.now()`** (trừ `state.savedAt`, dùng để chạy bù khi mở lại game).
- Ngày: `DAY_MS` = 20 phút. `dayFraction = (time % DAY_MS) / DAY_MS`. Ban đêm khi `dayFraction >= NIGHT_FROM`.
  - Giờ hiển thị: `6:00 + dayFraction × 24h`, quay vòng. Ngày 1 bắt đầu lúc 6:00 sáng.
- Thời tiết đổi mỗi ngày mới: `sun` 45% · `cloud` 30% · `rain` 25%.
  - Mưa: mọi ô luôn đủ nước.
  - Nắng: đất khô nhanh gấp 1.5 lần.

## Hình dạng state (agent LOGIC là chủ, các agent khác đọc theo đúng các trường này)

```js
state = {
  v: 1,
  name: 'Hùng', look: { skin, hair, hairColor, shirt, pants, hat, acc },   // chỉ số lựa chọn, xem LOOK/HATS/ACCS trong data.js
  owned: { hat: [0, 1], acc: [0] },          // mũ/phụ kiện đã mua (index)
  coins: 250, exp: 0,
  time: 0, speed: 1, day: 1, weather: 'sun', savedAt: Date.now(),
  player: { x, y, dir: 0 },                  // điểm ảnh, tâm bàn chân; dir: 0 xuống, 1 trái, 2 phải, 3 lên
  can: 10,                                   // số lần tưới còn trong bình (tối đa FARMING.canMax)
  selectedSeed: 'cai',                       // id cây (không có tiền tố seed_)
  inv: { seed_cai: 6, cai: 3, trung: 2, pesticide: 1, ... },   // vật phẩm, nông sản, sản phẩm
  plots: [                                   // luôn đủ 36 phần tử, idx 0..35 (ô idx nằm ở layout.plotTile(idx))
    { idx, unlocked: true, soil: 'untilled' | 'tilled', water: 0..100, weeds: false,
      crop: null | { id: 'cai', progress: 0..1+, planted: time, bugs: false, bugSince: 0, sick: false, sickSince: 0,
                     fert: false, boosts: 0, dead: false, rotten: false, ripeAt: 0 } }
  ],
  animals: [ { id, type: 'ga'|'heo'|'bo'|'cuu', adult: bool, age: ms (thời gian đã lớn), hunger: 0..100 (100 = no),
               happy: 0..100, sick: false, starvingSince: 0, nextProduct: time, ready: false,   // ready: bò/cừu có sữa/lông chờ lấy
               pregnant: false, dueAt: 0, x, y, name } ],
  troughs: { chicken: 0, pig: 0, pasture: 0 },    // số phần ăn còn trong máng
  eggs: [ { id, x, y, laidAt } ],                  // trứng nằm dưới đất trong chuồng gà
  nest: { egg: false, hatchAt: 0 },                // ổ ấp trước chuồng gà nhỏ (BUILDINGS id 'coop')
  dog: { adult: false, age: 0, hunger: 100, happy: 60, x, y, nextPoop: time, name: 'Mực' },
  poops: [ { id, x, y, at } ],
  threats: [ { id, kind: 'crow'|'thief', plot: idx, x, y, arriveAt, state: 'coming'|'eating'|'leaving' } ],
  decos: [ { id, kind: 'deco_scarecrow'|..., x, y } ],
  orders: [ { id, who: 'Bà Tư', items: { cai: 3, trung: 2 }, coins, exp } ],
  nextOrderAt: time,
  stats: { harvests, bugs, eggs, poops, slips, piglets, hatches, orders, thieves, crows, earned, planted },
  achievements: { harvest10: true, ... },
  log: [ { t: time, text } ],                      // mới nhất ở đầu, tối đa 50
  tutorial: 0,                                     // bước hướng dẫn hiện tại (UI dùng)
  nextId: 1,
}
```

Vị trí thực thể (`player`, `animals[i].x/y`, `dog.x/y`, `threats[i].x/y`) do **agent WORLD** cập nhật mỗi khung hình (di chuyển, AI).
Các bộ đếm giờ và luật chơi do **agent LOGIC** xử lý trong `tick()`.

## API của `state.js` (agent LOGIC)

```js
export function createGame({ name, look })        // → state mới theo START trong data.js; con vật đặt ngẫu nhiên trong PENS[..].area
export function loadGame()                         // → state | null (đọc localStorage 'nongtrai-save-v1'); tự chạy bù thời gian offline (≤ MAX_CATCHUP_MS, tốc độ x1)
export function saveGame(state)                    // ghi localStorage, cập nhật savedAt
export function resetGame()                        // xóa save
export function tick(state, dtGame)                // tiến thời gian dtGame ms (đã nhân speed). Trả về events[] (xem dưới). Nếu dtGame lớn (chạy bù) thì chia bước ≤ 1000ms.
export function actionsFor(state, target)          // → [{ id, label, icon, disabled?: 'lý do' }]: phần tử đầu tiên là hành động chính
export function perform(state, target, actionId)   // → { ok, msg?, open?: 'shop'|'shed'|'house'|'board'|'gate'|'bag', fx: [{ text, color, x, y }], sound?: 'tên' }
export function buy(state, itemId, qty)            // → { ok, msg }: mua ở sạp (kiểm tra cấp, xu)
export function buyAnimal(state, type)             // → { ok, msg }: mua con non, đặt vào chuồng (kiểm tra PEN_CAP, cấp, xu)
export function sell(state, itemId, qty)           // → { ok, msg, coins }: bán nông sản/sản phẩm ở kho; qty 'all' = bán hết loại đó
export function sellAll(state)                     // → { ok, msg, coins }: bán mọi nông sản & sản phẩm (không bán vật tư/hạt)
export function buyOutfit(state, slot, index)      // slot 'hat'|'acc' → { ok, msg }
export function setLook(state, look)               // chỉ nhận mũ/phụ kiện đã có trong owned
export function fulfillOrder(state, orderId)       // → { ok, msg }
export function placeDeco(state, itemId)           // đặt đồ trang trí ngay dưới chân người chơi (ô không chắn, không phải ruộng) → { ok, msg }
export function selectSeed(state, cropId)
export { levelInfo } from './data.js'
export function clockText(state)                   // '6:30 sáng' · 'Ngày 3'
export function isNight(state)
```

### Target (thứ đang ở gần người chơi)

```js
{ kind: 'plot', idx }          // ô ruộng đã mở
{ kind: 'lockedPlot', idx }    // ô ruộng tiếp theo chưa mở (chỉ ô kế tiếp theo UNLOCK_ORDER/thứ tự idx)
{ kind: 'animal', id }
{ kind: 'egg', id }
{ kind: 'poop', id }
{ kind: 'trough', pen }        // 'chicken'|'pig'|'pasture'
{ kind: 'nest' }
{ kind: 'dog' }
{ kind: 'threat', id }
{ kind: 'building', id }       // 'house'|'board'|'shed'|'well'|'shop'|'gate' (theo layout.BUILDINGS)
```

Thứ tự mở ruộng: dùng thứ tự `idx` 0..35 lan dần ra từ góc (có thể lấy `UNLOCK_ORDER` từ bản cũ: sắp theo `max(r,c)`, rồi `min(r,c)`, rồi `r`). Bắt đầu mở 9 ô (3x3).

### Luật chơi chính (số liệu lấy trong data.js)

**Ruộng**
- Chu trình: ô mới mở là `untilled` → **Cuốc đất** → `tilled` → **Gieo hạt** (tốn 1 `seed_<id>` trong túi, theo `selectedSeed`).
- Cây lớn dần qua 5 giai đoạn (`CROP_STAGES`). Cây chỉ lớn khi `water > 0`. Có cỏ thì lớn chậm lại (×`weedSlow`), có sâu hoặc bệnh thì dừng lớn.
- **Tưới nước**: tốn 1 `can`, đặt `water` về 100. Hết nước thì ra **giếng múc nước** (building `well`).
- **Nhổ cỏ** bằng tay, không tốn gì.
- **Sâu**: **Phun thuốc trừ sâu** (chắc chắn diệt, tốn 1 `pesticide`) hoặc **Bắt sâu bằng tay** (50%, không tốn gì).
  - Sâu để lâu → cây **bệnh** (lá vàng). Bệnh để lâu → cây **chết**. Chữa bệnh bằng thuốc trừ sâu.
- **Bón phân** (`fertilizer`) và **Thuốc tăng trưởng** (`growth`) là hành động phụ.
- **Thu hoạch** khi chín: số lượng = yield (+50% nếu đã bón phân), cộng EXP.
  - Chín quá `OVERRIPE` thì cây **héo** (`rotten`).
  - Cây chết hoặc héo: **Dọn cây** (cuốc) → ô về `untilled`. Thu hoạch xong ô cũng về `untilled`.
- Ô trống (kể cả `untilled`) vẫn có thể mọc cỏ.

**Vật nuôi**
- Đói dần theo `hungerMs`. Máng còn cám thì con vật tự ăn khi đói hơn `autoEatBelow`.
  - **Đổ cám vào máng** (tốn 1 bao = `unitsPerBag` phần) hoặc **Cho ăn tận tay** (tốn 1 bao).
- Con non chỉ lớn khi `hunger > growNeedsHunger`. Đủ `grow` thì trưởng thành; có thể **Cho uống vitamin** để lớn nhanh.
- **Vuốt ve** để tăng vui.
- Đói lả quá lâu → **bệnh** → **Cho uống thuốc thú y**. Bệnh thì không lớn, không đẻ.
- Gà mái trưởng thành, no: cứ `every` lại **đẻ trứng xuống đất** tại chỗ nó đứng (`state.eggs`) → **Nhặt trứng**.
  - Trứng bỏ quên quá `eggForgetMs`: có `eggHatchChance` tự nở thành gà con.
  - **Ổ ấp** (`nest`): **Đặt trứng vào ổ ấp** → sau `nestHatchMs` nở gà con (nếu chuồng còn chỗ).
- Bò/cừu trưởng thành, no: tới giờ thì `ready = true` → **Vắt sữa** / **Xén lông**.
- Heo: ≥2 heo trưởng thành no & vui → có khả năng một con **mang bầu** → sau `pigGestation` **đẻ 1–3 heo con** (không vượt `PEN_CAP`). Heo con lớn dần.
- Con trưởng thành: **Bán** (giá `sell`), có hỏi xác nhận ở UI.

**Chó Mực**
- Chó con lớn dần khi no. **Cho chó ăn** (`dogfood`), **Vuốt ve**.
- Cứ `poopEvery` (ngẫu nhiên trong khoảng) chó **ỉa bậy** tại chỗ nó đứng → `state.poops`. Tối đa `maxPoops` bãi.
- **Xúc phân**: +2 EXP, `poopFertChance` được 1 phân bón.
- Người chơi đi giẫm lên phân (bán kính 6px): **trượt chân**, đứng hình `slipStunMs`, hiện "Eo ôi! 💩". Agent WORLD phát hiện rồi gọi `perform(state, {kind:'poop', id}, 'slip')`.
- Càng nhiều phân, vật nuôi càng mất vui (`stinkUnhappyPerPoop`).
- Chó trưởng thành, no (>40) và vui (>50) thì canh nhà: có `guardChance` đuổi được quạ/trộm.

**Quạ & thằng Tèo**
- Có ô chín mà không có bù nhìn trong vòng 5 ô: mỗi phút `crowChancePerMin` có quạ bay tới đậu ô chín. Đậu `crowEatMs` mà không bị đuổi thì ăn mất cây.
- Ban đêm, có ≥2 ô chín: mỗi phút `thiefChancePerNightMin` thằng Tèo đi vào từ `GATE_IN` tới ô chín. Hái xong (`thiefStealMs`) thì mang đi.
- Người chơi tới gần: **Đuổi quạ** / **Bắt trộm** (bắt được thì nó đền `thiefCaughtCoins`).
- Chó canh nhà có thể tự đuổi (sinh event).
- Vị trí và hướng bay/đi do agent WORLD cập nhật theo `threat.state`. LOGIC chỉ quyết định khi nào tới, ăn, về.

**Kinh tế**
- **Sạp hàng** (`shop`): hạt giống, vật tư, thức ăn, con non, đồ trang trí, mũ/phụ kiện. Chỉ hiện đồ đã đủ cấp; đồ chưa đủ cấp hiện ổ khóa.
- **Nhà kho** (`shed`): bán nông sản và sản phẩm.
- **Bảng đơn hàng** (`board`): tối đa 3 đơn của hàng xóm (NPC). Giao đơn được xu + EXP gấp `rewardMul` lần. Cứ `newEvery` có đơn mới.
- **Nhà** (`house`): tủ đồ để đổi ngoại hình (và xem thống kê).
- **Cổng** (`gate`): chỉ hiện "Sắp ra mắt: đi chợ, thăm hàng xóm".
- Lên cấp: thưởng `level × 20` xu, mở khóa đồ mới.
- **Mở rộng đất**: chạm ô `lockedPlot` kế tiếp, tốn `expandCost(n)`, cần `expandLevel(n)`.
- Thành tựu: hoàn thành thì thưởng xu, sinh event `achievement`.

### Events trả về từ `tick()`

```js
{ type: 'toast', text }                       // thông báo nổi
{ type: 'fx', text, color, x, y }             // chữ bay lên tại vị trí trên bản đồ (điểm ảnh)
{ type: 'log', text }                         // (đồng thời đã ghi vào state.log)
{ type: 'sound', name }                       // xem danh sách tên âm thanh ở phần UI
{ type: 'levelup', level }
{ type: 'achievement', id, name, coins }
{ type: 'spawn', what: 'chick'|'piglet'|'egg'|'poop'|'crow'|'thief', x, y }
```

Tên âm thanh: `click coin harvest water dig plant spray pop bark oink cluck moo baa slip levelup error eat crow`.

## API của `art.js` (agent ART)

Giữ nguyên các export đang có: `canvas, sprite, flip, paint, hash, rect, disc, fenceTile, character, SPR, icon`. Cần bổ sung:

- `SPR.soil = { untilled, tilledWet, tilledDry }` (16x16). `SPR.wild` (ô chưa mở) giữ nguyên.
- Cây trồng:
  - Giai đoạn 0 dùng `SPR.seedling`: chấm hạt trên đất.
  - Giai đoạn 1 và 2 dùng `SPR.sprout` và `SPR.grow`.
  - Giai đoạn 3 dùng `SPR.flowering`: cây ra hoa, chung cho mọi cây.
  - Giai đoạn 4 (chín) dùng `SPR.ripe[id]`.
  - Thêm `SPR.sick` (cây vàng úa), `SPR.dead` (cây chết khô), `SPR.rotten` (cây héo rũ).
- Vật nuôi: `SPR.animal[type] = { left: [f0, f1], right: [f0, f1] }` cho `ga, heo, bo, cuu, dog` (con trưởng thành).
  - Con non: `SPR.baby[type]` cùng cấu trúc (gà con vàng, heo con hồng, bê, cừu non, chó con).
  - Hiện đang thiếu heo.
- Chim và vật dưới đất:
  - `SPR.crow = { left: [f0, f1], right: [f0, f1] }` (vỗ cánh).
  - `SPR.eggGround`, `SPR.poop`, `SPR.stink: [f0, f1]` (làn khói hôi bay lên), `SPR.mud` (vũng bùn 40x22).
  - `SPR.nestEmpty`, `SPR.nestEgg`.
- Công trình còn thiếu: `SPR.well`, `SPR.board` (bảng đơn hàng gỗ, 24x24).
- Đồ trang trí: `SPR.deco = { deco_scarecrow, deco_flower, deco_lamp, deco_bench }`.
- Biểu tượng trạng thái (vẽ trong bong bóng): `SPR.status = { hungry, sick, heart, zzz, milk, wool, pregnant }` (≤ 9x9).
- Biểu tượng vật phẩm cho UI: `SPR.items[itemId]` cho mọi key trong `ITEMS`, bao gồm túi hạt từng loại (`seed_*`).
  - Thêm cả công cụ: `hand`, `hoe`, `can`, `shovel`, `basket`.
- `icon(key)` trả về dataURL, tra theo thứ tự: `SPR.items` → `SPR.ripe` → `SPR.product` → `SPR.baby`/`SPR.animal` → `SPR[key]`.
- Nhân vật: `character(look)` hỗ trợ thêm:
  - `look.hat`: 0 không, 1 nón lá, 2 mũ lưỡi trai, 3 nơ hồng, 4 vòng hoa, 5 vương miện.
  - `look.acc`: 0 không, 1 kính mát, 2 khăn quàng.
  - `look.hair`: 0 ngắn, 1 dài, 2 tóc búi/đuôi ngựa (không còn là nón lá nữa).
  - Vẫn trả về `frames[dir][frame]` (dir 0 xuống, 1 trái, 2 phải, 3 lên; 3 khung mỗi hướng; khung 16x24, chân ở hàng dưới cùng).
- Công trình đã có: `SPR.house, shed, shop, mailbox, doghouse, coop, trough, hay, signboard, tree, bush`. Có thể vẽ đẹp hơn nhưng giữ nguyên kích thước.
  - Kích thước và vị trí vẽ theo `layout.BUILDINGS` (x, y là góc trên-trái sprite).

## API của `ui.js` (agent UI)

```js
export function initUI(api)
// api = { getState(), doAction(target, actionId), changed(), newGame({ name, look }), resetGame() }
// UI gọi các hàm state.js (buy, sell, ...) trực tiếp trên api.getState(), rồi gọi api.changed().

export function showCreator()                    // màn tạo nhân vật lần đầu: tên + chỉnh ngoại hình, xem trước bằng art.character (quay 4 hướng)
export function renderHUD(state)                 // gọi mỗi ~250ms: xu, cấp, thanh EXP, ngày-giờ, thời tiết, số nước trong bình, túi hạt đang chọn, nút tốc độ
export function setTarget(target, actions, name) // gọi khi thứ ở gần thay đổi (hoặc actions đổi). actions = actionsFor(...). null = ẩn nút
export function openPanel(id)                    // 'shop'|'shed'|'house'|'board'|'gate'|'bag'|'achievements'|'settings'|'log'
export function toast(text)
export function handleEvents(events)             // toast, levelup (màn chúc mừng), achievement (huy hiệu), sound
export function isBlocking()                     // true khi đang mở bảng hoặc gõ chữ → WORLD ngừng nhận phím di chuyển
```

- **Nút hành động chính**: to, tròn, ở góc dưới phải, ghi hành động chính (icon + nhãn).
  - Phía trên là các chip hành động phụ.
  - Phím `Space`/`E` = hành động chính, phím `1`–`6` = các chip.
  - UI tự nghe phím này và gọi `api.doAction(target, id)`.
- **Thanh dưới** gồm:
  - Túi hạt: chọn loại hạt, hiện số lượng.
  - Túi đồ, Đơn hàng, Thành tựu, Nhật ký, Cài đặt.
  - Cài đặt có: tốc độ x1/x5/x20, tắt/bật âm thanh, chơi lại từ đầu có xác nhận.
- **Hướng dẫn nhanh** cho người mới theo `state.tutorial`:
  - Các bước: đi tới ruộng → cuốc → gieo → tưới → đợi chín → thu hoạch → bán ở kho → mua hạt ở sạp.
  - UI tự tăng bước theo `state.stats`.
- **Âm thanh**: `sound.js` export `play(name)` và `setMuted(bool)`. Tự tổng hợp bằng WebAudio (dao động ngắn), không dùng file âm thanh.
- Giao diện gỗ-kem ấm áp, nút to dễ bấm trên điện thoại, không tràn ngang ở màn hình 360px.
- Đọc phần an toàn vùng tai thỏ (safe area) bằng `env(safe-area-inset-*)`.

## `main.js` + `world.js` + `render.js` (agent WORLD)

- Khởi động:
  - `loadGame()` ra state thì vào chơi luôn.
  - Không có save thì `ui.showCreator()`, rồi `api.newGame()` gọi `createGame` và vào chơi.
- **Vòng lặp** (`requestAnimationFrame`):
  1. `dt` thật (giới hạn 100ms).
  2. `events = tick(state, dt * state.speed)`.
  3. Cập nhật di chuyển người chơi, AI con vật, chó, quạ/trộm.
  4. Tìm target gần nhất.
  5. Vẽ.
  6. `ui.handleEvents(events)`.
  7. Cứ 5 giây `saveGame`, và lưu khi tab bị ẩn.
- **Điều khiển**:
  - Máy tính: phím mũi tên/WASD, đi mượt theo điểm ảnh (~70 px/s), trượt dọc tường.
  - Điện thoại có hai cách:
    - **Chạm vào mặt đất**: tìm đường BFS trên lưới ô (`isSolid`), đi tới đó.
    - **Chạm vào một thứ tương tác được**: đi tới gần rồi tự làm hành động chính.
  - Có thêm **cần điều khiển ảo** (joystick) ở góc dưới trái trên màn hình cảm ứng.
- **Tầm tương tác**:
  - Ô ruộng: người chơi đứng ở ô đó hoặc 8 ô xung quanh.
  - Con vật, trứng, phân, chó, quạ/trộm: cách ≤ 20px.
  - Công trình: cách `BUILDINGS[i].at` ≤ 22px.
  - Ưu tiên thứ nằm theo hướng nhân vật đang nhìn, rồi đến thứ gần nhất.
  - Vẽ mũi tên vàng nhấp nhô (`SPR.arrow`) trên target và viền vàng (`SPR.select`) nếu target là ô ruộng.
- **`api.doAction(target, id)`**:
  1. Nhân vật quay mặt về target, đứng làm 350ms kèm thanh tiến độ nhỏ màu xanh.
  2. Gọi `perform(state, target, id)`.
  3. Hiện `fx` (chữ bay), phát `sound`. Nếu có `open` thì gọi `ui.openPanel(open)`.
- **AI**:
  - Con vật đi lang thang trong `PENS[pen].area`, dừng nghỉ ngẫu nhiên, đứng yên khi người chơi tới gần.
    - Heo thích đứng trong `MUD`. Gà thỉnh thoảng mổ thóc.
  - Chó đi lang thang cả khu đất (không vào chuồng, không vào ruộng), hay chạy theo người chơi.
  - Quạ bay thẳng (bỏ qua va chạm) từ mép bản đồ tới ô chín. Thằng Tèo đi bộ từ `GATE_IN` theo BFS.
- **Vẽ** theo thứ tự:
  1. Lớp nền tĩnh vẽ sẵn một lần: cỏ có đốm, đường đất có viền, nền ruộng, nền chuồng, bùn, hàng rào, hoa cỏ lác đác.
  2. Ô ruộng (đất phẳng).
  3. Các thứ nhô lên, sắp theo `y` chân: cây, công trình, cây trồng, con vật, trứng, phân, đồ trang trí, người chơi, NPC.
  4. Lớp phủ: bong bóng trạng thái (`SPR.bubble` + icon), mũi tên target, thanh tiến độ.
  5. Mưa (vệt chéo), màu đêm (phủ xanh đậm có độ trong suốt, đèn lồng tỏa sáng), chữ bay.
  6. Tên người chơi trên đầu.
- **Trạng thái ô ruộng thể hiện bằng hình**:
  - Đất: chưa cuốc / đã cuốc ướt / đã cuốc khô.
  - Cây theo từng giai đoạn; cỏ và sâu vẽ trực tiếp lên cây.
  - Bong bóng icon khi ô cần làm gì: giọt nước, sâu, cỏ, cây chín lấp lánh, đầu lâu hoặc lá úa khi cây bệnh.
- **Camera**: theo người chơi, không ra ngoài bản đồ. Tỉ lệ nguyên (hoặc lẻ khi `devicePixelRatio ≥ 2`) để cạnh ngắn màn hình thấy khoảng 12 ô.
- Chữ (tên, chữ bay) vẽ ở hệ tọa độ màn hình cho sắc nét, font `Nunito`.
