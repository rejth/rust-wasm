/**
 * Integration tests for wasm-bridge
 *
 * Run with: npm test
 */

import {
  writeI32Array,
  readI32Array,
  writeString,
  readString,
  writeStringArray,
  readStringArray,
  writeBooleanArray,
  readBooleanArray,
} from '../js/index.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message = '') {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}\n    Expected: ${expectedStr}\n    Actual: ${actualStr}`);
  }
}

function assertArrayEqual(actual, expected, message = '') {
  if (actual.length !== expected.length) {
    throw new Error(`${message}\n    Length mismatch: ${actual.length} !== ${expected.length}`);
  }
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(`${message}\n    Mismatch at index ${i}: ${actual[i]} !== ${expected[i]}`);
    }
  }
}

console.log('=== wasm-bridge Integration Tests ===\n');

// ============================================
// Number Tests
// ============================================
console.log('--- Numbers ---');

test('writeI32Array: should send array to Rust without error', () => {
  writeI32Array([1, 2, 3, 4, 5]);
});

test('writeI32Array: should handle empty array', () => {
  writeI32Array([]);
});

test('writeI32Array: should handle negative numbers', () => {
  writeI32Array([-100, -50, 0, 50, 100]);
});

test('readI32Array: should return array from Rust', () => {
  const result = readI32Array();
  assertEqual(Array.isArray(result), true, 'Should return an array');
  assertEqual(result.length > 0, true, 'Array should not be empty');
});

test('readI32Array: should return correct values [42, 10, -30]', () => {
  const result = readI32Array();
  assertArrayEqual(result, [42, 10, -30]);
});

// ============================================
// String Tests
// ============================================
console.log('\n--- Strings ---');

test('writeString: should send string to Rust without error', () => {
  writeString('Hello, World!');
});

test('writeString: should handle empty string', () => {
  writeString('');
});

test('writeString: should handle unicode', () => {
  writeString('Hello 🦀 Rust! 你好世界');
});

test('readString: should return string from Rust', () => {
  const result = readString();
  assertEqual(typeof result, 'string', 'Should return a string');
  assertEqual(result.length > 0, true, 'String should not be empty');
});

test('readString: should return correct value', () => {
  const result = readString();
  assertEqual(result, 'String from Rust! 🦀');
});

// ============================================
// String Array Tests
// ============================================
console.log('\n--- String Arrays ---');

test('writeStringArray: should send string array to Rust', () => {
  writeStringArray(['one', 'two', 'three']);
});

test('writeStringArray: should handle empty array', () => {
  writeStringArray([]);
});

test('writeStringArray: should handle unicode strings', () => {
  writeStringArray(['🦀', '🌐', '🔗']);
});

test('readStringArray: should return string array from Rust', () => {
  const result = readStringArray();
  assertEqual(Array.isArray(result), true, 'Should return an array');
});

test('readStringArray: should return correct values', () => {
  const result = readStringArray();
  assertArrayEqual(result, ['Hello', 'from', 'Rust', '🦀']);
});

// ============================================
// Boolean Tests
// ============================================
console.log('\n--- Booleans ---');

test('writeBooleanArray: should send boolean array to Rust', () => {
  writeBooleanArray([true, false, true]);
});

test('writeBooleanArray: should handle empty array', () => {
  writeBooleanArray([]);
});

test('writeBooleanArray: should handle all true', () => {
  writeBooleanArray([true, true, true, true]);
});

test('writeBooleanArray: should handle all false', () => {
  writeBooleanArray([false, false, false]);
});

test('readBooleanArray: should return boolean array from Rust', () => {
  const result = readBooleanArray();
  assertEqual(Array.isArray(result), true, 'Should return an array');
});

test('readBooleanArray: should return correct values [true, false, true]', () => {
  const result = readBooleanArray();
  assertArrayEqual(result, [true, false, true]);
});

// ============================================
// Summary
// ============================================
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
