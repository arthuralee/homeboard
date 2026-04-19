import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ARTHUR_GCAL_LINK is set in the dev shell and the Cloudflare Pages build env.
// Vite only auto-exposes vars declared in `.env` files via import.meta.env, so
// we forward the shell value explicitly with `define` (runs in Node at config
// time, works for both `vite dev` and `vite build`).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.ARTHUR_GCAL_LINK': JSON.stringify(
      process.env.ARTHUR_GCAL_LINK ?? '',
    ),
  },
})
