import * as fs from 'fs';
import * as path from 'path';
import { Location, Range } from 'vscode-languageserver/node';
import { workspaceRoot, pathToFileURI } from '../utils/fs';

export function findControllerDefinition(controllerRef: string): Location[] {
	const [controllerPart, method] = controllerRef.split('@');
	if (!controllerPart || !method) return [];

	let filePath = controllerPart.replace(/[\/\\]/g, '/');
	if (!filePath.startsWith('Controllers/')) filePath = 'Controllers/' + filePath;

	const fullPath = path.join(workspaceRoot || '', `app/${filePath}.php`);

	const tryFile = (fp: string): Location[] | null => {
		if (!fs.existsSync(fp)) return null;
		const lines = fs.readFileSync(fp, 'utf-8').split('\n');
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].includes(`function ${method}`) || lines[i].includes(` ${method}(`)) {
				const col = lines[i].indexOf(method);
				return [{ uri: pathToFileURI(fp), range: Range.create(i, col, i, col + method.length) }];
			}
		}
		return [{ uri: pathToFileURI(fp), range: Range.create(0, 0, 0, 0) }];
	};

	return tryFile(fullPath)
		?? tryFile(path.join(workspaceRoot || '', `app/Controllers/${controllerPart}.php`))
		?? [];
}
