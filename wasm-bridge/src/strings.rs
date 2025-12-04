use crate::utils::log;

/// Reads a string array from the memory: JS -> WASM -> Rust
#[unsafe(no_mangle)]
pub extern "C" fn read_string_array(data_ptr: *const u8, lengths_ptr: *const u32, count: usize) {
    if count == 0 {
        log("String Array from JS -> Rust 🦀: []");
        return;
    }

    let lengths = unsafe { std::slice::from_raw_parts(lengths_ptr, count) };

    let mut strings: Vec<String> = Vec::with_capacity(count);
    let mut offset = 0;

    for &len in lengths {
        let bytes = unsafe { std::slice::from_raw_parts(data_ptr.add(offset), len as usize) };
        let string = std::str::from_utf8(bytes).unwrap().to_string();
        strings.push(string);

        offset += len as usize;
    }

    log(&format!("String Array from JS -> Rust 🦀: {:?}", strings));
}

/// Writes a string vector to the memory: Rust -> WASM -> JS
#[unsafe(no_mangle)]
pub extern "C" fn write_string_vector() -> *const usize {
    let strings = vec!["Hello", "from", "Rust", "🦀"];

    // Concatenate all string bytes
    let data: Vec<u8> = strings.iter().flat_map(|s| s.as_bytes()).copied().collect();
    // Collect lengths
    let lengths: Vec<u32> = strings.iter().map(|s| s.len() as u32).collect();

    // Header: [data_ptr, data_len, lengths_ptr, count]
    let header = vec![
        data.as_ptr() as usize,
        data.len(),
        lengths.as_ptr() as usize,
        lengths.len(),
    ];

    let header_ptr = header.as_ptr();

    core::mem::forget(data);
    core::mem::forget(lengths);
    core::mem::forget(header);

    header_ptr
}

/// Reads a string from the memory: JS -> WASM -> Rust
#[unsafe(no_mangle)]
pub extern "C" fn read_string(ptr: *const u8, len: usize) {
    if len == 0 {
        log("String from JS -> Rust 🦀: ''");
        return;
    }

    let bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
    let string = std::str::from_utf8(bytes).unwrap();
    log(&format!("String from JS -> Rust 🦀: {}", string));
}

/// Writes a string to the memory: Rust -> WASM -> JS
#[unsafe(no_mangle)]
pub extern "C" fn write_string() -> *const usize {
    let text = String::from("String from Rust! 🦀");
    let bytes = text.as_bytes();
    let header = vec![bytes.as_ptr() as usize, bytes.len()];
    let header_ptr = header.as_ptr();

    core::mem::forget(text);
    core::mem::forget(header);

    header_ptr
}

