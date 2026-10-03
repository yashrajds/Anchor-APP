import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const emitSourcemaps = mode === 'development'

  return {
    base: process.env.ANCHOR_PUBLIC_URL ? `${process.env.ANCHOR_PUBLIC_URL}/` : '/',
    build: {
      sourcemap: emitSourcemaps ? 'inline' : false,
      minify: !emitSourcemaps,
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      host: process.env.ANCHOR_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
      strictPort: true,
      watch: { ignored: ['**/.figma/**'] },
    },
    preview: {
      host: process.env.ANCHOR_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
    },
  }
})
