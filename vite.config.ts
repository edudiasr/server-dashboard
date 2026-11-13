/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Em desenvolvimento o Vite repassa as chamadas pras duas APIs, então o navegador só fala com
// uma origem (igual ao Nginx do docker-compose em produção) e não precisa de CORS.
const MONITOR = process.env.MONITOR_URL ?? 'http://localhost:9105'
const RANKING = process.env.RANKING_URL ?? 'http://localhost:8000'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // `vite build --mode demo` (versão do GitHub Pages) liga os dados de demonstração
  define: mode === 'demo' ? { 'import.meta.env.VITE_DEMO': JSON.stringify('1') } : {},
  base: './', // funciona tanto na raiz quanto em /server-dashboard/ no GitHub Pages
  server: {
    proxy: {
      '/api/monitor': { target: MONITOR, rewrite: (p) => p.replace(/^\/api\/monitor/, '') },
      '/api/ranking': { target: RANKING, rewrite: (p) => p.replace(/^\/api\/ranking/, '') },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}))
