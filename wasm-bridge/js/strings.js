import { instance, mem, alloc, dealloc, HEADER_SIZE } from './wasm.js';

/// Writes a string to the memory: JS -> WASM -> Rust
export const writeString = (string) => {
  // Step 1: Encode string to bytes
  const bytes = new TextEncoder().encode(string);

  if (bytes.length === 0) {
    instance.exports.read_string(0, 0);
    return;
  }

  // Step 2: Allocate memory for bytes
  const byteOffset = alloc(bytes.length);

  // Step 3: Write bytes to memory
  new Uint8Array(mem(), byteOffset, bytes.length).set(bytes);

  // Step 4: Call Rust with: pointer to the first byte and length of the string
  instance.exports.read_string(byteOffset, bytes.length);

  // Step 5: Free memory
  dealloc(byteOffset, bytes.length);
};

/// Reads a string from the memory: Rust -> WASM -> JS
export const readString = () => {
  // Step 1: Call Rust to get: pointer to the first byte and length of the string
  const headerPointer = instance.exports.write_string();
  const [dataPointer, length] = new Uint32Array(mem(), headerPointer, HEADER_SIZE);

  // Step 2: Read bytes from memory
  const view = new Uint8Array(mem(), dataPointer, length);
  // Step 3: Decode bytes to string
  const text = new TextDecoder().decode(view);

  // Step 4: Free memory
  dealloc(dataPointer, length);
  dealloc(headerPointer, HEADER_SIZE * 4);

  return text;
};

/// Writes a string array to the memory: JS -> WASM -> Rust
export const writeStringArray = (array) => {
  if (array.length === 0) {
    instance.exports.read_string_array(0, 0, 0);
    return;
  }

  // Step 1: Encode all strings to bytes
  const encodedStrings = array.map((s) => new TextEncoder().encode(s));

  // Step 2: Calculate total byte size
  const totalBytes = encodedStrings.reduce((acc, bytes) => acc + bytes.length, 0);

  // Step 3: Allocate memory for bytes
  const dataPointer = totalBytes > 0 ? alloc(totalBytes) : 0;

  // Step 4: Write all bytes consecutively
  if (totalBytes > 0) {
    const dataView = new Uint8Array(mem(), dataPointer, totalBytes);
    let offset = 0;
    for (const bytes of encodedStrings) {
      dataView.set(bytes, offset);
      offset += bytes.length;
    }
  }

  // Step 5: Create lengths array
  const lengths = encodedStrings.map((bytes) => bytes.length);
  const lengthsPointer = alloc(lengths.length * 4); // u32 = 4 bytes
  new Uint32Array(mem(), lengthsPointer, lengths.length).set(lengths);

  // Step 6: Call Rust with: data pointer, lengths pointer, count
  instance.exports.read_string_array(dataPointer, lengthsPointer, array.length);

  // Step 7: Cleanup
  if (totalBytes > 0) {
    dealloc(dataPointer, totalBytes);
  }
  dealloc(lengthsPointer, lengths.length * 4);
};

/// Reads a string array from the memory: Rust -> WASM -> JS
export const readStringArray = () => {
  const HEADER_SIZE_STRING_ARRAY = 4; // [dataPointer, dataLength, lengthsPointer, count]

  // Step 1: Call Rust to get: pointer to the header
  const headerPointer = instance.exports.write_string_vector();
  // Step 2: Read header from memory
  const header = new Uint32Array(mem(), headerPointer, HEADER_SIZE_STRING_ARRAY);
  const [dataPointer, dataLength, lengthsPointer, count] = header;

  // Step 3: Read lengths array from memory
  const lengths = new Uint32Array(mem(), lengthsPointer, count);
  // Step 4: Read all bytes from memory
  const allBytes = new Uint8Array(mem(), dataPointer, dataLength);

  // Step 5: Split bytes into strings using lengths
  const strings = new Array(count);
  let offset = 0;
  for (let index = 0; index < count; index++) {
    const len = lengths[index];
    const bytes = allBytes.slice(offset, offset + len);
    strings[index] = new TextDecoder().decode(bytes);
    offset += len;
  }

  // Step 6: Free memory
  dealloc(dataPointer, dataLength);
  dealloc(lengthsPointer, count * 4);
  dealloc(headerPointer, HEADER_SIZE_STRING_ARRAY * 4);

  return strings;
};
