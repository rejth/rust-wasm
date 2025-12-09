// Example 1: print "Hello, World!" using "console_log" function from JS
// Declare a function that is provided by the WASM environment
unsafe extern "C" {
    fn console_log(ptr: *const u8, len: usize);
}
#[unsafe(no_mangle)]
pub extern "C" fn say_hello() {
    let msg = "Hello, World!";
    unsafe {
        console_log(msg.as_ptr(), msg.len());
    }
}

// Example 2: Sum of array elements passed from JS to WASM environment
#[unsafe(no_mangle)]
pub extern "C" fn sum(ptr: *mut i32, len: usize) -> i32 {
    let slice = unsafe { std::slice::from_raw_parts(ptr, len) };
    let mut sum = 0;

    for el in slice {
        sum += *el;
    }

    sum
}

// Example 3: Add 2 to each element of the array passed from JS to WASM environment
#[unsafe(no_mangle)]
pub extern "C" fn add_two(ptr: *mut i32, len: usize) {
    let slice = unsafe { std::slice::from_raw_parts_mut(ptr, len) };

    for el in slice {
        *el += 2;
    }
}

// Example 4: Provide a vector to WASM environment
#[unsafe(no_mangle)]
pub extern "C" fn get_vector() -> *const usize {
    let vec = vec![42, 10, -30];
    let header = vec![vec.as_ptr() as usize, vec.len()];
    let pointer = header.as_ptr();

    // Cancel memory cleanup. Otherwise, we won't be able to use the vector after returning it.
    core::mem::forget(vec);
    core::mem::forget(header);

    pointer
}
