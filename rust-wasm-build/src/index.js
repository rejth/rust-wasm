import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.resolve(
  __dirname,
  '../target/wasm32-unknown-unknown/release/rust_wasm_build.wasm',
);

const file = await fs.readFile(wasmPath);

const module = await WebAssembly.compile(file);

const instance = await WebAssembly.instantiate(module, {
  env: {
    console_log(ptr, len) {
      const mem = instance.exports.memory.buffer;
      console.log(new TextDecoder().decode(mem.slice(ptr, ptr + len)));
    },
  },
});

const mem = () => instance.exports.memory.buffer;

//--------------------------------
// Example 1: print "Hello, World!" using "console_log" JS function which is passed from JS to WASM environment and called from Rust module
instance.exports.say_hello();

//--------------------------------
// Example 2: pass array to Rust module and sum of array elements
// Add data to the memory
new Int32Array(mem()).set([1, 2, 3]);
// Ask to sum the elements from 0 to 3
console.log(instance.exports.sum(0, 3)); // 6

//--------------------------------
// Example 3: mutate the current array in the memory
instance.exports.add_two(0, 3);
// Ask to sum the elements from 0 to 3
console.log(instance.exports.sum(0, 3)); // 12

//--------------------------------
// Example 4: Get a vector from WASM environment
const pointer = instance.exports.get_vector();
// Add data to the memory
const header = new Uint32Array(mem(), pointer, 2);
const buffer = new Int32Array(mem(), ...header);
console.log(buffer); // Int32Array(3) [ 42, 10, -30 ]
