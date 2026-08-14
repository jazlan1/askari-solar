/**
 * Production Startup Script
 * Starts the Next.js standalone server immediately for fast Passenger worker boot.
 */

const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');

console.log('🚀 Starting Next.js standalone server...');
const serverPath = path.join(rootDir, '.next/standalone/server.js');

if (fs.existsSync(serverPath)) {
  require(serverPath);
} else {
  console.error(`❌ Standalone server.js not found at ${serverPath}`);
  process.exit(1);
}

