// Âm thanh tổng hợp bằng WebAudio, không dùng file.
const KEY = 'nongtrai-muted';
let ctx = null, master = null, noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem(KEY) === '1'; } catch {}

function ensure() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
// Khởi tạo khi có tương tác đầu tiên (chính sách autoplay của trình duyệt)
for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, ensure, { passive: true });

// Một nốt: tần số f trượt về f2, có đường bao âm lượng ngắn
function tone({ f, f2 = f, t = 0, d = 0.1, type = 'square', v = 0.15, lp = 0, vib = 0 }) {
  const c = ctx, t0 = c.currentTime + t;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(v, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  let out = o;
  if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); out = fl; }
  out.connect(g); g.connect(master);
  if (vib) { // rung giọng cho tiếng cừu
    const l = c.createOscillator(), lg = c.createGain();
    l.frequency.value = 26; lg.gain.value = vib;
    l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + d + 0.05);
  }
  o.start(t0); o.stop(t0 + d + 0.05);
}
// Tiếng xì/nước: nhiễu qua bộ lọc
function noise({ t = 0, d = 0.2, v = 0.15, type = 'bandpass', f = 1000, f2 = f, q = 1 }) {
  const c = ctx, t0 = c.currentTime + t;
  const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t0);
  if (f2 !== f) fl.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(v, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(fl); fl.connect(g); g.connect(master);
  s.start(t0); s.stop(t0 + d + 0.05);
}
const seq = (notes, step, o) => notes.forEach((f, i) => tone({ f, t: i * step, ...o }));

const SOUNDS = {
  click:   () => tone({ f: 720, f2: 520, d: 0.05, type: 'triangle', v: 0.14 }),
  coin:    () => { tone({ f: 988, d: 0.07, v: 0.11 }); tone({ f: 1319, t: 0.07, d: 0.22, v: 0.11 }); },
  harvest: () => seq([523, 659, 784, 1047], 0.07, { d: 0.14, type: 'triangle', v: 0.17 }),
  water:   () => { noise({ f: 1800, f2: 700, d: 0.4, v: 0.16, q: 0.8 }); tone({ f: 500, f2: 300, t: 0.05, d: 0.25, type: 'sine', v: 0.06 }); },
  dig:     () => { tone({ f: 140, f2: 55, d: 0.14, type: 'sawtooth', v: 0.22, lp: 500 }); noise({ type: 'lowpass', f: 700, d: 0.12, v: 0.2 }); },
  plant:   () => { tone({ f: 300, f2: 520, d: 0.09, type: 'sine', v: 0.2 }); tone({ f: 420, f2: 700, t: 0.09, d: 0.1, type: 'sine', v: 0.16 }); },
  spray:   () => noise({ type: 'highpass', f: 3000, d: 0.35, v: 0.13, q: 0.5 }),
  pop:     () => tone({ f: 380, f2: 950, d: 0.09, type: 'sine', v: 0.22 }),
  bark:    () => { tone({ f: 430, f2: 200, d: 0.1, type: 'sawtooth', v: 0.18, lp: 1500 }); tone({ f: 460, f2: 210, t: 0.16, d: 0.1, type: 'sawtooth', v: 0.18, lp: 1500 }); },
  oink:    () => { tone({ f: 210, f2: 130, d: 0.16, type: 'sawtooth', v: 0.17, lp: 900 }); tone({ f: 190, f2: 120, t: 0.17, d: 0.2, type: 'sawtooth', v: 0.15, lp: 900 }); },
  cluck:   () => [0, 0.1, 0.2].forEach(t => tone({ f: 700, f2: 420, t, d: 0.07, type: 'square', v: 0.1, lp: 2200 })),
  chirp:   () => [0, 0.12].forEach(t => tone({ f: 2400, f2: 3100, t, d: 0.05, type: 'sine', v: 0.06 })),
  moo:     () => tone({ f: 150, f2: 105, d: 0.75, type: 'sawtooth', v: 0.2, lp: 500 }),
  baa:     () => tone({ f: 380, f2: 320, d: 0.5, type: 'sawtooth', v: 0.15, lp: 1400, vib: 60 }),
  slip:    () => { tone({ f: 1000, f2: 200, d: 0.35, type: 'sine', v: 0.2 }); tone({ f: 90, f2: 50, t: 0.36, d: 0.15, type: 'sawtooth', v: 0.25, lp: 400 }); },
  levelup: () => { seq([523, 659, 784, 1047], 0.11, { d: 0.2, type: 'triangle', v: 0.2 }); tone({ f: 1319, t: 0.5, d: 0.5, type: 'triangle', v: 0.2 }); },
  error:   () => { tone({ f: 220, f2: 170, d: 0.13, v: 0.13 }); tone({ f: 190, f2: 140, t: 0.15, d: 0.18, v: 0.13 }); },
  eat:     () => [0, 0.09, 0.18].forEach(t => noise({ t, type: 'bandpass', f: 1200, d: 0.06, v: 0.2, q: 2 })),
  alarm:   () => { for (let i = 0; i < 3; i++) { tone({ f: 880, t: i * 0.3, d: 0.14, type: 'square', v: 0.13 }); tone({ f: 620, t: i * 0.3 + 0.15, d: 0.14, type: 'square', v: 0.13 }); } },
  crow:    () => { tone({ f: 520, f2: 300, d: 0.18, type: 'sawtooth', v: 0.14, lp: 1800 }); tone({ f: 500, f2: 280, t: 0.24, d: 0.2, type: 'sawtooth', v: 0.14, lp: 1800 }); },
};

const last = {};
export function play(name) {
  if (muted || !SOUNDS[name]) return;
  if (!ensure() || ctx.state !== 'running') return;
  const now = performance.now();
  if (now - (last[name] || 0) < 45) return; // chống chồng tiếng
  last[name] = now;
  try { SOUNDS[name](); } catch {}
}
export function setMuted(b) {
  muted = !!b;
  try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch {}
}
export const isMuted = () => muted;
