/**
 * Example: Working with number arrays (i32)
 *
 * This example demonstrates how to:
 * - Send an array of integers from JS to Rust
 * - Receive an array of integers from Rust to JS
 */

import { writeI32Array, readI32Array } from '../js/index.js';

console.log('=== Number Arrays Example ===\n');

// Example 1: Send array to Rust
console.log('1. Sending [10, 20, 30, 40, 50] to Rust:');
writeI32Array([10, 20, 30, 40, 50]);

// Example 2: Receive array from Rust
console.log('\n2. Receiving array from Rust:');
const numbers = readI32Array();
console.log('   Received:', numbers);

// Example 3: Process received data
console.log('\n3. Processing received data:');
const sum = numbers.reduce((a, b) => a + b, 0);
const avg = sum / numbers.length;
console.log('   Sum:', sum);
console.log('   Average:', avg);

console.log('\n=== Done ===');
