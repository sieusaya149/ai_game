# 56. Giếng 4 cấp

## Parent

[PRD 0004](../prd/0004-phase-3-cay-va-nuoc.md) · DESIGN §3.2 · ADR 0005, 0008 · User story 55–56

## What to build

Giếng thành thực thể có cấp, nâng dần để bình tưới chứa nhiều hơn.

- **4 cấp:**

  | Cấp | Tên | Bình tưới |
  |---|---|---|
  | 1 | Giếng đất | 10 lần |
  | 2 | Giếng xây | 15 lần (múc nhanh hơn) |
  | 3 | Bơm tay | 25 lần |
  | 4 | Máy bơm | 40 lần (có bồn chứa, làm ở issue 57) |

- **Nâng cấp:** tốn xu, đặt trong bảng `data`. Nâng giếng tại chỗ, giữ nguyên vị trí và hướng. Vườn cũ có giếng cấp 1. Cấp 4 chỉ dựng sẵn tên, hình và sức chứa bình; bồn và điện thuộc issue 57.
- **Luật chơi:** sức chứa bình tưới đọc từ cấp giếng; múc ở cấp 2 trở lên nhanh hơn cấp 1. Lên cấp giếng không làm mất nước đang có trong bình.
- **UI:** chạm giếng hiện cấp, sức chứa bình và nút nâng cấp có giá.
- **Pixel art do agent Opus vẽ.** Sprite cần vẽ: giếng đất, giếng xây, bơm tay, máy bơm (4 hình, nhìn khác rõ ràng).

## Acceptance criteria

- [ ] Unit test (seam 1): bình tưới chứa đúng 10 / 15 / 25 / 40 lần theo cấp giếng; nâng cấp trừ đúng xu, không đủ xu thì bị từ chối; không nâng quá cấp 4.
- [ ] Unit test: múc nước ở giếng xây nhanh hơn giếng đất; nâng cấp không làm mất nước trong bình.
- [ ] Unit test: giếng giữ nguyên cấp qua lưu và nạp.
- [ ] E2E (desktop + 360px): dựng bản lưu đủ xu → nâng giếng từ cấp 1 lên 4, mỗi cấp hình đổi và bình tưới múc được đúng số lần.

## Blocked by

- [50](50-ban-luu-v4-16-cay.md)
