import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

// ARTHUR_GCAL_LINK resolution order:
//  1. process.env (local shell, or CF Pages plaintext build env var)
//  2. [vars] section in wrangler.toml (single source of truth for build +
//     runtime Functions)
function readWranglerVar(key: string): string | undefined {
  try {
    const content = readFileSync('wrangler.toml', 'utf-8')
    const varsSection = content.split(/^\[/m).find((s) => s.startsWith('vars]'))
    if (!varsSection) return undefined
    const match = varsSection.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"`, 'm'))
    return match?.[1]
  } catch {
    return undefined
  }
}

const gcalLink = process.env.ARTHUR_GCAL_LINK || readWranglerVar('ARTHUR_GCAL_LINK') || ''
console.log(
  gcalLink
    ? `[vite.config] ARTHUR_GCAL_LINK detected (len=${gcalLink.length})`
    : '[vite.config] ARTHUR_GCAL_LINK is NOT set — commute card will be disabled',
)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.ARTHUR_GCAL_LINK': JSON.stringify(gcalLink),
  },
})
