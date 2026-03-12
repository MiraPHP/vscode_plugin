import * as fs from 'fs';
import * as path from 'path';
import { Location, Position, Range } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { workspaceRoot, pathToFileURI } from '../utils/fs';

export function findViewCallLocation(document: TextDocument, position: Position): string | null {
	const text = document.getText();
	const offset = document.offsetAt(position);
	const chunk = text.substring(Math.max(0, offset - 200), Math.min(text.length, offset + 50));
	const startOffset = Math.max(0, offset - 200);

	const patterns = [
		/view\s*\(\s*["']([^"']+)["']/g,
		/View::make\s*\(\s*["']([^"']+)["']/g,
		/\$this->(?:view|render)\s*\(\s*["']([^"']+)["']/g,
	];

	for (const pattern of patterns) {
		let match;
		while ((match = pattern.exec(chunk)) !== null) {
			const start = startOffset + match.index;
			if (offset >= start && offset <= start + match[0].length) return match[1];
		}
	}
	return null;
}

export function findViewDefinition(viewRef: string): Location[] {
	const normalized = viewRef.replace(/\./g, '/');
	const candidates = [
		`web/views/${normalized}.php`,
		`web/views/${normalized}.blade.php`,
		`resources/views/${normalized}.php`,
		`resources/views/${normalized}.blade.php`,
	];

	for (const rel of candidates) {
		const full = path.join(workspaceRoot || '', rel);
		if (fs.existsSync(full))
			return [{ uri: pathToFileURI(full), range: Range.create(0, 0, 0, 0) }];
	}
	return [];
}
