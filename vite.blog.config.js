import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(repositoryRoot, 'blog-app');

export default defineConfig({
  root: appRoot,
  base: './',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: resolve(repositoryRoot, 'dist', 'blog'),
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      input: {
        blog: resolve(appRoot, 'index.html')
      },
      output: {
        entryFileNames: 'assets/blog/blog.js',
        chunkFileNames: 'assets/blog/chunk-[name].js',
        assetFileNames: 'assets/blog/blog[extname]'
      }
    }
  }
});
