import * as vscode from 'vscode';

// Define the shape of the module we will import dynamically.
type WasmModule = {
  // The init function accepts the wasm binary as a BufferSource
  // and returns a promise that resolves when initialization is complete.
  default: (input: BufferSource) => Promise<any>; 
  formatJson: (input: string) => string;
};

export function activate(context: vscode.ExtensionContext) {
    console.log('"malformed-json-formatter" is now active!');

    // Create a lazy-loaded promise that resolves with the initialized Wasm module's functions.
    const lazyWasm: Promise<{ formatJson: (input: string) => string }> = (async () => {
        // Use the dynamic import() syntax with the package name from package.json
        const wasm: WasmModule = await import('formatter');

        // Construct a URI to the wasm file, which is now in our dist folder
        const wasmUri = vscode.Uri.joinPath(context.extensionUri, 'dist', 'formatter_bg.wasm');
        
        // Read the wasm file's bytes from the disk
        const bits = await vscode.workspace.fs.readFile(wasmUri);

        // Initialize the module with the file's contents, avoiding the fetch call
        await wasm.default(bits);
        
        // Return the part of the module we need, the formatJson function.
        return {
            formatJson: wasm.formatJson
        };
    })();


    const disposable = vscode.commands.registerCommand('malformed-json-formatter.format', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor found.');
            return;
        }

        try {
            // Wait for the module to be ready and get its exports
            const { formatJson } = await lazyWasm;

            const document = editor.document;
            const unformattedText = document.getText();

            // Call the Rust function
            const formattedText = formatJson(unformattedText);

            const firstLine = document.lineAt(0);
            const lastLine = document.lineAt(document.lineCount - 1);
            const fullRange = new vscode.Range(firstLine.range.start, lastLine.range.end);

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
