# WebGL Sandbox

This project uses **[wasm-pack](https://github.com/drager/wasm-pack)** to build Rust code to WebAssembly and follows the **[rust-webpack template](https://github.com/drager/rust-webpack-template)** structure (this project uses Vite instead of Webpack).

See the [wasm-pack documentation](https://drager.github.io/wasm-pack/book/introduction.html) for more information.

## How to install

```sh
npm install
```

## How to run in debug mode

```sh
# Builds the project and opens it in a new browser tab. Auto-reloads when the project changes.
npm run dev
```

## How to build in release mode

```sh
# Builds the project and places it into the `dist` folder.
npm run build
```

## How to run unit tests

```sh
# Runs tests using wasm-pack test
npm test
```

## What does each file do?

- `Cargo.toml` contains the standard Rust metadata. You put your Rust dependencies in here. You must change this file with your details (name, description, version, authors, categories)

- The `js` folder contains your JavaScript code (`index.js` is used to hook everything into Webpack, you don't need to change it).

- The `src` folder contains your Rust code.

- The `static` folder contains any files that you want copied as-is into the final build.

- The `tests` folder contains your Rust unit tests.
