// Art 2x (kiểu A) cho phần còn sót: nội thất trong nhà (sàn, vách, giường, tủ, bàn, bếp, thảm, cửa sổ, chậu cây, điện thoại,
// thảm chùi chân), đồ của thằng Tèo (đèn pin, giày êm), bãi phân và mùi hôi. Mỗi sprite đúng 2w×2h của sprite cũ cùng khóa,
// giữ điểm neo (đáy chạm đất ở cùng chỗ). Phong cách theo art5.characterHD: viền tối 1px (mép hứng sáng trên-trái viền nhạt
// hơn), mỗi mảng màu 4 sắc độ, sáng từ trên-trái, điểm sáng ở mặt bóng, vân gỗ / vân dệt nhẹ. Bảng màu giữ như bộ cũ.
// Mọi toạ độ trong file là điểm ảnh MỚI (gấp đôi bộ cũ).
import { canvas, flip, hash } from './art.js';

const OUT = '#3b2412';
const WOOD = ['#5c3a1a', '#8a5a2b', '#b07a45', '#e0a868'];   // như RAMP.wood của art2

// ---------- màu ----------
const PC = new Map();
function col(c) {
  let v = PC.get(c);
  if (v) return v;
  if (c[0] === '#') { const n = parseInt(c.slice(1), 16); v = [n >> 16, (n >> 8) & 255, n & 255, 255]; }
  else { const m = c.match(/[\d.]+/g).map(Number); v = [m[0], m[1], m[2], Math.round((m[3] ?? 1) * 255)]; }
  PC.set(c, v);
  return v;
}
const hex = v => '#' + v.slice(0, 3).map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
const sh = (c, f) => hex(col(c).map((n, i) => (i < 3 ? n * f : n)));
const H = (x, y) => hash(Math.floor(x), Math.floor(y));

// ---------- lớp điểm ảnh ----------
class Layer {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  ok(X, Y) { return X >= 0 && Y >= 0 && X < this.w && Y < this.h; }
  a(X, Y) { return this.ok(X, Y) ? this.d[(Y * this.w + X) * 4 + 3] : 0; }
  set(X, Y, c) {
    if (c == null || !this.ok(X, Y)) return;
    const v = col(c), i = (Y * this.w + X) * 4, d = this.d;
    if (v[3] >= 255 || d[i + 3] === 0) { d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = v[3]; return; }
    const sa = v[3] / 255, da = d[i + 3] / 255, oa = sa + da * (1 - sa);
    for (let k = 0; k < 3; k++) d[i + k] = (v[k] * sa + d[i + k] * da * (1 - sa)) / oa;
    d[i + 3] = oa * 255;
  }
  under(X, Y, c) { if (this.ok(X, Y) && this.a(X, Y) === 0) this.set(X, Y, c); }
  clear(X, Y) { if (this.ok(X, Y)) this.d.fill(0, (Y * this.w + X) * 4, (Y * this.w + X) * 4 + 4); }
  r(c, X, Y, w = 1, h = 1) { for (let y = Y; y < Y + h; y++) for (let x = X; x < X + w; x++) this.set(x, y, c); return this; }
  e(c, cx, cy, rx, ry = rx, fn) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.set(x, y, fn ? fn(x, y, dx, dy) : c);
    }
    return this;
  }
  f(fn) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const c = fn(x, y); if (c) this.set(x, y, c); } return this; }
  // viền 1px quanh phần đặc: mép trên / trái (hứng sáng) dùng màu nhạt hơn
  outline(dark = OUT, light = dark) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.a(x, y)) continue;
      const up = this.a(x, y - 1) > 127, dn = this.a(x, y + 1) > 127, lf = this.a(x - 1, y) > 127, rt = this.a(x + 1, y) > 127;
      if (!(up || dn || lf || rt)) continue;
      add.push([x, y, (dn || rt) && !up && !lf ? light : dark]);
    }
    for (const [x, y, c] of add) this.set(x, y, c);
    return this;
  }
  put(o, ox = 0, oy = 0) {
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
      const i = (y * o.w + x) * 4;
      if (!o.d[i + 3]) continue;
      this.set(x + ox, y + oy, o.d[i + 3] === 255 ? hex([o.d[i], o.d[i + 1], o.d[i + 2]]) : `rgba(${o.d[i]},${o.d[i + 1]},${o.d[i + 2]},${o.d[i + 3] / 255})`);
    }
    return this;
  }
  shadow(cx, cy, rx, ry, al = 0.3) { return this.e(null, cx, cy, rx, ry, (x, y) => { this.under(x, y, `rgba(0,0,0,${al})`); return null; }); }
  cv() {
    const c = canvas(this.w, this.h), x = c.getContext('2d'), im = x.createImageData(this.w, this.h);
    im.data.set(this.d); x.putImageData(im, 0, 0);
    return c;
  }
}
const L = (w, h) => new Layer(w, h);

// Tô khối tròn có khối sáng (trên-trái) / tối (dưới-phải). rp = [rất tối, tối, gốc, sáng, sáng nhất]
function blobs(lay, list, rp, tex = 0) {
  for (let y = 0; y < lay.h; y++) for (let x = 0; x < lay.w; x++) {
    let hit = null;
    for (const b of list) { const dx = (x + 0.5 - b[0]) / b[2], dy = (y + 0.5 - b[1]) / (b[3] ?? b[2]); if (dx * dx + dy * dy <= 1) hit = [dx, dy]; }
    if (!hit) continue;
    const [dx, dy] = hit, lit = -(dx * 0.62 + dy * 0.78) + (tex ? (H(x / 2 + 3, y / 2) - 0.5) * tex : 0), rim = dx * dx + dy * dy;
    lay.set(x, y, lit > 0.62 && rim < 0.75 ? rp[4] : lit > 0.18 ? rp[3] : lit > -0.42 ? rp[2] : rim > 0.55 && lit < -0.7 ? rp[0] : rp[1]);
  }
  return lay;
}
// Vân gỗ ngang: -1 (sẫm), 0, 1 (sáng)
const grainH = (x, y, s = 0) => { const n = H((x + H(y, s) * 23) / 5 + s * 7, y); return n < 0.13 ? -1 : n > 0.95 ? 1 : 0; };
const grainV = (x, y, s = 0) => { const n = H(x, (y + H(x, s + 3) * 19) / 6 + s * 5); return n < 0.13 ? -1 : n > 0.95 ? 1 : 0; };

// ====================================================================== trong nhà

// Sàn ván 32x32 (2 biến thể, lát liền mạch): mỗi hàng ván cao 8, khe ván 1 điểm, mối nối so le, vân gỗ, mắt gỗ ở biến thể 1.
function floorHD(v) {
  const tones = ['#a06a3a', '#a8723f', '#94603a', '#9c683a'];
  return L(32, 32).f((X, Y) => {
    const row = Y >> 3, k = Y & 7;
    if (k === 7) return '#4a2c14';
    const off = [3, 11, 7, 14][(row + v * 2) % 4] * 2;
    if (X === off) return '#4a2c14';
    const plank = row * 2 + (X > off ? 1 : 0);
    let c = tones[(plank + v * 3) % 4];
    if (v === 1 && row === 1) {   // mắt gỗ
      const d = Math.hypot((X + 0.5 - 11) / 1.3, Y + 0.5 - 11.5);
      if (d < 1.4) return '#5c3a1a';
      if (d < 2.4) return '#6b4020';
      if (d < 3.4 && (X + Y) % 2) return sh(c, 0.82);
    }
    const g = grainH(X, Y, plank + v * 9);
    if (g < 0) c = sh(c, 0.86); else if (g > 0) c = sh(c, 1.1);
    if (k === 0) c = sh(c, 1.14);
    else if (k === 1) c = sh(c, 1.05);
    else if (k === 6) c = sh(c, 0.86);
    else if (k === 5) c = sh(c, 0.94);
    if (X === off + 1 || (off === 28 && X === 0)) c = sh(c, 1.1);
    if (X === off - 1 && k < 6) return '#c08a52';
    return c;
  }).cv();
}

// Vách sau 32x64 (lát ngang liền mạch): xà gỗ trên, vách đất trát vôi vàng có rơm, nẹp ngang, chân tường ván dọc.
function wallInnerHD() {
  return L(32, 64).f((X, Y) => {
    if (Y === 0) return OUT;
    if (Y <= 5) {   // xà gỗ
      const base = Y === 1 ? '#9a6436' : Y === 2 ? '#8a5a2b' : Y === 3 ? '#7a4a22' : '#5c3a1a';
      const g = grainH(X, Y, 4);
      return g < 0 ? sh(base, 0.85) : g > 0 && Y < 4 ? sh(base, 1.12) : base;
    }
    if (Y <= 43) {   // vách đất trát vôi
      if (Y === 6) return '#bfa173';
      if (Y === 7) return '#ccb080';
      if (Y <= 9) return (X + Y) % 2 ? '#d6bb8c' : Y === 8 ? '#ccb080' : '#e2c99c';
      let c = Y > 38 ? '#e2c99c' : Y === 37 || Y === 38 ? ((X + Y) % 2 ? '#e2c99c' : '#ead4a8') : '#ead4a8';
      const n = H(X + 3, Y * 3);
      if (H(X >> 2, Y >> 1) < 0.1) c = sh(c, 0.97);
      // vết nứt nhỏ (nằm gọn trong ô, lát không đứt)
      if ((X === 21 && Y >= 15 && Y <= 18) || (X === 22 && Y >= 18 && Y <= 20) || (X === 20 && Y === 15) || (X === 23 && Y === 21)) return '#c4a676';
      // sợi rơm trong vữa
      const s = H((X >> 1) + 11, Y * 5 + 2);
      if (s < 0.04 && Y > 11 && Y < 42) return '#d8bf92';
      if (n < 0.04) return '#cdb07e';
      if (n > 0.96) return '#f6e6c4';
      return c;
    }
    if (Y === 44) return '#f0bc80';
    if (Y === 45) return '#e0a868';
    if (Y === 46) return '#b07a45';
    if (Y === 47) return '#8a5a2b';
    if (Y <= 49) return Y === 48 ? '#5c3a1a' : '#4a2c14';
    if (Y <= 59) {   // ván dọc
      const k = X % 8, b = X >> 3;
      if (k === 0) return '#5c3a1a';
      if (k === 1) return Y === 50 ? '#d89c5e' : '#b07a45';
      if (Y >= 58) return '#7a4a22';
      if (k === 7) return '#86542c';
      const g = grainV(X, Y, b);
      if (Y === 50) return '#b07a45';
      return g < 0 ? '#8a5a2b' : g > 0 ? '#a8723f' : '#9a6436';
    }
    return Y <= 61 ? '#4a2c14' : '#2e1a0c';
  }).cv();
}

// Thảm chùi chân 32x32: viền đỏ, dải vàng, đan ô cờ, tua rua hai bên, hoa vàng giữa.
function doorMatHD() {
  const m = L(32, 32);
  m.f((X, Y) => {
    if (X < 4 || X > 27 || Y < 8 || Y > 23) return null;
    const ix = X - 4, iy = Y - 8;   // 24x16
    const e = Math.min(ix, iy, 23 - ix, 15 - iy);
    if (e <= 1) return iy <= 1 || ix <= 1 ? (e === 0 ? '#d0583e' : '#b8402e') : (e === 0 ? '#8e2a20' : '#a8342a');
    if (e === 2) return iy < 8 ? '#f0d488' : '#d9b860';
    const ck = ((ix >> 2) + (iy >> 2)) % 2, wv = (ix + iy * 2) % 4 === 0;
    let c = ck ? (iy < 8 ? '#d9b860' : '#c9a24a') : (iy < 8 ? '#c9a24a' : '#a8822e');
    if (wv) c = sh(c, 0.9);
    if ((ix & 3) === 0 && (iy & 1)) c = sh(c, 1.06);
    return c;
  });
  // hoa vàng giữa thảm
  for (const [dx, dy] of [[0, -2], [-2, 0], [2, 0], [0, 2]]) m.r('#f7d547', 15 + dx, 15 + dy, 2, 2);
  m.r('#fff0a0', 15, 13, 1, 1); m.r('#d9a020', 17, 17, 1, 1);
  m.r('#b8402e', 15, 15, 2, 2);
  m.outline(OUT, '#6b3a20');
  // tua rua
  for (const fy of [9, 12, 15, 18, 21]) for (const [x0, d] of [[0, 1], [31, -1]]) {
    m.r('#f0dcae', x0 + d * 1, fy, 1, 1); m.r('#d9c08a', x0, fy, 1, 1); m.r('#e8d098', x0 + d * 2, fy, 1, 1);
    m.r('#a8822e', x0 + d * 1, fy + 1, 1, 1);
  }
  return m.cv();
}

// Giường 64x48 (sleep: có người nằm): đầu giường tiện tròn, nệm ga, gối bông, chăn hoa đỏ, chân giường.
function bedHD(sleep) {
  const W = WOOD, b = L(64, 48);
  // đầu giường
  b.f((X, Y) => {
    if (Y < 1 || Y > 13 || X < 1 || X > 62) return null;
    const post = X <= 7 || X >= 56;
    if (post) {
      const lx = X <= 7 ? X - 1 : X - 56;   // 0..6
      if (Y <= 2 && (lx === 0 || lx === 6)) return null;   // đầu trụ bo tròn
      if (lx === 0) return W[3];
      if (lx === 6) return W[0];
      if (Y <= 3) return lx < 3 ? '#f0bc80' : W[3];
      if (Y === 6 || Y === 10) return W[0];
      return lx <= 2 ? W[2] : lx === 5 ? W[1] : sh(W[2], 0.92);
    }
    if (Y >= 4 && Y <= 9 && X >= 10 && X <= 53) {   // ô pa-nô chạm
      if (Y === 4) return W[0];
      if ((X - 10) % 11 === 0) return W[0];
      if ((X - 10) % 11 === 1 || Y === 5) return sh(W[1], 0.95);
      return Y === 9 ? W[3] : grainH(X, Y, 2) < 0 ? sh(W[2], 0.88) : W[2];
    }
    if (Y === 1) return W[3];
    if (Y === 2) return '#c88e52';
    return grainH(X, Y, 1) < 0 ? sh(W[1], 0.86) : grainH(X, Y, 1) > 0 ? sh(W[1], 1.12) : W[1];
  });
  // thành giường + nệm
  b.r(W[1], 1, 14, 62, 28); b.r(W[0], 1, 41, 62, 1);
  b.r('#f3ead2', 4, 14, 56, 26);
  b.r('#c8b892', 4, 14, 56, 1); b.r('#d6c8a2', 4, 15, 56, 1);
  b.r('#e4d8b8', 56, 16, 4, 24); b.r('#d6c8a2', 59, 16, 1, 24);
  b.r(W[2], 1, 14, 3, 28); b.r(W[3], 1, 14, 1, 28); b.r(W[2], 60, 14, 3, 28); b.r(W[0], 62, 14, 1, 28);
  b.outline(OUT, '#6b4020');
  b.r(OUT, 0, 13, 64, 1);
  // gối
  const p = L(34, 14);
  p.f((X, Y) => {
    if (X < 1 || X > 32 || Y < 1 || Y > 12) return null;
    const cx = Math.min(X - 1, 32 - X), cy = Math.min(Y - 1, 12 - Y);
    if (cx + cy < 2) return null;
    if (Y >= 10 || X >= 28) return Y >= 11 || X >= 31 ? '#c8d0de' : '#dfe4ee';
    if (Y <= 2 || X <= 3) return '#ffffff';
    return (X === 16 || X === 17) && Y >= 5 && Y <= 7 ? '#c8d0de' : (X + Y * 3) % 17 === 0 ? '#eef2f8' : '#f8faff';
  }).outline(OUT, '#8a7a68');
  b.put(p, 15, 15);
  if (sleep) {   // đầu người ngủ: tóc nâu, mắt nhắm, má hồng
    const h = L(18, 13);
    h.e(null, 9, 7, 7.6, 7, (x, y, dx, dy) => {
      if (dy < -0.05 || dx < -0.84 || dx > 0.84) {   // tóc
        const lit = -(dx * 0.6 + dy * 0.8);
        return lit > 0.75 ? '#c48a52' : lit > 0.3 ? '#a06a3a' : lit > -0.2 ? '#7a4a22' : '#5c3a1a';
      }
      return dx > 0.45 || dy > 0.7 ? '#f0b088' : '#ffd7b0';
    });
    for (let y = 9; y < 13; y++) for (let x = 0; x < 18; x++) if (y >= 12) h.clear(x, y);
    h.outline(OUT, '#5c3a1a');
    // mắt nhắm (cung cong xuống), má hồng, mái tóc lòa xòa
    for (const ex of [4, 10]) { h.r(OUT, ex, 8, 1, 1); h.r(OUT, ex + 1, 9, 2, 1); h.r(OUT, ex + 3, 8, 1, 1); }
    h.r('#f4a0a8', 3, 10, 2, 1); h.r('#f4a0a8', 13, 10, 2, 1);
    h.r('#7a4a22', 7, 6, 2, 1); h.r('#5c3a1a', 10, 5, 1, 2); h.r('#e8a878', 9, 11, 1, 1);
    b.put(h, 23, 16);
  }
  // chăn hoa
  const q = L(62, 18);
  q.f((X, Y) => {
    if (X < 1 || X > 60 || Y < 1 || Y > 15) return null;
    if (Y <= 2) return Y === 1 ? '#ffffff' : '#f3ead2';
    if (Y === 3) return '#e4d8b8';
    const ix = X - 1, iy = Y - 4;
    // hoa năm cánh so le
    const fx = ((ix + (Math.floor(iy / 6) % 2) * 6) % 12) - 6, fy = (iy % 6) - 3;
    if (fx === 0 && fy === 0) return '#f7d547';
    if ((Math.abs(fx) === 1 && fy === 0) || (fx === 0 && Math.abs(fy) === 1)) return '#ffb0a0';
    if (Math.abs(fx) === 1 && Math.abs(fy) === 1) return '#ff8a7a';
    if (iy % 6 === 5 && X % 3 === 0) return '#e8604a';   // đường chần
    const lit = X < 9 || Y === 4;
    if (sleep) {   // dáng người nằm dưới chăn
      const d = ((X - 31) / 15) ** 2 + ((Y - 7) / 4.2) ** 2;
      if (d < 0.5) return Y < 6 ? '#f07a60' : '#e8604a';
      if (d < 1 && Y > 8) return '#a83224';
    }
    return lit ? '#e8604a' : X > 52 ? '#a83224' : '#cc4434';
  }).outline(OUT, '#7a2a1c');
  b.put(q, 1, 27);
  // chân giường
  b.r(OUT, 0, 42, 64, 6);
  b.r(W[2], 1, 42, 62, 2); b.r(W[3], 1, 42, 62, 1); b.r(W[0], 1, 44, 62, 2);
  for (const px of [2, 56]) { b.r(W[2], px, 42, 6, 4); b.r(W[3], px, 42, 2, 4); b.r(W[1], px + 5, 42, 1, 4); b.r(W[0], px, 46, 6, 1); }
  return b.cv();
}

// Tủ áo 48x64: mái tủ có gờ, hai cánh pa-nô vân gỗ, núm đồng, chân tiện, bóng dưới chân.
function wardrobeHD() {
  const W = WOOD, w = L(48, 64);
  w.f((X, Y) => {
    if (Y >= 1 && Y <= 9 && X >= 1 && X <= 46) {   // mái tủ
      if (Y === 1) return '#f0bc80';
      if (Y === 2) return W[3];
      if (Y === 7) return W[3];
      if (Y === 8) return W[1];
      if (Y === 9) return W[0];
      if ((Y === 5 || Y === 6) && X % 4 === 1) return W[1];   // hàng răng gờ
      return grainH(X, Y, 6) < 0 ? sh(W[2], 0.88) : W[2];
    }
    if (Y >= 10 && Y <= 55 && X >= 3 && X <= 44) {   // thân
      if (X === 23 || X === 24) return X === 23 ? OUT : '#2e1a0c';
      if (Y >= 54) return Y === 54 ? W[1] : W[0];
      const dx = X < 23 ? X - 3 : X - 25;   // 0..19 / 0..19
      if (dx === 0) return W[3];
      if (dx === 19) return W[0];
      if (Y === 10) return W[3];
      // ô pa-nô (lõm: mép trên/trái tối, mép dưới/phải sáng)
      for (const [py, ph] of [[14, 18], [37, 15]]) {
        if (dx >= 4 && dx <= 15 && Y >= py && Y < py + ph) {
          if (Y === py || dx === 4) return W[0];
          if (Y === py + ph - 1 || dx === 15) return W[3];
          if (Y === py + 1 || dx === 5) return W[1];
          return grainV(X, Y, dx > 10 ? 3 : 4) < 0 ? '#8a5a2b' : '#9a6436';
        }
      }
      const g = grainV(X, Y, X < 23 ? 1 : 2);
      return g < 0 ? sh(W[2], 0.88) : g > 0 ? sh(W[2], 1.08) : W[2];
    }
    if (Y >= 56 && Y <= 62) {   // chân tiện
      for (const lx of [5, 37]) if (X >= lx && X < lx + 6) {
        const k = X - lx, narrow = Y >= 59 && (k === 0 || k === 5);
        if (narrow) return null;
        return k <= 1 ? W[2] : k === 5 ? W[0] : W[1];
      }
    }
    return null;
  });
  w.outline(OUT, '#6b4020');
  // núm đồng
  for (const kx of [19, 27]) {
    w.r(OUT, kx, 30, 3, 5); w.r(OUT, kx - 1, 31, 5, 3);
    w.r('#c8961e', kx, 31, 3, 3); w.r('#f2c838', kx, 31, 2, 2); w.r('#fff4b0', kx, 31, 1, 1);
  }
  w.shadow(24, 62.5, 23, 2.4, 0.3);
  return w.cv();
}

// Bàn 64x40: mặt bàn hai tấm ván, khay tre, ấm sứ men lam, hai chén trà, dĩa trái cây, bóng dưới bàn.
function tableHD() {
  const W = WOOD, t = L(64, 40);
  // chân
  for (const lx of [5, 55]) t.r(W[1], lx, 24, 4, 15).r(W[2], lx, 24, 1, 15).r(W[0], lx + 3, 24, 1, 15);
  // mặt bàn + diềm
  t.f((X, Y) => {
    if (X < 1 || X > 62 || Y < 1 || Y > 27) return null;
    if (Y <= 21) {
      if (Y === 11 || Y === 21) return Y === 21 ? W[1] : '#7a4a22';
      const k = Y < 11 ? Y - 1 : Y - 12;
      if (k === 0) return '#d8a262';
      if (k === 1) return '#d09a5a';
      const g = grainH(X, Y, Y < 11 ? 1 : 2);
      let c = X < 7 ? '#c08a52' : '#b07a45';
      if (k >= 8) c = sh(c, 0.92);
      return g < 0 ? '#a06a38' : g > 0 ? '#c8925a' : c;
    }
    if (Y === 22) return W[2];
    if (Y === 27) return W[0];
    return grainH(X, Y, 5) < 0 ? sh(W[1], 0.88) : W[1];
  });
  t.outline(OUT, '#6b4020');
  for (const lx of [5, 55]) t.r(OUT, lx - 1, 39, 6, 1);
  t.shadow(32, 39, 30, 2.4, 0.25);
  // khay tre tròn
  t.e(OUT, 30, 17, 16, 4.6);
  t.e(null, 30, 17, 15, 3.6, (x, y, dx, dy) => { const r = Math.hypot(dx, dy); return r > 0.82 ? (dy < 0 ? '#e2c26a' : '#a8822e') : Math.floor(r * 5) % 2 ? '#c9a24a' : '#d6b25a'; });
  // ấm sứ
  const pot = L(26, 22);
  pot.e(null, 12, 13, 8.5, 6.5, (x, y, dx, dy) => {
    if (Math.abs(dy) < 0.18 && dy > -0.18) return dx > 0.5 ? '#2a4a8a' : '#3f6ab8';   // dải lam
    if (dy > 0.5 && (x % 3 === 0)) return '#3f6ab8';
    const lit = -(dx * 0.6 + dy * 0.8);
    return lit > 0.55 ? '#ffffff' : lit > -0.1 ? '#e6ecf4' : '#c4ccdc';
  });
  pot.r('#e6ecf4', 7, 5, 11, 2).r('#ffffff', 8, 5, 6, 1);   // nắp
  pot.r('#c4ccdc', 11, 2, 3, 3).r('#ffffff', 11, 2, 1, 1);   // núm nắp
  for (let i = 0; i < 5; i++) pot.r(i < 2 ? '#e6ecf4' : '#ffffff', 19 + i, 11 - i, 2, 2);   // vòi ấm
  pot.r('#c4ccdc', 2, 9, 2, 6).r('#e6ecf4', 1, 10, 1, 4);   // quai
  pot.outline(OUT, '#6a5a5a');
  pot.r(OUT, 7, 7, 11, 1);   // khe nắp
  pot.r('#3f6ab8', 9, 15, 1, 1).r('#3f6ab8', 13, 16, 1, 1);
  t.put(pot, 14, 0);
  // chén trà
  for (const [cx, cy] of [[37, 9], [43, 13]]) {
    const c = L(10, 9);
    c.r('#8a4a1a', 1, 1, 8, 2).r('#a8642a', 2, 1, 4, 1);   // nước trà
    c.r('#ffffff', 1, 3, 8, 3).r('#e6ecf4', 6, 3, 3, 3).r('#3f6ab8', 1, 4, 8, 1).r('#c4ccdc', 2, 6, 6, 1);
    c.outline(OUT, '#6a5a5a');
    t.put(c, cx, cy);
  }
  // dĩa trái cây
  t.e(OUT, 9, 19, 6, 2.4); t.e('#f3ead2', 9, 19, 5, 1.4);
  const fr = L(12, 8);
  fr.e(null, 3.5, 4, 3, 3, (x, y, dx, dy) => (-(dx * 0.6 + dy * 0.8) > 0.4 ? '#ff7a60' : dy > 0.4 ? '#a8241a' : '#e5452f'));
  fr.e(null, 8.5, 4.5, 2.6, 2.6, (x, y, dx, dy) => (-(dx * 0.6 + dy * 0.8) > 0.4 ? '#ffc060' : dy > 0.4 ? '#c46a10' : '#f59a23'));
  fr.outline(OUT, '#7a3a20');
  fr.r('#ffffff', 2, 2, 1, 1).r('#5c3a1a', 4, 0, 1, 1).r('#3d8c2a', 5, 0, 1, 1);
  t.put(fr, 3, 12);
  return t.cv();
}

// Bếp củi 48x48: khối gạch, miệng lò vòm có lửa, hai khúc củi, nồi gang có nắp, khói.
function stoveHD() {
  const B = ['#5e2616', '#8e4028', '#b4583a', '#d0805a'], s = L(48, 48);
  s.f((X, Y) => {
    if (X < 3 || X > 44 || Y < 19 || Y > 46) return null;
    const ix = X - 3, iy = Y - 19;
    if (iy <= 3) return iy === 0 ? '#e8a07a' : iy === 1 ? B[3] : iy === 2 ? B[2] : B[1];
    const row = Math.floor((iy - 4) / 6), k = (iy - 4) % 6;
    if (k === 5) return '#c8b49a';
    const bx = (ix + (row % 2) * 6) % 12;
    if (bx === 0) return '#c8b49a';
    if (k === 4) return '#a89478';
    let c = k === 0 ? B[3] : bx === 1 ? B[3] : ix > 34 ? B[1] : B[2];
    if (H(Math.floor((ix + (row % 2) * 6) / 12) + row * 5, 9) < 0.3 && k > 0) c = sh(c, 0.9);
    if (H(X, Y) < 0.06) c = B[1];
    return c;
  });
  s.outline(OUT, '#6b2a18');
  // miệng lò vòm + lửa
  s.f((X, Y) => {
    if (X < 12 || X > 35 || Y < 26 || Y > 46) return null;
    const ax = (X + 0.5 - 24) / 12, top = 26 + Math.round(4 * ax * ax);
    if (Y < top) return null;
    if (Y === top || X === 12 || X === 35) return OUT;
    const fx = X - 13, hgt = 7 + Math.round(H(fx >> 1, 2) * 5) + (fx > 5 && fx < 17 ? 3 : 0), t0 = 46 - hgt;
    if (Y >= t0) {
      const tt = (Y - t0) / hgt;
      if (Y >= 44) return (X + Y) % 3 ? '#f7d547' : '#e5452f';   // than hồng
      return tt < 0.2 ? '#c42e1e' : tt < 0.45 ? '#f59a23' : tt < 0.75 ? '#f7d547' : '#fff3c0';
    }
    return Y < top + 3 ? '#120a06' : '#24140a';
  });
  // củi thò ra
  for (const [lx, ly] of [[7, 42], [31, 40]]) {
    const l = L(12, 8);
    l.r('#8a5a2b', 1, 1, 10, 6).r('#a06a38', 3, 1, 8, 1).r('#5c3a1a', 3, 5, 8, 1);
    l.e('#e0a868', 2.5, 4, 1.6, 3).r('#b07a45', 2, 3, 1, 2);
    l.outline(OUT, '#5c3a1a');
    s.put(l, lx, ly);
  }
  // nồi gang
  const p = L(48, 22);
  p.e(null, 24, 13, 16, 8, (x, y, dx, dy) => { const lit = -(dx * 0.6 + dy * 0.8); return lit > 0.6 ? '#767686' : lit > 0.1 ? '#4c4c58' : lit > -0.5 ? '#3a3a44' : '#2a2a32'; });
  for (const hx of [5, 39]) p.r('#3a3a44', hx, 9, 4, 3).r('#5a5a66', hx, 9, 4, 1);
  p.outline(OUT, '#4a3a3a');
  p.e(OUT, 24, 7, 12.5, 4.2); p.e(null, 24, 7, 11.5, 3.2, (x, y, dx, dy) => (dy < -0.2 && dx < 0.3 ? '#8a8a98' : dy > 0.4 ? '#4c4c58' : '#5a5a66'));
  p.r('#aeaebe', 16, 5, 5, 1);
  p.r(OUT, 21, 0, 6, 4).r(WOOD[2], 22, 1, 4, 2).r(WOOD[3], 22, 1, 2, 1);
  s.put(p, 0, 0);
  // khói
  for (const [x, y, a] of [[32, 0, 0.55], [33, 1, 0.5], [34, 2, 0.45], [35, 3, 0.35], [30, 3, 0.3]]) s.set(x, y, `rgba(255,255,255,${a})`);
  s.shadow(24, 47, 22, 1.6, 0.3);
  return s.cv();
}

// Thảm 96x64: tua rua hai đầu, viền vàng-lam nhiều lớp, dải răng cưa, nền đỏ, hoa văn trám giữa và bốn góc.
function rugHD() {
  return L(96, 64).f((X, Y) => {
    if (X <= 3 || X >= 92) {   // tua rua
      if (Y < 4 || Y > 59) return null;
      if (Y % 3 === 2) return null;
      const fx = X <= 3 ? X : 95 - X;
      return fx === 3 ? '#c9b07a' : fx === 0 ? (Y % 3 ? '#d9c08a' : null) : Y % 3 === 0 ? '#f0dcae' : '#e0c898';
    }
    if (Y < 2 || Y > 61) return null;
    if (Y === 2 || Y === 61 || X === 4 || X === 91) return OUT;
    const ix = X - 5, iy = Y - 3;   // 0..85, 0..57
    const e = Math.min(ix, iy, 85 - ix, 57 - iy);
    if (e === 0) return '#f0c868';
    if (e === 1) return '#e0b050';
    if (e <= 3) return '#3a4a7a';
    if (e <= 6) {   // dải răng cưa
      const along = iy === e || 57 - iy === e ? ix : iy, k = e - 4;
      return ((along + (k === 1 ? 2 : 0)) % 6) < 3 - (k === 1 ? 1 : 0) ? '#e0b050' : '#3a4a7a';
    }
    if (e <= 8) return e === 7 ? '#2e3c66' : '#3a4a7a';
    if (e === 9) return '#e0b050';
    if (e === 10) return '#c09840';
    const cx = Math.abs(ix - 42.5), cy = Math.abs(iy - 28.5);
    const dmd = cx / 1.5 + cy;
    if (dmd < 2.5) return '#b83a2c';
    if (dmd < 6) return (cx + cy) < 5 && ((ix + iy) % 3 === 0) ? '#e0b050' : '#f3ead2';
    if (dmd < 8) return '#e0b050';
    if (dmd < 12.5) return Math.abs(dmd - 10.2) < 0.5 && (ix + iy) % 2 ? '#6a7ab0' : '#3a4a7a';
    if (dmd < 14.5) return '#e0b050';
    if (dmd < 15.5) return '#8e2a20';
    for (const [qx, qy] of [[14, 14], [71, 14], [14, 43], [71, 43]]) {   // hoa góc
      const ax = Math.abs(ix - qx), ay = Math.abs(iy - qy), d = ax + ay;
      if (d <= 4) return d <= 1 ? '#3a4a7a' : d === 4 ? '#8e2a20' : (ax + ay) % 2 ? '#e0b050' : '#f3ead2';
    }
    const n = H(X, Y);
    if (n < 0.05) return '#8e2a20';
    if ((X + Y * 2) % 7 === 0) return (iy < 12 || ix < 14) ? '#c44434' : '#b03a2e';
    return (iy < 12 || ix < 14) ? '#b83a2c' : '#a8342a';
  }).cv();
}

// Cửa sổ 32x32: khung gỗ, bốn ô kính trời xanh có vệt sáng, song gỗ chữ thập, rèm đỏ buộc dây, bậu cửa.
function windowHD() {
  const W = WOOD, w = L(32, 32);
  w.r(W[1], 3, 1, 26, 24).r(W[2], 3, 1, 26, 2).r(W[2], 3, 1, 2, 24).r(W[3], 3, 1, 26, 1).r(W[3], 3, 1, 1, 24).r(W[0], 28, 1, 1, 24);
  w.r(OUT, 5, 3, 22, 22);
  w.f((X, Y) => {
    if (X < 6 || X > 25 || Y < 4 || Y > 23) return null;
    const gx = X - 6, gy = Y - 4;   // 0..19
    if (gx >= 9 && gx <= 10) return null;
    if (gy >= 9 && gy <= 10) return null;
    const lx = gx % 10 - (gx >= 10 ? 1 : 0), ly = gy % 10 - (gy >= 10 ? 1 : 0);
    if (lx + ly === 2 || lx + ly === 3 || (lx + ly === 5 && lx > 1)) return '#ffffff';
    if (lx + ly === 4) return '#e4f6fe';
    if (gy < 9 && gx < 9 && ((lx - 5) ** 2 / 4 + (ly - 4) ** 2 < 1.6)) return '#f4fbff';   // mây nhỏ
    return gy < 4 ? '#c8ecfa' : gy > 15 ? '#7cc0e4' : (gy < 10 ? '#aee0f4' : '#9ed8f0');
  });
  w.r(W[2], 15, 4, 2, 20).r(W[3], 15, 4, 1, 20).r(W[2], 6, 13, 20, 2).r(W[3], 6, 13, 20, 1).r(W[3], 15, 13, 1, 1).r(W[0], 16, 15, 1, 9);
  w.outline(OUT, '#6b4020');
  // rèm hai bên
  for (const [cx, d] of [[6, 1], [24, -1]]) {
    for (let y = 4; y <= 14; y++) { w.r('#e5452f', cx, y, 2, 1); w.r(y < 8 ? '#ff8a6a' : '#f06048', d > 0 ? cx : cx + 1, y, 1, 1); }
    w.r('#f7d547', cx, 15, 2, 1);   // dây buộc
    w.r('#e5452f', cx + (d > 0 ? 0 : -1), 16, 3, 1).r('#9e2416', cx + (d > 0 ? 0 : -1), 17, 3, 1).r('#9e2416', cx + d * 2 + (d > 0 ? 0 : 0), 18, 1, 1);
  }
  // bậu cửa
  w.r(OUT, 0, 24, 32, 8);
  w.r('#f0bc80', 1, 25, 30, 1).r(W[3], 1, 26, 30, 1).r(W[2], 1, 27, 30, 1).r(W[1], 1, 28, 30, 2).r(W[0], 1, 30, 30, 1);
  for (let x = 3; x < 30; x += 7) w.r('#a06a38', x, 28, 3, 1);
  return w.cv();
}

// Chậu cây 32x48: bụi lá tròn bóng, vài lá nhọn vươn ra, hoa trắng nhuỵ vàng, chậu đất nung có vành.
function pottedPlantHD() {
  const G = ['#1e4d14', '#2f6b1f', '#3d8c2a', '#5fb33e', '#8fd65a'], p = L(32, 48);
  const lv = L(32, 36);
  // lá nhọn
  for (const [pts, c] of [
    [[[4, 14], [5, 15], [6, 16], [6, 17], [7, 18], [7, 19], [8, 20], [8, 21]], G[3]],
    [[[27, 12], [26, 13], [25, 14], [24, 16], [23, 17], [23, 18], [22, 19], [22, 20]], G[2]],
    [[[15, 0], [15, 1], [15, 2], [16, 3], [16, 4], [16, 5], [17, 6], [17, 7]], G[3]],
    [[[2, 24], [3, 24], [4, 25], [5, 25], [6, 26], [7, 27]], G[2]],
    [[[29, 22], [28, 23], [27, 24], [26, 25], [25, 26], [24, 27]], G[1]],
  ]) for (const [x, y] of pts) { lv.r(c, x, y, 2, 1); }
  blobs(lv, [[16, 13, 7.4], [10, 19.5, 6.6], [22, 19.5, 6.6], [16, 23.5, 7.4]], G, 0.5);
  // gân / mép lá chồng
  lv.f((X, Y) => {
    if (!lv.a(X, Y)) return null;
    const n = H(X / 3, Y / 3 + 7);
    return n < 0.12 && lv.a(X, Y - 1) && (X + Y) % 3 === 0 ? 'rgba(20,60,14,0.5)' : null;
  });
  lv.outline('#163a0e', '#2f5a18');
  for (const [hx, hy] of [[4, 14], [15, 0], [27, 12]]) lv.r('#a8e070', hx, hy, 1, 1);
  for (const [fx, fy] of [[12, 10], [20, 16], [14, 21]]) {   // hoa trắng
    lv.r('#ffffff', fx, fy - 1, 1, 1).r('#ffffff', fx - 1, fy, 1, 1).r('#ffffff', fx + 1, fy, 1, 1).r('#e8ecf0', fx, fy + 1, 1, 1);
    lv.r('#f7d547', fx, fy, 1, 1);
  }
  p.put(lv, 0, 0);
  // chậu đất nung
  const pot = L(32, 18);
  pot.r('#4a2c14', 10, 1, 12, 2).r('#3b2412', 10, 2, 12, 1);   // đất trong chậu
  pot.r('#c0603e', 7, 1, 18, 5).r('#e08a62', 7, 1, 18, 1).r('#d07450', 7, 2, 3, 3).r('#9e4a2e', 7, 5, 18, 1);
  pot.f((X, Y) => {
    if (Y < 7 || Y > 16) return null;
    const inset = Y >= 15 ? 1 : 0;
    if (X < 9 + inset || X > 22 - inset) return null;
    if (X <= 10 + inset) return '#d0805a';
    if (X >= 20 - inset) return '#8e4028';
    return Y === 7 ? '#8e4028' : H(X, Y) < 0.08 ? '#a04a30' : '#b4583a';
  });
  pot.outline(OUT, '#6b2a18');
  pot.r(OUT, 8, 6, 16, 1);
  p.put(pot, 0, 30);
  // đất phủ giữa lá và vành
  for (let x = 11; x <= 20; x++) if (!p.a(x, 31)) p.set(x, 31, '#4a2c14');
  p.shadow(16, 47, 12, 2.2, 0.3);
  return p.cv();
}

// Điện thoại quay số treo tường 32x60: hộp gỗ, chuông đồng, ống nghe gác ngang, mặt số tròn, dây xoắn, phích cắm.
function phoneHD() {
  const W = WOOD, p = L(32, 60);
  // thùng máy
  p.f((X, Y) => {
    if (X < 5 || X > 26 || Y < 5 || Y > 38) return null;
    if (X === 5 || Y === 5) return W[3];
    if (X === 26) return W[0];
    if (Y >= 36) return Y === 38 ? W[0] : W[1];
    if (X === 25) return W[1];
    const g = grainV(X, Y, 3);
    return g < 0 ? sh(W[2], 0.88) : g > 0 ? sh(W[2], 1.08) : W[2];
  });
  p.outline(OUT, '#6b4020');
  for (const [sx, sy] of [[7, 7], [24, 7], [7, 34], [24, 34]]) p.r('#f2c838', sx, sy, 1, 1);   // đinh vít đồng
  // chuông đồng
  p.e(OUT, 16, 13.5, 4.6, 4.2);
  p.e(null, 16, 13.5, 3.6, 3.2, (x, y, dx, dy) => (-(dx * 0.6 + dy * 0.8) > 0.5 ? '#fff4b0' : dy > 0.4 || dx > 0.5 ? '#c8961e' : '#f2c838'));
  p.r(OUT, 15, 8, 2, 1);
  // mặt số
  p.r(OUT, 8, 24, 16, 12).r('#1e3a2e', 9, 25, 14, 10).r('#2c5040', 9, 25, 14, 1);
  p.e(null, 16, 30, 4.6, 4.6, (x, y, dx, dy) => { const r = Math.hypot(dx, dy); return r > 0.8 ? '#5a5a66' : r > 0.38 ? (dy < -0.5 && dx < 0 ? '#e2e2ea' : '#c4c4d0') : '#4c4c58'; });
  for (const [dx, dy] of [[-3, -1], [-2, -3], [0, -4], [2, -3], [3, -1], [3, 1], [-3, 1], [-2, 3]]) p.r('#1e3a2e', 16 + dx, 30 + dy, 1, 1);
  p.r('#cfeaff', 16, 29, 1, 1);
  // ống nghe gác ngang
  const r = L(32, 8);
  r.r('#2e2e36', 6, 3, 20, 2).r('#4c4c58', 6, 3, 20, 1);
  for (const ex of [1, 24]) r.r('#4c4c58', ex, 1, 7, 5).r('#767686', ex, 1, 7, 1).r('#767686', ex, 1, 1, 5).r('#2e2e36', ex, 5, 7, 1);
  r.outline(OUT, '#3a3a44');
  r.r('#aeaebe', 2, 2, 1, 1).r('#aeaebe', 25, 2, 1, 1);
  p.put(r, 0, 16);
  // dây xoắn
  for (let i = 0; i < 16; i++) { const y = 40 + i, k = i % 4; p.r(k < 2 ? '#4c4c58' : '#2e2e36', 15 + (k === 1 || k === 2 ? 2 : 0), y, 2, 1); if (k === 0) p.r('#767686', 15, y, 1, 1); }
  p.r(OUT, 14, 56, 5, 4).r(W[1], 15, 56, 3, 2).r(W[2], 15, 56, 1, 1);
  return p.cv();
}

// ====================================================================== thằng Tèo

// Đèn pin 24x16 (quay trái, 2 khung nhấp nháy): chùm sáng vàng nhạt loe ra phía trước, thân kim loại có rãnh, mặt kính, nút đỏ.
function thiefTorchHD(f) {
  const t = L(24, 16);
  for (let X = 0; X <= 10; X++) {
    const h = Math.round((11 - X) / 1.5) + 2 + (f ? 2 : 0), h2 = Math.max(2, h - 2), h3 = Math.max(1, h - 5);
    for (let Y = 8 - h; Y < 8 + h; Y++) {
      const edge = Y === 8 - h || Y === 8 + h - 1;
      if (edge && (X + Y + f) % 2) continue;   // mép chùm sáng lấm tấm
      t.set(X, Y, 'rgba(255,230,120,0.3)');
    }
    for (let Y = 8 - h2; Y < 8 + h2; Y++) t.set(X, Y, 'rgba(255,244,180,0.38)');
    for (let Y = 8 - h3; Y < 8 + h3; Y++) t.set(X, Y, 'rgba(255,252,224,0.5)');
  }
  const b = L(24, 16);
  b.r('#9aa0ac', 13, 5, 10, 6).r('#d6dae2', 13, 5, 8, 1).r('#b8bcc8', 13, 6, 8, 1).r('#5e646e', 13, 10, 10, 1).r('#767c88', 22, 5, 1, 6);
  for (const gx of [16, 18]) b.r('#767c88', gx, 6, 1, 4);   // rãnh tay cầm
  b.r('#aeb4c0', 10, 3, 3, 10).r('#e2e6ee', 10, 3, 3, 1).r('#6e7480', 10, 12, 3, 1).r('#6e7480', 12, 4, 1, 8);   // đầu đèn loe
  b.outline(OUT, '#4a3a2a');
  b.r('#f2c040', 9, 5, 1, 6).r('#fff0a0', 9, 5, 1, 3).r('#ffffff', 9, 5, 1, 1);   // mặt kính
  b.r(OUT, 9, 4, 1, 1).r(OUT, 9, 11, 1, 1);
  b.r('#e5452f', 20, 6, 2, 2).r('#ff9a8a', 20, 6, 1, 1);   // nút bấm
  t.put(b);
  if (f) t.set(9, 6, 'rgba(255,255,255,0.9)');
  return t.cv();
}

// Giày êm 20x8 (quay trái): đôi giày vải mềm, chiếc sau sẫm hơn, đế mềm, đường khâu sáng.
function thiefShoesHD() {
  const s = L(20, 8);
  const back = L(20, 8);
  back.f((X, Y) => {
    if (X < 9 || X > 18 || Y < 1 || Y > 6) return null;
    if (Y === 1 && (X === 9 || X === 18)) return null;
    if (Y >= 5) return Y === 6 ? '#1c242e' : '#232c38';
    if (Y === 1) return X < 15 ? '#56687e' : '#3e4c5e';
    return X === 9 ? '#56687e' : X >= 17 ? '#2e3a4a' : '#3e4c5e';
  });
  back.outline(OUT, '#2a2420');
  back.r('#c2d0de', 12, 2, 1, 1).r('#c2d0de', 14, 2, 1, 1);
  s.put(back);
  const fr = L(20, 8);
  fr.f((X, Y) => {
    if (X < 1 || X > 12 || Y < 3 || Y > 6) return null;
    if (Y === 3 && (X <= 2 || X >= 11)) return null;
    if (Y >= 5) return Y === 6 ? '#202a36' : '#2a3442';
    if (Y === 3) return X < 8 ? '#7288a2' : '#4e6076';
    return X <= 2 ? '#7288a2' : X >= 11 ? '#3e4e62' : '#4e6076';
  });
  fr.outline(OUT, '#2a2420');
  fr.r('#c2d0de', 3, 4, 1, 1).r('#c2d0de', 5, 4, 1, 1).r('#c2d0de', 7, 4, 1, 1).r('#9aaabb', 2, 5, 1, 1);
  s.put(fr);
  return s.cv();
}

// ====================================================================== vật dưới đất

// Bãi phân 18x16: ba tầng xoắn, chóp cong, mặt bóng ướt.
function poopHD() {
  const P = ['#3b2412', '#5c3a1a', '#8a5a2b', '#a8703e', '#c8905a'], p = L(18, 16);
  blobs(p, [[9, 12.6, 8, 2.9], [8.6, 8.8, 5.6, 2.5], [9.6, 5.4, 3.6, 2.1], [9.2, 2.6, 1.6, 1.6]], P);
  // rãnh giữa các tầng
  for (let x = 3; x <= 14; x++) if (p.a(x, 10)) p.set(x, 10, x > 11 ? '#3b2412' : '#5c3a1a');
  for (let x = 6; x <= 12; x++) if (p.a(x, 7)) p.set(x, 7, x > 10 ? '#3b2412' : '#5c3a1a');
  p.outline(OUT, '#4a2c14');
  p.r('#ffffff', 5, 11, 1, 1).r('#f3e0c8', 6, 11, 1, 1).r('#ffffff', 7, 7, 1, 1).r('#f3e0c8', 9, 4, 1, 1);
  return p.cv();
}

// Mùi hôi 14x18 (2 khung): làn khí xanh uốn lượn bốc lên, nhạt dần lên trên, vài đốm nhỏ.
function stinkHD(ph) {
  const s = L(14, 18);
  for (let Y = 0; Y < 18; Y++) {
    const c = 6 + Math.round(4 * Math.sin((Y / 2 + ph * 3) * 0.9)), top = Y < 6;
    const al = top ? 0.55 + Y * 0.07 : 1;
    const A = (hx, a) => `rgba(${col(hx).slice(0, 3).join(',')},${a})`;
    s.set(c - 1, Y, A('#4fa83a', al));
    s.set(c, Y, A(top ? '#b8e07a' : '#7fc14a', al));
    s.set(c + 1, Y, A(top ? '#c8f08a' : '#9ccc5a', al));
    s.set(c + 2, Y, A('#5fae42', al * 0.85));
    if (Y % 6 === 2) s.set(c - 3, Y, A('#4fa83a', al * 0.8));
    if (Y % 6 === 5) s.set(c + 4, Y + (ph ? 0 : -1), A('#7fc14a', al * 0.7));
  }
  return s.cv();
}

// ====================================================================== xuất

function build() {
  const FLOORS = [0, 1].map(floorHD);
  const torch = [0, 1].map(thiefTorchHD), shoes = thiefShoesHD();
  return {
  // thay SPR2 (art2.js): nội thất
  floorWood: FLOORS[0],
  floors: FLOORS,
  wallInner: wallInnerHD(),
  doorMat: doorMatHD(),
  bed: bedHD(false),
  bedSleep: bedHD(true),
  wardrobe: wardrobeHD(),
  table: tableHD(),
  stove: stoveHD(),
  rug: rugHD(),
  window: windowHD(),
  pottedPlant: pottedPlantHD(),
  phone: phoneHD(),
  // thay SPR3 (art3.js): đồ thằng Tèo
  thiefTorch: { left: torch, right: torch.map(flip) },
  thiefShoes: { left: shoes, right: flip(shoes) },
  // thay SPR (art.js): vật dưới đất
  poop: poopHD(),
  stink: [0, 1].map(stinkHD),
  };
}
export const SPR13 = typeof document === 'undefined' ? {} : build();
const K2 = ['floorWood', 'floors', 'wallInner', 'doorMat', 'bed', 'bedSleep', 'wardrobe', 'table', 'stove', 'rug', 'window', 'pottedPlant', 'phone'];
export const SPR13_FROM = {
  ...Object.fromEntries(K2.map(k => [k, 'SPR2'])),
  thiefTorch: 'SPR3', thiefShoes: 'SPR3',
  poop: 'SPR', stink: 'SPR',
};
