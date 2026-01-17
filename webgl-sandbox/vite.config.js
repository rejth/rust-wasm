import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [react(), glsl(), wasm()],
  build: {
    target: 'esnext',
  },
  server: {
    open: true,
  },
});
