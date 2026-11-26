import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    // em desenvolvimento, /api vai para a API local (pasta server/)
    proxy: { '/api': process.env.VITE_DEV_API_PROXY || 'http://localhost:3000' },
  },
})
