import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const appRoot = resolve(repoRoot, 'community-app');

export default defineConfig({
  root: appRoot,
  base: './',
  plugins: [react()],
  build: {
    outDir: repoRoot,
    emptyOutDir: false,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      input: resolve(appRoot, 'Community.chat.html'),
      output: {
        entryFileNames: 'assets/community/community.js',
        chunkFileNames: 'assets/community/chunk-[name].js',
        assetFileNames: (asset) => asset.name?.endsWith('.css')
          ? 'assets/community/community.css'
          : 'assets/community/[name]-[hash][extname]'
      }
    }
  }
});
