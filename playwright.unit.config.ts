import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/unit",
  outputDir: ".playwright-results-unit",
  fullyParallel: true,
  workers: 1,
  reporter: "line",
});
