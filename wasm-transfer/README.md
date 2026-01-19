# wasm-transfer

## About

Transferring complex data from Rust to JavaScript via WebAssembly.

Create a Rust struct that is exported to JavaScript as a class with methods. The struct should contain a field of type `Vec<AnotherStruct>`.

Implement a method to read this vector in two ways:

- via `serde_wasm_bindgen` (returns a regular JS array of objects)
- via binary serialization (any method) + create a convenient JS wrapper class for reading the binary data

This project uses [wasm-pack](https://github.com/drager/wasm-pack) and the [wasm-pack-template](https://github.com/drager/wasm-pack-template) to compile Rust code into WebAssembly and scaffold the project structure.

`wasm-pack-template` is designed for compiling Rust libraries into WebAssembly and publishing the resulting package to NPM.

[Tutorials](https://drager.github.io/wasm-pack/book/tutorials/index.html) \
[Template documentation](https://drager.github.io/wasm-pack/book/tutorials/npm-browser-packages/index.html)

## 🚴 Usage

### 🐑 Use `cargo generate` generate a new project from the template

[Learn more about `cargo generate` here.](https://github.com/ashleygwilliams/cargo-generate)

```bash
cargo generate --git https://github.com/rustwasm/wasm-pack-template.git --name my-project
cd my-project
```

### 🛠️ Build with `wasm-pack build`

If you're developing a project for the web:

```bash
wasm-pack build
```

If you're developing a project for Node.js:

```bash
wasm-pack build --target nodejs
```

### 🔬 Test in headless browsers or in a Node.js environment with `wasm-pack test`

If you're developing a project for the web:

```bash
wasm-pack test --headless --chrome
```

If you're developing a project for Node.js:

```bash
wasm-pack test --node
```

### 🎁 Publish to NPM with `wasm-pack publish`

```bash
wasm-pack publish
```
