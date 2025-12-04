use crate::utils::log;

/// Reads a boolean array from the memory: JS -> WASM -> Rust
#[unsafe(no_mangle)]
pub extern "C" fn read_boolean_array(ptr: *const bool, len: usize) {
    if len == 0 {
        log("Boolean Array from JS -> Rust 🦀: []");
        return;
    }
    
    let slice = unsafe { std::slice::from_raw_parts(ptr, len) };
    log(&format!("Boolean Array from JS -> Rust 🦀: {:?}", slice));
}

/// Writes a boolean vector to the memory: Rust -> WASM -> JS
#[unsafe(no_mangle)]
pub extern "C" fn write_boolean_vector() -> *const usize {
    let vec = vec![true, false, true];
    let header = vec![vec.as_ptr() as usize, vec.len()];
    let header_ptr = header.as_ptr();

    core::mem::forget(vec);
    core::mem::forget(header);

    header_ptr
}

