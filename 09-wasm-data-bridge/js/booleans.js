import { instance, mem, alloc, dealloc, HEADER_SIZE } from './wasm.js';

// Writes a boolean array to the memory: JS -> WASM -> Rust
export const writeBooleanArray = (array) => {
  if (array.length === 0) {
    instance.exports.read_boolean_array(0, 0);
    return;
  }

  // Step 1: Allocate memory for array
  const byteSize = array.length; // boolean = 1 byte
  const byteOffset = alloc(byteSize);

  // Step 2: Write array to memory
  new Uint8Array(mem(), byteOffset, array.length).set(array);

  // Step 3: Call Rust with: pointer to the first byte and length of the array
  instance.exports.read_boolean_array(byteOffset, array.length);

  // Step 4: Free memory
  dealloc(byteOffset, byteSize);
};

// Reads a boolean array from the memory: Rust -> WASM -> JS
export const readBooleanArray = () => {
  // Step 1: Call Rust to get: pointer to the first byte and length of the array
  const headerPointer = instance.exports.write_boolean_vector();
  const [dataPointer, length] = new Uint32Array(mem(), headerPointer, HEADER_SIZE);

  // Step 2: Read array from memory
  const view = new Uint8Array(mem(), dataPointer, length);
  // Step 3: Convert bytes to JS array
  const data = Array.from(view).map(Boolean); // Convert 0/1 to false/true

  // Step 4: Free memory
  dealloc(dataPointer, length); // bool = 1 byte
  dealloc(headerPointer, HEADER_SIZE * 4); // usize = 4 bytes

  return data;
};
