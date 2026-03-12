import * as path from 'path';

export let workspaceRoot: string | undefined;

export function setWorkspaceRoot(uri: string | null | undefined) {
	if (!uri) return;
	let root = decodeURIComponent(uri.replace('file://', ''));
	if (root.startsWith('/') && process.platform === 'win32') root = root.substring(1);
	workspaceRoot = root;
}

export function pathToFileURI(filePath: string): string {
	return process.platform === 'win32'
		? `file:///${filePath.replace(/\\/g, '/')}`
		: `file://${filePath}`;
}

export function isWordCharacter(char: string): boolean {
	return /[a-zA-Z0-9_@\/\\\.]/.test(char);
}

export function resolvePath(...parts: string[]): string {
	return path.join(workspaceRoot || '', ...parts);
}
