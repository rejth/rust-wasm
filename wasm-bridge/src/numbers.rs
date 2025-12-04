use crate::utils::log;

/// Reads i32 array from the memory: JS -> WASM -> Rust
#[unsafe(no_mangle)]
pub extern "C" fn read_i32_array(ptr: *const i32, len: usize) {
    if len == 0 {
        log("i32 Array from JS -> Rust 🦀: []");
        return;
    }

    let slice = unsafe { std::slice::from_raw_parts(ptr, len) };
    log(&format!("i32 Array from JS -> Rust 🦀: {:?}", slice));
}

/// Writes i32 vector to the memory: Rust -> WASM -> JS
#[unsafe(no_mangle)]
pub extern "C" fn write_i32_vector() -> *const usize {
    let vec = vec![42, 10, -30];
    let header = vec![vec.as_ptr() as usize, vec.len()];
    let header_ptr = header.as_ptr();

    core::mem::forget(vec);
    core::mem::forget(header);

    header_ptr
}

