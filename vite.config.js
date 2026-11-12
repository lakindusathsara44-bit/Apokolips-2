import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(repositoryRoot, 'plans-app');
const outputDirectory = resolve(repositoryRoot, 'assets', 'plans');

export default defineConfig({
  root: appRoot,
  base: './',
  plugins: [react()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      input: resolve(appRoot, 'src/main.jsx'),
      output: {
        entryFileNames: 'plans.js',
        chunkFileNames: 'chunk-[name].js',
        assetFileNames: (asset) =>
          asset.name?.endsWith('.css')
            ? 'plans.css'
            : 'assets/[name]-[hash][extname]'
      }
    }
  }
});
