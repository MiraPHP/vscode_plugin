import * as fs from 'fs';
import * as path from 'path';
import { Location, Range } from 'vscode-languageserver/node';
import { workspaceRoot, pathToFileURI } from '../utils/fs';

const ROUTE_FILES = [
	'web/index.php', 'web/routes/apis.php', 'web/routes/pages.php',
	'web/routes/sub.php', 'web/routes/admins.php', 'web/routes/demos.php',
];

function searchRouteFiles(predicate: (line: string) => boolean): Location[] {
	for (const rel of ROUTE_FILES) {
		const full = path.join(workspaceRoot || '', rel);
		if (!fs.existsSync(full)) continue;
		const lines = fs.readFileSync(full, 'utf-8').split('\n');
		for (let i = 0; i < lines.length; i++) {
			if (predicate(lines[i]))
				return [{ uri: pathToFileURI(full), range: Range.create(i, 0, i, lines[i].length) }];
		}
	}
	return [];
}

export function findRouteByName(name: string): Location[] {
	return searchRouteFiles(l =>
		(l.includes(`->name('${name}')`) || l.includes(`->name("${name}")`)) &&
		l.includes('router->')
	);
}

export function findRouteByController(ref: string): Location[] {
	return searchRouteFiles(l => l.includes(ref) && l.includes('router->'));
}
