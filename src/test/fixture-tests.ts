import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

type WasmModule = {
    default: (input: BufferSource) => Promise<any>; 
    formatJson: (input: string) => string;
};

export async function runFixtureTests(formatJson: (input: string) => string) {
    const testFixturesPath = path.join(__dirname, '..', '..', 'test-fixtures');
    
    // Find all .jsonc files in test-fixtures
    const files = fs.readdirSync(testFixturesPath)
        .filter(file => file.endsWith('.jsonc'))
        .filter(file => !file.includes('_expected'));
    
    console.log(`Found ${files.length} test fixtures: ${files.join(', ')}`);
    
    for (const file of files) {
        const baseName = file.replace('.jsonc', '');
        const inputFile = path.join(testFixturesPath, file);
        const expectedFile = path.join(testFixturesPath, `${baseName}_expected.json`);
        
        if (!fs.existsSync(expectedFile)) {
            console.warn(`⚠️  Expected file not found for ${file}, skipping...`);
            continue;
        }
        
        console.log(`Testing ${file}...`);
        
        const input = fs.readFileSync(inputFile, 'utf8');
        const expected = fs.readFileSync(expectedFile, 'utf8').trim();
        
        const result = formatJson(input).trim();
        
        if (result !== expected) {
            throw new Error(`Test failed for ${file}:\nExpected:\n${expected}\n\nGot:\n${result}`);
        }
        
        console.log(`✅ ${file} passed`);
    }
}