// Xe rùa (xe cút kít một bánh): chở con vật từ chuồng này sang chuồng khác.
// BARROW (bộ thường) và BARROW_HD (bộ 2x, đúng gấp đôi, vẽ lại chi tiết hơn chứ không phóng to), cùng khóa:
//   barrowIcon  16x16  icon cửa hàng / kho: xe rùa nhìn 3/4, thùng tôn kẽm, khung thép sơn đỏ, bánh cao su, hai càng tay nắm đen
//   barrow      { left: [khung0, khung1], right: [khung0, khung1] } 16x16: xe đẩy cạnh người khi đi, bánh xe quay giữa hai khung
//   barrowLoaded  như barrow nhưng trong thùng có bó rơm (con vật do game vẽ chồng lên trên)
// Hướng right: bánh xe ở bên phải (phía trước), tay nắm ở mép trái khoảng hàng 7-8 (ngang tay người 16x24 khi chạm đáy);
// left là ảnh lật. Bánh xe chạm hàng dưới cùng (sau viền).
// Cả hai bộ vẽ từ cùng một hàm theo toạ độ bộ thường (số lẻ .5 = một điểm 2x, chỉ hiện ở bộ 2x), viền tối 1 điểm tự dựng
// ở bước cuối (bộ 2x viền chọn lọc: mép trên / trái nhạt theo màu bên trong). Sáng từ trên trái, mỗi mảng 4 sắc độ.
// Tự đủ, không import art.js: file này có thể được nạp trong test Node (không có document) — khi đó export là null.

const DOM = typeof document !== 'undefined';

// ---------- màu ----------
const OUT = '#3b2412';
const TRAY = ['#4c535c', '#78818c', '#a3acb6', '#cfd6dc', '#f2f6f8'];   // tôn kẽm
const INSIDE = ['#23272d', '#343a42', '#4a525c'];                        // lòng thùng (khuất bóng)
const RED = ['#5c1610', '#982818', '#cc422c', '#f07858'];               // khung thép sơn đỏ
const TIRE = ['#18181e', '#2a2a32', '#44444e', '#62626e'];              // lốp cao su, tay nắm
const IRON = ['#3e4048', '#6e7280', '#a4a8b4', '#e2e4ea'];              // vành, trục
const HAY = ['#7a5a1a', '#a8822e', '#cfa544', '#e8c45a', '#f8e49a'];
const ROPE = ['#5a4026', '#8a6a40', '#b89464'];

// ---------- công cụ vẽ ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function flip(src) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.scale(-1, 1); x.drawImage(src, -src.width, 0);
  return c;
}
function hash(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const PARSE = new Map();
function rgba(c) {
  let v = PARSE.get(c);
  if (v) return v;
  const n = parseInt(c.slice(1, 7), 16);
  v = [n >> 16, (n >> 8) & 255, n & 255, c.length > 7 ? parseInt(c.slice(7, 9), 16) : 255];
  PARSE.set(c, v);
  return v;
}
const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = rgba(a), B = rgba(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };

// Lưới điểm ảnh RGBA
class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  in(X, Y) { return X >= 0 && Y >= 0 && X < this.w && Y < this.h; }
  a(X, Y) { return this.in(X, Y) ? this.d[(Y * this.w + X) * 4 + 3] : 0; }
  get(X, Y) { const i = (Y * this.w + X) * 4, d = this.d; return hex(d[i], d[i + 1], d[i + 2]); }
  put(X, Y, c) {
    if (!c || !this.in(X, Y)) return;
    const [r, g, b, a] = rgba(c), d = this.d, i = (Y * this.w + X) * 4;
    if (a >= 255 || d[i + 3] === 0) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a; return; }
    const sa = a / 255;
    for (let j = 0; j < 3; j++) d[i + j] = [r, g, b][j] * sa + d[i + j] * (1 - sa);
  }
  toCanvas() {
    const c = canvas(this.w, this.h), x = c.getContext('2d'), img = x.createImageData(this.w, this.h);
    img.data.set(this.d);
    x.putImageData(img, 0, 0);
    return c;
  }
}

// Bút vẽ theo toạ độ bộ thường (k = 1 hoặc 2). Màu là chuỗi hoặc hàm (x, y) theo tâm điểm ảnh (đơn vị bộ thường).
function pen(P, k) {
  const col = (c, X, Y) => (typeof c === 'function' ? c((X + 0.5) / k, (Y + 0.5) / k, X, Y) : c);
  const fill = (c, X0, Y0, X1, Y1) => { for (let Y = Y0; Y < Y1; Y++) for (let X = X0; X < X1; X++) P.put(X, Y, col(c, X, Y)); };
  return {
    k,
    // mảng chữ nhật: cạnh nhỏ hơn 1 đơn vị thì chỉ vẽ ở bộ 2x
    R(c, x, y, w = 1, h = 1) {
      if (k === 1 && (w < 1 || h < 1)) return;
      fill(c, Math.floor(x * k), Math.floor(y * k), Math.floor((x + w) * k), Math.floor((y + h) * k));
    },
    // elip: điểm có tâm nằm trong (cx, cy, rx, ry)
    E(c, cx, cy, rx, ry) {
      for (let Y = Math.floor((cy - ry) * k); Y < Math.ceil((cy + ry) * k); Y++) for (let X = Math.floor((cx - rx) * k); X < Math.ceil((cx + rx) * k); X++) {
        const dx = ((X + 0.5) / k - cx) / rx, dy = ((Y + 0.5) / k - cy) / ry;
        if (dx * dx + dy * dy <= 1) P.put(X, Y, col(c, X, Y));
      }
    },
    // hình thang theo hàng: từ y0 tới y1, mép trái xl(y), mép phải xr(y)
    Q(c, y0, y1, xl, xr) {
      for (let Y = Math.floor(y0 * k); Y < Math.ceil(y1 * k); Y++) {
        const y = (Y + 0.5) / k;
        if (y < y0 || y > y1) continue;
        for (let X = Math.floor(xl(y) * k); X < Math.ceil(xr(y) * k); X++) {
          const x = (X + 0.5) / k;
          if (x >= xl(y) && x <= xr(y)) P.put(X, Y, col(c, X, Y));
        }
      }
    },
    // đa giác lồi hoặc lõm: điểm có tâm nằm trong [[x, y], ...]
    G(c, pts) {
      const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]);
      for (let Y = Math.floor(Math.min(...ys) * k); Y < Math.ceil(Math.max(...ys) * k); Y++) for (let X = Math.floor(Math.min(...xs) * k); X < Math.ceil(Math.max(...xs) * k); X++) {
        const x = (X + 0.5) / k, y = (Y + 0.5) / k;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) P.put(X, Y, col(c, X, Y));
      }
    },
    // ống thẳng dày t (đơn vị bộ thường) từ (x0, y0) tới (x1, y1); bộ thường dày tối thiểu 1 điểm
    L(c, x0, y0, x1, y1, t = 1) {
      const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * k)), T = Math.max(1, Math.round(t * k));
      const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
      for (let i = 0; i <= n; i++) {
        const X = Math.floor((x0 + ((x1 - x0) * i) / n) * k), Y = Math.floor((y0 + ((y1 - y0) * i) / n) * k);
        for (let j = 0; j < T; j++) steep ? P.put(X + j, Y, col(c, X + j, Y)) : P.put(X, Y + j, col(c, X, Y + j));
      }
    },
    // điểm ảnh của bộ 2x (toạ độ 2x); bộ thường bỏ qua
    hd(fn) { if (k === 2) fn((c, X, Y, w = 1, h = 1) => fill(c, X, Y, X + w, Y + h)); },
  };
}

// Viền tối 1 điểm quanh hình. Bộ 2x: mép trên / trái nhạt theo màu bên trong.
function outline(P, sel) {
  const { w, h } = P, solid = (X, Y) => P.a(X, Y) >= 160;
  const marks = [];
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    if (solid(X, Y)) continue;
    if (!(solid(X + 1, Y) || solid(X - 1, Y) || solid(X, Y + 1) || solid(X, Y - 1))) continue;
    let c = OUT;
    if (sel && solid(X, Y + 1) && !solid(X, Y - 1)) c = mix(P.get(X, Y + 1), OUT, 0.68);
    else if (sel && solid(X + 1, Y) && !solid(X - 1, Y)) c = mix(P.get(X + 1, Y), OUT, 0.78);
    marks.push([X, Y, c]);
  }
  for (const [X, Y, c] of marks) { P.d.fill(0, (Y * w + X) * 4, (Y * w + X) * 4 + 4); P.put(X, Y, c); }
}

function make(k, draw) {
  const P = new Pix(16 * k, 16 * k);
  draw(pen(P, k));
  outline(P, k === 2);
  return P.toCanvas();
}

// ---------- chi tiết ----------
// Bánh xe: lốp cao su, vành thép, 4 nan; f = khung (0: nan thẳng +, 1: nan chéo x) để thấy bánh quay.
// rx < r cho bánh nhìn xiên (icon 3/4).
function wheel(g, cx, cy, r, f, rx = r) {
  const rot = f ? Math.PI / 4 : 0, one = g.k === 1;
  g.E((x, y) => {
    const dx = (x - cx) / rx, dy = (y - cy) / r, d = Math.hypot(dx, dy) * r, a = Math.atan2(dy, dx);
    const lit = dx + dy < -0.35, dim = dx + dy > 0.45;
    if (d > r - (one ? 0.9 : 1.1)) {                                       // lốp
      if (!one && d > r - 0.55 && Math.round(((a - rot) / (Math.PI * 2)) * 20 + 40) % 2 === 0) return TIRE[0];   // gai lốp, chạy theo khung
      return lit ? TIRE[3] : dim ? TIRE[0] : TIRE[1];
    }
    if (d < (one ? 0.6 : 0.8)) return one ? IRON[3] : dx < 0 && dy < 0 ? IRON[3] : IRON[1];   // moay-ơ
    if (!one && d > r - 1.6) return lit ? IRON[2] : IRON[1];               // vành thép (chỉ thấy ở 2x)
    const s = (((a - rot) % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);   // góc tới nan gần nhất
    if (Math.min(s, Math.PI / 2 - s) * d < (one ? 0.6 : 0.3)) return one ? IRON[2] : lit ? IRON[3] : IRON[2];   // nan
    return TIRE[2];                                                        // khe giữa nan
  }, cx, cy, rx, r);
}

// Ống thép sơn: bộ thường một màu, bộ 2x nửa trên sáng, nửa dưới tối
function tube(g, C, x0, y0, x1, y1) {
  g.L(g.k === 1 ? C[2] : C[1], x0, y0, x1, y1, 1);
  if (g.k === 2) g.L(C[2], x0, y0, x1, y1, 0.5);
}

// Thùng tôn nhìn ngang từ hơi cao: lòng thùng (vách xa sáng, đáy tối), mép cuộn gần sáng, thân hình thang
// mũi nghiêng tới trước. S = { top, rim, bot, xl, xr, bl, br }: hàng miệng xa, hàng mép gần, hàng đáy; mép trái/phải ở miệng và đáy.
function tray(g, S, load) {
  const one = g.k === 1, wall = S.top + (S.rim - S.top) * 0.45;
  g.G((x, y) => {
    if (!one && y < S.top + 0.5) return x < S.xl + 3 ? TRAY[3] : TRAY[2];   // mép xa
    if (S.rim - S.top > 1.5 && y < wall) return x > S.xr - 2.5 + (S.sk ?? 0) ? INSIDE[2] : one ? TRAY[1] : x < S.xl + 4 ? TRAY[2] : TRAY[1];   // vách xa trong lòng thùng
    return x > S.xr - 3 ? INSIDE[0] : x < S.xl + 2 ? INSIDE[2] : INSIDE[1];
  }, [[S.xl + 0.5 + (S.sk ?? 0), S.top], [S.xr - 0.5 + (S.sk ?? 0), S.top], [S.xr, S.rim], [S.xl, S.rim]]);
  if (load) load(g);
  const xl = y => S.xl + ((S.bl - S.xl) * (y - S.rim)) / (S.bot - S.rim), xr = y => S.xr + ((S.br - S.xr) * (y - S.rim)) / (S.bot - S.rim);
  g.G((x, y) => {
    const u = (x - xl(y)) / (xr(y) - xl(y)), ry = y - S.rim;
    if (ry < (one ? 1 : 0.5)) return u < 0.35 ? TRAY[4] : TRAY[3];      // mép cuộn gần
    if (!one && ry < 1) return u < 0.2 ? TRAY[3] : u > 0.85 ? TRAY[1] : TRAY[2];
    if (y > S.bot - (one ? 1 : 0.5)) return TRAY[0];                      // đáy khuất bóng
    if (u < 0.14) return TRAY[3];                                         // vách sau hứng sáng
    if (u > 0.78) return TRAY[1];                                         // mũi thùng nghiêng, tối
    if (!one && Math.abs(y - (S.rim + S.bot) / 2 - 0.4) < 0.25 && u > 0.18 && u < 0.74) return TRAY[3];   // gân dập ngang
    if (!one && hash(Math.floor(x * 2), Math.floor(y * 2) + 40) < 0.06) return TRAY[1];                     // vết xước
    return TRAY[2];
  }, [[S.xl, S.rim], [S.xr, S.rim], [S.br, S.bot], [S.bl, S.bot]]);
  g.hd(N => { for (let x = S.xl + 2.5; x < S.xr - 3; x += 3) N(TRAY[0], Math.round(x * 2), Math.round((S.rim + 1) * 2), 1, 1); });   // đinh tán
}

// Rơm lót đầy lòng thùng, mặt trên lởm chởm, cọng rơm lòi lên
function hay(g, cx, cy, rx, ry) {
  g.E((x, y, X, Y) => {
    const u = (x - cx + rx) / (2 * rx), top = y < cy - ry * 0.45;
    if (top && hash(X, Y + 90) < 0.3) return null;                        // mép trên lởm chởm
    if (g.k === 2) { const s = hash(Math.floor(X + Y * 0.6), 7); if (s < 0.16) return HAY[1]; if (s > 0.88) return HAY[4]; }   // cọng xiên
    if (u > 0.8) return HAY[1];
    if (top || u < 0.3) return HAY[3];
    return y > cy + ry * 0.3 ? HAY[1] : HAY[2];
  }, cx, cy, rx, ry);
  if (g.k === 1) for (const [dx, h] of [[-3, 1], [2, 1]]) g.R(HAY[3], cx + dx, cy - ry - h + 0.5, 1, h);
  g.hd(N => {
    const X = Math.round(cx * 2), Y = Math.round((cy - ry) * 2);
    [[-6, -1, HAY[4]], [-3, -3, HAY[2]], [1, -2, HAY[4]], [6, -2, HAY[3]], [9, -1, HAY[4]], [-10, 0, HAY[2]]].forEach(([a, b, c]) => N(c, X + a, Y + b, 1, 2));
  });
}

// ---------- xe rùa nhìn ngang, đi sang phải ----------
// Bánh (12.5, 12.5) bán kính 2.5 dưới mũi thùng; càng từ trục bánh chạy dưới đáy thùng ngược lên tay nắm ở mép trái
// (hàng 7-8, ngang tay người); chân chống sau nhấc khỏi đất vì đang đẩy.
const SIDE = { top: 4.5, rim: 6, bot: 9.5, xl: 3, xr: 15, bl: 4.5, br: 10.5 };
const AX = [12.5, 12.5], GRIP = [0.3, 8.3];
function side(f, loaded) {
  return g => {
    // càng xa, chân xa (khuất sau, tối)
    g.L(RED[0], 12, 11, 2, 7.3, 1);
    g.L(TIRE[0], GRIP[0] + 0.5, GRIP[1] - 1, GRIP[0] + 2.5, GRIP[1] - 0.4, 1);
    if (g.k === 2) g.L(RED[0], 7.5, 9.5, 7.5, 12.5, 1);
    wheel(g, AX[0], AX[1], 2.5, f);
    // càng gần, chân chống gần có đế
    tube(g, RED, AX[0], AX[1] - 0.5, GRIP[0] + 2, GRIP[1] + 0.6);
    tube(g, RED, 5.5, 9.5, 5, 13.5);
    g.R(RED[1], 4, 13.5, 2.5, 1); g.R(RED[3], 4, 13.5, 2.5, 0.5);
    // tay nắm cao su
    g.L(TIRE[1], GRIP[0], GRIP[1], GRIP[0] + 2.5, GRIP[1] + 0.7, 1);
    g.hd(N => N(TIRE[3], 1, 16, 3, 1));
    tray(g, SIDE, loaded ? q => hay(q, 8.5, 4.8, 5.8, 1.6) : null);
    g.R(IRON[3], 12, 12, 1, 1);                                           // đầu trục
    g.hd(N => { N(IRON[2], 24, 24, 2, 2); N(IRON[3], 24, 24, 1, 1); });
  };
}

// ---------- icon 3/4: nhìn cao hơn, thấy rõ lòng thùng, hai càng, hai chân ----------
const ICON = { top: 2.5, rim: 6.5, bot: 10, xl: 1.5, xr: 14.5, bl: 4, br: 10.5, sk: 1 };
function icon() {
  return g => {
    // càng xa và tay nắm xa (lệch lên trên), chân xa
    g.L(RED[1], 12.5, 11, 2.5, 6, 1);
    g.L(TIRE[0], 0.3, 5.4, 2.8, 6.3, 1);
    g.L(RED[0], 8, 10, 8.5, 13, 1);
    wheel(g, AX[0], AX[1], 2.5, 0, 2);
    tube(g, RED, AX[0], AX[1] - 0.5, 2.5, 9);
    g.L(TIRE[1], 0.3, 8.3, 2.8, 9.1, 1);
    g.hd(N => { N(TIRE[3], 1, 16, 3, 1); N(TIRE[2], 1, 10, 3, 1); });
    tube(g, RED, 5.5, 10, 5, 13.5);
    g.R(RED[1], 4, 13.5, 2.5, 1); g.R(RED[3], 4, 13.5, 2.5, 0.5);
    tray(g, ICON, null);
    g.R(IRON[3], 12, 12, 1, 1);
  };
}

function build(k) {
  const pair = loaded => {
    const right = [0, 1].map(f => make(k, side(f, loaded)));
    return { left: right.map(flip), right };
  };
  return { barrowIcon: flip(make(k, icon())), barrow: pair(false), barrowLoaded: pair(true) };
}

export const BARROW = DOM ? build(1) : null;
export const BARROW_HD = DOM ? build(2) : null;
