// Cấu hình e2e chạy local: Chromium ẩn, 1 luồng, server tĩnh phục vụ public/.
// Smoke (bản live) dùng playwright.smoke.config.mjs, không bật server.
import { defineConfig } from '@playwright/test';

const PORT = 4173;

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
    command: 'node scripts/static-server.mjs',
    url: `http://127.0.0.1:${PORT}`,
    env: { PORT: String(PORT) },
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
