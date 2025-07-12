import * as path from 'path';
import * as fs from 'fs';

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
    default: (input: BufferSource) => Promise<any>; 
    formatJson: (input: string) => string;
};

async function runTests() {
    console.log('Starting malformed JSON formatter tests...');
    
    try {
        // Initialize the WASM module
        const wasm: WasmModule = await import('formatter');
        
        // Load WASM binary
        const wasmPath = path.join(__dirname, '..', '..', 'dist', 'formatter_bg.wasm');
        const wasmBinary = fs.readFileSync(wasmPath);
        
        await wasm.default(wasmBinary);
        const formatJson = wasm.formatJson;
        
        // Run tests
        await testMissingCommas(formatJson);
        await testValidJson(formatJson);
        await testEmptyInput(formatJson);
        
        console.log('✅ All tests passed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Tests failed:', error);
        process.exit(1);
    }
}

async function testMissingCommas(formatJson: (input: string) => string) {
    console.log('Testing missing commas...');
    
    const testFixturesPath = path.join(__dirname, '..', '..', 'test-fixtures');
    const inputFile = path.join(testFixturesPath, 'missing_commas.jsonc');
    const expectedFile = path.join(testFixturesPath, 'missing_commas_expected.json');
    
    const input = fs.readFileSync(inputFile, 'utf8');
    const expected = fs.readFileSync(expectedFile, 'utf8').trim();
    
    const result = formatJson(input).trim();
    
    if (result !== expected) {
        throw new Error(`Expected:\n${expected}\n\nGot:\n${result}`);
    }
    
    console.log('✅ Missing commas test passed');
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