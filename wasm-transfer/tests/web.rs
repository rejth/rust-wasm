//! Test suite for the Web and headless browsers.

// The tests are only intended for the wasm32 architecture, not for the native architectures
#![cfg(target_arch = "wasm32")]

use wasm_bindgen::JsValue;
use wasm_bindgen_test::{wasm_bindgen_test, wasm_bindgen_test_configure};
use wasm_transfer::Order;

// Configures the test runner to run the tests in a web browser as opposed to Node.js, which is the default
wasm_bindgen_test_configure!(run_in_browser);

// ============================================================================
// Helper functions for JS value inspection
// ============================================================================

fn assert_is_array(value: &JsValue) -> js_sys::Array {
    assert!(js_sys::Array::is_array(value), "Expected an array");
    js_sys::Array::from(value)
}

fn get_property(obj: &JsValue, key: &str) -> JsValue {
    js_sys::Reflect::get(obj, &JsValue::from_str(key)).expect("Failed to get property")
}

// This runs a test in native Rust, so it can only use Rust APIs.
#[test]
fn rust_test() {
    assert_eq!(1, 1);
}

// This runs a test in the browser, so it can use browser APIs.
#[wasm_bindgen_test]
fn web_test() {
    assert_eq!(1, 1);
}

// ============================================================================
// Basic Order Operations
// ============================================================================

#[wasm_bindgen_test]
fn test_order_in_wasm() {
    let mut order = Order::new(100, "WASM Customer".to_string());
    order.add_product("WASM-SKU".to_string(), 42.0, 1, true);

    assert_eq!(order.total_items_count(), 1);
    assert_eq!(order.total_value(), 42.0);
}

// ============================================================================
// gloo-utils serde (JsValue::from_serde / into_serde) - JSON string approach
// ============================================================================

#[wasm_bindgen_test]
fn test_serde_serialization() {
    let mut order = Order::new(1, "Test".to_string());
    order.add_product("SKU001".to_string(), 10.0, 2, true);
    order.add_product("SKU002".to_string(), 25.5, 1, false);

    let js_value = order.serialize_items_with_serde();

    // Verify we get an array with correct length
    let array = assert_is_array(&js_value);
    assert_eq!(array.length(), 2);

    // Check first item
    let first_item = array.get(0);
    assert_eq!(
        get_property(&first_item, "sku").as_string().unwrap(),
        "SKU001"
    );
    // Check second item
    let second_item = array.get(1);
    assert_eq!(
        get_property(&second_item, "sku").as_string().unwrap(),
        "SKU002"
    );
}

#[wasm_bindgen_test]
fn test_serde_roundtrip() {
    let mut order = Order::new(1, "Test".to_string());
    order.add_product("SKU001".to_string(), 10.0, 2, true);
    order.add_product("SKU002".to_string(), 25.5, 1, false);

    // Serialize to JsValue
    let js_value = order.serialize_items_with_serde();

    // Deserialize back - verifies the roundtrip doesn't panic
    Order::deserialize_items_with_serde(js_value);
}

// ============================================================================
// serde_wasm_bindgen - Direct JS object construction
// ============================================================================

#[wasm_bindgen_test]
fn test_serde_wasm_bindgen_serialization() {
    let mut order = Order::new(1, "Test".to_string());
    order.add_product("SKU001".to_string(), 10.0, 2, true);
    order.add_product("SKU002".to_string(), 25.5, 1, false);

    let js_value = order.serialize_items_with_serde_wasm_bindgen();

    // Verify we get an array with correct length
    let array = assert_is_array(&js_value);
    assert_eq!(array.length(), 2);

    // Check first item's properties
    let first_item = array.get(0);
    assert_eq!(
        get_property(&first_item, "sku").as_string().unwrap(),
        "SKU001"
    );
    // Check second item
    let second_item = array.get(1);
    assert_eq!(
        get_property(&second_item, "sku").as_string().unwrap(),
        "SKU002"
    );
}

#[wasm_bindgen_test]
fn test_serde_wasm_bindgen_roundtrip() {
    let mut order = Order::new(1, "Test".to_string());
    order.add_product("SKU001".to_string(), 10.0, 2, true);
    order.add_product("SKU002".to_string(), 25.5, 1, false);

    // Serialize to JsValue
    let js_value = order.serialize_items_with_serde_wasm_bindgen();

    // Deserialize back - verifies the roundtrip doesn't panic
    Order::deserialize_items_with_serde_wasm_bindgen(js_value);
}

// ============================================================================
// rmp_serde (MessagePack) - Binary format
// ============================================================================

#[wasm_bindgen_test]
fn test_rmp_serde_serialization() {
    let mut order = Order::new(1, "Test".to_string());
    order.add_product("SKU001".to_string(), 10.0, 2, true);
    order.add_product("SKU002".to_string(), 25.5, 1, false);

    let bytes = order.serialize_items_with_rmp_serde();

    // Verify we get non-empty bytes
    assert!(!bytes.is_empty());
}

#[wasm_bindgen_test]
fn test_rmp_serde_roundtrip() {
    let mut order = Order::new(1, "Test".to_string());
    order.add_product("SKU001".to_string(), 10.0, 2, true);
    order.add_product("SKU002".to_string(), 25.5, 1, false);

    // Serialize to bytes
    let bytes = order.serialize_items_with_rmp_serde();

    // Deserialize back - verifies the roundtrip doesn't panic
    Order::deserialize_items_with_rmp_serde(bytes);
}

// ============================================================================
// Edge cases
// ============================================================================

#[wasm_bindgen_test]
fn test_empty_order_serialization() {
    let order = Order::new(1, "Empty Order".to_string());

    // All serialization methods should handle empty items
    let serde_result = order.serialize_items_with_serde();
    let serde_wasm_result = order.serialize_items_with_serde_wasm_bindgen();
    let rmp_result = order.serialize_items_with_rmp_serde();

    // Both should return empty arrays
    let serde_array = assert_is_array(&serde_result);
    let serde_wasm_array = assert_is_array(&serde_wasm_result);

    assert_eq!(serde_array.length(), 0);
    assert_eq!(serde_wasm_array.length(), 0);

    // Empty array in MessagePack is still a valid (small) byte sequence
    assert!(!rmp_result.is_empty());
}

#[wasm_bindgen_test]
fn test_large_order_serialization() {
    let mut order = Order::new(1, "Large Order".to_string());

    // Add many products to test serialization with larger data
    for i in 0..100 {
        order.add_product(
            format!("SKU{:04}", i),
            (i as f32) * 1.5,
            i as u32 + 1,
            i % 2 == 0,
        );
    }

    assert_eq!(order.total_items_count(), 100);

    // All methods should handle larger datasets
    let serde_result = order.serialize_items_with_serde();
    let serde_wasm_result = order.serialize_items_with_serde_wasm_bindgen();
    let rmp_result = order.serialize_items_with_rmp_serde();

    // Verify array lengths
    let serde_array = assert_is_array(&serde_result);
    let serde_wasm_array = assert_is_array(&serde_wasm_result);
    assert_eq!(serde_array.length(), 100);
    assert_eq!(serde_wasm_array.length(), 100);
    assert!(!rmp_result.is_empty());

    // Spot check: verify item at index 50
    let item_50 = serde_array.get(50);
    assert_eq!(
        get_property(&item_50, "sku").as_string().unwrap(),
        "SKU0050"
    );
    assert_eq!(
        get_property(&item_50, "quantity").as_f64().unwrap() as u32,
        51
    );
    assert_eq!(get_property(&item_50, "in_stock").as_bool().unwrap(), true); // 50 % 2 == 0

    // Test roundtrips with large data
    Order::deserialize_items_with_serde(order.serialize_items_with_serde());
    Order::deserialize_items_with_serde_wasm_bindgen(
        order.serialize_items_with_serde_wasm_bindgen(),
    );
    Order::deserialize_items_with_rmp_serde(order.serialize_items_with_rmp_serde());
}
