import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { runFixtureTests } from './fixture-tests';

// Mock minimal parts of VS Code API needed for testing
const mockVscode = {
    Uri: {
        joinPath: (base: any, ...segments: string[]) => ({
            fsPath: path.join(base.fsPath, ...segments)
        })
    },
    workspace: {
        fs: {
            readFile: async (uri: any) => {
                const content = fs.readFileSync(uri.fsPath);
                return new Uint8Array(content);
            }
        }
    }
};

// Define the shape of the WASM module
type WasmModule = {
    default: (input: { module_or_path: BufferSource }) => Promise<any>;
    formatJson: (input: string) => string;
};

async function runTests() {
    console.log('Starting malformed JSON formatter tests...');
    
    try {
        // Load the generated package directly; it is not installed as an npm dependency.
        const formatterPath = path.join(__dirname, '..', '..', 'src', 'formatter', 'pkg', 'formatter.js');
        const wasm: WasmModule = await import(pathToFileURL(formatterPath).href);
        
        // Load the generated WASM binary
        const wasmPath = path.join(__dirname, '..', '..', 'src', 'formatter', 'pkg', 'formatter_bg.wasm');
        const wasmBinary = fs.readFileSync(wasmPath);
        
        await wasm.default({ module_or_path: wasmBinary });
        const formatJson = wasm.formatJson;
        
        // Run tests
        await runFixtureTests(formatJson);
        await testValidJson(formatJson);
        await testEmptyInput(formatJson);
        
        console.log('✅ All tests passed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Tests failed:', error);
        process.exit(1);
    }
}

async function testValidJson(formatJson: (input: string) => string) {
    console.log('Testing valid JSON...');
    
    const validJson = `{
    "key": "value",
    "array": [1, 2, 3]
}`;
    
    const result = formatJson(validJson);
    
    if (!result.includes('"key"') || !result.includes('"value"')) {
        throw new Error('Valid JSON test failed');
    }
    
    console.log('✅ Valid JSON test passed');
}

async function testEmptyInput(formatJson: (input: string) => string) {
    console.log('Testing empty input...');
    
    const result = formatJson('');
    
    if (typeof result !== 'string') {
        throw new Error('Empty input test failed');
    }
    
    console.log('✅ Empty input test passed');
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}
