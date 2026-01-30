//! # wasm-transfer
//!
//! A study project demonstrating different approaches to transfer data
//! between Rust (WASM) and JavaScript.
//!
//! ## Serialization Methods
//!
//! This crate compares four serialization approaches:
//!
//! | Method | Best For | JS Decodable |
//! |--------|----------|--------------|
//! | `gloo-utils serde` | Small/medium data, simple types | ✅ Yes |
//! | `serde_wasm_bindgen` | Small/medium data | ✅ Yes |
//! | `rmp_serde` (MessagePack) | Large data | ✅ Yes (with decoder) |
//! | `rkyv` | Rust-to-Rust only | ❌ No |
//!
//! ## Quick Start
//!
//! ```javascript
//! import { Order } from "./pkg/wasm_transfer.js";
//!
//! const order = new Order(1, "John Doe");
//! order.add_product("SKU001", 29.99, 2, true);
//!
//! // Get as JS object
//! const items = order.serialize_items_with_serde_wasm_bindgen();
//!
//! // Get as MessagePack bytes (decode with msgpackr or any other MessagePack decoder)
//! const bytes = order.serialize_items_with_rmp_serde();
//! ```

mod utils;

use chrono::{SecondsFormat, Utc};
use gloo_utils::format::JsValueSerdeExt;
use rkyv::{Archive, deserialize, rancor::Error};
use serde::ser::Serialize;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    log("Hello from Rust! 🦀");
}

/// Export WebAssembly memory for direct access from JavaScript.
/// This is needed for zero-copy data access patterns.
#[wasm_bindgen(js_name = getMemory)]
pub fn get_memory() -> JsValue {
    wasm_bindgen::memory()
}

#[derive(
    Debug,
    PartialEq,
    serde::Serialize,
    serde::Deserialize,
    rkyv::Serialize,
    rkyv::Deserialize,
    Archive,
)]
#[rkyv(
    // This will generate a PartialEq impl between our unarchived and archived types
    compare(PartialEq),
    // Derives can be passed through to the generated type:
    derive(Debug),
)]
#[repr(C)]
struct Product {
    sku: String, // String in wasm32 has layout [len, ptr, cap]. Overall 12 bytes (4 bytes for each).
    price: f32,  // 4 bytes
    quantity: u32, // 4 bytes
    in_stock: bool, // 1 byte
}

impl Product {
    pub fn new(sku: String, price: f32, quantity: u32, in_stock: bool) -> Product {
        Product {
            sku,
            price,
            quantity,
            in_stock,
        }
    }

    pub fn encode(&self) -> Vec<u8> {
        let mut bytes = vec![];

        bytes.extend_from_slice(self.as_bytes(&self.sku.as_ptr()));
        bytes.extend_from_slice(self.as_bytes(&self.sku.len()));
        bytes.extend_from_slice(self.as_bytes(&self.price));
        bytes.extend_from_slice(self.as_bytes(&self.quantity));
        bytes.push(self.in_stock as u8);

        return bytes;
    }

    fn as_bytes<T>(&self, value: &T) -> &[u8] {
        let ptr = value as *const T as *const u8;
        let len = size_of::<T>();
        unsafe { std::slice::from_raw_parts(ptr, len) }
    }
}

#[wasm_bindgen(getter_with_clone)]
#[allow(dead_code)]
pub struct Order {
    pub order_id: u32,
    pub customer_name: String,
    pub created_at: String,
    items: Vec<Product>,
}

#[wasm_bindgen]
impl Order {
    #[wasm_bindgen(constructor)]
    pub fn new(order_id: u32, customer_name: String) -> Order {
        Order {
            order_id,
            customer_name,
            created_at: Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
            items: Vec::new(),
        }
    }

    #[wasm_bindgen(js_name = addProduct)]
    pub fn add_product(&mut self, sku: String, price: f32, quantity: u32, in_stock: bool) {
        self.items
            .push(Product::new(sku.to_string(), price, quantity, in_stock));
    }

    #[wasm_bindgen(js_name = totalItemsCount)]
    pub fn total_items_count(&self) -> usize {
        self.items.len()
    }

    #[wasm_bindgen(js_name = totalValue)]
    pub fn total_value(&self) -> f32 {
        self.items
            .iter()
            .map(|item| item.price * item.quantity as f32)
            .sum()
    }

    // ========================================================================
    // Serialization Method 1: gloo-utils serde (JSON approach)
    // ========================================================================

    /// Serializes items using `gloo-utils` serde (JSON-based).
    ///
    /// This is the simplest method. It:
    /// 1. Converts Rust struct → JSON UTF-8 string
    /// 2. Converts UTF-8 → UTF-16 (JS strings are UTF-16 internally)
    /// 3. Parses JSON string to JS object
    ///
    /// ## Pros
    /// - Simple to use
    /// - Result is native JS object
    /// - Good for small/medium data
    ///
    /// ## Cons
    /// - Doesn't support HashMap/HashSet, BTreeMap, etc.
    /// - Expensive multi-step conversion
    #[wasm_bindgen(js_name = getItemsJson)]
    pub fn serialize_items_with_serde(&self) -> JsValue {
        JsValue::from_serde(&self.items).unwrap()
    }

    /// Deserializes items from JsValue (gloo-utils serde approach).
    pub fn deserialize_items_with_serde(items: JsValue) {
        items.into_serde::<Vec<Product>>().unwrap();
    }

    // ========================================================================
    // Serialization Method 2: serde_wasm_bindgen (Direct JS object)
    // ========================================================================

    /// Serializes items using `serde_wasm_bindgen` (direct JS object construction).
    ///
    /// It constructs JS objects directly without intermediate JSON string.
    ///
    /// ## Pros
    /// - Result is native JS object
    /// - Supports many Rust types (HashMap, Vec, BTreeMap, etc.)
    /// - Good for small/medium data
    ///
    /// ## Cons
    /// - Each field = separate WASM→JS call (expensive for large data)
    #[wasm_bindgen(js_name = getItemsJs)]
    pub fn serialize_items_with_serde_wasm_bindgen(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.items).unwrap()
    }

    /// Deserializes items from JsValue (serde_wasm_bindgen approach).
    pub fn deserialize_items_with_serde_wasm_bindgen(items: JsValue) {
        serde_wasm_bindgen::from_value::<Vec<Product>>(items).unwrap();
    }

    // ========================================================================
    // Serialization Method 3: Raw bytes
    // ========================================================================

    /// Serializes items as raw memory bytes. See the 09-wasm-data-bridge crate for more details.
    ///
    /// ## Pros
    /// -
    ///
    /// ## Cons
    /// -
    #[wasm_bindgen(js_name = getItemsBinary)]
    pub fn serialize_items_with_bytes(&self) -> Vec<u8> {
        self.items.iter().flat_map(|item| item.encode()).collect()
    }

    #[wasm_bindgen(js_name = getItemsBinaryRaw)]
    pub fn serialize_items_with_raw_bytes(&self) -> Vec<usize> {
        vec![
            self.items.as_ptr() as usize,
            self.items.len() * size_of::<Product>(),
        ]
    }

    // ========================================================================
    // Serialization Method 4: Raw bytes in the MessagePack format (rmp_serde)
    // ========================================================================

    /// Serializes items using MessagePack binary format.
    ///
    /// **Best choice for large data transfer to JavaScript.**
    ///
    /// MessagePack encodes data into a compact binary format that can be decoded in JavaScript using any MessagePack decoder.
    ///
    /// ## Pros
    /// - Single WASM→JS transfer (fastest for large data)
    /// - Compact binary format. MessagePack stores data efficiently (~4x smaller than JSON for large datasets)
    /// - Cross-platform format
    ///
    /// ## Cons
    /// - Requires decoding step in JS
    /// - Returns tuple arrays, not objects: `["SKU001", 10.0, 2, true]`
    #[wasm_bindgen(js_name = getItemsBinaryMessagePack)]
    pub fn serialize_items_with_rmp_serde(&self) -> Vec<u8> {
        let mut buf = vec![];
        let mut serializer =
            rmp_serde::Serializer::new(&mut buf).with_bytes(rmp_serde::config::BytesMode::ForceAll);

        self.items.serialize(&mut serializer).unwrap();

        buf
    }

    /// Deserializes items from MessagePack bytes.
    pub fn deserialize_items_with_rmp_serde(data: Vec<u8>) {
        rmp_serde::from_slice::<Vec<Product>>(&data).unwrap();
    }

    // ========================================================================
    // Serialization Method 5: Raw bytes with rkyv library (Rust-only)
    // ========================================================================

    /// Serializes items using rkyv zero-copy format.
    ///
    /// **Best choice for Rust-to-Rust communication only.**
    ///
    /// rkyv provides zero-copy deserialization - archived data can be accessed directly without parsing, making it extremely fast.
    ///
    /// ## Pros
    /// - Fastest serialization/deserialization
    /// - Zero-copy access to archived data
    ///
    /// ## Cons
    /// - **Cannot be decoded in JavaScript** - Rust-only format
    pub fn serialize_items_with_rkyv(&self) -> Vec<u8> {
        rkyv::to_bytes::<Error>(&self.items).unwrap().into()
    }

    /// Demonstrates rkyv deserialization with various access patterns.
    pub fn deserialize_items_with_rkyv(&self) {
        // Customize serialization for better performance or control over resource usage
        use rkyv::{api::high::to_bytes_with_alloc, ser::allocator::Arena};

        // Reuse the same allocator for multiple serializations to reduce the number of global allocations, which can save a considerable amount of time.
        let mut arena = Arena::new();
        let bytes = to_bytes_with_alloc::<_, Error>(&self.items, arena.acquire()).unwrap();

        // Fast zero-copy deserialization with safe API
        // Use rkyv::Archived<T> to get the correct archived type for T and access the fields directly without copying
        let archived = rkyv::access::<rkyv::Archived<Vec<Product>>, Error>(&bytes[..]).unwrap();
        assert_eq!(archived, &self.items);

        // Unsafe API for maximum performance (skips validation)
        let archived =
            unsafe { rkyv::access_unchecked::<rkyv::Archived<Vec<Product>>>(&bytes[..]) };
        assert_eq!(archived, &self.items);

        // Deserialize back to the original type (this does copy)
        let deserialized: Vec<Product> = deserialize::<Vec<Product>, Error>(archived).unwrap();
        assert_eq!(deserialized, self.items);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_order_creation() {
        let order = Order::new(42, "Test Customer".to_string());

        assert_eq!(order.order_id, 42);
        assert_eq!(order.customer_name, "Test Customer");
    }

    #[test]
    fn test_add_products_and_total() {
        let mut order = Order::new(1, "Alice".to_string());
        order.add_product("SKU001".to_string(), 10.0, 2, true);
        order.add_product("SKU002".to_string(), 5.0, 3, true);

        assert_eq!(order.total_items_count(), 2);
        assert_eq!(order.total_value(), 35.0);
    }

    #[test]
    fn test_rmp_serde_roundtrip() {
        let mut order = Order::new(1, "Test".to_string());
        order.add_product("SKU".to_string(), 9.99, 1, true);

        let bytes = order.serialize_items_with_rmp_serde();
        // Verify we can deserialize back
        let items: Vec<Product> = rmp_serde::from_slice(&bytes).unwrap();

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].sku, "SKU");
    }

    #[test]
    fn test_rkyv_roundtrip() {
        let mut order = Order::new(1, "Test".to_string());
        order.add_product("ABC".to_string(), 25.0, 4, false);
        order.add_product("DEF".to_string(), 30.0, 5, true);

        // This calls the internal rkyv test logic
        order.deserialize_items_with_rkyv();
    }
}
