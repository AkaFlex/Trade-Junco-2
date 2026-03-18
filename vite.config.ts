import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: Altere para o nome EXATO do seu repositório
  base: '/Trade-Junco-2/', 
})
