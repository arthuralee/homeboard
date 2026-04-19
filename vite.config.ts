import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ARTHUR_GCAL_LINK is set in the dev env and Cloudflare Pages build env;
  // exposing the ARTHUR_ prefix lets the client read it via import.meta.env.
  envPrefix: ['VITE_', 'ARTHUR_'],
})
