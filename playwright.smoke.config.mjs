// Smoke trên bản live. Không bật server local.
import { defineConfig } from '@playwright/test';
import { projects } from './playwright.config.mjs';

export default defineConfig({
  testDir: 'e2e',
  testMatch: /smoke/,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: process.env.SMOKE_URL || 'https://game.huninna.com',
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: projects.slice(0, 1), // smoke ngắn: chỉ cỡ máy tính
});
