import * as vscode from 'vscode';

// Define the shape of the module we will import dynamically.
type WasmModule = {
  format_json: (input: string) => string;
  default: (init?: any) => Promise<any>;
};

export function activate(context: vscode.ExtensionContext) {
  console.log('"malformed-json-formatter" is now active!');

  // Create a lazy-loaded promise that resolves with the initialized Wasm module.
  // This ensures we only load and compile the module once.
  const lazyWasm: Promise<WasmModule> = (async () => {
    // Use the dynamic import() syntax
    const wasm = await import('../pkg/formatter.js');

    const wasmUri = vscode.Uri.joinPath(context.extensionUri, 'dist', 'pkg', 'formatter_bg.wasm');

    try {
      // Initialize for VS Code Desktop
      await wasm.default(vscode.workspace.fs.readFile(wasmUri));
    } catch (e) {
      // Initialize for VS Code on the Web
      await wasm.default(wasmUri);
      console.error("Error initializing Wasm for desktop, falling back to web:", e);
    }
    
    return wasm;
  })();

  const disposable = vscode.commands.registerCommand('malformed-json-formatter.format', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found.');
      return;
    }

    try {
      // Wait for the module to be ready and get its exports
      const { format_json } = await lazyWasm;

      const document = editor.document;
      const unformattedText = document.getText();

      // Call the Rust function
      const formattedText = format_json(unformattedText);

      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(unformattedText.length)
      );

      editor.edit(editBuilder => {
        editBuilder.replace(fullRange, formattedText);
      });

    } catch (err) {
      console.error(err);
      vscode.window.showErrorMessage('Failed to format JSON. See console for details.');
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}