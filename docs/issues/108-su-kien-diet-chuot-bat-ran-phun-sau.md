# 108. Sự kiện diệt chuột, bắt rắn, phun sâu

## Parent

[PRD 0005](../prd/0005-phase-4-kinh-te-lang-loai-moi.md) · DESIGN §8.6 (Sự kiện cả làng) · ADR 0019, 0004 · User story 158–160

**Model gợi ý:** Sonnet

## What to build

- **2 lần mỗi tuần thật**, rơi vào một khung chợ phiên, **báo trước ~1 giờ**, kéo dài **20 phút** (1 ngày game). Mỗi lần một loại: **nạn chuột, nạn rắn, dịch sâu** (lịch issue 68, thanh tiến độ chung issue 99). **Diệt ở vườn mình và vườn bạn** (sang vườn bạn diệt giúp, nhất là vườn người offline), cộng vào thanh tiến độ chung. Số liệu: lấy từ bảng số liệu đợt (issue 95).
- **Con sót lại chỉ gây hại nhẹ** cho chính vườn đó (chuột ăn vài món trong kho, rắn ăn 1–2 trứng, sâu làm vài ô bị bệnh); **không bao giờ chết con vật hay mất cả ruộng**; vườn người offline chỉ bị hại tối đa một nửa. Đủ chỉ tiêu (theo số người) thì mọi người có mặt được thưởng, diệt nhiều / diệt giúp được thêm, người đứng đầu nhận cúp nhỏ.
- **UI:** banner báo trước, thanh tiến độ chung, mục tiêu trong vườn. Hình tạm tới khi issue ART 109/110 gộp; khi phát hành không dùng chung hình giai đoạn.

## Acceptance criteria

- [ ] Unit test (seam 1): lịch 2 lần mỗi tuần thật rơi vào khung chợ phiên, cùng hạt giống thì cùng kết quả; hại của con sót đúng mức và không bao giờ giết con vật hay mất cả ruộng; vườn offline hại tối đa một nửa.
- [ ] Unit test (seam 3): diệt ở vườn mình và vườn bạn cộng đúng vào thanh chung, phát cho mọi người; tổng kết và phát thưởng đúng một lần; chỉ tiêu theo số người.
- [ ] E2E (desktop + 360px, hai trình duyệt): người một diệt chuột ở vườn người hai (đang offline hoặc online), thanh chung tăng, hết sự kiện thấy thưởng.
- [ ] Không thêm hook test vào game.
- [ ] Chỉ chạy các spec e2e liên quan tới issue này, không chạy cả bộ.

## Blocked by

- [99](99-trang-thai-chung-cua-lang-tren-server.md)
