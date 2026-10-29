import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Em `--mode test` o Firebase é trocado por versões falsas em memória (tests/fakes):
// nenhum dado real é lido ou gravado. O build de produção nunca usa esses arquivos.
const fake = (name: string) => path.resolve(__dirname, 'tests/fakes', name);

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // IMPORTANTE: Altere para o nome EXATO do seu repositório
  base: '/Trade-Junco-2/',
  resolve: mode === 'test' ? {
    alias: [
      { find: /^firebase\/firestore$/, replacement: fake('firestore.ts') },
      { find: /^firebase\/auth$/, replacement: fake('auth.ts') },
      { find: /^firebase\/app$/, replacement: fake('app.ts') },
    ],
  } : undefined,
}))
