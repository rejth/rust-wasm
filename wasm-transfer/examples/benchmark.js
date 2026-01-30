/**
 * Demo: Compare serialization methods performance and size
 * Run: npm run demo:benchmark
 */
import { unpack } from 'msgpackr';
import { Order } from '../pkg/wasm_transfer.js';
import { ProductsView, ProductsViewRaw } from './view.js';

const ITEM_COUNTS = [10, 100, 1000, 100000];

console.log('='.repeat(70));
console.log('WASM Transfer - Serialization Benchmark');
console.log('='.repeat(70));

for (const count of ITEM_COUNTS) {
  console.log(`\n📊 Testing with ${count} items:`);
  console.log('-'.repeat(70));

  // Create order with N items
  const order = new Order(1, 'Benchmark Customer');
  for (let i = 0; i < count; i++) {
    order.addProduct(
      `SKU-${String(i).padStart(6, '0')}`,
      Math.random() * 1000,
      Math.floor(Math.random() * 10) + 1,
      Math.random() > 0.5,
    );
  }

  const results = {};

  // Method 1: gloo-utils serde
  const t1Start = performance.now();
  const serdeResult = order.getItemsJson();
  const t1End = performance.now();
  results.serde = {
    time: t1End - t1Start,
    size: JSON.stringify(serdeResult).length, // Approximate size
  };

  // Method 2: serde_wasm_bindgen
  const t2Start = performance.now();
  const serdeWasmResult = order.getItemsJs();
  const t2End = performance.now();
  results.serdeWasm = {
    time: t2End - t2Start,
    size: JSON.stringify(serdeWasmResult).length,
  };

  // Method 3: Raw bytes (bytes copied to JS)
  const t3Start = performance.now();
  const binaryBytes = order.getItemsBinary();
  const t3End = performance.now();
  results.binary = {
    time: t3End - t3Start,
    size: binaryBytes.length,
  };

  // Decode binary to verify
  const t3DecodeStart = performance.now();
  const binaryView = new ProductsView(binaryBytes);
  // Access first item to trigger decode
  const _ = binaryView.get(0).sku;
  const t3DecodeEnd = performance.now();
  results.binaryDecode = {
    time: t3DecodeEnd - t3DecodeStart,
  };

  // Method 4: Raw bytes (zero-copy, direct memory access)
  const t4Start = performance.now();
  const rawHeader = order.getItemsBinaryRaw();
  const t4End = performance.now();
  results.rawBytes = {
    time: t4End - t4Start,
    size: rawHeader[1], // Length from header
  };

  // Decode raw bytes to verify
  const t4DecodeStart = performance.now();
  const rawView = new ProductsViewRaw(rawHeader);
  // Access first item to trigger decode
  const __ = rawView.get(0).sku;
  const t4DecodeEnd = performance.now();
  results.rawBytesDecode = {
    time: t4DecodeEnd - t4DecodeStart,
  };

  // Method 5: MessagePack (cross-platform binary format)
  const t5Start = performance.now();
  const msgpackBytes = order.getItemsBinaryMessagePack();
  const t5End = performance.now();
  results.msgpack = {
    time: t5End - t5Start,
    size: msgpackBytes.length,
  };

  // Decode MessagePack to verify
  const t5DecodeStart = performance.now();
  const decoded = unpack(msgpackBytes);
  const t5DecodeEnd = performance.now();
  results.msgpackDecode = {
    time: t5DecodeEnd - t5DecodeStart,
  };

  // Print results
  console.log(
    `  ${'Method'.padEnd(30)} ${'Time (ms)'.padStart(12)} ${'Size (bytes)'.padStart(14)}`,
  );
  console.log('  ' + '-'.repeat(58));
  console.log(
    `  ${'gloo-utils serde (JSON)'.padEnd(30)} ${results.serde.time
      .toFixed(3)
      .padStart(12)} ${results.serde.size.toLocaleString().padStart(14)}`,
  );
  console.log(
    `  ${'serde_wasm_bindgen (JS object)'.padEnd(30)} ${results.serdeWasm.time
      .toFixed(3)
      .padStart(12)} ${results.serdeWasm.size.toLocaleString().padStart(14)}`,
  );
  console.log(
    `  ${'Raw bytes (serialize)'.padEnd(30)} ${results.binary.time
      .toFixed(3)
      .padStart(12)} ${results.binary.size.toLocaleString().padStart(14)}`,
  );
  console.log(
    `  ${'Raw bytes (decode JS)'.padEnd(30)} ${results.binaryDecode.time
      .toFixed(3)
      .padStart(12)} ${'N/A'.padStart(14)}`,
  );
  console.log(
    `  ${'Raw bytes zero-copy (header)'.padEnd(30)} ${results.rawBytes.time
      .toFixed(3)
      .padStart(12)} ${results.rawBytes.size.toLocaleString().padStart(14)}`,
  );
  console.log(
    `  ${'Raw bytes zero-copy (decode)'.padEnd(30)} ${results.rawBytesDecode.time
      .toFixed(3)
      .padStart(12)} ${'N/A'.padStart(14)}`,
  );
  console.log(
    `  ${'MessagePack (serialize)'.padEnd(30)} ${results.msgpack.time
      .toFixed(3)
      .padStart(12)} ${results.msgpack.size.toLocaleString().padStart(14)}`,
  );
  console.log(
    `  ${'MessagePack (decode JS)'.padEnd(30)} ${results.msgpackDecode.time
      .toFixed(3)
      .padStart(12)} ${'N/A'.padStart(14)}`,
  );

  order.free();
}

console.log('\n' + '='.repeat(70));
console.log('Comparison complete!');
console.log('\n💡 Notes:');
console.log(
  '   - Raw bytes (zero-copy, direct memory access) is fastest for serialization and deserialization',
);
console.log('   - Raw bytes (bytes copied to JS) copies bytes to JS but allows memory-safe access');
console.log('   - MessagePack has compact binary size and is cross-platform');
console.log('   - serde_wasm_bindgen returns native JS objects directly');
console.log('   - gloo-utils serde uses JSON internally but returns JS objects');
