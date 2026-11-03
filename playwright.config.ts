import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";
import {
  backendDirectory,
  backendEnvironment,
} from "./tests/browser/support/backend-env";


// The tests run against an isolated test database. A backend already running on
// port 3000 is usually a development backend, which would silently point the
// whole suite at the development database, so it is never reused: stop it first.
// (CI starts from nothing, so nothing changes there.)
function assertBackendPortFree(port: number) {
  // Workers load this file too, after the runner has started the backend.
  if (process.env.CI || process.env.TEST_WORKER_INDEX !== undefined) return;
  const probe = `const s=require("net").connect(${port},"127.0.0.1");s.on("connect",()=>process.exit(1));s.on("error",()=>process.exit(0));`;
  try {
    execFileSync(process.execPath, ["-e", probe], { timeout: 10_000 });
  } catch {
    throw new Error(
      `Port ${port} is already in use. The smoke tests start their own backend on it ` +
        "and refuse to reuse another one, because that would run them against " +
        "your development database. Stop your development backend and run again.",
    );
  }
}
assertBackendPortFree(3000);

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: ".playwright-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "line",
  globalSetup: "./tests/browser/support/global-setup.ts",
  globalTeardown: "./tests/browser/support/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: [
    {
      command: "npm run start:prod",
      cwd: backendDirectory,
      url: "http://localhost:3000/health",
      // Never reuse a running backend (see assertBackendPortFree above).
      reuseExistingServer: false,
      timeout: 60_000,
      env: backendEnvironment(),
    },
    {
      command: "npm run start",
      url: "http://localhost:3001/products",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:3000",
      },
    },
  ],
});
