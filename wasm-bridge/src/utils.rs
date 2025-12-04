unsafe extern "C" {
  fn console_log(ptr: *const u8, len: usize);
}

pub fn log(message: &str) {
  unsafe {
      console_log(message.as_ptr(), message.len());
  }
}