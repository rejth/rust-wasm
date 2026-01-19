/**
 * Demo: Basic usage of wasm-transfer serialization methods
 * Run: npm run demo
 */
import { unpack } from "msgpackr";
import { greet, Order } from "../pkg/wasm_transfer.js";

console.log("=".repeat(60));
console.log("WASM Transfer - Serialization Demo");
console.log("=".repeat(60));

// Create an order with some products
const order = new Order(1, "John Doe");
order.add_product("LAPTOP-001", 999.99, 1, true);
order.add_product("MOUSE-002", 29.99, 2, true);
order.add_product("KEYBOARD-003", 79.99, 1, false);

// ============================================================================
// Method 1: gloo-utils serde (JSON approach)
// ============================================================================
console.log("\n1️⃣  gloo-utils serde (JsValue::from_serde):");
const serdeResult = order.serialize_items_with_serde();
console.log("   Result:", serdeResult);
console.log("   Type:", typeof serdeResult, Array.isArray(serdeResult) ? "(Array)" : "");

// ============================================================================
// Method 2: serde_wasm_bindgen (direct JS object)
// ============================================================================
console.log("\n2️⃣  serde_wasm_bindgen:");
const serdeWasmResult = order.serialize_items_with_serde_wasm_bindgen();
console.log("   Result:", serdeWasmResult);
console.log("   First item SKU:", serdeWasmResult[0]?.sku);

// ============================================================================
// Method 3: MessagePack (binary format)
// ============================================================================
console.log("\n3️⃣  MessagePack (rmp_serde):");
const msgpackBytes = order.serialize_items_with_rmp_serde();
console.log("   Bytes:", msgpackBytes.length, "bytes");
console.log("   Raw:", Buffer.from(msgpackBytes).toString("hex").slice(0, 50) + "...");

// Decode in JavaScript
const decoded = unpack(msgpackBytes);
console.log("   Decoded:", decoded);

// ============================================================================
// Method 4: rkyv (Rust-only, for comparison)
// ============================================================================
console.log("\n4️⃣  rkyv (Rust-only binary format):");
const rkyvBytes = order.serialize_items_with_rkyv();
console.log("   Bytes:", rkyvBytes.length, "bytes");
console.log("   ⚠️  Cannot decode in JS - rkyv is Rust-only format");

// Cleanup (explicit resource disposal)
order.free();

console.log("\n" + "=".repeat(60));
console.log("Demo complete!");
