import { createConnection, TextDocuments, ProposedFeatures, InitializeResult, TextDocumentSyncKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { setWorkspaceRoot } from './utils/fs';
import { onDefinition } from './handlers/definition';
import { onDocumentSymbol } from './handlers/symbols';

process.on('uncaughtException', (err) => console.error('MiraPHP LSP uncaughtException:', err));
process.on('unhandledRejection', (reason) => console.error('MiraPHP LSP unhandledRejection:', reason));

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments<TextDocument>(TextDocument);

connection.onInitialize((params) => {
	setWorkspaceRoot(params.rootUri);
	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			definitionProvider: true,
			documentSymbolProvider: true,
		}
	};
	return result;
});

connection.onDefinition((params) => onDefinition(params, documents));
connection.onDocumentSymbol((params) => onDocumentSymbol(params, documents));

documents.listen(connection);
connection.listen();
