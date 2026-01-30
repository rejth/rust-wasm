/**
 * Demo: Basic usage of wasm-transfer serialization methods
 * Run: npm run demo
 */
import { unpack } from 'msgpackr';
import { Order } from '../pkg/wasm_transfer.js';
import { ProductsView, ProductsViewRaw } from './view.js';

console.log('='.repeat(60));
console.log('WASM Transfer - Serialization Demo');
console.log('='.repeat(60));

// Create an order with some products
const order = new Order(1, 'John Doe');
order.addProduct('LAPTOP-001', 999.99, 1, true);
order.addProduct('MOUSE-002', 29.99, 2, true);
order.addProduct('KEYBOARD-003', 79.99, 1, false);

// ============================================================================
// Method 1: gloo-utils serde (JSON approach)
// ============================================================================
console.log('\n1️⃣  gloo-utils serde (JsValue::from_serde):');
const serdeResult = order.getItemsJson();
console.log('   Result:', serdeResult);
console.log('   Type:', typeof serdeResult, Array.isArray(serdeResult) ? '(Array)' : '');

// ============================================================================
// Method 2: serde_wasm_bindgen (direct JS object)
// ============================================================================
console.log('\n2️⃣  serde_wasm_bindgen:');
const serdeWasmResult = order.getItemsJs();
console.log('   Result:', serdeWasmResult);
console.log('   First item SKU:', serdeWasmResult[0]?.sku);

// ============================================================================
// Method 3: Raw bytes (bytes copied to JS)
// ============================================================================
console.log('\n3️⃣  Raw bytes (copied):');
const binaryResult = order.getItemsBinary();
console.log('   Bytes:', binaryResult.length, 'bytes');
const productsView = new ProductsView(binaryResult);
console.log('   First item SKU:', productsView.get(0).sku);
console.log('   First item price:', productsView.get(0).price);

// ============================================================================
// Method 4: Raw bytes (zero-copy, direct memory access)
// ============================================================================
console.log('\n4️⃣  Raw bytes (zero-copy):');
const rawHeader = order.getItemsBinaryRaw();
console.log('   Header [ptr, len]:', rawHeader);
const productsViewRaw = new ProductsViewRaw(rawHeader);
console.log('   First item SKU:', productsViewRaw.get(0).sku);
console.log('   First item price:', productsViewRaw.get(0).price);

// ============================================================================
// Method 5: MessagePack (cross-platform binary format)
// ============================================================================
console.log('\n5️⃣  MessagePack (rmp_serde):');
const msgpackBytes = order.getItemsBinaryMessagePack();
console.log('   Bytes:', msgpackBytes.length, 'bytes');
console.log('   Raw:', Buffer.from(msgpackBytes).toString('hex').slice(0, 50) + '...');

// Decode in JavaScript
const decoded = unpack(msgpackBytes);
console.log('   Decoded:', decoded);

// ============================================================================
// Quick timing comparison
// ============================================================================
console.log('\n⏱️  Quick timing comparison:');

// Add more items for meaningful timing
for (let i = 0; i < 100; i++) {
  order.addProduct(`SKU-${String(i).padStart(6, '0')}`, Math.random() * 100, 1, true);
}

console.time('   getItemsJs');
const jsItems = order.getItemsJs();
console.log('      Item 50 SKU:', jsItems[50].sku);
console.timeEnd('   getItemsJs');

console.time('   getItemsJson');
const jsonItems = order.getItemsJson();
console.log('      Item 50 SKU:', jsonItems[50].sku);
console.timeEnd('   getItemsJson');

console.time('   getItemsBinary');
const binaryItems = new ProductsView(order.getItemsBinary());
console.log('      Item 50 SKU:', binaryItems.get(50).sku);
console.timeEnd('   getItemsBinary');

console.time('   getItemsBinaryRaw');
const rawItems = new ProductsViewRaw(order.getItemsBinaryRaw());
console.log('      Item 50 SKU:', rawItems.get(50).sku);
console.timeEnd('   getItemsBinaryRaw');

console.time('   getItemsBinaryMessagePack');
const msgpackItems = unpack(order.getItemsBinaryMessagePack());
console.log('      Item 50 SKU:', msgpackItems[50][0]);
console.timeEnd('   getItemsBinaryMessagePack');

// Cleanup (explicit resource disposal)
order.free();

console.log('\n' + '='.repeat(60));
console.log('Demo complete!');
