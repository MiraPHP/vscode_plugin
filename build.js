const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

async function build() {
  console.log('Building MiraPHP VSCode Extension...');
  
  try {
    // Ensure output directories exist
    const clientOutDir = path.join(__dirname, 'client', 'out');
    const serverOutDir = path.join(__dirname, 'server', 'out');
    
    if (!fs.existsSync(clientOutDir)) {
      fs.mkdirSync(clientOutDir, { recursive: true });
    }
    
    if (!fs.existsSync(serverOutDir)) {
      fs.mkdirSync(serverOutDir, { recursive: true });
    }

    // Compile TypeScript
    console.log('Compiling TypeScript...');
    await execAsync('npx tsc -b', { cwd: __dirname });
    console.log('TypeScript compilation completed.');

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  build();
}

module.exports = { build };