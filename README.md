# Rust + WebAssembly Learning

## Prerequisites

### Install Rust

Install Rust using [rustup](https://rustup.rs/) (the official installer):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

After installation, restart your terminal or run:

```bash
source $HOME/.cargo/env
```

Verify installation:

```bash
rustc --version
cargo --version
```

### Install WebAssembly Binary Toolkit (WABT)

[WABT](https://github.com/WebAssembly/wabt) includes the `wat2wasm` tool for compiling WASM Text format (`.wat`) files into WASM binary (`.wasm`) files.

**On macOS (using Homebrew):**

```bash
brew install wabt
```

**Verify installation:**

```bash
wat2wasm --version
```

**Compiling .wat files to .wasm:**

```bash
# Compile a .wat file to .wasm
wat2wasm input.wat -o output.wasm

# With verbose output
wat2wasm input.wat -o output.wasm -v
```

**Compiling .wasm files to .wat:**

```bash
# Compile a .wasm file to .wat
wasm2wat input.wasm -o output.wat

# With verbose output
wasm2wat input.wasm -o output.wat -v
```

### Install Node.js 24.11.0+

Direct WASM imports require Node.js v24.11.0+.

**Using nvm (recommended):**

Install [nvm](https://www.nvmnode.com/) to manage multiple Node.js versions

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 24.11.0 or later
nvm install 24.11.0
nvm use 24.11.0
nvm alias default 24.11.0
```

**Using official installer:**

Download from [https://nodejs.org/](https://nodejs.org/) (choose version 24.11.0 or later)

**Verify installation:**

```bash
node --version
npm --version
```

## Creating New Rust Projects

```bash
cargo new --vcs none my-project
```

For creating a library:

```bash
cargo new --lib --vcs none my-library
```

## Formatting

Check if formatting is needed (without modifying files):

```bash
cargo fmt -- --check
```

Format a Rust project:

```bash
cargo fmt
```
