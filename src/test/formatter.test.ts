import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Formatter command', () => {
	test('does nothing without an active editor', async () => {
		assert.strictEqual(vscode.window.activeTextEditor, undefined);
		assert.strictEqual(
			await vscode.commands.executeCommand('malformed-json-formatter.format'),
			undefined,
		);
	});
});
