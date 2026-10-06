import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { APP_DESCRIPTION, APP_NAME } from './shared/app'

/** Fills %APP_NAME% / %APP_DESCRIPTION% placeholders in index.html from shared/app.ts. */
function appMeta(): Plugin {
  return {
    name: 'app-meta',
    transformIndexHtml: (html) =>
      html.replaceAll('%APP_NAME%', APP_NAME).replaceAll('%APP_DESCRIPTION%', APP_DESCRIPTION),
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), appMeta()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
