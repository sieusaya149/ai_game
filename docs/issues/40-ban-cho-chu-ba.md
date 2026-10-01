# 40. Bán cho lái buôn Chú Ba, heo theo cân, nghỉ hưu

## Parent

[PRD 0003](../prd/0003-phase-2-vat-nuoi.md) · ADR 0003, 0008 · User story 55–61

## What to build

- **Bán con vật cho Chú Ba:** hành động "Bán" trên con vật → Chú Ba tới cổng trại, dắt con vật đi. **Không có cảnh giết mổ.** Chú Ba cũng là cư dân làng lấy hàng ở thùng giao hàng (lát 08 đã có), nay thêm vai lái buôn.
- **Giá bán:** theo loài, giai đoạn và độ thân (❤️ cao thì giá tốt hơn). Con bệnh nặng hoặc dơ thì giá thấp hơn.
- **Heo thịt bán theo cân:** giá = **số ký × giá chợ hôm đó**. Cân nặng tăng khi **ăn no và ít vận động**, và heo nhỡ tăng cân nhanh nhất. Thêm **cân ở chuồng heo** để xem số ký của từng con; cân là đồ đặt được.
- **Bán con ❤️4 trở lên** phải xác nhận 2 lần.
- **Nghỉ hưu:** con già có thể cho nghỉ hưu, ở lại trại, **không cho sản phẩm nhưng làm cả chuồng vui hơn**, vẫn chiếm một chỗ trong chuồng. Hành động đảo ngược được hay không chốt trong bảng số liệu (mặc định không đảo ngược).
- **Hiển thị:** Chú Ba đi bộ từ cổng vào, dắt con vật theo dây, hai bên đi ra cổng; hội thoại ngắn báo giá. Trong làng, Chú Ba đứng ở chỗ cố định.
- **Online:** bán con vật chạy qua cùng luật, khách không thấy cảnh này.
- **Pixel art do agent Opus vẽ:** Chú Ba (đứng, đi, dắt dây), cái cân heo, dây dắt, bong bóng giá, biểu tượng nghỉ hưu (ghế, khăn).

## Acceptance criteria

- [ ] Unit test (seam 1): giá bán đúng theo loài/giai đoạn/độ thân; heo bán theo số ký × giá chợ hôm đó (giá chợ lấy từ lịch giá có sẵn); heo ăn no và ít vận động tăng cân nhanh hơn heo hay vận động; bán con ❤️4+ cần hai lần xác nhận, bán thiếu xác nhận bị từ chối.
- [ ] Unit test: sau khi bán, con vật rời khỏi bản lưu, xu tăng đúng, chuồng trống thêm chỗ; con nghỉ hưu không cho sản phẩm, làm vui cả chuồng, vẫn chiếm chỗ; chỉ con ở giai đoạn Già mới nghỉ hưu được.
- [ ] E2E (Playwright, desktop + 360px): dựng bản lưu có heo béo và cân → xem số ký → bán → Chú Ba tới cổng dắt heo đi, xu tăng đúng số ký × giá chợ; dựng bản lưu có bò già ❤️4 → bán thì có hai lần xác nhận; cho bò già nghỉ hưu thì bò ở lại chuồng và không còn cho sữa.
- [ ] Pixel art Chú Ba và cái cân có đủ.

## Blocked by

- [39](39-do-than.md)
