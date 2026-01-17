//! Test suite for the Web and headless browsers.

// Means that the test is only intended for the wasm32 architecture, not for the native architectures
#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use wasm_bindgen_test::*;

// Configures the test runner to run the tests in a web browser as opposed to Node.js, which is the default
wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn pass() {
    assert_eq!(1 + 1, 2);
}
