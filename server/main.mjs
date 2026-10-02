// Điểm vào: `npm start` (local) và CMD của Docker. Cấu hình bằng biến môi trường:
// PORT (mặc định 4173), HOST (mặc định 127.0.0.1; container đặt 0.0.0.0), DB_FILE (mặc định ./farm.db).
import { startServer } from './index.mjs';

const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || '127.0.0.1';
const dbPath = process.env.DB_FILE || 'farm.db';

const srv = await startServer({ port, host, dbPath });
console.log(`Nông Trại Vui tại http://${host}:${srv.port} (dữ liệu: ${dbPath})`);

// Docker gửi SIGTERM khi dừng container: đóng gọn để SQLite ghi xong
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.once(sig, async () => { await srv.close(); process.exit(0); });
}
