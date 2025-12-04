import { instance, mem, alloc, dealloc, HEADER_SIZE } from './wasm.js';

// Writes an i32 array to the memory: JS -> WASM -> Rust
export const writeI32Array = (array) => {
  if (array.length === 0) {
    instance.exports.read_i32_array(0, 0);
    return;
  }

  // Step 1: Allocate memory for array
  const byteSize = array.length * 4; // i32 = 4 bytes
  const byteOffset = alloc(byteSize);

  // Step 2: Write array to memory
  new Int32Array(mem(), byteOffset, array.length).set(array);

  // Step 3: Call Rust with: pointer to the first byte and length of the array
  instance.exports.read_i32_array(byteOffset, array.length);

  // Step 4: Free memory
  dealloc(byteOffset, byteSize);
};

// Reads an i32 array from the memory: Rust -> WASM -> JS
export const readI32Array = () => {
  // Step 1: Call Rust to get: pointer to the first byte and length of the array
  const headerPointer = instance.exports.write_i32_vector();
  const [dataPointer, length] = new Uint32Array(mem(), headerPointer, HEADER_SIZE);

  // Step 2: Read array from memory
  const view = new Int32Array(mem(), dataPointer, length);
  // Step 3: Convert bytes to JS array
  const data = Array.from(view);

  // Step 4: Free memory
  dealloc(dataPointer, length * 4); // Free data (i32 = 4 bytes)
  dealloc(headerPointer, HEADER_SIZE * 4); // Free header (2 × usize)

  return data;
};
