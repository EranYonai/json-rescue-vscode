import * as vscode from 'vscode';

// Define the shape of the module we will import dynamically.
type WasmModule = {
  default: (input: { module_or_path: BufferSource }) => Promise<unknown>;
  formatJson: (input: string) => string;
};

async function initializeWasm(context: vscode.ExtensionContext) {
    const wasm: WasmModule = await import('formatter');
    const wasmUri = vscode.Uri.joinPath(context.extensionUri, 'dist', 'formatter_bg.wasm');
    const bits = await vscode.workspace.fs.readFile(wasmUri);
    await wasm.default({ module_or_path: bits });
    return { formatJson: wasm.formatJson };
}

export function activate(context: vscode.ExtensionContext) {
    let wasmPromise: ReturnType<typeof initializeWasm> | undefined;

    const loadWasm = () => {
        if (!wasmPromise) {
            wasmPromise = initializeWasm(context).catch(error => {
                wasmPromise = undefined;
                throw error;
            });
        }
        return wasmPromise;
    };

    const disposable = vscode.commands.registerCommand('malformed-json-formatter.format', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor found.');
            return;
        }

        const document = editor.document;
        const version = document.version;

        try {
            const { formatJson } = await loadWasm();
            if (editor.document !== document || document.version !== version || vscode.window.activeTextEditor !== editor) {
                return;
            }

            const formattedText = formatJson(document.getText());

            const firstLine = document.lineAt(0);
            const lastLine = document.lineAt(document.lineCount - 1);
            const fullRange = new vscode.Range(firstLine.range.start, lastLine.range.end);

            const applied = await editor.edit(editBuilder => {
                editBuilder.replace(fullRange, formattedText);
            });
            if (!applied) {
                throw new Error('The formatted document could not be updated.');
            }
        } catch (err) {
            console.error(err);
            vscode.window.showErrorMessage('Failed to format JSON. See console for details.');
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
