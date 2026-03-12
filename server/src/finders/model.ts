import * as fs from 'fs';
import * as path from 'path';
import { Location, Range } from 'vscode-languageserver/node';
import { workspaceRoot, pathToFileURI } from '../utils/fs';

export function findModelDefinition(modelRef: string): Location[] {
	const name = modelRef.replace(/^Models[\/\\]?/, '');
	const full = path.join(workspaceRoot || '', `app/Models/${name}.php`);
	return fs.existsSync(full) ? [{ uri: pathToFileURI(full), range: Range.create(0, 0, 0, 0) }] : [];
}
