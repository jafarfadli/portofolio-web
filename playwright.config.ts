import { defineConfig, devices } from "@playwright/test";

const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } };
// What `tailscale serve` adds for the owner. scripts/e2e-serve.sh starts the admin with the same login.
const admin = { ...desktop, baseURL: "http://127.0.0.1:3101", extraHTTPHeaders: { "Tailscale-User-Login": "owner@e2e.test" } };

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:3100" },
  webServer: {
    command: "pnpm e2e:serve",
    url: "http://127.0.0.1:3101/api/health", // the admin starts last, so both are up
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", testIgnore: /admin-.*\.spec\.ts/, use: desktop },
    // Admin specs edit content, so they run after the public specs have finished with the seeded data.
    { name: "admin-setup", testMatch: /admin-setup\.spec\.ts/, dependencies: ["chromium"], use: admin },
    { name: "admin", testMatch: /admin-(?!setup|article).*\.spec\.ts/, dependencies: ["admin-setup"], use: admin },
    // It edits the projects the other admin specs edit (a saved form is the whole row), so it runs once they are done.
    { name: "admin-article", testMatch: /admin-article\.spec\.ts/, dependencies: ["admin"], use: admin },
  ],
});
