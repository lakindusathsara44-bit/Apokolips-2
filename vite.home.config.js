import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  root: process.cwd(),
  base: '/',
  plugins: [react()],
  build: {
    outDir: resolve(process.cwd(), 'assets/home'),
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      input: resolve(process.cwd(), 'src/main.jsx'),
      output: {
        entryFileNames: 'home.js',
        chunkFileNames: 'chunk-[name].js',
        assetFileNames: (asset) => asset.name?.endsWith('.css') ? 'home.css' : 'assets/[name]-[hash][extname]'
      }
    }
  }
});
