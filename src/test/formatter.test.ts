import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Define the shape of the module we will import dynamically.
type WasmModule = {
    default: (input: BufferSource) => Promise<any>; 
    formatJson: (input: string) => string;
};

suite('Malformed JSON Formatter Test Suite', () => {
    let formatJson: (input: string) => string;

    suiteSetup(async function() {
        // Increase timeout for WASM loading
        this.timeout(10000);
        
        // Initialize the WASM module
        const wasm: WasmModule = await import('formatter');
        
        // Get the extension context to find the WASM file
        const extension = vscode.extensions.getExtension('your-publisher.malformed-json-formatter');
        if (!extension) {
            throw new Error('Extension not found');
        }
        
        const wasmUri = vscode.Uri.joinPath(extension.extensionUri, 'dist', 'formatter_bg.wasm');
        const bits = await vscode.workspace.fs.readFile(wasmUri);
        
        await wasm.default(bits);
        formatJson = wasm.formatJson;
    });

    test('Format missing commas in JSON', async () => {
        const testFixturesPath = path.join(__dirname, '..', '..', 'test-fixtures');
        
        const inputFile = path.join(testFixturesPath, 'missing_commas.jsonc');
        const expectedFile = path.join(testFixturesPath, 'missing_commas_expected.json');
        
        const input = fs.readFileSync(inputFile, 'utf8');
        const expected = fs.readFileSync(expectedFile, 'utf8').trim();
        
        const result = formatJson(input).trim();
        
        assert.strictEqual(result, expected, 'Formatted JSON should match expected output');
    });

    test('Format already valid JSON', async () => {
        const validJson = `{
    "key": "value",
    "array": [1, 2, 3]
}`;
        
        const result = formatJson(validJson);
        
        // Should not throw and should return formatted JSON
        assert.ok(result.includes('"key"'), 'Result should contain the key');
        assert.ok(result.includes('"value"'), 'Result should contain the value');
    });

    test('Handle empty input', async () => {
        const result = formatJson('');
        
        // Should handle empty input gracefully
        assert.ok(typeof result === 'string', 'Result should be a string');
    });

    test('Handle invalid JSON structure', async () => {
        const invalidJson = `{
    "key": "value"
    "missing": "comma"
    "nested": {
        "also": "missing"
        "comma": true
    }
}`;
        
        const result = formatJson(invalidJson);
        
        // Should attempt to fix the JSON
        assert.ok(result.includes('"key"'), 'Result should contain keys');
        assert.ok(result.includes('"value"'), 'Result should contain values');
    });
});