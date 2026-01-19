/**
 * JS integration tests for wasm-transfer
 * Run: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { unpack } from "msgpackr";

import { Order } from "../pkg/wasm_transfer.js";

describe("gloo-utils serde serialization", () => {
  it("should serialize items to JS array", () => {
    const order = new Order(1, "Test");
    order.add_product("SKU001", 10.0, 2, true);
    order.add_product("SKU002", 25.5, 1, false);

    const result = order.serialize_items_with_serde();

    assert.ok(Array.isArray(result), "Result should be an array");
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].sku, "SKU001");
    assert.strictEqual(result[1].sku, "SKU002");

    order.free();
  });

  it("should handle empty items", () => {
    const order = new Order(1, "Empty");
    const result = order.serialize_items_with_serde();

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 0);

    order.free();
  });
});

describe("serde_wasm_bindgen serialization", () => {
  it("should serialize items to JS array", () => {
    const order = new Order(1, "Test");
    order.add_product("SKU001", 10.0, 2, true);
    order.add_product("SKU002", 25.5, 1, false);

    const result = order.serialize_items_with_serde_wasm_bindgen();

    assert.ok(Array.isArray(result), "Result should be an array");
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].sku, "SKU001");
    assert.strictEqual(result[1].sku, "SKU002");

    order.free();
  });
});

describe("MessagePack (rmp_serde) serialization", () => {
  it("should serialize items to bytes", () => {
    const order = new Order(1, "Test");
    order.add_product("SKU001", 10.0, 2, true);
    order.add_product("SKU002", 25.5, 1, false);

    const bytes = order.serialize_items_with_rmp_serde();

    assert.ok(bytes instanceof Uint8Array, "Result should be Uint8Array");
    assert.ok(bytes.length > 0, "Should have bytes");

    order.free();
  });

  it("should produce decodable MessagePack", () => {
    const order = new Order(1, "Test");
    order.add_product("SKU001", 10.0, 2, true);
    order.add_product("SKU002", 25.5, 1, false);

    const bytes = order.serialize_items_with_rmp_serde();
    const decoded = unpack(bytes);

    // MessagePack uses array format: [sku, price, quantity, in_stock]
    assert.ok(Array.isArray(decoded), "Decoded should be an array");
    assert.strictEqual(decoded.length, 2);

    // First item: ["SKU001", 10.0, 2, true]
    assert.strictEqual(decoded[0][0], "SKU001"); // sku
    assert.strictEqual(decoded[0][1], 10.0); // price
    assert.strictEqual(decoded[0][2], 2); // quantity
    assert.strictEqual(decoded[0][3], true); // in_stock

    // Second item: ["SKU002", 25.5, 1, false]
    assert.strictEqual(decoded[1][0], "SKU002");
    assert.strictEqual(decoded[1][3], false);

    order.free();
  });

  it("should handle large datasets", () => {
    const order = new Order(1, "Large");

    for (let i = 0; i < 1000; i++) {
      order.add_product(`SKU${i.toString().padStart(6, "0")}`, i * 1.5, i + 1, i % 2 === 0);
    }

    const bytes = order.serialize_items_with_rmp_serde();
    const decoded = unpack(bytes);

    assert.strictEqual(decoded.length, 1000);
    // Array format: [sku, price, quantity, in_stock]
    assert.strictEqual(decoded[500][0], "SKU000500"); // sku
    assert.strictEqual(decoded[500][2], 501); // quantity

    order.free();
  });
});

describe("rkyv serialization", () => {
  it("should serialize items to bytes", () => {
    const order = new Order(1, "Test");
    order.add_product("SKU001", 10.0, 2, true);

    const bytes = order.serialize_items_with_rkyv();

    assert.ok(bytes instanceof Uint8Array, "Result should be Uint8Array");
    assert.ok(bytes.length > 0, "Should have bytes");

    order.free();
  });

  // Note: rkyv bytes cannot be decoded in JS - they're Rust-only
});

describe("Serialization comparison", () => {
  it("MessagePack should produce smaller output than JSON-based method (gloo-utils serde)", () => {
    const order = new Order(1, "Test");
    for (let i = 0; i < 100; i++) {
      order.add_product(`SKU${i}`, i * 10.0, i + 1, true);
    }

    const serdeResult = order.serialize_items_with_serde();
    const msgpackBytes = order.serialize_items_with_rmp_serde();

    const jsonSize = JSON.stringify(serdeResult).length;
    const msgpackSize = msgpackBytes.length;

    assert.ok(
      msgpackSize < jsonSize,
      `MessagePack (${msgpackSize}) should be smaller than JSON (${jsonSize})`
    );

    order.free();
  });
});
