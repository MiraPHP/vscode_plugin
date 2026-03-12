import * as fs from 'fs';
import * as path from 'path';
import { Location, Range } from 'vscode-languageserver/node';
import { workspaceRoot, pathToFileURI } from '../utils/fs';

export function findHelperDefinition(ref: string): Location[] {
	if (!ref.includes('\\') || !ref.includes('.')) return [];

	const [helperPath, functionName] = ref.split('.');
	const clean = helperPath.replace(/^Helpers[\/\\]?/, '').replace(/\\/g, '/');
	const full = path.join(workspaceRoot || '', `app/Helpers/${clean}.php`);

	if (!fs.existsSync(full)) return [];

	const lines = fs.readFileSync(full, 'utf-8').split('\n');
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(`function ${functionName}`)) {
			const col = lines[i].indexOf(functionName);
			return [{ uri: pathToFileURI(full), range: Range.create(i, col, i, col + functionName.length) }];
		}
	}
	return [{ uri: pathToFileURI(full), range: Range.create(0, 0, 0, 0) }];
}
