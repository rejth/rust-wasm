# WASM Data Bridge library

Implement a Rust/JS library for transferring arrays of different types and strings between Rust and JavaScript via WebAssembly.
The library should consist of modules on the Rust and JS languages and provide the following capabilities:

1. Transfer data from Rust to JavaScript:

   - Arrays `i32`, `i64`, `f32`, `f64`
   - Arrays of boolean values
   - Strings and arrays of strings

2. Transfer data from JavaScript to Rust

3. Implement memory management: if data in JS was read, the memory occupied by it should be freed

Implement the interface of the library yourself.
