// Màu lông chó, mèo (góp ý người chơi): dựng mọi khung hình của mọi giai đoạn, mọi dáng ở màu lông khác từ chính
// sprite gốc (art3 bộ cũ, art8 bộ 2x). Mỗi điểm ảnh lông của bộ gốc nằm trên một dải 4 sắc (tối → sáng); đổi sang
// dải màu mới ở đúng vị trí đó nên bóng, vệt sáng, kết cấu lông và viền chọn lọc của art gốc giữ nguyên.
// Lông có hoa văn (chó đốm, mèo tam thể) chọn dải màu theo một trường nhiễu cố định trên lưới của bộ cũ:
// bản 2x lấy mẫu ở tâm điểm ảnh mới nên mảng màu trùng chỗ với bản cũ, mép mảng mịn hơn một bậc.
// Dáng già (phai màu) và dáng bệnh (nhuốm xanh tái) của bộ gốc được nhận ra và dựng lại bằng đúng phép đó.
import { canvas } from './art.js';

const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mixRGB = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
const sick = c => mixRGB(c, [0xa8, 0xc0, 0x90], 0.22);   // art3/art8 sicken()

// Dải màu gốc (art3.P / art8.P) và vị trí của từng màu trên dải 0..3
const DOG = ['#111118', '#262634', '#40405a', '#6a6a88'];
const CAT = ['#8a3a0c', '#c66228', '#ec9246', '#ffc47c'];
const CREAM = ['#b49676', '#dcc29e', '#f4e2c4', '#fff8ea'];
const CAT_OLD = { to: hex('#e0c8a8'), t: 0.3 }, CREAM_OLD = { to: hex('#e8e0d4'), t: 0.25 };
// Dải đích theo màu lông. Chó Mực gốc dùng nhiều sắc tối (sắc 1 là màu thân) nên dải chó dời sáng lên một bậc.
const RAMP = {
  dogBlack: DOG,
  dogYellow: ['#9a5a1a', '#cc8632', '#e6a64c', '#f8cc7a'],
  dogWhite: ['#b4ada2', '#e2ddd3', '#f4f1ea', '#ffffff'],
  catOrange: CAT,
  catGray: ['#4e473f', '#7d7467', '#a59b89', '#d0c7b3'],
  catBlack: ['#141418', '#24242c', '#363644', '#55556a'],
  catWhite: ['#b6ac9c', '#ddd5c6', '#f3eee2', '#fffdf6'],
  cream: CREAM,
};
const STRIPE = { catOrange: '#9a4410', catGray: '#3a342d', catBlack: '#0e0e12', catWhite: '#d8cfbf' };

// Trường nhiễu giá trị (cố định, không ngẫu nhiên): 0..1, mượt theo u, v
const h2 = (i, j, s) => { const x = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return x - Math.floor(x); };
const sm = t => t * t * (3 - 2 * t);
function noise(u, v, s) {
  const i = Math.floor(u), j = Math.floor(v), fu = sm(u - i), fv = sm(v - j);
  const a = h2(i, j, s), b = h2(i + 1, j, s), c = h2(i, j + 1, s), d = h2(i + 1, j + 1, s);
  return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
}

// Mỗi màu lông: dải cho lông (fur), sọc (stripe), ngực/mõm kem (cream); pat(u, v) chọn dải theo chỗ (hoa văn)
const COATS = {
  cho: {
    vang: { fur: 'dogYellow' },
    trang: { fur: 'dogWhite' },
    dom: { fur: 'dogWhite', pat: (u, v) => (noise(u / 2.3 + 0.4, v / 2.1 + 1.3, 1) > 0.66 ? 'dogBlack' : null) },
  },
  meo: {
    muop: { fur: 'catGray' },
    den: { fur: 'catBlack', cream: 'catBlack' },
    tamthe: {
      fur: 'catWhite',
      pat: (u, v) => (noise(u / 3.4 + 0.2, v / 3 + 0.7, 2) > 0.58 ? 'catOrange' : noise(u / 3 + 5.1, v / 2.8 + 2.7, 3) > 0.6 ? 'catBlack' : null),
    },
  },
};

// Bảng nhận màu của bộ gốc: mỗi màu → { kind, pos, old, sick }
function sourceTable(sp) {
  const out = [];
  const add = (cols, kind, extra = {}) => cols.forEach((c, pos) => out.push({ rgb: hex(c), kind, pos, ...extra }));
  if (sp === 'cho') {
    add(DOG, 'fur');
    out.push({ rgb: hex('#5c5c70'), kind: 'fur', pos: 2.6 }, { rgb: hex('#4c4c5c'), kind: 'fur', pos: 2.3 });   // vệt mày
  } else {
    add(CAT, 'fur'); add(CREAM, 'cream');
    out.push({ rgb: hex('#9a4410'), kind: 'stripe' });
    add(CAT.map(c => mixRGB(hex(c), CAT_OLD.to, CAT_OLD.t)).map(rgbHex), 'fur', { old: CAT_OLD });
    add(CREAM.map(c => mixRGB(hex(c), CREAM_OLD.to, CREAM_OLD.t)).map(rgbHex), 'cream', { old: CREAM_OLD });
    out.push({ rgb: hex('#b07a48'), kind: 'stripe', old: CAT_OLD });
  }
  return [...out, ...out.map(e => ({ ...e, rgb: sick(e.rgb), sick: true }))];
}
const rgbHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
const TABLES = {};
const near = (a, b) => Math.abs(a[0] - b[0]) <= 2 && Math.abs(a[1] - b[1]) <= 2 && Math.abs(a[2] - b[2]) <= 2;

// Màu tại vị trí pos (0..3, có thể lẻ) trên dải
function rampAt(name, pos) {
  const r = RAMP[name].map(hex), i = Math.min(2, Math.floor(pos)), t = pos - i;
  return t ? mixRGB(r[i], r[i + 1], t) : r[pos];
}
function target(e, def, region) {
  let c;
  const fur = region ?? def.fur;
  if (e.kind === 'stripe') c = hex(STRIPE[fur] ?? STRIPE.catOrange);
  else if (e.kind === 'cream') c = rampAt(def.cream ?? 'cream', e.pos);
  else c = rampAt(fur, e.pos);
  if (e.old) c = mixRGB(c, e.old.to, e.old.t);
  return e.sick ? sick(c) : c;
}

// Ảnh `img` (sprite loài sp ở màu gốc) sang màu lông `coat`; k = 1 bộ cũ, 2 bộ 2x (hoa văn tính trên lưới bộ cũ)
export function recolor(img, sp, coat, k = 1) {
  const def = COATS[sp]?.[coat];
  if (!def) return img;
  const tab = TABLES[sp] ??= sourceTable(sp);
  const c = canvas(img.width, img.height), x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data, seen = new Map();
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const key = (p[i] << 16) | (p[i + 1] << 8) | p[i + 2];
    let e = seen.get(key);
    if (e === undefined) { const rgb = [p[i], p[i + 1], p[i + 2]]; e = tab.find(o => near(o.rgb, rgb)) ?? null; seen.set(key, e); }
    if (!e) continue;
    const px = (i >> 2) % c.width, py = Math.floor((i >> 2) / c.width);
    const region = def.pat ? def.pat((px + 0.5) / k, (py + 0.5) / k) : null;
    const t = target(e, def, region);
    p[i] = t[0]; p[i + 1] = t[1]; p[i + 2] = t[2];
  }
  x.putImageData(d, 0, 0);
  return c;
}
// Màu đại diện của mỗi màu lông cho nút chọn (ui.js): [màu chính, màu hoa văn hoặc null]
export const COAT_SWATCH = {
  cho: { vang: ['#d89a40', null], den: ['#262634', null], trang: ['#f4f1ea', null], dom: ['#f4f1ea', '#262634'] },
  meo: { muop: ['#8d8474', '#3a342d'], vang: ['#ec9246', '#9a4410'], den: ['#24242c', null], tamthe: ['#f3eee2', '#ec9246', '#24242c'] },
};
