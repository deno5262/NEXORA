import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
const extra = ['manifest.webmanifest','offline.html','sw.js','icon-192.png','icon-512.png','icon-maskable-512.png','logo.png']
export default defineConfig({ plugins: [react(), { name: 'copy-pwa-files', closeBundle() { for (const f of extra) fs.copyFileSync(f, 'dist/' + f) } }] })
