/**
 * Demo: Compare serialization methods performance and size
 * Run: npm run demo:benchmark
 */
import { unpack } from "msgpackr";
import { Order } from "../pkg/wasm_transfer.js";

const ITEM_COUNTS = [10, 100, 1000];

console.log("=".repeat(70));
console.log("WASM Transfer - Serialization Benchmark");
console.log("=".repeat(70));

for (const count of ITEM_COUNTS) {
  console.log(`\n📊 Testing with ${count} items:`);
  console.log("-".repeat(70));

  // Create order with N items
  const order = new Order(1, "Benchmark Customer");
  for (let i = 0; i < count; i++) {
    order.add_product(
      `SKU-${String(i).padStart(6, "0")}`,
      Math.random() * 1000,
      Math.floor(Math.random() * 10) + 1,
      Math.random() > 0.5
    );
  }

  const results = {};

  // Method 1: gloo-utils serde
  const t1Start = performance.now();
  const serdeResult = order.serialize_items_with_serde();
  const t1End = performance.now();
  results.serde = {
    time: t1End - t1Start,
    size: JSON.stringify(serdeResult).length, // Approximate size
  };

  // Method 2: serde_wasm_bindgen
  const t2Start = performance.now();
  const serdeWasmResult = order.serialize_items_with_serde_wasm_bindgen();
  const t2End = performance.now();
  results.serdeWasm = {
    time: t2End - t2Start,
    size: JSON.stringify(serdeWasmResult).length,
  };

  // Method 3: MessagePack
  const t3Start = performance.now();
  const msgpackBytes = order.serialize_items_with_rmp_serde();
  const t3End = performance.now();
  results.msgpack = {
    time: t3End - t3Start,
    size: msgpackBytes.length,
  };

  // Decode MessagePack to verify
  const t3DecodeStart = performance.now();
  const decoded = unpack(msgpackBytes);
  const t3DecodeEnd = performance.now();
  results.msgpackDecode = {
    time: t3DecodeEnd - t3DecodeStart,
  };

  // Method 4: rkyv
  const t4Start = performance.now();
  const rkyvBytes = order.serialize_items_with_rkyv();
  const t4End = performance.now();
  results.rkyv = {
    time: t4End - t4Start,
    size: rkyvBytes.length,
  };

  // Print results
  console.log(
    `  ${"Method".padEnd(25)} ${"Time (ms)".padStart(12)} ${"Size (bytes)".padStart(14)}`
  );
  console.log("  " + "-".repeat(53));
  console.log(
    `  ${"gloo-utils serde".padEnd(25)} ${results.serde.time.toFixed(3).padStart(12)} ${results.serde.size.toLocaleString().padStart(14)}`
  );
  console.log(
    `  ${"serde_wasm_bindgen".padEnd(25)} ${results.serdeWasm.time.toFixed(3).padStart(12)} ${results.serdeWasm.size.toLocaleString().padStart(14)}`
  );
  console.log(
    `  ${"MessagePack (serialize)".padEnd(25)} ${results.msgpack.time.toFixed(3).padStart(12)} ${results.msgpack.size.toLocaleString().padStart(14)}`
  );
  console.log(
    `  ${"MessagePack (decode JS)".padEnd(25)} ${results.msgpackDecode.time.toFixed(3).padStart(12)} ${"N/A".padStart(14)}`
  );
  console.log(
    `  ${"rkyv (Rust-only)".padEnd(25)} ${results.rkyv.time.toFixed(3).padStart(12)} ${results.rkyv.size.toLocaleString().padStart(14)}`
  );

  order.free();
}

console.log("\n" + "=".repeat(70));
console.log("Comparison complete!");
console.log("\n💡 Notes:");
console.log("   - MessagePack has smallest binary size and fastest serialization time for Rust-to-JS transfer");
console.log("   - rkyv is fastest for Rust-to-Rust transfer");
console.log("   - serde_wasm_bindgen is good for small/medium data with JS interop");
console.log("   - gloo-utils serde is good for small/medium data with JS interop and even faster than serde_wasm_bindgen in some cases");
