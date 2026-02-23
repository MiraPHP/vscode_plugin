import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	InitializeResult,
	TextDocumentSyncKind
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Handle uncaught exceptions to prevent server from crashing
process.on('uncaughtException', (err) => {
	console.error('Uncaught exception in MiraPHP Language Server:', err);
	console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled rejection in MiraPHP Language Server:', reason);
	console.error('Promise:', promise);
});

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
	console.log('MiraPHP Language Server: Initializing...');
	
	const capabilities = params.capabilities;

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Add other server capabilities here
		}
	};
	
	console.log('MiraPHP Language Server: Initialized successfully');
	return result;
});

connection.onInitialized(() => {
	console.log('MiraPHP Language Server: Connection initialized');
});

// Set up proper error handling for the connection
connection.onDidChangeConfiguration((change) => {
	// Handle configuration changes if needed
});

// Make the text document manager listen on the connection
// for open, change, and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

console.log('MiraPHP Language Server: Listening for connections');