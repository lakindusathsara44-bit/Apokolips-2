import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const repositoryRoot = process.cwd();
const appRoot = resolve(repositoryRoot, 'index-app');
const outputDirectory = resolve(repositoryRoot, 'dist', 'index');

export default defineConfig({
  root: appRoot,
  base: './',
  plugins: [react()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    assetsDir: 'assets/index-app',
    rollupOptions: {
      input: resolve(appRoot, 'index.html')
    }
  }
});
