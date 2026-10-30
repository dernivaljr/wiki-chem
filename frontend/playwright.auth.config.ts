import { defineConfig, devices } from '@playwright/test'

if (process.env.NODE_ENV !== 'test' || !/^wikichem_test_[a-z0-9_]+$/.test(process.env.DB_NAME ?? '') || process.env.MYSQL_TEST_ALLOW !== 'true') {
  throw new Error('Navegador integrado exige NODE_ENV=test, MYSQL_TEST_ALLOW=true e banco exclusivo wikichem_test_<sufixo>.')
}
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/auth.spec.ts', '**/admin.spec.ts', '**/search.spec.ts', '**/commerce.spec.ts', '**/checkout.spec.ts'],
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4174', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
  webServer: [
    {
      command: 'npm --prefix ../backend run build && npm --prefix ../backend run start',
      url: 'http://127.0.0.1:3002/api/v1/health',
      env: { ...process.env, HOST: '127.0.0.1', PORT: '3002', APP_ORIGIN: 'http://127.0.0.1:4174', AUTH_RATE_LIMIT_MAX: '100' },
      reuseExistingServer: false, timeout: 60000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:3002' },
      reuseExistingServer: false, timeout: 60000,
    },
  ],
})
