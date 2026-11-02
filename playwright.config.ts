import { defineConfig, devices } from "@playwright/test";
import "./e2e/support/env";

const PORT = Number(process.env.E2E_PORT ?? 3000);

/**
 * End-to-end tests drive the real app against the Supabase project in .env.local.
 * Every test record is tagged with the run id (see e2e/support/run.ts) and removed afterwards.
 */
export default defineConfig({
  testDir: "./e2e",
  // One story across chef, admin and client: run in order, stop at the first broken step.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/.report" }]],
  outputDir: "e2e/.results",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
