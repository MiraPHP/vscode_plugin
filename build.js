const { spawn } = require('child_process');
const path = require('path');

// Function to run a command in a specific directory
function runCommand(cmd, args, cwd) {
    return new Promise((resolve, reject) => {
        console.log(`Running: ${cmd} ${args.join(' ')}`);
        const child = spawn(cmd, args, { 
            cwd,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
        });

        // Capture and display output
        child.stdout.on('data', (data) => {
            console.log(data.toString());
        });

        child.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command exited with code ${code}`));
            }
        });
    });
}

async function buildProject() {
    try {
        console.log('Building MiraPHP VSCode Extension...');
        
        // Compile the main project
        await runCommand('npx', ['tsc', '-b'], process.cwd());
        
        // Compile client
        await runCommand('npx', ['tsc', '-b'], path.join(process.cwd(), 'client'));
        
        // Compile server
        await runCommand('npx', ['tsc', '-b'], path.join(process.cwd(), 'server'));
        
        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error.message);
        process.exit(1);
    }
}

// Run the build
buildProject();