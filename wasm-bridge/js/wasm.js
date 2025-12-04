import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.resolve(
  __dirname,
  '../target/wasm32-unknown-unknown/release/wasm_bridge.wasm',
);

const file = await fs.readFile(wasmPath);

const module = await WebAssembly.compile(file);

const instance = await WebAssembly.instantiate(module, {
  env: {
    console_log(pointer, len) {
      const mem = instance.exports.memory.buffer;
      console.log(new TextDecoder().decode(mem.slice(pointer, pointer + len)));
    },
  },
});

export const HEADER_SIZE = 2; // [pointer, length]

export const mem = () => instance.exports.memory.buffer;
export const alloc = (capacity) => instance.exports.alloc(capacity);
export const dealloc = (pointer, capacity) => instance.exports.dealloc(pointer, capacity);

export { instance };
