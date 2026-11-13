import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const repositoryRoot = process.cwd();
const appRoot = resolve(repositoryRoot, 'dev-app');
const outputDirectory = resolve(repositoryRoot, 'assets', 'dev');

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
        entryFileNames: 'dev.js',
        chunkFileNames: 'chunk-[name].js',
        assetFileNames: (asset) =>
          asset.name?.endsWith('.css')
            ? 'dev.css'
            : 'assets/[name]-[hash][extname]'
      }
    }
  }
});
