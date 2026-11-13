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
    assetsDir: 'assets/index-app',
    rollupOptions: {
      input: resolve(process.cwd(), 'index.html')
    }
  }
});
