import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension command', () => {
	test('formats malformed JSON in the active editor', async () => {
		const document = await vscode.workspace.openTextDocument({
			language: 'json',
			content: '{\n  "name": "Ada"\n  "age": 37\n}',
		});
		const editor = await vscode.window.showTextDocument(document);

		try {
			await vscode.commands.executeCommand('malformed-json-formatter.format');
			assert.strictEqual(editor.document.getText(), '{\n    "name": "Ada",\n    "age": 37\n}\n');
		} finally {
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		}
	});
});
