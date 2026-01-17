# wasm-transfer

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

```bash
wasm-pack build
```

### 🔬 Test in headless browsers with `wasm-pack test`

```bash
wasm-pack test --headless --firefox
```

### 🎁 Publish to NPM with `wasm-pack publish`

```bash
wasm-pack publish
```
