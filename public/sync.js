// Vườn online phía trình duyệt (issue 22, ADR 0002, 0012). Trình duyệt vẫn chạy mô phỏng; ở đây chỉ lo:
// xin phiên chơi, tự gửi bản lưu lên server mỗi SAVE_MS và khi đóng trang, giữ WebSocket để nhận lệnh "lưu lần cuối rồi thoát"
// khi tài khoản đăng nhập ở máy khác, rớt mạng thì báo trạng thái, tự kết nối lại và gửi bù bản mới nhất.
// Bản nháp trên máy nằm ở DRAFT_KEY (không bao giờ đụng bản chơi đơn), để đóng trang lúc mất mạng không mất phần chưa gửi.
export const SAVE_MS = 10_000;
const RETRY_MS = 3000;
const DRAFT_KEY = 'nongtrai-online-draft';
const BEACON_MAX = 60_000;   // trình duyệt giới hạn thân request keepalive ~64 KB

const json = r => r.json().catch(() => ({}));
async function post(path, body, keepalive) {
  try {
    const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive });
    return { status: res.status, ...await json(res) };
  } catch { return { ok: false, status: 0 }; }
}

const readDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { return null; } };
const writeDraft = d => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {} };

// Xin phiên chơi cho máy này → { ok, play, farm, rev } hoặc { ok: false, status, error }.
// farm = bản nháp trên máy nếu nó nối tiếp đúng bản trên server (chưa ai ghi đè) và mới hơn, không thì vườn trên server (null = chưa có)
export async function claim(name) {
  const r = await post('/api/play', '{}');
  if (!r.ok) return { ...r, error: r.status ? r.error : 'Không kết nối được tới làng. Kiểm tra mạng rồi thử lại nhé.' };
  const d = readDraft();
  if (d?.name === name && d.rev === r.rev && d.save && d.save.savedAt > (r.farm?.savedAt ?? 0)) r.farm = d.save;
  return r;
}

// Bắt đầu đồng bộ. getSave() → bản lưu mới nhất (đã đóng dấu savedAt) hoặc null.
// onStatus(online), onKicked() (máy khác đã vào), onReject(msg) (server không nhận bản lưu).
export function startSync({ name, play, rev, getSave, onStatus, onKicked, onReject }) {
  let ws = null, wsOk = false, httpOk = true, shown = true, stopped = false, busy = false, timer = 0, retry = 0, backoff = 1000, rejected = '';
  const status = () => { const on = wsOk && httpOk; if (on !== shown) { shown = on; onStatus?.(on); } };
  const later = ms => { clearTimeout(timer); if (!stopped) timer = setTimeout(loop, ms); };
  const body = s => JSON.stringify({ play, save: s });

  // Gửi một bản lưu; trả true nếu server đã nhận
  async function push(s, keepalive) {
    if (!s) return false;
    const b = body(s), r = await post('/api/farm', b, keepalive && b.length < BEACON_MAX);
    if (r.status === 0) { httpOk = false; status(); return false; }
    httpOk = true; status();
    if (r.ok) { rev = r.rev; rejected = ''; writeDraft({ name, rev, save: s }); return true; }
    if (r.code === 'play_replaced' || r.status === 401) kicked(false);
    else if (r.error !== rejected) { rejected = r.error; onReject?.(r.error); }   // vd số liệu vô lý: báo một lần, lần sau thử tiếp
    return false;
  }
  async function loop() {
    if (stopped || busy) return later(RETRY_MS);
    busy = true;
    try { later((await push(getSave())) ? SAVE_MS : RETRY_MS); } finally { busy = false; }
  }
  // Máy khác đã vào: lưu lần cuối bằng phiên này (server còn chờ) rồi thoát. Bị từ chối (409) thì khỏi lưu
  async function kicked(final = true) {
    if (stopped) return;
    await end(final && getSave());
    onKicked?.();
  }
  // ngừng hẳn: gửi bản cuối (nếu có) rồi đóng kết nối
  async function end(final) {
    stopped = true; clearTimeout(timer); clearTimeout(retry);
    removeEventListener('online', online); removeEventListener('offline', offline);
    if (final) await push(final);
    ws?.close();
  }

  function connect() {
    clearTimeout(retry);
    if (stopped || (ws && ws.readyState <= 1)) return;   // đang mở hoặc đang kết nối
    const s = ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    s.onopen = () => s.send(JSON.stringify({ t: 'hello', play }));
    s.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'kicked') kicked();
      else if (m.t === 'hello' && m.ok) { wsOk = true; backoff = 1000; status(); later(0); }   // kết nối (lại) xong: gửi bù ngay
    };
    s.onclose = () => {
      if (ws !== s) return;
      wsOk = false; status();
      if (!stopped) { retry = setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 10_000); }
    };
  }
  // trình duyệt báo có mạng lại: kết nối lại và gửi bù ngay, khỏi chờ nhịp
  const online = () => { backoff = 1000; connect(); later(0); };
  const offline = () => { httpOk = false; status(); };   // báo mất mạng ngay, khỏi chờ lần gửi hỏng
  addEventListener('online', online);
  addEventListener('offline', offline);
  connect();
  later(SAVE_MS);

  return {
    // ghi bản nháp trên máy (main.js gọi mỗi lần lưu)
    draft(s) { if (!stopped) writeDraft({ name, rev, save: s }); },
    pushNow: () => later(0),
    // đóng trang / ẩn tab: gửi bản mới nhất bằng keepalive (vẫn đi khi trang đã đóng)
    flush() { if (!stopped) push(getSave(), true); },
    // rời vườn online (Cài đặt → Đăng xuất): gửi bản cuối rồi ngắt
    async stop(final) { if (!stopped) await end(final); },
  };
}
