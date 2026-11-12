import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(repoRoot, 'blog-app');

export default defineConfig({
  root: appRoot,
  base: '../',
  build: {
    outDir: resolve(repoRoot, 'assets', 'blog'),
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      input: [
        resolve(appRoot, 'src', 'main.js'),
        resolve(appRoot, 'src', 'blog.css')
      ],
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
