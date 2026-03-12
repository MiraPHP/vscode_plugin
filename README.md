README.md
# MiraPHP VsCode Extension (beta)

A VSCode extension that provides enhanced IDE support for MiraPHP framework projects, offering Laravel-level developer experience including:

* Go To Definition (Ctrl+Click navigation)
* Hover information
* IntelliSense autocomplete
* Route awareness
* View linking
* Diagnostics
* CLI integration

## Features

- **Navigation**: Jump to controllers, models, and views directly from routes and view calls
- **IntelliSense**: Smart autocompletion for framework-specific functions
- **Diagnostics**: Real-time error detection for common MiraPHP issues
- **CLI Integration**: Direct access to MiraPHP CLI commands from VSCode

## Activation

This extension automatically activates when it detects a MiraPHP project containing:
- `app/router.php` file
- `mira` CLI executable

## Implementation Status

Currently implementing features in the following order:
1. ✅ Project Detection
2. ✅ Go To Definition
3. 🔄 Hover Information
4. Autocomplete
5. Route Intelligence
6. View Linking
7. Diagnostics
8. CLI Integration
9. Metadata Optimization

### Route to Controller Navigation
In a route file (e.g., `web/routes/apis.php`), try Ctrl+clicking on a controller reference:
```php
$router->get('/users', 'Users/UsersController@index');
```
Clicking on `Users/UsersController@index` should navigate to the `index` method in the `app/Controllers/Users/UsersController.php` file.

## Requirements

- Node.js >= 14
- VSCode >= 1.74.0
- MiraPHP framework project

## Setup Guide

To set up the MiraPHP VSCode Extension locally:

### Prerequisites

1. Install Node.js (v14 or higher)
2. Install VSCode
3. Clone or copy the extension source code

### Installation Steps

1. **Navigate to the extension directory**
   ```bash
   cd vscode_plugin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install dependencies for client and server separately**
   ```bash
   cd client && npm install && cd ..
   cd server && npm install && cd ..
   ```

4. **Compile the extension**
   ```bash
   npm run compile
   # or use the build script
   node build.js
   ```

5. **Package the extension (optional, if you want a .vsix file)**
   ```bash
   # First install vsce globally if you haven't
   npm install -g vsce
   
   # Then package the extension
   vsce package
   ```

6. **Load the extension in VSCode**
   - Option 1: Open VSCode, press `Ctrl+Shift+P`, type "Developer: Install Extension from VSIX", and select the packaged extension file
   - Option 2: In VSCode, go to Extensions tab, click the "..." menu, select "Install from VSIX...", and select the packaged extension file
   - Option 3: For development, run `npm run compile` then press `F5` to open a new Extension Development Host window with the extension loaded

### Development Mode

For active development:

1. **Watch for changes**
   ```bash
   npm run watch
   ```

2. **Debug the extension**
   - Open this project in VSCode, Open build.js
   - Press `F5` to open a new Extension Development Host window
   - Open a MiraPHP project in the host window to test the extension

## Troubleshooting

- If you encounter the error "Cannot find module 'vscode-languageclient/node'", ensure all dependencies are installed properly
- Make sure the output folders (`client/out` and `server/out`) are created after compilation
- If the extension doesn't activate, verify that your project contains `app/router.php` and the `mira` CLI executable