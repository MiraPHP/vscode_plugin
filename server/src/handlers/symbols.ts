import { DocumentSymbolParams, DocumentSymbol, SymbolKind } from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Range } from 'vscode-languageserver/node';

const SYMBOL_PATTERNS: [RegExp, SymbolKind][] = [
	[/^\s*(?:abstract\s+|final\s+)?class\s+(\w+)/i,            SymbolKind.Class],
	[/^\s*interface\s+(\w+)/i,                                  SymbolKind.Interface],
	[/^\s*trait\s+(\w+)/i,                                      SymbolKind.Class],
	[/^\s*(?:public|private|protected|static)*\s*function\s+(\w+)\s*\(/i, SymbolKind.Method],
	[/^\s*function\s+(\w+)\s*\(/i,                              SymbolKind.Function],
	[/^\s*const\s+(\w+)/i,                                      SymbolKind.Constant],
];

export function onDocumentSymbol(params: DocumentSymbolParams, documents: TextDocuments<TextDocument>): DocumentSymbol[] | null {
	const document = documents.get(params.textDocument.uri);
	if (!document) return null;

	const symbols: DocumentSymbol[] = [];
	document.getText().split('\n').forEach((line, i) => {
		for (const [pattern, kind] of SYMBOL_PATTERNS) {
			const match = line.match(pattern);
			if (!match) continue;
			const name = match[match.length - 1];
			const col = line.indexOf(name);
			const range = Range.create(i, col, i, col + name.length);
			symbols.push({ name, kind, range, selectionRange: range });
			break;
		}
	});

	return symbols;
}
