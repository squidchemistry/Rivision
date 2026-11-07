import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// End-to-end tests run against the real app, a real Postgres (DATABASE_URL) and the offline mock AI,
// so they need no API key and are deterministic. Run: npm run test:e2e
export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    timeout: 60_000,
    expect: { timeout: 15_000 },
    use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        // Seed first (demo learner, demo admin, one pending payment), then serve
        command: `npm run db:seed-demo && ${process.env.CI ? 'npm run start' : 'npm run dev'} -- -p ${PORT}`,
        url: `${baseURL}/api/health`,
        stdout: 'pipe',
        stderr: 'pipe',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
            NEXTAUTH_URL: baseURL,
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'e2e-secret-not-for-production',
            LLM_PROVIDER: 'mock',
            DEMO_MODE: 'true',
        },
    },
});
