import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: process.env.KAFIL_E2E_BASE_URL ?? "https://127.0.0.1:3210",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    ignoreHTTPSErrors: true,
  },
  webServer: process.env.KAFIL_E2E_MANAGED_SERVER === "1"
    ? undefined
    : {
        command:
          "bun --env-file=../../.env run dev -- -p 3210 --experimental-https",
        cwd: ".",
        reuseExistingServer: false,
        timeout: 60_000,
      },
});
