import { defineConfig } from '@playwright/test';

// Rodar: npm test   (sobe o app em modo de teste, com Firebase falso, e roda tests/*.spec.ts)
// Usa o Chrome instalado no computador (channel). Em máquina sem Chrome: PW_CHANNEL=msedge, ou
// `npx playwright install chromium` e PW_CHANNEL= (vazio).
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5199/Trade-Junco-2/',
    channel: process.env.PW_CHANNEL === undefined ? 'chrome' : (process.env.PW_CHANNEL || undefined),
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  webServer: {
    command: 'npx vite --mode test --port 5199 --strictPort',
    url: 'http://localhost:5199/Trade-Junco-2/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
