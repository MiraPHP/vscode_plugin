import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	InitializeResult,
	TextDocumentSyncKind,
	DefinitionParams,
	DocumentSymbolParams,
	DocumentSymbol,
	SymbolKind
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { Location, Range, Position } from 'vscode-languageserver/node';
import * as fs from 'fs';
import * as path from 'path';

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
const documents: TextDocuments<TextDocument> = new TextDocuments<TextDocument>(TextDocument);

// Store the workspace root path
let workspaceRoot: string | undefined;

connection.onInitialize((params: InitializeParams) => {
	console.log('MiraPHP Language Server: Initializing...');
	
	const capabilities = params.capabilities;
	
	// Set the workspace root, properly decoding the URI if needed
	workspaceRoot = params.rootUri ? decodeURIComponent(params.rootUri.replace('file://', '')) : undefined;
	// On Windows, remove leading slash if present after removing file://
	if (workspaceRoot && workspaceRoot.startsWith('/') && process.platform === 'win32') {
		workspaceRoot = workspaceRoot.substring(1);
	}
	
	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			definitionProvider: true,  // Enable definition provider for "Go To Definition"
			documentSymbolProvider: true, // Enable document symbols
		}
	};
	
	console.log('MiraPHP Language Server: Initialized successfully');
	return result;
});

connection.onInitialized(() => {
	console.log('MiraPHP Language Server: Connection initialized');
});

// Handle definition request for "Go To Definition" feature
connection.onDefinition((params: DefinitionParams) => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return null;
	}

	const position = params.position;
	const text = document.getText();
	const offset = document.offsetAt(position);
	
	// Extract the word at cursor position
	let startIndex = offset;
	let endIndex = offset;
	
	// Move backwards to find the start of the word
	while (startIndex > 0 && isWordCharacter(text[startIndex - 1])) {
		startIndex--;
	}
	
	// Move forwards to find the end of the word
	while (endIndex < text.length && isWordCharacter(text[endIndex])) {
		endIndex++;
	}
	
	const word = text.substring(startIndex, endIndex);
	
	// First check if we're inside an asset() call
	const assetPath = findAssetCallLocation(document, position);
	if (assetPath) {
		return findAssetDefinition(assetPath);
	}
	
	// Try to find definition based on the word at cursor
	const locations = findDefinition(document, word, position);
	
	return locations;
});

// Handle document symbol request for outline view
connection.onDocumentSymbol((params: DocumentSymbolParams) => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return null;
	}

	const text = document.getText();
	const lines = text.split('\n');
	const symbols: DocumentSymbol[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmedLine = line.trim();

		// Match class declarations
		const classMatch = trimmedLine.match(/^\s*(abstract\s+|final\s+)?\s*class\s+(\w+)/i);
		if (classMatch) {
			const className = classMatch[2];
			const startPosition = { line: i, character: line.indexOf(className) };
			const endPosition = { line: i, character: line.indexOf(className) + className.length };
			
			symbols.push({
				name: className,
				kind: SymbolKind.Class,
				range: {
					start: startPosition,
					end: endPosition
				},
				selectionRange: {
					start: startPosition,
					end: endPosition
				},
				children: [] // Will be populated if we find members inside the class
			});
		}

		// Match interface declarations
		const interfaceMatch = trimmedLine.match(/^\s*interface\s+(\w+)/i);
		if (interfaceMatch) {
			const interfaceName = interfaceMatch[1];
			const startPosition = { line: i, character: line.indexOf(interfaceName) };
			const endPosition = { line: i, character: line.indexOf(interfaceName) + interfaceName.length };
			
			symbols.push({
				name: interfaceName,
				kind: SymbolKind.Interface,
				range: {
					start: startPosition,
					end: endPosition
				},
				selectionRange: {
					start: startPosition,
					end: endPosition
				}
			});
		}

		// Match trait declarations
		const traitMatch = trimmedLine.match(/^\s*trait\s+(\w+)/i);
		if (traitMatch) {
			const traitName = traitMatch[1];
			const startPosition = { line: i, character: line.indexOf(traitName) };
			const endPosition = { line: i, character: line.indexOf(traitName) + traitName.length };
			
			symbols.push({
				name: traitName,
				kind: SymbolKind.Class, // LSP doesn't have a trait kind, using Class
				range: {
					start: startPosition,
					end: endPosition
				},
				selectionRange: {
					start: startPosition,
					end: endPosition
				}
			});
		}

		// Match function/method declarations
		const functionMatch = trimmedLine.match(/^\s*(public|private|protected|static)*\s*function\s+(\w+)\s*\(/i);
		if (functionMatch) {
			const functionName = functionMatch[2];
			const startPosition = { line: i, character: line.indexOf(functionName) };
			const endPosition = { line: i, character: line.indexOf(functionName) + functionName.length };
			
			symbols.push({
				name: functionName,
				kind: SymbolKind.Method,
				range: {
					start: startPosition,
					end: endPosition
				},
				selectionRange: {
					start: startPosition,
					end: endPosition
				}
			});
		}

		// Match top-level function declarations (not inside classes)
		const topLevelFunctionMatch = trimmedLine.match(/^\s*function\s+(\w+)\s*\(/i);
		if (topLevelFunctionMatch && !trimmedLine.startsWith("class")) {
			const functionName = topLevelFunctionMatch[1];
			const startPosition = { line: i, character: line.indexOf(functionName) };
			const endPosition = { line: i, character: line.indexOf(functionName) + functionName.length };
			
			symbols.push({
				name: functionName,
				kind: SymbolKind.Function,
				range: {
					start: startPosition,
					end: endPosition
				},
				selectionRange: {
					start: startPosition,
					end: endPosition
				}
			});
		}

		// Match constants
		const constantMatch = trimmedLine.match(/^\s*(const)\s+(\w+)/i);
		if (constantMatch) {
			const constantName = constantMatch[2];
			const startPosition = { line: i, character: line.indexOf(constantName) };
			const endPosition = { line: i, character: line.indexOf(constantName) + constantName.length };
			
			symbols.push({
				name: constantName,
				kind: SymbolKind.Constant,
				range: {
					start: startPosition,
					end: endPosition
				},
				selectionRange: {
					start: startPosition,
					end: endPosition
				}
			});
		}
	}

	return symbols;
});

// Helper function to check if a character is part of a word
function isWordCharacter(char: string): boolean {
	return /[a-zA-Z0-9_@\/\\\.]/.test(char);
}

// Function to find definitions based on different patterns
function findDefinition(document: TextDocument, word: string, position: Position): Location[] | null {
	// Check if the word looks like a controller reference: 'Namespace/Controller@method'
	if (word.includes('@')) {
		return findControllerDefinition(word);
	}
	
	// Check if the word looks like a view reference: 'namespace.view' or 'path/to/view'
	if (word.includes('.') && !word.includes('@')) {
		return findViewDefinition(word);
	}
	
	// Handle view paths that don't contain dots but might be in a view() call
	if (!word.includes('@') && !word.startsWith('Models\\') && !word.startsWith('Models/')) {
		// Check if we're inside a view() call or $this->view() call
		const viewCallLocation = findViewCallLocation(document, position);
		if (viewCallLocation) {
			return findViewDefinition(viewCallLocation);
		}
		
		// Check if we're inside an asset() call
		const assetCallLocation = findAssetCallLocation(document, position);
		if (assetCallLocation) {
			return findAssetDefinition(assetCallLocation);
		}
	}
	
	// Check if the word looks like a model reference: 'Models\ModelName'
	if (word.startsWith('Models\\') || word.startsWith('Models/')) {
		return findModelDefinition(word);
	}
	
	// Check if we're looking for a route name (e.g. route('route.name'))
	const routeNameMatch = findRouteByName(word);
	if (routeNameMatch.length > 0) {
		return routeNameMatch;
	}
	
	// Check for route references in controllers (finding routes that point to a specific controller@method)
	const routeFromController = findRouteByController(word);
	if (routeFromController.length > 0) {
		return routeFromController;
	}
	
	// Check for helper function references
	const helperLocation = findHelperDefinition(word);
	if (helperLocation.length > 0) {
		return helperLocation;
	}
	
	return [];
}

// Helper function to detect if we're inside a view() or $this->view() call
function findViewCallLocation(document: TextDocument, position: Position): string | null {
	const text = document.getText();
	const offset = document.offsetAt(position);
	
	// Define the search range - look back about 200 characters from the cursor position
	const startOffset = Math.max(0, offset - 200);
	const endOffset = Math.min(text.length, offset + 50); // Look ahead a little too
	
	const surroundingText = text.substring(startOffset, endOffset);
	
	// Look for patterns like view('path/to/view'), View::make('path/to/view'), or $this->view('path/to/view')
	const patterns = [
		/view\s*\(\s*["']([^"']+)["']/g,      // view('path/to/view')
		/View::make\s*\(\s*["']([^"']+)["']/g, // View::make('path/to/view')
		/\$this->view\s*\(\s*["']([^"']+)["']/g, // $this->view('path/to/view')
		/\$this->render\s*\(\s*["']([^"']+)["']/g, // $this->render('path/to/view')
	];
	
	for (const pattern of patterns) {
		let match;
		while ((match = pattern.exec(surroundingText)) !== null) {
			// Calculate the actual position of the match in the document
			const matchStartOffset = startOffset + match.index;
			const matchEndOffset = matchStartOffset + match[0].length;
			
			// Check if our cursor position falls within this match
			if (offset >= matchStartOffset && offset <= matchEndOffset) {
				return match[1]; // Return the captured view path
			}
		}
	}
	
	return null;
}

// Function to find controller definition from route reference
function findControllerDefinition(controllerRef: string): Location[] {
	const [controllerPart, method] = controllerRef.split('@');
	if (!controllerPart || !method) return [];
	
	// Convert namespace format to file path
	// e.g., 'Landing/Home@index' -> 'app/Controllers/Landing/Home.php'
	// e.g., 'Auth\SocialAuthController@redirect' -> 'app/Controllers/Auth/SocialAuthController.php'
	let filePath = controllerPart.replace(/\//g, '/');
	filePath = filePath.replace(/\\/g, '/');
	
	// If it doesn't start with Controllers/, add it
	if (!filePath.startsWith('Controllers/') && !filePath.startsWith('Controllers\\')) {
		filePath = 'Controllers/' + filePath;
	}
	
	// Format file path - strip any file:// prefix from workspaceRoot if present
	let baseDir = workspaceRoot || '';
	if (baseDir.startsWith('file://')) {
		baseDir = baseDir.substring(7); // Remove 'file://' prefix
	}
	// On Windows, remove leading slash if present after removing file://
	if (baseDir.startsWith('/') && process.platform === 'win32') {
		baseDir = baseDir.substring(1);
	}
	
	const fullFilePath = path.join(baseDir, `app/${filePath}.php`);
	
	console.log(`Looking for controller file: ${fullFilePath}`);
	
	if (fs.existsSync(fullFilePath)) {
		console.log(`Found controller file: ${fullFilePath}`);
		// Read the file to find the method
		const fileContent = fs.readFileSync(fullFilePath, 'utf-8');
		const lines = fileContent.split('\n');
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			// Look for public/private/protected function methodName or just methodName(
			if (line.includes(`function ${method}`) || 
				line.trim().startsWith(`${method}(`) || 
				line.includes(` ${method}(`) ||
				line.includes(`.${method}(`)) {
				
				// Find the exact position of the method name in the line
				const methodPos = line.indexOf(method);
				if (methodPos !== -1) {
					const range: Range = {
						start: { line: i, character: methodPos },
						end: { line: i, character: methodPos + method.length }
					};
					
					console.log(`Found method ${method} in ${fullFilePath} at line ${i}`);
					return [{
						uri: pathToFileURI(fullFilePath), // Use proper URI conversion
						range
					}];
				}
			}
		}
		
		// If we only found the file but not the method, return the file location
		console.log(`Found file but not method ${method}, returning file location`);
		return [{
			uri: pathToFileURI(fullFilePath), // Use proper URI conversion
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 0 }
			}
		}];
	} else {
		console.log(`Controller file does not exist: ${fullFilePath}`);
		
		// Try alternative path formats - maybe the project structure is different than expected
		// Check if the workspace root is different than expected
		const altPath = path.join(baseDir, `app/Controllers/${controllerPart}.php`);
		console.log(`Trying alternative path: ${altPath}`);
		
		if (fs.existsSync(altPath)) {
			console.log(`Found controller file at alternative path: ${altPath}`);
			return [{
				uri: pathToFileURI(altPath), // Use proper URI conversion
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 0 }
				}
			}];
		}
		
		// Try yet another format - maybe it's in a different directory structure
		// Check if it's in the root of Controllers without subdirectories
		const altPath2 = path.join(baseDir, `app/Controllers/${filePath}.php`);
		console.log(`Trying another alternative path: ${altPath2}`);
		
		if (fs.existsSync(altPath2)) {
			console.log(`Found controller file at alternative path: ${altPath2}`);
			return [{
				uri: pathToFileURI(altPath2), // Use proper URI conversion
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 0 }
				}
			}];
		}
	}
	
	return [];
}

// Function to find view definition
function findViewDefinition(viewRef: string): Location[] {
	// Convert both dot notation and path format to file path
	// e.g., 'users.profile.settings' -> 'web/views/users/profile/settings.php'
	// e.g., 'sites/view_shared_book' -> 'web/views/sites/view_shared_book.php'
	// e.g., 'landing/index' -> 'web/views/landing/index.php'
	
	// First, try to determine if it's dot notation or path format
	let normalizedViewPath = viewRef;
	
	// If it contains dots, treat as dot notation and convert to path
	if (viewRef.includes('.')) {
		normalizedViewPath = viewRef.replace(/\./g, '/');
	} else {
		// If it already contains slashes, use as is
		normalizedViewPath = viewRef;
	}
	
	// Construct the expected file paths
	const phpPath = `web/views/${normalizedViewPath}.php`;
	const bladePath = `web/views/${normalizedViewPath}.blade.php`;
	
	const phpFullPath = path.join(workspaceRoot || '', phpPath);
	const bladeFullPath = path.join(workspaceRoot || '', bladePath);
	
	// Check for blade template first (if it exists)
	if (fs.existsSync(bladeFullPath)) {
		return [{
			uri: pathToFileURI(bladeFullPath),
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 0 }
			}
		}];
	}
	
	// Then check for regular PHP template
	if (fs.existsSync(phpFullPath)) {
		return [{
			uri: pathToFileURI(phpFullPath),
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 0 }
			}
		}];
	}
	
	// Also check if it's a partial path that needs to be resolved differently
	// Sometimes views might be in different locations
	const alternatePaths = [
		`views/${normalizedViewPath}.php`,
		`views/${normalizedViewPath}.blade.php`,
		`resources/views/${normalizedViewPath}.php`,
		`resources/views/${normalizedViewPath}.blade.php`,
		`app/views/${normalizedViewPath}.php`,
		`app/views/${normalizedViewPath}.blade.php`
	];
	
	for (const altPath of alternatePaths) {
		const fullAltPath = path.join(workspaceRoot || '', altPath);
		if (fs.existsSync(fullAltPath)) {
			return [{
				uri: pathToFileURI(fullAltPath),
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 0 }
				}
			}];
		}
	}
	
	return [];
}

// Function to find model definition
function findModelDefinition(modelRef: string): Location[] {
	// Convert namespace to file path
	// e.g., 'Models\User' -> 'app/Models/User.php'
	const cleanModelName = modelRef.replace(/^Models[\/\\]?/, '');
	const fullFilePath = path.join(workspaceRoot || '', `app/Models/${cleanModelName}.php`);
	
	if (fs.existsSync(fullFilePath)) {
		return [{
			uri: `file://${fullFilePath.replace(/\\/g, '/')}`, // Normalize path separators for URI
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 0 }
			}
		}];
	}
	
	return [];
}

// Function to find route by name
function findRouteByName(routeName: string): Location[] {
	if (!workspaceRoot) return [];
	
	// Search in route files
	const routeFiles = [
		path.join(workspaceRoot, 'web/index.php'), // Main routing file
		path.join(workspaceRoot, 'web/routes/apis.php'),
		path.join(workspaceRoot, 'web/routes/pages.php'),
		path.join(workspaceRoot, 'web/routes/sub.php'),
		path.join(workspaceRoot, 'web/routes/admins.php'),
		path.join(workspaceRoot, 'web/routes/demos.php')
	];
	
	for (const routeFile of routeFiles) {
		if (fs.existsSync(routeFile)) {
			const content = fs.readFileSync(routeFile, 'utf-8');
			const lines = content.split('\n');
			
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				
				// Look for ->name('routeName') or ->name("routeName") pattern
				if ((line.includes(`->name('${routeName}')`) || line.includes(`->name("${routeName}")`)) &&
				    (line.includes('$router->') || line.includes('router->'))) {
				    
					const range: Range = {
						start: { line: i, character: 0 },
						end: { line: i, character: line.length }
					};
					
					return [{
						uri: `file://${routeFile.replace(/\\/g, '/')}`, // Normalize path separators for URI
						range
					}];
				}
				
				// Look for route('routeName') calls
				if ((line.includes(`route('${routeName}'`) || line.includes(`route("${routeName}"`)) &&
				    line.includes('route(')) {
				    
					const range: Range = {
						start: { line: i, character: 0 },
						end: { line: i, character: line.length }
					};
					
					return [{
						uri: `file://${routeFile.replace(/\\/g, '/')}`, // Normalize path separators for URI
						range
					}];
				}
			}
		}
	}
	
	return [];
}

// Function to find route by controller reference (reverse lookup)
function findRouteByController(controllerRef: string): Location[] {
	if (!workspaceRoot) return [];
	
	// Search in route files for references to this controller
	const routeFiles = [
		path.join(workspaceRoot, 'web/index.php'), // Main routing file
		path.join(workspaceRoot, 'web/routes/apis.php'),
		path.join(workspaceRoot, 'web/routes/pages.php'),
		path.join(workspaceRoot, 'web/routes/sub.php'),
		path.join(workspaceRoot, 'web/routes/admins.php'),
		path.join(workspaceRoot, 'web/routes/demos.php')
	];
	
	for (const routeFile of routeFiles) {
		if (fs.existsSync(routeFile)) {
			const content = fs.readFileSync(routeFile, 'utf-8');
			const lines = content.split('\n');
			
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				
				// Look for routes that reference the controller
				if (line.includes(controllerRef) && (line.includes('$router->') || line.includes('router->'))) {
				    
					// Find the exact position of the controller reference in the line
					const controllerPos = line.indexOf(controllerRef);
					if (controllerPos !== -1) {
						const range: Range = {
							start: { line: i, character: controllerPos },
							end: { line: i, character: controllerPos + controllerRef.length }
						};
						
						return [{
							uri: `file://${routeFile}`,
							range
						}];
					}
				}
			}
		}
	}
	
	return [];
}

// Function to find helper function definition
function findHelperDefinition(helperRef: string): Location[] {
	if (!workspaceRoot) return [];
	
	// Check if it's a helper function reference like Helpers\HelperName\functionName
	if (helperRef.includes('\\') && helperRef.includes('.')) {
		const parts = helperRef.split('.');
		if (parts.length >= 2) {
			const helperPath = parts[0]; // Full helper path
			const functionName = parts[1]; // Function name
			
			// Convert namespace to file path
			const cleanHelperPath = helperPath.replace(/^Helpers[\/\\]?/, '');
			const helperParts = cleanHelperPath.split(/[\/\\]/);
			const helperName = helperParts.pop(); // Last part is the helper file name
			const subfolder = helperParts.length > 0 ? helperParts.join('/') + '/' : '';
			
			const fullFilePath = path.join(workspaceRoot || '', `app/Helpers/${subfolder}${helperName}.php`);
			
			if (fs.existsSync(fullFilePath)) {
				// Read the file to find the function
				const fileContent = fs.readFileSync(fullFilePath, 'utf-8');
				const lines = fileContent.split('\n');
				
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					if (line.includes(`function ${functionName}`) || 
					    line.includes(`${functionName}(`) && 
					    (line.trim().startsWith('function') || line.includes('function'))) {
						
						// Find the exact position of the function name in the line
						const funcPos = line.indexOf(functionName);
						if (funcPos !== -1) {
							const range: Range = {
								start: { line: i, character: funcPos },
								end: { line: i, character: funcPos + functionName.length }
							};
							
							return [{
								uri: `file://${fullFilePath}`,
								range
							}];
						}
					}
				}
				
				// If we only found the file but not the function, return the file location
				return [{
					uri: pathToFileURI(fullFilePath),
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: 0 }
					}
				}];
			}
		}
	}
	
	return [];
}

// Helper function to convert file path to proper URI format
function pathToFileURI(filePath: string): string {
	// Convert file path to URI, handling Windows paths properly
	if (process.platform === 'win32') {
		// For Windows, convert to file:// format with proper encoding
		// Ensure the path uses forward slashes and is properly encoded
		const normalizedPath = filePath.replace(/\\/g, '/');
		return `file:///${normalizedPath}`;
	} else {
		// For Unix-like systems
		return `file://${filePath}`;
	}
}

// Helper function to detect if we're inside an asset() call
function findAssetCallLocation(document: TextDocument, position: Position): string | null {
	const text = document.getText();
	const offset = document.offsetAt(position);
	
	// Define the search range - look back about 200 characters from the cursor position
	const startOffset = Math.max(0, offset - 200);
	const endOffset = Math.min(text.length, offset + 50); // Look ahead a little too
	
	const surroundingText = text.substring(startOffset, endOffset);
	
	// Look for patterns like asset('path/to/asset') or in HTML/Blade tags
	const patterns = [
		/asset\s*\(\s*["']([^"']+)["']/g,                    // asset('path/to/asset')
		/href\s*=\s*["']<?=\s*asset\s*\(\s*["']([^"']+)["']/g,  // href="<?= asset('path/to/asset') ?>"
		/src\s*=\s*["']<?=\s*asset\s*\(\s*["']([^"']+)["']/g,   // src="<?= asset('path/to/asset') ?>"
		/{{\s*asset\s*\(\s*["']([^"']+)["']\s*\)\s*}}/g,       // {{ asset('path/to/asset') }}
	];
	
	for (const pattern of patterns) {
		let match;
		while ((match = pattern.exec(surroundingText)) !== null) {
			// Calculate the actual position of the match in the document
			const matchStartOffset = startOffset + match.index;
			const matchEndOffset = matchStartOffset + match[0].length;
			
			// Check if our cursor position falls within this match
			if (offset >= matchStartOffset && offset <= matchEndOffset) {
				return match[1]; // Return the captured asset path
			}
		}
	}
	
	return null;
}

// Function to find asset definition
function findAssetDefinition(assetPath: string): Location[] {
	if (!workspaceRoot) return [];
	
	// Try common asset locations
	const assetLocations = [
		`public/${assetPath}`,           // Standard public directory
		`web/assets/${assetPath}`,       // Alternative assets location
		`assets/${assetPath}`,           // Assets in root
		`resources/${assetPath}`,        // Resources directory
		`web/${assetPath}`,              // Web directory
	];
	
	for (const location of assetLocations) {
		const fullPath = path.join(workspaceRoot, location);
		
		if (fs.existsSync(fullPath)) {
			return [{
				uri: pathToFileURI(fullPath),
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 0 }
				}
			}];
		}
	}
	
	return [];
}

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