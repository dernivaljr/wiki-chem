import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// A origem da API é usada apenas pelo servidor de desenvolvimento.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'API_')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/v1': {
          target: env.API_PROXY_TARGET || 'http://127.0.0.1:3001',
          changeOrigin: false,
        },
      },
    },
  }
})
