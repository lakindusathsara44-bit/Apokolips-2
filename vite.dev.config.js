import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  root: '.',
  base: './',
  plugins: [react()],
  build: {
    outDir: '.',
    emptyOutDir: false,
    assetsDir: 'assets/dev',
    rollupOptions: {
      input: resolve(process.cwd(), 'dev.html'),
      output: {
        entryFileNames: 'assets/dev/dev.js',
        chunkFileNames: 'assets/dev/chunk-[name]-[hash].js',
        assetFileNames: 'assets/dev/dev[extname]'
      }
    }
  }
});
