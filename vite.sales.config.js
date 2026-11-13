import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: resolve(process.cwd(), 'assets/sales'),
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      input: resolve(process.cwd(), 'sales-app/src/main.jsx'),
      output: {
        entryFileNames: 'sales.js',
        chunkFileNames: 'chunk-[name].js',
        assetFileNames: asset => asset.name?.endsWith('.css') ? 'sales.css' : 'assets/[name]-[hash][extname]'
      }
    }
  }
});