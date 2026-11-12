import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(repositoryRoot, 'blog-app');

export default defineConfig({
  root: appRoot,
  base: './',
  plugins: [react()],
  build: {
    outDir: repositoryRoot,
    emptyOutDir: false,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      input: resolve(appRoot, 'blog.html'),
      output: {
        entryFileNames: 'assets/blog/blog.js',
        chunkFileNames: 'assets/blog/chunk-[name].js',
        assetFileNames: (asset) => asset.name?.endsWith('.css')
          ? 'assets/blog/blog.css'
          : 'assets/blog/[name]-[hash][extname]'
      }
    }
  }
});
