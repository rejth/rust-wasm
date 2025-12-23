import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [react(), glsl(), wasm(), topLevelAwait()],
  build: {
    target: 'esnext',
  },
  server: {
    open: true,
  },
});
