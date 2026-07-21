import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['@mlc-ai/web-llm'],
    },
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'],
  },
})
