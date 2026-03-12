import { DefinitionParams, Location } from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { isWordCharacter } from '../utils/fs';
import { findControllerDefinition } from '../finders/controller';
import { findViewDefinition, findViewCallLocation } from '../finders/view';
import { findModelDefinition } from '../finders/model';
import { findAssetDefinition, findAssetCallLocation } from '../finders/asset';
import { findRouteByName, findRouteByController } from '../finders/route';
import { findHelperDefinition } from '../finders/helper';

export function onDefinition(params: DefinitionParams, documents: TextDocuments<TextDocument>): Location[] | null {
	const document = documents.get(params.textDocument.uri);
	if (!document) return null;

	const position = params.position;
	const text = document.getText();
	const offset = document.offsetAt(position);

	let s = offset, e = offset;
	while (s > 0 && isWordCharacter(text[s - 1])) s--;
	while (e < text.length && isWordCharacter(text[e])) e++;
	const word = text.substring(s, e);

	const assetPath = findAssetCallLocation(document, position);
	if (assetPath) return findAssetDefinition(assetPath);

	if (word.includes('@')) return findControllerDefinition(word);
	if (word.includes('.') && !word.includes('@')) return findViewDefinition(word);

	const viewCall = findViewCallLocation(document, position);
	if (viewCall) return findViewDefinition(viewCall);

	if (word.startsWith('Models\\') || word.startsWith('Models/')) return findModelDefinition(word);

	return findRouteByName(word)
		|| findRouteByController(word)
		|| findHelperDefinition(word)
		|| [];
}
