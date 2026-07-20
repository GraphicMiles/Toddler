import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      // @mlc-ai/web-llm is lazy-loaded at runtime (6MB+); don't bundle it.
      external: ['@mlc-ai/web-llm'],
    },
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'],
  },
})
