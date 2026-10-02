// Cấu hình e2e chạy local: Chromium ẩn, 1 luồng, server Node thật (server/main.mjs) phục vụ public/ + API + WebSocket.
// Smoke (bản live) dùng playwright.smoke.config.mjs, không bật server.
import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 4173;
// SQLite riêng cho e2e, nằm ngoài repo (lệnh quản trị trong test dùng cùng đường dẫn này)
export const E2E_DB = join(tmpdir(), 'ai-game-e2e.db');

export const projects = [
  { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  { name: 'mobile', use: { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
];

export default defineConfig({
  testDir: 'e2e',
  testIgnore: /smoke/,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects,
  webServer: {
    command: 'node --disable-warning=ExperimentalWarning server/main.mjs',
    url: `http://127.0.0.1:${PORT}/api/health`,
    env: { PORT: String(PORT), DB_FILE: E2E_DB },
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
