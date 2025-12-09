/**
 * Example: Working with boolean arrays
 *
 * This example demonstrates how to:
 * - Send an array of booleans from JS to Rust
 * - Receive an array of booleans from Rust to JS
 */

import { writeBooleanArray, readBooleanArray } from '../js/index.js';

console.log('=== Boolean Arrays Example ===\n');

// Example 1: Send boolean array to Rust
console.log('1. Sending [true, false, true, true, false] to Rust:');
writeBooleanArray([true, false, true, true, false]);

// Example 2: Receive boolean array from Rust
console.log('\n2. Receiving boolean array from Rust:');
const bools = readBooleanArray();
console.log('   Received:', bools);

// Example 3: Process received data
console.log('\n3. Processing received data:');
const trueCount = bools.filter(Boolean).length;
const falseCount = bools.length - trueCount;
console.log('   True count:', trueCount);
console.log('   False count:', falseCount);

// Example 4: Use case - feature flags
console.log('\n4. Use case - Feature flags:');
const features = ['darkMode', 'notifications', 'analytics'];
const flags = readBooleanArray();
features.forEach((feature, i) => {
  console.log(`   ${feature}: ${flags[i] ? '✓ enabled' : '✗ disabled'}`);
});

console.log('\n=== Done ===');
