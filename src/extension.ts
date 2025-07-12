import * as vscode from 'vscode';

// Define the shape of the module we will import dynamically.
// This helps TypeScript understand the structure.
type WasmModule = {
  default: () => Promise<any>; // Changed from Promise<void> to Promise<any>
  formatJson: (input: string) => string;
};

// Create a lazy-loaded promise that resolves with the initialized Wasm module's functions.
// This ensures we only load and compile the module once when it's first needed.
const lazyWasm: Promise<{ formatJson: (input: string) => string }> = (async () => {
    // Use the dynamic import() syntax with the package name from package.json
    const wasm: WasmModule = await import('formatter');
    
    // The default export is the initialization function. It must be called once.
    await wasm.default();
    
    // Return the part of the module we need, the formatJson function.
    return {
        formatJson: wasm.formatJson
    };
})();


export function activate(context: vscode.ExtensionContext) {
    console.log('"malformed-json-formatter" is now active!');

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
