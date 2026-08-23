import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const backendDirectory = path.resolve(
  process.cwd(),
  process.env.E2E_BACKEND_DIR ?? "../ecommerce-backend",
);

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: ".playwright-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "line",
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
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: "3000",
        FRONTEND_ORIGIN: "http://localhost:3001",
        SWAGGER_ENABLED: "false",
      },
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
