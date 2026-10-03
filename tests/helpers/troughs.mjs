// Máng theo chuồng: id chuồng đầu tiên của loại `type`; chưa có chuồng loại đó thì đặt một chuồng (cấp cao, đủ xu, đất rộng).
export function penIdOf(G, s, type) {
  let p = G.mapOf(s).pens[type];
  if (!p) {
    s.exp = Math.max(s.exp, 1e6); s.coins = Math.max(s.coins, 1e6);
    s.farm.owned = { c: 10, r: 8, w: 50, h: 38 }; s.farm.rev++; G.bumpLayout?.(s);
    outer: for (let r = 10; r < 40; r += 2) for (let c = 14; c < 56; c += 2) if (G.placeEntity(s, { kind: 'pen', pen: type }, c, r).ok) break outer;
    p = G.mapOf(s).pens[type];
  }
  return p.id;
}
