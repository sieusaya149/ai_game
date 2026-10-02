// Các đường API HTTP JSON. Mỗi issue thêm API thì thêm route ở đây và ghi vào SPEC.md.
export function addRoutes(r) {
  // sức khỏe: Caddy/Docker/smoke gọi; `now` là giờ server (sau này cho clock.js)
  r.route('GET', '/api/health', ({ db }) => {
    db.prepare('SELECT 1').get();
    return { now: Date.now() };
  });
}
