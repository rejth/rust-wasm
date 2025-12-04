#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build mode (release by default)
MODE=${1:-release}

echo -e "${YELLOW}🦀 Building wasm-bridge...${NC}"

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Error: Cargo is not installed. Please install Rust.${NC}"
    exit 1
fi

# Check if wasm32 target is installed
if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
    echo -e "${YELLOW}Installing wasm32-unknown-unknown target...${NC}"
    rustup target add wasm32-unknown-unknown
fi

# Build based on mode
if [ "$MODE" = "debug" ]; then
    echo -e "${YELLOW}Building in debug mode...${NC}"
    cargo build --target wasm32-unknown-unknown
    WASM_PATH="target/wasm32-unknown-unknown/debug/wasm_bridge.wasm"
else
    echo -e "${YELLOW}Building in release mode...${NC}"
    cargo build --target wasm32-unknown-unknown --release
    WASM_PATH="target/wasm32-unknown-unknown/release/wasm_bridge.wasm"
fi

# Check if build succeeded
if [ -f "$WASM_PATH" ]; then
    SIZE=$(du -h "$WASM_PATH" | cut -f1)
    echo -e "${GREEN}✓ Build successful!${NC}"
    echo -e "${GREEN}  Output: $WASM_PATH${NC}"
    echo -e "${GREEN}  Size: $SIZE${NC}"
else
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Done!${NC}"

