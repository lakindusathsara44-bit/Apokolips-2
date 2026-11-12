import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(repoRoot, 'blog-app');

export default defineConfig({
  root: appRoot,
  base: './',
  publicDir: resolve(appRoot, 'public'),
  build: {
    outDir: resolve(repoRoot, 'assets', 'blog'),
    emptyOutDir: true,
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      input: resolve(appRoot, 'src', 'main.js'),
      external: ['react', 'react-dom/client', '@supabase/supabase-js'],
      output: {
        format: 'es',
        entryFileNames: 'blog.js',
        chunkFileNames: 'chunk-[name].js',
        assetFileNames: asset => asset.name?.endsWith('.css') ? 'blog.css' : '[name]-[hash][extname]'
      }
    }
  }
});
