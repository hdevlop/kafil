import { defineConfig } from "@playwright/test";

const baseURL = process.env.KAFIL_E2E_BASE_URL;
const chromeExecutable = process.env.KAFIL_E2E_CHROME_EXECUTABLE;

if (process.env.KAFIL_E2E_REMOTE_MODE !== "1") {
  throw new Error("Remote Playwright config requires guarded remote mode.");
}
if (baseURL !== "https://kafala360.ma") {
  throw new Error("Remote Playwright config requires the exact authorized demo origin.");
}
if (!chromeExecutable) {
  throw new Error("Remote Playwright config requires a verified system Chrome executable.");
}

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: "**/*.remote.ts",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  timeout: 180_000,
  expect: { timeout: 30_000 },
  workers: 1,
  outputDir: "test-results/connected-four-account-remote",
  preserveOutput: "never",
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    ignoreHTTPSErrors: false,
    launchOptions: { executablePath: chromeExecutable },
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  webServer: undefined,
});
