/**
 * Example: Working with strings
 *
 * This example demonstrates how to:
 * - Send a string from JS to Rust
 * - Receive a string from Rust to JS
 * - Send an array of strings from JS to Rust
 * - Receive an array of strings from Rust to JS
 */

import { writeString, readString, writeStringArray, readStringArray } from '../js/index.js';

console.log('=== Strings Example ===\n');

// Example 1: Send single string to Rust
console.log('1. Sending single string to Rust:');
writeString('Hello from JavaScript! 🌐');

// Example 2: Receive single string from Rust
console.log('\n2. Receiving string from Rust:');
const message = readString();
console.log('   Received:', message);

// Example 3: Send string array to Rust
console.log('\n3. Sending string array to Rust:');
const fruits = ['Apple', 'Banana', 'Cherry', '🍎🍌🍒'];
writeStringArray(fruits);

// Example 4: Receive string array from Rust
console.log('\n4. Receiving string array from Rust:');
const words = readStringArray();
console.log('   Received:', words);
console.log('   Joined:', words.join(' '));

// Example 5: Unicode support
console.log('\n5. Unicode support:');
writeString('Привет мир! 你好世界! مرحبا بالعالم');
writeStringArray(['🦀 Rust', '🌐 JavaScript', '🔗 WebAssembly']);

console.log('\n=== Done ===');
