/// Allocate memory (capacity in bytes)
#[unsafe(no_mangle)]
pub extern "C" fn alloc(capacity: usize) -> *mut u8 {
    if capacity == 0 {
        return std::ptr::null_mut();
    }

    let mut buf: Vec<u8> = Vec::with_capacity(capacity);
    let ptr = buf.as_mut_ptr();

    core::mem::forget(buf);

    ptr
}

/// Free memory (capacity in bytes)
#[unsafe(no_mangle)]
pub extern "C" fn dealloc(ptr: *mut u8, capacity: usize) {
    if ptr.is_null() || capacity == 0 {
        return;
    }

    unsafe {
        let _ = Vec::<u8>::from_raw_parts(ptr, 0, capacity);
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_alloc_returns_non_null() {
        let ptr = alloc(100);
        assert!(!ptr.is_null());
        dealloc(ptr, 100);
    }

    #[test]
    fn test_alloc_zero_returns_null() {
        let ptr = alloc(0);
        assert!(ptr.is_null());
    }

    #[test]
    fn test_dealloc_null_is_safe() {
        // Should not panic
        dealloc(std::ptr::null_mut(), 0);
        dealloc(std::ptr::null_mut(), 100);
    }

    #[test]
    fn test_alloc_dealloc_roundtrip() {
        let ptr = alloc(1024);
        assert!(!ptr.is_null());

        // Write some data
        unsafe {
            std::ptr::write_bytes(ptr, 42, 1024);
        }

        // Should not panic
        dealloc(ptr, 1024);
    }

    #[test]
    fn test_alloc_multiple() {
        let ptr1 = alloc(100);
        let ptr2 = alloc(200);
        let ptr3 = alloc(300);

        assert!(!ptr1.is_null());
        assert!(!ptr2.is_null());
        assert!(!ptr3.is_null());

        // Pointers should be different
        assert_ne!(ptr1, ptr2);
        assert_ne!(ptr2, ptr3);

        dealloc(ptr1, 100);
        dealloc(ptr2, 200);
        dealloc(ptr3, 300);
    }
}

