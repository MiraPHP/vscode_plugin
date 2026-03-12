import * as fs from 'fs';
import * as path from 'path';
import { Location, Position, Range } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { workspaceRoot, pathToFileURI } from '../utils/fs';

export function findAssetCallLocation(document: TextDocument, position: Position): string | null {
	const text = document.getText();
	const offset = document.offsetAt(position);
	const chunk = text.substring(Math.max(0, offset - 200), Math.min(text.length, offset + 50));
	const startOffset = Math.max(0, offset - 200);

	const patterns = [
		/asset\s*\(\s*["']([^"']+)["']/g,
		/(?:href|src)\s*=\s*["']<?=\s*asset\s*\(\s*["']([^"']+)["']/g,
		/{{\s*asset\s*\(\s*["']([^"']+)["']/g,
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

export function findAssetDefinition(assetPath: string): Location[] {
	const dirs = ['public', 'web/assets', 'assets', 'resources', 'web'];
	for (const dir of dirs) {
		const full = path.join(workspaceRoot || '', dir, assetPath);
		if (fs.existsSync(full))
			return [{ uri: pathToFileURI(full), range: Range.create(0, 0, 0, 0) }];
	}
	return [];
}
