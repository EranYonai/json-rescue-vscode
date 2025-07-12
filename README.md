# Malformed JSON Formatter

A VS Code extension powered by Rust and WebAssembly that formats and fixes malformed JSON files with enhanced parsing capabilities.

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

- **Node.js** (v16 or higher) and **npm**
- **Rust** toolchain via [rustup](https://rustup.rs/)
- **wasm-pack** for compiling Rust to WebAssembly:
  ```bash
  cargo install wasm-pack
  ```

### Building from Source

1. **Clone the repository**:
   ```bash
   git clone https://github.com/EranYonai/malformed-json-formatter-vsext.git
   cd malformed-json-formatter-vsext
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
3. Search for "Format Malformed JSON" and select it
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

2. **For Rust changes**, rebuild the WASM module:
   ```bash
   npm run build-wasm
   ```

### Debugging

#### Debugging Steps

1. **Build the extension**:
   ```bash
   npm run build-all
   ```

2. **Start debugging**:
   - Press `F5` or go to Run and Debug panel (`Ctrl+Shift+D`)
   - Select "Run Extension" and click play
   - This opens a new "[Extension Development Host]" VS Code window

3. **Test the extension**:
   - In the Extension Development Host window, open a JSON file
   - Use `Ctrl+Shift+P` → "Format Malformed JSON"

4. **View debug output**:
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
