# JSON Rescue: Format, Validate & Repair

A VS Code extension powered by Rust and WebAssembly that formats, validates, and repairs malformed JSON files.

## Overview

This extension provides robust JSON formatting for files that might not parse correctly with standard JSON formatters. Built with Rust for performance and reliability, it compiles to WebAssembly to run efficiently within VS Code.

## Features

- **Robust JSON Parsing**: Handles malformed or poorly formatted JSON that other formatters might reject
- **Rust-Powered Performance**: Fast processing using Rust compiled to WebAssembly
- **VS Code Integration**: Simple command palette integration for seamless workflow
- **Error Handling**: Graceful error reporting when JSON cannot be parsed or formatted

## Installation

### Prerequisites

Before building this extension, ensure you have the following tools installed:

- **Node.js** (v22.14.0, see `.nvmrc`) and **npm**
- **Rust** toolchain via [rustup](https://rustup.rs/)
- **wasm-pack** for compiling Rust to WebAssembly:
  ```bash
  cargo install wasm-pack --version 0.13.1 --locked
  ```

### Building from Source

1. **Clone the repository**:
   ```bash
   git clone https://github.com/EranYonai/json-rescue-vscode.git
   cd json-rescue-vscode
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   npm run build-all
   ```

   This command:
   - Compiles the Rust code to WebAssembly (`npm run build-wasm`)
   - Builds the TypeScript extension code (`npm run build-ts`)
   - Copies the WASM files to the correct distribution directory

## Usage

1. Open a file containing malformed JSON in VS Code
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Search for "JSON Rescue: Format Malformed JSON" and select it
4. The extension will format the JSON in-place

## Development

### Project Structure

```
├── src/
│   ├── extension.ts          # VS Code extension entry point
│   └── formatter/            # Rust WebAssembly module
│       ├── src/
│       │   └── lib.rs        # Rust JSON formatting logic
│       ├── Cargo.toml        # Rust dependencies
│       └── pkg/              # Generated WebAssembly output
├── dist/                     # Built extension files
├── webpack.config.js         # Webpack configuration
└── package.json             # Extension manifest
```

### Development Workflow

1. **Start development build with file watching**:
   ```bash
   npm run watch
   ```

   After making changes, run **Developer: Reload Window** in the Extension Development Host.

2. **For Rust changes**, rebuild the WASM module:
   ```bash
   npm run build-wasm
   ```

### Testing

On macOS, set the Command Line Tools used by the Rust/WASM build first:

```bash
export SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk
export CC=/Library/Developer/CommandLineTools/usr/bin/clang
export CXX=/Library/Developer/CommandLineTools/usr/bin/clang++
export AR=/Library/Developer/CommandLineTools/usr/bin/ar
export RANLIB=/Library/Developer/CommandLineTools/usr/bin/ranlib
export CARGO_TARGET_AARCH64_APPLE_DARWIN_LINKER=/Library/Developer/CommandLineTools/usr/bin/clang
```

Run all test layers from the repository root:

```bash
cargo test --manifest-path src/formatter/Cargo.toml --locked
npm test
npm run test:integration
```

### Live Extension Testing

Build and open a separate VS Code Extension Development Host window:

```bash
npm run build-all
code --new-window --extensionDevelopmentPath="$PWD"
```

In the new window, open a JSON or JSONC file, then run **JSON Rescue: Format Malformed JSON** from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).

For iterative TypeScript changes, run `npm run watch` and then **Developer: Reload Window** in the development host. After Rust changes, run `npm run build-wasm` before reloading.

To enable the `code` command, run **Shell Command: Install 'code' command in PATH** from your regular VS Code window.

### Debugging

- **Debug Console**: In your main VS Code window for `console.log()` output
- **Developer Tools**: In Extension Development Host → Help → Toggle Developer Tools
- **Breakpoints**: Set breakpoints in `src/extension.ts` for step-by-step debugging

## Build Scripts

- `npm run build-all`: Complete build (WASM + TypeScript)
- `npm run build-wasm`: Build only the Rust WebAssembly module
- `npm run build-ts`: Build only the TypeScript extension code
- `npm run watch`: Watch TypeScript files for changes and rebuild
- `npm run vscode:prepublish`: Production build for publishing

## Architecture

This extension uses a hybrid architecture:

- **TypeScript**: VS Code extension host and UI integration
- **Rust + WebAssembly**: High-performance JSON parsing and formatting
- **Webpack**: Bundles the extension and manages WASM loading

The Rust code is compiled to WebAssembly using `wasm-pack` with the `web` target, making it compatible with VS Code's extension environment.
