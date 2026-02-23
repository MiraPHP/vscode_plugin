import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export async function activate(context: vscode.ExtensionContext) {
	console.log('MiraPHP extension activating...');

	try {
		// Check if this workspace contains a MiraPHP project
		const isMiraPHPProject = await detectMiraPHPProject();

		if (!isMiraPHPProject) {
			console.log('No MiraPHP project detected in current workspace');
			vscode.window.showInformationMessage('MiraPHP extension: No MiraPHP project detected in current workspace.');
			return;
		}

		console.log('MiraPHP project detected, starting language server');
		vscode.window.showInformationMessage('MiraPHP extension: MiraPHP project detected, initializing language server...');

		// The server is implemented in node
		const serverModule = context.asAbsolutePath('server/out/server.js');

		// If the extension is launched in debug mode then the debug server options are used
		// Otherwise the run options are used
		const serverOptions: ServerOptions = {
			run: { module: serverModule, transport: TransportKind.ipc },
debug: { module: serverModule, transport: TransportKind.ipc }
		};

		// Options to control the language client
		const clientOptions: LanguageClientOptions = {
			// Register the server for MiraPHP projects
			documentSelector: [{ scheme: 'file', language: 'php' }],
			synchronize: {
				// Notify the server about file changes to '.clientrc files contained in the workspace
				fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc', false, false, false)
			}
		};

		// Create the language client
		client = new LanguageClient(
			'miraphp',
			'MiraPHP Language Server',
			serverOptions,
			clientOptions
		);

		// Handle client state changes
		client.onDidChangeState(event => {
			switch (event.newState) {
				case 1: // LanguageClientState.Starting
					console.log('MiraPHP language client: Starting');
					break;
				case 2: // LanguageClientState.Running
					console.log('MiraPHP language client: Running');
					break;
				case 3: // LanguageClientState.Stopped
					console.log('MiraPHP language client: Stopped');
					break;
			}
		});

		// Handle connection errors to prevent repeated restart attempts
		client.onDidChangeState(state => {
			if (state.newState === 3) { // Stopped
				console.log('MiraPHP language client stopped unexpectedly');
			}
		});

		// Start the client. This will also launch the server
		await client.start();
		console.log('MiraPHP language client started successfully');
	} catch (error) {
		console.error('Error starting MiraPHP extension:', error);
		vscode.window.showErrorMessage(`Failed to start MiraPHP extension: ${error instanceof Error ? error.message : String(error)}`);
		
		// Attempt to clean up if startup failed
		if (client && client.needsStop()) {
			try {
				await client.stop();
			} catch (stopError) {
				console.error('Error stopping client after failed start:', stopError);
			}
		}
	}
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	
	// Properly stop the client when deactivating
	if (client.needsStop()) {
		return client.stop();
	}
	
	return undefined;
}

/**
 * Detects if the current workspace is a MiraPHP project
 * A MiraPHP project is identified by the presence of:
 * - app/router.php file AND either:
 *   - a 'mira' CLI executable in the root, OR
 *   - both 'mira' CLI executable and 'web' folder in the root
 * @returns Promise<boolean> indicating if this is a MiraPHP project
 */
async function detectMiraPHPProject(): Promise<boolean> {
	try {
		if (!vscode.workspace.rootPath) {
			console.log('No workspace opened');
			return false;
		}

		// Look for key MiraPHP project files/directories
		const routerPhpUris = await vscode.workspace.findFiles(
			new vscode.RelativePattern(vscode.workspace.rootPath, 'app/router.php'),
			null, 1
		);
		
		const miraCliUris = await vscode.workspace.findFiles(
			new vscode.RelativePattern(vscode.workspace.rootPath, 'mira'),
			null, 1
		);
		
		const webFolderUris = await vscode.workspace.findFiles(
			new vscode.RelativePattern(vscode.workspace.rootPath, 'web/**/*'),
			null, 1
		);

		// A MiraPHP project should have app/router.php
		const hasRouter = routerPhpUris.length > 0;
		
		// And either a mira CLI file, or both mira CLI and web folder (the condition was redundant)
		const hasMiraCli = miraCliUris.length > 0;
		const hasWebFolder = webFolderUris.length > 0;
		const isValidMiraPHPProject = hasRouter && (hasMiraCli || hasWebFolder);

		console.log(`MiraPHP project detection:`);
		console.log(`- Has app/router.php: ${hasRouter}`);
		console.log(`- Has mira CLI: ${hasMiraCli}`);
		console.log(`- Has web folder: ${hasWebFolder}`);
		console.log(`- Is valid MiraPHP project: ${isValidMiraPHPProject}`);

		return isValidMiraPHPProject;
	} catch (error) {
		console.error('Error detecting MiraPHP project:', error);
		return false;
	}
}